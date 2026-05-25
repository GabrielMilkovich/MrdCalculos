/**
 * DocumentoTabular — representação agnóstica de um documento extraído.
 *
 * Saída do extrator geométrico (`extrator-geometrico.ts`), entrada dos
 * mappers (`mappers/*.ts`). Não conhece domínio — só sabe que existe um
 * documento com metadados e tabelas posicionadas.
 *
 * Construído A PARTIR DE TEXTO NATIVO + COORDENADAS extraídas do PDF
 * (pdfjs-dist em Deno). NÃO depende de OCR Claude — é justamente o que
 * a v6 introduz: parar de descartar a informação espacial que o PDF do
 * PJe já tem embutida.
 */

export interface DocumentoTabular {
  /** Quantidade de páginas do PDF original. */
  numeroPaginas: number;
  /** Páginas individuais. */
  paginas: PaginaTabular[];
  /** Texto livre concatenado (mappers que preferem regex sobre texto plano). */
  textoCompleto: string;
  /** Provider que extraiu: 'pdfjs_geometric' | 'pdftotext' | 'claude-vision'. */
  extractor: string;
  /** Metadados de qualidade. */
  qualidade: {
    /** 0..1 — quanto mais alto, mais confiável a extração. */
    score: number;
    /** Razão humana (chars úteis, páginas processadas, etc.). */
    razao: string;
  };
}

export interface PaginaTabular {
  numero: number;
  /** Strings extraídas, em ordem de leitura (top→down, left→right). */
  textos: TextoPosicionado[];
  /** Tabelas detectadas heuristicamente (clusterização x,y). */
  tabelas: TabelaDetectada[];
  /** Texto plano da página com quebras de linha aproximadas. */
  textoPlano: string;
}

export interface TextoPosicionado {
  texto: string;
  /** Coordenadas em pontos PDF (1 ponto = 1/72 polegada). Origem top-left. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Tamanho da fonte (heurístico — pode vir do height ou do transform). */
  fontSize: number;
}

export interface TabelaDetectada {
  /** Bounding box da tabela. */
  bbox: { x0: number; y0: number; x1: number; y1: number };
  /** Cabeçalhos detectados (linha superior). */
  headers: string[];
  /** Linhas de dados. Cada linha é array de células na ordem dos headers. */
  linhas: CelulaTabular[][];
}

export interface CelulaTabular {
  /** Texto consolidado (múltiplas strings juntadas em ordem de leitura). */
  texto: string;
  /** Coluna a que pertence (índice no array de headers). */
  coluna: number;
  /** Strings originais que compõem a célula. */
  fragmentos: TextoPosicionado[];
}
