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
    }

    async connectedCallback() {
        this.render(); // Initial render with placeholders
        await this.loadData();
        this.setupEventListeners();
        eventBus.on(EVENTS.PROFILES_UPDATED, this.boundUpdateData);
    }

    disconnectedCallback() {
        eventBus.off(EVENTS.PROFILES_UPDATED, this.boundUpdateData);
    }

    async loadData() {
        this.settings = await DatabaseService.getUserSettings();
        this.profiles = await ProfileService.getAllProfiles();
        
        // Only fetch usage if the API key is set
        if (this.settings.deeplApiKey) {
            // Make sure deepl service is initialized before getting usage
            await deepL.initialize(this.settings.deeplApiKey);
            this.usage = await deepL.getUsage();
        } else {
            this.usage = { character_count: 0, character_limit: 500000 };
        }

        this.render(); // Re-render with the loaded data
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
                this.shadowRoot.querySelector('#api-key-group').style.display = isActive ? 'block' : 'none';
            });
        }

        this.shadowRoot.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-profile-btn');
            if (editButton) {
                const profileId = editButton.closest('.profile-list-item').dataset.profileId;
                // This event will be caught by the main settings panel or another manager
                // to open the profile-manager in a modal.
                eventBus.emit(EVENTS.SETTINGS_TOGGLE); // Close current panel
                
                // We need a slight delay to ensure the profile manager can be opened
                setTimeout(() => {
                     const profileManager = document.querySelector('profile-manager');
                     if(profileManager){
                         profileManager.setAttribute('mode', 'edit');
                         profileManager.setAttribute('profile-id', profileId);
                         // This assumes a modal manager is listening for this event
                         eventBus.emit('show-profile-manager-modal');
                     }
                }, 350);
            }
        });
    }

    async handleSave(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const useTranslation = this.shadowRoot.querySelector('#translation-toggle').classList.contains('active');

        const newSettings = {
            userName: formData.get('user-name'),
            userSignature: formData.get('user-signature'),
            deeplApiKey: useTranslation ? formData.get('api-key') : null,
        };

        await DatabaseService.updateUserSettings(newSettings);
        
        // Re-initialize deepl service if key has changed or been removed
        await deepL.initialize(newSettings.deeplApiKey);

        // Show feedback to user (replace with a proper toast later)
        alert('Settings saved successfully!'); 
        
        this.loadData(); // Reload data to reflect changes
    }
    
    render() {
        const usagePercentage = this.usage.character_limit > 0 ? (this.usage.character_count / this.usage.character_limit) * 100 : 0;
        const useTranslation = !!this.settings.deeplApiKey;

        this.shadowRoot.innerHTML = `
            <style>
                /* Component-specific styles based on the mockup */
                :host {
                    display: block;
                    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .settings-content { padding: 1.5rem; }
                .card {
                    background: var(--container-color, #fff);
                    border-radius: 16px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--color-border, #e5e7eb);
                }
                .card h3 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-top: 0;
                    margin-bottom: 1rem;
                    color: var(--color-text-dark, #1f2937);
                }
                .form-group { margin-bottom: 1rem; }
                .form-group:last-child { margin-bottom: 0; }
                .form-group label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--color-text-light, #6b7280);
                    margin-bottom: 0.5rem;
                }
                .styled-input {
                    width: 100%;
                    box-sizing: border-box;
                    background-color: #f9fafb;
                    border: 1px solid var(--color-border, #e5e7eb);
                    border-radius: 12px;
                    padding: 0.875rem 1rem;
                    font-size: 1rem;
                    font-family: inherit;
                    color: var(--color-text-dark, #1f2937);
                }
                .primary-button {
                    width: 100%;
                    padding: 1rem;
                    border: none;
                    background-color: var(--color-text-dark, #1f2937);
                    color: var(--primary-text-color, #fff);
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                    margin-top: 0.5rem;
                }
                .toggle-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: #f9fafb;
                    padding: 1rem;
                    border-radius: 12px;
                    margin-bottom: 1rem;
                }
                .toggle-info h4 { font-size: 1rem; font-weight: 600; color: var(--color-text-dark, #1f2937); margin: 0 0 0.25rem 0; }
                .toggle-info p { font-size: 0.875rem; color: var(--color-text-light, #6b7280); margin: 0; }
                .toggle-switch {
                    position: relative; width: 52px; height: 32px; background: #e5e7eb; border-radius: 16px;
                    cursor: pointer; transition: background 0.3s ease; flex-shrink: 0;
                }
                .toggle-switch.active { background: var(--primary-color, #2563eb); }
                .toggle-knob {
                    position: absolute; top: 2px; left: 2px; width: 28px; height: 28px; background: white;
                    border-radius: 14px; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .toggle-switch.active .toggle-knob { transform: translateX(20px); }
                .usage-quota-container {
                    font-size: 0.875rem;
                    color: var(--color-text-light, #6b7280);
                }
                .usage-bar-wrapper {
                    width: 100%;
                    background-color: #e5e7eb;
                    border-radius: 8px;
                    height: 12px;
                    overflow: hidden;
                    margin: 0.5rem 0;
                }
                .usage-bar {
                    width: ${usagePercentage.toFixed(2)}%;
                    height: 100%;
                    background-color: var(--primary-color, #2563eb);
                    border-radius: 8px;
                    transition: width 0.5s ease;
                }
                .usage-details {
                    display: flex;
                    justify-content: space-between;
                }
                .profile-list-item {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    border-radius: 12px;
                    background-color: #f8fafc;
                    margin-bottom: 0.75rem;
                }
                .profile-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    margin-right: 1rem;
                    object-fit: cover;
                }
                .profile-info { flex-grow: 1; }
                .profile-info .name { font-weight: 600; color: var(--color-text-dark, #1f2937); }
                .profile-info .translation { font-size: 0.9rem; color: var(--color-text-light, #6b7280); }
                .edit-profile-btn {
                    background: none;
                    border: 1px solid var(--color-border, #e5e7eb);
                    color: var(--color-text-dark, #1f2937);
                    border-radius: 8px;
                    padding: 0.5rem 1rem;
                    font-weight: 500;
                    cursor: pointer;
                }
            </style>
            <div class="settings-content">
                <form id="settings-form">
                    <div class="card">
                        <h3>Your Profile</h3>
                        <div class="form-group">
                            <label for="user-name">Your Name</label>
                            <input type="text" id="user-name" name="user-name" class="styled-input" value="${this.settings.userName || ''}" placeholder="e.g., John Doe">
                        </div>
                        <div class="form-group">
                            <label for="user-signature">Message Signature</label>
                            <input type="text" id="user-signature" name="user-signature" class="styled-input" value="${this.settings.userSignature || ''}" placeholder="e.g., Love, Dad">
                        </div>
                    </div>

                    <div class="card">
                        <h3>Translation Service</h3>
                        <div class="toggle-container">
                            <div class="toggle-info">
                                <h4>Enable Translation</h4>
                                <p>Use DeepL for automatic translations</p>
                            </div>
                            <div class="toggle-switch ${useTranslation ? 'active' : ''}" id="translation-toggle">
                                <div class="toggle-knob"></div>
                            </div>
                        </div>
                        <div class="form-group" id="api-key-group" style="display: ${useTranslation ? 'block' : 'none'}">
                            <label for="api-key">DeepL API Key</label>
                            <input type="password" id="api-key" name="api-key" class="styled-input" value="${this.settings.deeplApiKey || ''}">
                        </div>
                        <div class="usage-quota-container">
                            <label>Monthly Usage</label>
                            <div class="usage-bar-wrapper">
                                <div class="usage-bar"></div>
                            </div>
                            <div class="usage-details">
                                <span>${this.usage.character_count.toLocaleString()} / ${this.usage.character_limit.toLocaleString()} characters</span>
                                <span>${usagePercentage.toFixed(0)}%</span>
                            </div>
                        </div>
                        <button type="submit" class="primary-button">Save Settings</button>
                    </div>
                </form>

                <div class="card">
                    <h3>Manage Profiles</h3>
                    <div class="profile-list">
                        ${this.profiles.map(profile => `
                            <div class="profile-list-item" data-profile-id="${profile.id}">
                                <img src="${profile.image || `https://placehold.co/48x48/ccc/333?text=${profile.originalName.charAt(0)}`}" alt="Avatar" class="profile-avatar">
                                <div class="profile-info">
                                    <div class="name">${profile.originalName}</div>
                                    <div class="translation">${profile.translatedName || ''}</div>
                                </div>
                                <button class="edit-profile-btn">Edit</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('user-settings-panel', UserSettingsPanel);