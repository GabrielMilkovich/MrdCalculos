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
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.ValeTransporte;
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
@Table(name="TBVALETRANSPORTEVERBA")
@SequenceGenerator(name="SQVALETRANSPORTEVERBA", sequenceName="SQVALETRANSPORTEVERBA", allocationSize=1)
@Name(value="valeTransporteDaVerba")
public class ValeTransporteDaVerba
extends EntidadeAgregada {
    private static final long serialVersionUID = -2128255217420866158L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVALETRANSPORTEVERBA")
    @Column(name="IIDVALETRANSPORTEVERBA")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDVERBACALCULO")
    private VerbaDeCalculo verbaDeCalculo;
    @OneToOne
    @JoinColumn(name="IIDVALETRANSPORTE")
    private ValeTransporte valeTransporte;
    @Column(name="STPVINCULO", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoVinculoDeVerbaEnum")})
    private TipoVinculoDeVerbaEnum tipoVinculoHistorico = TipoVinculoDeVerbaEnum.BASE;

    public ValeTransporteDaVerba() {
    }

    public ValeTransporteDaVerba(VerbaDeCalculo verbaDeCalculo, ValeTransporte valeTransporte, TipoVinculoDeVerbaEnum tipoVinculoHistorico) {
        this();
        this.verbaDeCalculo = verbaDeCalculo;
        this.valeTransporte = valeTransporte;
        this.tipoVinculoHistorico = tipoVinculoHistorico;
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

    public ValeTransporte getValeTransporte() {
        return this.valeTransporte;
    }

    public void setValeTransporte(ValeTransporte valeTransporte) {
        this.valeTransporte = valeTransporte;
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
        ValeTransporteDaVerba other = (ValeTransporteDaVerba)obj;
        if (this.valeTransporte == null ? other.valeTransporte != null : !this.valeTransporte.equals(other.valeTransporte)) {
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

