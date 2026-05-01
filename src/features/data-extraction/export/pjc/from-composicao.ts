/**
 * Converte os outputs dos composers (historico-salarial / ferias / faltas /
 * cartao-ponto) em um PjcCalculoData pronto pro builder do .pjc.
 *
 * Centraliza:
 *   - Mapeamento de SituacaoFerias ('G'|'GP'|'NG'|'I'|'P') → string longa
 *     ('GOZADAS'|'GOZADAS_PARCIALMENTE'|...)
 *   - Aplicação dos flags de incidência (CategoriaIncidenciaConfig) por linha
 *     de histórico salarial
 *   - Soma dos valores por competência (já feito pelo composeHistoricoSalarial,
 *     só passamos adiante)
 */
import type {
  CategoriaIncidenciaConfig,
  ComposicaoFaltas,
  ComposicaoFerias,
  HistoricoCsvPayload,
  LinhaHistoricoSalarial,
  SituacaoFerias,
} from "../../types";
import type { ComposicaoCartoesPonto } from "../../composer/cartao-ponto";
import type {
  PjcCalculoData,
  PjcFalta,
  PjcFerias,
  PjcHistoricoSalarial,
  PjcMeta,
} from "./builder";

export type BuildPjcInput = {
  meta: PjcMeta;
  historicos: Array<{
    nomePjecalc: string;
    linhas: LinhaHistoricoSalarial[];
    config: CategoriaIncidenciaConfig;
  }>;
  ferias: ComposicaoFerias;
  faltas: ComposicaoFaltas;
  cartoes: ComposicaoCartoesPonto;
};

export function buildPjcCalculoData(input: BuildPjcInput): PjcCalculoData {
  const historicosSalariais: PjcHistoricoSalarial[] = input.historicos
    .filter((h) => h.linhas.length > 0)
    .map((h) => {
      const isIndenizatoria = h.config.natureza_indenizatoria;
      const incideFGTS = isIndenizatoria ? false : h.config.incide_fgts;
      const incideINSS = isIndenizatoria ? false : h.config.incide_inss;
      const recolFGTS = isIndenizatoria ? false : h.config.fgts_recolhido;
      const recolINSS = isIndenizatoria ? false : h.config.inss_recolhido;
      return {
        nome: h.nomePjecalc,
        incidenciaFGTS: incideFGTS,
        incidenciaINSS: incideINSS,
        aplicarProporcionalidadeFGTS: false,
        aplicarProporcionalidadeINSS: false,
        ocorrencias: h.linhas.map((l) => ({
          competencia: l.competencia,
          valor: l.valor,
          recolhidoFGTS: recolFGTS,
          recolhidoINSS: recolINSS,
        })),
      };
    });

  const ferias: PjcFerias[] = input.ferias.linhas.map((f) => ({
    relativa: f.relativa,
    prazo: f.prazo,
    situacao: mapSituacao(f.situacao),
    dobraGeral: f.dobra_geral,
    abono: f.abono,
    diasAbono: f.dias_abono,
    gozo1: f.gozo1,
    gozo2: f.gozo2,
    gozo3: f.gozo3,
    dataAdmissaoBase: input.meta.data_admissao,
  }));

  const faltas: PjcFalta[] = input.faltas.linhas.map((f) => ({
    data_inicial: f.data_inicio,
    data_final: f.data_fim,
    justificada: f.justificada,
    reiniciaPeriodoAquisitivo: f.reiniciar_periodo_aquisitivo,
    justificativa: f.justificativa,
  }));

  return {
    meta: input.meta,
    historicosSalariais,
    ferias,
    faltas,
    cartoesDePonto: input.cartoes.cartoes,
  };
}

function mapSituacao(s: SituacaoFerias): PjcFerias["situacao"] {
  switch (s) {
    case "G":
      return "GOZADAS";
    case "GP":
      return "GOZADAS_PARCIALMENTE";
    case "NG":
      return "NAO_GOZADAS";
    case "I":
      return "INDENIZADAS";
    case "P":
      return "PERDIDAS";
  }
}

/**
 * Helper para construir o vetor de `historicos` esperado pelo builder a
 * partir de `HistoricoCsvPayload[]`. Mantém compatibilidade com o
 * ComposicaoCsvDialog legado (que monta CSVs).
 */
export function payloadsToHistoricos(
  payloads: HistoricoCsvPayload[],
  linhasByCategoria: Map<string, LinhaHistoricoSalarial[]>,
): BuildPjcInput["historicos"] {
  return payloads.map((p) => ({
    nomePjecalc: p.nomePjecalc,
    linhas: linhasByCategoria.get(p.slug) ?? [],
    config: p.config,
  }));
}
