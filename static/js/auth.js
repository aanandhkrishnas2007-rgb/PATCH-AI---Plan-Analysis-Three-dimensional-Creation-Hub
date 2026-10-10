/**
 * User Authentication Handler
 */
window.auth = {
    mode: 'login', // 'login' or 'register'

    checkSession: async function() {
        try {
            const data = await app.apiCall('/api/auth/me');
            if (data.user) {
                app.currentUser = data.user;
                this.updateUI();
            }
        } catch (e) {
            console.log("Guest session active.");
        }
    },

    openModal: function() {
        document.getElementById('auth-modal').classList.add('active');
    },

    closeModal: function() {
        document.getElementById('auth-modal').classList.remove('active');
    },

    toggleMode: function(e) {
        if (e) e.preventDefault();
        this.mode = this.mode === 'login' ? 'register' : 'login';
        
        const title = document.getElementById('auth-modal-title');
        const nameField = document.getElementById('auth-name-field');
        const btn = document.getElementById('auth-submit-btn');
        const toggleText = document.getElementById('auth-toggle-text');
        const toggleLink = document.getElementById('auth-toggle-link');

        if (this.mode === 'register') {
            title.textContent = 'Create PlanForge Account';
            nameField.style.display = 'block';
            btn.textContent = 'Register Account';
            toggleText.textContent = 'Already have an account?';
            toggleLink.textContent = 'Sign In';
        } else {
            title.textContent = 'Sign In to PlanForge AI';
            nameField.style.display = 'none';
            btn.textContent = 'Sign In';
            toggleText.textContent = "Don't have an account?";
            toggleLink.textContent = 'Register';
        }
    },

    handleSubmit: async function(e) {
        e.preventDefault();
        const email = document.getElementById('auth-email-input').value;
        const password = document.getElementById('auth-password-input').value;
        const name = document.getElementById('auth-name-input').value;

        const endpoint = this.mode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const payload = this.mode === 'register' ? { name, email, password } : { email, password };

        try {
            const res = await app.apiCall(endpoint, 'POST', payload);
            app.currentUser = res.user;
            app.showToast(res.message, 'success');
            this.closeModal();
            this.updateUI();
            app.showView('dashboard');
        } catch (err) {
            // Handled by apiCall toast
        }
    },

    updateUI: function() {
        const btn = document.getElementById('auth-btn');
        const dashLink = document.getElementById('nav-dashboard-link');

        if (app.currentUser) {
            btn.innerHTML = `<i class="fa-solid fa-user"></i> ${app.currentUser.name}`;
            btn.onclick = () => app.showView('dashboard');
            dashLink.style.display = 'block';
        } else {
            btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Sign In`;
            btn.onclick = () => this.openModal();
            dashLink.style.display = 'none';
        }
    },

    logout: async function() {
        await app.apiCall('/api/auth/logout', 'POST');
        app.currentUser = null;
        this.updateUI();
        app.showToast('Logged out successfully.', 'info');
        app.showView('landing');
    }
};
