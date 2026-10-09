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

// Puts "More" / "Less" buttons in `host` for the cards in `grid`.
// "More" appends the next page via `onPage` (or re-shows a page hidden by
// "Less" without refetching); "Less" hides the most recently shown page.
export function mountLoadMore(host, grid, pager, onPage, label = "Load more") {
  if (!host || !grid) return;

  const makeButton = (html) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-ghost";
    button.hidden = true;
    button.innerHTML = html;
    return button;
  };

  const moreIdle = `${label} <span class="material-symbols-outlined">expand_more</span>`;
  const more = makeButton(moreIdle);
  const less = makeButton(`Show less <span class="material-symbols-outlined">expand_less</span>`);
  host.prepend(more, less);

  // Cards of every page after the first, oldest first; `shown` of them are visible
  const pages = [];
  let shown = 0;

  const setPageVisible = (cards, visible) => {
    cards.forEach((card) => { card.style.display = visible ? "" : "none"; });
  };

  const sync = async () => {
    less.hidden = shown === 0;
    more.hidden = shown === pages.length && !(await pager.hasMore());
    // Collapse the host's spacing too when the buttons are all it holds
    if (host.childElementCount === 2) host.hidden = more.hidden && less.hidden;
  };

  more.addEventListener("click", async () => {
    if (shown < pages.length) {
      setPageVisible(pages[shown++], true);
      await sync();
      return;
    }

    more.disabled = true;
    more.setAttribute("aria-busy", "true");
    more.innerHTML = `Loading <span class="material-symbols-outlined">progress_activity</span>`;
    try {
      const before = grid.children.length;
      onPage(await pager.next());
      pages.push([...grid.children].slice(before));
      shown++;
    } catch (err) {
      console.error("Error loading more:", err);
      window.showToast?.("Couldn't load more right now", "error");
    } finally {
      more.disabled = false;
      more.removeAttribute("aria-busy");
      more.innerHTML = moreIdle;
      await sync();
    }
  });

  less.addEventListener("click", async () => {
    if (!shown) return;
    setPageVisible(pages[--shown], false);
    await sync();
    // The grid just got shorter, so bring the buttons back into view
    host.scrollIntoView({ behavior: "smooth", block: "end" });
  });

  sync();
}
