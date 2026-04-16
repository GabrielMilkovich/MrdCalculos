/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.StringUtils
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisUtils;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.lang.StringUtils;

public class ParcelasAtualizaveisMultaIndenizacaoUtils
extends ParcelasAtualizaveisUtils {
    public static void consistirDados(ParcelasAtualizaveisMultaIndenizacao parcelasAtualizaveisMultaIndenizacao) {
        if (parcelasAtualizaveisMultaIndenizacao.getTipoValor().equals((Object)TipoValorEnum.INFORMADO)) {
            parcelasAtualizaveisMultaIndenizacao.setAplicarDescontoContribSocialCalculado(false);
            parcelasAtualizaveisMultaIndenizacao.setAplicarDescontoPrevPrivadaCalculado(false);
            parcelasAtualizaveisMultaIndenizacao.setTaxaCalculado(null);
            parcelasAtualizaveisMultaIndenizacao.setValorParcelaInformado(parcelasAtualizaveisMultaIndenizacao.getValorParcelaInformado() == null ? BigDecimal.ZERO : parcelasAtualizaveisMultaIndenizacao.getValorParcelaInformado());
            parcelasAtualizaveisMultaIndenizacao.setValorJurosInformado(parcelasAtualizaveisMultaIndenizacao.getValorJurosInformado() == null ? BigDecimal.ZERO : parcelasAtualizaveisMultaIndenizacao.getValorJurosInformado());
        } else {
            parcelasAtualizaveisMultaIndenizacao.setValorParcelaInformado(null);
            parcelasAtualizaveisMultaIndenizacao.setValorJurosInformado(null);
            parcelasAtualizaveisMultaIndenizacao.setIndiceTrabalhistaInformado(null);
            parcelasAtualizaveisMultaIndenizacao.setAplicarJurosInformado(false);
            parcelasAtualizaveisMultaIndenizacao.setDataApartirDeAplicarJurosInformado(null);
        }
    }

    public static List<MensagemDeRecurso> validarPreenchimentoFormulario(ParcelasAtualizaveisMultaIndenizacao paMulta, String idDescricao, String idCredor, String idValorParcela, String idAliquota, String idValorJuros) {
        ArrayList<MensagemDeRecurso> erros = new ArrayList<MensagemDeRecurso>();
        if (StringUtils.isBlank((String)paMulta.getDescricao())) {
            erros.add(new MensagemDeRecurso(idDescricao, Mensagens.MSG0003, "Descri\u00e7\u00e3o"));
        }
        if (idCredor != null && StringUtils.isBlank((String)paMulta.getCredor())) {
            erros.add(new MensagemDeRecurso(idCredor, Mensagens.MSG0003, "Credor"));
        }
        if (paMulta.getTipoValor().equals((Object)TipoValorEnum.CALCULADO)) {
            if (paMulta.getTaxaCalculado() == null) {
                erros.add(new MensagemDeRecurso(idAliquota, Mensagens.MSG0003, "Al\u00edquota"));
            }
        } else {
            if (paMulta.getValorParcelaInformado() == null) {
                erros.add(new MensagemDeRecurso(idValorParcela, Mensagens.MSG0003, "Valor da Parcela"));
            }
            if (paMulta.getAplicarJurosInformado().booleanValue() && Utils.naoNulo(paMulta.getDataApartirDeAplicarJurosInformado()) && Utils.naoNulo(paMulta.getValorJurosInformado()) && BigDecimal.ZERO.compareTo(paMulta.getValorJurosInformado()) != 0) {
                erros.add(new MensagemDeRecurso(idValorJuros, Mensagens.MSG0196, new Object[0]));
            }
        }
        GerenciadorDeValidadores.getInstance().validar(ParcelasAtualizaveisMultaIndenizacao.class, paMulta);
        return erros;
    }
}

