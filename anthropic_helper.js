const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyzes transcribed caller message using Claude AI
 * @param {string} transcribedText - The transcribed speech from the caller
 * @returns {Promise<Object>} - Object with category and summary
 */
const analyzeCallerMessage = async (transcribedText) => {
  try {
    // Construct the prompt for Claude
    const prompt = `Analyze the following caller's message: '${transcribedText}' Classify the message's intent into one of the following categories: [Sales, Support, Personal, Urgent, Spam]. Provide a concise, one-sentence summary of the request. Respond ONLY with a valid JSON object in the format: { "category": "...", "summary": "..." }`;

    // Send request to Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract the response content
    const responseContent = response.content[0].text.trim();
    
    // Parse the JSON response
    const analysis = JSON.parse(responseContent);
    
    // Validate the response structure
    if (!analysis.category || !analysis.summary) {
      throw new Error('Invalid response format from Claude');
    }
    
    // Validate category is one of the expected values
    const validCategories = ['Sales', 'Support', 'Personal', 'Urgent', 'Spam'];
    if (!validCategories.includes(analysis.category)) {
      console.warn(`Unexpected category: ${analysis.category}, defaulting to 'Support'`);
      analysis.category = 'Support';
    }
    
    console.log('Claude analysis:', analysis);
    return analysis;
    
  } catch (error) {
    console.error('Error analyzing caller message:', error);
    
    // Return default response on error
    return {
      category: 'Support',
      summary: 'Unable to analyze caller message - defaulting to support'
    };
  }
};

module.exports = {
  analyzeCallerMessage
};