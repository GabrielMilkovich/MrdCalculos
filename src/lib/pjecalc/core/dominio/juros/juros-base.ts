/**
 * PJe-Calc v2.15.1 — JurosBase (abstract)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.juros.JurosBase
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/juros/JurosBase.java
 *
 * Classe abstrata base para juros "clássicos" (Padrão, Fazenda Pública).
 * Define período [dataInicio, dataFim] + aliquota mensal + tipo
 * (SIMPLES/COMPOSTOS) + tipoQuantidade (FRACAO/INTEIRO).
 *
 * Notas:
 *   - Não confundir com JurosTaxaLegal / JurosSelicInss / JurosSelicIrpf /
 *     JurosPrecatorioEC1362025, que NÃO estendem JurosBase: são tabelas mensais
 *     (similar a IndiceBase) ou entidades standalone.
 */
import type Decimal from 'decimal.js';
import { TipoDeJurosEnum, TipoDeQuantidadeDeJurosBaseEnum } from '../../constantes/enums';

export abstract class JurosBase {
  protected dataInicio: Date;
  protected dataFim: Date | null;
  protected aliquota: Decimal;
  protected tipoDeJuros: TipoDeJurosEnum = TipoDeJurosEnum.SIMPLES;
  protected tipoDeQuantidade: TipoDeQuantidadeDeJurosBaseEnum = TipoDeQuantidadeDeJurosBaseEnum.FRACAO;

  constructor(
    dataInicio: Date,
    dataFim: Date | null,
    aliquota: Decimal,
    tipoDeJuros: TipoDeJurosEnum = TipoDeJurosEnum.SIMPLES,
    tipoDeQuantidade: TipoDeQuantidadeDeJurosBaseEnum = TipoDeQuantidadeDeJurosBaseEnum.FRACAO,
  ) {
    this.dataInicio = dataInicio;
    this.dataFim = dataFim;
    this.aliquota = aliquota;
    this.tipoDeJuros = tipoDeJuros;
    this.tipoDeQuantidade = tipoDeQuantidade;
  }

  getDataInicio(): Date { return this.dataInicio; }
  setDataInicio(d: Date): void { this.dataInicio = d; }

  /** getDataFim(dataDefault) — retorna dataFim ou default (Java linha 73) */
  getDataFim(dataDefault?: Date): Date | null {
    return this.dataFim ?? dataDefault ?? null;
  }
  setDataFim(d: Date | null): void { this.dataFim = d; }

  getAliquota(): Decimal { return this.aliquota; }
  setAliquota(a: Decimal): void { this.aliquota = a; }

  getTipoDeJuros(): TipoDeJurosEnum { return this.tipoDeJuros; }
  setTipoDeJuros(t: TipoDeJurosEnum): void { this.tipoDeJuros = t; }

  getTipoDeQuantidade(): TipoDeQuantidadeDeJurosBaseEnum { return this.tipoDeQuantidade; }
  setTipoDeQuantidade(t: TipoDeQuantidadeDeJurosBaseEnum): void { this.tipoDeQuantidade = t; }
}
