/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariominimo.nacional;

import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.dominio.salariominimo.SalarioMinimoBase;
import br.jus.trt8.pjecalc.negocio.dominio.salariominimo.nacional.RepositorioDeSalarioMinimoNacional;
import br.jus.trt8.pjecalc.negocio.dominio.salariominimo.nacional.SalarioMinimoOptimizerListSearch;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBSALARIOMINIMONACIONAL")
@SequenceGenerator(name="SQSALARIOMINIMONACIONAL", sequenceName="SQSALARIOMINIMONACIONAL", allocationSize=1)
@Name(value="salarioMinimoNacional")
public class SalarioMinimoNacional
extends SalarioMinimoBase {
    private static final long serialVersionUID = 7505106564049113745L;
    private static final String DISCRIMINADOR = "Nacional";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQSALARIOMINIMONACIONAL")
    @Column(name="IIDSALARIOMINIMO", nullable=false)
    private final Long id = null;

    public SalarioMinimoNacional() {
        super(RepositorioDeSalarioMinimoNacional.class);
    }

    public SalarioMinimoNacional(Date competencia, BigDecimal valor) {
        this();
        this.setCompetencia(competencia);
        this.setValor(valor);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public SalarioMinimoNacional validarParametrosParaNovosRegistros() {
        NegocioException excecao = new NegocioException();
        this.validar(excecao);
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }

    public static List<SalarioMinimoNacional> obterTodos() {
        return SalarioMinimoNacional.getRepositorio(RepositorioDeSalarioMinimoNacional.class).obterTodos();
    }

    public static void remover(SalarioMinimoNacional entidade) {
        SalarioMinimoNacional.remover(RepositorioDeSalarioMinimoNacional.class, entidade, true);
    }

    public static SalarioMinimoOptimizerListSearch obterListaOtimizadaDoPeriodo(Date dataInicial, Date dataFinal) {
        SalarioMinimoOptimizerListSearch salarioMinimoOptimizerListSearch = new SalarioMinimoOptimizerListSearch();
        salarioMinimoOptimizerListSearch.init((Collection<SalarioMinimoNacional>)SalarioMinimoNacional.getRepositorio(RepositorioDeSalarioMinimoNacional.class).obterTodosNoPeriodo(dataInicial, dataFinal));
        return salarioMinimoOptimizerListSearch;
    }

    public static List<SalarioMinimoNacional> obterTodosNoPeriodo(Date dataInicial, Date dataFinal) {
        return SalarioMinimoNacional.getRepositorio(RepositorioDeSalarioMinimoNacional.class).obterTodosNoPeriodo(dataInicial, dataFinal);
    }
}

