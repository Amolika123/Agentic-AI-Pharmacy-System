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
            # PRIORITY 1: Check for pending cancellation confirmation
            # ═══════════════════════════════════════════════════════════
            if context.awaiting_cancel_confirmation:
                return await self._handle_cancel_confirmation(message, context, trace)
            
            # ═══════════════════════════════════════════════════════════
            # PRIORITY 2: Check for cancellation intent keywords (multi-lang)
            # ═══════════════════════════════════════════════════════════
            if self._is_cancellation_message(message):
                return await self._initiate_cancellation(context, trace)
            
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
            if intent in ["order_medicine", "refill_prescription"]:
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
        
        # Check if there's an order to cancel
        if not context.pending_order and context.order_state == OrderState.NONE:
            return self._build_response(
                self._get_cancel_message("no_order", lang),
                context, trace,
                {"status": "no_order", "action": "none"}
            )
        
        # Check if order already sent
        if context.order_state == OrderState.SENT:
            return self._build_response(
                self._get_cancel_message("dispatched", lang),
                context, trace,
                {"status": "order_dispatched", "action": "contact_support"}
            )
        
        # Set confirmation flag and ask for explicit confirmation
        context.awaiting_cancel_confirmation = True
        
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
            # Execute the cancellation - pass empty input_data, order is in context.pending_order
            cancel_result = await self.agents["ExecutorAgent"]._cancel_order({}, context, trace)
            # Return localized success message
            return self._build_response(
                self._get_cancel_message("success", lang),
                context, trace,
                cancel_result.data
            )
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
            return self._build_response(
                safety_result.message,
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
            msg = f"✅ **{medicine['name']}** is in stock!\n\n"
            msg += f"📦 Available: {stock} {medicine.get('unit', 'units')}\n"
            msg += f"💰 Price: ₹{medicine.get('unit_price', 'N/A')} per {medicine.get('unit', 'unit')}\n"
            if requires_rx:
                msg += f"\n⚠️ *Prescription required for this medicine*"
            msg += f"\n\nWould you like to place an order?"
        else:
            msg = f"😔 Sorry, **{medicine['name']}** is currently out of stock."
        
        return self._build_response(msg, context, trace, {
            "medicine": medicine,
            "in_stock": stock > 0,
            "prescription_required": requires_rx
        })
    
    async def _confirm_order(self, context: AgentContext, trace: Any) -> Dict[str, Any]:
        """Confirm pending order or create order from extracted prescription."""
        
        # Scenario A: Pending single order (from text conversation)
        if context.pending_order:
            exec_result = await self.agents["ExecutorAgent"].process(
                input_data={"action": "confirm_order"},
                context=context,
                trace=trace
            )
            return self._build_response(
                exec_result.message,
                context, trace,
                {"status": "confirmed", "order": exec_result.data.get("order")}
            )
        
        # Scenario B: Extracted prescription items waiting for confirmation
        extracted_rx = context.get_entity("extracted_prescription")
        if extracted_rx:
            medicines = extracted_rx.get("medicines", [])
            orders_created = []
            
            for med in medicines:
                # Create input for order creation
                order_input = {
                    "medicine": {
                        "name": med.get("name"),
                        "medicine_id": "OTC" if not med.get("name") else None, # Executor will lookup or use name
                        "prescription_required": "true" # Assume true for prescription extraction
                    },
                    "quantity": med.get("quantity", 1)
                    # "dosage": med.get("dosage") # Pass dosage if executor supported it
                }
                
                # Use executor to create order (but we do it directly to skip a step or call create_order)
                # Actually proper flow: Vision -> Safety -> Executor. 
                # For hackathon speed: Vision -> Executor (create) -> Executor (confirm)
                
                # Check Safety first (important!)
                safety_result = await self.agents["SafetyAgent"].process(
                    input_data={"medicine_name": med.get("name"), "quantity": med.get("quantity")},
                    context=context,
                    trace=trace
                )
                
                if safety_result.success and safety_result.data.get("status") in ["approved", "prescription_required"]:
                     # Note: We alreayd have the prescription trace, so we can override prescription requirement?
                     # Ideally VisionAgent confirms valid prescription.
                     
                     # Create the order
                     create_result = await self.agents["ExecutorAgent"].process(
                        input_data={"action": "create_order", "medicine": safety_result.data.get("medicine"), "quantity": med.get("quantity", 1)},
                        context=context,
                        trace=trace
                     )
                     
                     if create_result.success:
                         # Immediately confirm it since user said "Yes" to the whole list
                         # We need to temporarily set it as pending for the executor to confirm it
                         context.pending_order = create_result.data.get("order")
                         confirm_result = await self.agents["ExecutorAgent"].process(
                             input_data={"action": "confirm_order"},
                             context=context,
                             trace=trace
                         )
                         orders_created.append(confirm_result.data.get("order"))
            
            # Clear extracted prescription
            context.set_entity("extracted_prescription", None)
            
            count = len(orders_created)
            if count > 0:
                msg = f"✅ confirmed! I've placed orders for {count} medicines from your prescription."
                msg += "\n\nYou'll receive confirmation messages shortly."
                return self._build_response(msg, context, trace, {"status": "confirmed_bulk", "orders": orders_created})
            else:
                return self._build_response("I couldn't process the orders. Please try again or contact support.", context, trace, {"status": "failed"})

        return self._build_response(
            "I don't have a pending order to confirm. What would you like to order?",
            context, trace,
            {"status": "no_pending_order"}
        )
    
    async def _cancel_order(self, context: AgentContext, trace: Any) -> Dict[str, Any]:
        """Cancel pending order."""
        exec_result = await self.agents["ExecutorAgent"].process(
            input_data={"action": "cancel_order"},
            context=context,
            trace=trace
        )
        
        return self._build_response(
            exec_result.message,
            context, trace,
            {"status": "cancelled"}
        )
    
    async def get_refill_alerts(self, customer_id: Optional[str] = None) -> Dict[str, Any]:
        """Get proactive refill alerts."""
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
        
        return {
            "success": result.success,
            "alerts": result.data.get("predictions", []),
            "message": result.message
        }
    
    def _get_or_create_context(self, session_id: str, customer_id: Optional[str]) -> AgentContext:
        """Get existing session or create new one."""
        if session_id in self.sessions:
            return self.sessions[session_id]
        
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
