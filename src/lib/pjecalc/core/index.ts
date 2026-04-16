/**
 * PJe-Calc Core — Barrel exports
 *
 * Porte 1:1 de PJe-Calc v2.15.1 em TypeScript. Ver MAPPING.md para status detalhado.
 */

// ────────────── base/comum ──────────────
export * from './base/comum/utils';
export { HelperDate, JANUARY, FEBRUARY, MARCH, APRIL, MAY, JUNE, JULY, AUGUST,
         SEPTEMBER, OCTOBER, NOVEMBER, DECEMBER } from './base/comum/helper-date';
export { Periodo } from './base/comum/periodo';

// ────────────── constantes ──────────────
export * from './constantes/enums';

// ────────────── comum ──────────────
export * from './comum/rotinasdecalculo/calculador-de-indices';
export { PeriodoDeJuros } from './comum/periodo-de-juros';

// ────────────── dominio/indices ──────────────
export type { IndiceDeCalculo } from './dominio/indices/indice-de-calculo';
export { IndiceBase } from './dominio/indices/indice-base';
export { IndiceIPCAE } from './dominio/indices/ipcae/indice-ipcae';
export { TABELA_IPCAE } from './dominio/indices/ipcae/tabela-ipcae';
export type { EntradaTabelaIPCAE } from './dominio/indices/ipcae/tabela-ipcae';
export { IndiceSemCorrecao } from './dominio/indices/indice-sem-correcao';

// Outros índices mensais (IPCA, INPC, IPC, TR, IGPM) — tabelas a popular via seed
export { IndiceIPCA } from './dominio/indices/ipca/indice-ipca';
export { TABELA_IPCA } from './dominio/indices/ipca/tabela-ipca';
export type { EntradaTabelaIPCA } from './dominio/indices/ipca/tabela-ipca';
export { IndiceINPC } from './dominio/indices/inpc/indice-inpc';
export { TABELA_INPC } from './dominio/indices/inpc/tabela-inpc';
export type { EntradaTabelaINPC } from './dominio/indices/inpc/tabela-inpc';
export { IndiceIPC } from './dominio/indices/ipc/indice-ipc';
export { TABELA_IPC } from './dominio/indices/ipc/tabela-ipc';
export type { EntradaTabelaIPC } from './dominio/indices/ipc/tabela-ipc';
export { IndiceTR } from './dominio/indices/tr/indice-tr';
export { TABELA_TR } from './dominio/indices/tr/tabela-tr';
export type { EntradaTabelaTR } from './dominio/indices/tr/tabela-tr';
export { IndiceIGPM } from './dominio/indices/igpm/indice-igpm';
export { TABELA_IGPM } from './dominio/indices/igpm/tabela-igpm';
export type { EntradaTabelaIGPM } from './dominio/indices/igpm/tabela-igpm';

// Índices diários (SELIC BCB + SELIC Fazenda + JAM)
export { IndiceSelicDiaria } from './dominio/indices/selic/indice-selic-diaria';
export { TABELA_SELIC_DIARIA } from './dominio/indices/selic/tabela-selic-diaria';
export type { EntradaTabelaSelicDiaria } from './dominio/indices/selic/tabela-selic-diaria';
export { IndiceSelicFazenda } from './dominio/indices/selic/indice-selic-fazenda';
export { TABELA_SELIC_FAZENDA } from './dominio/indices/selic/tabela-selic-fazenda';
export { IndiceJAM } from './dominio/indices/jam/indice-jam';
export { TABELA_JAM } from './dominio/indices/jam/tabela-jam';
export type { EntradaTabelaJAM } from './dominio/indices/jam/tabela-jam';

// Índices combinados / especiais
export { IndiceIPCAETR } from './dominio/indices/ipcatr/indice-ipcae-tr';
export { TABELA_IPCAETR } from './dominio/indices/ipcatr/tabela-ipcae-tr';
export { IndiceDevedorFazenda } from './dominio/indices/dfp/indice-devedor-fazenda';
export { TABELA_DEVEDOR_FAZENDA } from './dominio/indices/dfp/tabela-devedor-fazenda';
export { IndiceIndebitoTributario } from './dominio/indices/it/indice-indebito-tributario';
export { TABELA_INDEBITO_TRIBUTARIO } from './dominio/indices/it/tabela-indebito-tributario';

// Tabela Única (CNJ)
export { IndiceTabelaUnicaJTMensal } from './dominio/indices/tabelaunica/indice-tabela-unica-jt-mensal';
export { TABELA_UNICA_JT_MENSAL } from './dominio/indices/tabelaunica/tabela-unica-jt-mensal';
export { IndiceTabelaUnicaJTDiario } from './dominio/indices/tabelaunica/indice-tabela-unica-jt-diario';
export { TABELA_UNICA_JT_DIARIO } from './dominio/indices/tabelaunica/tabela-unica-jt-diario';
export { IndiceTabelaUnicaDebitoTrabalhista } from './dominio/indices/tabelaunica/indice-tabela-unica-debito-trabalhista';
export { TABELA_UNICA_DEBITO_TRABALHISTA } from './dominio/indices/tabelaunica/tabela-unica-debito-trabalhista';

// ────────────── dominio/inss/faixas ──────────────
export {
  FaixaPrevidenciaria,
  PrimeiraFaixaPrevidenciaria,
  SegundaFaixaPrevidenciaria,
  TerceiraFaixaPrevidenciaria,
  QuartaFaixaPrevidenciaria,
  QuintaFaixaPrevidenciaria,
  calcularInssProgressivo,
} from './dominio/inss/faixas/faixa-previdenciaria';

// ────────────── dominio/ocorrenciaverba ──────────────
export {
  OcorrenciaDeVerba,
  ATRIBUTO_QUANTIDADE,
  ATRIBUTO_PAGO,
  ATRIBUTO_DEVIDO,
} from './dominio/ocorrenciaverba/ocorrencia-de-verba';
export type { IVerbaDeCalculoRef, IFeriasRef } from './dominio/ocorrenciaverba/ocorrencia-de-verba';

// ────────────── dominio/formula ──────────────
export {
  Formula, FormulaCalculada, FormulaInformada, FormulaReflexo,
} from './dominio/formula/formula';
export type { BaseTabelada, BaseVerba, ItemBaseVerba, Divisor, Multiplicador, Quantidade, ValorPago } from './dominio/formula/formula';

// ────────────── dominio/verbacalculo ──────────────
export { TabelaDeCorrecaoMonetaria } from './dominio/verbacalculo/tabela-de-correcao-monetaria';
export type { ITabelaCorrecaoContext } from './dominio/verbacalculo/tabela-de-correcao-monetaria';
export { TabelaDeCorrecaoMonetariaUtils } from './dominio/verbacalculo/tabela-de-correcao-monetaria-utils';
export { MaquinaDeCalculoDeCorrecaoMonetaria } from './dominio/verbacalculo/maquina-de-calculo-de-correcao-monetaria';
export { calcularValorDevidoDaOcorrencia } from './dominio/verbacalculo/maquina-de-calculo';

// ────────────── dominio/calculo/atualizacao ──────────────
export { CombinacaoDeIndice } from './dominio/calculo/atualizacao/combinacao-de-indice';
export { CombinacaoDeJuros } from './dominio/calculo/atualizacao/combinacao-de-juros';
export { ParametrosDeAtualizacao } from './dominio/calculo/atualizacao/parametros-de-atualizacao';
export { ParametrosDeAtualizacaoUtils } from './dominio/calculo/atualizacao/parametros-de-atualizacao-utils';

// ────────────── comum/tabela-de-juros ──────────────
export { construirPeriodosDeJuros, calcularTaxaDeJurosTotal } from './comum/tabela-de-juros';
export type { ITabelaDeJurosContext } from './comum/tabela-de-juros';

// ────────────── dominio/verbacalculo (VerbaDeCalculo) ──────────────
export { VerbaDeCalculo } from './dominio/verbacalculo/verba-de-calculo';

// ────────────── dominio/calculo (Calculo orquestrador) ──────────────
export { Calculo } from './dominio/calculo/calculo';
export type { IModuloLiquidavel } from './dominio/calculo/calculo';

// ────────────── dominio/calculo/fgts ──────────────
export { Fgts } from './dominio/calculo/fgts/fgts';
export type { OcorrenciaDeFgts } from './dominio/calculo/fgts/fgts';

// ────────────── dominio/calculo/inss ──────────────
export { Inss } from './dominio/calculo/inss/inss';
export type { OcorrenciaDeInss } from './dominio/calculo/inss/inss';

// ────────────── dominio/calculo/irpf ──────────────
export { Irpf } from './dominio/calculo/irpf/irpf';
export type { FaixaDeIrpf } from './dominio/calculo/irpf/irpf';

// ────────────── dominio/calculo/ferias ──────────────
export { Ferias, SituacaoDaFeriasEnum } from './dominio/calculo/ferias/ferias';

// ────────────── dominio/calculo/faltas ──────────────
export { Falta } from './dominio/calculo/faltas/falta';

// ────────────── dominio/calculo/honorarios ──────────────
export { Honorario } from './dominio/calculo/honorarios/honorario';

// ────────────── dominio/calculo/custas ──────────────
export { CustasJudiciais } from './dominio/calculo/custas/custas-judiciais';

// ────────────── dominio/calculo/multa ──────────────
export { Multa } from './dominio/calculo/multa/multa';

// ────────────── dominio/historicosalarial ──────────────
export { HistoricoSalarial } from './dominio/historicosalarial/historico-salarial';
export type { OcorrenciaDoHistoricoSalarial } from './dominio/historicosalarial/historico-salarial';

// ────────────── dominio/pagamento ──────────────
export { totalizar } from './dominio/pagamento/pagamento';
export type { ResultadoPagamento } from './dominio/pagamento/pagamento';
