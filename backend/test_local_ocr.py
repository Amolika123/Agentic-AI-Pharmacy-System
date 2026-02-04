import easyocr
import re
import csv
from typing import List, Dict

# Mock Inventory
INVENTORY = [
    {"name": "Paracetamol", "generic_name": "Acetaminophen", "stock_quantity": "100"},
    {"name": "Amoxicillin", "generic_name": "Amoxicillin", "stock_quantity": "50"},
    {"name": "Metformin", "generic_name": "Metformin", "stock_quantity": "200"},
    {"name": "Ibuprofen", "generic_name": "Ibuprofen", "stock_quantity": "80"},
    {"name": "Cetirizine", "generic_name": "Cetirizine", "stock_quantity": "150"}
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
        
        if best_match:
            med["matched"] = True
            med["inventory_name"] = best_match["name"]
        else:
            med["matched"] = False
        matched.append(med)
    return matched

def parse_extracted_text(lines: List[Dict]) -> List[Dict]:
    print("\n--- Parsing Lines ---")
    extracted_medicines = []
    
    dosage_pattern = re.compile(r'(\d+(?:[\.,]\d+)?\s*(?:mg|ml|g|mcg|iu|tablets|capsules|tab|cap))', re.IGNORECASE)
    
    # Pre-match known medicines
    candidates = [{"name": line["text"]} for line in lines]
    matched_candidates = match_medicines_mock(candidates)
    
    for i, candidate in enumerate(matched_candidates):
        line_text = lines[i]["text"]
        print(f"Line {i}: '{line_text}' | Match: {candidate.get('inventory_name') if candidate.get('matched') else 'No'}")
        
        if candidate.get("matched"):
            # Look for dosage
            dosage_match = dosage_pattern.search(line_text)
            dosage = dosage_match.group(1) if dosage_match else None
            
            extracted_medicines.append({
                "name": candidate["inventory_name"],
                "original_text": line_text,
                "dosage": dosage
            })
        elif dosage_pattern.search(line_text):
            # Heuristic match
            dosage_match = dosage_pattern.search(line_text)
            name_part = line_text.replace(dosage_match.group(0), "").strip()
            if len(name_part) > 3:
                extracted_medicines.append({
                    "name": name_part,
                    "dosage": dosage_match.group(1),
                    "matched": False
                })
                
    return extracted_medicines

def test_ocr():
    print("Initializing Reader...")
    reader = easyocr.Reader(['en'], gpu=False)
    
    # Create a dummy image with text (since we can't easily upload one to this environment)
    # We will just verify logic here using MOCK OCR results to test the parser
    # and separately test reader instantiation
    
    print("Reader initialized successfully.")
    
    # Mock OCR Results (Simulating a prescription)
    mock_ocr_results = [
        ([0,0], "Dr. Smith", 0.9),
        ([0,0], "Paracetamol 500mg", 0.95),
        ([0,0], "Twice daily", 0.8),
        ([0,0], "Amoxicillin", 0.92),
        ([0,0], "250mg 3 times a day", 0.88),
        ([0,0], "UnknownMed 10mg", 0.7)
    ]
    
    processed_lines = []
    for bbox, text, prob in mock_ocr_results:
        processed_lines.append({"text": text, "confidence": prob})
        
    results = parse_extracted_text(processed_lines)
    
    print("\n--- Extracted Medicines ---")
    import json
    print(json.dumps(results, indent=2))
    
    assert len(results) >= 2, "Should find at least Paracetamol and Amoxicillin"
    print("\n✅ Verification Passed!")

if __name__ == "__main__":
    test_ocr()
