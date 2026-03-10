/**
 * Extract snapshot data for all 7 new PJC cases
 * Run: npx vitest run src/test/extract-snapshots.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';

const FILES = [
  'islan-rodrigues.pjc',
  'leide-santana.pjc', 
  'vanderlei-carvalho.pjc',
  'carla-pego.pjc',
  'francisco-pablo.pjc',
  'pyter-gabriel.pjc',
  'tiago-jose.pjc',
];

const analyses = new Map<string, PJCAnalysis>();

beforeAll(() => {
  for (const f of FILES) {
    const content = readFileSync(resolve(__dirname, `../../public/reports/${f}`), 'utf-8');
    analyses.set(f, analyzePJC(content));
  }
}, 60000);

describe('Extract verbas detail for snapshots', () => {
  it.each(FILES)('verbas for %s', (file) => {
    const a = analyses.get(file)!;
    const calculadas = a.verbas.filter(v => v.tipo === 'Calculada' && v.ativo);
    const reflexos = a.verbas.filter(v => v.tipo === 'Reflexo' && v.ativo);

    console.log(`\n═══ ${file} ═══`);
    console.log(`Reclamante: ${a.parametros.beneficiario}`);
    console.log(`Reclamado: ${a.parametros.reclamado}`);
    console.log(`CPF: ${a.parametros.cpf}`);
    console.log(`CNPJ: ${a.parametros.cnpj}`);
    console.log(`Admissão: ${a.parametros.admissao}`);
    console.log(`Demissão: ${a.parametros.demissao}`);
    console.log(`Ajuizamento: ${a.parametros.ajuizamento}`);
    console.log(`Início cálculo: ${a.parametros.inicio_calculo}`);
    console.log(`Término cálculo: ${a.parametros.termino_calculo}`);
    console.log(`CH: ${a.parametros.carga_horaria}`);
    console.log(`Sábado DU: ${a.parametros.sabado_dia_util}`);
    console.log(`Projeta aviso: ${a.parametros.projeta_aviso}`);
    console.log(`Prescrição: ${a.parametros.prescricao_quinquenal}`);
    console.log(`Zera negativo: ${a.parametros.zera_negativo}`);
    console.log(`Regime: ${a.parametros.regime}`);
    console.log(`Índices: ${a.parametros.indices_acumulados}`);
    console.log(`Dia fech: ${a.parametros.dia_fechamento}`);
    console.log(`Versão: ${a.parametros.versao_sistema}`);
    console.log(`Feriado est: ${a.parametros.feriado_estadual}`);
    console.log(`Feriado mun: ${a.parametros.feriado_municipal}`);
    console.log(`Limitar avos: ${a.parametros.limitar_avos}`);
    console.log(`Prescrição FGTS: ${a.parametros.prescricao_fgts}`);
    
    console.log(`\nRESULTADO:`);
    console.log(`  Líquido: ${a.resultado.liquido_exequente}`);
    console.log(`  INSS Recl: ${a.resultado.inss_reclamante}`);
    console.log(`  INSS Reclado: ${a.resultado.inss_reclamado}`);
    console.log(`  IR: ${a.resultado.imposto_renda}`);
    console.log(`  FGTS dep: ${a.resultado.fgts_deposito}`);
    console.log(`  Custas: ${a.resultado.custas}`);
    console.log(`  Honorários: ${JSON.stringify(a.resultado.honorarios)}`);
    
    console.log(`\nCALCULADAS (${calculadas.length}):`);
    for (const v of calculadas) {
      console.log(`  [${v.nome}] div=${v.formula.divisor.tipo}:${v.formula.divisor.valor} mult=${v.formula.multiplicador.valor} qtd=${v.formula.quantidade.tipo}:${v.formula.quantidade.valor} base_tab=${v.formula.base_tabelada || 'N/A'} base_verbas=[${v.formula.base_verbas.map(b => `${b.nome}(int:${b.integralizar})`).join(', ')}] incid=INSS:${v.incidencias.inss}/IRPF:${v.incidencias.irpf}/FGTS:${v.incidencias.fgts} carac=${v.caracteristica} oc_pgto=${v.ocorrencia_pagamento} var=${v.variacao} pago_tipo=${v.formula.valor_pago?.tipo || 'N/A'} oc=${v.ocorrencias_count} devido=${v.total_devido} pago=${v.total_pago} dif=${v.total_diferenca}`);
    }
    
    console.log(`\nREFLEXOS (${reflexos.length}):`);
    for (const v of reflexos) {
      console.log(`  [${v.nome}] comportamento=${v.comportamento_reflexo} periodo_media=${v.periodo_media} base_verbas=[${v.formula.base_verbas.map(b => `${b.nome}(int:${b.integralizar})`).join(', ')}] div=${v.formula.divisor.tipo}:${v.formula.divisor.valor} mult=${v.formula.multiplicador.valor} qtd=${v.formula.quantidade.tipo}:${v.formula.quantidade.valor} carac=${v.caracteristica} oc_pgto=${v.ocorrencia_pagamento} oc=${v.ocorrencias_count} devido=${v.total_devido} pago=${v.total_pago} dif=${v.total_diferenca}`);
    }

    console.log(`\nHISTÓRICOS (${a.historicos_salariais.length}):`);
    for (const h of a.historicos_salariais) {
      console.log(`  [${h.nome}] tipo=${h.tipo_variacao} inss=${h.incide_inss} fgts=${h.incide_fgts} oc=${h.ocorrencias_count}`);
    }

    console.log(`Faltas: ${a.faltas.length}`);
    console.log(`Férias: ${a.ferias.length}`);
    console.log(`Apuração diária: ${a.apuracao_diaria_count}`);
    console.log(`Atualização índice: ${JSON.stringify(a.atualizacao.combinacoes_indice)}`);
    console.log(`Atualização juros: ${JSON.stringify(a.atualizacao.combinacoes_juros)}`);

    expect(a).toBeDefined();
  });
});
