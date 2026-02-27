// js/components/profiles-tab.js
import { eventBus, EVENTS } from '../utils/events.js';
import { i18n } from '../services/i18n.js';
import { ProfileService } from '../services/profiles.js';

class ProfilesTab extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.profiles = [];
        this.boundLoadProfiles = this.loadProfiles.bind(this);
        this.boundUpdateContent = this.updateContent.bind(this);
    }

    async connectedCallback() {
        this.render();
        this.setupEventListeners();
        await this.loadProfiles();
        eventBus.on(EVENTS.PROFILES_UPDATED, this.boundLoadProfiles);
        i18n.addListener(this.boundUpdateContent);
    }

    disconnectedCallback() {
        eventBus.off(EVENTS.PROFILES_UPDATED, this.boundLoadProfiles);
        i18n.removeListener(this.boundUpdateContent);
    }

    async loadProfiles() {
        this.profiles = await ProfileService.getAllProfiles();
        this.renderProfileList();
        this.updateContent();
    }

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-profile-btn');
            const addButton = e.target.closest('#add-profile-btn');

            if (editButton) {
                const profileId = editButton.closest('.profile-list-item').dataset.profileId;
                const modal = document.querySelector('#profile-modal');
                const profileManager = document.querySelector('#profile-modal profile-manager');

                if (modal && profileManager) {
                    profileManager.setAttribute('mode', 'edit');
                    profileManager.setAttribute('profile-id', profileId);
                    modal.open();
                }
            } else if (addButton) {
                const modal = document.querySelector('#profile-modal');
                const profileManager = document.querySelector('#profile-modal profile-manager');

                if (modal && profileManager) {
                    profileManager.setAttribute('mode', 'create');
                    profileManager.removeAttribute('profile-id');
                    modal.open();
                }
            }
        });
    }

    renderProfileList() {
        const profileList = this.shadowRoot.querySelector('.profile-list');
        if (!profileList) return;

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
    }

    updateContent() {
        this.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = i18n.t(el.dataset.i18n);
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                .profiles-content { padding: 1.5rem; }
                .card { background: var(--container-color, #fff); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid var(--color-border, #e5e7eb); }
                h3 { font-size: 1.1rem; font-weight: 600; margin: 0 0 1rem 0; color: var(--color-text-dark, #1f2937); }
                .profile-list-item { display: flex; align-items: center; padding: 1rem; border-radius: 12px; background-color: #f8fafc; margin-bottom: 0.75rem; }
                .profile-avatar { width: 48px; height: 48px; border-radius: 50%; margin-right: 1rem; object-fit: cover; }
                .profile-info { flex-grow: 1; }
                .profile-info .name { font-weight: 600; color: var(--color-text-dark, #1f2937); }
                .profile-info .translation { font-size: 0.9rem; color: var(--color-text-light, #6b7280); }
                .edit-profile-btn { background: none; border: 1px solid var(--color-border, #e5e7eb); color: var(--color-text-dark, #1f2937); border-radius: 8px; padding: 0.5rem 1rem; font-weight: 500; cursor: pointer; }
                .add-profile-btn { width: 100%; padding: 0.875rem; border: 2px dashed var(--color-border, #e5e7eb); background: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 0.95rem; color: var(--color-text-light, #6b7280); margin-top: 0.5rem; transition: all 0.2s; }
                .add-profile-btn:hover { border-color: var(--color-text-dark, #1f2937); color: var(--color-text-dark, #1f2937); }
            </style>
            <div class="profiles-content">
                <div class="card">
                    <h3 data-i18n="settings.manageProfiles">Manage Profiles</h3>
                    <div class="profile-list"></div>
                    <button type="button" class="add-profile-btn" id="add-profile-btn" data-i18n="settings.addProfile">+ Add Profile</button>
                </div>
            </div>
        `;
    }
}

customElements.define('profiles-tab', ProfilesTab);
