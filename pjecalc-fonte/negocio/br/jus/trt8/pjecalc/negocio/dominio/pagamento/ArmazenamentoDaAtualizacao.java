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
 *  javax.persistence.Version
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.regras.DataVencimentoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDeArmazenamentoDaAtualizacao;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
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
import javax.persistence.Version;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBCUSTASARMAZENAMNTATUALIZACAO")
@SequenceGenerator(name="SQCUSTASARMAZENAMNTATUALIZACAO", sequenceName="SQCUSTASARMAZENAMNTATUALIZACAO", allocationSize=1)
@Name(value="armazenamentoAtualizacao")
public class ArmazenamentoDaAtualizacao
extends EntidadeBase {
    private static final long serialVersionUID = -3682012516340482602L;
    private static final BigDecimal ZERO_VIRGULA_UM_PORCENTO = new BigDecimal(0.001);
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCUSTASARMAZENAMNTATUALIZACAO")
    @Column(name="IIDCUSTAARMAZENAMNTATUALIZACAO")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCUSTASATUALIZACAO")
    private CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="DDTINICIO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @Required
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=6)
    private Date dataInicioArmazenamento;
    @Column(name="DDTTERMINO")
    @Temporal(value=TemporalType.DATE)
    @GreaterOrEqualThan(value="dataInicioArmazenamento")
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=7)
    private Date dataTerminoArmazenamento;
    @Column(name="RVLAVALIACAO", precision=12, scale=2, nullable=false)
    @Required
    private BigDecimal valorAvaliacaoArmazenamento;
    @Column(name="IQTDIAS", nullable=false)
    private Integer qtdeDias = 0;
    @Column(name="RVLCUSTAS", precision=12, scale=2, nullable=true)
    private BigDecimal valorCustasArmazenamento;
    @Column(name="RVLINDICECORRECAO", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecao;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJuros;
    @Column(name="RVLJUROSCALCEXTERNO", precision=38, scale=25)
    private BigDecimal valorJurosCalcExterno;

    public ArmazenamentoDaAtualizacao() {
        super(RepositorioDeArmazenamentoDaAtualizacao.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public static ArmazenamentoDaAtualizacao obter(long id) {
        return (ArmazenamentoDaAtualizacao)ArmazenamentoDaAtualizacao.obter(RepositorioDeArmazenamentoDaAtualizacao.class, id);
    }

    public Long getId() {
        return this.id;
    }

    public CustasJudiciaisDaAtualizacao getCustasJudiciaisDaAtualizacao() {
        return this.custasJudiciaisDaAtualizacao;
    }

    public void setCustasJudiciaisDaAtualizacao(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        this.custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Integer getQtdeDias() {
        return this.qtdeDias;
    }

    public void setQtdeDias(Integer qtdeDias) {
        this.qtdeDias = qtdeDias;
    }

    public Date getDataInicioArmazenamento() {
        return this.dataInicioArmazenamento;
    }

    public void setDataInicioArmazenamento(Date dataInicioArmazenamento) {
        this.dataInicioArmazenamento = dataInicioArmazenamento;
    }

    public Date getDataTerminoArmazenamento() {
        return this.dataTerminoArmazenamento;
    }

    public void setDataTerminoArmazenamento(Date dataTerminoArmazenamento) {
        this.dataTerminoArmazenamento = dataTerminoArmazenamento;
    }

    public BigDecimal getValorAvaliacaoArmazenamento() {
        return this.valorAvaliacaoArmazenamento;
    }

    public void setValorAvaliacaoArmazenamento(BigDecimal valorAvaliacaoArmazenamento) {
        this.valorAvaliacaoArmazenamento = valorAvaliacaoArmazenamento;
    }

    public BigDecimal getValorCustasArmazenamento() {
        return this.valorCustasArmazenamento;
    }

    public void setValorCustasArmazenamento(BigDecimal valorCustasArmazenamento) {
        this.valorCustasArmazenamento = valorCustasArmazenamento;
    }

    public BigDecimal getIndiceCorrecao() {
        return this.indiceCorrecao;
    }

    public void setIndiceCorrecao(BigDecimal indiceCorrecao) {
        this.indiceCorrecao = indiceCorrecao;
    }

    public BigDecimal getTaxaJuros() {
        return this.taxaJuros;
    }

    public void setTaxaJuros(BigDecimal taxaJuros) {
        this.taxaJuros = taxaJuros;
    }

    public BigDecimal getValorJurosCalcExterno() {
        return this.valorJurosCalcExterno != null ? this.valorJurosCalcExterno : BigDecimal.ZERO;
    }

    public void setValorJurosCalcExterno(BigDecimal valorJurosCalcExterno) {
        this.valorJurosCalcExterno = valorJurosCalcExterno;
    }

    public BigDecimal getValorCorrigido() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.getValorCustasArmazenamento(), this.getValorCustasArmazenamento()));
    }

    public BigDecimal getJuros() {
        if (!this.getCustasJudiciaisDaAtualizacao().getCalculo().isCalculoExterno().booleanValue()) {
            return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJuros(), this.getValorCorrigido()));
        }
        BigDecimal juros = BigDecimal.ZERO;
        juros = Utils.somar(juros, Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJuros(), this.getValorCorrigido())), juros);
        juros = Utils.somar(juros, Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.getValorJurosCalcExterno(), this.getValorJurosCalcExterno())), juros);
        return juros;
    }

    public BigDecimal getTotal() {
        return Utils.somar(this.getValorCorrigido(), this.getJuros(), this.getValorCorrigido());
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public static List<ArmazenamentoDaAtualizacao> obterTodosPor(CustasJudiciaisDaAtualizacao custas) {
        return ArmazenamentoDaAtualizacao.getRepositorio(RepositorioDeArmazenamentoDaAtualizacao.class).obterTodosPor(custas);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    public void encontrarQuantidadeDeDiasEValorDasCustas(Date dataTermino) {
        Date dataFinal = dataTermino;
        if (Utils.naoNulo(this.getDataTerminoArmazenamento()) && HelperDate.dateBefore(this.getDataTerminoArmazenamento(), dataFinal)) {
            dataFinal = this.getDataTerminoArmazenamento();
        }
        Periodo periodoArmazenamento = new Periodo();
        periodoArmazenamento.setInicial(this.getDataInicioArmazenamento());
        periodoArmazenamento.setFinal(dataFinal);
        Integer qtDias = periodoArmazenamento.totalDeDias();
        this.setQtdeDias(qtDias);
        BigDecimal custaArmazenamento = this.getValorAvaliacaoArmazenamento().multiply(ZERO_VIRGULA_UM_PORCENTO, Utils.CONTEXTO_MATEMATICO);
        custaArmazenamento = custaArmazenamento.multiply(new BigDecimal(qtDias), Utils.CONTEXTO_MATEMATICO);
        this.setValorCustasArmazenamento(custaArmazenamento);
    }
}

