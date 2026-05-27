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

    const items: TextItem[] = (content.items as any[])
      .filter((it) => "str" in it && it.str.trim().length > 0)
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

    const linhasTexto = linhas.map((linha) => {
      linha.sort((a, b) => a.x - b.x);
      let resultado = "";
      for (const it of linha) {
        const colDestino = Math.floor(it.x / 4.8);
        while (resultado.length < colDestino) resultado += " ";
        resultado += it.texto;
      }
      return resultado.trimEnd();
    });

    paginas.push(linhasTexto.join("\n"));
  }

  return paginas.join("\n\n");
}
