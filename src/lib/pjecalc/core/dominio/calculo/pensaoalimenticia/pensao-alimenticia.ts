/**
 * PJe-Calc v2.15.1 — PensaoAlimenticia + MaquinaDeCalculoDePensaoAlimenticia
 * Porte 1:1 de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia (388 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.MaquinaDeCalculoDePensaoAlimenticia (128 LOC)
 *
 * Implementa:
 *   - Acumulo de bases por verba (verbas ativas com IncidenciaPensaoAlimenticia=true).
 *   - Diferenciacao verbas tributaveis vs nao-tributaveis (proporcao IRPF).
 *   - Incidencia opcional sobre juros (com proporcao especial em ferias gozadas).
 *   - Incidencia sobre FGTS principal (corrigido OU corrigido+juros) com deducao
 *     opcional de depositos/saques.
 *   - Incidencia sobre Multa do FGTS (corrigida OU com juros).
 *   - Modo "Calculo Externo" (ParcelasAtualizaveisCreditosReclamante) com perc
 *     separado para verbas tributaveis e nao-tributaveis.
 *   - Calculo final: getValorDevido() = totalDasBases × aliquota%.
 *
 * Mantem API legada `calcular(base, fgts)` e classe `PensaoAlimenticia` exportada
 * para o engine v3 (core/index.ts:210) e PensaoAlimenticiaJRAdapter.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

/** Tipo da base legada usado por engine V3 (mapeamento simplificado para UI). */
export type BasePensaoLegacy = 'liquido' | 'bruto' | 'bruto_menos_inss';

/**
 * Verba minima exigida pelo MaquinaDeCalculoDePensaoAlimenticia.liquidar().
 * Espelha VerbaDeCalculo.java apenas no que pensao consome.
 */
export interface VerbaPensaoInput {
  incidenciaPensaoAlimenticia: boolean;
  incidenciaIRPF: boolean;
  caracteristicaFerias: boolean;
  /** Total da diferenca corrigida (todas as ocorrencias). */
  valorTotalDiferencaCorrigida: Decimal;
  /** Total da diferenca corrigida apenas das ferias GOZADAS (subset). */
  valorTotalDiferencaCorrigidaDeFeriasGozadas: Decimal;
  /** Juros acumulados da verba (corrigidos). */
  valorDeJuros: Decimal;
}

/** Bloco FGTS minimo. Mapeia getters relevantes do Fgts.java. */
export interface FgtsPensaoInput {
  incidenciaPensaoAlimenticia: boolean;
  incidenciaPensaoAlimenticiaSobreMulta: boolean;
  deduzirDoFGTS: boolean;
  totalDoFgtsPelaDataLiquidacao: Decimal;
  totalGeralDepositadoOuSacadoPelaDataLiquidacao: Decimal;
  totalDaDiferencaCorrigidaPelaDataLiquidacao: Decimal;
  totalDoDepositadoOuSacadoCorrigidoPelaDataLiquidacao: Decimal;
  totalDaMultaDoFgts: Decimal;
  valorDaMultaDoFgtsCorrigido: Decimal;
}

/**
 * Parcelas para calculo externo (ParcelasAtualizaveisCreditosReclamante).
 * Mapeia getValorParcela* / getValorJuros* relevantes.
 */
export interface ParcelasCreditoReclamante {
  valorParcelaVerbasTributavel: Decimal;
  valorParcelaVerbasNaoTributavel: Decimal;
  valorJurosVerbasTributavel: Decimal;
  valorJurosVerbasNaoTributavel: Decimal;
  valorJurosFgts: Decimal;
  valorJurosMultaFgts: Decimal;
}

/** Input agregado para liquidar() ou liquidarParaCalculoExterno(). */
export interface CalculoPensaoInput {
  verbasAtivas: VerbaPensaoInput[];
  fgts: FgtsPensaoInput;
  isCalculoExterno: boolean;
  parcelasCreditoReclamante?: ParcelasCreditoReclamante;
}

/** Divisao Decimal compatibilidade Utils.dividir (zero-safe). */
function dividir(num: Decimal | null | undefined, den: Decimal | null | undefined): Decimal {
  if (!num || !den) return ZERO;
  if (den.isZero()) return ZERO;
  return num.div(den);
}

/** aplicarTaxa do PJe-Calc Utils — base × (perc/100). */
function aplicarTaxa(perc: Decimal | null | undefined, base: Decimal | null | undefined): Decimal {
  if (!perc || !base) return ZERO;
  return base.times(perc.div(HUNDRED));
}

/**
 * Entidade PensaoAlimenticia — porte 1:1 dos campos persistentes do Java.
 * Inclui APIs legadas (calcular/getValorCalculado) usadas pela engine v3.
 */
export class PensaoAlimenticia implements IModuloLiquidavel {
  // ── Campos diretos Java ──────────────────────────────────────────────
  private apurarPensaoAlimenticia: boolean = false;
  private aliquota: Decimal | null = null;
  private incidirSobreJuros: boolean = false;
  private valorBaseVerbas: Decimal | null = null;
  private valorBaseVerbasTributaveis: Decimal | null = null;
  private valorBaseFgts: Decimal | null = null;
  private valorBaseMultaDoFgts: Decimal | null = null;
  private percPrincipalTributavel: Decimal | null = null;
  private percPrincipalNaoTributavel: Decimal | null = null;
  private incidirSobrePrincipalTributavel: boolean = true;
  private incidirSobrePrincipalNaoTributavel: boolean = false;
  private dataEvento: Date | null = null;
  private folhaDoEvento: string | null = null;

  // ── Campos legados engine v3 ────────────────────────────────────────
  private percentualLegacy: Decimal = ZERO;
  private valorFixoLegacy: Decimal | null = null;
  private baseLegacy: BasePensaoLegacy = 'liquido';
  private valorCalculadoLegacy: Decimal = ZERO;
  private valorSobreFgtsLegacy: Decimal = ZERO;

  // ── Maquina embutida (LAZY) ────────────────────────────────────────
  private _maquina: MaquinaDeCalculoDePensaoAlimenticia | null = null;
  private getMaquina(): MaquinaDeCalculoDePensaoAlimenticia {
    if (this._maquina === null) {
      this._maquina = new MaquinaDeCalculoDePensaoAlimenticia(this);
    }
    return this._maquina;
  }

  // ── Getters/Setters Java 1:1 ────────────────────────────────────────
  getApurarPensaoAlimenticia(): boolean { return this.apurarPensaoAlimenticia; }
  setApurarPensaoAlimenticia(v: boolean): void { this.apurarPensaoAlimenticia = v; }
  getAliquota(): Decimal | null { return this.aliquota; }
  setAliquota(v: Decimal | null): void { this.aliquota = v; }
  getIncidirSobreJuros(): boolean { return this.incidirSobreJuros; }
  setIncidirSobreJuros(v: boolean): void { this.incidirSobreJuros = v; }
  getValorBaseVerbas(): Decimal | null { return this.valorBaseVerbas; }
  setValorBaseVerbas(v: Decimal | null): void { this.valorBaseVerbas = v; }
  getValorBaseVerbasTributaveis(): Decimal | null { return this.valorBaseVerbasTributaveis; }
  setValorBaseVerbasTributaveis(v: Decimal | null): void { this.valorBaseVerbasTributaveis = v; }
  getValorBaseFgts(): Decimal | null { return this.valorBaseFgts; }
  setValorBaseFgts(v: Decimal | null): void { this.valorBaseFgts = v; }
  getValorBaseMultaDoFgts(): Decimal | null { return this.valorBaseMultaDoFgts; }
  setValorBaseMultaDoFgts(v: Decimal | null): void { this.valorBaseMultaDoFgts = v; }
  getPercPrincipalTributavel(): Decimal | null { return this.percPrincipalTributavel; }
  setPercPrincipalTributavel(v: Decimal | null): void { this.percPrincipalTributavel = v; }
  getPercPrincipalNaoTributavel(): Decimal | null { return this.percPrincipalNaoTributavel; }
  setPercPrincipalNaoTributavel(v: Decimal | null): void { this.percPrincipalNaoTributavel = v; }
  getIncidirSobrePrincipalTributavel(): boolean { return this.incidirSobrePrincipalTributavel; }
  setIncidirSobrePrincipalTributavel(v: boolean): void { this.incidirSobrePrincipalTributavel = v; }
  getIncidirSobrePrincipalNaoTributavel(): boolean { return this.incidirSobrePrincipalNaoTributavel; }
  setIncidirSobrePrincipalNaoTributavel(v: boolean): void { this.incidirSobrePrincipalNaoTributavel = v; }
  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(v: Date | null): void { this.dataEvento = v; }
  getFolhaDoEvento(): string | null { return this.folhaDoEvento; }
  setFolhaDoEvento(v: string | null): void { this.folhaDoEvento = v; }

  /** Java PensaoAlimenticia.resetar() — limpa flags quando apurar=false. */
  resetar(): void {
    this.incidirSobreJuros = false;
    this.aliquota = null;
    this.folhaDoEvento = null;
    this.dataEvento = null;
    this.apurarPensaoAlimenticia = false;
    this.valorBaseFgts = null;
    this.valorBaseMultaDoFgts = null;
    this.valorBaseVerbas = null;
  }

  /** Java PensaoAlimenticia.getTotalDasBases() — soma das 3 bases. */
  getTotalDasBases(): Decimal {
    let total = ZERO;
    if (this.valorBaseVerbas) total = total.plus(this.valorBaseVerbas);
    if (this.valorBaseFgts) total = total.plus(this.valorBaseFgts);
    if (this.valorBaseMultaDoFgts) total = total.plus(this.valorBaseMultaDoFgts);
    return total;
  }

  /** Java PensaoAlimenticia.getProporcaoBaseTributavel(). */
  getProporcaoBaseTributavel(): Decimal {
    const totalBase = this.getTotalDasBases();
    if (totalBase.lte(ZERO)) return ZERO;
    return dividir(this.valorBaseVerbasTributaveis, totalBase);
  }

  /** Java PensaoAlimenticia.getValorDevido() — total × (aliquota/100). */
  getValorDevido(): Decimal | null {
    if (this.aliquota === null) return null;
    return this.getTotalDasBases().times(this.aliquota.div(HUNDRED));
  }

  /** Java PensaoAlimenticia.getValorDevidoSomenteSobreVerbas(). */
  getValorDevidoSomenteSobreVerbas(): Decimal | null {
    if (this.aliquota === null) return null;
    if (this.valorBaseVerbas === null) return ZERO;
    return this.valorBaseVerbas.times(this.aliquota.div(HUNDRED));
  }

  /** Java PensaoAlimenticia.getValorDevidoSomenteSobreVerbasTributaveis(). */
  getValorDevidoSomenteSobreVerbasTributaveis(): Decimal | null {
    if (this.aliquota === null) return null;
    if (this.valorBaseVerbasTributaveis === null) return ZERO;
    return this.valorBaseVerbasTributaveis.times(this.aliquota.div(HUNDRED));
  }

  /** Java PensaoAlimenticia.liquidar() — delega para a maquina. */
  liquidarComDados(input: CalculoPensaoInput): void {
    this.getMaquina().liquidar(input);
  }

  /** Stub IModuloLiquidavel — engine V3 chama calcular() direto. */
  liquidar(): void { /* no-op: usar liquidarComDados() ou calcular() */ }

  // ── API LEGADA (engine v3 / UI) ─────────────────────────────────────
  getPercentual(): Decimal { return this.percentualLegacy; }
  setPercentual(v: Decimal): void {
    this.percentualLegacy = v;
    if (this.aliquota === null) this.aliquota = v;
  }
  getValorFixo(): Decimal | null { return this.valorFixoLegacy; }
  setValorFixo(v: Decimal): void { this.valorFixoLegacy = v; }
  getApurar(): boolean { return this.apurarPensaoAlimenticia; }
  setApurar(v: boolean): void { this.apurarPensaoAlimenticia = v; }
  getBase(): BasePensaoLegacy { return this.baseLegacy; }
  setBase(v: BasePensaoLegacy): void { this.baseLegacy = v; }
  getValorCalculado(): Decimal { return this.valorCalculadoLegacy; }
  getValorSobreFgts(): Decimal { return this.valorSobreFgtsLegacy; }
  getTotal(): Decimal { return this.valorCalculadoLegacy.plus(this.valorSobreFgtsLegacy); }

  /**
   * API legada engine V3: calcula `base × percentual` (+ FGTS opcional).
   * Mantida para retrocompatibilidade. Para fidelidade Java, prefira
   * liquidarComDados().
   */
  calcular(baseLiquido: Decimal, fgtsTotal: Decimal): void {
    if (!this.apurarPensaoAlimenticia || this.percentualLegacy.isZero()) return;
    if (this.valorFixoLegacy !== null && !this.valorFixoLegacy.isZero()) {
      this.valorCalculadoLegacy = this.valorFixoLegacy;
      return;
    }
    const pct = this.percentualLegacy.div(HUNDRED);
    this.valorCalculadoLegacy = arredondarValorMonetario(baseLiquido.times(pct));
    if (!fgtsTotal.isZero()) {
      this.valorSobreFgtsLegacy = arredondarValorMonetario(fgtsTotal.times(pct));
    }
  }
}

/**
 * MaquinaDeCalculoDePensaoAlimenticia — porte 1:1 do Java.
 * Atribui valorBaseVerbas, valorBaseVerbasTributaveis, valorBaseFgts,
 * valorBaseMultaDoFgts no PensaoAlimenticia conforme verbas + fgts + flags.
 */
export class MaquinaDeCalculoDePensaoAlimenticia {
  constructor(private readonly pensao: PensaoAlimenticia) {}

  /** Java MaquinaDeCalculoDePensaoAlimenticia.liquidar() — entrypoint. */
  liquidar(input: CalculoPensaoInput): void {
    if (input.isCalculoExterno && input.parcelasCreditoReclamante) {
      this.liquidarParaCalculoExterno(input);
      return;
    }
    this.liquidarPadrao(input);
  }

  /** Java MaquinaDeCalculoDePensaoAlimenticia.liquidar() — caminho normal. */
  private liquidarPadrao(input: CalculoPensaoInput): void {
    let baseDeVerbas = ZERO;
    let baseDeVerbasTributaveis = ZERO;
    const incidirSobreJuros = this.pensao.getIncidirSobreJuros();

    for (const verba of input.verbasAtivas) {
      if (!verba.incidenciaPensaoAlimenticia) continue;
      let valorBase = ZERO;
      // Java: if (verba.isCaracteristicaFerias()) usa diferenca corrigida de FERIAS GOZADAS
      valorBase = valorBase.plus(
        verba.caracteristicaFerias
          ? verba.valorTotalDiferencaCorrigidaDeFeriasGozadas
          : verba.valorTotalDiferencaCorrigida,
      );
      if (incidirSobreJuros && verba.caracteristicaFerias) {
        // Java: proporcao = ferias_gozadas / total_corrigida (zero-safe)
        const proporcao = verba.valorTotalDiferencaCorrigida.isZero()
          ? ZERO
          : dividir(verba.valorTotalDiferencaCorrigidaDeFeriasGozadas, verba.valorTotalDiferencaCorrigida);
        valorBase = valorBase.plus(arredondarValorMonetario(verba.valorDeJuros.times(proporcao)));
      } else if (incidirSobreJuros) {
        valorBase = valorBase.plus(verba.valorDeJuros);
      }
      baseDeVerbas = baseDeVerbas.plus(valorBase);
      if (verba.incidenciaIRPF) {
        baseDeVerbasTributaveis = baseDeVerbasTributaveis.plus(valorBase);
      }
    }
    this.pensao.setValorBaseVerbas(baseDeVerbas);
    this.pensao.setValorBaseVerbasTributaveis(baseDeVerbasTributaveis);

    // FGTS principal
    if (input.fgts.incidenciaPensaoAlimenticia) {
      let baseFgts: Decimal;
      if (incidirSobreJuros) {
        baseFgts = input.fgts.totalDoFgtsPelaDataLiquidacao;
        if (input.fgts.deduzirDoFGTS) {
          baseFgts = baseFgts.minus(input.fgts.totalGeralDepositadoOuSacadoPelaDataLiquidacao);
        }
      } else {
        baseFgts = input.fgts.totalDaDiferencaCorrigidaPelaDataLiquidacao;
        if (input.fgts.deduzirDoFGTS) {
          baseFgts = baseFgts.minus(input.fgts.totalDoDepositadoOuSacadoCorrigidoPelaDataLiquidacao);
        }
      }
      this.pensao.setValorBaseFgts(baseFgts);
    } else {
      this.pensao.setValorBaseFgts(ZERO);
    }

    // FGTS multa
    if (input.fgts.incidenciaPensaoAlimenticiaSobreMulta) {
      this.pensao.setValorBaseMultaDoFgts(
        incidirSobreJuros ? input.fgts.totalDaMultaDoFgts : input.fgts.valorDaMultaDoFgtsCorrigido,
      );
    } else {
      this.pensao.setValorBaseMultaDoFgts(ZERO);
    }
  }

  /**
   * Java MaquinaDeCalculoDePensaoAlimenticia.liquidarParaCalculoExterno().
   * Aplica percentuais separados para verbas Tributaveis vs NaoTributaveis,
   * sobre principal + (opcional) juros, vindas de
   * ParcelasAtualizaveisCreditosReclamante.
   */
  private liquidarParaCalculoExterno(input: CalculoPensaoInput): void {
    const parcelas = input.parcelasCreditoReclamante;
    if (!parcelas) {
      this.pensao.setValorBaseVerbas(ZERO);
      this.pensao.setValorBaseVerbasTributaveis(ZERO);
      this.pensao.setValorBaseFgts(ZERO);
      this.pensao.setValorBaseMultaDoFgts(ZERO);
      return;
    }
    let baseVerba = ZERO;
    let baseDeVerbasTributaveis = ZERO;
    const incJuros = this.pensao.getIncidirSobreJuros();
    const incTrib = this.pensao.getIncidirSobrePrincipalTributavel();
    const incNaoTrib = this.pensao.getIncidirSobrePrincipalNaoTributavel();
    const percTrib = this.pensao.getPercPrincipalTributavel();
    const percNaoTrib = this.pensao.getPercPrincipalNaoTributavel();

    if (incNaoTrib && percNaoTrib && !parcelas.valorParcelaVerbasNaoTributavel.isZero()) {
      baseVerba = baseVerba.plus(aplicarTaxa(percNaoTrib, parcelas.valorParcelaVerbasNaoTributavel));
    }
    if (incTrib && percTrib && !parcelas.valorParcelaVerbasTributavel.isZero()) {
      const aux = aplicarTaxa(percTrib, parcelas.valorParcelaVerbasTributavel);
      baseVerba = baseVerba.plus(aux);
      baseDeVerbasTributaveis = baseDeVerbasTributaveis.plus(aux);
    }
    if (incJuros && incNaoTrib && percNaoTrib && !parcelas.valorJurosVerbasNaoTributavel.isZero()) {
      baseVerba = baseVerba.plus(aplicarTaxa(percNaoTrib, parcelas.valorJurosVerbasNaoTributavel));
    }
    if (incJuros && incTrib && percTrib && !parcelas.valorJurosVerbasTributavel.isZero()) {
      const aux = aplicarTaxa(percTrib, parcelas.valorJurosVerbasTributavel);
      baseVerba = baseVerba.plus(aux);
      baseDeVerbasTributaveis = baseDeVerbasTributaveis.plus(aux);
    }
    this.pensao.setValorBaseVerbas(baseVerba);
    this.pensao.setValorBaseVerbasTributaveis(baseDeVerbasTributaveis);

    // FGTS principal — diferenca corrigida (+ juros se flag)
    if (input.fgts.incidenciaPensaoAlimenticia) {
      let baseFgts = input.fgts.totalDaDiferencaCorrigidaPelaDataLiquidacao;
      if (incJuros) baseFgts = baseFgts.plus(parcelas.valorJurosFgts);
      this.pensao.setValorBaseFgts(baseFgts);
    } else {
      this.pensao.setValorBaseFgts(ZERO);
    }

    // FGTS multa — corrigido (+ juros se flag)
    if (input.fgts.incidenciaPensaoAlimenticiaSobreMulta) {
      let baseMultaFgts = input.fgts.valorDaMultaDoFgtsCorrigido;
      if (incJuros) baseMultaFgts = baseMultaFgts.plus(parcelas.valorJurosMultaFgts);
      this.pensao.setValorBaseMultaDoFgts(baseMultaFgts);
    } else {
      this.pensao.setValorBaseMultaDoFgts(ZERO);
    }
  }

  getPensaoAlimenticia(): PensaoAlimenticia {
    return this.pensao;
  }
}
