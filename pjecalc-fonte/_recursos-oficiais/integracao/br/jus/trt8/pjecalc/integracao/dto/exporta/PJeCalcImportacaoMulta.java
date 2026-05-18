/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonIgnoreProperties
 *  org.codehaus.jackson.map.annotate.JsonSerialize
 *  org.codehaus.jackson.map.annotate.JsonSerialize$Inclusion
 */
package br.jus.trt8.pjecalc.integracao.dto.exporta;

import java.math.BigDecimal;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.map.annotate.JsonSerialize;

@JsonAutoDetect
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonSerialize(include=JsonSerialize.Inclusion.NON_NULL)
public class PJeCalcImportacaoMulta {
    protected String descricao;
    protected String documentoFiscalCredor;
    protected String documentoFiscalDevedor;
    protected Integer idPJeCalcImportacaoMulta;
    protected Long idMultaPJeCalc;
    protected String nomeCredor;
    protected String nomeDevedor;
    protected BigDecimal valor;

    public String getDescricao() {
        return this.descricao;
    }

    public void setDescricao(String value) {
        this.descricao = value;
    }

    public String getDocumentoFiscalCredor() {
        return this.documentoFiscalCredor;
    }

    public void setDocumentoFiscalCredor(String value) {
        this.documentoFiscalCredor = value;
    }

    public String getDocumentoFiscalDevedor() {
        return this.documentoFiscalDevedor;
    }

    public void setDocumentoFiscalDevedor(String value) {
        this.documentoFiscalDevedor = value;
    }

    public Integer getIdPJeCalcImportacaoMulta() {
        return this.idPJeCalcImportacaoMulta;
    }

    public void setIdPJeCalcImportacaoMulta(Integer value) {
        this.idPJeCalcImportacaoMulta = value;
    }

    public String getNomeCredor() {
        return this.nomeCredor;
    }

    public void setNomeCredor(String value) {
        this.nomeCredor = value;
    }

    public String getNomeDevedor() {
        return this.nomeDevedor;
    }

    public void setNomeDevedor(String value) {
        this.nomeDevedor = value;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal value) {
        this.valor = value;
    }

    public Long getIdMultaPJeCalc() {
        return this.idMultaPJeCalc;
    }

    public void setIdMultaPJeCalc(Long idMultaPJeCalc) {
        this.idMultaPJeCalc = idMultaPJeCalc;
    }
}

