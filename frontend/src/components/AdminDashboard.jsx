import { useState, useEffect } from 'react'
import { useLanguage } from '../LanguageContext'

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD - ChatGPT-Style Single-Context Layout
// Features: Side tab rail, one view at a time, clean focused UI
// ═══════════════════════════════════════════════════════════════════════════

function AdminDashboard({ systemStatus }) {
    const { t } = useLanguage()
    const [inventory, setInventory] = useState([])
    const [alerts, setAlerts] = useState([])
    const [orders, setOrders] = useState([])
    const [traces, setTraces] = useState([])
    const [customers, setCustomers] = useState([])

    // Active tab - controls which single view is shown
    const [activeTab, setActiveTab] = useState('patients')

    // Patient management state
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCondition, setFilterCondition] = useState('')
    const [showPatientModal, setShowPatientModal] = useState(false)

    // Orders filter state
    const [orderStatusFilter, setOrderStatusFilter] = useState('')

    useEffect(() => {
        fetchDashboardData()
        const interval = setInterval(fetchDashboardData, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchDashboardData = async () => {
        try {
            const [invRes, alertsRes, ordersRes, tracesRes, custRes] = await Promise.all([
                fetch('/api/v1/inventory'),
                fetch('/api/v1/alerts'),
                fetch('/api/v1/orders'),
                fetch('/api/v1/admin/traces'),
                fetch('/api/v1/customers')
            ])

            const [invData, alertsData, ordersData, tracesData, custData] = await Promise.all([
                invRes.json(), alertsRes.json(), ordersRes.json(), tracesRes.json(), custRes.json()
            ])

            setInventory(invData.items || [])
            setAlerts(alertsData.alerts || [])
            setOrders(ordersData.orders || [])
            setTraces(tracesData.traces || [])
            setCustomers(custData.customers || [])
        } catch (error) {
            console.error('Failed to fetch data:', error)
        }
    }

    // Helper functions
    const parseListField = (field) => {
        if (!field || field === 'None') return []
        return field.split(';').map(s => s.trim()).filter(s => s)
    }

    const formatTraceTime = (timestamp) => {
        if (!timestamp) return 'N/A'
        const date = new Date(timestamp)
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Filter functions
    const allConditions = [...new Set(
        customers
            .map(c => c.chronic_conditions || '')
            .flatMap(c => c.split(';').map(s => s.trim()))
            .filter(c => c && c !== 'None')
    )]

    const filteredCustomers = customers.filter(customer => {
        const matchesSearch = searchQuery === '' ||
            customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.customer_id?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCondition = filterCondition === '' ||
            (customer.chronic_conditions || '').toLowerCase().includes(filterCondition.toLowerCase())
        return matchesSearch && matchesCondition
    })

    const filteredOrders = orders.filter(order =>
        orderStatusFilter === '' || order.status === orderStatusFilter
    )

    const lowStockItems = inventory.filter(i => i.low_stock)

    // Modal handlers
    const openPatientModal = (patient) => {
        setSelectedPatient(patient)
        setShowPatientModal(true)
    }

    const closePatientModal = () => {
        setShowPatientModal(false)
        setSelectedPatient(null)
    }

    // Tab definitions
    const tabs = [
        { id: 'patients', icon: '👥', label: 'Patients' },
        { id: 'orders', icon: '📦', label: 'Orders' },
        { id: 'inventory', icon: '💊', label: 'Inventory' },
        { id: 'observability', icon: '🔍', label: 'Traces' },
        { id: 'health', icon: '⚙️', label: 'Health' }
    ]

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER FUNCTIONS FOR EACH TAB
    // ═══════════════════════════════════════════════════════════════════════

    const renderPatientsTab = () => (
        <div className="admin-content-view">
            <div className="content-header">
                <h1>👥 Patients</h1>
                <div className="content-stats">
                    <span className="stat-chip">{customers.length} Total</span>
                    <span className="stat-chip highlight">{filteredCustomers.length} Showing</span>
                </div>
            </div>

            <div className="content-controls">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
                <select
                    value={filterCondition}
                    onChange={(e) => setFilterCondition(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Conditions</option>
                    {allConditions.map((condition, idx) => (
                        <option key={idx} value={condition}>{condition}</option>
                    ))}
                </select>
            </div>

            <div className="content-table-wrapper">
                <table className="content-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Chronic Conditions</th>
                            <th>Allergies</th>
                            <th>Registered</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map((customer, idx) => (
                            <tr key={idx} onClick={() => openPatientModal(customer)}>
                                <td className="table-id">{customer.customer_id}</td>
                                <td className="table-name">{customer.name}</td>
                                <td className="table-email">{customer.email}</td>
                                <td>
                                    <div className="tag-group">
                                        {parseListField(customer.chronic_conditions).slice(0, 2).map((condition, i) => (
                                            <span key={i} className="tag condition">{condition}</span>
                                        ))}
                                        {parseListField(customer.chronic_conditions).length > 2 && (
                                            <span className="tag more">+{parseListField(customer.chronic_conditions).length - 2}</span>
                                        )}
                                        {parseListField(customer.chronic_conditions).length === 0 && (
                                            <span className="no-data">None</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div className="tag-group">
                                        {parseListField(customer.allergies).map((allergy, i) => (
                                            <span key={i} className="tag allergy">{allergy}</span>
                                        ))}
                                        {parseListField(customer.allergies).length === 0 && (
                                            <span className="no-data">None</span>
                                        )}
                                    </div>
                                </td>
                                <td className="table-date">{customer.registered_date}</td>
                                <td>
                                    <button className="action-btn" onClick={(e) => { e.stopPropagation(); openPatientModal(customer) }}>
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredCustomers.length === 0 && (
                    <div className="no-results">No patients match your search criteria</div>
                )}
            </div>
        </div>
    )

    const renderOrdersTab = () => (
        <div className="admin-content-view">
            <div className="content-header">
                <h1>📦 Orders</h1>
                <div className="content-stats">
                    <span className="stat-chip">{orders.length} Total</span>
                    <span className="stat-chip highlight">{filteredOrders.length} Showing</span>
                </div>
            </div>

            <div className="content-controls">
                <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            <div className="orders-list">
                {filteredOrders.length > 0 ? filteredOrders.slice().reverse().map((order, idx) => (
                    <div key={idx} className="order-card">
                        <div className="order-main">
                            <div className="order-id">{order.order_id || `Order ${idx + 1}`}</div>
                            <div className="order-medicine">{order.medicine_name}</div>
                            <div className="order-qty">Qty: {order.quantity}</div>
                        </div>
                        <div className="order-meta">
                            <span className="order-customer">{order.customer_id}</span>
                            <span className={`order-status ${order.status}`}>{order.status}</span>
                        </div>
                    </div>
                )) : (
                    <div className="no-results">No orders found</div>
                )}
            </div>
        </div>
    )

    const renderInventoryTab = () => (
        <div className="admin-content-view">
            <div className="content-header">
                <h1>💊 Inventory</h1>
                <div className="content-stats">
                    <span className="stat-chip">{inventory.length} Items</span>
                    <span className={`stat-chip ${lowStockItems.length > 0 ? 'warning' : 'success'}`}>
                        {lowStockItems.length} Low Stock
                    </span>
                </div>
            </div>

            <div className="inventory-grid">
                {inventory.map((item, idx) => (
                    <div key={idx} className={`inventory-card ${item.low_stock ? 'low-stock' : ''}`}>
                        <div className="inv-header">
                            <span className="inv-name">{item.name}</span>
                            {item.prescription_required === 'true' && (
                                <span className="inv-rx">Rx</span>
                            )}
                        </div>
                        <div className="inv-category">{item.category}</div>
                        <div className="inv-stock">
                            <span className={`stock-value ${item.low_stock ? 'low' : ''}`}>
                                {item.stock_quantity}
                            </span>
                            <span className="stock-unit">{item.unit}</span>
                        </div>
                        <div className="inv-price">₹{item.price}</div>
                    </div>
                ))}
            </div>
        </div>
    )

    const renderObservabilityTab = () => (
        <div className="admin-content-view">
            <div className="content-header">
                <h1>🔍 Observability & Agent Traces</h1>
                <div className="content-stats">
                    <span className="stat-chip">{traces.length} Traces</span>
                    {systemStatus?.observability?.langfuse && (
                        <a
                            href="https://cloud.langfuse.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="langfuse-btn"
                        >
                            Open Langfuse →
                        </a>
                    )}
                </div>
            </div>

            <div className="traces-timeline">
                {traces.length > 0 ? traces.slice().reverse().map((trace, idx) => (
                    <div key={idx} className={`trace-card ${idx === 0 ? 'recent' : ''}`}>
                        <div className="trace-left">
                            <div className="trace-id">#{trace.id?.slice(0, 8) || 'N/A'}</div>
                            <div className="trace-time">{formatTraceTime(trace.timestamp)}</div>
                        </div>
                        <div className="trace-center">
                            <div className="trace-agent">{trace.name || 'Unknown Agent'}</div>
                            <div className="trace-details">
                                {trace.decisions?.length || 0} decisions
                            </div>
                        </div>
                        <div className="trace-right">
                            {idx === 0 && <span className="trace-badge">Latest</span>}
                        </div>
                    </div>
                )) : (
                    <div className="no-results">No traces captured yet. Interact with the pharmacy assistant to generate traces.</div>
                )}
            </div>
        </div>
    )

    const renderHealthTab = () => (
        <div className="admin-content-view">
            <div className="content-header">
                <h1>⚙️ System Health</h1>
                <div className="content-stats">
                    <span className={`stat-chip ${systemStatus?.status === 'operational' ? 'success' : 'warning'}`}>
                        {systemStatus?.status || 'Loading...'}
                    </span>
                </div>
            </div>

            <div className="health-sections">
                <div className="health-section">
                    <h3>Agents</h3>
                    <div className="health-grid">
                        {systemStatus?.agents && Object.entries(systemStatus.agents).map(([agent, status]) => (
                            <div key={agent} className="health-card">
                                <div className="health-name">{agent}</div>
                                <div className="health-status active">● {status}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="health-section">
                    <h3>Connections</h3>
                    <div className="health-grid">
                        <div className="health-card">
                            <div className="health-name">Ollama LLM</div>
                            <div className={`health-status ${systemStatus?.ollama?.available ? 'active' : 'inactive'}`}>
                                ● {systemStatus?.ollama?.available ? `Connected (${systemStatus?.ollama?.model})` : 'Offline'}
                            </div>
                        </div>
                        <div className="health-card">
                            <div className="health-name">Langfuse Tracing</div>
                            <div className={`health-status ${systemStatus?.observability?.langfuse ? 'active' : ''}`}>
                                ● {systemStatus?.observability?.langfuse ? 'Enabled' : 'Mock Mode'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="health-section">
                    <h3>Proactive Refill Alerts</h3>
                    <div className="health-card wide">
                        <div className="health-name">{alerts.length} customers need refills</div>
                        {alerts.slice(0, 5).map((alert, idx) => (
                            <div key={idx} className="alert-row">
                                <span>{alert.customer_name}</span>
                                <span className="alert-med">{alert.medicine_name}</span>
                                <span className={`alert-days ${alert.days_until_refill <= 0 ? 'overdue' : ''}`}>
                                    {alert.days_until_refill <= 0 ? 'Overdue' : `${alert.days_until_refill} days`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )

    // Render active tab content
    const renderContent = () => {
        switch (activeTab) {
            case 'patients': return renderPatientsTab()
            case 'orders': return renderOrdersTab()
            case 'inventory': return renderInventoryTab()
            case 'observability': return renderObservabilityTab()
            case 'health': return renderHealthTab()
            default: return renderPatientsTab()
        }
    }

    return (
        <div className="admin-single-view">
            {/* Left Side Tab Rail */}
            <nav className="side-tab-rail">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`rail-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.label}
                    >
                        <span className="rail-icon">{tab.icon}</span>
                        <span className="rail-label">{tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* Main Content - Single View */}
            <main className="admin-main-content">
                {renderContent()}
            </main>

            {/* Patient Detail Modal */}
            {showPatientModal && selectedPatient && (
                <div className="modal-overlay" onClick={closePatientModal}>
                    <div className="patient-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Patient Profile</h2>
                            <button className="modal-close-btn" onClick={closePatientModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="patient-profile-header">
                                <div className="patient-avatar">
                                    {selectedPatient.name?.charAt(0) || '?'}
                                </div>
                                <div className="patient-main-info">
                                    <h3>{selectedPatient.name}</h3>
                                    <p className="patient-id-display">{selectedPatient.customer_id}</p>
                                </div>
                            </div>

                            <div className="patient-details-grid">
                                <div className="detail-item">
                                    <span className="detail-label">📧 Email</span>
                                    <span className="detail-value">{selectedPatient.email}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">📱 Phone</span>
                                    <span className="detail-value">{selectedPatient.phone}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">🎂 Date of Birth</span>
                                    <span className="detail-value">{selectedPatient.date_of_birth}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">🌐 Language</span>
                                    <span className="detail-value">{selectedPatient.language?.toUpperCase() || 'EN'}</span>
                                </div>
                                <div className="detail-item full-width">
                                    <span className="detail-label">📍 Address</span>
                                    <span className="detail-value">{selectedPatient.address}</span>
                                </div>
                            </div>

                            <div className="patient-health-section">
                                <div className="health-card conditions">
                                    <h4>🩺 Chronic Conditions</h4>
                                    <div className="health-tags">
                                        {parseListField(selectedPatient.chronic_conditions).map((condition, i) => (
                                            <span key={i} className="tag condition large">{condition}</span>
                                        ))}
                                        {parseListField(selectedPatient.chronic_conditions).length === 0 && (
                                            <span className="no-health-data">No chronic conditions reported</span>
                                        )}
                                    </div>
                                </div>
                                <div className="health-card allergies">
                                    <h4>⚠️ Allergies</h4>
                                    <div className="health-tags">
                                        {parseListField(selectedPatient.allergies).map((allergy, i) => (
                                            <span key={i} className="tag allergy large">{allergy}</span>
                                        ))}
                                        {parseListField(selectedPatient.allergies).length === 0 && (
                                            <span className="no-health-data">No allergies reported</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminDashboard
