// netlify/functions/translate.js
exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { text, target_lang, source_lang, apiKey, tag_handling, ignore_tags } = JSON.parse(event.body);

        if (!apiKey) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'API key is missing.' }) };
        }

        const isFreeKey = apiKey.endsWith(':fx');
        const baseUrl = isFreeKey
            ? 'https://api-free.deepl.com'
            : 'https://api.deepl.com';

        const response = await fetch(`${baseUrl}/v2/translate`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text],
                target_lang: target_lang,
                source_lang: source_lang,
                tag_handling: tag_handling,
                ignore_tags: ignore_tags ? [ignore_tags] : undefined
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error: errorData.message || 'DeepL API error' }),
            };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data),
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};