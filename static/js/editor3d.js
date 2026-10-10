/**
 * Interactive 3D House Editor, Furniture Suite & Property Binding
 */
window.editor3d = {
    mode: '3d', // '2d', '3d', or 'walkthrough'
    selectedObject: null,
    activeTool: 'select',
    undoStack: [],
    redoStack: [],
    measurePoints: [],
    measureLineMesh: null,
    beforeAfterMode: false,
    originalState: null,

    setMode: function(modeName) {
        this.mode = modeName;
        const c2d = document.getElementById('canvas2d');
        const w3d = document.getElementById('webgl3d');
        const walkInst = document.getElementById('walkthrough-instructions');

        document.getElementById('mode-2d-btn').className = modeName === '2d' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
        document.getElementById('mode-3d-btn').className = modeName === '3d' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
        document.getElementById('mode-walk-btn').className = modeName === 'walkthrough' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';

        if (modeName === '2d') {
            c2d.style.display = 'block';
            w3d.style.display = 'none';
            walkInst.style.display = 'none';
            viewer3d.walkthroughActive = false;
            canvas2d.resize();
        } else if (modeName === '3d') {
            c2d.style.display = 'none';
            w3d.style.display = 'block';
            walkInst.style.display = 'none';
            viewer3d.walkthroughActive = false;
            viewer3d.setPresetView('iso');
        } else if (modeName === 'walkthrough') {
            c2d.style.display = 'none';
            w3d.style.display = 'block';
            walkInst.style.display = 'block';
            viewer3d.camera.position.set(0, 5.5, 5);
            viewer3d.camera.lookAt(0, 5.5, 0);
            viewer3d.controls.target.set(0, 5.5, 0);
            viewer3d.controls.update();
            app.showToast('Click inside 3D viewport to lock pointer & start Walkthrough!', 'info');
        }
    },

    setActiveTool: function(toolName) {
        this.activeTool = toolName;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`tool-${toolName}`);
        if (btn) btn.classList.add('active');

        if (toolName === 'wall') {
            this.addWall();
        } else if (toolName === 'door') {
            this.addDoor();
        } else if (toolName === 'window') {
            this.addWindow();
        } else if (toolName === 'measure') {
            app.showToast('Click 2 points in 3D scene to measure distance.', 'info');
            this.measurePoints = [];
        } else {
            app.showToast('Select / Move Tool Active', 'info');
        }
    },

    addWall: function() {
        if (!app.currentProject?.structural_json) return;
        this.saveStateForUndo();

        const walls = app.currentProject.structural_json.walls || [];
        const newWall = {
            id: `wall_${walls.length + 1}`,
            start: [200, 300],
            end: [400, 300],
            length_px: 200,
            thickness_px: 10,
            type: 'interior'
        };

        walls.push(newWall);
        app.currentProject.structural_json.walls = walls;

        viewer3d.build3DHouse(app.currentProject.structural_json);
        canvas2d.loadData(app.currentProject.structural_json);
        app.showToast('New interior wall added to project!', 'success');
    },

    addDoor: function() {
        if (!app.currentProject?.structural_json) return;
        this.saveStateForUndo();

        const doors = app.currentProject.structural_json.doors || [];
        const newDoor = {
            id: `door_${doors.length + 1}`,
            wall_id: 'wall_1',
            position: [300, 300],
            width_ft: 3.0,
            height_ft: 7.0,
            style: 'single'
        };

        doors.push(newDoor);
        app.currentProject.structural_json.doors = doors;

        viewer3d.build3DHouse(app.currentProject.structural_json);
        canvas2d.loadData(app.currentProject.structural_json);
        app.showToast('New door opening added!', 'success');
    },

    addWindow: function() {
        if (!app.currentProject?.structural_json) return;
        this.saveStateForUndo();

        const windows = app.currentProject.structural_json.windows || [];
        const newWindow = {
            id: `window_${windows.length + 1}`,
            wall_id: 'wall_1',
            position: [350, 300],
            width_ft: 4.0,
            height_ft: 4.0,
            style: 'sliding'
        };

        windows.push(newWindow);
        app.currentProject.structural_json.windows = windows;

        viewer3d.build3DHouse(app.currentProject.structural_json);
        canvas2d.loadData(app.currentProject.structural_json);
        app.showToast('New glass window added!', 'success');
    },

    updateGlobalParams: function() {
        const heightInput = document.getElementById('global-wall-height');
        const thicknessInput = document.getElementById('global-wall-thickness');

        if (app.currentProject) {
            if (heightInput) app.currentProject.wall_height = parseFloat(heightInput.value);
            if (thicknessInput) app.currentProject.wall_thickness = parseFloat(thicknessInput.value) / 12.0;

            if (app.currentProject.structural_json) {
                viewer3d.build3DHouse(app.currentProject.structural_json);
            }
            app.showToast('Global house parameters updated!', 'success');
        }
    },

    handle3DClick: function(event) {
        if (this.activeTool === 'measure') {
            this.handleMeasureClick(event);
            return;
        }

        const container = document.getElementById('webgl3d');
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / container.clientWidth) * 2 - 1,
            -((event.clientY - rect.top) / container.clientHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, viewer3d.camera);

        const intersects = raycaster.intersectObjects(viewer3d.houseGroup.children, true);
        
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj.parent && obj.parent !== viewer3d.houseGroup && !obj.userData?.type) {
                obj = obj.parent;
            }

            this.selectObject(obj);
        } else {
            this.deselectObject();
        }
    },

    selectObject: function(obj) {
        this.selectedObject = obj;
        if (viewer3d.transformControls && obj) {
            viewer3d.transformControls.attach(obj);
        }
        this.updatePropertyPanel(obj);
    },

    selectObjectFrom2D: function(type, data) {
        const targetMesh = viewer3d.houseGroup.children.find(child => child.userData?.id === data.id);
        if (targetMesh) {
            this.selectObject(targetMesh);
        }
    },

    deselectObject: function() {
        this.selectedObject = null;
        if (viewer3d.transformControls) {
            viewer3d.transformControls.detach();
        }
        document.getElementById('props-form').style.display = 'none';
        document.getElementById('selected-object-info').innerHTML = '<p style="color:var(--text-secondary); font-size:0.85rem;">Click any Wall, Room, Door, Window, or Furniture piece to inspect properties.</p>';
    },

    updatePropertyPanel: function(obj) {
        if (!obj || !obj.userData) return;
        const u = obj.userData;
        const form = document.getElementById('props-form');
        const info = document.getElementById('selected-object-info');

        form.style.display = 'block';
        info.innerHTML = `<h5 style="color:var(--accent-cyan); margin-bottom:10px;">Selected ${u.type ? u.type.toUpperCase() : 'OBJECT'} (${u.id})</h5>`;

        document.getElementById('prop-input-name').value = u.data?.name || u.id || 'Object';
        document.getElementById('prop-input-val1').value = u.data?.dimensions_ft?.width || u.data?.length_ft || 12.0;
        document.getElementById('prop-input-val2').value = u.data?.dimensions_ft?.length || u.data?.height_ft || 10.0;
        document.getElementById('prop-input-material').value = u.data?.material || 'hardwood';
    },

    applyPropertyChanges: function() {
        if (!this.selectedObject) return;
        this.saveStateForUndo();

        const name = document.getElementById('prop-input-name').value;
        const val1 = parseFloat(document.getElementById('prop-input-val1').value);
        const val2 = parseFloat(document.getElementById('prop-input-val2').value);
        const mat = document.getElementById('prop-input-material').value;

        const u = this.selectedObject.userData;
        if (u.data) {
            u.data.name = name;
            u.data.material = mat;
            if (u.type === 'room') {
                u.data.dimensions_ft = { width: val1, length: val2 };
                u.data.area_sqft = round(val1 * val2, 1);
            }
        }

        if (viewer3d.materials[mat] && this.selectedObject.material) {
            this.selectedObject.material = viewer3d.materials[mat].clone();
        }

        app.showToast('Object properties updated.', 'success');
        canvas2d.render();
    },

    spawnFurniture: function(furnitureType) {
        this.saveStateForUndo();
        const fGroup = new THREE.Group();

        let color = 0x854d0e;
        let size = [3, 2, 4];

        if (furnitureType === 'bed') { color = 0x3b82f6; size = [6, 2, 6.5]; }
        if (furnitureType === 'sofa') { color = 0x06b6d4; size = [7, 2.5, 3]; }
        if (furnitureType === 'table') { color = 0x78350f; size = [5, 2.8, 3.5]; }
        if (furnitureType === 'chair') { color = 0xd97706; size = [1.8, 3, 1.8]; }
        if (furnitureType === 'counter') { color = 0x475569; size = [8, 3, 2.5]; }
        if (furnitureType === 'toilet') { color = 0xf8fafc; size = [1.5, 2.5, 2]; }
        if (furnitureType === 'wardrobe') { color = 0x451a03; size = [4, 7, 2]; }

        const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = size[1] / 2.0;
        mesh.castShadow = true;

        fGroup.add(mesh);
        fGroup.position.set(0, 0, 0);
        fGroup.userData = { type: 'furniture', id: `furniture_${Date.now()}`, data: { name: furnitureType.toUpperCase() } };

        viewer3d.houseGroup.add(fGroup);
        this.selectObject(fGroup);
        app.showToast(`Added ${furnitureType} to 3D scene!`, 'success');
    },

    deleteSelected: function() {
        if (!this.selectedObject) return;
        this.saveStateForUndo();
        
        viewer3d.houseGroup.remove(this.selectedObject);
        this.deselectObject();
        app.showToast('Element deleted.', 'info');
        canvas2d.render();
    },

    handleMeasureClick: function(event) {
        const container = document.getElementById('webgl3d');
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / container.clientWidth) * 2 - 1,
            -((event.clientY - rect.top) / container.clientHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, viewer3d.camera);
        const intersects = raycaster.intersectObjects(viewer3d.houseGroup.children, true);

        if (intersects.length > 0) {
            const pt = intersects[0].point;
            this.measurePoints.push(pt);

            if (this.measurePoints.length === 2) {
                const p1 = this.measurePoints[0];
                const p2 = this.measurePoints[1];
                const distFt = p1.distanceTo(p2).toFixed(2);

                if (this.measureLineMesh) viewer3d.scene.remove(this.measureLineMesh);
                
                const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3 });
                this.measureLineMesh = new THREE.Line(lineGeo, lineMat);
                viewer3d.scene.add(this.measureLineMesh);

                document.getElementById('status-measure').textContent = `Measurement: ${distFt} ft`;
                app.showToast(`Distance: ${distFt} feet`, 'success');
                this.measurePoints = [];
            } else {
                app.showToast('Click second point to finish measurement.', 'info');
            }
        }
    },

    saveStateForUndo: function() {
        if (app.currentProject?.structural_json) {
            this.undoStack.push(JSON.stringify(app.currentProject.structural_json));
        }
    },

    undo: function() {
        if (this.undoStack.length === 0) return;
        const prev = this.undoStack.pop();
        this.redoStack.push(JSON.stringify(app.currentProject.structural_json));
        app.currentProject.structural_json = JSON.parse(prev);
        viewer3d.build3DHouse(app.currentProject.structural_json);
        canvas2d.loadData(app.currentProject.structural_json);
        app.showToast('Undo performed.', 'info');
    },

    redo: function() {
        if (this.redoStack.length === 0) return;
        const next = this.redoStack.pop();
        this.undoStack.push(JSON.stringify(app.currentProject.structural_json));
        app.currentProject.structural_json = JSON.parse(next);
        viewer3d.build3DHouse(app.currentProject.structural_json);
        canvas2d.loadData(app.currentProject.structural_json);
        app.showToast('Redo performed.', 'info');
    },

    toggleBeforeAfter: function() {
        this.beforeAfterMode = !this.beforeAfterMode;
        if (this.beforeAfterMode) {
            this.originalState = JSON.stringify(app.currentProject.structural_json);
            app.showToast('Showing Original AI Model', 'info');
        } else {
            app.showToast('Showing Edited Model', 'info');
        }
    },

    saveProject: async function() {
        if (!app.currentProject?.id) return;
        try {
            await app.apiCall(`/api/projects/${app.currentProject.id}`, 'PUT', {
                structural_json: app.currentProject.structural_json
            });
            app.showToast('Project saved successfully!', 'success');
        } catch (e) {
            // Toast handled
        }
    },

    syncFrom3DGizmo: function() {
        canvas2d.render();
    }
};

// Global alias so inline HTML onclick="editor.setMode(...)" and onclick="editor.setActiveTool(...)" bind cleanly!
window.editor = window.editor3d;

function round(val, decimals) {
    return Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);
}
