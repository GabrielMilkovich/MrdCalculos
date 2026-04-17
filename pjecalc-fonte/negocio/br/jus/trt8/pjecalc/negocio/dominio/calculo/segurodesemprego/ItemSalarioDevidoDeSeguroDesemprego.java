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
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.EntidadeAgregada;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego;
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
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@SequenceGenerator(name="SQVERBASEGURODESEMPREGO", sequenceName="SQVERBASEGURODESEMPREGO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Table(name="TBVERBASEGURODESEMPREGO")
@Name(value="itemSalarioDevidoDeSeguroDesemprego")
public class ItemSalarioDevidoDeSeguroDesemprego
extends EntidadeAgregada {
    private static final long serialVersionUID = 6691688628439355893L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVERBASEGURODESEMPREGO")
    @Column(name="IIDVERBASEGURODESEMPREGO")
    private final Long id = null;
    @Column(name="SFLINTEGRALIZAR", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="LogicoEnum")})
    @NotNull
    private LogicoEnum integralizar = LogicoEnum.NAO;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDVERBACALCULO")
    private VerbaDeCalculo verbaDeCalculo;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDSEGURODESEMPREGO")
    private SeguroDesemprego seguroDesemprego;

    public ItemSalarioDevidoDeSeguroDesemprego() {
    }

    public ItemSalarioDevidoDeSeguroDesemprego(SeguroDesemprego seguroDesemprego) {
        this();
        this.seguroDesemprego = seguroDesemprego;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public ItemSalarioDevidoDeSeguroDesemprego validar() {
        if (Utils.nulo(this.verbaDeCalculo)) {
            throw new NegocioException(new MensagemDeRecurso("verba", Mensagens.MSG0003, "Verba"));
        }
        return this;
    }

    public LogicoEnum getIntegralizar() {
        return this.integralizar;
    }

    public void setIntegralizar(LogicoEnum integralizar) {
        this.integralizar = integralizar;
    }

    public VerbaDeCalculo getVerbaDeCalculo() {
        return this.verbaDeCalculo;
    }

    public void setVerbaDeCalculo(VerbaDeCalculo verbaDeCalculo) {
        this.verbaDeCalculo = verbaDeCalculo;
    }

    public SeguroDesemprego getSeguroDesemprego() {
        return this.seguroDesemprego;
    }

    public void setSeguroDesemprego(SeguroDesemprego seguroDesemprego) {
        this.seguroDesemprego = seguroDesemprego;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public int hashCode() {
        return this.getHashCodeBuilder().append((Object)this.verbaDeCalculo.getId()).append((Object)this.getIntegralizar()).hashCode();
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
        return this.getEqualsBuilder(obj).append((Object)this.verbaDeCalculo.getId(), (Object)((ItemSalarioDevidoDeSeguroDesemprego)obj).getVerbaDeCalculo().getId()).append((Object)this.integralizar, (Object)((ItemSalarioDevidoDeSeguroDesemprego)obj).getIntegralizar()).isEquals();
    }
}

