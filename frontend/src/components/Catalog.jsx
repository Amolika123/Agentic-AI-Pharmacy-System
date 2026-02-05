import { useState, useEffect } from 'react'
import { useLanguage } from '../LanguageContext'

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG/MARKETPLACE COMPONENT - Amazon-style product browsing
// Uses global language context for translations
// ═══════════════════════════════════════════════════════════════════════════

function Catalog({ onAddToCart, cartItems = [] }) {
    const { t, language } = useLanguage()

    const [medicines, setMedicines] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [selectedMedicine, setSelectedMedicine] = useState(null)
    const [loading, setLoading] = useState(true)
    const [addingToCart, setAddingToCart] = useState(null)

    // Dynamic category filters with translated labels
    const CATEGORY_FILTERS = [
        { id: 'all', label: t('categories.all'), icon: '🏥' },
        { id: 'Pain Relief', label: t('categories.painRelief'), icon: '💊' },
        { id: 'Antibiotic', label: t('categories.antibiotics'), icon: '🦠' },
        { id: 'Vitamins', label: t('categories.vitamins'), icon: '🍊' },
        { id: 'Cardiac', label: t('categories.cardiac'), icon: '❤️' },
        { id: 'Diabetes', label: t('categories.diabetes'), icon: '🩸' },
        { id: 'Gastro', label: t('categories.gastro'), icon: '🫃' },
        { id: 'Respiratory', label: t('categories.respiratory'), icon: '🫁' }
    ]

    useEffect(() => {
        fetchMedicines()
    }, [])

    const fetchMedicines = async () => {
        try {
            const response = await fetch('/api/v1/inventory')
            const data = await response.json()
            if (data.medicines) {
                setMedicines(data.medicines)
            }
        } catch (error) {
            console.error('Failed to fetch medicines:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredMedicines = medicines.filter(med => {
        const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (med.generic_name && med.generic_name.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesCategory = selectedCategory === 'all' || med.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const isInCart = (medicineId) => {
        return cartItems.some(item => item.medicine_id === medicineId)
    }

    const handleAddToCart = async (medicine) => {
        setAddingToCart(medicine.medicine_id)
        try {
            await onAddToCart(medicine)
        } finally {
            setAddingToCart(null)
        }
    }

    const getStockStatus = (quantity) => {
        if (quantity <= 0) return { class: 'out-of-stock', text: t('catalog.outOfStock') }
        if (quantity < 50) return { class: 'low-stock', text: `${quantity} ${t('catalog.left')}` }
        return { class: 'in-stock', text: t('catalog.inStock') }
    }

    if (loading) {
        return (
            <div className="catalog-loading">
                <div className="loading-spinner"></div>
                <p>{t('catalog.loading')}</p>
            </div>
        )
    }

    return (
        <div className="catalog-container">
            {/* Header */}
            <div className="catalog-header">
                <h2 className="catalog-title">🛒 {t('catalog.title')}</h2>
                <div className="catalog-search">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder={t('catalog.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="catalog-search-input"
                    />
                </div>
            </div>

            {/* Category Filters */}
            <div className="category-filters">
                {CATEGORY_FILTERS.map(cat => (
                    <button
                        key={cat.id}
                        className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                    >
                        <span className="category-icon">{cat.icon}</span>
                        <span className="category-label">{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="product-grid">
                {filteredMedicines.length === 0 ? (
                    <div className="no-results">
                        <span className="no-results-icon">🔍</span>
                        <p>{t('catalog.noResults')}</p>
                    </div>
                ) : (
                    filteredMedicines.map(medicine => {
                        const stockStatus = getStockStatus(medicine.stock_quantity)
                        const inCart = isInCart(medicine.medicine_id)
                        const isAdding = addingToCart === medicine.medicine_id

                        return (
                            <div
                                key={medicine.medicine_id}
                                className="product-card"
                                onClick={() => setSelectedMedicine(medicine)}
                            >
                                {/* Prescription Badge */}
                                {medicine.prescription_required && (
                                    <div className="prescription-badge">
                                        <span>📋 {t('catalog.prescription')}</span>
                                    </div>
                                )}

                                {/* Medicine Icon/Image */}
                                <div className="product-image">
                                    <span className="medicine-icon">
                                        {medicine.dosage_form === 'Tablet' ? '💊' :
                                            medicine.dosage_form === 'Capsule' ? '💎' :
                                                medicine.dosage_form === 'Syrup' ? '🧴' :
                                                    medicine.dosage_form === 'Inhaler' ? '🫁' :
                                                        medicine.dosage_form === 'Injection' ? '💉' :
                                                            medicine.dosage_form === 'Gel' ? '🧴' : '💊'}
                                    </span>
                                </div>

                                {/* Product Info */}
                                <div className="product-info">
                                    <h3 className="product-name">{medicine.name}</h3>
                                    <p className="product-generic">{medicine.generic_name}</p>
                                    <p className="product-manufacturer">{medicine.manufacturer}</p>

                                    <div className="product-meta">
                                        <span className={`stock-status ${stockStatus.class}`}>
                                            {stockStatus.text}
                                        </span>
                                        <span className="product-category">{medicine.category}</span>
                                    </div>

                                    <div className="product-footer">
                                        <span className="product-price">
                                            ₹{medicine.unit_price?.toFixed(2) || '0.00'}
                                            <span className="price-unit">/{medicine.unit}</span>
                                        </span>

                                        <button
                                            className={`add-to-cart-btn ${inCart ? 'in-cart' : ''} ${isAdding ? 'adding' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (!inCart && !isAdding) handleAddToCart(medicine)
                                            }}
                                            disabled={inCart || isAdding || medicine.stock_quantity <= 0}
                                        >
                                            {isAdding ? t('catalog.adding') : inCart ? t('catalog.inCart') : t('catalog.addToCart')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Medicine Detail Modal */}
            {selectedMedicine && (
                <div className="medicine-modal-overlay" onClick={() => setSelectedMedicine(null)}>
                    <div className="medicine-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedMedicine(null)}>×</button>

                        <div className="modal-header">
                            <span className="modal-icon">
                                {selectedMedicine.dosage_form === 'Tablet' ? '💊' :
                                    selectedMedicine.dosage_form === 'Capsule' ? '💎' :
                                        selectedMedicine.dosage_form === 'Syrup' ? '🧴' : '💊'}
                            </span>
                            <div>
                                <h2>{selectedMedicine.name}</h2>
                                <p className="modal-generic">{selectedMedicine.generic_name}</p>
                            </div>
                        </div>

                        <div className="modal-body">
                            <div className="modal-detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Manufacturer</span>
                                    <span className="detail-value">{selectedMedicine.manufacturer}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Category</span>
                                    <span className="detail-value">{selectedMedicine.category}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Dosage Form</span>
                                    <span className="detail-value">{selectedMedicine.dosage_form}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Strength</span>
                                    <span className="detail-value">{selectedMedicine.strength}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Stock</span>
                                    <span className="detail-value">{selectedMedicine.stock_quantity} {selectedMedicine.unit}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Price</span>
                                    <span className="detail-value price">₹{selectedMedicine.unit_price?.toFixed(2)}/{selectedMedicine.unit}</span>
                                </div>
                            </div>

                            {selectedMedicine.prescription_required && (
                                <div className="prescription-warning">
                                    <span>⚠️</span>
                                    <p>This medicine requires a valid prescription. You'll need to upload one during checkout.</p>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="modal-close-btn" onClick={() => setSelectedMedicine(null)}>
                                {t('catalog.close')}
                            </button>
                            <button
                                className={`modal-add-btn ${isInCart(selectedMedicine.medicine_id) ? 'in-cart' : ''}`}
                                onClick={() => {
                                    if (!isInCart(selectedMedicine.medicine_id)) {
                                        handleAddToCart(selectedMedicine)
                                        setSelectedMedicine(null)
                                    }
                                }}
                                disabled={isInCart(selectedMedicine.medicine_id) || selectedMedicine.stock_quantity <= 0}
                            >
                                {isInCart(selectedMedicine.medicine_id) ? t('catalog.inCart') : t('catalog.addToCart')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Catalog
