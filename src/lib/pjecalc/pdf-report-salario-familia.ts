/**
 * PJe-Calc - Relatorio Demonstrativo de Salario Familia.
 *
 * Baseado no DemonstrativoSalarioFamilia do PJe-Calc oficial.
 *
 * Secoes:
 *   1. Cabecalho (processo, beneficiario, data liquidacao)
 *   2. Parametros (numero de filhos elegiveis, detalhes por filho)
 *   3. Tabela por competencia (filhos x valor quota x avos/fator x total)
 *   4. Totalizador
 *
 * Fundamento legal: Lei 8.213/91 art. 65 (Salario Familia concedido
 * ao segurado empregado/avulso por filho ate 14 anos ou invalido).
 */
import Decimal from 'decimal.js';
import type { PjeLiquidacaoResult, PjeSalarioFamiliaConfig } from './engine-types';

Decimal.set({ precision: 20 });

export interface RelatorioSalarioFamiliaMeta {
  cliente?: string;
  processo?: string;
  reclamado?: string;
  dataLiquidacao?: string;
  calculoId?: string | number;
  engineVersion?: string;
  salarioFamiliaConfig?: PjeSalarioFamiliaConfig;
}

const fmtBRL = (v: number | Decimal) => {
  const n = v instanceof Decimal ? v.toNumber() : v;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
};

const fmtDateBR = (d?: string) => {
  if (!d) return '—';
  const parts = d.substring(0, 10).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const fmtCompetencia = (c: string) => {
  const s = c.substring(0, 7);
  const parts = s.split('-');
  if (parts.length !== 2) return c;
  return `${parts[1]}/${parts[0]}`;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

export function buildRelatorioSalarioFamiliaHTML(
  result: PjeLiquidacaoResult,
  meta: RelatorioSalarioFamiliaMeta = {},
): string {
  const sf = result.salario_familia;
  const cfg = meta.salarioFamiliaConfig;
  const numFilhos = cfg?.numero_filhos ?? (sf.cotas[0]?.filhos_elegíveis ?? 0);

  const filhosHTML = (cfg?.filhos_detalhes ?? [])
    .map(
      (f) =>
        `<tr><td>${escapeHtml(f.nome)}</td><td class="center">${fmtDateBR(f.nascimento)}</td><td class="center">${f.ate_14 ? 'Sim' : 'Nao'}</td></tr>`,
    )
    .join('');

  const linhas = sf.cotas
    .map(
      (c) => `
      <tr>
        <td class="center">${fmtCompetencia(c.competencia)}</td>
        <td class="center">${c.filhos_elegíveis}</td>
        <td class="num">${fmtBRL(c.valor_cota)}</td>
        <td class="num">${fmtBRL(c.total)}</td>
      </tr>`,
    )
    .join('');

  const total = sf.cotas.reduce(
    (acc, c) => acc.plus(new Decimal(Number.isFinite(c.total) ? c.total : 0)),
    new Decimal(0),
  );

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Salario Familia - ${escapeHtml(meta.processo || 'MRDcalc')}</title>
<style>${CSS}</style></head><body>
<div class="page-header">
  <h1>DEMONSTRATIVO DE SALARIO FAMILIA</h1>
  <div class="subtitle">Reclamante: ${escapeHtml(meta.cliente || '—')}</div>
  ${meta.reclamado ? `<div class="subtitle">Reclamado: ${escapeHtml(meta.reclamado)}</div>` : ''}
  <div class="subtitle">Processo: ${escapeHtml(meta.processo || '—')} | Data Liquidacao: ${fmtDateBR(meta.dataLiquidacao)}</div>
</div>

<h2>Parametros</h2>
<div class="params">
  <div class="item"><strong>Numero de filhos elegiveis:</strong> ${numFilhos}</div>
  <div class="item"><strong>Apurado:</strong> ${sf.apurado ? 'Sim' : 'Nao'}</div>
  <div class="item"><strong>Competencias:</strong> ${sf.cotas.length}</div>
</div>
${filhosHTML
  ? `<table><thead><tr><th>Nome</th><th>Nascimento</th><th>Ate 14 anos</th></tr></thead><tbody>${filhosHTML}</tbody></table>`
  : '<p style="font-size:8pt;color:#777;font-style:italic;">Detalhes dos filhos nao informados na configuracao.</p>'}

<h2>Apuracao por Competencia</h2>
${linhas
  ? `<table>
    <thead><tr>
      <th style="width:20%">Competencia</th>
      <th style="width:20%">Filhos Elegiveis</th>
      <th style="width:30%">Valor Quota</th>
      <th style="width:30%">Total no Mes</th>
    </tr></thead>
    <tbody>
      ${linhas}
      <tr class="total-row"><td class="center" colspan="3">Total</td><td class="num">${fmtBRL(total)}</td></tr>
    </tbody></table>`
  : '<p style="font-size:8pt;color:#777;font-style:italic;">Nenhuma cota de salario familia apurada.</p>'}

<div class="total-geral">
  <span class="label">Total Salario Familia</span>
  <span class="value">R$ ${fmtBRL(total)}</span>
</div>

<div class="legal">Fundamento legal: Lei 8.213/91 art. 65. Salario Familia devido ao segurado empregado e avulso por filho ou equiparado ate 14 anos ou invalido.</div>

<div class="page-footer">
  <span>Gerado por MRDcalc v${meta.engineVersion || '2.1.0'} em ${new Date().toLocaleString('pt-BR')}</span>
  <span>Processo: ${escapeHtml(meta.processo || '—')}</span>
</div>
</body></html>`;
}

export function gerarRelatorioSalarioFamilia(
  result: PjeLiquidacaoResult,
  meta: RelatorioSalarioFamiliaMeta = {},
): Blob {
  const html = buildRelatorioSalarioFamiliaHTML(result, meta);
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
