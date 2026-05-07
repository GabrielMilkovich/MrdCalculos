import { describe, expect, it } from "vitest";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";

/**
 * Regressões reportadas em produção sobre cartões de ponto Via Varejo /
 * Casas Bahia (layout antigo) com OCR Mistral SUJO (2011-2018):
 *
 *   1. Linha "Horários: 91 08:00 11:00..." (legenda de escalas) virava
 *      apuração inflada — parser pegava cada bloco de 4 horas como pares.
 *   2. "Admiro: 24/11/2003" / "Admirado: ..." (variantes do OCR para
 *      "Admissão") não casavam o filtro de metadado e a data de admissão
 *      virava apuração fantasma.
 *   3. Linhas de dia traziam 8 horas (4 registradas + 4 da escala) e o
 *      parser pegava as 8 como batidas — inflando jornada e duplicando
 *      pares E/S.
 *   4. "Movimentos: (Período de XX a YY)" no rodapé era parseado como
 *      apuração porque a data soltava `RE_DATA_BR`.
 *
 * Os 4 são padrões comuns em cartões corporativos antigos com coluna dupla
 * "Horário Registrado | Horário de Trabalho" — não é específico de uma
 * empresa só.
 */
describe("parseCartaoPonto — coluna dupla Registrado/Trabalho (Via Varejo OCR sujo)", () => {
  // Fixture mínimo representando os 4 problemas em ~30 linhas.
  const OCR_VIA_VAREJO_SUJO = `
VIA VAREJO SA 33.041.260/0652-90 Cartão Ponto Página 2
TRATINO: 14/02/2016 A 15/03/2016 Cooperência: MARCO/2016
VIA VAREJO SA Avenida Jacob Macarban 469 CNPJ 33.041.260/0778-92
Empregado: 274823 - ROQUE GUERREIRO TEIXEIRA
Cracha: 00278823 CTPS: 95914415559828 PIS: 1208155563-8
Admiro: 24/11/2003 C.R.: 2003-000 - b/c/k AQ
Horários: 91 08:00 11:00 12:00 13:25 1 162 09:00 12:00 13:05 17:25 1 207 16:00 13:35 16:35 18:25
238 11:00 13:00 14:00 13:25 1 494 11:00 13:35 14:35 15:25 1 823 11:00 13:35 13:15 16:45
Data Dia Horário Ref P Horário Registrado Horário de Trabalho Desc HExl AdNot HCIe HEmb Abono
16/02/2016 TER 162 N 10:20 13:55 14:20 19:15 09:00 12:00 13:05 17:25 0:25
17/02/2016 QUA 238 N 10:47 13:55 15:25 19:05 09:00 12:00 13:05 17:25 0:45
18/02/2016 QUI 162 N 10:08 13:51 15:20 19:02 09:00 12:00 13:05 17:25 0:38
19/02/2016 SEX 162 N 09:10 12:01 13:21 18:31 09:00 12:00 13:05 17:25 0:27
20/02/2016 SAB 162 N 09:24 12:55 13:52 18:15 09:00 12:00 13:05 17:25 0:11
Movimentos: (Período de 16/02/2016 a 15/03/2016)
2804 Intracorrida 0:53 2900 Adicional Sábado 25% 19:08 7338 HORAS EXTRAS 73% - INTERVALO 0:57
9000 Horas Normais 183:20 9009 Atraso Elevado 9:40
Estou de pleno acordo com o que demonstra os registros de horários acima
278823 - ROQUE GUERREIRO TEIXEIRA 420301 - ADENOR CASAGRANDE
Assinado eletronicamente por: TATIANE DE CICCO NASCIMBEM
`.trim();

  it("ignora linha 'Horários: 91 08:00...' (legenda de escalas) — não vira apuração", () => {
    const r = parseCartaoPonto(OCR_VIA_VAREJO_SUJO);
    // Nenhum dos códigos de escala (91, 162, 207, 238, 494, 823) deve
    // virar data de apuração. Apurações reais começam em 16/02/2016.
    for (const a of r.apuracoes) {
      // Datas começam em 16/02/2016, não em códigos de escala
      // mal-formados como `0091/0008/0011` ou similar.
      expect(a.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Não deve haver apuração com ano fora de 2016 (período do
      // documento). Em particular 2003 (admissão) deve estar fora.
      expect(a.data.startsWith("2003")).toBe(false);
    }
  });

  it("ignora 'Admiro: 24/11/2003' (admissão no header com OCR sujo)", () => {
    const r = parseCartaoPonto(OCR_VIA_VAREJO_SUJO);
    // Data de admissão (24/11/2003) NÃO deve aparecer como apuração.
    const apuracoesEm2003 = r.apuracoes.filter((a) =>
      a.data.startsWith("2003"),
    );
    expect(apuracoesEm2003).toEqual([]);
  });

  it("limita a 4 batidas por dia quando há coluna dupla 'Horário Registrado | Horário de Trabalho'", () => {
    const r = parseCartaoPonto(OCR_VIA_VAREJO_SUJO);
    // Cada apuração extraída deve ter no MÁXIMO 2 pares E/S (4 horas).
    // No OCR cada linha de dia traz 8 horas (4 reg + 4 escala); o parser
    // deve pegar SÓ as 4 primeiras (registradas).
    for (const a of r.apuracoes) {
      const horasReais = a.marcacoes.filter((m) => m.e || m.s);
      expect(horasReais.length).toBeLessThanOrEqual(2);
    }
    // Pelo menos algumas apurações devem ter 2 pares (E1/S1/E2/S2).
    const com2Pares = r.apuracoes.filter(
      (a) => a.marcacoes.filter((m) => m.e && m.s).length >= 2,
    );
    expect(com2Pares.length).toBeGreaterThan(0);
  });

  it("pega o registrado primeiro (10:20 13:55), não a escala (09:00 12:00)", () => {
    const r = parseCartaoPonto(OCR_VIA_VAREJO_SUJO);
    const dia16 = r.apuracoes.find((a) => a.data === "2016-02-16");
    expect(dia16).toBeDefined();
    if (!dia16) return;
    // 1° par = batida real (10:20 13:55), NÃO escala (09:00 12:00).
    const par1 = dia16.marcacoes[0];
    expect(par1.e).toBe("10:20");
    expect(par1.s).toBe("13:55");
  });

  it("ignora rodapé 'Movimentos: (Período de XX a YY)' — não vira apuração", () => {
    const r = parseCartaoPonto(OCR_VIA_VAREJO_SUJO);
    // Não deve haver apuração com data fora do range 16/02 a 20/02 do
    // fixture (5 dias). O rodapé "Período de 16/02/2016 a 15/03/2016"
    // não deveria criar apuração em 15/03.
    const datas = r.apuracoes.map((a) => a.data).sort();
    expect(datas[datas.length - 1] <= "2016-02-20").toBe(true);
  });
});
