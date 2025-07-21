// js/services/deepl.js
import { DatabaseService } from './database.js';
import { i18n } from './i18n.js';

class DeepLService {
    constructor() {
        this.apiEndpoint = '/.netlify/functions/translate'; // Netlify function endpoint
        this.cacheExpiration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        this.usageApiKey = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the service with API key
     */
    async initialize(apiKey) {
        this.usageApiKey = apiKey;
        this.isInitialized = !!apiKey;
        
        if (this.isInitialized) {
            await this.cleanExpiredCache();
            console.log('DeepL service initialized');
        }
        
        return this.isInitialized;
    }

    /**
     * Check if service is available
     */
    isAvailable() {
        return this.isInitialized && navigator.onLine;
    }

    async getUsage() {
        if (!this.isAvailable()) {
            return { error: i18n.t('errors.networkError') };
        }

        try {
            const response = await fetch(this.usageApiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: this.apiKey })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            return {
                character_count: data.character_count || 0,
                character_limit: data.character_limit || 500000,
            };
        } catch (error) {
            console.error('Error fetching DeepL usage:', error);
            return { error: i18n.t('errors.translationFailed'), character_count: 0, character_limit: 500000 };
        }
    }

    /**
     * Generate cache hash for translation request
     */
    generateCacheHash(text, sourceLang, targetLang) {
        const content = `${text}|${sourceLang}|${targetLang}`;
        // Simple hash function - in production you might want a more robust one
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Get translation from cache
     */
    async getFromCache(text, sourceLang, targetLang) {
        try {
            const hash = this.generateCacheHash(text, sourceLang, targetLang);
            const cached = await DatabaseService.get('translations', hash);
            
            if (cached) {
                // Check if cache is still valid
                const now = Date.now();
                if (now - cached.timestamp < this.cacheExpiration) {
                    console.log('Translation found in cache');
                    return {
                        text: cached.translatedText,
                        source: 'cache'
                    };
                } else {
                    // Remove expired cache entry
                    await DatabaseService.delete('translations', hash);
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error reading from cache:', error);
            return null;
        }
    }

    /**
     * Save translation to cache
     */
    async saveToCache(text, sourceLang, targetLang, translatedText) {
        try {
            const hash = this.generateCacheHash(text, sourceLang, targetLang);
            const cacheEntry = {
                hash,
                sourceText: text,
                sourceLang,
                targetLang,
                translatedText,
                timestamp: Date.now()
            };
            
            await DatabaseService.put('translations', cacheEntry);
            console.log('Translation cached');
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    }

    /**
     * Clean expired cache entries
     */
    async cleanExpiredCache() {
        try {
            const allTranslations = await DatabaseService.getAll('translations');
            const now = Date.now();
            const expiredEntries = allTranslations.filter(
                entry => now - entry.timestamp > this.cacheExpiration
            );
            
            for (const entry of expiredEntries) {
                await DatabaseService.delete('translations', entry.hash);
            }
            
            if (expiredEntries.length > 0) {
                console.log(`Cleaned ${expiredEntries.length} expired cache entries`);
            }
        } catch (error) {
            console.error('Error cleaning cache:', error);
        }
    }

    /**
     * Get current usage statistics
     */
    async getUsage() {
        if (!this.isAvailable()) {
            return { error: i18n.t('errors.networkError') };
        }

        try {
            const response = await fetch('/.netlify/functions/deepl-usage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiKey: this.usageApiKey })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            return {
                characterCount: data.character_count || 0,
                characterLimit: data.character_limit || 500000,
                percentage: data.character_limit ? 
                    Math.round((data.character_count / data.character_limit) * 100) : 0
            };
        } catch (error) {
            console.error('Error fetching usage:', error);
            return { error: i18n.t('errors.translationFailed') };
        }
    }

    /**
     * Translate text with caching
     */
    async translate(text, sourceLang, targetLang) {
        if (!text || !text.trim()) {
            return { error: 'Empty text' };
        }
        if (sourceLang === targetLang) {
            return { text: text, source: 'same-language' };
        }
        if (!this.isAvailable()) {
            return { error: 'Translation service is not available.' };
        }

        try {
            // **FIX START: Protect the {name} placeholder using XML tags**
            const protectedText = text.replace(/{name}/g, '<notranslate>{name}</notranslate>');

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: protectedText,
                    source_lang: sourceLang.toUpperCase(),
                    target_lang: targetLang.toUpperCase(),
                    apiKey: this.usageApiKey,
                    tag_handling: 'xml',       // Tell DeepL to handle XML
                    ignore_tags: 'notranslate' // Tell DeepL to ignore our custom tag
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            let translatedText = data.translations?.[0]?.text || data.text;
            if (!translatedText) {
                throw new Error('No translation received');
            }

            // **FIX END: Remove the protective tags after translation**
            translatedText = translatedText.replace(/<notranslate>{name}<\/notranslate>/g, '{name}');
            
            return { text: translatedText, source: 'deepl' };

        } catch (error) {
            console.error('Translation error:', error);
            let errorMessage = i18n.t('errors.translationFailed');
            if (error.message.includes('quota')) {
                errorMessage = 'Translation quota exceeded.';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                errorMessage = 'Invalid API key.';
            }
            return { error: errorMessage };
        }
    }

    /**
     * Batch translate multiple texts
     */
    async translateBatch(texts, sourceLang, targetLang, onProgress = null) {
        if (!Array.isArray(texts) || texts.length === 0) {
            return [];
        }

        const results = [];
        let totalCharactersUsed = 0;

        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            const result = await this.translate(text, sourceLang, targetLang);
            
            if (result.charactersUsed) {
                totalCharactersUsed += result.charactersUsed;
            }
            
            results.push({
                original: text,
                translated: result.text || text,
                error: result.error,
                source: result.source
            });

            // Call progress callback if provided
            if (onProgress) {
                onProgress(i + 1, texts.length, totalCharactersUsed);
            }

            // Small delay to avoid rate limiting
            if (i < texts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    /**
     * Translate phrases for a category
     */
    async translateCategoryPhrases(phrases, sourceLang, targetLang) {
        if (!phrases || phrases.length === 0) {
            return [];
        }

        const texts = phrases.map(phrase => phrase.text || phrase.baseLang);
        const results = await this.translateBatch(texts, sourceLang, targetLang);

        return phrases.map((phrase, index) => ({
            ...phrase,
            targetLang: results[index].translated,
            translationSource: results[index].source,
            translationError: results[index].error
        }));
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        try {
            const allTranslations = await DatabaseService.getAll('translations');
            const now = Date.now();
            
            const valid = allTranslations.filter(
                entry => now - entry.timestamp < this.cacheExpiration
            );
            
            const expired = allTranslations.length - valid.length;
            
            return {
                total: allTranslations.length,
                valid: valid.length,
                expired,
                oldestEntry: valid.length > 0 ? 
                    new Date(Math.min(...valid.map(e => e.timestamp))) : null,
                newestEntry: valid.length > 0 ? 
                    new Date(Math.max(...valid.map(e => e.timestamp))) : null
            };
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return { error: error.message };
        }
    }

    /**
     * Clear all cached translations
     */
    async clearCache() {
        try {
            await DatabaseService.clear('translations');
            console.log('Translation cache cleared');
            return { success: true };
        } catch (error) {
            console.error('Error clearing cache:', error);
            return { error: error.message };
        }
    }

    /**
     * Estimate character usage for text
     */
    estimateCharacterUsage(text) {
        if (!text) return 0;
        return text.length;
    }

    /**
     * Check if translation would exceed quota
     */
    async wouldExceedQuota(text, currentUsage = null) {
        if (!this.isInitialized) return false;
        
        try {
            const usage = currentUsage || await this.getUsage();
            if (usage.error) return false;
            
            const estimatedUsage = this.estimateCharacterUsage(text);
            return (usage.characterCount + estimatedUsage) > usage.characterLimit;
        } catch (error) {
            console.error('Error checking quota:', error);
            return false;
        }
    }
}

// Create singleton instance
export const deepL = new DeepLService();