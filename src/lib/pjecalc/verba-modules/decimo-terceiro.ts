/**
 * =====================================================
 * MÓDULO: 13º SALÁRIO (Proporcional e Integral)
 * =====================================================
 * 
 * Art. 1º Lei 4.090/62: 13º = remuneração / 12 × avos
 * Art. 142 CLT: comissionistas usam média dos últimos 12 meses
 * Avos: mês com 15+ dias = 1 avo
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class DecimoTerceiroProporcionalModule implements VerbaModule {
  readonly id = 'DECIMO_PROP';
  readonly nome = '13º Salário Proporcional';
  readonly familia = 'rescisoria' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext): boolean {
    return !!ctx.demissao;
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    let base = 0;
    let baseSource = 'nenhum';

    // Art. 142: para comissionistas, usar média 12 meses
    const hist = ctx.historicos[0];
    if (hist) {
      if (hist.tipo_valor === 'calculado' && hist.ocorrencias?.length > 0) {
        // Média das últimas 12 ocorrências
        const ultimas = hist.ocorrencias.slice(-12);
        const soma = ultimas.reduce((s, o) => s + (o.valor || 0), 0);
        base = ultimas.length > 0 ? soma / ultimas.length : 0;
        baseSource = `media_12m:${hist.nome}`;
      } else {
        base = hist.valor_informado || 0;
        baseSource = `hist:${hist.nome}`;
      }
    }

    // Calcular avos no ano da demissão
    const demDate = new Date(ctx.demissao!);
    const admDate = new Date(ctx.admissao);
    const anoRef = demDate.getFullYear();

    let avos = 0;
    for (let m = 0; m < 12; m++) {
      const mesInicio = new Date(anoRef, m, 1);
      const mesFim = new Date(anoRef, m + 1, 0);

      if (mesInicio > demDate) break;
      if (mesFim < admDate) continue;

      // Dias trabalhados no mês
      const inicio = admDate > mesInicio ? admDate : mesInicio;
      const fim = demDate < mesFim ? demDate : mesFim;
      const dias = Math.floor((fim.getTime() - inicio.getTime()) / (86400000)) + 1;

      if (dias >= 15) avos++;
    }

    return {
      base, baseSource,
      quantidade: avos,
      quantidadeSource: `avos_ano:${anoRef}`,
      divisor: 12,
      divisorSource: 'lei_4090_62',
      multiplicador: 1,
      metadata: { anoRef },
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    return new Decimal(inputs.base)
      .div(inputs.divisor).toDP(2)
      .times(inputs.quantidade).toDP(2)
      .toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource, regra: 'Lei 4.090/62' },
      { campo: 'avos', valor: inputs.quantidade, fonte: inputs.quantidadeSource, regra: 'Mês com 15+ dias = 1 avo' },
      { campo: 'divisor', valor: 12, fonte: 'lei_4090_62' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:base/12×avos' },
    ];
  }
}

registerVerbaModule(new DecimoTerceiroProporcionalModule());
