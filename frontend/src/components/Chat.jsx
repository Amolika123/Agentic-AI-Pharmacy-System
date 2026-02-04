import { useState, useEffect, useRef } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE CONFIGURATION - Visible tabs for EN, HI, DE
// ═══════════════════════════════════════════════════════════════════════════
const LANGUAGES = {
    EN: { code: 'en', label: 'English', native: 'English' },
    HI: { code: 'hi', label: 'Hindi', native: 'हिंदी' },
    DE: { code: 'de', label: 'German', native: 'Deutsch' }
}

const LANGUAGE_CONFIRMATIONS = {
    EN: "🌐 Language set to English.",
    HI: "🌐 भाषा हिंदी में बदल दी गई है।",
    DE: "🌐 Sprache auf Deutsch umgestellt."
}

const WELCOME_MESSAGES = {
    EN: '👋 Welcome to our Smart Pharmacy!\n\nI\'m your AI pharmacist assistant. I can help you:\n• Order medicines (just tell me what you need)\n• Check medicine availability\n• Refill your prescriptions\n• Answer questions about your medications\n\nHow can I help you today?',
    HI: '👋 हमारी स्मार्ट फार्मेसी में आपका स्वागत है!\n\nमैं आपका AI फार्मासिस्ट सहायक हूँ। मैं आपकी मदद कर सकता हूँ:\n• दवाइयाँ ऑर्डर करें\n• दवाई की उपलब्धता जाँचें\n• प्रिस्क्रिप्शन रिफिल करें\n• दवाओं के बारे में सवाल पूछें\n\nआज मैं आपकी कैसे मदद कर सकता हूँ?',
    DE: '👋 Willkommen in unserer Smart-Apotheke!\n\nIch bin Ihr KI-Apotheker-Assistent. Ich kann Ihnen helfen:\n• Medikamente bestellen\n• Medikamentenverfügbarkeit prüfen\n• Rezepte nachfüllen\n• Fragen zu Ihren Medikamenten beantworten\n\nWie kann ich Ihnen heute helfen?'
}

const QUICK_ACTIONS = {
    EN: ["I need Paracetamol", "Check if Ibuprofen is available", "Refill my prescription", "Cancel my order"],
    HI: ["मुझे पैरासिटामोल चाहिए", "आइबुप्रोफेन उपलब्ध है?", "मेरी दवाई रिफिल करें", "मेरा ऑर्डर रद्द करें"],
    DE: ["Ich brauche Paracetamol", "Ist Ibuprofen verfügbar?", "Mein Rezept nachfüllen", "Meine Bestellung stornieren"]
}

const PLACEHOLDERS = {
    EN: 'Type your medicine order or question...',
    HI: 'अपनी दवाई का ऑर्डर या प्रश्न लिखें...',
    DE: 'Geben Sie Ihre Bestellung oder Frage ein...'
}

const CANCEL_BUTTONS = {
    EN: { yes: 'Yes, cancel my order', no: 'No, keep my order' },
    HI: { yes: 'हाँ, ऑर्डर रद्द करें', no: 'नहीं, ऑर्डर रखें' },
    DE: { yes: 'Ja, Bestellung stornieren', no: 'Nein, Bestellung behalten' }
}

function Chat({ customerId: propCustomerId, language: propLanguage, onCartUpdate }) {
    // Use props if provided, otherwise use internal state
    const [internalCustomerId, setInternalCustomerId] = useState('CUST001')
    const [internalLanguage, setInternalLanguage] = useState('EN')

    const customerId = propCustomerId || internalCustomerId
    const selectedLanguage = propLanguage || internalLanguage

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: WELCOME_MESSAGES[selectedLanguage] || WELCOME_MESSAGES.EN,
            timestamp: new Date().toISOString()
        }
    ])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState(null)
    const [pendingConfirmation, setPendingConfirmation] = useState(null)
    const [isRecording, setIsRecording] = useState(false)
    const [systemStatus, setSystemStatus] = useState(null)
    const [refillAlerts, setRefillAlerts] = useState([])
    const [cancelConfirmation, setCancelConfirmation] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const messagesEndRef = useRef(null)
    const recognitionRef = useRef(null)
    const fileInputRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        fetchSystemStatus()
        initVoiceRecognition()
        fetchRefillAlerts()
    }, [])

    // Fetch refill alerts when customer changes
    useEffect(() => {
        fetchRefillAlerts()
    }, [customerId])

    const fetchRefillAlerts = async () => {
        try {
            const response = await fetch(`/api/v1/alerts/${customerId}`)
            const data = await response.json()
            if (data.alerts) {
                setRefillAlerts(data.alerts)
            }
        } catch (error) {
            console.error('Failed to fetch refill alerts:', error)
        }
    }

    const fetchSystemStatus = async () => {
        try {
            const response = await fetch('/api/v1/admin/status')
            const data = await response.json()
            setSystemStatus(data)
        } catch (error) {
            console.error('Failed to fetch status:', error)
        }
    }

    const initVoiceRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = false
            recognitionRef.current.interimResults = false
            recognitionRef.current.lang = 'en-US'

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript
                setInputValue(transcript)
                sendMessage(transcript)
                setIsRecording(false)
            }

            recognitionRef.current.onerror = () => setIsRecording(false)
            recognitionRef.current.onend = () => setIsRecording(false)
        }
    }

    const toggleVoice = () => {
        if (!recognitionRef.current) return
        if (isRecording) {
            recognitionRef.current.stop()
        } else {
            recognitionRef.current.start()
            setIsRecording(true)
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LANGUAGE TAB HANDLER - Instant switch with confirmation message
    // ═══════════════════════════════════════════════════════════════════════
    const handleLanguageChange = (langKey) => {
        if (langKey === selectedLanguage) return
        setSelectedLanguage(langKey)

        // Add confirmation message to chat
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: LANGUAGE_CONFIRMATIONS[langKey],
            timestamp: new Date().toISOString()
        }])
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CANCELLATION CONFIRMATION HANDLER
    // ═══════════════════════════════════════════════════════════════════════
    const handleCancelConfirmation = async (confirmed) => {
        if (!cancelConfirmation) return
        setCancelConfirmation(null)

        // Send the confirmation/decline as a message
        const confirmText = confirmed ? 'yes' : 'no'
        await sendMessage(confirmText)
    }

    const sendMessage = async (messageText = inputValue) => {
        if (!messageText.trim() || isLoading) return

        const userMessage = {
            role: 'user',
            content: messageText,
            timestamp: new Date().toISOString()
        }

        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setIsLoading(true)

        try {
            const response = await fetch('/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    customer_id: customerId,
                    session_id: sessionId,
                    is_voice: isRecording,
                    language: LANGUAGES[selectedLanguage].code
                })
            })

            const data = await response.json()

            if (data.session_id) setSessionId(data.session_id)

            const assistantMessage = {
                role: 'assistant',
                content: data.response || 'I apologize, please ensure Ollama is running.',
                timestamp: new Date().toISOString(),
                traceId: data.trace_id,
                data: data.data
            }

            setMessages(prev => [...prev, assistantMessage])

            // Check if confirmation needed
            if (data.data?.status === 'awaiting_confirmation') {
                setPendingConfirmation({ sessionId: data.session_id })
            }

            // Check for cancel confirmation
            if (data.data?.status === 'awaiting_cancel_confirmation') {
                setCancelConfirmation({ sessionId: data.session_id, message: data.response })
            }

            // Refresh cart if items were added
            if (data.data?.added_to_cart && onCartUpdate) {
                onCartUpdate()
            }

        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Cannot connect. Ensure backend is running:\n`python -m uvicorn api.main:app --reload`',
                timestamp: new Date().toISOString()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleConfirmation = async (confirmed) => {
        if (!pendingConfirmation) return
        setIsLoading(true)

        try {
            const response = await fetch('/api/v1/chat/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: pendingConfirmation.sessionId,
                    confirmed
                })
            })

            const data = await response.json()
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response,
                timestamp: new Date().toISOString()
            }])
        } catch (error) {
            console.error('Confirmation error:', error)
        } finally {
            setIsLoading(false)
            setPendingConfirmation(null)
            // Refresh cart after confirmation
            if (onCartUpdate) onCartUpdate()
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

    const handleRefill = (alert) => {
        const message = `I want to refill ${alert.medicine_name}`
        sendMessage(message)
    }

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64String = reader.result
            setImagePreview(base64String)

            // Add user message with image preview locally
            const userMessage = {
                role: 'user',
                content: '📄 Uploaded Prescription',
                timestamp: new Date().toISOString(),
                image: base64String
            }
            setMessages(prev => [...prev, userMessage])
            setIsLoading(true)

            try {
                const response = await fetch('/api/v1/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: "", // Empty message for direct upload
                        customer_id: customerId,
                        session_id: sessionId,
                        image_data: base64String,
                        language: LANGUAGES[selectedLanguage].code
                    })
                })

                const data = await response.json()
                if (data.session_id) setSessionId(data.session_id)

                const assistantMessage = {
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date().toISOString(),
                    traceId: data.trace_id,
                    data: data.data
                }
                setMessages(prev => [...prev, assistantMessage])

                // Check for confirmation if needed
                if (data.data?.status === 'awaiting_confirmation') {
                    setPendingConfirmation({ sessionId: data.session_id })
                }
                // Check for cancel confirmation
                if (data.data?.status === 'awaiting_cancel_confirmation') {
                    // handled by orchestrator response flow usually, but good to be safe if custom UI needed
                }

            } catch (error) {
                console.error('Upload failed:', error)
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '⚠️ Failed to upload. Please check backend connection.',
                    timestamp: new Date().toISOString()
                }])
            } finally {
                setIsLoading(false)
                setImagePreview(null)
            }
        }
        reader.readAsDataURL(file)
    }

    // Dynamic quick actions based on selected language
    const quickActions = QUICK_ACTIONS[selectedLanguage]

    const customerOptions = [
        { id: 'CUST001', name: 'Rajesh Kumar' },
        { id: 'CUST003', name: 'Hans Mueller' },
        { id: 'CUST005', name: 'Mohammed Ali' },
        { id: 'CUST007', name: 'Ramesh Iyer' }
    ]

    return (
        <>
            <div className="chat-container">
                <div className="chat-header">
                    <h2 className="chat-title">🏥 Smart Pharmacy</h2>

                    {/* ═══════════════════════════════════════════════════════════════ */}
                    {/* LANGUAGE TABS - Always visible, instant switch */}
                    {/* ═══════════════════════════════════════════════════════════════ */}
                    <div className="language-selector">
                        {Object.entries(LANGUAGES).map(([key, lang]) => (
                            <button
                                key={key}
                                className={`lang-btn ${selectedLanguage === key ? 'active' : ''}`}
                                onClick={() => handleLanguageChange(key)}
                            >
                                {lang.native}
                            </button>
                        ))}
                    </div>

                    <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        style={{
                            background: 'var(--bg-glass)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.25rem 0.5rem',
                            color: 'var(--text-primary)',
                            fontSize: '0.75rem'
                        }}
                    >
                        {customerOptions.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.role}`}>
                            <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>
                                {msg.image && (
                                    <img src={msg.image} alt="Uploaded" style={{ maxWidth: '200px', borderRadius: '8px', marginBottom: '8px', display: 'block' }} />
                                )}
                                {msg.content}
                            </div>
                            <div className="message-meta">
                                <span>{formatTime(msg.timestamp)}</span>
                                {msg.traceId && (
                                    <span style={{ color: 'var(--accent-primary)', fontSize: '0.7rem' }}>
                                        🔍 {msg.traceId.slice(0, 8)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="message assistant">
                            <div className="message-content">
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

                {/* Quick Actions */}
                <div style={{
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    borderTop: '1px solid var(--border-color)'
                }}>
                    {quickActions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => sendMessage(action)}
                            className="quick-action-btn"
                        >
                            {action}
                        </button>
                    ))}
                </div>

                <div className="chat-input-area">
                    <label className="voice-btn upload-btn" title="Upload Prescription" style={{ cursor: 'pointer' }}>
                        📄
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            ref={fileInputRef}
                            hidden
                        />
                    </label>
                    <button
                        className={`voice-btn ${isRecording ? 'recording' : ''}`}
                        onClick={toggleVoice}
                        title="Voice input"
                    >
                        {isRecording ? '⏹' : '🎤'}
                    </button>
                    <input
                        type="text"
                        className="chat-input"
                        placeholder={PLACEHOLDERS[selectedLanguage]}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                    />
                    <button
                        className="send-btn"
                        onClick={() => sendMessage()}
                        disabled={isLoading || !inputValue.trim()}
                    >
                        ➤
                    </button>
                </div>
            </div>

            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-card">
                    <h3>⚙️ System Status</h3>
                    <div className="status-grid">
                        <div className="status-item">
                            <div className="status-label">Ollama</div>
                            <div className={`status-value ${systemStatus?.ollama?.available ? 'active' : 'inactive'}`}>
                                ● {systemStatus?.ollama?.available ? 'Connected' : 'Offline'}
                            </div>
                        </div>
                        <div className="status-item">
                            <div className="status-label">API Keys</div>
                            <div className="status-value active">● Not Required</div>
                        </div>
                        <div className="status-item">
                            <div className="status-label">Langfuse</div>
                            <div className={`status-value ${systemStatus?.observability?.langfuse ? 'active' : ''}`}>
                                ● {systemStatus?.observability?.langfuse ? 'Enabled' : 'Mock Mode'}
                            </div>
                        </div>
                        <div className="status-item">
                            <div className="status-label">Agents</div>
                            <div className="status-value active">● 5 Active</div>
                        </div>
                    </div>
                </div>

                <div className="sidebar-card">
                    <h3>💊 Quick Reference</h3>
                    <div className="inventory-list">
                        {['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Omeprazole'].map((med, idx) => (
                            <div key={idx} className="inventory-item"
                                onClick={() => sendMessage(`I need ${med}`)}
                                style={{ cursor: 'pointer' }}>
                                <div className="inventory-name">{med}</div>
                                <div className="inventory-quantity">In Stock</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sidebar-card" style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderColor: 'rgba(34, 197, 94, 0.3)'
                }}>
                    <h3>✨ Features</h3>
                    <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '1rem', margin: 0 }}>
                        <li>🗣️ Voice & Text Orders</li>
                        <li>📋 Prescription Verification</li>
                        <li>⚠️ Allergy Warnings</li>
                        <li>🔄 Proactive Refill Alerts</li>
                        <li>🔍 Full Observability</li>
                    </ul>
                </div>

                {/* Refill Alerts Panel */}
                {refillAlerts.length > 0 && (
                    <div className="sidebar-card">
                        <h3>🔔 Refill Alerts</h3>
                        <div className="alerts-list">
                            {refillAlerts.map((alert, idx) => (
                                <div key={idx} className={`alert-item ${alert.priority || 'medium'}`} onClick={() => handleRefill(alert)}>
                                    <div className="alert-title">{alert.medicine_name}</div>
                                    <div className="alert-body">
                                        Running low ({alert.days_left} days left)
                                    </div>
                                    <div className="alert-actions">
                                        <button className="alert-action-btn">Refill Now</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </aside>


            {pendingConfirmation && (
                <div className="confirmation-dialog">
                    <span>Confirm your order?</span>
                    <button className="confirm-btn" onClick={() => handleConfirmation(true)}>
                        ✓ Yes, Place Order
                    </button>
                    <button className="cancel-btn" onClick={() => handleConfirmation(false)}>
                        ✗ Cancel
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* CANCELLATION CONFIRMATION DIALOG - Two-step with translated buttons */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {cancelConfirmation && (
                <div className="confirmation-dialog" style={{ borderColor: 'var(--warning)' }}>
                    <span>⚠️ {selectedLanguage === 'HI' ? 'ऑर्डर रद्द करें?' : selectedLanguage === 'DE' ? 'Bestellung stornieren?' : 'Cancel your order?'}</span>
                    <button className="confirm-btn" style={{ background: 'var(--error)' }} onClick={() => handleCancelConfirmation(true)}>
                        {CANCEL_BUTTONS[selectedLanguage].yes}
                    </button>
                    <button className="cancel-btn" onClick={() => handleCancelConfirmation(false)}>
                        {CANCEL_BUTTONS[selectedLanguage].no}
                    </button>
                </div>
            )}
        </>
    )
}

export default Chat
