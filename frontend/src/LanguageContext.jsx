import { createContext, useContext, useState, useEffect } from 'react'
import { translations, LANGUAGES, getTranslation } from './translations'

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE CONTEXT - Global language state with localStorage persistence
// ═══════════════════════════════════════════════════════════════════════════

const LanguageContext = createContext(null)

const STORAGE_KEY = 'pharmacy_language'

export function LanguageProvider({ children }) {
    // Initialize from localStorage or default to EN
    const [language, setLanguageState] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored && LANGUAGES[stored]) {
                return stored
            }
        } catch (e) {
            console.warn('Failed to read language from localStorage:', e)
        }
        return 'EN'
    })

    // Persist language changes to localStorage
    const setLanguage = (lang) => {
        if (LANGUAGES[lang]) {
            setLanguageState(lang)
            try {
                localStorage.setItem(STORAGE_KEY, lang)
            } catch (e) {
                console.warn('Failed to save language to localStorage:', e)
            }
        }
    }

    // Translation helper function
    const t = (key) => {
        const langTranslations = translations[language] || translations.EN
        return getTranslation(langTranslations, key)
    }

    // Get language code for API calls
    const langCode = LANGUAGES[language]?.code || 'en'

    const contextValue = {
        language,          // Current language key (EN, HI, DE)
        setLanguage,       // Function to change language
        t,                 // Translation function
        langCode,          // Language code for API (en, hi, de)
        LANGUAGES          // Available languages
    }

    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    )
}

// Custom hook to use language context
export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}

export default LanguageContext
