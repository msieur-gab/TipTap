// js/services/deepl.js
class DeepLService {
    constructor() {
        this.baseUrl = '/.netlify/functions';
    }

    async initialize(apiKey) {
        this.apiKey = apiKey;
        console.log('DeepL initialized with API key');
    }

    isAvailable() {
        return !!this.apiKey;
    }


    async getUsage(apiKey = null) {
        const keyToUse = apiKey || this.apiKey;
        
        if (!keyToUse) {
            throw new Error('DeepL API key is required');
        }

        try {
            
            console.log('Requesting DeepL usage for key ending with:', keyToUse.slice(-4));
            
            const response = await fetch(`${this.baseUrl}/deepl-usage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: keyToUse })
            });

            console.log('Usage response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Usage API error:', errorData);
                throw new Error(errorData.error || `Usage request failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('Raw usage data received:', data);

            // Parse the data according to DeepL API specification
            const characterCount = parseInt(data.character_count) || 0;
            const characterLimit = parseInt(data.character_limit) || 0;
            
            const usageData = {
                character_count: characterCount,
                character_limit: characterLimit,
                characterCount,
                characterLimit,
                usagePercentage: characterLimit > 0 ? 
                    Math.round((characterCount / characterLimit) * 100) : 0,
                remainingCharacters: Math.max(0, characterLimit - characterCount)
            };

            console.log('Processed usage data:', usageData);
            return usageData;

        } catch (error) {
            console.error('DeepL usage error:', error);
            throw error;
        }
    }

    async translate(text, kidLanguage, parentLanguage = 'auto', apiKey = null) {
        const keyToUse = apiKey || this.apiKey;
        
        if (!keyToUse) {
            throw new Error('DeepL API key is required for translation');
        }

        try {
            // Protect the {name} placeholder using XML tags
            const protectedText = text.replace(/{name}/g, '<notranslate>{name}</notranslate>');

            const response = await fetch(`${this.baseUrl}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: protectedText,
                    target_lang: kidLanguage,
                    source_lang: parentLanguage,
                    apiKey: keyToUse,
                    tag_handling: 'xml',
                    ignore_tags: 'notranslate'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Translation failed: ${response.status}`);
            }

            const data = await response.json();
            let translatedText = data.translations[0].text;
            
            // The API should return the tag as is, but we ensure it's clean just in case.
            translatedText = translatedText.replace(/<\/?notranslate>/g, '');

            return {
                text: translatedText,
                detectedSourceLanguage: data.translations[0].detected_source_language
            };

        } catch (error) {
            console.error('Translation error:', error);
            throw error;
        }
    }

    formatUsage(usageData) {
        if (!usageData) return null;
        
        const { characterCount, characterLimit, usagePercentage } = usageData;
        
        return {
            display: `${characterCount.toLocaleString()} / ${characterLimit.toLocaleString()} characters`,
            percentage: usagePercentage,
            remaining: (characterLimit - characterCount).toLocaleString(),
            isNearLimit: usagePercentage >= 80
        };
    }
}

// Create and export singleton
const deeplService = new DeepLService();
export { deeplService as deepL };
export default deeplService;