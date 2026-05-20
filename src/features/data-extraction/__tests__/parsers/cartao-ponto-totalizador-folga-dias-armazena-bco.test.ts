/**
 * Cobertura de FOLGA DIAS TRABALHADOS + Armazena BCO HS inline.
 * Ambos são literais estritos no whitelist da estratégia 1 (label-antes).
 *
 * Diagnóstico em /tmp/auditoria-debito-bh.md.
 */
import { describe, expect, it } from 'vitest';
import { parseCartaoPonto } from '../../parsers/cartao-ponto';

describe('cartão totalizador FOLGA DIAS / Armazena BCO inline', () => {
  const ocr = `
ESPELHO DE PONTO
10/02/2024 SAB 08:00 12:00 13:00 17:30 FOLGA DIAS TRABALHADOS 22
11/02/2024 DOM Armazena BCO HS 9:39
12/02/2024 SEG 08:00 12:00 13:00 17:30 Armazena BCO HS 7:25
`.trim();

  const r = parseCartaoPonto(ocr);

  it('10/02 corta em FOLGA DIAS — preserva 2 pares', () => {
    const a = r.apuracoes.find((a) => a.data === '2024-02-10');
    expect(a!.marcacoes).toEqual([
      { e: '08:00', s: '12:00' },
      { e: '13:00', s: '17:30' },
    ]);
  });

  it('12/02 corta em Armazena BCO — preserva 2 pares', () => {
    const a = r.apuracoes.find((a) => a.data === '2024-02-12');
    expect(a!.marcacoes).toEqual([
      { e: '08:00', s: '12:00' },
      { e: '13:00', s: '17:30' },
    ]);
  });
});
