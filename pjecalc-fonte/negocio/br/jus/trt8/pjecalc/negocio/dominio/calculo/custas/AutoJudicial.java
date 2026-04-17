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
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAutoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.RepositorioDeAutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.regras.DataVencimentoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.util.Set;
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
@Table(name="TBCUSTASAUTOS")
@SequenceGenerator(name="SQCUSTASAUTOS", sequenceName="SQCUSTASAUTOS", allocationSize=1)
@Name(value="autoJudicial")
public class AutoJudicial
extends EntidadeBase
implements EventoAtualizacao {
    private static final long serialVersionUID = 1831858376970402682L;
    private static final int PRIORIDADE_ATUALIZACAO = 4;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCUSTASAUTOS")
    @Column(name="IIDCUSTAAUTOS")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCUSTAS")
    private CustasJudiciais custasJudiciais;
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
    @Column(name="SFLORIGEMREGISTRO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoOrigemRegistroEnum")})
    private TipoOrigemRegistroEnum origemRegistro = TipoOrigemRegistroEnum.CALCULO;
    @Transient
    private BigDecimal valorTetoTransiente;
    @Transient
    private BigDecimal valorCustasAutoTransiente;

    public AutoJudicial() {
        super(RepositorioDeAutoJudicial.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public static AutoJudicial obter(long id) {
        return (AutoJudicial)EntidadeBase.obter(RepositorioDeAutoJudicial.class, id);
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

    public BigDecimal getValorTetoTransiente() {
        return this.valorTetoTransiente;
    }

    public void setValorTetoTransiente(BigDecimal valorTetoTransiente) {
        this.valorTetoTransiente = valorTetoTransiente;
    }

    public BigDecimal getValorCustasAutoTransiente() {
        return this.valorCustasAutoTransiente;
    }

    public void setValorCustasAutoTransiente(BigDecimal valorCustasAutoTransiente) {
        this.valorCustasAutoTransiente = valorCustasAutoTransiente;
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

    public BigDecimal getValorCorrigido() {
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.getValorCustasAuto(), this.getValorCustasAuto());
    }

    public BigDecimal getJuros() {
        return Utils.aplicarJuros(this.getTaxaJuros(), this.getValorCorrigido());
    }

    public BigDecimal getTotal() {
        return Utils.somar(this.getValorCorrigido(), this.getJuros(), this.getValorCorrigido());
    }

    @Override
    public AutoJudicial validar() {
        NegocioException excecao = new NegocioException();
        if (this.origemRegistro.equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) {
            if (Utils.naoNulos(this.getDataVencimentoAuto(), this.getCustasJudiciais().getCalculo().getDataDeLiquidacao()) && HelperDate.dateBefore(this.getDataVencimentoAuto(), this.getCustasJudiciais().getCalculo().getDataDeLiquidacao())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0127, Utils.formatarData(this.getCustasJudiciais().getCalculo().getDataDeLiquidacao())));
            }
            if (Utils.naoNulo(this.getDataVencimentoAuto()) && HelperDate.dateAfter(this.getDataVencimentoAuto(), new Date())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0128, new Object[0]));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        GerenciadorDeValidadores.getInstance().validar(AutoJudicial.class, this);
        return this;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    public static List<AutoJudicial> obterTodosPor(CustasJudiciais custas) {
        return AutoJudicial.getRepositorio(RepositorioDeAutoJudicial.class).obterTodosPor(custas);
    }

    public static Set<AutoJudicial> atualizarValoresTransientes(Set<AutoJudicial> autosJudiciais) {
        return AutoJudicial.getRepositorio(RepositorioDeAutoJudicial.class).atualizarValoresTransientes(autosJudiciais);
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

