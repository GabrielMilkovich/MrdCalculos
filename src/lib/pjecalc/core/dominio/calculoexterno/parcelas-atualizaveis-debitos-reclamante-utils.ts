/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisDebitosReclamanteUtils
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamanteUtils
 */
import { CredorDevedorMultaEnum } from '../../constantes/enums';
import { ParcelasAtualizaveisDebitosReclamante } from './parcelas-atualizaveis-debitos-reclamante';
import { ParcelasAtualizaveisHonorario } from './parcelas-atualizaveis-honorario';
import { ParcelasAtualizaveisMultaIndenizacao } from './parcelas-atualizaveis-multa-indenizacao';
import { ParcelasAtualizaveisMultaIndenizacaoUtils } from './parcelas-atualizaveis-multa-indenizacao-utils';
import { ParcelasAtualizaveisUtils } from './parcelas-atualizaveis-utils';

export class ParcelasAtualizaveisDebitosReclamanteUtils extends ParcelasAtualizaveisUtils {
  static consistirDados(pa: ParcelasAtualizaveisDebitosReclamante): void {
    // TODO(fase-15): validarPreenchimentoFormulario + lancarErros
    // (requer Calculo.custasJudiciais portado para validar piso reclamante).

    if (!pa.getMarcarMultaIndenizDevReclamante()) {
      pa.setMultaIndenizDevReclamante(new ParcelasAtualizaveisMultaIndenizacao());
      pa.setListaMultasIndenizDevReclamante([]);
    } else {
      for (const multa of pa.getListaMultasIndenizDevReclamante()) {
        multa.setTipoCredorDevedor(CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE);
        multa.setDebitosReclamante(pa);
        ParcelasAtualizaveisMultaIndenizacaoUtils.consistirDados(multa);
      }
    }

    if (!pa.getMarcarHonorariosDevReclamante()) {
      pa.setHonorariosDevReclamante(new ParcelasAtualizaveisHonorario());
      pa.setListaHonorariosDevReclamante([]);
    } else {
      for (const honorario of pa.getListaHonorariosDevReclamante()) {
        honorario.setDebitosReclamante(pa);
        // TODO(fase-15): ParcelasAtualizaveisHonorarioUtils.consistirDados(honorario)
      }
    }

    ParcelasAtualizaveisDebitosReclamanteUtils.consistirCustasConhecimentoReclamante(pa);
  }

  /**
   * TODO(fase-15): lógica completa depende de Calculo.getCustasJudiciais() portado.
   * Por ora apenas zera a referência quando o checkbox de marcação está falso.
   */
  private static consistirCustasConhecimentoReclamante(pa: ParcelasAtualizaveisDebitosReclamante): void {
    if (!pa.getMarcarCustasConhecimentoDevReclamante()) {
      pa.setCustasConhecimentoDevReclamante(null);
    }
    // TODO(fase-15): quando CustasJudiciais estiver portada, aplicar switch
    // CALCULADO / INFORMADO no Calculo.getCustasJudiciais() para refletir
    // tipoDeCustasDeConhecimentoDoReclamante + dataVencimento + cobrança.
  }
}
