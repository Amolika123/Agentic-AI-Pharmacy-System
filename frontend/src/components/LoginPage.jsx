import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN PAGE - Premium glassmorphism login with Admin/Patient tabs
// Includes form-based patient registration
// ═══════════════════════════════════════════════════════════════════════════

function LoginPage() {
    const { login, register, error, clearError } = useAuth()
    const { t, LANGUAGES, language, setLanguage } = useLanguage()

    const [activeTab, setActiveTab] = useState('patient') // 'patient' or 'admin'
    const [showRegister, setShowRegister] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formErrors, setFormErrors] = useState({})
    const [showPassword, setShowPassword] = useState(false)
    const [showRegPassword, setShowRegPassword] = useState(false)
    const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false)

    // Login form state
    const [loginForm, setLoginForm] = useState({ email: '', password: '' })

    // Registration form state
    const [registerForm, setRegisterForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        date_of_birth: '',
        address: '',
        language: 'en',
        chronic_conditions: '',
        allergies: ''
    })

    // Validation patterns
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phonePattern = /^\+?[\d\s-]{10,}$/

    const validateLoginForm = () => {
        const errors = {}
        if (!loginForm.email) errors.email = 'Email is required'
        else if (!emailPattern.test(loginForm.email)) errors.email = 'Invalid email format'
        if (!loginForm.password) errors.password = 'Password is required'
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const validateRegisterForm = () => {
        const errors = {}
        if (!registerForm.name) errors.name = 'Name is required'
        if (!registerForm.email) errors.email = 'Email is required'
        else if (!emailPattern.test(registerForm.email)) errors.email = 'Invalid email format'
        if (!registerForm.password) errors.password = 'Password is required'
        else if (registerForm.password.length < 6) errors.password = 'Password must be at least 6 characters'
        if (registerForm.password !== registerForm.confirmPassword) errors.confirmPassword = 'Passwords do not match'
        if (!registerForm.phone) errors.phone = 'Phone is required'
        else if (!phonePattern.test(registerForm.phone)) errors.phone = 'Invalid phone format'
        if (!registerForm.date_of_birth) errors.date_of_birth = 'Date of birth is required'
        if (!registerForm.address) errors.address = 'Address is required'
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        clearError()
        if (!validateLoginForm()) return

        setIsLoading(true)
        const result = await login(loginForm.email, loginForm.password)
        setIsLoading(false)

        if (!result.success) {
            setFormErrors({ general: result.error })
        }
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        clearError()
        if (!validateRegisterForm()) return

        setIsLoading(true)
        const { confirmPassword, ...formData } = registerForm
        const result = await register(formData)
        setIsLoading(false)

        if (!result.success) {
            setFormErrors({ general: result.error })
        }
    }

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className={formErrors.email ? 'error' : ''}
                    autoComplete="email"
                />
                {formErrors.email && <span className="error-text">{formErrors.email}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <div className="password-input-wrapper">
                    <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className={formErrors.password ? 'error' : ''}
                        autoComplete="current-password"
                    />
                    <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                </div>
                {formErrors.password && <span className="error-text">{formErrors.password}</span>}
            </div>

            {formErrors.general && (
                <div className="error-banner">{formErrors.general}</div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? (
                    <span className="loading-spinner"></span>
                ) : (
                    `Login as ${activeTab === 'admin' ? 'Admin' : 'Patient'}`
                )}
            </button>

            {activeTab === 'patient' && (
                <p className="auth-switch-text">
                    Don't have an account?{' '}
                    <button type="button" className="link-btn" onClick={() => { setShowRegister(true); setFormErrors({}) }}>
                        Register here
                    </button>
                </p>
            )}
        </form>
    )

    const renderRegisterForm = () => (
        <form onSubmit={handleRegister} className="auth-form register-form">
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="reg-name">Full Name *</label>
                    <input
                        id="reg-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        className={formErrors.name ? 'error' : ''}
                    />
                    {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="reg-email">Email *</label>
                    <input
                        id="reg-email"
                        type="email"
                        placeholder="Enter your email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className={formErrors.email ? 'error' : ''}
                    />
                    {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="reg-password">Password *</label>
                    <div className="password-input-wrapper">
                        <input
                            id="reg-password"
                            type={showRegPassword ? 'text' : 'password'}
                            placeholder="Create a password"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                            className={formErrors.password ? 'error' : ''}
                        />
                        <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            tabIndex={-1}
                        >
                            {showRegPassword ? '🙈' : '👁️'}
                        </button>
                    </div>
                    {formErrors.password && <span className="error-text">{formErrors.password}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="reg-confirm-password">Confirm Password *</label>
                    <div className="password-input-wrapper">
                        <input
                            id="reg-confirm-password"
                            type={showRegConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your password"
                            value={registerForm.confirmPassword}
                            onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                            className={formErrors.confirmPassword ? 'error' : ''}
                        />
                        <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                            tabIndex={-1}
                        >
                            {showRegConfirmPassword ? '🙈' : '👁️'}
                        </button>
                    </div>
                    {formErrors.confirmPassword && <span className="error-text">{formErrors.confirmPassword}</span>}
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="reg-phone">Phone Number *</label>
                    <input
                        id="reg-phone"
                        type="tel"
                        placeholder="+91-1234567890"
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        className={formErrors.phone ? 'error' : ''}
                    />
                    {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="reg-dob">Date of Birth *</label>
                    <input
                        id="reg-dob"
                        type="date"
                        value={registerForm.date_of_birth}
                        onChange={(e) => setRegisterForm({ ...registerForm, date_of_birth: e.target.value })}
                        className={formErrors.date_of_birth ? 'error' : ''}
                    />
                    {formErrors.date_of_birth && <span className="error-text">{formErrors.date_of_birth}</span>}
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="reg-address">Address *</label>
                <input
                    id="reg-address"
                    type="text"
                    placeholder="Enter your full address"
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                    className={formErrors.address ? 'error' : ''}
                />
                {formErrors.address && <span className="error-text">{formErrors.address}</span>}
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="reg-language">Preferred Language</label>
                    <select
                        id="reg-language"
                        value={registerForm.language}
                        onChange={(e) => setRegisterForm({ ...registerForm, language: e.target.value })}
                    >
                        <option value="en">English</option>
                        <option value="hi">हिंदी</option>
                        <option value="de">Deutsch</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="reg-chronic">Chronic Conditions</label>
                    <input
                        id="reg-chronic"
                        type="text"
                        placeholder="e.g., Diabetes, Hypertension"
                        value={registerForm.chronic_conditions}
                        onChange={(e) => setRegisterForm({ ...registerForm, chronic_conditions: e.target.value })}
                    />
                    <span className="hint-text">Comma-separated list</span>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="reg-allergies">Allergies</label>
                <input
                    id="reg-allergies"
                    type="text"
                    placeholder="e.g., Penicillin, Aspirin"
                    value={registerForm.allergies}
                    onChange={(e) => setRegisterForm({ ...registerForm, allergies: e.target.value })}
                />
                <span className="hint-text">Comma-separated list (important for drug safety checks)</span>
            </div>

            {formErrors.general && (
                <div className="error-banner">{formErrors.general}</div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? (
                    <span className="loading-spinner"></span>
                ) : (
                    'Create Account'
                )}
            </button>

            <p className="auth-switch-text">
                Already have an account?{' '}
                <button type="button" className="link-btn" onClick={() => { setShowRegister(false); setFormErrors({}) }}>
                    Login here
                </button>
            </p>
        </form>
    )

    return (
        <div className="login-page">
            {/* Background decoration */}
            <div className="login-bg-decoration">
                <div className="bg-circle bg-circle-1"></div>
                <div className="bg-circle bg-circle-2"></div>
                <div className="bg-circle bg-circle-3"></div>
            </div>

            {/* Language toggle */}
            <div className="login-language-toggle">
                {Object.entries(LANGUAGES).map(([key, lang]) => (
                    <button
                        key={key}
                        className={`lang-mini-btn ${language === key ? 'active' : ''}`}
                        onClick={() => setLanguage(key)}
                    >
                        {lang.native}
                    </button>
                ))}
            </div>

            <div className="login-container">
                {/* Logo and Title */}
                <div className="login-header">
                    <div className="login-logo">
                        <span className="logo-icon-large">🤖</span>
                        <span className="logo-text-large">AI Pharmacy</span>
                    </div>
                    <p className="login-subtitle">
                        {showRegister ? 'Create your patient account' : 'Welcome back! Please login to continue'}
                    </p>
                </div>

                {/* Main Card */}
                <div className="login-card">
                    {!showRegister && (
                        <>
                            {/* Tab Navigation */}
                            <div className="login-tabs">
                                <button
                                    className={`login-tab ${activeTab === 'patient' ? 'active' : ''}`}
                                    onClick={() => { setActiveTab('patient'); setFormErrors({}); clearError() }}
                                >
                                    <span className="tab-icon">👤</span>
                                    Patient
                                </button>
                                <button
                                    className={`login-tab ${activeTab === 'admin' ? 'active' : ''}`}
                                    onClick={() => { setActiveTab('admin'); setFormErrors({}); clearError() }}
                                >
                                    <span className="tab-icon">🔐</span>
                                    Admin
                                </button>
                            </div>

                            {/* Tab indicator */}
                            <div className="tab-indicator-wrapper">
                                <div className={`tab-indicator ${activeTab === 'admin' ? 'right' : 'left'}`}></div>
                            </div>
                        </>
                    )}

                    {showRegister ? (
                        <div className="register-header">
                            <button className="back-btn" onClick={() => { setShowRegister(false); setFormErrors({}) }}>
                                ← Back to Login
                            </button>
                            <h2>Patient Registration</h2>
                        </div>
                    ) : null}

                    {/* Form Content */}
                    <div className="login-form-wrapper">
                        {showRegister ? renderRegisterForm() : renderLoginForm()}
                    </div>
                </div>

                {/* Footer */}
                <div className="login-footer">
                    <p>Secured by AI-powered healthcare technology</p>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
