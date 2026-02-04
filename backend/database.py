"""
Database models and connection for the Agentic AI System.
Uses SQLAlchemy with SQLite for development.
"""
from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import uuid

DATABASE_URL = "sqlite:///./agentic_system.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    language_preference = Column(String, default="en")
    preferences = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    orders = relationship("Order", back_populates="user")
    interactions = relationship("Interaction", back_populates="user")
    predictions = relationship("Prediction", back_populates="user")


class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    quantity = Column(Integer, default=0)
    restrictions = Column(JSON, default=dict)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")  # pending, approved, rejected, completed
    items = Column(JSON, default=list)
    total_amount = Column(Integer, default=0)
    webhook_triggered = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="orders")


class Interaction(Base):
    __tablename__ = "interactions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # chat, order, query, proactive_alert
    data = Column(JSON, default=dict)
    language = Column(String, default="en")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="interactions")


class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    prediction_type = Column(String, nullable=False)  # reorder, renewal, reminder
    data = Column(JSON, default=dict)
    predicted_for = Column(DateTime, nullable=False)
    confidence = Column(Integer, default=0)  # 0-100
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="predictions")


class Policy(Base):
    __tablename__ = "policies"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    rule_name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    conditions = Column(JSON, default=dict)
    action = Column(String, nullable=False)  # allow, deny, require_auth
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PolicyCheck(Base):
    __tablename__ = "policy_checks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    policy_id = Column(String, ForeignKey("policies.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    request_data = Column(JSON, default=dict)
    result = Column(String, nullable=False)  # allowed, denied, requires_auth
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ActionLog(Base):
    __tablename__ = "action_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent = Column(String, nullable=False)
    action_type = Column(String, nullable=False)
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, default=dict)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    trace_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    """Initialize the database tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
