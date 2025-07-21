// js/services/deepl.js
class DeepLService {
    constructor() {
        this.baseUrl = '/.netlify/functions';
    }

    async translateText(text, targetLanguage, sourceLanguage = 'auto', apiKey) {
        if (!apiKey) {
            throw new Error('DeepL API key is required for translation');
        }

        try {
            const response = await fetch(`${this.baseUrl}/deepl-translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    target_lang: targetLanguage,
                    source_lang: sourceLanguage,
                    apiKey
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Translation failed: ${response.status}`);
            }

            const data = await response.json();
            return {
                translatedText: data.translations[0].text,
                detectedSourceLanguage: data.translations[0].detected_source_language
            };

        } catch (error) {
            console.error('Translation error:', error);
            throw error;
        }
    }

    async getUsage(apiKey) {
        if (!apiKey) {
            throw new Error('DeepL API key is required');
        }

        try {
            console.log('Requesting DeepL usage for key ending with:', apiKey.slice(-4));
            
            const response = await fetch(`${this.baseUrl}/deepl-usage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey })
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