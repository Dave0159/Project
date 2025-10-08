document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const guestLoginBtn = document.getElementById('guest-login-btn');
    const errorMessage = document.getElementById('error-message');

    // --- SIMULASI BACKEND ---
    // Di aplikasi nyata, ini akan menjadi panggilan API ke server Anda.

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.classList.add('hidden');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                // Simpan token dan role dari server
                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.role);
                window.location.href = 'index.html';
            } else {
                errorMessage.textContent = data.message;
                errorMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login fetch error:', error);
            errorMessage.textContent = 'Could not connect to the server.';
            errorMessage.classList.remove('hidden');
        }
    });

    guestLoginBtn.addEventListener('click', () => {
        // Guest login is disabled as it bypasses database authentication.
        errorMessage.textContent = 'Guest login is not supported.';
        errorMessage.classList.remove('hidden');
    });
});