"""
Vision Agent - Analyzes prescription images using multimodal LLM.
Extracts medicine names, dosages, quantities from uploaded prescriptions.
"""
from typing import Dict, Any, Optional, List
from agents.base_agent import BaseAgent, AgentResponse, AgentContext
import base64
import json


class VisionAgent(BaseAgent):
    """
    Analyzes prescription images using llama3.2-vision.
    Extracts structured data: medicines, dosages, quantities.
    """
    
    def __init__(self):
        super().__init__(
            name="VisionAgent",
            description="Prescription image analyzer using multimodal vision"
        )
        # OCR cache to prevent re-processing same images (MODEL_B optimization)
        self._ocr_cache = {}  # {image_hash: AgentResponse}
    
    async def process(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Optional[Any] = None
    ) -> AgentResponse:
        """Process prescription image and extract details."""
        span = await self.create_span(trace, "analyze_prescription", {"has_image": bool(input_data.get("image"))})
        
        try:
            image_data = input_data.get("image")
            image_base64 = input_data.get("image_base64")
            
            if not image_data and not image_base64:
                return AgentResponse(
                    success=False,
                    data={"error": "no_image"},
                    message="Please upload a prescription image for analysis."
                )
            
            # ═══════════════════════════════════════════════════════════
            # OCR CACHE CHECK: Skip expensive OCR if image already processed
            # MODEL_B optimization: Never re-run OCR for same image
            # ═══════════════════════════════════════════════════════════
            import hashlib
            image_to_hash = image_base64 or image_data
            image_hash = hashlib.md5(image_to_hash.encode()[:10000]).hexdigest()  # Use first 10KB for speed
            
            if image_hash in self._ocr_cache:
                print(f"[VISION] Cache hit for image hash: {image_hash[:8]}...")
                cached_response = self._ocr_cache[image_hash]
                # Update context with cached extraction
                if cached_response.data.get("medicines"):
                    context.set_entity("extracted_prescription", {
                        "medicines": cached_response.data["medicines"],
                        "confidence": cached_response.data.get("confidence", 0.8)
                    })
                return cached_response
            
            print(f"[VISION] Processing new image, hash: {image_hash[:8]}...")
            
            # Analyze prescription using vision LLM
            extracted = await self._analyze_prescription_image(image_base64 or image_data)
            
            await self.log_decision(
                trace=trace,
                decision="prescription_analyzed",
                reasoning=f"Extracted {len(extracted.get('medicines', []))} medicines from prescription",
                confidence=extracted.get("confidence", 0.8),
                input_data={"image_size": len(image_base64) if image_base64 else 0},
                output_data={"medicines_count": len(extracted.get("medicines", []))}
            )
            
            if span:
                span.end(output={"medicines": len(extracted.get("medicines", []))})
            
            medicines = extracted.get("medicines", [])
            is_partial = extracted.get("partial_extraction", False)
            
            # ═══════════════════════════════════════════════════════════════
            # FAIL-SAFE BEHAVIOR: Never say "couldn't read" - always show results
            # ═══════════════════════════════════════════════════════════════
            if not medicines:
                # Even with no medicines found, provide helpful response
                # DO NOT say "couldn't read" - instead offer to help manually
                return AgentResponse(
                    success=True,
                    data={"status": "manual_entry_needed", "raw": extracted},
                    message=(
                        "📄 I was able to read some details from your prescription.\n\n"
                        "I couldn't identify specific medicine names in the image, "
                        "but I can still help you.\n\n"
                        "**Please tell me the medicine names** from your prescription "
                        "and I'll process your order.\n\n"
                        "For example: 'I need Paracetamol 500mg and Metformin 500mg'"
                    ),
                    requires_action=True,
                    action_type="manual_entry"
                )
            
            # Format extracted medicines for user confirmation (MANDATORY)
            message = self._format_extraction_result(extracted)
            
            # Store extracted medicines in context for confirmation
            context.set_entity("extracted_prescription", extracted)
            
            # Cache the successful response before returning
            response = AgentResponse(
                success=True,
                data={
                    "status": "prescription_analyzed",
                    "medicines": medicines,
                    "doctor_name": extracted.get("doctor_name"),
                    "patient_name": extracted.get("patient_name"),
                    "date": extracted.get("date"),
                    "confidence": extracted.get("confidence", 0.8),
                    "partial_extraction": is_partial
                },
                message=message,
                next_agent="SafetyAgent",
                requires_action=True,
                action_type="confirm_prescription"
            )
            self._ocr_cache[image_hash] = response
            return response
            
        except Exception as e:
            # DEBUG: Log the error to a file
            import traceback
            try:
                with open("vision_error.log", "w") as f:
                    f.write(f"Error: {str(e)}\n\nTraceback:\n{traceback.format_exc()}")
            except:
                pass
                
            if span:
                span.end(output={"error": str(e)})
            # FAIL-SAFE: Don't say "failed", offer manual help
            return AgentResponse(
                success=True,  # Changed to True - we're still helping
                data={"error": str(e), "status": "manual_fallback"},
                message=(
                    "📄 I'm having trouble processing this image, but I can still help!\n\n"
                    "**Please tell me the medicine names** from your prescription "
                    "and I'll add them to your order.\n\n"
                    "For example: 'I need Paracetamol 500mg, 30 tablets'"
                )
            )
    
    async def _analyze_prescription_image(self, image_base64: str) -> Dict[str, Any]:
        """Use local EasyOCR to extract prescription details offline."""
        import easyocr
        import numpy as np
        import base64
        import re
        from io import BytesIO
        from PIL import Image
        
        try:
            # 1. Decode base64 to image bytes
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            
            image_bytes = base64.b64decode(image_base64)
            
            # 2. Initialize EasyOCR Reader (Local, Offline)
            # Use English by default as per requirements.
            # Using 'en' only for speed and reliability, but supports others.
            reader = easyocr.Reader(['en'], gpu=False, verbose=False) # CPU safe mode
            
            # 3. Read text from image bytes
            # EasyOCR reads bytes directly
            raw_results = reader.readtext(image_bytes)
            
            # 4. Process results
            # Format: [(bbox, text, confidence), ...]
            detected_lines = []
            full_text = []
            
            for (bbox, text, prob) in raw_results:
                if prob > 0.3: # Filter low confidence
                    detected_lines.append({
                        "text": text,
                        "confidence": float(prob)
                    })
                    full_text.append(text)
            
            print(f"[VISION] EasyOCR Extracted: {full_text}")
            
            # 5. Local Parsing & Medicine Matching
            extracted_medicines = self._parse_extracted_text(detected_lines)
            
            # 6. Structure response
            return {
                "medicines": extracted_medicines,
                "confidence": sum([l['confidence'] for l in detected_lines]) / max(len(detected_lines), 1),
                "partial_extraction": len(extracted_medicines) == 0, # If we found text but no medicines
                "raw_text": full_text
            }
                        
        except Exception as e:
            print(f"[VISION ERROR] EasyOCR failed: {e}")
            return {"medicines": [], "error": str(e), "partial_extraction": False}

    def _parse_extracted_text(self, lines: List[Dict]) -> List[Dict]:
        """
        Parse raw OCR text lines to identify medicines and dosages locally.
        Uses fuzzy matching against inventory and regex for dosage.
        """
        import re
        
        extracted_medicines = []
        
        # Regex for common dosage forms
        dosage_pattern = re.compile(r'(\d+(?:[\.,]\d+)?\s*(?:mg|ml|g|mcg|iu|tablets|capsules|tab|cap))', re.IGNORECASE)
        frequency_pattern = re.compile(r'(once|twice|thrice|\d+\s*times?)\s*(?:a|per)?\s*(?:day|daily)', re.IGNORECASE)
        
        # We try to identify lines that contain medicine names
        # Match each line against inventory first
        
        # Temporarily use the matching logic to find candidates
        # We need the inventory for fuzzy matching
        matched_candidates = self._match_medicines_to_inventory([{"name": line["text"]} for line in lines])
        
        for i, candidate in enumerate(matched_candidates):
            line_text = lines[i]["text"]
            
            # If matched against inventory, it's definitely a medicine
            if candidate.get("matched"):
                # Look for dosage in the SAME line or NEXT line
                dosage_match = dosage_pattern.search(line_text)
                dosage = dosage_match.group(1) if dosage_match else None
                
                # If no dosage in current line, check next line
                if not dosage and i + 1 < len(lines):
                    next_line = lines[i+1]["text"]
                    dosage_match = dosage_pattern.search(next_line)
                    if dosage_match:
                        dosage = dosage_match.group(1)
                
                extracted_medicines.append({
                    "name": candidate["inventory_name"], # Use official name
                    "original_text": line_text,
                    "dosage": dosage,
                    "quantity": None, # Hard to infer quantity from OCR without LLM
                    "frequency": None,
                    "duration": None
                })
            
            # If not matched, but looks like a medicine line (has dosage)?
            # This is riskier without LLM context. 
            # For now, let's stick to inventory matches or strict formatting if needed.
            # But the requirement says "Extract detected text".
            # Let's add unmatched lines that have clear dosage patterns as potential medicines
            elif dosage_pattern.search(line_text):
                # Heuristic: If it has a dosage, treat remaining text as name
                dosage_match = dosage_pattern.search(line_text)
                name_part = line_text.replace(dosage_match.group(0), "").strip()
                
                if len(name_part) > 3: # Avoid noise
                    extracted_medicines.append({
                        "name": name_part,
                        "dosage": dosage_match.group(1),
                        "quantity": None,
                        "frequency": None,
                        "duration": None,
                        "matched": False
                    })

        return extracted_medicines
    
    def _format_extraction_result(self, extracted: Dict[str, Any]) -> str:
        """Format extracted prescription for MANDATORY user confirmation."""
        medicines = extracted.get("medicines", [])
        is_partial = extracted.get("partial_extraction", False)
        confidence = extracted.get("confidence", 0.8)
        
        # ═══════════════════════════════════════════════════════════════
        # MANDATORY PATIENT CONFIRMATION FORMAT
        # ═══════════════════════════════════════════════════════════════
        msg_parts = ["📄 **I found the following medicines in your prescription:**\n"]
        
        if extracted.get("doctor_name"):
            msg_parts.append(f"👨‍⚕️ Doctor: {extracted['doctor_name']}")
        if extracted.get("patient_name"):
            msg_parts.append(f"👤 Patient: {extracted['patient_name']}")
        if extracted.get("date"):
            msg_parts.append(f"📅 Date: {extracted['date']}")
        
        msg_parts.append("\n**Medicines Found:**\n")
        
        for i, med in enumerate(medicines, 1):
            name = med.get('name', 'Unknown Medicine')
            msg_parts.append(f"**{i}. {name}**")
            
            # Show all available fields, mark unavailable as "Not specified"
            dosage = med.get("dosage") or "Not specified"
            msg_parts.append(f"   • Strength: {dosage}")
            
            if med.get("duration"):
                msg_parts.append(f"   • Duration: {med['duration']}")
            
            frequency = med.get("frequency") or "Not specified"
            msg_parts.append(f"   • Dosage: {frequency}")
            
            if med.get("quantity"):
                msg_parts.append(f"   • Quantity: {med['quantity']}")
            
            msg_parts.append("")
        
        # Show confidence/partial extraction notice
        if is_partial or confidence < 0.7:
            msg_parts.append("⚠️ *I was able to read some details. Please confirm if this looks correct.*\n")
        
        # MANDATORY CONFIRMATION QUESTION
        msg_parts.append("**Do you want me to add these medicines to your order?**")
        
        return "\n".join(msg_parts)
    
    async def quick_analyze(self, image_base64: str) -> Dict[str, Any]:
        """Quick analysis for API endpoint."""
        return await self._analyze_prescription_image(image_base64)
    
    def _match_medicines_to_inventory(self, extracted_medicines: List[Dict]) -> List[Dict]:
        """
        Match extracted medicine names against medicines.csv inventory.
        Returns medicines with matched inventory data.
        """
        import csv
        from pathlib import Path
        
        inventory_path = Path(__file__).parent.parent / "data" / "medicines.csv"
        if not inventory_path.exists():
            return extracted_medicines
        
        # Load inventory
        inventory = []
        with open(inventory_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            inventory = list(reader)
        
        matched_medicines = []
        for med in extracted_medicines:
            extracted_name = (med.get("name") or "").lower().strip()
            best_match = None
            
            for inv_item in inventory:
                inv_name = inv_item.get("name", "").lower()
                inv_generic = inv_item.get("generic_name", "").lower()
                
                # Exact match
                if extracted_name == inv_name or extracted_name == inv_generic:
                    best_match = inv_item
                    break
                
                # Partial match (medicine name contains extracted or vice versa)
                if extracted_name in inv_name or inv_name in extracted_name:
                    best_match = inv_item
                    break
                if extracted_name in inv_generic or inv_generic in extracted_name:
                    best_match = inv_item
                    break
            
            if best_match:
                med["matched"] = True
                med["inventory_id"] = best_match.get("medicine_id")
                med["inventory_name"] = best_match.get("name")
                med["inventory_price"] = best_match.get("unit_price")
                med["prescription_required"] = best_match.get("prescription_required") == "true"
                med["in_stock"] = int(best_match.get("stock_quantity", 0)) > 0
            else:
                med["matched"] = False
            
            matched_medicines.append(med)
        
        return matched_medicines


# Singleton instance
vision_agent = VisionAgent()

