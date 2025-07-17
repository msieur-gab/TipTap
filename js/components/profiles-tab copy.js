import { eventBus, EVENTS } from '../utils/events.js';
import { ProfileService } from '../services/profiles.js';
import { TimezoneService } from '../services/timezoneService.js';
import { ImageProcessor } from '../utils/image-processor.js'; // Import your new class


class ProfilesTab extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.profiles = [];
        this.timezoneData = [];
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
        eventBus.on(EVENTS.PROFILES_UPDATED, () => {
            this.loadProfiles();
        });

        this.shadowRoot.addEventListener('click', this.handleClick.bind(this));
        this.shadowRoot.addEventListener('change', this.handleChange.bind(this));
        
        // Setup dialog event listeners
        this.setupDialogListeners();
    }

    setupDialogListeners() {
        const addProfileDialog = this.shadowRoot.getElementById('add-profile-dialog');
        const addProfileForm = this.shadowRoot.getElementById('add-profile-form');
        
        addProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addProfileForm);
            const name = formData.get('name');
            const translation = formData.get('translation');
            
            if (name && translation) {
                await ProfileService.createProfile(name, translation);
                addProfileDialog.close();
                addProfileForm.reset();
            }
        });

        addProfileDialog.addEventListener('click', (e) => {
            // Close dialog when clicking backdrop
            if (e.target === addProfileDialog) {
                addProfileDialog.close();
            }
        });
    }

    async loadProfiles() {
        this.profiles = await ProfileService.getAllProfiles();
        this.renderProfiles();
    }

    async handleClick(event) {
        const target = event.target;
        const button = target.closest('button');
        if (!button) return;

        // Handle add profile button
        if (button.id === 'add-profile-btn') {
            await this.handleAddProfile();
            return;
        }

        // Handle profile-related actions
        const profileCard = target.closest('.profile-card');
        if (profileCard) {
            await this.handleProfileAction(event, button, profileCard);
            return;
        }
    }

    async handleChange(event) {
        // Handle country dropdown change
        if (event.target.id === 'country-select') {
            this._handleCountryChange(event.target.value);
            return;
        }

        // Handle image upload
        if (event.target.classList.contains('image-upload')) {
            const file = event.target.files[0];
            if (!file) return;

            const profileCard = event.target.closest('.profile-card');
            const profileId = profileCard.dataset.profileId;

            try {
                // Use your image processor
                const processedImage = await ImageProcessor.processImage(file);

                // Convert the resulting blob to a base64 data URL for storage
                const reader = new FileReader();
                reader.onload = async (e) => {
                    await ProfileService.updateProfile(profileId, { image: e.target.result });
                };
                reader.readAsDataURL(processedImage.blob);

            } catch (error) {
                console.error("Failed to process image:", error);
                alert("Sorry, there was an error processing your image.");
            }
        }
    }

    async handleAddProfile() {
        const dialog = this.shadowRoot.getElementById('add-profile-dialog');
        dialog.showModal();
    }

    async handleProfileAction(event, button, profileCard) {
        const profileId = profileCard.dataset.profileId;

        if (button.classList.contains('expand-btn')) {
            this.toggleCollapsible(profileCard);
        }

        if (button.classList.contains('edit-profile-name')) {
            this.editProfileName(profileCard, profileId);
        }

        if (button.classList.contains('save-profile-name')) {
            event.preventDefault();
            await this.saveProfileName(profileCard, profileId);
        }

        if (button.classList.contains('delete-profile')) {
            const profile = this.profiles.find(p => p.id === profileId);
            if (confirm(`Are you sure you want to delete ${profile.displayName}'s profile?`)) {
                await ProfileService.deleteProfile(profileId);
            }
        }

        // Nickname actions
        if (button.classList.contains('edit-nickname')) {
            this.editNickname(button, profileId);
        }

        if (button.classList.contains('save-nickname')) {
            event.preventDefault();
            await this.saveNickname(button, profileId);
        }

        if (button.classList.contains('delete-nickname')) {
            const li = button.closest('.nickname-item');
            const nicknameId = li.dataset.nickId;
            await ProfileService.deleteNickname(profileId, String(nicknameId));
        }

        if (button.parentElement.classList.contains('add-nickname-form')) {
            event.preventDefault();
            await this.addNickname(button, profileId);
        }
    }

    toggleCollapsible(card) {
        const content = card.querySelector('.collapsible-content');
        const expandBtn = card.querySelector('.expand-btn');
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            content.classList.remove('expanded');
            expandBtn.classList.remove('expanded');
        } else {
            content.classList.add('expanded');
            expandBtn.classList.add('expanded');
        }
    }


    editProfileName(profileCard, profileId) {
        const nameContainer = profileCard.querySelector('.profile-name-container');
        const profile = this.profiles.find(p => p.id === profileId);
        
        //  // Get all timezones supported by the browser.
        //  const timezones = Intl.supportedValuesOf('timeZone');
        //  const timezoneOptions = timezones.map(tz => {
        //      // Pre-select the profile's current timezone.
        //      const selected = tz === profile.timezone ? 'selected' : '';
        //      return `<option value="${tz}" ${selected}>${tz}</option>`;
        //  }).join('');

        // Added inputs for timezone and birthdate
        nameContainer.innerHTML = `
           <form class="edit-form">
                <label>Name:</label>
                <input type="text" name="displayName" value="${profile.displayName}" placeholder="Name">
                <label>Translation:</label>
                <input type="text" name="mainTranslation" value="${profile.mainTranslation}" placeholder="Translation">
                
                <label>Country:</label>
                <select name="country" id="country-select"></select>

                <label>Timezone:</label>
                <select name="timezone" id="timezone-select"></select>

                <label>Birthday:</label>
                <input type="date" name="birthdate" value="${profile.birthdate || ''}">
                <button class="save-profile-name">OK</button>
            </form>`;

            this._populateCountryDropdown(profile);
            this._preselectValuesFromProfile(profile);
    }

     /**
     * Fills the country dropdown with all available countries.
     */
     _populateCountryDropdown(profile) {
        const countrySelect = this.shadowRoot.getElementById('country-select');
        const countryOptions = this.timezoneData.map(data => {
            return `<option value="${data.country}">${data.country}</option>`;
        }).join('');
        countrySelect.innerHTML = `<option value="">-- Select Country --</option>${countryOptions}`;
    }

    /**
     * Populates the timezone dropdown based on the selected country.
     */
    _populateTimezoneDropdown(countryName, selectedTimezone = null) {
        const timezoneSelect = this.shadowRoot.getElementById('timezone-select');
        const countryData = this.timezoneData.find(d => d.country === countryName);
        
        if (!countryData || countryData.timezones.length === 0) {
            timezoneSelect.innerHTML = '';
            timezoneSelect.style.display = 'none';
            return;
        }
        
        const timezoneOptions = countryData.timezones.map(tz => {
            const selected = (tz === selectedTimezone) ? 'selected' : '';
            return `<option value="${tz}" ${selected}>${tz.replace(/_/g, ' ')}</option>`;
        }).join('');

        timezoneSelect.innerHTML = timezoneOptions;
        timezoneSelect.style.display = 'block';

        // If there's only one timezone, select it automatically.
        if (countryData.timezones.length === 1) {
            timezoneSelect.value = countryData.timezones[0];
        }
    }
    
    /**
     * Sets the initial dropdown values based on the saved profile.
     */
    _preselectValuesFromProfile(profile) {
        if (!profile.timezone) {
            // Hide the timezone dropdown if none is set
            const timezoneSelect = this.shadowRoot.getElementById('timezone-select');
            timezoneSelect.style.display = 'none';
            return;
        };

        // Find which country the saved timezone belongs to
        const countryData = this.timezoneData.find(d => d.timezones.includes(profile.timezone));

        if (countryData) {
            const countrySelect = this.shadowRoot.getElementById('country-select');
            countrySelect.value = countryData.country;
            this._populateTimezoneDropdown(countryData.country, profile.timezone);
        }
    }

    /**
     * Handles the change event for the country dropdown.
     */
    _handleCountryChange(countryName) {
        this._populateTimezoneDropdown(countryName);
    }

    async saveProfileName(profileCard, profileId) {
        const form = profileCard.querySelector('.edit-form');
        // Use FormData to reliably get values
        const formData = new FormData(form);
        
        const updates = {
            displayName: formData.get('displayName'),
            mainTranslation: formData.get('mainTranslation'),
            timezone: formData.get('timezone'),
            birthdate: formData.get('birthdate')
        };
        
        await ProfileService.updateProfile(profileId, updates);
    }
    // =======================
    // =====  MODIFIED CODE END  =====
    // =======================

    editNickname(button, profileId) {
        const li = button.closest('.nickname-item');
        const nickId = li.dataset.nickId;
        const profile = this.profiles.find(p => p.id === profileId);
        
        if (!profile || !profile.nicknames) {
            console.error('Profile not found or has no nicknames:', profileId);
            return;
        }
        
        const nick = profile.nicknames.find(n => String(n.id) === String(nickId));
        
        if (!nick) {
            console.error('Nickname not found:', nickId, 'in profile:', profileId);
            return;
        }
        
        li.innerHTML = `
            <form class="edit-form">
                <input type="text" value="${nick.display}">
                <input type="text" value="${nick.targetLang_value}">
                <button class="save-nickname" data-nick-id="${nick.id}">OK</button>
            </form>`;
    }

    async saveNickname(button, profileId) {
        const li = button.closest('.nickname-item');
        const nickId = button.dataset.nickId;
        const form = li.querySelector('.edit-form');
        const newDisplay = form.children[0].value;
        const newTargetLangValue = form.children[1].value;
        
        await ProfileService.updateNickname(profileId, String(nickId), {
            display: newDisplay,
            baseLang_value: newDisplay,
            targetLang_value: newTargetLangValue
        });
    }

    async addNickname(button, profileId) {
        const form = button.parentElement;
        const displayInput = form.children[0];
        const targetLangInput = form.children[1];
        
        if (displayInput.value && targetLangInput.value) {
            await ProfileService.addNickname(profileId, displayInput.value, targetLangInput.value);
            displayInput.value = '';
            targetLangInput.value = '';
        }
    }

    renderProfiles() {
        const container = this.shadowRoot.getElementById('profiles-container');
        container.innerHTML = '';

        this.profiles.forEach(profile => {
            const card = this.createProfileCard(profile);
            container.appendChild(card);
        });
    }

    createProfileCard(profile) {
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.dataset.profileId = profile.id;

        card.innerHTML = `
            <div class="profile-header">
                <label>
                    <img src="${profile.image}" alt="Avatar">
                    <input type="file" accept="image/*" class="image-upload" style="display:none;">
                </label>
                <div class="profile-name-container">
                    <h3>${profile.displayName}</h3>
                    <div class="translation">(${profile.mainTranslation})</div>
                </div>
                <div class="profile-actions">
                    <button class="expand-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6,9 12,15 18,9"></polyline>
                        </svg>
                    </button>
                    <button class="edit-profile-name">
                        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="delete-profile">
                        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="collapsible-content">
                <ul class="nickname-list">
                    ${profile.nicknames.map(nick => `
                        <li class="nickname-item" data-nick-id="${nick.id}">
                            <span>${nick.display} (${nick.targetLang_value})</span>
                            <div class="nickname-actions">
                                <button class="edit-nickname">
                                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="delete-nickname">
                                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
                <div class="add-nickname-form">
                    <input type="text" placeholder="Nickname...">
                    <input type="text" placeholder="Translation...">
                    <button>Add</button>
                </div>
            </div>
        `;

        return card;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }

                /* Profile Cards */
                .profile-card {
                    background: var(--container-color);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    border: 1px solid #e0e0e0;
                    width: 100%;
                    box-sizing: border-box;
                }

                .profile-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    justify-content: space-between;
                    min-width: 0;
                }

                .profile-header img {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    object-fit: cover;
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .profile-name-container {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                }

                .profile-name-container h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }

                .translation {
                    font-size: 0.9rem;
                    color: #666;
                    word-wrap: break-word;
                }

                .profile-actions {
                    display: flex;
                    gap: 0.5rem;
                    flex-shrink: 0;
                }

                .nickname-actions {
                    display: flex;
                    gap: 0.25rem;
                    flex-shrink: 0;
                }

                .profile-actions button, .nickname-actions button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 6px;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .profile-actions button:hover, .nickname-actions button:hover {
                    background-color: #f0f0f0;
                }

                .profile-actions svg {
                    width: 18px;
                    height: 18px;
                    flex-shrink: 0;
                }

                .nickname-actions svg {
                    width: 16px;
                    height: 16px;
                    flex-shrink: 0;
                }

                .delete-profile, .delete-nickname {
                    color: var(--danger-color);
                }

                /* Collapsible content */
                .collapsible-content {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease;
                }

                .collapsible-content.expanded {
                    max-height: 1000px;
                    padding-top: 1rem; /* Added padding for when it's open */
                }

                .expand-btn svg {
                    transition: transform 0.3s ease;
                }

                .expand-btn.expanded svg {
                    transform: rotate(180deg);
                }

                /* Lists */
                .nickname-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    width: 100%;
                    box-sizing: border-box;
                }

                .nickname-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid #f0f0f0;
                    width: 100%;
                    box-sizing: border-box;
                    min-width: 0;
                }

                .nickname-item:last-child {
                    border-bottom: none;
                }

                .nickname-item span {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    margin-right: 0.5rem;
                }

                /* Forms */
                .add-nickname-form, .edit-form {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-top: 1rem;
                    width: 100%;
                    box-sizing: border-box;
                }
                
                /* Added style for edit form label */
                .edit-form label {
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: #666;
                    margin-top: 0.5rem;
                }

                .add-nickname-form input, .edit-form input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    font-size: 1rem;
                    box-sizing: border-box;
                    min-width: 0;
                }

                .add-nickname-form button, .edit-form button {
                    width: 100%;
                    padding: 0.75rem;
                    border: none;
                    background-color: var(--primary-color);
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                    transition: background-color 0.2s;
                    box-sizing: border-box;
                    margin-top: 0.5rem; /* Added margin to button */
                }

                .add-nickname-form button:hover, .edit-form button:hover {
                    background-color: #004bb4;
                }

                #add-profile-btn {
                    width: 100%;
                    padding: 1rem;
                    margin-top: 1rem;
                    background-color: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 1rem;
                    box-sizing: border-box;
                }

                /* Dialog Styles */
                dialog {
                    border: none;
                    border-radius: 12px;
                    padding: 0;
                    width: 90%;
                    max-width: 400px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }

                dialog::backdrop {
                    background-color: rgba(0, 0, 0, 0.5);
                }

                .dialog-content {
                    padding: 1.5rem;
                }

                .dialog-header {
                    margin: 0 0 1.5rem 0;
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: var(--text-color);
                }

                .dialog-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .dialog-form input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    font-size: 1rem;
                    box-sizing: border-box;
                }

                .dialog-form input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(0, 95, 204, 0.2);
                }

                .dialog-actions {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 1rem;
                }

                .dialog-actions button {
                    flex: 1;
                    padding: 0.75rem;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                    transition: background-color 0.2s;
                }

                .dialog-actions .primary-btn {
                    background-color: var(--primary-color);
                    color: white;
                }

                .dialog-actions .primary-btn:hover {
                    background-color: #004bb4;
                }

                .dialog-actions .secondary-btn {
                    background-color: #f8f9fa;
                    color: var(--text-color);
                    border: 1px solid #e0e0e0;
                }

                .dialog-actions .secondary-btn:hover {
                    background-color: #e9ecef;
                }
            </style>
            
            <div id="profiles-container"></div>
            <button id="add-profile-btn">Add Profile</button>

            <dialog id="add-profile-dialog">
                <div class="dialog-content">
                    <h3 class="dialog-header">Add New Profile</h3>
                    <form id="add-profile-form" class="dialog-form">
                        <input type="text" name="name" placeholder="Child's name" required autocomplete="off">
                        <input type="text" name="translation" placeholder="Translation" required autocomplete="off">
                        <div class="dialog-actions">
                            <button type="button" class="secondary-btn" onclick="this.closest('dialog').close()">Cancel</button>
                            <button type="submit" class="primary-btn">Add Profile</button>
                        </div>
                    </form>
                </div>
            </dialog>
        `;
    }
}

customElements.define('profiles-tab', ProfilesTab);