/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.base.Objects
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
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Type
 *  org.hibernate.annotations.Where
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDoPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MaquinaDeRateioDoPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDoPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDePagamento;
import com.google.common.base.Objects;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.Where;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBPAGAMENTO")
@SequenceGenerator(name="SQPAGAMENTO", sequenceName="SQPAGAMENTO", allocationSize=1)
@Name(value="pagamento")
@Scope(value=ScopeType.SESSION)
public class Pagamento
extends EntidadeBase
implements Serializable,
EventoAtualizacao {
    private static final long serialVersionUID = -3738552731305349359L;
    private static final int PRIORIDADE_ATUALIZACAO = 5;
    private static final String TITULO_DEBITOS_COBRAR_RECLAMANTE = "D\u00e9bitos do Reclamante";
    private static final String TITULO_OUTROS_DEBITOS_RECLAMADO = "Outros D\u00e9bitos do Reclamado";
    private static final String TITULO_CREDITOS_RECLAMANTE = "Cr\u00e9ditos do Reclamante";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPAGAMENTO")
    @Column(name="IIDPAGAMENTO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.EAGER)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="DDTCRIACAOPAGAMENTO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataCriacao;
    @Column(name="DDTPAGAMENTO")
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataPagamento;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPAGAMENTOPRECATORIO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean pagarPrecatorio = false;
    @Column(name="MVLPAGAMENTO", precision=12, scale=2)
    private BigDecimal valorPagamento;
    @Column(name="MVLPARCELACREDITORECLAMANTE", precision=12, scale=2)
    private BigDecimal valorParcelaCreditoReclamante;
    @Transient
    private Boolean selecionarValorPrincipal = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARVALORPRINCIPAL", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarValorPrincipal = false;
    @Column(name="MVLPARCELAPRINCIPAL", precision=12, scale=2)
    private BigDecimal valorParcelaPrincipal;
    @Transient
    private Boolean selecionarValorFgts = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARVALORFGTS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarValorFgts = false;
    @Column(name="MVLPARCELAFGTS", precision=12, scale=2)
    private BigDecimal valorParcelaFgts;
    @Transient
    private Boolean selecionarValorMultasDevidasReclamante = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARVALORMLTSDVDSRCLMNTE", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarValorMultasDevidasReclamante = false;
    @Column(name="MVLPARCELAMLTSDVDSRCLMNTE", precision=12, scale=2)
    private BigDecimal valorParcelaMultasDevidasReclamante;
    @Transient
    private Boolean selecionarValorMultasDevidasReclamado = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARVALORMLTSDVDSRCLMDO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarValorMultasDevidasReclamado = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPRIORIZARPAGAMENTOJUROS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean priorizarPagamentoDeJuros = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLRECOLHERDEBITOSRECLAMANTE", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean recolherDebitosReclamante = false;
    @Transient
    private Boolean selecionarCustasJudiciais = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLCUSTASJUDICIAIS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarCustasJudiciais = false;
    @Column(name="MVLCUSTASJUDICIAIS", precision=12, scale=2)
    private BigDecimal custasJudiciais;
    @Transient
    private Boolean selecionarDepositoDeFgts = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARDEPOSITODEFGTS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarDepositoDeFgts = false;
    @Transient
    private Boolean selecionarDescontoDaContribuicaoSocial = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARDSCNTDCNTRBCSCL", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarDescontoDaContribuicaoSocial = false;
    @Column(name="MVLDSCNTDCNTRBCSCL", precision=12, scale=2)
    private BigDecimal descontoDaContribuicaoSocial;
    @Transient
    private Boolean selecionarPrevidenciaPrivada = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARPREVIDENCIAPRIVADA", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarPrevidenciaPrivada = false;
    @Column(name="MVLPREVIDENCIAPRIVADA", precision=12, scale=2)
    private BigDecimal previdenciaPrivada;
    @Transient
    private Boolean selecionarPensaoAlimenticia = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARPENSAOALIMENTICIA", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarPensaoAlimenticia = false;
    @Column(name="MVLPENSAOALIMENTICIA", precision=12, scale=2)
    private BigDecimal pensaoAlimenticia;
    @Transient
    private Boolean selecionarImpostoDoReclamante = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARIMPOSTODORECLAMANTE", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarImpostoDoReclamante = false;
    @Column(name="MVLIMPOSTODORECLAMANTE", precision=12, scale=2)
    private BigDecimal impostoDoReclamante;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPAGARMLTSDVDSATRCRS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean pagarMultasDevidasTerceiros = false;
    @Where(clause="STPVINCULO = 'D' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="pagamento")
    @OrderBy(value="id")
    private Set<MultaDoPagamento> multasDevidasTerceiros = new HashSet<MultaDoPagamento>();
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPAGARHNRRSRCLMNT", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean pagarHonorariosBrutosDevidosReclamante = false;
    @Where(clause="STPVINCULO = 'D' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="pagamento")
    @OrderBy(value="id")
    private Set<HonorarioDoPagamento> honorariosBrutosDevidosReclamante = new HashSet<HonorarioDoPagamento>();
    @Column(name="MVLPARCELAOUTROSDEBITOS", precision=12, scale=2)
    private BigDecimal valorParcelaOutrosDebitos;
    @Transient
    private Boolean selecionarCustasJudiciaisOutrosDebitos = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLCUSTASOUTROSDEBITOS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarCustasJudiciaisOutrosDebitos = false;
    @Column(name="MVLCUSTASOUTROSDEBITOS", precision=12, scale=2)
    private BigDecimal custasJudiciaisOutrosDebitos;
    @Transient
    private Boolean selecionarInssSobreSalariosDevidosOutrosDebitos = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARINSSSALRDEVIDOOUTROS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarInssSobreSalariosDevidosOutrosDebitos = false;
    @Column(name="MVLINSSSALARIODEVIDOOUTROS", precision=12, scale=2)
    private BigDecimal inssSobreSalariosDevidosOutrosDebitos;
    @Transient
    private Boolean selecionarInssSobreSalariosPagosOutrosDebitos = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARINSSSALARIOPAGOOUTROS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarInssSobreSalariosPagosOutrosDebitos = false;
    @Column(name="MVLINSSSALARIOPAGOOUTROS", precision=12, scale=2)
    private BigDecimal inssSobreSalariosPagosOutrosDebitos;
    @Transient
    private Boolean selecionarJurosDePrevidenciaPrivadaOutrosDebitos = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARJUROPREVPRIVADAOUTROS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarJurosDePrevidenciaPrivadaOutrosDebitos = false;
    @Column(name="MVLJUROSPREVPRIVADAOUTROS", precision=12, scale=2)
    private BigDecimal jurosDePrevidenciaPrivadaOutrosDebitos;
    @Transient
    private Boolean selecionarImpostoDeRendaDoReclamanteOutrosDebitos = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARIMPOSTORENDAOUTROS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarImpostoDeRendaDoReclamanteOutrosDebitos = false;
    @Column(name="MVLIMPOSTORENDAOUTROS", precision=12, scale=2)
    private BigDecimal impostoDeRendaDoReclamanteOutrosDebitos;
    @Transient
    private Boolean selecionarInssDezPorcento = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARINSSDEZPORCENTO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarInssDezPorcento = false;
    @Column(name="MVLINSSDEZPORCENTO", precision=12, scale=2)
    private BigDecimal inssDezPorcento;
    @Transient
    private Boolean selecionarInssMeioPorcento = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARINSSMEIOPORCENTO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarInssMeioPorcento = false;
    @Column(name="MVLINSSMEIOPORCENTO", precision=12, scale=2)
    private BigDecimal inssMeioPorcento;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPAGARMLTSDVDSATRCRSOUTROS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean pagarMultasDevidasTerceirosOutrosDebitos = false;
    @Where(clause="STPVINCULO = 'O' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="pagamento")
    @OrderBy(value="id")
    private Set<MultaDoPagamento> multasDevidasTerceirosOutrosDebitos = new HashSet<MultaDoPagamento>();
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPAGARHNRRSRCLMDOUTROS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean pagarHonorariosBrutosDevidosReclamadoOutrosDebitos = false;
    @Where(clause="STPVINCULO = 'O' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="pagamento")
    @OrderBy(value="id")
    private Set<HonorarioDoPagamento> honorariosBrutosDevidosReclamadoOutrosDebitos = new HashSet<HonorarioDoPagamento>();
    @Column(name="MVLPARCELADEBITOSRECLAMANTE", precision=12, scale=2)
    private BigDecimal valorParcelaDebitosCobrarDoReclamante;
    @Transient
    private Boolean selecionarCustasJudiciaisDebitosCobrarDoReclamante = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLCUSTASDEBITOSRECLAMANTE", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarCustasJudiciaisDebitosCobrarDoReclamante = false;
    @Column(name="MVLCUSTASDEBITOSRECLAMANTE", precision=12, scale=2)
    private BigDecimal custasJudiciaisDebitosCobrarDoReclamante;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPAGARMLTSDVDSATRCRSDEBRTE", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean pagarMultasDevidasTerceirosDebitosCobrarDoReclamante = false;
    @Where(clause="STPVINCULO = 'C' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="pagamento")
    @OrderBy(value="id")
    private Set<MultaDoPagamento> multasDevidasTerceirosDebitosCobrarDoReclamante = new HashSet<MultaDoPagamento>();
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPAGARHNRRSRCLMTDEBRTE", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean pagarHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante = false;
    @Where(clause="STPVINCULO = 'C' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="pagamento")
    @OrderBy(value="id")
    private Set<HonorarioDoPagamento> honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante = new HashSet<HonorarioDoPagamento>();
    @Column(name="IFOLHAEVENTO", columnDefinition="VARCHAR2(80)")
    private String folhaDoEvento;
    @Transient
    private Boolean dispararExcecoesNaValidacao = Boolean.TRUE;
    @Transient
    protected MaquinaDeRateioDoPagamento maquinaDeRateioDoPagamento = new MaquinaDeRateioDoPagamento(this);

    public Pagamento() {
        super(RepositorioDePagamento.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public void salvar() {
        this.setDataCriacao(new Date());
        Pagamento.getRepositorio(RepositorioDePagamento.class).salvar(this);
    }

    @Override
    public Pagamento validar() {
        this.validar(this.getDispararExcecoesNaValidacao());
        return this;
    }

    public Boolean validar(Boolean dispararExcecoes) {
        NegocioException excecao = new NegocioException();
        this.adicionarMensagensDeExcecao(excecao, this.consistirCamposObrigatorios());
        if (excecao.existeMensagensDeRecurso() && dispararExcecoes.booleanValue()) {
            throw excecao;
        }
        if (excecao.existeMensagensDeRecurso()) {
            return Boolean.FALSE;
        }
        this.adicionarMensagensDeExcecao(excecao, this.consistirRegistroDuplicado());
        this.adicionarMensagensDeExcecao(excecao, this.consistirDataDoPagamento());
        this.adicionarMensagensDeExcecao(excecao, this.verificarRateioInicial());
        this.adicionarMensagensDeExcecao(excecao, this.consistirPagamentosDeCreditosDoReclamante());
        this.adicionarMensagensDeExcecao(excecao, this.consistirRecolhimentosDeDebitosDoReclamante());
        this.adicionarMensagensDeExcecao(excecao, this.consistirPagamentosDeOutrosDebitosDoReclamado());
        this.adicionarMensagensDeExcecao(excecao, this.consistirPagamentosDeDebitosCobrarDoReclamante());
        if (excecao.existeMensagensDeRecurso() && dispararExcecoes.booleanValue()) {
            throw excecao;
        }
        if (excecao.existeMensagensDeRecurso()) {
            return Boolean.FALSE;
        }
        return Boolean.TRUE;
    }

    private void adicionarMensagensDeExcecao(NegocioException excecao, NegocioException excecaoParaAdicionar) {
        if (excecaoParaAdicionar.existeMensagensDeRecurso()) {
            for (MensagemDeRecurso mensagem : excecaoParaAdicionar.getMensagensDeRecurso()) {
                excecao.adicionarMensagemDeRecurso(mensagem);
            }
        }
    }

    private NegocioException consistirDataDoPagamento() {
        NegocioException excecao = new NegocioException();
        if (Utils.naoNulos(this.getDataPagamento(), this.getCalculo().getDataDeLiquidacao()) && HelperDate.dateBefore(this.getDataPagamento(), this.getCalculo().getDataDeLiquidacao())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0127, Utils.formatarData(this.getCalculo().getDataDeLiquidacao())));
        }
        if (Utils.naoNulo(this.getDataPagamento()) && HelperDate.dateAfter(this.getDataPagamento(), new Date())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0128, new Object[0]));
        }
        return excecao;
    }

    public NegocioException verificarRateioInicial() {
        NegocioException excecao = new NegocioException();
        BigDecimal somaPagamentos = Utils.somar(this.getValorParcelaCreditoReclamante(), this.getValorParcelaOutrosDebitos());
        if ((somaPagamentos = Utils.somar(somaPagamentos, this.getValorParcelaDebitosCobrarDoReclamante(), somaPagamentos)).compareTo(this.getValorPagamento()) != 0) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0125, new Object[0]));
        }
        return excecao;
    }

    public NegocioException consistirRegistroDuplicado() {
        NegocioException excecao = new NegocioException();
        for (Pagamento pagamento : Pagamento.obterPagamentosDoCalculo(this.getCalculo())) {
            if (Objects.equal((Object)pagamento.getId(), (Object)this.getId()) || !HelperDate.dateEquals(this.getDataPagamento(), pagamento.getDataPagamento())) continue;
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0138, new Object[0]));
            break;
        }
        return excecao;
    }

    public NegocioException consistirCamposObrigatorios() {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.getValorPagamento())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorPagamento", Mensagens.MSG0003, "Valor do Pagamento"));
        }
        if (Utils.nulo(this.getDataPagamento())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataPagamento", Mensagens.MSG0003, "Data do Pagamento"));
        }
        if (Utils.nulo(this.getValorParcelaCreditoReclamante())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorCreditoReclamante", Mensagens.MSG0003, "Valor para Pagamento de Cr\u00e9ditos do Reclamante"));
        }
        if (Utils.nulo(this.getValorParcelaOutrosDebitos())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorOutrosDebitosReclamado", Mensagens.MSG0003, "Valor para Pagamento de Outros D\u00e9bitos do Reclamado"));
        }
        if (this.getSelecionarValorPrincipal().booleanValue() && !this.getApurarValorPrincipal().booleanValue() && Utils.nulo(this.getValorParcelaPrincipal())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorPrincipal", Mensagens.MSG0003, "Valor para Pagamento de Principal"));
        }
        if (this.getSelecionarValorFgts().booleanValue() && !this.getApurarValorFgts().booleanValue() && Utils.nulo(this.getValorParcelaFgts())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorFGTS", Mensagens.MSG0003, "Valor para Pagamento de FGTS"));
        }
        if (this.getSelecionarValorMultasDevidasReclamante().booleanValue() && !this.getApurarValorMultasDevidasReclamante().booleanValue() && Utils.nulo(this.getValorParcelaMultasDevidasReclamante())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorMultasDevidasReclamante", Mensagens.MSG0003, "Valor para Pagamento de Multas/Indeniza\u00e7\u00f5es devidas ao Reclamante"));
        }
        if (this.getSelecionarCustasJudiciais().booleanValue() && !this.getApurarCustasJudiciais().booleanValue() && Utils.nulo(this.getCustasJudiciais())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorCustasJudiciais", Mensagens.MSG0003, "Valor para Recolhimento de Custas Judiciais"));
        }
        if (this.getSelecionarDescontoDaContribuicaoSocial().booleanValue() && !this.getApurarDescontoDaContribuicaoSocial().booleanValue() && Utils.nulo(this.getDescontoDaContribuicaoSocial())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorDescontoDaContribuicaoSocial", Mensagens.MSG0003, "Valor para Recolhimento de Desconto da Contribui\u00e7\u00e3o Social"));
        }
        if (this.getSelecionarPrevidenciaPrivada().booleanValue() && !this.getApurarPrevidenciaPrivada().booleanValue() && Utils.nulo(this.getPrevidenciaPrivada())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorPrevidenciaPrivada", Mensagens.MSG0003, "Valor para Recolhimento de Previd\u00eancia Privada"));
        }
        if (this.getSelecionarPensaoAlimenticia().booleanValue() && !this.getApurarPensaoAlimenticia().booleanValue() && Utils.nulo(this.getPensaoAlimenticia())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorPensaoAlimenticia", Mensagens.MSG0003, "Valor para Recolhimento de Pens\u00e3o Aliment\u00edcia"));
        }
        if (this.getSelecionarImpostoDoReclamante().booleanValue() && !this.getApurarImpostoDoReclamante().booleanValue() && Utils.nulo(this.getImpostoDoReclamante())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorImpostoDoReclamante", Mensagens.MSG0003, "Valor para Recolhimento de Imposto de Renda do Reclamante"));
        }
        if (this.getSelecionarCustasJudiciaisOutrosDebitos().booleanValue() && !this.getApurarCustasJudiciaisOutrosDebitos().booleanValue() && Utils.nulo(this.getCustasJudiciaisOutrosDebitos())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorCustasJudiciaisOutrosDebitos", Mensagens.MSG0003, "Valor para Pagamento de Custas Judiciais"));
        }
        if (this.getSelecionarInssSobreSalariosDevidosOutrosDebitos().booleanValue() && !this.getApurarInssSobreSalariosDevidosOutrosDebitos().booleanValue() && Utils.nulo(this.getInssSobreSalariosDevidosOutrosDebitos())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorInssSobreSalariosDevidosOutrosDebitos", Mensagens.MSG0003, "Valor para Pagamento de Contribui\u00e7\u00e3o Social sobre Sal\u00e1rios Devidos"));
        }
        if (this.getSelecionarInssSobreSalariosPagosOutrosDebitos().booleanValue() && !this.getApurarInssSobreSalariosPagosOutrosDebitos().booleanValue() && Utils.nulo(this.getInssSobreSalariosPagosOutrosDebitos())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorInssSobreSalariosPagosOutrosDebitos", Mensagens.MSG0003, "Valor para Pagamento de Contribui\u00e7\u00e3o Social sobre Sal\u00e1rios Pagos"));
        }
        if (this.getSelecionarJurosDePrevidenciaPrivadaOutrosDebitos().booleanValue() && !this.getApurarJurosDePrevidenciaPrivadaOutrosDebitos().booleanValue() && Utils.nulo(this.getJurosDePrevidenciaPrivadaOutrosDebitos())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorJurosDePrevidenciaPrivadaOutrosDebitos", Mensagens.MSG0003, "Valor para Pagamento de Juros de Previd\u00eancia Privada"));
        }
        if (this.getSelecionarImpostoDeRendaDoReclamanteOutrosDebitos().booleanValue() && !this.getApurarImpostoDeRendaDoReclamanteOutrosDebitos().booleanValue() && Utils.nulo(this.getImpostoDeRendaDoReclamanteOutrosDebitos())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorImpostoDeRendaDoReclamanteOutrosDebitos", Mensagens.MSG0003, "Valor para Pagamento de Imposto de Renda do Reclamante"));
        }
        if (this.getSelecionarInssDezPorcento().booleanValue() && !this.getApurarInssDezPorcento().booleanValue() && Utils.nulo(this.getInssDezPorcento())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorInssDezPorcento", Mensagens.MSG0003, "Valor para Pagamento de Contribui\u00e7\u00e3o Social 10%"));
        }
        if (this.getSelecionarInssMeioPorcento().booleanValue() && !this.getApurarInssMeioPorcento().booleanValue() && Utils.nulo(this.getInssMeioPorcento())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorInssMeioPorcento", Mensagens.MSG0003, "Valor para Pagamento de Contribui\u00e7\u00e3o Social 0,5%"));
        }
        return excecao;
    }

    public NegocioException consistirPagamentosDeCreditosDoReclamante() {
        NegocioException excecao = new NegocioException();
        if (BigDecimal.ZERO.compareTo(this.getValorParcelaCreditoReclamante()) == 0 && (this.getSelecionarValorPrincipal().booleanValue() || this.getSelecionarValorFgts().booleanValue() || this.getSelecionarValorMultasDevidasReclamante().booleanValue())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0131, TITULO_CREDITOS_RECLAMANTE));
        }
        if (BigDecimal.ZERO.compareTo(this.getValorParcelaCreditoReclamante()) < 0) {
            Boolean existeSelecao = this.getSelecionarValorPrincipal() != false || this.getSelecionarValorFgts() != false || this.getSelecionarValorMultasDevidasReclamante() != false;
            if (!existeSelecao.booleanValue() && !this.getPagarPrecatorio().booleanValue()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0132, "pago", TITULO_CREDITOS_RECLAMANTE, "pagamento"));
            } else if (existeSelecao.booleanValue()) {
                Boolean existeApurado = this.getSelecionarValorPrincipal() != false && this.getApurarValorPrincipal() != false || this.getSelecionarValorFgts() != false && this.getApurarValorFgts() != false || this.getSelecionarValorMultasDevidasReclamante() != false && this.getApurarValorMultasDevidasReclamante() != false;
                BigDecimal valorInformado = BigDecimal.ZERO;
                valorInformado = Utils.somar(valorInformado, this.getValorParcelaPrincipal(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getValorParcelaFgts(), valorInformado);
                if ((valorInformado = Utils.somar(valorInformado, this.getValorParcelaMultasDevidasReclamante(), valorInformado)).compareTo(this.getValorParcelaCreditoReclamante()) > 0) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0133, "pagamento", TITULO_CREDITOS_RECLAMANTE, "pago"));
                } else if (valorInformado.compareTo(this.getValorParcelaCreditoReclamante()) < 0 && !existeApurado.booleanValue()) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0134, TITULO_CREDITOS_RECLAMANTE));
                }
            }
        }
        return excecao;
    }

    public NegocioException consistirRecolhimentosDeDebitosDoReclamante() {
        NegocioException excecao = new NegocioException();
        if (this.getRecolherDebitosReclamante().booleanValue()) {
            Boolean existeSelecao = this.getSelecionarCustasJudiciais() != false || this.getSelecionarDepositoDeFgts() != false || this.getSelecionarDescontoDaContribuicaoSocial() != false || this.getSelecionarPrevidenciaPrivada() != false || this.getSelecionarPensaoAlimenticia() != false || this.getSelecionarImpostoDoReclamante() != false || this.getPagarMultasDevidasTerceiros() != false || this.getPagarHonorariosBrutosDevidosReclamante() != false;
            if (!existeSelecao.booleanValue()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0132, "recolhido", TITULO_DEBITOS_COBRAR_RECLAMANTE, "recolhimento"));
            } else {
                BigDecimal valorInformado = BigDecimal.ZERO;
                valorInformado = Utils.somar(valorInformado, this.getCustasJudiciais(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getDescontoDaContribuicaoSocial(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getPrevidenciaPrivada(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getPensaoAlimenticia(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getImpostoDoReclamante(), valorInformado);
                for (MultaDoPagamento multa : this.getMultasDevidasTerceiros()) {
                    valorInformado = Utils.somar(valorInformado, multa.getValorMulta(), valorInformado);
                }
                for (HonorarioDoPagamento honorario : this.getHonorariosBrutosDevidosReclamante()) {
                    valorInformado = Utils.somar(valorInformado, honorario.getValorHonorario(), valorInformado);
                }
                if (valorInformado.compareTo(this.getValorParcelaCreditoReclamante()) > 0) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0133, "recolhimento", TITULO_DEBITOS_COBRAR_RECLAMANTE, "pago de Cr\u00e9ditos do Reclamante"));
                }
            }
        }
        return excecao;
    }

    public NegocioException consistirPagamentosDeOutrosDebitosDoReclamado() {
        NegocioException excecao = new NegocioException();
        if (BigDecimal.ZERO.compareTo(this.getValorParcelaOutrosDebitos()) == 0 && (this.getSelecionarCustasJudiciaisOutrosDebitos().booleanValue() || this.getSelecionarInssSobreSalariosDevidosOutrosDebitos().booleanValue() || this.getSelecionarInssSobreSalariosPagosOutrosDebitos().booleanValue() || this.getSelecionarJurosDePrevidenciaPrivadaOutrosDebitos().booleanValue() || this.getSelecionarImpostoDeRendaDoReclamanteOutrosDebitos().booleanValue() || this.getSelecionarInssDezPorcento().booleanValue() || this.getSelecionarInssMeioPorcento().booleanValue() || this.getPagarMultasDevidasTerceirosOutrosDebitos().booleanValue() || this.getPagarHonorariosBrutosDevidosReclamadoOutrosDebitos().booleanValue())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0131, TITULO_OUTROS_DEBITOS_RECLAMADO));
        }
        if (BigDecimal.ZERO.compareTo(this.getValorParcelaOutrosDebitos()) < 0) {
            Boolean existeSelecao = this.getSelecionarCustasJudiciaisOutrosDebitos() != false || this.getSelecionarInssSobreSalariosDevidosOutrosDebitos() != false || this.getSelecionarInssSobreSalariosPagosOutrosDebitos() != false || this.getSelecionarJurosDePrevidenciaPrivadaOutrosDebitos() != false || this.getSelecionarImpostoDeRendaDoReclamanteOutrosDebitos() != false || this.getSelecionarInssDezPorcento() != false || this.getSelecionarInssMeioPorcento() != false || this.getPagarMultasDevidasTerceirosOutrosDebitos() != false || this.getPagarHonorariosBrutosDevidosReclamadoOutrosDebitos() != false;
            if (!existeSelecao.booleanValue()) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0132, "pago", TITULO_OUTROS_DEBITOS_RECLAMADO, "pagamento"));
            } else {
                Boolean existeApurado = this.getSelecionarCustasJudiciaisOutrosDebitos() != false && this.getApurarCustasJudiciaisOutrosDebitos() != false || this.getSelecionarInssSobreSalariosDevidosOutrosDebitos() != false && this.getApurarInssSobreSalariosDevidosOutrosDebitos() != false || this.getSelecionarInssSobreSalariosPagosOutrosDebitos() != false && this.getApurarInssSobreSalariosPagosOutrosDebitos() != false || this.getSelecionarJurosDePrevidenciaPrivadaOutrosDebitos() != false && this.getApurarJurosDePrevidenciaPrivadaOutrosDebitos() != false || this.getSelecionarImpostoDeRendaDoReclamanteOutrosDebitos() != false && this.getApurarImpostoDeRendaDoReclamanteOutrosDebitos() != false || this.getSelecionarInssDezPorcento() != false && this.getApurarInssDezPorcento() != false || this.getSelecionarInssMeioPorcento() != false && this.getApurarInssMeioPorcento() != false;
                if (!existeApurado.booleanValue()) {
                    for (MultaDoPagamento multa : this.getMultasDevidasTerceirosOutrosDebitos()) {
                        if (!multa.getApurarMulta().booleanValue()) continue;
                        existeApurado = Boolean.TRUE;
                        break;
                    }
                }
                if (!existeApurado.booleanValue()) {
                    for (HonorarioDoPagamento honorario : this.getHonorariosBrutosDevidosReclamadoOutrosDebitos()) {
                        if (!honorario.getApurarHonorario().booleanValue()) continue;
                        existeApurado = Boolean.TRUE;
                        break;
                    }
                }
                BigDecimal valorInformado = BigDecimal.ZERO;
                valorInformado = Utils.somar(valorInformado, this.getCustasJudiciaisOutrosDebitos(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getInssSobreSalariosDevidosOutrosDebitos(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getInssSobreSalariosPagosOutrosDebitos(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getJurosDePrevidenciaPrivadaOutrosDebitos(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getImpostoDeRendaDoReclamanteOutrosDebitos(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getInssDezPorcento(), valorInformado);
                valorInformado = Utils.somar(valorInformado, this.getInssMeioPorcento(), valorInformado);
                for (MultaDoPagamento multa : this.getMultasDevidasTerceirosOutrosDebitos()) {
                    valorInformado = Utils.somar(valorInformado, multa.getValorMulta(), valorInformado);
                }
                for (HonorarioDoPagamento honorario : this.getHonorariosBrutosDevidosReclamadoOutrosDebitos()) {
                    valorInformado = Utils.somar(valorInformado, honorario.getValorHonorario(), valorInformado);
                }
                if (valorInformado.compareTo(this.getValorParcelaOutrosDebitos()) > 0) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0133, "pagamento", TITULO_OUTROS_DEBITOS_RECLAMADO, "pago"));
                } else if (valorInformado.compareTo(this.getValorParcelaOutrosDebitos()) < 0 && !existeApurado.booleanValue()) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0134, TITULO_OUTROS_DEBITOS_RECLAMADO));
                }
            }
        }
        return excecao;
    }

    public NegocioException consistirPagamentosDeDebitosCobrarDoReclamante() {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.getValorParcelaDebitosCobrarDoReclamante())) {
            return excecao;
        }
        if (BigDecimal.ZERO.compareTo(this.getValorParcelaDebitosCobrarDoReclamante()) == 0 && (this.getSelecionarCustasJudiciaisDebitosCobrarDoReclamante().booleanValue() || this.getPagarMultasDevidasTerceirosDebitosCobrarDoReclamante().booleanValue() || this.getPagarHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante().booleanValue())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0131, TITULO_DEBITOS_COBRAR_RECLAMANTE));
        }
        if (BigDecimal.ZERO.compareTo(this.getValorParcelaDebitosCobrarDoReclamante()) >= 0) {
            return excecao;
        }
        Boolean existeSelecao = this.getSelecionarCustasJudiciaisDebitosCobrarDoReclamante() != false || this.getPagarMultasDevidasTerceirosDebitosCobrarDoReclamante() != false || this.getPagarHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante() != false;
        if (!existeSelecao.booleanValue()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0132, "pago", TITULO_DEBITOS_COBRAR_RECLAMANTE, "pagamento"));
            return excecao;
        }
        Boolean existeApurado = this.getSelecionarCustasJudiciaisDebitosCobrarDoReclamante() != false && this.getApurarCustasJudiciaisDebitosCobrarDoReclamante() != false;
        if (!existeApurado.booleanValue()) {
            for (MultaDoPagamento multa : this.getMultasDevidasTerceirosDebitosCobrarDoReclamante()) {
                if (!multa.getApurarMulta().booleanValue()) continue;
                existeApurado = Boolean.TRUE;
                break;
            }
        }
        if (!existeApurado.booleanValue()) {
            for (HonorarioDoPagamento honorario : this.getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante()) {
                if (!honorario.getApurarHonorario().booleanValue()) continue;
                existeApurado = Boolean.TRUE;
                break;
            }
        }
        BigDecimal valorInformado = BigDecimal.ZERO;
        valorInformado = Utils.somar(valorInformado, this.getCustasJudiciaisDebitosCobrarDoReclamante(), valorInformado);
        for (MultaDoPagamento multa : this.getMultasDevidasTerceirosDebitosCobrarDoReclamante()) {
            valorInformado = Utils.somar(valorInformado, multa.getValorMulta(), valorInformado);
        }
        for (HonorarioDoPagamento honorario : this.getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante()) {
            valorInformado = Utils.somar(valorInformado, honorario.getValorHonorario(), valorInformado);
        }
        if (valorInformado.compareTo(this.getValorParcelaDebitosCobrarDoReclamante()) > 0) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0133, "pagamento", TITULO_DEBITOS_COBRAR_RECLAMANTE, "pago"));
        } else if (valorInformado.compareTo(this.getValorParcelaDebitosCobrarDoReclamante()) < 0 && !existeApurado.booleanValue()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0134, TITULO_DEBITOS_COBRAR_RECLAMANTE));
        }
        return excecao;
    }

    public static void remover(Pagamento pagamento) {
        Pagamento.remover(RepositorioDePagamento.class, pagamento, Boolean.TRUE);
    }

    public static Pagamento obter(Object id) {
        return (Pagamento)Pagamento.obter(RepositorioDePagamento.class, id);
    }

    public static List<Pagamento> obterPagamentosDoCalculo(Calculo calculo) {
        return Pagamento.getRepositorio(RepositorioDePagamento.class).obterPagamentosDoCalculo(calculo);
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

    public Date getDataCriacao() {
        return this.dataCriacao;
    }

    public void setDataCriacao(Date dataCriacao) {
        this.dataCriacao = dataCriacao;
    }

    public Date getDataPagamento() {
        return this.dataPagamento;
    }

    public void setDataPagamento(Date dataPagamento) {
        this.dataPagamento = dataPagamento;
    }

    public BigDecimal getValorPagamento() {
        return this.valorPagamento;
    }

    public void setValorPagamento(BigDecimal valorPagamento) {
        this.valorPagamento = valorPagamento;
    }

    public BigDecimal getValorParcelaCreditoReclamante() {
        return this.valorParcelaCreditoReclamante;
    }

    public void setValorParcelaCreditoReclamante(BigDecimal valorParcelaCreditoReclamante) {
        this.valorParcelaCreditoReclamante = valorParcelaCreditoReclamante;
    }

    public Boolean getSelecionarValorPrincipal() {
        return this.selecionarValorPrincipal;
    }

    public void setSelecionarValorPrincipal(Boolean selecionarValorPrincipal) {
        this.selecionarValorPrincipal = selecionarValorPrincipal;
    }

    public Boolean getApurarValorPrincipal() {
        return this.apurarValorPrincipal;
    }

    public void setApurarValorPrincipal(Boolean apurarValorPrincipal) {
        this.apurarValorPrincipal = apurarValorPrincipal;
    }

    public BigDecimal getValorParcelaPrincipal() {
        return this.valorParcelaPrincipal;
    }

    public void setValorParcelaPrincipal(BigDecimal valorParcelaPrincipal) {
        this.valorParcelaPrincipal = valorParcelaPrincipal;
    }

    public Boolean getSelecionarValorFgts() {
        return this.selecionarValorFgts;
    }

    public void setSelecionarValorFgts(Boolean selecionarValorFgts) {
        this.selecionarValorFgts = selecionarValorFgts;
    }

    public Boolean getApurarValorFgts() {
        return this.apurarValorFgts;
    }

    public void setApurarValorFgts(Boolean apurarValorFgts) {
        this.apurarValorFgts = apurarValorFgts;
    }

    public BigDecimal getValorParcelaFgts() {
        return this.valorParcelaFgts;
    }

    public void setValorParcelaFgts(BigDecimal valorParcelaFgts) {
        this.valorParcelaFgts = valorParcelaFgts;
    }

    public Boolean getSelecionarValorMultasDevidasReclamante() {
        return this.selecionarValorMultasDevidasReclamante;
    }

    public void setSelecionarValorMultasDevidasReclamante(Boolean selecionarValorMultasDevidasReclamante) {
        this.selecionarValorMultasDevidasReclamante = selecionarValorMultasDevidasReclamante;
    }

    public Boolean getApurarValorMultasDevidasReclamante() {
        return this.apurarValorMultasDevidasReclamante;
    }

    public void setApurarValorMultasDevidasReclamante(Boolean apurarValorMultasDevidasReclamante) {
        this.apurarValorMultasDevidasReclamante = apurarValorMultasDevidasReclamante;
    }

    public BigDecimal getValorParcelaMultasDevidasReclamante() {
        return this.valorParcelaMultasDevidasReclamante;
    }

    public void setValorParcelaMultasDevidasReclamante(BigDecimal valorParcelaMultasDevidasReclamante) {
        this.valorParcelaMultasDevidasReclamante = valorParcelaMultasDevidasReclamante;
    }

    public Boolean getSelecionarValorMultasDevidasReclamado() {
        return this.selecionarValorMultasDevidasReclamado;
    }

    public void setSelecionarValorMultasDevidasReclamado(Boolean selecionarValorMultasDevidasReclamado) {
        this.selecionarValorMultasDevidasReclamado = selecionarValorMultasDevidasReclamado;
    }

    public Boolean getApurarValorMultasDevidasReclamado() {
        return this.apurarValorMultasDevidasReclamado;
    }

    public void setApurarValorMultasDevidasReclamado(Boolean apurarValorMultasDevidasReclamado) {
        this.apurarValorMultasDevidasReclamado = apurarValorMultasDevidasReclamado;
    }

    public Boolean getPriorizarPagamentoDeJuros() {
        return this.priorizarPagamentoDeJuros;
    }

    public void setPriorizarPagamentoDeJuros(Boolean priorizarPagamentoDeJuros) {
        this.priorizarPagamentoDeJuros = priorizarPagamentoDeJuros;
    }

    public Boolean getRecolherDebitosReclamante() {
        return this.recolherDebitosReclamante;
    }

    public void setRecolherDebitosReclamante(Boolean recolherDebitosReclamante) {
        this.recolherDebitosReclamante = recolherDebitosReclamante;
    }

    public Boolean getApurarDepositoDeFgts() {
        return this.apurarDepositoDeFgts;
    }

    public void setApurarDepositoDeFgts(Boolean apurarDepositoDeFgts) {
        this.apurarDepositoDeFgts = apurarDepositoDeFgts;
    }

    public Boolean getApurarDescontoDaContribuicaoSocial() {
        return this.apurarDescontoDaContribuicaoSocial;
    }

    public void setApurarDescontoDaContribuicaoSocial(Boolean apurarDescontoDaContribuicaoSocial) {
        this.apurarDescontoDaContribuicaoSocial = apurarDescontoDaContribuicaoSocial;
    }

    public BigDecimal getDescontoDaContribuicaoSocial() {
        return this.descontoDaContribuicaoSocial;
    }

    public void setDescontoDaContribuicaoSocial(BigDecimal descontoDaContribuicaoSocial) {
        this.descontoDaContribuicaoSocial = descontoDaContribuicaoSocial;
    }

    public Boolean getApurarPrevidenciaPrivada() {
        return this.apurarPrevidenciaPrivada;
    }

    public void setApurarPrevidenciaPrivada(Boolean apurarPrevidenciaPrivada) {
        this.apurarPrevidenciaPrivada = apurarPrevidenciaPrivada;
    }

    public BigDecimal getPrevidenciaPrivada() {
        return this.previdenciaPrivada;
    }

    public void setPrevidenciaPrivada(BigDecimal previdenciaPrivada) {
        this.previdenciaPrivada = previdenciaPrivada;
    }

    public Boolean getApurarPensaoAlimenticia() {
        return this.apurarPensaoAlimenticia;
    }

    public void setApurarPensaoAlimenticia(Boolean apurarPensaoAlimenticia) {
        this.apurarPensaoAlimenticia = apurarPensaoAlimenticia;
    }

    public BigDecimal getPensaoAlimenticia() {
        return this.pensaoAlimenticia;
    }

    public void setPensaoAlimenticia(BigDecimal pensaoAlimenticia) {
        this.pensaoAlimenticia = pensaoAlimenticia;
    }

    public Boolean getApurarImpostoDoReclamante() {
        return this.apurarImpostoDoReclamante;
    }

    public void setApurarImpostoDoReclamante(Boolean apurarImpostoDoReclamante) {
        this.apurarImpostoDoReclamante = apurarImpostoDoReclamante;
    }

    public BigDecimal getImpostoDoReclamante() {
        return this.impostoDoReclamante;
    }

    public void setImpostoDoReclamante(BigDecimal impostoDoReclamante) {
        this.impostoDoReclamante = impostoDoReclamante;
    }

    public Boolean getPagarMultasDevidasTerceiros() {
        return this.pagarMultasDevidasTerceiros;
    }

    public void setPagarMultasDevidasTerceiros(Boolean pagarMultasDevidasTerceiros) {
        this.pagarMultasDevidasTerceiros = pagarMultasDevidasTerceiros;
    }

    public Boolean getApurarInssSobreSalariosDevidosOutrosDebitos() {
        return this.apurarInssSobreSalariosDevidosOutrosDebitos;
    }

    public void setApurarInssSobreSalariosDevidosOutrosDebitos(Boolean apurarInssSobreSalariosDevidosOutrosDebitos) {
        this.apurarInssSobreSalariosDevidosOutrosDebitos = apurarInssSobreSalariosDevidosOutrosDebitos;
    }

    public BigDecimal getInssSobreSalariosDevidosOutrosDebitos() {
        return this.inssSobreSalariosDevidosOutrosDebitos;
    }

    public void setInssSobreSalariosDevidosOutrosDebitos(BigDecimal inssSobreSalariosDevidosOutrosDebitos) {
        this.inssSobreSalariosDevidosOutrosDebitos = inssSobreSalariosDevidosOutrosDebitos;
    }

    public Boolean getApurarInssSobreSalariosPagosOutrosDebitos() {
        return this.apurarInssSobreSalariosPagosOutrosDebitos;
    }

    public void setApurarInssSobreSalariosPagosOutrosDebitos(Boolean apurarInssSobreSalariosPagosOutrosDebitos) {
        this.apurarInssSobreSalariosPagosOutrosDebitos = apurarInssSobreSalariosPagosOutrosDebitos;
    }

    public BigDecimal getInssSobreSalariosPagosOutrosDebitos() {
        return this.inssSobreSalariosPagosOutrosDebitos;
    }

    public void setInssSobreSalariosPagosOutrosDebitos(BigDecimal inssSobreSalariosPagosOutrosDebitos) {
        this.inssSobreSalariosPagosOutrosDebitos = inssSobreSalariosPagosOutrosDebitos;
    }

    public Boolean getApurarJurosDePrevidenciaPrivadaOutrosDebitos() {
        return this.apurarJurosDePrevidenciaPrivadaOutrosDebitos;
    }

    public void setApurarJurosDePrevidenciaPrivadaOutrosDebitos(Boolean apurarJurosDePrevidenciaPrivadaOutrosDebitos) {
        this.apurarJurosDePrevidenciaPrivadaOutrosDebitos = apurarJurosDePrevidenciaPrivadaOutrosDebitos;
    }

    public BigDecimal getJurosDePrevidenciaPrivadaOutrosDebitos() {
        return this.jurosDePrevidenciaPrivadaOutrosDebitos;
    }

    public void setJurosDePrevidenciaPrivadaOutrosDebitos(BigDecimal jurosDePrevidenciaPrivadaOutrosDebitos) {
        this.jurosDePrevidenciaPrivadaOutrosDebitos = jurosDePrevidenciaPrivadaOutrosDebitos;
    }

    public Boolean getApurarImpostoDeRendaDoReclamanteOutrosDebitos() {
        return this.apurarImpostoDeRendaDoReclamanteOutrosDebitos;
    }

    public void setApurarImpostoDeRendaDoReclamanteOutrosDebitos(Boolean apurarImpostoDeRendaDoReclamanteOutrosDebitos) {
        this.apurarImpostoDeRendaDoReclamanteOutrosDebitos = apurarImpostoDeRendaDoReclamanteOutrosDebitos;
    }

    public BigDecimal getImpostoDeRendaDoReclamanteOutrosDebitos() {
        return this.impostoDeRendaDoReclamanteOutrosDebitos;
    }

    public void setImpostoDeRendaDoReclamanteOutrosDebitos(BigDecimal impostoDeRendaDoReclamanteOutrosDebitos) {
        this.impostoDeRendaDoReclamanteOutrosDebitos = impostoDeRendaDoReclamanteOutrosDebitos;
    }

    public Boolean getApurarInssDezPorcento() {
        return this.apurarInssDezPorcento;
    }

    public void setApurarInssDezPorcento(Boolean apurarInssDezPorcento) {
        this.apurarInssDezPorcento = apurarInssDezPorcento;
    }

    public BigDecimal getInssDezPorcento() {
        return this.inssDezPorcento;
    }

    public void setInssDezPorcento(BigDecimal inssDezPorcento) {
        this.inssDezPorcento = inssDezPorcento;
    }

    public Boolean getApurarInssMeioPorcento() {
        return this.apurarInssMeioPorcento;
    }

    public void setApurarInssMeioPorcento(Boolean apurarInssMeioPorcento) {
        this.apurarInssMeioPorcento = apurarInssMeioPorcento;
    }

    public BigDecimal getInssMeioPorcento() {
        return this.inssMeioPorcento;
    }

    public void setInssMeioPorcento(BigDecimal inssMeioPorcento) {
        this.inssMeioPorcento = inssMeioPorcento;
    }

    public Boolean getPagarMultasDevidasTerceirosOutrosDebitos() {
        return this.pagarMultasDevidasTerceirosOutrosDebitos;
    }

    public void setPagarMultasDevidasTerceirosOutrosDebitos(Boolean pagarMultasDevidasTerceirosOutrosDebitos) {
        this.pagarMultasDevidasTerceirosOutrosDebitos = pagarMultasDevidasTerceirosOutrosDebitos;
    }

    public Boolean getSelecionarCustasJudiciais() {
        return this.selecionarCustasJudiciais;
    }

    public void setSelecionarCustasJudiciais(Boolean selecionarCustasJudiciais) {
        this.selecionarCustasJudiciais = selecionarCustasJudiciais;
    }

    public Boolean getApurarCustasJudiciais() {
        return this.apurarCustasJudiciais;
    }

    public void setApurarCustasJudiciais(Boolean apurarCustasJudiciais) {
        this.apurarCustasJudiciais = apurarCustasJudiciais;
    }

    public BigDecimal getCustasJudiciais() {
        return this.custasJudiciais;
    }

    public void setCustasJudiciais(BigDecimal custasJudiciais) {
        this.custasJudiciais = custasJudiciais;
    }

    public Boolean getSelecionarDepositoDeFgts() {
        return this.selecionarDepositoDeFgts;
    }

    public void setSelecionarDepositoDeFgts(Boolean selecionarDepositoDeFgts) {
        this.selecionarDepositoDeFgts = selecionarDepositoDeFgts;
    }

    public Boolean getSelecionarDescontoDaContribuicaoSocial() {
        return this.selecionarDescontoDaContribuicaoSocial;
    }

    public void setSelecionarDescontoDaContribuicaoSocial(Boolean selecionarDescontoDaContribuicaoSocial) {
        this.selecionarDescontoDaContribuicaoSocial = selecionarDescontoDaContribuicaoSocial;
    }

    public Boolean getSelecionarPrevidenciaPrivada() {
        return this.selecionarPrevidenciaPrivada;
    }

    public void setSelecionarPrevidenciaPrivada(Boolean selecionarPrevidenciaPrivada) {
        this.selecionarPrevidenciaPrivada = selecionarPrevidenciaPrivada;
    }

    public Boolean getSelecionarPensaoAlimenticia() {
        return this.selecionarPensaoAlimenticia;
    }

    public void setSelecionarPensaoAlimenticia(Boolean selecionarPensaoAlimenticia) {
        this.selecionarPensaoAlimenticia = selecionarPensaoAlimenticia;
    }

    public Boolean getSelecionarImpostoDoReclamante() {
        return this.selecionarImpostoDoReclamante;
    }

    public void setSelecionarImpostoDoReclamante(Boolean selecionarImpostoDoReclamante) {
        this.selecionarImpostoDoReclamante = selecionarImpostoDoReclamante;
    }

    public BigDecimal getValorParcelaOutrosDebitos() {
        return this.valorParcelaOutrosDebitos;
    }

    public void setValorParcelaOutrosDebitos(BigDecimal valorParcelaOutrosDebitos) {
        this.valorParcelaOutrosDebitos = valorParcelaOutrosDebitos;
    }

    public Boolean getApurarCustasJudiciaisOutrosDebitos() {
        return this.apurarCustasJudiciaisOutrosDebitos;
    }

    public void setApurarCustasJudiciaisOutrosDebitos(Boolean apurarCustasJudiciaisOutrosDebitos) {
        this.apurarCustasJudiciaisOutrosDebitos = apurarCustasJudiciaisOutrosDebitos;
    }

    public BigDecimal getCustasJudiciaisOutrosDebitos() {
        return this.custasJudiciaisOutrosDebitos;
    }

    public void setCustasJudiciaisOutrosDebitos(BigDecimal custasJudiciaisOutrosDebitos) {
        this.custasJudiciaisOutrosDebitos = custasJudiciaisOutrosDebitos;
    }

    public Boolean getSelecionarCustasJudiciaisOutrosDebitos() {
        return this.selecionarCustasJudiciaisOutrosDebitos;
    }

    public void setSelecionarCustasJudiciaisOutrosDebitos(Boolean selecionarCustasJudiciaisOutrosDebitos) {
        this.selecionarCustasJudiciaisOutrosDebitos = selecionarCustasJudiciaisOutrosDebitos;
    }

    public Boolean getSelecionarInssSobreSalariosDevidosOutrosDebitos() {
        return this.selecionarInssSobreSalariosDevidosOutrosDebitos;
    }

    public void setSelecionarInssSobreSalariosDevidosOutrosDebitos(Boolean selecionarInssSobreSalariosDevidosOutrosDebitos) {
        this.selecionarInssSobreSalariosDevidosOutrosDebitos = selecionarInssSobreSalariosDevidosOutrosDebitos;
    }

    public Boolean getSelecionarInssSobreSalariosPagosOutrosDebitos() {
        return this.selecionarInssSobreSalariosPagosOutrosDebitos;
    }

    public void setSelecionarInssSobreSalariosPagosOutrosDebitos(Boolean selecionarInssSobreSalariosPagosOutrosDebitos) {
        this.selecionarInssSobreSalariosPagosOutrosDebitos = selecionarInssSobreSalariosPagosOutrosDebitos;
    }

    public Boolean getSelecionarJurosDePrevidenciaPrivadaOutrosDebitos() {
        return this.selecionarJurosDePrevidenciaPrivadaOutrosDebitos;
    }

    public void setSelecionarJurosDePrevidenciaPrivadaOutrosDebitos(Boolean selecionarJurosDePrevidenciaPrivadaOutrosDebitos) {
        this.selecionarJurosDePrevidenciaPrivadaOutrosDebitos = selecionarJurosDePrevidenciaPrivadaOutrosDebitos;
    }

    public Boolean getSelecionarImpostoDeRendaDoReclamanteOutrosDebitos() {
        return this.selecionarImpostoDeRendaDoReclamanteOutrosDebitos;
    }

    public void setSelecionarImpostoDeRendaDoReclamanteOutrosDebitos(Boolean selecionarImpostoDeRendaDoReclamanteOutrosDebitos) {
        this.selecionarImpostoDeRendaDoReclamanteOutrosDebitos = selecionarImpostoDeRendaDoReclamanteOutrosDebitos;
    }

    public Boolean getSelecionarInssDezPorcento() {
        return this.selecionarInssDezPorcento;
    }

    public void setSelecionarInssDezPorcento(Boolean selecionarInssDezPorcento) {
        this.selecionarInssDezPorcento = selecionarInssDezPorcento;
    }

    public Boolean getSelecionarInssMeioPorcento() {
        return this.selecionarInssMeioPorcento;
    }

    public void setSelecionarInssMeioPorcento(Boolean selecionarInssMeioPorcento) {
        this.selecionarInssMeioPorcento = selecionarInssMeioPorcento;
    }

    public Set<MultaDoPagamento> getMultasDevidasTerceiros() {
        return this.multasDevidasTerceiros;
    }

    public void setMultasDevidasTerceiros(Set<MultaDoPagamento> multasDevidasTerceiros) {
        this.multasDevidasTerceiros = multasDevidasTerceiros;
    }

    public Boolean getPagarHonorariosBrutosDevidosReclamante() {
        return this.pagarHonorariosBrutosDevidosReclamante;
    }

    public void setPagarHonorariosBrutosDevidosReclamante(Boolean pagarHonorariosBrutosDevidosReclamante) {
        this.pagarHonorariosBrutosDevidosReclamante = pagarHonorariosBrutosDevidosReclamante;
    }

    public Set<HonorarioDoPagamento> getHonorariosBrutosDevidosReclamante() {
        return this.honorariosBrutosDevidosReclamante;
    }

    public void setHonorariosBrutosDevidosReclamante(Set<HonorarioDoPagamento> honorariosBrutosDevidosReclamante) {
        this.honorariosBrutosDevidosReclamante = honorariosBrutosDevidosReclamante;
    }

    public Set<MultaDoPagamento> getMultasDevidasTerceirosOutrosDebitos() {
        return this.multasDevidasTerceirosOutrosDebitos;
    }

    public void setMultasDevidasTerceirosOutrosDebitos(Set<MultaDoPagamento> multasDevidasTerceirosOutrosDebitos) {
        this.multasDevidasTerceirosOutrosDebitos = multasDevidasTerceirosOutrosDebitos;
    }

    public Boolean getPagarHonorariosBrutosDevidosReclamadoOutrosDebitos() {
        return this.pagarHonorariosBrutosDevidosReclamadoOutrosDebitos;
    }

    public void setPagarHonorariosBrutosDevidosReclamadoOutrosDebitos(Boolean pagarHonorariosBrutosDevidosReclamadoOutrosDebitos) {
        this.pagarHonorariosBrutosDevidosReclamadoOutrosDebitos = pagarHonorariosBrutosDevidosReclamadoOutrosDebitos;
    }

    public Set<HonorarioDoPagamento> getHonorariosBrutosDevidosReclamadoOutrosDebitos() {
        return this.honorariosBrutosDevidosReclamadoOutrosDebitos;
    }

    public void setHonorariosBrutosDevidosReclamadoOutrosDebitos(Set<HonorarioDoPagamento> honorariosBrutosDevidosReclamadoOutrosDebitos) {
        this.honorariosBrutosDevidosReclamadoOutrosDebitos = honorariosBrutosDevidosReclamadoOutrosDebitos;
    }

    public BigDecimal getValorParcelaDebitosCobrarDoReclamante() {
        return this.valorParcelaDebitosCobrarDoReclamante;
    }

    public void setValorParcelaDebitosCobrarDoReclamante(BigDecimal valorParcelaDebitosCobrarDoReclamante) {
        this.valorParcelaDebitosCobrarDoReclamante = valorParcelaDebitosCobrarDoReclamante;
    }

    public Boolean getSelecionarCustasJudiciaisDebitosCobrarDoReclamante() {
        return this.selecionarCustasJudiciaisDebitosCobrarDoReclamante;
    }

    public void setSelecionarCustasJudiciaisDebitosCobrarDoReclamante(Boolean selecionarCustasJudiciaisDebitosCobrarDoReclamante) {
        this.selecionarCustasJudiciaisDebitosCobrarDoReclamante = selecionarCustasJudiciaisDebitosCobrarDoReclamante;
    }

    public Boolean getApurarCustasJudiciaisDebitosCobrarDoReclamante() {
        return this.apurarCustasJudiciaisDebitosCobrarDoReclamante;
    }

    public void setApurarCustasJudiciaisDebitosCobrarDoReclamante(Boolean apurarCustasJudiciaisDebitosCobrarDoReclamante) {
        this.apurarCustasJudiciaisDebitosCobrarDoReclamante = apurarCustasJudiciaisDebitosCobrarDoReclamante;
    }

    public BigDecimal getCustasJudiciaisDebitosCobrarDoReclamante() {
        return this.custasJudiciaisDebitosCobrarDoReclamante;
    }

    public void setCustasJudiciaisDebitosCobrarDoReclamante(BigDecimal custasJudiciaisDebitosCobrarDoReclamante) {
        this.custasJudiciaisDebitosCobrarDoReclamante = custasJudiciaisDebitosCobrarDoReclamante;
    }

    public Boolean getPagarMultasDevidasTerceirosDebitosCobrarDoReclamante() {
        return this.pagarMultasDevidasTerceirosDebitosCobrarDoReclamante;
    }

    public void setPagarMultasDevidasTerceirosDebitosCobrarDoReclamante(Boolean pagarMultasDevidasTerceirosDebitosCobrarDoReclamante) {
        this.pagarMultasDevidasTerceirosDebitosCobrarDoReclamante = pagarMultasDevidasTerceirosDebitosCobrarDoReclamante;
    }

    public Set<MultaDoPagamento> getMultasDevidasTerceirosDebitosCobrarDoReclamante() {
        return this.multasDevidasTerceirosDebitosCobrarDoReclamante;
    }

    public void setMultasDevidasTerceirosDebitosCobrarDoReclamante(Set<MultaDoPagamento> multasDevidasTerceirosDebitosCobrarDoReclamante) {
        this.multasDevidasTerceirosDebitosCobrarDoReclamante = multasDevidasTerceirosDebitosCobrarDoReclamante;
    }

    public Boolean getPagarHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante() {
        return this.pagarHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante;
    }

    public void setPagarHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante(Boolean pagarHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante) {
        this.pagarHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante = pagarHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante;
    }

    public Set<HonorarioDoPagamento> getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante() {
        return this.honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante;
    }

    public void setHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante(Set<HonorarioDoPagamento> honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante) {
        this.honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante = honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante;
    }

    public void removerDasMultasDoPagamento(List<MultaDoPagamento> multas) {
        for (MultaDoPagamento multaDoPagamento : multas) {
            if (multaDoPagamento.getId() == null) continue;
            this.multasDevidasTerceiros.remove(multaDoPagamento);
        }
    }

    public void adicionarDasMultasDoPagamento(Set<MultaDoPagamento> multas) {
        this.multasDevidasTerceiros.clear();
        for (MultaDoPagamento multaDoPagamento : multas) {
            multaDoPagamento.setPagamento(this);
            this.multasDevidasTerceiros.add(multaDoPagamento);
        }
    }

    public void removerDasMultasDoPagamentoOutrosDebitos(List<MultaDoPagamento> multas) {
        for (MultaDoPagamento multaDoPagamento : multas) {
            if (multaDoPagamento.getId() == null) continue;
            this.multasDevidasTerceirosOutrosDebitos.remove(multaDoPagamento);
        }
    }

    public void adicionarDasMultasDoPagamentoOutrosDebitos(Set<MultaDoPagamento> multas) {
        this.multasDevidasTerceirosOutrosDebitos.clear();
        for (MultaDoPagamento multaDoPagamento : multas) {
            multaDoPagamento.setPagamento(this);
            this.multasDevidasTerceirosOutrosDebitos.add(multaDoPagamento);
        }
    }

    public void removerDasMultasDoPagamentoDebitosCobrarDoReclamante(List<MultaDoPagamento> multas) {
        for (MultaDoPagamento multaDoPagamento : multas) {
            if (multaDoPagamento.getId() == null) continue;
            this.multasDevidasTerceirosDebitosCobrarDoReclamante.remove(multaDoPagamento);
        }
    }

    public void adicionarDasMultasDoPagamentoDebitosCobrarDoReclamante(Set<MultaDoPagamento> multas) {
        this.multasDevidasTerceirosDebitosCobrarDoReclamante.clear();
        for (MultaDoPagamento multaDoPagamento : multas) {
            multaDoPagamento.setPagamento(this);
            this.multasDevidasTerceirosDebitosCobrarDoReclamante.add(multaDoPagamento);
        }
    }

    public void removerDosHonorariosDoPagamento(List<HonorarioDoPagamento> honorarios) {
        for (HonorarioDoPagamento honorarioDoPagamento : honorarios) {
            if (honorarioDoPagamento.getId() == null) continue;
            this.honorariosBrutosDevidosReclamante.remove(honorarioDoPagamento);
        }
    }

    public void adicionarDosHonorariosDoPagamento(Set<HonorarioDoPagamento> honorarios) {
        this.honorariosBrutosDevidosReclamante.clear();
        for (HonorarioDoPagamento honorarioDoPagamento : honorarios) {
            honorarioDoPagamento.setPagamento(this);
            this.honorariosBrutosDevidosReclamante.add(honorarioDoPagamento);
        }
    }

    public void removerDosHonorariosDoPagamentoOutrosDebitos(List<HonorarioDoPagamento> honorarios) {
        for (HonorarioDoPagamento honorarioDoPagamento : honorarios) {
            if (honorarioDoPagamento.getId() == null) continue;
            this.honorariosBrutosDevidosReclamadoOutrosDebitos.remove(honorarioDoPagamento);
        }
    }

    public void adicionarDosHonorariosDoPagamentoOutrosDebitos(Set<HonorarioDoPagamento> honorarios) {
        this.honorariosBrutosDevidosReclamadoOutrosDebitos.clear();
        for (HonorarioDoPagamento honorarioDoPagamento : honorarios) {
            honorarioDoPagamento.setPagamento(this);
            this.honorariosBrutosDevidosReclamadoOutrosDebitos.add(honorarioDoPagamento);
        }
    }

    public void removerDosHonorariosDoPagamentoDebitosCobrarDoReclamante(List<HonorarioDoPagamento> honorarios) {
        for (HonorarioDoPagamento honorarioDoPagamento : honorarios) {
            if (honorarioDoPagamento.getId() == null) continue;
            this.honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante.remove(honorarioDoPagamento);
        }
    }

    public void adicionarDosHonorariosDoPagamentoDebitosCobrarDoReclamante(Set<HonorarioDoPagamento> honorarios) {
        this.honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante.clear();
        for (HonorarioDoPagamento honorarioDoPagamento : honorarios) {
            honorarioDoPagamento.setPagamento(this);
            this.honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante.add(honorarioDoPagamento);
        }
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Integer getPrioridade() {
        return 5;
    }

    public void calcularRateioCreditoERecolhimentoReclamante(CreditosDoReclamante creditoDoReclamante, DebitosDoReclamante debitosDoReclamante) {
        this.maquinaDeRateioDoPagamento.calcularRateioCreditoERecolhimentoReclamante(creditoDoReclamante, debitosDoReclamante);
    }

    public void calcularRateioOutrosDebitosReclamado(OutrosDebitosReclamado outrosDebitosReclamado) {
        this.maquinaDeRateioDoPagamento.calcularRateioOutrosDebitosReclamado(outrosDebitosReclamado);
    }

    public void calcularRateioDebitosCobrarDoReclamante(DebitosCobrarDoReclamante debitosCobrarDoReclamante) {
        this.maquinaDeRateioDoPagamento.calcularRateioDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
    }

    public BigDecimal getValorParaPagamentoCreditoReclamantePrincipal() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoCreditoReclamantePrincipal();
    }

    public BigDecimal getValorParaPagamentoCreditoReclamanteFgts() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoCreditoReclamanteFgts();
    }

    public BigDecimal getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante();
    }

    public BigDecimal getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado();
    }

    public BigDecimal apurarRecolhimentoDoReclamante(BigDecimal valor) {
        BigDecimal proporcao = this.maquinaDeRateioDoPagamento.getProporcaoGeralParaRecolhimentos();
        BigDecimal recolhimento = Utils.arredondarValorMonetario(Utils.multiplicar(valor, proporcao));
        if (valor.compareTo(recolhimento) < 0) {
            recolhimento = valor;
        }
        return Utils.zerarSeNegativo(recolhimento);
    }

    public BigDecimal apurarRecolhimentoOutrosDoReclamante(BigDecimal valor) {
        BigDecimal proporcao = this.maquinaDeRateioDoPagamento.getProporcaoOutrosParaRecolhimentosDebitosReclamante();
        BigDecimal recolhimento = Utils.arredondarValorMonetario(Utils.multiplicar(valor, proporcao));
        if (valor.compareTo(recolhimento) < 0) {
            recolhimento = valor;
        }
        return Utils.zerarSeNegativo(recolhimento);
    }

    public BigDecimal apurarRecolhimentoMultaDoReclamante(BigDecimal valor) {
        BigDecimal proporcao = this.maquinaDeRateioDoPagamento.getProporcaoMultasParaRecolhimentosDebitosReclamante();
        BigDecimal recolhimento = Utils.arredondarValorMonetario(Utils.multiplicar(valor, proporcao));
        if (valor.compareTo(recolhimento) < 0) {
            recolhimento = valor;
        }
        return Utils.zerarSeNegativo(recolhimento);
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamanteCustasJudiciais() {
        return this.maquinaDeRateioDoPagamento.getValorParaRecolhimentoDebitosReclamanteCustasJudiciais();
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamanteDepositoDeFgts() {
        return this.maquinaDeRateioDoPagamento.getValorParaRecolhimentoDebitosReclamanteDepositoDeFgts();
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial() {
        return this.maquinaDeRateioDoPagamento.getValorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial();
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamantePrevidenciaPrivada() {
        return this.maquinaDeRateioDoPagamento.getValorParaRecolhimentoDebitosReclamantePrevidenciaPrivada();
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamantePensaoAlimenticia() {
        return this.maquinaDeRateioDoPagamento.getValorParaRecolhimentoDebitosReclamantePensaoAlimenticia();
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamanteImpostoDoReclamante() {
        return this.maquinaDeRateioDoPagamento.getValorParaRecolhimentoDebitosReclamanteImpostoDoReclamante();
    }

    public Map<Multa, BigDecimal> getValoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros() {
        return this.maquinaDeRateioDoPagamento.getValoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros();
    }

    public Map<Honorario, BigDecimal> getValoresParaRecolhimentoDebitosReclamanteDeHonorarios() {
        return this.maquinaDeRateioDoPagamento.getValoresParaRecolhimentoDebitosReclamanteDeHonorarios();
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoCustasJudiciais() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoOutrosDebitosReclamadoCustasJudiciais();
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosInssSalariosDevidos() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosDevidos();
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosInssSalariosPagos() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosPagos();
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoJurosDePrevidenciaPrivada() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoOutrosDebitosReclamadoJurosDePrevidenciaPrivada();
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoImpostoDeRendaDoReclamante() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoOutrosDebitosReclamadoImpostoDeRendaDoReclamante();
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoInssDezPorcento() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoOutrosDebitosReclamadoInssDezPorcento();
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoInssMeioPorcento() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoOutrosDebitosReclamadoInssMeioPorcento();
    }

    public Map<Multa, BigDecimal> getValoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros() {
        return this.maquinaDeRateioDoPagamento.getValoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros();
    }

    public Map<Honorario, BigDecimal> getValoresParaPagamentoOutrosDebitosReclamadoDeHonorarios() {
        return this.maquinaDeRateioDoPagamento.getValoresParaPagamentoOutrosDebitosReclamadoDeHonorarios();
    }

    public BigDecimal getValorParaPagamentoDebitosCobrarDoReclamanteCustasJudiciais() {
        return this.maquinaDeRateioDoPagamento.getValorParaPagamentoDebitosCobrarDoReclamanteCustasJudiciais();
    }

    public Map<Multa, BigDecimal> getValoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros() {
        return this.maquinaDeRateioDoPagamento.getValoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros();
    }

    public Map<Honorario, BigDecimal> getValoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios() {
        return this.maquinaDeRateioDoPagamento.getValoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios();
    }

    public String getFolhaDoEvento() {
        return this.folhaDoEvento;
    }

    public void setFolhaDoEvento(String folhaDoEvento) {
        this.folhaDoEvento = folhaDoEvento;
    }

    public Boolean getDispararExcecoesNaValidacao() {
        return this.dispararExcecoesNaValidacao;
    }

    public void setDispararExcecoesNaValidacao(Boolean dispararExcecoesNaValidacao) {
        this.dispararExcecoesNaValidacao = dispararExcecoesNaValidacao;
    }

    private void atualizarSelecoesDeParcelas() {
        this.selecionarValorPrincipal = Utils.naoNulo(this.valorParcelaPrincipal) || this.apurarValorPrincipal != false;
        this.selecionarValorFgts = Utils.naoNulo(this.valorParcelaFgts) || this.apurarValorFgts != false;
        this.selecionarValorMultasDevidasReclamante = Utils.naoNulo(this.valorParcelaMultasDevidasReclamante) || this.apurarValorMultasDevidasReclamante != false;
        this.selecionarCustasJudiciais = Utils.naoNulo(this.custasJudiciais) || this.apurarCustasJudiciais != false;
        this.selecionarDescontoDaContribuicaoSocial = Utils.naoNulo(this.descontoDaContribuicaoSocial) || this.apurarDescontoDaContribuicaoSocial != false;
        this.selecionarPrevidenciaPrivada = Utils.naoNulo(this.previdenciaPrivada) || this.apurarPrevidenciaPrivada != false;
        this.selecionarPensaoAlimenticia = Utils.naoNulo(this.pensaoAlimenticia) || this.apurarPensaoAlimenticia != false;
        this.selecionarImpostoDoReclamante = Utils.naoNulo(this.impostoDoReclamante) || this.apurarImpostoDoReclamante != false;
        this.selecionarCustasJudiciaisOutrosDebitos = Utils.naoNulo(this.custasJudiciaisOutrosDebitos) || this.apurarCustasJudiciaisOutrosDebitos != false;
        this.selecionarInssSobreSalariosDevidosOutrosDebitos = Utils.naoNulo(this.inssSobreSalariosDevidosOutrosDebitos) || this.apurarInssSobreSalariosDevidosOutrosDebitos != false;
        this.selecionarInssSobreSalariosPagosOutrosDebitos = Utils.naoNulo(this.inssSobreSalariosPagosOutrosDebitos) || this.apurarInssSobreSalariosPagosOutrosDebitos != false;
        this.selecionarJurosDePrevidenciaPrivadaOutrosDebitos = Utils.naoNulo(this.jurosDePrevidenciaPrivadaOutrosDebitos) || this.apurarJurosDePrevidenciaPrivadaOutrosDebitos != false;
        this.selecionarImpostoDeRendaDoReclamanteOutrosDebitos = Utils.naoNulo(this.impostoDeRendaDoReclamanteOutrosDebitos) || this.apurarImpostoDeRendaDoReclamanteOutrosDebitos != false;
        this.selecionarInssDezPorcento = Utils.naoNulo(this.inssDezPorcento) || this.apurarInssDezPorcento != false;
        this.selecionarInssMeioPorcento = Utils.naoNulo(this.inssMeioPorcento) || this.apurarInssMeioPorcento != false;
        this.selecionarCustasJudiciaisDebitosCobrarDoReclamante = Utils.naoNulo(this.custasJudiciaisDebitosCobrarDoReclamante) || this.apurarCustasJudiciaisDebitosCobrarDoReclamante != false;
    }

    public void atualizarPagamento(Boolean existeValorPrincipalParaCreditoDeReclamante, Boolean existeFgtsParaCreditoDeReclamante, Boolean existeMultaDevidaPeloReclamadoParaReclamante, Boolean existeMultaDevidaPeloReclamanteParaReclamado, Boolean existeCustaDoReclamanteAPagar, Boolean ehFgtsParaDepositar, Boolean existeDescontoContribuicaoSocialReclamante, Boolean existePrevidenciaPrivada, Boolean existePensaoAlimenticia, Boolean existeImpostoParaReclamante, Boolean existeMultaDevidaPeloReclamanteParaTerceiros, Boolean existeHonorarioDevidoPeloReclamante, Boolean existeCustaJudicialDoReclamado, Boolean existeContribuicaoSocialSalariosDevidos, Boolean existeContribuicaoSocialSalariosPagos, Boolean existeJurosDePrevidenciaPrivada, Boolean existeImpostoParaReclamado, Boolean existeInssDezPorcento, Boolean existeInssMeioPorcento, Boolean existeMultaDevidaPeloReclamadoParaTerceiros, Boolean existeHonorarioDevidoPeloReclamado, Boolean existeCustaACobrarDoReclamante, Boolean existeMultaACobrarDoReclamanteParaTerceiros, Boolean existeHonorarioACobrarDoReclamante) {
        this.atualizarSelecoesDeParcelas();
        if (!existeValorPrincipalParaCreditoDeReclamante.booleanValue()) {
            this.setSelecionarValorPrincipal(Boolean.FALSE);
            this.setValorParcelaPrincipal(null);
            this.setApurarValorPrincipal(Boolean.FALSE);
        }
        if (!existeFgtsParaCreditoDeReclamante.booleanValue()) {
            this.setSelecionarValorFgts(Boolean.FALSE);
            this.setValorParcelaFgts(null);
            this.setApurarValorFgts(Boolean.FALSE);
        }
        if (!existeMultaDevidaPeloReclamadoParaReclamante.booleanValue()) {
            this.setSelecionarValorMultasDevidasReclamante(Boolean.FALSE);
            this.setValorParcelaMultasDevidasReclamante(null);
            this.setApurarValorMultasDevidasReclamante(Boolean.FALSE);
        }
        this.setSelecionarValorMultasDevidasReclamado(existeMultaDevidaPeloReclamanteParaReclamado);
        this.setApurarValorMultasDevidasReclamado(existeMultaDevidaPeloReclamanteParaReclamado);
        if (!existeCustaDoReclamanteAPagar.booleanValue()) {
            this.setSelecionarCustasJudiciais(Boolean.FALSE);
            this.setCustasJudiciais(null);
            this.setApurarCustasJudiciais(Boolean.FALSE);
        }
        this.setSelecionarDepositoDeFgts(ehFgtsParaDepositar != false && this.getSelecionarValorFgts() != false);
        this.setApurarDepositoDeFgts(ehFgtsParaDepositar != false && this.getSelecionarValorFgts() != false);
        if (!existeDescontoContribuicaoSocialReclamante.booleanValue()) {
            this.setSelecionarDescontoDaContribuicaoSocial(Boolean.FALSE);
            this.setDescontoDaContribuicaoSocial(null);
            this.setApurarDescontoDaContribuicaoSocial(Boolean.FALSE);
        }
        if (!existePrevidenciaPrivada.booleanValue()) {
            this.setSelecionarPrevidenciaPrivada(Boolean.FALSE);
            this.setPrevidenciaPrivada(null);
            this.setApurarPrevidenciaPrivada(Boolean.FALSE);
        }
        if (!existePensaoAlimenticia.booleanValue()) {
            this.setSelecionarPensaoAlimenticia(Boolean.FALSE);
            this.setPensaoAlimenticia(null);
            this.setApurarPensaoAlimenticia(Boolean.FALSE);
        }
        if (!existeImpostoParaReclamante.booleanValue()) {
            this.setSelecionarImpostoDoReclamante(Boolean.FALSE);
            this.setImpostoDoReclamante(null);
            this.setApurarImpostoDoReclamante(Boolean.FALSE);
        }
        if (!existeMultaDevidaPeloReclamanteParaTerceiros.booleanValue()) {
            this.setPagarMultasDevidasTerceiros(Boolean.FALSE);
        }
        if (!existeHonorarioDevidoPeloReclamante.booleanValue()) {
            this.setPagarHonorariosBrutosDevidosReclamante(Boolean.FALSE);
        }
        this.setRecolherDebitosReclamante(this.getSelecionarCustasJudiciais() != false || this.getSelecionarDepositoDeFgts() != false || this.getSelecionarDescontoDaContribuicaoSocial() != false || this.getSelecionarPrevidenciaPrivada() != false || this.getSelecionarPensaoAlimenticia() != false || this.getSelecionarImpostoDoReclamante() != false || this.getPagarMultasDevidasTerceiros() != false || this.getPagarHonorariosBrutosDevidosReclamante() != false);
        if (!existeCustaJudicialDoReclamado.booleanValue()) {
            this.setSelecionarCustasJudiciaisOutrosDebitos(Boolean.FALSE);
            this.setCustasJudiciaisOutrosDebitos(null);
            this.setApurarCustasJudiciaisOutrosDebitos(Boolean.FALSE);
        }
        if (!existeContribuicaoSocialSalariosDevidos.booleanValue()) {
            this.setSelecionarInssSobreSalariosDevidosOutrosDebitos(Boolean.FALSE);
            this.setInssSobreSalariosDevidosOutrosDebitos(null);
            this.setApurarInssSobreSalariosDevidosOutrosDebitos(Boolean.FALSE);
        }
        if (!existeContribuicaoSocialSalariosPagos.booleanValue()) {
            this.setSelecionarInssSobreSalariosPagosOutrosDebitos(Boolean.FALSE);
            this.setInssSobreSalariosPagosOutrosDebitos(null);
            this.setApurarInssSobreSalariosPagosOutrosDebitos(Boolean.FALSE);
        }
        if (!existeJurosDePrevidenciaPrivada.booleanValue()) {
            this.setSelecionarJurosDePrevidenciaPrivadaOutrosDebitos(Boolean.FALSE);
            this.setJurosDePrevidenciaPrivadaOutrosDebitos(null);
            this.setApurarJurosDePrevidenciaPrivadaOutrosDebitos(Boolean.FALSE);
        }
        if (!existeImpostoParaReclamado.booleanValue()) {
            this.setSelecionarImpostoDeRendaDoReclamanteOutrosDebitos(Boolean.FALSE);
            this.setImpostoDeRendaDoReclamanteOutrosDebitos(null);
            this.setApurarImpostoDeRendaDoReclamanteOutrosDebitos(Boolean.FALSE);
        }
        if (!existeInssDezPorcento.booleanValue()) {
            this.setSelecionarInssDezPorcento(Boolean.FALSE);
            this.setInssDezPorcento(null);
            this.setApurarInssDezPorcento(Boolean.FALSE);
        }
        if (!existeInssMeioPorcento.booleanValue()) {
            this.setSelecionarInssMeioPorcento(Boolean.FALSE);
            this.setInssMeioPorcento(null);
            this.setApurarInssMeioPorcento(Boolean.FALSE);
        }
        if (!existeMultaDevidaPeloReclamadoParaTerceiros.booleanValue()) {
            this.setPagarMultasDevidasTerceirosOutrosDebitos(Boolean.FALSE);
        }
        if (!existeHonorarioDevidoPeloReclamado.booleanValue()) {
            this.setPagarHonorariosBrutosDevidosReclamadoOutrosDebitos(Boolean.FALSE);
        }
        if (!existeCustaACobrarDoReclamante.booleanValue()) {
            this.setSelecionarCustasJudiciaisDebitosCobrarDoReclamante(Boolean.FALSE);
            this.setCustasJudiciaisDebitosCobrarDoReclamante(null);
            this.setApurarCustasJudiciaisDebitosCobrarDoReclamante(Boolean.FALSE);
        }
        if (!existeMultaACobrarDoReclamanteParaTerceiros.booleanValue()) {
            this.setPagarMultasDevidasTerceirosDebitosCobrarDoReclamante(Boolean.FALSE);
        }
        if (!existeHonorarioACobrarDoReclamante.booleanValue()) {
            this.setPagarHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante(Boolean.FALSE);
        }
    }

    public Boolean getPagarPrecatorio() {
        return this.pagarPrecatorio;
    }

    public void setPagarPrecatorio(Boolean pagarPrecatorio) {
        this.pagarPrecatorio = pagarPrecatorio;
    }
}

