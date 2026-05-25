export type ConfidenceBadge = 'alta' | 'revisar' | 'verificar' | 'baixa';

export interface ConfidenceMapping {
  pre_marcado: boolean;
  badge: ConfidenceBadge;
  aplicar_disabled: boolean;
}

export function mapConfidenceToCheckboxState(confidence: number): ConfidenceMapping {
  if (confidence >= 95) return { pre_marcado: true, badge: 'alta', aplicar_disabled: false };
  if (confidence >= 80) return { pre_marcado: true, badge: 'revisar', aplicar_disabled: false };
  if (confidence >= 60) return { pre_marcado: false, badge: 'verificar', aplicar_disabled: false };
  return { pre_marcado: false, badge: 'baixa', aplicar_disabled: true };
}

export const BADGE_STYLES: Record<ConfidenceBadge, string> = {
  alta: 'bg-emerald-100 text-emerald-700',
  revisar: 'bg-amber-100 text-amber-700',
  verificar: 'bg-orange-100 text-orange-700',
  baixa: 'bg-slate-100 text-slate-500',
};

export const BADGE_LABELS: Record<ConfidenceBadge, string> = {
  alta: 'Alta confiança',
  revisar: 'Revisar',
  verificar: 'Verificar',
  baixa: 'Baixa confiança',
};

export const SEVERIDADE_STYLES: Record<string, string> = {
  critica: 'text-red-600',
  alta: 'text-orange-600',
  media: 'text-yellow-600',
  baixa: 'text-slate-400',
};

export const SEVERIDADE_LABELS: Record<string, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};
