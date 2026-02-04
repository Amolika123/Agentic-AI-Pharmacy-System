import { useState } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// SHOPPING CART COMPONENT - Cart panel with checkout flow
// ═══════════════════════════════════════════════════════════════════════════

function Cart({
    cartItems = [],
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    customerId,
    language = 'EN'
}) {
    const [checkingOut, setCheckingOut] = useState(false)
    const [checkoutMessage, setCheckoutMessage] = useState(null)

    const TEXTS = {
        EN: {
            title: 'Shopping Cart',
            empty: 'Your cart is empty',
            emptyDesc: 'Browse the catalog and add medicines to your cart',
            quantity: 'Qty',
            remove: 'Remove',
            subtotal: 'Subtotal',
            total: 'Total',
            checkout: 'Proceed to Checkout',
            processing: 'Processing...',
            prescriptionNote: '📋 Some items require prescription. Upload during checkout.',
            loginRequired: 'Please log in to checkout',
            items: 'items'
        },
        DE: {
            title: 'Warenkorb',
            empty: 'Ihr Warenkorb ist leer',
            emptyDesc: 'Durchsuchen Sie den Katalog und fügen Sie Medikamente hinzu',
            quantity: 'Menge',
            remove: 'Entfernen',
            subtotal: 'Zwischensumme',
            total: 'Gesamt',
            checkout: 'Zur Kasse gehen',
            processing: 'Wird bearbeitet...',
            prescriptionNote: '📋 Einige Artikel sind rezeptpflichtig.',
            loginRequired: 'Bitte melden Sie sich an',
            items: 'Artikel'
        },
        HI: {
            title: 'शॉपिंग कार्ट',
            empty: 'आपका कार्ट खाली है',
            emptyDesc: 'कैटलॉग देखें और दवाइयाँ जोड़ें',
            quantity: 'मात्रा',
            remove: 'हटाएं',
            subtotal: 'उप-योग',
            total: 'कुल',
            checkout: 'चेकआउट करें',
            processing: 'प्रोसेस हो रहा है...',
            prescriptionNote: '📋 कुछ दवाइयों के लिए प्रिस्क्रिप्शन ज़रूरी है',
            loginRequired: 'कृपया लॉगिन करें',
            items: 'आइटम'
        }
    }

    const t = TEXTS[language] || TEXTS.EN

    const calculateSubtotal = () => {
        return cartItems.reduce((sum, item) => {
            return sum + (item.unit_price * item.quantity)
        }, 0)
    }

    const hasPrescriptionItems = cartItems.some(item => item.prescription_required)

    const handleCheckout = async () => {
        if (!customerId) {
            setCheckoutMessage({ type: 'error', text: t.loginRequired })
            return
        }

        setCheckingOut(true)
        setCheckoutMessage(null)

        try {
            const result = await onCheckout()
            if (result.success) {
                setCheckoutMessage({ type: 'success', text: result.message })
            } else {
                setCheckoutMessage({ type: 'error', text: result.message })
            }
        } catch (error) {
            setCheckoutMessage({ type: 'error', text: 'Checkout failed. Please try again.' })
        } finally {
            setCheckingOut(false)
        }
    }

    if (cartItems.length === 0) {
        return (
            <div className="cart-container">
                <div className="cart-header">
                    <h2 className="cart-title">🛒 {t.title}</h2>
                </div>
                <div className="cart-empty">
                    <span className="empty-icon">🛒</span>
                    <h3>{t.empty}</h3>
                    <p>{t.emptyDesc}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="cart-container">
            <div className="cart-header">
                <h2 className="cart-title">🛒 {t.title}</h2>
                <span className="cart-count">{cartItems.length} {t.items}</span>
            </div>

            <div className="cart-items">
                {cartItems.map(item => (
                    <div key={item.medicine_id} className="cart-item">
                        <div className="cart-item-icon">
                            {item.dosage_form === 'Tablet' ? '💊' :
                                item.dosage_form === 'Capsule' ? '💎' :
                                    item.dosage_form === 'Syrup' ? '🧴' : '💊'}
                        </div>

                        <div className="cart-item-details">
                            <h4 className="cart-item-name">{item.name}</h4>
                            <p className="cart-item-price">₹{item.unit_price?.toFixed(2)} per {item.unit}</p>
                            {item.prescription_required && (
                                <span className="cart-rx-badge">📋 Rx</span>
                            )}
                        </div>

                        <div className="cart-item-controls">
                            <div className="quantity-control">
                                <button
                                    className="qty-btn"
                                    onClick={() => onUpdateQuantity(item.medicine_id, Math.max(1, item.quantity - 1))}
                                >
                                    −
                                </button>
                                <span className="qty-value">{item.quantity}</span>
                                <button
                                    className="qty-btn"
                                    onClick={() => onUpdateQuantity(item.medicine_id, item.quantity + 1)}
                                >
                                    +
                                </button>
                            </div>
                            <span className="cart-item-total">
                                ₹{(item.unit_price * item.quantity).toFixed(2)}
                            </span>
                            <button
                                className="remove-btn"
                                onClick={() => onRemoveItem(item.medicine_id)}
                                title={t.remove}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {hasPrescriptionItems && (
                <div className="cart-prescription-note">
                    {t.prescriptionNote}
                </div>
            )}

            <div className="cart-summary">
                <div className="summary-row">
                    <span>{t.subtotal}</span>
                    <span>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                    <span>{t.total}</span>
                    <span>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
            </div>

            {checkoutMessage && (
                <div className={`checkout-message ${checkoutMessage.type}`}>
                    {checkoutMessage.type === 'success' ? '✅' : '⚠️'} {checkoutMessage.text}
                </div>
            )}

            <button
                className={`checkout-btn ${checkingOut ? 'processing' : ''}`}
                onClick={handleCheckout}
                disabled={checkingOut}
            >
                {checkingOut ? t.processing : t.checkout}
            </button>
        </div>
    )
}

export default Cart
