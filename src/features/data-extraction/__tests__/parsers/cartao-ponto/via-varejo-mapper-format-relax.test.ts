/**
 * Fase 0.5 — Relaxação de formato de período no mapperCartaoViaVarejo (edge).
 *
 * CONTEXTO
 * --------
 * Diagnóstico de 2026-05-20 (sessão Roque/v7) revelou que o PDF text-native
 * de Via Varejo / Casa Bahia pós-2018 usa formato moderno de período no
 * cabeçalho ("PERÍODO: 11/01/2016 A 15/02/2016", com barras + ":") em vez
 * do formato antigo Via Varejo 2011-2016 ("Período 11.01.2016 A 15.02.2016",
 * com pontos). O mapper edge `cartao-ponto-via-varejo.ts` rejeitava o
 * formato moderno via regex estrito, causando V6 → `mapper_returned_null`
 * → fallback para Mistral OCR + parser v5 OCR-based (que entrega CSV ruim).
 *
 * RELAXAÇÃO APLICADA
 * ------------------
 *   RE_PERIODO antigo: /Per[íi]odo\s+(\d{2})\.(\d{2})\.(\d{4})\s+A\s+...
 *   RE_PERIODO novo:   /Per[íi]odo\s*:?\s+(\d{2})[./](\d{2})[./](\d{4})\s+[Aa]\s+...
 *
 * VETO ANTI-REGRESSÃO
 * -------------------
 * O relaxamento sozinho faria documentos Casas Bahia pós-2018 (que usam
 * "Espelho de Ponto" em vez de "Cartão de Ponto") caírem incorretamente
 * neste mapper. Veto adicionado em `detectar()`: se texto tem "ESPELHO DE
 * PONTO" sem "CARTÃO DE PONTO", retorna aplica=false. Rosicleia 2022-2024
 * é o caso de regressão coberto.
 *
 * O QUE ESTE TESTE COBRE
 * ----------------------
 *  1. Roque-like (slashes + Via Varejo + Cartão de Ponto)        → aplica=true (FIX)
 *  2. Joseli-like (dots + Nova Casa Bahia + Cartão de Ponto)     → aplica=true (REGRESSION GUARD)
 *  3. Rosicleia-like (slashes + Casas Bahia + Espelho de Ponto)  → aplica=false (VETO)
 *  4. Híbrido (Cartão+Espelho juntos)                            → aplica=true (veto exige espelho SEM cartão)
 *  5. quebrarEmBlocos extrai período corretamente com slashes    → blocos.length > 0
 *
 * O QUE ESTE TESTE NÃO COBRE
 * --------------------------
 *  - Pipeline end-to-end (extrator geométrico → mapper → CSV). Esse só
 *    valida no Gate 6 com o PDF real do Roque.
 */
import { describe, expect, it } from "vitest";
import { mapperCartaoViaVarejo } from "../../../../../../supabase/functions/_shared/mappers/cartao-ponto-via-varejo";
import type { DocumentoTabular } from "../../../../../../supabase/functions/_shared/documento-tabular";

function docSintetico(texto: string): DocumentoTabular {
  return {
    textoCompleto: texto,
    numeroPaginas: 1,
    paginas: [],
    qualidade: { score: 0.95, razao: "sintético para teste" },
  } as unknown as DocumentoTabular;
}

// ============================================================
// Strings sintéticas refletindo cabeçalhos REAIS observados em produção
// ============================================================

const TEXTO_ROQUE = `
VIA VAREJO SA 33.041.260/0652-90 Cartão Ponto Página 1
PERÍODO: 11/01/2016 A 15/02/2016 Competência: FEVEREIRO/2016
VIA VAREJO S/A
Avenida Jacob Macanhan 449
Empregado: 278823 ROQUE GUERREIRO TEIXEIRA
Dia 1. Período 2. Período Ocorrências
11 SEG 08:00 12:00 13:00 17:30
12 TER 08:00 12:00 13:00 17:30
`.trim();

const TEXTO_JOSELI = `
NOVA CASA BAHIA S/A
C.G.C. 10.757.237/0556-62
JOSELI SILVA WANDERLEY Matrícula 01788485
CARTÃO DE PONTO
Período 21.06.2011 A 20.07.2011
21 TER 13:45 17:02 18:10 22:05
22 QUA 13:46 17:12 18:21 22:12
`.trim();

const TEXTO_ROSICLEIA = `
GRUPO CASAS BAHIA S.A.
CNPJ: 33.041.260/0501-88
ROSICLEIA PEREIRA CHAVES
ESPELHO DE PONTO
Período 16/12/2022 a 15/01/2023 - Data de emissão 13/08/2024
16 SEX 08:00 12:00 13:00 17:30
17 SAB FOLGA
`.trim();

// PDF do Roque extraído via pdfjs (V6.2) preserva o texto EXATAMENTE como
// renderizado, inclusive um ponto literal antes do ":" no header de período
// ("PERÍODO .:") e o header de tabela como "Cartão Ponto" sem o "de".
// Diagnóstico de 2026-05-20 (sessão fase 6 v7) — antes do fix, o detector
// casava só 2 sinais (Via Varejo + CGC) e ficava abaixo do limiar `>=3`,
// caindo pro mapper genérico. Este caso garante que a regressão não volte.
const TEXTO_ROQUE_PDFJS_REAL = `
25/06/2021 Programa de detalhe Fls.: 1
VIA VAREJO SA Cartão Ponto Página
33.041.260/0652-90 1
PERÍODO .: 11/01/2016 A 15/02/2016 Competência: FEVEREIRO/2016
Empregado: 278823 ROQUE GUERREIRO TEIXEIRA
Dia 1. Período 2. Período Ocorrências
11 SEG 08:00 12:00 13:00 17:30
12 TER 08:00 12:00 13:00 17:30
`.trim();

const TEXTO_HIBRIDO = `
VIA VAREJO S/A
CARTÃO DE PONTO
ESPELHO DE PONTO (formulário interno alternativo)
Período 11/01/2016 A 15/02/2016
11 SEG 08:00 12:00
`.trim();

// ============================================================
// Testes
// ============================================================

describe("mapperCartaoViaVarejo.detectar() — relaxação de formato de período", () => {
  it("Roque (slashes + Via Varejo + Cartão de Ponto) → aplica=true [FIX 2026-05-20]", () => {
    const det = mapperCartaoViaVarejo.detectar(docSintetico(TEXTO_ROQUE));
    expect(det.aplica, `motivos: ${det.motivos.join(" | ")}`).toBe(true);
    // Motivos esperados: pelo menos formato Período + CGC Via Varejo + "Via Varejo" razão social + Cartão.
    expect(det.motivos.join(" ")).toMatch(/formato Período/i);
  });

  it("Joseli (dots + Nova Casa Bahia + Cartão de Ponto) → aplica=true [REGRESSION GUARD]", () => {
    const det = mapperCartaoViaVarejo.detectar(docSintetico(TEXTO_JOSELI));
    expect(det.aplica, `motivos: ${det.motivos.join(" | ")}`).toBe(true);
    expect(det.motivos.join(" ")).toMatch(/razão social Nova Casa Bahia/i);
    expect(det.motivos.join(" ")).toMatch(/formato Período/i);
  });

  it("Rosicleia (slashes + Casas Bahia + ESPELHO DE PONTO) → aplica=false [VETO]", () => {
    const det = mapperCartaoViaVarejo.detectar(docSintetico(TEXTO_ROSICLEIA));
    expect(det.aplica, `motivos: ${det.motivos.join(" | ")}`).toBe(false);
    expect(det.motivos.join(" ")).toMatch(/ESPELHO DE PONTO.*Casas Bahia/i);
  });

  it("Híbrido (Cartão E Espelho presentes) → aplica=true (veto só dispara se Espelho sem Cartão)", () => {
    const det = mapperCartaoViaVarejo.detectar(docSintetico(TEXTO_HIBRIDO));
    expect(det.aplica, `motivos: ${det.motivos.join(" | ")}`).toBe(true);
  });

  it("Roque PDF real ('PERÍODO .:' + 'Cartão Ponto' sem 'de') → aplica=true [FIX 2026-05-20]", () => {
    // Reproduz o cenário exato que o diag end-to-end V6 capturou contra o
    // PDF do Roque. Antes do fix: acertos=2 (Via Varejo + CGC), aplica=false.
    // Pós-fix: RE_PERIODO aceita "Período .:" e título aceita "Cartão Ponto"
    // sem "de" → acertos>=4, aplica=true.
    const det = mapperCartaoViaVarejo.detectar(docSintetico(TEXTO_ROQUE_PDFJS_REAL));
    expect(det.aplica, `motivos: ${det.motivos.join(" | ")}`).toBe(true);
    expect(det.motivos.join(" ")).toMatch(/formato Período/i);
    expect(det.motivos.join(" ")).toMatch(/Cartão de Ponto/i);
  });
});

describe("mapperCartaoViaVarejo.mapear() — quebra de blocos com novo formato", () => {
  it("Roque (slashes) — quebrarEmBlocos via mapear() detecta período corretamente", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_ROQUE));
    expect(resultado, "mapear retornou null — RE_PERIODO_GLOBAL não casou com slashes").not.toBeNull();
    expect(resultado!.apuracoes.length).toBeGreaterThanOrEqual(2); // 11/01 e 12/01
    // Data tem que ser 2016-01-11 (yyyy-mm-dd reconstruída do período, não do separator original).
    expect(resultado!.apuracoes[0].data).toBe("2016-01-11");
  });

  it("Joseli (dots) — regression guard, formato antigo continua produzindo apurações", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_JOSELI));
    expect(resultado).not.toBeNull();
    expect(resultado!.apuracoes.length).toBeGreaterThanOrEqual(2); // 21/06 e 22/06
    expect(resultado!.apuracoes[0].data).toBe("2011-06-21");
  });
});

// =============================================================================
// Fase 6 v7 (2026-05-20) — RE_LINHA_DIA aceita formato pdfjs DD/MM/YYYY DIA-SEMANA
// =============================================================================

// Linhas no formato exato que o pdfjs extrai do PDF do Roque. Cada linha começa
// com "DD/MM/YYYY DIA-SEMANA NNN N [horários reais] [observação] [horários previstos]".
// Header "Horário Registrado Horário de Trabalho" → detectarColunaDupla = true →
// processarBloco pega apenas os 2 primeiros pares (horários reais).
const TEXTO_ROQUE_PDFJS_LINHAS_DIA = `
VIA VAREJO SA Cartão Ponto Página 1
33.041.260/0652-90
PERÍODO .: 16/02/2016 A 15/03/2016 Competência: MARÇO/2016
Empregado: 278823 ROQUE GUERREIRO TEIXEIRA
Data Dia Horário Ref P Horário Registrado Horário de Trabalho Desc HExt AdNot
16/02/2016 TER 162 N 10:26 13:00 14:26 19:15 09:00 12:00 13:05 17:25
17/02/2016 QUA 238 N 10:47 13:56 15:29 19:05 Débito Banco de horas 11:00 15:00 16:00 19:20 0:35
20/02/2016 SAB 162 N 09:13 12:01 13:21 18:31 09:00 12:00 13:05 17:25 0:38
21/02/2016 DOM 999 N DSR DSR
9000 Horas Normais 183:20 9009 Atraso Abonado 0:45
Assinado eletronicamente por: FULANO - 30/11/2021 16:15:52
`.trim();

describe("RE_LINHA_DIA — formato pdfjs DD/MM/YYYY DIA-SEMANA [FIX Fase 6 v7]", () => {
  it("linha pdfjs '16/02/2016 TER 162 N 10:26 13:00 14:26 19:15 ...' → dia=16, ocorrência=NORMAL", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_ROQUE_PDFJS_LINHAS_DIA));
    expect(resultado).not.toBeNull();
    const ap16 = resultado!.apuracoes.find((a) => a.data === "2016-02-16");
    expect(ap16, "Apuração 2016-02-16 (linha pdfjs) deveria existir").toBeDefined();
    expect(ap16!.ocorrencia).toBe("NORMAL");
    expect(ap16!.dia_semana).toBe("TER");
    // 2 pares = 4 horas reais (10:26→13:00, 14:26→19:15). Horas previstas
    // (09:00 12:00 13:05 17:25) descartadas via detectarColunaDupla.
    expect(ap16!.marcacoes).toHaveLength(2);
    expect(ap16!.marcacoes[0]).toEqual({ e: "10:26", s: "13:00" });
    expect(ap16!.marcacoes[1]).toEqual({ e: "14:26", s: "19:15" });
  });

  it("linha pdfjs com observação no meio ('Débito Banco de horas') → 2 pares reais [item #2 da auditoria]", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_ROQUE_PDFJS_LINHAS_DIA));
    const ap17 = resultado!.apuracoes.find((a) => a.data === "2016-02-17");
    expect(ap17, "Apuração 2016-02-17 (linha com observação) deveria existir").toBeDefined();
    // Real: 10:47 13:56 15:29 19:05 | Obs no meio: "Débito Banco de horas" |
    // Previsto: 11:00 15:00 16:00 19:20 | HE final: 0:35
    expect(ap17!.marcacoes).toHaveLength(2);
    expect(ap17!.marcacoes[0]).toEqual({ e: "10:47", s: "13:56" });
    expect(ap17!.marcacoes[1]).toEqual({ e: "15:29", s: "19:05" });
  });

  it("DSR sem batida ('21/02/2016 DOM 999 N DSR DSR') → vai pra dias_classificados_descartados [item #4]", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_ROQUE_PDFJS_LINHAS_DIA));
    // DSR vazio NÃO entra em apuracoes (design intencional — CSV não precisa).
    const ap21 = resultado!.apuracoes.find((a) => a.data === "2016-02-21");
    expect(ap21, "DSR vazio NÃO deve aparecer em apuracoes").toBeUndefined();
    // MAS deve aparecer em dias_classificados_descartados (rastro pra distinguir
    // 'ausente legítimo' de 'ausente por bug').
    expect(resultado!.dias_classificados_descartados).toBeDefined();
    const dsr21 = resultado!.dias_classificados_descartados!.find((d) => d.data === "2016-02-21");
    expect(dsr21, "DSR descartado precisa de rastro estruturado").toBeDefined();
    expect(dsr21!.ocorrencia).toBe("DSR");
    expect(dsr21!.dia_semana).toBe("DOM");
    expect(dsr21!.motivo).toMatch(/DSR sem batida/i);
  });

  it("regression guard — formato OCR V5 ('16 TER 10:26 ...') continua funcionando", () => {
    const textoOcrV5 = `
VIA VAREJO S/A 33.041.260/0652-90
CARTÃO DE PONTO
Período 16.02.2016 A 15.03.2016
16 TER 10:26 13:00 14:26 19:15
17 QUA 10:47 13:56 15:29 19:05
`.trim();
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(textoOcrV5));
    expect(resultado).not.toBeNull();
    expect(resultado!.apuracoes.length).toBe(2);
    expect(resultado!.apuracoes[0].data).toBe("2016-02-16");
    expect(resultado!.apuracoes[0].dia_semana).toBe("TER");
    expect(resultado!.apuracoes[1].data).toBe("2016-02-17");
  });
});

// =============================================================================
// Fase 6 v7 ext — AFASTAMENTO estruturado (item 2 da revisão do crítico)
// =============================================================================

const TEXTO_AFAST_ROQUE = `
VIA VAREJO SA 33.041.260/0652-90 Cartão Ponto
PERÍODO .: 16/04/2020 A 15/05/2020 Competência: MAIO/2020
Empregado: 278823 ROQUE GUERREIRO TEIXEIRA
Data Dia Horário Ref P Horário Registrado Horário de Trabalho
30/04/2020 QUI 997 N AFAST Suspensão Contrato de Trabalho Suspensão Contrato de Trabalho
01/05/2020 SEX 997 N AFAST Suspensão Contrato de Trabalho Suspensão Contrato de Trabalho
05/05/2020 TER 997 N AFAST Férias Férias
11/05/2020 SEG 162 N AFAST Atestado Médico Atestado Médico
12/05/2020 TER 162 N AFAST Falta Justificada Falta Justificada
13/05/2020 QUA 162 N AFAST Falta Falta
Assinado eletronicamente por: TATIANE - 30/11/2021 16:15:52
`.trim();

describe("AFASTAMENTO — rastro estruturado de dias com AFAST (item 2 revisão crítico)", () => {
  it("Suspensão Contrato (MP 936) → categoria SUSPENSAO_CONTRATO", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_AFAST_ROQUE));
    expect(resultado!.dias_classificados_descartados).toBeDefined();
    const ds = resultado!.dias_classificados_descartados!;
    const susp = ds.find((d) => d.data === "2020-04-30");
    expect(susp, "30/04/2020 deveria estar rastreado").toBeDefined();
    expect(susp!.ocorrencia).toBe("AFASTAMENTO");
    expect(susp!.motivo_afastamento).toBe("SUSPENSAO_CONTRATO");
    expect(susp!.motivo).toMatch(/Suspens.o Contrato/i);
  });

  it("Férias → categoria FERIAS", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_AFAST_ROQUE));
    const ferias = resultado!.dias_classificados_descartados!.find((d) => d.data === "2020-05-05");
    expect(ferias).toBeDefined();
    expect(ferias!.motivo_afastamento).toBe("FERIAS");
  });

  it("Atestado Médico → categoria ATESTADO_MEDICO", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_AFAST_ROQUE));
    const at = resultado!.dias_classificados_descartados!.find((d) => d.data === "2020-05-11");
    expect(at).toBeDefined();
    expect(at!.motivo_afastamento).toBe("ATESTADO_MEDICO");
  });

  it("Falta Justificada vs Falta Injustificada — categorias distintas", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_AFAST_ROQUE));
    const fj = resultado!.dias_classificados_descartados!.find((d) => d.data === "2020-05-12");
    const fi = resultado!.dias_classificados_descartados!.find((d) => d.data === "2020-05-13");
    expect(fj?.motivo_afastamento).toBe("FALTA_JUSTIFICADA");
    expect(fi?.motivo_afastamento).toBe("FALTA_INJUSTIFICADA");
  });

  it("AFASTAMENTO não vai pra apuracoes (CSV PJe-Calc não precisa)", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_AFAST_ROQUE));
    // Nenhum dia AFAST deveria ter virado apuração exportável.
    const datasAfast = ["2020-04-30", "2020-05-01", "2020-05-05", "2020-05-11", "2020-05-12", "2020-05-13"];
    for (const d of datasAfast) {
      const ap = resultado!.apuracoes.find((a) => a.data === d);
      expect(ap, `${d} (AFAST) NÃO deve aparecer em apuracoes`).toBeUndefined();
    }
  });
});

// =============================================================================
// Fase 6 v7 ext — Família de totalizadores expandida (item 3 revisão crítico)
// =============================================================================

const TEXTO_TOTALIZADORES_EXPANDIDOS = `
VIA VAREJO SA 33.041.260/0652-90 Cartão Ponto
PERÍODO .: 16/10/2019 A 15/11/2019 Competência: NOVEMBRO/2019
Data Dia Horário Ref P Horário Registrado Horário de Trabalho
16/10/2019 QUA 162 N 09:00 12:00 13:05 17:25
Movimentos: (Período de 16/10/2019 a 15/11/2019)
3884 Horas Trabalhadas Feriado/DS 11:25 | 7338 HORAS EXTRAS 75% - INTERVALO 0:02 |
7358 Horas Extras DSR/Feriado 0% 7:14 9000 Horas Normais 183:20 9080 Horas Extras 75% 2:51
9192 SD Atual Banco 75% 7:16
Assinado eletronicamente por: TATIANE - 30/11/2021
`.trim();

describe("Reconciliação — família de totalizadores expandida (item 3 revisão crítico)", () => {
  it("3884 (Horas Trabalhadas Feriado/DS) é somado ao declarado", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_TOTALIZADORES_EXPANDIDOS));
    expect(resultado!.reconciliacao).toBeDefined();
    const rec = resultado!.reconciliacao![0];
    // declarado = 9000 (183:20) + 9080 (2:51) + 3884 (11:25) + 7338 (0:02) + 7358 (7:14)
    // = 183:20 + 2:51 + 11:25 + 0:02 + 7:14 = 204:52
    const esperadoMin = 183 * 60 + 20 + 2 * 60 + 51 + 11 * 60 + 25 + 0 * 60 + 2 + 7 * 60 + 14;
    expect(rec.declarado_minutos, `motivo: ${rec.motivo}`).toBe(esperadoMin);
    // detalhes devem listar TODOS os 5 códigos
    expect(rec.motivo).toMatch(/9000=/);
    expect(rec.motivo).toMatch(/9080=/);
    expect(rec.motivo).toMatch(/3884=/);
    expect(rec.motivo).toMatch(/7338=/);
    expect(rec.motivo).toMatch(/7358=/);
  });

  it("3960 (Adicional Sábado 25%) NÃO é somado — é adicional %, não tempo trabalhado", () => {
    const textoComAdicional = TEXTO_TOTALIZADORES_EXPANDIDOS.replace(
      "9000 Horas Normais 183:20",
      "3960 Adicional Sábado 25% 21:39 9000 Horas Normais 183:20",
    );
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(textoComAdicional));
    const rec = resultado!.reconciliacao![0];
    expect(rec.motivo, `motivo: ${rec.motivo}`).not.toMatch(/3960=/);
  });
});

// =============================================================================
// Fase 6 v7 ext — reconciliacao_residuais (dívida técnica explícita)
// =============================================================================

describe("reconciliacao_residuais — dívida técnica explícita pra divergências >10h", () => {
  it("período com delta >10h vai pra reconciliacao_residuais com motivo de investigação", () => {
    // Sintético: totalizador 9000=10:00 mas batidas somam 25:00 (delta +15h).
    // Forço só 3 dias com pares grandes — soma de batidas = 15h*3 = 45h, mas
    // o totalizador 9000 declara 10h. delta = +35h (excede 10h, vira residual).
    const textoBigDelta = `
VIA VAREJO SA 33.041.260/0652-90 Cartão Ponto
PERÍODO .: 16/10/2019 A 15/11/2019 Competência: NOVEMBRO/2019
Data Dia Horário Ref P Horário Registrado Horário de Trabalho
16/10/2019 QUA 162 N 08:00 13:00 14:00 22:00
17/10/2019 QUI 162 N 08:00 13:00 14:00 22:00
18/10/2019 SEX 162 N 08:00 13:00 14:00 22:00
Movimentos: (Período de 16/10/2019 a 15/11/2019)
9000 Horas Normais 10:00
Assinado eletronicamente por: TATIANE - 30/11/2021
`.trim();
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(textoBigDelta));
    expect(resultado!.reconciliacao_residuais).toBeDefined();
    expect(resultado!.reconciliacao_residuais!.length).toBe(1);
    const res = resultado!.reconciliacao_residuais![0];
    expect(res.periodo.inicio).toBe("2019-10-16");
    expect(Math.abs(res.delta_minutos)).toBeGreaterThan(600);
    expect(res.motivo).toMatch(/Investigação manual recomendada/i);
  });

  it("período com delta <10h NÃO vai pra reconciliacao_residuais (só ruído / divergência comum)", () => {
    // Totalizador 9000=14:00 + batidas 14:30 → delta 30min (entra em reconciliacao
    // mas NÃO em residuais).
    const textoPequeno = `
VIA VAREJO SA 33.041.260/0652-90 Cartão Ponto
PERÍODO .: 16/10/2019 A 15/11/2019 Competência: NOVEMBRO/2019
Data Dia Horário Ref P Horário Registrado Horário de Trabalho
16/10/2019 QUA 162 N 08:00 12:00 13:00 22:30
Movimentos: (Período de 16/10/2019 a 15/11/2019)
9000 Horas Normais 14:00
Assinado eletronicamente por: TATIANE - 30/11/2021
`.trim();
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(textoPequeno));
    expect(resultado!.reconciliacao_residuais).toBeUndefined();
  });
});
