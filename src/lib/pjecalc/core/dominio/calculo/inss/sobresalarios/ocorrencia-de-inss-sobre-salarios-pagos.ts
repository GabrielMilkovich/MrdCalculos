/**
 * PJe-Calc v2.15.1 — OcorrenciaDeInssSobreSalariosPagos
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/OcorrenciaDeInssSobreSalariosPagos.java
 *
 * Ocorrência mensal de INSS sobre salários **pagos** (contribuição já recolhida
 * ao FAP/INSS). Adiciona campos "recolhido":
 *   - valorBaseRecolhido
 *   - aliquotaRecolhidoSegurado
 *   - valorRecolhido{Segurado,Empresa,SAT,Terceiros} + tipoValorDoRecolhido*
 *     (CALCULADO | INFORMADO)
 *   - valorTotalInss{SAT,Terceiros} (para rateio)
 *
 * copiarValoresInformadosAnteriormente transfere os campos INFORMADO da
 * ocorrência antiga para a nova (Java linha 302).
 */
import type Decimal from 'decimal.js';
import { TipoValorEnum } from '../../../../constantes/enums';
import { OcorrenciaDeInss } from './ocorrencia-de-inss';
import type { InssSobreSalariosPagos } from './inss-sobre-salarios-pagos';

export class OcorrenciaDeInssSobreSalariosPagos extends OcorrenciaDeInss {
  private id: number | null = null;
  private inssSobreSalariosPagos: InssSobreSalariosPagos | null = null;
  private ocorrenciaOriginal: OcorrenciaDeInssSobreSalariosPagos | null = null;
  private valorBaseRecolhido: Decimal | null = null;
  private aliquotaRecolhidoSegurado: Decimal | null = null;
  private valorRecolhidoSegurado: Decimal | null = null;
  private tipoValorDoRecolhidoSegurado: TipoValorEnum = TipoValorEnum.CALCULADO;
  private valorRecolhidoEmpresa: Decimal | null = null;
  private tipoValorDoRecolhidoEmpresa: TipoValorEnum = TipoValorEnum.CALCULADO;
  private valorTotalInssSAT: Decimal | null = null;
  private valorRecolhidoSAT: Decimal | null = null;
  private tipoValorDoRecolhidoSAT: TipoValorEnum = TipoValorEnum.CALCULADO;
  private valorTotalInssTerceiros: Decimal | null = null;
  private valorRecolhidoTerceiros: Decimal | null = null;
  private tipoValorDoRecolhidoTerceiros: TipoValorEnum = TipoValorEnum.CALCULADO;

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }

  getInssSobreSalariosPagos(): InssSobreSalariosPagos | null {
    return this.inssSobreSalariosPagos;
  }
  setInssSobreSalariosPagos(v: InssSobreSalariosPagos | null): void {
    this.inssSobreSalariosPagos = v;
  }

  getOcorrenciaOriginal(): OcorrenciaDeInssSobreSalariosPagos | null { return this.ocorrenciaOriginal; }
  setOcorrenciaOriginal(v: OcorrenciaDeInssSobreSalariosPagos | null): void { this.ocorrenciaOriginal = v; }

  getValorBaseRecolhido(): Decimal | null { return this.valorBaseRecolhido; }
  setValorBaseRecolhido(v: Decimal | null): void { this.valorBaseRecolhido = v; }

  getAliquotaRecolhidoSegurado(): Decimal | null { return this.aliquotaRecolhidoSegurado; }
  setAliquotaRecolhidoSegurado(v: Decimal | null): void { this.aliquotaRecolhidoSegurado = v; }

  getValorRecolhidoSegurado(): Decimal | null { return this.valorRecolhidoSegurado; }
  setValorRecolhidoSegurado(v: Decimal | null): void { this.valorRecolhidoSegurado = v; }

  getTipoValorDoRecolhidoSegurado(): TipoValorEnum { return this.tipoValorDoRecolhidoSegurado; }
  setTipoValorDoRecolhidoSegurado(v: TipoValorEnum): void { this.tipoValorDoRecolhidoSegurado = v; }

  getValorRecolhidoEmpresa(): Decimal | null { return this.valorRecolhidoEmpresa; }
  setValorRecolhidoEmpresa(v: Decimal | null): void { this.valorRecolhidoEmpresa = v; }

  getTipoValorDoRecolhidoEmpresa(): TipoValorEnum { return this.tipoValorDoRecolhidoEmpresa; }
  setTipoValorDoRecolhidoEmpresa(v: TipoValorEnum): void { this.tipoValorDoRecolhidoEmpresa = v; }

  getValorTotalInssSAT(): Decimal | null { return this.valorTotalInssSAT; }
  setValorTotalInssSAT(v: Decimal | null): void { this.valorTotalInssSAT = v; }

  getValorRecolhidoSAT(): Decimal | null { return this.valorRecolhidoSAT; }
  setValorRecolhidoSAT(v: Decimal | null): void { this.valorRecolhidoSAT = v; }

  getTipoValorDoRecolhidoSAT(): TipoValorEnum { return this.tipoValorDoRecolhidoSAT; }
  setTipoValorDoRecolhidoSAT(v: TipoValorEnum): void { this.tipoValorDoRecolhidoSAT = v; }

  getValorTotalInssTerceiros(): Decimal | null { return this.valorTotalInssTerceiros; }
  setValorTotalInssTerceiros(v: Decimal | null): void { this.valorTotalInssTerceiros = v; }

  getValorRecolhidoTerceiros(): Decimal | null { return this.valorRecolhidoTerceiros; }
  setValorRecolhidoTerceiros(v: Decimal | null): void { this.valorRecolhidoTerceiros = v; }

  getTipoValorDoRecolhidoTerceiros(): TipoValorEnum { return this.tipoValorDoRecolhidoTerceiros; }
  setTipoValorDoRecolhidoTerceiros(v: TipoValorEnum): void { this.tipoValorDoRecolhidoTerceiros = v; }

  isValorRecolhidoSeguradoCalculado(): boolean { return this.tipoValorDoRecolhidoSegurado === TipoValorEnum.CALCULADO; }
  isValorRecolhidoSeguradoInformado(): boolean { return this.tipoValorDoRecolhidoSegurado === TipoValorEnum.INFORMADO; }
  isValorRecolhidoEmpresaCalculado(): boolean { return this.tipoValorDoRecolhidoEmpresa === TipoValorEnum.CALCULADO; }
  isValorRecolhidoEmpresaInformado(): boolean { return this.tipoValorDoRecolhidoEmpresa === TipoValorEnum.INFORMADO; }
  isValorRecolhidoSATCalculado(): boolean { return this.tipoValorDoRecolhidoSAT === TipoValorEnum.CALCULADO; }
  isValorRecolhidoSATInformado(): boolean { return this.tipoValorDoRecolhidoSAT === TipoValorEnum.INFORMADO; }
  isValorRecolhidoTerceirosCalculado(): boolean { return this.tipoValorDoRecolhidoTerceiros === TipoValorEnum.CALCULADO; }
  isValorRecolhidoTerceirosInformado(): boolean { return this.tipoValorDoRecolhidoTerceiros === TipoValorEnum.INFORMADO; }

  /** copiar (Java linha 261) */
  copiar(original: OcorrenciaDeInssSobreSalariosPagos): void {
    this.setInssSobreSalariosPagos(original.getInssSobreSalariosPagos());
    this.setDataInicioPeriodo(original.getDataInicioPeriodo());
    this.setDataTerminoPeriodo(original.getDataTerminoPeriodo());
    this.setDataOcorrenciaInss(original.getDataOcorrenciaInss());
    this.setValorBase(original.getValorBase());
    this.setTipoValorDaBase(original.getTipoValorDaBase());
    this.setAliquotaSegurado(original.getAliquotaSegurado());
    this.setValorTetoSegurado(original.getValorTetoSegurado());
    this.setValorTotalInssSegurado(original.getValorTotalInssSegurado());
    this.setValorBaseRecolhido(original.getValorBaseRecolhido());
    this.setAliquotaRecolhidoSegurado(original.getAliquotaRecolhidoSegurado());
    this.setValorRecolhidoSegurado(original.getValorRecolhidoSegurado());
    this.setTipoValorDoRecolhidoSegurado(original.getTipoValorDoRecolhidoSegurado());
    this.setValorDevidoSeguradoFinal(original.getValorDevidoSeguradoFinal());
    this.setAliquotaEmpresa(original.getAliquotaEmpresa());
    this.setValorTetoEmpresa(original.getValorTetoEmpresa());
    this.setValorTotalInssEmpresa(original.getValorTotalInssEmpresa());
    this.setValorRecolhidoEmpresa(original.getValorRecolhidoEmpresa());
    this.setTipoValorDoRecolhidoEmpresa(original.getTipoValorDoRecolhidoEmpresa());
    this.setValorDevidoEmpresaFinal(original.getValorDevidoEmpresaFinal());
    this.setAliquotaSAT(original.getAliquotaSAT());
    this.setValorTotalInssSAT(original.getValorTotalInssSAT());
    this.setValorRecolhidoSAT(original.getValorRecolhidoSAT());
    this.setTipoValorDoRecolhidoSAT(original.getTipoValorDoRecolhidoSAT());
    this.setValorDevidoSAT(original.getValorDevidoSAT());
    this.setAliquotaTerceiros(original.getAliquotaTerceiros());
    this.setValorTotalInssTerceiros(original.getValorTotalInssTerceiros());
    this.setValorRecolhidoTerceiros(original.getValorRecolhidoTerceiros());
    this.setTipoValorDoRecolhidoTerceiros(original.getTipoValorDoRecolhidoTerceiros());
    this.setValorDevidoTerceiros(original.getValorDevidoTerceiros());
    this.setIndiceDeCorrecaoTrabalhistaUtilizado(original.getIndiceDeCorrecaoTrabalhistaUtilizado());
    this.setIndiceDeCorrecaoPrevidenciariaUtilizado(original.getIndiceDeCorrecaoPrevidenciariaUtilizado());
  }

  recuperarValorOriginal(): void {
    if (this.ocorrenciaOriginal !== null) this.copiar(this.ocorrenciaOriginal);
  }

  /**
   * copiarValoresInformadosAnteriormente (Java linha 302) — transfere valores
   * INFORMADO dos 4 grupos (segurado/empresa/SAT/terceiros) da antiga para this.
   */
  copiarValoresInformadosAnteriormente(antiga: OcorrenciaDeInssSobreSalariosPagos | null): void {
    super.copiarValoresInformadosAnteriormente(antiga);
    if (antiga === null) return;
    if (antiga.isValorRecolhidoSeguradoInformado()) {
      this.setValorRecolhidoSegurado(antiga.getValorRecolhidoSegurado());
      this.setTipoValorDoRecolhidoSegurado(antiga.getTipoValorDoRecolhidoSegurado());
    }
    if (antiga.isValorRecolhidoEmpresaInformado()) {
      this.setValorRecolhidoEmpresa(antiga.getValorRecolhidoEmpresa());
      this.setTipoValorDoRecolhidoEmpresa(antiga.getTipoValorDoRecolhidoEmpresa());
    }
    if (antiga.isValorRecolhidoSATInformado()) {
      this.setValorRecolhidoSAT(antiga.getValorRecolhidoSAT());
      this.setTipoValorDoRecolhidoSAT(antiga.getTipoValorDoRecolhidoSAT());
    }
    if (antiga.isValorRecolhidoTerceirosInformado()) {
      this.setValorRecolhidoTerceiros(antiga.getValorRecolhidoTerceiros());
      this.setTipoValorDoRecolhidoTerceiros(antiga.getTipoValorDoRecolhidoTerceiros());
    }
  }

  /**
   * isJurosEMultaPrevidenciario (Java linha 397) — lógica idêntica à
   * OcorrenciaDeInssSobreSalariosDevidos, porém referenciando
   * InssSobreSalariosPagos.
   */
  isJurosEMultaPrevidenciario(): boolean {
    const inss = this.inssSobreSalariosPagos;
    if (!inss) return false;
    const iss = inss as unknown as {
      getCorrecaoPrevidenciaria?: () => boolean;
      getCorrecaoTrabalhista?: () => boolean;
      getCorrecao11941?: () => boolean;
      getDataLimiteCorrecao11941?: () => Date | null;
      getDataLimiteCorrecaoTrabalhista?: () => Date | null;
    };
    const corrPrev = iss.getCorrecaoPrevidenciaria?.() ?? false;
    const corrTrab = iss.getCorrecaoTrabalhista?.() ?? false;
    const corr11941 = iss.getCorrecao11941?.() ?? false;
    const dataLim11941 = iss.getDataLimiteCorrecao11941?.() ?? null;
    const dataLimTrab = iss.getDataLimiteCorrecaoTrabalhista?.() ?? null;
    const dataOc = this.dataOcorrenciaInss;
    const apos = (a: Date | null, b: Date | null): boolean => {
      if (!a || !b) return false;
      return a.getTime() > b.getTime();
    };
    const ramo1 = corrPrev && (!corrTrab || (corrTrab && apos(dataOc, dataLimTrab)));
    const ramo2 = corr11941 && apos(dataOc, dataLim11941) && corrTrab;
    return ramo1 || ramo2;
  }
}
