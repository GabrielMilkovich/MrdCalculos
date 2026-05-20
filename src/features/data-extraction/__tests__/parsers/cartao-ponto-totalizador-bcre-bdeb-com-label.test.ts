/**
 * Variante: BCre/BDeb COM label antes do valor.
 * Layout corporativo Casa Bahia/Senior padrão onde label precede o valor.
 *
 * Defesa: estratégia 1 (label-antes) corta na palavra-âncora BCre/BDeb.
 *
 * Diagnóstico em /tmp/auditoria-debito-bh.md.
 */
import { describe, expect, it } from 'vitest';
import { parseCartaoPonto } from '../../parsers/cartao-ponto';

describe('cartão totalizador BCre/BDeb COM label (label antes do valor)', () => {
  const ocr = `
ESPELHO DE PONTO — Empresa ABC
01/03/2024 SEG 08:00 12:00 13:00 17:30 BCre 7:30 BDeb 0:00
02/03/2024 TER 08:00 12:00 13:00 17:00 BCre 7:00 BDeb 0:30
`.trim();

  const r = parseCartaoPonto(ocr);

  it('01/03 preserva 2 pares, descarta valores após BCre', () => {
    const a = r.apuracoes.find((a) => a.data === '2024-03-01');
    expect(a!.marcacoes).toEqual([
      { e: '08:00', s: '12:00' },
      { e: '13:00', s: '17:30' },
    ]);
  });
});
