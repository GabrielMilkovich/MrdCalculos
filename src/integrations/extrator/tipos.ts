/**
 * Espelho client-side dos tipos do extrator (Deno edge function).
 *
 * Manter sincronizado manualmente com
 * `supabase/functions/_shared/documento-tabular.ts`. Pequeno preço por
 * evitar circular dep entre client e edge — Deno e Vite resolvem imports
 * diferente.
 *
 * Próximo passo (v7+): mover esses tipos pra um pacote npm/jsr publicado
 * que ambos importem.
 */

export interface DocumentoTabular {
  numeroPaginas: number;
  paginas: PaginaTabular[];
  textoCompleto: string;
  extractor: string;
  qualidade: { score: number; razao: string };
}

export interface PaginaTabular {
  numero: number;
  textos: TextoPosicionado[];
  tabelas: TabelaDetectada[];
  textoPlano: string;
}

export interface TextoPosicionado {
  texto: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export interface TabelaDetectada {
  bbox: { x0: number; y0: number; x1: number; y1: number };
  headers: string[];
  linhas: CelulaTabular[][];
}

export interface CelulaTabular {
  texto: string;
  coluna: number;
  fragmentos: TextoPosicionado[];
}
