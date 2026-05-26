/**
 * Mapper: Ficha Financeira Via Varejo / Casa Bahia (V6).
 *
 * Sprint 3 OCR (2026-05-26): substitui caminho Claude Vision pra Ficha
 * Financeira. Claude com PDF nativo demora ~43s/página (Ficha de 5pg
 * estoura edge timeout 150s). Texto nativo via pdfjs é ~16ms.
 *
 * Estratégia:
 *   1. Detector reconhece Ficha Financeira ADP (Via Varejo / Casa Bahia)
 *      via título, CGCs conhecidos, e classificações ADP no corpo.
 *   2. Mapeamento delega TUDO ao `parseFichaFinanceiraDeterministico`
 *      existente em `_shared/parsers/ficha-financeira-deterministic.ts`
 *      (~470 linhas, já testado e validado contra 30 rubricas do ROQUE
 *      2016 com paridade 100%).
 *
 * NÃO REESCREVE o parser. O mapper é apenas a casca V6 — detecta tipo e
 * passa o textoCompleto pro parser. Saída idêntica ao path Mistral OCR
 * antigo (mesma shape de `parsed jsonb` no banco).
 */

import type { DocumentoTabular } from "../documento-tabular.ts";
import type { DeteccaoMapper, Mapper } from "./index.ts";
import { parseFichaFinanceiraDeterministico } from "../parsers/ficha-financeira-deterministic.ts";

const PARSER_VERSION = "ficha-financeira-via-varejo-mapper-v1-2026-05-26";

export interface FichaFinanceiraResultDominio {
  ano: number;
  empregado: string;
  empresa: string;
  rubricas: Array<{
    codigo: string;
    denominacao: string;
    classificacao: string;
    categoria: string;
    valores_mensais: Array<{ competencia: string; valor: number }>;
  }>;
  resumo_mensal: Array<{ competencia: string; total_vencimentos: number }>;
  layout_usado: string;
  warnings: string[];
  _meta: {
    parser: string;
    linhas_processadas: number;
    linhas_filtradas: number;
    meses_detectados: string[];
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

    const ehFichaFinanceira = /\bficha\s+financeira\b/i.test(t);
    if (!ehFichaFinanceira) {
      return {
        aplica: false,
        score: 0,
        motivos: ["sem 'Ficha Financeira' no texto"],
      };
    }
    motivos.push("título Ficha Financeira presente");
    acertos++;

    if (/\bC[óo]digo\b/i.test(t)) {
      motivos.push("header 'Código' presente");
      acertos++;
    } else {
      return {
        aplica: false,
        score: 0,
        motivos: ["título OK mas sem coluna 'Código' (estrutura ADP)"],
      };
    }

    if (/(VIA\s+VAREJO|NOVA\s+CASA\s+BAHIA)/i.test(t)) {
      acertos++;
      motivos.push("razão social VV/CB");
    }
    if (/10\.?757\.?237\/?\d{4}-?\d{2}/.test(t)) {
      acertos++;
      motivos.push("CGC Casa Bahia (10.757.237)");
    }
    if (/33\.?041\.?260\/?\d{4}-?\d{2}/.test(t)) {
      acertos++;
      motivos.push("CGC Via Varejo (33.041.260)");
    }

    if (/\b(PGTO|DESC|BASE|ENCAR|PROV|INFO)\b/i.test(t)) {
      acertos++;
      motivos.push("classificações ADP (PGTO/DESC/BASE/ENCAR)");
    }

    const score = Math.min(0.40 + (acertos - 2) * 0.11, 0.95);
    return {
      aplica: acertos >= 2,
      score,
      motivos,
    };
  },

  mapear(doc: DocumentoTabular): FichaFinanceiraResultDominio | null {
    const warnings: string[] = [];

    const resultado = parseFichaFinanceiraDeterministico(doc.textoCompleto);

    if (!resultado) {
      return null;
    }

    if (resultado.rubricas.length === 0) {
      warnings.push(
        "Parser reconheceu Ficha Financeira mas extraiu 0 rubricas. " +
          "Layout pode ter divergência ou PDF tem só metadados.",
      );
      return null;
    }
    if (!resultado.ano || resultado.ano < 2000 || resultado.ano > 2100) {
      warnings.push(
        `Ano inválido extraído (${resultado.ano}). Esperado 2000-2100. ` +
          "Layout pode ter campo de competência fora do padrão.",
      );
    }

    return {
      ano: resultado.ano,
      empregado: resultado.empregado,
      empresa: resultado.empresa,
      rubricas: resultado.rubricas,
      resumo_mensal: resultado.resumo_mensal,
      layout_usado: PARSER_VERSION,
      warnings,
      _meta: resultado._meta,
    };
  },
};
