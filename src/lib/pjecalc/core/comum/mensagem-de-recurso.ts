/**
 * PJe-Calc v2.15.1 — MensagemDeRecurso
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso
 *
 * Mensagem de validação/erro vinculada a um atributo de uma entidade.
 */
import type { Mensagens } from './mensagens';

export class MensagemDeRecurso {
  private entidade: unknown | null;
  private atributo: string | null;
  private chave: Mensagens;
  private mensagem: string | null = null;
  private parametros: unknown[];

  constructor(
    entidadeOrAtributoOrChave: unknown | string | Mensagens,
    atributoOrChave?: string | Mensagens,
    chaveOrParam?: Mensagens | unknown,
    ...parametros: unknown[]
  ) {
    if (typeof entidadeOrAtributoOrChave === 'string' && typeof atributoOrChave === 'string') {
      this.entidade = null;
      this.atributo = entidadeOrAtributoOrChave;
      this.chave = atributoOrChave as unknown as Mensagens;
      this.parametros = chaveOrParam !== undefined ? [chaveOrParam, ...parametros] : [];
    } else if (typeof entidadeOrAtributoOrChave === 'string') {
      this.entidade = null;
      this.atributo = null;
      this.chave = entidadeOrAtributoOrChave as unknown as Mensagens;
      this.parametros = atributoOrChave !== undefined ? [atributoOrChave, ...parametros] : [];
    } else {
      this.entidade = entidadeOrAtributoOrChave;
      this.atributo = (atributoOrChave as string) ?? null;
      this.chave = chaveOrParam as Mensagens;
      this.parametros = parametros;
    }
  }

  getChave(): Mensagens { return this.chave; }
  setChave(v: Mensagens): void { this.chave = v; }

  getParametros(): unknown[] { return this.parametros; }
  setParametros(v: unknown[]): void { this.parametros = v; }

  getAtributo(): string | null { return this.atributo; }
  setAtributo(v: string | null): void { this.atributo = v; }

  getEntidade(): unknown | null { return this.entidade; }
  setEntidade(v: unknown | null): void { this.entidade = v; }

  getMensagem(): string | null { return this.mensagem; }
  setMensagem(v: string | null): void { this.mensagem = v; }
}
