import * as fs from 'fs';
import { analyzePJC } from '../src/lib/pjecalc/pjc-analyzer.ts';
import { convertPjcToEngineInputs } from '../src/lib/pjecalc/pjc-to-engine.ts';

const file = process.argv[2] || 'Arquivos PJC/PROCESSO_00011931620255050194_CALCULO_4465_DATA_05032026_HORA_164101.PJC';
const xml = fs.readFileSync(file, 'latin1');

const a = analyzePJC(xml);
console.log('Resultado analyzer:');
console.log('  liquido_exequente:', a.resultado?.liquido_exequente);
console.log('  valor_principal:', a.resultado?.valor_principal);
console.log('  inss_reclamante:', a.resultado?.inss_reclamante);
console.log('  verbas.length:', a.verbas.length);
console.log('  historicos.length:', a.historicos_salariais.length);
const v0 = a.verbas[0];
if (v0) {
  console.log('  sample verba[0]:', {
    id: v0.id,
    nome: v0.nome,
    tipo: v0.tipo,
    ocorrencias_all: v0.ocorrencias_all?.length,
    firstOcDev: v0.ocorrencias_all?.[0]?.valor_devido,
    firstOcDif: v0.ocorrencias_all?.[0]?.valor_diferenca,
    base_calc_historicos: v0.base_calculo?.historicos?.length,
  });
}

const h0 = a.historicos_salariais[0];
if (h0) {
  console.log('  sample historico[0]:', {
    nome: h0.nome,
    ocorrencias: h0.ocorrencias?.length,
    firstValor: h0.ocorrencias?.[0]?.valor,
    periodo_inicio: h0.periodo_inicio,
    periodo_fim: h0.periodo_fim,
  });
}

const inputs = convertPjcToEngineInputs(a, 'debug');
console.log('\nBridge inputs:');
console.log('  verbas count:', inputs.verbas.length);
console.log('  historicos:', inputs.historicos.length);
console.log('  historicos[0].ocorrencias:', inputs.historicos[0]?.ocorrencias?.length);
console.log('  historicos[0].valor_informado:', inputs.historicos[0]?.valor_informado);

const iv0 = inputs.verbas[0];
if (iv0) {
  console.log('  first verba:', {
    id: iv0.id,
    nome: iv0.nome,
    tipo: iv0.tipo,
    valor: iv0.valor,
    divisor: iv0.divisor_informado,
    mult: iv0.multiplicador,
    qty: iv0.quantidade_informada,
    periodo_inicio: iv0.periodo_inicio,
    periodo_fim: iv0.periodo_fim,
    base_historicos: iv0.base_calculo?.historicos,
  });
}
console.log('  correcaoConfig:', {
  indice: inputs.correcaoConfig.indice,
  juros_tipo: inputs.correcaoConfig.juros_tipo,
  base_de_juros_das_verbas: inputs.correcaoConfig.base_de_juros_das_verbas,
  data_liquidacao: inputs.correcaoConfig.data_liquidacao,
  combinacoes_indice: inputs.correcaoConfig.combinacoes_indice?.length,
});
