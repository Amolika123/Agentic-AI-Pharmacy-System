// ═══════════════════════════════════════════════════════════════════════════
// CENTRALIZED TRANSLATION DICTIONARY
// Global language strings for EN, HI, DE
// ═══════════════════════════════════════════════════════════════════════════

export const LANGUAGES = {
    EN: { code: 'en', label: 'English', native: 'EN' },
    HI: { code: 'hi', label: 'Hindi', native: 'HI' },
    DE: { code: 'de', label: 'German', native: 'DE' }
}

export const translations = {
    EN: {
        // App Header & Navigation
        app: {
            title: 'Agentic Pharmacy',
            patient: '🏥 Patient',
            admin: '📊 Admin',
            online: 'Online',
            offline: 'Offline'
        },
        nav: {
            chat: 'Chat',
            catalog: 'Catalog',
            cart: 'Cart'
        },

        // Chat Component
        chat: {
            title: '🏥 Smart Pharmacy',
            welcome: '👋 Welcome to our Smart Pharmacy!\n\nI\'m your AI pharmacist assistant. I can help you:\n• Order medicines (just tell me what you need)\n• Check medicine availability\n• Refill your prescriptions\n• Answer questions about your medications\n\nHow can I help you today?',
            placeholder: 'Type your medicine order or question...',
            languageChanged: '🌐 Language set to English.',
            quickActions: ["I need Paracetamol", "Check if Ibuprofen is available", "Refill my prescription", "Cancel my order"],
            cancelConfirm: 'Cancel your order?',
            cancelYes: 'Yes, cancel my order',
            cancelNo: 'No, keep my order',
            confirmOrder: 'Confirm your order?',
            confirmYes: '✓ Yes, Place Order',
            confirmCancel: '✗ Cancel',
            uploadedPrescription: '📄 Uploaded Prescription',
            connectionError: '⚠️ Cannot connect. Ensure backend is running.',
            uploadError: '⚠️ Failed to upload. Please check backend connection.',
            voiceInput: 'Voice input',
            uploadPrescription: 'Upload Prescription'
        },

        // Chat Sidebar
        sidebar: {
            systemStatus: '⚙️ System Status',
            ollama: 'Ollama',
            connected: 'Connected',
            apiKeys: 'API Keys',
            notRequired: 'Not Required',
            langfuse: 'Langfuse',
            enabled: 'Enabled',
            mockMode: 'Mock Mode',
            agents: 'Agents',
            agentsActive: '5 Active',
            quickReference: '💊 Quick Reference',
            inStock: 'In Stock',
            features: '✨ Features',
            featuresList: [
                '🗣️ Voice & Text Orders',
                '📋 Prescription Verification',
                '⚠️ Allergy Warnings',
                '🔄 Proactive Refill Alerts',
                '🔍 Full Observability'
            ],
            refillAlerts: '🔔 Refill Alerts',
            runningLow: 'Running low',
            daysLeft: 'days left',
            refillNow: 'Refill Now'
        },

        // Catalog Component
        catalog: {
            title: 'Medicine Catalog',
            search: 'Search medicines...',
            addToCart: 'Add to Cart',
            adding: 'Adding...',
            inCart: 'In Cart',
            inStock: 'In Stock',
            outOfStock: 'Out of Stock',
            lowStock: 'left',
            prescription: 'Rx Required',
            details: 'View Details',
            close: 'Close',
            noResults: 'No medicines found',
            loading: 'Loading catalog...',
            prescriptionWarning: 'This medicine requires a valid prescription. You\'ll need to upload one during checkout.',
            manufacturer: 'Manufacturer',
            category: 'Category',
            dosageForm: 'Dosage Form',
            strength: 'Strength',
            stock: 'Stock',
            price: 'Price'
        },

        // Category Filters
        categories: {
            all: 'All',
            painRelief: 'Pain Relief',
            antibiotics: 'Antibiotics',
            vitamins: 'Vitamins',
            cardiac: 'Cardiac',
            diabetes: 'Diabetes',
            gastro: 'Gastro',
            respiratory: 'Respiratory'
        },

        // Cart Component
        cart: {
            title: 'Shopping Cart',
            empty: 'Your cart is empty',
            emptyDesc: 'Browse the catalog and add medicines to your cart',
            quantity: 'Qty',
            remove: 'Remove',
            subtotal: 'Subtotal',
            total: 'Total',
            checkout: 'Proceed to Checkout',
            processing: 'Processing...',
            prescriptionNote: '📋 Some items require prescription. Upload during checkout.',
            loginRequired: 'Please log in to checkout',
            items: 'items',
            per: 'per',
            checkoutFailed: 'Checkout failed. Please try again.'
        },

        // Admin Dashboard
        admin: {
            systemStatus: 'System Status',
            operational: 'operational',
            loading: 'Loading...',
            refillAlerts: 'Proactive Refill Alerts',
            customersNeedRefills: 'Customers need refills',
            overdue: 'Overdue',
            days: 'days',
            noUrgentRefills: 'No urgent refills at this time',
            inventory: 'Medicine Inventory',
            totalMedicines: 'Total medicines',
            lowStock: 'Low Stock',
            rxRequired: 'Rx Required',
            recentOrders: 'Recent Orders',
            totalOrders: 'Total orders',
            customers: 'Customers',
            registeredPatients: 'Registered patients',
            noConditions: 'No conditions',
            observability: 'Observability (Traces)',
            traceLogs: 'Trace logs captured',
            decisions: 'decisions',
            openLangfuse: 'Open Langfuse →'
        },

        // Registration Component
        registration: {
            title: 'Create Account',
            subtitle: 'Chat with our AI to register',
            startBtn: 'Start Registration',
            placeholder: 'Type your answer...',
            switchToLogin: 'Already have an account?',
            login: 'Login',
            starting: 'Starting...',
            connectionError: '⚠️ Unable to start registration. Please check if the backend is running.',
            stepError: '⚠️ Connection error. Please try again.',
            benefits: [
                '💬 Conversational ordering via chat',
                '🛒 Browse our medicine catalog',
                '🔔 Personalized refill reminders',
                '📋 Prescription upload & analysis'
            ]
        },

        // Login Page
        login: {
            title: 'AI Pharmacy',
            subtitle: 'Welcome back! Please login to continue',
            registerSubtitle: 'Create your patient account',
            email: 'Email',
            emailPlaceholder: 'Enter your email',
            password: 'Password',
            passwordPlaceholder: 'Enter your password',
            loginAsPatient: 'Login as Patient',
            loginAsAdmin: 'Login as Admin',
            noAccount: "Don't have an account?",
            registerHere: 'Register here',
            patient: 'Patient',
            admin: 'Admin',
            backToLogin: '← Back to Login',
            patientRegistration: 'Patient Registration',
            fullName: 'Full Name',
            fullNamePlaceholder: 'Enter your full name',
            phone: 'Phone Number',
            phonePlaceholder: '+91-1234567890',
            dob: 'Date of Birth',
            address: 'Address',
            addressPlaceholder: 'Enter your full address',
            preferredLanguage: 'Preferred Language',
            chronicConditions: 'Chronic Conditions',
            chronicPlaceholder: 'e.g., Diabetes, Hypertension',
            commaSeparated: 'Comma-separated list',
            allergies: 'Allergies',
            allergiesPlaceholder: 'e.g., Penicillin, Aspirin',
            allergiesHint: 'Comma-separated list (important for drug safety checks)',
            createAccount: 'Create Account',
            haveAccount: 'Already have an account?',
            loginHere: 'Login here',
            footer: 'Secured by AI-powered healthcare technology',
            confirmPassword: 'Confirm Password',
            confirmPasswordPlaceholder: 'Confirm your password',
            createPasswordPlaceholder: 'Create a password'
        }
    },

    HI: {
        // App Header & Navigation
        app: {
            title: 'एजेंटिक फार्मेसी',
            patient: '🏥 मरीज़',
            admin: '📊 एडमिन',
            online: 'ऑनलाइन',
            offline: 'ऑफ़लाइन'
        },
        nav: {
            chat: 'चैट',
            catalog: 'कैटलॉग',
            cart: 'कार्ट'
        },

        // Chat Component
        chat: {
            title: '🏥 स्मार्ट फार्मेसी',
            welcome: '👋 हमारी स्मार्ट फार्मेसी में आपका स्वागत है!\n\nमैं आपका AI फार्मासिस्ट सहायक हूँ। मैं आपकी मदद कर सकता हूँ:\n• दवाइयाँ ऑर्डर करें\n• दवाई की उपलब्धता जाँचें\n• प्रिस्क्रिप्शन रिफिल करें\n• दवाओं के बारे में सवाल पूछें\n\nआज मैं आपकी कैसे मदद कर सकता हूँ?',
            placeholder: 'अपनी दवाई का ऑर्डर या प्रश्न लिखें...',
            languageChanged: '🌐 भाषा हिंदी में बदल दी गई है।',
            quickActions: ["मुझे पैरासिटामोल चाहिए", "आइबुप्रोफेन उपलब्ध है?", "मेरी दवाई रिफिल करें", "मेरा ऑर्डर रद्द करें"],
            cancelConfirm: 'ऑर्डर रद्द करें?',
            cancelYes: 'हाँ, ऑर्डर रद्द करें',
            cancelNo: 'नहीं, ऑर्डर रखें',
            confirmOrder: 'ऑर्डर की पुष्टि करें?',
            confirmYes: '✓ हाँ, ऑर्डर करें',
            confirmCancel: '✗ रद्द करें',
            uploadedPrescription: '📄 प्रिस्क्रिप्शन अपलोड किया',
            connectionError: '⚠️ कनेक्ट नहीं हो पा रहा। बैकएंड चल रहा है या नहीं जाँचें।',
            uploadError: '⚠️ अपलोड विफल। बैकएंड कनेक्शन जाँचें।',
            voiceInput: 'वॉइस इनपुट',
            uploadPrescription: 'प्रिस्क्रिप्शन अपलोड करें'
        },

        // Chat Sidebar
        sidebar: {
            systemStatus: '⚙️ सिस्टम स्थिति',
            ollama: 'Ollama',
            connected: 'कनेक्टेड',
            apiKeys: 'API Keys',
            notRequired: 'आवश्यक नहीं',
            langfuse: 'Langfuse',
            enabled: 'सक्षम',
            mockMode: 'मॉक मोड',
            agents: 'एजेंट्स',
            agentsActive: '5 सक्रिय',
            quickReference: '💊 त्वरित संदर्भ',
            inStock: 'स्टॉक में',
            features: '✨ सुविधाएं',
            featuresList: [
                '🗣️ वॉइस और टेक्स्ट ऑर्डर',
                '📋 प्रिस्क्रिप्शन सत्यापन',
                '⚠️ एलर्जी चेतावनी',
                '🔄 रिफिल अलर्ट',
                '🔍 पूर्ण निगरानी'
            ],
            refillAlerts: '🔔 रिफिल अलर्ट',
            runningLow: 'कम हो रहा है',
            daysLeft: 'दिन बाकी',
            refillNow: 'अभी रिफिल करें'
        },

        // Catalog Component
        catalog: {
            title: 'दवाई कैटलॉग',
            search: 'दवाइयाँ खोजें...',
            addToCart: 'कार्ट में डालें',
            adding: 'जोड़ रहे हैं...',
            inCart: 'कार्ट में है',
            inStock: 'स्टॉक में',
            outOfStock: 'स्टॉक में नहीं',
            lowStock: 'बाकी',
            prescription: 'Rx आवश्यक',
            details: 'विवरण देखें',
            close: 'बंद करें',
            noResults: 'कोई दवाई नहीं मिली',
            loading: 'कैटलॉग लोड हो रहा है...',
            prescriptionWarning: 'इस दवाई के लिए वैध प्रिस्क्रिप्शन आवश्यक है।',
            manufacturer: 'निर्माता',
            category: 'श्रेणी',
            dosageForm: 'खुराक का प्रकार',
            strength: 'शक्ति',
            stock: 'स्टॉक',
            price: 'मूल्य'
        },

        // Category Filters
        categories: {
            all: 'सभी',
            painRelief: 'दर्द निवारक',
            antibiotics: 'एंटीबायोटिक्स',
            vitamins: 'विटामिन',
            cardiac: 'हृदय',
            diabetes: 'मधुमेह',
            gastro: 'गैस्ट्रो',
            respiratory: 'श्वसन'
        },

        // Cart Component
        cart: {
            title: 'शॉपिंग कार्ट',
            empty: 'आपका कार्ट खाली है',
            emptyDesc: 'कैटलॉग देखें और दवाइयाँ जोड़ें',
            quantity: 'मात्रा',
            remove: 'हटाएं',
            subtotal: 'उप-योग',
            total: 'कुल',
            checkout: 'चेकआउट करें',
            processing: 'प्रोसेस हो रहा है...',
            prescriptionNote: '📋 कुछ दवाइयों के लिए प्रिस्क्रिप्शन ज़रूरी है',
            loginRequired: 'कृपया लॉगिन करें',
            items: 'आइटम',
            per: 'प्रति',
            checkoutFailed: 'चेकआउट विफल। कृपया पुनः प्रयास करें।'
        },

        // Admin Dashboard
        admin: {
            systemStatus: 'सिस्टम स्थिति',
            operational: 'चालू',
            loading: 'लोड हो रहा...',
            refillAlerts: 'रिफिल अलर्ट',
            customersNeedRefills: 'ग्राहकों को रिफिल चाहिए',
            overdue: 'अतिदेय',
            days: 'दिन',
            noUrgentRefills: 'इस समय कोई अत्यावश्यक रिफिल नहीं',
            inventory: 'दवाई इन्वेंटरी',
            totalMedicines: 'कुल दवाइयाँ',
            lowStock: 'कम स्टॉक',
            rxRequired: 'Rx आवश्यक',
            recentOrders: 'हाल के ऑर्डर',
            totalOrders: 'कुल ऑर्डर',
            customers: 'ग्राहक',
            registeredPatients: 'पंजीकृत मरीज़',
            noConditions: 'कोई स्थिति नहीं',
            observability: 'निगरानी (ट्रेस)',
            traceLogs: 'ट्रेस लॉग',
            decisions: 'निर्णय',
            openLangfuse: 'Langfuse खोलें →'
        },

        // Registration Component
        registration: {
            title: 'खाता बनाएं',
            subtitle: 'पंजीकरण के लिए AI से चैट करें',
            startBtn: 'पंजीकरण शुरू करें',
            placeholder: 'अपना जवाब लिखें...',
            switchToLogin: 'पहले से खाता है?',
            login: 'लॉगिन',
            starting: 'शुरू हो रहा...',
            connectionError: '⚠️ पंजीकरण शुरू करने में असमर्थ।',
            stepError: '⚠️ कनेक्शन त्रुटि। कृपया पुनः प्रयास करें।',
            benefits: [
                '💬 चैट के माध्यम से ऑर्डर',
                '🛒 दवाई कैटलॉग देखें',
                '🔔 व्यक्तिगत रिफिल रिमाइंडर',
                '📋 प्रिस्क्रिप्शन अपलोड'
            ]
        },

        // Login Page
        login: {
            title: 'AI फार्मेसी',
            subtitle: 'वापस स्वागत है! कृपया लॉगिन करें',
            registerSubtitle: 'अपना मरीज़ खाता बनाएं',
            email: 'ईमेल',
            emailPlaceholder: 'अपना ईमेल दर्ज करें',
            password: 'पासवर्ड',
            passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
            loginAsPatient: 'मरीज़ के रूप में लॉगिन',
            loginAsAdmin: 'एडमिन के रूप में लॉगिन',
            noAccount: 'खाता नहीं है?',
            registerHere: 'यहाँ पंजीकरण करें',
            patient: 'मरीज़',
            admin: 'एडमिन',
            backToLogin: '← लॉगिन पर वापस',
            patientRegistration: 'मरीज़ पंजीकरण',
            fullName: 'पूरा नाम',
            fullNamePlaceholder: 'अपना पूरा नाम दर्ज करें',
            phone: 'फोन नंबर',
            phonePlaceholder: '+91-1234567890',
            dob: 'जन्म तिथि',
            address: 'पता',
            addressPlaceholder: 'अपना पूरा पता दर्ज करें',
            preferredLanguage: 'पसंदीदा भाषा',
            chronicConditions: 'पुरानी बीमारियाँ',
            chronicPlaceholder: 'जैसे, मधुमेह, उच्च रक्तचाप',
            commaSeparated: 'अल्पविराम से अलग सूची',
            allergies: 'एलर्जी',
            allergiesPlaceholder: 'जैसे, पेनिसिलिन, एस्पिरिन',
            allergiesHint: 'अल्पविराम से अलग सूची (दवा सुरक्षा जांच के लिए महत्वपूर्ण)',
            createAccount: 'खाता बनाएं',
            haveAccount: 'पहले से खाता है?',
            loginHere: 'यहाँ लॉगिन करें',
            footer: 'AI-संचालित स्वास्थ्य तकनीक द्वारा सुरक्षित',
            confirmPassword: 'पासवर्ड की पुष्टि करें',
            confirmPasswordPlaceholder: 'अपने पासवर्ड की पुष्टि करें',
            createPasswordPlaceholder: 'पासवर्ड बनाएं'
        }
    },

    DE: {
        // App Header & Navigation
        app: {
            title: 'Agentische Apotheke',
            patient: '🏥 Patient',
            admin: '📊 Admin',
            online: 'Online',
            offline: 'Offline'
        },
        nav: {
            chat: 'Chat',
            catalog: 'Katalog',
            cart: 'Warenkorb'
        },

        // Chat Component
        chat: {
            title: '🏥 Smart-Apotheke',
            welcome: '👋 Willkommen in unserer Smart-Apotheke!\n\nIch bin Ihr KI-Apotheker-Assistent. Ich kann Ihnen helfen:\n• Medikamente bestellen\n• Medikamentenverfügbarkeit prüfen\n• Rezepte nachfüllen\n• Fragen zu Ihren Medikamenten beantworten\n\nWie kann ich Ihnen heute helfen?',
            placeholder: 'Geben Sie Ihre Bestellung oder Frage ein...',
            languageChanged: '🌐 Sprache auf Deutsch umgestellt.',
            quickActions: ["Ich brauche Paracetamol", "Ist Ibuprofen verfügbar?", "Mein Rezept nachfüllen", "Meine Bestellung stornieren"],
            cancelConfirm: 'Bestellung stornieren?',
            cancelYes: 'Ja, Bestellung stornieren',
            cancelNo: 'Nein, Bestellung behalten',
            confirmOrder: 'Bestellung bestätigen?',
            confirmYes: '✓ Ja, bestellen',
            confirmCancel: '✗ Abbrechen',
            uploadedPrescription: '📄 Rezept hochgeladen',
            connectionError: '⚠️ Verbindung nicht möglich. Prüfen Sie das Backend.',
            uploadError: '⚠️ Upload fehlgeschlagen. Verbindung prüfen.',
            voiceInput: 'Spracheingabe',
            uploadPrescription: 'Rezept hochladen'
        },

        // Chat Sidebar
        sidebar: {
            systemStatus: '⚙️ Systemstatus',
            ollama: 'Ollama',
            connected: 'Verbunden',
            apiKeys: 'API Keys',
            notRequired: 'Nicht erforderlich',
            langfuse: 'Langfuse',
            enabled: 'Aktiviert',
            mockMode: 'Mock-Modus',
            agents: 'Agenten',
            agentsActive: '5 Aktiv',
            quickReference: '💊 Schnellreferenz',
            inStock: 'Auf Lager',
            features: '✨ Funktionen',
            featuresList: [
                '🗣️ Sprach- & Textbestellungen',
                '📋 Rezeptprüfung',
                '⚠️ Allergie-Warnungen',
                '🔄 Nachfüll-Erinnerungen',
                '🔍 Volle Nachverfolgung'
            ],
            refillAlerts: '🔔 Nachfüll-Warnungen',
            runningLow: 'Wird knapp',
            daysLeft: 'Tage übrig',
            refillNow: 'Jetzt nachfüllen'
        },

        // Catalog Component
        catalog: {
            title: 'Medikamentenkatalog',
            search: 'Medikamente suchen...',
            addToCart: 'In den Warenkorb',
            adding: 'Hinzufügen...',
            inCart: 'Im Warenkorb',
            inStock: 'Auf Lager',
            outOfStock: 'Nicht vorrätig',
            lowStock: 'übrig',
            prescription: 'Rezeptpflichtig',
            details: 'Details anzeigen',
            close: 'Schließen',
            noResults: 'Keine Medikamente gefunden',
            loading: 'Katalog wird geladen...',
            prescriptionWarning: 'Dieses Medikament ist rezeptpflichtig.',
            manufacturer: 'Hersteller',
            category: 'Kategorie',
            dosageForm: 'Darreichungsform',
            strength: 'Stärke',
            stock: 'Bestand',
            price: 'Preis'
        },

        // Category Filters
        categories: {
            all: 'Alle',
            painRelief: 'Schmerzmittel',
            antibiotics: 'Antibiotika',
            vitamins: 'Vitamine',
            cardiac: 'Herz',
            diabetes: 'Diabetes',
            gastro: 'Magen-Darm',
            respiratory: 'Atemwege'
        },

        // Cart Component
        cart: {
            title: 'Warenkorb',
            empty: 'Ihr Warenkorb ist leer',
            emptyDesc: 'Durchsuchen Sie den Katalog und fügen Sie Medikamente hinzu',
            quantity: 'Menge',
            remove: 'Entfernen',
            subtotal: 'Zwischensumme',
            total: 'Gesamt',
            checkout: 'Zur Kasse gehen',
            processing: 'Wird bearbeitet...',
            prescriptionNote: '📋 Einige Artikel sind rezeptpflichtig.',
            loginRequired: 'Bitte melden Sie sich an',
            items: 'Artikel',
            per: 'pro',
            checkoutFailed: 'Kasse fehlgeschlagen. Bitte erneut versuchen.'
        },

        // Admin Dashboard
        admin: {
            systemStatus: 'Systemstatus',
            operational: 'Betriebsbereit',
            loading: 'Lädt...',
            refillAlerts: 'Nachfüll-Warnungen',
            customersNeedRefills: 'Kunden benötigen Nachfüllung',
            overdue: 'Überfällig',
            days: 'Tage',
            noUrgentRefills: 'Keine dringenden Nachfüllungen',
            inventory: 'Medikamentenbestand',
            totalMedicines: 'Medikamente gesamt',
            lowStock: 'Niedriger Bestand',
            rxRequired: 'Rezeptpflichtig',
            recentOrders: 'Letzte Bestellungen',
            totalOrders: 'Bestellungen gesamt',
            customers: 'Kunden',
            registeredPatients: 'Registrierte Patienten',
            noConditions: 'Keine Erkrankungen',
            observability: 'Nachverfolgung (Traces)',
            traceLogs: 'Trace-Logs erfasst',
            decisions: 'Entscheidungen',
            openLangfuse: 'Langfuse öffnen →'
        },

        // Registration Component
        registration: {
            title: 'Konto erstellen',
            subtitle: 'Chatten Sie mit unserer KI zur Registrierung',
            startBtn: 'Registrierung starten',
            placeholder: 'Geben Sie Ihre Antwort ein...',
            switchToLogin: 'Haben Sie bereits ein Konto?',
            login: 'Anmelden',
            starting: 'Wird gestartet...',
            connectionError: '⚠️ Registrierung kann nicht gestartet werden.',
            stepError: '⚠️ Verbindungsfehler. Bitte erneut versuchen.',
            benefits: [
                '💬 Bestellung per Chat',
                '🛒 Medikamentenkatalog durchsuchen',
                '🔔 Personalisierte Nachfüllerinnerungen',
                '📋 Rezept-Upload & Analyse'
            ]
        },

        // Login Page
        login: {
            title: 'KI-Apotheke',
            subtitle: 'Willkommen zurück! Bitte melden Sie sich an',
            registerSubtitle: 'Erstellen Sie Ihr Patientenkonto',
            email: 'E-Mail',
            emailPlaceholder: 'Geben Sie Ihre E-Mail ein',
            password: 'Passwort',
            passwordPlaceholder: 'Geben Sie Ihr Passwort ein',
            loginAsPatient: 'Als Patient anmelden',
            loginAsAdmin: 'Als Admin anmelden',
            noAccount: 'Kein Konto?',
            registerHere: 'Hier registrieren',
            patient: 'Patient',
            admin: 'Admin',
            backToLogin: '← Zurück zur Anmeldung',
            patientRegistration: 'Patientenregistrierung',
            fullName: 'Vollständiger Name',
            fullNamePlaceholder: 'Geben Sie Ihren vollständigen Namen ein',
            phone: 'Telefonnummer',
            phonePlaceholder: '+49-123456789',
            dob: 'Geburtsdatum',
            address: 'Adresse',
            addressPlaceholder: 'Geben Sie Ihre vollständige Adresse ein',
            preferredLanguage: 'Bevorzugte Sprache',
            chronicConditions: 'Chronische Erkrankungen',
            chronicPlaceholder: 'z.B., Diabetes, Bluthochdruck',
            commaSeparated: 'Durch Komma getrennte Liste',
            allergies: 'Allergien',
            allergiesPlaceholder: 'z.B., Penicillin, Aspirin',
            allergiesHint: 'Durch Komma getrennte Liste (wichtig für Arzneimittelsicherheit)',
            createAccount: 'Konto erstellen',
            haveAccount: 'Haben Sie bereits ein Konto?',
            loginHere: 'Hier anmelden',
            footer: 'Gesichert durch KI-gestützte Gesundheitstechnologie',
            confirmPassword: 'Passwort bestätigen',
            confirmPasswordPlaceholder: 'Bestätigen Sie Ihr Passwort',
            createPasswordPlaceholder: 'Passwort erstellen'
        }
    }
}

// Helper to get nested translation value
export const getTranslation = (translations, key) => {
    const keys = key.split('.')
    let value = translations
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k]
        } else {
            return key // Return key if not found
        }
    }
    return value
}
