/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisUtils (base)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisUtils
 */
import { NegocioException } from '../../comum/exceptions/negocio-exception';
import type { MensagemDeRecurso } from '../../comum/mensagem-de-recurso';

export class ParcelasAtualizaveisUtils {
  protected static lancarErros(erros: MensagemDeRecurso[]): void {
    if (erros.length === 0) return;
    const exception = new NegocioException();
    for (const e of erros) {
      exception.adicionarMensagemDeRecurso(e);
    }
    throw exception;
  }
}
