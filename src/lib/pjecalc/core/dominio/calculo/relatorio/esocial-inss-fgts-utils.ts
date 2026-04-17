/**
 * PJe-Calc v2.15.1 — EsocialInssFgtsUtils
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialInssFgtsUtils
 *
 * Ref Java: pjecalc-fonte/.../relatorio/EsocialInssFgtsUtils.java
 *
 * Utilitários para geração do arquivo eSocial (identificação do evento,
 * formatação de competência, cálculos de total por rubrica).
 *
 * Por ora, apenas assinaturas das funções usadas na UI.
 */
import type Decimal from 'decimal.js';

export class EsocialInssFgtsUtils {
  /** formatarCompetencia — converte Date em "AAAA-MM" (eSocial standard). */
  static formatarCompetencia(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /** gerarIdentificacaoEvento — ID único para o envio (timestamp + hash). */
  static gerarIdentificacaoEvento(dataProcessamento: Date, hashCalculo: string): string {
    return `${dataProcessamento.getTime()}-${hashCalculo}`;
  }

  /** agregarPorRubrica — soma valores por tipoRubrica. */
  static agregarPorRubrica<T extends { getTipoRubrica(): string; getValor(): Decimal }>(
    items: Iterable<T>,
  ): Map<string, Decimal> {
    const result = new Map<string, Decimal>();
    for (const item of items) {
      const k = item.getTipoRubrica();
      const prev = result.get(k) ?? null;
      const v = item.getValor();
      result.set(k, prev === null ? v : prev.plus(v));
    }
    return result;
  }
}
