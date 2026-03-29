/**
 * Section: Criteria (Criterio de Calculo e Fundamentacao Legal)
 *
 * Renders the legal criteria / calculation parameters section.
 * Uses provided criteria text or auto-generates from params.
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

function buildDefaultCriterios(ctx: PDFRenderContext): string {
  const { dadosProcesso: dp, params } = ctx;
  const items: string[] = [];

  items.push(`Periodo de calculo: ${fmt.date(dp.dataInicioCalculo || dp.dataAdmissao)} a ${fmt.date(dp.dataFimCalculo || dp.dataDemissao)}.`);
  items.push(`Data de ajuizamento: ${fmt.date(dp.dataAjuizamento)}.`);
  items.push(`Data da liquidacao: ${fmt.date(dp.dataLiquidacao)}.`);

  if (dp.indiceCorrecao) {
    items.push(`Indice de correcao monetaria: ${dp.indiceCorrecao}.`);
  }
  if (dp.jurosTipo) {
    const jurosDesc = dp.jurosTipo === 'simples_mensal'
      ? `Juros simples de ${dp.jurosPercentual || 1}% ao mes`
      : dp.jurosTipo === 'selic' ? 'Taxa SELIC' : dp.jurosTipo;
    const jurosInicio = dp.jurosInicio === 'ajuizamento' ? 'a partir do ajuizamento'
      : dp.jurosInicio === 'citacao' ? 'a partir da citacao' : 'a partir do vencimento';
    items.push(`${jurosDesc}, ${jurosInicio}.`);
  }

  if (params.prescricao_quinquenal) {
    items.push('Aplicada prescricao quinquenal (Art. 7, XXIX, CF/88).');
  }
  if (params.zerar_valor_negativo) {
    items.push('Valores negativos zerados conforme parametro de calculo.');
  }
  items.push(`Carga horaria padrao: ${params.carga_horaria_padrao}h mensais.`);
  items.push(`Sabado como dia util: ${params.sabado_dia_util ? 'Sim' : 'Nao'}.`);

  return items.map(c => `<li style="margin-bottom: 3px;">${c}</li>`).join('');
}

export function renderCriteria(ctx: PDFRenderContext): string {
  const { dadosProcesso } = ctx;
  const criteriosHtml = (dadosProcesso.criterios && dadosProcesso.criterios.length > 0)
    ? dadosProcesso.criterios.map(c => `<li style="margin-bottom: 3px;">${c}</li>`).join('')
    : buildDefaultCriterios(ctx);

  return `
  <h2>Criterio de Calculo e Fundamentacao Legal</h2>
  <div style="font-size: 7.5pt; line-height: 1.5; text-align: justify;">
    <ol style="padding-left: 16px;">
      ${criteriosHtml}
    </ol>
  </div>`;
}
