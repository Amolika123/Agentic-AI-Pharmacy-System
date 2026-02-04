import { useState, useEffect } from 'react'
import Chat from './components/Chat'
import AdminDashboard from './components/AdminDashboard'
import Catalog from './components/Catalog'
import Cart from './components/Cart'

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP WITH SIDE NAVIGATION
// Patient Mode: Chat | Catalog | Cart (side tabs)
// Admin Mode: Separate dashboard
// ═══════════════════════════════════════════════════════════════════════════

const LANGUAGES = {
    EN: { code: 'en', label: 'English', native: 'EN' },
    DE: { code: 'de', label: 'German', native: 'DE' },
    HI: { code: 'hi', label: 'Hindi', native: 'HI' }
}

function App() {
    // Navigation state
    const [mode, setMode] = useState('patient') // 'patient' or 'admin'
    const [activeView, setActiveView] = useState('chat') // 'chat', 'catalog', 'cart'
    const [systemStatus, setSystemStatus] = useState(null)

    // Shared state
    const [customerId, setCustomerId] = useState('CUST001')
    const [selectedLanguage, setSelectedLanguage] = useState('EN')
    const [cartItems, setCartItems] = useState([])
    const [cartNotification, setCartNotification] = useState(false)

    useEffect(() => {
        fetchSystemStatus()
        loadCart()
    }, [customerId])

    const fetchSystemStatus = async () => {
        try {
            const response = await fetch('/api/v1/admin/status')
            const data = await response.json()
            setSystemStatus(data)
        } catch (error) {
            console.error('Failed to fetch system status:', error)
        }
    }

    const loadCart = async () => {
        try {
            const response = await fetch(`/api/v1/cart/${customerId}`)
            const data = await response.json()
            if (data.items) {
                setCartItems(data.items)
            }
        } catch (error) {
            // Cart API might not exist yet, use local state
            console.log('Cart API not available, using local state')
        }
    }

    const handleAddToCart = async (medicine) => {
        // Check if already in cart
        const existing = cartItems.find(item => item.medicine_id === medicine.medicine_id)
        if (existing) {
            return
        }

        const newItem = {
            ...medicine,
            quantity: 1
        }

        // Optimistic update
        setCartItems(prev => [...prev, newItem])
        setCartNotification(true)
        setTimeout(() => setCartNotification(false), 2000)

        // Try to sync with backend
        try {
            await fetch('/api/v1/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    medicine_id: medicine.medicine_id,
                    quantity: 1
                })
            })
        } catch (error) {
            console.log('Cart sync pending - backend API not yet available')
        }
    }

    const handleUpdateQuantity = (medicineId, newQuantity) => {
        setCartItems(prev => prev.map(item =>
            item.medicine_id === medicineId
                ? { ...item, quantity: newQuantity }
                : item
        ))
    }

    const handleRemoveItem = (medicineId) => {
        setCartItems(prev => prev.filter(item => item.medicine_id !== medicineId))
    }

    const handleCheckout = async () => {
        try {
            const response = await fetch('/api/v1/cart/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    items: cartItems,
                    language: LANGUAGES[selectedLanguage].code
                })
            })

            const data = await response.json()

            if (data.success) {
                setCartItems([])
                return { success: true, message: data.message || 'Order placed successfully!' }
            } else {
                return { success: false, message: data.error || 'Checkout failed' }
            }
        } catch (error) {
            return { success: false, message: 'Unable to process checkout. Please try again.' }
        }
    }

    const customerOptions = [
        { id: 'CUST001', name: 'Rajesh Kumar' },
        { id: 'CUST003', name: 'Hans Mueller' },
        { id: 'CUST005', name: 'Mohammed Ali' },
        { id: 'CUST007', name: 'Ramesh Iyer' }
    ]

    // Side navigation items for patient mode
    const sideNavItems = [
        { id: 'chat', icon: '💬', label: 'Chat' },
        { id: 'catalog', icon: '🛒', label: 'Catalog' },
        { id: 'cart', icon: '🛍️', label: 'Cart', badge: cartItems.length > 0 ? cartItems.length : null }
    ]

    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="logo">
                    <div className="logo-icon">🤖</div>
                    <span className="logo-text">Agentic Pharmacy</span>
                </div>

                {/* Mode Toggle */}
                <nav className="nav-tabs mode-toggle">
                    <button
                        className={`nav-tab ${mode === 'patient' ? 'active' : ''}`}
                        onClick={() => { setMode('patient'); setActiveView('chat') }}
                    >
                        🏥 Patient
                    </button>
                    <button
                        className={`nav-tab ${mode === 'admin' ? 'active' : ''}`}
                        onClick={() => setMode('admin')}
                    >
                        📊 Admin
                    </button>
                </nav>

                {/* Language & Customer Selector */}
                <div className="header-controls">
                    <div className="language-toggle">
                        {Object.entries(LANGUAGES).map(([key, lang]) => (
                            <button
                                key={key}
                                className={`lang-mini-btn ${selectedLanguage === key ? 'active' : ''}`}
                                onClick={() => setSelectedLanguage(key)}
                            >
                                {lang.native}
                            </button>
                        ))}
                    </div>

                    {mode === 'patient' && (
                        <select
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            className="customer-select"
                        >
                            {customerOptions.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}

                    <div className="status-indicator">
                        <span className={`status-dot ${systemStatus?.ollama?.available ? 'active' : ''}`}></span>
                        <span>{systemStatus?.ollama?.available ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
            </header>

            {/* Main Layout */}
            <div className="app-layout">
                {/* Side Navigation (Patient Mode Only) */}
                {mode === 'patient' && (
                    <nav className="side-nav">
                        {sideNavItems.map(item => (
                            <button
                                key={item.id}
                                className={`side-nav-item ${activeView === item.id ? 'active' : ''} ${item.id === 'cart' && cartNotification ? 'notification' : ''}`}
                                onClick={() => setActiveView(item.id)}
                            >
                                <span className="side-nav-icon">{item.icon}</span>
                                <span className="side-nav-label">{item.label}</span>
                                {item.badge && (
                                    <span className="side-nav-badge">{item.badge}</span>
                                )}
                            </button>
                        ))}
                    </nav>
                )}

                {/* Main Content */}
                <main className={`main-content ${mode === 'admin' ? 'full-width' : ''}`}>
                    {mode === 'admin' ? (
                        <AdminDashboard systemStatus={systemStatus} />
                    ) : (
                        <>
                            {activeView === 'chat' && (
                                <Chat
                                    customerId={customerId}
                                    language={selectedLanguage}
                                />
                            )}
                            {activeView === 'catalog' && (
                                <Catalog
                                    onAddToCart={handleAddToCart}
                                    cartItems={cartItems}
                                    language={selectedLanguage}
                                />
                            )}
                            {activeView === 'cart' && (
                                <Cart
                                    cartItems={cartItems}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onRemoveItem={handleRemoveItem}
                                    onCheckout={handleCheckout}
                                    customerId={customerId}
                                    language={selectedLanguage}
                                />
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}

export default App
