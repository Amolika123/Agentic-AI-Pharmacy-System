"""
Symptom Agent - Provides OTC medicine suggestions based on symptoms.
Does NOT diagnose diseases - only suggests safe over-the-counter options.
"""
from typing import Dict, Any, Optional, List
from agents.base_agent import BaseAgent, AgentResponse, AgentContext


class SymptomAgent(BaseAgent):
    """
    Suggests safe OTC medicines based on symptoms.
    NEVER diagnoses diseases - only provides general guidance.
    """
    
    def __init__(self):
        super().__init__(
            name="SymptomAgent",
            description="OTC medicine suggester based on common symptoms"
        )
        
        # Safe OTC recommendations (non-prescription only)
        self.symptom_recommendations = {
            "headache": {
                "medicines": ["Paracetamol 500mg", "Ibuprofen 400mg", "Aspirin 75mg"],
                "warnings": ["If headache persists for more than 3 days, consult a doctor", "Aspirin 75mg: Adults only (not for children under 16)"],
                "usage": "Take 1 tablet every 4-6 hours. Maximum 4 tablets per day.",
                "avoid_if": ["liver problems", "stomach ulcers", "aspirin allergy"]
            },
            "fever": {
                "medicines": ["Paracetamol 500mg", "Ibuprofen 400mg"],
                "warnings": ["If fever exceeds 103°F or lasts more than 3 days, seek medical attention"],
                "usage": "Take 1 tablet every 4-6 hours as needed.",
                "avoid_if": ["liver problems", "aspirin allergy"]
            },
            "cold": {
                "medicines": ["Cetirizine 10mg", "Cough Syrup", "Vitamin C"],
                "warnings": ["If symptoms worsen or persist beyond 7 days, consult a doctor"],
                "usage": "Take as directed. Stay hydrated and rest.",
                "avoid_if": []
            },
            "cough": {
                "medicines": ["Cough Syrup"],
                "warnings": ["If cough produces blood or lasts more than 2 weeks, see a doctor immediately"],
                "usage": "Take 10ml every 6-8 hours. Avoid cold drinks.",
                "avoid_if": ["diabetes (for sugar-based syrups)"]
            },
            "allergy": {
                "medicines": ["Cetirizine 10mg"],
                "warnings": ["If severe allergic reaction occurs, seek emergency care"],
                "usage": "Take 1 tablet daily. May cause drowsiness.",
                "avoid_if": []
            },
            "sneezing": {
                "medicines": ["Cetirizine 10mg"],
                "warnings": ["If accompanied by high fever, consult a doctor"],
                "usage": "Take 1 tablet daily. Best taken at night due to drowsiness.",
                "avoid_if": []
            },
            "stomach ache": {
                "medicines": ["Omeprazole 20mg", "Pantoprazole 40mg", "ORS Sachets"],
                "warnings": ["If pain is severe or persistent, consult a doctor. Could indicate serious condition.", "ORS helps if dehydration is suspected"],
                "usage": "Take before meals for best effect. ORS: Dissolve in water and sip frequently.",
                "avoid_if": ["kidney problems"]
            },
            "acidity": {
                "medicines": ["Omeprazole 20mg", "Pantoprazole 40mg", "Ranitidine 150mg"],
                "warnings": ["Avoid spicy and oily foods. Eat smaller meals."],
                "usage": "Take 1 tablet 30 minutes before meals.",
                "avoid_if": []
            },
            "body pain": {
                "medicines": ["Paracetamol 500mg", "Ibuprofen 400mg", "Aspirin 75mg", "Diclofenac Gel"],
                "warnings": ["If pain follows an injury or is severe, seek medical evaluation", "Aspirin 75mg: Adults only (not for children under 16)"],
                "usage": "Take with food to avoid stomach upset. Apply gel locally for external use.",
                "avoid_if": ["stomach ulcers", "heart conditions", "aspirin allergy"]
            },
            "diarrhea": {
                "medicines": ["ORS Sachets"],
                "warnings": ["Stay hydrated! If bloody or lasts more than 2 days, see a doctor."],
                "usage": "Dissolve ORS in clean water. Drink frequently.",
                "avoid_if": []
            },
            "nausea": {
                "medicines": ["Ginger tea", "ORS Sachets"],
                "warnings": ["If accompanied by severe pain or vomiting blood, emergency care needed"],
                "usage": "Sip slowly. Avoid heavy foods.",
                "avoid_if": []
            },
            "weakness": {
                "medicines": ["Vitamin B Complex", "Vitamin D3 1000IU", "Multivitamin Daily"],
                "warnings": ["If weakness is persistent or severe, consult a doctor to rule out underlying conditions"],
                "usage": "Take 1 tablet daily with food for best absorption.",
                "avoid_if": []
            },
            "deficiency": {
                "medicines": ["Vitamin B Complex", "Vitamin D3 1000IU", "Multivitamin Daily"],
                "warnings": ["For specific deficiency treatment, a doctor's assessment is recommended"],
                "usage": "Take 1 tablet daily with food for best absorption.",
                "avoid_if": []
            },
            "fatigue": {
                "medicines": ["Vitamin B Complex", "Vitamin D3 1000IU", "Multivitamin Daily"],
                "warnings": ["If fatigue is chronic, consult a doctor to check for underlying conditions"],
                "usage": "Take 1 tablet daily with food. Also ensure adequate sleep and hydration.",
                "avoid_if": []
            }
        }
    
    async def process(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Optional[Any] = None
    ) -> AgentResponse:
        """Process symptom and provide OTC suggestions."""
        span = await self.create_span(trace, "symptom_analysis", input_data)
        
        try:
            symptoms = input_data.get("symptoms", [])
            if isinstance(symptoms, str):
                symptoms = [symptoms]
            
            symptoms = [s.lower().strip() for s in symptoms]
            
            # Check for customer allergies
            customer_allergies = []
            if context.customer_profile:
                allergies_str = context.customer_profile.get("allergies", "")
                customer_allergies = [a.strip().lower() for a in allergies_str.split(";") if a.strip() and a.strip().lower() != "none"]
            
            recommendations = []
            warnings = []
            requires_doctor = False
            
            for symptom in symptoms:
                rec = self._get_recommendation(symptom, customer_allergies)
                if rec:
                    recommendations.append(rec)
                    if rec.get("requires_doctor"):
                        requires_doctor = True
                else:
                    # Unknown symptom - recommend doctor
                    warnings.append(f"For '{symptom}', I recommend consulting a doctor for proper evaluation.")
                    requires_doctor = True
            
            await self.log_decision(
                trace=trace,
                decision="symptom_recommendation",
                reasoning=f"Analyzed {len(symptoms)} symptoms, provided {len(recommendations)} OTC recommendations",
                confidence=0.85 if recommendations else 0.5,
                input_data={"symptoms": symptoms},
                output_data={"recommendations": len(recommendations), "requires_doctor": requires_doctor}
            )
            
            if span:
                span.end(output={"recommendations": len(recommendations)})
            
            message = self._format_response(recommendations, warnings, requires_doctor, customer_allergies)
            
            return AgentResponse(
                success=True,
                data={
                    "recommendations": recommendations,
                    "warnings": warnings,
                    "requires_doctor": requires_doctor,
                    "allergies_checked": customer_allergies
                },
                message=message,
                requires_action=not requires_doctor,
                action_type="order_otc" if not requires_doctor else None
            )
            
        except Exception as e:
            if span:
                span.end(output={"error": str(e)})
            return AgentResponse(
                success=False,
                data={"error": str(e)},
                message="I couldn't process your symptoms. Please describe them again."
            )
    
    def _get_recommendation(self, symptom: str, allergies: List[str]) -> Optional[Dict[str, Any]]:
        """Get recommendation for a symptom, considering allergies."""
        # Find matching symptom
        matched = None
        for key in self.symptom_recommendations:
            if key in symptom or symptom in key:
                matched = self.symptom_recommendations[key]
                break
        
        if not matched:
            return None
        
        # Filter medicines based on allergies
        safe_medicines = []
        for med in matched["medicines"]:
            med_lower = med.lower()
            is_safe = True
            for allergy in allergies:
                if allergy in med_lower or (allergy == "aspirin" and "ibuprofen" in med_lower):
                    is_safe = False
                    break
            if is_safe:
                safe_medicines.append(med)
        
        return {
            "symptom": symptom,
            "medicines": safe_medicines,
            "warnings": matched["warnings"],
            "usage": matched["usage"],
            "avoid_if": matched["avoid_if"],
            "requires_doctor": len(safe_medicines) == 0
        }
    
    def _format_response(
        self,
        recommendations: List[Dict],
        warnings: List[str],
        requires_doctor: bool,
        allergies: List[str]
    ) -> str:
        """Format recommendations into user-friendly message."""
        
        msg = ["💊 **Based on your symptoms, here are some suggestions:**\n"]
        msg.append("*Note: This is general guidance, NOT a medical diagnosis.*\n")
        
        if allergies:
            msg.append(f"⚠️ *Considering your allergies: {', '.join(allergies)}*\n")
        
        for rec in recommendations:
            msg.append(f"**For {rec['symptom'].title()}:**")
            if rec["medicines"]:
                for med in rec["medicines"]:
                    msg.append(f"  • {med}")
                msg.append(f"  📝 *{rec['usage']}*")
            else:
                msg.append("  ⚠️ No safe OTC options available due to your allergies")
            
            for warn in rec.get("warnings", []):
                msg.append(f"  ⚠️ {warn}")
            msg.append("")
        
        for warn in warnings:
            msg.append(f"⚠️ {warn}")
        
        if requires_doctor:
            msg.append("\n🏥 **Please consult a doctor for proper evaluation and prescription.**")
        else:
            msg.append("\nWould you like to order any of these medicines?")
        
        return "\n".join(msg)


# Singleton instance
symptom_agent = SymptomAgent()
