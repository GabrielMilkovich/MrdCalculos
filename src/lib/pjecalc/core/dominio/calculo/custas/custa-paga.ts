/**
 * PJe-Calc v2.15.1 — CustaPaga
 * Porte 1:1 (struct-only) de: br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustaPaga
 *
 * Ref Java: pjecalc-fonte/.../calculo/custas/CustaPaga.java (~206 linhas)
 *
 * Representa uma custa efetivamente paga (pelo reclamante ou reclamado) para
 * abatimento. Guarda: pagante (RT/RD), data/valor/descrição + folhaDoEvento.
 */
import type Decimal from 'decimal.js';
import { TipoDePaganteEnum, TipoOrigemRegistroEnum } from '../../../constantes/enums';
import type { CustasJudiciais } from './custas-judiciais';

export class CustaPaga {
  private id: number | null = null;
  private versao: number = 0;
  private custasJudiciais: CustasJudiciais | null = null;
  private pagante: TipoDePaganteEnum = TipoDePaganteEnum.RECLAMANTE;
  private descricao: string | null = null;
  private dataVencimento: Date | null = null;
  private valorPago: Decimal | null = null;
  private folhaDoEvento: string | null = null;
  private origemRegistro: TipoOrigemRegistroEnum = TipoOrigemRegistroEnum.CALCULO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCustasJudiciais(): CustasJudiciais | null { return this.custasJudiciais; }
  setCustasJudiciais(c: CustasJudiciais | null): void { this.custasJudiciais = c; }

  getPagante(): TipoDePaganteEnum { return this.pagante; }
  setPagante(v: TipoDePaganteEnum): void { this.pagante = v; }

  getDescricao(): string | null { return this.descricao; }
  setDescricao(v: string | null): void { this.descricao = v; }

  getDataVencimento(): Date | null { return this.dataVencimento; }
  setDataVencimento(d: Date | null): void { this.dataVencimento = d; }

  getValorPago(): Decimal | null { return this.valorPago; }
  setValorPago(v: Decimal | null): void { this.valorPago = v; }

  getFolhaDoEvento(): string | null { return this.folhaDoEvento; }
  setFolhaDoEvento(v: string | null): void { this.folhaDoEvento = v; }

  getOrigemRegistro(): TipoOrigemRegistroEnum { return this.origemRegistro; }
  setOrigemRegistro(v: TipoOrigemRegistroEnum): void { this.origemRegistro = v; }
}
