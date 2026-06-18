self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "VMS Alert", {
      body: data.body ?? "",
      icon: "/vite.svg",
      data: { visitor_id: data.visitor_id },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/my-visitors"));
});
