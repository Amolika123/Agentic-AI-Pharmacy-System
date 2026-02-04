import { useState, useEffect } from 'react'

function AdminDashboard({ systemStatus }) {
    const [inventory, setInventory] = useState([])
    const [alerts, setAlerts] = useState([])
    const [orders, setOrders] = useState([])
    const [traces, setTraces] = useState([])
    const [customers, setCustomers] = useState([])

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

            {/* Customers */}
            <div className="dashboard-card">
                <h2><span className="card-icon">👥</span> Customers</h2>
                <div className="metric-value">{customers.length}</div>
                <div className="metric-label">Registered patients</div>

                <div className="inventory-list" style={{ marginTop: '1rem', maxHeight: '150px', overflow: 'auto' }}>
                    {customers.slice(0, 5).map((cust, idx) => (
                        <div key={idx} className="inventory-item">
                            <div>
                                <div className="inventory-name">{cust.name}</div>
                                <div className="inventory-category">{cust.chronic_conditions || 'No conditions'}</div>
                            </div>
                            <div className="inventory-quantity">{cust.language?.toUpperCase()}</div>
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
        </div>
    )
}

export default AdminDashboard
