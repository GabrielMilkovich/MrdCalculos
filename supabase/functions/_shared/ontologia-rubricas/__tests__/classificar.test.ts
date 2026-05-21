/**
 * Suíte de testes da ontologia de rubricas (Sprint 2, Fase 2).
 *
 * Cobre:
 *   - 1 match exato por categoria (6 categorias úteis)
 *   - 1 match normalizado por categoria (caps/acento/pontuação)
 *   - 5 matches por sinônimo
 *   - 5 matches fuzzy (variações próximas)
 *   - 5 não-classificações (rubricas inventadas)
 *   - travas anti-"correção silenciosa" das observacoes_juridicas
 *   - sanidade da função `normalizarRubrica`
 *   - integridade estrutural da ONTOLOGIA
 *
 * Decisão de localização: co-localizado com a fonte sob `__tests__/`
 * seguindo a convenção do repo (ver `supabase/functions/_shared/heuristicas/__tests__/`),
 * em vez do path original do spec em `src/features/...`. A justificativa
 * é manter código de edge function + testes próximos.
 */

import { describe, expect, it } from 'vitest';
import {
  ONTOLOGIA,
  RUBRICAS_COM_DIVERGENCIA_JURIDICA,
  type CategoriaRubrica,
} from '../index';
import { classificarRubrica, normalizarRubrica } from '../classificar';

describe('normalizarRubrica', () => {
  it('aplica lower + remove acento + colapsa espaços', () => {
    expect(normalizarRubrica('  COMISSÕES  ')).toBe('comissoes');
    expect(normalizarRubrica('Premiação')).toBe('premiacao');
    expect(normalizarRubrica('DSR(Comissão)')).toBe('dsr comissao');
  });

  it('é idempotente', () => {
    const x = normalizarRubrica('Adic. Tempo de Serviço');
    expect(normalizarRubrica(x)).toBe(x);
  });

  it('retorna string vazia para entrada só com espaços', () => {
    expect(normalizarRubrica('   ')).toBe('');
    expect(normalizarRubrica('')).toBe('');
  });
});

describe('classificarRubrica - match exato (1 por categoria)', () => {
  it('MINIMO_GARANTIDO via texto canônico exato', () => {
    const r = classificarRubrica('Mínimo Garantido');
    expect(r.categoria).toBe<CategoriaRubrica>('MINIMO_GARANTIDO');
    expect(r.metodo_match).toBe('exato');
    expect(r.score_match).toBe(1);
  });

  it('COMISSAO_PRODUTOS via texto canônico exato', () => {
    const r = classificarRubrica('Comissões');
    expect(r.categoria).toBe<CategoriaRubrica>('COMISSAO_PRODUTOS');
    expect(r.metodo_match).toBe('exato');
  });

  it('COMISSAO_SERVICOS via texto canônico exato', () => {
    const r = classificarRubrica('Com. Frete');
    expect(r.categoria).toBe<CategoriaRubrica>('COMISSAO_SERVICOS');
    expect(r.metodo_match).toBe('exato');
  });

  it('PREMIO via texto canônico exato', () => {
    const r = classificarRubrica('Prêmio Mensal');
    expect(r.categoria).toBe<CategoriaRubrica>('PREMIO');
    expect(r.metodo_match).toBe('exato');
  });

  it('DSR_PAGO via texto canônico exato', () => {
    const r = classificarRubrica('DSR (Comissão)');
    expect(r.categoria).toBe<CategoriaRubrica>('DSR_PAGO');
    expect(r.metodo_match).toBe('exato');
  });

  it('DESCONSIDERAR via texto canônico exato', () => {
    const r = classificarRubrica('Férias Pagas');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.metodo_match).toBe('exato');
  });
});

describe('classificarRubrica - match normalizado (caps + acento + pontuação)', () => {
  it('MINIMO_GARANTIDO: maiúsculas + sem acento', () => {
    const r = classificarRubrica('MINIMO GARANTIDO');
    expect(r.categoria).toBe<CategoriaRubrica>('MINIMO_GARANTIDO');
    expect(r.metodo_match).toBe('normalizado');
  });

  it('COMISSAO_PRODUTOS: sem acento + espaço extra', () => {
    const r = classificarRubrica('  comissoes  ');
    expect(r.categoria).toBe<CategoriaRubrica>('COMISSAO_PRODUTOS');
    expect(r.metodo_match).toBe('normalizado');
  });

  it('COMISSAO_SERVICOS: pontuação trocada (ponto vira espaço)', () => {
    const r = classificarRubrica('Com  Frete');
    expect(r.categoria).toBe<CategoriaRubrica>('COMISSAO_SERVICOS');
    expect(r.metodo_match).toBe('normalizado');
  });

  it('PREMIO: maiúsculas + sem acento', () => {
    const r = classificarRubrica('PREMIO MENSAL');
    expect(r.categoria).toBe<CategoriaRubrica>('PREMIO');
    expect(r.metodo_match).toBe('normalizado');
  });

  it('DSR_PAGO: parênteses tratados como pontuação', () => {
    const r = classificarRubrica('DSR Comissão');
    expect(r.categoria).toBe<CategoriaRubrica>('DSR_PAGO');
    expect(r.metodo_match).toBe('normalizado');
  });

  it('DESCONSIDERAR: caps + sem acento + pontuação preservada na ontologia', () => {
    const r = classificarRubrica('FERIAS PAGAS');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.metodo_match).toBe('normalizado');
  });
});

describe('classificarRubrica - match por sinônimo (5)', () => {
  it('"Min Garantido" -> Mínimo Garantido (MINIMO_GARANTIDO)', () => {
    const r = classificarRubrica('Min Garantido');
    expect(r.categoria).toBe<CategoriaRubrica>('MINIMO_GARANTIDO');
    expect(r.metodo_match).toBe('sinonimo');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Mínimo Garantido');
  });

  it('"ATS" -> Adic. Tempo de Serviço (COMISSAO_PRODUTOS)', () => {
    const r = classificarRubrica('ATS');
    expect(r.categoria).toBe<CategoriaRubrica>('COMISSAO_PRODUTOS');
    expect(r.metodo_match).toBe('sinonimo');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Adic. Tempo de Serviço');
  });

  it('"Vale Alimentação" -> Auxílio Alimentação (DESCONSIDERAR)', () => {
    const r = classificarRubrica('Vale Alimentação');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.metodo_match).toBe('sinonimo');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Auxílio Alimentação');
  });

  it('"Adic. Noturno" -> Adicional Noturno (DESCONSIDERAR)', () => {
    const r = classificarRubrica('Adic. Noturno');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.metodo_match).toBe('sinonimo');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Adicional Noturno');
  });

  it('"PR. Mensal" -> Prêmio Mensal (PREMIO)', () => {
    const r = classificarRubrica('Pr. Mensal');
    expect(r.categoria).toBe<CategoriaRubrica>('PREMIO');
    expect(r.metodo_match).toBe('sinonimo');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Prêmio Mensal');
  });
});

describe('classificarRubrica - sinônimos derivados de typos originais da planilha', () => {
  it('"Camapanha" (typo) ainda casa com "Campanha"', () => {
    const r = classificarRubrica('Camapanha');
    expect(r.categoria).toBe<CategoriaRubrica>('COMISSAO_SERVICOS');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Campanha');
    // Pode bater como sinônimo OU fuzzy — qualquer um é OK desde que classifique.
    expect(['sinonimo', 'fuzzy', 'normalizado']).toContain(r.metodo_match);
  });

  it('"Auxílio Aimientação" (typo) ainda casa com "Auxílio Alimentação"', () => {
    const r = classificarRubrica('Auxílio Aimientação');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Auxílio Alimentação');
  });

  it('"Compl. HE Garatido" (typo) ainda casa com "Compl. HE Garantido"', () => {
    const r = classificarRubrica('Compl. HE Garatido');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Compl. HE Garantido');
  });

  it('"DSR s/ Média Hora Notuma" (typo) ainda casa com "DSR s/ Média Hora Noturna"', () => {
    const r = classificarRubrica('DSR s/ Média Hora Notuma');
    expect(r.categoria).toBe<CategoriaRubrica>('DSR_PAGO');
    expect(r.rubrica_canonica?.texto_canonico).toBe('DSR s/ Média Hora Noturna');
  });

  it('"Antec. Vale Trasnp. - Admissão" (typo) ainda casa com versão correta', () => {
    const r = classificarRubrica('Antec. Vale Trasnp. - Admissão');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Antec. Vale Transp. - Admissão');
  });
});

describe('classificarRubrica - match fuzzy (variações próximas)', () => {
  it('"Comisoes" (1 char a menos) bate em "Comissões" via fuzzy/normalizado', () => {
    const r = classificarRubrica('Comisoes');
    expect(r.categoria).toBe<CategoriaRubrica>('COMISSAO_PRODUTOS');
    expect(['fuzzy', 'normalizado']).toContain(r.metodo_match);
    expect(r.score_match).toBeGreaterThanOrEqual(0.85);
  });

  it('"Premio Estimullo" (typo de 1 char) bate em "Prêmio Estímulo" via fuzzy', () => {
    const r = classificarRubrica('Premio Estimullo');
    expect(r.categoria).toBe<CategoriaRubrica>('PREMIO');
    expect(r.metodo_match).toBe('fuzzy');
    expect(r.score_match).toBeGreaterThanOrEqual(0.85);
  });

  it('"Adicional Noturnoo" (1 char extra) bate em "Adicional Noturno" via fuzzy', () => {
    const r = classificarRubrica('Adicional Noturnoo');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.metodo_match).toBe('fuzzy');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Adicional Noturno');
  });

  it('"DSR Comissaoo" bate em DSR_PAGO via fuzzy', () => {
    const r = classificarRubrica('DSR Comissaoo');
    expect(r.categoria).toBe<CategoriaRubrica>('DSR_PAGO');
    expect(['fuzzy', 'sinonimo', 'normalizado']).toContain(r.metodo_match);
  });

  it('"Gratificaçaõ" (acento mal posicionado) bate em "Gratificação"', () => {
    const r = classificarRubrica('Gratificaçaõ');
    expect(r.categoria).toBe<CategoriaRubrica>('PREMIO');
    expect(r.rubrica_canonica?.texto_canonico).toBe('Gratificação');
  });
});

describe('classificarRubrica - não classificadas (5)', () => {
  it('rubrica completamente inventada cai em NAO_CLASSIFICADO', () => {
    const r = classificarRubrica('Xpto Lambda 9000');
    expect(r.categoria).toBe<CategoriaRubrica>('NAO_CLASSIFICADO');
    expect(r.metodo_match).toBe('nao_encontrado');
    expect(r.rubrica_canonica).toBeNull();
    expect(r.score_match).toBe(0);
  });

  it('string vazia cai em NAO_CLASSIFICADO', () => {
    const r = classificarRubrica('');
    expect(r.categoria).toBe<CategoriaRubrica>('NAO_CLASSIFICADO');
    expect(r.metodo_match).toBe('nao_encontrado');
  });

  it('só espaços cai em NAO_CLASSIFICADO', () => {
    const r = classificarRubrica('   ');
    expect(r.categoria).toBe<CategoriaRubrica>('NAO_CLASSIFICADO');
  });

  it('rubrica jurídica fora do escopo (ex.: "Imposto de Renda") cai em NAO_CLASSIFICADO', () => {
    const r = classificarRubrica('Imposto de Renda');
    expect(r.categoria).toBe<CategoriaRubrica>('NAO_CLASSIFICADO');
  });

  it('"FGTS" cai em NAO_CLASSIFICADO (não está na planilha)', () => {
    const r = classificarRubrica('FGTS');
    expect(r.categoria).toBe<CategoriaRubrica>('NAO_CLASSIFICADO');
  });

  it('"Salário Substituição" cai em NAO_CLASSIFICADO (pendente validação)', () => {
    // B12+B14 da planilha não viraram rubrica — esperado cair como
    // não-classificado até esclarecimento jurídico.
    const r = classificarRubrica('Salário Substituição');
    expect(r.categoria).toBe<CategoriaRubrica>('NAO_CLASSIFICADO');
  });
});

describe('observacao_juridica - travas anti-"correção silenciosa"', () => {
  /**
   * Estes testes existem para garantir que ninguém remova/altere a
   * `observacao_juridica` de rubricas com divergência de súmula sem
   * passar por nova validação jurídica. Se um teste aqui falhar, NÃO
   * "conserte" alterando a observação — abra ticket com o escritório.
   */

  it('Adicional Noturno tem observacao_juridica mencionando Súmula 60 TST', () => {
    const r = classificarRubrica('Adicional Noturno');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.rubrica_canonica?.observacao_juridica).toBeDefined();
    expect(r.rubrica_canonica?.observacao_juridica).toMatch(/Súmula\s*60\s*TST/);
    expect(r.rubrica_canonica?.observacao_juridica).toMatch(/não\s*alterar/i);
  });

  it('DSR H. Extra tem observacao_juridica mencionando Súmula 172 TST', () => {
    const r = classificarRubrica('DSR H. Extra');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.rubrica_canonica?.observacao_juridica).toBeDefined();
    expect(r.rubrica_canonica?.observacao_juridica).toMatch(/Súmula\s*172\s*TST/);
  });

  it('Horas Noturnas tem observacao_juridica (Súmula 60 TST por analogia)', () => {
    const r = classificarRubrica('Horas Noturnas');
    expect(r.categoria).toBe<CategoriaRubrica>('DESCONSIDERAR');
    expect(r.rubrica_canonica?.observacao_juridica).toBeDefined();
    expect(r.rubrica_canonica?.observacao_juridica).toMatch(/Súmula\s*60\s*TST/);
  });

  it('todas as rubricas listadas em RUBRICAS_COM_DIVERGENCIA_JURIDICA têm observacao_juridica', () => {
    for (const nome of RUBRICAS_COM_DIVERGENCIA_JURIDICA) {
      const rubrica = ONTOLOGIA.find((r) => r.texto_canonico === nome);
      expect(rubrica, `Rubrica "${nome}" deveria existir na ONTOLOGIA`).toBeDefined();
      expect(
        rubrica?.observacao_juridica,
        `Rubrica "${nome}" perdeu sua observacao_juridica — abrir ticket com o escritório antes de "consertar" esse teste`,
      ).toBeDefined();
      expect(rubrica?.observacao_juridica?.length ?? 0).toBeGreaterThan(50);
    }
  });
});

describe('integridade estrutural da ONTOLOGIA', () => {
  it('nenhum texto_canonico está duplicado', () => {
    const seen = new Set<string>();
    for (const r of ONTOLOGIA) {
      expect(seen.has(r.texto_canonico), `Duplicata: "${r.texto_canonico}"`).toBe(false);
      seen.add(r.texto_canonico);
    }
  });

  it('todo texto_canonico é não-vazio após normalização', () => {
    for (const r of ONTOLOGIA) {
      expect(normalizarRubrica(r.texto_canonico)).not.toBe('');
    }
  });

  it('todo sinônimo é não-vazio após normalização', () => {
    for (const r of ONTOLOGIA) {
      for (const s of r.sinonimos) {
        expect(normalizarRubrica(s), `Sinônimo vazio em "${r.texto_canonico}"`).not.toBe('');
      }
    }
  });

  it('toda rubrica tem categoria válida (nenhuma NAO_CLASSIFICADO)', () => {
    const categoriasValidas: CategoriaRubrica[] = [
      'MINIMO_GARANTIDO',
      'COMISSAO_PRODUTOS',
      'COMISSAO_SERVICOS',
      'PREMIO',
      'DSR_PAGO',
      'DESCONSIDERAR',
    ];
    for (const r of ONTOLOGIA) {
      expect(categoriasValidas).toContain(r.categoria);
    }
  });

  it('contagens por categoria batem com a planilha (após decisões da Fase 1)', () => {
    // Esperado conforme planilha + decisões de typos/exclusões da Fase 1.
    const esperado: Record<Exclude<CategoriaRubrica, 'NAO_CLASSIFICADO'>, number> = {
      MINIMO_GARANTIDO: 3, // B3, B4, B5 (B12/B14 excluídos — pendentes)
      COMISSAO_PRODUTOS: 24, // toda coluna C
      DSR_PAGO: 6, // D3-D8 (D9 é meta-instrução)
      COMISSAO_SERVICOS: 17, // E3-E19 (E20 é meta-instrução; 4 Camapanha→Campanha)
      PREMIO: 20, // toda coluna F
      DESCONSIDERAR: 26, // G3-G29 menos G21 (CH. Extras nunca, descartada)
    };
    const real: Record<string, number> = {};
    for (const r of ONTOLOGIA) {
      real[r.categoria] = (real[r.categoria] ?? 0) + 1;
    }
    for (const [cat, n] of Object.entries(esperado)) {
      expect(real[cat], `Categoria ${cat}`).toBe(n);
    }
  });
});
