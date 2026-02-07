import { useState, useEffect } from 'react'
import { LanguageProvider, useLanguage } from './LanguageContext'
import { AuthProvider, useAuth } from './AuthContext'
import Chat from './components/Chat'
import AdminDashboard from './components/AdminDashboard'
import Catalog from './components/Catalog'
import Cart from './components/Cart'
import LoginPage from './components/LoginPage'

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP WITH ROLE-BASED ACCESS CONTROL
// Patient Mode: Chat | Catalog | Cart (side tabs)
// Admin Mode: Separate dashboard
// Authentication required for all views
// ═══════════════════════════════════════════════════════════════════════════

function AppContent() {
    const { language, setLanguage, t, langCode, LANGUAGES } = useLanguage()
    const { isAuthenticated, isAdmin, isPatient, user, logout, customerId } = useAuth()

    // Navigation state
    const [activeView, setActiveView] = useState('chat') // 'chat', 'catalog', 'cart'
    const [systemStatus, setSystemStatus] = useState(null)

    // Cart state
    const [cartItems, setCartItems] = useState([])
    const [cartNotification, setCartNotification] = useState(false)

    // Use customer ID from auth, or fall back to first option for demo
    const effectiveCustomerId = customerId || 'CUST001'

    useEffect(() => {
        if (isAuthenticated) {
            fetchSystemStatus()
            loadCart()
        }
    }, [isAuthenticated, effectiveCustomerId])

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
            const response = await fetch(`/api/v1/cart/${effectiveCustomerId}`)
            const data = await response.json()
            if (data.items) {
                setCartItems(data.items)
            }
        } catch (error) {
            console.log('Cart API not available, using local state')
        }
    }

    const handleAddToCart = async (medicine) => {
        const existing = cartItems.find(item => item.medicine_id === medicine.medicine_id)
        if (existing) return

        const newItem = { ...medicine, quantity: 1 }
        setCartItems(prev => [...prev, newItem])
        setCartNotification(true)
        setTimeout(() => setCartNotification(false), 2000)

        try {
            await fetch('/api/v1/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: effectiveCustomerId,
                    medicine_id: medicine.medicine_id,
                    quantity: 1
                })
            })
        } catch (error) {
            console.log('Cart sync pending')
        }
    }

    const handleUpdateQuantity = (medicineId, newQuantity) => {
        setCartItems(prev => prev.map(item =>
            item.medicine_id === medicineId ? { ...item, quantity: newQuantity } : item
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
                    customer_id: effectiveCustomerId,
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

    // Show login page if not authenticated
    if (!isAuthenticated) {
        return <LoginPage />
    }

    // Side navigation items for patient mode
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

                {/* User Info Badge */}
                <div className="user-badge">
                    <span className="user-role-icon">{isAdmin ? '🔐' : '👤'}</span>
                    <span className="user-info">
                        <span className="user-name">{user?.name || user?.email}</span>
                        <span className="user-role">{isAdmin ? 'Administrator' : 'Patient'}</span>
                    </span>
                </div>

                {/* Header Controls */}
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

                    <div className="status-indicator">
                        <span className={`status-dot ${systemStatus?.ollama?.available ? 'active' : ''}`}></span>
                        <span>{systemStatus?.ollama?.available ? t('app.online') : t('app.offline')}</span>
                    </div>

                    <button className="logout-btn" onClick={logout}>
                        <span className="logout-icon">🚪</span>
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <div className="app-layout">
                {/* Side Navigation (Patient Mode Only) */}
                {isPatient && (
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
                <main className={`main-content ${isAdmin ? 'full-width' : ''}`}>
                    {isAdmin ? (
                        <AdminDashboard systemStatus={systemStatus} />
                    ) : (
                        <>
                            <div style={{ display: activeView === 'chat' ? 'flex' : 'none', flex: 1, flexDirection: 'row', gap: '1.5rem' }}>
                                <Chat customerId={effectiveCustomerId} onCartUpdate={loadCart} />
                            </div>
                            <div style={{ display: activeView === 'catalog' ? 'flex' : 'none', flex: 1, flexDirection: 'column' }}>
                                <Catalog onAddToCart={handleAddToCart} cartItems={cartItems} />
                            </div>
                            <div style={{ display: activeView === 'cart' ? 'flex' : 'none', flex: 1, flexDirection: 'column' }}>
                                <Cart
                                    cartItems={cartItems}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onRemoveItem={handleRemoveItem}
                                    onCheckout={handleCheckout}
                                    customerId={effectiveCustomerId}
                                />
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}

// Wrap the app with providers
function App() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </LanguageProvider>
    )
}

export default App
