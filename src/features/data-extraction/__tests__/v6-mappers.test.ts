/**
 * Testes dos mappers v6 contra DocumentoTabular sintético.
 *
 * Estratégia: como não temos `pdf-original.pdf` no repo (só o `ocr.txt`
 * da fixture Joseli, que é OCR Mistral pré-processado), construímos um
 * `DocumentoTabular` SINTÉTICO usando o ocr.txt como `textoCompleto`.
 *
 * Isso valida:
 *  - Detector de cada mapper funciona sobre texto realista.
 *  - Mapper Via Varejo produz apurações coerentes a partir do texto.
 *  - Stubs retornam null (cai pro fallback v5).
 *
 * NÃO valida:
 *  - Extrator geométrico end-to-end (precisa Deno + pdfjs em runtime).
 *  - Cobertura no PDF real de 57 páginas (1245 apurações) — fixture
 *    pendente.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapperCartaoViaVarejo } from "../../../../supabase/functions/_shared/mappers/cartao-ponto-via-varejo";
import { mapperCartaoGenerico } from "../../../../supabase/functions/_shared/mappers/cartao-ponto-generico";
import { mapperHoleriteViaVarejo } from "../../../../supabase/functions/_shared/mappers/holerite-via-varejo";
import { mapperHoleriteGenerico } from "../../../../supabase/functions/_shared/mappers/holerite-generico";
import { mapperReciboFerias } from "../../../../supabase/functions/_shared/mappers/recibo-ferias";
import { mapperRegistroFaltas } from "../../../../supabase/functions/_shared/mappers/registro-faltas";
import { mapperCtps } from "../../../../supabase/functions/_shared/mappers/ctps";
import { escolherMapper } from "../../../../supabase/functions/_shared/mappers/dispatcher";
import type { DocumentoTabular } from "../../../../supabase/functions/_shared/documento-tabular";

const FIXTURE_DIR = join(
  __dirname,
  "_fixtures",
  "cartao-ponto",
  "joseli-via-varejo-2011-2016",
);
const ocrJoseli = readFileSync(join(FIXTURE_DIR, "ocr.txt"), "utf-8");

/**
 * Texto sintético representando o que o extrator geométrico produziria
 * sobre o PDF nativo do Joseli — formato Layout A linha-por-linha,
 * com cada dia + suas batidas na MESMA linha (porque a clusterização Y
 * do extrator reagrupa items por coordenada visual).
 *
 * Em produção, o extrator geométrico transformaria o Layout B colapsado
 * (cartões 1 e 3 do OCR Mistral) em Layout A. Aqui simulamos isso para
 * o cartão 2 (que já é Layout A no OCR original) + um cabeçalho VV.
 */
const textoNativoSinteticoJoseli = `
NOVA CASA BAHIA S/A
C.G.C. 10.757.237/0556-62
JOSELI SILVA WANDERLEY  Matrícula 01788485  Filial 1651
CARTÃO DE PONTO
Período 21.06.2011 A 20.07.2011

Dia | 1. Período | 2. Período | Ocorrências
21 TER  13:45 17:02  18:10 22:05
22 QUA  13:46 17:12  18:21 22:12
23 FERIADO  11:54 15:30  16:31
24 SEX  13:52 17:05  18:08 22:14
25 SAB  13:43 15:50  16:57 22:06
26 D.S.R.  11:54 15:38  16:37 20:09
27 SEG  09:49 14:02  15:16 18:20
28 TER
29 QUA  09:50 14:05  15:10 18:41
30 QUI  09:43 14:06  15:08 18:09
01 SEX  09:38 14:16  15:22 18:57
02 SAB  09:46 14:05  15:10 18:13
03 D.S.R.
04 SEG  13:37 17:03  18:14 22:05
05 TER  13:49 17:26  18:32 22:08
06 QUA  13:54 16:39  17:39
07 QUI  13:45 17:06  18:14 22:07
08 SEX  13:45 17:06  18:05 22:08
09 FERIADO  13:52 16:03  17:17 22:06
10 D.S.R.  12:07 15:10  16:22 20:22
11 SEG  09:42 14:35  15:31 18:10
12 TER  09:51 14:10  15:19 18:41
13 QUA  10:38 15:08  16:06 18:44
14 QUI
15 SEX  09:45 14:07  15:08 18:16
16 SAB  10:04 13:59  15:10 19:11
17 D.S.R.  11:57 14:42  15:46
18 SEG
19 TER  13:45 16:42  17:52 22:13
20 QUA  13:50 17:03  18:05 22:14
Resumo do Período
HORAS TRABALHADAS  176:00
D.S.R PAGOS  44:00
Assinado eletronicamente
`;

function docTabularSintetico(textoCompleto: string): DocumentoTabular {
  return {
    numeroPaginas: 1,
    paginas: [
      {
        numero: 1,
        textos: [],
        tabelas: [],
        textoPlano: textoCompleto,
      },
    ],
    textoCompleto,
    extractor: "synthetic_for_test",
    qualidade: { score: 0.9, razao: "fixture sintética" },
  };
}

// =====================================================
// Mapper Via Varejo cartão de ponto
// =====================================================

describe("mapperCartaoViaVarejo — detector", () => {
  it("OCR Joseli detecta com score >= 0.7", () => {
    const doc = docTabularSintetico(ocrJoseli);
    const det = mapperCartaoViaVarejo.detectar(doc);
    expect(det.aplica).toBe(true);
    expect(det.score).toBeGreaterThanOrEqual(0.7);
    expect(det.motivos.length).toBeGreaterThan(0);
  });

  it("OCR sem marcadores VV/CB não aplica", () => {
    const doc = docTabularSintetico("Holerite genérico empresa qualquer");
    const det = mapperCartaoViaVarejo.detectar(doc);
    expect(det.aplica).toBe(false);
  });
});

describe("mapperCartaoViaVarejo — mapear (texto nativo sintético, Layout A)", () => {
  it("produz 26 apurações para o cartão 21.06-20.07/2011 (Layout A)", () => {
    const doc = docTabularSintetico(textoNativoSinteticoJoseli);
    const r = mapperCartaoViaVarejo.mapear(doc);
    expect(r).not.toBeNull();
    // Layout A do cartão 2 do Joseli tem 26 dias com batida (28, 03, 14, 18 vazios).
    expect(r!.apuracoes.length).toBe(26);
  });

  it("primeira apuração é 21/06/2011 com batidas 13:45/17:02/18:10/22:05", () => {
    const doc = docTabularSintetico(textoNativoSinteticoJoseli);
    const r = mapperCartaoViaVarejo.mapear(doc)!;
    const ap = r.apuracoes.find((a) => a.data === "2011-06-21");
    expect(ap).toBeDefined();
    expect(ap!.marcacoes[0]).toEqual({ e: "13:45", s: "17:02" });
    expect(ap!.marcacoes[1]).toEqual({ e: "18:10", s: "22:05" });
  });

  it("FERIADO 23/06/2011 com 3 batidas (par ímpar) preserva ordem", () => {
    const doc = docTabularSintetico(textoNativoSinteticoJoseli);
    const r = mapperCartaoViaVarejo.mapear(doc)!;
    const ap = r.apuracoes.find((a) => a.data === "2011-06-23");
    expect(ap).toBeDefined();
    expect(ap!.ocorrencia).toBe("FERIADO");
    expect(ap!.marcacoes[0]).toEqual({ e: "11:54", s: "15:30" });
    expect(ap!.marcacoes[1]).toEqual({ e: "16:31", s: "" });
  });

  it("DSR 26/06/2011 com batida vira ocorrencia=DSR (trabalhou no descanso)", () => {
    const doc = docTabularSintetico(textoNativoSinteticoJoseli);
    const r = mapperCartaoViaVarejo.mapear(doc)!;
    const ap = r.apuracoes.find((a) => a.data === "2011-06-26");
    expect(ap).toBeDefined();
    expect(ap!.ocorrencia).toBe("DSR");
  });

  it("Dias vazios (28/06, 03/07, 14/07, 18/07) NÃO entram", () => {
    const doc = docTabularSintetico(textoNativoSinteticoJoseli);
    const r = mapperCartaoViaVarejo.mapear(doc)!;
    expect(r.apuracoes.find((a) => a.data === "2011-06-28")).toBeUndefined();
    expect(r.apuracoes.find((a) => a.data === "2011-07-03")).toBeUndefined();
    expect(r.apuracoes.find((a) => a.data === "2011-07-14")).toBeUndefined();
    expect(r.apuracoes.find((a) => a.data === "2011-07-18")).toBeUndefined();
  });

  it("Cortes semânticos: HORAS TRABALHADAS 176:00 NÃO vira batida", () => {
    const doc = docTabularSintetico(textoNativoSinteticoJoseli);
    const r = mapperCartaoViaVarejo.mapear(doc)!;
    const horarios = r.apuracoes.flatMap((a) =>
      a.marcacoes.flatMap((m) => [m.e, m.s]),
    );
    expect(horarios).not.toContain("176:00");
    expect(horarios).not.toContain("44:00");
  });

  it("Reconstrução de data: dia 21 com período 21.06-20.07 vira 21/06 (não 21/07)", () => {
    const doc = docTabularSintetico(textoNativoSinteticoJoseli);
    const r = mapperCartaoViaVarejo.mapear(doc)!;
    expect(r.apuracoes.find((a) => a.data === "2011-06-21")).toBeDefined();
    // 21/07 NÃO existe nesse período (21.06-20.07).
    expect(r.apuracoes.find((a) => a.data === "2011-07-21")).toBeUndefined();
  });

  it("data_inicial/final e competências coerentes", () => {
    const doc = docTabularSintetico(textoNativoSinteticoJoseli);
    const r = mapperCartaoViaVarejo.mapear(doc)!;
    expect(r.data_inicial).toBe("2011-06-21");
    expect(r.data_final).toBe("2011-07-20");
    expect(r.competencias.size).toBe(2); // 06/2011 + 07/2011
  });
});

describe("mapperCartaoViaVarejo — fixture OCR Mistral original (Layout B colapsado)", () => {
  it("Detecta como Via Varejo (3 sinais) mas mapear NÃO captura cartões 1 e 3 colapsados — comportamento esperado V6", () => {
    // V6 documenta: o mapper assume texto NATIVO ordenado (Layout A após
    // clusterização Y do extrator geométrico). OCR Mistral Layout B
    // (colapsado em multi-linha sem ordenação espacial) não é o input
    // alvo do v6 — para esses, o pipeline cai pra V5.
    const doc = docTabularSintetico(ocrJoseli);
    const det = mapperCartaoViaVarejo.detectar(doc);
    expect(det.aplica).toBe(true); // detector reconhece Via Varejo
    const r = mapperCartaoViaVarejo.mapear(doc);
    // Mapear pode retornar parcial (só o cartão 2 que é Layout A) ou null.
    // Documenta comportamento — operador veria isso na UI e o pipeline
    // cai pro fallback v5 com o ocr_text salvo.
    if (r) {
      // Cartão 2 (Layout A) entra; cartões 1 e 3 (Layout B) ficam de fora.
      expect(r.apuracoes.length).toBeLessThan(40);
    }
  });
});

// =====================================================
// Mapper genérico (fallback)
// =====================================================

describe("mapperCartaoGenerico — detector", () => {
  it("Cartão de ponto genérico (sem marcadores VV) aplica com score baixo", () => {
    const doc = docTabularSintetico(`
      Cartão de Ponto - Empresa XYZ
      01/03/2024 Seg 08:00 12:00 13:00 17:00
      02/03/2024 Ter 08:30 12:30 13:30 17:30
      03/03/2024 Qua 08:15 12:15 13:15 17:15
      04/03/2024 Qui 08:00 12:00 13:00 17:00
      05/03/2024 Sex 08:00 12:00 13:00 17:00
    `);
    const det = mapperCartaoGenerico.detectar(doc);
    expect(det.aplica).toBe(true);
    expect(det.score).toBeLessThanOrEqual(0.6); // específico vence
  });

  it("Score do genérico SEMPRE menor que Via Varejo no mesmo doc", () => {
    const doc = docTabularSintetico(ocrJoseli);
    const detVV = mapperCartaoViaVarejo.detectar(doc);
    const detGen = mapperCartaoGenerico.detectar(doc);
    if (detGen.aplica) {
      expect(detVV.score).toBeGreaterThan(detGen.score);
    }
  });
});

// =====================================================
// Stubs (interface correta + mapear retorna null)
// =====================================================

describe("Mappers stub — interface + comportamento de fallback", () => {
  it.each([
    ["holerite-via-varejo", mapperHoleriteViaVarejo, "holerite"],
    ["holerite-generico", mapperHoleriteGenerico, "holerite"],
    ["recibo-ferias", mapperReciboFerias, "recibo_ferias"],
    ["registro-faltas", mapperRegistroFaltas, "registro_faltas"],
    ["ctps", mapperCtps, "ctps"],
  ])("%s tem slug, nome e tipoDocumento corretos", (_, mapper, tipo) => {
    expect(mapper.slug).toBeTruthy();
    expect(mapper.nome).toBeTruthy();
    expect(mapper.tipoDocumento).toBe(tipo);
  });

  it("mapear retorna null em todos os stubs (fallback pro v5)", () => {
    const doc = docTabularSintetico("qualquer texto");
    // holerite_via_varejo NÃO é mais stub — só retorna null sem competência
    // ou sem tabela. Testado abaixo. Os outros 4 são stubs legítimos.
    expect(mapperHoleriteGenerico.mapear(doc)).toBeNull();
    expect(mapperReciboFerias.mapear(doc)).toBeNull();
    expect(mapperRegistroFaltas.mapear(doc)).toBeNull();
    expect(mapperCtps.mapear(doc)).toBeNull();
  });

  it("Detector de holerite VV detecta com sinais corretos", () => {
    const doc = docTabularSintetico(`
      VIA VAREJO S/A
      HOLERITE - Recibo de Pagamento
      Vencimentos    Descontos
    `);
    const det = mapperHoleriteViaVarejo.detectar(doc);
    expect(det.aplica).toBe(true);
  });

  it("Detector de recibo de férias detecta", () => {
    const doc = docTabularSintetico(`
      RECIBO DE FÉRIAS
      Período Aquisitivo: 2022/2023
      Período de Gozo: 01/06/2024 a 30/06/2024
    `);
    const det = mapperReciboFerias.detectar(doc);
    expect(det.aplica).toBe(true);
  });

  it("Detector de registro de faltas detecta", () => {
    const doc = docTabularSintetico(`
      Registro de Faltas
      Atestado médico CID J45
      Ausência justificada 12/03/2024
    `);
    const det = mapperRegistroFaltas.detectar(doc);
    expect(det.aplica).toBe(true);
  });

  it("Detector de CTPS detecta", () => {
    const doc = docTabularSintetico(`
      CARTEIRA DE TRABALHO E PREVIDÊNCIA SOCIAL
      Anotações Gerais
      Recibo de Férias 2022/2023
    `);
    const det = mapperCtps.detectar(doc);
    expect(det.aplica).toBe(true);
  });
});

// =====================================================
// Dispatcher
// =====================================================

describe("Dispatcher — escolher mapper por score", () => {
  it("OCR Joseli → escolhe mapperCartaoViaVarejo (maior score)", () => {
    const doc = docTabularSintetico(ocrJoseli);
    const r = escolherMapper(doc);
    expect(r).not.toBeNull();
    expect(r!.mapper.slug).toBe("cartao_via_varejo_v1");
    expect(r!.score).toBeGreaterThan(0.5);
  });

  it("Doc sem nenhum sinal → null", () => {
    const doc = docTabularSintetico("Lorem ipsum dolor sit amet.");
    const r = escolherMapper(doc);
    expect(r).toBeNull();
  });

  it("Filtro por tipoForcado limita os candidatos", () => {
    const doc = docTabularSintetico(ocrJoseli);
    const r = escolherMapper(doc, "holerite");
    // Joseli é cartão, não holerite — nenhum mapper de holerite aplica.
    expect(r).toBeNull();
  });

  it("Cartão genérico — escolhe genérico quando VV não aplica", () => {
    const doc = docTabularSintetico(`
      Cartão de Ponto - Empresa Anonima Ltda
      01/03/2024 Seg 08:00 12:00 13:00 17:00
      02/03/2024 Ter 08:30 12:30 13:30 17:30
      03/03/2024 Qua 08:15 12:15 13:15 17:15
      04/03/2024 Qui 08:00 12:00 13:00 17:00
      05/03/2024 Sex 08:00 12:00 13:00 17:00
      06/03/2024 Sab 08:00 12:00
    `);
    const r = escolherMapper(doc);
    expect(r).not.toBeNull();
    expect(r!.mapper.slug).toBe("cartao_generico_v1");
  });
});

// =====================================================
// Mapper Holerite Via Varejo — usa doc.tabelas geométricas
// =====================================================

import type { TabelaDetectada } from "../../../../supabase/functions/_shared/documento-tabular";

function docHoleriteSintetico(
  textoCompleto: string,
  tabela: TabelaDetectada,
): DocumentoTabular {
  return {
    numeroPaginas: 1,
    paginas: [
      { numero: 1, textos: [], tabelas: [tabela], textoPlano: textoCompleto },
    ],
    textoCompleto,
    extractor: "synthetic_for_test",
    qualidade: { score: 0.9, razao: "fixture holerite sintética" },
  };
}

function celula(texto: string, coluna: number) {
  return { texto, coluna, fragmentos: [] };
}

describe("mapperHoleriteViaVarejo — extração via tabela geométrica", () => {
  const tabelaSimples: TabelaDetectada = {
    bbox: { x0: 0, y0: 0, x1: 600, y1: 200 },
    headers: ["Cód", "Descrição", "Ref", "Vencimentos", "Descontos"],
    linhas: [
      [
        celula("0101", 0),
        celula("Salário Base", 1),
        celula("220,00", 2),
        celula("3.500,00", 3),
        celula("", 4),
      ],
      [
        celula("0501", 0),
        celula("DSR (Comissão)", 1),
        celula("", 2),
        celula("272,64", 3),
        celula("", 4),
      ],
      [
        celula("9901", 0),
        celula("INSS", 1),
        celula("", 2),
        celula("", 3),
        celula("385,00", 4),
      ],
    ],
  };

  it("extrai 3 rubricas com competência válida", () => {
    const doc = docHoleriteSintetico(
      `VIA VAREJO S/A\nHOLERITE Mês/Ano: 06/2024\nVENCIMENTOS DESCONTOS\n`,
      tabelaSimples,
    );
    const r = mapperHoleriteViaVarejo.mapear(doc);
    expect(r).not.toBeNull();
    expect(r!.competencia).toBe("06/2024");
    expect(r!.rubricas).toHaveLength(3);
    const salario = r!.rubricas.find((x) => x.nome === "Salário Base");
    expect(salario?.valor_vencimento).toBe(3500);
    const inss = r!.rubricas.find((x) => x.nome === "INSS");
    expect(inss?.valor_desconto).toBe(385);
  });

  it("retorna null sem competência válida no texto", () => {
    const doc = docHoleriteSintetico(
      "VIA VAREJO S/A HOLERITE sem mes ano",
      tabelaSimples,
    );
    expect(mapperHoleriteViaVarejo.mapear(doc)).toBeNull();
  });

  it("retorna null quando não há tabela com headers compatíveis", () => {
    const tabelaSemRubrica: TabelaDetectada = {
      bbox: { x0: 0, y0: 0, x1: 100, y1: 50 },
      headers: ["Endereço", "Cidade", "UF"],
      linhas: [[celula("Rua X", 0), celula("São Paulo", 1), celula("SP", 2)]],
    };
    const doc = docHoleriteSintetico(
      "VIA VAREJO HOLERITE 06/2024",
      tabelaSemRubrica,
    );
    expect(mapperHoleriteViaVarejo.mapear(doc)).toBeNull();
  });

  it("ignora linha sem nome (linha de subtotal/separador)", () => {
    const tabela: TabelaDetectada = {
      bbox: { x0: 0, y0: 0, x1: 600, y1: 200 },
      headers: ["Cód", "Descrição", "Vencimentos", "Descontos"],
      linhas: [
        [
          celula("0101", 0),
          celula("Salário", 1),
          celula("3.000,00", 2),
          celula("", 3),
        ],
        // Linha de totalizador — sem nome real
        [celula("", 0), celula("", 1), celula("3.000,00", 2), celula("", 3)],
      ],
    };
    const doc = docHoleriteSintetico("VIA VAREJO 06/2024", tabela);
    const r = mapperHoleriteViaVarejo.mapear(doc);
    expect(r!.rubricas).toHaveLength(1);
  });

  it("parseValorBR aceita 'R$ 1.234,56' e similar", () => {
    const tabela: TabelaDetectada = {
      bbox: { x0: 0, y0: 0, x1: 600, y1: 100 },
      headers: ["Descrição", "Vencimentos"],
      linhas: [
        [celula("Comissão", 0), celula("R$ 1.234,56", 1)],
        [celula("Prêmio", 0), celula("250", 1)],
      ],
    };
    const doc = docHoleriteSintetico("VIA VAREJO 06/2024", tabela);
    const r = mapperHoleriteViaVarejo.mapear(doc);
    expect(r!.rubricas[0].valor_vencimento).toBe(1234.56);
    expect(r!.rubricas[1].valor_vencimento).toBe(250);
  });
});

// =====================================================
// FIX V6.2 — calibração com texto REAL produzido pelo unpdf em produção
// =====================================================

/** Sample real do extrator V6 (capturado via metadata.v6_text_preview em prod
 *  no doc 967fe5a7 — Contracheques ate 06.2021.pdf, ROSICLEIA). */
const TEXTO_REAL_PRODUCAO_HOLERITE_VV = `Demonstrativo de Pagamento
ESTABELECIMENTO C.N.P.J FOL
VIA VAREJO S/A - VENDA NOVA 4 - MG 33.041.260/0501-88 1
ESTAB MATRÍCULA NOME FUNÇÃO DEP FILH
486 3508218 Rosicleia Pereira Chaves VENDED INTERN 00 02
C.R. BCO AG CONTA SALÁRIO REFERÊNCIA
0003-000 33 1658 71007345-9 0,00/COM JUN/2021
DATA DE PAGAMENTO:02/07/2021
CONTA QTDE.v1 VENCIMENTOS DESCONTOS
0501 DSR(Comissão) | | 189,27 |
0591 1/3 Adic Const Fer | | 584,88 |
0620 Comissões | | 356,21 |
2751 Media Férias | | 1.754,65 |
3155 Dif Comissão Mes Ant (SemMin) | | 37,86 |
3259 INT.PREMIO NO DSR | | 51,85 |
3300 PREMIO MENSAL | | 176,28 |
3391 COM. GARANTIA | | 41,54 |
3392 COM.SERV TECNICOS | | 4,26 |
3393 COM.SEGUROS | | 146,43 |
3453 COMISSAO FRETE | | 0,80 |
4590 Adiantamento em Folha(Emp) | | 101,65 |
7680 COMISSÕES PRODUTOS ONLINE | | 361,74 |
7681 COMISSÕES SERVIÇOS ONLINE | | 35,35 |
8383 Restituição Provis. Férias | | 399,48 |
1101 Empréstimo lei 10820/03 - Santander (11/36) | | | 251,18
3640 PRESTACAO DE CARNE | | | 224,17
3743 ADIANTAMENTO | | | 79,74
4520 Cartão Alimentação | | | 24,00
5560 INSS | | | 151,43
5580 INSS de Ferias | | | 144,71
7621 IR Férias | | | 50,37
8384 PROVISIONAMENTO FÉRIAS | | | 399,48
9953 Líquido Férias | | | 1.744,97
---- -----BASE/OUTROS----- ---- | ----- | ---------- | ----------
5501 Base IR | | | 1.250,16
5561 Base INSS | | | 1.401,59
5581 Base INSS Ferias | | | 1.754,65
7521 Base IR Ferias | | | 2.194,82
8000 Salario Contribuicao | | | 3.156,24
VENCIMENTOS DESCONTOS LÍQUIDO
T O T A I S
Processado pela ADP
Assinado eletronicamente por: SERGIO CARNEIRO ROSI - Juntado em: 21/08/2024 21:20:01 - 19afabc`;

describe("mapperHoleriteViaVarejo — Fix V6.2 (calibração com texto real)", () => {
  it("Detector aceita 'Demonstrativo de Pagamento' (Fix 1)", () => {
    const doc = docTabularSintetico(TEXTO_REAL_PRODUCAO_HOLERITE_VV);
    const det = mapperHoleriteViaVarejo.detectar(doc);
    expect(det.aplica).toBe(true);
    expect(det.score).toBeGreaterThan(0);
  });

  it("Detector também aceita 'Recibo de Salário' e 'Comprovante de Pagamento'", () => {
    const a = mapperHoleriteViaVarejo.detectar(
      docTabularSintetico("RECIBO DE SALÁRIO\nVIA VAREJO\nMês/Ano: 06/2024"),
    );
    const b = mapperHoleriteViaVarejo.detectar(
      docTabularSintetico("Comprovante de Pagamento\nNOVA CASA BAHIA\n06/2024"),
    );
    expect(a.aplica).toBe(true);
    expect(b.aplica).toBe(true);
  });

  it("Mapear extrai rubricas via fallback linha-por-linha (sem doc.tabelas)", () => {
    // Doc SEM tabelas no extrator (clusterização não detectou) — fallback ativa.
    const doc = docTabularSintetico(TEXTO_REAL_PRODUCAO_HOLERITE_VV);
    const r = mapperHoleriteViaVarejo.mapear(doc);
    expect(r).not.toBeNull();
    expect(r!.competencia).toMatch(/^\d{2}\/\d{4}$/);
    expect(r!.rubricas.length).toBeGreaterThanOrEqual(20);
    // Comissões deve estar como vencimento.
    const comissoes = r!.rubricas.find((x) => x.codigo === "0620");
    expect(comissoes?.valor_vencimento).toBe(356.21);
    expect(comissoes?.valor_desconto).toBeNull();
    // INSS deve estar como desconto.
    const inss = r!.rubricas.find((x) => x.codigo === "5560");
    expect(inss?.valor_desconto).toBe(151.43);
    expect(inss?.valor_vencimento).toBeNull();
  });

  it("Fallback NÃO captura linhas após 'BASE/OUTROS' (bases não são rubricas)", () => {
    const doc = docTabularSintetico(TEXTO_REAL_PRODUCAO_HOLERITE_VV);
    const r = mapperHoleriteViaVarejo.mapear(doc);
    // 'Base IR' (5501), 'Base INSS' (5561) etc estão APÓS o separador
    // BASE/OUTROS — não devem aparecer como rubrica.
    const baseIR = r!.rubricas.find((x) => x.codigo === "5501");
    expect(baseIR).toBeUndefined();
    const salarioContrib = r!.rubricas.find((x) => x.codigo === "8000");
    expect(salarioContrib).toBeUndefined();
  });

  it("Fallback dedup rubricas duplicadas entre páginas/competências", () => {
    // Texto com 2 páginas idênticas — não deve duplicar.
    const dobrado =
      TEXTO_REAL_PRODUCAO_HOLERITE_VV +
      "\n--- PÁGINA SEPARADOR ---\n" +
      TEXTO_REAL_PRODUCAO_HOLERITE_VV;
    const doc = docTabularSintetico(dobrado);
    const r = mapperHoleriteViaVarejo.mapear(doc);
    const codigosComissoes = r!.rubricas.filter((x) => x.codigo === "0620");
    // Pode aparecer 2x se valor diferir, mas com mesmo valor → dedup.
    expect(codigosComissoes.length).toBe(1);
  });
});

// =====================================================
// Regressão: rodapé jurídico PJe na Camada 3 (Caso B do prompt)
// =====================================================

describe("mapperCartaoGenerico — rodapé jurídico", () => {
  it("'Protocolado em DD/MM/YYYY HH:MM:SS' não vira batida no mapper V6", () => {
    const texto = `Cartão de Ponto - Empresa XYZ
01/06/2025 Seg 08:00 12:00 13:00 17:00
09/06/2025 Seg 08:00 12:00 13:00 17:00
10/06/2025 Ter 08:00 12:00 13:00 17:00
11/06/2025 Qua 08:00 12:00 13:00 17:00
12/06/2025 Qui 08:00 12:00 13:00 17:00

Protocolado em 10/06/2025 09:23:15 - Protocolo 1234567`;
    const doc = docTabularSintetico(texto);
    const r = mapperCartaoGenerico.mapear(doc);
    expect(r).not.toBeNull();

    const dia10 = r!.apuracoes.find((a) => a.data === "2025-06-10");
    expect(dia10).toBeDefined();
    expect(dia10!.marcacoes).toEqual([
      { e: "08:00", s: "12:00" },
      { e: "13:00", s: "17:00" },
    ]);

    // Nenhuma marcação 09:23 espúria
    const todas = r!.apuracoes.flatMap((a) => a.marcacoes);
    for (const m of todas) {
      expect(m.e).not.toBe("09:23");
      expect(m.s).not.toBe("09:23");
    }
  });
});
