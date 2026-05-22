/**
 * Sprint 3 (2026-05-22) — Marcadores semânticos expandidos no
 * mapperCartaoViaVarejo.
 *
 * COBERTURA
 * ---------
 * Adições da Sprint 3 ao RE_MARCADOR_COLUNA_DUPLA:
 *   - `ABONO AUTORIZADO` (CAPS)
 *   - `Treinamento`
 *   - `Problemas Relogio` (sem acento)
 *   - `AFAST` standalone
 *   - `Falta Injustificada`
 *
 * Cada teste injeta uma única linha-dia onde o marcador aparece no INÍCIO.
 *
 * COMPORTAMENTO ESPERADO (importante)
 * -----------------------------------
 * Quando marker casa, `extrairParesColunaDupla` retorna `marcacoes=[]`.
 * O processador de linha (cartao-ponto-via-varejo.ts:566) então faz `continue`
 * se tipoInfo=normal e marcacoes vazias — a apuração NÃO entra em
 * `apuracoes`. Antes da Sprint 3, esses dias geravam apuração com batidas
 * fictícias (escala vazando como batida). Confirmar ausência == confirmar fix.
 *
 * Exceção: AFAST standalone aciona o branch `diasDescartados.push({...
 * ocorrencia: 'AFASTAMENTO'})` antes do continue normal.
 *
 * Cobertura adicional:
 *   - Fix camada 2 com i=0 (batidas reais coincidem com escala teórica)
 *   - Tratamento FERIADO/DSR + totalizador (5 horas → 4 batidas)
 *   - Delegação SÓ-ESPELHO pro mapper Minha
 */
import { describe, expect, it } from "vitest";
import { mapperCartaoViaVarejo } from "../../../../../../supabase/functions/_shared/mappers/cartao-ponto-via-varejo";
import type { DocumentoTabular } from "../../../../../../supabase/functions/_shared/documento-tabular";

function docSintetico(texto: string): DocumentoTabular {
  return {
    textoCompleto: texto,
    numeroPaginas: 1,
    paginas: [],
    qualidade: { score: 0.95, razao: "sintético sprint 3" },
  } as unknown as DocumentoTabular;
}

// Header mínimo Via Varejo:
//   - CGC Via Varejo + razão social
//   - Cartão de Ponto + período moderno
//   - "Horário Registrado" + "Horário de Trabalho" ativam coluna-dupla
//   - NÃO inclui "Horários ..:" pra evitar que escalas listadas casem com
//     batidas do baseline e disparem a interpretação "Reg vazio + Escala"
//     (descobrimos durante o debug que esse caso ambíguo descarta o dia).
//   - Linha-baseline com batidas únicas (08:15 12:01 13:04 18:18 — não bate
//     com escalas comuns) garante apuracoes não vazio.
const HEADER_MIN = `
VIA VAREJO S/A
C.G.C. 33.041.260/0652-90
Cartão de Ponto
PERÍODO: 01/11/2020 A 30/11/2020 Competência: NOVEMBRO/2020
Empregado: 999999 JEFFERSON
Horário Registrado Horário de Trabalho
Dia 1. Período 2. Período Ocorrências
01/11/2020 DOM 162 N 08:15 12:01 13:04 18:18
`.trim();

// Header COM escalas listadas — usado SÓ pelo teste que valida o fix camada 2
// (batidas reais coincidem com escala teórica). Necessita escalas pra a
// camada 2 disparar.
const HEADER_COM_ESCALAS = `
VIA VAREJO S/A
C.G.C. 33.041.260/0652-90
Cartão de Ponto
PERÍODO: 01/11/2020 A 30/11/2020 Competência: NOVEMBRO/2020
Empregado: 999999 JEFFERSON
Horário Registrado Horário de Trabalho
Horários ..: 162 09:40 12:00 13:05 18:21 | 207 10:00 13:00 14:05 18:25
Dia 1. Período 2. Período Ocorrências
`.trim();

describe("Sprint 3 — marcadores semânticos expandidos no início da linha", () => {
  // Pra cada marker, espera-se que a apuração da data NÃO esteja em
  // apuracoes (linha pulada via continue) — antes do fix, gerava batida
  // fictícia com a escala vazada.

  it("ABONO AUTORIZADO no início → linha pulada (não vaza escala)", () => {
    const texto = `${HEADER_MIN}
12/11/2020 QUI 571 N ABONO AUTORIZADO 09:00 12:00 13:00 17:36 7:36`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-12");
    expect(ap, "linha 12/11 com marker ABONO AUTORIZADO deveria ser pulada").toBeUndefined();
  });

  it("Treinamento no início → linha pulada", () => {
    const texto = `${HEADER_MIN}
15/11/2020 DOM 207 N Treinamento 10:00 13:00 14:05 18:25 7:20`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-15");
    expect(ap).toBeUndefined();
  });

  it("Problemas Relogio (sem acento) no início → linha pulada", () => {
    const texto = `${HEADER_MIN}
20/11/2020 SEX 162 N Problemas Relogio 09:40 12:00 13:05 18:21 7:20`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-20");
    expect(ap).toBeUndefined();
  });

  it("Débito Banco de horas no início → linha pulada (regressão pré-Sprint-3)", () => {
    // Já funcionava antes — guard contra regressão.
    const texto = `${HEADER_MIN}
27/11/2020 SEX 597 N Débito Banco de horas 13:10 16:00 17:05 21:51 7:36`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-27");
    expect(ap).toBeUndefined();
  });
});

describe("Sprint 3 — markers AFAST entram em diasDescartados como AFASTAMENTO", () => {
  it("AFAST Férias Férias → diasDescartados com AFASTAMENTO", () => {
    const texto = `${HEADER_MIN}
22/11/2020 DOM 162 N AFAST Férias Férias`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-22");
    expect(ap).toBeUndefined();
    const desc = res!.dias_classificados_descartados?.find(
      (d) => d.data === "2020-11-22",
    );
    expect(desc).toBeDefined();
    expect(desc!.ocorrencia).toBe("AFASTAMENTO");
  });

  it("AFAST Atestado Médico Atestado Médico → diasDescartados com AFASTAMENTO", () => {
    const texto = `${HEADER_MIN}
24/11/2020 TER 162 N AFAST Atestado Médico Atestado Médico`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const desc = res!.dias_classificados_descartados?.find(
      (d) => d.data === "2020-11-24",
    );
    expect(desc).toBeDefined();
    expect(desc!.ocorrencia).toBe("AFASTAMENTO");
  });
});

describe("Sprint 3 — fix camada 2 (batidas reais coincidem com escala)", () => {
  it("8 horas onde primeiras 4 = escala teórica → mantém as 4 como batidas reais", () => {
    // Funcionário cumpriu jornada EXATA do dia 162 (09:40 12:00 13:05 18:21).
    // No layout coluna-dupla, o sistema repete escala depois das batidas.
    // Antes do fix, camada 2 retornava `[]` quando i=0.
    // Usa HEADER_COM_ESCALAS porque o teste precisa de escalas conhecidas
    // pra disparar a camada 2.
    const texto = `${HEADER_COM_ESCALAS}
30/11/2020 SEG 162 N 09:40 12:00 13:05 18:21 09:40 12:00 13:05 18:21`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-30");
    expect(ap).toBeDefined();
    expect(ap!.marcacoes).toEqual([
      { e: "09:40", s: "12:00" },
      { e: "13:05", s: "18:21" },
    ]);
  });
});

describe("Sprint 3 — defesas anti-falso-positivo (caveats da revisão)", () => {
  // Caveat 1: Treinamento/Problemas Relogio são markers só quando precedem
  // batidas. Se aparecem APÓS batidas (contexto histórico/observação),
  // não devem descartar as batidas reais.

  it("'Treinamento' APÓS as batidas → batidas mantidas (não é marker nesse contexto)", () => {
    // Cenário: linha com 4 batidas reais e a palavra "Treinamento" no fim
    // (ex: anotação "evento Treinamento agendado" ou ruído OCR colando
    // palavra do cabeçalho de outra seção).
    const texto = `${HEADER_MIN}
14/11/2020 SAB 162 N 08:15 12:01 13:04 18:18 Treinamento`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-14");
    expect(ap, "linha 14/11 com Treinamento APÓS batidas deve manter as 4 batidas").toBeDefined();
    expect(ap!.marcacoes).toEqual([
      { e: "08:15", s: "12:01" },
      { e: "13:04", s: "18:18" },
    ]);
  });

  // Caveat 3: totalizador FERIADO/DSR só dispara se vier APÓS a 4ª hora.
  // Defesa contra caso patológico: 5 batidas reais + "DSR Semanal" colado
  // no início por quirk OCR.

  it("5 batidas com 'DSR DSR' ANTES da 1ª hora → mantém 5 batidas (não descarta a 5ª)", () => {
    // Cenário sintético: o cabeçalho da linha tem ruído OCR "DSR DSR"
    // (concatenação de totalizador "DSR Semanal" da seção anterior).
    // Antes do aperto, esse "DSR DSR" disparava o cut e descartava a 5ª.
    const texto = `${HEADER_MIN}
16/11/2020 SEG 207 N DSR DSR 08:15 12:01 13:04 18:18 19:30`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-16");
    expect(ap).toBeDefined();
    // 5 horas → 2 pares completos + 1 par com saída vazia (mantém a 5ª)
    expect(ap!.marcacoes.length).toBe(3);
    expect(ap!.marcacoes[0]).toEqual({ e: "08:15", s: "12:01" });
    expect(ap!.marcacoes[1]).toEqual({ e: "13:04", s: "18:18" });
    expect(ap!.marcacoes[2].e).toBe("19:30"); // 5ª batida preservada
  });
});

describe("Sprint 3 — totalizador FERIADO/DSR após 4 batidas", () => {
  it("'FERIADO FERIADO HH:MM' após 4 batidas → 4 batidas (descarta totalizador 7:08)", () => {
    // Padrão PDF Jefferson antigo: "FERIADO FERIADO 7:08" no final é
    // totalizador de horas extras de feriado, NÃO batida.
    const texto = `${HEADER_MIN}
21/11/2020 SAB 207 N 10:34 14:27 15:32 18:47 FERIADO FERIADO 7:08`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-21");
    expect(ap).toBeDefined();
    expect(ap!.marcacoes).toEqual([
      { e: "10:34", s: "14:27" },
      { e: "15:32", s: "18:47" },
    ]);
  });

  it("'DSR DSR HH:MM' após 4 batidas → 4 batidas (descarta totalizador 7:36)", () => {
    const texto = `${HEADER_MIN}
26/11/2020 QUI 207 N 13:10 16:00 17:05 21:51 DSR DSR 7:36`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-26");
    expect(ap).toBeDefined();
    expect(ap!.marcacoes).toEqual([
      { e: "13:10", s: "16:00" },
      { e: "17:05", s: "21:51" },
    ]);
  });
});

describe("Sprint 3 — delegação SÓ-ESPELHO pro mapper Minha", () => {
  it("PDF SÓ ESPELHO DE PONTO (sem CARTÃO) → detector aplica=false + motivo 'delegado'", () => {
    const texto = `
GRUPO CASAS BAHIA S.A.
CNPJ: 33.041.260/0501-88
ESPELHO DE PONTO
Período 16/12/2022 a 15/01/2023
`.trim();
    const det = mapperCartaoViaVarejo.detectar(docSintetico(texto));
    expect(det.aplica).toBe(false);
    expect(det.motivos.join(" ")).toMatch(/delegado.*Minha/i);
  });

  it("PDF híbrido (CARTÃO + ESPELHO juntos) → detector aceita (processa parte CARTÃO)", () => {
    const texto = `${HEADER_MIN}
ESPELHO DE PONTO Página 12
05/11/2020 QUI 162 N 09:40 12:00 13:05 18:21`;
    const det = mapperCartaoViaVarejo.detectar(docSintetico(texto));
    expect(det.aplica).toBe(true);
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    const ap = res!.apuracoes.find((a) => a.data === "2020-11-05");
    expect(ap).toBeDefined();
    expect(ap!.marcacoes.length).toBeGreaterThan(0);
  });
});

describe("Sprint 3 — PARSER_VERSION bumpada", () => {
  it("parser_version reflete v7.3", () => {
    const texto = `${HEADER_MIN}
05/11/2020 QUI 162 N 09:40 12:00 13:05 18:21`;
    const res = mapperCartaoViaVarejo.mapear(docSintetico(texto));
    expect(res).not.toBeNull();
    expect(res!.parser_version).toMatch(/v7\.3/);
  });
});
