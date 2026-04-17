/**
 * PJe-Calc v2.15.1 — Informada
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Informada
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/Informada.java (~65 linhas)
 *
 * Subclasse concreta de `Principal` com `FormulaInformada` (valor direto,
 * sem cálculo). Discriminator DB = "I".
 */
import { ValorDaVerbaEnum } from '../../constantes/enums';
import { Principal } from './principal';

export class Informada extends Principal {
  /** getTipoValor override — sempre INFORMADO. */
  getTipoValor(): ValorDaVerbaEnum {
    return ValorDaVerbaEnum.INFORMADO;
  }
}
