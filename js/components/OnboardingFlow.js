// js/components/OnboardingFlow.js
import { i18n } from '../services/i18n.js';
import { TimezoneService } from '../services/timezoneService.js';
import { ImageProcessor } from '../utils/image-processor.js';

class OnboardingFlow extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        this.state = {
            currentStep: 1,
            totalSteps: 9,
            sourceLanguage: '',
            targetLanguage: '',
            userName: '',
            userSignature: '',
            kids: [],
            currentKid: {
                originalName: '', // Use new name
                translatedName: '', // Use new name
                birthdate: '',
                timezone: '',
                language: '',
                languageName: '',
                avatar: null
            },
            useTranslation: false,
            apiKey: ''
        };

        this.timezoneData = [];
        this.boundHandleLocaleChange = this.handleLocaleChange.bind(this);
    }

    async connectedCallback() {
        // Load timezone data
        this.timezoneData = await TimezoneService.getTimezones();
        
        // Listen for locale changes
        this.render();
        i18n.addListener(this.boundHandleLocaleChange);
        this.updateContent();
        this.setupEventListeners();
        this.updateView();
    }

    disconnectedCallback() {
        i18n.removeListener(this.boundHandleLocaleChange);
    }

    handleLocaleChange() {
        this.updateContent();
    }

    setupEventListeners() {
        const nextButton = this.shadowRoot.getElementById('next-button');
        const backButton = this.shadowRoot.getElementById('back-button');
        const skipButton = this.shadowRoot.getElementById('skip-button');

        nextButton?.addEventListener('click', () => this.handleNext());
        backButton?.addEventListener('click', () => this.goToStep(this.state.currentStep - 1));
        skipButton?.addEventListener('click', () => this.goToStep(this.state.currentStep + 1));

        // Form input listeners
        this.setupFormListeners();
        
        // Bottom sheet setup
        this.setupBottomSheets();
        
        // Swipe support
        this.setupSwipeSupport();
    }

    setupFormListeners() {
        const childName = this.shadowRoot.getElementById('child-name');
        const childBirthdate = this.shadowRoot.getElementById('child-birthdate');
        const apiKey = this.shadowRoot.getElementById('api-key');
        const avatarUpload = this.shadowRoot.getElementById('avatar-upload');
        const translationToggle = this.shadowRoot.getElementById('translation-toggle');
        const userNameInput = this.shadowRoot.getElementById('user-name');
        const userSignatureInput = this.shadowRoot.getElementById('user-signature');

        
        userNameInput?.addEventListener('input', (e) => {
            this.state.userName = e.target.value;
        });

        userSignatureInput?.addEventListener('input', (e) => {
            this.state.userSignature = e.target.value;
        });

        childName?.addEventListener('input', (e) => {
            this.state.currentKid.originalName = e.target.value;
        });

        childBirthdate?.addEventListener('input', (e) => {
            this.state.currentKid.birthdate = e.target.value;
        });

        apiKey?.addEventListener('input', (e) => {
            this.state.apiKey = e.target.value;
        });

        avatarUpload?.addEventListener('change', (e) => this.handleAvatarUpload(e));
        translationToggle?.addEventListener('click', () => this.toggleTranslation());
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const processedImage = await ImageProcessor.processImage(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                const label = this.shadowRoot.querySelector('label[for="avatar-upload"]');
                label.style.backgroundImage = `url('${e.target.result}')`;
                label.innerHTML = '';
                this.state.currentKid.avatar = e.target.result;
            };
            reader.readAsDataURL(processedImage.blob);
        } catch (error) {
            console.error("Failed to process image:", error);
            alert(i18n.t('errors.unexpectedError'));
        }
    }

    toggleTranslation() {
        this.state.useTranslation = !this.state.useTranslation;
        this.updateTranslationToggle();
    }

    updateTranslationToggle() {
        const toggle = this.shadowRoot.getElementById('translation-toggle');
        const apiGroup = this.shadowRoot.getElementById('api-key-group');
        
        toggle?.classList.toggle('active', this.state.useTranslation);
        if (apiGroup) {
            apiGroup.style.display = this.state.useTranslation ? 'block' : 'none';
        }
    }

    setupBottomSheets() {
        // Add country and timezone panels to the setup
        const panels = ['app-language', 'parent-language', 'child-language', 'country', 'timezone'];
        
        panels.forEach(panelType => {
            const panel = this.shadowRoot.getElementById(`${panelType}-panel`);
            if (!panel) return;

            const optionsList = this.shadowRoot.getElementById(`${panelType}-options`);
            const closeBtn = panel.querySelector('.panel-close-btn');
            
            this.populatePanelOptions(panelType, optionsList);

            optionsList.addEventListener('click', (e) => {
                const option = e.target.closest('.panel-option');
                if (option) {
                    this.handleOptionSelect(panelType, option);
                    this.closePanel(panel);
                }
            });

            closeBtn?.addEventListener('click', () => this.closePanel(panel));
            panel.addEventListener('click', (e) => {
                if (e.target === panel) this.closePanel(panel);
            });
        });

        // Trigger handlers
        this.shadowRoot.querySelectorAll('[data-panel-target]').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const panelId = trigger.dataset.panelTarget;
                const panel = this.shadowRoot.getElementById(panelId);
                this.openPanel(panel);
            });
        });
    }

    populatePanelOptions(panelType, optionsList) {
        if (!optionsList) return;
        let options = [];

        if (panelType === 'app-language') {
            options = i18n.getSupportedAppLocales();
        } else if (panelType === 'parent-language' || panelType === 'child-language') {
            options = i18n.getSupportedTranslationLanguages();
        } else if (panelType === 'country') {
            // Populate countries from timezone data
            optionsList.innerHTML = this.timezoneData.map(data => `
                <li class="panel-option" data-value="${data.country}">
                    <span class="panel-option-text">${data.country}</span>
                </li>
            `).join('');
            return;
        } else {
            return; // Timezone panel is populated dynamically
        }
        
        optionsList.innerHTML = options.map(option => `
            <li class="panel-option" data-value="${option.code}" data-text="${option.name}">
                <span class="panel-option-emoji">${option.emoji}</span>
                <span class="panel-option-text">${option.name}</span>
            </li>
        `).join('');
    }
    
    populateTimezonePanel(countryName) {
        const timezoneList = this.shadowRoot.getElementById('timezone-options');
        const countryData = this.timezoneData.find(d => d.country === countryName);
        
        if (!timezoneList || !countryData || countryData.timezones.length === 0) {
            timezoneList.innerHTML = `<li class="panel-option-text" style="padding: 1rem; text-align: center; color: #666;">No timezones available.</li>`;
            return;
        }

        timezoneList.innerHTML = countryData.timezones.map(tz => `
            <li class="panel-option" data-value="${tz}">
                <span class="panel-option-text">${tz.replace(/_/g, ' ')}</span>
            </li>
        `).join('');

        // If there's only one timezone, select it automatically
        if (countryData.timezones.length === 1) {
            const singleTimezone = countryData.timezones[0];
            this.state.currentKid.timezone = singleTimezone;
            this.updateDisplayText('timezone-display', singleTimezone.replace(/_/g, ' '));
        }
    }

    handleOptionSelect(panelType, option) {
        const value = option.dataset.value;
        const text = option.dataset.text || value;
        
        if (panelType === 'app-language') {
            // this.state.appLanguage = value;
            i18n.setLocale(value); // Change app language immediately
            this.state.sourceLanguage = value; // Set the source language for later
            this.updateDisplayText('app-language-display', text);
        } else if (panelType === 'parent-language') {
            this.state.sourceLanguage = value;
            // this.state.sourceLanguageName = text;
            this.updateDisplayText('parent-language-display', text);
        } else if (panelType === 'child-language') {
            this.state.targetLanguage = value;
            this.state.currentKid.language = value;
            // this.state.currentKid.languageName = text;
            this.updateDisplayText('child-language-display', text);
        }
        else if (panelType === 'country') {
            this.state.currentKid.country = value;
            this.updateDisplayText('country-display', text);
            // Reset and populate timezone
            this.state.currentKid.timezone = '';
            this.updateDisplayText('timezone-display', i18n.t('settings.profileTimezone'), true);
            this.populateTimezonePanel(value);
        } else if (panelType === 'timezone') {
            this.state.currentKid.timezone = value;
            this.updateDisplayText('timezone-display', text.replace(/_/g, ' '));
        }
    }

    updateDisplayText(elementId, text, isPlaceholder = false) {
        const element = this.shadowRoot.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.className = isPlaceholder ? 'placeholder' : '';
        }
    }

    openPanel(panel) {
        panel?.classList.add('visible');
    }

    closePanel(panel) {
        panel?.classList.remove('visible');
    }

    setupSwipeSupport() {
        let touchstartX = 0;
        let touchendX = 0;
        const swipeThreshold = 50;

        const mainContainer = this.shadowRoot.getElementById('onboarding-main');
        
        mainContainer?.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        }, { passive: true });

        mainContainer?.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            this.handleSwipe(touchstartX, touchendX, swipeThreshold);
        });
    }

    handleSwipe(startX, endX, threshold) {
        if (endX < startX - threshold) {
            this.goToStep(this.state.currentStep + 1);
        }
        if (endX > startX + threshold) {
            this.goToStep(this.state.currentStep - 1);
        }
    }

    handleNext() {

        if (this.state.currentStep === 1 && !this.state.sourceLanguage) {
            alert(i18n.t('onboarding.placeholders.chooseLanguage'));
            return;
       }
        // Correct validation for the current step order
        // if (this.state.currentStep === 4 && !this.state.sourceLanguage) {
        //     alert(i18n.t('onboarding.placeholders.chooseLanguage'));
        //     return;
        // }
        // if (this.state.currentStep === 5 && !this.state.currentKid.name.trim()) {
        //     alert(i18n.t('onboarding.step5.placeholders.childName'));
        //     return;
        // }
        if (this.state.currentStep === 6 && !this.state.currentKid.language) {
            alert(i18n.t('onboarding.panelTitles.childLanguage'));
            return;
        }

        // Correct step to save the kid's data is after completing step 6
        // if (this.state.currentStep === 6 && this.state.currentKid.name) {
        //     this.saveCurrentKid();
        // }

        this.goToStep(this.state.currentStep + 1);
    }

    saveCurrentKid() {
        if (this.state.currentKid.originalName && this.state.targetLanguage) {
            this.state.kids.push({ 
                ...this.state.currentKid,
                language: this.state.targetLanguage
            });
            this.state.currentKid = {
                originalName: '',
                translatedName: '',
                birthdate: '',
                timezone: '',
                language: this.state.targetLanguage,
                languageName: '',
                avatar: null
            };
            this.clearFormFields();
        }
    }

    clearFormFields() {
        const childName = this.shadowRoot.getElementById('child-name');
        const childBirthdate = this.shadowRoot.getElementById('child-birthdate');
        const childLanguageDisplay = this.shadowRoot.getElementById('child-language-display');
        
        if (childName) childName.value = '';
        if (childBirthdate) childBirthdate.value = '';
        if (childLanguageDisplay) {
            childLanguageDisplay.textContent = i18n.t('onboarding.placeholders.chooseLanguage');
            childLanguageDisplay.className = 'placeholder';
        }
    }

    goToStep(stepNumber) {
        if (stepNumber > this.state.totalSteps) {
            this.finishOnboarding();
            return;
        }
        if (stepNumber < 1) return;
        
        this.state.currentStep = stepNumber;
        this.updateView();
    }

    updateView() {
        // Update step visibility
        this.shadowRoot.querySelectorAll('.onboarding-step').forEach((step, index) => {
            step.classList.toggle('hidden', index + 1 !== this.state.currentStep);
        });

        // Update progress dots
        this.shadowRoot.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.toggle('active', index + 1 === this.state.currentStep);
        });

        // Update navigation buttons
        const backButton = this.shadowRoot.getElementById('back-button');
        const skipContainer = this.shadowRoot.getElementById('skip-button-container');
        const nextButton = this.shadowRoot.getElementById('next-button');
        
        if (backButton) {
            backButton.style.visibility = this.state.currentStep === 1 ? 'hidden' : 'visible';
        }
        
        // Show skip button for optional steps
        const isOptionalStep = [5, 7].includes(this.state.currentStep);
        if (skipContainer) {
            skipContainer.style.visibility = isOptionalStep ? 'visible' : 'hidden';
        }

        // Update next button icon for last step
        if (nextButton) {
            if (this.state.currentStep === this.state.totalSteps) {
                nextButton.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            } else {
                nextButton.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
            }
        }

        // Update step-specific content
        this.updateStepContent();
    }

    updateStepContent() {
        // Update kids summary if we have kids
        if (this.state.kids.length > 0) {
            this.updateKidsSummary();
        }
        
        // Update content with current translations
        this.updateContent();
    }

    updateContent() {
        // Update all translatable content
        const elements = this.shadowRoot.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.dataset.i18n;
            element.textContent = i18n.t(key);
        });

         // Add this new block to handle HTML content
        this.shadowRoot.querySelectorAll('[data-i18n-html]').forEach(element => {
        const key = element.dataset.i18nHtml;
        element.innerHTML = i18n.t(key);
    });

        // Update placeholders
        const placeholders = this.shadowRoot.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(element => {
            const key = element.dataset.i18nPlaceholder;
            element.placeholder = i18n.t(key);
        });
    }

    updateKidsSummary() {
        const summary = this.shadowRoot.getElementById('kids-summary');
        const kidsList = this.shadowRoot.getElementById('kids-list');
        
        if (this.state.kids.length > 0 && summary && kidsList) {
            summary.classList.remove('hidden');
            kidsList.innerHTML = this.state.kids.map(kid => `
                <div class="kid-item">
                    <div class="kid-avatar">${kid.originalName.charAt(0)}</div>
                    <div class="kid-info">
                        <div class="kid-name">${kid.originalName}</div>
                        <div class="kid-details">${kid.languageName}${kid.birthdate ? ` • ${this.getAge(kid.birthdate)} years old` : ''}</div>
                    </div>
                </div>
            `).join('');
        } else if (summary) {
            summary.classList.add('hidden');
        }
    }

    getAge(birthdate) {
        if (!birthdate) return '';
        const today = new Date();
        const birth = new Date(birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    finishOnboarding() {
        // Save current kid if filled
        // if (this.state.currentKid.name && this.state.currentKid.language) {
        //     this.saveCurrentKid();
        // }

        if (this.state.currentKid.originalName.trim() && this.state.currentKid.targetLanguage) {
            this.state.kids.push({ ...this.state.currentKid });
        }

        // Emit completion event with collected data
        this.dispatchEvent(new CustomEvent('onboarding-complete', {
            detail: {
                userName: this.state.userName,
                userSignature: this.state.userSignature,
                sourceLanguage: this.state.sourceLanguage,
                targetLanguage: this.state.targetLanguage, // This should be collected in a previous step
                kids: this.state.kids,
                useTranslation: this.state.useTranslation,
                apiKey: this.state.apiKey
            }
        }));
    }

    render() {
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="app-container">
                <main class="onboarding-main" id="onboarding-main">
                    ${this.renderSteps()}
                    ${this.renderNavigation()}
                </main>
            </div>
            ${this.renderBottomSheets()}
        `;
    }

    getStyles() {
        return `
            <style>
                :root {
                    --background-color: #ffffff;
                    --container-color: #ffffff;
                    --text-color: #333333;
                    --primary-color: #2563eb;
                    --primary-text-color: #ffffff;
                    --color-text-dark: #1f2937;
                    --color-text-light: #6b7280;
                    --color-border: #e5e7eb;
                    --font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }

                * { box-sizing: border-box; margin: 0; padding: 0; }

                .app-container {
                    max-width: 400px;
                    margin: auto;
                    height: 100vh;
                    background-color: var(--container-color);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    font-family: var(--font-family-base);
                }
                
                .onboarding-main {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 1rem 1.5rem 1.5rem 1.5rem;
                    overflow: hidden;
                }
                
                .onboarding-step {
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                    justify-content: space-between;
                }
                
                .hidden { display: none !important; }
                
                .illustration-container {
                    width: 100%; height: 45vh; background-color: #f3f4f6;
                    border-radius: 24px; display: flex; align-items: center; justify-content: center;
                    color: var(--color-text-light); flex-shrink: 0; margin-bottom: 1rem;
                }
                
                .illustration-container.clickable { cursor: pointer; }

                .bottom-content-container {
                    flex-grow: 1; display: flex; flex-direction: column; overflow-y: auto;
                }
                
                .step-header { text-align: left; margin-bottom: 1.5rem; }
                .step-header h2 { font-size: 1.75rem; font-weight: 700; color: var(--color-text-dark); margin-bottom: 0.75rem; }
                .step-header p { font-size: 1rem; line-height: 1.6; color: var(--color-text-light); }

                .form-group { margin-bottom: 1rem; }
                
                .styled-input {
                    width: 100%; background-color: #f9fafb; border: 1px solid var(--color-border); border-radius: 16px;
                    padding: 0.875rem 1rem; font-size: 1rem; color: var(--color-text-dark);
                }
                .styled-input::placeholder { color: var(--color-text-light); }
                .styled-input:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2); }
                
                .select-input-trigger {
                    width: 100%; background-color: #f9fafb; border: 1px solid var(--color-border); border-radius: 16px;
                    padding: 0.875rem 1rem; cursor: pointer; display: flex; justify-content: space-between;
                    align-items: center; transition: border-color 0.2s, box-shadow 0.2s;
                }
                .select-input-trigger:hover { border-color: #d1d5db; }
                .select-input-trigger span { font-size: 1rem; color: var(--color-text-dark); }
                .select-input-trigger .placeholder { color: var(--color-text-light); }
                .arrow { width: 20px; height: 20px; color: var(--color-text-light); }
                
                .hidden-input { display: none; }
                
                .toggle-container {
                    background-color: #f9fafb; border: 1px solid var(--color-border); border-radius: 16px;
                    padding: 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;
                }
                
                .toggle-info h4 { font-size: 1rem; font-weight: 600; color: var(--color-text-dark); margin-bottom: 0.25rem; }
                .toggle-info p { font-size: 0.875rem; color: var(--color-text-light); }
                
                .toggle-switch {
                    position: relative; width: 60px; height: 32px; background: #e5e7eb; border-radius: 16px;
                    cursor: pointer; transition: background 0.3s ease;
                }
                .toggle-switch.active { background: var(--primary-color); }
                .toggle-knob {
                    position: absolute; top: 2px; left: 2px; width: 28px; height: 28px; background: white;
                    border-radius: 14px; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .toggle-switch.active .toggle-knob { transform: translateX(28px); }
                
                .kids-summary {
                    background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px;
                    padding: 1rem; margin-bottom: 1rem;
                }
                .kids-summary h4 { font-size: 0.875rem; font-weight: 600; color: var(--color-text-dark); margin-bottom: 0.5rem; }
                .kid-item {
                    background: white; border-radius: 12px; padding: 0.75rem; margin-bottom: 0.5rem;
                    display: flex; align-items: center; gap: 0.75rem;
                }
                .kid-item:last-child { margin-bottom: 0; }
                .kid-avatar {
                    width: 40px; height: 40px; border-radius: 20px; background: #f3f4f6;
                    display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
                }
                .kid-info { flex: 1; }
                .kid-name { font-weight: 600; color: var(--color-text-dark); }
                .kid-details { font-size: 0.8rem; color: var(--color-text-light); }
                
                /* Bottom sheets */
                .options-panel-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(0,0,0,0.4); z-index: 1000;
                    opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s;
                }
                .options-panel-overlay.visible { opacity: 1; visibility: visible; }

                .options-panel {
                    position: fixed; bottom: 0; left: 0; width: 100%;
                    background: white; border-radius: 24px 24px 0 0;
                    padding: 1rem 1.5rem 1.5rem 1.5rem;
                    transform: translateY(100%); transition: transform 0.3s ease;
                    max-height: 70vh; display: flex; flex-direction: column;
                }

                .options-panel-overlay.visible .options-panel { transform: translateY(0); }

                .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .panel-title { font-size: 1.25rem; font-weight: 700; color: var(--color-text-dark); }
                .panel-close-btn { background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; }
                
                .panel-options-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; }
                .panel-option { padding: 1rem; border-bottom: 1px solid var(--color-border); cursor: pointer; display: flex; align-items: center; gap: 0.75rem; }
                .panel-option:last-child { border-bottom: none; }
                .panel-option:hover { background-color: #f9fafb; }
                .panel-option-emoji { font-size: 1.5rem; }
                .panel-option-text { flex: 1; }

                /* Navigation */
                .navigation-container { margin-top: auto; flex-shrink: 0; }
                .skip-button-container { text-align: center; padding: 0.5rem 0; }
                .skip-button { background: none; border: none; color: var(--color-text-light); font-size: 0.9rem; cursor: pointer; padding: 0.5rem; }
                .skip-button:hover { color: var(--color-text-dark); }
                .navigation-wrapper { padding-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); }
                .progress-dots { display: flex; gap: 0.5rem; }
                .dot { width: 8px; height: 8px; border-radius: 50%; background-color: #d1d5db; transition: all 0.3s; }
                .dot.active { background-color: var(--color-text-dark); }
                .navigation-buttons { display: flex; gap: 0.75rem; }
                .nav-button { width: 50px; height: 50px; border-radius: 16px; border: 1px solid var(--color-border); background-color: var(--container-color); color: var(--color-text-dark); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .nav-button:hover { background-color: #f3f4f6; }
                .nav-button.primary { background-color: var(--color-text-dark); color: var(--primary-text-color); border-color: var(--color-text-dark); }
                .nav-button.primary:hover { background-color: #000; }
            </style>
        `;
    }

    renderSteps() {
        return `
            <!-- Step 1: Welcome -->
             <div id="step-1" class="onboarding-step">
                <div class="illustration-container">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </div>
                <div class="bottom-content-container">
                    <div class="step-header">
                        <h2 data-i18n="onboarding.step1.title">Stay Connected, Always</h2>
                        <p data-i18n="onboarding.step1.description">Send loving messages to your children in their language, even when you're apart. Distance doesn't diminish love.</p>
                    </div>
                    <div class="form-group">
                        <div class="select-input-trigger" data-panel-target="app-language-panel">
                            <span id="app-language-display" class="placeholder" data-i18n="onboarding.placeholders.chooseLanguage">Choose language...</span>
                            <div class="arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 2: What it does -->
            <div id="step-2" class="onboarding-step hidden">
                <div class="illustration-container">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                </div>
                <div class="bottom-content-container">
                    <div class="step-header">
                        <h2 data-i18n="onboarding.step2.title">Messages That Matter</h2>
                        <p data-i18n="onboarding.step2.description">Pre-written loving messages, personalized with names, and automatically translated with care. Ready to share instantly.</p>
                    </div>
                </div>
            </div>

            <!-- Step 3: Privacy -->
            <div id="step-3" class="onboarding-step hidden">
                <div class="illustration-container">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <div class="bottom-content-container">
                    <div class="step-header">
                        <h2 data-i18n="onboarding.step3.title">Private and Secure</h2>
                        <p data-i18n="onboarding.step3.description">No tracking, no external services by default. Your family's messages stay on your device, for your eyes only.</p>
                    </div>
                </div>
            </div>

            <!-- Step 4: App Language -->
            <!-- <div id="step-4" class="onboarding-step hidden">
                <div class="illustration-container">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    </svg>
                </div>
                <div class="bottom-content-container">
                    <div class="step-header">
                        <h2 data-i18n="onboarding.step4.title">Choose App Language</h2>
                        <p data-i18n="onboarding.step4.description">Select the language for menus and buttons.</p>
                    </div>
                    <div class="form-group">
                        <div class="select-input-trigger" data-panel-target="app-language-panel">
                            <span id="app-language-display" class="placeholder" data-i18n="onboarding.placeholders.chooseLanguage">Choose language...</span>
                            <div class="arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div> -->

            <!-- Step 4: Your Language -->
            <div id="step-4" class="onboarding-step hidden">
                <div class="illustration-container">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10 15.3 15.3 0 0 1-4 10z"></path>
                    </svg>
                </div>
                <div class="bottom-content-container">
                    <div class="step-header">
                        <h2 data-i18n="onboarding.step4.title">Your Language</h2>
                        <p data-i18n="onboarding.step4.description">The language you'll use to write messages.</p>
                    </div>
                    <div class="form-group">
                        <div class="select-input-trigger" data-panel-target="parent-language-panel">
                            <span id="parent-language-display" class="placeholder" data-i18n="onboarding.placeholders.chooseLanguage">Choose language...</span>
                            <div class="arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 5: First child setup -->
            <div id="step-5" class="onboarding-step hidden">
                <label for="avatar-upload" class="illustration-container clickable">
                    </label>
                <input type="file" id="avatar-upload" class="hidden-input" accept="image/*">
                <div class="bottom-content-container">
                    <div class="step-header">
                        <h2 data-i18n="onboarding.step5.title">Add Your First Child</h2>
                        <p data-i18n="onboarding.step5.description">Let's create a profile for them. You can add more children later.</p>
                    </div>
                    
                    <div id="kids-summary" class="kids-summary hidden">...</div>
                    
                    <div class="form-group">
                        <input type="text" id="child-name" class="styled-input" data-i18n-placeholder="onboarding.step5.placeholders.childName">
                    </div>
                    <div class="form-group">
                        <input type="date" id="child-birthdate" class="styled-input" data-i18n-placeholder="onboarding.placeholders.childBirthdate">
                    </div>
                    
                    <div class="form-group">
                        <div class="select-input-trigger" data-panel-target="country-panel">
                            <span id="country-display" class="placeholder" data-i18n="settings.selectCountry">-- Select Country --</span>
                            <div class="arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="select-input-trigger" data-panel-target="timezone-panel">
                            <span id="timezone-display" class="placeholder" data-i18n="settings.profileTimezone">Timezone</span>
                            <div class="arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 6: Child's language -->
            <div id="step-6" class="onboarding-step hidden">
                <div class="illustration-container">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10 15.3 15.3 0 0 1-4 10z"></path>
                    </svg>
                </div>
                <div class="bottom-content-container">
                    <div class="step-header">
                        <h2 data-i18n="onboarding.step6.title">Their Language</h2>
                        <p data-i18n="onboarding.step6.description">The language your child speaks and understands.</p>
                    </div>
                    <div class="form-group">
                        <div class="select-input-trigger" data-panel-target="child-language-panel">
                            <span id="child-language-display" class="placeholder" data-i18n="onboarding.placeholders.chooseLanguage">Choose language...</span>
                            <div class="arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            

            <!-- Step 7: Translation setup -->
            <div id="step-7" class="onboarding-step hidden">
                <div class="illustration-container">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M20 12V8H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v4"></path>
                        <path d="M4 12v8a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4"></path>
                        <circle cx="9" cy="12" r="1"></circle>
                        <circle cx="15" cy="12" r="1"></circle>
                    </svg>
                </div>
                <div class="bottom-content-container">
                    <div class="step-header">
                        <h2 data-i18n="onboarding.step7.title">Translation Service</h2>
                        <p data-i18n="onboarding.step7.description">Optional: Enable automatic translation between your languages with your own DeepL API key.</p>
                    </div>
                    
                    <div class="toggle-container">
                        <div class="toggle-info">
                            <h4 data-i18n="onboarding.step7.toggleTitle">Enable Translation</h4>
                            <p data-i18n="onboarding.step7.toggleDescription">Get automatic translations with DeepL</p>
                        </div>
                        <div class="toggle-switch" id="translation-toggle">
                            <div class="toggle-knob"></div>
                        </div>
                    </div>
                    
                    <div class="form-group" id="api-key-group" style="display: none;">
                        <input type="password" id="api-key" class="styled-input" data-i18n-placeholder="onboarding.step7.apiKeyPlaceholder">

                        <p style="font-size: 0.875rem; color: var(--color-text-light); margin-top: 0.5rem;" data-i18n-html="onboarding.step7.apiKeyHelp"></p>
                    </div>
                </div>
            </div>

            <div id="step-8" class="onboarding-step hidden">
                <div class="step-header">
                    <h2 data-i18n="onboarding.step8.title">Your Profile</h2>
                    <p data-i18n="onboarding.step8.description">This helps personalize the app for you.</p>
                </div>
                <div class="form-group">
                    <input type="text" id="user-name" class="styled-input" placeholder="Your Name (e.g., John)">
                </div>
                <div class="form-group">
                    <input type="text" id="user-signature" class="styled-input" placeholder="How you sign messages (e.g., Dad)">
                </div>
            </div>

            <!-- Step 8: Summary & finish -->
            <div id="step-9" class="onboarding-step hidden">
                <div class="illustration-container">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <div class="bottom-content-container">
                    <div class="step-header">
                        <h2 data-i18n="onboarding.step9.title">You're All Set!</h2>
                        <p data-i18n="onboarding.step9.description">Your family messaging app is ready. You can add more children and customize messages anytime.</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderNavigation() {
        return `
            <div class="navigation-container">
                <div class="skip-button-container" id="skip-button-container">
                    <button class="skip-button" id="skip-button" data-i18n="common.skip">Skip for now</button>
                </div>
                <div class="navigation-wrapper">
                    <div class="progress-dots" id="progress-dots">
                        ${Array.from({length: this.state.totalSteps}, () => '<div class="dot"></div>').join('')}
                    </div>
                    <div class="navigation-buttons">
                        <button class="nav-button" id="back-button">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                        </button>
                        <button class="nav-button primary" id="next-button">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderBottomSheets() {
        return `
            <!-- App Language Panel -->
            <div class="options-panel-overlay" id="app-language-panel">
                <div class="options-panel">
                    <div class="panel-header">
                        <h3 class="panel-title" data-i18n="onboarding.panelTitles.appLanguage">App Language</h3>
                        <button class="panel-close-btn">&times;</button>
                    </div>
                    <ul class="panel-options-list" id="app-language-options"></ul>
                </div>
            </div>

            <!-- Parent Language Panel -->
            <div class="options-panel-overlay" id="parent-language-panel">
                <div class="options-panel">
                    <div class="panel-header">
                        <h3 class="panel-title" data-i18n="onboarding.panelTitles.yourLanguage">Your Language</h3>
                        <button class="panel-close-btn">&times;</button>
                    </div>
                    <ul class="panel-options-list" id="parent-language-options"></ul>
                </div>
            </div>

            <!-- Child Language Panel -->
            <div class="options-panel-overlay" id="child-language-panel">
                <div class="options-panel">
                    <div class="panel-header">
                        <h3 class="panel-title" data-i18n="onboarding.panelTitles.childLanguage">Child's Language</h3>
                        <button class="panel-close-btn">&times;</button>
                    </div>
                    <ul class="panel-options-list" id="child-language-options"></ul>
                </div>
            </div>

            <!-- Child Country/Timezone Panel -->
             <div class="options-panel-overlay" id="country-panel">
                <div class="options-panel">
                    <div class="panel-header">
                        <h3 class="panel-title" data-i18n="settings.profileCountry">Country</h3>
                        <button class="panel-close-btn">&times;</button>
                    </div>
                    <ul class="panel-options-list" id="country-options"></ul>
                </div>
            </div>

            <div class="options-panel-overlay" id="timezone-panel">
                <div class="options-panel">
                    <div class="panel-header">
                        <h3 class="panel-title" data-i18n="settings.profileTimezone">Timezone</h3>
                        <button class="panel-close-btn">&times;</button>
                    </div>
                    <ul class="panel-options-list" id="timezone-options"></ul>
                </div>
            </div>
        `;
    }
}

customElements.define('onboarding-flow', OnboardingFlow);