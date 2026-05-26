/**
 * Mapper V6: Ficha Financeira Via Varejo / Casa Bahia.
 *
 * V3 (2026-05-26): cutoff posicional (até 0833 inclusive) +
 * classificação via ontologia V2 (sync-mode seed).
 *
 * Texto nativo via pdfjs ~16ms. Sem dependência Mistral/Claude.
 */

import type { DocumentoTabular } from "../documento-tabular.ts";
import type { DeteccaoMapper, Mapper } from "./index.ts";
import { parseFichaFinanceiraDeterministico } from "../parsers/ficha-financeira-deterministic.ts";

const PARSER_VERSION = "ficha-financeira-via-varejo-mapper-v3-2026-05-26";

export interface FichaFinanceiraResultDominio {
  ano: number;
  empregado: string;
  empresa: string;
  rubricas: Array<{
    codigo: string;
    denominacao: string;
    classificacao: string;
    categoria: string;
    tipo_pjecalc: string;
    base_dsr: boolean;
    base_13: boolean;
    base_ferias: boolean;
    divergencia_juridica: boolean;
    valores_mensais: Array<{ competencia: string; valor: number }>;
  }>;
  resumo_mensal: Array<{ competencia: string; total_vencimentos: number }>;
  resumo_classificacao: {
    total_rubricas: number;
    por_categoria: Record<string, number>;
    base_dsr_comissoes_produtos_centavos: number;
    base_dsr_comissoes_servicos_centavos: number;
    base_dsr_premios_centavos: number;
    dsr_ja_pago_centavos: number;
    minimo_garantido_centavos: number;
    desconsiderado_centavos: number;
    nao_classificadas_centavos: number;
    rubricas_nao_classificadas: string[];
  };
  layout_usado: string;
  warnings: string[];
  _meta: {
    parser: string;
    linhas_processadas: number;
    linhas_filtradas: number;
    meses_detectados: string[];
  };
}

function paraCentavos(valores: Array<{ valor: number }>): number {
  return Math.round(valores.reduce((s, v) => s + v.valor, 0) * 100);
}

function buildResumoClassificacao(
  rubricas: FichaFinanceiraResultDominio['rubricas'],
): FichaFinanceiraResultDominio['resumo_classificacao'] {
  const porCategoria: Record<string, number> = {};
  let base_dsr_comissoes_produtos = 0;
  let base_dsr_comissoes_servicos = 0;
  let base_dsr_premios = 0;
  let dsr_ja_pago = 0;
  let minimo_garantido = 0;
  let desconsiderado = 0;
  let nao_classificadas = 0;
  const nomesNaoClass: string[] = [];

  for (const r of rubricas) {
    porCategoria[r.categoria] = (porCategoria[r.categoria] ?? 0) + 1;
    const centavos = paraCentavos(r.valores_mensais);

    switch (r.categoria) {
      case 'COMISSOES_PRODUTOS': base_dsr_comissoes_produtos += centavos; break;
      case 'COMISSOES_SERVICOS': base_dsr_comissoes_servicos += centavos; break;
      case 'PREMIOS': base_dsr_premios += centavos; break;
      case 'DSR_S_COMISSOES': dsr_ja_pago += centavos; break;
      case 'MINIMO_GARANTIDO':
      case 'SALARIO_SUBSTITUICAO': minimo_garantido += centavos; break;
      case 'DESCONSIDERADAS': desconsiderado += centavos; break;
      case 'NAO_CLASSIFICADO':
      default: nao_classificadas += centavos; nomesNaoClass.push(r.denominacao); break;
    }
  }

  return {
    total_rubricas: rubricas.length,
    por_categoria: porCategoria,
    base_dsr_comissoes_produtos_centavos: base_dsr_comissoes_produtos,
    base_dsr_comissoes_servicos_centavos: base_dsr_comissoes_servicos,
    base_dsr_premios_centavos: base_dsr_premios,
    dsr_ja_pago_centavos: dsr_ja_pago,
    minimo_garantido_centavos: minimo_garantido,
    desconsiderado_centavos: desconsiderado,
    nao_classificadas_centavos: nao_classificadas,
    rubricas_nao_classificadas: nomesNaoClass,
  };
}

export const mapperFichaFinanceiraViaVarejo: Mapper<FichaFinanceiraResultDominio> = {
  slug: "ficha_financeira_via_varejo_v1",
  nome: "Ficha Financeira Via Varejo / Casa Bahia",
  tipoDocumento: "ficha_financeira",

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;

    if (!/\bficha\s+financeira\b/i.test(t)) {
      return { aplica: false, score: 0, motivos: ["sem 'Ficha Financeira'"] };
    }
    motivos.push("título Ficha Financeira");
    acertos++;

    if (/\bC[óo]digo\b/i.test(t)) {
      motivos.push("header 'Código'");
      acertos++;
    } else {
      return { aplica: false, score: 0, motivos: ["sem coluna 'Código'"] };
    }

    if (/(VIA\s+VAREJO|NOVA\s+CASA\s+BAHIA)/i.test(t)) { acertos++; motivos.push("razão social VV/CB"); }
    if (/33\.?041\.?260\/?\d{4}-?\d{2}/.test(t)) { acertos++; motivos.push("CGC Via Varejo"); }
    if (/10\.?757\.?237\/?\d{4}-?\d{2}/.test(t)) { acertos++; motivos.push("CGC Casa Bahia"); }
    if (/\b(PGTO|DESC|BASE|ENCAR|PROV|INFO)\b/i.test(t)) { acertos++; motivos.push("classificações ADP"); }

    return {
      aplica: acertos >= 2,
      score: Math.min(0.40 + (acertos - 2) * 0.11, 0.95),
      motivos,
    };
  },

  mapear(doc: DocumentoTabular): FichaFinanceiraResultDominio | null {
    const warnings: string[] = [];
    const resultado = parseFichaFinanceiraDeterministico(doc.textoCompleto);
    if (!resultado || resultado.rubricas.length === 0) return null;

    if (!resultado.ano || resultado.ano < 2000 || resultado.ano > 2100) {
      warnings.push(`Ano inválido: ${resultado.ano}`);
    }

    const resumo_classificacao = buildResumoClassificacao(resultado.rubricas);

    return {
      ano: resultado.ano,
      empregado: resultado.empregado,
      empresa: resultado.empresa,
      rubricas: resultado.rubricas,
      resumo_mensal: resultado.resumo_mensal,
      resumo_classificacao,
      layout_usado: PARSER_VERSION,
      warnings,
      _meta: resultado._meta,
    };
  },
};
