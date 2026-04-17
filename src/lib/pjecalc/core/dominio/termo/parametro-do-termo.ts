/**
 * Porte 1:1 de ParametroDoTermo.java (121 linhas).
 *
 * Contexto passado para todos os Termos (Quantidade, Divisor, BaseTabelada, BaseVerba, etc.)
 * resolverem seu valor. Carrega: Calculo, VerbaDeCalculo, Periodo, Modo, Fase,
 * PeriodoAquisitivo, ferias indenizadas, valor integral (proporcionalização), periodo para média.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/ParametroDoTermo.java:14-120
 */
import Decimal from 'decimal.js';
import type { Periodo } from '../../base/comum/periodo';
import { ModoDeCalculoEnum, FaseDoCalculoEnum } from '../../constantes/enums';
import type { Calculo } from '../calculo/calculo';
import type { VerbaDeCalculo } from '../verbacalculo/verba-de-calculo';

export class ParametroDoTermo {
  private calculo: Calculo;
  private verbaDeCalculo: VerbaDeCalculo;
  private periodo: Periodo | null;
  private modo: ModoDeCalculoEnum;
  private fase: FaseDoCalculoEnum;
  private periodoAquisitivo: Periodo | null;
  private feriasIndenizadas: boolean = false;
  private valorIntegral: Decimal | null = null;
  private periodoParaMedia: Periodo | null;

  constructor(
    calculo: Calculo,
    verbaDeCalculo: VerbaDeCalculo,
    periodo: Periodo | null,
    modo: ModoDeCalculoEnum,
    fase: FaseDoCalculoEnum,
    periodoAquisitivo: Periodo | null,
    periodoParaMedia: Periodo | null,
  ) {
    if (!calculo || !verbaDeCalculo) {
      throw new Error('Calculo e Verba não podem ser nulos');
    }
    this.calculo = calculo;
    this.verbaDeCalculo = verbaDeCalculo;
    this.periodo = periodo;
    this.modo = modo;
    this.fase = fase;
    this.periodoAquisitivo = periodoAquisitivo;
    this.valorIntegral = null;
    this.periodoParaMedia = periodoParaMedia;
  }

  getCalculo(): Calculo { return this.calculo; }
  getVerbaDeCalculo(): VerbaDeCalculo { return this.verbaDeCalculo; }

  getValorDaQuantidadeDaVerba(): Decimal {
    // Ref: ParametroDoTermo.java:48 — delega à VerbaDeCalculo.getValorDaQuantidadeCalculada
    // (eslint-disable-next-line @typescript-eslint/no-explicit-any) — método pode não existir em todas as VerbaDeCalculo
    const fn = (this.verbaDeCalculo as { getValorDaQuantidadeCalculada?: (p: ParametroDoTermo) => Decimal }).getValorDaQuantidadeCalculada;
    if (typeof fn === 'function') return fn.call(this.verbaDeCalculo, this);
    return new Decimal(0);
  }

  getValorMaiorRemuneracaoDoCalculo(): Decimal {
    const fn = (this.calculo as { getValorMaiorRemuneracao?: () => Decimal }).getValorMaiorRemuneracao;
    if (typeof fn === 'function') return fn.call(this.calculo);
    return new Decimal(0);
  }

  getValorUltimaRemuneracaoDoCalculo(): Decimal {
    const fn = (this.calculo as { getValorUltimaRemuneracao?: () => Decimal }).getValorUltimaRemuneracao;
    if (typeof fn === 'function') return fn.call(this.calculo);
    return new Decimal(0);
  }

  getPeriodo(): Periodo | null { return this.periodo; }
  setPeriodo(periodo: Periodo | null): void { this.periodo = periodo; }

  getModo(): ModoDeCalculoEnum { return this.modo; }
  getFase(): FaseDoCalculoEnum { return this.fase; }
  setFase(fase: FaseDoCalculoEnum): void { this.fase = fase; }

  setPeriodoAquisitivo(p: Periodo | null): void { this.periodoAquisitivo = p; }
  getPeriodoAquisitivo(): Periodo | null { return this.periodoAquisitivo; }

  isFeriasIndenizadas(): boolean { return this.feriasIndenizadas; }
  setFeriasIndenizadas(v: boolean): void { this.feriasIndenizadas = v; }

  getValorIntegral(): Decimal | null { return this.valorIntegral; }
  setValorIntegral(v: Decimal | null): void { this.valorIntegral = v; }

  isProporcionalizado(): boolean { return this.valorIntegral !== null; }

  getPeriodoParaMedia(): Periodo | null { return this.periodoParaMedia; }
  setPeriodoParaMedia(p: Periodo | null): void { this.periodoParaMedia = p; }

  clone(): ParametroDoTermo {
    const p = new ParametroDoTermo(
      this.calculo, this.verbaDeCalculo, this.periodo,
      this.modo, this.fase, this.periodoAquisitivo, this.periodoParaMedia,
    );
    p.setValorIntegral(this.valorIntegral);
    p.setFeriasIndenizadas(this.feriasIndenizadas);
    return p;
  }
}
