// Global state
let contacts = [];
let callLogs = [];
let blacklistEntries = [];
let socket;

// DOM Elements
const contactForm = document.getElementById('contactForm');
const contactsList = document.getElementById('contactsList');
const callLogsList = document.getElementById('callLogs');
const refreshLogsBtn = document.getElementById('refreshLogs');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');

// Blacklist DOM elements
const blacklistForm = document.getElementById('blacklistForm');
const blacklistEntriesList = document.getElementById('blacklistEntries');
const refreshBlacklistBtn = document.getElementById('refreshBlacklist');

// Live call status elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const statusLight = document.querySelector('.status-light');
const callProgress = document.getElementById('callProgress');

// Status elements
const totalContactsSpan = document.getElementById('totalContacts');
const recentCallsSpan = document.getElementById('recentCalls');
const aiScreeningSpan = document.getElementById('aiScreening');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    loadContacts();
    loadCallLogs();
    loadBlacklist();
    
    // Event listeners
    contactForm.addEventListener('submit', handleAddContact);
    refreshLogsBtn.addEventListener('click', loadCallLogs);
    blacklistForm.addEventListener('submit', handleAddToBlacklist);
    refreshBlacklistBtn.addEventListener('click', loadBlacklist);
    
    // Auto-refresh call logs and blacklist every 30 seconds
    setInterval(() => {
        loadCallLogs();
        loadBlacklist();
    }, 30000);
    
    // PWA Background/Foreground handling
    setupBackgroundHandling();
    
    // Service Worker message listener for enhanced focus
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Message from service worker:', event.data);
            
            if (event.data.type === 'FORCE_FOCUS') {
                console.log('Service worker requesting force focus');
                if (typeof bringPWAToFocus === 'function') {
                    bringPWAToFocus();
                }
            }
        });
    }
});

// Socket.io initialization and event handlers with PWA enhancements
function initializeSocket() {
    // Enhanced Socket.IO configuration for mobile PWA
    socket = io({
        transports: ['websocket', 'polling'], // Fallback to polling for mobile
        upgrade: true,
        rememberUpgrade: true,
        forceNew: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 10,
        timeout: 20000,
        autoConnect: true,
        pingTimeout: 60000,
        pingInterval: 25000
    });
    
    socket.on('connect', () => {
        console.log('Connected to server');
        updateSystemStatus('Connected', 'ready');
        
        // Request missed updates when reconnecting
        socket.emit('request-sync', {
            timestamp: localStorage.getItem('last-sync') || 0
        });
        
        // Update last connection time
        localStorage.setItem('last-connection', Date.now());
    });
    
    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        updateSystemStatus('Disconnected', 'error');
        
        // Try to maintain connection for PWA
        if (reason === 'io server disconnect') {
            // Server disconnected, try manual reconnect
            setTimeout(() => {
                socket.connect();
            }, 1000);
        }
    });
    
    socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts');
        updateSystemStatus('Reconnected', 'ready');
        showToast('Connection restored!', 'success');
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt', attemptNumber);
        updateSystemStatus(`Reconnecting... (${attemptNumber})`, 'connecting');
    });
    
    socket.on('reconnect_error', (error) => {
        console.error('Reconnection failed:', error);
        updateSystemStatus('Reconnection failed', 'error');
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateSystemStatus('Connection error', 'error');
        
        // Fallback to HTTP polling if WebSocket fails
        if (socket.io.engine && socket.io.engine.transport.name === 'websocket') {
            console.log('Falling back to HTTP polling');
            socket.io.opts.transports = ['polling'];
        }
    });
    
    // Real-time call events with enhanced notifications
    socket.on('call-incoming', (data) => {
        console.log('🔔 INCOMING CALL:', data);
        updateSystemStatus(`Incoming call from ${formatPhoneNumber(data.from)}`, 'incoming');
        showCallProgress(data);
        addCallStep('📞 Call received', `From: ${formatPhoneNumber(data.from)}`, 'active');
        
        // Show browser notification
        showBrowserNotification('Incoming Call', `Call from ${formatPhoneNumber(data.from)}`, 'call');
        
        // Vibrate if supported (Samsung Z Fold 3)
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
    });
    
    socket.on('call-whitelisted', (data) => {
        updateSystemStatus(`Whitelisted: ${data.contactName}`, 'forwarding');
        addCallStep('✅ Contact recognized', `${data.contactName} is whitelisted`, 'complete');
        addCallStep('📞 Forwarding call', 'Ringing your phone with whisper message', 'active');
        addCallStep('🔔 Awaiting acceptance', 'Press any key on your phone to accept', 'active');
    });
    
    socket.on('call-screening', (data) => {
        console.log('🤖 AI SCREENING:', data);
        updateSystemStatus('AI Screening in progress...', 'screening');
        addCallStep('🤖 AI Gatekeeper engaged', 'Asking caller to state purpose', 'complete');
        addCallStep('🎤 Waiting for response', 'Listening for caller input...', 'active');
        
        // Show notification for screening
        showBrowserNotification('Call Screening', `AI screening call from ${formatPhoneNumber(data.from)}`, 'screening');
    });
    
    socket.on('call-speech-received', (data) => {
        updateSystemStatus('Processing speech...', 'analyzing');
        addCallStep('🎤 Speech received', `"${data.speech}"`, 'complete');
        addCallStep('🧠 AI Analysis', 'Claude is analyzing the request...', 'active');
    });
    
    socket.on('ai-analysis-start', (data) => {
        updateSystemStatus('AI analyzing request...', 'analyzing');
    });
    
    socket.on('ai-analysis-complete', (data) => {
        updateSystemStatus(`Analysis complete: ${data.category}`, 'analyzing');
        addCallStep('🧠 AI Analysis complete', '', 'complete');
        
        // Add AI analysis details
        const analysisDiv = document.createElement('div');
        analysisDiv.className = 'ai-analysis';
        analysisDiv.innerHTML = `
            <strong>Category:</strong> ${data.category}<br>
            <strong>Summary:</strong> ${data.summary}
        `;
        
        const lastStep = callProgress.querySelector('.call-step:last-child');
        if (lastStep) {
            lastStep.appendChild(analysisDiv);
        }
    });
    
    socket.on('call-forwarding', (data) => {
        updateSystemStatus(`Forwarding ${data.category} call`, 'forwarding');
        addCallStep('📞 Forwarding call', 'Ringing your phone with AI summary', 'active');
        addCallStep('🔔 Awaiting acceptance', 'Press any key on your phone to accept', 'active');
    });
    
    socket.on('call-voicemail', (data) => {
        updateSystemStatus('Sending to voicemail', 'voicemail');
        addCallStep('📧 Voicemail', 'Recording message for later review', 'active');
        setTimeout(() => clearCallProgress(), 10000);
    });
    
    socket.on('call-rejected', (data) => {
        updateSystemStatus('Call rejected', 'rejected');
        addCallStep('❌ Call rejected', `${data.category} call blocked`, 'complete');
        setTimeout(() => clearCallProgress(), 5000);
    });
    
    socket.on('call-recording-complete', (data) => {
        updateSystemStatus('Recording complete', 'ready');
        addCallStep('📧 Recording saved', 'Voicemail recorded successfully', 'complete');
        setTimeout(() => clearCallProgress(), 3000);
        
        // Refresh call logs to show new entry
        setTimeout(() => loadCallLogs(), 1000);
    });
    
    socket.on('call-no-speech', (data) => {
        updateSystemStatus('No speech detected', 'rejected');
        addCallStep('❌ No response', 'Call ended - no speech detected', 'complete');
        setTimeout(() => clearCallProgress(), 5000);
    });
    
    socket.on('call-error', (data) => {
        updateSystemStatus('Call error occurred', 'error');
        addCallStep('⚠️ Error', data.error, 'complete');
        setTimeout(() => clearCallProgress(), 5000);
    });
    
    // New events for call acceptance workflow
    socket.on('call-accepted', (data) => {
        updateSystemStatus('Call accepted', 'ready');
        addCallStep('✅ Call accepted', 'Call connected successfully', 'complete');
        setTimeout(() => clearCallProgress(), 3000);
    });
    
    socket.on('call-not-accepted', (data) => {
        updateSystemStatus('Call not accepted', 'rejected');
        addCallStep('❌ Call declined', 'Recipient did not accept the call', 'complete');
        setTimeout(() => clearCallProgress(), 5000);
    });
    
    socket.on('dial-completed', (data) => {
        updateSystemStatus(`Call ended (${data.status})`, 'ready');
        const statusMessage = data.duration ? `Duration: ${data.duration} seconds` : 'Call ended';
        addCallStep('📞 Call completed', statusMessage, 'complete');
        setTimeout(() => clearCallProgress(), 5000);
    });
    
    // Contact management events
    socket.on('contact-added', (contact) => {
        contacts.push(contact);
        renderContacts();
        updateStats();
        showToast(`Contact ${contact.name} added!`);
    });
    
    socket.on('contact-deleted', (data) => {
        contacts = contacts.filter(contact => contact.id !== data.id);
        renderContacts();
        updateStats();
        showToast('Contact deleted successfully!');
    });
    
    // Call log management events
    socket.on('call-log-deleted', (data) => {
        callLogs = callLogs.filter(log => log.id !== data.id);
        renderCallLogs();
        updateStats();
        showToast('Call log deleted successfully!');
    });
    
    socket.on('call-logs-cleared', () => {
        callLogs = [];
        renderCallLogs();
        updateStats();
        showToast('All call logs cleared!');
    });
    
    // Blacklist management events
    socket.on('blacklist-added', (entry) => {
        blacklistEntries.push(entry);
        renderBlacklist();
        showToast(`Number ${entry.phone_number} added to blacklist!`);
    });
    
    socket.on('blacklist-removed', (data) => {
        blacklistEntries = blacklistEntries.filter(entry => entry.id !== data.id);
        renderBlacklist();
        showToast('Number removed from blacklist successfully!');
    });
    
    socket.on('blacklist-cleared', () => {
        blacklistEntries = [];
        renderBlacklist();
        showToast('All blacklist entries cleared!');
    });
    
    // Blacklist call events
    socket.on('call-blacklisted', (data) => {
        updateSystemStatus(`Blacklisted caller: ${formatPhoneNumber(data.from)}`, 'rejected');
        addCallStep('🚫 Blacklisted caller', `TCPA compliance message sent - ${data.reason}`, 'complete');
        setTimeout(() => clearCallProgress(), 5000);
    });
    
    socket.on('tcpa-removal-requested', (data) => {
        updateSystemStatus('TCPA removal requested', 'ready');
        addCallStep('📋 Removal requested', 'Caller requested Do Not Call removal', 'complete');
        setTimeout(() => clearCallProgress(), 5000);
    });
    
    socket.on('tcpa-no-response', (data) => {
        updateSystemStatus('TCPA no response', 'rejected');
        addCallStep('❌ No TCPA response', 'Call terminated', 'complete');
        setTimeout(() => clearCallProgress(), 5000);
    });
}

// PWA Background/Foreground handling for Samsung Z Fold 3
function setupBackgroundHandling() {
    let isAppVisible = !document.hidden;
    
    // Page Visibility API - handles when app goes to background
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // App went to background
            console.log('PWA went to background - maintaining connection...');
            isAppVisible = false;
            
            // Store current time for sync when returning
            localStorage.setItem('background-time', Date.now());
            
            // Keep socket alive but reduce activity
            if (socket && socket.connected) {
                socket.emit('app-backgrounded');
            }
        } else {
            // App came back to foreground
            console.log('PWA returned to foreground - refreshing connection...');
            isAppVisible = true;
            
            // Check if we were backgrounded
            const backgroundTime = localStorage.getItem('background-time');
            if (backgroundTime) {
                const backgroundDuration = Date.now() - parseInt(backgroundTime);
                console.log(`App was backgrounded for ${backgroundDuration}ms`);
                
                // If backgrounded for more than 30 seconds, force reconnect
                if (backgroundDuration > 30000 || !socket || !socket.connected) {
                    console.log('Forcing socket reconnection after background period');
                    reconnectSocket();
                } else {
                    // Quick sync for shorter background periods
                    if (socket && socket.connected) {
                        socket.emit('app-foregrounded');
                        refreshAllData();
                    }
                }
                
                localStorage.removeItem('background-time');
            }
        }
    });
    
    // Handle app focus/blur events (secondary detection)
    window.addEventListener('focus', () => {
        if (!isAppVisible) {
            console.log('Window focused - ensuring connection');
            if (!socket || !socket.connected) {
                reconnectSocket();
            } else {
                refreshAllData();
            }
        }
    });
    
    window.addEventListener('blur', () => {
        console.log('Window blurred - preparing for background');
    });
    
    // Connection health check every 60 seconds
    setInterval(() => {
        if (socket && !socket.connected && !document.hidden) {
            console.log('Health check: Socket disconnected, attempting reconnect');
            reconnectSocket();
        }
    }, 60000);
}

// Force socket reconnection
function reconnectSocket() {
    console.log('Forcing socket reconnection...');
    updateSystemStatus('Reconnecting...', 'connecting');
    
    if (socket) {
        socket.disconnect();
    }
    
    // Small delay before reconnecting
    setTimeout(() => {
        initializeSocket();
        
        // Refresh all data after reconnection
        setTimeout(() => {
            refreshAllData();
        }, 1000);
    }, 500);
}

// Refresh all data from server
function refreshAllData() {
    console.log('Refreshing all data after foreground return');
    loadContacts();
    loadCallLogs();
    loadBlacklist();
    updateStats();
}

// Live call status functions
function updateSystemStatus(text, status) {
    statusText.textContent = text;
    statusLight.className = `status-light ${status}`;
}

function showCallProgress(data) {
    callProgress.classList.remove('hidden');
    callProgress.innerHTML = `
        <div class="call-info">Call ID: ${data.callSid}</div>
        <div class="call-details">Started: ${formatTimestamp(data.timestamp)}</div>
        <div id="callSteps"></div>
    `;
}

function addCallStep(title, details, status = '') {
    const callSteps = document.getElementById('callSteps');
    if (!callSteps) return;
    
    // Mark previous steps as complete
    const previousSteps = callSteps.querySelectorAll('.call-step.active');
    previousSteps.forEach(step => {
        step.classList.remove('active');
        step.classList.add('complete');
    });
    
    const stepDiv = document.createElement('div');
    stepDiv.className = `call-step ${status}`;
    stepDiv.innerHTML = `
        <div class="call-info">${title}</div>
        ${details ? `<div class="call-details">${details}</div>` : ''}
    `;
    
    callSteps.appendChild(stepDiv);
    
    // Scroll to latest step
    stepDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearCallProgress() {
    callProgress.classList.add('hidden');
    updateSystemStatus('System Ready', 'ready');
}

// API Functions
async function apiRequest(url, options = {}) {
    showLoading();
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        showToast('API request failed: ' + error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

// Contact Management
async function loadContacts() {
    try {
        contacts = await apiRequest('/api/contacts');
        renderContacts();
        updateStats();
    } catch (error) {
        console.error('Failed to load contacts:', error);
    }
}

async function handleAddContact(e) {
    e.preventDefault();
    
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    
    if (!name || !phone) {
        showToast('Please fill in both name and phone number', 'error');
        return;
    }
    
    try {
        await apiRequest('/api/contacts', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                phone_number: phone
            })
        });
        
        contactForm.reset();
        // Contact will be added via socket event
    } catch (error) {
        if (error.message.includes('409')) {
            showToast('This phone number already exists', 'error');
        } else {
            showToast('Failed to add contact', 'error');
        }
    }
}

async function deleteContact(id) {
    if (!confirm('Are you sure you want to delete this contact?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/contacts/${id}`, {
            method: 'DELETE'
        });
        // Contact will be removed via socket event
    } catch (error) {
        showToast('Failed to delete contact', 'error');
    }
}

function renderContacts() {
    if (contacts.length === 0) {
        contactsList.innerHTML = `
            <div class="empty-state">
                <h3>No contacts yet</h3>
                <p>Add your first contact to enable direct call forwarding</p>
            </div>
        `;
        return;
    }
    
    contactsList.innerHTML = contacts.map(contact => `
        <div class="contact-item">
            <div class="contact-info">
                <h4>${escapeHtml(contact.name)}</h4>
                <p>${formatPhoneNumber(contact.phone_number)}</p>
            </div>
            <button class="btn btn-danger" onclick="deleteContact(${contact.id})">
                Delete
            </button>
        </div>
    `).join('');
}

// Call Logs Management
async function loadCallLogs() {
    try {
        const newLogs = await apiRequest('/api/call-logs');
        
        // Flash update if new logs
        if (newLogs.length > callLogs.length) {
            callLogsList.classList.add('flash-update');
            setTimeout(() => callLogsList.classList.remove('flash-update'), 500);
        }
        
        callLogs = newLogs;
        renderCallLogs();
        updateStats();
    } catch (error) {
        console.error('Failed to load call logs:', error);
    }
}

function renderCallLogs() {
    if (callLogs.length === 0) {
        callLogsList.innerHTML = `
            <div class="empty-state">
                <h3>No call logs yet</h3>
                <p>Call logs will appear here when you receive calls</p>
            </div>
        `;
        return;
    }
    
    callLogsList.innerHTML = callLogs.map((log, index) => `
        <div class="log-item ${log.status.toLowerCase()}" data-log-id="${log.id}">
            <div class="log-header">
                <span class="log-phone">${formatPhoneNumber(log.from_number)}</span>
                <span class="log-status ${log.status.toLowerCase()}">${log.status}</span>
                <span class="log-timestamp">${formatTimestamp(log.timestamp)}</span>
                <button class="btn btn-danger btn-small delete-log-btn" data-log-id="${log.id}" title="Delete this call log">
                    ✕
                </button>
            </div>
            ${log.summary ? `<div class="log-summary">${escapeHtml(log.summary)}</div>` : ''}
            ${log.recording_url ? `
                <div class="log-actions">
                    <button class="btn btn-secondary btn-small play-recording-btn" data-recording-url="${escapeHtml(convertToProxyUrl(log.recording_url))}" title="Play voicemail">
                        🎵 Play Recording
                    </button>
                    <a href="${convertToProxyUrl(log.recording_url)}" target="_blank" class="btn btn-secondary btn-small" title="Open recording in new tab">
                        📁 Open
                    </a>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // Add event listeners for dynamic buttons
    document.querySelectorAll('.delete-log-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const logId = e.target.getAttribute('data-log-id');
            deleteCallLog(logId);
        });
    });
    
    document.querySelectorAll('.play-recording-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const recordingUrl = e.target.getAttribute('data-recording-url');
            playRecording(recordingUrl);
        });
    });
}

// Statistics Updates
function updateStats() {
    totalContactsSpan.textContent = contacts.length;
    recentCallsSpan.textContent = callLogs.length;
    
    // Check if AI screening is working (basic check)
    const hasAILogs = callLogs.some(log => 
        log.status === 'Screening' || log.status === 'Forwarded' || log.status === 'Rejected'
    );
    aiScreeningSpan.textContent = hasAILogs ? 'Active' : 'Standby';
}

// Utility Functions
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // If less than 24 hours ago, show relative time
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ago`;
        } else if (minutes > 0) {
            return `${minutes}m ago`;
        } else {
            return 'Just now';
        }
    }
    
    // Otherwise show date
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatPhoneNumber(phoneNumber) {
    // Basic formatting for US numbers
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
        }
    } else if (cleaned.length === 10) {
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
    }
    
    return phoneNumber;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

function showLoading() {
    loadingOverlay.classList.add('show');
}

function hideLoading() {
    loadingOverlay.classList.remove('show');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Phone number formatting for input field
document.getElementById('contactPhone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    // Limit to 11 digits (1 + 10 digit US number)
    if (value.length > 11) {
        value = value.substring(0, 11);
    }
    
    // Format as +1 (XXX) XXX-XXXX
    if (value.length >= 1) {
        if (value.length <= 1) {
            value = '+' + value;
        } else if (value.length <= 4) {
            value = '+' + value.substring(0, 1) + ' (' + value.substring(1);
        } else if (value.length <= 7) {
            value = '+' + value.substring(0, 1) + ' (' + value.substring(1, 4) + ') ' + value.substring(4);
        } else {
            value = '+' + value.substring(0, 1) + ' (' + value.substring(1, 4) + ') ' + value.substring(4, 7) + '-' + value.substring(7);
        }
    }
    
    e.target.value = value;
});

// Call log management functions
async function deleteCallLog(id) {
    if (!confirm('Are you sure you want to delete this call log?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/call-logs/${id}`, {
            method: 'DELETE'
        });
        // Log will be removed via socket event
    } catch (error) {
        showToast('Failed to delete call log', 'error');
    }
}

async function clearAllCallLogs() {
    if (!confirm('Are you sure you want to delete ALL call logs? This cannot be undone.')) {
        return;
    }
    
    try {
        await apiRequest('/api/call-logs', {
            method: 'DELETE'
        });
        // Logs will be cleared via socket event
    } catch (error) {
        showToast('Failed to clear call logs', 'error');
    }
}

// Convert Twilio recording URL to local proxy URL
function convertToProxyUrl(twilioUrl) {
    if (!twilioUrl) return '';
    
    // Extract recording SID from Twilio URL
    // Example: https://api.twilio.com/2010-04-01/Accounts/AC.../Recordings/RE123...
    const match = twilioUrl.match(/\/Recordings\/([A-Za-z0-9]+)/);
    if (match && match[1]) {
        return `/recording/${match[1]}`;
    }
    
    // Fallback to original URL if parsing fails
    return twilioUrl;
}

// Recording playback function
function playRecording(recordingUrl) {
    // Create audio player modal
    const modal = document.createElement('div');
    modal.className = 'audio-modal';
    modal.innerHTML = `
        <div class="audio-modal-content">
            <div class="audio-modal-header">
                <h3>🎵 Voicemail Recording</h3>
                <button class="audio-modal-close" onclick="closeAudioModal()">&times;</button>
            </div>
            <div class="audio-modal-body">
                <audio controls autoplay style="width: 100%;">
                    <source src="${recordingUrl}" type="audio/wav">
                    <source src="${recordingUrl}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
                <div class="audio-modal-actions">
                    <a href="${recordingUrl}" download class="btn btn-secondary">Download</a>
                    <a href="${recordingUrl}" target="_blank" class="btn btn-secondary">Open in New Tab</a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAudioModal();
        }
    });
}

function closeAudioModal() {
    const modal = document.querySelector('.audio-modal');
    if (modal) {
        modal.remove();
    }
}

// Blacklist Management Functions

// Load blacklist entries
async function loadBlacklist() {
    try {
        const newEntries = await apiRequest('/api/blacklist');
        
        // Flash update if new entries
        if (newEntries.length > blacklistEntries.length) {
            blacklistEntriesList.classList.add('flash-update');
            setTimeout(() => blacklistEntriesList.classList.remove('flash-update'), 500);
        }
        
        blacklistEntries = newEntries;
        renderBlacklist();
    } catch (error) {
        console.error('Failed to load blacklist:', error);
    }
}

// Handle adding to blacklist
async function handleAddToBlacklist(e) {
    e.preventDefault();
    
    const phone = document.getElementById('blacklistPhone').value.trim();
    const reason = document.getElementById('blacklistReason').value;
    const patternType = document.getElementById('patternType').value;
    
    if (!phone || !reason) {
        showToast('Please fill in phone number and reason', 'error');
        return;
    }
    
    try {
        await apiRequest('/api/blacklist', {
            method: 'POST',
            body: JSON.stringify({
                phone_number: phone,
                reason: reason,
                pattern_type: patternType
            })
        });
        
        blacklistForm.reset();
        // Entry will be added via socket event
    } catch (error) {
        if (error.message.includes('409')) {
            showToast('This phone number is already blacklisted', 'error');
        } else {
            showToast('Failed to add to blacklist', 'error');
        }
    }
}

// Delete blacklist entry
async function deleteBlacklistEntry(id) {
    if (!confirm('Are you sure you want to remove this number from the blacklist?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/blacklist/${id}`, {
            method: 'DELETE'
        });
        // Entry will be removed via socket event
    } catch (error) {
        showToast('Failed to remove from blacklist', 'error');
    }
}

// Clear all blacklist entries
async function clearAllBlacklist() {
    if (!confirm('Are you sure you want to clear ALL blacklist entries? This cannot be undone.')) {
        return;
    }
    
    try {
        await apiRequest('/api/blacklist', {
            method: 'DELETE'
        });
        // Entries will be cleared via socket event
    } catch (error) {
        showToast('Failed to clear blacklist', 'error');
    }
}

// Render blacklist entries
function renderBlacklist() {
    if (blacklistEntries.length === 0) {
        blacklistEntriesList.innerHTML = `
            <div class="empty-state">
                <h3>No blacklisted numbers</h3>
                <p>Add numbers to automatically send TCPA compliance messages</p>
            </div>
        `;
        return;
    }
    
    blacklistEntriesList.innerHTML = blacklistEntries.map(entry => `
        <div class="blacklist-item">
            <div class="blacklist-info">
                <h4>${formatPhoneNumber(entry.phone_number)}</h4>
                <p><strong>Reason:</strong> ${escapeHtml(entry.reason)}</p>
                <p><strong>Type:</strong> ${entry.pattern_type.replace('_', ' ')}</p>
                <p><strong>Added:</strong> ${formatTimestamp(entry.date_added)}</p>
            </div>
            <button class="btn btn-danger" onclick="deleteBlacklistEntry(${entry.id})">
                Remove
            </button>
        </div>
    `).join('');
}

// Add phone number formatting for blacklist input
document.getElementById('blacklistPhone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    // Limit to 11 digits (1 + 10 digit US number)
    if (value.length > 11) {
        value = value.substring(0, 11);
    }
    
    // Format as +1 (XXX) XXX-XXXX
    if (value.length >= 1) {
        if (value.length <= 1) {
            value = '+' + value;
        } else if (value.length <= 4) {
            value = '+' + value.substring(0, 1) + ' (' + value.substring(1);
        } else if (value.length <= 7) {
            value = '+' + value.substring(0, 1) + ' (' + value.substring(1, 4) + ') ' + value.substring(4);
        } else {
            value = '+' + value.substring(0, 1) + ' (' + value.substring(1, 4) + ') ' + value.substring(4, 7) + '-' + value.substring(7);
        }
    }
    
    e.target.value = value;
});

// PWA-specific enhancements and background connectivity

// Page Visibility API for PWA background handling
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('App became visible - syncing data');
        
        // Refresh data when app becomes visible
        loadContacts();
        loadCallLogs();
        loadBlacklist();
        
        // Reconnect socket if needed
        if (socket && !socket.connected) {
            console.log('Attempting to reconnect socket...');
            socket.connect();
        }
        
        // Update last sync timestamp
        localStorage.setItem('last-sync', Date.now());
    } else {
        console.log('App went to background');
        
        // Store current state for when app returns
        localStorage.setItem('last-background', Date.now());
    }
});

// Network status monitoring for PWA
window.addEventListener('online', () => {
    console.log('Network connection restored');
    showToast('Back online! Syncing data...', 'success');
    
    // Reconnect and sync when coming back online
    if (socket && !socket.connected) {
        socket.connect();
    }
    
    // Refresh all data
    setTimeout(() => {
        loadContacts();
        loadCallLogs();
        loadBlacklist();
    }, 1000);
});

window.addEventListener('offline', () => {
    console.log('Network connection lost');
    updateSystemStatus('Offline', 'error');
    showToast('Connection lost - working offline', 'warning');
});

// Battery status monitoring for Samsung devices
if ('getBattery' in navigator) {
    navigator.getBattery().then((battery) => {
        console.log('Battery level:', Math.round(battery.level * 100) + '%');
        
        // Adjust polling frequency based on battery level
        battery.addEventListener('levelchange', () => {
            const batteryLevel = battery.level;
            console.log('Battery level changed:', Math.round(batteryLevel * 100) + '%');
            
            if (batteryLevel < 0.2) {
                // Reduce background activity when battery is low
                console.log('Low battery - reducing background activity');
                socket.io.opts.pingInterval = 60000; // Increase ping interval
            } else {
                socket.io.opts.pingInterval = 25000; // Normal ping interval
            }
        });
        
        battery.addEventListener('chargingchange', () => {
            console.log('Charging status changed:', battery.charging);
            if (battery.charging) {
                // Resume normal activity when charging
                socket.io.opts.pingInterval = 25000;
            }
        });
    });
}

// Background sync for PWA data updates
function requestBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
            registration.sync.register('sync-call-logs');
            registration.sync.register('sync-contacts');
            registration.sync.register('sync-blacklist');
        }).catch((error) => {
            console.error('Background sync registration failed:', error);
        });
    }
}

// Enhanced notification support for critical call events
function showCallNotification(title, body, data = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: 'call-alert',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            data: data,
            actions: [
                {
                    action: 'view',
                    title: 'View Details'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        });
        
        notification.onclick = function() {
            window.focus();
            this.close();
        };
        
        // Auto-close after 30 seconds
        setTimeout(() => {
            notification.close();
        }, 30000);
        
        return notification;
    }
}

// PWA-specific data persistence
function saveDataToCache(key, data) {
    try {
        localStorage.setItem(`pwa-cache-${key}`, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Failed to save data to cache:', error);
    }
}

function loadDataFromCache(key, maxAge = 300000) { // 5 minutes default
    try {
        const cached = localStorage.getItem(`pwa-cache-${key}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < maxAge) {
                return parsed.data;
            }
        }
    } catch (error) {
        console.error('Failed to load data from cache:', error);
    }
    return null;
}

// Samsung Z Fold 3 specific optimizations
if (navigator.userAgent.includes('SM-F926') || window.screen.width > 1768) {
    console.log('Samsung Galaxy Z Fold 3 detected - applying optimizations');
    
    // Add foldable-specific CSS class
    document.body.classList.add('galaxy-fold');
    
    // Handle screen configuration changes
    const mediaQuery = window.matchMedia('(min-width: 1768px)');
    
    function handleScreenChange(mq) {
        if (mq.matches) {
            console.log('Unfolded mode detected');
            document.body.classList.add('unfolded');
            document.body.classList.remove('folded');
        } else {
            console.log('Folded mode detected');
            document.body.classList.add('folded');
            document.body.classList.remove('unfolded');
        }
        
        // Trigger layout refresh
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }
    
    mediaQuery.addListener(handleScreenChange);
    handleScreenChange(mediaQuery); // Initial check
}

// Initialize PWA background sync on app start
setTimeout(() => {
    requestBackgroundSync();
}, 2000);