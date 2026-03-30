/**
 * IndexSyncStatusBadge — Stubbed (auto-sync-service deleted)
 *
 * Shows a static "Offline" badge since the auto-sync service was removed.
 */
import { Badge } from "@/components/ui/badge";
import { WifiOff } from "lucide-react";

export function IndexSyncStatusBadge() {
  return (
    <Badge
      variant="outline"
      className="text-[10px] gap-1 px-2 py-0 h-5 font-normal text-muted-foreground border-border"
    >
      <WifiOff className="h-3 w-3" />
      Offline
    </Badge>
  );
}
