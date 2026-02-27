// js/utils/time.js

// Access Luxon's classes from the global window object
const DateTime = window.luxon.DateTime;

/**
 * Gets the current time in a specific timezone.
 * @param {string} timeZone - The IANA timezone (e.g., 'Europe/Berlin').
 * @returns {object} A Luxon DateTime object.
 */
export function getZonedTime(timeZone) {
    return DateTime.local().setZone(timeZone);
}

/**
 * Formats a Luxon DateTime object into a readable time string.
 * @param {object} luxonDateTime - The Luxon DateTime object to format.
 * @returns {string} The formatted time string (e.g., "10:30 PM").
 */
export function formatTime(luxonDateTime) {
    // return luxonDateTime.toFormat('h:mm a');
    return luxonDateTime.toFormat('HH:mm');
}

/**
 * Calculates the number of days until the next birthday.
 * @param {string} birthDateStr - The birth date in 'YYYY-MM-DD' format.
 * @returns {number} The number of days until the next birthday.
 */
export function daysUntilBirthday(birthDateStr) {
    if (!birthDateStr) return -1;

    const now = DateTime.local().startOf('day');
    let nextBirthday = DateTime.fromISO(birthDateStr).set({ year: now.year });

    // If the birthday has already passed this year, set it to next year
    if (now > nextBirthday) {
        nextBirthday = nextBirthday.plus({ years: 1 });
    }
    
    // Calculate the difference and return the whole number of days
    const diff = nextBirthday.diff(now, 'days').toObject();
    return Math.floor(diff.days);
}