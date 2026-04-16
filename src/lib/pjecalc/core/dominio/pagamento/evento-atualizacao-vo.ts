/**
 * PJe-Calc v2.15.1 — EventoAtualizacaoVO
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacaoVO
 *
 * Ref Java: pjecalc-fonte/.../pagamento/EventoAtualizacaoVO.java
 *
 * ViewObject que envolve um EventoAtualizacao com sua dataEvento e id, usado
 * para montar a lista ordenada de eventos (por data, desempate por prioridade).
 */
import type { EventoAtualizacao } from './evento-atualizacao';

export class EventoAtualizacaoVO {
  private dataEvento: Date | null = null;
  private evento: EventoAtualizacao | null = null;
  private id: number | null = null;

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

  getEvento(): EventoAtualizacao | null { return this.evento; }
  setEvento(e: EventoAtualizacao | null): void { this.evento = e; }

  getId(): number | null { return this.id; }
  setId(v: number | null): void { this.id = v; }

  /** compareTo (Java linha 43) — por dataEvento, desempate por prioridade. */
  compareTo(o: EventoAtualizacaoVO): number {
    const a = this.dataEvento;
    const b = o.getDataEvento();
    if (!a || !b) return 0;
    const cmpData = a.getTime() - b.getTime();
    if (cmpData !== 0) return cmpData;
    const pa = this.evento?.getPrioridade() ?? 0;
    const pb = o.getEvento()?.getPrioridade() ?? 0;
    return pa - pb;
  }
}
