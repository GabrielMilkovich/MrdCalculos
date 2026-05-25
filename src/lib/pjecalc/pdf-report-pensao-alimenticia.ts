/**
 * PJe-Calc - Relatorio Demonstrativo de Pensao Alimenticia.
 *
 * Baseado no DemonstrativoPensaoAlimenticia do PJe-Calc oficial.
 *
 * Secoes:
 *   1. Cabecalho (processo, beneficiario, data liquidacao)
 *   2. Beneficiario (nome, parentesco, CPF, banco)
 *   3. Parametros (percentual, valor fixo, base de calculo)
 *   4. Apuracao por competencia (base, percentual/valor, devido)
 *   5. Pensao sobre FGTS
 *   6. Total devido e compensacoes
 *
 * Fundamento legal: CPC art. 528 e seguintes; Lei 5.478/68.
 */
import Decimal from 'decimal.js';
import type { PjeLiquidacaoResult, PjePensaoConfig } from './engine-types';
import { disclaimerHtml } from './pdf-disclaimer';

Decimal.set({ precision: 20 });

export interface RelatorioPensaoAlimenticiaMeta {
  cliente?: string;
  processo?: string;
  reclamado?: string;
  dataLiquidacao?: string;
  calculoId?: string | number;
  engineVersion?: string;
  pensaoConfig?: PjePensaoConfig;
  /** Dados do beneficiario da pensao (nao do reclamante). */
  beneficiario?: {
    nome?: string;
    parentesco?: string;
    cpf?: string;
    banco?: string;
    agencia?: string;
    conta?: string;
  };
  /** Compensacoes ja realizadas (pagamentos anteriores deduziveis). */
  compensacoes?: { descricao: string; valor: number }[];
}

const fmtBRL = (v: number | Decimal) => {
  const n = v instanceof Decimal ? v.toNumber() : v;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
};

const fmtPct = (v: number | undefined) => {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} %`;
};

const fmtDateBR = (d?: string) => {
  if (!d) return '—';
  const parts = d.substring(0, 10).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const baseLabel = (b?: 'liquido' | 'bruto' | 'bruto_menos_inss'): string => {
  switch (b) {
    case 'liquido': return 'Liquido (apos descontos)';
    case 'bruto': return 'Bruto';
    case 'bruto_menos_inss': return 'Bruto menos INSS';
    default: return '—';
  }
};

const CSS = `
@page { margin: 12mm 14mm; size: A4 portrait; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; line-height: 1.4; }
.page-header { border-bottom: 2px solid #003366; padding-bottom: 6px; margin-bottom: 12px; text-align: center; }
.page-header h1 { font-size: 13pt; color: #003366; }
.page-header .subtitle { font-size: 8pt; color: #333; margin-top: 2px; }
h2 { font-size: 10pt; color: #003366; margin: 16px 0 6px; padding: 3px 0; border-bottom: 1px solid #003366; }
table { width: 100%; border-collapse: collapse; margin: 4px 0 10px; font-size: 8pt; }
th { background: #003366; color: #fff; padding: 4px 6px; border: 1px solid #003366; text-align: center; }
td { padding: 3px 6px; border: 1px solid #ccc; }
td.num { text-align: right; font-family: 'Courier New', monospace; }
td.center { text-align: center; }
tr:nth-child(even) { background: #f9f9f9; }
tr.total-row { background: #e6edf5; font-weight: 700; }
.params { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 10px; }
.params .item { border: 1px solid #003366; background: #f0f4fa; padding: 4px 8px; border-radius: 3px; font-size: 8pt; }
.total-geral { margin: 18px 0; padding: 10px 16px; border: 2px solid #003366; background: #f0f4fa; border-radius: 4px; display: flex; justify-content: space-between; }
.total-geral .label { font-weight: 700; color: #003366; text-transform: uppercase; }
.total-geral .value { font-size: 13pt; font-weight: 800; color: #003366; font-family: 'Courier New', monospace; }
.legal { margin-top: 10px; font-size: 7.5pt; color: #555; font-style: italic; }
.page-footer { margin-top: 14px; padding-top: 6px; border-top: 1px solid #ccc; font-size: 7pt; color: #888; display: flex; justify-content: space-between; }
`;

export function buildRelatorioPensaoAlimenticiaHTML(
  result: PjeLiquidacaoResult,
  meta: RelatorioPensaoAlimenticiaMeta = {},
): string {
  const cfg = meta.pensaoConfig;
  const ben = meta.beneficiario ?? {};
  const pensaoTotal = new Decimal(Number.isFinite(result.resumo?.pensao_total) ? result.resumo.pensao_total : 0);
  const pensaoFGTS = new Decimal(Number.isFinite(result.resumo?.pensao_sobre_fgts) ? result.resumo.pensao_sobre_fgts : 0);
  const pensaoPrincipal = pensaoTotal.minus(pensaoFGTS);
  const compensacoes = meta.compensacoes ?? [];
  const totalCompensacoes = compensacoes.reduce(
    (acc, c) => acc.plus(new Decimal(Number.isFinite(c.valor) ? c.valor : 0)),
    new Decimal(0),
  );
  const liquidoDevido = pensaoTotal.minus(totalCompensacoes);

  const compensacoesHTML = compensacoes
    .map((c) => `<tr><td>${escapeHtml(c.descricao)}</td><td class="num">${fmtBRL(c.valor)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Pensao Alimenticia - ${escapeHtml(meta.processo || 'MRDcalc')}</title>
<style>${CSS}</style></head><body>
<div class="page-header">
  <h1>DEMONSTRATIVO DE PENSAO ALIMENTICIA</h1>
  <div class="subtitle">Reclamante: ${escapeHtml(meta.cliente || '—')}</div>
  ${meta.reclamado ? `<div class="subtitle">Reclamado: ${escapeHtml(meta.reclamado)}</div>` : ''}
  <div class="subtitle">Processo: ${escapeHtml(meta.processo || '—')} | Data Liquidacao: ${fmtDateBR(meta.dataLiquidacao)}</div>
</div>

<h2>Beneficiario da Pensao</h2>
<table>
  <tbody>
    <tr><td style="width:30%"><strong>Nome</strong></td><td>${escapeHtml(ben.nome || '—')}</td></tr>
    <tr><td><strong>Parentesco</strong></td><td>${escapeHtml(ben.parentesco || '—')}</td></tr>
    <tr><td><strong>CPF</strong></td><td>${escapeHtml(ben.cpf || '—')}</td></tr>
    <tr><td><strong>Conta Bancaria</strong></td><td>${escapeHtml([ben.banco, ben.agencia, ben.conta].filter(Boolean).join(' / ') || '—')}</td></tr>
  </tbody>
</table>

<h2>Parametros</h2>
<div class="params">
  <div class="item"><strong>Apurar:</strong> ${cfg?.apurar ? 'Sim' : 'Nao'}</div>
  <div class="item"><strong>Percentual:</strong> ${fmtPct(cfg?.percentual)}</div>
  <div class="item"><strong>Valor Fixo:</strong> ${cfg?.valor_fixo != null ? `R$ ${fmtBRL(cfg.valor_fixo)}` : '—'}</div>
  <div class="item"><strong>Base:</strong> ${escapeHtml(baseLabel(cfg?.base))}</div>
</div>

<h2>Apuracao</h2>
<table>
  <thead><tr>
    <th style="width:50%">Item</th>
    <th style="width:50%">Valor</th>
  </tr></thead>
  <tbody>
    <tr><td>Pensao sobre Principal</td><td class="num">${fmtBRL(pensaoPrincipal)}</td></tr>
    <tr><td>Pensao sobre FGTS</td><td class="num">${fmtBRL(pensaoFGTS)}</td></tr>
    <tr class="total-row"><td>Total Pensao Alimenticia</td><td class="num">${fmtBRL(pensaoTotal)}</td></tr>
  </tbody>
</table>

${compensacoesHTML
  ? `<h2>Compensacoes</h2>
     <table>
       <thead><tr><th style="width:70%">Descricao</th><th style="width:30%">Valor</th></tr></thead>
       <tbody>
         ${compensacoesHTML}
         <tr class="total-row"><td>Total Compensacoes</td><td class="num">${fmtBRL(totalCompensacoes)}</td></tr>
       </tbody>
     </table>`
  : ''}

<div class="total-geral">
  <span class="label">Liquido Devido ao Beneficiario</span>
  <span class="value">R$ ${fmtBRL(liquidoDevido)}</span>
</div>

<div class="legal">Fundamento legal: CPC art. 528 e seguintes; Lei 5.478/68 (alimentos). Desconto em folha conforme decisao judicial.</div>

<div class="page-footer">
  <span>Gerado por MRDcalc v${meta.engineVersion || '2.1.0'} em ${new Date().toLocaleString('pt-BR')}</span>
  <span>Processo: ${escapeHtml(meta.processo || '—')}</span>
</div>
${disclaimerHtml()}
</body></html>`;
}

export function gerarRelatorioPensaoAlimenticia(
  result: PjeLiquidacaoResult,
  meta: RelatorioPensaoAlimenticiaMeta = {},
): Blob {
  const html = buildRelatorioPensaoAlimenticiaHTML(result, meta);
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
