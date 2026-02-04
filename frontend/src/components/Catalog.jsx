import { useState, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG/MARKETPLACE COMPONENT - Amazon-style product browsing
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORY_FILTERS = [
    { id: 'all', label: 'All', icon: '🏥' },
    { id: 'Pain Relief', label: 'Pain Relief', icon: '💊' },
    { id: 'Antibiotic', label: 'Antibiotics', icon: '🦠' },
    { id: 'Vitamins', label: 'Vitamins', icon: '🍊' },
    { id: 'Cardiac', label: 'Cardiac', icon: '❤️' },
    { id: 'Diabetes', label: 'Diabetes', icon: '🩸' },
    { id: 'Gastro', label: 'Gastro', icon: '🫃' },
    { id: 'Respiratory', label: 'Respiratory', icon: '🫁' }
]

function Catalog({ onAddToCart, cartItems = [], language = 'EN' }) {
    const [medicines, setMedicines] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [selectedMedicine, setSelectedMedicine] = useState(null)
    const [loading, setLoading] = useState(true)
    const [addingToCart, setAddingToCart] = useState(null)

    const TEXTS = {
        EN: {
            title: 'Medicine Catalog',
            search: 'Search medicines...',
            addToCart: 'Add to Cart',
            adding: 'Adding...',
            inCart: 'In Cart',
            inStock: 'In Stock',
            outOfStock: 'Out of Stock',
            prescription: 'Rx Required',
            details: 'View Details',
            close: 'Close',
            noResults: 'No medicines found'
        },
        DE: {
            title: 'Medikamentenkatalog',
            search: 'Medikamente suchen...',
            addToCart: 'In den Warenkorb',
            adding: 'Hinzufügen...',
            inCart: 'Im Warenkorb',
            inStock: 'Auf Lager',
            outOfStock: 'Nicht vorrätig',
            prescription: 'Rezeptpflichtig',
            details: 'Details anzeigen',
            close: 'Schließen',
            noResults: 'Keine Medikamente gefunden'
        },
        HI: {
            title: 'दवाई कैटलॉग',
            search: 'दवाइयाँ खोजें...',
            addToCart: 'कार्ट में डालें',
            adding: 'जोड़ रहे हैं...',
            inCart: 'कार्ट में है',
            inStock: 'स्टॉक में',
            outOfStock: 'स्टॉक में नहीं',
            prescription: 'प्रिस्क्रिप्शन ज़रूरी',
            details: 'विवरण देखें',
            close: 'बंद करें',
            noResults: 'कोई दवाई नहीं मिली'
        }
    }

    const t = TEXTS[language] || TEXTS.EN

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
        if (quantity <= 0) return { class: 'out-of-stock', text: t.outOfStock }
        if (quantity < 50) return { class: 'low-stock', text: `${quantity} left` }
        return { class: 'in-stock', text: t.inStock }
    }

    if (loading) {
        return (
            <div className="catalog-loading">
                <div className="loading-spinner"></div>
                <p>Loading catalog...</p>
            </div>
        )
    }

    return (
        <div className="catalog-container">
            {/* Header */}
            <div className="catalog-header">
                <h2 className="catalog-title">🛒 {t.title}</h2>
                <div className="catalog-search">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder={t.search}
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
                        <p>{t.noResults}</p>
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
                                        <span>📋 {t.prescription}</span>
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
                                            {isAdding ? t.adding : inCart ? t.inCart : t.addToCart}
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
                                {t.close}
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
                                {isInCart(selectedMedicine.medicine_id) ? t.inCart : t.addToCart}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Catalog
