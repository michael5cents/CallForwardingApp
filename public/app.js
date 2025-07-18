// Global state
let contacts = [];
let callLogs = [];

// DOM Elements
const contactForm = document.getElementById('contactForm');
const contactsList = document.getElementById('contactsList');
const callLogsList = document.getElementById('callLogs');
const refreshLogsBtn = document.getElementById('refreshLogs');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');

// Status elements
const totalContactsSpan = document.getElementById('totalContacts');
const recentCallsSpan = document.getElementById('recentCalls');
const aiScreeningSpan = document.getElementById('aiScreening');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadContacts();
    loadCallLogs();
    
    // Event listeners
    contactForm.addEventListener('submit', handleAddContact);
    refreshLogsBtn.addEventListener('click', loadCallLogs);
    
    // Auto-refresh call logs every 30 seconds
    setInterval(loadCallLogs, 30000);
});

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
        
        showToast('Contact added successfully!');
        contactForm.reset();
        loadContacts();
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
        
        showToast('Contact deleted successfully!');
        loadContacts();
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
                <p>${escapeHtml(contact.phone_number)}</p>
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
        callLogs = await apiRequest('/api/call-logs');
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
    
    callLogsList.innerHTML = callLogs.map(log => `
        <div class="log-item ${log.status.toLowerCase()}">
            <div class="log-header">
                <span class="log-phone">${escapeHtml(log.from_number)}</span>
                <span class="log-status ${log.status.toLowerCase()}">${log.status}</span>
                <span class="log-timestamp">${formatTimestamp(log.timestamp)}</span>
            </div>
            ${log.summary ? `<div class="log-summary">${escapeHtml(log.summary)}</div>` : ''}
        </div>
    `).join('');
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

// Phone number formatting (optional enhancement)
function formatPhoneNumber(phoneNumber) {
    // Basic formatting for US numbers
    const cleaned = phoneNumber.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
    
    if (match) {
        return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
    }
    
    return phoneNumber;
}

// Add phone number formatting to the input field
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