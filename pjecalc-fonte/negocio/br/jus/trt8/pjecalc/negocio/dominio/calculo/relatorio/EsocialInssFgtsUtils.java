/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.Iterator;

public class EsocialInssFgtsUtils {
    protected static BigDecimal calcularValoresBaseFGTS(Iterator<OcorrenciaDeVerba> ocorrenciasDeVerba) {
        BigDecimal valorBaseFGTSCompetencia = BigDecimal.ZERO;
        while (Utils.naoNulo(ocorrenciasDeVerba) && ocorrenciasDeVerba.hasNext()) {
            BigDecimal base;
            OcorrenciaDeVerba ocorrenciaDeVerba = ocorrenciasDeVerba.next();
            if (Utils.nulo(ocorrenciaDeVerba) || Utils.nulo(base = ocorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias()) || !CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)ocorrenciaDeVerba.getCaracteristica())) continue;
            valorBaseFGTSCompetencia = Utils.somar(valorBaseFGTSCompetencia, Utils.zerarSeNegativo(base), valorBaseFGTSCompetencia);
        }
        return valorBaseFGTSCompetencia;
    }

    protected static BigDecimal[] calcularValoresBaseInss(Iterator<OcorrenciaDeVerba> ocorrenciasDeVerba) {
        BigDecimal valorBaseAvisoPrevioInss = BigDecimal.ZERO;
        BigDecimal valorBaseAvisoPrevioInssComIncidencia = BigDecimal.ZERO;
        while (Utils.naoNulo(ocorrenciasDeVerba) && ocorrenciasDeVerba.hasNext()) {
            BigDecimal base;
            OcorrenciaDeVerba ocorrenciaDeVerba = ocorrenciasDeVerba.next();
            if (Utils.nulo(ocorrenciaDeVerba) || Utils.nulo(base = ocorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias()) || !CaracteristicaDaVerbaEnum.AVISO_PREVIO.equals((Object)ocorrenciaDeVerba.getCaracteristica())) continue;
            valorBaseAvisoPrevioInss = Utils.somar(valorBaseAvisoPrevioInss, Utils.zerarSeNegativo(base), valorBaseAvisoPrevioInss);
            if (!ocorrenciaDeVerba.getVerbaDeCalculo().getIncidenciaINSS().booleanValue()) continue;
            valorBaseAvisoPrevioInssComIncidencia = Utils.somar(valorBaseAvisoPrevioInssComIncidencia, Utils.zerarSeNegativo(base), valorBaseAvisoPrevioInssComIncidencia);
        }
        return new BigDecimal[]{valorBaseAvisoPrevioInss, valorBaseAvisoPrevioInssComIncidencia};
    }

    protected static BigDecimal[] encontrarIndenizatorioInssFgts(Calculo calculo) {
        BigDecimal valorIndenizInss = BigDecimal.ZERO;
        BigDecimal valorIndenizFgts = BigDecimal.ZERO;
        for (VerbaDeCalculo verba : calculo.getVerbasAtivas()) {
            if (CaracteristicaDaVerbaEnum.FERIAS.equals((Object)verba.getCaracteristica()) && (verba.getIncidenciaFGTS().booleanValue() || verba.getIncidenciaINSS().booleanValue())) {
                for (OcorrenciaDeVerba ocorrencia : verba.getOcorrenciasAtivas()) {
                    BigDecimal parteIndenizatoria = Utils.subtrair(ocorrencia.getDiferenca(), ocorrencia.getDiferencaParaCalculoDasIncidencias(), ocorrencia.getDiferenca());
                    valorIndenizInss = Utils.somar(valorIndenizInss, verba.getIncidenciaINSS() != false ? parteIndenizatoria : BigDecimal.ZERO, valorIndenizInss);
                    valorIndenizFgts = Utils.somar(valorIndenizFgts, verba.getIncidenciaFGTS() != false ? parteIndenizatoria : BigDecimal.ZERO, valorIndenizFgts);
                }
            }
            if (!verba.getIncidenciaINSS().booleanValue() && !CaracteristicaDaVerbaEnum.AVISO_PREVIO.equals((Object)verba.getCaracteristica())) {
                valorIndenizInss = Utils.somar(valorIndenizInss, verba.getValorTotalDiferenca(), valorIndenizInss);
            }
            if (verba.getIncidenciaFGTS().booleanValue()) continue;
            valorIndenizFgts = Utils.somar(valorIndenizFgts, verba.getValorTotalDiferenca(), valorIndenizFgts);
        }
        return new BigDecimal[]{valorIndenizInss, valorIndenizFgts};
    }
}

