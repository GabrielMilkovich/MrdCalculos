import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';
import { analyzePJC } from '../lib/pjecalc/pjc-analyzer';
import { JSDOM } from 'jsdom';

if (typeof globalThis.DOMParser === 'undefined') {
  (globalThis as any).DOMParser = new JSDOM('').window.DOMParser;
}

describe('Extract Roque Guerreiro PJC', () => {
  it('should extract and analyze', async () => {
    const buf = readFileSync(join(__dirname, '../../public/reports/roque-guerreiro.pjc'));
    const zip = await JSZip.loadAsync(buf);
    const allFiles = Object.keys(zip.files);
    console.log('Files:', allFiles);
    const mainFile = allFiles.find(f => f.endsWith('.PJC') || f.endsWith('.xml')) || allFiles[0];
    const xmlContent = await zip.files[mainFile].async('string');
    console.log('XML length:', xmlContent.length);

    const a = analyzePJC(xmlContent);

    console.log('\n=== PARÂMETROS ===');
    console.log(JSON.stringify(a.parametros, null, 2));
    console.log('\n=== RESULTADO ===');
    console.log(JSON.stringify(a.resultado, null, 2));

    console.log('\n=== VERBAS (' + a.verbas.length + ') ===');
    for (const v of a.verbas) {
      console.log(`[${v.tipo}] ${v.nome} | Div=${v.formula.divisor.valor} Mult=${v.formula.multiplicador.valor} Qtd=${v.formula.quantidade.tipo}:${v.formula.quantidade.valor} | Devido=${v.total_devido?.toFixed(2)} Pago=${v.total_pago?.toFixed(2)} Diff=${v.total_diferenca?.toFixed(2)} | Oc=${v.ocorrencias_count}`);
      if (v.formula.base_verbas.length > 0) console.log(`  Base: ${v.formula.base_verbas.map(b => b.nome).join(', ')}`);
      if (v.comportamento_reflexo) console.log(`  Reflexo: ${v.comportamento_reflexo} | Média: ${v.periodo_media} | Fração: ${v.tratamento_fracao}`);
      if (v.formula.base_tabelada) console.log(`  Base Tabelada: ${v.formula.base_tabelada}`);
      if (v.formula.valor_pago) console.log(`  Valor Pago: ${v.formula.valor_pago.tipo}=${v.formula.valor_pago.valor}`);
      console.log(`  Inc: INSS=${v.incidencias.inss} IRPF=${v.incidencias.irpf} FGTS=${v.incidencias.fgts} | Per: ${v.periodo_inicio} a ${v.periodo_fim}`);
      for (const oc of v.ocorrencias_sample.slice(0, 3)) {
        console.log(`    ${oc.competencia}: base=${oc.base} div=${oc.divisor} mult=${oc.multiplicador} qtd=${oc.quantidade} devido=${oc.devido} pago=${oc.pago}${oc.indice_acumulado ? ' idx=' + oc.indice_acumulado : ''}`);
      }
    }

    console.log('\n=== HISTÓRICOS (' + a.historicos_salariais.length + ') ===');
    for (const h of a.historicos_salariais) {
      console.log(`${h.nome} (${h.tipo_variacao}) ${h.ocorrencias_count}m | INSS=${h.incide_inss} FGTS=${h.incide_fgts}`);
      for (const c of h.competencias.slice(0, 3)) console.log(`  ${c.comp}: R$ ${c.valor.toFixed(2)}`);
      if (h.competencias.length > 3) console.log(`  ... +${h.competencias.length - 3}`);
    }

    console.log('\n=== FALTAS (' + a.faltas.length + ') | FÉRIAS (' + a.ferias.length + ') ===');
    for (const f of a.faltas.slice(0, 5)) console.log(`  ${f.data_inicio} a ${f.data_fim} | ${f.justificada ? 'J' : 'NJ'}`);
    for (const f of a.ferias.slice(0, 5)) console.log(`  Aq: ${f.aquisitivo_inicio}-${f.aquisitivo_fim} | ${f.dias}d | ${f.situacao} Dobra=${f.dobra}`);

    console.log('\n=== ATUALIZAÇÃO ===');
    console.log('Índices:', JSON.stringify(a.atualizacao.combinacoes_indice));
    console.log('Juros:', JSON.stringify(a.atualizacao.combinacoes_juros));

    console.log('\n=== DAG ===');
    for (const n of a.dag) console.log(`${n.nome} dep:[${n.depende_de.join(',')}] out:[${n.dependentes.join(',')}]`);

    console.log('\nApuração diária:', a.apuracao_diaria_count);

    expect(a.parametros.beneficiario).toBeTruthy();
    expect(a.verbas.length).toBeGreaterThan(0);
  });
});
