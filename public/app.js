// Global state
let contacts = [];
let callLogs = [];
let socket;

// DOM Elements
const contactForm = document.getElementById('contactForm');
const contactsList = document.getElementById('contactsList');
const callLogsList = document.getElementById('callLogs');
const refreshLogsBtn = document.getElementById('refreshLogs');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');

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
    
    // Event listeners
    contactForm.addEventListener('submit', handleAddContact);
    refreshLogsBtn.addEventListener('click', loadCallLogs);
    
    // Auto-refresh call logs every 30 seconds
    setInterval(loadCallLogs, 30000);
});

// Socket.io initialization and event handlers
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        updateSystemStatus('Connected', 'ready');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateSystemStatus('Disconnected', 'error');
    });
    
    // Real-time call events
    socket.on('call-incoming', (data) => {
        updateSystemStatus(`Incoming call from ${formatPhoneNumber(data.from)}`, 'incoming');
        showCallProgress(data);
        addCallStep('📞 Call received', `From: ${formatPhoneNumber(data.from)}`, 'active');
    });
    
    socket.on('call-whitelisted', (data) => {
        updateSystemStatus(`Whitelisted: ${data.contactName}`, 'forwarding');
        addCallStep('✅ Contact recognized', `Forwarding to ${data.contactName}`, 'complete');
        addCallStep('📞 Forwarding call', 'Direct connection established', 'active');
        setTimeout(() => clearCallProgress(), 5000);
    });
    
    socket.on('call-screening', (data) => {
        updateSystemStatus('AI Screening in progress...', 'screening');
        addCallStep('🤖 AI Gatekeeper engaged', 'Asking caller to state purpose', 'complete');
        addCallStep('🎤 Waiting for response', 'Listening for caller input...', 'active');
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
        addCallStep('📞 Forwarding call', `Connecting to ${formatPhoneNumber(data.forwardTo)}`, 'active');
        setTimeout(() => clearCallProgress(), 8000);
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