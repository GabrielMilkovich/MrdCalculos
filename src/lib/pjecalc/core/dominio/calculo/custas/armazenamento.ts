/**
 * PJe-Calc v2.15.1 — Armazenamento
 * Porte 1:1 (struct-only) de: br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento
 *
 * Ref Java: pjecalc-fonte/.../calculo/custas/Armazenamento.java (~276 linhas)
 *
 * Custa de armazenamento de bens: dataInicio/Fim + valor/dia + taxa/juros + correção.
 * Campos estruturais — lógica de cálculo (teto, dias úteis) virá em fase
 * posterior quando a MaquinaDeCalculoDeCustas for implementada.
 */
import type Decimal from 'decimal.js';
import { TipoOrigemRegistroEnum } from '../../../constantes/enums';
import type { CustasJudiciais } from './custas-judiciais';

export class Armazenamento {
  private id: number | null = null;
  private versao: number = 0;
  private custasJudiciais: CustasJudiciais | null = null;
  private descricaoDoBem: string | null = null;
  private dataInicioArmazenamento: Date | null = null;
  private dataFimArmazenamento: Date | null = null;
  private valorDiaria: Decimal | null = null;
  private valorTeto: Decimal | null = null;
  private valorTotalArmazenamento: Decimal | null = null;
  private indiceCorrecao: Decimal | null = null;
  private taxaJuros: Decimal | null = null;
  private origemRegistro: TipoOrigemRegistroEnum = TipoOrigemRegistroEnum.CALCULO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCustasJudiciais(): CustasJudiciais | null { return this.custasJudiciais; }
  setCustasJudiciais(c: CustasJudiciais | null): void { this.custasJudiciais = c; }

  getDescricaoDoBem(): string | null { return this.descricaoDoBem; }
  setDescricaoDoBem(v: string | null): void { this.descricaoDoBem = v; }

  getDataInicioArmazenamento(): Date | null { return this.dataInicioArmazenamento; }
  setDataInicioArmazenamento(d: Date | null): void { this.dataInicioArmazenamento = d; }

  getDataFimArmazenamento(): Date | null { return this.dataFimArmazenamento; }
  setDataFimArmazenamento(d: Date | null): void { this.dataFimArmazenamento = d; }

  getValorDiaria(): Decimal | null { return this.valorDiaria; }
  setValorDiaria(v: Decimal | null): void { this.valorDiaria = v; }

  getValorTeto(): Decimal | null { return this.valorTeto; }
  setValorTeto(v: Decimal | null): void { this.valorTeto = v; }

  getValorTotalArmazenamento(): Decimal | null { return this.valorTotalArmazenamento; }
  setValorTotalArmazenamento(v: Decimal | null): void { this.valorTotalArmazenamento = v; }

  getIndiceCorrecao(): Decimal | null { return this.indiceCorrecao; }
  setIndiceCorrecao(v: Decimal | null): void { this.indiceCorrecao = v; }

  getTaxaJuros(): Decimal | null { return this.taxaJuros; }
  setTaxaJuros(v: Decimal | null): void { this.taxaJuros = v; }

  getOrigemRegistro(): TipoOrigemRegistroEnum { return this.origemRegistro; }
  setOrigemRegistro(v: TipoOrigemRegistroEnum): void { this.origemRegistro = v; }
}
