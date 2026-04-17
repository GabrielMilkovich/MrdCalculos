/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.AttachmentImpl;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.Attachment;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.InfraException;
import br.jus.trt8.pjecalc.negocio.comum.scan.ScanProcessorEngine;
import br.jus.trt8.pjecalc.negocio.comum.scan.proc.XMLExpScanProcessor;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeArquivoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import java.io.StringWriter;
import java.nio.charset.Charset;

public class Exportador {
    public static String gerarNomeDoArquivo(Calculo calculo) {
        String numeroDoProcesso;
        StringBuilder sb = new StringBuilder();
        String string = numeroDoProcesso = Utils.naoNulo(calculo.getProcesso().getIdentificacao()) ? calculo.getProcesso().getIdentificacao().replaceAll("\\Q-\\E", "").replaceAll("\\Q.\\E", "") : "";
        if (numeroDoProcesso.length() == 20) {
            sb.append("PROCESSO_");
            sb.append(numeroDoProcesso);
            sb.append('_');
        }
        sb.append("CALCULO_");
        sb.append(calculo.getId());
        sb.append("_DATA_");
        sb.append(HelperDate.getInstance().format("ddMMyyyy"));
        sb.append("_HORA_");
        sb.append(HelperDate.getInstance().format("HHmmss"));
        sb.append('.');
        sb.append(TipoDeArquivoEnum.PJC.getExtensao());
        return sb.toString();
    }

    public static Attachment exportar(Calculo calculo, String nome) {
        return Exportador.exportar(calculo, nome, null);
    }

    public static Attachment exportar(Calculo calculo, String nome, PJeCalcImportacao pjecalcImportacao) {
        StringWriter writer = new StringWriter();
        XMLExpScanProcessor generator = new XMLExpScanProcessor(calculo, writer, pjecalcImportacao);
        ScanProcessorEngine engine = new ScanProcessorEngine(generator);
        try {
            engine.process();
            return new AttachmentImpl(nome, TipoDeArquivoEnum.PJC.getContentType(), ((Object)writer).toString().getBytes(Charset.forName("ISO-8859-1")));
        }
        catch (Exception e) {
            throw new InfraException(e, new MensagemDeRecurso(Mensagens.MSG0013, new Object[0]));
        }
    }
}

