// js/components/floating-action-button.js
import { eventBus, EVENTS } from '../utils/events.js';
import { MessageService } from '../services/messages.js';
import { ProfileService } from '../services/profiles.js';
import { DatabaseService } from '../services/database.js';
import { deepL } from '../services/deepl.js';
import { i18n } from '../services/i18n.js';

class FloatingActionButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isExpanded = false;
        this.currentKidSelection = null;
        this.categories = [];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadCategories();
    }

    async loadCategories() {
        this.categories = await MessageService.getAllCategories();
    }

    setupEventListeners() {
        // Listen for profile selection changes
        eventBus.on(EVENTS.PROFILE_SELECTED, (selection) => {
            console.log('FAB received PROFILE_SELECTED:', selection);
            
            // Extract profile from nested structure
            const profile = selection?.profile;
            if (profile) {
                this.currentKidSelection = {
                    profileId: profile.id,
                    name: profile.originalName || profile.name
                };
            } else {
                this.currentKidSelection = null;
            }
            
            console.log('FAB currentKidSelection set to:', this.currentKidSelection);
        });

        // Listen for the custom event from the profile selector
        document.addEventListener('request-profile-modal', () => {
            this.showProfileManagementModal(true); // Pass true to force 'create' mode
        });

        // Listen for category updates
        eventBus.on(EVENTS.CATEGORIES_UPDATED, () => {
            this.loadCategories();
        });

        // FAB button interactions
        const fab = this.shadowRoot.getElementById('main-fab');
        const addMessageBtn = this.shadowRoot.getElementById('add-message-fab');
        const manageProfileBtn = this.shadowRoot.getElementById('manage-profile-fab');

        fab.addEventListener('click', () => this.toggleExpand());
        addMessageBtn.addEventListener('click', () => {
            this.showAddMessageModal();
            this.collapse();
        });
        manageProfileBtn.addEventListener('click', () => {
            this.showProfileManagementModal();
            this.collapse();
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.contains(e.target) && this.isExpanded) {
                this.collapse();
            }
        });

        this.setupModalListeners();
    }

    setupModalListeners() {
        // Add Message Modal
        const addMessageModal = this.shadowRoot.getElementById('add-message-modal');
        const addMessageForm = this.shadowRoot.getElementById('add-message-form');
        const categorySelect = this.shadowRoot.getElementById('message-category-select');
        const newCategoryInput = this.shadowRoot.getElementById('new-category-input');
        
        // Handle category selection change
        categorySelect.addEventListener('change', (e) => {
            const isNewCategory = e.target.value === 'new';
            newCategoryInput.style.display = isNewCategory ? 'block' : 'none';
            newCategoryInput.required = isNewCategory;
        });
        
        addMessageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addMessageForm);
            let categoryId = formData.get('category');
            const baseLang = formData.get('baseLang');
            const targetLang = formData.get('targetLang');
            const newCategoryName = formData.get('newCategory');
            
            // Create new category if needed
            if (categoryId === 'new' && newCategoryName) {
                try {
                    const newCategory = await MessageService.createCategory(newCategoryName);
                    categoryId = newCategory.id;
                } catch (error) {
                    console.error('Error creating category:', error);
                    alert('Failed to create category. Please try again.');
                    return;
                }
            }
            
            if (categoryId && baseLang && targetLang) {
                try {
                    await MessageService.addPhrase(categoryId, baseLang, targetLang);
                    addMessageModal.close();
                    addMessageForm.reset();
                    newCategoryInput.style.display = 'none';
                    this.showSuccessMessage(i18n.t('fab.messageAdded'));
                } catch (error) {
                    console.error('Error adding message:', error);
                    alert('Failed to add message. Please try again.');
                }
            }
        });

        // Handle translation
        const translateBtn = this.shadowRoot.querySelector('.translate-btn');
        translateBtn.addEventListener('click', async () => {
            const baseLangTextarea = this.shadowRoot.getElementById('message-base-lang');
            const targetLangTextarea = this.shadowRoot.getElementById('message-target-lang');
            const textToTranslate = baseLangTextarea.value;

            if (!textToTranslate.trim()) {
                alert('Please enter some text in your language first.');
                return;
            }

            if (!deepL.isAvailable()) {
                alert('Translation service is not configured. Please add your API key in the settings.');
                return;
            }

            try {
                const settings = await DatabaseService.getUserSettings();
                // FIX: Use sourceLanguage instead of parentLanguage
                const sourceLang = settings.sourceLanguage; 
                const targetLang = settings.targetLanguage;

                if (!sourceLang || !targetLang) {
                    alert('Source or target language is not configured. Please complete the onboarding process.');
                    return;
                }

                // Show a simple loading state
                targetLangTextarea.value = 'Translating...';

                const result = await deepL.translate(textToTranslate, targetLang, sourceLang);

                if (result.text) {
                    targetLangTextarea.value = result.text;
                } else {
                    targetLangTextarea.value = ''; // Clear on failure
                    alert('Translation failed: ' + (result.error || 'Unknown error'));
                }

            } catch (error) {
                targetLangTextarea.value = ''; // Clear on error
                console.error("Translation process failed:", error);
                alert("An error occurred during translation.");
            }
        });

        // Profile Management Modal
        const profileModal = this.shadowRoot.getElementById('profile-management-modal');
        const profileManager = profileModal.querySelector('profile-manager');

        // Listen for profile manager events
        profileManager.addEventListener('profile-created', (e) => {
            profileModal.close();
            this.showSuccessMessage('Profile created successfully!');
            // Optionally switch to the new profile
            eventBus.emit(EVENTS.PROFILE_SELECTED, {
                profile: e.detail.profile,
                nickname: null
            });
        });

        profileManager.addEventListener('profile-updated', (e) => {
            profileModal.close();
            this.showSuccessMessage('Profile updated successfully!');
        });

        profileManager.addEventListener('profile-deleted', (e) => {
            profileModal.close();
            this.showSuccessMessage('Profile deleted successfully!');
            // Reset current selection if deleted profile was selected
            if (this.currentKidSelection?.profileId === e.detail.profileId) {
                this.currentKidSelection = null;
            }
        });

        // {name} insertion buttons
        const insertNameBtns = this.shadowRoot.querySelectorAll('.insert-name-btn');
        insertNameBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTextarea = e.target.dataset.target;
                const textarea = this.shadowRoot.getElementById(targetTextarea);
                this.insertNamePlaceholder(textarea);
            });
        });

        // Close modal on backdrop click
        [addMessageModal, profileModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.close();
                }
            });
        });
    }

    toggleExpand() {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    expand() {
        this.isExpanded = true;
        const fabMenu = this.shadowRoot.querySelector('.fab-menu');
        const mainFab = this.shadowRoot.getElementById('main-fab');
        
        fabMenu.classList.add('expanded');
        mainFab.classList.add('expanded');
    }

    collapse() {
        this.isExpanded = false;
        const fabMenu = this.shadowRoot.querySelector('.fab-menu');
        const mainFab = this.shadowRoot.getElementById('main-fab');
        
        fabMenu.classList.remove('expanded');
        mainFab.classList.remove('expanded');
    }

    showAddMessageModal() {
        const modal = this.shadowRoot.getElementById('add-message-modal');
        const categorySelect = modal.querySelector('#message-category-select');
        
        // Populate categories
        categorySelect.innerHTML = '<option value="">' + i18n.t('fab.selectCategory') + '</option>' +
            this.categories.map(cat => 
                `<option value="${cat.id}">${cat.title}</option>`
            ).join('') +
            '<option value="new">➕ ' + i18n.t('fab.createNewCategory') + '</option>';
        
        modal.showModal();
    }

    showProfileManagementModal(forceCreate = false) {
        const modal = this.shadowRoot.getElementById('profile-management-modal');
        const profileManager = modal.querySelector('profile-manager');
    
        // Configure based on current selection or if creation is forced
        if (forceCreate || !this.currentKidSelection || !this.currentKidSelection.profileId) {
            // Create new profile
            profileManager.setAttribute('mode', 'create');
            profileManager.removeAttribute('profile-id');
        } else {
            // Edit existing profile
            profileManager.setAttribute('mode', 'edit');
            profileManager.setAttribute('profile-id', this.currentKidSelection.profileId);
        }
    
        modal.showModal();
    }

    insertNamePlaceholder(textarea) {
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(textarea.selectionEnd);
        
        textarea.value = textBefore + '{name}' + textAfter;
        
        // Position cursor after the inserted {name}
        const newCursorPos = cursorPos + 6; // 6 = length of '{name}'
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
    }

    showSuccessMessage(message) {
        const toast = this.shadowRoot.getElementById('success-toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    bottom: 1rem;
                    right: 1rem;
                    z-index: 1000;
                }

                .fab-container {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }

                .fab-menu {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                    opacity: 0;
                    transform: translateY(20px) scale(0.8);
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    pointer-events: none;
                }

                .fab-menu.expanded {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    pointer-events: all;
                }

                .fab-button {
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    backdrop-filter: blur(10px);
                }

                .fab-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
                }

                #main-fab {
                    background-color: var(--color-text-dark);
                    color: var(--primary-text-color);
                }

                #main-fab.expanded {
                    // transform: rotate(45deg);
                }

                .secondary-fab {
                    background-color: var(--container-color);
                    color: var(--color-text-dark);
                    border: 1px solid var(--color-border);
                    position: relative;
                }

                .secondary-fab::before {
                    content: attr(data-tooltip);
                    position: absolute;
                    right: 100%;
                    top: 50%;
                    transform: translateY(-50%);
                    background-color: var(--color-text-dark);
                    color: var(--primary-text-color);
                    padding: 0.5rem 0.75rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    margin-right: 0.5rem;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s ease;
                }

                .secondary-fab:hover::before {
                    opacity: 1;
                }

                /* Modal Styles */
                dialog {
                    border: none;
                    border-radius: 16px;
                    padding: 2rem;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    width: 90%;
                    max-width: 400px;
                    background-color: var(--container-color);
                }

                dialog::backdrop {
                    background-color: rgba(0,0,0,0.4);
                }

                .large-modal {
                    max-width: 500px;
                    width: 95%;
                    max-height: 80vh;
                    overflow-y: auto;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--color-border);
                }

                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--color-text-dark);
                }

                .close-button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.5rem;
                    color: var(--color-text-light);
                    border-radius: 6px;
                }

                .close-button:hover {
                    background-color: var(--color-border);
                }

                dialog h3 {
                    margin-top: 0;
                    margin-bottom: 1.5rem;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--color-text-dark);
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

                .styled-input, .styled-textarea, .styled-select {
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

                .styled-input:focus, .styled-textarea:focus, .styled-select:focus {
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
                    flex: 1;
                    padding: 1rem;
                    border: 1px solid var(--color-border);
                    background-color: transparent;
                    color: var(--color-text-dark);
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                }

                /* Success Toast */
                #success-toast {
                    position: fixed;
                    bottom: 6rem;
                    right: 1rem;
                    background-color: var(--success-color);
                    color: white;
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    transform: translateY(100px);
                    opacity: 0;
                    transition: all 0.3s ease;
                    z-index: 1001;
                }

                #success-toast.show {
                    transform: translateY(0);
                    opacity: 1;
                }
            </style>

            <div class="fab-container">
                <div class="fab-menu">
                    <button id="manage-profile-fab" class="fab-button secondary-fab" data-tooltip="Manage Profile">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            <path d="M8 21v-2a4 4 0 0 1 4-4h.09"></path>
                        </svg>
                    </button>
                    
                    <button id="add-message-fab" class="fab-button secondary-fab" data-tooltip="Add Message">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            <line x1="9" y1="9" x2="15" y2="9"></line>
                            <line x1="9" y1="13" x2="15" y2="13"></line>
                        </svg>
                    </button>
                </div>
                
                <button id="main-fab" class="fab-button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>

            <dialog id="add-message-modal">
                <h3>Add New Message</h3>
                <form id="add-message-form">
                    <div class="form-group">
                        <label for="message-category-select">Category</label>
                        <select id="message-category-select" name="category" class="styled-select" required>
                            <option value="">Select Category</option>
                        </select>
                    </div>
                    <div class="form-group" id="new-category-input">
                        <label for="new-category-name">New Category Name</label>
                        <input type="text" id="new-category-name" name="newCategory" class="styled-input">
                    </div>
                    <div class="form-group">
                        <label for="message-base-lang">Message in your language</label>
                        <div class="input-with-button">
                            <textarea id="message-base-lang" name="baseLang" class="styled-textarea" required></textarea>
                            <button type="button" class="insert-name-btn" data-target="message-base-lang">{name}</button>
                        </div>
                        <div class="helper-text">Use {name} to insert the kid's name</div>
                    </div>
                    <div class="form-group">
                        <label for="message-target-lang" data-i18n="settings.messageInTargetLanguage">Message in target language</label>
                        <div class="input-with-button">
                            <textarea id="message-target-lang" name="targetLang" class="styled-textarea" required></textarea>
                            <button type="button" class="insert-name-btn" data-target="message-target-lang">{name}</button>
                        </div>
                        <div class="helper-text" data-i18n="fab.nameHelp">Use {name} to insert the kid's name</div>
                    </div>
                    <div class="form-group" style="margin-top: -0.5rem;">
                        <button type="button" class="secondary-button translate-btn" style="width: auto; padding: 0.5rem 1rem; font-size: 0.875rem;">
                            Translate
                        </button>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="secondary-button" onclick="this.closest('dialog').close()">Cancel</button>
                        <button type="submit" class="primary-button">Add Message</button>
                    </div>
                </form>
            </dialog>

            <dialog id="profile-management-modal" class="large-modal">
                <div class="modal-header">
                    <h3>Profile Management</h3>
                    <button type="button" class="close-button" onclick="this.closest('dialog').close()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <profile-manager></profile-manager>
            </dialog>

            <div id="success-toast"></div>
        `;
    }
}

customElements.define('floating-action-button', FloatingActionButton);