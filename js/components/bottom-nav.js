import { eventBus, EVENTS } from '../utils/events.js';

class BottomNav extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.activeView = 'home'; // The default view is the message carousel
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        // Listen for external events that might change the view
        eventBus.on(EVENTS.VIEW_CHANGED, (view) => this.setActiveView(view));
    }

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const view = button.dataset.view;
            if (view) {
                // The settings button uses the existing panel toggle event
                if (view === 'settings') {
                    eventBus.emit(EVENTS.SETTINGS_TOGGLE);
                } else {
                    // For other buttons, change the main view
                    this.setActiveView(view);
                }
            }
        });
    }

    /**
     * Sets the active view and notifies the rest of the app.
     * @param {string} view - The name of the view to activate ('home', 'profiles', 'messages').
     */
    setActiveView(view) {
        if (view !== this.activeView) {
            this.activeView = view;
            eventBus.emit(EVENTS.VIEW_CHANGED, this.activeView);
            this.updateActiveButton();
        }
    }

    updateActiveButton() {
        this.shadowRoot.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.activeView);
        });
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
                    background-color: var(--container-color);
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.08);
                    z-index: 100;
                    border-top: 1px solid var(--color-border);
                }
                nav {
                    display: flex;
                    justify-content: space-around;
                    padding: 0.5rem 0;
                }
                button {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding: 0.5rem 0;
                    border: none;
                    background-color: transparent;
                    color: var(--color-text-light);
                    font-size: 0.75rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: color 0.2s ease-in-out;
                }
                button.active {
                    color: var(--primary-color);
                }
                button:hover:not(.active) {
                    color: #333;
                }
                svg {
                    width: 24px;
                    height: 24px;
                }
            </style>
            <nav>
                <button data-view="home" class="active">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg>
                    <span>Home</span>
                </button>
                <button data-view="profiles">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    <span>Profiles</span>
                </button>
                <button data-view="messages">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M4.94,4.929,4.929,4.94l-.011.011v9.12a2,2,0,0,0,2,2H17.07l3,3V6.929a2,2,0,0,0-2-2H6.94A2,2,0,0,0,4.94,4.929ZM8,11a1,1,0,1,1,1-1A1,1,0,0,1,8,11Zm4,0a1,1,0,1,1,1-1A1,1,0,0,1,12,11Zm4,0a1,1,0,1,1,1-1A1,1,0,0,1,16,11Z"></path></svg>
                    <span>Messages</span>
                </button>
                <button data-view="settings">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.424.35.534.954.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span>Settings</span>
                </button>
            </nav>
        `;
    }
}

customElements.define('bottom-nav', BottomNav);