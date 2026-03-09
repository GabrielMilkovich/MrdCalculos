/**
 * Extraction test — reads the Rosicléia .PJC file and outputs
 * the full analysis for populating the golden snapshot.
 */
import { describe, it, expect } from 'vitest';
import { analyzePJC } from '@/lib/pjecalc/pjc-analyzer';
import JSZip from 'jszip';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function extractXmlFromPjc(buffer: Buffer): Promise<string> {
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    // It's a ZIP — pass Uint8Array copy
    const uint8 = new Uint8Array(buffer);
    const zip = await JSZip.loadAsync(uint8);
    const files = Object.keys(zip.files);
    const pjcFile = files.find(f => f.endsWith('.PJC') || f.endsWith('.pjc') || f.endsWith('.xml'));
    if (pjcFile) {
      return await zip.files[pjcFile].async('string');
    }
    if (files.length > 0) {
      return await zip.files[files[0]].async('string');
    }
  }
  return buffer.toString('utf-8');
}

describe('PJC Extraction: Rosicléia Pereira Chaves', () => {
  it('should extract all data from the PJC file', async () => {
    const filePath = resolve(__dirname, '../../public/reports/rosicleia-pereira-chaves.pjc');
    const buffer = readFileSync(filePath);
    const xml = await extractXmlFromPjc(buffer);
    expect(xml.length).toBeGreaterThan(100);
    
    const analysis = analyzePJC(xml);
    expect(analysis).toBeDefined();

    console.log('===== PARÂMETROS =====');
    console.log(JSON.stringify(analysis.parametros, null, 2));

    console.log('\n===== RESULTADO =====');
    console.log(JSON.stringify(analysis.resultado, null, 2));

    console.log('\n===== VERBAS =====');
    console.log(`Total: ${analysis.verbas.length} verbas`);
    for (const v of analysis.verbas) {
      console.log(`  [${v.tipo}] ${v.nome} | devido=${v.total_devido?.toFixed(2)} | pago=${v.total_pago?.toFixed(2)} | dif=${v.total_diferenca?.toFixed(2)} | ocorr=${v.ocorrencias_count}`);
    }

    console.log('\n===== FALTAS =====');
    console.log(JSON.stringify(analysis.faltas, null, 2));

    console.log('\n===== FÉRIAS =====');
    console.log(JSON.stringify(analysis.ferias, null, 2));

    console.log('\n===== ATUALIZAÇÃO =====');
    console.log(JSON.stringify(analysis.atualizacao, null, 2));

    console.log('\n===== HISTÓRICOS SALARIAIS =====');
    for (const h of analysis.historicos_salariais) {
      console.log(`  ${h.nome} (${h.tipo_variacao}) — ${h.ocorrencias_count} comps | INSS=${h.incide_inss} | FGTS=${h.incide_fgts}`);
    }

    console.log('\n===== DAG =====');
    for (const node of analysis.dag) {
      console.log(`  ${node.nome} → deps=[${node.depende_de.join(',')}] children=[${node.dependentes.join(',')}]`);
    }

    console.log('\n===== APURAÇÃO DIÁRIA =====');
    console.log(`${analysis.apuracao_diaria_count} registros`);

    // Basic assertions
    expect(analysis.parametros.beneficiario).toBeTruthy();
    expect(analysis.verbas.length).toBeGreaterThan(0);
  });
});
