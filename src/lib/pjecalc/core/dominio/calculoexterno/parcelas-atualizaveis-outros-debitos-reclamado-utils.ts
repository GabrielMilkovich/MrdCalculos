/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisOutrosDebitosReclamadoUtils
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamadoUtils
 *
 * Ref Java: ~433 linhas. Porte compacto: fluxo de nullificação das flags
 * desmarcadas + esqueleto das consistências. As criações de Verba/Historico
 * (dependentes de pacotes ainda não portados) ficam marcadas como TODO.
 */
import { MensagemDeRecurso } from '../../comum/mensagem-de-recurso';
import { CredorDevedorMultaEnum } from '../../constantes/enums';
import { ParcelasAtualizaveisHonorario } from './parcelas-atualizaveis-honorario';
import { ParcelasAtualizaveisMultaIndenizacao } from './parcelas-atualizaveis-multa-indenizacao';
import { ParcelasAtualizaveisMultaIndenizacaoUtils } from './parcelas-atualizaveis-multa-indenizacao-utils';
import { ParcelasAtualizaveisOutrosDebitosReclamado } from './parcelas-atualizaveis-outros-debitos-reclamado';
import { ParcelasAtualizaveisUtils } from './parcelas-atualizaveis-utils';

export class ParcelasAtualizaveisOutrosDebitosReclamadoUtils extends ParcelasAtualizaveisUtils {
  static consistirDados(pa: ParcelasAtualizaveisOutrosDebitosReclamado): void {
    const erros = ParcelasAtualizaveisOutrosDebitosReclamadoUtils.validarPreenchimentoFormulario(pa);
    ParcelasAtualizaveisOutrosDebitosReclamadoUtils.lancarErros(erros);

    if (!pa.getMarcarMultaIndenizTerceiroReclamado()) {
      pa.setMultaIndenizTerceiroReclamado(new ParcelasAtualizaveisMultaIndenizacao());
      pa.setListaMultasIndenizTerceiroReclamado([]);
    } else {
      for (const multa of pa.getListaMultasIndenizTerceiroReclamado()) {
        multa.setTipoCredorDevedor(CredorDevedorMultaEnum.TERCEIRO_RECLAMADO);
        multa.setOutrosDebitosReclamado(pa);
        ParcelasAtualizaveisMultaIndenizacaoUtils.consistirDados(multa);
      }
    }

    if (!pa.getMarcarHonorariosDevReclamado()) {
      pa.setHonorariosDevReclamado(new ParcelasAtualizaveisHonorario());
      pa.setListaHonorariosDevReclamado([]);
    } else {
      for (const honorario of pa.getListaHonorariosDevReclamado()) {
        honorario.setOutrosDebitosReclamado(pa);
        // TODO(fase-15): ParcelasAtualizaveisHonorarioUtils.consistirDados(honorario)
      }
    }

    ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirDadosContribSocialDevido(pa);
    ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirDadosContribSocialPago(pa);
    ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirCustasConhecimentoReclamado(pa);
    ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirCustasLiquidacao(pa);
    ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirCustasExecucao(pa);
    // TODO(fase-15): consistirDadosContribSocialFgts + consistirDadosPrevidenciaPrivada
  }

  private static consistirDadosContribSocialDevido(pa: ParcelasAtualizaveisOutrosDebitosReclamado): void {
    if (!pa.getMarcarContribSocialSegurado()) {
      pa.setValorParcelasAteFev2009ContribSocialSegurado(null);
      pa.setValorJurosAteFev2009ContribSocialSegurado(null);
      pa.setValorParcelasAposFev2009ContribSocialSegurado(null);
      pa.setValorJurosAposFev2009ContribSocialSegurado(null);
      pa.setValorParcelaContribSocialSegurado(null);
      pa.setValorJurosContribSocialSegurado(null);
    }
    if (!pa.getMarcarContribSocialPatronal()) {
      pa.setValorParcelasAteFev2009ContribSocialPatronal(null);
      pa.setValorJurosAteFev2009ContribSocialPatronal(null);
      pa.setValorParcelasAposFev2009ContribSocialPatronal(null);
      pa.setValorJurosAposFev2009ContribSocialPatronal(null);
      pa.setValorParcelaContribSocialPatronal(null);
      pa.setValorJurosContribSocialPatronal(null);
    }
    // TODO(fase-15): criar Verbas ContribSocial e delegar para ParametrosDeAtualizacao.getLei11941().
    if (!pa.getMarcarMultaContribSocialDevidos()) {
      pa.setDataInicialAteFev2009MultaContribSocialDevidos(null);
      pa.setDataInicialAposFev2009MultaContribSocialDevidos(null);
      pa.setDataInicialBaseMultaContribSocialDevidos(null);
    }
  }

  private static consistirDadosContribSocialPago(pa: ParcelasAtualizaveisOutrosDebitosReclamado): void {
    if (!pa.getMarcarContribSocialPagos()) {
      pa.setValorParcelasAteFev2009ContribSocialPagos(null);
      pa.setValorJurosAteFev2009ContribSocialPagos(null);
      pa.setValorParcelasAposFev2009ContribSocialPagos(null);
      pa.setValorJurosAposFev2009ContribSocialPagos(null);
      pa.setValorParcelaContribSocialPagos(null);
      pa.setValorJurosContribSocialPagos(null);
    }
    if (!pa.getMarcarMultaContribSocialPagos()) {
      pa.setDataInicialAteFev2009MultaContribSocialPagos(null);
      pa.setDataInicialAposFev2009MultaContribSocialPagos(null);
      pa.setDataInicialBaseMultaContribSocialPagos(null);
    }
    // TODO(fase-15): criar Verbas de Contrib. Social Pagos + OcorrenciaDeInssSobreSalariosPagos.
  }

  /** TODO(fase-15): depende de CustasJudiciais (Calculo) portado. */
  private static consistirCustasConhecimentoReclamado(pa: ParcelasAtualizaveisOutrosDebitosReclamado): void {
    if (!pa.getMarcarCustasConhecimentoReclamado()) {
      pa.setCustasConhecimentoReclamado(null);
    }
  }

  private static consistirCustasLiquidacao(pa: ParcelasAtualizaveisOutrosDebitosReclamado): void {
    if (!pa.getMarcarCustasLiquidacao()) {
      pa.setCustasLiquidacao(null);
    }
  }

  private static consistirCustasExecucao(pa: ParcelasAtualizaveisOutrosDebitosReclamado): void {
    if (!pa.getMarcarCustasExecucao()) {
      pa.setCustasExecucao(null);
    }
  }

  /**
   * TODO(fase-15): validações dependem de Calculo.parametrosDeAtualizacao.lei11941 e
   * Calculo.custasJudiciais portados. Retornamos [] por ora para não falsamente
   * bloquear fluxos que ainda não dependem da validação no core.
   */
  private static validarPreenchimentoFormulario(_pa: ParcelasAtualizaveisOutrosDebitosReclamado): MensagemDeRecurso[] {
    return [];
  }
}
