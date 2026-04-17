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
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBHONORARIOCALCVERBACALC")
@SequenceGenerator(name="SQHONORARIOCALCVERBACALC", sequenceName="SQHONORARIOCALCVERBACALC", allocationSize=1)
@Name(value="honorarioVerbaDeCalculo")
public class HonorarioVerbaDeCalculo
extends EntidadeBase {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQHONORARIOCALCVERBACALC")
    @Column(name="IIDHONORARIOCALCVERBACALC")
    private Long id = null;
    @ManyToOne
    @JoinColumn(name="IIDHONORARIO")
    private Honorario honorario;
    @ManyToOne
    @JoinColumn(name="IIDVERBACALCULO")
    private VerbaDeCalculo verbaDeCalculo;

    public HonorarioVerbaDeCalculo() {
    }

    public HonorarioVerbaDeCalculo(Honorario honorario, VerbaDeCalculo verbaDeCalculo) {
        this.honorario = honorario;
        this.verbaDeCalculo = verbaDeCalculo;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Honorario getHonorario() {
        return this.honorario;
    }

    public void setHonorario(Honorario honorario) {
        this.honorario = honorario;
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

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null || !super.equals(obj) || this.getClass() != obj.getClass()) {
            return false;
        }
        HonorarioVerbaDeCalculo other = (HonorarioVerbaDeCalculo)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }
}

