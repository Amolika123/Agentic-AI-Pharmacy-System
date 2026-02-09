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
    const [activeTab, setActiveTab] = useState('overview')

    // Patient management state
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCondition, setFilterCondition] = useState('')
    const [showPatientModal, setShowPatientModal] = useState(false)

    // Orders filter state
    const [orderStatusFilter, setOrderStatusFilter] = useState('')

    // Inventory edit state
    const [editingItem, setEditingItem] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editForm, setEditForm] = useState({
        stock_quantity: 0,
        unit_price: 0,
        reorder_level: 0
    })

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

    // Inventory edit handlers
    const openEditModal = (item) => {
        setEditingItem(item)
        setEditForm({
            stock_quantity: item.stock_quantity || 0,
            unit_price: parseFloat(item.unit_price || item.price || 0),
            reorder_level: parseInt(item.reorder_level || 10)
        })
        setShowEditModal(true)
    }

    const closeEditModal = () => {
        setShowEditModal(false)
        setEditingItem(null)
    }

    const handleEditSubmit = async (e) => {
        e.preventDefault()
        if (!editingItem) return

        try {
            const res = await fetch(`/api/v1/inventory/${editingItem.medicine_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })
            const data = await res.json()
            if (data.success) {
                closeEditModal()
                fetchDashboardData() // Refresh inventory
            } else {
                console.error('Failed to update:', data)
            }
        } catch (error) {
            console.error('Error updating inventory:', error)
        }
    }

    // Tab definitions - PharmAgent spec order
    const tabs = [
        { id: 'overview', icon: '📊', label: 'Overview' },
        { id: 'orders', icon: '📦', label: 'Orders' },
        { id: 'inventory', icon: '💊', label: 'Inventory' },
        { id: 'patients', icon: '👥', label: 'Patients' },
        { id: 'observability', icon: '🔍', label: 'Traces' },
        { id: 'settings', icon: '⚙️', label: 'Settings' }
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
                        <div className="inv-footer">
                            <span className="inv-price">₹{item.unit_price || item.price}</span>
                            <button className="edit-btn" onClick={() => openEditModal(item)}>✏️ Edit</button>
                        </div>
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

    // ═══════════════════════════════════════════════════════════════════════
    // OVERVIEW TAB - Key metrics dashboard
    // ═══════════════════════════════════════════════════════════════════════

    const renderOverviewTab = () => {
        const pendingOrders = orders.filter(o => o.status === 'pending').length
        const completedOrders = orders.filter(o => o.status === 'completed').length
        const confirmedOrders = orders.filter(o => o.status === 'confirmed').length

        return (
            <div className="admin-content-view">
                <div className="content-header">
                    <h1>📊 Overview</h1>
                    <div className="content-stats">
                        <span className={`stat-chip ${systemStatus?.status === 'operational' ? 'success' : 'warning'}`}>
                            {systemStatus?.status || 'Loading...'}
                        </span>
                    </div>
                </div>

                <div className="overview-grid">
                    <div className="overview-card">
                        <div className="overview-icon">👥</div>
                        <div className="overview-value">{customers.length}</div>
                        <div className="overview-label">Total Patients</div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-icon">📦</div>
                        <div className="overview-value">{orders.length}</div>
                        <div className="overview-label">Total Orders</div>
                    </div>
                    <div className="overview-card highlight">
                        <div className="overview-icon">⏳</div>
                        <div className="overview-value">{pendingOrders}</div>
                        <div className="overview-label">Pending Orders</div>
                    </div>
                    <div className={`overview-card ${lowStockItems.length > 0 ? 'warning' : ''}`}>
                        <div className="overview-icon">⚠️</div>
                        <div className="overview-value">{lowStockItems.length}</div>
                        <div className="overview-label">Low Stock Items</div>
                    </div>
                </div>

                <div className="overview-sections">
                    <div className="overview-section">
                        <h3>Order Summary</h3>
                        <div className="summary-row">
                            <span>Pending</span>
                            <span className="summary-value pending">{pendingOrders}</span>
                        </div>
                        <div className="summary-row">
                            <span>Confirmed</span>
                            <span className="summary-value confirmed">{confirmedOrders}</span>
                        </div>
                        <div className="summary-row">
                            <span>Completed</span>
                            <span className="summary-value completed">{completedOrders}</span>
                        </div>
                    </div>

                    <div className="overview-section">
                        <h3>System Status</h3>
                        <div className="summary-row">
                            <span>LLM Connection</span>
                            <span className={`summary-status ${systemStatus?.ollama?.available ? 'active' : 'inactive'}`}>
                                {systemStatus?.ollama?.available ? 'Connected' : 'Offline'}
                            </span>
                        </div>
                        <div className="summary-row">
                            <span>Observability</span>
                            <span className="summary-status active">
                                {systemStatus?.observability?.langfuse ? 'Langfuse' : 'Mock'}
                            </span>
                        </div>
                        <div className="summary-row">
                            <span>Active Traces</span>
                            <span className="summary-value">{traces.length}</span>
                        </div>
                    </div>

                    <div className="overview-section">
                        <h3>Refill Alerts</h3>
                        {alerts.length > 0 ? (
                            alerts.slice(0, 4).map((alert, idx) => (
                                <div key={idx} className="summary-row">
                                    <span>{alert.customer_name}</span>
                                    <span className={`summary-status ${alert.days_until_refill <= 0 ? 'warning' : ''}`}>
                                        {alert.days_until_refill <= 0 ? 'Overdue' : `${alert.days_until_refill}d`}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">No refill alerts</div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SETTINGS TAB - Comprehensive Admin Configuration
    // ═══════════════════════════════════════════════════════════════════════

    const [settingsSection, setSettingsSection] = useState('organization')
    const [showDangerConfirm, setShowDangerConfirm] = useState(null)

    const adminSettingsSections = [
        { id: 'organization', icon: '🏥', label: 'Organization' },
        { id: 'users', icon: '👥', label: 'Users & Roles' },
        { id: 'safety', icon: '🛡️', label: 'Safety & Policy' },
        { id: 'agents', icon: '🤖', label: 'Agent Config' },
        { id: 'observability', icon: '📊', label: 'Observability' },
        { id: 'inventory', icon: '📦', label: 'Inventory Rules' },
        { id: 'compliance', icon: '📋', label: 'Compliance' },
        { id: 'danger', icon: '⚠️', label: 'Danger Zone' }
    ]

    const renderSettingsTab = () => (
        <div className="admin-content-view admin-settings-layout">
            {/* Settings Sub-Navigation */}
            <div className="admin-settings-sidebar">
                {adminSettingsSections.map(section => (
                    <button
                        key={section.id}
                        className={`admin-settings-nav-item ${settingsSection === section.id ? 'active' : ''} ${section.id === 'danger' ? 'danger' : ''}`}
                        onClick={() => setSettingsSection(section.id)}
                    >
                        <span className="nav-icon">{section.icon}</span>
                        <span className="nav-label">{section.label}</span>
                    </button>
                ))}
            </div>

            {/* Settings Content */}
            <div className="admin-settings-content">
                {settingsSection === 'organization' && (
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2>🏥 Organization Settings</h2>
                            <p>Configure your pharmacy's basic information</p>
                        </div>
                        <div className="settings-sections">
                            <div className="settings-section">
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Pharmacy Name</span>
                                        <span className="settings-description">Official business name</span>
                                    </div>
                                    <span className="settings-value">PharmAgent Demo Pharmacy</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Address</span>
                                        <span className="settings-description">Physical location</span>
                                    </div>
                                    <span className="settings-value">123 Health Street, Medical City</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Operating Hours</span>
                                        <span className="settings-description">Business hours</span>
                                    </div>
                                    <span className="settings-value">9:00 AM - 9:00 PM</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Timezone</span>
                                        <span className="settings-description">System timezone</span>
                                    </div>
                                    <span className="settings-value">Asia/Kolkata (IST)</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Default Language</span>
                                        <span className="settings-description">Primary AI language</span>
                                    </div>
                                    <span className="settings-value">English</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {settingsSection === 'users' && (
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2>👥 User & Role Management</h2>
                            <p>Manage admin users and their permissions</p>
                        </div>
                        <div className="admin-users-list">
                            <div className="admin-user-card">
                                <div className="user-avatar">👤</div>
                                <div className="user-details">
                                    <span className="user-name">Admin User</span>
                                    <span className="user-email">admin@pharmagent.com</span>
                                </div>
                                <span className="role-badge admin">Admin</span>
                                <span className="user-status active">Active</span>
                            </div>
                            <div className="admin-user-card">
                                <div className="user-avatar">💊</div>
                                <div className="user-details">
                                    <span className="user-name">Dr. Pharmacist</span>
                                    <span className="user-email">pharmacist@pharmagent.com</span>
                                </div>
                                <span className="role-badge pharmacist">Pharmacist</span>
                                <span className="user-status active">Active</span>
                            </div>
                        </div>
                        <p className="settings-note">Role changes require verification. Admins cannot modify their own role.</p>
                    </div>
                )}

                {settingsSection === 'safety' && (
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2>🛡️ Safety & Policy Rules</h2>
                            <p>Configure medication safety and ordering policies</p>
                        </div>
                        <div className="settings-sections">
                            <div className="settings-section">
                                <h3>Order Policies</h3>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Max Order Quantity</span>
                                        <span className="settings-description">Maximum items per order</span>
                                    </div>
                                    <span className="settings-value">10 units</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Prescription Validation</span>
                                        <span className="settings-description">Require prescription for Rx medicines</span>
                                    </div>
                                    <span className="settings-badge enabled">Enforced</span>
                                </div>
                            </div>
                            <div className="settings-section">
                                <h3>Safety Enforcement</h3>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Allergy Blocking</span>
                                        <span className="settings-description">Block orders with known allergies</span>
                                    </div>
                                    <span className="settings-badge enabled">Hard Block</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Drug Interaction Checks</span>
                                        <span className="settings-description">Check for dangerous interactions</span>
                                    </div>
                                    <span className="settings-badge enabled">Enabled</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {settingsSection === 'agents' && (
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2>🤖 Agent Configuration</h2>
                            <p>Control AI agent behavior (high-level only)</p>
                        </div>
                        <div className="settings-sections">
                            <div className="settings-section">
                                <h3>Agent Status</h3>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Safety Agent</span>
                                        <span className="settings-description">Drug interaction & allergy validation</span>
                                    </div>
                                    <span className="settings-badge enabled">Enabled</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Refill Agent</span>
                                        <span className="settings-description">Proactive refill predictions</span>
                                    </div>
                                    <span className="settings-badge enabled">Enabled</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Vision Agent</span>
                                        <span className="settings-description">Prescription image processing</span>
                                    </div>
                                    <span className="settings-badge enabled">Enabled</span>
                                </div>
                            </div>
                            <div className="settings-section">
                                <h3>Execution Mode</h3>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Operation Mode</span>
                                        <span className="settings-description">How agents handle decisions</span>
                                    </div>
                                    <span className="settings-value">Strict (Confirm All)</span>
                                </div>
                            </div>
                        </div>
                        <p className="settings-note">Prompt editing is not available in this interface for safety reasons.</p>
                    </div>
                )}

                {settingsSection === 'observability' && (
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2>📊 Observability Settings</h2>
                            <p>Configure tracing and logging</p>
                        </div>
                        <div className="settings-sections">
                            <div className="settings-section">
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Trace Logging</span>
                                        <span className="settings-description">Record agent decisions</span>
                                    </div>
                                    <span className="settings-badge enabled">Enabled</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Tracing Provider</span>
                                        <span className="settings-description">Current logging backend</span>
                                    </div>
                                    <span className="settings-value">{systemStatus?.observability?.langfuse ? 'Langfuse' : 'Local Mock'}</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Trace Retention</span>
                                        <span className="settings-description">How long traces are kept</span>
                                    </div>
                                    <span className="settings-value">30 days</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Mask Patient Identifiers</span>
                                        <span className="settings-description">Anonymize PII in logs</span>
                                    </div>
                                    <span className="settings-badge enabled">Enabled</span>
                                </div>
                            </div>
                        </div>
                        <button className="secondary-btn">📥 Export Traces (Admin Only)</button>
                    </div>
                )}

                {settingsSection === 'inventory' && (
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2>📦 Inventory Rules</h2>
                            <p>Configure stock management thresholds</p>
                        </div>
                        <div className="settings-sections">
                            <div className="settings-section">
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Default Low Stock Threshold</span>
                                        <span className="settings-description">Alert when stock falls below this</span>
                                    </div>
                                    <span className="settings-value">10 units</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Restock Alerts</span>
                                        <span className="settings-description">Notify admins for low stock</span>
                                    </div>
                                    <span className="settings-badge enabled">Active</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Auto-hide Out of Stock</span>
                                        <span className="settings-description">Hide unavailable items from catalog</span>
                                    </div>
                                    <span className="settings-badge">Disabled</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {settingsSection === 'compliance' && (
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2>📋 Compliance & Audit</h2>
                            <p>Regulatory compliance and audit logs</p>
                        </div>
                        <div className="settings-sections">
                            <div className="settings-section">
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Audit Logging</span>
                                        <span className="settings-description">Track all system changes</span>
                                    </div>
                                    <span className="settings-badge enabled">Enabled</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">Data Retention</span>
                                        <span className="settings-description">Order and patient data</span>
                                    </div>
                                    <span className="settings-value">7 years</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">System Version</span>
                                        <span className="settings-description">Current PharmAgent version</span>
                                    </div>
                                    <span className="settings-value">v2.1.0</span>
                                </div>
                            </div>
                        </div>
                        <button className="secondary-btn">📄 View Audit Logs</button>
                    </div>
                )}

                {settingsSection === 'danger' && (
                    <div className="settings-panel danger-zone-panel">
                        <div className="settings-panel-header">
                            <h2>⚠️ Danger Zone</h2>
                            <p>Critical system actions - use with caution</p>
                        </div>
                        <div className="danger-warning">
                            <span className="warning-icon">🚨</span>
                            <div>
                                <strong>Warning</strong>
                                <p>Actions here can affect system stability. All actions require confirmation.</p>
                            </div>
                        </div>
                        <div className="danger-actions-list">
                            <div className="danger-action-item">
                                <div className="danger-action-info">
                                    <span className="danger-action-label">Reset Demo Data</span>
                                    <span className="danger-action-desc">Restore all data to demo defaults</span>
                                </div>
                                {showDangerConfirm === 'reset' ? (
                                    <div className="confirm-buttons">
                                        <button className="cancel-btn" onClick={() => setShowDangerConfirm(null)}>Cancel</button>
                                        <button className="confirm-danger-btn" onClick={() => { alert('Demo data reset'); setShowDangerConfirm(null); }}>Confirm Reset</button>
                                    </div>
                                ) : (
                                    <button className="danger-btn" onClick={() => setShowDangerConfirm('reset')}>Reset</button>
                                )}
                            </div>
                            <div className="danger-action-item">
                                <div className="danger-action-info">
                                    <span className="danger-action-label">Clear Cache</span>
                                    <span className="danger-action-desc">Clear all cached data and sessions</span>
                                </div>
                                {showDangerConfirm === 'cache' ? (
                                    <div className="confirm-buttons">
                                        <button className="cancel-btn" onClick={() => setShowDangerConfirm(null)}>Cancel</button>
                                        <button className="confirm-danger-btn" onClick={() => { alert('Cache cleared'); setShowDangerConfirm(null); }}>Confirm Clear</button>
                                    </div>
                                ) : (
                                    <button className="danger-btn" onClick={() => setShowDangerConfirm('cache')}>Clear</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )

    // Render active tab content
    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return renderOverviewTab()
            case 'orders': return renderOrdersTab()
            case 'inventory': return renderInventoryTab()
            case 'patients': return renderPatientsTab()
            case 'observability': return renderObservabilityTab()
            case 'settings': return renderSettingsTab()
            default: return renderOverviewTab()
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

            {/* Inventory Edit Modal */}
            {showEditModal && editingItem && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Inventory</h2>
                            <button className="modal-close-btn" onClick={closeEditModal}>✕</button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="edit-form">
                            <div className="edit-item-name">{editingItem.name}</div>
                            <div className="edit-item-category">{editingItem.category}</div>

                            <div className="form-group">
                                <label>Stock Quantity</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editForm.stock_quantity}
                                    onChange={(e) => setEditForm({ ...editForm, stock_quantity: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Unit Price (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editForm.unit_price}
                                    onChange={(e) => setEditForm({ ...editForm, unit_price: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Reorder Level</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editForm.reorder_level}
                                    onChange={(e) => setEditForm({ ...editForm, reorder_level: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={closeEditModal}>Cancel</button>
                                <button type="submit" className="save-btn">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminDashboard
