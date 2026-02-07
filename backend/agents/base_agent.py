"""
Base Agent class for the Agentic Pharmacy System.
All specialized agents inherit from this base class.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum


class OrderState(Enum):
    """Order state for tracking order lifecycle."""
    NONE = "none"
    CREATED = "created"
    CONFIRMED = "confirmed"
    SENT = "sent"
    CANCELLED = "cancelled"


@dataclass
class AgentContext:
    """Shared context passed between agents during request processing."""
    customer_id: Optional[str] = None
    session_id: Optional[str] = None
    language: str = "en"
    conversation_history: List[Dict[str, str]] = field(default_factory=list)
    extracted_entities: Dict[str, Any] = field(default_factory=dict)
    customer_profile: Optional[Dict[str, Any]] = None
    policy_results: List[Dict[str, Any]] = field(default_factory=list)
    pending_order: Optional[Dict[str, Any]] = None
    requires_prescription: List[str] = field(default_factory=list)
    order_state: OrderState = OrderState.NONE
    awaiting_cancel_confirmation: bool = False  # Two-step cancellation flag
    last_action: Optional[str] = None  # Track last system action for confirmation context
    
    def add_message(self, role: str, content: str):
        self.conversation_history.append({"role": role, "content": content})
    
    def set_entity(self, key: str, value: Any):
        self.extracted_entities[key] = value
    
    def get_entity(self, key: str, default: Any = None) -> Any:
        """Get an entity from extracted entities."""
        return self.extracted_entities.get(key, default)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "customer_id": self.customer_id,
            "session_id": self.session_id,
            "language": self.language,
            "extracted_entities": self.extracted_entities,
            "policy_results": self.policy_results,
            "order_state": self.order_state.value,
            "last_action": self.last_action
        }


@dataclass
class AgentResponse:
    """Standardized response format for all agents."""
    success: bool
    data: Dict[str, Any]
    message: str = ""
    next_agent: Optional[str] = None
    requires_action: bool = False
    action_type: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "data": self.data,
            "message": self.message,
            "next_agent": self.next_agent,
            "requires_action": self.requires_action,
            "action_type": self.action_type
        }


class BaseAgent(ABC):
    """Abstract base class for all pharmacy agents."""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._llm = None
        self._tracer = None
    
    @property
    def llm(self):
        if self._llm is None:
            from services.llm_client import llm_client
            self._llm = llm_client
        return self._llm
    
    @property
    def tracer(self):
        if self._tracer is None:
            from services.langfuse_client import tracer
            self._tracer = tracer
        return self._tracer
    
    @abstractmethod
    async def process(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Optional[Any] = None
    ) -> AgentResponse:
        """Process input and return response. Must be implemented by subclasses."""
        pass
    
    async def create_span(self, trace: Any, operation: str, input_data: Dict[str, Any]) -> Any:
        """Create a traced span for an operation."""
        if trace and self.tracer:
            return self.tracer.create_span(
                trace,
                name=f"{self.name}.{operation}",
                input_data=input_data,
                metadata={"agent": self.name}
            )
        return None
    
    async def log_decision(
        self,
        trace: Any,
        decision: str,
        reasoning: str,
        confidence: float,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any]
    ):
        """Log a decision made by the agent for observability."""
        if trace and self.tracer:
            self.tracer.log_agent_decision(
                trace=trace,
                agent_name=self.name,
                decision=decision,
                reasoning=reasoning,
                confidence=confidence,
                input_data=input_data,
                output_data=output_data
            )
