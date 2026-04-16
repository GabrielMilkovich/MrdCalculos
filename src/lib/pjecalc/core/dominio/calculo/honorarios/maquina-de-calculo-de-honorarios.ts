/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeHonorarios
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.MaquinaDeCalculoDeHonorarios
 *
 * Ref Java: pjecalc-fonte/.../calculo/honorarios/MaquinaDeCalculoDeHonorarios.java (~177 linhas)
 *
 * Fluxo do liquidar():
 *   1) TipoValor=INFORMADO:
 *      - Determina indiceMonetario (trabalhista do calculo ou outroIndiceDeCorrecao)
 *      - Se dataVencimento < dataLiquidacao, carrega TabelaDeCorrecaoMonetaria
 *        do [vencimento, liquidação] e define indiceCorrecaoHonorario
 *      - Caso contrário, indiceCorrecaoHonorario = 1
 *   2) TipoValor=CALCULADO:
 *      - dataVencimento = dataLiquidacao, indiceCorrecaoHonorario = 1
 *      - Monta base conforme baseParaApuracao:
 *        BRUTO: Calculo.calcularBrutoDevidoAoReclamante()
 *        BC: BRUTO - descontoCS (InssSeguradoReclamante se apurar+cobrar)
 *        BCP: BC - descontoPP (PrevidenciaPrivada.totalDoDevidoCorrigido)
 *        VNP: soma de HonorarioVerbaDeCalculo.verba.valorTotalDiferencaCorrigida
 *      - valor = base × aliquota%
 *   3) Se apurarIRRF:
 *      - baseImposto = valorTotal (se IRPF sobre juros) ou valorCorrigido
 *      - PF: tabela IRPF progressiva na data de liquidação (TabelaIrpf)
 *      - PJ: alíquota fixa 1,5%
 *
 * Dependencias em uso: TabelaDeCorrecaoMonetaria, Calculo,
 * Honorario (todos acessores), HonorarioVerbaDeCalculo (duck-type).
 *
 * Dependencia plugavel via setTabelaIrpfSource: TabelaIrpf/FaixaFiscal
 * ainda nao portadas — consumidores podem prover via DI.
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../../base/comum/helper-date';
import { Periodo } from '../../../base/comum/periodo';
import {
  arredondarValorMonetario,
  multiplicar,
  naoNulo,
  obterPercentualPara,
  subtrair,
} from '../../../base/comum/utils';
import {
  BaseParaApuracaoDeHonorarioEnum,
  OpcaoDeIndiceDeCorrecaoEnum,
  TipoDeImpostoDeRendaEnum,
  TipoValorEnum,
} from '../../../constantes/enums';
import { TabelaDeCorrecaoMonetaria, type ITabelaCorrecaoContext } from '../../verbacalculo/tabela-de-correcao-monetaria';
import type { Calculo } from '../calculo';
import type { Honorario } from './honorario';

const UM = new Decimal(1);
const ZERO = new Decimal(0);
const ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA = new Decimal('1.50');

/** Faixa da tabela IRPF (PF). */
export interface FaixaIrpfRef {
  getValorInicial(): Decimal | null;
  getValorFinal(): Decimal | null;
  getAliquota(): Decimal;
  getDeducao(): Decimal | null;
}

/** Provedor plugavel da tabela IRPF (ate que TabelaIrpf Java seja portada). */
export type TabelaIrpfSource = (dataLiquidacao: Date, baseImposto: Decimal) => FaixaIrpfRef | null;

let tabelaIrpfSource: TabelaIrpfSource | null = null;
export function setTabelaIrpfSource(fn: TabelaIrpfSource | null): void {
  tabelaIrpfSource = fn;
}

export class MaquinaDeCalculoDeHonorarios {
  static readonly ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA = ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA;

  private honorario: Honorario;

  constructor(honorario: Honorario) {
    this.honorario = honorario;
  }

  getHonorario(): Honorario { return this.honorario; }
  setHonorario(h: Honorario): void { this.honorario = h; }

  /** liquidar — Java linha 32. */
  liquidar(): void {
    const h = this.honorario;
    const calc = h.getCalculo();
    if (!calc) return;

    switch (h.getTipoValor()) {
      case TipoValorEnum.INFORMADO: {
        const usaIndiceTrabalhista =
          h.getTipoDeIndiceDeCorrecao() === OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
        let indiceMonetario = calc.getAtualizacaoMonetaria();
        if (!usaIndiceTrabalhista && naoNulo(h.getOutroIndiceDeCorrecao())) {
          indiceMonetario = h.getOutroIndiceDeCorrecao()!;
        }
        const dataVenc = h.getDataVencimento();
        const dataLiq = calc.getDataDeLiquidacao();
        if (naoNulo(dataVenc) && HelperDate.dateBefore(dataVenc as Date, dataLiq)) {
          const ctx = this.buildTabelaContext(calc);
          const tabela = new TabelaDeCorrecaoMonetaria(
            ctx,
            indiceMonetario,
            calc.getIndicesAcumulados(),
            calc.getIgnorarTaxaCorrecaoNegativa(),
            null,
            usaIndiceTrabalhista,
          );
          const periodo = new Periodo(dataVenc as Date, dataLiq);
          tabela.setOrigemCalculo(true);
          tabela.carregarTabela(periodo);
          tabela.marcaInicioFixoMesVencimento();
          h.setIndiceCorrecaoHonorario(tabela.obterValorAcumuladoDoIndice(dataVenc as Date));
          break;
        }
        h.setIndiceCorrecaoHonorario(UM);
        break;
      }

      case TipoValorEnum.CALCULADO: {
        h.setDataVencimento(calc.getDataDeLiquidacao());
        const baseHonorario = this.calcularBaseCalculado(calc);
        h.setBaseHonorario(baseHonorario);
        const aliquota = h.getAliquota() ?? ZERO;
        const percentual = obterPercentualPara(aliquota) ?? ZERO;
        h.setValor(baseHonorario.times(percentual));
        h.setIndiceCorrecaoHonorario(UM);
        break;
      }
    }

    // IRPF (Java linha 89)
    if (h.getApurarIRRF()) {
      const baseImposto = h.getApurarIRPFSobreJuros()
        ? (h.getValorTotal() ?? ZERO)
        : (h.getValorCorrigido() ?? ZERO);
      let imposto = ZERO;
      switch (h.getTipoImpostoRenda()) {
        case TipoDeImpostoDeRendaEnum.PESSOA_FISICA: {
          const faixa = tabelaIrpfSource?.(calc.getDataDeLiquidacao(), baseImposto) ?? null;
          if (faixa) {
            const aliq = obterPercentualPara(faixa.getAliquota()) ?? ZERO;
            imposto = multiplicar(baseImposto, aliq) ?? ZERO;
            imposto = subtrair(imposto, faixa.getDeducao() ?? ZERO) ?? ZERO;
            h.setValorInicialFaixaIrpf(faixa.getValorInicial());
            h.setValorFinalFaixaIrpf(faixa.getValorFinal());
            h.setValorAliquotaIrpf(faixa.getAliquota());
            h.setValorDeducaoIrpf(faixa.getDeducao());
          } else {
            h.setValorInicialFaixaIrpf(null);
            h.setValorFinalFaixaIrpf(null);
            h.setValorAliquotaIrpf(null);
            h.setValorDeducaoIrpf(null);
          }
          break;
        }
        case TipoDeImpostoDeRendaEnum.PESSOA_JURIDICA: {
          const aliqPj = obterPercentualPara(ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA) ?? ZERO;
          imposto = multiplicar(baseImposto, aliqPj) ?? ZERO;
          h.setValorInicialFaixaIrpf(null);
          h.setValorFinalFaixaIrpf(null);
          h.setValorAliquotaIrpf(ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA);
          h.setValorDeducaoIrpf(null);
          break;
        }
      }
      h.setValorImpostoRenda(arredondarValorMonetario(imposto));
    } else {
      h.setValorImpostoRenda(ZERO);
    }
  }

  /** calcularBaseCalculado — Java linhas 56-86. */
  private calcularBaseCalculado(calc: Calculo): Decimal {
    const h = this.honorario;
    const tipoBase = h.getBaseParaApuracao();

    let descontoDePrevidenciaPrivada = ZERO;
    let descontoDeContribuicaoSocial = ZERO;
    let bruto = ZERO;

    // Fall-through Java: BCP → BC → B (soma todos os descontos).
    if (tipoBase === BaseParaApuracaoDeHonorarioEnum.BRUTO_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA) {
      const pp = calc.getPrevidenciaPrivada() as { getTotalDoDevidoCorrigido?(): Decimal | null } | null;
      descontoDePrevidenciaPrivada = pp?.getTotalDoDevidoCorrigido?.() ?? ZERO;
    }

    if (
      tipoBase === BaseParaApuracaoDeHonorarioEnum.BRUTO_MENOS_CONTRIBUICAO_SOCIAL ||
      tipoBase === BaseParaApuracaoDeHonorarioEnum.BRUTO_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA
    ) {
      const inss = calc.getInss() as {
        getInssSobreSalariosDevidos?(): {
          getApurarInssSegurado?(): boolean;
          getCobrarInssDoReclamante?(): boolean;
          getValorTotalInssSeguradoReclamante?(): Decimal | null;
        } | null;
      } | null;
      const devidos = inss?.getInssSobreSalariosDevidos?.() ?? null;
      if (devidos?.getApurarInssSegurado?.() && devidos?.getCobrarInssDoReclamante?.()) {
        const valor = devidos.getValorTotalInssSeguradoReclamante?.() ?? ZERO;
        descontoDeContribuicaoSocial = arredondarValorMonetario(valor) ?? ZERO;
      }
    }

    if (
      tipoBase === BaseParaApuracaoDeHonorarioEnum.BRUTO ||
      tipoBase === BaseParaApuracaoDeHonorarioEnum.BRUTO_MENOS_CONTRIBUICAO_SOCIAL ||
      tipoBase === BaseParaApuracaoDeHonorarioEnum.BRUTO_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA
    ) {
      bruto = calc.calcularBrutoDevidoAoReclamante();
    }

    if (tipoBase === BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL) {
      for (const hvc of h.getVerbasSelecionadas()) {
        const verba = hvc.getVerbaDeCalculo?.() as { getValorTotalDiferencaCorrigida?(): Decimal | null } | null;
        const valor = verba?.getValorTotalDiferencaCorrigida?.() ?? ZERO;
        bruto = bruto.plus(valor);
      }
    }

    return bruto.minus(descontoDeContribuicaoSocial).minus(descontoDePrevidenciaPrivada);
  }

  private buildTabelaContext(calc: Calculo): ITabelaCorrecaoContext {
    const calcRef = calc as unknown as { getDataDemissao?(): Date };
    return {
      getDataDeLiquidacao: () => calc.getDataDeLiquidacao(),
      getDataDemissao: () => calcRef.getDataDemissao?.() ?? calc.getDataDeLiquidacao(),
    };
  }
}
