// js/components/settings-tab.js
import { i18n } from '../services/i18n.js';
import { DatabaseService } from '../services/database.js';
import { deepL } from '../services/deepl.js';
import { eventBus, EVENTS } from '../utils/events.js';

class SettingsTab extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.settings = {};
        this.usage = { character_count: 0, character_limit: 500000, error: false };
        this.boundUpdateContent = this.updateUIWithData.bind(this);
    }

    async connectedCallback() {
        this.render();
        this.setupEventListeners();
        await this.loadData();
        i18n.addListener(this.boundUpdateContent);
    }

    disconnectedCallback() {
        i18n.removeListener(this.boundUpdateContent);
    }

    async loadData() {
        this.settings = await DatabaseService.getUserSettings();

        if (this.settings.deeplApiKey) {
            const usageData = await deepL.getUsage(this.settings.deeplApiKey);
            if (usageData.error) {
                console.error("Could not fetch DeepL usage:", usageData.error);
                this.usage = { character_count: 0, character_limit: 500000, error: true };
            } else {
                this.usage = { ...usageData, error: false };
            }
        } else {
            this.usage = { character_count: 0, character_limit: 500000, error: false };
        }

        this.updateUIWithData();
    }

    setupEventListeners() {
        const form = this.shadowRoot.querySelector('#settings-form');
        form?.addEventListener('submit', this.handleSave.bind(this));

        const toggle = this.shadowRoot.querySelector('#translation-toggle');
        toggle?.addEventListener('click', () => {
            const isActive = toggle.classList.toggle('active');
            const apiKeyGroup = this.shadowRoot.querySelector('#api-key-group');
            if (apiKeyGroup) {
                apiKeyGroup.style.display = isActive ? 'block' : 'none';
            }
        });

        this.shadowRoot.querySelector('#export-btn')?.addEventListener('click', () => this.handleExport());
        this.shadowRoot.querySelector('#import-btn')?.addEventListener('click', () => {
            this.shadowRoot.querySelector('#import-file').click();
        });
        this.shadowRoot.querySelector('#import-file')?.addEventListener('change', (e) => this.handleImport(e));
    }

    async handleSave(e) {
        e.preventDefault();
        const form = e.target;
        const useTranslation = this.shadowRoot.querySelector('#translation-toggle').classList.contains('active');

        const newSettings = {
            deeplApiKey: useTranslation ? form.querySelector('#api-key').value : null,
        };

        await DatabaseService.updateUserSettings(newSettings);

        const saveButton = form.querySelector('.primary-button');
        saveButton.textContent = i18n.t('common.saved');
        setTimeout(() => { saveButton.textContent = i18n.t('common.save'); }, 2000);

        await this.loadData();
    }

    async handleExport() {
        try {
            const data = await DatabaseService.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const date = new Date().toISOString().split('T')[0];
            const a = document.createElement('a');
            a.href = url;
            a.download = `tiptap-backup-${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
            eventBus.emit(EVENTS.TOAST, { message: i18n.t('settings.exportData') + ' ✓', type: 'success' });
        } catch (error) {
            console.error('Export failed:', error);
            eventBus.emit(EVENTS.TOAST, { message: i18n.t('common.error'), type: 'error' });
        }
    }

    async handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Reset input so the same file can be re-selected
        e.target.value = '';

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.version) {
                eventBus.emit(EVENTS.TOAST, { message: i18n.t('common.error'), type: 'error' });
                return;
            }

            if (!confirm(i18n.t('settings.importConfirm'))) return;

            await DatabaseService.importData(data);
            window.location.reload();
        } catch (error) {
            console.error('Import failed:', error);
            eventBus.emit(EVENTS.TOAST, { message: i18n.t('common.error'), type: 'error' });
        }
    }

    updateUIWithData() {
        this.shadowRoot.querySelector('#api-key').value = this.settings.deeplApiKey || '';

        const useTranslation = !!this.settings.deeplApiKey;
        const toggle = this.shadowRoot.querySelector('#translation-toggle');
        const apiKeyGroup = this.shadowRoot.querySelector('#api-key-group');
        toggle.classList.toggle('active', useTranslation);
        apiKeyGroup.style.display = useTranslation ? 'block' : 'none';

        const usageCount = this.usage?.character_count ?? 0;
        const usageLimit = this.usage?.character_limit ?? 500000;
        const usagePercentage = usageLimit > 0 ? (usageCount / usageLimit) * 100 : 0;

        const usageBar = this.shadowRoot.querySelector('.usage-bar');
        if (usageBar) usageBar.style.width = `${usagePercentage.toFixed(2)}%`;

        const usageDetails = this.shadowRoot.querySelector('.usage-details span:first-child');
        if (usageDetails) usageDetails.textContent = i18n.t('settings.usageCounter', { count: usageCount.toLocaleString(), limit: usageLimit.toLocaleString() });

        const usagePercentSpan = this.shadowRoot.querySelector('.usage-details span:last-child');
        if (usagePercentSpan) usagePercentSpan.textContent = `${usagePercentage.toFixed(0)}%`;

        const errorContainer = this.shadowRoot.querySelector('.usage-error-container');
        errorContainer.style.display = this.usage.error ? 'block' : 'none';
        this.shadowRoot.querySelector('.usage-display-container').style.display = this.usage.error ? 'none' : 'block';

        this.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = i18n.t(el.dataset.i18n);
        });
        this.shadowRoot.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = i18n.t(el.dataset.i18nPlaceholder);
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                .settings-content { padding: 1.5rem; }
                .card { background: var(--container-color, #fff); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid var(--color-border, #e5e7eb); }
                h3 { font-size: 1.1rem; font-weight: 600; margin: 0 0 1rem 0; color: var(--color-text-dark, #1f2937); }
                .form-group { margin-bottom: 1rem; }
                .form-group:last-child { margin-bottom: 0; }
                label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--color-text-light, #6b7280); margin-bottom: 0.5rem; }
                .styled-input { width: 100%; box-sizing: border-box; background-color: #f9fafb; border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; padding: 0.875rem 1rem; font-size: 1rem; font-family: inherit; color: var(--color-text-dark, #1f2937); }
                .primary-button { width: 100%; padding: 1rem; border: none; background-color: var(--color-text-dark, #1f2937); color: var(--primary-text-color, #fff); border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; margin-top: 0.5rem; }
                .toggle-container { display: flex; justify-content: space-between; align-items: center; background-color: #f9fafb; padding: 1rem; border-radius: 12px; margin-bottom: 1rem; }
                .toggle-info h4 { font-size: 1rem; font-weight: 600; color: var(--color-text-dark, #1f2937); margin: 0 0 0.25rem 0; }
                .toggle-info p { font-size: 0.875rem; color: var(--color-text-light, #6b7280); margin: 0; }
                .toggle-switch { position: relative; width: 52px; height: 32px; background: #e5e7eb; border-radius: 16px; cursor: pointer; transition: background 0.3s ease; flex-shrink: 0; }
                .toggle-switch.active { background: var(--primary-color, #2563eb); }
                .toggle-knob { position: absolute; top: 2px; left: 2px; width: 28px; height: 28px; background: white; border-radius: 14px; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                .toggle-switch.active .toggle-knob { transform: translateX(20px); }
                .usage-quota-container { font-size: 0.875rem; color: var(--color-text-light, #6b7280); }
                .usage-bar-wrapper { width: 100%; background-color: #e5e7eb; border-radius: 8px; height: 12px; overflow: hidden; margin: 0.5rem 0; }
                .usage-bar { width: 0%; height: 100%; background-color: var(--primary-color, #2563eb); border-radius: 8px; transition: width 0.5s ease; }
                .usage-details { display: flex; justify-content: space-between; }
                .error-message { background-color: #fff1f2; color: #be123c; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; text-align: center; }
                .data-actions { display: flex; flex-direction: column; gap: 1rem; }
                .data-action p { font-size: 0.875rem; color: var(--color-text-light, #6b7280); margin: 0 0 0.75rem 0; }
                .action-button { width: 100%; padding: 1rem; border: none; background-color: var(--color-text-dark, #1f2937); color: var(--primary-text-color, #fff); border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; }
            </style>
            <div class="settings-content">
                <form id="settings-form">
                    <div class="card">
                        <h3 data-i18n="settings.translationService">Translation Service</h3>
                        <div class="toggle-container">
                            <div class="toggle-info">
                                <h4 data-i18n="settings.enableTranslation">Enable Translation</h4>
                                <p data-i18n="settings.enableTranslationDesc">Use DeepL for automatic translations</p>
                            </div>
                            <div class="toggle-switch" id="translation-toggle">
                                <div class="toggle-knob"></div>
                            </div>
                        </div>
                        <div class="form-group" id="api-key-group" style="display: none;">
                            <label for="api-key" data-i18n="settings.apiKey">DeepL API Key</label>
                            <input type="password" id="api-key" name="api-key" class="styled-input">
                        </div>
                        <div class="usage-quota-container">
                            <label data-i18n="settings.monthlyUsage">Monthly Usage</label>
                            <div class="usage-error-container" style="display: none;">
                                <div class="error-message" data-i18n="settings.usageError">Could not retrieve usage data.</div>
                            </div>
                            <div class="usage-display-container">
                                <div class="usage-bar-wrapper">
                                    <div class="usage-bar"></div>
                                </div>
                                <div class="usage-details">
                                    <span>...</span>
                                    <span>...</span>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="primary-button" data-i18n="common.save">Save Settings</button>
                    </div>
                </form>
                <div class="card">
                    <h3 data-i18n="settings.dataManagement">Data Management</h3>
                    <div class="data-actions">
                        <div class="data-action">
                            <p data-i18n="settings.exportDescription">Download all your profiles, messages, and settings as a backup file.</p>
                            <button type="button" class="action-button" id="export-btn" data-i18n="settings.exportData">Export Data</button>
                        </div>
                        <div class="data-action">
                            <p data-i18n="settings.importDescription">Restore from a backup file. This will replace all current data.</p>
                            <button type="button" class="action-button" id="import-btn" data-i18n="settings.importData">Import Data</button>
                            <input type="file" id="import-file" accept=".json" style="display: none;">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('settings-tab', SettingsTab);
