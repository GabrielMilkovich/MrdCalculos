import { AlertTriangle, AlertCircle, Info, XOctagon } from 'lucide-react';
import type { WarningSeverity } from '@/lib/pjecalc/warning-types';
import { enrichWarning, SEVERITY_RANK } from '@/lib/pjecalc/warning-catalog';

interface Props {
  warnings: Array<{ code: string; message: string }> | undefined;
}

const SEVERITY_STYLES: Record<WarningSeverity, {
  icon: React.ComponentType<{ className?: string }>;
  containerClass: string;
  iconClass: string;
  label: string;
}> = {
  critical: {
    icon: XOctagon,
    containerClass: 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40',
    iconClass: 'text-rose-700 dark:text-rose-300',
    label: 'Crítico',
  },
  high: {
    icon: AlertCircle,
    containerClass: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40',
    iconClass: 'text-amber-700 dark:text-amber-300',
    label: 'Atenção',
  },
  medium: {
    icon: AlertTriangle,
    containerClass: 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/40',
    iconClass: 'text-yellow-700 dark:text-yellow-300',
    label: 'Aviso',
  },
  info: {
    icon: Info,
    containerClass: 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40',
    iconClass: 'text-blue-700 dark:text-blue-300',
    label: 'Info',
  },
};

export function MotorWarningsBanner({ warnings }: Props) {
  if (!warnings || warnings.length === 0) return null;

  const enriched = warnings
    .map(enrichWarning)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  const hasCritical = enriched.some(w => w.severity === 'critical');

  return (
    <div className="space-y-2 my-4" data-testid="motor-warnings-banner">
      {hasCritical && (
        <div className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          Pendências críticas detectadas no cálculo
        </div>
      )}
      {enriched.map((w, i) => {
        const style = SEVERITY_STYLES[w.severity];
        const Icon = style.icon;
        return (
          <div
            key={`${w.code}-${i}`}
            className={`flex items-start gap-3 p-3 border rounded-md ${style.containerClass}`}
          >
            <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${style.iconClass}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${style.iconClass}`}>
                  {style.label}
                </span>
                <span className="text-xs text-muted-foreground font-mono opacity-60">
                  {w.code}
                </span>
              </div>
              <p className="text-sm mt-1">{w.user_message}</p>
              {w.action_hint && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {w.action_hint}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function hasCriticalWarning(
  warnings: Array<{ code: string; message: string }> | undefined,
): boolean {
  if (!warnings) return false;
  return warnings
    .map(enrichWarning)
    .some(w => w.severity === 'critical');
}
