// Service Worker para Notificaciones de Nicole (iPhone PWA / Desktop / Android)
let restTimeoutId = null;

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    const data = event.data || {};

    if (data.type === 'SHOW_NOTIFICATION') {
        event.waitUntil(
            self.registration.showNotification(data.title || 'Nicole', {
                body: data.body || '',
                icon: '/apple-touch-icon.png',
                badge: '/apple-touch-icon.png',
                tag: data.tag || 'nicole-general',
                renotify: true,
                vibrate: [250, 100, 250],
                silent: false,
                data: { url: data.url || '/' }
            })
        );
    } else if (data.type === 'SCHEDULE_REST_NOTIFICATION') {
        if (restTimeoutId) {
            clearTimeout(restTimeoutId);
            restTimeoutId = null;
        }
        const delayMs = Math.max(500, parseInt(data.delayMs) || 60000);
        restTimeoutId = setTimeout(() => {
            restTimeoutId = null;
            self.registration.showNotification(data.title || '⏰ ¡Descanso terminado!', {
                body: data.body || '¡Tiempo cumplido! A por la siguiente serie 💪',
                icon: '/apple-touch-icon.png',
                badge: '/apple-touch-icon.png',
                tag: 'workout-rest-timer',
                renotify: true,
                vibrate: [300, 120, 300, 120, 400],
                silent: false,
                data: { url: '/?view=personal' }
            });
        }, delayMs);
    } else if (data.type === 'CANCEL_REST_NOTIFICATION') {
        if (restTimeoutId) {
            clearTimeout(restTimeoutId);
            restTimeoutId = null;
        }
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
