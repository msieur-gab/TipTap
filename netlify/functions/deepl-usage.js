// netlify/functions/deepl-usage.js
exports.handler = async function(event, context) {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const { apiKey } = JSON.parse(event.body);
        
        if (!apiKey) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'API key is required' })
            };
        }

        // Determine API endpoint based on key type
        const isFreeKey = apiKey.endsWith(':fx');
        const baseUrl = isFreeKey 
            ? 'https://api-free.deepl.com' 
            : 'https://api.deepl.com';
        
        console.log(`Using ${isFreeKey ? 'free' : 'pro'} API: ${baseUrl}/v2/usage`);

        const response = await fetch(`${baseUrl}/v2/usage`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            // Empty body for usage endpoint
            body: ''
        });

        console.log(`DeepL response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepL API Error:', errorText);
            
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: `DeepL API error: ${response.status} ${response.statusText}`,
                    details: errorText
                })
            };
        }

        const data = await response.json();
        console.log('DeepL usage data:', data);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                character_count: data.character_count,
                character_limit: data.character_limit
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};