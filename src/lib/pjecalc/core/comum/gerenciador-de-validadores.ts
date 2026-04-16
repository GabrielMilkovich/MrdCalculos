/**
 * PJe-Calc v2.15.1 — GerenciadorDeValidadores (singleton)
 * Porte TS-adaptado de: br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores
 *
 * No Java, o gerenciador usa Hibernate Validator `ClassValidator` para varrer
 * anotações nas classes. Em TypeScript não há anotações; usamos um registro
 * por classe onde consumidores declaram os pares `(property, validator)`.
 *
 *   const g = GerenciadorDeValidadores.getInstance();
 *   g.registrar(MinhaClasse, 'valor', new RequiredValidator(), required());
 *   g.validar(MinhaClasse, entidade); // lança NegocioException se inválido
 */
import { NegocioException } from './exceptions/negocio-exception';
import { MensagemDeRecurso } from './mensagem-de-recurso';
import { CustomValidator } from './validators/custom-validator';
import { ValidatorContext } from './validators/validator-context';

interface ValidationRule {
  property: string;
  validator: CustomValidator<unknown>;
}

export type ClassRef<T> = new (...args: unknown[]) => T;

export class GerenciadorDeValidadores {
  private static instance: GerenciadorDeValidadores | null = null;
  private readonly rules = new Map<ClassRef<unknown>, ValidationRule[]>();
  private grupo: number = 0;

  static getInstance(): GerenciadorDeValidadores {
    if (!this.instance) this.instance = new GerenciadorDeValidadores();
    return this.instance;
  }

  /** Reseta a instância (uso em testes). */
  static resetInstance(): void {
    this.instance = null;
  }

  getGroup(): number { return this.grupo; }

  /** Registra uma regra de validação para um atributo de uma classe. */
  registrar<T, TSpec>(
    clazz: ClassRef<T>,
    property: string,
    validator: CustomValidator<TSpec>,
    spec: TSpec,
  ): void {
    validator.initialize(spec);
    const list = this.rules.get(clazz as ClassRef<unknown>) ?? [];
    list.push({ property, validator: validator as CustomValidator<unknown> });
    this.rules.set(clazz as ClassRef<unknown>, list);
  }

  /** Valida todos os atributos de uma entidade contra as regras registradas. */
  validar<T>(clazz: ClassRef<T>, entidade: T, grupo: number = 0, propertyName: string | null = null): void {
    this.grupo = grupo;
    const list = this.rules.get(clazz as ClassRef<unknown>);
    if (!list || list.length === 0) return;

    const exception = new NegocioException();
    for (const rule of list) {
      if (propertyName != null && rule.property !== propertyName) continue;
      const value = this.obterValor(entidade, rule.property);
      const context = new ValidatorContext(entidade, value, rule.property);
      rule.validator.setBean(entidade);
      if (!rule.validator.isValid(context)) {
        const msg = new MensagemDeRecurso(entidade, rule.property, null as never);
        msg.setMensagem(rule.validator.getMessage());
        exception.adicionarMensagemDeRecurso(msg);
      }
    }
    if (exception.existeMensagensDeRecurso()) throw exception;
  }

  /** Valida apenas um atributo específico. */
  validarUmAtributo<T>(clazz: ClassRef<T>, entidade: T, nomeDoAtributo: string, grupo: number = 0): void {
    this.validar(clazz, entidade, grupo, nomeDoAtributo);
  }

  private obterValor(entidade: unknown, property: string): unknown {
    if (entidade == null) return null;
    const obj = entidade as Record<string, unknown>;
    const getter = `get${property.charAt(0).toUpperCase()}${property.slice(1)}`;
    const fn = obj[getter];
    if (typeof fn === 'function') return (fn as () => unknown).call(obj);
    return obj[property];
  }
}
