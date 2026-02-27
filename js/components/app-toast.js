// js/components/app-toast.js
import { eventBus, EVENTS } from '../utils/events.js';

class AppToast extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.timeoutId = null;
        this.boundShow = (data) => this.show(data.message, data.type);
    }

    connectedCallback() {
        this.render();
        eventBus.on(EVENTS.TOAST, this.boundShow);
    }

    disconnectedCallback() {
        eventBus.off(EVENTS.TOAST, this.boundShow);
        clearTimeout(this.timeoutId);
    }

    show(message, type = 'success') {
        const toast = this.shadowRoot.querySelector('.toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;

        clearTimeout(this.timeoutId);
        // Trigger reflow for animation restart
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        this.timeoutId = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    bottom: 6rem;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9000;
                    pointer-events: none;
                }
                .toast {
                    padding: 0.75rem 1.25rem;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    font-family: var(--font-family-base, sans-serif);
                    white-space: nowrap;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
                .toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }
                .toast.success {
                    background-color: var(--color-text-dark, #1f2937);
                    color: var(--primary-text-color, #fff);
                }
                .toast.error {
                    background-color: #dc2626;
                    color: #fff;
                }
            </style>
            <div class="toast"></div>
        `;
    }
}

customElements.define('app-toast', AppToast);
