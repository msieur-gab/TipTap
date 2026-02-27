import { eventBus, EVENTS } from '../utils/events.js';
import { MessageService } from '../services/messages.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { replaceNameTemplate } from '../utils/helpers.js';

class PhraseCarousel extends HTMLElement {
    constructor() {
        super();
        this.categories = [];
        this.currentSelection = { sourceLang_value: '', targetLang_value: '' };
        this.currentCategoryIndex = 0;
        this.observer = null;
    }

    connectedCallback() {
        this.setupAllEventListeners();
        this.loadCategories();
    }

    disconnectedCallback() {
        this.cleanup();
    }

    /**
     * Cleanup method for removing observers and event listeners
     */
    cleanup() {
        // Cleanup IntersectionObserver
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    /**
     * Sets up all event listeners for the component
     */
    setupAllEventListeners() {
        this.setupGlobalEvents();
        this.setupDOMEvents();
    }

    /**
     * Sets up EventBus listeners for global state changes
     */
    setupGlobalEvents() {
        // EventBus events for data updates
        eventBus.on(EVENTS.CATEGORIES_UPDATED, () => {
            this.loadCategories();
        });

        // eventBus.on(EVENTS.PROFILE_SELECTED, (selection) => {
        //     this.currentSelection = selection;
        //     this.updatePhraseDisplay();
        // });

        // eventBus.on(EVENTS.NICKNAME_SELECTED, (selection) => {
        //     this.currentSelection = selection;
        //     this.updatePhraseDisplay();
        // });
        eventBus.on(EVENTS.PROFILE_SELECTED, (data) => {
            const { profile, nickname } = data;

            if (nickname) {
                // If a nickname is selected, use its values
                this.currentSelection = {
                    sourceLang_value: nickname.sourceLang_value || nickname.display,
                    targetLang_value: nickname.targetLang_value || nickname.display
                };
            } else if (profile) {
                // Otherwise, use the main profile's values
                if (profile.id === 'general') {
                    this.currentSelection = { sourceLang_value: '', targetLang_value: '' };
                } else {
                    this.currentSelection = {
                        sourceLang_value: profile.originalName,
                        targetLang_value: profile.translatedName
                    };
                }
            }
            
            this.updatePhraseDisplay();
        });
    }

    /**
     * Sets up DOM event listeners for user interactions
     */
    setupDOMEvents() {
        // Tab clicks and phrase copy clicks
        document.addEventListener('click', this.handleClick.bind(this));
    }

    /**
     * Sets up IntersectionObserver for scroll behavior and tab synchronization
     */
    setupScrollBehavior() {
        if (this.observer) {
            this.observer.disconnect();
        }

        const viewport = document.getElementById('phrases-viewport');
        if (!viewport) return;

        // IntersectionObserver for tab synchronization
        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const index = parseInt(entry.target.dataset.index, 10);
                    this.updateActiveTab(index);
                    this.currentCategoryIndex = index;
                    return;
                }
            }
        }, {
            root: viewport,
            threshold: 0.51
        });

        // Start observing slides after rendering
        setTimeout(() => {
            const slides = viewport.querySelectorAll('.phrases-slide');
            slides.forEach(slide => this.observer.observe(slide));
            
            if (slides.length > 0) {
                this.updateActiveTab(0);
            }
        }, 100);
    }

    /**
     * Loads categories from the service and renders them
     */
    async loadCategories() {
        this.categories = await MessageService.getAllCategories();
        this.renderCategories();
        this.updatePhraseDisplay();
        this.setupScrollBehavior();
    }

    /**
     * Updates active tab styling and scrolls tab into view
     */
    updateActiveTab(index) {
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach((tab, i) => {
            const isActive = i === index;
            tab.classList.toggle('is-active', isActive);
            if (isActive) {
                tab.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest', 
                    inline: 'center' 
                });
            }
        });
    }

    /**
     * Updates phrase display text with current name selection
     */
    updatePhraseDisplay() {
        const phrases = document.querySelectorAll('.phrase-card');
        phrases.forEach(phraseEl => {
            const sourceLangTemplate = phraseEl.dataset.sourceLangTemplate;
            const targetLangTemplate = phraseEl.dataset.targetLangTemplate;
            
            const baseDisplayEl = phraseEl.querySelector('.card__text--base');
            const targetDisplayEl = phraseEl.querySelector('.card__text--target');

            if (baseDisplayEl && sourceLangTemplate) {
                const replacements = { name: this.currentSelection.sourceLang_value };
                baseDisplayEl.textContent = replaceNameTemplate(sourceLangTemplate, replacements);
            }
            if (targetDisplayEl && targetLangTemplate) {
                const replacements = { name: this.currentSelection.targetLang_value };
                targetDisplayEl.textContent = replaceNameTemplate(targetLangTemplate, replacements);
            }
        });
    }

    /**
     * Handles all click events and delegates to specific handlers
     * @param {Event} event - The click event
     */
    async handleClick(event) {
        if (this.handleTabClick(event)) return;
        if (await this.handlePhraseClick(event)) return;
    }

    /**
     * Handles tab button clicks for category navigation
     * @param {Event} event - The click event
     * @returns {boolean} - True if a tab was clicked
     */
    handleTabClick(event) {
        const tabButton = event.target.closest('.tab-button');
        if (tabButton) {
            const index = parseInt(tabButton.dataset.index, 10);
            this.scrollToCategory(index);
            return true;
        }
        return false;
    }

    /**
     * Handles phrase copy button clicks
     * @param {Event} event - The click event
     * @returns {boolean} - True if a copy button was clicked
     */
    async handlePhraseClick(event) {
        const copyBtn = event.target.closest('.card__copy-button');
        if (copyBtn) {
            await this.copyPhraseToClipboard(copyBtn);
            return true;
        }
        return false;
    }

    /**
     * Scrolls to a specific category by index
     */
    scrollToCategory(index) {
        const viewport = document.getElementById('phrases-viewport');
        if (viewport && index >= 0 && index < this.categories.length) {
            viewport.scrollTo({
                left: index * viewport.clientWidth,
                behavior: 'smooth'
            });
            this.updateActiveTab(index);
        }
    }

    /**
     * Copies the phrase text to clipboard with name replacement
     * @param {HTMLElement} copyBtn - The copy button element
     */
    async copyPhraseToClipboard(copyBtn) {
        const phraseCard = copyBtn.closest('.phrase-card');
        if (!phraseCard) return;

        const targetLangTemplate = phraseCard.dataset.targetLangTemplate;
        const originalText = phraseCard.querySelector('.card__text--base').textContent;
        
        const finalMessage = replaceNameTemplate(targetLangTemplate, { 
            name: this.currentSelection.targetLang_value 
        });

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

    /**
     * Renders all categories (tabs and slides)
     */
    renderCategories() {
        const tabsContainer = document.getElementById('category-tabs');
        const viewport = document.getElementById('phrases-viewport');
        
        if (!tabsContainer || !viewport) return;

        tabsContainer.innerHTML = '';
        viewport.innerHTML = '';

        this.categories.forEach((category, index) => {
            this.renderCategoryTab(category, index, tabsContainer);
            this.renderCategorySlide(category, index, viewport);
        });
    }

    /**
     * Renders a single category tab
     */
    renderCategoryTab(category, index, container) {
        const tabButton = document.createElement('button');
        tabButton.className = 'tab-button';
        tabButton.textContent = category.title;
        tabButton.dataset.index = index;
        
        if (index === 0) {
            tabButton.classList.add('is-active');
        }
        
        container.appendChild(tabButton);
    }

    /**
     * Renders a single category slide with phrases
     */
    renderCategorySlide(category, index, container) {
        const slide = document.createElement('div');
        slide.className = 'phrases-slide';
        slide.dataset.index = index;
        slide.style.cssText = `
            flex: 0 0 100%;
            width: 100%;
            height: 100%;
            overflow-y: auto;
            padding: 1rem;
            padding-bottom: 6rem;
            scroll-snap-align: start;
        `;
        
        const cardList = document.createElement('div');
        cardList.className = 'card-list';
        cardList.style.cssText = `
            display: grid;
            gap: 0.75rem;
        `;
        
        if (category.phrases && category.phrases.length > 0) {
            category.phrases.forEach(phrase => {
                const card = this.createPhraseCard(phrase);
                cardList.appendChild(card);
            });
        }

        slide.appendChild(cardList);
        container.appendChild(slide);
    }

    /**
     * Creates a single phrase card element
     */
    createPhraseCard(phrase) {
        const card = document.createElement('div');
        card.className = 'phrase-card';
        card.dataset.sourceLangTemplate = phrase.sourceLang;
        card.dataset.targetLangTemplate = phrase.targetLang;
        card.style.cssText = `
            background-color: var(--color-surface);
            border-radius: var(--border-radius);
            padding: 1rem;
            display: flex;
            min-height:8rem;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            border: 1px solid var(--color-border);
        `;
        
        card.innerHTML = `
            <div class="card__text-wrapper" style="min-width: 0;">
                <p class="card__text--base" style="font-size: 1rem; color: var(--color-text-dark); margin: 0 0 0.25rem 0; overflow-wrap: break-word;">${phrase.sourceLang}</p>
                <p class="card__text--target" style="font-size: 0.9rem; color: var(--color-text-light); margin: 0; overflow-wrap: break-word;">${phrase.targetLang}</p>
            </div>
            <button class="card__copy-button" title="Copy" style="flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--color-border); background-color: #f9fafb; color: var(--color-text-dark); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s ease;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            </button>`;
        
        return card;
    }
}

customElements.define('phrase-carousel', PhraseCarousel);