/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.MappedSuperclass
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  org.hibernate.annotations.Type
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.TotalizadorOcorrenciaDeInssAtualizacao;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.MappedSuperclass;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import org.hibernate.annotations.Type;

@MappedSuperclass
public abstract class OcorrenciaDeInssAtualizacao
extends EntidadeBase
implements Comparable<OcorrenciaDeInssAtualizacao> {
    private static final long serialVersionUID = 963715969685692563L;
    @Temporal(value=TemporalType.DATE)
    @Column(name="DDTINICIAL", nullable=false)
    private Date dataInicioPeriodo;
    @Temporal(value=TemporalType.DATE)
    @Column(name="DDTFINAL", nullable=false)
    private Date dataTerminoPeriodo;
    @Temporal(value=TemporalType.DATE)
    @Column(name="DDTOCORRENCIAINSS", nullable=false)
    private Date dataOcorrenciaInss;
    @Temporal(value=TemporalType.DATE)
    @Column(name="DDTEVENTO", nullable=false)
    private Date dataEvento;
    @Column(name="RVLDEVIDO", precision=19, scale=2)
    private BigDecimal devido = BigDecimal.ZERO;
    @Column(name="RVLINDICECORRECAO", precision=38, scale=25)
    private BigDecimal indiceCorrecao = BigDecimal.ZERO;
    @Column(name="RVLDEVIDOCORRIGIDO", precision=19, scale=2)
    private BigDecimal devidoCorrigido = BigDecimal.ZERO;
    @Column(name="RVLJUROS", precision=19, scale=2)
    private BigDecimal juros = BigDecimal.ZERO;
    @Column(name="RVLMULTA", precision=19, scale=2)
    private BigDecimal multa = BigDecimal.ZERO;
    @Column(name="RVLTOTAL", precision=19, scale=2)
    private BigDecimal total = BigDecimal.ZERO;
    @Column(name="RVLPAGO", precision=19, scale=2)
    private BigDecimal pago = BigDecimal.ZERO;
    @Column(name="RVLDEVIDODIFERENCA", precision=19, scale=2)
    private BigDecimal devidoDiferenca = BigDecimal.ZERO;
    @Column(name="RVLJUROSDIFERENCA", precision=19, scale=2)
    private BigDecimal jurosDiferenca = BigDecimal.ZERO;
    @Column(name="RVLMULTADIFERENCA", precision=19, scale=2)
    private BigDecimal multaDiferenca = BigDecimal.ZERO;
    @Column(name="RVLTOTALDIFERENCA", precision=19, scale=2)
    private BigDecimal totalDiferenca = BigDecimal.ZERO;
    @Column(name="SFLOCORRENCIADECIMOTERCEIRO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean ocorrenciaDecimoTerceiro = Boolean.FALSE;
    @Transient
    private boolean amortizado = false;
    @Transient
    private boolean parcialmenteAmortizado = false;

    public OcorrenciaDeInssAtualizacao() {
    }

    @Transient
    public String getCompetenciaFormatada() {
        Competencia competencia = Competencia.getInstance(this.getDataOcorrenciaInss());
        return competencia.getMes() + 1 + "/" + competencia.getAno();
    }

    public OcorrenciaDeInssAtualizacao(Class<? extends RepositorioDeOcorrenciaDeInssAtualizacao<? extends OcorrenciaDeInssAtualizacao>> classeDoRepositorio) {
        super(classeDoRepositorio);
    }

    public static TotalizadorOcorrenciaDeInssAtualizacao getTotalizador(Collection<? extends OcorrenciaDeInssAtualizacao> ocorrencias) {
        return new TotalizadorOcorrenciaDeInssAtualizacao(ocorrencias);
    }

    @Override
    public int compareTo(OcorrenciaDeInssAtualizacao o) {
        return this.getDataOcorrenciaInss().compareTo(o.getDataOcorrenciaInss());
    }

    public Date getDataInicioPeriodo() {
        return this.dataInicioPeriodo;
    }

    public void setDataInicioPeriodo(Date dataInicioPeriodo) {
        this.dataInicioPeriodo = dataInicioPeriodo;
    }

    public Date getDataTerminoPeriodo() {
        return this.dataTerminoPeriodo;
    }

    public void setDataTerminoPeriodo(Date dataTerminoPeriodo) {
        this.dataTerminoPeriodo = dataTerminoPeriodo;
    }

    public Date getDataOcorrenciaInss() {
        return this.dataOcorrenciaInss;
    }

    public void setDataOcorrenciaInss(Date dataOcorrenciaInss) {
        this.dataOcorrenciaInss = dataOcorrenciaInss;
    }

    public Date getDataEvento() {
        return this.dataEvento;
    }

    public void setDataEvento(Date dataEvento) {
        this.dataEvento = dataEvento;
    }

    public BigDecimal getDevido() {
        return this.devido;
    }

    public void setDevido(BigDecimal devido) {
        this.devido = devido;
    }

    public BigDecimal getIndiceCorrecao() {
        return this.indiceCorrecao;
    }

    public void setIndiceCorrecao(BigDecimal indiceCorrecao) {
        this.indiceCorrecao = indiceCorrecao;
    }

    public BigDecimal getDevidoCorrigido() {
        return this.devidoCorrigido;
    }

    public void setDevidoCorrigido(BigDecimal devidoCorrigido) {
        this.devidoCorrigido = devidoCorrigido;
    }

    public BigDecimal getJuros() {
        return this.juros;
    }

    public void setJuros(BigDecimal juros) {
        this.juros = juros;
    }

    public BigDecimal getMulta() {
        return this.multa;
    }

    public void setMulta(BigDecimal multa) {
        this.multa = multa;
    }

    public BigDecimal getTotal() {
        return this.total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public BigDecimal getPago() {
        return this.pago;
    }

    public void setPago(BigDecimal pago) {
        this.pago = pago;
    }

    public BigDecimal getDevidoDiferenca() {
        return this.devidoDiferenca;
    }

    public void setDevidoDiferenca(BigDecimal devidoDiferenca) {
        this.devidoDiferenca = devidoDiferenca;
    }

    public BigDecimal getJurosDiferenca() {
        return this.jurosDiferenca;
    }

    public void setJurosDiferenca(BigDecimal jurosDiferenca) {
        this.jurosDiferenca = jurosDiferenca;
    }

    public BigDecimal getMultaDiferenca() {
        return this.multaDiferenca;
    }

    public void setMultaDiferenca(BigDecimal multaDiferenca) {
        this.multaDiferenca = multaDiferenca;
    }

    public BigDecimal getTotalDiferenca() {
        return this.totalDiferenca;
    }

    public void setTotalDiferenca(BigDecimal totalDiferenca) {
        this.totalDiferenca = totalDiferenca;
    }

    public boolean isAmortizado() {
        return this.amortizado;
    }

    public void setAmortizado(boolean amortizado) {
        this.amortizado = amortizado;
    }

    public boolean isParcialmenteAmortizado() {
        return this.parcialmenteAmortizado;
    }

    public void setParcialmenteAmortizado(boolean parcialmenteAmortizado) {
        this.parcialmenteAmortizado = parcialmenteAmortizado;
    }

    public Boolean getOcorrenciaDecimoTerceiro() {
        return this.ocorrenciaDecimoTerceiro;
    }

    public void setOcorrenciaDecimoTerceiro(Boolean ocorrenciaDecimoTerceiro) {
        this.ocorrenciaDecimoTerceiro = ocorrenciaDecimoTerceiro;
    }
}

