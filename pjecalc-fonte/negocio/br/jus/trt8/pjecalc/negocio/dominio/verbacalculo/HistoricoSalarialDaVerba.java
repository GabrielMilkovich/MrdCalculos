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
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.negocio.comum.EntidadeAgregada;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBVINCULOHISTORICOVERBA")
@SequenceGenerator(name="SQVINCULOHISTORICOSALARIAL", sequenceName="SQVINCULOHISTORICOSALARIAL", allocationSize=1)
@Name(value="historicoSalarialDaVerba")
public class HistoricoSalarialDaVerba
extends EntidadeAgregada {
    private static final long serialVersionUID = 4466529296239033805L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVINCULOHISTORICOSALARIAL")
    @Column(name="IIDVINCULOHISTORICOVERBA")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDVERBACALCULO")
    private VerbaDeCalculo verbaDeCalculo;
    @OneToOne
    @JoinColumn(name="IIDHISTORICOSALARIAL")
    private HistoricoSalarial historicoSalarial;
    @Column(name="STPVINCULO", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoVinculoDeVerbaEnum")})
    private TipoVinculoDeVerbaEnum tipoVinculoHistorico = TipoVinculoDeVerbaEnum.BASE;
    @Column(name="SFLPROPORCIONALIDADE", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarProporcionalidade = false;

    public HistoricoSalarialDaVerba() {
    }

    public HistoricoSalarialDaVerba(VerbaDeCalculo verbaDeCalculo, HistoricoSalarial historicoSalarial, TipoVinculoDeVerbaEnum tipoVinculoHistorico, Boolean aplicarProporcionalidade) {
        this();
        this.verbaDeCalculo = verbaDeCalculo;
        this.historicoSalarial = historicoSalarial;
        this.tipoVinculoHistorico = tipoVinculoHistorico;
        this.aplicarProporcionalidade = aplicarProporcionalidade;
    }

    public Boolean getAplicarProporcionalidade() {
        return this.aplicarProporcionalidade;
    }

    public void setAplicarProporcionalidade(Boolean aplicarProporcionalidade) {
        this.aplicarProporcionalidade = aplicarProporcionalidade;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public VerbaDeCalculo getVerbaDeCalculo() {
        return this.verbaDeCalculo;
    }

    public void setVerbaDeCalculo(VerbaDeCalculo verbaDeCalculo) {
        this.verbaDeCalculo = verbaDeCalculo;
    }

    public HistoricoSalarial getHistoricoSalarial() {
        return this.historicoSalarial;
    }

    public void setHistoricoSalarial(HistoricoSalarial historicoSalarial) {
        this.historicoSalarial = historicoSalarial;
    }

    public TipoVinculoDeVerbaEnum getTipoVinculoHistorico() {
        return this.tipoVinculoHistorico;
    }

    public void setTipoVinculoHistorico(TipoVinculoDeVerbaEnum tipoVinculoHistorico) {
        this.tipoVinculoHistorico = tipoVinculoHistorico;
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        return result;
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
        HistoricoSalarialDaVerba other = (HistoricoSalarialDaVerba)obj;
        if (this.historicoSalarial == null ? other.historicoSalarial != null : !this.historicoSalarial.equals(other.historicoSalarial)) {
            return false;
        }
        if (this.id == null ? other.id != null : !this.id.equals(other.id)) {
            return false;
        }
        if (this.tipoVinculoHistorico != other.tipoVinculoHistorico) {
            return false;
        }
        return !(this.verbaDeCalculo == null ? other.verbaDeCalculo != null : !this.verbaDeCalculo.equals(other.verbaDeCalculo));
    }
}

