import { useState, useEffect } from 'react'
import { useLanguage } from '../LanguageContext'

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD - Administrative overview panel with enhanced patient view
// Features: Patient search/filter, profile modal, conditions/allergies display
// ═══════════════════════════════════════════════════════════════════════════

function AdminDashboard({ systemStatus }) {
    const { t } = useLanguage()
    const [inventory, setInventory] = useState([])
    const [alerts, setAlerts] = useState([])
    const [orders, setOrders] = useState([])
    const [traces, setTraces] = useState([])
    const [customers, setCustomers] = useState([])

    // Patient management state
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCondition, setFilterCondition] = useState('')
    const [showPatientModal, setShowPatientModal] = useState(false)

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

    const lowStockItems = inventory.filter(i => i.low_stock)
    const prescriptionMeds = inventory.filter(i => i.prescription_required === 'true')

    // Get unique chronic conditions for filter dropdown
    const allConditions = [...new Set(
        customers
            .map(c => c.chronic_conditions || '')
            .flatMap(c => c.split(';').map(s => s.trim()))
            .filter(c => c && c !== 'None')
    )]

    // Filter customers based on search and condition filter
    const filteredCustomers = customers.filter(customer => {
        const matchesSearch = searchQuery === '' ||
            customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.customer_id?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesCondition = filterCondition === '' ||
            (customer.chronic_conditions || '').toLowerCase().includes(filterCondition.toLowerCase())

        return matchesSearch && matchesCondition
    })

    const openPatientModal = (patient) => {
        setSelectedPatient(patient)
        setShowPatientModal(true)
    }

    const closePatientModal = () => {
        setShowPatientModal(false)
        setSelectedPatient(null)
    }

    // Format conditions/allergies for display
    const parseListField = (field) => {
        if (!field || field === 'None') return []
        return field.split(';').map(s => s.trim()).filter(s => s)
    }

    return (
        <div className="admin-dashboard">
            {/* System Overview */}
            <div className="dashboard-card">
                <h2><span className="card-icon">📊</span> System Status</h2>
                <div className="metric-value">
                    {systemStatus?.status === 'operational' ? '✓' : '⚠'}
                </div>
                <div className="metric-label">{systemStatus?.status || 'Loading...'}</div>

                <div className="status-grid" style={{ marginTop: '1rem' }}>
                    {systemStatus?.agents && Object.entries(systemStatus.agents).map(([agent, status]) => (
                        <div key={agent} className="status-item">
                            <div className="status-label">{agent}</div>
                            <div className="status-value active">● {status}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Proactive Refill Alerts */}
            <div className="dashboard-card" style={{ gridColumn: 'span 2' }}>
                <h2><span className="card-icon">🔔</span> Proactive Refill Alerts</h2>
                <div className="metric-value">{alerts.length}</div>
                <div className="metric-label">Customers need refills</div>

                <div className="inventory-list" style={{ marginTop: '1rem', maxHeight: '200px', overflow: 'auto' }}>
                    {alerts.length > 0 ? alerts.slice(0, 5).map((alert, idx) => (
                        <div key={idx} className="inventory-item" style={{
                            borderLeft: `3px solid ${alert.urgency === 'critical' ? 'var(--error)' : alert.urgency === 'high' ? 'var(--warning)' : 'var(--success)'}`,
                            paddingLeft: '0.75rem'
                        }}>
                            <div>
                                <div className="inventory-name">{alert.customer_name}</div>
                                <div className="inventory-category">{alert.medicine_name}</div>
                            </div>
                            <div className={`inventory-quantity ${alert.urgency === 'critical' ? 'low' : ''}`}>
                                {alert.days_until_refill <= 0 ? 'Overdue' : `${alert.days_until_refill} days`}
                            </div>
                        </div>
                    )) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            No urgent refills at this time
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Patients Section */}
            <div className="dashboard-card" style={{ gridColumn: 'span 3' }}>
                <div className="patients-header">
                    <h2><span className="card-icon">👥</span> Patients</h2>
                    <div className="patients-stats">
                        <span className="stat-badge">{customers.length} Total</span>
                        <span className="stat-badge highlight">{filteredCustomers.length} Showing</span>
                    </div>
                </div>

                {/* Search and Filter Controls */}
                <div className="patients-controls">
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

                {/* Patients Table */}
                <div className="patients-table-wrapper">
                    <table className="patients-table">
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
                                    <td className="patient-id">{customer.customer_id}</td>
                                    <td className="patient-name">{customer.name}</td>
                                    <td className="patient-email">{customer.email}</td>
                                    <td>
                                        <div className="condition-tags">
                                            {parseListField(customer.chronic_conditions).slice(0, 2).map((condition, i) => (
                                                <span key={i} className="condition-tag">{condition}</span>
                                            ))}
                                            {parseListField(customer.chronic_conditions).length > 2 && (
                                                <span className="condition-tag more">+{parseListField(customer.chronic_conditions).length - 2}</span>
                                            )}
                                            {parseListField(customer.chronic_conditions).length === 0 && (
                                                <span className="no-data">None</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="allergy-tags">
                                            {parseListField(customer.allergies).map((allergy, i) => (
                                                <span key={i} className="allergy-tag">{allergy}</span>
                                            ))}
                                            {parseListField(customer.allergies).length === 0 && (
                                                <span className="no-data">None</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="patient-date">{customer.registered_date}</td>
                                    <td>
                                        <button className="view-profile-btn" onClick={(e) => { e.stopPropagation(); openPatientModal(customer) }}>
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

            {/* Inventory */}
            <div className="dashboard-card">
                <h2><span className="card-icon">💊</span> Medicine Inventory</h2>
                <div className="metric-value">{inventory.length}</div>
                <div className="metric-label">Total medicines</div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <span style={{
                        background: lowStockItems.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        color: lowStockItems.length > 0 ? 'var(--error)' : 'var(--success)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem'
                    }}>
                        {lowStockItems.length} Low Stock
                    </span>
                    <span style={{
                        background: 'rgba(139, 92, 246, 0.2)',
                        color: 'var(--accent-secondary)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem'
                    }}>
                        {prescriptionMeds.length} Rx Required
                    </span>
                </div>

                <div className="inventory-list" style={{ marginTop: '1rem', maxHeight: '150px', overflow: 'auto' }}>
                    {inventory.slice(0, 6).map((item, idx) => (
                        <div key={idx} className="inventory-item">
                            <div>
                                <div className="inventory-name">{item.name}</div>
                                <div className="inventory-category">{item.category}</div>
                            </div>
                            <div className={`inventory-quantity ${item.low_stock ? 'low' : ''}`}>
                                {item.stock_quantity} {item.unit}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Orders */}
            <div className="dashboard-card">
                <h2><span className="card-icon">📦</span> Recent Orders</h2>
                <div className="metric-value">{orders.length}</div>
                <div className="metric-label">Total orders</div>

                <div className="inventory-list" style={{ marginTop: '1rem', maxHeight: '150px', overflow: 'auto' }}>
                    {orders.slice(-5).reverse().map((order, idx) => (
                        <div key={idx} className="inventory-item">
                            <div>
                                <div className="inventory-name">{order.order_id || order.medicine_name}</div>
                                <div className="inventory-category">{order.customer_id}</div>
                            </div>
                            <div className="inventory-quantity" style={{
                                color: order.status === 'confirmed' ? 'var(--success)' :
                                    order.status === 'completed' ? 'var(--success)' : 'var(--warning)'
                            }}>
                                {order.status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Observability */}
            <div className="dashboard-card">
                <h2><span className="card-icon">🔍</span> Observability (Traces)</h2>
                <div className="metric-value">{traces.length}</div>
                <div className="metric-label">Trace logs captured</div>

                <div className="inventory-list" style={{ marginTop: '1rem', maxHeight: '150px', overflow: 'auto' }}>
                    {traces.slice(-5).reverse().map((trace, idx) => (
                        <div key={idx} className="inventory-item">
                            <div>
                                <div className="inventory-name">{trace.name}</div>
                                <div className="inventory-category">
                                    {trace.decisions?.length || 0} decisions
                                </div>
                            </div>
                            <div className="inventory-quantity" style={{ fontSize: '0.65rem' }}>
                                {trace.id?.slice(0, 12)}
                            </div>
                        </div>
                    ))}
                </div>

                {systemStatus?.observability?.langfuse && (
                    <a
                        href="https://cloud.langfuse.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            background: 'var(--accent-gradient)',
                            borderRadius: 'var(--radius-full)',
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: '0.75rem'
                        }}
                    >
                        Open Langfuse →
                    </a>
                )}
            </div>

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
                                <div className="detail-item">
                                    <span className="detail-label">📅 Registered</span>
                                    <span className="detail-value">{selectedPatient.registered_date}</span>
                                </div>
                            </div>

                            <div className="patient-health-section">
                                <div className="health-card conditions">
                                    <h4>🩺 Chronic Conditions</h4>
                                    <div className="health-tags">
                                        {parseListField(selectedPatient.chronic_conditions).map((condition, i) => (
                                            <span key={i} className="condition-tag large">{condition}</span>
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
                                            <span key={i} className="allergy-tag large">{allergy}</span>
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
