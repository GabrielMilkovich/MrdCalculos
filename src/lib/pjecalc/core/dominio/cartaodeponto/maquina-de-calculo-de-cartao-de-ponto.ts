/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeCartaoDePonto (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.MaquinaDeCalculoDeCartaoDePonto
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/MaquinaDeCalculoDeCartaoDePonto.java (~1435 linhas)
 *
 * Orquestra a apuração do cartão de ponto: percorre ocorrências, monta turnos,
 * aplica tolerâncias, calcula horas extras, horas noturnas, intervalos
 * (intrajornada/interjornada/Art. 253), feriados, DSR, etc.
 *
 * **Status**: stub estrutural. A máquina real depende de várias partes
 * ainda não totalmente portadas (verbas, calculo, períodos). A implementação
 * completa fica para uma fase posterior (fase-14/15) quando o orquestrador
 * geral da apuração estiver pronto.
 */
import Decimal from 'decimal.js';
import type { ApuracaoCartaoDePonto } from './apuracao-cartao-de-ponto';
import type { ApuracaoDiariaCartao } from './apuracao-diaria-cartao';
import type { CartaoDePonto } from './cartao-de-ponto';
import type { OcorrenciaDoCartaoDePonto } from './ocorrencia-do-cartao-de-ponto';

export class MaquinaDeCalculoDeCartaoDePonto {
  private cartaoDePonto: CartaoDePonto | null = null;
  private apuracaoCartaoDePonto: ApuracaoCartaoDePonto | null = null;

  private apuracoesDiarias: ApuracaoDiariaCartao[] = [];

  /** Total de horas trabalhadas no período, em Decimal millis. */
  private totalHorasTrabalhadas: Decimal = new Decimal(0);
  /** Total de horas extras no período, em Decimal millis. */
  private totalHorasExtras: Decimal = new Decimal(0);
  /** Total de horas noturnas no período, em Decimal millis. */
  private totalHorasNoturnas: Decimal = new Decimal(0);
  /** Total de supressão de intrajornada, em Decimal millis. */
  private totalSupressaoIntrajornada: Decimal = new Decimal(0);
  /** Total de supressão de interjornada, em Decimal millis. */
  private totalSupressaoInterjornada: Decimal = new Decimal(0);
  /** Total de supressão Art. 253 CLT, em Decimal millis. */
  private totalSupressaoArt253: Decimal = new Decimal(0);

  getCartaoDePonto(): CartaoDePonto | null { return this.cartaoDePonto; }
  setCartaoDePonto(v: CartaoDePonto | null): void { this.cartaoDePonto = v; }

  getApuracaoCartaoDePonto(): ApuracaoCartaoDePonto | null { return this.apuracaoCartaoDePonto; }
  setApuracaoCartaoDePonto(v: ApuracaoCartaoDePonto | null): void { this.apuracaoCartaoDePonto = v; }

  getApuracoesDiarias(): ApuracaoDiariaCartao[] { return this.apuracoesDiarias; }
  setApuracoesDiarias(v: ApuracaoDiariaCartao[]): void { this.apuracoesDiarias = v; }

  getTotalHorasTrabalhadas(): Decimal { return this.totalHorasTrabalhadas; }
  getTotalHorasExtras(): Decimal { return this.totalHorasExtras; }
  getTotalHorasNoturnas(): Decimal { return this.totalHorasNoturnas; }
  getTotalSupressaoIntrajornada(): Decimal { return this.totalSupressaoIntrajornada; }
  getTotalSupressaoInterjornada(): Decimal { return this.totalSupressaoInterjornada; }
  getTotalSupressaoArt253(): Decimal { return this.totalSupressaoArt253; }

  /**
   * apurar — percorre todas as ocorrências do cartão e monta
   * uma ApuracaoDiariaCartao por dia.
   *
   * TODO(fase-14/15): implementar fluxo completo, que hoje no Java envolve:
   *   1. montarTurnos(ocorrencia)
   *   2. aplicarTolerancias (por turno / por dia)
   *   3. calcularHorasTrabalhadas/Noturnas/Extras
   *   4. calcularSupressoesIntra/Inter/Art253
   *   5. agregar totais no período
   */
  apurar(): void {
    if (!this.cartaoDePonto || !this.apuracaoCartaoDePonto) return;
    this.apuracoesDiarias = [];
    const ocorrencias: OcorrenciaDoCartaoDePonto[] = this.cartaoDePonto.getOcorrencias();
    for (const _ocorr of ocorrencias) {
      // TODO(fase-14): criar ApuracaoDiariaCartao e processar
    }
    // TODO(fase-14): somar totais
  }
}
