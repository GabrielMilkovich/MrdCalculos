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
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.EntidadeAgregada;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.AbrangenciaDoFeriadoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.Feriado;
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
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@SequenceGenerator(name="SQPONTOFACULTATIVOCALCULO", sequenceName="SQPONTOFACULTATIVOCALCULO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Table(name="TBPONTOFACULTATIVOCALCULO")
@Name(value="itemPontoFacultativo")
public class ItemPontoFacultativo
extends EntidadeAgregada {
    private static final long serialVersionUID = 5276073478153207866L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPONTOFACULTATIVOCALCULO")
    @Column(name="IIDPONTOFACULTATIVOCALCULO")
    private final Long id = null;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDFERIADO")
    private Feriado pontoFacultativo;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;

    public ItemPontoFacultativo() {
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public ItemPontoFacultativo(Calculo calculo) {
        this();
        this.calculo = calculo;
    }

    public ItemPontoFacultativo(Calculo calculo, Feriado pontoFacultativo) {
        this(calculo);
        this.pontoFacultativo = pontoFacultativo;
    }

    @Override
    public ItemPontoFacultativo validar() {
        if (Utils.nulo(this.pontoFacultativo)) {
            throw new NegocioException(new MensagemDeRecurso("pontoFacultativo", Mensagens.MSG0003, "Ponto Facultativo"));
        }
        return this;
    }

    public ItemPontoFacultativo(Feriado pontoFacultativo) {
        this.pontoFacultativo = pontoFacultativo;
    }

    public Long getId() {
        return this.id;
    }

    public Feriado getPontoFacultativo() {
        return this.pontoFacultativo;
    }

    public void setPontoFacultativo(Feriado pontoFacultativo) {
        this.pontoFacultativo = pontoFacultativo;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public String getNomeFeriado() {
        if (this.pontoFacultativo == null) {
            return "";
        }
        return this.pontoFacultativo.getNomeFeriado();
    }

    public AbrangenciaDoFeriadoEnum getAbrangencia() {
        if (this.pontoFacultativo == null) {
            return null;
        }
        return this.pontoFacultativo.getAbrangencia();
    }

    @Override
    public int hashCode() {
        return this.getHashCodeBuilder().append((Object)this.pontoFacultativo).hashCode();
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
        return this.getEqualsBuilder(obj).append((Object)this.pontoFacultativo.getId(), (Object)((ItemPontoFacultativo)obj).getPontoFacultativo().getId()).isEquals();
    }
}

