import json
from flask import Blueprint, jsonify, make_response, request, send_file
from backend.models import Project
import io

export_bp = Blueprint('export', __name__)

@export_bp.route('/json/<int:project_id>', methods=['GET'])
def export_json(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found.'}), 404

    data = project.to_dict()
    response_data = json.dumps(data, indent=2)

    buf = io.BytesIO()
    buf.write(response_data.encode('utf-8'))
    buf.seek(0)

    return send_file(
        buf,
        mimetype='application/json',
        as_attachment=True,
        download_name=f"{project.name.lower().replace(' ', '_')}_structure.json"
    )
