import { eventBus, EVENTS } from '../utils/events.js';
import { MessageService } from '../services/messages.js';
import { i18n } from '../services/i18n.js';

class MessagesTab extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.categories = [];
        this.editingPhrase = { categoryId: null, phraseId: null };
        this.boundUpdateContent = this.updateContent.bind(this);
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadCategories();
        i18n.addListener(this.boundUpdateContent);
    }

    disconnectedCallback() {
        i18n.removeListener(this.boundUpdateContent);
    }

    setupEventListeners() {
        eventBus.on(EVENTS.CATEGORIES_UPDATED, () => {
            this.loadCategories();
        });

        this.shadowRoot.addEventListener('click', this.handleClick.bind(this));
        this.shadowRoot.addEventListener('submit', this.handleSubmit.bind(this));
    }

    async loadCategories() {
        this.categories = await MessageService.getAllCategories();
        this.renderCategories();
        this.updateContent();
    }
    
    updateContent() {
        this.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = i18n.t(el.dataset.i18n);
        });
        this.shadowRoot.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = i18n.t(el.dataset.i18nPlaceholder);
        });
        this.shadowRoot.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = i18n.t(el.dataset.i18nTitle);
        });
    }

    async handleClick(event) {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.id === 'add-category-btn') {
            this.showAddCategoryDialog();
            return;
        }

        const categoryCard = button.closest('.card');
        const categoryId = categoryCard?.dataset.categoryId;
        const phraseItem = button.closest('.phrase-item');
        const phraseId = phraseItem?.dataset.phraseId;

        if (button.classList.contains('expand-btn')) {
            this.toggleCollapsible(categoryCard);
        } else if (button.classList.contains('edit-category-btn')) {
            this.editCategoryTitle(categoryCard, categoryId);
        } else if (button.classList.contains('delete-category-btn')) {
            const category = this.categories.find(c => c.id === categoryId);
            if (confirm(i18n.t('settings.confirmDelete', { item: category.title }))) {
                await MessageService.deleteCategory(categoryId);
            }
        } else if (button.classList.contains('edit-phrase-btn')) {
            this.showEditPhraseModal(categoryId, phraseId);
        } else if (button.classList.contains('delete-phrase-btn')) {
             if (confirm(i18n.t('settings.confirmDelete', { item: 'this phrase' }))) {
                await MessageService.deletePhrase(categoryId, phraseId);
            }
        }
    }
    
    editCategoryTitle(categoryCard, categoryId) {
        const titleContainer = categoryCard.querySelector('.category-title-container');
        const currentTitle = this.categories.find(c => c.id === categoryId)?.title || '';
        
        titleContainer.innerHTML = `<input type="text" class="category-title-input" value="${currentTitle}">`;
        const input = titleContainer.querySelector('input');
        input.focus();
        
        const save = async () => {
            await MessageService.updateCategory(categoryId, { title: input.value });
            // No full re-render needed, just update the title in place
            titleContainer.innerHTML = `<h3>${input.value}</h3>`;
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }
        });
    }

    showEditPhraseModal(categoryId, phraseId) {
        const modal = this.shadowRoot.getElementById('edit-phrase-modal');
        const messageManager = modal.querySelector('message-manager');
        
        // Configure MessageManager for editing
        messageManager.setAttribute('mode', 'edit');
        messageManager.setAttribute('category-id', categoryId);
        messageManager.setAttribute('phrase-id', phraseId);
        
        modal.showModal();
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;

        if (form.id === 'add-category-form') {
            const title = form.querySelector('input[name="title"]').value;
            if (title) {
                await MessageService.createCategory(title);
                this.shadowRoot.getElementById('add-category-dialog').close();
                form.reset();
            }
        } else if (form.classList.contains('add-phrase-form')) {
            const modal = this.shadowRoot.getElementById('add-phrase-modal');
            const messageManager = modal.querySelector('message-manager');
            
            // Configure MessageManager for creating in specific category
            const categoryId = form.closest('.card').dataset.categoryId;
            messageManager.setAttribute('mode', 'create');
            messageManager.setAttribute('category-id', categoryId);
            
            modal.showModal();
        }
    }
    
    toggleCollapsible(card) {
        const content = card.querySelector('.collapsible-content');
        const expandBtn = card.querySelector('.expand-btn');
        const isExpanded = content.classList.contains('expanded');
        
        content.style.maxHeight = isExpanded ? '0px' : `${content.scrollHeight}px`;
        content.classList.toggle('expanded');
        expandBtn.classList.toggle('expanded');
    }

    showAddCategoryDialog() {
        this.shadowRoot.getElementById('add-category-dialog').showModal();
    }

    renderCategories() {
        const container = this.shadowRoot.getElementById('messages-container');
        container.innerHTML = '';
        this.categories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.categoryId = category.id;

            let phrasesHTML = category.phrases.map(phrase => this.createDisplayPhraseItem(phrase)).join('');

            card.innerHTML = `
                <div class="category-header">
                    <div class="category-title-container">
                        <h3>${category.title}</h3>
                    </div>
                    <div class="category-actions">
                        <button class="action-btn expand-btn" data-i18n-title="common.expand">
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        <button class="action-btn edit-category-btn" data-i18n-title="common.edit">
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="action-btn delete-category-btn" data-i18n-title="common.delete">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
                <div class="collapsible-content">
                    <div class="phrases-list">${phrasesHTML}</div>
                    <div class="add-phrase-card">
                        <h4 data-i18n="settings.addMessage">Add New Message</h4>
                        <form class="add-phrase-form">
                            <button type="submit" class="primary-button" data-i18n="settings.addMessage">Add Message</button>
                        </form>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
        this.updateContent();
    }
    
    createDisplayPhraseItem(phrase) {
        return `
            <div class="phrase-item" data-phrase-id="${phrase.id}">
                <div class="phrase-content">
                    <p class="base-lang">${phrase.baseLang}</p>
                    <p class="target-lang">${phrase.targetLang}</p>
                </div>
                <div class="phrase-actions">
                    <button class="action-btn edit-phrase-btn" data-i18n-title="common.edit">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-btn delete-phrase-btn" data-i18n-title="common.delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
        `;
    }

    setupModalListeners() {
        // Add phrase modal
        const addPhraseModal = this.shadowRoot.getElementById('add-phrase-modal');
        const addMessageManager = addPhraseModal.querySelector('message-manager');
        
        addMessageManager.addEventListener('message-created', () => {
            addPhraseModal.close();
        });

        // Edit phrase modal
        const editPhraseModal = this.shadowRoot.getElementById('edit-phrase-modal');
        const editMessageManager = editPhraseModal.querySelector('message-manager');
        
        editMessageManager.addEventListener('message-updated', () => {
            editPhraseModal.close();
        });

        // Close modals on backdrop click
        [addPhraseModal, editPhraseModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.close();
                }
            });
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                /* Container for fixed positioning */
                .messages-tab-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    position: relative;
                }

                .messages-content {
                    flex: 1;
                    overflow-y: auto;
                    padding-bottom: 80px; /* Space for fixed button */
                }

                /* General Card & Form Styling from Mockup */
                .card { background: var(--container-color); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.25rem; border: 1px solid var(--color-border); }
                .add-phrase-card { background-color: #f8fafc; margin-top: 1.5rem; padding: 1.5rem; }
                .add-phrase-card h4 { margin-top: 0; margin-bottom: 1rem; font-size: 1rem; font-weight: 600; }
                .primary-button { width: 100%; padding: 1rem; border: none; background-color: var(--color-text-dark); color: var(--primary-text-color); border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; }
                
                /* Messages Specifics */
                .category-header { display: flex; align-items: center; justify-content: space-between; }
                .category-title-container { flex-grow: 1; }
                .category-title-container h3 { font-size: 1.1rem; font-weight: 600; margin: 0; }
                .category-title-input { width: 100%; font-size: 1.1rem; font-weight: 600; border: none; border-bottom: 2px solid var(--primary-color); background: transparent; padding: 4px 0; box-sizing: border-box; }
                .category-title-input:focus { outline: none; }
                .category-actions { display: flex; align-items: center; }
                .action-btn { background: none; border: none; cursor: pointer; padding: 0.5rem; color: var(--color-text-light); }
                .delete-category-btn { color: var(--danger-color); }
                .phrases-list { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
                .phrase-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1rem; background-color: #f8fafc; border-radius: 12px; }
                .phrase-content { flex-grow: 1; }
                .phrase-content p { margin: 0; }
                .base-lang { font-weight: 500; margin-bottom: 0.25rem; }
                .target-lang { font-size: 0.9rem; color: var(--color-text-light); }
                .phrase-actions { display: flex; gap: 0.25rem; }

                /* Collapsible Content */
                .collapsible-content { max-height: 0; overflow: hidden; transition: max-height 0.4s ease-out; }
                .collapsible-content.expanded { max-height: 2000px; /* Large enough for content */ transition: max-height 0.5s ease-in; }
                .expand-btn svg { transition: transform 0.3s ease; }
                .expand-btn.expanded svg { transform: rotate(180deg); }

                /* Fixed Add Category Button */
                #add-category-btn {
                    position: fixed;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    width: calc(100% - 2rem);
                    max-width: 568px;
                    padding: 1rem;
                    border: none;
                    background-color: var(--color-text-dark);
                    color: var(--primary-text-color);
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                    z-index: 1000;
                    box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.15);
                    backdrop-filter: blur(10px);
                }

                /* Dialog Styles */
                dialog { border: none; border-radius: 16px; padding: 2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 90%; max-width: 400px; }
                dialog::backdrop { background-color: rgba(0,0,0,0.4); }
                dialog h3 { margin-top: 0; }
                .styled-input { width: 100%; box-sizing: border-box; background-color: #f9fafb; border: 1px solid var(--color-border); border-radius: 12px; padding: 0.875rem 1rem; font-size: 1rem; font-family: inherit; color: var(--color-text-dark); }
                .form-group { margin-bottom: 1rem; }
                .form-group label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--color-text-light); margin-bottom: 0.5rem; }
                .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
                .secondary-button { width: 100%; padding: 1rem; border: 1px solid var(--color-border); background-color: transparent; color: var(--color-text-dark); border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; }
                
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-border); }
                .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--color-text-dark); }
                .close-button { background: none; border: none; cursor: pointer; padding: 0.5rem; color: var(--color-text-light); border-radius: 6px; }
                .close-button:hover { background-color: var(--color-border); }
            </style>

            <div class="messages-tab-container">
                <div class="messages-content">
                    <div id="messages-container"></div>
                </div>
                <button id="add-category-btn" class="primary-button" data-i18n="settings.addCategory">Add New Category</button>
            </div>

            <dialog id="add-category-dialog">
                <h3 data-i18n="settings.addCategory">Add New Category</h3>
                <form id="add-category-form">
                    <div class="form-group">
                        <label for="new-category-title" data-i18n="settings.categoryName">Category Name</label>
                        <input id="new-category-title" name="title" type="text" class="styled-input" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="secondary-button" onclick="this.closest('dialog').close()" data-i18n="common.cancel">Cancel</button>
                        <button type="submit" class="primary-button" data-i18n="common.add">Add</button>
                    </div>
                </form>
            </dialog>

            <dialog id="add-phrase-modal">
                <div class="modal-header">
                    <h3>Add New Message</h3>
                    <button type="button" class="close-button" onclick="this.closest('dialog').close()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <message-manager mode="create"></message-manager>
            </dialog>

            <dialog id="edit-phrase-modal">
                <div class="modal-header">
                    <h3>Edit Message</h3>
                    <button type="button" class="close-button" onclick="this.closest('dialog').close()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <message-manager mode="edit"></message-manager>
            </dialog>
        `;
        
        // Set up modal listeners after render
        setTimeout(() => this.setupModalListeners(), 0);
    }
}

customElements.define('messages-tab', MessagesTab);