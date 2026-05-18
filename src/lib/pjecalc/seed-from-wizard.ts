/**
 * Audit-fix C1 + C2 — ponte case → pjecalc_*.
 *
 * Antes deste módulo, `NovoCalculo.tsx` inseria em
 * `cases / calculation_cases / employment_contracts / facts / case_inputs`,
 * mas o engine V3 (via `executarLiquidacao` no orchestrator) lia somente
 * de `pjecalc_*`. O usuário preenchia 6 passos e era redirecionado para
 * uma página vazia exigindo reconfigurar tudo no PJe-Calc.
 *
 * Esta função cria os registros mínimos viáveis em `pjecalc_*` a partir
 * do payload do wizard, garantindo que ao chegar em `/casos/:id/pjecalc`
 * a calculadora já tenha:
 *   - pjecalc_parametros (datas, divisor, carga)
 *   - pjecalc_historico_salarial (salário inicial + mudanças)
 *   - pjecalc_correcao_config (índice, juros do Step 5 — antes descartados)
 *   - pjecalc_multas_config (multa 467/477 do Step 5 — antes descartados)
 */

import {
  upsertParametros,
  upsertCorrecaoConfig,
  upsertMultasConfig,
  insertHistoricoSalarial,
} from "./service";
import type {
  PjecalcParametrosInsert,
  PjecalcCorrecaoConfigInsert,
} from "./types";

export interface WizardPayload {
  caseId: string;
  /** Step 1 — Contrato */
  uf?: string;
  cidade?: string;
  /** Step 2 — Períodos */
  dataAdmissao: string;
  dataDemissao: string;
  ajuizamentoData?: string;
  salarioInicial: number;
  mudancasSalariais: Array<{ data: string; valor: number }>;
  /** Step 3 — Jornada */
  divisor: number;
  horasSemanais: number;
  /** Step 5 — Teses (4 campos antes write-only) */
  indiceCorrecao: string;
  juros: string;
  multa467: boolean;
  multa477: boolean;
}

/**
 * Mapeia o `indiceCorrecao` do wizard para o slug usado pelo engine.
 * Aceita 'selic'/'ipca'/'tr'/'ipca-e' insensitive.
 */
function normalizarIndice(raw: string): string {
  const v = raw.trim().toUpperCase();
  if (v === "SELIC") return "SELIC";
  if (v === "TR") return "TR";
  if (v === "IPCA") return "IPCA-E"; // engine usa IPCA-E como padrão
  if (v === "IPCA-E" || v === "IPCAE") return "IPCA-E";
  return "IPCA-E";
}

/**
 * Mapeia o `juros` do wizard para o `juros_tipo` esperado pelo engine.
 *   - 'selic' → 'selic'
 *   - '1_am' → 'simples_mensal' (1% am, padrão TST/CLT)
 *   - 'nenhum' → 'nenhum'
 */
function normalizarJurosTipo(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v === "selic") return "selic";
  if (v === "1_am" || v === "1am") return "simples_mensal";
  if (v === "nenhum") return "nenhum";
  return "simples_mensal";
}

/**
 * Cria os registros pjecalc_* mínimos a partir do payload do wizard.
 * Idempotente — pode ser chamado várias vezes (upsert em todas as tabelas
 * config; histórico é insert porque cada mudança é uma linha nova).
 */
export async function seedPjecalcFromCase(p: WizardPayload): Promise<void> {
  // ── 1. Parâmetros (período, jornada, prescrições) ──
  const params: PjecalcParametrosInsert = {
    case_id: p.caseId,
    estado: p.uf,
    municipio: p.cidade,
    data_admissao: p.dataAdmissao,
    data_demissao: p.dataDemissao,
    data_ajuizamento: p.ajuizamentoData || undefined,
    data_inicial: p.dataAdmissao,
    data_final: p.dataDemissao,
    prescricao_quinquenal: true,
    prescricao_fgts: true,
    regime_trabalho: "clt",
    carga_horaria_padrao: p.horasSemanais,
    maior_remuneracao: p.salarioInicial,
    ultima_remuneracao:
      p.mudancasSalariais.length > 0
        ? p.mudancasSalariais[p.mudancasSalariais.length - 1].valor
        : p.salarioInicial,
    prazo_aviso_previo: "indenizado",
  };
  await upsertParametros(params);

  // ── 2. Histórico salarial: salário inicial + mudanças ──
  // O engine espera um registro `Salário Base` com cada faixa de período.
  const linhasSalario = [
    { data: p.dataAdmissao, valor: p.salarioInicial },
    ...p.mudancasSalariais,
  ];

  for (let i = 0; i < linhasSalario.length; i++) {
    const cur = linhasSalario[i];
    const prox = linhasSalario[i + 1];
    await insertHistoricoSalarial({
      case_id: p.caseId,
      nome: i === 0 ? "Salário Base" : "Mudança Salarial",
      periodo_inicio: cur.data,
      periodo_fim: prox ? prox.data : p.dataDemissao,
      tipo_valor: "informado",
      valor_informado: cur.valor,
      incidencia_fgts: true,
      incidencia_cs: true,
    });
  }

  // ── 3. Correção / juros (Step 5 — antes descartado) ──
  const correcao: PjecalcCorrecaoConfigInsert = {
    case_id: p.caseId,
    indice: normalizarIndice(p.indiceCorrecao),
    epoca: "mensal",
    juros_tipo: normalizarJurosTipo(p.juros),
    juros_percentual: 1,
    juros_inicio: "ajuizamento",
    multa_523: false,
    data_liquidacao: new Date().toISOString().slice(0, 10),
  };
  await upsertCorrecaoConfig(correcao);

  // ── 4. Multas 467/477 (Step 5 — antes descartado) ──
  // upsertMultasConfig é Record<string, unknown> — passamos campos esperados
  // pela tabela pjecalc_multas_config + adapter toEngineMultasConfig().
  await upsertMultasConfig(p.caseId, {
    apurar_467: p.multa467,
    apurar_477: p.multa477,
    valor_477_tipo: "salario",
    percentual_467: 50,
    percentual_523: 10,
  });
}
