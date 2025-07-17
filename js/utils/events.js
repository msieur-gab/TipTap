// Simple EventBus for component communication
class EventBus {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
}

// Global EventBus instance
export const eventBus = new EventBus();

// Event constants
export const EVENTS = {
    PROFILE_SELECTED: 'profile:selected',
    NICKNAME_SELECTED: 'nickname:selected',
    PROFILES_UPDATED: 'profiles:updated',
    CATEGORIES_UPDATED: 'categories:updated',
    MESSAGE_COPIED: 'message:copied',
    SETTINGS_TOGGLE: 'settings:toggle',
    // VIEW_CHANGED: 'view:changed',
    APP_READY: 'app:ready'
};