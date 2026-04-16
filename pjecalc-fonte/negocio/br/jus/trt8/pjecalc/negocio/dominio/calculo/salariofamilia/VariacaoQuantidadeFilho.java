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
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.EntidadeAgregada;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100YearsValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@SequenceGenerator(name="SQVARIACAOFILHOSSALARIOFAMILIA", sequenceName="SQVARIACAOFILHOSSALARIOFAMILIA", allocationSize=1)
@Table(name="TBVARIACAOFILHOSSALARIOFAMILIA")
@Scope(value=ScopeType.SESSION)
@Name(value="variacaoQuantidadeFilho")
public class VariacaoQuantidadeFilho
extends EntidadeAgregada
implements Comparable<VariacaoQuantidadeFilho> {
    private static final long serialVersionUID = 6641928687912143945L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVARIACAOFILHOSSALARIOFAMILIA")
    @Column(name="IIDVARIACAOQUANTIDADEFILHOS")
    private final Long id = null;
    @Column(name="DDTVARIACAO")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicial;
    @Column(name="IQTFILHOS14ANOS")
    private Integer quantFilhosMenores14Anos;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDSALARIOFAMILIA")
    private SalarioFamilia salarioFamilia;

    public VariacaoQuantidadeFilho() {
    }

    public VariacaoQuantidadeFilho(SalarioFamilia salarioFamilia) {
        this.salarioFamilia = salarioFamilia;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Date getDataInicial() {
        return this.dataInicial;
    }

    public void setDataInicial(Date dataInicial) {
        this.dataInicial = dataInicial;
    }

    public Integer getQuantFilhosMenores14Anos() {
        return this.quantFilhosMenores14Anos;
    }

    public void setQuantFilhosMenores14Anos(Integer quantFilhosMenores14Anos) {
        this.quantFilhosMenores14Anos = quantFilhosMenores14Anos;
    }

    public Long getId() {
        return this.id;
    }

    private HelperDate getUltimaData() {
        if (this.salarioFamilia.getVariacaoQuantidadesFilhos().isEmpty()) {
            return null;
        }
        VariacaoQuantidadeFilho variacao = this.salarioFamilia.getVariacaoQuantidadesFilhos().get(0);
        return HelperDate.getInstance(variacao.getDataInicial());
    }

    public SalarioFamilia getSalarioFamilia() {
        return this.salarioFamilia;
    }

    public void setSalarioFamilia(SalarioFamilia salarioFamilia) {
        this.salarioFamilia = salarioFamilia;
    }

    @Override
    public VariacaoQuantidadeFilho validar() {
        HelperDate dataInicial;
        MensagemDeRecurso mensagemDeRecurso;
        NegocioException exception = new NegocioException();
        if (Utils.nulo(this.getDataInicial())) {
            mensagemDeRecurso = new MensagemDeRecurso("variacaoDataInicial", Mensagens.MSG0003, "Compet\u00eancia");
            exception.adicionarMensagemDeRecurso(mensagemDeRecurso);
        }
        if (Utils.nulo(this.getQuantFilhosMenores14Anos())) {
            mensagemDeRecurso = new MensagemDeRecurso("variacaoQuantFilhosMenores14Anos", Mensagens.MSG0003, "Quantidade");
            exception.adicionarMensagemDeRecurso(mensagemDeRecurso);
        }
        if (!exception.getMensagensDeRecurso().isEmpty()) {
            throw exception;
        }
        if (!new LimitedTo100YearsValidator().isValid(new ValidatorContext(this, this.getDataInicial()))) {
            throw new NegocioException(new MensagemDeRecurso("variacaoDataInicial", Mensagens.MSG0011, "Compet\u00eancia"));
        }
        if (Utils.naoNulos(this.salarioFamilia.getDataInicial(), this.salarioFamilia.getDataFinal())) {
            if (HelperDate.getCurrentCompetence(this.dataInicial).lessThanOrEqualsTo(HelperDate.getCurrentCompetence(this.salarioFamilia.getDataInicial()))) {
                throw new NegocioException(new MensagemDeRecurso("variacaoDataInicial", Mensagens.MSG0007, "Compet\u00eancia", "Compet\u00eancia Inicial do Sal\u00e1rio Fam\u00edlia"));
            }
            if (HelperDate.getCurrentCompetence(this.dataInicial).greaterThen(HelperDate.getCurrentCompetence(this.salarioFamilia.getDataFinal()))) {
                throw new NegocioException(new MensagemDeRecurso("variacaoDataInicial", Mensagens.MSG0009, "Compet\u00eancia", "Compet\u00eancia Final do Sal\u00e1rio Fam\u00edlia"));
            }
        }
        if ((dataInicial = this.getUltimaData()) != null && HelperDate.getCurrentCompetence(this.dataInicial).lessThanOrEqualsTo(dataInicial.setDay(1))) {
            throw new NegocioException(new MensagemDeRecurso("variacaoDataInicial", Mensagens.MSG0051, dataInicial.format("MM/yyyy")));
        }
        return this;
    }

    @Override
    public int hashCode() {
        return this.getHashCodeBuilder().append((Object)this.dataInicial).hashCode();
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
        return this.getEqualsBuilder(obj).append((Object)this.dataInicial, (Object)((VariacaoQuantidadeFilho)obj).dataInicial).isEquals();
    }

    @Override
    public int compareTo(VariacaoQuantidadeFilho o) {
        return o.getDataInicial().compareTo(this.dataInicial);
    }
}

