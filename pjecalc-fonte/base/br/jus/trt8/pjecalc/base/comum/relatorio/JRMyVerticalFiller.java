/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.JRException
 *  net.sf.jasperreports.engine.JasperReport
 *  net.sf.jasperreports.engine.fill.JRPrintBand
 *  net.sf.jasperreports.engine.fill.JRVerticalFiller
 */
package br.jus.trt8.pjecalc.base.comum.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRFillerBand;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.fill.JRPrintBand;
import net.sf.jasperreports.engine.fill.JRVerticalFiller;

public class JRMyVerticalFiller
extends JRVerticalFiller {
    protected JRMyVerticalFiller(JasperReport jasperReport) throws JRException {
        super(jasperReport);
    }

    protected void fillBand(JRPrintBand printBand) {
        super.fillBand(printBand);
        JRFillerBand.fillBand(printBand);
    }
}

