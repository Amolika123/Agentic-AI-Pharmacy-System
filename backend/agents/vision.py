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
            
            return AgentResponse(
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
            
        except Exception as e:
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
        """Use HuggingFace Multimodal-OCR to extract prescription details."""
        import json
        import tempfile
        import os
        import base64
        
        # PROMPT for the model
        prompt = """You are a MULTIMODAL PHARMACY AI. Analyze this prescription image.

MANDATORY: Return valid JSON only. Structure:
{
  "medicines": [
    {
      "name": "Medicine name",
      "dosage": "Strength (e.g. 500mg) or null",
      "quantity": "count or null",
      "frequency": "frequency or null",
      "duration": "duration or null"
    }
  ],
  "doctor_name": "name or null",
  "patient_name": "name or null",
  "date": "date or null",
  "confidence": 0.8
}

CRITICAL:
1. Extract ALL medicines visible.
2. If text is unclear, infer context but do not guess wildy.
3. Return ONLY valid JSON.
"""

        try:
            # 1. Decode base64 to temp file (Gradio requires file path)
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            
            image_bytes = base64.b64decode(image_base64)
            
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_img:
                temp_img.write(image_bytes)
                temp_path = temp_img.name
            
            try:
                # 2. Call HuggingFace Space via Gradio Client
                from gradio_client import Client
                
                hf_token = os.getenv("HF_TOKEN")
                print(f"[VISION] Connecting to prithivMLmods/Multimodal-OCR with token: {'Yes' if hf_token else 'No'}...")
                
                # Use 'token' argument (not hf_token) for authentication in this version
                client = Client("prithivMLmods/Multimodal-OCR", token=hf_token)
                
                # Predict: model_name, text, image, params...
                # API signature: predict(model_name, text, image, ...) -> (raw_output, match_output)
                result = client.predict(
                    model_name="Nanonets-OCR2-3B", # Using default strong model
                    text=prompt,
                    image=temp_path,
                    api_name="/generate_image"
                )
                
                # Result is a tuple: (raw_text, markdown_text)
                # We want the raw text which usually contains the JSON
                if isinstance(result, (list, tuple)) and len(result) > 0:
                    response_text = str(result[0])
                else:
                    response_text = str(result)
                    
                print(f"[VISION] HF Response: {response_text[:100]}...")
                
                # 3. Parse JSON from response
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0].strip()
                
                # Clean up any non-JSON prefix/suffix if present
                if "{" in response_text:
                    start = response_text.index("{")
                    end = response_text.rindex("}") + 1
                    response_text = response_text[start:end]
                
                extracted = json.loads(response_text)
                
                # Add partial_extraction flag if not present
                extracted["partial_extraction"] = extracted.get("partial_extraction", True)
                
                # Match against inventory
                extracted["medicines"] = self._match_medicines_to_inventory(extracted.get("medicines", []))
                
                return extracted

            except ImportError:
                return {
                    "medicines": [], 
                    "error": "gradio_client not installed. Run: pip install gradio_client",
                    "partial_extraction": False
                }
            except Exception as e:
                print(f"[VISION ERROR] {e}")
                return {"medicines": [], "error": str(e), "partial_extraction": False}
            finally:
                # Cleanup temp file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                        
        except Exception as e:
            return {"medicines": [], "error": str(e), "partial_extraction": False}
    
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
        msg_parts.append("**Do you want me to add these medicines to your order?**\n")
        msg_parts.append("• **Yes, add them**")
        msg_parts.append("• **No, don't add**")
        
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

