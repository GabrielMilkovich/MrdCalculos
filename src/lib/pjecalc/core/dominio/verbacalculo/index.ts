/**
 * Barrel do módulo verbacalculo (Fase 11 do master plan).
 *
 * Ref: pjecalc-fonte/.../dominio/verbacalculo/
 *
 * Hierarquia de classes:
 *   VerbaDeCalculo (abstract)
 *     ├─ Principal (abstract)
 *     │     ├─ Calculada (FormulaCalculada)
 *     │     └─ Informada (FormulaInformada)
 *     └─ Reflexo (FormulaReflexo)
 */
export { VerbaDeCalculo } from './verba-de-calculo';
export { Principal } from './principal';
export { Calculada } from './calculada';
export { Informada } from './informada';
export { Reflexo } from './reflexo';

// Vínculos / coleções associadas
export { HistoricoSalarialDaVerba } from './historico-salarial-da-verba';
export { ValeTransporteDaVerba } from './vale-transporte-da-verba';
export { CartaoDePontoDaVerba } from './cartao-de-ponto-da-verba';

// Utilitários
export { TotalizadorDeVerba } from './totalizador-de-verba';
export { ComparadorDeListas } from './comparador-de-listas';

// Máquinas de cálculo (abstract + 3 concretas)
export { calcularValorDevidoDaOcorrencia } from './maquina-de-calculo';
export { MaquinaDeCalculoDaVerbaCalculada } from './maquina-de-calculo-da-verba-calculada';
export { MaquinaDeCalculoDaVerbaInformada } from './maquina-de-calculo-da-verba-informada';
export { MaquinaDeCalculoDaVerbaReflexo } from './maquina-de-calculo-da-verba-reflexo';
export { MaquinaDeCalculoDeCorrecaoMonetaria } from './maquina-de-calculo-de-correcao-monetaria';

// Correção monetária
export { TabelaDeCorrecaoMonetaria } from './tabela-de-correcao-monetaria';
export type { ITabelaCorrecaoContext } from './tabela-de-correcao-monetaria';
export { TabelaDeCorrecaoMonetariaUtils } from './tabela-de-correcao-monetaria-utils';

// Filtros + análise de alteração
export { FiltroDeVerbaDeCalculo } from './filtro-de-verba-de-calculo';
export { FiltroParaAlterarVerbaEmLote } from './filtro-para-alterar-verba-em-lote';
export { AnalisadorAlteracaoVerbaDeCalculo } from './analisador-alteracao-verba-de-calculo';
export type { ResultadoAnaliseAlteracaoVerba } from './analisador-alteracao-verba-de-calculo';
