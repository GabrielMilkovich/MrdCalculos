import { describe, expect, it } from "vitest";
import {
  buildPjcXml,
  brToEpochMs,
  derivarPeriodosFerias,
  type PjcCalculoData,
} from "../../../export/pjc/builder";

const META_BASE = {
  nome_beneficiario: "JOÃO DA SILVA",
  cpf: "12345678900",
  data_admissao: "2011-06-06",
  data_demissao: "2024-03-15",
  data_inicio_calculo: "2019-04-01",
  data_termino_calculo: "2024-03-15",
  data_ajuizamento: "2024-04-01",
  numero_processo: "0001234-12.2024.5.02.0001",
};

function emptyData(): PjcCalculoData {
  return {
    meta: { ...META_BASE },
    historicosSalariais: [],
    ferias: [],
    faltas: [],
    cartoesDePonto: [],
  };
}

describe("brToEpochMs", () => {
  it("converte dd/MM/yyyy para epoch BRT 00:00", () => {
    expect(brToEpochMs("01/08/2016")).toBe(Date.UTC(2016, 7, 1, 3, 0, 0));
  });

  it("formato inválido retorna 0", () => {
    expect(brToEpochMs("2016-08-01")).toBe(0);
    expect(brToEpochMs("")).toBe(0);
    expect(brToEpochMs("garbage")).toBe(0);
  });
});

describe("derivarPeriodosFerias", () => {
  it("admissão 06/06/2011 + relativa 2022/2023 → aquisitivo 06/06/2022 a 05/06/2023", () => {
    const r = derivarPeriodosFerias("2022/2023", "2011-06-06");
    expect(r.aquisitivoIni).toBe(Date.UTC(2022, 5, 6, 3, 0, 0));
    expect(r.aquisitivoFim).toBe(Date.UTC(2023, 5, 5, 3, 0, 0));
    expect(r.concessivoIni).toBe(Date.UTC(2023, 5, 6, 3, 0, 0));
    expect(r.concessivoFim).toBe(Date.UTC(2024, 5, 5, 3, 0, 0));
  });

  it("admissão 15/01/2020 + relativa 2020/2021", () => {
    const r = derivarPeriodosFerias("2020/2021", "2020-01-15");
    expect(r.aquisitivoIni).toBe(Date.UTC(2020, 0, 15, 3, 0, 0));
    expect(r.aquisitivoFim).toBe(Date.UTC(2021, 0, 14, 3, 0, 0));
  });

  it("inputs inválidos retornam zeros", () => {
    const r = derivarPeriodosFerias("invalid", "2020-01-15");
    expect(r.aquisitivoIni).toBe(0);
    expect(r.aquisitivoFim).toBe(0);
    expect(r.concessivoIni).toBe(0);
    expect(r.concessivoFim).toBe(0);
  });
});

describe("buildPjcXml — estrutura mínima", () => {
  it("XML começa com declaration ISO-8859-1 e elemento <Calculo>", () => {
    const xml = buildPjcXml(emptyData());
    expect(xml.startsWith('<?xml version="1.0" encoding="ISO-8859-1"?>')).toBe(true);
    expect(xml).toContain("<Calculo>");
    expect(xml).toContain("</Calculo>");
  });

  it("Inclui metadados básicos do beneficiário", () => {
    const xml = buildPjcXml(emptyData());
    expect(xml).toContain("<nomeDoBeneficiario>JOÃO DA SILVA</nomeDoBeneficiario>");
    expect(xml).toContain("<cpfDoBeneficiario>12345678900</cpfDoBeneficiario>");
    expect(xml).toContain(
      "<numeroDoProcesso>0001234-12.2024.5.02.0001</numeroDoProcesso>",
    );
  });

  it("Datas convertidas para epoch ms BRT", () => {
    const xml = buildPjcXml(emptyData());
    // 2011-06-06 BRT 00:00 = UTC 03:00
    const adm = Date.UTC(2011, 5, 6, 3, 0, 0);
    expect(xml).toContain(`<dataAdmissao>${adm}</dataAdmissao>`);
    // 2024-03-15 BRT 00:00 = UTC 03:00
    const dem = Date.UTC(2024, 2, 15, 3, 0, 0);
    expect(xml).toContain(`<dataDemissao>${dem}</dataDemissao>`);
  });

  it("Sem demissão → <dataDemissao>null</dataDemissao>", () => {
    const data = emptyData();
    data.meta.data_demissao = null;
    const xml = buildPjcXml(data);
    expect(xml).toContain("<dataDemissao>null</dataDemissao>");
  });

  it("Coleções vazias geram Set self-closing ou vazio", () => {
    const xml = buildPjcXml(emptyData());
    // Set vazio: <historicosSalariais><Set/></historicosSalariais>
    expect(xml).toContain("<historicosSalariais><Set/></historicosSalariais>");
    expect(xml).toContain("<listaDeFerias><Set/></listaDeFerias>");
    expect(xml).toContain("<faltas><Set/></faltas>");
    expect(xml).toContain("<cartoesDePonto><Set/></cartoesDePonto>");
  });
});

describe("buildPjcXml — historicosSalariais", () => {
  it("Histórico com 1 ocorrência gera HistoricoSalarial + OcorrenciaDoHistoricoSalarial", () => {
    const data = emptyData();
    data.historicosSalariais.push({
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
      ],
    });
    const xml = buildPjcXml(data);
    expect(xml).toContain("<HistoricoSalarial>");
    expect(xml).toContain("<nome>Comissões</nome>");
    expect(xml).toContain("<incidenciaFGTS>true</incidenciaFGTS>");
    expect(xml).toContain("<OcorrenciaDoHistoricoSalarial>");
    // 08/2016 BRT = 1470020400000
    expect(xml).toContain("<dataOcorrencia>1470020400000</dataOcorrencia>");
    expect(xml).toContain("<valor>1158.82</valor>");
  });

  it("Histórico vazio é skipado (não vira HistoricoSalarial)", () => {
    const data = emptyData();
    data.historicosSalariais.push({
      nome: "Comissões",
      incidenciaFGTS: true,
      incidenciaINSS: true,
      aplicarProporcionalidadeFGTS: false,
      aplicarProporcionalidadeINSS: false,
      ocorrencias: [],
    });
    const xml = buildPjcXml(data);
    expect(xml).not.toContain("<HistoricoSalarial>");
  });

  it("InternalRef 1 nas referências para Calculo", () => {
    const data = emptyData();
    data.historicosSalariais.push({
      nome: "X",
      incidenciaFGTS: true,
      incidenciaINSS: true,
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
    });
    const xml = buildPjcXml(data);
    expect(xml).toContain("<calculo><Calculo><internalRef>1</internalRef></Calculo></calculo>");
  });
});

describe("buildPjcXml — listaDeFerias", () => {
  it("Férias gozadas geram período aquisitivo, concessivo e gozo1", () => {
    const data = emptyData();
    data.ferias.push({
      relativa: "2022/2023",
      prazo: 30,
      situacao: "GOZADAS",
      dobraGeral: false,
      abono: false,
      diasAbono: 0,
      gozo1: { inicio: "10/01/2024", fim: "08/02/2024", dobra: false },
      gozo2: null,
      gozo3: null,
      dataAdmissaoBase: "2011-06-06",
    });
    const xml = buildPjcXml(data);
    expect(xml).toContain("<Ferias>");
    expect(xml).toContain("<relativa>2022/2023</relativa>");
    expect(xml).toContain("<situacao>GOZADAS</situacao>");
    // Aquisitivo = 06/06/2022
    expect(xml).toContain(
      `<dataInicialDoPeriodoAquisitivo>${Date.UTC(2022, 5, 6, 3, 0, 0)}</dataInicialDoPeriodoAquisitivo>`,
    );
    // Gozo1 = 10/01/2024
    expect(xml).toContain(
      `<dataInicialDoPeriodoDeGozo1>${Date.UTC(2024, 0, 10, 3, 0, 0)}</dataInicialDoPeriodoDeGozo1>`,
    );
  });

  it("gozo2/3 nulos viram literal null", () => {
    const data = emptyData();
    data.ferias.push({
      relativa: "2022/2023",
      prazo: 30,
      situacao: "GOZADAS",
      dobraGeral: false,
      abono: false,
      diasAbono: 0,
      gozo1: { inicio: "10/01/2024", fim: "08/02/2024", dobra: false },
      gozo2: null,
      gozo3: null,
      dataAdmissaoBase: "2011-06-06",
    });
    const xml = buildPjcXml(data);
    expect(xml).toContain("<dataInicialDoPeriodoDeGozo2>null</dataInicialDoPeriodoDeGozo2>");
    expect(xml).toContain("<dataFinalDoPeriodoDeGozo3>null</dataFinalDoPeriodoDeGozo3>");
    expect(xml).toContain("<dobraDoPeriodoDeGozo2>false</dobraDoPeriodoDeGozo2>");
  });
});

describe("buildPjcXml — faltas", () => {
  it("Falta com justificativa", () => {
    const data = emptyData();
    data.faltas.push({
      data_inicial: "2023-05-10",
      data_final: "2023-05-12",
      justificada: true,
      reiniciaPeriodoAquisitivo: false,
      justificativa: "Atestado médico",
    });
    const xml = buildPjcXml(data);
    expect(xml).toContain("<Falta>");
    expect(xml).toContain("<justificada>true</justificada>");
    expect(xml).toContain("<justificativa>Atestado médico</justificativa>");
  });

  it("Falta sem justificativa → null literal", () => {
    const data = emptyData();
    data.faltas.push({
      data_inicial: "2023-05-10",
      data_final: "2023-05-10",
      justificada: false,
      reiniciaPeriodoAquisitivo: false,
      justificativa: null,
    });
    const xml = buildPjcXml(data);
    expect(xml).toContain("<justificativa>null</justificativa>");
  });
});

describe("buildPjcXml — cartoesDePonto", () => {
  it("Cartão com 2 dias gera CartaoDePonto + 2 ApuracaoDiariaCartao", () => {
    const data = emptyData();
    data.cartoesDePonto.push({
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
    });
    const xml = buildPjcXml(data);
    expect(xml).toContain("<CartaoDePonto>");
    expect(xml).toContain("<nome>Cartão 03/2024</nome>");
    // dataInicial = 2024-03-01
    expect(xml).toContain(
      `<dataInicial>${Date.UTC(2024, 2, 1, 3, 0, 0)}</dataInicial>`,
    );
    // 2 ApuracaoDiariaCartao
    const matches = xml.match(/<ApuracaoDiariaCartao>/g);
    expect(matches?.length).toBe(2);
    expect(xml).toContain("<ocorrencia>NORMAL</ocorrencia>");
    expect(xml).toContain("<ocorrencia>FOLGA</ocorrencia>");
    // Jornada com 2 marcações no dia normal
    expect(xml).toContain("<inicio>08:00</inicio>");
    expect(xml).toContain("<fim>17:00</fim>");
  });

  it("Cartão sem apuracoes é skipado", () => {
    const data = emptyData();
    data.cartoesDePonto.push({ nome: "Vazio", apuracoes: [] });
    const xml = buildPjcXml(data);
    expect(xml).not.toContain("<CartaoDePonto>");
  });
});
