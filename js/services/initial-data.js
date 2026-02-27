// js/services/initial-data.js
import { DatabaseService } from './database.js';

/**
 * Fetches and parses a phrase data JSON file.
 * @param {string} locale - The locale code (e.g., 'fr', 'en').
 * @returns {Promise<object>} The parsed JSON data from the phrase file.
 */
async function fetchPhraseData(locale) {
    try {
        const langCode = locale.split('-')[0].toLowerCase();
        const response = await fetch(`./data/phrases/${langCode}.json`);
        if (!response.ok) {
            console.warn(`Phrase file for '${langCode}' not found. Falling back to English.`);
            const fallbackResponse = await fetch(`./data/phrases/en.json`);
            if (!fallbackResponse.ok) throw new Error('Fallback English phrase file not found.');
            return await fallbackResponse.json();
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch phrase data for ${locale}:`, error);
        // Return a default structure to prevent the app from crashing
        return { categories: {}, phrases: {} };
    }
}

export const InitialDataService = {
    /**
     * Sets up the initial categories and phrases based on the parent's and child's languages.
     * @param {object} settings - The settings object from the onboarding flow.
     */
    async setupInitialData(settings) {
        // Use parentLanguage and the now-guaranteed targetLanguage
        const { sourceLanguage, targetLanguage } = settings;

        if (!sourceLanguage || !targetLanguage) {
            console.error("Cannot set up initial data: Missing parent or target language information.");
            return;
        }

        const parentData = await fetchPhraseData(sourceLanguage);
        const childData = await fetchPhraseData(targetLanguage);

        const categoryKeys = Object.keys(parentData.categories);

        for (const [index, key] of categoryKeys.entries()) {
            const parentPhrases = parentData.phrases[key] || [];
            const childPhrases = childData.phrases[key] || [];

            const combinedPhrases = parentPhrases.map((parentPhrase, i) => {
                const childPhrase = childPhrases[i];
                return {
                    id: parentPhrase.id,
                    sourceLang: parentPhrase.text,
                    targetLang: childPhrase ? childPhrase.text : parentPhrase.text
                };
            });

            const newCategory = {
                id: key,
                title: parentData.categories[key],
                order: index,
                phrases: combinedPhrases,
                language: sourceLanguage
            };

            await DatabaseService.put('categories', newCategory);
        }

        console.log('✅ Initial categories have been populated from phrase data files.');
    }
};