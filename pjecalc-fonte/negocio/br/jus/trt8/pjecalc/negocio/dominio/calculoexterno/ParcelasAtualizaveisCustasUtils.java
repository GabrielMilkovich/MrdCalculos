/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustas;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisUtils;
import java.util.ArrayList;
import java.util.List;

public class ParcelasAtualizaveisCustasUtils
extends ParcelasAtualizaveisUtils {
    public static List<ParcelasAtualizaveisCustas> encontrarCustasParaRemover(ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosDoReclamante, ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosDoReclamado, ParcelasAtualizaveisDebitosReclamante debitosDoReclamante) {
        ArrayList<ParcelasAtualizaveisCustas> custasParaRemover = new ArrayList<ParcelasAtualizaveisCustas>();
        if (!descontoCreditosDoReclamante.getMarcarCustasConhecimentoReclamante().booleanValue() && descontoCreditosDoReclamante.getCustasConhecimentoReclamante() != null && descontoCreditosDoReclamante.getCustasConhecimentoReclamante().getId() != null) {
            custasParaRemover.add(descontoCreditosDoReclamante.getCustasConhecimentoReclamante());
            descontoCreditosDoReclamante.setCustasConhecimentoReclamante(null);
            descontoCreditosDoReclamante.salvar(true);
        }
        boolean atualizarOutrosDebitosDoReclamado = false;
        if (!outrosDebitosDoReclamado.getMarcarCustasConhecimentoReclamado().booleanValue() && outrosDebitosDoReclamado.getCustasConhecimentoReclamado() != null && outrosDebitosDoReclamado.getCustasConhecimentoReclamado().getId() != null) {
            custasParaRemover.add(outrosDebitosDoReclamado.getCustasConhecimentoReclamado());
            outrosDebitosDoReclamado.setCustasConhecimentoReclamado(null);
            atualizarOutrosDebitosDoReclamado = true;
        }
        if (!outrosDebitosDoReclamado.getMarcarCustasLiquidacao().booleanValue() && outrosDebitosDoReclamado.getCustasLiquidacao() != null && outrosDebitosDoReclamado.getCustasLiquidacao().getId() != null) {
            custasParaRemover.add(outrosDebitosDoReclamado.getCustasLiquidacao());
            outrosDebitosDoReclamado.setCustasLiquidacao(null);
            atualizarOutrosDebitosDoReclamado = true;
        }
        if (!outrosDebitosDoReclamado.getMarcarCustasExecucao().booleanValue() && outrosDebitosDoReclamado.getCustasExecucao() != null && outrosDebitosDoReclamado.getCustasExecucao().getId() != null) {
            custasParaRemover.add(outrosDebitosDoReclamado.getCustasExecucao());
            outrosDebitosDoReclamado.setCustasExecucao(null);
            atualizarOutrosDebitosDoReclamado = true;
        }
        if (atualizarOutrosDebitosDoReclamado) {
            outrosDebitosDoReclamado.salvar(true);
        }
        if (!debitosDoReclamante.getMarcarCustasConhecimentoDevReclamante().booleanValue() && debitosDoReclamante.getCustasConhecimentoDevReclamante() != null && debitosDoReclamante.getCustasConhecimentoDevReclamante().getId() != null) {
            custasParaRemover.add(debitosDoReclamante.getCustasConhecimentoDevReclamante());
            debitosDoReclamante.setCustasConhecimentoDevReclamante(null);
            debitosDoReclamante.salvar(true);
        }
        return custasParaRemover;
    }

    public static void consistirDados(ParcelasAtualizaveisCustas parcelasAtualizaveisCustas) {
        if (parcelasAtualizaveisCustas.getTipoValor().equals((Object)TipoValorEnum.CALCULADO)) {
            parcelasAtualizaveisCustas.setValorParcelaInformado(null);
            parcelasAtualizaveisCustas.setValorJurosInformado(null);
        }
    }

    public static List<MensagemDeRecurso> validarPreenchimentoFormulario(ParcelasAtualizaveisCustas paCustas, String idValorParcela) {
        ArrayList<MensagemDeRecurso> erros = new ArrayList<MensagemDeRecurso>();
        if (paCustas.getTipoValor().equals((Object)TipoValorEnum.INFORMADO) && paCustas.getValorParcelaInformado() == null) {
            erros.add(new MensagemDeRecurso(idValorParcela, Mensagens.MSG0003, "Valor da Parcela"));
        }
        return erros;
    }
}

