/**
 * Interactive HTML5 2D Floor Plan Blueprint Editor
 */
window.canvas2d = {
    canvas: null,
    ctx: null,
    data: { walls: [], rooms: [], doors: [], windows: [] },
    blueprintImg: null,
    selectedElement: null,
    dragNode: null, // { wall, point: 'start'|'end' }
    dragItem: null, // { type: 'door'|'window'|'room'|'wall', item, offset: [dx, dy] }
    drawStartPoint: null,
    currentMousePos: [0, 0],
    isMouseDown: false,

    init: function() {
        this.canvas = document.getElementById('canvas2d');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        window.addEventListener('resize', () => this.resize());
        this.setupInteractions();
    },

    resize: function() {
        if (!this.canvas || !this.canvas.parentElement) return;
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.render();
    },

    loadData: function(structuralData) {
        if (!structuralData) return;
        this.data = {
            walls: structuralData.walls || [],
            rooms: structuralData.rooms || [],
            doors: structuralData.doors || [],
            windows: structuralData.windows || []
        };

        // Load background blueprint image if available
        const imgUrl = app.currentProject?.processed_image_url || app.currentProject?.thumbnail_url;
        if (imgUrl) {
            this.blueprintImg = new Image();
            this.blueprintImg.onload = () => this.render();
            this.blueprintImg.src = imgUrl;
        }

        this.render();
    },

    render: function() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 1. Clear Background (Drafting Paper)
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, w, h);

        // 2. Render Blueprint Background Image if loaded
        if (this.blueprintImg && this.blueprintImg.complete) {
            ctx.globalAlpha = 0.35;
            ctx.drawImage(this.blueprintImg, 0, 0, w, h);
            ctx.globalAlpha = 1.0;
        }

        // 3. Grid Lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        const gridSize = 20;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // 4. Draw Rooms
        this.data.rooms.forEach((room) => {
            const b = room.bounds;
            ctx.fillStyle = this.selectedElement?.id === room.id ? 'rgba(6, 182, 212, 0.35)' : 'rgba(56, 189, 248, 0.12)';
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
            ctx.lineWidth = 1.5;

            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            // Label
            ctx.fillStyle = '#f8fafc';
            ctx.font = '600 13px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(room.name, b.x + b.w/2, b.y + b.h/2 - 4);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '400 11px Inter';
            ctx.fillText(`${room.area_sqft || 120} sq.ft`, b.x + b.w/2, b.y + b.h/2 + 14);
        });

        // 5. Draw Walls
        this.data.walls.forEach(wall => {
            const isSelected = this.selectedElement?.id === wall.id;
            ctx.strokeStyle = isSelected ? '#f59e0b' : (wall.type === 'exterior' ? '#06b6d4' : '#3b82f6');
            ctx.lineWidth = wall.thickness_px || 10;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(wall.start[0], wall.start[1]);
            ctx.lineTo(wall.end[0], wall.end[1]);
            ctx.stroke();

            // Endpoint Drag Handles
            ctx.fillStyle = isSelected ? '#f59e0b' : '#ffffff';
            ctx.beginPath(); ctx.arc(wall.start[0], wall.start[1], 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(wall.end[0], wall.end[1], 5, 0, Math.PI*2); ctx.fill();
        });

        // Live Drawing Rubberband Line Preview
        if (this.drawStartPoint && editor3d.activeTool === 'wall') {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 8;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(this.drawStartPoint[0], this.drawStartPoint[1]);
            ctx.lineTo(this.currentMousePos[0], this.currentMousePos[1]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 6. Draw Doors (Rotated along parent wall)
        this.data.doors.forEach(door => {
            const pos = door.position;
            const isSelected = this.selectedElement?.id === door.id;

            ctx.save();
            ctx.translate(pos[0], pos[1]);
            ctx.rotate(door.angle_rad || 0);

            ctx.fillStyle = isSelected ? '#f59e0b' : '#10b981';
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI*2);
            ctx.fill();

            // Rotated door arc
            ctx.strokeStyle = isSelected ? '#f59e0b' : '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI/2);
            ctx.stroke();

            ctx.restore();
        });

        // 7. Draw Windows (Rotated along parent wall)
        this.data.windows.forEach(win => {
            const pos = win.position;
            const isSelected = this.selectedElement?.id === win.id;

            ctx.save();
            ctx.translate(pos[0], pos[1]);
            ctx.rotate(win.angle_rad || 0);

            ctx.fillStyle = isSelected ? '#f59e0b' : '#38bdf8';
            ctx.fillRect(-12, -5, 24, 10);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-12, -5, 24, 10);

            ctx.restore();
        });
    },

    setupInteractions: function() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.isMouseDown = true;
            this.currentMousePos = [mouseX, mouseY];

            // 1. Draw Wall Tool Action
            if (editor3d.activeTool === 'wall') {
                if (!this.drawStartPoint) {
                    this.drawStartPoint = [mouseX, mouseY];
                    app.showToast('Click second point to finish wall.', 'info');
                } else {
                    this.addWallSegment(this.drawStartPoint, [mouseX, mouseY]);
                    this.drawStartPoint = null;
                }
                return;
            }

            // 2. Add Door Tool Action
            if (editor3d.activeTool === 'door') {
                this.addDoorAtPoint([mouseX, mouseY]);
                return;
            }

            // 3. Add Window Tool Action
            if (editor3d.activeTool === 'window') {
                this.addWindowAtPoint([mouseX, mouseY]);
                return;
            }

            // 4. Select / Drag Interactions
            this.selectedElement = null;
            this.dragNode = null;
            this.dragItem = null;

            // Check Wall Endpoint Handles
            for (let wall of this.data.walls) {
                if (Math.hypot(mouseX - wall.start[0], mouseY - wall.start[1]) < 10) {
                    this.dragNode = { wall, point: 'start' };
                    this.selectedElement = { type: 'wall', item: wall, id: wall.id };
                    editor3d.selectObjectFrom2D('wall', wall);
                    this.render();
                    return;
                }
                if (Math.hypot(mouseX - wall.end[0], mouseY - wall.end[1]) < 10) {
                    this.dragNode = { wall, point: 'end' };
                    this.selectedElement = { type: 'wall', item: wall, id: wall.id };
                    editor3d.selectObjectFrom2D('wall', wall);
                    this.render();
                    return;
                }
            }

            // Check Doors
            for (let door of this.data.doors) {
                if (Math.hypot(mouseX - door.position[0], mouseY - door.position[1]) < 12) {
                    this.dragItem = { type: 'door', item: door };
                    this.selectedElement = { type: 'door', item: door, id: door.id };
                    editor3d.selectObjectFrom2D('door', door);
                    this.render();
                    return;
                }
            }

            // Check Windows
            for (let win of this.data.windows) {
                if (Math.hypot(mouseX - win.position[0], mouseY - win.position[1]) < 12) {
                    this.dragItem = { type: 'window', item: win };
                    this.selectedElement = { type: 'window', item: win, id: win.id };
                    editor3d.selectObjectFrom2D('window', win);
                    this.render();
                    return;
                }
            }

            // Check Walls
            for (let wall of this.data.walls) {
                if (this.pointNearLine([mouseX, mouseY], wall.start, wall.end, 12)) {
                    this.dragItem = { type: 'wall', item: wall, startMouse: [mouseX, mouseY] };
                    this.selectedElement = { type: 'wall', item: wall, id: wall.id };
                    editor3d.selectObjectFrom2D('wall', wall);
                    this.render();
                    return;
                }
            }

            // Check Rooms
            for (let room of this.data.rooms) {
                const b = room.bounds;
                if (mouseX >= b.x && mouseX <= b.x+b.w && mouseY >= b.y && mouseY <= b.y+b.h) {
                    this.selectedElement = { type: 'room', item: room, id: room.id };
                    editor3d.selectObjectFrom2D('room', room);
                    this.render();
                    return;
                }
            }

            this.render();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            this.currentMousePos = [mouseX, mouseY];

            if (this.drawStartPoint) {
                this.render();
                return;
            }

            if (!this.isMouseDown) return;

            // Drag Wall Endpoint Node
            if (this.dragNode) {
                if (this.dragNode.point === 'start') {
                    this.dragNode.wall.start = [mouseX, mouseY];
                } else {
                    this.dragNode.wall.end = [mouseX, mouseY];
                }
                const dx = this.dragNode.wall.end[0] - this.dragNode.wall.start[0];
                const dy = this.dragNode.wall.end[1] - this.dragNode.wall.start[1];
                this.dragNode.wall.length_px = Math.hypot(dx, dy);
                this.render();
                return;
            }

            // Drag Door or Window Position
            if (this.dragItem && (this.dragItem.type === 'door' || this.dragItem.type === 'window')) {
                this.dragItem.item.position = [mouseX, mouseY];
                this.render();
                return;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            if (this.dragNode || this.dragItem) {
                this.dragNode = null;
                this.dragItem = null;

                // Sync 2D Edits to 3D Scene
                if (app.currentProject?.structural_json) {
                    app.currentProject.structural_json.walls = this.data.walls;
                    app.currentProject.structural_json.doors = this.data.doors;
                    app.currentProject.structural_json.windows = this.data.windows;
                    viewer3d.build3DHouse(app.currentProject.structural_json);
                }
            }
            this.isMouseDown = false;
        });
    },

    addWallSegment: function(pt1, pt2) {
        editor3d.saveStateForUndo();
        const dx = pt2[0] - pt1[0];
        const dy = pt2[1] - pt1[1];
        if (Math.hypot(dx, dy) < 15) return;

        const newWall = {
            id: `wall_${this.data.walls.length + 1}`,
            start: [pt1[0], pt1[1]],
            end: [pt2[0], pt2[1]],
            length_px: Math.hypot(dx, dy),
            thickness_px: 10,
            type: 'interior'
        };

        this.data.walls.push(newWall);
        if (app.currentProject?.structural_json) {
            app.currentProject.structural_json.walls = this.data.walls;
            viewer3d.build3DHouse(app.currentProject.structural_json);
        }
        app.showToast('Wall added to 2D blueprint!', 'success');
        this.render();
    },

    addDoorAtPoint: function(pt) {
        editor3d.saveStateForUndo();
        let angle = 0;
        let wallId = 'wall_1';

        // Find nearest wall to snap door
        const nearestWall = this.findNearestWall(pt);
        if (nearestWall) {
            wallId = nearestWall.id;
            angle = Math.atan2(nearestWall.end[1] - nearestWall.start[1], nearestWall.end[0] - nearestWall.start[0]);
        }

        const newDoor = {
            id: `door_${this.data.doors.length + 1}`,
            wall_id: wallId,
            position: [pt[0], pt[1]],
            angle_rad: angle,
            width_ft: 3.0,
            height_ft: 7.0,
            style: 'single'
        };

        this.data.doors.push(newDoor);
        if (app.currentProject?.structural_json) {
            app.currentProject.structural_json.doors = this.data.doors;
            viewer3d.build3DHouse(app.currentProject.structural_json);
        }
        app.showToast('Door placed on 2D blueprint!', 'success');
        this.render();
    },

    addWindowAtPoint: function(pt) {
        editor3d.saveStateForUndo();
        let angle = 0;
        let wallId = 'wall_1';

        // Find nearest wall to snap window
        const nearestWall = this.findNearestWall(pt);
        if (nearestWall) {
            wallId = nearestWall.id;
            angle = Math.atan2(nearestWall.end[1] - nearestWall.start[1], nearestWall.end[0] - nearestWall.start[0]);
        }

        const newWin = {
            id: `window_${this.data.windows.length + 1}`,
            wall_id: wallId,
            position: [pt[0], pt[1]],
            angle_rad: angle,
            width_ft: 4.0,
            height_ft: 4.0,
            style: 'sliding'
        };

        this.data.windows.push(newWin);
        if (app.currentProject?.structural_json) {
            app.currentProject.structural_json.windows = this.data.windows;
            viewer3d.build3DHouse(app.currentProject.structural_json);
        }
        app.showToast('Window placed on 2D blueprint!', 'success');
        this.render();
    },

    findNearestWall: function(pt) {
        let bestWall = null;
        let minD = 9999;
        for (let wall of this.data.walls) {
            const d = this.pointToLineDistance(pt, wall.start, wall.end);
            if (d < minD) {
                minD = d;
                bestWall = wall;
            }
        }
        return bestWall;
    },

    pointToLineDistance: function(pt, p1, p2) {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const len = Math.hypot(dx, dy);
        if (len === 0) return Math.hypot(pt[0]-p1[0], pt[1]-p1[1]);
        const u = ((pt[0] - p1[0]) * dx + (pt[1] - p1[1]) * dy) / (len * len);
        const clampedU = Math.max(0, Math.min(1, u));
        const projX = p1[0] + clampedU * dx;
        const projY = p1[1] + clampedU * dy;
        return Math.hypot(pt[0] - projX, pt[1] - projY);
    },

    pointNearLine: function(pt, p1, p2, maxDist) {
        return this.pointToLineDistance(pt, p1, p2) <= maxDist;
    }
};
