/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeHonorarios
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.MaquinaDeCalculoDeHonorarios
 *
 * Ref Java: pjecalc-fonte/.../calculo/honorarios/MaquinaDeCalculoDeHonorarios.java (~177 linhas)
 *
 * Fluxo do liquidar():
 *   1) TipoValor=INFORMADO:
 *      - Determina indiceMonetario (trabalhista do cálculo ou outroIndiceDeCorrecao)
 *      - Se dataVencimento < dataLiquidacao, carrega TabelaDeCorrecaoMonetaria
 *        do [vencimento, liquidação] e define indiceCorrecaoHonorario
 *      - Caso contrário, indiceCorrecaoHonorario = 1
 *   2) TipoValor=CALCULADO:
 *      - dataVencimento = dataLiquidacao, indiceCorrecaoHonorario = 1
 *      - Monta base conforme baseParaApuracao (BRUTO / BC / BCP / VNP)
 *      - valor = base × aliquota%
 *   3) Se apurarIRRF:
 *      - baseImposto = valorTotal (se IRPF sobre juros) ou valorCorrigido
 *      - PF: tabela IRPF progressiva da data de liquidação
 *      - PJ: alíquota fixa 1,5%
 *
 * **Status**: stub estrutural. O fluxo de correção depende de
 * TabelaDeCorrecaoMonetaria (ainda não portada) e o fluxo CALCULADO depende
 * do `Calculo.calcularBrutoDevidoAoReclamante()` + INSS + previdência
 * privada. Implementação completa virá nas Fases 10-11.
 */
import Decimal from 'decimal.js';
import type { Honorario } from './honorario';
import { TipoDeImpostoDeRendaEnum, TipoValorEnum } from '../../../constantes/enums';
import { arredondarValorMonetario } from '../../../base/comum/utils';

const ZERO = new Decimal(0);
const UM = new Decimal(1);
const ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA = new Decimal('1.50');

export class MaquinaDeCalculoDeHonorarios {
  static readonly ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA = ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA;

  private honorario: Honorario;

  constructor(honorario: Honorario) {
    this.honorario = honorario;
  }

  getHonorario(): Honorario { return this.honorario; }
  setHonorario(h: Honorario): void { this.honorario = h; }

  /**
   * liquidar (Java linha 32) — stub estrutural. Preenche valor/base/imposto
   * somente em cenários triviais (INFORMADO sem correção + PJ fixa).
   *
   * TODO(fase-10/11): implementar CALCULADO (bruto − CS − prev. privada) e
   * correção monetária (TabelaDeCorrecaoMonetaria).
   */
  liquidar(): void {
    const h = this.honorario;
    const calc = h.getCalculo();
    if (!calc) return;

    switch (h.getTipoValor()) {
      case TipoValorEnum.INFORMADO:
        // Sem correção disponível ainda — assume índice 1.
        h.setIndiceCorrecaoHonorario(UM);
        break;
      case TipoValorEnum.CALCULADO: {
        const dataLiq = (calc as unknown as { getDataDeLiquidacao?(): Date | null }).getDataDeLiquidacao?.() ?? null;
        if (dataLiq) h.setDataVencimento(dataLiq);
        h.setIndiceCorrecaoHonorario(UM);
        // Base e valor dependem de Calculo.calcularBrutoDevidoAoReclamante() —
        // stub por enquanto.
        // TODO(fase-10): preencher baseHonorario e valor.
        break;
      }
    }

    // IRPF
    if (h.getApurarIRRF()) {
      const baseImposto = h.getApurarIRPFSobreJuros()
        ? (h.getValorTotal() ?? ZERO)
        : (h.getValorCorrigido() ?? ZERO);
      let imposto = ZERO;
      switch (h.getTipoImpostoRenda()) {
        case TipoDeImpostoDeRendaEnum.PESSOA_FISICA:
          // TODO(fase-7/8): consultar TabelaIrpf.obterTabelaDa(dataLiq).
          // Deixa faixas em null e imposto 0 (stub).
          h.setValorInicialFaixaIrpf(null);
          h.setValorFinalFaixaIrpf(null);
          h.setValorAliquotaIrpf(null);
          h.setValorDeducaoIrpf(null);
          break;
        case TipoDeImpostoDeRendaEnum.PESSOA_JURIDICA:
          imposto = baseImposto.times(ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA).div(100);
          h.setValorInicialFaixaIrpf(null);
          h.setValorFinalFaixaIrpf(null);
          h.setValorAliquotaIrpf(ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA);
          h.setValorDeducaoIrpf(null);
          break;
      }
      h.setValorImpostoRenda(arredondarValorMonetario(imposto));
    } else {
      h.setValorImpostoRenda(ZERO);
    }
  }
}
