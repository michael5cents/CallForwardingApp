// Enhanced notification function with automatic focus for incoming calls
function showBrowserNotification(title, body, type = 'info') {
    console.log('📱 Call detected - bringing PWA to focus:', title, body);
    
    // IMMEDIATELY bring PWA into focus for calls
    if (type === 'call' || type === 'screening') {
        bringPWAToFocus();
    }
    
    // Play audio alert
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

// Bring PWA into focus automatically when calls come in
function bringPWAToFocus() {
    try {
        console.log('🎯 Bringing PWA to focus - Enhanced Samsung method...');
        
        // Method 1: Multiple window focus attempts
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (window.focus) {
                    window.focus();
                }
                if (window.parent && window.parent.focus) {
                    window.parent.focus();
                }
                if (window.top && window.top.focus) {
                    window.top.focus();
                }
            }, i * 100);
        }
        
        // Method 2: Try to open new window to same app (forces focus)
        try {
            const currentUrl = window.location.href;
            const newWindow = window.open(currentUrl, '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
            if (newWindow) {
                setTimeout(() => {
                    newWindow.close();
                    window.focus();
                }, 2000);
            }
        } catch (e) {
            console.log('New window method failed:', e);
        }
        
        // Method 3: Use history API manipulation to trigger focus
        try {
            const currentState = history.state;
            history.pushState({focus: true, timestamp: Date.now()}, '', '?focus=true');
            setTimeout(() => {
                history.replaceState(currentState, '', window.location.pathname);
                window.focus();
            }, 100);
        } catch (e) {
            console.log('History manipulation failed:', e);
        }
        
        // Method 4: Request user activation through screen wake
        if (document.hidden && 'wakeLock' in navigator) {
            navigator.wakeLock.request('screen').then(wakeLock => {
                console.log('Screen wake lock acquired');
                setTimeout(() => {
                    wakeLock.release();
                    window.focus();
                }, 1000);
            }).catch(e => console.log('Wake lock failed:', e));
        }
        
        // Method 5: Persistent notification with auto-click simulation
        if ('Notification' in window && Notification.permission === 'granted') {
            const focusNotification = new Notification('📞 INCOMING CALL - TAP TO VIEW', {
                body: 'Call in progress - Touch to return to app',
                icon: '/icons/icon-192x192.png',
                tag: 'urgent-call-focus',
                requireInteraction: true,
                silent: false,
                renotify: true,
                sticky: true,
                actions: [
                    {
                        action: 'view',
                        title: '📞 View Call Now',
                        icon: '/icons/icon-72x72.png'
                    },
                    {
                        action: 'focus',
                        title: '🎯 Bring to Front',
                        icon: '/icons/icon-72x72.png'
                    }
                ],
                data: {
                    url: window.location.href,
                    timestamp: Date.now(),
                    forceOpen: true
                }
            });
            
            focusNotification.onclick = function() {
                console.log('Notification clicked - focusing window');
                window.focus();
                if (window.parent) window.parent.focus();
                this.close();
            };
            
            // Keep notification persistent for 10 seconds
            setTimeout(() => {
                focusNotification.close();
            }, 10000);
        }
        
        // Method 6: Document visibility change manipulation
        try {
            // Trigger visibility change events that might wake the app
            document.dispatchEvent(new Event('visibilitychange'));
            window.dispatchEvent(new Event('focus'));
            document.dispatchEvent(new Event('click'));
        } catch (e) {
            console.log('Event dispatch failed:', e);
        }
        
        // Method 7: Request fullscreen with immediate exit (attention grabber)
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                console.log('Fullscreen activated for attention');
                setTimeout(() => {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    }
                    window.focus();
                }, 500);
            }).catch(e => console.log('Fullscreen failed:', e));
        }
        
        // Method 8: Strong vibration pattern for Samsung
        if ('vibrate' in navigator) {
            // Multiple vibration bursts
            navigator.vibrate([1000, 300, 1000, 300, 1000]);
            setTimeout(() => navigator.vibrate([500, 200, 500]), 2000);
            setTimeout(() => navigator.vibrate([200, 100, 200]), 4000);
        }
        
        // Method 9: Service Worker client focus (if available)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'FOCUS_CLIENT',
                url: window.location.href
            });
        }
        
        console.log('✅ Enhanced PWA focus methods attempted - should bring app to front');
        
    } catch (error) {
        console.error('Failed to bring PWA to focus:', error);
    }
}