import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { aplicarJornadaDeferida, type JornadaRegras } from '../aplicar';
import { parseCartaoPontoViaVarejo } from '../../data-extraction/parsers/cartao-ponto/layouts/via-varejo-v1';
import type { ParseCartaoPontoResult } from '../../data-extraction/parsers/cartao-ponto';

function ap(
  data: string,
  pares: Array<[string, string]>,
): ParseCartaoPontoResult['apuracoes'][number] {
  return {
    data,
    dia_semana: null,
    ocorrencia: 'NORMAL',
    marcacoes: pares.map(([e, s]) => ({ e, s })),
    eventos: [],
    observacao: null,
  };
}

function pcp(apuracoes: ParseCartaoPontoResult['apuracoes']): ParseCartaoPontoResult {
  return {
    apuracoes,
    competencias: new Map(),
    competencia_predominante: '',
    data_inicial: '',
    data_final: '',
    warnings: [],
    unparsed_lines: [],
    parser_version: 'test',
  };
}

const VAZIO: JornadaRegras = {
  regraBase: {
    delta_inicio_min: 0,
    delta_fim_min: 0,
    intervalo_min: null,
    vigencia: { inicio: null, fim: null },
  },
  overrides: [],
};

describe('aplicarJornadaDeferida — invariantes (delta=0 é identidade)', () => {
  it('regra delta=0 sem override → apurações idênticas', () => {
    const parsed = pcp([
      ap('2011-06-02', [
        ['10:03', '14:02'],
        ['15:10', '18:25'],
      ]),
      ap('2011-06-03', [['09:41', '14:10']]),
    ]);
    const r = aplicarJornadaDeferida(parsed, VAZIO);
    expect(r.apuracoes).toEqual(parsed.apuracoes);
    expect(r.warnings).toHaveLength(0);
  });

  it('aplicar offset e desaplicar offset oposto volta ao original', () => {
    const original = ap('2011-06-02', [
      ['10:00', '14:00'],
      ['15:00', '18:00'],
    ]);
    const r1 = aplicarJornadaDeferida(pcp([original]), {
      ...VAZIO,
      regraBase: {
        delta_inicio_min: -60,
        delta_fim_min: 60,
        intervalo_min: null,
        vigencia: { inicio: null, fim: null },
      },
    });
    const r2 = aplicarJornadaDeferida(pcp(r1.apuracoes), {
      ...VAZIO,
      regraBase: {
        delta_inicio_min: 60,
        delta_fim_min: -60,
        intervalo_min: null,
        vigencia: { inicio: null, fim: null },
      },
    });
    expect(r2.apuracoes[0].marcacoes).toEqual(original.marcacoes);
  });
});

describe('aplicarJornadaDeferida — offset de jornada', () => {
  it('-1h/+1h aplica na primeira entrada e última saída do dia', () => {
    const parsed = pcp([
      ap('2011-06-02', [
        ['10:03', '14:02'],
        ['15:10', '18:25'],
      ]),
    ]);
    const r = aplicarJornadaDeferida(parsed, {
      ...VAZIO,
      regraBase: {
        delta_inicio_min: -60,
        delta_fim_min: 60,
        intervalo_min: null,
        vigencia: { inicio: null, fim: null },
      },
    });
    expect(r.apuracoes[0].marcacoes[0]).toEqual({ e: '09:03', s: '14:02' });
    expect(r.apuracoes[0].marcacoes[1]).toEqual({ e: '15:10', s: '19:25' });
    expect(r.diffPorDia[0].transformacao).toBe('offset');
  });

  it('offset cruza meia-noite no fim → saída avança ao dia seguinte', () => {
    const parsed = pcp([ap('2011-06-02', [['22:00', '23:30']])]);
    const r = aplicarJornadaDeferida(parsed, {
      ...VAZIO,
      regraBase: {
        delta_inicio_min: 0,
        delta_fim_min: 60,
        intervalo_min: null,
        vigencia: { inicio: null, fim: null },
      },
    });
    // 23:30 + 60 = 24:30 → 00:30 (dia seguinte). PJe-Calc trata.
    expect(r.apuracoes[0].marcacoes[0].s).toBe('00:30');
  });

  it('offset retroage entrada antes de 00:00 → trunca em 00:00 + warning', () => {
    const parsed = pcp([ap('2011-06-02', [['00:30', '08:00']])]);
    const r = aplicarJornadaDeferida(parsed, {
      ...VAZIO,
      regraBase: {
        delta_inicio_min: -60,
        delta_fim_min: 0,
        intervalo_min: null,
        vigencia: { inicio: null, fim: null },
      },
    });
    expect(r.apuracoes[0].marcacoes[0].e).toBe('00:00');
    expect(r.warnings.some((w) => /cruza in[íi]cio/i.test(w))).toBe(true);
  });

  it('intervalo fixo recalcula entrada do 2º par', () => {
    const parsed = pcp([
      ap('2011-06-02', [
        ['10:00', '14:00'], // intervalo cartão = 60 min
        ['15:00', '18:00'],
      ]),
    ]);
    const r = aplicarJornadaDeferida(parsed, {
      ...VAZIO,
      regraBase: {
        delta_inicio_min: 0,
        delta_fim_min: 0,
        intervalo_min: 30, // sentença força 30 min
        vigencia: { inicio: null, fim: null },
      },
    });
    // Entrada 2 = saída 1 + 30 = 14:00 + 30 = 14:30
    expect(r.apuracoes[0].marcacoes[1].e).toBe('14:30');
    expect(r.apuracoes[0].marcacoes[1].s).toBe('18:00');
  });
});

describe('aplicarJornadaDeferida — override por data específica', () => {
  it('Override substitui jornada do dia (cria 2 pares com intervalo)', () => {
    const parsed = pcp([
      ap('2011-05-08', [
        ['10:00', '14:00'],
        ['15:00', '18:00'],
      ]),
    ]);
    const r = aplicarJornadaDeferida(parsed, {
      ...VAZIO,
      overrides: [
        {
          kind: 'data_especifica',
          data: new Date(Date.UTC(2011, 4, 8)),
          inicio: '07:30',
          fim: '21:30',
          intervalo_min: 30,
          descricao: 'Dia das Mães',
        },
      ],
    });
    expect(r.apuracoes[0].marcacoes).toHaveLength(2);
    expect(r.apuracoes[0].marcacoes[0].e).toBe('07:30');
    expect(r.apuracoes[0].marcacoes[1].s).toBe('21:30');
    expect(r.diffPorDia[0].transformacao).toBe('override');
    expect(r.diffPorDia[0].descricao_override).toContain('Dia das Mães');
  });

  it('Override em dia SEM batida no cartão cria apuração nova', () => {
    const parsed = pcp([ap('2011-05-09', [['10:00', '14:00']])]);
    const r = aplicarJornadaDeferida(parsed, {
      ...VAZIO,
      overrides: [
        {
          kind: 'data_especifica',
          data: new Date(Date.UTC(2011, 4, 8)),
          inicio: '07:30',
          fim: '21:30',
          intervalo_min: 30,
          descricao: 'Dia das Mães',
        },
      ],
    });
    expect(r.apuracoes).toHaveLength(2);
    expect(r.apuracoes[0].data).toBe('2011-05-08');
    expect(r.apuracoes[1].data).toBe('2011-05-09');
  });
});

describe('aplicarJornadaDeferida — override recorrente (calendário)', () => {
  it('Black Friday materializa em todos os anos do range', () => {
    const parsed = pcp([
      ap('2011-11-25', [['10:00', '14:00']]), // BF 2011 (última sex novembro)
      ap('2012-11-30', [['10:00', '14:00']]), // BF 2012 (última sex novembro)
    ]);
    const r = aplicarJornadaDeferida(parsed, {
      ...VAZIO,
      overrides: [
        {
          kind: 'recorrente',
          regra: { tipo: 'black_friday' },
          inicio: '07:30',
          fim: '21:30',
          intervalo_min: 30,
          descricao: 'Black Friday',
        },
      ],
    });
    expect(r.apuracoes[0].marcacoes[0].e).toBe('07:30');
    expect(r.apuracoes[1].marcacoes[0].e).toBe('07:30');
    expect(r.diffPorDia.every((d) => d.transformacao === 'override')).toBe(true);
  });
});

describe('aplicarJornadaDeferida — vigência da regra base', () => {
  it('Apurações fora da vigência ficam intactas', () => {
    const parsed = pcp([
      ap('2010-12-31', [['10:00', '14:00']]),
      ap('2011-06-15', [['10:00', '14:00']]),
      ap('2017-01-01', [['10:00', '14:00']]),
    ]);
    const r = aplicarJornadaDeferida(parsed, {
      ...VAZIO,
      regraBase: {
        delta_inicio_min: -60,
        delta_fim_min: 60,
        intervalo_min: null,
        vigencia: {
          inicio: new Date(Date.UTC(2011, 0, 1)),
          fim: new Date(Date.UTC(2016, 11, 31)),
        },
      },
    });
    expect(r.apuracoes[0].marcacoes[0].e).toBe('10:00'); // antes da vigência
    expect(r.apuracoes[1].marcacoes[0].e).toBe('09:00'); // dentro
    expect(r.apuracoes[2].marcacoes[0].e).toBe('10:00'); // depois
  });

  it('Override fora da vigência da regra base ainda vence', () => {
    const parsed = pcp([ap('2010-05-09', [['10:00', '14:00']])]);
    const r = aplicarJornadaDeferida(parsed, {
      ...VAZIO,
      regraBase: {
        delta_inicio_min: -60,
        delta_fim_min: 60,
        intervalo_min: null,
        vigencia: {
          inicio: new Date(Date.UTC(2011, 0, 1)),
          fim: null,
        },
      },
      overrides: [
        {
          kind: 'data_especifica',
          data: new Date(Date.UTC(2010, 4, 9)),
          inicio: '07:30',
          fim: '21:30',
          intervalo_min: 30,
          descricao: 'Domingo Especial',
        },
      ],
    });
    expect(r.apuracoes[0].marcacoes[0].e).toBe('07:30');
    expect(r.diffPorDia[0].transformacao).toBe('override');
  });
});

describe('aplicarJornadaDeferida — caso real Joseli (fixture)', () => {
  it('Cartão Joseli + offset -1h/+1h aplica nas 64 apurações', () => {
    const ocrPath = join(
      __dirname,
      '..',
      '..',
      'data-extraction',
      '__tests__',
      '_fixtures',
      'cartao-ponto',
      'joseli-via-varejo-2011-2016',
      'ocr.txt',
    );
    const ocr = readFileSync(ocrPath, 'utf-8');
    const parsed = parseCartaoPontoViaVarejo(ocr);
    const r = aplicarJornadaDeferida(parsed, {
      ...VAZIO,
      regraBase: {
        delta_inicio_min: -60,
        delta_fim_min: 60,
        intervalo_min: null,
        vigencia: { inicio: null, fim: null },
      },
    });
    expect(r.apuracoes).toHaveLength(parsed.apuracoes.length);

    // Primeira apuração: 02/06/2011 10:03 14:02 15:10 18:25 → 09:03 ... 19:25
    const dia02 = r.apuracoes.find((a) => a.data === '2011-06-02');
    expect(dia02).toBeDefined();
    expect(dia02!.marcacoes[0].e).toBe('09:03');
    expect(dia02!.marcacoes[1].s).toBe('19:25');
  });
});
