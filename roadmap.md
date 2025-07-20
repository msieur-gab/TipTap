# TipTap App Development Roadmap

This document outlines the development plan for enhancing the TipTap application. The roadmap is divided into three phases, prioritizing foundational changes, new features, and finally, refactoring and enhancements.

---

## Phase 1: Foundational Changes & Core Logic

This phase focuses on simplifying the core logic and adding essential services that will be required for future features.

### Task 1: Simplify Onboarding & Core Language Logic

**Goal:** Streamline the initial user experience and simplify the app's language handling by removing the distinction between UI language and source/target languages.

-   [ ] **Modify `js/components/OnboardingFlow.js`:**
    -   [ ] Remove the "App Language" selection step. The app's UI language will be determined by the browser's language or fallback to English.
    -   [ ] Update the `state` object to remove `appLanguage`.
    -   [ ] Refactor the `finishOnboarding` method to only pass `parentLanguage` and `targetLanguage` to the `onboarding-complete` event.

-   [ ] **Update `js/services/i18n.js`:**
    -   [ ] Modify the `init()` method to rely solely on `navigator.language` for setting the initial locale, ensuring it falls back to English if the detected language isn't supported.

-   [ ] **Update `js/app.js`:**
    -   [ ] Adjust the `startOnboarding` event listener to reflect the simplified data being received from the `onboarding-complete` event.

### Task 2: Extend DeepL Service for Quota

**Goal:** Add the functionality to fetch and display the user's DeepL API usage.

-   [ ] **Create a New Netlify Function for Usage:**
    -   [ ] Create a new file: `netlify/functions/deepl-usage.js`.
    -   [ ] This function will take an API key, make a request to the DeepL `/v2/usage` endpoint, and return the `character_count` and `character_limit`.

    ```javascript
    // netlify/functions/deepl-usage.js
    exports.handler = async function(event) {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: 'Method Not Allowed' };
        }

        try {
            const { apiKey } = JSON.parse(event.body);
            if (!apiKey) {
                return { statusCode: 400, body: JSON.stringify({ error: 'API key is missing.' }) };
            }
            
            const apiEndpoint = '[https://api-free.deepl.com/v2/usage](https://api-free.deepl.com/v2/usage)';

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `DeepL-Auth-Key ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    statusCode: response.status,
                    body: JSON.stringify({ error: errorData.message || 'DeepL API error' }),
                };
            }

            const data = await response.json();
            return {
                statusCode: 200,
                body: JSON.stringify(data),
            };

        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message }),
            };
        }
    };
    ```

-   [ ] **Update `js/services/deepl.js`:**
    -   [ ] Add a new `getUsage()` method that calls the new Netlify function and returns the usage data.

---

## Phase 2: Building New User-Facing Features

This phase focuses on creating the new settings panel and improving user feedback mechanisms.

### Task 3: Create Core User Settings Panel

**Goal:** Build a new settings panel where users can manage their API key and view their translation quota.

-   [ ] **Create `js/components/user-settings-panel.js`:**
    -   [ ] This component will have an input field for the DeepL API key.
    -   [ ] It will have a section to display the usage quota, calling the `deepL.getUsage()` method.
    -   [ ] Include a "Save" button that updates the `deeplApiKey` in the database via `DatabaseService.updateUserSettings()`.

### Task 4: Create a Reusable Toast Component

**Goal:** Replace all native `alert()` calls with a more elegant, non-blocking toast notification system.

-   [ ] **Create `js/components/feedback-toast.js`:**
    -   [ ] The component should be able to display success, error, and info messages.
    -   [ ] It should appear for a few seconds and then automatically disappear.
    -   [ ] Create a global helper function or an event-based system to easily trigger the toast from any other component (e.g., `eventBus.emit(EVENTS.SHOW_TOAST, { message: 'Success!', type: 'success' });`).

-   [ ] **Integrate the Toast Component:**
    -   [ ] Add `<feedback-toast></feedback-toast>` to the main `index.html`.
    -   [ ] Go through all components and replace `alert()` calls with the new toast event.

---

## Phase 3: Refactoring and Feature Enhancement

This phase is about improving the codebase and adding "smart" features that enhance the user experience.

### Task 5: Refactor the Floating Action Button

**Goal:** Decouple the message creation logic from the FAB for better code organization.

-   [ ] **Create `js/components/message-creator.js`:**
    -   [ ] Move the message creation form and its logic from `floating-action-button.js` into this new component.
    -   [ ] This component will be responsible for handling user input, translation, and adding the new message to the database.

-   [ ] **Update `floating-action-button.js`:**
    -   [ ] The FAB will now be responsible only for toggling its menu and opening a modal containing the `<message-creator>` component.

### Task 6: Implement Smart Category Display

**Goal:** Make the app feel more intelligent by showing relevant categories at the right time.

-   [ ] **Update `js/components/phrase-carousel.js`:**
    -   [ ] In the `loadCategories()` method, add logic to filter the categories based on the current date and the selected profile's birthday.
    -   [ ] **Birthday Logic:** Only show the "Birthday" category if the `daysUntilBirthday()` for the selected profile is less than 30.
    -   [ ] **Holiday Logic:** This can be extended to show the "Christmas" category only in December, for example.

-   [ ] **Update `js/components/messages-tab.js`:**
    -   [ ] Apply the same filtering logic to the messages tab in the settings panel.

### Task 7: Add Usage Tracking in Settings

**Goal:** Provide users with insights into their app usage.

-   [ ] **Extend `DatabaseService.js`:**
    -   [ ] Add a new table to the Dexie database to store usage stats (e.g., `messageCopyHistory`).
    -   [ ] Create methods to log a copy event and to retrieve the most copied messages.

-   [ ] **Update `js/components/phrase-carousel.js`:**
    -   [ ] In the `copyPhraseToClipboard` method, after a message is copied, call the new DatabaseService method to log the event.

-   [ ] **Update `user-settings-panel.js`:**
    -   [ ] Add a new section to display the "Most Used Messages".
    -   [ ] Fetch the data using the new DatabaseService method and render it.