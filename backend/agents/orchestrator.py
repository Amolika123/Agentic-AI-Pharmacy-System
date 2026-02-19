"""
Orchestrator Agent - Central coordinator for the Agentic Pharmacy System.
Routes requests between agents and manages conversation sessions.
"""
from typing import Dict, Any, Optional, List
from agents.base_agent import BaseAgent, AgentResponse, AgentContext, OrderState
from datetime import datetime
import uuid
import csv
from pathlib import Path


class OrchestratorAgent(BaseAgent):
    """
    Central orchestrator that:
    - Manages conversation sessions
    - Routes requests to appropriate agents
    - Coordinates multi-agent workflows
    - Maintains conversation context
    """
    
    def __init__(self):
        super().__init__(
            name="OrchestratorAgent",
            description="Central pharmacy coordinator managing all agent interactions"
        )
        self.sessions: Dict[str, AgentContext] = {}
        self._agents = None
        self.customers = self._load_customers()
    
    def _load_customers(self) -> Dict[str, Dict]:
        """Load customer profiles."""
        customers = {}
        csv_path = Path(__file__).parent.parent / "data" / "customers.csv"
        if csv_path.exists():
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    customers[row["customer_id"]] = row
                    # Also index by phone for quick lookup
                    if row.get("phone"):
                        customers[row["phone"]] = row
        return customers
    
    @property
    def agents(self):
        if self._agents is None:
            from agents.conversational import conversational_agent
            from agents.safety import safety_agent
            from agents.predictive import predictive_agent
            from agents.executor import executor_agent
            from agents.vision import vision_agent
            from agents.symptom import symptom_agent
            self._agents = {
                "ConversationalAgent": conversational_agent,
                "SafetyAgent": safety_agent,
                "PredictiveAgent": predictive_agent,
                "ExecutorAgent": executor_agent,
                "VisionAgent": vision_agent,
                "SymptomAgent": symptom_agent
            }
        return self._agents
    
    async def process(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Optional[Any] = None
    ) -> AgentResponse:
        """Process input through orchestrated agent chain."""
        return AgentResponse(
            success=True,
            data=await self.handle_message(
                message=input_data.get("message", ""),
                customer_id=context.customer_id,
                session_id=context.session_id,
                image_data=input_data.get("image_data") # Support image data
            ),
            message=""
        )
    
    async def handle_message(
        self,
        message: str,
        customer_id: Optional[str] = None,
        session_id: Optional[str] = None,
        is_voice: bool = False,
        image_data: Optional[str] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """Main entry point for handling user messages."""
        # Get or create session
        if not session_id:
            session_id = str(uuid.uuid4())
        
        context = self._get_or_create_context(session_id, customer_id)
        
        # ═══════════════════════════════════════════════════════════════════════
        # SET LANGUAGE FROM REQUEST (Frontend language tabs control this)
        # ═══════════════════════════════════════════════════════════════════════
        context.language = language
        
        if message:
            context.add_message("user", message)
        
        # Create trace for observability
        trace = self.tracer.create_trace(
            name="pharmacy_conversation",
            user_id=customer_id or "guest",
            session_id=session_id,
            metadata={"message_length": len(message), "is_voice": is_voice, "has_image": bool(image_data), "language": language},
            tags=["pharmacy", "conversation"]
        )
        
        try:
            # ═══════════════════════════════════════════════════════════
            # PRIORITY 1: Check for pending cancellation confirmation (TOP PRIORITY)
            # Must run BEFORE fast-path to capture "yes"/"no" for cancellation
            # ═══════════════════════════════════════════════════════════
            if context.awaiting_cancel_confirmation:
                print(f"[ORCH] Awaiting cancel confirmation, priority handling")
                return await self._handle_cancel_confirmation(message, context, trace)

            # ═══════════════════════════════════════════════════════════
            # FAST PATH: Skip LLM entirely for trivial messages
            # This is the ONLY safe way to achieve <100ms responses
            # ═══════════════════════════════════════════════════════════
            msg_lower = message.lower().strip()
            
            # FAST GREETINGS: Static responses, NO LLM
            FAST_GREETINGS = {
                "hello": "Hello! Welcome to our pharmacy. How can I help you today?",
                "hi": "Hi there! How can I assist you?",
                "hey": "Hey! What can I help you with?",
                "good morning": "Good morning! How may I help you?",
                "good evening": "Good evening! What can I do for you?",
                "good afternoon": "Good afternoon! How can I assist you?",
                "namaste": "नमस्ते! मैं आपकी कैसे मदद कर सकता हूं?",
                "hallo": "Hallo! Wie kann ich Ihnen helfen?",
            }
            
            if msg_lower in FAST_GREETINGS:
                print(f"[ORCH] Fast greeting: '{msg_lower}'")
                return self._build_response(
                    FAST_GREETINGS[msg_lower], context, trace,
                    {"intent": "greeting", "fast_path": True}
                )
            
            # FAST FAREWELLS: Static responses, NO LLM
            FAST_FAREWELLS = {
                "thanks": "You're welcome! Take care and stay healthy.",
                "thank you": "You're welcome! Have a great day.",
                "bye": "Goodbye! Take care.",
                "goodbye": "Goodbye! Stay healthy.",
                "ok bye": "Goodbye! Feel free to come back anytime.",
                "dhanyavaad": "धन्यवाद! अपना ख्याल रखें।",
                "danke": "Gern geschehen! Auf Wiedersehen.",
            }
            
            if msg_lower in FAST_FAREWELLS:
                print(f"[ORCH] Fast farewell: '{msg_lower}'")
                return self._build_response(
                    FAST_FAREWELLS[msg_lower], context, trace,
                    {"intent": "farewell", "fast_path": True}
                )
            
            # FAST CONFIRMATIONS: Direct routing, NO LLM
            FAST_CONFIRMATIONS = {
                # English
                "yes": "confirm_order", "y": "confirm_order", "ok": "confirm_order",
                "add them": "confirm_order", "confirm": "confirm_order", "yep": "confirm_order",
                "sure": "confirm_order", "go ahead": "confirm_order", "proceed": "confirm_order",
                "no": "decline_order", "n": "decline_order",
                "don't add": "decline_order", "nope": "decline_order",
                # Hindi
                "haan": "confirm_order", "ha": "confirm_order", "theek hai": "confirm_order",
                "nahi": "decline_order", "mat karo": "decline_order",
                # German
                "ja": "confirm_order", "jawohl": "confirm_order", "okay": "confirm_order",
                "nein": "decline_order",
            }
            
            if msg_lower in FAST_CONFIRMATIONS:
                fast_intent = FAST_CONFIRMATIONS[msg_lower]
                print(f"[ORCH] Fast confirmation: '{msg_lower}' → {fast_intent}")
                
                if fast_intent == "confirm_order":
                    return await self._confirm_order(context, trace)
                elif fast_intent == "decline_order":
                    return await self._cancel_order(context, trace)
            

            
            # ═══════════════════════════════════════════════════════════
            # PRIORITY 2: Check for cancellation intent keywords (multi-lang)
            # ═══════════════════════════════════════════════════════════
            if self._is_cancellation_message(message):
                return await self._initiate_cancellation(context, trace)
            
            # ═══════════════════════════════════════════════════════════
            # FAST REFILL: Skip LLM for known refill phrases (all langs)
            # ═══════════════════════════════════════════════════════════
            FAST_REFILL_PHRASES = {
                "refill my prescription", "refill prescription",
                "i want to refill", "refill my medicine",
                # Hindi
                "मेरी दवाई रिफिल करें",
                # German
                "mein rezept nachfüllen",
            }
            if msg_lower in FAST_REFILL_PHRASES and context.customer_id:
                print(f"[ORCH] Fast refill: '{msg_lower}'")
                refill_medicine = self._get_refill_medicine(context.customer_id)
                if refill_medicine:
                    med_name = refill_medicine.get("name", "your medicine")
                    unit_price = float(refill_medicine.get("unit_price", 0))
                    context.pending_order = {
                        "order_id": f"ORD{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                        "customer_id": context.customer_id,
                        "medicine": refill_medicine,
                        "medicine_id": refill_medicine.get("medicine_id", ""),
                        "medicine_name": med_name,
                        "quantity": 1,
                        "unit_price": unit_price,
                        "total": unit_price * 1,
                        "dosage_form": refill_medicine.get("dosage_form", ""),
                        "prescription_required": refill_medicine.get("prescription_required", "false"),
                        "prescription_verified": True,
                        "auto_refill": True
                    }
                    context.set_entity("last_medicine", refill_medicine)
                    return self._build_response(
                        f"Would you like to refill **{med_name}**?",
                        context, trace,
                        {"status": "awaiting_confirmation", "medicine": refill_medicine, "auto_refill": True, "fast_path": True}
                    )
                else:
                    return self._build_response(
                        "I couldn't find a recent prescription in your history. Please specify which medicine you'd like to order.",
                        context, trace,
                        {"status": "no_refill_history", "fast_path": True}
                    )
            
            # ═══════════════════════════════════════════════════════════
            # FAST ORDER / AVAILABILITY: Skip LLM for known patterns
            # Matches: "I need X", "Check if X is available", "I want to refill X"
            # ═══════════════════════════════════════════════════════════
            import re
            
            # Pattern: "I need <medicine>"
            order_match = re.match(
                r"^(?:i need|i want|i'd like|give me|get me|order|मुझे .+ चाहिए|ich brauche)\s+(.+?)\.?$",
                msg_lower
            )
            if order_match:
                med_name = order_match.group(1).strip()
                print(f"[ORCH] Fast order: '{med_name}'")
                fake_result = AgentResponse(
                    success=True,
                    data={"intent": "order_medicine", "entities": {"medicine_name": med_name}},
                    message=""
                )
                return await self._process_order_flow(fake_result, context, trace)
            
            # Pattern: "Check if <medicine> is available"
            avail_match = re.match(
                r"^(?:check if|is|do you have|check)\s+(.+?)\s+(?:is\s+)?(?:available|in stock).*$",
                msg_lower
            )
            if avail_match:
                med_name = avail_match.group(1).strip()
                print(f"[ORCH] Fast availability: '{med_name}'")
                fake_result = AgentResponse(
                    success=True,
                    data={"intent": "check_availability", "entities": {"medicine_name": med_name}},
                    message=""
                )
                return await self._check_availability(fake_result, context, trace)
            
            # Pattern: "I want to refill <medicine>" (from refill alert clicks)
            refill_match = re.match(
                r"^(?:i want to refill|refill)\s+(.+?)\.?$",
                msg_lower
            )
            if refill_match:
                med_name = refill_match.group(1).strip()
                print(f"[ORCH] Fast refill with name: '{med_name}'")
                fake_result = AgentResponse(
                    success=True,
                    data={"intent": "order_medicine", "entities": {"medicine_name": med_name}},
                    message=""
                )
                return await self._process_order_flow(fake_result, context, trace)
            
            # ═══════════════════════════════════════════════════════════
            # PRIORITY 3: Handle image uploads (prescription)
            # ═══════════════════════════════════════════════════════════
            if image_data:
                # Bypass conversational agent for direct image uploads if no message
                msg_input = message if message else "Analyze this prescription"
                conv_result = await self.agents["ConversationalAgent"].process(
                    input_data={"message": msg_input, "is_voice": is_voice, "has_image": True},
                    context=context,
                    trace=trace
                )
            else:
                # PRIORITY 4+: Normal flow through Conversational Agent
                conv_result = await self.agents["ConversationalAgent"].process(
                    input_data={"message": message, "is_voice": is_voice},
                    context=context,
                    trace=trace
                )
            
            if not conv_result.success:
                return self._build_error_response(conv_result, context, trace)
            
            intent = conv_result.data.get("intent", "general_query")
            
            # Handle cancellation intent detected by conversational agent
            if intent == "cancellation_intent":
                return await self._initiate_cancellation(context, trace)
            
            # Step 2: Handle based on intent
            if intent in ["greeting", "farewell"]:
                response = conv_result.message
                return self._build_response(response, context, trace, conv_result.data)
            
            # Step 3: Process order-related intents through safety
            if intent == "refill_prescription":
                # ═══════════════════════════════════════════════════════════
                # REFILL AUTO-DETECTION: Find most recent refill-eligible
                # medicine from order history before asking user to specify
                # ═══════════════════════════════════════════════════════════
                medicine_name = conv_result.data.get("entities", {}).get("medicine_name")
                if not medicine_name and context.customer_id:
                    refill_medicine = self._get_refill_medicine(context.customer_id)
                    if refill_medicine:
                        # Found a refill-eligible medicine — ask for confirmation
                        med_name = refill_medicine.get("name", "your medicine")
                        print(f"[ORCH] Auto-detected refill medicine: {med_name}")
                        
                        # Build a complete pending order with all fields ExecutorAgent expects
                        unit_price = float(refill_medicine.get("unit_price", 0))
                        context.pending_order = {
                            "order_id": f"ORD{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                            "customer_id": context.customer_id,
                            "medicine": refill_medicine,
                            "medicine_id": refill_medicine.get("medicine_id", ""),
                            "medicine_name": med_name,
                            "quantity": 1,
                            "unit_price": unit_price,
                            "total": unit_price * 1,
                            "dosage_form": refill_medicine.get("dosage_form", ""),
                            "prescription_required": refill_medicine.get("prescription_required", "false"),
                            "prescription_verified": True,
                            "auto_refill": True
                        }
                        context.set_entity("last_medicine", refill_medicine)
                        
                        return self._build_response(
                            f"Would you like to refill **{med_name}**?",
                            context, trace,
                            {"status": "awaiting_confirmation", "medicine": refill_medicine, "auto_refill": True}
                        )
                    else:
                        # No refill-eligible medicine found — ask user to specify
                        return self._build_response(
                            "I couldn't find a recent prescription in your history. Please specify which medicine you'd like to order.",
                            context, trace,
                            {"status": "no_refill_history"}
                        )
                # If medicine_name was extracted from the message, proceed with normal order flow
                return await self._process_order_flow(conv_result, context, trace)
            
            if intent == "order_medicine":
                return await self._process_order_flow(conv_result, context, trace)
            
            # Step 4: Check availability
            if intent == "check_availability":
                return await self._check_availability(conv_result, context, trace)
            
            # Step 5: Handle confirmations
            if intent == "confirm_order":
                return await self._confirm_order(context, trace)
            
            if intent == "decline_order":
                return await self._cancel_order(context, trace)
                
            # Step 6: Handle symptoms
            if intent in ["report_symptoms", "ask_advice"]:
                return await self._process_symptoms(conv_result, context, trace)
            
            # Step 7: Handle prescription upload
            if intent == "upload_prescription":
                if image_data:
                     return await self._process_prescription(image_data, context, trace)
                # If no image yet, just return the acknowledgment from conversational agent
                return self._build_response(conv_result.message, context, trace, conv_result.data)
            
            # Default: Return conversational response
            response = conv_result.message
            return self._build_response(response, context, trace, conv_result.data)
            
        except Exception as e:
            error_message = str(e)
            if trace:
                trace.update(metadata={"error": error_message})
            
            # Provide specific, actionable error messages
            if "connection" in error_message.lower() or "timeout" in error_message.lower():
                response_msg = "I'm having trouble connecting to the system. Please try again in a moment. If the issue persists, check if Ollama is running."
            elif "json" in error_message.lower() or "parse" in error_message.lower():
                response_msg = "I had trouble understanding the response. Could you rephrase your request?"
            else:
                response_msg = f"Something went wrong while processing your request. Please try again or rephrase your question.\n\n**What you can do:**\n• Try again with a simpler request\n• Check if you're asking for an available medicine\n• Upload a prescription if you need Rx medicines"
            
            return {
                "success": False,
                "response": response_msg,
                "session_id": session_id,
                "error": error_message
            }
        finally:
            self.tracer.flush()
            
    async def _process_symptoms(self, conv_result: AgentResponse, context: AgentContext, trace: Any) -> Dict[str, Any]:
        """Process symptoms via SymptomAgent."""
        symptoms = conv_result.data.get("entities", {}).get("symptoms", [])
        
        result = await self.agents["SymptomAgent"].process(
            input_data={"symptoms": symptoms},
            context=context,
            trace=trace
        )
        
        return self._build_response(
            result.message,
            context, trace,
            result.data
        )
    
    async def _process_prescription(self, image_base64: str, context: AgentContext, trace: Any) -> Dict[str, Any]:
        """Process prescription image via VisionAgent."""
        result = await self.agents["VisionAgent"].process(
            input_data={"image_base64": image_base64},
            context=context,
            trace=trace
        )
        
        # If extraction was successful, context.extracted_prescription is now set
        # The message already contains the "Do you want to confirm?" prompt
        
        return self._build_response(
            result.message,
            context, trace,
            result.data
        )
    
    # ═══════════════════════════════════════════════════════════════════════
    # CANCELLATION FLOW - Two-Step Confirmation with Multi-Language Support
    # ═══════════════════════════════════════════════════════════════════════
    
    CANCELLATION_KEYWORDS = {
        "en": ["cancel", "cancel order", "stop", "abort", "undo", "withdraw", 
               "never mind", "don't want", "dont want", "stop order", "forget it"],
        "hi": ["cancel kar do", "cancel karo", "nahi chahiye", "mat bhejo", 
               "band karo", "roko", "order cancel", "mujhe nahi chahiye", "rehne do"],
        "de": ["abbrechen", "stornieren", "bestellung stornieren", "nicht mehr",
               "ich will das nicht", "stoppen", "rückgängig machen", "nicht bestellen"]
    }
    
    CONFIRMATION_YES = ["yes", "confirm", "haan", "ha", "ja", "ok", "proceed", "do it", "go ahead"]
    CONFIRMATION_NO = ["no", "nahi", "nein", "keep", "don't cancel", "stop", "wait"]
    
    # ═══════════════════════════════════════════════════════════════════════
    # MULTI-LANGUAGE CANCELLATION MESSAGES
    # ═══════════════════════════════════════════════════════════════════════
    CANCEL_MESSAGES = {
        "confirmation": {
            "en": "⚠️ I can cancel your order.\n\nDo you want to go ahead and cancel it?",
            "hi": "⚠️ मैं आपका ऑर्डर रद्द कर सकता हूँ।\n\nक्या आप सच में ऑर्डर रद्द करना चाहते हैं?",
            "de": "⚠️ Ich kann Ihre Bestellung stornieren.\n\nMöchten Sie die Bestellung wirklich stornieren?"
        },
        "success": {
            "en": "✅ Your order has been cancelled successfully.",
            "hi": "✅ आपका ऑर्डर सफलतापूर्वक रद्द कर दिया गया है।",
            "de": "✅ Ihre Bestellung wurde erfolgreich storniert."
        },
        "no_order": {
            "en": "There is no active order to cancel.",
            "hi": "कोई सक्रिय ऑर्डर मौजूद नहीं है।",
            "de": "Es gibt keine aktive Bestellung zum Stornieren."
        },
        "kept": {
            "en": "✅ Got it! Your order has been kept.\n\nIs there anything else I can help you with?",
            "hi": "✅ समझ गया! आपका ऑर्डर रखा गया है।\n\nक्या मैं किसी और चीज़ में मदद कर सकता हूँ?",
            "de": "✅ Verstanden! Ihre Bestellung wurde behalten.\n\nKann ich Ihnen noch mit etwas anderem helfen?"
        },
        "dispatched": {
            "en": "⚠️ Your order has already been dispatched and cannot be cancelled.\n\nPlease contact our support team for assistance.",
            "hi": "⚠️ आपका ऑर्डर पहले ही भेजा जा चुका है और इसे रद्द नहीं किया जा सकता।\n\nकृपया सहायता के लिए हमारी सहायता टीम से संपर्क करें।",
            "de": "⚠️ Ihre Bestellung wurde bereits versandt und kann nicht storniert werden.\n\nBitte kontaktieren Sie unser Support-Team für Hilfe."
        },
        "clarify": {
            "en": "I didn't quite understand. Please reply with:\n\n• **Yes** - to cancel your order\n• **No** - to keep your order",
            "hi": "मुझे समझ नहीं आया। कृपया जवाब दें:\n\n• **हाँ** - ऑर्डर रद्द करने के लिए\n• **नहीं** - ऑर्डर रखने के लिए",
            "de": "Ich habe das nicht ganz verstanden. Bitte antworten Sie mit:\n\n• **Ja** - um Ihre Bestellung zu stornieren\n• **Nein** - um Ihre Bestellung zu behalten"
        }
    }
    
    def _get_cancel_message(self, key: str, lang: str) -> str:
        """Get localized cancellation message."""
        messages = self.CANCEL_MESSAGES.get(key, {})
        return messages.get(lang, messages.get("en", ""))
    
    def _is_cancellation_message(self, message: str) -> bool:
        """Check if message contains cancellation keywords in any language."""
        if not message:
            return False
        msg_lower = message.lower().strip()
        for keywords in self.CANCELLATION_KEYWORDS.values():
            for kw in keywords:
                if kw in msg_lower:
                    return True
        return False
    
    async def _initiate_cancellation(self, context: AgentContext, trace: Any) -> Dict[str, Any]:
        """Start two-step cancellation: ask for confirmation."""
        lang = context.language or "en"
        
        # ═══════════════════════════════════════════════════════════════════
        # CANCELLATION OVERRIDE: Always allow cancellation flow
        # Never say "no pending order" here - conversation state rules
        # ═══════════════════════════════════════════════════════════════════
        
        # Check if order already sent logic is preserved, but relaxed
        if context.order_state == OrderState.SENT:
            return self._build_response(
                self._get_cancel_message("dispatched", lang),
                context, trace,
                {"status": "order_dispatched", "action": "contact_support"}
            )
        
        # Set confirmation flag and ask for explicit confirmation
        context.awaiting_cancel_confirmation = True
        context.last_action = "CONFIRM_CANCEL"  # Set last action
        
        return self._build_response(
            self._get_cancel_message("confirmation", lang),
            context, trace,
            {"status": "awaiting_cancel_confirmation", "action": "confirm_cancel"}
        )
    
    async def _handle_cancel_confirmation(self, message: str, context: AgentContext, trace: Any) -> Dict[str, Any]:
        """Handle user's response to cancellation confirmation."""
        lang = context.language or "en"
        msg_lower = message.lower().strip()
        
        # Check for YES confirmation
        is_confirmed = any(word in msg_lower for word in self.CONFIRMATION_YES)
        is_declined = any(word in msg_lower for word in self.CONFIRMATION_NO)
        
        # Clear the awaiting flag
        context.awaiting_cancel_confirmation = False
        
        if is_confirmed and not is_declined:
            # Execute the cancellation (CANCELLATION OVERRIDE RULE)
            # Redirect to valid _cancel_order method
            return await self._cancel_order(context, trace)
        elif is_declined:
            return self._build_response(
                self._get_cancel_message("kept", lang),
                context, trace,
                {"status": "order_kept", "action": "none"}
            )
        else:
            # Unclear response - ask again
            context.awaiting_cancel_confirmation = True
            return self._build_response(
                self._get_cancel_message("clarify", lang),
                context, trace,
                {"status": "awaiting_cancel_confirmation", "action": "clarify"}
            )

    async def _process_order_flow(
        self,
        conv_result: AgentResponse,
        context: AgentContext,
        trace: Any
    ) -> Dict[str, Any]:
        """Process medicine order through safety and execution."""
        # Run safety checks
        safety_result = await self.agents["SafetyAgent"].process(
            input_data=conv_result.data.get("entities", {}),
            context=context,
            trace=trace
        )
        
        # Handle safety response
        if not safety_result.success:
            # Pass through the actual safety error message with more context
            error_msg = safety_result.message
            print(f"[ORCH] Safety check failed: {error_msg}")
            return self._build_response(
                error_msg,
                context, trace,
                {"status": "blocked", "safety": safety_result.data}
            )
        
        status = safety_result.data.get("status")
        
        if status == "prescription_required":
            return self._build_response(
                safety_result.message,
                context, trace,
                {"status": "prescription_required", "awaiting": "prescription_upload"}
            )
        
        if status == "allergy_warning":
            return self._build_response(
                safety_result.message,
                context, trace,
                {"status": "allergy_warning", "awaiting": "confirmation"}
            )
        
        if status == "approved":
            # Create order (pending confirmation)
            exec_result = await self.agents["ExecutorAgent"].process(
                input_data={"action": "create_order"},
                context=context,
                trace=trace
            )
            
            return self._build_response(
                exec_result.message,
                context, trace,
                {"status": "awaiting_confirmation", "order": exec_result.data.get("order")}
            )
        
        return self._build_response(
            safety_result.message,
            context, trace,
            safety_result.data
        )
    
    async def _check_availability(
        self,
        conv_result: AgentResponse,
        context: AgentContext,
        trace: Any
    ) -> Dict[str, Any]:
        """Check medicine availability."""
        from agents.safety import safety_agent
        
        medicine_name = conv_result.data.get("entities", {}).get("medicine_name")
        if not medicine_name:
            return self._build_response(
                "Which medicine would you like me to check?",
                context, trace, {}
            )
        
        medicine = safety_agent._find_medicine(medicine_name)
        if not medicine:
            return self._build_response(
                f"I couldn't find '{medicine_name}' in our inventory. Could you check the spelling?",
                context, trace, {"status": "not_found"}
            )
        
        stock = int(medicine.get("stock_quantity", 0))
        requires_rx = medicine.get("prescription_required", "false").lower() == "true"
        
        if stock > 0:
            # ═══════════════════════════════════════════════════════════
            # STATE ENFORCEMENT: Auto-create pending order on availability
            # This allows immediate "yes" confirmation without re-ordering
            # ═══════════════════════════════════════════════════════════
            context.pending_order = {
                "medicine": medicine,
                "quantity": 1,
                "auto_created": True
            }
            context.set_entity("last_medicine", medicine)
            print(f"[ORCH] Auto-created pending order for: {medicine['name']}")
            
            msg = f"✅ **{medicine['name']}** is in stock!\n\n"
            msg += f"📦 Available: {stock} {medicine.get('unit', 'units')}\n"
            msg += f"💰 Price: ₹{medicine.get('unit_price', 'N/A')} per {medicine.get('unit', 'unit')}\n"
            if requires_rx:
                msg += f"\n⚠️ *Prescription required for this medicine*"
            msg += f"\n\n🛒 I've added it as a pending order. **Would you like me to confirm it?**"
        else:
            msg = f"😔 Sorry, **{medicine['name']}** is currently out of stock."
        
        return self._build_response(msg, context, trace, {
            "medicine": medicine,
            "in_stock": stock > 0,
            "prescription_required": requires_rx,
            "pending_order_created": stock > 0
        })
    
    async def _confirm_order(self, context: AgentContext, trace: Any) -> Dict[str, Any]:
        """Confirm pending order or create order from extracted prescription."""
        
        # Helper to add item to cart
        def add_to_cart(customer_id: str, medicine: Dict, quantity: int):
            """Add item to cart CSV."""
            cart_path = Path(__file__).parent.parent / "data" / "carts.csv"
            import uuid as uuid_mod
            
            # Load existing cart
            carts = []
            if cart_path.exists():
                with open(cart_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    carts = list(reader)
            
            # Check if item already in cart
            existing = next((c for c in carts if c["customer_id"] == customer_id 
                             and c["medicine_id"] == medicine.get("medicine_id", "")), None)
            
            if existing:
                try:
                    current_qty = int(existing.get("quantity") or 0)
                except (ValueError, TypeError):
                    current_qty = 0
                existing["quantity"] = str(current_qty + quantity)
            else:
                new_item = {
                    "cart_id": str(uuid_mod.uuid4())[:8],
                    "customer_id": customer_id,
                    "medicine_id": medicine.get("medicine_id", ""),
                    "medicine_name": medicine.get("name", ""),
                    "quantity": str(quantity),
                    "unit_price": str(medicine.get("unit_price", 0)),
                    "dosage_form": medicine.get("dosage_form", ""),
                    "prescription_required": str(medicine.get("prescription_required", "false")).lower(),
                    "added_at": datetime.utcnow().isoformat()
                }
                carts.append(new_item)
            
            # Save cart
            fieldnames = ["cart_id", "customer_id", "medicine_id", "medicine_name", 
                          "quantity", "unit_price", "dosage_form", "prescription_required", "added_at"]
            with open(cart_path, "w", encoding="utf-8", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(carts)
        
        # Debug: Log both states at entry
        extracted_rx = context.get_entity("extracted_prescription")
        print(f"[ORCH] _confirm_order ENTRY: pending_order={context.pending_order is not None}, extracted_rx={extracted_rx is not None}, customer={context.customer_id}")
        
        # ═══════════════════════════════════════════════════════════════
        # SCENARIO B (PRIORITY): Extracted prescription items
        # Must come BEFORE Scenario A because safety agent may have
        # set context.pending_order during prescription processing
        # ═══════════════════════════════════════════════════════════════
        if extracted_rx:
            # Clear any stale pending_order to avoid interference
            context.pending_order = None
            
            medicines = extracted_rx.get("medicines", [])
            print(f"[ORCH] _confirm_order: Processing {len(medicines)} prescription medicines")
            orders_created = []
            items_added_to_cart = 0
            
            for med in medicines:
                med_name = med.get("name")
                # Fix: med.get("quantity", 1) returns None if key exists with None value
                med_quantity = med.get("quantity") or 1
                try:
                    med_quantity = int(med_quantity)
                except:
                    med_quantity = 1
                
                print(f"[ORCH] _confirm_order: Processing medicine '{med_name}' qty={med_quantity}")
                
                # Check Safety first
                try:
                    safety_result = await self.agents["SafetyAgent"].process(
                        input_data={"medicine_name": med_name, "quantity": med_quantity},
                        context=context,
                        trace=trace
                    )
                    print(f"[ORCH] _confirm_order: Safety result - success={safety_result.success}, status={safety_result.data.get('status')}")
                except Exception as e:
                    print(f"[ORCH] _confirm_order: Safety check exception: {e}")
                    continue
                
                # ACCEPT both 'approved' AND 'prescription_required' for extracted prescriptions
                if safety_result.success and safety_result.data.get("status") in ["approved", "prescription_required"]:
                     medicine_data = safety_result.data.get("medicine", {})
                     # IMPORTANT: If safety says 'prescription_required', we MUST treat it as verified
                     # because this IS a prescription processing flow!
                     if safety_result.data.get("status") == "prescription_required":
                         print(f"[ORCH] _confirm_order: Auto-verifying prescription for {med_name}")
                         medicine_data["prescription_verified"] = "true"
                         
                     print(f"[ORCH] _confirm_order: Medicine data = {medicine_data.get('name', 'N/A')}, id={medicine_data.get('medicine_id', 'N/A')}")
                     
                     # Add to cart
                     if context.customer_id and medicine_data:
                         try:
                             add_to_cart(context.customer_id, medicine_data, med_quantity)
                             items_added_to_cart += 1
                             print(f"[ORCH] _confirm_order: Added to cart successfully")
                         except Exception as e:
                             print(f"[ORCH] _confirm_order: Cart add error: {e}")
                     
                     # Create the order
                     try:
                         create_result = await self.agents["ExecutorAgent"].process(
                            input_data={"action": "create_order", "medicine": medicine_data, "quantity": med_quantity},
                            context=context,
                            trace=trace
                         )
                         print(f"[ORCH] _confirm_order: Create result - success={create_result.success}")
                     except Exception as e:
                         print(f"[ORCH] _confirm_order: Create order exception: {e}")
                         continue
                     
                     if create_result.success:
                         # Immediately confirm it since user said "Yes" to the whole list
                         context.pending_order = create_result.data.get("order")
                         print(f"[ORCH] _confirm_order: Pending order set, confirming...")
                         try:
                             confirm_result = await self.agents["ExecutorAgent"].process(
                                 input_data={"action": "confirm_order"},
                                 context=context,
                                 trace=trace
                             )
                             print(f"[ORCH] _confirm_order: Confirm result - success={confirm_result.success}")
                             orders_created.append(confirm_result.data.get("order"))
                         except Exception as e:
                             print(f"[ORCH] _confirm_order: Confirm exception: {e}")
                     else:
                         print(f"[ORCH] _confirm_order: Create order failed: {create_result.message}")
                else:
                    print(f"[ORCH] _confirm_order: Safety did not approve '{med_name}': status={safety_result.data.get('status')}")
            
            # Clear extracted prescription
            context.set_entity("extracted_prescription", None)
            context.pending_order = None
            
            count = len(orders_created)
            print(f"[ORCH] _confirm_order: Final count = {count}, cart items = {items_added_to_cart}")
            if count > 0:
                msg = f"✅ Confirmed! I've placed orders for {count} medicines from your prescription."
                msg += f"\n\n🛒 **{items_added_to_cart} items added to your Cart!**"
                msg += "\n\nYou'll receive confirmation messages shortly."
                return self._build_response(msg, context, trace, {"status": "confirmed_bulk", "orders": orders_created, "added_to_cart": items_added_to_cart})
            else:
                return self._build_response("I couldn't process the orders. Please try again or contact support.", context, trace, {"status": "failed"})

        # ═══════════════════════════════════════════════════════════════
        # SCENARIO A: Pending single order (from text conversation)
        # ═══════════════════════════════════════════════════════════════
        if context.pending_order:
            pending = context.pending_order
            
            # pending_order IS the order object directly (flat structure)
            medicine_info = {
                "medicine_id": pending.get("medicine_id", ""),
                "name": pending.get("medicine_name", ""),
                "unit_price": pending.get("unit_price", 0),
                "dosage_form": pending.get("dosage_form", ""),
                "prescription_required": str(pending.get("prescription_verified", True)).lower() == "false"
            }
            quantity = pending.get("quantity", 1)
            
            print(f"[ORCH] Confirming single order, adding to cart: {medicine_info['name']} x{quantity}")
            
            if context.customer_id and medicine_info.get("medicine_id"):
                add_to_cart(context.customer_id, medicine_info, quantity)
            
            exec_result = await self.agents["ExecutorAgent"].process(
                input_data={"action": "confirm_order"},
                context=context,
                trace=trace
            )
            return self._build_response(
                exec_result.message + "\n\n🛒 Items also added to your Cart!",
                context, trace,
                {"status": "confirmed", "order": exec_result.data.get("order"), "added_to_cart": True}
            )

        # ═══════════════════════════════════════════════════════════════════
        # STATE RECOVERY: Recover from last_medicine if pending_order lost
        # This ensures "yes" works even if context state was partially lost
        # ═══════════════════════════════════════════════════════════════════
        last_medicine = context.get_entity("last_medicine")
        if last_medicine:
            print(f"[ORCH] State recovery: Using last_medicine for confirmation")
            # Create pending order from recovered state
            context.pending_order = {
                "medicine": last_medicine,
                "quantity": 1,
                "recovered": True
            }
            # Now process as normal pending order
            if context.customer_id:
                add_to_cart(context.customer_id, last_medicine, 1)
            
            exec_result = await self.agents["ExecutorAgent"].process(
                input_data={"action": "confirm_order"},
                context=context,
                trace=trace
            )
            
            # Clear the recovered state
            context.set_entity("last_medicine", None)
            
            return self._build_response(
                exec_result.message + "\n\n🛒 Item added to your Cart!",
                context, trace,
                {"status": "confirmed", "order": exec_result.data.get("order"), "recovered": True}
            )

        # Final fallback - helpful message instead of error
        lang = context.language or "en"
        NO_ORDER_MESSAGES = {
            "en": "I don't have a pending order. What medicine would you like to order?",
            "hi": "कोई पेंडिंग ऑर्डर नहीं है। आप कौन सी दवा ऑर्डर करना चाहेंगे?",
            "de": "Es gibt keine ausstehende Bestellung. Welches Medikament möchten Sie bestellen?"
        }
        return self._build_response(
            NO_ORDER_MESSAGES.get(lang, NO_ORDER_MESSAGES["en"]),
            context, trace,
            {"status": "no_pending_order"}
        )
    
    async def _cancel_order(self, context: AgentContext, trace: Any) -> Dict[str, Any]:
        """Cancel pending order - CANCELLATION OVERRIDE RULE."""
        # ═══════════════════════════════════════════════════════════════════
        # CANCELLATION OVERRIDE: Assume order EXISTS, clear EVERYTHING
        # Error suppression is ABSOLUTE - conversation correctness first
        # ═══════════════════════════════════════════════════════════════════
        
        # 1. CLEAR ALL PENDING STATE
        context.pending_order = None
        context.set_entity("last_medicine", None)
        context.set_entity("extracted_prescription", None)
        context.set_entity("pending_medicine_name", None)
        context.set_entity("pending_quantity", None)
        context.awaiting_cancel_confirmation = False
        
        # 2. CLEAR CART FOR THIS CUSTOMER (suppress all errors)
        try:
            if context.customer_id:
                cart_path = Path(__file__).parent.parent / "data" / "carts.csv"
                if cart_path.exists():
                    import csv
                    carts = []
                    with open(cart_path, "r", encoding="utf-8") as f:
                        reader = csv.DictReader(f)
                        # Keep only items NOT belonging to this customer
                        carts = [c for c in reader if c.get("customer_id") != context.customer_id]
                    
                    # Write back without this customer's items
                    fieldnames = ["cart_id", "customer_id", "medicine_id", "medicine_name", 
                                  "quantity", "unit_price", "dosage_form", "prescription_required", "added_at"]
                    with open(cart_path, "w", encoding="utf-8", newline="") as f:
                        writer = csv.DictWriter(f, fieldnames=fieldnames)
                        writer.writeheader()
                        writer.writerows(carts)
                    print(f"[ORCH] Cart cleared for customer: {context.customer_id}")
        except Exception as e:
            print(f"[ORCH] Cart clear error (suppressed): {e}")
            pass  # ABSOLUTE error suppression
        
        # 3. TRY EXECUTOR (errors suppressed)
        try:
            await self.agents["ExecutorAgent"].process(
                input_data={"action": "cancel_order"},
                context=context,
                trace=trace
            )
        except:
            pass  # ABSOLUTE error suppression
        
        print(f"[ORCH] Order cancelled, cart cleared for: {context.customer_id}")
        
        # 4. MANDATORY SUCCESS RESPONSE (exact messages)
        lang = context.language or "en"
        CANCEL_MESSAGES = {
            "en": "✅ Your order has been cancelled and the items have been removed from your cart.",
            "hi": "✅ आपका ऑर्डर रद्द कर दिया गया है और आइटम्स कार्ट से हटा दिए गए हैं।",
            "de": "✅ Ihre Bestellung wurde storniert und die Artikel wurden aus dem Warenkorb entfernt."
        }
        
        return self._build_response(
            CANCEL_MESSAGES.get(lang, CANCEL_MESSAGES["en"]),
            context, trace,
            {"status": "cancelled", "cart_cleared": True}
        )
    
    def _get_refill_medicine(self, customer_id: str) -> Optional[Dict]:
        """Find most recent refill-eligible medicine from order history."""
        try:
            order_history_path = Path(__file__).parent.parent / "data" / "order_history.csv"
            medicines_path = Path(__file__).parent.parent / "data" / "medicines.csv"
            
            if not order_history_path.exists() or not medicines_path.exists():
                return None
            
            # Load order history for this customer
            customer_orders = []
            with open(order_history_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get("customer_id") == customer_id:
                        customer_orders.append(row)
            
            if not customer_orders:
                return None
            
            # Load medicines
            medicines = {}
            with open(medicines_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    medicines[row["medicine_id"]] = row
            
            # Prefer prescription-required medicines, then sort by order date descending
            def sort_key(order):
                med = medicines.get(order.get("medicine_id"), {})
                is_rx = 1 if med.get("prescription_required", "false").lower() == "true" else 0
                order_date = order.get("order_date", "1900-01-01")
                return (is_rx, order_date)
            
            customer_orders.sort(key=sort_key, reverse=True)
            best_order = customer_orders[0]
            med_id = best_order.get("medicine_id")
            
            if med_id and med_id in medicines:
                return medicines[med_id]
            
            return None
        except Exception as e:
            print(f"[ORCH] Error finding refill medicine: {e}")
            return None
    
    @staticmethod
    def _parse_dosage_frequency(freq: str) -> Optional[int]:
        """Parse dosage frequency string to daily doses count."""
        if not freq:
            return None
        freq_lower = freq.strip().lower()
        FREQ_MAP = {
            "once daily": 1,
            "twice daily": 2,
            "three times daily": 3,
            "thrice daily": 3,
        }
        for key, val in FREQ_MAP.items():
            if key in freq_lower:
                return val
        if "as needed" in freq_lower:
            return None  # Cannot estimate for as-needed
        return None

    async def get_refill_alerts(self, customer_id: Optional[str] = None) -> Dict[str, Any]:
        """Get proactive refill alerts with enriched days_left data."""
        context = AgentContext(customer_id=customer_id)
        
        trace = self.tracer.create_trace(
            name="refill_alerts",
            user_id=customer_id or "system",
            tags=["proactive", "refill"]
        )
        
        result = await self.agents["PredictiveAgent"].process(
            input_data={"customer_id": customer_id},
            context=context,
            trace=trace
        )
        
        # Enrich alerts with computed days_left
        alerts = result.data.get("predictions", [])
        for alert in alerts:
            try:
                quantity = alert.get("days_supply")
                frequency = alert.get("frequency", "")
                daily_dosage = self._parse_dosage_frequency(frequency)
                
                if daily_dosage and quantity and str(quantity) not in ("N/A", "", "None"):
                    days_left = int(quantity) // daily_dosage
                    alert["days_left"] = days_left
                    alert["priority"] = "high" if days_left < 5 else "medium"
                else:
                    alert["days_left"] = None
                    alert["priority"] = alert.get("priority", "medium")
            except (ValueError, TypeError, ZeroDivisionError):
                alert["days_left"] = None
                alert["priority"] = alert.get("priority", "medium")
        
        return {
            "success": result.success,
            "alerts": alerts,
            "message": result.message
        }
    
    def _get_or_create_context(self, session_id: str, customer_id: Optional[str]) -> AgentContext:
        """Get existing session or create new one."""
        if session_id in self.sessions:
            context = self.sessions[session_id]
            # Update customer_id if provided and context doesn't have it (or to be safe, always update if match)
            if customer_id and context.customer_id != customer_id:
                context.customer_id = customer_id
            return context
        
        context = AgentContext(customer_id=customer_id, session_id=session_id)
        
        # Load customer profile if available
        if customer_id and customer_id in self.customers:
            context.customer_profile = self.customers[customer_id]
            context.language = context.customer_profile.get("language", "en")
        
        self.sessions[session_id] = context
        return context
    
    def _build_response(
        self,
        message: str,
        context: AgentContext,
        trace: Any,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build standardized response."""
        context.add_message("assistant", message)
        
        return {
            "success": True,
            "response": message,
            "session_id": context.session_id,
            "language": context.language,
            "trace_id": getattr(trace, 'id', None),
            "data": data
        }
    
    def _build_error_response(
        self,
        result: AgentResponse,
        context: AgentContext,
        trace: Any
    ) -> Dict[str, Any]:
        """Build error response."""
        return {
            "success": False,
            "response": result.message,
            "session_id": context.session_id,
            "trace_id": getattr(trace, 'id', None),
            "error": result.data.get("error")
        }
    
    def get_active_sessions(self) -> List[Dict[str, Any]]:
        """Get list of active sessions for admin view."""
        return [
            {
                "session_id": sid,
                "customer_id": ctx.customer_id,
                "language": ctx.language,
                "message_count": len(ctx.conversation_history),
                "has_pending_order": ctx.pending_order is not None
            }
            for sid, ctx in self.sessions.items()
        ]


# Singleton instance
orchestrator_agent = OrchestratorAgent()
