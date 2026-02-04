import { useState, useEffect, useRef } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATION COMPONENT - AI-guided conversational registration
// ═══════════════════════════════════════════════════════════════════════════

const TEXTS = {
    EN: {
        title: 'Create Account',
        subtitle: 'Chat with our AI to register',
        startBtn: 'Start Registration',
        placeholder: 'Type your answer...',
        switchToLogin: 'Already have an account?',
        benefits: [
            '💬 Conversational ordering via chat',
            '🛒 Browse our medicine catalog',
            '🔔 Personalized refill reminders',
            '📋 Prescription upload & analysis'
        ]
    },
    DE: {
        title: 'Konto erstellen',
        subtitle: 'Chatten Sie mit unserer KI zur Registrierung',
        startBtn: 'Registrierung starten',
        placeholder: 'Geben Sie Ihre Antwort ein...',
        switchToLogin: 'Haben Sie bereits ein Konto?',
        benefits: [
            '💬 Bestellung per Chat',
            '🛒 Medikamentenkatalog durchsuchen',
            '🔔 Personalisierte Nachfüllerinnerungen',
            '📋 Rezept-Upload & Analyse'
        ]
    },
    HI: {
        title: 'खाता बनाएं',
        subtitle: 'पंजीकरण के लिए AI से चैट करें',
        startBtn: 'पंजीकरण शुरू करें',
        placeholder: 'अपना जवाब लिखें...',
        switchToLogin: 'पहले से खाता है?',
        benefits: [
            '💬 चैट के माध्यम से ऑर्डर',
            '🛒 दवाई कैटलॉग देखें',
            '🔔 व्यक्तिगत रिफिल रिमाइंडर',
            '📋 प्रिस्क्रिप्शन अपलोड'
        ]
    }
}

function Registration({ language = 'EN', onComplete, onSwitchToLogin }) {
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState(null)
    const [registrationStarted, setRegistrationStarted] = useState(false)
    const [registrationComplete, setRegistrationComplete] = useState(false)
    const [newCustomerId, setNewCustomerId] = useState(null)
    const messagesEndRef = useRef(null)

    const t = TEXTS[language] || TEXTS.EN
    const langCode = language.toLowerCase()

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const startRegistration = async () => {
        setIsLoading(true)
        setRegistrationStarted(true)

        try {
            const response = await fetch('/api/v1/register/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: langCode })
            })

            const data = await response.json()

            if (data.session_id) {
                setSessionId(data.session_id)
            }

            setMessages([{
                role: 'assistant',
                content: data.response,
                timestamp: new Date().toISOString()
            }])
        } catch (error) {
            console.error('Failed to start registration:', error)
            setMessages([{
                role: 'assistant',
                content: '⚠️ Unable to start registration. Please check if the backend is running.',
                timestamp: new Date().toISOString()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return

        const userMessage = {
            role: 'user',
            content: inputValue,
            timestamp: new Date().toISOString()
        }

        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setIsLoading(true)

        try {
            const response = await fetch('/api/v1/register/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: inputValue,
                    language: langCode
                })
            })

            const data = await response.json()

            const assistantMessage = {
                role: 'assistant',
                content: data.response,
                timestamp: new Date().toISOString()
            }

            setMessages(prev => [...prev, assistantMessage])

            // Check if registration completed
            if (data.completed && data.customer_id) {
                setRegistrationComplete(true)
                setNewCustomerId(data.customer_id)

                // Notify parent after a delay
                setTimeout(() => {
                    if (onComplete) {
                        onComplete(data.customer_id)
                    }
                }, 3000)
            }

            // Check if cancelled
            if (data.cancelled) {
                setRegistrationStarted(false)
                setMessages([])
            }

        } catch (error) {
            console.error('Registration step failed:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Connection error. Please try again.',
                timestamp: new Date().toISOString()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Landing view before starting registration
    if (!registrationStarted) {
        return (
            <div className="registration-container">
                <div className="registration-landing">
                    <div className="registration-hero">
                        <span className="hero-icon">🏥</span>
                        <h1 className="hero-title">{t.title}</h1>
                        <p className="hero-subtitle">{t.subtitle}</p>
                    </div>

                    <div className="registration-benefits">
                        {t.benefits.map((benefit, idx) => (
                            <div key={idx} className="benefit-item">
                                {benefit}
                            </div>
                        ))}
                    </div>

                    <button
                        className="start-registration-btn"
                        onClick={startRegistration}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Starting...' : t.startBtn}
                    </button>

                    {onSwitchToLogin && (
                        <p className="switch-prompt">
                            {t.switchToLogin}{' '}
                            <button className="link-btn" onClick={onSwitchToLogin}>
                                Login
                            </button>
                        </p>
                    )}
                </div>
            </div>
        )
    }

    // Registration chat view
    return (
        <div className="registration-container">
            <div className="registration-chat">
                <div className="registration-header">
                    <h2>📝 {t.title}</h2>
                    {registrationComplete && newCustomerId && (
                        <span className="customer-id-badge">ID: {newCustomerId}</span>
                    )}
                </div>

                <div className="registration-messages">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`reg-message ${msg.role}`}>
                            <div className="reg-message-content" style={{ whiteSpace: 'pre-wrap' }}>
                                {msg.content}
                            </div>
                            <div className="reg-message-meta">
                                {formatTime(msg.timestamp)}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="reg-message assistant">
                            <div className="reg-message-content">
                                <div className="loading-dots">
                                    <span className="loading-dot"></span>
                                    <span className="loading-dot"></span>
                                    <span className="loading-dot"></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {!registrationComplete && (
                    <div className="registration-input-area">
                        <input
                            type="text"
                            className="registration-input"
                            placeholder={t.placeholder}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            autoFocus
                        />
                        <button
                            className="registration-send-btn"
                            onClick={sendMessage}
                            disabled={isLoading || !inputValue.trim()}
                        >
                            ➤
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Registration
