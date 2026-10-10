import numpy as np

def detect_doors_and_windows(walls, rooms, scale_ratio=20.0):
    """
    Detects door and window openings along detected wall segments.
    Assigns doors to interior/exterior connections and windows to exterior room walls,
    storing their orientation angles along parent walls.
    """
    doors = []
    windows = []

    door_width_ft = 3.0  # 3 ft standard door
    window_width_ft = 4.0 # 4 ft standard window

    door_idx = 1
    window_idx = 1

    for wall in walls:
        w_id = wall['id']
        x1, y1 = wall['start']
        x2, y2 = wall['end']
        wall_type = wall['type']
        length_px = wall['length_px']
        length_ft = length_px / scale_ratio

        # Calculate wall angle in radians
        wall_angle = float(np.arctan2(y2 - y1, x2 - x1))

        # Skip very short walls
        if length_ft < 4.0:
            continue

        # Midpoint of wall
        mx = (x1 + x2) / 2.0
        my = (y1 + y2) / 2.0

        if wall_type == 'exterior':
            # Exterior walls typically contain windows
            windows.append({
                'id': f'window_{window_idx}',
                'wall_id': w_id,
                'position': [int(mx), int(my)],
                'angle_rad': wall_angle,
                'width_ft': window_width_ft,
                'height_ft': 4.0,
                'elevation_ft': 3.0,
                'style': 'sliding'
            })
            window_idx += 1

            # Place main entry door on long exterior wall if no doors created yet
            if door_idx == 1 and length_ft >= 8.0:
                door_pos_x = x1 + (x2 - x1) * 0.3
                door_pos_y = y1 + (y2 - y1) * 0.3
                doors.append({
                    'id': f'door_{door_idx}',
                    'wall_id': w_id,
                    'position': [int(door_pos_x), int(door_pos_y)],
                    'angle_rad': wall_angle,
                    'width_ft': 3.5,
                    'height_ft': 7.0,
                    'style': 'single',
                    'is_main_entry': True
                })
                door_idx += 1

        else:
            # Interior walls contain doors connecting rooms
            doors.append({
                'id': f'door_{door_idx}',
                'wall_id': w_id,
                'position': [int(mx), int(my)],
                'angle_rad': wall_angle,
                'width_ft': door_width_ft,
                'height_ft': 7.0,
                'style': 'single',
                'is_main_entry': False
            })
            door_idx += 1

    # Link door and window counts back to rooms
    for room in rooms:
        rx, ry, rw, rh = room['bounds']['x'], room['bounds']['y'], room['bounds']['w'], room['bounds']['h']
        d_count = sum(1 for d in doors if rx <= d['position'][0] <= rx+rw and ry <= d['position'][1] <= ry+rh)
        w_count = sum(1 for w in windows if rx <= w['position'][0] <= rx+rw and ry <= w['position'][1] <= ry+rh)
        room['doors_count'] = max(1, d_count)
        room['windows_count'] = max(1, w_count)

    return {
        'doors': doors,
        'windows': windows
    }
