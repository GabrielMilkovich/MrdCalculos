/**
 * PJe-Calc v2.15.1 — LegendaDaFormulaDoInss
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.LegendaDaFormulaDoInss
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/LegendaDaFormulaDoInss.java
 *
 * Helper que monta strings descritivas das bases de INSS de um cálculo:
 *   - basesHistoricos: nomes de HistoricoSalarial com incidencia INSS
 *   - basesVerbas: nomes de VerbaDeCalculo ativa com incidencia INSS
 * getLegendaSalariosDevidos / getLegendaSalariosPagos concatenam os nomes
 * com " + " em maiúsculas.
 */
import type { Inss } from '../inss';

export class LegendaDaFormulaDoInss {
  private inss: Inss;
  private basesHistoricos: string[] = [];
  private basesVerbas: string[] = [];

  constructor(inss: Inss) {
    this.inss = inss;
    this.init();
  }

  private init(): void {
    const calc = this.inss.getCalculo();
    if (!calc) return;
    const c = calc as unknown as {
      getHistoricosSalariais?: () => Iterable<{ getIncidenciaINSS?: () => boolean; getNome?: () => string }>;
      getVerbas?: () => Iterable<{ getAtivo?: () => boolean; getIncidenciaINSS?: () => boolean; getNome?: () => string }>;
    };
    for (const historico of c.getHistoricosSalariais?.() ?? []) {
      if (!historico.getIncidenciaINSS?.()) continue;
      const nome = historico.getNome?.();
      if (nome) this.basesHistoricos.push(nome);
    }
    for (const verba of c.getVerbas?.() ?? []) {
      if (!verba.getAtivo?.()) continue;
      if (!verba.getIncidenciaINSS?.()) continue;
      const nome = verba.getNome?.();
      if (nome) this.basesVerbas.push(nome);
    }
  }

  getBasesHistoricos(): string[] { return this.basesHistoricos; }
  getBasesVerbas(): string[] { return this.basesVerbas; }

  getLegendaSalariosDevidos(): string { return this.basesVerbas.join(' + ').toUpperCase(); }
  getLegendaSalariosPagos(): string { return this.basesHistoricos.join(' + ').toUpperCase(); }
}
