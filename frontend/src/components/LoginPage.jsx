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
                <label htmlFor="login-email">{t('login.email')}</label>
                <input
                    id="login-email"
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className={formErrors.email ? 'error' : ''}
                    autoComplete="email"
                />
                {formErrors.email && <span className="error-text">{formErrors.email}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="login-password">{t('login.password')}</label>
                <div className="password-input-wrapper">
                    <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('login.passwordPlaceholder')}
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
                    activeTab === 'admin' ? t('login.loginAsAdmin') : t('login.loginAsPatient')
                )}
            </button>

            {activeTab === 'patient' && (
                <p className="auth-switch-text">
                    {t('login.noAccount')}{' '}
                    <button type="button" className="link-btn" onClick={() => { setShowRegister(true); setFormErrors({}) }}>
                        {t('login.registerHere')}
                    </button>
                </p>
            )}
        </form>
    )

    const renderRegisterForm = () => (
        <form onSubmit={handleRegister} className="auth-form register-form">
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="reg-name">{t('login.fullName')} *</label>
                    <input
                        id="reg-name"
                        type="text"
                        placeholder={t('login.fullNamePlaceholder')}
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        className={formErrors.name ? 'error' : ''}
                    />
                    {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="reg-email">{t('login.email')} *</label>
                    <input
                        id="reg-email"
                        type="email"
                        placeholder={t('login.emailPlaceholder')}
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className={formErrors.email ? 'error' : ''}
                    />
                    {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="reg-password">{t('login.password')} *</label>
                    <div className="password-input-wrapper">
                        <input
                            id="reg-password"
                            type={showRegPassword ? 'text' : 'password'}
                            placeholder={t('login.createPasswordPlaceholder')}
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
                    <label htmlFor="reg-confirm-password">{t('login.confirmPassword')} *</label>
                    <div className="password-input-wrapper">
                        <input
                            id="reg-confirm-password"
                            type={showRegConfirmPassword ? 'text' : 'password'}
                            placeholder={t('login.confirmPasswordPlaceholder')}
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
                    <label htmlFor="reg-phone">{t('login.phone')} *</label>
                    <input
                        id="reg-phone"
                        type="tel"
                        placeholder={t('login.phonePlaceholder')}
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        className={formErrors.phone ? 'error' : ''}
                    />
                    {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="reg-dob">{t('login.dob')} *</label>
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
                <label htmlFor="reg-address">{t('login.address')} *</label>
                <input
                    id="reg-address"
                    type="text"
                    placeholder={t('login.addressPlaceholder')}
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                    className={formErrors.address ? 'error' : ''}
                />
                {formErrors.address && <span className="error-text">{formErrors.address}</span>}
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="reg-language">{t('login.preferredLanguage')}</label>
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
                    <label htmlFor="reg-chronic">{t('login.chronicConditions')}</label>
                    <input
                        id="reg-chronic"
                        type="text"
                        placeholder={t('login.chronicPlaceholder')}
                        value={registerForm.chronic_conditions}
                        onChange={(e) => setRegisterForm({ ...registerForm, chronic_conditions: e.target.value })}
                    />
                    <span className="hint-text">{t('login.commaSeparated')}</span>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="reg-allergies">{t('login.allergies')}</label>
                <input
                    id="reg-allergies"
                    type="text"
                    placeholder={t('login.allergiesPlaceholder')}
                    value={registerForm.allergies}
                    onChange={(e) => setRegisterForm({ ...registerForm, allergies: e.target.value })}
                />
                <span className="hint-text">{t('login.allergiesHint')}</span>
            </div>

            {formErrors.general && (
                <div className="error-banner">{formErrors.general}</div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? (
                    <span className="loading-spinner"></span>
                ) : (
                    t('login.createAccount')
                )}
            </button>

            <p className="auth-switch-text">
                {t('login.haveAccount')}{' '}
                <button type="button" className="link-btn" onClick={() => { setShowRegister(false); setFormErrors({}) }}>
                    {t('login.loginHere')}
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
                <div className="login-header">
                    <div className="login-logo">
                        <span className="logo-icon-large">🤖</span>
                        <span className="logo-text-large">{t('login.title')}</span>
                    </div>
                    <p className="login-subtitle">
                        {showRegister ? t('login.registerSubtitle') : t('login.subtitle')}
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
                                    {t('login.patient')}
                                </button>
                                <button
                                    className={`login-tab ${activeTab === 'admin' ? 'active' : ''}`}
                                    onClick={() => { setActiveTab('admin'); setFormErrors({}); clearError() }}
                                >
                                    <span className="tab-icon">🔐</span>
                                    {t('login.admin')}
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
                                {t('login.backToLogin')}
                            </button>
                            <h2>{t('login.patientRegistration')}</h2>
                        </div>
                    ) : null}

                    {/* Form Content */}
                    <div className="login-form-wrapper">
                        {showRegister ? renderRegisterForm() : renderLoginForm()}
                    </div>
                </div>

                {/* Footer */}
                <div className="login-footer">
                    <p>{t('login.footer')}</p>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
