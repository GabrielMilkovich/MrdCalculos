import { readFileSync } from 'node:fs';
import { clusterizarLinhas, linhaParaTextoPlano } from '/home/user/MrdCalculos/supabase/functions/_shared/extrator-geometrico.ts';
async function main() {
  const unpdf = await import('unpdf');
  const pdfjs = await unpdf.getResolvedPDFJS();
  const bytes = readFileSync('/tmp/calibracao/calibracao/pdfs/jefferson_novo.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true }).promise;
  const pg: any = await doc.getPage(2);
  const content = await pg.getTextContent();
  const viewport = pg.getViewport({ scale: 1.0 });
  const textos = (content.items as any[])
    .filter((it: any) => 'str' in it && typeof it.str === 'string' && it.str.trim().length > 0)
    .map((it: any) => ({ texto: it.str, x: it.transform[4], y: viewport.height - it.transform[5], width: it.width ?? 0, height: it.height ?? 0, fontSize: it.height ?? 10 }));
  const linhas = clusterizarLinhas(textos);
  const plano = linhas.map(linhaParaTextoPlano).join('\n');
  // Imprime linhas que casam padrão DD/MM/YYYY - Dow
  const RE = /^(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(Dom|Seg|Ter|Qua|Qui|Sex|Sáb|Sab)/i;
  for (const l of plano.split('\n')) {
    if (RE.test(l.trim())) console.log(`>> ${l.trim().slice(0, 150)}`);
  }
}
main().catch(console.error);
