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

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.EntidadeAgregada;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndicesAcumuladosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeImpostoDeRendaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeHonorarioDoPagamentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.HonorarioVerbaDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
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
@Table(name="TBVINCULOATUALIZACAOHONORARIO")
@SequenceGenerator(name="SQVINCULOATUALIZACAOHONORARIO", sequenceName="SQVINCULOATUALIZACAOHONORARIO", allocationSize=1)
@Name(value="honorarioDaAtualizacao")
public class HonorarioDaAtualizacao
extends EntidadeAgregada
implements Comparable<HonorarioDaAtualizacao> {
    private static final long serialVersionUID = 4466529296239033805L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVINCULOATUALIZACAOHONORARIO")
    @Column(name="IIDVINCULOATUALIZACAOHONORARIO")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDHONORARIO")
    private Honorario honorario;
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
    @Column(name="MVLINDICECORRECAOPJUROS", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoParaJuros;
    @Column(name="STPVINCULO", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoVinculoDeHonorarioDoPagamentoEnum")})
    private TipoVinculoDeHonorarioDoPagamentoEnum tipoVinculo = TipoVinculoDeHonorarioDoPagamentoEnum.DEBITOSRECLAMANTE;
    @Column(name="STPVALOR", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValor = TipoValorEnum.CALCULADO;
    @Column(name="MVLHONORARIO", precision=12, scale=2)
    private BigDecimal valorHonorario;
    @Column(name="MVLPAGOHONORARIO", precision=12, scale=2)
    private BigDecimal pagoHonorario;
    @Column(name="MVLPAGOJURO", precision=12, scale=2)
    private BigDecimal pagoJuro;
    @Column(name="MVLPAGOSOBREMULTAS", precision=12, scale=2)
    private BigDecimal pagoSobreMultas;
    @Column(name="MVLPAGOJUROPERIODOATUAL", precision=12, scale=2)
    private BigDecimal pagoJuroPeriodoAtual;
    @Column(name="MVLPAGOIMPOSTORENDA", precision=12, scale=2)
    private BigDecimal pagoImpostoRenda;
    @Column(name="MVLREMANESCENTEHONORARIO", precision=12, scale=2)
    private BigDecimal valorRemanescenteHonorario;
    @Column(name="MVLJUROSHONORARIO", precision=12, scale=2)
    private BigDecimal valorJuros;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaJurosHonorario;
    @Column(name="MVLDEVIDOHONORARIO", precision=19, scale=2)
    private BigDecimal devidoHonorario;
    @Column(name="RVLINICIALFAIXAIRPF", precision=19, scale=2)
    private BigDecimal valorInicialFaixaIrpf;
    @Column(name="RVLFINALFAIXAIRPF", precision=19, scale=2)
    private BigDecimal valorFinalFaixaIrpf;
    @Column(name="RVLALIQUOTAIRPF", precision=5, scale=2)
    private BigDecimal valorAliquotaIrpf;
    @Column(name="RVLDEDUCAOIRPF", precision=19, scale=2)
    private BigDecimal valorDeducaoIrpf;
    @Column(name="RVLDEVIDOIRPF", precision=38, scale=25)
    private BigDecimal valorImpostoRenda;
    @Column(name="RVLINICIALFAIXAIRPFSALDO", precision=19, scale=2)
    private BigDecimal valorInicialFaixaIrpfSaldo;
    @Column(name="RVLFINALFAIXAIRPFSALDO", precision=19, scale=2)
    private BigDecimal valorFinalFaixaIrpfSaldo;
    @Column(name="RVLALIQUOTAIRPFSALDO", precision=5, scale=2)
    private BigDecimal valorAliquotaIrpfSaldo;
    @Column(name="RVLDEDUCAOIRPFSALDO", precision=19, scale=2)
    private BigDecimal valorDeducaoIrpfSaldo;
    @Column(name="RVLDEVIDOIRPFSALDO", precision=38, scale=25)
    private BigDecimal valorImpostoRendaSaldo;
    @Column(name="SFLJACALCULADOUMAVEZ", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jaCalculadoUmaVez = Boolean.FALSE;
    @Transient
    private Boolean primeiroEventoProcessado = Boolean.FALSE;

    public HonorarioDaAtualizacao() {
    }

    public HonorarioDaAtualizacao(Honorario honorario, BigDecimal valorHonorario, TipoVinculoDeHonorarioDoPagamentoEnum tipoVinculo, TipoValorEnum tipoValor) {
        this();
        this.honorario = honorario;
        this.valorHonorario = valorHonorario;
        this.tipoVinculo = tipoVinculo;
        this.tipoValor = tipoValor;
    }

    @Transient
    public BigDecimal getTotalPago() {
        BigDecimal somatorioTotais = BigDecimal.ZERO;
        somatorioTotais = Utils.somar(somatorioTotais, this.pagoHonorario, somatorioTotais);
        somatorioTotais = Utils.somar(somatorioTotais, this.pagoJuro, somatorioTotais);
        somatorioTotais = Utils.somar(somatorioTotais, this.pagoJuroPeriodoAtual, somatorioTotais);
        somatorioTotais = Utils.somar(somatorioTotais, this.pagoSobreMultas, somatorioTotais);
        somatorioTotais = Utils.somar(somatorioTotais, this.pagoImpostoRenda, somatorioTotais);
        return somatorioTotais;
    }

    @Transient
    public String getFaixa() {
        if (TipoDeImpostoDeRendaEnum.PESSOA_JURIDICA.equals((Object)this.honorario.getTipoImpostoRenda())) {
            return "-";
        }
        StringBuilder sb = new StringBuilder();
        if (Utils.naoNulo(this.valorFinalFaixaIrpf)) {
            sb.append(Utils.formatarValor(this.valorInicialFaixaIrpf)).append(" a ").append(Utils.formatarValor(this.valorFinalFaixaIrpf));
        } else {
            sb.append("A partir de ").append(Utils.formatarValor(this.valorInicialFaixaIrpf));
        }
        return sb.toString();
    }

    @Transient
    public String getFaixaDoSaldo() {
        if (TipoDeImpostoDeRendaEnum.PESSOA_JURIDICA.equals((Object)this.honorario.getTipoImpostoRenda())) {
            return "-";
        }
        StringBuilder sb = new StringBuilder();
        if (Utils.naoNulo(this.valorFinalFaixaIrpfSaldo)) {
            sb.append(Utils.formatarValor(this.valorInicialFaixaIrpfSaldo)).append(" a ").append(Utils.formatarValor(this.valorFinalFaixaIrpfSaldo));
        } else {
            sb.append("A partir de ").append(Utils.formatarValor(this.valorInicialFaixaIrpfSaldo));
        }
        return sb.toString();
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Honorario getHonorario() {
        return this.honorario;
    }

    public void setHonorario(Honorario honorario) {
        this.honorario = honorario;
    }

    public TipoVinculoDeHonorarioDoPagamentoEnum getTipoVinculo() {
        return this.tipoVinculo;
    }

    public void setTipoVinculo(TipoVinculoDeHonorarioDoPagamentoEnum tipoVinculo) {
        this.tipoVinculo = tipoVinculo;
    }

    public TipoValorEnum getTipoValor() {
        return this.tipoValor;
    }

    public void setTipoValor(TipoValorEnum tipoValor) {
        this.tipoValor = tipoValor;
    }

    public BigDecimal getValorHonorario() {
        return this.valorHonorario;
    }

    public void setValorHonorario(BigDecimal valorHonorario) {
        this.valorHonorario = valorHonorario;
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

    public BigDecimal getIndiceDeCorrecao() {
        return this.indiceDeCorrecao;
    }

    public void setIndiceDeCorrecao(BigDecimal indiceDeCorrecao) {
        this.indiceDeCorrecao = indiceDeCorrecao;
    }

    public BigDecimal getIndiceDeCorrecaoParaJuros() {
        return this.indiceDeCorrecaoParaJuros;
    }

    public void setIndiceDeCorrecaoParaJuros(BigDecimal indiceDeCorrecaoParaJuros) {
        this.indiceDeCorrecaoParaJuros = indiceDeCorrecaoParaJuros;
    }

    public BigDecimal getPagoHonorario() {
        return this.pagoHonorario;
    }

    public void setPagoHonorario(BigDecimal pagoHonorario) {
        this.pagoHonorario = pagoHonorario;
    }

    public BigDecimal getPagoJuro() {
        return this.pagoJuro;
    }

    public void setPagoJuro(BigDecimal pagoJuro) {
        this.pagoJuro = pagoJuro;
    }

    public BigDecimal getPagoSobreMultas() {
        return this.pagoSobreMultas;
    }

    public void setPagoSobreMultas(BigDecimal pagoSobreMultas) {
        this.pagoSobreMultas = pagoSobreMultas;
    }

    public BigDecimal getPagoJuroPeriodoAtual() {
        return this.pagoJuroPeriodoAtual;
    }

    public void setPagoJuroPeriodoAtual(BigDecimal pagoJuroPeriodoAtual) {
        this.pagoJuroPeriodoAtual = pagoJuroPeriodoAtual;
    }

    public BigDecimal getValorJuros() {
        return this.valorJuros;
    }

    public void setValorJuros(BigDecimal valorJuros) {
        this.valorJuros = valorJuros;
    }

    public BigDecimal getDevidoHonorario() {
        return this.devidoHonorario;
    }

    public void setDevidoHonorario(BigDecimal devidoHonorario) {
        this.devidoHonorario = devidoHonorario;
    }

    public BigDecimal getValorInicialFaixaIrpf() {
        return this.valorInicialFaixaIrpf;
    }

    public void setValorInicialFaixaIrpf(BigDecimal valorInicialFaixaIrpf) {
        this.valorInicialFaixaIrpf = valorInicialFaixaIrpf;
    }

    public BigDecimal getValorFinalFaixaIrpf() {
        return this.valorFinalFaixaIrpf;
    }

    public void setValorFinalFaixaIrpf(BigDecimal valorFinalFaixaIrpf) {
        this.valorFinalFaixaIrpf = valorFinalFaixaIrpf;
    }

    public BigDecimal getValorAliquotaIrpf() {
        return this.valorAliquotaIrpf;
    }

    public void setValorAliquotaIrpf(BigDecimal valorAliquotaIrpf) {
        this.valorAliquotaIrpf = valorAliquotaIrpf;
    }

    public BigDecimal getValorDeducaoIrpf() {
        return this.valorDeducaoIrpf;
    }

    public void setValorDeducaoIrpf(BigDecimal valorDeducaoIrpf) {
        this.valorDeducaoIrpf = valorDeducaoIrpf;
    }

    public BigDecimal getValorImpostoRenda() {
        return this.valorImpostoRenda;
    }

    public void setValorImpostoRenda(BigDecimal valorImpostoRenda) {
        this.valorImpostoRenda = valorImpostoRenda;
    }

    public BigDecimal getDevidoImpostoRenda() {
        return Utils.aplicarCorrecaoMonetaria(this.indiceDeCorrecao, this.valorImpostoRenda);
    }

    public BigDecimal getValorInicialFaixaIrpfSaldo() {
        return this.valorInicialFaixaIrpfSaldo;
    }

    public void setValorInicialFaixaIrpfSaldo(BigDecimal valorInicialFaixaIrpfSaldo) {
        this.valorInicialFaixaIrpfSaldo = valorInicialFaixaIrpfSaldo;
    }

    public BigDecimal getValorFinalFaixaIrpfSaldo() {
        return this.valorFinalFaixaIrpfSaldo;
    }

    public void setValorFinalFaixaIrpfSaldo(BigDecimal valorFinalFaixaIrpfSaldo) {
        this.valorFinalFaixaIrpfSaldo = valorFinalFaixaIrpfSaldo;
    }

    public BigDecimal getValorAliquotaIrpfSaldo() {
        return this.valorAliquotaIrpfSaldo;
    }

    public void setValorAliquotaIrpfSaldo(BigDecimal valorAliquotaIrpfSaldo) {
        this.valorAliquotaIrpfSaldo = valorAliquotaIrpfSaldo;
    }

    public BigDecimal getValorDeducaoIrpfSaldo() {
        return this.valorDeducaoIrpfSaldo;
    }

    public void setValorDeducaoIrpfSaldo(BigDecimal valorDeducaoIrpfSaldo) {
        this.valorDeducaoIrpfSaldo = valorDeducaoIrpfSaldo;
    }

    public BigDecimal getValorImpostoRendaSaldo() {
        return this.valorImpostoRendaSaldo;
    }

    public void setValorImpostoRendaSaldo(BigDecimal valorImpostoRendaSaldo) {
        this.valorImpostoRendaSaldo = valorImpostoRendaSaldo;
    }

    public Boolean getJaCalculadoUmaVez() {
        return this.jaCalculadoUmaVez;
    }

    public void setJaCalculadoUmaVez(Boolean jaCalculadoUmaVez) {
        this.jaCalculadoUmaVez = jaCalculadoUmaVez;
    }

    public Boolean getPrimeiroEventoProcessado() {
        return this.primeiroEventoProcessado;
    }

    public void setPrimeiroEventoProcessado(Boolean primeiroEventoProcessado) {
        this.primeiroEventoProcessado = primeiroEventoProcessado;
    }

    public BigDecimal getValorRemanescenteHonorario() {
        return this.valorRemanescenteHonorario;
    }

    public void setValorRemanescenteHonorario(BigDecimal valorRemanescenteHonorario) {
        this.valorRemanescenteHonorario = valorRemanescenteHonorario;
    }

    public BigDecimal calcularValorDoHonorarioCalculado(CreditosDoReclamante creditoDoReclamantePagamento, CreditosDoReclamante creditoDoReclamantePagamentoAnterior, HonorarioDaAtualizacao honorarioAnterior, BigDecimal indiceDeCorrecaoAnterior, BigDecimal previdenciaPrivadaCorrigido, BigDecimal descontoInssCorrigido) {
        if (Utils.nulo(previdenciaPrivadaCorrigido)) {
            previdenciaPrivadaCorrigido = BigDecimal.ZERO;
        }
        if (honorarioAnterior == null || !honorarioAnterior.getJaCalculadoUmaVez().booleanValue()) {
            if (this.getHonorario().getBaseParaApuracao().equals((Object)BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL)) {
                TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(this.getHonorario().getCalculo().getAtualizacaoMonetaria(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getHonorario().getCalculo().getIgnorarTaxaCorrecaoNegativa());
                tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(this.getHonorario().getCalculo().getDataDeLiquidacao(), creditoDoReclamantePagamento.getDataFinalPeriodo()));
                BigDecimal indiceDeCorrecao = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(this.getHonorario().getCalculo().getDataDeLiquidacao());
                BigDecimal base = BigDecimal.ZERO;
                for (HonorarioVerbaDeCalculo verba : this.getHonorario().getVerbasSelecionadas()) {
                    base = Utils.somar(base, verba.getVerbaDeCalculo().getValorTotalDiferencaCorrigida(), base);
                }
                return Utils.aplicarCorrecaoMonetaria(indiceDeCorrecao, base);
            }
            BigDecimal baseSemDesconto = creditoDoReclamantePagamento.getTotalDevido();
            if (this.getHonorario().getBaseParaApuracao().equals((Object)BaseParaApuracaoDeHonorarioEnum.BRUTO_MENOS_CONTRIBUICAO_SOCIAL)) {
                baseSemDesconto = Utils.subtrair(baseSemDesconto, descontoInssCorrigido, baseSemDesconto);
            }
            if (this.getHonorario().getBaseParaApuracao().equals((Object)BaseParaApuracaoDeHonorarioEnum.BRUTO_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA)) {
                baseSemDesconto = Utils.subtrair(baseSemDesconto, previdenciaPrivadaCorrigido, baseSemDesconto);
                baseSemDesconto = Utils.subtrair(baseSemDesconto, descontoInssCorrigido, baseSemDesconto);
            }
            return baseSemDesconto;
        }
        if (honorarioAnterior.getJaCalculadoUmaVez().booleanValue() && honorarioAnterior.getValorRemanescenteHonorario() == null) {
            BigDecimal totalValorHonorario = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAnterior.getValorHonorario(), honorarioAnterior.getHonorario().getAliquota().divide(Utils.CEM)));
            this.setValorRemanescenteHonorario(Utils.subtrair(totalValorHonorario, honorarioAnterior.getPagoHonorario()));
            return Utils.subtrair(totalValorHonorario, honorarioAnterior.getPagoHonorario());
        }
        BigDecimal sobreJurosPeriodo = Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(creditoDoReclamantePagamentoAnterior.getBaseMultaCalculadaSobreJurosDoPeriodo(), honorarioAnterior.getHonorario().getAliquota().divide(Utils.CEM))), honorarioAnterior.getPagoJuro());
        BigDecimal remanescente = Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAnterior.getValorRemanescenteHonorario(), indiceDeCorrecaoAnterior)), honorarioAnterior.getPagoHonorario());
        BigDecimal sobreMultas = Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(this.calcularHonorariosSobreMultas(creditoDoReclamantePagamentoAnterior), honorarioAnterior.getHonorario().getAliquota().divide(Utils.CEM))), honorarioAnterior.getPagoSobreMultas());
        BigDecimal totalValorHonorario = remanescente;
        if (!this.getHonorario().getBaseParaApuracao().equals((Object)BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL)) {
            totalValorHonorario = Utils.somar(sobreJurosPeriodo, totalValorHonorario);
            totalValorHonorario = Utils.arredondarValorMonetario(Utils.somar(totalValorHonorario, sobreMultas));
        }
        this.setValorRemanescenteHonorario(totalValorHonorario);
        return totalValorHonorario;
    }

    public BigDecimal calcularHonorariosSobreMultas(CreditosDoReclamante creditosDoReclamante) {
        BigDecimal honorariosSobreMultas = BigDecimal.ZERO;
        for (MultaDaAtualizacao multaCalculada : creditosDoReclamante.getMultasCalculadas()) {
            if (multaCalculada.getValorRemanescenteMulta() == null || creditosDoReclamante.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && creditosDoReclamante.getDataInicialPeriodo().equals(creditosDoReclamante.getDataFinalPeriodo()) || creditosDoReclamante.getDataInicialPeriodo().equals(creditosDoReclamante.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                if (!multaCalculada.getCreditoDoReclamantePagamento().getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento())) continue;
                honorariosSobreMultas = honorariosSobreMultas.add(multaCalculada.getDevidoCalculada());
                continue;
            }
            if (CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaCalculada.getMulta().getTipoCredorDevedor())) {
                honorariosSobreMultas = honorariosSobreMultas.add(multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : creditosDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)));
                continue;
            }
            honorariosSobreMultas = honorariosSobreMultas.add(multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : creditosDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)).negate());
        }
        for (MultaDaAtualizacao multaInformada : creditosDoReclamante.getMultasInformadas()) {
            if (!multaInformada.getCreditoDoReclamantePagamento().getDataFinalPeriodo().equals(multaInformada.getMulta().getDataEvento())) {
                BigDecimal base = Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), creditosDoReclamante.getIndiceDeCorrecao()));
                BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, creditosDoReclamante.getTaxaDeJuros().divide(Utils.CEM)));
                honorariosSobreMultas = honorariosSobreMultas.add(dev);
                continue;
            }
            honorariosSobreMultas = honorariosSobreMultas.add(multaInformada.getValorMulta());
        }
        return honorariosSobreMultas;
    }

    public BigDecimal getDevidoCalculada() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorHonorario(), this.getHonorario().getAliquota().divide(Utils.CEM)));
    }

    public BigDecimal getDiferencaCalculadaOutros() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoCalculada(), this.getPagoHonorario()));
    }

    public BigDecimal getDevidoCalculadaRemanescente(BigDecimal indiceDeCorrecao) {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorHonorario(), indiceDeCorrecao));
    }

    public BigDecimal getDiferencaCalculadaRemanescente(BigDecimal indiceDeCorrecao) {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoCalculadaRemanescente(indiceDeCorrecao), this.getPagoHonorario()));
    }

    public BigDecimal devidoJuroHonorarioInformadoPrimeiroEvento(BigDecimal indiceDeCorrecaoAnterior) {
        if (Utils.nulo(indiceDeCorrecaoAnterior)) {
            indiceDeCorrecaoAnterior = BigDecimal.ONE;
        }
        BigDecimal valorJuros = this.getHonorario().getJuros();
        if (this.getHonorario().getCalculo().isCalculoExterno().booleanValue() && TipoOrigemRegistroEnum.CALCULO.equals((Object)this.getHonorario().getOrigemRegistro())) {
            valorJuros = this.getValorJuros();
        }
        if (Utils.nulo(valorJuros)) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(valorJuros, indiceDeCorrecaoAnterior));
    }

    public BigDecimal valorJurosHonorarioInformadoPeriodoAnterior() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorHonorario(), this.getIndiceDeCorrecao())), this.getTaxaJurosHonorario().divide(Utils.CEM)));
    }

    public BigDecimal devidoJuroHonorarioInformadoDepoisPrimeiroEvento() {
        BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorJuros(), this.getIndiceDeCorrecao()));
        return devido;
    }

    public BigDecimal getValorHonorarioParaCalculoDeImposto() {
        BigDecimal valorHonorario = BigDecimal.ZERO;
        switch (this.getHonorario().getTipoValor()) {
            case CALCULADO: {
                valorHonorario = Utils.somar(valorHonorario, this.getPagoHonorario(), valorHonorario);
                valorHonorario = Utils.somar(valorHonorario, this.getPagoJuro(), valorHonorario);
                valorHonorario = Utils.somar(valorHonorario, this.getPagoSobreMultas(), valorHonorario);
                break;
            }
            case INFORMADO: {
                valorHonorario = Utils.somar(valorHonorario, this.getPagoHonorario(), valorHonorario);
            }
        }
        return valorHonorario;
    }

    public BigDecimal getDiferencaDevidoPagoHonorarios() {
        BigDecimal devidoNoSaldo = this.getValorHonorarioParaCalculoDeImpostoDoSaldo();
        BigDecimal pagoJuros = this.getValorJurosParaCalculoDeImposto();
        if (Utils.nulo(pagoJuros) || pagoJuros.compareTo(BigDecimal.ZERO) <= 0) {
            return devidoNoSaldo;
        }
        BigDecimal diferencaValor = Utils.subtrair(devidoNoSaldo, pagoJuros, devidoNoSaldo);
        if (BigDecimal.ZERO.compareTo(diferencaValor) > 0) {
            diferencaValor = BigDecimal.ZERO;
        }
        return diferencaValor;
    }

    public BigDecimal getValorHonorarioParaCalculoDeImpostoDoSaldo() {
        BigDecimal totalDiferenca = BigDecimal.ZERO;
        CreditosDoReclamante creditosDoReclamante = null;
        Date dataInicialPeriodo = null;
        Date dataFinalPeriodo = null;
        if (this.getTipoVinculo().equals((Object)TipoVinculoDeHonorarioDoPagamentoEnum.DEBITOSRECLAMANTE)) {
            creditosDoReclamante = this.getDebitosDoReclamante().getCreditosDoReclamante();
            dataInicialPeriodo = this.getDebitosDoReclamante().getDataInicialPeriodo();
            dataFinalPeriodo = this.getDebitosDoReclamante().getDataFinalPeriodo();
        } else if (this.getTipoVinculo().equals((Object)TipoVinculoDeHonorarioDoPagamentoEnum.DEBITOSCOBRARRECLAMANTE)) {
            creditosDoReclamante = this.getDebitosCobrarDoReclamante().getCreditosDoReclamante();
            dataInicialPeriodo = this.getDebitosCobrarDoReclamante().getDataInicialPeriodo();
            dataFinalPeriodo = this.getDebitosCobrarDoReclamante().getDataFinalPeriodo();
        } else {
            creditosDoReclamante = this.getOutrosDebitosReclamado().getCreditosDoReclamante();
            dataInicialPeriodo = this.getOutrosDebitosReclamado().getDataInicialPeriodo();
            dataFinalPeriodo = this.getOutrosDebitosReclamado().getDataFinalPeriodo();
        }
        switch (this.getHonorario().getTipoValor()) {
            case CALCULADO: {
                if (Utils.nulo(this.getValorRemanescenteHonorario()) || dataFinalPeriodo.equals(this.getHonorario().getDataEvento()) && dataInicialPeriodo.equals(dataFinalPeriodo) || dataInicialPeriodo.equals(creditosDoReclamante.getCalculo().getDataDeLiquidacao()) && !this.getJaCalculadoUmaVez().booleanValue()) {
                    totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaCalculadaOutros(), totalDiferenca);
                    break;
                }
                totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaCalculadaRemanescente(this.getIndiceDeCorrecao()), totalDiferenca);
                totalDiferenca = Utils.somar(totalDiferenca, creditosDoReclamante.getDiferencaMultaCalculadaSobreJurosDoPeriodo(this.getHonorario().getAliquota().divide(Utils.CEM), this.getPagoJuro()), totalDiferenca);
                totalDiferenca = Utils.somar(totalDiferenca, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(this.calcularHonorariosSobreMultas(creditosDoReclamante), this.getHonorario().getAliquota().divide(Utils.CEM))), this.getPagoSobreMultas()), totalDiferenca);
                break;
            }
            case INFORMADO: {
                totalDiferenca = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(this.getValorHonorario(), this.getIndiceDeCorrecao()), this.getPagoHonorario(), Utils.multiplicar(this.getValorHonorario(), this.getIndiceDeCorrecao())));
            }
        }
        if (BigDecimal.ZERO.compareTo(totalDiferenca) > 0) {
            totalDiferenca = BigDecimal.ZERO;
        }
        return totalDiferenca;
    }

    public BigDecimal getValorJurosParaCalculoDeImposto() {
        if (!this.getHonorario().getApurarIRPFSobreJuros().booleanValue()) {
            return null;
        }
        BigDecimal valorJurosHonorario = BigDecimal.ZERO;
        switch (this.getHonorario().getTipoValor()) {
            case CALCULADO: {
                break;
            }
            case INFORMADO: {
                valorJurosHonorario = Utils.somar(valorJurosHonorario, this.getPagoJuro(), valorJurosHonorario);
                valorJurosHonorario = Utils.somar(valorJurosHonorario, this.getPagoJuroPeriodoAtual(), valorJurosHonorario);
            }
        }
        return valorJurosHonorario;
    }

    public BigDecimal getValorJurosParaCalculoDeImpostoDoSaldo() {
        if (!this.getHonorario().getApurarIRPFSobreJuros().booleanValue()) {
            return null;
        }
        BigDecimal diferencaTotalJuros = BigDecimal.ZERO;
        switch (this.getHonorario().getTipoValor()) {
            case CALCULADO: {
                break;
            }
            case INFORMADO: {
                BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorJuros(), this.getIndiceDeCorrecao()));
                BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, this.getPagoJuro()));
                BigDecimal base = this.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorHonorario(), this.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                BigDecimal taxaDeJuros = BigDecimal.ZERO;
                if (this.getDebitosDoReclamante() != null) {
                    taxaDeJuros = this.getDebitosDoReclamante().getTaxaDeJuros();
                } else if (this.getOutrosDebitosReclamado() != null) {
                    taxaDeJuros = this.getOutrosDebitosReclamado().getTaxaDeJuros();
                }
                BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJuros.divide(Utils.CEM)));
                BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, this.getPagoJuroPeriodoAtual()));
                diferencaTotalJuros = Utils.somar(diferencaTotalJuros, diferencaJuro, diferencaTotalJuros);
                diferencaTotalJuros = Utils.somar(diferencaTotalJuros, diferencaJuroAtual, diferencaTotalJuros);
                if (BigDecimal.ZERO.compareTo(diferencaTotalJuros) <= 0) break;
                diferencaTotalJuros = BigDecimal.ZERO;
            }
        }
        return diferencaTotalJuros;
    }

    public BigDecimal getBaseDeImposto() {
        return Utils.somar(this.getValorHonorarioParaCalculoDeImposto(), this.getValorJurosParaCalculoDeImposto(), this.getValorHonorarioParaCalculoDeImposto());
    }

    public BigDecimal getBaseDeImpostoDoSaldo() {
        return Utils.somar(this.getValorHonorarioParaCalculoDeImpostoDoSaldo(), this.getValorJurosParaCalculoDeImpostoDoSaldo(), this.getValorHonorarioParaCalculoDeImpostoDoSaldo());
    }

    @Override
    public int compareTo(HonorarioDaAtualizacao o) {
        if (this.honorario.getDescricao() != null) {
            if (this.honorario.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO) && o.honorario.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO)) {
                if (this.honorario.getTipoValor().equals((Object)TipoValorEnum.CALCULADO) && o.honorario.getTipoValor().equals((Object)TipoValorEnum.CALCULADO)) {
                    return this.honorario.getDescricao().compareTo(o.honorario.getDescricao());
                }
                if (this.honorario.getTipoValor().equals((Object)TipoValorEnum.CALCULADO) && o.honorario.getTipoValor().equals((Object)TipoValorEnum.INFORMADO)) {
                    return 1;
                }
                if (this.honorario.getTipoValor().equals((Object)TipoValorEnum.INFORMADO) && o.honorario.getTipoValor().equals((Object)TipoValorEnum.CALCULADO)) {
                    return -1;
                }
                return this.honorario.getDataVencimento().compareTo(o.honorario.getDataVencimento());
            }
            if (this.honorario.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO) && o.honorario.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) {
                return -1;
            }
            if (this.honorario.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO) && o.honorario.getOrigemRegistro().equals((Object)TipoOrigemRegistroEnum.CALCULO)) {
                return 1;
            }
            return this.honorario.getDataEvento().compareTo(o.honorario.getDataEvento());
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
        HonorarioDaAtualizacao other = (HonorarioDaAtualizacao)obj;
        if (this.id == null ? other.id != null : !this.id.equals(other.id)) {
            return false;
        }
        if (this.tipoVinculo != other.tipoVinculo) {
            return false;
        }
        return !(this.honorario == null ? other.honorario != null : !this.honorario.equals(other.honorario));
    }

    public DebitosCobrarDoReclamante getDebitosCobrarDoReclamante() {
        return this.debitosCobrarDoReclamante;
    }

    public void setDebitosCobrarDoReclamante(DebitosCobrarDoReclamante debitosCobrarDoReclamante) {
        this.debitosCobrarDoReclamante = debitosCobrarDoReclamante;
    }

    public BigDecimal getTaxaJurosHonorario() {
        return this.taxaJurosHonorario != null ? this.taxaJurosHonorario : BigDecimal.ZERO;
    }

    public void setTaxaJurosHonorario(BigDecimal taxaJurosHonorario) {
        this.taxaJurosHonorario = taxaJurosHonorario;
    }

    public BigDecimal getPagoImpostoRenda() {
        return this.pagoImpostoRenda;
    }

    public void setPagoImpostoRenda(BigDecimal pagoImpostoRenda) {
        this.pagoImpostoRenda = pagoImpostoRenda;
    }
}

