/**
 * PJe-Calc v2.15.1 — OcorrenciaInssUnique
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaInssUnique
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/OcorrenciaInssUnique.java
 *
 * Chave composta (competencia + decimoTerceiro) para indexar ocorrências de
 * INSS em OptimizerListSearchUnique.
 */
import { Competencia } from '../../../../base/comum/competencia';
import type { OcorrenciaDeInss } from './ocorrencia-de-inss';

export class OcorrenciaInssUnique {
  private competencia: Competencia | null = null;
  private decimoTerceiro: boolean = false;

  constructor(arg?: OcorrenciaDeInss | { competencia: Competencia; decimoTerceiro: boolean }) {
    if (!arg) return;
    if (arg instanceof OcorrenciaDeInssMarker) {
      // unreachable — apenas para o TS aceitar o tipo
    }
    if ((arg as { competencia?: Competencia }).competencia instanceof Competencia) {
      const o = arg as { competencia: Competencia; decimoTerceiro: boolean };
      this.competencia = o.competencia;
      this.decimoTerceiro = o.decimoTerceiro;
    } else {
      const ocorrencia = arg as OcorrenciaDeInss;
      this.update(ocorrencia);
    }
  }

  update(ocorrencia: OcorrenciaDeInss): this {
    const d = ocorrencia.getDataOcorrenciaInss();
    this.competencia = d ? Competencia.getInstance(d) : null;
    this.decimoTerceiro = ocorrencia.getOcorrenciaDecimoTerceiro();
    return this;
  }

  updatePorCompetencia(competencia: Competencia, decimoTerceiro: boolean): this {
    this.competencia = competencia;
    this.decimoTerceiro = decimoTerceiro;
    return this;
  }

  getCompetencia(): Competencia | null { return this.competencia; }
  setCompetencia(c: Competencia | null): void { this.competencia = c; }

  getDecimoTerceiro(): boolean { return this.decimoTerceiro; }
  setDecimoTerceiro(v: boolean): void { this.decimoTerceiro = v; }

  /** Chave canônica para Map (inclui decimoTerceiro flag). */
  toKey(): string {
    const c = this.competencia?.toKey() ?? '';
    return `${c}|${this.decimoTerceiro ? '13' : 'N'}`;
  }

  equals(other: unknown): boolean {
    if (!(other instanceof OcorrenciaInssUnique)) return false;
    const a = this.competencia?.toKey();
    const b = other.competencia?.toKey();
    return a === b && this.decimoTerceiro === other.decimoTerceiro;
  }
}

// marker inalcançável usado só para tipar o instanceof (tipos opacos)
class OcorrenciaDeInssMarker {}
