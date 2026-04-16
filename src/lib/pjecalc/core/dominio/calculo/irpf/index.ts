/**
 * Barrel do módulo calculo/irpf (Fase 7 do master plan).
 *
 * Ref: pjecalc-fonte/.../calculo/irpf/
 */
export { Irpf, type FaixaDeIrpf } from './irpf';
export { OcorrenciaDeIrpf } from './ocorrencia-de-irpf';
export { OcorrenciaDeIrpfAtualizacao } from './ocorrencia-de-irpf-atualizacao';
export { OcorrenciaDeIrpfPagamento } from './ocorrencia-de-irpf-pagamento';
export { ProporcoesIrpf, type CreditosDoReclamanteProporcoes } from './proporcoes-irpf';
export { ValoresCreditoReclamanteAnterior } from './valores-credito-reclamante-anterior';
export { TabelaDeJurosDeIrpf } from './tabela-de-juros-de-irpf';
export { MaquinaDeCalculoDeIrpf } from './maquina-de-calculo-de-irpf';
export type { Pagamento, CreditosDoReclamante, DebitosDoReclamante } from './maquina-de-calculo-de-irpf';
export {
  LegendaDaFormulaDoIrpf,
  INDICE_ANOS_ANTERIORES,
  INDICE_SEPARADO,
  INDICE_EXCLUSIVA,
  INDICE_NORMAL,
} from './legenda-da-formula-do-irpf';
