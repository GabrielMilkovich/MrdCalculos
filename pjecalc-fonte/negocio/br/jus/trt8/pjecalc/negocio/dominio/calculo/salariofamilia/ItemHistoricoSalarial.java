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
package br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.EntidadeAgregada;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
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
@SequenceGenerator(name="SQHISTORICOSALARIOFAMILIA", sequenceName="SQHISTORICOSALARIOFAMILIA", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Table(name="TBHISTORICOSALARIOFAMILIA")
@Name(value="itemHistoricoSalarial")
public class ItemHistoricoSalarial
extends EntidadeAgregada {
    private static final long serialVersionUID = 2089326989456772552L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQHISTORICOSALARIOFAMILIA")
    @Column(name="IIDHISTORICOSALARIOFAMILIA")
    private final Long id = null;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDHISTORICOSALARIAL")
    private HistoricoSalarial historicoSalarial;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDSALARIOFAMILIA")
    private SalarioFamilia salarioFamilia;

    public ItemHistoricoSalarial() {
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public ItemHistoricoSalarial(SalarioFamilia salarioFamilia) {
        this();
        this.salarioFamilia = salarioFamilia;
    }

    @Override
    public ItemHistoricoSalarial validar() {
        if (Utils.nulo(this.historicoSalarial)) {
            throw new NegocioException(new MensagemDeRecurso("historicoSalarial", Mensagens.MSG0003, "Hist\u00f3rico"));
        }
        return this;
    }

    public ItemHistoricoSalarial(HistoricoSalarial historicoSalarial) {
        this.historicoSalarial = historicoSalarial;
    }

    public HistoricoSalarial getHistoricoSalarial() {
        return this.historicoSalarial;
    }

    public void setHistoricoSalarial(HistoricoSalarial historicoSalarial) {
        this.historicoSalarial = historicoSalarial;
    }

    public Long getId() {
        return this.id;
    }

    public SalarioFamilia getSalarioFamilia() {
        return this.salarioFamilia;
    }

    public void setSalarioFamilia(SalarioFamilia salarioFamilia) {
        this.salarioFamilia = salarioFamilia;
    }

    @Override
    public int hashCode() {
        return this.getHashCodeBuilder().append((Object)this.historicoSalarial).hashCode();
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
        return this.getEqualsBuilder(obj).append((Object)this.historicoSalarial.getId(), (Object)((ItemHistoricoSalarial)obj).getHistoricoSalarial().getId()).isEquals();
    }
}

