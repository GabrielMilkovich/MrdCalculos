/**
 * PJe-Calc v2.15.1 — MsgValidador (abstract)
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.calculo.MsgValidador
 *
 * Classe base das mensagens emitidas pelos validadores do cálculo.
 */
export abstract class MsgValidador {
  private tela: string | null = null;
  private campo: string | null = null;
  private descricao: string | null = null;

  isGlobal(): boolean { return this.campo === null; }
  abstract isImpeditivo(): boolean;
  abstract getTipo(): string;

  getTela(): string | null { return this.tela; }
  setTela(v: string | null): void { this.tela = v; }

  getCampo(): string | null { return this.campo; }
  setCampo(v: string | null): void { this.campo = v; }

  getDescricao(): string | null { return this.descricao; }
  setDescricao(v: string | null): void { this.descricao = v; }

  toString(): string {
    if (this.isGlobal()) {
      if (this.tela != null) return `${this.getTipo()}: [${this.tela}] ${this.descricao}`;
      return `${this.getTipo()}: ${this.descricao}`;
    }
    return `${this.getTipo()}: [${this.tela}] [${this.campo}] ${this.descricao}`;
  }
}
