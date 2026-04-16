/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustasUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisUtils;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ParcelasAtualizaveisDebitosReclamanteUtils
extends ParcelasAtualizaveisUtils {
    public static void consistirDados(ParcelasAtualizaveisDebitosReclamante parcelasAtualizaveisDebitosReclamante) {
        List<MensagemDeRecurso> erros = ParcelasAtualizaveisDebitosReclamanteUtils.validarPreenchimentoFormulario(parcelasAtualizaveisDebitosReclamante);
        ParcelasAtualizaveisDebitosReclamanteUtils.lancarErros(erros);
        if (!parcelasAtualizaveisDebitosReclamante.getMarcarMultaIndenizDevReclamante().booleanValue()) {
            parcelasAtualizaveisDebitosReclamante.setMultaIndenizDevReclamante(new ParcelasAtualizaveisMultaIndenizacao());
            parcelasAtualizaveisDebitosReclamante.setListaMultasIndenizDevReclamante(new ArrayList<ParcelasAtualizaveisMultaIndenizacao>());
        } else {
            for (ParcelasAtualizaveisMultaIndenizacao multa : parcelasAtualizaveisDebitosReclamante.getListaMultasIndenizDevReclamante()) {
                multa.setTipoCredorDevedor(CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE);
                multa.setDebitosReclamante(parcelasAtualizaveisDebitosReclamante);
                multa.consistirDados();
            }
        }
        if (!parcelasAtualizaveisDebitosReclamante.getMarcarHonorariosDevReclamante().booleanValue()) {
            parcelasAtualizaveisDebitosReclamante.setHonorariosDevReclamante(new ParcelasAtualizaveisHonorario());
            parcelasAtualizaveisDebitosReclamante.setListaHonorariosDevReclamante(new ArrayList<ParcelasAtualizaveisHonorario>());
        } else {
            for (ParcelasAtualizaveisHonorario honorario : parcelasAtualizaveisDebitosReclamante.getListaHonorariosDevReclamante()) {
                honorario.setDebitosReclamante(parcelasAtualizaveisDebitosReclamante);
                honorario.consistirDados();
            }
        }
        ParcelasAtualizaveisDebitosReclamanteUtils.consistirCustasConhecimentoReclamante(parcelasAtualizaveisDebitosReclamante);
    }

    private static List<MensagemDeRecurso> validarPreenchimentoFormulario(ParcelasAtualizaveisDebitosReclamante parcelasAtualizaveisDebitosReclamante) {
        ArrayList<MensagemDeRecurso> erros = new ArrayList<MensagemDeRecurso>();
        if (parcelasAtualizaveisDebitosReclamante.getMarcarCustasConhecimentoDevReclamante().booleanValue()) {
            BigDecimal pisoReclamante;
            String idValorParcela = "valorParcelaDebReclamCustasConhecimentoDevReclamante";
            erros.addAll(ParcelasAtualizaveisCustasUtils.validarPreenchimentoFormulario(parcelasAtualizaveisDebitosReclamante.getCustasConhecimentoDevReclamante(), idValorParcela));
            if (parcelasAtualizaveisDebitosReclamante.getCustasConhecimentoDevReclamante().getTipoValor() == TipoValorEnum.INFORMADO && parcelasAtualizaveisDebitosReclamante.getCustasConhecimentoDevReclamante().getValorParcelaInformado() != null && Utils.naoNulo(pisoReclamante = parcelasAtualizaveisDebitosReclamante.getCalculoExterno().getCustasJudiciais().obterValorParaValidacao(parcelasAtualizaveisDebitosReclamante.getCalculoExterno().getDataDeLiquidacao(), parcelasAtualizaveisDebitosReclamante.getCustasConhecimentoDevReclamante().getValorParcelaInformado(), 2))) {
                erros.add(new MensagemDeRecurso(idValorParcela, Mensagens.MSG0052, Utils.formatarNumero(pisoReclamante)));
            }
        }
        return erros;
    }

    private static void consistirCustasConhecimentoReclamante(ParcelasAtualizaveisDebitosReclamante parcelasAtualizaveisDebitosReclamante) {
        if (!parcelasAtualizaveisDebitosReclamante.getMarcarCustasConhecimentoDevReclamante().booleanValue()) {
            parcelasAtualizaveisDebitosReclamante.setCustasConhecimentoDevReclamante(null);
        } else {
            switch (parcelasAtualizaveisDebitosReclamante.getCustasConhecimentoDevReclamante().getTipoValor()) {
                case CALCULADO: {
                    parcelasAtualizaveisDebitosReclamante.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeConhecimentoDoReclamante(TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO);
                    break;
                }
                case INFORMADO: {
                    parcelasAtualizaveisDebitosReclamante.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeConhecimentoDoReclamante(TipoDeCustasDeConhecimentoEnum.INFORMADA);
                    parcelasAtualizaveisDebitosReclamante.getCalculoExterno().getCustasJudiciais().setDataVencimentoConhecimentoDoReclamante(parcelasAtualizaveisDebitosReclamante.getCalculoExterno().getDataDeLiquidacao());
                    parcelasAtualizaveisDebitosReclamante.getCalculoExterno().getCustasJudiciais().setTipoCobrancaReclamante(TipoCobrancaReclamanteEnum.COBRAR);
                    parcelasAtualizaveisDebitosReclamante.getCalculoExterno().getCustasJudiciais().setValorDeConhecimentoDoReclamante(parcelasAtualizaveisDebitosReclamante.getCustasConhecimentoDevReclamante().getValorParcelaInformado());
                    break;
                }
            }
        }
    }
}

