/**
 * =====================================================
 * MODULO: ADICIONAL DE INSALUBRIDADE (Art. 192 CLT)
 * =====================================================
 * Graus: minimo (10%), medio (20%), maximo (40%)
 * Base: salario minimo (default) ou salario contratual (decisao judicial)
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class InsalubridadeModule implements VerbaModule {
  readonly id = 'INSALUBRIDADE';
  readonly nome = 'Adicional de Insalubridade';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    let base = 0;
    let baseSource = 'fallback';

    // Check if base is salario_minimo (from tabela) or salario contratual
    const usaSalarioMinimo = verba.base_calculo?.tabelas?.includes('salario_minimo');

    if (usaSalarioMinimo) {
      // Base = salario minimo da competencia (supplied in context or params)
      // The engine resolves tabela references externally; here we use fallback
      base = verba.constante_mensal || 0;
      baseSource = 'tabela:salario_minimo';
    } else if (verba.base_calculo?.historicos?.length) {
      const histNome = verba.base_calculo.historicos[0];
      const hist = ctx.historicos.find(h => h.id === histNome || h.nome === histNome);
      if (hist) {
        const monthEntry = hist.ocorrencias?.find(o => o.competencia.startsWith(ctx.competencia));
        if (monthEntry) {
          base = monthEntry.valor;
          baseSource = `hist_salarial_mes:${hist.nome}:${ctx.competencia}`;
        } else if (hist.valor_informado) {
          base = hist.valor_informado;
          baseSource = `hist_salarial_fixo:${hist.nome}`;
        }
      }
    }

    // Multiplicador: grau defines the percentage (0.10, 0.20, 0.40)
    const multiplicador = verba.multiplicador || 0.20;

    return {
      base,
      baseSource,
      quantidade: verba.quantidade_informada || 1,
      quantidadeSource: 'informada',
      divisor: verba.divisor_informado || 1,
      divisorSource: 'informado',
      multiplicador,
      metadata: { grau: multiplicador === 0.10 ? 'minimo' : multiplicador === 0.40 ? 'maximo' : 'medio', usa_salario_minimo: usaSalarioMinimo },
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    if (inputs.base <= 0) return 0;
    // Formula: Base x Multiplicador (grau) x Quantidade / Divisor
    const resultado = new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2);
    return resultado.toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] {
    return [
      { targetVerba: '13o Salario', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Ferias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    const grau = inputs.metadata?.grau as string || 'medio';
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource, regra: 'Art. 192 CLT' },
      { campo: 'grau', valor: grau, fonte: 'config_verba', observacao: `Grau ${grau}: ${(inputs.multiplicador * 100).toFixed(0)}%` },
      { campo: 'multiplicador', valor: inputs.multiplicador, fonte: 'config_verba' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:BxM/DxQ' },
    ];
  }
}

registerVerbaModule(new InsalubridadeModule());
