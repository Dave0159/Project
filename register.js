document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        errorMessage.classList.add('hidden'); // Hide previous errors

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // --- PANGGILAN API KE BACKEND ---
        fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        })
        .then(res => res.json().then(data => ({ status: res.status, body: data })))
        .then(({ status, body }) => {
            if (status === 201) {
                alert(body.message);
                window.location.href = 'login.html';
            } else {
                errorMessage.textContent = body.message || 'An unknown error occurred.';
                errorMessage.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Registration fetch error:', error);
            errorMessage.textContent = 'Could not connect to the server.';
            errorMessage.classList.remove('hidden');
        });
    });
});