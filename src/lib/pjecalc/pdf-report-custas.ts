/**
 * PJe-Calc - Relatorio Detalhado de Custas
 *
 * Gera relatorio HTML (visualizavel e imprimivel via Blob) com 5 secoes:
 *   1. Custas Judiciais
 *   2. Custas Periciais
 *   3. Emolumentos
 *   4. Custas Postais
 *   5. Outras Custas
 *
 * Cada secao lista os itens de `resumo.custas_detalhadas` com filtro por `tipo`,
 * mostrando descricao, base, percentual, valor fixo e valor final.
 * Ao final cada secao exibe subtotal; o documento termina com Total Geral.
 *
 * Ref Java (PJe-Calc oficial):
 *   pjecalc-fonte/.../relatorio/CustasJRAdapterPadrao.java
 *   pjecalc-fonte/.../calculo/custas/*  (modelo de dados)
 *
 * Regras:
 *   - Secao sem itens (apos filtro) e OMITIDA do PDF.
 *   - Valores monetarios formatados pt-BR com 2 casas.
 *   - Percentual exibido como `%` (ex.: `2.00 %`).
 *   - Somatorio usa Decimal.js para evitar erros de ponto flutuante.
 */
import Decimal from 'decimal.js';
import type { PjeLiquidacaoResult, PjeCustaResult, PjeCustaItem, PjeCustasConfig } from './engine-types';

Decimal.set({ precision: 20 });

export type TipoCusta = 'judiciais' | 'periciais' | 'emolumentos' | 'postais' | 'outras';

interface SecaoConfig {
  tipo: TipoCusta;
  titulo: string;
}

const SECOES: SecaoConfig[] = [
  { tipo: 'judiciais', titulo: 'Custas Judiciais' },
  { tipo: 'periciais', titulo: 'Custas Periciais' },
  { tipo: 'emolumentos', titulo: 'Emolumentos' },
  { tipo: 'postais', titulo: 'Custas Postais' },
  { tipo: 'outras', titulo: 'Outras Custas' },
];

export interface RelatorioCustasMeta {
  cliente?: string;
  processo?: string;
  reclamado?: string;
  dataLiquidacao?: string;
  calculoId?: string | number;
  engineVersion?: string;
  /**
   * Configuracao opcional das custas. Quando informada, permite exibir a
   * base/percentual/valor_fixo declarados pelo usuario (o `PjeCustaResult`
   * contem apenas `tipo`, `descricao` e `valor`).
   */
  custasConfig?: PjeCustasConfig;
}

const fmtBRL = (v: number | string | Decimal) => {
  const n = v instanceof Decimal ? v.toNumber() : typeof v === 'string' ? parseFloat(v) : v;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
};

const fmtPct = (v: number | undefined) => {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} %`;
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  const parts = d.substring(0, 10).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* =========================== CSS =========================== */
const CSS = `
@page { margin: 12mm 14mm; size: A4 portrait; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9pt;
  color: #000;
  line-height: 1.4;
  background: #fff;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #003366;
  padding-bottom: 6px;
  margin-bottom: 12px;
}
.page-header-left { font-size: 7.5pt; color: #555; }
.page-header-right { text-align: right; font-size: 7.5pt; color: #555; }
.page-header-center { text-align: center; flex: 1; }
.page-header-center h1 { font-size: 13pt; color: #003366; margin: 0; font-weight: 700; }
.page-header-center .subtitle { font-size: 8pt; color: #333; }

h2 {
  font-size: 10pt;
  font-weight: 700;
  color: #003366;
  margin: 16px 0 6px;
  padding: 3px 0;
  border-bottom: 1px solid #003366;
}
p.secao-empty { font-size: 8pt; color: #777; font-style: italic; margin: 4px 0 8px; }

table { width: 100%; border-collapse: collapse; margin: 4px 0 10px; font-size: 8pt; }
th {
  background: #003366;
  color: #fff;
  font-weight: 700;
  text-align: center;
  padding: 4px 6px;
  border: 1px solid #003366;
  font-size: 8pt;
}
td { padding: 3px 6px; border: 1px solid #ccc; }
td.num { text-align: right; font-family: 'Courier New', monospace; }
td.left { text-align: left; }
td.center { text-align: center; }
tr:nth-child(even) { background: #f9f9f9; }
tr.subtotal-row { background: #e6edf5; font-weight: 700; }
tr.subtotal-row td { border-color: #999; }

.total-geral {
  margin: 22px 0 10px;
  padding: 10px 16px;
  border: 2px solid #003366;
  background: #f0f4fa;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.total-geral .label {
  font-size: 10pt;
  font-weight: 700;
  color: #003366;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.total-geral .value {
  font-size: 15pt;
  font-weight: 800;
  color: #003366;
  font-family: 'Courier New', monospace;
}

.page-footer {
  margin-top: 14px; padding-top: 6px; border-top: 1px solid #ccc;
  display: flex; justify-content: space-between;
  font-size: 7pt; color: #888;
}

.summary-badges {
  display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 14px;
}
.summary-badges .badge {
  border: 1px solid #003366;
  border-radius: 3px;
  padding: 4px 8px;
  font-size: 7.5pt;
  background: #f0f4fa;
}
.summary-badges .badge strong { color: #003366; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none; }
}
`;

/* ================== HEADER / FOOTER ================== */
function pageHeader(meta: RelatorioCustasMeta): string {
  return `
  <div class="page-header">
    <div class="page-header-left">
      Processo: ${escapeHtml(meta.processo || '—')}<br/>
      Calculo: ${escapeHtml(String(meta.calculoId ?? 'MRDcalc'))}
    </div>
    <div class="page-header-center">
      <h1>RELATORIO DETALHADO DE CUSTAS</h1>
      <div class="subtitle">Reclamante: ${escapeHtml(meta.cliente || '—')}</div>
      ${meta.reclamado ? `<div class="subtitle">Reclamado: ${escapeHtml(meta.reclamado)}</div>` : ''}
      <div class="subtitle" style="margin-top: 2px;">
        Data Liquidacao: ${fmtDate(meta.dataLiquidacao)}
      </div>
    </div>
    <div class="page-header-right">
      &nbsp;
    </div>
  </div>`;
}

function pageFooter(meta: RelatorioCustasMeta): string {
  const hoje = new Date().toLocaleString('pt-BR');
  return `
  <div class="page-footer">
    <span>Custas apuradas por MRDcalc v${meta.engineVersion || '2.1.0'} em ${hoje}</span>
    <span>Processo: ${escapeHtml(meta.processo || '—')}</span>
  </div>`;
}

/* ================== LOOKUP DE CONFIG ================== */
function findConfigItem(
  tipo: TipoCusta,
  descricao: string,
  config?: PjeCustasConfig
): PjeCustaItem | undefined {
  if (!config || !Array.isArray(config.itens)) return undefined;
  return config.itens.find((i) => i.tipo === tipo && i.descricao === descricao);
}

/* ================== BUILDERS DE SECAO ================== */
interface SecaoResumo {
  tipo: TipoCusta;
  titulo: string;
  itens: PjeCustaResult[];
  subtotal: Decimal;
}

function construirSecao(
  tipo: TipoCusta,
  titulo: string,
  detalhadas: PjeCustaResult[]
): SecaoResumo {
  const itens = detalhadas.filter((c) => c.tipo === tipo);
  const subtotal = itens.reduce(
    (acc, c) => acc.plus(new Decimal(Number.isFinite(c.valor) ? c.valor : 0)),
    new Decimal(0)
  );
  return { tipo, titulo, itens, subtotal };
}

function renderSecaoHTML(secao: SecaoResumo, config?: PjeCustasConfig): string {
  if (secao.itens.length === 0) return '';

  const rows = secao.itens
    .map((item) => {
      const cfg = findConfigItem(secao.tipo, item.descricao, config);
      const percentual = cfg?.percentual;
      const valorFixo = cfg?.valor_fixo;
      const base = cfg
        ? cfg.valor_minimo != null || cfg.valor_maximo != null
          ? `min ${fmtBRL(cfg.valor_minimo ?? 0)}${cfg.valor_maximo != null ? ` / max ${fmtBRL(cfg.valor_maximo)}` : ''}`
          : '—'
        : '—';
      return `
        <tr>
          <td class="left">${escapeHtml(item.descricao)}</td>
          <td class="center">${base}</td>
          <td class="num">${fmtPct(percentual)}</td>
          <td class="num">${valorFixo != null ? fmtBRL(valorFixo) : '—'}</td>
          <td class="num">${fmtBRL(item.valor)}</td>
        </tr>`;
    })
    .join('');

  return `
  <h2>${escapeHtml(secao.titulo)}</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left; width:40%">Descricao</th>
        <th style="width:20%">Base (piso/teto)</th>
        <th style="width:12%">Percentual</th>
        <th style="width:14%">Valor Fixo</th>
        <th style="width:14%">Valor Apurado</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="subtotal-row">
        <td class="left" colspan="4">Subtotal — ${escapeHtml(secao.titulo)}</td>
        <td class="num">${fmtBRL(secao.subtotal)}</td>
      </tr>
    </tbody>
  </table>`;
}

/* ================== BUILD HTML COMPLETO ================== */
export function buildRelatorioCustasHTML(
  result: PjeLiquidacaoResult,
  meta: RelatorioCustasMeta = {}
): string {
  const detalhadas: PjeCustaResult[] = Array.isArray(result.resumo?.custas_detalhadas)
    ? result.resumo.custas_detalhadas
    : [];

  const secoes = SECOES.map((cfg) => construirSecao(cfg.tipo, cfg.titulo, detalhadas));
  const totalGeral = secoes.reduce((acc, s) => acc.plus(s.subtotal), new Decimal(0));

  const badgeList = secoes
    .filter((s) => s.itens.length > 0)
    .map(
      (s) => `
      <div class="badge">
        <strong>${escapeHtml(s.titulo)}:</strong>
        R$ ${fmtBRL(s.subtotal)} (${s.itens.length} ${s.itens.length === 1 ? 'item' : 'itens'})
      </div>`
    )
    .join('');

  const secoesHTML = secoes.map((s) => renderSecaoHTML(s, meta.custasConfig)).join('');

  const bodyContent = secoesHTML.trim().length > 0
    ? secoesHTML
    : `<p class="secao-empty">Nenhuma custa apurada neste calculo.</p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatorio de Custas — ${escapeHtml(meta.processo || 'MRDcalc')}</title>
  <style>${CSS}</style>
</head>
<body>
  ${pageHeader(meta)}

  ${badgeList ? `<div class="summary-badges">${badgeList}</div>` : ''}

  ${bodyContent}

  <div class="total-geral">
    <span class="label">Total Geral de Custas</span>
    <span class="value">R$ ${fmtBRL(totalGeral)}</span>
  </div>

  ${pageFooter(meta)}
</body>
</html>`;
}

/* ================== API PUBLICA ================== */

/**
 * Gera o relatorio detalhado de custas e retorna um Blob (text/html).
 *
 * O chamador decide o que fazer com o blob:
 *   - `URL.createObjectURL(blob)` + `window.open` para imprimir
 *   - `<a download>` para baixar
 */
export function gerarRelatorioCustasDetalhado(
  result: PjeLiquidacaoResult,
  meta: RelatorioCustasMeta = {}
): Blob {
  const html = buildRelatorioCustasHTML(result, meta);
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}

/**
 * Atalho de UI: gera o relatorio e abre uma nova janela para impressao/download.
 * Requer ambiente com `window` (nao chamar em SSR/testes unitarios).
 */
export function abrirRelatorioCustasDetalhado(
  result: PjeLiquidacaoResult,
  meta: RelatorioCustasMeta = {}
): void {
  if (typeof window === 'undefined') return;
  const blob = gerarRelatorioCustasDetalhado(result, meta);
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  // Revoga o URL apos um tempo para permitir que o navegador carregue.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!win) {
    // Fallback: forca download se popup foi bloqueado
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-custas-${(meta.processo || 'mrdcalc').replace(/[^a-zA-Z0-9.-]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Calcula subtotais por secao sem gerar HTML — util para testes e para exibir
 * previews na UI.
 */
export function calcularSubtotaisCustas(
  result: PjeLiquidacaoResult
): { tipo: TipoCusta; titulo: string; subtotal: number; quantidade: number }[] {
  const detalhadas: PjeCustaResult[] = Array.isArray(result.resumo?.custas_detalhadas)
    ? result.resumo.custas_detalhadas
    : [];
  return SECOES.map((cfg) => {
    const itens = detalhadas.filter((c) => c.tipo === cfg.tipo);
    const subtotal = itens.reduce(
      (acc, c) => acc.plus(new Decimal(Number.isFinite(c.valor) ? c.valor : 0)),
      new Decimal(0)
    );
    return {
      tipo: cfg.tipo,
      titulo: cfg.titulo,
      subtotal: subtotal.toDecimalPlaces(2).toNumber(),
      quantidade: itens.length,
    };
  });
}
