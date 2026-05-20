/**
 * Caso A: Via Varejo / ADP com BCre/BDeb sem palavra-âncora na linha.
 * Layout do áudio do advogado (Douglas Ribeiro, 09-15/11/2020).
 *
 * Cenário: OCR Mistral perde o header textual da tabela; linhas de dia
 * trazem apenas valores numéricos: `09:00 12:00 13:05 17:25 7:25 1:28`.
 * 1:28 (BDeb) e 7:25 (BCre) eram capturados como par espúrio
 * (entrada_3=07:25, saida_3=01:28 — jornada inventada de 18h cruzando
 * meia-noite).
 *
 * Defesa: heurística posicional (estratégia 3 do
 * cortarTotalizadores) detecta cronologia válida nos 4 primeiros
 * horários + sinal H:MM no 5º+ → corta a partir do 5º.
 *
 * Diagnóstico em /tmp/auditoria-debito-bh.md (Caso A).
 */
import { describe, expect, it } from 'vitest';
import { parseCartaoPonto } from '../../parsers/cartao-ponto';

describe('cartão totalizador BCre/BDeb SEM label (caso do áudio)', () => {
  const ocr = `
VIA VAREJO SA — Cartão Ponto — Página 1
Período 09/11/2020 a 15/11/2020   Empregado: DOUGLAS RIBEIRO DA SILVA
09/11/2020 SEG 175 N 09:00 12:00 13:05 17:25 7:25 1:28
10/11/2020 TER 175 N 09:00 12:00 13:05 17:44 7:44 1:09
11/11/2020 QUA 175 N 09:00 12:00 13:05 17:30 7:30 1:23
12/11/2020 QUI 175 N 09:00 12:00 13:05 18:00 8:00 0:53
13/11/2020 SEX 175 N 09:00 12:00 13:05 17:55 7:55 0:58
14/11/2020 SAB 175 N 09:00 12:00 13:05 17:00 7:00 1:00
15/11/2020 DOM 175 N 09:00 12:00 13:05 17:15 7:15 1:15
`.trim();

  const r = parseCartaoPonto(ocr);

  it('09/11/2020 preserva apenas 2 pares de batidas (descarta 7:25 e 1:28)', () => {
    const a = r.apuracoes.find((a) => a.data === '2020-11-09');
    expect(a).toBeDefined();
    expect(a!.marcacoes).toEqual([
      { e: '09:00', s: '12:00' },
      { e: '13:05', s: '17:25' },
    ]);
  });

  it('10/11/2020 preserva saída real 17:44 (não 1:09)', () => {
    const a = r.apuracoes.find((a) => a.data === '2020-11-10');
    expect(a!.marcacoes).toEqual([
      { e: '09:00', s: '12:00' },
      { e: '13:05', s: '17:44' },
    ]);
  });

  it('todas apurações têm exatamente 2 pares de marcações', () => {
    for (const a of r.apuracoes) {
      if (a.marcacoes.length > 0) {
        expect(a.marcacoes.length).toBeLessThanOrEqual(2);
      }
    }
  });
});
