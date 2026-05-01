export function initContactForm() {
    const form = document.getElementById('contact-form');

    if (!form) {
        console.error('contact-form not found');
        return;
    }

    form.addEventListener('submit', handleSubmit);
}

/* =========================
   Submit Handler
========================= */
async function handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // UI Loading state
    submitBtn.innerHTML = 'SENDING...';
    submitBtn.disabled = true;

    const formData = Object.fromEntries(new FormData(form));

    try {
        const response = await fetch(`${window.API_BASE_URL}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        // small UX delay (feels smoother)
        await new Promise(res => setTimeout(res, 600));

        if (!response.ok) {
            throw new Error('Request failed');
        }

        showToast('✓ Message sent successfully', 'success');
        form.reset();

    } catch (error) {
        console.error(error);
        showToast('✗ Failed to send message', 'error');

    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/* =========================
   Toast System
========================= */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');

    toast.className = `
        fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg
        text-sm font-medium transition-all
        ${type === 'success'
            ? 'bg-primary text-on-primary'
            : 'bg-error text-white'}
    `;

    toast.innerText = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
    }, 2500);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}