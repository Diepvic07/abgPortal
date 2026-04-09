// Minimal service worker for push notifications only.
// No fetch caching, no navigation interception.

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const { title, body, url, icon } = data;

  event.waitUntil(
    self.registration.showNotification(title || 'ABG Alumni Connect', {
      body: body || '',
      icon: icon || '/images/abg-icon-192.png',
      badge: '/images/abg-icon-192.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Focus existing tab if already open
        for (const client of windowClients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new tab
        return clients.openWindow(url);
      })
    );
  }
});
