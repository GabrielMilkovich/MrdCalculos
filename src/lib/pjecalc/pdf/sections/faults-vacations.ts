/**
 * Section: Faults & Vacations (Faltas e Ferias)
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

export function renderFaultsVacations(ctx: PDFRenderContext): string {
  const { dadosProcesso: dp } = ctx;

  const faltasRows = (dp.faltas || []).map(f => `
    <tr>
      <td class="center">${fmt.date(f.inicio)}</td>
      <td class="center">${fmt.date(f.fim)}</td>
      <td class="center">${f.justificada ? 'Sim' : 'Nao'}</td>
      <td class="left">${f.justificativa || '\u2014'}</td>
    </tr>
  `).join('');

  const feriasRows = (dp.ferias || []).map(f => `
    <tr>
      <td class="center">${f.relativa || '\u2014'}</td>
      <td class="center">${fmt.date(f.periodo_aquisitivo_inicio)} a ${fmt.date(f.periodo_aquisitivo_fim)}</td>
      <td class="center">${fmt.date(f.periodo_concessivo_inicio)} a ${fmt.date(f.periodo_concessivo_fim)}</td>
      <td class="center">${f.prazo || 30}</td>
      <td class="center">${f.situacao || '\u2014'}</td>
      <td class="center">${f.abono ? 'Sim' : 'Nao'}</td>
      <td class="center">${f.gozo1_inicio ? fmt.date(f.gozo1_inicio) + ' a ' + fmt.date(f.gozo1_fim) : '\u2014'}</td>
      <td class="center">${f.gozo2_inicio ? fmt.date(f.gozo2_inicio) + ' a ' + fmt.date(f.gozo2_fim) : '\u2014'}</td>
      <td class="center">${f.gozo3_inicio ? fmt.date(f.gozo3_inicio) + ' a ' + fmt.date(f.gozo3_fim) : '\u2014'}</td>
    </tr>
  `).join('');

  return `
  <h2>Faltas e Ferias</h2>

  <h3>FALTAS</h3>
  ${faltasRows ? `
  <table>
    <thead><tr><th>Inicio</th><th>Fim</th><th>Justificada</th><th style="text-align:left">Justificativa</th></tr></thead>
    <tbody>${faltasRows}</tbody>
  </table>` : '<p style="font-size:7pt; color:#888;">Nenhuma falta registrada.</p>'}

  <h3>FERIAS</h3>
  ${feriasRows ? `
  <table>
    <thead>
      <tr>
        <th>Relativa</th><th>Periodo Aquisitivo</th><th>Periodo Concessivo</th>
        <th>Prazo</th><th>Situacao</th><th>Abono</th>
        <th>Periodo de Gozo 1</th><th>Periodo de Gozo 2</th><th>Periodo de Gozo 3</th>
      </tr>
    </thead>
    <tbody>${feriasRows}</tbody>
  </table>` : '<p style="font-size:7pt; color:#888;">Nenhum periodo de ferias registrado.</p>'}`;
}
