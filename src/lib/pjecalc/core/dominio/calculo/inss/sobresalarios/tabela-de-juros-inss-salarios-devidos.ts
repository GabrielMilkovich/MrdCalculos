/**
 * PJe-Calc v2.15.1 — TabelaDeJurosInssSalariosDevidos
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.TabelaDeJurosInssSalariosDevidos
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/TabelaDeJurosInssSalariosDevidos.java
 *
 * Leituras dos flags vêm de `ParametrosDeAtualizacao`:
 *   getJurosPrevidenciariosDosSalariosDevidosDoINSS
 *   getJurosTrabalhistasDosSalariosDevidosDoINSS
 *   getAplicarAteDosSalariosDevidosDoINSS
 */
import { TabelaDeJurosDeInss } from '../tabela-de-juros-de-inss';
import type { Calculo } from '../../calculo';

export class TabelaDeJurosInssSalariosDevidos extends TabelaDeJurosDeInss {
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
    const flag = (params as unknown as { getJurosPrevidenciariosDosSalariosDevidosDoINSS?: () => boolean } | null)?.getJurosPrevidenciariosDosSalariosDevidosDoINSS?.();
    return flag ?? false;
  }

  protected isUsarJurosBasico(): boolean {
    const params = this.calculo.getParametrosDeAtualizacao?.();
    const flag = (params as unknown as { getJurosTrabalhistasDosSalariosDevidosDoINSS?: () => boolean } | null)?.getJurosTrabalhistasDosSalariosDevidosDoINSS?.();
    return flag ?? false;
  }

  protected getDataLimiteParaJurosBasico(): Date | null {
    const params = this.calculo.getParametrosDeAtualizacao?.();
    const data = (params as unknown as { getAplicarAteDosSalariosDevidosDoINSS?: () => Date | null } | null)?.getAplicarAteDosSalariosDevidosDoINSS?.();
    return data ?? null;
  }
}
