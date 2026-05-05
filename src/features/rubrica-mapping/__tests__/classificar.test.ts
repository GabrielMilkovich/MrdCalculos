import { describe, expect, it } from 'vitest';
import {
  classificarRubrica,
  classificarLote,
  normalizarRubrica,
  type RubricaMappingRow,
} from '../classificar';

// Mini-tabela em memória representando o seed (subset realista para testes).
const TABELA: RubricaMappingRow[] = [
  // Enumerados
  {
    id: 'e1',
    rubrica_normalizada: 'premio',
    rubrica_original: 'Prêmio',
    bucket: 'premios',
    layout_aplicavel: 'via_varejo',
    tipo_regra: 'enumerado_explicito',
    prioridade: 100,
    excecoes: [],
    observacao: null,
  },
  {
    id: 'e2',
    rubrica_normalizada: 'premio mensal',
    rubrica_original: 'Prêmio Mensal',
    bucket: 'premios',
    layout_aplicavel: 'via_varejo',
    tipo_regra: 'enumerado_explicito',
    prioridade: 100,
    excecoes: [],
    observacao: null,
  },
  {
    id: 'e3',
    rubrica_normalizada: 'pr recarga de celular',
    rubrica_original: 'PR Recarga de celular',
    bucket: 'premios',
    layout_aplicavel: 'via_varejo',
    tipo_regra: 'enumerado_explicito',
    prioridade: 100,
    excecoes: [],
    observacao: null,
  },
  {
    id: 'e4',
    rubrica_normalizada: 'dsr h. extra',
    rubrica_original: 'DSR H. Extra',
    bucket: 'desconsiderar',
    layout_aplicavel: 'via_varejo',
    tipo_regra: 'enumerado_explicito',
    prioridade: 100,
    excecoes: [],
    observacao: null,
  },
  {
    id: 'e5',
    rubrica_normalizada: 'comissoes',
    rubrica_original: 'Comissões',
    bucket: 'comissoes_produtos',
    layout_aplicavel: 'via_varejo',
    tipo_regra: 'enumerado_explicito',
    prioridade: 100,
    excecoes: [],
    observacao: null,
  },
  // Soft
  {
    id: 's1',
    rubrica_normalizada: 'premio',
    rubrica_original: null,
    bucket: 'premios',
    layout_aplicavel: 'via_varejo',
    tipo_regra: 'regra_soft_contains',
    prioridade: 50,
    excecoes: ['premio antecipado de comissao'],
    observacao: 'Tudo com "prêmio" → Prêmios',
  },
  {
    id: 's2',
    rubrica_normalizada: 'gratificacao',
    rubrica_original: null,
    bucket: 'premios',
    layout_aplicavel: 'via_varejo',
    tipo_regra: 'regra_soft_contains',
    prioridade: 50,
    excecoes: [],
    observacao: 'Tudo com "gratificação" → Prêmios',
  },
  {
    id: 's3',
    rubrica_normalizada: 'dsr ',
    rubrica_original: null,
    bucket: 'dsr_comissoes',
    layout_aplicavel: 'via_varejo',
    tipo_regra: 'regra_soft_startswith',
    prioridade: 50,
    excecoes: ['dsr 13', 'dsr horas extras', 'dsr h. extra', 'dsr he', 'dsr h extra'],
    observacao: 'DSR começo → DSR Comissões (exceto 13° e HE)',
  },
];

describe('normalizarRubrica', () => {
  it('remove acentos e lowercase', () => {
    expect(normalizarRubrica('Prêmio Mensal')).toBe('premio mensal');
    expect(normalizarRubrica('Comissão')).toBe('comissao');
    expect(normalizarRubrica('Adic. Tempo de Serviço')).toBe(
      'adic. tempo de servico',
    );
  });

  it('colapsa espaços múltiplos', () => {
    expect(normalizarRubrica('  COMISSÕES   ANTECIPADAS  ')).toBe(
      'comissoes antecipadas',
    );
  });

  it('idempotente', () => {
    const n = normalizarRubrica('Prêmio Especial');
    expect(normalizarRubrica(n)).toBe(n);
  });
});

describe('classificarRubrica — enumerado vence soft', () => {
  it('"Prêmio Mensal" → enumerado bucket premios (alta confiança)', () => {
    const r = classificarRubrica('Prêmio Mensal', 'via_varejo', TABELA);
    expect(r.bucket).toBe('premios');
    expect(r.origem).toBe('enumerado');
    expect(r.confianca).toBe('alta');
    expect(r.regra_aplicada_id).toBe('e2');
  });

  it('"PR Recarga de celular" → enumerado (não cai em soft "premio")', () => {
    const r = classificarRubrica('PR Recarga de celular', 'via_varejo', TABELA);
    expect(r.bucket).toBe('premios');
    expect(r.origem).toBe('enumerado');
    expect(r.regra_aplicada_id).toBe('e3');
  });

  it('"Comissões" → comissoes_produtos enumerado', () => {
    const r = classificarRubrica('Comissões', 'via_varejo', TABELA);
    expect(r.bucket).toBe('comissoes_produtos');
    expect(r.origem).toBe('enumerado');
  });
});

describe('classificarRubrica — regras soft', () => {
  it('"Prêmio Inventado XPTO" → soft_contains "premio" → premios', () => {
    const r = classificarRubrica('Prêmio Inventado XPTO', 'via_varejo', TABELA);
    expect(r.bucket).toBe('premios');
    expect(r.origem).toBe('soft_contains');
    expect(r.confianca).toBe('media');
  });

  it('"Gratificação Especial" → soft_contains "gratificacao" → premios', () => {
    const r = classificarRubrica('Gratificação Especial', 'via_varejo', TABELA);
    expect(r.bucket).toBe('premios');
    expect(r.origem).toBe('soft_contains');
  });

  it('"DSR sobre Comissões" → soft_startswith "dsr " → dsr_comissoes', () => {
    const r = classificarRubrica('DSR sobre Comissões', 'via_varejo', TABELA);
    expect(r.bucket).toBe('dsr_comissoes');
    expect(r.origem).toBe('soft_startswith');
  });
});

describe('classificarRubrica — exceções', () => {
  it('"DSR H. Extra" → enumerado desconsiderar (NÃO cai em soft DSR)', () => {
    const r = classificarRubrica('DSR H. Extra', 'via_varejo', TABELA);
    expect(r.bucket).toBe('desconsiderar');
    expect(r.origem).toBe('enumerado');
  });

  it('"DSR Horas Extras" → exceção da soft → fallback (não tem enumerado)', () => {
    // "DSR Horas Extras" não está no enumerado nesta mini-tabela; cai em
    // soft "dsr ", mas a exceção bloqueia. Volta pra fallback.
    const r = classificarRubrica('DSR Horas Extras', 'via_varejo', TABELA);
    expect(r.bucket).toBe('nao_classificado');
    expect(r.origem).toBe('fallback');
    expect(r.confianca).toBe('baixa');
  });

  it('"Prêmio Antecipado de Comissão" → exceção da soft → fallback', () => {
    const r = classificarRubrica(
      'Prêmio Antecipado de Comissão',
      'via_varejo',
      TABELA,
    );
    expect(r.bucket).toBe('nao_classificado');
  });
});

describe('classificarRubrica — fallback', () => {
  it('"Auxílio Combustível" → nao_classificado', () => {
    const r = classificarRubrica('Auxílio Combustível', 'via_varejo', TABELA);
    expect(r.bucket).toBe('nao_classificado');
    expect(r.origem).toBe('fallback');
    expect(r.confianca).toBe('baixa');
  });

  it('Layout diferente do disponível → fallback', () => {
    const r = classificarRubrica('Comissões', 'magazine_luiza', TABELA);
    expect(r.bucket).toBe('nao_classificado');
  });
});

describe('classificarLote', () => {
  it('Agrupa por bucket e isola não-classificadas', () => {
    const r = classificarLote(
      [
        'Prêmio Mensal',
        'Comissões',
        'Auxílio Combustível',
        'Gratificação',
        'DSR Inventado',
        'Algo Estranho',
      ],
      'via_varejo',
      TABELA,
    );
    expect(r.porBucket.get('premios')?.length).toBe(2); // Prêmio Mensal + Gratificação
    expect(r.porBucket.get('comissoes_produtos')?.length).toBe(1);
    expect(r.porBucket.get('dsr_comissoes')?.length).toBe(1);
    expect(r.naoClassificadas.length).toBe(2); // Auxílio Combustível + Algo Estranho
  });
});
