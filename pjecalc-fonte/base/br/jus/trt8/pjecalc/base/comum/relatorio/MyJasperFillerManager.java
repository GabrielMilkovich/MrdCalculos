/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.JRDataSource
 *  net.sf.jasperreports.engine.JRException
 *  net.sf.jasperreports.engine.JasperPrint
 *  net.sf.jasperreports.engine.JasperReport
 *  net.sf.jasperreports.engine.fill.JRBaseFiller
 *  net.sf.jasperreports.engine.fill.JRFillInterruptedException
 */
package br.jus.trt8.pjecalc.base.comum.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRMyHorizontalFiller;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRMyVerticalFiller;
import java.util.Map;
import net.sf.jasperreports.engine.JRDataSource;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.fill.JRBaseFiller;
import net.sf.jasperreports.engine.fill.JRFillInterruptedException;

public class MyJasperFillerManager {
    public static JRBaseFiller createFiller(JasperReport jasperReport) throws JRException {
        Object filler = null;
        switch (jasperReport.getPrintOrderValue()) {
            case HORIZONTAL: {
                filler = new JRMyHorizontalFiller(jasperReport);
                break;
            }
            case VERTICAL: {
                filler = new JRMyVerticalFiller(jasperReport);
            }
        }
        return filler;
    }

    public static JasperPrint fillReport(JasperReport jasperReport, Map<?, ?> parameters, JRDataSource dataSource) throws JRException {
        JRBaseFiller filler = MyJasperFillerManager.createFiller(jasperReport);
        JasperPrint jasperPrint = null;
        try {
            jasperPrint = filler.fill(parameters, dataSource);
        }
        catch (JRFillInterruptedException e) {
            throw new JRException("The report filling thread was interrupted.", (Throwable)e);
        }
        return jasperPrint;
    }
}

