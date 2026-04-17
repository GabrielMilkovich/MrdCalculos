/**
 * InssModuloAdapter — implementa `IModuloLiquidavel` e conecta a apuração de
 * INSS (contribuição social do segurado + empregador) ao pipeline do core.
 *
 * Chamado por `Calculo.liquidar()` APÓS a liquidação das verbas — as
 * `OcorrenciaDeVerba` já têm `diferenca` nominal disponível, e as bases
 * são agrupadas por competência. Separa base normal × 13º (tetos independentes).
 *
 * Resultados ficam expostos em propriedades públicas:
 *   - totalSegurado, totalEmpregador, csReclamante
 *   - seguradoDevidos, empregadorPorCompetencia
 *
 * Aliquotas progressivas vêm de `faixasINSSDB`. Quando ausentes, fallback
 * para tabelas históricas ou default 2025 (mesma lógica do engine legado).
 */
import Decimal from 'decimal.js';
import type { IModuloLiquidavel } from '../core/dominio/calculo/calculo';
import type { VerbaDeCalculo } from '../core/dominio/verbacalculo/verba-de-calculo';
import type { PjeCSConfig, PjeINSSFaixaRow } from '../engine-types';
import {
  DEFAULT_FAIXAS_INSS,
  HISTORICO_FAIXAS_INSS,
} from '../engine-constants';
import { CaracteristicaDaVerbaEnum } from '../core/constantes/enums';

// PJe-Calc usa ROUND_HALF_EVEN (Banker's rounding) para CS e IR
const ROUND_CS_IR = Decimal.ROUND_HALF_EVEN;

export interface InssDevido {
  competencia: string;
  base: number;
  aliquota: number;
  valor: number;
}

export interface InssEmpregador {
  competencia: string;
  empresa: number;
  sat: number;
  terceiros: number;
}

export class InssModuloAdapter implements IModuloLiquidavel {
  private verbas: VerbaDeCalculo[];
  private csConfig: PjeCSConfig;
  private faixasINSSDB: PjeINSSFaixaRow[];

  // Resultados (populados após liquidar())
  totalSegurado = 0;
  totalEmpregador = 0;
  csReclamante = 0;
  seguradoDevidos: InssDevido[] = [];
  empregadorPorCompetencia: InssEmpregador[] = [];

  constructor(
    verbas: VerbaDeCalculo[],
    csConfig: PjeCSConfig,
    faixasINSSDB: PjeINSSFaixaRow[],
  ) {
    this.verbas = verbas;
    this.csConfig = csConfig;
    this.faixasINSSDB = faixasINSSDB;
  }

  liquidar(_dataLiquidacao?: Date): void {
    if (!this.csConfig.apurar_segurado && !this.csConfig.apurar_empresa) return;

    // 1. Agrupa bases por competência (normal vs 13º — tetos separados)
    const basesNormal: Record<string, number> = {};
    const bases13: Record<string, number> = {};

    for (const vc of this.verbas) {
      if (!vc.getIncidenciaINSS()) continue;
      const is13 = vc.getCaracteristica() === CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO;
      const target = is13 ? bases13 : basesNormal;

      for (const oc of vc.getOcorrenciasAtivas()) {
        const dataIni = oc.getDataInicial();
        if (!dataIni) continue;
        const dif = oc.getDiferenca().toNumber();
        if (dif <= 0) continue;
        const comp = this.formatCompetencia(dataIni);
        target[comp] = (target[comp] ?? 0) + dif;
      }
    }

    // 2. Apura segurado por competência (INSS progressivo separado: normal + 13º)
    if (this.csConfig.apurar_segurado) {
      const comps = Array.from(new Set([...Object.keys(basesNormal), ...Object.keys(bases13)]));
      for (const comp of comps) {
        const bNormal = basesNormal[comp] ?? 0;
        const b13 = bases13[comp] ?? 0;
        const total = bNormal + b13;
        if (total <= 0) continue;
        const inssNormal = bNormal > 0 ? this.calcularINSSProgressivo(comp, bNormal) : 0;
        const inss13 = b13 > 0 ? this.calcularINSSProgressivo(comp, b13) : 0;
        const imposto = inssNormal + inss13;
        this.seguradoDevidos.push({
          competencia: comp,
          base: total,
          aliquota: total > 0 ? imposto / total : 0,
          valor: Number(new Decimal(imposto).toDP(2, ROUND_CS_IR)),
        });
      }
    }

    // 3. Apura empregador (empresa + SAT + terceiros) sobre base consolidada
    const basesEmp: Record<string, number> = { ...basesNormal };
    for (const [c, v] of Object.entries(bases13)) {
      basesEmp[c] = (basesEmp[c] ?? 0) + v;
    }
    if (this.csConfig.apurar_empresa || this.csConfig.apurar_sat || this.csConfig.apurar_terceiros) {
      for (const [comp, base] of Object.entries(basesEmp)) {
        if (base <= 0) continue;
        const compDate = new Date(comp + '-01');
        const isSimples = this.csConfig.periodos_simples?.some(p => {
          const pI = new Date(p.inicio);
          const pF = new Date(p.fim);
          return compDate >= pI && compDate <= pF;
        }) ?? false;

        if (isSimples) {
          this.empregadorPorCompetencia.push({ competencia: comp, empresa: 0, sat: 0, terceiros: 0 });
          continue;
        }
        const isDomestico = this.csConfig.aliquota_segurado_tipo === 'domestico';
        const aliqEmp = isDomestico ? 0.08 : (this.csConfig.aliquota_empresa_fixa ?? 20) / 100;
        const aliqSat = (this.csConfig.aliquota_sat_fixa ?? 2) / 100;
        const aliqTerc = (this.csConfig.aliquota_terceiros_fixa ?? 5.8) / 100;
        this.empregadorPorCompetencia.push({
          competencia: comp,
          empresa: this.csConfig.apurar_empresa
            ? Number(new Decimal(base).times(aliqEmp).toDP(2, ROUND_CS_IR))
            : 0,
          sat: this.csConfig.apurar_sat
            ? Number(new Decimal(base).times(aliqSat).toDP(2, ROUND_CS_IR))
            : 0,
          terceiros: (this.csConfig.apurar_terceiros && !isDomestico)
            ? Number(new Decimal(base).times(aliqTerc).toDP(2, ROUND_CS_IR))
            : 0,
        });
      }
    }

    // 4. Totais
    this.totalSegurado = Number(
      this.seguradoDevidos.reduce((s, x) => s.plus(x.valor), new Decimal(0)).toDP(2, ROUND_CS_IR),
    );
    this.totalEmpregador = Number(
      this.empregadorPorCompetencia
        .reduce((s, x) => s.plus(x.empresa).plus(x.sat).plus(x.terceiros), new Decimal(0))
        .toDP(2, ROUND_CS_IR),
    );
    this.csReclamante = this.csConfig.cobrar_reclamante ? this.totalSegurado : 0;
  }

  // ─── Helpers privados ───

  private formatCompetencia(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private getFaixasParaCompetencia(comp: string): { ate: number; aliquota: number }[] {
    if (this.faixasINSSDB.length === 0) {
      return this.lookupHistorico(comp) ?? DEFAULT_FAIXAS_INSS;
    }
    const compDate = new Date(comp + '-01');
    const rows = this.faixasINSSDB
      .filter(f => {
        const ini = new Date(f.competencia_inicio);
        const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
        return compDate >= ini && compDate <= fim;
      })
      .sort((a, b) => a.faixa - b.faixa)
      .map(f => ({ ate: Number(f.valor_ate), aliquota: Number(f.aliquota) }));
    if (rows.length === 0) {
      return this.lookupHistorico(comp) ?? DEFAULT_FAIXAS_INSS;
    }
    return rows;
  }

  private lookupHistorico(comp: string): { ate: number; aliquota: number }[] | null {
    // Exact match
    if (HISTORICO_FAIXAS_INSS[comp]) return HISTORICO_FAIXAS_INSS[comp];
    // Prefixo por ano (YYYY-MM → YYYY)
    const ano = comp.slice(0, 4);
    const keys = Object.keys(HISTORICO_FAIXAS_INSS)
      .filter(k => k.startsWith(ano))
      .sort();
    if (keys.length > 0) return HISTORICO_FAIXAS_INSS[keys[keys.length - 1]];
    if (HISTORICO_FAIXAS_INSS[ano]) return HISTORICO_FAIXAS_INSS[ano];
    return null;
  }

  /**
   * Alíquota única pré-EC 103/2019: toda a base é tributada na alíquota da faixa
   * onde o salário se encaixa.
   */
  private calcularINSSAliquotaUnica(comp: string, base: number): number {
    const faixas = this.getFaixasParaCompetencia(comp);
    if (faixas.length === 0) return 0;
    const baseD = new Decimal(base);
    for (const f of faixas) {
      if (baseD.lte(f.ate)) {
        return baseD.times(f.aliquota).toDP(2, ROUND_CS_IR).toNumber();
      }
    }
    // Base excede todas as faixas: teto da última × sua alíquota
    const ultima = faixas[faixas.length - 1];
    return new Decimal(ultima.ate).times(ultima.aliquota).toDP(2, ROUND_CS_IR).toNumber();
  }

  private calcularINSSProgressivo(comp: string, base: number): number {
    // Alíquota fixa informada pelo usuário
    if (this.csConfig.aliquota_segurado_tipo === 'fixa' && this.csConfig.aliquota_segurado_fixa) {
      return new Decimal(base)
        .times(this.csConfig.aliquota_segurado_fixa)
        .div(100)
        .toDP(2, ROUND_CS_IR)
        .toNumber();
    }
    // Pré-EC 103/2019 (até 02/2020) — alíquota única
    if (comp < '2020-03') return this.calcularINSSAliquotaUnica(comp, base);

    const faixas = this.getFaixasParaCompetencia(comp);
    const teto = faixas[faixas.length - 1].ate;
    const aplicarTeto = this.csConfig.aliquota_segurado_tipo !== 'fixa';
    let baseRestante = new Decimal(aplicarTeto ? Math.min(base, teto) : base);
    let imposto = new Decimal(0);
    let faixaAnterior = new Decimal(0);
    for (const f of faixas) {
      const limiteNaFaixa = new Decimal(f.ate).minus(faixaAnterior);
      const baseNaFaixa = Decimal.min(baseRestante, limiteNaFaixa);
      if (baseNaFaixa.gt(0)) {
        imposto = imposto.plus(baseNaFaixa.times(f.aliquota).toDP(2, ROUND_CS_IR));
        baseRestante = baseRestante.minus(baseNaFaixa);
      }
      if (baseRestante.lte(0)) break;
      faixaAnterior = new Decimal(f.ate);
    }
    return imposto.toDP(2, ROUND_CS_IR).toNumber();
  }
}
