import type {
  PjeLiquidacaoResult,
  PjeVerbaResult,
  PjeOcorrenciaResult,
  PjeFGTSResult,
  PjeSeguroResult,
  PjeResumo,
} from "../engine-types";
import type { DadosProcesso } from "./types";
import type { JasperRenderOptions } from "./jasper-client";

interface JasperPeriodo {
  inicial: string;
  fim: string;
}

function periodoFromStrings(inicio?: string, fim?: string): JasperPeriodo {
  return {
    inicial: inicio ?? "",
    fim: fim ?? "",
  };
}

function mapOcorrencia(oc: PjeOcorrenciaResult): Record<string, unknown> {
  return {
    periodo: periodoFromStrings(oc.competencia, oc.competencia),
    base: oc.base,
    divisor: oc.divisor,
    multiplicador: oc.multiplicador,
    quantidade: oc.quantidade,
    dobra: oc.dobra > 0 ? String(oc.dobra) : "",
    devido: oc.devido,
    pago: oc.pago,
    diferenca: oc.diferenca,
    indiceAcumulado: oc.indice_correcao,
    valorCorrigido: oc.valor_corrigido,
  };
}

function mapVerba(
  v: PjeVerbaResult,
  dados: DadosProcesso,
): Record<string, unknown> {
  return {
    nome: v.nome,
    periodo: periodoFromStrings(
      dados.dataInicioCalculo,
      dados.dataFimCalculo,
    ),
    incidencia: v.caracteristica || "",
    formula: v.ocorrencias[0]?.formula ?? "",
    totalDoValorCorrigido: v.total_corrigido,
    comentario: "",
    ocorrencias: v.ocorrencias.map(mapOcorrencia),
  };
}

export function mapToDemonstrativo(
  result: PjeLiquidacaoResult,
  dados: DadosProcesso,
): JasperRenderOptions {
  const verbas = result.verbas.map((v) => mapVerba(v, dados));
  return {
    template: "calculo/calculo-demonstrativo",
    data: JSON.stringify(verbas),
  };
}

export function mapToFGTS(
  result: PjeLiquidacaoResult,
): JasperRenderOptions {
  const fgts: PjeFGTSResult = result.fgts;
  return {
    template: "calculo/calculo-fgts",
    params: {
      fgts: {
        totalDepositado: fgts.total_depositos,
        totalSacado: fgts.saldo_deduzido,
        totalDoFgts: fgts.total_fgts,
        totalMultaFgts: fgts.multa_valor,
        totalMultaArt467: 0,
        totalGeral: fgts.total_fgts + fgts.multa_valor,
        fgtsComMulta: fgts.multa_valor > 0,
        fgtsComMultaDoArtigo467: false,
        fgtsComMultaDaLei110: fgts.lc110_10 > 0 || fgts.lc110_05 > 0,
        ocorrencias: fgts.depositos.map((d) => ({
          competencia: d.competencia,
          base: d.base,
          aliquota: d.aliquota,
          devidoFgts: d.valor,
          pagoFgts: 0,
          diferenca: d.valor,
          indiceCorrecao: 1.0,
          valorCorrigido: d.valor,
        })),
        operacoes: [],
        ocorrenciasComContribuicaoSocial: [],
      },
    },
    data: "{}",
  };
}

export function mapToSeguroDesemprego(
  result: PjeLiquidacaoResult,
): JasperRenderOptions {
  const seg: PjeSeguroResult = result.seguro_desemprego;
  return {
    template: "calculo/calculo-seguro-desemprego",
    params: {
      seguroDesemprego: {
        quantidadeDeParcelas: seg.parcelas,
        totalDoPeriodoAquisitivo: 0,
        totalDoSeguroDesemprego: seg.total,
        parcelas: Array.from({ length: seg.parcelas }, (_, i) => ({
          numeroParcela: i + 1,
          competencia: "",
          valor: seg.valor_parcela,
          indiceCorrecao: 1.0,
          valorCorrigido: seg.valor_parcela,
        })),
      },
    },
    data: "{}",
  };
}

export function mapToResumo(
  result: PjeLiquidacaoResult,
  dados: DadosProcesso,
): JasperRenderOptions {
  const r: PjeResumo = result.resumo;
  return {
    template: "calculo/resumo/calculo-resumo",
    params: {
      resumo: {
        totalBrutoDevidoReclamante: r.principal_bruto,
        totalCreditoReclamante: r.principal_corrigido + r.juros_mora,
        totalDebitoReclamante: r.cs_segurado + r.ir_retido,
        totalDebitoReclamado:
          r.principal_corrigido +
          r.juros_mora +
          r.cs_empregador +
          r.fgts_total,
        totalCustas: r.custas,
        ocorrenciasBrutoDevidoReclamante: [],
        ocorrenciasDebitoReclamante: [],
        ocorrenciasDebitoReclamado: [],
        ocorrenciasCreditoReclamante: [],
        ocorrenciasVerbasForaDoPrincipal: [],
        ocorrenciasDebitoCobrarReclamante: [],
      },
    },
    data: "{}",
  };
}

export function mapToConsolidado(
  result: PjeLiquidacaoResult,
  dados: DadosProcesso,
): JasperRenderOptions {
  const demonstrativo = mapToDemonstrativo(result, dados);
  const resumo = mapToResumo(result, dados);
  const fgts = mapToFGTS(result);

  return {
    template: "calculo/consolidado/consolidado",
    params: {
      consolidado: {
        numeroDoProcesso: dados.processo ?? "",
        numeroDoCalculo: dados.calculoId?.toString() ?? "1",
        reclamante: dados.cliente ?? "",
        reclamado: dados.reclamado ?? "",
        dataDeAjuizamento: dados.dataAjuizamento ?? "",
        dataDaLiquidacao: dados.dataLiquidacao ?? result.data_liquidacao,
        periodoDeCalculo: periodoFromStrings(
          dados.dataInicioCalculo,
          dados.dataFimCalculo,
        ),
        comentarios: "",

        mostrarDemonstrativo: result.verbas.length > 0,
        mostrarResumo: true,
        mostrarResumoPrecatorio: false,
        mostrarDemonstrativoFGTS: result.fgts.total_fgts > 0,
        mostrarDemonstrativoINSS:
          result.contribuicao_social.total_segurado > 0,
        mostrarDemonstrativoEsocialInssFgts: false,
        mostrarSeguroDesemprego: result.seguro_desemprego.apurado,
        mostrarSalarioFamilia: result.salario_familia?.total > 0,
        mostrarApuracaoDeJuros: false,
        mostrarMulta: false,
        mostrarHonorario: false,
        mostrarIrpf: result.imposto_renda.imposto_devido > 0,
        mostrarCustas: result.resumo.custas > 0,
        mostrarJustificativas: false,
        mostrarPensaoAlimenticia: false,
        mostrarPrevidenciaPrivada: false,
        mostrarComentarios: false,

        demonstrativo: {
          verbas: result.verbas.map((v) => mapVerba(v, dados)),
        },
        resumo: resumo.params?.resumo ?? {},
        demonstrativoFGTS: fgts.params?.fgts ?? {},
        justificativa: { ocorrencias: [] },
        emptyDS: [],
      },
    },
    data: "{}",
  };
}

export type JasperTemplateId =
  | "demonstrativo"
  | "resumo"
  | "fgts"
  | "consolidado"
  | "seguro-desemprego";

export function mapResultToJasper(
  templateId: JasperTemplateId,
  result: PjeLiquidacaoResult,
  dados: DadosProcesso,
): JasperRenderOptions {
  switch (templateId) {
    case "demonstrativo":
      return mapToDemonstrativo(result, dados);
    case "resumo":
      return mapToResumo(result, dados);
    case "fgts":
      return mapToFGTS(result);
    case "consolidado":
      return mapToConsolidado(result, dados);
    case "seguro-desemprego":
      return mapToSeguroDesemprego(result);
  }
}
