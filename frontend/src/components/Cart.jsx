import { useState, useEffect } from 'react'
import { useLanguage } from '../LanguageContext'
import { useAuth } from '../AuthContext'

// ═══════════════════════════════════════════════════════════════════════════
// SHOPPING CART COMPONENT - Cart panel with Razorpay payment checkout
// Uses global language context for translations
// ═══════════════════════════════════════════════════════════════════════════

// Dynamically load the Razorpay checkout script from CDN
function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (document.getElementById('razorpay-checkout-script')) {
            resolve(true)
            return
        }
        const script = document.createElement('script')
        script.id = 'razorpay-checkout-script'
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}

function Cart({
    cartItems = [],
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    customerId
}) {
    const { t } = useLanguage()
    const { user } = useAuth()
    const [checkingOut, setCheckingOut] = useState(false)
    const [checkoutMessage, setCheckoutMessage] = useState(null)

    const calculateSubtotal = () => {
        return cartItems.reduce((sum, item) => {
            return sum + (item.unit_price * item.quantity)
        }, 0)
    }

    const hasPrescriptionItems = cartItems.some(item => item.prescription_required)

    // ── Razorpay Pay Now handler ──────────────────────────────────────
    const handlePayNow = async () => {
        if (!customerId) {
            setCheckoutMessage({ type: 'error', text: t('cart.loginRequired') })
            return
        }

        setCheckingOut(true)
        setCheckoutMessage(null)

        try {
            // 1. Load Razorpay script
            const loaded = await loadRazorpayScript()
            if (!loaded) {
                setCheckoutMessage({ type: 'error', text: 'Failed to load payment gateway. Please check your connection.' })
                setCheckingOut(false)
                return
            }

            const totalAmount = calculateSubtotal()

            // 2. Create Razorpay order via backend
            const createRes = await fetch('/api/v1/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: totalAmount,
                    order_id: `ORD${Date.now()}`
                })
            })
            const orderData = await createRes.json()

            if (!createRes.ok || !orderData.success) {
                setCheckoutMessage({ type: 'error', text: orderData.detail || 'Failed to create payment order.' })
                setCheckingOut(false)
                return
            }

            // 3. Open Razorpay payment modal
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'PharmAgent',
                description: `Payment for ${cartItems.length} item(s)`,
                order_id: orderData.razorpay_order_id,
                prefill: {
                    name: user?.name || user?.email || '',
                    email: user?.email || ''
                },
                theme: {
                    color: '#6c63ff'
                },
                handler: async function (response) {
                    // 4. Verify payment on backend
                    try {
                        const verifyRes = await fetch('/api/v1/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                customer_id: customerId,
                                items: cartItems.map(item => ({
                                    medicine_id: item.medicine_id,
                                    name: item.name,
                                    quantity: item.quantity,
                                    unit_price: item.unit_price
                                }))
                            })
                        })
                        const verifyData = await verifyRes.json()

                        if (verifyRes.ok && verifyData.success) {
                            // Payment verified — clear cart & show success
                            if (onCheckout) {
                                // Call existing checkout to clear state
                                await onCheckout()
                            }
                            setCheckoutMessage({
                                type: 'success',
                                text: verifyData.message || `✅ Payment successful! Order placed.`
                            })
                        } else {
                            setCheckoutMessage({
                                type: 'error',
                                text: verifyData.detail || 'Payment verification failed.'
                            })
                        }
                    } catch (err) {
                        setCheckoutMessage({ type: 'error', text: 'Verification failed. Contact support.' })
                    }
                    setCheckingOut(false)
                },
                modal: {
                    ondismiss: function () {
                        setCheckingOut(false)
                        setCheckoutMessage({ type: 'error', text: 'Payment cancelled.' })
                    }
                }
            }

            const rzp = new window.Razorpay(options)
            rzp.on('payment.failed', function (response) {
                setCheckingOut(false)
                setCheckoutMessage({
                    type: 'error',
                    text: response.error?.description || 'Payment failed. Please try again.'
                })
            })
            rzp.open()

        } catch (error) {
            setCheckoutMessage({ type: 'error', text: t('cart.checkoutFailed') })
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
                id="pay-now-btn"
                className={`checkout-btn ${checkingOut ? 'processing' : ''}`}
                onClick={handlePayNow}
                disabled={checkingOut}
            >
                {checkingOut ? '⏳ Processing...' : '💳 Pay Now'}
            </button>

            <p style={{
                textAlign: 'center',
                fontSize: '0.7rem',
                color: 'var(--text-muted, #888)',
                marginTop: '0.5rem',
                opacity: 0.7
            }}>
                🔒 Secured by Razorpay · Test Mode
            </p>
        </div>
    )
}

export default Cart
