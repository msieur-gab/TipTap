import { eventBus, EVENTS } from '../utils/events.js';
import { ProfileService } from '../services/profiles.js';
import { i18n } from '../services/i18n.js';

class BottomProfileSelector extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.profiles = [];
        this.activeProfile = null;
        this.isOpen = false;
        
        this.boundLoadProfiles = this.loadProfiles.bind(this);
        this.boundCloseDropdown = this.closeDropdown.bind(this);
    }

    connectedCallback() {
        this.render();
        this.loadProfiles();

        eventBus.on(EVENTS.PROFILES_UPDATED, this.boundLoadProfiles);
        document.addEventListener('click', this.boundCloseDropdown);
        this.boundUpdateLanguage = () => { this.render(); this.loadProfiles(); };
        i18n.addListener(this.boundUpdateLanguage);
    }

    disconnectedCallback() {
        eventBus.off(EVENTS.PROFILES_UPDATED, this.boundLoadProfiles);
        document.removeEventListener('click', this.boundCloseDropdown);
        i18n.removeListener(this.boundUpdateLanguage);
    }

    setupEvents() {
        const container = this.shadowRoot.querySelector('.container');
        
        container.addEventListener('click', (e) => {
            if (this.classList.contains('no-profiles')) {
                this.dispatchEvent(new CustomEvent('request-profile-modal', {
                    bubbles: true,
                    composed: true,
                    detail: { forceCreate: true }
                }));
            } else {
                e.stopPropagation();
                this.toggleDropdown();
            }
        });
    }

    async loadProfiles() {
        try {
            this.profiles = await ProfileService.getAllProfiles();
            const activeProfileStillExists = this.profiles.some(p => p.id === this.activeProfile?.id);

            if (!this.activeProfile || !activeProfileStillExists) {
                this.activeProfile = this.profiles.length > 0 ? this.profiles[0] : null;
                this.activeNickname = null;
                // --- MODIFICATION START ---
                // Emit the first profile by default on load
                if (this.activeProfile) {
                    eventBus.emit(EVENTS.PROFILE_SELECTED, { profile: this.activeProfile, nickname: null });
                }
            } else {
                this.activeProfile = this.profiles.find(p => p.id === this.activeProfile.id);
                if (this.activeNickname) {
                    const nicknameStillExists = this.activeProfile.nicknames.some(n => n.id === this.activeNickname.id);
                    if (!nicknameStillExists) this.activeNickname = null;
                }
            }
             // After any profile update, always re-broadcast the active profile.
            // This ensures other components (like the header) get the latest data.
            if (this.activeProfile) {
                eventBus.emit(EVENTS.PROFILE_SELECTED, { profile: this.activeProfile, nickname: this.activeNickname });
            }
            
            this.updateDisplay();
            this.renderOptions();
        } catch (error) {
            console.error('Error loading profiles:', error);
            const name = this.shadowRoot.querySelector('.name');
            if (name) name.textContent = i18n.t('errors.loadingFailed');
        }
    }

    // updateDisplay() {
    //     const avatar = this.shadowRoot.querySelector('.avatar');
    //     const name = this.shadowRoot.querySelector('.name');
        
    //     if (this.activeProfile && avatar && name) {
    //         const activeNickname = this.activeNickname && this.activeProfile.nicknames.find(n => n.id === this.activeNickname.id);
    //         // name.textContent = activeNickname ? activeNickname.display : this.activeProfile.originalName || 'Loading...';
    //         name.textContent = this.activeProfile.originalName || 'Loading...';

    //         avatar.src = this.activeProfile.image || 'https://placehold.co/40x40/ccc/333?text=?';
    //     } else if (avatar && name) {
    //         avatar.src = 'https://placehold.co/40x40/ccc/333?text=?';
    //         name.textContent = 'No Profile';
    //         this.activeProfile = null;
    //     }
    // }

    updateDisplay() {
        const avatar = this.shadowRoot.querySelector('.avatar');
        const name = this.shadowRoot.querySelector('.name');
        const label = this.shadowRoot.querySelector('.label');
        
        // --- UX IMPROVEMENT: Handle the "no profiles" state ---
        if (this.profiles.length === 0) {
            this.classList.add('no-profiles');
            label.style.display = 'none'; // Hide the "Messages for" label
            name.textContent = i18n.t('settings.addProfile'); // Show "Add New Profile"
            avatar.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='12' y1='5' x2='12' y2='19'%3E%3C/line%3E%3Cline x1='5' y1='12' x2='19' y2='12'%3E%3C/line%3E%3C/svg%3E`;
            avatar.style.backgroundColor = '#1f2937';
            this.activeProfile = null;
        } else {
            this.classList.remove('no-profiles');
            label.style.display = 'block';
            if (this.activeProfile && avatar && name) {
                name.textContent = this.activeProfile.originalName || i18n.t('common.loading');
                avatar.src = this.activeProfile.image || 'https://placehold.co/40x40/ccc/333?text=?';
                avatar.style.backgroundColor = '';
            }
        }
    }

    renderOptions() {
        const optionsContainer = this.shadowRoot.querySelector('.options');
        if (!optionsContainer) return;

        optionsContainer.innerHTML = '';
        this.profiles.forEach(profile => {
            const option = document.createElement('div');
            option.className = 'option';
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectProfile(profile);
            });
            option.innerHTML = `<img src="${profile.image}" class="option-avatar"> <span>${profile.originalName}</span>`;
            optionsContainer.appendChild(option);

            if (profile.nicknames && profile.nicknames.length > 0) {
                profile.nicknames.forEach(nickname => {
                    const nickOption = document.createElement('div');
                    nickOption.className = 'option nickname';
                    nickOption.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectNickname(profile, nickname);
                    });
                    nickOption.innerHTML = `<span class="nickname-text">↳ ${nickname.display}</span>`;
                    optionsContainer.appendChild(nickOption);
                });
            }
        });

        const general = document.createElement('div');
        general.className = 'option';
        general.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectProfile({ id: 'general', originalName: i18n.t('app.general'), image: 'https://placehold.co/40x40/ccc/333?text=G' });
        });
        general.innerHTML = `<img src="https://placehold.co/24x24/ccc/333?text=G" class="option-avatar"> <span>${i18n.t('app.general')}</span>`;
        optionsContainer.appendChild(general);

        const addNewProfile = document.createElement('div');
        addNewProfile.className = 'option';
        addNewProfile.style.cssText = 'color: var(--primary-color); font-weight: 600;';
        addNewProfile.innerHTML = `<span>+ ${i18n.t('settings.addProfile')}</span>`;
        addNewProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeDropdown();
            // Dispatch a custom event to request the profile modal
            this.dispatchEvent(new CustomEvent('request-profile-modal', {
                bubbles: true,
                composed: true
            }));
        });
        optionsContainer.appendChild(addNewProfile);
    }
    

    selectProfile(profile) {
        this.activeProfile = profile;
        this.activeNickname = null;
        this.updateDisplay();
        this.closeDropdown();
        
        eventBus.emit(EVENTS.PROFILE_SELECTED, { profile: this.activeProfile, nickname: null });
    }

    selectNickname(profile, nickname) {
        this.activeProfile = profile;
        this.activeNickname = nickname;
        this.updateDisplay();
        this.closeDropdown();
        
        eventBus.emit(EVENTS.PROFILE_SELECTED, { profile: this.activeProfile, nickname: this.activeNickname });

    }

    toggleDropdown() {
        this.isOpen = !this.isOpen;
        const dropdown = this.shadowRoot.querySelector('.dropdown');
        if (dropdown) dropdown.style.display = this.isOpen ? 'block' : 'none';
    }

    closeDropdown() {
        if (this.isOpen) {
            this.isOpen = false;
            const dropdown = this.shadowRoot.querySelector('.dropdown');
            if (dropdown) dropdown.style.display = 'none';
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    bottom: 2rem;
                    left: 50%;
                    transform: translateX(-50%);
                    min-width: 20vw;
                    max-width: 450px;
                    background-color: rgba(0,0,0,0.85);
                    backdrop-filter: blur(2px);
                    -webkit-backdrop-filter: blur(2px);
                    z-index: 100;
                    border-radius: 16px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    border: 1px solid var(--color-border);
                }
                .container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                }
                :host(.no-profiles) .arrow {
                    display: none;
                }
                .left { display: flex; align-items: center; gap: 0.75rem; }
                .avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; padding: 12px; box-sizing: border-box;}
                .info-stack { display: flex; flex-direction: column; }
                .label { font-size: 0.8rem; color: #FFF; }
                .selector-container { position: relative; display: flex; align-items: center; gap: 0.25rem; border-radius: 6px; }
                .name { font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700; color: white; }
                .arrow { width: 20px; height: 20px; color:rgb(192, 192, 192); transition: transform 0.2s; }
                .dropdown {
                    position: absolute;
                    bottom: calc(100% + 5px);
                    left: 0;
                    width: 100%;
                    background: black;
                    border-radius: 8px;
                    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
                    z-index: 10;
                    min-width: 150px;
                    display: none;
                    color: white;
                }
                .option { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; cursor: pointer; border-bottom: 1px solid #333; }
                .option:hover { background-color:rgb(24, 24, 24); }
                .option:last-child { border-bottom: none; }
                .option-avatar { width: 24px; height: 24px; border-radius: 50%; }
                .option.nickname { background-color:rgb(14, 14, 14); padding-left: 0.0rem; }
                .nickname-text { margin-left: 32px; color:rgb(201, 201, 201); }
            </style>
            <div class="container">
                <div class="left">
                    <img src="https://placehold.co/40x40/ccc/333?text=?" class="avatar">
                    <div class="info-stack">
                        <span class="label">${i18n.t('app.messagesFor')}</span>
                        <div class="selector-container">
                            <span class="name">${i18n.t('common.loading')}</span>
                            <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6,9 12,15 18,9" style="transform: scaleY(-1); transform-origin: center;"></polyline>
                            </svg>
                            <div class="dropdown">
                                <div class="options"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        setTimeout(() => this.setupEvents(), 0);
    }
}
customElements.define('bottom-profile-selector', BottomProfileSelector);