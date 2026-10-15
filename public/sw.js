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

function isDashboardUrl(url) {
  try {
    return new URL(url).pathname.startsWith("/dashboard");
  } catch (error) {
    return false;
  }
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const path =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : "/dashboard/bookings";
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        const origin = self.location.origin;
        const dashboardClient = clientList.find(function (item) {
          return isDashboardUrl(item.url) && "focus" in item;
        });

        // Prefer the dashboard. Focusing the public booking page (often still
        // open after a client submits a receipt) leaves the stylist there.
        if (dashboardClient) {
          dashboardClient.postMessage({
            type: "bridalync:navigate",
            url: path,
          });
          return dashboardClient.focus().catch(function () {
            return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
          });
        }

        const anyClient = clientList.find(function (item) {
          return item.url.startsWith(origin);
        });
        if (anyClient && typeof anyClient.navigate === "function") {
          return anyClient
            .navigate(targetUrl)
            .then(function (navigated) {
              if (navigated && "focus" in navigated) return navigated.focus();
              return clients.openWindow
                ? clients.openWindow(targetUrl)
                : undefined;
            })
            .catch(function () {
              anyClient.postMessage({ type: "bridalync:navigate", url: path });
              if ("focus" in anyClient) return anyClient.focus();
              return clients.openWindow
                ? clients.openWindow(targetUrl)
                : undefined;
            });
        }

        if (clients.openWindow) return clients.openWindow(targetUrl);
        if (anyClient && "focus" in anyClient) {
          anyClient.postMessage({ type: "bridalync:navigate", url: path });
          return anyClient.focus();
        }
      })
  );
});
