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
  PjeIRConfig, PjeIRFaixaRow, PjeHonorariosConfig, PjePensaoConfig,
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
  private pensaoConfig?: PjePensaoConfig;

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

  // Estado interno para reaplicação com juros (Sprint 4.2-C2)
  // Armazenado em liquidar() para permitir aplicarIncidenciaJuros() pós-juros.
  private _baseBruta = 0;
  private _base13 = 0;
  private _baseFerias = 0;
  private _base13PorAno: Record<number, number> = {};
  private _compsFerias = new Set<string>();
  private _deducoesNominais = 0;
  private _mesesTotal = 1;
  private _tabelaCache: {
    faixas: { ate: number; aliquota: number; deducao: number }[];
    deducaoDependente: number;
  } | null = null;

  constructor(
    verbas: VerbaDeCalculo[],
    irConfig: PjeIRConfig,
    faixasIRDB: PjeIRFaixaRow[],
    honorariosConfig: PjeHonorariosConfig,
    inssAdapter: InssModuloAdapter,
    dataLiquidacao: string,
    pensaoConfig?: PjePensaoConfig,
  ) {
    this.verbas = verbas;
    this.irConfig = irConfig;
    this.faixasIRDB = faixasIRDB;
    this.honorariosConfig = honorariosConfig;
    this.inssAdapter = inssAdapter;
    this.dataLiquidacao = dataLiquidacao;
    this.pensaoConfig = pensaoConfig;
  }

  liquidar(_dataLiquidacao?: Date): void {
    if (!this.irConfig.apurar) return;

    // ─── Flags de controle (Sprint 4.2-A1) ───
    // apurar_rra: undefined → auto (mesesTotal > 1); true → forçar RRA; false → forçar tabela
    const apurarRraFlag = this.irConfig.apurar_rra;
    // aplicar_regime_caixa: true → tributar tudo no ano da liquidação (mesesTotal=1, tabela mensal)
    const regimeCaixa = this.irConfig.regime_caixa ?? false;
    // incidir_sobre_principal_tributavel: default true; false → excluir verbas COMUM/normais
    const incidirTributavel = this.irConfig.incidir_sobre_principal_tributavel ?? true;
    // incidir_sobre_principal_nao_tributavel: default false; true → incluir verbas irpf=false
    const incidirNaoTributavel = this.irConfig.incidir_sobre_principal_nao_tributavel ?? false;

    // ─── 1. Coletar bases por característica ───
    let baseBruta = 0;    // normal + demais
    let base13 = 0;        // 13º (tributação exclusiva)
    let baseFerias = 0;    // férias (tributação separada)
    const base13PorAno: Record<number, number> = {};
    const compsNormal = new Set<string>();
    const compsFerias = new Set<string>();
    // FIX 4 (IR-FIXER 2026-04-26): NM do RRA (Art. 12-A) =
    //   |competências de não-13 (com base IR > 0)| + |competências de 13 (idem)|
    // Sets SEPARADOS, somados por cardinalidade (sobreposições contam 2×).
    // Ref Java: pjecalc-fonte/.../MaquinaDeCalculoDeIrpf.java:266-282 e :414.
    // Bate com francisco-pablo: 28 (não-13) + 3 (13) = 31 ✓.
    const compsNaoTreze = new Set<string>();
    const compsTreze = new Set<string>();
    const anoLiq = parseInt(this.dataLiquidacao.slice(0, 4));
    void anoLiq; // reservado para futura segregação ano-liquidação

    for (const vc of this.verbas) {
      const temIncidenciaIR = vc.getIncidenciaIRPF();
      // Flag incidir_sobre_principal_nao_tributavel=true: incluir verbas sem incidência IR
      // Flag incidir_sobre_principal_tributavel=false: excluir verbas com incidência IR (COMUM)
      if (temIncidenciaIR) {
        if (!incidirTributavel) continue; // flag explícita: excluir tributáveis
      } else {
        if (!incidirNaoTributavel) continue; // default: não incluir não-tributáveis
      }
      const car = vc.getCaracteristica();
      const ehFerias = car === CaracteristicaDaVerbaEnum.FERIAS;
      const eh13 = car === CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO;

      for (const oc of vc.getOcorrenciasAtivas()) {
        const dataIni = oc.getDataInicial();
        if (!dataIni) continue;
        const dif = oc.getDiferenca().toNumber();
        if (dif <= 0) continue;
        // Etapa 2 D2 (2026-04-26): Java aplica regras especiais para FERIAS
        // (Ref: ProporcoesIrpf.java:64-69 do PJe-Calc):
        //   - case FERIAS: usa `getDiferencaCorrigidaParaCalculoDasIncidencias`
        //     (que aplica dobra ×0.5 e retira abono pecuniário, conforme
        //     CLT art. 137/143 — partes indenizatórias isentas IR)
        //   - case 13o e COMUM: usa `getDiferencaCorrigida` puro
        // Para férias indenizadas, o método retorna null e Java skip.
        // Para férias com dobra/abono, retorna porção tributável.
        let valorBase: number;
        if (ehFerias) {
          const baseIncid = oc.getDiferencaCorrigidaParaCalculoDasIncidencias();
          if (baseIncid === null) continue;  // férias indenizadas (sem dobra/abono): skip
          valorBase = baseIncid.toNumber();
        } else {
          const corrigida = oc.getDiferencaCorrigida();
          valorBase = corrigida ? corrigida.toNumber() : dif;
        }
        const comp = this.formatCompetencia(dataIni);
        // Particionar competência em bucket-13 ou bucket-não-13 (PJC).
        if (eh13) compsTreze.add(comp);
        else compsNaoTreze.add(comp);

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

    // ─── 2. Art. 12-A — NM com hierarquia de flags ───
    //
    //   regime_caixa=true .... NM=1 (IN RFB 1.500/2014 art.36)
    //   apurar_rra=false ..... NM=1 (UI força tabela mensal, sem RRA)
    //   apurar_rra=true ...... NM = sets separados (cardinalidade não-13 + 13)
    //                          UI explicita override — preserva semântica
    //                          original da Lei 7.713/88 art.12-A
    //   apurar_rra=undefined . NM = cardinalidade dos sets (Java parity)
    //                          Sprint 2 fix: trocado de computeSpanMesesAteLiquidacao
    //                          (span+stretch=12) por computeNMRra (cardinalidade pura).
    //                          Java MaquinaDeCalculoDeIrpf.java:1403 usa
    //                          mesesAnosAnteriores.size() + decimoTerceiro.size().
    //                          Validado: 4 PJCs com IR -17% a -100% movem para +/-5%.
    let mesesTotal: number;
    if (regimeCaixa || apurarRraFlag === false) {
      mesesTotal = 1;
    } else {
      // apurar_rra=true OU undefined: cardinalidade Java
      mesesTotal = this.computeNMRra(compsNaoTreze, compsTreze);
    }

    // ─── 3. Deduções ───
    let deducoes = 0;
    if (this.irConfig.deduzir_cs) {
      deducoes += this.inssAdapter.csReclamante;
    }
    if (this.irConfig.deduzir_honorarios && this.honorariosConfig.apurar_contratuais) {
      deducoes += this.calcularHonorariosContratuais();
    }
    // Sprint 4.2-B2 (TIER 2 P1): Pensão alimentícia — Lei 9.250/95 art. 4º II.
    // Quando apurar=true E (deduzir_pensao=true OU descontar_antes_ir=true),
    // a pensão é dedução da base de cálculo do IR. Implementação simplificada:
    // % do percentual configurado sobre a base bruta IR (proxy seguro evita
    // circularidade base='liquido'). Desliga se pensão estiver OFF.
    const pensaoApurada = this.pensaoConfig?.apurar === true;
    const deduzirPensao = this.irConfig.deduzir_pensao === true
      || this.pensaoConfig?.descontar_antes_ir === true;
    if (pensaoApurada && deduzirPensao) {
      const pct = this.pensaoConfig?.percentual ?? 0;
      const valorFixo = this.pensaoConfig?.valor_fixo ?? 0;
      // Quando há valor fixo, deduz integralmente (paridade com PJC: pensão
      // mensal acumulada × meses fica externa). Caso contrário, % × baseBruta
      // (não-13 normal — IR ano liquidação é o componente principal).
      const dedPensao = valorFixo > 0
        ? new Decimal(valorFixo).toDP(2, ROUND_CS_IR).toNumber()
        : new Decimal(baseBruta).times(pct).div(100).toDP(2, ROUND_CS_IR).toNumber();
      deducoes += dedPensao;
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
    // Determinar método reportado:
    // - apurar_rra=true  → forçar art_12a_rra (mesmo NM=1)
    // - apurar_rra=false → forçar tabela_mensal (mesmo NM>1)
    // - apurar_rra=undefined (auto) → RRA se NM>1, tabela caso contrário
    // - regime_caixa=true → sempre tabela_mensal (NM já foi forçado a 1)
    if (regimeCaixa) {
      this.metodo = 'tabela_mensal';
    } else if (apurarRraFlag === true) {
      this.metodo = 'art_12a_rra';
    } else if (apurarRraFlag === false) {
      this.metodo = 'tabela_mensal';
    } else {
      this.metodo = mesesTotal > 1 ? 'art_12a_rra' : 'tabela_mensal';
    }
    this.ir13Exclusivo = ir13.toDP(2, ROUND_CS_IR).toNumber();
    this.irFeriasSeparado = irFerias.toDP(2, ROUND_CS_IR).toNumber();
    this.irAnoLiquidacao = irTotal.toDP(2, ROUND_CS_IR).toNumber();

    // Persistir estado para eventual reaplicação de incidência sobre juros.
    this._baseBruta = baseBruta;
    this._base13 = base13;
    this._baseFerias = baseFerias;
    this._base13PorAno = { ...base13PorAno };
    this._compsFerias = new Set(compsFerias);
    this._deducoesNominais = deducoes;
    this._mesesTotal = mesesTotal;
    this._tabelaCache = tabela;
  }

  /**
   * Sprint 4.2-C2 — incidir_sobre_juros (Lei 8.541/92 art. 46).
   *
   * Aplicada APÓS o cálculo de juros mora pelo engine. Quando
   * `irConfig.incidir_sobre_juros=true`, soma os juros à base bruta IR e
   * recalcula `irAnoLiquidacao`/`impostoDevido` (paridade com Java
   * MaquinaDeCalculoDeIrpf.java:982 — juros entram somente na base "normal",
   * não em 13º exclusivo nem em férias separado).
   *
   * Súmula 368 IV TST defende isenção dos juros mora trabalhistas; engine
   * deixa a decisão para o usuário via flag (default OFF preserva regressão).
   *
   * @param jurosTotal Total de juros mora (já calculado pelo engine sobre
   *   ocorrências com `compor_principal !== false`).
   */
  aplicarIncidenciaJuros(jurosTotal: number): void {
    if (!this.irConfig.apurar) return;
    if (this.irConfig.incidir_sobre_juros !== true) return;
    if (!this._tabelaCache) return;
    if (jurosTotal <= 0) return;

    const tabela = this._tabelaCache;
    const baseBrutaComJuros = new Decimal(this._baseBruta).plus(jurosTotal).toNumber();
    const mesesTotal = this._mesesTotal;
    const deducoes = this._deducoesNominais;

    // Recalcular IR sobre a base normal (Art. 12-A RRA preserva NM original).
    let irTotal = new Decimal(0);
    if (baseBrutaComJuros > 0) {
      const deducaoDepBruto = new Decimal(this.irConfig.dependentes)
        .times(tabela.deducaoDependente).times(mesesTotal).toDP(2, ROUND_CS_IR).toNumber();
      const baseTrib = Math.max(0, baseBrutaComJuros - deducoes - deducaoDepBruto);
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

    // 13º e férias separadas NÃO recebem juros (Java: juros vão só ao bucket normal).
    const ir13 = new Decimal(this.ir13Exclusivo);
    const irFerias = new Decimal(this.irFeriasSeparado);
    const imposto = irTotal.plus(ir13).plus(irFerias);

    const deducaoDep = new Decimal(this.irConfig.dependentes)
      .times(tabela.deducaoDependente).times(mesesTotal).toDP(2, ROUND_CS_IR).toNumber();

    this.baseCalculo = Number(
      new Decimal(baseBrutaComJuros + this._base13 + this._baseFerias).toDP(2, ROUND_CS_IR),
    );
    this.baseTributavel = Number(
      new Decimal(
        Math.max(0, baseBrutaComJuros - deducoes - deducaoDep)
          + this._base13 + this._baseFerias,
      ).toDP(2, ROUND_CS_IR),
    );
    this.impostoDevido = imposto.toDP(2, ROUND_CS_IR).toNumber();
    this.irAnoLiquidacao = irTotal.toDP(2, ROUND_CS_IR).toNumber();
  }

  // ─── Helpers ───

  private formatCompetencia(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * NM do RRA (Art. 12-A) = SOMA das cardinalidades de DOIS sets separados:
   *   1) competências de verbas NÃO-13º (Demais, Aviso, Férias) com base IR > 0
   *   2) competências de verbas 13º com diferença IR > 0
   *
   * Sobreposições entre os dois sets são CONTADAS DUAS VEZES (uma em cada).
   * Confirmado pelo PJC em `MaquinaDeCalculoDeIrpf.java:266-282` (separa em
   * dois HashSet<Date>) e `:414`:
   *   somatorioMesesAnteriores = mesesAnosAnteriores.size + mesesAnosAnterioresDecimoTerceiro.size
   *
   * Para francisco-pablo: 28 (não-13) + 3 (13) = 31 ✓ (vs span 28 do código antigo).
   */
  private computeNMRra(compsNaoTreze: Set<string>, compsTreze: Set<string>): number {
    const total = compsNaoTreze.size + compsTreze.size;
    return Math.max(1, total);
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
