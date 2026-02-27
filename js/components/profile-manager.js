import { ProfileService } from '../services/profiles.js';
import { TimezoneService } from '../services/timezoneService.js';
import { ImageProcessor } from '../utils/image-processor.js';
import { i18n } from '../services/i18n.js';

class ProfileManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.mode = 'create'; // 'create', 'edit'
        this.profileId = null;
        this.profile = null;
        this.timezoneData = [];
        this.editingNickname = null;
        this.newProfileAvatar = null;
        this.isExpanded = false; // State for expanded/collapsed view in edit mode
    }

    static get observedAttributes() {
        return ['mode', 'profile-id'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'mode') {
            this.mode = newValue || 'create';
            // When creating, always expand. When editing, start collapsed.
            this.isExpanded = (this.mode === 'create');
        }
        if (name === 'profile-id') {
            this.profileId = newValue;
        }
        if (this.isConnected) {
            this.loadData();
        }
    }

    connectedCallback() {
        this.loadTimezoneData();
        this.loadData();
        this.setupEventListeners();
        this.boundUpdateLanguage = () => { if (this.isConnected) this.render(); };
        i18n.addListener(this.boundUpdateLanguage);
    }

    disconnectedCallback() {
        i18n.removeListener(this.boundUpdateLanguage);
    }

    async loadTimezoneData() {
        this.timezoneData = await TimezoneService.getTimezones();
    }

    async loadData() {
        if (this.profileId && this.mode === 'edit') {
            this.profile = await ProfileService.getAllProfiles().then(profiles =>
                profiles.find(p => p.id === this.profileId)
            );
        } else {
            this.profile = null;
        }

        if (this.isConnected) {
            this.render();
        }
    }

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', this.handleClick.bind(this));
        this.shadowRoot.addEventListener('change', this.handleChange.bind(this));
        this.shadowRoot.addEventListener('submit', this.handleSubmit.bind(this));
    }

    async handleClick(event) {
        const target = event.target.closest('button, .minimized-profile');
        if (!target) return;

        const action = target.dataset.action;
        const nicknameId = target.closest('.nickname-item')?.dataset.nicknameId;

        switch (action) {
            case 'expand-profile':
                this.isExpanded = true;
                this.render();
                break;
            case 'collapse-profile':
                this.isExpanded = false;
                this.render();
                break;
            case 'edit-nickname':
                this.editingNickname = nicknameId;
                this.render(); // Re-render the whole component to show the edit form
                break;
            case 'cancel-nickname':
                this.editingNickname = null;
                this.render(); // Re-render to go back to display view
                break;
            case 'delete-nickname':
                if (confirm(i18n.t('settings.confirmDelete', { item: 'this nickname' }))) {
                    await ProfileService.deleteNickname(this.profileId, nicknameId);
                    await this.loadData();
                }
                break;
            case 'delete-profile':
                if (confirm(i18n.t('settings.confirmDelete', { item: this.profile.originalName }))) {
                    await ProfileService.deleteProfile(this.profileId);
                    this.dispatchEvent(new CustomEvent('profile-deleted', {
                        detail: { profileId: this.profileId }
                    }));
                }
                break;
        }
    }

    async handleChange(event) {
        const target = event.target;
        if (target.classList.contains('image-upload')) {
            const file = target.files[0];
            if (!file) return;

            try {
                const processedImage = await ImageProcessor.processImage(file);
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const avatarData = e.target.result;
                    const avatarPreview = this.shadowRoot.querySelector('.profile-avatar');
                    avatarPreview.src = avatarData;

                    if (this.mode === 'edit' && this.profileId) {
                        await ProfileService.updateProfile(this.profileId, { image: avatarData });
                    } else {
                        this.newProfileAvatar = avatarData;
                    }
                };
                reader.readAsDataURL(processedImage.blob);
            } catch (error) {
                console.error('Error processing image:', error);
                alert(i18n.t('errors.imageError'));
            }
        } else if (target.name === 'country') {
            const timezoneSelect = this.shadowRoot.querySelector('select[name="timezone"]');
            this.populateTimezones(timezoneSelect, target.value);
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        if (form.classList.contains('profile-form')) {
            const profileData = {
                originalName: formData.get('originalName'),
                translatedName: formData.get('translatedName'),
                birthdate: formData.get('birthdate'),
                country: formData.get('country'),
                timezone: formData.get('timezone'),
                avatar: this.newProfileAvatar
            };

            if (this.mode === 'create') {
                const newProfile = await ProfileService.createProfile(profileData);
                this.newProfileAvatar = null;
                this.dispatchEvent(new CustomEvent('profile-created', {
                    detail: { profile: newProfile }
                }));
            } else if (this.mode === 'edit') {
                delete profileData.avatar;
                await ProfileService.updateProfile(this.profileId, profileData);
                this.isExpanded = false; // Collapse after saving
                await this.loadData(); // Reload data and re-render
                this.dispatchEvent(new CustomEvent('profile-updated', {
                    detail: { profileId: this.profileId, profile: profileData }
                }));
            }
        } else if (form.classList.contains('nickname-form')) {
            const nickname = formData.get('nickname');
            const translation = formData.get('translation');

            if (this.editingNickname) {
                await ProfileService.updateNickname(this.profileId, this.editingNickname, {
                    display: nickname,
                    sourceLang_value: nickname,
                    targetLang_value: translation
                });
                this.editingNickname = null;
            } else {
                await ProfileService.addNickname(this.profileId, nickname, translation || nickname);
                form.reset();
            }
            await this.loadData(); // Reload data to show the new/updated nickname
        }
    }

    populateTimezones(timezoneSelect, countryCode, selectedTimezone = null) {
        if (!timezoneSelect || !this.timezoneData.length) return;
        const countryData = this.timezoneData.find(d => d.country === countryCode);
        if (!countryData) {
            timezoneSelect.innerHTML = `<option value="">${i18n.t('settings.selectTimezone')}</option>`;
            return;
        }
        timezoneSelect.innerHTML = countryData.timezones.map(tz => {
            const selected = tz === (selectedTimezone || this.profile?.timezone) ? 'selected' : '';
            return `<option value="${tz}" ${selected}>${tz.replace(/_/g, ' ')}</option>`;
        }).join('');
    }

    renderProfileForm() {
        const profile = this.profile || {};
        const isEditing = this.mode === 'edit';
        const countryOptions = this.timezoneData.map(data => {
            const countryData = this.timezoneData.find(d => d.timezones.includes(profile.timezone));
            const selected = countryData && countryData.country === data.country ? 'selected' : '';
            return `<option value="${data.country}" ${selected}>${data.country}</option>`;
        }).join('');
        return `
            <div class="profile-section">
                <form class="profile-form">
                    <div class="avatar-section">
                        <label class="avatar-container">
                            <img src="${profile.image || 'https://placehold.co/80x80/ccc/333?text=?'}" 
                                 alt="Avatar" class="profile-avatar">
                            <input type="file" class="image-upload" accept="image/*" style="display:none;">
                            <div class="avatar-overlay"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
                        </label>
                    </div>
                    <div class="form-group"><label data-i18n="settings.profileName">Name</label><input type="text" name="originalName" class="styled-input" value="${profile.originalName || ''}" required></div>
                    <div class="form-group"><label data-i18n="settings.profileTranslation">Translation</label><input type="text" name="translatedName" class="styled-input" value="${profile.translatedName || ''}" required></div>
                    <div class="form-group"><label data-i18n="settings.profileBirthday">Birthday</label><input type="date" name="birthdate" class="styled-input" value="${profile.birthdate || ''}"></div>
                    <div class="form-group"><label data-i18n="settings.profileCountry">Country</label><select name="country" class="styled-input"><option value="" data-i18n="settings.selectCountry">${i18n.t('settings.selectCountry')}</option>${countryOptions}</select></div>
                    <div class="form-group"><label data-i18n="settings.profileTimezone">Timezone</label><select name="timezone" class="styled-input"><option value="" data-i18n="settings.selectTimezone">${i18n.t('settings.selectTimezone')}</option></select></div>
                    <div class="form-actions">
                        ${isEditing ? `<button type="button" class="secondary-button" data-action="collapse-profile" data-i18n="common.cancel">${i18n.t('common.cancel')}</button>` : ''}
                        <button type="submit" class="primary-button" data-i18n="${isEditing ? 'settings.saveChanges' : 'settings.createProfile'}">${isEditing ? i18n.t('settings.saveChanges') : i18n.t('settings.createProfile')}</button>
                    </div>
                    ${isEditing ? `<div class="delete-action"><button type="button" class="delete-button" data-action="delete-profile" data-i18n="settings.deleteProfile">${i18n.t('settings.deleteProfile')}</button></div>` : ''}
                </form>
            </div>
        `;
    }

    renderNicknames() {
        if (!this.profile) return '';

        const nicknamesHTML = (this.profile.nicknames || []).map(nickname => {
            if (this.editingNickname === nickname.id) {
                return `
                    <div class="nickname-item editing" data-nickname-id="${nickname.id}">
                        <form class="nickname-form">
                            <div class="nickname-inputs">
                                <input type="text" name="nickname" value="${nickname.display}" class="styled-input" data-i18n-placeholder="settings.nickname" placeholder="${i18n.t('settings.nickname')}" required>
                                <input type="text" name="translation" value="${nickname.targetLang_value}" class="styled-input" data-i18n-placeholder="settings.profileTranslation" placeholder="${i18n.t('settings.profileTranslation')}">
                            </div>
                            <div class="nickname-actions">
                                <button type="submit" class="save-button" title="Save"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
                                <button type="button" class="cancel-button" data-action="cancel-nickname" title="Cancel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                            </div>
                        </form>
                    </div>
                `;
            } else {
                return `
                    <div class="nickname-item" data-nickname-id="${nickname.id}">
                        <div class="nickname-info">
                            <span class="nickname-name">${nickname.display}</span>
                            <span class="nickname-translation">${nickname.targetLang_value}</span>
                        </div>
                        <div class="nickname-actions">
                            <button type="button" class="edit-button" data-action="edit-nickname" title="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            <button type="button" class="delete-button" data-action="delete-nickname" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        </div>
                    </div>
                `;
            }
        }).join('');

        return `
            <div class="nicknames-section">
                <h4 data-i18n="settings.nicknames">Nicknames</h4>
                <div class="nickname-list">${nicknamesHTML}</div>
                ${!this.editingNickname ? `
                    <form class="nickname-form add-nickname">
                        <div class="nickname-inputs">
                            <input type="text" name="nickname" class="styled-input" data-i18n-placeholder="settings.newNickname" placeholder="${i18n.t('settings.newNickname')}" required>
                            <input type="text" name="translation" class="styled-input" data-i18n-placeholder="settings.profileTranslation" placeholder="${i18n.t('settings.profileTranslation')}">
                        </div>
                        <button type="submit" class="add-button" data-i18n="settings.addNickname">${i18n.t('settings.addNickname')}</button>
                    </form>` : ''}
            </div>
        `;
    }

    renderMinimizedProfile() {
        if (!this.profile) return '';
        return `
        <div class="minimized-profile" data-action="expand-profile" title="Edit Profile Details">
            <img src="${this.profile.image || 'https://placehold.co/50x50/ccc/333?text=?'}" 
                 alt="Avatar" class="mini-avatar">
            <div class="mini-info">
                <h4>${this.profile.originalName}</h4>
                <span>${this.profile.translatedName}</span>
            </div>
            <svg class="expand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        </div>
    `;
}

    render() {
        let content = '';
        if (this.mode === 'create') {
            content = this.renderProfileForm();
        } else if (this.mode === 'edit' && this.profile) {
            if (this.isExpanded) {
                content = this.renderProfileForm() + this.renderNicknames();
            } else {
                content = this.renderMinimizedProfile() + this.renderNicknames();
            }
        }
        
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; font-family: var(--font-family-base); }
                /* Main layout and section styles */
                .profile-section { margin-bottom: 2rem; }
                .nicknames-section { border-top: 1px solid var(--color-border); padding-top: 1.5rem; }
                h3, h4 { margin: 0 0 1rem 0; color: var(--color-text-dark); }
                /* Avatar */
                .avatar-section { text-align: center; margin-bottom: 1.5rem; }
                .avatar-container { position: relative; display: inline-block; cursor: pointer; }
                .profile-avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-border); }
                .avatar-overlay { position: absolute; inset: 0; background-color: rgba(0,0,0,0.6); border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease; color: white; }
                .avatar-container:hover .avatar-overlay { opacity: 1; }
                /* Generic Form Styles */
                .form-group { margin-bottom: 1rem; }
                .form-group label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--color-text-light); margin-bottom: 0.5rem; }
                .styled-input { width: 100%; box-sizing: border-box; background-color: #f9fafb; border: 1px solid var(--color-border); border-radius: 12px; padding: 0.875rem 1rem; font-size: 1rem; font-family: inherit; color: var(--color-text-dark); }
                .styled-input:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2); }
                /* Buttons and Actions */
                .form-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
                .primary-button, .secondary-button { flex: 1; padding: 1rem; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; }
                .primary-button { border: none; background-color: var(--color-text-dark); color: var(--primary-text-color); }
                .secondary-button { border: 1px solid var(--color-border); background-color: transparent; color: var(--color-text-dark); }
                .delete-action { text-align: center; margin-top: 1.5rem; }
                .delete-button { background: none; border: none; color: var(--danger-color); cursor: pointer; font-weight: 500; font-size: 0.9rem; padding: 0.5rem; }
                /* Minimized Profile View */
                .minimized-profile { display: flex; align-items: center; gap: 1rem; padding: 1rem; background-color: #f8fafc; border-radius: 12px; margin-bottom: 1.5rem; cursor: pointer; transition: background-color 0.2s ease; }
                .minimized-profile:hover { background-color: #eef2ff; }
                .mini-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
                .mini-info { flex-grow: 1; }
                .mini-info h4 { margin: 0; font-size: 1rem; }
                .mini-info span { font-size: 0.875rem; color: var(--color-text-light); }
                .expand-icon { color: var(--color-text-light); margin-left: auto; }
                /* Nicknames List and Forms */
                .nickname-list { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
                .nickname-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: #f8fafc; border-radius: 8px; }
                .nickname-item.editing { background-color: #fff; border: 1px solid var(--primary-color); padding: 1rem; flex-direction: column; }
                .nickname-info { flex: 1; }
                .nickname-name { font-weight: 500; }
                .nickname-translation { font-size: 0.875rem; color: var(--color-text-light); }
                .nickname-form .nickname-inputs { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
                .nickname-form .form-actions { width: 100%; }
                .nickname-actions { display: flex; gap: 0.25rem; }
                .edit-button, .delete-button, .save-button, .cancel-button { background: none; border: none; padding: 0.5rem; border-radius: 6px; cursor: pointer; display: flex; }
                .edit-button:hover, .delete-button:hover { background-color: #e5e7eb; }
                .save-button, .cancel-button { flex: 1; }
                .add-nickname { margin-top: 1rem; }
                .add-nickname .nickname-inputs { display: flex; gap: 0.75rem; }
                .add-button { width: 100%; justify-content: center; margin-top: 0.75rem; padding: 0.75rem 1rem; border: none; background-color: var(--color-text-dark); color: var(--primary-text-color); border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; }
            </style>
            <div class="profile-manager">${content}</div>
        `;
        
        // Post-render logic to populate timezones and update content
        this.postRenderSetup();
    }

    postRenderSetup() {
        if (this.mode === 'edit' && this.isExpanded && this.profile) {
            setTimeout(() => {
                const countrySelect = this.shadowRoot.querySelector('select[name="country"]');
                const timezoneSelect = this.shadowRoot.querySelector('select[name="timezone"]');
                if (countrySelect && timezoneSelect) {
                    const countryToSelect = countrySelect.value || this.timezoneData.find(d => d.timezones.includes(this.profile.timezone))?.country;
                    if (countryToSelect) {
                        countrySelect.value = countryToSelect;
                        this.populateTimezones(timezoneSelect, countryToSelect, this.profile.timezone);
                    }
                }
            }, 0);
        } else if (this.mode === 'create') {
            setTimeout(() => {
                const countrySelect = this.shadowRoot.querySelector('select[name="country"]');
                const timezoneSelect = this.shadowRoot.querySelector('select[name="timezone"]');
                countrySelect?.addEventListener('change', () => this.populateTimezones(timezoneSelect, countrySelect.value));
            }, 0);
        }
        // Always apply i18n translations
        setTimeout(() => {
            this.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => el.textContent = i18n.t(el.dataset.i18n));
            this.shadowRoot.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = i18n.t(el.dataset.i18nPlaceholder));
        }, 0);
    }
}

customElements.define('profile-manager', ProfileManager);