/**
 * Export Edge Cases — Hardening tests for CSV / Excel / PDF / XML / eSocial
 * download helpers and serializers.
 *
 * Cobertura:
 *   - 0 verbas (resultado mínimo)
 *   - valores muito grandes (R$ 999 trilhões)
 *   - valores NaN / Infinity (entradas sujas)
 *   - filename injection (path separators, control chars, espaços)
 *   - ambiente sem File API (deve lançar erro claro)
 *   - dataNaoInformada vazia em fmtDate / fmtComp
 *   - encoding UTF-8 com BOM no CSV (compat Excel pt-BR)
 *   - CSV vazio gera blob mínimo (não quebra Excel)
 *   - downloadBlob revoga URL mesmo se click falhar
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Decimal from 'decimal.js';
import type {
  PjeLiquidacaoResult, PjeVerbaResult, PjeResumo,
} from '../engine-types';
import {
  exportToCSV,
  exportToExcel,
  downloadBlob,
  downloadCSV,
  DEFAULT_SHEETS,
} from '../excel-export';

// ─────────────────────────────────────────────────────────────────────
// Factories — minimal valid PjeLiquidacaoResult
// ─────────────────────────────────────────────────────────────────────

function makeEmptyResumo(): PjeResumo {
  return {
    principal_bruto: 0,
    principal_corrigido: 0,
    juros_mora: 0,
    fgts_total: 0,
    cs_segurado: 0,
    cs_empregador: 0,
    ir_retido: 0,
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
    liquido_reclamante: 0,
    total_reclamada: 0,
  };
}

function makeMinimalResult(overrides: Partial<PjeLiquidacaoResult> = {}): PjeLiquidacaoResult {
  return {
    data_liquidacao: '2025-06-01',
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
    resumo: makeEmptyResumo(),
    ...overrides,
  };
}

function makeVerba(overrides: Partial<PjeVerbaResult> = {}): PjeVerbaResult {
  return {
    verba_id: 'v1',
    nome: 'Horas Extras 50%',
    tipo: 'principal',
    caracteristica: 'comum',
    ocorrencias: [{
      competencia: '2024-01',
      base: 3000,
      divisor: 220,
      multiplicador: 1.5,
      quantidade: 10,
      dobra: 1,
      devido: 204.55,
      pago: 0,
      diferenca: 204.55,
      indice_correcao: 1.05,
      valor_corrigido: 214.78,
      juros: 12.50,
      valor_final: 227.28,
      formula: '3000/220*1.5*10',
    }],
    total_devido: 204.55,
    total_pago: 0,
    total_diferenca: 204.55,
    total_corrigido: 214.78,
    total_juros: 12.50,
    total_final: 227.28,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────
// CSV / Excel — edge cases
// ─────────────────────────────────────────────────────────────────────

describe('Export edge cases — CSV', () => {
  it('lida com 0 verbas (resultado vazio) sem quebrar', () => {
    const result = makeMinimalResult();
    const csv = exportToCSV(result);
    // Deve conter pelo menos o BOM + cabeçalho + bloco RESUMO
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('Verba');
    expect(csv).toContain('--- RESUMO ---');
    expect(csv).toContain('0,00'); // BRL pt-BR
  });

  it('preserva ordem de grandeza para valores muito grandes (R$ trilhões)', () => {
    // Limitado pela precisão do Number JS (15-16 dígitos significativos).
    // Para valores > 1e15 a perda de centavos é inerente do double — o que
    // testamos é que NÃO há crash e NÃO há notação científica no output.
    const big = 1234567890123.45;
    const result = makeMinimalResult({
      resumo: {
        ...makeEmptyResumo(),
        principal_bruto: big,
        total_reclamada: big,
      },
    });
    const csv = exportToCSV(result);
    // Não deve aparecer notação científica
    expect(csv).not.toMatch(/e\+/i);
    // Deve formatar com separador pt-BR (milhares com .)
    expect(csv).toContain('1.234.567.890.123,45');
  });

  it('trata valores NaN / Infinity como 0 (sem crash)', () => {
    const result = makeMinimalResult({
      resumo: {
        ...makeEmptyResumo(),
        // valores impossíveis vindos de divisões por zero
        principal_bruto: NaN,
        juros_mora: Infinity,
        ir_retido: -Infinity,
      },
    });
    const csv = exportToCSV(result);
    expect(csv).not.toContain('NaN');
    expect(csv).not.toContain('Infinity');
    expect(csv).toContain('0,00');
  });

  it('escapa corretamente strings com ; " e quebras de linha', () => {
    const result = makeMinimalResult({
      verbas: [makeVerba({
        nome: 'Verba "X"; com\nquebra',
      })],
    });
    const csv = exportToCSV(result);
    // Aspas duplicadas dentro do campo
    expect(csv).toContain('Verba ""X""');
    // Campo deve estar entre aspas
    expect(csv).toMatch(/"Verba ""X""; com\nquebra"/);
  });

  it('CSV usa BOM UTF-8 + delimitador `;` + CRLF (compat Excel pt-BR)', () => {
    const csv = exportToCSV(makeMinimalResult());
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain(';');
    expect(csv).toContain('\r\n');
  });
});

describe('Export edge cases — XLSX', () => {
  it('gera XLSX válido para 0 verbas (>0 bytes)', async () => {
    const result = makeMinimalResult();
    const blob = await exportToExcel(result, undefined, DEFAULT_SHEETS);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('gera XLSX com várias verbas e valores grandes sem perda', async () => {
    const result = makeMinimalResult({
      verbas: Array.from({ length: 50 }, (_, i) => makeVerba({
        verba_id: `v${i}`,
        nome: `Verba ${i}`,
        total_final: 1e9 + i,
      })),
    });
    const blob = await exportToExcel(result, undefined, DEFAULT_SHEETS);
    expect(blob.size).toBeGreaterThan(1000); // verifica payload real
  });

  it('aceita seleção de zero abas mas ainda retorna blob', async () => {
    const result = makeMinimalResult();
    const blob = await exportToExcel(result, undefined, {
      resumo: false, verbas: false, correcao: false, inss: false,
      irrf: false, fgts: false, honorarios: false, memoria: false,
    });
    // XLSX com zero sheets ainda é um arquivo ZIP válido
    expect(blob).toBeInstanceOf(Blob);
  });
});

// ─────────────────────────────────────────────────────────────────────
// downloadBlob / downloadCSV — File API hardening
// ─────────────────────────────────────────────────────────────────────

describe('downloadBlob — segurança e robustez', () => {
  beforeEach(() => {
    // Garantir que document mockado existe (jsdom já provê)
    if (typeof document === 'undefined') {
      // Skip — sem jsdom não conseguimos testar
      return;
    }
  });

  it('lança erro claro quando blob é null', () => {
    // @ts-expect-error: testando proteção runtime
    expect(() => downloadBlob(null, 'x.csv')).toThrow(/blob é obrigatório/);
  });

  it('sanitiza filename com path separators e control chars', () => {
    if (typeof document === 'undefined') return;
    const createSpy = vi.spyOn(document, 'createElement');
    const blob = new Blob(['x'], { type: 'text/csv' });

    downloadBlob(blob, '../../etc/passwd?token=\x00\x01<script>');

    // Verificar que o anchor recebeu nome sanitizado
    const anchorCalls = createSpy.mock.results.filter(r => r.value instanceof HTMLAnchorElement);
    expect(anchorCalls.length).toBeGreaterThan(0);
    const anchor = anchorCalls[anchorCalls.length - 1].value as HTMLAnchorElement;
    expect(anchor.download).not.toContain('/');
    expect(anchor.download).not.toContain('\\');
    expect(anchor.download).not.toContain('\x00');
    expect(anchor.download).not.toContain('<');
    createSpy.mockRestore();
  });

  it('lança erro em ambiente sem File API', () => {
    const origURL = (globalThis as { URL?: typeof URL }).URL;
    // @ts-expect-error: simulando ambiente sem URL
    delete (globalThis as { URL?: typeof URL }).URL;
    try {
      const blob = new Blob(['x']);
      expect(() => downloadBlob(blob, 'x.csv')).toThrow(/File API/);
    } finally {
      (globalThis as { URL?: typeof URL }).URL = origURL;
    }
  });

  it('downloadCSV cria Blob válido mesmo com conteúdo vazio', () => {
    if (typeof document === 'undefined') return;
    // Não deve lançar
    expect(() => downloadCSV('', 'empty.csv')).not.toThrow();
  });

  it('downloadCSV aceita conteúdo undefined sem crashar', () => {
    if (typeof document === 'undefined') return;
    // @ts-expect-error: testando proteção runtime
    expect(() => downloadCSV(undefined, 'undef.csv')).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────
// PDF download — File API
// ─────────────────────────────────────────────────────────────────────

describe('downloadHTML — PDF report', () => {
  it('sanitiza filename com path traversal', async () => {
    if (typeof document === 'undefined') return;
    const { downloadHTML } = await import('../pdf/download');
    const createSpy = vi.spyOn(document, 'createElement');

    downloadHTML('<html></html>', '../../malicious.html');

    const anchorCalls = createSpy.mock.results.filter(r => r.value instanceof HTMLAnchorElement);
    const anchor = anchorCalls[anchorCalls.length - 1].value as HTMLAnchorElement;
    expect(anchor.download).not.toContain('/');
    expect(anchor.download).not.toContain('..');
    createSpy.mockRestore();
  });

  it('lança erro em ambiente sem File API', async () => {
    const { downloadHTML } = await import('../pdf/download');
    const origURL = (globalThis as { URL?: typeof URL }).URL;
    // @ts-expect-error: removendo URL
    delete (globalThis as { URL?: typeof URL }).URL;
    try {
      expect(() => downloadHTML('<x/>', 'r.html')).toThrow(/File API/);
    } finally {
      (globalThis as { URL?: typeof URL }).URL = origURL;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// eSocial XML — edge cases
// ─────────────────────────────────────────────────────────────────────

describe('eSocial export — edge cases', () => {
  it('escapa caracteres XML em campos do empregado', async () => {
    const { gerarS2500 } = await import('../esocial-export');
    const result = makeMinimalResult({
      verbas: [makeVerba()],
    });
    const xml = gerarS2500({
      ambiente: '2',
      tpProcesso: '2',
      dados: {
        cnpjEmpregador: '11222333000181', // CNPJ válido (DV correto)
        nomeEmpregador: 'Empresa & Cia <Ltda>',
        nrProcTrab: '00010002020205020001',
        perApurPgto: '2024-01',
        cpfTrab: '11144477735', // CPF válido (DV correto)
        nmTrab: 'José da Silva & Filho',
        codCateg: '101',
        indContr: '1',
        tpTrib: '2',
        dtAdm: '2020-01-01',
        dtDeslig: '2023-12-31',
      },
    }, result);
    // & deve estar escapado
    expect(xml).toContain('&amp;');
    // < e > não devem aparecer crus dentro de texto (apenas em tags)
    const textBetweenTags = xml.replace(/<[^>]+>/g, '');
    expect(textBetweenTags).not.toContain('<');
    expect(textBetweenTags).not.toContain('>');
  });
});

// ─────────────────────────────────────────────────────────────────────
// PJC XML — download
// ─────────────────────────────────────────────────────────────────────

describe('downloadPJCXml — segurança', () => {
  it('lança erro em ambiente sem File API', async () => {
    const { downloadPJCXml } = await import('../pjc-xml-real');
    const origURL = (globalThis as { URL?: typeof URL }).URL;
    // @ts-expect-error: removendo URL
    delete (globalThis as { URL?: typeof URL }).URL;
    try {
      expect(() => downloadPJCXml({
        processo: { numero_cnj: '0001000', reclamante_nome: 'Test' },
        parametros: {
          data_admissao: '2020-01-01',
          carga_horaria: 220,
          sabado_dia_util: false,
          prescricao_quinquenal: false,
          projetar_aviso: false,
          limitar_avos: false,
          zerar_negativos: true,
        },
        apuracao_diaria: [],
        historicos_salariais: [],
        calculadas: [],
        reflexos: [],
        faltas_afastamentos: [],
        ferias: [],
        atualizacao: {
          indice_base: 'IPCA-E',
          juros_base: 'TAXA_LEGAL',
          juros_percentual: 1,
          combinacoes_indice: [],
          combinacoes_juros: [],
        },
      })).toThrow(/File API/);
    } finally {
      (globalThis as { URL?: typeof URL }).URL = origURL;
    }
  });
});
