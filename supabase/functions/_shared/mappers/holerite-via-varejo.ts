/**
 * Mapper: Holerite Via Varejo / Casa Bahia (V6.2).
 *
 * 2 caminhos de extração (em ordem de tentativa):
 *   1. **Tabela detectada pelo extrator** — usa `doc.paginas[*].tabelas[]`
 *      quando o clustering geométrico produziu uma tabela com headers
 *      compatíveis (`Cód`, `Descrição`, `Vencimentos`, `Descontos`).
 *   2. **Fallback regex linha-por-linha** — quando a clusterização do
 *      extrator não produziu tabela ou os headers reais não casam (caso
 *      ADP/Via Varejo: usa `CONTA QTDE.v1 VENCIMENTOS DESCONTOS` e o nome
 *      da rubrica fica colado no código). Parser regex sobre o texto plano:
 *        `<código> <nome> | <qtde?> | <venc?> | <desc?>`.
 *
 * Detector aceita 6 sinônimos de "holerite" comuns no Brasil:
 * HOLERITE, RECIBO DE PAGAMENTO/SALÁRIO, CONTRACHEQUE, FOLHA DE PAGAMENTO,
 * DEMONSTRATIVO DE PAGAMENTO, COMPROVANTE DE PAGAMENTO.
 *
 * Calibrado com texto REAL produzido pelo `extrairGeometrico` (unpdf) em
 * produção — não fixture sintética. Dados coletados via instrumentação
 * R3 do `process-document-mistral` v15.
 */

import type { CelulaTabular, DocumentoTabular, TabelaDetectada } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { HoleriteResultDominio, RubricaDominio } from '../tipos-dominio.ts';
import { enriquecerComClassificacao } from '../ontologia-rubricas/enriquecer.ts';

const PARSER_VERSION = 'holerite-via-varejo-mapper-v7-2026-05-20';

const RE_COMPETENCIA = /\b(0[1-9]|1[0-2])\/(\d{4})\b/;

// Patterns aceitam plural + variantes ortográficas (cedilha, sem acento).
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

function mapearColunas(headers: string[]): MapaColunas | null {
  const mapa: MapaColunas = {
    codigo: null, nome: null, quantidade: null, vencimento: null, desconto: null,
  };
  headers.forEach((h, idx) => {
    const txt = h.trim();
    if (mapa.codigo === null && PATTERN_COD.test(txt)) mapa.codigo = idx;
    else if (mapa.nome === null && PATTERN_DESC.test(txt)) mapa.nome = idx;
    else if (mapa.quantidade === null && PATTERN_QTD.test(txt)) mapa.quantidade = idx;
    else if (mapa.vencimento === null && PATTERN_VENC.test(txt)) mapa.vencimento = idx;
    else if (mapa.desconto === null && PATTERN_DESC_VAL.test(txt)) mapa.desconto = idx;
  });
  if (mapa.nome === null) return null;
  if (mapa.vencimento === null && mapa.desconto === null) return null;
  return mapa;
}

function scoreTabelaRubricas(headers: string[]): number {
  let acertos = 0;
  if (headers.some((h) => PATTERN_COD.test(h))) acertos++;
  if (headers.some((h) => PATTERN_DESC.test(h))) acertos++;
  if (headers.some((h) => PATTERN_VENC.test(h))) acertos++;
  if (headers.some((h) => PATTERN_DESC_VAL.test(h))) acertos++;
  return acertos;
}

function parseValorBR(txt: string | undefined): number | null {
  if (!txt) return null;
  const limpo = txt.replace(/[Rr]\$/g, '').replace(/\s+/g, '').trim();
  if (limpo === '' || limpo === '-' || limpo === '0,00' || limpo === '0') return null;
  const ptBR = /^-?\d{1,3}(\.\d{3})*(,\d{1,4})?$/;
  const us = /^-?\d+(\.\d{1,4})?$/;
  let n: number;
  if (ptBR.test(limpo)) n = parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
  else if (us.test(limpo)) n = parseFloat(limpo);
  else return null;
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function celulaToTexto(c: CelulaTabular | undefined): string {
  return c?.texto?.trim() ?? '';
}

function extrairCompetencia(texto: string): string | null {
  const reMarcado =
    /(M[ÊE]S\s*\/?\s*ANO|COMPET[ÊE]NCIA|REFER[ÊE]NCIA)[\s:]*?(0[1-9]|1[0-2])\/(\d{4})/i;
  const m1 = texto.match(reMarcado);
  if (m1) return `${m1[2]}/${m1[3]}`;
  const m2 = texto.match(RE_COMPETENCIA);
  if (m2) return `${m2[1]}/${m2[2]}`;
  return null;
}

function escolherTabelaRubricas(doc: DocumentoTabular): TabelaDetectada | null {
  let melhor: TabelaDetectada | null = null;
  let melhorScore = 0;
  for (const pagina of doc.paginas) {
    for (const tab of pagina.tabelas) {
      const s = scoreTabelaRubricas(tab.headers);
      if (s >= 2 && s > melhorScore) {
        melhor = tab;
        melhorScore = s;
      }
    }
  }
  return melhor;
}

/**
 * Fallback: extrai rubricas linha-por-linha do `textoCompleto` quando
 * `escolherTabelaRubricas` ou `mapearColunas` falham.
 *
 * Layout suportado (ADP/Via Varejo/Casas Bahia, e similares):
 *   `<código 3-5 dígitos> <nome multi-palavra> | <qtde?> | <venc?> | <desc?>`
 *
 * Exemplos reais (texto produzido pelo unpdf):
 *   `0501 DSR(Comissão) | | 189,27 |`
 *   `0620 Comissões | | 356,21 |`
 *   `1101 Empréstimo lei 10820/03 - Santander (11/36) | | | 251,18`
 *   `5560 INSS | | | 151,43`
 *
 * State machine simples — para de capturar ao encontrar separador
 * `BASE/OUTROS` (linhas seguintes são bases de cálculo, não rubricas) e
 * retoma quando vê novo cabeçalho de holerite (próxima página).
 */
function extrairRubricasPorLinha(texto: string): RubricaDominio[] {
  const rubricas: RubricaDominio[] = [];
  const linhas = texto.split(/\r?\n/);
  let modoRubricas = true;
  let ordem = 0;
  // Dedup por chave (código + nome) — múltiplas páginas/competências
  // aparecem no mesmo doc; evita inserir 12x a mesma rubrica.
  const visto = new Set<string>();

  for (const linha of linhas) {
    // Marcadores de fim de seção de rubricas (na MESMA página).
    if (
      /BASE\s*\/\s*OUTROS/i.test(linha) ||
      /^\s*-+\s*$/.test(linha) ||
      /T\s*O\s*T\s*A\s*I\s*S/i.test(linha) ||
      /Processado\s+pela/i.test(linha) ||
      /Assinado\s+eletronicamente/i.test(linha)
    ) {
      modoRubricas = false;
      continue;
    }
    // Novo cabeçalho de holerite (ex: nova página) reabre captura.
    if (
      /(Demonstrativo\s+de\s+Pagamento|HOLERITE|CONTRACHEQUE|RECIBO\s+DE\s+(PAGAMENTO|SAL[ÁA]RIO))/i
        .test(linha)
    ) {
      modoRubricas = true;
      continue;
    }
    if (!modoRubricas) continue;
    if (!linha.includes('|')) continue;

    // Split em células pelo `|`; aceita layouts com 3 ou 4 separadores.
    const partes = linha.split('|').map((p) => p.trim());
    if (partes.length < 3) continue;

    // Primeira parte: "<código> <nome>"
    // Código = 3 a 5 dígitos. Aceita "0501", "1101", "12345".
    const m = partes[0].match(/^(\d{3,5})\s+(.+?)\s*$/);
    if (!m) continue;
    const codigo = m[1];
    const nome = m[2].replace(/\s+/g, ' ').trim();
    if (nome.length === 0) continue;

    // Heurística posicional para extrair qtde/venc/desc.
    // Layout típico:
    //   parts[0]=cod+nome | parts[1]=qtde | parts[2]=venc | parts[3]=desc
    const qtde = parseValorBR(partes[1]);
    const valor_vencimento = partes.length >= 3 ? parseValorBR(partes[2]) : null;
    const valor_desconto = partes.length >= 4 ? parseValorBR(partes[3]) : null;

    // Linha sem nenhum valor monetário não é rubrica real.
    if (valor_vencimento === null && valor_desconto === null) continue;

    const chave = `${codigo}|${nome.toLowerCase()}|${valor_vencimento ?? '_'}|${valor_desconto ?? '_'}`;
    if (visto.has(chave)) continue;
    visto.add(chave);

    ordem++;
    rubricas.push({
      codigo,
      nome,
      valor_vencimento,
      valor_desconto,
      quantidade: qtde,
      ordem,
    });
  }
  return rubricas;
}

export const mapperHoleriteViaVarejo: Mapper<HoleriteResultDominio> = {
  slug: 'holerite_via_varejo_v1',
  nome: 'Holerite Via Varejo / Casa Bahia',
  tipoDocumento: 'holerite',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;

    // FIX 1 (calibração com texto real): aceita "Demonstrativo de Pagamento",
    // "Comprovante de Pagamento", "Recibo de Salário" — termos legalmente
    // válidos usados por ADP, Via Varejo, Casas Bahia, Magalu, e muitos
    // empregadores que terceirizam folha. Antes só aceitava 4 termos e o
    // mapper morria silencioso em ~maioria dos holerites do mercado.
    const ehHolerite =
      /(HOLERITE|RECIBO\s+DE\s+(PAGAMENTO|SAL[ÁA]RIO)|CONTRACHEQUE|FOLHA\s+DE\s+PAGAMENTO|DEMONSTRATIVO\s+DE\s+PAGAMENTO|COMPROVANTE\s+DE\s+PAGAMENTO)/i
        .test(t);
    if (!ehHolerite) {
      return {
        aplica: false,
        score: 0,
        motivos: ['sem termo de holerite no texto (6 sinônimos suportados)'],
      };
    }
    motivos.push('termo de holerite presente');
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
    if (!competencia) return null;

    // Tentativa 1: tabela clusterizada pelo extrator + headers compatíveis.
    let rubricas: RubricaDominio[] = [];
    const tabela = escolherTabelaRubricas(doc);
    if (tabela) {
      const colunas = mapearColunas(tabela.headers);
      if (colunas) {
        tabela.linhas.forEach((linha, idx) => {
          const celulaPorCol = (i: number | null): CelulaTabular | undefined =>
            i === null ? undefined : linha[i];
          const nome = celulaToTexto(celulaPorCol(colunas.nome));
          if (!nome) return;
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
      }
    }

    // FIX 2+3 (calibração com texto real): fallback parser linha-por-linha
    // sobre `textoCompleto`. Cobre casos onde:
    //  - extrator não clusterizou tabela (PDF com colunas mal alinhadas);
    //  - headers reais não têm "Descrição/Nome" explícito (CONTA QTDE
    //    VENCIMENTOS DESCONTOS — layout ADP);
    //  - o nome da rubrica está colado ao código numa única "célula".
    if (rubricas.length === 0) {
      rubricas = extrairRubricasPorLinha(doc.textoCompleto);
      if (rubricas.length > 0) {
        warnings.push(
          `Mapper usou fallback linha-por-linha (texto plano) — ${rubricas.length} rubrica(s) extraída(s).`,
        );
      }
    }

    if (rubricas.length === 0) {
      warnings.push(
        'Holerite detectado mas nenhuma rubrica pôde ser extraída (nem por tabela, nem por linha).',
      );
      return null;
    }

    const { rubricas_classificadas, resumo_classificacao } =
      enriquecerComClassificacao(rubricas);

    return {
      competencia,
      rubricas,
      layout_usado: PARSER_VERSION,
      warnings,
      rubricas_classificadas,
      resumo_classificacao,
    };
  },
};
