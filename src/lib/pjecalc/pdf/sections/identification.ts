/**
 * Section: Identification / Page Header
 *
 * Renders the page header block with process identification,
 * parties, dates, and calculation period.
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

/**
 * Build the page header block (used at the top of each logical page).
 */
export function renderPageHeader(ctx: PDFRenderContext, title?: string): string {
  const { dadosProcesso: dp, config } = ctx;
  const periodoInicio = fmt.date(dp.dataInicioCalculo || dp.dataAdmissao);
  const periodoFim = fmt.date(dp.dataFimCalculo || dp.dataDemissao);

  return `
  <div class="page-header">
    <div class="page-header-left">
      Processo: ${dp.processo || '\u2014'}<br/>
      Calculo: ${dp.calculoId || 'MRDcalc'}
    </div>
    <div class="page-header-center">
      <h1>${title || config.title}</h1>
      <div class="subtitle">Reclamante: ${dp.cliente || '\u2014'}</div>
      ${dp.reclamado ? `<div class="subtitle">Reclamado: ${dp.reclamado}</div>` : ''}
      <div class="subtitle" style="margin-top: 2px;">
        Periodo do Calculo: ${periodoInicio} a ${periodoFim}
      </div>
      <div class="subtitle">
        Data Ajuizamento: ${fmt.date(dp.dataAjuizamento)} &nbsp;&nbsp;
        Data Liquidacao: ${fmt.date(dp.dataLiquidacao)}
      </div>
    </div>
    <div class="page-header-right"></div>
  </div>`;
}

/**
 * Full identification section (for first page or standalone).
 * Includes detailed party and case information.
 */
export function renderIdentification(ctx: PDFRenderContext): string {
  const { dadosProcesso: dp } = ctx;

  const rows: [string, string][] = [
    ['Processo', dp.processo || '\u2014'],
    ['Reclamante', dp.cliente || '\u2014'],
    ['Reclamado', dp.reclamado || '\u2014'],
    ['Vara / Juizo', dp.vara || '\u2014'],
    ['Perito / Calculista', dp.perito || '\u2014'],
    ['Funcao', dp.funcao || '\u2014'],
    ['Data de Admissao', fmt.date(dp.dataAdmissao)],
    ['Data de Demissao', fmt.date(dp.dataDemissao)],
    ['Data de Ajuizamento', fmt.date(dp.dataAjuizamento)],
    ['Data da Liquidacao', fmt.date(dp.dataLiquidacao)],
    ['UF / Municipio', `${dp.uf || '\u2014'} / ${dp.municipio || '\u2014'}`],
  ];

  return `
  <div class="info-grid">
    ${rows.map(([label, value]) => `
      <div class="info-row">
        <div class="info-label">${label}</div>
        <div class="info-value">${value}</div>
      </div>
    `).join('')}
  </div>`;
}
