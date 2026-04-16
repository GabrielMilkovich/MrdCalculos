/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.xml.bind.annotation.XmlRootElement
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.negocio.servicos.EnteFederacaoEnum;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import javax.xml.bind.annotation.XmlRootElement;
import org.codehaus.jackson.annotate.JsonAutoDetect;

@XmlRootElement
@JsonAutoDetect
public class AtualizacaoPrecatorioDTO
implements Serializable {
    private static final long serialVersionUID = 1L;
    private Date dataUltimaAtualizacaoCalculo;
    private Date dataExpedicaoPrecatorio;
    private Date dataFim;
    private BigDecimal principal;
    private BigDecimal juros;
    private BigDecimal outrosDebitosDoReclamado;
    private EnteFederacaoEnum ente = EnteFederacaoEnum.UNIAO;

    public AtualizacaoPrecatorioDTO() {
    }

    public AtualizacaoPrecatorioDTO(Date dataUltimaAtualizacaoCalculo, Date dataExpedicaoPrecatorio, Date dataFim, BigDecimal principal, BigDecimal juros, BigDecimal outrosDebitosDoReclamado, EnteFederacaoEnum ente) {
        this.dataUltimaAtualizacaoCalculo = dataUltimaAtualizacaoCalculo;
        this.dataExpedicaoPrecatorio = dataExpedicaoPrecatorio;
        this.dataFim = dataFim;
        this.principal = principal;
        this.juros = juros;
        this.outrosDebitosDoReclamado = outrosDebitosDoReclamado;
        this.ente = ente;
    }

    public Date getDataUltimaAtualizacaoCalculo() {
        return this.dataUltimaAtualizacaoCalculo;
    }

    public void setDataUltimaAtualizacaoCalculo(Date dataUltimaAtualizacaoCalculo) {
        this.dataUltimaAtualizacaoCalculo = dataUltimaAtualizacaoCalculo;
    }

    public Date getDataExpedicaoPrecatorio() {
        return this.dataExpedicaoPrecatorio;
    }

    public void setDataExpedicaoPrecatorio(Date dataExpedicaoPrecatorio) {
        this.dataExpedicaoPrecatorio = dataExpedicaoPrecatorio;
    }

    public Date getDataFim() {
        return this.dataFim;
    }

    public void setDataFim(Date dataFim) {
        this.dataFim = dataFim;
    }

    public BigDecimal getPrincipal() {
        return this.principal;
    }

    public void setPrincipal(BigDecimal principal) {
        this.principal = principal;
    }

    public BigDecimal getJuros() {
        return this.juros;
    }

    public void setJuros(BigDecimal juros) {
        this.juros = juros;
    }

    public BigDecimal getOutrosDebitosDoReclamado() {
        return this.outrosDebitosDoReclamado;
    }

    public void setOutrosDebitosDoReclamado(BigDecimal outrosDebitosDoReclamado) {
        this.outrosDebitosDoReclamado = outrosDebitosDoReclamado;
    }

    public EnteFederacaoEnum getEnte() {
        return this.ente;
    }

    public void setEnte(EnteFederacaoEnum ente) {
        this.ente = ente;
    }

    public static long getSerialversionuid() {
        return 1L;
    }
}

