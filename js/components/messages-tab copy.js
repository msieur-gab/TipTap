import { eventBus, EVENTS } from '../utils/events.js';
import { MessageService } from '../services/messages.js';

class MessagesTab extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.categories = [];
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

        this.shadowRoot.addEventListener('click', this.handleClick.bind(this));
        
        // Setup dialog event listeners
        this.setupDialogListeners();
    }

    setupDialogListeners() {
        const addCategoryDialog = this.shadowRoot.getElementById('add-category-dialog');
        const addCategoryForm = this.shadowRoot.getElementById('add-category-form');
        
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addCategoryForm);
            const title = formData.get('title');
            
            if (title) {
                await MessageService.createCategory(title);
                addCategoryDialog.close();
                addCategoryForm.reset();
            }
        });

        addCategoryDialog.addEventListener('click', (e) => {
            // Close dialog when clicking backdrop
            if (e.target === addCategoryDialog) {
                addCategoryDialog.close();
            }
        });
    }

    async loadCategories() {
        this.categories = await MessageService.getAllCategories();
        this.renderCategories();
    }

    async handleClick(event) {
        const target = event.target;
        const button = target.closest('button');
        if (!button) return;

        // Handle add category button
        if (button.id === 'add-category-btn') {
            await this.handleAddCategory();
            return;
        }

        // Handle category-related actions
        const categoryCard = target.closest('.category-card');
        if (categoryCard) {
            await this.handleCategoryAction(event, button, categoryCard);
            return;
        }
    }

    async handleAddCategory() {
        const dialog = this.shadowRoot.getElementById('add-category-dialog');
        dialog.showModal();
    }

    async handleCategoryAction(event, button, categoryCard) {
        const categoryId = categoryCard.dataset.categoryId;

        if (button.classList.contains('expand-btn')) {
            this.toggleCollapsible(categoryCard);
        }

        if (button.classList.contains('edit-category')) {
            this.editCategoryTitle(categoryCard, categoryId);
        }

        if (button.classList.contains('delete-category')) {
            const category = this.categories.find(c => c.id === categoryId);
            if (confirm(`Are you sure you want to delete the "${category.title}" category?`)) {
                await MessageService.deleteCategory(categoryId);
            }
        }

        // Phrase actions
        if (button.classList.contains('edit-phrase')) {
            this.editPhrase(button, categoryId);
        }

        if (button.classList.contains('save-phrase')) {
            event.preventDefault();
            await this.savePhrase(button, categoryId);
        }

        if (button.classList.contains('delete-phrase')) {
            const phraseItem = button.closest('.phrase-item');
            const phraseId = phraseItem.dataset.phraseId;
            await MessageService.deletePhrase(categoryId, String(phraseId));
        }

        if (button.parentElement.classList.contains('add-phrase-form')) {
            event.preventDefault();
            await this.addPhrase(button, categoryId);
        }
    }

    toggleCollapsible(card) {
        const content = card.querySelector('.collapsible-content');
        const expandBtn = card.querySelector('.expand-btn');
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            content.classList.remove('expanded');
            expandBtn.classList.remove('expanded');
        } else {
            content.classList.add('expanded');
            expandBtn.classList.add('expanded');
        }
    }

    editCategoryTitle(categoryCard, categoryId) {
        const titleElement = categoryCard.querySelector('.category-title');
        const category = this.categories.find(c => c.id === categoryId);
        
        titleElement.innerHTML = `
            <form class="edit-form" style="margin: 0;">
                <input type="text" value="${category.title}" style="margin: 0;">
            </form>`;
        
        const input = titleElement.querySelector('input');
        input.addEventListener('blur', async (e) => {
            const newTitle = e.target.value;
            await MessageService.updateCategory(categoryId, { title: newTitle });
        });
        input.focus();
    }

    editPhrase(button, categoryId) {
        const phraseItem = button.closest('.phrase-item');
        const phraseId = phraseItem.dataset.phraseId;
        const category = this.categories.find(c => c.id === categoryId);
        
        if (!category) {
            console.error('Category not found:', categoryId);
            return;
        }
        
        const phrase = category.phrases.find(p => String(p.id) === String(phraseId));
        
        if (!phrase) {
            console.error('Phrase not found:', phraseId, 'in category:', categoryId);
            return;
        }
        
        phraseItem.innerHTML = `
            <form class="edit-form">
                <input type="text" value="${phrase.baseLang}">
                <textarea>${phrase.targetLang}</textarea>
                <button class="save-phrase" data-phrase-id="${phraseId}">OK</button>
            </form>`;
    }

    async savePhrase(button, categoryId) {
        const phraseItem = button.closest('.phrase-item');
        const phraseId = button.dataset.phraseId;
        const form = phraseItem.querySelector('.edit-form');
        const newBaseLang = form.children[0].value;
        const newTargetLang = form.children[1].value;
        
        await MessageService.updatePhrase(categoryId, String(phraseId), {
            baseLang: newBaseLang,
            targetLang: newTargetLang
        });
    }

    async addPhrase(button, categoryId) {
        const form = button.parentElement;
        const baseLangInput = form.children[0];
        const targetLangInput = form.children[1];
        
        if (baseLangInput.value && targetLangInput.value) {
            await MessageService.addPhrase(categoryId, baseLangInput.value, targetLangInput.value);
            baseLangInput.value = '';
            targetLangInput.value = '';
        }
    }

    renderCategories() {
        const container = this.shadowRoot.getElementById('categories-container');
        container.innerHTML = '';

        this.categories.forEach(category => {
            const card = this.createCategoryCard(category);
            container.appendChild(card);
        });
    }

    createCategoryCard(category) {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.dataset.categoryId = category.id;

        card.innerHTML = `
            <div class="category-header">
                <h3 class="category-title">${category.title}</h3>
                <div class="category-actions">
                    <button class="expand-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6,9 12,15 18,9"></polyline>
                        </svg>
                    </button>
                    <button class="edit-category">
                        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="delete-category">
                        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="collapsible-content">
                <ul class="phrase-list">
                    ${category.phrases.map(phrase => `
                        <li class="phrase-item" data-phrase-id="${phrase.id}">
                            <div class="phrase-item-header">
                                <div class="phrase-text">
                                    <div class="phrase-base-lang">${phrase.baseLang}</div>
                                    <div class="phrase-target-lang">${phrase.targetLang}</div>
                                </div>
                                <div class="phrase-actions">
                                    <button class="edit-phrase">
                                        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button class="delete-phrase">
                                        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </li>
                    `).join('')}
                </ul>
                <div class="add-phrase-form">
                    <input type="text" placeholder="Message in English (use {name} for the name)...">
                    <textarea placeholder="Message in Chinese (use {name} for the name)..."></textarea>
                    <button>Add Message</button>
                </div>
            </div>
        `;

        return card;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }

                /* Category Cards */
                .category-card {
                    background: var(--container-color);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    border: 1px solid #e0e0e0;
                    width: 100%;
                    box-sizing: border-box;
                }

                .category-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-width: 0;
                    margin-bottom: 1rem;
                }

                .category-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin: 0;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    flex: 1;
                    min-width: 0;
                }

                .category-actions {
                    display: flex;
                    gap: 0.5rem;
                    flex-shrink: 0;
                }

                .phrase-actions {
                    display: flex;
                    gap: 0.25rem;
                    flex-shrink: 0;
                }

                .category-actions button, .phrase-actions button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 6px;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .category-actions button:hover, .phrase-actions button:hover {
                    background-color: #f0f0f0;
                }

                .category-actions svg {
                    width: 18px;
                    height: 18px;
                    flex-shrink: 0;
                }

                .phrase-actions svg {
                    width: 16px;
                    height: 16px;
                    flex-shrink: 0;
                }

                .delete-category, .delete-phrase {
                    color: var(--danger-color);
                }

                /* Collapsible content */
                .collapsible-content {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease;
                }

                .collapsible-content.expanded {
                    max-height: 1000px;
                }

                .expand-btn svg {
                    transition: transform 0.3s ease;
                }

                .expand-btn.expanded svg {
                    transform: rotate(180deg);
                }

                /* Lists */
                .phrase-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    width: 100%;
                    box-sizing: border-box;
                }

                .phrase-item {
                    padding: 0.75rem;
                    margin-bottom: 0.5rem;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                    width: 100%;
                    box-sizing: border-box;
                }

                .phrase-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    width: 100%;
                    min-width: 0;
                }

                .phrase-text {
                    flex: 1;
                    min-width: 0;
                    margin-right: 0.5rem;
                }

                .phrase-base-lang {
                    font-weight: 500;
                    margin-bottom: 0.25rem;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }

                .phrase-target-lang {
                    font-size: 0.9rem;
                    color: #666;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }

                /* Forms */
                .add-phrase-form, .edit-form {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-top: 1rem;
                    width: 100%;
                    box-sizing: border-box;
                }

                .add-phrase-form input, .add-phrase-form textarea, .edit-form input, .edit-form textarea {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    font-size: 1rem;
                    box-sizing: border-box;
                    min-width: 0;
                }

                .add-phrase-form textarea, .edit-form textarea {
                    min-height: 60px;
                    resize: vertical;
                    font-family: inherit;
                }

                .add-phrase-form button, .edit-form button {
                    width: 100%;
                    padding: 0.75rem;
                    border: none;
                    background-color: var(--primary-color);
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                    transition: background-color 0.2s;
                    box-sizing: border-box;
                }

                .add-phrase-form button:hover, .edit-form button:hover {
                    background-color: #004bb4;
                }

                #add-category-btn {
                    width: 100%;
                    padding: 1rem;
                    margin-top: 1rem;
                    background-color: var(--info-color);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 1rem;
                    box-sizing: border-box;
                }

                #add-category-btn:hover {
                    background-color: #138496;
                }

                /* Dialog Styles */
                dialog {
                    border: none;
                    border-radius: 12px;
                    padding: 0;
                    width: 90%;
                    max-width: 400px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }

                dialog::backdrop {
                    background-color: rgba(0, 0, 0, 0.5);
                }

                .dialog-content {
                    padding: 1.5rem;
                }

                .dialog-header {
                    margin: 0 0 1.5rem 0;
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: var(--text-color);
                }

                .dialog-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .dialog-form input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    font-size: 1rem;
                    box-sizing: border-box;
                }

                .dialog-form input:focus {
                    outline: none;
                    border-color: var(--info-color);
                    box-shadow: 0 0 0 2px rgba(23, 162, 184, 0.2);
                }

                .dialog-actions {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 1rem;
                }

                .dialog-actions button {
                    flex: 1;
                    padding: 0.75rem;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                    transition: background-color 0.2s;
                }

                .dialog-actions .primary-btn {
                    background-color: var(--info-color);
                    color: white;
                }

                .dialog-actions .primary-btn:hover {
                    background-color: #138496;
                }

                .dialog-actions .secondary-btn {
                    background-color: #f8f9fa;
                    color: var(--text-color);
                    border: 1px solid #e0e0e0;
                }

                .dialog-actions .secondary-btn:hover {
                    background-color: #e9ecef;
                }
            </style>
            
            <div id="categories-container"></div>
            <button id="add-category-btn">Add Category</button>

            <!-- Add Category Dialog -->
            <dialog id="add-category-dialog">
                <div class="dialog-content">
                    <h3 class="dialog-header">Add New Category</h3>
                    <form id="add-category-form" class="dialog-form">
                        <input type="text" name="title" placeholder="Category name" required autocomplete="off">
                        <div class="dialog-actions">
                            <button type="button" class="secondary-btn" onclick="this.closest('dialog').close()">Cancel</button>
                            <button type="submit" class="primary-btn">Add Category</button>
                        </div>
                    </form>
                </div>
            </dialog>
        `;
    }
}

customElements.define('messages-tab', MessagesTab);