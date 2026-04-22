/**
 * PJe-Calc v2.15.1 — DestinoDoFgtsEnum
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum
 *
 * Destino do FGTS apurado: pago direto ao reclamante (caso de rescisão
 * antecipada) ou recolhido em conta vinculada na CEF (caso comum).
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/constantes/DestinoDoFgtsEnum.java
 */

export enum DestinoDoFgtsEnum {
  /** Pagar diretamente ao reclamante. */
  PAGAR = 'P',
  /** Depositar/recolher em conta vinculada do FGTS. */
  DEPOSITAR = 'D',
}

export const DestinoDoFgtsEnumNomes: Record<DestinoDoFgtsEnum, string> = {
  [DestinoDoFgtsEnum.PAGAR]: 'Pagar',
  [DestinoDoFgtsEnum.DEPOSITAR]: 'Recolher',
};

export const DestinoDoFgtsEnumMensagens: Record<DestinoDoFgtsEnum, string> = {
  [DestinoDoFgtsEnum.PAGAR]: 'Para pagamento ao reclamante',
  [DestinoDoFgtsEnum.DEPOSITAR]: 'Para depósito em conta vinculada',
};
