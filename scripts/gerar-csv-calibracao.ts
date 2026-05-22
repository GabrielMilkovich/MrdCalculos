#!/usr/bin/env tsx
/**
 * Gera CSV minimalista pra calibração — formato Data;HH:MM;HH:MM;...
 * compatível com o esperado pelo scripts/calibracao/calibrar.py.
 *
 * Pipeline: PDF → extrator (unpdf local) → dispatcher (escolherEMapear)
 *           → CSV ground-truth-like (sem dia_semana, sem ocorrencia, sem eventos)
 *
 * Uso: tsx scripts/gerar-csv-calibracao.ts <pdf_in> <csv_out>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { escolherEMapear } from '../supabase/functions/_shared/mappers/dispatcher.ts';
import {
  clusterizarLinhas,
  detectarTabelas,
  linhaParaTextoPlano,
} from '../supabase/functions/_shared/extrator-geometrico.ts';

function formatarDataBR(iso: string): string {
  // 2021-06-16 → 16/06/2021
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

async function main() {
  const [pdfIn, csvOut] = process.argv.slice(2);
  if (!pdfIn || !csvOut) {
    console.error('Uso: tsx scripts/gerar-csv-calibracao.ts <pdf> <csv_out>');
    process.exit(2);
  }

  const unpdf = await import('unpdf');
  const pdfjs = await unpdf.getResolvedPDFJS();

  const bytes = readFileSync(pdfIn);
  const u8 = new Uint8Array(bytes);
  const doc = await pdfjs.getDocument({ data: u8, disableWorker: true }).promise;

  const paginas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg: any = await doc.getPage(i);
    const content = await pg.getTextContent();
    const viewport = pg.getViewport({ scale: 1.0 });
    const textos = (content.items as any[])
      .filter((it: any) => 'str' in it && typeof it.str === 'string' && it.str.trim().length > 0)
      .map((it: any) => ({
        texto: it.str,
        x: it.transform[4],
        y: viewport.height - it.transform[5],
        width: it.width ?? 0,
        height: it.height ?? 0,
        fontSize: it.height ?? 10,
      }));
    const linhas = clusterizarLinhas(textos);
    const tabelas = detectarTabelas(linhas);
    paginas.push({
      numero: i,
      textos,
      tabelas,
      textoPlano: linhas.map(linhaParaTextoPlano).join('\n'),
    });
  }
  const textoCompleto = paginas
    .map((p) => p.textoPlano)
    .join('\n\n--- PÁGINA SEPARADOR ---\n\n');
  const docTab = {
    numeroPaginas: doc.numPages,
    paginas,
    textoCompleto,
    extractor: 'pdfjs_geometric',
    qualidade: { score: 0.9, razao: 'calibração local' },
  };

  const dispatch = escolherEMapear(docTab as any);
  if (dispatch.kind !== 'success') {
    console.error(`Pipeline falhou: kind=${dispatch.kind}`);
    process.exit(1);
  }
  const r = dispatch.executado.resultado as any;

  // CSV formato: Data;HH:MM;HH:MM;... (uma linha por apuração)
  // Headers fake (calibrar.py pula a primeira linha)
  const lines: string[] = ['Data;Batida1;Batida2;Batida3;Batida4;Batida5;Batida6'];
  for (const ap of r.apuracoes) {
    const horas: string[] = [];
    for (const m of ap.marcacoes) {
      if (m.e) horas.push(m.e);
      if (m.s) horas.push(m.s);
    }
    // Padding pra ter exatamente N colunas — preserva linha mesmo só com data
    const cols = [formatarDataBR(ap.data), ...horas];
    lines.push(cols.join(';'));
  }
  const csv = lines.join('\r\n') + '\r\n';
  writeFileSync(csvOut, csv);
  console.log(
    `OK — ${r.apuracoes.length} apurações exportadas pra ${csvOut} (mapper=${dispatch.executado.slug}, mappers_executados=${dispatch.executado.mappers_executados.join('+')})`,
  );
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
