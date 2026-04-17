/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.JRBand
 *  net.sf.jasperreports.engine.JRException
 *  net.sf.jasperreports.engine.JRExpression
 *  net.sf.jasperreports.engine.JRField
 *  net.sf.jasperreports.engine.JRStyle
 *  net.sf.jasperreports.engine.design.JRDesignBand
 *  net.sf.jasperreports.engine.design.JRDesignElement
 *  net.sf.jasperreports.engine.design.JRDesignExpression
 *  net.sf.jasperreports.engine.design.JRDesignField
 *  net.sf.jasperreports.engine.design.JRDesignSection
 *  net.sf.jasperreports.engine.design.JRDesignStaticText
 *  net.sf.jasperreports.engine.design.JRDesignStyle
 *  net.sf.jasperreports.engine.design.JRDesignTextField
 *  net.sf.jasperreports.engine.design.JasperDesign
 *  net.sf.jasperreports.engine.type.FillEnum
 *  net.sf.jasperreports.engine.type.HorizontalAlignEnum
 *  net.sf.jasperreports.engine.type.ModeEnum
 *  net.sf.jasperreports.engine.type.OrientationEnum
 *  net.sf.jasperreports.engine.type.PositionTypeEnum
 *  net.sf.jasperreports.engine.type.StretchTypeEnum
 *  net.sf.jasperreports.engine.type.VerticalAlignEnum
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.historicosalarial;

import java.awt.Color;
import java.math.BigDecimal;
import java.util.List;
import net.sf.jasperreports.engine.JRBand;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JRExpression;
import net.sf.jasperreports.engine.JRField;
import net.sf.jasperreports.engine.JRStyle;
import net.sf.jasperreports.engine.design.JRDesignBand;
import net.sf.jasperreports.engine.design.JRDesignElement;
import net.sf.jasperreports.engine.design.JRDesignExpression;
import net.sf.jasperreports.engine.design.JRDesignField;
import net.sf.jasperreports.engine.design.JRDesignSection;
import net.sf.jasperreports.engine.design.JRDesignStaticText;
import net.sf.jasperreports.engine.design.JRDesignStyle;
import net.sf.jasperreports.engine.design.JRDesignTextField;
import net.sf.jasperreports.engine.design.JasperDesign;
import net.sf.jasperreports.engine.type.FillEnum;
import net.sf.jasperreports.engine.type.HorizontalAlignEnum;
import net.sf.jasperreports.engine.type.ModeEnum;
import net.sf.jasperreports.engine.type.OrientationEnum;
import net.sf.jasperreports.engine.type.PositionTypeEnum;
import net.sf.jasperreports.engine.type.StretchTypeEnum;
import net.sf.jasperreports.engine.type.VerticalAlignEnum;

public class HistoricoSalarialReportDesign {
    private static final String FIELD_COMPETENCIA = "competencia";
    private static final String FIELD_VALOR = "valor";
    private JRDesignStyle headerStyle;
    private JRDesignStyle cellStyle;
    private JasperDesign jasperDesign;

    public JasperDesign getDesign(List<String> textosColunas) throws JRException {
        this.jasperDesign = new JasperDesign();
        this.jasperDesign.addStyle((JRStyle)this.getDefaultStyle());
        this.jasperDesign.addStyle((JRStyle)this.getHeaderStyle());
        this.jasperDesign.addStyle((JRStyle)this.getCellStyle());
        this.configPage(this.jasperDesign);
        this.addField(FIELD_COMPETENCIA, String.class, this.jasperDesign);
        for (int i = 1; i <= textosColunas.size() - 1; ++i) {
            this.addField(FIELD_VALOR + i, BigDecimal.class, this.jasperDesign);
        }
        JRDesignBand jrDesignband = null;
        JRDesignStaticText staticText = null;
        JRDesignTextField textField = null;
        this.configTitle(this.jasperDesign);
        jrDesignband = new JRDesignBand();
        jrDesignband.setHeight(0);
        this.jasperDesign.setPageHeader((JRBand)jrDesignband);
        jrDesignband = new JRDesignBand();
        jrDesignband.setHeight(28);
        this.jasperDesign.setColumnHeader((JRBand)jrDesignband);
        staticText = new JRDesignStaticText();
        staticText.setX(0);
        staticText.setY(0);
        staticText.setWidth(802);
        staticText.setHeight(14);
        staticText.setText("OCORR\u00caNCIAS DO HIST\u00d3RICO SALARIAL");
        staticText.setHorizontalAlignment(HorizontalAlignEnum.CENTER);
        staticText.setVerticalAlignment(VerticalAlignEnum.MIDDLE);
        staticText.setMode(ModeEnum.OPAQUE);
        staticText.setStyleNameReference("headerStyle");
        jrDesignband.addElement((JRDesignElement)staticText);
        int[] tamanhos = this.tamanhosColunas(textosColunas.size(), this.jasperDesign.getColumnWidth());
        int xPosicao = 0;
        int width = tamanhos[0];
        JRDesignExpression textFieldExpression = null;
        for (int i = 1; i <= textosColunas.size(); ++i) {
            if (i == textosColunas.size()) {
                width = tamanhos[1];
            }
            textField = new JRDesignTextField();
            textField.setX(xPosicao);
            textField.setY(14);
            textField.setWidth(width);
            textField.setHeight(14);
            textField.setMode(ModeEnum.OPAQUE);
            textField.setPositionType(PositionTypeEnum.FLOAT);
            textField.setStretchType(StretchTypeEnum.RELATIVE_TO_BAND_HEIGHT);
            textField.setStretchWithOverflow(true);
            textField.setHorizontalAlignment(HorizontalAlignEnum.CENTER);
            textField.setVerticalAlignment(VerticalAlignEnum.MIDDLE);
            textFieldExpression = new JRDesignExpression();
            textFieldExpression.setValueClass(String.class);
            String text = textosColunas.get(i - 1).replaceAll("[\"]", "\\\\\"");
            textFieldExpression.setText(" new java.lang.String(\"" + text + "\")");
            textFieldExpression.setId(JRExpression.NOT_USED_ID.intValue());
            textField.setExpression((JRExpression)textFieldExpression);
            textField.setBold(true);
            textField.setStyleNameReference("headerStyle");
            jrDesignband.addElement((JRDesignElement)textField);
            xPosicao += tamanhos[0];
        }
        jrDesignband = new JRDesignBand();
        jrDesignband.setHeight(14);
        JRDesignExpression expression = null;
        xPosicao = 0;
        width = tamanhos[0];
        for (int i = 1; i <= textosColunas.size(); ++i) {
            if (i == textosColunas.size()) {
                width = tamanhos[1];
            }
            textField = new JRDesignTextField();
            textField.setBlankWhenNull(false);
            textField.setForecolor(Color.decode("#000000"));
            textField.setBackcolor(Color.decode("#CCCCCC"));
            textField.setX(xPosicao);
            textField.setY(0);
            textField.setWidth(width);
            textField.setHeight(14);
            textField.setHorizontalAlignment(HorizontalAlignEnum.CENTER);
            textField.setVerticalAlignment(VerticalAlignEnum.MIDDLE);
            textField.setBlankWhenNull(true);
            textField.setPositionType(PositionTypeEnum.FLOAT);
            textField.setStretchType(StretchTypeEnum.RELATIVE_TO_BAND_HEIGHT);
            textField.setStretchWithOverflow(true);
            textField.setStyleNameReference("cellStyle");
            expression = new JRDesignExpression();
            expression.setValueClass(String.class);
            if (i == 1) {
                expression.setText("$F{competencia}");
            } else {
                expression.setText("br.jus.trt8.pjecalc.base.comum.Utils.formatarValor($F{valor" + (i - 1) + "})");
            }
            textField.setExpression((JRExpression)expression);
            jrDesignband.addElement((JRDesignElement)textField);
            xPosicao += tamanhos[0];
        }
        ((JRDesignSection)this.jasperDesign.getDetailSection()).addBand((JRBand)jrDesignband);
        jrDesignband = new JRDesignBand();
        jrDesignband.setHeight(0);
        this.jasperDesign.setColumnFooter((JRBand)jrDesignband);
        jrDesignband = new JRDesignBand();
        jrDesignband.setHeight(0);
        this.jasperDesign.setPageFooter((JRBand)jrDesignband);
        jrDesignband = new JRDesignBand();
        jrDesignband.setHeight(20);
        staticText = new JRDesignStaticText();
        staticText.setX(10);
        staticText.setY(5);
        staticText.setWidth(64);
        staticText.setHeight(15);
        staticText.setText("N\u00e3o h\u00e1 registros cadastrados.");
        staticText.setHorizontalAlignment(HorizontalAlignEnum.CENTER);
        jrDesignband.addElement((JRDesignElement)staticText);
        this.jasperDesign.setNoData((JRBand)jrDesignband);
        jrDesignband = new JRDesignBand();
        jrDesignband.setHeight(0);
        this.jasperDesign.setSummary((JRBand)jrDesignband);
        return this.jasperDesign;
    }

    private void configTitle(JasperDesign jasperDesign) {
        JRDesignBand band = new JRDesignBand();
        band.setHeight(22);
        JRDesignStaticText staticText = new JRDesignStaticText();
        staticText.setX(0);
        staticText.setY(5);
        staticText.setWidth(802);
        staticText.setHeight(17);
        staticText.setFontName("SansSerif");
        staticText.setForecolor(Color.BLACK);
        staticText.setHorizontalAlignment(HorizontalAlignEnum.CENTER);
        staticText.setFontSize(12);
        staticText.setPdfFontName("Helvetica");
        staticText.setBold(true);
        staticText.setText("Hist\u00f3rico Salarial");
        band.addElement((JRDesignElement)staticText);
        jasperDesign.setTitle((JRBand)band);
    }

    private void addField(String name, Class clazz, JasperDesign jasperDesign) throws JRException {
        JRDesignField field = new JRDesignField();
        field.setName(name);
        field.setValueClass(clazz);
        jasperDesign.addField((JRField)field);
    }

    private void configPage(JasperDesign jasperDesign) {
        jasperDesign.setOrientation(OrientationEnum.LANDSCAPE);
        jasperDesign.setPageWidth(842);
        jasperDesign.setPageHeight(595);
        jasperDesign.setColumnCount(1);
        jasperDesign.setColumnWidth(802);
        jasperDesign.setColumnSpacing(0);
        jasperDesign.setLeftMargin(20);
        jasperDesign.setRightMargin(20);
        jasperDesign.setBottomMargin(0);
        jasperDesign.setTopMargin(0);
        jasperDesign.setName("historicoSalarial");
    }

    private int[] tamanhosColunas(int numeroColunas, int espacoTotal) {
        Double tamanhoColuna = (double)espacoTotal / (double)numeroColunas;
        int soma = 0;
        for (int i = 0; i < numeroColunas; ++i) {
            soma += tamanhoColuna.intValue();
        }
        int tamanhoUltimaColuna = tamanhoColuna.intValue() + (espacoTotal - soma);
        return new int[]{tamanhoColuna.intValue(), tamanhoUltimaColuna};
    }

    private JRDesignStyle getHeaderStyle() {
        if (this.headerStyle == null) {
            this.headerStyle = new JRDesignStyle();
            this.headerStyle.setName("headerStyle");
            this.headerStyle.setDefault(false);
            this.headerStyle.setForecolor(Color.decode("#000000"));
            this.headerStyle.setBackcolor(Color.decode("#CCCCCC"));
            this.headerStyle.setFill(FillEnum.SOLID);
            this.headerStyle.setFontName("SansSerif");
            this.headerStyle.setFontSize(8);
            this.headerStyle.setBold(true);
            this.headerStyle.setItalic(false);
            this.headerStyle.setUnderline(false);
            this.headerStyle.setStrikeThrough(false);
            this.headerStyle.getLineBox().getPen().setLineWidth(1.0f);
            this.headerStyle.getLineBox().getPen().setLineColor(Color.BLACK);
        }
        return this.headerStyle;
    }

    private JRDesignStyle getCellStyle() {
        if (this.cellStyle == null) {
            this.cellStyle = new JRDesignStyle();
            this.cellStyle.setName("cellStyle");
            this.cellStyle.setDefault(false);
            this.cellStyle.setForecolor(Color.decode("#000000"));
            this.cellStyle.setBackcolor(Color.decode("#CCCCCC"));
            this.cellStyle.setFill(FillEnum.SOLID);
            this.cellStyle.setFontName("SansSerif");
            this.cellStyle.setFontSize(8);
            this.cellStyle.setBold(true);
            this.cellStyle.setItalic(false);
            this.cellStyle.setUnderline(false);
            this.cellStyle.setStrikeThrough(false);
            this.cellStyle.getLineBox().getPen().setLineWidth(1.0f);
            this.cellStyle.getLineBox().getPen().setLineColor(Color.BLACK);
            this.cellStyle.getLineBox().setLeftPadding(2);
            this.cellStyle.getLineBox().setRightPadding(2);
        }
        return this.cellStyle;
    }

    private JRDesignStyle getDefaultStyle() {
        JRDesignStyle defaultStyle = new JRDesignStyle();
        defaultStyle.setName("defaultStyle");
        defaultStyle.setDefault(true);
        defaultStyle.setForecolor(Color.decode("#000000"));
        defaultStyle.setFill(FillEnum.SOLID);
        defaultStyle.setFontName("SansSerif");
        defaultStyle.setFontSize(10);
        defaultStyle.setItalic(false);
        defaultStyle.setUnderline(false);
        defaultStyle.setStrikeThrough(false);
        defaultStyle.setPdfFontName("Helvetica");
        defaultStyle.setPdfEncoding("Cp1252");
        defaultStyle.setPdfEmbedded(false);
        defaultStyle.setBlankWhenNull(true);
        return defaultStyle;
    }
}

