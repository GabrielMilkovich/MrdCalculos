/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.DadosGPrec
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.HonorarioGPrec
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacaoHonorario
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacaoMulta
 *  org.apache.commons.lang.StringEscapeUtils
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.proc;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.integracao.dto.exporta.DadosGPrec;
import br.jus.trt8.pjecalc.integracao.dto.exporta.HonorarioGPrec;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacaoHonorario;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacaoMulta;
import org.apache.commons.lang.StringEscapeUtils;

public class XMLExpScanProcessorUtils {
    public static String escreverDadosEstruturados(PJeCalcImportacao pjecalcImportacao) {
        StringBuilder sb = new StringBuilder();
        if (Utils.naoNulo(pjecalcImportacao.getDadosGPrec())) {
            XMLExpScanProcessorUtils.escreverDadosGPrec(sb, pjecalcImportacao);
        }
        sb.append("<dadosEstruturados>");
        XMLExpScanProcessorUtils.escrever(sb, "dataLiquidacao", HelperDate.getInstance(pjecalcImportacao.getDataLiquidacao()).getCalendar().getTimeInMillis());
        XMLExpScanProcessorUtils.escrever(sb, "hashLiquidacao", pjecalcImportacao.getHashPJeCalc());
        XMLExpScanProcessorUtils.escrever(sb, "contrSocialDezPorcento", pjecalcImportacao.getContribuicaoSocialDezPorCento());
        XMLExpScanProcessorUtils.escrever(sb, "contrSocialMeioPorcento", pjecalcImportacao.getContribuicaoSocialMeioPorCento());
        XMLExpScanProcessorUtils.escrever(sb, "custasReclamado", pjecalcImportacao.getCustasReclamado());
        XMLExpScanProcessorUtils.escrever(sb, "custasReclamante", pjecalcImportacao.getCustasReclamante());
        XMLExpScanProcessorUtils.escrever(sb, "debitoReclamantePensaoAlimenticia", pjecalcImportacao.getDebitoReclamantePensaoAlimenticia());
        XMLExpScanProcessorUtils.escrever(sb, "debitoReclamantePrevidenciaPrivada", pjecalcImportacao.getDebitoReclamantePrevidenciaPrivada());
        XMLExpScanProcessorUtils.escrever(sb, "fgtsDepositoContaVinculada", pjecalcImportacao.getFgtsDepositoContaVinculada());
        XMLExpScanProcessorUtils.escrever(sb, "impostoRenda", pjecalcImportacao.getImpostoDeRenda());
        XMLExpScanProcessorUtils.escrever(sb, "inssReclamado", pjecalcImportacao.getInssReclamado());
        XMLExpScanProcessorUtils.escrever(sb, "inssReclamante", pjecalcImportacao.getInssReclamante());
        XMLExpScanProcessorUtils.escrever(sb, "jurosMora", pjecalcImportacao.getJurosDeMora());
        XMLExpScanProcessorUtils.escrever(sb, "jurosPrevidenciaPrivada", pjecalcImportacao.getJurosPrevidenciaPrivada());
        XMLExpScanProcessorUtils.escrever(sb, "valorPrincipal", pjecalcImportacao.getPagoPrincipal());
        XMLExpScanProcessorUtils.escrever(sb, "tipoRegistroCalculo", pjecalcImportacao.getTipoRegistroCalculo());
        XMLExpScanProcessorUtils.escreverMultas(sb, pjecalcImportacao);
        XMLExpScanProcessorUtils.escreverHonorarios(sb, pjecalcImportacao);
        sb.append("</dadosEstruturados>");
        return sb.toString();
    }

    private static void escreverDadosGPrec(StringBuilder sb, PJeCalcImportacao pjecalcImportacao) {
        DadosGPrec dadosGPrec = pjecalcImportacao.getDadosGPrec();
        sb.append("<gprec>");
        XMLExpScanProcessorUtils.escrever(sb, "dataCalculo", HelperDate.getInstance(dadosGPrec.getDataCalculo()).getCalendar().getTimeInMillis());
        XMLExpScanProcessorUtils.escrever(sb, "nomeBeneficiario", dadosGPrec.getNomeBeneficiario());
        XMLExpScanProcessorUtils.escrever(sb, "documentoFiscalBeneficiario", dadosGPrec.getDocumentoFiscalBeneficiario());
        XMLExpScanProcessorUtils.escrever(sb, "liquidoExequente", dadosGPrec.getExequenteLiquido());
        XMLExpScanProcessorUtils.escrever(sb, "inssBeneficiario", dadosGPrec.getInssBeneficiario());
        XMLExpScanProcessorUtils.escrever(sb, "inssExecutado", dadosGPrec.getInssExecutado());
        XMLExpScanProcessorUtils.escrever(sb, "impostoRenda", dadosGPrec.getImpostoRenda());
        XMLExpScanProcessorUtils.escrever(sb, "depositoFgts", dadosGPrec.getDepositoFgts());
        XMLExpScanProcessorUtils.escrever(sb, "custasJudiciais", dadosGPrec.getCustasJudiciais());
        XMLExpScanProcessorUtils.escreverHonorariosGPrec(sb, pjecalcImportacao);
        sb.append("</gprec>");
    }

    private static void escreverMultas(StringBuilder sb, PJeCalcImportacao pjecalcImportacao) {
        sb.append("<multas>");
        for (PJeCalcImportacaoMulta multa : pjecalcImportacao.getMultas()) {
            sb.append("<multa>");
            XMLExpScanProcessorUtils.escrever(sb, "descricao", multa.getDescricao());
            XMLExpScanProcessorUtils.escrever(sb, "docFiscalCredor", multa.getDocumentoFiscalCredor());
            XMLExpScanProcessorUtils.escrever(sb, "docFiscalDevedor", multa.getDocumentoFiscalDevedor());
            XMLExpScanProcessorUtils.escrever(sb, "nomeCredor", multa.getNomeCredor());
            XMLExpScanProcessorUtils.escrever(sb, "nomeDevedor", multa.getNomeDevedor());
            XMLExpScanProcessorUtils.escrever(sb, "valor", multa.getValor());
            sb.append("</multa>");
        }
        sb.append("</multas>");
    }

    private static void escreverHonorarios(StringBuilder sb, PJeCalcImportacao pjecalcImportacao) {
        sb.append("<honorarios>");
        for (PJeCalcImportacaoHonorario honorario : pjecalcImportacao.getHonorarios()) {
            sb.append("<honorario>");
            XMLExpScanProcessorUtils.escrever(sb, "descricao", honorario.getDescricao());
            XMLExpScanProcessorUtils.escrever(sb, "docFiscalCredor", honorario.getDocumentoFiscalCredor());
            XMLExpScanProcessorUtils.escrever(sb, "docFiscalDevedor", honorario.getDocumentoFiscalDevedor());
            XMLExpScanProcessorUtils.escrever(sb, "impostoRendaHonorario", honorario.getIrpfHonorario());
            XMLExpScanProcessorUtils.escrever(sb, "nomeCredor", honorario.getNomeCredor());
            XMLExpScanProcessorUtils.escrever(sb, "nomeDevedor", honorario.getNomeDevedor());
            XMLExpScanProcessorUtils.escrever(sb, "valor", honorario.getValor());
            sb.append("</honorario>");
        }
        sb.append("</honorarios>");
    }

    private static void escreverHonorariosGPrec(StringBuilder sb, PJeCalcImportacao pjecalcImportacao) {
        sb.append("<honorariosReclamante>");
        for (HonorarioGPrec honorario : pjecalcImportacao.getDadosGPrec().getHonorariosReclamante()) {
            sb.append("<honorario>");
            XMLExpScanProcessorUtils.escrever(sb, "nome", honorario.getNome());
            XMLExpScanProcessorUtils.escrever(sb, "documentoFiscal", honorario.getDocumentoFiscal());
            XMLExpScanProcessorUtils.escrever(sb, "valor", honorario.getValor());
            XMLExpScanProcessorUtils.escrever(sb, "impostoRenda", honorario.getImpostoRenda());
            XMLExpScanProcessorUtils.escrever(sb, "tipo", honorario.getTipo());
            sb.append("</honorario>");
        }
        sb.append("</honorariosReclamante>");
        sb.append("<honorariosReclamado>");
        for (HonorarioGPrec honorario : pjecalcImportacao.getDadosGPrec().getHonorariosReclamado()) {
            sb.append("<honorario>");
            XMLExpScanProcessorUtils.escrever(sb, "nome", honorario.getNome());
            XMLExpScanProcessorUtils.escrever(sb, "documentoFiscal", honorario.getDocumentoFiscal());
            XMLExpScanProcessorUtils.escrever(sb, "valor", honorario.getValor());
            XMLExpScanProcessorUtils.escrever(sb, "impostoRenda", honorario.getImpostoRenda());
            XMLExpScanProcessorUtils.escrever(sb, "tipo", honorario.getTipo());
            sb.append("</honorario>");
        }
        sb.append("</honorariosReclamado>");
    }

    private static void escrever(StringBuilder sb, String tag, Object valor) {
        sb.append('<');
        sb.append(tag);
        sb.append('>');
        sb.append(valor != null ? XMLExpScanProcessorUtils.escaparTexto(valor.toString()) : valor);
        sb.append("</");
        sb.append(tag);
        sb.append('>');
    }

    public static String escaparTexto(String text) {
        return StringEscapeUtils.escapeXml((String)text.replaceAll("[\\P{InBasic_Latin}&&\\P{InLatin-1Supplement}]", "\u00bf"));
    }
}

