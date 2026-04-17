/**
 * Porte 1:1 de CombinacaoDeJuros.java (188 linhas).
 *
 * Define uma mudança de regime de juros a partir de uma data específica.
 * Análogo a CombinacaoDeIndice mas para juros.
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/atualizacao/CombinacaoDeJuros.java
 */
import { HelperDate } from '../../../base/comum/helper-date';
import type { JurosEnum } from '../../../constantes/enums';
import type { ParametrosDeAtualizacao } from './parametros-de-atualizacao';

export class CombinacaoDeJuros {
  private id: number | null = null;
  private versao: number = 0;
  private parametrosDeAtualizacao: ParametrosDeAtualizacao | null = null;
  private outroJuros: JurosEnum | null = null;
  private apartirDeOutroJuros: Date | null = null;

  constructor(outroJuros?: JurosEnum, apartirDe?: Date) {
    if (outroJuros !== undefined) this.outroJuros = outroJuros;
    if (apartirDe !== undefined) this.apartirDeOutroJuros = apartirDe;
  }

  getId(): number | null { return this.id; }
  setId(id: number | null): void { this.id = id; }
  obterChavePrimaria(): number | null { return this.id; }

  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getParametrosDeAtualizacao(): ParametrosDeAtualizacao | null { return this.parametrosDeAtualizacao; }
  setParametrosDeAtualizacao(p: ParametrosDeAtualizacao | null): void { this.parametrosDeAtualizacao = p; }

  getOutroJuros(): JurosEnum | null { return this.outroJuros; }
  setOutroJuros(v: JurosEnum | null): void { this.outroJuros = v; }

  getApartirDeOutroJuros(): Date | null { return this.apartirDeOutroJuros; }
  setApartirDeOutroJuros(v: Date | null): void { this.apartirDeOutroJuros = v; }

  /** compareTo — ordena por apartirDeOutroJuros ascendente. */
  compareTo(o: CombinacaoDeJuros): number {
    if (!this.apartirDeOutroJuros || !o.apartirDeOutroJuros) return 0;
    const a = HelperDate.getInstance(this.apartirDeOutroJuros)!.removeTime().getDate();
    const b = HelperDate.getInstance(o.apartirDeOutroJuros)!.removeTime().getDate();
    return a.getTime() - b.getTime();
  }

  equals(o: CombinacaoDeJuros | null): boolean {
    if (this === o) return true;
    if (!o) return false;
    const aDate = this.apartirDeOutroJuros?.getTime() ?? null;
    const bDate = o.apartirDeOutroJuros?.getTime() ?? null;
    if (aDate !== bDate) return false;
    if (this.outroJuros !== o.outroJuros) return false;
    return this.parametrosDeAtualizacao === o.parametrosDeAtualizacao;
  }
}
