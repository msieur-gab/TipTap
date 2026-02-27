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

### ~~Task 2: Extend DeepL Service for Quota~~ (Done)

Implemented in `netlify/functions/deepl-usage.js` and `js/services/deepl.js`. Usage displayed in `settings-tab.js`.

---

## Phase 2: Building New User-Facing Features

This phase focuses on creating the new settings panel and improving user feedback mechanisms.

### ~~Task 3: Create Core User Settings Panel~~ (Done)

Implemented as `settings-panel.js` with tabs: `profiles-tab.js`, `messages-tab.js`, `settings-tab.js`.

### ~~Task 4: Create a Reusable Toast Component~~ (Done)

Implemented as `<app-toast>`. Triggered via `eventBus.emit(EVENTS.TOAST, { message })`.


---

## Phase 3: Refactoring and Feature Enhancement

This phase is about improving the codebase and adding "smart" features that enhance the user experience.

### ~~Task 5: Refactor the Floating Action Button~~ (Done)

FAB has been removed. Message creation now handled by `<message-manager>` inside `<app-modal>`. See `messages-tab.js` and `message-manager.js`.

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