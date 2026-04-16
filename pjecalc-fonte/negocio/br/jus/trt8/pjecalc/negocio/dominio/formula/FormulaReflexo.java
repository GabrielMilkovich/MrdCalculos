/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.DiscriminatorValue
 *  javax.persistence.Embedded
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.JoinColumn
 *  javax.persistence.OneToOne
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.formula;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.formula.Formula;
import br.jus.trt8.pjecalc.negocio.dominio.termo.BaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Divisor;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Multiplicador;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Quantidade;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Embedded;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.JoinColumn;
import javax.persistence.OneToOne;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@DiscriminatorValue(value="R")
@Name(value="formulaReflexo")
public class FormulaReflexo
extends Formula {
    private static final long serialVersionUID = 1520083033240136049L;
    @Embedded
    private BaseVerba baseVerba = new BaseVerba();
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL})
    @JoinColumn(name="IIDTERMODIVISOR")
    private Divisor divisor = new Divisor();
    @Embedded
    private Multiplicador multiplicador = new Multiplicador();
    @OneToOne(fetch=FetchType.EAGER, cascade={CascadeType.ALL})
    @JoinColumn(name="IIDTERMOQUANTIDADE")
    private Quantidade quantidade = new Quantidade();
    @Column(name="SFLDOBRA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean dobra = false;

    public BaseVerba getBaseVerba() {
        if (this.baseVerba == null) {
            this.baseVerba = new BaseVerba();
        }
        return this.baseVerba;
    }

    public void setBaseVerba(BaseVerba baseVerba) {
        this.baseVerba = baseVerba;
    }

    public Divisor getDivisor() {
        return this.divisor;
    }

    public void setDivisor(Divisor divisor) {
        this.divisor = divisor;
    }

    public Multiplicador getMultiplicador() {
        if (this.multiplicador == null) {
            this.multiplicador = new Multiplicador();
        }
        return this.multiplicador;
    }

    public void setMultiplicador(Multiplicador multiplicador) {
        this.multiplicador = multiplicador;
    }

    public BigDecimal getValorQuantidadeCalculada(ParametroDoTermo parametro) {
        return this.getQuantidade().resolverValor(parametro);
    }

    public Quantidade getQuantidade() {
        return this.quantidade;
    }

    public void setQuantidade(Quantidade quantidade) {
        this.quantidade = quantidade;
    }

    public Boolean getDobra() {
        return this.dobra;
    }

    public void setDobra(Boolean dobra) {
        this.dobra = dobra;
    }

    @Override
    public Formula consistir() {
        super.consistir();
        this.checarCiclo(this.getVerbaDeCalculo());
        return this;
    }

    public void checarCiclo(VerbaDeCalculo verbaSendoGravada) {
        if (Utils.naoNulo(this.getBaseVerba()) && Utils.naoNulo(this.getBaseVerba().getItens()) && !this.getBaseVerba().getItens().isEmpty()) {
            for (ItemBaseVerba item : this.getBaseVerba().getItens()) {
                VerbaDeCalculo verba = VerbaDeCalculo.obter(item.getVerbaDeCalculo().getId());
                if (!(verba.getFormula() instanceof FormulaReflexo)) continue;
                FormulaReflexo formulaReflexo = (FormulaReflexo)verba.getFormula();
                formulaReflexo.checarCiclo(verbaSendoGravada, verba.getNome());
            }
        }
    }

    public void checarCiclo(VerbaDeCalculo verbaSendoGravada, String nomeBaseVerba) {
        if (Utils.naoNulo(this.getBaseVerba()) && Utils.naoNulo(this.getBaseVerba().getItens()) && !this.getBaseVerba().getItens().isEmpty()) {
            for (ItemBaseVerba item : this.getBaseVerba().getItens()) {
                if (Utils.naoNulo(verbaSendoGravada.getId()) && item.getVerbaDeCalculo().getId().compareTo(verbaSendoGravada.getId()) == 0) {
                    throw new NegocioException(new MensagemDeRecurso("baseVerbaDeCalculo", Mensagens.MSG0108, nomeBaseVerba));
                }
                VerbaDeCalculo verba = VerbaDeCalculo.obter(item.getVerbaDeCalculo().getId());
                if (!(verba.getFormula() instanceof FormulaReflexo)) continue;
                FormulaReflexo formulaReflexo = (FormulaReflexo)verba.getFormula();
                formulaReflexo.checarCiclo(verbaSendoGravada, nomeBaseVerba);
            }
        }
    }

    public String toString() {
        String base = "base";
        String proporcao = "";
        if (this.getVerbaDeCalculo().getAplicarProporcionalidade().booleanValue()) {
            proporcao = "x Propor\u00e7\u00e3o";
        }
        return String.format("(((%s / %s) x %s) x %s) %s", base, this.getDivisor().toString(), this.getMultiplicador().toString(), this.getQuantidade().toString(), proporcao);
    }
}

