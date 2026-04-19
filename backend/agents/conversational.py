"""
Conversational Agent - Handles natural language understanding for pharmacy orders.
Extracts medicine names, dosages, quantities from messy human dialogue.
Supports voice/text input with multilingual capability.
"""
from typing import Dict, Any, Optional, List
from agents.base_agent import BaseAgent, AgentResponse, AgentContext
import json


class ConversationalAgent(BaseAgent):
    """
    Handles natural voice/text conversations for pharmacy ordering.
    Extracts medicine names, dosages, and quantities from human-like dialogue.
    """
    
    def __init__(self):
        super().__init__(
            name="ConversationalAgent",
            description="Expert pharmacist assistant understanding natural medicine orders"
        )
        self.supported_intents = [
            "order_medicine",      # "I need some paracetamol"
            "refill_prescription", # "I need to refill my diabetes medicine"
            "check_availability",  # "Do you have ibuprofen?"
            "check_price",         # "How much is amoxicillin?"
            "order_status",        # "Where is my order?"
            "cancel_order",        # "Cancel my last order"
            "confirm_order",       # "Yes, place the order"
            "decline_order",       # "No, cancel it"
            "report_symptoms",     # "I have a headache"
            "upload_prescription", # "Here's my prescription"
            "ask_advice",          # "What's good for headache?" (can map to report_symptoms)
            "greeting",
            "farewell",
            "general_query"
        ]
        
        self.entity_types = [
            "medicine_name",
            "quantity",
            "dosage",
            "frequency",
            "duration",
            "symptoms"
        ]
        
        # Multi-language cancellation keywords for reliable detection
        # Priority 1: Always check these BEFORE LLM classification
        self.CANCELLATION_KEYWORDS = {
            "en": [
                "cancel", "cancel order", "stop", "abort", "undo", 
                "withdraw", "never mind", "don't want", "dont want",
                "stop order", "cancel it", "forget it"
            ],
            "hi": [
                "cancel kar do", "cancel karo", "nahi chahiye", 
                "mat bhejo", "band karo", "roko", "order cancel",
                "mujhe nahi chahiye", "rehne do"
            ],
            "de": [
                "abbrechen", "stornieren", "bestellung stornieren",
                "nicht mehr", "ich will das nicht", "stoppen",
                "rückgängig machen", "bestellung abbrechen",
                "nicht bestellen", "cancel"
            ]
        }
    
    async def process(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Optional[Any] = None
    ) -> AgentResponse:
        """Process user message and extract order intent and entities."""
        user_message = input_data.get("message", "")
        # If image is present, override intent to upload_prescription
        if input_data.get("has_image"):
            intent = "upload_prescription"
            entities = {}
            context.set_entity("intent", intent)
            return AgentResponse(
                success=True,
                data={"intent": intent, "entities": {}, "language": context.language},
                message="I see you've uploaded an image. Let me analyze your prescription.",
                next_agent="VisionAgent",
                requires_action=True
            )

        is_voice = input_data.get("is_voice", False)
        
        span = await self.create_span(trace, "process_message", {"message": user_message, "is_voice": is_voice})
        
        try:
            # PRIORITY 1: Check for cancellation intent BEFORE LLM (multi-language keyword detection)
            if self._detect_cancellation_intent(user_message):
                context.set_entity("intent", "cancellation_intent")
                if span:
                    span.end(output={"intent": "cancellation_intent", "method": "keyword_detection"})
                return AgentResponse(
                    success=True,
                    data={
                        "intent": "cancellation_intent",
                        "entities": {},
                        "language": context.language,
                        "detection_method": "keyword"
                    },
                    message="",  # Orchestrator will handle the confirmation message
                    next_agent=None,
                    requires_action=True,
                    action_type="cancel_confirmation"
                )
            
            # Step 1: Detect language
            language_result = await self.llm.detect_language(user_message)
            context.language = language_result.get("language", "en")
            
            # ═══════════════════════════════════════════════════════════════════
            # PRIORITY: Keyword-based intent detection (works even if LLM fails)
            # This ensures reliable intent detection for common pharmacy requests
            # ═══════════════════════════════════════════════════════════════════
            msg_lower = user_message.lower().strip()
            intent = None
            
            # Order medicine keywords (multi-language)
            ORDER_KEYWORDS = [
                # English
                "i need", "i want", "give me", "order", "buy", "get me", "can i have",
                "please give", "i would like", "i'd like", "need to order", "want to order",
                # Hindi
                "chahiye", "mujhe", "order karo", "de do", "dena",
                # German  
                "ich brauche", "ich möchte", "bestellen", "gib mir"
            ]
            
            # Check availability keywords
            AVAILABILITY_KEYWORDS = [
                "do you have", "is available", "in stock", "availability", "check if",
                "hai kya", "milega", "verfügbar", "haben sie"
            ]
            
            # Symptom/advice keywords
            SYMPTOM_KEYWORDS = [
                "i have", "suffering from", "feeling", "pain", "ache", "fever",
                "headache", "cold", "cough", "stomach", "suggest", "recommend",
                "dard", "bukhar", "sardi", "schmerz", "fieber"
            ]
            
            # Detect intent from keywords
            for kw in ORDER_KEYWORDS:
                if kw in msg_lower:
                    intent = "order_medicine"
                    print(f"[CONV] Keyword detected: '{kw}' → order_medicine")
                    break
            
            if not intent:
                for kw in AVAILABILITY_KEYWORDS:
                    if kw in msg_lower:
                        intent = "check_availability"
                        print(f"[CONV] Keyword detected: '{kw}' → check_availability")
                        break
            
            if not intent:
                for kw in SYMPTOM_KEYWORDS:
                    if kw in msg_lower:
                        intent = "report_symptoms"
                        print(f"[CONV] Keyword detected: '{kw}' → report_symptoms")
                        break
            
            # Fallback to LLM only if no keyword match
            if not intent:
                # Step 2: Classify intent via LLM
                intent_result = await self.llm.classify_intent(user_message, self.supported_intents)
                intent = intent_result.get("intent", "general_query")
            else:
                intent_result = {"intent": intent, "confidence": 0.95, "method": "keyword"}
            
            # Correction: Map ask_advice to report_symptoms if generic medical advice
            if intent == "ask_advice" and "symptoms" in user_message.lower():
                intent = "report_symptoms"

            # Step 3: Extract pharmacy-specific entities
            entities = await self._extract_pharmacy_entities(user_message, context.language)
            
            # Store in context
            context.set_entity("intent", intent)
            for key, value in entities.items():
                if value and key not in ["confidence", "detected_language"]:
                    context.set_entity(key, value)
            
            # Determine next agent based on intent
            next_agent = self._route_to_next_agent(intent)
            
            # Log decision
            await self.log_decision(
                trace=trace,
                decision=f"classified_intent_{intent}",
                reasoning=f"User wants to {intent}. Extracted entities: {list(entities.keys())}",
                confidence=intent_result.get("confidence", 0.8),
                input_data={"message": user_message},
                output_data={"intent": intent, "entities": entities}
            )
            
            if span:
                span.end(output={"intent": intent, "entities": entities})
            
            return AgentResponse(
                success=True,
                data={
                    "intent": intent,
                    "entities": entities,
                    "language": context.language,
                    "requires_clarification": intent_result.get("requires_clarification", False)
                },
                message=await self._generate_acknowledgment(intent, entities, context.language),
                next_agent=next_agent,
                requires_action=intent in ["order_medicine", "refill_prescription", "confirm_order", "report_symptoms", "upload_prescription"]
            )
            
        except Exception as e:
            if span:
                span.end(output={"error": str(e)})
            return AgentResponse(
                success=False,
                data={"error": str(e)},
                message="I'm sorry, I couldn't understand that. Could you please rephrase?"
            )
    
    def _detect_cancellation_intent(self, message: str) -> bool:
        """
        Detect cancellation intent using multi-language keyword matching.
        This runs BEFORE LLM to ensure reliable detection for EN/HI/DE.
        """
        msg_lower = message.lower().strip()
        
        for lang, keywords in self.CANCELLATION_KEYWORDS.items():
            for keyword in keywords:
                if keyword in msg_lower:
                    return True
        return False
    
    async def _extract_pharmacy_entities(self, text: str, language: str) -> Dict[str, Any]:
        """Extract medicine names, dosages, quantities from natural text."""
        
        import csv
        from pathlib import Path
        import re
        
        # Clean text to strip out intents like "refill", "reorder", etc.
        # This prevents the extraction logic from treating "refill cetirizine" as the medicine name.
        text_lower = text.lower()
        filler_patterns = [
            r"\bi want to refill\b",
            r"\bi need to refill\b",
            r"\brefill my\b",
            r"\brefill\b",
            r"\bi want to reorder\b",
            r"\bi need to reorder\b",
            r"\breorder my\b",
            r"\breorder\b",
            r"\bi need more\b",
            r"\bplease order\b",
            r"\bi want\b",
            r"\bi need\b",
            r"\bcan i get\b",
            r"\bgive me\b"
        ]
        
        clean_text = text_lower
        for pattern in filler_patterns:
            clean_text = re.sub(pattern, "", clean_text).strip()
            
        text_lower = clean_text
        
        # ═══════════════════════════════════════════════════════════════════
        # PRIORITY: Pattern-based extraction (works even if LLM fails)
        # Match against known medicines from database first
        # ═══════════════════════════════════════════════════════════════════
        
        # Load known medicines
        medicines_path = Path(__file__).parent.parent / "data" / "medicines.csv"
        known_medicines = []
        if medicines_path.exists():
            with open(medicines_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    known_medicines.append(row.get("name", "").lower())
        
        # Try pattern matching first
        found_medicine = None
        found_quantity = 1
        found_dosage = None
        
        # Check if any known medicine is mentioned
        for med_name in known_medicines:
            if med_name and med_name in text_lower:
                found_medicine = med_name.title()  # Capitalize properly
                print(f"[CONV] Pattern match found medicine: {found_medicine}")
                break
        
        # Common medicine name patterns (fuzzy matching)
        COMMON_MEDICINES = {
            "paracetamol": "Paracetamol", "crocin": "Paracetamol",
            "ibuprofen": "Ibuprofen", "advil": "Ibuprofen", "brufen": "Ibuprofen",
            "aspirin": "Aspirin", "disprin": "Aspirin",
            "cetirizine": "Cetirizine", "zyrtec": "Cetirizine",
            "omeprazole": "Omeprazole", "prilosec": "Omeprazole",
            "metformin": "Metformin", "glucophage": "Metformin",
            "amoxicillin": "Amoxicillin", "amoxil": "Amoxicillin",
            "azithromycin": "Azithromycin", "zithromax": "Azithromycin",
            "vitamin c": "Vitamin C", "vitamin d": "Vitamin D",
            "cough syrup": "Cough Syrup", "cold medicine": "Cold Medicine"
        }
        
        if not found_medicine:
            for pattern, proper_name in COMMON_MEDICINES.items():
                if pattern in text_lower:
                    found_medicine = proper_name
                    print(f"[CONV] Common pattern match: {pattern} → {proper_name}")
                    break
        
        # Extract quantity (e.g., "2 strips", "3 tablets", "1 bottle")
        quantity_patterns = [
            r'(\d+)\s*(strip|tablet|pill|bottle|box|pack|unit)s?',
            r'(\d+)\s+of\s+',
            r'give\s+(?:me\s+)?(\d+)',
        ]
        for pattern in quantity_patterns:
            match = re.search(pattern, text_lower)
            if match:
                found_quantity = int(match.group(1))
                break
        
        # Extract dosage (e.g., "500mg", "10 mg")
        dosage_match = re.search(r'(\d+)\s*(mg|ml|g)\b', text_lower)
        if dosage_match:
            found_dosage = f"{dosage_match.group(1)}{dosage_match.group(2)}"
        
        # If pattern matching found medicine, return without LLM
        if found_medicine:
            return {
                "medicine_name": found_medicine,
                "quantity": found_quantity,
                "dosage": found_dosage,
                "frequency": None,
                "duration": None,
                "symptoms": None,
                "extraction_method": "pattern"
            }
        
        # Fallback to LLM for complex cases
        system_prompt = """You are a pharmacy assistant extracting order details from customer messages.
Extract the following entities from the user's message:
- medicine_name: ONLY the precise name of the medicine/drug mentioned. STRIP OUT conversational words like "refill", "reorder", "my", "more" (e.g., "refill cetirizine" -> "Cetirizine"). Do NOT include conversational verbs in the medicine name.
- quantity: Number of units, strips, bottles, or pills requested
- dosage: Strength mentioned (e.g., 500mg, 10mg)
- frequency: How often they take it (e.g., twice daily, once at night)
- duration: How long they need it for (e.g., 1 week, 30 days)
- symptoms: List of symptoms mentioned (e.g. headache, fever)

Rules:
- Medicine name MUST NOT contain words like "refill", "reorder", "want", "need".
- Handle common misspellings (paracetmol → paracetamol, crocin → Crocin)
- Understand informal requests ("fever medicine" → antipyretic)
- Handle quantities like "2 strips", "1 bottle", "enough for a month"
- If not mentioned, set value to null

Respond ONLY with valid JSON."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": clean_text}
        ]
        
        response = await self.llm.chat(messages, temperature=0.2, json_mode=True)
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to parse partial JSON
            if "{" in response and "}" in response:
                start = response.index("{")
                end = response.rindex("}") + 1
                try:
                    return json.loads(response[start:end])
                except:
                    pass
            return {"medicine_name": None, "quantity": None}
    
    def _route_to_next_agent(self, intent: str) -> Optional[str]:
        """Determine which agent should handle next based on intent."""
        routing = {
            "order_medicine": "SafetyAgent",
            "refill_prescription": "PredictiveAgent",
            "check_availability": "InventoryAgent",
            "confirm_order": "ExecutorAgent",
            "report_symptoms": "SymptomAgent",
            "ask_advice": "SymptomAgent",
            "upload_prescription": "VisionAgent",
            "decline_order": None,
            "greeting": None,
            "farewell": None,
            "general_query": None
        }
        return routing.get(intent, "SafetyAgent")
    
    async def _generate_acknowledgment(self, intent: str, entities: Dict[str, Any], language: str) -> str:
        """Generate an appropriate acknowledgment based on intent and extracted entities."""
        medicine = entities.get("medicine_name", "the medicine")
        quantity = entities.get("quantity", "")
        
        if intent == "order_medicine" and medicine:
            if quantity:
                return f"I understand you'd like to order {quantity} of {medicine}. Let me check availability and verify any requirements."
            return f"I understand you'd like to order {medicine}. Let me check our stock and any prescription requirements."
        
        elif intent == "refill_prescription":
            return "I'll check your prescription history and prepare your refill. One moment please."
        
        elif intent == "check_availability":
            return f"Let me check if {medicine} is in stock for you."
        
        elif intent == "greeting":
            greetings = {
                "en": "Hello! Welcome to our pharmacy. How can I help you today?",
                "hi": "नमस्ते! फार्मेसी में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूं?",
                "de": "Hallo! Willkommen in unserer Apotheke. Wie kann ich Ihnen helfen?"
            }
            return greetings.get(language, greetings["en"])
        
        elif intent == "farewell":
            return "Thank you for visiting! Take care and stay healthy."
        
        elif intent == "ask_advice" or intent == "report_symptoms":
            symptoms = entities.get("symptoms", "your concern")
            if isinstance(symptoms, list):
                symptoms = ", ".join(symptoms)
            return f"I understand you're experiencing {symptoms}. Let me suggest some safe options."
        
        elif intent == "upload_prescription":
            return "Please upload your prescription image and I'll analyze it for you."
        
        return "I'm processing your request. Please give me a moment."
    
    async def generate_response(
        self,
        context: AgentContext,
        response_type: str,
        data: Dict[str, Any] = None
    ) -> str:
        """Generate a natural language response for the user."""
        language = context.language
        
        if response_type == "order_confirmation":
            return await self._generate_order_confirmation(data, language)
        elif response_type == "prescription_required":
            return await self._generate_prescription_request(data, language)
        elif response_type == "out_of_stock":
            return await self._generate_out_of_stock_message(data, language)
        elif response_type == "refill_reminder":
            return await self._generate_refill_reminder(data, language)
        
        # Default: use LLM to generate response
        prompt = f"Generate a helpful pharmacy assistant response for: {response_type}. Data: {data}"
        return await self.llm.generate_response(
            context=str(context.to_dict()),
            user_message=prompt,
            language=language
        )
    
    async def _generate_order_confirmation(self, data: Dict[str, Any], language: str) -> str:
        medicines = data.get("medicines", [])
        total = data.get("total", 0)
        order_id = data.get("order_id", "")
        
        items = ", ".join([f"{m['name']} x{m['quantity']}" for m in medicines])
        
        if language == "hi":
            return f"✅ आपका ऑर्डर कन्फर्म हो गया है!\n\nऑर्डर ID: {order_id}\nदवाइयाँ: {items}\nकुल राशि: ₹{total}\n\nआप इसे 30 मिनट में ले सकते हैं।"
        
        return f"✅ Your order has been confirmed!\n\nOrder ID: {order_id}\nMedicines: {items}\nTotal: ₹{total}\n\nYou can pick it up in 30 minutes or opt for delivery."
    
    async def _generate_prescription_request(self, data: Dict[str, Any], language: str) -> str:
        medicines = data.get("medicines", [])
        
        if language == "hi":
            return f"⚠️ {', '.join(medicines)} के लिए प्रिस्क्रिप्शन जरूरी है। कृपया अपना प्रिस्क्रिप्शन अपलोड करें।"
        
        return f"⚠️ **Prescription Required**\n\n{', '.join(medicines)} require a valid prescription. Please upload a photo of your prescription or visit with your original prescription."
    
    async def _generate_out_of_stock_message(self, data: Dict[str, Any], language: str) -> str:
        medicine = data.get("medicine", "This medicine")
        alternative = data.get("alternative", None)
        
        msg = f"😔 Sorry, {medicine} is currently out of stock."
        if alternative:
            msg += f"\n\nWould you like to try {alternative} instead? It's an equivalent alternative."
        return msg
    
    async def _generate_refill_reminder(self, data: Dict[str, Any], language: str) -> str:
        medicines = data.get("medicines", [])
        customer_name = data.get("customer_name", "")
        
        items = "\n".join([f"• {m['name']} - last ordered {m['days_ago']} days ago" for m in medicines])
        
        return f"👋 Hi {customer_name}!\n\nBased on your prescription history, you may need to refill:\n\n{items}\n\nWould you like me to prepare this order for you?"


# Singleton instance
conversational_agent = ConversationalAgent()
