import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

interface TextItem {
  texto: string;
  x: number;
  y: number;
  width: number;
}

export async function extrairTextoLayout(pdfBytes: Uint8Array): Promise<string> {
  const doc = await pdfjs.getDocument({ data: pdfBytes, disableWorker: true }).promise;
  const paginas: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    // Filtra items vazios (espaços-puros, sem texto). Os gaps entre items
    // de texto preservam o layout: espaços visuais viram espaços no output.
    const items: TextItem[] = (content.items as any[])
      .filter((it) => 'str' in it && it.str.trim().length > 0 && (it.width ?? 0) > 0)
      .map((it) => ({
        texto: it.str,
        x: it.transform[4],
        y: viewport.height - it.transform[5],
        width: it.width ?? 0,
      }));

    items.sort((a, b) => a.y - b.y || a.x - b.x);

    const linhas: TextItem[][] = [];
    let atual: TextItem[] = [];
    let yRef = -Infinity;

    for (const it of items) {
      if (it.y - yRef > 3) {
        if (atual.length) linhas.push(atual);
        atual = [it];
        yRef = it.y;
      } else {
        atual.push(it);
      }
    }
    if (atual.length) linhas.push(atual);

    // Estratégia geométrica: cada item tem um (x, width). Calculamos
    // char width LOCAL por item (it.width / it.texto.length), o que cobre
    // variação de fontes entre seções tabulares (condensada ~3pt) e KV
    // (~4.8pt). Mapeamos o gap visual entre items a número de espaços.
    //
    // Threshold: gap > 0.5 × charWidth gera espaços extras; abaixo disso,
    // assumimos espaçamento natural entre itens adjacentes (1 espaço se
    // necessário).
    const CHAR_WIDTH_FALLBACK = 3.0;
    const linhasTexto = linhas.map((linha) => {
      linha.sort((a, b) => a.x - b.x);
      let resultado = '';
      let xCursor = 0;
      let firstItem = true;
      for (const it of linha) {
        const charWidth =
          it.width > 0 && it.texto.length > 0
            ? it.width / it.texto.length
            : CHAR_WIDTH_FALLBACK;
        if (firstItem) {
          const initialCol = Math.max(0, Math.round(it.x / charWidth));
          resultado = ' '.repeat(initialCol);
          firstItem = false;
        } else {
          const gap = it.x - xCursor;
          if (gap > charWidth * 0.5) {
            const spaces = Math.max(1, Math.round(gap / charWidth));
            resultado += ' '.repeat(spaces);
          } else if (
            gap > -charWidth &&
            resultado.length > 0 &&
            !resultado.endsWith(' ') &&
            !it.texto.startsWith(' ')
          ) {
            resultado += ' ';
          }
        }
        resultado += it.texto;
        xCursor = it.x + (it.width || it.texto.length * charWidth);
      }
      return resultado.trimEnd();
    });

    paginas.push(linhasTexto.join("\n"));
  }

  return paginas.join("\n\n");
}
