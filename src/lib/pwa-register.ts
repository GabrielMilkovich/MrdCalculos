// =====================================================
// PWA Service Worker Registration
// =====================================================

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              // New version available — notify user
              window.dispatchEvent(new CustomEvent('sw-update-available'));
            }
          });
        });

        console.log('[PWA] Service Worker registered successfully');
      } catch (error) {
        console.warn('[PWA] Service Worker registration failed:', error);
      }
    });
  }
}

export function isOffline(): boolean {
  return !navigator.onLine;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const onOnline = () => callback(true);
  const onOffline = () => callback(false);

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
