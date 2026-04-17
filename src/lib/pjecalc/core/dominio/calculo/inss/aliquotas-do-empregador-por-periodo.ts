/**
 * PJe-Calc v2.15.1 — AliquotasDoEmpregadorPorPeriodo
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.AliquotasDoEmpregadorPorPeriodo
 *
 * Ref Java: pjecalc-fonte/.../calculo/inss/AliquotasDoEmpregadorPorPeriodo.java
 *
 * Alíquotas empresa (contribuição previdenciária do empregador) + RAT (SAT) +
 * Terceiros, vigentes em um período específico. Um cálculo pode ter N períodos
 * distintos (configurado quando tipoAliquotaEmpregador = POR_PERIODO no Inss).
 */
import type Decimal from 'decimal.js';
import { Periodo } from '../../../base/comum/periodo';
import type { Inss } from './inss';

export class AliquotasDoEmpregadorPorPeriodo {
  private id: number | null = null;
  private versao: number = 0;
  private inss: Inss | null = null;
  private dataInicioPeriodo: Date | null = null;
  private dataTerminoPeriodo: Date | null = null;
  private aliquotaEmpresa: Decimal | null = null;
  private aliquotaRAT: Decimal | null = null;
  private aliquotaTerceiros: Decimal | null = null;

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getInss(): Inss | null { return this.inss; }
  setInss(inss: Inss | null): void { this.inss = inss; }

  getDataInicioPeriodo(): Date | null { return this.dataInicioPeriodo; }
  setDataInicioPeriodo(d: Date | null): void { this.dataInicioPeriodo = d; }

  getDataTerminoPeriodo(): Date | null { return this.dataTerminoPeriodo; }
  setDataTerminoPeriodo(d: Date | null): void { this.dataTerminoPeriodo = d; }

  getAliquotaEmpresa(): Decimal | null { return this.aliquotaEmpresa; }
  setAliquotaEmpresa(v: Decimal | null): void { this.aliquotaEmpresa = v; }

  getAliquotaRAT(): Decimal | null { return this.aliquotaRAT; }
  setAliquotaRAT(v: Decimal | null): void { this.aliquotaRAT = v; }

  getAliquotaTerceiros(): Decimal | null { return this.aliquotaTerceiros; }
  setAliquotaTerceiros(v: Decimal | null): void { this.aliquotaTerceiros = v; }

  /** getPeriodo (Java linha 158) */
  getPeriodo(): Periodo | null {
    if (this.dataInicioPeriodo && this.dataTerminoPeriodo) {
      return new Periodo(this.dataInicioPeriodo, this.dataTerminoPeriodo);
    }
    return null;
  }

  /** isPeriodoCoincidenteCom (Java linha 165) */
  isPeriodoCoincidenteCom(outra: AliquotasDoEmpregadorPorPeriodo): boolean {
    const a = this.getPeriodo();
    const b = outra.getPeriodo();
    if (!a || !b) return false;
    return a.isDatasCoincidentesCom(b);
  }
}
