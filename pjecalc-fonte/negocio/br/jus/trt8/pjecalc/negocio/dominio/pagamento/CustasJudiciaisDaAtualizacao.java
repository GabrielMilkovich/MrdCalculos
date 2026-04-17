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
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.annotations.Where
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.Constantes;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaCustasCalculadasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CustasDevidasFixasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndicesAcumuladosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeLiquidacaoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustaPaga;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.regras.DataVencimentoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.ArmazenamentoDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.AutoJudicialDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustaPagaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasFixasDaAtualizacaoDoEvento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDeCustasJudiciaisDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import java.math.BigDecimal;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.Where;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBCUSTASCALCULOATUALIZACAO")
@SequenceGenerator(name="SQCUSTASCALCULOATUALIZACAO", sequenceName="SQCUSTASCALCULOATUALIZACAO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="custasJudiciaisAtualizacao")
public class CustasJudiciaisDaAtualizacao
extends EntidadeBase {
    private static final long serialVersionUID = -5250189651050035237L;
    public static final BigDecimal TAXA_RECLAMANTE_CONHECIMENTO;
    public static final BigDecimal TAXA_RECLAMADO_CONHECIMENTO;
    public static final BigDecimal TAXA_RECLAMADO_LIQUIDACAO;
    public static final BigDecimal TAXA_CUSTAS_AUTO;
    public static final BigDecimal TAXA_CUSTAS_ARMAZENAMENTO;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCUSTASCALCULOATUALIZACAO")
    @Column(name="IIDCUSTASATUALIZACAO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDATUALIZACAO")
    private Atualizacao atualizacao;
    @Column(name="DDTINICIAL")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicialPeriodo;
    @Column(name="DDTFINAL")
    @Temporal(value=TemporalType.DATE)
    private Date dataFinalPeriodo;
    @Column(name="STPBASECUSTASCALCULADAS", columnDefinition="VARCHAR2(4)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="BaseParaCustasCalculadasEnum")})
    private BaseParaCustasCalculadasEnum baseParaCustasCalculadas = BaseParaCustasCalculadasEnum.BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO;
    @Column(name="RVLBASECUSTASCALCULADAS", precision=38, scale=25, nullable=true)
    private BigDecimal valorBaseCustasCalculadas;
    @Column(name="STPCUSTASCONHECIMENTORTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeCustasDeConhecimentoEnum")})
    private TipoDeCustasDeConhecimentoEnum tipoDeCustasDeConhecimentoDoReclamante = TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA;
    @Column(name="RVLPISOCUSTASCONHECIMENTORTE", precision=12, scale=2, nullable=true)
    private BigDecimal pisoCustasConhecimentoReclamante;
    @Column(name="RVLTETOCUSTASCONHECIMENTORTE", precision=12, scale=2, nullable=true)
    private BigDecimal tetoCustasConhecimentoReclamante;
    @Column(name="DDTVENCCUSTASCONHECIMENTORTE", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @Required(condition="bean.tipoDeCustasDeConhecimentoDoReclamante.valor == 'I'")
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=1)
    private Date dataVencimentoConhecimentoDoReclamante;
    @Column(name="RVLCUSTASCONHECIMENTORTE", precision=38, scale=25, nullable=true)
    @Required(condition="bean.tipoDeCustasDeConhecimentoDoReclamante.valor == 'I'")
    private BigDecimal valorDeConhecimentoDoReclamante;
    @Column(name="RVLJUROSCUSTASCONHECIMENTORTE", precision=38, scale=25, nullable=true)
    private BigDecimal valorDeJurosDeCustasDeConhecimentoDoReclamante;
    @Column(name="RVLINDICECORRECAOCONHECRTE", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustasConhecimentoReclamante;
    @Column(name="RVLTAXAJUROSCONHECRTE", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasConhecimentoReclamante;
    @Column(name="STPCUSTASCONHECIMENTORDO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeCustasDeConhecimentoEnum")})
    private TipoDeCustasDeConhecimentoEnum tipoDeCustasDeConhecimentoDoReclamado = TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO;
    @Column(name="RVLPISOCUSTASCONHECIMENTORDO", precision=12, scale=2, nullable=true)
    private BigDecimal pisoCustasConhecimentoReclamado;
    @Column(name="RVLTETOCUSTASCONHECIMENTORDO", precision=12, scale=2, nullable=true)
    private BigDecimal tetoCustasConhecimentoReclamado;
    @Column(name="DDTVENCCUSTASCONHECIMENTORDO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @Required(condition="bean.tipoDeCustasDeConhecimentoDoReclamado.valor == 'I'")
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=2)
    private Date dataVencimentoConhecimentoDoReclamado;
    @Column(name="RVLCUSTASCONHECIMENTORDO", precision=38, scale=25, nullable=true)
    @Required(condition="bean.tipoDeCustasDeConhecimentoDoReclamado.valor == 'I'")
    private BigDecimal valorConhecimentoDoReclamado;
    @Column(name="RVLJUROSCUSTASCONHECIMENTORDO", precision=38, scale=25, nullable=true)
    private BigDecimal valorDeJurosDeCustasDeConhecimentoDoReclamado;
    @Column(name="RVLINDICECORRECAOCONHECRDO", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustasConhecimentoReclamado;
    @Column(name="RVLTAXAJUROSCONHECRDO", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasConhecimentoReclamado;
    @Column(name="STPCUSTASLIQUIDACAO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeCustasDeLiquidacaoEnum")})
    private TipoDeCustasDeLiquidacaoEnum tipoDeCustasDeLiquidacao = TipoDeCustasDeLiquidacaoEnum.NAO_SE_APLICA;
    @Column(name="RVLTETOCUSTASLIQUIDACAO", precision=12, scale=2, nullable=true)
    private BigDecimal tetoCustasLiquidacao;
    @Column(name="DDTVENCIMENTOCUSTASLIQUIDACAO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @Required(condition="bean.tipoDeCustasDeLiquidacao.valor == 'I'")
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=3)
    private Date dataVencimentoCustasDeLiquidacao;
    @Column(name="RVLCUSTASLIQUIDACAO", precision=38, scale=25, nullable=true)
    @Required(condition="bean.tipoDeCustasDeLiquidacao.valor == 'I'")
    private BigDecimal valorCustasDeLiquidacao;
    @Column(name="RVLJUROSCUSTASLIQUIDACAO", precision=38, scale=25, nullable=true)
    private BigDecimal valorDeJurosDeCustasDeLiquidacao;
    @Column(name="RVLINDICECORRECAOLIQUIDACAO", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustasLiquidacao;
    @Column(name="RVLTAXAJUROSLIQUIDACAO", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasLiquidacao;
    @Column(name="DDTVENCIMENTOCUSTASFIXAS", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=4)
    private Date dataVencimentoCustasFixas;
    @Column(name="RVLINDICECORRECAOFIXAS", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustasFixas;
    @Column(name="RVLTAXAJUROSFIXAS", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasFixas;
    @Column(name="IQTATOSURBANOS", nullable=true)
    private Integer qtdeAtosUrbanos;
    @Column(name="IQTATOSRURAIS", nullable=true)
    private Integer qtdeAtosRurais;
    @Column(name="IQTAGRAVOINSTRUMENTO", nullable=true)
    private Integer qtdeAgravosDeInstrumento;
    @Column(name="IQTAGRAVOPETICAO", nullable=true)
    private Integer qtdeAgravosDePeticao;
    @Column(name="IQTIMPUGNACAOSENTENCA", nullable=true)
    private Integer qtdeImpugnacaoSentenca;
    @Column(name="IQTEMBARGOSARREMATACAO", nullable=true)
    private Integer qtdeEmbargosArrematacao;
    @Column(name="IQTEMBARGOSEXECUCAO", nullable=true)
    private Integer qtdeEmbargosExecucao;
    @Column(name="IQTEMBARGOSTERCEIROS", nullable=true)
    private Integer qtdeEmbargosTerceiros;
    @Column(name="IQTRECURSOREVISTA", nullable=true)
    private Integer qtdeRecursoRevista;
    @Column(name="RVLATOSURBANOS", precision=12, scale=2, nullable=true)
    private BigDecimal valorAtosUrbanos;
    @Column(name="RVLATOSRURAIS", precision=12, scale=2, nullable=true)
    private BigDecimal valorAtosRurais;
    @Column(name="RVLAGRAVOINSTRUMENTO", precision=12, scale=2, nullable=true)
    private BigDecimal valorAgravoInstrumento;
    @Column(name="RVLAGRAVOPETICAO", precision=12, scale=2, nullable=true)
    private BigDecimal valorAgravoPeticao;
    @Column(name="RVLIMPUGNACAOSENTENCA", precision=12, scale=2, nullable=true)
    private BigDecimal valorImpuganacaoSentenca;
    @Column(name="RVLEMBARGOSARREMATACAO", precision=12, scale=2, nullable=true)
    private BigDecimal valorEmbargosArrematacao;
    @Column(name="RVLEMBARGOSEXECUCAO", precision=12, scale=2, nullable=true)
    private BigDecimal valorEmbargosExecucao;
    @Column(name="RVLEMBARGOSTERCEIROS", precision=12, scale=2, nullable=true)
    private BigDecimal valorEmbargosTerceiros;
    @Column(name="RVLRECURSOREVISTA", precision=12, scale=2, nullable=true)
    private BigDecimal valorRecursoRevista;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="custasJudiciaisDaAtualizacao")
    @OrderBy(value="dataEvento")
    private Set<CustasFixasDaAtualizacaoDoEvento> custasFixasAtualizacao = new HashSet<CustasFixasDaAtualizacaoDoEvento>();
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="custasJudiciaisDaAtualizacao")
    @OrderBy(value="dataInicioArmazenamento")
    private Set<ArmazenamentoDaAtualizacao> armazenamentos = new HashSet<ArmazenamentoDaAtualizacao>();
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="custasJudiciaisDaAtualizacao")
    @OrderBy(value="dataVencimentoAuto")
    private Set<AutoJudicialDaAtualizacao> autosJudiciais = new HashSet<AutoJudicialDaAtualizacao>();
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="custasJudiciaisDaAtualizacao")
    @Where(clause="STPPAGANTE = 'RT' ")
    @OrderBy(value="dataVencimento")
    private Set<CustaPagaDaAtualizacao> custasPagasDoReclamante = new HashSet<CustaPagaDaAtualizacao>();
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="custasJudiciaisDaAtualizacao")
    @Where(clause="STPPAGANTE = 'RD' ")
    @OrderBy(value="dataVencimento")
    private Set<CustaPagaDaAtualizacao> custasPagasDoReclamado = new HashSet<CustaPagaDaAtualizacao>();
    @Column(name="MVLVALORPAGORECLAMANTE", precision=12, scale=2)
    private BigDecimal valorPagoReclamante;
    @Column(name="MVLVALORPAGORECLAMANTEVALOR", precision=12, scale=2)
    private BigDecimal valorPagoReclamanteValor;
    @Column(name="MVLVALORPAGORECLAMANTEJUROS", precision=12, scale=2)
    private BigDecimal valorPagoReclamanteJuros;
    @Column(name="MVLVALORPAGORECLAMADO", precision=12, scale=2)
    private BigDecimal valorPagoReclamado;
    @Column(name="MVLVALORPAGORECLAMADOVALOR", precision=12, scale=2)
    private BigDecimal valorPagoReclamadoValor;
    @Column(name="MVLVALORPAGORECLAMADOJUROS", precision=12, scale=2)
    private BigDecimal valorPagoReclamadoJuros;
    @Column(name="DDTVENCCUSTASREMANSCNTRTE", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataVencimentoCustasRemanescentesReclamante;
    @Column(name="MVLVALORCUSTASREMANSCNTRCLMNTE", precision=12, scale=2)
    private BigDecimal valorCustasRemanescentesReclamante;
    @Column(name="MVLVALORJUROSREMANSCNTRCLMNTE", precision=12, scale=2)
    private BigDecimal valorJurosRemanescentesReclamante;
    @Column(name="RVLINDICECORRECAOREMANSCNTRTE", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustasRemanescentesReclamante;
    @Column(name="RVLTAXAJUROSREMANSCNTRTE", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasRemanescentesReclamante;
    @Column(name="DDTVENCCUSTASREMANSCNTRDO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataVencimentoCustasRemanescentesReclamado;
    @Column(name="MVLVALORCUSTASREMANSCNTRCLMDO", precision=12, scale=2)
    private BigDecimal valorCustasRemanescentesReclamado;
    @Column(name="MVLVALORJUROSREMANSCNTRCLMDO", precision=12, scale=2)
    private BigDecimal valorJurosRemanescentesReclamado;
    @Column(name="RVLINDICECORRECAOREMANSCNTRDO", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustasRemanescentesReclamado;
    @Column(name="RVLTAXAJUROSREMANSCNTRDO", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasRemanescentesReclamado;
    @Column(name="SFLJAPAGOMAVEZRECLAMADO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jaPagoUmaVezReclamado = Boolean.FALSE;
    @Column(name="SFLJAPAGOMAVEZRECLAMANTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jaPagoUmaVezReclamante = Boolean.FALSE;
    @Column(name="SFLHOUVEPAGAMENTOBASE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean houvePagamentoDaBase = Boolean.FALSE;
    @Column(name="SFLCOBRANCARECLAMANTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoCobrancaReclamanteEnum")})
    private TipoCobrancaReclamanteEnum tipoCobrancaReclamante = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;

    public CustasJudiciaisDaAtualizacao() {
        super(RepositorioDeCustasJudiciaisDaAtualizacao.class);
        this.autosJudiciais = new LinkedHashSet<AutoJudicialDaAtualizacao>();
        this.armazenamentos = new LinkedHashSet<ArmazenamentoDaAtualizacao>();
        this.custasPagasDoReclamado = new LinkedHashSet<CustaPagaDaAtualizacao>();
        this.custasPagasDoReclamante = new LinkedHashSet<CustaPagaDaAtualizacao>();
    }

    public static List<CustasJudiciaisDaAtualizacao> obterTodos(Atualizacao atualizacao) {
        return CustasJudiciaisDaAtualizacao.getRepositorio(RepositorioDeCustasJudiciaisDaAtualizacao.class).obterTodosCustasJudiciais(atualizacao);
    }

    public CustasJudiciaisDaAtualizacao(CustasJudiciaisDaAtualizacao custasJudiciais) {
        this(custasJudiciais, Boolean.FALSE);
    }

    public CustasJudiciaisDaAtualizacao(CustasJudiciaisDaAtualizacao custasJudiciais, Boolean copiarAutosArmazenamentoECustasFixas) {
        super(RepositorioDeCustasJudiciaisDaAtualizacao.class);
        this.setDataInicialPeriodo(custasJudiciais.getDataInicialPeriodo());
        this.setDataFinalPeriodo(custasJudiciais.getDataFinalPeriodo());
        this.setAtualizacao(custasJudiciais.getAtualizacao());
        this.setBaseParaCustasCalculadas(custasJudiciais.getBaseParaCustasCalculadas());
        this.setValorBaseCustasCalculadas(custasJudiciais.getValorBaseCustasCalculadas());
        this.setTipoCobrancaReclamante(custasJudiciais.getTipoCobrancaReclamante());
        this.setTipoDeCustasDeConhecimentoDoReclamante(custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamante());
        this.setPisoCustasConhecimentoReclamante(custasJudiciais.getPisoCustasConhecimentoReclamante());
        this.setTetoCustasConhecimentoReclamante(custasJudiciais.getTetoCustasConhecimentoReclamante());
        this.setDataVencimentoConhecimentoDoReclamante(custasJudiciais.getDataVencimentoConhecimentoDoReclamante());
        this.setIndiceCorrecaoCustasConhecimentoReclamante(custasJudiciais.getIndiceCorrecaoCustasConhecimentoReclamante());
        this.setTaxaJurosCustasConhecimentoReclamante(custasJudiciais.getTaxaJurosCustasConhecimentoReclamante());
        this.setValorDeConhecimentoDoReclamante(custasJudiciais.getValorDeConhecimentoDoReclamante());
        this.setValorDeJurosDeCustasDeConhecimentoDoReclamante(custasJudiciais.getValorDeJurosDeCustasDeConhecimentoDoReclamante());
        this.setTipoDeCustasDeConhecimentoDoReclamado(custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamado());
        this.setPisoCustasConhecimentoReclamado(custasJudiciais.getPisoCustasConhecimentoReclamado());
        this.setTetoCustasConhecimentoReclamado(custasJudiciais.getTetoCustasConhecimentoReclamado());
        this.setDataVencimentoConhecimentoDoReclamado(custasJudiciais.getDataVencimentoConhecimentoDoReclamado());
        this.setIndiceCorrecaoCustasConhecimentoReclamado(custasJudiciais.getIndiceCorrecaoCustasConhecimentoReclamado());
        this.setTaxaJurosCustasConhecimentoReclamado(custasJudiciais.getTaxaJurosCustasConhecimentoReclamado());
        this.setValorConhecimentoDoReclamado(custasJudiciais.getValorConhecimentoDoReclamado());
        this.setValorDeJurosDeCustasDeConhecimentoDoReclamado(custasJudiciais.getValorDeJurosDeCustasDeConhecimentoDoReclamado());
        this.setTipoDeCustasDeLiquidacao(custasJudiciais.getTipoDeCustasDeLiquidacao());
        this.setTetoCustasLiquidacao(custasJudiciais.getTetoCustasLiquidacao());
        this.setDataVencimentoCustasDeLiquidacao(custasJudiciais.getDataVencimentoCustasDeLiquidacao());
        this.setIndiceCorrecaoCustasLiquidacao(custasJudiciais.getIndiceCorrecaoCustasLiquidacao());
        this.setTaxaJurosCustasLiquidacao(custasJudiciais.getTaxaJurosCustasLiquidacao());
        this.setValorCustasDeLiquidacao(custasJudiciais.getValorCustasDeLiquidacao());
        this.setValorDeJurosDeCustasDeLiquidacao(custasJudiciais.getValorDeJurosDeCustasDeLiquidacao());
        this.setDataVencimentoCustasFixas(custasJudiciais.getDataVencimentoCustasFixas());
        this.setIndiceCorrecaoCustasFixas(custasJudiciais.getIndiceCorrecaoCustasFixas());
        this.setTaxaJurosCustasFixas(custasJudiciais.getTaxaJurosCustasFixas());
        this.setQtdeAgravosDeInstrumento(custasJudiciais.getQtdeAgravosDeInstrumento());
        this.setQtdeAgravosDePeticao(custasJudiciais.getQtdeAgravosDePeticao());
        this.setQtdeAtosRurais(custasJudiciais.getQtdeAtosRurais());
        this.setQtdeAtosUrbanos(custasJudiciais.getQtdeAtosUrbanos());
        this.setQtdeEmbargosArrematacao(custasJudiciais.getQtdeEmbargosArrematacao());
        this.setQtdeEmbargosExecucao(custasJudiciais.getQtdeEmbargosExecucao());
        this.setQtdeEmbargosTerceiros(custasJudiciais.getQtdeEmbargosTerceiros());
        this.setQtdeImpugnacaoSentenca(custasJudiciais.getQtdeImpugnacaoSentenca());
        this.setQtdeRecursoRevista(custasJudiciais.getQtdeRecursoRevista());
        this.setValorAgravoInstrumento(custasJudiciais.getValorAgravoInstrumento());
        this.setValorAgravoPeticao(custasJudiciais.getValorAgravoPeticao());
        this.setValorAtosRurais(custasJudiciais.getValorAtosRurais());
        this.setValorAtosUrbanos(custasJudiciais.getValorAtosUrbanos());
        this.setValorEmbargosArrematacao(custasJudiciais.getValorEmbargosArrematacao());
        this.setValorEmbargosExecucao(custasJudiciais.getValorEmbargosExecucao());
        this.setValorEmbargosTerceiros(custasJudiciais.getValorEmbargosTerceiros());
        this.setValorImpuganacaoSentenca(custasJudiciais.getValorImpuganacaoSentenca());
        this.setValorRecursoRevista(custasJudiciais.getValorRecursoRevista());
        this.custasFixasAtualizacao = new HashSet<CustasFixasDaAtualizacaoDoEvento>();
        this.armazenamentos = new HashSet<ArmazenamentoDaAtualizacao>();
        this.autosJudiciais = new HashSet<AutoJudicialDaAtualizacao>();
        if (copiarAutosArmazenamentoECustasFixas.booleanValue()) {
            for (AutoJudicialDaAtualizacao auto : custasJudiciais.getAutosJudiciais()) {
                this.autosJudiciais.add(auto);
            }
            for (ArmazenamentoDaAtualizacao armazenamento : custasJudiciais.getArmazenamentos()) {
                this.armazenamentos.add(armazenamento);
            }
            for (CustasFixasDaAtualizacaoDoEvento custasFixas : custasJudiciais.getCustasFixasAtualizacao()) {
                this.custasFixasAtualizacao.add(custasFixas);
            }
        }
        this.custasPagasDoReclamante = new HashSet<CustaPagaDaAtualizacao>();
        this.custasPagasDoReclamado = new HashSet<CustaPagaDaAtualizacao>();
        this.valorPagoReclamante = custasJudiciais.getValorPagoReclamante();
        this.valorPagoReclamanteJuros = custasJudiciais.getValorPagoReclamanteJuros();
        this.valorPagoReclamanteValor = custasJudiciais.getValorPagoReclamanteValor();
        this.valorPagoReclamado = custasJudiciais.getValorPagoReclamado();
        this.valorPagoReclamadoJuros = custasJudiciais.getValorPagoReclamadoJuros();
        this.valorPagoReclamadoValor = custasJudiciais.getValorPagoReclamadoValor();
        this.setDataVencimentoCustasRemanescentesReclamante(custasJudiciais.getDataVencimentoCustasRemanescentesReclamante());
        this.setIndiceCorrecaoCustasRemanescentesReclamante(custasJudiciais.getIndiceCorrecaoCustasRemanescentesReclamante());
        this.setTaxaJurosCustasRemanescentesReclamante(custasJudiciais.getTaxaJurosCustasRemanescentesReclamante());
        this.setValorCustasRemanescentesReclamante(custasJudiciais.getValorCustasRemanescentesReclamante());
        this.setValorJurosRemanescentesReclamante(custasJudiciais.getValorJurosRemanescentesReclamante());
        this.setDataVencimentoCustasRemanescentesReclamado(custasJudiciais.getDataVencimentoCustasRemanescentesReclamado());
        this.setIndiceCorrecaoCustasRemanescentesReclamado(custasJudiciais.getIndiceCorrecaoCustasRemanescentesReclamado());
        this.setTaxaJurosCustasRemanescentesReclamado(custasJudiciais.getTaxaJurosCustasRemanescentesReclamado());
        this.setValorCustasRemanescentesReclamado(custasJudiciais.getValorCustasRemanescentesReclamado());
        this.setValorJurosRemanescentesReclamado(custasJudiciais.getValorJurosRemanescentesReclamado());
        this.jaPagoUmaVezReclamado = custasJudiciais.getJaPagoUmaVezReclamado();
        this.jaPagoUmaVezReclamante = custasJudiciais.getJaPagoUmaVezReclamante();
        this.houvePagamentoDaBase = custasJudiciais.getHouvePagamentoDaBase();
    }

    public void converterParaCustasDaAtualizacao(CustasJudiciais custasJudiciais, Date dataDeLiquidacao) {
        this.setDataInicialPeriodo(this.getCalculo().getDataDeLiquidacao());
        this.setDataFinalPeriodo(this.getCalculo().getDataDeLiquidacao());
        this.valorPagoReclamado = BigDecimal.ZERO;
        this.valorPagoReclamadoJuros = BigDecimal.ZERO;
        this.valorPagoReclamadoValor = BigDecimal.ZERO;
        this.valorPagoReclamante = BigDecimal.ZERO;
        this.valorPagoReclamanteJuros = BigDecimal.ZERO;
        this.valorPagoReclamanteValor = BigDecimal.ZERO;
        this.valorCustasRemanescentesReclamante = BigDecimal.ZERO;
        this.valorJurosRemanescentesReclamante = BigDecimal.ZERO;
        this.valorCustasRemanescentesReclamado = BigDecimal.ZERO;
        this.valorJurosRemanescentesReclamado = BigDecimal.ZERO;
        this.jaPagoUmaVezReclamado = false;
        this.jaPagoUmaVezReclamante = false;
        this.houvePagamentoDaBase = false;
        this.autosJudiciais = new LinkedHashSet<AutoJudicialDaAtualizacao>();
        this.armazenamentos = new LinkedHashSet<ArmazenamentoDaAtualizacao>();
        this.custasPagasDoReclamado = new LinkedHashSet<CustaPagaDaAtualizacao>();
        this.custasPagasDoReclamante = new LinkedHashSet<CustaPagaDaAtualizacao>();
        this.setBaseParaCustasCalculadas(custasJudiciais.getBaseParaCustasCalculadas());
        this.setValorBaseCustasCalculadas(custasJudiciais.getValorBaseCustasCalculadas());
        this.converterCustasConhecimentoReclamante(custasJudiciais, dataDeLiquidacao);
        this.converterCustasConhecimentoReclamado(custasJudiciais, dataDeLiquidacao);
        this.converterCustasLiquidacao(custasJudiciais, dataDeLiquidacao);
        this.converterCustasFixas(custasJudiciais);
        CustasFixasDaAtualizacaoDoEvento custasEvento = new CustasFixasDaAtualizacaoDoEvento();
        custasEvento.setCustasJudiciaisDaAtualizacao(this);
        custasEvento.setDataEvento(custasJudiciais.getDataVencimentoCustasFixas());
        custasEvento.setQtdeAgravosDeInstrumento(custasJudiciais.getQtdeAgravosDeInstrumento());
        custasEvento.setQtdeAgravosDePeticao(custasJudiciais.getQtdeAgravosDePeticao());
        custasEvento.setQtdeAtosRurais(custasJudiciais.getQtdeAtosRurais());
        custasEvento.setQtdeAtosUrbanos(custasJudiciais.getQtdeAtosUrbanos());
        custasEvento.setQtdeEmbargosArrematacao(custasJudiciais.getQtdeEmbargosArrematacao());
        custasEvento.setQtdeEmbargosExecucao(custasJudiciais.getQtdeEmbargosExecucao());
        custasEvento.setQtdeEmbargosTerceiros(custasJudiciais.getQtdeEmbargosTerceiros());
        custasEvento.setQtdeImpugnacaoSentenca(custasJudiciais.getQtdeImpugnacaoSentenca());
        custasEvento.setQtdeRecursoRevista(custasJudiciais.getQtdeRecursoRevista());
        custasEvento.setValorAgravoInstrumento(custasJudiciais.getValorAgravoInstrumento());
        custasEvento.setValorAgravoPeticao(custasJudiciais.getValorAgravoPeticao());
        custasEvento.setValorAtosRurais(custasJudiciais.getValorAtosRurais());
        custasEvento.setValorAtosUrbanos(custasJudiciais.getValorAtosUrbanos());
        custasEvento.setValorEmbargosArrematacao(custasJudiciais.getValorEmbargosArrematacao());
        custasEvento.setValorEmbargosExecucao(custasJudiciais.getValorEmbargosExecucao());
        custasEvento.setValorEmbargosTerceiros(custasJudiciais.getValorEmbargosTerceiros());
        custasEvento.setValorImpuganacaoSentenca(custasJudiciais.getValorImpuganacaoSentenca());
        custasEvento.setValorRecursoRevista(custasJudiciais.getValorRecursoRevista());
        custasEvento.setIndiceCorrecaoCustas(custasJudiciais.getIndiceCorrecaoCustasFixas());
        custasEvento.setTaxaJurosCustasFixas(custasJudiciais.getTaxaJurosCustasFixas());
        custasEvento.setTaxaJurosCustasFixasDoPeriodo(custasJudiciais.getTaxaJurosCustasFixas());
        this.getCustasFixasAtualizacao().add(custasEvento);
        this.converterCustasArmazenamento(custasJudiciais);
        this.converterCustasAutos(custasJudiciais);
        this.converterCustasPagas(custasJudiciais);
    }

    private void converterCustasAutos(CustasJudiciais custasJudiciais) {
        for (AutoJudicial autoJudicial : custasJudiciais.getAutosJudiciaisDoCalculo()) {
            AutoJudicialDaAtualizacao autoDaAtualizacao = new AutoJudicialDaAtualizacao();
            autoDaAtualizacao.setCustasJudiciaisDaAtualizacao(this);
            autoDaAtualizacao.setDataVencimentoAuto(autoJudicial.getDataVencimentoAuto());
            autoDaAtualizacao.setIndiceCorrecao(autoJudicial.getIndiceCorrecao());
            autoDaAtualizacao.setTaxaJuros(autoJudicial.getTaxaJuros());
            autoDaAtualizacao.setTipoDeAuto(autoJudicial.getTipoDeAuto());
            autoDaAtualizacao.setValorAvaliacaoAuto(autoJudicial.getValorAvaliacaoAuto());
            autoDaAtualizacao.setValorCustasAuto(autoJudicial.getValorCustasAuto());
            autoDaAtualizacao.setValorTeto(autoJudicial.getValorTeto());
            this.getAutosJudiciais().add(autoDaAtualizacao);
        }
    }

    private void converterCustasArmazenamento(CustasJudiciais custasJudiciais) {
        for (Armazenamento armazenamento : custasJudiciais.getArmazenamentosDoCalculo()) {
            ArmazenamentoDaAtualizacao armazenamentoDaAtualizacao = new ArmazenamentoDaAtualizacao();
            armazenamentoDaAtualizacao.setCustasJudiciaisDaAtualizacao(this);
            armazenamentoDaAtualizacao.setDataInicioArmazenamento(armazenamento.getDataInicioArmazenamento());
            armazenamentoDaAtualizacao.setDataTerminoArmazenamento(armazenamento.getDataTerminoArmazenamento());
            armazenamentoDaAtualizacao.setIndiceCorrecao(armazenamento.getIndiceCorrecao());
            armazenamentoDaAtualizacao.setQtdeDias(armazenamento.getQtdeDias());
            armazenamentoDaAtualizacao.setTaxaJuros(armazenamento.getTaxaJuros());
            armazenamentoDaAtualizacao.setValorAvaliacaoArmazenamento(armazenamento.getValorAvaliacaoArmazenamento());
            armazenamentoDaAtualizacao.setValorCustasArmazenamento(armazenamento.getValorCustasArmazenamento());
            if (custasJudiciais.getCalculo().isCalculoExterno().booleanValue()) {
                ParcelasAtualizaveisOutrosDebitosReclamado parcelasExternoOutrosDebitosReclamado = ParcelasAtualizaveisOutrosDebitosReclamado.obterDoCalculo(custasJudiciais.getCalculo());
                armazenamentoDaAtualizacao.setValorJurosCalcExterno(parcelasExternoOutrosDebitosReclamado.getCustasExecucao().getValorJurosInformado());
            }
            this.getArmazenamentos().add(armazenamentoDaAtualizacao);
        }
    }

    private void converterCustasPagas(CustasJudiciais custasJudiciais) {
        CustaPagaDaAtualizacao custaPagaDaAtualizacao;
        for (CustaPaga custaPaga : custasJudiciais.getCustasPagasDoReclamante()) {
            custaPagaDaAtualizacao = new CustaPagaDaAtualizacao();
            custaPagaDaAtualizacao.setCustasJudiciaisDaAtualizacao(this);
            custaPagaDaAtualizacao.setDataVencimento(custaPaga.getDataVencimento());
            custaPagaDaAtualizacao.setIndiceCorrecao(custaPaga.getIndiceCorrecao());
            custaPagaDaAtualizacao.setTaxaJuros(custaPaga.getTaxaJuros());
            custaPagaDaAtualizacao.setTipoDePagante(custaPaga.getTipoDePagante());
            custaPagaDaAtualizacao.setValor(custaPaga.getValor());
            this.getCustasPagasDoReclamante().add(custaPagaDaAtualizacao);
        }
        for (CustaPaga custaPaga : custasJudiciais.getCustasPagasDoReclamado()) {
            custaPagaDaAtualizacao = new CustaPagaDaAtualizacao();
            custaPagaDaAtualizacao.setCustasJudiciaisDaAtualizacao(this);
            custaPagaDaAtualizacao.setDataVencimento(custaPaga.getDataVencimento());
            custaPagaDaAtualizacao.setIndiceCorrecao(custaPaga.getIndiceCorrecao());
            custaPagaDaAtualizacao.setTaxaJuros(custaPaga.getTaxaJuros());
            custaPagaDaAtualizacao.setTipoDePagante(custaPaga.getTipoDePagante());
            custaPagaDaAtualizacao.setValor(custaPaga.getValor());
            this.getCustasPagasDoReclamado().add(custaPagaDaAtualizacao);
        }
    }

    private void converterCustasFixas(CustasJudiciais custasJudiciais) {
        this.setDataVencimentoCustasFixas(custasJudiciais.getDataVencimentoCustasFixas());
        this.setIndiceCorrecaoCustasFixas(custasJudiciais.getIndiceCorrecaoCustasFixas());
        this.setTaxaJurosCustasFixas(custasJudiciais.getTaxaJurosCustasFixas());
        this.setQtdeAgravosDeInstrumento(custasJudiciais.getQtdeAgravosDeInstrumento());
        this.setQtdeAgravosDePeticao(custasJudiciais.getQtdeAgravosDePeticao());
        this.setQtdeAtosRurais(custasJudiciais.getQtdeAtosRurais());
        this.setQtdeAtosUrbanos(custasJudiciais.getQtdeAtosUrbanos());
        this.setQtdeEmbargosArrematacao(custasJudiciais.getQtdeEmbargosArrematacao());
        this.setQtdeEmbargosExecucao(custasJudiciais.getQtdeEmbargosExecucao());
        this.setQtdeEmbargosTerceiros(custasJudiciais.getQtdeEmbargosTerceiros());
        this.setQtdeImpugnacaoSentenca(custasJudiciais.getQtdeImpugnacaoSentenca());
        this.setQtdeRecursoRevista(custasJudiciais.getQtdeRecursoRevista());
        this.setValorAgravoInstrumento(custasJudiciais.getValorAgravoInstrumento());
        this.setValorAgravoPeticao(custasJudiciais.getValorAgravoPeticao());
        this.setValorAtosRurais(custasJudiciais.getValorAtosRurais());
        this.setValorAtosUrbanos(custasJudiciais.getValorAtosUrbanos());
        this.setValorEmbargosArrematacao(custasJudiciais.getValorEmbargosArrematacao());
        this.setValorEmbargosExecucao(custasJudiciais.getValorEmbargosExecucao());
        this.setValorEmbargosTerceiros(custasJudiciais.getValorEmbargosTerceiros());
        this.setValorImpuganacaoSentenca(custasJudiciais.getValorImpuganacaoSentenca());
        this.setValorRecursoRevista(custasJudiciais.getValorRecursoRevista());
    }

    private void converterCustasLiquidacao(CustasJudiciais custasJudiciais, Date dataDeLiquidacao) {
        this.setTipoDeCustasDeLiquidacao(custasJudiciais.getTipoDeCustasDeLiquidacao());
        this.setTetoCustasLiquidacao(custasJudiciais.getTetoCustasLiquidacao());
        this.setDataVencimentoCustasDeLiquidacao(dataDeLiquidacao);
        this.setIndiceCorrecaoCustasLiquidacao(this.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas() != false ? BigDecimal.ONE : null);
        this.setTaxaJurosCustasLiquidacao(this.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas() != false ? BigDecimal.ZERO : null);
        this.setValorCustasDeLiquidacao(custasJudiciais.getValorCorrigidoCustasLiquidacao());
        this.setValorDeJurosDeCustasDeLiquidacao(custasJudiciais.getJurosCustasLiquidacao());
        if (custasJudiciais.getCalculo().isCalculoExterno().booleanValue() && TipoDeCustasDeLiquidacaoEnum.INFORMADA.equals((Object)custasJudiciais.getTipoDeCustasDeLiquidacao())) {
            ParcelasAtualizaveisOutrosDebitosReclamado parcelasExternoOutrosDebitosReclamado = ParcelasAtualizaveisOutrosDebitosReclamado.obterDoCalculo(custasJudiciais.getCalculo());
            this.setValorDeJurosDeCustasDeLiquidacao(parcelasExternoOutrosDebitosReclamado.getCustasLiquidacao().getValorJurosInformado());
        }
    }

    private void converterCustasConhecimentoReclamado(CustasJudiciais custasJudiciais, Date dataDeLiquidacao) {
        this.setTipoDeCustasDeConhecimentoDoReclamado(custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamado());
        this.setPisoCustasConhecimentoReclamado(custasJudiciais.getPisoCustasConhecimentoReclamado());
        this.setTetoCustasConhecimentoReclamado(custasJudiciais.getTetoCustasConhecimentoReclamado());
        this.setDataVencimentoConhecimentoDoReclamado(dataDeLiquidacao);
        this.setIndiceCorrecaoCustasConhecimentoReclamado(this.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas() != false ? BigDecimal.ONE : null);
        this.setTaxaJurosCustasConhecimentoReclamado(this.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas() != false ? BigDecimal.ZERO : null);
        this.setValorConhecimentoDoReclamado(custasJudiciais.getValorCorrigidoCustasConhecimentoReclamado());
        this.setValorDeJurosDeCustasDeConhecimentoDoReclamado(custasJudiciais.getJurosCustasConhecimentoReclamado());
        if (custasJudiciais.getCalculo().isCalculoExterno().booleanValue() && TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamado())) {
            ParcelasAtualizaveisOutrosDebitosReclamado parcelasExternoOutrosDebitosReclamado = ParcelasAtualizaveisOutrosDebitosReclamado.obterDoCalculo(custasJudiciais.getCalculo());
            this.setValorDeJurosDeCustasDeConhecimentoDoReclamado(parcelasExternoOutrosDebitosReclamado.getCustasConhecimentoReclamado().getValorJurosInformado());
        }
    }

    private void converterCustasConhecimentoReclamante(CustasJudiciais custasJudiciais, Date dataDeLiquidacao) {
        this.setTipoCobrancaReclamante(custasJudiciais.getTipoCobrancaReclamante());
        this.setTipoDeCustasDeConhecimentoDoReclamante(custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamante());
        this.setPisoCustasConhecimentoReclamante(custasJudiciais.getPisoCustasConhecimentoReclamante());
        this.setTetoCustasConhecimentoReclamante(custasJudiciais.getTetoCustasConhecimentoReclamante());
        this.setDataVencimentoConhecimentoDoReclamante(dataDeLiquidacao);
        this.setIndiceCorrecaoCustasConhecimentoReclamante(this.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas() != false ? BigDecimal.ONE : null);
        this.setTaxaJurosCustasConhecimentoReclamante(this.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas() != false ? BigDecimal.ZERO : null);
        this.setValorDeConhecimentoDoReclamante(custasJudiciais.getValorCorrigidoCustasConhecimentoReclamante());
        this.setValorDeJurosDeCustasDeConhecimentoDoReclamante(custasJudiciais.getJurosCustasConhecimentoReclamante());
        if (custasJudiciais.getCalculo().isCalculoExterno().booleanValue() && TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamante())) {
            switch (custasJudiciais.getTipoCobrancaReclamante()) {
                case COBRAR: {
                    ParcelasAtualizaveisDebitosReclamante parcelasExternoDebitosReclamante = ParcelasAtualizaveisDebitosReclamante.obterDoCalculo(custasJudiciais.getCalculo());
                    this.setValorDeJurosDeCustasDeConhecimentoDoReclamante(parcelasExternoDebitosReclamante.getCustasConhecimentoDevReclamante().getValorJurosInformado());
                    break;
                }
                case DESCONTAR_CREDITO: {
                    ParcelasAtualizaveisDescontoCreditosReclamante parcelasExternoDescontosCreditosReclamante = ParcelasAtualizaveisDescontoCreditosReclamante.obterDoCalculo(custasJudiciais.getCalculo());
                    this.setValorDeJurosDeCustasDeConhecimentoDoReclamante(parcelasExternoDescontosCreditosReclamante.getCustasConhecimentoReclamante().getValorJurosInformado());
                    break;
                }
            }
        }
    }

    public CustasJudiciaisDaAtualizacao(Atualizacao atualizacao) {
        this();
        this.atualizacao = atualizacao;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
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

    public BaseParaCustasCalculadasEnum getBaseParaCustasCalculadas() {
        return this.baseParaCustasCalculadas;
    }

    public void setBaseParaCustasCalculadas(BaseParaCustasCalculadasEnum baseParaCustasCalculadas) {
        this.baseParaCustasCalculadas = baseParaCustasCalculadas;
    }

    public TipoDeCustasDeConhecimentoEnum getTipoDeCustasDeConhecimentoDoReclamante() {
        return this.tipoDeCustasDeConhecimentoDoReclamante;
    }

    public void setTipoDeCustasDeConhecimentoDoReclamante(TipoDeCustasDeConhecimentoEnum tipoDeCustasDeConhecimentoDoReclamante) {
        this.tipoDeCustasDeConhecimentoDoReclamante = tipoDeCustasDeConhecimentoDoReclamante;
    }

    public Date getDataVencimentoConhecimentoDoReclamante() {
        return this.dataVencimentoConhecimentoDoReclamante;
    }

    public void setDataVencimentoConhecimentoDoReclamante(Date dataVencimentoConhecimentoDoReclamante) {
        this.dataVencimentoConhecimentoDoReclamante = dataVencimentoConhecimentoDoReclamante;
    }

    public BigDecimal getValorDeConhecimentoDoReclamante() {
        return this.valorDeConhecimentoDoReclamante;
    }

    public void setValorDeConhecimentoDoReclamante(BigDecimal valorDeConhecimentoDoReclamante) {
        this.valorDeConhecimentoDoReclamante = valorDeConhecimentoDoReclamante;
    }

    public BigDecimal getValorDeJurosDeCustasDeConhecimentoDoReclamante() {
        return this.valorDeJurosDeCustasDeConhecimentoDoReclamante;
    }

    public void setValorDeJurosDeCustasDeConhecimentoDoReclamante(BigDecimal valorDeJurosDeCustasDeConhecimentoDoReclamante) {
        this.valorDeJurosDeCustasDeConhecimentoDoReclamante = valorDeJurosDeCustasDeConhecimentoDoReclamante;
    }

    public TipoDeCustasDeConhecimentoEnum getTipoDeCustasDeConhecimentoDoReclamado() {
        return this.tipoDeCustasDeConhecimentoDoReclamado;
    }

    public void setTipoDeCustasDeConhecimentoDoReclamado(TipoDeCustasDeConhecimentoEnum tipoDeCustasDeConhecimentoDoReclamado) {
        this.tipoDeCustasDeConhecimentoDoReclamado = tipoDeCustasDeConhecimentoDoReclamado;
    }

    public Date getDataVencimentoConhecimentoDoReclamado() {
        return this.dataVencimentoConhecimentoDoReclamado;
    }

    public void setDataVencimentoConhecimentoDoReclamado(Date dataVencimentoConhecimentoDoReclamado) {
        this.dataVencimentoConhecimentoDoReclamado = dataVencimentoConhecimentoDoReclamado;
    }

    public BigDecimal getValorConhecimentoDoReclamado() {
        return this.valorConhecimentoDoReclamado;
    }

    public void setValorConhecimentoDoReclamado(BigDecimal valorConhecimentoDoReclamado) {
        this.valorConhecimentoDoReclamado = valorConhecimentoDoReclamado;
    }

    public BigDecimal getValorDeJurosDeCustasDeConhecimentoDoReclamado() {
        return this.valorDeJurosDeCustasDeConhecimentoDoReclamado;
    }

    public void setValorDeJurosDeCustasDeConhecimentoDoReclamado(BigDecimal valorDeJurosDeCustasDeConhecimentoDoReclamado) {
        this.valorDeJurosDeCustasDeConhecimentoDoReclamado = valorDeJurosDeCustasDeConhecimentoDoReclamado;
    }

    public TipoDeCustasDeLiquidacaoEnum getTipoDeCustasDeLiquidacao() {
        return this.tipoDeCustasDeLiquidacao;
    }

    public void setTipoDeCustasDeLiquidacao(TipoDeCustasDeLiquidacaoEnum tipoDeCustasDeLiquidacao) {
        this.tipoDeCustasDeLiquidacao = tipoDeCustasDeLiquidacao;
    }

    public Date getDataVencimentoCustasDeLiquidacao() {
        return this.dataVencimentoCustasDeLiquidacao;
    }

    public void setDataVencimentoCustasDeLiquidacao(Date dataVencimentoCustasDeLiquidacao) {
        this.dataVencimentoCustasDeLiquidacao = dataVencimentoCustasDeLiquidacao;
    }

    public BigDecimal getValorCustasDeLiquidacao() {
        return this.valorCustasDeLiquidacao;
    }

    public void setValorCustasDeLiquidacao(BigDecimal valorCustasDeLiquidacao) {
        this.valorCustasDeLiquidacao = valorCustasDeLiquidacao;
    }

    public Date getDataVencimentoCustasFixas() {
        return this.dataVencimentoCustasFixas;
    }

    public void setDataVencimentoCustasFixas(Date dataVencimentoCustasFixas) {
        this.dataVencimentoCustasFixas = dataVencimentoCustasFixas;
    }

    public Integer getQtdeAtosUrbanos() {
        return this.qtdeAtosUrbanos;
    }

    public void setQtdeAtosUrbanos(Integer qtdeAtosUrbanos) {
        this.qtdeAtosUrbanos = qtdeAtosUrbanos;
    }

    public Integer getQtdeAtosRurais() {
        return this.qtdeAtosRurais;
    }

    public void setQtdeAtosRurais(Integer qtdeAtosRurais) {
        this.qtdeAtosRurais = qtdeAtosRurais;
    }

    public Integer getQtdeAgravosDeInstrumento() {
        return this.qtdeAgravosDeInstrumento;
    }

    public void setQtdeAgravosDeInstrumento(Integer qtdeAgravosDeInstrumento) {
        this.qtdeAgravosDeInstrumento = qtdeAgravosDeInstrumento;
    }

    public Integer getQtdeAgravosDePeticao() {
        return this.qtdeAgravosDePeticao;
    }

    public void setQtdeAgravosDePeticao(Integer qtdeAgravosDePeticao) {
        this.qtdeAgravosDePeticao = qtdeAgravosDePeticao;
    }

    public Integer getQtdeImpugnacaoSentenca() {
        return this.qtdeImpugnacaoSentenca;
    }

    public void setQtdeImpugnacaoSentenca(Integer qtdeImpugnacaoSentenca) {
        this.qtdeImpugnacaoSentenca = qtdeImpugnacaoSentenca;
    }

    public Integer getQtdeEmbargosArrematacao() {
        return this.qtdeEmbargosArrematacao;
    }

    public void setQtdeEmbargosArrematacao(Integer qtdeEmbargosArrematacao) {
        this.qtdeEmbargosArrematacao = qtdeEmbargosArrematacao;
    }

    public Integer getQtdeEmbargosExecucao() {
        return this.qtdeEmbargosExecucao;
    }

    public void setQtdeEmbargosExecucao(Integer qtdeEmbargosExecucao) {
        this.qtdeEmbargosExecucao = qtdeEmbargosExecucao;
    }

    public Integer getQtdeEmbargosTerceiros() {
        return this.qtdeEmbargosTerceiros;
    }

    public void setQtdeEmbargosTerceiros(Integer qtdeEmbargosTerceiros) {
        this.qtdeEmbargosTerceiros = qtdeEmbargosTerceiros;
    }

    public Integer getQtdeRecursoRevista() {
        return this.qtdeRecursoRevista;
    }

    public void setQtdeRecursoRevista(Integer qtdeRecursoRevista) {
        this.qtdeRecursoRevista = qtdeRecursoRevista;
    }

    public Set<AutoJudicialDaAtualizacao> getAutosJudiciais() {
        return this.autosJudiciais;
    }

    public void setAutosJudiciais(Set<AutoJudicialDaAtualizacao> autosJudiciais) {
        this.autosJudiciais = autosJudiciais;
    }

    public Set<ArmazenamentoDaAtualizacao> getArmazenamentos() {
        return this.armazenamentos;
    }

    public Set<CustaPagaDaAtualizacao> getCustasPagasDoReclamado() {
        return this.custasPagasDoReclamado;
    }

    public void setCustasPagasDoReclamado(Set<CustaPagaDaAtualizacao> custasPagasDoReclamado) {
        this.custasPagasDoReclamado = custasPagasDoReclamado;
    }

    public Set<CustaPagaDaAtualizacao> getCustasPagasDoReclamante() {
        return this.custasPagasDoReclamante;
    }

    public void setCustasPagasDoReclamante(Set<CustaPagaDaAtualizacao> custasPagasDoReclamante) {
        this.custasPagasDoReclamante = custasPagasDoReclamante;
    }

    public void setArmazenamentos(Set<ArmazenamentoDaAtualizacao> armazenamentos) {
        this.armazenamentos = armazenamentos;
    }

    public BigDecimal getValorBaseCustasCalculadas() {
        return this.valorBaseCustasCalculadas;
    }

    public void setValorBaseCustasCalculadas(BigDecimal valorBaseCustasCalculadas) {
        this.valorBaseCustasCalculadas = valorBaseCustasCalculadas;
    }

    public BigDecimal getIndiceCorrecaoCustasConhecimentoReclamante() {
        return this.indiceCorrecaoCustasConhecimentoReclamante;
    }

    public void setIndiceCorrecaoCustasConhecimentoReclamante(BigDecimal indiceCorrecaoCustasConhecimentoReclamante) {
        this.indiceCorrecaoCustasConhecimentoReclamante = indiceCorrecaoCustasConhecimentoReclamante;
    }

    public BigDecimal getTaxaJurosCustasConhecimentoReclamante() {
        return this.taxaJurosCustasConhecimentoReclamante;
    }

    public void setTaxaJurosCustasConhecimentoReclamante(BigDecimal taxaJurosCustasConhecimentoReclamante) {
        this.taxaJurosCustasConhecimentoReclamante = taxaJurosCustasConhecimentoReclamante;
    }

    public BigDecimal getIndiceCorrecaoCustasConhecimentoReclamado() {
        return this.indiceCorrecaoCustasConhecimentoReclamado;
    }

    public void setIndiceCorrecaoCustasConhecimentoReclamado(BigDecimal indiceCorrecaoCustasConhecimentoReclamado) {
        this.indiceCorrecaoCustasConhecimentoReclamado = indiceCorrecaoCustasConhecimentoReclamado;
    }

    public BigDecimal getTaxaJurosCustasConhecimentoReclamado() {
        return this.taxaJurosCustasConhecimentoReclamado;
    }

    public void setTaxaJurosCustasConhecimentoReclamado(BigDecimal taxaJurosCustasConhecimentoReclamado) {
        this.taxaJurosCustasConhecimentoReclamado = taxaJurosCustasConhecimentoReclamado;
    }

    public BigDecimal getIndiceCorrecaoCustasLiquidacao() {
        return this.indiceCorrecaoCustasLiquidacao;
    }

    public void setIndiceCorrecaoCustasLiquidacao(BigDecimal indiceCorrecaoCustasLiquidacao) {
        this.indiceCorrecaoCustasLiquidacao = indiceCorrecaoCustasLiquidacao;
    }

    public BigDecimal getTaxaJurosCustasLiquidacao() {
        return this.taxaJurosCustasLiquidacao;
    }

    public void setTaxaJurosCustasLiquidacao(BigDecimal taxaJurosCustasLiquidacao) {
        this.taxaJurosCustasLiquidacao = taxaJurosCustasLiquidacao;
    }

    public BigDecimal getValorDeJurosDeCustasDeLiquidacao() {
        return this.valorDeJurosDeCustasDeLiquidacao;
    }

    public void setValorDeJurosDeCustasDeLiquidacao(BigDecimal valorDeJurosDeCustasDeLiquidacao) {
        this.valorDeJurosDeCustasDeLiquidacao = valorDeJurosDeCustasDeLiquidacao;
    }

    public BigDecimal getIndiceCorrecaoCustasFixas() {
        return this.indiceCorrecaoCustasFixas;
    }

    public void setIndiceCorrecaoCustasFixas(BigDecimal indiceCorrecaoCustasFixas) {
        this.indiceCorrecaoCustasFixas = indiceCorrecaoCustasFixas;
    }

    public BigDecimal getTaxaJurosCustasFixas() {
        return this.taxaJurosCustasFixas;
    }

    public void setTaxaJurosCustasFixas(BigDecimal taxaJurosCustasFixas) {
        this.taxaJurosCustasFixas = taxaJurosCustasFixas;
    }

    public BigDecimal getPisoCustasConhecimentoReclamante() {
        return this.pisoCustasConhecimentoReclamante;
    }

    public void setPisoCustasConhecimentoReclamante(BigDecimal pisoCustasConhecimentoReclamante) {
        this.pisoCustasConhecimentoReclamante = pisoCustasConhecimentoReclamante;
    }

    public BigDecimal getPisoCustasConhecimentoReclamado() {
        return this.pisoCustasConhecimentoReclamado;
    }

    public void setPisoCustasConhecimentoReclamado(BigDecimal pisoCustasConhecimentoReclamado) {
        this.pisoCustasConhecimentoReclamado = pisoCustasConhecimentoReclamado;
    }

    public BigDecimal getTetoCustasLiquidacao() {
        return this.tetoCustasLiquidacao;
    }

    public void setTetoCustasLiquidacao(BigDecimal tetoCustasLiquidacao) {
        this.tetoCustasLiquidacao = tetoCustasLiquidacao;
    }

    public BigDecimal getValorAtosUrbanos() {
        return this.valorAtosUrbanos;
    }

    public void setValorAtosUrbanos(BigDecimal valorAtosUrbanos) {
        this.valorAtosUrbanos = valorAtosUrbanos;
    }

    public BigDecimal getValorAtosRurais() {
        return this.valorAtosRurais;
    }

    public void setValorAtosRurais(BigDecimal valorAtosRurais) {
        this.valorAtosRurais = valorAtosRurais;
    }

    public BigDecimal getValorAgravoInstrumento() {
        return this.valorAgravoInstrumento;
    }

    public void setValorAgravoInstrumento(BigDecimal valorAgravoInstrumento) {
        this.valorAgravoInstrumento = valorAgravoInstrumento;
    }

    public BigDecimal getValorAgravoPeticao() {
        return this.valorAgravoPeticao;
    }

    public void setValorAgravoPeticao(BigDecimal valorAgravoPeticao) {
        this.valorAgravoPeticao = valorAgravoPeticao;
    }

    public BigDecimal getValorImpuganacaoSentenca() {
        return this.valorImpuganacaoSentenca;
    }

    public void setValorImpuganacaoSentenca(BigDecimal valorImpuganacaoSentenca) {
        this.valorImpuganacaoSentenca = valorImpuganacaoSentenca;
    }

    public BigDecimal getValorEmbargosArrematacao() {
        return this.valorEmbargosArrematacao;
    }

    public void setValorEmbargosArrematacao(BigDecimal valorEmbargosArrematacao) {
        this.valorEmbargosArrematacao = valorEmbargosArrematacao;
    }

    public BigDecimal getValorEmbargosExecucao() {
        return this.valorEmbargosExecucao;
    }

    public void setValorEmbargosExecucao(BigDecimal valorEmbargosExecucao) {
        this.valorEmbargosExecucao = valorEmbargosExecucao;
    }

    public BigDecimal getValorEmbargosTerceiros() {
        return this.valorEmbargosTerceiros;
    }

    public void setValorEmbargosTerceiros(BigDecimal valorEmbargosTerceiros) {
        this.valorEmbargosTerceiros = valorEmbargosTerceiros;
    }

    public BigDecimal getValorRecursoRevista() {
        return this.valorRecursoRevista;
    }

    public void setValorRecursoRevista(BigDecimal valorRecursoRevista) {
        this.valorRecursoRevista = valorRecursoRevista;
    }

    public Set<CustasFixasDaAtualizacaoDoEvento> getCustasFixasAtualizacao() {
        return this.custasFixasAtualizacao;
    }

    public void setCustasFixasAtualizacao(Set<CustasFixasDaAtualizacaoDoEvento> custasFixasAtualizacao) {
        this.custasFixasAtualizacao = custasFixasAtualizacao;
    }

    public BigDecimal getValorPagoReclamado() {
        return this.valorPagoReclamado;
    }

    public void setValorPagoReclamado(BigDecimal valorPagoReclamado) {
        this.valorPagoReclamado = valorPagoReclamado;
    }

    public Boolean getJaPagoUmaVezReclamado() {
        return this.jaPagoUmaVezReclamado;
    }

    public void setJaPagoUmaVezReclamado(Boolean jaPagoUmaVezReclamado) {
        this.jaPagoUmaVezReclamado = jaPagoUmaVezReclamado;
    }

    public Boolean getJaPagoUmaVezReclamante() {
        return this.jaPagoUmaVezReclamante;
    }

    public void setJaPagoUmaVezReclamante(Boolean jaPagoUmaVezReclamante) {
        this.jaPagoUmaVezReclamante = jaPagoUmaVezReclamante;
    }

    public Boolean getHouvePagamentoDaBase() {
        return this.houvePagamentoDaBase;
    }

    public void setHouvePagamentoDaBase(Boolean houvePagamentoDaBase) {
        this.houvePagamentoDaBase = houvePagamentoDaBase;
    }

    public TipoCobrancaReclamanteEnum getTipoCobrancaReclamante() {
        return this.tipoCobrancaReclamante;
    }

    public void setTipoCobrancaReclamante(TipoCobrancaReclamanteEnum tipoCobrancaReclamante) {
        this.tipoCobrancaReclamante = tipoCobrancaReclamante;
    }

    public BigDecimal getValorPagoReclamadoValor() {
        return this.valorPagoReclamadoValor;
    }

    public void setValorPagoReclamadoValor(BigDecimal valorPagoReclamadoValor) {
        this.valorPagoReclamadoValor = valorPagoReclamadoValor;
    }

    public BigDecimal getValorPagoReclamadoJuros() {
        return this.valorPagoReclamadoJuros;
    }

    public void setValorPagoReclamadoJuros(BigDecimal valorPagoReclamadoJuros) {
        this.valorPagoReclamadoJuros = valorPagoReclamadoJuros;
    }

    public BigDecimal getValorPagoReclamante() {
        return this.valorPagoReclamante;
    }

    public void setValorPagoReclamante(BigDecimal valorPagoReclamante) {
        this.valorPagoReclamante = valorPagoReclamante;
    }

    public BigDecimal getValorPagoReclamanteValor() {
        return this.valorPagoReclamanteValor;
    }

    public void setValorPagoReclamanteValor(BigDecimal valorPagoReclamanteValor) {
        this.valorPagoReclamanteValor = valorPagoReclamanteValor;
    }

    public BigDecimal getValorPagoReclamanteJuros() {
        return this.valorPagoReclamanteJuros;
    }

    public void setValorPagoReclamanteJuros(BigDecimal valorPagoReclamanteJuros) {
        this.valorPagoReclamanteJuros = valorPagoReclamanteJuros;
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

    public Date getDataVencimentoCustasRemanescentesReclamante() {
        return this.dataVencimentoCustasRemanescentesReclamante;
    }

    public void setDataVencimentoCustasRemanescentesReclamante(Date dataVencimentoCustasRemanescentesReclamante) {
        this.dataVencimentoCustasRemanescentesReclamante = dataVencimentoCustasRemanescentesReclamante;
    }

    public BigDecimal getValorCustasRemanescentesReclamante() {
        return this.valorCustasRemanescentesReclamante;
    }

    public void setValorCustasRemanescentesReclamante(BigDecimal valorCustasRemanescentesReclamante) {
        this.valorCustasRemanescentesReclamante = valorCustasRemanescentesReclamante;
    }

    public BigDecimal getValorJurosRemanescentesReclamante() {
        return this.valorJurosRemanescentesReclamante;
    }

    public void setValorJurosRemanescentesReclamante(BigDecimal valorJurosRemanescentesReclamante) {
        this.valorJurosRemanescentesReclamante = valorJurosRemanescentesReclamante;
    }

    public BigDecimal getIndiceCorrecaoCustasRemanescentesReclamante() {
        return this.indiceCorrecaoCustasRemanescentesReclamante;
    }

    public void setIndiceCorrecaoCustasRemanescentesReclamante(BigDecimal indiceCorrecaoCustasRemanescentesReclamante) {
        this.indiceCorrecaoCustasRemanescentesReclamante = indiceCorrecaoCustasRemanescentesReclamante;
    }

    public BigDecimal getTaxaJurosCustasRemanescentesReclamante() {
        return this.taxaJurosCustasRemanescentesReclamante;
    }

    public void setTaxaJurosCustasRemanescentesReclamante(BigDecimal taxaJurosCustasRemanescentesReclamante) {
        this.taxaJurosCustasRemanescentesReclamante = taxaJurosCustasRemanescentesReclamante;
    }

    public Date getDataVencimentoCustasRemanescentesReclamado() {
        return this.dataVencimentoCustasRemanescentesReclamado;
    }

    public void setDataVencimentoCustasRemanescentesReclamado(Date dataVencimentoCustasRemanescentesReclamado) {
        this.dataVencimentoCustasRemanescentesReclamado = dataVencimentoCustasRemanescentesReclamado;
    }

    public BigDecimal getValorCustasRemanescentesReclamado() {
        return this.valorCustasRemanescentesReclamado;
    }

    public void setValorCustasRemanescentesReclamado(BigDecimal valorCustasRemanescentesReclamado) {
        this.valorCustasRemanescentesReclamado = valorCustasRemanescentesReclamado;
    }

    public BigDecimal getValorJurosRemanescentesReclamado() {
        return this.valorJurosRemanescentesReclamado;
    }

    public void setValorJurosRemanescentesReclamado(BigDecimal valorJurosRemanescentesReclamado) {
        this.valorJurosRemanescentesReclamado = valorJurosRemanescentesReclamado;
    }

    public BigDecimal getIndiceCorrecaoCustasRemanescentesReclamado() {
        return this.indiceCorrecaoCustasRemanescentesReclamado;
    }

    public void setIndiceCorrecaoCustasRemanescentesReclamado(BigDecimal indiceCorrecaoCustasRemanescentesReclamado) {
        this.indiceCorrecaoCustasRemanescentesReclamado = indiceCorrecaoCustasRemanescentesReclamado;
    }

    public BigDecimal getTaxaJurosCustasRemanescentesReclamado() {
        return this.taxaJurosCustasRemanescentesReclamado;
    }

    public void setTaxaJurosCustasRemanescentesReclamado(BigDecimal taxaJurosCustasRemanescentesReclamado) {
        this.taxaJurosCustasRemanescentesReclamado = taxaJurosCustasRemanescentesReclamado;
    }

    public BigDecimal getTotalCustasConhecimentoReclamanteCalculada() {
        if (Utils.nulo(this.getValorBaseCustasCalculadas())) {
            return BigDecimal.ZERO;
        }
        BigDecimal aposAplicarPiso = Utils.aplicarPiso(this.getPisoCustasConhecimentoReclamante(), this.getValorBaseCustasCalculadas().multiply(TAXA_RECLAMANTE_CONHECIMENTO, Utils.CONTEXTO_MATEMATICO));
        if (Utils.naoNulo(this.getTetoCustasConhecimentoReclamante())) {
            return Utils.aplicarTeto(this.getTetoCustasConhecimentoReclamante(), aposAplicarPiso);
        }
        return aposAplicarPiso;
    }

    public BigDecimal getValorCorrigidoDeCustasDeConhecimentoDoReclamante() {
        if (Utils.nulo(this.getValorDeConhecimentoDoReclamante())) {
            return BigDecimal.ZERO;
        }
        if (Utils.nulo(this.getIndiceCorrecaoCustasConhecimentoReclamante())) {
            return this.getValorDeConhecimentoDoReclamante();
        }
        if (this.getMostrarCustasConhecimentoReclamanteInformada().booleanValue()) {
            return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasConhecimentoReclamante(), this.getValorDeConhecimentoDoReclamante());
        }
        return this.getValorDeConhecimentoDoReclamante();
    }

    public BigDecimal getValorCorrigidoDeJurosDeCustasDeConhecimentoDoReclamante() {
        if (Utils.nulo(this.getValorDeJurosDeCustasDeConhecimentoDoReclamante())) {
            return BigDecimal.ZERO;
        }
        if (Utils.nulo(this.getIndiceCorrecaoCustasConhecimentoReclamante())) {
            return this.getValorDeJurosDeCustasDeConhecimentoDoReclamante();
        }
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasConhecimentoReclamante(), this.getValorDeJurosDeCustasDeConhecimentoDoReclamante());
    }

    public BigDecimal getJurosDoPeriodoDeCustasDeConhecimentoDoReclamante() {
        if (Utils.nulo(this.getTaxaJurosCustasConhecimentoReclamante()) || Utils.nulo(this.getValorCorrigidoDeCustasDeConhecimentoDoReclamante())) {
            return BigDecimal.ZERO;
        }
        return Utils.aplicarJuros(this.getTaxaJurosCustasConhecimentoReclamante(), this.getValorCorrigidoDeCustasDeConhecimentoDoReclamante());
    }

    public BigDecimal getTotalDeJurosDeCustasDeConhecimentoDoReclamante() {
        if (this.getMostrarCustasConhecimentoReclamanteInformada().booleanValue()) {
            return Utils.somar(this.getValorCorrigidoDeJurosDeCustasDeConhecimentoDoReclamante(), this.getJurosDoPeriodoDeCustasDeConhecimentoDoReclamante());
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getTotalCustasConhecimentoReclamanteInformada() {
        return Utils.aplicarPiso(this.getPisoCustasConhecimentoReclamante(), Utils.somar(this.getValorCorrigidoDeCustasDeConhecimentoDoReclamante(), this.getTotalDeJurosDeCustasDeConhecimentoDoReclamante()));
    }

    public BigDecimal getTotalCustasConhecimentoReclamadoCalculada() {
        if (Utils.nulo(this.getValorBaseCustasCalculadas())) {
            return BigDecimal.ZERO;
        }
        BigDecimal aposAplicarPiso = Utils.aplicarPiso(this.getPisoCustasConhecimentoReclamado(), this.getValorBaseCustasCalculadas().multiply(TAXA_RECLAMADO_CONHECIMENTO, Utils.CONTEXTO_MATEMATICO));
        if (Utils.naoNulo(this.getTetoCustasConhecimentoReclamado())) {
            return Utils.aplicarTeto(this.getTetoCustasConhecimentoReclamado(), aposAplicarPiso);
        }
        return aposAplicarPiso;
    }

    public BigDecimal getValorCorrigidoDeCustasDeConhecimentoDoReclamado() {
        if (Utils.nulo(this.getValorConhecimentoDoReclamado())) {
            return BigDecimal.ZERO;
        }
        if (Utils.nulo(this.getIndiceCorrecaoCustasConhecimentoReclamado())) {
            return this.getValorConhecimentoDoReclamado();
        }
        if (this.getMostrarCustasConhecimentoReclamadoInformada().booleanValue()) {
            return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasConhecimentoReclamado(), this.getValorConhecimentoDoReclamado());
        }
        return this.getValorConhecimentoDoReclamado();
    }

    public BigDecimal getValorCorrigidoDeJurosDeCustasDeConhecimentoDoReclamado() {
        if (Utils.nulo(this.getValorDeJurosDeCustasDeConhecimentoDoReclamado())) {
            return BigDecimal.ZERO;
        }
        if (Utils.nulo(this.getIndiceCorrecaoCustasConhecimentoReclamado())) {
            return this.getValorDeJurosDeCustasDeConhecimentoDoReclamado();
        }
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasConhecimentoReclamado(), this.getValorDeJurosDeCustasDeConhecimentoDoReclamado());
    }

    public BigDecimal getJurosDoPeriodoDeCustasDeConhecimentoDoReclamado() {
        if (Utils.nulo(this.getTaxaJurosCustasConhecimentoReclamado()) || Utils.nulo(this.getValorCorrigidoDeCustasDeConhecimentoDoReclamado())) {
            return BigDecimal.ZERO;
        }
        return Utils.aplicarJuros(this.getTaxaJurosCustasConhecimentoReclamado(), this.getValorCorrigidoDeCustasDeConhecimentoDoReclamado());
    }

    public BigDecimal getTotalDeJurosDeCustasDeConhecimentoDoReclamado() {
        if (this.getMostrarCustasConhecimentoReclamadoInformada().booleanValue()) {
            return Utils.somar(this.getValorCorrigidoDeJurosDeCustasDeConhecimentoDoReclamado(), this.getJurosDoPeriodoDeCustasDeConhecimentoDoReclamado());
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getTotalCustasConhecimentoReclamadoInformada() {
        return Utils.aplicarPiso(this.getPisoCustasConhecimentoReclamado(), Utils.somar(this.getValorCorrigidoDeCustasDeConhecimentoDoReclamado(), this.getTotalDeJurosDeCustasDeConhecimentoDoReclamado()));
    }

    public BigDecimal getTotalCustasLiquidacaoReclamadoCalculada() {
        if (Utils.nulo(this.getValorBaseCustasCalculadas())) {
            return BigDecimal.ZERO;
        }
        return Utils.aplicarTeto(this.getTetoCustasLiquidacao(), this.getValorBaseCustasCalculadas().multiply(TAXA_RECLAMADO_LIQUIDACAO, Utils.CONTEXTO_MATEMATICO));
    }

    public BigDecimal getValorCorrigidoDeCustasDeLiquidacao() {
        if (Utils.nulo(this.getValorCustasDeLiquidacao())) {
            return BigDecimal.ZERO;
        }
        if (Utils.nulo(this.getIndiceCorrecaoCustasLiquidacao())) {
            return this.getValorCustasDeLiquidacao();
        }
        if (this.getMostrarCustasLiquidacaoInformada().booleanValue()) {
            return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasLiquidacao(), this.getValorCustasDeLiquidacao());
        }
        return this.getValorCustasDeLiquidacao();
    }

    public BigDecimal getValorCorrigidoDeJurosDeCustasDeLiquidacao() {
        if (Utils.nulo(this.getValorDeJurosDeCustasDeLiquidacao())) {
            return BigDecimal.ZERO;
        }
        if (Utils.nulo(this.getIndiceCorrecaoCustasLiquidacao())) {
            return this.getValorDeJurosDeCustasDeLiquidacao();
        }
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasLiquidacao(), this.getValorDeJurosDeCustasDeLiquidacao());
    }

    public BigDecimal getJurosDoPeriodoDeCustasDeLiquidacao() {
        if (Utils.nulo(this.getTaxaJurosCustasLiquidacao()) || Utils.nulo(this.getValorCorrigidoDeCustasDeLiquidacao())) {
            return BigDecimal.ZERO;
        }
        return Utils.aplicarJuros(this.getTaxaJurosCustasLiquidacao(), this.getValorCorrigidoDeCustasDeLiquidacao());
    }

    public BigDecimal getTotalDeJurosDeCustasDeLiquidacao() {
        if (this.getMostrarCustasLiquidacaoInformada().booleanValue()) {
            return Utils.somar(this.getValorCorrigidoDeJurosDeCustasDeLiquidacao(), this.getJurosDoPeriodoDeCustasDeLiquidacao());
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getTotalCustasLiquidacaoReclamadoInformada() {
        return Utils.somar(this.getValorCorrigidoDeCustasDeLiquidacao(), this.getTotalDeJurosDeCustasDeLiquidacao());
    }

    public void ratearValorPagoReclamado(BigDecimal valorPagoReclamado) {
        if (Utils.nulo(valorPagoReclamado) || valorPagoReclamado.compareTo(BigDecimal.ZERO) == 0) {
            this.setValorPagoReclamadoValor(BigDecimal.ZERO);
            this.setValorPagoReclamadoJuros(BigDecimal.ZERO);
        } else if (valorPagoReclamado.compareTo(this.totalDevidoReclamado()) > 0) {
            BigDecimal diferencaValorPagoEJuros = Utils.subtrair(valorPagoReclamado, this.totalJurosReclamado());
            if (BigDecimal.ZERO.compareTo(diferencaValorPagoEJuros) <= 0) {
                this.setValorPagoReclamadoValor(diferencaValorPagoEJuros);
                this.setValorPagoReclamadoJuros(this.totalJurosReclamado());
            } else {
                this.setValorPagoReclamadoValor(BigDecimal.ZERO);
                this.setValorPagoReclamadoJuros(valorPagoReclamado);
            }
        } else {
            BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorPagoReclamado, new BigDecimal[]{this.totalValorCorrigidoReclamado(), this.totalJurosReclamado()});
            this.setValorPagoReclamadoValor(valoresRateados[0]);
            this.setValorPagoReclamadoJuros(valoresRateados[1]);
        }
        this.valorPagoReclamado = valorPagoReclamado;
    }

    public void ratearValorPagoReclamante(BigDecimal valorPagoReclamante) {
        this.ratearValorPagoReclamante(valorPagoReclamante, Boolean.FALSE);
    }

    public void ratearValorPagoReclamante(BigDecimal valorPagoReclamante, Boolean priorizarJuros) {
        if (Utils.nulo(valorPagoReclamante) || valorPagoReclamante.compareTo(BigDecimal.ZERO) == 0) {
            this.setValorPagoReclamanteValor(BigDecimal.ZERO);
            this.setValorPagoReclamanteJuros(BigDecimal.ZERO);
        } else if (priorizarJuros.booleanValue() || valorPagoReclamante.compareTo(this.totalDevidoReclamante()) > 0) {
            BigDecimal diferencaValorPagoEJuros = Utils.subtrair(valorPagoReclamante, this.totalJurosReclamante());
            if (BigDecimal.ZERO.compareTo(diferencaValorPagoEJuros) <= 0) {
                this.setValorPagoReclamanteValor(diferencaValorPagoEJuros);
                this.setValorPagoReclamanteJuros(this.totalJurosReclamante());
            } else {
                this.setValorPagoReclamanteValor(BigDecimal.ZERO);
                this.setValorPagoReclamanteJuros(valorPagoReclamante);
            }
        } else {
            BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorPagoReclamante, new BigDecimal[]{this.totalValorCorrigidoReclamante(), this.totalJurosReclamante()});
            this.setValorPagoReclamanteValor(valoresRateados[0]);
            this.setValorPagoReclamanteJuros(valoresRateados[1]);
        }
        this.valorPagoReclamante = valorPagoReclamante;
    }

    public CustasJudiciaisDaAtualizacao removerCustasReclamante(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacaoAnterior) {
        CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao = new CustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacaoAnterior, Boolean.TRUE);
        custasJudiciaisDaAtualizacao.setDataVencimentoCustasRemanescentesReclamante(custasJudiciaisDaAtualizacaoAnterior.getDataFinalPeriodo());
        custasJudiciaisDaAtualizacao.setValorCustasRemanescentesReclamante(custasJudiciaisDaAtualizacaoAnterior.getDiferencaValorReclamante());
        custasJudiciaisDaAtualizacao.setValorJurosRemanescentesReclamante(custasJudiciaisDaAtualizacaoAnterior.getDiferencaJurosReclamante());
        custasJudiciaisDaAtualizacao.setJaPagoUmaVezReclamante(true);
        return custasJudiciaisDaAtualizacao;
    }

    public CustasJudiciaisDaAtualizacao removerCustasReclamado(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacaoAnterior) {
        CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao = new CustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacaoAnterior, Boolean.FALSE);
        custasJudiciaisDaAtualizacao.setDataVencimentoCustasRemanescentesReclamado(custasJudiciaisDaAtualizacaoAnterior.getDataFinalPeriodo());
        custasJudiciaisDaAtualizacao.setValorCustasRemanescentesReclamado(custasJudiciaisDaAtualizacaoAnterior.getDiferencaValorReclamado());
        custasJudiciaisDaAtualizacao.setValorJurosRemanescentesReclamado(custasJudiciaisDaAtualizacaoAnterior.getDiferencaJurosReclamado());
        custasJudiciaisDaAtualizacao.setJaPagoUmaVezReclamado(true);
        return custasJudiciaisDaAtualizacao;
    }

    public void limparPagamentos() {
        this.setValorPagoReclamado(BigDecimal.ZERO);
        this.setValorPagoReclamadoJuros(BigDecimal.ZERO);
        this.setValorPagoReclamadoValor(BigDecimal.ZERO);
        this.setValorPagoReclamante(BigDecimal.ZERO);
        this.setValorPagoReclamanteJuros(BigDecimal.ZERO);
        this.setValorPagoReclamanteValor(BigDecimal.ZERO);
    }

    public CustasJudiciaisDaAtualizacao adicionarCustaFixa(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao, CustasFixasAtualizacao custasFixasAtualizacao) {
        CustasFixasDaAtualizacaoDoEvento custaEvento = new CustasFixasDaAtualizacaoDoEvento();
        custaEvento.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
        custaEvento.setIndiceCorrecaoCustas(custasJudiciaisDaAtualizacao.calcularIndiceDeCorrecao(custasJudiciaisDaAtualizacao.getDataInicialPeriodo(), custasJudiciaisDaAtualizacao.getDataFinalPeriodo()));
        custaEvento.setTaxaJurosCustasFixas(custasFixasAtualizacao.getCustasJudiciais().getTaxaJurosCustasFixas());
        custaEvento.setTaxaJurosCustasFixasDoPeriodo(custasJudiciaisDaAtualizacao.calcularTaxaDeJuros(custasJudiciaisDaAtualizacao.getDataInicialPeriodo(), custasJudiciaisDaAtualizacao.getDataFinalPeriodo()));
        custaEvento.setDataEvento(custasFixasAtualizacao.getDataEvento());
        custaEvento.setQtdeAgravosDeInstrumento(custasFixasAtualizacao.getQtdeAgravosDeInstrumento());
        custaEvento.setQtdeAgravosDePeticao(custasFixasAtualizacao.getQtdeAgravosDePeticao());
        custaEvento.setQtdeAtosRurais(custasFixasAtualizacao.getQtdeAtosRurais());
        custaEvento.setQtdeAtosUrbanos(custasFixasAtualizacao.getQtdeAtosUrbanos());
        custaEvento.setQtdeEmbargosArrematacao(custasFixasAtualizacao.getQtdeEmbargosArrematacao());
        custaEvento.setQtdeEmbargosExecucao(custasFixasAtualizacao.getQtdeEmbargosExecucao());
        custaEvento.setQtdeEmbargosTerceiros(custasFixasAtualizacao.getQtdeEmbargosTerceiros());
        custaEvento.setQtdeImpugnacaoSentenca(custasFixasAtualizacao.getQtdeImpugnacaoSentenca());
        custaEvento.setQtdeRecursoRevista(custasFixasAtualizacao.getQtdeRecursoRevista());
        custaEvento.setValorAgravoInstrumento(custasFixasAtualizacao.getValorAgravoInstrumento());
        custaEvento.setValorAgravoPeticao(custasFixasAtualizacao.getValorAgravoPeticao());
        custaEvento.setValorAtosRurais(custasFixasAtualizacao.getValorAtosRurais());
        custaEvento.setValorAtosUrbanos(custasFixasAtualizacao.getValorAtosUrbanos());
        custaEvento.setValorEmbargosArrematacao(custasFixasAtualizacao.getValorEmbargosArrematacao());
        custaEvento.setValorEmbargosExecucao(custasFixasAtualizacao.getValorEmbargosExecucao());
        custaEvento.setValorEmbargosTerceiros(custasFixasAtualizacao.getValorEmbargosTerceiros());
        custaEvento.setValorImpuganacaoSentenca(custasFixasAtualizacao.getValorImpuganacaoSentenca());
        custaEvento.setValorRecursoRevista(custasFixasAtualizacao.getValorRecursoRevista());
        custasJudiciaisDaAtualizacao.getCustasFixasAtualizacao().add(custaEvento);
        return custasJudiciaisDaAtualizacao;
    }

    public CustasJudiciaisDaAtualizacao adicionarAuto(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao, AutoJudicial autoJudicial) {
        AutoJudicialDaAtualizacao autoDaAtualizacao = new AutoJudicialDaAtualizacao();
        autoDaAtualizacao.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
        autoDaAtualizacao.setDataVencimentoAuto(autoJudicial.getDataVencimentoAuto());
        autoDaAtualizacao.setIndiceCorrecao(autoJudicial.getIndiceCorrecao());
        autoDaAtualizacao.setTaxaJuros(autoJudicial.getTaxaJuros());
        autoDaAtualizacao.setTipoDeAuto(autoJudicial.getTipoDeAuto());
        autoDaAtualizacao.setValorAvaliacaoAuto(autoJudicial.getValorAvaliacaoAuto());
        autoDaAtualizacao.encontrarTetoEValorCustas();
        custasJudiciaisDaAtualizacao.getAutosJudiciais().add(autoDaAtualizacao);
        return custasJudiciaisDaAtualizacao;
    }

    public CustasJudiciaisDaAtualizacao adicionarArmazenamento(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao, Armazenamento armazenamento) {
        ArmazenamentoDaAtualizacao armazenamentoDaAtualizacao = new ArmazenamentoDaAtualizacao();
        armazenamentoDaAtualizacao.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
        armazenamentoDaAtualizacao.setDataInicioArmazenamento(armazenamento.getDataInicioArmazenamento());
        armazenamentoDaAtualizacao.setDataTerminoArmazenamento(armazenamento.getDataTerminoArmazenamento());
        armazenamentoDaAtualizacao.setIndiceCorrecao(armazenamento.getIndiceCorrecao());
        armazenamentoDaAtualizacao.setQtdeDias(armazenamento.getQtdeDias());
        armazenamentoDaAtualizacao.setTaxaJuros(armazenamento.getTaxaJuros());
        armazenamentoDaAtualizacao.setValorAvaliacaoArmazenamento(armazenamento.getValorAvaliacaoArmazenamento());
        armazenamentoDaAtualizacao.setValorCustasArmazenamento(BigDecimal.ZERO);
        custasJudiciaisDaAtualizacao.getArmazenamentos().add(armazenamentoDaAtualizacao);
        return custasJudiciaisDaAtualizacao;
    }

    public boolean existemDadosParaRelatorio() {
        if (Utils.nulo(this.getId())) {
            return false;
        }
        if (TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA != this.tipoDeCustasDeConhecimentoDoReclamado) {
            return true;
        }
        if (TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA != this.tipoDeCustasDeConhecimentoDoReclamante) {
            return true;
        }
        if (TipoDeCustasDeLiquidacaoEnum.NAO_SE_APLICA != this.tipoDeCustasDeLiquidacao) {
            return true;
        }
        if (Utils.naoNulo(this.getDataVencimentoCustasFixas()) && (Utils.naoNulo(this.qtdeAgravosDeInstrumento) || Utils.naoNulo(this.qtdeAgravosDePeticao) || Utils.naoNulo(this.qtdeAtosRurais) || Utils.naoNulo(this.qtdeAtosUrbanos) || Utils.naoNulo(this.qtdeEmbargosArrematacao) || Utils.naoNulo(this.qtdeEmbargosExecucao) || Utils.naoNulo(this.qtdeEmbargosTerceiros) || Utils.naoNulo(this.qtdeImpugnacaoSentenca) || Utils.naoNulo(this.qtdeRecursoRevista))) {
            return true;
        }
        if (Utils.naoNulo(this.getCalculo().getCustasJudiciais().getCustasFixasAtualizacao()) && !this.getCalculo().getCustasJudiciais().getCustasFixasAtualizacao().isEmpty()) {
            return true;
        }
        if (!this.getAutosJudiciais().isEmpty()) {
            return true;
        }
        if (!this.getArmazenamentos().isEmpty()) {
            return true;
        }
        if (!this.getCustasPagasDoReclamado().isEmpty()) {
            return true;
        }
        return !this.getCustasPagasDoReclamante().isEmpty();
    }

    public BigDecimal calcularIndiceDeCorrecao(Date dataInicial, Date dataFinal) {
        if (this.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
            IndiceMonetarioEnum indiceCustas = this.getCalculo().getAtualizacaoMonetaria();
            if (OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE.equals((Object)this.getCalculo().getParametrosDeAtualizacao().getIndiceDeCorrecaoDasCustas())) {
                indiceCustas = this.getCalculo().getParametrosDeAtualizacao().getOutroIndiceDeCorrecaoDasCustas();
            }
            TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(indiceCustas, IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
            tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(dataInicial, dataFinal));
            return tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(dataInicial);
        }
        return BigDecimal.ONE;
    }

    public BigDecimal calcularTaxaDeJuros(Date dataInicial, Date dataFinal) {
        HelperDate dataInicialParaLiquidacaoMaisUm = HelperDate.getInstance(dataInicial).addDay(1);
        TabelaDeJurosDoCalculo tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), dataInicialParaLiquidacaoMaisUm.getDate(), dataFinal);
        return Utils.arredondarValor(tabelaDeJuros.calcularTaxaDeJurosPagamento(dataInicialParaLiquidacaoMaisUm.getDate(), dataFinal, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, false), 4);
    }

    public void calcularDiferencaDasCustasAteCalculoReclamante() {
        BigDecimal valorCustasReclamante = null;
        BigDecimal jurosCustasReclamante = null;
        if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.getCalculo().getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
            valorCustasReclamante = this.getCalculo().getCustasJudiciais().getValorCorrigidoCustasConhecimentoReclamante();
            jurosCustasReclamante = this.getCalculo().getCustasJudiciais().getJurosCustasConhecimentoReclamante();
        } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.getCalculo().getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
            valorCustasReclamante = this.getCalculo().getCustasJudiciais().getTotalCustasConhecimentoReclamanteCalculada();
            jurosCustasReclamante = BigDecimal.ZERO;
        }
        if (valorCustasReclamante != null) {
            for (CustaPaga custaPaga : this.getCalculo().getCustasJudiciais().getCustasPagasDoReclamante()) {
                valorCustasReclamante = Utils.subtrair(valorCustasReclamante, custaPaga.getValorCorrigido(), valorCustasReclamante);
                jurosCustasReclamante = Utils.subtrair(jurosCustasReclamante, custaPaga.getJuros(), jurosCustasReclamante);
            }
            if (BigDecimal.ZERO.compareTo(valorCustasReclamante) > 0) {
                valorCustasReclamante = BigDecimal.ZERO;
                jurosCustasReclamante = BigDecimal.ZERO;
            }
            this.setValorCustasRemanescentesReclamante(valorCustasReclamante);
            if (jurosCustasReclamante != null) {
                this.setValorJurosRemanescentesReclamante(jurosCustasReclamante);
            } else {
                this.setValorJurosRemanescentesReclamante(BigDecimal.ZERO);
            }
        }
    }

    public void calcularDiferencaDasCustasAteCalculoReclamado() {
        BigDecimal valorCustasReclamado = null;
        BigDecimal jurosCustasReclamado = null;
        if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.getCalculo().getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamado())) {
            valorCustasReclamado = this.getCalculo().getCustasJudiciais().getValorCorrigidoCustasConhecimentoReclamado();
            jurosCustasReclamado = this.getCalculo().getCustasJudiciais().getJurosCustasConhecimentoReclamado();
        } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.getCalculo().getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamado())) {
            valorCustasReclamado = this.getCalculo().getCustasJudiciais().getTotalCustasConhecimentoReclamadoCalculada();
            jurosCustasReclamado = BigDecimal.ZERO;
        }
        if (TipoDeCustasDeLiquidacaoEnum.INFORMADA.equals((Object)this.getCalculo().getCustasJudiciais().getTipoDeCustasDeLiquidacao())) {
            if (valorCustasReclamado == null) {
                valorCustasReclamado = this.getCalculo().getCustasJudiciais().getValorCorrigidoCustasLiquidacao();
                jurosCustasReclamado = this.getCalculo().getCustasJudiciais().getJurosCustasLiquidacao();
            } else {
                valorCustasReclamado = Utils.somar(valorCustasReclamado, this.getCalculo().getCustasJudiciais().getValorCorrigidoCustasLiquidacao(), valorCustasReclamado);
                jurosCustasReclamado = Utils.somar(jurosCustasReclamado, this.getCalculo().getCustasJudiciais().getJurosCustasLiquidacao(), jurosCustasReclamado);
            }
        } else if (TipoDeCustasDeLiquidacaoEnum.CALCULADA_MEIO_POR_CENTO.equals((Object)this.getCalculo().getCustasJudiciais().getTipoDeCustasDeLiquidacao())) {
            valorCustasReclamado = valorCustasReclamado == null ? this.getCalculo().getCustasJudiciais().getTotalCustasLiquidacaoReclamadoCalculada() : Utils.somar(valorCustasReclamado, this.getCalculo().getCustasJudiciais().getTotalCustasLiquidacaoReclamadoCalculada(), valorCustasReclamado);
        }
        for (CustasDevidasFixasEnum custasDevidasFixasEnum : CustasDevidasFixasEnum.values()) {
            CustasFixasWrapper fixa = new CustasFixasWrapper(this.getCalculo().getCustasJudiciais().getDataVencimentoCustasFixas(), custasDevidasFixasEnum.getDescricao(), custasDevidasFixasEnum.getBase(this.getCalculo().getCustasJudiciais()), custasDevidasFixasEnum.getQuantidade(this.getCalculo().getCustasJudiciais()), custasDevidasFixasEnum.getValor(this.getCalculo().getCustasJudiciais()), this.getCalculo().getCustasJudiciais().getIndiceCorrecaoCustasFixas(), this.getCalculo().getCustasJudiciais().getTaxaJurosCustasFixas());
            if (fixa.getTotal() == null || fixa.getTotal().compareTo(BigDecimal.ZERO) == 0) continue;
            if (valorCustasReclamado == null) {
                valorCustasReclamado = fixa.getValorCorrigido();
                jurosCustasReclamado = fixa.getJuros();
                continue;
            }
            valorCustasReclamado = Utils.somar(valorCustasReclamado, fixa.getValorCorrigido(), valorCustasReclamado);
            jurosCustasReclamado = Utils.somar(jurosCustasReclamado, fixa.getJuros(), jurosCustasReclamado);
        }
        for (AutoJudicial auto : this.getCalculo().getCustasJudiciais().getAutosJudiciaisDoCalculo()) {
            if (valorCustasReclamado == null) {
                valorCustasReclamado = auto.getValorCorrigido();
                jurosCustasReclamado = auto.getJuros();
                continue;
            }
            valorCustasReclamado = Utils.somar(valorCustasReclamado, auto.getValorCorrigido(), valorCustasReclamado);
            jurosCustasReclamado = Utils.somar(jurosCustasReclamado, auto.getJuros(), jurosCustasReclamado);
        }
        for (Armazenamento armazenamento : this.getCalculo().getCustasJudiciais().getArmazenamentosDoCalculo()) {
            if (valorCustasReclamado == null) {
                valorCustasReclamado = armazenamento.getValorCorrigido();
                jurosCustasReclamado = armazenamento.getJuros();
                continue;
            }
            valorCustasReclamado = Utils.somar(valorCustasReclamado, armazenamento.getValorCorrigido(), valorCustasReclamado);
            jurosCustasReclamado = Utils.somar(jurosCustasReclamado, armazenamento.getJuros(), jurosCustasReclamado);
        }
        if (valorCustasReclamado != null) {
            for (CustaPaga custaPaga : this.getCalculo().getCustasJudiciais().getCustasPagasDoReclamado()) {
                valorCustasReclamado = Utils.subtrair(valorCustasReclamado, custaPaga.getValorCorrigido(), valorCustasReclamado);
                jurosCustasReclamado = Utils.subtrair(jurosCustasReclamado, custaPaga.getJuros(), jurosCustasReclamado);
            }
            if (BigDecimal.ZERO.compareTo(valorCustasReclamado) > 0) {
                valorCustasReclamado = BigDecimal.ZERO;
                jurosCustasReclamado = BigDecimal.ZERO;
            }
            this.setValorCustasRemanescentesReclamado(valorCustasReclamado);
            this.setValorJurosRemanescentesReclamado(jurosCustasReclamado);
            this.setValorCustasDeLiquidacao(BigDecimal.ZERO);
        }
    }

    public BigDecimal calcularTetoCustasConhecimento(Date dataEvento) {
        Calculo calculo = this.atualizacao.getCalculo();
        HelperDate dataLiquidacao = HelperDate.getInstance(dataEvento);
        HelperDate dataAjuizamento = HelperDate.getInstance(calculo.getDataAjuizamento());
        if (this.atualizacao.getCalculo().isCalculoExterno() != false ? this.atualizacao.getCalculo().getCustasJudiciais().getAplicarTetoCustasConhecimentoCalcExterno() != false : dataAjuizamento.greaterThenOrEquals(Constantes.DATA_REFORMA_TRABALHISTA)) {
            return CustasJudiciais.calcularValorTetoCustasConhecimento(dataLiquidacao);
        }
        return null;
    }

    public CustasJudiciaisDaAtualizacao liquidarCustasJudiciaisDaAtualizacao(OutrosDebitosReclamado outrosDebitosReclamado, CreditosDoReclamante creditoDoReclamante, CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacaoAnterior, Date dataInicial, Date dataFinal) {
        CustaPagaDaAtualizacao custaPagaDaAtualizacao;
        CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao = new CustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacaoAnterior);
        custasJudiciaisDaAtualizacao.setDataInicialPeriodo(dataInicial);
        custasJudiciaisDaAtualizacao.setDataFinalPeriodo(dataFinal);
        if (BaseParaCustasCalculadasEnum.BRUTO_DEVIDO_AO_RECLAMANTE.equals((Object)custasJudiciaisDaAtualizacao.getBaseParaCustasCalculadas())) {
            custasJudiciaisDaAtualizacao.setValorBaseCustasCalculadas(creditoDoReclamante.getTotalDevido());
        } else if (BaseParaCustasCalculadasEnum.BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO.equals((Object)custasJudiciaisDaAtualizacao.getBaseParaCustasCalculadas())) {
            custasJudiciaisDaAtualizacao.setValorBaseCustasCalculadas(Utils.somar(creditoDoReclamante.getTotalDevido(), outrosDebitosReclamado.calcularTotalDevidoSemCustas()));
        }
        BigDecimal tetoCustasConhecimento = this.calcularTetoCustasConhecimento(dataFinal);
        custasJudiciaisDaAtualizacao.setTetoCustasConhecimentoReclamado(tetoCustasConhecimento);
        custasJudiciaisDaAtualizacao.setTetoCustasConhecimentoReclamante(tetoCustasConhecimento);
        if (this.getJaPagoUmaVezReclamado().booleanValue()) {
            boolean custasAnterioresPositivas;
            boolean bl = custasAnterioresPositivas = BigDecimal.ZERO.compareTo(custasJudiciaisDaAtualizacaoAnterior.getValorCustasRemanescentesReclamado()) <= 0;
            if (Utils.naoNulo(custasJudiciaisDaAtualizacao.getDataVencimentoCustasRemanescentesReclamado()) && custasJudiciaisDaAtualizacao.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue() && custasAnterioresPositivas) {
                custasJudiciaisDaAtualizacao.setIndiceCorrecaoCustasRemanescentesReclamado(custasJudiciaisDaAtualizacao.calcularIndiceDeCorrecao(custasJudiciaisDaAtualizacao.getDataVencimentoCustasRemanescentesReclamado(), dataFinal));
            } else {
                custasJudiciaisDaAtualizacao.setIndiceCorrecaoCustasRemanescentesReclamado(null);
            }
            if (Utils.naoNulo(custasJudiciaisDaAtualizacao.getDataVencimentoCustasRemanescentesReclamado()) && custasJudiciaisDaAtualizacao.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas().booleanValue() && custasAnterioresPositivas) {
                custasJudiciaisDaAtualizacao.setTaxaJurosCustasRemanescentesReclamado(custasJudiciaisDaAtualizacao.calcularTaxaDeJuros(custasJudiciaisDaAtualizacao.getDataVencimentoCustasRemanescentesReclamado(), dataFinal));
            } else {
                custasJudiciaisDaAtualizacao.setTaxaJurosCustasRemanescentesReclamado(null);
            }
            custasJudiciaisDaAtualizacao.setValorCustasRemanescentesReclamado(custasJudiciaisDaAtualizacaoAnterior.getValorCustasRemanescentesReclamado());
            custasJudiciaisDaAtualizacao.setValorJurosRemanescentesReclamado(custasJudiciaisDaAtualizacaoAnterior.getValorJurosRemanescentesReclamado());
        } else {
            if (Utils.naoNulo(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamado()) && custasJudiciaisDaAtualizacao.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
                custasJudiciaisDaAtualizacao.setIndiceCorrecaoCustasConhecimentoReclamado(custasJudiciaisDaAtualizacao.calcularIndiceDeCorrecao(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamado(), dataFinal));
            } else {
                custasJudiciaisDaAtualizacao.setIndiceCorrecaoCustasConhecimentoReclamado(null);
            }
            if (Utils.naoNulo(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamado()) && custasJudiciaisDaAtualizacao.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas().booleanValue()) {
                custasJudiciaisDaAtualizacao.setTaxaJurosCustasConhecimentoReclamado(custasJudiciaisDaAtualizacao.calcularTaxaDeJuros(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamado(), dataFinal));
            } else {
                custasJudiciaisDaAtualizacao.setTaxaJurosCustasConhecimentoReclamado(null);
            }
            if (this.getMostrarCustasConhecimentoReclamadoCalculada().booleanValue()) {
                custasJudiciaisDaAtualizacao.setDataVencimentoConhecimentoDoReclamado(dataFinal);
                custasJudiciaisDaAtualizacao.setValorConhecimentoDoReclamado(custasJudiciaisDaAtualizacao.getTotalCustasConhecimentoReclamadoCalculada());
            } else if (this.getMostrarCustasConhecimentoReclamadoInformada().booleanValue()) {
                custasJudiciaisDaAtualizacao.setValorConhecimentoDoReclamado(custasJudiciaisDaAtualizacaoAnterior.getValorConhecimentoDoReclamado());
            } else {
                custasJudiciaisDaAtualizacao.setValorConhecimentoDoReclamado(BigDecimal.ZERO);
            }
            if (Utils.naoNulo(custasJudiciaisDaAtualizacao.getDataVencimentoCustasDeLiquidacao()) && custasJudiciaisDaAtualizacao.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
                custasJudiciaisDaAtualizacao.setIndiceCorrecaoCustasLiquidacao(custasJudiciaisDaAtualizacao.calcularIndiceDeCorrecao(custasJudiciaisDaAtualizacao.getDataVencimentoCustasDeLiquidacao(), dataFinal));
            } else {
                custasJudiciaisDaAtualizacao.setIndiceCorrecaoCustasLiquidacao(null);
            }
            if (Utils.naoNulo(custasJudiciaisDaAtualizacao.getDataVencimentoCustasDeLiquidacao()) && custasJudiciaisDaAtualizacao.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas().booleanValue()) {
                custasJudiciaisDaAtualizacao.setTaxaJurosCustasLiquidacao(custasJudiciaisDaAtualizacao.calcularTaxaDeJuros(custasJudiciaisDaAtualizacao.getDataVencimentoCustasDeLiquidacao(), dataFinal));
            } else {
                custasJudiciaisDaAtualizacao.setTaxaJurosCustasLiquidacao(null);
            }
            if (this.getMostrarCustasLiquidacaoCalculada().booleanValue()) {
                custasJudiciaisDaAtualizacao.setDataVencimentoCustasDeLiquidacao(dataFinal);
                custasJudiciaisDaAtualizacao.setValorCustasDeLiquidacao(custasJudiciaisDaAtualizacao.getTotalCustasLiquidacaoReclamadoCalculada());
            } else if (this.getMostrarCustasLiquidacaoInformada().booleanValue()) {
                custasJudiciaisDaAtualizacao.setValorCustasDeLiquidacao(custasJudiciaisDaAtualizacaoAnterior.getValorCustasDeLiquidacao());
            } else {
                custasJudiciaisDaAtualizacao.setValorCustasDeLiquidacao(BigDecimal.ZERO);
            }
        }
        for (ArmazenamentoDaAtualizacao armazenamentoAnterior : custasJudiciaisDaAtualizacaoAnterior.getArmazenamentos()) {
            ArmazenamentoDaAtualizacao armazenamentoDaAtualizacao = new ArmazenamentoDaAtualizacao();
            armazenamentoDaAtualizacao.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
            if (Utils.naoNulo(armazenamentoAnterior.getDataInicioArmazenamento()) && custasJudiciaisDaAtualizacaoAnterior.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
                armazenamentoDaAtualizacao.setIndiceCorrecao(custasJudiciaisDaAtualizacao.calcularIndiceDeCorrecao(armazenamentoAnterior.getDataInicioArmazenamento(), dataFinal));
            } else {
                armazenamentoDaAtualizacao.setIndiceCorrecao(null);
            }
            if (Utils.naoNulo(armazenamentoAnterior.getDataInicioArmazenamento()) && custasJudiciaisDaAtualizacaoAnterior.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas().booleanValue()) {
                armazenamentoDaAtualizacao.setTaxaJuros(custasJudiciaisDaAtualizacao.calcularTaxaDeJuros(armazenamentoAnterior.getDataInicioArmazenamento(), dataFinal));
            } else {
                armazenamentoDaAtualizacao.setTaxaJuros(null);
            }
            armazenamentoDaAtualizacao.setDataInicioArmazenamento(armazenamentoAnterior.getDataInicioArmazenamento());
            armazenamentoDaAtualizacao.setDataTerminoArmazenamento(armazenamentoAnterior.getDataTerminoArmazenamento());
            armazenamentoDaAtualizacao.setValorAvaliacaoArmazenamento(armazenamentoAnterior.getValorAvaliacaoArmazenamento());
            armazenamentoDaAtualizacao.encontrarQuantidadeDeDiasEValorDasCustas(dataFinal);
            armazenamentoDaAtualizacao.setValorJurosCalcExterno(armazenamentoAnterior.getValorJurosCalcExterno());
            custasJudiciaisDaAtualizacao.getArmazenamentos().add(armazenamentoDaAtualizacao);
        }
        for (AutoJudicialDaAtualizacao autoJudicial : custasJudiciaisDaAtualizacaoAnterior.getAutosJudiciais()) {
            AutoJudicialDaAtualizacao autoDaAtualizacao = new AutoJudicialDaAtualizacao();
            autoDaAtualizacao.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
            if (Utils.naoNulo(autoJudicial.getDataVencimentoAuto()) && custasJudiciaisDaAtualizacaoAnterior.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
                autoDaAtualizacao.setIndiceCorrecao(custasJudiciaisDaAtualizacaoAnterior.calcularIndiceDeCorrecao(autoJudicial.getDataVencimentoAuto(), dataFinal));
            } else {
                autoDaAtualizacao.setIndiceCorrecao(null);
            }
            if (Utils.naoNulo(autoJudicial.getDataVencimentoAuto()) && custasJudiciaisDaAtualizacaoAnterior.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas().booleanValue()) {
                autoDaAtualizacao.setTaxaJuros(custasJudiciaisDaAtualizacaoAnterior.calcularTaxaDeJuros(autoJudicial.getDataVencimentoAuto(), dataFinal));
            } else {
                autoDaAtualizacao.setTaxaJuros(null);
            }
            autoDaAtualizacao.setDataVencimentoAuto(autoJudicial.getDataVencimentoAuto());
            autoDaAtualizacao.setTipoDeAuto(autoJudicial.getTipoDeAuto());
            autoDaAtualizacao.setValorAvaliacaoAuto(autoJudicial.getValorAvaliacaoAuto());
            autoDaAtualizacao.setValorCustasAuto(autoJudicial.getValorCustasAuto());
            autoDaAtualizacao.setValorTeto(autoJudicial.getValorTeto());
            custasJudiciaisDaAtualizacao.getAutosJudiciais().add(autoDaAtualizacao);
        }
        for (CustasFixasDaAtualizacaoDoEvento custasFixas : custasJudiciaisDaAtualizacaoAnterior.getCustasFixasAtualizacao()) {
            CustasFixasDaAtualizacaoDoEvento custasEvento = new CustasFixasDaAtualizacaoDoEvento();
            custasEvento.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
            if (Utils.naoNulo(custasFixas.getDataEvento()) && custasJudiciaisDaAtualizacaoAnterior.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
                custasEvento.setIndiceCorrecaoCustas(custasJudiciaisDaAtualizacaoAnterior.calcularIndiceDeCorrecao(custasFixas.getDataEvento(), dataFinal));
            } else {
                custasEvento.setIndiceCorrecaoCustas(null);
            }
            if (Utils.naoNulo(custasFixas.getDataEvento()) && custasJudiciaisDaAtualizacaoAnterior.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas().booleanValue()) {
                custasEvento.setTaxaJurosCustasFixasDoPeriodo(custasJudiciaisDaAtualizacaoAnterior.calcularTaxaDeJuros(custasFixas.getDataEvento(), dataFinal));
            } else {
                custasEvento.setTaxaJurosCustasFixasDoPeriodo(null);
            }
            custasEvento.setTaxaJurosCustasFixas(custasFixas.getTaxaJurosCustasFixas());
            custasEvento.setDataEvento(custasFixas.getDataEvento());
            custasEvento.setQtdeAgravosDeInstrumento(custasFixas.getQtdeAgravosDeInstrumento());
            custasEvento.setQtdeAgravosDePeticao(custasFixas.getQtdeAgravosDePeticao());
            custasEvento.setQtdeAtosRurais(custasFixas.getQtdeAtosRurais());
            custasEvento.setQtdeAtosUrbanos(custasFixas.getQtdeAtosUrbanos());
            custasEvento.setQtdeEmbargosArrematacao(custasFixas.getQtdeEmbargosArrematacao());
            custasEvento.setQtdeEmbargosExecucao(custasFixas.getQtdeEmbargosExecucao());
            custasEvento.setQtdeEmbargosTerceiros(custasFixas.getQtdeEmbargosTerceiros());
            custasEvento.setQtdeImpugnacaoSentenca(custasFixas.getQtdeImpugnacaoSentenca());
            custasEvento.setQtdeRecursoRevista(custasFixas.getQtdeRecursoRevista());
            custasEvento.setValorAgravoInstrumento(custasFixas.getValorAgravoInstrumento());
            custasEvento.setValorAgravoPeticao(custasFixas.getValorAgravoPeticao());
            custasEvento.setValorAtosRurais(custasFixas.getValorAtosRurais());
            custasEvento.setValorAtosUrbanos(custasFixas.getValorAtosUrbanos());
            custasEvento.setValorEmbargosArrematacao(custasFixas.getValorEmbargosArrematacao());
            custasEvento.setValorEmbargosExecucao(custasFixas.getValorEmbargosExecucao());
            custasEvento.setValorEmbargosTerceiros(custasFixas.getValorEmbargosTerceiros());
            custasEvento.setValorImpuganacaoSentenca(custasFixas.getValorImpuganacaoSentenca());
            custasEvento.setValorRecursoRevista(custasFixas.getValorRecursoRevista());
            custasJudiciaisDaAtualizacao.getCustasFixasAtualizacao().add(custasEvento);
        }
        for (CustaPagaDaAtualizacao custaPaga : custasJudiciaisDaAtualizacaoAnterior.getCustasPagasDoReclamado()) {
            custaPagaDaAtualizacao = new CustaPagaDaAtualizacao();
            custaPagaDaAtualizacao.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
            custaPagaDaAtualizacao.setDataVencimento(custaPaga.getDataVencimento());
            if (Utils.naoNulo(custaPaga.getDataVencimento()) && custasJudiciaisDaAtualizacaoAnterior.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
                custaPagaDaAtualizacao.setIndiceCorrecao(custasJudiciaisDaAtualizacaoAnterior.calcularIndiceDeCorrecao(custaPaga.getDataVencimento(), dataFinal));
            } else {
                custaPagaDaAtualizacao.setIndiceCorrecao(null);
            }
            if (Utils.naoNulo(custaPaga.getDataVencimento()) && custasJudiciaisDaAtualizacaoAnterior.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas().booleanValue()) {
                custaPagaDaAtualizacao.setTaxaJuros(custasJudiciaisDaAtualizacaoAnterior.calcularTaxaDeJuros(custaPaga.getDataVencimento(), dataFinal));
            } else {
                custaPagaDaAtualizacao.setTaxaJuros(null);
            }
            custaPagaDaAtualizacao.setTipoDePagante(custaPaga.getTipoDePagante());
            custaPagaDaAtualizacao.setValor(custaPaga.getValor());
            custasJudiciaisDaAtualizacao.getCustasPagasDoReclamado().add(custaPagaDaAtualizacao);
        }
        if (this.getJaPagoUmaVezReclamante().booleanValue()) {
            boolean custasAnterioresPositivas;
            boolean bl = custasAnterioresPositivas = BigDecimal.ZERO.compareTo(custasJudiciaisDaAtualizacaoAnterior.getValorCustasRemanescentesReclamante()) <= 0;
            if (Utils.naoNulo(custasJudiciaisDaAtualizacao.getDataVencimentoCustasRemanescentesReclamante()) && custasJudiciaisDaAtualizacao.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue() && custasAnterioresPositivas) {
                custasJudiciaisDaAtualizacao.setIndiceCorrecaoCustasRemanescentesReclamante(custasJudiciaisDaAtualizacao.calcularIndiceDeCorrecao(custasJudiciaisDaAtualizacao.getDataVencimentoCustasRemanescentesReclamante(), dataFinal));
            } else {
                custasJudiciaisDaAtualizacao.setIndiceCorrecaoCustasRemanescentesReclamante(null);
            }
            if (Utils.naoNulo(custasJudiciaisDaAtualizacao.getDataVencimentoCustasRemanescentesReclamante()) && custasJudiciaisDaAtualizacao.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas().booleanValue() && custasAnterioresPositivas) {
                custasJudiciaisDaAtualizacao.setTaxaJurosCustasRemanescentesReclamante(custasJudiciaisDaAtualizacao.calcularTaxaDeJuros(custasJudiciaisDaAtualizacao.getDataVencimentoCustasRemanescentesReclamante(), dataFinal));
            } else {
                custasJudiciaisDaAtualizacao.setTaxaJurosCustasRemanescentesReclamante(null);
            }
            custasJudiciaisDaAtualizacao.setValorCustasRemanescentesReclamante(custasJudiciaisDaAtualizacaoAnterior.getValorCustasRemanescentesReclamante());
            custasJudiciaisDaAtualizacao.setValorJurosRemanescentesReclamante(custasJudiciaisDaAtualizacaoAnterior.getValorJurosRemanescentesReclamante());
        } else {
            if (Utils.naoNulo(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamante()) && custasJudiciaisDaAtualizacao.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
                custasJudiciaisDaAtualizacao.setIndiceCorrecaoCustasConhecimentoReclamante(custasJudiciaisDaAtualizacao.calcularIndiceDeCorrecao(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamante(), dataFinal));
            } else {
                custasJudiciaisDaAtualizacao.setIndiceCorrecaoCustasConhecimentoReclamante(null);
            }
            if (Utils.naoNulo(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamante()) && custasJudiciaisDaAtualizacao.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas().booleanValue()) {
                custasJudiciaisDaAtualizacao.setTaxaJurosCustasConhecimentoReclamante(custasJudiciaisDaAtualizacao.calcularTaxaDeJuros(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamante(), dataFinal));
            } else {
                custasJudiciaisDaAtualizacao.setTaxaJurosCustasConhecimentoReclamante(null);
            }
            if (this.getMostrarCustasConhecimentoReclamanteCalculada().booleanValue()) {
                custasJudiciaisDaAtualizacao.setDataVencimentoConhecimentoDoReclamante(dataFinal);
                custasJudiciaisDaAtualizacao.setValorDeConhecimentoDoReclamante(custasJudiciaisDaAtualizacao.getTotalCustasConhecimentoReclamanteCalculada());
            } else if (this.getMostrarCustasConhecimentoReclamanteInformada().booleanValue()) {
                custasJudiciaisDaAtualizacao.setValorDeConhecimentoDoReclamante(custasJudiciaisDaAtualizacaoAnterior.getValorDeConhecimentoDoReclamante());
            } else {
                custasJudiciaisDaAtualizacao.setValorDeConhecimentoDoReclamante(BigDecimal.ZERO);
            }
        }
        for (CustaPagaDaAtualizacao custaPaga : custasJudiciaisDaAtualizacaoAnterior.getCustasPagasDoReclamante()) {
            custaPagaDaAtualizacao = new CustaPagaDaAtualizacao();
            custaPagaDaAtualizacao.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
            custaPagaDaAtualizacao.setDataVencimento(custaPaga.getDataVencimento());
            if (Utils.naoNulo(custaPaga.getDataVencimento()) && custasJudiciaisDaAtualizacaoAnterior.getCalculo().getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
                custaPagaDaAtualizacao.setIndiceCorrecao(custasJudiciaisDaAtualizacaoAnterior.calcularIndiceDeCorrecao(custaPaga.getDataVencimento(), dataFinal));
            } else {
                custaPagaDaAtualizacao.setIndiceCorrecao(null);
            }
            if (Utils.naoNulo(custaPaga.getDataVencimento()) && custasJudiciaisDaAtualizacaoAnterior.getCalculo().getParametrosDeAtualizacao().getJurosDeCustas().booleanValue()) {
                custaPagaDaAtualizacao.setTaxaJuros(custasJudiciaisDaAtualizacaoAnterior.calcularTaxaDeJuros(custaPaga.getDataVencimento(), dataFinal));
            } else {
                custaPagaDaAtualizacao.setTaxaJuros(null);
            }
            custaPagaDaAtualizacao.setTipoDePagante(custaPaga.getTipoDePagante());
            custaPagaDaAtualizacao.setValor(custaPaga.getValor());
            custasJudiciaisDaAtualizacao.getCustasPagasDoReclamante().add(custaPagaDaAtualizacao);
        }
        custasJudiciaisDaAtualizacao.setJaPagoUmaVezReclamado(custasJudiciaisDaAtualizacaoAnterior.getJaPagoUmaVezReclamado());
        custasJudiciaisDaAtualizacao.setJaPagoUmaVezReclamante(custasJudiciaisDaAtualizacaoAnterior.getJaPagoUmaVezReclamante());
        custasJudiciaisDaAtualizacao.setHouvePagamentoDaBase(custasJudiciaisDaAtualizacaoAnterior.getHouvePagamentoDaBase());
        return custasJudiciaisDaAtualizacao;
    }

    public BigDecimal totalValorCorrigidoReclamado() {
        BigDecimal total = BigDecimal.ZERO;
        if (this.jaPagoUmaVezReclamado.booleanValue()) {
            total = Utils.somar(total, Utils.arredondarValorMonetario(this.getValorCorrigidoDeCustasRemanescentesDoReclamado()), total);
        } else {
            total = Utils.somar(total, Utils.arredondarValorMonetario(this.getValorCorrigidoDeCustasDeConhecimentoDoReclamado()), total);
            total = Utils.somar(total, Utils.arredondarValorMonetario(this.getValorCorrigidoDeCustasDeLiquidacao()), total);
        }
        for (CustasFixasDaAtualizacaoDoEvento custaFixa : this.getCustasFixasAtualizacao()) {
            if (Utils.naoNulo(custaFixa.getQtdeAgravosDeInstrumento())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getValorCorrigidoAgravoInstrumento()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeAgravosDePeticao())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getValorCorrigidoAgravoPeticao()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeAtosRurais())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getValorCorrigidoAtosRurais()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeAtosUrbanos())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getValorCorrigidoAtosUrbanos()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeEmbargosArrematacao())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getValorCorrigidoEmbargosArrematacao()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeEmbargosExecucao())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getValorCorrigidoEmbargosExecucao()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeEmbargosTerceiros())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getValorCorrigidoEmbargosTerceiros()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeImpugnacaoSentenca())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getValorCorrigidoImpuganacaoSentenca()), total);
            }
            if (!Utils.naoNulo(custaFixa.getQtdeRecursoRevista())) continue;
            total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getValorCorrigidoRecursoRevista()), total);
        }
        for (AutoJudicialDaAtualizacao auto : this.getAutosJudiciais()) {
            total = Utils.somar(total, Utils.arredondarValorMonetario(auto.getValorCorrigido()), total);
        }
        for (ArmazenamentoDaAtualizacao armazenamento : this.getArmazenamentos()) {
            total = Utils.somar(total, Utils.arredondarValorMonetario(armazenamento.getValorCorrigido()), total);
        }
        return total;
    }

    public BigDecimal totalJurosReclamado() {
        BigDecimal total = BigDecimal.ZERO;
        if (this.jaPagoUmaVezReclamado.booleanValue()) {
            total = Utils.somar(total, Utils.arredondarValorMonetario(this.getTotalDeJurosDeCustasRemanescentesDoReclamado()), total);
        } else {
            total = Utils.somar(total, Utils.arredondarValorMonetario(this.getTotalDeJurosDeCustasDeConhecimentoDoReclamado()), total);
            total = Utils.somar(total, Utils.arredondarValorMonetario(this.getTotalDeJurosDeCustasDeLiquidacao()), total);
        }
        for (CustasFixasDaAtualizacaoDoEvento custaFixa : this.getCustasFixasAtualizacao()) {
            if (Utils.naoNulo(custaFixa.getQtdeAgravosDeInstrumento())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getJurosAgravoInstrumento()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeAgravosDePeticao())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getJurosAgravoPeticao()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeAtosRurais())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getJurosAtosRurais()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeAtosUrbanos())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getJurosAtosUrbanos()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeEmbargosArrematacao())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getJurosEmbargosArrematacao()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeEmbargosExecucao())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getJurosEmbargosExecucao()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeEmbargosTerceiros())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getJurosEmbargosTerceiros()), total);
            }
            if (Utils.naoNulo(custaFixa.getQtdeImpugnacaoSentenca())) {
                total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getJurosImpuganacaoSentenca()), total);
            }
            if (!Utils.naoNulo(custaFixa.getQtdeRecursoRevista())) continue;
            total = Utils.somar(total, Utils.arredondarValorMonetario(custaFixa.getJurosRecursoRevista()), total);
        }
        for (AutoJudicialDaAtualizacao auto : this.getAutosJudiciais()) {
            if (!Utils.naoNulo(auto.getTaxaJuros())) continue;
            total = Utils.somar(total, Utils.arredondarValorMonetario(auto.getJuros()), total);
        }
        for (ArmazenamentoDaAtualizacao armazenamento : this.getArmazenamentos()) {
            total = Utils.somar(total, Utils.arredondarValorMonetario(armazenamento.getJuros()), total);
        }
        return total;
    }

    public BigDecimal totalDevidoReclamado() {
        return Utils.somar(this.totalValorCorrigidoReclamado(), this.totalJurosReclamado());
    }

    public BigDecimal getDiferencaValorReclamado() {
        return Utils.subtrair(this.totalValorCorrigidoReclamado(), this.getValorPagoReclamadoValor());
    }

    public BigDecimal getDiferencaJurosReclamado() {
        return Utils.subtrair(this.totalJurosReclamado(), this.getValorPagoReclamadoJuros());
    }

    public BigDecimal getTotalDiferencaReclamado() {
        return Utils.somar(this.getDiferencaValorReclamado(), this.getDiferencaJurosReclamado());
    }

    public BigDecimal totalValorCorrigidoReclamante() {
        if (this.jaPagoUmaVezReclamante.booleanValue()) {
            return Utils.arredondarValorMonetario(this.getValorCorrigidoDeCustasRemanescentesDoReclamante());
        }
        return Utils.arredondarValorMonetario(this.getValorCorrigidoDeCustasDeConhecimentoDoReclamante());
    }

    public BigDecimal totalJurosReclamante() {
        BigDecimal total = BigDecimal.ZERO;
        total = this.jaPagoUmaVezReclamante != false ? Utils.somar(total, Utils.arredondarValorMonetario(this.getTotalDeJurosDeCustasRemanescentesDoReclamante()), total) : Utils.somar(total, Utils.arredondarValorMonetario(this.getTotalDeJurosDeCustasDeConhecimentoDoReclamante()), total);
        return total;
    }

    public BigDecimal totalDevidoReclamante() {
        return Utils.somar(this.totalValorCorrigidoReclamante(), this.totalJurosReclamante());
    }

    public BigDecimal getDiferencaValorReclamante() {
        return Utils.subtrair(this.totalValorCorrigidoReclamante(), this.getValorPagoReclamanteValor());
    }

    public BigDecimal getDiferencaJurosReclamante() {
        return Utils.subtrair(this.totalJurosReclamante(), this.getValorPagoReclamanteJuros());
    }

    public BigDecimal getTotalDiferencaReclamante() {
        return Utils.somar(this.getDiferencaValorReclamante(), this.getDiferencaJurosReclamante());
    }

    public Boolean getMostrarCustasConhecimentoReclamanteGrade() {
        return !TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA.equals((Object)this.getTipoDeCustasDeConhecimentoDoReclamante());
    }

    public Boolean getMostrarCustasConhecimentoReclamanteCalculada() {
        return TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.getTipoDeCustasDeConhecimentoDoReclamante()) && this.getHouvePagamentoDaBase() == false;
    }

    public Boolean getMostrarCustasConhecimentoReclamanteInformada() {
        return TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.getTipoDeCustasDeConhecimentoDoReclamante()) || TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.getTipoDeCustasDeConhecimentoDoReclamante()) && this.getHouvePagamentoDaBase() != false;
    }

    public Boolean getMostrarCustasConhecimentoReclamadoCalculada() {
        return TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.getTipoDeCustasDeConhecimentoDoReclamado()) && this.getHouvePagamentoDaBase() == false;
    }

    public Boolean getMostrarCustasConhecimentoReclamadoInformada() {
        return TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.getTipoDeCustasDeConhecimentoDoReclamado()) || TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.getTipoDeCustasDeConhecimentoDoReclamado()) && this.getHouvePagamentoDaBase() != false;
    }

    public Boolean getMostrarCustasLiquidacaoCalculada() {
        return TipoDeCustasDeLiquidacaoEnum.CALCULADA_MEIO_POR_CENTO.equals((Object)this.getTipoDeCustasDeLiquidacao()) && this.getHouvePagamentoDaBase() == false;
    }

    public Boolean getMostrarCustasLiquidacaoInformada() {
        return TipoDeCustasDeLiquidacaoEnum.INFORMADA.equals((Object)this.getTipoDeCustasDeLiquidacao()) || TipoDeCustasDeLiquidacaoEnum.CALCULADA_MEIO_POR_CENTO.equals((Object)this.getTipoDeCustasDeLiquidacao()) && this.getHouvePagamentoDaBase() != false;
    }

    public BigDecimal getValorCorrigidoDeCustasRemanescentesDoReclamado() {
        if (Utils.nulo(this.getValorCustasRemanescentesReclamado())) {
            return BigDecimal.ZERO;
        }
        if (Utils.nulo(this.getIndiceCorrecaoCustasRemanescentesReclamado())) {
            return this.getValorCustasRemanescentesReclamado();
        }
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasRemanescentesReclamado(), this.getValorCustasRemanescentesReclamado());
    }

    public BigDecimal getValorCorrigidoDeJurosRemanescentesDoReclamado() {
        if (Utils.nulo(this.getValorJurosRemanescentesReclamado())) {
            return BigDecimal.ZERO;
        }
        if (Utils.nulo(this.getIndiceCorrecaoCustasRemanescentesReclamado())) {
            return this.getValorJurosRemanescentesReclamado();
        }
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasRemanescentesReclamado(), this.getValorJurosRemanescentesReclamado());
    }

    public BigDecimal getJurosDoPeriodoDeCustasRemanescentesDoReclamado() {
        if (Utils.nulo(this.getTaxaJurosCustasRemanescentesReclamado()) || Utils.nulo(this.getValorCorrigidoDeCustasRemanescentesDoReclamado())) {
            return BigDecimal.ZERO;
        }
        return Utils.aplicarJuros(this.getTaxaJurosCustasRemanescentesReclamado(), this.getValorCorrigidoDeCustasRemanescentesDoReclamado());
    }

    public BigDecimal getTotalDeJurosDeCustasRemanescentesDoReclamado() {
        return Utils.somar(this.getValorCorrigidoDeJurosRemanescentesDoReclamado(), this.getJurosDoPeriodoDeCustasRemanescentesDoReclamado());
    }

    public BigDecimal getTotalCustasRemanescentesDoReclamado() {
        return Utils.somar(this.getValorCorrigidoDeCustasRemanescentesDoReclamado(), this.getTotalDeJurosDeCustasRemanescentesDoReclamado());
    }

    public BigDecimal getValorCorrigidoDeCustasRemanescentesDoReclamante() {
        if (Utils.nulo(this.getValorCustasRemanescentesReclamante())) {
            return BigDecimal.ZERO;
        }
        if (Utils.nulo(this.getIndiceCorrecaoCustasRemanescentesReclamante())) {
            return this.getValorCustasRemanescentesReclamante();
        }
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasRemanescentesReclamante(), this.getValorCustasRemanescentesReclamante());
    }

    public BigDecimal getValorCorrigidoDeJurosRemanescentesDoReclamante() {
        if (Utils.nulo(this.getValorJurosRemanescentesReclamante())) {
            return BigDecimal.ZERO;
        }
        if (Utils.nulo(this.getIndiceCorrecaoCustasRemanescentesReclamante())) {
            return this.getValorJurosRemanescentesReclamante();
        }
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasRemanescentesReclamante(), this.getValorJurosRemanescentesReclamante());
    }

    public BigDecimal getJurosDoPeriodoDeCustasRemanescentesDoReclamante() {
        if (Utils.nulo(this.getTaxaJurosCustasRemanescentesReclamante()) || Utils.nulo(this.getValorCorrigidoDeCustasRemanescentesDoReclamante())) {
            return BigDecimal.ZERO;
        }
        return Utils.aplicarJuros(this.getTaxaJurosCustasRemanescentesReclamante(), this.getValorCorrigidoDeCustasRemanescentesDoReclamante());
    }

    public BigDecimal getTotalDeJurosDeCustasRemanescentesDoReclamante() {
        return Utils.somar(this.getValorCorrigidoDeJurosRemanescentesDoReclamante(), this.getJurosDoPeriodoDeCustasRemanescentesDoReclamante());
    }

    public BigDecimal getTotalCustasRemanescentesDoReclamante() {
        return Utils.somar(this.getValorCorrigidoDeCustasRemanescentesDoReclamante(), this.getTotalDeJurosDeCustasRemanescentesDoReclamante());
    }

    public BigDecimal getCorrigidoCustaDeConhecimentoReclamado() {
        if (this.getMostrarCustasConhecimentoReclamadoCalculada().booleanValue()) {
            return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorBaseCustasCalculadas(), this.getIndiceCorrecaoCustasConhecimentoReclamado()));
        }
        if (this.getMostrarCustasConhecimentoReclamadoInformada().booleanValue()) {
            return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorConhecimentoDoReclamado(), this.getIndiceCorrecaoCustasConhecimentoReclamado()));
        }
        return BigDecimal.ZERO;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public static CustasJudiciaisDaAtualizacao obter(long id) {
        return (CustasJudiciaisDaAtualizacao)CustasJudiciaisDaAtualizacao.obter(RepositorioDeCustasJudiciaisDaAtualizacao.class, id);
    }

    public BigDecimal getTetoCustasConhecimentoReclamante() {
        return this.tetoCustasConhecimentoReclamante;
    }

    public void setTetoCustasConhecimentoReclamante(BigDecimal tetoCustasConhecimentoReclamante) {
        this.tetoCustasConhecimentoReclamante = tetoCustasConhecimentoReclamante;
    }

    public BigDecimal getTetoCustasConhecimentoReclamado() {
        return this.tetoCustasConhecimentoReclamado;
    }

    public void setTetoCustasConhecimentoReclamado(BigDecimal tetoCustasConhecimentoReclamado) {
        this.tetoCustasConhecimentoReclamado = tetoCustasConhecimentoReclamado;
    }

    static {
        TAXA_RECLAMADO_CONHECIMENTO = TAXA_RECLAMANTE_CONHECIMENTO = new BigDecimal("0.02");
        TAXA_RECLAMADO_LIQUIDACAO = new BigDecimal("0.005");
        TAXA_CUSTAS_AUTO = new BigDecimal("0.05");
        TAXA_CUSTAS_ARMAZENAMENTO = new BigDecimal("0.001");
    }

    public class CustasFixasWrapper {
        private Date ocorrencia;
        private String tipo;
        private BigDecimal base;
        private Integer quantidade;
        private BigDecimal valor;
        private BigDecimal indiceDeCorrecao;
        private BigDecimal taxaDeJuros;

        public CustasFixasWrapper(Date ocorrencia, String tipo, BigDecimal base, Integer quantidade, BigDecimal valor, BigDecimal indiceDeCorrecao, BigDecimal taxaDeJuros) {
            this.ocorrencia = ocorrencia;
            this.tipo = tipo;
            this.base = base;
            this.quantidade = quantidade;
            this.valor = valor;
            this.indiceDeCorrecao = indiceDeCorrecao;
            this.taxaDeJuros = taxaDeJuros;
        }

        public Date getOcorrencia() {
            return this.ocorrencia;
        }

        public String getTipo() {
            return this.tipo;
        }

        public BigDecimal getBase() {
            return this.base;
        }

        public Integer getQuantidade() {
            return this.quantidade;
        }

        public BigDecimal getValor() {
            return this.valor;
        }

        public BigDecimal getIndiceDeCorrecao() {
            return this.indiceDeCorrecao;
        }

        public BigDecimal getValorCorrigido() {
            return Utils.aplicarCorrecaoMonetaria(this.indiceDeCorrecao, this.valor, BigDecimal.ZERO);
        }

        public BigDecimal getJuros() {
            return Utils.aplicarJuros(this.taxaDeJuros, this.getValorCorrigido(), BigDecimal.ZERO);
        }

        public BigDecimal getTotal() {
            return this.getValorCorrigido().add(this.getJuros(), Utils.CONTEXTO_MATEMATICO);
        }
    }
}

