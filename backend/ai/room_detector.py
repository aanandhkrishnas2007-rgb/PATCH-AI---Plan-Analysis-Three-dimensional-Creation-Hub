import cv2
import numpy as np

DEFAULT_ROOM_NAMES = [
    "Living Room", "Master Bedroom", "Bedroom 2", "Kitchen",
    "Bathroom 1", "Dining Room", "Hallway", "Balcony", "Bathroom 2", "Store Room"
]

def detect_rooms(preprocessed_data, wall_data, scale_ratio=20.0):
    """
    Detects room regions by finding enclosed non-wall contours in the blueprint.
    Calculates room dimensions, area, centroids, and default names.
    """
    walls_dilated = wall_data['walls_dilated']
    height, width = preprocessed_data['height'], preprocessed_data['width']

    # Invert wall mask so enclosed room space becomes white foreground
    inverted_walls = cv2.bitwise_not(walls_dilated)

    # Clear border noise (prevent outer page frame from connecting to rooms)
    cv2.rectangle(inverted_walls, (0, 0), (width-1, height-1), 0, thickness=10)

    # Find contours of room spaces
    contours, hierarchy = cv2.findContours(
        inverted_walls, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE
    )

    rooms = []
    min_room_area = (width * height) * 0.005  # minimum 0.5% of total blueprint area
    max_room_area = (width * height) * 0.70   # exclude overall house outer perimeter

    name_idx = 0
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_room_area or area > max_room_area:
            continue

        x, y, w, h = cv2.boundingRect(contour)

        # Skip thin rectangular noise contours (e.g., border margins)
        aspect_ratio = w / float(h)
        if aspect_ratio < 0.15 or aspect_ratio > 7.0:
            continue

        # Calculate centroid
        M = cv2.moments(contour)
        if M['m00'] != 0:
            cx = int(M['m10'] / M['m00'])
            cy = int(M['m01'] / M['m00'])
        else:
            cx, cy = x + w // 2, y + h // 2

        # Convert dimensions from pixels to feet
        width_ft = round(w / scale_ratio, 1)
        length_ft = round(h / scale_ratio, 1)
        area_sqft = round(width_ft * length_ft, 1)

        name = DEFAULT_ROOM_NAMES[name_idx % len(DEFAULT_ROOM_NAMES)]
        name_idx += 1

        # Calculate polygon points simplified for 2D/3D renderer
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx_poly = cv2.approxPolyDP(contour, epsilon, True)
        poly_pts = [[int(pt[0][0]), int(pt[0][1])] for pt in approx_poly]

        rooms.append({
            'id': f'room_{len(rooms)+1}',
            'name': name,
            'bounds': {'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h)},
            'centroid': [cx, cy],
            'polygon': poly_pts,
            'dimensions_ft': {'width': width_ft, 'length': length_ft},
            'area_sqft': area_sqft,
            'doors_count': 1,
            'windows_count': 1
        })

    # Sort rooms from top-left to bottom-right for clean ordering
    rooms.sort(key=lambda r: (r['bounds']['y'], r['bounds']['x']))
    
    # Re-assign clean IDs after sorting
    for idx, r in enumerate(rooms):
        r['id'] = f'room_{idx+1}'

    return rooms
