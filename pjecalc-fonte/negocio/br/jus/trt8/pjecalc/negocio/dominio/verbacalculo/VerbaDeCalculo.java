/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.DiscriminatorColumn
 *  javax.persistence.DiscriminatorType
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.Inheritance
 *  javax.persistence.InheritanceType
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.annotations.Where
 *  org.hibernate.validator.NotNull
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.Constantes;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.dominio.Data;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.comum.TabelaDeJuros;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.legendas.LegendaDaFormula;
import br.jus.trt8.pjecalc.negocio.comum.legendas.ParametrosDaFormulaDaVerbaDoCalculo;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeCalculoDoPrincipalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeGeracaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVariacaoDaParcelaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ValorDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.assuntocnj.AssuntoCnj;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.formula.Formula;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaInformada;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDaVerbaUnique;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerbaOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerbaOptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.SalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Calculada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.CartaoDePontoDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Informada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Principal;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.RepositorioDeVerbaCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TotalizadorDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ValeTransporteDaVerba;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.DiscriminatorColumn;
import javax.persistence.DiscriminatorType;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Inheritance;
import javax.persistence.InheritanceType;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.Where;
import org.hibernate.validator.NotNull;

@Entity
@Table(name="TBVERBACALCULO")
@SequenceGenerator(name="SQVERBACALCULO", sequenceName="SQVERBACALCULO", allocationSize=1)
@Inheritance(strategy=InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name="STPDISCRIMINADOR", discriminatorType=DiscriminatorType.STRING)
public abstract class VerbaDeCalculo
extends EntidadeBase {
    private static final long serialVersionUID = 7767225325027175992L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVERBACALCULO")
    @Column(name="IIDVERBACALCULO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.EAGER)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="SNMCOMPLETOVERBA", columnDefinition="VARCHAR2(120)", unique=true)
    @NotNull
    private String nome;
    @Column(name="SNMVERBA", columnDefinition="VARCHAR2(50)", unique=true)
    @NotNull
    private String descricao;
    @OneToOne
    @JoinColumn(name="ICDASSUNTO")
    @NotNull
    private AssuntoCnj assuntoCnj;
    @Column(name="STPVARIACAOPARCELA", columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoVariacaoDaParcelaEnum")})
    private TipoVariacaoDaParcelaEnum tipoVariacaoParcela = TipoVariacaoDaParcelaEnum.FIXA;
    @Column(name="SFLINCIDENCIAINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean incidenciaINSS = false;
    @Column(name="SFLINCIDENCIAIRPF", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean incidenciaIRPF = false;
    @Column(name="SFLINCIDENCIAFGTS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean incidenciaFGTS = false;
    @Column(name="SFLINCIDENCIAPREVPRIVADA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean incidenciaPrevidenciaPrivada = false;
    @Column(name="SFLINCIDENCIAPENSAO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean incidenciaPensaoAlimenticia = false;
    @Column(name="STPCARACTERISTICAVERBA", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="CaracteristicaDaVerbaEnum")})
    private CaracteristicaDaVerbaEnum caracteristica = CaracteristicaDaVerbaEnum.COMUM;
    @Column(name="STPOCORRENCIAPAGAMENTO", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="OcorrenciaDePagamentoEnum")})
    private OcorrenciaDePagamentoEnum ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.MENSAL;
    @Column(name="STPJUROSAJUIZAMENTO", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="JurosDoAjuizamentoEnum")})
    private JurosDoAjuizamentoEnum jurosDoAjuizamento = JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS;
    @Column(name="STPGERACAOPRINCIPAL", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeGeracaoEnum")})
    private TipoDeGeracaoEnum gerarPrincipal = TipoDeGeracaoEnum.DIFERENCA;
    @Column(name="DDTINICIO")
    @Temporal(value=TemporalType.DATE)
    private Date periodoInicial;
    @Column(name="DDTTERMINO")
    @Temporal(value=TemporalType.DATE)
    private Date periodoFinal;
    @Column(name="SFLPADRAOZERARVALORNEGATIVO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean zeraValorNegativo = true;
    @Column(name="SDSCOMENTARIO", columnDefinition="VARCHAR2(255)")
    private String comentarios;
    @OneToOne(fetch=FetchType.EAGER, cascade={CascadeType.ALL})
    @JoinColumn(name="IIDFORMULA")
    protected Formula formula;
    @Column(name="STPGERACAOREFLEXO", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeGeracaoEnum")})
    private TipoDeGeracaoEnum gerarReflexo = TipoDeGeracaoEnum.DIFERENCA;
    @Column(name="SFLPROPORCIONALIDADE", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarProporcionalidade;
    @Column(name="SFLATIVO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean ativo = true;
    @Column(name="SFLCOMPORPRINCIPAL", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="LogicoEnum")})
    private LogicoEnum comporPrincipal = LogicoEnum.NAO;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="verbaDeCalculo")
    @Where(clause="IIDOCORRENCIAVERBAORIGINAL IS NOT NULL")
    @OrderBy(value="dataInicial,dataInicialPeriodoAquisitivo")
    private List<OcorrenciaDeVerba> ocorrencias;
    @Column(name="SFLVERBAALTERADA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean verbaAlterada = Boolean.FALSE;
    @Where(clause="STPVINCULO = 'B' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.MERGE, CascadeType.PERSIST, CascadeType.REMOVE}, mappedBy="verbaDeCalculo")
    private List<HistoricoSalarialDaVerba> historicosDaVerbaDoValorDevido = new ArrayList<HistoricoSalarialDaVerba>();
    @Where(clause="STPVINCULO = 'P' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.MERGE, CascadeType.PERSIST, CascadeType.REMOVE}, mappedBy="verbaDeCalculo")
    private List<HistoricoSalarialDaVerba> historicosDaVerbaDoValorPago = new ArrayList<HistoricoSalarialDaVerba>();
    @Where(clause="STPVINCULO = 'Q' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="verbaDeCalculo")
    private List<CartaoDePontoDaVerba> cartoesDePontoDaVerbaQuantidade = new ArrayList<CartaoDePontoDaVerba>();
    @Where(clause="STPVINCULO = 'D' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="verbaDeCalculo")
    private List<CartaoDePontoDaVerba> cartoesDePontoDaVerbaDivisor = new ArrayList<CartaoDePontoDaVerba>();
    @OneToOne
    @JoinColumn(name="IIDSALARIOCATEGORIAVALORDEVIDO")
    private SalarioCategoria salarioCategoriaValorDevido;
    @OneToOne
    @JoinColumn(name="IIDSALARIOCATEGORIAVALORPAGO")
    private SalarioCategoria salarioCategoriaValorPago;
    @Where(clause="STPVINCULO = 'B' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="verbaDeCalculo")
    private List<ValeTransporteDaVerba> valesTransportesDoValorDevido = new ArrayList<ValeTransporteDaVerba>();
    @Where(clause="STPVINCULO = 'P' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="verbaDeCalculo")
    private List<ValeTransporteDaVerba> valesTransportesDoValorPago = new ArrayList<ValeTransporteDaVerba>();
    @Column(name="SFLEXCLUIRFALTAJUSTIFICADA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean excluirFaltaJustificada = false;
    @Column(name="SFLEXCLUIRFALTANAOJUSTIFICADA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean excluirFaltaNaoJustificada = false;
    @Column(name="SFLEXCLUIRFERIASGOZADAS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean excluirFeriasGozadas = false;
    @Transient
    protected MaquinaDeCalculo<?> maquinaDeCalculo;
    @Transient
    private boolean liquidado = false;
    @Transient
    private boolean origemExpressa = false;
    @Transient
    private boolean ignorarAjusteJuros = false;
    @Transient
    private LegendaDaFormula legendaDaFormula;
    @Transient
    private TotalizadorDeVerba totalizador;
    @Transient
    private Total jurosDaVerba;
    @Transient
    private Total jurosDaVerbaAtualizacao;
    @Column(name="IIDORDEM")
    private Integer ordem = 0;
    @Transient
    private TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista;

    public VerbaDeCalculo() {
        super(RepositorioDeVerbaCalculo.class);
        this.ocorrencias = new ArrayList<OcorrenciaDeVerba>();
        this.legendaDaFormula = new LegendaDaFormula(new ParametrosDaFormulaDaVerbaDoCalculo(this));
        this.historicosDaVerbaDoValorDevido = new ArrayList<HistoricoSalarialDaVerba>();
        this.historicosDaVerbaDoValorPago = new ArrayList<HistoricoSalarialDaVerba>();
        this.cartoesDePontoDaVerbaDivisor = new ArrayList<CartaoDePontoDaVerba>();
        this.cartoesDePontoDaVerbaQuantidade = new ArrayList<CartaoDePontoDaVerba>();
        this.valesTransportesDoValorDevido = new ArrayList<ValeTransporteDaVerba>();
        this.valesTransportesDoValorPago = new ArrayList<ValeTransporteDaVerba>();
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    protected TotalizadorDeVerba getTotalizador() {
        if (Utils.nulo(this.totalizador)) {
            this.totalizador = new TotalizadorDeVerba(this);
        }
        return this.totalizador;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public VerbaDeCalculo paraO(Calculo calculo) {
        this.setCalculo(calculo);
        return this;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public AssuntoCnj getAssuntoCnj() {
        return this.assuntoCnj;
    }

    public void setAssuntoCnj(AssuntoCnj assuntoCnj) {
        this.assuntoCnj = assuntoCnj;
    }

    public TipoVariacaoDaParcelaEnum getTipoVariacaoParcela() {
        return this.tipoVariacaoParcela;
    }

    public void setTipoVariacaoParcela(TipoVariacaoDaParcelaEnum tipoVariacaoParcela) {
        this.tipoVariacaoParcela = tipoVariacaoParcela;
    }

    public Boolean getIncidenciaINSS() {
        return this.incidenciaINSS;
    }

    public void setIncidenciaINSS(Boolean incidenciaINSS) {
        this.incidenciaINSS = incidenciaINSS;
    }

    public Boolean getIncidenciaIRPF() {
        return this.incidenciaIRPF;
    }

    public void setIncidenciaIRPF(Boolean incidenciaIRPF) {
        this.incidenciaIRPF = incidenciaIRPF;
    }

    public Boolean getIncidenciaFGTS() {
        return this.incidenciaFGTS;
    }

    public void setIncidenciaFGTS(Boolean incidenciaFGTS) {
        this.incidenciaFGTS = incidenciaFGTS;
    }

    public Boolean getIncidenciaPrevidenciaPrivada() {
        return this.incidenciaPrevidenciaPrivada;
    }

    public void setIncidenciaPrevidenciaPrivada(Boolean incidenciaPrevidenciaPrivada) {
        this.incidenciaPrevidenciaPrivada = incidenciaPrevidenciaPrivada;
    }

    public Boolean getIncidenciaPensaoAlimenticia() {
        return this.incidenciaPensaoAlimenticia;
    }

    public void setIncidenciaPensaoAlimenticia(Boolean incidenciaPensaoAlimenticia) {
        this.incidenciaPensaoAlimenticia = incidenciaPensaoAlimenticia;
    }

    public OcorrenciaDePagamentoEnum getOcorrenciaDePagamento() {
        return this.ocorrenciaDePagamento;
    }

    public void setOcorrenciaDePagamento(OcorrenciaDePagamentoEnum ocorrenciaDePagamento) {
        this.ocorrenciaDePagamento = ocorrenciaDePagamento;
    }

    public JurosDoAjuizamentoEnum getJurosDoAjuizamento() {
        return this.jurosDoAjuizamento;
    }

    public void setJurosDoAjuizamento(JurosDoAjuizamentoEnum jurosDoAjuizamento) {
        this.jurosDoAjuizamento = jurosDoAjuizamento;
    }

    public Boolean getAplicarProporcionalidade() {
        return this.aplicarProporcionalidade;
    }

    public void setAplicarProporcionalidade(Boolean aplicarProporcionalidade) {
        this.aplicarProporcionalidade = aplicarProporcionalidade;
    }

    public Long getId() {
        return this.id;
    }

    public Boolean getAtivo() {
        return this.ativo;
    }

    public void setAtivo(Boolean ativo) {
        this.ativo = ativo;
    }

    public LogicoEnum getComporPrincipal() {
        return this.comporPrincipal;
    }

    public boolean isLiquidado() {
        return this.liquidado;
    }

    public void setLiquidado(boolean liquidado) {
        this.liquidado = liquidado;
    }

    public void setIgnorarAjusteJuros(boolean ignorarAjusteJuros) {
        this.ignorarAjusteJuros = ignorarAjusteJuros;
    }

    public void setComporPrincipal(LogicoEnum comporPrincipal) {
        this.comporPrincipal = comporPrincipal;
    }

    public Formula getFormula() {
        return this.formula;
    }

    public LegendaDaFormula getLegendaDaFormula() {
        return this.legendaDaFormula;
    }

    public <F extends Formula> F getFormula(Class<F> clazz) {
        return (F)this.formula;
    }

    public BigDecimal getValorDaQuantidadeCalculada(ParametroDoTermo parametro) {
        return this.getFormula(FormulaReflexo.class).getValorQuantidadeCalculada(parametro);
    }

    public void setFormula(Formula formula) {
        this.formula = formula;
    }

    public TipoDeGeracaoEnum getGerarPrincipal() {
        return this.gerarPrincipal;
    }

    public void setGerarPrincipal(TipoDeGeracaoEnum gerarPrincipal) {
        this.gerarPrincipal = gerarPrincipal;
    }

    public Date getPeriodoInicial() {
        return this.periodoInicial;
    }

    public void setPeriodoInicial(Date peridoInicial) {
        this.periodoInicial = peridoInicial;
    }

    public Date getPeriodoFinal() {
        return this.periodoFinal;
    }

    public void setPeriodoFinal(Date peridoFinal) {
        this.periodoFinal = peridoFinal;
    }

    public Boolean getZeraValorNegativo() {
        return this.zeraValorNegativo;
    }

    public void setZeraValorNegativo(Boolean zeraValorNegativo) {
        this.zeraValorNegativo = zeraValorNegativo;
    }

    public String getComentarios() {
        return this.comentarios;
    }

    public void setComentarios(String comentarios) {
        this.comentarios = comentarios;
    }

    public Boolean getVerbaAlterada() {
        return this.verbaAlterada;
    }

    public void setVerbaAlterada(Boolean verbaAlterada) {
        this.verbaAlterada = verbaAlterada;
    }

    public static void remover(VerbaDeCalculo entidade, boolean flush) {
        VerbaDeCalculo.remover(RepositorioDeVerbaCalculo.class, entidade, flush);
    }

    public static void remover(VerbaDeCalculo entidade) {
        VerbaDeCalculo.remover(RepositorioDeVerbaCalculo.class, entidade, true);
    }

    public static void substituir(VerbaDeCalculo substituida, VerbaDeCalculo substituta) {
        VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).substituir(substituida, substituta);
    }

    public static VerbaDeCalculo obter(Object id) {
        return (VerbaDeCalculo)VerbaDeCalculo.obter(RepositorioDeVerbaCalculo.class, id);
    }

    public static List<VerbaDeCalculo> obterTodos() {
        return VerbaDeCalculo.obterTodos(RepositorioDeVerbaCalculo.class);
    }

    public static List<VerbaDeCalculo> obterVerbasAtivasDoCalculo(Calculo calculo) {
        return VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).obterVerbasAtivasDoCalculo(calculo);
    }

    public static List<VerbaDeCalculo> obterVerbasComumMensalEDesligamento(Calculo calculo) {
        return VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).obterVerbasComumMensalEDesligamento(calculo);
    }

    public VerbaDeCalculo consistirPeriodoInicial() {
        if (Utils.naoNulo(this.periodoInicial)) {
            Data periodo = Data.dataComValor(this.periodoInicial);
            NegocioException excecao = new NegocioException();
            if (periodo.isAnteriorACemAnos()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoInicial", Mensagens.MSG0011, "Data Inicial"));
            }
            if (periodo.isPosteriorACemAnos()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoInicial", Mensagens.MSG0011, "Data Inicial"));
            }
            if (Utils.naoNulo(this.calculo) && HelperDate.dateBefore(this.periodoInicial, this.calculo.getDataAdmissao())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoInicial", Mensagens.MSG0008, "Data Inicial", "Admiss\u00e3o"));
            }
            if (Utils.naoNulo(this.calculo) && this.calculo.getPrescricaoQuinquenal().booleanValue() && this.periodoInicial.compareTo(this.calculo.getDataDePrescricao()) < 0) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoInicial", Mensagens.MSG0028, "Data de Prescri\u00e7\u00e3o"));
            }
            if (Utils.naoNulo(this.calculo.getDataDemissao())) {
                Date primeiroDiaDataDesligamento = HelperDate.getInstance(this.calculo.getDataDemissao()).setDay(1).getDate();
                if (OcorrenciaDePagamentoEnum.DESLIGAMENTO.equals((Object)this.getOcorrenciaDePagamento()) && HelperDate.dateBefore(this.periodoFinal, primeiroDiaDataDesligamento)) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoFinal", Mensagens.MSG0143, "Data Final", "Demiss\u00e3o"));
                }
            }
            if (!excecao.getMensagensDeRecurso().isEmpty()) {
                throw excecao;
            }
        }
        return this;
    }

    private VerbaDeCalculo consistirPeriodoFinal() {
        if (Utils.naoNulo(this.periodoFinal)) {
            Data periodo = Data.dataComValor(this.periodoFinal);
            NegocioException excecao = new NegocioException();
            if (periodo.isAnteriorACemAnos()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "periodoFinal", Mensagens.MSG0011, "Data Final"));
            }
            if (periodo.isPosteriorACemAnos()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "periodoFinal", Mensagens.MSG0011, "Data Final"));
            }
            if (Data.dataComValor(this.periodoFinal).isAnteriorA(this.periodoInicial)) {
                if (this.isOrigemExpressa() && this.getCalculo().getPrescricaoQuinquenal().booleanValue() && Utils.naoNulo(this.getCalculo().getDataPrescricaoQuinquenal()) && Utils.naoNulo(this.getCalculo().getDataDemissao()) && HelperDate.dateBefore(this.getCalculo().getDataDemissao(), this.getCalculo().getDataPrescricaoQuinquenal())) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "periodoFinal", Mensagens.MSG0085, new Object[0]));
                } else {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "periodoFinal", Mensagens.MSG0008, "Data Final", "Data Inicial"));
                }
            }
            if (Utils.naoNulo(this.calculo.getDataDemissao())) {
                if (!this.isComPagamentoMensal()) {
                    if (Data.dataComValor(this.periodoFinal).isApos(this.calculo.getDataDemissao())) {
                        excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "periodoFinal", Mensagens.MSG0029, "Data Final", "Data Demiss\u00e3o"));
                    }
                } else if (Data.dataComValor(this.periodoFinal).isApos(this.calculo.getDataDemissao())) {
                    if (Utils.nulo(this.calculo.getDataTerminoCalculo())) {
                        excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "periodoFinal", Mensagens.MSG0010, "Data Final", "Data Demiss\u00e3o"));
                    } else if (Data.dataComValor(this.calculo.getDataTerminoCalculo()).isApos(this.calculo.getDataDemissao())) {
                        if (Data.dataComValor(this.periodoFinal).isApos(this.calculo.getDataTerminoCalculo())) {
                            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "periodoFinal", Mensagens.MSG0010, "Data Final", "Data Final do C\u00e1lculo"));
                        }
                    } else {
                        excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "periodoFinal", Mensagens.MSG0010, "Data Final", "Data Demiss\u00e3o"));
                    }
                }
            } else if (Utils.naoNulo(this.calculo.getDataTerminoCalculo()) && Data.dataComValor(this.periodoFinal).isApos(this.calculo.getDataTerminoCalculo())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "periodoFinal", Mensagens.MSG0010, "Data Final", "Data Final do C\u00e1lculo"));
            }
            if (!excecao.getMensagensDeRecurso().isEmpty()) {
                throw excecao;
            }
        }
        return this;
    }

    private VerbaDeCalculo consistirOcorrenciaDeDesligamentoAvisoPrevio() {
        if (this.isComPagamentoNoDesligamento() && (this.isPrincipal() || this.getAtivo().booleanValue())) {
            NegocioException excecao = new NegocioException();
            if (this.isVerbaDeAvisoPrevio()) {
                if (this.getCalculo().getDataDemissao() == null) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0022, "Ocorr\u00eancia de Pagamento"));
                } else if (this.isPrincipal() && this.getCalculo().getDataTerminoCalculo() != null && !HelperDate.dateAfterOrEquals(this.getCalculo().getDataTerminoCalculo(), this.getCalculo().getDataDemissao())) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0021, "Ocorr\u00eancia de Pagamento"));
                }
            }
            if (!excecao.getMensagensDeRecurso().isEmpty()) {
                throw excecao;
            }
        }
        return this;
    }

    private VerbaDeCalculo consistirOcorrenciaDeDesligamento() {
        if (this.isComPagamentoNoDesligamento() && (this.isPrincipal() || this.getAtivo().booleanValue())) {
            NegocioException excecao = new NegocioException();
            if (this.isVerbaComum()) {
                if (this.getCalculo().getDataDemissao() == null) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0022, "Ocorr\u00eancia de Pagamento"));
                } else if (this.isPrincipal() && this.getCalculo().getDataTerminoCalculo() != null && !HelperDate.dateAfterOrEquals(this.getCalculo().getDataTerminoCalculo(), HelperDate.getCurrentCompetence(this.getCalculo().getDataDemissao()).getDate())) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0027, "Ocorr\u00eancia de Pagamento"));
                }
            }
            if (!excecao.getMensagensDeRecurso().isEmpty()) {
                throw excecao;
            }
        }
        return this;
    }

    private VerbaDeCalculo consistirFormula() {
        if (Utils.naoNulo(this.formula)) {
            this.formula.consistir();
        }
        return this;
    }

    @Override
    public VerbaDeCalculo validar() {
        Formula formula = this.getFormula();
        if (formula.getValorPago().isCalculado()) {
            if (BaseDeCalculoDoPrincipalEnum.MAIOR_REMUNERACAO == formula.getValorPago().getBaseTabelada() && Utils.nulo(this.getCalculo().getValorMaiorRemuneracao())) {
                throw new NegocioException(new MensagemDeRecurso("baseTabelada", Mensagens.MSG0118, new Object[0]));
            }
            if (BaseDeCalculoDoPrincipalEnum.HISTORICO_SALARIAL == formula.getValorPago().getBaseTabelada() && this.getHistoricosDaVerbaDoValorPago().isEmpty()) {
                throw new NegocioException(new MensagemDeRecurso("baseHistoricosValorPago", Mensagens.MSG0003, "Hist\u00f3rico Salarial"));
            }
            if (BaseDeCalculoDoPrincipalEnum.VALE_TRANSPORTE == formula.getValorPago().getBaseTabelada() && this.getValesTransportesDoValorPago().isEmpty()) {
                throw new NegocioException(new MensagemDeRecurso("valeTransportePago", Mensagens.MSG0003, "Vale Transporte"));
            }
        }
        return this.consistirOcorrenciaDeDesligamento().consistirOcorrenciaDeDesligamentoAvisoPrevio().consistirPeriodoFinal().consistirFormula();
    }

    public Date sugerirPeriodoFinal() {
        if (Utils.naoNulo(this.calculo)) {
            if (Utils.naoNulos(this.calculo.getDataDemissao(), this.calculo.getDataTerminoCalculo())) {
                if (this.isPrincipal() || !this.isPrincipal() && OcorrenciaDePagamentoEnum.MENSAL.equals((Object)this.getOcorrenciaDePagamento())) {
                    if (Data.dataComValor(this.calculo.getDataDemissao()).isApos(this.calculo.getDataTerminoCalculo())) {
                        return this.calculo.getDataTerminoCalculo();
                    }
                    return this.calculo.getDataDemissao();
                }
                return this.calculo.getDataDemissao();
            }
            if (Utils.naoNulo(this.calculo.getDataTerminoCalculo())) {
                return this.calculo.getDataTerminoCalculo();
            }
            return this.calculo.getDataDemissao();
        }
        return Calendar.getInstance().getTime();
    }

    public Date sugerirPeriodoInicial() {
        if (Utils.naoNulo(this.calculo)) {
            if (!this.calculo.getPrescricaoQuinquenal().booleanValue()) {
                if (Utils.naoNulo(this.calculo.getDataAdmissao()) && Utils.nulos(this.calculo.getDataInicioCalculo())) {
                    return this.calculo.getDataAdmissao();
                }
                if (Utils.naoNulos(this.calculo.getDataAdmissao(), this.calculo.getDataInicioCalculo())) {
                    return this.calculo.getDataInicioCalculo();
                }
            } else {
                Calendar dataDePrescricao = Calendar.getInstance();
                dataDePrescricao.setTime(this.calculo.getDataAjuizamento());
                dataDePrescricao.add(1, -5);
                if (Utils.naoNulo(this.calculo.getDataAdmissao()) && Utils.nulos(this.calculo.getDataInicioCalculo())) {
                    if (dataDePrescricao.getTime().compareTo(this.calculo.getDataAdmissao()) >= 0) {
                        return dataDePrescricao.getTime();
                    }
                    return this.calculo.getDataAdmissao();
                }
                if (Utils.naoNulos(this.calculo.getDataAdmissao(), this.calculo.getDataInicioCalculo())) {
                    if (dataDePrescricao.getTime().compareTo(this.calculo.getDataInicioCalculo()) >= 0) {
                        return dataDePrescricao.getTime();
                    }
                    return this.calculo.getDataInicioCalculo();
                }
            }
        }
        return Calendar.getInstance().getTime();
    }

    public String toString() {
        return Utils.objetoParaString(this, "nome");
    }

    public static Principal converterParaPrincipal(Calculo calculo, Verba verba) {
        Principal principal = null;
        if (verba.getTipo() == TipoDeVerbaEnum.PRINCIPAL) {
            principal = verba.getValor() == ValorDaVerbaEnum.CALCULADO ? new Calculada(calculo) : new Informada(calculo);
            principal.copiar(verba);
        }
        return principal;
    }

    public void copiar(Verba verba) {
        this.setNome(verba.getNome());
        this.setDescricao(verba.getDescricao());
        this.setAssuntoCnj(verba.getAssuntoCnj());
        this.setIncidenciaINSS(verba.getIncidenciaINSS());
        this.setIncidenciaIRPF(verba.getIncidenciaIRPF());
        this.setIncidenciaFGTS(verba.getIncidenciaFGTS());
        this.setIncidenciaPrevidenciaPrivada(verba.getIncidenciaPrevidenciaPrivada());
        this.setIncidenciaPensaoAlimenticia(verba.getIncidenciaPensaoAlimenticia());
        this.setTipoVariacaoParcela(verba.getTipoVariacaoParcela());
        this.setCaracteristica(verba.getCaracteristica());
        this.setOcorrenciaDePagamento(verba.getOcorrenciaDePagamento());
        this.setJurosDoAjuizamento(verba.getJurosDoAjuizamento());
        this.setAplicarProporcionalidade(Utils.falsoSeNulo(verba.getAplicarProporcionalidade()));
        this.setGerarReflexo(verba.getGeracaoReflexo());
        this.setExcluirFaltaJustificada(verba.getExcluirFaltaJustificada());
        this.setExcluirFaltaNaoJustificada(verba.getExcluirFaltaNaoJustificada());
        this.setExcluirFeriasGozadas(verba.getExcluirFeriasGozadas());
        this.setComporPrincipal(verba.getComporPrincipal());
        this.setAtivo(true);
        this.setCalculo(this.calculo);
        this.setPeriodoInicial(this.sugerirPeriodoInicial());
        this.setPeriodoFinal(this.sugerirPeriodoFinal());
        this.setGerarPrincipal(TipoDeGeracaoEnum.DIFERENCA);
        this.setZeraValorNegativo(this.calculo.getZeraValorNegativo());
        this.setComentarios("");
        if (verba.getValor() == ValorDaVerbaEnum.INFORMADO) {
            this.getFormula(FormulaInformada.class).getConstante().setValor(new BigDecimal("0.00"));
        }
        if (RegimeDoContratoEnum.INTERMITENTE.equals((Object)this.getCalculo().getRegimeDoContrato()) && (CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)verba.getCaracteristica()) || CaracteristicaDaVerbaEnum.FERIAS.equals((Object)verba.getCaracteristica()))) {
            this.setOcorrenciaDePagamento(OcorrenciaDePagamentoEnum.MENSAL);
        }
    }

    public void preencherPeriodoVerba() {
        if (this.getCalculo().getDataInicioCalculo() != null) {
            this.setPeriodoInicial(this.getCalculo().getDataInicioCalculo());
        } else if (this.getCalculo().getDataAdmissao() != null) {
            this.setPeriodoInicial(this.getCalculo().getDataAdmissao());
        }
        Calculo calculoDaVerba = this.getCalculo();
        if (calculoDaVerba.getDataDemissao() != null) {
            if (calculoDaVerba.getDataTerminoCalculo() == null) {
                this.setPeriodoFinal(calculoDaVerba.getDataDemissao());
            } else if (calculoDaVerba.getDataDemissao().after(calculoDaVerba.getDataTerminoCalculo())) {
                this.setPeriodoFinal(calculoDaVerba.getDataTerminoCalculo());
            } else {
                this.setPeriodoFinal(calculoDaVerba.getDataDemissao());
            }
        } else if (calculoDaVerba.getDataTerminoCalculo() != null) {
            this.setPeriodoFinal(calculoDaVerba.getDataTerminoCalculo());
        }
    }

    public CaracteristicaDaVerbaEnum getCaracteristica() {
        return this.caracteristica;
    }

    public void setCaracteristica(CaracteristicaDaVerbaEnum caracteristica) {
        this.caracteristica = caracteristica;
    }

    public TipoDeGeracaoEnum getGerarReflexo() {
        return this.gerarReflexo;
    }

    public void setGerarReflexo(TipoDeGeracaoEnum gerarReflexo) {
        this.gerarReflexo = gerarReflexo;
    }

    public MaquinaDeCalculo<?> getMaquinaDeCalculo() {
        return this.maquinaDeCalculo;
    }

    public void setMaquinaDeCalculorencias(MaquinaDeCalculo<?> maquinaDeCalculo) {
        this.maquinaDeCalculo = maquinaDeCalculo;
    }

    public abstract ValorDaVerbaEnum getTipoValor();

    public List<OcorrenciaDeVerba> getOcorrencias() {
        return this.ocorrencias;
    }

    public List<OcorrenciaDeVerba> getOcorrenciasAtivas() {
        ArrayList<OcorrenciaDeVerba> ativas = new ArrayList<OcorrenciaDeVerba>();
        for (OcorrenciaDeVerba ocorrencia : this.getOcorrencias()) {
            if (!ocorrencia.getAtivo().booleanValue()) continue;
            ativas.add(ocorrencia);
        }
        return ativas;
    }

    public void setOcorrencias(List<OcorrenciaDeVerba> ocorrencias) {
        this.ocorrencias = ocorrencias;
    }

    public List<CartaoDePontoDaVerba> getCartoesDePontoDaVerbaQuantidade() {
        return this.cartoesDePontoDaVerbaQuantidade;
    }

    public void setCartoesDePontoDaVerbaQuantidade(List<CartaoDePontoDaVerba> cartaoDePontoDaVerbaQuantidade) {
        this.cartoesDePontoDaVerbaQuantidade = cartaoDePontoDaVerbaQuantidade;
    }

    public void removerDosCartoesDaVerbaDaQuantidade(List<CartaoDePontoDaVerba> cartoes) {
        for (CartaoDePontoDaVerba cartaoDePontoDaVerba : cartoes) {
            if (cartaoDePontoDaVerba.getId() == null) continue;
            this.cartoesDePontoDaVerbaQuantidade.remove(cartaoDePontoDaVerba);
        }
    }

    public void adicionarCartoesVinculadosAtravesDaQuantidade(Set<CartaoDePontoDaVerba> cartoes) {
        this.cartoesDePontoDaVerbaQuantidade.clear();
        for (CartaoDePontoDaVerba cartaoDePontoDaVerba : cartoes) {
            cartaoDePontoDaVerba.setVerbaDeCalculo(this);
            this.cartoesDePontoDaVerbaQuantidade.add(cartaoDePontoDaVerba);
        }
    }

    public List<CartaoDePontoDaVerba> getCartoesDePontoDaVerbaDivisor() {
        return this.cartoesDePontoDaVerbaDivisor;
    }

    public void setCartoesDePontoDaVerbaDivisor(List<CartaoDePontoDaVerba> cartaoDePontoDaVerbaDivisor) {
        this.cartoesDePontoDaVerbaDivisor = cartaoDePontoDaVerbaDivisor;
    }

    public void adicionarCartoesVinculadosAtravesDoDivisor(Set<CartaoDePontoDaVerba> cartoes) {
        this.cartoesDePontoDaVerbaDivisor.clear();
        for (CartaoDePontoDaVerba cartaoDePontoDaVerba : cartoes) {
            cartaoDePontoDaVerba.setVerbaDeCalculo(this);
            this.cartoesDePontoDaVerbaDivisor.add(cartaoDePontoDaVerba);
        }
    }

    public void removerDosCartoesDaVerbaDoDivisor(List<CartaoDePontoDaVerba> cartoes) {
        for (CartaoDePontoDaVerba cartaoDePontoDaVerba : cartoes) {
            if (cartaoDePontoDaVerba.getId() == null) continue;
            this.cartoesDePontoDaVerbaDivisor.remove(cartaoDePontoDaVerba);
        }
    }

    public List<HistoricoSalarialDaVerba> getHistoricosDaVerbaDoValorDevido() {
        return this.historicosDaVerbaDoValorDevido;
    }

    public void setHistoricosDaVerbaDoValorDevido(List<HistoricoSalarialDaVerba> historicosDaVerbaDoValorDevido) {
        this.historicosDaVerbaDoValorDevido = historicosDaVerbaDoValorDevido;
    }

    public List<HistoricoSalarialDaVerba> getHistoricosDaVerbaDoValorPago() {
        return this.historicosDaVerbaDoValorPago;
    }

    public void setHistoricosDaVerbaDoValorPago(List<HistoricoSalarialDaVerba> historicosDaVerbaDoValorPago) {
        this.historicosDaVerbaDoValorPago = historicosDaVerbaDoValorPago;
    }

    public void adicionarHistoricosVinculadosAtravesDoValorDevido(Set<HistoricoSalarialDaVerba> historicos) {
        this.historicosDaVerbaDoValorDevido.clear();
        for (HistoricoSalarialDaVerba historicoSalarialDaVerba : historicos) {
            historicoSalarialDaVerba.setVerbaDeCalculo(this);
            this.historicosDaVerbaDoValorDevido.add(historicoSalarialDaVerba);
        }
    }

    public void removerDosHistoricosDaVerbaDoValorDevido(List<HistoricoSalarialDaVerba> historicosDaVerba) {
        for (HistoricoSalarialDaVerba historicoSalarialDaVerba : historicosDaVerba) {
            if (historicoSalarialDaVerba.getId() == null) continue;
            this.historicosDaVerbaDoValorDevido.remove(historicoSalarialDaVerba);
        }
    }

    public void removerDosHistoricosDaVerbaDoValorPago(List<HistoricoSalarialDaVerba> historicosDaVerba) {
        for (HistoricoSalarialDaVerba historicoSalarialDaVerba : historicosDaVerba) {
            if (historicoSalarialDaVerba.getId() == null) continue;
            this.historicosDaVerbaDoValorPago.remove(historicoSalarialDaVerba);
        }
    }

    public void adicionarHistoricosVinculadosAtravesDoValorPago(Set<HistoricoSalarialDaVerba> historicos) {
        this.historicosDaVerbaDoValorPago.clear();
        for (HistoricoSalarialDaVerba historicoSalarialDaVerba : historicos) {
            historicoSalarialDaVerba.setVerbaDeCalculo(this);
            this.historicosDaVerbaDoValorPago.add(historicoSalarialDaVerba);
        }
    }

    public List<ValeTransporteDaVerba> getValesTransportesDoValorDevido() {
        return this.valesTransportesDoValorDevido;
    }

    public void setValesTransportesDoValorDevido(List<ValeTransporteDaVerba> valesTransportesDoValorDevido) {
        this.valesTransportesDoValorDevido = valesTransportesDoValorDevido;
    }

    public List<ValeTransporteDaVerba> getValesTransportesDoValorPago() {
        return this.valesTransportesDoValorPago;
    }

    public void setValesTransportesDoValorPago(List<ValeTransporteDaVerba> valesTransportesDoValorPago) {
        this.valesTransportesDoValorPago = valesTransportesDoValorPago;
    }

    public void adicionarValesVinculadosAtravesDoValorDevido(Set<ValeTransporteDaVerba> vales) {
        this.valesTransportesDoValorDevido.clear();
        for (ValeTransporteDaVerba vale : vales) {
            vale.setVerbaDeCalculo(this);
            this.valesTransportesDoValorDevido.add(vale);
        }
    }

    public void removerDosValesDaVerbaDoValorDevido(List<ValeTransporteDaVerba> vales) {
        for (ValeTransporteDaVerba vale : vales) {
            if (vale.getId() == null) continue;
            this.valesTransportesDoValorDevido.remove(vale);
        }
    }

    public void removerDosValesDaVerbaDoValorPago(List<ValeTransporteDaVerba> vales) {
        for (ValeTransporteDaVerba vale : vales) {
            if (vale.getId() == null) continue;
            this.valesTransportesDoValorPago.remove(vale);
        }
    }

    public void adicionarValesVinculadosAtravesDoValorPago(Set<ValeTransporteDaVerba> vales) {
        this.valesTransportesDoValorPago.clear();
        for (ValeTransporteDaVerba vale : vales) {
            vale.setVerbaDeCalculo(this);
            this.valesTransportesDoValorPago.add(vale);
        }
    }

    public void gerarOcorrencias(boolean manterAlteracoes) throws NegocioException {
        this.getMaquinaDeCalculo().gerarOcorrencias(manterAlteracoes);
        this.setVerbaAlterada(false);
    }

    public void liquidar() throws NegocioException {
        this.getMaquinaDeCalculo().liquidar();
        this.setLiquidado(true);
        this.setOrdem(this.calculo.getOrdem());
    }

    public BigDecimal getValorTotalDevido() {
        return this.getTotalizador().getDevido();
    }

    public BigDecimal getValorTotalPago() {
        return this.getTotalizador().getPago();
    }

    public BigDecimal getValorTotalDiferenca() {
        return this.getTotalizador().getDiferenca();
    }

    public BigDecimal getValorTotalDiferencaCorrigida() {
        return this.getTotalizador().getDiferencaCorrigida();
    }

    public BigDecimal getValorTotalDiferencaCorrigidaDeFeriasGozadas() {
        return this.getTotalizador().getDiferencaCorrigidaDeFeriasGozadas();
    }

    public BigDecimal getValorTotalDiferencaCorrigidaParaCalculoDasIncidencias() {
        return this.getTotalizador().getDiferencaCorrigidaParaCalculoDasIncidencias();
    }

    public BigDecimal getValorDeJuros() {
        if (LogicoEnum.NAO.equals((Object)this.getComporPrincipal())) {
            return BigDecimal.ZERO;
        }
        if (Utils.naoNulo(this.jurosDaVerba)) {
            return this.jurosDaVerba.getValor();
        }
        this.jurosDaVerba = Total.newInstance(true);
        OptimizerListSearch<Competencia, ApuracaoDeJuros> jurosListSearch = this.getCalculo().getApuracoesDeJurosOptimizerListSearch();
        for (OcorrenciaDeVerba ocorrencia : this.getOcorrenciasAtivas()) {
            Iterator<ApuracaoDeJuros> apuracaoDeJurosIterator = jurosListSearch.search(Competencia.getInstance(ocorrencia.getDataInicial()));
            HashMap<Date, ApuracaoDeJuros> mapaPorDataInicial = new HashMap<Date, ApuracaoDeJuros>();
            while (Utils.naoNulo(apuracaoDeJurosIterator) && apuracaoDeJurosIterator.hasNext()) {
                ApuracaoDeJuros juros = apuracaoDeJurosIterator.next();
                mapaPorDataInicial.put(juros.getDataInicial(), juros);
            }
            Date dataInicialProcurada = this.encontrarDataInicialProcurada(ocorrencia);
            ApuracaoDeJuros jurosRelativoVerba = (ApuracaoDeJuros)mapaPorDataInicial.get(dataInicialProcurada);
            if (Utils.nulo(jurosRelativoVerba)) continue;
            BigDecimal valorADescontarContribuicaoSocial = BigDecimal.ZERO;
            if (this.getIncidenciaINSS().booleanValue()) {
                valorADescontarContribuicaoSocial = this.encontrarDescontoContribuicaoSocial(ocorrencia, jurosRelativoVerba);
            }
            BigDecimal valorADescontarPrevidenciaPrivada = BigDecimal.ZERO;
            if (this.getIncidenciaPrevidenciaPrivada().booleanValue()) {
                valorADescontarPrevidenciaPrivada = this.encontrarDescontoPrevidenciaPrivada(ocorrencia, jurosRelativoVerba);
            }
            BigDecimal capitalDaVerba = Utils.arredondarValorMonetario(ocorrencia.getDiferencaCorrigida());
            capitalDaVerba = Utils.subtrair(capitalDaVerba, valorADescontarContribuicaoSocial);
            capitalDaVerba = Utils.subtrair(capitalDaVerba, valorADescontarPrevidenciaPrivada);
            this.jurosDaVerba.acumular(Utils.aplicarTaxa(jurosRelativoVerba.getTaxaDeJuros(), capitalDaVerba));
        }
        if (!this.ignorarAjusteJuros) {
            this.ajustarArredondamentoJurosDasVerbas();
        }
        return this.jurosDaVerba.getValor();
    }

    public BigDecimal getValorDeJurosParaAtualizacao(OptimizerListSearch<Competencia, ApuracaoDeJuros> jurosListSearch) {
        if (LogicoEnum.NAO.equals((Object)this.getComporPrincipal())) {
            return BigDecimal.ZERO;
        }
        this.jurosDaVerbaAtualizacao = Total.newInstance(true);
        for (OcorrenciaDeVerba ocorrencia : this.getOcorrenciasAtivas()) {
            Iterator<ApuracaoDeJuros> apuracaoDeJurosIterator = jurosListSearch.search(Competencia.getInstance(ocorrencia.getDataInicial()));
            HashMap<Date, ApuracaoDeJuros> mapaPorDataInicial = new HashMap<Date, ApuracaoDeJuros>();
            while (Utils.naoNulo(apuracaoDeJurosIterator) && apuracaoDeJurosIterator.hasNext()) {
                ApuracaoDeJuros juros = apuracaoDeJurosIterator.next();
                mapaPorDataInicial.put(juros.getDataInicial(), juros);
            }
            Date dataInicialProcurada = this.encontrarDataInicialProcurada(ocorrencia);
            ApuracaoDeJuros jurosRelativoVerba = (ApuracaoDeJuros)mapaPorDataInicial.get(dataInicialProcurada);
            if (Utils.nulo(jurosRelativoVerba)) continue;
            BigDecimal valorADescontarContribuicaoSocial = BigDecimal.ZERO;
            if (this.getIncidenciaINSS().booleanValue()) {
                valorADescontarContribuicaoSocial = this.encontrarDescontoContribuicaoSocial(ocorrencia, jurosRelativoVerba);
            }
            BigDecimal valorADescontarPrevidenciaPrivada = BigDecimal.ZERO;
            if (this.getIncidenciaPrevidenciaPrivada().booleanValue()) {
                valorADescontarPrevidenciaPrivada = this.encontrarDescontoPrevidenciaPrivada(ocorrencia, jurosRelativoVerba);
            }
            BigDecimal capitalDaVerba = Utils.arredondarValorMonetario(ocorrencia.getDiferencaCorrigidaParaAtualizacao());
            capitalDaVerba = Utils.subtrair(capitalDaVerba, valorADescontarContribuicaoSocial);
            capitalDaVerba = Utils.subtrair(capitalDaVerba, valorADescontarPrevidenciaPrivada);
            this.jurosDaVerbaAtualizacao.acumular(Utils.aplicarTaxa(jurosRelativoVerba.getTaxaDeJuros(), capitalDaVerba));
        }
        if (!this.ignorarAjusteJuros) {
            this.ajustarArredondamentoJurosDasVerbas();
        }
        return this.jurosDaVerbaAtualizacao.getValor();
    }

    private BigDecimal encontrarDescontoContribuicaoSocial(OcorrenciaDeVerba ocorrencia, ApuracaoDeJuros jurosRelativoVerba) {
        BigDecimal valorADescontarContribuicaoSocial = BigDecimal.ZERO;
        if (CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)this.getCaracteristica())) {
            valorADescontarContribuicaoSocial = ocorrencia.getDiferenca().multiply(jurosRelativoVerba.getContribuicaoSocialDecimoTerceiro(), Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(jurosRelativoVerba.getValorVerbaParaContribuicaoSocialDecimoTerceiro()) != 0) {
                valorADescontarContribuicaoSocial = valorADescontarContribuicaoSocial.divide(jurosRelativoVerba.getValorVerbaParaContribuicaoSocialDecimoTerceiro(), Utils.CONTEXTO_MATEMATICO);
            }
        } else if (CaracteristicaDaVerbaEnum.FERIAS.equals((Object)this.getCaracteristica())) {
            BigDecimal base = ocorrencia.getDiferencaParaCalculoDasIncidencias();
            if (Utils.naoNulo(base)) {
                valorADescontarContribuicaoSocial = base.multiply(jurosRelativoVerba.getContribuicaoSocialNormal(), Utils.CONTEXTO_MATEMATICO);
                if (BigDecimal.ZERO.compareTo(jurosRelativoVerba.getValorVerbaParaContribuicaoSocial()) != 0) {
                    valorADescontarContribuicaoSocial = valorADescontarContribuicaoSocial.divide(jurosRelativoVerba.getValorVerbaParaContribuicaoSocial(), Utils.CONTEXTO_MATEMATICO);
                }
            }
        } else {
            valorADescontarContribuicaoSocial = ocorrencia.getDiferenca().multiply(jurosRelativoVerba.getContribuicaoSocialNormal(), Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(jurosRelativoVerba.getValorVerbaParaContribuicaoSocial()) != 0) {
                valorADescontarContribuicaoSocial = valorADescontarContribuicaoSocial.divide(jurosRelativoVerba.getValorVerbaParaContribuicaoSocial(), Utils.CONTEXTO_MATEMATICO);
            }
        }
        return valorADescontarContribuicaoSocial;
    }

    private BigDecimal encontrarDescontoPrevidenciaPrivada(OcorrenciaDeVerba ocorrencia, ApuracaoDeJuros jurosRelativoVerba) {
        BigDecimal valorADescontarPrevidenciaPrivada = BigDecimal.ZERO;
        if (CaracteristicaDaVerbaEnum.FERIAS.equals((Object)this.getCaracteristica())) {
            BigDecimal base = ocorrencia.getDiferencaParaCalculoDasIncidencias();
            if (Utils.naoNulo(base)) {
                valorADescontarPrevidenciaPrivada = base.multiply(jurosRelativoVerba.getPrevidenciaPrivada(), Utils.CONTEXTO_MATEMATICO);
                if (BigDecimal.ZERO.compareTo(jurosRelativoVerba.getValorVerbaParaPrevidenciaPrivada()) != 0) {
                    valorADescontarPrevidenciaPrivada = valorADescontarPrevidenciaPrivada.divide(jurosRelativoVerba.getValorVerbaParaPrevidenciaPrivada(), Utils.CONTEXTO_MATEMATICO);
                }
            }
        } else {
            valorADescontarPrevidenciaPrivada = ocorrencia.getDiferenca().multiply(jurosRelativoVerba.getPrevidenciaPrivada(), Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(jurosRelativoVerba.getValorVerbaParaPrevidenciaPrivada()) != 0) {
                valorADescontarPrevidenciaPrivada = valorADescontarPrevidenciaPrivada.divide(jurosRelativoVerba.getValorVerbaParaPrevidenciaPrivada(), Utils.CONTEXTO_MATEMATICO);
            }
        }
        return valorADescontarPrevidenciaPrivada;
    }

    private Date encontrarDataInicialProcurada(OcorrenciaDeVerba ocorrencia) {
        HelperDate ultimoDiaDoMesDaDataInicialDaOcorrencia;
        Date dataInicialProcurada = HelperDate.getInstance(this.getCalculo().getDataAjuizamento()).removeTime().getDate();
        if (JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS.equals((Object)this.getJurosDoAjuizamento()) && (ultimoDiaDoMesDaDataInicialDaOcorrencia = HelperDate.getInstance(ocorrencia.getDataInicial()).lastDayOfTheMonth()).greaterThenOrEquals(this.calculo.getDataAjuizamento())) {
            Date dataVencimentoOcorrencia = ocorrencia.getDataFinal();
            if (this.isCaracteristicaFerias()) {
                dataVencimentoOcorrencia = ocorrencia.getDataInicial();
            }
            if (HelperDate.dateAfter(dataVencimentoOcorrencia, this.calculo.getDataAjuizamento())) {
                dataInicialProcurada = dataVencimentoOcorrencia;
            }
        }
        dataInicialProcurada = this.ajustarParaSelicNoAjuizamentoSemCombinacao(dataInicialProcurada, this.isCaracteristicaFerias() ? ocorrencia.getDataInicial() : ocorrencia.getDataFinal());
        dataInicialProcurada = this.ajustarParaPeriodoPreJudicial(dataInicialProcurada, ocorrencia);
        return dataInicialProcurada;
    }

    private void ajustarArredondamentoJurosDasVerbas() {
        BigDecimal maiorJuros;
        VerbaDeCalculo verbaComMaiorJuros = this;
        BigDecimal totalJuros = maiorJuros = this.jurosDaVerba.getValor();
        for (VerbaDeCalculo verba : this.calculo.getVerbasAtivas()) {
            if (!LogicoEnum.SIM.equals((Object)verba.getComporPrincipal()) || verba.equals(this)) continue;
            verba.setIgnorarAjusteJuros(true);
            BigDecimal jurosDaVerba = verba.getValorDeJuros();
            verba.setIgnorarAjusteJuros(false);
            if (jurosDaVerba.compareTo(maiorJuros) > 0 || jurosDaVerba.compareTo(maiorJuros) == 0 && verba.getNome().compareTo(this.getNome()) > 0) {
                verbaComMaiorJuros = verba;
                maiorJuros = jurosDaVerba;
            }
            totalJuros = Utils.somar(totalJuros, jurosDaVerba, totalJuros);
        }
        BigDecimal diferenca = Utils.subtrair(totalJuros, this.calculo.getTotalDeJurosDaApuracaoDeJuros());
        verbaComMaiorJuros.ajustarJuros(diferenca);
    }

    private void ajustarJuros(BigDecimal diferenca) {
        this.jurosDaVerba.diminuir(diferenca);
    }

    private Date ajustarParaPeriodoPreJudicial(Date dataInicialProcurada, OcorrenciaDeVerba ocorrencia) {
        if (this.getCalculo().getParametrosDeAtualizacao().getAplicarJurosFasePreJudicial().booleanValue() && JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS.equals((Object)this.getJurosDoAjuizamento())) {
            dataInicialProcurada = this.isCaracteristicaFerias() ? ocorrencia.getDataInicial() : ocorrencia.getDataFinal();
        }
        return dataInicialProcurada;
    }

    private Date ajustarParaSelicNoAjuizamentoSemCombinacao(Date dataInicialProcurada, Date dataVencimento) {
        if (HelperDate.dateEquals(HelperDate.getCurrentCompetence(dataVencimento).getDate(), HelperDate.getCurrentCompetence(this.getCalculo().getDataAjuizamento()).getDate()) && TabelaDeJuros.isSelicIndiceNoAjuizamentoSemCombinacao(this.getCalculo().getParametrosDeAtualizacao(), this.getCalculo().getDataAjuizamento())) {
            dataInicialProcurada = HelperDate.getCurrentCompetence(dataVencimento).lastDayOfTheMonth().getDate();
        }
        return dataInicialProcurada;
    }

    public void reverterValorOriginalDasOcorrencias() {
        for (OcorrenciaDeVerba ocorrenciaDeVerba : this.getOcorrencias()) {
            OcorrenciaDeVerba original = ocorrenciaDeVerba.getOcorrenciaOriginal();
            if (original == null) continue;
            ocorrenciaDeVerba.setDataFinal(original.getDataFinal());
            ocorrenciaDeVerba.setDataInicial(original.getDataInicial());
            ocorrenciaDeVerba.setDevido(original.getDevido());
            ocorrenciaDeVerba.setDivisor(original.getDivisor());
            ocorrenciaDeVerba.setDobra(original.getDobra());
            ocorrenciaDeVerba.setMultiplicador(original.getMultiplicador());
            ocorrenciaDeVerba.setPago(original.getPago());
            ocorrenciaDeVerba.setQuantidade(original.getQuantidade());
            ocorrenciaDeVerba.setValor(original.getValor());
        }
    }

    public Boolean getExcluirFaltaJustificada() {
        return this.excluirFaltaJustificada;
    }

    public void setExcluirFaltaJustificada(Boolean excluirFaltaJustificada) {
        this.excluirFaltaJustificada = excluirFaltaJustificada;
    }

    public Boolean getExcluirFaltaNaoJustificada() {
        return this.excluirFaltaNaoJustificada;
    }

    public void setExcluirFaltaNaoJustificada(Boolean excluirFaltaNaoJustificada) {
        this.excluirFaltaNaoJustificada = excluirFaltaNaoJustificada;
    }

    public Boolean getExcluirFeriasGozadas() {
        return this.excluirFeriasGozadas;
    }

    public void setExcluirFeriasGozadas(Boolean excluirFeriasGozadas) {
        this.excluirFeriasGozadas = excluirFeriasGozadas;
    }

    public SalarioCategoria getSalarioCategoriaValorDevido() {
        return this.salarioCategoriaValorDevido;
    }

    public void setSalarioCategoriaValorDevido(SalarioCategoria salarioCategoriaValorDevido) {
        this.salarioCategoriaValorDevido = salarioCategoriaValorDevido;
    }

    public SalarioCategoria getSalarioCategoriaValorPago() {
        return this.salarioCategoriaValorPago;
    }

    public void setSalarioCategoriaValorPago(SalarioCategoria salarioCategoriaValorPago) {
        this.salarioCategoriaValorPago = salarioCategoriaValorPago;
    }

    @Override
    public void salvar() {
        this.consistirPeriodoInicial();
        VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).salvar(this);
    }

    public void salvarPrincipalSemValidarReflexo() {
        this.consistirPeriodoInicial();
        VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).salvarPrincipalSemValidarReflexo(this);
    }

    public void adicionarEmOcorrencias(OcorrenciaDeVerba filho) {
        VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).adicionarEmOcorrencias(this, filho);
    }

    public void removerDeOcorrencias(OcorrenciaDeVerba filho, boolean flush) {
        ArrayList<OcorrenciaDeVerba> filhos = new ArrayList<OcorrenciaDeVerba>();
        filhos.add(filho);
        this.removerDeOcorrencias(filhos, flush);
    }

    public void removerDeOcorrencias(List<OcorrenciaDeVerba> filhos, boolean flush) {
        VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).removerDeOcorrencias(this, filhos, flush);
    }

    public void limparOcorrencias(boolean flush) {
        VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).limparOcorrencias(this, flush);
    }

    public void desmarcarComoAlterada() {
        VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).desmarcarComoAlterada(this);
    }

    public void marcarComoAlterada() {
        VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).marcarComoAlterada(this);
    }

    public VerbaDeCalculo pagamentoMensal() {
        this.ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.MENSAL;
        return this;
    }

    public boolean isComPagamentoMensal() {
        return OcorrenciaDePagamentoEnum.MENSAL.equals((Object)this.ocorrenciaDePagamento);
    }

    public VerbaDeCalculo pagamentoEmDezembro() {
        this.ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.DEZEMBRO;
        return this;
    }

    public boolean isComPagamentoEmDezembro() {
        return OcorrenciaDePagamentoEnum.DEZEMBRO.equals((Object)this.ocorrenciaDePagamento);
    }

    public VerbaDeCalculo pagamentoNoDesligamento() {
        this.ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.DESLIGAMENTO;
        return this;
    }

    public boolean isComPagamentoNoDesligamento() {
        return OcorrenciaDePagamentoEnum.DESLIGAMENTO.equals((Object)this.ocorrenciaDePagamento);
    }

    public VerbaDeCalculo pagamentoNoPeriodoAquisitivo() {
        this.ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO;
        return this;
    }

    public boolean isComPagamentoNoPeriodoAquisitivo() {
        return OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO.equals((Object)this.ocorrenciaDePagamento);
    }

    public VerbaDeCalculo comCaracteristicaComum() {
        this.setCaracteristica(CaracteristicaDaVerbaEnum.COMUM);
        return this;
    }

    public boolean isVerbaComum() {
        return CaracteristicaDaVerbaEnum.COMUM.equals((Object)this.caracteristica);
    }

    public VerbaDeCalculo comCaracteristicaDeDecimoTerceiro() {
        this.setCaracteristica(CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO);
        return this;
    }

    public boolean isVerbaDeDecimoTerceiro() {
        return CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)this.caracteristica);
    }

    public VerbaDeCalculo comCaracteristicaDeAvisoPrevio() {
        this.setCaracteristica(CaracteristicaDaVerbaEnum.AVISO_PREVIO);
        return this;
    }

    public boolean isVerbaDeAvisoPrevio() {
        return CaracteristicaDaVerbaEnum.AVISO_PREVIO.equals((Object)this.caracteristica);
    }

    public VerbaDeCalculo comCaracteristicaDeFerias() {
        this.setCaracteristica(CaracteristicaDaVerbaEnum.FERIAS);
        return this;
    }

    public boolean isVerbaDeFerias() {
        return CaracteristicaDaVerbaEnum.FERIAS.equals((Object)this.caracteristica);
    }

    public void checarAvisoPrevio(Calculo calculo) {
        if (this.getFormula() instanceof FormulaReflexo && CaracteristicaDaVerbaEnum.AVISO_PREVIO.equals((Object)this.getCaracteristica())) {
            Calculo cal;
            FormulaReflexo formula = (FormulaReflexo)this.getFormula();
            Calculo calculo2 = cal = calculo != null ? calculo : this.getCalculo();
            if (cal.isPrazoAvisoCalculado()) {
                formula.getQuantidade().setTipo(TipoDeQuantidadeEnum.APURADA);
            } else if (cal.isPrazoAvisoInfo()) {
                formula.getQuantidade().setTipo(TipoDeQuantidadeEnum.INFORMADA);
                formula.getQuantidade().setValorInformado(new BigDecimal(cal.getPrazoAvisoInformado()));
            } else if (formula.getQuantidade().getTipo() == TipoDeQuantidadeEnum.APURADA) {
                formula.getQuantidade().setTipo(TipoDeQuantidadeEnum.INFORMADA);
                formula.getQuantidade().setValorInformado(Constantes.QUANTIDADE_PADRAO_AVISO_PREVIO);
            } else if (formula.getQuantidade().getTipo() == TipoDeQuantidadeEnum.INFORMADA) {
                formula.getQuantidade().setValorInformado(Constantes.QUANTIDADE_PADRAO_AVISO_PREVIO);
            }
        }
    }

    public void checarAvisoPrevio() {
        this.checarAvisoPrevio(null);
    }

    public List<OcorrenciaDeVerba> obterOcorrenciasDoMes(Date mes) {
        ArrayList<OcorrenciaDeVerba> listaOcorrencias = new ArrayList<OcorrenciaDeVerba>();
        for (OcorrenciaDeVerba ocorrencia : this.getOcorrencias()) {
            if (!HelperDate.getInstance(ocorrencia.getDataInicial()).compareMonthAndYear(mes)) continue;
            listaOcorrencias.add(ocorrencia);
        }
        return listaOcorrencias;
    }

    public List<OcorrenciaDeVerba> obterOcorrenciasDoAno(Date ano) {
        ArrayList<OcorrenciaDeVerba> listaOcorrencias = new ArrayList<OcorrenciaDeVerba>();
        for (OcorrenciaDeVerba ocorrencia : this.getOcorrencias()) {
            if (!HelperDate.getInstance(ocorrencia.getDataInicial()).compareYear(ano)) continue;
            listaOcorrencias.add(ocorrencia);
        }
        return listaOcorrencias;
    }

    public List<OcorrenciaDeVerba> obterDozeOcorrenciasAnterioresAoMes(Date mes) {
        ArrayList<OcorrenciaDeVerba> listaOcorrencias = new ArrayList<OcorrenciaDeVerba>();
        for (OcorrenciaDeVerba ocorrencia : this.getOcorrencias()) {
            if (!HelperDate.getInstance(ocorrencia.getDataInicial()).belongsToLastTwelveMonths(mes)) continue;
            listaOcorrencias.add(ocorrencia);
        }
        return listaOcorrencias;
    }

    public List<OcorrenciaDeVerba> obterOcorrenciasEntreMeses(Date mesInicial, Date mesFinal) {
        mesInicial = HelperDate.getCurrentCompetence(mesInicial).getDate();
        mesFinal = HelperDate.getCurrentCompetence(mesFinal).getDate();
        ArrayList<OcorrenciaDeVerba> listaOcorrencias = new ArrayList<OcorrenciaDeVerba>();
        for (OcorrenciaDeVerba ocorrencia : this.getOcorrencias()) {
            Date competenciaOcorrencia = HelperDate.getCurrentCompetence(ocorrencia.getDataInicial()).getDate();
            if (!HelperDate.dateBeforeOrEquals(competenciaOcorrencia, mesFinal) || !HelperDate.dateBeforeOrEquals(mesInicial, competenciaOcorrencia)) continue;
            listaOcorrencias.add(ocorrencia);
        }
        return listaOcorrencias;
    }

    public abstract boolean isPrincipal();

    public abstract boolean isInformada();

    public boolean isOrigemExpressa() {
        return this.origemExpressa;
    }

    public Integer getOrdem() {
        return this.ordem;
    }

    public void setOrdem(Integer ordem) {
        this.ordem = ordem;
    }

    public void setOrigemExpressa(boolean origemExpressa) {
        this.origemExpressa = origemExpressa;
    }

    public static List<Principal> obterVerbasPrincipaisDo(Calculo calculo) {
        return VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).obterVerbasPrincipaisAtivas(calculo);
    }

    public boolean existemOcorrenciasComDivisorAlterado() {
        if (ValorDaVerbaEnum.CALCULADO.equals((Object)this.getTipoValor())) {
            for (OcorrenciaDeVerba ocorrecia : this.getOcorrencias()) {
                if (!ocorrecia.getAtivo().booleanValue() || !ocorrecia.isDivisorAlterado()) continue;
                return true;
            }
        }
        return false;
    }

    public boolean existemOcorrenciasComMultiplicadorAlterado() {
        if (ValorDaVerbaEnum.CALCULADO.equals((Object)this.getTipoValor())) {
            for (OcorrenciaDeVerba ocorrecia : this.getOcorrencias()) {
                if (!ocorrecia.getAtivo().booleanValue() || !ocorrecia.isMultiplicadorAlterado()) continue;
                return true;
            }
        }
        return false;
    }

    public boolean existemOcorrenciasComQuantidadeAlterado() {
        if (ValorDaVerbaEnum.CALCULADO.equals((Object)this.getTipoValor())) {
            for (OcorrenciaDeVerba ocorrecia : this.getOcorrencias()) {
                if (!ocorrecia.getAtivo().booleanValue() || !ocorrecia.isQuantidadeAlterada()) continue;
                return true;
            }
        }
        return false;
    }

    public OptimizerListSearch<Competencia, OcorrenciaDeVerba> getOcorrenciasOptimizerListSearch() {
        return new OcorrenciaDeVerbaOptimizerListSearch().init((Collection<OcorrenciaDeVerba>)this.getOcorrencias());
    }

    public OptimizerListSearch<Competencia, OcorrenciaDeVerba> getOcorrenciasAtivasOptimizerListSearch() {
        return new OcorrenciaDeVerbaOptimizerListSearch().init((Collection<OcorrenciaDeVerba>)this.getOcorrenciasAtivas());
    }

    public OptimizerListSearchUnique<OcorrenciaDaVerbaUnique, OcorrenciaDeVerba> getOcorrenciasOptimizerListSearchUnique() {
        for (OcorrenciaDeVerba o : this.getOcorrencias()) {
            if (this.getOcorrenciaDePagamento() != OcorrenciaDePagamentoEnum.MENSAL) continue;
            o.setDataInicial(HelperDate.getCurrentCompetence(o.getDataInicial()).getDate());
            o.setDataFinal(HelperDate.getCurrentCompetence(o.getDataFinal()).getDate());
        }
        return new OcorrenciaDeVerbaOptimizerListSearchUnique().init((Collection<OcorrenciaDeVerba>)this.getOcorrencias());
    }

    public boolean isComporOPrincipal() {
        return LogicoEnum.SIM == this.getComporPrincipal();
    }

    public boolean isCaracteristicaFerias() {
        return CaracteristicaDaVerbaEnum.FERIAS == this.getCaracteristica();
    }

    public String getDescricao() {
        return this.descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public void montarNomeCompleto(List<ItemBaseVerba> verbas) {
        if (this.isPrincipal()) {
            this.setNome(this.getDescricao().toUpperCase());
        } else if (this instanceof Reflexo) {
            if (verbas == null) {
                verbas = ((FormulaReflexo)this.getFormula()).getBaseVerba().getItens();
            }
            VerbaDeCalculo v = null;
            for (ItemBaseVerba itemBaseverba : verbas) {
                if (!itemBaseverba.getVerbaDeCalculo().isPrincipal()) continue;
                v = itemBaseverba.getVerbaDeCalculo();
                break;
            }
            StringBuilder sb = new StringBuilder(this.getDescricao() + (v != null ? " SOBRE " + v.getDescricao() : " "));
            int qtReflexosBaseRestantes = verbas.size() - 1;
            for (ItemBaseVerba itemBaseverba : verbas) {
                if (itemBaseverba.getVerbaDeCalculo().isPrincipal()) continue;
                if (qtReflexosBaseRestantes > 1) {
                    sb.append(", " + itemBaseverba.getVerbaDeCalculo().getDescricao());
                } else {
                    sb.append(" E " + itemBaseverba.getVerbaDeCalculo().getDescricao());
                }
                --qtReflexosBaseRestantes;
            }
            this.setNome(sb.length() > 120 ? sb.substring(0, 119).toString().toUpperCase() : sb.toString().toUpperCase());
        }
    }

    public TabelaDeCorrecaoMonetaria getTabelaDeCorrecaoMonetariaTrabalhista() {
        if (Utils.nulo(this.tabelaDeCorrecaoMonetariaTrabalhista)) {
            this.tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(this.getCalculo().getAtualizacaoMonetaria(), this.getCalculo().getIndicesAcumulados(), null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
            this.tabelaDeCorrecaoMonetariaTrabalhista.setOrigemCalculo(Boolean.TRUE);
            this.tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(this.getCalculo().getDataAdmissao(), this.getCalculo().getDataDeLiquidacao()));
        }
        return this.tabelaDeCorrecaoMonetariaTrabalhista;
    }

    public void setTabelaDeCorrecaoMonetariaTrabalhista(TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista) {
        this.tabelaDeCorrecaoMonetariaTrabalhista = tabelaDeCorrecaoMonetariaTrabalhista;
    }

    @Override
    public int hashCode() {
        return this.getHashCodeBuilder().append((Object)this.verbaAlterada).hashCode();
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
        return this.getEqualsBuilder(obj).append((Object)this.verbaAlterada, (Object)((VerbaDeCalculo)obj).verbaAlterada).isEquals();
    }

    public boolean verificarQuantidadeOcorrenciasCorrespondemParametrosDoCalculo(Calculo calculoAberto, VerbaDeCalculo verba) {
        Calculo calculo = calculoAberto;
        ArrayList<Periodo> periodosAquisitivos = new ArrayList<Periodo>();
        Periodo ultimoPeriodoAquisitivoCompleto = null;
        Periodo periodoFracionario = null;
        Set<Ferias> listaFerias = calculo.getListaDeFerias();
        if (Utils.nulo(listaFerias)) {
            listaFerias = new HashSet<Ferias>();
        }
        if (!Utils.nulos(verba.getPeriodoInicial(), verba.getPeriodoFinal())) {
            for (Ferias ferias : listaFerias) {
                if (ultimoPeriodoAquisitivoCompleto == null || HelperDate.dateAfter(ferias.getPeriodoAquisitivo().getFinal(), ultimoPeriodoAquisitivoCompleto.getFinal())) {
                    ultimoPeriodoAquisitivoCompleto = ferias.getPeriodoAquisitivo();
                }
                periodosAquisitivos.add(ferias.getPeriodoAquisitivo());
            }
            if (Utils.naoNulo(calculo.getDataDemissao()) && HelperDate.dateBeforeOrEquals(calculo.getDataDemissao(), verba.getPeriodoFinal())) {
                HelperDate dataDemissaoProjetada = HelperDate.getInstance(calculo.getDataDemissao());
                if (calculo.getProjetaAvisoIndenizado().booleanValue()) {
                    dataDemissaoProjetada.addDay(calculo.obterQuantidadeAdicionalAvisoPrevio());
                }
                HelperDate dataInicialDoPeriodoAquisitivoFracionario = null;
                dataInicialDoPeriodoAquisitivoFracionario = ultimoPeriodoAquisitivoCompleto == null ? HelperDate.getInstance(calculo.getDataAdmissao()) : HelperDate.getInstance(ultimoPeriodoAquisitivoCompleto.getFinal()).addDay(1);
                if (dataDemissaoProjetada.subtractDays(dataInicialDoPeriodoAquisitivoFracionario) > 14L) {
                    periodoFracionario = new Periodo(dataInicialDoPeriodoAquisitivoFracionario.getDate(), dataDemissaoProjetada.getDate());
                }
            }
        }
        if (periodoFracionario != null) {
            periodosAquisitivos.add(periodoFracionario);
        }
        BigDecimal quantidadeCalculada = null;
        block1: for (OcorrenciaDeVerba ocorrencia : this.getOcorrenciasAtivas()) {
            for (Periodo periodoAquisitivo : periodosAquisitivos) {
                if (!Utils.naoNulo(ocorrencia.getDataInicialPeriodoAquisitivo()) || !HelperDate.dateEquals(ocorrencia.getDataInicialPeriodoAquisitivo(), periodoAquisitivo.getInicial())) continue;
                quantidadeCalculada = verba.getValorDaQuantidadeCalculada(new ParametroDoTermo(calculo, verba, null, null, null, periodoAquisitivo, null));
                if (ocorrencia.getQuantidade().compareTo(quantidadeCalculada.setScale(4, RoundingMode.HALF_EVEN)) == 0) continue block1;
                return false;
            }
        }
        return true;
    }
}

