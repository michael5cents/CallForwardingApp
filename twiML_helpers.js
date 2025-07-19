const twilio = require('twilio');

/**
 * Generates TwiML response for direct call forwarding to personal number
 * @param {string} contactName - Name of the contact (if known)
 * @param {string} personalNumber - Personal number to forward to
 * @returns {string} - TwiML response as string
 */
const generateDirectForwardingTwiML = (contactName, personalNumber) => {
  const response = new twilio.twiml.VoiceResponse();
  
  // For cell phone forwarding, we need to dial directly with proper settings
  const dial = response.dial({
    action: '/handle-dial-status',
    method: 'POST',
    timeout: 30,
    callerId: '+18442360680' // Use your Twilio number as caller ID
  });
  
  // Add your personal number with screen-before-answer
  dial.number({
    statusCallbackEvent: 'initiated ringing answered completed',
    statusCallback: '/handle-dial-events',
    statusCallbackMethod: 'POST'
  }, personalNumber);
  
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
  
  // Create dial element with proper whisper configuration
  const dial = response.dial({
    action: '/handle-dial-status',
    method: 'POST'
  });
  
  // Add the personal number with whisper URL that includes the AI summary
  const whisperUrl = `/generate-screened-whisper?summary=${encodeURIComponent(summary)}`;
  
  dial.number({
    url: whisperUrl,
    method: 'POST'
  }, personalNumber);
  
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

/**
 * Generates whisper TwiML for call recipient (you)
 * @param {string} contactName - Name of the contact calling
 * @returns {string} - TwiML response as string
 */
const generateWhisperTwiML = (contactName) => {
  const response = new twilio.twiml.VoiceResponse();
  
  const whisperMessage = contactName 
    ? `Call from whitelisted contact ${contactName}. Press any key to accept.`
    : 'Call from whitelisted contact. Press any key to accept.';
  
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, whisperMessage);
  
  // Gather key press to accept call
  response.gather({
    input: 'dtmf',
    numDigits: 1,
    timeout: 10,
    action: '/handle-call-acceptance',
    method: 'POST'
  });
  
  // If no key pressed, hang up
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'Call not accepted. Hanging up.');
  
  response.hangup();
  
  return response.toString();
};

/**
 * Generates whisper TwiML for screened call recipient (you)
 * @param {string} summary - AI-generated summary of the call purpose
 * @returns {string} - TwiML response as string
 */
const generateScreenedWhisperTwiML = (summary) => {
  const response = new twilio.twiml.VoiceResponse();
  
  const whisperMessage = summary 
    ? `Screened call about: ${summary}. Press any key to accept.`
    : 'Screened call. Press any key to accept.';
  
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, whisperMessage);
  
  // Gather key press to accept call
  response.gather({
    input: 'dtmf',
    numDigits: 1,
    timeout: 15,
    action: '/handle-call-acceptance',
    method: 'POST'
  });
  
  // If no key pressed, hang up
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'Call not accepted. Hanging up.');
  
  response.hangup();
  
  return response.toString();
};

/**
 * Generates TwiML for call acceptance
 * @returns {string} - TwiML response as string
 */
const generateCallAcceptanceTwiML = () => {
  const response = new twilio.twiml.VoiceResponse();
  
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'Call accepted. Connecting now.');
  
  // Return empty response to continue the call
  return response.toString();
};

/**
 * Generates TwiML for dial completion status
 * @returns {string} - TwiML response as string
 */
const generateDialStatusTwiML = () => {
  const response = new twilio.twiml.VoiceResponse();
  
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'The call could not be completed. Please try again later.');
  
  response.hangup();
  
  return response.toString();
};

/**
 * Generates TCPA-compliant TwiML response for blacklisted callers
 * @returns {string} - TwiML response as string
 */
const generateTCPAComplianceTwiML = () => {
  const response = new twilio.twiml.VoiceResponse();
  
  // Professional TCPA compliance message
  const complianceMessage = 'This number is on the Do Not Call Registry. Under federal law, you are required to remove this number from your calling list immediately. Press 1 to be transferred to our Do Not Call removal line, or hang up to end this call. Continued calls to this number may result in legal action under the Telephone Consumer Protection Act.';
  
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, complianceMessage);
  
  // Gather response for removal line transfer
  response.gather({
    input: 'dtmf',
    numDigits: 1,
    timeout: 15,
    action: '/handle-tcpa-response',
    method: 'POST'
  });
  
  // If no response, repeat message once and hang up
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'No response received. This call is being terminated. Remove this number from your calling list immediately.');
  
  response.hangup();
  
  return response.toString();
};

/**
 * Generates TwiML for TCPA removal line transfer
 * @returns {string} - TwiML response as string
 */
const generateTCPARemovalTwiML = () => {
  const response = new twilio.twiml.VoiceResponse();
  
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'You have requested to be transferred to our Do Not Call removal line. Please hold while we connect you.');
  
  // You can configure this to transfer to an actual removal line
  // For now, we'll just provide instructions
  response.say({
    voice: 'Polly.Matthew-Neural',
    language: 'en-US'
  }, 'To remove this number from your calling list, please note the following number and remove it immediately: The number you called is protected by federal Do Not Call regulations. Failure to comply may result in fines up to eleven thousand dollars per violation.');
  
  response.hangup();
  
  return response.toString();
};

module.exports = {
  generateDirectForwardingTwiML,
  generateAIGreetingTwiML,
  generateScreenedForwardingTwiML,
  generateVoicemailTwiML,
  generateRejectionTwiML,
  generateRecordingCompleteTwiML,
  generateWhisperTwiML,
  generateScreenedWhisperTwiML,
  generateCallAcceptanceTwiML,
  generateDialStatusTwiML,
  generateTCPAComplianceTwiML,
  generateTCPARemovalTwiML
};