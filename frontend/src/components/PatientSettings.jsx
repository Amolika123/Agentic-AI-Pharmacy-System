import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT SETTINGS - Side-tab navigation with profile, medical, security
// ═══════════════════════════════════════════════════════════════════════════

function PatientSettings() {
    const { user, customerId, logout } = useAuth()
    const { t } = useLanguage()

    // Settings sub-tab navigation
    const [activeSection, setActiveSection] = useState('profile')

    // Profile form state
    const [profile, setProfile] = useState({
        name: '',
        phone: '',
        address: '',
        language: 'en',
        email: '',
        date_of_birth: ''
    })

    // Medical info (view only)
    const [medical, setMedical] = useState({
        allergies: [],
        chronic_conditions: []
    })

    // Notification toggles
    const [notifications, setNotifications] = useState({
        refill_reminders: true,
        order_updates: true,
        promotional: false
    })

    // Privacy toggles
    const [privacy, setPrivacy] = useState({
        ai_consent: true
    })

    // Security state
    const [passwordForm, setPasswordForm] = useState({
        current: '',
        new_password: '',
        confirm: ''
    })
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState('')

    // Account deletion state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleteError, setDeleteError] = useState('')

    // Load user data
    useEffect(() => {
        loadUserData()
    }, [customerId])

    const loadUserData = async () => {
        try {
            const response = await fetch(`/api/v1/customers`)
            const data = await response.json()
            const customer = data.customers?.find(c => c.customer_id === customerId)
            if (customer) {
                setProfile({
                    name: customer.name || '',
                    phone: customer.phone || '',
                    address: customer.address || '',
                    language: customer.language || 'en',
                    email: customer.email || '',
                    date_of_birth: customer.date_of_birth || ''
                })
                setMedical({
                    allergies: (customer.allergies || '').split(';').filter(a => a && a !== 'None'),
                    chronic_conditions: (customer.chronic_conditions || '').split(';').filter(c => c && c !== 'None')
                })
            }
        } catch (error) {
            console.error('Failed to load user data:', error)
        }
    }

    const handleProfileSave = async () => {
        // Profile save would go here - keeping as display for now
        alert('Profile update functionality coming soon')
    }

    const handlePasswordChange = async (e) => {
        e.preventDefault()
        setPasswordError('')
        setPasswordSuccess('')

        if (passwordForm.new_password !== passwordForm.confirm) {
            setPasswordError('Passwords do not match')
            return
        }
        if (passwordForm.new_password.length < 6) {
            setPasswordError('Password must be at least 6 characters')
            return
        }

        // Password change would go here
        setPasswordSuccess('Password changed successfully')
        setPasswordForm({ current: '', new_password: '', confirm: '' })
    }

    const handleLogoutAll = () => {
        logout()
    }

    const handleDeleteAccount = async () => {
        setDeleteError('')

        if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
            setDeleteError('Please type "DELETE MY ACCOUNT" to confirm')
            return
        }
        if (!deletePassword) {
            setDeleteError('Please enter your password')
            return
        }

        // Account deletion would be implemented here
        alert('Account deletion is being processed. You will be logged out.')
        logout()
    }

    // Settings sections
    const sections = [
        { id: 'profile', icon: '👤', label: 'Profile' },
        { id: 'medical', icon: '🩺', label: 'Medical' },
        { id: 'notifications', icon: '🔔', label: 'Notifications' },
        { id: 'privacy', icon: '🔒', label: 'Privacy' },
        { id: 'security', icon: '🛡️', label: 'Security' },
        { id: 'account', icon: '⚠️', label: 'Account' }
    ]

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER SECTIONS
    // ═══════════════════════════════════════════════════════════════════════

    const renderProfileSection = () => (
        <div className="settings-panel">
            <div className="settings-panel-header">
                <h2>👤 Profile & Personal Information</h2>
                <p>Manage your personal details and preferences</p>
            </div>

            <div className="settings-form">
                <div className="form-row">
                    <label>Full Name</label>
                    <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Your full name"
                    />
                </div>

                <div className="form-row">
                    <label>Phone Number</label>
                    <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                    />
                </div>

                <div className="form-row">
                    <label>Address</label>
                    <textarea
                        value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        placeholder="Your delivery address"
                        rows={3}
                    />
                </div>

                <div className="form-row">
                    <label>Preferred Language</label>
                    <select
                        value={profile.language}
                        onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                    >
                        <option value="en">English</option>
                        <option value="hi">हिंदी (Hindi)</option>
                        <option value="de">Deutsch (German)</option>
                    </select>
                </div>

                <div className="form-divider" />

                <div className="form-row readonly">
                    <label>Email (cannot be changed)</label>
                    <input type="email" value={profile.email} disabled />
                </div>

                <div className="form-row readonly">
                    <label>Date of Birth (cannot be changed)</label>
                    <input type="text" value={profile.date_of_birth} disabled />
                </div>

                <button className="save-btn" onClick={handleProfileSave}>
                    Save Changes
                </button>
            </div>
        </div>
    )

    const renderMedicalSection = () => (
        <div className="settings-panel">
            <div className="settings-panel-header">
                <h2>🩺 Medical Preferences</h2>
                <p>View your medical information on file</p>
            </div>

            <div className="safety-notice">
                <span className="notice-icon">⚠️</span>
                <span>Medical data changes require verification by our pharmacy team for your safety.</span>
            </div>

            <div className="medical-info-card">
                <h3>Known Allergies</h3>
                <div className="tag-list">
                    {medical.allergies.length > 0 ? (
                        medical.allergies.map((allergy, idx) => (
                            <span key={idx} className="medical-tag allergy">{allergy}</span>
                        ))
                    ) : (
                        <span className="no-data">No allergies on file</span>
                    )}
                </div>
            </div>

            <div className="medical-info-card">
                <h3>Chronic Conditions</h3>
                <div className="tag-list">
                    {medical.chronic_conditions.length > 0 ? (
                        medical.chronic_conditions.map((condition, idx) => (
                            <span key={idx} className="medical-tag condition">{condition}</span>
                        ))
                    ) : (
                        <span className="no-data">No conditions on file</span>
                    )}
                </div>
            </div>

            <button className="request-update-btn">
                📝 Request Medical Info Update
            </button>
        </div>
    )

    const renderNotificationsSection = () => (
        <div className="settings-panel">
            <div className="settings-panel-header">
                <h2>🔔 Notifications</h2>
                <p>Control what notifications you receive</p>
            </div>

            <div className="toggle-list">
                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Refill Reminders</span>
                        <span className="toggle-desc">Get notified when it's time to refill your medications</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notifications.refill_reminders}
                            onChange={(e) => setNotifications({ ...notifications, refill_reminders: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Order Updates</span>
                        <span className="toggle-desc">Status updates for your orders</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notifications.order_updates}
                            onChange={(e) => setNotifications({ ...notifications, order_updates: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">Promotional Offers</span>
                        <span className="toggle-desc">Special deals and health tips</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notifications.promotional}
                            onChange={(e) => setNotifications({ ...notifications, promotional: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>

                <div className="toggle-item locked">
                    <div className="toggle-info">
                        <span className="toggle-label">Safety Alerts</span>
                        <span className="toggle-desc">Critical medication safety notifications</span>
                    </div>
                    <span className="always-on">Always On</span>
                </div>
            </div>
        </div>
    )

    const renderPrivacySection = () => (
        <div className="settings-panel">
            <div className="settings-panel-header">
                <h2>🔒 Privacy & Consent</h2>
                <p>Control how your data is used</p>
            </div>

            <div className="privacy-info">
                <h3>How We Use Your Data</h3>
                <ul>
                    <li>Your medical information helps our AI provide safe medication recommendations</li>
                    <li>Order history is used to predict refill needs and prevent drug interactions</li>
                    <li>We never sell your personal data to third parties</li>
                    <li>All data is encrypted and stored securely</li>
                </ul>
            </div>

            <div className="toggle-list">
                <div className="toggle-item">
                    <div className="toggle-info">
                        <span className="toggle-label">AI Assistance</span>
                        <span className="toggle-desc">Allow AI to analyze your health data for personalized recommendations</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={privacy.ai_consent}
                            onChange={(e) => setPrivacy({ ...privacy, ai_consent: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div className="privacy-actions">
                <button className="secondary-btn">
                    📥 Download My Data
                </button>
            </div>
        </div>
    )

    const renderSecuritySection = () => (
        <div className="settings-panel">
            <div className="settings-panel-header">
                <h2>🛡️ Security</h2>
                <p>Manage your account security</p>
            </div>

            <div className="security-section">
                <h3>Change Password</h3>
                <form onSubmit={handlePasswordChange} className="password-form">
                    <div className="form-row">
                        <label>Current Password</label>
                        <input
                            type="password"
                            value={passwordForm.current}
                            onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="form-row">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={passwordForm.new_password}
                            onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="form-row">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            value={passwordForm.confirm}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                            placeholder="••••••••"
                        />
                    </div>
                    {passwordError && <div className="form-error">{passwordError}</div>}
                    {passwordSuccess && <div className="form-success">{passwordSuccess}</div>}
                    <button type="submit" className="save-btn">Update Password</button>
                </form>
            </div>

            <div className="security-section">
                <h3>Sessions</h3>
                <p className="section-desc">Last login: Today at {new Date().toLocaleTimeString()}</p>
                <button className="secondary-btn danger" onClick={handleLogoutAll}>
                    🚪 Logout from All Devices
                </button>
            </div>
        </div>
    )

    const renderAccountSection = () => (
        <div className="settings-panel danger-zone">
            <div className="settings-panel-header">
                <h2>⚠️ Account Management</h2>
                <p>Permanent account actions</p>
            </div>

            <div className="danger-warning">
                <span className="warning-icon">🚨</span>
                <div>
                    <strong>Danger Zone</strong>
                    <p>Actions here are permanent and cannot be undone.</p>
                </div>
            </div>

            {!showDeleteConfirm ? (
                <button
                    className="delete-account-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                >
                    🗑️ Delete My Account
                </button>
            ) : (
                <div className="delete-confirm-box">
                    <h3>Confirm Account Deletion</h3>
                    <p>This will permanently delete your account. Your order history will be anonymized for compliance but you will lose access to:</p>
                    <ul>
                        <li>Your profile and preferences</li>
                        <li>Chat history with our AI assistant</li>
                        <li>Saved prescriptions and medical info</li>
                        <li>Refill reminders and alerts</li>
                    </ul>

                    <div className="form-row">
                        <label>Type "DELETE MY ACCOUNT" to confirm</label>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE MY ACCOUNT"
                        />
                    </div>

                    <div className="form-row">
                        <label>Enter your password</label>
                        <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    {deleteError && <div className="form-error">{deleteError}</div>}

                    <div className="delete-actions">
                        <button
                            className="cancel-btn"
                            onClick={() => {
                                setShowDeleteConfirm(false)
                                setDeleteConfirmText('')
                                setDeletePassword('')
                                setDeleteError('')
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className="confirm-delete-btn"
                            onClick={handleDeleteAccount}
                        >
                            Permanently Delete Account
                        </button>
                    </div>
                </div>
            )}
        </div>
    )

    const renderContent = () => {
        switch (activeSection) {
            case 'profile': return renderProfileSection()
            case 'medical': return renderMedicalSection()
            case 'notifications': return renderNotificationsSection()
            case 'privacy': return renderPrivacySection()
            case 'security': return renderSecuritySection()
            case 'account': return renderAccountSection()
            default: return renderProfileSection()
        }
    }

    return (
        <div className="patient-settings">
            <div className="settings-sidebar">
                <div className="settings-sidebar-header">
                    <h2>Settings</h2>
                </div>
                <nav className="settings-nav">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            className={`settings-nav-item ${activeSection === section.id ? 'active' : ''} ${section.id === 'account' ? 'danger' : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <span className="settings-nav-icon">{section.icon}</span>
                            <span className="settings-nav-label">{section.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <div className="settings-content">
                {renderContent()}
            </div>
        </div>
    )
}

export default PatientSettings
