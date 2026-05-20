/**
 * Coluna dupla detectada por CONTAGEM, sem palavra-chave no header.
 *
 * Cenário: cartão impresso onde o header da tabela foi cortado/perdido
 * pelo OCR, mas o padrão estrutural "8 horários por linha de dia" é
 * estatisticamente claro.
 *
 * Salvaguardas obrigatórias para esse caminho:
 *   a) ≥7 linhas com data (amostra mínima)
 *   b) sem keywords de turno/noturno
 *   c) sem horários noturnos em ≥30% das linhas
 *   d) fração de linhas com 8 horários ≥ 0.5
 *
 * Diagnóstico em /tmp/auditoria-coluna-dupla.md (Caso C).
 */
import { describe, expect, it } from 'vitest';
import { parseCartaoPonto } from '../../parsers/cartao-ponto';

describe('cartão coluna dupla SEM header (detecção por contagem)', () => {
  const ocr = `
Empregado: FULANO  CPF: 000.000.000-00
12/05/2024 DOM 08:00 12:00 13:00 17:00 08:00 12:00 13:00 17:00
13/05/2024 SEG 09:00 12:00 13:00 18:00 08:00 12:00 13:00 17:00
14/05/2024 TER 08:55 12:00 13:00 17:30 08:00 12:00 13:00 17:00
15/05/2024 QUA 08:50 12:00 13:00 17:25 08:00 12:00 13:00 17:00
16/05/2024 QUI 09:05 12:00 13:00 17:00 08:00 12:00 13:00 17:00
17/05/2024 SEX 08:45 12:00 13:00 17:10 08:00 12:00 13:00 17:00
18/05/2024 SAB 08:00 12:00 13:00 17:00 08:00 12:00 13:00 17:00
19/05/2024 DOM 08:30 12:00 13:00 17:20 08:00 12:00 13:00 17:00
`.trim();

  const r = parseCartaoPonto(ocr);

  it('extrai apuração para 13/05/2024', () => {
    const a = r.apuracoes.find((a) => a.data === '2024-05-13');
    expect(a).toBeDefined();
  });

  it('13/05/2024 tem EXATAMENTE 2 pares (não 4 misturados com escala)', () => {
    const a = r.apuracoes.find((a) => a.data === '2024-05-13');
    expect(a?.marcacoes).toEqual([
      { e: '09:00', s: '12:00' },
      { e: '13:00', s: '18:00' },
    ]);
  });

  it('14/05/2024 preserva saída real 17:30 e descarta escala 17:00', () => {
    const a = r.apuracoes.find((a) => a.data === '2024-05-14');
    expect(a?.marcacoes).toEqual([
      { e: '08:55', s: '12:00' },
      { e: '13:00', s: '17:30' },
    ]);
  });

  it('nenhuma apuração contém mais de 2 pares', () => {
    for (const a of r.apuracoes) {
      expect(a.marcacoes.length).toBeLessThanOrEqual(2);
    }
  });
});
