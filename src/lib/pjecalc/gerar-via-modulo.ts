/**
 * Sessão 4b — Adapter que usa os 35 verba-modules registrados para
 * gerar ocorrências por competência.
 *
 * Bridge entre o `gerar-ocorrencias-from-scratch.ts` (genérico) e os
 * verba-modules (lógica jurídica refinada — Súmula 340 TST, Art. 73
 * §1° CLT, Art. 384 CLT, faixas específicas etc).
 *
 * Estratégia de integração CAUTELOSA:
 *   1. `detectarVerbaModuleId(verba)` retorna o moduleId aplicável
 *   2. `gerarViaModulo(verba, mod, dadosGlobais)` itera competências da verba
 *   3. Para cada competência, monta `VerbaModuleContext`, chama
 *      `mod.canApply()` + `mod.resolveInputs()` + `mod.applyFormula()`
 *   4. Devolve OcorrenciaPrecomputada[] no formato esperado pelo engine V3
 *
 * Quando o módulo retorna 0 ou ocorrência inválida, o caller pode optar
 * por fallback no gerador genérico (preservar paridade dos PJCs reais).
 */
import type {
  PjeVerba,
  PjeHistoricoSalarial,
  PjeCartaoPonto,
  PjeParametros,
  PjeFerias,
  PjeFalta,
} from "./engine-types";
import { getVerbaModule } from "./verba-modules/types";
import type {
  VerbaModule,
  VerbaModuleContext,
} from "./verba-modules/types";

type OcorrenciaPrecomputada = NonNullable<PjeVerba["ocorrencias_precomputadas"]>[number];

interface DadosGlobais {
  historicos: PjeHistoricoSalarial[];
  cartao: PjeCartaoPonto[];
  faltas: PjeFalta[];
  ferias: PjeFerias[];
  parametros: PjeParametros;
}

function competenciasNoIntervalo(inicio: string, fim: string): string[] {
  const [ay, am] = inicio.split("-").map(Number);
  const [by, bm] = fim.split("-").map(Number);
  const out: string[] = [];
  let y = ay, m = am;
  while (y < by || (y === by && m <= bm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function diasNoMes(competencia: string): number {
  const [y, m] = competencia.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * Monta o VerbaModuleContext para uma competência específica.
 * Calendário (dias úteis, domingos, feriados) é uma aproximação simples
 * — o domain-orchestrator tem um cálculo mais sofisticado mas que requer
 * a tabela de feriados completa.
 */
function montarContext(
  competencia: string,
  dados: DadosGlobais,
): VerbaModuleContext {
  const [y, m] = competencia.split("-").map(Number);
  const diasNo = diasNoMes(competencia);
  let domingos = 0;
  let sabados = 0;
  for (let d = 1; d <= diasNo; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    if (dow === 0) domingos += 1;
    if (dow === 6) sabados += 1;
  }
  const sabadoUtil = dados.parametros.sabado_dia_util;
  const diasUteis = diasNo - domingos - (sabadoUtil ? 0 : sabados);

  return {
    caseId: dados.parametros.case_id,
    competencia,
    periodo: {
      inicio: dados.parametros.data_admissao,
      fim:
        dados.parametros.data_demissao ?? dados.parametros.data_ajuizamento,
    },
    admissao: dados.parametros.data_admissao,
    demissao: dados.parametros.data_demissao,
    historicos: dados.historicos,
    cartaoPonto: dados.cartao,
    faltas: dados.faltas,
    ferias: dados.ferias,
    calendario: {
      diasUteis,
      repousos: domingos,
      feriados: 0,
      diasNoMes: diasNo,
    },
    cargaHoraria: dados.parametros.carga_horaria_padrao ?? 220,
    sabadoDiaUtil: !!sabadoUtil,
    zerarNegativo: !!dados.parametros.zerar_valor_negativo,
    resultadosAnteriores: new Map(),
  };
}

/**
 * Gera OcorrenciaPrecomputada[] usando o verba-module específico.
 * Devolve [] quando o módulo não aplica para nenhuma competência.
 */
export function gerarViaModulo(
  verba: PjeVerba,
  moduleId: string,
  dados: DadosGlobais,
): OcorrenciaPrecomputada[] {
  const mod: VerbaModule | undefined = getVerbaModule(moduleId);
  if (!mod) return [];

  if (!verba.periodo_inicio || !verba.periodo_fim) return [];

  const competencias = competenciasNoIntervalo(
    verba.periodo_inicio.slice(0, 7),
    verba.periodo_fim.slice(0, 7),
  );

  // Para modos de pagamento específicos, restringir competências
  const oc = verba.ocorrencia_pagamento ?? "mensal";
  const competenciasFiltradas = competencias.filter((c) => {
    if (oc === "dezembro" && !c.endsWith("-12")) return false;
    if (oc === "desligamento") {
      const dem = dados.parametros.data_demissao?.slice(0, 7);
      return dem === c;
    }
    return true;
  });

  const out: OcorrenciaPrecomputada[] = [];

  for (const competencia of competenciasFiltradas) {
    const ctx = montarContext(competencia, dados);
    if (!mod.canApply(ctx, verba)) continue;

    const inputs = mod.resolveInputs(ctx, verba);
    if (inputs.base <= 0 && inputs.quantidade <= 0) continue;

    const resultado = mod.applyFormula(inputs, verba);
    if (!Number.isFinite(resultado) || resultado === 0) continue;

    // Engine V3 RECALCULA devido via calcularDevidoFromScratch(base,
    // divisor, multiplicador, quantidade). Para que o resultado seja
    // exatamente `resultado`, setamos base = resultado e os demais = 1.
    out.push({
      competencia,
      base: +resultado.toFixed(2),
      divisor: 1,
      multiplicador: 1,
      quantidade: 1,
      dobra: !!verba.dobrar_valor_devido,
      devido: +resultado.toFixed(2),
      pago: 0,
    });
  }

  return out;
}
