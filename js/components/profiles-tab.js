import { eventBus, EVENTS } from '../utils/events.js';
import { ProfileService } from '../services/profiles.js';
import { TimezoneService } from '../services/timezoneService.js';
import { ImageProcessor } from '../utils/image-processor.js';
import { i18n } from '../services/i18n.js';

class ProfilesTab extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.profiles = [];
        this.timezoneData = [];
        this.editingProfileId = null; // To track which profile is being edited
        this.editingNickname = { profileId: null, nicknameId: null };
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadProfiles();
        this.loadTimezoneData();
    }

    async loadTimezoneData() {
        this.timezoneData = await TimezoneService.getTimezones();
    }

    setupEventListeners() {
        const root = this.shadowRoot;
        eventBus.on(EVENTS.PROFILES_UPDATED, () => {
            this.loadProfiles();
        });

        root.addEventListener('click', this.handleClick.bind(this));
        root.addEventListener('change', this.handleChange.bind(this));
        root.addEventListener('submit', this.handleSubmit.bind(this));
    }

    async loadProfiles() {
        this.profiles = await ProfileService.getAllProfiles();
        this.renderProfiles();
        this.updateContent(); // Ensure i18n is applied
    }
    
    updateContent() {
        this.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = i18n.t(el.dataset.i18n);
        });
        this.shadowRoot.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = i18n.t(el.dataset.i18nPlaceholder);
        });
    }

    async handleClick(event) {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.id === 'add-profile-btn') {
            this.showAddProfileDialog();
            return;
        }

        const profileCard = button.closest('.profile-card');
        if (!profileCard) return;

        const profileId = profileCard.dataset.profileId;
        const nicknameItem = button.closest('.nickname-item');
        const nicknameId = nicknameItem?.dataset.nicknameId;

        if (button.classList.contains('edit-btn')) {
            this.editingProfileId = profileId;
            this.renderProfiles();
        } else if (button.classList.contains('delete-btn')) {
            const profile = this.profiles.find(p => p.id === profileId);
            if (confirm(i18n.t('settings.confirmDelete', { item: profile.originalName }))) {
                await ProfileService.deleteProfile(profileId);
            }
        } else if (button.classList.contains('cancel-edit-btn')) {
            this.editingProfileId = null;
            this.renderProfiles();
        } else if (button.classList.contains('edit-nickname-btn')) {
            this.editingNickname = { profileId, nicknameId };
            this.renderProfiles();
        } else if (button.classList.contains('delete-nickname-btn')) {
            if (confirm(i18n.t('settings.confirmDelete', { item: 'this nickname' }))) {
                await ProfileService.deleteNickname(profileId, nicknameId);
            }
        } else if (button.classList.contains('cancel-nickname-edit-btn')) {
            this.editingNickname = { profileId: null, nicknameId: null };
            this.renderProfiles();
        }
    }
    
    async handleChange(event) {
        const target = event.target;
        const profileCard = target.closest('.profile-card');
        if (!profileCard) return;

        if (target.classList.contains('image-upload')) {
            const file = target.files[0];
            if (!file) return;
            const profileId = profileCard.dataset.profileId;
            try {
                const processedImage = await ImageProcessor.processImage(file);
                const reader = new FileReader();
                reader.onload = async (e) => {
                    await ProfileService.updateProfile(profileId, { image: e.target.result });
                };
                reader.readAsDataURL(processedImage.blob);
            } catch (error) {
                console.error("Failed to process image:", error);
                alert(i18n.t('errors.unexpectedError'));
            }
        } else if (target.name === 'country') {
            const timezoneSelect = profileCard.querySelector('select[name="timezone"]');
            this._populateTimezoneDropdown(target.value, timezoneSelect);
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const profileCard = form.closest('.profile-card');

        if (form.id === 'add-profile-form') {
            const formData = new FormData(form);
            const name = formData.get('name');
            const translation = formData.get('translation');
            if (name) {
                await ProfileService.createProfile({ name, mainTranslation: translation, language: 'EN' }); 
                this.shadowRoot.getElementById('add-profile-dialog').close();
                form.reset();
            }
        } else if (form.classList.contains('edit-profile-form')) {
            const profileId = profileCard.dataset.profileId;
            const formData = new FormData(form);
            const updates = {
                originalName: formData.get('originalName'),
                mainTranslation: formData.get('mainTranslation'),
                birthdate: formData.get('birthdate'),
                timezone: formData.get('timezone')
            };
            await ProfileService.updateProfile(profileId, updates);
            this.editingProfileId = null;
            this.renderProfiles();
        } else if (form.classList.contains('add-nickname-form')) {
            const profileId = profileCard.dataset.profileId;
            const display = form.querySelector('input[name="nickname_display"]').value;
            const translation = form.querySelector('input[name="nickname_translation"]').value;
            if (display) {
                await ProfileService.addNickname(profileId, display, translation || display);
                form.reset();
            }
        } else if (form.classList.contains('edit-nickname-form')) {
            const profileId = this.editingNickname.profileId;
            const nicknameId = this.editingNickname.nicknameId;
            const display = form.querySelector('input[name="nickname_display"]').value;
            const translation = form.querySelector('input[name="nickname_translation"]').value;
            await ProfileService.updateNickname(profileId, nicknameId, { display, baseLang_value: display, targetLang_value: translation });
            this.editingNickname = { profileId: null, nicknameId: null };
            this.renderProfiles();
        }
    }

    showAddProfileDialog() {
        this.shadowRoot.getElementById('add-profile-dialog').showModal();
    }

    renderProfiles() {
        const container = this.shadowRoot.getElementById('profiles-container');
        container.innerHTML = '';
        this.profiles.forEach(profile => {
            const card = (this.editingProfileId === profile.id)
                ? this.createEditProfileCard(profile)
                : this.createDisplayProfileCard(profile);
            container.appendChild(card);
        });
        this.updateContent();
    }

    createDisplayProfileCard(profile) {
        const card = document.createElement('div');
        card.className = 'card profile-card';
        card.dataset.profileId = profile.id;
        card.innerHTML = `
            <div class="profile-header">
                <img src="${profile.image || 'https://placehold.co/64x64/ccc/333?text=?'}" alt="Avatar" class="profile-avatar">
                <div class="profile-info">
                    <h3>${profile.originalName}</h3>
                    <p>${profile.mainTranslation}</p>
                </div>
                <div class="profile-actions">
                    <button class="action-btn edit-btn" title="${i18n.t('common.edit')}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-btn delete-btn" title="${i18n.t('common.delete')}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
        return card;
    }

    createEditProfileCard(profile) {
        const card = document.createElement('div');
        card.className = 'card profile-card';
        card.dataset.profileId = profile.id;

        const countryOptions = this.timezoneData.map(data => {
            const countryData = this.timezoneData.find(d => d.timezones.includes(profile.timezone));
            const selected = countryData && countryData.country === data.country ? 'selected' : '';
            return `<option value="${data.country}" ${selected}>${data.country}</option>`;
        }).join('');

        const nicknamesHTML = profile.nicknames.map(nick => {
            if (this.editingNickname.profileId === profile.id && this.editingNickname.nicknameId === nick.id) {
                return this.createEditNicknameForm(nick);
            }
            return this.createDisplayNicknameItem(nick);
        }).join('');

        card.innerHTML = `
            <form class="edit-profile-form">
                <div class="profile-header">
                    <label class="profile-avatar-label">
                        <img src="${profile.image || 'https://placehold.co/64x64/ccc/333?text=?'}" alt="Avatar" class="profile-avatar">
                        <input type="file" class="image-upload" accept="image/*" style="display:none;">
                    </label>
                </div>
                <div class="form-group">
                    <label for="originalName-${profile.id}" data-i18n="settings.profileName">Name</label>
                    <input type="text" id="originalName-${profile.id}" name="originalName" class="styled-input" value="${profile.originalName}" required>
                </div>
                <div class="form-group">
                    <label for="mainTranslation-${profile.id}" data-i18n="settings.profileTranslation">Translation</label>
                    <input type="text" id="mainTranslation-${profile.id}" name="mainTranslation" class="styled-input" value="${profile.mainTranslation}" required>
                </div>
                <div class="form-group">
                    <label for="birthdate-${profile.id}" data-i18n="settings.profileBirthday">Birthday</label>
                    <input type="date" id="birthdate-${profile.id}" name="birthdate" class="styled-input" value="${profile.birthdate || ''}">
                </div>
                <div class="form-group">
                    <label for="country-${profile.id}" data-i18n="settings.profileCountry">Country</label>
                    <select id="country-${profile.id}" name="country" class="styled-input">${countryOptions}</select>
                </div>
                <div class="form-group">
                    <label for="timezone-${profile.id}" data-i18n="settings.profileTimezone">Timezone</label>
                    <select id="timezone-${profile.id}" name="timezone" class="styled-input"></select>
                </div>
                <div class="form-actions">
                    <button type="button" class="secondary-button cancel-edit-btn" data-i18n="common.cancel">Cancel</button>
                    <button type="submit" class="primary-button" data-i18n="common.save">Save Profile</button>
                </div>
            </form>
            <div class="nickname-section">
                <h4 data-i18n="settings.nicknames">Nicknames</h4>
                <div class="nickname-list">${nicknamesHTML}</div>
                <form class="add-nickname-form">
                    <div class="form-group">
                         <input type="text" name="nickname_display" class="styled-input" data-i18n-placeholder="settings.nickname" required>
                    </div>
                    <div class="form-group">
                        <input type="text" name="nickname_translation" class="styled-input" data-i18n-placeholder="settings.profileTranslation" required>
                    </div>
                    <button type="submit" class="primary-button" data-i18n="settings.addNickname">Add Nickname</button>
                </form>
            </div>
        `;
        
        // Post-render logic to populate timezones
        setTimeout(() => {
            const countrySelect = card.querySelector(`select[name="country"]`);
            const timezoneSelect = card.querySelector(`select[name="timezone"]`);
            if (countrySelect.value) {
                this._populateTimezoneDropdown(countrySelect.value, timezoneSelect, profile.timezone);
            }
        }, 0);

        return card;
    }
    
    _populateTimezoneDropdown(countryName, timezoneSelect, selectedTimezone = null) {
        const countryData = this.timezoneData.find(d => d.country === countryName);
        if (!countryData || !countryData.timezones || countryData.timezones.length === 0) {
            timezoneSelect.innerHTML = '';
            return;
        }
        timezoneSelect.innerHTML = countryData.timezones.map(tz => {
            const selected = tz === selectedTimezone ? 'selected' : '';
            return `<option value="${tz}" ${selected}>${tz.replace(/_/g, ' ')}</option>`;
        }).join('');
    }

    createDisplayNicknameItem(nickname) {
        return `
            <div class="nickname-item" data-nickname-id="${nickname.id}">
                <div class="nickname-info">
                    <p>${nickname.display}</p>
                    <p class="translation">${nickname.targetLang_value}</p>
                </div>
                <div class="nickname-actions">
                    <button class="action-btn edit-nickname-btn">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-btn delete-nickname-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
        `;
    }
    
    createEditNicknameForm(nickname) {
        return `
            <div class="nickname-item editing" data-nickname-id="${nickname.id}">
                <form class="edit-nickname-form">
                    <div class="form-group">
                        <input type="text" name="nickname_display" class="styled-input" value="${nickname.display}" required>
                    </div>
                    <div class="form-group">
                        <input type="text" name="nickname_translation" class="styled-input" value="${nickname.targetLang_value}" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="secondary-button cancel-nickname-edit-btn" data-i18n="common.cancel">Cancel</button>
                        <button type="submit" class="primary-button" data-i18n="common.save">Save</button>
                    </div>
                </form>
            </div>
        `;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                /* Container for fixed positioning */
                .profiles-tab-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    position: relative;
                }

                .profiles-content {
                    flex: 1;
                    overflow-y: auto;
                    padding-bottom: 80px; /* Space for fixed button */
                }

                /* General Card & Form Styling */
                .card { background: var(--container-color); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.25rem; border: 1px solid var(--color-border); }
                .form-group { margin-bottom: 1rem; }
                .form-group label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--color-text-light); margin-bottom: 0.5rem; }
                .styled-input { width: 100%; box-sizing: border-box; background-color: #f9fafb; border: 1px solid var(--color-border); border-radius: 12px; padding: 0.875rem 1rem; font-size: 1rem; font-family: inherit; color: var(--color-text-dark); }
                .styled-input:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2); }
                .primary-button { width: 100%; padding: 1rem; border: none; background-color: var(--color-text-dark); color: var(--primary-text-color); border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; }
                .secondary-button { width: 100%; padding: 1rem; border: 1px solid var(--color-border); background-color: transparent; color: var(--color-text-dark); border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; }
                .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
                
                /* Profile Specifics */
                .profile-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
                .profile-avatar-label { cursor: pointer; }
                .profile-avatar { width: 64px; height: 64px; border-radius: 50%; background-color: #eef2f6; object-fit: cover; }
                .profile-info { flex-grow: 1; }
                .profile-info h3 { font-size: 1.2rem; font-weight: 600; margin: 0; }
                .profile-info p { font-size: 1rem; color: var(--color-text-light); margin: 0; }
                .profile-actions { display: flex; align-items: center; gap: 0.5rem; }
                .action-btn { background: none; border: none; cursor: pointer; padding: 0.5rem; color: var(--color-text-light); }
                .delete-btn { color: var(--danger-color); }

                /* Nickname Section */
                .nickname-section { margin-top: 2rem; border-top: 1px solid var(--color-border); padding-top: 1.5rem; }
                .nickname-section h4 { margin-top: 0; margin-bottom: 1rem; font-size: 1rem; font-weight: 600; }
                .nickname-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
                .nickname-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: #f8fafc; border-radius: 12px; }
                .nickname-item.editing { background-color: transparent; padding: 0; }
                .nickname-info p { margin: 0; }
                .nickname-info .translation { font-size: 0.9rem; color: var(--color-text-light); }
                .add-nickname-form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
                .add-nickname-form .primary-button { margin-top: 0; }

                /* Fixed Add Profile Button */
                #add-profile-btn {
                    position: fixed;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    width: calc(100% - 2rem);
                    max-width: 568px;
                    padding: 1rem;
                    border: none;
                    background-color: var(--color-text-dark);
                    color: var(--primary-text-color);
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                    z-index: 1000;
                    box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.15);
                    backdrop-filter: blur(10px);
                }
                
                /* Dialog Styles */
                dialog { border: none; border-radius: 16px; padding: 2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 90%; max-width: 400px; }
                dialog::backdrop { background-color: rgba(0,0,0,0.4); }
                dialog h3 { margin-top: 0; }
            </style>
            
            <div class="profiles-tab-container">
                <div class="profiles-content">
                    <div id="profiles-container"></div>
                </div>
                <button id="add-profile-btn" class="primary-button" data-i18n="settings.addProfile">Add New Profile</button>
            </div>

            <dialog id="add-profile-dialog">
                <h3 data-i18n="settings.addProfile">Add New Profile</h3>
                <form id="add-profile-form">
                    <div class="form-group">
                        <label for="new-name" data-i18n="settings.profileName">Name</label>
                        <input id="new-name" name="name" type="text" class="styled-input" required>
                    </div>
                    <div class="form-group">
                        <label for="new-translation" data-i18n="settings.profileTranslation">Translation</label>
                        <input id="new-translation" name="translation" type="text" class="styled-input">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="secondary-button" onclick="this.closest('dialog').close()" data-i18n="common.cancel">Cancel</button>
                        <button type="submit" class="primary-button" data-i18n="common.add">Add</button>
                    </div>
                </form>
            </dialog>
        `;
    }
}

customElements.define('profiles-tab', ProfilesTab);