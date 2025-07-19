// Browser notification function for real-time call alerts
function showBrowserNotification(title, body, type = 'info') {
    console.log('📱 Showing notification:', title, body);
    
    // Check if notifications are supported and permitted
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