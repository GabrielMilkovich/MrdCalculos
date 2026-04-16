/**
 * Porte 1:1 de CombinacaoDeIndice.java (188 linhas).
 *
 * Define uma mudança de índice monetário a partir de uma data específica.
 * Usado em ParametrosDeAtualizacao para suportar regimes combinados (ex:
 * IPCA-E até citação, depois SELIC — ADC 58/59).
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/atualizacao/CombinacaoDeIndice.java
 */
import { HelperDate } from '../../../base/comum/helper-date';
import type { IndiceMonetarioEnum } from '../../../constantes/enums';
import type { ParametrosDeAtualizacao } from './parametros-de-atualizacao';

export class CombinacaoDeIndice {
  private id: number | null = null;
  private versao: number = 0;
  private parametrosDeAtualizacao: ParametrosDeAtualizacao | null = null;
  private outroIndiceTrabalhista: IndiceMonetarioEnum | null = null;
  private apartirDeOutroIndice: Date | null = null;

  constructor(outroIndice?: IndiceMonetarioEnum, apartirDe?: Date) {
    if (outroIndice !== undefined) this.outroIndiceTrabalhista = outroIndice;
    if (apartirDe !== undefined) this.apartirDeOutroIndice = apartirDe;
  }

  getId(): number | null { return this.id; }
  setId(id: number | null): void { this.id = id; }
  obterChavePrimaria(): number | null { return this.id; }

  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getParametrosDeAtualizacao(): ParametrosDeAtualizacao | null { return this.parametrosDeAtualizacao; }
  setParametrosDeAtualizacao(p: ParametrosDeAtualizacao | null): void { this.parametrosDeAtualizacao = p; }

  getOutroIndiceTrabalhista(): IndiceMonetarioEnum | null { return this.outroIndiceTrabalhista; }
  setOutroIndiceTrabalhista(v: IndiceMonetarioEnum | null): void { this.outroIndiceTrabalhista = v; }

  getApartirDeOutroIndice(): Date | null { return this.apartirDeOutroIndice; }
  setApartirDeOutroIndice(v: Date | null): void { this.apartirDeOutroIndice = v; }

  /** compareTo (linha 136) — ordena por apartirDeOutroIndice ascendente (removeTime). */
  compareTo(o: CombinacaoDeIndice): number {
    if (!this.apartirDeOutroIndice || !o.apartirDeOutroIndice) return 0;
    const a = HelperDate.getInstance(this.apartirDeOutroIndice)!.removeTime().getDate();
    const b = HelperDate.getInstance(o.apartirDeOutroIndice)!.removeTime().getDate();
    return a.getTime() - b.getTime();
  }

  /** equals (linha 153-180) — compara por data + índice + parametros. */
  equals(o: CombinacaoDeIndice | null): boolean {
    if (this === o) return true;
    if (!o) return false;
    const aDate = this.apartirDeOutroIndice?.getTime() ?? null;
    const bDate = o.apartirDeOutroIndice?.getTime() ?? null;
    if (aDate !== bDate) return false;
    if (this.outroIndiceTrabalhista !== o.outroIndiceTrabalhista) return false;
    return this.parametrosDeAtualizacao === o.parametrosDeAtualizacao;
  }
}
