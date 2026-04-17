/**
 * PJe-Calc v2.15.1 — EventoAtualizacao (interface)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../pagamento/EventoAtualizacao.java
 *
 * Interface marcadora para entidades que podem ser aplicadas como "evento de
 * atualização" do cálculo (Honorário, Multa, CustasJudiciais, AutoJudicial,
 * Pagamento, etc.). A prioridade define a ordem de aplicação em uma mesma
 * dataEvento:
 *   1 — Multa
 *   2 — Honorário
 *   3 — Pagamento
 *   4 — CustasJudiciais / AutoJudicial / Armazenamento
 */
export interface EventoAtualizacao {
  getPrioridade(): number;
}
