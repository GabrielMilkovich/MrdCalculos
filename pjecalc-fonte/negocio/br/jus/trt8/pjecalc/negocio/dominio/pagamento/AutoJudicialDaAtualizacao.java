/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
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
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAutoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.regras.DataVencimentoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.custas.ParametrosDeCustasFixas;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDeAutoJudicialDaAtualizacao;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
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
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBCUSTASAUTOSATUALIZACAO")
@SequenceGenerator(name="SQCUSTASAUTOSATUALIZACAO", sequenceName="SQCUSTASAUTOSATUALIZACAO", allocationSize=1)
@Name(value="autoJudicialAtualizacao")
public class AutoJudicialDaAtualizacao
extends EntidadeBase {
    private static final long serialVersionUID = 1831858376970402682L;
    private static final BigDecimal CINCO_POR_CENTO = new BigDecimal(0.05);
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCUSTASAUTOSATUALIZACAO")
    @Column(name="IIDCUSTAAUTOSATUALIZACAO")
    private final Long id = null;
    @ManyToOne
    @JoinColumn(name="IIDCUSTASATUALIZACAO")
    private CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="STPAUTO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeAutoEnum")})
    @Required
    private TipoDeAutoEnum tipoDeAuto;
    @Column(name="RVLAVALIACAO", precision=12, scale=2, nullable=false)
    @Required
    private BigDecimal valorAvaliacaoAuto;
    @Column(name="DDTVENCIMENTO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @Required
    @ValidValue(validRule=DataVencimentoValidRule.class, flag=5)
    private Date dataVencimentoAuto;
    @Column(name="RVLTETO", precision=12, scale=2, nullable=true)
    private BigDecimal valorTeto;
    @Column(name="RVLCUSTAS", precision=12, scale=2, nullable=true)
    private BigDecimal valorCustasAuto;
    @Column(name="RVLINDICECORRECAO", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecao;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJuros;

    public AutoJudicialDaAtualizacao() {
        super(RepositorioDeAutoJudicialDaAtualizacao.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public static AutoJudicialDaAtualizacao obter(long id) {
        return (AutoJudicialDaAtualizacao)AutoJudicialDaAtualizacao.obter(RepositorioDeAutoJudicialDaAtualizacao.class, id);
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

    public TipoDeAutoEnum getTipoDeAuto() {
        return this.tipoDeAuto;
    }

    public void setTipoDeAuto(TipoDeAutoEnum tipoDeAuto) {
        this.tipoDeAuto = tipoDeAuto;
    }

    public BigDecimal getValorTeto() {
        return this.valorTeto;
    }

    public void setValorTeto(BigDecimal valorTeto) {
        this.valorTeto = valorTeto;
    }

    public BigDecimal getValorAvaliacaoAuto() {
        return this.valorAvaliacaoAuto;
    }

    public void setValorAvaliacaoAuto(BigDecimal valorAvaliacaoAuto) {
        this.valorAvaliacaoAuto = valorAvaliacaoAuto;
    }

    public Date getDataVencimentoAuto() {
        return this.dataVencimentoAuto;
    }

    public void setDataVencimentoAuto(Date dataVencimentoAuto) {
        this.dataVencimentoAuto = dataVencimentoAuto;
    }

    public BigDecimal getValorCustasAuto() {
        return this.valorCustasAuto;
    }

    public void setValorCustasAuto(BigDecimal valorCustasAuto) {
        this.valorCustasAuto = valorCustasAuto;
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

    public BigDecimal getValorCorrigido() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.getValorCustasAuto(), this.getValorCustasAuto()));
    }

    public BigDecimal getJuros() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJuros(), this.getValorCorrigido()));
    }

    public BigDecimal getTotal() {
        return Utils.somar(this.getValorCorrigido(), this.getJuros(), this.getValorCorrigido());
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public static List<AutoJudicialDaAtualizacao> obterTodosPor(CustasJudiciaisDaAtualizacao custas) {
        return AutoJudicialDaAtualizacao.getRepositorio(RepositorioDeAutoJudicialDaAtualizacao.class).obterTodosPor(custas);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    public void encontrarTetoEValorCustas() {
        ParametrosDeCustasFixas parametro = null;
        BigDecimal teto = null;
        if (Utils.naoNulo(this.getDataVencimentoAuto())) {
            parametro = ParametrosDeCustasFixas.obterPorData(this.getDataVencimentoAuto());
        }
        if (Utils.naoNulo(parametro)) {
            teto = parametro.getValorTetoCustasDeAutos();
        }
        this.setValorTeto(teto);
        BigDecimal custaAuto = this.getValorAvaliacaoAuto().multiply(CINCO_POR_CENTO, Utils.CONTEXTO_MATEMATICO);
        if (Utils.naoNulo(teto) && custaAuto.compareTo(teto) > 0) {
            custaAuto = teto;
        }
        this.setValorCustasAuto(custaAuto);
    }
}

