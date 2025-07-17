import { eventBus, EVENTS } from '../utils/events.js';

class AppHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
    }

    setupEvents() {
        const settings = this.shadowRoot.querySelector('.settings');
        if (settings) {
            settings.addEventListener('click', () => {
                eventBus.emit(EVENTS.SETTINGS_TOGGLE);
            });
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    background-color: var(--container-color);
                }
                .title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--color-text-dark);
                }
                .settings {
                    background: none; border: none; cursor: pointer;
                    padding: 8px; border-radius: 50%;
                    transition: background-color 0.2s;
                }
                .settings:hover { background-color: #f0f0f0; }
                .settings svg { width: 24px; height: 24px; color: #555; }
            </style>

            <h2 class="title">Quick Messages</h2>

            <button class="settings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                </svg>
            </button>
        `;
    }
}

customElements.define('app-header', AppHeader);