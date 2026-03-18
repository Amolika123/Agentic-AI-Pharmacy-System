from agents.base_agent import OrderState

class OrderStateMachine:
    def __init__(self):
        # Define allowed transitions
        self.transitions: Dict[OrderState, List[OrderState]] = {
            OrderState.INITIATED: [OrderState.AWAITING_CONFIRMATION, OrderState.CANCELLED],
            OrderState.AWAITING_CONFIRMATION: [OrderState.CONFIRMED, OrderState.CANCELLED],
            OrderState.CONFIRMED: [OrderState.FULFILLED, OrderState.CANCELLED],
            OrderState.FULFILLED: [],  # Final state
            OrderState.CANCELLED: []   # Final state
        }

    def validate_transition(self, current_state: str, new_state: str) -> bool:
        """
        Check if a state transition is valid.
        
        Args:
            current_state: Current state string
            new_state: Target state string
            
        Returns:
            bool: True if valid, False otherwise
        """
        try:
            curr = OrderState(current_state)
            new = OrderState(new_state)
        except ValueError:
            return False  # Invalid state string

        if new in self.transitions.get(curr, []):
            return True
        return False

    def get_initial_state(self) -> str:
        return OrderState.INITIATED.value

# Singleton instance
order_state_machine = OrderStateMachine()
