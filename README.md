# Agentic AI Pharmacy System 🏥

A fully autonomous pharmacy system using **local Ollama llama3.2-vision** - NO API KEYS REQUIRED.

## ✨ Core Features

| Feature | Description |
|---------|-------------|
| 🗣️ **Conversational Ordering** | Natural voice/text orders - extracts medicine, dosage, quantity |
| 🛡️ **Safety Enforcement** | Prescription checks, stock validation, allergy warnings |
| 🔮 **Predictive Intelligence** | Proactive refill reminders based on order history |
| ⚡ **Real-world Execution** | Order processing, inventory updates, webhook triggers |
| 🔍 **Full Observability** | Langfuse integration for agent decision tracing |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│  ┌───────────────┐  ┌──────────────────────────────────┐   │
│  │   Chat UI     │  │     Admin Dashboard               │   │
│  │  (Voice+Text) │  │  (Inventory, Alerts, Traces)     │   │
│  └───────────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Orchestrator Agent                       │  │
│  │     (Routes requests, manages sessions)               │  │
│  └──────────────────────────────────────────────────────┘  │
│        │              │              │              │       │
│        ▼              ▼              ▼              ▼       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Conversa- │  │ Safety   │  │Predictive│  │ Executor │   │
│  │tional    │  │ Agent    │  │ Agent    │  │ Agent    │   │
│  │ Agent    │  │          │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│      NLU         Rx Check     Refill        Orders        │
│    Entities      Stock        Alerts       Webhooks       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  📁 CSV Data (Source of Truth)                              │
│  medicines.csv │ customers.csv │ order_history.csv          │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Install Ollama & Model
```bash
# Download from https://ollama.ai
ollama pull llama3.2-vision
ollama serve
```

### 2. Start Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn api.main:app --reload
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Open http://localhost:3000

## 📊 Data Files

| File | Purpose |
|------|---------|
| `medicines.csv` | 25 medicines with stock, prices, Rx flags |
| `customers.csv` | 10 customers with conditions, allergies |
| `order_history.csv` | Historical orders for refill prediction |
| `policies.csv` | Safety rules (prescription, stock, limits) |

## 🔍 Observability

All agent decisions are traced. Configure Langfuse:
```env
LANGFUSE_PUBLIC_KEY=pk-xxx
LANGFUSE_SECRET_KEY=sk-xxx
```

Or view traces in Admin Dashboard → Observability section.

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/chat` | Main conversation interface |
| `GET /api/v1/alerts` | Proactive refill alerts |
| `GET /api/v1/inventory` | Medicine inventory |
| `GET /api/v1/admin/traces` | Observability logs |

## 💬 Example Conversation

**User**: "I need some paracetamol for my headache"  
**Agent**: ✅ Order validated! Paracetamol 500mg is available.  
**User**: "Yes, confirm"  
**Agent**: ✅ Order confirmed! Ready in 30 minutes.

---

Built for the Agentic AI Hackathon 🚀
