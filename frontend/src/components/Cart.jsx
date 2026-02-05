import { useState } from 'react'
import { useLanguage } from '../LanguageContext'

// ═══════════════════════════════════════════════════════════════════════════
// SHOPPING CART COMPONENT - Cart panel with checkout flow
// Uses global language context for translations
// ═══════════════════════════════════════════════════════════════════════════

function Cart({
    cartItems = [],
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    customerId
}) {
    const { t } = useLanguage()
    const [checkingOut, setCheckingOut] = useState(false)
    const [checkoutMessage, setCheckoutMessage] = useState(null)

    const calculateSubtotal = () => {
        return cartItems.reduce((sum, item) => {
            return sum + (item.unit_price * item.quantity)
        }, 0)
    }

    const hasPrescriptionItems = cartItems.some(item => item.prescription_required)

    const handleCheckout = async () => {
        if (!customerId) {
            setCheckoutMessage({ type: 'error', text: t('cart.loginRequired') })
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
            setCheckoutMessage({ type: 'error', text: t('cart.checkoutFailed') })
        } finally {
            setCheckingOut(false)
        }
    }

    if (cartItems.length === 0) {
        return (
            <div className="cart-container">
                <div className="cart-header">
                    <h2 className="cart-title">🛒 {t('cart.title')}</h2>
                </div>
                <div className="cart-empty">
                    <span className="empty-icon">🛒</span>
                    <h3>{t('cart.empty')}</h3>
                    <p>{t('cart.emptyDesc')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="cart-container">
            <div className="cart-header">
                <h2 className="cart-title">🛒 {t('cart.title')}</h2>
                <span className="cart-count">{cartItems.length} {t('cart.items')}</span>
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
                                title={t('cart.remove')}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {hasPrescriptionItems && (
                <div className="cart-prescription-note">
                    {t('cart.prescriptionNote')}
                </div>
            )}

            <div className="cart-summary">
                <div className="summary-row">
                    <span>{t('cart.subtotal')}</span>
                    <span>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                    <span>{t('cart.total')}</span>
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
                {checkingOut ? t('cart.processing') : t('cart.checkout')}
            </button>
        </div>
    )
}

export default Cart
