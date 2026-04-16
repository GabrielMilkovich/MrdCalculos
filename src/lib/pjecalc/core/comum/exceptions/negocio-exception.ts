/**
 * PJe-Calc v2.15.1 — NegocioException
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException
 *
 * Exceção de negócio: RuntimeException que carrega uma lista de
 * MensagemDeRecurso (geralmente falhas de validação).
 */
import type { MensagemDeRecurso } from '../mensagem-de-recurso';
import type { Mensagens } from '../mensagens';

export class NegocioException extends Error {
  private readonly mensagensDeRecurso: MensagemDeRecurso[] = [];

  constructor(causaOrMensagem?: Error | MensagemDeRecurso | null, mensagemDeRecurso?: MensagemDeRecurso | null) {
    super();
    this.name = 'NegocioException';
    if (causaOrMensagem instanceof Error) {
      if (causaOrMensagem.stack) this.stack = causaOrMensagem.stack;
      if (mensagemDeRecurso) this.adicionarMensagemDeRecurso(mensagemDeRecurso);
    } else if (causaOrMensagem) {
      this.adicionarMensagemDeRecurso(causaOrMensagem);
    }
  }

  getMensagensDeRecurso(): MensagemDeRecurso[] { return this.mensagensDeRecurso; }

  adicionarMensagemDeRecurso(mensagem: MensagemDeRecurso): void {
    this.mensagensDeRecurso.push(mensagem);
  }

  agregarExcecao(ne: NegocioException): void {
    for (const m of ne.getMensagensDeRecurso()) {
      this.adicionarMensagemDeRecurso(m);
    }
  }

  existeMensagensDeRecurso(): boolean {
    return this.mensagensDeRecurso.length > 0;
  }

  obterMensagemDeRecursoParaOCampo(mensagem: Mensagens, campo: string | null): MensagemDeRecurso | null {
    for (const msg of this.mensagensDeRecurso) {
      const msgStr = msg.getMensagem();
      if (msgStr === null || msgStr !== String(mensagem) || campo === null) continue;
      if (msg.getAtributo() === campo) return msg;
    }
    return null;
  }
}
