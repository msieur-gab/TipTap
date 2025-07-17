import { eventBus, EVENTS } from '../utils/events.js';
import { ProfileService } from '../services/profiles.js';

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
    }

    disconnectedCallback() {
        eventBus.off(EVENTS.PROFILES_UPDATED, this.boundLoadProfiles);
        document.removeEventListener('click', this.boundCloseDropdown);
    }

    setupEvents() {
        const selector = this.shadowRoot.querySelector('.selector-container');
        selector.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
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
            if (name) name.textContent = 'Error loading';
        }
    }

    updateDisplay() {
        const avatar = this.shadowRoot.querySelector('.avatar');
        const name = this.shadowRoot.querySelector('.name');
        
        if (this.activeProfile && avatar && name) {
            const activeNickname = this.activeNickname && this.activeProfile.nicknames.find(n => n.id === this.activeNickname.id);
            // name.textContent = activeNickname ? activeNickname.display : this.activeProfile.displayName || 'Loading...';
            name.textContent = this.activeProfile.displayName || 'Loading...';

            avatar.src = this.activeProfile.image || 'https://placehold.co/40x40/ccc/333?text=?';
        } else if (avatar && name) {
            avatar.src = 'https://placehold.co/40x40/ccc/333?text=?';
            name.textContent = 'No Profile';
            this.activeProfile = null;
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
            option.innerHTML = `<img src="${profile.image}" class="option-avatar"> <span>${profile.displayName}</span>`;
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
            this.selectProfile({ id: 'general', displayName: 'General', image: 'https://placehold.co/40x40/ccc/333?text=G' });
        });
        general.innerHTML = `<img src="https://placehold.co/24x24/ccc/333?text=G" class="option-avatar"> <span>General</span>`;
        optionsContainer.appendChild(general);
    }

    selectProfile(profile) {
        this.activeProfile = profile;
        this.activeNickname = null;
        this.updateDisplay();
        this.closeDropdown();
        
        const selection = this.activeProfile.id === 'general' 
            ? { baseLang_value: '', targetLang_value: '' }
            : { baseLang_value: this.activeProfile.displayName, targetLang_value: this.activeProfile.mainTranslation };
        
            // eventBus.emit(EVENTS.PROFILE_SELECTED, { profile: this.activeProfile, nickname: null });
            eventBus.emit(EVENTS.PROFILE_SELECTED, { profile: this.activeProfile, nickname: null });

        }

    selectNickname(profile, nickname) {
        this.activeProfile = profile;
        this.activeNickname = nickname;
        this.updateDisplay();
        this.closeDropdown();
        
        const selection = {
            baseLang_value: nickname.baseLang_value || nickname.display,
            targetLang_value: nickname.targetLang_value || nickname.display
        };
        
        // eventBus.emit(EVENTS.PROFILE_SELECTED, selection);
        // eventBus.emit(EVENTS.NICKNAME_SELECTED, selection);
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
                    /* --- FAB Styling --- */
                    position: fixed;
                    bottom: 2rem; /* As requested */
                    left: 50%;
                    transform: translateX(-50%);
                    min-width: 20vw;
                    max-width: 450px; /* Adjusted max-width */
                    background-color: rgba(0,0,0,0.85);
                    backdrop-filter: blur(2px);
                    -webkit-backdrop-filter: blur(2px);
                    z-index: 100;
                    border-radius: 16px; /* Rounded corners for floating look */
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15); /* More prominent shadow */
                    border: 1px solid var(--color-border);
                }
                .container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;

                    
                }
                .left { display: flex; align-items: center; gap: 0.75rem; }
                .avatar { width: 48px; height: 48px; border-radius: 50%; }
                .info-stack { display: flex; flex-direction: column; }
                .label { font-size: 0.8rem; color: #FFF; }
                .selector-container { position: relative; display: flex; align-items: center; gap: 0.25rem; cursor: pointer; padding: 0.1rem 0.25rem; margin-left: -0.25rem; border-radius: 6px; }
                .selector-container:hover { background-color:rgb(59, 59, 59); }
                .name { font-size: 1rem;white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis; font-weight: 700; color: white; }
                .arrow { width: 20px; height: 20px; color:rgb(192, 192, 192); transition: transform 0.2s; }
                .dropdown {
                    position: absolute;
                    bottom: calc(100% + 5px);
                    left: 0;
                    width: 100%;
                    background: black;
                    // border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
                    z-index: 10;
                    min-width: 150px;
                    display: none;
                    color: white;
                }
                .option { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; cursor: pointer; border-bottom: 1px solid #f3f4f6; }
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
                        <span class="label">Messages for</span>
                        <div class="selector-container">
                            <span class="name">Loading...</span>
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