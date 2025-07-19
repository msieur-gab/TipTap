import { DatabaseService } from './database.js';
// import { DEFAULT_PROFILES } from '../config/defaults.js';
import { eventBus, EVENTS } from '../utils/events.js';
import { generateId } from '../utils/helpers.js';

export const ProfileService = {
    // The initialize method is no longer needed. Onboarding handles the first profile.
    
    async getAllProfiles() {
        return await DatabaseService.getAllProfiles();
    },

    /**
     * Creates a new profile from data collected during onboarding.
     * @param {object} profileData - The kid's profile data from onboarding.
     */
    async createProfile(profileData) {
        const { name, displayName, mainTranslation, language, timezone, birthdate, avatar } = profileData;
        const finalDisplayName = displayName || name;

        const newProfile = {
            id: generateId(),
            displayName: finalDisplayName,
            mainTranslation: mainTranslation || finalDisplayName, // Fallback to name
            language: language,
            timezone: timezone,
            birthdate: birthdate,
            image: avatar || `https://placehold.co/64x64/ccc/333?text=${displayName.charAt(0)}`,
            nicknames: []
        };
        
        await DatabaseService.put('profiles', newProfile);
        eventBus.emit(EVENTS.PROFILES_UPDATED);
        return newProfile;
    },

    async updateProfile(id, updates) {
        await DatabaseService.update('profiles', id, updates);
        eventBus.emit(EVENTS.PROFILES_UPDATED);
    },

    async deleteProfile(id) {
        await DatabaseService.delete('profiles', id);
        eventBus.emit(EVENTS.PROFILES_UPDATED);
    },

    async addNickname(profileId, display, targetLangValue) {
        const profile = await DatabaseService.get('profiles', profileId);
        if (profile) {
            const nickname = {
                id: generateId(),
                display,
                baseLang_value: display,
                targetLang_value: targetLangValue
            };
            if (!profile.nicknames) profile.nicknames = [];
            profile.nicknames.push(nickname);
            await DatabaseService.put('profiles', profile);
            eventBus.emit(EVENTS.PROFILES_UPDATED);
            return nickname;
        }
    },

    async updateNickname(profileId, nicknameId, updates) {
        const profile = await DatabaseService.get('profiles', profileId);
        if (profile && profile.nicknames) {
            const nickname = profile.nicknames.find(n => String(n.id) === String(nicknameId));
            if (nickname) {
                Object.assign(nickname, updates);
                await DatabaseService.put('profiles', profile);
                eventBus.emit(EVENTS.PROFILES_UPDATED);
            }
        }
    },

    async deleteNickname(profileId, nicknameId) {
        const profile = await DatabaseService.get('profiles', profileId);
        if (profile && profile.nicknames) {
            profile.nicknames = profile.nicknames.filter(n => String(n.id) !== String(nicknameId));
            await DatabaseService.put('profiles', profile);
            eventBus.emit(EVENTS.PROFILES_UPDATED);
        }
    }
};