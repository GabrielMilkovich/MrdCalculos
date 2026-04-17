/**
 * PJe-Calc v2.15.1 — CustomValidator (abstract)
 * Porte TS-adaptado de: br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator
 *
 * Base dos validadores. No Java é parametrizado pela anotação (`@Required`,
 * `@Min`, etc.); aqui guardamos a especificação (spec) diretamente como
 * campo tipado.
 */
import type { ValidatorContext } from './validator-context';

export abstract class CustomValidator<TSpec> {
  protected spec!: TSpec;
  protected bean: unknown = null;

  /** Define a spec (equivalente à anotação em Java). */
  initialize(spec: TSpec): void {
    this.spec = spec;
  }

  /** Define o bean que está sendo validado. */
  setBean(bean: unknown): void {
    this.bean = bean;
  }

  getBean(): unknown { return this.bean; }

  /** Retorna a chave da mensagem (ex.: "{MSG0003}"). */
  abstract getMessage(): string;

  /** Retorna os grupos de validação (bytes no Java). */
  abstract getGroups(): number[];

  /** Retorna a condição (Groovy Eval no Java; aqui opcional). */
  protected getCondition(): string { return ''; }

  /** Retorna parâmetros adicionais para a mensagem (ex.: Min.value). */
  getParameter(_key: string): unknown { return null; }

  /** Valida o contexto. */
  abstract isValid(context: ValidatorContext): boolean;
}
