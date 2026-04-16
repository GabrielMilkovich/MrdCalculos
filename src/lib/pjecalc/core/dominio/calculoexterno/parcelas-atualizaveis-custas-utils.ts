/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisCustasUtils
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustasUtils
 */
import { MensagemDeRecurso } from '../../comum/mensagem-de-recurso';
import { Mensagens } from '../../comum/mensagens';
import { TipoValorEnum } from '../../constantes/enums';
import { ParcelasAtualizaveisCustas } from './parcelas-atualizaveis-custas';
import type { ParcelasAtualizaveisDebitosReclamante } from './parcelas-atualizaveis-debitos-reclamante';
import type { ParcelasAtualizaveisDescontoCreditosReclamante } from './parcelas-atualizaveis-desconto-creditos-reclamante';
import type { ParcelasAtualizaveisOutrosDebitosReclamado } from './parcelas-atualizaveis-outros-debitos-reclamado';
import { ParcelasAtualizaveisUtils } from './parcelas-atualizaveis-utils';

export class ParcelasAtualizaveisCustasUtils extends ParcelasAtualizaveisUtils {
  static encontrarCustasParaRemover(
    descontoCreditosDoReclamante: ParcelasAtualizaveisDescontoCreditosReclamante,
    outrosDebitosDoReclamado: ParcelasAtualizaveisOutrosDebitosReclamado,
    debitosDoReclamante: ParcelasAtualizaveisDebitosReclamante,
  ): ParcelasAtualizaveisCustas[] {
    const custasParaRemover: ParcelasAtualizaveisCustas[] = [];
    const descontoCustas = descontoCreditosDoReclamante.getCustasConhecimentoReclamante();
    if (!descontoCreditosDoReclamante.getMarcarCustasConhecimentoReclamante() && descontoCustas && descontoCustas.getId() != null) {
      custasParaRemover.push(descontoCustas);
      descontoCreditosDoReclamante.setCustasConhecimentoReclamante(null);
      // TODO(fase-14/JPA): descontoCreditosDoReclamante.salvar(true);
    }

    const outrosCustasConhec = outrosDebitosDoReclamado.getCustasConhecimentoReclamado();
    if (!outrosDebitosDoReclamado.getMarcarCustasConhecimentoReclamado() && outrosCustasConhec && outrosCustasConhec.getId() != null) {
      custasParaRemover.push(outrosCustasConhec);
      outrosDebitosDoReclamado.setCustasConhecimentoReclamado(null);
    }
    const outrosCustasLiq = outrosDebitosDoReclamado.getCustasLiquidacao();
    if (!outrosDebitosDoReclamado.getMarcarCustasLiquidacao() && outrosCustasLiq && outrosCustasLiq.getId() != null) {
      custasParaRemover.push(outrosCustasLiq);
      outrosDebitosDoReclamado.setCustasLiquidacao(null);
    }
    const outrosCustasExec = outrosDebitosDoReclamado.getCustasExecucao();
    if (!outrosDebitosDoReclamado.getMarcarCustasExecucao() && outrosCustasExec && outrosCustasExec.getId() != null) {
      custasParaRemover.push(outrosCustasExec);
      outrosDebitosDoReclamado.setCustasExecucao(null);
    }

    const debitosCustas = debitosDoReclamante.getCustasConhecimentoDevReclamante();
    if (!debitosDoReclamante.getMarcarCustasConhecimentoDevReclamante() && debitosCustas && debitosCustas.getId() != null) {
      custasParaRemover.push(debitosCustas);
      debitosDoReclamante.setCustasConhecimentoDevReclamante(null);
    }

    return custasParaRemover;
  }

  static consistirDados(pa: ParcelasAtualizaveisCustas): void {
    if (pa.getTipoValor() === TipoValorEnum.CALCULADO) {
      pa.setValorParcelaInformado(null);
      pa.setValorJurosInformado(null);
    }
  }

  static validarPreenchimentoFormulario(
    paCustas: ParcelasAtualizaveisCustas,
    idValorParcela: string,
  ): MensagemDeRecurso[] {
    const erros: MensagemDeRecurso[] = [];
    if (paCustas.getTipoValor() === TipoValorEnum.INFORMADO && paCustas.getValorParcelaInformado() == null) {
      erros.push(new MensagemDeRecurso(idValorParcela, Mensagens.MSG0003, 'Valor da Parcela'));
    }
    return erros;
  }
}
