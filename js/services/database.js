// js/services/database.js
// Database service using Dexie with enhanced i18n and translation support
class TipTapApp extends Dexie {
    constructor() {
        super('TipTapApp');

        // Version 1 - Original schema (kept for Dexie upgrade path)
        this.version(1).stores({
            userSettings: 'id, userName, userSignature, sourceLanguage, targetLanguage, deeplApiKey, deeplUsage, onboardingCompleted',
            profiles: 'id, originalName, translatedName, timezone, birthdate, nicknames',
            categories: 'id, title, order, phrases',
            translations: 'hash, sourceText, sourceLang, targetLang, translatedText, timestamp'
        });

        // Version 2 - Rename to domain vocabulary
        this.version(2).stores({
            userSettings: 'id, userName, userSignature, parentLanguage, kidLanguage, deeplApiKey, deeplUsage, onboardingCompleted',
            profiles: 'id, originalName, translatedName, timezone, birthdate, nicknames',
            categories: 'id, title, order, phrases',
            translations: 'hash, sourceText, parentLang, kidLang, translatedText, timestamp'
        }).upgrade(tx => {
            // Migrate userSettings fields
            tx.table('userSettings').toCollection().modify(record => {
                if ('sourceLanguage' in record) {
                    record.parentLanguage = record.sourceLanguage;
                    delete record.sourceLanguage;
                }
                if ('targetLanguage' in record) {
                    record.kidLanguage = record.targetLanguage;
                    delete record.targetLanguage;
                }
            });

            // Migrate category phrase fields
            tx.table('categories').toCollection().modify(record => {
                if (record.phrases) {
                    record.phrases = record.phrases.map(phrase => {
                        const updated = { ...phrase };
                        if ('baseLang' in updated) {
                            updated.parentLang = updated.baseLang;
                            delete updated.baseLang;
                        }
                        if ('targetLang' in updated) {
                            updated.kidLang = updated.targetLang;
                            delete updated.targetLang;
                        }
                        return updated;
                    });
                }
            });

            // Migrate profile nickname fields
            tx.table('profiles').toCollection().modify(record => {
                if (record.nicknames) {
                    record.nicknames = record.nicknames.map(nick => {
                        const updated = { ...nick };
                        if ('baseLang_value' in updated) {
                            updated.parentLang_value = updated.baseLang_value;
                            delete updated.baseLang_value;
                        }
                        if ('targetLang_value' in updated) {
                            updated.kidLang_value = updated.targetLang_value;
                            delete updated.targetLang_value;
                        }
                        return updated;
                    });
                }
            });

            // Migrate translations table fields
            tx.table('translations').toCollection().modify(record => {
                if ('sourceLang' in record) {
                    record.parentLang = record.sourceLang;
                    delete record.sourceLang;
                }
                if ('targetLang' in record) {
                    record.kidLang = record.targetLang;
                    delete record.targetLang;
                }
            });
        });
    }
}

export const db = new TipTapApp();

// Enhanced database operations
export const DatabaseService = {
    // Generic operations
    async get(table, id) { return await db[table].get(id); },
    async getAll(table) { return await db[table].toArray(); },
    async add(table, data) { return await db[table].add(data); },
    async update(table, id, data) { return await db[table].update(id, data); },
    async put(table, data) { return await db[table].put(data); },
    async delete(table, id) { return await db[table].delete(id); },
    async clear(table) { return await db[table].clear(); },


    // Specific operations
    async getAllProfiles() {
        return await this.getAll('profiles');
    },

    async getAllCategories() {
        const categories = await this.getAll('categories');
        return categories.sort((a, b) => a.order - b.order);
    },

    // User Settings operations
    async getUserSettings() {
        let settings = await this.get('userSettings', 'global');
        if (!settings) {
            // Create default settings if they don't exist
            settings = {
                id: 'global',
                userName: '',
                userSignature: '',
                parentLanguage: 'en',
                kidLanguage: 'zh',
                deeplApiKey: null,
                deeplUsage: { 
                    characterCount: 0, 
                    characterLimit: 500000, 
                    lastUpdated: Date.now() 
                },
                onboardingCompleted: false
            };
            await this.put('userSettings', settings);
        }
        return settings;
    },

    async updateUserSettings(updates) {
        const currentSettings = await this.getUserSettings();
        const updatedSettings = { ...currentSettings, ...updates };
        await this.put('userSettings', updatedSettings);
        return updatedSettings;
    },

    async setOnboardingCompleted(completed = true) {
        return await this.updateUserSettings({ onboardingCompleted: completed });
    },

    async isOnboardingCompleted() {
        const settings = await this.getUserSettings();
        return settings.onboardingCompleted || false;
    },

    // Translation cache operations
    async getTranslation(hash) {
        return await this.get('translations', hash);
    },

    async saveTranslation(translationData) {
        return await this.put('translations', translationData);
    },

    async getAllTranslations() {
        return await this.getAll('translations');
    },

    async clearTranslationCache() {
        return await this.clear('translations');
    },

    // DeepL usage tracking
    async updateDeepLUsage(characterCount, characterLimit = 500000) {
        const usage = {
            characterCount,
            characterLimit,
            lastUpdated: Date.now()
        };
        await this.updateUserSettings({ deeplUsage: usage });
        return usage;
    },

    async getDeepLUsage() {
        const settings = await this.getUserSettings();
        return settings.deeplUsage || { 
            characterCount: 0, 
            characterLimit: 500000, 
            lastUpdated: Date.now() 
        };
    },

    // Utility functions
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    },

    // Backup and restore
    async exportData() {
        const data = {
            profiles: await this.getAllProfiles(),
            categories: await this.getAllCategories(),
            userSettings: await this.getUserSettings(),
            translations: await this.getAllTranslations(),
            exportDate: new Date().toISOString(),
            version: 3
        };
        return data;
    },

    async importData(data) {
        if (!data || !data.version) {
            throw new Error('Invalid backup data');
        }

        try {
            // Clear existing data
            await this.clear('profiles');
            await this.clear('categories');
            await this.clear('userSettings');
            
            // Import data
            if (data.profiles) {
                for (const profile of data.profiles) {
                    await this.put('profiles', profile);
                }
            }
            
            if (data.categories) {
                for (const category of data.categories) {
                    await this.put('categories', category);
                }
            }
            
            if (data.userSettings) {
                await this.put('userSettings', data.userSettings);
            }

            console.log('Data import completed');
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }
};