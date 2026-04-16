/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.DiscriminatorColumn
 *  javax.persistence.DiscriminatorType
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Inheritance
 *  javax.persistence.InheritanceType
 *  javax.persistence.JoinColumn
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Version
 */
package br.jus.trt8.pjecalc.negocio.dominio.formula;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.formula.RepositorioDeFormula;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ValorPago;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.DiscriminatorColumn;
import javax.persistence.DiscriminatorType;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Inheritance;
import javax.persistence.InheritanceType;
import javax.persistence.JoinColumn;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Version;

@Entity
@Table(name="TBFORMULA")
@SequenceGenerator(name="SQFORMULA", sequenceName="SQFORMULA", allocationSize=1)
@Inheritance(strategy=InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name="STPDISCRIMINADOR", discriminatorType=DiscriminatorType.STRING)
public abstract class Formula
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = 852363756277062079L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQFORMULA")
    @Column(name="IIDFORMULA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(mappedBy="formula")
    private VerbaDeCalculo verbaDeCalculo;
    @OneToOne(fetch=FetchType.EAGER, cascade={CascadeType.ALL})
    @JoinColumn(name="IIDVALORPAGO")
    private ValorPago valorPago = new ValorPago();

    public Formula() {
        super(RepositorioDeFormula.class);
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

    public Long getId() {
        return this.id;
    }

    public VerbaDeCalculo getVerbaDeCalculo() {
        return this.verbaDeCalculo;
    }

    public void setVerbaDeCalculo(VerbaDeCalculo verbaDeCalculo) {
        this.verbaDeCalculo = verbaDeCalculo;
    }

    public ValorPago getValorPago() {
        return this.valorPago;
    }

    public void setValorPago(ValorPago valorPago) {
        this.valorPago = valorPago;
    }

    private Formula consitirValorPago() {
        if (Utils.naoNulo(this.valorPago)) {
            this.valorPago.consistir();
        }
        return this;
    }

    public Formula consistir() {
        return this.consitirValorPago();
    }
}

