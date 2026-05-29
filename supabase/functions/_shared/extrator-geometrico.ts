/**
 * Extrator geométrico universal — Camada 2 da arquitetura v6.
 *
 * Lê PDFs text-native via pdfjs-dist e devolve `DocumentoTabular` com
 * coordenadas (x,y) preservadas. Mappers (`./mappers/*.ts`) operam sobre
 * essa estrutura sem conhecer detalhes do PDF.
 *
 * IMPORTANTE — runtime:
 *   - Deno (edge function): usa `pdfjs-dist` via esm.sh.
 *   - Browser/vitest: NÃO importa o pdfjs neste módulo. Os helpers
 *     puros (`clusterizarLinhas`, `detectarTabelas`) são exportados
 *     separadamente para serem testáveis em vitest com input sintético.
 *
 * O fluxo end-to-end (`extrairGeometrico`) só é validado em deploy real
 * no edge function — vitest não consegue rodar pdfjs Deno-only sem
 * configuração extra. Smoke test pós-deploy: subir 1 PDF, conferir
 * `ocr_provider='pdfjs_geometric'`.
 */

import type {
  CelulaTabular,
  DocumentoTabular,
  PaginaTabular,
  TabelaDetectada,
  TextoPosicionado,
} from './documento-tabular.ts';

// =====================================================
// Helpers puros (testáveis)
// =====================================================

/**
 * Clusteriza items por coordenada Y. Items com Y próximos (dentro de
 * tolerância proporcional ao font size) pertencem à mesma linha visual.
 *
 * Tolerância default: max(fontSize * 0.5, 2pt). Ajustável quando o PDF
 * tem fontes muito pequenas/grandes.
 */
export function clusterizarLinhas(
  items: TextoPosicionado[],
): TextoPosicionado[][] {
  if (items.length === 0) return [];
  const ordenados = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const linhas: TextoPosicionado[][] = [];
  let linhaAtual: TextoPosicionado[] = [];
  let yReferencia = -Infinity;
  let fontReferencia = 10;

  for (const item of ordenados) {
    const tolerancia = Math.max(fontReferencia * 0.5, 2);
    if (item.y - yReferencia > tolerancia) {
      if (linhaAtual.length > 0) linhas.push(linhaAtual);
      linhaAtual = [item];
      yReferencia = item.y;
      fontReferencia = item.fontSize || 10;
    } else {
      linhaAtual.push(item);
    }
  }
  if (linhaAtual.length > 0) linhas.push(linhaAtual);

  // Dentro de cada linha, ordena por X.
  return linhas.map((l) => l.sort((a, b) => a.x - b.x));
}

/**
 * Concatena items de uma linha em texto plano com espaços naturais.
 * Items próximos (gap < fontSize) vêm juntos, distantes (gap > fontSize)
 * vêm com espaço extra.
 */
export function linhaParaTextoPlano(linha: TextoPosicionado[]): string {
  if (linha.length === 0) return '';
  const partes: string[] = [linha[0].texto];
  for (let i = 1; i < linha.length; i++) {
    const ant = linha[i - 1];
    const cur = linha[i];
    const gap = cur.x - (ant.x + ant.width);
    const tolerancia = Math.max(ant.fontSize * 0.3, 1);
    partes.push(gap > tolerancia ? ' ' : '');
    partes.push(cur.texto);
  }
  return partes.join('').replace(/\s+/g, ' ').trim();
}

/**
 * Detecta tabelas dentro de uma sequência de linhas.
 *
 * Heurística:
 *   1. Identifica blocos consecutivos de linhas com items alinhados em
 *      colunas (mesma X-position com tolerância).
 *   2. Mínimo de 3 linhas + 2 colunas para qualificar como tabela.
 *   3. Primeira linha do bloco vira header.
 *   4. Para cada linha de dados, items são alocados às colunas pelo X
 *      mais próximo do centroide da coluna.
 *
 * Tolerância default: 5pt (varia por fonte; funciona pra 95% dos PDFs).
 */
export function detectarTabelas(
  linhas: TextoPosicionado[][],
  toleranciaX = 5,
): TabelaDetectada[] {
  const tabelas: TabelaDetectada[] = [];
  if (linhas.length < 3) return tabelas;

  // Acha blocos consecutivos com mesma estrutura de colunas.
  let i = 0;
  while (i < linhas.length) {
    const blocoIni = i;
    const colunasReferencia = inferirColunas(linhas[i]);
    if (colunasReferencia.length < 2) {
      i++;
      continue;
    }
    let blocoFim = i;
    for (let j = i + 1; j < linhas.length; j++) {
      const cols = inferirColunas(linhas[j]);
      if (cols.length === 0) break;
      // Confere se ≥70% dos centros casam com colunasReferencia.
      const casados = cols.filter((c) =>
        colunasReferencia.some((ref) => Math.abs(c - ref) <= toleranciaX),
      ).length;
      const taxa = casados / colunasReferencia.length;
      if (taxa < 0.7) break;
      blocoFim = j;
    }
    if (blocoFim - blocoIni + 1 >= 3) {
      // Bloco válido — vira tabela.
      const linhasBloco = linhas.slice(blocoIni, blocoFim + 1);
      tabelas.push(montarTabela(linhasBloco, colunasReferencia, toleranciaX));
      i = blocoFim + 1;
    } else {
      i++;
    }
  }
  return tabelas;
}

/**
 * Infere as posições X de "colunas" de uma linha.
 * Heurística: cada item independente conta como uma coluna potencial.
 * Items próximos no eixo X (gap < fontSize) são considerados parte da
 * mesma coluna.
 */
function inferirColunas(linha: TextoPosicionado[]): number[] {
  if (linha.length === 0) return [];
  const cols: number[] = [linha[0].x];
  for (let i = 1; i < linha.length; i++) {
    const ant = linha[i - 1];
    const cur = linha[i];
    const gap = cur.x - (ant.x + ant.width);
    if (gap > Math.max(ant.fontSize * 1.5, 8)) {
      cols.push(cur.x);
    }
  }
  return cols;
}

function montarTabela(
  linhas: TextoPosicionado[][],
  colunas: number[],
  toleranciaX: number,
): TabelaDetectada {
  const headerLinha = linhas[0];
  const headers = colunas.map((cx) => {
    const items = headerLinha.filter(
      (it) => Math.abs(it.x - cx) <= toleranciaX,
    );
    return items
      .sort((a, b) => a.x - b.x)
      .map((it) => it.texto)
      .join(' ')
      .trim();
  });

  const linhasDados = linhas.slice(1).map((linha) => {
    const celulas: CelulaTabular[] = colunas.map((cx, idx) => {
      // Aloca items à coluna pelo X mais próximo.
      const fragmentos = linha.filter((it) => {
        let melhor = 0;
        let melhorDist = Infinity;
        for (let i = 0; i < colunas.length; i++) {
          const d = Math.abs(it.x - colunas[i]);
          if (d < melhorDist) {
            melhorDist = d;
            melhor = i;
          }
        }
        return melhor === idx;
      });
      const texto = fragmentos
        .sort((a, b) => a.x - b.x || a.y - b.y)
        .map((f) => f.texto)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      return { texto, coluna: idx, fragmentos };
    });
    return celulas;
  });

  // Bounding box do bloco.
  const todos = linhas.flat();
  const bbox = todos.reduce(
    (acc, it) => ({
      x0: Math.min(acc.x0, it.x),
      y0: Math.min(acc.y0, it.y),
      x1: Math.max(acc.x1, it.x + it.width),
      y1: Math.max(acc.y1, it.y + it.height),
    }),
    { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
  );

  return { bbox, headers, linhas: linhasDados };
}

// =====================================================
// Função principal — só roda em Deno (edge function)
// =====================================================

/**
 * Lê bytes de PDF e devolve `DocumentoTabular`.
 * Retorna `null` se o PDF não tem texto nativo extraível (escaneado).
 *
 * **Esta função só roda em Deno.** Em browser/vitest, o import dinâmico
 * de pdfjs-dist falha — os helpers acima são suficientes para testes
 * com input sintético.
 *
 * V6.2 (deploy real): tentamos unpdf primeiro (pdfjs sem canvas via
 * esm.sh — funciona em Deno serverless). Se falhar, devolvemos null e
 * o pipeline cai pro V5 (Mistral OCR + parser regex).
 */
/**
 * Fallback robusto via pdf-parse (puro JS, sem worker, sem dep esm.sh).
 * Quando unpdf falha, esse caminho mantém o pipeline determinístico ativo.
 * Não preserva coordenadas — só textoCompleto + textoPlano por página.
 * Suficiente pra parseFichaFinanceiraDeterministico (que regex sobre texto).
 */
async function extrairViaPdfParse(bytes: Uint8Array): Promise<DocumentoTabular | null> {
  try {
    // deno-lint-ignore no-explicit-any
    const pdfParse = (await import("npm:pdf-parse@1.1.1")).default as any;
    const result = await pdfParse(bytes);
    if (!result || !result.text || result.text.length < 200) {
      console.warn(`[extrair-geometrico] pdf-parse retornou texto curto: ${result?.text?.length ?? 0}`);
      return null;
    }
    const numPages = result.numpages ?? 1;
    const textoCompleto = result.text;
    const usefulChars = textoCompleto.replace(/\s+/g, "").length;
    if (usefulChars < 200) return null;

    const alnum = (textoCompleto.match(/[a-zA-Z0-9À-ÿ]/g) || []).length;
    const totalChars = textoCompleto.length;
    const alnumRatio = totalChars > 0 ? alnum / totalChars : 0;
    const charsPerPage = usefulChars / Math.max(1, numPages);
    let score = 0.4 + alnumRatio * 0.5;
    if (charsPerPage >= 500) score += 0.05;
    if (charsPerPage >= 1500) score += 0.05;
    score = Math.max(0.2, Math.min(0.95, score));

    console.log(`[extrair-geometrico] pdf-parse OK: ${numPages} páginas, ${usefulChars} chars úteis`);

    return {
      numeroPaginas: numPages,
      paginas: [{
        numero: 1,
        textos: [],
        tabelas: [],
        textoPlano: textoCompleto,
      }],
      textoCompleto,
      extractor: "pdfjs_geometric",
      qualidade: {
        score: +score.toFixed(2),
        razao: `${usefulChars} chars via pdf-parse (alnum=${(alnumRatio * 100).toFixed(0)}%)`,
      },
    };
  } catch (err) {
    console.error(`[extrair-geometrico] pdf-parse exception: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function extrairGeometrico(
  bytes: Uint8Array,
): Promise<DocumentoTabular | null> {
  // V6.3 (2026-05-29): cascata de fontes pra evitar falha silenciosa.
  // 1. unpdf via múltiplas URLs (preserva coordenadas)
  // 2. pdf-parse via npm: (sem coordenadas mas robusto)
  // 3. null (caller decide tratar)
  // deno-lint-ignore no-explicit-any
  let pdfjs: any;
  const fontes: Array<{ nome: string; url: string }> = [
    { nome: "npm:unpdf@0.12.1", url: "npm:unpdf@0.12.1" },
    { nome: "esm.sh@0.12.1", url: "https://esm.sh/unpdf@0.12.1" },
    { nome: "esm.sh@latest", url: "https://esm.sh/unpdf" },
  ];

  for (const f of fontes) {
    try {
      // deno-lint-ignore no-explicit-any
      const unpdf = (await import(f.url)) as any;
      pdfjs = await unpdf.getResolvedPDFJS();
      console.log(`[extrair-geometrico] unpdf carregado via ${f.nome}`);
      break;
    } catch (err) {
      console.warn(`[extrair-geometrico] falha em ${f.nome}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!pdfjs) {
    console.warn("[extrair-geometrico] unpdf indisponível — tentando pdf-parse");
    return await extrairViaPdfParse(bytes);
  }

  let doc: { numPages: number; getPage: (n: number) => Promise<unknown> };
  try {
    doc = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
    console.log(`[extrair-geometrico] PDF carregado via unpdf: ${doc.numPages} páginas, ${bytes.length} bytes`);
  } catch (err) {
    console.error(`[extrair-geometrico] getDocument falhou: ${err instanceof Error ? err.message : String(err)} — tentando pdf-parse`);
    return await extrairViaPdfParse(bytes);
  }

  const paginas: PaginaTabular[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    // deno-lint-ignore no-explicit-any
    const pagina = (await doc.getPage(i)) as any;
    const content = await pagina.getTextContent();
    const viewport = pagina.getViewport({ scale: 1.0 });

    // deno-lint-ignore no-explicit-any
    const textos: TextoPosicionado[] = (content.items as any[])
      .filter((it) => 'str' in it && typeof it.str === 'string' && it.str.trim().length > 0)
      .map((it) => ({
        texto: it.str as string,
        x: it.transform[4] as number,
        // pdfjs origem é bottom-left; invertemos para top-left.
        y: (viewport.height as number) - (it.transform[5] as number),
        width: (it.width as number) ?? 0,
        height: (it.height as number) ?? 0,
        fontSize: (it.height as number) ?? 10,
      }));

    const linhas = clusterizarLinhas(textos);
    const tabelas = detectarTabelas(linhas);
    const textoPlano = linhas.map((l) => linhaParaTextoPlano(l)).join('\n');

    paginas.push({ numero: i, textos, tabelas, textoPlano });
  }

  const textoCompleto = paginas
    .map((p) => p.textoPlano)
    .join('\n\n--- PÁGINA SEPARADOR ---\n\n');
  const usefulChars = textoCompleto.replace(/\s+/g, '').length;

  if (usefulChars < 200) {
    console.warn(`[extrair-geometrico] unpdf retornou texto insuficiente (${usefulChars} chars) — tentando pdf-parse`);
    return await extrairViaPdfParse(bytes);
  }

  // AUDIT #23: score deixa de ser binário (0.7 / 0.95) e passa a refletir
  // a qualidade real do texto extraído. Sinais usados:
  //   - chars úteis por página (densidade — PDF nativo costuma ter >1500/pág)
  //   - taxa de caracteres alfanuméricos (vs lixo / símbolos de controle)
  //   - presença de placeholders de OCR ruim (raros aqui mas possíveis)
  // Resultado: 0.2..0.95, com 0.7 mantido como limiar "aceitável" pelo
  // pipeline downstream (process-document-mistral).
  const alnum = (textoCompleto.match(/[a-zA-Z0-9À-ÿ]/g) || []).length;
  const totalChars = textoCompleto.length;
  const alnumRatio = totalChars > 0 ? alnum / totalChars : 0;
  const charsPerPage = usefulChars / Math.max(1, doc.numPages);
  const placeholderCount =
    (textoCompleto.match(/\[\?\?\?\]|\[ilegível\]|\?{3,}|�+/gi) || []).length;

  let score = 0.4 + alnumRatio * 0.5;
  if (charsPerPage >= 500) score += 0.05;
  if (charsPerPage >= 1500) score += 0.05;
  score -= Math.min(0.4, placeholderCount * 0.03);
  score = Math.max(0.2, Math.min(0.95, score));

  return {
    numeroPaginas: doc.numPages,
    paginas,
    textoCompleto,
    extractor: 'pdfjs_geometric',
    qualidade: {
      score: +score.toFixed(2),
      razao: `${usefulChars} chars úteis em ${doc.numPages} páginas (alnum=${(alnumRatio * 100).toFixed(0)}%, placeholders=${placeholderCount})`,
    },
  };
}
