import { eventBus, EVENTS } from '../utils/events.js';
import { i18n } from '../services/i18n.js';
import { DatabaseService } from '../services/database.js';
import { deepL } from '../services/deepl.js';
import { ProfileService } from '../services/profiles.js';

class UserSettingsPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.settings = {};
        this.profiles = [];
        this.usage = { character_count: 0, character_limit: 500000, error: false };
        this.boundUpdateData = this.loadData.bind(this);
        this.boundUpdateContent = this.updateUIWithData.bind(this); // Rerender UI on lang change
    }

    async connectedCallback() {
        this.render(); // Render the static shell of the component ONCE
        this.setupEventListeners();
        await this.loadData(); // Fetch data and populate the shell
        eventBus.on(EVENTS.PROFILES_UPDATED, this.boundUpdateData);
        i18n.addListener(this.boundUpdateContent);
    }

    disconnectedCallback() {
        eventBus.off(EVENTS.PROFILES_UPDATED, this.boundUpdateData);
        i18n.removeListener(this.boundUpdateContent);
    }

    async loadData() {
        this.settings = await DatabaseService.getUserSettings();
        this.profiles = await ProfileService.getAllProfiles();
        
        if (this.settings.deeplApiKey) {
            // Pass API key directly as you intended
            const usageData = await deepL.getUsage(this.settings.deeplApiKey);
            if (usageData.error) {
                console.error("Could not fetch DeepL usage:", usageData.error);
                this.usage = { character_count: 0, character_limit: 500000, error: true };
            } else {
                this.usage = { ...usageData, error: false };
            }
        } else {
            this.usage = { character_count: 0, character_limit: 500000, error: false };
        }
    
        this.updateUIWithData(); // Populate the component with the new data
    }

    setupEventListeners() {
        const form = this.shadowRoot.querySelector('#settings-form');
        form?.addEventListener('submit', this.handleSave.bind(this));

        const toggle = this.shadowRoot.querySelector('#translation-toggle');
        toggle?.addEventListener('click', () => {
            const isActive = toggle.classList.toggle('active');
            const apiKeyGroup = this.shadowRoot.querySelector('#api-key-group');
            if (apiKeyGroup) {
                apiKeyGroup.style.display = isActive ? 'block' : 'none';
            }
        });

        // Use event delegation for profile edit buttons
        this.shadowRoot.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-profile-btn');
            if (editButton) {
                const profileId = editButton.closest('.profile-list-item').dataset.profileId;
                const profileManager = document.querySelector('floating-action-button')?.shadowRoot.querySelector('profile-manager');
                const profileModal = document.querySelector('floating-action-button')?.shadowRoot.querySelector('#profile-management-modal');

                if (profileManager && profileModal) {
                    this.closest('settings-panel').close();
                    profileManager.setAttribute('mode', 'edit');
                    profileManager.setAttribute('profile-id', profileId);
                    profileModal.showModal();
                }
            }
        });
    }

    async handleSave(e) {
        e.preventDefault();
        const form = e.target;
        const useTranslation = this.shadowRoot.querySelector('#translation-toggle').classList.contains('active');
        
        const newSettings = {
            userName: form.querySelector('#user-name').value,
            userSignature: form.querySelector('#user-signature').value,
            deeplApiKey: useTranslation ? form.querySelector('#api-key').value : null,
        };
    
        await DatabaseService.updateUserSettings(newSettings);
    
        const saveButton = form.querySelector('.primary-button');
        saveButton.textContent = i18n.t('common.saved');
        setTimeout(() => { saveButton.textContent = i18n.t('common.save'); }, 2000);
        
        await this.loadData();
    }
    
    // This method only updates the dynamic parts of the component
    updateUIWithData() {
        // Update form values
        this.shadowRoot.querySelector('#user-name').value = this.settings.userName || '';
        this.shadowRoot.querySelector('#user-signature').value = this.settings.userSignature || '';
        this.shadowRoot.querySelector('#api-key').value = this.settings.deeplApiKey || '';

        // Update toggle state
        const useTranslation = !!this.settings.deeplApiKey;
        const toggle = this.shadowRoot.querySelector('#translation-toggle');
        const apiKeyGroup = this.shadowRoot.querySelector('#api-key-group');
        toggle.classList.toggle('active', useTranslation);
        apiKeyGroup.style.display = useTranslation ? 'block' : 'none';
        
        // Update usage bar
        const usageCount = this.usage?.character_count ?? 0;
        const usageLimit = this.usage?.character_limit ?? 500000;
        const usagePercentage = usageLimit > 0 ? (usageCount / usageLimit) * 100 : 0;
        
        const usageBar = this.shadowRoot.querySelector('.usage-bar');
        if(usageBar) usageBar.style.width = `${usagePercentage.toFixed(2)}%`;

        const usageDetails = this.shadowRoot.querySelector('.usage-details span:first-child');
        if(usageDetails) usageDetails.textContent = i18n.t('settings.usageCounter', { count: usageCount.toLocaleString(), limit: usageLimit.toLocaleString() });
        
        const usagePercentSpan = this.shadowRoot.querySelector('.usage-details span:last-child');
        if(usagePercentSpan) usagePercentSpan.textContent = `${usagePercentage.toFixed(0)}%`;

        // Update error message visibility
        const errorContainer = this.shadowRoot.querySelector('.usage-error-container');
        errorContainer.style.display = this.usage.error ? 'block' : 'none';
        this.shadowRoot.querySelector('.usage-display-container').style.display = this.usage.error ? 'none' : 'block';

        // Re-render profile list
        const profileList = this.shadowRoot.querySelector('.profile-list');
        profileList.innerHTML = this.profiles.map(profile => `
            <div class="profile-list-item" data-profile-id="${profile.id}">
                <img src="${profile.image || `https://placehold.co/48x48/ccc/333?text=${profile.originalName.charAt(0)}`}" alt="Avatar" class="profile-avatar">
                <div class="profile-info">
                    <div class="name">${profile.originalName}</div>
                    <div class="translation">${profile.translatedName || ''}</div>
                </div>
                <button class="edit-profile-btn" data-i18n="common.edit">Edit</button>
            </div>
        `).join('');

        // Apply all translations
        this.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = i18n.t(el.dataset.i18n);
        });
        this.shadowRoot.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = i18n.t(el.dataset.i18nPlaceholder);
        });
    }

    // This method builds the component's structure once
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                .settings-content { padding: 1.5rem; }
                .card { background: var(--container-color, #fff); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid var(--color-border, #e5e7eb); }
                h3 { font-size: 1.1rem; font-weight: 600; margin: 0 0 1rem 0; color: var(--color-text-dark, #1f2937); }
                .form-group { margin-bottom: 1rem; }
                .form-group:last-child { margin-bottom: 0; }
                label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--color-text-light, #6b7280); margin-bottom: 0.5rem; }
                .styled-input { width: 100%; box-sizing: border-box; background-color: #f9fafb; border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; padding: 0.875rem 1rem; font-size: 1rem; font-family: inherit; color: var(--color-text-dark, #1f2937); }
                .primary-button { width: 100%; padding: 1rem; border: none; background-color: var(--color-text-dark, #1f2937); color: var(--primary-text-color, #fff); border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; margin-top: 0.5rem; }
                .toggle-container { display: flex; justify-content: space-between; align-items: center; background-color: #f9fafb; padding: 1rem; border-radius: 12px; margin-bottom: 1rem; }
                .toggle-info h4 { font-size: 1rem; font-weight: 600; color: var(--color-text-dark, #1f2937); margin: 0 0 0.25rem 0; }
                .toggle-info p { font-size: 0.875rem; color: var(--color-text-light, #6b7280); margin: 0; }
                .toggle-switch { position: relative; width: 52px; height: 32px; background: #e5e7eb; border-radius: 16px; cursor: pointer; transition: background 0.3s ease; flex-shrink: 0; }
                .toggle-switch.active { background: var(--primary-color, #2563eb); }
                .toggle-knob { position: absolute; top: 2px; left: 2px; width: 28px; height: 28px; background: white; border-radius: 14px; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                .toggle-switch.active .toggle-knob { transform: translateX(20px); }
                .usage-quota-container { font-size: 0.875rem; color: var(--color-text-light, #6b7280); }
                .usage-bar-wrapper { width: 100%; background-color: #e5e7eb; border-radius: 8px; height: 12px; overflow: hidden; margin: 0.5rem 0; }
                .usage-bar { width: 0%; height: 100%; background-color: var(--primary-color, #2563eb); border-radius: 8px; transition: width 0.5s ease; }
                .usage-details { display: flex; justify-content: space-between; }
                .profile-list-item { display: flex; align-items: center; padding: 1rem; border-radius: 12px; background-color: #f8fafc; margin-bottom: 0.75rem; }
                .profile-avatar { width: 48px; height: 48px; border-radius: 50%; margin-right: 1rem; object-fit: cover; }
                .profile-info { flex-grow: 1; }
                .profile-info .name { font-weight: 600; color: var(--color-text-dark, #1f2937); }
                .profile-info .translation { font-size: 0.9rem; color: var(--color-text-light, #6b7280); }
                .edit-profile-btn { background: none; border: 1px solid var(--color-border, #e5e7eb); color: var(--color-text-dark, #1f2937); border-radius: 8px; padding: 0.5rem 1rem; font-weight: 500; cursor: pointer; }
                .error-message { background-color: #fff1f2; color: #be123c; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; text-align: center; }
            </style>
            <div class="settings-content">
                <form id="settings-form">
                    <div class="card">
                        <h3 data-i18n="settings.yourProfile">Your Profile</h3>
                        <div class="form-group">
                            <label for="user-name" data-i18n="settings.yourName">Your Name</label>
                            <input type="text" id="user-name" name="user-name" class="styled-input" data-i18n-placeholder="settings.yourNamePlaceholder">
                        </div>
                        <div class="form-group">
                            <label for="user-signature" data-i18n="settings.messageSignature">Message Signature</label>
                            <input type="text" id="user-signature" name="user-signature" class="styled-input" data-i18n-placeholder="settings.messageSignaturePlaceholder">
                        </div>
                    </div>

                    <div class="card">
                        <h3 data-i18n="settings.translationService">Translation Service</h3>
                        <div class="toggle-container">
                            <div class="toggle-info">
                                <h4 data-i18n="settings.enableTranslation">Enable Translation</h4>
                                <p data-i18n="settings.enableTranslationDesc">Use DeepL for automatic translations</p>
                            </div>
                            <div class="toggle-switch" id="translation-toggle">
                                <div class="toggle-knob"></div>
                            </div>
                        </div>
                        <div class="form-group" id="api-key-group" style="display: none;">
                            <label for="api-key" data-i18n="settings.apiKey">DeepL API Key</label>
                            <input type="password" id="api-key" name="api-key" class="styled-input">
                        </div>
                        <div class="usage-quota-container">
                            <label data-i18n="settings.monthlyUsage">Monthly Usage</label>
                            <div class="usage-error-container" style="display: none;">
                                <div class="error-message" data-i18n="settings.usageError">Could not retrieve usage data.</div>
                            </div>
                            <div class="usage-display-container">
                                <div class="usage-bar-wrapper">
                                    <div class="usage-bar"></div>
                                </div>
                                <div class="usage-details">
                                    <span>...</span>
                                    <span>...</span>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="primary-button" data-i18n="common.save">Save Settings</button>
                    </div>
                </form>

                <div class="card">
                    <h3 data-i18n="settings.manageProfiles">Manage Profiles</h3>
                    <div class="profile-list"></div>
                </div>
            </div>
        `;
    }
}

customElements.define('user-settings-panel', UserSettingsPanel);
