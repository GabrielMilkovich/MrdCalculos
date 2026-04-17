/**
 * Barrel do módulo calculo (Fase 10 do master plan).
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/
 */
export { Calculo, type IModuloLiquidavel } from './calculo';
export { Setor } from './setor';
export { ItemPontoFacultativo } from './item-ponto-facultativo';
export type { Feriado } from './item-ponto-facultativo';
export { ExcecaoDaCargaHorariaDoCalculo } from './excecao-da-carga-horaria-do-calculo';
export { ExcecaoDoSabadoDoCalculo } from './excecao-do-sabado-do-calculo';
export { HistoricoValidacaoDoCalculo } from './historico-validacao-do-calculo';
export { ComparadorDeExcecoes } from './comparador-de-excecoes';
export { CompetenciaDeJuros } from './competencia-de-juros';
export { TabelaDeJurosDoCalculo } from './tabela-de-juros-do-calculo';
export { AnalisadorAlteracaoCalculo } from './analisador-alteracao-calculo';
export type { ResultadoAnaliseAlteracao } from './analisador-alteracao-calculo';
export { FiltroDoCalculo } from './filtro-do-calculo';

// Sub-módulos já portados em fases anteriores
export * from './atualizacao';
export * from './ferias';
export * from './honorarios';
export * from './inss';
export * from './juros';
export * from './multa';
export * from './custas';
