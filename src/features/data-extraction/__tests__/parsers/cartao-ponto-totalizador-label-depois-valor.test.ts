/**
 * Caso H3 da auditoria: label depois do valor (backtrack).
 * Layouts Senior/Totvs onde o padrão é `valor LABEL valor LABEL`:
 *   `... 17:30 7:30 BCre 0:54 BDeb`
 *
 * Sem backtrack, estratégia 1 cortaria em BCre deixando 7:30 como
 * batida fantasma. Estratégia 2 detecta `7:30 BCre` e corta antes
 * do valor (inclusive).
 *
 * Diagnóstico em /tmp/auditoria-debito-bh.md.
 */
import { describe, expect, it } from 'vitest';
import { parseCartaoPonto } from '../../parsers/cartao-ponto';

describe('cartão totalizador com label DEPOIS do valor (backtrack H3)', () => {
  const ocr = `
ESPELHO DE PONTO — Empresa XYZ
05/04/2024 SEX 08:00 12:00 13:00 17:30 7:30 BCre 0:54 BDeb
06/04/2024 SAB 08:00 12:00 13:00 17:00 7:00 BCre 0:00 BDeb
`.trim();

  const r = parseCartaoPonto(ocr);

  it('05/04 backtrack: descarta 7:30 (antes de BCre) e 0:54 (antes de BDeb)', () => {
    const a = r.apuracoes.find((a) => a.data === '2024-04-05');
    expect(a!.marcacoes).toEqual([
      { e: '08:00', s: '12:00' },
      { e: '13:00', s: '17:30' },
    ]);
  });
});
