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
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.annotations.Where
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaCustasCalculadasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CustasDevidasFixasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeLiquidacaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDePaganteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustaPaga;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasWrapper;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.MaquinaDeCalculoDeCustas;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.RepositorioDeArmazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.RepositorioDeCustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.regras.DataVencimentoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.custas.ParametrosDeCustasFixas;
import br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado.TabelaPrevidenciariaSeguradoEmpregado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao;
import java.math.BigDecimal;
import java.util.Date;
import java.util.LinkedHashSet;
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
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.Where;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBCUSTASCALCULO")
@SequenceGenerator(name="SQCUSTASCALCULO", sequenceName="SQCUSTASCALCULO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="custasJudiciais")
public class CustasJudiciais
extends EntidadeBase
implements EventoAtualizacao {
    private static final long serialVersionUID = -5250189651050035237L;
    private static final int PRIORIDADE_ATUALIZACAO = 4;
    public static final int PISO_RECLAMADO = 1;
    public static final int PISO_RECLAMANTE = 2;
    public static final int TETO_LIQUIDACAO = 3;
    public static final BigDecimal QUATRO = new BigDecimal("4");
    public static final BigDecimal TAXA_RECLAMANTE_CONHECIMENTO;
    public static final BigDecimal TAXA_RECLAMADO_CONHECIMENTO;
    public static final BigDecimal TAXA_RECLAMADO_LIQUIDACAO;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCUSTASCALCULO")
    @Column(name="IIDCUSTAS")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="STPBASECUSTASCALCULADAS", columnDefinition="VARCHAR2(4)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="BaseParaCustasCalculadasEnum")})
    private BaseParaCustasCalculadasEnum baseParaCustasCalculadas = BaseParaCustasCalculadasEnum.BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO;
    @Column(name="STPCUSTASCONHECIMENTORTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeCustasDeConhecimentoEnum")})
    private TipoDeCustasDeConhecimentoEnum tipoDeCustasDeConhecimentoDoReclamante = TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA;
    @Column(name="DDTVENCCUSTASCONHECIMENTORTE", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @Required(condition="bean.tipoDeCustasDeConhecimentoDoReclamante.valor == 'I'")
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=1)
    private Date dataVencimentoConhecimentoDoReclamante;
    @Column(name="RVLCUSTASCONHECIMENTORTE", precision=38, scale=25, nullable=true)
    @Required(condition="bean.tipoDeCustasDeConhecimentoDoReclamante.valor == 'I'")
    private BigDecimal valorDeConhecimentoDoReclamante;
    @Column(name="STPCUSTASCONHECIMENTORDO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeCustasDeConhecimentoEnum")})
    private TipoDeCustasDeConhecimentoEnum tipoDeCustasDeConhecimentoDoReclamado = TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO;
    @Column(name="DDTVENCCUSTASCONHECIMENTORDO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @Required(condition="bean.tipoDeCustasDeConhecimentoDoReclamado.valor == 'I'")
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=2)
    private Date dataVencimentoConhecimentoDoReclamado;
    @Column(name="RVLCUSTASCONHECIMENTORDO", precision=38, scale=25, nullable=true)
    @Required(condition="bean.tipoDeCustasDeConhecimentoDoReclamado.valor == 'I'")
    private BigDecimal valorConhecimentoDoReclamado;
    @Column(name="STPCUSTASLIQUIDACAO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeCustasDeLiquidacaoEnum")})
    private TipoDeCustasDeLiquidacaoEnum tipoDeCustasDeLiquidacao = TipoDeCustasDeLiquidacaoEnum.NAO_SE_APLICA;
    @Column(name="DDTVENCIMENTOCUSTASLIQUIDACAO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @Required(condition="bean.tipoDeCustasDeLiquidacao.valor == 'I'")
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=3)
    private Date dataVencimentoCustasDeLiquidacao;
    @Column(name="RVLCUSTASLIQUIDACAO", precision=38, scale=25, nullable=true)
    @Required(condition="bean.tipoDeCustasDeLiquidacao.valor == 'I'")
    private BigDecimal valorCustasDeLiquidacao;
    @Column(name="DDTVENCIMENTOCUSTASFIXAS", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=4)
    private Date dataVencimentoCustasFixas;
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
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="custasJudiciais")
    @OrderBy(value="dataVencimentoAuto")
    private Set<AutoJudicial> autosJudiciais;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="custasJudiciais")
    @OrderBy(value="dataEvento")
    private Set<CustasFixasAtualizacao> custasFixasAtualizacao;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="custasJudiciais")
    @OrderBy(value="dataInicioArmazenamento")
    private Set<Armazenamento> armazenamentos;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="custasJudiciais")
    @Where(clause="STPPAGANTE = 'RD' ")
    @OrderBy(value="dataVencimento")
    private Set<CustaPaga> custasPagasDoReclamado;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="custasJudiciais")
    @Where(clause="STPPAGANTE = 'RT' ")
    @OrderBy(value="dataVencimento")
    private Set<CustaPaga> custasPagasDoReclamante;
    @Column(name="RVLBASECUSTASCALCULADAS", precision=38, scale=25, nullable=true)
    private BigDecimal valorBaseCustasCalculadas;
    @Column(name="RVLINDICECORRECAOCONHECRTE", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustasConhecimentoReclamante;
    @Column(name="RVLTAXAJUROSCONHECRTE", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasConhecimentoReclamante;
    @Column(name="RVLINDICECORRECAOCONHECRDO", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustasConhecimentoReclamado;
    @Column(name="RVLTAXAJUROSCONHECRDO", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasConhecimentoReclamado;
    @Column(name="RVLINDICECORRECAOLIQUIDACAO", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustasLiquidacao;
    @Column(name="RVLTAXAJUROSLIQUIDACAO", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasLiquidacao;
    @Column(name="RVLINDICECORRECAOFIXAS", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustasFixas;
    @Column(name="RVLTAXAJUROSFIXAS", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasFixas;
    @Column(name="RVLPISOCUSTASCONHECIMENTORTE", precision=12, scale=2, nullable=true)
    private BigDecimal pisoCustasConhecimentoReclamante;
    @Column(name="RVLPISOCUSTASCONHECIMENTORDO", precision=12, scale=2, nullable=true)
    private BigDecimal pisoCustasConhecimentoReclamado;
    @Column(name="RVLTETOCUSTASCONHECIMENTORTE", precision=12, scale=2, nullable=true)
    private BigDecimal tetoCustasConhecimentoReclamante;
    @Column(name="RVLTETOCUSTASCONHECIMENTORDO", precision=12, scale=2, nullable=true)
    private BigDecimal tetoCustasConhecimentoReclamado;
    @Column(name="RVLTETOCUSTASLIQUIDACAO", precision=12, scale=2, nullable=true)
    private BigDecimal tetoCustasLiquidacao;
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
    @Column(name="IFOLHAEVENTO", columnDefinition="VARCHAR2(80)")
    private String folhaDoEvento;
    @Column(name="SFLCOBRANCARECLAMANTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoCobrancaReclamanteEnum")})
    private TipoCobrancaReclamanteEnum tipoCobrancaReclamante = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
    @Column(name="SFLCUSTASCONHECIMENTOCALCEXT", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarTetoCustasConhecimentoCalcExterno = Boolean.FALSE;
    @Transient
    private ParametrosDeCustasFixas parametros = null;
    @Transient
    protected MaquinaDeCalculoDeCustas maquinaDeCalculoDeCustas = new MaquinaDeCalculoDeCustas(this);

    public CustasJudiciais() {
        super(RepositorioDeCustasJudiciais.class);
        this.autosJudiciais = new LinkedHashSet<AutoJudicial>();
        this.armazenamentos = new LinkedHashSet<Armazenamento>();
        this.custasPagasDoReclamado = new LinkedHashSet<CustaPaga>();
        this.custasPagasDoReclamante = new LinkedHashSet<CustaPaga>();
    }

    public CustasJudiciais(Calculo calculo) {
        this();
        this.calculo = calculo;
    }

    public static BigDecimal calcularValorTetoCustasConhecimento(HelperDate dataLiquidacao) {
        TabelaPrevidenciariaSeguradoEmpregado tabelaParaCompetencia = TabelaPrevidenciariaSeguradoEmpregado.obter(dataLiquidacao.setDay(1).getDate());
        BigDecimal tetoCustasConhecimento = null;
        if (Utils.naoNulo(tabelaParaCompetencia)) {
            tetoCustasConhecimento = tabelaParaCompetencia.getValorTetoBeneficio().multiply(QUATRO, Utils.CONTEXTO_MATEMATICO);
        } else {
            TabelaPrevidenciariaSeguradoEmpregado ultimoDaTabela = TabelaPrevidenciariaSeguradoEmpregado.obterAtual();
            tetoCustasConhecimento = ultimoDaTabela.getValorTetoBeneficio().multiply(QUATRO, Utils.CONTEXTO_MATEMATICO);
        }
        return tetoCustasConhecimento;
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
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
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

    public Set<AutoJudicial> getAutosJudiciais() {
        if (Utils.nulo(this.autosJudiciais)) {
            this.autosJudiciais = new LinkedHashSet<AutoJudicial>();
        }
        return this.autosJudiciais;
    }

    public void setAutosJudiciais(Set<AutoJudicial> autosJudiciais) {
        this.autosJudiciais = autosJudiciais;
    }

    public Set<AutoJudicial> getAutosJudiciaisDoCalculo() {
        LinkedHashSet<AutoJudicial> autosJudiciaisDoCalculo = new LinkedHashSet<AutoJudicial>();
        if (this.autosJudiciais != null) {
            for (AutoJudicial autoJudicial : this.autosJudiciais) {
                if (!autoJudicial.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO)) continue;
                autosJudiciaisDoCalculo.add(autoJudicial);
            }
            return autosJudiciaisDoCalculo;
        }
        return this.autosJudiciais;
    }

    public Set<AutoJudicial> getAutosJudiciaisDaAtualizacao() {
        LinkedHashSet<AutoJudicial> autosJudiciaisDaAtualizacao = new LinkedHashSet<AutoJudicial>();
        if (this.autosJudiciais != null) {
            for (AutoJudicial autoJudicial : this.autosJudiciais) {
                if (!autoJudicial.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) continue;
                autosJudiciaisDaAtualizacao.add(autoJudicial);
            }
            return autosJudiciaisDaAtualizacao;
        }
        return this.autosJudiciais;
    }

    public Set<Armazenamento> getArmazenamentos() {
        if (Utils.nulo(this.armazenamentos)) {
            this.armazenamentos = new LinkedHashSet<Armazenamento>();
        }
        return this.armazenamentos;
    }

    public void setArmazenamentos(Set<Armazenamento> armazenamentos) {
        this.armazenamentos = armazenamentos;
    }

    public Set<Armazenamento> getArmazenamentosDoCalculo() {
        LinkedHashSet<Armazenamento> armazenamentosDoCalculo = new LinkedHashSet<Armazenamento>();
        if (this.armazenamentos != null) {
            for (Armazenamento armazenamento : this.armazenamentos) {
                if (!armazenamento.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO)) continue;
                armazenamentosDoCalculo.add(armazenamento);
            }
            return armazenamentosDoCalculo;
        }
        return this.armazenamentos;
    }

    public Set<Armazenamento> getArmazenamentosDaAtualizacao() {
        LinkedHashSet<Armazenamento> armazenamentosDaAtualizacao = new LinkedHashSet<Armazenamento>();
        if (this.armazenamentos != null) {
            for (Armazenamento armazenamento : this.armazenamentos) {
                if (!armazenamento.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) continue;
                armazenamentosDaAtualizacao.add(armazenamento);
            }
            return armazenamentosDaAtualizacao;
        }
        return this.armazenamentos;
    }

    public Set<CustaPaga> getCustasPagasDoReclamado() {
        if (Utils.nulo(this.custasPagasDoReclamado)) {
            this.custasPagasDoReclamado = new LinkedHashSet<CustaPaga>();
        }
        return this.custasPagasDoReclamado;
    }

    public void setCustasPagasDoReclamado(Set<CustaPaga> custasPagasDoReclamado) {
        this.custasPagasDoReclamado = custasPagasDoReclamado;
    }

    public Set<CustaPaga> getCustasPagasDoReclamante() {
        if (Utils.nulo(this.custasPagasDoReclamante)) {
            this.custasPagasDoReclamante = new LinkedHashSet<CustaPaga>();
        }
        return this.custasPagasDoReclamante;
    }

    public void setCustasPagasDoReclamante(Set<CustaPaga> custasPagasDoReclamante) {
        this.custasPagasDoReclamante = custasPagasDoReclamante;
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

    public BigDecimal getValorCorrigidoCustasConhecimentoReclamado() {
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasConhecimentoReclamado(), this.getValorConhecimentoDoReclamado(), this.getValorConhecimentoDoReclamado());
    }

    public BigDecimal getValorCorrigidoCustasConhecimentoReclamante() {
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasConhecimentoReclamante(), this.getValorDeConhecimentoDoReclamante(), this.getValorDeConhecimentoDoReclamante());
    }

    public BigDecimal getValorCorrigidoCustasLiquidacao() {
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustasLiquidacao(), this.getValorCustasDeLiquidacao(), this.getValorCustasDeLiquidacao());
    }

    public BigDecimal getJurosCustasConhecimentoReclamado() {
        return Utils.aplicarJuros(this.getTaxaJurosCustasConhecimentoReclamado(), this.getValorCorrigidoCustasConhecimentoReclamado());
    }

    public BigDecimal getJurosCustasConhecimentoReclamante() {
        return Utils.aplicarJuros(this.getTaxaJurosCustasConhecimentoReclamante(), this.getValorCorrigidoCustasConhecimentoReclamante());
    }

    public BigDecimal getJurosCustasLiquidacao() {
        return Utils.aplicarJuros(this.getTaxaJurosCustasLiquidacao(), this.getValorCorrigidoCustasLiquidacao());
    }

    public BigDecimal getTotalCustasConhecimentoReclamadoCalculada() {
        BigDecimal valorBase = Utils.aplicarJuros(TAXA_RECLAMADO_CONHECIMENTO, this.getValorBaseCustasCalculadas());
        BigDecimal aposAplicarPiso = Utils.aplicarPiso(this.getPisoCustasConhecimentoReclamado(), valorBase);
        if (Utils.naoNulo(this.getTetoCustasConhecimentoReclamado())) {
            BigDecimal aposAplicarTeto = Utils.aplicarTeto(this.getTetoCustasConhecimentoReclamado(), aposAplicarPiso);
            return aposAplicarTeto;
        }
        return aposAplicarPiso;
    }

    public BigDecimal getTotalCustasLiquidacaoReclamadoCalculada() {
        return Utils.aplicarTeto(this.getTetoCustasLiquidacao(), Utils.aplicarJuros(TAXA_RECLAMADO_LIQUIDACAO, this.getValorBaseCustasCalculadas()));
    }

    public BigDecimal getTotalCustasConhecimentoReclamanteCalculada() {
        BigDecimal valorBase = Utils.aplicarJuros(TAXA_RECLAMANTE_CONHECIMENTO, this.getValorBaseCustasCalculadas());
        BigDecimal aposAplicarPiso = Utils.aplicarPiso(this.getPisoCustasConhecimentoReclamante(), valorBase);
        if (Utils.naoNulo(this.getTetoCustasConhecimentoReclamante())) {
            BigDecimal aposAplicarTeto = Utils.aplicarTeto(this.getTetoCustasConhecimentoReclamante(), aposAplicarPiso);
            return aposAplicarTeto;
        }
        return aposAplicarPiso;
    }

    public BigDecimal getTotalCustasConhecimentoReclamadoInformada() {
        BigDecimal valorBase = Utils.somar(this.getValorCorrigidoCustasConhecimentoReclamado(), this.getJurosCustasConhecimentoReclamado(), this.getValorCorrigidoCustasConhecimentoReclamado());
        return Utils.aplicarPiso(this.getPisoCustasConhecimentoReclamado(), valorBase);
    }

    public BigDecimal getTotalCustasLiquidacaoReclamadoInformada() {
        return Utils.aplicarTeto(this.getTetoCustasLiquidacao(), Utils.somar(this.getValorCorrigidoCustasLiquidacao(), this.getJurosCustasLiquidacao(), this.getValorCorrigidoCustasLiquidacao()));
    }

    public BigDecimal getTotalCustasConhecimentoReclamanteInformada() {
        BigDecimal valorBase = Utils.somar(this.getValorCorrigidoCustasConhecimentoReclamante(), this.getJurosCustasConhecimentoReclamante(), this.getValorCorrigidoCustasConhecimentoReclamante());
        return Utils.aplicarPiso(this.getPisoCustasConhecimentoReclamante(), valorBase);
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

    public Set<CustasFixasAtualizacao> getCustasFixasAtualizacao() {
        return this.custasFixasAtualizacao;
    }

    public void setCustasFixasAtualizacao(Set<CustasFixasAtualizacao> custasFixasAtualizacao) {
        this.custasFixasAtualizacao = custasFixasAtualizacao;
    }

    public String getFolhaDoEvento() {
        return this.folhaDoEvento;
    }

    public void setFolhaDoEvento(String folhaDoEvento) {
        this.folhaDoEvento = folhaDoEvento;
    }

    @Override
    public void salvar() {
        this.consistirDados();
        super.salvar();
    }

    @Override
    protected CustasJudiciais validar() {
        BigDecimal tetoLiquidacao;
        BigDecimal pisoReclamante;
        GerenciadorDeValidadores.getInstance().validar(CustasJudiciais.class, this);
        NegocioException excecao = new NegocioException();
        BigDecimal pisoReclamado = this.obterValorParaValidacao(this.getDataVencimentoConhecimentoDoReclamado(), this.getValorConhecimentoDoReclamado(), 1);
        if (Utils.naoNulo(pisoReclamado)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorConhecimentoDoReclamado", Mensagens.MSG0052, Utils.formatarNumero(pisoReclamado)));
        }
        if (Utils.naoNulo(pisoReclamante = this.obterValorParaValidacao(this.getDataVencimentoConhecimentoDoReclamante(), this.getValorDeConhecimentoDoReclamante(), 2))) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorDeConhecimentoDoReclamante", Mensagens.MSG0052, Utils.formatarNumero(pisoReclamante)));
        }
        if (Utils.naoNulo(tetoLiquidacao = this.obterValorParaValidacao(this.getDataVencimentoCustasDeLiquidacao(), this.getValorCustasDeLiquidacao(), 3))) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorCustasDeLiquidacao", Mensagens.MSG0054, Utils.formatarNumero(tetoLiquidacao)));
        }
        if (Utils.naoNulo(this.dataVencimentoCustasFixas)) {
            this.parametros = ParametrosDeCustasFixas.obterRegistroMaisAntigo();
            if (Utils.naoNulo(this.parametros) && HelperDate.dateBefore(this.dataVencimentoCustasFixas, this.parametros.getDataInicio())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataVencimentoCustasFixas", Mensagens.MSG0053, new Object[0]));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public BigDecimal obterValorParaValidacao(Date vencimento, BigDecimal valorComparavel, int flagValidacao) {
        if (Utils.nulo(vencimento)) {
            return null;
        }
        if (Utils.nulo(this.parametros)) {
            this.parametros = ParametrosDeCustasFixas.obterPorData(vencimento);
        } else if (!this.parametros.isDataContidaNaVigencia(vencimento)) {
            this.parametros = ParametrosDeCustasFixas.obterPorData(vencimento);
        }
        if (Utils.nulo(this.parametros)) {
            return null;
        }
        switch (flagValidacao) {
            case 1: 
            case 2: {
                if (valorComparavel.compareTo(this.parametros.getValorPisoCustasConhecimento()) >= 0) break;
                return this.parametros.getValorPisoCustasConhecimento();
            }
            case 3: {
                if (valorComparavel.compareTo(this.parametros.getValorTetoCustasLiquidacao()) <= 0) break;
                return this.parametros.getValorTetoCustasLiquidacao();
            }
        }
        return null;
    }

    private void consistirDados() {
        if (Utils.nulo(this.dataVencimentoCustasFixas)) {
            this.resetarQuantidades();
        }
        if (TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA.equals((Object)this.getTipoDeCustasDeConhecimentoDoReclamante())) {
            this.setTipoCobrancaReclamante(TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO);
        }
        this.resetarDadosConhecimentoReclamadoInformado();
        this.resetarDadosConhecimentoReclamanteInformado();
        this.resetarDadosLiquidacao();
    }

    private void resetarQuantidades() {
        this.qtdeAgravosDeInstrumento = null;
        this.qtdeAgravosDePeticao = null;
        this.qtdeAtosRurais = null;
        this.qtdeAtosUrbanos = null;
        this.qtdeEmbargosArrematacao = null;
        this.qtdeEmbargosExecucao = null;
        this.qtdeEmbargosTerceiros = null;
        this.qtdeImpugnacaoSentenca = null;
        this.qtdeRecursoRevista = null;
    }

    public void resetarDadosConhecimentoReclamadoInformado() {
        if (TipoDeCustasDeConhecimentoEnum.INFORMADA != this.tipoDeCustasDeConhecimentoDoReclamado) {
            this.dataVencimentoConhecimentoDoReclamado = null;
            this.valorConhecimentoDoReclamado = null;
        }
    }

    public void resetarDadosConhecimentoReclamanteInformado() {
        if (TipoDeCustasDeConhecimentoEnum.INFORMADA != this.tipoDeCustasDeConhecimentoDoReclamante) {
            this.dataVencimentoConhecimentoDoReclamante = null;
            this.valorDeConhecimentoDoReclamante = null;
        }
    }

    public void resetarDadosLiquidacao() {
        if (TipoDeCustasDeLiquidacaoEnum.INFORMADA != this.tipoDeCustasDeLiquidacao) {
            this.dataVencimentoCustasDeLiquidacao = null;
            this.valorCustasDeLiquidacao = null;
        }
    }

    public static CustasJudiciais obter(long id) {
        return (CustasJudiciais)CustasJudiciais.obter(RepositorioDeCustasJudiciais.class, id);
    }

    public static void remover(CustasJudiciais entidade) {
        CustasJudiciais.getRepositorio(RepositorioDeCustasJudiciais.class).remover(entidade);
    }

    public void adicionar(AutoJudicial autoJudicial) {
        autoJudicial.setCustasJudiciais(this);
        autoJudicial.validar();
        this.getAutosJudiciais().add(autoJudicial);
    }

    public void removerDeLista(AutoJudicial autoJudicial) {
        this.getAutosJudiciais().remove(autoJudicial);
    }

    public void adicionar(Armazenamento armazenamento) {
        armazenamento.setCustasJudiciais(this);
        armazenamento.validar();
        this.getArmazenamentos().add(armazenamento);
    }

    public void removerDeLista(Armazenamento armazenamento) {
        this.getArmazenamentos().remove(armazenamento);
    }

    public void adicionarCustaPagaReclamado(CustaPaga custaPaga) {
        custaPaga.setCustasJudiciais(this);
        custaPaga.setTipoDePagante(TipoDePaganteEnum.RECLAMADO);
        custaPaga.validar();
        this.getCustasPagasDoReclamado().add(custaPaga);
    }

    public void removerDeListaCustasPagasReclamado(CustaPaga custaPaga) {
        this.getCustasPagasDoReclamado().remove(custaPaga);
    }

    public void adicionarCustaPagaReclamante(CustaPaga custaPaga) {
        custaPaga.setCustasJudiciais(this);
        custaPaga.setTipoDePagante(TipoDePaganteEnum.RECLAMANTE);
        custaPaga.validar();
        this.getCustasPagasDoReclamante().add(custaPaga);
    }

    public void removerDeListaCustasPagasReclamante(CustaPaga custaPaga) {
        this.getCustasPagasDoReclamante().remove(custaPaga);
    }

    public void liquidar() {
        this.maquinaDeCalculoDeCustas.liquidar();
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
        if (!this.getAutosJudiciaisDoCalculo().isEmpty()) {
            return true;
        }
        if (!this.getArmazenamentosDoCalculo().isEmpty()) {
            return true;
        }
        if (!this.getCustasPagasDoReclamado().isEmpty()) {
            return true;
        }
        return !this.getCustasPagasDoReclamante().isEmpty();
    }

    @Override
    public Integer getPrioridade() {
        return 4;
    }

    public TipoCobrancaReclamanteEnum getTipoCobrancaReclamante() {
        return this.tipoCobrancaReclamante;
    }

    public void setTipoCobrancaReclamante(TipoCobrancaReclamanteEnum tipoCobrancaReclamante) {
        this.tipoCobrancaReclamante = tipoCobrancaReclamante;
    }

    public Boolean getAplicarTetoCustasConhecimentoCalcExterno() {
        return this.aplicarTetoCustasConhecimentoCalcExterno;
    }

    public void setAplicarTetoCustasConhecimentoCalcExterno(Boolean aplicarTetoCustasConhecimentoCalcExterno) {
        this.aplicarTetoCustasConhecimentoCalcExterno = aplicarTetoCustasConhecimentoCalcExterno;
    }

    public void removerCustasArmazenamentoDoCalculo() {
        Set<Armazenamento> armazenamentoARemover = this.getArmazenamentosDoCalculo();
        for (Armazenamento armazenamento : armazenamentoARemover) {
            Armazenamento.remover(RepositorioDeArmazenamento.class, armazenamento, false);
            this.removerDeLista(armazenamento);
        }
    }

    public BigDecimal encontrarValorConsolidadoDoReclamado() {
        BigDecimal valorCustasReclamado = null;
        if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.getTipoDeCustasDeConhecimentoDoReclamado())) {
            valorCustasReclamado = this.getTotalCustasConhecimentoReclamadoInformada();
        } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.getTipoDeCustasDeConhecimentoDoReclamado())) {
            valorCustasReclamado = this.getTotalCustasConhecimentoReclamadoCalculada();
        }
        if (TipoDeCustasDeLiquidacaoEnum.INFORMADA.equals((Object)this.getTipoDeCustasDeLiquidacao())) {
            valorCustasReclamado = valorCustasReclamado == null ? this.getTotalCustasLiquidacaoReclamadoInformada() : Utils.somar(valorCustasReclamado, this.getTotalCustasLiquidacaoReclamadoInformada(), valorCustasReclamado);
        } else if (TipoDeCustasDeLiquidacaoEnum.CALCULADA_MEIO_POR_CENTO.equals((Object)this.getTipoDeCustasDeLiquidacao())) {
            valorCustasReclamado = valorCustasReclamado == null ? this.getTotalCustasLiquidacaoReclamadoCalculada() : Utils.somar(valorCustasReclamado, this.getTotalCustasLiquidacaoReclamadoCalculada(), valorCustasReclamado);
        }
        for (CustasDevidasFixasEnum custasDevidasFixasEnum : CustasDevidasFixasEnum.values()) {
            CustasFixasWrapper fixa = new CustasFixasWrapper(this.getDataVencimentoCustasFixas(), custasDevidasFixasEnum.getDescricao(), custasDevidasFixasEnum.getBase(this), custasDevidasFixasEnum.getQuantidade(this), custasDevidasFixasEnum.getValor(this), this.getIndiceCorrecaoCustasFixas(), this.getTaxaJurosCustasFixas());
            if (fixa.getTotal() == null || fixa.getTotal().compareTo(BigDecimal.ZERO) == 0) continue;
            valorCustasReclamado = valorCustasReclamado == null ? fixa.getTotal() : Utils.somar(valorCustasReclamado, fixa.getTotal(), valorCustasReclamado);
        }
        for (AutoJudicial auto : this.getAutosJudiciaisDoCalculo()) {
            if (valorCustasReclamado == null) {
                valorCustasReclamado = auto.getTotal();
                continue;
            }
            valorCustasReclamado = Utils.somar(valorCustasReclamado, auto.getTotal(), valorCustasReclamado);
        }
        for (Armazenamento armazenamento : this.getArmazenamentosDoCalculo()) {
            if (valorCustasReclamado == null) {
                valorCustasReclamado = armazenamento.getTotal();
                continue;
            }
            valorCustasReclamado = Utils.somar(valorCustasReclamado, armazenamento.getTotal(), valorCustasReclamado);
        }
        if (valorCustasReclamado != null) {
            for (CustaPaga custaPaga : this.getCustasPagasDoReclamado()) {
                valorCustasReclamado = Utils.subtrair(valorCustasReclamado, custaPaga.getTotal(), valorCustasReclamado);
            }
            if (BigDecimal.ZERO.compareTo(valorCustasReclamado) > 0) {
                valorCustasReclamado = BigDecimal.ZERO;
            }
        }
        return valorCustasReclamado;
    }

    static {
        TAXA_RECLAMADO_CONHECIMENTO = TAXA_RECLAMANTE_CONHECIMENTO = new BigDecimal("2.0");
        TAXA_RECLAMADO_LIQUIDACAO = new BigDecimal("0.5");
    }
}

