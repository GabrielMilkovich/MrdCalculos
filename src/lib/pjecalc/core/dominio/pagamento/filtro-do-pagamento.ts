/**
 * PJe-Calc v2.15.1 — FiltroDoPagamento (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.FiltroDoPagamento
 *
 * Ref Java: pjecalc-fonte/.../pagamento/FiltroDoPagamento.java (~53 linhas)
 */
import type { Calculo } from '../calculo/calculo';
import type { Pagamento } from './pagamento';

export class FiltroDoPagamento {
  private calculo: Calculo | null = null;

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  filtrar(): Pagamento[] {
    return []; // TODO(fase-9/infra): implementar quando RepositorioDePagamento existir.
  }
}
