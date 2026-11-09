// Already logged in? Go straight to the right page.
if (Auth.isLoggedIn()) {
    window.location.replace(Auth.homeFor(Auth.getRole()));
}

const loginError = document.getElementById('loginError');

async function login(url, body) {
    loginError.textContent = '';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {})
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Unable to log in.');
        }

        Auth.save(result.token, result.role);
        window.location.href = Auth.homeFor(result.role);

    } catch (error) {
        loginError.textContent = error.message;
    }
}

document.getElementById('customerButton').addEventListener('click', () => {
    login('/api/auth/customer');
});

document.getElementById('adminForm').addEventListener('submit', event => {
    event.preventDefault();

    login('/api/auth/admin', {
        username: document.getElementById('adminUsername').value.trim(),
        password: document.getElementById('adminPassword').value
    });
});