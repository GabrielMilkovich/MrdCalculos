/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
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
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import javax.persistence.CascadeType;
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

@Entity
@SequenceGenerator(name="SQITEMBASEVERBA", sequenceName="SQITEMBASEVERBA", allocationSize=1)
@Table(name="TBITEMBASEVERBA")
public class ItemBaseVerba
implements Serializable {
    private static final long serialVersionUID = 5390533235001128217L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQITEMBASEVERBA")
    @Column(name="IIDITEMBASEVERBA")
    private final Long id = null;
    @Column(name="SFLINTEGRALIZAR", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="LogicoEnum")})
    @NotNull
    private LogicoEnum integralizar = LogicoEnum.NAO;
    @OneToOne(fetch=FetchType.EAGER, cascade={CascadeType.MERGE, CascadeType.PERSIST, CascadeType.REFRESH})
    @JoinColumn(name="IIDVERBACALCULO")
    private VerbaDeCalculo verbaDeCalculo;
    @ManyToOne
    @JoinColumn(name="IIDFORMULA")
    private FormulaReflexo formula;

    public ItemBaseVerba() {
    }

    public ItemBaseVerba(VerbaDeCalculo verbaDeCalculo, LogicoEnum integralizar) {
        this.verbaDeCalculo = verbaDeCalculo;
        this.integralizar = integralizar;
    }

    public ItemBaseVerba(FormulaReflexo formula, VerbaDeCalculo verbaDeCalculo, LogicoEnum integralizar) {
        this(verbaDeCalculo, integralizar);
        this.formula = formula;
    }

    public VerbaDeCalculo getVerbaDeCalculo() {
        return this.verbaDeCalculo;
    }

    public void setVerbaDeCalculo(VerbaDeCalculo verbaDeCalculo) {
        this.verbaDeCalculo = verbaDeCalculo;
    }

    public Long getId() {
        return this.id;
    }

    public FormulaReflexo getFormula() {
        return this.formula;
    }

    public void setFormula(FormulaReflexo formula) {
        this.formula = formula;
    }

    public LogicoEnum getIntegralizar() {
        return this.integralizar;
    }

    public void setIntegralizar(LogicoEnum integralizar) {
        this.integralizar = integralizar;
    }

    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.formula == null ? 0 : this.formula.hashCode());
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        result = 31 * result + (this.integralizar == null ? 0 : this.integralizar.hashCode());
        result = 31 * result + (this.verbaDeCalculo == null ? 0 : this.verbaDeCalculo.hashCode());
        return result;
    }

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
        ItemBaseVerba other = (ItemBaseVerba)obj;
        if (this.formula == null ? other.formula != null : !this.formula.equals(other.formula)) {
            return false;
        }
        if (this.id == null ? other.id != null : !this.id.equals(other.id)) {
            return false;
        }
        if (this.integralizar != other.integralizar) {
            return false;
        }
        return !(this.verbaDeCalculo == null ? other.verbaDeCalculo != null : !this.verbaDeCalculo.equals(other.verbaDeCalculo));
    }
}

