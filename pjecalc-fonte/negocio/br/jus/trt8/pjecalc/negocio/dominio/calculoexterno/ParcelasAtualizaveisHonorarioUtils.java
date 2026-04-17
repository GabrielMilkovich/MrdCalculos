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
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisUtils;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.lang.StringUtils;

public class ParcelasAtualizaveisHonorarioUtils
extends ParcelasAtualizaveisUtils {
    public static void consistirDados(ParcelasAtualizaveisHonorario parcelasAtualizaveisHonorario) {
        if (!parcelasAtualizaveisHonorario.getApurarIrpf().booleanValue()) {
            parcelasAtualizaveisHonorario.setIncidirIrpfSobreJuros(false);
            parcelasAtualizaveisHonorario.setTipoIrpf(null);
        }
        if (parcelasAtualizaveisHonorario.getTipoValor().equals((Object)TipoValorEnum.INFORMADO)) {
            parcelasAtualizaveisHonorario.setAplicarDescontoContribSocialCalculado(false);
            parcelasAtualizaveisHonorario.setAplicarDescontoPrevPrivadaCalculado(false);
            parcelasAtualizaveisHonorario.setTaxaCalculado(null);
            parcelasAtualizaveisHonorario.setValorParcelaInformado(parcelasAtualizaveisHonorario.getValorParcelaInformado() == null ? BigDecimal.ZERO : parcelasAtualizaveisHonorario.getValorParcelaInformado());
            parcelasAtualizaveisHonorario.setValorJurosInformado(parcelasAtualizaveisHonorario.getValorJurosInformado() == null ? BigDecimal.ZERO : parcelasAtualizaveisHonorario.getValorJurosInformado());
        } else {
            parcelasAtualizaveisHonorario.setValorParcelaInformado(null);
            parcelasAtualizaveisHonorario.setValorJurosInformado(null);
            parcelasAtualizaveisHonorario.setIndiceTrabalhistaInformado(null);
            parcelasAtualizaveisHonorario.setAplicarJurosInformado(false);
            parcelasAtualizaveisHonorario.setDataApartirDeAplicarJurosInformado(null);
        }
    }

    public static List<MensagemDeRecurso> validarPreenchimentoFormulario(ParcelasAtualizaveisHonorario paHonorario, String idDescricao, String idCredor, String idValorParcela, String idAliquota, String idNumDocFiscal, String idValorJuros) {
        ArrayList<MensagemDeRecurso> erros = new ArrayList<MensagemDeRecurso>();
        if (StringUtils.isBlank((String)paHonorario.getDescricao())) {
            erros.add(new MensagemDeRecurso(idDescricao, Mensagens.MSG0003, "Descri\u00e7\u00e3o"));
        }
        if (idCredor != null && StringUtils.isBlank((String)paHonorario.getCredor())) {
            erros.add(new MensagemDeRecurso(idCredor, Mensagens.MSG0003, "Credor"));
        }
        if (paHonorario.getTipoValor().equals((Object)TipoValorEnum.CALCULADO)) {
            if (paHonorario.getTaxaCalculado() == null) {
                erros.add(new MensagemDeRecurso(idAliquota, Mensagens.MSG0003, "Al\u00edquota"));
            }
        } else {
            if (paHonorario.getValorParcelaInformado() == null) {
                erros.add(new MensagemDeRecurso(idValorParcela, Mensagens.MSG0003, "Valor da Parcela"));
            }
            if (paHonorario.getAplicarJurosInformado().booleanValue() && Utils.naoNulo(paHonorario.getDataApartirDeAplicarJurosInformado()) && Utils.naoNulo(paHonorario.getValorJurosInformado()) && BigDecimal.ZERO.compareTo(paHonorario.getValorJurosInformado()) != 0) {
                erros.add(new MensagemDeRecurso(idValorJuros, Mensagens.MSG0196, new Object[0]));
            }
        }
        if (paHonorario.getApurarIrpf().booleanValue() && StringUtils.isBlank((String)paHonorario.getNumeroDocFiscal())) {
            erros.add(new MensagemDeRecurso(idNumDocFiscal, Mensagens.MSG0003, "N\u00famero"));
        }
        GerenciadorDeValidadores.getInstance().validar(ParcelasAtualizaveisHonorario.class, paHonorario);
        return erros;
    }
}

