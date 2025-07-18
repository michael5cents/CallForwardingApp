const twilio = require('twilio');

/**
 * Generates TwiML response for direct call forwarding to personal number
 * @param {string} contactName - Name of the contact (if known)
 * @param {string} personalNumber - Personal number to forward to
 * @returns {string} - TwiML response as string
 */
const generateDirectForwardingTwiML = (contactName, personalNumber) => {
  const response = new twilio.twiml.VoiceResponse();
  
  // Add whisper message before connecting
  const whisperMessage = contactName 
    ? `Direct call from ${contactName}` 
    : 'Direct call from whitelisted contact';
  
  response.say({
    voice: 'alice',
    language: 'en-US'
  }, whisperMessage);
  
  // Forward the call
  response.dial(personalNumber);
  
  return response.toString();
};

/**
 * Generates TwiML response for AI gatekeeper initial greeting
 * @returns {string} - TwiML response as string
 */
const generateAIGreetingTwiML = () => {
  const response = new twilio.twiml.VoiceResponse();
  
  // Greeting with personality
  response.say({
    voice: 'alice',
    language: 'en-US'
  }, 'Hello, you have reached the virtual assistant. Please state the purpose of your call after the tone.');
  
  // Gather speech input
  response.gather({
    input: 'speech',
    speechTimeout: 'auto',
    action: '/handle-gather',
    method: 'POST'
  });
  
  // Fallback if no speech detected
  response.say({
    voice: 'alice',
    language: 'en-US'
  }, 'I did not hear anything. Please try calling again.');
  
  return response.toString();
};

/**
 * Generates TwiML response for screened call forwarding
 * @param {string} summary - AI-generated summary of the call purpose
 * @param {string} personalNumber - Personal number to forward to
 * @returns {string} - TwiML response as string
 */
const generateScreenedForwardingTwiML = (summary, personalNumber) => {
  const response = new twilio.twiml.VoiceResponse();
  
  // Whisper with AI analysis
  response.say({
    voice: 'alice',
    language: 'en-US'
  }, `Screened call about: ${summary}`);
  
  // Forward the call
  response.dial(personalNumber);
  
  return response.toString();
};

/**
 * Generates TwiML response for voicemail recording
 * @returns {string} - TwiML response as string
 */
const generateVoicemailTwiML = () => {
  const response = new twilio.twiml.VoiceResponse();
  
  // Voicemail message
  response.say({
    voice: 'alice',
    language: 'en-US'
  }, 'Please leave a detailed message after the tone and I will get back to you shortly.');
  
  // Record the message
  response.record({
    action: '/handle-recording',
    method: 'POST',
    maxLength: 60,
    finishOnKey: '#'
  });
  
  return response.toString();
};

/**
 * Generates TwiML response for call rejection
 * @returns {string} - TwiML response as string
 */
const generateRejectionTwiML = () => {
  const response = new twilio.twiml.VoiceResponse();
  
  // Polite rejection message
  response.say({
    voice: 'alice',
    language: 'en-US'
  }, 'Thank you for calling. Unfortunately, I am unable to take your call at this time. Please try contacting through alternative means. Goodbye.');
  
  // Hang up
  response.hangup();
  
  return response.toString();
};

/**
 * Generates TwiML response for recording completion
 * @returns {string} - TwiML response as string
 */
const generateRecordingCompleteTwiML = () => {
  const response = new twilio.twiml.VoiceResponse();
  
  response.say({
    voice: 'alice',
    language: 'en-US'
  }, 'Thank you for your message. I will review it and get back to you soon. Goodbye.');
  
  response.hangup();
  
  return response.toString();
};

module.exports = {
  generateDirectForwardingTwiML,
  generateAIGreetingTwiML,
  generateScreenedForwardingTwiML,
  generateVoicemailTwiML,
  generateRejectionTwiML,
  generateRecordingCompleteTwiML
};