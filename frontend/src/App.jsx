import { useState, useEffect, useRef } from 'react'
import Chat from './components/Chat'
import AdminDashboard from './components/AdminDashboard'

function App() {
    const [activeTab, setActiveTab] = useState('chat')
    const [systemStatus, setSystemStatus] = useState(null)

    useEffect(() => {
        // Fetch system status on load
        fetchSystemStatus()
    }, [])

    const fetchSystemStatus = async () => {
        try {
            const response = await fetch('/api/v1/admin/status')
            const data = await response.json()
            setSystemStatus(data)
        } catch (error) {
            console.error('Failed to fetch system status:', error)
        }
    }

    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="logo">
                    <div className="logo-icon">🤖</div>
                    <span className="logo-text">Agentic AI</span>
                </div>

                <nav className="nav-tabs">
                    <button
                        className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        💬 Chat
                    </button>
                    <button
                        className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
                        onClick={() => setActiveTab('admin')}
                    >
                        📊 Admin
                    </button>
                </nav>

                <div className="status-indicator">
                    <span className="status-dot"></span>
                    <span>System Operational</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
                {activeTab === 'chat' ? (
                    <Chat />
                ) : (
                    <AdminDashboard systemStatus={systemStatus} />
                )}
            </main>
        </div>
    )
}

export default App
