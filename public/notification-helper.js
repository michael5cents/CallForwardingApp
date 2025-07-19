// Enhanced notification function with audio alerts for background monitoring
function showBrowserNotification(title, body, type = 'info') {
    console.log('📱 Showing notification:', title, body);
    
    // Play audio alert immediately (works in background)
    playNotificationSound(type);
    
    // Also try browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        const options = {
            body: body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: `call-${type}-${Date.now()}`,
            requireInteraction: true,
            silent: false,
            timestamp: Date.now(),
            data: {
                type: type,
                timestamp: new Date().toISOString()
            }
        };
        
        // Add vibration pattern for call types
        if (type === 'call') {
            options.vibrate = [500, 200, 500, 200, 500];
        } else if (type === 'screening') {
            options.vibrate = [200, 100, 200];
        }
        
        // Different icons for different notification types
        if (type === 'call') {
            options.icon = '/icons/icon-192x192.png';
        } else if (type === 'screening') {
            options.icon = '/icons/icon-144x144.png';
        }
        
        const notification = new Notification(title, options);
        
        // Auto-close after 10 seconds for non-call notifications
        if (type !== 'call') {
            setTimeout(() => {
                notification.close();
            }, 10000);
        }
        
        // Handle notification click
        notification.onclick = function() {
            window.focus();
            this.close();
        };
        
        return notification;
    } else if ('Notification' in window && Notification.permission === 'default') {
        // Request permission
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showBrowserNotification(title, body, type);
            }
        });
    } else {
        // Fallback to toast notification
        showToast(`${title}: ${body}`, type === 'call' ? 'error' : 'info');
    }
}

// Audio notification system that works in background
function playNotificationSound(type = 'info') {
    try {
        // Create audio context for background audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (type === 'call') {
            // Urgent call sound - phone ring pattern
            playRingtone(audioContext);
        } else if (type === 'screening') {
            // Screening sound - notification beep
            playBeep(audioContext, 800, 200);
        } else {
            // General notification
            playBeep(audioContext, 600, 100);
        }
        
        // Also vibrate if supported
        if ('vibrate' in navigator) {
            if (type === 'call') {
                navigator.vibrate([1000, 500, 1000, 500, 1000]);
            } else {
                navigator.vibrate([200, 100, 200]);
            }
        }
        
    } catch (error) {
        console.log('Audio notification failed:', error);
        // Fallback to system beep
        try {
            // Try system bell character
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+jvt2ceGzSfzN+iQwgZaJjt55xQCgJQo+HtrV0Xc2mq);');
            audio.play();
        } catch (e) {
            console.log('Fallback audio failed:', e);
        }
    }
}

// Generate phone ringtone pattern
function playRingtone(audioContext) {
    const now = audioContext.currentTime;
    
    // Ring pattern: ring-ring-pause-ring-ring-pause
    for (let i = 0; i < 4; i++) {
        const startTime = now + (i * 1.5);
        
        // Two quick rings
        playTone(audioContext, 800, startTime, 0.3);
        playTone(audioContext, 800, startTime + 0.4, 0.3);
    }
}

// Generate notification beep
function playBeep(audioContext, frequency, duration) {
    playTone(audioContext, frequency, audioContext.currentTime, duration / 1000);
}

// Core tone generator that works in background
function playTone(audioContext, frequency, startTime, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}