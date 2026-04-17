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
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.EntidadeAgregada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.math.BigDecimal;
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
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBVINCULOATUALIZACAPENSAO")
@SequenceGenerator(name="SQVINCULOATUALIZACAOPENSAO", sequenceName="SQVINCULOATUALIZACAOPENSAO", allocationSize=1)
@Name(value="pensaoAlimenticiaDaAtualizacao")
public class PensaoAlimenticiaDaAtualizacao
extends EntidadeAgregada {
    private static final long serialVersionUID = 6847339044222745372L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVINCULOATUALIZACAOPENSAO")
    @Column(name="IIDVINCULOATUALIZACAOPENSAO")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDPENSAOALIMENTICIA")
    private PensaoAlimenticia pensaoAlimenticia;
    @OneToOne
    @JoinColumn(name="IIDDEBITOSRECLAMANTE")
    private DebitosDoReclamante debitosDoReclamante;
    @Column(name="MVLPENSAO", precision=12, scale=2)
    private BigDecimal valorPensao;
    @Column(name="MVLPAGOPENSAO", precision=12, scale=2)
    private BigDecimal pagoPensao;
    @Column(name="MVLJUROS", precision=12, scale=2)
    private BigDecimal valorJuros;
    @Column(name="MVLPAGOJURO", precision=12, scale=2)
    private BigDecimal pagoJuro;
    @Column(name="MVLREMANESCENTE", precision=12, scale=2)
    private BigDecimal valorRemanescente;
    @Column(name="SFLJACALCULADOUMAVEZ", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean jaCalculadoUmaVez = Boolean.FALSE;
    @Column(name="MVLPROPORCAOPRINCIPAL", precision=38, scale=25)
    private BigDecimal percentualPrincipal;
    @Column(name="MVLPROPORCAOFGTS", precision=38, scale=25)
    private BigDecimal percentualFgts;
    @Transient
    @In
    private ServicoDeCalculo servicoDeCalculo;

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public PensaoAlimenticia getPensaoAlimenticia() {
        return this.pensaoAlimenticia;
    }

    public void setPensaoAlimenticia(PensaoAlimenticia pensaoAlimenticia) {
        this.pensaoAlimenticia = pensaoAlimenticia;
    }

    public DebitosDoReclamante getDebitosDoReclamante() {
        return this.debitosDoReclamante;
    }

    public void setDebitosDoReclamante(DebitosDoReclamante debitosDoReclamante) {
        this.debitosDoReclamante = debitosDoReclamante;
    }

    public BigDecimal getValorPensao() {
        return this.valorPensao;
    }

    public void setValorPensao(BigDecimal valorPensao) {
        this.valorPensao = valorPensao;
    }

    public BigDecimal getPagoPensao() {
        return this.pagoPensao;
    }

    public void setPagoPensao(BigDecimal pagoPensao) {
        this.pagoPensao = pagoPensao;
    }

    public BigDecimal getValorJuros() {
        return this.valorJuros;
    }

    public void setValorJuros(BigDecimal valorJuros) {
        this.valorJuros = valorJuros;
    }

    public BigDecimal getPagoJuro() {
        return this.pagoJuro;
    }

    public void setPagoJuro(BigDecimal pagoJuro) {
        this.pagoJuro = pagoJuro;
    }

    public BigDecimal getValorRemanescente() {
        return this.valorRemanescente;
    }

    public void setValorRemanescente(BigDecimal valorRemanescente) {
        this.valorRemanescente = valorRemanescente;
    }

    public Boolean getJaCalculadoUmaVez() {
        return this.jaCalculadoUmaVez;
    }

    public void setJaCalculadoUmaVez(Boolean jaCalculadoUmaVez) {
        this.jaCalculadoUmaVez = jaCalculadoUmaVez;
    }

    public ServicoDeCalculo getServicoDeCalculo() {
        return this.servicoDeCalculo;
    }

    public void setServicoDeCalculo(ServicoDeCalculo servicoDeCalculo) {
        this.servicoDeCalculo = servicoDeCalculo;
    }

    public BigDecimal getPercentualPrincipal() {
        return this.percentualPrincipal;
    }

    public void setPercentualPrincipal(BigDecimal percentualPrincipal) {
        this.percentualPrincipal = percentualPrincipal;
    }

    public BigDecimal getPercentualFgts() {
        return this.percentualFgts;
    }

    public void setPercentualFgts(BigDecimal percentualFgts) {
        this.percentualFgts = percentualFgts;
    }

    public BigDecimal getDevidoPensao() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorPensao(), this.getPensaoAlimenticia().getAliquota().divide(Utils.CEM)));
    }

    public BigDecimal getPensaoCorrigido(BigDecimal indiceDeCorrecao) {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorPensao(), indiceDeCorrecao));
    }

    public BigDecimal getDiferencaPensaoCorrigido(BigDecimal indiceDeCorrecao) {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getPensaoCorrigido(indiceDeCorrecao), this.getPagoPensao()));
    }

    public BigDecimal getDiferencaPensaoDevido() {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoPensao(), this.getPagoPensao()));
    }

    public BigDecimal getDiferencaPensaoDevidoParaIrpf() {
        if (this.getPensaoAlimenticia() != null && this.getPensaoAlimenticia().getApurarPensaoAlimenticia().booleanValue()) {
            if (this.getValorRemanescente() == null || this.getDebitosDoReclamante().getDataFinalPeriodo().equals(this.getPensaoAlimenticia().getDataEvento()) && this.getDebitosDoReclamante().getDataInicialPeriodo().equals(this.getDebitosDoReclamante().getDataFinalPeriodo()) || this.getDebitosDoReclamante().getDataFinalPeriodo().equals(this.getDebitosDoReclamante().getCalculo().getDataDeLiquidacao())) {
                return this.getDiferencaPensaoDevido();
            }
            BigDecimal valorPensao = this.getDiferencaCalculadaRemanescente(this.getDebitosDoReclamante().getIndiceDeCorrecao());
            if (this.getPensaoAlimenticia().getIncidirSobreJuros().booleanValue()) {
                BigDecimal percentualPrincipalPensao = this.getPercentualPrincipal();
                BigDecimal percentualFgtsPensao = this.getPercentualFgts();
                valorPensao = Utils.somar(valorPensao, this.getDebitosDoReclamante().getCreditosDoReclamante().getDiferencaPensaoSobreJurosDoPeriodo(this.getPensaoAlimenticia().getAliquota().divide(Utils.CEM), this.getPagoJuro(), percentualPrincipalPensao, percentualFgtsPensao));
            }
            return valorPensao;
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getDevidoCalculadaRemanescente(BigDecimal indiceDeCorrecao) {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorPensao(), indiceDeCorrecao));
    }

    public BigDecimal getDiferencaCalculadaRemanescente(BigDecimal indiceDeCorrecao) {
        return Utils.arredondarValorMonetario(Utils.subtrair(this.getDevidoCalculadaRemanescente(indiceDeCorrecao), this.getPagoPensao()));
    }

    public BigDecimal calcularValorDaPensao(CreditosDoReclamante creditoDoReclamantePagamento, CreditosDoReclamante creditoDoReclamantePagamentoAnterior, PensaoAlimenticiaDaAtualizacao pensaoAnterior, BigDecimal indiceDeCorrecaoAnterior, Calculo calculo) {
        if (pensaoAnterior == null || !pensaoAnterior.getJaCalculadoUmaVez().booleanValue()) {
            BigDecimal baseSemDesconto = this.getTotalPensao(creditoDoReclamantePagamento, calculo);
            return baseSemDesconto;
        }
        if (pensaoAnterior.getJaCalculadoUmaVez().booleanValue() && pensaoAnterior.getValorRemanescente() == null) {
            BigDecimal totalValorPensao = Utils.arredondarValorMonetario(Utils.multiplicar(pensaoAnterior.getValorPensao(), pensaoAnterior.getPensaoAlimenticia().getAliquota().divide(Utils.CEM)));
            this.setValorRemanescente(Utils.subtrair(totalValorPensao, pensaoAnterior.getPagoPensao()));
            return Utils.subtrair(totalValorPensao, pensaoAnterior.getPagoPensao());
        }
        BigDecimal sobreJurosPeriodo = BigDecimal.ZERO;
        if (pensaoAnterior.getPensaoAlimenticia().getIncidirSobreJuros().booleanValue()) {
            sobreJurosPeriodo = creditoDoReclamantePagamentoAnterior.getDiferencaPensaoSobreJurosDoPeriodo(pensaoAnterior.getPensaoAlimenticia().getAliquota().divide(Utils.CEM), pensaoAnterior.getPagoJuro(), this.getPercentualPrincipal(), this.getPercentualFgts());
        }
        BigDecimal remanescente = Utils.subtrair(Utils.multiplicar(pensaoAnterior.getValorRemanescente(), indiceDeCorrecaoAnterior), pensaoAnterior.getPagoPensao());
        BigDecimal totalValorPensao = Utils.somar(sobreJurosPeriodo, remanescente);
        this.setValorRemanescente(Utils.arredondarValorMonetario(totalValorPensao));
        return Utils.arredondarValorMonetario(totalValorPensao);
    }

    public BigDecimal getProporcaoPrincipal(CreditosDoReclamante creditosDoReclamante) {
        BigDecimal totalPensao = BigDecimal.ZERO;
        BigDecimal basePrincipalDevido = BigDecimal.ZERO;
        if (this.getPensaoAlimenticia().getIncidirSobreJuros().booleanValue()) {
            basePrincipalDevido = Utils.somar(creditosDoReclamante.getDevidoJuroDeMoraPrincipalPeriodoAtual(), creditosDoReclamante.getDevidoJuroDeMoraPrincipal());
        }
        basePrincipalDevido = basePrincipalDevido.add(creditosDoReclamante.getDevidoPrincipal());
        totalPensao = totalPensao.add(Utils.multiplicar(this.getPercentualPrincipal(), basePrincipalDevido));
        return Utils.arredondarValorMonetario(totalPensao);
    }

    public BigDecimal getProporcaoFgts(CreditosDoReclamante creditosDoReclamante, Calculo calculo) {
        BigDecimal totalPensao = BigDecimal.ZERO;
        if (calculo.getFgts().getIncidenciaPensaoAlimenticia().booleanValue()) {
            BigDecimal basePrincipalFgts = BigDecimal.ZERO;
            if (this.getPensaoAlimenticia().getIncidirSobreJuros().booleanValue()) {
                basePrincipalFgts = Utils.somar(creditosDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual(), creditosDoReclamante.getDevidoJuroDeMoraFgts());
            }
            basePrincipalFgts = basePrincipalFgts.add(creditosDoReclamante.getDevidoFgts());
            totalPensao = totalPensao.add(Utils.multiplicar(this.getPercentualFgts(), basePrincipalFgts));
        }
        return Utils.arredondarValorMonetario(totalPensao);
    }

    public BigDecimal getTotalPensao(CreditosDoReclamante creditosDoReclamante, Calculo calculo) {
        BigDecimal totalPensao = BigDecimal.ZERO;
        totalPensao = Utils.somar(this.getProporcaoFgts(creditosDoReclamante, calculo), this.getProporcaoPrincipal(creditosDoReclamante));
        return Utils.arredondarValorMonetario(totalPensao);
    }

    public BigDecimal getPercentualPrincipalPensao(CreditosDoReclamante creditosDoReclamante) {
        BigDecimal totalDaBase = this.getPensaoAlimenticia().getValorBaseVerbas();
        BigDecimal percentualPrincipal = BigDecimal.ZERO;
        BigDecimal totalIncidenciaPrincipal = BigDecimal.ZERO;
        if (this.getPensaoAlimenticia() != null && this.pensaoAlimenticia.getApurarPensaoAlimenticia().booleanValue()) {
            totalIncidenciaPrincipal = totalIncidenciaPrincipal.add(creditosDoReclamante.getValorPrincipal());
            if (this.getPensaoAlimenticia().getIncidirSobreJuros().booleanValue()) {
                totalIncidenciaPrincipal = totalIncidenciaPrincipal.add(creditosDoReclamante.getJuroPrincipal());
            }
        }
        if (BigDecimal.ZERO.compareTo(totalIncidenciaPrincipal) < 0) {
            percentualPrincipal = Utils.dividir(totalDaBase, totalIncidenciaPrincipal);
        }
        return percentualPrincipal;
    }

    public BigDecimal getPercentualFgtsPensao(CreditosDoReclamante creditosDoReclamante, Calculo calculo) {
        BigDecimal totalDaBase = Utils.somar(this.getPensaoAlimenticia().getValorBaseFgts(), this.getPensaoAlimenticia().getValorBaseMultaDoFgts());
        BigDecimal percentualFgts = BigDecimal.ZERO;
        BigDecimal totalIncidenciaFgts = BigDecimal.ZERO;
        if (this.getPensaoAlimenticia() != null && this.getPensaoAlimenticia().getApurarPensaoAlimenticia().booleanValue()) {
            if (calculo.getFgts().getIncidenciaPensaoAlimenticia().booleanValue()) {
                totalIncidenciaFgts = totalIncidenciaFgts.add(creditosDoReclamante.getValorFgts());
                if (this.getPensaoAlimenticia().getIncidirSobreJuros().booleanValue()) {
                    totalIncidenciaFgts = totalIncidenciaFgts.add(creditosDoReclamante.getJuroFgts());
                }
            }
            percentualFgts = totalIncidenciaFgts.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO : Utils.dividir(totalDaBase, totalIncidenciaFgts);
        }
        return percentualFgts;
    }
}

