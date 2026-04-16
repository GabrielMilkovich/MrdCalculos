/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.valetransporte;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.RepositorioDeValorValeTransporte;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.ValeTransporte;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBOCORRENCIAVALETRANSPORTE")
@SequenceGenerator(name="SQOCORRENCIAVALETRANSPORTE", sequenceName="SQOCORRENCIAVALETRANSPORTE", allocationSize=1)
@Name(value="valorValeTransporte")
public class ValorValeTransporte
extends EntidadeBase
implements Comparable<ValorValeTransporte> {
    private static final long serialVersionUID = -8035856989084459090L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAVALETRANSPORTE")
    @Column(name="IIDOCORRENCIAVALETRANSPORTE")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDVALETRANSPORTE")
    private ValeTransporte valeTransporte;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="DDTINICIOVIGENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @LimitedTo100Years
    @Required
    private Date dataInicio;
    @Column(name="DDTFIMVIGENCIA")
    @Temporal(value=TemporalType.DATE)
    private Date dataTermino;
    @Column(name="MVLVALETRANSPORTE", precision=19, scale=2, nullable=false)
    @Required
    private BigDecimal valor;

    public ValorValeTransporte() {
        super(RepositorioDeValorValeTransporte.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public ValeTransporte getValeTransporte() {
        return this.valeTransporte;
    }

    public void setValeTransporte(ValeTransporte valeTransporte) {
        this.valeTransporte = valeTransporte;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Date getDataInicio() {
        return this.dataInicio;
    }

    public void setDataInicio(Date dataInicio) {
        this.dataInicio = dataInicio;
    }

    public Date getDataTermino() {
        return this.dataTermino;
    }

    public void setDataTermino(Date dataTermino) {
        this.dataTermino = dataTermino;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    @Override
    public ValorValeTransporte validar() {
        GerenciadorDeValidadores.getInstance().validar(ValorValeTransporte.class, this);
        return this;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    @Override
    public int compareTo(ValorValeTransporte o) {
        return o.getDataInicio().compareTo(this.dataInicio);
    }
}

