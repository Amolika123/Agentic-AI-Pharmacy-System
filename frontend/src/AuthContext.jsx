import { createContext, useContext, useState, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// AUTH CONTEXT - Global authentication state management
// Handles login, logout, registration, and token persistence
// ═══════════════════════════════════════════════════════════════════════════

const AuthContext = createContext(null)

const API_BASE = '/api/v1'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Initialize from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken')
        const storedUser = localStorage.getItem('authUser')

        if (storedToken && storedUser) {
            setToken(storedToken)
            setUser(JSON.parse(storedUser))
        }
        setLoading(false)
    }, [])

    // Login function
    const login = async (email, password) => {
        setError(null)
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            // Handle non-JSON responses safely
            const text = await response.text()
            let data
            try {
                data = text ? JSON.parse(text) : {}
            } catch (parseErr) {
                throw new Error('Server error: Invalid response')
            }

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed')
            }

            // Store in state and localStorage
            setToken(data.access_token)
            setUser(data.user)
            localStorage.setItem('authToken', data.access_token)
            localStorage.setItem('authUser', JSON.stringify(data.user))

            return { success: true, user: data.user }
        } catch (err) {
            setError(err.message)
            return { success: false, error: err.message }
        }
    }

    // Register function (for patients)
    const register = async (formData) => {
        setError(null)
        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            // Handle non-JSON responses safely
            const text = await response.text()
            let data
            try {
                data = text ? JSON.parse(text) : {}
            } catch (parseErr) {
                throw new Error('Server error: Invalid response')
            }

            if (!response.ok) {
                const errorMessage = data.detail || 'Registration failed. Please check your connection or try again.'
                console.error('Registration Failed:', errorMessage)
                throw new Error(errorMessage)
            }

            // Auto-login after registration
            setToken(data.access_token)
            setUser(data.user)
            localStorage.setItem('authToken', data.access_token)
            localStorage.setItem('authUser', JSON.stringify(data.user))

            return { success: true, user: data.user }
        } catch (err) {
            console.error('Registration Error:', err)
            setError(err.message)
            return { success: false, error: err.message }
        }
    }

    // Logout function
    const logout = () => {
        setUser(null)
        setToken(null)
        localStorage.removeItem('authToken')
        localStorage.removeItem('authUser')
    }

    // Check if user is authenticated
    const isAuthenticated = !!token && !!user

    // Role checks
    const isAdmin = isAuthenticated && user?.role === 'admin'
    const isPatient = isAuthenticated && user?.role === 'patient'

    // Get customer ID for patient
    const customerId = user?.customer_id || null

    const value = {
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        isAuthenticated,
        isAdmin,
        isPatient,
        customerId,
        clearError: () => setError(null)
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export default AuthContext
