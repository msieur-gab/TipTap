// js/services/timezoneService.js

// A simple service to fetch and cache our timezone data.

// Cache the data so we don't fetch it every time the edit button is clicked.
let timezoneCache = null;

export const TimezoneService = {
    async getTimezones() {
        if (timezoneCache) {
            return timezoneCache;
        }

        try {
            // Assumes your timezones.json is in a /data/ directory
            const response = await fetch('./data/timezones.json');
            if (!response.ok) {
                throw new Error('Failed to load timezone data.');
            }
            const data = await response.json();
            timezoneCache = data;
            return data;
        } catch (error) {
            console.error(error);
            // Return an empty array on failure
            return [];
        }
    }
};