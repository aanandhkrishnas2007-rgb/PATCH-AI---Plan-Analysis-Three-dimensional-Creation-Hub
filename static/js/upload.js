/**
 * Blueprint Upload & Scale Calibration Manager
 */
window.upload = {
    selectedFile: null,
    uploadedFilename: null,

    init: function() {
        const dropZone = document.getElementById('drop-zone');
        if (!dropZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });
    },

    handleFileSelect: function(e) {
        if (e.target.files.length > 0) {
            this.processFile(e.target.files[0]);
        }
    },

    processFile: async function(file) {
        const validExts = ['png', 'jpg', 'jpeg', 'pdf'];
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (!validExts.includes(ext)) {
            app.showToast('Unsupported file format. Please upload PNG, JPG, JPEG, or PDF.', 'error');
            return;
        }

        this.selectedFile = file;
        const formData = new FormData();
        formData.append('file', file);

        app.showToast('Uploading blueprint...', 'info');

        try {
            const res = await app.apiCall('/api/blueprint/upload', 'POST', formData);
            this.uploadedFilename = res.filename;

            // Display Preview
            const previewWrapper = document.getElementById('preview-wrapper');
            const previewImg = document.getElementById('upload-preview-img');
            const dropZone = document.getElementById('drop-zone');

            previewImg.src = res.filepath;
            previewWrapper.style.display = 'block';
            dropZone.style.display = 'none';

            app.showToast('Blueprint uploaded! Ready for analysis.', 'success');
        } catch (e) {
            // Toast handled
        }
    },

    startAnalysis: function() {
        if (!this.uploadedFilename) {
            app.showToast('Please upload a file first.', 'error');
            return;
        }

        const scaleInput = document.getElementById('custom-scale-input').value;
        const customScale = scaleInput ? parseFloat(scaleInput) : null;

        app.showView('analysis');
        analysis.runAnalysis(this.uploadedFilename, customScale);
    },

    reset: function() {
        this.selectedFile = null;
        this.uploadedFilename = null;
        document.getElementById('preview-wrapper').style.display = 'none';
        document.getElementById('drop-zone').style.display = 'block';
        document.getElementById('file-input').value = '';
    }
};

document.addEventListener('DOMContentLoaded', () => upload.init());
