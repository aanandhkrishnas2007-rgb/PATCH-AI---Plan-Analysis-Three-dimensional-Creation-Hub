import cv2
import numpy as np
import os

def create_sample_blueprints(output_dir):
    os.makedirs(output_dir, exist_ok=True)

    # 1. Demo Modern Apartment (800x600)
    w, h = 800, 600
    img = np.ones((h, w, 3), dtype=np.uint8) * 245  # Blueprint light paper background

    # Blueprint Grid Lines
    for x in range(0, w, 20):
        cv2.line(img, (x, 0), (x, h), (230, 230, 235), 1)
    for y in range(0, h, 20):
        cv2.line(img, (0, y), (w, y), (230, 230, 235), 1)

    # Exterior Wall Boundary (Rect)
    ex_left, ex_top, ex_right, ex_bottom = 80, 80, 720, 520
    cv2.rectangle(img, (ex_left, ex_top), (ex_right, ex_bottom), (20, 20, 20), 12)

    # Interior Divider Walls
    # Vertical wall separating Left Bedroom/Kitchen from Right Living Room
    cv2.line(img, (400, ex_top), (400, ex_bottom), (30, 30, 30), 8)
    # Horizontal wall separating Left Top Bedroom from Left Bottom Kitchen
    cv2.line(img, (ex_left, 300), (400, 300), (30, 30, 30), 8)
    # Horizontal wall separating Right Top Living Room from Right Bottom Bathroom & Master Bedroom
    cv2.line(img, (400, 320), (ex_right, 320), (30, 30, 30), 8)
    # Vertical divider for Right Bottom Bathroom & Master Bedroom
    cv2.line(img, (580, 320), (580, ex_bottom), (30, 30, 30), 8)

    # Door Openings (white cutouts with arcs)
    # Bedroom Door
    cv2.rectangle(img, (392, 220), (408, 280), (245, 245, 245), -1)
    cv2.ellipse(img, (400, 220), (40, 40), 0, 0, 90, (50, 50, 50), 2)

    # Kitchen Door
    cv2.rectangle(img, (392, 360), (408, 420), (245, 245, 245), -1)
    cv2.ellipse(img, (400, 420), (40, 40), 0, 180, 270, (50, 50, 50), 2)

    # Bathroom Door
    cv2.rectangle(img, (520, 312), (570, 328), (245, 245, 245), -1)

    # Main Entry Door
    cv2.rectangle(img, (76, 380), (84, 440), (245, 245, 245), -1)
    cv2.ellipse(img, (80, 380), (45, 45), 0, 90, 180, (50, 50, 50), 2)

    # Windows (Double Line Rectangles on exterior walls)
    cv2.rectangle(img, (200, 74), (280, 86), (255, 255, 255), -1)
    cv2.rectangle(img, (200, 74), (280, 86), (40, 40, 40), 2)

    cv2.rectangle(img, (500, 74), (620, 86), (255, 255, 255), -1)
    cv2.rectangle(img, (500, 74), (620, 86), (40, 40, 40), 2)

    cv2.rectangle(img, (714, 150), (726, 230), (255, 255, 255), -1)
    cv2.rectangle(img, (714, 150), (726, 230), (40, 40, 40), 2)

    # Room Labels & Dimensions Text
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(img, "BEDROOM 1", (180, 180), font, 0.65, (30, 30, 30), 2)
    cv2.putText(img, "16 ft x 11 ft", (185, 210), font, 0.45, (80, 80, 80), 1)

    cv2.putText(img, "KITCHEN", (190, 400), font, 0.65, (30, 30, 30), 2)
    cv2.putText(img, "16 ft x 11 ft", (195, 430), font, 0.45, (80, 80, 80), 1)

    cv2.putText(img, "LIVING ROOM", (480, 180), font, 0.75, (30, 30, 30), 2)
    cv2.putText(img, "16 ft x 12 ft", (500, 210), font, 0.45, (80, 80, 80), 1)

    cv2.putText(img, "BATH", (460, 410), font, 0.55, (30, 30, 30), 2)
    cv2.putText(img, "9 ft x 10 ft", (455, 435), font, 0.4, (80, 80, 80), 1)

    cv2.putText(img, "MASTER BED", (600, 410), font, 0.55, (30, 30, 30), 2)
    cv2.putText(img, "7 ft x 10 ft", (600, 435), font, 0.4, (80, 80, 80), 1)

    # Title Stamp
    cv2.rectangle(img, (600, 490), (715, 515), (200, 200, 200), -1)
    cv2.putText(img, "SCALE 1:50", (615, 508), font, 0.4, (10, 10, 10), 1)

    apartment_path = os.path.join(output_dir, 'demo_apartment.png')
    cv2.imwrite(apartment_path, img)

    # 2. Demo Luxury Villa (800x600)
    img_v = np.ones((h, w, 3), dtype=np.uint8) * 248
    # Grid
    for x in range(0, w, 20):
        cv2.line(img_v, (x, 0), (x, h), (235, 235, 240), 1)
    for y in range(0, h, 20):
        cv2.line(img_v, (0, y), (w, y), (235, 235, 240), 1)

    # Outer wall
    cv2.rectangle(img_v, (60, 60), (740, 540), (15, 15, 15), 14)

    # Interior walls
    cv2.line(img_v, (350, 60), (350, 540), (25, 25, 25), 8)
    cv2.line(img_v, (60, 280), (350, 280), (25, 25, 25), 8)
    cv2.line(img_v, (350, 300), (740, 300), (25, 25, 25), 8)
    cv2.line(img_v, (550, 300), (550, 540), (25, 25, 25), 8)

    # Text
    cv2.putText(img_v, "GREAT ROOM", (120, 160), font, 0.7, (20, 20, 20), 2)
    cv2.putText(img_v, "14 ft x 11 ft", (130, 190), font, 0.45, (80, 80, 80), 1)

    cv2.putText(img_v, "DINING & KITCHEN", (80, 390), font, 0.6, (20, 20, 20), 2)
    cv2.putText(img_v, "14 ft x 13 ft", (110, 420), font, 0.45, (80, 80, 80), 1)

    cv2.putText(img_v, "PRIMARY SUITE", (450, 160), font, 0.7, (20, 20, 20), 2)
    cv2.putText(img_v, "19 ft x 12 ft", (470, 190), font, 0.45, (80, 80, 80), 1)

    cv2.putText(img_v, "GUEST BED", (380, 410), font, 0.55, (20, 20, 20), 2)
    cv2.putText(img_v, "10 ft x 12 ft", (390, 435), font, 0.4, (80, 80, 80), 1)

    cv2.putText(img_v, "GARAGE", (590, 410), font, 0.6, (20, 20, 20), 2)
    cv2.putText(img_v, "9 ft x 12 ft", (600, 435), font, 0.4, (80, 80, 80), 1)

    villa_path = os.path.join(output_dir, 'demo_villa.png')
    cv2.imwrite(villa_path, img_v)

    print("Sample blueprint images generated successfully.")

if __name__ == '__main__':
    create_sample_blueprints(os.path.join(os.path.dirname(__file__), '../../uploads'))
