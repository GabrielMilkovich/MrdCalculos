/**
 * PJe-Calc — Relatório de Apuração de Juros detalhado por competência.
 *
 * Seções:
 *   1. Cabeçalho (processo, beneficiário, datas, regime de juros)
 *   2. Tabela por Competência (competencia | verba | diferença | meses até liq | taxa | juros)
 *   3. Combinações de Juros aplicadas (ADC 58/59, EC 113/2021)
 *   4. Totalizadores (total de meses, total juros, juros por tipo de verba)
 *   5. Metodologia (Súmula 200 TST, cálculo sobre diferença nominal)
 *
 * Entrada: `PjeLiquidacaoResult` (verbas[].ocorrencias[] já contêm `juros`) +
 * `PjeCorrecaoConfig` (para extrair combinações). Saída: `Blob` text/html.
 *
 * Regras de precisão:
 *   - Somatórios com Decimal.js (precisão 20). Nunca usar `number` para acumular.
 *   - Formatação pt-BR com 2 casas para valores monetários.
 */
import Decimal from 'decimal.js';
import type {
  PjeLiquidacaoResult,
  PjeCorrecaoConfig,
  PjeCombinacaoJuros,
} from './engine-types';
import { disclaimerHtml } from './pdf-disclaimer';

Decimal.set({ precision: 20 });

export interface ApuracaoJurosInput {
  resultado: PjeLiquidacaoResult;
  correcaoConfig: PjeCorrecaoConfig;
  data_ajuizamento: string;
  data_liquidacao: string;
  processo: string;
  beneficiario: string;
}

const fmtBRL = (v: number | Decimal) => {
  const n = v instanceof Decimal ? v.toNumber() : v;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
};

const fmtPct = (v: number) =>
  `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(v)} %`;

const fmtDateBR = (d?: string) => {
  if (!d) return '—';
  const parts = d.substring(0, 10).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Meses inteiros entre `de` (YYYY-MM ou YYYY-MM-DD) e `ate` (YYYY-MM-DD). Nunca negativo. */
function mesesEntre(de: string, ate: string): number {
  const dYear = parseInt(de.substring(0, 4), 10);
  const dMonth = parseInt(de.substring(5, 7), 10);
  const aYear = parseInt(ate.substring(0, 4), 10);
  const aMonth = parseInt(ate.substring(5, 7), 10);
  if (
    !Number.isFinite(dYear) || !Number.isFinite(dMonth) ||
    !Number.isFinite(aYear) || !Number.isFinite(aMonth)
  ) return 0;
  const diff = (aYear - dYear) * 12 + (aMonth - dMonth);
  return diff > 0 ? diff : 0;
}

const TIPO_LABEL: Record<string, string> = {
  TRD_SIMPLES: 'TRD (simples)',
  TRD: 'TRD (simples)',
  SELIC: 'SELIC',
  TAXA_LEGAL: 'Taxa Legal (EC 113/2021)',
  NENHUM: 'Sem juros',
  UM_PORCENTO: '1% a.m.',
  MEIO_PORCENTO: '0,5% a.m.',
};

function regimeResumo(cfg: PjeCorrecaoConfig): string {
  const combs = cfg.combinacoes_juros;
  if (combs && combs.length > 0) {
    const labels = combs.map((c) => TIPO_LABEL[c.tipo] || c.tipo);
    return `Combinado por data: ${labels.join(' → ')}`;
  }
  if (cfg.juros_tipo === 'selic') return 'SELIC (ADC 58/59)';
  if (cfg.juros_tipo === 'simples_mensal')
    return `Simples mensal ${fmtPct(cfg.juros_percentual || 1)}`;
  if (cfg.juros_tipo === 'composto')
    return `Composto ${fmtPct(cfg.juros_percentual || 1)}`;
  return 'Sem juros';
}

/** Estima taxa média por ocorrência (juros / diferenca). Retorna `null` se base zero. */
function taxaAplicadaPct(diferenca: Decimal, juros: Decimal): Decimal | null {
  if (diferenca.isZero()) return null;
  return juros.div(diferenca).mul(100);
}

interface LinhaCompetencia {
  competencia: string;
  verba: string;
  diferenca: Decimal;
  meses: number;
  taxa: Decimal | null;
  juros: Decimal;
}

function montarLinhas(
  resultado: PjeLiquidacaoResult,
  dataLiq: string,
): LinhaCompetencia[] {
  const linhas: LinhaCompetencia[] = [];
  for (const verba of resultado.verbas) {
    for (const oc of verba.ocorrencias) {
      const diff = new Decimal(oc.diferenca || 0);
      const juros = new Decimal(oc.juros || 0);
      if (diff.isZero() && juros.isZero()) continue;
      linhas.push({
        competencia: oc.competencia,
        verba: verba.nome,
        diferenca: diff,
        meses: mesesEntre(oc.competencia, dataLiq),
        taxa: taxaAplicadaPct(diff, juros),
        juros,
      });
    }
  }
  return linhas;
}

const CSS = `
@page { margin: 12mm 14mm; size: A4 portrait; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; line-height: 1.4; }
.page-header { border-bottom: 2px solid #003366; padding-bottom: 6px; margin-bottom: 12px; text-align: center; }
.page-header h1 { font-size: 13pt; color: #003366; margin-bottom: 2px; }
.page-header .subtitle { font-size: 8pt; color: #444; }
h2 { font-size: 10pt; color: #003366; margin: 14px 0 6px; padding: 3px 0; border-bottom: 1px solid #003366; }
.info-grid { margin: 4px 0 10px; }
.info-row { display: flex; margin-bottom: 1px; }
.info-label { font-weight: 700; width: 240px; font-size: 8pt; color: #333; padding: 2px 4px; background: #f5f5f5; border: 1px solid #ddd; }
.info-value { font-size: 8pt; padding: 2px 6px; border: 1px solid #ddd; border-left: none; flex: 1; }
table { width: 100%; border-collapse: collapse; margin: 4px 0 12px; font-size: 8pt; }
th { background: #003366; color: #fff; font-weight: 700; text-align: center; padding: 4px; border: 1px solid #003366; }
td { padding: 3px 4px; border: 1px solid #ccc; }
td.num { text-align: right; font-family: 'Courier New', monospace; }
td.center { text-align: center; }
tr:nth-child(even) { background: #f9f9f9; }
tr.verba-header td { background: #e6edf5; font-weight: 700; }
tr.subtotal td { font-weight: 700; background: #eef4fb; border-top: 2px solid #003366; }
tr.grand-total td { background: #003366; color: #fff; font-weight: 700; }
.metodologia { background: #fffde6; padding: 8px 10px; border-left: 3px solid #e6a800; font-size: 8pt; line-height: 1.5; text-align: justify; }
.footer { margin-top: 16px; padding-top: 6px; border-top: 1px solid #ccc; font-size: 7pt; color: #888; text-align: center; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

function renderCabecalho(input: ApuracaoJurosInput): string {
  const regime = regimeResumo(input.correcaoConfig);
  return `
    <div class="page-header">
      <h1>RELATORIO DE APURACAO DE JUROS</h1>
      <div class="subtitle">Detalhamento por competencia — Sumula 200 TST</div>
    </div>
    <div class="info-grid">
      <div class="info-row"><div class="info-label">Processo</div><div class="info-value">${escapeHtml(input.processo || '—')}</div></div>
      <div class="info-row"><div class="info-label">Beneficiario</div><div class="info-value">${escapeHtml(input.beneficiario || '—')}</div></div>
      <div class="info-row"><div class="info-label">Data Ajuizamento</div><div class="info-value">${fmtDateBR(input.data_ajuizamento)}</div></div>
      <div class="info-row"><div class="info-label">Data Liquidacao</div><div class="info-value">${fmtDateBR(input.data_liquidacao)}</div></div>
      <div class="info-row"><div class="info-label">Regime de Juros</div><div class="info-value">${escapeHtml(regime)}</div></div>
    </div>
  `;
}

function renderTabelaCompetencias(linhas: LinhaCompetencia[]): string {
  if (linhas.length === 0) {
    return `<h2>Juros por Competencia</h2><p style="font-size:8pt;color:#888;">Nenhuma ocorrencia com juros ou diferenca apurados.</p>`;
  }

  // Agrupa por verba preservando ordem de primeira ocorrência
  const ordemVerbas: string[] = [];
  const porVerba = new Map<string, LinhaCompetencia[]>();
  for (const l of linhas) {
    if (!porVerba.has(l.verba)) {
      porVerba.set(l.verba, []);
      ordemVerbas.push(l.verba);
    }
    porVerba.get(l.verba)!.push(l);
  }

  let rows = '';
  let totalMeses = 0;
  let totalDiferenca = new Decimal(0);
  let totalJuros = new Decimal(0);

  for (const nomeVerba of ordemVerbas) {
    const itens = porVerba.get(nomeVerba)!;
    rows += `<tr class="verba-header"><td colspan="6">${escapeHtml(nomeVerba.toUpperCase())}</td></tr>`;
    let subDiff = new Decimal(0);
    let subJuros = new Decimal(0);
    let subMeses = 0;
    for (const l of itens) {
      const taxaTxt = l.taxa ? fmtPct(l.taxa.toDecimalPlaces(4).toNumber()) : '—';
      rows += `
        <tr>
          <td class="center">${escapeHtml(l.competencia)}</td>
          <td>${escapeHtml(l.verba)}</td>
          <td class="num">${fmtBRL(l.diferenca)}</td>
          <td class="center">${l.meses}</td>
          <td class="num">${taxaTxt}</td>
          <td class="num">${fmtBRL(l.juros)}</td>
        </tr>`;
      subDiff = subDiff.plus(l.diferenca);
      subJuros = subJuros.plus(l.juros);
      subMeses += l.meses;
    }
    rows += `
      <tr class="subtotal">
        <td colspan="2">Subtotal — ${escapeHtml(nomeVerba)}</td>
        <td class="num">${fmtBRL(subDiff)}</td>
        <td class="center">${subMeses}</td>
        <td></td>
        <td class="num">${fmtBRL(subJuros)}</td>
      </tr>`;
    totalMeses += subMeses;
    totalDiferenca = totalDiferenca.plus(subDiff);
    totalJuros = totalJuros.plus(subJuros);
  }

  rows += `
    <tr class="grand-total">
      <td colspan="2">TOTAL GERAL</td>
      <td class="num">${fmtBRL(totalDiferenca)}</td>
      <td class="center">${totalMeses}</td>
      <td></td>
      <td class="num">${fmtBRL(totalJuros)}</td>
    </tr>`;

  return `
    <h2>Juros por Competencia</h2>
    <table>
      <thead>
        <tr>
          <th>Competencia</th>
          <th>Verba</th>
          <th>Diferenca</th>
          <th>Meses ate liq.</th>
          <th>Taxa aplicada</th>
          <th>Juros devidos</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderCombinacoes(combinacoes: PjeCombinacaoJuros[] | undefined): string {
  if (!combinacoes || combinacoes.length === 0) return '';
  const linhas = combinacoes
    .map((c) => {
      const de = c.de ? fmtDateBR(c.de) : '—';
      const ate = c.ate ? fmtDateBR(c.ate) : '—';
      const tipoTxt = TIPO_LABEL[c.tipo] || c.tipo;
      const pct = c.percentual != null ? fmtPct(c.percentual) : '—';
      return `
        <tr>
          <td class="center">${de}</td>
          <td class="center">${ate}</td>
          <td>${escapeHtml(tipoTxt)}</td>
          <td class="num">${pct}</td>
        </tr>`;
    })
    .join('');

  return `
    <h2>Combinacoes de Juros Aplicadas</h2>
    <table>
      <thead>
        <tr><th>De</th><th>Ate</th><th>Tipo</th><th>Percentual</th></tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <p style="font-size:8pt;color:#555;">
      Fundamento: STF ADC 58/59 (fase pre-judicial: IPCA-E + TR; fase judicial: SELIC) e EC 113/2021 (taxa legal = SELIC).
    </p>`;
}

function renderTotalizadores(
  resultado: PjeLiquidacaoResult,
  linhas: LinhaCompetencia[],
): string {
  const totalMeses = linhas.reduce((s, l) => s + l.meses, 0);
  const totalJuros = linhas.reduce(
    (acc, l) => acc.plus(l.juros),
    new Decimal(0),
  );

  // Juros por tipo de verba (principal vs reflexa)
  const porTipo = new Map<string, Decimal>();
  for (const v of resultado.verbas) {
    const key = (v.tipo || 'outro').toLowerCase();
    const acc = porTipo.get(key) || new Decimal(0);
    porTipo.set(key, acc.plus(new Decimal(v.total_juros || 0)));
  }
  const tipoRows = Array.from(porTipo.entries())
    .sort((a, b) => b[1].cmp(a[1]))
    .map(
      ([tipo, valor]) =>
        `<tr><td>${escapeHtml(tipo)}</td><td class="num">${fmtBRL(valor)}</td></tr>`,
    )
    .join('');

  const resumoJuros = new Decimal(resultado.resumo.juros_mora || 0);
  const delta = totalJuros.minus(resumoJuros).abs();
  const divergencia =
    delta.gt(new Decimal('0.02'))
      ? `<p style="font-size:8pt;color:#990000;">Atencao: soma de juros por ocorrencia (${fmtBRL(totalJuros)}) difere do resumo (${fmtBRL(resumoJuros)}) em ${fmtBRL(delta)}.</p>`
      : '';

  return `
    <h2>Totalizadores</h2>
    <div class="info-grid">
      <div class="info-row"><div class="info-label">Total de meses computados</div><div class="info-value">${totalMeses}</div></div>
      <div class="info-row"><div class="info-label">Total de ocorrencias</div><div class="info-value">${linhas.length}</div></div>
      <div class="info-row"><div class="info-label">Total de juros (soma ocorrencias)</div><div class="info-value">R$ ${fmtBRL(totalJuros)}</div></div>
      <div class="info-row"><div class="info-label">Total de juros (resumo engine)</div><div class="info-value">R$ ${fmtBRL(resumoJuros)}</div></div>
    </div>
    ${divergencia}
    <h3 style="font-size:9pt;color:#003366;margin-top:8px;">Juros por tipo de verba</h3>
    <table>
      <thead><tr><th>Tipo</th><th>Juros</th></tr></thead>
      <tbody>${tipoRows || '<tr><td colspan="2" class="center">—</td></tr>'}</tbody>
    </table>`;
}

function renderMetodologia(): string {
  return `
    <h2>Metodologia</h2>
    <div class="metodologia">
      Juros calculados sobre a DIFERENCA nominal (devido − pago) de cada competencia, incidindo desde a data
      de ajuizamento ate a data de liquidacao, conforme Sumula 200 do TST. Quando configuradas, aplicam-se as
      combinacoes de juros por periodo (ADC 58/59 do STF e EC 113/2021). A taxa aplicada exibida e derivada
      da razao juros/diferenca apurada pelo motor de calculo — pequenas variacoes refletem arredondamentos,
      excecoes de juros e eventual deducao de contribuicao social previa (juros apos deducao CS). O total
      de meses e a soma dos meses inteiros entre cada competencia e a data de liquidacao, nao negativado.
    </div>`;
}

export function buildApuracaoJurosHTML(input: ApuracaoJurosInput): string {
  const linhas = montarLinhas(input.resultado, input.data_liquidacao);
  const body = `
    ${renderCabecalho(input)}
    ${renderTabelaCompetencias(linhas)}
    ${renderCombinacoes(input.correcaoConfig.combinacoes_juros)}
    ${renderTotalizadores(input.resultado, linhas)}
    ${renderMetodologia()}
    <div class="footer">Gerado por MRDcalc — ${new Date().toLocaleString('pt-BR')}</div>
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Apuracao de Juros — ${escapeHtml(input.processo || 'PJe-Calc')}</title>
<style>${CSS}</style>
</head>
<body>
${body}
${disclaimerHtml()}
</body>
</html>`;
}

export function gerarRelatorioApuracaoJuros(input: ApuracaoJurosInput): Blob {
  const html = buildApuracaoJurosHTML(input);
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
