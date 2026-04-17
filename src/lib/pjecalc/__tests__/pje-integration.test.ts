/**
 * Testes do helper de integração PJe Judicial.
 *
 * Cobre:
 *  - Geração do pacote básico (XML placeholder + HTML fallback + manifesto)
 *  - Geração do pacote com PDF customizado (Blob fornecido pelo chamador)
 *  - Manifesto contém os 3 arquivos (calculo.pjc, relatorio.pdf, manifesto.json)
 *  - ZIP base64 decodifica em ZIP válido (assinatura PK\x03\x04) e lê arquivos
 *  - Validação rejeita processo CNJ em formato inválido
 *  - Validação rejeita timestamp inválido e ZIP vazio
 */
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  gerarPacotePJe,
  validarPacotePJe,
  PACOTE_PJE_VERSAO,
  type PacotePJeInput,
  type PacotePJeResult,
} from '../pje-integration';
import type { PjeLiquidacaoResult } from '../engine-types';

// =====================================================
// FIXTURES
// =====================================================

/** Mock minimal de PjeLiquidacaoResult contendo apenas os campos
 *  realmente lidos pelo helper (resumo + data_liquidacao). */
function mockResultado(): PjeLiquidacaoResult {
  return {
    data_liquidacao: '2026-04-17',
    verbas: [],
    fgts: {
      depositos: [],
      total_depositos: 0,
      multa_valor: 0,
      lc110_10: 0,
      lc110_05: 0,
      saldo_deduzido: 0,
      total_fgts: 0,
    },
    contribuicao_social: {
      segurado_devidos: [],
      segurado_pagos: [],
      empregador: [],
      total_segurado_devidos: 0,
      total_segurado_pagos: 0,
      total_segurado: 0,
      total_empregador: 0,
    },
    imposto_renda: {
      base_calculo: 0,
      deducoes: 0,
      base_tributavel: 0,
      imposto_devido: 0,
      meses_rra: 0,
      metodo: 'tabela_mensal',
      ir_anos_anteriores: 0,
      ir_ano_liquidacao: 0,
      ir_13_exclusivo: 0,
      ir_ferias_separado: 0,
      meses_anos_anteriores: 0,
      meses_ano_liquidacao: 0,
    },
    seguro_desemprego: { apurado: false, parcelas: 0, valor_parcela: 0, total: 0 },
    previdencia_privada: { apurado: false, base: 0, percentual: 0, valor: 0 },
    salario_familia: { apurado: false, cotas: [], total: 0 },
    resumo: {
      principal_bruto: 10000,
      principal_corrigido: 11000,
      juros_mora: 500,
      fgts_total: 800,
      cs_segurado: 100,
      cs_empregador: 200,
      ir_retido: 50,
      seguro_desemprego: 0,
      previdencia_privada: 0,
      salario_familia: 0,
      multa_523: 0,
      multa_467: 0,
      honorarios_sucumbenciais: 0,
      honorarios_contratuais: 0,
      custas: 0,
      custas_detalhadas: [],
      pensao_sobre_fgts: 0,
      pensao_total: 0,
      contribuicao_sindical: 0,
      abono_pecuniario: 0,
      liquido_reclamante: 12345.67,
      total_reclamada: 13000.5,
    },
  };
}

// Processo CNJ em formato sintático válido (regex passa, MOD97 pode falhar).
const PROCESSO_OK = '0000001-23.2024.5.02.0001';
const PROCESSO_BAD = '123456789';

function baseInput(): PacotePJeInput {
  return {
    resultado: mockResultado(),
    processo: PROCESSO_OK,
    orgao_julgador: '5ª Vara do Trabalho',
    tribunal: 'TRT-5',
  };
}

// =====================================================
// TESTES
// =====================================================

describe('gerarPacotePJe — geração básica', () => {
  it('gera pacote com ZIP base64 não vazio e manifesto preenchido', async () => {
    const pacote = await gerarPacotePJe(baseInput());
    expect(pacote.zip_base64.length).toBeGreaterThan(100);
    expect(pacote.zip_size_bytes).toBeGreaterThan(100);
    expect(pacote.manifesto.processo).toBe(PROCESSO_OK);
    expect(pacote.manifesto.versao).toBe(PACOTE_PJE_VERSAO);
    // timestamp ISO
    expect(Date.parse(pacote.manifesto.timestamp)).not.toBeNaN();
  });
});

describe('gerarPacotePJe — PDF customizado', () => {
  it('usa o Blob PDF fornecido pelo chamador ao invés do HTML fallback', async () => {
    const pdfPayload = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
      0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
    ]);
    const pdfBlob = new Blob([pdfPayload], { type: 'application/pdf' });
    const input: PacotePJeInput = { ...baseInput(), pdf_completo_blob: pdfBlob };
    const pacote = await gerarPacotePJe(input);

    // Arquivo relatorio.pdf no manifesto deve ter exatamente o tamanho do Blob
    const pdfEntry = pacote.manifesto.arquivos.find((a) => a.nome === 'relatorio.pdf');
    expect(pdfEntry).toBeDefined();
    expect(pdfEntry?.tamanho).toBe(pdfPayload.length);
  });
});

describe('gerarPacotePJe — manifesto com 3 arquivos', () => {
  it('contém calculo.pjc, relatorio.pdf e manifesto.json', async () => {
    const pacote = await gerarPacotePJe(baseInput());
    const nomes = pacote.manifesto.arquivos.map((a) => a.nome).sort();
    expect(nomes).toEqual(['calculo.pjc', 'manifesto.json', 'relatorio.pdf']);

    const tipos = pacote.manifesto.arquivos.map((a) => a.tipo).sort();
    expect(tipos).toEqual(['json', 'pdf', 'xml']);
    // tamanhos coerentes
    for (const a of pacote.manifesto.arquivos) {
      expect(a.tamanho).toBeGreaterThan(0);
    }
  });
});

describe('gerarPacotePJe — ZIP base64 decodifica em ZIP válido', () => {
  it('JSZip consegue reabrir o ZIP e ler os três arquivos', async () => {
    const pacote = await gerarPacotePJe({
      ...baseInput(),
      pjc_xml: '<?xml version="1.0"?><Teste>OK</Teste>',
    });

    // Decodifica base64 → Uint8Array
    const bin = Buffer.from(pacote.zip_base64, 'base64');
    // Assinatura ZIP = PK\x03\x04
    expect(bin[0]).toBe(0x50);
    expect(bin[1]).toBe(0x4b);
    expect(bin[2]).toBe(0x03);
    expect(bin[3]).toBe(0x04);

    const reloaded = await JSZip.loadAsync(bin);
    expect(reloaded.file('calculo.pjc')).not.toBeNull();
    expect(reloaded.file('relatorio.pdf')).not.toBeNull();
    expect(reloaded.file('manifesto.json')).not.toBeNull();

    const xmlContent = await reloaded.file('calculo.pjc')!.async('string');
    expect(xmlContent).toContain('<Teste>OK</Teste>');

    const jsonContent = await reloaded.file('manifesto.json')!.async('string');
    const parsed = JSON.parse(jsonContent) as {
      processo: string;
      arquivos: { nome: string }[];
    };
    expect(parsed.processo).toBe(PROCESSO_OK);
    expect(parsed.arquivos).toHaveLength(3);
  });
});

describe('validarPacotePJe', () => {
  it('aceita pacote bem formado', async () => {
    const pacote = await gerarPacotePJe(baseInput());
    const res = validarPacotePJe(pacote);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it('rejeita processo CNJ em formato inválido', async () => {
    const pacote = await gerarPacotePJe(baseInput());
    const corrompido: PacotePJeResult = {
      ...pacote,
      manifesto: { ...pacote.manifesto, processo: PROCESSO_BAD },
    };
    const res = validarPacotePJe(corrompido);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('CNJ'))).toBe(true);
  });

  it('rejeita ZIP vazio e timestamp inválido', () => {
    const pacoteRuim: PacotePJeResult = {
      zip_base64: '',
      zip_size_bytes: 0,
      manifesto: {
        processo: PROCESSO_OK,
        versao: PACOTE_PJE_VERSAO,
        timestamp: 'not-a-date',
        arquivos: [{ nome: 'x.xml', tipo: 'xml', tamanho: 1 }],
      },
    };
    const res = validarPacotePJe(pacoteRuim);
    expect(res.valid).toBe(false);
    // Deve listar erros para ZIP vazio, < 3 arquivos e timestamp
    expect(res.errors.length).toBeGreaterThanOrEqual(3);
    expect(res.errors.some((e) => e.toLowerCase().includes('zip'))).toBe(true);
    expect(res.errors.some((e) => e.toLowerCase().includes('timestamp'))).toBe(true);
    expect(res.errors.some((e) => e.toLowerCase().includes('manifesto'))).toBe(true);
  });
});
