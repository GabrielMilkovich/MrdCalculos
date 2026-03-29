/**
 * Section: Criteria (Criterio de Calculo e Fundamentacao Legal)
 *
 * Renders the legal criteria / calculation parameters section.
 * Uses provided criteria text or auto-generates from params.
 */
import type { PDFRenderContext } from '../types';
import { fmt } from '../formatter';

function describeIndiceCorrecao(ctx: PDFRenderContext): string {
  const dp = ctx.dadosProcesso;
  if (dp.correcaoCombinacoes && dp.correcaoCombinacoes.length > 0) {
    const nomes = dp.correcaoCombinacoes.map(c => c.indice).join(' / ');
    return `${nomes} (ADC 58/59)`;
  }
  return dp.indiceCorrecao || 'nao informado';
}

function describeDataCitacao(ctx: PDFRenderContext): string {
  const params = ctx.params;
  if (params.data_citacao) {
    return `${fmt.date(params.data_citacao)} (informada)`;
  }
  if (params.data_ajuizamento) {
    const estimada = new Date(new Date(params.data_ajuizamento).getTime() + 60 * 24 * 60 * 60 * 1000);
    return `estimada (ajuizamento + 60 dias = ${fmt.date(estimada.toISOString().slice(0, 10))})`;
  }
  return 'nao informada';
}

function describeModo(ctx: PDFRenderContext): string {
  const modo = ctx.params.modo_calculo ?? 'assisted_from_pjc';
  return modo === 'independent' ? 'Independente' : 'Assistido por PJC';
}

function buildDefaultCriterios(ctx: PDFRenderContext): string {
  const { dadosProcesso: dp, params } = ctx;
  const items: string[] = [];

  items.push(`Modo: ${describeModo(ctx)}.`);
  items.push(`Periodo de calculo: ${fmt.date(dp.dataInicioCalculo || dp.dataAdmissao)} a ${fmt.date(dp.dataFimCalculo || dp.dataDemissao)}.`);
  items.push(`Data de ajuizamento: ${fmt.date(dp.dataAjuizamento)}.`);
  items.push(`Data da liquidacao: ${fmt.date(dp.dataLiquidacao)}.`);
  items.push(`Data de Citacao: ${describeDataCitacao(ctx)}.`);
  items.push(`Indice de Correcao: ${describeIndiceCorrecao(ctx)}.`);

  if (dp.jurosTipo) {
    const jurosDesc = dp.jurosTipo === 'simples_mensal'
      ? `Juros simples de ${dp.jurosPercentual || 1}% ao mes`
      : dp.jurosTipo === 'selic' ? 'Taxa SELIC' : dp.jurosTipo;
    const jurosInicio = dp.jurosInicio === 'ajuizamento' ? 'a partir do ajuizamento'
      : dp.jurosInicio === 'citacao' ? 'a partir da citacao' : 'a partir do vencimento';
    items.push(`Regime de Juros: ${jurosDesc}, ${jurosInicio}.`);
  }

  if (params.prescricao_quinquenal) {
    items.push('Aplicada prescricao quinquenal (Art. 7, XXIX, CF/88).');
  }
  if (params.zerar_valor_negativo) {
    items.push('Valores negativos zerados conforme parametro de calculo.');
  }
  items.push(`Carga horaria padrao: ${params.carga_horaria_padrao}h mensais.`);
  items.push(`Sabado como dia util: ${params.sabado_dia_util ? 'Sim' : 'Nao'}.`);

  // Audit: INSS/IR table info from warnings
  const warnings = ctx.result.calculation_warnings || [];
  const inssWarning = warnings.find(w => w.code === 'INSS_FALLBACK' || w.module === 'INSS');
  if (inssWarning) {
    items.push(`Base INSS: ${inssWarning.message}.`);
  }
  const irWarning = warnings.find(w => w.code === 'IR_FALLBACK' || w.module === 'IR');
  if (irWarning) {
    items.push(`Base IR: ${irWarning.message}.`);
  }

  // Reflexos info
  const reflexos = ctx.result.verbas.filter(v => v.tipo === 'reflexa');
  if (reflexos.length > 0) {
    items.push(`Reflexos gerados automaticamente: ${reflexos.length} verba(s) reflexa(s).`);
  }

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
