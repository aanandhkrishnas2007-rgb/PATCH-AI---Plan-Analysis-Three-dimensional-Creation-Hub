from flask import Blueprint, request, jsonify, session
from backend.database import db
from backend.models import Project
from datetime import datetime

project_bp = Blueprint('projects', __name__)

@project_bp.route('', methods=['GET'])
def get_projects():
    user_id = session.get('user_id')
    # If logged in, filter by user_id, otherwise show guest/recent projects
    if user_id:
        projects = Project.query.filter_by(user_id=user_id).order_by(Project.updated_at.desc()).all()
    else:
        projects = Project.query.order_by(Project.updated_at.desc()).limit(10).all()

    return jsonify({
        'projects': [p.to_dict() for p in projects]
    }), 200

@project_bp.route('/<int:project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found.'}), 404
    return jsonify({'project': project.to_dict()}), 200

@project_bp.route('', methods=['POST'])
def create_project():
    data = request.get_json() or {}
    user_id = session.get('user_id')
    
    name = data.get('name', 'New Blueprint Project').strip()
    description = data.get('description', '')

    project = Project(
        user_id=user_id,
        name=name,
        description=description,
        structural_json=data.get('structural_json', {}),
        edited_3d_state=data.get('edited_3d_state', {})
    )
    db.session.add(project)
    db.session.commit()

    return jsonify({'project': project.to_dict()}), 201

@project_bp.route('/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found.'}), 404

    data = request.get_json() or {}
    
    if 'name' in data:
        project.name = data['name'].strip()
    if 'description' in data:
        project.description = data['description']
    if 'wall_height' in data:
        project.wall_height = float(data['wall_height'])
    if 'wall_thickness' in data:
        project.wall_thickness = float(data['wall_thickness'])
    if 'scale_ratio' in data:
        project.scale_ratio = float(data['scale_ratio'])
    if 'structural_json' in data:
        project.structural_json = data['structural_json']
    if 'edited_3d_state' in data:
        project.edited_3d_state = data['edited_3d_state']

    project.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'project': project.to_dict()}), 200

@project_bp.route('/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found.'}), 404

    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted successfully.'}), 200
