/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeMulta
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.MaquinaDeCalculoDeMulta
 *
 * Ref Java: pjecalc-fonte/.../calculo/multa/MaquinaDeCalculoDeMulta.java (~119 linhas)
 *
 * Fluxo liquidar():
 *   INFORMADO:
 *     - Determina indice (trabalhista ou outro)
 *     - Se dataVencimento < dataLiquidacao: carrega TabelaDeCorrecaoMonetaria
 *       e atribui indiceCorrecaoMulta; senão, índice = 1
 *   CALCULADO:
 *     - dataVencimento = dataLiquidacao, indiceCorrecaoMulta = 1
 *     - Monta base por tipoBaseMulta (VALOR_CAUSA / P / PC / PCP)
 *     - valorMulta = base × aliquota%
 *
 * **Status**: stub estrutural. O fluxo CALCULADO depende de acessores do
 * Calculo (principal, FGTS, salário família etc.), ainda não totalmente
 * portados. TabelaDeCorrecaoMonetaria também pendente.
 */
import Decimal from 'decimal.js';
import type { Multa } from './multa';
import { TipoValorEnum } from '../../../constantes/enums';

const UM = new Decimal(1);

export class MaquinaDeCalculoDeMulta {
  private multa: Multa;

  constructor(multa: Multa) {
    this.multa = multa;
  }

  getMulta(): Multa { return this.multa; }
  setMulta(m: Multa): void { this.multa = m; }

  liquidar(): void {
    const m = this.multa;
    if (!m.getCalculo()) return;
    switch (m.getTipoValorDaMulta()) {
      case TipoValorEnum.INFORMADO:
        // Sem TabelaDeCorrecaoMonetaria ainda; assume índice = 1.
        m.setIndiceCorrecaoMulta(UM);
        break;
      case TipoValorEnum.CALCULADO: {
        const calc = m.getCalculo() as unknown as { getDataDeLiquidacao?(): Date | null };
        const dataLiq = calc.getDataDeLiquidacao?.() ?? null;
        if (dataLiq) m.setDataVencimentoMulta(dataLiq);
        m.setIndiceCorrecaoMulta(UM);
        // TODO(fase-8/10): preencher baseMulta e valorMulta a partir do principal
        // corrigido, CS, previdência privada, FGTS etc.
        break;
      }
    }
  }
}
