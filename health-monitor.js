#!/usr/bin/env node
/**
 * Health Monitor for Call Forwarding App
 * 
 * This script checks the health of the call forwarding system and sends
 * SMS notifications via Twilio when issues are detected.
 * 
 * Checks performed:
 * 1. Internet connectivity (ping external DNS servers)
 * 2. Server process status (systemd service)
 * 3. External accessibility (HTTP request to public URL)
 * 4. Twilio API connectivity
 * 5. DNS resolution
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const dns = require('dns');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const OpenAI = require('openai');

// Helper to get IP by MAC address
function getIpByMac(targetMac) {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                if (iface.mac.toLowerCase() === targetMac.toLowerCase()) {
                    return iface.address;
                }
            }
        }
    }
    return null;
}

const bindingIp = '192.168.86.59';

// Configuration
const CONFIG = {
    // Your personal number for notifications
    notifyNumber: process.env.MY_PERSONAL_NUMBER || '+13342328764',

    // Twilio credentials
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,

    // Telegram configuration (Popzchat)
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,

    // DeepSeek configuration (removed)
    // deepseekApiKey: process.env.DEEPSEEK_API_KEY,

    // Health check targets
    publicUrl: 'http://calls.popzplace.com:3001/api/health',
    localUrl: `http://${bindingIp}:3001/api/health`,
    domain: 'popzplace.com',

    // External connectivity check targets
    dnsServers: ['8.8.8.8', '1.1.1.1'],

    // Notification cooldown (prevent spam) - 15 minutes
    notificationCooldownMs: 15 * 60 * 1000,

    // State file for tracking last notification
    stateFilePath: path.join(__dirname, '.health-monitor-state.json'),

    // Log file
    logFilePath: path.join(__dirname, 'health-monitor.log')
};

// Logging utility
function log(level, message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}\n`;
    console.log(logLine.trim());

    try {
        fs.appendFileSync(CONFIG.logFilePath, logLine);
    } catch (err) {
        console.error('Failed to write to log file:', err.message);
    }
}

// Load state from file
function loadState() {
    try {
        if (fs.existsSync(CONFIG.stateFilePath)) {
            return JSON.parse(fs.readFileSync(CONFIG.stateFilePath, 'utf8'));
        }
    } catch (err) {
        log('WARN', `Failed to load state: ${err.message}`);
    }
    return { lastNotificationTime: 0, lastIssues: [] };
}

// Save state to file
function saveState(state) {
    try {
        fs.writeFileSync(CONFIG.stateFilePath, JSON.stringify(state, null, 2));
    } catch (err) {
        log('WARN', `Failed to save state: ${err.message}`);
    }
}

// Check internet connectivity by pinging DNS servers
function checkInternetConnectivity() {
    return new Promise((resolve) => {
        exec('ping -c 1 -W 5 8.8.8.8', (error, stdout, stderr) => {
            if (error) {
                // Try backup DNS
                exec('ping -c 1 -W 5 1.1.1.1', (error2) => {
                    resolve({
                        name: 'Internet Connectivity',
                        status: error2 ? 'FAIL' : 'OK',
                        message: error2 ? 'Cannot reach external DNS servers' : 'Connected via backup DNS'
                    });
                });
            } else {
                resolve({
                    name: 'Internet Connectivity',
                    status: 'OK',
                    message: 'Connected to internet'
                });
            }
        });
    });
}

// Check if the systemd service is running
function checkServerProcess() {
    return new Promise((resolve) => {
        exec('systemctl is-active call-forwarding.service', (error, stdout) => {
            const isActive = stdout.trim() === 'active';
            resolve({
                name: 'Server Process',
                status: isActive ? 'OK' : 'FAIL',
                message: isActive ? 'Service is running' : `Service status: ${stdout.trim() || 'unknown'}`
            });
        });
    });
}

// Check local server accessibility
function checkLocalAccess() {
    return new Promise((resolve) => {
        const req = http.get(CONFIG.localUrl, { timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve({
                        name: 'Local Server Access',
                        status: 'OK',
                        message: 'Local server responding'
                    });
                } else {
                    resolve({
                        name: 'Local Server Access',
                        status: 'FAIL',
                        message: `HTTP ${res.statusCode}`
                    });
                }
            });
        });

        req.on('error', (err) => {
            resolve({
                name: 'Local Server Access',
                status: 'FAIL',
                message: err.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                name: 'Local Server Access',
                status: 'FAIL',
                message: 'Request timeout'
            });
        });
    });
}

// Check external accessibility (public URL)
function checkExternalAccess() {
    return new Promise((resolve) => {
        const req = http.get(CONFIG.publicUrl, { timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve({
                        name: 'External Access',
                        status: 'OK',
                        message: 'Public URL is accessible'
                    });
                } else if (res.statusCode === 401 || res.statusCode === 403) {
                    // Auth required is OK - server is responding
                    resolve({
                        name: 'External Access',
                        status: 'OK',
                        message: 'Public URL responding (auth required)'
                    });
                } else {
                    resolve({
                        name: 'External Access',
                        status: 'FAIL',
                        message: `HTTP ${res.statusCode}`
                    });
                }
            });
        });

        req.on('error', (err) => {
            resolve({
                name: 'External Access',
                status: 'FAIL',
                message: `Cannot reach public URL: ${err.message}`
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                name: 'External Access',
                status: 'FAIL',
                message: 'Public URL request timeout'
            });
        });
    });
}

// Check DNS resolution
function checkDNS() {
    return new Promise((resolve) => {
        dns.resolve(CONFIG.domain, (err, addresses) => {
            if (err) {
                resolve({
                    name: 'DNS Resolution',
                    status: 'FAIL',
                    message: `Cannot resolve ${CONFIG.domain}: ${err.message}`
                });
            } else {
                resolve({
                    name: 'DNS Resolution',
                    status: 'OK',
                    message: `${CONFIG.domain} resolves to ${addresses.join(', ')}`
                });
            }
        });
    });
}

// Check Twilio API
function checkTwilioAPI() {
    return new Promise((resolve) => {
        if (!CONFIG.twilioAccountSid || !CONFIG.twilioAuthToken) {
            resolve({
                name: 'Twilio API',
                status: 'FAIL',
                message: 'Twilio credentials not configured'
            });
            return;
        }

        const auth = Buffer.from(`${CONFIG.twilioAccountSid}:${CONFIG.twilioAuthToken}`).toString('base64');

        const options = {
            hostname: 'api.twilio.com',
            port: 443,
            path: `/2010-04-01/Accounts/${CONFIG.twilioAccountSid}.json`,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                resolve({
                    name: 'Twilio API',
                    status: 'OK',
                    message: 'Twilio API accessible'
                });
            } else {
                resolve({
                    name: 'Twilio API',
                    status: 'FAIL',
                    message: `Twilio API returned ${res.statusCode}`
                });
            }
        });

        req.on('error', (err) => {
            resolve({
                name: 'Twilio API',
                status: 'FAIL',
                message: `Cannot reach Twilio: ${err.message}`
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                name: 'Twilio API',
                status: 'FAIL',
                message: 'Twilio API request timeout'
            });
        });

        req.end();
    });
}

// Check Local LLM API
function checkLocalLLMAPI() {
    return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:8080/health', { timeout: 5000 }, (res) => {
            if (res.statusCode === 200) {
                resolve({
                    name: 'Local LLM API',
                    status: 'OK',
                    message: 'Local LLM is healthy'
                });
            } else {
                resolve({
                    name: 'Local LLM API',
                    status: 'FAIL',
                    message: `Local LLM returned ${res.statusCode}`
                });
            }
        });

        req.on('error', (err) => {
            resolve({
                name: 'Local LLM API',
                status: 'FAIL',
                message: `Cannot reach Local LLM: ${err.message}`
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                name: 'Local LLM API',
                status: 'FAIL',
                message: 'Local LLM request timeout'
            });
        });
    });
}

// Send Telegram notification to Popzchat
function sendTelegramNotification(issues) {
    return new Promise((resolve) => {
        if (!CONFIG.telegramBotToken || !CONFIG.telegramChatId) {
            log('WARN', 'Telegram not configured - skipping Telegram notification');
            resolve(false);
            return;
        }

        const issuesList = issues.map(i => `❌ ${i.name}: ${i.message}`).join('\n');
        const message = `🚨 *CALL FORWARDING ALERT*\n\nIssues detected:\n${issuesList}\n\n🕐 Time: ${new Date().toLocaleString()}`;

        const postData = JSON.stringify({
            chat_id: CONFIG.telegramChatId,
            text: message,
            parse_mode: 'Markdown'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${CONFIG.telegramBotToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    log('INFO', 'Telegram notification sent to Popzchat');
                    resolve(true);
                } else {
                    log('ERROR', `Failed to send Telegram message: HTTP ${res.statusCode} - ${data}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (err) => {
            log('ERROR', `Failed to send Telegram message: ${err.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            log('ERROR', 'Telegram API request timeout');
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
}

// Send recovery notification via Telegram
function sendTelegramRecovery() {
    return new Promise((resolve) => {
        if (!CONFIG.telegramBotToken || !CONFIG.telegramChatId) {
            resolve(false);
            return;
        }

        const message = `✅ *CALL FORWARDING RECOVERED*\n\nAll systems are now operational.\n\n🕐 Time: ${new Date().toLocaleString()}`;

        const postData = JSON.stringify({
            chat_id: CONFIG.telegramChatId,
            text: message,
            parse_mode: 'Markdown'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${CONFIG.telegramBotToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => resolve(false));
        req.write(postData);
        req.end();
    });
}

// Send SMS notification via Twilio
function sendSMSNotification(issues) {
    return new Promise((resolve) => {
        if (!CONFIG.twilioAccountSid || !CONFIG.twilioAuthToken) {
            log('ERROR', 'Cannot send SMS: Twilio credentials not configured');
            resolve(false);
            return;
        }

        const issuesList = issues.map(i => `❌ ${i.name}: ${i.message}`).join('\n');
        const message = `🚨 CALL FORWARDING ALERT\n\nIssues detected:\n${issuesList}\n\nTime: ${new Date().toLocaleString()}`;

        const postData = new URLSearchParams({
            To: CONFIG.notifyNumber,
            From: CONFIG.twilioPhoneNumber,
            Body: message
        }).toString();

        const auth = Buffer.from(`${CONFIG.twilioAccountSid}:${CONFIG.twilioAuthToken}`).toString('base64');

        const options = {
            hostname: 'api.twilio.com',
            port: 443,
            path: `/2010-04-01/Accounts/${CONFIG.twilioAccountSid}/Messages.json`,
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 201 || res.statusCode === 200) {
                    log('INFO', `SMS notification sent to ${CONFIG.notifyNumber}`);
                    resolve(true);
                } else {
                    log('ERROR', `Failed to send SMS: HTTP ${res.statusCode} - ${data}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (err) => {
            log('ERROR', `Failed to send SMS: ${err.message}`);
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
}

// Main health check function
async function runHealthChecks() {
    log('INFO', '=== Starting health checks ===');

    // Run all checks in parallel
    const results = await Promise.all([
        checkInternetConnectivity(),
        checkServerProcess(),
        checkLocalAccess(),
        checkExternalAccess(),
        checkDNS(),
        checkTwilioAPI(),
        checkLocalLLMAPI()
    ]);

    // Log all results
    results.forEach(result => {
        const icon = result.status === 'OK' ? '✅' : '❌';
        log('INFO', `${icon} ${result.name}: ${result.message}`);
    });

    // Find failures
    const failures = results.filter(r => r.status === 'FAIL');

    if (failures.length === 0) {
        log('INFO', '=== All health checks passed ===');
        return;
    }

    log('WARN', `=== ${failures.length} health check(s) failed ===`);

    // Load state to check cooldown
    const state = loadState();
    const now = Date.now();
    const timeSinceLastNotification = now - state.lastNotificationTime;

    // Check if the same issues persist (to avoid duplicate notifications)
    const currentIssueKeys = failures.map(f => f.name).sort().join(',');
    const lastIssueKeys = (state.lastIssues || []).sort().join(',');
    const isSameIssues = currentIssueKeys === lastIssueKeys;

    if (timeSinceLastNotification < CONFIG.notificationCooldownMs && isSameIssues) {
        log('INFO', `Skipping notification (cooldown active, ${Math.round((CONFIG.notificationCooldownMs - timeSinceLastNotification) / 60000)} min remaining)`);
    } else {
        // Send notifications via both SMS and Telegram
        const [smsSent, telegramSent] = await Promise.all([
            sendSMSNotification(failures),
            sendTelegramNotification(failures)
        ]);

        if (smsSent || telegramSent) {
            state.lastNotificationTime = now;
            state.lastIssues = failures.map(f => f.name);
            saveState(state);
        }
    }
}

// Recovery notification when all issues are resolved
async function checkForRecovery() {
    const state = loadState();

    if (state.lastIssues && state.lastIssues.length > 0) {
        // There were previous issues, check if resolved
        const results = await Promise.all([
            checkInternetConnectivity(),
            checkServerProcess(),
            checkLocalAccess(),
            checkExternalAccess(),
            checkLocalLLMAPI()
        ]);

        const failures = results.filter(r => r.status === 'FAIL');

        if (failures.length === 0) {
            // All recovered - send recovery notification
            const message = `✅ CALL FORWARDING RECOVERED\n\nAll systems are now operational.\n\nTime: ${new Date().toLocaleString()}`;

            // Clear state
            state.lastIssues = [];
            saveState(state);

            log('INFO', 'System recovered - sending recovery notification');

            // Send recovery via SMS and Telegram
            await Promise.all([
                // SMS recovery
                (async () => {
                    if (CONFIG.twilioAccountSid && CONFIG.twilioAuthToken) {
                        const postData = new URLSearchParams({
                            To: CONFIG.notifyNumber,
                            From: CONFIG.twilioPhoneNumber,
                            Body: message
                        }).toString();

                        const auth = Buffer.from(`${CONFIG.twilioAccountSid}:${CONFIG.twilioAuthToken}`).toString('base64');

                        const options = {
                            hostname: 'api.twilio.com',
                            port: 443,
                            path: `/2010-04-01/Accounts/${CONFIG.twilioAccountSid}/Messages.json`,
                            method: 'POST',
                            headers: {
                                'Authorization': `Basic ${auth}`,
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Content-Length': Buffer.byteLength(postData)
                            }
                        };

                        const req = https.request(options, () => { });
                        req.on('error', () => { });
                        req.write(postData);
                        req.end();
                    }
                })(),
                // Telegram recovery
                sendTelegramRecovery()
            ]);
        }
    }
}

// Run the health checks
runHealthChecks()
    .then(() => checkForRecovery())
    .then(() => {
        log('INFO', 'Health check complete');
        process.exit(0);
    })
    .catch(err => {
        log('ERROR', `Health check failed: ${err.message}`);
        process.exit(1);
    });
