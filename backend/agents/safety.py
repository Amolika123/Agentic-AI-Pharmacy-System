"""
Safety Agent - Enforces pharmacy policies and prescription requirements.
Uses medicines.csv as source of truth for prescription flags and stock levels.
"""
from typing import Dict, Any, Optional, List
from agents.base_agent import BaseAgent, AgentResponse, AgentContext
import csv
from pathlib import Path
from datetime import datetime, timedelta


class SafetyAgent(BaseAgent):
    """
    Enforces pharmacy safety rules:
    - Prescription verification for controlled medicines
    - Stock availability checks
    - Allergy warnings based on customer profile
    - Quantity limits and early refill prevention
    """
    
    def __init__(self):
        super().__init__(
            name="SafetyAgent",
            description="Pharmacy safety enforcer checking prescriptions, stock, allergies"
        )
        self.medicines = self._load_medicines()
        self.policies = self._load_policies()
        self.order_history = self._load_order_history()
    
    def _load_medicines(self) -> Dict[str, Dict]:
        """Load medicine master data from CSV."""
        medicines = {}
        csv_path = Path(__file__).parent.parent / "data" / "medicines.csv"
        if csv_path.exists():
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    medicines[row["medicine_id"]] = row
                    # Also index by name for easy lookup
                    medicines[row["name"].lower()] = row
                    if row.get("generic_name"):
                        medicines[row["generic_name"].lower()] = row
        return medicines
    
    def _load_policies(self) -> List[Dict]:
        """Load safety policies from CSV."""
        policies = []
        csv_path = Path(__file__).parent.parent / "data" / "policies.csv"
        if csv_path.exists():
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                policies = [row for row in reader if row.get("active") == "true"]
        return policies
    
    def _load_order_history(self) -> Dict[str, List[Dict]]:
        """Load order history indexed by customer."""
        history = {}
        csv_path = Path(__file__).parent.parent / "data" / "order_history.csv"
        if csv_path.exists():
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cust_id = row.get("customer_id", "")
                    if cust_id not in history:
                        history[cust_id] = []
                    history[cust_id].append(row)
        return history
    
    async def process(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Optional[Any] = None
    ) -> AgentResponse:
        """
        Validate an order request against safety policies.
        Returns approval, denial, or requirements.
        """
        span = await self.create_span(trace, "safety_check", input_data)
        
        try:
            medicine_name = input_data.get("medicine_name") or context.extracted_entities.get("medicine_name")
            quantity = input_data.get("quantity") or context.extracted_entities.get("quantity", 1)
            customer_id = context.customer_id
            
            if not medicine_name:
                return AgentResponse(
                    success=False,
                    data={"error": "no_medicine_specified"},
                    message="Please specify which medicine you'd like to order."
                )
            
            # Find medicine in database
            medicine = self._find_medicine(medicine_name)
            if not medicine:
                return AgentResponse(
                    success=False,
                    data={"error": "medicine_not_found", "searched": medicine_name},
                    message=f"Sorry, I couldn't find '{medicine_name}' in our inventory. Could you check the spelling?"
                )
            
            # Run all safety checks
            results = await self._run_safety_checks(medicine, quantity, context)
            
            # Determine overall decision
            decision = self._make_decision(results)
            
            # Log decision for observability
            await self.log_decision(
                trace=trace,
                decision=decision["action"],
                reasoning=decision["reasoning"],
                confidence=decision["confidence"],
                input_data={"medicine": medicine["name"], "quantity": quantity},
                output_data={"checks": results, "decision": decision["action"]}
            )
            
            if span:
                span.end(output={"decision": decision["action"], "checks_passed": len([r for r in results if r["passed"]])})
            
            # Build response based on decision
            if decision["action"] == "approved":
                context.pending_order = {
                    "medicine": medicine,
                    "quantity": quantity,
                    "total": float(medicine.get("unit_price", 0)) * int(quantity)
                }
                return AgentResponse(
                    success=True,
                    data={"status": "approved", "medicine": medicine, "quantity": quantity, "checks": results},
                    message=f"✅ Order validated! {medicine['name']} x{quantity} is available and ready.",
                    next_agent="ExecutorAgent",
                    requires_action=True,
                    action_type="confirm_order"
                )
            
            elif decision["action"] == "require_prescription":
                context.requires_prescription.append(medicine["name"])
                return AgentResponse(
                    success=True,
                    data={"status": "prescription_required", "medicine": medicine, "checks": results},
                    message=f"⚠️ **Prescription Required**\n\n{medicine['name']} is a prescription medicine. Please upload a valid prescription to proceed.",
                    requires_action=True,
                    action_type="upload_prescription"
                )
            
            elif decision["action"] == "out_of_stock":
                return AgentResponse(
                    success=False,
                    data={"status": "out_of_stock", "medicine": medicine, "checks": results},
                    message=f"😔 Sorry, {medicine['name']} is currently out of stock. We expect restocking soon."
                )
            
            elif decision["action"] == "allergy_warning":
                return AgentResponse(
                    success=True,
                    data={"status": "allergy_warning", "medicine": medicine, "checks": results},
                    message=f"⚠️ **Allergy Alert**\n\nBased on your profile, you have a recorded allergy that may be affected by {medicine['name']}. Please confirm you want to proceed or consult your doctor.",
                    requires_action=True,
                    action_type="confirm_with_warning"
                )
            
            else:  # denied or other
                return AgentResponse(
                    success=False,
                    data={"status": "denied", "checks": results, "reason": decision["reasoning"]},
                    message=f"❌ Order cannot be processed: {decision['reasoning']}"
                )
                
        except Exception as e:
            if span:
                span.end(output={"error": str(e)})
            return AgentResponse(
                success=False,
                data={"error": str(e)},
                message="An error occurred during safety validation. Please try again."
            )
    
    def _find_medicine(self, name: str) -> Optional[Dict]:
        """Find medicine by name, generic name, or partial match."""
        name_lower = name.lower().strip()
        
        # Exact match
        if name_lower in self.medicines:
            return self.medicines[name_lower]
        
        # Partial match
        for key, med in self.medicines.items():
            if isinstance(med, dict):
                if name_lower in key or name_lower in med.get("name", "").lower():
                    return med
        
        return None
    
    async def _run_safety_checks(
        self,
        medicine: Dict,
        quantity: int,
        context: AgentContext
    ) -> List[Dict[str, Any]]:
        """Run all safety policy checks."""
        results = []
        
        # 1. Stock Check
        stock = int(medicine.get("stock_quantity", 0))
        try:
            qty = int(quantity)
        except:
            qty = 1
        
        results.append({
            "check": "stock_availability",
            "passed": stock >= qty,
            "details": f"Requested: {qty}, Available: {stock}",
            "priority": 1
        })
        
        # 2. Prescription Check
        requires_rx = medicine.get("prescription_required", "").lower() == "true"
        has_prescription = context.extracted_entities.get("prescription_verified", False)
        
        results.append({
            "check": "prescription_required",
            "passed": not requires_rx or has_prescription,
            "details": f"Prescription required: {requires_rx}, Verified: {has_prescription}",
            "priority": 1,
            "requires_prescription": requires_rx and not has_prescription
        })
        
        # 3. Allergy Check (if customer profile available)
        if context.customer_profile:
            allergies = context.customer_profile.get("allergies", "").lower()
            medicine_category = medicine.get("category", "").lower()
            medicine_name = medicine.get("name", "").lower()
            
            # Check for common allergy conflicts
            allergy_conflict = False
            if "penicillin" in allergies and "amoxicillin" in medicine_name:
                allergy_conflict = True
            if "sulfa" in allergies and "sulfamethoxazole" in medicine_name:
                allergy_conflict = True
            if "aspirin" in allergies and "aspirin" in medicine_name:
                allergy_conflict = True
            
            results.append({
                "check": "allergy_check",
                "passed": not allergy_conflict,
                "details": f"Customer allergies: {allergies}",
                "priority": 1,
                "allergy_warning": allergy_conflict
            })
        
        # 4. Quantity Limit Check
        max_qty = 90  # Default max
        results.append({
            "check": "quantity_limit",
            "passed": qty <= max_qty,
            "details": f"Requested: {qty}, Maximum: {max_qty}",
            "priority": 2
        })
        
        # 5. Early Refill Check (for prescription medicines)
        if requires_rx and context.customer_id:
            last_order = self._get_last_order(context.customer_id, medicine.get("medicine_id"))
            if last_order:
                days_since = self._days_since_order(last_order.get("order_date"))
                min_days = 14  # Minimum days between refills
                
                results.append({
                    "check": "refill_timing",
                    "passed": days_since >= min_days,
                    "details": f"Last order: {days_since} days ago, Minimum: {min_days} days",
                    "priority": 2
                })
        
        return results
    
    def _make_decision(self, results: List[Dict]) -> Dict[str, Any]:
        """Make final decision based on all safety checks."""
        # Check for prescription requirement first
        for r in results:
            if r.get("requires_prescription"):
                return {
                    "action": "require_prescription",
                    "reasoning": "This medicine requires a valid prescription",
                    "confidence": 1.0
                }
        
        # Check for stock issues
        for r in results:
            if r["check"] == "stock_availability" and not r["passed"]:
                return {
                    "action": "out_of_stock",
                    "reasoning": "Medicine is out of stock",
                    "confidence": 1.0
                }
        
        # Check for allergy warnings
        for r in results:
            if r.get("allergy_warning"):
                return {
                    "action": "allergy_warning",
                    "reasoning": "Customer has a recorded allergy that may conflict",
                    "confidence": 0.9
                }
        
        # Check for other failures
        failed = [r for r in results if not r["passed"]]
        if failed:
            reasons = ", ".join([r["check"] for r in failed])
            return {
                "action": "denied",
                "reasoning": f"Failed checks: {reasons}",
                "confidence": 0.85
            }
        
        return {
            "action": "approved",
            "reasoning": "All safety checks passed",
            "confidence": 0.95
        }
    
    def _get_last_order(self, customer_id: str, medicine_id: str) -> Optional[Dict]:
        """Get customer's last order of a specific medicine."""
        orders = self.order_history.get(customer_id, [])
        for order in reversed(orders):
            if order.get("medicine_id") == medicine_id:
                return order
        return None
    
    def _days_since_order(self, order_date: str) -> int:
        """Calculate days since an order."""
        try:
            order_dt = datetime.strptime(order_date, "%Y-%m-%d")
            return (datetime.now() - order_dt).days
        except:
            return 999  # If parsing fails, assume old enough
    
    def reload_data(self):
        """Reload data from CSV files."""
        self.medicines = self._load_medicines()
        self.policies = self._load_policies()
        self.order_history = self._load_order_history()


# Singleton instance
safety_agent = SafetyAgent()
