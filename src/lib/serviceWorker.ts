/**
 * Service Worker registration for offline support
 */

export function registerServiceWorker() {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New content available, you could show a toast here
                console.log(
                  "Ny version tillgänglig. Ladda om sidan för att uppdatera.",
                );
              }
            });
          }
        });

        console.log("Service Worker registrerad:", registration.scope);
      } catch (error) {
        console.error("Service Worker-registrering misslyckades:", error);
      }
    });
  }
}

export function unregisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
