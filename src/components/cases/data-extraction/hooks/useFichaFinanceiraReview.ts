import { useState, useMemo, useCallback } from 'react';
import Decimal from 'decimal.js';
import type { RubricaEnriquecida } from '@/features/data-extraction/enrichment/enrich-ficha-financeira';
import {
  type FichaFinanceiraParsed,
  type FichaCategoriaSlug,
  CATEGORIA_PJE_TO_SLUG,
} from '../ficha-financeira-types';

Decimal.set({ precision: 20 });

export interface RubricaEditavel extends RubricaEnriquecida {
  categoria_atual: FichaCategoriaSlug;
  incluida: boolean;
  modificada_pelo_operador: boolean;
  justificativa?: string;
  total_ano: Decimal;
}

function derivarCategoriaInicial(r: RubricaEnriquecida): FichaCategoriaSlug {
  const mapped = r.categoria_catalogo
    ? CATEGORIA_PJE_TO_SLUG[r.categoria_catalogo]
    : r.categoria
      ? CATEGORIA_PJE_TO_SLUG[r.categoria]
      : null;
  if (mapped) return mapped;
  if (r.classificacao?.toUpperCase() !== 'PGTO') return 'ignorar';
  return 'salario_fixo';
}

function buildEditavel(r: RubricaEnriquecida): RubricaEditavel {
  const cat = derivarCategoriaInicial(r);
  const total = r.valores_mensais.reduce(
    (acc, v) => acc.plus(new Decimal(v.valor)),
    new Decimal(0),
  );
  return {
    ...r,
    categoria_atual: cat,
    incluida: cat !== 'ignorar',
    modificada_pelo_operador: false,
    total_ano: total,
  };
}

function isNaoClassificada(r: RubricaEditavel): boolean {
  return (
    r.origem_enriquecimento === 'nao_encontrado' &&
    !r.modificada_pelo_operador &&
    r.classificacao?.toUpperCase() === 'PGTO'
  );
}

export function useFichaFinanceiraReview(parsed: FichaFinanceiraParsed) {
  const [rubricas, setRubricas] = useState<RubricaEditavel[]>(() =>
    parsed.rubricas.map(buildEditavel),
  );

  const setCategoria = useCallback(
    (codigo: string, novaCategoria: FichaCategoriaSlug, justificativa?: string) => {
      setRubricas((prev) =>
        prev.map((r) =>
          r.codigo === codigo
            ? {
                ...r,
                categoria_atual: novaCategoria,
                incluida: novaCategoria !== 'ignorar',
                modificada_pelo_operador: true,
                justificativa,
              }
            : r,
        ),
      );
    },
    [],
  );

  const toggleIncluida = useCallback((codigo: string) => {
    setRubricas((prev) =>
      prev.map((r) =>
        r.codigo === codigo ? { ...r, incluida: !r.incluida, modificada_pelo_operador: true } : r,
      ),
    );
  }, []);

  const totaisPorCategoria = useMemo(() => {
    const map = new Map<FichaCategoriaSlug, Decimal>();
    for (const r of rubricas) {
      if (!r.incluida) continue;
      const curr = map.get(r.categoria_atual) ?? new Decimal(0);
      map.set(r.categoria_atual, curr.plus(r.total_ano));
    }
    return map;
  }, [rubricas]);

  const totaisPorMes = useMemo(() => {
    const map = new Map<string, Decimal>();
    for (const r of rubricas) {
      if (!r.incluida) continue;
      for (const v of r.valores_mensais) {
        const curr = map.get(v.competencia) ?? new Decimal(0);
        map.set(v.competencia, curr.plus(new Decimal(v.valor)));
      }
    }
    return map;
  }, [rubricas]);

  const rubricasNaoClassificadas = useMemo(
    () => rubricas.filter(isNaoClassificada).length,
    [rubricas],
  );

  const conflitos = useMemo(
    () =>
      rubricas.filter(
        (r) =>
          r.modificada_pelo_operador &&
          r.origem_enriquecimento === 'catalogo' &&
          r.categoria_atual !== derivarCategoriaInicial(r),
      ).length,
    [rubricas],
  );

  const podeConfirmar = rubricasNaoClassificadas === 0;

  const mesesOrdenados = useMemo(() => {
    const meses = new Set<string>();
    for (const r of rubricas) {
      for (const v of r.valores_mensais) {
        meses.add(v.competencia);
      }
    }
    return [...meses].sort();
  }, [rubricas]);

  return {
    rubricas,
    setCategoria,
    toggleIncluida,
    totaisPorCategoria,
    totaisPorMes,
    rubricasNaoClassificadas,
    conflitos,
    podeConfirmar,
    mesesOrdenados,
  };
}
