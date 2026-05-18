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
public class PJeCalcImportacaoHonorario {
    protected String descricao;
    protected String documentoFiscalCredor;
    protected String documentoFiscalDevedor;
    protected Integer idPJeCalcImportacaoHonorario;
    protected Long idHonorarioPJeCalc;
    protected BigDecimal irpfHonorario;
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

    public Integer getIdPJeCalcImportacaoHonorario() {
        return this.idPJeCalcImportacaoHonorario;
    }

    public void setIdPJeCalcImportacaoHonorario(Integer value) {
        this.idPJeCalcImportacaoHonorario = value;
    }

    public BigDecimal getIrpfHonorario() {
        return this.irpfHonorario;
    }

    public void setIrpfHonorario(BigDecimal value) {
        this.irpfHonorario = value;
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

    public Long getIdHonorarioPJeCalc() {
        return this.idHonorarioPJeCalc;
    }

    public void setIdHonorarioPJeCalc(Long idHonorarioPJeCalc) {
        this.idHonorarioPJeCalc = idHonorarioPJeCalc;
    }
}

