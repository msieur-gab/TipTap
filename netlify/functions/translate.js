exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // **FIX:** Read the apiKey from the request body sent by the client
        const { text, target_lang, source_lang, apiKey } = JSON.parse(event.body);

        // Check if the user-provided API key is present
        if (!apiKey) {
            return { statusCode: 400, body: JSON.stringify({ error: 'API key is missing.' }) };
        }
        
        const apiEndpoint = 'https://api-free.deepl.com/v2/translate';

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                // Use the user's API key for authorization
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text],
                target_lang: target_lang,
                source_lang: source_lang,
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