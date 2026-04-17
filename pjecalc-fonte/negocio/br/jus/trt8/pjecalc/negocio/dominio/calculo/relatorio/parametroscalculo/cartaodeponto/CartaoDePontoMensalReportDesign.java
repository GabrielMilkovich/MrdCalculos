/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.JRBand
 *  net.sf.jasperreports.engine.JRConditionalStyle
 *  net.sf.jasperreports.engine.JRException
 *  net.sf.jasperreports.engine.JRExpression
 *  net.sf.jasperreports.engine.JRField
 *  net.sf.jasperreports.engine.JRStyle
 *  net.sf.jasperreports.engine.design.JRDesignBand
 *  net.sf.jasperreports.engine.design.JRDesignConditionalStyle
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
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto;

import java.awt.Color;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import net.sf.jasperreports.engine.JRBand;
import net.sf.jasperreports.engine.JRConditionalStyle;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JRExpression;
import net.sf.jasperreports.engine.JRField;
import net.sf.jasperreports.engine.JRStyle;
import net.sf.jasperreports.engine.design.JRDesignBand;
import net.sf.jasperreports.engine.design.JRDesignConditionalStyle;
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

public class CartaoDePontoMensalReportDesign {
    private static final String HEADER_STYLE = "headerStyle";
    private static final String CELL_STYLE = "cellStyle";
    private static final String ZEBRA_CELL_STYLE = "zebraCellStyle";
    private static final String FIELD_COMPETENCIA = "competencia";
    private static final String FIELD_VALOR = "valor";
    private JRDesignStyle headerStyle;
    private JRDesignStyle cellStyle;
    private JRDesignStyle zebraCellStyle;
    private JasperDesign jasperDesign;
    private static final String COR_PRETA = "#000000";
    private static final String COR_CINZA = "#CCCCCC";
    private static final String COR_ZEBRA = "#E9E9E9";
    private static final String FONT_NAME = "SansSerif";
    private static final int MAX_WIDTH = 802;
    private static final int MAXIMO_COLUNAS = 18;
    private static final int QTD_COLUNAS_FIXAS = 1;
    private static final int WIDTH_COLUNA_FIXA = 70;
    private static final int HEIGHT_COLUNA_PADRAO = 14;
    private static final int HEIGHT_COLUNA_MEDIO = 28;
    private static final int HEIGHT_COLUNA_GRANDE = 42;
    private static final int FONT_SIZE_PADRAO = 8;
    private static final int CELL_PADDING = 2;
    private boolean possuiMuitasColunas = false;

    public JasperDesign getDesign(List<String> textosColunas) throws JRException {
        this.possuiMuitasColunas = textosColunas.size() > 18;
        this.jasperDesign = new JasperDesign();
        this.jasperDesign.addStyle((JRStyle)this.getDefaultStyle());
        this.jasperDesign.addStyle((JRStyle)this.getHeaderStyle());
        this.jasperDesign.addStyle((JRStyle)this.getCellStyle());
        this.jasperDesign.addStyle((JRStyle)this.getZebraCellStyle());
        this.configurarPage(this.jasperDesign);
        this.adicionarField(FIELD_COMPETENCIA, String.class, this.jasperDesign);
        for (int i = 1; i <= textosColunas.size() - 1; ++i) {
            this.adicionarField(FIELD_VALOR + i, BigDecimal.class, this.jasperDesign);
        }
        JRDesignBand jrDesignband = null;
        JRDesignStaticText staticText = null;
        this.configurarTitle(this.jasperDesign);
        jrDesignband = new JRDesignBand();
        jrDesignband.setHeight(0);
        this.jasperDesign.setPageHeader((JRBand)jrDesignband);
        int[] tamanhos = this.configurarColumnHeader(textosColunas);
        this.configurarDetalhesColunas(textosColunas, tamanhos);
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

    private void configurarDetalhesColunas(List<String> textosColunas, int[] tamanhos) {
        int linha = 1;
        int qtdLinhas = this.calcularQuantidadeDeLinhasPorRegistro(textosColunas.size(), tamanhos[0]);
        JRDesignBand jrDesignband = new JRDesignBand();
        int xPosicao = 0;
        jrDesignband.setHeight(14 * qtdLinhas);
        for (int i = 0; i < textosColunas.size(); ++i) {
            boolean ultimaColunaDaUltimaLinha;
            boolean primeiraColuna = i == 0;
            boolean colunaFixa = i < 1;
            boolean bl = ultimaColunaDaUltimaLinha = i == textosColunas.size() - 1;
            boolean ultimaColuna = this.possuiMuitasColunas ? tamanhos[1] + xPosicao >= 802 : ultimaColunaDaUltimaLinha;
            int width = tamanhos[0];
            if (ultimaColuna) {
                width = tamanhos[1];
            }
            if (ultimaColunaDaUltimaLinha) {
                width = 802 - xPosicao;
            }
            if (colunaFixa) {
                width = 70;
            }
            JRDesignTextField textField = new JRDesignTextField();
            textField.setX(xPosicao);
            textField.setY(14 * (linha - 1));
            textField.setWidth(width);
            textField.setHeight(primeiraColuna ? 14 * qtdLinhas : 14);
            textField.setHorizontalAlignment(HorizontalAlignEnum.CENTER);
            textField.setVerticalAlignment(VerticalAlignEnum.MIDDLE);
            textField.setBlankWhenNull(true);
            textField.setPositionType(PositionTypeEnum.FLOAT);
            textField.setStretchType(StretchTypeEnum.RELATIVE_TO_BAND_HEIGHT);
            textField.setStretchWithOverflow(true);
            textField.setMode(ModeEnum.OPAQUE);
            textField.setStyle((JRStyle)this.getZebraCellStyle());
            JRDesignExpression expression = new JRDesignExpression();
            expression.setValueClass(String.class);
            if (primeiraColuna) {
                expression.setText("$F{competencia}");
            } else {
                expression.setText("br.jus.trt8.pjecalc.base.comum.Utils.formatarValor($F{valor" + i + "})");
            }
            if ((xPosicao += width) >= 802) {
                xPosicao = 70;
            }
            if (ultimaColuna) {
                ++linha;
            }
            textField.setExpression((JRExpression)expression);
            jrDesignband.addElement((JRDesignElement)textField);
        }
        ((JRDesignSection)this.jasperDesign.getDetailSection()).addBand((JRBand)jrDesignband);
    }

    private int[] configurarColumnHeader(List<String> textosColunas) {
        int[] tamanhos = this.getTamanhosColunas(textosColunas.size(), this.jasperDesign.getColumnWidth());
        int COLUMN_HEIGHT = tamanhos[0] > 200 ? 14 : (tamanhos[0] > 100 ? 28 : 42);
        JRDesignBand jrDesignband = new JRDesignBand();
        this.jasperDesign.setColumnHeader((JRBand)jrDesignband);
        JRDesignStaticText staticText = new JRDesignStaticText();
        staticText.setX(0);
        staticText.setY(0);
        staticText.setWidth(802);
        staticText.setHeight(14);
        staticText.setText("OCORR\u00caNCIAS DO CART\u00c3O DE PONTO MENSAL");
        staticText.setHorizontalAlignment(HorizontalAlignEnum.CENTER);
        staticText.setVerticalAlignment(VerticalAlignEnum.MIDDLE);
        staticText.setMode(ModeEnum.OPAQUE);
        staticText.setStyleNameReference(HEADER_STYLE);
        jrDesignband.addElement((JRDesignElement)staticText);
        int xPosicao = 0;
        JRDesignExpression textFieldExpression = null;
        int linha = 1;
        int qtdLinhas = this.calcularQuantidadeDeLinhasPorRegistro(textosColunas.size(), tamanhos[0]);
        jrDesignband.setHeight(COLUMN_HEIGHT * (1 + qtdLinhas) - (COLUMN_HEIGHT - 14));
        for (int i = 0; i < textosColunas.size(); ++i) {
            boolean ultimaColuna;
            boolean ultimaColunaDaUltimaLinha;
            int width = tamanhos[0];
            boolean colunaFixa = i < 1;
            boolean bl = ultimaColunaDaUltimaLinha = i == textosColunas.size() - 1;
            boolean bl2 = this.possuiMuitasColunas ? tamanhos[1] + xPosicao >= 802 : (ultimaColuna = ultimaColunaDaUltimaLinha);
            if (ultimaColuna) {
                width = tamanhos[1];
            }
            if (ultimaColunaDaUltimaLinha) {
                width = 802 - xPosicao;
            }
            if (colunaFixa) {
                width = 70;
            }
            JRDesignTextField textField = new JRDesignTextField();
            textField.setX(xPosicao);
            textField.setY(COLUMN_HEIGHT * linha - (COLUMN_HEIGHT - 14));
            textField.setWidth(width);
            textField.setHeight(colunaFixa ? COLUMN_HEIGHT * qtdLinhas : COLUMN_HEIGHT);
            textField.setMode(ModeEnum.OPAQUE);
            textField.setPositionType(PositionTypeEnum.FLOAT);
            textField.setStretchType(StretchTypeEnum.RELATIVE_TO_BAND_HEIGHT);
            textField.setStretchWithOverflow(false);
            textField.setHorizontalAlignment(HorizontalAlignEnum.CENTER);
            textField.setVerticalAlignment(VerticalAlignEnum.MIDDLE);
            textFieldExpression = new JRDesignExpression();
            textFieldExpression.setValueClass(String.class);
            String text = textosColunas.get(i).replaceAll("[\"]", "\\\\\"");
            textFieldExpression.setText(" new java.lang.String(\"" + text + "\")");
            textFieldExpression.setId(JRExpression.NOT_USED_ID.intValue());
            textField.setExpression((JRExpression)textFieldExpression);
            textField.setBold(true);
            textField.setStyleNameReference(HEADER_STYLE);
            jrDesignband.addElement((JRDesignElement)textField);
            if ((xPosicao += width) >= 802) {
                xPosicao = 70;
            }
            if (!ultimaColuna) continue;
            ++linha;
        }
        return tamanhos;
    }

    private int calcularQuantidadeDeLinhasPorRegistro(int registros, int colWidth) {
        int descontar = 70;
        double qtdDinamica = (double)(802 - descontar) / (double)colWidth;
        double value = (double)(registros - 1) / qtdDinamica;
        return BigDecimal.valueOf(value).setScale(0, RoundingMode.UP).intValue();
    }

    private void configurarTitle(JasperDesign jasperDesign) {
        JRDesignBand band = new JRDesignBand();
        band.setHeight(22);
        JRDesignStaticText staticText = new JRDesignStaticText();
        staticText.setX(0);
        staticText.setY(5);
        staticText.setWidth(802);
        staticText.setHeight(17);
        staticText.setFontName(FONT_NAME);
        staticText.setForecolor(Color.BLACK);
        staticText.setHorizontalAlignment(HorizontalAlignEnum.CENTER);
        staticText.setFontSize(12);
        staticText.setPdfFontName("Helvetica");
        staticText.setBold(true);
        staticText.setText("Cart\u00e3o de Ponto Mensal");
        band.addElement((JRDesignElement)staticText);
        jasperDesign.setTitle((JRBand)band);
    }

    private void adicionarField(String name, Class clazz, JasperDesign jasperDesign) throws JRException {
        JRDesignField field = new JRDesignField();
        field.setName(name);
        field.setValueClass(clazz);
        jasperDesign.addField((JRField)field);
    }

    private void configurarPage(JasperDesign jasperDesign) {
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

    private int[] getTamanhosColunas(int numeroColunas, int espacoTotal) {
        if (this.possuiMuitasColunas) {
            int testePar = 2;
            numeroColunas = 18 + (numeroColunas % 2 > 0 ? 1 : 0);
        }
        int descontarColunasFixas = 70;
        Double tamanhoColuna = (double)(espacoTotal - descontarColunasFixas) / (double)(numeroColunas - 1);
        int soma = 0;
        for (int i = 0; i < numeroColunas - 1; ++i) {
            soma += tamanhoColuna.intValue();
        }
        int tamanhoUltimaColuna = tamanhoColuna.intValue() + (espacoTotal - (soma + descontarColunasFixas));
        return new int[]{tamanhoColuna.intValue(), tamanhoUltimaColuna};
    }

    private JRDesignStyle getHeaderStyle() {
        if (this.headerStyle == null) {
            this.headerStyle = new JRDesignStyle();
            this.headerStyle.setName(HEADER_STYLE);
            this.headerStyle.setDefault(false);
            this.headerStyle.setForecolor(Color.decode(COR_PRETA));
            this.headerStyle.setBackcolor(Color.decode(COR_CINZA));
            this.headerStyle.setFill(FillEnum.SOLID);
            this.headerStyle.setFontName(FONT_NAME);
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
            this.cellStyle.setName(CELL_STYLE);
            this.cellStyle.setDefault(false);
            this.cellStyle.setForecolor(Color.decode(COR_PRETA));
            this.cellStyle.setBackcolor(Color.decode(COR_CINZA));
            this.cellStyle.setFill(FillEnum.SOLID);
            this.cellStyle.setFontName(FONT_NAME);
            this.cellStyle.setFontSize(8);
            this.cellStyle.setBold(true);
            this.cellStyle.setItalic(false);
            this.cellStyle.setUnderline(false);
            this.cellStyle.setStrikeThrough(false);
            this.cellStyle.getLineBox().getPen().setLineWidth(1.0f);
            this.cellStyle.getLineBox().getPen().setLineColor(Color.BLACK);
            this.cellStyle.getLineBox().setLeftPadding(2);
            this.cellStyle.getLineBox().setRightPadding(2);
            this.cellStyle.setMode(ModeEnum.TRANSPARENT);
        }
        return this.cellStyle;
    }

    private JRDesignStyle getZebraCellStyle() {
        if (this.zebraCellStyle == null) {
            this.zebraCellStyle = new JRDesignStyle();
            this.zebraCellStyle.setName(ZEBRA_CELL_STYLE);
            this.zebraCellStyle.setDefault(false);
            this.zebraCellStyle.setForecolor(Color.decode(COR_PRETA));
            this.zebraCellStyle.setFill(FillEnum.SOLID);
            this.zebraCellStyle.setFontName(FONT_NAME);
            this.zebraCellStyle.setFontSize(8);
            this.zebraCellStyle.setBold(true);
            this.zebraCellStyle.setItalic(false);
            this.zebraCellStyle.setUnderline(false);
            this.zebraCellStyle.setStrikeThrough(false);
            this.zebraCellStyle.getLineBox().getPen().setLineWidth(1.0f);
            this.zebraCellStyle.getLineBox().getPen().setLineColor(Color.BLACK);
            this.zebraCellStyle.getLineBox().setLeftPadding(2);
            this.zebraCellStyle.getLineBox().setRightPadding(2);
            JRDesignConditionalStyle conditionalStyle = new JRDesignConditionalStyle();
            conditionalStyle.setBackcolor(Color.decode(COR_ZEBRA));
            JRDesignExpression expression = new JRDesignExpression();
            expression.setValueClass(Boolean.class);
            expression.setText("$V{REPORT_COUNT} % 2 == 0");
            conditionalStyle.setConditionExpression((JRExpression)expression);
            this.zebraCellStyle.addConditionalStyle((JRConditionalStyle)conditionalStyle);
        }
        return this.zebraCellStyle;
    }

    private JRDesignStyle getDefaultStyle() {
        JRDesignStyle defaultStyle = new JRDesignStyle();
        defaultStyle.setName("defaultStyle");
        defaultStyle.setDefault(true);
        defaultStyle.setForecolor(Color.decode(COR_PRETA));
        defaultStyle.setFill(FillEnum.SOLID);
        defaultStyle.setFontName(FONT_NAME);
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

