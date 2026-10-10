import cv2
import numpy as np
import os
from PIL import Image

def load_and_preprocess_image(image_path):
    """
    Loads an image file (PNG, JPG, JPEG, BMP, etc.) or PDF page,
    converts it to grayscale, applies bilateral filtering, and returns
    original, grayscale, and binary thresholded images.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")

    # Check if PDF
    if image_path.lower().endswith('.pdf'):
        image = convert_pdf_to_image(image_path)
    else:
        image = cv2.imread(image_path)

    if image is None:
        # Fallback load using PIL
        pil_img = Image.open(image_path).convert('RGB')
        image = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    height, width = image.shape[:2]

    # Resize if extremely large to maintain fast processing
    max_dim = 2000
    if max(height, width) > max_dim:
        scale = max_dim / float(max(height, width))
        image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)
        height, width = image.shape[:2]

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Noise removal with bilateral filter (preserves wall edges)
    blurred = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)

    # Adaptive thresholding to convert to binary image
    binary = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 15, 4
    )

    # Morphological closing to fill small wall line breaks
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    return {
        'original': image,
        'gray': gray,
        'binary': closed,
        'width': width,
        'height': height
    }

def convert_pdf_to_image(pdf_path):
    """
    Converts PDF to cv2 image format.
    Falls back to pypdfium2, pdf2image, or PyMuPDF if available.
    """
    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(pdf_path)
        page = pdf[0]
        pil_image = page.render(scale=2).to_pil()
        return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    except Exception:
        pass

    try:
        from pdf2image import convert_from_path
        images = convert_from_path(pdf_path, first_page=1, last_page=1)
        if images:
            return cv2.cvtColor(np.array(images[0]), cv2.COLOR_RGB2BGR)
    except Exception:
        pass

    raise RuntimeError("PDF processing requires pypdfium2 or pdf2image. Please upload PNG/JPG blueprint.")
