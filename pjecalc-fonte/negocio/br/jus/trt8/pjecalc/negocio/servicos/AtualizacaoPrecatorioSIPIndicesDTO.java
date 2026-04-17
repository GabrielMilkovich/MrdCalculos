/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.xml.bind.annotation.XmlRootElement
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonIgnoreProperties
 *  org.codehaus.jackson.annotate.JsonPropertyOrder
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.negocio.constantes.EsferaPrecatorioEnum;
import java.math.BigDecimal;
import java.util.Date;
import javax.xml.bind.annotation.XmlRootElement;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.annotate.JsonPropertyOrder;

@XmlRootElement
@JsonAutoDetect
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonPropertyOrder(value={"id", "esferaPrecatorio", "dataUltimaAtualizacao", "dataExpedicao", "dataFim", "indiceCorrecao", "taxaJuros"})
public class AtualizacaoPrecatorioSIPIndicesDTO {
    private String id;
    private EsferaPrecatorioEnum esferaPrecatorio;
    private Date dataUltimaAtualizacao;
    private Date dataExpedicao;
    private Date dataFim;
    private BigDecimal indiceCorrecao;
    private String criterioCorrecao;
    private BigDecimal taxaJuros;
    private String criterioJuros;

    public AtualizacaoPrecatorioSIPIndicesDTO() {
    }

    public AtualizacaoPrecatorioSIPIndicesDTO(AtualizacaoPrecatorioSIPIndicesDTO precatorio) {
        this.id = precatorio.getId();
        this.esferaPrecatorio = precatorio.getEsferaPrecatorio();
        this.dataUltimaAtualizacao = precatorio.getDataUltimaAtualizacao();
        this.dataExpedicao = precatorio.getDataExpedicao();
        this.dataFim = precatorio.getDataFim();
        this.indiceCorrecao = precatorio.getIndiceCorrecao();
        this.criterioCorrecao = precatorio.getCriterioCorrecao();
        this.taxaJuros = precatorio.getTaxaJuros();
        this.criterioJuros = precatorio.getCriterioJuros();
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public EsferaPrecatorioEnum getEsferaPrecatorio() {
        return this.esferaPrecatorio;
    }

    public void setEsferaPrecatorio(EsferaPrecatorioEnum esferaPrecatorio) {
        this.esferaPrecatorio = esferaPrecatorio;
    }

    public Date getDataUltimaAtualizacao() {
        return this.dataUltimaAtualizacao;
    }

    public void setDataUltimaAtualizacao(Date dataUltimaAtualizacao) {
        this.dataUltimaAtualizacao = dataUltimaAtualizacao;
    }

    public Date getDataExpedicao() {
        return this.dataExpedicao;
    }

    public void setDataExpedicao(Date dataExpedicao) {
        this.dataExpedicao = dataExpedicao;
    }

    public Date getDataFim() {
        return this.dataFim;
    }

    public void setDataFim(Date dataFim) {
        this.dataFim = dataFim;
    }

    public BigDecimal getIndiceCorrecao() {
        return this.indiceCorrecao;
    }

    public void setIndiceCorrecao(BigDecimal indiceCorrecao) {
        this.indiceCorrecao = indiceCorrecao;
    }

    public BigDecimal getTaxaJuros() {
        return this.taxaJuros;
    }

    public void setTaxaJuros(BigDecimal taxaJuros) {
        this.taxaJuros = taxaJuros;
    }

    public String getCriterioCorrecao() {
        return this.criterioCorrecao;
    }

    public void setCriterioCorrecao(String criterioCorrecao) {
        this.criterioCorrecao = criterioCorrecao;
    }

    public String getCriterioJuros() {
        return this.criterioJuros;
    }

    public void setCriterioJuros(String criterioJuros) {
        this.criterioJuros = criterioJuros;
    }
}

