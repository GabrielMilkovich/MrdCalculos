/**
 * PJe-Calc v2.15.1 — Pagamento (totalização)
 * Porte simplificado de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.*
 *
 * Consolida os resultados de todos os módulos numa estrutura final:
 * - Líquido exequente = principal corrigido + juros − INSS − IR + FGTS
 * - Créditos do reclamante / débitos do reclamado
 *
 * A classe Atualizacao (1579 linhas) do Java lida com re-atualização
 * monetária pós-liquidação; aqui portamos apenas a totalização básica.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../base/comum/utils';

export interface ResultadoPagamento {
  principalBruto: Decimal;
  principalCorrigido: Decimal;
  jurosMora: Decimal;
  inssReclamante: Decimal;
  inssReclamado: Decimal;
  impostoRenda: Decimal;
  fgtsTotal: Decimal;
  honorarios: Decimal;
  custas: Decimal;
  multas: Decimal;
  liquidoExequente: Decimal;
}

/**
 * totalizar — calcula o resultado final a partir dos componentes.
 *
 * Fórmula PJe-Calc (linha 1508 de Calculo.java → Pagamento):
 *   bruto = principalCorrigido + jurosMora
 *   liquido = bruto − inssReclamante − impostoRenda
 *   total = liquido + fgts + honorarios + custas + multas
 *
 * O liquidoExequente é o que o reclamante efetivamente recebe.
 */
export function totalizar(params: {
  principalBruto: Decimal;
  principalCorrigido: Decimal;
  jurosMora: Decimal;
  inssReclamante: Decimal;
  inssReclamado: Decimal;
  impostoRenda: Decimal;
  fgtsTotal: Decimal;
  honorarios: Decimal;
  custas: Decimal;
  multas: Decimal;
}): ResultadoPagamento {
  const bruto = params.principalCorrigido.plus(params.jurosMora);
  const liquidoExequente = arredondarValorMonetario(
    bruto
      .minus(params.inssReclamante)
      .minus(params.impostoRenda)
  );

  return {
    ...params,
    liquidoExequente,
  };
}
