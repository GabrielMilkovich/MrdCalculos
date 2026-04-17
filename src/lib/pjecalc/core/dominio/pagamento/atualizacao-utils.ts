/**
 * PJe-Calc v2.15.1 — AtualizacaoUtils
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.AtualizacaoUtils
 *
 * Ref Java: pjecalc-fonte/.../pagamento/AtualizacaoUtils.java
 *
 * Dois helpers usados para decidir se existe juros anterior aplicável ao
 * período e para calcular a `dataDe` que origina juros dentro do período.
 * As regras são diferentes para `TipoOrigemRegistroEnum.CALCULO` vs
 * `ATUALIZACAO`.
 */
import { HelperDate } from '../../base/comum/helper-date';
import type { Periodo } from '../../base/comum/periodo';
import { TipoOrigemRegistroEnum } from '../../constantes/enums';
import type { Calculo } from '../calculo/calculo';

interface CalculoExt {
  getDataDeLiquidacao?(): Date | null;
  isCalculoExterno?(): boolean;
}

/**
 * testarExistenciaJurosAnteriores (Java linha 14)
 *
 * Para origem CALCULO: retorna true se dataAPartirDe é null ou:
 *   - está antes/igual a dataDeLiquidacao (cálculo não externo), OU
 *   - está antes de dataInicialPeriodo (com restrições)
 *
 * Para origem ATUALIZACAO: retorna true se dataAPartirDe é null e o período
 * não coincide exatamente com dataEvento, OU dataAPartirDe está antes/igual
 * ao início do período e o fim do período não é a dataEvento.
 */
export function testarExistenciaJurosAnteriores(
  periodo: Periodo,
  origemRegistro: TipoOrigemRegistroEnum,
  calculo: Calculo,
  dataAPartirDe: Date | null,
  dataEvento: Date | null,
  primeiroProcessamento: boolean,
): boolean {
  const dataInicialPeriodo = periodo.getInicial();
  const dataFinalPeriodo = periodo.getFinal();
  const calcExt = calculo as unknown as CalculoExt;
  const dataLiq = calcExt.getDataDeLiquidacao?.() ?? null;
  const isExterno = calcExt.isCalculoExterno?.() ?? false;

  switch (origemRegistro) {
    case TipoOrigemRegistroEnum.CALCULO: {
      if (dataAPartirDe === null) return true;
      if (!dataLiq) return false;
      const antesDaLiqNormal = HelperDate.dateBeforeOrEquals(dataAPartirDe, dataLiq) && !isExterno;
      if (antesDaLiqNormal) return true;
      if (HelperDate.dateBefore(dataAPartirDe, dataInicialPeriodo)) {
        return !HelperDate.dateEquals(dataInicialPeriodo, dataLiq) || !primeiroProcessamento;
      }
      return false;
    }
    case TipoOrigemRegistroEnum.ATUALIZACAO: {
      if (!dataEvento) return false;
      if (dataAPartirDe === null) {
        return !HelperDate.dateEquals(dataFinalPeriodo, dataEvento) &&
               !HelperDate.dateEquals(dataInicialPeriodo, dataEvento);
      }
      return HelperDate.dateBeforeOrEquals(dataAPartirDe, dataInicialPeriodo) &&
             !HelperDate.dateEquals(dataFinalPeriodo, dataEvento);
    }
  }
  return false;
}

/**
 * testarExistenciaJurosDeAte (Java linha 35) — calcula a `dataDe` dos juros.
 *
 * Retorna a data a partir da qual os juros devem ser calculados dentro do
 * período, ou null se não há juros. Lógica replica ladder de condições do Java.
 */
export function testarExistenciaJurosDeAte(
  periodo: Periodo,
  dataInicialParaLiquidacaoMaisUm: Date,
  origemRegistro: TipoOrigemRegistroEnum,
  calculo: Calculo,
  dataAPartirDe: Date | null,
  dataEvento: Date | null,
  primeiroProcessamento: boolean,
): Date | null {
  const dataInicialPeriodo = periodo.getInicial();
  const dataFinalPeriodo = periodo.getFinal();
  const calcExt = calculo as unknown as CalculoExt;
  const dataLiq = calcExt.getDataDeLiquidacao?.() ?? null;

  if (origemRegistro === TipoOrigemRegistroEnum.CALCULO) {
    if (!dataLiq) return null;
    if (dataAPartirDe === null) return dataInicialParaLiquidacaoMaisUm;

    if (HelperDate.dateBefore(dataAPartirDe, dataInicialPeriodo)
      && HelperDate.dateEquals(dataInicialPeriodo, dataLiq)
      && primeiroProcessamento) {
      return HelperDate.dateEquals(dataInicialPeriodo, dataFinalPeriodo) ? null : dataInicialParaLiquidacaoMaisUm;
    }
    if (HelperDate.dateEquals(dataAPartirDe, dataInicialPeriodo)
      && HelperDate.dateEquals(dataInicialPeriodo, dataLiq)
      && primeiroProcessamento) {
      return dataInicialParaLiquidacaoMaisUm;
    }
    if (HelperDate.dateBefore(dataAPartirDe, dataInicialPeriodo)
      && HelperDate.dateEquals(dataInicialPeriodo, dataLiq)
      && !primeiroProcessamento) {
      return dataInicialParaLiquidacaoMaisUm;
    }
    if (HelperDate.dateBefore(dataAPartirDe, dataInicialPeriodo)
      && !HelperDate.dateEquals(dataInicialPeriodo, dataLiq)) {
      return dataInicialParaLiquidacaoMaisUm;
    }
    return HelperDate.dateBeforeOrEquals(dataAPartirDe, dataFinalPeriodo) ? dataAPartirDe : null;
  }

  // ATUALIZACAO
  if (!dataEvento) return null;
  if (dataAPartirDe === null) {
    return HelperDate.dateEquals(dataEvento, dataFinalPeriodo) ? null : dataInicialParaLiquidacaoMaisUm;
  }
  if (HelperDate.dateAfter(dataAPartirDe, dataFinalPeriodo)) return null;
  if (HelperDate.dateEquals(dataEvento, dataFinalPeriodo)
    || HelperDate.dateAfter(dataAPartirDe, dataInicialPeriodo)) {
    return dataAPartirDe;
  }
  return dataInicialParaLiquidacaoMaisUm;
}
