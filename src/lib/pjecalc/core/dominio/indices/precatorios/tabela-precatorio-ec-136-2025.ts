/**
 * PJe-Calc — Tabela IndicePrecatorioEC1362025
 *
 * Tabela mensal da EC 136/2025 (regime unificado de correção em precatório).
 * A popular via seed: para cada competência armazenamos a taxa "geral" + a taxa
 * do "período da graça" + quais índices prevaleceram (IPCA ou SELIC).
 */
import { IndiceMonetarioEnum } from '../../../constantes/enums';

export interface EntradaTabelaPrecatorioEC1362025 {
  ano: number;
  mes: number;
  taxa: number;
  taxaPeriodoDaGraca: number;
  indicePrevaleceu: IndiceMonetarioEnum;
  indicePrevaleceuPeriodoDaGraca: IndiceMonetarioEnum;
  taxaIpca: number;
  taxaSelic: number;
}

export const TABELA_PRECATORIO_EC_136_2025: readonly EntradaTabelaPrecatorioEC1362025[] = [];
