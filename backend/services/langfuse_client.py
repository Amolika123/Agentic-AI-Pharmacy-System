"""
Langfuse Client for Observability in Agentic Pharmacy System.
Provides tracing for all agent decisions.
"""
import os
from typing import Dict, Any, Optional, List
from datetime import datetime


class LangfuseTracer:
    """
    Mock Langfuse tracer for observability.
    In production, configure with actual Langfuse credentials.
    """
    
    def __init__(self):
        self.public_key = os.getenv("LANGFUSE_PUBLIC_KEY", "")
        self.secret_key = os.getenv("LANGFUSE_SECRET_KEY", "")
        self.host = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
        self.enabled = bool(self.public_key and self.secret_key)
        self._client = None
        self.traces: List[Dict] = []  # In-memory storage for demo
    
    @property
    def client(self):
        if self._client is None and self.enabled:
            try:
                from langfuse import Langfuse
                self._client = Langfuse(
                    public_key=self.public_key,
                    secret_key=self.secret_key,
                    host=self.host
                )
            except ImportError:
                print("[LANGFUSE] langfuse package not installed")
        return self._client
    
    def create_trace(
        self,
        name: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict] = None,
        tags: Optional[List[str]] = None
    ) -> Any:
        """Create a new trace for observability."""
        trace_data = {
            "id": f"trace_{datetime.now().strftime('%Y%m%d%H%M%S')}_{len(self.traces)}",
            "name": name,
            "user_id": user_id,
            "session_id": session_id,
            "metadata": metadata or {},
            "tags": tags or [],
            "created_at": datetime.now().isoformat(),
            "spans": [],
            "decisions": []
        }
        
        self.traces.append(trace_data)
        
        if self.client:
            try:
                return self.client.trace(
                    name=name,
                    user_id=user_id,
                    session_id=session_id,
                    metadata=metadata,
                    tags=tags
                )
            except Exception as e:
                print(f"[LANGFUSE] Trace error: {e}")
        
        # Return mock trace object
        return MockTrace(trace_data, self)
    
    def create_span(
        self,
        trace: Any,
        name: str,
        input_data: Dict[str, Any],
        metadata: Optional[Dict] = None
    ) -> Any:
        """Create a span within a trace."""
        span_data = {
            "name": name,
            "input": input_data,
            "metadata": metadata or {},
            "start_time": datetime.now().isoformat()
        }
        
        if hasattr(trace, '_data'):
            trace._data["spans"].append(span_data)
        
        if self.client and hasattr(trace, 'span'):
            try:
                return trace.span(name=name, input=input_data, metadata=metadata)
            except:
                pass
        
        return MockSpan(span_data)
    
    def log_agent_decision(
        self,
        trace: Any,
        agent_name: str,
        decision: str,
        reasoning: str,
        confidence: float,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any]
    ):
        """Log an agent's decision for Chain of Thought visibility."""
        decision_log = {
            "agent": agent_name,
            "decision": decision,
            "reasoning": reasoning,
            "confidence": confidence,
            "input": input_data,
            "output": output_data,
            "timestamp": datetime.now().isoformat()
        }
        
        if hasattr(trace, '_data'):
            trace._data["decisions"].append(decision_log)
        
        # Print for console visibility
        print(f"[DECISION] {agent_name}: {decision}")
        print(f"  Reasoning: {reasoning}")
        print(f"  Confidence: {confidence:.2f}")
        
        if self.client and hasattr(trace, 'event'):
            try:
                trace.event(
                    name=f"{agent_name}_decision",
                    metadata={
                        "decision": decision,
                        "reasoning": reasoning,
                        "confidence": confidence
                    },
                    input=input_data,
                    output=output_data
                )
            except:
                pass
    
    def flush(self):
        """Flush pending traces."""
        if self.client:
            try:
                self.client.flush()
            except:
                pass
    
    def get_traces(self, limit: int = 10) -> List[Dict]:
        """Get recent traces for admin view."""
        return self.traces[-limit:]


class MockTrace:
    """Mock trace object for when Langfuse is not configured."""
    
    def __init__(self, data: Dict, tracer: LangfuseTracer):
        self._data = data
        self._tracer = tracer
        self.id = data["id"]
    
    def update(self, metadata: Dict = None):
        if metadata:
            self._data["metadata"].update(metadata)
    
    def span(self, **kwargs):
        return self._tracer.create_span(self, kwargs.get("name", ""), kwargs.get("input", {}))
    
    def event(self, **kwargs):
        pass


class MockSpan:
    """Mock span object."""
    
    def __init__(self, data: Dict):
        self._data = data
    
    def end(self, output: Dict = None):
        self._data["output"] = output
        self._data["end_time"] = datetime.now().isoformat()


# Singleton instance
tracer = LangfuseTracer()
