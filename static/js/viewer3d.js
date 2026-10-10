/**
 * Three.js 3D House Builder & WebGL Renderer with First-Person Walkthrough Engine
 */
window.viewer3d = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    transformControls: null,
    houseGroup: null,
    materials: {},
    isInitialized: false,
    ceilingMesh: null,
    
    // Walkthrough Engine State
    walkthroughActive: false,
    walkState: { moveForward: false, moveBackward: false, moveLeft: false, moveRight: false },
    walkEuler: new THREE.Euler(0, 0, 0, 'YXZ'),
    walkSpeed: 0.25,

    init: function() {
        const container = document.getElementById('webgl3d');
        if (!container || this.isInitialized) return;

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#070a12');
        this.scene.fog = new THREE.FogExp2('#070a12', 0.008);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 35, 45);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // 4. OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02;

        // 5. TransformControls Gizmo
        if (THREE.TransformControls) {
            this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
            this.transformControls.size = 0.75;
            this.scene.add(this.transformControls);
            
            this.transformControls.addEventListener('dragging-changed', (event) => {
                this.controls.enabled = !event.value;
            });

            this.transformControls.addEventListener('change', () => {
                if (editor3d.selectedObject) {
                    editor3d.syncFrom3DGizmo();
                }
            });
        }

        // 6. Lighting & Environment
        this.setupLighting();
        this.setupMaterials();

        // 7. House Parent Group
        this.houseGroup = new THREE.Group();
        this.scene.add(this.houseGroup);

        // 8. Event Listeners & Walkthrough Pointer Controls
        this.setupWalkthroughControls();

        // Window Resize Listener
        window.addEventListener('resize', () => this.onWindowResize());

        // Animation Loop
        this.isInitialized = true;
        this.animate();

        // Raycasting selection event listener
        this.renderer.domElement.addEventListener('click', (e) => {
            if (!this.walkthroughActive) {
                editor3d.handle3DClick(e);
            }
        });
    },

    setupLighting: function() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfffaed, 0.9);
        sunLight.position.set(40, 60, 30);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 200;
        const d = 40;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        this.scene.add(sunLight);

        const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.35);
        this.scene.add(hemiLight);

        // Ground Grid Plane
        const gridHelper = new THREE.GridHelper(120, 60, 0x06b6d4, 0x1e293b);
        gridHelper.position.y = -0.01;
        this.scene.add(gridHelper);

        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.9 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.02;
        ground.receiveShadow = true;
        this.scene.add(ground);
    },

    setupMaterials: function() {
        this.materials = {
            wall: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 }),
            exteriorWall: new THREE.MeshStandardMaterial({ color: 0xcbdaf1, roughness: 0.4 }),
            doorFrame: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3 }),
            doorPanel: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 }),
            windowFrame: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 }),
            glass: new THREE.MeshPhysicalMaterial({
                color: 0x38bdf8, transparent: true, opacity: 0.45, roughness: 0.1, transmission: 0.9
            }),
            ceiling: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8, side: THREE.DoubleSide }),
            
            hardwood: new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.4 }),
            marble: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15 }),
            tile: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3 }),
            carpet: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 }),
            concrete: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
        };
    },

    setupWalkthroughControls: function() {
        const container = document.getElementById('webgl3d');

        container.addEventListener('click', () => {
            if (editor3d.mode === 'walkthrough') {
                container.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.walkthroughActive = (document.pointerLockElement === container);
            if (this.walkthroughActive) {
                this.controls.enabled = false;
                if (this.transformControls) this.transformControls.detach();
            } else if (editor3d.mode === 'walkthrough') {
                this.controls.enabled = true;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.walkthroughActive) return;
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;

            this.walkEuler.setFromQuaternion(this.camera.quaternion);
            this.walkEuler.y -= movementX * 0.0025;
            this.walkEuler.x -= movementY * 0.0025;
            this.walkEuler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.walkEuler.x));
            this.camera.quaternion.setFromEuler(this.walkEuler);
        });

        const onKeyDown = (e) => {
            if (!this.walkthroughActive) return;
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': this.walkState.moveForward = true; break;
                case 'KeyS': case 'ArrowDown': this.walkState.moveBackward = true; break;
                case 'KeyA': case 'ArrowLeft': this.walkState.moveLeft = true; break;
                case 'KeyD': case 'ArrowRight': this.walkState.moveRight = true; break;
            }
        };

        const onKeyUp = (e) => {
            if (!this.walkthroughActive) return;
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': this.walkState.moveForward = false; break;
                case 'KeyS': case 'ArrowDown': this.walkState.moveBackward = false; break;
                case 'KeyA': case 'ArrowLeft': this.walkState.moveLeft = false; break;
                case 'KeyD': case 'ArrowRight': this.walkState.moveRight = false; break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    },

    updateWalkthroughPosition: function() {
        if (!this.walkthroughActive) return;

        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const moveVector = new THREE.Vector3(0, 0, 0);

        if (this.walkState.moveForward) moveVector.add(forward);
        if (this.walkState.moveBackward) moveVector.sub(forward);
        if (this.walkState.moveRight) moveVector.add(right);
        if (this.walkState.moveLeft) moveVector.sub(right);

        if (moveVector.lengthSq() > 0) {
            moveVector.normalize().multiplyScalar(this.walkSpeed);
            this.camera.position.add(moveVector);
        }

        this.camera.position.y = 5.5;
    },

    build3DHouse: function(structuralData) {
        if (!this.houseGroup) return;

        while (this.houseGroup.children.length > 0) {
            this.houseGroup.remove(this.houseGroup.children[0]);
        }

        const scale = structuralData.scale_ratio || 20.0;
        const wallHeight = app.currentProject?.wall_height || 10.0;
        const wallThickness = app.currentProject?.wall_thickness || 0.5;

        const imgW = structuralData.image_size?.width || 800;
        const imgH = structuralData.image_size?.height || 600;
        const offsetX = (imgW / scale) / 2.0;
        const offsetZ = (imgH / scale) / 2.0;

        // Build 3D Walls map for quick angle lookup by ID
        const wallMap = {};
        (structuralData.walls || []).forEach(wall => {
            wallMap[wall.id] = wall;
        });

        // 1. Rooms & Floors
        (structuralData.rooms || []).forEach(room => {
            const b = room.bounds;
            const rw = b.w / scale;
            const rl = b.h / scale;
            const rx = (b.x / scale) + rw/2.0 - offsetX;
            const rz = (b.y / scale) + rl/2.0 - offsetZ;

            const floorGeo = new THREE.BoxGeometry(rw, 0.1, rl);
            const matName = room.material || 'hardwood';
            const floorMat = (this.materials[matName] || this.materials.hardwood).clone();
            const floorMesh = new THREE.Mesh(floorGeo, floorMat);
            floorMesh.position.set(rx, 0.05, rz);
            floorMesh.receiveShadow = true;
            floorMesh.userData = { type: 'room', id: room.id, data: room };

            this.houseGroup.add(floorMesh);
        });

        // 2. Walls
        (structuralData.walls || []).forEach(wall => {
            const x1 = (wall.start[0] / scale) - offsetX;
            const z1 = (wall.start[1] / scale) - offsetZ;
            const x2 = (wall.end[0] / scale) - offsetX;
            const z2 = (wall.end[1] / scale) - offsetZ;

            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.hypot(dx, dz);
            if (length < 0.2) return;

            const angle = Math.atan2(dz, dx);
            const midX = (x1 + x2) / 2.0;
            const midZ = (z1 + z2) / 2.0;

            const thick = wall.thickness_px ? (wall.thickness_px / scale) : wallThickness;

            const wallGeo = new THREE.BoxGeometry(length, wallHeight, thick);
            const wallMat = wall.type === 'exterior' ? this.materials.exteriorWall : this.materials.wall;
            const wallMesh = new THREE.Mesh(wallGeo, wallMat);

            wallMesh.position.set(midX, wallHeight / 2.0, midZ);
            wallMesh.rotation.y = -angle;
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            wallMesh.userData = { type: 'wall', id: wall.id, data: wall };

            this.houseGroup.add(wallMesh);
        });

        // 3. Doors with Parent Wall Angle Alignment
        (structuralData.doors || []).forEach(door => {
            const dx = (door.position[0] / scale) - offsetX;
            const dz = (door.position[1] / scale) - offsetZ;

            const doorGroup = new THREE.Group();
            doorGroup.position.set(dx, 0, dz);

            let angle = door.angle_rad || 0;
            if (door.wall_id && wallMap[door.wall_id]) {
                const parentWall = wallMap[door.wall_id];
                const x1 = (parentWall.start[0] / scale) - offsetX;
                const z1 = (parentWall.start[1] / scale) - offsetZ;
                const x2 = (parentWall.end[0] / scale) - offsetX;
                const z2 = (parentWall.end[1] / scale) - offsetZ;
                angle = Math.atan2(z2 - z1, x2 - x1);
            }
            doorGroup.rotation.y = -angle;

            const frameGeo = new THREE.BoxGeometry(3.2, 7.2, 0.6);
            const frameMesh = new THREE.Mesh(frameGeo, this.materials.doorFrame);
            frameMesh.position.y = 3.6;

            const panelGeo = new THREE.BoxGeometry(2.8, 6.8, 0.2);
            const panelMesh = new THREE.Mesh(panelGeo, this.materials.doorPanel);
            panelMesh.position.y = 3.5;

            doorGroup.add(frameMesh);
            doorGroup.add(panelMesh);
            doorGroup.userData = { type: 'door', id: door.id, data: door };

            this.houseGroup.add(doorGroup);
        });

        // 4. Windows with Parent Wall Angle Alignment
        (structuralData.windows || []).forEach(win => {
            const wx = (win.position[0] / scale) - offsetX;
            const wz = (win.position[1] / scale) - offsetZ;

            const winGroup = new THREE.Group();
            winGroup.position.set(wx, 3.5, wz);

            let angle = win.angle_rad || 0;
            if (win.wall_id && wallMap[win.wall_id]) {
                const parentWall = wallMap[win.wall_id];
                const x1 = (parentWall.start[0] / scale) - offsetX;
                const z1 = (parentWall.start[1] / scale) - offsetZ;
                const x2 = (parentWall.end[0] / scale) - offsetX;
                const z2 = (parentWall.end[1] / scale) - offsetZ;
                angle = Math.atan2(z2 - z1, x2 - x1);
            }
            winGroup.rotation.y = -angle;

            const frameGeo = new THREE.BoxGeometry(4.2, 4.2, 0.6);
            const frameMesh = new THREE.Mesh(frameGeo, this.materials.windowFrame);

            const glassGeo = new THREE.BoxGeometry(3.8, 3.8, 0.1);
            const glassMesh = new THREE.Mesh(glassGeo, this.materials.glass);

            winGroup.add(frameMesh);
            winGroup.add(glassMesh);
            winGroup.userData = { type: 'window', id: win.id, data: win };

            this.houseGroup.add(winGroup);
        });

        // Ceiling
        const houseWidth = (imgW / scale);
        const houseDepth = (imgH / scale);
        const ceilingGeo = new THREE.BoxGeometry(houseWidth, 0.2, houseDepth);
        this.ceilingMesh = new THREE.Mesh(ceilingGeo, this.materials.ceiling);
        this.ceilingMesh.position.set(0, wallHeight + 0.1, 0);
        this.ceilingMesh.castShadow = true;
        this.houseGroup.add(this.ceilingMesh);

        this.controls.target.set(0, wallHeight/3.0, 0);
        this.controls.update();
    },

    toggleCeiling: function(visible) {
        if (this.ceilingMesh) {
            this.ceilingMesh.visible = visible;
        }
    },

    setPresetView: function(viewName) {
        if (!this.camera || !this.controls) return;
        this.controls.enabled = true;
        this.walkthroughActive = false;

        if (viewName === 'top') {
            this.camera.position.set(0, 70, 0.01);
        } else if (viewName === 'front') {
            this.camera.position.set(0, 10, 60);
        } else if (viewName === 'side') {
            this.camera.position.set(60, 10, 0);
        } else if (viewName === 'iso') {
            this.camera.position.set(35, 35, 35);
        }
        this.controls.target.set(0, 5, 0);
        this.controls.update();
    },

    onWindowResize: function() {
        const container = document.getElementById('webgl3d');
        if (!container || !this.renderer || !this.camera) return;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    },

    animate: function() {
        requestAnimationFrame(() => this.animate());

        if (this.walkthroughActive) {
            this.updateWalkthroughPosition();
        } else if (this.controls && this.controls.enabled) {
            this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
};
