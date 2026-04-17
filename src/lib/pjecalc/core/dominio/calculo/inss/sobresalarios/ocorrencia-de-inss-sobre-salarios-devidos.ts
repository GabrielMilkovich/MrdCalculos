/**
 * PJe-Calc v2.15.1 — OcorrenciaDeInssSobreSalariosDevidos
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/OcorrenciaDeInssSobreSalariosDevidos.java
 *
 * Ocorrência mensal de INSS sobre salários **devidos** (verbas do cálculo que
 * geraram diferença). Adiciona sobre a base abstrata:
 *   - valorBaseVerbas: base específica das verbas da reclamação
 *   - aliquotaDoTotalSegurado: alíquota efetiva sobre (base + baseVerbas)
 *   - valorDevidoSeguradoVerbas / EmpresaVerbas: valores por grupo de verbas
 *   - indiceDeCorrecaoDoReclamante + fatorCorrecao: correção aplicável à parcela
 *     devida ao reclamante
 *   - ocorrenciaOriginal: snapshot da versão original (para recuperação)
 *
 * isJurosEMultaPrevidenciario é complexo: depende de CORRECAO_PREV/TRAB/11941
 * do InssSobreSalariosDevidos (port via ducktyping por enquanto).
 */
import Decimal from 'decimal.js';
import { OcorrenciaDeInss } from './ocorrencia-de-inss';
import type { InssSobreSalariosDevidos } from './inss-sobre-salarios-devidos';

const ZERO = new Decimal(0);
const UM = new Decimal(1);

function zerarSeNegativo(v: Decimal | null): Decimal | null {
  if (v === null) return null;
  return v.isNegative() ? ZERO : v;
}

export class OcorrenciaDeInssSobreSalariosDevidos extends OcorrenciaDeInss {
  private id: number | null = null;
  private inssSobreSalariosDevidos: InssSobreSalariosDevidos | null = null;
  private ocorrenciaOriginal: OcorrenciaDeInssSobreSalariosDevidos | null = null;
  private valorBaseVerbas: Decimal | null = null;
  private aliquotaDoTotalSegurado: Decimal | null = null;
  private valorDevidoSeguradoVerbas: Decimal | null = null;
  private valorDevidoEmpresaVerbas: Decimal | null = null;
  private indiceDeCorrecaoDoReclamante: Decimal | null = null;
  private fatorCorrecao: Decimal = UM;

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }

  /** Override: Java linha 86 — depende do InssSobreSalariosDevidos.getApurarInssSegurado(). */
  isRealizarCalculoParaSegurado(): boolean {
    const inss = this.inssSobreSalariosDevidos;
    if (!inss) return super.isRealizarCalculoParaSegurado();
    const f = (inss as unknown as { getApurarInssSegurado?: () => boolean }).getApurarInssSegurado?.();
    return f ?? false;
  }

  getInssSobreSalariosDevidos(): InssSobreSalariosDevidos | null {
    return this.inssSobreSalariosDevidos;
  }
  setInssSobreSalariosDevidos(v: InssSobreSalariosDevidos | null): void {
    this.inssSobreSalariosDevidos = v;
  }

  getOcorrenciaOriginal(): OcorrenciaDeInssSobreSalariosDevidos | null {
    return this.ocorrenciaOriginal;
  }
  setOcorrenciaOriginal(v: OcorrenciaDeInssSobreSalariosDevidos | null): void {
    this.ocorrenciaOriginal = v;
  }

  /** Java linha 111 — zerarSeNegativo */
  getValorBaseVerbas(): Decimal | null { return zerarSeNegativo(this.valorBaseVerbas); }
  setValorBaseVerbas(v: Decimal | null): void { this.valorBaseVerbas = v; }

  getAliquotaDoTotalSegurado(): Decimal | null { return this.aliquotaDoTotalSegurado; }
  setAliquotaDoTotalSegurado(v: Decimal | null): void { this.aliquotaDoTotalSegurado = v; }

  /** Java linha 127 — zerarSeNegativo */
  getValorDevidoSeguradoVerbas(): Decimal | null {
    return zerarSeNegativo(this.valorDevidoSeguradoVerbas);
  }
  setValorDevidoSeguradoVerbas(v: Decimal | null): void { this.valorDevidoSeguradoVerbas = v; }

  getValorDevidoEmpresaVerbas(): Decimal | null { return this.valorDevidoEmpresaVerbas; }
  setValorDevidoEmpresaVerbas(v: Decimal | null): void { this.valorDevidoEmpresaVerbas = v; }

  /** Java linha 143 — divide por fatorCorrecao se != 1 */
  getIndiceDeCorrecaoDoReclamante(): Decimal | null {
    if (!this.fatorCorrecao.equals(UM) && this.indiceDeCorrecaoDoReclamante !== null) {
      return this.indiceDeCorrecaoDoReclamante.div(this.fatorCorrecao);
    }
    return this.indiceDeCorrecaoDoReclamante;
  }
  setIndiceDeCorrecaoDoReclamante(v: Decimal | null): void {
    this.indiceDeCorrecaoDoReclamante = v;
  }

  getFatorCorrecao(): Decimal { return this.fatorCorrecao; }
  setFatorCorrecao(v: Decimal): void { this.fatorCorrecao = v; }

  /** Java linha 162 — base + baseVerbas (null-safe). */
  getValorSomaDasBases(): Decimal {
    let soma = this.valorBase;
    const bv = this.getValorBaseVerbas();
    if (bv !== null) soma = soma.plus(bv);
    return soma;
  }

  /** Java linha 170 — valorDevidoSeguradoFinal × indiceDeCorrecaoDoReclamante */
  getValorDevidoReclamanteCorrigido(): Decimal | null {
    const dev = this.getValorDevidoSeguradoFinal();
    const idx = this.getIndiceDeCorrecaoDoReclamante();
    if (dev !== null && idx !== null) return dev.times(idx);
    return null;
  }

  /** copiar (Java linha 177) — clona campos de uma ocorrência original */
  copiar(original: OcorrenciaDeInssSobreSalariosDevidos): void {
    this.setInssSobreSalariosDevidos(original.getInssSobreSalariosDevidos());
    this.setDataInicioPeriodo(original.getDataInicioPeriodo());
    this.setDataTerminoPeriodo(original.getDataTerminoPeriodo());
    this.setDataOcorrenciaInss(original.getDataOcorrenciaInss());
    this.setValorBase(original.getValorBase());
    this.setTipoValorDaBase(original.getTipoValorDaBase());
    this.setAliquotaSegurado(original.getAliquotaSegurado());
    this.setValorTetoSegurado(original.getValorTetoSegurado());
    this.setValorTotalInssSegurado(original.getValorTotalInssSegurado());
    this.setValorBaseVerbas(original.getValorBaseVerbas());
    this.setAliquotaDoTotalSegurado(original.getAliquotaDoTotalSegurado());
    this.setValorDevidoSeguradoVerbas(original.getValorDevidoSeguradoVerbas());
    this.setValorDevidoSeguradoFinal(original.getValorDevidoSeguradoFinal());
    this.setAliquotaEmpresa(original.getAliquotaEmpresa());
    this.setValorTetoEmpresa(original.getValorTetoEmpresa());
    this.setValorTotalInssEmpresa(original.getValorTotalInssEmpresa());
    this.setValorDevidoEmpresaVerbas(original.getValorDevidoEmpresaVerbas());
    this.setValorDevidoEmpresaFinal(original.getValorDevidoEmpresaFinal());
    this.setAliquotaSAT(original.getAliquotaSAT());
    this.setValorDevidoSAT(original.getValorDevidoSAT());
    this.setAliquotaTerceiros(original.getAliquotaTerceiros());
    this.setValorDevidoTerceiros(original.getValorDevidoTerceiros());
    this.setIndiceDeCorrecaoDoReclamante(original.getIndiceDeCorrecaoDoReclamante());
    this.setFatorCorrecao(original.getFatorCorrecao());
    this.setIndiceDeCorrecaoTrabalhistaUtilizado(original.getIndiceDeCorrecaoTrabalhistaUtilizado());
    this.setIndiceDeCorrecaoPrevidenciariaUtilizado(original.getIndiceDeCorrecaoPrevidenciariaUtilizado());
  }

  recuperarValorOriginal(): void {
    if (this.ocorrenciaOriginal !== null) {
      this.copiar(this.ocorrenciaOriginal);
    }
  }

  /**
   * isJurosEMultaPrevidenciario (Java linha 256) — expressão complexa
   * envolvendo correções previdenciária/trabalhista/11941 do
   * InssSobreSalariosDevidos. Simplificação: se inss ausente, retorna false.
   */
  isJurosEMultaPrevidenciario(): boolean {
    const inss = this.inssSobreSalariosDevidos;
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

    const ramo1 = corrPrev && (!corrTrab || (corr11941 && apos(dataOc, dataLim11941) && apos(dataOc, dataLimTrab)));
    const ramo2 = corr11941 && apos(dataOc, dataLim11941) && corrTrab;
    return ramo1 || ramo2;
  }
}
