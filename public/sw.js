self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Bridalync", body: event.data.text() };
  }

  const title = data.title || "Bridalync";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    data: {
      url: data.url || "/dashboard/bookings",
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const path = event.notification.data?.url || "/dashboard/bookings";
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            return client.focus().then(function (focused) {
              if (focused && "navigate" in focused) {
                return focused.navigate(targetUrl);
              }
              return focused;
            });
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
