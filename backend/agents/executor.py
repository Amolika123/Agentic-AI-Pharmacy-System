"""
Executor Agent - Performs real-world pharmacy actions.
Handles order processing, inventory updates, and webhook notifications.
"""
from typing import Dict, Any, Optional, List
from agents.base_agent import BaseAgent, AgentResponse, AgentContext, OrderState
import csv
from pathlib import Path
from datetime import datetime
import uuid
import json


class ExecutorAgent(BaseAgent):
    """
    Executes real pharmacy actions:
    - Create/confirm orders
    - Update inventory
    - Trigger warehouse fulfillment webhooks
    - Send order confirmations (email/WhatsApp mocked)
    """
    
    def __init__(self):
        super().__init__(
            name="ExecutorAgent",
            description="Pharmacy action executor handling orders, inventory, notifications"
        )
        self.orders_file = Path(__file__).parent.parent / "data" / "orders.csv"
        self.inventory_file = Path(__file__).parent.parent / "data" / "medicines.csv"
        self._webhook_service = None
    
    @property
    def webhook_service(self):
        if self._webhook_service is None:
            from services.webhook_service import webhook_service
            self._webhook_service = webhook_service
        return self._webhook_service
    
    async def process(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Optional[Any] = None
    ) -> AgentResponse:
        """Execute an action based on input."""
        span = await self.create_span(trace, "execute_action", input_data)
        
        action = input_data.get("action", "create_order")
        
        try:
            if action == "create_order":
                result = await self._create_order(input_data, context, trace)
            elif action == "confirm_order":
                result = await self._confirm_order(input_data, context, trace)
            elif action == "cancel_order":
                result = await self._cancel_order(input_data, context, trace)
            elif action == "update_inventory":
                result = await self._update_inventory(input_data, trace)
            elif action == "send_notification":
                result = await self._send_notification(input_data, trace)
            else:
                result = AgentResponse(
                    success=False,
                    data={"error": f"Unknown action: {action}"},
                    message=f"Unknown action: {action}"
                )
            
            if span:
                span.end(output={"action": action, "success": result.success})
            
            return result
            
        except Exception as e:
            if span:
                span.end(output={"error": str(e)})
            return AgentResponse(
                success=False,
                data={"error": str(e)},
                message=f"Failed to execute {action}: {str(e)}"
            )
    
    async def _create_order(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Any
    ) -> AgentResponse:
        """Create a new order."""
        order_id = f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        medicine = context.pending_order.get("medicine", {}) if context.pending_order else input_data.get("medicine", {})
        quantity = context.pending_order.get("quantity", 1) if context.pending_order else input_data.get("quantity", 1)
        
        order = {
            "order_id": order_id,
            "customer_id": context.customer_id or "GUEST",
            "medicine_id": medicine.get("medicine_id", ""),
            "medicine_name": medicine.get("name", ""),
            "quantity": quantity,
            "unit_price": medicine.get("unit_price", 0),
            "total": float(medicine.get("unit_price", 0)) * int(quantity),
            "status": "pending_confirmation",
            "created_at": datetime.now().isoformat(),
            "prescription_verified": medicine.get("prescription_required", "false") == "false"
        }
        
        # Store in context for confirmation
        context.pending_order = order
        context.order_state = OrderState.CREATED
        
        await self.log_decision(
            trace=trace,
            decision="order_created",
            reasoning=f"Created order {order_id} for {medicine.get('name')} x{quantity}",
            confidence=1.0,
            input_data={"medicine": medicine.get("name"), "quantity": quantity},
            output_data={"order_id": order_id}
        )
        
        return AgentResponse(
            success=True,
            data={"order": order, "status": "awaiting_confirmation"},
            message=f"""📋 **Order Summary**

🆔 Order ID: `{order_id}`
💊 Medicine: {medicine.get('name', 'N/A')}
📦 Quantity: {quantity}
💰 Total: ₹{order['total']:.2f}

Would you like to confirm this order?""",
            requires_action=True,
            action_type="confirm_order"
        )
    
    async def _confirm_order(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Any
    ) -> AgentResponse:
        """Confirm and finalize an order."""
        order = context.pending_order or input_data.get("order", {})
        
        if not order:
            return AgentResponse(
                success=False,
                data={"error": "no_pending_order"},
                message="No order found to confirm."
            )
        
        order["status"] = "confirmed"
        order["confirmed_at"] = datetime.now().isoformat()
        
        # Save order to CSV
        self._save_order(order)
        
        # Update inventory
        await self._deduct_inventory(order["medicine_id"], int(order["quantity"]))
        
        # Trigger warehouse webhook
        webhook_result = await self.webhook_service.trigger_order_webhook(order)
        
        # Log for observability
        await self.log_decision(
            trace=trace,
            decision="order_confirmed",
            reasoning=f"Order {order['order_id']} confirmed and sent to warehouse",
            confidence=1.0,
            input_data={"order_id": order["order_id"]},
            output_data={"webhook_triggered": webhook_result.get("success", False)}
        )
        
        # Clear pending order and update state
        context.pending_order = None
        context.order_state = OrderState.CONFIRMED
        
        customer_name = "Customer"
        if context.customer_profile:
            customer_name = context.customer_profile.get("name", "Customer")
        
        return AgentResponse(
            success=True,
            data={
                "order": order,
                "webhook_result": webhook_result,
                "status": "confirmed"
            },
            message=f"""✅ **Order Confirmed!**

Thank you, {customer_name}! Your order has been placed successfully.

🆔 Order ID: `{order['order_id']}`
💊 {order['medicine_name']} x{order['quantity']}
💰 Total: ₹{order['total']:.2f}

📦 **Next Steps:**
• Order sent to warehouse for fulfillment
• Expected ready for pickup: 30 minutes
• You'll receive a confirmation SMS/WhatsApp shortly

Stay healthy! 💚"""
        )
    
    async def _cancel_order(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Any
    ) -> AgentResponse:
        """Cancel an order and restore inventory if already confirmed."""
        order = context.pending_order or input_data.get("order")
        order_id = input_data.get("order_id")
        
        # If order_id provided, find order in history
        if order_id and not order:
            order = await self.get_order_status(order_id)
        
        if not order:
            return AgentResponse(
                success=False,
                data={"error": "no_order_found"},
                message="No order found to cancel. Please provide a valid order ID or you may not have any pending orders.\n\nIs there anything else I can help you with?"
            )
        
        # Check if order can be cancelled based on state
        if context.order_state == OrderState.SENT:
            # Order already dispatched - attempt cancellation with warning
            return AgentResponse(
                success=False,
                data={"error": "order_dispatched", "order_id": order.get("order_id")},
                message=f"⚠️ Order `{order.get('order_id')}` has already been dispatched and cannot be cancelled.\n\nPlease contact our support team for assistance with returns or refunds.\n\nIs there anything else I can help with?"
            )
        
        was_confirmed = order.get("status") == "confirmed"
        medicine_id = order.get("medicine_id")
        quantity = int(order.get("quantity", 0))
        
        # Update order status
        order["status"] = "cancelled"
        order["cancelled_at"] = datetime.now().isoformat()
        
        # If order was confirmed, restore inventory
        inventory_restored = False
        if was_confirmed and medicine_id and quantity > 0:
            try:
                await self._restore_inventory(medicine_id, quantity)
                inventory_restored = True
            except Exception as e:
                print(f"[ERROR] Failed to restore inventory: {e}")
        
        # Update order in CSV
        self._update_order_status(order.get("order_id"), "cancelled")
        
        # Clear from context and update state
        context.pending_order = None
        context.order_state = OrderState.CANCELLED
        
        await self.log_decision(
            trace=trace,
            decision="order_cancelled",
            reasoning=f"Customer cancelled order. Inventory restored: {inventory_restored}",
            confidence=1.0,
            input_data={"order_id": order.get("order_id")},
            output_data={"inventory_restored": inventory_restored, "quantity": quantity}
        )
        
        message = f"✅ Order `{order.get('order_id')}` has been cancelled."
        if inventory_restored:
            message += f"\n📦 {quantity} units of {order.get('medicine_name')} restored to inventory."
        message += "\n\nIs there anything else I can help you with?"
        
        return AgentResponse(
            success=True,
            data={"status": "cancelled", "inventory_restored": inventory_restored},
            message=message
        )
    
    async def _update_inventory(
        self,
        input_data: Dict[str, Any],
        trace: Any
    ) -> AgentResponse:
        """Update medicine inventory levels."""
        medicine_id = input_data.get("medicine_id")
        change = input_data.get("change", 0)  # Positive for add, negative for deduct
        
        # In a real system, this would update the database
        # For now, we log the action
        await self.log_decision(
            trace=trace,
            decision="inventory_updated",
            reasoning=f"Updated inventory for {medicine_id} by {change}",
            confidence=1.0,
            input_data=input_data,
            output_data={"medicine_id": medicine_id, "change": change}
        )
        
        return AgentResponse(
            success=True,
            data={"medicine_id": medicine_id, "change": change},
            message=f"Inventory updated for {medicine_id}"
        )
    
    async def _send_notification(
        self,
        input_data: Dict[str, Any],
        trace: Any
    ) -> AgentResponse:
        """Send notification via email/WhatsApp (mocked)."""
        channel = input_data.get("channel", "email")
        recipient = input_data.get("recipient", "")
        message = input_data.get("message", "")
        
        # Mock sending - in production, integrate with actual services
        notification_result = {
            "channel": channel,
            "recipient": recipient,
            "status": "sent",
            "timestamp": datetime.now().isoformat()
        }
        
        await self.log_decision(
            trace=trace,
            decision="notification_sent",
            reasoning=f"Sent {channel} notification to {recipient}",
            confidence=1.0,
            input_data={"channel": channel, "recipient": recipient},
            output_data=notification_result
        )
        
        return AgentResponse(
            success=True,
            data=notification_result,
            message=f"Notification sent via {channel}"
        )
    
    def _save_order(self, order: Dict[str, Any]):
        """Save order to CSV file."""
        file_exists = self.orders_file.exists()
        
        fieldnames = [
            "order_id", "customer_id", "medicine_id", "medicine_name",
            "quantity", "unit_price", "total", "status",
            "created_at", "confirmed_at", "prescription_verified"
        ]
        
        with open(self.orders_file, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            writer.writerow({k: order.get(k, "") for k in fieldnames})
    
    async def _deduct_inventory(self, medicine_id: str, quantity: int):
        """Deduct quantity from inventory - updates CSV."""
        await self._update_medicine_stock(medicine_id, -quantity)
        print(f"[INVENTORY] Deducted {quantity} units of {medicine_id}")
    
    async def _restore_inventory(self, medicine_id: str, quantity: int):
        """Restore quantity to inventory - updates CSV."""
        await self._update_medicine_stock(medicine_id, quantity)
        print(f"[INVENTORY] Restored {quantity} units of {medicine_id}")
    
    async def _update_medicine_stock(self, medicine_id: str, change: int):
        """Update medicine stock in CSV file."""
        if not self.inventory_file.exists():
            return
        
        # Read all medicines
        medicines = []
        with open(self.inventory_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            medicines = list(reader)
        
        # Update the specific medicine
        for med in medicines:
            if med.get("medicine_id") == medicine_id or med.get("name", "").lower() == medicine_id.lower():
                current = int(med.get("stock_quantity", 0))
                med["stock_quantity"] = str(max(0, current + change))
                break
        
        # Write back
        with open(self.inventory_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(medicines)
    
    def _update_order_status(self, order_id: str, new_status: str):
        """Update order status in CSV."""
        if not self.orders_file.exists():
            return
        
        orders = []
        fieldnames = None
        with open(self.orders_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            orders = list(reader)
        
        for order in orders:
            if order.get("order_id") == order_id:
                order["status"] = new_status
                order["cancelled_at"] = datetime.now().isoformat() if new_status == "cancelled" else ""
                break
        
        with open(self.orders_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames or [])
            if fieldnames:
                writer.writeheader()
            writer.writerows(orders)
    
    async def get_order_status(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get status of an order."""
        if not self.orders_file.exists():
            return None
        
        with open(self.orders_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("order_id") == order_id:
                    return row
        return None


# Singleton instance
executor_agent = ExecutorAgent()
