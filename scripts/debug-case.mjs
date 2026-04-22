import * as fs from 'fs';
import * as path from 'path';
import { analyzePJC } from '../src/lib/pjecalc/pjc-analyzer.ts';
import { convertPjcToEngineInputs } from '../src/lib/pjecalc/pjc-to-engine.ts';
import { PjeCalcEngine } from '../src/lib/pjecalc/_legacy/engine.ts';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO, SELIC_MENSAL, TR_ACUMULADO } from '../src/lib/pjecalc/indices-fallback.ts';

const file = process.argv[2];
if (!file) { console.error('uso: node debug-case.mjs <arquivo.PJC>'); process.exit(1); }

const xml = fs.readFileSync(file, 'latin1');
const a = analyzePJC(xml);

const INDICES_DB = [];
for (const [c, v] of Object.entries(SELIC_MENSAL)) {
  INDICES_DB.push({ indice: 'SELIC', competencia: c + '-01', valor: v, acumulado: SELIC_ACUMULADO[c] ?? 100 });
}
for (const [c, ac] of Object.entries(IPCA_E_ACUMULADO)) {
  INDICES_DB.push({ indice: 'IPCA-E', competencia: c + '-01', valor: 0, acumulado: ac });
  INDICES_DB.push({ indice: 'IPCAE', competencia: c + '-01', valor: 0, acumulado: ac });
  INDICES_DB.push({ indice: 'IPCA', competencia: c + '-01', valor: 0, acumulado: ac });
}
for (const [c, ac] of Object.entries(TR_ACUMULADO)) {
  INDICES_DB.push({ indice: 'TR', competencia: c + '-01', valor: 0, acumulado: ac });
}

const inputs = convertPjcToEngineInputs(a, 'debug');
inputs.params.modo_calculo = 'independent';
if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;
inputs.correcaoConfig.gt_closure = undefined;
inputs.correcaoConfig.apuracao_juros_gt = undefined;
if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;

const engine = new PjeCalcEngine(
  inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
  inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
  inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
  inputs.custasConfig, inputs.seguroConfig, INDICES_DB, [],
  [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
  inputs.pensaoConfig, inputs.salarioFamiliaConfig,
);
const r = engine.liquidar();

console.log('═══ RESUMO DO CASO ═══');
console.log(`Caso: ${path.basename(file)}`);
console.log(`PJe-Calc liquido:     R$ ${a.resultado.liquido_exequente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`MRD Calc liquido:     R$ ${r.resumo.liquido_reclamante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
const delta = (r.resumo.liquido_reclamante - a.resultado.liquido_exequente) / a.resultado.liquido_exequente * 100;
console.log(`Delta:                ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`);
console.log('');
console.log('═══ BREAKDOWN ═══');
console.log(`Principal bruto:      R$ ${r.resumo.principal_bruto.toFixed(2)}`);
console.log(`Principal corrigido:  R$ ${r.resumo.principal_corrigido.toFixed(2)}`);
console.log(`Juros mora:           R$ ${r.resumo.juros_mora.toFixed(2)}`);
console.log(`CS segurado:          R$ ${r.resumo.cs_segurado.toFixed(2)}`);
console.log(`IR retido:            R$ ${r.resumo.ir_retido.toFixed(2)}`);
console.log(`FGTS total:           R$ ${r.resumo.fgts_total.toFixed(2)}`);
console.log('');
console.log('═══ PJC RESULTADO ESPERADO ═══');
console.log(`valor_principal:      ${a.resultado.valor_principal}`);
console.log(`inss_reclamante:      ${a.resultado.inss_reclamante}`);
console.log(`inss_reclamado:       ${a.resultado.inss_reclamado}`);
console.log(`imposto_renda:        ${a.resultado.imposto_renda}`);
console.log(`deposito_fgts:        ${a.resultado.deposito_fgts}`);
console.log('');
console.log(`Total verbas MRD: ${r.verbas.length}`);
console.log(`Sample verba[0].total_diferenca: ${r.verbas[0]?.total_diferenca}`);
console.log(`Sample verba[0].total_corrigido: ${r.verbas[0]?.total_corrigido}`);
console.log(`Sample verba[0].total_juros: ${r.verbas[0]?.total_juros}`);
console.log(`Sample verba[0].total_final: ${r.verbas[0]?.total_final}`);
console.log(`Sample verba[0].ocorrencias: ${r.verbas[0]?.ocorrencias?.length}`);
if (r.verbas[0]?.ocorrencias?.[0]) {
  console.log(`  oc[0]:`, JSON.stringify({
    competencia: r.verbas[0].ocorrencias[0].competencia,
    base: r.verbas[0].ocorrencias[0].base,
    devido: r.verbas[0].ocorrencias[0].devido,
    pago: r.verbas[0].ocorrencias[0].pago,
    diferenca: r.verbas[0].ocorrencias[0].diferenca,
    valor_corrigido: r.verbas[0].ocorrencias[0].valor_corrigido,
    juros: r.verbas[0].ocorrencias[0].juros,
    valor_final: r.verbas[0].ocorrencias[0].valor_final,
    indice_correcao: r.verbas[0].ocorrencias[0].indice_correcao,
  }));
}
