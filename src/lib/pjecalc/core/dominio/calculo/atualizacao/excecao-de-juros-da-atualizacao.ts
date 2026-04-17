/**
 * Porte 1:1 de ExcecaoDeJurosDaAtualizacao.java (166 linhas).
 *
 * Define um período onde os juros NÃO se aplicam (exceção). Ex: em certos
 * períodos de moratória judicial, os juros ficam suspensos.
 * Implementa PeriodoParaExcecao para uso em LogicoFuzzy.
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/atualizacao/ExcecaoDeJurosDaAtualizacao.java
 */
import { Periodo } from '../../../base/comum/periodo';
import type { PeriodoParaExcecao } from '../../../base/comum/logico-fuzzy';
import type { ParametrosDeAtualizacao } from './parametros-de-atualizacao';

export class ExcecaoDeJurosDaAtualizacao implements PeriodoParaExcecao {
  private id: number | null = null;
  private versao: number = 0;
  private parametrosDeAtualizacao: ParametrosDeAtualizacao | null = null;
  private dataInicio: Date | null = null;
  private dataFim: Date | null = null;

  constructor(dataInicio?: Date, dataFim?: Date) {
    if (dataInicio) this.dataInicio = dataInicio;
    if (dataFim) this.dataFim = dataFim;
  }

  getId(): number | null { return this.id; }
  setId(id: number | null): void { this.id = id; }
  obterChavePrimaria(): number | null { return this.id; }

  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getParametrosDeAtualizacao(): ParametrosDeAtualizacao | null { return this.parametrosDeAtualizacao; }
  setParametrosDeAtualizacao(p: ParametrosDeAtualizacao | null): void { this.parametrosDeAtualizacao = p; }

  getDataInicio(): Date | null { return this.dataInicio; }
  setDataInicio(d: Date | null): void { this.dataInicio = d; }

  getDataFim(): Date | null { return this.dataFim; }
  setDataFim(d: Date | null): void { this.dataFim = d; }

  /**
   * getPeriodo (linha 148-154) — usado pelo LogicoFuzzy para detectar
   * se uma data cai dentro de uma exceção de juros.
   */
  getPeriodo(): Periodo | null {
    if (this.dataInicio && this.dataFim) {
      return new Periodo(this.dataInicio, this.dataFim);
    }
    return null;
  }

  equals(o: ExcecaoDeJurosDaAtualizacao | null): boolean {
    if (this === o) return true;
    if (!o) return false;
    if (this.id !== null && o.id !== null) return this.id === o.id;
    const aIni = this.dataInicio?.getTime() ?? null;
    const bIni = o.dataInicio?.getTime() ?? null;
    const aFim = this.dataFim?.getTime() ?? null;
    const bFim = o.dataFim?.getTime() ?? null;
    return aIni === bIni && aFim === bFim;
  }
}
