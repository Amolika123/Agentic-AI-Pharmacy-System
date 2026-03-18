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
            // General
            systemStatus: 'System Status',
            operational: 'operational',
            loading: 'Loading...',
            overdue: 'Overdue',
            days: 'days',

            // Sidebar tabs
            tabOverview: 'Overview',
            tabOrders: 'Orders',
            tabInventory: 'Inventory',
            tabPatients: 'Patients',
            tabTraces: 'Traces',
            tabSettings: 'Settings',

            // Overview tab
            overview: 'Overview',
            totalPatients: 'Total Patients',
            totalOrders: 'Total Orders',
            pendingOrders: 'Pending Orders',
            lowStockItems: 'Low Stock Items',
            orderSummary: 'Order Summary',
            pending: 'Pending',
            confirmed: 'Confirmed',
            completed: 'Completed',
            systemStatusLabel: 'System Status',
            llmConnection: 'LLM Connection',
            connected: 'Connected',
            offline: 'Offline',
            observabilityLabel: 'Observability',
            activeTraces: 'Active Traces',
            refillAlerts: 'Refill Alerts',
            noRefillAlerts: 'No refill alerts',

            // Orders tab
            orders: 'Orders',
            total: 'Total',
            showing: 'Showing',
            allStatus: 'All Status',
            cancelled: 'Cancelled',
            qty: 'Qty',
            noOrdersFound: 'No orders found',

            // Inventory tab
            inventory: 'Inventory',
            items: 'Items',
            lowStock: 'Low Stock',
            edit: 'Edit',

            // Patients tab
            patients: 'Patients',
            searchPlaceholder: 'Search by name, email, or ID...',
            allConditions: 'All Conditions',
            id: 'ID',
            name: 'Name',
            email: 'Email',
            chronicConditions: 'Chronic Conditions',
            allergies: 'Allergies',
            registered: 'Registered',
            actions: 'Actions',
            view: 'View',
            none: 'None',
            noPatientsMatch: 'No patients match your search criteria',

            // Observability/Traces tab
            observability: 'Observability & Agent Traces',
            traces: 'Traces',
            decisions: 'decisions',
            latest: 'Latest',
            unknownAgent: 'Unknown Agent',
            noTraces: 'No traces captured yet. Interact with the pharmacy assistant to generate traces.',
            openLangfuse: 'Open Langfuse →',

            // System Health tab
            systemHealth: 'System Health',
            agents: 'Agents',
            connections: 'Connections',
            ollamaLlm: 'Ollama LLM',
            langfuseTracing: 'Langfuse Tracing',
            enabled: 'Enabled',
            mockMode: 'Mock Mode',
            proactiveRefillAlerts: 'Proactive Refill Alerts',
            customersNeedRefills: 'customers need refills',

            // Patient Modal
            patientProfile: 'Patient Profile',
            phone: 'Phone',
            dateOfBirth: 'Date of Birth',
            language: 'Language',
            address: 'Address',
            noChronicConditions: 'No chronic conditions reported',
            noAllergies: 'No allergies reported',

            // Inventory Edit Modal
            editInventory: 'Edit Inventory',
            stockQuantity: 'Stock Quantity',
            unitPrice: 'Unit Price',
            reorderLevel: 'Reorder Level',
            cancel: 'Cancel',
            saveChanges: 'Save Changes',

            // Settings
            settings: 'Settings',
            organization: 'Organization',
            usersAndRoles: 'Users & Roles',
            safetyAndPolicy: 'Safety & Policy',
            agentConfig: 'Agent Config',
            inventoryRules: 'Inventory Rules',
            compliance: 'Compliance',
            dangerZone: 'Danger Zone',

            // Settings - Organization
            organizationSettings: 'Organization Settings',
            configurePharmacy: "Configure your pharmacy's basic information",
            pharmacyName: 'Pharmacy Name',
            officialBusinessName: 'Official business name',
            addressLabel: 'Address',
            physicalLocation: 'Physical location',
            operatingHours: 'Operating Hours',
            businessHours: 'Business hours',
            timezone: 'Timezone',
            systemTimezone: 'System timezone',
            defaultLanguage: 'Default Language',
            primaryAiLanguage: 'Primary AI language',

            // Settings - Users & Roles
            userRoleManagement: 'User & Role Management',
            manageAdminUsers: 'Manage admin users and their permissions',
            roleChangeNote: 'Role changes require verification. Admins cannot modify their own role.',

            // Settings - Safety & Policy
            safetyPolicyRules: 'Safety & Policy Rules',
            configureSafety: 'Configure medication safety and ordering policies',
            orderPolicies: 'Order Policies',
            maxOrderQuantity: 'Max Order Quantity',
            maxItemsPerOrder: 'Maximum items per order',
            prescriptionValidation: 'Prescription Validation',
            requirePrescription: 'Require prescription for Rx medicines',
            enforced: 'Enforced',
            safetyEnforcement: 'Safety Enforcement',
            allergyBlocking: 'Allergy Blocking',
            blockAllergyOrders: 'Block orders with known allergies',
            hardBlock: 'Hard Block',
            drugInteractionChecks: 'Drug Interaction Checks',
            checkDangerousInteractions: 'Check for dangerous interactions',

            // Settings - Agent Config
            agentConfiguration: 'Agent Configuration',
            controlAgentBehavior: 'Control AI agent behavior (high-level only)',
            agentStatus: 'Agent Status',
            safetyAgent: 'Safety Agent',
            safetyAgentDesc: 'Drug interaction & allergy validation',
            refillAgent: 'Refill Agent',
            refillAgentDesc: 'Proactive refill predictions',
            visionAgent: 'Vision Agent',
            visionAgentDesc: 'Prescription image processing',
            executionMode: 'Execution Mode',
            operationMode: 'Operation Mode',
            howAgentsHandle: 'How agents handle decisions',
            promptEditNote: 'Prompt editing is not available in this interface for safety reasons.',

            // Settings - Observability
            observabilitySettings: 'Observability Settings',
            configureTracing: 'Configure tracing and logging',
            traceLogging: 'Trace Logging',
            recordAgentDecisions: 'Record agent decisions',
            tracingProvider: 'Tracing Provider',
            currentLoggingBackend: 'Current logging backend',
            localMock: 'Local Mock',
            traceRetention: 'Trace Retention',
            howLongTracesKept: 'How long traces are kept',
            maskPatientIdentifiers: 'Mask Patient Identifiers',
            anonymizePii: 'Anonymize PII in logs',
            exportTraces: '📥 Export Traces (Admin Only)',

            // Settings - Inventory Rules
            inventoryRulesTitle: 'Inventory Rules',
            configureStock: 'Configure stock management thresholds',
            defaultLowStockThreshold: 'Default Low Stock Threshold',
            alertWhenStockFalls: 'Alert when stock falls below this',
            restockAlerts: 'Restock Alerts',
            notifyAdminsLowStock: 'Notify admins for low stock',
            active: 'Active',
            autoHideOutOfStock: 'Auto-hide Out of Stock',
            hideUnavailableItems: 'Hide unavailable items from catalog',
            disabled: 'Disabled',

            // Settings - Compliance
            complianceAudit: 'Compliance & Audit',
            regulatoryCompliance: 'Regulatory compliance and audit logs',
            auditLogging: 'Audit Logging',
            trackAllChanges: 'Track all system changes',
            dataRetention: 'Data Retention',
            orderPatientData: 'Order and patient data',
            systemVersion: 'System Version',
            currentVersion: 'Current PharmAgent version',
            viewAuditLogs: '📄 View Audit Logs',

            // Settings - Danger Zone
            dangerZoneTitle: 'Danger Zone',
            criticalActions: 'Critical system actions - use with caution',
            warning: 'Warning',
            dangerWarningText: 'Actions here can affect system stability. All actions require confirmation.',
            resetDemoData: 'Reset Demo Data',
            restoreDefaults: 'Restore all data to demo defaults',
            confirmReset: 'Confirm Reset',
            reset: 'Reset',
            clearCache: 'Clear Cache',
            clearCachedData: 'Clear all cached data and sessions',
            confirmClear: 'Confirm Clear',
            clear: 'Clear'
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
            // General
            systemStatus: 'सिस्टम स्थिति',
            operational: 'चालू',
            loading: 'लोड हो रहा...',
            overdue: 'अतिदेय',
            days: 'दिन',

            // Sidebar tabs
            tabOverview: 'अवलोकन',
            tabOrders: 'ऑर्डर',
            tabInventory: 'इन्वेंटरी',
            tabPatients: 'मरीज़',
            tabTraces: 'ट्रेस',
            tabSettings: 'सेटिंग्स',

            // Overview tab
            overview: 'अवलोकन',
            totalPatients: 'कुल मरीज़',
            totalOrders: 'कुल ऑर्डर',
            pendingOrders: 'लंबित ऑर्डर',
            lowStockItems: 'कम स्टॉक आइटम',
            orderSummary: 'ऑर्डर सारांश',
            pending: 'लंबित',
            confirmed: 'पुष्टि हुई',
            completed: 'पूर्ण',
            systemStatusLabel: 'सिस्टम स्थिति',
            llmConnection: 'LLM कनेक्शन',
            connected: 'कनेक्टेड',
            offline: 'ऑफ़लाइन',
            observabilityLabel: 'निगरानी',
            activeTraces: 'सक्रिय ट्रेस',
            refillAlerts: 'रिफिल अलर्ट',
            noRefillAlerts: 'कोई रिफिल अलर्ट नहीं',

            // Orders tab
            orders: 'ऑर्डर',
            total: 'कुल',
            showing: 'दिखा रहे',
            allStatus: 'सभी स्थिति',
            cancelled: 'रद्द',
            qty: 'मात्रा',
            noOrdersFound: 'कोई ऑर्डर नहीं मिला',

            // Inventory tab
            inventory: 'इन्वेंटरी',
            items: 'आइटम',
            lowStock: 'कम स्टॉक',
            edit: 'संपादन',

            // Patients tab
            patients: 'मरीज़',
            searchPlaceholder: 'नाम, ईमेल या ID से खोजें...',
            allConditions: 'सभी स्थितियाँ',
            id: 'ID',
            name: 'नाम',
            email: 'ईमेल',
            chronicConditions: 'पुरानी बीमारियाँ',
            allergies: 'एलर्जी',
            registered: 'पंजीकृत',
            actions: 'कार्रवाई',
            view: 'देखें',
            none: 'कोई नहीं',
            noPatientsMatch: 'कोई मरीज़ आपकी खोज से मेल नहीं खाता',

            // Observability/Traces tab
            observability: 'निगरानी और एजेंट ट्रेस',
            traces: 'ट्रेस',
            decisions: 'निर्णय',
            latest: 'नवीनतम',
            unknownAgent: 'अज्ञात एजेंट',
            noTraces: 'अभी तक कोई ट्रेस नहीं। फार्मेसी सहायक से बात करें।',
            openLangfuse: 'Langfuse खोलें →',

            // System Health tab
            systemHealth: 'सिस्टम स्वास्थ्य',
            agents: 'एजेंट्स',
            connections: 'कनेक्शन',
            ollamaLlm: 'Ollama LLM',
            langfuseTracing: 'Langfuse ट्रेसिंग',
            enabled: 'सक्रिय',
            mockMode: 'मॉक मोड',
            proactiveRefillAlerts: 'सक्रिय रिफिल अलर्ट',
            customersNeedRefills: 'ग्राहकों को रिफिल चाहिए',

            // Patient Modal
            patientProfile: 'मरीज़ प्रोफ़ाइल',
            phone: 'फोन',
            dateOfBirth: 'जन्म तिथि',
            language: 'भाषा',
            address: 'पता',
            noChronicConditions: 'कोई पुरानी बीमारी नहीं',
            noAllergies: 'कोई एलर्जी नहीं',

            // Inventory Edit Modal
            editInventory: 'इन्वेंटरी संपादित करें',
            stockQuantity: 'स्टॉक मात्रा',
            unitPrice: 'इकाई मूल्य',
            reorderLevel: 'पुनः ऑर्डर स्तर',
            cancel: 'रद्द करें',
            saveChanges: 'बदलाव सहेजें',

            // Settings
            settings: 'सेटिंग्स',
            organization: 'संगठन',
            usersAndRoles: 'उपयोगकर्ता और भूमिकाएँ',
            safetyAndPolicy: 'सुरक्षा और नीति',
            agentConfig: 'एजेंट कॉन्फिग',
            inventoryRules: 'इन्वेंटरी नियम',
            compliance: 'अनुपालन',
            dangerZone: 'खतरा क्षेत्र',

            // Settings - Organization
            organizationSettings: 'संगठन सेटिंग्स',
            configurePharmacy: 'अपनी फार्मेसी की बुनियादी जानकारी कॉन्फ़िगर करें',
            pharmacyName: 'फार्मेसी का नाम',
            officialBusinessName: 'आधिकारिक व्यवसाय नाम',
            addressLabel: 'पता',
            physicalLocation: 'भौतिक स्थान',
            operatingHours: 'कार्य समय',
            businessHours: 'व्यवसाय के घंटे',
            timezone: 'समय क्षेत्र',
            systemTimezone: 'सिस्टम समय क्षेत्र',
            defaultLanguage: 'डिफ़ॉल्ट भाषा',
            primaryAiLanguage: 'प्राथमिक AI भाषा',

            // Settings - Users & Roles
            userRoleManagement: 'उपयोगकर्ता और भूमिका प्रबंधन',
            manageAdminUsers: 'एडमिन उपयोगकर्ताओं और उनकी अनुमतियों का प्रबंधन करें',
            roleChangeNote: 'भूमिका परिवर्तन के लिए सत्यापन आवश्यक है।',

            // Settings - Safety & Policy
            safetyPolicyRules: 'सुरक्षा और नीति नियम',
            configureSafety: 'दवा सुरक्षा और ऑर्डरिंग नीतियाँ कॉन्फ़िगर करें',
            orderPolicies: 'ऑर्डर नीतियाँ',
            maxOrderQuantity: 'अधिकतम ऑर्डर मात्रा',
            maxItemsPerOrder: 'प्रति ऑर्डर अधिकतम आइटम',
            prescriptionValidation: 'प्रिस्क्रिप्शन सत्यापन',
            requirePrescription: 'Rx दवाओं के लिए प्रिस्क्रिप्शन आवश्यक',
            enforced: 'लागू',
            safetyEnforcement: 'सुरक्षा प्रवर्तन',
            allergyBlocking: 'एलर्जी ब्लॉकिंग',
            blockAllergyOrders: 'ज्ञात एलर्जी वाले ऑर्डर ब्लॉक करें',
            hardBlock: 'हार्ड ब्लॉक',
            drugInteractionChecks: 'ड्रग इंटरैक्शन जाँच',
            checkDangerousInteractions: 'खतरनाक इंटरैक्शन की जाँच करें',

            // Settings - Agent Config
            agentConfiguration: 'एजेंट कॉन्फ़िगरेशन',
            controlAgentBehavior: 'AI एजेंट व्यवहार नियंत्रित करें (उच्च-स्तरीय)',
            agentStatus: 'एजेंट स्थिति',
            safetyAgent: 'सुरक्षा एजेंट',
            safetyAgentDesc: 'ड्रग इंटरैक्शन और एलर्जी सत्यापन',
            refillAgent: 'रिफिल एजेंट',
            refillAgentDesc: 'सक्रिय रिफिल भविष्यवाणी',
            visionAgent: 'विज़न एजेंट',
            visionAgentDesc: 'प्रिस्क्रिप्शन इमेज प्रोसेसिंग',
            executionMode: 'निष्पादन मोड',
            operationMode: 'ऑपरेशन मोड',
            howAgentsHandle: 'एजेंट निर्णय कैसे लेते हैं',
            promptEditNote: 'सुरक्षा कारणों से प्रॉम्प्ट एडिटिंग उपलब्ध नहीं है।',

            // Settings - Observability
            observabilitySettings: 'निगरानी सेटिंग्स',
            configureTracing: 'ट्रेसिंग और लॉगिंग कॉन्फ़िगर करें',
            traceLogging: 'ट्रेस लॉगिंग',
            recordAgentDecisions: 'एजेंट निर्णय रिकॉर्ड करें',
            tracingProvider: 'ट्रेसिंग प्रदाता',
            currentLoggingBackend: 'वर्तमान लॉगिंग बैकएंड',
            localMock: 'लोकल मॉक',
            traceRetention: 'ट्रेस रिटेंशन',
            howLongTracesKept: 'ट्रेस कितने समय तक रखे जाते हैं',
            maskPatientIdentifiers: 'मरीज़ पहचानकर्ता छुपाएं',
            anonymizePii: 'लॉग में PII को अनाम करें',
            exportTraces: '📥 ट्रेस एक्सपोर्ट करें (केवल एडमिन)',

            // Settings - Inventory Rules
            inventoryRulesTitle: 'इन्वेंटरी नियम',
            configureStock: 'स्टॉक प्रबंधन थ्रेसहोल्ड कॉन्फ़िगर करें',
            defaultLowStockThreshold: 'डिफ़ॉल्ट कम स्टॉक थ्रेसहोल्ड',
            alertWhenStockFalls: 'इससे नीचे आने पर अलर्ट',
            restockAlerts: 'रीस्टॉक अलर्ट',
            notifyAdminsLowStock: 'कम स्टॉक के लिए एडमिन को सूचित करें',
            active: 'सक्रिय',
            autoHideOutOfStock: 'आउट ऑफ स्टॉक ऑटो-छुपाएं',
            hideUnavailableItems: 'कैटलॉग से अनुपलब्ध आइटम छुपाएं',
            disabled: 'अक्षम',

            // Settings - Compliance
            complianceAudit: 'अनुपालन और ऑडिट',
            regulatoryCompliance: 'नियामक अनुपालन और ऑडिट लॉग',
            auditLogging: 'ऑडिट लॉगिंग',
            trackAllChanges: 'सभी सिस्टम परिवर्तन ट्रैक करें',
            dataRetention: 'डेटा रिटेंशन',
            orderPatientData: 'ऑर्डर और मरीज़ डेटा',
            systemVersion: 'सिस्टम संस्करण',
            currentVersion: 'वर्तमान PharmAgent संस्करण',
            viewAuditLogs: '📄 ऑडिट लॉग देखें',

            // Settings - Danger Zone
            dangerZoneTitle: 'खतरा क्षेत्र',
            criticalActions: 'गंभीर सिस्टम कार्य - सावधानी से उपयोग करें',
            warning: 'चेतावनी',
            dangerWarningText: 'यहाँ के कार्य सिस्टम स्थिरता को प्रभावित कर सकते हैं। सभी कार्यों की पुष्टि आवश्यक है।',
            resetDemoData: 'डेमो डेटा रीसेट करें',
            restoreDefaults: 'सभी डेटा को डेमो डिफ़ॉल्ट में पुनर्स्थापित करें',
            confirmReset: 'रीसेट की पुष्टि करें',
            reset: 'रीसेट',
            clearCache: 'कैश साफ़ करें',
            clearCachedData: 'सभी कैश्ड डेटा और सत्र साफ़ करें',
            confirmClear: 'साफ़ करने की पुष्टि करें',
            clear: 'साफ़ करें'
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
            // General
            systemStatus: 'Systemstatus',
            operational: 'Betriebsbereit',
            loading: 'Lädt...',
            overdue: 'Überfällig',
            days: 'Tage',

            // Sidebar tabs
            tabOverview: 'Übersicht',
            tabOrders: 'Bestellungen',
            tabInventory: 'Bestand',
            tabPatients: 'Patienten',
            tabTraces: 'Traces',
            tabSettings: 'Einstellungen',

            // Overview tab
            overview: 'Übersicht',
            totalPatients: 'Patienten gesamt',
            totalOrders: 'Bestellungen gesamt',
            pendingOrders: 'Ausstehende Bestellungen',
            lowStockItems: 'Artikel mit niedrigem Bestand',
            orderSummary: 'Bestellübersicht',
            pending: 'Ausstehend',
            confirmed: 'Bestätigt',
            completed: 'Abgeschlossen',
            systemStatusLabel: 'Systemstatus',
            llmConnection: 'LLM-Verbindung',
            connected: 'Verbunden',
            offline: 'Offline',
            observabilityLabel: 'Nachverfolgung',
            activeTraces: 'Aktive Traces',
            refillAlerts: 'Nachfüll-Warnungen',
            noRefillAlerts: 'Keine Nachfüll-Warnungen',

            // Orders tab
            orders: 'Bestellungen',
            total: 'Gesamt',
            showing: 'Angezeigt',
            allStatus: 'Alle Status',
            cancelled: 'Storniert',
            qty: 'Menge',
            noOrdersFound: 'Keine Bestellungen gefunden',

            // Inventory tab
            inventory: 'Bestand',
            items: 'Artikel',
            lowStock: 'Niedriger Bestand',
            edit: 'Bearbeiten',

            // Patients tab
            patients: 'Patienten',
            searchPlaceholder: 'Nach Name, E-Mail oder ID suchen...',
            allConditions: 'Alle Erkrankungen',
            id: 'ID',
            name: 'Name',
            email: 'E-Mail',
            chronicConditions: 'Chronische Erkrankungen',
            allergies: 'Allergien',
            registered: 'Registriert',
            actions: 'Aktionen',
            view: 'Ansehen',
            none: 'Keine',
            noPatientsMatch: 'Keine Patienten entsprechen Ihren Suchkriterien',

            // Observability/Traces tab
            observability: 'Nachverfolgung & Agent-Traces',
            traces: 'Traces',
            decisions: 'Entscheidungen',
            latest: 'Neueste',
            unknownAgent: 'Unbekannter Agent',
            noTraces: 'Noch keine Traces erfasst. Interagieren Sie mit dem Apotheken-Assistenten.',
            openLangfuse: 'Langfuse öffnen →',

            // System Health tab
            systemHealth: 'Systemzustand',
            agents: 'Agenten',
            connections: 'Verbindungen',
            ollamaLlm: 'Ollama LLM',
            langfuseTracing: 'Langfuse-Tracing',
            enabled: 'Aktiviert',
            mockMode: 'Mock-Modus',
            proactiveRefillAlerts: 'Proaktive Nachfüll-Warnungen',
            customersNeedRefills: 'Kunden benötigen Nachfüllung',

            // Patient Modal
            patientProfile: 'Patientenprofil',
            phone: 'Telefon',
            dateOfBirth: 'Geburtsdatum',
            language: 'Sprache',
            address: 'Adresse',
            noChronicConditions: 'Keine chronischen Erkrankungen gemeldet',
            noAllergies: 'Keine Allergien gemeldet',

            // Inventory Edit Modal
            editInventory: 'Bestand bearbeiten',
            stockQuantity: 'Bestandsmenge',
            unitPrice: 'Stückpreis',
            reorderLevel: 'Nachbestellgrenze',
            cancel: 'Abbrechen',
            saveChanges: 'Änderungen speichern',

            // Settings
            settings: 'Einstellungen',
            organization: 'Organisation',
            usersAndRoles: 'Benutzer & Rollen',
            safetyAndPolicy: 'Sicherheit & Richtlinien',
            agentConfig: 'Agent-Konfiguration',
            inventoryRules: 'Bestandsregeln',
            compliance: 'Compliance',
            dangerZone: 'Gefahrenzone',

            // Settings - Organization
            organizationSettings: 'Organisationseinstellungen',
            configurePharmacy: 'Grundlegende Informationen Ihrer Apotheke konfigurieren',
            pharmacyName: 'Apothekenname',
            officialBusinessName: 'Offizieller Geschäftsname',
            addressLabel: 'Adresse',
            physicalLocation: 'Physischer Standort',
            operatingHours: 'Öffnungszeiten',
            businessHours: 'Geschäftszeiten',
            timezone: 'Zeitzone',
            systemTimezone: 'Systemzeitzone',
            defaultLanguage: 'Standardsprache',
            primaryAiLanguage: 'Primäre KI-Sprache',

            // Settings - Users & Roles
            userRoleManagement: 'Benutzer- & Rollenverwaltung',
            manageAdminUsers: 'Admin-Benutzer und ihre Berechtigungen verwalten',
            roleChangeNote: 'Rollenänderungen erfordern eine Verifizierung.',

            // Settings - Safety & Policy
            safetyPolicyRules: 'Sicherheits- & Richtlinienregeln',
            configureSafety: 'Medikamentensicherheit und Bestellrichtlinien konfigurieren',
            orderPolicies: 'Bestellrichtlinien',
            maxOrderQuantity: 'Maximale Bestellmenge',
            maxItemsPerOrder: 'Maximale Artikel pro Bestellung',
            prescriptionValidation: 'Rezeptvalidierung',
            requirePrescription: 'Rezept für Rx-Medikamente erforderlich',
            enforced: 'Durchgesetzt',
            safetyEnforcement: 'Sicherheitsdurchsetzung',
            allergyBlocking: 'Allergie-Blockierung',
            blockAllergyOrders: 'Bestellungen mit bekannten Allergien blockieren',
            hardBlock: 'Harte Blockierung',
            drugInteractionChecks: 'Wechselwirkungsprüfungen',
            checkDangerousInteractions: 'Auf gefährliche Wechselwirkungen prüfen',

            // Settings - Agent Config
            agentConfiguration: 'Agent-Konfiguration',
            controlAgentBehavior: 'KI-Agent-Verhalten steuern (nur High-Level)',
            agentStatus: 'Agent-Status',
            safetyAgent: 'Sicherheits-Agent',
            safetyAgentDesc: 'Wechselwirkungen & Allergie-Validierung',
            refillAgent: 'Nachfüll-Agent',
            refillAgentDesc: 'Proaktive Nachfüllvorhersagen',
            visionAgent: 'Vision-Agent',
            visionAgentDesc: 'Rezeptbild-Verarbeitung',
            executionMode: 'Ausführungsmodus',
            operationMode: 'Betriebsmodus',
            howAgentsHandle: 'Wie Agenten Entscheidungen treffen',
            promptEditNote: 'Prompt-Bearbeitung ist aus Sicherheitsgründen nicht verfügbar.',

            // Settings - Observability
            observabilitySettings: 'Nachverfolgungseinstellungen',
            configureTracing: 'Tracing und Logging konfigurieren',
            traceLogging: 'Trace-Logging',
            recordAgentDecisions: 'Agent-Entscheidungen aufzeichnen',
            tracingProvider: 'Tracing-Anbieter',
            currentLoggingBackend: 'Aktuelles Logging-Backend',
            localMock: 'Lokaler Mock',
            traceRetention: 'Trace-Aufbewahrung',
            howLongTracesKept: 'Wie lange Traces aufbewahrt werden',
            maskPatientIdentifiers: 'Patientenkennungen maskieren',
            anonymizePii: 'PII in Logs anonymisieren',
            exportTraces: '📥 Traces exportieren (nur Admin)',

            // Settings - Inventory Rules
            inventoryRulesTitle: 'Bestandsregeln',
            configureStock: 'Schwellenwerte für Bestandsverwaltung konfigurieren',
            defaultLowStockThreshold: 'Standard-Schwellenwert für niedrigen Bestand',
            alertWhenStockFalls: 'Warnung wenn Bestand darunter fällt',
            restockAlerts: 'Nachbestellungswarnungen',
            notifyAdminsLowStock: 'Admins bei niedrigem Bestand benachrichtigen',
            active: 'Aktiv',
            autoHideOutOfStock: 'Nicht vorrätige automatisch ausblenden',
            hideUnavailableItems: 'Nicht verfügbare Artikel aus Katalog ausblenden',
            disabled: 'Deaktiviert',

            // Settings - Compliance
            complianceAudit: 'Compliance & Audit',
            regulatoryCompliance: 'Regulatorische Compliance und Audit-Logs',
            auditLogging: 'Audit-Logging',
            trackAllChanges: 'Alle Systemänderungen verfolgen',
            dataRetention: 'Datenaufbewahrung',
            orderPatientData: 'Bestell- und Patientendaten',
            systemVersion: 'Systemversion',
            currentVersion: 'Aktuelle PharmAgent-Version',
            viewAuditLogs: '📄 Audit-Logs ansehen',

            // Settings - Danger Zone
            dangerZoneTitle: 'Gefahrenzone',
            criticalActions: 'Kritische Systemaktionen - mit Vorsicht verwenden',
            warning: 'Warnung',
            dangerWarningText: 'Aktionen hier können die Systemstabilität beeinträchtigen. Alle Aktionen erfordern Bestätigung.',
            resetDemoData: 'Demo-Daten zurücksetzen',
            restoreDefaults: 'Alle Daten auf Demo-Standardwerte zurücksetzen',
            confirmReset: 'Zurücksetzen bestätigen',
            reset: 'Zurücksetzen',
            clearCache: 'Cache leeren',
            clearCachedData: 'Alle zwischengespeicherten Daten und Sitzungen leeren',
            confirmClear: 'Leeren bestätigen',
            clear: 'Leeren'
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
