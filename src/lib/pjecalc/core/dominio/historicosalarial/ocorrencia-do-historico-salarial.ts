/**
 * Porte 1:1 de OcorrenciaDoHistoricoSalarial.java (226 linhas).
 *
 * Entidade que representa uma competência do histórico salarial.
 * Cada ocorrência tem: data, valor, flags de recolhimento (FGTS/INSS) e
 * flags de incidência (FGTS/INSS).
 *
 * Ref: pjecalc-fonte/.../dominio/historicosalarial/OcorrenciaDoHistoricoSalarial.java
 */
import type Decimal from 'decimal.js';
import type { HistoricoSalarial } from './historico-salarial';

export class OcorrenciaDoHistoricoSalarial {
  private id: number | null = null;
  private versao: number = 0;
  private historicoSalarial: HistoricoSalarial | null = null;
  private dataOcorrencia: Date | null = null;
  private valor: Decimal | null = null;
  private recolhidoFGTS: boolean = false;
  private recolhidoINSS: boolean = false;
  private incidenciaFGTS: boolean = false;
  private incidenciaINSS: boolean = false;

  constructor(
    historicoSalarial?: HistoricoSalarial | null,
    dataOcorrencia?: Date | null,
    valor?: Decimal | null,
    recolhidoFGTS?: boolean,
    recolhidoINSS?: boolean,
    incidenciaFGTS?: boolean,
    incidenciaINSS?: boolean,
  ) {
    if (historicoSalarial !== undefined) this.historicoSalarial = historicoSalarial ?? null;
    if (dataOcorrencia !== undefined) this.dataOcorrencia = dataOcorrencia ?? null;
    if (valor !== undefined) this.valor = valor ?? null;
    if (recolhidoFGTS !== undefined) this.recolhidoFGTS = recolhidoFGTS;
    if (recolhidoINSS !== undefined) this.recolhidoINSS = recolhidoINSS;
    if (incidenciaFGTS !== undefined) this.incidenciaFGTS = incidenciaFGTS;
    if (incidenciaINSS !== undefined) this.incidenciaINSS = incidenciaINSS;
  }

  getId(): number | null { return this.id; }
  setId(id: number | null): void { this.id = id; }
  obterChavePrimaria(): unknown { return this.getId(); }

  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getHistoricoSalarial(): HistoricoSalarial | null { return this.historicoSalarial; }
  setHistoricoSalarial(h: HistoricoSalarial | null): void { this.historicoSalarial = h; }

  getDataOcorrencia(): Date | null { return this.dataOcorrencia; }
  setDataOcorrencia(d: Date | null): void { this.dataOcorrencia = d; }

  getValor(): Decimal | null { return this.valor; }
  setValor(v: Decimal | null): void { this.valor = v; }

  getRecolhidoFGTS(): boolean { return this.recolhidoFGTS; }
  setRecolhidoFGTS(v: boolean): void { this.recolhidoFGTS = v; }

  getRecolhidoINSS(): boolean { return this.recolhidoINSS; }
  setRecolhidoINSS(v: boolean): void { this.recolhidoINSS = v; }

  getIncidenciaFGTS(): boolean { return this.incidenciaFGTS; }
  setIncidenciaFGTS(v: boolean): void { this.incidenciaFGTS = v; }

  getIncidenciaINSS(): boolean { return this.incidenciaINSS; }
  setIncidenciaINSS(v: boolean): void { this.incidenciaINSS = v; }

  /** compareTo (linha 199-201) — ordena por dataOcorrencia ascendente. */
  compareTo(o: OcorrenciaDoHistoricoSalarial): number {
    if (!this.dataOcorrencia || !o.dataOcorrencia) return 0;
    return this.dataOcorrencia.getTime() - o.dataOcorrencia.getTime();
  }

  equals(o: OcorrenciaDoHistoricoSalarial | null): boolean {
    if (this === o) return true;
    if (!o) return false;
    if (!this.dataOcorrencia) return o.dataOcorrencia === null;
    if (!o.dataOcorrencia) return false;
    return this.dataOcorrencia.getTime() === o.dataOcorrencia.getTime();
  }
}
