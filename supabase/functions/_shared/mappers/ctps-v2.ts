/**
 * mapperCtpsV2 — adapta o pipeline V6 ao parser CTPS V2.
 *
 * Recebe `DocumentoTabular` (saída do extrator geométrico) e roda o
 * `parseFichaAnotacoes` sobre o texto. Quando sucesso, devolve um objeto
 * combinado: shape legacy no top-level (pra back-compat) + `ctps_v2`
 * aninhado com a estrutura completa V2.
 *
 * Validação `pareceDegradado` força null quando seções detectadas vêm
 * vazias — sinal de OCR ruim, força fallback pro mapperCtps legacy.
 *
 * NOTA: este mapper NÃO está plugado no dispatcher na Fase 5.1 (decisão
 * de escopo — pipeline V6 integration é backlog). Função disponível pra
 * uso futuro quando UI consumir parsed.ctps_v2.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { CtpsDominioLegacy, FeriasDominio, FaltaDominio } from '../tipos-dominio.ts';
import type { CtpsDominioV2 } from '../tipos-dominio.ts';
import { parseFichaAnotacoes } from '../parsers/ctps-v2/parser.ts';
import { detectarEmissor } from '../parsers/ctps-v2/detectar.ts';
import { pareceDegradado } from '../parsers/ctps-v2/parece-degradado.ts';

const PARSER_VERSION = 'ctps-v2-mapper-2026-05-28';

export interface CtpsCombinado extends CtpsDominioLegacy {
  ctps_v2: CtpsDominioV2;
}

export const mapperCtpsV2: Mapper<CtpsCombinado> = {
  slug: 'ctps_v2',
  nome: 'CTPS V2 — Ficha de Anotações ADP-Web/SAP (paridade total)',
  tipoDocumento: 'ctps',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const emissor = detectarEmissor(doc.textoCompleto);
    if (emissor === 'ADP-Web' || emissor === 'SAP') {
      return {
        aplica: true,
        score: 1.0,
        motivos: [`Ficha de Anotações ${emissor} (V2)`],
      };
    }
    return { aplica: false, score: 0, motivos: [] };
  },

  mapear(doc: DocumentoTabular): CtpsCombinado | null {
    const texto = doc.textoCompleto;
    const v2 = parseFichaAnotacoes(texto);
    if (!v2) return null;
    if (pareceDegradado(texto, v2)) return null;
    return montarCombinado(v2);
  },
};

/**
 * Constrói o shape combinado: deriva os 6 campos legacy do V2 + aninha V2 completo.
 * Exposto pra reuso no caminho de export (per-doc/index.ts).
 */
export function montarCombinado(v2: CtpsDominioV2): CtpsCombinado {
  const ferias: FeriasDominio[] = v2.historico_ferias.map((f) => ({
    relativa: `${f.periodo_aquisitivo_inicio.slice(6)}/${f.periodo_aquisitivo_fim.slice(6)}`,
    prazo: 30,
    situacao: 'G' as const,
    dobra_geral: false,
    abono: f.abono_dias > 0,
    dias_abono: f.abono_dias,
    gozo1: { inicio: f.periodo_gozo_inicio, fim: f.periodo_gozo_fim, dobra: false },
    gozo2: null,
    gozo3: null,
  }));

  const faltas: FaltaDominio[] = [
    ...v2.afastamentos_outros,
    ...v2.afastamentos.filter((a) => a.retorno),
  ].map((a) => ({
    data_inicio: a.data_inicio,
    data_fim: a.retorno ?? a.data_inicio,
    justificada: a.categoria === 'atestado_medico',
    reiniciar_periodo_aquisitivo: false,
    justificativa: a.situacao,
  }));

  return {
    matricula: v2.dados_empregado.matricula || null,
    admissao: v2.dados_empregado.admissao || null,
    demissao: v2.dados_empregado.data_desligamento,
    demissao_com_projecao_aviso: v2.dados_empregado.data_desligamento_com_projecao_aviso,
    cargo: v2.funcao_atual.cargo || null,
    empregador: v2.local_trabalho.estabelecimento || null,
    cnpj: v2.local_trabalho.cnpj || null,
    ferias,
    faltas,
    historico_salarial: v2.historico_salarial.map((h) => ({
      data_inicio: h.data_vigencia,
      data_fim: h.data_vigencia,
      descricao: h.motivo,
      valor: h.min_garantido ?? h.sal_tarefa ?? 0,
    })),
    _meta: {
      parser: `${PARSER_VERSION}+derivado`,
      ferias_detectadas: ferias.length,
      faltas_detectadas: faltas.length,
    },
    ctps_v2: v2,
  };
}
