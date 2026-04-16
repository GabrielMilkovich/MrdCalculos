/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Embedded
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.irpf;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.RepositorioDeTabelaIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas.FaixaFiscal;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas.PrimeiraFaixaFiscal;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas.QuartaFaixaFiscal;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas.QuintaFaixaFiscal;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas.SegundaFaixaFiscal;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas.TerceiraFaixaFiscal;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Embedded;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBTABELAIMPOSTORENDA")
@SequenceGenerator(name="SQTABELAIMPOSTORENDA", sequenceName="SQTABELAIMPOSTORENDA", allocationSize=1)
@Name(value="tabelaIrpf")
public class TabelaIrpf
extends EntidadeBase {
    private static final long serialVersionUID = 5092878857624012288L;
    private static final String NOME_TABELA = "Irpf";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTABELAIMPOSTORENDA")
    @Column(name="IIDREGISTROIMPOSTORENDA", nullable=false)
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="DDTCOMPETENCIAREGISTRO")
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date competencia;
    @Column(name="RVLDEDUCAOPORDEPENDENTE", precision=19, scale=2, nullable=false)
    @NotNull
    private BigDecimal valorDeducaoPorDependente = BigDecimal.ZERO;
    @Column(name="RVLDEDUCAOAPOSENTADOMEIACINCO", precision=19, scale=2, nullable=false)
    @NotNull
    private BigDecimal valorDeducaoParaAposentadoMaiorQue65Anos = BigDecimal.ZERO;
    @Embedded
    private PrimeiraFaixaFiscal primeiraFaixaFiscal = new PrimeiraFaixaFiscal();
    @Embedded
    private SegundaFaixaFiscal segundaFaixaFiscal = new SegundaFaixaFiscal();
    @Embedded
    private TerceiraFaixaFiscal terceiraFaixaFiscal = new TerceiraFaixaFiscal();
    @Embedded
    private QuartaFaixaFiscal quartaFaixaFiscal;
    @Embedded
    private QuintaFaixaFiscal quintaFaixaFiscal;

    public TabelaIrpf() {
        super(RepositorioDeTabelaIrpf.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    @Override
    public TabelaIrpf validar() {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.getCompetencia())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "mesAnoIrpf", Mensagens.MSG0003, "M\u00eas/Ano"));
        }
        if (Utils.nulo(this.getValorDeducaoPorDependente())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorDeducaoPorDependenteIrpf", Mensagens.MSG0003, "Valor da Dedu\u00e7\u00e3o por Dependente"));
        }
        if (Utils.nulo(this.getValorDeducaoParaAposentadoMaiorQue65Anos())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorDeducaoParaAposentadoMaiorQue65AnosIrpf", Mensagens.MSG0003, "Valor da Dedu\u00e7\u00e3o por Aposentado Maior que 65 Anos"));
        }
        this.getPrimeiraFaixaFiscal().validar(NOME_TABELA, excecao, true);
        this.getSegundaFaixaFiscal().validar(NOME_TABELA, excecao, true);
        boolean existeQuartaFaixa = Utils.naoNulo(this.getQuartaFaixaFiscal());
        this.getTerceiraFaixaFiscal().validar(NOME_TABELA, excecao, existeQuartaFaixa);
        boolean existeQuintaFaixa = Utils.naoNulo(this.getQuintaFaixaFiscal());
        if (existeQuartaFaixa) {
            this.getQuartaFaixaFiscal().validar(NOME_TABELA, excecao, existeQuintaFaixa);
        }
        if (existeQuintaFaixa) {
            this.getQuintaFaixaFiscal().validar(NOME_TABELA, excecao, false);
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public FaixaFiscal obterFaixaParaValor(BigDecimal valor) {
        if (this.getPrimeiraFaixaFiscal().getValorFinal() == null || valor.compareTo(this.getPrimeiraFaixaFiscal().getValorFinal()) <= 0) {
            return this.getPrimeiraFaixaFiscal();
        }
        if (this.getSegundaFaixaFiscal().getValorFinal() == null || valor.compareTo(this.getSegundaFaixaFiscal().getValorFinal()) <= 0) {
            return this.getSegundaFaixaFiscal();
        }
        if (this.getTerceiraFaixaFiscal().getValorFinal() == null || valor.compareTo(this.getTerceiraFaixaFiscal().getValorFinal()) <= 0) {
            return this.getTerceiraFaixaFiscal();
        }
        if (this.getQuartaFaixaFiscal().getValorFinal() == null || valor.compareTo(this.getQuartaFaixaFiscal().getValorFinal()) <= 0) {
            return this.getQuartaFaixaFiscal();
        }
        return this.getQuintaFaixaFiscal();
    }

    public FaixaFiscal obterFaixaParaValor(BigDecimal valor, BigDecimal numCompetencias) {
        if (this.getPrimeiraFaixaFiscal().getValorFinal() == null || valor.compareTo(this.getPrimeiraFaixaFiscal().getValorFinal().multiply(numCompetencias, Utils.CONTEXTO_MATEMATICO)) <= 0) {
            return this.getPrimeiraFaixaFiscal();
        }
        if (this.getSegundaFaixaFiscal().getValorFinal() == null || valor.compareTo(this.getSegundaFaixaFiscal().getValorFinal().multiply(numCompetencias, Utils.CONTEXTO_MATEMATICO)) <= 0) {
            return this.getSegundaFaixaFiscal();
        }
        if (this.getTerceiraFaixaFiscal().getValorFinal() == null || valor.compareTo(this.getTerceiraFaixaFiscal().getValorFinal().multiply(numCompetencias, Utils.CONTEXTO_MATEMATICO)) <= 0) {
            return this.getTerceiraFaixaFiscal();
        }
        if (this.getQuartaFaixaFiscal().getValorFinal() == null || valor.compareTo(this.getQuartaFaixaFiscal().getValorFinal().multiply(numCompetencias, Utils.CONTEXTO_MATEMATICO)) <= 0) {
            return this.getQuartaFaixaFiscal();
        }
        return this.getQuintaFaixaFiscal();
    }

    public static List<TabelaIrpf> obterTodos() {
        return TabelaIrpf.getRepositorio(RepositorioDeTabelaIrpf.class).obterTodos();
    }

    public static TabelaIrpf obterTabelaDa(Date data) {
        TabelaIrpf tabela = TabelaIrpf.getRepositorio(RepositorioDeTabelaIrpf.class).obterParaA(data);
        while (Utils.nulo(tabela) && HelperDate.dateAfterOrEquals(data, HelperDate.getInstance(1992, 0, 1).getDate())) {
            data = HelperDate.getInstance(data).addMonth(-1).getDate();
            tabela = TabelaIrpf.getRepositorio(RepositorioDeTabelaIrpf.class).obterParaA(data);
        }
        return tabela;
    }

    public static void remover(TabelaIrpf entidade) {
        TabelaIrpf.remover(RepositorioDeTabelaIrpf.class, entidade, true);
    }

    public boolean existe() {
        return TabelaIrpf.getRepositorio(RepositorioDeTabelaIrpf.class).existe(this);
    }

    public void criarTabelaParaProximaCompetencia() {
        TabelaIrpf tabelaIrpf = new TabelaIrpf();
        HelperDate proximaCompetencia = HelperDate.getInstance(this.getCompetencia());
        proximaCompetencia.addMonth(1);
        tabelaIrpf.setCompetencia(proximaCompetencia.getDate());
        tabelaIrpf.setValorDeducaoPorDependente(this.getValorDeducaoPorDependente());
        tabelaIrpf.setValorDeducaoParaAposentadoMaiorQue65Anos(this.getValorDeducaoParaAposentadoMaiorQue65Anos());
        tabelaIrpf.setPrimeiraFaixaFiscal(this.getPrimeiraFaixaFiscal());
        tabelaIrpf.setSegundaFaixaFiscal(this.getSegundaFaixaFiscal());
        tabelaIrpf.setTerceiraFaixaFiscal(this.getTerceiraFaixaFiscal());
        tabelaIrpf.setQuartaFaixaFiscal(this.getQuartaFaixaFiscal());
        tabelaIrpf.setQuintaFaixaFiscal(this.getQuintaFaixaFiscal());
        tabelaIrpf.salvar();
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Date getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    public BigDecimal getValorDeducaoPorDependente() {
        return this.valorDeducaoPorDependente;
    }

    public void setValorDeducaoPorDependente(BigDecimal valorDeducaoPorDependente) {
        this.valorDeducaoPorDependente = valorDeducaoPorDependente;
    }

    public BigDecimal getValorDeducaoParaAposentadoMaiorQue65Anos() {
        return this.valorDeducaoParaAposentadoMaiorQue65Anos;
    }

    public void setValorDeducaoParaAposentadoMaiorQue65Anos(BigDecimal valorDeducaoParaAposentadoMaiorQue65Anos) {
        this.valorDeducaoParaAposentadoMaiorQue65Anos = valorDeducaoParaAposentadoMaiorQue65Anos;
    }

    public PrimeiraFaixaFiscal getPrimeiraFaixaFiscal() {
        return this.primeiraFaixaFiscal;
    }

    public void setPrimeiraFaixaFiscal(PrimeiraFaixaFiscal primeiraFaixaFiscal) {
        this.primeiraFaixaFiscal = primeiraFaixaFiscal;
    }

    public SegundaFaixaFiscal getSegundaFaixaFiscal() {
        return this.segundaFaixaFiscal;
    }

    public void setSegundaFaixaFiscal(SegundaFaixaFiscal segundaFaixaFiscal) {
        this.segundaFaixaFiscal = segundaFaixaFiscal;
    }

    public TerceiraFaixaFiscal getTerceiraFaixaFiscal() {
        return this.terceiraFaixaFiscal;
    }

    public void setTerceiraFaixaFiscal(TerceiraFaixaFiscal terceiraFaixaFiscal) {
        this.terceiraFaixaFiscal = terceiraFaixaFiscal;
    }

    public QuartaFaixaFiscal getQuartaFaixaFiscal() {
        return this.quartaFaixaFiscal;
    }

    public void setQuartaFaixaFiscal(QuartaFaixaFiscal quartaFaixaFiscal) {
        this.quartaFaixaFiscal = quartaFaixaFiscal;
    }

    public QuintaFaixaFiscal getQuintaFaixaFiscal() {
        return this.quintaFaixaFiscal;
    }

    public void setQuintaFaixaFiscal(QuintaFaixaFiscal quintaFaixaFiscal) {
        this.quintaFaixaFiscal = quintaFaixaFiscal;
    }

    public List<FaixaFiscal> getFaixas() {
        ArrayList<FaixaFiscal> faixas = new ArrayList<FaixaFiscal>();
        faixas.add(this.getPrimeiraFaixaFiscal());
        faixas.add(this.getSegundaFaixaFiscal());
        faixas.add(this.getTerceiraFaixaFiscal());
        if (Utils.naoNulo(this.getQuartaFaixaFiscal())) {
            faixas.add(this.getQuartaFaixaFiscal());
        }
        if (Utils.naoNulo(this.getQuintaFaixaFiscal())) {
            faixas.add(this.getQuintaFaixaFiscal());
        }
        return faixas;
    }
}

