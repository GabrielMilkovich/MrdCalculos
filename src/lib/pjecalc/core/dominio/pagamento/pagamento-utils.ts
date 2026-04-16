/**
 * PJe-Calc v2.15.1 — PagamentoUtils (stub com fachada mínima)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils
 *
 * Ref Java: pjecalc-fonte/.../pagamento/PagamentoUtils.java (~389 linhas)
 *
 * Funções utilitárias estáticas para determinar se existem valores a
 * processar em um pagamento (principal, FGTS, custas, pensão, previdência
 * privada etc.). As verificações delegam a métodos do Calculo + seus módulos.
 *
 * **Status**: fachada mínima com assinaturas — implementações dependem do
 * Calculo completo (Fase 10). Por ora, todas retornam `false` (conservador).
 */
import type { Calculo } from '../calculo/calculo';

export class PagamentoUtils {
  static verificaSeExisteValorPrincipalParaCreditoDeReclamante(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExisteFgtsParaCreditoDeReclamante(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExisteCustaDoReclamanteAPagar(_c: Calculo): boolean {
    return false;
  }

  static verificaSeEhFgtsParaDepositar(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExisteDescontoContribuicaoSocialReclamante(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExistePrevidenciaPrivada(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExistePensaoAlimenticia(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExistePensaoAlimenticiaAnteriorAoPagamento(
    _c: Calculo,
    _dataPagamento: Date,
  ): boolean {
    return false;
  }
}
