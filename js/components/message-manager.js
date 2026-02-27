// js/components/message-manager.js
import { eventBus, EVENTS } from '../utils/events.js';
import { MessageService } from '../services/messages.js';
import { DatabaseService } from '../services/database.js';
import { deepL } from '../services/deepl.js';
import { i18n } from '../services/i18n.js';

class MessageManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.mode = 'create'; // 'create', 'edit'
        this.categoryId = null;
        this.phraseId = null;
        this.phrase = null;
        this.categories = [];
        this.currentSelection = { sourceLang_value: '', targetLang_value: '' };
        this.boundUpdateContent = this.updateContent.bind(this);
    }

    static get observedAttributes() {
        return ['mode', 'category-id', 'phrase-id'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'mode') {
            this.mode = newValue || 'create';
        }
        if (name === 'category-id') {
            this.categoryId = newValue;
        }
        if (name === 'phrase-id') {
            this.phraseId = newValue;
        }
        if (this.isConnected) {
            this.loadData();
        }
    }

    connectedCallback() {
        this.loadData();
        this.setupEventListeners();
        i18n.addListener(this.boundUpdateContent);
    }

    disconnectedCallback() {
        i18n.removeListener(this.boundUpdateContent);
    }

    async loadData() {
        // Load categories for dropdown
        this.categories = await MessageService.getAllCategories();
        
        // Load phrase data if editing
        if (this.mode === 'edit' && this.categoryId && this.phraseId) {
            const category = this.categories.find(c => c.id === this.categoryId);
            this.phrase = category?.phrases.find(p => String(p.id) === String(this.phraseId));
        } else {
            this.phrase = null;
        }

        if (this.isConnected) {
            this.render();
            this.updateContent();
        }
    }

    setupEventListeners() {
        // Listen for profile selection to get name context
        eventBus.on(EVENTS.PROFILE_SELECTED, (data) => {
            const { profile, nickname } = data;
            if (nickname) {
                this.currentSelection = {
                    sourceLang_value: nickname.sourceLang_value || nickname.display,
                    targetLang_value: nickname.targetLang_value || nickname.display
                };
            } else if (profile) {
                if (profile.id === 'general') {
                    this.currentSelection = { sourceLang_value: '', targetLang_value: '' };
                } else {
                    this.currentSelection = {
                        sourceLang_value: profile.originalName,
                        targetLang_value: profile.translatedName
                    };
                }
            }
        });

        this.shadowRoot.addEventListener('click', this.handleClick.bind(this));
        this.shadowRoot.addEventListener('change', this.handleChange.bind(this));
        this.shadowRoot.addEventListener('submit', this.handleSubmit.bind(this));
    }

    handleClick(event) {
        const target = event.target.closest('button');
        if (!target) return;

        const action = target.dataset.action;
        
        switch (action) {
            case 'translate':
                this.handleTranslation();
                break;
            case 'insert-name-base':
                this.insertNamePlaceholder('message-base-lang');
                break;
            case 'insert-name-target':
                this.insertNamePlaceholder('message-target-lang');
                break;
        }
    }

    handleChange(event) {
        const target = event.target;
        
        if (target.name === 'category') {
            const isNewCategory = target.value === 'new';
            const newCategoryInput = this.shadowRoot.getElementById('new-category-input');
            if (newCategoryInput) {
                newCategoryInput.style.display = isNewCategory ? 'block' : 'none';
                newCategoryInput.required = isNewCategory;
            }
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        
        let categoryId = formData.get('category');
        const sourceLang = formData.get('sourceLang');
        const targetLang = formData.get('targetLang');
        const newCategoryName = formData.get('newCategory');
        
        // Create new category if needed
        if (categoryId === 'new' && newCategoryName) {
            try {
                const newCategory = await MessageService.createCategory(newCategoryName);
                categoryId = newCategory.id;
            } catch (error) {
                console.error('Error creating category:', error);
                alert(i18n.t('errors.unexpectedError'));
                return;
            }
        }
        
        if (!categoryId || !sourceLang || !targetLang) {
            alert(i18n.t('errors.fillRequired'));
            return;
        }

        try {
            if (this.mode === 'create') {
                await MessageService.addPhrase(categoryId, sourceLang, targetLang);
                this.dispatchEvent(new CustomEvent('message-created', {
                    detail: { categoryId, sourceLang, targetLang }
                }));
            } else if (this.mode === 'edit') {
                await MessageService.updatePhrase(this.categoryId, this.phraseId, {
                    sourceLang,
                    targetLang
                });
                this.dispatchEvent(new CustomEvent('message-updated', {
                    detail: { categoryId: this.categoryId, phraseId: this.phraseId, sourceLang, targetLang }
                }));
            }
            
            // Reset form
            form.reset();
            const newCategoryInput = this.shadowRoot.getElementById('new-category-input');
            if (newCategoryInput) {
                newCategoryInput.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error saving message:', error);
            alert(i18n.t('errors.unexpectedError'));
        }
    }

    async handleTranslation() {
        const sourceLangTextarea = this.shadowRoot.getElementById('message-base-lang');
        const targetLangTextarea = this.shadowRoot.getElementById('message-target-lang');
        const textToTranslate = sourceLangTextarea.value;

        if (!textToTranslate.trim()) {
            alert(i18n.t('fab.nameHelp')); // Reuse existing translation
            return;
        }

        if (!deepL.isAvailable()) {
            alert(i18n.t('errors.translationNotConfigured'));
            return;
        }

        try {
            const settings = await DatabaseService.getUserSettings();
            const sourceLang = settings.sourceLanguage;
            const targetLang = settings.targetLanguage;

            if (!sourceLang || !targetLang) {
                alert(i18n.t('errors.languageNotConfigured'));
                return;
            }

            // Show loading state
            targetLangTextarea.value = i18n.t('common.translating');
            targetLangTextarea.disabled = true;

            const result = await deepL.translate(textToTranslate, targetLang, sourceLang);

            if (result.text) {
                targetLangTextarea.value = result.text;
            } else {
                targetLangTextarea.value = '';
                alert(i18n.t('errors.translationFailed'));
            }

        } catch (error) {
            targetLangTextarea.value = '';
            console.error("Translation process failed:", error);
            alert(i18n.t('errors.translationFailed'));
        } finally {
            targetLangTextarea.disabled = false;
        }
    }

    insertNamePlaceholder(textareaId) {
        const textarea = this.shadowRoot.getElementById(textareaId);
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(textarea.selectionEnd);
        
        textarea.value = textBefore + '{name}' + textAfter;
        
        // Position cursor after the inserted {name}
        const newCursorPos = cursorPos + 6; // 6 = length of '{name}'
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
    }

    updateContent() {
        // Update all translatable content
        const elements = this.shadowRoot.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.dataset.i18n;
            element.textContent = i18n.t(key);
        });

        const placeholders = this.shadowRoot.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(element => {
            const key = element.dataset.i18nPlaceholder;
            element.placeholder = i18n.t(key);
        });
    }

    renderCategoryOptions() {
        const isEditing = this.mode === 'edit';
        let options = '';
        
        if (!isEditing) {
            options += '<option value="" data-i18n="fab.selectCategory">Select Category</option>';
        }
        
        options += this.categories.map(cat => {
            const selected = (isEditing && cat.id === this.categoryId) ? 'selected' : '';
            return `<option value="${cat.id}" ${selected}>${cat.title}</option>`;
        }).join('');
        
        if (!isEditing) {
            options += `<option value="new">${i18n.t('fab.createNewCategory')}</option>`;
        }
        
        return options;
    }

    render() {
        const isEditing = this.mode === 'edit';
        const phrase = this.phrase || { sourceLang: '', targetLang: '' };
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: var(--font-family-base);
                }

                .form-group {
                    margin-bottom: 1rem;
                }

                .form-group label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--color-text-light);
                    margin-bottom: 0.5rem;
                }

                .styled-input,
                .styled-textarea,
                .styled-select {
                    width: 100%;
                    box-sizing: border-box;
                    background-color: #f9fafb;
                    border: 1px solid var(--color-border);
                    border-radius: 12px;
                    padding: 0.875rem 1rem;
                    font-size: 1rem;
                    font-family: inherit;
                    color: var(--color-text-dark);
                }

                .styled-textarea {
                    resize: vertical;
                    min-height: 80px;
                }

                .styled-input:focus,
                .styled-textarea:focus,
                .styled-select:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
                }

                .input-with-button {
                    position: relative;
                }

                .insert-name-btn {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    background-color: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                    cursor: pointer;
                    z-index: 10;
                    opacity: 0.8;
                    transition: opacity 0.2s ease;
                }

                .insert-name-btn:hover {
                    opacity: 1;
                }

                .helper-text {
                    font-size: 0.75rem;
                    color: var(--color-text-light);
                    margin-top: 0.25rem;
                    font-style: italic;
                }

                #new-category-input {
                    display: none;
                }

                .form-actions {
                    display: flex;
                    gap: 0.75rem;
                    margin-top: 1.5rem;
                }

                .primary-button {
                    flex: 1;
                    padding: 1rem;
                    border: none;
                    background-color: var(--color-text-dark);
                    color: var(--primary-text-color);
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                }

                .secondary-button {
                    padding: 0.5rem 1rem;
                    border: 1px solid var(--color-border);
                    background-color: transparent;
                    color: var(--color-text-dark);
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                    width: auto;
                }

                .secondary-button:hover {
                    background-color: #f3f4f6;
                }

                .primary-button:hover {
                    background-color: #000;
                }

                .primary-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            </style>

            <form id="message-form">
                ${!isEditing ? `
                    <div class="form-group">
                        <label for="message-category-select" data-i18n="settings.categoryName">Category</label>
                        <select id="message-category-select" name="category" class="styled-select" required>
                            ${this.renderCategoryOptions()}
                        </select>
                    </div>
                    <div class="form-group" id="new-category-input">
                        <label for="new-category-name" data-i18n="fab.newCategoryName">New Category Name</label>
                        <input type="text" id="new-category-name" name="newCategory" class="styled-input">
                    </div>
                ` : ''}
                
                <div class="form-group">
                    <label for="message-base-lang" data-i18n="settings.messageInYourLanguage">Message in your language</label>
                    <div class="input-with-button">
                        <textarea id="message-base-lang" name="sourceLang" class="styled-textarea" required>${phrase.sourceLang}</textarea>
                        <button type="button" class="insert-name-btn" data-action="insert-name-base">{name}</button>
                    </div>
                    <div class="helper-text" data-i18n="fab.nameHelp">Use {name} to insert the name</div>
                </div>
                
                <div class="form-group">
                    <label for="message-target-lang" data-i18n="settings.messageInTargetLanguage">Message in target language</label>
                    <div class="input-with-button">
                        <textarea id="message-target-lang" name="targetLang" class="styled-textarea" required>${phrase.targetLang}</textarea>
                        <button type="button" class="insert-name-btn" data-action="insert-name-target">{name}</button>
                    </div>
                    <div class="helper-text" data-i18n="fab.nameHelp">Use {name} to insert the name</div>
                </div>
                
                <button type="button" class="secondary-button" data-action="translate" data-i18n="common.translate">
                    ${i18n.t('common.translate')}
                </button>
                
                <div class="form-actions">
                    <button type="submit" class="primary-button" data-i18n="${isEditing ? 'settings.updateMessage' : 'settings.addMessage'}">
                        ${isEditing ? i18n.t('settings.updateMessage') : i18n.t('settings.addMessage')}
                    </button>
                </div>
            </form>
        `;
        
        // Apply translations after render
        setTimeout(() => this.updateContent(), 0);
    }
}

customElements.define('message-manager', MessageManager);

export default MessageManager;