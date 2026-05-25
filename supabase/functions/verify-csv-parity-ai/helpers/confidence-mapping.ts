export function mapConfidenceToCheckboxState(confidence: number): {
  pre_marcado: boolean;
  badge: "alta" | "revisar" | "verificar" | "baixa";
  aplicar_disabled: boolean;
} {
  if (confidence >= 95) return { pre_marcado: true, badge: "alta", aplicar_disabled: false };
  if (confidence >= 80) return { pre_marcado: true, badge: "revisar", aplicar_disabled: false };
  if (confidence >= 60) return { pre_marcado: false, badge: "verificar", aplicar_disabled: false };
  return { pre_marcado: false, badge: "baixa", aplicar_disabled: true };
}
