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
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndicesAcumuladosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDevedorDoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeHonorarioDoPagamentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.IndicePrecatorio;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ServicoAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.MaquinaDeCalculoDeHonorarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.TotalizadorOcorrenciaDeInssAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.AtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioOutrosDebitosDoReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
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
@Table(name="TBOUTROSDEBITOS")
@SequenceGenerator(name="SQOUTROSDEBITOS", sequenceName="SQOUTROSDEBITOS", allocationSize=1)
@Name(value="outrosDebitosReclamado")
@Scope(value=ScopeType.SESSION)
public class OutrosDebitosReclamado
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = 4739279818890676904L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOUTROSDEBITOS")
    @Column(name="IIDOUTROSDEBITOS")
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
    @Column(name="DDTCRIACAOOUTROSDEBITOS", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataCriacao;
    @Column(name="DDTINICIALOUTROSDEBITOS", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataInicialPeriodo;
    @Column(name="DDTFINALOUTROSDEBITOS", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataFinalPeriodo;
    @Column(name="MVLINDICECORRECAO", precision=38, scale=25)
    private BigDecimal indiceDeCorrecao;
    @Column(name="MVLTAXADEJUROS", precision=12, scale=4)
    private BigDecimal taxaDeJuros;
    @Column(name="MVLINDICECORRECAOFGTS", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoFgts;
    @Column(name="MVLINDICECORRECAOPREVPRIV", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoPrevPrivada;
    @Column(name="MVLTOTALDEVIDO", precision=12, scale=2)
    private BigDecimal totalDevido;
    @Column(name="MVLTOTALPAGO", precision=12, scale=2)
    private BigDecimal totalPago;
    @Column(name="MVLTOTALDIFERENCA", precision=12, scale=2)
    private BigDecimal totalDiferenca;
    @Column(name="MVLVALORREVIDENCIAPRIVADA", precision=12, scale=2)
    private BigDecimal valorPrevidenciaPrivada;
    @Column(name="MVLVALORDESCONTOINSS", precision=12, scale=2)
    private BigDecimal valorDescontoInss;
    @Column(name="MVLDEVIDOINSSSALDEVPRECATORIO", precision=12, scale=2)
    private BigDecimal valorDevidoInssSalariosDevidosParaPrecatorio;
    @Column(name="MVLVALORPAGOINSSSALDEVIDOS", precision=12, scale=2)
    private BigDecimal valorPagoInssSalariosDevidos;
    @Column(name="MVLVALORJUROSPREVPRIV", precision=12, scale=2)
    private BigDecimal valorJurosDePrevidenciaPrivada;
    @Column(name="MVLPAGOJUROSPREVPRIV", precision=12, scale=2)
    private BigDecimal valorPagoJurosDePrevidenciaPrivada;
    @Column(name="MVLPAGOJUROSPREVPRIVPGT", precision=12, scale=2)
    private BigDecimal valorPagoJurosDePrevidenciaPrivadaPeriodoAtual;
    @Column(name="MVLDEVIDOINSSSALPAGPRECATORIO", precision=12, scale=2)
    private BigDecimal valorDevidoInssSalariosPagosParaPrecatorio;
    @Column(name="MVLVALORPAGOINSSSALPAGOS", precision=12, scale=2)
    private BigDecimal valorPagoInssSalariosPagos;
    @Column(name="MVLVALORINSSDEZ", precision=12, scale=2)
    private BigDecimal valorInssDez;
    @Column(name="MVLVALORPAGOINSSDEZ", precision=12, scale=2)
    private BigDecimal valorPagoInssDez;
    @Column(name="MVLVALORINSSMEIO", precision=12, scale=2)
    private BigDecimal valorInssMeio;
    @Column(name="MVLVALORPAGOINSSMEIO", precision=12, scale=2)
    private BigDecimal valorPagoInssMeio;
    @Column(name="MVLDEVIDOIRPF", precision=12, scale=2)
    private BigDecimal valorDevidoIrpf;
    @Column(name="MVLPAGOIRPF", precision=12, scale=2)
    private BigDecimal valorPagoIrpf;
    @Column(name="MVLVALORDESCONTOINSSDEBITO", precision=12, scale=2)
    private BigDecimal valorDescontoInssDebitosReclamante;
    @Column(name="MVLDEVIDOCUSTASPRECATORIO", precision=12, scale=2)
    private BigDecimal valorDevidoCustasParaPrecatorio;
    @Column(name="MVLPAGOCUSTASPRECATORIO", precision=12, scale=2)
    private BigDecimal valorPagoCustasParaPrecatorio;
    @Where(clause="STPMULTA = 'I' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="outrosDebitosReclamado")
    @OrderBy(value="multa")
    private Set<MultaDaAtualizacao> multasInformadas = new HashSet<MultaDaAtualizacao>();
    @Where(clause="STPMULTA = 'C' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="outrosDebitosReclamado")
    @OrderBy(value="multa")
    private Set<MultaDaAtualizacao> multasCalculadas = new HashSet<MultaDaAtualizacao>();
    @Where(clause="STPVALOR = 'C' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="outrosDebitosReclamado")
    @OrderBy(value="honorario")
    private Set<HonorarioDaAtualizacao> honorariosDaAtualizacaoCalculado = new HashSet<HonorarioDaAtualizacao>();
    @Where(clause="STPVALOR = 'I' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="outrosDebitosReclamado")
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
        OutrosDebitosReclamado.getRepositorio(RepositorioOutrosDebitosDoReclamado.class).salvar(this);
    }

    public static List<OutrosDebitosReclamado> obterUltimoRegistro(Atualizacao atualizacao) {
        return OutrosDebitosReclamado.getRepositorio(RepositorioOutrosDebitosDoReclamado.class).obterUltimoRegistro(atualizacao);
    }

    public static List<OutrosDebitosReclamado> obterTodos(Atualizacao atualizacao) {
        return OutrosDebitosReclamado.getRepositorio(RepositorioOutrosDebitosDoReclamado.class).obterTodosOutrosDebitosReclamado(atualizacao);
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

    public Long getId() {
        return this.id;
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

    public BigDecimal getValorJurosDePrevidenciaPrivada() {
        return this.valorJurosDePrevidenciaPrivada;
    }

    public void setValorJurosDePrevidenciaPrivada(BigDecimal valorJurosDePrevidenciaPrivada) {
        this.valorJurosDePrevidenciaPrivada = valorJurosDePrevidenciaPrivada;
    }

    public BigDecimal getValorPagoJurosDePrevidenciaPrivada() {
        return this.valorPagoJurosDePrevidenciaPrivada;
    }

    public void setValorPagoJurosDePrevidenciaPrivada(BigDecimal valorPagoJurosDePrevidenciaPrivada) {
        this.valorPagoJurosDePrevidenciaPrivada = valorPagoJurosDePrevidenciaPrivada;
    }

    public BigDecimal getValorPagoJurosDePrevidenciaPrivadaPeriodoAtual() {
        return this.valorPagoJurosDePrevidenciaPrivadaPeriodoAtual;
    }

    public void setValorPagoJurosDePrevidenciaPrivadaPeriodoAtual(BigDecimal valorPagoJurosDePrevidenciaPrivadaPeriodoAtual) {
        this.valorPagoJurosDePrevidenciaPrivadaPeriodoAtual = valorPagoJurosDePrevidenciaPrivadaPeriodoAtual;
    }

    public BigDecimal getDevidoJurosDePrevidenciaPrivada() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorJurosDePrevidenciaPrivada(), this.getIndiceDeCorrecaoPrevPrivada()));
    }

    public BigDecimal getDiferencaJurosDePrevidenciaPrivada() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoJurosDePrevidenciaPrivada(), this.getValorPagoJurosDePrevidenciaPrivada()));
    }

    public BigDecimal getBaseJurosDePrevidenciaPrivadaPeriodoAtual() {
        if (this.getCalculo().getParametrosDeAtualizacao().getJurosDePrevidenciaPrivada().booleanValue()) {
            return this.getValorPrevidenciaPrivada();
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getDevidoJurosDePrevidenciaPrivadaPeriodoAtual() {
        BigDecimal baseJurosPrevidencia = this.getBaseJurosDePrevidenciaPrivadaPeriodoAtual();
        return BigDecimal.ZERO.compareTo(baseJurosPrevidencia) > 0 ? BigDecimal.ZERO : Utils.arredondarValorMonetario(Utils.multiplicar(baseJurosPrevidencia, this.getTaxaDeJuros().divide(Utils.CEM)));
    }

    public BigDecimal getDiferencaJurosDePrevidenciaPrivadaPeriodoAtual() {
        return Utils.arredondarValorMonetario(this.getDevidoJurosDePrevidenciaPrivadaPeriodoAtual().subtract(this.getValorPagoJurosDePrevidenciaPrivadaPeriodoAtual()));
    }

    public BigDecimal getValorBaseJurosDePrevidenciaPrivadaDepoisPrimeiroEvento() {
        return Utils.arredondarValorMonetario(Utils.somar(this.getDiferencaJurosDePrevidenciaPrivada(), this.getDiferencaJurosDePrevidenciaPrivadaPeriodoAtual()));
    }

    public BigDecimal getValorDevidoInssSalariosDevidosParaPrecatorio() {
        return this.valorDevidoInssSalariosDevidosParaPrecatorio;
    }

    public void setValorDevidoInssSalariosDevidosParaPrecatorio(BigDecimal valorDevidoInssSalariosDevidosParaPrecatorio) {
        this.valorDevidoInssSalariosDevidosParaPrecatorio = valorDevidoInssSalariosDevidosParaPrecatorio;
    }

    public BigDecimal getValorDevidoInssSalariosPagosParaPrecatorio() {
        return this.valorDevidoInssSalariosPagosParaPrecatorio;
    }

    public void setValorDevidoInssSalariosPagosParaPrecatorio(BigDecimal valorDevidoInssSalariosPagosParaPrecatorio) {
        this.valorDevidoInssSalariosPagosParaPrecatorio = valorDevidoInssSalariosPagosParaPrecatorio;
    }

    public BigDecimal getValorPagoInssSalariosDevidos() {
        return this.valorPagoInssSalariosDevidos;
    }

    public void setValorPagoInssSalariosDevidos(BigDecimal valorPagoInssSalariosDevidos) {
        this.valorPagoInssSalariosDevidos = valorPagoInssSalariosDevidos;
    }

    public BigDecimal getValorPagoInssSalariosPagos() {
        return this.valorPagoInssSalariosPagos;
    }

    public void setValorPagoInssSalariosPagos(BigDecimal valorPagoInssSalariosPagos) {
        this.valorPagoInssSalariosPagos = valorPagoInssSalariosPagos;
    }

    public BigDecimal getValorInssDez() {
        return this.valorInssDez;
    }

    public void setValorInssDez(BigDecimal valorInssDez) {
        this.valorInssDez = valorInssDez;
    }

    public BigDecimal getValorPagoInssDez() {
        return this.valorPagoInssDez;
    }

    public void setValorPagoInssDez(BigDecimal valorPagoInssDez) {
        this.valorPagoInssDez = valorPagoInssDez;
    }

    public BigDecimal getValorInssMeio() {
        return this.valorInssMeio;
    }

    public void setValorInssMeio(BigDecimal valorInssMeio) {
        this.valorInssMeio = valorInssMeio;
    }

    public BigDecimal getValorPagoInssMeio() {
        return this.valorPagoInssMeio;
    }

    public void setValorPagoInssMeio(BigDecimal valorPagoInssMeio) {
        this.valorPagoInssMeio = valorPagoInssMeio;
    }

    public BigDecimal getDiferencaInssDez() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoInssDez(), this.getValorPagoInssDez()));
    }

    public BigDecimal getDevidoInssDez() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorInssDez(), this.getIndiceDeCorrecaoFgts()));
    }

    public BigDecimal getDiferencaInssMeio() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoInssMeio(), this.getValorPagoInssMeio()));
    }

    public BigDecimal getDevidoInssMeio() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorInssMeio(), this.getIndiceDeCorrecaoFgts()));
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

    public BigDecimal getDiferencaIrpf() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getValorDevidoIrpf(), this.getValorPagoIrpf()));
    }

    public BigDecimal getValorIrpfCorrigidoPrecatorio() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDevidoIrpf(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getDiferencaIrpfPrecatorio() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getValorIrpfCorrigidoPrecatorio(), this.getValorPagoIrpf()));
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

    public BigDecimal getValorDescontoInssDebitosReclamante() {
        return this.valorDescontoInssDebitosReclamante;
    }

    public void setValorDescontoInssDebitosReclamante(BigDecimal valorDescontoInssDebitosReclamante) {
        this.valorDescontoInssDebitosReclamante = valorDescontoInssDebitosReclamante;
    }

    public BigDecimal getDevidoContribuicaoSocialSalariosDevidos() {
        List<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> ocorrenciasDevido = this.getCalculo().getInss().getInssSobreSalariosDevidos().obterOcorrenciasTodasPor(this.getCalculo().getInss().getInssSobreSalariosDevidos(), this.getDataFinalPeriodo());
        TotalizadorOcorrenciaDeInssAtualizacao totalizadorDevido = OcorrenciaDeInssAtualizacao.getTotalizador(ocorrenciasDevido);
        BigDecimal valorDevido = totalizadorDevido.getTotal();
        if (this.getCalculo().getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && this.getCalculo().getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue()) {
            valorDevido = Utils.subtrair(valorDevido, this.getValorDescontoInssDebitosReclamante(), valorDevido);
        }
        return valorDevido;
    }

    public BigDecimal getDiferencaContribuicaoSocialSalariosDevidos() {
        return Utils.subtrair(this.getDevidoContribuicaoSocialSalariosDevidos(), this.getValorPagoInssSalariosDevidos());
    }

    public BigDecimal getDevidoCorrigidoCustasJudiciaisPrecatorio() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDevidoCustasParaPrecatorio(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getDiferencaCustasJudiciaisPrecatorio() {
        return Utils.subtrair(this.getDevidoCorrigidoCustasJudiciaisPrecatorio(), this.getValorPagoCustasParaPrecatorio());
    }

    public BigDecimal getDiferencaContribuicaoSocialSalariosPagos() {
        return Utils.subtrair(this.getDevidoContribuicaoSocialSalariosPagos(), this.getValorPagoInssSalariosPagos());
    }

    public BigDecimal getDevidoCorrigidoContribuicaoSocialSalariosPagosPrecatorio() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDevidoInssSalariosPagosParaPrecatorio(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getDiferencaContribuicaoSocialSalariosPagosPrecatorio() {
        return Utils.subtrair(this.getDevidoCorrigidoContribuicaoSocialSalariosPagosPrecatorio(), this.getValorPagoInssSalariosPagos());
    }

    public BigDecimal getDevidoContribuicaoSocialSalariosPagos() {
        List<OcorrenciaDeInssSobreSalariosPagosAtualizacao> ocorrenciasPago = this.getCalculo().getInss().getInssSobreSalariosPagos().obterOcorrenciasTodasPor(this.getCalculo().getInss().getInssSobreSalariosPagos(), this.getDataFinalPeriodo());
        TotalizadorOcorrenciaDeInssAtualizacao totalizadorPago = OcorrenciaDeInssAtualizacao.getTotalizador(ocorrenciasPago);
        return totalizadorPago.getTotal();
    }

    private BigDecimal calcularTaxaDeJuros(Date dataInicial, Date dataFinal, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData) {
        return this.calcularTaxaDeJuros(dataInicial, dataFinal, jurosDoAjuizamento, projetarData, false);
    }

    private BigDecimal calcularTaxaDeJuros(Date dataInicial, Date dataFinal, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData, boolean isMultaHonorario) {
        TabelaDeJurosDoCalculo tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), dataInicial, dataFinal);
        return tabelaDeJuros.calcularTaxaDeJurosPagamento(dataInicial, dataFinal, jurosDoAjuizamento, projetarData, isMultaHonorario);
    }

    private BigDecimal getDescontoInssCorrigido() {
        if (!this.getCalculo().getInss().getInssSobreSalariosDevidos().getCorrigirDescontoReclamante().booleanValue()) {
            return Utils.arredondarValorMonetario(this.getValorDescontoInss());
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDescontoInss(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getDevidoCorrigidoContribuicaoSocialSalariosDevidosPrecatorio() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorDevidoInssSalariosDevidosParaPrecatorio(), this.getIndiceDeCorrecao()));
    }

    public BigDecimal getDiferencaContribuicaoSocialSalariosDevidosPrecatorio() {
        return Utils.subtrair(this.getDevidoCorrigidoContribuicaoSocialSalariosDevidosPrecatorio(), this.getValorPagoInssSalariosDevidos());
    }

    private BigDecimal getPrevidenciaPrivadaCorrigido() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorPrevidenciaPrivada(), this.getIndiceDeCorrecaoPrevPrivada()));
    }

    public OutrosDebitosReclamado liquidarOutrosDebitosReclamado(Date dataInicialParaLiquidacao, Date dataFinalParaLiquidacao, OutrosDebitosReclamado outrosDebitosReclamadoAnterior, DebitosDoReclamante debitosDoReclamanteAnterior, CreditosDoReclamante creditoDoReclamante, CreditosDoReclamante creditoDoReclamanteAnterior, Pagamento pagamento, Multa multaDoEvento, Honorario honorarioDoEvento, CustasFixasAtualizacao custas, boolean primeiroEvento) throws NegocioException {
        HonorarioDaAtualizacao honorarioDaAtualizacao;
        BigDecimal anterior;
        BigDecimal valorJuros;
        Date dataInicioDeJuros;
        MultaDaAtualizacao multaDaAtualizacao;
        BigDecimal indiceDeCorrecao;
        HashMap<IndiceMonetarioEnum, BigDecimal> mapaDeIndices = new HashMap<IndiceMonetarioEnum, BigDecimal>();
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(this.getCalculo().getAtualizacaoMonetaria(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
        BigDecimal indiceDeCorrecaoParaJuros = indiceDeCorrecao = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
        HelperDate dataInicialParaLiquidacaoMaisUm = HelperDate.getInstance(dataInicialParaLiquidacao).addDay(1);
        BigDecimal taxaDeJuros = this.calcularTaxaDeJuros(dataInicialParaLiquidacaoMaisUm.getDate(), dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
        BigDecimal indiceDeCorrecaoDoFgts = indiceDeCorrecao;
        switch (this.getCalculo().getParametrosDeAtualizacao().getIndiceDeCorrecaoDoFGTS()) {
            case UTILIZAR_INDICE_JAM: {
                TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaFgts = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, IndiceMonetarioEnum.JAM, IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                tabelaDeCorrecaoMonetariaFgts.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                indiceDeCorrecaoDoFgts = tabelaDeCorrecaoMonetariaFgts.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
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
                        break;
                    }
                    if (!HelperDate.dateAfter(dataDemissaoMaisUmDia.getDate(), dataFinalParaLiquidacao)) break;
                    tabelaDeCorrecaoMonetariaFgts = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, IndiceMonetarioEnum.JAM, IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                    tabelaDeCorrecaoMonetariaFgts.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                    indiceDeCorrecaoDoFgts = tabelaDeCorrecaoMonetariaFgts.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
                    break;
                }
                tabelaDeCorrecaoMonetariaFgts = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, IndiceMonetarioEnum.JAM, IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                tabelaDeCorrecaoMonetariaFgts.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                indiceDeCorrecaoDoFgts = tabelaDeCorrecaoMonetariaFgts.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
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
            indiceDeCorrecaoParaJuros = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, this.getAtualizacao().getDataInicioAplicarEC1362025(), this.getAtualizacao().getGrupoEsferaPrecatorio(), true);
            taxaDeJuros = ServicoAtualizacaoUtils.encontrarTaxaDeJurosPrecatorioSIP(periodoAtualizacao.getInicial(), periodoAtualizacao.getFinal(), this.getAtualizacao().getDataInicioAplicarEC1362025(), periodoDaGraca);
            indiceDeCorrecaoDoFgts = indiceDeCorrecao;
            indiceDeCorrecaoDaPrevPrivada = indiceDeCorrecao;
        }
        OutrosDebitosReclamado outrosDebitosReclamado = new OutrosDebitosReclamado();
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento != null && multaDoEvento != null && honorarioDoEvento != null) {
            outrosDebitosReclamado = outrosDebitosReclamadoAnterior;
            outrosDebitosReclamado = this.incluirMulta(outrosDebitosReclamado, creditoDoReclamante, creditoDoReclamanteAnterior, multaDoEvento);
            outrosDebitosReclamado = this.incluirHonorario(outrosDebitosReclamado, creditoDoReclamante, creditoDoReclamanteAnterior, honorarioDoEvento);
            outrosDebitosReclamado.setTotalDevido(outrosDebitosReclamado.calcularTotalDevido());
            return outrosDebitosReclamado;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento == null && multaDoEvento != null && honorarioDoEvento == null) {
            outrosDebitosReclamado = outrosDebitosReclamadoAnterior;
            this.incluirMulta(outrosDebitosReclamado, creditoDoReclamante, creditoDoReclamanteAnterior, multaDoEvento);
            return outrosDebitosReclamado;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento == null && multaDoEvento == null && honorarioDoEvento != null) {
            outrosDebitosReclamado = outrosDebitosReclamadoAnterior;
            this.incluirHonorario(outrosDebitosReclamado, creditoDoReclamante, creditoDoReclamanteAnterior, honorarioDoEvento);
            outrosDebitosReclamado.setTotalDevido(outrosDebitosReclamado.calcularTotalDevido());
            outrosDebitosReclamado.setTotalPago(outrosDebitosReclamado.calcularTotalPago());
            outrosDebitosReclamado.setTotalDiferenca(outrosDebitosReclamado.calcularTotalDiferenca());
            return outrosDebitosReclamado;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento != null && multaDoEvento == null && honorarioDoEvento == null) {
            outrosDebitosReclamado = outrosDebitosReclamadoAnterior;
            outrosDebitosReclamado.setTotalDevido(outrosDebitosReclamado.calcularTotalDevido());
            return outrosDebitosReclamado;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && pagamento == null && multaDoEvento == null && honorarioDoEvento == null) {
            outrosDebitosReclamado = outrosDebitosReclamadoAnterior;
            outrosDebitosReclamado.setTotalDevido(outrosDebitosReclamado.calcularTotalDevido());
            outrosDebitosReclamado.setTotalPago(outrosDebitosReclamado.calcularTotalPago());
            outrosDebitosReclamado.setTotalDiferenca(outrosDebitosReclamado.calcularTotalDiferenca());
            return outrosDebitosReclamado;
        }
        outrosDebitosReclamado.setValorPagoInssSalariosDevidos(BigDecimal.ZERO);
        outrosDebitosReclamado.setValorPagoInssSalariosPagos(BigDecimal.ZERO);
        outrosDebitosReclamado.setValorPrevidenciaPrivada(Utils.arredondarValorMonetario(Utils.multiplicar(debitosDoReclamanteAnterior.getDiferencaPrevidenciaPrivada(), indiceDeCorrecao)));
        outrosDebitosReclamado.setValorPagoJurosDePrevidenciaPrivada(BigDecimal.ZERO);
        outrosDebitosReclamado.setValorPagoJurosDePrevidenciaPrivadaPeriodoAtual(BigDecimal.ZERO);
        BigDecimal valorDesconto = this.calcularDescontoInss(debitosDoReclamanteAnterior.getDiferencaInss(), indiceDeCorrecao, dataInicialParaLiquidacao, dataFinalParaLiquidacao);
        outrosDebitosReclamado.setValorDescontoInss(valorDesconto);
        outrosDebitosReclamado.setValorDescontoInssDebitosReclamante(valorDesconto);
        outrosDebitosReclamado.setValorInssDez(outrosDebitosReclamadoAnterior.getDiferencaInssDez());
        outrosDebitosReclamado.setValorPagoInssDez(BigDecimal.ZERO);
        outrosDebitosReclamado.setValorInssMeio(outrosDebitosReclamadoAnterior.getDiferencaInssMeio());
        outrosDebitosReclamado.setValorPagoInssMeio(BigDecimal.ZERO);
        outrosDebitosReclamado.setAtualizacao(this.getAtualizacao());
        outrosDebitosReclamado.setCreditosDoReclamante(creditoDoReclamante);
        outrosDebitosReclamado.setDataInicialPeriodo(dataInicialParaLiquidacao);
        outrosDebitosReclamado.setDataFinalPeriodo(dataFinalParaLiquidacao);
        outrosDebitosReclamado.setIndiceDeCorrecao(indiceDeCorrecao);
        outrosDebitosReclamado.setIndiceDeCorrecaoFgts(indiceDeCorrecaoDoFgts);
        outrosDebitosReclamado.setIndiceDeCorrecaoPrevPrivada(indiceDeCorrecaoDaPrevPrivada);
        outrosDebitosReclamado.setTaxaDeJuros(Utils.arredondarValor(taxaDeJuros, 4));
        if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            BigDecimal valorDescontoPrecatorio = Utils.arredondarValorMonetario(Utils.multiplicar(debitosDoReclamanteAnterior.getDiferencaInssPrecatorio(), indiceDeCorrecao));
            outrosDebitosReclamado.setValorDescontoInss(valorDescontoPrecatorio);
            outrosDebitosReclamado.setValorDescontoInssDebitosReclamante(valorDescontoPrecatorio);
            outrosDebitosReclamado.setValorDevidoIrpf(outrosDebitosReclamadoAnterior.getDiferencaIrpfPrecatorio());
            outrosDebitosReclamado.setValorPagoIrpf(BigDecimal.ZERO);
            outrosDebitosReclamado.setValorDevidoInssSalariosDevidosParaPrecatorio(outrosDebitosReclamadoAnterior.getDiferencaContribuicaoSocialSalariosDevidosPrecatorio());
            outrosDebitosReclamado.setValorDevidoInssSalariosPagosParaPrecatorio(outrosDebitosReclamadoAnterior.getDiferencaContribuicaoSocialSalariosPagosPrecatorio());
            outrosDebitosReclamado.setValorDevidoCustasParaPrecatorio(outrosDebitosReclamadoAnterior.getDiferencaCustasJudiciaisPrecatorio());
            outrosDebitosReclamado.setValorPagoCustasParaPrecatorio(BigDecimal.ZERO);
        }
        if (dataFinalParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()) || dataInicialParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()) || Utils.naoNulo(outrosDebitosReclamadoAnterior.getDiferencaJurosDePrevidenciaPrivada()) && BigDecimal.ZERO.compareTo(outrosDebitosReclamadoAnterior.getDiferencaJurosDePrevidenciaPrivada()) > 0) {
            outrosDebitosReclamado.setValorJurosDePrevidenciaPrivada(Utils.arredondarValorMonetario(outrosDebitosReclamadoAnterior.getDiferencaJurosDePrevidenciaPrivada()));
        } else {
            outrosDebitosReclamado.setValorJurosDePrevidenciaPrivada(outrosDebitosReclamadoAnterior.getValorBaseJurosDePrevidenciaPrivadaDepoisPrimeiroEvento());
        }
        for (MultaDaAtualizacao multaAnterior : outrosDebitosReclamadoAnterior.getMultasCalculadas()) {
            multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setMulta(multaAnterior.getMulta());
            multaDaAtualizacao.setTipoVinculo(multaAnterior.getTipoVinculo());
            multaDaAtualizacao.setTipoValorDaMulta(multaAnterior.getTipoValorDaMulta());
            multaDaAtualizacao.setValorMulta(multaDaAtualizacao.calcularValorDaMultaCalculadaOutros(creditoDoReclamante, creditoDoReclamanteAnterior, multaAnterior, multaAnterior.getIndiceDeCorrecao(), outrosDebitosReclamado.getValorPrevidenciaPrivada(), outrosDebitosReclamado.getValorDescontoInss(), dataFinalParaLiquidacao));
            multaDaAtualizacao.setValorJuros(multaAnterior.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : creditoDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM)));
            multaDaAtualizacao.setJaCalculadoUmaVez(multaAnterior.getJaCalculadoUmaVez());
            multaDaAtualizacao.setOutrosDebitosReclamado(outrosDebitosReclamado);
            multaDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            outrosDebitosReclamado.getMultasCalculadas().add(multaDaAtualizacao);
        }
        for (MultaDaAtualizacao multaAnterior : outrosDebitosReclamadoAnterior.getMultasInformadas()) {
            multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setMulta(multaAnterior.getMulta());
            multaDaAtualizacao.setTipoVinculo(multaAnterior.getTipoVinculo());
            multaDaAtualizacao.setTipoValorDaMulta(multaAnterior.getTipoValorDaMulta());
            multaDaAtualizacao.setOutrosDebitosReclamado(outrosDebitosReclamado);
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
            dataInicioDeJuros = AtualizacaoUtils.testarExistenciaJurosDeAte(new Periodo(outrosDebitosReclamado.getDataInicialPeriodo(), outrosDebitosReclamado.getDataFinalPeriodo()), dataInicialParaLiquidacaoMaisUm.getDate(), multaAnterior.getMulta().getOrigemRegistro(), this.getCalculo(), multaAnterior.getMulta().getDataApartirDeAplicarJuros(), multaAnterior.getMulta().getDataEvento(), multaAnterior.getPrimeiroEventoProcessado() == false);
            if (!multaDaAtualizacao.getPrimeiroEventoProcessado().booleanValue() && (dataFinalParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()) || dataInicialParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()))) {
                multaDaAtualizacao.setValorJuros(multaAnterior.devidoJuroMultaInformadaPrimeiroEvento(creditoDoReclamanteAnterior.getIndiceDeCorrecao()));
                multaDaAtualizacao.setValorMulta(multaAnterior.getMulta().getValorCorrigido());
                multaDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
            } else {
                multaDaAtualizacao.setValorMulta(Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao()), multaAnterior.getPagoMulta())));
                valorJuros = multaAnterior.devidoJuroMultaInformadaDepoisPrimeiroEvento();
                anterior = BigDecimal.ZERO;
                if (Utils.naoNulo(dataInicioDeJuros) && BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) <= 0) {
                    anterior = multaAnterior.valorJurosMultaInformadaPeriodoAnterior();
                }
                multaDaAtualizacao.setValorJuros(Utils.somar(Utils.subtrair(valorJuros, multaAnterior.getPagoJuro()), Utils.subtrair(anterior, multaAnterior.getPagoJuroPeriodoAtual())));
            }
            BigDecimal taxaJurosMulta = BigDecimal.ZERO;
            if (Utils.naoNulo(dataInicioDeJuros)) {
                taxaJurosMulta = this.calcularTaxaDeJuros(dataInicioDeJuros, dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
            }
            multaDaAtualizacao.setTaxaJurosMulta(Utils.arredondarValor(taxaJurosMulta, 4));
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            outrosDebitosReclamado.getMultasInformadas().add(multaDaAtualizacao);
        }
        for (HonorarioDaAtualizacao honorarioAnterior : outrosDebitosReclamadoAnterior.getHonorariosDaAtualizacaoCalculado()) {
            honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setHonorario(honorarioAnterior.getHonorario());
            honorarioDaAtualizacao.setTipoVinculo(honorarioAnterior.getTipoVinculo());
            honorarioDaAtualizacao.setTipoValor(honorarioAnterior.getTipoValor());
            honorarioDaAtualizacao.setValorHonorario(honorarioDaAtualizacao.calcularValorDoHonorarioCalculado(creditoDoReclamante, creditoDoReclamanteAnterior, honorarioAnterior, honorarioAnterior.getIndiceDeCorrecao(), outrosDebitosReclamado.getValorPrevidenciaPrivada(), outrosDebitosReclamado.getValorDescontoInss()));
            honorarioDaAtualizacao.setValorJuros(creditoDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioAnterior.getHonorario().getAliquota().divide(Utils.CEM)));
            honorarioDaAtualizacao.setJaCalculadoUmaVez(honorarioAnterior.getJaCalculadoUmaVez());
            honorarioDaAtualizacao.setOutrosDebitosReclamado(outrosDebitosReclamado);
            honorarioDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            if (honorarioDaAtualizacao.getValorRemanescenteHonorario() == null || outrosDebitosReclamado.getDataFinalPeriodo().equals(honorarioDaAtualizacao.getHonorario().getDataEvento()) && outrosDebitosReclamado.getDataInicialPeriodo().equals(outrosDebitosReclamado.getDataFinalPeriodo()) || outrosDebitosReclamado.getDataInicialPeriodo().equals(outrosDebitosReclamado.getCalculo().getDataDeLiquidacao())) {
                honorarioDaAtualizacao.setDevidoHonorario(honorarioDaAtualizacao.getDevidoCalculada());
            } else {
                BigDecimal devido = BigDecimal.ZERO;
                devido = Utils.somar(devido, honorarioDaAtualizacao.getDevidoCalculadaRemanescente(honorarioDaAtualizacao.getIndiceDeCorrecao()), devido);
                devido = Utils.somar(devido, outrosDebitosReclamado.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM)), devido);
                devido = Utils.somar(devido, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.calcularHonorariosSobreMultas(outrosDebitosReclamado.getCreditosDoReclamante()), honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), devido);
                honorarioDaAtualizacao.setDevidoHonorario(devido);
            }
            outrosDebitosReclamado.getHonorariosDaAtualizacaoCalculado().add(honorarioDaAtualizacao);
        }
        for (HonorarioDaAtualizacao honorarioAnterior : outrosDebitosReclamadoAnterior.getHonorariosDaAtualizacaoInformado()) {
            honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setHonorario(honorarioAnterior.getHonorario());
            honorarioDaAtualizacao.setTipoVinculo(honorarioAnterior.getTipoVinculo());
            honorarioDaAtualizacao.setTipoValor(honorarioAnterior.getTipoValor());
            honorarioDaAtualizacao.setOutrosDebitosReclamado(outrosDebitosReclamado);
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
            dataInicioDeJuros = AtualizacaoUtils.testarExistenciaJurosDeAte(new Periodo(outrosDebitosReclamado.getDataInicialPeriodo(), outrosDebitosReclamado.getDataFinalPeriodo()), dataInicialParaLiquidacaoMaisUm.getDate(), honorarioAnterior.getHonorario().getOrigemRegistro(), this.getCalculo(), honorarioAnterior.getHonorario().getDataApartirDeAplicarJuros(), honorarioAnterior.getHonorario().getDataEvento(), honorarioAnterior.getPrimeiroEventoProcessado() == false);
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
            if (Utils.naoNulo(dataInicioDeJuros) && BigDecimal.ZERO.compareTo(honorarioDaAtualizacao.getValorHonorario()) <= 0) {
                taxaJurosHonorario = this.calcularTaxaDeJuros(dataInicioDeJuros, dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
            }
            if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                taxaJurosHonorario = taxaDeJuros;
            }
            honorarioDaAtualizacao.setTaxaJurosHonorario(Utils.arredondarValor(taxaJurosHonorario, 4));
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            honorarioDaAtualizacao.setDevidoHonorario(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.getValorHonorario(), honorarioDaAtualizacao.getIndiceDeCorrecao())));
            outrosDebitosReclamado.getHonorariosDaAtualizacaoInformado().add(honorarioDaAtualizacao);
        }
        if (honorarioDoEvento != null) {
            outrosDebitosReclamado = this.incluirHonorario(outrosDebitosReclamado, creditoDoReclamante, creditoDoReclamanteAnterior, honorarioDoEvento);
        }
        if (multaDoEvento != null) {
            outrosDebitosReclamado = this.incluirMulta(outrosDebitosReclamado, creditoDoReclamante, creditoDoReclamanteAnterior, multaDoEvento);
        }
        return outrosDebitosReclamado;
    }

    private BigDecimal calcularDescontoInss(BigDecimal valorDesconto, BigDecimal indiceCorrecao, Date dataInicialOutrosDebitosNovo, Date dataFinalOutrosDebitosNovo) {
        if (BigDecimal.ZERO.compareTo(valorDesconto) > 0) {
            return BigDecimal.ZERO;
        }
        if (!this.getCalculo().getInss().getInssSobreSalariosDevidos().getCorrigirDescontoReclamante().booleanValue()) {
            BigDecimal conversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getInstance(dataInicialOutrosDebitosNovo).addDay(1).getDate(), dataFinalOutrosDebitosNovo);
            return Utils.arredondarValorMonetario(Utils.multiplicar(valorDesconto, conversaoMoeda));
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(valorDesconto, indiceCorrecao));
    }

    public OutrosDebitosReclamado aplicarPagamento(OutrosDebitosReclamado outrosDebitosReclamado, Pagamento pagamento) {
        BigDecimal valorParaPagarHonorario;
        BigDecimal valorHonorario;
        BigDecimal taxaDeJurosMulta;
        BigDecimal base;
        BigDecimal totalDevido;
        BigDecimal valorJurosPeriodoAtual;
        BigDecimal valorJuros;
        BigDecimal valorMulta;
        BigDecimal devidoJurosPeriodoAtual;
        BigDecimal devidoJuros = outrosDebitosReclamado.getDevidoJurosDePrevidenciaPrivada();
        if (Utils.nulo(devidoJuros)) {
            devidoJuros = BigDecimal.ZERO;
        }
        if (Utils.nulo(devidoJurosPeriodoAtual = outrosDebitosReclamado.getDevidoJurosDePrevidenciaPrivadaPeriodoAtual())) {
            devidoJurosPeriodoAtual = BigDecimal.ZERO;
        }
        BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(pagamento.getValorParaPagamentoOutrosDebitosReclamadoJurosDePrevidenciaPrivada(), new BigDecimal[]{devidoJuros, devidoJurosPeriodoAtual});
        outrosDebitosReclamado.setValorPagoJurosDePrevidenciaPrivada(valoresRateados[0]);
        outrosDebitosReclamado.setValorPagoJurosDePrevidenciaPrivadaPeriodoAtual(valoresRateados[1]);
        outrosDebitosReclamado.setValorPagoInssSalariosDevidos(pagamento.getValorParaPagamentoOutrosDebitosInssSalariosDevidos());
        outrosDebitosReclamado.setValorPagoInssSalariosPagos(pagamento.getValorParaPagamentoOutrosDebitosInssSalariosPagos());
        outrosDebitosReclamado.setValorPagoInssDez(pagamento.getValorParaPagamentoOutrosDebitosReclamadoInssDezPorcento());
        outrosDebitosReclamado.setValorPagoInssMeio(pagamento.getValorParaPagamentoOutrosDebitosReclamadoInssMeioPorcento());
        outrosDebitosReclamado.setValorPagoIrpf(pagamento.getValorParaPagamentoOutrosDebitosReclamadoImpostoDeRendaDoReclamante());
        for (MultaDaAtualizacao multaAnterior : outrosDebitosReclamado.getMultasCalculadas()) {
            multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            if (multaAnterior.getValorRemanescenteMulta() == null || this.getDataFinalPeriodo().equals(multaAnterior.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multaAnterior.getJaCalculadoUmaVez().booleanValue()) {
                multaAnterior.setPagoMulta(pagamento.getValoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros().get(multaAnterior.getMulta()));
                multaAnterior.setPagoJuro(BigDecimal.ZERO);
            } else {
                valorMulta = multaAnterior.getDevidoCalculadaRemanescente(multaAnterior.getIndiceDeCorrecao());
                if (Utils.nulo(valorMulta)) {
                    valorMulta = BigDecimal.ZERO;
                }
                BigDecimal bigDecimal = valorJuros = multaAnterior.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM));
                if (Utils.nulo(valorJuros)) {
                    valorJuros = BigDecimal.ZERO;
                }
                valoresRateados = PagamentoUtils.ratearValor(pagamento.getValoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros().get(multaAnterior.getMulta()), new BigDecimal[]{valorMulta, valorJuros});
                multaAnterior.setPagoMulta(valoresRateados[0]);
                multaAnterior.setPagoJuro(valoresRateados[1]);
                multaAnterior.setJaCalculadoUmaVez(true);
            }
            if (pagamento.getValoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros().get(multaAnterior.getMulta()).compareTo(BigDecimal.ZERO) == 0) continue;
            multaAnterior.setJaCalculadoUmaVez(true);
        }
        for (MultaDaAtualizacao multaAnterior : outrosDebitosReclamado.getMultasInformadas()) {
            Date dataRef;
            valorMulta = Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao()));
            if (Utils.nulo(valorMulta)) {
                valorMulta = BigDecimal.ZERO;
            }
            valorJuros = BigDecimal.ZERO;
            valorJurosPeriodoAtual = BigDecimal.ZERO;
            totalDevido = valorMulta;
            Date date = multaAnterior.getMulta().getDataApartirDeAplicarJuros() != null ? multaAnterior.getMulta().getDataApartirDeAplicarJuros() : (dataRef = multaAnterior.getMulta().getDataEvento() != null ? multaAnterior.getMulta().getDataEvento() : multaAnterior.getMulta().getDataVencimentoMulta());
            if (HelperDate.dateAfterOrEquals(this.getDataFinalPeriodo(), dataRef)) {
                valorJuros = Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorJuros(), multaAnterior.getIndiceDeCorrecao()));
                totalDevido = Utils.somar(totalDevido, valorJuros, totalDevido);
                base = multaAnterior.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                taxaDeJurosMulta = multaAnterior.getTaxaJurosMulta() != null ? multaAnterior.getTaxaJurosMulta() : outrosDebitosReclamado.getTaxaDeJuros();
                valorJurosPeriodoAtual = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosMulta.divide(Utils.CEM)));
                totalDevido = Utils.somar(totalDevido, valorJurosPeriodoAtual, totalDevido);
            }
            BigDecimal valorParaPagarMulta = pagamento.getValoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros().get(multaAnterior.getMulta());
            if (BigDecimal.ZERO.compareTo(totalDevido) > 0) {
                multaAnterior.setPagoJuro(BigDecimal.ZERO);
                multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                multaAnterior.setPagoMulta(valorParaPagarMulta);
                continue;
            }
            if (totalDevido.compareTo(valorParaPagarMulta) < 0) {
                multaAnterior.setPagoJuro(valorJuros);
                multaAnterior.setPagoJuroPeriodoAtual(valorJurosPeriodoAtual);
                multaAnterior.setPagoMulta(Utils.subtrair(Utils.subtrair(valorParaPagarMulta, valorJuros), valorJurosPeriodoAtual));
                continue;
            }
            valoresRateados = PagamentoUtils.ratearValor(valorParaPagarMulta, new BigDecimal[]{valorMulta, valorJuros, valorJurosPeriodoAtual});
            multaAnterior.setPagoMulta(valoresRateados[0]);
            multaAnterior.setPagoJuro(valoresRateados[1]);
            multaAnterior.setPagoJuroPeriodoAtual(valoresRateados[2]);
        }
        for (HonorarioDaAtualizacao honorarioDaAtualizacaoAnterior : outrosDebitosReclamado.getHonorariosDaAtualizacaoCalculado()) {
            honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            if (honorarioDaAtualizacaoAnterior.getValorRemanescenteHonorario() == null || this.getDataFinalPeriodo().equals(honorarioDaAtualizacaoAnterior.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !honorarioDaAtualizacaoAnterior.getJaCalculadoUmaVez().booleanValue()) {
                honorarioDaAtualizacaoAnterior.setPagoHonorario(pagamento.getValoresParaPagamentoOutrosDebitosReclamadoDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario()));
                honorarioDaAtualizacaoAnterior.setPagoJuro(BigDecimal.ZERO);
                honorarioDaAtualizacaoAnterior.setPagoSobreMultas(BigDecimal.ZERO);
            } else {
                BigDecimal valorSobreMulta;
                valorHonorario = honorarioDaAtualizacaoAnterior.getDevidoCalculadaRemanescente(honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao());
                if (Utils.nulo(valorHonorario)) {
                    valorHonorario = BigDecimal.ZERO;
                }
                if (Utils.nulo(valorJuros = this.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacaoAnterior.getHonorario().getAliquota().divide(Utils.CEM)))) {
                    valorJuros = BigDecimal.ZERO;
                }
                if (Utils.nulo(valorSobreMulta = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.calcularHonorariosSobreMultas(this.getCreditosDoReclamante()), honorarioDaAtualizacaoAnterior.getHonorario().getAliquota().divide(Utils.CEM))))) {
                    valorSobreMulta = BigDecimal.ZERO;
                }
                totalDevido = Utils.somar(valorHonorario, valorJuros);
                totalDevido = Utils.somar(totalDevido, valorSobreMulta);
                BigDecimal totalSobreJuros = Utils.somar(valorJuros, valorSobreMulta);
                valorParaPagarHonorario = pagamento.getValoresParaPagamentoOutrosDebitosReclamadoDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario());
                if (BigDecimal.ZERO.compareTo(valorHonorario) > 0 && BigDecimal.ZERO.compareTo(totalSobreJuros) < 0) {
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(Utils.zerarSeNegativo(Utils.subtrair(valorParaPagarHonorario, totalSobreJuros)));
                    valoresRateados = PagamentoUtils.ratearValor(Utils.subtrair(valorParaPagarHonorario, honorarioDaAtualizacaoAnterior.getPagoHonorario()), new BigDecimal[]{valorJuros, valorSobreMulta});
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valoresRateados[0]);
                    honorarioDaAtualizacaoAnterior.setPagoSobreMultas(valoresRateados[1]);
                } else if (totalDevido.compareTo(valorParaPagarHonorario) < 0) {
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valorJuros);
                    honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(valorSobreMulta);
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(Utils.subtrair(Utils.subtrair(valorParaPagarHonorario, valorJuros), valorSobreMulta));
                } else {
                    valoresRateados = PagamentoUtils.ratearValor(valorParaPagarHonorario, new BigDecimal[]{valorHonorario, valorJuros, valorSobreMulta});
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(valoresRateados[0]);
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valoresRateados[1]);
                    honorarioDaAtualizacaoAnterior.setPagoSobreMultas(valoresRateados[2]);
                }
            }
            if (pagamento.getValoresParaPagamentoOutrosDebitosReclamadoDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario()).compareTo(BigDecimal.ZERO) != 0) {
                honorarioDaAtualizacaoAnterior.setJaCalculadoUmaVez(true);
            }
            honorarioDaAtualizacaoAnterior = MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioDaAtualizacaoAnterior, pagamento.getDataPagamento());
        }
        for (HonorarioDaAtualizacao honorarioDaAtualizacaoAnterior : outrosDebitosReclamado.getHonorariosDaAtualizacaoInformado()) {
            valorHonorario = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorHonorario(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao()));
            if (Utils.nulo(valorHonorario)) {
                valorHonorario = BigDecimal.ZERO;
            }
            valorJuros = BigDecimal.ZERO;
            valorJurosPeriodoAtual = BigDecimal.ZERO;
            BigDecimal valorImpostoRenda = BigDecimal.ZERO;
            BigDecimal totalDevido2 = valorHonorario;
            if (!this.getDataFinalPeriodo().equals(honorarioDaAtualizacaoAnterior.getHonorario().getDataEvento())) {
                valorJuros = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorJuros(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao()));
                totalDevido2 = Utils.somar(totalDevido2, valorJuros, totalDevido2);
                base = honorarioDaAtualizacaoAnterior.getHonorario().getAplicarJuros() != false || this.getAtualizacao().getAtualizarRegraPrecatorio() != false && TipoValorEnum.CALCULADO.equals((Object)honorarioDaAtualizacaoAnterior.getHonorario().getTipoValor()) ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorHonorario(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                taxaDeJurosMulta = honorarioDaAtualizacaoAnterior.getTaxaJurosHonorario() != null ? honorarioDaAtualizacaoAnterior.getTaxaJurosHonorario() : outrosDebitosReclamado.getTaxaDeJuros();
                valorJurosPeriodoAtual = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosMulta.divide(Utils.CEM)));
                totalDevido2 = Utils.somar(totalDevido2, valorJurosPeriodoAtual, totalDevido2);
                if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                    valorImpostoRenda = Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorImpostoRenda(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao());
                    totalDevido2 = Utils.somar(totalDevido2, valorImpostoRenda, totalDevido2);
                }
            }
            valorParaPagarHonorario = pagamento.getValoresParaPagamentoOutrosDebitosReclamadoDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario());
            if (BigDecimal.ZERO.compareTo(totalDevido2) > 0) {
                honorarioDaAtualizacaoAnterior.setPagoJuro(BigDecimal.ZERO);
                honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                honorarioDaAtualizacaoAnterior.setPagoImpostoRenda(BigDecimal.ZERO);
                honorarioDaAtualizacaoAnterior.setPagoHonorario(valorParaPagarHonorario);
            } else if (totalDevido2.compareTo(valorParaPagarHonorario) < 0) {
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
            honorarioDaAtualizacaoAnterior.setPagoSobreMultas(BigDecimal.ZERO);
            if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) continue;
            honorarioDaAtualizacaoAnterior = MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioDaAtualizacaoAnterior, pagamento.getDataPagamento());
        }
        outrosDebitosReclamado.setTotalPago(outrosDebitosReclamado.calcularTotalPago());
        outrosDebitosReclamado.setTotalDiferenca(outrosDebitosReclamado.calcularTotalDiferenca());
        return outrosDebitosReclamado;
    }

    public OutrosDebitosReclamado incluirMulta(OutrosDebitosReclamado outrosDebitosReclamado, CreditosDoReclamante creditoDoReclamantePagamento, CreditosDoReclamante creditoDoReclamantePagamentoAnterior, Multa multaDoEvento) {
        if (multaDoEvento.getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO)) {
            MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setMulta(multaDoEvento);
            multaDaAtualizacao.setTipoVinculo(multaDoEvento.getTipoCredorDevedor());
            multaDaAtualizacao.setTipoValorDaMulta(multaDoEvento.getTipoValorDaMulta());
            multaDaAtualizacao.setOutrosDebitosReclamado(outrosDebitosReclamado);
            multaDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            if (multaDoEvento.getTipoValorDaMulta() == TipoValorEnum.CALCULADO) {
                multaDaAtualizacao.setValorMulta(multaDaAtualizacao.calcularValorDaMultaCalculadaOutros(creditoDoReclamantePagamento, creditoDoReclamantePagamentoAnterior, null, outrosDebitosReclamado.getIndiceDeCorrecao(), outrosDebitosReclamado.getValorPrevidenciaPrivada(), outrosDebitosReclamado.getValorDescontoInss(), outrosDebitosReclamado.getDataFinalPeriodo()));
                outrosDebitosReclamado.getMultasCalculadas().add(multaDaAtualizacao);
            } else {
                multaDaAtualizacao.setValorMulta(multaDoEvento.getValorMulta());
                multaDaAtualizacao.setValorJuros(BigDecimal.ZERO);
                multaDaAtualizacao.setTaxaJurosMulta(Utils.arredondarValor(this.calcularTaxaJuros(outrosDebitosReclamado.getDataFinalPeriodo(), multaDoEvento, null), 4));
                multaDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
                outrosDebitosReclamado.getMultasInformadas().add(multaDaAtualizacao);
            }
            multaDaAtualizacao.setJaCalculadoUmaVez(this.getAtualizacao().getBaseMultaJaPaga());
        }
        return outrosDebitosReclamado;
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

    public OutrosDebitosReclamado incluirHonorario(OutrosDebitosReclamado outrosDebitosReclamado, CreditosDoReclamante creditoDoReclamante, CreditosDoReclamante creditoDoReclamanteAnterior, Honorario honorarioDoEvento) {
        if (TipoDeDevedorDoHonorarioEnum.RECLAMADO.equals((Object)honorarioDoEvento.getTipoDeDevedor())) {
            HonorarioDaAtualizacao honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setOutrosDebitosReclamado(outrosDebitosReclamado);
            honorarioDaAtualizacao.setHonorario(honorarioDoEvento);
            honorarioDaAtualizacao.setTipoVinculo(TipoVinculoDeHonorarioDoPagamentoEnum.OUTROSDEBITOSRECLAMADO);
            honorarioDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            if (TipoValorEnum.CALCULADO.equals((Object)honorarioDoEvento.getTipoValor())) {
                honorarioDaAtualizacao.setTipoValor(TipoValorEnum.CALCULADO);
                honorarioDaAtualizacao.setValorHonorario(honorarioDoEvento.getValor());
                honorarioDaAtualizacao.setValorHonorario(honorarioDaAtualizacao.calcularValorDoHonorarioCalculado(creditoDoReclamante, creditoDoReclamanteAnterior, null, BigDecimal.ONE, outrosDebitosReclamado.getValorPrevidenciaPrivada(), outrosDebitosReclamado.getValorDescontoInss()));
                outrosDebitosReclamado.getHonorariosDaAtualizacaoCalculado().add(honorarioDaAtualizacao);
            } else {
                honorarioDaAtualizacao.setTipoValor(TipoValorEnum.INFORMADO);
                honorarioDaAtualizacao.setValorHonorario(honorarioDoEvento.getValor());
                honorarioDaAtualizacao.setTaxaJurosHonorario(Utils.arredondarValor(this.calcularTaxaJuros(outrosDebitosReclamado.getDataFinalPeriodo(), null, honorarioDoEvento), 4));
                honorarioDaAtualizacao.setValorJuros(BigDecimal.ZERO);
                honorarioDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
                outrosDebitosReclamado.getHonorariosDaAtualizacaoInformado().add(honorarioDaAtualizacao);
            }
            honorarioDaAtualizacao.setJaCalculadoUmaVez(this.getAtualizacao().getBaseHonorarioJaPaga());
        }
        return outrosDebitosReclamado;
    }

    public BigDecimal calcularTotalDevidoSemCustas() {
        BigDecimal dev;
        BigDecimal base;
        BigDecimal devido;
        BigDecimal totalDevido = BigDecimal.ZERO;
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            if (Utils.nulo(multaCalculada.getValorRemanescenteMulta()) || this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                totalDevido = Utils.somar(totalDevido, multaCalculada.getDevidoCalculada(), totalDevido);
                continue;
            }
            totalDevido = Utils.somar(totalDevido, multaCalculada.getDevidoCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), totalDevido);
            totalDevido = Utils.somar(totalDevido, multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)), totalDevido);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            totalDevido = Utils.somar(totalDevido, Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())), totalDevido);
            if (!this.podeCalcularJurosDeMulta(multaInformada.getMulta())) continue;
            devido = BigDecimal.ZERO;
            if (multaInformada.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
            }
            totalDevido = Utils.somar(totalDevido, devido, totalDevido);
            base = multaInformada.getMulta().getAplicarJurosSobreMulta() != false && BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaInformada.getTaxaJurosMulta().divide(Utils.CEM)));
            totalDevido = Utils.somar(totalDevido, dev, totalDevido);
        }
        for (HonorarioDaAtualizacao honorarioCalculado : this.getHonorariosDaAtualizacaoCalculado()) {
            if (Utils.nulo(honorarioCalculado.getValorRemanescenteHonorario()) || this.getDataFinalPeriodo().equals(honorarioCalculado.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !honorarioCalculado.getJaCalculadoUmaVez().booleanValue()) {
                totalDevido = Utils.somar(totalDevido, honorarioCalculado.getDevidoCalculada(), totalDevido);
                continue;
            }
            totalDevido = Utils.somar(totalDevido, honorarioCalculado.getDevidoCalculadaRemanescente(honorarioCalculado.getIndiceDeCorrecao()), totalDevido);
            totalDevido = Utils.somar(totalDevido, this.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM)), totalDevido);
            totalDevido = Utils.somar(totalDevido, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioCalculado.calcularHonorariosSobreMultas(this.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM))), totalDevido);
        }
        for (HonorarioDaAtualizacao honorarioInformado : this.getHonorariosDaAtualizacaoInformado()) {
            totalDevido = Utils.somar(totalDevido, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())), totalDevido);
            if (!this.podeCalcularJurosDeHonorario(honorarioInformado.getHonorario())) continue;
            devido = BigDecimal.ZERO;
            if (honorarioInformado.getHonorario().getAplicarJuros().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), honorarioInformado.getIndiceDeCorrecao()));
            }
            totalDevido = Utils.somar(totalDevido, devido, totalDevido);
            base = honorarioInformado.getHonorario().getAplicarJuros() != false && BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, honorarioInformado.getTaxaJurosHonorario().divide(Utils.CEM)));
            totalDevido = Utils.somar(totalDevido, dev, totalDevido);
        }
        if (Utils.naoNulo(this.getDevidoContribuicaoSocialSalariosDevidos())) {
            totalDevido = Utils.somar(totalDevido, this.getDevidoContribuicaoSocialSalariosDevidos(), totalDevido);
        }
        if (Utils.naoNulo(this.getDevidoContribuicaoSocialSalariosPagos())) {
            totalDevido = Utils.somar(totalDevido, this.getDevidoContribuicaoSocialSalariosPagos(), totalDevido);
        }
        if (Utils.naoNulo(this.getDevidoJurosDePrevidenciaPrivada())) {
            totalDevido = Utils.somar(totalDevido, this.getDevidoJurosDePrevidenciaPrivada(), totalDevido);
        }
        if (Utils.naoNulo(this.getDevidoJurosDePrevidenciaPrivadaPeriodoAtual())) {
            totalDevido = Utils.somar(totalDevido, this.getDevidoJurosDePrevidenciaPrivadaPeriodoAtual(), totalDevido);
        }
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            totalDevido = Utils.somar(totalDevido, this.getValorDevidoIrpf(), totalDevido);
        }
        if (Boolean.TRUE.equals(this.getCalculo().getFgts().getMulta10())) {
            totalDevido = Utils.somar(totalDevido, this.getDevidoInssDez(), totalDevido);
        }
        if (Boolean.TRUE.equals(this.getCalculo().getFgts().getContribuicaoSocial05())) {
            totalDevido = Utils.somar(totalDevido, this.getDevidoInssMeio(), totalDevido);
        }
        return totalDevido;
    }

    public BigDecimal calcularTotalDevido() {
        BigDecimal totalDevido = this.calcularTotalDevidoSemCustas();
        if (Utils.naoNulo(this.getCustasJudiciaisDaAtualizacao())) {
            totalDevido = Utils.somar(totalDevido, this.getDevidoCustasJudiciais(), totalDevido);
        }
        return totalDevido;
    }

    public BigDecimal calcularTotalPago() {
        BigDecimal totalPago = BigDecimal.ZERO;
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            if (Utils.nulo(multaCalculada.getValorRemanescenteMulta()) || this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                totalPago = Utils.somar(totalPago, multaCalculada.getPagoMulta(), totalPago);
                continue;
            }
            totalPago = Utils.somar(totalPago, multaCalculada.getPagoMulta(), totalPago);
            totalPago = Utils.somar(totalPago, multaCalculada.getPagoJuro(), totalPago);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            totalPago = Utils.somar(totalPago, multaInformada.getPagoMulta(), totalPago);
            if (!this.podeCalcularJurosDeMulta(multaInformada.getMulta())) continue;
            totalPago = Utils.somar(totalPago, multaInformada.getPagoJuro(), totalPago);
            totalPago = Utils.somar(totalPago, multaInformada.getPagoJuroPeriodoAtual(), totalPago);
        }
        for (HonorarioDaAtualizacao honorarioCalculado : this.getHonorariosDaAtualizacaoCalculado()) {
            if (Utils.nulo(honorarioCalculado.getValorRemanescenteHonorario()) || this.getDataFinalPeriodo().equals(honorarioCalculado.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !honorarioCalculado.getJaCalculadoUmaVez().booleanValue()) {
                totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoHonorario(), totalPago);
                continue;
            }
            totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoHonorario(), totalPago);
            totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoJuro(), totalPago);
            totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoSobreMultas(), totalPago);
        }
        for (HonorarioDaAtualizacao honorarioInformado : this.getHonorariosDaAtualizacaoInformado()) {
            totalPago = Utils.somar(totalPago, honorarioInformado.getPagoHonorario(), totalPago);
            if (this.podeCalcularJurosDeHonorario(honorarioInformado.getHonorario())) {
                totalPago = Utils.somar(totalPago, honorarioInformado.getPagoJuro(), totalPago);
                totalPago = Utils.somar(totalPago, honorarioInformado.getPagoJuroPeriodoAtual(), totalPago);
            }
            if (!this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) continue;
            totalPago = Utils.somar(totalPago, honorarioInformado.getPagoImpostoRenda(), totalPago);
        }
        if (Utils.naoNulo(this.getValorPagoInssSalariosDevidos())) {
            totalPago = Utils.somar(totalPago, this.getValorPagoInssSalariosDevidos(), totalPago);
        }
        if (Utils.naoNulo(this.getValorPagoInssSalariosPagos())) {
            totalPago = Utils.somar(totalPago, this.getValorPagoInssSalariosPagos(), totalPago);
        }
        if (Utils.naoNulo(this.getValorPagoJurosDePrevidenciaPrivada())) {
            totalPago = Utils.somar(totalPago, this.getValorPagoJurosDePrevidenciaPrivada(), totalPago);
        }
        if (Utils.naoNulo(this.getValorPagoJurosDePrevidenciaPrivadaPeriodoAtual())) {
            totalPago = Utils.somar(totalPago, this.getValorPagoJurosDePrevidenciaPrivadaPeriodoAtual(), totalPago);
        }
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            totalPago = Utils.somar(totalPago, this.getValorPagoIrpf(), totalPago);
        }
        if (Boolean.TRUE.equals(this.getCalculo().getFgts().getMulta10())) {
            totalPago = Utils.somar(totalPago, this.getValorPagoInssDez(), totalPago);
        }
        if (Boolean.TRUE.equals(this.getCalculo().getFgts().getContribuicaoSocial05())) {
            totalPago = Utils.somar(totalPago, this.getValorPagoInssMeio(), totalPago);
        }
        if (Utils.naoNulo(this.getCustasJudiciaisDaAtualizacao())) {
            totalPago = Utils.somar(totalPago, this.getPagoCustasJudiciais(), totalPago);
        }
        return totalPago;
    }

    public BigDecimal calcularTotalDiferenca() {
        BigDecimal diferencaJuroAtual;
        BigDecimal dev;
        BigDecimal base;
        BigDecimal diferencaJuro;
        BigDecimal devido;
        BigDecimal totalDiferenca = BigDecimal.ZERO;
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            if (Utils.nulo(multaCalculada.getValorRemanescenteMulta()) || this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                totalDiferenca = Utils.somar(totalDiferenca, multaCalculada.getDiferencaCalculadaOutros(), totalDiferenca);
                continue;
            }
            totalDiferenca = Utils.somar(totalDiferenca, multaCalculada.getDiferencaCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), totalDiferenca);
            totalDiferenca = Utils.somar(totalDiferenca, multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM), multaCalculada.getPagoJuro()), totalDiferenca);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()), multaInformada.getPagoMulta(), Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaMulta, totalDiferenca);
            if (BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 || !this.podeCalcularJurosDeMulta(multaInformada.getMulta())) continue;
            devido = BigDecimal.ZERO;
            if (multaInformada.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
            }
            diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaInformada.getPagoJuro(), devido));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
            base = multaInformada.getMulta().getAplicarJurosSobreMulta() != false && BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaInformada.getTaxaJurosMulta().divide(Utils.CEM)));
            diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaInformada.getPagoJuroPeriodoAtual(), dev));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
        }
        for (HonorarioDaAtualizacao honorarioCalculado : this.getHonorariosDaAtualizacaoCalculado()) {
            if (Utils.nulo(honorarioCalculado.getValorRemanescenteHonorario()) || this.getDataFinalPeriodo().equals(honorarioCalculado.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo()) || this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && !honorarioCalculado.getJaCalculadoUmaVez().booleanValue()) {
                totalDiferenca = Utils.somar(totalDiferenca, honorarioCalculado.getDiferencaCalculadaOutros(), totalDiferenca);
                continue;
            }
            totalDiferenca = Utils.somar(totalDiferenca, honorarioCalculado.getDiferencaCalculadaRemanescente(honorarioCalculado.getIndiceDeCorrecao()), totalDiferenca);
            totalDiferenca = Utils.somar(totalDiferenca, this.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM), honorarioCalculado.getPagoJuro()), totalDiferenca);
            totalDiferenca = Utils.somar(totalDiferenca, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioCalculado.calcularHonorariosSobreMultas(this.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM))), honorarioCalculado.getPagoSobreMultas()), totalDiferenca);
        }
        for (HonorarioDaAtualizacao honorarioInformado : this.getHonorariosDaAtualizacaoInformado()) {
            BigDecimal diferencaHonorario = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao()), honorarioInformado.getPagoHonorario(), Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaHonorario, totalDiferenca);
            if (BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) > 0 || !this.podeCalcularJurosDeHonorario(honorarioInformado.getHonorario())) continue;
            devido = BigDecimal.ZERO;
            if (honorarioInformado.getHonorario().getAplicarJuros().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), honorarioInformado.getIndiceDeCorrecao()));
            }
            diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioInformado.getPagoJuro(), devido));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
            base = honorarioInformado.getHonorario().getAplicarJuros() != false && BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, honorarioInformado.getTaxaJurosHonorario().divide(Utils.CEM)));
            diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioInformado.getPagoJuroPeriodoAtual(), dev));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
        }
        if (Utils.naoNulo(this.getDiferencaContribuicaoSocialSalariosDevidos())) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaContribuicaoSocialSalariosDevidos(), totalDiferenca);
        }
        if (Utils.naoNulo(this.getDiferencaContribuicaoSocialSalariosPagos())) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaContribuicaoSocialSalariosPagos(), totalDiferenca);
        }
        if (Utils.naoNulo(this.getDiferencaJurosDePrevidenciaPrivada())) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaJurosDePrevidenciaPrivada(), totalDiferenca);
        }
        if (Utils.naoNulo(this.getDiferencaJurosDePrevidenciaPrivadaPeriodoAtual())) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaJurosDePrevidenciaPrivadaPeriodoAtual(), totalDiferenca);
        }
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaIrpf(), totalDiferenca);
        }
        if (Boolean.TRUE.equals(this.getCalculo().getFgts().getMulta10())) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaInssDez(), totalDiferenca);
        }
        if (Boolean.TRUE.equals(this.getCalculo().getFgts().getContribuicaoSocial05())) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaInssMeio(), totalDiferenca);
        }
        if (Utils.naoNulo(this.getCustasJudiciaisDaAtualizacao())) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaCustasJudiciais(), totalDiferenca);
        }
        return totalDiferenca;
    }

    public BigDecimal getDevidoCustasJudiciais() {
        return Utils.arredondarValorMonetario(this.getCustasJudiciaisDaAtualizacao().totalDevidoReclamado());
    }

    public BigDecimal getPagoCustasJudiciais() {
        return this.getCustasJudiciaisDaAtualizacao().getValorPagoReclamado();
    }

    public BigDecimal getDiferencaCustasJudiciais() {
        return Utils.arredondarValorMonetario(this.getCustasJudiciaisDaAtualizacao().getTotalDiferencaReclamado());
    }

    public OutrosDebitosReclamado atualizarDevidoDeImpostoDeRenda(Pagamento pagamento) {
        BigDecimal valorDevido = null;
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            valorDevido = Utils.arredondarValorMonetario(this.getCalculo().getIrpf().getTotalDevidoComJurosEMultaAtualizacao(pagamento.getDataPagamento()));
        }
        if (Utils.nulo(valorDevido)) {
            valorDevido = BigDecimal.ZERO;
        }
        this.setValorDevidoIrpf(valorDevido);
        return this;
    }

    public OutrosDebitosReclamado atualizarDadosDeImpostoDeRendaAte(Date dataAtualizacao) {
        BigDecimal valorDevido = null;
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
            valorDevido = Utils.arredondarValorMonetario(this.getCalculo().getIrpf().getTotalDevidoComJurosEMultaAtualizacao(dataAtualizacao));
        }
        if (Utils.nulo(valorDevido)) {
            valorDevido = BigDecimal.ZERO;
        }
        this.setValorDevidoIrpf(valorDevido);
        this.setValorPagoIrpf(BigDecimal.ZERO);
        return this;
    }

    public OutrosDebitosReclamado atualizarDadosDeImpostoDeRendaAteSaldo(Boolean ultimoEventoPgto) {
        BigDecimal valorDevido = BigDecimal.ZERO;
        if (this.getCalculo().getIrpf().getApurarImpostoRenda().booleanValue() && this.getCalculo().getIrpf().getCobrarDoReclamado().booleanValue()) {
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

    private boolean podeCalcularJurosDeMulta(Multa multa) {
        Date dataRef = multa.getDataApartirDeAplicarJuros() != null ? multa.getDataApartirDeAplicarJuros() : (multa.getDataEvento() != null ? multa.getDataEvento() : multa.getDataVencimentoMulta());
        return multa.getAplicarJurosSobreMulta() != false && HelperDate.dateAfterOrEquals(this.getDataFinalPeriodo(), dataRef);
    }

    private boolean podeCalcularJurosDeHonorario(Honorario honorario) {
        Date dataRef = honorario.getDataApartirDeAplicarJuros() != null ? honorario.getDataApartirDeAplicarJuros() : (honorario.getDataEvento() != null ? honorario.getDataEvento() : honorario.getDataVencimento());
        return honorario.getAplicarJuros() != false && HelperDate.dateAfterOrEquals(this.getDataFinalPeriodo(), dataRef);
    }
}

