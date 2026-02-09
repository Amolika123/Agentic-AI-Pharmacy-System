import csv
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

class CartService:
    """
    Centralized service for handling all shopping cart operations.
    Ensures consistent file path resolution and logic across API and Agents.
    """
    
    @staticmethod
    def _get_cart_path() -> Path:
        """
        Resolve the absolute path to backend/data/carts.csv.
        
        Resolution logic:
        This file is in backend/services/cart_service.py
        Path(__file__).parent (services) -> .parent (backend) -> / data / carts.csv
        """
        return Path(__file__).parent.parent / "data" / "carts.csv"

    @classmethod
    def load_carts(cls) -> List[Dict[str, Any]]:
        """Load all cart items from the CSV file."""
        cart_path = cls._get_cart_path()
        carts = []
        if cart_path.exists():
            try:
                with open(cart_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    carts = list(reader)
            except Exception as e:
                print(f"[CartService] Error loading carts: {e}")
        return carts

    @classmethod
    def save_carts(cls, carts: List[Dict[str, Any]]) -> bool:
        """Save the list of cart items to the CSV file."""
        cart_path = cls._get_cart_path()
        fieldnames = ["cart_id", "customer_id", "medicine_id", "medicine_name", 
                      "quantity", "unit_price", "dosage_form", "prescription_required", "added_at"]
        
        try:
            # Ensure directory exists (though data dir should exist)
            cart_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(cart_path, "w", encoding="utf-8", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(carts)
            return True
        except Exception as e:
            print(f"[CartService] Error saving carts: {e}")
            return False

    @classmethod
    def get_customer_cart(cls, customer_id: str) -> List[Dict[str, Any]]:
        """Get all items in a specific customer's cart."""
        all_carts = cls.load_carts()
        return [c for c in all_carts if c["customer_id"] == customer_id]

    @classmethod
    def add_item(cls, customer_id: str, medicine: Dict[str, Any], quantity: int = 1) -> bool:
        """Add an item to the customer's cart."""
        carts = cls.load_carts()
        medicine_id = medicine.get("medicine_id") or medicine.get("id")
        
        # Check if already exists
        existing_item = next(
            (c for c in carts if c["customer_id"] == customer_id and c["medicine_id"] == medicine_id), 
            None
        )
        
        if existing_item:
            current_qty = int(existing_item.get("quantity", 0))
            existing_item["quantity"] = str(current_qty + quantity)
        else:
            new_item = {
                "cart_id": str(uuid.uuid4())[:8],
                "customer_id": customer_id,
                "medicine_id": medicine_id,
                "medicine_name": medicine.get("name", ""),
                "quantity": str(quantity),
                "unit_price": str(medicine.get("unit_price", 0)),
                "dosage_form": medicine.get("dosage_form", ""),
                "prescription_required": str(medicine.get("prescription_required", "false")).lower(),
                "added_at": datetime.utcnow().isoformat()
            }
            carts.append(new_item)
            
        return cls.save_carts(carts)

    @classmethod
    def update_quantity(cls, customer_id: str, medicine_id: str, quantity: int) -> bool:
        """Update the quantity of an item in the cart."""
        carts = cls.load_carts()
        updated = False
        
        for item in carts:
            if item["customer_id"] == customer_id and item["medicine_id"] == medicine_id:
                item["quantity"] = str(quantity)
                updated = True
                break
        
        if updated:
            return cls.save_carts(carts)
        return False

    @classmethod
    def remove_item(cls, customer_id: str, medicine_id: str) -> bool:
        """Remove a specific item from the cart."""
        carts = cls.load_carts()
        original_len = len(carts)
        
        carts = [c for c in carts if not (c["customer_id"] == customer_id and c["medicine_id"] == medicine_id)]
        
        if len(carts) < original_len:
            return cls.save_carts(carts)
        return False

    @classmethod
    def clear_cart(cls, customer_id: str) -> bool:
        """Remove ALL items for a specific customer."""
        carts = cls.load_carts()
        original_len = len(carts)
        
        # Keep items that do NOT belong to this customer
        remaining_carts = [c for c in carts if c["customer_id"] != customer_id]
        
        print(f"[CartService] Clearing cart for {customer_id}. Removing {original_len - len(remaining_carts)} items.")
        
        return cls.save_carts(remaining_carts)

# Export singleton instance if needed, or just use class methods
cart_service = CartService()
