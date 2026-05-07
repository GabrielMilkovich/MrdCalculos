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

/**
 * Falhas REPORTADAS APÓS o primeiro fix (PR #60). Esses 4 cenários
 * cobrem os bugs residuais que sobreviviam à primeira leva de guards:
 *
 *   1. "Admiro:" em uma linha + data isolada na próxima (célula markdown
 *      partida) — RE_METADADO_LINHA é POR LINHA e escapava.
 *   2. Eventos/totalizadores ("3990 Adicional 17:49 7392 ARMANDRA 6:08")
 *      virando batidas porque o parser aceita qualquer HH:MM.
 *   3. Cronologia inválida (E2=22:09 > S2=05:53) passa silenciosa, sem
 *      flag pro operador revisar.
 *   4. Header "PERÍODO: DD/MM/YYYY A DD/MM/YYYY" com `:` não casava no
 *      filtro de metadado (bug do `\b` final em padrão que termina em `:`).
 */
describe("parseCartaoPonto — bugs residuais reportados em produção", () => {
  it("[bug 1] descarta data via range declarado mesmo quando 'Admiro:' fica em linha separada", () => {
    // Cenário V4: célula markdown quebrada — "Admiro:" sozinho, data na seguinte.
    // Mesmo que RE_METADADO_LINHA não case por linha, a data 24/11/2003 está
    // FORA do PERÍODO declarado (11/01/2016 a 15/02/2016) → descartada.
    const ocr = `
PERÍODO: 11/01/2016 A 15/02/2016 Competência: FECHABIRO/2016
Admiro:
24/11/2003 C.B.: 0003-000 91 08:00 11:00 12:00 14:25
16/02/2016 TER 162 N 10:20 13:55 14:30 19:08 09:00 12:00 13:05 17:25
`.trim();
    const r = parseCartaoPonto(ocr);
    const apuracoes2003 = r.apuracoes.filter((a) => a.data.startsWith("2003"));
    expect(apuracoes2003).toEqual([]);
    // E o dia legítimo (16/02) deve ter sobrevivido.
    expect(r.apuracoes.find((a) => a.data === "2016-02-16")).toBeDefined();
  });

  it("[bug 2] linhas dentro de bloco 'Movimentos:' não viram apuração", () => {
    const ocr = `
PERÍODO: 14/05/2014 A 15/06/2014
14/05/2014 SEG 162 N 09:30 12:00 13:00 17:25
Movimentos: (Período de 14/05/2014 a 15/06/2014)
3868 Intocicidade 0:50
3960 Adicional Sabado 250 17:49
7038 HORAS EXTRAS 794 - INTERVALO 0:34
9000 Horas Normais 100:40
`.trim();
    const r = parseCartaoPonto(ocr);
    // Apenas o dia 14/05 deve aparecer. Os horários dos eventos
    // (0:50, 17:49, 0:34, 100:40) NÃO podem virar batidas.
    expect(r.apuracoes).toHaveLength(1);
    expect(r.apuracoes[0].data).toBe("2014-05-14");
    // Batidas do dia válido = 2 pares (jornada normal).
    const batidasReais = r.apuracoes[0].marcacoes.filter((m) => m.e || m.s);
    expect(batidasReais).toHaveLength(2);
  });

  it("[bug 3] flag REVISAR_OCR quando cronologia E1<S1<E2<S2 não fecha", () => {
    const ocr = `
PERÍODO: 14/05/2014 A 15/06/2014
14/05/2014 SEG 162 N 05:56 05:57 22:09 05:53
`.trim();
    const r = parseCartaoPonto(ocr);
    expect(r.apuracoes).toHaveLength(1);
    // S2=05:53 vem ANTES de E2=22:09 — inversão cronológica.
    expect(r.apuracoes[0].observacao).toMatch(/REVISAR_OCR/);
    expect(r.apuracoes[0].observacao).toMatch(/cronologia/i);
  });

  it("[bug 3b] cronologia válida (mesmo turno noturno crescente) NÃO flag REVISAR", () => {
    const ocr = `
PERÍODO: 14/05/2014 A 15/06/2014
14/05/2014 SEG 162 N 09:00 12:00 13:00 17:25
15/05/2014 TER 162 N 14:30 18:00 19:00 22:00
`.trim();
    const r = parseCartaoPonto(ocr);
    expect(r.apuracoes).toHaveLength(2);
    expect(r.apuracoes[0].observacao).toBeNull();
    expect(r.apuracoes[1].observacao).toBeNull();
  });

  it("[bug 4] 'PERÍODO: DD/MM/YYYY A DD/MM/YYYY' bloqueia datas fora do range", () => {
    const ocr = `
PERÍODO: 16/02/2016 A 15/03/2016
24/11/2003 algo 08:00 11:00 12:00 14:25
16/02/2016 TER 162 N 10:20 13:55 14:30 19:08
`.trim();
    const r = parseCartaoPonto(ocr);
    // Data 2003 deve estar fora do range declarado.
    expect(r.apuracoes.find((a) => a.data.startsWith("2003"))).toBeUndefined();
    expect(r.apuracoes.find((a) => a.data === "2016-02-16")).toBeDefined();
    // Warning explícito sobre descarte.
    expect(r.warnings.some((w) => /fora do.*per[íi]odo/i.test(w))).toBe(true);
  });

  it("[bug 4b] documento SEM range declarado mantém comportamento permissivo", () => {
    // Sem PERÍODO/Competência, parser não pode validar — preserva tudo.
    const ocr = `
14/05/2014 SEG 162 N 09:00 12:00 13:00 17:25
24/11/2003 algo 08:00 11:00 12:00 14:25
`.trim();
    const r = parseCartaoPonto(ocr);
    // Ambas datas passam (não há range pra filtrar).
    expect(r.apuracoes.length).toBeGreaterThanOrEqual(1);
  });
});
