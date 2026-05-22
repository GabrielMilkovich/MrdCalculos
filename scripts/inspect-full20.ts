import { readFileSync } from 'node:fs';
import { clusterizarLinhas, detectarTabelas } from '/home/user/MrdCalculos/supabase/functions/_shared/extrator-geometrico.ts';
async function main() {
  const unpdf = await import('unpdf');
  const pdfjs = await unpdf.getResolvedPDFJS();
  const bytes = readFileSync('/tmp/calibracao/calibracao/pdfs/jefferson_novo.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true }).promise;
  // Jefferson NOVO — pages around transition
  for (const pageNum of [1, 2, 3, 4]) {
    const pg: any = await doc.getPage(pageNum);
    const content = await pg.getTextContent();
    const viewport = pg.getViewport({ scale: 1.0 });
    const textos = (content.items as any[])
      .filter((it: any) => 'str' in it && typeof it.str === 'string' && it.str.trim().length > 0)
      .map((it: any) => ({ texto: it.str, x: it.transform[4], y: viewport.height - it.transform[5], width: it.width ?? 0, height: it.height ?? 0, fontSize: it.height ?? 10 }));
    const linhas = clusterizarLinhas(textos);
    const tabelas = detectarTabelas(linhas);
    console.log(`\n--- PÁGINA ${pageNum}: ${tabelas.length} tabelas ---`);
    for (let ti = 0; ti < tabelas.length; ti++) {
      const t = tabelas[ti];
      console.log(`  Tabela ${ti}: ${t.linhas.length} linhas, headers=[${t.headers.slice(0,4).join(' | ')}]`);
      if (t.linhas.length > 0) {
        console.log(`    R0: ${t.linhas[0].slice(0, 4).map(c => c.texto.slice(0, 25)).join(' | ')}`);
        console.log(`    R-1: ${t.linhas[t.linhas.length - 1].slice(0, 4).map(c => c.texto.slice(0, 25)).join(' | ')}`);
      }
    }
  }
}
main().catch(console.error);
