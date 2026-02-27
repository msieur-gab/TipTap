// js/app.js
import { eventBus, EVENTS } from './utils/events.js';
import { ProfileService } from './services/profiles.js';
import { DatabaseService } from './services/database.js';
import { InitialDataService } from './services/initial-data.js';
import { deepL } from './services/deepl.js'; 
import { i18n } from './services/i18n.js';
import './components/OnboardingFlow.js';

class QuickMessagesApp {
    constructor() {
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            // 1. Get user settings from the database first.
            const settings = await DatabaseService.getUserSettings();
            
            // 2. Explicitly initialize the i18n service with the saved language.
            await i18n.init(settings?.sourceLanguage);

             // --> initialize DeepL if API Key exists <--
             if (settings?.deeplApiKey) {
                await deepL.initialize(settings.deeplApiKey); // FIX: This line was commented out.
            }

            // 3. Check if onboarding is complete.
            const onboardingCompleted = settings?.onboardingCompleted || false;

            if (!onboardingCompleted) {
                this.startOnboarding();
            } else {
                this.initializeApp();
            }

        } catch (error) {
            console.error('Failed to initialize app:', error);
            // Now this error message will be translated correctly.
            this.showError(i18n.t('errors.failedToInitialize'));
        }
    }

    startOnboarding() {
        const onboardingFlow = document.createElement('onboarding-flow');
        document.body.innerHTML = '';
        document.body.appendChild(onboardingFlow);

        onboardingFlow.addEventListener('onboarding-complete', async (e) => {
            const settings = e.detail;

            // 1. Save user settings
            await DatabaseService.updateUserSettings({
                sourceLanguage: settings.sourceLanguage,
                targetLanguage: settings.targetLanguage,
                deeplApiKey: settings.apiKey,
                onboardingCompleted: true
            });

            // 2. Populate initial categories and phrases
            await InitialDataService.setupInitialData(settings);
            
            // 3. Create profiles for all kids added during onboarding
            if (settings.kids && settings.kids.length > 0) {
                for (const kid of settings.kids) {
                    await ProfileService.createProfile(kid);
                }
            }

            // 4. Reload the app to start the main interface
            window.location.reload();
        });
    }

    async initializeApp() {
        if (this.isInitialized) return;
        
        console.log('Initializing Quick Messages App...');
        
        await this.initializeServices();
        this.setupGlobalEventListeners();
        this.setupProfileModalListeners();
        this.updateLightDOMTranslations();
        i18n.addListener(() => this.updateLightDOMTranslations());

        this.isInitialized = true;
        eventBus.emit(EVENTS.APP_READY);
        console.log('Quick Messages App initialized successfully!');
    }

    async initializeServices() {
        // Initialization logic can go here if needed in the future
    }

    setupGlobalEventListeners() {
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
        eventBus.on(EVENTS.APP_READY, () => console.log('App is ready!'));
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

        // Profile modal — responds to request-profile-modal from bottom-profile-selector
        document.addEventListener('request-profile-modal', (e) => {
            this.openProfileModal(e.detail?.forceCreate);
        });
    }

    openProfileModal(forceCreate = false) {
        const modal = document.querySelector('#profile-modal');
        const profileManager = document.querySelector('#profile-modal profile-manager');
        if (!modal || !profileManager) return;

        profileManager.setAttribute('mode', 'create');
        profileManager.removeAttribute('profile-id');
        modal.setAttribute('title', i18n.t('settings.createProfile'));
        modal.open();
    }

    setupProfileModalListeners() {
        const modal = document.querySelector('#profile-modal');
        const profileManager = document.querySelector('#profile-modal profile-manager');
        if (!modal || !profileManager) return;

        profileManager.addEventListener('profile-created', (e) => {
            modal.close();
            eventBus.emit(EVENTS.TOAST, { message: i18n.t('settings.profileCreated') });
            eventBus.emit(EVENTS.PROFILE_SELECTED, { profile: e.detail.profile, nickname: null });
        });

        profileManager.addEventListener('profile-updated', () => {
            modal.close();
            eventBus.emit(EVENTS.TOAST, { message: i18n.t('settings.profileUpdated') });
        });

        profileManager.addEventListener('profile-deleted', (e) => {
            modal.close();
            eventBus.emit(EVENTS.TOAST, { message: i18n.t('settings.profileDeleted') });
        });
    }

    handleKeyboard(event) {
        if (event.key === 'Escape') {
            const settingsPanel = document.querySelector('settings-panel');
            if (settingsPanel && settingsPanel.isOpen) {
                settingsPanel.close();
            }
        }
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        this.showError(i18n.t('errors.unexpectedError'));
    }

    handleUnhandledRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        this.showError(i18n.t('errors.unexpectedError'));
    }

    updateLightDOMTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = i18n.t(el.dataset.i18n);
        });
    }

    showError(message) {
        const existingError = document.querySelector('.global-error');
        if (existingError) existingError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'global-error';
        errorDiv.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background-color: var(--danger-color); color: white; padding: 1rem 2rem;
            border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => { if (errorDiv.parentElement) errorDiv.remove() }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new QuickMessagesApp();
    await app.init();
});

window.QuickMessagesApp = QuickMessagesApp;