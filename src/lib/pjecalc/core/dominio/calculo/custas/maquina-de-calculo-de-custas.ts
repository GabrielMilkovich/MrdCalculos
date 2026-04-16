/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeCustas
 * Porte estrutural (stub) de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.MaquinaDeCalculoDeCustas
 *
 * Ref Java: pjecalc-fonte/.../calculo/custas/MaquinaDeCalculoDeCustas.java (~389 linhas)
 *
 * Orquestrador do cálculo de custas judiciais. Entradas:
 *   - CustasJudiciais (tipos, pisos/tetos, datas, taxas)
 *   - Calculo (base para cálculo: bruto + outros débitos)
 *   - TabelaDeCorrecaoMonetaria (para correção monetária)
 *
 * Responsabilidades:
 *   - liquidar(): calcula conhecimento (reclamante/reclamado), liquidação,
 *     custas fixas, autos judiciais, armazenamento; aplica pisos e tetos;
 *     obtém índices e taxas de juros para cada categoria
 *
 * **Status**: stub — depende de TabelaDeCorrecaoMonetaria +
 * TabelaPrevidenciariaSeguradoEmpregado + acessores do Calculo.
 */
import type { CustasJudiciais } from './custas-judiciais';

export class MaquinaDeCalculoDeCustas {
  private custasJudiciais: CustasJudiciais;

  constructor(custasJudiciais: CustasJudiciais) {
    this.custasJudiciais = custasJudiciais;
  }

  getCustasJudiciais(): CustasJudiciais { return this.custasJudiciais; }
  setCustasJudiciais(c: CustasJudiciais): void { this.custasJudiciais = c; }

  /**
   * liquidar (Java) — orquestra o cálculo das custas.
   * TODO(fase-8/10): implementar quando TabelaDeCorrecaoMonetaria +
   * TabelaPrevidenciariaSeguradoEmpregado estiverem disponíveis.
   */
  liquidar(): void {
    // no-op
  }
}
