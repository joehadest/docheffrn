self.addEventListener('install', function (event) {
    console.log('Service Worker instalado');
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    console.log('Service Worker ativado');
    event.waitUntil(clients.claim());
});

self.addEventListener('push', function (event) {
    console.log('Push recebido:', event);

    if (event.data) {
        try {
            const data = event.data.json();
            console.log('Dados do push:', data);

            const options = {
                body: data.body,
                icon: data.icon || '/icon-192x192.png',
                badge: '/badge.png',
                vibrate: [100, 50, 100],
                data: {
                    url: data.url
                },
                actions: [
                    {
                        action: 'open',
                        title: 'Ver Pedido'
                    }
                ]
            };

            event.waitUntil(
                self.registration.showNotification(data.title, options)
            );
        } catch (error) {
            console.error('Erro ao processar push:', error);
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    console.log('Notificação clicada:', event);

    event.notification.close();

    if (event.action === 'open' || !event.action) {
        const urlToOpen = event.notification.data?.url || '/meus-pedidos';

        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            }).then(function (clientList) {
                // Se já existe uma janela aberta, focar nela
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Se não existe, abrir nova janela
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
}); 