/**
 * PJe-Calc v2.15.1 — Formula + FormulaCalculada + FormulaReflexo + FormulaInformada
 * Porte 1:1 consolidado de:
 *   - br.jus.trt8.pjecalc.negocio.dominio.formula.Formula (119 linhas)
 *   - br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaCalculada (36 linhas)
 *   - br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaInformada (82 linhas)
 *   - br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo (156 linhas)
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/formula/
 *
 * No PJe-Calc, Formula é uma hierarquia JPA (SINGLE_TABLE com discriminator).
 * Cada sub-tipo define como o valor da ocorrência é calculado:
 *   - FormulaCalculada: base/div × mult × qty × dobra (verba principal)
 *   - FormulaReflexo: média/média ponderada/valor da principal
 *   - FormulaInformada: valor direto (informado pelo usuário)
 *
 * Componentes de fórmula (Termos): BaseTabelada, BaseVerba, Divisor,
 * Multiplicador, Quantidade — cada um pode ser INFORMADO, CALCULADO, IMPORTADO.
 */
import Decimal from 'decimal.js';
import { naoNulo } from '../../base/comum/utils';

// ────────────── Termos da fórmula ──────────────

/** Tipo de base tabelada (Histórico Salarial, Salário Mínimo, Maior/Última Remuneração) */
export type BaseTabeladaTipo = 'HISTORICO_SALARIAL' | 'SALARIO_MINIMO' | 'MAIOR_REMUNERACAO' | 'ULTIMA_REMUNERACAO';

export interface BaseTabelada {
  tipo: BaseTabeladaTipo;
  aplicarProporcionalidade: boolean;
}

export interface ItemBaseVerba {
  verbaDeCalculoId: string;
  integralizar: boolean;
}

export interface BaseVerba {
  itens: ItemBaseVerba[];
}

export interface Divisor {
  tipo: 'INFORMADO' | 'OUTRO_VALOR' | 'IMPORTADO_CARTAO' | 'CALCULADO';
  outroValor: Decimal | null;
}

export interface Multiplicador {
  outroValor: Decimal | null;
}

export interface Quantidade {
  tipo: 'INFORMADA' | 'IMPORTADA_CARTAO' | 'IMPORTADA_CALENDARIO' | 'CALCULADA';
  valorInformado: Decimal | null;
  aplicarProporcionalidade: boolean;
}

export interface ValorPago {
  tipo: 'INFORMADO' | 'CALCULADO' | 'PERCENTUAL';
  valorInformado: Decimal | null;
}

// ────────────── Formula (abstract) ──────────────

export abstract class Formula {
  protected valorPago: ValorPago | null = null;

  getValorPago(): ValorPago | null { return this.valorPago; }
  setValorPago(vp: ValorPago): void { this.valorPago = vp; }
}

// ────────────── FormulaCalculada ──────────────

/**
 * FormulaCalculada (36 linhas Java): contém Dobra, BaseTabelada, BaseVerba,
 * Divisor, Multiplicador, Quantidade. A verba é calculada pela MaquinaDeCalculo:
 *   base/divisor × multiplicador × quantidade × dobra
 */
export class FormulaCalculada extends Formula {
  dobra: boolean = false;
  baseTabelada: BaseTabelada | null = null;
  baseVerba: BaseVerba = { itens: [] };
  divisor: Divisor = { tipo: 'INFORMADO', outroValor: new Decimal(1) };
  multiplicador: Multiplicador = { outroValor: new Decimal(1) };
  quantidade: Quantidade = { tipo: 'INFORMADA', valorInformado: new Decimal(1), aplicarProporcionalidade: false };
}

// ────────────── FormulaInformada ──────────────

/**
 * FormulaInformada (82 linhas Java): valor informado diretamente. Não há
 * base/divisor/multiplicador/quantidade — o valor é setado nas ocorrências.
 */
export class FormulaInformada extends Formula {
  // Sem componentes adicionais — valor vem direto de OcorrenciaDeVerba.devido
}

// ────────────── FormulaReflexo ──────────────

/**
 * FormulaReflexo (156 linhas Java): calcula o valor como reflexo de uma verba
 * principal. Contém BaseVerba (lista de verbas-base), Divisor, Multiplicador.
 * O valor é derivado de média/média ponderada da principal.
 */
export class FormulaReflexo extends Formula {
  dobra: boolean = false;
  baseVerba: BaseVerba = { itens: [] };
  divisor: Divisor = { tipo: 'INFORMADO', outroValor: new Decimal(1) };
  multiplicador: Multiplicador = { outroValor: new Decimal(1) };
  quantidade: Quantidade = { tipo: 'INFORMADA', valorInformado: new Decimal(1), aplicarProporcionalidade: false };
}
