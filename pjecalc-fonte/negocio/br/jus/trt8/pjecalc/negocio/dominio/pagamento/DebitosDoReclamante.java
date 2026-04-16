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
 *  javax.persistence.OneToOne
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
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndicesAcumuladosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDevedorDoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeHonorarioDoPagamentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.IndicePrecatorio;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ServicoAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.MaquinaDeCalculoDeHonorarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.AtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDoPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDoPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PensaoAlimenticiaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
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
import org.hibernate.annotations.Where;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBDEBITOSRECLAMANTE")
@SequenceGenerator(name="SQDEBITOSRECLAMANTE", sequenceName="SQDEBITOSRECLAMANTE", allocationSize=1)
@Name(value="debitosDoReclamante")
@Scope(value=ScopeType.SESSION)
public class DebitosDoReclamante
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = 9032264200272976266L;
    private static final int INDICE_VALOR_RATEADO_JUROS_PERIODO_ATUAL = 2;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQDEBITOSRECLAMANTE")
    @Column(name="IIDDEBITOSRECLAMANTE")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDATUALIZACAO")
    private Atualizacao atualizacao;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCREDITORECLAMANTEPAG")
    private CreditosDoReclamante creditosDoReclamante;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.PERSIST})
    @JoinColumn(name="IIDCUSTASATUALIZACAO")
    private CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="debitosDoReclamante")
    @JoinColumn(name="IIDVINCULOATUALIZACAOPENSAO")
    private PensaoAlimenticiaDaAtualizacao pensaoAlimenticiaDaAtualizacao;
    @Column(name="DDTCRIACAODEBITOSRECLAMANTE", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataCriacao;
    @Column(name="DDTINICIALDEBITOSRECLAMANTE", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataInicialPeriodo;
    @Column(name="DDTFINALDEBITOSRECLAMANTE", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataFinalPeriodo;
    @Column(name="MVLINDICECORRECAO", precision=38, scale=25)
    private BigDecimal indiceDeCorrecao;
    @Column(name="MVLINDICECORRECAOFGTS", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoFgts;
    @Column(name="MVLINDICECORRECAOFGTSPJUROS", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoFgtsParaJuros;
    @Column(name="MVLINDICECORRECAOPREVPRIV", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoPrevPrivada;
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
    @Column(name="MVLTAXADEJUROS", precision=12, scale=4)
    private BigDecimal taxaDeJuros;
    @Column(name="MVLTAXADEJUROSFGTS", precision=12, scale=4)
    private BigDecimal taxaDeJurosFgts;
    @Column(name="MVLTOTALDEVIDO", precision=12, scale=2)
    private BigDecimal totalDevido;
    @Column(name="MVLTOTALPAGO", precision=12, scale=2)
    private BigDecimal totalPago;
    @Column(name="MVLTOTALDIFERENCA", precision=12, scale=2)
    private BigDecimal totalDiferenca;
    @Column(name="MVLVALORREVIDENCIAPRIVADA", precision=12, scale=2)
    private BigDecimal valorPrevidenciaPrivada;
    @Column(name="MVLVALORPAGOPREVIDENCIAPRIVADA", precision=12, scale=2)
    private BigDecimal pagoPrevidenciaPrivada;
    @Column(name="MVLVALORDESCONTOINSS", precision=12, scale=2)
    private BigDecimal valorDescontoInss;
    @Column(name="MVLVALORPAGODESCONTOINSS", precision=12, scale=2)
    private BigDecimal pagoDescontoInss;
    @Column(name="MVLDEVIDOIRPF", precision=12, scale=2)
    private BigDecimal valorDevidoIrpf;
    @Column(name="MVLPAGOIRPF", precision=12, scale=2)
    private BigDecimal valorPagoIrpf;
    @Column(name="MVLDEVIDOCUSTASPRECATORIO", precision=12, scale=2)
    private BigDecimal valorDevidoCustasParaPrecatorio;
    @Column(name="MVLPAGOCUSTASPRECATORIO", precision=12, scale=2)
    private BigDecimal valorPagoCustasParaPrecatorio;
    @Where(clause="STPMULTA = 'I' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="debitosDoReclamante")
    @OrderBy(value="multa")
    private Set<MultaDaAtualizacao> multasInformadas = new HashSet<MultaDaAtualizacao>();
    @Where(clause="STPMULTA = 'C' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="debitosDoReclamante")
    @OrderBy(value="multa")
    private Set<MultaDaAtualizacao> multasCalculadas = new HashSet<MultaDaAtualizacao>();
    @Where(clause="STPVALOR = 'C' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="debitosDoReclamante")
    @OrderBy(value="honorario")
    private Set<HonorarioDaAtualizacao> honorariosDaAtualizacaoCalculado = new HashSet<HonorarioDaAtualizacao>();
    @Where(clause="STPVALOR = 'I' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="debitosDoReclamante")
    @OrderBy(value="honorario")
    private Set<HonorarioDaAtualizacao> honorariosDaAtualizacaoInformado = new HashSet<HonorarioDaAtualizacao>();
    @Transient
    @In
    private ServicoDeCalculo servicoDeCalculo;

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public void salvar() {
        this.setDataCriacao(new Date());
        DebitosDoReclamante.getRepositorio(RepositorioDebitosDoReclamante.class).salvar(this);
    }

    public static List<DebitosDoReclamante> obterUltimoRegistro(Atualizacao atualizacao) {
        return DebitosDoReclamante.getRepositorio(RepositorioDebitosDoReclamante.class).obterUltimoRegistro(atualizacao);
    }

    public static List<DebitosDoReclamante> obterTodos(Atualizacao atualizacao) {
        return DebitosDoReclamante.getRepositorio(RepositorioDebitosDoReclamante.class).obterTodosDebitosDoReclamante(atualizacao);
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

    public BigDecimal getValorFgts() {
        return this.valorFgts;
    }

    public void setValorFgts(BigDecimal valorFgts) {
        this.valorFgts = valorFgts;
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

    public BigDecimal getPagoJuroDeMoraFgts() {
        return this.pagoJuroDeMoraFgts;
    }

    public void setPagoJuroDeMoraFgts(BigDecimal pagoJuroDeMoraFgts) {
        this.pagoJuroDeMoraFgts = pagoJuroDeMoraFgts;
    }

    public BigDecimal getPagoJuroDeMoraFgtsPeriodoAtual() {
        return this.pagoJuroDeMoraFgtsPeriodoAtual;
    }

    public void setPagoJuroDeMoraFgtsPeriodoAtual(BigDecimal pagoJuroDeMoraFgtsPeriodoAtual) {
        this.pagoJuroDeMoraFgtsPeriodoAtual = pagoJuroDeMoraFgtsPeriodoAtual;
    }

    public BigDecimal getIndiceDeCorrecao() {
        return this.indiceDeCorrecao;
    }

    public void setIndiceDeCorrecao(BigDecimal indiceDeCorrecao) {
        this.indiceDeCorrecao = indiceDeCorrecao;
    }

    public BigDecimal getIndiceDeCorrecaoFgts() {
        return this.indiceDeCorrecaoFgts;
    }

    public void setIndiceDeCorrecaoFgts(BigDecimal indiceDeCorrecaoFgts) {
        this.indiceDeCorrecaoFgts = indiceDeCorrecaoFgts;
    }

    public BigDecimal getIndiceDeCorrecaoFgtsParaJuros() {
        return this.indiceDeCorrecaoFgtsParaJuros;
    }

    public void setIndiceDeCorrecaoFgtsParaJuros(BigDecimal indiceDeCorrecaoFgtsParaJuros) {
        this.indiceDeCorrecaoFgtsParaJuros = indiceDeCorrecaoFgtsParaJuros;
    }

    public BigDecimal getIndiceDeCorrecaoPrevPrivada() {
        return this.indiceDeCorrecaoPrevPrivada;
    }

    public void setIndiceDeCorrecaoPrevPrivada(BigDecimal indiceDeCorrecaoPrevPrivada) {
        this.indiceDeCorrecaoPrevPrivada = indiceDeCorrecaoPrevPrivada;
    }

    public BigDecimal getTaxaDeJuros() {
        return this.taxaDeJuros;
    }

    public void setTaxaDeJuros(BigDecimal taxaDeJuros) {
        this.taxaDeJuros = taxaDeJuros;
    }

    public BigDecimal getTaxaDeJurosFgts() {
        return this.taxaDeJurosFgts;
    }

    public void setTaxaDeJurosFgts(BigDecimal taxaDeJurosFgts) {
        this.taxaDeJurosFgts = taxaDeJurosFgts;
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

    public BigDecimal getPagoPrevidenciaPrivada() {
        return this.pagoPrevidenciaPrivada;
    }

    public void setPagoPrevidenciaPrivada(BigDecimal pagoPrevidenciaPrivada) {
        this.pagoPrevidenciaPrivada = pagoPrevidenciaPrivada;
    }

    public BigDecimal getPagoDescontoInss() {
        return this.pagoDescontoInss;
    }

    public void setPagoDescontoInss(BigDecimal pagoDescontoInss) {
        this.pagoDescontoInss = pagoDescontoInss;
    }

    public BigDecimal getValorDevidoIrpf() {
        return this.valorDevidoIrpf;
    }

    public void setValorDevidoIrpf(BigDecimal valorDevidoIrpf) {
        this.valorDevidoIrpf = valorDevidoIrpf;
    }

    public BigDecimal getValorPagoIrpf() {
        return this.valorPagoIrpf;
    }

    public void setValorPagoIrpf(BigDecimal valorPagoIrpf) {
        this.valorPagoIrpf = valorPagoIrpf;
    }

    public Set<HonorarioDaAtualizacao> getHonorariosDaAtualizacaoCalculado() {
        return this.honorariosDaAtualizacaoCalculado;
    }

    public void setHonorariosDaAtualizacaoCalculado(Set<HonorarioDaAtualizacao> honorariosDaAtualizacaoCalculado) {
        this.honorariosDaAtualizacaoCalculado = honorariosDaAtualizacaoCalculado;
    }

    public Set<HonorarioDaAtualizacao> getHonorariosDaAtualizacaoInformado() {
        return this.honorariosDaAtualizacaoInformado;
    }

    public void setHonorariosDaAtualizacaoInformado(Set<HonorarioDaAtualizacao> honorariosDaAtualizacaoInformado) {
        this.honorariosDaAtualizacaoInformado = honorariosDaAtualizacaoInformado;
    }

    public ServicoDeCalculo getServicoDeCalculo() {
        return this.servicoDeCalculo;
    }

    public void setServicoDeCalculo(ServicoDeCalculo servicoDeCalculo) {
        this.servicoDeCalculo = servicoDeCalculo;
    }

    public Long getId() {
        return this.id;
    }

    public CreditosDoReclamante getCreditosDoReclamante() {
        return this.creditosDoReclamante;
    }

    public void setCreditosDoReclamante(CreditosDoReclamante creditosDoReclamante) {
        this.creditosDoReclamante = creditosDoReclamante;
    }

    public CustasJudiciaisDaAtualizacao getCustasJudiciaisDaAtualizacao() {
        return this.custasJudiciaisDaAtualizacao;
    }

    public void setCustasJudiciaisDaAtualizacao(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        this.custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao;
    }

    public PensaoAlimenticiaDaAtualizacao getPensaoAlimenticiaDaAtualizacao() {
        return this.pensaoAlimenticiaDaAtualizacao;
    }

    public void setPensaoAlimenticiaDaAtualizacao(PensaoAlimenticiaDaAtualizacao pensaoAlimenticiaDaAtualizacao) {
        this.pensaoAlimenticiaDaAtualizacao = pensaoAlimenticiaDaAtualizacao;
    }

    private BigDecimal calcularTaxaDeJuros(Date dataInicial, Date dataFinal, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData) {
        return this.calcularTaxaDeJuros(dataInicial, dataFinal, jurosDoAjuizamento, projetarData, false);
    }

    private BigDecimal calcularTaxaDeJuros(Date dataInicial, Date dataFinal, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData, boolean isMultaHonorario) {
        TabelaDeJurosDoCalculo tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), dataInicial, dataFinal);
        return tabelaDeJuros.calcularTaxaDeJurosPagamento(dataInicial, dataFinal, jurosDoAjuizamento, projetarData, isMultaHonorario);
    }

    public BigDecimal getDescontoInssCorrigido() {
        if (BigDecimal.ZERO.compareTo(this.getValorDescontoInss()) > 0) {
            return this.getValorDescontoInss();
        }
        if (!(this.getCalculo().getInss().getInssSobreSalariosDevidos().getCorrigirDescontoReclamante().booleanValue() || HelperDate.dateAfter(this.getDataInicialPeriodo(), ConversaoDeMoedas.obterDataUltimaConversaoDeMoeda()) || HelperDate.dateEquals(this.getDataFinalPeriodo(), this.getCalculo().getDataDeLiquidacao()))) {
            BigDecimal conversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getInstance(this.getDataInicialPeriodo()).addDay(1).getDate(), this.getDataFinalPeriodo());
            return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDescontoInss(), conversaoMoeda));
        }
        if (!this.getCalculo().getInss().getInssSobreSalariosDevidos().getCorrigirDescontoReclamante().booleanValue()) {
            return Utils.arredondarValorMonetario(this.getValorDescontoInss());
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDescontoInss(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getDescontoInssCorrigidoPrecatorio() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDescontoInss(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getPrevidenciaPrivadaCorrigido() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorPrevidenciaPrivada(), this.getIndiceDeCorrecaoPrevPrivada()));
    }

    public BigDecimal getDiferencaInss() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDescontoInssCorrigido(), this.getPagoDescontoInss()));
    }

    public BigDecimal getDiferencaInssPrecatorio() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDescontoInssCorrigidoPrecatorio(), this.getPagoDescontoInss()));
    }

    public BigDecimal getDiferencaPrevidenciaPrivada() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getPrevidenciaPrivadaCorrigido(), this.getPagoPrevidenciaPrivada()));
    }

    public BigDecimal getValorIrpfCorrigidoPrecatorio() {
        BigDecimal devidoCorrigido = Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDevidoIrpf(), this.getIndiceDeCorrecao()));
        return Utils.nulo(devidoCorrigido) ? BigDecimal.ZERO : devidoCorrigido;
    }

    public BigDecimal getDiferencaIrpf() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getValorDevidoIrpf(), this.getValorPagoIrpf()));
    }

    public BigDecimal getDiferencaIrpfPrecatorio() {
        BigDecimal diferenca = Utils.arredondarValorMonetario(Utils.subtrair(this.getValorIrpfCorrigidoPrecatorio(), this.getValorPagoIrpf()));
        return Utils.nulo(diferenca) ? BigDecimal.ZERO : diferenca;
    }

    public BigDecimal getDevidoJuroDeMoraFgtsPeriodoAtual() {
        return BigDecimal.ZERO.compareTo(this.getDevidoFgts()) > 0 ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(this.getDevidoFgts(), this.getTaxaDeJurosFgts().divide(Utils.CEM)));
    }

    public BigDecimal getDevidoFgts() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorFgts(), this.getIndiceDeCorrecaoFgts()));
    }

    public BigDecimal getValorBaseJuroDeMoraFgtsDepoisPrimeiroEvento() {
        return Utils.somar(Utils.arredondarValorMonetario(Utils.multiplicar(this.getJuroFgts(), this.getIndiceDeCorrecaoFgts())), Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorFgts(), this.getIndiceDeCorrecaoFgts())), this.getTaxaDeJurosFgts().divide(Utils.CEM))), this.getPagoJuroDeMoraFgtsPeriodoAtual()));
    }

    public BigDecimal getDiferencaJuroDeMoraFgtsDepoisPrimeiroEvento() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getValorBaseJuroDeMoraFgtsDepoisPrimeiroEvento(), this.getPagoJuroDeMoraFgts()));
    }

    public BigDecimal getJuroDeMoraFgtsPeriodoAtual() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorFgts(), this.getTaxaDeJurosFgts()));
    }

    public BigDecimal getDiferencaFgts() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoFgts(), this.getPagoFgts()));
    }

    public BigDecimal getDiferencaJuroDeMoraFgts() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoJuroDeMoraFgts(), this.getPagoJuroDeMoraFgts()));
    }

    public BigDecimal getDevidoJuroDeMoraFgts() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getJuroFgts(), this.getIndiceDeCorrecaoFgts()));
    }

    public BigDecimal getDiferencaJuroDeMoraFgtsPeriodoAtual() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoJuroDeMoraFgtsPeriodoAtual(), this.getPagoJuroDeMoraFgtsPeriodoAtual()));
    }

    public BigDecimal porcentagemDepositoFgts(CreditosDoReclamante creditoDoReclamante) {
        BigDecimal totalMultas = creditoDoReclamante.calcularTotalMultas();
        if (totalMultas.signum() >= 0) {
            return BigDecimal.ONE;
        }
        BigDecimal totalDevidoSemMulta = creditoDoReclamante.calcularTotalDevidoSemMulta();
        BigDecimal totalDevido = creditoDoReclamante.calcularTotalDevido();
        return BigDecimal.ZERO.compareTo(totalDevidoSemMulta) == 0 ? BigDecimal.ZERO : Utils.dividir(totalDevido, totalDevidoSemMulta);
    }

    public DebitosDoReclamante liquidarDebitosReclamante(Date dataInicialParaLiquidacao, Date dataFinalParaLiquidacao, DebitosDoReclamante debitosDoReclamanteAnterior, CreditosDoReclamante creditoDoReclamante, CreditosDoReclamante creditoDoReclamanteAnterior, Pagamento pagamento, Multa multaDoEvento, Honorario honorario, CustasFixasAtualizacao custas, PensaoAlimenticia pensao, boolean primeiroEvento) throws NegocioException {
        HonorarioDaAtualizacao honorarioDaAtualizacao;
        BigDecimal anterior;
        BigDecimal valorJuros;
        Date dataInicioDeJuros;
        MultaDaAtualizacao multaDaAtualizacao;
        HashMap<IndiceMonetarioEnum, BigDecimal> mapaDeIndices = new HashMap<IndiceMonetarioEnum, BigDecimal>();
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(this.getCalculo().getAtualizacaoMonetaria(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
        BigDecimal indiceDeCorrecao = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
        HelperDate dataInicialParaLiquidacaoMaisUm = HelperDate.getInstance(dataInicialParaLiquidacao).addDay(1);
        BigDecimal taxaDeJuros = this.calcularTaxaDeJuros(dataInicialParaLiquidacaoMaisUm.getDate(), dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
        BigDecimal indiceDeCorrecaoParaJuros = indiceDeCorrecao;
        BigDecimal indiceDeCorrecaoDoFgts = indiceDeCorrecao;
        BigDecimal indiceDeCorrecaoDoFgtsParaJuros = indiceDeCorrecao;
        BigDecimal taxaDeJurosDoFgts = taxaDeJuros;
        switch (this.getCalculo().getParametrosDeAtualizacao().getIndiceDeCorrecaoDoFGTS()) {
            case UTILIZAR_INDICE_JAM: {
                TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaFgts = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, IndiceMonetarioEnum.JAM, IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                tabelaDeCorrecaoMonetariaFgts.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                indiceDeCorrecaoDoFgts = tabelaDeCorrecaoMonetariaFgts.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
                taxaDeJurosDoFgts = BigDecimal.ZERO;
                break;
            }
            case UTILIZAR_INDICE_JAM_E_TRABALHISTA: {
                TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaFgts;
                if (Utils.naoNulo(this.getCalculo().getDataDemissao())) {
                    TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhistaCombinadaParaFgts = new TabelaDeCorrecaoMonetaria(Boolean.TRUE, this.getCalculo().getAtualizacaoMonetaria(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                    tabelaDeCorrecaoMonetariaTrabalhistaCombinadaParaFgts.carregarTabelaTrabalhistaCombinadaParaFgts(new Periodo(HelperDate.getInstance(this.getCalculo().getDataDemissao()).addDay(1).getDate(), dataFinalParaLiquidacao), this.getCalculo());
                    HelperDate dataDemissaoMaisUmDia = HelperDate.getInstance(this.getCalculo().getDataDemissao()).addDay(1);
                    BigDecimal indiceDeCorrecaoTrabalhistaParaCombinar = tabelaDeCorrecaoMonetariaTrabalhistaCombinadaParaFgts.obterValorAcumuladoDoIndice(dataDemissaoMaisUmDia.getDate());
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
        BigDecimal indiceDeCorrecaoDaPrevPrivada = indiceDeCorrecao;
        if (OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE.equals((Object)this.getCalculo().getParametrosDeAtualizacao().getIndiceDeCorrecaoDePrevidenciaPrivada())) {
            TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaPrevPriv = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, this.getCalculo().getParametrosDeAtualizacao().getOutroIndiceDeCorrecaoDePrevidenciaPrivada(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
            tabelaDeCorrecaoMonetariaPrevPriv.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
            indiceDeCorrecaoDaPrevPrivada = tabelaDeCorrecaoMonetariaPrevPriv.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
        }
        if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            Periodo periodoDaGraca = ServicoAtualizacaoUtils.montarPeriodoDaGraca(this.getAtualizacao());
            Periodo periodoAtualizacao = new Periodo(HelperDate.getInstance(dataInicialParaLiquidacao).addDay(1).getDate(), dataFinalParaLiquidacao);
            indiceDeCorrecao = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, this.getAtualizacao().getDataInicioAplicarEC1362025(), this.getAtualizacao().getGrupoEsferaPrecatorio(), false);
            indiceDeCorrecaoDoFgtsParaJuros = indiceDeCorrecaoParaJuros = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, this.getAtualizacao().getDataInicioAplicarEC1362025(), this.getAtualizacao().getGrupoEsferaPrecatorio(), true);
            taxaDeJuros = ServicoAtualizacaoUtils.encontrarTaxaDeJurosPrecatorioSIP(periodoAtualizacao.getInicial(), periodoAtualizacao.getFinal(), this.getAtualizacao().getDataInicioAplicarEC1362025(), periodoDaGraca);
            indiceDeCorrecaoDoFgts = indiceDeCorrecao;
            indiceDeCorrecaoDaPrevPrivada = indiceDeCorrecao;
            taxaDeJurosDoFgts = taxaDeJuros;
        }
        DebitosDoReclamante debitosDoReclamante = new DebitosDoReclamante();
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento != null && multaDoEvento != null && honorario != null && pensao != null) {
            debitosDoReclamante = debitosDoReclamanteAnterior;
            debitosDoReclamante = this.incluirMulta(debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, multaDoEvento);
            debitosDoReclamante = this.incluirHonorario(debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, honorario);
            debitosDoReclamante = this.incluirPensao(debitosDoReclamante, pensao);
            debitosDoReclamante.setTotalDevido(debitosDoReclamante.calcularTotalDevido());
            return debitosDoReclamante;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento == null && multaDoEvento != null && honorario == null && pensao == null) {
            debitosDoReclamante = debitosDoReclamanteAnterior;
            this.incluirMulta(debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, multaDoEvento);
            return debitosDoReclamante;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento == null && multaDoEvento == null && honorario != null && pensao == null) {
            debitosDoReclamante = debitosDoReclamanteAnterior;
            this.incluirHonorario(debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, honorario);
            debitosDoReclamante.setTotalDevido(debitosDoReclamante.calcularTotalDevido());
            debitosDoReclamante.setTotalPago(debitosDoReclamante.calcularTotalPago());
            debitosDoReclamante.setTotalDiferenca(debitosDoReclamante.calcularTotalDiferenca());
            return debitosDoReclamante;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento == null && multaDoEvento == null && honorario == null && pensao != null) {
            debitosDoReclamante = debitosDoReclamanteAnterior;
            this.incluirPensao(debitosDoReclamante, pensao);
            return debitosDoReclamante;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento != null && multaDoEvento == null && honorario == null && pensao == null) {
            debitosDoReclamante = debitosDoReclamanteAnterior;
            debitosDoReclamante.setTotalDevido(debitosDoReclamante.calcularTotalDevido());
            return debitosDoReclamante;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento == null && multaDoEvento == null && honorario == null && pensao == null) {
            debitosDoReclamante = debitosDoReclamanteAnterior;
            debitosDoReclamante.setTotalDevido(debitosDoReclamante.calcularTotalDevido());
            debitosDoReclamante.setTotalPago(debitosDoReclamante.calcularTotalPago());
            debitosDoReclamante.setTotalDiferenca(debitosDoReclamante.calcularTotalDiferenca());
            return debitosDoReclamante;
        }
        debitosDoReclamante.setIndiceDeCorrecao(indiceDeCorrecao);
        debitosDoReclamante.setIndiceDeCorrecaoFgts(BigDecimal.ZERO.compareTo(debitosDoReclamanteAnterior.getDiferencaFgts()) > 0 ? BigDecimal.ONE : indiceDeCorrecaoDoFgts);
        debitosDoReclamante.setIndiceDeCorrecaoFgtsParaJuros(indiceDeCorrecaoDoFgtsParaJuros);
        debitosDoReclamante.setIndiceDeCorrecaoPrevPrivada(Utils.nulo(debitosDoReclamanteAnterior.getDiferencaPrevidenciaPrivada()) || BigDecimal.ZERO.compareTo(debitosDoReclamanteAnterior.getDiferencaPrevidenciaPrivada()) > 0 ? BigDecimal.ONE : indiceDeCorrecaoDaPrevPrivada);
        debitosDoReclamante.setTaxaDeJuros(Utils.arredondarValor(taxaDeJuros, 4));
        debitosDoReclamante.setTaxaDeJurosFgts(Utils.arredondarValor(taxaDeJurosDoFgts, 4));
        debitosDoReclamante.setAtualizacao(this.getAtualizacao());
        debitosDoReclamante.setCreditosDoReclamante(creditoDoReclamante);
        debitosDoReclamante.setDataInicialPeriodo(dataInicialParaLiquidacao);
        debitosDoReclamante.setDataFinalPeriodo(dataFinalParaLiquidacao);
        debitosDoReclamante.setPagoFgts(BigDecimal.ZERO);
        debitosDoReclamante.setPagoJuroDeMoraFgts(BigDecimal.ZERO);
        debitosDoReclamante.setPagoJuroDeMoraFgtsPeriodoAtual(BigDecimal.ZERO);
        debitosDoReclamante.setValorDescontoInss(debitosDoReclamanteAnterior.getDiferencaInss());
        debitosDoReclamante.setPagoDescontoInss(BigDecimal.ZERO);
        debitosDoReclamante.setValorPrevidenciaPrivada(debitosDoReclamanteAnterior.getDiferencaPrevidenciaPrivada());
        debitosDoReclamante.setPagoPrevidenciaPrivada(BigDecimal.ZERO);
        if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            debitosDoReclamante.setValorDescontoInss(debitosDoReclamanteAnterior.getDiferencaInssPrecatorio());
            debitosDoReclamante.setValorDevidoIrpf(debitosDoReclamanteAnterior.getDiferencaIrpfPrecatorio());
            debitosDoReclamante.setValorPagoIrpf(BigDecimal.ZERO);
            debitosDoReclamante.setValorDevidoCustasParaPrecatorio(debitosDoReclamanteAnterior.getDiferencaCustasJudiciaisPrecatorio());
            debitosDoReclamante.setValorPagoCustasParaPrecatorio(BigDecimal.ZERO);
        }
        if (dataFinalParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()) || dataInicialParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao())) {
            debitosDoReclamante.setJuroFgts(Utils.arredondarValorMonetario(Utils.multiplicar(debitosDoReclamanteAnterior.getDiferencaJuroDeMoraFgts(), this.porcentagemDepositoFgts(creditoDoReclamante))));
        } else {
            debitosDoReclamante.setJuroFgts(Utils.arredondarValorMonetario(Utils.multiplicar(debitosDoReclamanteAnterior.getDiferencaJuroDeMoraFgtsDepoisPrimeiroEvento(), this.porcentagemDepositoFgts(creditoDoReclamante))));
        }
        if (BigDecimal.ZERO.compareTo(debitosDoReclamanteAnterior.getDiferencaFgts()) > 0) {
            debitosDoReclamante.setValorFgts(debitosDoReclamanteAnterior.getDiferencaFgts());
            debitosDoReclamante.setJuroFgts(BigDecimal.ZERO);
        } else {
            debitosDoReclamante.setValorFgts(Utils.arredondarValorMonetario(Utils.multiplicar(debitosDoReclamanteAnterior.getDiferencaFgts(), this.porcentagemDepositoFgts(creditoDoReclamante))));
        }
        if (Utils.naoNulo(debitosDoReclamanteAnterior.getPensaoAlimenticiaDaAtualizacao())) {
            PensaoAlimenticiaDaAtualizacao pensaoDaAtualizacao = new PensaoAlimenticiaDaAtualizacao();
            pensaoDaAtualizacao.setPensaoAlimenticia(debitosDoReclamanteAnterior.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia());
            pensaoDaAtualizacao.setPercentualPrincipal(debitosDoReclamanteAnterior.getPensaoAlimenticiaDaAtualizacao().getPercentualPrincipal());
            pensaoDaAtualizacao.setPercentualFgts(debitosDoReclamanteAnterior.getPensaoAlimenticiaDaAtualizacao().getPercentualFgts());
            if (Utils.naoNulo(debitosDoReclamanteAnterior.getPensaoAlimenticiaDaAtualizacao().getValorPensao())) {
                pensaoDaAtualizacao.setValorPensao(pensaoDaAtualizacao.calcularValorDaPensao(creditoDoReclamante, creditoDoReclamanteAnterior, debitosDoReclamanteAnterior.getPensaoAlimenticiaDaAtualizacao(), this.getIndiceDeCorrecao(), this.getCalculo()));
            }
            pensaoDaAtualizacao.setValorJuros(pensaoDaAtualizacao.getPensaoAlimenticia().getIncidirSobreJuros() != false ? creditoDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(debitosDoReclamanteAnterior.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getAliquota().divide(Utils.CEM)) : BigDecimal.ZERO);
            pensaoDaAtualizacao.setJaCalculadoUmaVez(debitosDoReclamanteAnterior.getPensaoAlimenticiaDaAtualizacao().getJaCalculadoUmaVez());
            pensaoDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
            pensaoDaAtualizacao.setPagoPensao(BigDecimal.ZERO);
            pensaoDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            debitosDoReclamante.setPensaoAlimenticiaDaAtualizacao(pensaoDaAtualizacao);
        }
        for (MultaDaAtualizacao multaAnterior : debitosDoReclamanteAnterior.getMultasCalculadas()) {
            multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setMulta(multaAnterior.getMulta());
            multaDaAtualizacao.setTipoVinculo(multaAnterior.getTipoVinculo());
            multaDaAtualizacao.setTipoValorDaMulta(multaAnterior.getTipoValorDaMulta());
            multaDaAtualizacao.setValorMulta(multaDaAtualizacao.calcularValorDaMultaCalculadaOutros(creditoDoReclamante, creditoDoReclamanteAnterior, multaAnterior, multaAnterior.getIndiceDeCorrecao(), debitosDoReclamante.getPrevidenciaPrivadaCorrigido(), debitosDoReclamante.getDescontoInssCorrigido(), dataFinalParaLiquidacao));
            multaDaAtualizacao.setValorJuros(multaAnterior.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : creditoDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM)));
            multaDaAtualizacao.setJaCalculadoUmaVez(multaAnterior.getJaCalculadoUmaVez());
            multaDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
            multaDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            debitosDoReclamante.getMultasCalculadas().add(multaDaAtualizacao);
        }
        for (MultaDaAtualizacao multaAnterior : debitosDoReclamanteAnterior.getMultasInformadas()) {
            multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setMulta(multaAnterior.getMulta());
            multaDaAtualizacao.setTipoVinculo(multaAnterior.getTipoVinculo());
            multaDaAtualizacao.setTipoValorDaMulta(multaAnterior.getTipoValorDaMulta());
            multaDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
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
            dataInicioDeJuros = AtualizacaoUtils.testarExistenciaJurosDeAte(new Periodo(debitosDoReclamante.getDataInicialPeriodo(), debitosDoReclamante.getDataFinalPeriodo()), dataInicialParaLiquidacaoMaisUm.getDate(), multaAnterior.getMulta().getOrigemRegistro(), this.getCalculo(), multaAnterior.getMulta().getDataApartirDeAplicarJuros(), multaAnterior.getMulta().getDataEvento(), multaAnterior.getPrimeiroEventoProcessado() == false);
            if (!multaDaAtualizacao.getPrimeiroEventoProcessado().booleanValue() && (dataFinalParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()) || dataInicialParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()))) {
                multaDaAtualizacao.setValorJuros(multaAnterior.devidoJuroMultaInformadaPrimeiroEvento(multaAnterior.getIndiceDeCorrecao()));
                multaDaAtualizacao.setValorMulta(multaAnterior.getMulta().getValorCorrigido());
                multaDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
            } else {
                multaDaAtualizacao.setValorMulta(Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao()), multaAnterior.getPagoMulta())));
                valorJuros = multaAnterior.devidoJuroMultaInformadaDepoisPrimeiroEvento();
                anterior = BigDecimal.ZERO;
                if (Utils.naoNulo(dataInicioDeJuros)) {
                    anterior = multaAnterior.valorJurosMultaInformadaPeriodoAnterior();
                }
                multaDaAtualizacao.setValorJuros(Utils.somar(Utils.subtrair(valorJuros, multaAnterior.getPagoJuro()), Utils.subtrair(anterior, multaAnterior.getPagoJuroPeriodoAtual())));
            }
            BigDecimal taxaJurosMulta = BigDecimal.ZERO;
            if (Utils.naoNulo(dataInicioDeJuros) && BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) <= 0) {
                taxaJurosMulta = this.calcularTaxaDeJuros(dataInicioDeJuros, dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
            }
            multaDaAtualizacao.setTaxaJurosMulta(Utils.arredondarValor(taxaJurosMulta, 4));
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            debitosDoReclamante.getMultasInformadas().add(multaDaAtualizacao);
        }
        for (HonorarioDaAtualizacao honorarioAnterior : debitosDoReclamanteAnterior.getHonorariosDaAtualizacaoCalculado()) {
            honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setHonorario(honorarioAnterior.getHonorario());
            honorarioDaAtualizacao.setTipoVinculo(honorarioAnterior.getTipoVinculo());
            honorarioDaAtualizacao.setTipoValor(honorarioAnterior.getTipoValor());
            honorarioDaAtualizacao.setValorHonorario(honorarioDaAtualizacao.calcularValorDoHonorarioCalculado(creditoDoReclamante, creditoDoReclamanteAnterior, honorarioAnterior, honorarioAnterior.getIndiceDeCorrecao(), debitosDoReclamante.getPrevidenciaPrivadaCorrigido(), debitosDoReclamante.getDescontoInssCorrigido()));
            honorarioDaAtualizacao.setValorJuros(creditoDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioAnterior.getHonorario().getAliquota().divide(Utils.CEM)));
            honorarioDaAtualizacao.setJaCalculadoUmaVez(honorarioAnterior.getJaCalculadoUmaVez());
            honorarioDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
            honorarioDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            if (honorarioDaAtualizacao.getValorRemanescenteHonorario() == null || debitosDoReclamante.getDataFinalPeriodo().equals(honorarioDaAtualizacao.getHonorario().getDataEvento()) && debitosDoReclamante.getDataInicialPeriodo().equals(debitosDoReclamante.getDataFinalPeriodo()) || debitosDoReclamante.getDataInicialPeriodo().equals(debitosDoReclamante.getCalculo().getDataDeLiquidacao())) {
                honorarioDaAtualizacao.setDevidoHonorario(honorarioDaAtualizacao.getDevidoCalculada());
            } else {
                BigDecimal devido = BigDecimal.ZERO;
                devido = Utils.somar(devido, honorarioDaAtualizacao.getDevidoCalculadaRemanescente(honorarioDaAtualizacao.getIndiceDeCorrecao()), devido);
                devido = Utils.somar(devido, debitosDoReclamante.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM)), devido);
                devido = Utils.somar(devido, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.calcularHonorariosSobreMultas(debitosDoReclamante.getCreditosDoReclamante()), honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), devido);
                honorarioDaAtualizacao.setDevidoHonorario(devido);
            }
            debitosDoReclamante.getHonorariosDaAtualizacaoCalculado().add(honorarioDaAtualizacao);
        }
        for (HonorarioDaAtualizacao honorarioAnterior : debitosDoReclamanteAnterior.getHonorariosDaAtualizacaoInformado()) {
            honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setHonorario(honorarioAnterior.getHonorario());
            honorarioDaAtualizacao.setTipoVinculo(honorarioAnterior.getTipoVinculo());
            honorarioDaAtualizacao.setTipoValor(honorarioAnterior.getTipoValor());
            honorarioDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
            honorarioDaAtualizacao.setPrimeiroEventoProcessado(honorarioAnterior.getPrimeiroEventoProcessado());
            if (!this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue() && OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE.equals((Object)honorarioDaAtualizacao.getHonorario().getTipoDeIndiceDeCorrecao())) {
                if (Utils.naoNulo(mapaDeIndices.get((Object)honorarioDaAtualizacao.getHonorario().getOutroIndiceDeCorrecao()))) {
                    honorarioDaAtualizacao.setIndiceDeCorrecao((BigDecimal)mapaDeIndices.get((Object)honorarioDaAtualizacao.getHonorario().getOutroIndiceDeCorrecao()));
                } else {
                    TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaHonorario = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, honorarioDaAtualizacao.getHonorario().getOutroIndiceDeCorrecao(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                    tabelaDeCorrecaoMonetariaHonorario.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                    BigDecimal indiceHonorario = tabelaDeCorrecaoMonetariaHonorario.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
                    mapaDeIndices.put(honorarioDaAtualizacao.getHonorario().getOutroIndiceDeCorrecao(), indiceHonorario);
                    honorarioDaAtualizacao.setIndiceDeCorrecao(indiceHonorario);
                }
            } else {
                honorarioDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
                honorarioDaAtualizacao.setIndiceDeCorrecaoParaJuros(indiceDeCorrecaoParaJuros);
            }
            dataInicioDeJuros = AtualizacaoUtils.testarExistenciaJurosDeAte(new Periodo(debitosDoReclamante.getDataInicialPeriodo(), debitosDoReclamante.getDataFinalPeriodo()), dataInicialParaLiquidacaoMaisUm.getDate(), honorarioAnterior.getHonorario().getOrigemRegistro(), this.getCalculo(), honorarioAnterior.getHonorario().getDataApartirDeAplicarJuros(), honorarioAnterior.getHonorario().getDataEvento(), honorarioAnterior.getPrimeiroEventoProcessado() == false);
            if (!this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue() && !honorarioDaAtualizacao.getPrimeiroEventoProcessado().booleanValue() && (dataFinalParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()) || dataInicialParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()))) {
                honorarioDaAtualizacao.setValorJuros(honorarioDaAtualizacao.getHonorario().getAplicarJuros() != false ? honorarioAnterior.devidoJuroHonorarioInformadoPrimeiroEvento(honorarioAnterior.getIndiceDeCorrecao()) : BigDecimal.ZERO);
                honorarioDaAtualizacao.setValorHonorario(honorarioAnterior.getHonorario().getValorCorrigido());
                honorarioDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
            } else {
                honorarioDaAtualizacao.setValorHonorario(Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioAnterior.getValorHonorario(), honorarioAnterior.getIndiceDeCorrecao()), honorarioAnterior.getPagoHonorario())));
                valorJuros = honorarioAnterior.devidoJuroHonorarioInformadoDepoisPrimeiroEvento();
                if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue() && Utils.nulo(valorJuros)) {
                    valorJuros = BigDecimal.ZERO;
                }
                anterior = BigDecimal.ZERO;
                if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue() || Utils.naoNulo(dataInicioDeJuros)) {
                    anterior = honorarioAnterior.valorJurosHonorarioInformadoPeriodoAnterior();
                }
                honorarioDaAtualizacao.setValorJuros(honorarioDaAtualizacao.getHonorario().getAplicarJuros() != false || this.getAtualizacao().getAtualizarRegraPrecatorio() != false && TipoValorEnum.CALCULADO.equals((Object)honorarioDaAtualizacao.getHonorario().getTipoValor()) ? Utils.somar(Utils.subtrair(valorJuros, honorarioAnterior.getPagoJuro()), Utils.subtrair(anterior, honorarioAnterior.getPagoJuroPeriodoAtual())) : BigDecimal.ZERO);
                if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                    BigDecimal impostoCorrigido = Utils.multiplicar(honorarioAnterior.getValorImpostoRenda(), honorarioAnterior.getIndiceDeCorrecao());
                    honorarioDaAtualizacao.setValorImpostoRenda(Utils.arredondarValorMonetario(Utils.subtrair(impostoCorrigido, honorarioAnterior.getPagoImpostoRenda(), impostoCorrigido)));
                }
            }
            BigDecimal taxaJurosHonorario = BigDecimal.ZERO;
            if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                taxaJurosHonorario = taxaDeJuros;
            } else if (Utils.naoNulo(dataInicioDeJuros) && BigDecimal.ZERO.compareTo(honorarioDaAtualizacao.getValorHonorario()) <= 0) {
                taxaJurosHonorario = this.calcularTaxaDeJuros(dataInicioDeJuros, dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
            }
            honorarioDaAtualizacao.setTaxaJurosHonorario(Utils.arredondarValor(taxaJurosHonorario, 4));
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            honorarioDaAtualizacao.setDevidoHonorario(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.getValorHonorario(), honorarioDaAtualizacao.getIndiceDeCorrecao())));
            debitosDoReclamante.getHonorariosDaAtualizacaoInformado().add(honorarioDaAtualizacao);
        }
        if (pensao != null) {
            debitosDoReclamante = this.incluirPensao(debitosDoReclamante, pensao);
        }
        if (honorario != null) {
            debitosDoReclamante = this.incluirHonorario(debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, honorario);
        }
        if (multaDoEvento != null) {
            debitosDoReclamante = this.incluirMulta(debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, multaDoEvento);
        }
        return debitosDoReclamante;
    }

    public DebitosDoReclamante aplicarPagamento(DebitosDoReclamante debitosDoReclamante, Pagamento pagamento) {
        BigDecimal totalDevidoHonorarioEJuros;
        BigDecimal valorParaPagarHonorario;
        Boolean pagamentoDeveSerApurado;
        Boolean selecionadaParaPagar;
        BigDecimal valorParaPagarMulta;
        Boolean pagamentoDeveSerApurado2;
        Boolean selecionadaParaPagar2;
        BigDecimal valorParaRecolhimentoFgts = pagamento.getValorParaRecolhimentoDebitosReclamanteDepositoDeFgts();
        this.recolherDepositoFgts(debitosDoReclamante, pagamento, valorParaRecolhimentoFgts);
        if (pagamento.getSelecionarDescontoDaContribuicaoSocial().booleanValue() && pagamento.getApurarDescontoDaContribuicaoSocial().booleanValue()) {
            BigDecimal pagoDescontoInss = pagamento.getCalculo().getAtualizacao().getAtualizarRegraPrecatorio() != false ? pagamento.apurarRecolhimentoDoReclamante(debitosDoReclamante.getDescontoInssCorrigidoPrecatorio()) : pagamento.apurarRecolhimentoDoReclamante(debitosDoReclamante.getDescontoInssCorrigido());
            debitosDoReclamante.setPagoDescontoInss(pagoDescontoInss);
        } else if (pagamento.getSelecionarDescontoDaContribuicaoSocial().booleanValue() && !pagamento.getApurarDescontoDaContribuicaoSocial().booleanValue()) {
            debitosDoReclamante.setPagoDescontoInss(pagamento.getValorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial());
        }
        if (pagamento.getSelecionarPrevidenciaPrivada().booleanValue() && pagamento.getApurarPrevidenciaPrivada().booleanValue()) {
            debitosDoReclamante.setPagoPrevidenciaPrivada(pagamento.apurarRecolhimentoDoReclamante(debitosDoReclamante.getPrevidenciaPrivadaCorrigido()));
        } else if (pagamento.getSelecionarPrevidenciaPrivada().booleanValue() && !pagamento.getApurarPrevidenciaPrivada().booleanValue()) {
            debitosDoReclamante.setPagoPrevidenciaPrivada(pagamento.getValorParaRecolhimentoDebitosReclamantePrevidenciaPrivada());
        }
        if (Utils.naoNulo(debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao()) && Utils.naoNulo(debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getValorPensao())) {
            boolean datasInicioFimPeriodoIguaisDataPensao;
            boolean bl = datasInicioFimPeriodoIguaisDataPensao = debitosDoReclamante.getDataFinalPeriodo().equals(this.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getDataEvento()) && debitosDoReclamante.getDataInicialPeriodo().equals(debitosDoReclamante.getDataFinalPeriodo());
            if (debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getValorRemanescente() == null || datasInicioFimPeriodoIguaisDataPensao || this.getDataInicialPeriodo().equals(debitosDoReclamante.getCalculo().getDataDeLiquidacao()) && !debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getJaCalculadoUmaVez().booleanValue()) {
                debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setPagoJuro(BigDecimal.ZERO);
                if (pagamento.getSelecionarPensaoAlimenticia().booleanValue() && pagamento.getApurarPensaoAlimenticia().booleanValue()) {
                    debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setPagoPensao(pagamento.apurarRecolhimentoDoReclamante(debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getDevidoPensao()));
                } else if (pagamento.getSelecionarPensaoAlimenticia().booleanValue() && !pagamento.getApurarPensaoAlimenticia().booleanValue()) {
                    debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setPagoPensao(pagamento.getValorParaRecolhimentoDebitosReclamantePensaoAlimenticia());
                }
                debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setJaCalculadoUmaVez(true);
            } else {
                BigDecimal devidoJurosPensao;
                BigDecimal devidoPensao = debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getDevidoCalculadaRemanescente(debitosDoReclamante.getIndiceDeCorrecao());
                if (Utils.nulo(devidoPensao)) {
                    devidoPensao = BigDecimal.ZERO;
                }
                BigDecimal percentualPrincipalPensao = debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPercentualPrincipal();
                BigDecimal percentualFgtsPensao = debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPercentualFgts();
                BigDecimal bigDecimal = devidoJurosPensao = debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getIncidirSobreJuros() != false ? debitosDoReclamante.getCreditosDoReclamante().getDevidoPensaoSobreJurosDoPeriodo(this.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getAliquota().divide(Utils.CEM), percentualPrincipalPensao, percentualFgtsPensao) : BigDecimal.ZERO;
                if (Utils.nulo(devidoJurosPensao)) {
                    devidoJurosPensao = BigDecimal.ZERO;
                }
                BigDecimal totalDevido = Utils.somar(devidoPensao, devidoJurosPensao);
                BigDecimal valorARecolher = BigDecimal.ZERO;
                if (pagamento.getSelecionarPensaoAlimenticia().booleanValue() && pagamento.getApurarPensaoAlimenticia().booleanValue()) {
                    valorARecolher = pagamento.apurarRecolhimentoDoReclamante(totalDevido);
                } else if (pagamento.getSelecionarPensaoAlimenticia().booleanValue() && !pagamento.getApurarPensaoAlimenticia().booleanValue()) {
                    valorARecolher = pagamento.getValorParaRecolhimentoDebitosReclamantePensaoAlimenticia();
                }
                if (pagamento.getPriorizarPagamentoDeJuros().booleanValue()) {
                    if (valorARecolher.compareTo(devidoJurosPensao) >= 0) {
                        debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setPagoPensao(Utils.subtrair(valorARecolher, devidoJurosPensao));
                        debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setPagoJuro(devidoJurosPensao);
                    } else {
                        debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setPagoPensao(BigDecimal.ZERO);
                        debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setPagoJuro(valorARecolher);
                    }
                } else {
                    BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorARecolher, new BigDecimal[]{devidoPensao, devidoJurosPensao});
                    debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setPagoPensao(valoresRateados[0]);
                    debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setPagoJuro(valoresRateados[1]);
                }
                debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setJaCalculadoUmaVez(true);
            }
        }
        Set<MultaDoPagamento> multasPagamento = pagamento.getMultasDevidasTerceiros();
        HashMap<Multa, MultaDoPagamento> mapaMultasDoPagamento = new HashMap<Multa, MultaDoPagamento>();
        for (MultaDoPagamento multaPagamento : multasPagamento) {
            mapaMultasDoPagamento.put(multaPagamento.getMulta(), multaPagamento);
        }
        for (MultaDaAtualizacao multaAnterior : debitosDoReclamante.getMultasCalculadas()) {
            multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            selecionadaParaPagar2 = Boolean.FALSE;
            pagamentoDeveSerApurado2 = Boolean.FALSE;
            valorParaPagarMulta = BigDecimal.ZERO;
            if (mapaMultasDoPagamento.containsKey(multaAnterior.getMulta())) {
                selecionadaParaPagar2 = Boolean.TRUE;
                if (((MultaDoPagamento)mapaMultasDoPagamento.get(multaAnterior.getMulta())).getApurarMulta().booleanValue()) {
                    pagamentoDeveSerApurado2 = Boolean.TRUE;
                }
            }
            if (multaAnterior.getValorRemanescenteMulta() == null || debitosDoReclamante.getDataFinalPeriodo().equals(multaAnterior.getMulta().getDataEvento()) && debitosDoReclamante.getDataInicialPeriodo().equals(debitosDoReclamante.getDataFinalPeriodo()) || debitosDoReclamante.getDataInicialPeriodo().equals(debitosDoReclamante.getCalculo().getDataDeLiquidacao()) && !multaAnterior.getJaCalculadoUmaVez().booleanValue()) {
                if (selecionadaParaPagar2.booleanValue() && !pagamentoDeveSerApurado2.booleanValue()) {
                    valorParaPagarMulta = pagamento.getValoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros().get(multaAnterior.getMulta());
                } else if (selecionadaParaPagar2.booleanValue() && pagamentoDeveSerApurado2.booleanValue()) {
                    valorParaPagarMulta = pagamento.apurarRecolhimentoMultaDoReclamante(multaAnterior.getDevidoCalculada());
                }
                multaAnterior.setPagoMulta(valorParaPagarMulta);
                multaAnterior.setPagoJuro(BigDecimal.ZERO);
            } else {
                BigDecimal devidoJuros;
                BigDecimal valorDevidoMulta = multaAnterior.getDevidoCalculadaRemanescente(multaAnterior.getIndiceDeCorrecao());
                if (Utils.nulo(valorDevidoMulta)) {
                    valorDevidoMulta = BigDecimal.ZERO;
                }
                BigDecimal bigDecimal = devidoJuros = multaAnterior.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : debitosDoReclamante.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM));
                if (Utils.nulo(devidoJuros)) {
                    devidoJuros = BigDecimal.ZERO;
                }
                BigDecimal totalDevidoMulta = Utils.somar(devidoJuros, valorDevidoMulta);
                if (selecionadaParaPagar2.booleanValue() && !pagamentoDeveSerApurado2.booleanValue()) {
                    valorParaPagarMulta = pagamento.getValoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros().get(multaAnterior.getMulta());
                } else if (selecionadaParaPagar2.booleanValue() && pagamentoDeveSerApurado2.booleanValue()) {
                    valorParaPagarMulta = pagamento.apurarRecolhimentoMultaDoReclamante(totalDevidoMulta);
                }
                if (pagamento.getPriorizarPagamentoDeJuros().booleanValue()) {
                    if (valorParaPagarMulta.compareTo(devidoJuros) >= 0) {
                        multaAnterior.setPagoMulta(Utils.subtrair(valorParaPagarMulta, devidoJuros));
                        multaAnterior.setPagoJuro(devidoJuros);
                    } else {
                        multaAnterior.setPagoMulta(BigDecimal.ZERO);
                        multaAnterior.setPagoJuro(valorParaPagarMulta);
                    }
                } else {
                    BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorParaPagarMulta, new BigDecimal[]{valorDevidoMulta, devidoJuros});
                    multaAnterior.setPagoMulta(valoresRateados[0]);
                    multaAnterior.setPagoJuro(valoresRateados[1]);
                }
            }
            if (valorParaPagarMulta.compareTo(BigDecimal.ZERO) == 0) continue;
            multaAnterior.setJaCalculadoUmaVez(true);
        }
        for (MultaDaAtualizacao multaAnterior : debitosDoReclamante.getMultasInformadas()) {
            selecionadaParaPagar2 = Boolean.FALSE;
            pagamentoDeveSerApurado2 = Boolean.FALSE;
            valorParaPagarMulta = BigDecimal.ZERO;
            if (mapaMultasDoPagamento.containsKey(multaAnterior.getMulta())) {
                selecionadaParaPagar2 = Boolean.TRUE;
                if (((MultaDoPagamento)mapaMultasDoPagamento.get(multaAnterior.getMulta())).getApurarMulta().booleanValue()) {
                    pagamentoDeveSerApurado2 = Boolean.TRUE;
                }
            }
            BigDecimal valorMulta = Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao()));
            BigDecimal valorJuros = BigDecimal.ZERO;
            BigDecimal valorJurosPeriodoAtual = BigDecimal.ZERO;
            BigDecimal totalDevidoMulta = valorMulta;
            if (!debitosDoReclamante.getDataFinalPeriodo().equals(multaAnterior.getMulta().getDataEvento())) {
                BigDecimal base;
                valorJuros = Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorJuros(), multaAnterior.getIndiceDeCorrecao()));
                if (Utils.nulo(valorJuros)) {
                    valorJuros = BigDecimal.ZERO;
                }
                BigDecimal bigDecimal = base = multaAnterior.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                if (Utils.nulo(base)) {
                    base = BigDecimal.ZERO;
                }
                BigDecimal taxaDeJurosMulta = multaAnterior.getTaxaJurosMulta() != null ? multaAnterior.getTaxaJurosMulta() : debitosDoReclamante.getTaxaDeJuros();
                valorJurosPeriodoAtual = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosMulta.divide(Utils.CEM)));
                totalDevidoMulta = Utils.somar(totalDevidoMulta, valorJuros);
                totalDevidoMulta = Utils.somar(totalDevidoMulta, valorJurosPeriodoAtual);
                if (selecionadaParaPagar2.booleanValue() && !pagamentoDeveSerApurado2.booleanValue()) {
                    valorParaPagarMulta = pagamento.getValoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros().get(multaAnterior.getMulta());
                } else if (selecionadaParaPagar2.booleanValue() && pagamentoDeveSerApurado2.booleanValue()) {
                    valorParaPagarMulta = pagamento.apurarRecolhimentoMultaDoReclamante(totalDevidoMulta);
                }
                if (pagamento.getPriorizarPagamentoDeJuros().booleanValue()) {
                    BigDecimal totalDevidoJuros = Utils.somar(valorJuros, valorJurosPeriodoAtual);
                    if (valorParaPagarMulta.compareTo(totalDevidoJuros) >= 0) {
                        multaAnterior.setPagoMulta(Utils.subtrair(valorParaPagarMulta, totalDevidoJuros));
                        multaAnterior.setPagoJuro(valorJuros);
                        multaAnterior.setPagoJuroPeriodoAtual(valorJurosPeriodoAtual);
                        continue;
                    }
                    multaAnterior.setPagoMulta(BigDecimal.ZERO);
                    BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorParaPagarMulta, new BigDecimal[]{valorJuros, valorJurosPeriodoAtual});
                    multaAnterior.setPagoJuro(valoresRateados[0]);
                    multaAnterior.setPagoJuroPeriodoAtual(valoresRateados[1]);
                    continue;
                }
                if (totalDevidoMulta.compareTo(valorParaPagarMulta) < 0) {
                    multaAnterior.setPagoJuro(valorJuros);
                    multaAnterior.setPagoJuroPeriodoAtual(valorJurosPeriodoAtual);
                    multaAnterior.setPagoMulta(Utils.subtrair(Utils.subtrair(valorParaPagarMulta, valorJuros), valorJurosPeriodoAtual));
                    continue;
                }
                BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorParaPagarMulta, new BigDecimal[]{valorMulta, valorJuros, valorJurosPeriodoAtual});
                multaAnterior.setPagoMulta(valoresRateados[0]);
                multaAnterior.setPagoJuro(valoresRateados[1]);
                multaAnterior.setPagoJuroPeriodoAtual(valoresRateados[2]);
                continue;
            }
            if (selecionadaParaPagar2.booleanValue() && !pagamentoDeveSerApurado2.booleanValue()) {
                valorParaPagarMulta = pagamento.getValoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros().get(multaAnterior.getMulta());
            } else if (selecionadaParaPagar2.booleanValue() && pagamentoDeveSerApurado2.booleanValue()) {
                valorParaPagarMulta = pagamento.apurarRecolhimentoMultaDoReclamante(totalDevidoMulta);
            }
            multaAnterior.setPagoMulta(valorParaPagarMulta);
            multaAnterior.setPagoJuro(BigDecimal.ZERO);
            multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
        }
        Set<HonorarioDoPagamento> honorariosPagamento = pagamento.getHonorariosBrutosDevidosReclamante();
        HashMap<Honorario, HonorarioDoPagamento> mapaHonorariosDoPagamento = new HashMap<Honorario, HonorarioDoPagamento>();
        for (HonorarioDoPagamento honorarioPagamento : honorariosPagamento) {
            mapaHonorariosDoPagamento.put(honorarioPagamento.getHonorario(), honorarioPagamento);
        }
        for (HonorarioDaAtualizacao honorarioDaAtualizacaoAnterior : debitosDoReclamante.getHonorariosDaAtualizacaoCalculado()) {
            selecionadaParaPagar = Boolean.FALSE;
            pagamentoDeveSerApurado = Boolean.FALSE;
            valorParaPagarHonorario = BigDecimal.ZERO;
            if (mapaHonorariosDoPagamento.containsKey(honorarioDaAtualizacaoAnterior.getHonorario())) {
                selecionadaParaPagar = Boolean.TRUE;
                if (((HonorarioDoPagamento)mapaHonorariosDoPagamento.get(honorarioDaAtualizacaoAnterior.getHonorario())).getApurarHonorario().booleanValue()) {
                    pagamentoDeveSerApurado = Boolean.TRUE;
                }
            }
            honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            if (honorarioDaAtualizacaoAnterior.getValorRemanescenteHonorario() == null || debitosDoReclamante.getDataFinalPeriodo().equals(honorarioDaAtualizacaoAnterior.getHonorario().getDataEvento()) && debitosDoReclamante.getDataInicialPeriodo().equals(debitosDoReclamante.getDataFinalPeriodo()) || debitosDoReclamante.getDataInicialPeriodo().equals(debitosDoReclamante.getCalculo().getDataDeLiquidacao()) && !honorarioDaAtualizacaoAnterior.getJaCalculadoUmaVez().booleanValue()) {
                if (selecionadaParaPagar.booleanValue() && !pagamentoDeveSerApurado.booleanValue()) {
                    valorParaPagarHonorario = pagamento.getValoresParaRecolhimentoDebitosReclamanteDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario());
                } else if (selecionadaParaPagar.booleanValue() && pagamentoDeveSerApurado.booleanValue()) {
                    valorParaPagarHonorario = pagamento.apurarRecolhimentoOutrosDoReclamante(honorarioDaAtualizacaoAnterior.getDevidoCalculada());
                }
                honorarioDaAtualizacaoAnterior.setPagoHonorario(valorParaPagarHonorario);
                honorarioDaAtualizacaoAnterior.setPagoJuro(BigDecimal.ZERO);
                honorarioDaAtualizacaoAnterior.setPagoSobreMultas(BigDecimal.ZERO);
            } else {
                BigDecimal valorSobreMulta;
                BigDecimal devidoJuros;
                BigDecimal valorDevidoHonorario = honorarioDaAtualizacaoAnterior.getDevidoCalculadaRemanescente(honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao());
                if (Utils.nulo(valorDevidoHonorario)) {
                    valorDevidoHonorario = BigDecimal.ZERO;
                }
                if (Utils.nulo(devidoJuros = debitosDoReclamante.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacaoAnterior.getHonorario().getAliquota().divide(Utils.CEM)))) {
                    devidoJuros = BigDecimal.ZERO;
                }
                if (Utils.nulo(valorSobreMulta = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.calcularHonorariosSobreMultas(debitosDoReclamante.getCreditosDoReclamante()), honorarioDaAtualizacaoAnterior.getHonorario().getAliquota().divide(Utils.CEM))))) {
                    valorSobreMulta = BigDecimal.ZERO;
                }
                BigDecimal totalDevidoHonorario = Utils.somar(valorDevidoHonorario, valorSobreMulta);
                totalDevidoHonorarioEJuros = Utils.somar(totalDevidoHonorario, devidoJuros);
                BigDecimal totalSobreJuros = Utils.somar(devidoJuros, valorSobreMulta);
                if (selecionadaParaPagar.booleanValue() && !pagamentoDeveSerApurado.booleanValue()) {
                    valorParaPagarHonorario = pagamento.getValoresParaRecolhimentoDebitosReclamanteDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario());
                } else if (selecionadaParaPagar.booleanValue() && pagamentoDeveSerApurado.booleanValue()) {
                    valorParaPagarHonorario = pagamento.apurarRecolhimentoOutrosDoReclamante(totalDevidoHonorarioEJuros);
                }
                BigDecimal[] valoresRateados = null;
                if (BigDecimal.ZERO.compareTo(valorDevidoHonorario) > 0 && BigDecimal.ZERO.compareTo(totalSobreJuros) < 0) {
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(Utils.zerarSeNegativo(Utils.subtrair(valorParaPagarHonorario, totalSobreJuros)));
                    valoresRateados = PagamentoUtils.ratearValor(Utils.subtrair(valorParaPagarHonorario, honorarioDaAtualizacaoAnterior.getPagoHonorario()), new BigDecimal[]{devidoJuros, valorSobreMulta});
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valoresRateados[0]);
                    honorarioDaAtualizacaoAnterior.setPagoSobreMultas(valoresRateados[1]);
                } else if (totalDevidoHonorarioEJuros.compareTo(valorParaPagarHonorario) < 0) {
                    honorarioDaAtualizacaoAnterior.setPagoJuro(devidoJuros);
                    honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(valorSobreMulta);
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(Utils.subtrair(Utils.subtrair(valorParaPagarHonorario, devidoJuros), valorSobreMulta));
                } else {
                    valoresRateados = PagamentoUtils.ratearValor(valorParaPagarHonorario, new BigDecimal[]{valorDevidoHonorario, devidoJuros, valorSobreMulta});
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(valoresRateados[0]);
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valoresRateados[1]);
                    honorarioDaAtualizacaoAnterior.setPagoSobreMultas(valoresRateados[2]);
                }
            }
            if (valorParaPagarHonorario.compareTo(BigDecimal.ZERO) != 0) {
                honorarioDaAtualizacaoAnterior.setJaCalculadoUmaVez(true);
            }
            honorarioDaAtualizacaoAnterior = MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioDaAtualizacaoAnterior, pagamento.getDataPagamento());
        }
        for (HonorarioDaAtualizacao honorarioDaAtualizacaoAnterior : debitosDoReclamante.getHonorariosDaAtualizacaoInformado()) {
            selecionadaParaPagar = Boolean.FALSE;
            pagamentoDeveSerApurado = Boolean.FALSE;
            valorParaPagarHonorario = BigDecimal.ZERO;
            if (mapaHonorariosDoPagamento.containsKey(honorarioDaAtualizacaoAnterior.getHonorario())) {
                selecionadaParaPagar = Boolean.TRUE;
                if (((HonorarioDoPagamento)mapaHonorariosDoPagamento.get(honorarioDaAtualizacaoAnterior.getHonorario())).getApurarHonorario().booleanValue()) {
                    pagamentoDeveSerApurado = Boolean.TRUE;
                }
            }
            BigDecimal valorHonorario = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorHonorario(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao()));
            BigDecimal valorJuros = BigDecimal.ZERO;
            BigDecimal valorJurosPeriodoAtual = BigDecimal.ZERO;
            BigDecimal valorImpostoRenda = BigDecimal.ZERO;
            totalDevidoHonorarioEJuros = valorHonorario;
            if (!debitosDoReclamante.getDataFinalPeriodo().equals(honorarioDaAtualizacaoAnterior.getHonorario().getDataEvento())) {
                BigDecimal[] valoresRateados;
                BigDecimal base;
                valorJuros = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorJuros(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao()));
                if (Utils.nulo(valorJuros)) {
                    valorJuros = BigDecimal.ZERO;
                }
                BigDecimal bigDecimal = base = honorarioDaAtualizacaoAnterior.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorHonorario(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                if (Utils.nulo(base)) {
                    base = BigDecimal.ZERO;
                }
                BigDecimal taxaDeJurosMulta = honorarioDaAtualizacaoAnterior.getTaxaJurosHonorario() != null ? honorarioDaAtualizacaoAnterior.getTaxaJurosHonorario() : debitosDoReclamante.getTaxaDeJuros();
                valorJurosPeriodoAtual = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosMulta.divide(Utils.CEM)));
                totalDevidoHonorarioEJuros = Utils.somar(totalDevidoHonorarioEJuros, valorJuros);
                totalDevidoHonorarioEJuros = Utils.somar(totalDevidoHonorarioEJuros, valorJurosPeriodoAtual);
                if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                    valorImpostoRenda = Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorImpostoRenda(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao());
                    totalDevidoHonorarioEJuros = Utils.somar(totalDevidoHonorarioEJuros, valorImpostoRenda, totalDevidoHonorarioEJuros);
                }
                if (selecionadaParaPagar.booleanValue() && !pagamentoDeveSerApurado.booleanValue()) {
                    valorParaPagarHonorario = pagamento.getValoresParaRecolhimentoDebitosReclamanteDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario());
                } else if (selecionadaParaPagar.booleanValue() && pagamentoDeveSerApurado.booleanValue()) {
                    valorParaPagarHonorario = pagamento.apurarRecolhimentoOutrosDoReclamante(totalDevidoHonorarioEJuros);
                }
                if (pagamento.getPriorizarPagamentoDeJuros().booleanValue()) {
                    BigDecimal[] valoresRateados2;
                    BigDecimal totalDevidoJuros = Utils.somar(valorJuros, valorJurosPeriodoAtual);
                    if (valorParaPagarHonorario.compareTo(totalDevidoJuros) >= 0) {
                        if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                            valoresRateados2 = PagamentoUtils.ratearValor(Utils.subtrair(valorParaPagarHonorario, totalDevidoJuros), new BigDecimal[]{valorHonorario, valorImpostoRenda});
                            honorarioDaAtualizacaoAnterior.setPagoHonorario(valoresRateados2[0]);
                            honorarioDaAtualizacaoAnterior.setPagoImpostoRenda(valoresRateados2[1]);
                        } else {
                            honorarioDaAtualizacaoAnterior.setPagoHonorario(Utils.subtrair(valorParaPagarHonorario, totalDevidoJuros));
                        }
                        honorarioDaAtualizacaoAnterior.setPagoJuro(valorJuros);
                        honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(valorJurosPeriodoAtual);
                    } else {
                        honorarioDaAtualizacaoAnterior.setPagoHonorario(BigDecimal.ZERO);
                        valoresRateados2 = PagamentoUtils.ratearValor(valorParaPagarHonorario, new BigDecimal[]{valorJuros, valorJurosPeriodoAtual});
                        honorarioDaAtualizacaoAnterior.setPagoJuro(valoresRateados2[0]);
                        honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(valoresRateados2[1]);
                    }
                } else if (totalDevidoHonorarioEJuros.compareTo(valorParaPagarHonorario) < 0) {
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valorJuros);
                    honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(valorJurosPeriodoAtual);
                    BigDecimal pagoImposto = this.getAtualizacao().getAtualizarRegraPrecatorio() != false ? valorImpostoRenda : BigDecimal.ZERO;
                    honorarioDaAtualizacaoAnterior.setPagoImpostoRenda(pagoImposto);
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(Utils.subtrair(Utils.subtrair(Utils.subtrair(valorParaPagarHonorario, valorJuros), valorJurosPeriodoAtual), pagoImposto));
                } else if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                    valoresRateados = PagamentoUtils.ratearValor(valorParaPagarHonorario, new BigDecimal[]{valorHonorario, valorJuros, valorJurosPeriodoAtual, valorImpostoRenda});
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(valoresRateados[0]);
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valoresRateados[1]);
                    honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(valoresRateados[2]);
                    honorarioDaAtualizacaoAnterior.setPagoImpostoRenda(valoresRateados[3]);
                } else {
                    valoresRateados = PagamentoUtils.ratearValor(valorParaPagarHonorario, new BigDecimal[]{valorHonorario, valorJuros, valorJurosPeriodoAtual});
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(valoresRateados[0]);
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valoresRateados[1]);
                    honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(valoresRateados[2]);
                }
            } else {
                if (selecionadaParaPagar.booleanValue() && !pagamentoDeveSerApurado.booleanValue()) {
                    valorParaPagarHonorario = pagamento.getValoresParaRecolhimentoDebitosReclamanteDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario());
                } else if (selecionadaParaPagar.booleanValue() && pagamentoDeveSerApurado.booleanValue()) {
                    valorParaPagarHonorario = pagamento.apurarRecolhimentoOutrosDoReclamante(totalDevidoHonorarioEJuros);
                }
                honorarioDaAtualizacaoAnterior.setPagoHonorario(valorParaPagarHonorario);
                honorarioDaAtualizacaoAnterior.setPagoJuro(BigDecimal.ZERO);
                honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            }
            if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) continue;
            honorarioDaAtualizacaoAnterior = MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioDaAtualizacaoAnterior, pagamento.getDataPagamento());
        }
        return debitosDoReclamante;
    }

    private void recolherDepositoFgts(DebitosDoReclamante debitosDoReclamante, Pagamento pagamento, BigDecimal valorParaRecolhimentoFgts) {
        if (BigDecimal.ZERO.compareTo(valorParaRecolhimentoFgts) >= 0) {
            debitosDoReclamante.setPagoFgts(BigDecimal.ZERO);
            debitosDoReclamante.setPagoJuroDeMoraFgts(BigDecimal.ZERO);
            debitosDoReclamante.setPagoJuroDeMoraFgtsPeriodoAtual(BigDecimal.ZERO);
            return;
        }
        if (pagamento.getPriorizarPagamentoDeJuros().booleanValue()) {
            BigDecimal jurosDepositoFgts = BigDecimal.ZERO;
            jurosDepositoFgts = Utils.somar(jurosDepositoFgts, debitosDoReclamante.getDevidoJuroDeMoraFgts(), jurosDepositoFgts);
            if (valorParaRecolhimentoFgts.compareTo(jurosDepositoFgts = Utils.somar(jurosDepositoFgts, debitosDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual(), jurosDepositoFgts)) >= 0) {
                BigDecimal pagoFgts = Utils.subtrair(valorParaRecolhimentoFgts, jurosDepositoFgts);
                if (pagamento.getApurarValorFgts().booleanValue() && pagoFgts.compareTo(debitosDoReclamante.getDevidoFgts()) > 0) {
                    pagoFgts = debitosDoReclamante.getDevidoFgts();
                }
                debitosDoReclamante.setPagoFgts(pagoFgts);
                debitosDoReclamante.setPagoJuroDeMoraFgts(debitosDoReclamante.getDevidoJuroDeMoraFgts());
                debitosDoReclamante.setPagoJuroDeMoraFgtsPeriodoAtual(debitosDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual());
            } else {
                BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorParaRecolhimentoFgts, new BigDecimal[]{debitosDoReclamante.getDevidoJuroDeMoraFgts(), debitosDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual()});
                debitosDoReclamante.setPagoFgts(BigDecimal.ZERO);
                debitosDoReclamante.setPagoJuroDeMoraFgts(valoresRateados[0]);
                debitosDoReclamante.setPagoJuroDeMoraFgtsPeriodoAtual(valoresRateados[1]);
            }
        } else {
            BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorParaRecolhimentoFgts, new BigDecimal[]{debitosDoReclamante.getDevidoFgts(), debitosDoReclamante.getDevidoJuroDeMoraFgts(), debitosDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual()});
            BigDecimal saldoJuroDeMoraFgts = BigDecimal.ZERO;
            saldoJuroDeMoraFgts = Utils.somar(saldoJuroDeMoraFgts, debitosDoReclamante.getDevidoJuroDeMoraFgts(), saldoJuroDeMoraFgts);
            if (BigDecimal.ZERO.compareTo(saldoJuroDeMoraFgts = Utils.subtrair(saldoJuroDeMoraFgts, valoresRateados[1], saldoJuroDeMoraFgts)) > 0) {
                valoresRateados[0] = Utils.somar(valoresRateados[0], saldoJuroDeMoraFgts.abs(), valoresRateados[0]);
                valoresRateados[1] = Utils.subtrair(valoresRateados[1], saldoJuroDeMoraFgts.abs(), valoresRateados[1]);
            }
            BigDecimal saldoJuroDeMoraFgtsPeriodoAtual = BigDecimal.ZERO;
            saldoJuroDeMoraFgtsPeriodoAtual = Utils.somar(saldoJuroDeMoraFgtsPeriodoAtual, debitosDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual(), saldoJuroDeMoraFgtsPeriodoAtual);
            if (BigDecimal.ZERO.compareTo(saldoJuroDeMoraFgtsPeriodoAtual = Utils.subtrair(saldoJuroDeMoraFgtsPeriodoAtual, valoresRateados[2], saldoJuroDeMoraFgtsPeriodoAtual)) > 0) {
                valoresRateados[0] = Utils.somar(valoresRateados[0], saldoJuroDeMoraFgtsPeriodoAtual.abs(), valoresRateados[0]);
                valoresRateados[2] = Utils.subtrair(valoresRateados[2], saldoJuroDeMoraFgtsPeriodoAtual.abs(), valoresRateados[2]);
            }
            BigDecimal pagoFgts = valoresRateados[0];
            if (pagamento.getApurarValorFgts().booleanValue() && BigDecimal.ZERO.compareTo(debitosDoReclamante.getDevidoFgts()) <= 0 && pagoFgts.compareTo(debitosDoReclamante.getDevidoFgts()) > 0) {
                pagoFgts = debitosDoReclamante.getDevidoFgts();
            }
            debitosDoReclamante.setPagoFgts(pagoFgts);
            debitosDoReclamante.setPagoJuroDeMoraFgts(valoresRateados[1]);
            debitosDoReclamante.setPagoJuroDeMoraFgtsPeriodoAtual(valoresRateados[2]);
        }
    }

    public DebitosDoReclamante incluirPensao(DebitosDoReclamante debitosDoReclamante, PensaoAlimenticia pensaoDoEvento) {
        if (pensaoDoEvento != null && TipoOrigemRegistroEnum.ATUALIZACAO.equals((Object)pensaoDoEvento.getOrigemRegistro()) && pensaoDoEvento.getApurarPensaoAlimenticia().booleanValue()) {
            PensaoAlimenticiaDaAtualizacao pensaoDaAtualizacao = new PensaoAlimenticiaDaAtualizacao();
            pensaoDaAtualizacao.setPensaoAlimenticia(pensaoDoEvento);
            pensaoDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
            pensaoDaAtualizacao.setPercentualPrincipal(this.pensaoAlimenticiaDaAtualizacao.getPercentualPrincipal());
            pensaoDaAtualizacao.setPercentualFgts(this.pensaoAlimenticiaDaAtualizacao.getPercentualFgts());
            pensaoDaAtualizacao.setValorPensao(pensaoDaAtualizacao.getTotalPensao(debitosDoReclamante.getCreditosDoReclamante(), this.getCalculo()));
            pensaoDaAtualizacao.setJaCalculadoUmaVez(this.getAtualizacao().getBasePensaoJaPaga());
            pensaoDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            pensaoDaAtualizacao.setPagoPensao(BigDecimal.ZERO);
            debitosDoReclamante.setPensaoAlimenticiaDaAtualizacao(pensaoDaAtualizacao);
        }
        return debitosDoReclamante;
    }

    public DebitosDoReclamante incluirMulta(DebitosDoReclamante debitosDoReclamante, CreditosDoReclamante creditoDoReclamantePagamento, CreditosDoReclamante creditoDoReclamantePagamentoAnterior, Multa multaDoEvento) {
        if (multaDoEvento.getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) && TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)multaDoEvento.getTipoCobrancaReclamante())) {
            if (TipoValorEnum.CALCULADO.equals((Object)multaDoEvento.getTipoValorDaMulta())) {
                MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
                multaDaAtualizacao.setMulta(multaDoEvento);
                multaDaAtualizacao.setTipoVinculo(multaDoEvento.getTipoCredorDevedor());
                multaDaAtualizacao.setTipoValorDaMulta(multaDoEvento.getTipoValorDaMulta());
                multaDaAtualizacao.setValorMulta(multaDaAtualizacao.calcularValorDaMultaCalculadaOutros(creditoDoReclamantePagamento, creditoDoReclamantePagamentoAnterior, null, BigDecimal.ONE, this.getPrevidenciaPrivadaCorrigido(), this.getDescontoInssCorrigido(), debitosDoReclamante.getDataFinalPeriodo()));
                multaDaAtualizacao.setJaCalculadoUmaVez(this.getAtualizacao().getBaseMultaJaPaga());
                multaDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
                multaDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
                multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
                debitosDoReclamante.getMultasCalculadas().add(multaDaAtualizacao);
            } else {
                MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
                multaDaAtualizacao.setMulta(multaDoEvento);
                multaDaAtualizacao.setTipoVinculo(multaDoEvento.getTipoCredorDevedor());
                multaDaAtualizacao.setTipoValorDaMulta(multaDoEvento.getTipoValorDaMulta());
                multaDaAtualizacao.setValorMulta(multaDoEvento.getValorMulta());
                multaDaAtualizacao.setTaxaJurosMulta(Utils.arredondarValor(this.calcularTaxaJuros(debitosDoReclamante.getDataFinalPeriodo(), multaDoEvento, null), 4));
                multaDaAtualizacao.setValorJuros(BigDecimal.ZERO);
                multaDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
                multaDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
                multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
                multaDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
                debitosDoReclamante.getMultasInformadas().add(multaDaAtualizacao);
            }
        }
        return debitosDoReclamante;
    }

    private BigDecimal calcularTaxaJuros(Date dataFinalPeriodo, Multa multaDoEvento, Honorario honorarioDoEvento) {
        if (multaDoEvento != null && multaDoEvento.getAplicarJurosSobreMulta().booleanValue() && Utils.naoNulo(multaDoEvento.getDataApartirDeAplicarJuros())) {
            return this.calcularTaxaDeJuros(multaDoEvento.getDataApartirDeAplicarJuros(), dataFinalPeriodo, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
        }
        if (honorarioDoEvento != null && honorarioDoEvento.getAplicarJuros().booleanValue() && Utils.naoNulo(honorarioDoEvento.getDataApartirDeAplicarJuros())) {
            return this.calcularTaxaDeJuros(honorarioDoEvento.getDataApartirDeAplicarJuros(), dataFinalPeriodo, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
        }
        return null;
    }

    public DebitosDoReclamante incluirHonorario(DebitosDoReclamante debitosDoReclamante, CreditosDoReclamante creditoDoReclamante, CreditosDoReclamante creditoDoReclamanteAnterior, Honorario honorarioDoEvento) {
        if (TipoDeDevedorDoHonorarioEnum.RECLAMANTE.equals((Object)honorarioDoEvento.getTipoDeDevedor()) && TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)honorarioDoEvento.getTipoCobrancaReclamante())) {
            HonorarioDaAtualizacao honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
            honorarioDaAtualizacao.setHonorario(honorarioDoEvento);
            honorarioDaAtualizacao.setTipoVinculo(TipoVinculoDeHonorarioDoPagamentoEnum.DEBITOSRECLAMANTE);
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
            if (TipoValorEnum.CALCULADO.equals((Object)honorarioDoEvento.getTipoValor())) {
                honorarioDaAtualizacao.setTipoValor(TipoValorEnum.CALCULADO);
                honorarioDaAtualizacao.setValorHonorario(honorarioDaAtualizacao.calcularValorDoHonorarioCalculado(creditoDoReclamante, creditoDoReclamanteAnterior, null, BigDecimal.ONE, debitosDoReclamante.getPrevidenciaPrivadaCorrigido(), debitosDoReclamante.getDescontoInssCorrigido()));
                debitosDoReclamante.getHonorariosDaAtualizacaoCalculado().add(honorarioDaAtualizacao);
            } else {
                honorarioDaAtualizacao.setTipoValor(TipoValorEnum.INFORMADO);
                honorarioDaAtualizacao.setValorHonorario(honorarioDoEvento.getValor());
                honorarioDaAtualizacao.setTaxaJurosHonorario(Utils.arredondarValor(this.calcularTaxaJuros(debitosDoReclamante.getDataFinalPeriodo(), null, honorarioDoEvento), 4));
                honorarioDaAtualizacao.setValorJuros(BigDecimal.ZERO);
                honorarioDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
                debitosDoReclamante.getHonorariosDaAtualizacaoInformado().add(honorarioDaAtualizacao);
            }
            honorarioDaAtualizacao.setJaCalculadoUmaVez(this.getAtualizacao().getBaseHonorarioJaPaga());
        }
        return debitosDoReclamante;
    }

    public BigDecimal calcularTotalDevido() {
        BigDecimal dev;
        BigDecimal base;
        BigDecimal devido;
        BigDecimal totalDevido = BigDecimal.ZERO;
        for (MultaDaAtualizacao multaDaAtualizacao : this.getMultasCalculadas()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)multaDaAtualizacao.getMulta().getTipoCobrancaReclamante())) continue;
            if (Utils.nulo(multaDaAtualizacao.getValorRemanescenteMulta()) || this.getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multaDaAtualizacao.getJaCalculadoUmaVez().booleanValue()) {
                totalDevido = Utils.somar(totalDevido, multaDaAtualizacao.getDevidoCalculada(), totalDevido);
                continue;
            }
            totalDevido = Utils.somar(totalDevido, multaDaAtualizacao.getDevidoCalculadaRemanescente(multaDaAtualizacao.getIndiceDeCorrecao()), totalDevido);
            totalDevido = Utils.somar(totalDevido, multaDaAtualizacao.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaDaAtualizacao.getMulta().getAliquotaMulta().divide(Utils.CEM)), totalDevido);
        }
        for (MultaDaAtualizacao multaDaAtualizacao : this.getMultasInformadas()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)multaDaAtualizacao.getMulta().getTipoCobrancaReclamante())) continue;
            totalDevido = Utils.somar(totalDevido, Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao())), totalDevido);
            if (!this.podeCalcularJurosDeMulta(multaDaAtualizacao.getMulta())) continue;
            devido = BigDecimal.ZERO;
            if (multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorJuros(), multaDaAtualizacao.getIndiceDeCorrecao()));
            }
            totalDevido = Utils.somar(totalDevido, devido, totalDevido);
            base = multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false && BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaDaAtualizacao.getTaxaJurosMulta().divide(Utils.CEM)));
            totalDevido = Utils.somar(totalDevido, dev, totalDevido);
        }
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : this.getHonorariosDaAtualizacaoCalculado()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)honorarioDaAtualizacao.getHonorario().getTipoCobrancaReclamante())) continue;
            if (Utils.nulo(honorarioDaAtualizacao.getValorRemanescenteHonorario()) || this.getDataFinalPeriodo().equals(honorarioDaAtualizacao.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !honorarioDaAtualizacao.getJaCalculadoUmaVez().booleanValue()) {
                totalDevido = Utils.somar(totalDevido, honorarioDaAtualizacao.getDevidoCalculada(), totalDevido);
                continue;
            }
            totalDevido = Utils.somar(totalDevido, honorarioDaAtualizacao.getDevidoCalculadaRemanescente(honorarioDaAtualizacao.getIndiceDeCorrecao()), totalDevido);
            totalDevido = Utils.somar(totalDevido, this.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM)), totalDevido);
            totalDevido = Utils.somar(totalDevido, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.calcularHonorariosSobreMultas(this.getCreditosDoReclamante()), honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), totalDevido);
        }
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : this.getHonorariosDaAtualizacaoInformado()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)honorarioDaAtualizacao.getHonorario().getTipoCobrancaReclamante())) continue;
            totalDevido = Utils.somar(totalDevido, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.getValorHonorario(), honorarioDaAtualizacao.getIndiceDeCorrecao())), totalDevido);
            if (!this.podeCalcularJurosDeHonorario(honorarioDaAtualizacao.getHonorario())) continue;
            devido = BigDecimal.ZERO;
            if (honorarioDaAtualizacao.getHonorario().getAplicarJuros().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.getValorJuros(), honorarioDaAtualizacao.getIndiceDeCorrecao()));
            }
            totalDevido = Utils.somar(totalDevido, devido, totalDevido);
            base = honorarioDaAtualizacao.getHonorario().getAplicarJuros() != false && BigDecimal.ZERO.compareTo(honorarioDaAtualizacao.getValorHonorario()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.getValorHonorario(), honorarioDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, honorarioDaAtualizacao.getTaxaJurosHonorario().divide(Utils.CEM)));
            totalDevido = Utils.somar(totalDevido, dev, totalDevido);
        }
        if (this.getCalculo().getFgts().getDestinoDoFgts().equals((Object)DestinoDoFgtsEnum.DEPOSITAR)) {
            totalDevido = Utils.somar(totalDevido, this.getDevidoFgts(), totalDevido);
            totalDevido = Utils.somar(totalDevido, this.getDevidoJuroDeMoraFgts(), totalDevido);
            totalDevido = Utils.somar(totalDevido, this.getDevidoJuroDeMoraFgtsPeriodoAtual(), totalDevido);
        }
        boolean verbaComIncidenciaInss = false;
        for (VerbaDeCalculo verba : this.getCalculo().getVerbasAtivas()) {
            if (!verba.getIncidenciaINSS().booleanValue() || verba.getOcorrenciasAtivas().isEmpty()) continue;
            verbaComIncidenciaInss = true;
            break;
        }
        if (this.getCalculo().getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && this.getCalculo().getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue() && verbaComIncidenciaInss) {
            totalDevido = Utils.somar(totalDevido, this.getDescontoInssCorrigido(), totalDevido);
        }
        if (this.getCalculo().getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue()) {
            totalDevido = Utils.somar(totalDevido, this.getPrevidenciaPrivadaCorrigido(), totalDevido);
        }
        if (Utils.naoNulo(this.getPensaoAlimenticiaDaAtualizacao()) && (Utils.nulo(this.getPensaoAlimenticiaDaAtualizacao().getValorRemanescente()) || this.getDataFinalPeriodo().equals(this.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataFinalPeriodo().equals(this.getCalculo().getDataDeLiquidacao()))) {
            totalDevido = Utils.somar(totalDevido, this.getPensaoAlimenticiaDaAtualizacao().getDevidoPensao(), totalDevido);
        } else if (Utils.naoNulo(this.getPensaoAlimenticiaDaAtualizacao())) {
            totalDevido = Utils.somar(totalDevido, this.getPensaoAlimenticiaDaAtualizacao().getDevidoCalculadaRemanescente(this.getIndiceDeCorrecao()), totalDevido);
            BigDecimal bigDecimal = this.getPensaoAlimenticiaDaAtualizacao().getPercentualPrincipal();
            BigDecimal percentualFgtsPensao = this.getPensaoAlimenticiaDaAtualizacao().getPercentualFgts();
            totalDevido = Utils.somar(totalDevido, this.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getIncidirSobreJuros() != false ? this.getCreditosDoReclamante().getDevidoPensaoSobreJurosDoPeriodo(this.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getAliquota().divide(Utils.CEM), bigDecimal, percentualFgtsPensao) : BigDecimal.ZERO, totalDevido);
        }
        if (Utils.naoNulo(this.getCustasJudiciaisDaAtualizacao())) {
            totalDevido = Utils.somar(totalDevido, this.getDevidoCustasJudiciais(), totalDevido);
        }
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && !this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            totalDevido = Utils.somar(totalDevido, this.getValorDevidoIrpf(), totalDevido);
        }
        return totalDevido;
    }

    public BigDecimal calcularTotalPago() {
        boolean isEventoNaLiquidacaoNaoCalculadoAnteriormente;
        boolean isPeriodoDeUmDiaNaDataDoEvento;
        BigDecimal totalPago = BigDecimal.ZERO;
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)multaCalculada.getMulta().getTipoCobrancaReclamante())) continue;
            isPeriodoDeUmDiaNaDataDoEvento = this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && multaCalculada.getJaCalculadoUmaVez() == false;
            if (multaCalculada.getValorRemanescenteMulta() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                totalPago = Utils.somar(totalPago, multaCalculada.getPagoMulta(), totalPago);
                continue;
            }
            totalPago = Utils.somar(totalPago, multaCalculada.getPagoMulta(), totalPago);
            totalPago = Utils.somar(totalPago, multaCalculada.getPagoJuro(), totalPago);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)multaInformada.getMulta().getTipoCobrancaReclamante())) continue;
            totalPago = Utils.somar(totalPago, multaInformada.getPagoMulta(), totalPago);
            if (!this.podeCalcularJurosDeMulta(multaInformada.getMulta())) continue;
            totalPago = Utils.somar(totalPago, multaInformada.getPagoJuro(), totalPago);
            totalPago = Utils.somar(totalPago, multaInformada.getPagoJuroPeriodoAtual(), totalPago);
        }
        for (HonorarioDaAtualizacao honorarioCalculado : this.getHonorariosDaAtualizacaoCalculado()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)honorarioCalculado.getHonorario().getTipoCobrancaReclamante())) continue;
            isPeriodoDeUmDiaNaDataDoEvento = this.getDataFinalPeriodo().equals(honorarioCalculado.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && honorarioCalculado.getJaCalculadoUmaVez() == false;
            if (honorarioCalculado.getValorRemanescenteHonorario() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoHonorario(), totalPago);
                continue;
            }
            totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoHonorario(), totalPago);
            totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoJuro(), totalPago);
            totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoSobreMultas(), totalPago);
        }
        for (HonorarioDaAtualizacao honorarioInformado : this.getHonorariosDaAtualizacaoInformado()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)honorarioInformado.getHonorario().getTipoCobrancaReclamante())) continue;
            totalPago = Utils.somar(totalPago, honorarioInformado.getPagoHonorario(), totalPago);
            if (!this.podeCalcularJurosDeHonorario(honorarioInformado.getHonorario())) continue;
            totalPago = Utils.somar(totalPago, honorarioInformado.getPagoJuro(), totalPago);
            totalPago = Utils.somar(totalPago, honorarioInformado.getPagoJuroPeriodoAtual(), totalPago);
        }
        if (this.getCalculo().getFgts().getDestinoDoFgts().equals((Object)DestinoDoFgtsEnum.DEPOSITAR)) {
            totalPago = Utils.somar(totalPago, this.getPagoFgts(), totalPago);
            totalPago = Utils.somar(totalPago, this.getPagoJuroDeMoraFgts(), totalPago);
            totalPago = Utils.somar(totalPago, this.getPagoJuroDeMoraFgtsPeriodoAtual(), totalPago);
        }
        boolean verbaComIncidenciaInss = false;
        for (VerbaDeCalculo verba : this.getCalculo().getVerbasAtivas()) {
            if (!verba.getIncidenciaINSS().booleanValue() || verba.getOcorrenciasAtivas().isEmpty()) continue;
            verbaComIncidenciaInss = true;
            break;
        }
        if (this.getCalculo().getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && this.getCalculo().getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue() && verbaComIncidenciaInss) {
            totalPago = Utils.somar(totalPago, this.getPagoDescontoInss(), totalPago);
        }
        totalPago = Utils.somar(totalPago, this.getCalculo().getPrevidenciaPrivada().getApurarPrevidenciaPrivada() != false ? this.getPagoPrevidenciaPrivada() : BigDecimal.ZERO, totalPago);
        if (Utils.naoNulo(this.getPensaoAlimenticiaDaAtualizacao()) && (Utils.nulo(this.getPensaoAlimenticiaDaAtualizacao().getValorRemanescente()) || this.getDataFinalPeriodo().equals(this.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataFinalPeriodo().equals(this.getCalculo().getDataDeLiquidacao()))) {
            totalPago = Utils.somar(totalPago, this.getPensaoAlimenticiaDaAtualizacao().getPagoPensao(), totalPago);
        } else if (Utils.naoNulo(this.getPensaoAlimenticiaDaAtualizacao())) {
            totalPago = Utils.somar(totalPago, this.getPensaoAlimenticiaDaAtualizacao().getPagoPensao(), totalPago);
            totalPago = Utils.somar(totalPago, this.getPensaoAlimenticiaDaAtualizacao().getPagoJuro(), totalPago);
        }
        totalPago = Utils.somar(totalPago, Utils.naoNulo(this.getCustasJudiciaisDaAtualizacao()) ? this.getPagoCustasJudiciais() : BigDecimal.ZERO, totalPago);
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && !this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            totalPago = Utils.somar(totalPago, this.getValorPagoIrpf(), totalPago);
        }
        return totalPago;
    }

    public BigDecimal calcularTotalDiferenca() {
        return this.calcularTotalDiferenca(Boolean.FALSE);
    }

    public BigDecimal calcularTotalDiferenca(Boolean ehTotalParaResumo) {
        boolean incluirDescontoInss;
        BigDecimal totalDiferenca = BigDecimal.ZERO;
        totalDiferenca = Utils.somar(totalDiferenca, this.calcularTotalDiferencaMultas(ehTotalParaResumo), totalDiferenca);
        totalDiferenca = Utils.somar(totalDiferenca, this.calcularTotaDiferencaHonorarios(ehTotalParaResumo), totalDiferenca);
        if (this.getCalculo().getFgts().getDestinoDoFgts().equals((Object)DestinoDoFgtsEnum.DEPOSITAR)) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaJuroDeMoraFgts(), totalDiferenca);
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaJuroDeMoraFgtsPeriodoAtual(), totalDiferenca);
            if (!ehTotalParaResumo.booleanValue() || BigDecimal.ZERO.compareTo(this.getDiferencaFgts()) <= 0) {
                totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaFgts(), totalDiferenca);
            }
        }
        boolean verbaComIncidenciaInss = false;
        for (VerbaDeCalculo verba : this.getCalculo().getVerbasAtivas()) {
            if (!verba.getIncidenciaINSS().booleanValue() || verba.getOcorrenciasAtivas().isEmpty()) continue;
            verbaComIncidenciaInss = true;
            break;
        }
        boolean bl = incluirDescontoInss = this.getCalculo().getInss().getInssSobreSalariosDevidos().getApurarInssSegurado() != false && this.getCalculo().getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante() != false && verbaComIncidenciaInss;
        if (incluirDescontoInss && (!ehTotalParaResumo.booleanValue() || BigDecimal.ZERO.compareTo(this.getDiferencaInss()) <= 0)) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaInss(), totalDiferenca);
        }
        if (this.getCalculo().getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue() && (!ehTotalParaResumo.booleanValue() || BigDecimal.ZERO.compareTo(this.getDiferencaPrevidenciaPrivada()) <= 0)) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaPrevidenciaPrivada(), totalDiferenca);
        }
        if (Utils.naoNulo(this.getPensaoAlimenticiaDaAtualizacao()) && (Utils.nulo(this.getPensaoAlimenticiaDaAtualizacao().getValorRemanescente()) || this.getDataFinalPeriodo().equals(this.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataFinalPeriodo().equals(this.getCalculo().getDataDeLiquidacao()))) {
            BigDecimal pensao = this.getPensaoAlimenticiaDaAtualizacao().getDiferencaPensaoDevido();
            if (!ehTotalParaResumo.booleanValue() || BigDecimal.ZERO.compareTo(pensao) <= 0) {
                totalDiferenca = Utils.somar(totalDiferenca, pensao, totalDiferenca);
            }
        } else if (Utils.naoNulo(this.getPensaoAlimenticiaDaAtualizacao())) {
            BigDecimal totalPensao = BigDecimal.ZERO;
            BigDecimal pensaoRemanescente = this.getPensaoAlimenticiaDaAtualizacao().getDiferencaCalculadaRemanescente(this.getIndiceDeCorrecao());
            BigDecimal percentualPrincipalPensao = this.getPensaoAlimenticiaDaAtualizacao().getPercentualPrincipal();
            BigDecimal percentualFgtsPensao = this.getPensaoAlimenticiaDaAtualizacao().getPercentualFgts();
            BigDecimal pensaoSobreJuros = this.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getIncidirSobreJuros() != false ? this.getCreditosDoReclamante().getDiferencaPensaoSobreJurosDoPeriodo(this.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getAliquota().divide(Utils.CEM), this.getPensaoAlimenticiaDaAtualizacao().getPagoJuro(), percentualPrincipalPensao, percentualFgtsPensao) : BigDecimal.ZERO;
            totalPensao = Utils.somar(totalPensao, pensaoRemanescente, totalPensao);
            totalPensao = Utils.somar(totalPensao, pensaoSobreJuros, totalPensao);
            if (!ehTotalParaResumo.booleanValue() || BigDecimal.ZERO.compareTo(totalPensao) <= 0) {
                totalDiferenca = Utils.somar(totalDiferenca, totalPensao, totalDiferenca);
            }
        }
        if (Utils.naoNulo(this.getCustasJudiciaisDaAtualizacao())) {
            BigDecimal diferencaCustas = this.getDiferencaCustasJudiciais();
            if (!ehTotalParaResumo.booleanValue() || Utils.naoNulo(diferencaCustas) && BigDecimal.ZERO.compareTo(diferencaCustas) <= 0) {
                totalDiferenca = Utils.somar(totalDiferenca, diferencaCustas, totalDiferenca);
            }
        }
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && !this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            totalDiferenca = ehTotalParaResumo != false ? Utils.somar(totalDiferenca, this.getCalculo().getIrpf().getTotalDiferecaComJurosEMultaAtualizacao(), totalDiferenca) : Utils.somar(totalDiferenca, this.getDiferencaIrpf(), totalDiferenca);
        }
        return totalDiferenca;
    }

    private BigDecimal calcularTotaDiferencaHonorarios(Boolean ignorarDescontosNegativos) {
        BigDecimal totalDiferenca = BigDecimal.ZERO;
        HashMap<String, BigDecimal> mapaCredorDiferenca = new HashMap<String, BigDecimal>();
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : this.getHonorariosDaAtualizacaoCalculado()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)honorarioDaAtualizacao.getHonorario().getTipoCobrancaReclamante())) continue;
            BigDecimal diferenca = BigDecimal.ZERO;
            if (Utils.nulo(honorarioDaAtualizacao.getValorRemanescenteHonorario()) || this.getDataFinalPeriodo().equals(honorarioDaAtualizacao.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !honorarioDaAtualizacao.getJaCalculadoUmaVez().booleanValue()) {
                diferenca = honorarioDaAtualizacao.getDiferencaCalculadaOutros();
            } else {
                diferenca = Utils.somar(diferenca, honorarioDaAtualizacao.getDiferencaCalculadaRemanescente(honorarioDaAtualizacao.getIndiceDeCorrecao()), diferenca);
                diferenca = Utils.somar(diferenca, this.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM), honorarioDaAtualizacao.getPagoJuro()), diferenca);
                diferenca = Utils.somar(diferenca, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.calcularHonorariosSobreMultas(this.getCreditosDoReclamante()), honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), honorarioDaAtualizacao.getPagoSobreMultas()), diferenca);
            }
            this.acumularValorNoMapa(mapaCredorDiferenca, honorarioDaAtualizacao.getHonorario().getNomeCredor(), diferenca);
            if (ignorarDescontosNegativos.booleanValue()) continue;
            totalDiferenca = Utils.somar(totalDiferenca, diferenca, totalDiferenca);
        }
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : this.getHonorariosDaAtualizacaoInformado()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)honorarioDaAtualizacao.getHonorario().getTipoCobrancaReclamante())) continue;
            BigDecimal diferencaHonorario = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioDaAtualizacao.getValorHonorario(), honorarioDaAtualizacao.getIndiceDeCorrecao()), honorarioDaAtualizacao.getPagoHonorario(), Utils.multiplicar(honorarioDaAtualizacao.getValorHonorario(), honorarioDaAtualizacao.getIndiceDeCorrecao())));
            this.acumularValorNoMapa(mapaCredorDiferenca, honorarioDaAtualizacao.getHonorario().getNomeCredor(), diferencaHonorario);
            if (!ignorarDescontosNegativos.booleanValue()) {
                totalDiferenca = Utils.somar(totalDiferenca, diferencaHonorario, totalDiferenca);
            }
            if (BigDecimal.ZERO.compareTo(honorarioDaAtualizacao.getValorHonorario()) > 0 || !this.podeCalcularJurosDeHonorario(honorarioDaAtualizacao.getHonorario())) continue;
            BigDecimal devido = BigDecimal.ZERO;
            if (honorarioDaAtualizacao.getHonorario().getAplicarJuros().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.getValorJuros(), honorarioDaAtualizacao.getIndiceDeCorrecao()));
            }
            BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioDaAtualizacao.getPagoJuro(), devido));
            this.acumularValorNoMapa(mapaCredorDiferenca, honorarioDaAtualizacao.getHonorario().getNomeCredor(), diferencaJuro);
            if (!ignorarDescontosNegativos.booleanValue()) {
                totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
            }
            BigDecimal base = honorarioDaAtualizacao.getHonorario().getAplicarJuros() != false && BigDecimal.ZERO.compareTo(honorarioDaAtualizacao.getValorHonorario()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.getValorHonorario(), honorarioDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, honorarioDaAtualizacao.getTaxaJurosHonorario().divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioDaAtualizacao.getPagoJuroPeriodoAtual(), dev));
            this.acumularValorNoMapa(mapaCredorDiferenca, honorarioDaAtualizacao.getHonorario().getNomeCredor(), diferencaJuroAtual);
            if (ignorarDescontosNegativos.booleanValue()) continue;
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
        }
        if (ignorarDescontosNegativos.booleanValue()) {
            for (Map.Entry entry : mapaCredorDiferenca.entrySet()) {
                if (BigDecimal.ZERO.compareTo((BigDecimal)entry.getValue()) >= 0) continue;
                totalDiferenca = Utils.somar(totalDiferenca, (BigDecimal)entry.getValue(), totalDiferenca);
            }
        }
        return totalDiferenca;
    }

    private BigDecimal calcularTotalDiferencaMultas(Boolean ignorarDescontosNegativos) {
        BigDecimal totalDiferenca = BigDecimal.ZERO;
        HashMap<String, BigDecimal> mapaCredorDiferenca = new HashMap<String, BigDecimal>();
        for (MultaDaAtualizacao multaDaAtualizacao : this.getMultasCalculadas()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)multaDaAtualizacao.getMulta().getTipoCobrancaReclamante())) continue;
            BigDecimal diferenca = BigDecimal.ZERO;
            if (Utils.nulo(multaDaAtualizacao.getValorRemanescenteMulta()) || this.getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multaDaAtualizacao.getJaCalculadoUmaVez().booleanValue()) {
                diferenca = multaDaAtualizacao.getDiferencaCalculadaOutros();
            } else {
                diferenca = Utils.somar(diferenca, multaDaAtualizacao.getDiferencaCalculadaRemanescente(multaDaAtualizacao.getIndiceDeCorrecao()), diferenca);
                diferenca = Utils.somar(diferenca, multaDaAtualizacao.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaDaAtualizacao.getMulta().getAliquotaMulta().divide(Utils.CEM), multaDaAtualizacao.getPagoJuro()), diferenca);
            }
            this.acumularValorNoMapa(mapaCredorDiferenca, multaDaAtualizacao.getMulta().getNomeTerceiro(), diferenca);
            if (ignorarDescontosNegativos.booleanValue()) continue;
            totalDiferenca = Utils.somar(totalDiferenca, diferenca, totalDiferenca);
        }
        for (MultaDaAtualizacao multaDaAtualizacao : this.getMultasInformadas()) {
            if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)multaDaAtualizacao.getMulta().getTipoCobrancaReclamante())) continue;
            BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao()), multaDaAtualizacao.getPagoMulta(), Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao())));
            this.acumularValorNoMapa(mapaCredorDiferenca, multaDaAtualizacao.getMulta().getNomeTerceiro(), diferencaMulta);
            if (!ignorarDescontosNegativos.booleanValue()) {
                totalDiferenca = Utils.somar(totalDiferenca, diferencaMulta, totalDiferenca);
            }
            if (BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) > 0 || !this.podeCalcularJurosDeMulta(multaDaAtualizacao.getMulta())) continue;
            BigDecimal devido = BigDecimal.ZERO;
            if (multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorJuros(), multaDaAtualizacao.getIndiceDeCorrecao()));
            }
            BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaDaAtualizacao.getPagoJuro(), devido));
            this.acumularValorNoMapa(mapaCredorDiferenca, multaDaAtualizacao.getMulta().getNomeTerceiro(), diferencaJuro);
            if (!ignorarDescontosNegativos.booleanValue()) {
                totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
            }
            BigDecimal base = multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false && BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaDaAtualizacao.getTaxaJurosMulta().divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaDaAtualizacao.getPagoJuroPeriodoAtual(), dev));
            this.acumularValorNoMapa(mapaCredorDiferenca, multaDaAtualizacao.getMulta().getNomeTerceiro(), diferencaJuroAtual);
            if (ignorarDescontosNegativos.booleanValue()) continue;
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
        }
        if (ignorarDescontosNegativos.booleanValue()) {
            for (Map.Entry entry : mapaCredorDiferenca.entrySet()) {
                if (BigDecimal.ZERO.compareTo((BigDecimal)entry.getValue()) >= 0) continue;
                totalDiferenca = Utils.somar(totalDiferenca, (BigDecimal)entry.getValue(), totalDiferenca);
            }
        }
        return totalDiferenca;
    }

    private void acumularValorNoMapa(Map<String, BigDecimal> mapaCredorDiferenca, String nomeTerceiro, BigDecimal diferencaMulta) {
        if (!mapaCredorDiferenca.containsKey(nomeTerceiro)) {
            mapaCredorDiferenca.put(nomeTerceiro, BigDecimal.ZERO);
        }
        BigDecimal acumulado = mapaCredorDiferenca.get(nomeTerceiro);
        acumulado = Utils.somar(acumulado, diferencaMulta, acumulado);
        mapaCredorDiferenca.put(nomeTerceiro, acumulado);
    }

    public BigDecimal getDevidoCustasJudiciais() {
        BigDecimal devido = null;
        if (TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)this.getCustasJudiciaisDaAtualizacao().getTipoCobrancaReclamante())) {
            devido = Utils.arredondarValorMonetario(this.getCustasJudiciaisDaAtualizacao().totalDevidoReclamante());
        }
        return devido;
    }

    public BigDecimal getPagoCustasJudiciais() {
        BigDecimal pago = null;
        if (TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)this.getCustasJudiciaisDaAtualizacao().getTipoCobrancaReclamante())) {
            pago = this.getCustasJudiciaisDaAtualizacao().getValorPagoReclamante();
        }
        return pago;
    }

    public BigDecimal getDiferencaCustasJudiciais() {
        BigDecimal diferenca = null;
        if (TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)this.getCustasJudiciaisDaAtualizacao().getTipoCobrancaReclamante())) {
            diferenca = Utils.arredondarValorMonetario(this.getCustasJudiciaisDaAtualizacao().getTotalDiferencaReclamante());
        }
        return diferenca;
    }

    public DebitosDoReclamante atualizarDadosDeImpostoDeRenda(Pagamento pagamento) {
        boolean isRegraPrecatorio = this.getAtualizacao().getAtualizarRegraPrecatorio();
        BigDecimal valorDevido = null;
        BigDecimal valorPago = null;
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && !this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            valorDevido = Utils.arredondarValorMonetario(this.getCalculo().getIrpf().getTotalDevidoComJurosEMultaAtualizacao(pagamento.getDataPagamento()));
            if (pagamento.getSelecionarImpostoDoReclamante().booleanValue() && !pagamento.getApurarImpostoDoReclamante().booleanValue()) {
                valorPago = Utils.arredondarValorMonetario(pagamento.getValorParaRecolhimentoDebitosReclamanteImpostoDoReclamante());
            } else if (pagamento.getSelecionarImpostoDoReclamante().booleanValue() && pagamento.getApurarImpostoDoReclamante().booleanValue()) {
                valorPago = Utils.arredondarValorMonetario(isRegraPrecatorio ? pagamento.apurarRecolhimentoDoReclamante(this.getValorIrpfCorrigidoPrecatorio()) : this.getCalculo().getIrpf().getTotalDevidoDeImpostoReferenteAoPagamento(pagamento));
            }
        }
        if (Utils.nulo(valorDevido)) {
            valorDevido = BigDecimal.ZERO;
        }
        if (Utils.nulo(valorPago)) {
            valorPago = BigDecimal.ZERO;
        }
        if (!isRegraPrecatorio) {
            this.setValorDevidoIrpf(valorDevido);
        }
        this.setValorPagoIrpf(valorPago);
        return this;
    }

    public DebitosDoReclamante atualizarDadosDeImpostoDeRendaAte(Date dataAtualizacao) {
        if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            return this;
        }
        BigDecimal valorDevido = null;
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && !this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            valorDevido = Utils.arredondarValorMonetario(this.getCalculo().getIrpf().getTotalDevidoComJurosEMultaAtualizacao(dataAtualizacao));
        }
        if (Utils.nulo(valorDevido)) {
            valorDevido = BigDecimal.ZERO;
        }
        this.setValorDevidoIrpf(valorDevido);
        this.setValorPagoIrpf(BigDecimal.ZERO);
        return this;
    }

    public DebitosDoReclamante atualizarDadosDeImpostoDeRendaAteSaldo(Boolean ultimoEventoPgto) {
        if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            return this;
        }
        BigDecimal valorDevido = BigDecimal.ZERO;
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && !this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            valorDevido = ultimoEventoPgto != false ? Utils.arredondarValorMonetario(this.getCalculo().getIrpf().getTotalDiferecaComJurosEMultaAtualizacaoPagamentoNosaldo(this.getAtualizacao().getDataDeLiquidacao())) : Utils.arredondarValorMonetario(this.getCalculo().getIrpf().getTotalDiferecaComJurosEMultaAtualizacao());
        }
        if (Utils.nulo(valorDevido)) {
            valorDevido = BigDecimal.ZERO;
        }
        this.setValorDevidoIrpf(valorDevido);
        if (Utils.nulo(this.getValorPagoIrpf())) {
            this.setValorPagoIrpf(BigDecimal.ZERO);
        }
        return this;
    }

    public void calcularImpostoDeRendaDoSaldoDeHonorarios() {
        for (HonorarioDaAtualizacao honorarioCalculado : this.getHonorariosDaAtualizacaoCalculado()) {
            honorarioCalculado = MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioCalculado, this.getAtualizacao().getDataDeLiquidacao(), Boolean.TRUE);
        }
        for (HonorarioDaAtualizacao honorarioInformado : this.getHonorariosDaAtualizacaoInformado()) {
            HonorarioDaAtualizacao honorarioDaAtualizacao = MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioInformado, this.getAtualizacao().getDataDeLiquidacao(), Boolean.TRUE);
        }
    }

    public BigDecimal encontrarIndiceDeCorrecaoDoDescontoDoInss() {
        if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            return this.getIndiceDeCorrecao();
        }
        BigDecimal correcao = BigDecimal.ONE;
        if (BigDecimal.ZERO.compareTo(this.getValorDescontoInss()) <= 0) {
            boolean corrigeDesconto = this.getCalculo().getInss().getInssSobreSalariosDevidos().getApurarInssSegurado() != false && this.getCalculo().getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante() != false && this.getCalculo().getInss().getInssSobreSalariosDevidos().getCorrigirDescontoReclamante() != false;
            correcao = Utils.arredondarValor(corrigeDesconto ? this.getIndiceDeCorrecao() : ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getInstance(this.getDataInicialPeriodo()).addDay(1).getDate(), this.getDataFinalPeriodo()), 9);
        }
        return correcao;
    }

    private boolean podeCalcularJurosDeMulta(Multa multa) {
        Date dataRef = multa.getDataApartirDeAplicarJuros() != null ? multa.getDataApartirDeAplicarJuros() : (multa.getDataEvento() != null ? multa.getDataEvento() : multa.getDataVencimentoMulta());
        return multa.getAplicarJurosSobreMulta() != false && HelperDate.dateAfterOrEquals(this.getDataFinalPeriodo(), dataRef);
    }

    private boolean podeCalcularJurosDeHonorario(Honorario honorario) {
        Date dataRef = honorario.getDataApartirDeAplicarJuros() != null ? honorario.getDataApartirDeAplicarJuros() : (honorario.getDataEvento() != null ? honorario.getDataEvento() : honorario.getDataVencimento());
        return honorario.getAplicarJuros() != false && HelperDate.dateAfterOrEquals(this.getDataFinalPeriodo(), dataRef);
    }

    public BigDecimal getValorDevidoCustasParaPrecatorio() {
        return this.valorDevidoCustasParaPrecatorio;
    }

    public void setValorDevidoCustasParaPrecatorio(BigDecimal valorDevidoCustasParaPrecatorio) {
        this.valorDevidoCustasParaPrecatorio = valorDevidoCustasParaPrecatorio;
    }

    public BigDecimal getValorPagoCustasParaPrecatorio() {
        return this.valorPagoCustasParaPrecatorio;
    }

    public void setValorPagoCustasParaPrecatorio(BigDecimal valorPagoCustasParaPrecatorio) {
        this.valorPagoCustasParaPrecatorio = valorPagoCustasParaPrecatorio;
    }

    public BigDecimal getDevidoCorrigidoCustasJudiciaisPrecatorio() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDevidoCustasParaPrecatorio(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getDiferencaCustasJudiciaisPrecatorio() {
        return Utils.subtrair(this.getDevidoCorrigidoCustasJudiciaisPrecatorio(), this.getValorPagoCustasParaPrecatorio());
    }
}

