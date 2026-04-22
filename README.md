# Agentic AI Pharmacy System 🏥💊

A fully autonomous, AI-powered pharmacy system built with **FastAPI** + **React (Vite)**, using the **Groq API (llama-3.1-8b-instant)** for blistering fast natural language understanding.

Patients can order medicines via natural language (text or voice), upload prescriptions for OCR-based extraction, and receive proactive refill reminders. The system enforces pharmaceutical safety rules (prescription checks, allergy warnings, stock validation) through a multi-agent architecture.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗣️ **Conversational Ordering** | Natural voice & text orders — extracts medicine name, dosage, and quantity using LLM |
| 📷 **Prescription Upload (OCR)** | Upload prescription images; the Vision Agent extracts medicines via EasyOCR + LLM |
| 🛡️ **Safety Enforcement** | Prescription-required checks, stock validation, allergy cross-referencing, order limits |
| 🔮 **Predictive Refill Alerts** | Proactive reminders based on past order history and consumption patterns |
| 🛒 **Shopping Cart** | Add, update, remove items; checkout with safety validation |
| 🩺 **Symptom Analysis** | Symptom-based medicine suggestions via the Symptom Agent |
| 👤 **AI-Guided Registration** | Step-by-step patient onboarding with the Registration Agent |
| 🔐 **Authentication** | JWT-based login/register with role-based access (patient / admin) |
| 📊 **Admin Dashboard** | Inventory management, order tracking, policy management, system observability |
| 🌐 **Multi-Language Support** | English, Hindi, and German UI translations |
| 🔍 **Full Observability** | Langfuse integration for tracing all agent decisions |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
│  ┌───────────────┐  ┌──────────────────────────────────┐   │
│  │   Chat UI     │  │     Admin Dashboard               │   │
│  │  (Voice+Text) │  │  (Inventory, Orders, Policies)   │   │
│  └───────────────┘  └──────────────────────────────────┘   │
│  ┌───────────────┐  ┌──────────────────────────────────┐   │
│  │  Catalog      │  │  Patient Settings / Cart          │   │
│  └───────────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │  (port 3000 → proxy to 8000)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (port 8000)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Orchestrator Agent                       │  │
│  │   (Routes requests, manages sessions & state)        │  │
│  └──────────────────────────────────────────────────────┘  │
│    │         │          │          │         │         │    │
│    ▼         ▼          ▼          ▼         ▼         ▼    │
│ ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌──────┐│
│ │Conver- ││Safety  ││Predict-││Executor││Symptom ││Vision││
│ │sation  ││Agent   ││ive     ││Agent   ││Agent   ││Agent ││
│ │Agent   ││        ││Agent   ││        ││        ││(OCR) ││
│ └────────┘└────────┘└────────┘└────────┘└────────┘└──────┘│
│   +Registration Agent                                      │
│                                                             │
│  Services: LLM Client │ Langfuse │ Cart │ Webhooks │ Audit │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  📁 CSV Data Store (Source of Truth)                        │
│  medicines.csv │ customers.csv │ orders.csv │ carts.csv     │
│  order_history.csv │ policies.csv │ auth_users.csv          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

| Requirement | Version | Notes |
|------------|---------|-------|
| **Python** | 3.10+ | Tested with Python 3.11 |
| **Node.js** | 18+ | For the React frontend |
| **npm** | 9+ | Comes with Node.js |
| **Groq API Key** | Required | Required for the Conversational Agent to process natural language. [Get it here](https://console.groq.com) |

---

## 🚀 Getting Started

### Step 1 — Get a Groq API Key

The system relies on Groq for ultra-fast, intelligent agentic dialogue. You must create an account at [GroqCloud](https://console.groq.com) and generate an API key (`GROQ_API_KEY`).

---

### Step 2 — Backend Setup

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend
```

**(Recommended) Create a virtual environment:**

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

**Install Python dependencies:**

```bash
pip install -r requirements.txt
```

**Configure environment variables (optional):**

```bash
# Copy the example env file
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

Edit `.env` if you want to configure Langfuse observability keys. The defaults work out of the box for local development.

**Start the backend server:**

```bash
python -m uvicorn api.main:app --reload
```

The API will be available at **http://localhost:8000**. You should see:

```
[OK] Agentic Pharmacy System API ready
```

> **Troubleshooting:** If you get `No module named uvicorn`, make sure you've activated your virtual environment and installed the requirements:
> ```bash
> .venv\Scripts\activate        # Windows
> pip install -r requirements.txt
> ```

---

### Step 3 — Frontend Setup

Open a **new terminal** and navigate to the `frontend/` directory:

```bash
cd frontend
```

**Install Node dependencies:**

```bash
npm install
```

**Start the development server:**

```bash
npm run dev
```

The frontend will be available at **http://localhost:3000**.

> The Vite dev server proxies all `/api/*` requests to the backend at `http://localhost:8000`, so both servers must be running simultaneously.

---

### Step 4 — Open the App

Navigate to **http://localhost:3000** in your browser. You can:

- **Register** a new patient account or **login** with existing credentials
- Start chatting with the AI pharmacy agent
- Upload a prescription image for automatic medicine extraction
- Browse the medicine catalog
- Use the admin dashboard (admin role)

---

## 📁 Project Structure

```
Pharmacy_Demo2/
├── backend/
│   ├── api/
│   │   └── main.py                 # FastAPI app with all endpoints
│   ├── agents/
│   │   ├── orchestrator.py         # Central router — routes to sub-agents
│   │   ├── conversational.py       # NLU — extracts medicine/dosage/quantity
│   │   ├── safety.py               # Rx checks, stock, allergies
│   │   ├── predictive.py           # Refill prediction engine
│   │   ├── executor.py             # Order processing & webhooks
│   │   ├── registration.py         # AI-guided patient onboarding
│   │   ├── symptom.py              # Symptom-to-medicine suggestions
│   │   ├── vision.py               # Prescription image OCR (EasyOCR)
│   │   └── base_agent.py           # Shared agent base class
│   ├── services/
│   │   ├── llm_client.py           # Ollama HTTP client
│   │   ├── langfuse_client.py      # Observability/tracing
│   │   ├── cart_service.py         # Cart management logic
│   │   ├── order_state_machine.py  # Order lifecycle states
│   │   ├── audit_logger.py         # Structured audit logging
│   │   └── webhook_service.py      # External webhook triggers
│   ├── data/                       # CSV data store (source of truth)
│   │   ├── medicines.csv           # Medicine catalog (name, price, stock, Rx flag)
│   │   ├── customers.csv           # Patient profiles (conditions, allergies)
│   │   ├── order_history.csv       # Past orders for refill prediction
│   │   ├── orders.csv              # Active/recent orders
│   │   ├── carts.csv               # Shopping cart state
│   │   ├── policies.csv            # Safety/business rules
│   │   ├── auth_users.csv          # User authentication records
│   │   └── users.csv               # Basic user info
│   ├── auth.py                     # JWT authentication logic
│   ├── database.py                 # CSV read/write utilities
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Environment variable template
│   └── .env                        # Local environment variables (git-ignored)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main app — routing & layout
│   │   ├── AuthContext.jsx         # Authentication state provider
│   │   ├── LanguageContext.jsx     # i18n language provider
│   │   ├── translations.js        # EN / HI / DE translation strings
│   │   ├── main.jsx               # React entry point
│   │   ├── index.css              # Global styles
│   │   └── components/
│   │       ├── Chat.jsx            # Conversational chat interface
│   │       ├── Catalog.jsx         # Medicine catalog browser
│   │       ├── Cart.jsx            # Shopping cart
│   │       ├── AdminDashboard.jsx  # Admin panel (inventory, orders, traces)
│   │       ├── LoginPage.jsx       # Login / register UI
│   │       ├── Registration.jsx    # AI-guided registration flow
│   │       ├── PatientSettings.jsx # Patient profile settings
│   │       └── VoiceInput.jsx      # Browser speech-to-text
│   ├── index.html                  # HTML entry point
│   ├── vite.config.js              # Vite config (port 3000, proxy)
│   └── package.json                # Node dependencies
│
├── scripts/                        # Utility scripts
├── .gitignore
└── README.md
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | Login with email & password → returns JWT |
| `POST` | `/api/v1/auth/register` | Register new patient → auto-login |
| `GET` | `/api/v1/auth/me` | Get current user info (requires Bearer token) |

### Chat & Ordering

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/chat` | Main conversational interface (text, voice, image) |
| `POST` | `/api/v1/chat/confirm` | Confirm or cancel a pending order |

### Registration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/register/start` | Start AI-guided registration session |
| `POST` | `/api/v1/register/step` | Submit next registration step |

### Cart

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/cart/{customer_id}` | Get customer's cart |
| `POST` | `/api/v1/cart/add` | Add item to cart |
| `PUT` | `/api/v1/cart/update` | Update cart item quantity |
| `DELETE` | `/api/v1/cart/remove` | Remove item from cart |
| `DELETE` | `/api/v1/cart/{customer_id}` | Clear entire cart |
| `POST` | `/api/v1/cart/checkout` | Checkout cart with safety validation |

### Inventory & Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/inventory` | List all medicines (with low-stock flags) |
| `GET` | `/api/v1/inventory/{medicine_id}` | Get specific medicine details |
| `PUT` | `/api/v1/inventory/{medicine_id}` | Update inventory item (admin) |
| `GET` | `/api/v1/customers` | List all customers |
| `GET` | `/api/v1/orders` | List all orders |
| `GET` | `/api/v1/policies` | List safety policies |

### Admin & Observability

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/status` | System health & agent status |
| `GET` | `/api/v1/admin/sessions` | Active chat sessions |
| `GET` | `/api/v1/admin/traces` | Langfuse observability traces |
| `GET` | `/health` | Basic health check |

> **Interactive API docs**: Visit **http://localhost:8000/docs** (Swagger UI) when the backend is running.

---

## 📊 Data Files

All data is stored in CSV files under `backend/data/`:

| File | Description |
|------|-------------|
| `medicines.csv` | Medicine catalog — name, category, dosage form, stock, price, Rx required, reorder level |
| `customers.csv` | Patient profiles — name, age, conditions, known allergies |
| `order_history.csv` | Historical orders used for predictive refill alerts |
| `orders.csv` | Current/recent orders with status tracking |
| `carts.csv` | Active shopping cart items per customer |
| `policies.csv` | Safety and business rules (prescription policy, stock limits, quantity caps) |
| `auth_users.csv` | User authentication data (hashed passwords, roles) |
| `users.csv` | Basic user information |

---

## ⚙️ Environment Variables

Create `backend/.env` from the template (or it's already present):

```env
# Groq API Configuration — REQUIRED
GROQ_API_KEY=your_groq_key_here

# Optional: Langfuse observability (leave empty for local mock tracing)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com
```

> The `GROQ_API_KEY` is absolutely required for core functionality. Langfuse keys are only needed if you want cloud-based trace storage.

---

## 🔍 Observability

All agent decisions are traced for debugging and compliance:

- **Built-in mock tracer** works out of the box — traces appear in Admin Dashboard → Observability
- **Langfuse integration** (optional) — add your keys to `.env` for cloud-hosted trace storage and analysis

---

## 💬 Example Conversation

```
User:  "I need some paracetamol for my headache"
Agent: ✅ Found Paracetamol 500mg — ₹15.00 per strip. Quantity: 1.
       Would you like to confirm this order?

User:  "Yes, confirm"
Agent: ✅ Order confirmed! Order ID: ORD20260318... Ready in 30 minutes.

User:  [uploads prescription image]
Agent: 📋 Detected from prescription: Amoxicillin 500mg, Ibuprofen 200mg.
       Would you like to add these to your cart?
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, Vanilla CSS |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **LLM** | Groq API (`llama-3.1-8b-instant`) |
| **OCR** | EasyOCR |
| **Auth** | JWT (python-jose), bcrypt (passlib) |
| **Observability** | Langfuse (optional) |
| **Data Store** | CSV files (no database required) |

---

## 🐛 Troubleshooting

| **Problem** | **Solution** |
|---------|----------|
| `No module named uvicorn` | Activate your virtual environment: `.venv\Scripts\activate` (Windows) then `pip install -r requirements.txt` |
| `API Error 401 Unauthorized` | Make sure your `GROQ_API_KEY` in `backend/.env` is valid and active. |
| `GROQ_API_KEY not set` | You must add your Groq API key to `backend/.env`. Check `backend/.env.example` for details. |
| Frontend can't reach backend | Ensure the backend is running on port 8000; Vite proxies `/api/*` automatically |
| `ENOENT` on `npm install` | Make sure you're in the `frontend/` directory |
| EasyOCR download slow | First run downloads OCR models (~100MB); subsequent starts are fast |

---

## 📜 License

Built for the **Agentic AI Hackathon** 🚀
