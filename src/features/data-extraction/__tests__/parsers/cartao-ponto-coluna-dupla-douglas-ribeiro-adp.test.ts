/**
 * Caso A do diagnóstico: layout Via Varejo SA / ADP 2020.
 *
 * Header `Período DD/MM/YYYY a DD/MM/YYYY` (com `/`, lowercase `a`)
 * NÃO casa o regex do parser via-varejo-v1 (que exige `\.` + `A`
 * maiúsculo). Por isso cai no parser genérico, onde o detector de
 * coluna dupla deve disparar via header textual "Horário Registrado".
 *
 * Empregado fictício: Douglas Ribeiro da Silva, 09-15/11/2020.
 * Em campo, saídas reais variam (17:25, 17:44, 18:55) enquanto a
 * escala prevista é constante 18:53 — o parser deve preservar as
 * reais e descartar 18:53.
 *
 * Diagnóstico em /tmp/auditoria-coluna-dupla.md (Caso A).
 */
import { describe, expect, it } from 'vitest';
import { parseCartaoPonto } from '../../parsers/cartao-ponto';

describe('cartão coluna dupla Douglas Ribeiro ADP/Via Varejo 2020', () => {
  const ocr = `
VIA VAREJO SA — Cartão Ponto — Página 1
Período 09/11/2020 a 15/11/2020   Empregado: DOUGLAS RIBEIRO DA SILVA
Data Dia Hor.RefP Horário Registrado Horário de Trabalho Desc
09/11/2020 SEG 175 N 09:00 12:00 13:05 17:25 09:00 12:00 13:05 18:53
10/11/2020 TER 175 N 09:00 12:00 13:05 17:44 09:00 12:00 13:05 18:53
11/11/2020 QUA 175 N 09:00 12:00 13:05 18:55 09:00 12:00 13:05 18:53
12/11/2020 QUI 175 N 09:00 12:00 13:05 17:30 09:00 12:00 13:05 18:53
13/11/2020 SEX 175 N 09:00 12:00 13:05 17:00 09:00 12:00 13:05 18:53
`.trim();

  const r = parseCartaoPonto(ocr);

  it('extrai apuração para 09/11/2020', () => {
    const a = r.apuracoes.find((a) => a.data === '2020-11-09');
    expect(a).toBeDefined();
  });

  it('09/11/2020 preserva saída real 17:25, descarta escala 18:53', () => {
    const a = r.apuracoes.find((a) => a.data === '2020-11-09');
    expect(a?.marcacoes).toEqual([
      { e: '09:00', s: '12:00' },
      { e: '13:05', s: '17:25' },
    ]);
  });

  it('10/11/2020 preserva saída real 17:44, descarta escala 18:53', () => {
    const a = r.apuracoes.find((a) => a.data === '2020-11-10');
    expect(a?.marcacoes).toEqual([
      { e: '09:00', s: '12:00' },
      { e: '13:05', s: '17:44' },
    ]);
  });

  it('11/11/2020 preserva saída real 18:55, descarta escala 18:53', () => {
    const a = r.apuracoes.find((a) => a.data === '2020-11-11');
    expect(a?.marcacoes).toEqual([
      { e: '09:00', s: '12:00' },
      { e: '13:05', s: '18:55' },
    ]);
  });

  it('nenhuma apuração contém mais de 2 pares', () => {
    for (const a of r.apuracoes) {
      expect(a.marcacoes.length).toBeLessThanOrEqual(2);
    }
  });
});
