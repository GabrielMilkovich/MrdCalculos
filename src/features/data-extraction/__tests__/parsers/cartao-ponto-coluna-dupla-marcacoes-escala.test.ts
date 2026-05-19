/**
 * STATUS: PRESSUPOSTO.
 * Layout Senior "Marcações | Escala" é HIPÓTESE baseada em padrão
 * corporativo público, NÃO em fixture real do acervo MRD.
 *
 * Quando aparecer cartão Senior real no acervo:
 * 1. Comparar header textual contra esta fixture
 * 2. Ajustar tokens em detectarColunaDuplaPorHeader se necessário
 * 3. Remover marcação [PRESSUPOSTO] do describe
 *
 * Diagnóstico do bug em /tmp/auditoria-coluna-dupla.md (Caso B).
 */
import { describe, expect, it } from 'vitest';
import { parseCartaoPonto } from '../../parsers/cartao-ponto';

describe('[PRESSUPOSTO - validar com fixture Senior real] cartão coluna dupla Marcações/Escala', () => {
  const ocr = `
EMPRESA XYZ SA — Espelho de Ponto Senior
Empregado: FULANO DE TAL    Competência: 11/2020
Data Dia Marcações Escala HT HE
09/11/2020 SEG 08:00 12:00 13:00 17:30 08:00 12:00 13:00 17:00
10/11/2020 TER 08:05 12:00 13:00 17:00 08:00 12:00 13:00 17:00
11/11/2020 QUA 08:10 12:00 13:00 17:15 08:00 12:00 13:00 17:00
12/11/2020 QUI 08:00 12:00 13:00 17:00 08:00 12:00 13:00 17:00
13/11/2020 SEX 07:55 12:00 13:00 17:00 08:00 12:00 13:00 17:00
`.trim();

  const r = parseCartaoPonto(ocr);

  it('extrai apuração para 09/11/2020', () => {
    const a = r.apuracoes.find((a) => a.data === '2020-11-09');
    expect(a).toBeDefined();
  });

  it('09/11/2020 tem EXATAMENTE 2 pares de marcações (escala descartada)', () => {
    const a = r.apuracoes.find((a) => a.data === '2020-11-09');
    expect(a?.marcacoes).toEqual([
      { e: '08:00', s: '12:00' },
      { e: '13:00', s: '17:30' },
    ]);
  });

  it('10/11/2020 preserva saída real 17:00 (não vaza escala)', () => {
    const a = r.apuracoes.find((a) => a.data === '2020-11-10');
    expect(a?.marcacoes).toEqual([
      { e: '08:05', s: '12:00' },
      { e: '13:00', s: '17:00' },
    ]);
  });

  it('nenhuma apuração contém mais de 2 pares de marcações', () => {
    for (const a of r.apuracoes) {
      expect(a.marcacoes.length).toBeLessThanOrEqual(2);
    }
  });
});
