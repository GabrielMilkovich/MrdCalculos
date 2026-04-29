import { describe, expect, it } from 'vitest';
import {
  type CandidatoCampo,
  ordenarPorAuthority,
  resolveCampo,
  temConflito,
  valoresMonetariosIguais,
} from '../document-authority';
import Decimal from 'decimal.js';

function candidato(over: Partial<CandidatoCampo> = {}): CandidatoCampo {
  return {
    doc_tipo: 'HOLERITE',
    document_id: 'doc-' + Math.random().toString(36).slice(2, 8),
    valor: '2020-01-01',
    confianca: 0.9,
    extraido_em: new Date('2026-04-29'),
    ...over,
  };
}

describe('resolveCampo — hierarquia de autoridade', () => {
  it('CTPS ganha holerite para data_admissao', () => {
    const r = resolveCampo('data_admissao', [
      candidato({ doc_tipo: 'CTPS', valor: '2018-03-15', confianca: 0.95 }),
      candidato({ doc_tipo: 'HOLERITE', valor: '2018-04-01', confianca: 0.90 }),
    ]);
    expect(r?.vencedor.doc_tipo).toBe('CTPS');
    expect(r?.vencedor.valor).toBe('2018-03-15');
    expect(r?.motivo).toBe('authority');
  });

  it('TRCT ganha CTPS para data_demissao', () => {
    const r = resolveCampo('data_demissao', [
      candidato({ doc_tipo: 'CTPS', valor: '2024-01-15', confianca: 0.85 }),
      candidato({ doc_tipo: 'TRCT', valor: '2024-01-20', confianca: 0.90 }),
    ]);
    expect(r?.vencedor.doc_tipo).toBe('TRCT');
    expect(r?.vencedor.valor).toBe('2024-01-20');
  });

  it('petição inicial nao deve sobrepor CTPS para data_admissao', () => {
    const r = resolveCampo('data_admissao', [
      candidato({ doc_tipo: 'CTPS', valor: '2018-03-15', confianca: 0.85 }),
      candidato({ doc_tipo: 'PETICAO_INICIAL', valor: '2018-04-01', confianca: 1.0 }),
    ]);
    // Mesmo com confianca 1.0 da peticao, CTPS (100) × 0.85 = 85 > 30 × 1.0 = 30
    expect(r?.vencedor.doc_tipo).toBe('CTPS');
  });

  it('numero_processo só aceita peticao/sentenca/acordao', () => {
    const r = resolveCampo('numero_processo', [
      candidato({ doc_tipo: 'HOLERITE', valor: '1234567-89.2020.5.02.0001', confianca: 0.99 }),
    ]);
    // Holerite tem authority 0 para numero_processo → null
    expect(r).toBeNull();
  });

  it('candidato unico vence sem conflito', () => {
    const r = resolveCampo('reclamante_nome', [
      candidato({ doc_tipo: 'CTPS', valor: 'João Silva', confianca: 0.95 }),
    ]);
    expect(r?.vencedor.valor).toBe('João Silva');
    expect(r?.motivo).toBe('unico');
  });

  it('empate de authority decide por confianca', () => {
    const r = resolveCampo('reclamada_cnpj', [
      candidato({ doc_tipo: 'TRCT', valor: '00.000.001/0001-91', confianca: 0.80 }),
      candidato({ doc_tipo: 'HOLERITE', valor: '00.000.001/0001-91', confianca: 0.95 }),
    ]);
    // Ambos authority 100 — confianca decide
    expect(r?.vencedor.confianca).toBe(0.95);
    expect(r?.motivo).toBe('confidence');
  });

  it('lista vazia retorna null', () => {
    expect(resolveCampo('data_admissao', [])).toBeNull();
  });
});

describe('temConflito', () => {
  it('detecta conflito de strings', () => {
    const result = temConflito('reclamante_nome', [
      candidato({ doc_tipo: 'CTPS', valor: 'João Silva' }),
      candidato({ doc_tipo: 'HOLERITE', valor: 'Joao Silva' }),
    ]);
    expect(result).toBe(true);
  });

  it('NAO detecta conflito quando strings sao iguais case-insensitive', () => {
    const result = temConflito('reclamante_nome', [
      candidato({ doc_tipo: 'CTPS', valor: 'JOÃO SILVA' }),
      candidato({ doc_tipo: 'HOLERITE', valor: 'João Silva' }),
    ]);
    expect(result).toBe(false);
  });

  it('detecta conflito de datas mesmo com formatos diferentes', () => {
    const result = temConflito(
      'data_admissao',
      [
        candidato({ doc_tipo: 'CTPS', valor: '2018-03-15' }),
        candidato({ doc_tipo: 'CONTRATO_TRABALHO', valor: '15/03/2017' }),
      ],
      { tipo: 'data' },
    );
    // Anos diferentes — conflito real
    expect(result).toBe(true);
  });

  it('NAO detecta conflito quando datas sao iguais com formatos diferentes', () => {
    const result = temConflito(
      'data_admissao',
      [
        candidato({ doc_tipo: 'CTPS', valor: '2018-03-15' }),
        candidato({ doc_tipo: 'CONTRATO_TRABALHO', valor: '15/03/2018' }),
      ],
      { tipo: 'data' },
    );
    expect(result).toBe(false);
  });
});

describe('ordenarPorAuthority', () => {
  it('ordena por score decrescente', () => {
    const candidatos = [
      candidato({ doc_tipo: 'PETICAO_INICIAL', valor: 'X', confianca: 0.9 }),
      candidato({ doc_tipo: 'CTPS', valor: 'X', confianca: 0.9 }),
      candidato({ doc_tipo: 'HOLERITE', valor: 'X', confianca: 0.9 }),
    ];
    const ordenados = ordenarPorAuthority('data_admissao', candidatos);
    expect(ordenados[0].doc_tipo).toBe('CTPS');
    expect(ordenados[1].doc_tipo).toBe('HOLERITE');
    expect(ordenados[2].doc_tipo).toBe('PETICAO_INICIAL');
  });
});

describe('valoresMonetariosIguais', () => {
  it('considera iguais com tolerancia de 1%', () => {
    expect(valoresMonetariosIguais(1000, 1005)).toBe(true);
    // 1020 - 1000 = 20; 20/1020 = 0.0196 (~2%) > 1%, entao diferente.
    expect(valoresMonetariosIguais(1000, 1020)).toBe(false);
  });

  it('aceita Decimal e number', () => {
    expect(valoresMonetariosIguais(new Decimal('1500.50'), 1500.50)).toBe(true);
  });

  it('zero vs zero é igual', () => {
    expect(valoresMonetariosIguais(0, 0)).toBe(true);
  });

  it('zero vs nao-zero é diferente', () => {
    expect(valoresMonetariosIguais(0, 100)).toBe(false);
  });
});
