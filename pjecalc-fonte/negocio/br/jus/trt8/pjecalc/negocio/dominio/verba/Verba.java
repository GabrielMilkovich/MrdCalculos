/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.JoinTable
 *  javax.persistence.ManyToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.apache.commons.collections.CollectionUtils
 *  org.apache.commons.collections.Predicate
 *  org.hibernate.annotations.Fetch
 *  org.hibernate.annotations.FetchMode
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.verba;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.legendas.LegendaDaFormula;
import br.jus.trt8.pjecalc.negocio.comum.legendas.ParametrosDaFormulaDaVerbaDoGestor;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeCalculoDoPrincipalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ComportamentoDoReflexoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DivisorDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.PeriodoDaMediaDoReflexoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeGeracaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeImportadaDoCalendarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeImportadaDoCartaoDePontoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVariacaoDaParcelaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TratamentoDaFracaoDeMesDoReflexoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ValorDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.assuntocnj.AssuntoCnj;
import br.jus.trt8.pjecalc.negocio.dominio.verba.RepositorioDeVerba;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.collections.Predicate;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBVERBA")
@SequenceGenerator(name="SQVERBA", sequenceName="SQVERBA", allocationSize=1)
@Name(value="verba")
public class Verba
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = -9017963943852808708L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVERBA")
    @Column(name="IIDVERBA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
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
    @Column(name="STPVALOR", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="ValorDaVerbaEnum")})
    private ValorDaVerbaEnum valor = ValorDaVerbaEnum.CALCULADO;
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
    @Column(name="STPVERBA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeVerbaEnum")})
    private TipoDeVerbaEnum tipo = TipoDeVerbaEnum.PRINCIPAL;
    @Column(name="STPGERACAOREFLEXO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeGeracaoEnum")})
    private TipoDeGeracaoEnum geracaoReflexo = TipoDeGeracaoEnum.DIFERENCA;
    @Column(name="SFLCOMPORPRINCIPAL", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="LogicoEnum")})
    private LogicoEnum comporPrincipal = LogicoEnum.SIM;
    @Column(name="STPBASE", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="BaseDeCalculoDoPrincipalEnum")})
    private BaseDeCalculoDoPrincipalEnum baseDeCalculoDoPrincipal = BaseDeCalculoDoPrincipalEnum.HISTORICO_SALARIAL;
    @ManyToMany(fetch=FetchType.EAGER)
    @Fetch(value=FetchMode.SELECT)
    @JoinTable(name="TBVERBABASE", joinColumns={@JoinColumn(name="IIDVERBA")}, inverseJoinColumns={@JoinColumn(name="IIDVERBABASE")})
    private Set<Verba> basesDeCalculoDoReflexo = new LinkedHashSet<Verba>();
    @Column(name="STPDIVISOR", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="DivisorDeVerbaEnum")})
    private DivisorDeVerbaEnum divisor = DivisorDeVerbaEnum.OUTRO_VALOR;
    @Column(name="RVLOUTRODIVISOR", precision=19, scale=4)
    private BigDecimal outroDivisor;
    @Column(name="RVLMULTIPLICADOR", precision=19, scale=8)
    private BigDecimal multiplicador;
    @Column(name="SFLPROPORCIONALIDADE", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarProporcionalidade;
    @Column(name="STPCOMPORTAMENTOREFLEXO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="ComportamentoDoReflexoEnum")})
    private ComportamentoDoReflexoEnum comportamentoDoReflexo = ComportamentoDoReflexoEnum.VALOR_MENSAL;
    @Column(name="STPPERIODOMEDIAREFLEXO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="PeriodoDaMediaDoReflexoEnum")})
    private PeriodoDaMediaDoReflexoEnum periodoMediaReflexo = PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO;
    @Column(name="STPTRATAMENTOFRACAOMESREFLEXO", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TratamentoDaFracaoDeMesDoReflexoEnum")})
    private TratamentoDaFracaoDeMesDoReflexoEnum tratamentoDaFracaoDeMesDoReflexo = TratamentoDaFracaoDeMesDoReflexoEnum.MANTER;
    @Column(name="STPQUANTIDADE", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeQuantidadeEnum")})
    private TipoDeQuantidadeEnum tipoDaQuantidade = TipoDeQuantidadeEnum.INFORMADA;
    @Column(name="STPCARTAOPONTO", columnDefinition="VARCHAR2(4)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeQuantidadeImportadaDoCartaoDePontoEnum")})
    private TipoDeQuantidadeImportadaDoCartaoDePontoEnum tipoImportadadoDoCartaoDePonto;
    @Column(name="STPCALENDARIO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeQuantidadeImportadaDoCalendarioEnum")})
    private TipoDeQuantidadeImportadaDoCalendarioEnum tipoImportadaCalendario;
    @Column(name="SFLPROPORCIONALIDADEQTD", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarProporcionalidadeAQuantidade;
    @Column(name="RVLOUTROVALORQTD", precision=19, scale=4)
    private BigDecimal valorInformadoDaQuantidade;
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
    private LegendaDaFormula legendaDaFormula = new LegendaDaFormula(new ParametrosDaFormulaDaVerbaDoGestor(this));

    public Verba() {
        super(RepositorioDeVerba.class);
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

    private void configurarVerbaInformada() {
        this.tipo = TipoDeVerbaEnum.PRINCIPAL;
        this.geracaoReflexo = TipoDeGeracaoEnum.DIFERENCA;
        this.baseDeCalculoDoPrincipal = BaseDeCalculoDoPrincipalEnum.ULTIMA_REMUNERACAO;
        this.basesDeCalculoDoReflexo.clear();
        this.divisor = DivisorDeVerbaEnum.OUTRO_VALOR;
        this.outroDivisor = null;
        this.multiplicador = null;
        this.aplicarProporcionalidade = false;
        this.comportamentoDoReflexo = ComportamentoDoReflexoEnum.VALOR_MENSAL;
        this.periodoMediaReflexo = PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO;
        this.tratamentoDaFracaoDeMesDoReflexo = TratamentoDaFracaoDeMesDoReflexoEnum.MANTER;
    }

    private void configurarVerbaPrincipal() {
        this.basesDeCalculoDoReflexo.clear();
        this.comportamentoDoReflexo = ComportamentoDoReflexoEnum.VALOR_MENSAL;
        this.periodoMediaReflexo = PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO;
        this.tratamentoDaFracaoDeMesDoReflexo = TratamentoDaFracaoDeMesDoReflexoEnum.MANTER;
    }

    @Override
    protected Verba validar() {
        NegocioException excecao = new NegocioException();
        if (this.isValorCalculado() && this.isPrincipal()) {
            if (this.baseDeCalculoDoPrincipal == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "baseDeCalculoDoPrincipal", Mensagens.MSG0003, "Base de C\u00e1lculo"));
            }
            if (this.divisor == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "divisor", Mensagens.MSG0003, "Divisor"));
            }
            if (this.divisor == DivisorDeVerbaEnum.OUTRO_VALOR && this.outroDivisor == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "divisorOutro", Mensagens.MSG0003, "Divisor"));
            } else if (this.divisor == DivisorDeVerbaEnum.OUTRO_VALOR && this.outroDivisor.compareTo(BigDecimal.ZERO) <= 0) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "divisorOutro", Mensagens.MSG0004, "Divisor"));
            }
            if (this.multiplicador == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "multiplicadorOutro", Mensagens.MSG0003, "Multiplicador"));
            } else if (this.multiplicador.compareTo(BigDecimal.ZERO) <= 0) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "multiplicadorOutro", Mensagens.MSG0004, "Multiplicador"));
            }
            if (this.geracaoReflexo == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "geracaoReflexo", Mensagens.MSG0003, "Gera\u00e7\u00e3o do Reflexo"));
            }
            if (TipoDeQuantidadeEnum.INFORMADA.equals((Object)this.tipoDaQuantidade)) {
                if (this.valorInformadoDaQuantidade == null) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorInformadoDaQuantidade", Mensagens.MSG0003, "Quantidade"));
                }
                if (this.valorInformadoDaQuantidade.compareTo(BigDecimal.ZERO) < 0) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorInformadoDaQuantidade", Mensagens.MSG0004, "Quantidade"));
                }
            }
        } else if (this.isValorCalculado() && this.isReflexo()) {
            if (this.basesDeCalculoDoReflexo == null || this.basesDeCalculoDoReflexo.isEmpty()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "baseCalculoReflexo", Mensagens.MSG0003, "Base de C\u00e1lculo"));
            }
            if (this.divisor == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "divisor", Mensagens.MSG0003, "Divisor"));
            }
            if (this.divisor == DivisorDeVerbaEnum.OUTRO_VALOR && this.outroDivisor == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "outroDivisor", Mensagens.MSG0003, "Divisor"));
            } else if (this.divisor == DivisorDeVerbaEnum.OUTRO_VALOR && this.outroDivisor.compareTo(BigDecimal.ZERO) == 0) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "outroDivisor", Mensagens.MSG0004, "Divisor"));
            }
            if (this.multiplicador == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "multiplicador", Mensagens.MSG0003, "Multiplicador"));
            } else if (this.multiplicador.compareTo(BigDecimal.ZERO) == 0) {
                throw new NegocioException(new MensagemDeRecurso(this, "multiplicador", Mensagens.MSG0004, "Multiplicador"));
            }
            if (this.comportamentoDoReflexo == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, null, Mensagens.MSG0003, "Comportamento"));
            }
            if (this.periodoMediaReflexo == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "periodoMediaReflexo", Mensagens.MSG0003, "Per\u00edodo da M\u00e9dia do Reflexo"));
            }
            if (this.tratamentoDaFracaoDeMesDoReflexo == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "tratamentoDaFracaoDeMesDoReflexo", Mensagens.MSG0003, "Tratamento da Fra\u00e7\u00e3o de M\u00eas do Reflexo"));
            }
            if (TipoDeQuantidadeEnum.INFORMADA.equals((Object)this.tipoDaQuantidade) && this.valorInformadoDaQuantidade == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorInformadoDaQuantidade", Mensagens.MSG0003, "Quantidade"));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public String getNome() {
        if (this.nome == null) {
            return "";
        }
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

    public boolean isValorInformado() {
        return ValorDaVerbaEnum.INFORMADO.equals((Object)this.valor);
    }

    public boolean isValorCalculado() {
        return ValorDaVerbaEnum.CALCULADO.equals((Object)this.valor);
    }

    public TipoVariacaoDaParcelaEnum getTipoVariacaoParcela() {
        return this.tipoVariacaoParcela;
    }

    public void setTipoVariacaoParcela(TipoVariacaoDaParcelaEnum tipoVariacaoParcela) {
        this.tipoVariacaoParcela = tipoVariacaoParcela;
    }

    public ValorDaVerbaEnum getValor() {
        return this.valor;
    }

    public void setValor(ValorDaVerbaEnum valor) {
        this.valor = valor;
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

    public Verba pagamentoMensal() {
        this.ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.MENSAL;
        return this;
    }

    public boolean isComPagamentoMensal() {
        return OcorrenciaDePagamentoEnum.MENSAL.equals((Object)this.ocorrenciaDePagamento);
    }

    public Verba pagamentoEmDezembro() {
        this.ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.DEZEMBRO;
        return this;
    }

    public boolean isComPagamentoEmDezembro() {
        return OcorrenciaDePagamentoEnum.DEZEMBRO.equals((Object)this.ocorrenciaDePagamento);
    }

    public Verba pagamentoNoDesligamento() {
        this.ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.DESLIGAMENTO;
        return this;
    }

    public boolean isComPagamentoNoDesligamento() {
        return OcorrenciaDePagamentoEnum.DESLIGAMENTO.equals((Object)this.ocorrenciaDePagamento);
    }

    public Verba pagamentoNoPeriodoAquisitivo() {
        this.ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO;
        return this;
    }

    public boolean isComPagamentoNoPeriodoAquisitivo() {
        return OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO.equals((Object)this.ocorrenciaDePagamento);
    }

    public Verba comCaracteristicaComum() {
        this.setCaracteristica(CaracteristicaDaVerbaEnum.COMUM);
        return this;
    }

    public boolean isVerbaComum() {
        return CaracteristicaDaVerbaEnum.COMUM.equals((Object)this.caracteristica);
    }

    public Verba comCaracteristicaDeDecimoTerceiro() {
        this.setCaracteristica(CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO);
        return this;
    }

    public boolean isVerbaDeDecimoTerceiro() {
        return CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)this.caracteristica);
    }

    public Verba comCaracteristicaDeAvisoPrevio() {
        this.setCaracteristica(CaracteristicaDaVerbaEnum.AVISO_PREVIO);
        return this;
    }

    public boolean isVerbaDeAvisoPrevio() {
        return CaracteristicaDaVerbaEnum.AVISO_PREVIO.equals((Object)this.caracteristica);
    }

    public Verba comCaracteristicaDeFerias() {
        this.setCaracteristica(CaracteristicaDaVerbaEnum.FERIAS);
        return this;
    }

    public boolean isVerbaDeFerias() {
        return CaracteristicaDaVerbaEnum.FERIAS.equals((Object)this.caracteristica);
    }

    public CaracteristicaDaVerbaEnum getCaracteristica() {
        return this.caracteristica;
    }

    public boolean permiteAlterarOcorrenciaDePagamento() {
        return Utils.naoNulo((Object)this.caracteristica) && this.caracteristica.permiteAlterarAOcorrenciaDePagamento();
    }

    public void setCaracteristica(CaracteristicaDaVerbaEnum caracteristica) {
        this.caracteristica = caracteristica;
        if (Utils.naoNulo((Object)this.caracteristica)) {
            this.caracteristica.definirOcorrenciaDePagamentoPara(this);
        }
    }

    public JurosDoAjuizamentoEnum getJurosDoAjuizamento() {
        return this.jurosDoAjuizamento;
    }

    public void setJurosDoAjuizamento(JurosDoAjuizamentoEnum jurosDoAjuizamento) {
        this.jurosDoAjuizamento = jurosDoAjuizamento;
    }

    public boolean isPrincipal() {
        return TipoDeVerbaEnum.PRINCIPAL.equals((Object)this.tipo);
    }

    public boolean isReflexo() {
        return TipoDeVerbaEnum.REFLEXO.equals((Object)this.tipo);
    }

    public TipoDeVerbaEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoDeVerbaEnum tipo) {
        this.tipo = tipo;
    }

    public TipoDeGeracaoEnum getGeracaoReflexo() {
        return this.geracaoReflexo;
    }

    public void setGeracaoReflexo(TipoDeGeracaoEnum geracaoReflexo) {
        this.geracaoReflexo = geracaoReflexo;
    }

    public LogicoEnum getComporPrincipal() {
        return this.comporPrincipal;
    }

    public void setComporPrincipal(LogicoEnum comporPrincipal) {
        this.comporPrincipal = comporPrincipal;
    }

    public BaseDeCalculoDoPrincipalEnum getBaseDeCalculoDoPrincipal() {
        return this.baseDeCalculoDoPrincipal;
    }

    public void setBaseDeCalculoDoPrincipal(BaseDeCalculoDoPrincipalEnum baseDeCalculoDoPrincipal) {
        this.baseDeCalculoDoPrincipal = baseDeCalculoDoPrincipal;
    }

    public Set<Verba> getBasesDeCalculoDoReflexo() {
        return this.basesDeCalculoDoReflexo;
    }

    public void setBasesDeCalculoDoReflexo(Set<Verba> basesDeCalculoDoReflexo) {
        this.basesDeCalculoDoReflexo = basesDeCalculoDoReflexo;
    }

    public boolean isInformarDivisor() {
        return DivisorDeVerbaEnum.OUTRO_VALOR.equals((Object)this.divisor);
    }

    public DivisorDeVerbaEnum getDivisor() {
        return this.divisor;
    }

    public void setDivisor(DivisorDeVerbaEnum divisor) {
        this.divisor = divisor;
    }

    public BigDecimal getOutroDivisor() {
        return this.outroDivisor;
    }

    public void setOutroDivisor(BigDecimal outroDivisor) {
        this.outroDivisor = outroDivisor;
    }

    public BigDecimal getMultiplicador() {
        return this.multiplicador;
    }

    public void setMultiplicador(BigDecimal multiplicador) {
        this.multiplicador = multiplicador;
    }

    public Boolean getAplicarProporcionalidade() {
        return this.aplicarProporcionalidade;
    }

    public void setAplicarProporcionalidade(Boolean aplicarProporcionalidade) {
        this.aplicarProporcionalidade = aplicarProporcionalidade;
    }

    public boolean isComportamentoValorMensal() {
        return ComportamentoDoReflexoEnum.VALOR_MENSAL.equals((Object)this.comportamentoDoReflexo);
    }

    public boolean isComportamentoMediaPeloValor() {
        return ComportamentoDoReflexoEnum.MEDIA_PELO_VALOR.equals((Object)this.comportamentoDoReflexo) || ComportamentoDoReflexoEnum.MEDIA_PELO_VALOR_CORRIGIDO.equals((Object)this.comportamentoDoReflexo);
    }

    public boolean isComportamentoMediaPelaQuantidade() {
        return ComportamentoDoReflexoEnum.MEDIA_PELA_QUANTIDADE.equals((Object)this.comportamentoDoReflexo);
    }

    public ComportamentoDoReflexoEnum getComportamentoDoReflexo() {
        return this.comportamentoDoReflexo;
    }

    public void setComportamentoDoReflexo(ComportamentoDoReflexoEnum comportamentoDoReflexo) {
        this.comportamentoDoReflexo = comportamentoDoReflexo;
    }

    public PeriodoDaMediaDoReflexoEnum getPeriodoMediaReflexo() {
        return this.periodoMediaReflexo;
    }

    public void setPeriodoMediaReflexo(PeriodoDaMediaDoReflexoEnum periodoMediaReflexo) {
        this.periodoMediaReflexo = periodoMediaReflexo;
    }

    public TratamentoDaFracaoDeMesDoReflexoEnum getTratamentoDaFracaoDeMesDoReflexo() {
        return this.tratamentoDaFracaoDeMesDoReflexo;
    }

    public void setTratamentoDaFracaoDeMesDoReflexo(TratamentoDaFracaoDeMesDoReflexoEnum tratamentoDaFracaoDeMesDoReflexo) {
        this.tratamentoDaFracaoDeMesDoReflexo = tratamentoDaFracaoDeMesDoReflexo;
    }

    public TipoDeQuantidadeEnum getTipoDaQuantidade() {
        return this.tipoDaQuantidade;
    }

    public void setTipoDaQuantidade(TipoDeQuantidadeEnum tipoDaQuantidade) {
        this.tipoDaQuantidade = tipoDaQuantidade;
    }

    public TipoDeQuantidadeImportadaDoCartaoDePontoEnum getTipoImportadadoDoCartaoDePonto() {
        return this.tipoImportadadoDoCartaoDePonto;
    }

    public void setTipoImportadadoDoCartaoDePonto(TipoDeQuantidadeImportadaDoCartaoDePontoEnum tipoImportadadoDoCartaoDePonto) {
        this.tipoImportadadoDoCartaoDePonto = tipoImportadadoDoCartaoDePonto;
    }

    public TipoDeQuantidadeImportadaDoCalendarioEnum getTipoImportadaCalendario() {
        return this.tipoImportadaCalendario;
    }

    public void setTipoImportadaCalendario(TipoDeQuantidadeImportadaDoCalendarioEnum tipoImportadaCalendario) {
        this.tipoImportadaCalendario = tipoImportadaCalendario;
    }

    public Boolean getAplicarProporcionalidadeAQuantidade() {
        return this.aplicarProporcionalidadeAQuantidade;
    }

    public void setAplicarProporcionalidadeAQuantidade(Boolean aplicarProporcionalidadeAQuantidade) {
        this.aplicarProporcionalidadeAQuantidade = aplicarProporcionalidadeAQuantidade;
    }

    public BigDecimal getValorInformadoDaQuantidade() {
        return this.valorInformadoDaQuantidade;
    }

    public void setValorInformadoDaQuantidade(BigDecimal valorInformadoDaQuantidade) {
        this.valorInformadoDaQuantidade = valorInformadoDaQuantidade;
    }

    public boolean isTipoDaQuantidadeInformada() {
        return TipoDeQuantidadeEnum.INFORMADA.equals((Object)this.tipoDaQuantidade);
    }

    public boolean isTipoDaQuantidadeAvos() {
        return TipoDeQuantidadeEnum.AVOS.equals((Object)this.tipoDaQuantidade);
    }

    public boolean isTipoDaQuantidadeImportadaDoCalendario() {
        return TipoDeQuantidadeEnum.IMPORTADA_DO_CALENDARIO.equals((Object)this.tipoDaQuantidade);
    }

    public boolean isTipoDaQuantidadeImportadaDoCartaoDePonto() {
        return false;
    }

    public Long getId() {
        return this.id;
    }

    public String getFormula() {
        return this.legendaDaFormula.getLegenda();
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

    public String getDescricao() {
        if (this.descricao == null) {
            return "";
        }
        return this.descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    @Override
    public void salvar() {
        if (this.isValorInformado()) {
            this.configurarVerbaInformada();
        } else if (this.isValorCalculado() && this.isPrincipal()) {
            this.configurarVerbaPrincipal();
        }
        super.salvar();
    }

    public static void remover(Verba entidade) {
        Verba.remover(RepositorioDeVerba.class, entidade, true);
    }

    public static Verba obter(Object id) {
        return (Verba)Verba.obter(RepositorioDeVerba.class, id);
    }

    public static List<Verba> obterTodos() {
        return Verba.obterTodos(RepositorioDeVerba.class);
    }

    public static List<Verba> obterTodos(String orderBy) {
        return Verba.obterTodos(RepositorioDeVerba.class, orderBy);
    }

    public String toString() {
        return Utils.objetoParaString(this, "nome", "valor");
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    public List<Verba> obterTodosReflexos() {
        ArrayList<Verba> reflexos = new ArrayList<Verba>();
        List<Verba> verbas = Verba.obterTodos(RepositorioDeVerba.class, "nome");
        for (Verba verba : verbas) {
            if (!verba.isReflexo()) continue;
            final Verba entidade = this;
            boolean existe = CollectionUtils.exists(verba.getBasesDeCalculoDoReflexo(), (Predicate)new Predicate(){

                public boolean evaluate(Object object) {
                    return ((EntidadeBase)object).obterChavePrimaria().equals(entidade.obterChavePrimaria());
                }
            });
            if (!existe) continue;
            reflexos.add(verba);
        }
        return reflexos;
    }

    public boolean isPermiteAplicarPropocionalidadeABase() {
        return this.isVerbaComum() && (this.isComPagamentoMensal() || this.isComPagamentoNoDesligamento());
    }

    public boolean isPermiteAplicarPropocionalidadeAQuantidade() {
        return this.isVerbaComum() && (this.isComPagamentoMensal() || this.isComPagamentoNoDesligamento());
    }

    public void montarNomeCompleto(Set<Verba> verbas) {
        if (verbas == null) {
            verbas = this.getBasesDeCalculoDoReflexo();
        }
        if (this.isPrincipal()) {
            this.setNome(this.getDescricao().toUpperCase());
        } else if (this.isReflexo()) {
            Verba v = null;
            for (Verba verba : verbas) {
                if (!verba.isPrincipal()) continue;
                v = verba;
                break;
            }
            this.setNome(this.getDescricao() + (v != null ? " SOBRE " + v.getDescricao() : " "));
        }
    }
}

