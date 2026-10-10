/**
 * Projects Dashboard Controller
 */
window.dashboard = {
    loadProjects: async function() {
        const grid = document.getElementById('projects-grid');
        grid.innerHTML = '<div style="color:var(--text-secondary); grid-column:1/-1;">Loading projects...</div>';

        try {
            const data = await app.apiCall('/api/projects');
            const projects = data.projects || [];

            if (projects.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:60px 20px; background:var(--bg-card); border-radius:16px; border:1px dashed var(--border-color);">
                        <i class="fa-solid fa-folder-open" style="font-size:3rem; color:var(--text-secondary); margin-bottom:16px;"></i>
                        <h3>No Projects Yet</h3>
                        <p style="color:var(--text-secondary); margin-bottom:20px;">Upload a 2D floor plan or try our instant demo to create your first 3D house model.</p>
                        <button class="btn btn-primary" onclick="app.showView('upload')"><i class="fa-solid fa-upload"></i> Upload Blueprint</button>
                    </div>
                `;
                return;
            }

            grid.innerHTML = projects.map(p => `
                <div class="card" style="padding:0; overflow:hidden; display:flex; flex-direction:column;">
                    <div style="height:180px; background:#0f172a; position:relative; overflow:hidden;">
                        <img src="${p.processed_image_url || p.thumbnail_url || '/static/css/grid_placeholder.png'}" 
                             alt="${p.name}" style="width:100%; height:100%; object-fit:cover;">
                        <div style="position:absolute; top:10px; right:10px; background:rgba(15,23,42,0.85); padding:4px 10px; border-radius:20px; font-size:0.75rem; color:var(--accent-cyan); border:1px solid var(--border-color);">
                            ${p.rooms_count} Rooms
                        </div>
                    </div>
                    <div style="padding:20px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <h4 style="font-size:1.1rem; margin-bottom:6px;">${p.name}</h4>
                            <p style="color:var(--text-secondary); font-size:0.82rem; margin-bottom:14px;">Modified: ${new Date(p.updated_at).toLocaleDateString()}</p>
                        </div>
                        <div style="display:flex; gap:8px; margin-top:10px;">
                            <button class="btn btn-primary btn-sm" style="flex:1;" onclick="dashboard.openProject(${p.id})">
                                <i class="fa-solid fa-pen-to-square"></i> Open Studio
                            </button>
                            <button class="btn btn-outline btn-sm" style="color:var(--accent-red); border-color:var(--accent-red);" onclick="dashboard.deleteProject(${p.id})">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (e) {
            grid.innerHTML = '<div style="color:var(--accent-red); grid-column:1/-1;">Failed to load projects.</div>';
        }
    },

    openProject: async function(projectId) {
        try {
            const data = await app.apiCall(`/api/projects/${projectId}`);
            app.openStudio(data.project);
        } catch (e) {
            app.showToast('Failed to load project details.', 'error');
        }
    },

    deleteProject: async function(projectId) {
        if (!confirm('Are you sure you want to delete this project?')) return;
        try {
            await app.apiCall(`/api/projects/${projectId}`, 'DELETE');
            app.showToast('Project deleted successfully.', 'success');
            this.loadProjects();
        } catch (e) {
            // Toast handled
        }
    }
};
