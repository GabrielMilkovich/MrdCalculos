/**
 * Section: Calculation Data (Dados do Calculo)
 *
 * Renders calculation parameters and salary history.
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

export function renderCalculationData(ctx: PDFRenderContext): string {
  const { dadosProcesso: dp, params } = ctx;

  const infoRows: [string, string][] = [
    ['Estado', dp.uf || '\u2014'],
    ['Municipio', dp.municipio || '\u2014'],
    ['Admissao', fmt.date(dp.dataAdmissao)],
    ['Demissao', fmt.date(dp.dataDemissao)],
    ['Regime de Trabalho', dp.regimeTrabalho || 'Tempo Integral'],
    ['Aplicar Prescricao Quinquenal', params.prescricao_quinquenal ? 'Sim' : 'Nao'],
    ['Maior Remuneracao', dp.maiorRemuneracao ? fmt.decimal(dp.maiorRemuneracao) : '\u2014'],
    ['Ultima Remuneracao', dp.ultimaRemuneracao ? fmt.decimal(dp.ultimaRemuneracao) : '\u2014'],
    ['Limitar Avos ao Periodo de Calculo', dp.limitarAvos ? 'Sim' : 'Nao'],
    ['Prazo de Aviso Previo', dp.prazoAvisoPrevio || 'Calculado'],
    ['Projetar Aviso Previo Indenizado', dp.projetarAvisoPrevio !== false ? 'Sim' : 'Nao'],
    ['Considerar Feriados', dp.considerarFeriados !== false ? 'Sim' : 'Nao'],
    ['Considerar Feriados Estaduais', dp.considerarFeriadosEstaduais !== false ? 'Sim' : 'Nao'],
    ['Zerar Valor Negativo (Padrao)', dp.zerarNegativo ? 'Sim' : 'Nao'],
    ['Carga Horaria (Padrao)', `${(dp.cargaHoraria || 220).toFixed(2)}`],
    ['Sabado como Dia Util', dp.sabadoDiaUtil ? 'Sim' : 'Nao'],
  ];

  // Salary history
  const historicoRows = (dp.historicoSalarial || []).map(h => `
    <tr>
      <td class="left">${h.nome}</td>
      <td class="center">${fmt.date(h.periodo_inicio)}</td>
      <td class="center">${fmt.date(h.periodo_fim)}</td>
      <td class="center">${h.tipo_valor === 'informado' ? 'Informado' : 'Calculado'}</td>
      <td class="num">${h.valor_informado ? fmt.decimal(h.valor_informado) : '\u2014'}</td>
      <td class="center">${h.incidencia_fgts !== false ? 'Sim' : 'Nao'}</td>
      <td class="center">${h.incidencia_cs !== false ? 'Sim' : 'Nao'}</td>
    </tr>
  `).join('');

  return `
  <h2>Dados do Calculo</h2>
  <div class="info-grid">
    ${infoRows.map(([label, value]) => `
      <div class="info-row">
        <div class="info-label">${label}</div>
        <div class="info-value">${value}</div>
      </div>
    `).join('')}
  </div>

  ${historicoRows ? `
  <h2>Historico Salarial</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Rubrica</th><th>Inicio</th><th>Fim</th>
        <th>Tipo</th><th>Valor</th><th>FGTS</th><th>CS</th>
      </tr>
    </thead>
    <tbody>${historicoRows}</tbody>
  </table>` : ''}`;
}
