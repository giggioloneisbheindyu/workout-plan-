/* Service Worker – Scheda Powerlifting */
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Scheda Powerlifting',
    body: 'È ora di allenarsi!',
    icon: '/coach.jpg',
    badge: '/coach.jpg',
    image: '/coach.jpg',
    url: '/?prompt=1',
    tag: 'allenamento'
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (_) {}

  const options = {
    body: data.body,
    icon: data.icon || '/coach.jpg',
    badge: data.badge || '/coach.jpg',
    tag: data.tag || 'allenamento',
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/?prompt=1' }
  };

  // Immagine grande (supportata soprattutto su Android Chrome)
  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/?prompt=1';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (url !== '/') client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
