/**
 * AI Analysis Visualizer
 */
window.analysis = {
    runAnalysis: async function(filename, customScale = null) {
        this.resetProgress();
        this.animateProgress();

        try {
            const res = await app.apiCall('/api/blueprint/analyze', 'POST', {
                filename: filename,
                custom_scale: customScale,
                project_name: `Blueprint Project (${new Date().toLocaleTimeString()})`
            });

            this.finishProgress();
            this.updateMetrics(res);
            app.currentProject = res.project;
            app.showToast('Blueprint structural analysis complete!', 'success');

        } catch (e) {
            this.resetProgress();
        }
    },

    startDemo: async function(demoType = 'apartment') {
        this.resetProgress();
        this.animateProgress();

        try {
            const res = await app.apiCall('/api/blueprint/demo', 'POST', {
                demo_type: demoType
            });

            this.finishProgress();
            this.updateMetrics(res);
            app.currentProject = res.project;
            app.showToast(`Demo Blueprint (${demoType}) processed successfully!`, 'success');

        } catch (e) {
            this.resetProgress();
        }
    },

    animateProgress: function() {
        const fill = document.getElementById('progress-fill');
        let width = 0;
        this.progressInterval = setInterval(() => {
            if (width < 90) {
                width += Math.random() * 15;
                fill.style.width = `${Math.min(width, 90)}%`;
            }
        }, 200);
    },

    finishProgress: function() {
        clearInterval(this.progressInterval);
        document.getElementById('progress-fill').style.width = '100%';
    },

    resetProgress: function() {
        clearInterval(this.progressInterval);
        document.getElementById('progress-fill').style.width = '0%';
    },

    updateMetrics: function(data) {
        document.getElementById('metric-walls').textContent = data.summary?.walls || 0;
        document.getElementById('metric-rooms').textContent = data.summary?.rooms || 0;
        document.getElementById('metric-doors').textContent = data.summary?.doors || 0;
        document.getElementById('metric-windows').textContent = data.summary?.windows || 0;

        const overlayImg = document.getElementById('processed-overlay-img');
        if (data.processed_image_filename) {
            overlayImg.src = `/uploads/${data.processed_image_filename}`;
        } else if (data.project?.processed_image_url) {
            overlayImg.src = data.project.processed_image_url;
        }
    }
};
