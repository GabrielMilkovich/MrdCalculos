/**
 * Testes do enriquecedor — soma de centavos + override manual.
 *
 * Cobre o "espírito" do requisito CLAUDE.md sobre Decimal.js:
 * não usamos Decimal aqui, mas validamos que a aritmética em
 * integer-cents (Math.round * 100) é exata mesmo com floats
 * problemáticos clássicos (0.1, 0.2, etc).
 */

import { describe, expect, it } from 'vitest';
import type { RubricaDominio } from '../../tipos-dominio.ts';
import { enriquecerComClassificacao } from '../enriquecer.ts';

function rubrica(nome: string, vencimento: number | null): RubricaDominio {
  return {
    codigo: null,
    nome,
    valor_vencimento: vencimento,
    valor_desconto: null,
    quantidade: null,
    ordem: 0,
  };
}

describe('enriquecerComClassificacao - soma básica por categoria', () => {
  it('classifica e soma um holerite simples', () => {
    const { rubricas_classificadas, resumo_classificacao } = enriquecerComClassificacao([
      rubrica('Mínimo Garantido', 1500),
      rubrica('Comissões', 1158.82),
      rubrica('Com. Frete', 42.5),
      rubrica('Prêmio Mensal', 200),
      rubrica('DSR (Comissão)', 272.64),
      rubrica('Adicional Noturno', 88.31),
      rubrica('Verba Inventada XPTO', 999),
    ]);

    expect(rubricas_classificadas).toHaveLength(7);
    expect(resumo_classificacao.total_rubricas).toBe(7);
    expect(resumo_classificacao.classificadas).toBe(6);
    expect(resumo_classificacao.nao_classificadas).toBe(1);
    expect(resumo_classificacao.rubricas_nao_classificadas).toEqual(['Verba Inventada XPTO']);

    expect(resumo_classificacao.minimo_garantido_centavos).toBe(150000);
    expect(resumo_classificacao.base_dsr_comissoes_produtos_centavos).toBe(115882);
    expect(resumo_classificacao.base_dsr_comissoes_servicos_centavos).toBe(4250);
    expect(resumo_classificacao.base_dsr_premios_centavos).toBe(20000);
    expect(resumo_classificacao.dsr_ja_pago_centavos).toBe(27264);
    expect(resumo_classificacao.desconsiderado_centavos).toBe(8831);
    expect(resumo_classificacao.nao_classificadas_centavos).toBe(99900);
  });

  it('valor_vencimento null não contribui pra soma', () => {
    const { resumo_classificacao } = enriquecerComClassificacao([
      rubrica('Comissões', null),
      rubrica('Comissões', 100),
    ]);
    expect(resumo_classificacao.base_dsr_comissoes_produtos_centavos).toBe(10000);
  });

  it('soma de floats clássicos problemáticos é exata em integer cents', () => {
    // 0.1 + 0.2 + 0.3 = 0.6 com floats vira 0.6000000000000001.
    // Em integer cents: 10 + 20 + 30 = 60.
    const { resumo_classificacao } = enriquecerComClassificacao([
      rubrica('Comissões', 0.1),
      rubrica('Comissões', 0.2),
      rubrica('Comissões', 0.3),
    ]);
    expect(resumo_classificacao.base_dsr_comissoes_produtos_centavos).toBe(60);
  });

  it('contador por método registra exato/sinônimo/fuzzy/nao_encontrado', () => {
    const { resumo_classificacao } = enriquecerComClassificacao([
      rubrica('Comissões', 100),         // exato (match canônico)
      rubrica('ATS', 50),                // sinônimo
      rubrica('Adicional Noturnoo', 30), // fuzzy (1 char extra)
      rubrica('Verba XPTO', 999),        // nao_encontrado
    ]);
    expect(resumo_classificacao.por_metodo.exato).toBe(1);
    expect(resumo_classificacao.por_metodo.sinonimo).toBe(1);
    expect(resumo_classificacao.por_metodo.fuzzy).toBe(1);
    expect(resumo_classificacao.por_metodo.nao_encontrado).toBe(1);
    expect(resumo_classificacao.por_metodo.normalizado).toBe(0);
  });
});

describe('enriquecerComClassificacao - flag divergencia_juridica', () => {
  it('marca Adicional Noturno como divergencia_juridica=true', () => {
    const { rubricas_classificadas } = enriquecerComClassificacao([
      rubrica('Adicional Noturno', 50),
      rubrica('Comissões', 100),
    ]);
    expect(rubricas_classificadas[0].divergencia_juridica).toBe(true);
    expect(rubricas_classificadas[1].divergencia_juridica).toBe(false);
  });
});

describe('enriquecerComClassificacao - override manual', () => {
  it('classificação manual sobrescreve a ontologia', () => {
    const { rubricas_classificadas, resumo_classificacao } = enriquecerComClassificacao(
      [
        rubrica('Bônus Mistério', 500), // sem match, normalmente NAO_CLASSIFICADO
      ],
      { 'Bônus Mistério': 'PREMIO' },
    );
    expect(rubricas_classificadas[0].categoria).toBe('PREMIO');
    expect(rubricas_classificadas[0].metodo_match).toBe('exato');
    expect(resumo_classificacao.base_dsr_premios_centavos).toBe(50000);
    expect(resumo_classificacao.nao_classificadas).toBe(0);
  });

  it('override que não corresponde a categoria válida é ignorado', () => {
    const { rubricas_classificadas } = enriquecerComClassificacao(
      [rubrica('Bônus Mistério', 500)],
      // @ts-expect-error — categoria inválida intencional
      { 'Bônus Mistério': 'CATEGORIA_FAKE' },
    );
    // Cai na ontologia normal — não há match -> NAO_CLASSIFICADO.
    expect(rubricas_classificadas[0].categoria).toBe('NAO_CLASSIFICADO');
  });
});
