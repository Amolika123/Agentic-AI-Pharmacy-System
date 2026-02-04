"""
Predictive Agent - Proactive refill intelligence for pharmacy.
Analyzes customer order history to predict refill needs and initiate alerts.
"""
from typing import Dict, Any, Optional, List
from agents.base_agent import BaseAgent, AgentResponse, AgentContext
import csv
from pathlib import Path
from datetime import datetime, timedelta


class PredictiveAgent(BaseAgent):
    """
    Proactively identifies customers who may need medicine refills
    based on their order history and prescription patterns.
    """
    
    def __init__(self):
        super().__init__(
            name="PredictiveAgent",
            description="Proactive pharmacy assistant predicting refill needs"
        )
        self.order_history = self._load_order_history()
        self.customers = self._load_customers()
        self.medicines = self._load_medicines()
    
    def _load_order_history(self) -> List[Dict]:
        """Load all order history."""
        orders = []
        csv_path = Path(__file__).parent.parent / "data" / "order_history.csv"
        if csv_path.exists():
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                orders = list(reader)
        return orders
    
    def _load_customers(self) -> Dict[str, Dict]:
        """Load customer profiles."""
        customers = {}
        csv_path = Path(__file__).parent.parent / "data" / "customers.csv"
        if csv_path.exists():
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    customers[row["customer_id"]] = row
        return customers
    
    def _load_medicines(self) -> Dict[str, Dict]:
        """Load medicine data."""
        medicines = {}
        csv_path = Path(__file__).parent.parent / "data" / "medicines.csv"
        if csv_path.exists():
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    medicines[row["medicine_id"]] = row
        return medicines
    
    async def process(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Optional[Any] = None
    ) -> AgentResponse:
        """
        Process refill prediction request.
        Can analyze a specific customer or generate all pending refills.
        """
        span = await self.create_span(trace, "predict_refills", input_data)
        
        try:
            customer_id = input_data.get("customer_id") or context.customer_id
            
            if customer_id:
                # Analyze specific customer
                predictions = await self._analyze_customer(customer_id)
            else:
                # Generate all refill alerts
                predictions = await self._generate_all_refill_alerts()
            
            await self.log_decision(
                trace=trace,
                decision="refill_prediction",
                reasoning=f"Analyzed {len(predictions)} potential refills",
                confidence=0.85,
                input_data=input_data,
                output_data={"predictions_count": len(predictions)}
            )
            
            if span:
                span.end(output={"predictions": len(predictions)})
            
            return AgentResponse(
                success=True,
                data={"predictions": predictions},
                message=self._format_predictions_message(predictions, customer_id),
                requires_action=len(predictions) > 0,
                action_type="refill_reminder" if predictions else None
            )
            
        except Exception as e:
            if span:
                span.end(output={"error": str(e)})
            return AgentResponse(
                success=False,
                data={"error": str(e)},
                message="Failed to generate refill predictions."
            )
    
    async def _analyze_customer(self, customer_id: str) -> List[Dict[str, Any]]:
        """Analyze a specific customer's refill needs."""
        predictions = []
        customer = self.customers.get(customer_id)
        if not customer:
            return predictions
        
        # Get customer's prescription orders
        customer_orders = [o for o in self.order_history if o.get("customer_id") == customer_id]
        
        # Group by medicine
        medicine_orders = {}
        for order in customer_orders:
            med_id = order.get("medicine_id")
            if med_id not in medicine_orders:
                medicine_orders[med_id] = []
            medicine_orders[med_id].append(order)
        
        # Analyze each medicine
        for med_id, orders in medicine_orders.items():
            latest = max(orders, key=lambda x: x.get("order_date", ""))
            prediction = self._predict_refill_date(latest, customer)
            
            if prediction:
                medicine = self.medicines.get(med_id, {})
                predictions.append({
                    "customer_id": customer_id,
                    "customer_name": customer.get("name", "Customer"),
                    "medicine_id": med_id,
                    "medicine_name": medicine.get("name", latest.get("medicine_name")),
                    "last_order_date": latest.get("order_date"),
                    "days_supply": latest.get("days_supply"),
                    "predicted_refill_date": prediction["date"],
                    "days_until_refill": prediction["days_until"],
                    "urgency": prediction["urgency"],
                    "frequency": latest.get("dosage_frequency")
                })
        
        return predictions
    
    async def _generate_all_refill_alerts(self) -> List[Dict[str, Any]]:
        """Generate refill alerts for all customers."""
        all_predictions = []
        
        for customer_id in self.customers.keys():
            predictions = await self._analyze_customer(customer_id)
            all_predictions.extend(predictions)
        
        # Sort by urgency
        urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        all_predictions.sort(key=lambda x: urgency_order.get(x.get("urgency", "low"), 4))
        
        return all_predictions
    
    def _predict_refill_date(self, order: Dict, customer: Dict) -> Optional[Dict[str, Any]]:
        """Calculate when a refill will be needed."""
        try:
            order_date = datetime.strptime(order.get("order_date", ""), "%Y-%m-%d")
            days_supply = order.get("days_supply", "30")
            
            if days_supply == "N/A" or not days_supply:
                return None
            
            days = int(days_supply)
            refill_date = order_date + timedelta(days=days)
            days_until = (refill_date - datetime.now()).days
            
            # Determine urgency
            if days_until <= 0:
                urgency = "critical"  # Overdue
            elif days_until <= 3:
                urgency = "high"
            elif days_until <= 7:
                urgency = "medium"
            elif days_until <= 14:
                urgency = "low"
            else:
                return None  # Too far out
            
            return {
                "date": refill_date.strftime("%Y-%m-%d"),
                "days_until": days_until,
                "urgency": urgency
            }
            
        except Exception:
            return None
    
    def _format_predictions_message(self, predictions: List[Dict], customer_id: Optional[str]) -> str:
        """Format predictions into a user-friendly message."""
        if not predictions:
            if customer_id:
                return "No upcoming refills detected for this customer."
            return "No urgent refill alerts at this time."
        
        critical = [p for p in predictions if p.get("urgency") == "critical"]
        high = [p for p in predictions if p.get("urgency") == "high"]
        
        msg_parts = []
        
        if critical:
            msg_parts.append(f"🚨 **{len(critical)} OVERDUE** refills:")
            for p in critical[:3]:
                msg_parts.append(f"  • {p['customer_name']}: {p['medicine_name']}")
        
        if high:
            msg_parts.append(f"\n⚠️ **{len(high)} URGENT** (within 3 days):")
            for p in high[:3]:
                msg_parts.append(f"  • {p['customer_name']}: {p['medicine_name']} (due in {p['days_until']} days)")
        
        if len(predictions) > 6:
            msg_parts.append(f"\n... and {len(predictions) - 6} more refills pending")
        
        return "\n".join(msg_parts)
    
    async def get_customer_refill_summary(self, customer_id: str) -> Dict[str, Any]:
        """Get a summary of a customer's refill needs for conversation."""
        predictions = await self._analyze_customer(customer_id)
        customer = self.customers.get(customer_id, {})
        
        return {
            "customer_name": customer.get("name", "Customer"),
            "chronic_conditions": customer.get("chronic_conditions", ""),
            "upcoming_refills": predictions,
            "message": self._format_predictions_message(predictions, customer_id)
        }
    
    def reload_data(self):
        """Reload data from CSV files."""
        self.order_history = self._load_order_history()
        self.customers = self._load_customers()
        self.medicines = self._load_medicines()


# Singleton instance
predictive_agent = PredictiveAgent()
