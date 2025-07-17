// Generate unique IDs
export function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Create DOM elements with attributes
export function createElement(tag, attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else {
            element.setAttribute(key, value);
        }
    });
    if (textContent) {
        element.textContent = textContent;
    }
    return element;
}

// Generic template replacement
export function replaceTemplate(template, replacements) {
    return template.replace(/{(\w+)}/g, (match, key) => {
        const replacement = replacements[key];
        
        // If replacement is empty, remove the placeholder and any preceding comma/space
        if (!replacement || replacement.trim() === '') {
            // Look for patterns like ", {nom}" or " {nom}" and remove them completely
            const pattern = new RegExp(`[,\\s]*\\s*\\{${key}\\}`, 'g');
            return template.includes(pattern.source.replace(/\\\\/g, '\\')) ? '' : match;
        }
        
        return replacement;
    });
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