/**
 * Mesclagem de resultados de múltiplos mappers de cartão de ponto.
 *
 * Sprint 3 (2026-05-22). Suporte a PDFs híbridos (ex.: Izabela tem
 * período pré-16/06/2021 no layout antigo + período pós-16/06/2021 no
 * layout novo Espelho Minha). Cada mapper extrai sua parte; este módulo
 * combina por data prevalecendo quem tem mais batidas reais.
 *
 * REGRA DE PRECEDÊNCIA
 * --------------------
 * Para cada data presente em qualquer um dos resultados:
 *   - Se aparece em apenas um → mantém aquele.
 *   - Se aparece em vários → prevalece o que tem MAIS marcacoes (batidas
 *     reais). Empate de contagem → mantém a primeira (a vinda do mapper
 *     de maior score, que aparece antes na lista de entrada).
 *
 * O caso real Izabela 17/05/2021: antigo tem 4 batidas, novo tem `--`
 * (zero batidas). Resultado final tem as 4 batidas do antigo. ✓
 *
 * COMPETÊNCIA PREDOMINANTE
 * ------------------------
 * RECALCULADA a partir das apurações mescladas (não somando direto das
 * competencias originais). Sem isso, datas em ambos os resultados
 * contariam DUAS vezes na competência.
 *
 * WARNINGS
 * --------
 * Combinados sem dedup — operador vê de qual mapper veio cada warning,
 * facilitando diagnóstico. Prefixados com slug do mapper origem.
 *
 * UNPARSED_LINES
 * --------------
 * Concatenados (ambos os mappers de cartão de ponto inicializam vazios
 * hoje; tratamento conservador caso preencham no futuro).
 *
 * PARSER_VERSION
 * --------------
 * Quando há merge real (>=2 resultados não-vazios), formato:
 *   "merged:vN.X+vN.Y" — versões dos mappers que contribuíram.
 * Quando há só 1 resultado, preserva o parser_version original (sem
 * envoltório "merged:") pra não confundir downstream que inspeciona
 * a string crua.
 */

import type {
  ApuracaoDominio,
  ParseCartaoPontoResultDominio,
} from '../tipos-dominio.ts';

export interface ResultadoComOrigem {
  /** Slug do mapper que produziu este resultado (p/ prefixar warnings). */
  slug: string;
  resultado: ParseCartaoPontoResultDominio;
}

export function mesclarResultadosCartaoPonto(
  entradas: ResultadoComOrigem[],
): ParseCartaoPontoResultDominio | null {
  if (entradas.length === 0) return null;
  if (entradas.length === 1) {
    // Caminho single: NÃO envelopa o parser_version com "merged:" pra
    // preservar a string original (downstream pode comparar com igual).
    return entradas[0].resultado;
  }

  // Dedup por data — prevalece quem tem mais batidas reais.
  const porData = new Map<string, ApuracaoDominio>();
  for (const entrada of entradas) {
    for (const ap of entrada.resultado.apuracoes) {
      const existente = porData.get(ap.data);
      if (!existente) {
        porData.set(ap.data, ap);
      } else if (ap.marcacoes.length > existente.marcacoes.length) {
        porData.set(ap.data, ap);
      }
    }
  }

  const apuracoes = [...porData.values()].sort((a, b) =>
    a.data.localeCompare(b.data),
  );

  // Recalcula competências a partir das apurações JÁ deduplicadas.
  // Evita dupla-contagem em datas que apareceram em múltiplos mappers.
  const competencias = new Map<string, number>();
  for (const ap of apuracoes) {
    const k = `${ap.data.substring(5, 7)}/${ap.data.substring(0, 4)}`;
    competencias.set(k, (competencias.get(k) ?? 0) + 1);
  }

  let predominante = '';
  let max = 0;
  for (const [k, v] of competencias) {
    if (v > max) {
      predominante = k;
      max = v;
    }
  }

  // Warnings combinados, prefixados pelo slug origem (sem dedup).
  const warnings: string[] = [];
  for (const entrada of entradas) {
    for (const w of entrada.resultado.warnings) {
      warnings.push(`[${entrada.slug}] ${w}`);
    }
  }

  // Unparsed lines concatenados (preserva linha+conteúdo de ambos).
  const unparsed_lines = entradas.flatMap((e) => e.resultado.unparsed_lines);

  return {
    apuracoes,
    competencias,
    competencia_predominante: predominante,
    data_inicial: apuracoes[0]?.data ?? '',
    data_final: apuracoes[apuracoes.length - 1]?.data ?? '',
    warnings,
    unparsed_lines,
    parser_version: `merged:${entradas
      .map((e) => e.resultado.parser_version)
      .join('+')}`,
  };
}
