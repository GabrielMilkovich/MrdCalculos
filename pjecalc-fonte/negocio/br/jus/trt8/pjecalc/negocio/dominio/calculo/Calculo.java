/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.EnumType
 *  javax.persistence.Enumerated
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.PropertyValueException
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.annotations.Where
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 *  org.jboss.seam.security.Identity
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.Constantes;
import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.HelperIterate;
import br.jus.trt8.pjecalc.base.comum.LazyloadSecure;
import br.jus.trt8.pjecalc.base.comum.LogicoFuzzy;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.constantes.TipoDocumentoFiscal;
import br.jus.trt8.pjecalc.base.dominio.Data;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.OrdenadorDeListas;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.comum.api.Identidade;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.DependenciaException;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDaQuantidadeApuradaDoPrazoAvisoPrevio;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeCalculoDoPrincipalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeJurosDasVerbasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CustasDevidasFixasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndicesAcumuladosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.InstanciaSetorEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.PreenchimentoJornadasCartaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeApuracaoPrazoDoAvisoPrevioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeBaseDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.AnalisadorAlteracaoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.CompetenciaDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ExcecaoDaCargaHorariaDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ExcecaoDoSabadoDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.HistoricoValidacaoDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ItemPontoFacultativo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.RepositorioDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Setor;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustaPaga;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.Falta;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.RepositorioDeHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.TotalizadorDeHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJurosOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.TotalizadorDeMulta;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.OcorrenciaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.PrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.verba.VerbaParaCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoDiariaCartao;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ExcecaoDoFechamentoDeCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.RepositorioDeApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaCalculada;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaInformada;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.municipio.Municipio;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.processo.Processo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.BaseTabelada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Principal;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.PropertyValueException;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.Where;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.jboss.seam.security.Identity;

@Entity
@Table(name="TBCALCULO")
@SequenceGenerator(name="SQCALCULO", sequenceName="SQCALCULO", allocationSize=1)
@Name(value="calculo")
@Scope(value=ScopeType.SESSION)
public class Calculo
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = -5059130342755055081L;
    private static final String ULTIMA_REMUNERACAO = "\u00daLTIMA REMUNERA\u00c7\u00c3O";
    private static final String ULTIMA_ATUALIZACAO = "Data da \u00daltima Atualiza\u00e7\u00e3o";
    private static final String DATA_ULTIMA_ATUALIZACAO = "dataUltimaAtualizacao";
    private static final String ADMISSAO = "Admiss\u00e3o";
    private static final String DATA_ADMISSAO = "dataAdmissao";
    private static final String AJUIZAMENTO = "Ajuizamento";
    private static final String DATA_AJUIZAMENTO = "dataAjuizamento";
    private static final String DEMISSAO = "Demiss\u00e3o";
    private static final String DATA_DEMISSAO = "dataDemissao";
    private static final String DATA_FINAL = "Data Final";
    private static final String DATA_TERMINO_CALCULO = "dataTerminoCalculo";
    private static final String DATA_INICIO = "Data In\u00edcio";
    private static final String DATA_INICIO_CALCULO = "dataInicioCalculo";
    private static final String NUMERO = "N\u00famero";
    private static final Date TREZE_NOVEMBRO_2014 = HelperDate.getInstance(2014, 10, 13).getDate();
    private static final Date TREZE_NOVEMBRO_2019 = HelperDate.getInstance(2019, 10, 13).getDate();
    private static final Date TREZE_NOVEMBRO_1989 = HelperDate.getInstance(1989, 10, 13).getDate();
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCALCULO")
    @Column(name="IIDCALCULO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Atualizacao atualizacao;
    @Column(name="SCDHASHLIQUIDACAO")
    private String hashCodeLiquidacao;
    @Column(name="DDTCRIACAOCALCULO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataCriacao;
    @OneToOne(cascade={CascadeType.ALL})
    @JoinColumn(name="IIDPROCESSOCALCULO")
    private Processo processo;
    @Column(name="DDTADMISSAO")
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataAdmissao;
    @Column(name="DDTDEMISSAO")
    @Temporal(value=TemporalType.DATE)
    private Date dataDemissao;
    @Column(name="DDTAJUIZAMENTO")
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataAjuizamento;
    @Column(name="MVLULTIMAREMUNERACAO", precision=12, scale=2)
    private BigDecimal valorUltimaRemuneracao;
    @Column(name="MVLMAIORREMUNERACAO", precision=12, scale=2)
    private BigDecimal valorMaiorRemuneracao;
    @Column(name="DDTINICIOCALCULO")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicioCalculo;
    @Column(name="DDTTERMINOCALCULO")
    @Temporal(value=TemporalType.DATE)
    private Date dataTerminoCalculo;
    @Column(name="RVLCARGAHORARIAPADRAO", precision=7, scale=4)
    private BigDecimal valorCargaHorariaPadrao = new BigDecimal("220.0");
    @OneToOne
    @JoinColumn(name="ICDMUNICIPIO")
    @NotNull
    private Municipio municipio;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLSABADODIAUTIL", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean sabadoDiaUtil = true;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPROJETARAVISOINDENIZADO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean projetaAvisoIndenizado = true;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLCONSIDERARFERIADOESTADUAL", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean consideraFeriadoEstadual = true;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPRESCRICAOTRINTENARIA", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean prescricaoFgts;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPRESCRICAOQUINQUENAL", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean prescricaoQuinquenal;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLLIMITARAVOSPERIODOCALCULO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean limitarAvosAoPeriodoDoCalculo = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPADRAOZERARVALORNEGATIVO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean zeraValorNegativo;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLCONSIDERARFERIADOMUNICIPAL", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean consideraFeriadoMunicipal = true;
    @Enumerated(value=EnumType.STRING)
    @Column(name="STPCALCULO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoCalculoEnum")})
    @NotNull
    private TipoCalculoEnum tipoCalculo;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    @OrderBy(value="nome")
    private Set<VerbaDeCalculo> verbas;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    @OrderBy(value="nome")
    private Set<HistoricoSalarial> historicosSalariais;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    @OrderBy(value="dataInicialDoPeriodoAquisitivo")
    private Set<Ferias> listaDeFerias;
    @Column(name="IQTDIASFERIASPROPORCIONAL")
    private Integer prazoFeriasProporcional;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    @OrderBy(value="competencia, dataInicial")
    private Set<ApuracaoDeJuros> apuracoesDeJuros;
    @Column(name="DDTLIQUIDACAO")
    @Temporal(value=TemporalType.DATE)
    private Date dataDeLiquidacao;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Set<ExcecaoDaCargaHorariaDoCalculo> excecoesDaCargaHoraria = new HashSet<ExcecaoDaCargaHorariaDoCalculo>();
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Set<ExcecaoDoSabadoDoCalculo> excecoesDoSabado = new HashSet<ExcecaoDoSabadoDoCalculo>();
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    @OrderBy(value="dataInicioPeriodoFalta")
    private Set<Falta> faltas;
    @Column(name="STPREGIMECONTRATO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="RegimeDoContratoEnum")})
    private RegimeDoContratoEnum regimeDoContrato = RegimeDoContratoEnum.INTEGRAL;
    @Column(name="STPINDICEACUMULADO", columnDefinition="VARCHAR2(4)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndicesAcumuladosEnum")})
    @NotNull
    private IndicesAcumuladosEnum indicesAcumulados = IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Fgts fgts;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Inss inss;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private PrevidenciaPrivada previdenciaPrivada;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private PensaoAlimenticia pensaoAlimenticia;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private ParametrosDeAtualizacao parametrosDeAtualizacao;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    @OrderBy(value="id")
    private Set<Multa> multas;
    @Transient
    private TotalizadorDeMulta totalizadorDeMulta;
    @Transient
    private TotalizadorDeHonorario totalizadorDeHonorario;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    @OrderBy(value="id")
    private Set<Honorario> honorarios;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Irpf irpf;
    @Column(name="SNRCPFUSUARIOCRIADOR", columnDefinition="VARCHAR2(100)")
    private String usuarioCriador;
    @Transient
    private Estado estado;
    @Transient
    private LogicoFuzzy<?> sabadoDiaUtilComExcecao;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private CustasJudiciais custasJudiciais;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private SeguroDesemprego seguroDesemprego;
    @Transient
    private TabelaDeJurosDoCalculo tabelaDeJuros;
    @Transient
    private Total totalDeCapitalDaApuracaoDeJuros;
    @Transient
    private Total totalDaApuracaoDeJuros;
    @Transient
    private Total totalDaApuracaoDeJurosParaIrpfDecimoTerceiro;
    @Transient
    private Total totalDaApuracaoDeJurosParaIrpfFerias;
    @Transient
    private Total totalDaApuracaoDeJurosParaIrpfDemaisVerbas;
    @Transient
    private Total totalGeralDaApuracaoDeJuros;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private SalarioFamilia salarioFamilia;
    @Column(name="STPAPURACAOPRAZOAVISO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeApuracaoPrazoDoAvisoPrevioEnum")})
    private TipoDeApuracaoPrazoDoAvisoPrevioEnum apuracaoPrazoDoAvisoPrevio = TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_CALCULADA;
    @Column(name="IQTDIASPRAZOAVISO")
    private Integer prazoAvisoInformado;
    @Transient
    private Integer ordem;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Set<ItemPontoFacultativo> pontosFacultativos = new LinkedHashSet<ItemPontoFacultativo>();
    @Where(clause="STPOPERACAO = 'C' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    @OrderBy(value="id DESC")
    private Set<HistoricoValidacaoDoCalculo> historicosValidacao;
    @Where(clause="STPOPERACAO = 'A' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    @OrderBy(value="id DESC")
    private Set<HistoricoValidacaoDoCalculo> historicosValidacaoAtualizacao;
    @Column(name="SFLATIVO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean ativo = Boolean.TRUE;
    @Column(name="SFLPROCESSOINFOMANUAL", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean processoInformadoManualmente = Boolean.FALSE;
    @Column(name="SDSCOMENTARIO", columnDefinition="VARCHAR2(255)")
    private String comentarios;
    @Column(name="IIDSETOR")
    private Integer idSetor;
    @Column(name="STPINSTANCIA", columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="InstanciaSetorEnum")})
    private InstanciaSetorEnum instancia;
    @Column(name="SFLVALIDO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean validado = false;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    @OrderBy(value="nome")
    private Set<CartaoDePonto> cartoesDePonto;
    @Column(name="SFLHASHCALCULOCORRETO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean hashCalculoCorreto = false;
    @Column(name="SFLHASHATUALIZACAOCORRETO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean hashAtualizacaoCorreto = false;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Set<Pagamento> pagamentos;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Set<ApuracaoCartaoDePonto> apuracoesCartaoDePonto;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Set<ApuracaoDiariaCartao> apuracoesDiariasCartaoDePonto;
    @Column(name="IVLDIAFECHAMENTOPADRAO", nullable=true)
    private Integer diaFechamentoMes = 31;
    @Column(name="SFLCALCULOEXTERNO", columnDefinition="VARCHAR2(1)", nullable=false)
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean calculoExterno = false;
    @OneToOne(mappedBy="calculoExterno", cascade={CascadeType.ALL})
    private ParcelasAtualizaveisCreditosReclamante parcelasAtualizaveisCreditosReclamante;
    @OneToOne(mappedBy="calculoExterno", cascade={CascadeType.ALL})
    private ParcelasAtualizaveisDescontoCreditosReclamante parcelasAtualizaveisDescontoCreditosReclamante;
    @OneToOne(mappedBy="calculoExterno", cascade={CascadeType.ALL})
    private ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado;
    @OneToOne(mappedBy="calculoExterno", cascade={CascadeType.ALL})
    private ParcelasAtualizaveisDebitosReclamante parcelasAtualizaveisDebitosReclamante;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="calculo")
    private Set<ExcecaoDoFechamentoDeCartaoDePonto> excecoesDoFechamentoDeCartaoDePonto = new TreeSet<ExcecaoDoFechamentoDeCartaoDePonto>();
    @Column(name="SDSVERSAOSISTEMALIQUIDACAO", columnDefinition="VARCHAR2(30)")
    private String versaoDoSistema;
    @Transient
    private Date inicioFeriasColetivas;
    @Transient
    private boolean relatorioAtualizacao;

    public Calculo() {
        super(RepositorioDeCalculo.class);
        this.processo = new Processo();
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

    public Calculo consistirCamposObrigatorios() {
        NegocioException excecao = new NegocioException();
        if (this.getEstado() == null) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "estado", Mensagens.MSG0003, "Estado"));
        }
        if (this.municipio == null) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "municipio", Mensagens.MSG0003, "Munic\u00edpio"));
        }
        if (this.dataAdmissao == null) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_ADMISSAO, Mensagens.MSG0003, ADMISSAO));
        }
        if (this.dataAjuizamento == null) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_AJUIZAMENTO, Mensagens.MSG0003, AJUIZAMENTO));
        }
        if (this.dataDemissao == null && this.dataTerminoCalculo == null) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_DEMISSAO, Mensagens.MSG0020, DEMISSAO));
        }
        if (this.dataTerminoCalculo == null && this.dataDemissao == null) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_TERMINO_CALCULO, Mensagens.MSG0020, DATA_FINAL));
        }
        if (this.excecoesDaCargaHoraria != null && !this.excecoesDaCargaHoraria.isEmpty() && this.valorCargaHorariaPadrao == null) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorCargaHorariaPadrao", Mensagens.MSG0033, new Object[0]));
        }
        if (TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_INFORMADA == this.getApuracaoPrazoDoAvisoPrevio()) {
            if (this.prazoAvisoInformado == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "prazoAvisoInformado", Mensagens.MSG0003, "Quantidade"));
            } else if (!this.validarQtdePrazoAviso()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "prazoAvisoInformado", Mensagens.MSG0004, "Quantidade"));
            }
        } else {
            this.setPrazoAvisoInformado(null);
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public Calculo consistirCamposObrigatoriosCalculoExterno() {
        NegocioException excecao = new NegocioException();
        if (this.isCalculoExterno().booleanValue()) {
            if (this.dataDeLiquidacao == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_ULTIMA_ATUALIZACAO, Mensagens.MSG0003, ULTIMA_ATUALIZACAO));
            }
            if (this.irpf != null && this.irpf.getApurarImpostoRenda().booleanValue() && this.irpf.getQtdMesesRendimentoTributaveis() == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "qtdMesesRendimento", Mensagens.MSG0003, "Quantidade de Meses"));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    private boolean validarQtdePrazoAviso() {
        return !Utils.nulo(this.prazoAvisoInformado) && this.prazoAvisoInformado >= 1;
    }

    public Calculo consistirDataDeAdmissao() {
        String nomeCampo;
        Data dataDeAdmissao = Data.dataComValor(this.dataAdmissao);
        NegocioException excecao = new NegocioException();
        String idCampo = this.isCalculoExterno() != false ? DATA_ULTIMA_ATUALIZACAO : DATA_ADMISSAO;
        String string = nomeCampo = this.isCalculoExterno() != false ? ULTIMA_ATUALIZACAO : ADMISSAO;
        if (dataDeAdmissao.isIgualA(Calendar.getInstance().getTime()) || dataDeAdmissao.isApos(Calendar.getInstance().getTime())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, idCampo, Mensagens.MSG0009, nomeCampo, "Data atual"));
        }
        if (dataDeAdmissao.isAnteriorACemAnos()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, idCampo, Mensagens.MSG0011, nomeCampo));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public Calculo consistirPrescricaoQuinquenal() {
        if (this.prescricaoQuinquenal.booleanValue()) {
            this.consistirPrescricao();
        }
        return this;
    }

    public Calculo consistirPrescricaoFgts() {
        if (this.prescricaoFgts.booleanValue()) {
            this.consistirPrescricao();
        }
        return this;
    }

    private void consistirPrescricao() {
        NegocioException excecao = new NegocioException();
        boolean isPrescricaoFgtsMaiorAdmissao = HelperDate.getInstance(this.getDataPrescricaoFgts()).lessThanOrEqualsTo(this.dataAdmissao);
        boolean isPrescricaoQuinquenalMaiorAdmissao = HelperDate.getInstance(this.getDataPrescricaoQuinquenal()).lessThanOrEqualsTo(this.dataAdmissao);
        if (Utils.naoNulos(this.dataAdmissao, this.dataAjuizamento)) {
            if (this.prescricaoQuinquenal.booleanValue() && isPrescricaoQuinquenalMaiorAdmissao) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0082, new Object[0]));
            }
            if (this.prescricaoFgts.booleanValue() && isPrescricaoFgtsMaiorAdmissao) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0081, new Object[0]));
            }
        }
        Date dataFimQuiquenal = null;
        if (Utils.naoNulos(this.getDataDemissao(), this.getDataTerminoCalculo())) {
            dataFimQuiquenal = HelperDate.getInstance(this.getDataDemissao()).greaterThenOrEquals(this.getDataTerminoCalculo()) ? this.getDataDemissao() : this.getDataTerminoCalculo();
        } else if (Utils.naoNulo(this.getDataDemissao())) {
            dataFimQuiquenal = this.getDataDemissao();
        } else if (Utils.naoNulo(this.getDataTerminoCalculo())) {
            dataFimQuiquenal = this.getDataTerminoCalculo();
        }
        Date dataFimPrescricaoFgts = null;
        boolean dataFimPrescricaoFgtsDevidoADemissao = true;
        if (Utils.naoNulos(this.getDataDemissao(), this.getDataTerminoCalculo())) {
            if (this.prescricaoFgts.booleanValue()) {
                dataFimPrescricaoFgts = this.getDataDemissao();
            }
        } else if (Utils.naoNulo(this.getDataDemissao())) {
            dataFimPrescricaoFgts = this.getDataDemissao();
        } else if (Utils.naoNulo(this.getDataTerminoCalculo())) {
            dataFimPrescricaoFgts = this.getDataTerminoCalculo();
            dataFimPrescricaoFgtsDevidoADemissao = false;
        }
        if (this.prescricaoQuinquenal.booleanValue() && HelperDate.dateAfter(this.getDataPrescricaoQuinquenal(), dataFimQuiquenal)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0084, new Object[0]));
        }
        if (this.prescricaoFgts.booleanValue() && HelperDate.dateAfter(this.getDataPrescricaoFgts(), dataFimPrescricaoFgts)) {
            if (dataFimPrescricaoFgtsDevidoADemissao) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0150, new Object[0]));
            } else {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0083, new Object[0]));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
    }

    public Calculo consistirDataDeDemissao() {
        NegocioException excecao = new NegocioException();
        if (this.dataDemissao != null && Data.dataComValor(this.dataDemissao).isPosteriorACemAnos()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_DEMISSAO, Mensagens.MSG0011, DEMISSAO));
        }
        if (Utils.naoNulos(this.dataDemissao, this.dataAdmissao) && Data.dataComValor(this.dataAdmissao).isApos(this.dataDemissao)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_DEMISSAO, Mensagens.MSG0008, DEMISSAO, ADMISSAO));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public Calculo consistirDataDeAjuizamento() {
        NegocioException excecao = new NegocioException();
        if (this.dataAjuizamento != null && Data.dataComValor(this.dataAjuizamento).isPosteriorACemAnos()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_AJUIZAMENTO, Mensagens.MSG0011, AJUIZAMENTO));
        }
        if (Utils.naoNulos(this.dataAjuizamento, this.dataAdmissao) && Data.dataComValor(this.dataAdmissao).isApos(this.dataAjuizamento)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_AJUIZAMENTO, Mensagens.MSG0008, AJUIZAMENTO, ADMISSAO));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public Calculo consistirDataDeInicioDoCalculo() {
        if (this.dataInicioCalculo != null) {
            Data dataDeInicioDoCalculo = Data.dataComValor(this.dataInicioCalculo);
            NegocioException excecao = new NegocioException();
            if (dataDeInicioDoCalculo.isAnteriorACemAnos()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_INICIO_CALCULO, Mensagens.MSG0011, DATA_INICIO));
            }
            if (dataDeInicioDoCalculo.isPosteriorACemAnos()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_INICIO_CALCULO, Mensagens.MSG0011, DATA_INICIO));
            }
            if (dataDeInicioDoCalculo.isAnteriorA(this.dataAdmissao)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_INICIO_CALCULO, Mensagens.MSG0008, DATA_INICIO, ADMISSAO));
            }
            if (this.dataDemissao != null && dataDeInicioDoCalculo.isApos(this.dataDemissao)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_INICIO_CALCULO, Mensagens.MSG0010, DATA_INICIO, DEMISSAO));
            }
            if (!excecao.getMensagensDeRecurso().isEmpty()) {
                throw excecao;
            }
        }
        return this;
    }

    public Calculo consistirDataDeTerminoDoCalculo() {
        if (this.dataTerminoCalculo != null) {
            Data dataDeTerminoDoCalculo = Data.dataComValor(this.dataTerminoCalculo);
            NegocioException excecao = new NegocioException();
            if (dataDeTerminoDoCalculo.isAnteriorACemAnos()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_TERMINO_CALCULO, Mensagens.MSG0011, DATA_FINAL));
            }
            if (dataDeTerminoDoCalculo.isPosteriorACemAnos()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_TERMINO_CALCULO, Mensagens.MSG0011, DATA_FINAL));
            }
            if (dataDeTerminoDoCalculo.isAnteriorA(this.dataAdmissao)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_TERMINO_CALCULO, Mensagens.MSG0008, DATA_FINAL, ADMISSAO));
            }
            if (Utils.naoNulo(this.dataInicioCalculo) && dataDeTerminoDoCalculo.isAnteriorA(this.dataInicioCalculo)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, DATA_TERMINO_CALCULO, Mensagens.MSG0008, DATA_FINAL, DATA_INICIO));
            }
            if (!excecao.getMensagensDeRecurso().isEmpty()) {
                throw excecao;
            }
        }
        return this;
    }

    protected Calculo consistirProcesso() {
        if (Utils.naoNulo(this.processo)) {
            this.processo.validar();
        }
        return this;
    }

    protected Calculo consistirPontosFacultativos() {
        for (ItemPontoFacultativo ponto : this.getPontosFacultativos()) {
            if (ponto.getPontoFacultativo().isAbrangenciaNacional() || !(ponto.getPontoFacultativo().isAbrangenciaMunicipal() ? !ponto.getPontoFacultativo().getEstado().getSigla().equals(this.getEstado().getSigla()) || ponto.getPontoFacultativo().getMunicipio().getId().longValue() != this.getMunicipio().getId().longValue() : !ponto.getPontoFacultativo().getEstado().getSigla().equals(this.getEstado().getSigla()))) continue;
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0066, new Object[0]));
        }
        return this;
    }

    public static Calculo obter(Object id) {
        return (Calculo)Calculo.obter(RepositorioDeCalculo.class, id);
    }

    public static Integer obterQuantidadeCalculosInvalidosDoSetor() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa();
        Identidade identidade = (Identidade)Identity.instance();
        criterios.adicionarCriterio("and", "ativo = ?", true);
        criterios.adicionarCriterio("and", "idSetor = ?", identidade.getSetor().getId());
        criterios.adicionarCriterio("and", "instancia = ?", new Object[]{identidade.getSetor().getInstancia()});
        criterios.adicionarCriterio("and", "validado = ?", false);
        return (int)Calculo.getRepositorio(RepositorioDeCalculo.class).obterQuantidade(criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    public static List<Calculo> obterCalculosPorProcesso(Processo processo) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa();
        criterios.adicionarCriterio("and", "processo.identificador.numero = ?", processo.getNumeroProcesso());
        criterios.adicionarCriterio("and", "processo.identificador.digito = ?", processo.getDigitoProcesso());
        criterios.adicionarCriterio("and", "processo.identificador.ano = ?", processo.getAnoProcesso());
        criterios.adicionarCriterio("and", "processo.identificador.justica = ?", processo.getJustica());
        criterios.adicionarCriterio("and", "processo.identificador.regiao = ?", processo.getRegiao());
        criterios.adicionarCriterio("and", "processo.identificador.vara = ?", processo.getVaraProcesso());
        criterios.adicionarCriterio("and", "validado = ?", true);
        return Calculo.getRepositorio(RepositorioDeCalculo.class).pesquisar("id", criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    @Override
    protected Calculo validar() {
        this.consistirCamposObrigatorios();
        if (Utils.naoVazio(this.processo.getReclamante().getNumeroDocumentoFiscal())) {
            switch (this.processo.getReclamante().getTipoDocumentoFiscal()) {
                case CEI: {
                    if (TipoDocumentoFiscal.CEI.validar(this.processo.getReclamante().getNumeroDocumentoFiscal())) break;
                    throw new PropertyValueException(Mensagens.MSG0004.getChave(), this.getClass().getSimpleName(), NUMERO);
                }
                case CPF: {
                    if (TipoDocumentoFiscal.CPF.validar(this.processo.getReclamante().getNumeroDocumentoFiscal())) break;
                    throw new PropertyValueException(Mensagens.MSG0004.getChave(), this.getClass().getSimpleName(), NUMERO);
                }
                case CNPJ: {
                    if (TipoDocumentoFiscal.CNPJ.validar(this.processo.getReclamante().getNumeroDocumentoFiscal())) break;
                    throw new PropertyValueException(Mensagens.MSG0004.getChave(), this.getClass().getSimpleName(), NUMERO);
                }
            }
        }
        this.consistirDataDeAdmissao().consistirDataDeDemissao().consistirDataDeAjuizamento().consistirDataDeInicioDoCalculo().consistirDataDeTerminoDoCalculo().consistirPrescricaoQuinquenal().consistirPrescricaoFgts().consistirProcesso().consistirPontosFacultativos();
        super.validar();
        return this;
    }

    public String toString() {
        return super.toString("id", "dataCriacao", DATA_ADMISSAO, DATA_DEMISSAO, "valorUltimaRemuneracao");
    }

    public static void remover(Calculo entidade) {
        entidade.setAtivo(false);
        entidade.salvar();
    }

    @Override
    public void salvar(boolean isWebService) {
        if (this.getId() == null) {
            this.setDataCriacao(new Date());
            this.getParametrosDeAtualizacao();
            Identidade identidade = (Identidade)Identity.instance();
            this.setUsuarioCriador(identidade.getCpf());
            if (!isWebService) {
                if (Utils.nulo((Object)identidade.getSetor().getInstancia())) {
                    this.setTipoCalculo(TipoCalculoEnum.ADVOGADO);
                } else {
                    switch (identidade.getSetor().getInstancia()) {
                        case PRIMEIRA: {
                            this.setTipoCalculo(TipoCalculoEnum.VARA);
                            break;
                        }
                        case SEGUNDA: {
                            this.setTipoCalculo(TipoCalculoEnum.GABINETE);
                        }
                    }
                }
                this.setSetor(identidade.getSetor());
            }
        }
        super.salvar();
    }

    @Override
    public void salvar() {
        this.salvar(false);
    }

    @Override
    public boolean isAtachado() {
        return super.isAtachado();
    }

    public int salvarEMarcarVerbas() {
        boolean alterouDatasPadrao = false;
        boolean alteracaoDatasPadraoDevemAlterarFerias = false;
        boolean alterouPrescricaoFgts = false;
        boolean alterouRegimeDeTrabalho = false;
        boolean alteracaoDataTerminoCalculoParaDataPosteriorADemissao = false;
        boolean alterouUltimaRemuneracao = Utils.naoNulo(this.getValorUltimaRemuneracao());
        BigDecimal valorOriginalDaUltimaRemuneracao = null;
        this.validar();
        if (this.getId() != null) {
            Calculo original = (Calculo)this.restaurar();
            AnalisadorAlteracaoCalculo analisador = new AnalisadorAlteracaoCalculo(this, original);
            alterouDatasPadrao = analisador.isAlterouDatasPadrao();
            alteracaoDatasPadraoDevemAlterarFerias = analisador.isAlteracaoDatasPadraoDevemAlterarFerias();
            alterouPrescricaoFgts = analisador.isAlterouPrescricaoFgts();
            alterouRegimeDeTrabalho = analisador.isAlterouRegimeDeTrabalho();
            alteracaoDataTerminoCalculoParaDataPosteriorADemissao = analisador.isAlteracaoDataTerminoCalculoParaDataPosteriorADemissao();
            alterouUltimaRemuneracao = alterouDatasPadrao || analisador.isAlterouUltimaRemuneracao();
            valorOriginalDaUltimaRemuneracao = original.getValorUltimaRemuneracao();
            analisador.marcarVerbasParaRegeracaoDeOcorrencia();
            if (this.temSalarioFamilia() && this.getSalarioFamilia().getApurarSalarioFamilia().booleanValue() && alterouDatasPadrao) {
                this.getSalarioFamilia().sugerirPeriodo();
            }
            if (alterouDatasPadrao) {
                if (alteracaoDatasPadraoDevemAlterarFerias || alterouRegimeDeTrabalho) {
                    this.setListaDeFerias(original.getListaDeFerias());
                    this.gerarPeriodosDeFerias(false);
                }
                this.getFgts().sugerirValores();
                this.getFgts().controlarAplicacaoMultaDoFgts();
                if (Utils.naoNulo(this.getInss().getInssSobreSalariosPagos())) {
                    this.getInss().getInssSobreSalariosPagos().sugerirDatas();
                }
                if (Utils.naoNulo(this.getInss().getInssSobreSalariosDevidos())) {
                    this.getInss().getInssSobreSalariosDevidos().sugerirDatas();
                }
            } else {
                if (alterouPrescricaoFgts) {
                    this.getFgts().sugerirValores();
                    this.getFgts().controlarAplicacaoMultaDoFgts();
                }
                if (alterouRegimeDeTrabalho) {
                    this.setListaDeFerias(original.getListaDeFerias());
                    this.gerarPeriodosDeFerias(false);
                }
            }
            if (alteracaoDataTerminoCalculoParaDataPosteriorADemissao && Utils.naoNulo(this.getInss().getInssSobreSalariosDevidos())) {
                this.getInss().getInssSobreSalariosDevidos().sugerirDataTerminoCalculo();
            }
        }
        if (alterouUltimaRemuneracao) {
            try {
                this.manterHistoricoDaUltimaRemuneracao();
            }
            catch (DependenciaException de) {
                this.setValorUltimaRemuneracao(valorOriginalDaUltimaRemuneracao);
                throw de;
            }
        }
        this.salvar();
        if (alterouDatasPadrao && alteracaoDatasPadraoDevemAlterarFerias) {
            return 1;
        }
        if (alterouDatasPadrao && !alteracaoDatasPadraoDevemAlterarFerias) {
            return 2;
        }
        if (alterouPrescricaoFgts && alterouRegimeDeTrabalho) {
            return 3;
        }
        if (alterouPrescricaoFgts) {
            return 4;
        }
        if (alterouRegimeDeTrabalho) {
            return 5;
        }
        return 0;
    }

    private void manterHistoricoDaUltimaRemuneracao() {
        block12: {
            List<HistoricoSalarial> historicosDoCalculo;
            HistoricoSalarial historicoUltimaRemuneracao = null;
            if (Utils.naoNulo(this.getId()) && Utils.naoNulo(historicosDoCalculo = HistoricoSalarial.obterHistoricosDoCalculo(this)) && !historicosDoCalculo.isEmpty()) {
                for (HistoricoSalarial hs : historicosDoCalculo) {
                    if (!hs.getNome().equals(ULTIMA_REMUNERACAO)) continue;
                    historicoUltimaRemuneracao = hs;
                }
            }
            if (Utils.nulo(historicoUltimaRemuneracao)) {
                if (Utils.naoNulo(this.getValorUltimaRemuneracao())) {
                    historicoUltimaRemuneracao = new HistoricoSalarial();
                    historicoUltimaRemuneracao.setCalculo(this);
                    historicoUltimaRemuneracao.setNome(ULTIMA_REMUNERACAO);
                    historicoUltimaRemuneracao.setIncidenciaFGTS(Boolean.FALSE);
                    historicoUltimaRemuneracao.setIncidenciaINSS(Boolean.TRUE);
                    historicoUltimaRemuneracao.setAplicarProporcionalidadeFGTS(Boolean.FALSE);
                    historicoUltimaRemuneracao.setAplicarProporcionalidadeINSS(Boolean.TRUE);
                    historicoUltimaRemuneracao.setCompetenciaInicial(this.getDataAdmissao());
                    historicoUltimaRemuneracao.setCompetenciaFinal(Utils.naoNulo(this.getDataDemissao()) ? this.getDataDemissao() : this.getDataTerminoCalculo());
                    historicoUltimaRemuneracao.setTipoValor(TipoValorEnum.INFORMADO);
                    historicoUltimaRemuneracao.setSinalizacaoFGTSRecolhido(Boolean.FALSE);
                    historicoUltimaRemuneracao.setSinalizacaoINSSRecolhido(Boolean.FALSE);
                    historicoUltimaRemuneracao.setValorParaBaseDeCalculo(this.getValorUltimaRemuneracao());
                    historicoUltimaRemuneracao.gerarOcorrencias();
                    if (Utils.nulo(this.getId())) {
                        this.getHistoricosSalariais().add(historicoUltimaRemuneracao);
                    } else {
                        historicoUltimaRemuneracao.salvar();
                    }
                }
            } else if (Utils.naoNulo(this.getValorUltimaRemuneracao())) {
                historicoUltimaRemuneracao.setIncidenciaFGTS(Boolean.FALSE);
                historicoUltimaRemuneracao.setIncidenciaINSS(Boolean.TRUE);
                historicoUltimaRemuneracao.setAplicarProporcionalidadeFGTS(Boolean.FALSE);
                historicoUltimaRemuneracao.setAplicarProporcionalidadeINSS(Boolean.TRUE);
                historicoUltimaRemuneracao.removerDeOcorrencias(historicoUltimaRemuneracao.getOcorrencias(), false);
                historicoUltimaRemuneracao.setCompetenciaInicial(this.getDataAdmissao());
                historicoUltimaRemuneracao.setCompetenciaFinal(Utils.naoNulo(this.getDataDemissao()) ? this.getDataDemissao() : this.getDataTerminoCalculo());
                historicoUltimaRemuneracao.setTipoValor(TipoValorEnum.INFORMADO);
                historicoUltimaRemuneracao.setSinalizacaoFGTSRecolhido(Boolean.FALSE);
                historicoUltimaRemuneracao.setSinalizacaoINSSRecolhido(Boolean.FALSE);
                historicoUltimaRemuneracao.setValorParaBaseDeCalculo(this.getValorUltimaRemuneracao());
                historicoUltimaRemuneracao.gerarOcorrencias();
            } else {
                try {
                    HistoricoSalarial.remover(historicoUltimaRemuneracao);
                }
                catch (RuntimeException re) {
                    if (!(re instanceof DependenciaException)) break block12;
                    DependenciaException de = (DependenciaException)re;
                    for (MensagemDeRecurso mensagem : de.getMensagensDeRecurso()) {
                        mensagem.setChave(Mensagens.MSG0112);
                        mensagem.setAtributo("valorUltimaRemuneracao");
                    }
                    throw de;
                }
            }
        }
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

    public Date getDataCriacao() {
        return this.dataCriacao;
    }

    public void setDataCriacao(Date dataCriacao) {
        this.dataCriacao = dataCriacao;
    }

    public Processo getProcesso() {
        return this.processo;
    }

    public void setProcesso(Processo processo) {
        this.processo = processo;
    }

    public String getIdentificacaoDoProcesso() {
        return Utils.nulo(this.processo) ? null : this.processo.getIdentificacao();
    }

    public Date getDataAdmissao() {
        return this.dataAdmissao;
    }

    public void setDataAdmissao(Date dataAdmissao) {
        this.dataAdmissao = dataAdmissao;
    }

    public Date getDataDemissao() {
        return this.dataDemissao;
    }

    public void setDataDemissao(Date dataDemissao) {
        this.dataDemissao = dataDemissao;
    }

    public Date getDataAjuizamento() {
        return this.dataAjuizamento;
    }

    public void setDataAjuizamento(Date dataAjuizamento) {
        this.dataAjuizamento = dataAjuizamento;
    }

    public BigDecimal getValorUltimaRemuneracao() {
        return this.valorUltimaRemuneracao;
    }

    public void setValorUltimaRemuneracao(BigDecimal valorUltimaRemuneracao) {
        this.valorUltimaRemuneracao = valorUltimaRemuneracao;
    }

    public Date getDataInicioCalculo() {
        return this.dataInicioCalculo;
    }

    public void setDataInicioCalculo(Date dataInicioCalculo) {
        this.dataInicioCalculo = dataInicioCalculo;
    }

    public Date getDataTerminoCalculo() {
        return this.dataTerminoCalculo;
    }

    public Set<VerbaDeCalculo> getVerbas() {
        return Utils.naoNulo(this.verbas) ? this.verbas : (this.verbas = new LinkedHashSet<VerbaDeCalculo>());
    }

    public Date getDataDePrescricao() {
        if (Utils.nulo(this.getDataAjuizamento())) {
            return null;
        }
        return HelperDate.getInstance(this.getDataAjuizamento()).addYear(-5).getDate();
    }

    public Fgts criarFgtsSeNaoExistir(boolean flush) {
        if (Utils.nulo(this.fgts) && Utils.nulo(this.fgts = Fgts.obterPorCalculo(this))) {
            this.fgts = new Fgts(this);
            this.fgts.sugerirValores();
            this.fgts.gerarOcorrencias(false, flush);
        }
        return this.fgts;
    }

    public Fgts getFgts() {
        if (Utils.nulo(this.fgts)) {
            this.fgts = new Fgts(this);
        }
        return this.fgts;
    }

    public void setFgts(Fgts fgts) {
        this.fgts = fgts;
    }

    public Inss getInss() {
        if (Utils.nulo(this.inss)) {
            this.inss = new Inss(this);
        }
        return this.inss;
    }

    public void setInss(Inss inss) {
        this.inss = inss;
    }

    public PrevidenciaPrivada getPrevidenciaPrivada() {
        if (Utils.nulo(this.previdenciaPrivada)) {
            this.previdenciaPrivada = new PrevidenciaPrivada(this);
        }
        return this.previdenciaPrivada;
    }

    public void setPrevidenciaPrivada(PrevidenciaPrivada previdenciaPrivada) {
        this.previdenciaPrivada = previdenciaPrivada;
    }

    public PensaoAlimenticia getPensaoAlimenticiaDoCalculo() {
        PensaoAlimenticia pensaoAlimenticia = this.getPensaoAlimenticia();
        if (pensaoAlimenticia.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO)) {
            return pensaoAlimenticia;
        }
        return null;
    }

    public PensaoAlimenticia getPensaoAlimenticiaDoPagamento() {
        PensaoAlimenticia pensaoAlimenticia = this.getPensaoAlimenticia();
        if (pensaoAlimenticia.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) {
            return pensaoAlimenticia;
        }
        return null;
    }

    public PensaoAlimenticia getPensaoAlimenticia() {
        if (Utils.nulo(this.pensaoAlimenticia)) {
            this.pensaoAlimenticia = new PensaoAlimenticia(this);
        }
        return this.pensaoAlimenticia;
    }

    public void setPensaoAlimenticia(PensaoAlimenticia pensaoAlimenticia) {
        this.pensaoAlimenticia = pensaoAlimenticia;
    }

    public SeguroDesemprego getSeguroDesemprego() {
        if (Utils.nulo(this.seguroDesemprego)) {
            this.seguroDesemprego = new SeguroDesemprego(this);
        }
        return this.seguroDesemprego;
    }

    public void setSeguroDesemprego(SeguroDesemprego seguroDesemprego) {
        this.seguroDesemprego = seguroDesemprego;
    }

    public int obterFaltasNaoJustificadas(Periodo periodo) {
        if (Utils.nulo(periodo) || !Utils.naoNulos(periodo.getInicial(), periodo.getFinal()) || Utils.nulo(this.getFaltas())) {
            return 0;
        }
        int qtdeFaltasNaoJustificadas = 0;
        for (Falta falta : Falta.obterTodosPor(this)) {
            if (falta.getFaltaJustificada().booleanValue()) continue;
            qtdeFaltasNaoJustificadas += falta.getPeriodoDaExcecao().totalDeDiasCoincidentesComEste(periodo);
        }
        return qtdeFaltasNaoJustificadas;
    }

    public List<Periodo> obterPeriodosDeFaltasNaoJustificadas(Periodo periodo) {
        ArrayList<Periodo> periodosDeFaltasNaoJustificadas = new ArrayList<Periodo>();
        if (Utils.nulo(periodo) || !Utils.naoNulos(periodo.getInicial(), periodo.getFinal()) || Utils.nulo(this.getFaltas())) {
            return periodosDeFaltasNaoJustificadas;
        }
        for (Falta falta : this.getFaltas()) {
            Periodo interseccao;
            if (falta.getFaltaJustificada().booleanValue() || (interseccao = falta.getPeriodoDaExcecao().interseccao(periodo)) == null) continue;
            periodosDeFaltasNaoJustificadas.add(interseccao);
        }
        return periodosDeFaltasNaoJustificadas;
    }

    public int obterFaltasJustificadas(Periodo periodo) {
        if (Utils.nulo(periodo) || !Utils.naoNulos(periodo.getInicial(), periodo.getFinal()) || Utils.nulo(this.getFaltas())) {
            return 0;
        }
        int qtdeFaltasJustificadas = 0;
        for (Falta falta : this.getFaltas()) {
            if (!falta.getFaltaJustificada().booleanValue()) continue;
            qtdeFaltasJustificadas += falta.getPeriodoDaExcecao().totalDeDiasCoincidentesComEste(periodo);
        }
        return qtdeFaltasJustificadas;
    }

    public List<Periodo> obterPeriodosDeFaltasJustificadas(Periodo periodo) {
        ArrayList<Periodo> periodosDeFaltasJustificadas = new ArrayList<Periodo>();
        if (Utils.nulo(periodo) || !Utils.naoNulos(periodo.getInicial(), periodo.getFinal()) || Utils.nulo(this.getFaltas())) {
            return periodosDeFaltasJustificadas;
        }
        for (Falta falta : this.getFaltas()) {
            Periodo interseccao;
            if (!falta.getFaltaJustificada().booleanValue() || (interseccao = falta.getPeriodoDaExcecao().interseccao(periodo)) == null) continue;
            periodosDeFaltasJustificadas.add(interseccao);
        }
        return periodosDeFaltasJustificadas;
    }

    public int obterDiasFerias(Periodo periodo) {
        if (Utils.nulo(periodo) || !Utils.naoNulos(periodo.getInicial(), periodo.getFinal()) || Utils.nulo(this.getListaDeFerias())) {
            return 0;
        }
        int qtdeDiasFerias = 0;
        Calculo calculoSecure = LazyloadSecure.protect(this).from(this.getListaDeFerias());
        for (Ferias ferias : calculoSecure.getListaDeFerias()) {
            if (Utils.naoNulos(ferias.getDataInicialDoPeriodoDeGozo1(), ferias.getDataFinalDoPeriodoDeGozo1())) {
                qtdeDiasFerias += ferias.getPeriodoDeGozo1().totalDeDiasCoincidentesComEste(periodo);
            }
            if (Utils.naoNulos(ferias.getDataInicialDoPeriodoDeGozo2(), ferias.getDataFinalDoPeriodoDeGozo2())) {
                qtdeDiasFerias += ferias.getPeriodoDeGozo2().totalDeDiasCoincidentesComEste(periodo);
            }
            if (!Utils.naoNulos(ferias.getDataInicialDoPeriodoDeGozo3(), ferias.getDataFinalDoPeriodoDeGozo3())) continue;
            qtdeDiasFerias += ferias.getPeriodoDeGozo3().totalDeDiasCoincidentesComEste(periodo);
        }
        return qtdeDiasFerias;
    }

    public List<Periodo> obterPeriodosDeFeriasGozadas(Periodo periodo) {
        ArrayList<Periodo> periodosDeFeriasGozadas = new ArrayList<Periodo>();
        if (Utils.nulo(periodo) || !Utils.naoNulos(periodo.getInicial(), periodo.getFinal()) || Utils.nulo(this.getListaDeFerias())) {
            return periodosDeFeriasGozadas;
        }
        Calculo calculoSecure = LazyloadSecure.protect(this).from(this.getListaDeFerias());
        for (Ferias ferias : calculoSecure.getListaDeFerias()) {
            Periodo interseccao;
            if (Utils.naoNulos(ferias.getDataInicialDoPeriodoDeGozo1(), ferias.getDataFinalDoPeriodoDeGozo1()) && (interseccao = ferias.getPeriodoDeGozo1().interseccao(periodo)) != null) {
                periodosDeFeriasGozadas.add(interseccao);
            }
            if (Utils.naoNulos(ferias.getDataInicialDoPeriodoDeGozo2(), ferias.getDataFinalDoPeriodoDeGozo2()) && (interseccao = ferias.getPeriodoDeGozo2().interseccao(periodo)) != null) {
                periodosDeFeriasGozadas.add(interseccao);
            }
            if (!Utils.naoNulos(ferias.getDataInicialDoPeriodoDeGozo3(), ferias.getDataFinalDoPeriodoDeGozo3()) || (interseccao = ferias.getPeriodoDeGozo3().interseccao(periodo)) == null) continue;
            periodosDeFeriasGozadas.add(interseccao);
        }
        return periodosDeFeriasGozadas;
    }

    public List<VerbaDeCalculo> getVerbasAtivas() {
        return VerbaDeCalculo.obterVerbasAtivasDoCalculo(this);
    }

    public List<VerbaDeCalculo> getVerbasComumMensalEDesligamento() {
        return VerbaDeCalculo.obterVerbasComumMensalEDesligamento(this);
    }

    public List<VerbaDeCalculo> getVerbasParaLiquidacao() {
        ArrayList<VerbaDeCalculo> lista = new ArrayList<VerbaDeCalculo>();
        for (Principal principal : VerbaDeCalculo.obterVerbasPrincipaisDo(this)) {
            lista.add(principal);
            for (Reflexo reflexo : principal.getReflexos()) {
                if (!reflexo.getAtivo().booleanValue()) continue;
                lista.add(reflexo);
            }
        }
        return lista;
    }

    public Calculo adicionar(VerbaDeCalculo verba) {
        if (Utils.naoNulo(verba)) {
            this.getVerbas().add(verba.paraO(this));
        }
        return this;
    }

    public Calculo adicionarVerbas(List<VerbaParaCalculo> verbasParaCalculo) {
        ArrayList<VerbaDeCalculo> copias = new ArrayList<VerbaDeCalculo>();
        if (Utils.naoNulo(verbasParaCalculo)) {
            for (VerbaParaCalculo verbaParaCalculo : verbasParaCalculo) {
                if (!verbaParaCalculo.getSelecionada().booleanValue()) continue;
                Principal copiaDaPrincipal = VerbaDeCalculo.converterParaPrincipal(this, verbaParaCalculo.getVerba());
                copiaDaPrincipal.setOrigemExpressa(true);
                copias.add(0, copiaDaPrincipal);
                for (Reflexo copiaDoReflexo : copiaDaPrincipal.getReflexos()) {
                    copiaDoReflexo.setOrigemExpressa(true);
                    copias.add(copiaDoReflexo);
                }
            }
        }
        if (copias.isEmpty()) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0015, " Verba do tipo Principal"));
        }
        try {
            Calculo.getRepositorio(RepositorioDeCalculo.class).adicionarEmVerbas(copias);
        }
        catch (RuntimeException e) {
            this.getVerbas().removeAll(copias);
            throw e;
        }
        return this;
    }

    public void setVerbas(Set<VerbaDeCalculo> verbas) {
        this.verbas = verbas;
    }

    public void setDataTerminoCalculo(Date dataTerminoCalculo) {
        this.dataTerminoCalculo = dataTerminoCalculo;
    }

    public Municipio getMunicipio() {
        return this.municipio;
    }

    public void setMunicipio(Municipio municipio) {
        this.municipio = municipio;
    }

    public Boolean getSabadoDiaUtil() {
        return this.sabadoDiaUtil;
    }

    public void setSabadoDiaUtil(Boolean sabadoDiaUtil) {
        this.sabadoDiaUtil = sabadoDiaUtil;
    }

    public boolean isPrazoAvisoCalculado() {
        return TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_CALCULADA == this.getApuracaoPrazoDoAvisoPrevio();
    }

    public boolean isPrazoAvisoInfo() {
        return TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_INFORMADA == this.getApuracaoPrazoDoAvisoPrevio();
    }

    public Boolean getProjetaAvisoIndenizado() {
        return this.projetaAvisoIndenizado;
    }

    public void setProjetaAvisoIndenizado(Boolean projetaAvisoIndenizado) {
        this.projetaAvisoIndenizado = projetaAvisoIndenizado;
    }

    public Boolean getConsideraFeriadoEstadual() {
        return this.consideraFeriadoEstadual;
    }

    public void setConsideraFeriadoEstadual(Boolean consideraFeriadoEstadual) {
        this.consideraFeriadoEstadual = consideraFeriadoEstadual;
    }

    public Boolean getPrescricaoFgts() {
        return this.prescricaoFgts;
    }

    public void setPrescricaoFgts(Boolean prescricaoFgts) {
        this.prescricaoFgts = prescricaoFgts;
    }

    public Boolean getPrescricaoQuinquenal() {
        return this.prescricaoQuinquenal;
    }

    public void setPrescricaoQuinquenal(Boolean prescricaoQuinquenal) {
        this.prescricaoQuinquenal = prescricaoQuinquenal;
    }

    public Boolean getZeraValorNegativo() {
        return this.zeraValorNegativo;
    }

    public void setZeraValorNegativo(Boolean zeraValorNegativo) {
        this.zeraValorNegativo = zeraValorNegativo;
    }

    public Boolean getConsideraFeriadoMunicipal() {
        return this.consideraFeriadoMunicipal;
    }

    public void setConsideraFeriadoMunicipal(Boolean consideraFeriadoMunicipal) {
        this.consideraFeriadoMunicipal = consideraFeriadoMunicipal;
    }

    public TipoCalculoEnum getTipoCalculo() {
        return this.tipoCalculo;
    }

    public void setTipoCalculo(TipoCalculoEnum tipoCalculo) {
        this.tipoCalculo = tipoCalculo;
    }

    public BigDecimal getValorCargaHorariaPadrao() {
        return this.valorCargaHorariaPadrao;
    }

    public BigDecimal getValorCargaHoraria(Periodo periodo) {
        int totalDiasValorPadrao = periodo.totalDeDias();
        BigDecimal valorCargaHoraria = BigDecimal.ZERO;
        for (ExcecaoDaCargaHorariaDoCalculo excecao : this.getExcecoesDaCargaHoraria()) {
            int totalDiasCoincidentes = excecao.getPeriodoDaExcecao().totalDeDiasCoincidentesComEste(periodo);
            if (totalDiasCoincidentes == 0) continue;
            totalDiasValorPadrao -= totalDiasCoincidentes;
            BigDecimal parcela = excecao.getValorCargaHoraria().multiply(new BigDecimal(totalDiasCoincidentes), Utils.CONTEXTO_MATEMATICO);
            valorCargaHoraria = valorCargaHoraria.add(parcela, Utils.CONTEXTO_MATEMATICO);
        }
        if (totalDiasValorPadrao != 0) {
            BigDecimal parcela = this.getValorCargaHorariaPadrao().multiply(new BigDecimal(totalDiasValorPadrao), Utils.CONTEXTO_MATEMATICO);
            valorCargaHoraria = valorCargaHoraria.add(parcela, Utils.CONTEXTO_MATEMATICO);
        }
        valorCargaHoraria = valorCargaHoraria.divide(new BigDecimal(periodo.totalDeDias()), Utils.CONTEXTO_MATEMATICO);
        return Utils.arredondarValor(valorCargaHoraria, 2);
    }

    public void setValorCargaHorariaPadrao(BigDecimal valorCargaHorariaPadrao) {
        this.valorCargaHorariaPadrao = valorCargaHorariaPadrao;
    }

    public Date getDataDeLiquidacao() {
        return this.dataDeLiquidacao;
    }

    public void setDataDeLiquidacao(Date dataDeLiquidacao) {
        this.dataDeLiquidacao = dataDeLiquidacao;
    }

    @Transient
    public Date getDiaSeguinteADataDeLiquidacao() {
        if (this.dataDeLiquidacao != null) {
            return HelperDate.getInstance(this.dataDeLiquidacao).addDay(1).getDate();
        }
        return null;
    }

    public Set<ApuracaoDiariaCartao> getApuracoesDiariasCartaoDePonto() {
        return Utils.naoNulo(this.apuracoesDiariasCartaoDePonto) ? this.apuracoesDiariasCartaoDePonto : (this.apuracoesDiariasCartaoDePonto = new LinkedHashSet<ApuracaoDiariaCartao>());
    }

    public void setApuracoesDiariasCartaoDePonto(Set<ApuracaoDiariaCartao> apuracoesDiariasCartaoDePonto) {
        this.apuracoesDiariasCartaoDePonto = apuracoesDiariasCartaoDePonto;
    }

    public Set<ApuracaoCartaoDePonto> getApuracoesCartaoDePonto() {
        return Utils.naoNulo(this.apuracoesCartaoDePonto) ? this.apuracoesCartaoDePonto : (this.apuracoesCartaoDePonto = new LinkedHashSet<ApuracaoCartaoDePonto>());
    }

    public void setApuracoesCartaoDePonto(Set<ApuracaoCartaoDePonto> apuracoesCartaoDePonto) {
        this.apuracoesCartaoDePonto = apuracoesCartaoDePonto;
    }

    public Set<HistoricoSalarial> getHistoricosSalariais() {
        return Utils.naoNulo(this.historicosSalariais) ? this.historicosSalariais : (this.historicosSalariais = new LinkedHashSet<HistoricoSalarial>());
    }

    public void setHistoricosSalariais(Set<HistoricoSalarial> historicosSalariais) {
        this.historicosSalariais = historicosSalariais;
    }

    public Set<ExcecaoDaCargaHorariaDoCalculo> getExcecoesDaCargaHoraria() {
        return this.excecoesDaCargaHoraria;
    }

    public void setExcecoesDaCargaHoraria(Set<ExcecaoDaCargaHorariaDoCalculo> excecoesDaCargaHoraria) {
        this.excecoesDaCargaHoraria = excecoesDaCargaHoraria;
    }

    public Set<ExcecaoDoSabadoDoCalculo> getExcecoesDoSabado() {
        return this.excecoesDoSabado;
    }

    public void setExcecoesDoSabado(Set<ExcecaoDoSabadoDoCalculo> excecoesDoSabado) {
        this.excecoesDoSabado = excecoesDoSabado;
    }

    public Integer getDiaFechamentoMes() {
        return this.diaFechamentoMes;
    }

    public void setDiaFechamentoMes(Integer diaFechamentoMes) {
        this.diaFechamentoMes = diaFechamentoMes;
    }

    public Set<ExcecaoDoFechamentoDeCartaoDePonto> getExcecoesDoFechamentoDeCartaoDePonto() {
        return this.excecoesDoFechamentoDeCartaoDePonto;
    }

    public void setExcecoesDoFechamentoDeCartaoDePonto(Set<ExcecaoDoFechamentoDeCartaoDePonto> excecoesDoFechamentoDeCartaoDePonto) {
        this.excecoesDoFechamentoDeCartaoDePonto = excecoesDoFechamentoDeCartaoDePonto;
    }

    public Set<Falta> getFaltas() {
        return this.faltas;
    }

    public void setFaltas(Set<Falta> faltas) {
        this.faltas = faltas;
    }

    public IndiceMonetarioEnum getAtualizacaoMonetaria() {
        return this.getParametrosDeAtualizacao().getIndiceTrabalhista();
    }

    public IndicesAcumuladosEnum getIndicesAcumulados() {
        return this.indicesAcumulados;
    }

    public String getComentarios() {
        return this.comentarios;
    }

    public void setComentarios(String comentarios) {
        this.comentarios = comentarios;
    }

    public void setIndicesAcumulados(IndicesAcumuladosEnum indicesAcumulados) {
        this.indicesAcumulados = indicesAcumulados;
    }

    public static List<Calculo> obterTodos() {
        return Calculo.obterTodos(RepositorioDeCalculo.class);
    }

    public void substituirVerba(VerbaDeCalculo substituida, VerbaDeCalculo substituta) {
        Calculo.getRepositorio(RepositorioDeCalculo.class).substituirVerba(this, substituida, substituta);
    }

    public void removerDeVerbas(VerbaDeCalculo verbaDeCalculo, boolean flush) {
        Calculo.getRepositorio(RepositorioDeCalculo.class).removerDeVerbas(this, verbaDeCalculo, flush);
    }

    public void removerDeHistoricoSalarial(HistoricoSalarial historicoSalarial, boolean flush) {
        Calculo.getRepositorio(RepositorioDeCalculo.class).removerDeHistoricoSalarial(this, historicoSalarial, flush);
    }

    public void removerDeHonorarios(VerbaDeCalculo verbaDeCalculo) {
        Calculo.getRepositorio(RepositorioDeHonorario.class).removerVerbasNaoCompoemPrincipalAPartirDaVerba(verbaDeCalculo);
    }

    public int obterQuantidadeAdicionalAvisoPrevio() {
        if (this.isPrazoAvisoCalculado()) {
            Periodo periodoCalculo = new Periodo(this.getDataAdmissao(), this.getDataDemissao());
            CalculoDaQuantidadeApuradaDoPrazoAvisoPrevio avisoPrevio = new CalculoDaQuantidadeApuradaDoPrazoAvisoPrevio(periodoCalculo);
            avisoPrevio.executar();
            return avisoPrevio.getQuantidade();
        }
        if (this.isPrazoAvisoInfo()) {
            return this.getPrazoAvisoInformado();
        }
        return Constantes.QUANTIDADE_PADRAO_AVISO_PREVIO.intValue();
    }

    public void liquidar() {
        this.zerarOrdem();
        StringBuilder verbasComErro = new StringBuilder();
        for (VerbaDeCalculo verbaDeCalculo : this.getVerbas()) {
            FormulaInformada formula;
            if (!(verbaDeCalculo.getFormula() instanceof FormulaInformada) || (formula = (FormulaInformada)verbaDeCalculo.getFormula()).getConstante().getValor() != null) continue;
            verbasComErro.append(verbaDeCalculo.getNome() + ",");
        }
        if (verbasComErro.length() > 0) {
            verbasComErro.deleteCharAt(verbasComErro.length() - 1);
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0019, verbasComErro.toString()));
        }
        this.validarDisponibilidadeDaMaiorRemuneracaoNaLiquidacao();
        this.validarDisponibilidadeDaUltimaRemuneracaoNaLiquidacao();
        this.validarUsoCorretoDoHistoricoSalarial();
        this.validarVerbaPossuiQuantidade();
        for (VerbaDeCalculo verbaDeCalculo : this.getVerbas()) {
            verbaDeCalculo.setLiquidado(false);
        }
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(this.getAtualizacaoMonetaria(), this.getIndicesAcumulados(), null, this.getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetariaTrabalhista.setOrigemCalculo(Boolean.TRUE);
        tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(HelperDate.getCurrentCompetence(this.getDataAdmissao()).getDate(), this.getDataDeLiquidacao()));
        this.getParametrosDeAtualizacao().setInformacaoUltimoIndice(ParametrosDeAtualizacaoUtils.gerarMensagemDeUltimoIndice(this.getParametrosDeAtualizacao(), this.getDataDeLiquidacao()));
        for (VerbaDeCalculo verba : this.getVerbas()) {
            if (!verba.getAtivo().booleanValue() || verba.isLiquidado()) continue;
            verba.setTabelaDeCorrecaoMonetariaTrabalhista(tabelaDeCorrecaoMonetariaTrabalhista);
            verba.liquidar();
        }
        this.getSalarioFamilia().liquidar();
        this.getSeguroDesemprego().liquidar();
        this.criarFgtsSeNaoExistir(false).liquidar();
        this.getInss().liquidar(this.getDataDeLiquidacao());
        this.getPrevidenciaPrivada().liquidar();
        this.calcularJuros();
        PensaoAlimenticia pensaoAlimenticia = this.getPensaoAlimenticiaDoCalculo();
        if (pensaoAlimenticia != null) {
            pensaoAlimenticia.liquidar();
        }
        for (Multa multa : this.getMultasDoCalculo()) {
            multa.liquidar();
        }
        for (Honorario honorario : this.getHonorariosDoCalculo()) {
            honorario.liquidar();
        }
        this.getIrpf().liquidar();
        this.getCustasJudiciais().liquidar();
        this.salvar();
        Calculo calculo = this;
        Long l = calculo.versao;
        Long l2 = calculo.versao = Long.valueOf(calculo.versao + 1L);
        this.setHashCodeLiquidacao(this.calcularHashCodeDaLiquidacao());
    }

    private BigDecimal calcularTaxaDeJuros(Date data, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData) {
        return this.calcularTaxaDeJuros(data, null, jurosDoAjuizamento, projetarData, false);
    }

    private BigDecimal calcularTaxaDeJuros(Date data, Date dataFimVencimentoOcorrencia, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData) {
        return this.calcularTaxaDeJuros(data, dataFimVencimentoOcorrencia, jurosDoAjuizamento, projetarData, false);
    }

    private BigDecimal calcularTaxaDeJuros(Date data, Date dataFimVencimentoOcorrencia, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData, boolean isMultaHonorario) {
        if (Utils.nulo(this.tabelaDeJuros)) {
            this.tabelaDeJuros = new TabelaDeJurosDoCalculo(this);
        }
        return this.tabelaDeJuros.calcularTaxaDeJuros(data, dataFimVencimentoOcorrencia, jurosDoAjuizamento, projetarData, isMultaHonorario);
    }

    public void limparJuros() {
        if (Utils.naoNulo(this.getFgts())) {
            this.getFgts().limparJuros();
        }
        if (Utils.naoNulo(this.getInss())) {
            this.getInss().limparJuros();
        }
        if (Utils.naoNulo(this.getPrevidenciaPrivada())) {
            this.getPrevidenciaPrivada().limparJuros();
        }
        if (Utils.naoNulo(this.getSalarioFamilia())) {
            this.getSalarioFamilia().limparJuros();
        }
        if (Utils.naoNulo(this.getSeguroDesemprego())) {
            this.getSeguroDesemprego().limparJuros();
        }
        if (Utils.naoNulo(this.getApuracoesDeJuros())) {
            for (ApuracaoDeJuros apuracaoDeJuros : this.getApuracoesDeJuros()) {
                apuracaoDeJuros.remover();
            }
            this.getApuracoesDeJuros().clear();
        }
        if (Utils.naoNulo(this.getMultasDoCalculo())) {
            for (Multa multa : this.getMultasDoCalculo()) {
                multa.setTaxaJurosMulta(null);
            }
        }
        if (Utils.naoNulo(this.getHonorariosDoCalculo())) {
            for (Honorario honorario : this.getHonorariosDoCalculo()) {
                honorario.setTaxaJurosHonorario(null);
            }
        }
        if (Utils.naoNulo(this.getCustasJudiciais())) {
            this.getCustasJudiciais().setTaxaJurosCustasConhecimentoReclamante(null);
            this.getCustasJudiciais().setTaxaJurosCustasLiquidacao(null);
            this.getCustasJudiciais().setTaxaJurosCustasFixas(null);
            if (Utils.naoNulo(this.getCustasJudiciais().getAutosJudiciaisDoCalculo())) {
                for (AutoJudicial auto : this.getCustasJudiciais().getAutosJudiciaisDoCalculo()) {
                    auto.setTaxaJuros(null);
                }
            }
            if (Utils.naoNulo(this.getCustasJudiciais().getArmazenamentosDoCalculo())) {
                for (Armazenamento armazenamento : this.getCustasJudiciais().getArmazenamentosDoCalculo()) {
                    armazenamento.setTaxaJuros(null);
                }
            }
            if (Utils.naoNulo(this.getCustasJudiciais().getCustasPagasDoReclamante())) {
                for (CustaPaga custaPaga : this.getCustasJudiciais().getCustasPagasDoReclamante()) {
                    custaPaga.setTaxaJuros(null);
                }
            }
            if (Utils.naoNulo(this.getCustasJudiciais().getCustasPagasDoReclamado())) {
                for (CustaPaga custaPaga : this.getCustasJudiciais().getCustasPagasDoReclamado()) {
                    custaPaga.setTaxaJuros(null);
                }
            }
        }
    }

    private void calcularJuros() {
        this.limparJuros();
        this.totalDaApuracaoDeJuros = null;
        if (this.getParametrosDeAtualizacao().isJurosHabilitado()) {
            this.calcularQuandoJurosHabilitado();
        } else {
            this.calcularQuandoJurosNaoHabilitado();
        }
    }

    private void calcularQuandoJurosNaoHabilitado() {
        if (this.getParametrosDeAtualizacao().getJurosTrabalhistasDosSalariosDevidosDoINSS().booleanValue() || this.getParametrosDeAtualizacao().getJurosPrevidenciariosDosSalariosDevidosDoINSS().booleanValue() || this.getParametrosDeAtualizacao().getLei11941().booleanValue()) {
            this.getInss().calcularJurosDosSalariosDevidos();
        }
        if (this.getParametrosDeAtualizacao().getJurosTrabalhistasDosSalariosPagosDoINSS().booleanValue() || this.getParametrosDeAtualizacao().getJurosPrevidenciariosDosSalariosPagosDoINSS().booleanValue() || this.getParametrosDeAtualizacao().getLei11941Pago().booleanValue()) {
            this.getInss().calcularJurosDosSalariosPagos();
        }
    }

    private void calcularQuandoJurosHabilitado() {
        BigDecimal taxaDeJuros;
        Date dataParaAplicarJuros;
        if (this.getParametrosDeAtualizacao().getJurosDePrevidenciaPrivada().booleanValue()) {
            this.getPrevidenciaPrivada().calcularJuros();
        }
        this.getFgts().calcularJuros();
        this.calcularQuandoJurosNaoHabilitado();
        if (Utils.naoNulo(this.getVerbasAtivas()) && !this.getVerbasAtivas().isEmpty()) {
            this.apurarJurosDasVerbas();
        }
        this.getSalarioFamilia().calcularJuros();
        this.getSeguroDesemprego().calcularJuros();
        for (Multa multa : this.getMultasDoCalculo()) {
            if (!TipoValorEnum.INFORMADO.equals((Object)multa.getTipoValorDaMulta()) || !multa.getAplicarJurosSobreMulta().booleanValue()) {
                multa.setTaxaJurosMulta(null);
                continue;
            }
            if (Utils.naoNulo(multa.getDataVencimentoMulta())) {
                dataParaAplicarJuros = multa.getDataApartirDeAplicarJuros() != null ? multa.getDataApartirDeAplicarJuros() : HelperDate.getInstance(multa.getDataVencimentoMulta()).addDay(1).getDate();
                taxaDeJuros = this.calcularTaxaDeJuros(dataParaAplicarJuros, null, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
                multa.setTaxaJurosMulta(taxaDeJuros);
                continue;
            }
            multa.setTaxaJurosMulta(null);
        }
        for (Honorario honorario : this.getHonorariosDoCalculo()) {
            if (!TipoValorEnum.INFORMADO.equals((Object)honorario.getTipoValor()) || !honorario.getAplicarJuros().booleanValue()) {
                honorario.setTaxaJurosHonorario(null);
                continue;
            }
            if (Utils.naoNulo(honorario.getDataVencimento())) {
                this.tabelaDeJuros = null;
                dataParaAplicarJuros = honorario.getDataApartirDeAplicarJuros() != null ? honorario.getDataApartirDeAplicarJuros() : HelperDate.getInstance(honorario.getDataVencimento()).addDay(1).getDate();
                taxaDeJuros = this.calcularTaxaDeJuros(dataParaAplicarJuros, null, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
                honorario.setTaxaJurosHonorario(taxaDeJuros);
                continue;
            }
            honorario.setTaxaJurosHonorario(null);
        }
        this.calcularTaxaJurosCustas();
    }

    private void calcularTaxaJurosCustas() {
        if (this.getParametrosDeAtualizacao().getJurosDeCustas().booleanValue()) {
            BigDecimal taxaDeJuros;
            BigDecimal taxaDeJuros2;
            if (Utils.naoNulo(this.getCustasJudiciais().getDataVencimentoConhecimentoDoReclamante()) && HelperDate.dateBefore(this.getCustasJudiciais().getDataVencimentoConhecimentoDoReclamante(), this.getDataDeLiquidacao())) {
                taxaDeJuros2 = this.calcularTaxaDeJuros(this.getCustasJudiciais().getDataVencimentoConhecimentoDoReclamante(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
                this.getCustasJudiciais().setTaxaJurosCustasConhecimentoReclamante(taxaDeJuros2);
            } else if (Utils.naoNulo(this.getCustasJudiciais().getDataVencimentoConhecimentoDoReclamante())) {
                this.getCustasJudiciais().setTaxaJurosCustasConhecimentoReclamante(BigDecimal.ZERO);
            } else {
                this.getCustasJudiciais().setTaxaJurosCustasConhecimentoReclamante(null);
            }
            if (Utils.naoNulo(this.getCustasJudiciais().getDataVencimentoConhecimentoDoReclamado()) && HelperDate.dateBefore(this.getCustasJudiciais().getDataVencimentoConhecimentoDoReclamado(), this.getDataDeLiquidacao())) {
                taxaDeJuros2 = this.calcularTaxaDeJuros(this.getCustasJudiciais().getDataVencimentoConhecimentoDoReclamado(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
                this.getCustasJudiciais().setTaxaJurosCustasConhecimentoReclamado(taxaDeJuros2);
            } else if (Utils.naoNulo(this.getCustasJudiciais().getDataVencimentoConhecimentoDoReclamado())) {
                this.getCustasJudiciais().setTaxaJurosCustasConhecimentoReclamado(BigDecimal.ZERO);
            } else {
                this.getCustasJudiciais().setTaxaJurosCustasConhecimentoReclamado(null);
            }
            if (Utils.naoNulo(this.getCustasJudiciais().getDataVencimentoCustasDeLiquidacao()) && HelperDate.dateBefore(this.getCustasJudiciais().getDataVencimentoCustasDeLiquidacao(), this.getDataDeLiquidacao())) {
                taxaDeJuros2 = this.calcularTaxaDeJuros(this.getCustasJudiciais().getDataVencimentoCustasDeLiquidacao(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
                this.getCustasJudiciais().setTaxaJurosCustasLiquidacao(taxaDeJuros2);
            } else if (Utils.naoNulo(this.getCustasJudiciais().getDataVencimentoCustasDeLiquidacao())) {
                this.getCustasJudiciais().setTaxaJurosCustasLiquidacao(BigDecimal.ZERO);
            } else {
                this.getCustasJudiciais().setTaxaJurosCustasLiquidacao(null);
            }
            if (Utils.naoNulo(this.getCustasJudiciais().getDataVencimentoCustasFixas()) && HelperDate.dateBefore(this.getCustasJudiciais().getDataVencimentoCustasFixas(), this.getDataDeLiquidacao())) {
                taxaDeJuros2 = this.calcularTaxaDeJuros(this.getCustasJudiciais().getDataVencimentoCustasFixas(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
                this.getCustasJudiciais().setTaxaJurosCustasFixas(taxaDeJuros2);
            } else if (Utils.naoNulo(this.getCustasJudiciais().getDataVencimentoCustasFixas())) {
                this.getCustasJudiciais().setTaxaJurosCustasFixas(BigDecimal.ZERO);
            } else {
                this.getCustasJudiciais().setTaxaJurosCustasFixas(null);
            }
            for (AutoJudicial auto : this.getCustasJudiciais().getAutosJudiciaisDoCalculo()) {
                if (Utils.naoNulo(auto.getDataVencimentoAuto()) && HelperDate.dateBefore(auto.getDataVencimentoAuto(), this.getDataDeLiquidacao())) {
                    taxaDeJuros = this.calcularTaxaDeJuros(auto.getDataVencimentoAuto(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
                    auto.setTaxaJuros(taxaDeJuros);
                    continue;
                }
                if (Utils.naoNulo(auto.getDataVencimentoAuto())) {
                    auto.setTaxaJuros(BigDecimal.ZERO);
                    continue;
                }
                auto.setTaxaJuros(null);
            }
            for (Armazenamento armazenamento : this.getCustasJudiciais().getArmazenamentosDoCalculo()) {
                if (Utils.naoNulo(armazenamento.getDataTerminoArmazenamento()) && HelperDate.dateBefore(armazenamento.getDataTerminoArmazenamento(), this.getDataDeLiquidacao())) {
                    taxaDeJuros = this.calcularTaxaDeJuros(armazenamento.getDataTerminoArmazenamento(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
                    armazenamento.setTaxaJuros(taxaDeJuros);
                    continue;
                }
                if (Utils.naoNulo(armazenamento.getDataTerminoArmazenamento())) {
                    armazenamento.setTaxaJuros(BigDecimal.ZERO);
                    continue;
                }
                armazenamento.setTaxaJuros(null);
            }
            for (CustaPaga custaPaga : this.getCustasJudiciais().getCustasPagasDoReclamante()) {
                if (Utils.naoNulo(custaPaga.getDataVencimento()) && HelperDate.dateBefore(custaPaga.getDataVencimento(), this.getDataDeLiquidacao())) {
                    taxaDeJuros = this.calcularTaxaDeJuros(custaPaga.getDataVencimento(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
                    custaPaga.setTaxaJuros(taxaDeJuros);
                    continue;
                }
                if (Utils.naoNulo(custaPaga.getDataVencimento())) {
                    custaPaga.setTaxaJuros(BigDecimal.ZERO);
                    continue;
                }
                custaPaga.setTaxaJuros(null);
            }
            for (CustaPaga custaPaga : this.getCustasJudiciais().getCustasPagasDoReclamado()) {
                if (Utils.naoNulo(custaPaga.getDataVencimento()) && HelperDate.dateBefore(custaPaga.getDataVencimento(), this.getDataDeLiquidacao())) {
                    taxaDeJuros = this.calcularTaxaDeJuros(custaPaga.getDataVencimento(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
                    custaPaga.setTaxaJuros(taxaDeJuros);
                    continue;
                }
                if (Utils.naoNulo(custaPaga.getDataVencimento())) {
                    custaPaga.setTaxaJuros(BigDecimal.ZERO);
                    continue;
                }
                custaPaga.setTaxaJuros(null);
            }
        } else {
            this.nularJurosDeCustas();
        }
    }

    private void nularJurosDeCustas() {
        this.getCustasJudiciais().setTaxaJurosCustasConhecimentoReclamante(null);
        this.getCustasJudiciais().setTaxaJurosCustasConhecimentoReclamado(null);
        this.getCustasJudiciais().setTaxaJurosCustasLiquidacao(null);
        this.getCustasJudiciais().setTaxaJurosCustasFixas(null);
        for (AutoJudicial auto : this.getCustasJudiciais().getAutosJudiciaisDoCalculo()) {
            auto.setTaxaJuros(null);
        }
        for (Armazenamento armazenamento : this.getCustasJudiciais().getArmazenamentosDoCalculo()) {
            armazenamento.setTaxaJuros(null);
        }
        for (CustaPaga custaPaga : this.getCustasJudiciais().getCustasPagasDoReclamante()) {
            custaPaga.setTaxaJuros(null);
        }
        for (CustaPaga custaPaga : this.getCustasJudiciais().getCustasPagasDoReclamado()) {
            custaPaga.setTaxaJuros(null);
        }
    }

    private void apurarJurosDasVerbas() {
        this.tabelaDeJuros = null;
        HashMap<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro = new HashMap<Competencia, BigDecimal>();
        HashMap<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocial = new HashMap<Competencia, BigDecimal>();
        HashMap<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaPrevidenciaPrivada = new HashMap<Competencia, BigDecimal>();
        HashMap<Competencia, Set<ApuracaoDeJuros>> mapApuracoesPorCompetencia = new HashMap<Competencia, Set<ApuracaoDeJuros>>();
        LinkedHashMap<CompetenciaDeJuros, ApuracaoDeJuros> mapOcorrenciasDeJuros = new LinkedHashMap<CompetenciaDeJuros, ApuracaoDeJuros>();
        for (VerbaDeCalculo verbaDeCalculo : this.getVerbasAtivas()) {
            if (!LogicoEnum.SIM.equals((Object)verbaDeCalculo.getComporPrincipal())) continue;
            for (OcorrenciaDeVerba ocorrencia : verbaDeCalculo.getOcorrenciasAtivas()) {
                this.apurarJurosDasVerbasOperacoes(mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro, mapValorTotalPorCompetenciaParaContribuicaoSocial, mapValorTotalPorCompetenciaParaPrevidenciaPrivada, mapApuracoesPorCompetencia, mapOcorrenciasDeJuros, verbaDeCalculo, ocorrencia);
            }
        }
        if (BaseDeJurosDasVerbasEnum.VERBA_INSS.equals((Object)this.getParametrosDeAtualizacao().getBaseDeJurosDasVerbas()) || BaseDeJurosDasVerbasEnum.VERBA_INSS_PP.equals((Object)this.getParametrosDeAtualizacao().getBaseDeJurosDasVerbas())) {
            for (OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDeInssSobreSalariosDevidos : this.getInss().getInssSobreSalariosDevidos().getOcorrencias()) {
                this.apurarInclusaoJurosContribuicaoSocial(mapApuracoesPorCompetencia, ocorrenciaDeInssSobreSalariosDevidos);
            }
        }
        if (BaseDeJurosDasVerbasEnum.VERBA_INSS_PP.equals((Object)this.getParametrosDeAtualizacao().getBaseDeJurosDasVerbas())) {
            for (OcorrenciaDePrevidenciaPrivada ocorrenciaDePrevidenciaPrivada : this.getPrevidenciaPrivada().getOcorrencias()) {
                this.apurarInclusaoJurosPrevidenciaPrivada(mapApuracoesPorCompetencia, ocorrenciaDePrevidenciaPrivada);
            }
        }
        for (ApuracaoDeJuros apuracaoDeJuros : this.getApuracoesDeJuros()) {
            apuracaoDeJuros.remover();
        }
        this.getApuracoesDeJuros().clear();
        for (Map.Entry entry : mapOcorrenciasDeJuros.entrySet()) {
            ApuracaoDeJuros ocorrenciaDeJuros = (ApuracaoDeJuros)entry.getValue();
            this.getApuracoesDeJuros().add(ocorrenciaDeJuros);
        }
    }

    public void apurarInclusaoJurosContribuicaoSocial(Map<Competencia, Set<ApuracaoDeJuros>> mapApuracoesPorCompetencia, OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDeInss) {
        Competencia competencia = Competencia.getInstance(ocorrenciaDeInss.getDataOcorrenciaInss());
        Set<ApuracaoDeJuros> ocorrenciasDeJuros = mapApuracoesPorCompetencia.get(competencia);
        if (Utils.nulo(ocorrenciasDeJuros)) {
            return;
        }
        if (ocorrenciaDeInss.getOcorrenciaDecimoTerceiro().booleanValue()) {
            BigDecimal totalVerbasParaDecimoTerceiro = BigDecimal.ZERO;
            for (ApuracaoDeJuros apuracaoDeJuros : ocorrenciasDeJuros) {
                totalVerbasParaDecimoTerceiro = Utils.somar(totalVerbasParaDecimoTerceiro, apuracaoDeJuros.getValorVerbaParaContribuicaoSocialDecimoTerceiro(), totalVerbasParaDecimoTerceiro);
            }
            BigDecimal valorInssParaDesconto = this.encontrarDescontoInssRelativoVerbasCompoemPrincipal(totalVerbasParaDecimoTerceiro, ocorrenciaDeInss);
            for (ApuracaoDeJuros apuracao : ocorrenciasDeJuros) {
                BigDecimal valorContribuicaoSocialParaApuracao = apuracao.getValorVerbaParaContribuicaoSocialDecimoTerceiro();
                if (Utils.nulo(valorContribuicaoSocialParaApuracao) || Utils.nulo(ocorrenciaDeInss.getValorDevidoReclamanteCorrigido())) {
                    return;
                }
                valorContribuicaoSocialParaApuracao = valorContribuicaoSocialParaApuracao.multiply(valorInssParaDesconto, Utils.CONTEXTO_MATEMATICO);
                if (totalVerbasParaDecimoTerceiro.compareTo(BigDecimal.ZERO) == 0) continue;
                valorContribuicaoSocialParaApuracao = valorContribuicaoSocialParaApuracao.divide(totalVerbasParaDecimoTerceiro, Utils.CONTEXTO_MATEMATICO);
                apuracao.setContribuicaoSocialDecimoTerceiro(Utils.somar(apuracao.getContribuicaoSocialDecimoTerceiro(), valorContribuicaoSocialParaApuracao, apuracao.getContribuicaoSocialDecimoTerceiro()));
            }
        } else {
            BigDecimal totalVerbas = BigDecimal.ZERO;
            for (ApuracaoDeJuros apuracaoDeJuros : ocorrenciasDeJuros) {
                totalVerbas = Utils.somar(totalVerbas, apuracaoDeJuros.getValorVerbaParaContribuicaoSocial(), totalVerbas);
            }
            BigDecimal valorInssParaDesconto = this.encontrarDescontoInssRelativoVerbasCompoemPrincipal(totalVerbas, ocorrenciaDeInss);
            for (ApuracaoDeJuros apuracao : ocorrenciasDeJuros) {
                BigDecimal valorContribuicaoSocialParaApuracao = apuracao.getValorVerbaParaContribuicaoSocial();
                if (Utils.nulo(valorContribuicaoSocialParaApuracao) || Utils.nulo(ocorrenciaDeInss.getValorDevidoReclamanteCorrigido())) {
                    return;
                }
                valorContribuicaoSocialParaApuracao = valorContribuicaoSocialParaApuracao.multiply(Utils.arredondarValorMonetario(valorInssParaDesconto), Utils.CONTEXTO_MATEMATICO);
                if (totalVerbas.compareTo(BigDecimal.ZERO) == 0) continue;
                valorContribuicaoSocialParaApuracao = valorContribuicaoSocialParaApuracao.divide(totalVerbas, Utils.CONTEXTO_MATEMATICO);
                apuracao.setContribuicaoSocialNormal(Utils.somar(apuracao.getContribuicaoSocialNormal(), valorContribuicaoSocialParaApuracao, apuracao.getContribuicaoSocialNormal()));
            }
        }
    }

    private BigDecimal encontrarDescontoInssRelativoVerbasCompoemPrincipal(BigDecimal totalVerbas, OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDeInss) {
        BigDecimal descontoInss = Utils.arredondarValorMonetario(ocorrenciaDeInss.getValorDevidoReclamanteCorrigido());
        if (Utils.naoNulo(ocorrenciaDeInss.getValorBaseVerbas()) && BigDecimal.ZERO.compareTo(ocorrenciaDeInss.getValorBaseVerbas()) < 0 && totalVerbas.compareTo(ocorrenciaDeInss.getValorBaseVerbas()) != 0) {
            descontoInss = Utils.dividir(Utils.multiplicar(totalVerbas, descontoInss), ocorrenciaDeInss.getValorBaseVerbas());
        }
        return descontoInss;
    }

    private BigDecimal encontrarDescontoPrevPrivRelativoVerbasCompoemPrincipal(BigDecimal totalVerbas, OcorrenciaDePrevidenciaPrivada ocorrenciaDePrevidenciaPrivada) {
        BigDecimal descontoPrevPriv = Utils.arredondarValorMonetario(ocorrenciaDePrevidenciaPrivada.getValorDevidoCorrigido());
        if (Utils.naoNulo(ocorrenciaDePrevidenciaPrivada.getValorBase()) && BigDecimal.ZERO.compareTo(ocorrenciaDePrevidenciaPrivada.getValorBase()) < 0 && totalVerbas.compareTo(ocorrenciaDePrevidenciaPrivada.getValorBase()) != 0) {
            descontoPrevPriv = Utils.dividir(Utils.multiplicar(totalVerbas, descontoPrevPriv), ocorrenciaDePrevidenciaPrivada.getValorBase());
        }
        return descontoPrevPriv;
    }

    public void apurarInclusaoJurosPrevidenciaPrivada(Map<Competencia, Set<ApuracaoDeJuros>> mapApuracoesPorCompetencia, OcorrenciaDePrevidenciaPrivada ocorrenciaDePrevidenciaPrivada) {
        Competencia competencia = Competencia.getInstance(ocorrenciaDePrevidenciaPrivada.getCompetencia());
        Set<ApuracaoDeJuros> ocorrenciasDeJuros = mapApuracoesPorCompetencia.get(competencia);
        if (Utils.nulo(ocorrenciasDeJuros)) {
            return;
        }
        BigDecimal totalVerbas = BigDecimal.ZERO;
        for (ApuracaoDeJuros apuracao : ocorrenciasDeJuros) {
            totalVerbas = Utils.somar(totalVerbas, apuracao.getValorVerbaParaPrevidenciaPrivada(), totalVerbas);
        }
        BigDecimal valorPrevPrivParaDesconto = this.encontrarDescontoPrevPrivRelativoVerbasCompoemPrincipal(totalVerbas, ocorrenciaDePrevidenciaPrivada);
        for (ApuracaoDeJuros apuracao : ocorrenciasDeJuros) {
            BigDecimal valorPrevidenciaPrivadaParaApuracao = apuracao.getValorVerbaParaPrevidenciaPrivada();
            if (!Utils.naoNulos(valorPrevidenciaPrivadaParaApuracao, ocorrenciaDePrevidenciaPrivada.getValorDevidoCorrigido())) continue;
            valorPrevidenciaPrivadaParaApuracao = valorPrevidenciaPrivadaParaApuracao.multiply(valorPrevPrivParaDesconto, Utils.CONTEXTO_MATEMATICO);
            if (totalVerbas.compareTo(BigDecimal.ZERO) == 0) continue;
            valorPrevidenciaPrivadaParaApuracao = valorPrevidenciaPrivadaParaApuracao.divide(totalVerbas, Utils.CONTEXTO_MATEMATICO);
            apuracao.setPrevidenciaPrivada(Utils.somar(apuracao.getPrevidenciaPrivada(), valorPrevidenciaPrivadaParaApuracao, apuracao.getPrevidenciaPrivada()));
        }
    }

    private void apurarJurosDasVerbasOperacoes(Map<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro, Map<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocial, Map<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaPrevidenciaPrivada, Map<Competencia, Set<ApuracaoDeJuros>> mapApuracoesPorCompetencia, Map<CompetenciaDeJuros, ApuracaoDeJuros> mapOcorrenciasDeJuros, VerbaDeCalculo verba, OcorrenciaDeVerba ocorrencia) {
        BigDecimal base;
        Set<ApuracaoDeJuros> conjuntoDeApuracoesNaCompetencia;
        Date dataVencimentoOcorrencia = verba.isCaracteristicaFerias() ? ocorrencia.getDataInicial() : ocorrencia.getDataFinal();
        BigDecimal taxaDeJuros = this.calcularTaxaDeJuros(HelperDate.getCurrentCompetence(ocorrencia.getDataInicial()).getDate(), dataVencimentoOcorrencia, verba.getJurosDoAjuizamento(), true);
        Competencia competencia = Competencia.getInstance(ocorrencia.getDataInicial());
        Date dataInicioJuros = this.tabelaDeJuros.getDataInicialDeJuros();
        if (HelperDate.dateEquals(HelperDate.getCurrentCompetence(dataVencimentoOcorrencia).getDate(), HelperDate.getCurrentCompetence(this.getDataAjuizamento()).getDate()) && this.tabelaDeJuros.isSelicIndiceNoAjuizamentoSemCombinacao()) {
            dataInicioJuros = HelperDate.getInstance(dataVencimentoOcorrencia).lastDayOfTheMonth().getDate();
        }
        taxaDeJuros = this.calcularTaxaDeJuros(dataInicioJuros, dataVencimentoOcorrencia, verba.getJurosDoAjuizamento(), true);
        CompetenciaDeJuros competenciaDeJuros = CompetenciaDeJuros.getInstance(ocorrencia.getDataInicial(), dataInicioJuros);
        ApuracaoDeJuros ocorrenciaDeJuros = mapOcorrenciasDeJuros.get(competenciaDeJuros);
        if (Utils.nulo(ocorrenciaDeJuros)) {
            ocorrenciaDeJuros = new ApuracaoDeJuros(this);
            ocorrenciaDeJuros.setCompetencia(competenciaDeJuros.getData());
            ocorrenciaDeJuros.setDataInicial(competenciaDeJuros.getDataInicial());
            ocorrenciaDeJuros.setTaxaDeJuros(taxaDeJuros);
            mapOcorrenciasDeJuros.put(competenciaDeJuros, ocorrenciaDeJuros);
        }
        if (Utils.nulo(conjuntoDeApuracoesNaCompetencia = mapApuracoesPorCompetencia.get(competencia))) {
            conjuntoDeApuracoesNaCompetencia = new HashSet<ApuracaoDeJuros>();
            mapApuracoesPorCompetencia.put(competencia, conjuntoDeApuracoesNaCompetencia);
        }
        conjuntoDeApuracoesNaCompetencia.add(ocorrenciaDeJuros);
        ocorrenciaDeJuros.setValorCorrigido(ocorrenciaDeJuros.getValorCorrigido().add(Utils.arredondarValorMonetario(ocorrencia.getDiferencaCorrigida()), Utils.CONTEXTO_MATEMATICO));
        if (Boolean.TRUE.equals(verba.getIncidenciaINSS())) {
            switch (verba.getCaracteristica()) {
                case DECIMO_TERCEIRO_SALARIO: {
                    this.apurarVerbaIncideInssDecimoTerceiro(mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro, ocorrencia, competencia, ocorrenciaDeJuros);
                    break;
                }
                case FERIAS: {
                    this.apurarVerbaIncideInssFerias(mapValorTotalPorCompetenciaParaContribuicaoSocial, ocorrencia, competencia, ocorrenciaDeJuros);
                    break;
                }
                case AVISO_PREVIO: 
                case COMUM: {
                    this.apurarVerbaIncideInssAvisoOuComum(mapValorTotalPorCompetenciaParaContribuicaoSocial, ocorrencia, competencia, ocorrenciaDeJuros);
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

    public void apurarVerbaIncideInssAvisoOuComum(Map<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocial, OcorrenciaDeVerba ocorrencia, Competencia competencia, ApuracaoDeJuros ocorrenciaDeJuros) {
        BigDecimal diferenca = Utils.arredondarValorMonetario(ocorrencia.getDiferenca());
        ocorrenciaDeJuros.setValorVerbaParaContribuicaoSocial(ocorrenciaDeJuros.getValorVerbaParaContribuicaoSocial().add(diferenca, Utils.CONTEXTO_MATEMATICO));
        BigDecimal valorCompetencia = mapValorTotalPorCompetenciaParaContribuicaoSocial.get(competencia);
        if (Utils.nulo(valorCompetencia)) {
            valorCompetencia = BigDecimal.ZERO;
            mapValorTotalPorCompetenciaParaContribuicaoSocial.put(competencia, valorCompetencia);
        }
        valorCompetencia = Utils.somar(valorCompetencia, diferenca, valorCompetencia);
    }

    public void apurarVerbaIncideInssFerias(Map<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocial, OcorrenciaDeVerba ocorrencia, Competencia competencia, ApuracaoDeJuros ocorrenciaDeJuros) {
        BigDecimal base = ocorrencia.getDiferencaParaCalculoDasIncidencias();
        if (Utils.naoNulo(base)) {
            ocorrenciaDeJuros.setValorVerbaParaContribuicaoSocial(ocorrenciaDeJuros.getValorVerbaParaContribuicaoSocial().add(base, Utils.CONTEXTO_MATEMATICO));
            BigDecimal valorCompetencia = mapValorTotalPorCompetenciaParaContribuicaoSocial.get(competencia);
            if (Utils.nulo(valorCompetencia)) {
                valorCompetencia = BigDecimal.ZERO;
                mapValorTotalPorCompetenciaParaContribuicaoSocial.put(competencia, valorCompetencia);
            }
            valorCompetencia = Utils.somar(valorCompetencia, base, valorCompetencia);
        }
    }

    public void apurarVerbaIncideInssDecimoTerceiro(Map<Competencia, BigDecimal> mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro, OcorrenciaDeVerba ocorrencia, Competencia competencia, ApuracaoDeJuros ocorrenciaDeJuros) {
        BigDecimal diferenca = Utils.arredondarValorMonetario(ocorrencia.getDiferenca());
        ocorrenciaDeJuros.setValorVerbaParaContribuicaoSocialDecimoTerceiro(ocorrenciaDeJuros.getValorVerbaParaContribuicaoSocialDecimoTerceiro().add(diferenca, Utils.CONTEXTO_MATEMATICO));
        BigDecimal valorCompetencia = mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro.get(competencia);
        if (Utils.nulo(valorCompetencia)) {
            valorCompetencia = BigDecimal.ZERO;
            mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro.put(competencia, valorCompetencia);
        }
        valorCompetencia = Utils.somar(valorCompetencia, diferenca, valorCompetencia);
    }

    private void validarVerbaPossuiQuantidade() {
        for (VerbaDeCalculo verba : this.getVerbas()) {
            if (verba.isInformada() || verba.getFormula(FormulaReflexo.class).getQuantidade() != null) continue;
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0019, verba.getNome()));
        }
    }

    private void validarDisponibilidadeDaMaiorRemuneracaoNaLiquidacao() {
        if (this.getValorMaiorRemuneracao() == null) {
            for (VerbaDeCalculo verba : this.getVerbas()) {
                if (BaseDeCalculoDoPrincipalEnum.MAIOR_REMUNERACAO.equals((Object)verba.getFormula().getValorPago().getBaseTabelada())) {
                    throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0030, new Object[0]));
                }
                if (!(verba.getFormula() instanceof FormulaCalculada) || ((FormulaCalculada)verba.getFormula()).getBaseTabelada() == null || !BaseDeCalculoDoPrincipalEnum.MAIOR_REMUNERACAO.equals((Object)((FormulaCalculada)verba.getFormula()).getBaseTabelada().getTipo())) continue;
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0030, new Object[0]));
            }
        }
    }

    private void validarDisponibilidadeDaUltimaRemuneracaoNaLiquidacao() {
        if (this.getValorUltimaRemuneracao() == null) {
            for (VerbaDeCalculo verba : this.getVerbas()) {
                if (BaseDeCalculoDoPrincipalEnum.ULTIMA_REMUNERACAO.equals((Object)verba.getFormula().getValorPago().getBaseTabelada())) {
                    throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0043, new Object[0]));
                }
                if (!(verba.getFormula() instanceof FormulaCalculada) || ((FormulaCalculada)verba.getFormula()).getBaseTabelada() == null || !BaseDeCalculoDoPrincipalEnum.ULTIMA_REMUNERACAO.equals((Object)((FormulaCalculada)verba.getFormula()).getBaseTabelada().getTipo())) continue;
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0043, new Object[0]));
            }
        }
    }

    private void validarUsoCorretoDoHistoricoSalarial() {
        ArrayList<VerbaDeCalculo> verbasDeBaseHistoricoSalarialSemHistoricoSelecionado = new ArrayList<VerbaDeCalculo>();
        StringBuilder sbVerbasComErro = new StringBuilder();
        sbVerbasComErro.append('[');
        for (VerbaDeCalculo verba : this.getVerbas()) {
            BaseTabelada baseTabelada;
            if (!(verba.getFormula() instanceof FormulaCalculada) || (baseTabelada = ((FormulaCalculada)verba.getFormula()).getBaseTabelada()) == null || !BaseDeCalculoDoPrincipalEnum.HISTORICO_SALARIAL.equals((Object)baseTabelada.getTipo()) || !verba.getHistoricosDaVerbaDoValorDevido().isEmpty()) continue;
            verbasDeBaseHistoricoSalarialSemHistoricoSelecionado.add(verba);
            sbVerbasComErro.append(verba.getNome());
            sbVerbasComErro.append(", ");
        }
        if (sbVerbasComErro.length() > 2) {
            sbVerbasComErro.replace(sbVerbasComErro.length() - 2, sbVerbasComErro.length(), "]");
        }
        if (!verbasDeBaseHistoricoSalarialSemHistoricoSelecionado.isEmpty()) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0032, sbVerbasComErro.toString()));
        }
    }

    public void adicionar(ExcecaoDaCargaHorariaDoCalculo excecaoDaCargaHoraria) {
        if (Utils.naoNulo(excecaoDaCargaHoraria)) {
            excecaoDaCargaHoraria.validar();
            for (ExcecaoDaCargaHorariaDoCalculo excecao : this.getExcecoesDaCargaHoraria()) {
                if (!excecaoDaCargaHoraria.isPeriodoCoincidenteCom(excecao)) continue;
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0024, new Object[0]));
            }
            excecaoDaCargaHoraria.setCalculo(this);
            this.getExcecoesDaCargaHoraria().add(excecaoDaCargaHoraria);
        }
    }

    public Calculo removerDeExcecoesDaCargaHoraria(ExcecaoDaCargaHorariaDoCalculo excecao) {
        return Calculo.getRepositorio(RepositorioDeCalculo.class).removerDeExcecoesDaCargaHoraria(this, excecao);
    }

    public void removerDeApuracoesDiariasDeCartaoDePonto(List<ApuracaoDiariaCartao> filhos, boolean flush) {
        Calculo.getRepositorio(RepositorioDeCalculo.class).removerDeApuracoesDiariasDeCartaoDePonto(this, filhos, flush);
    }

    public void adicionar(ExcecaoDoFechamentoDeCartaoDePonto excecaoDoFechamentoDeCartaoDePonto) {
        if (Utils.naoNulo(excecaoDoFechamentoDeCartaoDePonto)) {
            excecaoDoFechamentoDeCartaoDePonto.validar();
            for (ExcecaoDoFechamentoDeCartaoDePonto excecao : this.getExcecoesDoFechamentoDeCartaoDePonto()) {
                if (!excecaoDoFechamentoDeCartaoDePonto.isPeriodoCoincidenteCom(excecao)) continue;
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0024, new Object[0]));
            }
            excecaoDoFechamentoDeCartaoDePonto.setCalculo(this);
            this.getExcecoesDoFechamentoDeCartaoDePonto().add(excecaoDoFechamentoDeCartaoDePonto);
        }
    }

    public Calculo removerDeExcecoesDoFechamento(ExcecaoDoFechamentoDeCartaoDePonto excecao) {
        return Calculo.getRepositorio(RepositorioDeCalculo.class).removerDeExcecoesDoFechamento(this, excecao);
    }

    public void adicionar(ExcecaoDoSabadoDoCalculo excecaoDoSabado) {
        if (Utils.naoNulo(excecaoDoSabado)) {
            excecaoDoSabado.validar();
            for (ExcecaoDoSabadoDoCalculo excecao : this.getExcecoesDoSabado()) {
                if (!excecaoDoSabado.isPeriodoCoincidenteCom(excecao)) continue;
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0024, new Object[0]));
            }
            excecaoDoSabado.setCalculo(this);
            this.getExcecoesDoSabado().add(excecaoDoSabado);
        }
    }

    public Calculo removerDeExcecoesDoSabado(ExcecaoDoSabadoDoCalculo excecao) {
        return Calculo.getRepositorio(RepositorioDeCalculo.class).removerDeExcecoesDoSabado(this, excecao);
    }

    public Calculo removerDeFaltas(Falta falta) {
        return Calculo.getRepositorio(RepositorioDeCalculo.class).removerDeFaltas(this, falta, true);
    }

    public void adicionar(ItemPontoFacultativo pontoFacultativo) {
        this.getPontosFacultativos().add(pontoFacultativo.validar());
    }

    public void removerDePontosFacultativos(ItemPontoFacultativo pontoFacultativo) {
        LinkedHashSet<ItemPontoFacultativo> auxPontosFacultativos = new LinkedHashSet<ItemPontoFacultativo>(this.getPontosFacultativos());
        auxPontosFacultativos.remove(pontoFacultativo);
        this.setPontosFacultativos(auxPontosFacultativos);
    }

    public Set<Ferias> getListaDeFerias() {
        return this.listaDeFerias;
    }

    public void setListaDeFerias(Set<Ferias> listaDeFerias) {
        this.listaDeFerias = listaDeFerias;
    }

    public Integer getPrazoFeriasProporcional() {
        return this.prazoFeriasProporcional;
    }

    public void setPrazoFeriasProporcional(Integer prazoFeriasProporcional) {
        this.prazoFeriasProporcional = prazoFeriasProporcional;
    }

    public void gerarPeriodosDeFerias() {
        this.gerarPeriodosDeFerias(true);
    }

    public void gerarPeriodosDeFerias(boolean flush) {
        Calculo.getRepositorio(RepositorioDeCalculo.class).gerarPeriodosDeFerias(this, flush);
    }

    public RegimeDoContratoEnum getRegimeDoContrato() {
        if (Utils.nulo((Object)this.regimeDoContrato)) {
            this.regimeDoContrato = RegimeDoContratoEnum.INTEGRAL;
        }
        return this.regimeDoContrato;
    }

    public void setRegimeDoContrato(RegimeDoContratoEnum regimeDoContrato) {
        this.regimeDoContrato = regimeDoContrato;
    }

    public void removerDeFerias(List<Ferias> filhos, boolean flush) {
        Calculo.getRepositorio(RepositorioDeCalculo.class).removerDeFerias(this, filhos, flush);
    }

    public void limparFerias(boolean flush) {
        Calculo.getRepositorio(RepositorioDeCalculo.class).limparFerias(this, flush);
    }

    public Calculo removerDeMultas(Multa multa, boolean flush) {
        return Calculo.getRepositorio(RepositorioDeCalculo.class).removerDeMultas(this, multa, flush);
    }

    public Boolean getLimitarAvosAoPeriodoDoCalculo() {
        return this.limitarAvosAoPeriodoDoCalculo;
    }

    public void setLimitarAvosAoPeriodoDoCalculo(Boolean limitarAvosAoPeriodoDoCalculo) {
        this.limitarAvosAoPeriodoDoCalculo = limitarAvosAoPeriodoDoCalculo;
    }

    public BigDecimal getValorMaiorRemuneracao() {
        return this.valorMaiorRemuneracao;
    }

    public void setValorMaiorRemuneracao(BigDecimal valorMaiorRemuneracao) {
        this.valorMaiorRemuneracao = valorMaiorRemuneracao;
    }

    public Boolean getIgnorarTaxaCorrecaoNegativa() {
        return this.getParametrosDeAtualizacao().getIgnorarTaxaNegativa();
    }

    public Estado getEstado() {
        if (this.estado == null && this.municipio != null) {
            return this.municipio.getEstado();
        }
        return this.estado;
    }

    public void setEstado(Estado estado) {
        this.estado = estado;
    }

    public ParametrosDeAtualizacao getParametrosDeAtualizacao() {
        if (Utils.nulo(this.parametrosDeAtualizacao)) {
            this.parametrosDeAtualizacao = new ParametrosDeAtualizacao(this);
        }
        return this.parametrosDeAtualizacao;
    }

    public void setParametrosDeAtualizacao(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        this.parametrosDeAtualizacao = parametrosDeAtualizacao;
    }

    public Set<Multa> getMultas() {
        return this.multas;
    }

    public Set<Multa> getMultasDoCalculoCobrarReclamante() {
        HashSet<Multa> multasDoCalculo = new HashSet<Multa>();
        if (this.multas != null) {
            for (Multa multa : this.multas) {
                if (!multa.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO) || !TipoCobrancaReclamanteEnum.COBRAR.equals((Object)multa.getTipoCobrancaReclamante())) continue;
                multasDoCalculo.add(multa);
            }
        }
        return multasDoCalculo;
    }

    public Set<Multa> getMultasDoCalculoDescontarCredito() {
        HashSet<Multa> multasDoCalculo = new HashSet<Multa>();
        if (this.multas != null) {
            for (Multa multa : this.multas) {
                if (!multa.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO) || !TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)multa.getTipoCobrancaReclamante())) continue;
                multasDoCalculo.add(multa);
            }
        }
        return multasDoCalculo;
    }

    public Set<Multa> getMultasDoCalculo() {
        HashSet<Multa> multasDoCalculo = new HashSet<Multa>();
        if (this.multas != null) {
            for (Multa multa : this.multas) {
                if (!multa.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO)) continue;
                multasDoCalculo.add(multa);
            }
        }
        return multasDoCalculo;
    }

    public Set<Multa> getMultasDoPagamento() {
        HashSet<Multa> multasDoPagamento = new HashSet<Multa>();
        if (this.multas != null) {
            for (Multa multa : this.multas) {
                if (!multa.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) continue;
                multasDoPagamento.add(multa);
            }
        }
        return multasDoPagamento;
    }

    public void setMultas(Set<Multa> multas) {
        this.multas = multas;
    }

    public CustasJudiciais getCustasJudiciais() {
        if (Utils.nulo(this.custasJudiciais)) {
            this.custasJudiciais = new CustasJudiciais(this);
        }
        return this.custasJudiciais;
    }

    public void setCustasJudiciais(CustasJudiciais custasJudiciais) {
        this.custasJudiciais = custasJudiciais;
    }

    public Set<ItemPontoFacultativo> getPontosFacultativos() {
        if (Utils.nulo(this.pontosFacultativos)) {
            this.pontosFacultativos = new LinkedHashSet<ItemPontoFacultativo>();
        }
        return this.pontosFacultativos;
    }

    public void setPontosFacultativos(Set<ItemPontoFacultativo> pontosFacultativos) {
        this.pontosFacultativos = pontosFacultativos;
    }

    protected TotalizadorDeMulta getTotalizadorDeMulta() {
        if (Utils.nulo(this.totalizadorDeMulta)) {
            this.totalizadorDeMulta = new TotalizadorDeMulta(this);
        }
        return this.totalizadorDeMulta;
    }

    protected TotalizadorDeHonorario getTotalizadorDeHonorario() {
        if (Utils.nulo(this.totalizadorDeHonorario)) {
            this.totalizadorDeHonorario = new TotalizadorDeHonorario(this);
        }
        return this.totalizadorDeHonorario;
    }

    public BigDecimal getValorTotalMultasDoTipoReclamanteReclamado() {
        return this.getTotalizadorDeMulta().getTotalTipoReclamanteReclamado();
    }

    public BigDecimal getValorTotalMultasDoTipoReclamadoReclamante() {
        return this.getTotalizadorDeMulta().getTotalTipoReclamadoReclamante();
    }

    public BigDecimal getValorTotalMultasDoTipoTerceiroReclamado() {
        return this.getTotalizadorDeMulta().getTotalTipoTerceiroReclamado();
    }

    public BigDecimal getValorTotalHonorariosDevidosPeloReclamante() {
        return this.getTotalizadorDeHonorario().getTotalDevidoPeloReclamante();
    }

    public BigDecimal getValorTotalHonorariosDevidosPeloReclamado() {
        return this.getTotalizadorDeHonorario().getTotalDevidoPeloReclamado();
    }

    public Set<Honorario> getHonorarios() {
        return this.honorarios;
    }

    public Set<Honorario> getHonorariosDoCalculo() {
        HashSet<Honorario> honorariosDoCalculo = new HashSet<Honorario>();
        if (this.honorarios != null) {
            for (Honorario honorario : this.honorarios) {
                if (!honorario.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO)) continue;
                honorariosDoCalculo.add(honorario);
            }
        }
        return honorariosDoCalculo;
    }

    public Set<Honorario> getHonorariosDoPagamento() {
        HashSet<Honorario> honorariosDoPagamento = new HashSet<Honorario>();
        if (this.honorarios != null) {
            for (Honorario honorario : this.honorarios) {
                if (!honorario.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) continue;
                honorariosDoPagamento.add(honorario);
            }
        }
        return honorariosDoPagamento;
    }

    public Set<Honorario> getHonorariosDoCalculoCobrarReclamante() {
        HashSet<Honorario> honorariosDoCalculo = new HashSet<Honorario>();
        if (this.honorarios != null) {
            for (Honorario honorario : this.honorarios) {
                if (!honorario.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO) || !TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorario.getTipoCobrancaReclamante())) continue;
                honorariosDoCalculo.add(honorario);
            }
        }
        return honorariosDoCalculo;
    }

    public Set<Honorario> getHonorariosDoCalculoDescontarCredito() {
        HashSet<Honorario> honorariosDoCalculo = new HashSet<Honorario>();
        if (this.honorarios != null) {
            for (Honorario honorario : this.honorarios) {
                if (!honorario.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO) || !TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)honorario.getTipoCobrancaReclamante())) continue;
                honorariosDoCalculo.add(honorario);
            }
        }
        return honorariosDoCalculo;
    }

    public void setHonorarios(Set<Honorario> honorarios) {
        this.honorarios = honorarios;
    }

    public OptimizerListSearch<Competencia, ApuracaoDeJuros> getApuracoesDeJurosOptimizerListSearch() {
        return new ApuracaoDeJurosOptimizerListSearch().init((Collection<ApuracaoDeJuros>)this.getApuracoesDeJuros());
    }

    public Set<ApuracaoDeJuros> getApuracoesDeJuros() {
        return Utils.naoNulo(this.apuracoesDeJuros) ? this.apuracoesDeJuros : (this.apuracoesDeJuros = new LinkedHashSet<ApuracaoDeJuros>());
    }

    public void setApuracoesDeJuros(Set<ApuracaoDeJuros> apuracoesDeJuros) {
        this.apuracoesDeJuros = apuracoesDeJuros;
    }

    public TipoDeApuracaoPrazoDoAvisoPrevioEnum getApuracaoPrazoDoAvisoPrevio() {
        return this.apuracaoPrazoDoAvisoPrevio;
    }

    public void setApuracaoPrazoDoAvisoPrevio(TipoDeApuracaoPrazoDoAvisoPrevioEnum apuracaoPrazoDoAvisoPrevio) {
        this.apuracaoPrazoDoAvisoPrevio = apuracaoPrazoDoAvisoPrevio;
    }

    public Integer getPrazoAvisoInformado() {
        return this.prazoAvisoInformado;
    }

    public void setPrazoAvisoInformado(Integer prazoAvisoInformado) {
        this.prazoAvisoInformado = prazoAvisoInformado;
    }

    public BigDecimal getTotalDeValorCorrigidoDaApuracaoDeJuros() {
        if (!Utils.nulo(this.totalDeCapitalDaApuracaoDeJuros)) {
            return this.totalDeCapitalDaApuracaoDeJuros.getValor();
        }
        this.totalDeCapitalDaApuracaoDeJuros = Total.newInstance(true);
        if (this.getParametrosDeAtualizacao().isJurosHabilitado()) {
            for (ApuracaoDeJuros apuracaoDeJuros : this.getApuracoesDeJuros()) {
                if (!Utils.naoNulo(apuracaoDeJuros.getValorCorrigido())) continue;
                this.totalDeCapitalDaApuracaoDeJuros.acumular(apuracaoDeJuros.getValorCorrigido());
            }
        } else {
            List<VerbaDeCalculo> verbas = this.getVerbasParaLiquidacao();
            for (VerbaDeCalculo verbaDeCalculo : verbas) {
                if (!LogicoEnum.SIM.equals((Object)verbaDeCalculo.getComporPrincipal())) continue;
                this.totalDeCapitalDaApuracaoDeJuros.acumular(Utils.somar(verbaDeCalculo.getValorTotalDiferencaCorrigida(), verbaDeCalculo.getValorDeJuros(), verbaDeCalculo.getValorTotalDiferencaCorrigida()));
            }
        }
        return this.totalDeCapitalDaApuracaoDeJuros.getValor();
    }

    public BigDecimal getTotalDeJurosDaApuracaoDeJuros() {
        if (Utils.nulo(this.totalDaApuracaoDeJuros)) {
            this.totalDaApuracaoDeJuros = Total.newInstance(true);
            for (ApuracaoDeJuros apuracaoDeJuros : this.getApuracoesDeJuros()) {
                if (!Utils.naoNulo(apuracaoDeJuros.getJuros())) continue;
                this.totalDaApuracaoDeJuros.acumular(apuracaoDeJuros.getJuros());
            }
        }
        return this.totalDaApuracaoDeJuros.getValor();
    }

    public BigDecimal getTotalDeJurosDaApuracaoDeJurosParaIrpfDecimoTerceiro() {
        if (Utils.nulo(this.totalDaApuracaoDeJurosParaIrpfDecimoTerceiro)) {
            this.totalDaApuracaoDeJurosParaIrpfDecimoTerceiro = Total.newInstance(true);
            for (ApuracaoDeJuros apuracaoDeJuros : this.getApuracoesDeJuros()) {
                if (!Utils.naoNulo(apuracaoDeJuros.getJurosParaIrpfDecimoTerceiro())) continue;
                this.totalDaApuracaoDeJurosParaIrpfDecimoTerceiro.acumular(apuracaoDeJuros.getJurosParaIrpfDecimoTerceiro());
            }
        }
        return this.totalDaApuracaoDeJurosParaIrpfDecimoTerceiro.getValor();
    }

    public BigDecimal getTotalDeJurosDaApuracaoDeJurosParaIrpfFerias() {
        if (Utils.nulo(this.totalDaApuracaoDeJurosParaIrpfFerias)) {
            this.totalDaApuracaoDeJurosParaIrpfFerias = Total.newInstance(true);
            for (ApuracaoDeJuros apuracaoDeJuros : this.getApuracoesDeJuros()) {
                if (!Utils.naoNulo(apuracaoDeJuros.getJurosParaIrpfFerias())) continue;
                this.totalDaApuracaoDeJurosParaIrpfFerias.acumular(apuracaoDeJuros.getJurosParaIrpfFerias());
            }
        }
        return this.totalDaApuracaoDeJurosParaIrpfFerias.getValor();
    }

    public BigDecimal getTotalDeJurosDaApuracaoDeJurosParaIrpfDemaisVerbas() {
        if (Utils.nulo(this.totalDaApuracaoDeJurosParaIrpfDemaisVerbas)) {
            this.totalDaApuracaoDeJurosParaIrpfDemaisVerbas = Total.newInstance(true);
            for (ApuracaoDeJuros apuracaoDeJuros : this.getApuracoesDeJuros()) {
                if (!Utils.naoNulo(apuracaoDeJuros.getJurosParaIrpfDemaisVerbas())) continue;
                this.totalDaApuracaoDeJurosParaIrpfDemaisVerbas.acumular(apuracaoDeJuros.getJurosParaIrpfDemaisVerbas());
            }
        }
        return this.totalDaApuracaoDeJurosParaIrpfDemaisVerbas.getValor();
    }

    public BigDecimal getTotalGeralDaApuracaoDeJuros() {
        if (Utils.nulo(this.totalGeralDaApuracaoDeJuros)) {
            this.totalGeralDaApuracaoDeJuros = Total.newInstance(true);
            for (ApuracaoDeJuros apuracaoDeJuros : this.getApuracoesDeJuros()) {
                if (!Utils.naoNulo(apuracaoDeJuros.getTotal())) continue;
                this.totalGeralDaApuracaoDeJuros.acumular(apuracaoDeJuros.getTotal());
            }
        }
        return this.totalGeralDaApuracaoDeJuros.getValor();
    }

    private void zerarOrdem() {
        this.setOrdem(0);
    }

    public Integer getOrdem() {
        Calculo calculo = this;
        Integer n = calculo.ordem;
        Integer n2 = calculo.ordem = Integer.valueOf(calculo.ordem + 1);
        return n;
    }

    public void setOrdem(Integer ordem) {
        this.ordem = ordem;
    }

    public Date getInicioFeriasColetivas() {
        return this.inicioFeriasColetivas;
    }

    public void setInicioFeriasColetivas(Date inicioFeriasColetivas) {
        this.inicioFeriasColetivas = inicioFeriasColetivas;
    }

    public boolean isRelatorioAtualizacao() {
        return this.relatorioAtualizacao;
    }

    public void setRelatorioAtualizacao(boolean relatorioAtualizacao) {
        this.relatorioAtualizacao = relatorioAtualizacao;
    }

    public BigDecimal calcularBrutoDevidoAoReclamante() {
        Total brutoReclamante = Total.newInstance(true);
        brutoReclamante.acumular(this.getTotalDeValorCorrigidoDaApuracaoDeJuros());
        brutoReclamante.acumular(this.getTotalDeJurosDaApuracaoDeJuros());
        if (this.getFgts().isComporOPrincipal()) {
            brutoReclamante.acumular(this.getFgts().getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
            brutoReclamante.acumular(this.getFgts().getTotalDaMultaDoFgts());
            brutoReclamante.acumular(this.getFgts().getTotalDaMultaDoArtigo467());
            if (this.getFgts().getDeduzirDoFGTS().booleanValue()) {
                brutoReclamante.diminuir(this.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
            }
        }
        if (Boolean.TRUE.equals(this.getSalarioFamilia().getApurarSalarioFamilia()) && this.getSalarioFamilia().isComporOPrincipal()) {
            brutoReclamante.acumular(this.getSalarioFamilia().getTotalGeral());
        }
        if (Boolean.TRUE.equals(this.getSeguroDesemprego().getApurarSeguroDesemprego()) && this.getSeguroDesemprego().isComporOPrincipal()) {
            brutoReclamante.acumular(this.getSeguroDesemprego().getTotal());
        }
        brutoReclamante.acumular(this.getValorTotalMultasDoTipoReclamanteReclamado());
        brutoReclamante.diminuir(this.getValorTotalMultasDoTipoReclamadoReclamante());
        return brutoReclamante.getValor();
    }

    public Irpf getIrpf() {
        if (Utils.nulo(this.irpf)) {
            this.irpf = new Irpf(this);
        }
        return this.irpf;
    }

    public void setIrpf(Irpf irpf) {
        this.irpf = irpf;
    }

    public String getUsuarioCriador() {
        return this.usuarioCriador;
    }

    public void setUsuarioCriador(String usuarioCriador) {
        this.usuarioCriador = usuarioCriador;
    }

    public Boolean getProcessoInformadoManualmente() {
        return this.processoInformadoManualmente;
    }

    public void setProcessoInformadoManualmente(Boolean processoInformadoManualmente) {
        this.processoInformadoManualmente = processoInformadoManualmente;
    }

    public boolean isLiquidado() {
        return this.getDataDeLiquidacao() != null;
    }

    public boolean isTemFGTSApurado() {
        return this.getFgts().getMulta() != false && TipoDeBaseDoFgtsEnum.INFORMADA.equals((Object)this.getFgts().getTipoDoValorDaMulta()) || HelperIterate.iterate(this.getHistoricosSalariais()).where(new HelperIterate.Where<HistoricoSalarial>(){

            @Override
            public boolean evaluate(HistoricoSalarial item) {
                return item.getAplicarProporcionalidadeFGTS();
            }
        }) || HelperIterate.iterate(this.getVerbasAtivas()).where(new HelperIterate.Where<VerbaDeCalculo>(){

            @Override
            public boolean evaluate(VerbaDeCalculo item) {
                return item.getIncidenciaFGTS();
            }
        });
    }

    public boolean isTemMultaInformada() {
        return HelperIterate.iterate(this.getMultasDoCalculo()).where(new HelperIterate.Where<Multa>(){

            @Override
            public boolean evaluate(Multa item) {
                return TipoValorEnum.INFORMADO.equals((Object)item.getTipoValorDaMulta());
            }
        });
    }

    public boolean isApurarPrevidenciaPrivada() {
        return Utils.naoNulo(this.getPrevidenciaPrivada().getId()) && this.getPrevidenciaPrivada().getApurarPrevidenciaPrivada() != false;
    }

    public Periodo obterPeriodoDoCalculo() {
        Periodo periodo = new Periodo();
        if (Utils.naoNulo(this.getDataAdmissao()) && Utils.naoNulo(this.getDataInicioCalculo())) {
            if (HelperDate.getInstance(this.getDataAdmissao()).greaterThenOrEquals(this.getDataInicioCalculo())) {
                periodo.setInicial(this.getDataAdmissao());
            } else {
                periodo.setInicial(this.getDataInicioCalculo());
            }
        } else if (Utils.naoNulo(this.getDataAdmissao())) {
            periodo.setInicial(this.getDataAdmissao());
        } else if (Utils.naoNulo(this.getDataInicioCalculo())) {
            periodo.setInicial(this.getDataInicioCalculo());
        }
        if (Utils.naoNulo(this.getDataDemissao()) && Utils.naoNulo(this.getDataTerminoCalculo())) {
            if (HelperDate.getInstance(this.getDataDemissao()).lessThanOrEqualsTo(this.getDataTerminoCalculo())) {
                periodo.setFinal(this.getDataDemissao());
            } else {
                periodo.setFinal(this.getDataTerminoCalculo());
            }
        } else if (Utils.naoNulo(this.getDataDemissao())) {
            periodo.setFinal(this.getDataDemissao());
        } else if (Utils.naoNulo(this.getDataTerminoCalculo())) {
            periodo.setFinal(this.getDataTerminoCalculo());
        }
        return periodo;
    }

    public Periodo obterPeriodoSugestivoDoCalculo() {
        return this.obterPeriodoSugestivoDoCalculo(Boolean.FALSE, Boolean.FALSE);
    }

    public Date getDataPrescricaoQuinquenal() {
        HelperDate dataPrescricaoQuinquenal = HelperDate.getInstance(this.getDataAjuizamento());
        return dataPrescricaoQuinquenal.addYear(-5).getDate();
    }

    public Date getDataPrescricaoFgts() {
        HelperDate dataAjuizamento = HelperDate.getInstance(this.getDataAjuizamento());
        int anosPrescricao = -30;
        if (HelperDate.dateAfterOrEquals(this.getDataAjuizamento(), TREZE_NOVEMBRO_2014) && HelperDate.dateBefore(this.getDataAjuizamento(), TREZE_NOVEMBRO_2019) && HelperDate.dateAfter(this.getDataAdmissao(), TREZE_NOVEMBRO_1989)) {
            anosPrescricao = -5;
        } else if (HelperDate.dateAfterOrEquals(this.getDataAjuizamento(), TREZE_NOVEMBRO_2019)) {
            anosPrescricao = -5;
        }
        return dataAjuizamento.addYear(anosPrescricao).getDate();
    }

    public Periodo obterPeriodoSugestivoDoCalculo(boolean verificarPrescricaoQuinquenal, boolean verificarPeriodoParaFgts) {
        Periodo periodo = new Periodo();
        if (Utils.naoNulo(this.getDataInicioCalculo()) && !verificarPeriodoParaFgts) {
            periodo.setInicial(this.getDataInicioCalculo());
            periodo.setLabelDataIncial("Data In\u00edcio do C\u00e1lculo");
        } else if (Utils.naoNulo(this.getDataAdmissao())) {
            periodo.setInicial(this.getDataAdmissao());
            periodo.setLabelDataIncial("Data de Admiss\u00e3o");
        }
        if (verificarPrescricaoQuinquenal && this.getPrescricaoQuinquenal().booleanValue()) {
            HelperDate dataPrescricaoQuinquenal = HelperDate.getInstance(this.getDataAjuizamento());
            dataPrescricaoQuinquenal.addYear(-5);
            if (dataPrescricaoQuinquenal.greaterThen(periodo.getInicial())) {
                periodo.setInicial(dataPrescricaoQuinquenal.getDate());
                periodo.setLabelDataIncial("Data de Prescri\u00e7\u00e3o Quinquenal");
            }
        }
        if (Utils.naoNulo(this.getDataDemissao())) {
            periodo.setFinal(this.getDataDemissao());
            periodo.setLabelDataFinal("Data de Demiss\u00e3o");
        } else if (Utils.naoNulo(this.getDataTerminoCalculo())) {
            periodo.setFinal(this.getDataTerminoCalculo());
            periodo.setLabelDataFinal("Data Fim do C\u00e1lculo");
        }
        return periodo;
    }

    public List<VerbaDeCalculo> getVerbasNaoCompoemPrincipal() {
        ArrayList<VerbaDeCalculo> verbasNaoCompoemPrincipal = new ArrayList<VerbaDeCalculo>();
        for (VerbaDeCalculo verba : this.getVerbasAtivas()) {
            if (verba.isComporOPrincipal()) continue;
            verbasNaoCompoemPrincipal.add(verba);
        }
        return verbasNaoCompoemPrincipal;
    }

    public Periodo obterPeriodoDoCalculoParaRestricao(boolean verificarPrescricaoQuinquenal, boolean verificarPeriodoParaFgts) {
        Periodo periodo = this.obterPeriodoSugestivoDoCalculo(verificarPrescricaoQuinquenal, verificarPeriodoParaFgts);
        if (Utils.naoNulos(this.getDataDemissao(), this.getDataTerminoCalculo())) {
            if (this.getDataDemissao().compareTo(this.getDataTerminoCalculo()) >= 0) {
                periodo.setFinal(this.getDataDemissao());
                periodo.setLabelDataFinal("Data de Demiss\u00e3o");
            } else if (!verificarPeriodoParaFgts) {
                periodo.setFinal(this.getDataTerminoCalculo());
                periodo.setLabelDataFinal("Data Fim do C\u00e1lculo");
            }
        }
        return periodo;
    }

    public LogicoFuzzy<?> getSabadoDiaUtilComExcecao() {
        if (Utils.nulo(this.sabadoDiaUtilComExcecao)) {
            this.sabadoDiaUtilComExcecao = new LogicoFuzzy<ExcecaoDoSabadoDoCalculo>(this.getSabadoDiaUtil(), this.getExcecoesDoSabado());
        }
        return this.sabadoDiaUtilComExcecao;
    }

    public SalarioFamilia getSalarioFamilia() {
        if (Utils.nulo(this.salarioFamilia)) {
            this.salarioFamilia = new SalarioFamilia(this);
        }
        return this.salarioFamilia;
    }

    public void setSalarioFamilia(SalarioFamilia salarioFamilia) {
        this.salarioFamilia = salarioFamilia;
    }

    public boolean temSalarioFamilia() {
        return !Utils.nulo(this.salarioFamilia);
    }

    public long obterQuantidadeDeMesesEntreAdmissaoEDemissaoParaSeguroDesemprego() {
        long qtd = 0L;
        if (Utils.naoNulos(this.dataAdmissao, this.dataDemissao)) {
            HelperDate dataDemissao = HelperDate.getInstance(this.dataDemissao);
            if (this.getProjetaAvisoIndenizado().booleanValue()) {
                dataDemissao.addDay(this.obterQuantidadeAdicionalAvisoPrevio());
            }
            List<Periodo> periodos = HelperDate.breakInMonths(this.dataAdmissao, dataDemissao.getDate());
            for (Periodo periodo : periodos) {
                int quantidadeDias = HelperDate.getInstance(periodo.getFinal()).getDay() - HelperDate.getInstance(periodo.getInicial()).getDay() + 1;
                if (quantidadeDias < 15) continue;
                ++qtd;
            }
        }
        return qtd;
    }

    public boolean existeDataDeDemissao() {
        return Utils.naoNulo(this.getDataDemissao());
    }

    public String calcularHashCodeDaLiquidacao() {
        StringBuilder sb = new StringBuilder();
        sb.append(this.getVersao());
        if (Utils.naoNulo(this.getFaltas()) && !this.getFaltas().isEmpty()) {
            List<Falta> faltas = OrdenadorDeListas.ordenaFaltasPorVersao(new ArrayList<Falta>(this.getFaltas()));
            for (Falta falta : faltas) {
                sb.append(falta.getVersao());
            }
        }
        if (Utils.naoNulo(this.getListaDeFerias()) && !this.getListaDeFerias().isEmpty()) {
            List<Ferias> listFerias = OrdenadorDeListas.ordenaFeriasPorVersao(new ArrayList<Ferias>(this.getListaDeFerias()));
            for (Ferias ferias : listFerias) {
                sb.append(ferias.getVersao());
            }
        }
        List<HistoricoSalarial> historicosSalariais = OrdenadorDeListas.ordenaHistoricosSalariaisPorVersao(new ArrayList<HistoricoSalarial>(this.getHistoricosSalariais()));
        for (HistoricoSalarial historicoSalarial : historicosSalariais) {
            sb.append(historicoSalarial.getVersao());
        }
        List<VerbaDeCalculo> verbas = OrdenadorDeListas.ordenaVerbasDeCalculoPorVersaoENome(new ArrayList<VerbaDeCalculo>(this.getVerbas()));
        for (VerbaDeCalculo verba : verbas) {
            sb.append(verba.getVersao());
            for (OcorrenciaDeVerba ocorrenciaDeVerba : verba.getOcorrencias()) {
                sb.append(ocorrenciaDeVerba.getVersao());
            }
        }
        sb.append(this.getSalarioFamilia().getVersao());
        sb.append(this.getSeguroDesemprego().getVersao());
        sb.append(this.getFgts().getVersao());
        if (Utils.naoNulo(this.getFgts().getOcorrencias()) && !this.getFgts().getOcorrencias().isEmpty()) {
            for (OcorrenciaDeFgts ocorrenciaDeFgts : this.getFgts().getOcorrencias()) {
                sb.append(ocorrenciaDeFgts.getVersao());
            }
        }
        sb.append(this.getInss().getVersao());
        if (Utils.naoNulo(this.getInss().getInssSobreSalariosDevidos().getOcorrencias()) && !this.getInss().getInssSobreSalariosDevidos().getOcorrencias().isEmpty()) {
            for (OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDeInssSobreSalariosDevidos : this.getInss().getInssSobreSalariosDevidos().getOcorrencias()) {
                sb.append(ocorrenciaDeInssSobreSalariosDevidos.getVersao());
            }
        }
        if (Utils.naoNulo(this.getInss().getInssSobreSalariosPagos().getOcorrencias()) && !this.getInss().getInssSobreSalariosPagos().getOcorrencias().isEmpty()) {
            for (OcorrenciaDeInssSobreSalariosPagos ocorrenciaDeInssSobreSalariosPagos : this.getInss().getInssSobreSalariosPagos().getOcorrencias()) {
                sb.append(ocorrenciaDeInssSobreSalariosPagos.getVersao());
            }
        }
        sb.append(this.getPrevidenciaPrivada().getVersao());
        PensaoAlimenticia pensaoAlimenticia = this.getPensaoAlimenticiaDoCalculo();
        if (pensaoAlimenticia != null) {
            sb.append(pensaoAlimenticia.getVersao());
        }
        sb.append(this.getIrpf().getVersao());
        if (Utils.naoNulo(this.getMultasDoCalculo()) && !this.getMultasDoCalculo().isEmpty()) {
            List<Multa> multas = OrdenadorDeListas.ordenaMultasPorVersao(new ArrayList<Multa>(this.getMultasDoCalculo()));
            for (Multa multa : multas) {
                sb.append(multa.getVersao());
            }
        }
        if (Utils.naoNulo(this.getHonorariosDoCalculo()) && !this.getHonorariosDoCalculo().isEmpty()) {
            List<Honorario> honorarios = OrdenadorDeListas.ordenaHonorariosPorVersao(new ArrayList<Honorario>(this.getHonorariosDoCalculo()));
            for (Honorario honorario : honorarios) {
                sb.append(honorario.getVersao());
            }
        }
        sb.append(this.getCustasJudiciais().getVersao());
        sb.append(this.getParametrosDeAtualizacao().getVersao());
        return Utils.calcularHashMD5(sb.toString());
    }

    public String calcularHashCodeExpandidoDoCalculo() {
        Set<CustasFixasAtualizacao> custasFixasAtualizacao;
        PensaoAlimenticia pensaoAlimenticia;
        StringBuilder sb = new StringBuilder();
        sb.append(this.calcularHashCodeDaLiquidacao());
        if (Utils.naoNulo(this.getPagamentos()) && !this.getPagamentos().isEmpty()) {
            for (Pagamento pagamento : this.getPagamentos()) {
                sb.append(pagamento.getVersao());
            }
        }
        if (Utils.naoNulo(pensaoAlimenticia = this.getPensaoAlimenticiaDoPagamento())) {
            sb.append(pensaoAlimenticia.getVersao());
        }
        if (Utils.naoNulo(this.getMultasDoPagamento()) && !this.getMultasDoPagamento().isEmpty()) {
            List<Multa> multas = OrdenadorDeListas.ordenaMultasPorVersao(new ArrayList<Multa>(this.getMultasDoPagamento()));
            for (Multa multa : multas) {
                sb.append(multa.getVersao());
            }
        }
        if (Utils.naoNulo(this.getHonorariosDoPagamento()) && !this.getHonorariosDoPagamento().isEmpty()) {
            List<Honorario> honorarios = OrdenadorDeListas.ordenaHonorariosPorVersao(new ArrayList<Honorario>(this.getHonorariosDoPagamento()));
            for (Honorario honorario : honorarios) {
                sb.append(honorario.getVersao());
            }
        }
        if (Utils.naoNulo(custasFixasAtualizacao = this.getCustasJudiciais().getCustasFixasAtualizacao()) && !custasFixasAtualizacao.isEmpty()) {
            for (CustasFixasAtualizacao custasFixas : custasFixasAtualizacao) {
                sb.append(custasFixas.getDataEvento());
                for (CustasDevidasFixasEnum custasDevidasFixasEnum : CustasDevidasFixasEnum.values()) {
                    Integer quantidade = custasDevidasFixasEnum.getQuantidade(custasFixas);
                    if (!Utils.naoNulo(quantidade)) continue;
                    sb.append(quantidade);
                }
            }
        }
        if (Utils.naoNulo(this.getCustasJudiciais().getAutosJudiciaisDaAtualizacao()) && !this.getCustasJudiciais().getAutosJudiciaisDaAtualizacao().isEmpty()) {
            for (AutoJudicial auto : this.getCustasJudiciais().getAutosJudiciaisDaAtualizacao()) {
                sb.append(auto.getVersao());
            }
        }
        if (Utils.naoNulo(this.getCustasJudiciais().getArmazenamentosDaAtualizacao()) && !this.getCustasJudiciais().getArmazenamentosDaAtualizacao().isEmpty()) {
            for (Armazenamento armazenamento : this.getCustasJudiciais().getArmazenamentosDaAtualizacao()) {
                sb.append(armazenamento.getVersao());
            }
        }
        return Utils.calcularHashMD5(sb.toString());
    }

    public boolean isAlteradoParaLiquidacao() {
        return Utils.nulo(this.getHashCodeLiquidacao()) || !this.getHashCodeLiquidacao().equals(this.calcularHashCodeDaLiquidacao());
    }

    public boolean isDataDemissaoAnteriorADataPrescricaoQuinquenal() {
        if (Utils.naoNulo(this.getDataDemissao()) && this.getPrescricaoQuinquenal().booleanValue()) {
            return HelperDate.getInstance(this.getDataDemissao()).lessThen(HelperDate.getInstance(this.getDataPrescricaoQuinquenal()));
        }
        return false;
    }

    public boolean isDataTerminoCalculoAnteriorADemissao() {
        if (Utils.naoNulos(this.getDataDemissao(), this.getDataTerminoCalculo())) {
            return HelperDate.dateBefore(this.getDataTerminoCalculo(), this.getDataDemissao());
        }
        return false;
    }

    public String getHashCodeLiquidacao() {
        return this.hashCodeLiquidacao;
    }

    public void setHashCodeLiquidacao(String hashCodeLiquidacao) {
        this.hashCodeLiquidacao = hashCodeLiquidacao;
    }

    public Setor getSetor() {
        return new Setor(this.idSetor, this.instancia);
    }

    public void setSetor(Setor setor) {
        this.idSetor = setor != null ? setor.getId() : null;
        this.instancia = setor != null ? setor.getInstancia() : null;
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (this.apuracaoPrazoDoAvisoPrevio == null ? 0 : this.apuracaoPrazoDoAvisoPrevio.hashCode());
        result = 31 * result + (this.prazoAvisoInformado == null ? 0 : this.prazoAvisoInformado.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null || !super.equals(obj) || this.getClass() != obj.getClass()) {
            return false;
        }
        Calculo other = (Calculo)obj;
        if (this.apuracaoPrazoDoAvisoPrevio != other.apuracaoPrazoDoAvisoPrevio) {
            return false;
        }
        return !(this.prazoAvisoInformado == null ? other.prazoAvisoInformado != null : !this.prazoAvisoInformado.equals(other.prazoAvisoInformado));
    }

    public Boolean getValidado() {
        return this.validado;
    }

    public void setValidado(Boolean validado) {
        this.validado = validado;
    }

    public Set<HistoricoValidacaoDoCalculo> getHistoricosValidacao() {
        return Utils.naoNulo(this.historicosValidacao) ? this.historicosValidacao : (this.historicosValidacao = new LinkedHashSet<HistoricoValidacaoDoCalculo>());
    }

    public void setHistoricosValidacao(Set<HistoricoValidacaoDoCalculo> historicosValidacao) {
        this.historicosValidacao = historicosValidacao;
    }

    public Set<HistoricoValidacaoDoCalculo> getHistoricosValidacaoAtualizacao() {
        return Utils.naoNulo(this.historicosValidacaoAtualizacao) ? this.historicosValidacaoAtualizacao : (this.historicosValidacaoAtualizacao = new LinkedHashSet<HistoricoValidacaoDoCalculo>());
    }

    public void setHistoricosValidacaoAtualizacao(Set<HistoricoValidacaoDoCalculo> historicosValidacaoAtualizacao) {
        this.historicosValidacaoAtualizacao = historicosValidacaoAtualizacao;
    }

    public Set<CartaoDePonto> getCartoesDePonto() {
        return Utils.naoNulo(this.cartoesDePonto) ? this.cartoesDePonto : (this.cartoesDePonto = new LinkedHashSet<CartaoDePonto>());
    }

    public void setCartoesDePonto(Set<CartaoDePonto> cartoesDePonto) {
        this.cartoesDePonto = cartoesDePonto;
    }

    public Boolean getHashCalculoCorreto() {
        return this.hashCalculoCorreto;
    }

    public void setHashCalculoCorreto(Boolean hashCalculoCorreto) {
        this.hashCalculoCorreto = hashCalculoCorreto;
    }

    public Boolean getHashAtualizacaoCorreto() {
        return this.hashAtualizacaoCorreto;
    }

    public void setHashAtualizacaoCorreto(Boolean hashAtualizacaoCorreto) {
        this.hashAtualizacaoCorreto = hashAtualizacaoCorreto;
    }

    public Set<Pagamento> getPagamentos() {
        return this.pagamentos;
    }

    public Atualizacao getAtualizacao() {
        return this.atualizacao;
    }

    public void setAtualizacao(Atualizacao atualizacao) {
        this.atualizacao = atualizacao;
    }

    public Boolean isCalculoExterno() {
        return this.calculoExterno;
    }

    public void setCalculoExterno(Boolean calculoExterno) {
        this.calculoExterno = calculoExterno;
    }

    public void adicionarHistoricoValidacaoCalculo(HistoricoValidacaoDoCalculo historicoValidacaoDoCalculo) {
        if (Utils.naoNulo(historicoValidacaoDoCalculo)) {
            historicoValidacaoDoCalculo.setCalculo(this);
            this.getHistoricosValidacao().add(historicoValidacaoDoCalculo);
        }
    }

    public void adicionarHistoricoValidacaoAtualizacao(HistoricoValidacaoDoCalculo historicoValidacaoDaAtualizacao) {
        if (Utils.naoNulo(historicoValidacaoDaAtualizacao)) {
            historicoValidacaoDaAtualizacao.setCalculo(this);
            this.getHistoricosValidacaoAtualizacao().add(historicoValidacaoDaAtualizacao);
        }
    }

    public BigDecimal calculaValorVerbaParaCreditoDoReclamante(Boolean considerarVerbasQueCompoemOPrincipal) {
        BigDecimal valorVerbas = null;
        if (considerarVerbasQueCompoemOPrincipal.booleanValue()) {
            valorVerbas = this.getTotalDeValorCorrigidoDaApuracaoDeJuros();
            valorVerbas = Utils.somar(valorVerbas, this.getTotalDeJurosDaApuracaoDeJuros(), valorVerbas);
        }
        if (this.getSalarioFamilia().getApurarSalarioFamilia().booleanValue() && this.getSalarioFamilia().isComporOPrincipal()) {
            valorVerbas = valorVerbas == null ? this.getSalarioFamilia().getTotalGeral() : Utils.somar(valorVerbas, this.getSalarioFamilia().getTotalGeral(), valorVerbas);
        }
        if (this.getSeguroDesemprego().getApurarSeguroDesemprego().booleanValue() && this.getSeguroDesemprego().isComporOPrincipal()) {
            valorVerbas = valorVerbas == null ? this.getSeguroDesemprego().getTotal() : Utils.somar(valorVerbas, this.getSeguroDesemprego().getTotal(), valorVerbas);
        }
        if (this.getFgts().getMultaDoArtigo467().booleanValue() && this.getFgts().isComporOPrincipal()) {
            valorVerbas = valorVerbas == null ? this.getFgts().getTotalDaMultaDoArtigo467() : Utils.somar(valorVerbas, this.getFgts().getTotalDaMultaDoArtigo467(), valorVerbas);
        }
        return valorVerbas;
    }

    public BigDecimal calculaValorFgtsParaCreditoDoReclamante() {
        BigDecimal valorFGTS = null;
        if (this.getFgts().isComporOPrincipal()) {
            if (!this.getFgts().getOcorrenciasVisiveisRelatorio().isEmpty()) {
                valorFGTS = this.getFgts().getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
            }
            if (this.getFgts().getMulta().booleanValue()) {
                valorFGTS = valorFGTS == null ? this.getFgts().getTotalDaMultaDoFgts() : Utils.somar(valorFGTS, this.getFgts().getTotalDaMultaDoFgts(), valorFGTS);
            }
            if (this.getFgts().getDeduzirDoFGTS().booleanValue()) {
                valorFGTS = valorFGTS == null ? this.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate() : Utils.subtrair(valorFGTS, this.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO), valorFGTS);
            }
        }
        return valorFGTS;
    }

    public ParcelasAtualizaveisCreditosReclamante getParcelasAtualizaveisCreditosReclamante() {
        return this.parcelasAtualizaveisCreditosReclamante;
    }

    public void setParcelasAtualizaveisCreditosReclamante(ParcelasAtualizaveisCreditosReclamante parcelasAtualizaveisCreditosReclamante) {
        this.parcelasAtualizaveisCreditosReclamante = parcelasAtualizaveisCreditosReclamante;
    }

    public ParcelasAtualizaveisDescontoCreditosReclamante getParcelasAtualizaveisDescontoCreditosReclamante() {
        return this.parcelasAtualizaveisDescontoCreditosReclamante;
    }

    public void setParcelasAtualizaveisDescontoCreditosReclamante(ParcelasAtualizaveisDescontoCreditosReclamante parcelasAtualizaveisDescontoCreditosReclamante) {
        this.parcelasAtualizaveisDescontoCreditosReclamante = parcelasAtualizaveisDescontoCreditosReclamante;
    }

    public ParcelasAtualizaveisOutrosDebitosReclamado getParcelasAtualizaveisOutrosDebitosReclamado() {
        return this.parcelasAtualizaveisOutrosDebitosReclamado;
    }

    public void setParcelasAtualizaveisOutrosDebitosReclamado(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        this.parcelasAtualizaveisOutrosDebitosReclamado = parcelasAtualizaveisOutrosDebitosReclamado;
    }

    public ParcelasAtualizaveisDebitosReclamante getParcelasAtualizaveisDebitosReclamante() {
        return this.parcelasAtualizaveisDebitosReclamante;
    }

    public void setParcelasAtualizaveisDebitosReclamante(ParcelasAtualizaveisDebitosReclamante parcelasAtualizaveisDebitosReclamante) {
        this.parcelasAtualizaveisDebitosReclamante = parcelasAtualizaveisDebitosReclamante;
    }

    public boolean hasCartaoDePontoComJornadaSemanalOuEscala() {
        List<ApuracaoCartaoDePonto> apuracoes = Calculo.getRepositorio(RepositorioDeApuracaoCartaoDePonto.class).obterApuracoesDeCartaoDoCalculo(this);
        if (apuracoes != null) {
            for (ApuracaoCartaoDePonto apuracaoCartaoDePonto : apuracoes) {
                if (apuracaoCartaoDePonto.getPreenchimentoJornadasCartao() == PreenchimentoJornadasCartaoEnum.LIVRE) continue;
                return true;
            }
        }
        return false;
    }

    public List<Date> encontrarFaltasQueReiniciamFerias() {
        ArrayList<Date> diasDeReinicio = new ArrayList<Date>();
        for (Falta falta : this.getFaltas()) {
            if (!falta.getReiniciarFerias().booleanValue()) continue;
            diasDeReinicio.add(HelperDate.getInstance(falta.getDataTerminoPeriodoFalta()).addDay(1).getDate());
        }
        Collections.sort(diasDeReinicio);
        return diasDeReinicio;
    }

    public String getVersaoDoSistema() {
        return this.versaoDoSistema;
    }

    public void setVersaoDoSistema(String versaoDoSistema) {
        this.versaoDoSistema = versaoDoSistema;
    }
}

