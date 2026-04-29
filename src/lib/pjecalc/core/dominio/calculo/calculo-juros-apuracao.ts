/**
 * PJe-Calc v2.15.1 — Calculo apuracao juros helpers
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo
 *   - apurarInclusaoJurosContribuicaoSocial (Java linha 1816)
 *   - apurarInclusaoJurosPrevidenciaPrivada (Java linha 1873)
 *   - apurarVerbaIncideInssAvisoOuComum (Java linha 1977)
 *   - apurarVerbaIncideInssFerias (Java linha 1988)
 *   - apurarVerbaIncideInssDecimoTerceiro (Java linha 2001)
 *   - encontrarDescontoInssRelativoVerbasCompoemPrincipal (Java linha 1857)
 *   - encontrarDescontoPrevPrivRelativoVerbasCompoemPrincipal (Java linha 1865)
 *
 * Funcoes pure: recebem todas as dependencias como parametros, sem precisar
 * acessar `this.calculo`. Isso permite usar de Calculo.ts sem inflar o
 * arquivo principal (>1300 LOC).
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../base/comum/utils';

const ZERO = new Decimal(0);

/**
 * Java OcorrenciaDeInssSobreSalariosDevidos — subset usado aqui.
 * Quando a entidade core estiver completa, substituir pelo type real.
 */
export interface OcorrenciaInssInput {
  dataOcorrenciaInss: Date;
  ocorrenciaDecimoTerceiro: boolean;
  valorDevidoReclamanteCorrigido: Decimal | null;
  valorBaseVerbas: Decimal | null;
}

/** Java OcorrenciaDePrevidenciaPrivada — subset. */
export interface OcorrenciaPrevPrivInput {
  competencia: Date;
  valorDevidoCorrigido: Decimal | null;
  valorBase: Decimal | null;
}

/**
 * Java ApuracaoDeJuros — subset com getters/setters mutáveis.
 * O setter retorna o novo valor, util para somar.
 */
export interface ApuracaoDeJurosMut {
  valorVerbaParaContribuicaoSocial: Decimal;
  valorVerbaParaContribuicaoSocialDecimoTerceiro: Decimal;
  valorVerbaParaPrevidenciaPrivada: Decimal;
  contribuicaoSocialNormal: Decimal;
  contribuicaoSocialDecimoTerceiro: Decimal;
  previdenciaPrivada: Decimal;
}

/** Helper: chave de competencia (YYYY-MM-01). */
function compKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Java encontrarDescontoInssRelativoVerbasCompoemPrincipal (linha 1857).
 * Calcula valor de INSS proporcional as verbas que compoem o principal.
 */
export function encontrarDescontoInssRelativoVerbasCompoemPrincipal(
  totalVerbas: Decimal,
  oc: OcorrenciaInssInput,
): Decimal {
  let descontoInss = arredondarValorMonetario(oc.valorDevidoReclamanteCorrigido ?? ZERO);
  if (oc.valorBaseVerbas !== null && oc.valorBaseVerbas.gt(ZERO) && !totalVerbas.eq(oc.valorBaseVerbas)) {
    descontoInss = totalVerbas.times(descontoInss).div(oc.valorBaseVerbas);
  }
  return descontoInss;
}

/** Java encontrarDescontoPrevPrivRelativoVerbasCompoemPrincipal (linha 1865). */
export function encontrarDescontoPrevPrivRelativoVerbasCompoemPrincipal(
  totalVerbas: Decimal,
  oc: OcorrenciaPrevPrivInput,
): Decimal {
  let desconto = arredondarValorMonetario(oc.valorDevidoCorrigido ?? ZERO);
  if (oc.valorBase !== null && oc.valorBase.gt(ZERO) && !totalVerbas.eq(oc.valorBase)) {
    desconto = totalVerbas.times(desconto).div(oc.valorBase);
  }
  return desconto;
}

/**
 * Java apurarInclusaoJurosContribuicaoSocial (linha 1816).
 * Distribui o desconto INSS entre as ApuracoesDeJuros da competencia.
 *
 * Para 13o salario: usa valorVerbaParaContribuicaoSocialDecimoTerceiro como
 * peso. Para outras: usa valorVerbaParaContribuicaoSocial.
 */
export function apurarInclusaoJurosContribuicaoSocial(
  mapApuracoesPorCompetencia: Map<string, Set<ApuracaoDeJurosMut>>,
  ocorrenciaDeInss: OcorrenciaInssInput,
): void {
  const compKeyStr = compKey(ocorrenciaDeInss.dataOcorrenciaInss);
  const ocorrenciasDeJuros = mapApuracoesPorCompetencia.get(compKeyStr);
  if (!ocorrenciasDeJuros || ocorrenciasDeJuros.size === 0) return;

  if (ocorrenciaDeInss.ocorrenciaDecimoTerceiro) {
    let totalVerbasDecimoTerceiro = ZERO;
    for (const apur of ocorrenciasDeJuros) {
      totalVerbasDecimoTerceiro = totalVerbasDecimoTerceiro.plus(apur.valorVerbaParaContribuicaoSocialDecimoTerceiro);
    }
    const valorInssParaDesconto = encontrarDescontoInssRelativoVerbasCompoemPrincipal(totalVerbasDecimoTerceiro, ocorrenciaDeInss);

    for (const apur of ocorrenciasDeJuros) {
      const peso = apur.valorVerbaParaContribuicaoSocialDecimoTerceiro;
      if (peso.isZero() || ocorrenciaDeInss.valorDevidoReclamanteCorrigido === null) return;
      let dist = peso.times(valorInssParaDesconto);
      if (totalVerbasDecimoTerceiro.isZero()) continue;
      dist = dist.div(totalVerbasDecimoTerceiro);
      apur.contribuicaoSocialDecimoTerceiro = apur.contribuicaoSocialDecimoTerceiro.plus(dist);
    }
  } else {
    let totalVerbas = ZERO;
    for (const apur of ocorrenciasDeJuros) {
      totalVerbas = totalVerbas.plus(apur.valorVerbaParaContribuicaoSocial);
    }
    const valorInssParaDesconto = encontrarDescontoInssRelativoVerbasCompoemPrincipal(totalVerbas, ocorrenciaDeInss);

    for (const apur of ocorrenciasDeJuros) {
      const peso = apur.valorVerbaParaContribuicaoSocial;
      if (peso.isZero() || ocorrenciaDeInss.valorDevidoReclamanteCorrigido === null) return;
      let dist = peso.times(arredondarValorMonetario(valorInssParaDesconto));
      if (totalVerbas.isZero()) continue;
      dist = dist.div(totalVerbas);
      apur.contribuicaoSocialNormal = apur.contribuicaoSocialNormal.plus(dist);
    }
  }
}

/**
 * Java apurarInclusaoJurosPrevidenciaPrivada (linha 1873).
 * Distribui o desconto PrevPriv entre as ApuracoesDeJuros da competencia.
 */
export function apurarInclusaoJurosPrevidenciaPrivada(
  mapApuracoesPorCompetencia: Map<string, Set<ApuracaoDeJurosMut>>,
  ocorrenciaDePrevidenciaPrivada: OcorrenciaPrevPrivInput,
): void {
  const compKeyStr = compKey(ocorrenciaDePrevidenciaPrivada.competencia);
  const ocorrenciasDeJuros = mapApuracoesPorCompetencia.get(compKeyStr);
  if (!ocorrenciasDeJuros || ocorrenciasDeJuros.size === 0) return;

  let totalVerbas = ZERO;
  for (const apur of ocorrenciasDeJuros) {
    totalVerbas = totalVerbas.plus(apur.valorVerbaParaPrevidenciaPrivada);
  }
  const valorPrevPrivParaDesconto = encontrarDescontoPrevPrivRelativoVerbasCompoemPrincipal(totalVerbas, ocorrenciaDePrevidenciaPrivada);

  for (const apur of ocorrenciasDeJuros) {
    const peso = apur.valorVerbaParaPrevidenciaPrivada;
    if (peso.isZero() || ocorrenciaDePrevidenciaPrivada.valorDevidoCorrigido === null) continue;
    let dist = peso.times(valorPrevPrivParaDesconto);
    if (totalVerbas.isZero()) continue;
    dist = dist.div(totalVerbas);
    apur.previdenciaPrivada = apur.previdenciaPrivada.plus(dist);
  }
}

/**
 * Java apurarVerbaIncideInssAvisoOuComum (linha 1977).
 * Acumula valor da verba na ocorrenciaDeJuros + no map por competencia.
 */
export function apurarVerbaIncideInssAvisoOuComum(
  mapValorTotalPorCompetencia: Map<string, Decimal>,
  diferenca: Decimal,
  competenciaKey: string,
  ocorrenciaDeJuros: ApuracaoDeJurosMut,
): void {
  const dif = arredondarValorMonetario(diferenca);
  ocorrenciaDeJuros.valorVerbaParaContribuicaoSocial = ocorrenciaDeJuros.valorVerbaParaContribuicaoSocial.plus(dif);
  const cur = mapValorTotalPorCompetencia.get(competenciaKey) ?? ZERO;
  mapValorTotalPorCompetencia.set(competenciaKey, cur.plus(dif));
}

/**
 * Java apurarVerbaIncideInssFerias (linha 1988).
 * Para ferias usa diferencaParaCalculoDasIncidencias (subset gozadas).
 */
export function apurarVerbaIncideInssFerias(
  mapValorTotalPorCompetencia: Map<string, Decimal>,
  diferencaParaCalculoDasIncidencias: Decimal | null,
  competenciaKey: string,
  ocorrenciaDeJuros: ApuracaoDeJurosMut,
): void {
  if (diferencaParaCalculoDasIncidencias === null) return;
  const base = arredondarValorMonetario(diferencaParaCalculoDasIncidencias);
  ocorrenciaDeJuros.valorVerbaParaContribuicaoSocial = ocorrenciaDeJuros.valorVerbaParaContribuicaoSocial.plus(base);
  const cur = mapValorTotalPorCompetencia.get(competenciaKey) ?? ZERO;
  mapValorTotalPorCompetencia.set(competenciaKey, cur.plus(base));
}

/** Java apurarVerbaIncideInssDecimoTerceiro (linha 2001). */
export function apurarVerbaIncideInssDecimoTerceiro(
  mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro: Map<string, Decimal>,
  diferenca: Decimal,
  competenciaKey: string,
  ocorrenciaDeJuros: ApuracaoDeJurosMut,
): void {
  const dif = arredondarValorMonetario(diferenca);
  ocorrenciaDeJuros.valorVerbaParaContribuicaoSocialDecimoTerceiro =
    ocorrenciaDeJuros.valorVerbaParaContribuicaoSocialDecimoTerceiro.plus(dif);
  const cur = mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro.get(competenciaKey) ?? ZERO;
  mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro.set(competenciaKey, cur.plus(dif));
}

/** Cria um ApuracaoDeJurosMut zerado (Java new ApuracaoDeJuros). */
export function criarApuracaoDeJurosMut(): ApuracaoDeJurosMut {
  return {
    valorVerbaParaContribuicaoSocial: ZERO,
    valorVerbaParaContribuicaoSocialDecimoTerceiro: ZERO,
    valorVerbaParaPrevidenciaPrivada: ZERO,
    contribuicaoSocialNormal: ZERO,
    contribuicaoSocialDecimoTerceiro: ZERO,
    previdenciaPrivada: ZERO,
  };
}
