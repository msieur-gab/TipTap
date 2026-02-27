import { eventBus, EVENTS } from '../utils/events.js';
import { getZonedTime, formatTime, daysUntilBirthday } from '../utils/time.js';
import { i18n } from '../services/i18n.js'; 

class AppHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.timeInterval = null;
        this.profileTimeInterval = null;
        this.selectedProfile = null; // Store the currently selected profile
        this.boundUpdateContent = this.updateContent.bind(this);
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
        
        i18n.addListener(this.boundUpdateContent); // Listen for language changes

        this.updateTime = this.updateTime.bind(this);
        this.updateTime();
        this.timeInterval = setInterval(this.updateTime, 1000);
        
        this.boundUpdateProfileCards = (data) => {
            this.selectedProfile = data.profile;
            this.updateProfileCards(this.selectedProfile);
        };
        eventBus.on(EVENTS.PROFILE_SELECTED, this.boundUpdateProfileCards);
    }

    disconnectedCallback() {
        clearInterval(this.timeInterval);
        clearInterval(this.profileTimeInterval);
        eventBus.off(EVENTS.PROFILE_SELECTED, this.boundUpdateProfileCards);
        i18n.removeListener(this.boundUpdateContent); // Clean up listener
    }

    updateTime() {
        const timeEl = this.shadowRoot.getElementById('time-card-content');
        if (timeEl) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            timeEl.textContent = timeString;
        }
    }

    updateContent() {
        // This function is called when the language changes
        const titleEl = this.shadowRoot.querySelector('.title');
        if (titleEl) {
            titleEl.textContent = i18n.t('app.title');
        }
        // Re-run updateProfileCards to update translated strings
        if (this.selectedProfile) {
            this.updateProfileCards(this.selectedProfile);
        }
    }

    /**
     * Updates the profile-specific cards with time and birthday info.
     * @param {object} profile - The selected profile object.
     */
    updateProfileCards(profile) {
        const profileTimeCard = this.shadowRoot.getElementById('profile-time-card');
        const birthdayCard = this.shadowRoot.getElementById('birthday-card');

        // Clear any existing interval
        clearInterval(this.profileTimeInterval);

        if (profile && profile.timezone) {
            const update = () => {
                const zonedTime = getZonedTime(profile.timezone);
                const timeString = formatTime(zonedTime, profile.timezone);
                profileTimeCard.querySelector('.card-content').textContent = timeString;
                profileTimeCard.querySelector('.card-title').textContent = i18n.t('time.profileTime', { name: profile.originalName });
            };
            update(); // Update immediately
            this.profileTimeInterval = setInterval(update, 1000); // Then update every second
            profileTimeCard.style.display = 'flex';
        } else {
            profileTimeCard.style.display = 'none';
        }

        if (profile && profile.birthdate) {
            const days = daysUntilBirthday(profile.birthdate);
            const birthdayContent = birthdayCard.querySelector('.card-content');
            
            
            birthdayCard.querySelector('.card-title').textContent = i18n.t('time.birthday', { name: profile.originalName });
        
            if (days === 0) {
                birthdayContent.textContent = i18n.t('time.today');
           } else if (days === 1) {
               birthdayContent.textContent = i18n.t('time.tomorrow');
          } else if (days > 0) {
               birthdayContent.textContent = i18n.t('time.inXDays', { days });
            } else {
                birthdayContent.textContent = '🎉';
            }
            birthdayCard.style.display = 'flex';
        } else {
            birthdayCard.style.display = 'none';
        }
    }

    setupEvents() {
        const settings = this.shadowRoot.querySelector('.settings');
        if (settings) {
            settings.addEventListener('click', () => {
                eventBus.emit(EVENTS.SETTINGS_TOGGLE);
            });
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: var(--container-color);
                    padding: 1rem;
                    
                }
                .top-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1rem;
                }
                .title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--color-text-dark);
                }
                .settings {
                    background: none; border: none; cursor: pointer;
                    padding: 8px; border-radius: 50%;
                    transition: background-color 0.2s;
                }
                .settings:hover { background-color: #f0f0f0; }
                .settings svg { width: 24px; height: 24px; color: #555; }

                .carousel-container {
                    display: flex;
                    overflow-x: auto;
                    scroll-snap-type: x mandatory;
                    gap: 1rem;
                    padding-top: 2rem;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .carousel-container::-webkit-scrollbar {
                    display: none;
                }
                .card {
                    flex: 0 0 calc(50% - 0.5rem);
                    scroll-snap-align: start;
                    box-sizing: border-box;
                    background: #1f2937;
                    color: #ffffff;
                    border-radius: 12px;
                    height: 120px; /* Reset height */
                    display: flex;
                    flex-direction: column;
                    position: relative; /* Make card a positioning context */
                    overflow: visible; /* Hide parts of SVG that are too far out */
                }

                /* === MODIFIED STYLES FOR ILLUSTRATED CARDS === */
                .card.card--illustrated {
                    justify-content: end;
                    padding: 1rem;
                }
                .card-illustration {
                    position: absolute;
                    top: -30px;   /* Changed from 'bottom' to 'top' */
                    left: 15px;  /* Adjusted positioning */
                    width: 80px;
                    height: 80px;
                    z-index: 10;
                    /* opacity: 0.9;  A subtle opacity */
                }
                    card-illustration svg,
                .card-illustration img {
                    width: 100%;
                    height: 100%;
                }

                .card-text-container {
                    position: relative;
                    z-index: 1;
                    text-align: right;
                    /* padding-left: 50px;  Add padding to avoid text overlapping the illustration */
                }
                 /* === END MODIFIED STYLES === */
                .card-title {
                    width: 100%;          /* Allows the title to take full width */
                    text-align: left;     /* Aligns the title text to the left */

                    font-size: 0.875rem;
                    font-weight: 500;
                    color:rgb(182, 182, 182);
                    margin-bottom: 0.5rem; /* Add space below title */
                }
                .card-content {
                    flex: 1; /* Allow content to fill space */
                    font-size: 1.25rem;
                    font-weight: 700;
                    text-align: right;
                    display: flex;
                    align-items: flex-end;
                    justify-content: flex-end;
                }
                #time-card-content {
                    font-family: "SF Mono", "Consolas", "Menlo", monospace;
                }

                /* --- Styles for Vertical Bar Graph --- */
                .graph-container {
                    flex: 1;
                    display: flex;
                    align-items: flex-end; /* Makes bars grow from the bottom */
                    justify-content: space-between;
                    gap: 5px;
                }
                .bar {
                    background-color:rgb(255, 255, 255); /* Indigo color for contrast */
                    width: 4%;
                    border-radius: 4px;
                    animation: grow 1s ease-out;
                }

                /* --- Styles for Horizontal Bar Graph --- */
                .h-graph-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 6px;
                }
                .h-bar-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .h-bar-label {
                    font-size: 0.75rem;
                    color:rgb(255, 255, 255);
                    width: 50px; /* Fixed width for labels */
                    text-align: right;
                }
                .h-bar-wrapper {
                    flex: 1;
                    background-color: rgba(255, 255, 255, 0.5);
                    border-radius: 4px;
                    height: 6px;
                }
                .h-bar {
                    background-color: #fff; /* Green color for contrast */
                    height: 100%;
                    border-radius: 4px;
                    animation: slide 1s ease-out;
                }
                
                /* --- Animations for Graphs --- */
                @keyframes grow {
                    from { height: 0%; }
                }
                @keyframes slide {
                    from { width: 0%; }
                }

            </style>
            
            <div class="top-bar">
                <h2 class="title">${i18n.t('app.title')}</h2>
                <button class="settings">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>
            </div>

            <div class="carousel-container">
                <!-- <div class="card">
                    <span class="card-title">Current Time</span>
                    <div class="card-content">
                        <span id="time-card-content">--:--</span>
                    </div>
                </div> -->

                <div class="card card--illustrated" id="profile-time-card" style="display: none;">
                    <div class="card-illustration">
                         <img src="./data/time.svg" alt="Timezone illustration">

                    </div>
                    <div class="card-text-container">
                        <span class="card-title">${i18n.t('time.profileTime', { name: '' })}</span>
                        <div class="card-content">--:--</div>
                    </div>
                </div>

                <div class="card card--illustrated" id="birthday-card" style="display: none;">
                    <div class="card-illustration">
                        <img src="./data/gift.svg" alt="Birthday illustration">

                    </div>
                    <div class="card-text-container">
                        <span class="card-title">${i18n.t('time.birthday', { name: '' })}</span>
                        <div class="card-content">...</div>
                    </div>
                </div>

               <!--  <div class="card">
                    <span class="card-title">Past 7 Days</span>
                    <div class="graph-container">
                        <div class="bar" style="height: 60%;"></div>
                        <div class="bar" style="height: 80%;"></div>
                        <div class="bar" style="height: 40%;"></div>
                        <div class="bar" style="height: 50%;"></div>
                        <div class="bar" style="height: 90%;"></div>
                        <div class="bar" style="height: 70%;"></div>
                        <div class="bar" style="height: 100%;"></div>
                    </div>
                </div> -->

                <!-- <div class="card">
                    <span class="card-title">Most used category</span>
                    <div class="h-graph-container">
                        <div class="h-bar-group">
                            <span class="h-bar-label">Greetings</span>
                            <div class="h-bar-wrapper"><div class="h-bar" style="width: 90%;"></div></div>
                        </div>
                        <div class="h-bar-group">
                            <span class="h-bar-label">Affection</span>
                            <div class="h-bar-wrapper"><div class="h-bar" style="width: 60%;"></div></div>
                        </div>
                        <div class="h-bar-group">
                            <span class="h-bar-label">School</span>
                            <div class="h-bar-wrapper"><div class="h-bar" style="width: 45%;"></div></div>
                        </div>
                    </div>
                </div> -->
            </div>
        `;
    }
}
customElements.define('app-header', AppHeader);