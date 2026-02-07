"""
Authentication module for the Agentic AI Pharmacy System.
Handles password hashing, JWT tokens, and role-based access control.
"""
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
import os
import csv
from pathlib import Path

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "agentic-pharmacy-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Password hashing context (using sha256_crypt for compatibility)
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# Data paths
DATA_DIR = Path(__file__).parent / "data"
AUTH_USERS_FILE = DATA_DIR / "auth_users.csv"
CUSTOMERS_FILE = DATA_DIR / "customers.csv"


# ============ Models ============

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    customer_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class PatientRegisterRequest(BaseModel):
    name: str
    phone: str
    email: str
    password: str
    date_of_birth: str
    language: str = "en"
    address: str
    chronic_conditions: str = ""
    allergies: str = ""


class AuthUser(BaseModel):
    id: str
    email: str
    role: str  # 'admin' or 'patient'
    customer_id: Optional[str] = None
    created_at: str


class CurrentUser(BaseModel):
    id: str
    email: str
    role: str
    customer_id: Optional[str] = None
    name: Optional[str] = None


# ============ Password Functions ============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


# ============ JWT Functions ============

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        customer_id: str = payload.get("customer_id")
        if email is None:
            return None
        return TokenData(email=email, role=role, customer_id=customer_id)
    except JWTError:
        return None


# ============ Auth User Storage (CSV) ============

def _ensure_auth_users_file():
    """Ensure the auth users CSV file exists with headers and default admin."""
    file_exists = AUTH_USERS_FILE.exists()
    has_admin = False
    
    # Check if admin exists
    if file_exists:
        with open(AUTH_USERS_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('email', '').lower() == 'admin@pharmacy.com':
                    has_admin = True
                    break
    
    # Create file if it doesn't exist
    if not file_exists:
        with open(AUTH_USERS_FILE, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'email', 'password_hash', 'role', 'customer_id', 'created_at'])
    
    # Add admin if not present
    if not has_admin:
        admin_hash = get_password_hash("admin123")
        with open(AUTH_USERS_FILE, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'admin_001',
                'admin@pharmacy.com',
                admin_hash,
                'admin',
                '',
                datetime.utcnow().isoformat()
            ])


def get_auth_user_by_email(email: str) -> Optional[dict]:
    """Get an auth user by email."""
    _ensure_auth_users_file()
    with open(AUTH_USERS_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['email'].lower() == email.lower():
                return row
    return None


def create_auth_user(user_id: str, email: str, password_hash: str, role: str, customer_id: str = "") -> dict:
    """Create a new auth user in the CSV file."""
    _ensure_auth_users_file()
    
    # Check if email already exists
    existing = get_auth_user_by_email(email)
    if existing:
        raise ValueError("Email already exists")
    
    user = {
        'id': user_id,
        'email': email,
        'password_hash': password_hash,
        'role': role,
        'customer_id': customer_id,
        'created_at': datetime.utcnow().isoformat()
    }
    
    with open(AUTH_USERS_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['id', 'email', 'password_hash', 'role', 'customer_id', 'created_at'])
        writer.writerow(user)
    
    return user


# ============ Customer Storage ============

def get_next_customer_id() -> str:
    """Generate the next customer ID based on existing customers."""
    max_id = 0
    if CUSTOMERS_FILE.exists():
        with open(CUSTOMERS_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                cust_id = row.get('customer_id', '')
                if cust_id.startswith('CUST'):
                    try:
                        num = int(cust_id[4:])
                        if num > max_id:
                            max_id = num
                    except ValueError:
                        pass
    return f"CUST{max_id + 1:03d}"


def create_customer(customer_data: dict) -> dict:
    """Create a new customer in the customers CSV file."""
    fieldnames = [
        'customer_id', 'name', 'phone', 'email', 'date_of_birth',
        'language', 'address', 'registered_date', 'chronic_conditions',
        'allergies', 'active'
    ]
    
    # Ensure registered_date is set
    if 'registered_date' not in customer_data:
        customer_data['registered_date'] = datetime.utcnow().strftime('%Y-%m-%d')
    
    # Ensure active flag
    if 'active' not in customer_data:
        customer_data['active'] = 'true'
    
    with open(CUSTOMERS_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writerow(customer_data)
    
    return customer_data


def get_customer_by_email(email: str) -> Optional[dict]:
    """Get a customer by email."""
    if not CUSTOMERS_FILE.exists():
        return None
    with open(CUSTOMERS_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('email', '').lower() == email.lower():
                return row
    return None


def get_customer_by_id(customer_id: str) -> Optional[dict]:
    """Get a customer by customer_id."""
    if not CUSTOMERS_FILE.exists():
        return None
    with open(CUSTOMERS_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('customer_id', '') == customer_id:
                return row
    return None


# ============ Authentication Functions ============

def authenticate_user(email: str, password: str) -> Optional[dict]:
    """Authenticate a user by email and password."""
    user = get_auth_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user['password_hash']):
        return None
    return user


def register_patient(request: PatientRegisterRequest) -> dict:
    """Register a new patient with both auth and customer records."""
    # Check if email already exists
    if get_auth_user_by_email(request.email):
        raise ValueError("Email already registered")
    
    if get_customer_by_email(request.email):
        raise ValueError("Email already exists in customer database")
    
    # Generate customer ID
    customer_id = get_next_customer_id()
    
    # Create customer record
    customer_data = {
        'customer_id': customer_id,
        'name': request.name,
        'phone': request.phone,
        'email': request.email,
        'date_of_birth': request.date_of_birth,
        'language': request.language,
        'address': request.address,
        'chronic_conditions': request.chronic_conditions.replace(',', ';'),
        'allergies': request.allergies.replace(',', ';')
    }
    create_customer(customer_data)
    
    # Create auth user
    password_hash = get_password_hash(request.password)
    auth_user_id = f"patient_{customer_id}"
    create_auth_user(auth_user_id, request.email, password_hash, 'patient', customer_id)
    
    return {
        'customer_id': customer_id,
        'email': request.email,
        'name': request.name,
        'role': 'patient'
    }


def get_current_user_info(token_data: TokenData) -> Optional[CurrentUser]:
    """Get current user info from token data."""
    user = get_auth_user_by_email(token_data.email)
    if not user:
        return None
    
    name = None
    if user['customer_id']:
        customer = get_customer_by_id(user['customer_id'])
        if customer:
            name = customer.get('name')
    
    return CurrentUser(
        id=user['id'],
        email=user['email'],
        role=user['role'],
        customer_id=user['customer_id'] or None,
        name=name
    )
