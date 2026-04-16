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
package br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.negocio.dominio.inss.TabelaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado.RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado;
import br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado.TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch;
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
@Table(name="TBTABELAINSSSEGURADOEMPREGADO")
@SequenceGenerator(name="SQTABELAINSSSEGURADOEMPREGADO", sequenceName="SQTABELAINSSSEGURADOEMPREGADO", allocationSize=1)
@Name(value="tabelaPrevidenciariaSeguradoEmpregado")
public class TabelaPrevidenciariaSeguradoEmpregado
extends TabelaPrevidenciaria {
    private static final long serialVersionUID = -5459782528902458243L;
    private static final String NOME_TABELA = "SeguradoEmpregado";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTABELAINSSSEGURADOEMPREGADO")
    @Column(name="IIDREGISTROSEGURADOEMPREGADO", nullable=false)
    private final Long id = null;

    public TabelaPrevidenciariaSeguradoEmpregado() {
        super(RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado.class);
    }

    public TabelaPrevidenciariaSeguradoEmpregado(Date competencia) {
        super(RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado.class, competencia);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public static List<TabelaPrevidenciariaSeguradoEmpregado> obterTodos() {
        return TabelaPrevidenciariaSeguradoEmpregado.getRepositorio(RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado.class).obterTodos();
    }

    public static TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch obterListaOtimizadaDoPeriodo(Date dataInicial, Date dataFinal) {
        TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch tabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch = new TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch();
        tabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch.init((Collection<TabelaPrevidenciariaSeguradoEmpregado>)TabelaPrevidenciariaSeguradoEmpregado.getRepositorio(RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado.class).obterTodosNoPeriodo(dataInicial, dataFinal));
        return tabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch;
    }

    public static void remover(TabelaPrevidenciariaSeguradoEmpregado entidade) {
        TabelaPrevidenciariaSeguradoEmpregado.remover(RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado.class, entidade, true);
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public boolean existe() {
        return TabelaPrevidenciariaSeguradoEmpregado.getRepositorio(RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado.class).existe(this);
    }

    @Override
    public TabelaPrevidenciariaSeguradoEmpregado validar() {
        return (TabelaPrevidenciariaSeguradoEmpregado)this.validar(NOME_TABELA);
    }

    @Override
    public void criarTabelaParaProximaCompetencia() {
        TabelaPrevidenciariaSeguradoEmpregado tabelaSegurado = new TabelaPrevidenciariaSeguradoEmpregado();
        HelperDate proximaCompetencia = HelperDate.getInstance(this.getCompetencia());
        proximaCompetencia.addMonth(1);
        tabelaSegurado.setCompetencia(proximaCompetencia.getDate());
        tabelaSegurado.setValorTetoMaximo(this.getValorTetoMaximo());
        tabelaSegurado.setPrimeiraFaixaPrevidenciaria(this.getPrimeiraFaixaPrevidenciaria());
        tabelaSegurado.setSegundaFaixaPrevidenciaria(this.getSegundaFaixaPrevidenciaria());
        tabelaSegurado.setTerceiraFaixaPrevidenciaria(this.getTerceiraFaixaPrevidenciaria());
        tabelaSegurado.setQuartaFaixaPrevidenciaria(this.getQuartaFaixaPrevidenciaria());
        tabelaSegurado.setQuintaFaixaPrevidenciaria(this.getQuintaFaixaPrevidenciaria());
        tabelaSegurado.setValorTetoBeneficio(this.getValorTetoBeneficio());
        tabelaSegurado.salvar();
    }

    public static TabelaPrevidenciariaSeguradoEmpregado obter(Date competencia) {
        return (TabelaPrevidenciariaSeguradoEmpregado)TabelaPrevidenciariaSeguradoEmpregado.getRepositorio(RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado.class).obter(competencia);
    }

    public static TabelaPrevidenciariaSeguradoEmpregado obterAtual() {
        return (TabelaPrevidenciariaSeguradoEmpregado)TabelaPrevidenciariaSeguradoEmpregado.getRepositorio(RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado.class).obterAtual();
    }
}

