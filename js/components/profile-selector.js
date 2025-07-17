import { eventBus, EVENTS } from '../utils/events.js';
import { ProfileService } from '../services/profiles.js';

class ProfileSelector extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.profiles = [];
        this.activeProfile = null;
        this.activeNickname = null;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadProfiles();
    }

    setupEventListeners() {
        eventBus.on(EVENTS.PROFILES_UPDATED, () => {
            this.loadProfiles();
        });

        this.shadowRoot.addEventListener('click', this.handleClick.bind(this));
    }

    async loadProfiles() {
        this.profiles = await ProfileService.getAllProfiles();
        this.renderProfiles();
        
        // Select first profile by default
        if (this.profiles.length > 0 && !this.activeProfile) {
            this.selectProfile(this.profiles[0]);
        }
    }

    selectProfile(profile) {
        this.activeProfile = profile;
        this.activeNickname = null;
        this.updateActiveStates();
        this.renderNicknames();
        this.emitSelectionChange();
    }

    selectNickname(nickname) {
        this.activeNickname = nickname;
        this.updateActiveStates();
        this.emitSelectionChange();
    }

    updateActiveStates() {
        // Update profile buttons
        this.shadowRoot.querySelectorAll('.profile-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.profileId === this.activeProfile?.id);
        });

        // Update nickname buttons
        this.shadowRoot.querySelectorAll('.nickname-btn').forEach(btn => {
            btn.classList.toggle('active', String(btn.dataset.nicknameId) === String(this.activeNickname?.id));
        });
    }

    emitSelectionChange() {
        const selection = this.getCurrentSelection();
        eventBus.emit(EVENTS.PROFILE_SELECTED, selection);
        if (this.activeNickname) {
            eventBus.emit(EVENTS.NICKNAME_SELECTED, selection);
        }
    }

    getCurrentSelection() {
        if (!this.activeProfile) {
            return { baseLang_value: '', targetLang_value: '' };
        }

        if (this.activeProfile.id === 'general') {
            return { baseLang_value: '', targetLang_value: '' };
        }

        if (this.activeNickname) {
            return {
                baseLang_value: this.activeNickname.baseLang_value,
                targetLang_value: this.activeNickname.targetLang_value
            };
        }

        return {
            baseLang_value: this.activeProfile.displayName,
            targetLang_value: this.activeProfile.mainTranslation
        };
    }

    handleClick(event) {
        const profileBtn = event.target.closest('.profile-btn');
        if (profileBtn) {
            const profileId = profileBtn.dataset.profileId;
            if (profileId === 'general') {
                this.selectProfile({ id: 'general', displayName: 'General' });
            } else {
                const profile = this.profiles.find(p => p.id === profileId);
                if (profile) {
                    this.selectProfile(profile);
                }
            }
            return;
        }

        const nicknameBtn = event.target.closest('.nickname-btn');
        if (nicknameBtn) {
            const nicknameId = nicknameBtn.dataset.nicknameId;
            const nickname = this.activeProfile.nicknames.find(n => String(n.id) === String(nicknameId));
            if (nickname) {
                this.selectNickname(nickname);
            }
        }
    }

    renderProfiles() {
        const profilesContainer = this.shadowRoot.getElementById('profiles-container');
        profilesContainer.innerHTML = '';

        // Add user profiles
        this.profiles.forEach(profile => {
            const btn = document.createElement('button');
            btn.className = 'profile-btn';
            btn.dataset.profileId = profile.id;
            btn.innerHTML = `
                <img src="${profile.image}" alt="${profile.displayName}">
                <span>${profile.displayName}</span>
            `;
            profilesContainer.appendChild(btn);
        });

        // Add general option
        const generalBtn = document.createElement('button');
        generalBtn.className = 'profile-btn';
        generalBtn.dataset.profileId = 'general';
        generalBtn.innerHTML = `
            <img src="https://placehold.co/64x64/ccc/333?text=G" alt="General">
            <span>General</span>
        `;
        profilesContainer.appendChild(generalBtn);

        this.updateActiveStates();
    }

    renderNicknames() {
        const nicknamesContainer = this.shadowRoot.getElementById('nicknames-container');
        const hasNicknames = this.activeProfile && 
                           this.activeProfile.nicknames && 
                           this.activeProfile.nicknames.length > 0;

        if (hasNicknames) {
            nicknamesContainer.style.display = 'block';
            const nickSelector = this.shadowRoot.getElementById('nickname-selector');
            nickSelector.innerHTML = '';

            this.activeProfile.nicknames.forEach(nickname => {
                const btn = document.createElement('button');
                btn.className = 'nickname-btn';
                btn.dataset.nicknameId = nickname.id;
                btn.textContent = nickname.display;
                nickSelector.appendChild(btn);
            });
        } else {
            nicknamesContainer.style.display = 'none';
        }

        this.updateActiveStates();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 100%;
                    max-width: 600px;
                    padding: 1rem;
                    background-color: var(--container-color);
                    box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
                    z-index: 100;
                    border-top: 1px solid var(--color-border);
                    box-sizing: border-box;
                }

                #nicknames-container {
                    margin-bottom: 0.75rem;
                }

                #nickname-selector {
                    display: flex;
                    background-color: transparent;
                    border-radius: 12px;
                    padding: 6px;
                    overflow-x: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    gap: 0.5rem;
                }

                #nickname-selector::-webkit-scrollbar {
                    display: none;
                }

                .nickname-btn {
                    background-color: #f1f5f9;
                    margin: 0;
                    flex-shrink: 0;
                    padding: 0.5rem 0.875rem;
                    border: none;
                    color: var(--color-text-light);
                    font-size: 0.875rem;
                    font-weight: 600;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                    text-align: center;
                    white-space: nowrap;
                    border: 2px solid transparent;
                }

                .nickname-btn:hover {
                    background-color: #e2e8f0;
                    transform: translateY(-1px);
                }

                .nickname-btn.active {
                    background-color: var(--primary-color);
                    color: var(--primary-text-color);
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    transform: translateY(-1px);
                }

                #profiles-container {
                    display: flex;
                    align-items: center;
                    background-color: #f8fafc;
                    border-radius: 12px;
                    padding: 6px;
                    gap: 4px;
                }

                .profile-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 0.625rem 0.5rem;
                    border: none;
                    background-color: transparent;
                    color: var(--color-text-light);
                    font-size: 0.875rem;
                    font-weight: 600;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                    text-align: center;
                    white-space: nowrap;
                    border: 2px solid transparent;
                }

                .profile-btn:hover {
                    background-color: #e2e8f0;
                    transform: translateY(-1px);
                }

                .profile-btn.active {
                    background-color: var(--primary-color);
                    color: var(--primary-text-color);
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    transform: translateY(-1px);
                }

                .profile-btn img {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid rgba(255, 255, 255, 0.8);
                }

                .profile-btn.active img {
                    border-color: rgba(255, 255, 255, 0.9);
                }

                @media (max-width: 768px) {
                    :host {
                        padding: 0.875rem;
                    }

                    .profile-btn {
                        font-size: 0.8rem;
                        padding: 0.5rem 0.375rem;
                        gap: 6px;
                    }

                    .profile-btn img {
                        width: 24px;
                        height: 24px;
                    }

                    .nickname-btn {
                        font-size: 0.8rem;
                        padding: 0.425rem 0.75rem;
                    }
                }
            </style>

            <div id="nicknames-container" style="display: none;">
                <div id="nickname-selector" class="no-scrollbar"></div>
            </div>
            <div id="profiles-container"></div>
        `;
    }
}

customElements.define('profile-selector', ProfileSelector);