/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.integracao.dto.exporta;

import br.jus.trt8.pjecalc.integracao.dto.exporta.HonorarioGPrec;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

public class DadosGPrec
implements Serializable {
    private static final long serialVersionUID = -5156478761581901668L;
    protected Date dataCalculo;
    protected String nomeBeneficiario;
    protected String documentoFiscalBeneficiario;
    protected BigDecimal exequenteLiquido;
    protected BigDecimal inssBeneficiario;
    protected BigDecimal inssExecutado;
    protected BigDecimal impostoRenda;
    protected BigDecimal depositoFgts;
    protected BigDecimal custasJudiciais;
    protected List<HonorarioGPrec> honorariosReclamante;
    protected List<HonorarioGPrec> honorariosReclamado;

    public Date getDataCalculo() {
        return this.dataCalculo;
    }

    public void setDataCalculo(Date dataCalculo) {
        this.dataCalculo = dataCalculo;
    }

    public String getNomeBeneficiario() {
        return this.nomeBeneficiario;
    }

    public void setNomeBeneficiario(String nomeBeneficiario) {
        this.nomeBeneficiario = nomeBeneficiario;
    }

    public String getDocumentoFiscalBeneficiario() {
        return this.documentoFiscalBeneficiario;
    }

    public void setDocumentoFiscalBeneficiario(String documentoFiscalBeneficiario) {
        this.documentoFiscalBeneficiario = documentoFiscalBeneficiario;
    }

    public BigDecimal getExequenteLiquido() {
        return this.exequenteLiquido;
    }

    public void setExequenteLiquido(BigDecimal exequenteLiquido) {
        this.exequenteLiquido = exequenteLiquido;
    }

    public BigDecimal getInssBeneficiario() {
        return this.inssBeneficiario;
    }

    public void setInssBeneficiario(BigDecimal inssBeneficiario) {
        this.inssBeneficiario = inssBeneficiario;
    }

    public BigDecimal getInssExecutado() {
        return this.inssExecutado;
    }

    public void setInssExecutado(BigDecimal inssExecutado) {
        this.inssExecutado = inssExecutado;
    }

    public BigDecimal getImpostoRenda() {
        return this.impostoRenda;
    }

    public void setImpostoRenda(BigDecimal impostoRenda) {
        this.impostoRenda = impostoRenda;
    }

    public BigDecimal getDepositoFgts() {
        return this.depositoFgts;
    }

    public void setDepositoFgts(BigDecimal depositoFgts) {
        this.depositoFgts = depositoFgts;
    }

    public BigDecimal getCustasJudiciais() {
        return this.custasJudiciais;
    }

    public void setCustasJudiciais(BigDecimal custasJudiciais) {
        this.custasJudiciais = custasJudiciais;
    }

    public List<HonorarioGPrec> getHonorariosReclamante() {
        return this.honorariosReclamante;
    }

    public void setHonorariosReclamante(List<HonorarioGPrec> honorariosReclamante) {
        this.honorariosReclamante = honorariosReclamante;
    }

    public List<HonorarioGPrec> getHonorariosReclamado() {
        return this.honorariosReclamado;
    }

    public void setHonorariosReclamado(List<HonorarioGPrec> honorariosReclamado) {
        this.honorariosReclamado = honorariosReclamado;
    }
}

