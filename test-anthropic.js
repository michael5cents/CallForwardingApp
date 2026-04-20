const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

async function testAnthropic() {
    console.log('Testing Anthropic API connectivity...');

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ ANTHROPIC_API_KEY is not set in .env file');
        process.exit(1);
    }

    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        console.log('Sending test request to Claude 3 Haiku...');
        const startTime = Date.now();
        const response = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Ping' }]
        });
        const duration = Date.now() - startTime;

        console.log('✅ Anthropic API is WORKING');
        console.log(`⏱️  Response time: ${duration}ms`);
        console.log(`🤖 Response: ${response.content[0].text.trim()}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Anthropic API Error:');
        if (error.status === 401) {
            console.error('Invalid API Key');
        } else if (error.status === 429) {
            console.error('Rate limit exceeded or out of credits');
        } else if (error.status === 400) {
            console.error('Bad Request (check credentials/credits)');
        }
        console.error(`Status: ${error.status}`);
        console.error(`Message: ${error.message}`);
        process.exit(1);
    }
}

testAnthropic();
