"""
Registration Agent - AI-guided user registration for new patients.
Multilingual support with EN and DE as primary languages.
"""
from typing import Dict, Any, Optional
from agents.base_agent import BaseAgent, AgentResponse, AgentContext
from datetime import datetime
import csv
import re
import uuid
from pathlib import Path


class RegistrationAgent(BaseAgent):
    """
    AI-guided registration agent that:
    - Collects user data conversationally
    - Validates fields in real-time
    - Supports multilingual prompts (EN, DE, HI)
    - Creates customer records in database
    """
    
    def __init__(self):
        super().__init__(
            name="registration_agent",
            description="AI-guided user registration with multilingual support"
        )
        
        # Registration steps
        self.STEPS = ["name", "email", "phone", "address", "age", "allergies", "confirm"]
        
        # Multilingual prompts
        self.PROMPTS = {
            "en": {
                "welcome": "👋 Welcome! I'll help you register for our pharmacy service.\n\nWhat's your **full name**?",
                "name_confirm": "Nice to meet you, {name}! 📝\n\nWhat's your **email address**?",
                "email_confirm": "Got it! ✉️\n\nWhat's your **phone number**? (Include country code if international)",
                "phone_confirm": "📱 Perfect!\n\nWhat's your **address** for delivery?",
                "address_confirm": "🏠 Address saved!\n\nWhat's your **date of birth** or **age**?",
                "age_confirm": "📅 Great!\n\nDo you have any **allergies** or **medical conditions** I should know about?\n(Type 'None' if not applicable)",
                "allergies_confirm": "Thanks for sharing! Here's your registration summary:\n\n{summary}\n\n**Is this information correct?** (Yes/No)",
                "success": "✅ **Registration complete!**\n\nYour Customer ID is: **{customer_id}**\n\nYou can now:\n• Order medicines via chat\n• Browse our catalog\n• Get personalized refill reminders\n\nWelcome to our pharmacy! 🏥",
                "cancelled": "❌ Registration cancelled. You can start again anytime by saying 'register'.",
                "invalid_email": "⚠️ That doesn't look like a valid email. Please enter a valid email address.",
                "invalid_phone": "⚠️ Please enter a valid phone number with at least 10 digits.",
                "invalid_age": "⚠️ Please enter a valid age (number between 1 and 120) or date of birth."
            },
            "de": {
                "welcome": "👋 Willkommen! Ich helfe Ihnen bei der Registrierung für unseren Apothekenservice.\n\nWie ist Ihr **vollständiger Name**?",
                "name_confirm": "Freut mich, Sie kennenzulernen, {name}! 📝\n\nWie lautet Ihre **E-Mail-Adresse**?",
                "email_confirm": "Verstanden! ✉️\n\nWie lautet Ihre **Telefonnummer**? (Bitte mit Landesvorwahl)",
                "phone_confirm": "📱 Perfekt!\n\nWie lautet Ihre **Lieferadresse**?",
                "address_confirm": "🏠 Adresse gespeichert!\n\nWas ist Ihr **Geburtsdatum** oder **Alter**?",
                "age_confirm": "📅 Prima!\n\nHaben Sie **Allergien** oder **Erkrankungen**, die ich wissen sollte?\n(Schreiben Sie 'Keine' falls nicht)",
                "allergies_confirm": "Danke für die Informationen! Hier ist Ihre Registrierungsübersicht:\n\n{summary}\n\n**Sind diese Angaben korrekt?** (Ja/Nein)",
                "success": "✅ **Registrierung abgeschlossen!**\n\nIhre Kundennummer ist: **{customer_id}**\n\nSie können jetzt:\n• Medikamente per Chat bestellen\n• Unseren Katalog durchsuchen\n• Personalisierte Nachfüllerinnerungen erhalten\n\nWillkommen in unserer Apotheke! 🏥",
                "cancelled": "❌ Registrierung abgebrochen. Sie können jederzeit mit 'registrieren' neu starten.",
                "invalid_email": "⚠️ Das sieht nicht nach einer gültigen E-Mail aus. Bitte geben Sie eine gültige E-Mail-Adresse ein.",
                "invalid_phone": "⚠️ Bitte geben Sie eine gültige Telefonnummer mit mindestens 10 Ziffern ein.",
                "invalid_age": "⚠️ Bitte geben Sie ein gültiges Alter (1-120) oder Geburtsdatum ein."
            },
            "hi": {
                "welcome": "👋 स्वागत है! मैं आपको हमारी फार्मेसी सेवा के लिए पंजीकरण में मदद करूंगा।\n\nआपका **पूरा नाम** क्या है?",
                "name_confirm": "आपसे मिलकर खुशी हुई, {name}! 📝\n\nआपका **ईमेल पता** क्या है?",
                "email_confirm": "समझ गया! ✉️\n\nआपका **फोन नंबर** क्या है?",
                "phone_confirm": "📱 बढ़िया!\n\nआपका **पता** क्या है?",
                "address_confirm": "🏠 पता सहेजा गया!\n\nआपकी **जन्म तिथि** या **उम्र** क्या है?",
                "age_confirm": "📅 बहुत अच्छा!\n\nक्या आपको कोई **एलर्जी** या **बीमारी** है?\n(अगर नहीं तो 'कोई नहीं' लिखें)",
                "allergies_confirm": "धन्यवाद! यहां आपका पंजीकरण सारांश है:\n\n{summary}\n\n**क्या यह जानकारी सही है?** (हां/नहीं)",
                "success": "✅ **पंजीकरण पूरा हुआ!**\n\nआपकी ग्राहक आईडी है: **{customer_id}**\n\nअब आप:\n• चैट के माध्यम से दवाइयाँ ऑर्डर कर सकते हैं\n• हमारा कैटलॉग देख सकते हैं\n• व्यक्तिगत रिफिल रिमाइंडर प्राप्त कर सकते हैं\n\nहमारी फार्मेसी में स्वागत है! 🏥",
                "cancelled": "❌ पंजीकरण रद्द। आप कभी भी 'पंजीकरण' कहकर फिर से शुरू कर सकते हैं।",
                "invalid_email": "⚠️ यह वैध ईमेल नहीं लगता। कृपया सही ईमेल पता दर्ज करें।",
                "invalid_phone": "⚠️ कृपया कम से कम 10 अंकों वाला वैध फोन नंबर दर्ज करें।",
                "invalid_age": "⚠️ कृपया वैध उम्र (1-120) या जन्म तिथि दर्ज करें।"
            }
        }
        
        # Registration sessions (session_id -> registration_data)
        self.registration_sessions: Dict[str, Dict[str, Any]] = {}
    
    def _get_prompt(self, key: str, lang: str = "en", **kwargs) -> str:
        """Get localized prompt with variable substitution."""
        prompts = self.PROMPTS.get(lang, self.PROMPTS["en"])
        prompt = prompts.get(key, self.PROMPTS["en"].get(key, ""))
        return prompt.format(**kwargs) if kwargs else prompt
    
    def _validate_email(self, email: str) -> bool:
        """Validate email format."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email.strip()))
    
    def _validate_phone(self, phone: str) -> bool:
        """Validate phone number (at least 10 digits)."""
        digits = re.sub(r'\D', '', phone)
        return len(digits) >= 10
    
    def _validate_age(self, age_input: str) -> Optional[str]:
        """Validate and extract age or date of birth. Returns normalized value or None."""
        age_input = age_input.strip()
        
        # Try parsing as number (age)
        if age_input.isdigit():
            age = int(age_input)
            if 1 <= age <= 120:
                return age_input
            return None
        
        # Try parsing as date
        date_patterns = [
            r'(\d{4})-(\d{1,2})-(\d{1,2})',  # YYYY-MM-DD
            r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})',  # DD/MM/YYYY or MM/DD/YYYY
        ]
        
        for pattern in date_patterns:
            match = re.match(pattern, age_input)
            if match:
                return age_input
        
        return None
    
    def _generate_customer_id(self) -> str:
        """Generate unique customer ID."""
        csv_path = Path(__file__).parent.parent / "data" / "customers.csv"
        existing_ids = set()
        
        if csv_path.exists():
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    existing_ids.add(row.get("customer_id", ""))
        
        # Generate new ID
        counter = len(existing_ids) + 1
        while True:
            new_id = f"CUST{counter:03d}"
            if new_id not in existing_ids:
                return new_id
            counter += 1
    
    def _create_customer_record(self, data: Dict[str, Any]) -> str:
        """Create customer record in CSV and return customer_id."""
        csv_path = Path(__file__).parent.parent / "data" / "customers.csv"
        
        customer_id = self._generate_customer_id()
        
        new_customer = {
            "customer_id": customer_id,
            "name": data.get("name", ""),
            "phone": data.get("phone", ""),
            "email": data.get("email", ""),
            "date_of_birth": data.get("age", ""),
            "language": data.get("language", "en"),
            "address": data.get("address", ""),
            "registered_date": datetime.now().strftime("%Y-%m-%d"),
            "chronic_conditions": "None",
            "allergies": data.get("allergies", "None"),
            "active": "true"
        }
        
        # Check if file exists and has headers
        fieldnames = ["customer_id", "name", "phone", "email", "date_of_birth", 
                      "language", "address", "registered_date", "chronic_conditions", 
                      "allergies", "active"]
        
        file_exists = csv_path.exists() and csv_path.stat().st_size > 0
        
        with open(csv_path, "a", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            writer.writerow(new_customer)
        
        return customer_id
    
    def _format_summary(self, data: Dict[str, Any], lang: str = "en") -> str:
        """Format registration summary for confirmation."""
        labels = {
            "en": {"name": "Name", "email": "Email", "phone": "Phone", "address": "Address", "age": "Age/DOB", "allergies": "Allergies"},
            "de": {"name": "Name", "email": "E-Mail", "phone": "Telefon", "address": "Adresse", "age": "Alter/Geb.", "allergies": "Allergien"},
            "hi": {"name": "नाम", "email": "ईमेल", "phone": "फोन", "address": "पता", "age": "उम्र", "allergies": "एलर्जी"}
        }
        
        l = labels.get(lang, labels["en"])
        lines = [
            f"📝 **{l['name']}**: {data.get('name', 'N/A')}",
            f"✉️ **{l['email']}**: {data.get('email', 'N/A')}",
            f"📱 **{l['phone']}**: {data.get('phone', 'N/A')}",
            f"🏠 **{l['address']}**: {data.get('address', 'N/A')}",
            f"📅 **{l['age']}**: {data.get('age', 'N/A')}",
            f"⚠️ **{l['allergies']}**: {data.get('allergies', 'None')}"
        ]
        return "\n".join(lines)
    
    async def start_registration(self, session_id: str, language: str = "en") -> Dict[str, Any]:
        """Start a new registration session."""
        self.registration_sessions[session_id] = {
            "step": "name",
            "language": language,
            "data": {},
            "started_at": datetime.utcnow().isoformat()
        }
        
        return {
            "success": True,
            "response": self._get_prompt("welcome", language),
            "step": "name",
            "is_registration": True
        }
    
    async def process_registration_step(
        self, 
        session_id: str, 
        message: str, 
        language: str = "en"
    ) -> Dict[str, Any]:
        """Process a step in the registration flow."""
        
        session = self.registration_sessions.get(session_id)
        if not session:
            # Start new registration
            return await self.start_registration(session_id, language)
        
        lang = session.get("language", language)
        current_step = session.get("step")
        data = session.get("data", {})
        
        message = message.strip()
        
        # Handle confirmation step
        if current_step == "confirm":
            affirmatives = ["yes", "y", "ja", "हां", "हाँ", "सही", "correct", "confirm"]
            negatives = ["no", "n", "nein", "नहीं", "cancel", "wrong"]
            
            if any(word in message.lower() for word in affirmatives):
                # Create customer record
                data["language"] = lang
                customer_id = self._create_customer_record(data)
                
                # Clean up session
                del self.registration_sessions[session_id]
                
                return {
                    "success": True,
                    "response": self._get_prompt("success", lang, customer_id=customer_id),
                    "customer_id": customer_id,
                    "is_registration": True,
                    "completed": True
                }
            elif any(word in message.lower() for word in negatives):
                del self.registration_sessions[session_id]
                return {
                    "success": True,
                    "response": self._get_prompt("cancelled", lang),
                    "is_registration": True,
                    "cancelled": True
                }
            else:
                # Ask again
                summary = self._format_summary(data, lang)
                return {
                    "success": True,
                    "response": self._get_prompt("allergies_confirm", lang, summary=summary),
                    "step": "confirm",
                    "is_registration": True
                }
        
        # Process current step
        if current_step == "name":
            data["name"] = message
            session["step"] = "email"
            session["data"] = data
            return {
                "success": True,
                "response": self._get_prompt("name_confirm", lang, name=message),
                "step": "email",
                "is_registration": True
            }
        
        elif current_step == "email":
            if not self._validate_email(message):
                return {
                    "success": True,
                    "response": self._get_prompt("invalid_email", lang),
                    "step": "email",
                    "is_registration": True
                }
            data["email"] = message.strip()
            session["step"] = "phone"
            session["data"] = data
            return {
                "success": True,
                "response": self._get_prompt("email_confirm", lang),
                "step": "phone",
                "is_registration": True
            }
        
        elif current_step == "phone":
            if not self._validate_phone(message):
                return {
                    "success": True,
                    "response": self._get_prompt("invalid_phone", lang),
                    "step": "phone",
                    "is_registration": True
                }
            data["phone"] = message.strip()
            session["step"] = "address"
            session["data"] = data
            return {
                "success": True,
                "response": self._get_prompt("phone_confirm", lang),
                "step": "address",
                "is_registration": True
            }
        
        elif current_step == "address":
            data["address"] = message
            session["step"] = "age"
            session["data"] = data
            return {
                "success": True,
                "response": self._get_prompt("address_confirm", lang),
                "step": "age",
                "is_registration": True
            }
        
        elif current_step == "age":
            validated_age = self._validate_age(message)
            if not validated_age:
                return {
                    "success": True,
                    "response": self._get_prompt("invalid_age", lang),
                    "step": "age",
                    "is_registration": True
                }
            data["age"] = validated_age
            session["step"] = "allergies"
            session["data"] = data
            return {
                "success": True,
                "response": self._get_prompt("age_confirm", lang),
                "step": "allergies",
                "is_registration": True
            }
        
        elif current_step == "allergies":
            allergies = message.strip()
            if allergies.lower() in ["none", "no", "keine", "nein", "कोई नहीं", "नहीं"]:
                allergies = "None"
            data["allergies"] = allergies
            session["step"] = "confirm"
            session["data"] = data
            
            summary = self._format_summary(data, lang)
            return {
                "success": True,
                "response": self._get_prompt("allergies_confirm", lang, summary=summary),
                "step": "confirm",
                "is_registration": True
            }
        
        return {
            "success": False,
            "response": "Unknown registration step.",
            "is_registration": True
        }
    
    def is_registration_active(self, session_id: str) -> bool:
        """Check if there's an active registration for this session."""
        return session_id in self.registration_sessions
    
    async def process(
        self,
        input_data: Dict[str, Any],
        context: AgentContext,
        trace: Any = None
    ) -> AgentResponse:
        """Process input through registration flow."""
        message = input_data.get("message", "")
        session_id = str(context.session_id) if context.session_id else str(uuid.uuid4())
        language = input_data.get("language", "en")
        
        result = await self.process_registration_step(session_id, message, language)
        
        return AgentResponse(
            success=result.get("success", True),
            message=result.get("response", ""),
            data=result
        )


# Singleton instance
registration_agent = RegistrationAgent()
