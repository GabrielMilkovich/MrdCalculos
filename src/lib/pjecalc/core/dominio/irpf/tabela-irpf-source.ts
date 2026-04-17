/**
 * PJe-Calc v2.15.1 — TabelaIrpf → MaquinaDeCalculoDeHonorarios bridge.
 *
 * Registra automaticamente TabelaIrpf.obterTabelaDa como provedor de
 * faixas IRPF PF para MaquinaDeCalculoDeHonorarios via setTabelaIrpfSource.
 *
 * Uso: `import '...irpf/tabela-irpf-source'` — side-effect module.
 * Ou chamar `registerTabelaIrpfSource()` explicitamente.
 */
import Decimal from 'decimal.js';
import { setTabelaIrpfSource } from '../calculo/honorarios/maquina-de-calculo-de-honorarios';
import { TabelaIrpf } from './tabela-irpf';

export function registerTabelaIrpfSource(): void {
  setTabelaIrpfSource((dataLiquidacao: Date, baseImposto: Decimal) => {
    const tabela = TabelaIrpf.obterTabelaDa(dataLiquidacao);
    if (!tabela) return null;
    return tabela.obterFaixaParaValor(baseImposto);
  });
}

// Auto-register on import.
registerTabelaIrpfSource();
