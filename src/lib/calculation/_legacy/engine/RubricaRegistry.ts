// =====================================================
// REGISTRY DE RUBRICAS - SEPARADO PARA EVITAR CIRCULAR DEPS
// =====================================================

import { Rubrica } from './RubricaEngine';
import {
  HorasExtras50,
  HorasExtras100,
  DSRHorasExtras,
  AdicionalNoturno,
  ReflexoFerias,
  Reflexo13,
  FGTS,
  MultaFGTS,
  INSSRubrica,
  IRRFRubrica,
} from './RubricaEngine';
import {
  SaldoSalario,
  AvisoPrevio,
  FeriasVencidas,
  FeriasProporcionais,
  DecimoTerceiroProporcional,
  FGTSRescisorio,
} from './RubricasRescisao';

export const RUBRICAS_REGISTRY: Map<string, new () => Rubrica> = new Map([
  ['HE50', HorasExtras50],
  ['HE100', HorasExtras100],
  ['DSR_HE', DSRHorasExtras],
  ['ADIC_NOT', AdicionalNoturno],
  ['REFL_FERIAS', ReflexoFerias],
  ['REFL_13', Reflexo13],
  ['FGTS', FGTS],
  ['MULTA_FGTS', MultaFGTS],
  ['INSS', INSSRubrica],
  ['IRRF', IRRFRubrica],
  ['SALDO_SAL', SaldoSalario],
  ['AVISO_PREVIO', AvisoPrevio],
  ['FERIAS_VENC', FeriasVencidas],
  ['FERIAS_PROP', FeriasProporcionais],
  ['DECIMO_PROP', DecimoTerceiroProporcional],
  ['FGTS_RESC', FGTSRescisorio],
]);

// Ordem de execução (DAG respeitada)
export const ORDEM_EXECUCAO = [
  'HE50', 'HE100', 'DSR_HE',
  'ADIC_NOT',
  'REFL_FERIAS', 'REFL_13',
  'FGTS', 'MULTA_FGTS',
  'SALDO_SAL', 'AVISO_PREVIO', 'FERIAS_VENC', 'FERIAS_PROP', 'DECIMO_PROP',
  'FGTS_RESC',
  'INSS', 'IRRF',
];
