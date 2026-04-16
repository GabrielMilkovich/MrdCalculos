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
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.RepositorioDeArmazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.regras.DataVencimentoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao;
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
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBCUSTASARMAZENAMENTO")
@SequenceGenerator(name="SQCUSTASARMAZENAMENTO", sequenceName="SQCUSTASARMAZENAMENTO", allocationSize=1)
@Name(value="armazenamento")
public class Armazenamento
extends EntidadeBase
implements EventoAtualizacao {
    private static final long serialVersionUID = -3682012516340482602L;
    private static final int PRIORIDADE_ATUALIZACAO = 4;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCUSTASARMAZENAMENTO")
    @Column(name="IIDCUSTAARMAZENAMENTO")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCUSTAS")
    private CustasJudiciais custasJudiciais;
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
    @Column(name="SFLORIGEMREGISTRO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoOrigemRegistroEnum")})
    private TipoOrigemRegistroEnum origemRegistro = TipoOrigemRegistroEnum.CALCULO;
    @Transient
    private Integer qtdeDiasTransiente = null;

    public Armazenamento() {
        super(RepositorioDeArmazenamento.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public static Armazenamento obter(long id) {
        return (Armazenamento)EntidadeBase.obter(RepositorioDeArmazenamento.class, id);
    }

    public CustasJudiciais getCustasJudiciais() {
        return this.custasJudiciais;
    }

    public void setCustasJudiciais(CustasJudiciais custasJudiciais) {
        this.custasJudiciais = custasJudiciais;
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

    public TipoOrigemRegistroEnum getOrigemRegistro() {
        return this.origemRegistro;
    }

    public void setOrigemRegistro(TipoOrigemRegistroEnum origemRegistro) {
        this.origemRegistro = origemRegistro;
    }

    public Integer getQtdeDiasTransiente() {
        if (Utils.nulo(this.qtdeDiasTransiente) && Utils.naoNulos(this.dataInicioArmazenamento, this.dataTerminoArmazenamento)) {
            this.qtdeDiasTransiente = new Periodo(this.dataInicioArmazenamento, this.dataTerminoArmazenamento).totalDeDias();
        }
        return this.qtdeDiasTransiente;
    }

    public BigDecimal getValorCustasArmazenamentoTrasiente() {
        if (Utils.naoNulos(this.valorAvaliacaoArmazenamento, this.getQtdeDiasTransiente())) {
            return Utils.arredondarValorMonetario(this.valorAvaliacaoArmazenamento.multiply(new BigDecimal("0.001"), Utils.CONTEXTO_MATEMATICO).multiply(new BigDecimal(this.getQtdeDiasTransiente()), Utils.CONTEXTO_MATEMATICO));
        }
        return null;
    }

    public BigDecimal getValorCorrigido() {
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.getValorCustasArmazenamento(), this.getValorCustasArmazenamento());
    }

    public BigDecimal getJuros() {
        return Utils.aplicarJuros(this.getTaxaJuros(), this.getValorCorrigido());
    }

    public BigDecimal getTotal() {
        return Utils.somar(this.getValorCorrigido(), this.getJuros(), this.getValorCorrigido());
    }

    @Override
    public Armazenamento validar() {
        NegocioException excecao = new NegocioException();
        if (this.origemRegistro.equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) {
            if (Utils.naoNulos(this.getDataInicioArmazenamento(), this.getCustasJudiciais().getCalculo().getDataDeLiquidacao()) && HelperDate.dateBefore(this.getDataInicioArmazenamento(), this.getCustasJudiciais().getCalculo().getDataDeLiquidacao())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0127, Utils.formatarData(this.getCustasJudiciais().getCalculo().getDataDeLiquidacao())));
            }
            if (Utils.naoNulo(this.getDataInicioArmazenamento()) && HelperDate.dateAfter(this.getDataInicioArmazenamento(), new Date())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0128, new Object[0]));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        GerenciadorDeValidadores.getInstance().validar(Armazenamento.class, this);
        return this;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    public static List<Armazenamento> obterTodosPor(CustasJudiciais custas) {
        return Armazenamento.getRepositorio(RepositorioDeArmazenamento.class).obterTodosPor(custas);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    @Override
    public Integer getPrioridade() {
        return 4;
    }
}

