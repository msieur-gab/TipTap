// netlify/functions/translate.js
exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // FIX: Destructure the new parameters from the request body
        const { text, target_lang, source_lang, apiKey, tag_handling, ignore_tags } = JSON.parse(event.body);

        if (!apiKey) {
            return { statusCode: 400, body: JSON.stringify({ error: 'API key is missing.' }) };
        }
        
        const apiEndpoint = 'https://api-free.deepl.com/v2/translate';

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text], // DeepL API expects an array of strings
                target_lang: target_lang,
                source_lang: source_lang,
                tag_handling: tag_handling, // Pass the tag handling option
                ignore_tags: ignore_tags ? [ignore_tags] : undefined // Pass the tags to ignore
            }),
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