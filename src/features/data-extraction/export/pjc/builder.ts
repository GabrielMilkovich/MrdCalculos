/**
 * Builder do XML do arquivo .pjc.
 *
 * Estrutura mapeada do .pjc real (TRT-8 fonte decompilado + amostras):
 *   <Calculo>
 *     <metadados>
 *     <historicosSalariais><Set><HistoricoSalarial>...
 *     <listaDeFerias><Set><Ferias>...
 *     <faltas><Set><Falta>...
 *     <cartoesDePonto><Set><CartaoDePonto>...
 *     <apuracoesDiariasCartaoDePonto><Set><ApuracaoDiariaCartao>...
 *
 * IDs `internalRef` são arbitrários (1..N) — quando importa, o PJe-Calc
 * reatribui. Mantemos sequência única dentro do arquivo para integridade.
 *
 * NOTA DE RISCO: a estrutura de `<Falta>`, `<CartaoDePonto>` e
 * `<ApuracaoDiariaCartao>` foi mapeada do XML real mas não confirmada
 * no fonte Java. Se o PJe-Calc rejeitar, ajustar conforme o erro.
 */

import { XMLBuilder, type XMLNode } from "./xml-builder";
import { competenciaToEpochMs, isoToEpochMs } from "./encoding";

const CALCULO_INTERNAL_REF = 1; // sempre 1 no .pjc gerado

// =====================================================
// Tipos do payload (espelho do que o builder consome)
// =====================================================

export type PjcMeta = {
  nome_beneficiario: string;
  cpf: string;
  data_admissao: string; // ISO yyyy-mm-dd
  data_demissao: string | null;
  data_inicio_calculo: string;
  data_termino_calculo: string;
  data_ajuizamento: string | null;
  numero_processo: string;
};

export type PjcOcorrenciaHistorico = {
  competencia: string; // "MM/yyyy"
  valor: number;
  recolhidoFGTS: boolean;
  recolhidoINSS: boolean;
};

export type PjcHistoricoSalarial = {
  nome: string; // ex: "Comissões"
  incidenciaFGTS: boolean;
  incidenciaINSS: boolean;
  aplicarProporcionalidadeFGTS: boolean;
  aplicarProporcionalidadeINSS: boolean;
  ocorrencias: PjcOcorrenciaHistorico[];
};

export type PjcGozo = {
  inicio: string; // dd/MM/yyyy
  fim: string;
  dobra: boolean;
};

export type PjcFerias = {
  relativa: string; // aaaa/aaaa
  prazo: number;
  situacao: "GOZADAS" | "GOZADAS_PARCIALMENTE" | "NAO_GOZADAS" | "INDENIZADAS" | "PERDIDAS";
  dobraGeral: boolean;
  abono: boolean;
  diasAbono: number;
  gozo1: PjcGozo | null;
  gozo2: PjcGozo | null;
  gozo3: PjcGozo | null;
  /** Data base p/ derivar período aquisitivo (admissão do contrato). */
  dataAdmissaoBase: string; // ISO yyyy-mm-dd
};

export type PjcFalta = {
  data_inicial: string; // ISO yyyy-mm-dd
  data_final: string;
  justificada: boolean;
  reiniciaPeriodoAquisitivo: boolean;
  justificativa: string | null;
};

export type PjcMarcacao = { e: string; s: string };

export type PjcApuracaoDiaria = {
  data: string; // ISO yyyy-mm-dd
  ocorrencia: "NORMAL" | "FALTA" | "FERIADO" | "FOLGA" | "FERIAS" | "ATESTADO" | "LICENCA_MEDICA";
  marcacoes: PjcMarcacao[];
};

export type PjcCartaoPonto = {
  nome: string;
  apuracoes: PjcApuracaoDiaria[];
};

export type PjcCalculoData = {
  meta: PjcMeta;
  historicosSalariais: PjcHistoricoSalarial[];
  ferias: PjcFerias[];
  faltas: PjcFalta[];
  cartoesDePonto: PjcCartaoPonto[];
};

// =====================================================
// Builder principal
// =====================================================

export function buildPjcXml(data: PjcCalculoData): string {
  const x = new XMLBuilder();
  x.declaration("1.0", "ISO-8859-1");

  const root = x.element("Calculo");

  // Metadados básicos do cálculo
  root.elementText("id", String(CALCULO_INTERNAL_REF));
  root.elementText("versao", "1");
  root.elementText("numeroDoProcesso", data.meta.numero_processo);
  root.elementText("nomeDoBeneficiario", data.meta.nome_beneficiario);
  root.elementText("cpfDoBeneficiario", data.meta.cpf);
  root.elementText("dataAdmissao", String(isoToEpochMs(data.meta.data_admissao)));
  if (data.meta.data_demissao) {
    root.elementText("dataDemissao", String(isoToEpochMs(data.meta.data_demissao)));
  } else {
    root.elementText("dataDemissao", null);
  }
  root.elementText("dataInicioCalculo", String(isoToEpochMs(data.meta.data_inicio_calculo)));
  root.elementText("dataTerminoCalculo", String(isoToEpochMs(data.meta.data_termino_calculo)));
  if (data.meta.data_ajuizamento) {
    root.elementText("dataAjuizamento", String(isoToEpochMs(data.meta.data_ajuizamento)));
  } else {
    root.elementText("dataAjuizamento", null);
  }

  // Históricos salariais
  let nextHsId = 6000;
  let nextOcId = 150000;
  const hsList = root.element("historicosSalariais").element("Set");
  for (const hs of data.historicosSalariais) {
    if (hs.ocorrencias.length === 0) continue; // skip vazios
    const hsId = nextHsId++;
    const hsEl = hsList.element("HistoricoSalarial");
    hsEl.elementText("id", String(hsId));
    hsEl.elementText("versao", "1");
    hsEl.elementText("nome", hs.nome);
    hsEl.elementText("tipoVariacaoParcela", "VARIAVEL");
    hsEl.elementText("incidenciaFGTS", hs.incidenciaFGTS);
    hsEl.elementText("aplicarProporcionalidadeFGTS", hs.aplicarProporcionalidadeFGTS);
    hsEl.elementText("incidenciaINSS", hs.incidenciaINSS);
    hsEl.elementText("aplicarProporcionalidadeINSS", hs.aplicarProporcionalidadeINSS);
    addInternalRef(hsEl.element("calculo").element("Calculo"), CALCULO_INTERNAL_REF);

    const ocList = hsEl.element("ocorrencias").element("List");
    for (const oc of hs.ocorrencias) {
      const ocId = nextOcId++;
      const ocEl = ocList.element("OcorrenciaDoHistoricoSalarial");
      ocEl.elementText("id", String(ocId));
      ocEl.elementText("versao", "1");
      ocEl.elementText("dataOcorrencia", String(competenciaToEpochMs(oc.competencia)));
      ocEl.elementText("valor", oc.valor.toFixed(2));
      ocEl.elementText("recolhidoFGTS", oc.recolhidoFGTS);
      ocEl.elementText("recolhidoINSS", oc.recolhidoINSS);
      ocEl.elementText("incidenciaFGTS", hs.incidenciaFGTS);
      ocEl.elementText("incidenciaINSS", hs.incidenciaINSS);
      addInternalRef(
        ocEl.element("historicoSalarial").element("HistoricoSalarial"),
        hsId,
      );
    }
  }

  // Férias
  let nextFeriasId = 8000;
  const feriasList = root.element("listaDeFerias").element("Set");
  for (const f of data.ferias) {
    const fId = nextFeriasId++;
    const fEl = feriasList.element("Ferias");
    fEl.elementText("id", String(fId));
    fEl.elementText("versao", "1");
    fEl.elementText("relativa", f.relativa);

    // Períodos aquisitivo e concessivo derivados de relativa + dataAdmissaoBase.
    const { aquisitivoIni, aquisitivoFim, concessivoIni, concessivoFim } =
      derivarPeriodosFerias(f.relativa, f.dataAdmissaoBase);
    fEl.elementText("dataInicialDoPeriodoAquisitivo", String(aquisitivoIni));
    fEl.elementText("dataFinalDoPeriodoAquisitivo", String(aquisitivoFim));
    fEl.elementText("dataInicialDoPeriodoConcessivo", String(concessivoIni));
    fEl.elementText("dataFinalDoPeriodoConcessivo", String(concessivoFim));

    fEl.elementText("prazo", String(f.prazo));
    fEl.elementText("situacao", f.situacao);
    fEl.elementText("dobraGeral", f.dobraGeral);
    fEl.elementText("abono", f.abono);
    fEl.elementText("quantidadeDiasAbono", String(f.diasAbono));

    addGozoToXml(fEl, "1", f.gozo1);
    addGozoToXml(fEl, "2", f.gozo2);
    addGozoToXml(fEl, "3", f.gozo3);

    addInternalRef(fEl.element("calculo").element("Calculo"), CALCULO_INTERNAL_REF);
  }

  // Faltas
  let nextFaltaId = 9000;
  const faltasList = root.element("faltas").element("Set");
  for (const ft of data.faltas) {
    const fId = nextFaltaId++;
    const fEl = faltasList.element("Falta");
    fEl.elementText("id", String(fId));
    fEl.elementText("versao", "1");
    fEl.elementText("dataInicial", String(isoToEpochMs(ft.data_inicial)));
    fEl.elementText("dataFinal", String(isoToEpochMs(ft.data_final)));
    fEl.elementText("justificada", ft.justificada);
    fEl.elementText("reiniciaPeriodoAquisitivo", ft.reiniciaPeriodoAquisitivo);
    if (ft.justificativa) {
      fEl.elementText("justificativa", ft.justificativa);
    } else {
      fEl.elementText("justificativa", null);
    }
    addInternalRef(fEl.element("calculo").element("Calculo"), CALCULO_INTERNAL_REF);
  }

  // Cartões de ponto
  let nextCpId = 10000;
  let nextApuracaoId = 200000;
  const cpList = root.element("cartoesDePonto").element("Set");
  const apList = root.element("apuracoesDiariasCartaoDePonto").element("Set");

  for (const cp of data.cartoesDePonto) {
    if (cp.apuracoes.length === 0) continue;
    const cpId = nextCpId++;
    const cpEl = cpList.element("CartaoDePonto");
    cpEl.elementText("id", String(cpId));
    cpEl.elementText("versao", "1");
    cpEl.elementText("nome", cp.nome);
    cpEl.elementText("dataInicial", String(isoToEpochMs(cp.apuracoes[0].data)));
    cpEl.elementText(
      "dataFinal",
      String(isoToEpochMs(cp.apuracoes[cp.apuracoes.length - 1].data)),
    );
    addInternalRef(cpEl.element("calculo").element("Calculo"), CALCULO_INTERNAL_REF);

    for (const apuracao of cp.apuracoes) {
      const apId = nextApuracaoId++;
      const apEl = apList.element("ApuracaoDiariaCartao");
      apEl.elementText("id", String(apId));
      apEl.elementText("versao", "1");
      apEl.elementText("data", String(isoToEpochMs(apuracao.data)));
      apEl.elementText("ocorrencia", apuracao.ocorrencia);

      const jornadaEl = apEl.element("jornadaCumprida").element("List");
      for (const m of apuracao.marcacoes) {
        const jEl = jornadaEl.element("Jornada");
        jEl.elementText("inicio", m.e);
        jEl.elementText("fim", m.s);
      }

      addInternalRef(apEl.element("cartaoDePonto").element("CartaoDePonto"), cpId);
    }
  }

  return x.toString();
}

// =====================================================
// Helpers
// =====================================================

function addInternalRef(node: XMLNode, ref: number): void {
  node.elementText("internalRef", String(ref));
}

function addGozoToXml(parent: XMLNode, idx: "1" | "2" | "3", gozo: PjcGozo | null): void {
  if (!gozo) {
    parent.elementText(`dataInicialDoPeriodoDeGozo${idx}`, null);
    parent.elementText(`dataFinalDoPeriodoDeGozo${idx}`, null);
    parent.elementText(`dobraDoPeriodoDeGozo${idx}`, false);
    return;
  }
  parent.elementText(
    `dataInicialDoPeriodoDeGozo${idx}`,
    String(brToEpochMs(gozo.inicio)),
  );
  parent.elementText(
    `dataFinalDoPeriodoDeGozo${idx}`,
    String(brToEpochMs(gozo.fim)),
  );
  parent.elementText(`dobraDoPeriodoDeGozo${idx}`, gozo.dobra);
}

/**
 * Converte dd/MM/yyyy → epoch ms 00:00 BRT.
 */
export function brToEpochMs(br: string): number {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return 0;
  return Date.UTC(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10), 3, 0, 0);
}

/**
 * Deriva períodos aquisitivo e concessivo a partir da `relativa` e da
 * data de admissão do contrato.
 *
 * Período aquisitivo = 12 meses contados a partir da data-base de cada
 * "ano de relativa". A data-base é o aniversário da admissão.
 *
 * Exemplo: admissão 06/06/2011, relativa "2022/2023":
 *   aquisitivo = 06/06/2022 a 05/06/2023
 *   concessivo = 06/06/2023 a 05/06/2024 (12 meses após)
 */
export function derivarPeriodosFerias(
  relativa: string,
  dataAdmissaoIso: string,
): {
  aquisitivoIni: number;
  aquisitivoFim: number;
  concessivoIni: number;
  concessivoFim: number;
} {
  const m = relativa.match(/^(\d{4})\s*\/\s*(\d{4})$/);
  const adm = dataAdmissaoIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || !adm) {
    return { aquisitivoIni: 0, aquisitivoFim: 0, concessivoIni: 0, concessivoFim: 0 };
  }
  const anoIni = parseInt(m[1], 10);
  const mesAdm = parseInt(adm[2], 10);
  const diaAdm = parseInt(adm[3], 10);

  // Aquisitivo: anoIni-mesAdm-diaAdm a anoIni+1-mesAdm-(diaAdm-1)
  const aquisitivoIni = Date.UTC(anoIni, mesAdm - 1, diaAdm, 3, 0, 0);
  const aquisitivoFim = Date.UTC(anoIni + 1, mesAdm - 1, diaAdm - 1, 3, 0, 0);
  // Concessivo: 12 meses após o aquisitivo
  const concessivoIni = Date.UTC(anoIni + 1, mesAdm - 1, diaAdm, 3, 0, 0);
  const concessivoFim = Date.UTC(anoIni + 2, mesAdm - 1, diaAdm - 1, 3, 0, 0);

  return { aquisitivoIni, aquisitivoFim, concessivoIni, concessivoFim };
}
