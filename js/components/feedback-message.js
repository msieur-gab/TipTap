import { eventBus, EVENTS } from '../utils/events.js';

class FeedbackMessage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.timeoutId = null;
        // Bind the event handler once for stable listener reference
        this.boundShowFeedback = (data) => this.showFeedback(data.copied, data.original);
    }

    connectedCallback() {
        this.render();
        eventBus.on(EVENTS.MESSAGE_COPIED, this.boundShowFeedback);
    }

    disconnectedCallback() {
        // Clean up listeners and timers
        eventBus.off(EVENTS.MESSAGE_COPIED, this.boundShowFeedback);
        clearTimeout(this.timeoutId);
    }

    showFeedback(copiedText, originalText) {
        const messageEl = this.shadowRoot.getElementById('message-content');
        if (messageEl) {
             messageEl.innerHTML = `
                <div class="copied-text">${copiedText}</div>
                <div class="original-text">(${originalText})</div>
            `;
        }

        // --- Animation Trigger ---
        clearTimeout(this.timeoutId);
        this.classList.remove('visible'); // Reset first if already visible
        
        requestAnimationFrame(() => {
            this.classList.add('visible'); // Add class to trigger the transition
        });

        // Set timeout to hide the message after 1.5 seconds
        this.timeoutId = setTimeout(() => {
            this.classList.remove('visible');
        }, 1500);
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                --color: rgb(255, 249, 177);
/* --colorDark: color-mix(in srgb, var(--color) 80%, black) var(--bg-color); */
	--colorDark: color-mix(in srgb, var(--color) 80%, black) transparent;
                    position: fixed;
                    top: -150px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 17em;
                    font-size: 1rem;
                    z-index: 9999;
                    
                    opacity: 0;
                    visibility: hidden;
                    transition: top 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                                opacity 0.4s ease-out, 
                                visibility 0s 4.9s;
                }

                :host(.visible) {
                    top: 20vh;
                    opacity: 1;
                    visibility: visible;
                    transition: top 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                                opacity 0.4s ease-in, 
                                visibility 0s 0s;
                }

                .note-body {
                    position: relative;
                    width: 100%;
                    min-height: 4em;
                    padding: 2em 1.5em 1.5em 1.5em;
                    box-sizing: border-box;

                    /* font-family: 'Comic Sans MS', 'Chalkduster', 'cursive'; */
                    line-height: 1.5;
                    color: #333;
                    background: #fff9b1; /* Classic post-it yellow */
                    box-shadow: 0 5px 10px rgba(0,0,0,0.2);
                }
                
                /* This pseudo-element creates the folded corner effect */
                .note-body:before {
                content: "";
                position: absolute;
                top: -1em;
                right: 0;
                border-width: 0 1em 1em 0;
                border-style: solid;
                border-color: var(--colorDark);
                /* 	border-collapse: collapse; */
                }

                .note-body:after {
                content: "";
                position: absolute;
                top: -1em;
                left: 0;
                    right:1em;

                border-width: 1em;
                /* 	border-collapse: collapse; */

                /* 	height: calc (100% -1em); */
                border-style: solid;
                border-color: var(--color);
                }

                #message-content {
                    text-align: center;
                    overflow-wrap: break-word;
                }
                .copied-text { font-weight: bold; }
                .original-text {
                    display: block;
                    font-size: 0.9em;
                    opacity: 0.8;
                    margin-top: 6px;
                    font-style: italic;
                }
            </style>
            
            <div class="note-body">
                <div id="message-content"></div>
            </div>
        `;
    }
}
customElements.define('feedback-message', FeedbackMessage);