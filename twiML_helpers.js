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
    voice: 'Polly.Matthew-Neural',
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
  
  // Natural human-like message with best voice
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'Hello. What can I help you with today?');
  
  // Gather speech input 
  response.gather({
    input: 'speech',
    speechTimeout: 'auto',
    timeout: 10,
    action: '/handle-gather',
    method: 'POST'
  });
  
  // Fallback if no speech detected
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'Sorry, I did not hear you. Please try calling back.');
  
  // Add a pause before hanging up
  response.pause({ length: 2 });
  response.hangup();
  
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
    voice: 'Polly.Matthew-Neural',
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
  
  // Single voicemail message
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'Please leave a message after the tone. Press pound when finished.');
  
  // Record the message with explicit settings
  response.record({
    action: '/handle-recording',
    method: 'POST',
    maxLength: 60,
    finishOnKey: '#',
    playBeep: true,
    trim: 'trim-silence'
  });
  
  // Fallback if recording fails
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'Thank you for calling.');
  
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
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'Sorry, I cannot take your call right now. Please try again later. Goodbye.');
  
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
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'Thank you for your message. I will get back to you soon. Goodbye.');
  
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