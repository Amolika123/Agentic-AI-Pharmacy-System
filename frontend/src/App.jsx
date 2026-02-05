import { useState, useEffect } from 'react'
import { LanguageProvider, useLanguage } from './LanguageContext'
import Chat from './components/Chat'
import AdminDashboard from './components/AdminDashboard'
import Catalog from './components/Catalog'
import Cart from './components/Cart'

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP WITH SIDE NAVIGATION & GLOBAL LANGUAGE SUPPORT
// Patient Mode: Chat | Catalog | Cart (side tabs)
// Admin Mode: Separate dashboard
// All UI text managed via centralized translation system
// ═══════════════════════════════════════════════════════════════════════════

function AppContent() {
    const { language, setLanguage, t, langCode, LANGUAGES } = useLanguage()

    // Navigation state
    const [mode, setMode] = useState('patient') // 'patient' or 'admin'
    const [activeView, setActiveView] = useState('chat') // 'chat', 'catalog', 'cart'
    const [systemStatus, setSystemStatus] = useState(null)

    // Shared state
    const [customerId, setCustomerId] = useState('CUST001')
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
                    language: langCode
                })
            })

            const data = await response.json()

            if (data.success) {
                setCartItems([])
                return { success: true, message: data.message || t('cart.checkout') }
            } else {
                return { success: false, message: data.error || t('cart.checkoutFailed') }
            }
        } catch (error) {
            return { success: false, message: t('cart.checkoutFailed') }
        }
    }

    const customerOptions = [
        { id: 'CUST001', name: 'Rajesh Kumar' },
        { id: 'CUST003', name: 'Hans Mueller' },
        { id: 'CUST005', name: 'Mohammed Ali' },
        { id: 'CUST007', name: 'Ramesh Iyer' }
    ]

    // Side navigation items for patient mode - translated labels
    const sideNavItems = [
        { id: 'chat', icon: '💬', label: t('nav.chat') },
        { id: 'catalog', icon: '🛒', label: t('nav.catalog') },
        { id: 'cart', icon: '🛍️', label: t('nav.cart'), badge: cartItems.length > 0 ? cartItems.length : null }
    ]

    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="logo">
                    <div className="logo-icon">🤖</div>
                    <span className="logo-text">{t('app.title')}</span>
                </div>

                {/* Mode Toggle */}
                <nav className="nav-tabs mode-toggle">
                    <button
                        className={`nav-tab ${mode === 'patient' ? 'active' : ''}`}
                        onClick={() => { setMode('patient'); setActiveView('chat') }}
                    >
                        {t('app.patient')}
                    </button>
                    <button
                        className={`nav-tab ${mode === 'admin' ? 'active' : ''}`}
                        onClick={() => setMode('admin')}
                    >
                        {t('app.admin')}
                    </button>
                </nav>

                {/* Language & Customer Selector */}
                <div className="header-controls">
                    <div className="language-toggle">
                        {Object.entries(LANGUAGES).map(([key, lang]) => (
                            <button
                                key={key}
                                className={`lang-mini-btn ${language === key ? 'active' : ''}`}
                                onClick={() => setLanguage(key)}
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
                        <span>{systemStatus?.ollama?.available ? t('app.online') : t('app.offline')}</span>
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
                            {/* Use CSS display to retain state instead of conditional rendering */}
                            <div style={{ display: activeView === 'chat' ? 'flex' : 'none', flex: 1, flexDirection: 'column' }}>
                                <Chat
                                    customerId={customerId}
                                    onCartUpdate={loadCart}
                                />
                            </div>
                            <div style={{ display: activeView === 'catalog' ? 'flex' : 'none', flex: 1, flexDirection: 'column' }}>
                                <Catalog
                                    onAddToCart={handleAddToCart}
                                    cartItems={cartItems}
                                />
                            </div>
                            <div style={{ display: activeView === 'cart' ? 'flex' : 'none', flex: 1, flexDirection: 'column' }}>
                                <Cart
                                    cartItems={cartItems}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onRemoveItem={handleRemoveItem}
                                    onCheckout={handleCheckout}
                                    customerId={customerId}
                                />
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}

// Wrap the app with LanguageProvider for global language state
function App() {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    )
}

export default App
