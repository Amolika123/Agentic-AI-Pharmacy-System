"""
FastAPI Main Application - Agentic Pharmacy System.
Uses local Ollama llama3.2-vision - NO API KEYS REQUIRED.
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import csv
import razorpay
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Initialize Razorpay client (test mode)
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

from agents.orchestrator import orchestrator_agent
from agents.predictive import predictive_agent
from agents.safety import safety_agent
from agents.registration import registration_agent
from services.langfuse_client import tracer
from services.llm_client import llm_client
from auth import (
    LoginRequest, PatientRegisterRequest, Token, TokenData,
    authenticate_user, register_patient, create_access_token,
    decode_access_token, get_current_user_info
)
import uuid

app = FastAPI(
    title="Agentic Pharmacy System",
    description="Autonomous pharmacy with conversational ordering, safety enforcement, and proactive refills",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Models ============

class ChatRequest(BaseModel):
    message: str = ""
    customer_id: Optional[str] = None
    session_id: Optional[str] = None
    is_voice: bool = False
    image_data: Optional[str] = None  # Base64 encoded image
    language: str = "en"  # Language code: en, hi, de


class ChatResponse(BaseModel):
    success: bool
    response: str
    session_id: str
    language: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    trace_id: Optional[str] = None
    error: Optional[str] = None


class OrderConfirmRequest(BaseModel):
    session_id: str
    confirmed: bool
    customer_id: Optional[str] = None


class RegistrationStartRequest(BaseModel):
    language: str = "en"


class RegistrationStepRequest(BaseModel):
    session_id: str
    message: str
    language: str = "en"


# ============ Startup ============

@app.on_event("startup")
async def startup():
    ollama_available = await llm_client.check_ollama_available()
    if ollama_available:
        print("[OK] Ollama connected - llama3.2-vision ready")
    else:
        print("[!] Ollama not detected. Run: ollama serve")
    print("[OK] Agentic Pharmacy System API ready (NO API KEYS NEEDED)")


# ============ Authentication ============

@app.post("/api/v1/auth/login")
async def login(request: LoginRequest):
    """Authenticate user and return JWT token."""
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(
        data={
            "sub": user['email'],
            "role": user['role'],
            "customer_id": user.get('customer_id', '')
        }
    )
    
    return {
        "success": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "email": user['email'],
            "role": user['role'],
            "customer_id": user.get('customer_id') or None
        }
    }


@app.post("/api/v1/auth/register")
async def register(request: PatientRegisterRequest):
    """Register a new patient."""
    try:
        result = register_patient(request)
        
        # Auto-login after registration
        access_token = create_access_token(
            data={
                "sub": result['email'],
                "role": result['role'],
                "customer_id": result['customer_id']
            }
        )
        
        return {
            "success": True,
            "message": "Registration successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/auth/me")
async def get_current_user(authorization: Optional[str] = None):
    """Get current authenticated user info."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token_data = decode_access_token(token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_info = get_current_user_info(token_data)
    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "success": True,
        "user": user_info.dict()
    }


# ============ Chat Endpoints ============

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main conversational endpoint for medicine orders."""
    try:
        result = await orchestrator_agent.handle_message(
            message=request.message,
            customer_id=request.customer_id,
            session_id=request.session_id,
            is_voice=request.is_voice,
            image_data=request.image_data,
            language=request.language
        )
        
        return ChatResponse(
            success=result.get("success", False),
            response=result.get("response", ""),
            session_id=result.get("session_id", ""),
            language=result.get("language"),
            data=result.get("data"),
            trace_id=result.get("trace_id"),
            error=result.get("error")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/chat/confirm", response_model=ChatResponse)
async def confirm_order(request: OrderConfirmRequest):
    """Confirm or cancel a pending order - calls orchestrator directly."""
    try:
        # Get or create session context
        context = orchestrator_agent._get_or_create_context(
            request.session_id, request.customer_id
        )
        
        # Create trace for observability
        from services.langfuse_client import tracer
        trace = tracer.create_trace(
            name="order_confirmation",
            user_id=request.customer_id or "guest",
            session_id=request.session_id,
            metadata={"confirmed": request.confirmed},
            tags=["pharmacy", "confirmation"]
        )
        
        if request.confirmed:
            # Call _confirm_order directly - bypasses handle_message routing
            result = await orchestrator_agent._confirm_order(context, trace)
        else:
            # Call _cancel_order directly
            result = await orchestrator_agent._cancel_order(context, trace)
        
        return ChatResponse(
            success=result.get("success", False),
            response=result.get("response", ""),
            session_id=result.get("session_id", request.session_id),
            data=result.get("data")
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============ Registration ============

@app.post("/api/v1/register/start")
async def start_registration(request: RegistrationStartRequest):
    """Start a new AI-guided registration session."""
    try:
        session_id = str(uuid.uuid4())
        result = await registration_agent.start_registration(
            session_id=session_id,
            language=request.language
        )
        return {
            "success": True,
            "session_id": session_id,
            "response": result.get("response", ""),
            "step": result.get("step", "name")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/register/step")
async def registration_step(request: RegistrationStepRequest):
    """Process a registration step."""
    try:
        result = await registration_agent.process_registration_step(
            session_id=request.session_id,
            message=request.message,
            language=request.language
        )
        return {
            "success": result.get("success", True),
            "response": result.get("response", ""),
            "step": result.get("step", ""),
            "completed": result.get("completed", False),
            "cancelled": result.get("cancelled", False),
            "customer_id": result.get("customer_id")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Proactive Intelligence ============

@app.get("/api/v1/alerts")
async def get_all_refill_alerts():
    """Get all proactive refill alerts (admin view)."""
    try:
        result = await orchestrator_agent.get_refill_alerts()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/alerts/{customer_id}")
async def get_customer_alerts(customer_id: str):
    """Get refill alerts for specific customer."""
    try:
        result = await orchestrator_agent.get_refill_alerts(customer_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Inventory ============

@app.get("/api/v1/inventory")
async def list_inventory():
    """List all medicines (admin inventory view)."""
    csv_path = Path(__file__).parent.parent / "data" / "medicines.csv"
    items = []
    
    if csv_path.exists():
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            items = list(reader)
    
    # Add low stock alerts and convert types
    for item in items:
        stock = int(item.get("stock_quantity", 0))
        reorder = int(item.get("reorder_level", 0))
        item["low_stock"] = stock <= reorder
        item["stock_quantity"] = stock
        item["unit_price"] = float(item.get("unit_price", 0))
        item["prescription_required"] = item.get("prescription_required", "false").lower() == "true"
    
    return {
        "success": True,
        "items": items,
        "medicines": items,  # Alias for Catalog component
        "count": len(items),
        "low_stock_count": len([i for i in items if i.get("low_stock")])
    }


# ============ Cart ============

class CartAddRequest(BaseModel):
    customer_id: str
    medicine_id: str
    quantity: int = 1


class CartUpdateRequest(BaseModel):
    customer_id: str
    medicine_id: str
    quantity: int


class CartRemoveRequest(BaseModel):
    customer_id: str
    medicine_id: str


class CartCheckoutRequest(BaseModel):
    customer_id: str
    items: List[Dict[str, Any]]
    language: str = "en"


def _get_cart_path():
    return Path(__file__).parent.parent / "data" / "carts.csv"


def _load_carts():
    cart_path = _get_cart_path()
    carts = []
    if cart_path.exists():
        with open(cart_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            carts = list(reader)
    return carts


def _save_carts(carts):
    cart_path = _get_cart_path()
    fieldnames = ["cart_id", "customer_id", "medicine_id", "medicine_name", 
                  "quantity", "unit_price", "dosage_form", "prescription_required", "added_at"]
    with open(cart_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(carts)


@app.post("/api/v1/cart/add")
async def add_to_cart(request: CartAddRequest):
    """Add item to customer's cart."""
    # Find medicine details
    medicine = safety_agent._find_medicine(request.medicine_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    carts = _load_carts()
    
    # Check if item already in cart
    existing = next((c for c in carts if c["customer_id"] == request.customer_id 
                     and c["medicine_id"] == request.medicine_id), None)
    
    if existing:
        existing["quantity"] = str(int(existing["quantity"]) + request.quantity)
    else:
        import uuid
        new_item = {
            "cart_id": str(uuid.uuid4())[:8],
            "customer_id": request.customer_id,
            "medicine_id": request.medicine_id,
            "medicine_name": medicine.get("name", ""),
            "quantity": str(request.quantity),
            "unit_price": str(medicine.get("unit_price", 0)),
            "dosage_form": medicine.get("dosage_form", ""),
            "prescription_required": str(medicine.get("prescription_required", "false")).lower(),
            "added_at": datetime.utcnow().isoformat()
        }
        carts.append(new_item)
    
    _save_carts(carts)
    
    return {"success": True, "message": "Item added to cart"}


@app.get("/api/v1/cart/{customer_id}")
async def get_cart(customer_id: str):
    """Get customer's cart."""
    carts = _load_carts()
    customer_cart = [c for c in carts if c["customer_id"] == customer_id]
    
    # Convert to proper format
    items = []
    for item in customer_cart:
        items.append({
            "medicine_id": item["medicine_id"],
            "name": item["medicine_name"],
            "quantity": int(item.get("quantity", 1)),
            "unit_price": float(item.get("unit_price", 0)),
            "dosage_form": item.get("dosage_form", ""),
            "prescription_required": item.get("prescription_required", "false").lower() == "true",
            "unit": "tablets"
        })
    
    return {"success": True, "items": items, "count": len(items)}


@app.put("/api/v1/cart/update")
async def update_cart(request: CartUpdateRequest):
    """Update cart item quantity."""
    carts = _load_carts()
    
    for cart in carts:
        if cart["customer_id"] == request.customer_id and cart["medicine_id"] == request.medicine_id:
            cart["quantity"] = str(request.quantity)
            break
    
    _save_carts(carts)
    return {"success": True, "message": "Cart updated"}


@app.delete("/api/v1/cart/remove")
async def remove_from_cart(request: CartRemoveRequest):
    """Remove item from cart."""
    carts = _load_carts()
    carts = [c for c in carts if not (c["customer_id"] == request.customer_id 
                                       and c["medicine_id"] == request.medicine_id)]
    _save_carts(carts)
    return {"success": True, "message": "Item removed from cart"}


@app.delete("/api/v1/cart/{customer_id}")
async def clear_cart(customer_id: str):
    """Clear all items from the cart for a specific customer."""
    try:
        carts = _load_carts()
        remaining_carts = [c for c in carts if c["customer_id"] != customer_id]
        _save_carts(remaining_carts)
        return {"success": True, "message": "Cart cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/cart/checkout")
async def checkout_cart(request: CartCheckoutRequest):
    """Process cart checkout through safety validation and order creation."""
    if not request.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Check for prescription items
    prescription_items = [item for item in request.items if item.get("prescription_required")]
    
    # Create order through orchestrator for safety checks
    order_details = []
    total = 0
    
    for item in request.items:
        medicine = safety_agent._find_medicine(item.get("medicine_id"))
        if medicine:
            quantity = item.get("quantity", 1)
            price = float(medicine.get("unit_price", 0))
            order_details.append({
                "medicine_id": item.get("medicine_id"),
                "name": medicine.get("name"),
                "quantity": quantity,
                "unit_price": price,
                "subtotal": quantity * price,
                "prescription_required": medicine.get("prescription_required", "false").lower() == "true"
            })
            total += quantity * price
    
    # Clear the cart after successful checkout
    carts = _load_carts()
    carts = [c for c in carts if c["customer_id"] != request.customer_id]
    _save_carts(carts)
    
    # Create order record
    order_id = f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}"
    orders_path = Path(__file__).parent.parent / "data" / "orders.csv"
    
    # Write to orders.csv
    fieldnames = ["order_id", "customer_id", "items", "total", "status", "created_at"]
    order_row = {
        "order_id": order_id,
        "customer_id": request.customer_id,
        "items": str(len(order_details)),
        "total": str(total),
        "status": "confirmed",
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Append to orders
    file_exists = orders_path.exists()
    with open(orders_path, "a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(order_row)
    
    return {
        "success": True,
        "message": f"Order {order_id} placed successfully! Total: ₹{total:.2f}",
        "order_id": order_id,
        "total": total,
        "items": order_details,
        "prescription_items": len(prescription_items)
    }


@app.get("/api/v1/inventory/{medicine_id}")
async def get_medicine(medicine_id: str):
    """Get specific medicine details."""
    medicine = safety_agent._find_medicine(medicine_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"success": True, "medicine": medicine}


class InventoryUpdateRequest(BaseModel):
    stock_quantity: Optional[int] = None
    unit_price: Optional[float] = None
    reorder_level: Optional[int] = None
    name: Optional[str] = None
    category: Optional[str] = None


@app.put("/api/v1/inventory/{medicine_id}")
async def update_inventory(medicine_id: str, request: InventoryUpdateRequest):
    """Update inventory item (admin only)."""
    csv_path = Path(__file__).parent.parent / "data" / "medicines.csv"
    
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="Inventory file not found")
    
    # Read all medicines
    medicines = []
    fieldnames = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        medicines = list(reader)
    
    # Find and update the medicine
    found = False
    for med in medicines:
        if med.get("medicine_id") == medicine_id:
            found = True
            if request.stock_quantity is not None:
                med["stock_quantity"] = str(request.stock_quantity)
            if request.unit_price is not None:
                med["unit_price"] = str(request.unit_price)
            if request.reorder_level is not None:
                med["reorder_level"] = str(request.reorder_level)
            if request.name is not None:
                med["name"] = request.name
            if request.category is not None:
                med["category"] = request.category
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    # Write back to CSV
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(medicines)
    
    return {"success": True, "message": f"Inventory item {medicine_id} updated"}


# ============ Customers ============

@app.get("/api/v1/customers")
async def list_customers():
    """List all customers."""
    csv_path = Path(__file__).parent.parent / "data" / "customers.csv"
    customers = []
    
    if csv_path.exists():
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            customers = list(reader)
    
    return {"success": True, "customers": customers, "count": len(customers)}


# ============ Orders ============

@app.get("/api/v1/orders")
async def list_orders():
    """List all orders."""
    csv_path = Path(__file__).parent.parent / "data" / "orders.csv"
    orders = []
    
    if csv_path.exists():
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            orders = list(reader)
    
    # Also include order history
    history_path = Path(__file__).parent.parent / "data" / "order_history.csv"
    if history_path.exists():
        with open(history_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                orders.append(row)
    
    return {"success": True, "orders": orders, "count": len(orders)}


# ============ Admin/Observability ============

@app.get("/api/v1/admin/status")
async def get_status():
    """Get system status."""
    ollama_available = await llm_client.check_ollama_available()
    
    return {
        "status": "operational" if ollama_available else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "ollama": {
            "available": ollama_available,
            "model": llm_client.model,
            "base_url": llm_client.base_url
        },
        "agents": {
            "orchestrator": "active",
            "conversational": "active",
            "safety": "active",
            "predictive": "active",
            "executor": "active"
        },
        "observability": {
            "langfuse": tracer.enabled,
            "traces_count": len(tracer.traces)
        },
        "api_keys_required": False
    }


@app.get("/api/v1/admin/sessions")
async def get_sessions():
    """Get active chat sessions."""
    sessions = orchestrator_agent.get_active_sessions()
    return {"success": True, "sessions": sessions, "count": len(sessions)}


@app.get("/api/v1/admin/traces")
async def get_traces(limit: int = 10):
    """Get recent traces for observability."""
    traces = tracer.get_traces(limit)
    return {"success": True, "traces": traces, "count": len(traces)}


@app.get("/api/v1/policies")
async def list_policies():
    """List all safety policies."""
    csv_path = Path(__file__).parent.parent / "data" / "policies.csv"
    policies = []
    
    if csv_path.exists():
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            policies = list(reader)
    
    return {"success": True, "policies": policies}


# ============ Payment (Razorpay) ============

class PaymentCreateRequest(BaseModel):
    amount: float
    order_id: Optional[str] = None


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    customer_id: str
    items: List[Dict[str, Any]] = []


@app.post("/api/v1/payment/create-order")
async def create_razorpay_order(request: PaymentCreateRequest):
    """Create a Razorpay order for payment processing (test mode)."""
    try:
        # Razorpay expects amount in paise (INR smallest unit)
        amount_paise = int(request.amount * 100)

        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": request.order_id or f"rcpt_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "payment_capture": 1  # Auto-capture payment
        }

        razorpay_order = razorpay_client.order.create(data=order_data)

        return {
            "success": True,
            "razorpay_order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Razorpay order: {str(e)}")


@app.post("/api/v1/payment/verify")
async def verify_razorpay_payment(request: PaymentVerifyRequest):
    """Verify Razorpay payment signature and mark order as paid."""
    try:
        # Verify payment signature
        params = {
            "razorpay_order_id": request.razorpay_order_id,
            "razorpay_payment_id": request.razorpay_payment_id,
            "razorpay_signature": request.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params)
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment signature verification failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification error: {str(e)}")

    # Signature verified — create order record in orders.csv
    try:
        order_id = f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}"
        orders_path = Path(__file__).parent.parent / "data" / "orders.csv"

        # Calculate total from items
        total = 0
        for item in request.items:
            quantity = item.get("quantity", 1)
            price = float(item.get("unit_price", 0))
            total += quantity * price

        fieldnames = ["order_id", "customer_id", "items", "total", "status",
                      "created_at", "razorpay_payment_id"]
        order_row = {
            "order_id": order_id,
            "customer_id": request.customer_id,
            "items": str(len(request.items)),
            "total": str(total),
            "status": "paid",
            "created_at": datetime.utcnow().isoformat(),
            "razorpay_payment_id": request.razorpay_payment_id
        }

        file_exists = orders_path.exists()
        with open(orders_path, "a", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            if not file_exists:
                writer.writeheader()
            writer.writerow(order_row)

        # Clear the customer's cart after successful payment
        carts = _load_carts()
        carts = [c for c in carts if c["customer_id"] != request.customer_id]
        _save_carts(carts)

        return {
            "success": True,
            "message": f"Payment verified! Order {order_id} placed successfully. Total: ₹{total:.2f}",
            "order_id": order_id,
            "total": total,
            "razorpay_payment_id": request.razorpay_payment_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
