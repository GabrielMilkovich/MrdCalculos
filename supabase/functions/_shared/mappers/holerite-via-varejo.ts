/**
 * Mapper: Holerite Via Varejo / Casa Bahia (V6).
 *
 * Lê a tabela de rubricas detectada pelo extrator geométrico
 * (`doc.paginas[*].tabelas[]`) e produz `HoleriteResultDominio` sem
 * depender de OCR Mistral nem de regex sobre texto colapsado.
 *
 * Estratégia (3 etapas):
 *   1. Detecta competência pelo cabeçalho — formato "MM/yyyy" ou
 *      "Mês: MM/yyyy" no `textoCompleto`.
 *   2. Localiza a tabela com colunas "Cód", "Descrição",
 *      "Vencimentos|Proventos", "Descontos" — pelo menos 3 das 4
 *      precisam casar para considerar uma tabela como "tabela de rubricas".
 *   3. Para cada linha de dados, mapeia células às colunas pelo índice
 *      detectado. Trata centavos com vírgula brasileira e sinal de moeda.
 *
 * Quando alguma etapa falha (sem competência, sem tabela compatível,
 * 0 rubricas extraídas), retorna `null` — pipeline cai no parser regex V5.
 */

import type { CelulaTabular, DocumentoTabular, TabelaDetectada } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { HoleriteResultDominio, RubricaDominio } from '../tipos-dominio.ts';

const PARSER_VERSION = 'holerite-via-varejo-mapper-v6-2026-05-08';

const RE_COMPETENCIA = /\b(0[1-9]|1[0-2])\/(\d{4})\b/;

// Headers de coluna em ordem aproximada de aparição no holerite VV.
// Cada padrão é independente — match parcial em qualquer cabeçalho.
// Patterns aceitam plural (s$ opcional) — "Vencimentos", "Descontos",
// "Proventos" são as formas mais comuns nos cabeçalhos.
// Cobrem variantes com cedilha ("Descrição") e sem ("Descricao").
const PATTERN_COD = /\b(c[óo]d|c[óo]digo)s?\b/i;
const PATTERN_DESC = /\b(descri[çc][ãa]o|descricao|descric|nome|rubrica)s?\b/i;
const PATTERN_QTD = /\b(qtd|quant|quantidade|refer[êe]ncia)s?\b/i;
const PATTERN_VENC = /\b(vencimento|provento|cr[ée]dito|valor)s?\b/i;
const PATTERN_DESC_VAL = /\b(desconto|d[ée]bito)s?\b/i;

interface MapaColunas {
  codigo: number | null;
  nome: number | null;
  quantidade: number | null;
  vencimento: number | null;
  desconto: number | null;
}

/**
 * Identifica em qual coluna cada campo está. Retorna null se headers
 * essenciais (nome + (vencimento OU desconto)) não casam.
 */
function mapearColunas(headers: string[]): MapaColunas | null {
  const mapa: MapaColunas = {
    codigo: null,
    nome: null,
    quantidade: null,
    vencimento: null,
    desconto: null,
  };
  headers.forEach((h, idx) => {
    const txt = h.trim();
    if (mapa.codigo === null && PATTERN_COD.test(txt)) mapa.codigo = idx;
    else if (mapa.nome === null && PATTERN_DESC.test(txt)) mapa.nome = idx;
    else if (mapa.quantidade === null && PATTERN_QTD.test(txt)) mapa.quantidade = idx;
    else if (mapa.vencimento === null && PATTERN_VENC.test(txt)) mapa.vencimento = idx;
    else if (mapa.desconto === null && PATTERN_DESC_VAL.test(txt)) mapa.desconto = idx;
  });
  // nome é obrigatório; pelo menos um valor (vencimento ou desconto) também.
  if (mapa.nome === null) return null;
  if (mapa.vencimento === null && mapa.desconto === null) return null;
  return mapa;
}

/** Score de "probabilidade de ser tabela de rubricas". */
function scoreTabelaRubricas(headers: string[]): number {
  let acertos = 0;
  if (headers.some((h) => PATTERN_COD.test(h))) acertos++;
  if (headers.some((h) => PATTERN_DESC.test(h))) acertos++;
  if (headers.some((h) => PATTERN_VENC.test(h))) acertos++;
  if (headers.some((h) => PATTERN_DESC_VAL.test(h))) acertos++;
  return acertos;
}

/**
 * Converte texto de valor monetário BR ("1.234,56", "R$ 50,00", "")
 * em number. Retorna null quando não casa nada.
 */
function parseValorBR(txt: string | undefined): number | null {
  if (!txt) return null;
  const limpo = txt
    .replace(/[Rr]\$/g, '')
    .replace(/\s+/g, '')
    .trim();
  if (limpo === '' || limpo === '-' || limpo === '0,00' || limpo === '0') {
    return null;
  }
  // Aceita "1.234,56" (PT) e "1234.56" (US, fallback).
  const ptBR = /^-?\d{1,3}(\.\d{3})*(,\d{1,4})?$/;
  const us = /^-?\d+(\.\d{1,4})?$/;
  let n: number;
  if (ptBR.test(limpo)) {
    n = parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
  } else if (us.test(limpo)) {
    n = parseFloat(limpo);
  } else {
    return null;
  }
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function celulaToTexto(c: CelulaTabular | undefined): string {
  return c?.texto?.trim() ?? '';
}

/**
 * Extrai competência do textoCompleto. Procura "MM/yyyy" precedido por
 * "MÊS", "COMP", "REFERÊNCIA" ou na primeira ocorrência válida.
 */
function extrairCompetencia(texto: string): string | null {
  // Prefere ocorrência próxima a marcadores explícitos.
  const reMarcado =
    /(M[ÊE]S\s*\/?\s*ANO|COMPET[ÊE]NCIA|REFER[ÊE]NCIA)[\s:]*?(0[1-9]|1[0-2])\/(\d{4})/i;
  const m1 = texto.match(reMarcado);
  if (m1) return `${m1[2]}/${m1[3]}`;
  const m2 = texto.match(RE_COMPETENCIA);
  if (m2) return `${m2[1]}/${m2[2]}`;
  return null;
}

/**
 * Procura, entre todas as tabelas das páginas, a "tabela de rubricas"
 * com maior score de match nos headers.
 */
function escolherTabelaRubricas(doc: DocumentoTabular): TabelaDetectada | null {
  let melhor: TabelaDetectada | null = null;
  let melhorScore = 0;
  for (const pagina of doc.paginas) {
    for (const tab of pagina.tabelas) {
      const s = scoreTabelaRubricas(tab.headers);
      // 2 sinais bastam (ex: "Descrição" + "Vencimentos") porque
      // `mapearColunas` exige nome + valor pra aceitar a tabela.
      if (s >= 2 && s > melhorScore) {
        melhor = tab;
        melhorScore = s;
      }
    }
  }
  return melhor;
}

export const mapperHoleriteViaVarejo: Mapper<HoleriteResultDominio> = {
  slug: 'holerite_via_varejo_v1',
  nome: 'Holerite Via Varejo / Casa Bahia',
  tipoDocumento: 'holerite',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;

    // Sinal MANDATÓRIO — sem título de holerite, NÃO é holerite (cartão
    // de ponto da Via Varejo também tem 'VIA VAREJO' + CGC e dispararia
    // falso positivo). Mesma lógica do fix do detector cartão V5.1.
    const ehHolerite = /(HOLERITE|RECIBO\s+DE\s+PAGAMENTO|CONTRACHEQUE|FOLHA\s+DE\s+PAGAMENTO)/i
      .test(t);
    if (!ehHolerite) {
      return {
        aplica: false,
        score: 0,
        motivos: ['sem título holerite/recibo/contracheque/folha'],
      };
    }
    motivos.push('título holerite/recibo/contracheque/folha');
    acertos++;

    if (/(VIA\s+VAREJO|NOVA\s+CASA\s+BAHIA)/i.test(t)) {
      acertos++;
      motivos.push('razão social VV/CB');
    }
    if (/VENCIMENTOS\b[\s\S]*?DESCONTOS\b/i.test(t)) {
      acertos++;
      motivos.push('colunas vencimentos/descontos');
    }
    if (/10\.?757\.?237\/?\d{4}-?\d{2}/.test(t)) {
      acertos++;
      motivos.push('CGC Casa Bahia');
    }
    if (/33\.?041\.?260\/?\d{4}-?\d{2}/.test(t)) {
      acertos++;
      motivos.push('CGC Via Varejo');
    }
    return {
      aplica: acertos >= 2,
      score: Math.min(acertos / 5, 0.95),
      motivos,
    };
  },

  mapear(doc: DocumentoTabular): HoleriteResultDominio | null {
    const warnings: string[] = [];

    const competencia = extrairCompetencia(doc.textoCompleto);
    if (!competencia) {
      // Sem competência válida, holerite não vai pra histórico salarial.
      // Pipeline cai pro V5 que pode ter heurística mais frouxa.
      return null;
    }

    const tabela = escolherTabelaRubricas(doc);
    if (!tabela) return null;

    const colunas = mapearColunas(tabela.headers);
    if (!colunas) return null;

    const rubricas: RubricaDominio[] = [];
    tabela.linhas.forEach((linha, idx) => {
      const celulaPorCol = (i: number | null): CelulaTabular | undefined =>
        i === null ? undefined : linha[i];
      const nome = celulaToTexto(celulaPorCol(colunas.nome));
      if (!nome) return; // linha de subtotal/separador

      const codigo = celulaToTexto(celulaPorCol(colunas.codigo)) || null;
      const valor_vencimento = parseValorBR(
        celulaToTexto(celulaPorCol(colunas.vencimento)),
      );
      const valor_desconto = parseValorBR(
        celulaToTexto(celulaPorCol(colunas.desconto)),
      );
      const quantidade = parseValorBR(
        celulaToTexto(celulaPorCol(colunas.quantidade)),
      );

      // Linha que não tem nem vencimento nem desconto não é rubrica real
      // (provavelmente totalizador) — pula.
      if (valor_vencimento === null && valor_desconto === null) return;

      rubricas.push({
        codigo,
        nome,
        valor_vencimento,
        valor_desconto,
        quantidade,
        ordem: idx + 1,
      });
    });

    if (rubricas.length === 0) {
      warnings.push(
        'Tabela de rubricas detectada mas nenhuma linha pôde ser parseada.',
      );
      return null;
    }

    return {
      competencia,
      rubricas,
      layout_usado: PARSER_VERSION,
      warnings,
    };
  },
};
