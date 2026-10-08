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
    submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Sending…';
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

        window.showToast("Message sent — I'll get back to you soon!", 'success');
        form.reset();

    } catch (error) {
        console.error(error);
        window.showToast('Could not send the message. Please email me directly.', 'error');

    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}
