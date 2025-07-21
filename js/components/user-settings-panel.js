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
        this.usage = { character_count: 0, character_limit: 500000 };
        this.boundUpdateData = this.loadData.bind(this);
        // ADDED: Bound listener for i18n
        this.boundUpdateContent = this.updateContent.bind(this);
    }

    async connectedCallback() {
        this.render(); // Initial render with placeholders
        this.setupEventListeners();
        await this.loadData(); // Load data and re-render
        eventBus.on(EVENTS.PROFILES_UPDATED, this.boundUpdateData);
        // ADDED: Add i18n listener
        i18n.addListener(this.boundUpdateContent);
    }

    disconnectedCallback() {
        eventBus.off(EVENTS.PROFILES_UPDATED, this.boundUpdateData);
        // ADDED: Remove i18n listener
        i18n.removeListener(this.boundUpdateContent);
    }

    async loadData() {
        this.settings = await DatabaseService.getUserSettings();
        this.profiles = await ProfileService.getAllProfiles();
        
        if (this.settings.deeplApiKey) {
            await deepL.initialize(this.settings.deeplApiKey);
            try {
                // FIX: Call getUsage() correctly and handle the response
                const usageData = await deepL.getUsage();
                console.log('DeepL usage data:', usageData);
                
                // Handle both possible response formats
                if (usageData && typeof usageData === 'object') {
                    if ('characterCount' in usageData) {
                        // New format
                        this.usage = usageData;
                    } else if ('character_count' in usageData) {
                        // Old format - convert it
                        this.usage = {
                            character_count: usageData.character_count,
                            character_limit: usageData.character_limit
                        };
                    } else {
                        this.usage = { character_count: 0, character_limit: 500000 };
                    }
                } else {
                    this.usage = { character_count: 0, character_limit: 500000 };
                }
            } catch (error) {
                console.error('Failed to load DeepL usage:', error);
                this.usage = { character_count: 0, character_limit: 500000 };
            }
        } else {
            this.usage = { character_count: 0, character_limit: 500000 };
        }
    
        this.render(); // Re-render with the loaded data
    }

    // ADDED: New method to handle translations
    updateContent() {
        this.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = i18n.t(el.dataset.i18n);
        });
        this.shadowRoot.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = i18n.t(el.dataset.i18nPlaceholder);
        });
        
        // Handle interpolated strings
        const usageDetails = this.shadowRoot.querySelector('.usage-details span:first-child');
        if (usageDetails) {
            const usageCount = this.usage?.character_count ?? 0;
            const usageLimit = this.usage?.character_limit ?? 500000;
            usageDetails.textContent = i18n.t('settings.usageCounter', { 
                count: usageCount.toLocaleString(), 
                limit: usageLimit.toLocaleString() 
            });
        }
    }

    setupEventListeners() {
        const form = this.shadowRoot.querySelector('#settings-form');
        if (form) {
            form.addEventListener('submit', this.handleSave.bind(this));
        }

        const toggle = this.shadowRoot.querySelector('#translation-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const isActive = toggle.classList.toggle('active');
                const apiKeyGroup = this.shadowRoot.querySelector('#api-key-group');
                if (apiKeyGroup) {
                    apiKeyGroup.style.display = isActive ? 'block' : 'none';
                }
            });
        }

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
        const apiKeyInput = form.querySelector('#api-key');

        const newSettings = {
            userName: form.querySelector('#user-name').value,
            userSignature: form.querySelector('#user-signature').value,
            deeplApiKey: useTranslation ? apiKeyInput.value : null,
        };

        await DatabaseService.updateUserSettings(newSettings);
        await deepL.initialize(newSettings.deeplApiKey);

        const saveButton = form.querySelector('.primary-button');
        saveButton.textContent = i18n.t('common.saved'); // Use i18n for feedback
        setTimeout(() => { saveButton.textContent = i18n.t('common.save'); }, 2000);
        
        await this.loadData();
    }
    
    render() {
        const usageCount = this.usage?.character_count ?? 0;
        const usageLimit = this.usage?.character_limit ?? 500000;
        const usagePercentage = usageLimit > 0 ? (usageCount / usageLimit) * 100 : 0;
        const useTranslation = !!this.settings.deeplApiKey;

        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                .settings-content { padding: 1.5rem; }
                .card {
                    background: var(--container-color, #fff); border-radius: 16px;
                    padding: 1.5rem; margin-bottom: 1.5rem;
                    border: 1px solid var(--color-border, #e5e7eb);
                }
                .card h3 {
                    font-size: 1.1rem; font-weight: 600; margin-top: 0;
                    margin-bottom: 1rem; color: var(--color-text-dark, #1f2937);
                }
                .form-group { margin-bottom: 1rem; }
                .form-group:last-child { margin-bottom: 0; }
                .form-group label {
                    display: block; font-size: 0.875rem; font-weight: 500;
                    color: var(--color-text-light, #6b7280); margin-bottom: 0.5rem;
                }
                .styled-input {
                    width: 100%; box-sizing: border-box; background-color: #f9fafb;
                    border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px;
                    padding: 0.875rem 1rem; font-size: 1rem; font-family: inherit;
                    color: var(--color-text-dark, #1f2937);
                }
                .primary-button {
                    width: 100%; padding: 1rem; border: none;
                    background-color: var(--color-text-dark, #1f2937);
                    color: var(--primary-text-color, #fff); border-radius: 12px;
                    cursor: pointer; font-weight: 600; font-size: 1rem; margin-top: 0.5rem;
                }
                .toggle-container {
                    display: flex; justify-content: space-between; align-items: center;
                    background-color: #f9fafb; padding: 1rem; border-radius: 12px; margin-bottom: 1rem;
                }
                .toggle-info h4 { font-size: 1rem; font-weight: 600; color: var(--color-text-dark, #1f2937); margin: 0 0 0.25rem 0; }
                .toggle-info p { font-size: 0.875rem; color: var(--color-text-light, #6b7280); margin: 0; }
                .toggle-switch {
                    position: relative; width: 52px; height: 32px; background: #e5e7eb;
                    border-radius: 16px; cursor: pointer; transition: background 0.3s ease; flex-shrink: 0;
                }
                .toggle-switch.active { background: var(--primary-color, #2563eb); }
                .toggle-knob {
                    position: absolute; top: 2px; left: 2px; width: 28px; height: 28px;
                    background: white; border-radius: 14px; transition: transform 0.3s ease;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .toggle-switch.active .toggle-knob { transform: translateX(20px); }
                .usage-quota-container { font-size: 0.875rem; color: var(--color-text-light, #6b7280); }
                .usage-bar-wrapper {
                    width: 100%; background-color: #e5e7eb; border-radius: 8px;
                    height: 12px; overflow: hidden; margin: 0.5rem 0;
                }
                .usage-bar {
                    width: ${usagePercentage.toFixed(2)}%; height: 100%;
                    background-color: var(--primary-color, #2563eb); border-radius: 8px;
                    transition: width 0.5s ease;
                }
                .usage-details { display: flex; justify-content: space-between; }
                .profile-list-item {
                    display: flex; align-items: center; padding: 1rem;
                    border-radius: 12px; background-color: #f8fafc; margin-bottom: 0.75rem;
                }
                .profile-avatar {
                    width: 48px; height: 48px; border-radius: 50%;
                    margin-right: 1rem; object-fit: cover;
                }
                .profile-info { flex-grow: 1; }
                .profile-info .name { font-weight: 600; color: var(--color-text-dark, #1f2937); }
                .profile-info .translation { font-size: 0.9rem; color: var(--color-text-light, #6b7280); }
                .edit-profile-btn {
                    background: none; border: 1px solid var(--color-border, #e5e7eb);
                    color: var(--color-text-dark, #1f2937); border-radius: 8px;
                    padding: 0.5rem 1rem; font-weight: 500; cursor: pointer;
                }
            </style>
            <div class="settings-content">
                <form id="settings-form">
                    <div class="card">
                        <h3 data-i18n="settings.yourProfile">Your Profile</h3>
                        <div class="form-group">
                            <label for="user-name" data-i18n="settings.yourName">Your Name</label>
                            <input type="text" id="user-name" name="user-name" class="styled-input" value="${this.settings.userName || ''}" data-i18n-placeholder="settings.yourNamePlaceholder">
                        </div>
                        <div class="form-group">
                            <label for="user-signature" data-i18n="settings.messageSignature">Message Signature</label>
                            <input type="text" id="user-signature" name="user-signature" class="styled-input" value="${this.settings.userSignature || ''}" data-i18n-placeholder="settings.messageSignaturePlaceholder">
                        </div>
                    </div>

                    <div class="card">
                        <h3 data-i18n="settings.translationService">Translation Service</h3>
                        <div class="toggle-container">
                            <div class="toggle-info">
                                <h4 data-i18n="settings.enableTranslation">Enable Translation</h4>
                                <p data-i18n="settings.enableTranslationDesc">Use DeepL for automatic translations</p>
                            </div>
                            <div class="toggle-switch ${useTranslation ? 'active' : ''}" id="translation-toggle">
                                <div class="toggle-knob"></div>
                            </div>
                        </div>
                        <div class="form-group" id="api-key-group" style="display: ${useTranslation ? 'block' : 'none'}">
                            <label for="api-key" data-i18n="settings.apiKey">DeepL API Key</label>
                            <input type="password" id="api-key" name="api-key" class="styled-input" value="${this.settings.deeplApiKey || ''}">
                        </div>
                        <div class="usage-quota-container">
                            <label data-i18n="settings.monthlyUsage">Monthly Usage</label>
                            <div class="usage-bar-wrapper">
                                <div class="usage-bar"></div>
                            </div>
                            <div class="usage-details">
                                <span>${i18n.t('settings.usageCounter', { count: usageCount.toLocaleString(), limit: usageLimit.toLocaleString() })}</span>
                                <span>${usagePercentage.toFixed(0)}%</span>
                            </div>
                        </div>
                        <button type="submit" class="primary-button" data-i18n="common.save">Save Settings</button>
                    </div>
                </form>

                <div class="card">
                    <h3 data-i18n="settings.manageProfiles">Manage Profiles</h3>
                    <div class="profile-list">
                        ${this.profiles.map(profile => `
                            <div class="profile-list-item" data-profile-id="${profile.id}">
                                <img src="${profile.image || `https://placehold.co/48x48/ccc/333?text=${profile.originalName.charAt(0)}`}" alt="Avatar" class="profile-avatar">
                                <div class="profile-info">
                                    <div class="name">${profile.originalName}</div>
                                    <div class="translation">${profile.translatedName || ''}</div>
                                </div>
                                <button class="edit-profile-btn" data-i18n="common.edit">Edit</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        // ADDED: Call updateContent after rendering to apply translations
        this.updateContent();
    }
}

customElements.define('user-settings-panel', UserSettingsPanel);
