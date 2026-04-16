/**
 * Barrel de exports do módulo Termo.
 *
 * Este módulo agrupa todas as classes de "Termo" do PJe-Calc — entidades que
 * resolvem valores numéricos no contexto de um cálculo (Quantidade, Divisor,
 * BaseTabelada, BaseVerba, ValorPago, e seus Proxies).
 *
 * Status (após sessão de 2026-04):
 *   - INTERFACES E ESTRUTURA BASE: ✅ portadas
 *   - LÓGICA SIMPLES (Constante, Multiplicador, INFORMADA): ✅ portada
 *   - LÓGICA COMPLEXA (AVOS, IMPORTADA_DO_CALENDARIO, IMPORTADA_DO_CARTAO): ⚠️ stubs
 *   - INTEGRAÇÃO COM ENGINE-V3: ❌ pendente (ainda usa ocorrencias_precomputadas)
 *
 * Para usar produtivamente, ainda precisa:
 *   1. Portar Periodo.totalDeDiasUteis/totalDeFeriados/totalDeDiasNaoUteis
 *   2. Portar LogicoFuzzy
 *   3. Adicionar getValorCargaHoraria/obterDiasFerias/obterFaltasJustificadas em Calculo
 *   4. Conectar via FormulaCalculada/FormulaReflexo na MaquinaDeCalculo
 */
export type { Termo } from './termo';
export { ParametroDoTermo } from './parametro-do-termo';
export { Constante } from './constante';
export { Multiplicador } from './multiplicador';
export { Quantidade } from './quantidade';
export { Divisor } from './divisor';
export { BaseTabelada } from './base-tabelada';
export { BaseVerba } from './base-verba';
export { ItemBaseVerba } from './item-base-verba';
export { ValorPago } from './valor-pago';
export { SalarioMinimoProxy, SALARIO_MINIMO_HISTORICO } from './salario-minimo-proxy';
export { MaiorRemuneracaoProxy } from './maior-remuneracao-proxy';
export { UltimaRemuneracaoProxy } from './ultima-remuneracao-proxy';
export { HistoricoSalarialProxy } from './historico-salarial-proxy';
export { SalarioDaCategoriaProxy } from './salario-da-categoria-proxy';
