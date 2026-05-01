import { describe, expect, it } from "vitest";
import { buildPjcCalculoData } from "../../export/pjc/from-composicao";
import type {
  CategoriaIncidenciaConfig,
  ComposicaoFaltas,
  ComposicaoFerias,
  FeriasExtraida,
  LinhaHistoricoSalarial,
} from "../../types";
import type { ComposicaoCartoesPonto } from "../../composer/cartao-ponto";
import type { PjcMeta } from "../../export/pjc/builder";

const META: PjcMeta = {
  nome_beneficiario: "JOÃO",
  cpf: "12345678900",
  data_admissao: "2011-06-06",
  data_demissao: "2024-03-15",
  data_inicio_calculo: "2019-04-01",
  data_termino_calculo: "2024-03-15",
  data_ajuizamento: null,
  numero_processo: "0001234-12.2024.5.02.0001",
};

function cfg(overrides: Partial<CategoriaIncidenciaConfig> = {}): CategoriaIncidenciaConfig {
  return {
    case_id: "case-1",
    categoria_id: "cat-1",
    incide_fgts: true,
    fgts_recolhido: false,
    incide_inss: true,
    inss_recolhido: false,
    natureza_indenizatoria: false,
    ...overrides,
  };
}

const linhaHist = (competencia: string, valor: number): LinhaHistoricoSalarial => ({
  competencia,
  valor,
  documentos_origem: [],
});

const emptyFerias: ComposicaoFerias = { linhas: [], conflitos: [] };
const emptyFaltas: ComposicaoFaltas = { linhas: [], conflitos: [] };
const emptyCartoes: ComposicaoCartoesPonto = { cartoes: [], totalApuracoes: 0 };

describe("buildPjcCalculoData", () => {
  it("Histórico salarial com flags normais", () => {
    const data = buildPjcCalculoData({
      meta: META,
      historicos: [
        {
          nomePjecalc: "Comissões",
          linhas: [linhaHist("01/2024", 100), linhaHist("02/2024", 200)],
          config: cfg(),
        },
      ],
      ferias: emptyFerias,
      faltas: emptyFaltas,
      cartoes: emptyCartoes,
    });
    expect(data.historicosSalariais.length).toBe(1);
    const hs = data.historicosSalariais[0];
    expect(hs.nome).toBe("Comissões");
    expect(hs.incidenciaFGTS).toBe(true);
    expect(hs.incidenciaINSS).toBe(true);
    expect(hs.ocorrencias.length).toBe(2);
    expect(hs.ocorrencias[0].competencia).toBe("01/2024");
  });

  it("natureza_indenizatoria zera todas as flags", () => {
    const data = buildPjcCalculoData({
      meta: META,
      historicos: [
        {
          nomePjecalc: "Multa",
          linhas: [linhaHist("01/2024", 1000)],
          config: cfg({ natureza_indenizatoria: true, incide_fgts: true, incide_inss: true }),
        },
      ],
      ferias: emptyFerias,
      faltas: emptyFaltas,
      cartoes: emptyCartoes,
    });
    const hs = data.historicosSalariais[0];
    expect(hs.incidenciaFGTS).toBe(false);
    expect(hs.incidenciaINSS).toBe(false);
    expect(hs.ocorrencias[0].recolhidoFGTS).toBe(false);
    expect(hs.ocorrencias[0].recolhidoINSS).toBe(false);
  });

  it("Linhas vazias são filtradas (não vira HistoricoSalarial)", () => {
    const data = buildPjcCalculoData({
      meta: META,
      historicos: [{ nomePjecalc: "Vazio", linhas: [], config: cfg() }],
      ferias: emptyFerias,
      faltas: emptyFaltas,
      cartoes: emptyCartoes,
    });
    expect(data.historicosSalariais.length).toBe(0);
  });

  it("SituacaoFerias mapeada (G→GOZADAS, I→INDENIZADAS, etc)", () => {
    const ferias: FeriasExtraida[] = [
      {
        id: "1",
        document_id: "d1",
        case_id: "c1",
        relativa: "2022/2023",
        prazo: 30,
        situacao: "G",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: { inicio: "01/01/2024", fim: "30/01/2024", dobra: false },
        gozo2: null,
        gozo3: null,
        incluir: true,
      },
      {
        id: "2",
        document_id: "d1",
        case_id: "c1",
        relativa: "2023/2024",
        prazo: 30,
        situacao: "I",
        dobra_geral: false,
        abono: true,
        dias_abono: 10,
        gozo1: null,
        gozo2: null,
        gozo3: null,
        incluir: true,
      },
    ];
    const data = buildPjcCalculoData({
      meta: META,
      historicos: [],
      ferias: { linhas: ferias, conflitos: [] },
      faltas: emptyFaltas,
      cartoes: emptyCartoes,
    });
    expect(data.ferias[0].situacao).toBe("GOZADAS");
    expect(data.ferias[1].situacao).toBe("INDENIZADAS");
    expect(data.ferias[1].abono).toBe(true);
    expect(data.ferias[1].diasAbono).toBe(10);
    // dataAdmissaoBase derivada do meta
    expect(data.ferias[0].dataAdmissaoBase).toBe(META.data_admissao);
  });

  it("Faltas mapeadas com nomes corretos", () => {
    const data = buildPjcCalculoData({
      meta: META,
      historicos: [],
      ferias: emptyFerias,
      faltas: {
        linhas: [
          {
            id: "f1",
            document_id: "d1",
            case_id: "c1",
            data_inicio: "2023-05-10",
            data_fim: "2023-05-12",
            justificada: true,
            reiniciar_periodo_aquisitivo: false,
            justificativa: "Atestado",
            incluir: true,
          },
        ],
        conflitos: [],
      },
      cartoes: emptyCartoes,
    });
    expect(data.faltas[0].data_inicial).toBe("2023-05-10");
    expect(data.faltas[0].data_final).toBe("2023-05-12");
    expect(data.faltas[0].justificada).toBe(true);
    expect(data.faltas[0].justificativa).toBe("Atestado");
  });

  it("Cartões propagados como estão", () => {
    const cartoes: ComposicaoCartoesPonto = {
      cartoes: [
        {
          competencia: "03/2024",
          nome: "Cartão 03/2024",
          apuracoes: [
            {
              data: "2024-03-01",
              ocorrencia: "NORMAL",
              marcacoes: [{ e: "08:00", s: "12:00" }],
              observacao: null,
            },
          ],
        },
      ],
      totalApuracoes: 1,
    };
    const data = buildPjcCalculoData({
      meta: META,
      historicos: [],
      ferias: emptyFerias,
      faltas: emptyFaltas,
      cartoes,
    });
    expect(data.cartoesDePonto).toEqual(cartoes.cartoes);
  });
});
