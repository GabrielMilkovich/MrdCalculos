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
 *  javax.persistence.Lob
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Where
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeJurosDasVerbasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndicesAcumuladosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.CompetenciaDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.IndicePrecatorio;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ServicoAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJurosOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.OcorrenciaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.OcorrenciaDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.AtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioCreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.Lob;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Where;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBCREDITORECLAMANTEPAG")
@SequenceGenerator(name="SQCREDITORECLAMANTEPAG", sequenceName="SQCREDITORECLAMANTEPAG", allocationSize=1)
@Name(value="creditoReclamantePagamento")
@Scope(value=ScopeType.SESSION)
public class CreditosDoReclamante
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = -3738552731305349359L;
    private static final int INDICE_VALOR_RATEADO_JUROS_PERIODO_ATUAL = 2;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCREDITORECLAMANTEPAG")
    @Column(name="IIDCREDITORECLAMANTEPAG")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDATUALIZACAO")
    private Atualizacao atualizacao;
    @Column(name="DDTCRIACAOCREDITORECLAMANTEPAG", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataCriacao;
    @Column(name="DDTINICIALCREDITORECLAMANTEPAG", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataInicialPeriodo;
    @Column(name="DDTFINALCREDITORECLAMANTEPAG", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataFinalPeriodo;
    @Column(name="MVLINDICECORRECAO", precision=38, scale=25)
    private BigDecimal indiceDeCorrecao;
    @Column(name="MVLINDICECORRECAOPJUROS", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoParaJuros;
    @Column(name="MVLINDICECORRECAOFGTS", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoFgts;
    @Column(name="MVLINDICECORRECAOPREVPRIV", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoPrevidenciaPrivada;
    @Column(name="MVLTAXADEJUROS", precision=12, scale=4)
    private BigDecimal taxaDeJuros;
    @Column(name="MVLTAXADEJUROSFGTS", precision=12, scale=4)
    private BigDecimal taxaDeJurosFgts;
    @Column(name="MVLVALORPRINCIPAL", precision=12, scale=2)
    private BigDecimal valorPrincipal;
    @Column(name="MVLPAGOPRINCIPAL", precision=12, scale=2)
    private BigDecimal pagoPrincipal;
    @Column(name="MVLJUROMORAPRINCIPAL", precision=12, scale=2)
    private BigDecimal juroPrincipal;
    @Column(name="MVLPAGOJUROMORAPRINCIPAL", precision=12, scale=2)
    private BigDecimal pagoJuroDeMoraPrincipal;
    @Column(name="MVLPAGOJUROMORAPRINCIPALPGT", precision=12, scale=2)
    private BigDecimal pagoJuroDeMoraPrincipalPeriodoAtual;
    @Column(name="MVLVALORREVIDENCIAPRIVADA", precision=12, scale=2)
    private BigDecimal valorPrevidenciaPrivada;
    @Column(name="MVLVALORDESCONTOINSS", precision=12, scale=2)
    private BigDecimal valorDescontoInss;
    @Column(name="MVLVALORFGTS", precision=12, scale=2)
    private BigDecimal valorFgts;
    @Column(name="MVLPAGOFGTS", precision=12, scale=2)
    private BigDecimal pagoFgts;
    @Column(name="MVLJUROMORAFGTS", precision=12, scale=2)
    private BigDecimal juroFgts;
    @Column(name="MVLPAGOJUROMORAFGTS", precision=12, scale=2)
    private BigDecimal pagoJuroDeMoraFgts;
    @Column(name="MVLPAGOJUROMORAFGTSPGT", precision=12, scale=2)
    private BigDecimal pagoJuroDeMoraFgtsPeriodoAtual;
    @Column(name="MVLTOTALDEVIDO", precision=12, scale=2)
    private BigDecimal totalDevido;
    @Column(name="MVLTOTALPAGO", precision=12, scale=2)
    private BigDecimal totalPago;
    @Column(name="MVLTOTALDIFERENCA", precision=12, scale=2)
    private BigDecimal totalDiferenca;
    @Where(clause="STPMULTA = 'I' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="creditoDoReclamantePagamento")
    @OrderBy(value="multa")
    private Set<MultaDaAtualizacao> multasInformadas = new HashSet<MultaDaAtualizacao>();
    @Where(clause="STPMULTA = 'C' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="creditoDoReclamantePagamento")
    @OrderBy(value="multa")
    private Set<MultaDaAtualizacao> multasCalculadas = new HashSet<MultaDaAtualizacao>();
    @Lob
    @Column(name="SCDDESCEVENTOS", columnDefinition="CLOB")
    private String descritivoDeEventos;
    @Transient
    private BigDecimal totalDevidoDasMultasDevidasAoReclamante = BigDecimal.ZERO;
    @Transient
    private BigDecimal totalDevidoDasMultasDevidasAoReclamado = BigDecimal.ZERO;
    @Transient
    private BigDecimal totalDeJurosDevidosDasMultasDevidasAoReclamante = BigDecimal.ZERO;
    @Transient
    private BigDecimal totalDeJurosDevidosDasMultasDevidasAoReclamado = BigDecimal.ZERO;
    @Transient
    private BigDecimal proporcaoJurosTributavel = BigDecimal.ZERO;
    @Transient
    private BigDecimal proporcaoPrincipalTributavel = BigDecimal.ZERO;
    @Transient
    private BigDecimal baseDeJurosPrincipalPrimeiroEvento = BigDecimal.ZERO;
    @Transient
    private BigDecimal totalJurosPrincipal = BigDecimal.ZERO;
    @Transient
    private BigDecimal totalDevidoCorrigidoSemPagamento = BigDecimal.ZERO;
    @Transient
    private BigDecimal indiceDeCorrecaoAcumulado = BigDecimal.ONE;

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public void salvar() {
        this.setDataCriacao(new Date());
        CreditosDoReclamante.getRepositorio(RepositorioCreditosDoReclamante.class).salvar(this);
    }

    public static List<CreditosDoReclamante> obterUltimoRegistro(Atualizacao atualizacao) {
        return CreditosDoReclamante.getRepositorio(RepositorioCreditosDoReclamante.class).obterUltimoRegistro(atualizacao);
    }

    public static List<CreditosDoReclamante> obterTodos(Atualizacao atualizacao) {
        return CreditosDoReclamante.getRepositorio(RepositorioCreditosDoReclamante.class).obterTodosCreditoDoReclamante(atualizacao);
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Calculo getCalculo() {
        return this.atualizacao.getCalculo();
    }

    public Atualizacao getAtualizacao() {
        return this.atualizacao;
    }

    public void setAtualizacao(Atualizacao atualizacao) {
        this.atualizacao = atualizacao;
    }

    public Date getDataCriacao() {
        return this.dataCriacao;
    }

    public void setDataCriacao(Date dataCriacao) {
        this.dataCriacao = dataCriacao;
    }

    public BigDecimal getIndiceDeCorrecao() {
        return this.indiceDeCorrecao;
    }

    public void setIndiceDeCorrecao(BigDecimal indiceDeCorrecao) {
        this.indiceDeCorrecao = indiceDeCorrecao;
    }

    public BigDecimal getIndiceDeCorrecaoParaJuros() {
        return this.indiceDeCorrecaoParaJuros;
    }

    public void setIndiceDeCorrecaoParaJuros(BigDecimal indiceDeCorrecaoParaJuros) {
        this.indiceDeCorrecaoParaJuros = indiceDeCorrecaoParaJuros;
    }

    public BigDecimal getIndiceDeCorrecaoFgts() {
        return this.indiceDeCorrecaoFgts;
    }

    public void setIndiceDeCorrecaoFgts(BigDecimal indiceDeCorrecaoFgts) {
        this.indiceDeCorrecaoFgts = indiceDeCorrecaoFgts;
    }

    public BigDecimal getIndiceDeCorrecaoPrevidenciaPrivada() {
        return this.indiceDeCorrecaoPrevidenciaPrivada;
    }

    public void setIndiceDeCorrecaoPrevidenciaPrivada(BigDecimal indiceDeCorrecaoPrevidenciaPrivada) {
        this.indiceDeCorrecaoPrevidenciaPrivada = indiceDeCorrecaoPrevidenciaPrivada;
    }

    public BigDecimal getIndiceDeCorrecaoAcumulado() {
        return this.indiceDeCorrecaoAcumulado;
    }

    public void setIndiceDeCorrecaoAcumulado(BigDecimal indiceDeCorrecaoAcumulado) {
        this.indiceDeCorrecaoAcumulado = indiceDeCorrecaoAcumulado;
    }

    public BigDecimal getValorPrincipal() {
        return this.valorPrincipal;
    }

    public void setValorPrincipal(BigDecimal valorPrincipal) {
        this.valorPrincipal = valorPrincipal;
    }

    public BigDecimal getDevidoPrincipal() {
        if (BigDecimal.ZERO.compareTo(this.getValorPrincipal()) > 0) {
            BigDecimal conversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(this.getDataInicialPeriodo()).getDate(), HelperDate.getCurrentCompetence(this.getDataFinalPeriodo()).getDate());
            return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorPrincipal(), conversaoMoeda));
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorPrincipal(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getPagoPrincipal() {
        return this.pagoPrincipal;
    }

    public void setPagoPrincipal(BigDecimal pagoPrincipal) {
        this.pagoPrincipal = pagoPrincipal;
    }

    public BigDecimal getDevidoJuroDeMoraPrincipal() {
        if (Utils.naoNulo(this.getJuroPrincipal()) && BigDecimal.ZERO.compareTo(this.getJuroPrincipal()) > 0) {
            return this.getJuroPrincipal();
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getJuroPrincipal(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getJuroPrincipal() {
        return this.juroPrincipal != null ? this.juroPrincipal : BigDecimal.ZERO;
    }

    public void setJuroPrincipal(BigDecimal juroPrincipal) {
        this.juroPrincipal = juroPrincipal;
    }

    public BigDecimal getPagoJuroDeMoraPrincipal() {
        return this.pagoJuroDeMoraPrincipal;
    }

    public void setPagoJuroDeMoraPrincipal(BigDecimal pagoJuroDeMoraPrincipal) {
        this.pagoJuroDeMoraPrincipal = pagoJuroDeMoraPrincipal;
    }

    public BigDecimal getDevidoJuroDeMoraPrincipalPeriodoAtual() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getBaseJuroDeMoraPrincipalPeriodoAtual(), this.getTaxaDeJuros().divide(Utils.CEM)));
    }

    public BigDecimal getDevidoJuroDeMoraFgtsPeriodoAtual() {
        if (BigDecimal.ZERO.compareTo(this.getDevidoFgts()) > 0) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getDevidoFgts(), this.getTaxaDeJurosFgts().divide(Utils.CEM)));
    }

    public BigDecimal getPagoJuroDeMoraPrincipalPeriodoAtual() {
        return this.pagoJuroDeMoraPrincipalPeriodoAtual;
    }

    public void setPagoJuroDeMoraPrincipalPeriodoAtual(BigDecimal pagoJuroDeMoraPrincipalPeriodoAtual) {
        this.pagoJuroDeMoraPrincipalPeriodoAtual = pagoJuroDeMoraPrincipalPeriodoAtual;
    }

    public BigDecimal getValorBaseJuroDeMoraDepoisPrimeiroEvento() {
        BigDecimal juroPrincipal = this.getJuroPrincipal();
        if (Utils.naoNulo(juroPrincipal) && BigDecimal.ZERO.compareTo(juroPrincipal) <= 0) {
            juroPrincipal = Utils.multiplicar(this.getJuroPrincipal(), this.getIndiceDeCorrecao());
        }
        return Utils.arredondarValorMonetario(Utils.somar(Utils.subtrair(juroPrincipal, this.getPagoJuroDeMoraPrincipal()), Utils.subtrair(this.getDevidoJuroDeMoraPrincipalPeriodoAtual(), this.getPagoJuroDeMoraPrincipalPeriodoAtual())));
    }

    public BigDecimal getValorDevidoJuroDeMoraDepoisPrimeiroEvento() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorBaseJuroDeMoraDepoisPrimeiroEvento(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getDiferencaJuroDeMoraPrincipalDepoisPrimeiroEvento() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getValorDevidoJuroDeMoraDepoisPrimeiroEvento(), this.getPagoJuroDeMoraPrincipal(), this.getValorDevidoJuroDeMoraDepoisPrimeiroEvento()));
    }

    public BigDecimal getValorFgts() {
        return this.valorFgts;
    }

    public void setValorFgts(BigDecimal valorFgts) {
        this.valorFgts = valorFgts;
    }

    public BigDecimal getDevidoFgts() {
        if (BigDecimal.ZERO.compareTo(this.getValorFgts()) > 0) {
            BigDecimal conversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(this.getDataInicialPeriodo()).getDate(), HelperDate.getCurrentCompetence(this.getDataFinalPeriodo()).getDate());
            return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorFgts(), conversaoMoeda));
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorFgts(), this.getIndiceDeCorrecaoFgts()));
    }

    public BigDecimal getPagoFgts() {
        return this.pagoFgts;
    }

    public void setPagoFgts(BigDecimal pagoFgts) {
        this.pagoFgts = pagoFgts;
    }

    public BigDecimal getJuroFgts() {
        return this.juroFgts;
    }

    public void setJuroFgts(BigDecimal juroFgts) {
        this.juroFgts = juroFgts;
    }

    public BigDecimal getDevidoJuroDeMoraFgtsAtePrimeiraAtualizacao() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getJuroFgts(), this.getIndiceDeCorrecaoFgts()));
    }

    public BigDecimal getDiferencaJuroDeMoraFgtsAtePrimeiraAtualizacao() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoJuroDeMoraFgtsAtePrimeiraAtualizacao(), this.getPagoJuroDeMoraFgts(), this.getDevidoJuroDeMoraFgtsAtePrimeiraAtualizacao()));
    }

    public BigDecimal getValorBaseJuroDeMoraFgtsDepoisPrimeiroEvento() {
        BigDecimal juroFgts = BigDecimal.ZERO.compareTo(this.getJuroFgts()) > 0 ? this.getJuroFgts() : Utils.arredondarValorMonetario(Utils.multiplicar(this.getJuroFgts(), this.getIndiceDeCorrecaoFgts()));
        BigDecimal juroFgtsPeriodoAtual = BigDecimal.ZERO.compareTo(this.getValorFgts()) > 0 ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorFgts(), this.getIndiceDeCorrecaoFgts()));
        return Utils.arredondarValorMonetario(Utils.somar(juroFgts, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(juroFgtsPeriodoAtual, this.getTaxaDeJurosFgts().divide(Utils.CEM))), this.getPagoJuroDeMoraFgtsPeriodoAtual())));
    }

    public BigDecimal getDiferencaJuroDeMoraFgtsDepoisPrimeiroEvento() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getValorBaseJuroDeMoraFgtsDepoisPrimeiroEvento(), this.getPagoJuroDeMoraFgts(), this.getValorBaseJuroDeMoraFgtsDepoisPrimeiroEvento()));
    }

    public BigDecimal getPagoJuroDeMoraFgts() {
        return this.pagoJuroDeMoraFgts;
    }

    public void setPagoJuroDeMoraFgts(BigDecimal pagoJuroDeMoraFgts) {
        this.pagoJuroDeMoraFgts = pagoJuroDeMoraFgts;
    }

    public BigDecimal getJuroDeMoraFgtsPeriodoAtual() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorFgts(), this.getTaxaDeJurosFgts()));
    }

    public BigDecimal getPagoJuroDeMoraFgtsPeriodoAtual() {
        return this.pagoJuroDeMoraFgtsPeriodoAtual;
    }

    public void setPagoJuroDeMoraFgtsPeriodoAtual(BigDecimal pagoJuroDeMoraFgtsPeriodoAtual) {
        this.pagoJuroDeMoraFgtsPeriodoAtual = pagoJuroDeMoraFgtsPeriodoAtual;
    }

    public BigDecimal getTaxaDeJuros() {
        return this.taxaDeJuros;
    }

    public void setTaxaDeJuros(BigDecimal taxaDeJuros) {
        this.taxaDeJuros = taxaDeJuros;
    }

    public BigDecimal getTotalJurosPrincipal() {
        return this.totalJurosPrincipal;
    }

    public void setTotalJurosPrincipal(BigDecimal totalJurosPrincipal) {
        this.totalJurosPrincipal = totalJurosPrincipal;
    }

    public BigDecimal getTotalDevidoCorrigidoSemPagamento() {
        return this.totalDevidoCorrigidoSemPagamento;
    }

    public void setTotalDevidoCorrigidoSemPagamento(BigDecimal totalDevidoCorrigidoSemPagamento) {
        this.totalDevidoCorrigidoSemPagamento = totalDevidoCorrigidoSemPagamento;
    }

    public BigDecimal getTaxaDeJurosFgts() {
        return this.taxaDeJurosFgts;
    }

    public void setTaxaDeJurosFgts(BigDecimal taxaDeJurosFgts) {
        this.taxaDeJurosFgts = taxaDeJurosFgts;
    }

    public Date getDataInicialPeriodo() {
        return this.dataInicialPeriodo;
    }

    public void setDataInicialPeriodo(Date dataInicialPeriodo) {
        this.dataInicialPeriodo = dataInicialPeriodo;
    }

    public Date getDataFinalPeriodo() {
        return this.dataFinalPeriodo;
    }

    public void setDataFinalPeriodo(Date dataFinalPeriodo) {
        this.dataFinalPeriodo = dataFinalPeriodo;
    }

    public Set<MultaDaAtualizacao> getMultasInformadas() {
        return this.multasInformadas;
    }

    public void setMultasInformadas(Set<MultaDaAtualizacao> multasInformadas) {
        this.multasInformadas = multasInformadas;
    }

    public Set<MultaDaAtualizacao> getMultasCalculadas() {
        return this.multasCalculadas;
    }

    public void setMultasCalculadas(Set<MultaDaAtualizacao> multasCalculadas) {
        this.multasCalculadas = multasCalculadas;
    }

    public String getDescritivoDeEventos() {
        return this.descritivoDeEventos;
    }

    public void setDescritivoDeEventos(String descritivoDeEventos) {
        this.descritivoDeEventos = descritivoDeEventos;
    }

    public BigDecimal getValorPrevidenciaPrivada() {
        return this.valorPrevidenciaPrivada;
    }

    public void setValorPrevidenciaPrivada(BigDecimal valorPrevidenciaPrivada) {
        this.valorPrevidenciaPrivada = valorPrevidenciaPrivada;
    }

    public BigDecimal getValorDescontoInss() {
        return this.valorDescontoInss;
    }

    public void setValorDescontoInss(BigDecimal valorDescontoInss) {
        this.valorDescontoInss = valorDescontoInss;
    }

    public BigDecimal getProporcaoJurosTributavel() {
        return this.proporcaoJurosTributavel;
    }

    public void setProporcaoJurosTributavel(BigDecimal proporcaoJurosTributavel) {
        this.proporcaoJurosTributavel = proporcaoJurosTributavel;
    }

    public BigDecimal getProporcaoPrincipalTributavel() {
        return this.proporcaoPrincipalTributavel;
    }

    public void setProporcaoPrincipalTributavel(BigDecimal proporcaoPrincipalTributavel) {
        this.proporcaoPrincipalTributavel = proporcaoPrincipalTributavel;
    }

    public BigDecimal getBasePensaoSobreJurosDoPeriodo(BigDecimal porcentagemPrincipal, BigDecimal porcentagemFgts) {
        BigDecimal proporcaoPrincipal = Utils.multiplicar(this.getDevidoJuroDeMoraPrincipalPeriodoAtual(), porcentagemPrincipal);
        BigDecimal proporcaoFgts = Utils.multiplicar(this.getDevidoJuroDeMoraFgtsPeriodoAtual(), porcentagemFgts);
        return Utils.arredondarValorMonetario(Utils.somar(proporcaoPrincipal, proporcaoFgts));
    }

    public BigDecimal getDevidoPensaoSobreJurosDoPeriodo(BigDecimal aliquota, BigDecimal porcentagemPrincipal, BigDecimal porcentagemFgts) {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getBasePensaoSobreJurosDoPeriodo(porcentagemPrincipal, porcentagemFgts), aliquota));
    }

    public BigDecimal getDiferencaPensaoSobreJurosDoPeriodo(BigDecimal aliquota, BigDecimal valorPago, BigDecimal porcentagemPrincipal, BigDecimal porcentagemFgts) {
        return Utils.subtrair(this.getDevidoPensaoSobreJurosDoPeriodo(aliquota, porcentagemPrincipal, porcentagemFgts), valorPago);
    }

    public BigDecimal getBaseMultaCalculadaSobreJurosDoPeriodo() {
        return Utils.somar(this.getDevidoJuroDeMoraPrincipalPeriodoAtual(), this.getDevidoJuroDeMoraFgtsPeriodoAtual());
    }

    public BigDecimal getDevidoMultaCalculadaSobreJurosDoPeriodo(BigDecimal aliquota) {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getBaseMultaCalculadaSobreJurosDoPeriodo(), aliquota));
    }

    public BigDecimal getDiferencaMultaCalculadaSobreJurosDoPeriodo(BigDecimal aliquota, BigDecimal valorPago) {
        return Utils.subtrair(this.getDevidoMultaCalculadaSobreJurosDoPeriodo(aliquota), valorPago, this.getDevidoMultaCalculadaSobreJurosDoPeriodo(aliquota));
    }

    private BigDecimal calcularTaxaDeJuros(Date dataInicial, Date dataFinal, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData) {
        return this.calcularTaxaDeJuros(dataInicial, dataFinal, jurosDoAjuizamento, projetarData, false);
    }

    private BigDecimal calcularTaxaDeJuros(Date dataInicial, Date dataFinal, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData, boolean isMultaHonorario) {
        TabelaDeJurosDoCalculo tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), dataInicial, dataFinal);
        return tabelaDeJuros.calcularTaxaDeJurosPagamento(dataInicial, dataFinal, jurosDoAjuizamento, projetarData, isMultaHonorario);
    }

    /*
     * WARNING - void declaration
     */
    private BigDecimal calcularTaxaDeJuros(CreditosDoReclamante creditoDoReclamante, CreditosDoReclamante creditoDoReclamanteAnterior, Date dataFinal, boolean primeiroEvento) {
        void var10_23;
        Fgts fgts;
        SeguroDesemprego sd;
        void var10_16;
        Calculo calculo = this.getCalculo();
        LinkedHashMap<CompetenciaDeJuros, ApuracaoDeJuros> mapOcorrenciasDeJuros = new LinkedHashMap<CompetenciaDeJuros, ApuracaoDeJuros>();
        HashMap<Competencia, Set<ApuracaoDeJuros>> mapApuracoesPorCompetencia = new HashMap<Competencia, Set<ApuracaoDeJuros>>();
        this.montarApuracoesDeJuros(calculo, dataFinal, mapOcorrenciasDeJuros, mapApuracoesPorCompetencia);
        if (BaseDeJurosDasVerbasEnum.VERBA_INSS.equals((Object)calculo.getParametrosDeAtualizacao().getBaseDeJurosDasVerbas()) || BaseDeJurosDasVerbasEnum.VERBA_INSS_PP.equals((Object)calculo.getParametrosDeAtualizacao().getBaseDeJurosDasVerbas())) {
            for (OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDeInssSobreSalariosDevidos : calculo.getInss().getInssSobreSalariosDevidos().getOcorrencias()) {
                calculo.apurarInclusaoJurosContribuicaoSocial(mapApuracoesPorCompetencia, ocorrenciaDeInssSobreSalariosDevidos);
            }
        }
        if (BaseDeJurosDasVerbasEnum.VERBA_INSS_PP.equals((Object)calculo.getParametrosDeAtualizacao().getBaseDeJurosDasVerbas())) {
            for (OcorrenciaDePrevidenciaPrivada ocorrenciaDePrevidenciaPrivada : calculo.getPrevidenciaPrivada().getOcorrencias()) {
                calculo.apurarInclusaoJurosPrevidenciaPrivada(mapApuracoesPorCompetencia, ocorrenciaDePrevidenciaPrivada);
            }
        }
        LinkedHashSet<ApuracaoDeJuros> apuracoesDeJuros = new LinkedHashSet<ApuracaoDeJuros>();
        for (Map.Entry entry : mapOcorrenciasDeJuros.entrySet()) {
            ApuracaoDeJuros ocorrenciaDeJuros = (ApuracaoDeJuros)entry.getValue();
            apuracoesDeJuros.add(ocorrenciaDeJuros);
        }
        OptimizerListSearch<Competencia, ApuracaoDeJuros> optimizerListSearch = new ApuracaoDeJurosOptimizerListSearch().init((Collection<ApuracaoDeJuros>)apuracoesDeJuros);
        BigDecimal bigDecimal = BigDecimal.ZERO;
        List<VerbaDeCalculo> verbasAtivas = calculo.getVerbasParaLiquidacao();
        for (VerbaDeCalculo verba : verbasAtivas) {
            if (!LogicoEnum.SIM.equals((Object)verba.getComporPrincipal())) continue;
            BigDecimal bigDecimal2 = var10_16.add(verba.getValorDeJurosParaAtualizacao(optimizerListSearch));
        }
        Date dataLiquidacaoCalculo = calculo.getDataDeLiquidacao();
        calculo.setDataDeLiquidacao(dataFinal);
        TabelaDeJurosDoCalculo tabelaDeJuros = new TabelaDeJurosDoCalculo(calculo);
        SalarioFamilia sf = calculo.getSalarioFamilia();
        if (sf.getApurarSalarioFamilia().booleanValue() && sf.isComporOPrincipal()) {
            BigDecimal totalJurosSF = BigDecimal.ZERO;
            for (OcorrenciaDeSalarioFamilia oSF : sf.getOcorrencias()) {
                BigDecimal taxaJurosSF = tabelaDeJuros.calcularTaxaDeJuros(oSF.getDataFimOcorrencia(), oSF.getDataFimOcorrencia(), true, false);
                totalJurosSF = totalJurosSF.add(Utils.aplicarJuros(taxaJurosSF, oSF.getValorDevidoCorrigido()));
            }
            BigDecimal bigDecimal3 = var10_16.add(totalJurosSF);
        }
        if ((sd = calculo.getSeguroDesemprego()).getApurarSeguroDesemprego().booleanValue() && sd.isComporOPrincipal()) {
            void var10_19;
            Date data = Utils.naoNulo(calculo.getDataDemissao()) ? calculo.getDataDemissao() : calculo.getDataTerminoCalculo();
            BigDecimal taxaJurosSD = tabelaDeJuros.calcularTaxaDeJuros(data, data, true, false);
            BigDecimal totalJurosSD = Utils.aplicarJuros(taxaJurosSD, sd.getValorDevidoCorrigido());
            BigDecimal bigDecimal4 = var10_19.add(totalJurosSD);
        }
        if ((fgts = calculo.getFgts()).getMultaDoArtigo467().booleanValue() && fgts.isComporOPrincipal()) {
            void var10_21;
            Date data = Utils.naoNulo(calculo.getDataDemissao()) ? calculo.getDataDemissao() : calculo.getDataTerminoCalculo();
            BigDecimal taxaJurosMultaFgtsArt467 = tabelaDeJuros.calcularTaxaDeJuros(data, data, true, false);
            BigDecimal totalJurosMultaFgtsArt467 = Utils.aplicarJuros(taxaJurosMultaFgtsArt467, fgts.getValorDaMultaDoArtigo467Corrigido());
            BigDecimal bigDecimal5 = var10_21.add(totalJurosMultaFgtsArt467);
        }
        calculo.setDataDeLiquidacao(dataLiquidacaoCalculo);
        creditoDoReclamante.setTotalJurosPrincipal((BigDecimal)var10_23);
        if (BigDecimal.ZERO.compareTo((BigDecimal)var10_23) >= 0 || BigDecimal.ZERO.compareTo(creditoDoReclamante.getBaseDeJurosPrincipalPrimeiroEvento()) >= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal indiceDeCorrecaoAcumulado = Utils.multiplicar(creditoDoReclamanteAnterior.getIndiceDeCorrecaoAcumulado(), creditoDoReclamante.getIndiceDeCorrecao());
        creditoDoReclamante.setIndiceDeCorrecaoAcumulado(indiceDeCorrecaoAcumulado);
        BigDecimal baseDeJurosPrincipalPrimeiroEventoCorrigido = Utils.aplicarCorrecaoMonetaria(creditoDoReclamante.getIndiceDeCorrecaoAcumulado(), creditoDoReclamante.getBaseDeJurosPrincipalPrimeiroEvento());
        BigDecimal totalJurosPrincipalPeriodoAnterior = primeiroEvento ? creditoDoReclamanteAnterior.getValorBaseJuroDeMoraDepoisPrimeiroEvento() : creditoDoReclamanteAnterior.getTotalJurosPrincipal();
        BigDecimal totalJurosPrincipalPeriodoAnteriorCorrigido = Utils.aplicarCorrecaoMonetaria(creditoDoReclamante.getIndiceDeCorrecao(), totalJurosPrincipalPeriodoAnterior);
        BigDecimal taxaJurosTotal = Utils.dividir((BigDecimal)var10_23, baseDeJurosPrincipalPrimeiroEventoCorrigido);
        BigDecimal taxaJurosPeriodoAnterior = Utils.dividir(Utils.multiplicar(totalJurosPrincipalPeriodoAnteriorCorrigido, taxaJurosTotal), (BigDecimal)var10_23);
        BigDecimal taxaJurosPeriodoAtual = Utils.subtrair(taxaJurosTotal, taxaJurosPeriodoAnterior);
        return Utils.multiplicar(taxaJurosPeriodoAtual, Utils.CEM);
    }

    private void montarApuracoesDeJuros(Calculo calculo, Date dataFinal, Map<CompetenciaDeJuros, ApuracaoDeJuros> mapOcorrenciasDeJuros, Map<Competencia, Set<ApuracaoDeJuros>> mapApuracoesPorCompetencia) {
        HashMap<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro = new HashMap<Competencia, BigDecimal>();
        HashMap<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocial = new HashMap<Competencia, BigDecimal>();
        HashMap<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaPrevidenciaPrivada = new HashMap<Competencia, BigDecimal>();
        for (VerbaDeCalculo verba : calculo.getVerbasAtivas()) {
            if (LogicoEnum.NAO.equals((Object)verba.getComporPrincipal())) continue;
            for (OcorrenciaDeVerba ocorrencia : verba.getOcorrenciasAtivas()) {
                this.montarApuracoesDeJuros(calculo, dataFinal, mapOcorrenciasDeJuros, mapApuracoesPorCompetencia, mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro, mapValorTotalPorCompetenciaParaContribuicaoSocial, mapValorTotalPorCompetenciaParaPrevidenciaPrivada, verba, ocorrencia);
            }
        }
    }

    private void montarApuracoesDeJuros(Calculo calculo, Date dataFinal, Map<CompetenciaDeJuros, ApuracaoDeJuros> mapOcorrenciasDeJuros, Map<Competencia, Set<ApuracaoDeJuros>> mapApuracoesPorCompetencia, Map<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro, Map<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocial, Map<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaPrevidenciaPrivada, VerbaDeCalculo verba, OcorrenciaDeVerba ocorrencia) {
        BigDecimal base;
        Competencia competencia;
        Set<ApuracaoDeJuros> conjuntoDeApuracoesNaCompetencia;
        Date dataVencimentoOcorrencia = verba.isCaracteristicaFerias() ? ocorrencia.getDataInicial() : ocorrencia.getDataFinal();
        Date dataLiquidacaoCalculo = calculo.getDataDeLiquidacao();
        calculo.setDataDeLiquidacao(dataFinal);
        TabelaDeJurosDoCalculo tabelaDeJuros = new TabelaDeJurosDoCalculo(calculo);
        tabelaDeJuros.calcularTaxaDeJuros(ocorrencia.getDataInicial(), dataVencimentoOcorrencia, verba.getJurosDoAjuizamento(), true, false);
        Date dataInicioJuros = tabelaDeJuros.getDataInicialDeJuros();
        if (HelperDate.dateEquals(HelperDate.getCurrentCompetence(dataVencimentoOcorrencia).getDate(), HelperDate.getCurrentCompetence(calculo.getDataAjuizamento()).getDate()) && tabelaDeJuros.isSelicIndiceNoAjuizamentoSemCombinacao()) {
            dataInicioJuros = HelperDate.getInstance(dataVencimentoOcorrencia).lastDayOfTheMonth().getDate();
        }
        BigDecimal taxaDeJuros = tabelaDeJuros.calcularTaxaDeJuros(dataInicioJuros, dataVencimentoOcorrencia, verba.getJurosDoAjuizamento(), true, false);
        calculo.setDataDeLiquidacao(dataLiquidacaoCalculo);
        CompetenciaDeJuros competenciaDeJuros = CompetenciaDeJuros.getInstance(ocorrencia.getDataInicial(), dataInicioJuros);
        ApuracaoDeJuros ocorrenciaDeJuros = mapOcorrenciasDeJuros.get(competenciaDeJuros);
        if (Utils.nulo(ocorrenciaDeJuros)) {
            ocorrenciaDeJuros = new ApuracaoDeJuros(calculo);
            ocorrenciaDeJuros.setCompetencia(competenciaDeJuros.getData());
            ocorrenciaDeJuros.setDataInicial(competenciaDeJuros.getDataInicial());
            ocorrenciaDeJuros.setTaxaDeJuros(taxaDeJuros);
            mapOcorrenciasDeJuros.put(competenciaDeJuros, ocorrenciaDeJuros);
        }
        if (Utils.nulo(conjuntoDeApuracoesNaCompetencia = mapApuracoesPorCompetencia.get(competencia = Competencia.getInstance(ocorrencia.getDataInicial())))) {
            conjuntoDeApuracoesNaCompetencia = new HashSet<ApuracaoDeJuros>();
            mapApuracoesPorCompetencia.put(competencia, conjuntoDeApuracoesNaCompetencia);
        }
        conjuntoDeApuracoesNaCompetencia.add(ocorrenciaDeJuros);
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(this.getCalculo().getAtualizacaoMonetaria(), this.getCalculo().getIndicesAcumulados(), null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetaria.carregarTabela(new Periodo(this.getCalculo().getDataAdmissao(), dataFinal));
        tabelaDeCorrecaoMonetaria.setOcorrenciaDePagamento(verba.getOcorrenciaDePagamento());
        ocorrencia.setIndiceAcumuladoAtualizacao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(ocorrencia.getDataInicial()));
        ocorrenciaDeJuros.setValorCorrigido(Utils.somar(ocorrenciaDeJuros.getValorCorrigido(), ocorrencia.getDiferencaCorrigidaParaAtualizacao()));
        if (Boolean.TRUE.equals(verba.getIncidenciaINSS())) {
            switch (verba.getCaracteristica()) {
                case DECIMO_TERCEIRO_SALARIO: {
                    calculo.apurarVerbaIncideInssDecimoTerceiro(mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro, ocorrencia, competencia, ocorrenciaDeJuros);
                    break;
                }
                case FERIAS: {
                    calculo.apurarVerbaIncideInssFerias(mapValorTotalPorCompetenciaParaContribuicaoSocial, ocorrencia, competencia, ocorrenciaDeJuros);
                    break;
                }
                case AVISO_PREVIO: 
                case COMUM: {
                    calculo.apurarVerbaIncideInssAvisoOuComum(mapValorTotalPorCompetenciaParaContribuicaoSocial, ocorrencia, competencia, ocorrenciaDeJuros);
                }
            }
        }
        if (verba.getIncidenciaPrevidenciaPrivada().booleanValue() && verba.isCaracteristicaFerias()) {
            base = ocorrencia.getDiferencaParaCalculoDasIncidencias();
            if (Utils.naoNulo(base)) {
                ocorrenciaDeJuros.setValorVerbaParaPrevidenciaPrivada(ocorrenciaDeJuros.getValorVerbaParaPrevidenciaPrivada().add(base, Utils.CONTEXTO_MATEMATICO));
                BigDecimal valorCompetencia = mapValorTotalPorCompetenciaParaPrevidenciaPrivada.get(competencia);
                if (Utils.nulo(valorCompetencia)) {
                    valorCompetencia = BigDecimal.ZERO;
                    mapValorTotalPorCompetenciaParaPrevidenciaPrivada.put(competencia, valorCompetencia);
                }
                valorCompetencia = Utils.somar(valorCompetencia, base, valorCompetencia);
            }
        } else if (verba.getIncidenciaPrevidenciaPrivada().booleanValue() && !verba.isCaracteristicaFerias()) {
            BigDecimal diferenca = Utils.arredondarValorMonetario(ocorrencia.getDiferenca());
            ocorrenciaDeJuros.setValorVerbaParaPrevidenciaPrivada(ocorrenciaDeJuros.getValorVerbaParaPrevidenciaPrivada().add(diferenca, Utils.CONTEXTO_MATEMATICO));
            BigDecimal valorCompetencia = mapValorTotalPorCompetenciaParaPrevidenciaPrivada.get(competencia);
            if (Utils.nulo(valorCompetencia)) {
                valorCompetencia = BigDecimal.ZERO;
                mapValorTotalPorCompetenciaParaPrevidenciaPrivada.put(competencia, valorCompetencia);
            }
            valorCompetencia = Utils.somar(valorCompetencia, diferenca, valorCompetencia);
        }
        if (Boolean.TRUE.equals(verba.getIncidenciaIRPF())) {
            switch (verba.getCaracteristica()) {
                case DECIMO_TERCEIRO_SALARIO: {
                    ocorrenciaDeJuros.setValorCorrigidoParaIrpfDecimoTerceiro(ocorrenciaDeJuros.getValorCorrigidoParaIrpfDecimoTerceiro().add(ocorrencia.getDiferencaCorrigida(), Utils.CONTEXTO_MATEMATICO));
                    break;
                }
                case FERIAS: {
                    base = ocorrencia.getDiferencaCorrigidaParaCalculoDasIncidencias();
                    if (!Utils.naoNulo(base)) break;
                    ocorrenciaDeJuros.setValorCorrigidoParaIrpfFerias(ocorrenciaDeJuros.getValorCorrigidoParaIrpfFerias().add(base, Utils.CONTEXTO_MATEMATICO));
                    break;
                }
                case AVISO_PREVIO: 
                case COMUM: {
                    ocorrenciaDeJuros.setValorCorrigidoParaIrpfDemaisVerbas(ocorrenciaDeJuros.getValorCorrigidoParaIrpfDemaisVerbas().add(ocorrencia.getDiferencaCorrigida(), Utils.CONTEXTO_MATEMATICO));
                }
            }
        }
    }

    private BigDecimal getDescontoInssCorrigido() {
        if (!this.getCalculo().getInss().getInssSobreSalariosDevidos().getCorrigirDescontoReclamante().booleanValue()) {
            return Utils.arredondarValorMonetario(this.getValorDescontoInss());
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDescontoInss(), this.getIndiceDeCorrecao()));
    }

    private BigDecimal getPrevidenciaPrivadaCorrigido() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorPrevidenciaPrivada(), this.getIndiceDeCorrecaoPrevidenciaPrivada()));
    }

    public BigDecimal getBaseJuroDeMoraPrincipalPeriodoAtual() {
        if (this.getCalculo().getParametrosDeAtualizacao().getBaseDeJurosDasVerbas().equals((Object)BaseDeJurosDasVerbasEnum.VERBAS) || this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            return BigDecimal.ZERO.compareTo(this.getValorPrincipal()) > 0 ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorPrincipal(), this.getIndiceDeCorrecao()));
        }
        BigDecimal valorPrincipal = Utils.multiplicar(this.getValorPrincipal(), this.getIndiceDeCorrecao());
        if (this.getCalculo().getParametrosDeAtualizacao().getBaseDeJurosDasVerbas().equals((Object)BaseDeJurosDasVerbasEnum.VERBA_INSS)) {
            valorPrincipal = Utils.subtrair(valorPrincipal, Utils.zerarSeNegativo(this.getValorDescontoInss()), valorPrincipal);
        }
        if (this.getCalculo().getParametrosDeAtualizacao().getBaseDeJurosDasVerbas().equals((Object)BaseDeJurosDasVerbasEnum.VERBA_INSS_PP)) {
            valorPrincipal = Utils.subtrair(valorPrincipal, Utils.zerarSeNegativo(this.getValorPrevidenciaPrivada()), valorPrincipal);
            valorPrincipal = Utils.subtrair(valorPrincipal, Utils.zerarSeNegativo(this.getValorDescontoInss()), valorPrincipal);
        }
        return BigDecimal.ZERO.compareTo(valorPrincipal) > 0 ? BigDecimal.ZERO : Utils.arredondarValorMonetario(valorPrincipal);
    }

    public BigDecimal getBaseDeJurosPrincipalPrimeiroEvento() {
        return this.baseDeJurosPrincipalPrimeiroEvento;
    }

    public void setBaseDeJurosPrincipalPrimeiroEvento(BigDecimal baseDeJurosPrincipalPrimeiroEvento) {
        this.baseDeJurosPrincipalPrimeiroEvento = baseDeJurosPrincipalPrimeiroEvento;
    }

    public BigDecimal getDiferencaPrincipal() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoPrincipal(), this.getPagoPrincipal(), this.getDevidoPrincipal()));
    }

    public BigDecimal getDiferencaJuroDeMoraPrincipal() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoJuroDeMoraPrincipal(), this.getPagoJuroDeMoraPrincipal(), this.getDevidoJuroDeMoraPrincipal()));
    }

    public BigDecimal getDiferencaJuroDeMoraPrincipalPeriodoAtual() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoJuroDeMoraPrincipalPeriodoAtual(), this.getPagoJuroDeMoraPrincipalPeriodoAtual(), this.getDevidoJuroDeMoraPrincipalPeriodoAtual()));
    }

    public BigDecimal getDiferencaFgts() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoFgts(), this.getPagoFgts(), this.getDevidoFgts()));
    }

    public BigDecimal getDiferencaJuroDeMoraFgts() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoJuroDeMoraFgts(), this.getPagoJuroDeMoraFgts(), this.getDevidoJuroDeMoraFgts()));
    }

    public BigDecimal getDevidoJuroDeMoraFgts() {
        if (BigDecimal.ZERO.compareTo(this.getJuroFgts()) > 0) {
            return this.getJuroFgts();
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getJuroFgts(), this.getIndiceDeCorrecaoFgts()));
    }

    public BigDecimal getDiferencaJuroDeMoraFgtsPeriodoAtual() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoJuroDeMoraFgtsPeriodoAtual(), this.getPagoJuroDeMoraFgtsPeriodoAtual(), this.getDevidoJuroDeMoraFgtsPeriodoAtual()));
    }

    public BigDecimal getTotalDevido() {
        return this.totalDevido;
    }

    public void setTotalDevido(BigDecimal totalDevido) {
        this.totalDevido = totalDevido;
    }

    public BigDecimal getTotalPago() {
        return this.totalPago;
    }

    public void setTotalPago(BigDecimal totalPago) {
        this.totalPago = totalPago;
    }

    public BigDecimal getTotalDiferenca() {
        return this.totalDiferenca;
    }

    public void setTotalDiferenca(BigDecimal totalDiferenca) {
        this.totalDiferenca = totalDiferenca;
    }

    public CreditosDoReclamante liquidarCreditosReclamante(Date dataInicialParaLiquidacao, Date dataFinalParaLiquidacao, CreditosDoReclamante creditoDoReclamanteAnterior, Pagamento pagamento, Multa multaDoEvento, DebitosDoReclamante debitoReclamanteAnterior, boolean primeiroEvento) throws NegocioException {
        MultaDaAtualizacao multaDaAtualizacao;
        HashMap<IndiceMonetarioEnum, BigDecimal> mapaDeIndices = new HashMap<IndiceMonetarioEnum, BigDecimal>();
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(this.getCalculo().getAtualizacaoMonetaria(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
        BigDecimal indiceDeCorrecao = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
        BigDecimal indiceDeCorrecaoDoFgts = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
        BigDecimal indiceDeCorrecaoDaPrevPrivada = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
        HelperDate dataInicialParaLiquidacaoMaisUm = HelperDate.getInstance(dataInicialParaLiquidacao).addDay(1);
        BigDecimal taxaDeJurosDoFgts = this.calcularTaxaDeJuros(dataInicialParaLiquidacaoMaisUm.getDate(), dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
        switch (this.getCalculo().getParametrosDeAtualizacao().getIndiceDeCorrecaoDoFGTS()) {
            case UTILIZAR_INDICE_JAM: {
                TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaFgts = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, IndiceMonetarioEnum.JAM, IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                tabelaDeCorrecaoMonetariaFgts.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                indiceDeCorrecaoDoFgts = tabelaDeCorrecaoMonetariaFgts.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
                if (this.getCalculo().getParametrosDeAtualizacao().getJurosDeFgtsComJam().booleanValue()) break;
                taxaDeJurosDoFgts = BigDecimal.ZERO;
                break;
            }
            case UTILIZAR_INDICE_JAM_E_TRABALHISTA: {
                TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaFgts;
                if (Utils.naoNulo(this.getCalculo().getDataDemissao())) {
                    TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhistaCombinadaParaFgts = new TabelaDeCorrecaoMonetaria(Boolean.TRUE, this.getCalculo().getAtualizacaoMonetaria(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                    tabelaDeCorrecaoMonetariaTrabalhistaCombinadaParaFgts.carregarTabelaTrabalhistaCombinadaParaFgts(new Periodo(HelperDate.getInstance(this.getCalculo().getDataDemissao()).addDay(1).getDate(), dataFinalParaLiquidacao), this.getCalculo());
                    HelperDate dataDemissaoMaisUmDia = HelperDate.getInstance(this.getCalculo().getDataDemissao()).addDay(1);
                    BigDecimal indiceDeCorrecaoTrabalhistaParaCombinar = tabelaDeCorrecaoMonetariaTrabalhistaCombinadaParaFgts.obterValorAcumuladoDoIndice(this.getCalculo().getDataDemissao());
                    if (HelperDate.dateAfter(dataDemissaoMaisUmDia.getDate(), dataInicialParaLiquidacao) && HelperDate.dateBeforeOrEquals(dataDemissaoMaisUmDia.getDate(), dataFinalParaLiquidacao)) {
                        tabelaDeCorrecaoMonetariaFgts = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, IndiceMonetarioEnum.JAM, IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                        tabelaDeCorrecaoMonetariaFgts.carregarTabela(new Periodo(dataInicialParaLiquidacao, this.getCalculo().getDataDemissao()));
                        indiceDeCorrecaoDoFgts = tabelaDeCorrecaoMonetariaFgts.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
                        indiceDeCorrecaoDoFgts = indiceDeCorrecaoDoFgts.multiply(indiceDeCorrecaoTrabalhistaParaCombinar, Utils.CONTEXTO_MATEMATICO);
                        taxaDeJurosDoFgts = this.calcularTaxaDeJuros(dataDemissaoMaisUmDia.getDate(), dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
                        break;
                    }
                    if (!HelperDate.dateAfter(dataDemissaoMaisUmDia.getDate(), dataFinalParaLiquidacao)) break;
                    tabelaDeCorrecaoMonetariaFgts = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, IndiceMonetarioEnum.JAM, IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                    tabelaDeCorrecaoMonetariaFgts.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                    indiceDeCorrecaoDoFgts = tabelaDeCorrecaoMonetariaFgts.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
                    taxaDeJurosDoFgts = BigDecimal.ZERO;
                    break;
                }
                tabelaDeCorrecaoMonetariaFgts = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, IndiceMonetarioEnum.JAM, IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                tabelaDeCorrecaoMonetariaFgts.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                indiceDeCorrecaoDoFgts = tabelaDeCorrecaoMonetariaFgts.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
                taxaDeJurosDoFgts = BigDecimal.ZERO;
                break;
            }
        }
        if (OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE.equals((Object)this.getCalculo().getParametrosDeAtualizacao().getIndiceDeCorrecaoDePrevidenciaPrivada())) {
            TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaPrevPriv = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, this.getCalculo().getParametrosDeAtualizacao().getOutroIndiceDeCorrecaoDePrevidenciaPrivada(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
            tabelaDeCorrecaoMonetariaPrevPriv.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
            indiceDeCorrecaoDaPrevPrivada = tabelaDeCorrecaoMonetariaPrevPriv.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
        }
        CreditosDoReclamante creditoDoReclamantePagamento = new CreditosDoReclamante();
        if (primeiroEvento) {
            creditoDoReclamantePagamento.setBaseDeJurosPrincipalPrimeiroEvento(creditoDoReclamanteAnterior.getBaseJuroDeMoraPrincipalPeriodoAtual());
        } else {
            creditoDoReclamantePagamento.setBaseDeJurosPrincipalPrimeiroEvento(creditoDoReclamanteAnterior.getBaseDeJurosPrincipalPrimeiroEvento());
        }
        if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            Periodo periodoDaGraca = ServicoAtualizacaoUtils.montarPeriodoDaGraca(this.getAtualizacao());
            Periodo periodoAtualizacao = new Periodo(HelperDate.getInstance(dataInicialParaLiquidacao).addDay(1).getDate(), dataFinalParaLiquidacao);
            BigDecimal indiceDeCorrecaoPrecatorio = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, this.getAtualizacao().getDataInicioAplicarEC1362025(), this.getAtualizacao().getGrupoEsferaPrecatorio(), false);
            BigDecimal indiceDeCorrecaoParaJurosPrecatorio = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, this.getAtualizacao().getDataInicioAplicarEC1362025(), this.getAtualizacao().getGrupoEsferaPrecatorio(), true);
            BigDecimal taxaDeJurosPrecatorio = ServicoAtualizacaoUtils.encontrarTaxaDeJurosPrecatorioSIP(periodoAtualizacao.getInicial(), periodoAtualizacao.getFinal(), this.getAtualizacao().getDataInicioAplicarEC1362025(), periodoDaGraca);
            creditoDoReclamantePagamento.setIndiceDeCorrecao(indiceDeCorrecaoPrecatorio);
            creditoDoReclamantePagamento.setIndiceDeCorrecaoParaJuros(indiceDeCorrecaoParaJurosPrecatorio);
            creditoDoReclamantePagamento.setIndiceDeCorrecaoFgts(indiceDeCorrecaoPrecatorio);
            creditoDoReclamantePagamento.setIndiceDeCorrecaoPrevidenciaPrivada(indiceDeCorrecaoPrecatorio);
            creditoDoReclamantePagamento.setTaxaDeJuros(taxaDeJurosPrecatorio);
            creditoDoReclamantePagamento.setTaxaDeJurosFgts(taxaDeJurosPrecatorio);
        } else {
            creditoDoReclamantePagamento.setIndiceDeCorrecao(indiceDeCorrecao);
            creditoDoReclamantePagamento.setIndiceDeCorrecaoFgts(indiceDeCorrecaoDoFgts);
            creditoDoReclamantePagamento.setIndiceDeCorrecaoPrevidenciaPrivada(indiceDeCorrecaoDaPrevPrivada);
            BigDecimal taxaDeJuros = this.calcularTaxaDeJuros(dataInicialParaLiquidacaoMaisUm.getDate(), dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
            creditoDoReclamantePagamento.setTaxaDeJuros(taxaDeJuros);
            creditoDoReclamantePagamento.setTaxaDeJurosFgts(taxaDeJurosDoFgts);
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento != null && multaDoEvento != null) {
            creditoDoReclamantePagamento = creditoDoReclamanteAnterior;
            creditoDoReclamantePagamento = this.incluirMulta(creditoDoReclamantePagamento, multaDoEvento);
            creditoDoReclamantePagamento.setTotalDevido(creditoDoReclamantePagamento.calcularTotalDevido());
            return creditoDoReclamantePagamento;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento == null && multaDoEvento != null) {
            creditoDoReclamantePagamento = creditoDoReclamanteAnterior;
            this.incluirMulta(creditoDoReclamantePagamento, multaDoEvento);
            creditoDoReclamantePagamento.setTotalDevido(creditoDoReclamantePagamento.calcularTotalDevido());
            creditoDoReclamantePagamento.setTotalPago(creditoDoReclamantePagamento.calcularTotalPago());
            creditoDoReclamantePagamento.setTotalDiferenca(creditoDoReclamantePagamento.calcularTotalDiferenca());
            return creditoDoReclamantePagamento;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento != null && multaDoEvento == null) {
            creditoDoReclamantePagamento = creditoDoReclamanteAnterior;
            creditoDoReclamantePagamento.setTotalDevido(creditoDoReclamantePagamento.calcularTotalDevido());
            return creditoDoReclamantePagamento;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento == null && multaDoEvento == null) {
            creditoDoReclamantePagamento = creditoDoReclamanteAnterior;
            creditoDoReclamantePagamento.setTotalDevido(creditoDoReclamantePagamento.calcularTotalDevido());
            creditoDoReclamantePagamento.setTotalPago(creditoDoReclamantePagamento.calcularTotalPago());
            creditoDoReclamantePagamento.setTotalDiferenca(creditoDoReclamantePagamento.calcularTotalDiferenca());
            return creditoDoReclamantePagamento;
        }
        creditoDoReclamantePagamento.setPagoPrincipal(BigDecimal.ZERO);
        creditoDoReclamantePagamento.setPagoJuroDeMoraPrincipal(BigDecimal.ZERO);
        creditoDoReclamantePagamento.setPagoJuroDeMoraPrincipalPeriodoAtual(BigDecimal.ZERO);
        creditoDoReclamantePagamento.setPagoFgts(BigDecimal.ZERO);
        creditoDoReclamantePagamento.setPagoJuroDeMoraFgts(BigDecimal.ZERO);
        creditoDoReclamantePagamento.setPagoJuroDeMoraFgtsPeriodoAtual(BigDecimal.ZERO);
        creditoDoReclamantePagamento.setAtualizacao(this.getAtualizacao());
        creditoDoReclamantePagamento.setDataInicialPeriodo(dataInicialParaLiquidacao);
        creditoDoReclamantePagamento.setDataFinalPeriodo(dataFinalParaLiquidacao);
        creditoDoReclamantePagamento.setValorPrincipal(Utils.arredondarValorMonetario(creditoDoReclamanteAnterior.getDiferencaPrincipal()));
        creditoDoReclamantePagamento.setValorPrevidenciaPrivada(Utils.arredondarValorMonetario(Utils.multiplicar(debitoReclamanteAnterior.getDiferencaPrevidenciaPrivada(), indiceDeCorrecao)));
        creditoDoReclamantePagamento.setValorDescontoInss(this.calcularDescontoInss(debitoReclamanteAnterior.getDiferencaInss(), indiceDeCorrecao));
        creditoDoReclamantePagamento.setValorFgts(Utils.arredondarValorMonetario(creditoDoReclamanteAnterior.getDiferencaFgts()));
        if (dataFinalParaLiquidacao == this.getCalculo().getDataDeLiquidacao() || dataInicialParaLiquidacao == this.getCalculo().getDataDeLiquidacao()) {
            creditoDoReclamantePagamento.setJuroPrincipal(Utils.arredondarValorMonetario(creditoDoReclamanteAnterior.getDiferencaJuroDeMoraPrincipal()));
            creditoDoReclamantePagamento.setJuroFgts(Utils.arredondarValorMonetario(creditoDoReclamanteAnterior.getDiferencaJuroDeMoraFgts()));
        } else {
            creditoDoReclamantePagamento.setJuroPrincipal(creditoDoReclamanteAnterior.getValorBaseJuroDeMoraDepoisPrimeiroEvento());
            creditoDoReclamantePagamento.setJuroFgts(Utils.arredondarValorMonetario(creditoDoReclamanteAnterior.getDiferencaJuroDeMoraFgtsDepoisPrimeiroEvento()));
        }
        creditoDoReclamantePagamento.setProporcaoPrincipalTributavel(creditoDoReclamanteAnterior.getProporcaoPrincipalTributavel());
        creditoDoReclamantePagamento.setProporcaoJurosTributavel(creditoDoReclamanteAnterior.getProporcaoJurosTributavel());
        for (MultaDaAtualizacao multaAnterior : creditoDoReclamanteAnterior.getMultasCalculadas()) {
            multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setMulta(multaAnterior.getMulta());
            multaDaAtualizacao.setTipoVinculo(multaAnterior.getTipoVinculo());
            multaDaAtualizacao.setTipoValorDaMulta(multaAnterior.getTipoValorDaMulta());
            multaDaAtualizacao.setValorMulta(multaDaAtualizacao.calcularValorDaMultaCalculadaCreditosDoReclamante(creditoDoReclamantePagamento, this, multaAnterior, multaAnterior.getIndiceDeCorrecao(), creditoDoReclamantePagamento.getValorPrevidenciaPrivada(), creditoDoReclamantePagamento.getValorDescontoInss(), dataFinalParaLiquidacao));
            multaDaAtualizacao.setValorJuros(multaAnterior.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM)));
            multaDaAtualizacao.setJaCalculadoUmaVez(multaAnterior.getJaCalculadoUmaVez());
            multaDaAtualizacao.setCreditoDoReclamantePagamento(creditoDoReclamantePagamento);
            multaDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            creditoDoReclamantePagamento.getMultasCalculadas().add(multaDaAtualizacao);
        }
        for (MultaDaAtualizacao multaAnterior : creditoDoReclamanteAnterior.getMultasInformadas()) {
            BigDecimal conversaoMoeda;
            BigDecimal valorJuros;
            BigDecimal valorMulta;
            multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setMulta(multaAnterior.getMulta());
            multaDaAtualizacao.setTipoVinculo(multaAnterior.getTipoVinculo());
            multaDaAtualizacao.setTipoValorDaMulta(multaAnterior.getTipoValorDaMulta());
            multaDaAtualizacao.setCreditoDoReclamantePagamento(creditoDoReclamantePagamento);
            multaDaAtualizacao.setPrimeiroEventoProcessado(multaAnterior.getPrimeiroEventoProcessado());
            if (OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE.equals((Object)multaDaAtualizacao.getMulta().getOpcaoIndiceDeCorrecaoDaMulta())) {
                if (Utils.naoNulo(mapaDeIndices.get((Object)multaDaAtualizacao.getMulta().getOutroIndiceDeCorrecaoDaMulta()))) {
                    multaDaAtualizacao.setIndiceDeCorrecao((BigDecimal)mapaDeIndices.get((Object)multaDaAtualizacao.getMulta().getOutroIndiceDeCorrecaoDaMulta()));
                } else {
                    TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaMulta = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, multaDaAtualizacao.getMulta().getOutroIndiceDeCorrecaoDaMulta(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                    tabelaDeCorrecaoMonetariaMulta.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                    BigDecimal indiceMulta = tabelaDeCorrecaoMonetariaMulta.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
                    mapaDeIndices.put(multaDaAtualizacao.getMulta().getOutroIndiceDeCorrecaoDaMulta(), indiceMulta);
                    multaDaAtualizacao.setIndiceDeCorrecao(indiceMulta);
                }
            } else {
                multaDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
            }
            Date dataInicioDeJuros = AtualizacaoUtils.testarExistenciaJurosDeAte(new Periodo(creditoDoReclamantePagamento.getDataInicialPeriodo(), creditoDoReclamantePagamento.getDataFinalPeriodo()), dataInicialParaLiquidacaoMaisUm.getDate(), multaAnterior.getMulta().getOrigemRegistro(), this.getCalculo(), multaAnterior.getMulta().getDataApartirDeAplicarJuros(), multaAnterior.getMulta().getDataEvento(), multaAnterior.getPrimeiroEventoProcessado() == false);
            if (!multaDaAtualizacao.getPrimeiroEventoProcessado().booleanValue() && (dataFinalParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()) || dataInicialParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()))) {
                valorMulta = multaAnterior.getMulta().getValorCorrigido();
                valorJuros = multaAnterior.devidoJuroMultaInformadaPrimeiroEvento(multaAnterior.getIndiceDeCorrecao());
                if (CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor())) {
                    conversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(this.getDataInicialPeriodo()).getDate(), HelperDate.getCurrentCompetence(this.getDataFinalPeriodo()).getDate());
                    valorMulta = BigDecimal.ZERO.compareTo(multaAnterior.getValorMulta()) > 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), conversaoMoeda)) : valorMulta;
                    valorJuros = BigDecimal.ZERO.compareTo(multaAnterior.getValorJuros()) > 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorJuros(), conversaoMoeda)) : valorJuros;
                } else {
                    valorMulta = valorMulta.negate();
                    valorJuros = valorJuros.negate();
                }
                multaDaAtualizacao.setValorJuros(valorJuros);
                multaDaAtualizacao.setValorMulta(valorMulta);
                multaDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
            } else {
                valorMulta = Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao());
                valorJuros = multaAnterior.devidoJuroMultaInformadaDepoisPrimeiroEvento();
                if (CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor())) {
                    conversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(this.getDataInicialPeriodo()).getDate(), HelperDate.getCurrentCompetence(this.getDataFinalPeriodo()).getDate());
                    valorMulta = BigDecimal.ZERO.compareTo(multaAnterior.getValorMulta()) > 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), conversaoMoeda)) : valorMulta;
                    valorJuros = BigDecimal.ZERO.compareTo(multaAnterior.getValorJuros()) > 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorJuros(), conversaoMoeda)) : valorJuros;
                }
                multaDaAtualizacao.setValorMulta(Utils.arredondarValorMonetario(Utils.subtrair(valorMulta, multaAnterior.getPagoMulta())));
                BigDecimal anterior = BigDecimal.ZERO;
                if (Utils.naoNulo(dataInicioDeJuros) && (BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) <= 0 || CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor()))) {
                    anterior = multaAnterior.valorJurosMultaInformadaPeriodoAnterior();
                }
                multaDaAtualizacao.setValorJuros(Utils.somar(Utils.subtrair(valorJuros, multaAnterior.getPagoJuro()), Utils.subtrair(anterior, multaAnterior.getPagoJuroPeriodoAtual())));
            }
            BigDecimal taxaJurosMulta = BigDecimal.ZERO;
            if (Utils.naoNulo(dataInicioDeJuros)) {
                taxaJurosMulta = this.calcularTaxaDeJuros(dataInicioDeJuros, dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
            }
            multaDaAtualizacao.setTaxaJurosMulta(Utils.arredondarValor(taxaJurosMulta, 4));
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            creditoDoReclamantePagamento.getMultasInformadas().add(multaDaAtualizacao);
        }
        if (Utils.naoNulo(multaDoEvento)) {
            creditoDoReclamantePagamento = this.incluirMulta(creditoDoReclamantePagamento, multaDoEvento);
        }
        creditoDoReclamantePagamento.setTotalDevido(creditoDoReclamantePagamento.calcularTotalDevido());
        if (Utils.nulo(pagamento)) {
            creditoDoReclamantePagamento.setTotalPago(creditoDoReclamantePagamento.calcularTotalPago());
            creditoDoReclamantePagamento.setTotalDiferenca(creditoDoReclamantePagamento.calcularTotalDiferenca());
        }
        return creditoDoReclamantePagamento;
    }

    private BigDecimal calcularDescontoInss(BigDecimal valorDesconto, BigDecimal indiceCorrecao) {
        if (!(this.getCalculo().getInss().getInssSobreSalariosDevidos().getCorrigirDescontoReclamante().booleanValue() || HelperDate.dateAfter(this.getDataInicialPeriodo(), ConversaoDeMoedas.obterDataUltimaConversaoDeMoeda()) || HelperDate.dateEquals(this.getDataFinalPeriodo(), this.getCalculo().getDataDeLiquidacao()))) {
            BigDecimal conversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(this.getDataInicialPeriodo()).getDate(), HelperDate.getCurrentCompetence(this.getDataFinalPeriodo()).getDate());
            return Utils.arredondarValorMonetario(Utils.multiplicar(valorDesconto, conversaoMoeda));
        }
        if (!this.getCalculo().getInss().getInssSobreSalariosDevidos().getCorrigirDescontoReclamante().booleanValue()) {
            return Utils.arredondarValorMonetario(valorDesconto);
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(valorDesconto, indiceCorrecao));
    }

    public CreditosDoReclamante aplicarPagamento(CreditosDoReclamante creditoDoReclamantePagamento, Pagamento pagamento) {
        if (pagamento.getPriorizarPagamentoDeJuros().booleanValue()) {
            this.pagarPrincipalComPriorizacaoDeJuros(creditoDoReclamantePagamento, pagamento);
            this.pagarFgtsComPriorizacaoDeJuros(creditoDoReclamantePagamento, pagamento);
            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) < 0 || BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado()) > 0) {
                HashMap<MultaDaAtualizacao, BigDecimal> pagosMultaDevidasReclamanteValorDeMulta = new HashMap<MultaDaAtualizacao, BigDecimal>();
                HashMap<MultaDaAtualizacao, BigDecimal> pagosJurosDevidasReclamanteValorDeMulta = new HashMap<MultaDaAtualizacao, BigDecimal>();
                HashMap<MultaDaAtualizacao, BigDecimal> pagosMultaDevidasReclamadoValorDeMulta = new HashMap<MultaDaAtualizacao, BigDecimal>();
                HashMap<MultaDaAtualizacao, BigDecimal> pagosJurosDevidasReclamadoValorDeMulta = new HashMap<MultaDaAtualizacao, BigDecimal>();
                HashMap<MultaDaAtualizacao, BigDecimal> pagosJurosDevidasReclamanteValorDeJuros = new HashMap<MultaDaAtualizacao, BigDecimal>();
                HashMap<MultaDaAtualizacao, BigDecimal> pagosJurosPeriodoAtualDevidasReclamanteValorDeJuros = new HashMap<MultaDaAtualizacao, BigDecimal>();
                HashMap<MultaDaAtualizacao, BigDecimal> pagosJurosDevidasReclamadoValorDeJuros = new HashMap<MultaDaAtualizacao, BigDecimal>();
                HashMap<MultaDaAtualizacao, BigDecimal> pagosJurosPeriodoAtualDevidasReclamadoValorDeJuros = new HashMap<MultaDaAtualizacao, BigDecimal>();
                creditoDoReclamantePagamento.calculaTotalDevidoDasMultasDevidasAoReclamanteEAoReclamado();
                BigDecimal valorParaPagamentoDoValorDeMultasDevidasAoReclamante = BigDecimal.ZERO;
                BigDecimal valorParaPagamentoDoValorDeMultasDevidasAoReclamado = BigDecimal.ZERO;
                if (pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante().compareTo(this.totalDeJurosDevidosDasMultasDevidasAoReclamante) > 0) {
                    valorParaPagamentoDoValorDeMultasDevidasAoReclamante = Utils.subtrair(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante(), this.totalDeJurosDevidosDasMultasDevidasAoReclamante);
                }
                if (pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado().compareTo(this.totalDeJurosDevidosDasMultasDevidasAoReclamado) < 0) {
                    valorParaPagamentoDoValorDeMultasDevidasAoReclamado = Utils.subtrair(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado(), this.totalDeJurosDevidosDasMultasDevidasAoReclamado);
                }
                block32: for (MultaDaAtualizacao multaAnterior : creditoDoReclamantePagamento.getMultasCalculadas()) {
                    if (multaAnterior.getValorRemanescenteMulta() == null || creditoDoReclamantePagamento.getDataInicialPeriodo().equals(creditoDoReclamantePagamento.getCalculo().getDataDeLiquidacao()) && !multaAnterior.getJaCalculadoUmaVez().booleanValue() || creditoDoReclamantePagamento.getDataFinalPeriodo().equals(multaAnterior.getMulta().getDataEvento()) && creditoDoReclamantePagamento.getDataInicialPeriodo().equals(creditoDoReclamantePagamento.getDataFinalPeriodo())) {
                        multaAnterior.setPagoJuro(BigDecimal.ZERO);
                        multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                        switch (multaAnterior.getMulta().getTipoCredorDevedor()) {
                            case RECLAMADO_RECLAMANTE: {
                                if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado()) <= 0) continue block32;
                                if (BigDecimal.ZERO.compareTo(valorParaPagamentoDoValorDeMultasDevidasAoReclamado) == 0) {
                                    multaAnterior.setPagoMulta(BigDecimal.ZERO);
                                } else {
                                    pagosMultaDevidasReclamadoValorDeMulta.put(multaAnterior, multaAnterior.getDevidoCalculada());
                                }
                                multaAnterior.setJaCalculadoUmaVez(true);
                                continue block32;
                            }
                            case RECLAMANTE_RECLAMADO: {
                                if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) >= 0) continue block32;
                                if (BigDecimal.ZERO.compareTo(valorParaPagamentoDoValorDeMultasDevidasAoReclamante) == 0) {
                                    multaAnterior.setPagoMulta(BigDecimal.ZERO);
                                } else {
                                    pagosMultaDevidasReclamanteValorDeMulta.put(multaAnterior, multaAnterior.getDevidoCalculada());
                                }
                                multaAnterior.setJaCalculadoUmaVez(true);
                                continue block32;
                            }
                        }
                        continue;
                    }
                    BigDecimal valorRemanescente = BigDecimal.ZERO.compareTo(multaAnterior.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor()) ? multaAnterior.getValorMulta() : multaAnterior.getDevidoCalculadaRemanescente(multaAnterior.getIndiceDeCorrecao());
                    valorRemanescente = Utils.naoNulo(valorRemanescente) ? valorRemanescente : BigDecimal.ZERO;
                    BigDecimal valorMultaSobreJuros = multaAnterior.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM));
                    valorMultaSobreJuros = Utils.naoNulo(valorMultaSobreJuros) ? valorMultaSobreJuros : BigDecimal.ZERO;
                    multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                    switch (multaAnterior.getMulta().getTipoCredorDevedor()) {
                        case RECLAMADO_RECLAMANTE: {
                            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado()) <= 0) break;
                            if (BigDecimal.ZERO.compareTo(valorParaPagamentoDoValorDeMultasDevidasAoReclamado) == 0) {
                                multaAnterior.setPagoJuro(BigDecimal.ZERO);
                                multaAnterior.setPagoMulta(BigDecimal.ZERO);
                            } else {
                                pagosMultaDevidasReclamadoValorDeMulta.put(multaAnterior, valorRemanescente);
                                pagosJurosDevidasReclamadoValorDeMulta.put(multaAnterior, valorMultaSobreJuros.negate());
                            }
                            multaAnterior.setJaCalculadoUmaVez(true);
                            break;
                        }
                        case RECLAMANTE_RECLAMADO: {
                            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) >= 0) break;
                            if (BigDecimal.ZERO.compareTo(valorParaPagamentoDoValorDeMultasDevidasAoReclamante) == 0) {
                                multaAnterior.setPagoJuro(BigDecimal.ZERO);
                                multaAnterior.setPagoMulta(BigDecimal.ZERO);
                            } else {
                                pagosMultaDevidasReclamanteValorDeMulta.put(multaAnterior, valorRemanescente);
                                pagosJurosDevidasReclamanteValorDeMulta.put(multaAnterior, valorMultaSobreJuros);
                            }
                            multaAnterior.setJaCalculadoUmaVez(true);
                            break;
                        }
                    }
                }
                for (MultaDaAtualizacao multaAnterior : creditoDoReclamantePagamento.getMultasInformadas()) {
                    BigDecimal valorMulta = BigDecimal.ZERO.compareTo(multaAnterior.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor()) ? multaAnterior.getValorMulta() : Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao()));
                    switch (multaAnterior.getMulta().getTipoCredorDevedor()) {
                        case RECLAMADO_RECLAMANTE: {
                            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado()) <= 0) break;
                            if (BigDecimal.ZERO.compareTo(valorParaPagamentoDoValorDeMultasDevidasAoReclamado) == 0) {
                                multaAnterior.setPagoMulta(BigDecimal.ZERO);
                                break;
                            }
                            pagosMultaDevidasReclamadoValorDeMulta.put(multaAnterior, valorMulta);
                            break;
                        }
                        case RECLAMANTE_RECLAMADO: {
                            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) >= 0) break;
                            if (BigDecimal.ZERO.compareTo(valorParaPagamentoDoValorDeMultasDevidasAoReclamante) == 0) {
                                multaAnterior.setPagoMulta(BigDecimal.ZERO);
                                break;
                            }
                            pagosMultaDevidasReclamanteValorDeMulta.put(multaAnterior, valorMulta);
                            break;
                        }
                    }
                    if (!creditoDoReclamantePagamento.getDataFinalPeriodo().equals(multaAnterior.getMulta().getDataEvento())) {
                        BigDecimal devidoJuros = BigDecimal.ZERO;
                        BigDecimal baseJurosPeriodoAtual = BigDecimal.ZERO;
                        BigDecimal devidoJurosPeriodoAtual = BigDecimal.ZERO;
                        if (multaAnterior.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
                            devidoJuros = BigDecimal.ZERO.compareTo(multaAnterior.getValorJuros()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor()) ? multaAnterior.getValorJuros() : Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorJuros(), multaAnterior.getIndiceDeCorrecao()));
                            baseJurosPeriodoAtual = BigDecimal.ZERO.compareTo(multaAnterior.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor()) ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao()));
                            BigDecimal taxaDeJurosMulta = multaAnterior.getTaxaJurosMulta() != null ? multaAnterior.getTaxaJurosMulta() : creditoDoReclamantePagamento.getTaxaDeJuros();
                            devidoJurosPeriodoAtual = Utils.arredondarValorMonetario(Utils.multiplicar(baseJurosPeriodoAtual, taxaDeJurosMulta.divide(Utils.CEM)));
                        }
                        switch (multaAnterior.getMulta().getTipoCredorDevedor()) {
                            case RECLAMADO_RECLAMANTE: {
                                if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado()) <= 0) break;
                                if (BigDecimal.ZERO.compareTo(valorParaPagamentoDoValorDeMultasDevidasAoReclamado) == 0) {
                                    pagosJurosDevidasReclamadoValorDeJuros.put(multaAnterior, devidoJuros);
                                    pagosJurosPeriodoAtualDevidasReclamadoValorDeJuros.put(multaAnterior, devidoJurosPeriodoAtual);
                                    break;
                                }
                                multaAnterior.setPagoJuro(devidoJuros);
                                multaAnterior.setPagoJuroPeriodoAtual(devidoJurosPeriodoAtual);
                                break;
                            }
                            case RECLAMANTE_RECLAMADO: {
                                if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) >= 0) break;
                                if (BigDecimal.ZERO.compareTo(valorParaPagamentoDoValorDeMultasDevidasAoReclamante) == 0) {
                                    pagosJurosDevidasReclamanteValorDeJuros.put(multaAnterior, devidoJuros);
                                    pagosJurosPeriodoAtualDevidasReclamanteValorDeJuros.put(multaAnterior, devidoJurosPeriodoAtual);
                                    break;
                                }
                                multaAnterior.setPagoJuro(devidoJuros);
                                multaAnterior.setPagoJuroPeriodoAtual(devidoJurosPeriodoAtual);
                                break;
                            }
                        }
                        continue;
                    }
                    multaAnterior.setPagoJuro(BigDecimal.ZERO);
                    multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                }
                if (BigDecimal.ZERO.compareTo(valorParaPagamentoDoValorDeMultasDevidasAoReclamante) != 0) {
                    Set multasDevidasReclamanteParaRateioDoValorDaMulta = pagosMultaDevidasReclamanteValorDeMulta.keySet();
                    Set multasDevidasReclamanteParaRateioDoValorDeJuros = pagosJurosDevidasReclamanteValorDeMulta.keySet();
                    ArrayList<MultaDaAtualizacao> multasParaAjuste = new ArrayList<MultaDaAtualizacao>();
                    int quantidadeValores = multasDevidasReclamanteParaRateioDoValorDaMulta.size() + multasDevidasReclamanteParaRateioDoValorDeJuros.size();
                    BigDecimal[] valoresParaRateio = new BigDecimal[quantidadeValores];
                    int contador = 0;
                    for (Object multa : multasDevidasReclamanteParaRateioDoValorDaMulta) {
                        valoresParaRateio[contador] = (BigDecimal)pagosMultaDevidasReclamanteValorDeMulta.get(multa);
                        this.checarSeMultaCalculadaPrecisaDeAjusteDeRateioDeMultaSobreJuros(multasParaAjuste, valoresParaRateio[contador], (MultaDaAtualizacao)multa);
                        ++contador;
                    }
                    for (Object multa : multasDevidasReclamanteParaRateioDoValorDeJuros) {
                        valoresParaRateio[contador] = (BigDecimal)pagosJurosDevidasReclamanteValorDeMulta.get(multa);
                        ++contador;
                    }
                    BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorParaPagamentoDoValorDeMultasDevidasAoReclamante, valoresParaRateio);
                    contador = 0;
                    for (MultaDaAtualizacao multa : multasDevidasReclamanteParaRateioDoValorDaMulta) {
                        multa.setPagoMulta(valoresRateados[contador]);
                        ++contador;
                    }
                    for (MultaDaAtualizacao multa : multasDevidasReclamanteParaRateioDoValorDeJuros) {
                        multa.setPagoJuro(valoresRateados[contador]);
                        ++contador;
                    }
                    this.realizarAjustesDeRateioDeMultaSobreJuros(multasParaAjuste, creditoDoReclamantePagamento);
                } else if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) < 0) {
                    Set multasDevidasReclamanteParaRateioDoValorDeJuros = pagosJurosDevidasReclamanteValorDeJuros.keySet();
                    Set multasDevidasReclamanteParaRateioDoValorDeJurosPeriodoAtual = pagosJurosPeriodoAtualDevidasReclamanteValorDeJuros.keySet();
                    int quantidadeValores = multasDevidasReclamanteParaRateioDoValorDeJuros.size() + multasDevidasReclamanteParaRateioDoValorDeJurosPeriodoAtual.size();
                    BigDecimal[] valoresParaRateio = new BigDecimal[quantidadeValores];
                    int contador = 0;
                    for (Iterator multa : multasDevidasReclamanteParaRateioDoValorDeJuros) {
                        valoresParaRateio[contador] = (BigDecimal)pagosJurosDevidasReclamanteValorDeJuros.get(multa);
                        ++contador;
                    }
                    for (Iterator multa : multasDevidasReclamanteParaRateioDoValorDeJurosPeriodoAtual) {
                        valoresParaRateio[contador] = (BigDecimal)pagosJurosPeriodoAtualDevidasReclamanteValorDeJuros.get(multa);
                        ++contador;
                    }
                    BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante(), valoresParaRateio);
                    contador = 0;
                    for (Object multa : multasDevidasReclamanteParaRateioDoValorDeJuros) {
                        ((MultaDaAtualizacao)multa).setPagoJuro(valoresRateados[contador]);
                        ++contador;
                    }
                    for (Object multa : multasDevidasReclamanteParaRateioDoValorDeJurosPeriodoAtual) {
                        ((MultaDaAtualizacao)multa).setPagoJuroPeriodoAtual(valoresRateados[contador]);
                        ++contador;
                    }
                }
                if (BigDecimal.ZERO.compareTo(valorParaPagamentoDoValorDeMultasDevidasAoReclamado) != 0) {
                    Set multasDevidasReclamadoParaRateioDoValorDaMulta = pagosMultaDevidasReclamadoValorDeMulta.keySet();
                    Set multasDevidasReclamadoParaRateioDoValorDeJuros = pagosJurosDevidasReclamadoValorDeMulta.keySet();
                    int quantidadeValores = multasDevidasReclamadoParaRateioDoValorDaMulta.size() + multasDevidasReclamadoParaRateioDoValorDeJuros.size();
                    BigDecimal[] valoresParaRateio = new BigDecimal[quantidadeValores];
                    int contador = 0;
                    for (Iterator multa : multasDevidasReclamadoParaRateioDoValorDaMulta) {
                        valoresParaRateio[contador] = (BigDecimal)pagosMultaDevidasReclamadoValorDeMulta.get(multa);
                        ++contador;
                    }
                    for (Iterator multa : multasDevidasReclamadoParaRateioDoValorDeJuros) {
                        valoresParaRateio[contador] = (BigDecimal)pagosJurosDevidasReclamadoValorDeMulta.get(multa);
                        ++contador;
                    }
                    BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorParaPagamentoDoValorDeMultasDevidasAoReclamado, valoresParaRateio);
                    contador = 0;
                    for (Object multa : multasDevidasReclamadoParaRateioDoValorDaMulta) {
                        ((MultaDaAtualizacao)multa).setPagoMulta(valoresRateados[contador]);
                        ++contador;
                    }
                    for (Object multa : multasDevidasReclamadoParaRateioDoValorDeJuros) {
                        ((MultaDaAtualizacao)multa).setPagoJuro(valoresRateados[contador]);
                        ++contador;
                    }
                } else if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) < 0) {
                    Set multasDevidasReclamadoParaRateioDoValorDeJuros = pagosJurosDevidasReclamadoValorDeJuros.keySet();
                    Set multasDevidasReclamadoParaRateioDoValorDeJurosPeriodoAtual = pagosJurosPeriodoAtualDevidasReclamadoValorDeJuros.keySet();
                    int quantidadeValores = multasDevidasReclamadoParaRateioDoValorDeJuros.size() + multasDevidasReclamadoParaRateioDoValorDeJurosPeriodoAtual.size();
                    BigDecimal[] valoresParaRateio = new BigDecimal[quantidadeValores];
                    int contador = 0;
                    for (Iterator multa : multasDevidasReclamadoParaRateioDoValorDeJuros) {
                        valoresParaRateio[contador] = (BigDecimal)pagosJurosDevidasReclamadoValorDeJuros.get(multa);
                        ++contador;
                    }
                    for (Iterator multa : multasDevidasReclamadoParaRateioDoValorDeJurosPeriodoAtual) {
                        valoresParaRateio[contador] = (BigDecimal)pagosJurosPeriodoAtualDevidasReclamadoValorDeJuros.get(multa);
                        ++contador;
                    }
                    BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado(), valoresParaRateio);
                    contador = 0;
                    for (Object multa : multasDevidasReclamadoParaRateioDoValorDeJuros) {
                        ((MultaDaAtualizacao)multa).setPagoJuro(valoresRateados[contador]);
                        ++contador;
                    }
                    for (Object multa : multasDevidasReclamadoParaRateioDoValorDeJurosPeriodoAtual) {
                        ((MultaDaAtualizacao)multa).setPagoJuroPeriodoAtual(valoresRateados[contador]);
                        ++contador;
                    }
                }
            }
        } else {
            this.pagarValorPrincipalSemPriorizacaoDeJuros(creditoDoReclamantePagamento, pagamento);
            this.pagarFgtsSemPriorizacaoDeJuros(creditoDoReclamantePagamento, pagamento);
            HashMap<MultaDaAtualizacao, BigDecimal> pagosMultaDevidasReclamante = new HashMap<MultaDaAtualizacao, BigDecimal>();
            HashMap<MultaDaAtualizacao, BigDecimal> pagosJurosDevidasReclamante = new HashMap<MultaDaAtualizacao, BigDecimal>();
            HashMap<MultaDaAtualizacao, BigDecimal> pagosJurosPeriodoAtualDevidasReclamante = new HashMap<MultaDaAtualizacao, BigDecimal>();
            HashMap<MultaDaAtualizacao, BigDecimal> pagosMultaDevidasReclamado = new HashMap<MultaDaAtualizacao, BigDecimal>();
            HashMap<MultaDaAtualizacao, BigDecimal> pagosJurosDevidasReclamado = new HashMap<MultaDaAtualizacao, BigDecimal>();
            HashMap<MultaDaAtualizacao, BigDecimal> pagosJurosPeriodoAtualDevidasReclamado = new HashMap<MultaDaAtualizacao, BigDecimal>();
            creditoDoReclamantePagamento.calculaTotalDevidoDasMultasDevidasAoReclamanteEAoReclamado();
            block50: for (MultaDaAtualizacao multaAnterior : creditoDoReclamantePagamento.getMultasCalculadas()) {
                if (multaAnterior.getValorRemanescenteMulta() == null || creditoDoReclamantePagamento.getDataInicialPeriodo().equals(creditoDoReclamantePagamento.getCalculo().getDataDeLiquidacao()) && !multaAnterior.getJaCalculadoUmaVez().booleanValue() || creditoDoReclamantePagamento.getDataFinalPeriodo().equals(multaAnterior.getMulta().getDataEvento()) && creditoDoReclamantePagamento.getDataInicialPeriodo().equals(creditoDoReclamantePagamento.getDataFinalPeriodo())) {
                    multaAnterior.setPagoJuro(BigDecimal.ZERO);
                    multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                    switch (multaAnterior.getMulta().getTipoCredorDevedor()) {
                        case RECLAMADO_RECLAMANTE: {
                            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado()) <= 0) continue block50;
                            pagosMultaDevidasReclamado.put(multaAnterior, multaAnterior.getDevidoCalculada());
                            multaAnterior.setJaCalculadoUmaVez(true);
                            continue block50;
                        }
                        case RECLAMANTE_RECLAMADO: {
                            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) >= 0) continue block50;
                            pagosMultaDevidasReclamante.put(multaAnterior, multaAnterior.getDevidoCalculada());
                            multaAnterior.setJaCalculadoUmaVez(true);
                            continue block50;
                        }
                    }
                    continue;
                }
                BigDecimal valorRemanescente = BigDecimal.ZERO.compareTo(multaAnterior.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor()) ? multaAnterior.getValorMulta() : multaAnterior.getDevidoCalculadaRemanescente(multaAnterior.getIndiceDeCorrecao());
                valorRemanescente = Utils.naoNulo(valorRemanescente) ? valorRemanescente : BigDecimal.ZERO;
                BigDecimal valorMultaSobreJuros = multaAnterior.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM));
                valorMultaSobreJuros = Utils.naoNulo(valorMultaSobreJuros) ? valorMultaSobreJuros : BigDecimal.ZERO;
                multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                switch (multaAnterior.getMulta().getTipoCredorDevedor()) {
                    case RECLAMADO_RECLAMANTE: {
                        if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado()) <= 0) break;
                        pagosMultaDevidasReclamado.put(multaAnterior, valorRemanescente);
                        pagosJurosDevidasReclamado.put(multaAnterior, valorMultaSobreJuros.negate());
                        multaAnterior.setJaCalculadoUmaVez(true);
                        break;
                    }
                    case RECLAMANTE_RECLAMADO: {
                        if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) >= 0) break;
                        pagosMultaDevidasReclamante.put(multaAnterior, valorRemanescente);
                        pagosJurosDevidasReclamante.put(multaAnterior, valorMultaSobreJuros);
                        multaAnterior.setJaCalculadoUmaVez(true);
                        break;
                    }
                }
            }
            for (MultaDaAtualizacao multaAnterior : creditoDoReclamantePagamento.getMultasInformadas()) {
                BigDecimal valorMulta = BigDecimal.ZERO.compareTo(multaAnterior.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor()) ? multaAnterior.getValorMulta() : Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao()));
                switch (multaAnterior.getMulta().getTipoCredorDevedor()) {
                    case RECLAMADO_RECLAMANTE: {
                        if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado()) <= 0) break;
                        pagosMultaDevidasReclamado.put(multaAnterior, valorMulta);
                        break;
                    }
                    case RECLAMANTE_RECLAMADO: {
                        if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) >= 0) break;
                        pagosMultaDevidasReclamante.put(multaAnterior, valorMulta);
                        break;
                    }
                }
                if (!creditoDoReclamantePagamento.getDataFinalPeriodo().equals(multaAnterior.getMulta().getDataEvento())) {
                    BigDecimal devidoJuros = BigDecimal.ZERO;
                    BigDecimal baseJurosPeriodoAtual = BigDecimal.ZERO;
                    BigDecimal devidoJurosPeriodoAtual = BigDecimal.ZERO;
                    if (multaAnterior.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
                        devidoJuros = BigDecimal.ZERO.compareTo(multaAnterior.getValorJuros()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor()) ? multaAnterior.getValorJuros() : Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorJuros(), multaAnterior.getIndiceDeCorrecao()));
                        baseJurosPeriodoAtual = BigDecimal.ZERO.compareTo(multaAnterior.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaAnterior.getMulta().getTipoCredorDevedor()) ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao()));
                        BigDecimal taxaDeJurosMulta = multaAnterior.getTaxaJurosMulta() != null ? multaAnterior.getTaxaJurosMulta() : creditoDoReclamantePagamento.getTaxaDeJuros();
                        devidoJurosPeriodoAtual = Utils.arredondarValorMonetario(Utils.multiplicar(baseJurosPeriodoAtual, taxaDeJurosMulta.divide(Utils.CEM)));
                    }
                    switch (multaAnterior.getMulta().getTipoCredorDevedor()) {
                        case RECLAMADO_RECLAMANTE: {
                            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado()) <= 0) break;
                            pagosJurosDevidasReclamado.put(multaAnterior, devidoJuros);
                            pagosJurosPeriodoAtualDevidasReclamado.put(multaAnterior, devidoJurosPeriodoAtual);
                            break;
                        }
                        case RECLAMANTE_RECLAMADO: {
                            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) >= 0) break;
                            pagosJurosDevidasReclamante.put(multaAnterior, devidoJuros);
                            pagosJurosPeriodoAtualDevidasReclamante.put(multaAnterior, devidoJurosPeriodoAtual);
                            break;
                        }
                    }
                    continue;
                }
                multaAnterior.setPagoJuro(BigDecimal.ZERO);
                multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            }
            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante()) < 0) {
                Set multasDevidasReclamanteParaRateioDoValorDaMulta = pagosMultaDevidasReclamante.keySet();
                Set multasDevidasReclamanteParaRateioDoValorDeJuros = pagosJurosDevidasReclamante.keySet();
                Set multasDevidasReclamanteParaRateioDoValorDeJurosPeriodoAtual = pagosJurosPeriodoAtualDevidasReclamante.keySet();
                ArrayList<MultaDaAtualizacao> multasParaAjuste = new ArrayList<MultaDaAtualizacao>();
                int quantidadeValores = multasDevidasReclamanteParaRateioDoValorDaMulta.size() + multasDevidasReclamanteParaRateioDoValorDeJuros.size() + multasDevidasReclamanteParaRateioDoValorDeJurosPeriodoAtual.size();
                BigDecimal[] valoresParaRateio = new BigDecimal[quantidadeValores];
                int contador = 0;
                for (Object multa : multasDevidasReclamanteParaRateioDoValorDaMulta) {
                    valoresParaRateio[contador] = (BigDecimal)pagosMultaDevidasReclamante.get(multa);
                    this.checarSeMultaCalculadaPrecisaDeAjusteDeRateioDeMultaSobreJuros(multasParaAjuste, valoresParaRateio[contador], (MultaDaAtualizacao)multa);
                    ++contador;
                }
                for (Object multa : multasDevidasReclamanteParaRateioDoValorDeJuros) {
                    valoresParaRateio[contador] = (BigDecimal)pagosJurosDevidasReclamante.get(multa);
                    ++contador;
                }
                for (Object multa : multasDevidasReclamanteParaRateioDoValorDeJurosPeriodoAtual) {
                    valoresParaRateio[contador] = (BigDecimal)pagosJurosPeriodoAtualDevidasReclamante.get(multa);
                    ++contador;
                }
                BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante(), valoresParaRateio);
                contador = 0;
                for (MultaDaAtualizacao multa : multasDevidasReclamanteParaRateioDoValorDaMulta) {
                    multa.setPagoMulta(valoresRateados[contador]);
                    ++contador;
                }
                for (MultaDaAtualizacao multa : multasDevidasReclamanteParaRateioDoValorDeJuros) {
                    multa.setPagoJuro(valoresRateados[contador]);
                    ++contador;
                }
                for (MultaDaAtualizacao multa : multasDevidasReclamanteParaRateioDoValorDeJurosPeriodoAtual) {
                    multa.setPagoJuroPeriodoAtual(valoresRateados[contador]);
                    ++contador;
                }
                this.realizarAjustesDeRateioDeMultaSobreJuros(multasParaAjuste, creditoDoReclamantePagamento);
                this.realizarAjustesDeJurosNegativosEmMultasInformadas(creditoDoReclamantePagamento);
            }
            if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado()) > 0) {
                Set multasDevidasReclamadoParaRateioDoValorDaMulta = pagosMultaDevidasReclamado.keySet();
                Set multasDevidasReclamadoParaRateioDoValorDeJuros = pagosJurosDevidasReclamado.keySet();
                Set multasDevidasReclamadoParaRateioDoValorDeJurosPeriodoAtual = pagosJurosPeriodoAtualDevidasReclamado.keySet();
                int quantidadeValores = multasDevidasReclamadoParaRateioDoValorDaMulta.size() + multasDevidasReclamadoParaRateioDoValorDeJuros.size() + multasDevidasReclamadoParaRateioDoValorDeJurosPeriodoAtual.size();
                BigDecimal[] valoresParaRateio = new BigDecimal[quantidadeValores];
                int contador = 0;
                for (MultaDaAtualizacao multa : multasDevidasReclamadoParaRateioDoValorDaMulta) {
                    valoresParaRateio[contador] = (BigDecimal)pagosMultaDevidasReclamado.get(multa);
                    ++contador;
                }
                for (MultaDaAtualizacao multa : multasDevidasReclamadoParaRateioDoValorDeJuros) {
                    valoresParaRateio[contador] = (BigDecimal)pagosJurosDevidasReclamado.get(multa);
                    ++contador;
                }
                for (MultaDaAtualizacao multa : multasDevidasReclamadoParaRateioDoValorDeJurosPeriodoAtual) {
                    valoresParaRateio[contador] = (BigDecimal)pagosJurosPeriodoAtualDevidasReclamado.get(multa);
                    ++contador;
                }
                BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(pagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado(), valoresParaRateio);
                contador = 0;
                for (Object multa : multasDevidasReclamadoParaRateioDoValorDaMulta) {
                    ((MultaDaAtualizacao)multa).setPagoMulta(valoresRateados[contador]);
                    ++contador;
                }
                for (Object multa : multasDevidasReclamadoParaRateioDoValorDeJuros) {
                    ((MultaDaAtualizacao)multa).setPagoJuro(valoresRateados[contador]);
                    ++contador;
                }
                for (Object multa : multasDevidasReclamadoParaRateioDoValorDeJurosPeriodoAtual) {
                    ((MultaDaAtualizacao)multa).setPagoJuroPeriodoAtual(valoresRateados[contador]);
                    ++contador;
                }
            }
        }
        creditoDoReclamantePagamento.setTotalPago(creditoDoReclamantePagamento.calcularTotalPago());
        creditoDoReclamantePagamento.setTotalDiferenca(creditoDoReclamantePagamento.calcularTotalDiferenca());
        return creditoDoReclamantePagamento;
    }

    private void realizarAjustesDeJurosNegativosEmMultasInformadas(CreditosDoReclamante creditoDoReclamantePagamento) {
        for (MultaDaAtualizacao multa : creditoDoReclamantePagamento.getMultasInformadas()) {
            BigDecimal saldoJurosPeriodoAtual;
            boolean jurosAPartirDeDataAnteriorAoEventoDeMulta = multa.getMulta().getAplicarJurosSobreMulta() != false && Utils.naoNulo(multa.getMulta().getDataApartirDeAplicarJuros()) && HelperDate.dateBeforeOrEquals(multa.getMulta().getDataApartirDeAplicarJuros(), this.getDataFinalPeriodo());
            boolean multaReclamanteReclamadoComJuros = multa.getMulta().getAplicarJurosSobreMulta() != false && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getMulta().getTipoCredorDevedor());
            if (!multaReclamanteReclamadoComJuros || creditoDoReclamantePagamento.getDataFinalPeriodo().equals(multa.getMulta().getDataEvento()) && !jurosAPartirDeDataAnteriorAoEventoDeMulta) continue;
            BigDecimal devidoJuros = BigDecimal.ZERO.compareTo(multa.getValorJuros()) > 0 ? multa.getValorJuros() : Utils.arredondarValorMonetario(Utils.multiplicar(multa.getValorJuros(), multa.getIndiceDeCorrecao()));
            BigDecimal baseJurosPeriodoAtual = BigDecimal.ZERO.compareTo(multa.getValorMulta()) > 0 ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(multa.getValorMulta(), multa.getIndiceDeCorrecao()));
            BigDecimal devidoJurosPeriodoAtual = Utils.arredondarValorMonetario(Utils.multiplicar(baseJurosPeriodoAtual, creditoDoReclamantePagamento.getTaxaDeJuros().divide(Utils.CEM)));
            BigDecimal saldoJuros = Utils.subtrair(devidoJuros, multa.getPagoJuro());
            if (BigDecimal.ZERO.compareTo(saldoJuros) > 0) {
                multa.setPagoJuro(Utils.subtrair(multa.getPagoJuro(), saldoJuros.abs()));
                multa.setPagoMulta(Utils.somar(multa.getPagoMulta(), saldoJuros.abs()));
            }
            if (BigDecimal.ZERO.compareTo(saldoJurosPeriodoAtual = Utils.subtrair(devidoJurosPeriodoAtual, multa.getPagoJuroPeriodoAtual())) <= 0) continue;
            multa.setPagoJuroPeriodoAtual(Utils.subtrair(multa.getPagoJuroPeriodoAtual(), saldoJurosPeriodoAtual.abs()));
            multa.setPagoMulta(Utils.somar(multa.getPagoMulta(), saldoJurosPeriodoAtual.abs()));
        }
    }

    private void pagarPrincipalComPriorizacaoDeJuros(CreditosDoReclamante creditoDoReclamantePagamento, Pagamento pagamento) {
        if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamantePrincipal()) < 0) {
            BigDecimal totalJurosPrincipal = BigDecimal.ZERO;
            totalJurosPrincipal = Utils.somar(totalJurosPrincipal, BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipal()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipal(), totalJurosPrincipal);
            totalJurosPrincipal = Utils.somar(totalJurosPrincipal, BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipalPeriodoAtual()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipalPeriodoAtual(), totalJurosPrincipal);
            if (pagamento.getValorParaPagamentoCreditoReclamantePrincipal().compareTo(totalJurosPrincipal) >= 0) {
                BigDecimal valorParaPagarPrincipal = Utils.subtrair(pagamento.getValorParaPagamentoCreditoReclamantePrincipal(), totalJurosPrincipal);
                creditoDoReclamantePagamento.setPagoJuroDeMoraPrincipal(BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipal()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipal());
                creditoDoReclamantePagamento.setPagoJuroDeMoraPrincipalPeriodoAtual(BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipalPeriodoAtual()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipalPeriodoAtual());
                creditoDoReclamantePagamento.setPagoPrincipal(valorParaPagarPrincipal);
            } else {
                BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(pagamento.getValorParaPagamentoCreditoReclamantePrincipal(), new BigDecimal[]{BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipal()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipal(), BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipalPeriodoAtual()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipalPeriodoAtual()});
                creditoDoReclamantePagamento.setPagoJuroDeMoraPrincipal(valoresRateados[0]);
                creditoDoReclamantePagamento.setPagoJuroDeMoraPrincipalPeriodoAtual(valoresRateados[1]);
                creditoDoReclamantePagamento.setPagoPrincipal(BigDecimal.ZERO);
            }
        }
    }

    private void pagarFgtsComPriorizacaoDeJuros(CreditosDoReclamante creditoDoReclamantePagamento, Pagamento pagamento) {
        if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteFgts()) < 0) {
            BigDecimal totalJurosFgts = BigDecimal.ZERO;
            totalJurosFgts = Utils.somar(totalJurosFgts, BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraFgts()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraFgts(), totalJurosFgts);
            totalJurosFgts = Utils.somar(totalJurosFgts, BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsPeriodoAtual()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsPeriodoAtual(), totalJurosFgts);
            if (pagamento.getValorParaPagamentoCreditoReclamanteFgts().compareTo(totalJurosFgts) >= 0) {
                BigDecimal valorParaPagarFgts = Utils.subtrair(pagamento.getValorParaPagamentoCreditoReclamanteFgts(), totalJurosFgts);
                creditoDoReclamantePagamento.setPagoJuroDeMoraFgts(BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraFgts()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraFgts());
                creditoDoReclamantePagamento.setPagoJuroDeMoraFgtsPeriodoAtual(BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsPeriodoAtual()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsPeriodoAtual());
                creditoDoReclamantePagamento.setPagoFgts(valorParaPagarFgts);
            } else {
                BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(pagamento.getValorParaPagamentoCreditoReclamanteFgts(), new BigDecimal[]{BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraFgts()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraFgts(), BigDecimal.ZERO.compareTo(creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsPeriodoAtual()) > 0 ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsPeriodoAtual()});
                creditoDoReclamantePagamento.setPagoJuroDeMoraFgts(valoresRateados[0]);
                creditoDoReclamantePagamento.setPagoJuroDeMoraFgtsPeriodoAtual(valoresRateados[1]);
                creditoDoReclamantePagamento.setPagoFgts(BigDecimal.ZERO);
            }
        }
    }

    private void pagarValorPrincipalSemPriorizacaoDeJuros(CreditosDoReclamante creditoDoReclamantePagamento, Pagamento pagamento) {
        if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamantePrincipal()) < 0) {
            BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(pagamento.getValorParaPagamentoCreditoReclamantePrincipal(), new BigDecimal[]{creditoDoReclamantePagamento.getDevidoPrincipal().abs(), creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipal().abs(), creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipalPeriodoAtual().abs()});
            BigDecimal saldoJuroDeMoraPrincipal = BigDecimal.ZERO;
            saldoJuroDeMoraPrincipal = Utils.somar(saldoJuroDeMoraPrincipal, creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipal(), saldoJuroDeMoraPrincipal);
            if (BigDecimal.ZERO.compareTo(saldoJuroDeMoraPrincipal = Utils.subtrair(saldoJuroDeMoraPrincipal, valoresRateados[1], saldoJuroDeMoraPrincipal)) > 0) {
                valoresRateados[0] = Utils.somar(valoresRateados[0], saldoJuroDeMoraPrincipal.abs(), valoresRateados[0]);
                valoresRateados[1] = Utils.subtrair(valoresRateados[1], saldoJuroDeMoraPrincipal.abs(), valoresRateados[1]);
            }
            BigDecimal saldoJuroDeMoraPrincipalPeriodoAtual = BigDecimal.ZERO;
            saldoJuroDeMoraPrincipalPeriodoAtual = Utils.somar(saldoJuroDeMoraPrincipalPeriodoAtual, creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipalPeriodoAtual(), saldoJuroDeMoraPrincipalPeriodoAtual);
            if (BigDecimal.ZERO.compareTo(saldoJuroDeMoraPrincipalPeriodoAtual = Utils.subtrair(saldoJuroDeMoraPrincipalPeriodoAtual, valoresRateados[2], saldoJuroDeMoraPrincipalPeriodoAtual)) > 0) {
                valoresRateados[0] = Utils.somar(valoresRateados[0], saldoJuroDeMoraPrincipalPeriodoAtual.abs(), valoresRateados[0]);
                valoresRateados[2] = Utils.subtrair(valoresRateados[2], saldoJuroDeMoraPrincipalPeriodoAtual.abs(), valoresRateados[2]);
            }
            creditoDoReclamantePagamento.setPagoPrincipal(valoresRateados[0]);
            creditoDoReclamantePagamento.setPagoJuroDeMoraPrincipal(valoresRateados[1]);
            creditoDoReclamantePagamento.setPagoJuroDeMoraPrincipalPeriodoAtual(valoresRateados[2]);
        }
    }

    private void pagarFgtsSemPriorizacaoDeJuros(CreditosDoReclamante creditoDoReclamantePagamento, Pagamento pagamento) {
        if (BigDecimal.ZERO.compareTo(pagamento.getValorParaPagamentoCreditoReclamanteFgts()) < 0) {
            BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(pagamento.getValorParaPagamentoCreditoReclamanteFgts(), new BigDecimal[]{creditoDoReclamantePagamento.getDevidoFgts().abs(), creditoDoReclamantePagamento.getDevidoJuroDeMoraFgts().abs(), creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsPeriodoAtual().abs()});
            BigDecimal saldoJuroDeMoraFgts = BigDecimal.ZERO;
            saldoJuroDeMoraFgts = Utils.somar(saldoJuroDeMoraFgts, creditoDoReclamantePagamento.getDevidoJuroDeMoraFgts(), saldoJuroDeMoraFgts);
            if (BigDecimal.ZERO.compareTo(saldoJuroDeMoraFgts = Utils.subtrair(saldoJuroDeMoraFgts, valoresRateados[1], saldoJuroDeMoraFgts)) > 0) {
                valoresRateados[0] = Utils.somar(valoresRateados[0], saldoJuroDeMoraFgts.abs(), valoresRateados[0]);
                valoresRateados[1] = Utils.subtrair(valoresRateados[1], saldoJuroDeMoraFgts.abs(), valoresRateados[1]);
            }
            BigDecimal saldoJuroDeMoraFgtsPeriodoAtual = BigDecimal.ZERO;
            saldoJuroDeMoraFgtsPeriodoAtual = Utils.somar(saldoJuroDeMoraFgtsPeriodoAtual, creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsPeriodoAtual(), saldoJuroDeMoraFgtsPeriodoAtual);
            if (BigDecimal.ZERO.compareTo(saldoJuroDeMoraFgtsPeriodoAtual = Utils.subtrair(saldoJuroDeMoraFgtsPeriodoAtual, valoresRateados[2], saldoJuroDeMoraFgtsPeriodoAtual)) > 0) {
                valoresRateados[0] = Utils.somar(valoresRateados[0], saldoJuroDeMoraFgtsPeriodoAtual.abs(), valoresRateados[0]);
                valoresRateados[2] = Utils.subtrair(valoresRateados[2], saldoJuroDeMoraFgtsPeriodoAtual.abs(), valoresRateados[2]);
            }
            creditoDoReclamantePagamento.setPagoFgts(valoresRateados[0]);
            creditoDoReclamantePagamento.setPagoJuroDeMoraFgts(valoresRateados[1]);
            creditoDoReclamantePagamento.setPagoJuroDeMoraFgtsPeriodoAtual(valoresRateados[2]);
        }
    }

    private void realizarAjustesDeRateioDeMultaSobreJuros(List<MultaDaAtualizacao> multasParaAjuste, CreditosDoReclamante creditoDoReclamantePagamento) {
        for (MultaDaAtualizacao multa : multasParaAjuste) {
            BigDecimal total = BigDecimal.ZERO;
            total = Utils.somar(total, multa.getPagoMulta(), total);
            total = Utils.somar(total, multa.getPagoJuro(), total);
            BigDecimal valorMultaSobreJuros = multa.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : creditoDoReclamantePagamento.getDevidoMultaCalculadaSobreJurosDoPeriodo(multa.getMulta().getAliquotaMulta().divide(Utils.CEM));
            BigDecimal bigDecimal = valorMultaSobreJuros = Utils.naoNulo(valorMultaSobreJuros) ? valorMultaSobreJuros : BigDecimal.ZERO;
            if (total.compareTo(valorMultaSobreJuros) > 0) {
                multa.setPagoJuro(valorMultaSobreJuros);
                multa.setPagoMulta(Utils.subtrair(total, valorMultaSobreJuros));
                continue;
            }
            multa.setPagoJuro(total);
            multa.setPagoMulta(BigDecimal.ZERO);
        }
    }

    private void checarSeMultaCalculadaPrecisaDeAjusteDeRateioDeMultaSobreJuros(List<MultaDaAtualizacao> multasParaAjuste, BigDecimal valorRemanescente, MultaDaAtualizacao multa) {
        if (BigDecimal.ZERO.compareTo(valorRemanescente) > 0 && TipoValorEnum.CALCULADO.equals((Object)multa.getTipoValorDaMulta())) {
            multasParaAjuste.add(multa);
        }
    }

    protected void calculaTotalDevidoDasMultasDevidasAoReclamanteEAoReclamado() {
        BigDecimal totalMultasDevidasAoReclamante = BigDecimal.ZERO;
        BigDecimal totalMultasDevidasAoReclamado = BigDecimal.ZERO;
        BigDecimal totalDeJurosDasMultasDevidasAoReclamante = BigDecimal.ZERO;
        BigDecimal totalDeJurosDasMultasDevidasAoReclamado = BigDecimal.ZERO;
        block16: for (MultaDaAtualizacao multa : this.getMultasCalculadas()) {
            if (Utils.nulo(multa.getValorRemanescenteMulta()) || this.getDataFinalPeriodo().equals(multa.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multa.getJaCalculadoUmaVez().booleanValue()) {
                switch (multa.getMulta().getTipoCredorDevedor()) {
                    case RECLAMADO_RECLAMANTE: {
                        totalMultasDevidasAoReclamado = Utils.somar(totalMultasDevidasAoReclamado, multa.getDevidoCalculada(), totalMultasDevidasAoReclamado);
                        continue block16;
                    }
                    case RECLAMANTE_RECLAMADO: {
                        totalMultasDevidasAoReclamante = Utils.somar(totalMultasDevidasAoReclamante, multa.getDevidoCalculada(), totalMultasDevidasAoReclamante);
                        continue block16;
                    }
                }
                continue;
            }
            BigDecimal valorRemanescente = BigDecimal.ZERO.compareTo(multa.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getMulta().getTipoCredorDevedor()) ? multa.getValorMulta() : multa.getDevidoCalculadaRemanescente(multa.getIndiceDeCorrecao());
            valorRemanescente = Utils.naoNulo(valorRemanescente) ? valorRemanescente : BigDecimal.ZERO;
            BigDecimal valorMultaSobreJuros = multa.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getDevidoMultaCalculadaSobreJurosDoPeriodo(multa.getMulta().getAliquotaMulta().divide(Utils.CEM));
            valorMultaSobreJuros = Utils.naoNulo(valorMultaSobreJuros) ? valorMultaSobreJuros : BigDecimal.ZERO;
            switch (multa.getMulta().getTipoCredorDevedor()) {
                case RECLAMADO_RECLAMANTE: {
                    totalMultasDevidasAoReclamado = Utils.somar(totalMultasDevidasAoReclamado, valorRemanescente, totalMultasDevidasAoReclamado);
                    totalMultasDevidasAoReclamado = Utils.somar(totalMultasDevidasAoReclamado, valorMultaSobreJuros.negate(), totalMultasDevidasAoReclamado);
                    break;
                }
                case RECLAMANTE_RECLAMADO: {
                    totalMultasDevidasAoReclamante = Utils.somar(totalMultasDevidasAoReclamante, valorRemanescente, totalMultasDevidasAoReclamante);
                    totalMultasDevidasAoReclamante = Utils.somar(totalMultasDevidasAoReclamante, valorMultaSobreJuros, totalMultasDevidasAoReclamante);
                    break;
                }
            }
        }
        for (MultaDaAtualizacao multa : this.getMultasInformadas()) {
            boolean jurosAPartirDeDataAnteriorAoEventoDeMulta;
            BigDecimal valorMulta = BigDecimal.ZERO.compareTo(multa.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getMulta().getTipoCredorDevedor()) ? multa.getValorMulta() : Utils.arredondarValorMonetario(Utils.multiplicar(multa.getValorMulta(), multa.getIndiceDeCorrecao()));
            valorMulta = Utils.naoNulo(valorMulta) ? valorMulta : BigDecimal.ZERO;
            switch (multa.getMulta().getTipoCredorDevedor()) {
                case RECLAMADO_RECLAMANTE: {
                    totalMultasDevidasAoReclamado = Utils.somar(totalMultasDevidasAoReclamado, valorMulta, totalMultasDevidasAoReclamado);
                    break;
                }
                case RECLAMANTE_RECLAMADO: {
                    totalMultasDevidasAoReclamante = Utils.somar(totalMultasDevidasAoReclamante, valorMulta, totalMultasDevidasAoReclamante);
                    break;
                }
            }
            boolean bl = jurosAPartirDeDataAnteriorAoEventoDeMulta = multa.getMulta().getAplicarJurosSobreMulta() != false && Utils.naoNulo(multa.getMulta().getDataApartirDeAplicarJuros()) && HelperDate.dateBeforeOrEquals(multa.getMulta().getDataApartirDeAplicarJuros(), this.getDataFinalPeriodo());
            if (this.getDataFinalPeriodo().equals(multa.getMulta().getDataEvento()) && !jurosAPartirDeDataAnteriorAoEventoDeMulta) continue;
            BigDecimal devidoJuros = BigDecimal.ZERO.compareTo(multa.getValorJuros()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getMulta().getTipoCredorDevedor()) ? multa.getValorJuros() : Utils.arredondarValorMonetario(Utils.multiplicar(multa.getValorJuros(), multa.getIndiceDeCorrecao()));
            devidoJuros = Utils.naoNulo(devidoJuros) ? devidoJuros : BigDecimal.ZERO;
            BigDecimal baseJurosPeriodoAtual = BigDecimal.ZERO.compareTo(multa.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getMulta().getTipoCredorDevedor()) ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(multa.getValorMulta(), multa.getIndiceDeCorrecao()));
            baseJurosPeriodoAtual = Utils.naoNulo(baseJurosPeriodoAtual) && multa.getMulta().getAplicarJurosSobreMulta() != false ? baseJurosPeriodoAtual : BigDecimal.ZERO;
            BigDecimal devidoJurosPeriodoAtual = Utils.arredondarValorMonetario(Utils.multiplicar(baseJurosPeriodoAtual, multa.getTaxaJurosMulta().divide(Utils.CEM)));
            devidoJurosPeriodoAtual = Utils.naoNulo(devidoJurosPeriodoAtual) ? devidoJurosPeriodoAtual : BigDecimal.ZERO;
            switch (multa.getMulta().getTipoCredorDevedor()) {
                case RECLAMADO_RECLAMANTE: {
                    totalMultasDevidasAoReclamado = Utils.somar(totalMultasDevidasAoReclamado, devidoJuros, totalMultasDevidasAoReclamado);
                    totalDeJurosDasMultasDevidasAoReclamado = Utils.somar(totalDeJurosDasMultasDevidasAoReclamado, devidoJuros, totalDeJurosDasMultasDevidasAoReclamado);
                    totalMultasDevidasAoReclamado = Utils.somar(totalMultasDevidasAoReclamado, devidoJurosPeriodoAtual, totalMultasDevidasAoReclamado);
                    totalDeJurosDasMultasDevidasAoReclamado = Utils.somar(totalDeJurosDasMultasDevidasAoReclamado, devidoJurosPeriodoAtual, totalDeJurosDasMultasDevidasAoReclamado);
                    break;
                }
                case RECLAMANTE_RECLAMADO: {
                    totalMultasDevidasAoReclamante = Utils.somar(totalMultasDevidasAoReclamante, devidoJuros, totalMultasDevidasAoReclamante);
                    totalDeJurosDasMultasDevidasAoReclamante = Utils.somar(totalDeJurosDasMultasDevidasAoReclamante, devidoJuros, totalDeJurosDasMultasDevidasAoReclamante);
                    totalMultasDevidasAoReclamante = Utils.somar(totalMultasDevidasAoReclamante, devidoJurosPeriodoAtual, totalMultasDevidasAoReclamante);
                    totalDeJurosDasMultasDevidasAoReclamante = Utils.somar(totalDeJurosDasMultasDevidasAoReclamante, devidoJurosPeriodoAtual, totalDeJurosDasMultasDevidasAoReclamante);
                    break;
                }
            }
        }
        this.totalDevidoDasMultasDevidasAoReclamante = totalMultasDevidasAoReclamante;
        this.totalDevidoDasMultasDevidasAoReclamado = totalMultasDevidasAoReclamado;
        this.totalDeJurosDevidosDasMultasDevidasAoReclamante = totalDeJurosDasMultasDevidasAoReclamante;
        this.totalDeJurosDevidosDasMultasDevidasAoReclamado = totalDeJurosDasMultasDevidasAoReclamado;
    }

    protected BigDecimal getTotalDevidoDasMultasDevidasAoReclamante() {
        return this.totalDevidoDasMultasDevidasAoReclamante;
    }

    protected BigDecimal getTotalDevidoDasMultasDevidasAoReclamado() {
        return this.totalDevidoDasMultasDevidasAoReclamado;
    }

    public CreditosDoReclamante incluirMulta(CreditosDoReclamante creditoDoReclamantePagamento, Multa multaDoEvento) {
        if (multaDoEvento.getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) || multaDoEvento.getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO)) {
            if (multaDoEvento.getTipoValorDaMulta() == TipoValorEnum.CALCULADO) {
                MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
                multaDaAtualizacao.setMulta(multaDoEvento);
                multaDaAtualizacao.setTipoVinculo(multaDoEvento.getTipoCredorDevedor());
                multaDaAtualizacao.setTipoValorDaMulta(multaDoEvento.getTipoValorDaMulta());
                multaDaAtualizacao.setValorMulta(multaDaAtualizacao.calcularValorDaMultaCalculadaCreditosDoReclamante(creditoDoReclamantePagamento, this, null, BigDecimal.ONE, creditoDoReclamantePagamento.getValorPrevidenciaPrivada(), creditoDoReclamantePagamento.getValorDescontoInss(), creditoDoReclamantePagamento.getDataFinalPeriodo()));
                multaDaAtualizacao.setJaCalculadoUmaVez(this.getAtualizacao().getBaseMultaJaPaga());
                multaDaAtualizacao.setCreditoDoReclamantePagamento(creditoDoReclamantePagamento);
                multaDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
                multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
                creditoDoReclamantePagamento.getMultasCalculadas().add(multaDaAtualizacao);
            } else {
                MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
                multaDaAtualizacao.setMulta(multaDoEvento);
                multaDaAtualizacao.setTipoVinculo(multaDoEvento.getTipoCredorDevedor());
                multaDaAtualizacao.setTipoValorDaMulta(multaDoEvento.getTipoValorDaMulta());
                multaDaAtualizacao.setValorMulta(CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multaDoEvento.getTipoCredorDevedor()) ? multaDoEvento.getValorMulta().negate() : multaDoEvento.getValorMulta());
                multaDaAtualizacao.setTaxaJurosMulta(Utils.arredondarValor(this.calcularTaxaJuros(creditoDoReclamantePagamento.getDataFinalPeriodo(), multaDoEvento), 4));
                multaDaAtualizacao.setValorJuros(BigDecimal.ZERO);
                multaDaAtualizacao.setCreditoDoReclamantePagamento(creditoDoReclamantePagamento);
                multaDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
                multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
                multaDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
                creditoDoReclamantePagamento.getMultasInformadas().add(multaDaAtualizacao);
            }
        }
        return creditoDoReclamantePagamento;
    }

    private BigDecimal calcularTaxaJuros(Date dataFinalPeriodo, Multa multaDoEvento) {
        if (multaDoEvento.getAplicarJurosSobreMulta().booleanValue() && Utils.naoNulo(multaDoEvento.getDataApartirDeAplicarJuros())) {
            return this.calcularTaxaDeJuros(multaDoEvento.getDataApartirDeAplicarJuros(), dataFinalPeriodo, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
        }
        return null;
    }

    public BigDecimal calcularTotalDevidoSemMulta() {
        BigDecimal totalDevido = BigDecimal.ZERO;
        totalDevido = Utils.somar(totalDevido, this.getDevidoPrincipal(), totalDevido);
        totalDevido = Utils.somar(totalDevido, this.getDevidoJuroDeMoraPrincipal(), totalDevido);
        totalDevido = Utils.somar(totalDevido, this.getDevidoJuroDeMoraPrincipalPeriodoAtual(), totalDevido);
        totalDevido = Utils.somar(totalDevido, this.getDevidoFgts(), totalDevido);
        totalDevido = Utils.somar(totalDevido, this.getDevidoJuroDeMoraFgts(), totalDevido);
        totalDevido = Utils.somar(totalDevido, this.getDevidoJuroDeMoraFgtsPeriodoAtual(), totalDevido);
        return totalDevido;
    }

    public BigDecimal calcularTotalMultas() {
        BigDecimal totalMultas = BigDecimal.ZERO;
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            if (Utils.nulo(multaCalculada.getValorRemanescenteMulta()) || this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                totalMultas = Utils.somar(totalMultas, multaCalculada.getDevidoCalculada(), totalMultas);
                continue;
            }
            if (multaCalculada.getMulta().getTipoCredorDevedor() == CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) {
                totalMultas = Utils.somar(totalMultas, multaCalculada.getDevidoCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), totalMultas);
                totalMultas = Utils.somar(totalMultas, multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)), totalMultas);
                continue;
            }
            totalMultas = Utils.somar(totalMultas, multaCalculada.getDevidoCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), totalMultas);
            totalMultas = Utils.somar(totalMultas, multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)).negate(), totalMultas);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            boolean jurosAPartirDeDataAnteriorAoEventoDeMulta;
            BigDecimal valorDaMulta = BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? multaInformada.getValorMulta() : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()));
            totalMultas = Utils.somar(totalMultas, valorDaMulta, totalMultas);
            boolean bl = jurosAPartirDeDataAnteriorAoEventoDeMulta = multaInformada.getMulta().getAplicarJurosSobreMulta() != false && Utils.naoNulo(multaInformada.getMulta().getDataApartirDeAplicarJuros()) && HelperDate.dateBeforeOrEquals(multaInformada.getMulta().getDataApartirDeAplicarJuros(), this.getDataFinalPeriodo());
            if (this.getDataFinalPeriodo().equals(multaInformada.getMulta().getDataEvento()) && !jurosAPartirDeDataAnteriorAoEventoDeMulta) continue;
            BigDecimal devido = BigDecimal.ZERO;
            if (multaInformada.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
                devido = BigDecimal.ZERO.compareTo(multaInformada.getValorJuros()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? multaInformada.getValorJuros() : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
            }
            totalMultas = Utils.somar(totalMultas, devido, totalMultas);
            BigDecimal base = BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()));
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaInformada.getTaxaJurosMulta().divide(Utils.CEM)));
            totalMultas = Utils.somar(totalMultas, dev, totalMultas);
        }
        return totalMultas;
    }

    public BigDecimal calcularTotalDevido() {
        BigDecimal totalDevido = BigDecimal.ZERO;
        totalDevido = Utils.somar(totalDevido, this.getDevidoPrincipal(), totalDevido);
        totalDevido = Utils.somar(totalDevido, this.getDevidoJuroDeMoraPrincipal(), totalDevido);
        totalDevido = Utils.somar(totalDevido, this.getDevidoJuroDeMoraPrincipalPeriodoAtual(), totalDevido);
        totalDevido = Utils.somar(totalDevido, this.getDevidoFgts(), totalDevido);
        totalDevido = Utils.somar(totalDevido, this.getDevidoJuroDeMoraFgts(), totalDevido);
        totalDevido = Utils.somar(totalDevido, this.getDevidoJuroDeMoraFgtsPeriodoAtual(), totalDevido);
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            if (Utils.nulo(multaCalculada.getValorRemanescenteMulta()) || this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                totalDevido = Utils.somar(totalDevido, multaCalculada.getDevidoCalculada(), totalDevido);
                continue;
            }
            if (multaCalculada.getMulta().getTipoCredorDevedor() == CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) {
                totalDevido = Utils.somar(totalDevido, BigDecimal.ZERO.compareTo(multaCalculada.getValorMulta()) > 0 ? multaCalculada.getValorMulta() : multaCalculada.getDevidoCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), totalDevido);
                totalDevido = Utils.somar(totalDevido, multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)), totalDevido);
                continue;
            }
            totalDevido = Utils.somar(totalDevido, multaCalculada.getDevidoCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), totalDevido);
            totalDevido = Utils.somar(totalDevido, multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)).negate(), totalDevido);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            BigDecimal valorDaMulta = BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? multaInformada.getValorMulta() : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()));
            totalDevido = Utils.somar(totalDevido, valorDaMulta, totalDevido);
            if (!this.podeCalcularJurosDeMulta(multaInformada.getMulta())) continue;
            BigDecimal devido = BigDecimal.ZERO;
            devido = BigDecimal.ZERO.compareTo(multaInformada.getValorJuros()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? multaInformada.getValorJuros() : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
            totalDevido = Utils.somar(totalDevido, devido, totalDevido);
            BigDecimal base = BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()));
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaInformada.getTaxaJurosMulta().divide(Utils.CEM)));
            totalDevido = Utils.somar(totalDevido, dev, totalDevido);
        }
        return totalDevido;
    }

    public BigDecimal calcularTotalPago() {
        BigDecimal totalPago = BigDecimal.ZERO;
        totalPago = Utils.somar(totalPago, this.getPagoPrincipal(), totalPago);
        totalPago = Utils.somar(totalPago, this.getPagoJuroDeMoraPrincipal(), totalPago);
        totalPago = Utils.somar(totalPago, this.getPagoJuroDeMoraPrincipalPeriodoAtual(), totalPago);
        totalPago = Utils.somar(totalPago, this.getPagoFgts(), totalPago);
        totalPago = Utils.somar(totalPago, this.getPagoJuroDeMoraFgts(), totalPago);
        totalPago = Utils.somar(totalPago, this.getPagoJuroDeMoraFgtsPeriodoAtual(), totalPago);
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            if (Utils.nulo(multaCalculada.getValorRemanescenteMulta()) || this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                totalPago = Utils.somar(totalPago, multaCalculada.getPagoMulta(), totalPago);
                continue;
            }
            totalPago = Utils.somar(totalPago, multaCalculada.getPagoMulta(), totalPago);
            totalPago = Utils.somar(totalPago, multaCalculada.getPagoJuro(), totalPago);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            totalPago = Utils.somar(totalPago, multaInformada.getPagoMulta(), totalPago);
            if (!this.podeCalcularJurosDeMulta(multaInformada.getMulta())) continue;
            totalPago = Utils.somar(totalPago, multaInformada.getPagoJuro(), totalPago);
            totalPago = Utils.somar(totalPago, multaInformada.getPagoJuroPeriodoAtual(), totalPago);
        }
        return totalPago;
    }

    public BigDecimal calcularTotalDiferenca() {
        BigDecimal totalDiferenca = BigDecimal.ZERO;
        totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaPrincipal(), totalDiferenca);
        totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaJuroDeMoraPrincipal(), totalDiferenca);
        totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaJuroDeMoraPrincipalPeriodoAtual(), totalDiferenca);
        totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaFgts(), totalDiferenca);
        totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaJuroDeMoraFgts(), totalDiferenca);
        totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaJuroDeMoraFgtsPeriodoAtual(), totalDiferenca);
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            if (Utils.nulo(multaCalculada.getValorRemanescenteMulta()) || this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                totalDiferenca = Utils.somar(totalDiferenca, multaCalculada.getDiferencaCalculadaCreditosDoReclamante(), totalDiferenca);
                continue;
            }
            totalDiferenca = Utils.somar(totalDiferenca, multaCalculada.getDiferencaCalculadaRemanescente(BigDecimal.ZERO.compareTo(multaCalculada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaCalculada.getMulta().getTipoCredorDevedor()) ? BigDecimal.ONE : multaCalculada.getIndiceDeCorrecao()), totalDiferenca);
            BigDecimal aliquota = multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM);
            BigDecimal valorMultaSobreJurosDoPeriodo = multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? this.getDiferencaMultaCalculadaSobreJurosDoPeriodo(aliquota, multaCalculada.getPagoJuro().negate()).negate() : this.getDiferencaMultaCalculadaSobreJurosDoPeriodo(aliquota, multaCalculada.getPagoJuro()));
            totalDiferenca = Utils.somar(totalDiferenca, valorMultaSobreJurosDoPeriodo, totalDiferenca);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            BigDecimal valorDaMulta = BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? multaInformada.getValorMulta() : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()));
            BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(valorDaMulta, multaInformada.getPagoMulta(), valorDaMulta));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaMulta, totalDiferenca);
            if (!this.podeCalcularJurosDeMulta(multaInformada.getMulta())) continue;
            BigDecimal devido = BigDecimal.ZERO;
            if (multaInformada.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
                devido = BigDecimal.ZERO.compareTo(multaInformada.getValorJuros()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? multaInformada.getValorJuros() : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
            }
            BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaInformada.getPagoJuro(), devido));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
            BigDecimal base = multaInformada.getMulta().getAplicarJurosSobreMulta() == false || BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()));
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaInformada.getTaxaJurosMulta().divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaInformada.getPagoJuroPeriodoAtual(), dev));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
        }
        return totalDiferenca;
    }

    private boolean podeCalcularJurosDeMulta(Multa multa) {
        Date dataRef = multa.getDataApartirDeAplicarJuros() != null ? multa.getDataApartirDeAplicarJuros() : (multa.getDataEvento() != null ? multa.getDataEvento() : multa.getDataVencimentoMulta());
        return multa.getAplicarJurosSobreMulta() != false && HelperDate.dateAfterOrEquals(this.getDataFinalPeriodo(), dataRef);
    }
}

