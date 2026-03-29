import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { onOnlineStatusChange } from '@/lib/pwa-register';

export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const unsub = onOnlineStatusChange(setOnline);

    const onUpdate = () => setUpdateAvailable(true);
    window.addEventListener('sw-update-available', onUpdate);

    return () => {
      unsub();
      window.removeEventListener('sw-update-available', onUpdate);
    };
  }, []);

  if (updateAvailable) {
    return (
      <Badge
        variant="outline"
        className="cursor-pointer border-blue-500 text-blue-600 gap-1"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="h-3 w-3" />
        Atualização disponível
      </Badge>
    );
  }

  if (!online) {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1">
        <WifiOff className="h-3 w-3" />
        Modo Offline
      </Badge>
    );
  }

  return null;
}
