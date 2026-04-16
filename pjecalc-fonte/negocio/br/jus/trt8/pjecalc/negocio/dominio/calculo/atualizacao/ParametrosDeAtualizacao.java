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
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.TabelaDeJuros;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeJurosDasVerbasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.FormaAplicacaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceDeCorrecaoDoFGTSEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDaMultaDoINSSEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoPagamentoDaMultaDoINSSEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeIndice;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ExcecaoDeJurosDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.RepositorioDeParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ValidadorParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.regras.DataEspecificaContribuicaoSocialParametrosAtualizacaoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.regras.DataEspecificaJurosMoraParametrosAtualizacaoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.regras.DataGeralParametrosAtualizacaoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.justificativa.JustificativaParametrosAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import java.io.Serializable;
import java.util.Date;
import java.util.HashMap;
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
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBPARAMATUALIZACAOCALCULO")
@SequenceGenerator(name="SQPARAMATUALIZACAOCALCULO", sequenceName="SQPARAMATUALIZACAOCALCULO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="parametrosDeAtualizacao")
public class ParametrosDeAtualizacao
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = -1995235507215029825L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPARAMATUALIZACAOCALCULO")
    @Column(name="IIDPARAMATUALIZACAOCALCULO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="STPINDICETRABALHISTA", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    private IndiceMonetarioEnum indiceTrabalhista = IndiceMonetarioEnum.IPCAE;
    @Column(name="STPOUTROINDICETRABALHISTA", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    private IndiceMonetarioEnum outroIndiceTrabalhista;
    @Column(name="SFLCOMBINAROUTROINDICE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean combinarOutroIndice = Boolean.FALSE;
    @Column(name="DDTAPARTIRDEOUTROINDICE")
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=DataGeralParametrosAtualizacaoValidRule.class)
    private Date apartirDeOutroIndice;
    @Column(name="SFLIGNORARTAXANEGATIVA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean ignorarTaxaNegativa = Boolean.FALSE;
    @Column(name="SFLJUROSPADRAO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jurosPadrao;
    @Column(name="SFLENTEPUBLICO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean entePublico;
    @Column(name="DDTAPERTIRDE")
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=DataEspecificaJurosMoraParametrosAtualizacaoValidRule.class)
    private Date apertirDe;
    @Column(name="STPJUROS", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="JurosEnum")})
    private JurosEnum juros = JurosEnum.TRD_SIMPLES;
    @Column(name="SFLAPLICARJUROSPREJUDICIAL", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarJurosFasePreJudicial;
    @Column(name="SFLCOMBINAROUTROJUROS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean combinarOutroJuros;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="parametrosDeAtualizacao")
    @OrderBy(value="dataInicio")
    private Set<ExcecaoDeJurosDaAtualizacao> listaDeExcecaoDeJurosDaAtualizacao;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="parametrosDeAtualizacao")
    @OrderBy(value="apartirDeOutroIndice")
    private Set<CombinacaoDeIndice> listaDeCombinacaoDeIndices;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="parametrosDeAtualizacao")
    @OrderBy(value="apartirDeOutroJuros")
    private Set<CombinacaoDeJuros> listaDeCombinacaoDeJuros;
    @Column(name="STPBASEJUROSVERBAS", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="BaseDeJurosDasVerbasEnum")})
    @Required
    private BaseDeJurosDasVerbasEnum baseDeJurosDasVerbas = BaseDeJurosDasVerbasEnum.VERBA_INSS;
    @Column(name="STPINDICECORRECAOFGTS", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceDeCorrecaoDoFGTSEnum")})
    @Required
    private IndiceDeCorrecaoDoFGTSEnum indiceDeCorrecaoDoFGTS = IndiceDeCorrecaoDoFGTSEnum.UTILIZAR_INDICE_TRABALHISTA;
    @Column(name="SFLJUROSFGTSCOMJAM", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jurosDeFgtsComJam = Boolean.FALSE;
    @Column(name="STPINDICECORRECAOPREVPRIVADA", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="OpcaoDeIndiceDeCorrecaoEnum")})
    @Required
    private OpcaoDeIndiceDeCorrecaoEnum indiceDeCorrecaoDePrevidenciaPrivada = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
    @Column(name="STPOUTROINDCORRECAOPREVPRIVADA", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    @Required(condition="bean.indiceDeCorrecaoDasCustas == 'UTILIZAR_OUTRO_INDICE'")
    private IndiceMonetarioEnum outroIndiceDeCorrecaoDePrevidenciaPrivada;
    @Column(name="SFLJUROSPREVPRIVADA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jurosDePrevidenciaPrivada = Boolean.FALSE;
    @Column(name="STPINDICECORRECAOCUSTAS", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="OpcaoDeIndiceDeCorrecaoEnum")})
    @Required
    private OpcaoDeIndiceDeCorrecaoEnum indiceDeCorrecaoDasCustas = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
    @Column(name="STPOUTROINDICECORRECAOCUSTAS", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    @Required(condition="bean.indiceDeCorrecaoDasCustas == 'UTILIZAR_OUTRO_INDICE'")
    private IndiceMonetarioEnum outroIndiceDeCorrecaoDasCustas;
    @Column(name="SFLJUROSCUSTAS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jurosDeCustas = Boolean.FALSE;
    @Column(name="SFLCORRECAOTRABSALDEVINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean correcaoTrabalhistaDosSalariosDevidosDoINSS = Boolean.TRUE;
    @Column(name="SFLJUROSTRABSALDEVINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jurosTrabalhistasDosSalariosDevidosDoINSS = Boolean.FALSE;
    @Column(name="DDTAPLICARATESALDEVINSS")
    @Temporal(value=TemporalType.DATE)
    @Required(condition="bean.correcaoTrabalhistaDosSalariosDevidosDoINSS && bean.correcaoPrevidenciariaDosSalariosDevidosDoINSS")
    @ValidValue(validRule=DataEspecificaContribuicaoSocialParametrosAtualizacaoValidRule.class)
    private Date aplicarAteDosSalariosDevidosDoINSS;
    @Column(name="SFLCORRECAOPREVSALDEVINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean correcaoPrevidenciariaDosSalariosDevidosDoINSS = Boolean.FALSE;
    @Column(name="SFLJUROSPREVIDSALDEVINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jurosPrevidenciariosDosSalariosDevidosDoINSS = Boolean.FALSE;
    @Column(name="SFLAPLICARMULTASALDEVINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarMultaDosSalariosDevidosDoINSS = Boolean.FALSE;
    @Column(name="STPTIPOMULTASALARIOSDEVINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDaMultaDoINSSEnum")})
    private TipoDaMultaDoINSSEnum tipoDeMultaDosSalariosDevidosDoINSS = TipoDaMultaDoINSSEnum.URBANA;
    @Column(name="STPPAGAMENTOMULTASALDEVINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoPagamentoDaMultaDoINSSEnum")})
    private TipoPagamentoDaMultaDoINSSEnum pagamentoDaMultaDosSalariosDevidosDoINSS = TipoPagamentoDaMultaDoINSSEnum.INTEGRAL;
    @Column(name="STPSALARIODEVIDOFORMAAPLICACAO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="FormaAplicacaoEnum")})
    private FormaAplicacaoEnum salarioDevidoFormaAplicacao;
    @Column(name="STPSALARIOPAGOFORMAAPLICACAO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="FormaAplicacaoEnum")})
    private FormaAplicacaoEnum salarioPagoFormaAplicacao = FormaAplicacaoEnum.MES_A_MES;
    @Column(name="SFLCORRECAOTRABALSALPAGINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean correcaoTrabalhistaDosSalariosPagosDoINSS = Boolean.FALSE;
    @Column(name="SFLJUROSTRABALSALPAGINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jurosTrabalhistasDosSalariosPagosDoINSS = Boolean.FALSE;
    @Column(name="DDTAPLICARATESALPAGINSS")
    @Temporal(value=TemporalType.DATE)
    @Required(condition="bean.correcaoTrabalhistaDosSalariosPagosDoINSS && bean.correcaoPrevidenciariaDosSalariosPagosDoINSS")
    @ValidValue(validRule=DataEspecificaContribuicaoSocialParametrosAtualizacaoValidRule.class)
    private Date aplicarAteDosSalariosPagosDoINSS;
    @Column(name="SFLCORRECAOPREVIDSALPAGINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean correcaoPrevidenciariaDosSalariosPagosDoINSS = Boolean.TRUE;
    @Column(name="SFLJUROSPREVIDSALPAGINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jurosPrevidenciariosDosSalariosPagosDoINSS = Boolean.TRUE;
    @Column(name="SFLAPLICARMULTASALPAGINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarMultaDosSalariosPagosDoINSS = Boolean.TRUE;
    @Column(name="STPTIPOMULTASALARPAGINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDaMultaDoINSSEnum")})
    private TipoDaMultaDoINSSEnum tipoDeMultaDosSalariosPagosDoINSS = TipoDaMultaDoINSSEnum.URBANA;
    @Column(name="STPPAGAMENTOMULTASALARPAGINSS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoPagamentoDaMultaDoINSSEnum")})
    private TipoPagamentoDaMultaDoINSSEnum pagamentoDaMultaDosSalariosPagosDoINSS = TipoPagamentoDaMultaDoINSSEnum.INTEGRAL;
    @Column(name="DDTINICIOUTILIZACAOJUROSPADRAO")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicialDoJurosPadrao;
    @Column(name="DDTFIMUTILIZACAOJUROSPADRAO")
    @Temporal(value=TemporalType.DATE)
    private Date dataFinalDoJurosPadrao;
    @Column(name="DDTINICIOUTILIZACAOJUROSFAZEND")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicialDoJurosFazendaPublica;
    @Column(name="DDTFIMUTILIZACAOJUROSFAZENDA")
    @Temporal(value=TemporalType.DATE)
    private Date dataFinalDoJurosFazendaPublica;
    @Column(name="SFLCORRECAOCUSTAS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean correcaoDasCustas = Boolean.TRUE;
    @Column(name="SFLLEI11941", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean lei11941 = Boolean.TRUE;
    @Column(name="DDTAPERTIRDELEI11941")
    @Temporal(value=TemporalType.DATE)
    private Date apartirDeLei11941;
    @Column(name="DDTAPERTIRDELEI11941MULTA")
    @Temporal(value=TemporalType.DATE)
    private Date apartirDeLei11941Multa;
    @Column(name="SFLLEI11941PAGO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean lei11941Pago = Boolean.FALSE;
    @Column(name="SFLLEI11941MULTA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean lei11941Multa = Boolean.TRUE;
    @Column(name="DDTAPERTIRDELEI11941PAGO")
    @Temporal(value=TemporalType.DATE)
    private Date apartirDeLei11941Pago;
    @Column(name="SFLLEI11941PAGOMULTA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean lei11941PagoMulta = Boolean.FALSE;
    @Column(name="DDTAPERTIRDELEI11941PAGOMULTA")
    @Temporal(value=TemporalType.DATE)
    private Date apartirDeLei11941PagoMulta;
    @Column(name="SDSULTIMOINDICE", columnDefinition="VARCHAR2(120)")
    private String informacaoUltimoIndice;
    @Column(name="SDSULTIMOINDICEATUALIZACAO", columnDefinition="VARCHAR2(120)")
    private String informacaoUltimoIndiceAtualizacao;
    @Transient
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="JurosEnum")})
    private JurosEnum outroJuros;
    @Transient
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=DataGeralParametrosAtualizacaoValidRule.class)
    private Date apartirDeOutroJuros;

    public ParametrosDeAtualizacao() {
        super(RepositorioDeParametrosDeAtualizacao.class);
        this.listaDeCombinacaoDeIndices = new LinkedHashSet<CombinacaoDeIndice>();
        this.listaDeCombinacaoDeJuros = new LinkedHashSet<CombinacaoDeJuros>();
    }

    public ParametrosDeAtualizacao(Calculo calculo) {
        this();
        this.calculo = calculo;
        if (!calculo.isCalculoExterno().booleanValue()) {
            this.aplicarJurosFasePreJudicial = Boolean.TRUE;
            this.combinarOutroJuros = Boolean.TRUE;
            CombinacaoDeJuros juros = new CombinacaoDeJuros();
            juros.setApartirDeOutroJuros(this.getCalculo().getDataAjuizamento());
            juros.setOutroJuros(JurosEnum.SEM_JUROS);
            juros.setParametrosDeAtualizacao(this);
            this.listaDeCombinacaoDeJuros.add(juros);
        } else {
            this.aplicarJurosFasePreJudicial = Boolean.FALSE;
            this.juros = JurosEnum.SEM_JUROS;
            this.combinarOutroJuros = Boolean.FALSE;
        }
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

    public boolean isJurosHabilitado() {
        return !JurosEnum.SEM_JUROS.equals((Object)this.getJuros()) || this.confirmarQueHaJurosCombinado();
    }

    private boolean confirmarQueHaJurosCombinado() {
        for (CombinacaoDeJuros combinacao : this.getListaDeCombinacaoDeJuros()) {
            if (JurosEnum.SEM_JUROS.equals((Object)combinacao.getOutroJuros())) continue;
            return true;
        }
        return false;
    }

    @Override
    public void salvar() {
        if (this.combinarOutroIndice.booleanValue() && !this.listaDeCombinacaoDeIndices.isEmpty()) {
            CombinacaoDeIndice outroIndice = this.listaDeCombinacaoDeIndices.iterator().next();
            this.outroIndiceTrabalhista = outroIndice.getOutroIndiceTrabalhista();
            this.apartirDeOutroIndice = outroIndice.getApartirDeOutroIndice();
        } else {
            this.combinarOutroIndice = false;
            this.listaDeCombinacaoDeIndices.clear();
        }
        if (this.combinarOutroJuros.booleanValue() && this.listaDeCombinacaoDeJuros.isEmpty()) {
            this.combinarOutroJuros = false;
            this.listaDeCombinacaoDeJuros.clear();
        }
        super.salvar();
        CombinacaoDeIndice.salvar(this.listaDeCombinacaoDeIndices);
        this.removerIndicesCombinadosNaoReferenciados();
        CombinacaoDeJuros.salvar(this.listaDeCombinacaoDeJuros);
        this.removerJurosCombinadosNaoReferenciados();
    }

    private void removerIndicesCombinadosNaoReferenciados() {
        ParametrosDeAtualizacao.getRepositorio(RepositorioDeParametrosDeAtualizacao.class).removerIndicesCombinadosNaoReferenciados(this);
    }

    private void removerJurosCombinadosNaoReferenciados() {
        ParametrosDeAtualizacao.getRepositorio(RepositorioDeParametrosDeAtualizacao.class).removerJurosCombinadosNaoReferenciados(this);
    }

    @Override
    protected ParametrosDeAtualizacao validar() {
        ValidadorParametrosDeAtualizacao validadorParametros = new ValidadorParametrosDeAtualizacao(this);
        validadorParametros.checarDatas();
        GerenciadorDeValidadores.getInstance().validar(ParametrosDeAtualizacao.class, this);
        this.consistirUsoDeOutroIndiceTrabalhista();
        this.consistirUsoDeOutroJuros();
        validadorParametros.organizarSalariosDevidosEPagos();
        return this;
    }

    private void consistirUsoDeOutroIndiceTrabalhista() {
        if (!this.combinarOutroIndice.booleanValue()) {
            this.outroIndiceTrabalhista = null;
            this.apartirDeOutroIndice = null;
            this.listaDeCombinacaoDeIndices = new LinkedHashSet<CombinacaoDeIndice>();
        }
    }

    private void consistirUsoDeOutroJuros() {
        if (!this.combinarOutroJuros.booleanValue()) {
            this.listaDeCombinacaoDeJuros = new LinkedHashSet<CombinacaoDeJuros>();
        }
    }

    public Map<Date, IndiceMonetarioEnum> verificarCombinacoesDeCorrecaoMonetaria() {
        HashMap<Date, IndiceMonetarioEnum> inconsistencias = new HashMap<Date, IndiceMonetarioEnum>();
        Date dataInicio = this.getApartirDeOutroIndice();
        if (dataInicio == null) {
            Date date = dataInicio = this.getCalculo().getDataInicioCalculo() == null ? this.getCalculo().getDataAdmissao() : this.getCalculo().getDataInicioCalculo();
        }
        if (!this.verificarCombinacaoDeTabelasDeCorrecao(dataInicio, this.getIndiceTrabalhista())) {
            inconsistencias.put(dataInicio, this.getIndiceTrabalhista());
        }
        for (CombinacaoDeIndice combinacaoDeIndice : this.getListaDeCombinacaoDeIndices()) {
            if (this.verificarCombinacaoDeTabelasDeCorrecao(combinacaoDeIndice.getApartirDeOutroIndice(), combinacaoDeIndice.getOutroIndiceTrabalhista())) continue;
            inconsistencias.put(combinacaoDeIndice.getApartirDeOutroIndice(), combinacaoDeIndice.getOutroIndiceTrabalhista());
        }
        return inconsistencias;
    }

    public Map<Date, JurosEnum> verificarCombinacoesDeJuros() {
        HashMap<Date, JurosEnum> inconsistencias = new HashMap<Date, JurosEnum>();
        Date dataInicio = this.getApartirDeOutroJuros();
        if (dataInicio == null) {
            Date date = dataInicio = this.getCalculo().getDataInicioCalculo() == null ? this.getCalculo().getDataAdmissao() : this.getCalculo().getDataInicioCalculo();
        }
        if (!this.verificarCombinacaoDeTabelasDeJuros(dataInicio, this.getJuros())) {
            inconsistencias.put(dataInicio, this.getJuros());
        }
        for (CombinacaoDeJuros combinacaoDeJuros : this.getListaDeCombinacaoDeJuros()) {
            if (this.verificarCombinacaoDeTabelasDeJuros(combinacaoDeJuros.getApartirDeOutroJuros(), combinacaoDeJuros.getOutroJuros())) continue;
            inconsistencias.put(combinacaoDeJuros.getApartirDeOutroJuros(), combinacaoDeJuros.getOutroJuros());
        }
        return inconsistencias;
    }

    private boolean verificarCombinacaoDeTabelasDeCorrecao(Date dataInicio, IndiceMonetarioEnum indice) {
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(indice, this.getCalculo().getIndicesAcumulados(), this.getIgnorarTaxaNegativa());
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(true);
        List<? extends IndiceDeCalculo> tabela = tabelaDeCorrecaoMonetaria.obterTabelaDeIndicesPorPeriodo(this.getCalculo(), indice, new Periodo(dataInicio, dataInicio));
        return !tabela.isEmpty();
    }

    private boolean verificarCombinacaoDeTabelasDeJuros(Date dataInicio, JurosEnum juros) {
        return TabelaDeJuros.validarTabelasDeJurosPorPeriodo(juros, new Periodo(dataInicio, dataInicio));
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public IndiceMonetarioEnum getIndiceTrabalhista() {
        return this.indiceTrabalhista;
    }

    public void setIndiceTrabalhista(IndiceMonetarioEnum indiceTrabalhista) {
        this.indiceTrabalhista = indiceTrabalhista;
    }

    public Boolean getIgnorarTaxaNegativa() {
        return this.ignorarTaxaNegativa;
    }

    public void setIgnorarTaxaNegativa(Boolean ignorarTaxaNegativa) {
        this.ignorarTaxaNegativa = ignorarTaxaNegativa;
    }

    public Boolean getJurosPadrao() {
        return this.jurosPadrao;
    }

    protected void setJurosPadrao(Boolean jurosPadrao) {
        this.jurosPadrao = jurosPadrao;
    }

    public Boolean getEntePublico() {
        return this.entePublico;
    }

    protected void setEntePublico(Boolean entePublico) {
        this.entePublico = entePublico;
    }

    public Date getApertirDe() {
        return this.apertirDe;
    }

    protected void setApertirDe(Date apertirDe) {
        this.apertirDe = apertirDe;
    }

    public Set<ExcecaoDeJurosDaAtualizacao> getListaDeExcecaoDeJurosDaAtualizacao() {
        return this.listaDeExcecaoDeJurosDaAtualizacao;
    }

    public void setListaDeExcecaoDeJurosDaAtualizacao(Set<ExcecaoDeJurosDaAtualizacao> listaDeExcecaoDeJurosDaAtualizacao) {
        this.listaDeExcecaoDeJurosDaAtualizacao = listaDeExcecaoDeJurosDaAtualizacao;
    }

    public BaseDeJurosDasVerbasEnum getBaseDeJurosDasVerbas() {
        return this.baseDeJurosDasVerbas;
    }

    public void setBaseDeJurosDasVerbas(BaseDeJurosDasVerbasEnum baseDeJurosDasVerbas) {
        this.baseDeJurosDasVerbas = baseDeJurosDasVerbas;
    }

    public IndiceDeCorrecaoDoFGTSEnum getIndiceDeCorrecaoDoFGTS() {
        return this.indiceDeCorrecaoDoFGTS;
    }

    public void setIndiceDeCorrecaoDoFGTS(IndiceDeCorrecaoDoFGTSEnum indiceDeCorrecaoDoFGTS) {
        this.indiceDeCorrecaoDoFGTS = indiceDeCorrecaoDoFGTS;
    }

    public Boolean getJurosDeFgtsComJam() {
        return this.jurosDeFgtsComJam;
    }

    public void setJurosDeFgtsComJam(Boolean jurosDeFgtsComJam) {
        this.jurosDeFgtsComJam = jurosDeFgtsComJam;
    }

    public OpcaoDeIndiceDeCorrecaoEnum getIndiceDeCorrecaoDasCustas() {
        return this.indiceDeCorrecaoDasCustas;
    }

    public void setIndiceDeCorrecaoDasCustas(OpcaoDeIndiceDeCorrecaoEnum indiceDeCorrecaoDasCustas) {
        this.indiceDeCorrecaoDasCustas = indiceDeCorrecaoDasCustas;
    }

    public IndiceMonetarioEnum getOutroIndiceDeCorrecaoDasCustas() {
        return this.outroIndiceDeCorrecaoDasCustas;
    }

    public void setOutroIndiceDeCorrecaoDasCustas(IndiceMonetarioEnum outroIndiceDeCorrecaoDasCustas) {
        this.outroIndiceDeCorrecaoDasCustas = outroIndiceDeCorrecaoDasCustas;
    }

    public Boolean getCorrecaoTrabalhistaDosSalariosDevidosDoINSS() {
        return this.correcaoTrabalhistaDosSalariosDevidosDoINSS;
    }

    public void setCorrecaoTrabalhistaDosSalariosDevidosDoINSS(Boolean correcaoTrabalhistaDosSalariosDevidosDoINSS) {
        this.correcaoTrabalhistaDosSalariosDevidosDoINSS = correcaoTrabalhistaDosSalariosDevidosDoINSS;
    }

    public Boolean getJurosTrabalhistasDosSalariosDevidosDoINSS() {
        return this.jurosTrabalhistasDosSalariosDevidosDoINSS;
    }

    public void setJurosTrabalhistasDosSalariosDevidosDoINSS(Boolean jurosTrabalhistasDosSalariosDevidosDoINSS) {
        this.jurosTrabalhistasDosSalariosDevidosDoINSS = jurosTrabalhistasDosSalariosDevidosDoINSS;
    }

    public Date getAplicarAteDosSalariosDevidosDoINSS() {
        return this.aplicarAteDosSalariosDevidosDoINSS;
    }

    public void setAplicarAteDosSalariosDevidosDoINSS(Date aplicarAteDosSalariosDevidosDoINSS) {
        this.aplicarAteDosSalariosDevidosDoINSS = aplicarAteDosSalariosDevidosDoINSS;
    }

    public Boolean getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS() {
        return this.correcaoPrevidenciariaDosSalariosDevidosDoINSS;
    }

    public void setCorrecaoPrevidenciariaDosSalariosDevidosDoINSS(Boolean correcaoPrevidenciariaDosSalariosDevidosDoINSS) {
        this.correcaoPrevidenciariaDosSalariosDevidosDoINSS = correcaoPrevidenciariaDosSalariosDevidosDoINSS;
    }

    public Boolean getJurosPrevidenciariosDosSalariosDevidosDoINSS() {
        return this.jurosPrevidenciariosDosSalariosDevidosDoINSS;
    }

    public void setJurosPrevidenciariosDosSalariosDevidosDoINSS(Boolean jurosPrevidenciariosDosSalariosDevidosDoINSS) {
        this.jurosPrevidenciariosDosSalariosDevidosDoINSS = jurosPrevidenciariosDosSalariosDevidosDoINSS;
    }

    public Boolean getAplicarMultaDosSalariosDevidosDoINSS() {
        return this.aplicarMultaDosSalariosDevidosDoINSS;
    }

    public void setAplicarMultaDosSalariosDevidosDoINSS(Boolean aplicarMultaDosSalariosDevidosDoINSS) {
        this.aplicarMultaDosSalariosDevidosDoINSS = aplicarMultaDosSalariosDevidosDoINSS;
    }

    public TipoDaMultaDoINSSEnum getTipoDeMultaDosSalariosDevidosDoINSS() {
        return this.tipoDeMultaDosSalariosDevidosDoINSS;
    }

    public void setTipoDeMultaDosSalariosDevidosDoINSS(TipoDaMultaDoINSSEnum tipoDeMultaDosSalariosDevidosDoINSS) {
        this.tipoDeMultaDosSalariosDevidosDoINSS = tipoDeMultaDosSalariosDevidosDoINSS;
    }

    public TipoPagamentoDaMultaDoINSSEnum getPagamentoDaMultaDosSalariosDevidosDoINSS() {
        return this.pagamentoDaMultaDosSalariosDevidosDoINSS;
    }

    public void setPagamentoDaMultaDosSalariosDevidosDoINSS(TipoPagamentoDaMultaDoINSSEnum pagamentoDaMultaDosSalariosDevidosDoINSS) {
        this.pagamentoDaMultaDosSalariosDevidosDoINSS = pagamentoDaMultaDosSalariosDevidosDoINSS;
    }

    public Boolean getCorrecaoTrabalhistaDosSalariosPagosDoINSS() {
        return this.correcaoTrabalhistaDosSalariosPagosDoINSS;
    }

    public void setCorrecaoTrabalhistaDosSalariosPagosDoINSS(Boolean correcaoTrabalhistaDosSalariosPagosDoINSS) {
        this.correcaoTrabalhistaDosSalariosPagosDoINSS = correcaoTrabalhistaDosSalariosPagosDoINSS;
    }

    public Boolean getJurosTrabalhistasDosSalariosPagosDoINSS() {
        return this.jurosTrabalhistasDosSalariosPagosDoINSS;
    }

    public void setJurosTrabalhistasDosSalariosPagosDoINSS(Boolean jurosTrabalhistasDosSalariosPagosDoINSS) {
        this.jurosTrabalhistasDosSalariosPagosDoINSS = jurosTrabalhistasDosSalariosPagosDoINSS;
    }

    public Date getAplicarAteDosSalariosPagosDoINSS() {
        return this.aplicarAteDosSalariosPagosDoINSS;
    }

    public void setAplicarAteDosSalariosPagosDoINSS(Date aplicarAteDosSalariosPagosDoINSS) {
        this.aplicarAteDosSalariosPagosDoINSS = aplicarAteDosSalariosPagosDoINSS;
    }

    public Boolean getCorrecaoPrevidenciariaDosSalariosPagosDoINSS() {
        return this.correcaoPrevidenciariaDosSalariosPagosDoINSS;
    }

    public void setCorrecaoPrevidenciariaDosSalariosPagosDoINSS(Boolean correcaoPrevidenciariaDosSalariosPagosDoINSS) {
        this.correcaoPrevidenciariaDosSalariosPagosDoINSS = correcaoPrevidenciariaDosSalariosPagosDoINSS;
    }

    public Boolean getJurosPrevidenciariosDosSalariosPagosDoINSS() {
        return this.jurosPrevidenciariosDosSalariosPagosDoINSS;
    }

    public void setJurosPrevidenciariosDosSalariosPagosDoINSS(Boolean jurosPrevidenciariosDosSalariosPagosDoINSS) {
        this.jurosPrevidenciariosDosSalariosPagosDoINSS = jurosPrevidenciariosDosSalariosPagosDoINSS;
    }

    public Boolean getAplicarMultaDosSalariosPagosDoINSS() {
        return this.aplicarMultaDosSalariosPagosDoINSS;
    }

    public void setAplicarMultaDosSalariosPagosDoINSS(Boolean aplicarMultaDosSalariosPagosDoINSS) {
        this.aplicarMultaDosSalariosPagosDoINSS = aplicarMultaDosSalariosPagosDoINSS;
    }

    public TipoDaMultaDoINSSEnum getTipoDeMultaDosSalariosPagosDoINSS() {
        return this.tipoDeMultaDosSalariosPagosDoINSS;
    }

    public void setTipoDeMultaDosSalariosPagosDoINSS(TipoDaMultaDoINSSEnum tipoDeMultaDosSalariosPagosDoINSS) {
        this.tipoDeMultaDosSalariosPagosDoINSS = tipoDeMultaDosSalariosPagosDoINSS;
    }

    public TipoPagamentoDaMultaDoINSSEnum getPagamentoDaMultaDosSalariosPagosDoINSS() {
        return this.pagamentoDaMultaDosSalariosPagosDoINSS;
    }

    public void setPagamentoDaMultaDosSalariosPagosDoINSS(TipoPagamentoDaMultaDoINSSEnum pagamentoDaMultaDosSalariosPagosDoINSS) {
        this.pagamentoDaMultaDosSalariosPagosDoINSS = pagamentoDaMultaDosSalariosPagosDoINSS;
    }

    public Boolean getJurosDeCustas() {
        return this.jurosDeCustas;
    }

    public void setJurosDeCustas(Boolean jurosDeCustas) {
        this.jurosDeCustas = jurosDeCustas;
    }

    public OpcaoDeIndiceDeCorrecaoEnum getIndiceDeCorrecaoDePrevidenciaPrivada() {
        return this.indiceDeCorrecaoDePrevidenciaPrivada;
    }

    public void setIndiceDeCorrecaoDePrevidenciaPrivada(OpcaoDeIndiceDeCorrecaoEnum indiceDeCorrecaoDePrevidenciaPrivada) {
        this.indiceDeCorrecaoDePrevidenciaPrivada = indiceDeCorrecaoDePrevidenciaPrivada;
    }

    public IndiceMonetarioEnum getOutroIndiceDeCorrecaoDePrevidenciaPrivada() {
        return this.outroIndiceDeCorrecaoDePrevidenciaPrivada;
    }

    public void setOutroIndiceDeCorrecaoDePrevidenciaPrivada(IndiceMonetarioEnum outroIndiceDeCorrecaoDePrevidenciaPrivada) {
        this.outroIndiceDeCorrecaoDePrevidenciaPrivada = outroIndiceDeCorrecaoDePrevidenciaPrivada;
    }

    public Boolean getJurosDePrevidenciaPrivada() {
        return this.jurosDePrevidenciaPrivada;
    }

    public void setJurosDePrevidenciaPrivada(Boolean jurosDePrevidenciaPrivada) {
        this.jurosDePrevidenciaPrivada = jurosDePrevidenciaPrivada;
    }

    public Date getDataInicialDoJurosPadrao() {
        return this.dataInicialDoJurosPadrao;
    }

    public void setPeriodoDoJurosPadrao(Periodo periodo) {
        this.dataInicialDoJurosPadrao = null;
        this.dataFinalDoJurosPadrao = null;
        if (Utils.naoNulo(periodo)) {
            this.dataInicialDoJurosPadrao = periodo.getInicial();
            this.dataFinalDoJurosPadrao = periodo.getFinal();
        }
    }

    public Periodo getPeriodoDoJurosPadrao() {
        if (Utils.naoNulos(this.dataInicialDoJurosPadrao, this.dataFinalDoJurosPadrao)) {
            return new Periodo(this.dataInicialDoJurosPadrao, this.dataFinalDoJurosPadrao);
        }
        return null;
    }

    public void setDataInicialDoJurosPadrao(Date dataInicialDoJurosPadrao) {
        this.dataInicialDoJurosPadrao = dataInicialDoJurosPadrao;
    }

    public Date getDataFinalDoJurosPadrao() {
        return this.dataFinalDoJurosPadrao;
    }

    public void setDataFinalDoJurosPadrao(Date dataFinalDoJurosPadrao) {
        this.dataFinalDoJurosPadrao = dataFinalDoJurosPadrao;
    }

    public Date getDataInicialDoJurosFazendaPublica() {
        return this.dataInicialDoJurosFazendaPublica;
    }

    public void setDataInicialDoJurosFazendaPublica(Date dataInicialDoJurosFazendaPublica) {
        this.dataInicialDoJurosFazendaPublica = dataInicialDoJurosFazendaPublica;
    }

    public Date getDataFinalDoJurosFazendaPublica() {
        return this.dataFinalDoJurosFazendaPublica;
    }

    public void setDataFinalDoJurosFazendaPublica(Date dataFinalDoJurosFazendaPublica) {
        this.dataFinalDoJurosFazendaPublica = dataFinalDoJurosFazendaPublica;
    }

    public Boolean getCorrecaoDasCustas() {
        return this.correcaoDasCustas;
    }

    public void setCorrecaoDasCustas(Boolean correcaoDasCustas) {
        this.correcaoDasCustas = correcaoDasCustas;
    }

    public IndiceMonetarioEnum getOutroIndiceTrabalhista() {
        return this.outroIndiceTrabalhista;
    }

    public void setOutroIndiceTrabalhista(IndiceMonetarioEnum outroIndiceTrabalhista) {
        this.outroIndiceTrabalhista = outroIndiceTrabalhista;
    }

    public Boolean getCombinarOutroIndice() {
        return this.combinarOutroIndice;
    }

    public void setCombinarOutroIndice(Boolean combinarOutroIndice) {
        this.combinarOutroIndice = combinarOutroIndice;
    }

    public FormaAplicacaoEnum getSalarioDevidoFormaAplicacao() {
        return this.salarioDevidoFormaAplicacao;
    }

    public void setSalarioDevidoFormaAplicacao(FormaAplicacaoEnum salarioDevidoFormaAplicacao) {
        this.salarioDevidoFormaAplicacao = salarioDevidoFormaAplicacao;
    }

    public FormaAplicacaoEnum getSalarioPagoFormaAplicacao() {
        return this.salarioPagoFormaAplicacao;
    }

    public void setSalarioPagoFormaAplicacao(FormaAplicacaoEnum salarioPagoFormaAplicacao) {
        this.salarioPagoFormaAplicacao = salarioPagoFormaAplicacao;
    }

    public Date getApartirDeOutroIndice() {
        return this.apartirDeOutroIndice;
    }

    public void setApartirDeOutroIndice(Date apartirDeOutroIndice) {
        this.apartirDeOutroIndice = apartirDeOutroIndice;
    }

    public Boolean getLei11941() {
        return this.lei11941;
    }

    public void setLei11941(Boolean lei11941) {
        this.lei11941 = lei11941;
    }

    public Date getApartirDeLei11941() {
        if (this.apartirDeLei11941 == null) {
            return HelperDate.getInstance(2009, 2, 5).getDate();
        }
        return this.apartirDeLei11941;
    }

    public void setApartirDeLei11941(Date apartirDeLei11941) {
        this.apartirDeLei11941 = apartirDeLei11941;
    }

    public Boolean getLei11941Pago() {
        return this.lei11941Pago;
    }

    public Boolean getLei11941Multa() {
        return this.lei11941Multa;
    }

    public void setLei11941Multa(Boolean lei11941Multa) {
        this.lei11941Multa = lei11941Multa;
    }

    public Boolean getLei11941PagoMulta() {
        return this.lei11941PagoMulta;
    }

    public void setLei11941PagoMulta(Boolean lei11941PagoMulta) {
        this.lei11941PagoMulta = lei11941PagoMulta;
    }

    public void setLei11941Pago(Boolean lei11941Pago) {
        this.lei11941Pago = lei11941Pago;
    }

    public Date getApartirDeLei11941Pago() {
        if (this.apartirDeLei11941Pago == null) {
            return HelperDate.getInstance(2009, 2, 5).getDate();
        }
        return this.apartirDeLei11941Pago;
    }

    public void setApartirDeLei11941Pago(Date apartirDeLei11941Pago) {
        this.apartirDeLei11941Pago = apartirDeLei11941Pago;
    }

    public Date getApartirDeLei11941Multa() {
        return this.apartirDeLei11941Multa;
    }

    public void setApartirDeLei11941Multa(Date apartirDeLei11941Multa) {
        this.apartirDeLei11941Multa = apartirDeLei11941Multa;
    }

    public Date getApartirDeLei11941PagoMulta() {
        return this.apartirDeLei11941PagoMulta;
    }

    public void setApartirDeLei11941PagoMulta(Date apartirDeLei11941PagoMulta) {
        this.apartirDeLei11941PagoMulta = apartirDeLei11941PagoMulta;
    }

    public String getInformacaoUltimoIndice() {
        return Utils.nulo(this.informacaoUltimoIndice) ? "" : this.informacaoUltimoIndice;
    }

    public void setInformacaoUltimoIndice(String informacaoUltimoIndice) {
        this.informacaoUltimoIndice = informacaoUltimoIndice;
    }

    public String getInformacaoUltimoIndiceAtualizacao() {
        return Utils.nulo(this.informacaoUltimoIndiceAtualizacao) ? "" : this.informacaoUltimoIndiceAtualizacao;
    }

    public void setInformacaoUltimoIndiceAtualizacao(String informacaoUltimoIndiceAtualizacao) {
        this.informacaoUltimoIndiceAtualizacao = informacaoUltimoIndiceAtualizacao;
    }

    public Set<CombinacaoDeIndice> getListaDeCombinacaoDeIndices() {
        return this.listaDeCombinacaoDeIndices;
    }

    public void setListaDeCombinacaoDeIndices(Set<CombinacaoDeIndice> listaDeCombinacaoDeIndices) {
        this.listaDeCombinacaoDeIndices = listaDeCombinacaoDeIndices;
    }

    public JurosEnum getOutroJuros() {
        return this.outroJuros;
    }

    public void setOutroJuros(JurosEnum outroJuros) {
        this.outroJuros = outroJuros;
    }

    public Date getApartirDeOutroJuros() {
        return this.apartirDeOutroJuros;
    }

    public void setApartirDeOutroJuros(Date apartirDeOutroJuros) {
        this.apartirDeOutroJuros = apartirDeOutroJuros;
    }

    public Set<CombinacaoDeJuros> getListaDeCombinacaoDeJuros() {
        return this.listaDeCombinacaoDeJuros;
    }

    public void setListaDeCombinacaoDeJuros(Set<CombinacaoDeJuros> listaDeCombinacaoDeJuros) {
        this.listaDeCombinacaoDeJuros = listaDeCombinacaoDeJuros;
    }

    public JurosEnum getJuros() {
        return this.juros;
    }

    public void setJuros(JurosEnum juros) {
        this.juros = juros;
    }

    public Boolean getAplicarJurosFasePreJudicial() {
        return this.aplicarJurosFasePreJudicial;
    }

    public void setAplicarJurosFasePreJudicial(Boolean aplicarJurosFasePreJudicial) {
        this.aplicarJurosFasePreJudicial = aplicarJurosFasePreJudicial;
    }

    public Boolean getCombinarOutroJuros() {
        return this.combinarOutroJuros;
    }

    public void setCombinarOutroJuros(Boolean combinarOutroJuros) {
        this.combinarOutroJuros = combinarOutroJuros;
    }

    public String getTextoJustificativaJuros() {
        return JustificativaParametrosAtualizacaoUtils.prepararTextoJustificativaJuros(this);
    }
}

