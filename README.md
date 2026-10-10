# PATCH ai 🏠🤖

> **Spatial Intelligence & Architectural AI Platform &mdash; Turn 2D Blueprints into Interactive 3D Spatial Models**

PlanForge AI is an advanced AI-powered web application and college project prototype that analyzes 2D architectural blueprint drawings using Computer Vision (OpenCV, NumPy, and OCR) and procedurally extrudes them into interactive 3D house models using WebGL and Three.js.

---

## 🌟 Key Features

* **Landing Page**: Modern high-tech dark AI & architecture themed presentation.
* **Blueprint Upload**: Drag-and-drop support for PNG, JPG, JPEG, and PDF floor plans.
* **AI Computer Vision Pipeline**:
  * Edge detection & morphological opening/closing.
  * Line segment detection & collinear segment merging for exterior and interior walls.
  * Contour analysis for room polygon extraction and area calculations.
  * Feature recognition for door arc openings and window cutouts.
  * OCR text label extraction for room names ("Bedroom", "Kitchen") and dimension markers (`12' x 10'`).
* **Scale Calibration**: Auto-estimates scale ratio (pixels per foot) or allows manual calibration by entering a known wall dimension.
* **2D Structural Vector Editor**: Interactive HTML5 canvas showing blueprint vector paths, editable wall nodes, and room areas.
* **Procedural 3D Mesh Generator**: Extrudes 2D structural geometry into 3D walls, door frames, glass window panes, customizable floor material textures (Oak Hardwood, White Marble, Ceramic Tile, Carpet, Concrete), and ceiling slabs.
* **Advanced 3D House Editor**:
  * Transform Gizmos for translating, rotating, and resizing 3D walls, doors, windows, and rooms.
  * **3D Furniture Library**: Spawn 3D furniture models (Beds, Sofas, Dining Tables, Chairs, Kitchen Counters, Toilets, Wardrobes).
  * **3D Measurement Tool**: Click 2 points in the 3D viewport to draw dimension lines and calculate real-world distance in feet.
  * **Undo / Redo History Stack** & **Before/After Model Toggle**.
  * Live Property Panel with data binding.
* **Camera Modes**: Orbit View, Presets (Top, Front, Side, 3D Isometric), and First-Person Walkthrough Mode.
* **Demo Mode**: Built-in 1-click interactive demo with preloaded floor plan blueprints.
* **Multi-Format Export**: Export 3D models to **GLTF/GLB**, **OBJ**, **STL**, Structural JSON, and HD rendered PNG screenshots.
* **User Accounts & Database**: User registration, login, and project dashboard using SQLite.
* **Mandatory Professional Disclaimer**: Prominently displays safety & accuracy verification disclaimers.

---

## 🛠️ Technology Stack

* **Backend**: Python 3.13, Flask 3.1, Flask-SQLAlchemy, Flask-CORS, Werkzeug.
* **Computer Vision & AI**: OpenCV (`opencv-python-headless`), NumPy, Pillow, PyTesseract.
* **Frontend**: HTML5, CSS3 (Dark AI Architectural Theme), Vanilla JavaScript (ES6+).
* **3D Engine**: Three.js (WebGL), OrbitControls, TransformControls, OBJExporter, STLExporter, GLTFExporter.
* **Database**: SQLite.

---

## 📁 Project Structure

```text
PATCH ai/
│
├── backend/
│   ├── app.py                   # Flask Application Factory & Route Registration
│   ├── database.py              # SQLAlchemy Database Setup
│   ├── models.py                # Database Models (User, Project)
│   ├── routes/
│   │   ├── auth_routes.py       # Login / Register API endpoints
│   │   ├── project_routes.py    # Project CRUD API endpoints
│   │   ├── ai_routes.py         # Blueprint Upload, Analysis & Demo API
│   │   └── export_routes.py     # Structural JSON export API
│   ├── ai/
│   │   ├── preprocessor.py      # Image grayscale, thresholding & filtering
│   │   ├── wall_detector.py     # Hough lines & collinear segment merging
│   │   ├── room_detector.py     # Contour segmentation & room polygon extraction
│   │   ├── feature_detector.py  # Door openings & window placement
│   │   ├── ocr_engine.py        # Text label & dimension regex extraction
│   │   └── pipeline.py          # Master CV pipeline & visual overlay renderer
│   └── samples/
│       └── generate_samples.py  # Demo blueprint generator
│
├── frontend/
│   └── templates/
│       └── index.html           # Unified Single Page Application template
│
├── static/
│   ├── css/
│   │   └── style.css            # Dark AI + Architecture CSS styles
│   └── js/
│       ├── app.js               # Main App Controller & Toast notifications
│       ├── auth.js              # Authentication UI logic
│       ├── dashboard.js         # Project Dashboard grid manager
│       ├── upload.js            # File drag-and-drop & scale setup
│       ├── analysis.js          # AI Analysis progress & metrics display
│       ├── canvas2d.js          # Interactive HTML5 2D Floor Plan Canvas
│       ├── viewer3d.js          # Three.js 3D Procedural House Builder
│       ├── editor3d.js          # 3D Editor, Furniture Suite & Property Panel
│       └── exporter.js          # OBJ, STL, GLTF & Image exporter
│
├── uploads/                     # Uploaded blueprints & generated overlays
├── database/                    # SQLite database file (`blueprint3d.db`)
├── venv/                        # Python Virtual Environment
├── requirements.txt             # Python Package Dependencies
├── run.py                       # Server Startup Entrypoint
└── README.md                    # Detailed Documentation
```

---

## 🚀 Quick Start Guide for Windows (VS Code)

### Prerequisites
1. **Python 3.10+** installed on Windows.
2. **VS Code** with PowerShell terminal access.

---

### Step-by-Step Setup Commands (PowerShell / CMD in VS Code)

#### 1. Open VS Code Terminal
In VS Code, press `Ctrl + ~` to open the built-in PowerShell terminal inside the project directory:
```powershell
cd "c:\Users\ANANDH\OneDrive\Desktop\2d blue prints into 3d models"
```

#### 2. Create and Activate Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

#### 3. Install Required Dependencies
```powershell
pip install -r requirements.txt
```

#### 4. Run the Application
```powershell
python run.py
```

#### 5. Open in Web Browser
Open your web browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## ⚠️ Important Accuracy Notice

> **"AI-generated model — dimensions and structure should be verified by a qualified professional before construction."**
> 
> PATCH ai AI is designed as a visualization, design exploration, and educational college prototype. It should not replace official architectural engineering blueprints or structural safety inspections.
