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
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.AliquotaDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IncidenciaDeMultaDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceDeCorrecaoDoFGTSEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeBaseDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDepositadoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ValorDaMultaDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.LegendaDaFormulaDoFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.MaquinaDeCalculoDoFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgtsOptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OperacaoDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OperacaoDeFgtsOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.RepositorioDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.TotalizadorDoFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.regras.PeriodoDoFgtsValidRule;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.LinkedList;
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
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBFGTSCALCULO")
@SequenceGenerator(name="SQFGTSCALCULO", sequenceName="SQFGTSCALCULO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="fgts")
public class Fgts
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = 1349930108234286933L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQFGTSCALCULO")
    @Column(name="IIDFGTSCALCULO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="DDTINICIO")
    @Temporal(value=TemporalType.DATE)
    @Required
    private Date periodoInicial;
    @Column(name="DDTFIM")
    @Temporal(value=TemporalType.DATE)
    @GreaterOrEqualThan(value="periodoInicial")
    @Required
    private Date periodoFinal;
    @Column(name="STPDESTINO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="DestinoDoFgtsEnum")})
    @Required
    private DestinoDoFgtsEnum destinoDoFgts = DestinoDoFgtsEnum.DEPOSITAR;
    @Column(name="STPALIQUOTA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="AliquotaDoFgtsEnum")})
    @Required
    private AliquotaDoFgtsEnum aliquota = AliquotaDoFgtsEnum.OITO_POR_CENTO;
    @Column(name="SFLMULTA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean multa = false;
    @Column(name="SFLEXCLUIRFGTSAVISODAMULTA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean excluirAvisoDaMulta = true;
    @Column(name="STPVALORMULTA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeBaseDoFgtsEnum")})
    @Required(condition="bean.multa")
    private TipoDeBaseDoFgtsEnum tipoDoValorDaMulta = TipoDeBaseDoFgtsEnum.CALCULADA;
    @Column(name="RVLINFORMADOMULTA", precision=38, scale=38)
    @Required(condition="bean.tipoDoValorDaMulta.valor == 'I'")
    private BigDecimal valorInformadoDaMulta;
    @Column(name="SVLMULTA", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="ValorDaMultaDoFgtsEnum")})
    private ValorDaMultaDoFgtsEnum multaDoFgts = ValorDaMultaDoFgtsEnum.QUARENTA_POR_CENTO;
    @Column(name="STPINCIDENCIAMULTA", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IncidenciaDeMultaDoFgtsEnum")})
    private IncidenciaDeMultaDoFgtsEnum incidenciaDoFgts = IncidenciaDeMultaDoFgtsEnum.SOBRE_O_TOTAL_DEVIDO;
    @Column(name="SFLMULTA467CLT", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean multaDoArtigo467 = false;
    @Column(name="SFLMULTALC1102001", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean multa10 = false;
    @Column(name="SFLCONTRIBUICAOSOCIAL", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean contribuicaoSocial05 = false;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="fgts")
    @OrderBy(value="competencia")
    private Set<OperacaoDeFgts> operacoesDeFgts;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="fgts")
    @Where(clause="IIDOCORRENCIAFGTSORIGINAL IS NOT NULL")
    @OrderBy(value="ocorrencia")
    private Set<OcorrenciaDeFgts> ocorrencias;
    @Column(name="SFLDEDUZIRDOFGTS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean deduzirDoFGTS = false;
    @Column(name="SFLFGTSBASEPENSAO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidenciaPensaoAlimenticia = Boolean.FALSE;
    @Column(name="SFLMULTAFGTSBASEPENSAO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidenciaPensaoAlimenticiaSobreMulta = Boolean.FALSE;
    @Transient
    private TotalizadorDoFgts totalizador;
    @Transient
    private BigDecimal valorDaMultaDoFgts;
    @Transient
    protected MaquinaDeCalculoDoFgts maquinaDeCalculoDoFgts;
    @Transient
    private LegendaDaFormulaDoFgts legendaDaFormula;
    @Transient
    private Set<OcorrenciaDeFgts> ocorrenciasComContribuicaoSocial;
    @Transient
    private Set<OcorrenciaDeFgts> ocorrenciasVisiveisRelatorio = new LinkedHashSet<OcorrenciaDeFgts>();
    @Column(name="RVLINDICEUTILIZADOMULTA", precision=38, scale=25)
    private BigDecimal indiceMulta;
    @Column(name="RVLINDICEUTILIZADOMULTA467", precision=38, scale=25)
    private BigDecimal indiceMulta467;
    @Column(name="RVLTAXAJUROSDEMISSAO", precision=38, scale=25)
    private BigDecimal taxaDeJurosParaDataDemissao;
    @Column(name="SFLCOMPORPRINCIPAL", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="LogicoEnum")})
    private LogicoEnum comporPrincipal = LogicoEnum.SIM;

    public Fgts() {
        super(RepositorioDeFgts.class);
        this.operacoesDeFgts = new LinkedHashSet<OperacaoDeFgts>();
        this.maquinaDeCalculoDoFgts = new MaquinaDeCalculoDoFgts(this);
    }

    public Fgts(Calculo calculo) {
        this();
        this.calculo = calculo;
        if (!this.calculo.isCalculoExterno().booleanValue()) {
            this.sugerirValores();
        }
    }

    protected TotalizadorDoFgts getTotalizador() {
        if (Utils.nulo(this.totalizador)) {
            this.totalizador = new TotalizadorDoFgts(this);
        }
        return this.totalizador;
    }

    private void consistirSaldoEOSaque() {
        boolean errado;
        boolean bl = errado = this.getDeduzirDoFGTS() == false && !this.getOperacoesDeFgts().isEmpty() && (!this.isMultaCalculada() || IncidenciaDeMultaDoFgtsEnum.SOBRE_O_TOTAL_DEVIDO.equals((Object)this.getIncidenciaDoFgts()) || IncidenciaDeMultaDoFgtsEnum.SOBRE_DIFERENCA.equals((Object)this.getIncidenciaDoFgts()));
        if (errado) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0055, new Object[0]));
        }
    }

    private void validarValorInformadoDaMulta() {
        if (this.getMulta().booleanValue() && this.isMultaInformada() && this.getValorInformadoDaMulta().compareTo(BigDecimal.ZERO) == 0) {
            throw new NegocioException(new MensagemDeRecurso("valorInformadoDaMulta", Mensagens.MSG0004, "Valor"));
        }
    }

    private void consistirDados() {
        if (this.isMultaCalculada()) {
            this.valorInformadoDaMulta = null;
        }
    }

    @Override
    protected EntidadeBase validar() {
        this.validarCampos();
        this.consistirSaldoEOSaque();
        this.consistirDados();
        return super.validar();
    }

    public void validarCampos() {
        GerenciadorDeValidadores.getInstance().validar(Fgts.class, this);
        NegocioException excecao = new NegocioException();
        Periodo periodo = this.getCalculo().obterPeriodoDoCalculoParaRestricao(Boolean.FALSE, Boolean.TRUE);
        periodo.setInicial(periodo.obterDataInicialHelper().getDate());
        periodo.setFinal(periodo.obterDataFinalHelper().getDate());
        if (!periodo.isPeriodoContemEsta(this.periodoInicial)) {
            if (periodo.isDataMenorQueIncial(this.periodoInicial)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoInicial", Mensagens.MSG0008, "Data Inicial", periodo.getLabelDataIncial()));
            } else {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoInicial", Mensagens.MSG0010, "Data Inicial", periodo.getLabelDataFinal()));
            }
        }
        if (!periodo.isPeriodoContemEsta(this.periodoFinal)) {
            if (periodo.isDataMaiorQueFinal(this.periodoFinal)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoFinal", Mensagens.MSG0010, "Data Final", periodo.getLabelDataFinal()));
            } else {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoFinal", Mensagens.MSG0008, "Data Final", periodo.getLabelDataIncial()));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
    }

    @Override
    public void salvar() {
        this.validarValorInformadoDaMulta();
        super.salvar();
    }

    public static void remover(Fgts entidade) {
        Fgts.getRepositorio(RepositorioDeFgts.class).remover(entidade);
    }

    public void gerarOcorrencias() {
        Fgts.getRepositorio(RepositorioDeFgts.class).gerarOcorrencias(this);
    }

    public void gerarOcorrencias(boolean manterAlteracoes, boolean flush) {
        Fgts.getRepositorio(RepositorioDeFgts.class).gerarOcorrencias(this, manterAlteracoes, flush);
    }

    public static Fgts obter(long id) {
        return (Fgts)Fgts.obter(RepositorioDeFgts.class, id);
    }

    public static Fgts obterPorCalculo(Calculo calculo) {
        return Fgts.getRepositorio(RepositorioDeFgts.class).obterPorCalculo(calculo);
    }

    public static Fgts obterComProtecao(long id) {
        return (Fgts)Fgts.obterComProtecao(RepositorioDeFgts.class, id);
    }

    private void sugerirPeriodo() {
        Periodo periodoSugerido = new PeriodoDoFgtsValidRule().getPeriodoSugerido(this);
        this.setPeriodoInicial(periodoSugerido.getInicial());
        this.setPeriodoFinal(periodoSugerido.getFinal());
    }

    public void sugerirValores() {
        this.sugerirPeriodo();
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

    public Set<OcorrenciaDeFgts> getOcorrencias() {
        return this.ocorrencias;
    }

    public List<OcorrenciaDeFgts> getOcorrenciasNaoOriginais() {
        LinkedList<OcorrenciaDeFgts> lista = new LinkedList<OcorrenciaDeFgts>();
        for (OcorrenciaDeFgts ocorrencia : this.getOcorrencias()) {
            if (!Utils.naoNulo(ocorrencia.getOcorrenciaOriginal())) continue;
            lista.add(ocorrencia);
        }
        return lista;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public void setOcorrencias(Set<OcorrenciaDeFgts> ocorrencias) {
        this.ocorrencias = ocorrencias;
    }

    public Date getPeriodoInicial() {
        return this.periodoInicial;
    }

    public void setPeriodoInicial(Date periodoInicial) {
        this.periodoInicial = periodoInicial;
    }

    public Date getPeriodoFinal() {
        return this.periodoFinal;
    }

    public void setPeriodoFinal(Date periodoFinal) {
        this.periodoFinal = periodoFinal;
    }

    public DestinoDoFgtsEnum getDestinoDoFgts() {
        return this.destinoDoFgts;
    }

    public void setDestinoDoFgts(DestinoDoFgtsEnum destinoDoFgts) {
        this.destinoDoFgts = destinoDoFgts;
    }

    public AliquotaDoFgtsEnum getAliquota() {
        return this.aliquota;
    }

    public void setAliquota(AliquotaDoFgtsEnum aliquota) {
        this.aliquota = aliquota;
    }

    public Boolean getMulta() {
        return this.multa;
    }

    public void setMulta(Boolean multa) {
        this.multa = multa;
    }

    public Boolean getExcluirAvisoDaMulta() {
        return this.excluirAvisoDaMulta;
    }

    public void setExcluirAvisoDaMulta(Boolean excluirAvisoDaMulta) {
        this.excluirAvisoDaMulta = excluirAvisoDaMulta;
    }

    public ValorDaMultaDoFgtsEnum getMultaDoFgts() {
        return this.multaDoFgts;
    }

    public void setMultaDoFgts(ValorDaMultaDoFgtsEnum multaDoFgts) {
        this.multaDoFgts = multaDoFgts;
    }

    public IncidenciaDeMultaDoFgtsEnum getIncidenciaDoFgts() {
        return this.incidenciaDoFgts;
    }

    public void setIncidenciaDoFgts(IncidenciaDeMultaDoFgtsEnum incidenciaDoFgts) {
        this.incidenciaDoFgts = incidenciaDoFgts;
    }

    public Boolean getMultaDoArtigo467() {
        return this.multaDoArtigo467;
    }

    public void setMultaDoArtigo467(Boolean multaDoArtigo467) {
        this.multaDoArtigo467 = multaDoArtigo467;
    }

    public Boolean getMulta10() {
        return this.multa10;
    }

    public void setMulta10(Boolean multa10) {
        this.multa10 = multa10;
    }

    public Boolean getContribuicaoSocial05() {
        return this.contribuicaoSocial05;
    }

    public void setContribuicaoSocial05(Boolean contribuicaoSocial05) {
        this.contribuicaoSocial05 = contribuicaoSocial05;
    }

    public IndiceDeCorrecaoDoFGTSEnum getCorrecaoMonetaria() {
        return this.getCalculo().getParametrosDeAtualizacao().getIndiceDeCorrecaoDoFGTS();
    }

    public Set<OperacaoDeFgts> getOperacoesDeFgts() {
        if (Utils.nulo(this.operacoesDeFgts)) {
            this.operacoesDeFgts = new LinkedHashSet<OperacaoDeFgts>();
        }
        return this.operacoesDeFgts;
    }

    public void setOperacoesDeFgts(Set<OperacaoDeFgts> operacoesDeFgts) {
        this.operacoesDeFgts = operacoesDeFgts;
    }

    public Boolean getDeduzirDoFGTS() {
        return this.deduzirDoFGTS;
    }

    public void setDeduzirDoFGTS(Boolean deduzirDoFGTS) {
        this.deduzirDoFGTS = deduzirDoFGTS;
    }

    public Boolean getIncidenciaPensaoAlimenticia() {
        return this.incidenciaPensaoAlimenticia;
    }

    public void setIncidenciaPensaoAlimenticia(Boolean incidenciaPensaoAlimenticia) {
        this.incidenciaPensaoAlimenticia = incidenciaPensaoAlimenticia;
    }

    public Boolean getIncidenciaPensaoAlimenticiaSobreMulta() {
        return this.incidenciaPensaoAlimenticiaSobreMulta;
    }

    public void setIncidenciaPensaoAlimenticiaSobreMulta(Boolean incidenciaPensaoAlimenticiaSobreMulta) {
        this.incidenciaPensaoAlimenticiaSobreMulta = incidenciaPensaoAlimenticiaSobreMulta;
    }

    public boolean isDeveCobrarMulta() {
        return Utils.naoNulo(this.getCalculo().getDataDemissao());
    }

    public void controlarAplicacaoMultaDoFgts() {
        if (!this.isDeveCobrarMulta()) {
            this.setMulta(false);
            this.setMultaDoArtigo467(false);
        }
    }

    public Long getId() {
        return this.id;
    }

    public void limparOcorrencias() {
        this.limparOcorrencias(true);
    }

    public void limparOcorrencias(boolean flush) {
        Fgts.getRepositorio(RepositorioDeFgts.class).limparOcorrencias(this, flush);
    }

    public void removerDeOcorrencias(List<OcorrenciaDeFgts> filhos) {
        Fgts.getRepositorio(RepositorioDeFgts.class).removerDeOcorrencias(this, filhos, true);
    }

    public void removerDeOcorrencias(List<OcorrenciaDeFgts> filhos, boolean flush) {
        Fgts.getRepositorio(RepositorioDeFgts.class).removerDeOcorrencias(this, filhos, flush);
    }

    public void adicionarEmOperacoesDeFgts(OperacaoDeFgts operacaoDeFgts) {
        this.getTotalizador().resetDepositadoESacado();
        Fgts.getRepositorio(RepositorioDeFgts.class).adicionarEmOperacoesDeFgts(this, operacaoDeFgts);
    }

    public void removerDeOperacoesDeFgts(OperacaoDeFgts operacaoDeFgts) {
        this.getTotalizador().resetDepositadoESacado();
        Fgts.getRepositorio(RepositorioDeFgts.class).removerDeOperacoesDeFgts(this, operacaoDeFgts);
    }

    public boolean isSomenteJurosJAM() {
        ParametrosDeAtualizacao parametrosDeAtualizacao = this.getCalculo().getParametrosDeAtualizacao();
        return IndiceDeCorrecaoDoFGTSEnum.UTILIZAR_INDICE_JAM.equals((Object)parametrosDeAtualizacao.getIndiceDeCorrecaoDoFGTS()) && parametrosDeAtualizacao.getJurosDeFgtsComJam() == false;
    }

    public BigDecimal getTotalDevido() {
        return this.getTotalizador().getDevido();
    }

    public BigDecimal getTotalDeJurosDoFgts(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return this.getTotalizador().getJuros(tipoDeCorrecao);
    }

    public BigDecimal getJurosDaMultaDoFgts() {
        if (this.isSomenteJurosJAM() || !this.calculo.getParametrosDeAtualizacao().isJurosHabilitado()) {
            return null;
        }
        return Utils.aplicarJuros(this.getTaxaDeJurosParaDataDemissao(), this.getValorDaMultaDoFgtsCorrigido(), BigDecimal.ZERO);
    }

    public BigDecimal getTotalDaMultaDoFgts() {
        return Utils.somar(this.getValorDaMultaDoFgtsCorrigido(), this.getJurosDaMultaDoFgts(), this.getValorDaMultaDoFgtsCorrigido());
    }

    public BigDecimal getJurosDaMultaDoArtigo467() {
        return Utils.aplicarJuros(this.getTaxaDeJurosParaDataDemissao(), this.getValorDaMultaDoArtigo467Corrigido(), BigDecimal.ZERO);
    }

    public BigDecimal getTotalDaMultaDoArtigo467() {
        return Utils.somar(this.getValorDaMultaDoArtigo467Corrigido(), this.getJurosDaMultaDoArtigo467(), this.getValorDaMultaDoArtigo467Corrigido());
    }

    public BigDecimal getTotalDeJurosDaContribuicaoSocial05() {
        return Utils.arredondarValorMonetario(this.getValorDaContribuicaoSocial05Corrigido().multiply(Utils.obterPercentualPara(this.getTaxaDeJurosParaDataDemissao()), Utils.CONTEXTO_MATEMATICO));
    }

    public BigDecimal getJurosDaMulta10() {
        if (this.isSomenteJurosJAM()) {
            return null;
        }
        return Utils.aplicarJuros(this.getTaxaDeJurosParaDataDemissao(), this.getValorDaMulta10Corrigida(), BigDecimal.ZERO);
    }

    public BigDecimal getTotalDaMulta10Corrigida() {
        if (Utils.nulo(this.getValorDaMulta10Corrigida())) {
            return null;
        }
        return Utils.somar(this.getValorDaMulta10Corrigida(), this.getJurosDaMulta10(), this.getValorDaMulta10Corrigida());
    }

    public BigDecimal getTotalDevidoCorrigido(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return this.getTotalizador().getDevidoCorrigido(tipoDeCorrecao);
    }

    public BigDecimal getTotalDevidoSemAvisoCorrigido(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return this.getTotalizador().getDevidoSemAvisoCorrigido(tipoDeCorrecao);
    }

    public BigDecimal getTotalDaDiferenca() {
        return this.getTotalizador().getDiferenca();
    }

    public BigDecimal getTotalDaDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return this.getTotalizador().getDiferencaCorrigida(tipoDeCorrecao);
    }

    public BigDecimal getTotalDaDiferencaSemAvisoCorrigida(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return this.getTotalizador().getDiferencaSemAvisoCorrigida(tipoDeCorrecao);
    }

    public BigDecimal getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return this.getTotalizador().getTotalCorrigido(tipoDeCorrecao);
    }

    public BigDecimal getTotalDoDepositadoOuSacado() {
        return this.getTotalizador().getDepositadoOuSacado();
    }

    public BigDecimal getTotalDoDepositadoOuSacadoCorrigido(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return this.getTotalizador().getDepositadoOuSacadoCorrigido(tipoDeCorrecao);
    }

    public BigDecimal getTotalDeJurosDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return this.getTotalizador().getJurosDoDepositadoOuSacado(tipoDeCorrecao);
    }

    public BigDecimal getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return this.getTotalDoDepositadoOuSacadoCorrigido(tipoDeCorrecao).add(this.getTotalDeJurosDoDepositadoOuSacado(tipoDeCorrecao), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getValorDaMultaDoFgts() {
        if (Boolean.FALSE.equals(this.multa)) {
            this.valorDaMultaDoFgts = BigDecimal.ZERO;
        }
        if (Utils.nulo(this.valorDaMultaDoFgts)) {
            this.valorDaMultaDoFgts = TipoDeBaseDoFgtsEnum.INFORMADA.equals((Object)this.getTipoDoValorDaMulta()) ? this.getValorInformadoDaMulta() : this.multaDoFgts.calcular(this.getValorBaseParaMultaDoFgts());
        }
        return this.valorDaMultaDoFgts;
    }

    public BigDecimal getValorDaMultaDoFgtsCorrigido() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.indiceMulta, this.getValorDaMultaDoFgts()));
    }

    private BigDecimal calcularBaseDaMultaDoFgts(IncidenciaDeMultaDoFgtsEnum incidencia) {
        if (TipoDeBaseDoFgtsEnum.INFORMADA.equals((Object)this.getTipoDoValorDaMulta())) {
            return null;
        }
        if (!Boolean.TRUE.equals(this.multa)) {
            return BigDecimal.ZERO;
        }
        if (incidencia == null) {
            throw new NegocioException(new MensagemDeRecurso("incidencia", Mensagens.MSG0166, "Incid\u00eancia"));
        }
        switch (incidencia) {
            case SOBRE_O_TOTAL_DEVIDO: {
                BigDecimal totalDevidoCorrigido = this.getExcluirAvisoDaMulta() != false ? this.getTotalDevidoSemAvisoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO) : this.getTotalDevidoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                return Utils.arredondarValorMonetario(Utils.dividir(totalDevidoCorrigido, this.getIndiceMulta()));
            }
            case SOBRE_DEPOSITADO_SACADO: {
                BigDecimal depositadoSacado = this.getTotalDoDepositadoOuSacadoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                return Utils.arredondarValorMonetario(Utils.dividir(depositadoSacado, this.getIndiceMulta()));
            }
            case SOBRE_DIFERENCA: {
                BigDecimal totalDiferencaCorrigido = this.getExcluirAvisoDaMulta() != false ? this.getTotalDaDiferencaSemAvisoCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO) : this.getTotalDaDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                return Utils.arredondarValorMonetario(Utils.dividir(totalDiferencaCorrigido, this.getIndiceMulta()));
            }
            case SOBRE_TOTAL_DEVIDO_MAIS_SAQUE_E_OU_SALDO: {
                return this.calcularBaseDaMultaDoFgts(IncidenciaDeMultaDoFgtsEnum.SOBRE_O_TOTAL_DEVIDO).add(this.calcularBaseDaMultaDoFgts(IncidenciaDeMultaDoFgtsEnum.SOBRE_DEPOSITADO_SACADO), Utils.CONTEXTO_MATEMATICO);
            }
            case SOBRE_TOTAL_DEVIDO_MENOS_SAQUE_E_OU_SALDO: {
                return this.calcularBaseDaMultaDoFgts(IncidenciaDeMultaDoFgtsEnum.SOBRE_O_TOTAL_DEVIDO).subtract(this.calcularBaseDaMultaDoFgts(IncidenciaDeMultaDoFgtsEnum.SOBRE_DEPOSITADO_SACADO), Utils.CONTEXTO_MATEMATICO);
            }
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getValorBaseParaMultaDoFgts() {
        return this.calcularBaseDaMultaDoFgts(this.incidenciaDoFgts);
    }

    public BigDecimal getValorDaMultaDoArtigo467() {
        if (!Boolean.TRUE.equals(this.multaDoArtigo467)) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(this.getValorDaMultaDoFgts().multiply(new BigDecimal("0.50"), Utils.CONTEXTO_MATEMATICO));
    }

    public BigDecimal getValorDaMultaDoArtigo467Corrigido() {
        if (Utils.nulo(this.getIndiceMulta467())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(this.getIndiceMulta467().multiply(this.getValorDaMultaDoArtigo467(), Utils.CONTEXTO_MATEMATICO));
    }

    public BigDecimal getValorDaMulta10() {
        if (!Boolean.TRUE.equals(this.multa10)) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(this.getTotalDevidoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_DEMISSAO).multiply(new BigDecimal("0.10"), Utils.CONTEXTO_MATEMATICO));
    }

    public BigDecimal getValorDaMulta10Corrigida() {
        if (Utils.nulo(this.getIndiceMulta())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(this.getIndiceMulta().multiply(this.getValorDaMulta10(), Utils.CONTEXTO_MATEMATICO));
    }

    public BigDecimal getValorDaContribuicaoSocial05() {
        return this.getTotalizador().getContribuicaoSocial05();
    }

    public BigDecimal getValorDaContribuicaoSocial05Corrigido() {
        return this.getTotalizador().getContribuicaoSocial05Corrigida();
    }

    public BigDecimal getJurosDaContribuicaoSocial05() {
        return this.getTotalizador().getJurosDaContribuicaoSocial05();
    }

    public BigDecimal getTotalDaContribuicaoSocial05() {
        return this.getValorDaContribuicaoSocial05Corrigido().add(this.getJurosDaContribuicaoSocial05(), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getTaxaDeJurosParaDataDemissao() {
        return this.taxaDeJurosParaDataDemissao;
    }

    public void setTaxaDeJurosParaDataDemissao(BigDecimal taxaDeJurosParaDataDemissao) {
        this.taxaDeJurosParaDataDemissao = taxaDeJurosParaDataDemissao;
    }

    public LogicoEnum getComporPrincipal() {
        return this.comporPrincipal;
    }

    public void setComporPrincipal(LogicoEnum comporPrincipal) {
        this.comporPrincipal = comporPrincipal;
    }

    public void liquidar() {
        this.maquinaDeCalculoDoFgts.liquidar();
    }

    public void limparJuros() {
        if (Utils.naoNulo(this.getOcorrencias())) {
            for (OcorrenciaDeFgts ocorrencia : this.getOcorrencias()) {
                ocorrencia.setTaxaDeJuros(null);
            }
        }
        if (Utils.naoNulo(this.getOperacoesDeFgts())) {
            for (OperacaoDeFgts operacao : this.getOperacoesDeFgts()) {
                operacao.setTaxaDeJuros(null);
            }
        }
        this.setTaxaDeJurosParaDataDemissao(null);
    }

    public void calcularJuros() {
        this.maquinaDeCalculoDoFgts.calcularJuros();
    }

    public LegendaDaFormulaDoFgts getLegendaDaFormula() {
        if (Utils.nulo(this.legendaDaFormula)) {
            this.legendaDaFormula = new LegendaDaFormulaDoFgts(this);
        }
        return this.legendaDaFormula;
    }

    public OptimizerListSearch<Competencia, OperacaoDeFgts> getOperacoesDeFgtsOtimizada() {
        return new OperacaoDeFgtsOptimizerListSearch().init((Collection<OperacaoDeFgts>)this.getOperacoesDeFgts());
    }

    public void recalcularTotais() {
        this.getTotalizador().reset();
    }

    public void limparOcorrenciasSeSaldoZerado() {
        if (BigDecimal.ZERO.compareTo(this.getTotalDaDiferenca()) == 0) {
            this.limparOcorrencias();
        }
    }

    public Set<OcorrenciaDeFgts> getOcorrenciasComContribuicaoSocial() {
        if (Utils.nulo(this.ocorrenciasComContribuicaoSocial)) {
            this.ocorrenciasComContribuicaoSocial = new LinkedHashSet<OcorrenciaDeFgts>();
        }
        if (this.getContribuicaoSocial05().booleanValue() && this.ocorrenciasComContribuicaoSocial.isEmpty() && Utils.naoNulo(this.ocorrencias)) {
            for (OcorrenciaDeFgts ocorrencia : this.getOcorrencias()) {
                if (ocorrencia.getValorDaContribuicaoSocialDe05().compareTo(BigDecimal.ZERO) <= 0) continue;
                this.ocorrenciasComContribuicaoSocial.add(ocorrencia);
            }
        }
        return this.ocorrenciasComContribuicaoSocial;
    }

    public Set<OcorrenciaDeFgts> getOcorrenciasVisiveisRelatorio() {
        if (this.ocorrenciasVisiveisRelatorio.isEmpty()) {
            for (OcorrenciaDeFgts o : this.getOcorrencias()) {
                if (TipoDeBaseDoFgtsEnum.INFORMADA.equals((Object)o.getTipoDeBaseDoFgts()) || TipoDeDepositadoDoFgtsEnum.INFORMADA.equals((Object)o.getTipoDeDepositadoDoFgts())) {
                    this.ocorrenciasVisiveisRelatorio.add(o);
                    continue;
                }
                if (Utils.naoNulo(o.getBaseVerba())) {
                    this.ocorrenciasVisiveisRelatorio.add(o);
                    continue;
                }
                if ((!Utils.naoNulo(o.getBaseHistorico()) || BigDecimal.ZERO.compareTo(o.getBaseHistorico()) == 0) && (!Utils.naoNulo(o.getDepositado()) || BigDecimal.ZERO.compareTo(o.getDepositado()) == 0)) continue;
                this.ocorrenciasVisiveisRelatorio.add(o);
            }
        }
        return this.ocorrenciasVisiveisRelatorio;
    }

    public BigDecimal getIndiceMulta() {
        return this.indiceMulta;
    }

    public void setIndiceMulta(BigDecimal indiceMulta) {
        this.indiceMulta = indiceMulta;
    }

    public BigDecimal getIndiceMulta467() {
        return this.indiceMulta467;
    }

    public void setIndiceMulta467(BigDecimal indiceMulta467) {
        this.indiceMulta467 = indiceMulta467;
    }

    public TipoDeBaseDoFgtsEnum getTipoDoValorDaMulta() {
        return this.tipoDoValorDaMulta;
    }

    public void setTipoDoValorDaMulta(TipoDeBaseDoFgtsEnum tipoDoValorDaMulta) {
        this.tipoDoValorDaMulta = tipoDoValorDaMulta;
    }

    public BigDecimal getValorInformadoDaMulta() {
        return this.valorInformadoDaMulta;
    }

    public void setValorInformadoDaMulta(BigDecimal valorInformadoDaMulta) {
        this.valorInformadoDaMulta = valorInformadoDaMulta;
    }

    public boolean existemDadosParaRelatorio() {
        if (Utils.nulo(this.getId())) {
            return false;
        }
        if (Utils.naoNulo(this.getOcorrenciasVisiveisRelatorio()) && !this.getOcorrenciasVisiveisRelatorio().isEmpty()) {
            return true;
        }
        if (this.multa.booleanValue() && (TipoDeBaseDoFgtsEnum.INFORMADA.equals((Object)this.tipoDoValorDaMulta) || TipoDeBaseDoFgtsEnum.CALCULADA.equals((Object)this.tipoDoValorDaMulta) && IncidenciaDeMultaDoFgtsEnum.SOBRE_DEPOSITADO_SACADO == this.incidenciaDoFgts)) {
            return true;
        }
        if (this.contribuicaoSocial05.booleanValue()) {
            return true;
        }
        if (this.multa10.booleanValue()) {
            return true;
        }
        return Utils.naoNulo(this.getOperacoesDeFgts()) && !this.getOperacoesDeFgts().isEmpty();
    }

    public boolean isComporOPrincipal() {
        return LogicoEnum.SIM == this.getComporPrincipal();
    }

    public boolean isMultaCalculada() {
        return TipoDeBaseDoFgtsEnum.CALCULADA == this.getTipoDoValorDaMulta();
    }

    public boolean isMultaInformada() {
        return TipoDeBaseDoFgtsEnum.INFORMADA == this.getTipoDoValorDaMulta();
    }

    public OptimizerListSearchUnique<Competencia, OcorrenciaDeFgts> getOcorrenciasOptimizerListSearchUnique() {
        return new OcorrenciaDeFgtsOptimizerListSearchUnique().init((Collection<OcorrenciaDeFgts>)this.getOcorrencias());
    }

    public void copiarParametrosRegeracaoOcorrencias(Fgts filtro) {
        this.setPeriodoFinal(filtro.getPeriodoFinal());
        this.setPeriodoInicial(filtro.getPeriodoInicial());
        this.setAliquota(filtro.getAliquota());
    }
}

