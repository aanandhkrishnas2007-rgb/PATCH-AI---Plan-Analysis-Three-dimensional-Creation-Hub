import re

def extract_text_and_dimensions(preprocessed_data, scale_ratio=20.0):
    """
    Runs OCR on the blueprint image to extract text labels (e.g. "Bedroom", "Kitchen")
    and dimension numbers (e.g. "12' x 10'").
    Gracefully handles environment where pytesseract or Tesseract binary is absent.
    """
    detected_labels = []
    detected_dimensions = []
    ocr_available = False

    try:
        import pytesseract

        gray = preprocessed_data['gray']
        
        # Use Tesseract to get image data with bounding boxes
        data = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)
        ocr_available = True

        n_boxes = len(data['text'])
        for i in range(n_boxes):
            text = data['text'][i].strip()
            conf = float(data['conf'][i])
            if conf > 30 and len(text) > 2:
                x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                
                # Check if dimension match (e.g. 12'x10', 12x10, 15ft x 10ft)
                dim_match = re.search(r'(\d{1,2})\s*(?:[\'\′]|ft)?\s*[xX×]\s*(\d{1,2})\s*(?:[\'\′]|ft)?', text)
                if dim_match:
                    length_ft = float(dim_match.group(1))
                    width_ft = float(dim_match.group(2))
                    detected_dimensions.append({
                        'text': text,
                        'bounds': [x, y, w, h],
                        'length_ft': length_ft,
                        'width_ft': width_ft,
                        'estimated_pixels_per_foot': max(w, h) / max(length_ft, width_ft)
                    })
                else:
                    detected_labels.append({
                        'text': text,
                        'confidence': conf,
                        'bounds': [x, y, w, h]
                    })

    except Exception:
        # Tesseract binary not configured or missing, fall back to geometry heuristics
        ocr_available = False

    # Auto-estimate scale ratio if dimension text was found
    estimated_scale = scale_ratio
    if detected_dimensions:
        scales = [d['estimated_pixels_per_foot'] for d in detected_dimensions if d['estimated_pixels_per_foot'] > 5]
        if scales:
            estimated_scale = float(sum(scales) / len(scales))

    return {
        'ocr_available': ocr_available,
        'labels': detected_labels,
        'dimensions': detected_dimensions,
        'estimated_scale': round(estimated_scale, 2)
    }
