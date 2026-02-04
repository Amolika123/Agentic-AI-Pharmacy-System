import easyocr
import re
import csv
import sys
import os

# Path to the uploaded image
IMAGE_PATH = r"C:/Users/amoli/.gemini/antigravity/brain/713c828f-45ac-43b6-8e38-46d0e622e328/uploaded_media_1770211338051.png"

# Mock Inventory (subset for testing)
INVENTORY = [
    {"name": "Paracetamol", "generic_name": "Acetaminophen", "stock_quantity": "100"},
    {"name": "Metformin", "generic_name": "Metformin", "stock_quantity": "200"},
    {"name": "Amoxicillin", "generic_name": "Amoxicillin", "stock_quantity": "50"},
]

def match_medicines_mock(extracted_medicines):
    matched = []
    for med in extracted_medicines:
        extracted_name = (med.get("name") or "").lower().strip()
        best_match = None
        
        for inv in INVENTORY:
            if extracted_name in inv["name"].lower() or inv["name"].lower() in extracted_name:
                best_match = inv
                break
            if extracted_name in inv["generic_name"].lower() or inv["generic_name"].lower() in extracted_name:
                best_match = inv
                break
        
        if best_match:
            med["matched"] = True
            med["inventory_name"] = best_match["name"]
        else:
            med["matched"] = False
        matched.append(med)
    return matched

def parse_extracted_text(lines):
    extracted_medicines = []
    dosage_pattern = re.compile(r'(\d+(?:[\.,]\d+)?\s*(?:mg|ml|g|mcg|iu|tablets|capsules|tab|cap))', re.IGNORECASE)
    
    # Pre-match known medicines
    candidates = [{"name": line["text"]} for line in lines]
    matched_candidates = match_medicines_mock(candidates)
    
    for i, candidate in enumerate(matched_candidates):
        line_text = lines[i]["text"]
        
        if candidate.get("matched"):
            dosage_match = dosage_pattern.search(line_text)
            dosage = dosage_match.group(1) if dosage_match else None
            
            # Check next line for dosage if not found
            if not dosage and i + 1 < len(lines):
                 next_line = lines[i+1]["text"]
                 dosage_match = dosage_pattern.search(next_line)
                 if dosage_match:
                     dosage = dosage_match.group(1)

            extracted_medicines.append({
                "name": candidate["inventory_name"],
                "original_text": line_text,
                "dosage": dosage
            })
        elif dosage_pattern.search(line_text):
            dosage_match = dosage_pattern.search(line_text)
            name_part = line_text.replace(dosage_match.group(0), "").strip()
            if len(name_part) > 3:
                extracted_medicines.append({
                    "name": name_part,
                    "dosage": dosage_match.group(1),
                    "matched": False
                })
    return extracted_medicines

def verify_image():
    if not os.path.exists(IMAGE_PATH):
        print(f"❌ Image not found at {IMAGE_PATH}")
        return

    print(f"Processing image: {IMAGE_PATH}")
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    
    print("Reading text...")
    results = reader.readtext(IMAGE_PATH)
    
    processed_lines = []
    print("\n--- Raw OCR Output ---")
    for bbox, text, prob in results:
        if prob > 0.3:
            print(f"Text: '{text}' (Confidence: {prob:.2f})")
            processed_lines.append({"text": text, "confidence": prob})
            
    print("\n--- Parsed Medicines ---")
    medicines = parse_extracted_text(processed_lines)
    
    if medicines:
        for med in medicines:
            print(f"✅ Found: {med['name']} | Dosage: {med.get('dosage')} | Original: '{med.get('original_text')}'")
    else:
        print("⚠️ No structured medicines passed strict filtering.")

if __name__ == "__main__":
    verify_image()
