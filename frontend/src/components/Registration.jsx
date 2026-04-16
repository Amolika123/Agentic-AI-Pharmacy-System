import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../LanguageContext'

const API = import.meta.env.VITE_API_URL ?? ''

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATION COMPONENT - AI-guided conversational registration
// Uses global language context for translations
// ═══════════════════════════════════════════════════════════════════════════

function Registration({ onComplete, onSwitchToLogin }) {
    const { t, langCode } = useLanguage()
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState(null)
    const [registrationStarted, setRegistrationStarted] = useState(false)
    const [registrationComplete, setRegistrationComplete] = useState(false)
    const [newCustomerId, setNewCustomerId] = useState(null)
    const messagesEndRef = useRef(null)

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
            const response = await fetch(`${API}/api/v1/register/start`, {
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
            const response = await fetch(`${API}/api/v1/register/step`, {
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
                        <h1 className="hero-title">{t('registration.title')}</h1>
                        <p className="hero-subtitle">{t('registration.subtitle')}</p>
                    </div>

                    <div className="registration-benefits">
                        {(t('registration.benefits') || []).map((benefit, idx) => (
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
                        {isLoading ? t('registration.starting') : t('registration.startBtn')}
                    </button>

                    {onSwitchToLogin && (
                        <p className="switch-prompt">
                            {t('registration.switchToLogin')}{' '}
                            <button className="link-btn" onClick={onSwitchToLogin}>
                                {t('registration.login')}
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
                    <h2>📝 {t('registration.title')}</h2>
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
                            placeholder={t('registration.placeholder')}
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
