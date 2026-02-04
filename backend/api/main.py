"""
FastAPI Main Application - Agentic Pharmacy System.
Uses local Ollama llama3.2-vision - NO API KEYS REQUIRED.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import csv

from agents.orchestrator import orchestrator_agent
from agents.predictive import predictive_agent
from agents.safety import safety_agent
from services.langfuse_client import tracer
from services.llm_client import llm_client

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


# ============ Startup ============

@app.on_event("startup")
async def startup():
    ollama_available = await llm_client.check_ollama_available()
    if ollama_available:
        print("✅ Ollama connected - llama3.2-vision ready")
    else:
        print("⚠️ Ollama not detected. Run: ollama serve")
    print("✅ Agentic Pharmacy System API ready (NO API KEYS NEEDED)")


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
    """Confirm or cancel a pending order."""
    try:
        if request.confirmed:
            message = "yes, confirm the order"
        else:
            message = "no, cancel it"
        
        result = await orchestrator_agent.handle_message(
            message=message,
            session_id=request.session_id
        )
        
        return ChatResponse(
            success=result.get("success", False),
            response=result.get("response", ""),
            session_id=result.get("session_id", ""),
            data=result.get("data")
        )
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
    
    # Add low stock alerts
    for item in items:
        stock = int(item.get("stock_quantity", 0))
        reorder = int(item.get("reorder_level", 0))
        item["low_stock"] = stock <= reorder
    
    return {
        "success": True,
        "items": items,
        "count": len(items),
        "low_stock_count": len([i for i in items if i.get("low_stock")])
    }


@app.get("/api/v1/inventory/{medicine_id}")
async def get_medicine(medicine_id: str):
    """Get specific medicine details."""
    medicine = safety_agent._find_medicine(medicine_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"success": True, "medicine": medicine}


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


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
