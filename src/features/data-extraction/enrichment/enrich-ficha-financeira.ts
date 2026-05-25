export interface RubricaCatalogo {
  codigo: string;
  empregador: string;
  denominacao_canonica: string;
  categoria_pje: string;
  classe_documento: string;
  incide_fgts: boolean;
  incide_inss: boolean;
  incide_ir: boolean;
  natureza_indenizatoria: boolean;
  confianca: string;
  origem: string;
}

export interface RubricaEnriquecida {
  codigo: string;
  denominacao: string;
  classificacao: string;
  categoria: string;
  categoria_catalogo: string | null;
  classe_catalogo: string | null;
  incide_fgts: boolean;
  incide_inss: boolean;
  incide_ir: boolean;
  natureza_indenizatoria: boolean;
  origem_enriquecimento: 'catalogo' | 'parser' | 'nao_encontrado';
  valores_mensais: Array<{ competencia: string; valor: number }>;
}

export interface EnriquecimentoResumo {
  total_rubricas: number;
  enriquecidas_catalogo: number;
  enriquecidas_parser: number;
  nao_encontradas: number;
  codigos_nao_encontrados: string[];
}

export interface EnriquecimentoResult {
  rubricas: RubricaEnriquecida[];
  resumo: EnriquecimentoResumo;
}

interface RubricaInput {
  codigo: string;
  denominacao: string;
  classificacao: string;
  categoria: string;
  valores_mensais: Array<{ competencia: string; valor: number }>;
}

export function enriquecerRubricas(
  rubricas: RubricaInput[],
  catalogo: RubricaCatalogo[],
): EnriquecimentoResult {
  const catalogoMap = new Map<string, RubricaCatalogo>();
  for (const entry of catalogo) {
    catalogoMap.set(entry.codigo, entry);
  }

  const codigos_nao_encontrados: string[] = [];
  const enriched: RubricaEnriquecida[] = [];

  for (const r of rubricas) {
    const match = catalogoMap.get(r.codigo);

    if (match) {
      enriched.push({
        codigo: r.codigo,
        denominacao: r.denominacao,
        classificacao: r.classificacao,
        categoria: match.categoria_pje,
        categoria_catalogo: match.categoria_pje,
        classe_catalogo: match.classe_documento,
        incide_fgts: match.incide_fgts,
        incide_inss: match.incide_inss,
        incide_ir: match.incide_ir,
        natureza_indenizatoria: match.natureza_indenizatoria,
        origem_enriquecimento: 'catalogo',
        valores_mensais: r.valores_mensais,
      });
    } else if (r.categoria && r.categoria !== 'outros') {
      enriched.push({
        codigo: r.codigo,
        denominacao: r.denominacao,
        classificacao: r.classificacao,
        categoria: r.categoria,
        categoria_catalogo: null,
        classe_catalogo: null,
        incide_fgts: true,
        incide_inss: true,
        incide_ir: true,
        natureza_indenizatoria: false,
        origem_enriquecimento: 'parser',
        valores_mensais: r.valores_mensais,
      });
    } else {
      codigos_nao_encontrados.push(r.codigo);
      enriched.push({
        codigo: r.codigo,
        denominacao: r.denominacao,
        classificacao: r.classificacao,
        categoria: r.categoria || 'nao_classificado',
        categoria_catalogo: null,
        classe_catalogo: null,
        incide_fgts: true,
        incide_inss: true,
        incide_ir: true,
        natureza_indenizatoria: false,
        origem_enriquecimento: 'nao_encontrado',
        valores_mensais: r.valores_mensais,
      });
    }
  }

  return {
    rubricas: enriched,
    resumo: {
      total_rubricas: rubricas.length,
      enriquecidas_catalogo: enriched.filter((r) => r.origem_enriquecimento === 'catalogo').length,
      enriquecidas_parser: enriched.filter((r) => r.origem_enriquecimento === 'parser').length,
      nao_encontradas: enriched.filter((r) => r.origem_enriquecimento === 'nao_encontrado').length,
      codigos_nao_encontrados,
    },
  };
}
