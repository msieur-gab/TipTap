import { eventBus, EVENTS } from '../utils/events.js';
import { i18n } from '../services/i18n.js';
import './settings-tab.js';
import './profiles-tab.js';
import './messages-tab.js';

class SettingsPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isOpen = false;
        this.activeTab = 'profiles';
        this.boundToggle = () => this.toggle();
        this.boundUpdateContent = () => this.updateContent();
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.updateContent();
    }

    disconnectedCallback() {
        eventBus.off(EVENTS.SETTINGS_TOGGLE, this.boundToggle);
        i18n.removeListener(this.boundUpdateContent);
    }

    setupEventListeners() {
        eventBus.on(EVENTS.SETTINGS_TOGGLE, this.boundToggle);
        i18n.addListener(this.boundUpdateContent);

        const root = this.shadowRoot;
        root.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('overlay') || target.closest('.close-btn')) {
                this.close();
            } else if (target.closest('.tab-button')) {
                this.switchTab(target.closest('.tab-button').dataset.tab);
            }
        });
    }

    updateContent() {
        this.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = i18n.t(el.dataset.i18n);
        });
        const headerTitle = this.shadowRoot.querySelector('.header h2');
        if (headerTitle) {
            const titleKeys = {
                profiles: 'settings.profiles',
                messages: 'settings.messages',
                more: 'settings.more'
            };
            headerTitle.textContent = i18n.t(titleKeys[this.activeTab] || 'settings.title');
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        this.shadowRoot.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        this.shadowRoot.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });

        this.updateContent();
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.isOpen ? this.open() : this.close();
    }

    open() {
        this.isOpen = true;
        this.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.isOpen = false;
        this.classList.remove('open');
        document.body.style.overflow = '';
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: var(--overlay-bg); z-index: 200; opacity: 0;
                    visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease;
                }
                :host(.open) { opacity: 1; visibility: visible; }
                .panel {
                    position: absolute; top: 0; right: -100%; width: 90%; max-width: 420px; height: 100%;
                    background-color: #f8fafc; box-shadow: -2px 0 10px rgba(0,0,0,0.1);
                    transition: right 0.3s ease; display: flex; flex-direction: column;
                }
                :host(.open) .panel { right: 0; }
                .header {
                    background-color: var(--container-color); padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--color-border); display: flex;
                    align-items: center; justify-content: space-between; flex-shrink: 0;
                }
                .header h2 { margin: 0; font-size: 1.25rem; font-weight: 600; }
                .close-btn { background: none; border: none; cursor: pointer; padding: 0.5rem; color: var(--color-text-light); }
                .tabs {
                    display: flex; background-color: var(--container-color); padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--color-border); flex-shrink: 0; gap: 0.5rem;
                }
                .tab-button {
                    flex: 1; padding: 0.75rem; background: #f1f5f9; border: none;
                    border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 0.9rem;
                    color: var(--color-text-light); transition: all 0.2s; display: flex;
                    align-items: center; justify-content: center; gap: 0.5rem;
                }
                .tab-button.active { color: var(--primary-text-color); background-color: var(--color-text-dark); }
                .tab-button svg { width: 18px; height: 18px; }
                .content { flex: 1; overflow-y: auto; overflow-x: hidden; }
                .tab-content { display: none; }
                .tab-content.active { display: block; }
                @media (max-width: 768px) { .panel { width: 100%; max-width: 100%; } }
            </style>

            <div class="overlay"></div>
            <div class="panel">
                <div class="header">
                    <h2></h2>
                    <button class="close-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div class="tabs">
                    <button class="tab-button active" data-tab="profiles">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span data-i18n="settings.profiles">Profiles</span>
                    </button>
                    <button class="tab-button" data-tab="messages">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        <span data-i18n="settings.messages">Messages</span>
                    </button>
                    <button class="tab-button" data-tab="more">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                        <span data-i18n="settings.more">More</span>
                    </button>
                </div>

                <div class="content">
                    <div id="tab-profiles" class="tab-content active">
                        <profiles-tab></profiles-tab>
                    </div>
                    <div id="tab-messages" class="tab-content">
                        <messages-tab></messages-tab>
                    </div>
                    <div id="tab-more" class="tab-content">
                        <settings-tab></settings-tab>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('settings-panel', SettingsPanel);
