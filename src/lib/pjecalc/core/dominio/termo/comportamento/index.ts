/**
 * Barrel de exports dos Comportamentos do Reflexo.
 *
 * As 4 classes implementam o `ComportamentoDoReflexoEnum`:
 *   - VALOR_MENSAL               → ComportamentoValorMensal
 *   - MEDIA_PELA_QUANTIDADE      → ComportamentoMediaPelaQuantidade
 *   - MEDIA_PELO_VALOR           → ComportamentoMediaPeloValor
 *   - MEDIA_PELO_VALOR_CORRIGIDO → ComportamentoMediaPeloValorCorrigido
 *
 * Ref: pjecalc-fonte/.../dominio/termo/comportamento/
 */
import { ComportamentoDaBaseDoReflexo } from './comportamento-da-base-do-reflexo';
import { ComportamentoValorMensal } from './comportamento-valor-mensal';
import { ComportamentoMediaPelaQuantidade } from './comportamento-media-pela-quantidade';
import { ComportamentoMediaPeloValor } from './comportamento-media-pelo-valor';
import { ComportamentoMediaPeloValorCorrigido } from './comportamento-media-pelo-valor-corrigido';
import { ComportamentoDoReflexoEnumFull } from '../../../constantes/enums';

export { ComportamentoDaBaseDoReflexo };
export { ComportamentoValorMensal };
export { ComportamentoMediaPelaQuantidade };
export { ComportamentoMediaPeloValor };
export { ComportamentoMediaPeloValorCorrigido };

/**
 * Factory equivalente a ComportamentoDoReflexoEnum.criarProxyDoComportamentoDoReflexo()
 * (Java ComportamentoDoReflexoEnum.java:37-53).
 */
export function criarProxyDoComportamentoDoReflexo(
  tipo: ComportamentoDoReflexoEnumFull,
): ComportamentoDaBaseDoReflexo {
  switch (tipo) {
    case ComportamentoDoReflexoEnumFull.VALOR_MENSAL:
      return new ComportamentoValorMensal();
    case ComportamentoDoReflexoEnumFull.MEDIA_PELA_QUANTIDADE:
      return new ComportamentoMediaPelaQuantidade();
    case ComportamentoDoReflexoEnumFull.MEDIA_PELO_VALOR:
      return new ComportamentoMediaPeloValor();
    case ComportamentoDoReflexoEnumFull.MEDIA_PELO_VALOR_CORRIGIDO:
      return new ComportamentoMediaPeloValorCorrigido();
    default:
      throw new Error(`Comportamento do reflexo '${tipo}' não disponível`);
  }
}
