/**
 * PlanForge AI - Master Application Controller
 */
window.app = {
    currentView: 'landing',
    currentUser: null,
    currentProject: null,
    activeTool: 'select',

    init: function() {
        console.log("Initializing PlanForge AI Application...");
        auth.checkSession();
        this.setupEventListeners();
    },

    setupEventListeners: function() {
        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                editor.undo();
            } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                editor.redo();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                editor.deleteSelected();
            }
        });
    },

    showView: function(viewId) {
        document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(`${viewId}-view`);
        if (target) {
            target.classList.add('active');
            this.currentView = viewId;
            window.scrollTo(0, 0);

            if (viewId === 'dashboard') {
                dashboard.loadProjects();
            } else if (viewId === 'editor') {
                setTimeout(() => {
                    if (viewer3d.renderer) {
                        viewer3d.onWindowResize();
                    }
                }, 100);
            }
        }
    },

    showToast: function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    runDemo: function(demoType = 'apartment') {
        this.showToast(`Launching ${demoType === 'apartment' ? 'Modern Apartment' : 'Luxury Villa'} Demo...`, 'info');
        this.showView('analysis');
        analysis.startDemo(demoType);
    },

    openStudio: function(projectData) {
        if (projectData) {
            this.currentProject = projectData;
        }
        
        this.showView('editor');
        
        document.getElementById('studio-project-title').textContent = this.currentProject?.name || 'Project Studio';
        
        // Initialize 3D Viewer & 2D Canvas
        setTimeout(() => {
            canvas2d.init();
            viewer3d.init();
            if (this.currentProject?.structural_json) {
                viewer3d.build3DHouse(this.currentProject.structural_json);
                canvas2d.loadData(this.currentProject.structural_json);
            }
        }, 50);
    },

    apiCall: async function(url, method = 'GET', body = null) {
        const options = { method, headers: {} };
        if (body && !(body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        } else if (body instanceof FormData) {
            options.body = body;
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'API Request failed');
            }
            return data;
        } catch (err) {
            this.showToast(err.message, 'error');
            throw err;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
