import cv2
import numpy as np

def detect_walls(preprocessed_data):
    """
    Detects structural wall segments from preprocessed binary blueprint image.
    Returns list of wall segment dicts with start/end coordinates, thickness, and type.
    """
    binary = preprocessed_data['binary']
    height, width = preprocessed_data['height'], preprocessed_data['width']

    # Extract horizontal lines
    horiz_size = max(15, width // 40)
    horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (horiz_size, 1))
    horiz_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horiz_kernel)

    # Extract vertical lines
    vert_size = max(15, height // 40)
    vert_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, vert_size))
    vert_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vert_kernel)

    # Combine horizontal and vertical wall structures
    walls_mask = cv2.bitwise_or(horiz_lines, vert_lines)

    # Thick wall dilation to merge double-line wall boundaries
    dilation_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    walls_dilated = cv2.dilate(walls_mask, dilation_kernel, iterations=1)

    # Use Probabilistic Hough Transform to detect wall line segments
    min_line_len = max(20, min(width, height) // 30)
    max_line_gap = 15
    
    raw_lines = cv2.HoughLinesP(
        walls_dilated, rho=1, theta=np.pi/180, 
        threshold=40, minLineLength=min_line_len, maxLineGap=max_line_gap
    )

    walls = []
    if raw_lines is not None:
        lines_list = [tuple(map(int, line.ravel())) for line in raw_lines]
        merged_lines = merge_line_segments(lines_list, tolerance=12)
        
        # Determine main outer bounding box for exterior vs interior wall classification
        bounding_rect = [width * 0.05, height * 0.05, width * 0.95, height * 0.95]
        
        for idx, (x1, y1, x2, y2) in enumerate(merged_lines):
            length = np.hypot(x2 - x1, y2 - y1)
            if length < 15:
                continue

            # Classify as exterior if near outer border, else interior
            is_exterior = (
                abs(x1 - bounding_rect[0]) < 40 or abs(x2 - bounding_rect[0]) < 40 or
                abs(x1 - bounding_rect[2]) < 40 or abs(x2 - bounding_rect[2]) < 40 or
                abs(y1 - bounding_rect[1]) < 40 or abs(y2 - bounding_rect[1]) < 40 or
                abs(y1 - bounding_rect[3]) < 40 or abs(y2 - bounding_rect[3]) < 40
            )

            walls.append({
                'id': f'wall_{idx+1}',
                'start': [int(x1), int(y1)],
                'end': [int(x2), int(y2)],
                'length_px': float(length),
                'thickness_px': 12 if is_exterior else 8,
                'type': 'exterior' if is_exterior else 'interior'
            })

    return {
        'walls': walls,
        'walls_mask': walls_mask,
        'walls_dilated': walls_dilated
    }

def merge_line_segments(lines, tolerance=12):
    """
    Merges collinear and nearly overlapping line segments.
    """
    if not lines:
        return []

    # Standardize orientation (force horizontal/vertical snapping within 5 degrees)
    snapped = []
    for x1, y1, x2, y2 in lines:
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        if dx < tolerance:  # Vertical line
            x_avg = (x1 + x2) // 2
            snapped.append((x_avg, min(y1, y2), x_avg, max(y1, y2), 'V'))
        elif dy < tolerance:  # Horizontal line
            y_avg = (y1 + y2) // 2
            snapped.append((min(x1, x2), y_avg, max(x1, x2), y_avg, 'H'))
        else:
            snapped.append((x1, y1, x2, y2, 'D'))

    # Group horizontal lines by Y coordinate
    horiz_groups = {}
    vert_groups = {}
    others = []

    for x1, y1, x2, y2, orient in snapped:
        if orient == 'H':
            y_key = int(round(y1 / tolerance) * tolerance)
            horiz_groups.setdefault(y_key, []).append((x1, x2))
        elif orient == 'V':
            x_key = int(round(x1 / tolerance) * tolerance)
            vert_groups.setdefault(x_key, []).append((y1, y2))
        else:
            others.append((x1, y1, x2, y2))

    merged = []

    # Merge horizontal segments
    for y_key, intervals in horiz_groups.items():
        intervals.sort(key=lambda item: item[0])
        curr_start, curr_end = intervals[0]
        for start, end in intervals[1:]:
            if start <= curr_end + tolerance:
                curr_end = max(curr_end, end)
            else:
                merged.append((curr_start, y_key, curr_end, y_key))
                curr_start, curr_end = start, end
        merged.append((curr_start, y_key, curr_end, y_key))

    # Merge vertical segments
    for x_key, intervals in vert_groups.items():
        intervals.sort(key=lambda item: item[0])
        curr_start, curr_end = intervals[0]
        for start, end in intervals[1:]:
            if start <= curr_end + tolerance:
                curr_end = max(curr_end, end)
            else:
                merged.append((x_key, curr_start, x_key, curr_end))
                curr_start, curr_end = start, end
        merged.append((x_key, curr_start, x_key, curr_end))

    # Include diagonal lines
    merged.extend(others)

    return merged
