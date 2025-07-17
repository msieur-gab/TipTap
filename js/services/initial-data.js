// js/services/initial-data.js
import { DatabaseService } from './database.js';

/**
 * Fetches and parses a locale JSON file.
 * @param {string} locale - The locale code (e.g., 'fr', 'en').
 * @returns {Promise<object>} The parsed JSON data from the locale file.
 */
async function fetchLocaleData(locale) {
    try {
        const langCode = locale.split('-')[0].toLowerCase();
        const response = await fetch(`./locales/${langCode}.json`);
        if (!response.ok) {
            console.warn(`Locale file for '${langCode}' not found. Falling back to English.`);
            const fallbackResponse = await fetch(`./locales/en.json`);
            if (!fallbackResponse.ok) throw new Error('Fallback English locale not found.');
            return await fallbackResponse.json();
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch locale data for ${locale}:`, error);
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
        const { parentLanguage, kids } = settings;
        if (!parentLanguage || !kids || kids.length === 0) {
            console.error("Cannot set up initial data: Missing parent or child language information.");
            return;
        }
        // Use the language of the first child for initial setup
        const childLanguage = kids[0].language;

        // Fetch data from both language files
        const parentData = await fetchLocaleData(parentLanguage);
        const childData = await fetchLocaleData(childLanguage);

        const categoryKeys = Object.keys(parentData.categories);

        for (const [index, key] of categoryKeys.entries()) {
            const parentPhrases = parentData.phrases[key] || [];
            const childPhrases = childData.phrases[key] || [];

            // Combine phrases from both languages
            const combinedPhrases = parentPhrases.map((parentPhrase, i) => {
                const childPhrase = childPhrases[i];
                return {
                    id: parentPhrase.id,
                    baseLang: parentPhrase.text,
                    targetLang: childPhrase ? childPhrase.text : parentPhrase.text // Fallback to parent's text if child's is missing
                };
            });

            const newCategory = {
                id: key,
                title: parentData.categories[key],
                order: index,
                phrases: combinedPhrases,
                language: parentLanguage // The "language" of the category itself is the parent's
            };

            await DatabaseService.put('categories', newCategory);
        }

        console.log('✅ Initial categories have been populated from locale files.');
    }
};