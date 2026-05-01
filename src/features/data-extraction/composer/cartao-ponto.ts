/**
 * Composer de Cartão de Ponto.
 *
 * Agrupa todos os cartões/apurações do caso em um vetor único pronto para
 * o builder do .pjc. Cada cartão vira `<CartaoDePonto>` com seu nome
 * (competência) e suas apurações diárias.
 *
 * Conflito (futuro): se houver 2 cartões para a mesma competência em docs
 * diferentes, hoje ambos entram. Se virar problema, adicionar resolução
 * por document_id como em ferias/faltas.
 */
import type { ApuracaoDiaria } from "../parsers/cartao-ponto";
import type { CartaoPontoExtraido } from "../api/cartao-ponto";

export type ComposicaoCartoesPonto = {
  cartoes: Array<{
    competencia: string;
    nome: string;
    apuracoes: ApuracaoDiaria[];
  }>;
  totalApuracoes: number;
};

export function composeCartoesPonto(
  entries: Array<{ cartao: CartaoPontoExtraido; apuracoes: ApuracaoDiaria[] }>,
): ComposicaoCartoesPonto {
  const cartoes = entries
    .filter((e) => e.apuracoes.length > 0)
    .map((e) => ({
      competencia: e.cartao.competencia,
      nome: `Cartão ${e.cartao.competencia}`,
      apuracoes: [...e.apuracoes].sort((a, b) => a.data.localeCompare(b.data)),
    }))
    .sort((a, b) => a.competencia.localeCompare(b.competencia));

  return {
    cartoes,
    totalApuracoes: cartoes.reduce((s, c) => s + c.apuracoes.length, 0),
  };
}
