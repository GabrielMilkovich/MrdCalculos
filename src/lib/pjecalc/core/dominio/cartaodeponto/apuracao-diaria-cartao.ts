/**
 * PJe-Calc v2.15.1 — ApuracaoDiariaCartao (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoDiariaCartao
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/ApuracaoDiariaCartao.java (~401 linhas)
 *
 * Representa o resultado da apuração de um dia específico:
 *   - horasTrabalhadas, horasExtras (por faixa), horasNoturnas
 *   - supressões de intervalo intra (integral / reforma / excesso)
 *   - supressão Art. 253 CLT
 *   - flags feriado / sábado-domingo
 */
import Decimal from 'decimal.js';
import type { Calculo } from '../calculo/calculo';

const ZERO = new Decimal(0);

export class ApuracaoDiariaCartao {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private data: Date | null = null;

  // Horas (millis ou formato HH:mm convertido)
  private horasTrabalhadas: Decimal = ZERO;
  private horasExtrasPrimeiroBloco: Decimal = ZERO;
  private horasExtrasDemais: Decimal = ZERO;
  private horasExtrasDescanso: Decimal = ZERO;
  private horasExtrasFeriado: Decimal = ZERO;
  private horasExtrasSabadoDomingo: Decimal = ZERO;
  private horasNoturnas: Decimal = ZERO;

  // Supressões
  private supressaoIntraIntegral: Decimal = ZERO;
  private supressaoIntraReforma: Decimal = ZERO;
  private supressaoArt253: Decimal = ZERO;
  private excessoIntervaloIntra: Decimal = ZERO;

  // Flags
  private feriado: boolean = false;
  private sabadoDomingo: boolean = false;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getData(): Date | null { return this.data; }
  setData(d: Date | null): void { this.data = d; }

  getHorasTrabalhadas(): Decimal { return this.horasTrabalhadas; }
  setHorasTrabalhadas(v: Decimal): void { this.horasTrabalhadas = v; }

  getHorasExtrasPrimeiroBloco(): Decimal { return this.horasExtrasPrimeiroBloco; }
  setHorasExtrasPrimeiroBloco(v: Decimal): void { this.horasExtrasPrimeiroBloco = v; }

  getHorasExtrasDemais(): Decimal { return this.horasExtrasDemais; }
  setHorasExtrasDemais(v: Decimal): void { this.horasExtrasDemais = v; }

  getHorasExtrasDescanso(): Decimal { return this.horasExtrasDescanso; }
  setHorasExtrasDescanso(v: Decimal): void { this.horasExtrasDescanso = v; }

  getHorasExtrasFeriado(): Decimal { return this.horasExtrasFeriado; }
  setHorasExtrasFeriado(v: Decimal): void { this.horasExtrasFeriado = v; }

  getHorasExtrasSabadoDomingo(): Decimal { return this.horasExtrasSabadoDomingo; }
  setHorasExtrasSabadoDomingo(v: Decimal): void { this.horasExtrasSabadoDomingo = v; }

  getHorasNoturnas(): Decimal { return this.horasNoturnas; }
  setHorasNoturnas(v: Decimal): void { this.horasNoturnas = v; }

  getSupressaoIntraIntegral(): Decimal { return this.supressaoIntraIntegral; }
  setSupressaoIntraIntegral(v: Decimal): void { this.supressaoIntraIntegral = v; }

  getSupressaoIntraReforma(): Decimal { return this.supressaoIntraReforma; }
  setSupressaoIntraReforma(v: Decimal): void { this.supressaoIntraReforma = v; }

  getSupressaoArt253(): Decimal { return this.supressaoArt253; }
  setSupressaoArt253(v: Decimal): void { this.supressaoArt253 = v; }

  getExcessoIntervaloIntra(): Decimal { return this.excessoIntervaloIntra; }
  setExcessoIntervaloIntra(v: Decimal): void { this.excessoIntervaloIntra = v; }

  getFeriado(): boolean { return this.feriado; }
  setFeriado(v: boolean): void { this.feriado = v; }

  getSabadoDomingo(): boolean { return this.sabadoDomingo; }
  setSabadoDomingo(v: boolean): void { this.sabadoDomingo = v; }

  /**
   * `getDataOcorrencia` — alias de `getData()` para paridade com o Java, onde
   * o campo se chama `dataOcorrencia`. Mantemos os dois getters; o TS já usa
   * `data` por convenção local.
   */
  getDataOcorrencia(): Date | null {
    return this.data;
  }

  /**
   * `equals` — igualdade por `id` (paridade ApuracaoDiariaCartao.java:385-394).
   *
   * Regras Java preservadas:
   *   - mesma instância → true
   *   - outro null → false
   *   - ambos `id == null` → false (seguindo `other.id != null` → o `!=`
   *     retorna false, então o `return !(false)` = true ... ATENÇÃO:
   *     a lógica Java `!(this.id == null ? other.id != null : !this.id.equals(other.id))`
   *     quando ambos são null: `this.id == null` → ramo true, valor = `other.id != null`
   *     = false, então `!false` = true. Duas instâncias com id null SÃO iguais).
   *   - ambos não-nulos → comparação por `id`.
   */
  equalsApuracaoDiaria(obj: unknown): boolean {
    if (this === obj) return true;
    if (obj == null) return false;
    if (!(obj instanceof ApuracaoDiariaCartao)) return false;
    if (this.id == null) {
      return obj.id == null;
    }
    return this.id === obj.id;
  }

  /**
   * `compareTo` — ordena por `dataOcorrencia` ascendente (paridade
   * ApuracaoDiariaCartao.java:397-399).
   *
   * Retorna -1, 0 ou 1 conforme Date.getTime(). Se ambas as datas forem null
   * consideramos empate 0; se só uma for null, a nula vai ao fim (maior) —
   * Java quebraria com NPE; TS preserva semântica estável sem throw.
   */
  compareTo(other: ApuracaoDiariaCartao): number {
    const a = this.data?.getTime();
    const b = other.data?.getTime();
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
}
