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
import { MensagemDeRecurso } from '../../../comum/mensagem-de-recurso';
import { Mensagens } from '../../../comum/mensagens';
import { NegocioException } from '../../../comum/exceptions/negocio-exception';
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

  /**
   * `validar` — porte 1-a-1 de AliquotasDoEmpregadorPorPeriodo.java:170-184.
   *
   * Regras:
   *   1. Pelo menos uma das 3 alíquotas (empresa, RAT, terceiros) deve ser
   *      informada — caso contrário lança NegocioException com 3 MensagemDeRecurso
   *      MSG0045 (empresaPorPeriodo, ratPorPeriodo, terceirosPorPeriodo).
   *   2. Não pode haver coincidência com outro período já cadastrado no mesmo
   *      Inss (erro MSG0024 em "dataTerminoPeriodo").
   *
   * Nota: a validação declarativa (@Required, @GreaterOrEqualThan) de Java via
   * GerenciadorDeValidadores foi portada separadamente — aqui porta-se apenas
   * a parte de negócio.
   */
  validar(): AliquotasDoEmpregadorPorPeriodo {
    if (
      this.aliquotaEmpresa == null &&
      this.aliquotaRAT == null &&
      this.aliquotaTerceiros == null
    ) {
      const excecao = new NegocioException();
      excecao.adicionarMensagemDeRecurso(
        new MensagemDeRecurso('aliquotaEmpresaPorPeriodo', Mensagens.MSG0045),
      );
      excecao.adicionarMensagemDeRecurso(
        new MensagemDeRecurso('aliquotaRatPorPeriodo', Mensagens.MSG0045),
      );
      excecao.adicionarMensagemDeRecurso(
        new MensagemDeRecurso('aliquotaTerceirosPorPeriodo', Mensagens.MSG0045),
      );
      throw excecao;
    }

    if (this.inss != null) {
      for (const outra of this.inss.getAliquotasPorPeriodos()) {
        if (outra === this) continue;
        if (this.isPeriodoCoincidenteCom(outra)) {
          throw new NegocioException(
            new MensagemDeRecurso('dataTerminoPeriodo', Mensagens.MSG0024),
          );
        }
      }
    }

    return this;
  }
}
