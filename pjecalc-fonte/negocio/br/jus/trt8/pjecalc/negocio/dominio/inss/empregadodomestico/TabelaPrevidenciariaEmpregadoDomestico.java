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
package br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.negocio.dominio.inss.TabelaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico.RepositorioDeTabelaPrevidenciariaDoEmpregadoDomestico;
import br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico.TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch;
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
@Table(name="TBTABELAINSSEMPREGADODOMESTICO")
@SequenceGenerator(name="SQTABELAINSSEMPREGADODOMESTICO", sequenceName="SQTABELAINSSEMPREGADODOMESTICO", allocationSize=1)
@Name(value="tabelaPrevidenciariaEmpregadoDomestico")
public class TabelaPrevidenciariaEmpregadoDomestico
extends TabelaPrevidenciaria {
    private static final long serialVersionUID = 2864535724081405970L;
    private static final String NOME_TABELA = "EmpregadoDomestico";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTABELAINSSEMPREGADODOMESTICO")
    @Column(name="IIDREGISTROEMPREGADODOMESTICO", nullable=false)
    private final Long id = null;

    public TabelaPrevidenciariaEmpregadoDomestico() {
        super(RepositorioDeTabelaPrevidenciariaDoEmpregadoDomestico.class);
    }

    public TabelaPrevidenciariaEmpregadoDomestico(Date competencia) {
        super(RepositorioDeTabelaPrevidenciariaDoEmpregadoDomestico.class, competencia);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public static List<TabelaPrevidenciariaEmpregadoDomestico> obterTodos() {
        return TabelaPrevidenciariaEmpregadoDomestico.getRepositorio(RepositorioDeTabelaPrevidenciariaDoEmpregadoDomestico.class).obterTodos();
    }

    public static TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch obterListaOtimizadaDoPeriodo(Date dataInicial, Date dataFinal) {
        TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch tabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch = new TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch();
        tabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch.init((Collection<TabelaPrevidenciariaEmpregadoDomestico>)TabelaPrevidenciariaEmpregadoDomestico.getRepositorio(RepositorioDeTabelaPrevidenciariaDoEmpregadoDomestico.class).obterTodosNoPeriodo(dataInicial, dataFinal));
        return tabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch;
    }

    public static void remover(TabelaPrevidenciariaEmpregadoDomestico entidade) {
        TabelaPrevidenciariaEmpregadoDomestico.remover(RepositorioDeTabelaPrevidenciariaDoEmpregadoDomestico.class, entidade, true);
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public boolean existe() {
        return TabelaPrevidenciariaEmpregadoDomestico.getRepositorio(RepositorioDeTabelaPrevidenciariaDoEmpregadoDomestico.class).existe(this);
    }

    @Override
    public TabelaPrevidenciariaEmpregadoDomestico validar() {
        return (TabelaPrevidenciariaEmpregadoDomestico)this.validar(NOME_TABELA);
    }

    @Override
    public void criarTabelaParaProximaCompetencia() {
        TabelaPrevidenciariaEmpregadoDomestico tabelaEmpregado = new TabelaPrevidenciariaEmpregadoDomestico();
        HelperDate proximaCompetencia = HelperDate.getInstance(this.getCompetencia());
        proximaCompetencia.addMonth(1);
        tabelaEmpregado.setCompetencia(proximaCompetencia.getDate());
        tabelaEmpregado.setValorTetoMaximo(this.getValorTetoMaximo());
        tabelaEmpregado.setPrimeiraFaixaPrevidenciaria(this.getPrimeiraFaixaPrevidenciaria());
        tabelaEmpregado.setSegundaFaixaPrevidenciaria(this.getSegundaFaixaPrevidenciaria());
        tabelaEmpregado.setTerceiraFaixaPrevidenciaria(this.getTerceiraFaixaPrevidenciaria());
        tabelaEmpregado.setQuartaFaixaPrevidenciaria(this.getQuartaFaixaPrevidenciaria());
        tabelaEmpregado.setQuintaFaixaPrevidenciaria(this.getQuintaFaixaPrevidenciaria());
        tabelaEmpregado.setValorTetoBeneficio(this.getValorTetoBeneficio());
        tabelaEmpregado.salvar();
    }

    public static TabelaPrevidenciariaEmpregadoDomestico obterAtual() {
        return (TabelaPrevidenciariaEmpregadoDomestico)TabelaPrevidenciariaEmpregadoDomestico.getRepositorio(RepositorioDeTabelaPrevidenciariaDoEmpregadoDomestico.class).obterAtual();
    }
}

