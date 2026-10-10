import os
from flask import Flask, render_template, send_from_directory, jsonify
from flask_cors import CORS
from backend.database import db
from backend.routes.auth_routes import auth_bp
from backend.routes.project_routes import project_bp
from backend.routes.ai_routes import ai_bp
from backend.routes.export_routes import export_bp

def create_app():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    template_folder = os.path.join(root_dir, 'frontend', 'templates')
    static_folder = os.path.join(root_dir, 'static')
    upload_folder = os.path.join(root_dir, 'uploads')

    app = Flask(
        __name__,
        template_folder=template_folder,
        static_folder=static_folder
    )

    app.config['SECRET_KEY'] = 'blueprint3d-ai-secret-key-2026-super-secure'
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(root_dir, 'database', 'blueprint3d.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = upload_folder

    os.makedirs(os.path.join(root_dir, 'database'), exist_ok=True)
    os.makedirs(upload_folder, exist_ok=True)

    CORS(app)
    db.init_app(app)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(project_bp, url_prefix='/api/projects')
    app.register_blueprint(ai_bp, url_prefix='/api/blueprint')
    app.register_blueprint(export_bp, url_prefix='/api/export')

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/uploads/<path:filename>')
    def serve_uploads(filename):
        return send_from_directory(upload_folder, filename)

    with app.app_context():
        db.create_all()
        # Generate initial sample images if not present
        sample_apartment = os.path.join(upload_folder, 'demo_apartment.png')
        if not os.path.exists(sample_apartment):
            try:
                from backend.samples.generate_samples import create_sample_blueprints
                create_sample_blueprints(upload_folder)
            except Exception as e:
                print("Sample generation notice:", e)

    return app
