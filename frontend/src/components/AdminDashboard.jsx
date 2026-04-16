import { useState, useEffect } from 'react'
import { useLanguage } from '../LanguageContext'

const API = import.meta.env.VITE_API_URL ?? ''

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
                fetch(`${API}/api/v1/inventory`),
                fetch(`${API}/api/v1/alerts`),
                fetch(`${API}/api/v1/orders`),
                fetch(`${API}/api/v1/admin/traces`),
                fetch(`${API}/api/v1/customers`)
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
            const res = await fetch(`${API}/api/v1/inventory/${editingItem.medicine_id}`, {
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
        { id: 'overview', icon: '📊', label: t('admin.tabOverview') },
        { id: 'orders', icon: '📦', label: t('admin.tabOrders') },
        { id: 'inventory', icon: '💊', label: t('admin.tabInventory') },
        { id: 'patients', icon: '👥', label: t('admin.tabPatients') },
        { id: 'observability', icon: '🔍', label: t('admin.tabTraces') },
        { id: 'settings', icon: '⚙️', label: t('admin.tabSettings') }
    ]

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER FUNCTIONS FOR EACH TAB
    // ═══════════════════════════════════════════════════════════════════════

    const renderPatientsTab = () => (
        <div className="admin-content-view">
            <div className="content-header">
                <h1>👥 {t('admin.patients')}</h1>
                <div className="content-stats">
                    <span className="stat-chip">{customers.length} {t('admin.total')}</span>
                    <span className="stat-chip highlight">{filteredCustomers.length} {t('admin.showing')}</span>
                </div>
            </div>

            <div className="content-controls">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder={t('admin.searchPlaceholder')}
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
                    <option value="">{t('admin.allConditions')}</option>
                    {allConditions.map((condition, idx) => (
                        <option key={idx} value={condition}>{condition}</option>
                    ))}
                </select>
            </div>

            <div className="content-table-wrapper">
                <table className="content-table">
                    <thead>
                        <tr>
                            <th>{t('admin.id')}</th>
                            <th>{t('admin.name')}</th>
                            <th>{t('admin.email')}</th>
                            <th>{t('admin.chronicConditions')}</th>
                            <th>{t('admin.allergies')}</th>
                            <th>{t('admin.registered')}</th>
                            <th>{t('admin.actions')}</th>
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
                                            <span className="no-data">{t('admin.none')}</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div className="tag-group">
                                        {parseListField(customer.allergies).map((allergy, i) => (
                                            <span key={i} className="tag allergy">{allergy}</span>
                                        ))}
                                        {parseListField(customer.allergies).length === 0 && (
                                            <span className="no-data">{t('admin.none')}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="table-date">{customer.registered_date}</td>
                                <td>
                                    <button className="action-btn" onClick={(e) => { e.stopPropagation(); openPatientModal(customer) }}>
                                        {t('admin.view')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredCustomers.length === 0 && (
                    <div className="no-results">{t('admin.noPatientsMatch')}</div>
                )}
            </div>
        </div>
    )

    const renderOrdersTab = () => (
        <div className="admin-content-view">
            <div className="content-header">
                <h1>📦 {t('admin.orders')}</h1>
                <div className="content-stats">
                    <span className="stat-chip">{orders.length} {t('admin.total')}</span>
                    <span className="stat-chip highlight">{filteredOrders.length} {t('admin.showing')}</span>
                </div>
            </div>

            <div className="content-controls">
                <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="">{t('admin.allStatus')}</option>
                    <option value="pending">{t('admin.pending')}</option>
                    <option value="confirmed">{t('admin.confirmed')}</option>
                    <option value="completed">{t('admin.completed')}</option>
                    <option value="cancelled">{t('admin.cancelled')}</option>
                </select>
            </div>

            <div className="orders-list">
                {filteredOrders.length > 0 ? filteredOrders.slice().reverse().map((order, idx) => (
                    <div key={idx} className="order-card">
                        <div className="order-main">
                            <div className="order-id">{order.order_id || `Order ${idx + 1}`}</div>
                            <div className="order-medicine">{order.medicine_name}</div>
                            <div className="order-qty">{t('admin.qty')}: {order.quantity}</div>
                        </div>
                        <div className="order-meta">
                            <span className="order-customer">{order.customer_id}</span>
                            <span className={`order-status ${order.status}`}>{order.status}</span>
                        </div>
                    </div>
                )) : (
                    <div className="no-results">{t('admin.noOrdersFound')}</div>
                )}
            </div>
        </div>
    )

    const renderInventoryTab = () => (
        <div className="admin-content-view">
            <div className="content-header">
                <h1>💊 {t('admin.inventory')}</h1>
                <div className="content-stats">
                    <span className="stat-chip">{inventory.length} {t('admin.items')}</span>
                    <span className={`stat-chip ${lowStockItems.length > 0 ? 'warning' : 'success'}`}>
                        {lowStockItems.length} {t('admin.lowStock')}
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
                            <button className="edit-btn" onClick={() => openEditModal(item)}>✏️ {t('admin.edit')}</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    const renderObservabilityTab = () => (
        <div className="admin-content-view">
            <div className="content-header">
                <h1>🔍 {t('admin.observability')}</h1>
                <div className="content-stats">
                    <span className="stat-chip">{traces.length} {t('admin.traces')}</span>
                    {systemStatus?.observability?.langfuse && (
                        <a
                            href="https://cloud.langfuse.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="langfuse-btn"
                        >
                            {t('admin.openLangfuse')}
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
                            <div className="trace-agent">{trace.name || t('admin.unknownAgent')}</div>
                            <div className="trace-details">
                                {trace.decisions?.length || 0} {t('admin.decisions')}
                            </div>
                        </div>
                        <div className="trace-right">
                            {idx === 0 && <span className="trace-badge">{t('admin.latest')}</span>}
                        </div>
                    </div>
                )) : (
                    <div className="no-results">{t('admin.noTraces')}</div>
                )}
            </div>
        </div>
    )

    const renderHealthTab = () => (
        <div className="admin-content-view">
            <div className="content-header">
                <h1>⚙️ {t('admin.systemHealth')}</h1>
                <div className="content-stats">
                    <span className={`stat-chip ${systemStatus?.status === 'operational' ? 'success' : 'warning'}`}>
                        {systemStatus?.status || t('admin.loading')}
                    </span>
                </div>
            </div>

            <div className="health-sections">
                <div className="health-section">
                    <h3>{t('admin.agents')}</h3>
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
                    <h3>{t('admin.connections')}</h3>
                    <div className="health-grid">
                        <div className="health-card">
                            <div className="health-name">{t('admin.ollamaLlm')}</div>
                            <div className={`health-status ${systemStatus?.ollama?.available ? 'active' : 'inactive'}`}>
                                ● {systemStatus?.ollama?.available ? `${t('admin.connected')} (${systemStatus?.ollama?.model})` : t('admin.offline')}
                            </div>
                        </div>
                        <div className="health-card">
                            <div className="health-name">{t('admin.langfuseTracing')}</div>
                            <div className={`health-status ${systemStatus?.observability?.langfuse ? 'active' : ''}`}>
                                ● {systemStatus?.observability?.langfuse ? t('admin.enabled') : t('admin.mockMode')}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="health-section">
                    <h3>{t('admin.proactiveRefillAlerts')}</h3>
                    <div className="health-card wide">
                        <div className="health-name">{alerts.length} {t('admin.customersNeedRefills')}</div>
                        {alerts.slice(0, 5).map((alert, idx) => (
                            <div key={idx} className="alert-row">
                                <span>{alert.customer_name}</span>
                                <span className="alert-med">{alert.medicine_name}</span>
                                <span className={`alert-days ${alert.days_until_refill <= 0 ? 'overdue' : ''}`}>
                                    {alert.days_until_refill <= 0 ? t('admin.overdue') : `${alert.days_until_refill} ${t('admin.days')}`}
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
                    <h1>📊 {t('admin.overview')}</h1>
                    <div className="content-stats">
                        <span className={`stat-chip ${systemStatus?.status === 'operational' ? 'success' : 'warning'}`}>
                            {systemStatus?.status || t('admin.loading')}
                        </span>
                    </div>
                </div>

                <div className="overview-grid">
                    <div className="overview-card">
                        <div className="overview-icon">👥</div>
                        <div className="overview-value">{customers.length}</div>
                        <div className="overview-label">{t('admin.totalPatients')}</div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-icon">📦</div>
                        <div className="overview-value">{orders.length}</div>
                        <div className="overview-label">{t('admin.totalOrders')}</div>
                    </div>
                    <div className="overview-card highlight">
                        <div className="overview-icon">⏳</div>
                        <div className="overview-value">{pendingOrders}</div>
                        <div className="overview-label">{t('admin.pendingOrders')}</div>
                    </div>
                    <div className={`overview-card ${lowStockItems.length > 0 ? 'warning' : ''}`}>
                        <div className="overview-icon">⚠️</div>
                        <div className="overview-value">{lowStockItems.length}</div>
                        <div className="overview-label">{t('admin.lowStockItems')}</div>
                    </div>
                </div>

                <div className="overview-sections">
                    <div className="overview-section">
                        <h3>{t('admin.orderSummary')}</h3>
                        <div className="summary-row">
                            <span>{t('admin.pending')}</span>
                            <span className="summary-value pending">{pendingOrders}</span>
                        </div>
                        <div className="summary-row">
                            <span>{t('admin.confirmed')}</span>
                            <span className="summary-value confirmed">{confirmedOrders}</span>
                        </div>
                        <div className="summary-row">
                            <span>{t('admin.completed')}</span>
                            <span className="summary-value completed">{completedOrders}</span>
                        </div>
                    </div>

                    <div className="overview-section">
                        <h3>{t('admin.systemStatusLabel')}</h3>
                        <div className="summary-row">
                            <span>{t('admin.llmConnection')}</span>
                            <span className={`summary-status ${systemStatus?.ollama?.available ? 'active' : 'inactive'}`}>
                                {systemStatus?.ollama?.available ? t('admin.connected') : t('admin.offline')}
                            </span>
                        </div>
                        <div className="summary-row">
                            <span>{t('admin.observabilityLabel')}</span>
                            <span className="summary-status active">
                                {systemStatus?.observability?.langfuse ? 'Langfuse' : 'Mock'}
                            </span>
                        </div>
                        <div className="summary-row">
                            <span>{t('admin.activeTraces')}</span>
                            <span className="summary-value">{traces.length}</span>
                        </div>
                    </div>

                    <div className="overview-section">
                        <h3>{t('admin.refillAlerts')}</h3>
                        {alerts.length > 0 ? (
                            alerts.slice(0, 4).map((alert, idx) => (
                                <div key={idx} className="summary-row">
                                    <span>{alert.customer_name}</span>
                                    <span className={`summary-status ${alert.days_until_refill <= 0 ? 'warning' : ''}`}>
                                        {alert.days_until_refill <= 0 ? t('admin.overdue') : `${alert.days_until_refill}d`}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">{t('admin.noRefillAlerts')}</div>
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
        { id: 'organization', icon: '🏥', label: t('admin.organization') },
        { id: 'users', icon: '👥', label: t('admin.usersAndRoles') },
        { id: 'safety', icon: '🛡️', label: t('admin.safetyAndPolicy') },
        { id: 'agents', icon: '🤖', label: t('admin.agentConfig') },
        { id: 'observability', icon: '📊', label: t('admin.observabilityLabel') },
        { id: 'inventory', icon: '📦', label: t('admin.inventoryRules') },
        { id: 'compliance', icon: '📋', label: t('admin.compliance') },
        { id: 'danger', icon: '⚠️', label: t('admin.dangerZone') }
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
                            <h2>🏥 {t('admin.organizationSettings')}</h2>
                            <p>{t('admin.configurePharmacy')}</p>
                        </div>
                        <div className="settings-sections">
                            <div className="settings-section">
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.pharmacyName')}</span>
                                        <span className="settings-description">{t('admin.officialBusinessName')}</span>
                                    </div>
                                    <span className="settings-value">PharmAgent Demo Pharmacy</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.addressLabel')}</span>
                                        <span className="settings-description">{t('admin.physicalLocation')}</span>
                                    </div>
                                    <span className="settings-value">123 Health Street, Medical City</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.operatingHours')}</span>
                                        <span className="settings-description">{t('admin.businessHours')}</span>
                                    </div>
                                    <span className="settings-value">9:00 AM - 9:00 PM</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.timezone')}</span>
                                        <span className="settings-description">{t('admin.systemTimezone')}</span>
                                    </div>
                                    <span className="settings-value">Asia/Kolkata (IST)</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.defaultLanguage')}</span>
                                        <span className="settings-description">{t('admin.primaryAiLanguage')}</span>
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
                            <h2>👥 {t('admin.userRoleManagement')}</h2>
                            <p>{t('admin.manageAdminUsers')}</p>
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
                        <p className="settings-note">{t('admin.roleChangeNote')}</p>
                    </div>
                )}

                {settingsSection === 'safety' && (
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2>🛡️ {t('admin.safetyPolicyRules')}</h2>
                            <p>{t('admin.configureSafety')}</p>
                        </div>
                        <div className="settings-sections">
                            <div className="settings-section">
                                <h3>{t('admin.orderPolicies')}</h3>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.maxOrderQuantity')}</span>
                                        <span className="settings-description">{t('admin.maxItemsPerOrder')}</span>
                                    </div>
                                    <span className="settings-value">10 units</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.prescriptionValidation')}</span>
                                        <span className="settings-description">{t('admin.requirePrescription')}</span>
                                    </div>
                                    <span className="settings-badge enabled">{t('admin.enforced')}</span>
                                </div>
                            </div>
                            <div className="settings-section">
                                <h3>{t('admin.safetyEnforcement')}</h3>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.allergyBlocking')}</span>
                                        <span className="settings-description">{t('admin.blockAllergyOrders')}</span>
                                    </div>
                                    <span className="settings-badge enabled">{t('admin.hardBlock')}</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.drugInteractionChecks')}</span>
                                        <span className="settings-description">{t('admin.checkDangerousInteractions')}</span>
                                    </div>
                                    <span className="settings-badge enabled">{t('admin.enabled')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {settingsSection === 'agents' && (
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2>🤖 {t('admin.agentConfiguration')}</h2>
                            <p>{t('admin.controlAgentBehavior')}</p>
                        </div>
                        <div className="settings-sections">
                            <div className="settings-section">
                                <h3>{t('admin.agentStatus')}</h3>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.safetyAgent')}</span>
                                        <span className="settings-description">{t('admin.safetyAgentDesc')}</span>
                                    </div>
                                    <span className="settings-badge enabled">Enabled</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.refillAgent')}</span>
                                        <span className="settings-description">{t('admin.refillAgentDesc')}</span>
                                    </div>
                                    <span className="settings-badge enabled">Enabled</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.visionAgent')}</span>
                                        <span className="settings-description">{t('admin.visionAgentDesc')}</span>
                                    </div>
                                    <span className="settings-badge enabled">Enabled</span>
                                </div>
                            </div>
                            <div className="settings-section">
                                <h3>{t('admin.executionMode')}</h3>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.operationMode')}</span>
                                        <span className="settings-description">{t('admin.howAgentsHandle')}</span>
                                    </div>
                                    <span className="settings-value">Strict (Confirm All)</span>
                                </div>
                            </div>
                        </div>
                        <p className="settings-note">{t('admin.promptEditNote')}</p>
                    </div>
                )}

                {settingsSection === 'observability' && (
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <h2>📊 {t('admin.observabilitySettings')}</h2>
                            <p>{t('admin.configureTracing')}</p>
                        </div>
                        <div className="settings-sections">
                            <div className="settings-section">
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.traceLogging')}</span>
                                        <span className="settings-description">{t('admin.recordAgentDecisions')}</span>
                                    </div>
                                    <span className="settings-badge enabled">{t('admin.enabled')}</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.tracingProvider')}</span>
                                        <span className="settings-description">{t('admin.currentLoggingBackend')}</span>
                                    </div>
                                    <span className="settings-value">{systemStatus?.observability?.langfuse ? 'Langfuse' : t('admin.localMock')}</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.traceRetention')}</span>
                                        <span className="settings-description">{t('admin.howLongTracesKept')}</span>
                                    </div>
                                    <span className="settings-value">30 days</span>
                                </div>
                                <div className="settings-item">
                                    <div className="settings-info">
                                        <span className="settings-label">{t('admin.maskPatientIdentifiers')}</span>
                                        <span className="settings-description">{t('admin.anonymizePii')}</span>
                                    </div>
                                    <span className="settings-badge enabled">{t('admin.enabled')}</span>
                                </div>
                            </div>
                        </div>
                        <button className="secondary-btn">{t('admin.exportTraces')}</button>
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
