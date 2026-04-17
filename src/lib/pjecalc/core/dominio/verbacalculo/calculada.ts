/**
 * PJe-Calc v2.15.1 — Calculada
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Calculada
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/Calculada.java (~134 linhas)
 *
 * Subclasse concreta de `Principal` que usa `FormulaCalculada` (base × div ×
 * mult × qty). Discriminator DB = "C".
 *
 * No construtor (Java) também instancia `MaquinaDeCalculoDaVerbaCalculada`,
 * mas aqui mantemos o MaquinaDeCalculo injetável via setter (por ora os
 * ports do MaquinaDeCalculo* são stubs estruturais).
 */
import { ValorDaVerbaEnum } from '../../constantes/enums';
import { Principal } from './principal';

export class Calculada extends Principal {
  /** getTipoValor override (Java linha 57) — sempre CALCULADO. */
  getTipoValor(): ValorDaVerbaEnum {
    return ValorDaVerbaEnum.CALCULADO;
  }
}
