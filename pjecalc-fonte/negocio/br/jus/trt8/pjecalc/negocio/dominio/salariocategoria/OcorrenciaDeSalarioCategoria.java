/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
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
 *  org.apache.commons.lang.builder.EqualsBuilder
 *  org.apache.commons.lang.builder.HashCodeBuilder
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariocategoria;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.RepositorioDeOcorrenciaDoSalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.SalarioCategoria;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
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
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBOCORRENCIASALARIOCATEGORIA")
@SequenceGenerator(name="SQOCORRENCIASALARIOCATEGORIA", sequenceName="SQOCORRENCIASALARIOCATEGORIA", allocationSize=1)
@Name(value="ocorrenciaDeSalarioCategoria")
public class OcorrenciaDeSalarioCategoria
extends EntidadeBase
implements Serializable,
Comparable<OcorrenciaDeSalarioCategoria> {
    private static final long serialVersionUID = -3327854733985546361L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIASALARIOCATEGORIA")
    @Column(name="IIDOCORRENCIASALARIOCATEGORIA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne
    @JoinColumn(name="IIDSALARIOCATEGORIA")
    private SalarioCategoria salarioCategoria;
    @Column(name="DDTOCORRENCIA")
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataOcorrencia;
    @Column(name="MVLOCORRENCIA", precision=12, scale=2)
    @NotNull
    private BigDecimal valor;

    public OcorrenciaDeSalarioCategoria() {
        super(RepositorioDeOcorrenciaDoSalarioCategoria.class);
    }

    public OcorrenciaDeSalarioCategoria(SalarioCategoria salarioCategoria, Date dataOcorrencia, BigDecimal valor) {
        super(RepositorioDeOcorrenciaDoSalarioCategoria.class);
        this.salarioCategoria = salarioCategoria;
        this.dataOcorrencia = dataOcorrencia;
        this.valor = valor;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public SalarioCategoria getSalarioCategoria() {
        return this.salarioCategoria;
    }

    public void setSalarioCategoria(SalarioCategoria salarioCategoria) {
        this.salarioCategoria = salarioCategoria;
    }

    public Date getDataOcorrencia() {
        return this.dataOcorrencia;
    }

    public void setDataOcorrencia(Date dataOcorrencia) {
        this.dataOcorrencia = dataOcorrencia;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public static void remover(OcorrenciaDeSalarioCategoria ocorrenciaDoHistoricoSalarial) {
        if (Utils.naoNulo(ocorrenciaDoHistoricoSalarial.getId())) {
            OcorrenciaDeSalarioCategoria.remover(RepositorioDeOcorrenciaDoSalarioCategoria.class, ocorrenciaDoHistoricoSalarial, Boolean.TRUE);
        }
    }

    @Override
    public int compareTo(OcorrenciaDeSalarioCategoria o) {
        return this.dataOcorrencia.compareTo(o.getDataOcorrencia());
    }

    @Override
    public int hashCode() {
        if (this.obterChavePrimaria() == null) {
            return super.hashCode();
        }
        if (this.salarioCategoria.isGerandoConsulta()) {
            return new HashCodeBuilder(1, 31).append((Object)this.dataOcorrencia).hashCode();
        }
        return new HashCodeBuilder(1, 31).append(this.obterChavePrimaria()).append((Object)this.dataOcorrencia).hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        OcorrenciaDeSalarioCategoria other = (OcorrenciaDeSalarioCategoria)obj;
        if (this.obterChavePrimaria() == null) {
            return this == other;
        }
        if (this.salarioCategoria.isGerandoConsulta()) {
            return new EqualsBuilder().append((Object)this.dataOcorrencia, (Object)other.dataOcorrencia).isEquals();
        }
        return new EqualsBuilder().append(this.obterChavePrimaria(), other.obterChavePrimaria()).append((Object)this.dataOcorrencia, (Object)other.dataOcorrencia).isEquals();
    }
}

