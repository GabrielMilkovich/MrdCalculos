import { readFileSync } from 'node:fs';
import {
  clusterizarLinhas,
  detectarTabelas,
} from '/home/user/MrdCalculos/supabase/functions/_shared/extrator-geometrico.ts';

async function main() {
  const unpdf = await import('unpdf');
  const pdfjs = await unpdf.getResolvedPDFJS();
  const bytes = readFileSync('/tmp/calibracao/calibracao/pdfs/izabela_hibrido.pdf');
  const u8 = new Uint8Array(bytes);
  const doc = await pdfjs.getDocument({ data: u8, disableWorker: true }).promise;
  const pg: any = await doc.getPage(20); // página 20 da Izabela
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
  console.log(`Total tabelas detectadas: ${tabelas.length}`);
  for (let ti = 0; ti < tabelas.length; ti++) {
    const t = tabelas[ti];
    console.log(`\n=== Tabela ${ti}: headers=[${t.headers.join(' | ')}] ${t.linhas.length} linhas ===`);
    for (let ri = 0; ri < Math.min(10, t.linhas.length); ri++) {
      const cells = t.linhas[ri].map((c) => c.texto);
      console.log(`  R${ri}: [${cells.map(c => JSON.stringify(c)).join(' | ')}]`);
    }
  }
}
main().catch(console.error);
