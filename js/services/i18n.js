// js/services/i18n.js
class I18nService {
    constructor() {
        this.currentLocale = 'en';
        this.fallbackLocale = 'en';
        this.translations = {};
        this.listeners = [];
        // A comprehensive list of potential locales.
        this.potentialLocales = [
            { code: 'en', name: 'English', emoji: '🇺🇸' },
            { code: 'es', name: 'Español', emoji: '🇪🇸' },
            { code: 'fr', name: 'Français', emoji: '🇫🇷' },
            { code: 'de', name: 'Deutsch', emoji: '🇩🇪' },
            
            { code: 'ja', name: '日本語', emoji: '🇯🇵' },
            { code: 'zh', name: '中文', emoji: '🇨🇳' },
            { code: 'ko', name: '한국어', emoji: '🇰🇷' }

            // { code: 'ar', name: 'العربية', emoji: '🇸🇦' },
            // { code: 'pt', name: 'Português', emoji: '🇵🇹' },
            // { code: 'it', name: 'Italiano', emoji: '🇮🇹' },
            // { code: 'ru', name: 'Русский', emoji: '🇷🇺' }
        ];
        this.supportedLocales = [];
    }

    /**
     * Initialize the i18n service by discovering available locales.
     */
    async init(preferredLocale = null) {
        await this.discoverLocales();

        let locale;
        if (preferredLocale && this.isLocaleSupported(preferredLocale)) {
            locale = preferredLocale;
        } else {
            const detectedLang = this.detectBrowserLanguage();
            locale = this.isLocaleSupported(detectedLang) ? detectedLang : this.fallbackLocale;
        }

        await this.setLocale(locale);
        console.log(`i18n initialized with locale: ${this.currentLocale}`);
    }

    /**
     * Tries to fetch all potential locale files to see which ones are available.
     */
    async discoverLocales() {
        const localePromises = this.potentialLocales.map(async (localeInfo) => {
            try {
                const response = await fetch(`./js/locales/${localeInfo.code}.json`);
                if (response.ok) {
                    this.translations[localeInfo.code] = await response.json();
                    return localeInfo;
                }
                return null;
            } catch (error) {
                return null;
            }
        });

        const results = await Promise.all(localePromises);
        this.supportedLocales = results.filter(Boolean); // Filter out nulls

        // Ensure the fallback locale is always available
        if (!this.supportedLocales.some(l => l.code === this.fallbackLocale)) {
            try {
                const response = await fetch(`./js/locales/${this.fallbackLocale}.json`);
                if (response.ok) {
                    this.translations[this.fallbackLocale] = await response.json();
                    this.supportedLocales.push(
                        this.potentialLocales.find(l => l.code === this.fallbackLocale)
                    );
                }
            } catch (error) {
                console.error(`Failed to load fallback locale '${this.fallbackLocale}'.`);
            }
        }
    }

    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        return browserLang.split('-')[0].toLowerCase();
    }

    isLocaleSupported(locale) {
        return this.supportedLocales.some(l => l.code === locale);
    }

    getSupportedAppLocales() {
        return this.supportedLocales;
    }

    getSupportedTranslationLanguages() {
        // You might want to keep a distinction if some languages are only for translation
        return this.supportedLocales.map(l => ({ ...l, code: l.code.toUpperCase() }));
    }

    async setLocale(locale) {
        if (!this.isLocaleSupported(locale)) {
            console.warn(`Locale ${locale} not supported, falling back to ${this.fallbackLocale}`);
            locale = this.fallbackLocale;
        }

        this.currentLocale = locale;

        // The translations are already loaded by discoverLocales, so no need to fetch again.
        this.notifyListeners();
        document.documentElement.lang = locale;
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let translation = this.getNestedTranslation(this.translations[this.currentLocale], keys);

        if (translation === undefined && this.currentLocale !== this.fallbackLocale) {
            translation = this.getNestedTranslation(this.translations[this.fallbackLocale], keys);
        }

        return this.interpolate(translation !== undefined ? translation : key, params);
    }

    getNestedTranslation(obj, keys) {
        if (!obj) return undefined;
        return keys.reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), obj);
    }

    interpolate(text, params) {
        if (typeof text !== 'string') return text;
        return text.replace(/\{(\w+)\}/g, (match, key) => (params[key] !== undefined ? params[key] : match));
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) this.listeners.splice(index, 1);
    }

    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.currentLocale);
            } catch (error) {
                console.error('Error in i18n listener:', error);
            }
        });
    }

    getCurrentLocale() {
        return this.currentLocale;
    }
}

// Create singleton instance
export const i18n = new I18nService();