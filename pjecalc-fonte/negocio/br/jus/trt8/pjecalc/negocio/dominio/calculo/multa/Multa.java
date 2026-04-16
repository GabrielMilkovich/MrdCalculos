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
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.multa;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.MaquinaDeCalculoDeMulta;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.RepositorioDeMulta;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDoPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBMULTACALCULO")
@SequenceGenerator(name="SQMULTACALCULO", sequenceName="SQMULTACALCULO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="multa")
public class Multa
extends EntidadeBase
implements EventoAtualizacao {
    private static final long serialVersionUID = -3705626215669359644L;
    private static final int PRIORIDADE_ATUALIZACAO = 1;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQMULTACALCULO")
    @Column(name="IIDMULTA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="SDSMULTA", columnDefinition="VARCHAR2(60)", unique=true)
    @NotNull
    private String descricao;
    @Column(name="STPCREDORDEVEDOR", columnDefinition="VARCHAR2(4)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="CredorDevedorMultaEnum")})
    private CredorDevedorMultaEnum tipoCredorDevedor = CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO;
    @Column(name="SNMTERCEIRO", columnDefinition="VARCHAR2(100)", unique=true)
    private String nomeTerceiro;
    @Column(name="STPMULTA", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValorDaMulta = TipoValorEnum.CALCULADO;
    @Column(name="RVLMULTA", precision=38, scale=25)
    private BigDecimal valorMulta;
    @Column(name="RVLJUROSCALCEXTERNO", precision=38, scale=25)
    private BigDecimal valorJurosCalcExterno;
    @Column(name="DDTVENCIMENTO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataVencimentoMulta;
    @Column(name="STPINDICECORRECAOMULTA", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="OpcaoDeIndiceDeCorrecaoEnum")})
    @Required
    private OpcaoDeIndiceDeCorrecaoEnum opcaoIndiceDeCorrecaoDaMulta = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
    @Column(name="STPOUTROINDICECORRECAOMULTA", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    @Required(condition="bean.opcaoIndiceDeCorrecaoDaMulta == 'UTILIZAR_OUTRO_INDICE'")
    private IndiceMonetarioEnum outroIndiceDeCorrecaoDaMulta;
    @Column(name="SFLAPLICARJUROS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarJurosSobreMulta = Boolean.FALSE;
    @Column(name="DDTAPARTIRDEAPLICARJUROS", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataApartirDeAplicarJuros;
    @Column(name="RVLALIQUOTAMULTA", precision=5, scale=2)
    private BigDecimal aliquotaMulta;
    @Column(name="STPBASEMULTA", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="BaseParaApuracaoDeMultaEnum")})
    private BaseParaApuracaoDeMultaEnum tipoBaseMulta;
    @Column(name="RVLBASEMULTA", precision=38, scale=25)
    private BigDecimal baseMulta;
    @Column(name="RVLINDICECORRECAOUTILIZADO", precision=38, scale=25)
    private BigDecimal indiceCorrecaoMulta;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaJurosMulta;
    @Column(name="SFLORIGEMREGISTRO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoOrigemRegistroEnum")})
    private TipoOrigemRegistroEnum origemRegistro = TipoOrigemRegistroEnum.CALCULO;
    @Column(name="SFLCOBRANCARECLAMANTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoCobrancaReclamanteEnum")})
    private TipoCobrancaReclamanteEnum tipoCobrancaReclamante = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
    @Column(name="DDTEVENTOATUALIZACAO")
    @Temporal(value=TemporalType.DATE)
    private Date dataEvento;
    @Column(name="IFOLHAEVENTO", columnDefinition="VARCHAR2(80)")
    private String folhaDoEvento;
    @Transient
    protected MaquinaDeCalculoDeMulta maquinaDeCalculoDeMulta = new MaquinaDeCalculoDeMulta(this);

    public Multa() {
        super(RepositorioDeMulta.class);
    }

    public Multa(Calculo calculo) {
        this();
        this.calculo = calculo;
    }

    public Multa(Calculo calculo, ParcelasAtualizaveisMultaIndenizacao paMulta) {
        this();
        boolean isInformado = paMulta.getTipoValor().equals((Object)TipoValorEnum.INFORMADO);
        this.setAliquotaMulta(paMulta.getTaxaCalculado());
        this.setAplicarJurosSobreMulta(isInformado ? paMulta.getAplicarJurosInformado() : Boolean.FALSE);
        this.setDataApartirDeAplicarJuros(isInformado && this.getAplicarJurosSobreMulta() != false ? paMulta.getDataApartirDeAplicarJurosInformado() : null);
        this.setCalculo(calculo);
        this.setDataEvento(calculo.getDataDeLiquidacao());
        this.setDataVencimentoMulta(calculo.getDataDeLiquidacao());
        this.setDescricao(paMulta.getDescricao());
        this.setNomeTerceiro(paMulta.getCredor());
        if (Utils.naoNulo((Object)paMulta.getIndiceTrabalhistaInformado()) && IndiceMonetarioEnum.INDICE_TRABALHISTA.equals((Object)paMulta.getIndiceTrabalhistaInformado())) {
            this.setOpcaoIndiceDeCorrecaoDaMulta(OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA);
        } else {
            this.setOpcaoIndiceDeCorrecaoDaMulta(OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE);
        }
        this.setOutroIndiceDeCorrecaoDaMulta(paMulta.getIndiceTrabalhistaInformado());
        this.setOrigemRegistro(TipoOrigemRegistroEnum.CALCULO);
        this.setTaxaJurosMulta(paMulta.getTaxaCalculado());
        if (paMulta.getTipoValor().equals((Object)TipoValorEnum.CALCULADO) && paMulta.getAplicarDescontoContribSocialCalculado().booleanValue() && paMulta.getAplicarDescontoPrevPrivadaCalculado().booleanValue()) {
            this.setTipoBaseMulta(BaseParaApuracaoDeMultaEnum.PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA);
        } else if (paMulta.getTipoValor().equals((Object)TipoValorEnum.CALCULADO) && paMulta.getAplicarDescontoContribSocialCalculado().booleanValue()) {
            this.setTipoBaseMulta(BaseParaApuracaoDeMultaEnum.PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL);
        } else if (paMulta.getTipoValor().equals((Object)TipoValorEnum.CALCULADO)) {
            this.setTipoBaseMulta(BaseParaApuracaoDeMultaEnum.PRINCIPAL);
        }
        this.setTipoCobrancaReclamante(paMulta.getTipoCobrancaReclamante());
        this.setTipoCredorDevedor(paMulta.getTipoCredorDevedor());
        this.setTipoValorDaMulta(paMulta.getTipoValor());
        this.setValorMulta(paMulta.getValorParcelaInformado());
        this.setValorJurosCalcExterno(paMulta.getValorJurosInformado());
        paMulta.setMulta(this);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public static List<Multa> obterTodosPor(Calculo calculo) {
        return Multa.getRepositorio(RepositorioDeMulta.class).obterTodosPor(calculo);
    }

    public static List<Multa> obterTodosParaAtualizacao(Calculo calculo) {
        return Multa.getRepositorio(RepositorioDeMulta.class).obterTodosParaAtualizacao(calculo);
    }

    public static List<Multa> obterTodosParaCalculo(Calculo calculo) {
        return Multa.getRepositorio(RepositorioDeMulta.class).obterTodosParaCalculo(calculo);
    }

    public static List<MultaDoPagamento> obterPagamentos(Multa multa) {
        return Multa.getRepositorio(RepositorioDeMulta.class).obterPagamentosDa(multa);
    }

    @Override
    protected Multa validar() {
        NegocioException excecao = new NegocioException();
        if (TipoValorEnum.INFORMADO.equals((Object)this.tipoValorDaMulta)) {
            if (this.dataVencimentoMulta == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataVencimento", Mensagens.MSG0003, "Vencimento"));
            } else if (HelperDate.dateBefore(this.dataVencimentoMulta, this.calculo.getDataAdmissao())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataVencimento", Mensagens.MSG0008, "Vencimento", "a data de admiss\u00e3o."));
            }
        }
        if (this.origemRegistro.equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) {
            if (Utils.nulo(this.dataEvento)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataEvento", Mensagens.MSG0003, "Data do Evento"));
            }
            if (Utils.naoNulos(this.getDataEvento(), this.getCalculo().getDataDeLiquidacao()) && HelperDate.dateBefore(this.getDataEvento(), this.getCalculo().getDataDeLiquidacao())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0127, Utils.formatarData(this.getCalculo().getDataDeLiquidacao())));
            }
            if (Utils.naoNulo(this.getDataEvento()) && HelperDate.dateAfter(this.getDataEvento(), new Date())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0128, new Object[0]));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        GerenciadorDeValidadores.getInstance().validar(Multa.class, this);
        return this;
    }

    @Override
    public void salvar() {
        this.consistirDados();
        super.salvar();
    }

    private void consistirDados() {
        if (this.getTipoValorDaMulta() == TipoValorEnum.CALCULADO) {
            this.dataApartirDeAplicarJuros = null;
        }
        if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)this.getTipoCredorDevedor())) {
            this.tipoCobrancaReclamante = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
        }
        if (CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)this.getTipoCredorDevedor()) || CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)this.getTipoCredorDevedor())) {
            this.nomeTerceiro = null;
        }
    }

    public static void remover(Multa entidade) {
        Multa.getRepositorio(RepositorioDeMulta.class).removerMultasDaAtualizacao(entidade);
        Multa.remover(RepositorioDeMulta.class, entidade, true);
    }

    public void liquidar() {
        this.maquinaDeCalculoDeMulta.liquidar();
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

    public String getDescricao() {
        return this.descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public CredorDevedorMultaEnum getTipoCredorDevedor() {
        return this.tipoCredorDevedor;
    }

    public void setTipoCredorDevedor(CredorDevedorMultaEnum tipoCredorDevedor) {
        this.tipoCredorDevedor = tipoCredorDevedor;
    }

    public String getNomeTerceiro() {
        return this.nomeTerceiro;
    }

    public void setNomeTerceiro(String nomeTerceiro) {
        this.nomeTerceiro = nomeTerceiro;
    }

    public TipoValorEnum getTipoValorDaMulta() {
        return this.tipoValorDaMulta;
    }

    public void setTipoValorDaMulta(TipoValorEnum tipoValorDaMulta) {
        this.tipoValorDaMulta = tipoValorDaMulta;
    }

    public BigDecimal getValorMulta() {
        return this.valorMulta;
    }

    public void setValorMulta(BigDecimal valorMulta) {
        this.valorMulta = valorMulta;
    }

    public Date getDataVencimentoMulta() {
        return this.dataVencimentoMulta;
    }

    public void setDataVencimentoMulta(Date dataVencimentoMulta) {
        this.dataVencimentoMulta = dataVencimentoMulta;
    }

    public OpcaoDeIndiceDeCorrecaoEnum getOpcaoIndiceDeCorrecaoDaMulta() {
        return this.opcaoIndiceDeCorrecaoDaMulta;
    }

    public void setOpcaoIndiceDeCorrecaoDaMulta(OpcaoDeIndiceDeCorrecaoEnum opcaoIndiceDeCorrecaoDaMulta) {
        this.opcaoIndiceDeCorrecaoDaMulta = opcaoIndiceDeCorrecaoDaMulta;
    }

    public IndiceMonetarioEnum getOutroIndiceDeCorrecaoDaMulta() {
        return this.outroIndiceDeCorrecaoDaMulta;
    }

    public void setOutroIndiceDeCorrecaoDaMulta(IndiceMonetarioEnum outroIndiceDeCorrecaoDaMulta) {
        this.outroIndiceDeCorrecaoDaMulta = outroIndiceDeCorrecaoDaMulta;
    }

    public Boolean getAplicarJurosSobreMulta() {
        return this.aplicarJurosSobreMulta;
    }

    public void setAplicarJurosSobreMulta(Boolean aplicarJurosSobreMulta) {
        this.aplicarJurosSobreMulta = aplicarJurosSobreMulta;
    }

    public BigDecimal getAliquotaMulta() {
        return this.aliquotaMulta;
    }

    public void setAliquotaMulta(BigDecimal aliquotaMulta) {
        this.aliquotaMulta = aliquotaMulta;
    }

    public BaseParaApuracaoDeMultaEnum getTipoBaseMulta() {
        return this.tipoBaseMulta;
    }

    public void setTipoBaseMulta(BaseParaApuracaoDeMultaEnum tipoBaseMulta) {
        this.tipoBaseMulta = tipoBaseMulta;
    }

    public BigDecimal getBaseMulta() {
        return this.baseMulta;
    }

    public void setBaseMulta(BigDecimal baseMulta) {
        this.baseMulta = baseMulta;
    }

    public BigDecimal getIndiceCorrecaoMulta() {
        return this.indiceCorrecaoMulta;
    }

    public void setIndiceCorrecaoMulta(BigDecimal indiceCorrecaoMulta) {
        this.indiceCorrecaoMulta = indiceCorrecaoMulta;
    }

    public BigDecimal getTaxaJurosMulta() {
        return this.taxaJurosMulta;
    }

    public void setTaxaJurosMulta(BigDecimal taxaJurosMulta) {
        this.taxaJurosMulta = taxaJurosMulta;
    }

    public TipoOrigemRegistroEnum getOrigemRegistro() {
        return this.origemRegistro;
    }

    public void setOrigemRegistro(TipoOrigemRegistroEnum origemRegistro) {
        this.origemRegistro = origemRegistro;
    }

    public Date getDataEvento() {
        return this.dataEvento;
    }

    public void setDataEvento(Date dataEvento) {
        this.dataEvento = dataEvento;
    }

    public String getFolhaDoEvento() {
        return this.folhaDoEvento;
    }

    public void setFolhaDoEvento(String folhaDoEvento) {
        this.folhaDoEvento = folhaDoEvento;
    }

    public BigDecimal getValorCorrigido() {
        BigDecimal valor = this.getValorMulta();
        if (Utils.naoNulos(this.getIndiceCorrecaoMulta(), valor)) {
            return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoMulta(), valor);
        }
        if (Utils.naoNulo(valor)) {
            return valor;
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getJuros() {
        if (Utils.nulo(this.getTaxaJurosMulta())) {
            return BigDecimal.ZERO;
        }
        return this.getValorCorrigido().multiply(Utils.obterPercentualPara(this.getTaxaJurosMulta()), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getValorTotal() {
        BigDecimal valorCorrigido = this.getValorCorrigido();
        if (Utils.naoNulo(valorCorrigido)) {
            return valorCorrigido.add(this.getJuros(), Utils.CONTEXTO_MATEMATICO);
        }
        return null;
    }

    @Override
    public Integer getPrioridade() {
        return 1;
    }

    public TipoCobrancaReclamanteEnum getTipoCobrancaReclamante() {
        return this.tipoCobrancaReclamante;
    }

    public void setTipoCobrancaReclamante(TipoCobrancaReclamanteEnum tipoCobrancaReclamante) {
        this.tipoCobrancaReclamante = tipoCobrancaReclamante;
    }

    /*
     * WARNING - void declaration
     */
    public static void criarDeParcelasAtualizaveis(Calculo calculo, List<ParcelasAtualizaveisMultaIndenizacao> paMultas) {
        Pagamento pagamentoParaVinculo;
        ArrayList<Multa> multas = new ArrayList<Multa>();
        HashMap<MultaDoPagamento, Multa> pagamentosDaMulta = new HashMap<MultaDoPagamento, Multa>();
        HashMap<MultaDoPagamento, Pagamento> pagamentosParaVincular = new HashMap<MultaDoPagamento, Pagamento>();
        for (ParcelasAtualizaveisMultaIndenizacao paMulta : paMultas) {
            void var7_7;
            Object var7_8 = null;
            if (Utils.naoNulo(paMulta.getMulta()) && Utils.naoNulo(paMulta.getMulta().getId())) {
                List<MultaDoPagamento> list = Multa.obterPagamentos(paMulta.getMulta());
            }
            Multa multa = new Multa(calculo, paMulta);
            if (Utils.naoNulo(var7_7)) {
                for (MultaDoPagamento pagamento : var7_7) {
                    MultaDoPagamento pagamentoNovo = new MultaDoPagamento(pagamento);
                    pagamentosDaMulta.put(pagamentoNovo, multa);
                    pagamentosParaVincular.put(pagamentoNovo, pagamento.getPagamento());
                }
            }
            multas.add(multa);
        }
        ArrayList<Pagamento> pagamentosJaLimpos = new ArrayList<Pagamento>();
        for (MultaDoPagamento multaDoPagamento : pagamentosParaVincular.keySet()) {
            pagamentoParaVinculo = multaDoPagamento.getPagamento();
            if (pagamentosJaLimpos.contains(pagamentoParaVinculo)) continue;
            pagamentoParaVinculo.setDispararExcecoesNaValidacao(Boolean.FALSE);
            Multa.atualizarVinculosDePagamentoDo(pagamentoParaVinculo);
            pagamentosJaLimpos.add(pagamentoParaVinculo);
        }
        Multa.removerDoCalculo(calculo);
        Multa.salvar(multas);
        for (Map.Entry entry : pagamentosDaMulta.entrySet()) {
            ((MultaDoPagamento)entry.getKey()).setMulta((Multa)entry.getValue());
        }
        Pagamento.salvar(pagamentosJaLimpos);
        for (MultaDoPagamento multaDoPagamento : pagamentosParaVincular.keySet()) {
            pagamentoParaVinculo = multaDoPagamento.getPagamento();
            Multa.inserirVinculoNoPagamento(pagamentoParaVinculo, multaDoPagamento);
        }
    }

    private static void inserirVinculoNoPagamento(Pagamento pagamentoParaVinculo, MultaDoPagamento pagamento) {
        switch (pagamento.getTipoVinculo()) {
            case DEBITOSRECLAMANTE: {
                pagamentoParaVinculo.getMultasDevidasTerceiros().add(pagamento);
                break;
            }
            case OUTROSDEBITOSRECLAMADO: {
                pagamentoParaVinculo.getMultasDevidasTerceirosOutrosDebitos().add(pagamento);
                break;
            }
            case DEBITOSCOBRARRECLAMANTE: {
                pagamentoParaVinculo.getMultasDevidasTerceirosDebitosCobrarDoReclamante().add(pagamento);
            }
        }
        Pagamento.salvar(pagamentoParaVinculo);
    }

    private static void atualizarVinculosDePagamentoDo(Pagamento pagamentoParaVinculo) {
        ArrayList<MultaDoPagamento> multasParaRemover = new ArrayList<MultaDoPagamento>();
        for (MultaDoPagamento multasDoPagamento : pagamentoParaVinculo.getMultasDevidasTerceiros()) {
            if (!TipoOrigemRegistroEnum.CALCULO.equals((Object)multasDoPagamento.getMulta().getOrigemRegistro())) continue;
            multasParaRemover.add(multasDoPagamento);
        }
        for (MultaDoPagamento multaDoPagamento : multasParaRemover) {
            pagamentoParaVinculo.getMultasDevidasTerceiros().remove(multaDoPagamento);
        }
        multasParaRemover.clear();
        for (MultaDoPagamento multasDoPagamento : pagamentoParaVinculo.getMultasDevidasTerceirosOutrosDebitos()) {
            if (!TipoOrigemRegistroEnum.CALCULO.equals((Object)multasDoPagamento.getMulta().getOrigemRegistro())) continue;
            multasParaRemover.add(multasDoPagamento);
        }
        for (MultaDoPagamento multaDoPagamento : multasParaRemover) {
            pagamentoParaVinculo.getMultasDevidasTerceirosOutrosDebitos().remove(multaDoPagamento);
        }
        multasParaRemover.clear();
        for (MultaDoPagamento multasDoPagamento : pagamentoParaVinculo.getMultasDevidasTerceirosDebitosCobrarDoReclamante()) {
            if (!TipoOrigemRegistroEnum.CALCULO.equals((Object)multasDoPagamento.getMulta().getOrigemRegistro())) continue;
            multasParaRemover.add(multasDoPagamento);
        }
        for (MultaDoPagamento multaDoPagamento : multasParaRemover) {
            pagamentoParaVinculo.getMultasDevidasTerceirosDebitosCobrarDoReclamante().remove(multaDoPagamento);
        }
    }

    public static void removerDoCalculo(Calculo calculo) {
        Multa.getRepositorio(RepositorioDeMulta.class).removerMultasDoCalculo(calculo);
    }

    public BigDecimal getValorJurosCalcExterno() {
        return this.valorJurosCalcExterno;
    }

    public void setValorJurosCalcExterno(BigDecimal valorJurosCalcExterno) {
        this.valorJurosCalcExterno = valorJurosCalcExterno;
    }

    public Date getDataApartirDeAplicarJuros() {
        return this.dataApartirDeAplicarJuros;
    }

    public void setDataApartirDeAplicarJuros(Date dataApartirDeAplicarJuros) {
        this.dataApartirDeAplicarJuros = dataApartirDeAplicarJuros;
    }
}

