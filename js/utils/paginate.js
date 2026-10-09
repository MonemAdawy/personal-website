// Pagination helpers for the API's "get all" endpoints (?page=&limit=).
// The endpoints return a plain array with no total, so the next page is
// prefetched in the background: that tells us whether "Load more" should
// show at all, and makes the click feel instant.

async function fetchPage(path, page, limit) {
  const res = await fetch(`${window.API_BASE_URL}${path}?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  // Also accept a { data, total } envelope should the API add one later
  return Array.isArray(body) ? { items: body } : { items: body.data ?? [], total: body.total };
}

export function createPager(path, limit) {
  let page = 1;
  let upcoming = fetchPage(path, page, limit);

  return {
    // Resolves the current page and starts fetching the one after it
    async next() {
      const result = await upcoming;
      page += 1;
      upcoming = result.items.length < limit
        ? Promise.resolve({ items: [] })
        : fetchPage(path, page, limit);
      upcoming.catch(() => {}); // surfaced by hasMore()/next()
      return result;
    },

    async hasMore() {
      try {
        return (await upcoming).items.length > 0;
      } catch {
        return false;
      }
    }
  };
}

// Puts a "Load more" button in `host` that appends pages via `onPage`
// and hides itself once the pager runs dry.
export function mountLoadMore(host, pager, onPage, label = "Load more") {
  if (!host) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-ghost";
  button.hidden = true;
  const idle = `${label} <span class="material-symbols-outlined">expand_more</span>`;
  button.innerHTML = idle;
  host.prepend(button);

  const sync = async () => {
    button.hidden = !(await pager.hasMore());
    // Collapse the host's spacing too when the button is all it holds
    if (host.childElementCount === 1) host.hidden = button.hidden;
  };

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = `Loading <span class="material-symbols-outlined">progress_activity</span>`;
    try {
      onPage(await pager.next());
    } catch (err) {
      console.error("Error loading more:", err);
      window.showToast?.("Couldn't load more right now", "error");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.innerHTML = idle;
      await sync();
    }
  });

  sync();
}
