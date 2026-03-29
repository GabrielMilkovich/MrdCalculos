/**
 * =====================================================
 * MÓDULO: PLR — Participação nos Lucros e Resultados
 * =====================================================
 * 
 * Lei 10.101/2000: PLR proporcional aos meses trabalhados
 * Tributação exclusiva na fonte (Art. 3º §5º)
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class PLRProporcionalModule implements VerbaModule {
  readonly id = 'PLR_PROP';
  readonly nome = 'PLR Proporcional';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const nome = (verba.nome || '').toUpperCase();
    return nome.includes('PLR') || nome.includes('PARTICIPA');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    const valorPLR = verba.valor_informado_devido || verba.multiplicador || 0;

    // Avos: meses trabalhados no ano de referência
    const admDate = new Date(ctx.admissao);
    const demDate = ctx.demissao ? new Date(ctx.demissao) : new Date(ctx.periodo.fim);
    const compDate = new Date(ctx.competencia + '-01');
    const anoRef = compDate.getFullYear();

    let avos = 0;
    for (let m = 0; m < 12; m++) {
      const mesInicio = new Date(anoRef, m, 1);
      const mesFim = new Date(anoRef, m + 1, 0);
      if (mesInicio > demDate || mesFim < admDate) continue;
      const inicio = admDate > mesInicio ? admDate : mesInicio;
      const fim = demDate < mesFim ? demDate : mesFim;
      const dias = Math.floor((fim.getTime() - inicio.getTime()) / 86400000) + 1;
      if (dias >= 15) avos++;
    }

    return {
      base: valorPLR,
      baseSource: `verba:${verba.nome}`,
      quantidade: avos,
      quantidadeSource: `avos_ano:${anoRef}`,
      divisor: 12,
      divisorSource: 'lei_10101_2000',
      multiplicador: 1,
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    return new Decimal(inputs.base)
      .div(inputs.divisor).toDP(2)
      .times(inputs.quantidade).toDP(2)
      .toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] {
    // PLR NÃO gera reflexos (Art. 3º Lei 10.101/2000)
    return [];
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    // PLR: isenta INSS/FGTS, tributação exclusiva IRRF
    return { fgts: false, inss: false, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'valor_plr', valor: inputs.base, fonte: inputs.baseSource, regra: 'Lei 10.101/2000' },
      { campo: 'avos', valor: inputs.quantidade, fonte: inputs.quantidadeSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:valor/12×avos' },
      { campo: 'tributacao', valor: 'exclusiva_na_fonte', fonte: 'art3_§5_lei10101', regra: 'Tributação exclusiva IRRF' },
    ];
  }
}

registerVerbaModule(new PLRProporcionalModule());
