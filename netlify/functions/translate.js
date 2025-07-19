exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { text, target_lang, source_lang } = JSON.parse(event.body);
        const apiKey = process.env.DEEPL_API_KEY; // Securely access your API key

        if (!apiKey) {
            throw new Error('API key is not configured.');
        }
        
        // Use the free API endpoint
        const apiEndpoint = 'https://api-free.deepl.com/v2/translate';

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
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