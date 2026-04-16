/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.segurodesemprego;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.Unique;
import br.jus.trt8.pjecalc.negocio.dominio.segurodesemprego.RepositorioDeTabelaSeguroDesemprego;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBTABELASEGURODESEMPREGO")
@SequenceGenerator(name="SQTABELASEGURODESEMPREGO", sequenceName="SQTABELASEGURODESEMPREGO", allocationSize=1)
@Name(value="tabelaSeguroDesemprego")
public class TabelaSeguroDesemprego
extends EntidadeBase {
    private static final long serialVersionUID = 5015189235954375214L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTABELASEGURODESEMPREGO")
    @Column(name="IIDREGISTROSEGURODESEMPREGO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="DDTCOMPETENCIAREGISTRO")
    @Temporal(value=TemporalType.DATE)
    @Unique(fields={"competencia"})
    @LimitedTo100Years
    @Required
    private Date competencia;
    @Column(name="RVLPISO", precision=19, scale=2)
    @Required
    private BigDecimal valorPiso = BigDecimal.ZERO;
    @Column(name="RVLTETO", precision=19, scale=2)
    @GreaterThan(value="valorPiso")
    @Required
    private BigDecimal valorTeto = BigDecimal.ZERO;
    @Column(name="RVLFINALFAIXAUM", precision=19, scale=2)
    @GreaterThan(value="valorInicialFaixa1")
    @Required
    private BigDecimal valorFinalFaixa1 = BigDecimal.ZERO;
    @Column(name="RVLPERCENTUALFAIXAUM", precision=5, scale=2)
    @Required
    private BigDecimal valorPercentualFaixa1 = BigDecimal.ZERO;
    @Column(name="RVLPERCENTUALFAIXADOIS", precision=5, scale=2)
    @Required
    private BigDecimal valorPercentualFaixa2 = BigDecimal.ZERO;
    @Column(name="RVLSOMAFAIXADOIS", precision=19, scale=2)
    @Required
    private BigDecimal somaFaixa2 = BigDecimal.ZERO;
    @Transient
    private BigDecimal valorInicialFaixa1 = BigDecimal.ZERO;
    @Transient
    private BigDecimal valorInicialFaixa2 = BigDecimal.ZERO;

    public TabelaSeguroDesemprego() {
        super(RepositorioDeTabelaSeguroDesemprego.class);
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

    public Date getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    public BigDecimal getValorPiso() {
        return this.valorPiso;
    }

    public void setValorPiso(BigDecimal valorPiso) {
        this.valorPiso = valorPiso;
    }

    public BigDecimal getValorTeto() {
        return this.valorTeto;
    }

    public void setValorTeto(BigDecimal valorTeto) {
        this.valorTeto = valorTeto;
    }

    public BigDecimal getValorInicialFaixa1() {
        return this.valorInicialFaixa1;
    }

    public void setValorInicialFaixa1(BigDecimal valorInicialFaixa1) {
        this.valorInicialFaixa1 = valorInicialFaixa1;
    }

    public BigDecimal getValorPercentualFaixa1() {
        return this.valorPercentualFaixa1;
    }

    public void setValorPercentualFaixa1(BigDecimal valorPercentualFaixa1) {
        this.valorPercentualFaixa1 = valorPercentualFaixa1;
    }

    public BigDecimal getValorInicialFaixa2() {
        this.valorInicialFaixa2 = Utils.somar(this.valorFinalFaixa1, new BigDecimal("0.01"), BigDecimal.ZERO);
        return this.valorInicialFaixa2;
    }

    public void setValorInicialFaixa2(BigDecimal valorInicialFaixa2) {
        this.valorInicialFaixa2 = valorInicialFaixa2;
    }

    public BigDecimal getValorPercentualFaixa2() {
        return this.valorPercentualFaixa2;
    }

    public void setValorPercentualFaixa2(BigDecimal valorPercentualFaixa2) {
        this.valorPercentualFaixa2 = valorPercentualFaixa2;
    }

    public Long getId() {
        return this.id;
    }

    public BigDecimal getValorFinalFaixa1() {
        return this.valorFinalFaixa1;
    }

    public void setValorFinalFaixa1(BigDecimal valorFinalFaixa1) {
        this.valorFinalFaixa1 = valorFinalFaixa1;
    }

    public BigDecimal getSomaFaixa2() {
        return this.somaFaixa2;
    }

    public void setSomaFaixa2(BigDecimal somaFaixa2) {
        this.somaFaixa2 = somaFaixa2;
    }

    public void sugerirValorSomaFaixa2() {
        this.somaFaixa2 = Utils.aplicarTaxa(this.valorPercentualFaixa1, this.valorFinalFaixa1);
    }

    public static List<TabelaSeguroDesemprego> obterTodosDecrecente() {
        return TabelaSeguroDesemprego.getRepositorio(RepositorioDeTabelaSeguroDesemprego.class).obterTodos("competencia desc");
    }

    public static TabelaSeguroDesemprego obterTabelaDa(Date data) {
        TabelaSeguroDesemprego tabela = TabelaSeguroDesemprego.getRepositorio(RepositorioDeTabelaSeguroDesemprego.class).obterParaA(data);
        while (Utils.nulo(tabela) && HelperDate.dateAfterOrEquals(data, HelperDate.getInstance(1986, 2, 1).getDate())) {
            data = HelperDate.getInstance(data).addMonth(-1).getDate();
            tabela = TabelaSeguroDesemprego.getRepositorio(RepositorioDeTabelaSeguroDesemprego.class).obterParaA(data);
        }
        return tabela;
    }

    @Override
    protected TabelaSeguroDesemprego validar() {
        GerenciadorDeValidadores.getInstance().validar(TabelaSeguroDesemprego.class, this);
        return this;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public static void remover(TabelaSeguroDesemprego tabelaSeguroDesemprego) {
        TabelaSeguroDesemprego.getRepositorio(RepositorioDeTabelaSeguroDesemprego.class).remover(tabelaSeguroDesemprego);
    }

    public void criarTabelaParaProximaCompetencia() {
        TabelaSeguroDesemprego tabela = new TabelaSeguroDesemprego();
        HelperDate proximaCompetencia = HelperDate.getInstance(this.getCompetencia());
        proximaCompetencia.addMonth(1);
        tabela.setCompetencia(proximaCompetencia.getDate());
        tabela.setValorPiso(this.getValorPiso());
        tabela.setValorInicialFaixa1(this.getValorInicialFaixa1());
        tabela.setValorFinalFaixa1(this.getValorFinalFaixa1());
        tabela.setValorPercentualFaixa1(this.getValorPercentualFaixa1());
        tabela.setValorInicialFaixa2(this.getValorInicialFaixa2());
        tabela.setValorPercentualFaixa2(this.getValorPercentualFaixa2());
        tabela.setSomaFaixa2(this.getSomaFaixa2());
        tabela.setValorTeto(this.getValorTeto());
        tabela.salvar();
    }
}

