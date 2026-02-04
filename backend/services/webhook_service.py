"""
Webhook Service for Agentic Pharmacy System.
Triggers warehouse fulfillment and sends notifications.
"""
import httpx
from typing import Dict, Any, Optional
from datetime import datetime
import json


class WebhookService:
    """
    Handles webhook triggers for:
    - Warehouse fulfillment requests
    - Email/SMS/WhatsApp notifications
    - External integrations (n8n, Zapier)
    """
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        # Mock webhook URLs - in production, configure these
        self.warehouse_webhook = "https://webhook.site/pharmacy-warehouse"  # Mock
        self.notification_webhook = "https://webhook.site/pharmacy-notify"  # Mock
        self.enabled = True
    
    async def trigger_order_webhook(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Trigger warehouse fulfillment webhook when order is confirmed.
        """
        payload = {
            "event": "order_confirmed",
            "timestamp": datetime.now().isoformat(),
            "order": {
                "order_id": order.get("order_id"),
                "customer_id": order.get("customer_id"),
                "medicine": order.get("medicine_name"),
                "quantity": order.get("quantity"),
                "total": order.get("total"),
                "status": order.get("status")
            },
            "fulfillment": {
                "type": "pickup",
                "expected_ready": "30 minutes"
            }
        }
        
        # Log the webhook (in production, actually send it)
        print(f"[WEBHOOK] Order fulfillment triggered: {json.dumps(payload, indent=2)}")
        
        # Mock successful response
        return {
            "success": True,
            "webhook": "warehouse_fulfillment",
            "timestamp": datetime.now().isoformat(),
            "mock": True,
            "payload": payload
        }
    
    async def send_order_confirmation(
        self,
        channel: str,
        recipient: str,
        order: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Send order confirmation via email/SMS/WhatsApp.
        """
        message = self._build_confirmation_message(order)
        
        payload = {
            "event": "notification_sent",
            "channel": channel,
            "recipient": recipient,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"[NOTIFICATION] {channel} sent to {recipient}")
        
        return {
            "success": True,
            "channel": channel,
            "recipient": recipient,
            "mock": True
        }
    
    async def send_refill_reminder(
        self,
        customer: Dict[str, Any],
        medicines: list
    ) -> Dict[str, Any]:
        """
        Send proactive refill reminder to customer.
        """
        medicine_list = ", ".join([m.get("medicine_name", "") for m in medicines])
        
        message = f"""
        Hello {customer.get('name', 'Customer')},
        
        Based on your prescription history, you may need to refill:
        {medicine_list}
        
        Would you like us to prepare your order?
        
        Reply YES to confirm or visit our pharmacy.
        
        - Your Pharmacy Team
        """
        
        print(f"[REMINDER] Refill reminder sent to {customer.get('phone')}")
        
        return {
            "success": True,
            "type": "refill_reminder",
            "customer_id": customer.get("customer_id"),
            "mock": True
        }
    
    def _build_confirmation_message(self, order: Dict[str, Any]) -> str:
        """Build order confirmation message."""
        return f"""
🏥 Order Confirmed - {order.get('order_id')}

Medicine: {order.get('medicine_name')}
Quantity: {order.get('quantity')}
Total: ₹{order.get('total', 0):.2f}

Ready for pickup in 30 minutes at your nearest outlet.

Thank you for choosing our pharmacy!
        """.strip()
    
    async def close(self):
        await self.client.aclose()


webhook_service = WebhookService()
