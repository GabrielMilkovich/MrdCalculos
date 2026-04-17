/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.coeficienteufir;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.indices.coeficienteufir.CoeficienteUFIROptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.indices.coeficienteufir.RepositorioDeCoeficienteUFIR;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBCOEFICIENTEUFIR")
@Name(value="coeficienteUFIR")
public class CoeficienteUFIR
extends EntidadeBase {
    private static final long serialVersionUID = -636007533519564713L;
    @Id
    @Column(name="IIDCOEFICIENTEUFIR", nullable=false)
    private final Long id = null;
    @Column(name="DDTCOMPETENCIAINDICE", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date competencia;
    @Column(name="RVLINDICE", precision=19, scale=10)
    @NotNull
    private BigDecimal taxa;
    @Column(name="DDTINCLUSAOINDICE", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataCriacao;

    public CoeficienteUFIR() {
        super(RepositorioDeCoeficienteUFIR.class);
    }

    public Date getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    public BigDecimal getTaxa() {
        return this.taxa;
    }

    public void setTaxa(BigDecimal taxa) {
        this.taxa = taxa;
    }

    public Date getDataCriacao() {
        return this.dataCriacao;
    }

    public void setDataCriacao(Date dataCriacao) {
        this.dataCriacao = dataCriacao;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public static List<CoeficienteUFIR> obterTodos() {
        return CoeficienteUFIR.getRepositorio(RepositorioDeCoeficienteUFIR.class).obterTodos();
    }

    public static OptimizerListSearch<Competencia, CoeficienteUFIR> getListaDeCoeficientesUFIROtimizada() {
        return new CoeficienteUFIROptimizerListSearch().init((Collection<CoeficienteUFIR>)CoeficienteUFIR.obterTodos());
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.competencia == null ? 0 : this.competencia.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!super.equals(obj)) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        CoeficienteUFIR other = (CoeficienteUFIR)obj;
        return !(this.competencia == null ? other.competencia != null : !this.competencia.equals(other.competencia));
    }
}

