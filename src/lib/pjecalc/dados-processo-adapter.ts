/**
 * Adapter "Dados do Processo" → input do PjeCalcEngineV3 (Seção 1).
 *
 * Os campos de identificação/partes da tela são majoritariamente metadados
 * (relatórios), NÃO entram no cálculo financeiro. Os que CHEGAM ao input do
 * engine (PjeParametros) são:
 *   - data_citacao  → engineParams.data_citacao   (split IPCA-E/SELIC — ADC 58)
 *   - modo_calculo  → engineParams.modo_calculo    ('assisted_from_pjc'|'independent')
 *   - valor_causa   → engineParams.valor_da_causa  (campo do contrato de input)
 *
 * Extraído de orchestrator.ts (inline) p/ ser testável de forma isolada.
 * NÃO altera o motor — apenas mapeia input (Eng. Integração).
 * Ver docs/specs/dados-do-processo.md §5.
 */
import type { PjeParametros } from "./engine-types";
import type { PjecalcDadosProcessoRow } from "./types";

export function applyDadosProcessoToEngineParams(
  engineParams: PjeParametros,
  dp: PjecalcDadosProcessoRow | null,
): PjeParametros {
  if (dp?.data_citacao) {
    engineParams.data_citacao = dp.data_citacao;
  }
  // modo_calculo agora é coluna real; default 'independent' (paridade c/ orchestrator).
  engineParams.modo_calculo = dp?.modo_calculo ?? "independent";
  // valor da causa: campo do contrato de input. Conversão p/ number ocorre só
  // na fronteira (o tipo do engine é number); não é usado em cálculo monetário.
  if (dp?.valor_causa != null && engineParams.valor_da_causa == null) {
    const n = typeof dp.valor_causa === "number" ? dp.valor_causa : Number(dp.valor_causa);
    if (Number.isFinite(n)) engineParams.valor_da_causa = n;
  }
  return engineParams;
}
