/**
 * useCalculoAtivo — resolve o `calculo_id` ativo de um `case_id` para
 * uso nas queries/mutations dos módulos da calculadora.
 *
 * Por que isso existe: o motor de cálculo (`pjecalc/orchestrator.ts`,
 * `pjc-persist.ts`) lê TODAS as tabelas filhas (`pjecalc_apuracao_diaria`,
 * `pjecalc_faltas`, `pjecalc_ferias`, `pjecalc_hist_salarial`,
 * `pjecalc_hist_salarial_mes`, ...) filtrando por `calculo_id`. Inserts
 * com `calculo_id=NULL` ficam órfãos — aparecem na UI quando filtramos
 * por `case_id`, mas o motor de cálculo NUNCA os enxerga.
 *
 * Garantias:
 *   - Se não existir cálculo para o caso, cria um vazio (status=rascunho,
 *     ativo=true) usando o usuário atualmente autenticado.
 *   - Mantém o valor em cache no react-query (`["calculo_ativo", caseId]`)
 *     para evitar criar múltiplos cálculos em paralelo.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureCalculoAtivo } from "@/features/auto-fill/auto-fill-from-ocr";

export function useCalculoAtivo(caseId: string | undefined | null) {
  return useQuery({
    queryKey: ["calculo_ativo", caseId],
    enabled: !!caseId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string> => {
      if (!caseId) throw new Error("caseId ausente");
      // Prefere o cálculo marcado como ativo; se não houver, pega o mais
      // recente; só cria se REALMENTE não houver nenhum (auto-fill via
      // OCR usa o mesmo helper).
      const { data: ativos } = await supabase
        .from("pjecalc_calculos")
        .select("id, ativo, created_at")
        .eq("case_id", caseId)
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (ativos && ativos.length > 0) return (ativos[0] as { id: string }).id;

      const { data: qualquer } = await supabase
        .from("pjecalc_calculos")
        .select("id")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (qualquer && qualquer.length > 0)
        return (qualquer[0] as { id: string }).id;

      return ensureCalculoAtivo(caseId);
    },
  });
}
