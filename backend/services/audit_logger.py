"""
Audit Logger Service
Logs critical actions to a structured JSON log file for compliance and tracking.
"""
import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

class AuditLogger:
    def __init__(self, log_dir: str = "data", log_file: str = "audit_log.json"):
        self.log_path = Path(__file__).parent.parent / log_dir / log_file
        self._ensure_log_file()

    def _ensure_log_file(self):
        """Ensure the audit log file exists."""
        if not self.log_path.exists():
            with open(self.log_path, "w", encoding="utf-8") as f:
                f.write("")  # Create empty file

    def log_action(
        self,
        action_type: str,
        user_id: str,
        role: str = "patient",
        payload: Optional[Dict[str, Any]] = None,
        status: str = "success",
        reason: Optional[str] = None
    ):
        """
        Log a critical action.
        
        Args:
            action_type: What happened (e.g., 'add_to_cart', 'confirm_order')
            user_id: Who did it
            role: user role
            payload: Relevant data (medicine info, order id, etc.)
            status: success/failure
            reason: error message or reason for failure
        """
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "unixtime": time.time(),
            "user_id": user_id,
            "role": role,
            "action_type": action_type,
            "status": status,
            "payload": payload or {},
            "reason": reason
        }
        
        try:
            # Append as JSON line for efficiency and resilience
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception as e:
            logging.error(f"Failed to write audit log: {e}")

# Singleton instance
audit_logger = AuditLogger()
