/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.io.FileUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.scan.ScanProcessorEngine;
import br.jus.trt8.pjecalc.negocio.comum.scan.proc.XMLImpScanProcessor;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import java.io.File;
import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Importador {
    private static final Logger LOGGER = LoggerFactory.getLogger(Importador.class);

    public static Calculo importar(byte[] dados) {
        try {
            File arquivo = File.createTempFile("PJC", null);
            FileUtils.writeByteArrayToFile((File)arquivo, (byte[])dados);
            XMLImpScanProcessor generator = new XMLImpScanProcessor(arquivo);
            ScanProcessorEngine engine = new ScanProcessorEngine(generator);
            engine.process();
            Calculo calculo = generator.getCalculo();
            return Importador.ajustar(calculo);
        }
        catch (Exception e) {
            LOGGER.error(e.getMessage(), (Throwable)e);
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0064, new Object[0]));
        }
    }

    private static Calculo ajustar(Calculo calculo) {
        if (Utils.naoNulo(calculo) && Utils.naoNulo(calculo.getParametrosDeAtualizacao()) && Utils.nulo(calculo.getParametrosDeAtualizacao().getAplicarJurosFasePreJudicial())) {
            calculo.getParametrosDeAtualizacao().setAplicarJurosFasePreJudicial(Boolean.FALSE);
        }
        return calculo;
    }
}

