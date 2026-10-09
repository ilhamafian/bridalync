self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

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
        const client = clientList.find(function (item) {
          return item.url.startsWith(self.location.origin) && "focus" in item;
        });
        if (!client) {
          return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
        }
        // The open app navigates itself (ServiceWorkerNavigation): WindowClient.navigate()
        // fails for uncontrolled pages and isn't reliable in iOS home screen apps.
        client.postMessage({ type: "bridalync:navigate", url: path });
        return client.focus().catch(function () {
          return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
        });
      })
  );
});
