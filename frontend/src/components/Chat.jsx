import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../LanguageContext'

const API = import.meta.env.VITE_API_URL ?? ''

// ═══════════════════════════════════════════════════════════════════════════
// CHAT COMPONENT - Uses global language context for translations
// Chat messages persist in localStorage per customer
// ═══════════════════════════════════════════════════════════════════════════

// Helper functions for localStorage persistence
const getChatStorageKey = (customerId) => `pharmacy_chat_${customerId}`
const getSessionStorageKey = (customerId) => `pharmacy_session_${customerId}`

function Chat({ customerId, onCartUpdate }) {
    const { language, setLanguage, t, langCode, LANGUAGES } = useLanguage()

    // Initialize messages from localStorage or with welcome message
    const [messages, setMessages] = useState(() => {
        try {
            const stored = localStorage.getItem(getChatStorageKey(customerId))
            if (stored) {
                const parsed = JSON.parse(stored)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed
                }
            }
        } catch (e) {
            console.warn('Failed to load chat history from localStorage:', e)
        }
        // Default welcome message
        return [{
            role: 'assistant',
            content: 'Welcome to Agentic Pharmacy! 💊 How can I help you today?',
            timestamp: new Date().toISOString()
        }]
    })
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    // Initialize sessionId from localStorage
    const [sessionId, setSessionId] = useState(() => {
        try {
            return localStorage.getItem(getSessionStorageKey(customerId)) || null
        } catch (e) {
            return null
        }
    })
    const [pendingConfirmation, setPendingConfirmation] = useState(null)
    const [isRecording, setIsRecording] = useState(false)
    const [systemStatus, setSystemStatus] = useState(null)
    const [refillAlerts, setRefillAlerts] = useState([])
    const [cancelConfirmation, setCancelConfirmation] = useState(null)
    const [prescriptionConfirmation, setPrescriptionConfirmation] = useState(null)
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

    // Persist messages to localStorage whenever they change
    useEffect(() => {
        if (customerId && messages.length > 0) {
            try {
                localStorage.setItem(getChatStorageKey(customerId), JSON.stringify(messages))
            } catch (e) {
                console.warn('Failed to save chat history to localStorage:', e)
            }
        }
    }, [messages, customerId])

    // Persist sessionId to localStorage whenever it changes
    useEffect(() => {
        if (customerId && sessionId) {
            try {
                localStorage.setItem(getSessionStorageKey(customerId), sessionId)
            } catch (e) {
                console.warn('Failed to save session ID to localStorage:', e)
            }
        }
    }, [sessionId, customerId])

    useEffect(() => {
        fetchSystemStatus()
        initVoiceRecognition()
        fetchRefillAlerts()
    }, [])

    // Update welcome message when language changes
    useEffect(() => {
        setMessages(prev => {
            // Update only the first message (welcome message) if it exists
            if (prev.length === 0) return prev
            return [
                {
                    ...prev[0],
                    content: t('chat.welcome')
                },
                ...prev.slice(1)
            ]
        })
    }, [language])

    // Fetch refill alerts when customer changes
    useEffect(() => {
        fetchRefillAlerts()
    }, [customerId])

    const fetchRefillAlerts = async () => {
        try {
            const response = await fetch(`${API}/api/v1/alerts/${customerId}`)
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
            const response = await fetch(`${API}/api/v1/admin/status`)
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
        if (langKey === language) return
        setLanguage(langKey)

        // Add confirmation message to chat (use translation after state update)
        const confirmations = {
            EN: t('chat.languageChanged'),
            HI: 'भाषा हिंदी में बदल दी गई है।',
            DE: 'Sprache auf Deutsch umgestellt.'
        }
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: `🌐 ${confirmations[langKey] || t('chat.languageChanged')}`,
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

        // Clear/refresh the cart after cancellation confirmation
        if (confirmed && onCartUpdate) {
            onCartUpdate()
        }
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
            const response = await fetch(`${API}/api/v1/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    customer_id: customerId,
                    session_id: sessionId,
                    is_voice: isRecording,
                    language: langCode
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

            // Check for prescription confirmation
            if (data.data?.status === 'prescription_analyzed') {
                setPrescriptionConfirmation({ sessionId: data.session_id })
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
            const response = await fetch(`${API}/api/v1/chat/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: pendingConfirmation.sessionId,
                    confirmed,
                    customer_id: customerId
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

    const handlePrescriptionConfirmation = async (confirmed) => {
        if (!prescriptionConfirmation) return
        setIsLoading(true)

        try {
            const response = await fetch(`${API}/api/v1/chat/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: prescriptionConfirmation.sessionId,
                    confirmed,
                    customer_id: customerId
                })
            })

            const data = await response.json()
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response,
                timestamp: new Date().toISOString()
            }])
        } catch (error) {
            console.error('Prescription confirmation error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Failed to process prescription confirmation. Please try again.',
                timestamp: new Date().toISOString()
            }])
        } finally {
            setIsLoading(false)
            setPrescriptionConfirmation(null)
            // Refresh cart after prescription confirmation
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

            const userMessage = {
                role: 'user',
                content: t('chat.uploadedPrescription'),
                timestamp: new Date().toISOString(),
                image: base64String
            }
            setMessages(prev => [...prev, userMessage])
            setIsLoading(true)

            try {
                const response = await fetch(`${API}/api/v1/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: "", // Empty message for direct upload
                        customer_id: customerId,
                        session_id: sessionId,
                        image_data: base64String,
                        language: langCode
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
                // Check for prescription confirmation
                if (data.data?.status === 'prescription_analyzed') {
                    setPrescriptionConfirmation({ sessionId: data.session_id })
                }
                // Check for cancel confirmation
                if (data.data?.status === 'awaiting_cancel_confirmation') {
                    // handled by orchestrator response flow usually, but good to be safe if custom UI needed
                }

            } catch (error) {
                console.error('Upload failed:', error)
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: t('chat.uploadError'),
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
    const quickActions = t('chat.quickActions') || []

    // Customer ID now comes from auth context via props - no selector needed

    return (
        <>
            <div className="chat-container">
                <div className="chat-header">
                    <h2 className="chat-title">{t('chat.title')}</h2>

                    {/* ═══════════════════════════════════════════════════════════════ */}
                    {/* LANGUAGE TABS - Always visible, instant switch */}
                    {/* ═══════════════════════════════════════════════════════════════ */}
                    <div className="language-selector">
                        {Object.entries(LANGUAGES).map(([key, lang]) => (
                            <button
                                key={key}
                                className={`lang-btn ${language === key ? 'active' : ''}`}
                                onClick={() => handleLanguageChange(key)}
                            >
                                {lang.native}
                            </button>
                        ))}
                    </div>

                    {/* Customer ID from auth - no manual selection */}
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
                        title={t('chat.voiceInput')}
                    >
                        {isRecording ? '⏹' : '🎤'}
                    </button>
                    <input
                        type="text"
                        className="chat-input"
                        placeholder={t('chat.placeholder')}
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
                    <h3>{t('sidebar.systemStatus')}</h3>
                    <div className="status-grid">
                        <div className="status-item">
                            <div className="status-label">{t('sidebar.ollama')}</div>
                            <div className={`status-value ${systemStatus?.ollama?.available ? 'active' : 'inactive'}`}>
                                ● {systemStatus?.ollama?.available ? t('sidebar.connected') : t('app.offline')}
                            </div>
                        </div>
                        <div className="status-item">
                            <div className="status-label">{t('sidebar.apiKeys')}</div>
                            <div className="status-value active">● {t('sidebar.notRequired')}</div>
                        </div>
                        <div className="status-item">
                            <div className="status-label">{t('sidebar.langfuse')}</div>
                            <div className={`status-value ${systemStatus?.observability?.langfuse ? 'active' : ''}`}>
                                ● {systemStatus?.observability?.langfuse ? t('sidebar.enabled') : t('sidebar.mockMode')}
                            </div>
                        </div>
                        <div className="status-item">
                            <div className="status-label">{t('sidebar.agents')}</div>
                            <div className="status-value active">● {t('sidebar.agentsActive')}</div>
                        </div>
                    </div>
                </div>

                <div className="sidebar-card">
                    <h3>{t('sidebar.quickReference')}</h3>
                    <div className="inventory-list">
                        {['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Omeprazole'].map((med, idx) => (
                            <div key={idx} className="inventory-item"
                                onClick={() => sendMessage(`I need ${med}`)}
                                style={{ cursor: 'pointer' }}>
                                <div className="inventory-name">{med}</div>
                                <div className="inventory-quantity">{t('sidebar.inStock')}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sidebar-card" style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderColor: 'rgba(34, 197, 94, 0.3)'
                }}>
                    <h3>{t('sidebar.features')}</h3>
                    <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '1rem', margin: 0 }}>
                        {(t('sidebar.featuresList') || []).map((feature, idx) => (
                            <li key={idx}>{feature}</li>
                        ))}
                    </ul>
                </div>

                {/* Refill Alerts Panel */}
                {refillAlerts.length > 0 && (
                    <div className="sidebar-card">
                        <h3>{t('sidebar.refillAlerts')}</h3>
                        <div className="alerts-list">
                            {refillAlerts.map((alert, idx) => (
                                <div key={idx} className={`alert-item ${alert.priority || 'medium'}`} onClick={() => handleRefill(alert)}>
                                    <div className="alert-title">{alert.medicine_name}</div>
                                    <div className="alert-body">
                                        {t('sidebar.runningLow')}{alert.days_left != null && ` (${alert.days_left} ${t('sidebar.daysLeft')})`}
                                    </div>
                                    <div className="alert-actions">
                                        <button className="alert-action-btn">{t('sidebar.refillNow')}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </aside>


            {pendingConfirmation && (
                <div className="confirmation-dialog">
                    <span>{t('chat.confirmOrder')}</span>
                    <button className="confirm-btn" onClick={() => handleConfirmation(true)}>
                        {t('chat.confirmYes')}
                    </button>
                    <button className="cancel-btn" onClick={() => handleConfirmation(false)}>
                        {t('chat.confirmCancel')}
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* PRESCRIPTION CONFIRMATION DIALOG - Floating bar for Rx medicines     */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {prescriptionConfirmation && (
                <div className="confirmation-dialog">
                    <span>📄 Confirm adding medicines?</span>
                    <button className="confirm-btn" onClick={() => handlePrescriptionConfirmation(true)}>
                        ✓ Yes, Add to Cart
                    </button>
                    <button className="cancel-btn" onClick={() => handlePrescriptionConfirmation(false)}>
                        ✕ Cancel
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* CANCELLATION CONFIRMATION DIALOG - Two-step with translated buttons */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {cancelConfirmation && (
                <div className="confirmation-dialog" style={{ borderColor: 'var(--warning)' }}>
                    <span>⚠️ {t('chat.cancelConfirm')}</span>
                    <button className="confirm-btn" style={{ background: 'var(--error)' }} onClick={() => handleCancelConfirmation(true)}>
                        {t('chat.cancelYes')}
                    </button>
                    <button className="cancel-btn" onClick={() => handleCancelConfirmation(false)}>
                        {t('chat.cancelNo')}
                    </button>
                </div>
            )}
        </>
    )
}

export default Chat
