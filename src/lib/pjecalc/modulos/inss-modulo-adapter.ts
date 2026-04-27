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
import { Inss } from '../core/dominio/calculo/inss/inss';

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
    //
    // FIX CRÍTICO (CAUSA-6 / com_correcao_trabalhista):
    // PJe-Calc aplica correção monetária sobre a base de INSS quando o flag
    // "Com Correção Trabalhista" está ativo na tela CS. Em `MaquinaDeCalculoDoInss`
    // isso é feito na fase de atualização (via tabela trabalhista salários devidos).
    // O atalho equivalente no adapter é usar `getDiferencaCorrigida()`, que já
    // multiplica a diferença nominal pelo `indiceAcumulado` setado pelo
    // `Calculo.liquidarVerba`. Sem isso, o INSS vinha ~50% abaixo em casos
    // históricos (pré-2020) onde o fator IPCA-E acumulado é grande.
    // D2 fix (2026-04-26): Java aplica INSS sobre o NOMINAL e SÓ DEPOIS multiplica
    // por (indiceCorr + juros + multa) na atualização. Confirmamos empiricamente
    // que `<OcorrenciaDeInssSobreSalariosDevidos>.indiceDeCorrecaoDoReclamante = 1.0`
    // em TODOS os PJCs analisados (joseli, leandro, antonio, carla, rosicleia,
    // tiago, francisco, vanderlei, roque, caso-real-v2). Logo NÃO devemos aplicar
    // IPCA-E à base do INSS — ele já está embutido no `taxaJuros` por ocorrência.
    // O `engine-v3.ts` aplica `(1 + juros + multa)` sobre `totalSegurado` calculado
    // sobre nominal, fechando a fórmula:
    //   inssReclamante = soma(VDS_F × (indiceCorr + taxaJuros/100 + taxaMulta/100))
    //                  ≈ soma(INSS_nominal × (1 + juros/100))   [indiceCorr=1, multa=0]
    // Antes (D1.2): `usarCorrigida = csConfig.com_correcao_trabalhista === true`
    //   → INSS computava sobre `getDiferencaCorrigida` aplicando IPCA-E na base,
    //     duplicando correção e gerando overshoot quando combinado com juros pós.
    const usarCorrigida = false;
    const basesNormal: Record<string, number> = {};
    const bases13: Record<string, number> = {};

    for (const vc of this.verbas) {
      if (!vc.getIncidenciaINSS()) continue;
      const is13 = vc.getCaracteristica() === CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO;
      const target = is13 ? bases13 : basesNormal;

      for (const oc of vc.getOcorrenciasAtivas()) {
        const dataIni = oc.getDataInicial();
        if (!dataIni) continue;
        // D1 (rodada 2): integração de getDiferencaParaCalculoDasIncidencias
        // (port 1:1 de OcorrenciaDeVerba.java:663-684). O método já cobre:
        //   - férias indenizadas → null (não compõem base — Lei 8.212/91 art.28 §9 "d")
        //   - férias com dobra → 50% da diferença (CLT art.137, parte indenizatória)
        //   - férias com abono (CALCULADO) → retira fator do abono (CLT art.143)
        //   - escolha entre nominal/corrigida pelo flag corrigido
        const baseFromIncidencia = oc.getDiferencaParaCalculoDasIncidencias(usarCorrigida);
        if (baseFromIncidencia === null) continue; // férias indenizadas: não incidem INSS
        const base = baseFromIncidencia;
        if (base.lte(0)) continue;
        const comp = this.formatCompetencia(dataIni);
        target[comp] = (target[comp] ?? 0) + base.toNumber();
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
        // Sprint 4.2-B2 (TIER 2 P1): SIMPLES NACIONAL global (LC 123/2006 art.13 §3º).
        // Quando `simples_nacional=true`, força isenção patronal em TODAS as
        // competências (recolhimento unificado via DAS). Mais amplo que
        // `periodos_simples` (intervalo) — qualquer competência fica zerada.
        const isSimplesGlobal = this.csConfig.simples_nacional === true;
        const isSimples = isSimplesGlobal || (this.csConfig.periodos_simples?.some(p => {
          const pI = new Date(p.inicio);
          const pF = new Date(p.fim);
          return compDate >= pI && compDate <= pF;
        }) ?? false);

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
   * Roteia o cálculo de INSS pelo port 1:1 (`Inss.apurarInss`).
   *
   *   - Alíquota fixa (quando usuário informou): base × aliquota_fixa / 100.
   *   - Pré-EC 103/2019 (< 2020-03): alíquota única da faixa onde o salário se encaixa.
   *   - Pós-EC 103/2019: progressivo faixa-a-faixa com teto.
   */
  private calcularINSSProgressivo(comp: string, base: number): number {
    if (this.csConfig.aliquota_segurado_tipo === 'fixa' && this.csConfig.aliquota_segurado_fixa) {
      return new Decimal(base)
        .times(this.csConfig.aliquota_segurado_fixa)
        .div(100)
        .toDP(2, ROUND_CS_IR)
        .toNumber();
    }
    const faixas = this.getFaixasParaCompetencia(comp);
    const aliquotaUnica = comp < '2020-03';
    const limitarTeto = this.csConfig.aliquota_segurado_tipo !== 'fixa';
    return Inss.apurarInss(new Decimal(base), faixas, aliquotaUnica, limitarTeto).toNumber();
  }
}
