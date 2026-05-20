/**
 * Testes unitários do módulo de corte de totalizadores em cartão de ponto.
 *
 * Diagnóstico completo em /tmp/auditoria-debito-bh.md.
 */
import { describe, expect, it } from 'vitest';
import { cortarTotalizadores } from '../totalizadores-cartao-ponto';

describe('Estratégia 1: label-antes — família camelCase', () => {
  it('BCre casa como label-antes', () => {
    const linha = '09:00 12:00 13:05 17:25 BCre 7:25';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
    expect(r.confianca).toBe('alta');
    expect(r.parteBatidas).toBe('09:00 12:00 13:05 17:25 ');
    expect(r.parteTotalizadores).toBe('BCre 7:25');
  });

  it('BDeb casa como label-antes', () => {
    const linha = '08:00 12:00 BDeb 1:28';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
    expect(r.confianca).toBe('alta');
  });

  it('HExt casa como label-antes', () => {
    const linha = '08:00 12:00 13:00 17:30 HExt 0:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('AdNot casa como label-antes', () => {
    const linha = '08:00 12:00 AdNot 1:00';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('HCIe casa como label-antes', () => {
    const linha = '08:00 12:00 HCIe 0:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('HEmb casa como label-antes', () => {
    const linha = '08:00 12:00 HEmb 0:15';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('BCo casa como label-antes', () => {
    const linha = '08:00 12:00 BCo 0:00';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });
});

describe('Estratégia 1: label-antes — literais e ambíguos', () => {
  it('Descanso casa (DSR pago)', () => {
    const linha = '08:00 12:00 Descanso 8:00';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
    expect(r.parteTotalizadores).toContain('Descanso');
  });

  it('Desconto casa (valor descontado)', () => {
    const linha = '08:00 12:00 Desconto 0:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Desconsiderada NÃO casa (false positive crítico)', () => {
    const linha = '08:00 12:00 Desconsiderada 13:00 17:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe(null);
    expect(r.confianca).toBe('alta');
    expect(r.parteBatidas).toBe(linha);
    expect(r.parteTotalizadores).toBe('');
  });

  it('Descrição NÃO casa', () => {
    const linha = '08:00 12:00 Descrição teste';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe(null);
  });

  it('Desc 7:25 casa (com tempo obrigatório)', () => {
    const linha = '08:00 12:00 13:00 17:30 Desc 7:25';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
    expect(r.parteTotalizadores).toContain('Desc 7:25');
  });

  it('Desc sozinho (sem tempo) NÃO casa', () => {
    const linha = '08:00 12:00 Desc apenas texto';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe(null);
  });

  it('H. Extras casa (com ponto e espaço)', () => {
    const linha = '08:00 12:00 H. Extras 0:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('H Extras casa (sem ponto)', () => {
    const linha = '08:00 12:00 H Extras 0:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('HExtras casa (colado)', () => {
    const linha = '08:00 12:00 HExtras 0:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Hr Trab casa', () => {
    const linha = '08:00 12:00 Hr Trab 4:00';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Hr. Trabalhadas casa', () => {
    const linha = '08:00 12:00 Hr. Trabalhadas 4:00';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Total sozinho NÃO casa', () => {
    const linha = '08:00 12:00 Total mensal';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe(null);
  });

  it('Total 7:25 casa', () => {
    const linha = '08:00 12:00 13:00 17:30 Total 7:25';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
    expect(r.parteTotalizadores).toContain('Total');
  });

  it('Tot 7:25 casa', () => {
    const linha = '08:00 12:00 Tot 7:25';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Saldo Banco casa', () => {
    const linha = '08:00 12:00 13:00 17:30 Saldo Banco 0:54';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Saldo BCO casa', () => {
    const linha = '08:00 12:00 Saldo BCO 0:54';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Saldo Negativo casa', () => {
    const linha = '08:00 12:00 Saldo Negativo 0:54';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Saldo Positivo casa', () => {
    const linha = '08:00 12:00 Saldo Positivo 1:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Crédito casa', () => {
    const linha = '08:00 12:00 Crédito 0:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Débito casa', () => {
    const linha = '08:00 12:00 Débito 0:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Saída do Sistema casa', () => {
    const linha = '08:00 12:00 Saída do Sistema 17:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Abono casa', () => {
    const linha = '08:00 12:00 Abono 2:00';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('FOLGA DIAS TRABALHADOS casa', () => {
    const linha = '08:00 12:00 FOLGA DIAS TRABALHADOS 22';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('Armazena BCO casa', () => {
    const linha = '08:00 12:00 Armazena BCO HS 9:39';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });
});

describe('Estratégia 2: label-depois-backtrack', () => {
  it('"7:25 BCre 1:28 BDeb" — backtrack corta antes de 7:25', () => {
    const linha = '09:00 12:00 13:05 17:25 7:25 BCre 1:28 BDeb';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-depois-backtrack');
    expect(r.confianca).toBe('media');
    expect(r.parteBatidas).toBe('09:00 12:00 13:05 17:25 ');
    expect(r.parteTotalizadores).toBe('7:25 BCre 1:28 BDeb');
  });

  it('"17:25 5:30 HExt" — backtrack corta antes de 5:30', () => {
    const linha = '08:00 12:00 13:00 17:25 5:30 HExt';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-depois-backtrack');
    expect(r.confianca).toBe('media');
    expect(r.parteBatidas).toBe('08:00 12:00 13:00 17:25 ');
    expect(r.parteTotalizadores).toBe('5:30 HExt');
  });

  it('layout com label-antes (BCre antes do valor) NÃO ativa estratégia 2', () => {
    // BCre vem ANTES do valor — estratégia 1 deve vencer
    const linha = '09:00 12:00 13:05 17:25 BCre 7:25';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
    expect(r.confianca).toBe('alta');
  });

  it('refinamento: HH:MM totalizador grande (cronologia volta) aceita', () => {
    // Cenário: batida real 17:25, depois totalizador 12:30 BCre (banco acumulado)
    // 12:30 < 17:25 → cronologia indica volta no tempo → totalizador legítimo
    const linha = '01/03 SEG 08:00 12:00 13:00 17:25 12:30 BCre 5:00 BDeb';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-depois-backtrack');
    expect(r.confianca).toBe('media');
    expect(r.parteBatidas).toContain('17:25');
    expect(r.parteBatidas).not.toContain('12:30'); // 12:30 vai pra parteTotalizadores
  });

  it('refinamento: HH:MM batida real (cronologia preservada) rejeita', () => {
    // Cenário: 17:25 BCre — 17:25 É batida real, BCre é palavra de outro contexto
    // Cronologia: 17:25 > 13:00 (último anterior) → preservada → NÃO totalizador
    // Estratégia 2 rejeita, cai para estratégia 3
    const linha = '01/03 SEG 08:00 12:00 13:00 17:25 BCre';
    const r = cortarTotalizadores(linha);
    expect(r.origem).not.toBe('label-depois-backtrack');
    // Pode cair em estratégia 1 (BCre como label-antes) ou estratégia 3
    // O importante: 17:25 NÃO é cortado
    expect(r.parteBatidas).toContain('17:25');
  });

  it('refinamento: 1 dígito sempre aceita (totalizador pequeno padrão)', () => {
    // Cenário canônico do bug original: 1:28 BDeb
    const linha = '... 17:25 7:25 BCre 1:28 BDeb';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-depois-backtrack');
    // Usa word boundary para evitar match parcial (17:25 contém "7:25" como substring)
    expect(r.parteBatidas).not.toMatch(/\b7:25\b/);
    expect(r.parteBatidas).not.toMatch(/\b1:28\b/);
    expect(r.parteTotalizadores).toContain('7:25');
    expect(r.parteTotalizadores).toContain('1:28');
  });

  it('refinamento: HH:MM sem nada antes (sem cronologia) rejeita conservador', () => {
    // Cenário degenerado: linha começa com 12:30 BCre — não há cronologia anterior
    const linha = '12:30 BCre';
    const r = cortarTotalizadores(linha);
    // Sem cronologia: rejeita por design (falso-negativo > falso-positivo)
    // Provavelmente cai em estratégia 1 (BCre como label-antes) com confiança alta
    // mas o ponto: NÃO usa estratégia 2 sem cronologia válida
    expect(r.origem).not.toBe('label-depois-backtrack');
  });
});

describe('Estratégia 3: posicional', () => {
  it('caso do áudio sem label — 6 horários cronologicamente OK + H:MM', () => {
    // "09/11/2020 SEG 175 N 09:00 12:00 13:05 17:25 7:25 1:28"
    // Sem palavra-âncora; estratégia 3 detecta cronologia válida + H:MM
    const linha = '09/11/2020 SEG 175 N 09:00 12:00 13:05 17:25 7:25 1:28';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('posicao');
    expect(r.confianca).toBe('baixa');
    // parte cortada deve incluir 7:25 1:28 (5º horário em diante)
    expect(r.parteTotalizadores).toContain('7:25');
    expect(r.parteTotalizadores).toContain('1:28');
    expect(r.parteBatidas).toContain('17:25');
    expect(r.parteBatidas).not.toContain('7:25 1:28');
  });

  it('vigilante 12x36 — 6 horários cronológicos sem sinal NÃO dispara', () => {
    // 01/03 SEX 06:00 12:00 12:30 18:00 22:00 02:00
    // Primeiros 4 cronológicos (06:00 < 12:00 < 12:30 < 18:00).
    // 5º (22:00) > 4º (18:00) → cronologia continua válida.
    // Sem H:MM (1 dígito), sem 00:00 exato.
    // → NÃO deve disparar — provavelmente turno noturno legítimo.
    const linha = '01/03 SEX 06:00 12:00 12:30 18:00 22:00 02:00';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe(null);
    expect(r.confianca).toBe('alta');
    expect(r.parteBatidas).toBe(linha);
  });

  it('cronologia quebra no 5º horário (totalizador HH:MM) dispara', () => {
    // 08:00 12:00 13:00 17:30 12:00 — 5º (12:00) < 4º (17:30): cronologia quebra
    const linha = '08:00 12:00 13:00 17:30 12:00';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('posicao');
    expect(r.confianca).toBe('baixa');
  });

  it('8 horários com 00:00 nos totalizadores dispara (sinal 00:00)', () => {
    // 09:00 12:00 13:05 17:25 0:00 0:30 0:00 0:00
    // Primeiros 4 cronológicos. 5º (0:00) menor que 17:25 -> cronologia quebra também.
    // Aceitável: tanto sinal 00:00 quanto sinal cronologia disparam.
    const linha = '09:00 12:00 13:05 17:25 0:00 0:30 0:00 0:00';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('posicao');
  });

  it('linha com apenas 4 horários NÃO dispara (precisa ≥5)', () => {
    const linha = '08:00 12:00 13:00 17:30';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe(null);
    expect(r.confianca).toBe('alta');
    expect(r.parteBatidas).toBe(linha);
  });

  it('linha com 5+ horários mas primeiros 4 NÃO cronológicos NÃO dispara', () => {
    // Primeiros 4: 17:00 08:00 ... — não cronológicos
    const linha = '17:00 08:00 12:00 13:00 7:25 1:28';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe(null);
  });
});

describe('Cascata combinada', () => {
  it('linha sem totalizador retorna origem=null com batidas inteiras', () => {
    const linha = '09/11 SEG 09:00 12:00 13:05 17:25';
    const r = cortarTotalizadores(linha);
    expect(r).toEqual({
      parteBatidas: linha,
      parteTotalizadores: '',
      origem: null,
      confianca: 'alta',
    });
  });

  it('ordem da cascata: linha que casa estratégia 1 não ativa 2 nem 3', () => {
    // Tem "BCre" (label-antes) E poderia ativar posicional, mas 1 vence.
    const linha = '09:00 12:00 13:05 17:25 BCre 7:25 1:28';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-antes');
  });

  it('cascata: 1 falha + 2 dispara', () => {
    // Não tem label antes; tem padrão "valor label"
    const linha = '09:00 12:00 13:05 17:25 7:25 BCre';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('label-depois-backtrack');
  });

  it('cascata: 1+2 falham, 3 dispara (caso do áudio)', () => {
    const linha = '09:00 12:00 13:05 17:25 7:25 1:28';
    const r = cortarTotalizadores(linha);
    expect(r.origem).toBe('posicao');
  });
});
