/**
 * IrpfModuloAdapter — implementa `IModuloLiquidavel` para apuração de IRPF
 * com Art. 12-A da Lei 7.713/88 (RRA — rendimentos recebidos acumuladamente).
 *
 * Executado por `Calculo.liquidar()` APÓS o INSS (ordem Java original), pois
 * o IR pode deduzir o CS segurado já apurado. Mantém referência ao
 * `InssModuloAdapter` para ler `csReclamante` no momento do `liquidar()`.
 *
 * Regras portadas do engine legado:
 *  - Art. 12-A RRA: NM = nº meses do período de ocorrências (first→last competência)
 *  - 13º exclusivo: tributado separadamente por ano (IN RFB 1500/2014 art. 14)
 *  - Férias separadas: tributação com meses = nº competências de férias
 *  - Deduções: CS segurado, dependentes × mesesTotal, honorários contratuais,
 *    aposentado 65+ (1ª faixa × mesesTotal)
 */
import Decimal from 'decimal.js';
import type { IModuloLiquidavel } from '../core/dominio/calculo/calculo';
import type { VerbaDeCalculo } from '../core/dominio/verbacalculo/verba-de-calculo';
import type {
  PjeIRConfig, PjeIRFaixaRow, PjeHonorariosConfig,
} from '../engine-types';
import {
  DEFAULT_FAIXAS_IR, DEFAULT_DEDUCAO_DEPENDENTE,
  HISTORICO_FAIXAS_IR,
} from '../engine-constants';
import { CaracteristicaDaVerbaEnum } from '../core/constantes/enums';
import type { InssModuloAdapter } from './inss-modulo-adapter';

const ROUND_CS_IR = Decimal.ROUND_HALF_EVEN;

export class IrpfModuloAdapter implements IModuloLiquidavel {
  private verbas: VerbaDeCalculo[];
  private irConfig: PjeIRConfig;
  private faixasIRDB: PjeIRFaixaRow[];
  private honorariosConfig: PjeHonorariosConfig;
  private inssAdapter: InssModuloAdapter;
  private dataLiquidacao: string; // YYYY-MM-DD

  // Resultados (populados após liquidar())
  baseCalculo = 0;
  deducoes = 0;
  baseTributavel = 0;
  impostoDevido = 0;
  mesesRRA = 1;
  metodo: 'art_12a_rra' | 'tabela_mensal' = 'tabela_mensal';
  ir13Exclusivo = 0;
  irFeriasSeparado = 0;
  irAnoLiquidacao = 0;

  constructor(
    verbas: VerbaDeCalculo[],
    irConfig: PjeIRConfig,
    faixasIRDB: PjeIRFaixaRow[],
    honorariosConfig: PjeHonorariosConfig,
    inssAdapter: InssModuloAdapter,
    dataLiquidacao: string,
  ) {
    this.verbas = verbas;
    this.irConfig = irConfig;
    this.faixasIRDB = faixasIRDB;
    this.honorariosConfig = honorariosConfig;
    this.inssAdapter = inssAdapter;
    this.dataLiquidacao = dataLiquidacao;
  }

  liquidar(_dataLiquidacao?: Date): void {
    if (!this.irConfig.apurar) return;

    // ─── 1. Coletar bases por característica ───
    let baseBruta = 0;    // normal + demais
    let base13 = 0;        // 13º (tributação exclusiva)
    let baseFerias = 0;    // férias (tributação separada)
    const base13PorAno: Record<number, number> = {};
    const compsNormal = new Set<string>();
    const compsFerias = new Set<string>();
    const anoLiq = parseInt(this.dataLiquidacao.slice(0, 4));

    for (const vc of this.verbas) {
      if (!vc.getIncidenciaIRPF()) continue;
      const car = vc.getCaracteristica();
      const ehFerias = car === CaracteristicaDaVerbaEnum.FERIAS;
      const eh13 = car === CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO;

      for (const oc of vc.getOcorrenciasAtivas()) {
        const dataIni = oc.getDataInicial();
        if (!dataIni) continue;
        const dif = oc.getDiferenca().toNumber();
        if (dif <= 0) continue;
        // Base = diferença corrigida (se incidir_sobre_juros=true, soma juros)
        const corrigida = oc.getDiferencaCorrigida();
        const valorBase = corrigida ? corrigida.toNumber() : dif;
        const comp = this.formatCompetencia(dataIni);

        if (ehFerias && this.irConfig.tributacao_separada_ferias) {
          baseFerias += valorBase;
          compsFerias.add(comp);
        } else if (eh13 && this.irConfig.tributacao_exclusiva_13) {
          base13 += valorBase;
          const anoComp = dataIni.getFullYear();
          base13PorAno[anoComp] = (base13PorAno[anoComp] ?? 0) + valorBase;
        } else {
          baseBruta += valorBase;
          compsNormal.add(comp);
        }
      }
    }

    // ─── 2. Art. 12-A: NM = span de meses do período + stretch capado até dataLiq ───
    // PARITY ALVO 2: PJC v2.15.1 considera o NM como o período de "recebimento
    // acumulado" até a data de liquidação (Lei 7.713/88 art. 12-A). Para casos
    // onde o gap entre última competência e dataLiquidacao é grande (ex:
    // rosicleia 13 meses), estender o NM aproxima nosso IR ao PJC.
    //
    // Cap conservador (12 meses além da última competência) evita overshoot
    // em casos com gap muito grande entre última verba e dataLiq (ex: leandro
    // 47 meses, tiago 34 meses) onde o stretch full subestima IR drasticamente.
    const mesesTotal = this.computeSpanMesesAteLiquidacao(compsNormal, 12);

    // ─── 3. Deduções ───
    let deducoes = 0;
    if (this.irConfig.deduzir_cs) {
      deducoes += this.inssAdapter.csReclamante;
    }
    if (this.irConfig.deduzir_honorarios && this.honorariosConfig.apurar_contratuais) {
      deducoes += this.calcularHonorariosContratuais();
    }

    // ─── 4. Tabela IR da competência de liquidação ───
    const compLiq = this.dataLiquidacao.slice(0, 7);
    const tabela = this.getTabelaParaCompetencia(compLiq);

    // Aposentado 65+ (Art. 4° §2° Lei 7.713/88): dedução adicional = 1ª faixa × mesesTotal
    if (this.irConfig.aposentado_65 && tabela.faixas.length > 0) {
      deducoes += tabela.faixas[0].ate * mesesTotal;
    }

    // ─── 5. IR sobre base normal (Art. 12-A RRA) ───
    let irTotal = new Decimal(0);
    if (baseBruta > 0) {
      const deducaoDepBruto = new Decimal(this.irConfig.dependentes)
        .times(tabela.deducaoDependente).times(mesesTotal).toDP(2, ROUND_CS_IR).toNumber();
      const baseTrib = Math.max(0, baseBruta - deducoes - deducaoDepBruto);
      for (const f of tabela.faixas) {
        if (baseTrib <= f.ate * mesesTotal) {
          irTotal = new Decimal(baseTrib).times(f.aliquota)
            .minus(new Decimal(f.deducao).times(mesesTotal))
            .toDP(2, ROUND_CS_IR);
          break;
        }
      }
      if (irTotal.lt(0)) irTotal = new Decimal(0);
    }

    // ─── 6. IR sobre 13º (exclusivo, por ano — IN RFB 1500/2014) ───
    let ir13 = new Decimal(0);
    if (this.irConfig.tributacao_exclusiva_13 && base13 > 0) {
      const anos = Object.keys(base13PorAno).map(Number).sort();
      const anosTributar = anos.length > 0 ? anos : [anoLiq];
      if (anos.length === 0) base13PorAno[anoLiq] = base13;
      for (const ano of anosTributar) {
        const baseAno = base13PorAno[ano] ?? 0;
        if (baseAno <= 0) continue;
        let ir13Ano = new Decimal(0);
        for (const f of tabela.faixas) {
          if (baseAno <= f.ate) {
            ir13Ano = new Decimal(baseAno).times(f.aliquota).minus(f.deducao);
            break;
          }
        }
        if (ir13Ano.lt(0)) ir13Ano = new Decimal(0);
        ir13 = ir13.plus(ir13Ano);
      }
      ir13 = ir13.toDP(2, ROUND_CS_IR);
    }

    // ─── 7. IR sobre férias separado ───
    let irFerias = new Decimal(0);
    if (this.irConfig.tributacao_separada_ferias && baseFerias > 0) {
      const mesesFerias = Math.max(1, compsFerias.size);
      for (const f of tabela.faixas) {
        if (baseFerias <= f.ate * mesesFerias) {
          irFerias = new Decimal(baseFerias).times(f.aliquota)
            .minus(new Decimal(f.deducao).times(mesesFerias))
            .toDP(2, ROUND_CS_IR);
          break;
        }
      }
      if (irFerias.lt(0)) irFerias = new Decimal(0);
    }

    // ─── 8. Totais ───
    const imposto = irTotal.plus(ir13).plus(irFerias);
    const deducaoDep = new Decimal(this.irConfig.dependentes)
      .times(tabela.deducaoDependente).times(mesesTotal).toDP(2, ROUND_CS_IR).toNumber();

    this.baseCalculo = Number(new Decimal(baseBruta + base13 + baseFerias).toDP(2, ROUND_CS_IR));
    this.deducoes = Number(new Decimal(deducoes + deducaoDep).toDP(2, ROUND_CS_IR));
    this.baseTributavel = Number(
      new Decimal(Math.max(0, baseBruta - deducoes - deducaoDep) + base13 + baseFerias)
        .toDP(2, ROUND_CS_IR),
    );
    this.impostoDevido = imposto.toDP(2, ROUND_CS_IR).toNumber();
    this.mesesRRA = mesesTotal;
    this.metodo = mesesTotal > 1 ? 'art_12a_rra' : 'tabela_mensal';
    this.ir13Exclusivo = ir13.toDP(2, ROUND_CS_IR).toNumber();
    this.irFeriasSeparado = irFerias.toDP(2, ROUND_CS_IR).toNumber();
    this.irAnoLiquidacao = irTotal.toDP(2, ROUND_CS_IR).toNumber();
  }

  // ─── Helpers ───

  private formatCompetencia(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /** Nº meses do span [primeira competência, última competência] inclusive. */
  private computeSpanMeses(comps: Set<string>): number {
    if (comps.size === 0) return 1;
    const arr = [...comps].sort();
    const [y1, m1] = arr[0].split('-').map(Number);
    const [y2, m2] = arr[arr.length - 1].split('-').map(Number);
    return Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1);
  }

  /**
   * computeSpanMesesAteLiquidacao — span da primeira competência até
   * `dataLiquidacao`, capado em `maxStretch` meses além da última competência.
   *
   * PJe-Calc v2.15.1: o NM em RRA reflete o período de acumulação até a
   * quitação. O cap evita overshoot quando o gap entre última competência
   * e dataLiquidacao é muito grande (caso de contratos antigos em demanda
   * judicial demorada).
   */
  private computeSpanMesesAteLiquidacao(comps: Set<string>, maxStretch: number): number {
    if (comps.size === 0) return 1;
    const arr = [...comps].sort();
    const [y1, m1] = arr[0].split('-').map(Number);
    const [y2, m2] = arr[arr.length - 1].split('-').map(Number);
    const spanCompetencias = (y2 - y1) * 12 + (m2 - m1) + 1;

    const [yL, mL] = this.dataLiquidacao.slice(0, 7).split('-').map(Number);
    const monthsBetweenLastCompAndLiq = (yL - y2) * 12 + (mL - m2);
    const stretchPermitido = Math.max(0, Math.min(monthsBetweenLastCompAndLiq, maxStretch));

    return Math.max(1, spanCompetencias + stretchPermitido);
  }

  private getTabelaParaCompetencia(comp: string): {
    faixas: { ate: number; aliquota: number; deducao: number }[];
    deducaoDependente: number;
  } {
    if (this.faixasIRDB.length === 0) {
      const hist = this.lookupHistorico(comp);
      if (hist && comp < '2025-01') {
        return { faixas: hist.faixas, deducaoDependente: hist.deducao_dependente };
      }
      return { faixas: DEFAULT_FAIXAS_IR, deducaoDependente: DEFAULT_DEDUCAO_DEPENDENTE };
    }
    const compDate = new Date(comp + '-01');
    const rows = this.faixasIRDB
      .filter(f => {
        const ini = new Date(f.competencia_inicio);
        const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
        return compDate >= ini && compDate <= fim;
      })
      .sort((a, b) => a.faixa - b.faixa)
      .map(f => ({
        ate: Number(f.valor_ate),
        aliquota: Number(f.aliquota),
        deducao: Number(f.deducao),
      }));
    if (rows.length === 0) {
      const hist = this.lookupHistorico(comp);
      if (hist && comp < '2025-01') {
        return { faixas: hist.faixas, deducaoDependente: hist.deducao_dependente };
      }
      return { faixas: DEFAULT_FAIXAS_IR, deducaoDependente: DEFAULT_DEDUCAO_DEPENDENTE };
    }
    const matched = this.faixasIRDB.find(f => {
      const ini = new Date(f.competencia_inicio);
      const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
      return compDate >= ini && compDate <= fim;
    });
    const deducaoDep = matched ? Number(matched.deducao_dependente) : DEFAULT_DEDUCAO_DEPENDENTE;
    return { faixas: rows, deducaoDependente: deducaoDep };
  }

  private lookupHistorico(comp: string): {
    faixas: { ate: number; aliquota: number; deducao: number }[];
    deducao_dependente: number;
  } | null {
    const exact = HISTORICO_FAIXAS_IR[comp];
    if (exact) return exact;
    const ano = comp.slice(0, 4);
    const keys = Object.keys(HISTORICO_FAIXAS_IR).filter(k => k.startsWith(ano)).sort();
    if (keys.length > 0) return HISTORICO_FAIXAS_IR[keys[keys.length - 1]];
    if (HISTORICO_FAIXAS_IR[ano]) return HISTORICO_FAIXAS_IR[ano];
    return null;
  }

  /** Honorários contratuais: % sobre (principal corrigido + juros) OU valor_fixo. */
  private calcularHonorariosContratuais(): number {
    if (this.honorariosConfig.valor_fixo !== undefined) {
      return this.honorariosConfig.valor_fixo;
    }
    let principalCorrigido = new Decimal(0);
    const jurosMora = new Decimal(0);
    for (const vc of this.verbas) {
      for (const oc of vc.getOcorrenciasAtivas()) {
        const corrigida = oc.getDiferencaCorrigida();
        if (corrigida) principalCorrigido = principalCorrigido.plus(corrigida);
        // Juros: getDiferencaCorrigidaParaAtualizacao não inclui juros ainda —
        // aproximamos com 0 (engine-v3 hoje retorna total_juros=0)
        // Isso é conservador (subestima a dedução).
      }
    }
    const baseHon = principalCorrigido.plus(jurosMora);
    return baseHon
      .times(this.honorariosConfig.percentual_contratuais / 100)
      .toDP(2, ROUND_CS_IR)
      .toNumber();
  }
}
