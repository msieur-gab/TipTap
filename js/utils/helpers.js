// Generate unique IDs
export function generateId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}

// Language-neutral name template replacement
export function replaceNameTemplate(template, replacements) {
    let result = template;
    
    Object.entries(replacements).forEach(([key, value]) => {
        if (!value || value.trim() === '') {
            // Remove the placeholder and any preceding comma/punctuation with optional spaces
            // Handles both Western (,) and Chinese (，) commas automatically
            const commaPattern = new RegExp(`\\s*[,，]\\s*\\{${key}\\}`, 'g');
            const spacePattern = new RegExp(`\\s+\\{${key}\\}`, 'g');
            const plainPattern = new RegExp(`\\{${key}\\}`, 'g');
            
            result = result.replace(commaPattern, '');
            result = result.replace(spacePattern, '');
            result = result.replace(plainPattern, '');
        } else {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
    });
    
    // Clean up any double spaces or trailing/leading spaces
    return result.replace(/\s+/g, ' ').trim();
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}