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
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.EntidadeAgregada;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndicesAcumuladosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Transient;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBVINCULOATUALIZACAOMULTA")
@SequenceGenerator(name="SQVINCULOATUALIZACAOMULTA", sequenceName="SQVINCULOATUALIZACAOMULTA", allocationSize=1)
@Name(value="multaDaAtualizacao")
public class MultaDaAtualizacao
extends EntidadeAgregada
implements Comparable<MultaDaAtualizacao> {
    private static final long serialVersionUID = 4466529296239033805L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVINCULOATUALIZACAOMULTA")
    @Column(name="IIDVINCULOATUALIZACAOMULTA")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDMULTA")
    private Multa multa;
    @OneToOne
    @JoinColumn(name="IIDCREDITORECLAMANTEPAG")
    private CreditosDoReclamante creditoDoReclamantePagamento;
    @OneToOne
    @JoinColumn(name="IIDOUTROSDEBITOS")
    private OutrosDebitosReclamado outrosDebitosReclamado;
    @OneToOne
    @JoinColumn(name="IIDDEBITOSRECLAMANTE")
    private DebitosDoReclamante debitosDoReclamante;
    @OneToOne
    @JoinColumn(name="IIDDEBITOSCOBRARRECLAMANTE")
    private DebitosCobrarDoReclamante debitosCobrarDoReclamante;
    @Column(name="MVLINDICECORRECAO", precision=38, scale=25)
    private BigDecimal indiceDeCorrecao;
    @Column(name="MVLPAGAMENTO", precision=12, scale=2)
    private BigDecimal pagamento;
    @Column(name="STPVINCULO", columnDefinition="VARCHAR2(4)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="CredorDevedorMultaEnum")})
    private CredorDevedorMultaEnum tipoVinculo = CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE;
    @Column(name="STPMULTA", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValorDaMulta = TipoValorEnum.CALCULADO;
    @Column(name="MVLMULTA", precision=12, scale=2)
    private BigDecimal valorMulta;
    @Column(name="MVLPAGOMULTA", precision=12, scale=2)
    private BigDecimal pagoMulta;
    @Column(name="MVLPAGOJURO", precision=12, scale=2)
    private BigDecimal pagoJuro;
    @Column(name="MVLPAGOJUROPERIODOATUAL", precision=12, scale=2)
    private BigDecimal pagoJuroPeriodoAtual;
    @Column(name="MVLREMANESCENTEMULTA", precision=12, scale=2)
    private BigDecimal valorRemanescenteMulta;
    @Column(name="MVLJUROSMULTA", precision=12, scale=2)
    private BigDecimal valorJuros;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaJurosMulta;
    @Column(name="SFLJACALCULADOUMAVEZ", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jaCalculadoUmaVez = Boolean.FALSE;
    @Transient
    private Boolean primeiroEventoProcessado = Boolean.FALSE;

    public MultaDaAtualizacao() {
    }

    public MultaDaAtualizacao(Multa multa, BigDecimal pagamento, BigDecimal valorMulta, CredorDevedorMultaEnum tipoVinculo, TipoValorEnum tipoValorDaMulta) {
        this();
        this.multa = multa;
        this.pagamento = pagamento;
        this.valorMulta = valorMulta;
        this.tipoVinculo = tipoVinculo;
        this.tipoValorDaMulta = tipoValorDaMulta;
    }

    public Long getId() {
        return this.id;
    }

    public BigDecimal getValorJuros() {
        return this.valorJuros;
    }

    public void setValorJuros(BigDecimal valorJuros) {
        this.valorJuros = valorJuros;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Multa getMulta() {
        return this.multa;
    }

    public void setMulta(Multa multa) {
        this.multa = multa;
    }

    public BigDecimal getIndiceDeCorrecao() {
        return this.indiceDeCorrecao;
    }

    public void setIndiceDeCorrecao(BigDecimal indiceDeCorrecao) {
        this.indiceDeCorrecao = indiceDeCorrecao;
    }

    public BigDecimal getPagamento() {
        return this.pagamento;
    }

    public void setPagamento(BigDecimal pagamento) {
        this.pagamento = pagamento;
    }

    public CredorDevedorMultaEnum getTipoVinculo() {
        return this.tipoVinculo;
    }

    public void setTipoVinculo(CredorDevedorMultaEnum tipoVinculo) {
        this.tipoVinculo = tipoVinculo;
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

    public CreditosDoReclamante getCreditoDoReclamantePagamento() {
        return this.creditoDoReclamantePagamento;
    }

    public void setCreditoDoReclamantePagamento(CreditosDoReclamante creditoDoReclamantePagamento) {
        this.creditoDoReclamantePagamento = creditoDoReclamantePagamento;
    }

    public OutrosDebitosReclamado getOutrosDebitosReclamado() {
        return this.outrosDebitosReclamado;
    }

    public void setOutrosDebitosReclamado(OutrosDebitosReclamado outrosDebitosReclamado) {
        this.outrosDebitosReclamado = outrosDebitosReclamado;
    }

    public DebitosDoReclamante getDebitosDoReclamante() {
        return this.debitosDoReclamante;
    }

    public void setDebitosDoReclamante(DebitosDoReclamante debitosDoReclamante) {
        this.debitosDoReclamante = debitosDoReclamante;
    }

    public BigDecimal getPagoMulta() {
        return this.pagoMulta;
    }

    public void setPagoMulta(BigDecimal pagoMulta) {
        this.pagoMulta = pagoMulta;
    }

    public BigDecimal getValorRemanescenteMulta() {
        return this.valorRemanescenteMulta;
    }

    public void setValorRemanescenteMulta(BigDecimal valorRemanescenteMulta) {
        this.valorRemanescenteMulta = valorRemanescenteMulta;
    }

    public BigDecimal getPagoJuro() {
        return this.pagoJuro;
    }

    public void setPagoJuro(BigDecimal pagoJuro) {
        this.pagoJuro = pagoJuro;
    }

    public BigDecimal getPagoJuroPeriodoAtual() {
        return this.pagoJuroPeriodoAtual;
    }

    public void setPagoJuroPeriodoAtual(BigDecimal pagoJuroPeriodoAtual) {
        this.pagoJuroPeriodoAtual = pagoJuroPeriodoAtual;
    }

    public Boolean getJaCalculadoUmaVez() {
        return this.jaCalculadoUmaVez;
    }

    public void setJaCalculadoUmaVez(Boolean jaCalculadoUmaVez) {
        this.jaCalculadoUmaVez = jaCalculadoUmaVez;
    }

    public DebitosCobrarDoReclamante getDebitosCobrarDoReclamante() {
        return this.debitosCobrarDoReclamante;
    }

    public void setDebitosCobrarDoReclamante(DebitosCobrarDoReclamante debitosCobrarDoReclamante) {
        this.debitosCobrarDoReclamante = debitosCobrarDoReclamante;
    }

    public Boolean getPrimeiroEventoProcessado() {
        return this.primeiroEventoProcessado;
    }

    public void setPrimeiroEventoProcessado(Boolean primeiroEventoProcessado) {
        this.primeiroEventoProcessado = primeiroEventoProcessado;
    }

    public BigDecimal calcularValorDaMultaCalculadaCreditosDoReclamante(CreditosDoReclamante creditoDoReclamantePagamento, CreditosDoReclamante creditoDoReclamantePagamentoAnterior, MultaDaAtualizacao multaAnterior, BigDecimal indiceDeCorrecaoAnterior, BigDecimal previdenciaPrivadaCorrigido, BigDecimal descontoInssCorrigido, Date dataFinal) {
        if (multaAnterior == null || !multaAnterior.getJaCalculadoUmaVez().booleanValue()) {
            BigDecimal baseSemDesconto = BigDecimal.ZERO;
            if (this.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA)) {
                Calculo calculo = this.getMulta().getCalculo();
                TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(calculo.getAtualizacaoMonetaria(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, calculo.getIgnorarTaxaCorrecaoNegativa());
                tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(calculo.getDataAjuizamento(), dataFinal));
                BigDecimal indiceDeCorrecao = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(calculo.getDataAjuizamento());
                BigDecimal valorDaCausa = this.getMulta().getCalculo().getProcesso().getValorDaCausa();
                baseSemDesconto = Utils.arredondarValorMonetario(Utils.multiplicar(valorDaCausa, indiceDeCorrecao));
            } else {
                BigDecimal parcialPrincipal = Utils.somar(Utils.somar(creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipal(), creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipalPeriodoAtual()), Utils.somar(creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsPeriodoAtual(), creditoDoReclamantePagamento.getDevidoPrincipal()));
                baseSemDesconto = Utils.arredondarValorMonetario(Utils.somar(parcialPrincipal, Utils.somar(creditoDoReclamantePagamento.getDevidoFgts(), creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsAtePrimeiraAtualizacao())));
                if (this.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL)) {
                    baseSemDesconto = Utils.subtrair(baseSemDesconto, descontoInssCorrigido, baseSemDesconto);
                }
                if (this.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA)) {
                    baseSemDesconto = Utils.subtrair(baseSemDesconto, previdenciaPrivadaCorrigido, baseSemDesconto);
                    baseSemDesconto = Utils.subtrair(baseSemDesconto, descontoInssCorrigido, baseSemDesconto);
                }
            }
            if (!CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)this.getMulta().getTipoCredorDevedor())) {
                baseSemDesconto = baseSemDesconto.abs().negate();
            }
            return baseSemDesconto;
        }
        if (multaAnterior.getJaCalculadoUmaVez().booleanValue() && multaAnterior.getValorRemanescenteMulta() == null) {
            BigDecimal totalValorMulta = Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM)));
            if (this.getMulta().getTipoCredorDevedor() == CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) {
                this.setValorRemanescenteMulta(Utils.subtrair(totalValorMulta, multaAnterior.getPagoMulta()));
                return Utils.subtrair(totalValorMulta, multaAnterior.getPagoMulta());
            }
            if (totalValorMulta.signum() == 1) {
                this.setValorRemanescenteMulta(Utils.somar(totalValorMulta.negate(), multaAnterior.getPagoMulta()));
                return Utils.somar(totalValorMulta.negate(), multaAnterior.getPagoMulta());
            }
            this.setValorRemanescenteMulta(Utils.subtrair(totalValorMulta, multaAnterior.getPagoMulta()));
            return Utils.subtrair(totalValorMulta, multaAnterior.getPagoMulta());
        }
        if (this.getMulta().getTipoCredorDevedor() == CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) {
            BigDecimal sobreJurosPeriodo = Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(Utils.somar(creditoDoReclamantePagamentoAnterior.getDevidoJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamantePagamentoAnterior.getDevidoJuroDeMoraFgtsPeriodoAtual()), multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM))), multaAnterior.getPagoJuro());
            if (this.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA)) {
                sobreJurosPeriodo = BigDecimal.ZERO;
            }
            BigDecimal remanescente = multaAnterior.getValorRemanescenteMulta();
            if (BigDecimal.ZERO.compareTo(multaAnterior.getValorRemanescenteMulta()) <= 0) {
                remanescente = Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorRemanescenteMulta(), indiceDeCorrecaoAnterior));
            } else {
                BigDecimal conversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(creditoDoReclamantePagamentoAnterior.getDataInicialPeriodo()).getDate(), HelperDate.getCurrentCompetence(creditoDoReclamantePagamentoAnterior.getDataFinalPeriodo()).getDate());
                remanescente = Utils.arredondarValorMonetario(Utils.multiplicar(remanescente, conversaoMoeda));
            }
            remanescente = Utils.subtrair(remanescente, multaAnterior.getPagoMulta());
            BigDecimal totalValorMulta = Utils.arredondarValorMonetario(Utils.somar(sobreJurosPeriodo, remanescente));
            this.setValorRemanescenteMulta(totalValorMulta);
            return totalValorMulta;
        }
        BigDecimal sobreJurosPeriodo = Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(Utils.somar(creditoDoReclamantePagamentoAnterior.getDevidoJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamantePagamentoAnterior.getDevidoJuroDeMoraFgtsPeriodoAtual()), multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM))), multaAnterior.getPagoJuro().negate()).negate();
        if (this.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA)) {
            sobreJurosPeriodo = BigDecimal.ZERO;
        }
        BigDecimal remanescente = Utils.subtrair(Utils.multiplicar(multaAnterior.getValorRemanescenteMulta(), indiceDeCorrecaoAnterior), multaAnterior.getPagoMulta());
        BigDecimal totalValorMulta = Utils.arredondarValorMonetario(Utils.somar(sobreJurosPeriodo, remanescente));
        this.setValorRemanescenteMulta(totalValorMulta);
        return totalValorMulta;
    }

    public BigDecimal calcularValorDaMultaCalculadaOutros(CreditosDoReclamante creditoDoReclamantePagamento, CreditosDoReclamante creditoDoReclamantePagamentoAnterior, MultaDaAtualizacao multaAnterior, BigDecimal indiceDeCorrecaoAnterior, BigDecimal previdenciaPrivadaCorrigido, BigDecimal descontoInssCorrigido, Date dataFinal) {
        if (multaAnterior == null || !multaAnterior.getJaCalculadoUmaVez().booleanValue()) {
            BigDecimal baseSemDesconto = BigDecimal.ZERO;
            if (BaseParaApuracaoDeMultaEnum.VALOR_CAUSA.equals((Object)this.getMulta().getTipoBaseMulta())) {
                Calculo calculo = this.getMulta().getCalculo();
                TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(calculo.getAtualizacaoMonetaria(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, calculo.getIgnorarTaxaCorrecaoNegativa());
                tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(calculo.getDataAjuizamento(), dataFinal));
                BigDecimal indiceDeCorrecao = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(calculo.getDataAjuizamento());
                BigDecimal valorDaCausa = this.getMulta().getCalculo().getProcesso().getValorDaCausa();
                baseSemDesconto = Utils.arredondarValorMonetario(Utils.multiplicar(valorDaCausa, indiceDeCorrecao));
            } else {
                BigDecimal parcialPrincipal = Utils.somar(Utils.somar(creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipal(), creditoDoReclamantePagamento.getDevidoJuroDeMoraPrincipalPeriodoAtual()), Utils.somar(creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsPeriodoAtual(), creditoDoReclamantePagamento.getDevidoPrincipal()));
                baseSemDesconto = Utils.arredondarValorMonetario(Utils.somar(parcialPrincipal, Utils.somar(creditoDoReclamantePagamento.getDevidoFgts(), creditoDoReclamantePagamento.getDevidoJuroDeMoraFgtsAtePrimeiraAtualizacao())));
                if (BaseParaApuracaoDeMultaEnum.PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL.equals((Object)this.getMulta().getTipoBaseMulta())) {
                    baseSemDesconto = Utils.subtrair(baseSemDesconto, descontoInssCorrigido, baseSemDesconto);
                }
                if (BaseParaApuracaoDeMultaEnum.PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA.equals((Object)this.getMulta().getTipoBaseMulta())) {
                    baseSemDesconto = Utils.subtrair(baseSemDesconto, previdenciaPrivadaCorrigido, baseSemDesconto);
                    baseSemDesconto = Utils.subtrair(baseSemDesconto, descontoInssCorrigido, baseSemDesconto);
                }
            }
            return baseSemDesconto;
        }
        if (multaAnterior.getJaCalculadoUmaVez().booleanValue() && multaAnterior.getValorRemanescenteMulta() == null) {
            BigDecimal totalValorMulta = Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM)));
            this.setValorRemanescenteMulta(Utils.subtrair(totalValorMulta, multaAnterior.getPagoMulta(), totalValorMulta));
            return Utils.subtrair(totalValorMulta, multaAnterior.getPagoMulta(), totalValorMulta);
        }
        BigDecimal sobreJurosPeriodo = Utils.subtrair(Utils.multiplicar(Utils.arredondarValorMonetario(Utils.somar(creditoDoReclamantePagamentoAnterior.getDevidoJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamantePagamentoAnterior.getDevidoJuroDeMoraFgtsPeriodoAtual())), multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM)), multaAnterior.getPagoJuro());
        if (this.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA)) {
            sobreJurosPeriodo = BigDecimal.ZERO;
        }
        BigDecimal remanescente = Utils.subtrair(Utils.multiplicar(multaAnterior.getValorRemanescenteMulta(), indiceDeCorrecaoAnterior), multaAnterior.getPagoMulta());
        BigDecimal totalValorMulta = Utils.arredondarValorMonetario(Utils.somar(sobreJurosPeriodo, remanescente));
        this.setValorRemanescenteMulta(totalValorMulta);
        return totalValorMulta;
    }

    public BigDecimal getDevidoCalculada() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorMulta(), this.getMulta().getAliquotaMulta().divide(Utils.CEM)));
    }

    public BigDecimal getDiferencaCalculadaCreditosDoReclamante() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoCalculada(), this.getPagoMulta()));
    }

    public BigDecimal getDiferencaCalculadaOutros() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoCalculada(), this.getPagoMulta()));
    }

    public BigDecimal getDevidoCalculadaRemanescente(BigDecimal indiceDeCorrecao) {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorMulta(), indiceDeCorrecao));
    }

    public BigDecimal getDiferencaCalculadaRemanescente(BigDecimal indiceDeCorrecao) {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoCalculadaRemanescente(indiceDeCorrecao), this.getPagoMulta()));
    }

    public BigDecimal getDiferencaCalculadaRemanescenteNegativo(BigDecimal indiceDeCorrecao) {
        return Utils.arredondarValorMonetario(Utils.somar(this.getDevidoCalculadaRemanescente(indiceDeCorrecao), this.getPagoMulta()));
    }

    public BigDecimal devidoJuroMultaInformadaPrimeiroEvento(BigDecimal indiceDeCorrecaoAnterior) {
        if (Utils.nulo(indiceDeCorrecaoAnterior)) {
            indiceDeCorrecaoAnterior = BigDecimal.ONE;
        }
        BigDecimal valorJuros = this.getMulta().getJuros();
        if (this.getMulta().getCalculo().isCalculoExterno().booleanValue() && TipoOrigemRegistroEnum.CALCULO.equals((Object)this.getMulta().getOrigemRegistro())) {
            valorJuros = this.getValorJuros();
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(valorJuros, indiceDeCorrecaoAnterior));
    }

    public BigDecimal valorJurosMultaInformadaPeriodoAnterior() {
        if (this.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
            return Utils.arredondarValorMonetario(Utils.multiplicar(Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorMulta(), this.getIndiceDeCorrecao())), this.getTaxaJurosMulta().divide(Utils.CEM)));
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal devidoJuroMultaInformadaDepoisPrimeiroEvento() {
        BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorJuros(), this.getIndiceDeCorrecao()));
        return devido;
    }

    @Override
    public int compareTo(MultaDaAtualizacao o) {
        if (this.multa.getDescricao() != null) {
            if (this.multa.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO) && o.getMulta().getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO)) {
                if (this.multa.getTipoValorDaMulta().equals((Object)TipoValorEnum.CALCULADO) && o.getMulta().getTipoValorDaMulta().equals((Object)TipoValorEnum.CALCULADO)) {
                    return this.multa.getDescricao().compareTo(o.getMulta().getDescricao());
                }
                if (this.multa.getTipoValorDaMulta().equals((Object)TipoValorEnum.CALCULADO) && o.getMulta().getTipoValorDaMulta().equals((Object)TipoValorEnum.INFORMADO)) {
                    return 1;
                }
                if (this.multa.getTipoValorDaMulta().equals((Object)TipoValorEnum.INFORMADO) && o.getMulta().getTipoValorDaMulta().equals((Object)TipoValorEnum.CALCULADO)) {
                    return -1;
                }
                return this.multa.getDataVencimentoMulta().compareTo(o.getMulta().getDataVencimentoMulta());
            }
            if (this.multa.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO) && o.getMulta().getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) {
                return -1;
            }
            if (this.multa.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO) && o.getMulta().getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO)) {
                return 1;
            }
            return this.multa.getDataEvento().compareTo(o.multa.getDataEvento());
        }
        return 0;
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        MultaDaAtualizacao other = (MultaDaAtualizacao)obj;
        if (this.pagamento == null ? other.pagamento != null : !this.pagamento.equals(other.pagamento)) {
            return false;
        }
        if (this.id == null ? other.id != null : !this.id.equals(other.id)) {
            return false;
        }
        if (this.tipoVinculo != other.tipoVinculo) {
            return false;
        }
        return !(this.multa == null ? other.multa != null : !this.multa.equals(other.multa));
    }

    public BigDecimal getTaxaJurosMulta() {
        return this.taxaJurosMulta != null ? this.taxaJurosMulta : BigDecimal.ZERO;
    }

    public void setTaxaJurosMulta(BigDecimal taxaJurosMulta) {
        this.taxaJurosMulta = taxaJurosMulta;
    }
}

