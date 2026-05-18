/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.xml.bind.annotation.XmlElement
 *  javax.xml.bind.annotation.XmlSchemaType
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonIgnoreProperties
 *  org.codehaus.jackson.map.annotate.JsonSerialize
 *  org.codehaus.jackson.map.annotate.JsonSerialize$Inclusion
 */
package br.jus.trt8.pjecalc.integracao.dto.exporta;

import br.jus.trt8.pjecalc.integracao.dto.exporta.CustomDateSerializer;
import br.jus.trt8.pjecalc.integracao.dto.exporta.DadosGPrec;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacaoHonorario;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacaoMulta;
import br.jus.trt8.pjecalc.integracao.dto.exporta.TipoRegistroCalculoEnum;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlSchemaType;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.map.annotate.JsonSerialize;

@JsonAutoDetect
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonSerialize(include=JsonSerialize.Inclusion.NON_NULL)
public class PJeCalcImportacao
implements Serializable {
    private static final long serialVersionUID = 1L;
    protected Integer anoProcesso;
    protected BigDecimal contribuicaoSocialDezPorCento;
    protected BigDecimal contribuicaoSocialMeioPorCento;
    protected BigDecimal custasReclamado;
    protected BigDecimal custasReclamante;
    @XmlSchemaType(name="dateTime")
    protected Date dataHoraImportacao;
    @XmlSchemaType(name="dateTime")
    protected Date dataLiquidacao;
    protected BigDecimal debitoReclamantePensaoAlimenticia;
    protected BigDecimal debitoReclamantePrevidenciaPrivada;
    protected String documentoFiscalReclamado;
    protected String documentoFiscalReclamante;
    protected Integer dvProcesso;
    protected BigDecimal fgtsDepositoContaVinculada;
    @XmlElement(nillable=true)
    protected List<PJeCalcImportacaoHonorario> honorarios;
    protected Integer idPJeCalcImportacao;
    protected Long idPJeCalc;
    protected String hashPJeCalc;
    protected Integer idProcesso;
    protected BigDecimal impostoDeRenda;
    protected BigDecimal inssReclamado;
    protected BigDecimal inssReclamante;
    protected BigDecimal jurosDeMora;
    protected BigDecimal jurosPrevidenciaPrivada;
    @XmlElement(nillable=true)
    protected List<PJeCalcImportacaoMulta> multas;
    protected String nomeReclamado;
    protected String nomeReclamante;
    protected Integer numProcesso;
    protected Integer orgaoJustica;
    protected Integer origemProcesso;
    protected BigDecimal pagoPrincipal;
    protected Integer regional;
    protected byte[] relatorioHtmlCompactado;
    private String relatorioPDFbase64;
    protected byte[] calculoExportadoPjcCompactado;
    protected TipoRegistroCalculoEnum tipoRegistroCalculo;
    protected DadosGPrec dadosGPrec;

    public Integer getAnoProcesso() {
        return this.anoProcesso;
    }

    public void setAnoProcesso(Integer value) {
        this.anoProcesso = value;
    }

    public BigDecimal getContribuicaoSocialDezPorCento() {
        return this.contribuicaoSocialDezPorCento;
    }

    public void setContribuicaoSocialDezPorCento(BigDecimal value) {
        this.contribuicaoSocialDezPorCento = value;
    }

    public BigDecimal getContribuicaoSocialMeioPorCento() {
        return this.contribuicaoSocialMeioPorCento;
    }

    public void setContribuicaoSocialMeioPorCento(BigDecimal value) {
        this.contribuicaoSocialMeioPorCento = value;
    }

    public BigDecimal getCustasReclamado() {
        return this.custasReclamado;
    }

    public void setCustasReclamado(BigDecimal value) {
        this.custasReclamado = value;
    }

    public BigDecimal getCustasReclamante() {
        return this.custasReclamante;
    }

    public void setCustasReclamante(BigDecimal value) {
        this.custasReclamante = value;
    }

    public Date getDataHoraImportacao() {
        return this.dataHoraImportacao;
    }

    public void setDataHoraImportacao(Date value) {
        this.dataHoraImportacao = value;
    }

    @JsonSerialize(using=CustomDateSerializer.class)
    public Date getDataLiquidacao() {
        return this.dataLiquidacao;
    }

    public void setDataLiquidacao(Date value) {
        this.dataLiquidacao = value;
    }

    public BigDecimal getDebitoReclamantePensaoAlimenticia() {
        return this.debitoReclamantePensaoAlimenticia;
    }

    public void setDebitoReclamantePensaoAlimenticia(BigDecimal value) {
        this.debitoReclamantePensaoAlimenticia = value;
    }

    public BigDecimal getDebitoReclamantePrevidenciaPrivada() {
        return this.debitoReclamantePrevidenciaPrivada;
    }

    public void setDebitoReclamantePrevidenciaPrivada(BigDecimal value) {
        this.debitoReclamantePrevidenciaPrivada = value;
    }

    public String getDocumentoFiscalReclamado() {
        return this.documentoFiscalReclamado;
    }

    public void setDocumentoFiscalReclamado(String value) {
        this.documentoFiscalReclamado = value;
    }

    public String getDocumentoFiscalReclamante() {
        return this.documentoFiscalReclamante;
    }

    public void setDocumentoFiscalReclamante(String value) {
        this.documentoFiscalReclamante = value;
    }

    public Integer getDvProcesso() {
        return this.dvProcesso;
    }

    public void setDvProcesso(Integer value) {
        this.dvProcesso = value;
    }

    public BigDecimal getFgtsDepositoContaVinculada() {
        return this.fgtsDepositoContaVinculada;
    }

    public void setFgtsDepositoContaVinculada(BigDecimal value) {
        this.fgtsDepositoContaVinculada = value;
    }

    public List<PJeCalcImportacaoHonorario> getHonorarios() {
        if (this.honorarios == null) {
            this.honorarios = new ArrayList<PJeCalcImportacaoHonorario>();
        }
        return this.honorarios;
    }

    public Integer getIdPJeCalcImportacao() {
        return this.idPJeCalcImportacao;
    }

    public void setIdPJeCalcImportacao(Integer value) {
        this.idPJeCalcImportacao = value;
    }

    public Integer getIdProcesso() {
        return this.idProcesso;
    }

    public void setIdProcesso(Integer value) {
        this.idProcesso = value;
    }

    public BigDecimal getImpostoDeRenda() {
        return this.impostoDeRenda;
    }

    public void setImpostoDeRenda(BigDecimal value) {
        this.impostoDeRenda = value;
    }

    public BigDecimal getInssReclamado() {
        return this.inssReclamado;
    }

    public void setInssReclamado(BigDecimal value) {
        this.inssReclamado = value;
    }

    public BigDecimal getInssReclamante() {
        return this.inssReclamante;
    }

    public void setInssReclamante(BigDecimal value) {
        this.inssReclamante = value;
    }

    public BigDecimal getJurosDeMora() {
        return this.jurosDeMora;
    }

    public void setJurosDeMora(BigDecimal value) {
        this.jurosDeMora = value;
    }

    public BigDecimal getJurosPrevidenciaPrivada() {
        return this.jurosPrevidenciaPrivada;
    }

    public void setJurosPrevidenciaPrivada(BigDecimal value) {
        this.jurosPrevidenciaPrivada = value;
    }

    public List<PJeCalcImportacaoMulta> getMultas() {
        if (this.multas == null) {
            this.multas = new ArrayList<PJeCalcImportacaoMulta>();
        }
        return this.multas;
    }

    public String getNomeReclamado() {
        return this.nomeReclamado;
    }

    public void setNomeReclamado(String value) {
        this.nomeReclamado = value;
    }

    public String getNomeReclamante() {
        return this.nomeReclamante;
    }

    public void setNomeReclamante(String value) {
        this.nomeReclamante = value;
    }

    public Integer getNumProcesso() {
        return this.numProcesso;
    }

    public void setNumProcesso(Integer value) {
        this.numProcesso = value;
    }

    public Integer getOrgaoJustica() {
        return this.orgaoJustica;
    }

    public void setOrgaoJustica(Integer value) {
        this.orgaoJustica = value;
    }

    public Integer getOrigemProcesso() {
        return this.origemProcesso;
    }

    public void setOrigemProcesso(Integer value) {
        this.origemProcesso = value;
    }

    public BigDecimal getPagoPrincipal() {
        return this.pagoPrincipal;
    }

    public void setPagoPrincipal(BigDecimal value) {
        this.pagoPrincipal = value;
    }

    public Integer getRegional() {
        return this.regional;
    }

    public void setRegional(Integer value) {
        this.regional = value;
    }

    public byte[] getRelatorioHtmlCompactado() {
        return this.relatorioHtmlCompactado;
    }

    public void setRelatorioHtmlCompactado(byte[] value) {
        this.relatorioHtmlCompactado = value;
    }

    public String getRelatorioPDFbase64() {
        return this.relatorioPDFbase64;
    }

    public void setRelatorioPDFbase64(String relatorioPDFbase64) {
        this.relatorioPDFbase64 = relatorioPDFbase64;
    }

    public TipoRegistroCalculoEnum getTipoRegistroCalculo() {
        return this.tipoRegistroCalculo;
    }

    public void setTipoRegistroCalculo(TipoRegistroCalculoEnum value) {
        this.tipoRegistroCalculo = value;
    }

    public Long getIdPJeCalc() {
        return this.idPJeCalc;
    }

    public void setIdPJeCalc(Long idPJeCalc) {
        this.idPJeCalc = idPJeCalc;
    }

    public String getHashPJeCalc() {
        return this.hashPJeCalc;
    }

    public void setHashPJeCalc(String hashPJeCalc) {
        this.hashPJeCalc = hashPJeCalc;
    }

    public byte[] getCalculoExportadoPjcCompactado() {
        return this.calculoExportadoPjcCompactado;
    }

    public void setCalculoExportadoPjcCompactado(byte[] calculoExportadoPjcCompactado) {
        this.calculoExportadoPjcCompactado = calculoExportadoPjcCompactado;
    }

    public DadosGPrec getDadosGPrec() {
        return this.dadosGPrec;
    }

    public void setDadosGPrec(DadosGPrec dadosGPrec) {
        this.dadosGPrec = dadosGPrec;
    }
}

