/**
 * PJe-Calc v2.15.1 — Utils
 * Porte 1:1 de: br.jus.trt8.pjecalc.base.comum.Utils
 *
 * Seleção: predicados de nulidade, aritmética BigDecimal, correção monetária,
 * arredondamento (HALF_EVEN) e constantes. Omitidos: Groovy shell, reflection,
 * I/O (GZIP/ZIP), ResourceBundle, Seam logging, formatação UI.
 *
 * Referência Java: pjecalc-fonte/base/br/jus/trt8/pjecalc/base/comum/Utils.java
 */
import Decimal from 'decimal.js';

// Espelha MathContext(38) + rounding HALF_EVEN de Utils.CONTEXTO_MATEMATICO (linha 59).
// Aplicado GLOBALMENTE: qualquer módulo que importar Decimal após este import recebe
// as configurações de precisão oficiais do PJe-Calc.
Decimal.set({ precision: 38, rounding: Decimal.ROUND_HALF_EVEN });

// =====================================================
// Constantes (linhas 59-75 de Utils.java)
// =====================================================

export const CONTEXTO_MATEMATICO_PRECISION = 38;
export const CEM = new Decimal('100');
export const CINQUENTA_POR_CENTO = new Decimal('0.5');
export const VALOR_TRES = new Decimal('3');
export const VALOR_DOIS = new Decimal('2');
export const OITO_PORCENTO = new Decimal('0.08');
export const DUAS_CASAS_DECIMAIS = 2;
export const QUATRO_CASAS_DECIMAIS = 4;
export const SEIS_CASAS_DECIMAIS = 6;
export const NOVE_CASAS_DECIMAIS = 9;
export const VALOR_HORA_MAXIMO = 23;
export const VALOR_HORA_MINIMO = 0;
export const VALOR_MINUTO_MAXIMO = 59;
export const VALOR_MINUTO_MINIMO = 0;

// =====================================================
// Predicados de nulidade (linhas 211-253)
// =====================================================

/** Utils.nulo (linha 211) */
export function nulo(arg: unknown): arg is null | undefined {
  return arg === null || arg === undefined;
}

/** Utils.nuloOuBranco (linha 215) */
export function nuloOuBranco(arg: string | null | undefined): boolean {
  return nulo(arg) || arg === '';
}

/** Utils.nulos (linha 219) — TRUE se TODOS os args forem null */
export function nulos(...args: unknown[]): boolean {
  for (const t of args) {
    if (t !== null && t !== undefined) return false;
  }
  return true;
}

/** Utils.naoNulo (linha 227) */
export function naoNulo<T>(arg: T | null | undefined): arg is T {
  return arg !== null && arg !== undefined;
}

/** Utils.naoNulos (linha 231) — TRUE se TODOS os args forem não-null */
export function naoNulos(...args: unknown[]): boolean {
  for (const t of args) {
    if (t === null || t === undefined) return false;
  }
  return true;
}

/** Utils.naoVazio (linha 239) */
export function naoVazio(arg: string | null | undefined): boolean {
  return naoNulo(arg) && arg !== '';
}

// =====================================================
// Aritmética BigDecimal → Decimal (linhas 415-465)
// =====================================================

/** Utils.multiplicar (linha 415). Retorna null se algum operando for null. */
export function multiplicar(a: Decimal | null | undefined, b: Decimal | null | undefined): Decimal | null {
  if (naoNulos(a, b)) return (a as Decimal).times(b as Decimal);
  return null;
}

/** Utils.multiplicar com padrão (linha 422) */
export function multiplicarComPadrao(
  a: Decimal | null | undefined,
  b: Decimal | null | undefined,
  padrao: Decimal
): Decimal {
  const r = multiplicar(a, b);
  return naoNulo(r) ? r : padrao;
}

/** Utils.dividir (linha 427). Retorna null se algum operando for null. */
export function dividir(dividendo: Decimal | null | undefined, divisor: Decimal | null | undefined): Decimal | null {
  if (naoNulos(dividendo, divisor)) return (dividendo as Decimal).div(divisor as Decimal);
  return null;
}

/** Utils.dividir com padrão (linha 434) */
export function dividirComPadrao(
  dividendo: Decimal | null | undefined,
  divisor: Decimal | null | undefined,
  padrao: Decimal
): Decimal {
  const r = dividir(dividendo, divisor);
  return naoNulo(r) ? r : padrao;
}

/** Utils.somar (linha 443). Retorna null se algum operando for null. */
export function somar(a: Decimal | null | undefined, b: Decimal | null | undefined): Decimal | null {
  if (naoNulos(a, b)) return (a as Decimal).plus(b as Decimal);
  return null;
}

/** Utils.somar com padrão (linha 450) */
export function somarComPadrao(
  a: Decimal | null | undefined,
  b: Decimal | null | undefined,
  padrao: Decimal
): Decimal {
  const r = somar(a, b);
  return naoNulo(r) ? r : padrao;
}

/** Utils.subtrair (linha 455). Retorna null se algum operando for null. */
export function subtrair(minuendo: Decimal | null | undefined, subtraendo: Decimal | null | undefined): Decimal | null {
  if (naoNulos(minuendo, subtraendo)) return (minuendo as Decimal).minus(subtraendo as Decimal);
  return null;
}

/** Utils.subtrair com padrão (linha 462) */
export function subtrairComPadrao(
  minuendo: Decimal | null | undefined,
  subtraendo: Decimal | null | undefined,
  padrao: Decimal
): Decimal {
  const r = subtrair(minuendo, subtraendo);
  return naoNulo(r) ? r : padrao;
}

/** Utils.zerarSeNegativo (linha 467) */
export function zerarSeNegativo(valor: Decimal | null | undefined): Decimal | null {
  if (nulo(valor)) return null;
  if ((valor as Decimal).isNegative()) return new Decimal(0);
  return valor as Decimal;
}

/** Utils.zerarSeNulo (linha 477) */
export function zerarSeNulo(valor: Decimal | null | undefined): Decimal {
  if (nulo(valor)) return new Decimal(0);
  return valor as Decimal;
}

/** Utils.retirarAbono (linha 484) */
export function retirarAbono(fatorAbono: Decimal, base: Decimal): Decimal {
  return base.div(fatorAbono);
}

// =====================================================
// Aplicações — correção monetária, juros, multa, taxa, teto, piso
// (linhas 97-152)
// =====================================================

/**
 * Utils.aplicarCorrecaoMonetaria (linha 102)
 * Aplica o índice acumulado ao valor e arredonda HALF_EVEN a 2 casas.
 * Se índice é negativo, divide pelo valor absoluto (edge case raro).
 */
export function aplicarCorrecaoMonetaria(
  indiceAcumulado: Decimal | null | undefined,
  valor: Decimal | null | undefined
): Decimal | null {
  if (nulo(indiceAcumulado) || nulo(valor)) return (valor as Decimal | null) ?? null;
  const idx = indiceAcumulado as Decimal;
  if (idx.s < 0) {
    return arredondarValorMonetario(valor!.div(idx.negated()));
  }
  return arredondarValorMonetario(idx.times(valor as Decimal));
}

/** Utils.aplicarCorrecaoMonetaria com default (linha 97) */
export function aplicarCorrecaoMonetariaComPadrao(
  indice: Decimal | null | undefined,
  valor: Decimal | null | undefined,
  padrao: Decimal
): Decimal {
  const r = aplicarCorrecaoMonetaria(indice, valor);
  return naoNulo(r) ? r : padrao;
}

/** Utils.aplicarTaxa (linha 133). valor * (taxa/100), precisão 38, sem arredondar. */
export function aplicarTaxa(taxa: Decimal | null | undefined, valor: Decimal | null | undefined): Decimal | null {
  if (nulo(taxa) || nulo(valor)) return null;
  return (valor as Decimal).times(obterPercentualPara(taxa as Decimal)!);
}

/** Utils.aplicarJuros (linha 116) — alias de aplicarTaxa */
export const aplicarJuros = aplicarTaxa;

/** Utils.aplicarMulta (linha 124) — alias de aplicarTaxa */
export const aplicarMulta = aplicarTaxa;

/** Utils.aplicarTeto (linha 140). Se valor > teto, retorna teto. */
export function aplicarTeto(teto: Decimal | null | undefined, valor: Decimal | null | undefined): Decimal | null | undefined {
  if (naoNulos(teto, valor) && (valor as Decimal).comparedTo(teto as Decimal) > 0) {
    return teto as Decimal;
  }
  return valor;
}

/** Utils.aplicarPiso (linha 147). Se 0 < valor < piso, retorna piso. */
export function aplicarPiso(piso: Decimal | null | undefined, valor: Decimal | null | undefined): Decimal | null | undefined {
  if (naoNulos(piso, valor) && !(valor as Decimal).equals(0) && (valor as Decimal).comparedTo(piso as Decimal) < 0) {
    return piso as Decimal;
  }
  return valor;
}

// =====================================================
// Arredondamento (linhas 154-178)
// =====================================================

/**
 * Utils.arredondarValorMonetario (linha 169)
 * setScale(2, HALF_EVEN) — banker's rounding.
 */
export function arredondarValorMonetario(valor: Decimal | null | undefined): Decimal {
  return arredondarValor(valor, DUAS_CASAS_DECIMAIS);
}

/** Utils.arredondarValor (linha 173) */
export function arredondarValor(valor: Decimal | null | undefined, escala: number): Decimal {
  if (nulo(valor)) return valor as unknown as Decimal;
  return (valor as Decimal).toDecimalPlaces(escala, Decimal.ROUND_HALF_EVEN);
}

/**
 * Utils.arredondarValorRegraIRPF (linha 154)
 * Regra especial da RFB: arredonda HALF_EVEN a 4, truncando para 1 casa decimal
 * via regras escalonadas (≤54 → trunca; ≥955 → sobe para inteiro; outros → arredonda).
 */
export function arredondarValorRegraIRPF(numero: Decimal): Decimal {
  const sNumero = numero.toDecimalPlaces(4, Decimal.ROUND_HALF_EVEN).toFixed(4);
  const partes = sNumero.split('.');
  const parteInteira = partes[0];
  const decimalTruncado = partes[1].substring(0, 3);
  const segundoETerceiroAlgarismoDecimal = decimalTruncado.substring(1, 3);
  if (new Decimal(segundoETerceiroAlgarismoDecimal).comparedTo(new Decimal('54')) <= 0) {
    return new Decimal(`${parteInteira}.${decimalTruncado.substring(0, 1)}`);
  }
  if (parseInt(decimalTruncado, 10) >= parseInt('955', 10)) {
    return new Decimal(parteInteira).plus(1);
  }
  const primeiroAlgarismo = parseInt(decimalTruncado.substring(0, 1), 10);
  return new Decimal(`${parteInteira}.${primeiroAlgarismo + 1}`);
}

// =====================================================
// Helpers percentuais (linha 180)
// =====================================================

/** Utils.obterPercentualPara (linha 180). Retorna valor/100 com MathContext(38). */
export function obterPercentualPara(valor: Decimal | null | undefined): Decimal | null {
  if (nulo(valor)) return null;
  return (valor as Decimal).div(CEM);
}

// =====================================================
// String helpers (linhas 243-258, 722-727)
// =====================================================

/** Utils.isVazio (linha 251). TRUE se null/undefined ou string vazia. */
export function isVazio(arg: string | null | undefined): boolean {
  return nulo(arg) || arg === '';
}

/** Utils.isNaoVazios (linha 243). TRUE se TODOS os args forem não-null e não-vazios. */
export function isNaoVazios(...args: Array<string | null | undefined>): boolean {
  for (const s of args) {
    if (nulo(s) || s === '') return false;
  }
  return true;
}

/**
 * Utils.substituirPontoPorVirgula (linha 255).
 * Substitui apenas o ÚLTIMO ponto por vírgula — útil para exibição de
 * números com separador decimal BR quando a representação original usa
 * ponto (ex: "1.234.56" → "1.234,56").
 */
export function substituirPontoPorVirgula(valor: string): string {
  const reversed = valor.split('').reverse().join('');
  const substituido = reversed.replace(/\./, ',');
  return substituido.split('').reverse().join('');
}

/**
 * Utils.filtrarSomenteNumeros (linha 722).
 * Remove qualquer caractere não-dígito. Ex: "123.456.789-00" → "12345678900".
 * Preserva null/undefined sem lançar.
 */
export function filtrarSomenteNumeros(texto: string | null | undefined): string | null | undefined {
  if (nulo(texto)) return texto;
  return (texto as string).replace(/\D+/g, '');
}

/**
 * Utils.objetoParaString (linha 77).
 * Formata objeto como "ClasseSimples [attr1:valor1, attr2:valor2, ...]"
 * chamando getters via reflexão. Em TS usamos acesso direto a propriedades.
 * Se um atributo não tem getter camel-case, tenta a propriedade literal.
 * Erros por atributo são silenciados (espelha o comportamento Java de logar
 * e continuar).
 */
export function objetoParaString(objeto: unknown, ...atributos: string[]): string {
  if (nulo(objeto) || typeof objeto !== 'object') return String(objeto);
  const className = (objeto as { constructor?: { name?: string } }).constructor?.name ?? 'Object';
  const parts: string[] = [];
  for (const atributo of atributos) {
    let valor: unknown;
    try {
      const getterName =
        'get' + atributo.charAt(0).toUpperCase() + atributo.slice(1);
      const obj = objeto as Record<string, unknown>;
      if (typeof obj[getterName] === 'function') {
        valor = (obj[getterName] as () => unknown)();
      } else {
        valor = obj[atributo];
      }
    } catch {
      valor = undefined;
    }
    parts.push(`${atributo}:${valor}`);
  }
  return `${className} [${parts.join(', ')}]`;
}
