// js/components/app-modal.js

class AppModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['title', 'large'];
    }

    attributeChangedCallback() {
        if (this.isConnected) this.updateHeader();
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    get dialog() {
        return this.shadowRoot.querySelector('dialog');
    }

    open() {
        this.dialog?.showModal();
    }

    close() {
        this.dialog?.close();
    }

    setupEventListeners() {
        // Close on backdrop click
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.close();
            }
        });

        // Close button
        this.shadowRoot.querySelector('.close-button').addEventListener('click', () => {
            this.close();
        });

        // Emit event when closed
        this.dialog.addEventListener('close', () => {
            this.dispatchEvent(new CustomEvent('modal-close'));
        });
    }

    updateHeader() {
        const titleEl = this.shadowRoot.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = this.getAttribute('title') || '';

        const dialog = this.dialog;
        if (dialog) {
            dialog.classList.toggle('large', this.hasAttribute('large'));
        }
    }

    render() {
        const title = this.getAttribute('title') || '';
        const isLarge = this.hasAttribute('large');

        this.shadowRoot.innerHTML = `
            <style>
                dialog {
                    border: none;
                    border-radius: 16px;
                    padding: 0;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    width: 90%;
                    max-width: 400px;
                    background-color: var(--container-color, #fff);
                    overflow: hidden;
                }
                dialog::backdrop {
                    background-color: rgba(0,0,0,0.4);
                }
                dialog.large {
                    max-width: 500px;
                    width: 95%;
                    max-height: 85vh;
                }
                dialog.large[open] {
                    display: flex;
                    flex-direction: column;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 2rem 1rem;
                    border-bottom: 1px solid var(--color-border, #e5e7eb);
                    flex-shrink: 0;
                }
                .modal-title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--color-text-dark, #1f2937);
                }
                .close-button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.5rem;
                    color: var(--color-text-light, #6b7280);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .close-button:hover {
                    background-color: var(--color-border, #e5e7eb);
                }
                .modal-body {
                    padding: 1.5rem 2rem 2rem;
                    overflow-y: auto;
                }
            </style>

            <dialog${isLarge ? ' class="large"' : ''}>
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button type="button" class="close-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <slot></slot>
                </div>
            </dialog>
        `;
    }
}

customElements.define('app-modal', AppModal);
