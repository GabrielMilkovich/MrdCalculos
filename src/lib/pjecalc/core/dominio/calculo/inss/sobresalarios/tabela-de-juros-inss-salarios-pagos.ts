/**
 * PJe-Calc v2.15.1 — TabelaDeJurosInssSalariosPagos
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.TabelaDeJurosInssSalariosPagos
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/TabelaDeJurosInssSalariosPagos.java
 *
 * Análoga a TabelaDeJurosInssSalariosDevidos mas lê flags para "salários pagos"
 * (geralmente usadas em contribuição previdenciária patronal já recolhida).
 */
import { TabelaDeJurosDeInss } from '../tabela-de-juros-de-inss';
import type { Calculo } from '../../calculo';

export class TabelaDeJurosInssSalariosPagos extends TabelaDeJurosDeInss {
  constructor(
    calculo: Calculo,
    dataInicialParaCalculo: Date,
    dataFinalParaCalculo: Date | null = null,
    ocorrenciaAntesDaLei: boolean | null = null,
  ) {
    super(calculo, dataInicialParaCalculo, dataFinalParaCalculo, ocorrenciaAntesDaLei);
  }

  protected isUsarJurosSelic(): boolean {
    const params = this.calculo.getParametrosDeAtualizacao?.();
    const flag = (params as unknown as { getJurosPrevidenciariosDosSalariosPagosDoINSS?: () => boolean } | null)?.getJurosPrevidenciariosDosSalariosPagosDoINSS?.();
    return flag ?? false;
  }

  protected isUsarJurosBasico(): boolean {
    const params = this.calculo.getParametrosDeAtualizacao?.();
    const flag = (params as unknown as { getJurosTrabalhistasDosSalariosPagosDoINSS?: () => boolean } | null)?.getJurosTrabalhistasDosSalariosPagosDoINSS?.();
    return flag ?? false;
  }

  protected getDataLimiteParaJurosBasico(): Date | null {
    const params = this.calculo.getParametrosDeAtualizacao?.();
    const data = (params as unknown as { getAplicarAteDosSalariosPagosDoINSS?: () => Date | null } | null)?.getAplicarAteDosSalariosPagosDoINSS?.();
    return data ?? null;
  }
}
