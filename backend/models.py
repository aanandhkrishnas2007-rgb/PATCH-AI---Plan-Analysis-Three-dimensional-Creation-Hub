from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from backend.database import db
import json

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    projects = db.relationship('Project', backref='owner', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }

class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # allow guest projects
    name = db.Column(db.String(150), nullable=False, default='My 3D House Project')
    description = db.Column(db.Text, nullable=True)
    blueprint_filename = db.Column(db.String(255), nullable=True)
    thumbnail_url = db.Column(db.String(255), nullable=True)
    processed_image_url = db.Column(db.String(255), nullable=True)
    
    scale_ratio = db.Column(db.Float, default=20.0) # pixels per foot
    wall_height = db.Column(db.Float, default=10.0) # feet
    wall_thickness = db.Column(db.Float, default=0.5) # feet (6 inches)
    unit = db.Column(db.String(20), default='ft')

    _structural_json = db.Column('structural_json', db.Text, nullable=True)
    _edited_3d_state = db.Column('edited_3d_state', db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def structural_json(self):
        if self._structural_json:
            try:
                return json.loads(self._structural_json)
            except Exception:
                return {}
        return {}

    @structural_json.setter
    def structural_json(self, value):
        self._structural_json = json.dumps(value) if value is not None else None

    @property
    def edited_3d_state(self):
        if self._edited_3d_state:
            try:
                return json.loads(self._edited_3d_state)
            except Exception:
                return {}
        return {}

    @edited_3d_state.setter
    def edited_3d_state(self, value):
        self._edited_3d_state = json.dumps(value) if value is not None else None

    def to_dict(self):
        struct = self.structural_json
        rooms = struct.get('rooms', [])
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'blueprint_filename': self.blueprint_filename,
            'thumbnail_url': self.thumbnail_url,
            'processed_image_url': self.processed_image_url,
            'scale_ratio': self.scale_ratio,
            'wall_height': self.wall_height,
            'wall_thickness': self.wall_thickness,
            'unit': self.unit,
            'rooms_count': len(rooms),
            'structural_json': struct,
            'edited_3d_state': self.edited_3d_state,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
