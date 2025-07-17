// js/services/i18n.js
class I18nService {
    constructor() {
        this.currentLocale = 'en';
        this.fallbackLocale = 'en';
        this.translations = {};
        this.loadedLocales = new Set();
        this.listeners = [];
    }

    /**
     * Initialize the i18n service
     */
    async init(preferredLocale = null) {
        let locale;
        if (preferredLocale && this.isLocaleSupported(preferredLocale)) {
            locale = preferredLocale;
        } else {
            // Fallback to browser detection if no valid preference is saved
            const detectedLang = this.detectBrowserLanguage();
            locale = this.isLocaleSupported(detectedLang) ? detectedLang : this.fallbackLocale;
        }
        
        await this.setLocale(locale);
        console.log(`i18n initialized with locale: ${this.currentLocale}`);
    }

    /**
     * Detect browser language
     */
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        // Extract language code (e.g., 'en-US' -> 'en')
        return browserLang.split('-')[0].toLowerCase();
    }

    /**
     * Check if locale is supported
     */
    isLocaleSupported(locale) {
        const supportedLocales = ['en', 'es', 'fr', 'de', 'it'];
        return supportedLocales.includes(locale);
    }

    /**
     * Get list of supported app locales
     */
    getSupportedAppLocales() {
        return [
            { code: 'en', name: 'English', emoji: '🇺🇸' },
            { code: 'es', name: 'Español', emoji: '🇪🇸' },
            { code: 'fr', name: 'Français', emoji: '🇫🇷' },
            { code: 'de', name: 'Deutsch', emoji: '🇩🇪' },
            { code: 'it', name: 'Italiano', emoji: '🇮🇹' }
        ];
    }

    /**
     * Get list of supported translation languages
     */
    getSupportedTranslationLanguages() {
        return [
            { code: 'EN', name: 'English', emoji: '🇺🇸' },
            { code: 'ES', name: 'Español', emoji: '🇪🇸' },
            { code: 'FR', name: 'Français', emoji: '🇫🇷' },
            { code: 'DE', name: 'Deutsch', emoji: '🇩🇪' },
            { code: 'IT', name: 'Italiano', emoji: '🇮🇹' },
            { code: 'JA', name: '日本語', emoji: '🇯🇵' },
            { code: 'ZH', name: '中文', emoji: '🇨🇳' },
            { code: 'KO', name: '한국어', emoji: '🇰🇷' },
            { code: 'AR', name: 'العربية', emoji: '🇸🇦' }
        ];
    }

    /**
     * Set current locale and load translations
     */
    async setLocale(locale) {
        if (!this.isLocaleSupported(locale)) {
            console.warn(`Locale ${locale} not supported, falling back to ${this.fallbackLocale}`);
            locale = this.fallbackLocale;
        }

        this.currentLocale = locale;
        
        // Load locale if not already loaded
        if (!this.loadedLocales.has(locale)) {
            await this.loadLocale(locale);
        }

        // Load fallback if different and not loaded
        if (locale !== this.fallbackLocale && !this.loadedLocales.has(this.fallbackLocale)) {
            await this.loadLocale(this.fallbackLocale);
        }

        // Notify listeners of locale change
        this.notifyListeners();
        
        // Update document language
        document.documentElement.lang = locale;
    }

    /**
     * Load locale file
     */
    async loadLocale(locale) {
        try {
            const response = await fetch(`./locales/${locale}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load locale ${locale}`);
            }
            
            const translations = await response.json();
            this.translations[locale] = translations;
            this.loadedLocales.add(locale);
            
            console.log(`Loaded locale: ${locale}`);
        } catch (error) {
            console.error(`Error loading locale ${locale}:`, error);
            
            // If fallback fails, create minimal translations
            if (locale === this.fallbackLocale) {
                this.translations[locale] = {
                    common: {
                        loading: 'Loading...',
                        error: 'Error',
                        ok: 'OK',
                        cancel: 'Cancel'
                    }
                };
                this.loadedLocales.add(locale);
            }
        }
    }

    /**
     * Translate a key with optional interpolation
     */
    t(key, params = {}) {
        const translation = this.getTranslation(key);
        return this.interpolate(translation, params);
    }

    /**
     * Get translation for key
     */
    getTranslation(key) {
        const keys = key.split('.');
        
        // Try current locale first
        let translation = this.getNestedTranslation(this.translations[this.currentLocale], keys);
        
        // Fallback to fallback locale
        if (translation === undefined && this.currentLocale !== this.fallbackLocale) {
            translation = this.getNestedTranslation(this.translations[this.fallbackLocale], keys);
        }
        
        // Return key if no translation found
        return translation !== undefined ? translation : key;
    }

    /**
     * Get nested translation value
     */
    getNestedTranslation(obj, keys) {
        if (!obj) return undefined;
        
        return keys.reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Interpolate parameters in translation
     */
    interpolate(text, params) {
        if (typeof text !== 'string') return text;
        
        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Add listener for locale changes
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove listener
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of locale change
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.currentLocale);
            } catch (error) {
                console.error('Error in i18n listener:', error);
            }
        });
    }

    /**
     * Get current locale
     */
    getCurrentLocale() {
        return this.currentLocale;
    }

    /**
     * Check if translations are loaded for locale
     */
    isLocaleLoaded(locale) {
        return this.loadedLocales.has(locale);
    }
}

// Create singleton instance
export const i18n = new I18nService();

// Auto-initialize when imported
// i18n.init().catch(console.error);