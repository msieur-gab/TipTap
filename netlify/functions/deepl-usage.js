exports.handler = async function(event) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { apiKey } = JSON.parse(event.body);

        if (!apiKey) {
            return { statusCode: 400, body: JSON.stringify({ error: 'API key is missing.' }) };
        }
        
        // Use the API endpoint for usage, which is different from the translation endpoint.
        const apiEndpoint = 'https://api-free.deepl.com/v2/usage';

        const response = await fetch(apiEndpoint, {
            method: 'POST', // The usage endpoint also uses POST
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