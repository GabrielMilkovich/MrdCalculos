#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { escolherEMapear } from '../supabase/functions/_shared/mappers/dispatcher.ts';
import {
  clusterizarLinhas,
  detectarTabelas,
  linhaParaTextoPlano,
} from '../supabase/functions/_shared/extrator-geometrico.ts';

async function main() {
  const unpdf = await import('unpdf');
  const pdfjs = await unpdf.getResolvedPDFJS();
  const bytes = readFileSync('/root/.claude/uploads/c723fed6-cb79-486b-881e-7a29527bfb3c/afd2c83b-Cartoes_de_ponto.pdf');
  const u8 = new Uint8Array(bytes);
  const doc = await pdfjs.getDocument({ data: u8, disableWorker: true }).promise;

  const paginas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg: any = await doc.getPage(i);
    const content = await pg.getTextContent();
    const viewport = pg.getViewport({ scale: 1.0 });
    const textos = (content.items as any[])
      .filter((it: any) => 'str' in it && typeof it.str === 'string' && it.str.trim().length > 0)
      .map((it: any) => ({ texto: it.str, x: it.transform[4], y: viewport.height - it.transform[5], width: it.width ?? 0, height: it.height ?? 0, fontSize: it.height ?? 10 }));
    const linhas = clusterizarLinhas(textos);
    const tabelas = detectarTabelas(linhas);
    paginas.push({ numero: i, textos, tabelas, textoPlano: linhas.map(linhaParaTextoPlano).join('\n') });
  }
  const textoCompleto = paginas.map(p => p.textoPlano).join('\n\n--- PÁGINA SEPARADOR ---\n\n');
  const docTab = { numeroPaginas: doc.numPages, paginas, textoCompleto, extractor: 'pdfjs_geometric', qualidade: { score: 0.9, razao: 'd' } };

  const dispatch = escolherEMapear(docTab as any);
  if (dispatch.kind !== 'success') { console.log('kind:', dispatch.kind); process.exit(1); }
  const r = dispatch.executado.resultado as any;

  const datasTransicao = ['2021-05-17', '2021-06-14', '2021-06-15', '2021-06-16', '2021-06-17'];
  for (const d of datasTransicao) {
    const ap = r.apuracoes.find((a: any) => a.data === d);
    if (ap) {
      console.log(`${d}: ${ap.ocorrencia} | ${ap.marcacoes.length} pares | obs=${ap.observacao} | marcacoes=${JSON.stringify(ap.marcacoes)}`);
    } else {
      console.log(`${d}: AUSENTE em apuracoes`);
    }
  }
  const com3 = r.apuracoes.filter((a: any) => a.marcacoes.length >= 3);
  console.log(`\nApurações com 3+ pares (jornada extendida): ${com3.length}`);
  if (com3.length > 0) console.log('  exemplos:', com3.slice(0, 5).map((a: any) => `${a.data} ${a.marcacoes.length}p`));
}
main().catch(console.error);
