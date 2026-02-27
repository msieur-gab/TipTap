import { DatabaseService } from './database.js';
import { DEFAULT_CATEGORIES } from '../config/defaults.js';
import { eventBus, EVENTS } from '../utils/events.js';
import { generateId } from '../utils/helpers.js';

export const MessageService = {
  
    async getAllCategories() {
        return await DatabaseService.getAllCategories();
    },

    async createCategory(title) {
        const categories = await this.getAllCategories();
        const newCategory = {
            id: generateId(),
            title,
            order: categories.length,
            phrases: []
        };
        
        await DatabaseService.put('categories', newCategory);
        eventBus.emit(EVENTS.CATEGORIES_UPDATED);
        return newCategory;
    },

    async updateCategory(id, updates) {
        await DatabaseService.update('categories', id, updates);
        eventBus.emit(EVENTS.CATEGORIES_UPDATED);
    },

    async deleteCategory(id) {
        await DatabaseService.delete('categories', id);
        eventBus.emit(EVENTS.CATEGORIES_UPDATED);
    },

    async addPhrase(categoryId, sourceLangText, targetLangText) {
        const category = await DatabaseService.get('categories', categoryId);
        if (category) {
            const phrase = {
                id: generateId(),
                sourceLang: sourceLangText,
                targetLang: targetLangText
            };
            category.phrases.push(phrase);
            await DatabaseService.put('categories', category);
            eventBus.emit(EVENTS.CATEGORIES_UPDATED);
            return phrase;
        }
    },

    async updatePhrase(categoryId, phraseId, updates) {
        const category = await DatabaseService.get('categories', categoryId);
        if (category) {
            const phrase = category.phrases.find(p => String(p.id) === String(phraseId));
            if (phrase) {
                Object.assign(phrase, updates);
                await DatabaseService.put('categories', category);
                eventBus.emit(EVENTS.CATEGORIES_UPDATED);
            }
        }
    },

    async deletePhrase(categoryId, phraseId) {
        const category = await DatabaseService.get('categories', categoryId);
        if (category) {
            category.phrases = category.phrases.filter(p => String(p.id) !== String(phraseId));
            await DatabaseService.put('categories', category);
            eventBus.emit(EVENTS.CATEGORIES_UPDATED);
        }
    }
};