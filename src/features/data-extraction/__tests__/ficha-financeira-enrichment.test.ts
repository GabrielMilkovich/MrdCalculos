import { describe, expect, it } from 'vitest';
import {
  enriquecerRubricas,
  type RubricaCatalogo,
} from '../enrichment/enrich-ficha-financeira';

const CATALOGO_VIA_VAREJO: RubricaCatalogo[] = [
  {
    codigo: '0620',
    empregador: 'VIA_VAREJO',
    denominacao_canonica: 'Comissões',
    categoria_pje: 'comissao',
    classe_documento: 'PGTO',
    incide_fgts: true,
    incide_inss: true,
    incide_ir: true,
    natureza_indenizatoria: false,
    confianca: 'alta',
    origem: 'manual',
  },
  {
    codigo: '0501',
    empregador: 'VIA_VAREJO',
    denominacao_canonica: 'DSR (Comissão)',
    categoria_pje: 'dsr_comissao',
    classe_documento: 'PGTO',
    incide_fgts: true,
    incide_inss: true,
    incide_ir: true,
    natureza_indenizatoria: false,
    confianca: 'alta',
    origem: 'manual',
  },
  {
    codigo: '0040',
    empregador: 'VIA_VAREJO',
    denominacao_canonica: 'Participação Lucros',
    categoria_pje: 'plr',
    classe_documento: 'PGTO',
    incide_fgts: false,
    incide_inss: false,
    incide_ir: true,
    natureza_indenizatoria: true,
    confianca: 'alta',
    origem: 'manual',
  },
];

describe('enriquecerRubricas', () => {
  it('enriquece rubrica com match no catálogo', () => {
    const rubricas = [
      {
        codigo: '0620',
        denominacao: 'Comissões',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: [{ competencia: '2016-01', valor: 1000 }],
      },
    ];

    const result = enriquecerRubricas(rubricas, CATALOGO_VIA_VAREJO);

    expect(result.resumo.enriquecidas_catalogo).toBe(1);
    expect(result.rubricas[0].categoria_catalogo).toBe('comissao');
    expect(result.rubricas[0].origem_enriquecimento).toBe('catalogo');
    expect(result.rubricas[0].incide_fgts).toBe(true);
  });

  it('PLR tem incidências corretas do catálogo', () => {
    const rubricas = [
      {
        codigo: '0040',
        denominacao: 'Part. Lucros',
        classificacao: 'PGTO',
        categoria: 'outros',
        valores_mensais: [{ competencia: '2016-06', valor: 1600 }],
      },
    ];

    const result = enriquecerRubricas(rubricas, CATALOGO_VIA_VAREJO);

    expect(result.rubricas[0].incide_fgts).toBe(false);
    expect(result.rubricas[0].incide_inss).toBe(false);
    expect(result.rubricas[0].incide_ir).toBe(true);
    expect(result.rubricas[0].natureza_indenizatoria).toBe(true);
    expect(result.rubricas[0].categoria).toBe('plr');
  });

  it('rubrica sem match no catálogo mas com categoria do parser → parser', () => {
    const rubricas = [
      {
        codigo: '9999',
        denominacao: 'Verba Desconhecida',
        classificacao: 'PGTO',
        categoria: 'premio',
        valores_mensais: [{ competencia: '2016-01', valor: 500 }],
      },
    ];

    const result = enriquecerRubricas(rubricas, CATALOGO_VIA_VAREJO);

    expect(result.resumo.enriquecidas_parser).toBe(1);
    expect(result.rubricas[0].origem_enriquecimento).toBe('parser');
    expect(result.rubricas[0].categoria).toBe('premio');
    expect(result.rubricas[0].categoria_catalogo).toBeNull();
  });

  it('rubrica sem match e sem categoria → nao_encontrado', () => {
    const rubricas = [
      {
        codigo: '8888',
        denominacao: 'Verba Misteriosa',
        classificacao: 'PGTO',
        categoria: 'outros',
        valores_mensais: [{ competencia: '2016-01', valor: 100 }],
      },
    ];

    const result = enriquecerRubricas(rubricas, CATALOGO_VIA_VAREJO);

    expect(result.resumo.nao_encontradas).toBe(1);
    expect(result.resumo.codigos_nao_encontrados).toContain('8888');
    expect(result.rubricas[0].origem_enriquecimento).toBe('nao_encontrado');
    expect(result.rubricas[0].categoria).toBe('outros');
  });

  it('mix de rubricas com e sem match produz resumo correto', () => {
    const rubricas = [
      {
        codigo: '0620',
        denominacao: 'Comissões',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: [{ competencia: '2016-01', valor: 1000 }],
      },
      {
        codigo: '0501',
        denominacao: 'DSR',
        classificacao: 'PGTO',
        categoria: 'dsr',
        valores_mensais: [{ competencia: '2016-01', valor: 300 }],
      },
      {
        codigo: '4131',
        denominacao: 'Prêmio Metal',
        classificacao: 'PGTO',
        categoria: 'premio',
        valores_mensais: [{ competencia: '2016-01', valor: 200 }],
      },
      {
        codigo: '7777',
        denominacao: 'Algo Novo',
        classificacao: 'PGTO',
        categoria: 'outros',
        valores_mensais: [{ competencia: '2016-01', valor: 50 }],
      },
    ];

    const result = enriquecerRubricas(rubricas, CATALOGO_VIA_VAREJO);

    expect(result.resumo.total_rubricas).toBe(4);
    expect(result.resumo.enriquecidas_catalogo).toBe(2);
    expect(result.resumo.enriquecidas_parser).toBe(1);
    expect(result.resumo.nao_encontradas).toBe(1);
  });

  it('catálogo vazio → tudo via parser ou nao_encontrado', () => {
    const rubricas = [
      {
        codigo: '0620',
        denominacao: 'Comissões',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: [{ competencia: '2016-01', valor: 1000 }],
      },
    ];

    const result = enriquecerRubricas(rubricas, []);

    expect(result.resumo.enriquecidas_catalogo).toBe(0);
    expect(result.resumo.enriquecidas_parser).toBe(1);
    expect(result.rubricas[0].origem_enriquecimento).toBe('parser');
  });

  it('preserva valores_mensais durante enriquecimento', () => {
    const valores = [
      { competencia: '2016-01', valor: 1000 },
      { competencia: '2016-02', valor: 2000 },
      { competencia: '2016-03', valor: 1500 },
    ];
    const rubricas = [
      {
        codigo: '0620',
        denominacao: 'Comissões',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: valores,
      },
    ];

    const result = enriquecerRubricas(rubricas, CATALOGO_VIA_VAREJO);

    expect(result.rubricas[0].valores_mensais).toEqual(valores);
    expect(result.rubricas[0].valores_mensais).toHaveLength(3);
  });
});
