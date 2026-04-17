/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.fill.JRPrintBand
 *  net.sf.jasperreports.engine.fill.JRTemplatePrintElement
 *  net.sf.jasperreports.engine.fill.JRTemplatePrintFrame
 */
package br.jus.trt8.pjecalc.base.comum.relatorio;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import net.sf.jasperreports.engine.fill.JRPrintBand;
import net.sf.jasperreports.engine.fill.JRTemplatePrintElement;
import net.sf.jasperreports.engine.fill.JRTemplatePrintFrame;

public class JRFillerBand {
    private static final String RESIZE = "resize";

    public static void fillBand(JRPrintBand printBand) {
        for (Object obj1 : printBand.getElements()) {
            JRTemplatePrintFrame frame;
            if (!(obj1 instanceof JRTemplatePrintFrame) || !RESIZE.equals((frame = (JRTemplatePrintFrame)obj1).getKey())) continue;
            int total = 0;
            ArrayList<JRTemplatePrintElement> elements = new ArrayList<JRTemplatePrintElement>();
            for (Object obj2 : frame.getElements()) {
                JRTemplatePrintElement element = (JRTemplatePrintElement)obj2;
                total += element.getWidth();
                elements.add(element);
            }
            Collections.sort(elements, new Comparator<JRTemplatePrintElement>(){

                @Override
                public int compare(JRTemplatePrintElement o1, JRTemplatePrintElement o2) {
                    return o1.getX() - o2.getX();
                }
            });
            if (total <= 0) continue;
            int div = (frame.getWidth() - total) / elements.size();
            int rest = (frame.getWidth() - total) % elements.size();
            int left = 0;
            for (JRTemplatePrintElement element : elements) {
                element.setX(left);
                element.setWidth(element.getWidth() + div);
                left += element.getWidth();
            }
            JRTemplatePrintElement element = (JRTemplatePrintElement)elements.get(elements.size() - 1);
            element.setWidth(element.getWidth() + rest);
        }
    }
}

