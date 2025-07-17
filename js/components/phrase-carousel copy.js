import { eventBus, EVENTS } from '../utils/events.js';
import { MessageService } from '../services/messages.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { replaceNameTemplate, replaceChineseNameTemplate } from '../utils/helpers.js';

class PhraseCarousel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.categories = [];
        this.currentSelection = { baseLang_value: '', targetLang_value: '' };
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadCategories();
    }

    setupEventListeners() {
        eventBus.on(EVENTS.CATEGORIES_UPDATED, () => {
            this.loadCategories();
        });

        eventBus.on(EVENTS.PROFILE_SELECTED, (selection) => {
            this.currentSelection = selection;
            this.updatePhraseDisplay();
        });

        eventBus.on(EVENTS.NICKNAME_SELECTED, (selection) => {
            this.currentSelection = selection;
            this.updatePhraseDisplay();
        });

        this.shadowRoot.addEventListener('click', this.handlePhraseClick.bind(this));
    }

    async loadCategories() {
        this.categories = await MessageService.getAllCategories();
        this.renderCategories();
        this.updatePhraseDisplay();
    }

    updatePhraseDisplay() {
        const phrases = this.shadowRoot.querySelectorAll('.phrase');
        phrases.forEach(phraseEl => {
            const baseLangTemplate = phraseEl.dataset.baseLangTemplate;
            const displayText = replaceNameTemplate(baseLangTemplate, { name: this.currentSelection.baseLang_value });
            phraseEl.textContent = displayText;
        });
    }

    async handlePhraseClick(event) {
        const phraseEl = event.target.closest('.phrase');
        if (!phraseEl) return;

        const targetLangTemplate = phraseEl.dataset.targetLangTemplate;
        const originalText = phraseEl.textContent;
        
        const finalMessage = replaceChineseNameTemplate(targetLangTemplate, { name: this.currentSelection.targetLang_value });

        const success = await copyToClipboard(finalMessage);
        if (success) {
            eventBus.emit(EVENTS.MESSAGE_COPIED, {
                copied: finalMessage,
                original: originalText
            });
        } else {
            alert("Copy failed.");
        }
    }

    renderCategories() {
        const container = this.shadowRoot.getElementById('categories-container');
        container.innerHTML = '';

        this.categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category';

            const title = document.createElement('h2');
            title.textContent = category.title;
            categoryDiv.appendChild(title);

            const carousel = document.createElement('div');
            carousel.className = 'phrases-carousel';

            category.phrases.forEach(phrase => {
                const phraseDiv = document.createElement('div');
                phraseDiv.className = 'phrase';
                phraseDiv.dataset.baseLangTemplate = phrase.baseLang;
                phraseDiv.dataset.targetLangTemplate = phrase.targetLang;
                phraseDiv.textContent = phrase.baseLang;
                carousel.appendChild(phraseDiv);
            });

            categoryDiv.appendChild(carousel);
            container.appendChild(categoryDiv);
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-top: 80px;
                    padding: 1rem;
                    padding-bottom: 150px;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }

                .category {
                    margin-bottom: 2rem;
                }

                .category h2 {
                    font-weight: 700;
                    color: var(--primary-color);
                    margin: 0 0 1rem 0;
                    font-size: 1.1rem;
                }

                .phrases-carousel {
                    display: flex;
                    overflow-x: auto;
                    padding: 0.5rem 0 1rem 0;
                    scroll-snap-type: x mandatory;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }

                .phrases-carousel::-webkit-scrollbar {
                    display: none;
                }

                .phrase {
                    flex: 0 0 80%;
                    max-width: 150px;
                    background-color: var(--phrase-bg);
                    padding: 1rem;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 1rem;
                    border: 1px solid var(--phrase-border);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    scroll-snap-align: start;
                    margin-right: 1rem;
                    transition: transform 0.2s ease-in-out;
                    min-height: 4em;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }

                .phrase:active {
                    transform: scale(0.97);
                }

                @media (max-width: 768px) {
                    :host {
                        margin-top: 70px;
                        padding: 0.75rem;
                    }

                    .phrase {
                        flex: 0 0 85%;
                    }
                }
            </style>

            <div id="categories-container"></div>
        `;
    }
}

customElements.define('phrase-carousel', PhraseCarousel);