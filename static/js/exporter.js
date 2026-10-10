/**
 * Multi-Format Exporter (GLTF/GLB, OBJ, STL, JSON, HD Screenshot)
 */
window.exporter = {
    openMenu: function() {
        const format = prompt("Select Export Format:\n1 = OBJ Model (.obj)\n2 = STL Model (.stl)\n3 = GLTF Model (.gltf)\n4 = Structural Data (.json)\n5 = HD Image Screenshot (.png)", "1");

        if (format === '1') this.exportOBJ();
        else if (format === '2') this.exportSTL();
        else if (format === '3') this.exportGLTF();
        else if (format === '4') this.exportJSON();
        else if (format === '5') this.exportScreenshot();
    },

    exportOBJ: function() {
        if (!THREE.OBJExporter || !viewer3d.houseGroup) {
            app.showToast('OBJ Exporter not loaded.', 'error');
            return;
        }

        const exporter = new THREE.OBJExporter();
        const result = exporter.parse(viewer3d.houseGroup);
        this.downloadFile(result, 'blueprint3d_model.obj', 'text/plain');
        app.showToast('Exported OBJ 3D Model file!', 'success');
    },

    exportSTL: function() {
        if (!THREE.STLExporter || !viewer3d.houseGroup) {
            app.showToast('STL Exporter not loaded.', 'error');
            return;
        }

        const exporter = new THREE.STLExporter();
        const result = exporter.parse(viewer3d.houseGroup, { binary: true });
        const blob = new Blob([result], { type: 'application/octet-stream' });
        this.downloadBlob(blob, 'blueprint3d_model.stl');
        app.showToast('Exported STL 3D Print file!', 'success');
    },

    exportGLTF: function() {
        if (!THREE.GLTFExporter || !viewer3d.houseGroup) {
            app.showToast('GLTF Exporter not loaded.', 'error');
            return;
        }

        const exporter = new THREE.GLTFExporter();
        exporter.parse(viewer3d.houseGroup, (gltf) => {
            const output = JSON.stringify(gltf, null, 2);
            this.downloadFile(output, 'blueprint3d_model.gltf', 'application/json');
            app.showToast('Exported GLTF 3D Scene!', 'success');
        });
    },

    exportJSON: function() {
        if (!app.currentProject?.id) {
            app.showToast('No active project to export.', 'error');
            return;
        }
        window.location.href = `/api/export/json/${app.currentProject.id}`;
    },

    exportScreenshot: function() {
        if (!viewer3d.renderer) return;
        viewer3d.renderer.render(viewer3d.scene, viewer3d.camera);
        const dataURL = viewer3d.renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = 'blueprint3d_render.png';
        link.href = dataURL;
        link.click();
        app.showToast('Downloaded HD 3D Render Screenshot!', 'success');
    },

    downloadFile: function(content, filename, contentType) {
        const a = document.createElement('a');
        const blob = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    },

    downloadBlob: function(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    }
};
