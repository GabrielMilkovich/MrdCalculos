/**
 * Round-trip tests: PjcCalculoData → buildPjcXml → parsePjcXml → assertEqual.
 *
 * Garante que o importer e o builder estão consistentes — qualquer mudança
 * em um precisa refletir no outro.
 */
import { describe, expect, it } from "vitest";
import { buildPjcXml, type PjcCalculoData } from "../../../export/pjc/builder";
import { parsePjcXml } from "../../../export/pjc/importer";

const META = {
  nome_beneficiario: "MARIA DA SILVA",
  cpf: "12345678900",
  data_admissao: "2011-06-06",
  data_demissao: "2024-03-15",
  data_inicio_calculo: "2019-04-01",
  data_termino_calculo: "2024-03-15",
  data_ajuizamento: "2024-04-01",
  numero_processo: "0001234-12.2024.5.02.0001",
};

describe("Round-trip — data mínima (só meta)", () => {
  it("Roundtrip do meta puro", () => {
    const data: PjcCalculoData = {
      meta: { ...META },
      historicosSalariais: [],
      ferias: [],
      faltas: [],
      cartoesDePonto: [],
    };
    const xml = buildPjcXml(data);
    const back = parsePjcXml(xml);
    expect(back.meta).toEqual(META);
    expect(back.historicosSalariais).toEqual([]);
    expect(back.ferias).toEqual([]);
    expect(back.faltas).toEqual([]);
    expect(back.cartoesDePonto).toEqual([]);
  });

  it("data_demissao=null sobrevive ao roundtrip", () => {
    const data: PjcCalculoData = {
      meta: { ...META, data_demissao: null, data_ajuizamento: null },
      historicosSalariais: [],
      ferias: [],
      faltas: [],
      cartoesDePonto: [],
    };
    const back = parsePjcXml(buildPjcXml(data));
    expect(back.meta.data_demissao).toBeNull();
    expect(back.meta.data_ajuizamento).toBeNull();
  });
});

describe("Round-trip — históricos salariais", () => {
  it("Histórico com 2 ocorrências preserva valores e flags", () => {
    const data: PjcCalculoData = {
      meta: { ...META },
      historicosSalariais: [
        {
          nome: "Comissões",
          incidenciaFGTS: true,
          incidenciaINSS: true,
          aplicarProporcionalidadeFGTS: false,
          aplicarProporcionalidadeINSS: false,
          ocorrencias: [
            {
              competencia: "08/2016",
              valor: 1158.82,
              recolhidoFGTS: false,
              recolhidoINSS: false,
            },
            {
              competencia: "09/2016",
              valor: 2000.0,
              recolhidoFGTS: true,
              recolhidoINSS: true,
            },
          ],
        },
      ],
      ferias: [],
      faltas: [],
      cartoesDePonto: [],
    };
    const back = parsePjcXml(buildPjcXml(data));
    expect(back.historicosSalariais.length).toBe(1);
    const hs = back.historicosSalariais[0];
    expect(hs.nome).toBe("Comissões");
    expect(hs.incidenciaFGTS).toBe(true);
    expect(hs.ocorrencias.length).toBe(2);
    expect(hs.ocorrencias[0]).toEqual({
      competencia: "08/2016",
      valor: 1158.82,
      recolhidoFGTS: false,
      recolhidoINSS: false,
    });
    expect(hs.ocorrencias[1].recolhidoFGTS).toBe(true);
  });

  it("Múltiplos históricos preservam ordem", () => {
    const data: PjcCalculoData = {
      meta: { ...META },
      historicosSalariais: [
        {
          nome: "Salário Base",
          incidenciaFGTS: true,
          incidenciaINSS: true,
          aplicarProporcionalidadeFGTS: true,
          aplicarProporcionalidadeINSS: true,
          ocorrencias: [
            { competencia: "01/2024", valor: 3000, recolhidoFGTS: false, recolhidoINSS: false },
          ],
        },
        {
          nome: "DSR",
          incidenciaFGTS: false,
          incidenciaINSS: false,
          aplicarProporcionalidadeFGTS: false,
          aplicarProporcionalidadeINSS: false,
          ocorrencias: [
            { competencia: "01/2024", valor: 500, recolhidoFGTS: false, recolhidoINSS: false },
          ],
        },
      ],
      ferias: [],
      faltas: [],
      cartoesDePonto: [],
    };
    const back = parsePjcXml(buildPjcXml(data));
    expect(back.historicosSalariais.map((h) => h.nome)).toEqual([
      "Salário Base",
      "DSR",
    ]);
    expect(back.historicosSalariais[1].incidenciaFGTS).toBe(false);
  });
});

describe("Round-trip — férias", () => {
  it("Férias gozadas com gozo1 preenchido", () => {
    const data: PjcCalculoData = {
      meta: { ...META },
      historicosSalariais: [],
      ferias: [
        {
          relativa: "2022/2023",
          prazo: 30,
          situacao: "GOZADAS",
          dobraGeral: false,
          abono: false,
          diasAbono: 0,
          gozo1: { inicio: "10/01/2024", fim: "08/02/2024", dobra: false },
          gozo2: null,
          gozo3: null,
          dataAdmissaoBase: META.data_admissao,
        },
      ],
      faltas: [],
      cartoesDePonto: [],
    };
    const back = parsePjcXml(buildPjcXml(data));
    expect(back.ferias.length).toBe(1);
    const f = back.ferias[0];
    expect(f.relativa).toBe("2022/2023");
    expect(f.situacao).toBe("GOZADAS");
    expect(f.gozo1).toEqual({
      inicio: "10/01/2024",
      fim: "08/02/2024",
      dobra: false,
    });
    expect(f.gozo2).toBeNull();
    expect(f.gozo3).toBeNull();
  });

  it("Férias indenizadas com abono", () => {
    const data: PjcCalculoData = {
      meta: { ...META },
      historicosSalariais: [],
      ferias: [
        {
          relativa: "2023/2024",
          prazo: 30,
          situacao: "INDENIZADAS",
          dobraGeral: false,
          abono: true,
          diasAbono: 10,
          gozo1: null,
          gozo2: null,
          gozo3: null,
          dataAdmissaoBase: META.data_admissao,
        },
      ],
      faltas: [],
      cartoesDePonto: [],
    };
    const back = parsePjcXml(buildPjcXml(data));
    expect(back.ferias[0].situacao).toBe("INDENIZADAS");
    expect(back.ferias[0].abono).toBe(true);
    expect(back.ferias[0].diasAbono).toBe(10);
  });
});

describe("Round-trip — faltas", () => {
  it("Falta com justificativa", () => {
    const data: PjcCalculoData = {
      meta: { ...META },
      historicosSalariais: [],
      ferias: [],
      faltas: [
        {
          data_inicial: "2023-05-10",
          data_final: "2023-05-12",
          justificada: true,
          reiniciaPeriodoAquisitivo: false,
          justificativa: "Atestado médico",
        },
      ],
      cartoesDePonto: [],
    };
    const back = parsePjcXml(buildPjcXml(data));
    expect(back.faltas[0]).toEqual({
      data_inicial: "2023-05-10",
      data_final: "2023-05-12",
      justificada: true,
      reiniciaPeriodoAquisitivo: false,
      justificativa: "Atestado médico",
    });
  });

  it("Falta sem justificativa preserva null", () => {
    const data: PjcCalculoData = {
      meta: { ...META },
      historicosSalariais: [],
      ferias: [],
      faltas: [
        {
          data_inicial: "2023-05-10",
          data_final: "2023-05-10",
          justificada: false,
          reiniciaPeriodoAquisitivo: true,
          justificativa: null,
        },
      ],
      cartoesDePonto: [],
    };
    const back = parsePjcXml(buildPjcXml(data));
    expect(back.faltas[0].justificativa).toBeNull();
    expect(back.faltas[0].reiniciaPeriodoAquisitivo).toBe(true);
  });
});

describe("Round-trip — cartões de ponto", () => {
  it("1 cartão com 2 apurações + jornada", () => {
    const data: PjcCalculoData = {
      meta: { ...META },
      historicosSalariais: [],
      ferias: [],
      faltas: [],
      cartoesDePonto: [
        {
          nome: "Cartão 03/2024",
          apuracoes: [
            {
              data: "2024-03-01",
              ocorrencia: "NORMAL",
              marcacoes: [
                { e: "08:00", s: "12:00" },
                { e: "13:00", s: "17:00" },
              ],
            },
            {
              data: "2024-03-02",
              ocorrencia: "FOLGA",
              marcacoes: [],
            },
          ],
        },
      ],
    };
    const back = parsePjcXml(buildPjcXml(data));
    expect(back.cartoesDePonto.length).toBe(1);
    const cp = back.cartoesDePonto[0];
    expect(cp.nome).toBe("Cartão 03/2024");
    expect(cp.apuracoes.length).toBe(2);
    expect(cp.apuracoes[0].marcacoes).toEqual([
      { e: "08:00", s: "12:00" },
      { e: "13:00", s: "17:00" },
    ]);
    expect(cp.apuracoes[1].ocorrencia).toBe("FOLGA");
    expect(cp.apuracoes[1].marcacoes).toEqual([]);
  });

  it("2 cartões — apurações associadas via internalRef", () => {
    const data: PjcCalculoData = {
      meta: { ...META },
      historicosSalariais: [],
      ferias: [],
      faltas: [],
      cartoesDePonto: [
        {
          nome: "Cartão 01/2024",
          apuracoes: [
            {
              data: "2024-01-15",
              ocorrencia: "NORMAL",
              marcacoes: [{ e: "09:00", s: "18:00" }],
            },
          ],
        },
        {
          nome: "Cartão 02/2024",
          apuracoes: [
            {
              data: "2024-02-15",
              ocorrencia: "ATESTADO",
              marcacoes: [],
            },
          ],
        },
      ],
    };
    const back = parsePjcXml(buildPjcXml(data));
    expect(back.cartoesDePonto.length).toBe(2);
    expect(back.cartoesDePonto[0].apuracoes[0].data).toBe("2024-01-15");
    expect(back.cartoesDePonto[1].apuracoes[0].data).toBe("2024-02-15");
    expect(back.cartoesDePonto[1].apuracoes[0].ocorrencia).toBe("ATESTADO");
  });
});

describe("Round-trip — caracteres especiais XML", () => {
  it("Nome com acento e & < > não corrompem", () => {
    const data: PjcCalculoData = {
      meta: {
        ...META,
        nome_beneficiario: 'João & Maria <"X">',
      },
      historicosSalariais: [
        {
          nome: "Comissões + Bônus",
          incidenciaFGTS: false,
          incidenciaINSS: false,
          aplicarProporcionalidadeFGTS: false,
          aplicarProporcionalidadeINSS: false,
          ocorrencias: [
            {
              competencia: "01/2024",
              valor: 100,
              recolhidoFGTS: false,
              recolhidoINSS: false,
            },
          ],
        },
      ],
      ferias: [],
      faltas: [],
      cartoesDePonto: [],
    };
    const back = parsePjcXml(buildPjcXml(data));
    expect(back.meta.nome_beneficiario).toBe('João & Maria <"X">');
    expect(back.historicosSalariais[0].nome).toBe("Comissões + Bônus");
  });
});

describe("Round-trip — caso completo (smoke)", () => {
  it("Dataset complexo passa por buildPjcXml + parsePjcXml sem perdas", () => {
    const data: PjcCalculoData = {
      meta: { ...META },
      historicosSalariais: [
        {
          nome: "Salário",
          incidenciaFGTS: true,
          incidenciaINSS: true,
          aplicarProporcionalidadeFGTS: false,
          aplicarProporcionalidadeINSS: false,
          ocorrencias: [
            { competencia: "01/2024", valor: 3000, recolhidoFGTS: false, recolhidoINSS: false },
            { competencia: "02/2024", valor: 3000, recolhidoFGTS: false, recolhidoINSS: false },
          ],
        },
      ],
      ferias: [
        {
          relativa: "2022/2023",
          prazo: 30,
          situacao: "GOZADAS_PARCIALMENTE",
          dobraGeral: false,
          abono: false,
          diasAbono: 0,
          gozo1: { inicio: "01/06/2023", fim: "20/06/2023", dobra: false },
          gozo2: { inicio: "10/12/2023", fim: "20/12/2023", dobra: true },
          gozo3: null,
          dataAdmissaoBase: META.data_admissao,
        },
      ],
      faltas: [
        {
          data_inicial: "2023-09-01",
          data_final: "2023-09-01",
          justificada: false,
          reiniciaPeriodoAquisitivo: false,
          justificativa: null,
        },
      ],
      cartoesDePonto: [
        {
          nome: "Cartão 01/2024",
          apuracoes: [
            {
              data: "2024-01-02",
              ocorrencia: "NORMAL",
              marcacoes: [{ e: "08:00", s: "17:00" }],
            },
            {
              data: "2024-01-03",
              ocorrencia: "FERIADO",
              marcacoes: [],
            },
          ],
        },
      ],
    };
    const back = parsePjcXml(buildPjcXml(data));
    // Igualdade estrutural total — se tudo foi preservado.
    expect(back).toEqual(data);
  });
});
