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
package br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.EntidadeAgregada;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego;
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
@SequenceGenerator(name="SQHISTORICOSEGURODESEMPREGO", sequenceName="SQHISTORICOSEGURODESEMPREGO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Table(name="TBHISTORICOSEGURODESEMPREGO")
@Name(value="itemHistoricoSalarialDeSeguroDesemprego")
public class ItemHistoricoSalarialDeSeguroDesemprego
extends EntidadeAgregada {
    private static final long serialVersionUID = 3786216254633950596L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQHISTORICOSEGURODESEMPREGO")
    @Column(name="IIDHISTORICOSEGURODESEMPREGO")
    private final Long id = null;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDHISTORICOSALARIAL")
    private HistoricoSalarial historicoSalarial;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDSEGURODESEMPREGO")
    private SeguroDesemprego seguroDesemprego;

    public ItemHistoricoSalarialDeSeguroDesemprego() {
    }

    public ItemHistoricoSalarialDeSeguroDesemprego(SeguroDesemprego seguroDesemprego) {
        this();
        this.seguroDesemprego = seguroDesemprego;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public ItemHistoricoSalarialDeSeguroDesemprego validar() {
        if (Utils.nulo(this.historicoSalarial)) {
            throw new NegocioException(new MensagemDeRecurso("historicoSalarial", Mensagens.MSG0003, "Hist\u00f3rico"));
        }
        return this;
    }

    public ItemHistoricoSalarialDeSeguroDesemprego(HistoricoSalarial historicoSalarial) {
        this.historicoSalarial = historicoSalarial;
    }

    public HistoricoSalarial getHistoricoSalarial() {
        return this.historicoSalarial;
    }

    public void setHistoricoSalarial(HistoricoSalarial historicoSalarial) {
        this.historicoSalarial = historicoSalarial;
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
        return this.getEqualsBuilder(obj).append((Object)this.historicoSalarial.getId(), (Object)((ItemHistoricoSalarialDeSeguroDesemprego)obj).getHistoricoSalarial().getId()).isEquals();
    }
}

