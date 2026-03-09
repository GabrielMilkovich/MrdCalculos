/**
 * Extraction test — reads the Rosicléia .PJC file and outputs
 * the full analysis for populating the golden snapshot.
 */
import { describe, it, expect } from 'vitest';
import { analyzePJC } from '@/lib/pjecalc/pjc-analyzer';
import JSZip from 'jszip';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function extractXmlFromPjc(data: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(data);
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
    const zip = await JSZip.loadAsync(data);
    const files = Object.keys(zip.files);
    const pjcFile = files.find(f => f.endsWith('.PJC') || f.endsWith('.pjc') || f.endsWith('.xml'));
    if (pjcFile) {
      return await zip.files[pjcFile].async('string');
    }
    // Try first file
    if (files.length > 0) {
      return await zip.files[files[0]].async('string');
    }
  }
  return new TextDecoder().decode(data);
}

describe('PJC Extraction: Rosicléia Pereira Chaves', () => {
  let analysis: ReturnType<typeof analyzePJC>;

  it('should load and parse the PJC file', async () => {
    const filePath = resolve(__dirname, '../../public/reports/rosicleia-pereira-chaves.pjc');
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const xml = await extractXmlFromPjc(arrayBuffer);
    expect(xml.length).toBeGreaterThan(100);
    
    analysis = analyzePJC(xml);
    expect(analysis).toBeDefined();
    expect(analysis.parametros.beneficiario).toBeTruthy();
  });

  it('should extract parametros', async () => {
    const filePath = resolve(__dirname, '../../public/reports/rosicleia-pereira-chaves.pjc');
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const xml = await extractXmlFromPjc(arrayBuffer);
    analysis = analyzePJC(xml);

    console.log('===== PARÂMETROS =====');
    console.log(JSON.stringify(analysis.parametros, null, 2));
  });

  it('should extract resultado', async () => {
    const filePath = resolve(__dirname, '../../public/reports/rosicleia-pereira-chaves.pjc');
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteLength + buffer.byteOffset);
    const xml = await extractXmlFromPjc(arrayBuffer);
    analysis = analyzePJC(xml);

    console.log('===== RESULTADO =====');
    console.log(JSON.stringify(analysis.resultado, null, 2));
  });

  it('should extract verbas with totals', async () => {
    const filePath = resolve(__dirname, '../../public/reports/rosicleia-pereira-chaves.pjc');
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const xml = await extractXmlFromPjc(arrayBuffer);
    analysis = analyzePJC(xml);

    console.log('===== VERBAS =====');
    console.log(`Total: ${analysis.verbas.length} verbas`);
    for (const v of analysis.verbas) {
      console.log(`  [${v.tipo}] ${v.nome} | devido=${v.total_devido?.toFixed(2)} | pago=${v.total_pago?.toFixed(2)} | dif=${v.total_diferenca?.toFixed(2)} | ocorr=${v.ocorrencias_count}`);
    }
  });

  it('should extract faltas', async () => {
    const filePath = resolve(__dirname, '../../public/reports/rosicleia-pereira-chaves.pjc');
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const xml = await extractXmlFromPjc(arrayBuffer);
    analysis = analyzePJC(xml);

    console.log('===== FALTAS =====');
    console.log(JSON.stringify(analysis.faltas, null, 2));
  });

  it('should extract ferias', async () => {
    const filePath = resolve(__dirname, '../../public/reports/rosicleia-pereira-chaves.pjc');
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const xml = await extractXmlFromPjc(arrayBuffer);
    analysis = analyzePJC(xml);

    console.log('===== FÉRIAS =====');
    console.log(JSON.stringify(analysis.ferias, null, 2));
  });

  it('should extract atualizacao config', async () => {
    const filePath = resolve(__dirname, '../../public/reports/rosicleia-pereira-chaves.pjc');
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const xml = await extractXmlFromPjc(arrayBuffer);
    analysis = analyzePJC(xml);

    console.log('===== ATUALIZAÇÃO =====');
    console.log(JSON.stringify(analysis.atualizacao, null, 2));
  });

  it('should extract historicos salariais', async () => {
    const filePath = resolve(__dirname, '../../public/reports/rosicleia-pereira-chaves.pjc');
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const xml = await extractXmlFromPjc(arrayBuffer);
    analysis = analyzePJC(xml);

    console.log('===== HISTÓRICOS SALARIAIS =====');
    for (const h of analysis.historicos_salariais) {
      console.log(`  ${h.nome} (${h.tipo_variacao}) — ${h.ocorrencias_count} competências | INSS=${h.incide_inss} | FGTS=${h.incide_fgts}`);
      if (h.competencias.length <= 5) {
        for (const c of h.competencias) {
          console.log(`    ${c.comp}: R$ ${c.valor.toFixed(2)}`);
        }
      }
    }
  });

  it('should extract DAG', async () => {
    const filePath = resolve(__dirname, '../../public/reports/rosicleia-pereira-chaves.pjc');
    const buffer = readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const xml = await extractXmlFromPjc(arrayBuffer);
    analysis = analyzePJC(xml);

    console.log('===== DAG =====');
    for (const node of analysis.dag) {
      console.log(`  ${node.nome} → depende_de=[${node.depende_de.join(',')}] dependentes=[${node.dependentes.join(',')}]`);
    }
  });
});
