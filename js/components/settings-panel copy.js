import { eventBus, EVENTS } from '../utils/events.js';

class SettingsPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isOpen = false;
        this.activeTab = 'profiles';
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        eventBus.on(EVENTS.SETTINGS_TOGGLE, () => {
            this.toggle();
        });

        this.shadowRoot.addEventListener('click', this.handleClick.bind(this));
    }

    toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.open();
        } else {
            this.close();
        }
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

    handleClick(event) {
        const target = event.target;

        // Handle overlay clicks
        if (target.classList.contains('overlay')) {
            this.close();
            return;
        }

        // Handle close button
        const closeBtn = target.closest('.close-btn');
        if (closeBtn) {
            this.close();
            return;
        }

        // Handle tab switching
        const tabButton = target.closest('.tab-button');
        if (tabButton) {
            this.switchTab(tabButton.dataset.tab);
            return;
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        
        // Update tab buttons
        this.shadowRoot.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        this.shadowRoot.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: var(--overlay-bg);
                    z-index: 200;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.3s ease, visibility 0.3s ease;
                }

                :host(.open) {
                    opacity: 1;
                    visibility: visible;
                }

                .panel {
                    position: absolute;
                    top: 0;
                    right: -100%;
                    width: 90%;
                    max-width: 400px;
                    height: 100%;
                    background-color: var(--background-color);
                    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
                    transition: right 0.3s ease;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                :host(.open) .panel {
                    right: 0;
                }

                .header {
                    background-color: var(--panel-bg);
                    padding: 1rem;
                    border-bottom: 1px solid var(--color-border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }

                .header h2 {
                    margin: 0;
                    font-size: 1.2rem;
                    font-weight: 700;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    transition: background-color 0.2s;
                }

                .close-btn:hover {
                    background-color: #f0f0f0;
                }

                .tabs {
                    display: flex;
                    background-color: var(--panel-bg);
                    padding: 0.75rem;
                    border-bottom: 1px solid var(--color-border);
                    flex-shrink: 0;
                }

                .tab-button {
                    flex: 1;
                    padding: 0.75rem;
                    background: #e9ecef;
                    border: 1px solid #dee2e6;
                    cursor: pointer;
                    font-weight: 600;
                    color: var(--color-text-light);
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }
                
                .tab-button:first-of-type {
                    border-radius: 8px 0 0 8px;
                    border-right: none;
                }
                
                .tab-button:last-of-type {
                    border-radius: 0 8px 8px 0;
                    border-left: none;
                }

                .tab-button.active {
                    color: var(--primary-text-color);
                    background-color: var(--primary-color);
                    border-color: var(--primary-color);
                }

                .tab-button:hover:not(.active) {
                    background-color: #f1f3f5;
                }

                .tab-button svg {
                    width: 18px;
                    height: 18px;
                }

                .content {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 1rem;
                }

                .tab-content {
                    display: none;
                }

                .tab-content.active {
                    display: block;
                }

                @media (max-width: 768px) {
                    .panel {
                        width: 100%;
                        max-width: 100%;
                    }

                    .tab-button {
                        padding: 0.75rem 0.5rem;
                        font-size: 0.9rem;
                    }
                    
                    .content {
                        padding: 0.75rem;
                    }
                }
            </style>

            <div class="overlay"></div>
            <div class="panel">
                <div class="header">
                    <h2>Settings</h2>
                    <button class="close-btn">×</button>
                </div>
                
                <div class="tabs">
                    <button class="tab-button active" data-tab="profiles">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Profiles
                    </button>
                    <button class="tab-button" data-tab="messages">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        Messages
                    </button>
                </div>
                
                <div class="content">
                    <div id="tab-profiles" class="tab-content active">
                        <profiles-tab></profiles-tab>
                    </div>
                    
                    <div id="tab-messages" class="tab-content">
                        <messages-tab></messages-tab>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('settings-panel', SettingsPanel);