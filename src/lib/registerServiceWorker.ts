export function registerServiceWorker({
  isProd,
  serviceWorker,
}: {
  isProd: boolean;
  serviceWorker?: ServiceWorkerContainer;
}): boolean {
  if (!isProd || !serviceWorker) return false;

  window.addEventListener("load", () => {
    serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[PWA] Service worker registration failed", error);
    });
  });
  return true;
}
