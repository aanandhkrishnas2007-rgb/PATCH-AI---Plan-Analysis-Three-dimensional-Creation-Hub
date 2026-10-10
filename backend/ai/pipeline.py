import os
import cv2
import numpy as np
from backend.ai.preprocessor import load_and_preprocess_image
from backend.ai.wall_detector import detect_walls
from backend.ai.room_detector import detect_rooms
from backend.ai.feature_detector import detect_doors_and_windows
from backend.ai.ocr_engine import extract_text_and_dimensions

def process_blueprint(image_path, custom_scale=None, output_dir=None):
    """
    Main AI Computer Vision Pipeline for Blueprint3D AI.
    Processes 2D floor plan image and produces a structured 2D/3D house data graph
    and a visual analysis overlay image.
    """
    # 1. Preprocessing
    preprocessed = load_and_preprocess_image(image_path)
    img_orig = preprocessed['original'].copy()
    height, width = preprocessed['height'], preprocessed['width']

    # 2. Wall Detection
    wall_data = detect_walls(preprocessed)
    walls = wall_data['walls']

    # Default initial scale: assuming 1 foot = ~20 pixels on average 1000px blueprint
    initial_scale = custom_scale if custom_scale and custom_scale > 0 else 20.0

    # 3. OCR & Scale Calibration
    ocr_results = extract_text_and_dimensions(preprocessed, scale_ratio=initial_scale)
    scale_ratio = custom_scale if custom_scale else ocr_results.get('estimated_scale', initial_scale)

    # 4. Room Detection
    rooms = detect_rooms(preprocessed, wall_data, scale_ratio=scale_ratio)

    # Match OCR text labels to nearest room centroid if available
    if ocr_results['labels']:
        for label in ocr_results['labels']:
            lx, ly = label['bounds'][0], label['bounds'][1]
            text = label['text'].title()
            # Find closest room
            best_room = min(rooms, key=lambda r: np.hypot(r['centroid'][0]-lx, r['centroid'][1]-ly), default=None)
            if best_room and len(text) > 3:
                best_room['name'] = text

    # 5. Door & Window Feature Detection
    feature_data = detect_doors_and_windows(walls, rooms, scale_ratio=scale_ratio)
    doors = feature_data['doors']
    windows = feature_data['windows']

    # 6. Generate Visual Overlay Image
    overlay_img = generate_analysis_overlay(
        img_orig, walls, rooms, doors, windows, scale_ratio
    )

    # Save processed image
    processed_filename = f"processed_{os.path.basename(image_path)}"
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        save_path = os.path.join(output_dir, processed_filename)
        cv2.imwrite(save_path, overlay_img)

    return {
        'success': True,
        'image_size': {'width': width, 'height': height},
        'scale_ratio': round(scale_ratio, 2),
        'scale_is_estimated': custom_scale is None,
        'summary': {
            'walls': len(walls),
            'rooms': len(rooms),
            'doors': len(doors),
            'windows': len(windows)
        },
        'rooms': rooms,
        'walls': walls,
        'doors': doors,
        'windows': windows,
        'ocr_data': {
            'ocr_available': ocr_results['ocr_available'],
            'detected_labels': [l['text'] for l in ocr_results['labels']],
            'detected_dimensions': [d['text'] for d in ocr_results['dimensions']]
        },
        'processed_image_filename': processed_filename
    }

def generate_analysis_overlay(orig_img, walls, rooms, doors, windows, scale_ratio):
    """
    Draws colorful annotated blueprint overlay showing walls, rooms, doors, and windows.
    """
    overlay = orig_img.copy()
    alpha_layer = orig_img.copy()

    # Room Colors (Pastel Tint)
    room_colors = [
        (230, 216, 173), (218, 230, 173), (173, 230, 216), 
        (173, 204, 230), (216, 173, 230), (230, 173, 196)
    ]

    # Draw Room Tint & Centroid Labels
    for idx, room in enumerate(rooms):
        rx, ry, rw, rh = room['bounds']['x'], room['bounds']['y'], room['bounds']['w'], room['bounds']['h']
        color = room_colors[idx % len(room_colors)]
        
        # Fill room bounding rect
        cv2.rectangle(alpha_layer, (rx, ry), (rx+rw, ry+rh), color, -1)
        cv2.rectangle(overlay, (rx, ry), (rx+rw, ry+rh), (180, 180, 180), 1)

        # Draw Room Name & Area Text
        cx, cy = room['centroid']
        name_text = room['name']
        dim_text = f"{room['dimensions_ft']['width']}' × {room['dimensions_ft']['length']}' ({room['area_sqft']} sq.ft)"

        cv2.putText(overlay, name_text, (cx - 40, cy - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2)
        cv2.putText(overlay, dim_text, (cx - 55, cy + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (80, 80, 80), 1)

    # Blend room semi-transparent colors (30% opacity)
    cv2.addWeighted(alpha_layer, 0.35, overlay, 0.65, 0, overlay)

    # Draw Walls (Cyan for exterior, Deep Blue for interior)
    for wall in walls:
        x1, y1 = wall['start']
        x2, y2 = wall['end']
        color = (235, 170, 0) if wall['type'] == 'exterior' else (180, 80, 0) # BGR
        thickness = wall['thickness_px']
        cv2.line(overlay, (x1, y1), (x2, y2), color, thickness)

    # Draw Doors (Bright Green)
    for door in doors:
        dx, dy = door['position']
        cv2.circle(overlay, (dx, dy), 8, (0, 220, 100), -1)
        cv2.putText(overlay, "D", (dx-4, dy+4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    # Draw Windows (Amber / Yellow)
    for win in windows:
        wx, wy = win['position']
        cv2.rectangle(overlay, (wx-8, wy-8), (wx+8, wy+8), (0, 180, 255), -1)
        cv2.putText(overlay, "W", (wx-4, wy+4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)

    # Header Banner
    cv2.rectangle(overlay, (0, 0), (overlay.shape[1], 35), (20, 24, 33), -1)
    banner_txt = f"PlanForge AI -- Detected: {len(walls)} Walls | {len(rooms)} Rooms | {len(doors)} Doors | {len(windows)} Windows"
    cv2.putText(overlay, banner_txt, (15, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 230, 255), 1)

    return overlay
