// Shared login/session helpers for every page
(function () {
    const TOKEN_KEY = 'salo_token';
    const ROLE_KEY = 'salo_role';

    const originalFetch = window.fetch.bind(window);

    function clearSession() {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(ROLE_KEY);
    }

    // Automatically attach the login token to every /api request
    window.fetch = async function (url, options = {}) {
        const isApi = typeof url === 'string' && url.startsWith('/api');
        const isAuthCall = isApi && url.startsWith('/api/auth/');

        if (isApi) {
            options = { ...options };
            options.headers = { ...(options.headers || {}) };
            const token = sessionStorage.getItem(TOKEN_KEY);
            if (token) options.headers['Authorization'] = 'Bearer ' + token;
        }

        const response = await originalFetch(url, options);

        // Session expired / not allowed -> back to login
        if (isApi && !isAuthCall && response.status === 401) {
            clearSession();
            window.location.replace('index.html');
        }
        return response;
    };

    window.Auth = {
        getRole: () => sessionStorage.getItem(ROLE_KEY),
        isLoggedIn: () => !!sessionStorage.getItem(TOKEN_KEY),

        save(token, role) {
            sessionStorage.setItem(TOKEN_KEY, token);
            sessionStorage.setItem(ROLE_KEY, role);
        },

        homeFor: role => (role === 'admin' ? 'admin.html' : 'customer.html'),

        // Call at the top of a protected page
        requireRole(role) {
            if (!this.isLoggedIn() || this.getRole() !== role) {
                window.location.replace('index.html');
            }
        },

        async logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch (e) { /* ignore */ }
            clearSession();
            window.location.replace('index.html');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', event => {
                event.preventDefault();
                window.Auth.logout();
            });
        }
    });
})();