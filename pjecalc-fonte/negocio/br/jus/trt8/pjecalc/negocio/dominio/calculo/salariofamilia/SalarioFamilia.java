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
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Fetch
 *  org.hibernate.annotations.FetchMode
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoSalarioPagoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.ItemHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.ItemSalarioDevido;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.LegendaDaFormulaDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.MaquinaDeCalculoDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.OcorrenciaDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.RepositorioDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.TotalizadorDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.VariacaoQuantidadeFilho;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.regras.PeriodoSalarioFamiliaValidRule;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashSet;
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
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBSALARIOFAMILIA")
@SequenceGenerator(name="SQSALARIOFAMILIA", sequenceName="SQSALARIOFAMILIA", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="salarioFamilia")
public class SalarioFamilia
extends EntidadeBase {
    private static final long serialVersionUID = 50077938967591313L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQSALARIOFAMILIA")
    @Column(name="IIDSALARIOFAMILIA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="SFLAPURARSALARIOFAMILIA", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarSalarioFamilia = Boolean.FALSE;
    @Column(name="IQTFILHO14ANOS")
    @Required
    private Integer quantFilhosMenores14Anos;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="salarioFamilia")
    @OrderBy(value="dataInicial")
    private List<VariacaoQuantidadeFilho> variacaoQuantidadesFilhos;
    @Column(name="DDTINICIAL")
    @Temporal(value=TemporalType.DATE)
    @LimitedTo100Years
    @Required
    private Date dataInicial;
    @Column(name="DDTFINAL")
    @Temporal(value=TemporalType.DATE)
    @GreaterOrEqualThan(value="dataInicial")
    @LimitedTo100Years
    @Required
    private Date dataFinal;
    @Column(name="STPSALARIOPAGO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoSalarioPagoEnum")})
    private TipoSalarioPagoEnum tipoSalarioPago = TipoSalarioPagoEnum.HISTORICO_SALARIAL;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="salarioFamilia")
    private Set<ItemHistoricoSalarial> itensHistoricoSalarial;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="salarioFamilia")
    private Set<ItemSalarioDevido> itensSalarioDevido;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="salarioFamilia")
    @Fetch(value=FetchMode.SELECT)
    @OrderBy(value="dataInicioOcorrencia")
    private Set<OcorrenciaDeSalarioFamilia> ocorrencias;
    @Transient
    protected MaquinaDeCalculoDeSalarioFamilia maquinaDeCalculoDeSalarioFamilia;
    @Transient
    private TotalizadorDeSalarioFamilia totalizador;
    @Transient
    protected LegendaDaFormulaDeSalarioFamilia legendaDaFormula;
    @Column(name="SFLCOMPORPRINCIPAL", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="LogicoEnum")})
    private LogicoEnum comporPrincipal = LogicoEnum.SIM;

    public SalarioFamilia() {
        super(RepositorioDeSalarioFamilia.class);
        this.variacaoQuantidadesFilhos = new ArrayList<VariacaoQuantidadeFilho>();
        this.itensHistoricoSalarial = new LinkedHashSet<ItemHistoricoSalarial>();
        this.itensSalarioDevido = new LinkedHashSet<ItemSalarioDevido>();
        this.maquinaDeCalculoDeSalarioFamilia = new MaquinaDeCalculoDeSalarioFamilia(this);
    }

    public SalarioFamilia(Calculo calculo) {
        this();
        this.calculo = calculo;
    }

    protected TotalizadorDeSalarioFamilia getTotalizador() {
        if (Utils.nulo(this.totalizador)) {
            this.totalizador = new TotalizadorDeSalarioFamilia(this);
        }
        return this.totalizador;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public void sugerirPeriodo() {
        Periodo periodo = new PeriodoSalarioFamiliaValidRule().getPeriodoSugerido(this);
        this.setDataInicial(periodo.getInicial());
        this.setDataFinal(periodo.getFinal());
    }

    public void sugerirBaseDoSalarioPago() {
        Calculo calculo = this.getCalculo();
        if (Utils.naoNulo(calculo)) {
            if (!this.getCalculo().getHistoricosSalariais().isEmpty()) {
                this.setTipoSalarioPago(TipoSalarioPagoEnum.HISTORICO_SALARIAL);
            } else if (Utils.naoNulo(calculo.getValorUltimaRemuneracao())) {
                this.setTipoSalarioPago(TipoSalarioPagoEnum.ULTIMA_REMUNERACAO);
            } else if (Utils.naoNulo(calculo.getValorMaiorRemuneracao())) {
                this.setTipoSalarioPago(TipoSalarioPagoEnum.MAIOR_REMUNERACAO);
            } else {
                this.setTipoSalarioPago(TipoSalarioPagoEnum.NENHUM);
            }
        } else {
            this.setTipoSalarioPago(TipoSalarioPagoEnum.NENHUM);
        }
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public Boolean getApurarSalarioFamilia() {
        return this.apurarSalarioFamilia;
    }

    public void setApurarSalarioFamilia(Boolean apurarSalarioFamilia) {
        this.apurarSalarioFamilia = apurarSalarioFamilia;
    }

    public Integer getQuantFilhosMenores14Anos() {
        return this.quantFilhosMenores14Anos;
    }

    public void setQuantFilhosMenores14Anos(Integer quantFilhosMenores14Anos) {
        this.quantFilhosMenores14Anos = quantFilhosMenores14Anos;
    }

    public TipoSalarioPagoEnum getTipoSalarioPago() {
        return this.tipoSalarioPago;
    }

    public void setTipoSalarioPago(TipoSalarioPagoEnum tipoSalarioPago) {
        this.tipoSalarioPago = tipoSalarioPago;
    }

    public Set<ItemHistoricoSalarial> getItensHistoricoSalarial() {
        return this.itensHistoricoSalarial;
    }

    public void setItensHistoricoSalarial(Set<ItemHistoricoSalarial> itensHistoricoSalarial) {
        this.itensHistoricoSalarial = itensHistoricoSalarial;
    }

    public Set<ItemSalarioDevido> getItensSalarioDevido() {
        return this.itensSalarioDevido;
    }

    public void setItensSalarioDevido(Set<ItemSalarioDevido> itensSalarioDevido) {
        this.itensSalarioDevido = itensSalarioDevido;
    }

    public List<VariacaoQuantidadeFilho> getVariacaoQuantidadesFilhos() {
        if (Utils.nulo(this.variacaoQuantidadesFilhos)) {
            this.variacaoQuantidadesFilhos = new ArrayList<VariacaoQuantidadeFilho>();
        }
        Collections.sort(this.variacaoQuantidadesFilhos);
        return this.variacaoQuantidadesFilhos;
    }

    public void setVariacaoQuantidadesFilhos(List<VariacaoQuantidadeFilho> variacaoQuantidadesFilhos) {
        this.variacaoQuantidadesFilhos = variacaoQuantidadesFilhos;
    }

    public Date getDataInicial() {
        return this.dataInicial;
    }

    public void setDataInicial(Date dataInicial) {
        this.dataInicial = dataInicial;
    }

    public Date getDataFinal() {
        return this.dataFinal;
    }

    public void setDataFinal(Date dataFinal) {
        this.dataFinal = dataFinal;
    }

    public Set<OcorrenciaDeSalarioFamilia> getOcorrencias() {
        if (Utils.nulo(this.ocorrencias)) {
            this.ocorrencias = new LinkedHashSet<OcorrenciaDeSalarioFamilia>();
        }
        return this.ocorrencias;
    }

    public void setOcorrencias(Set<OcorrenciaDeSalarioFamilia> ocorrencias) {
        this.ocorrencias = ocorrencias;
    }

    public LogicoEnum getComporPrincipal() {
        return this.comporPrincipal;
    }

    public void setComporPrincipal(LogicoEnum comporPrincipal) {
        this.comporPrincipal = comporPrincipal;
    }

    @Override
    protected SalarioFamilia validar() {
        GerenciadorDeValidadores.getInstance().validar(SalarioFamilia.class, this);
        NegocioException excecao = new NegocioException();
        Periodo periodo = this.getCalculo().obterPeriodoDoCalculoParaRestricao(Boolean.TRUE, Boolean.FALSE);
        periodo.setInicial(periodo.obterDataInicialHelper().setDay(1).getDate());
        periodo.setFinal(periodo.obterDataFinalHelper().lastDayOfTheMonth().getDate());
        if (!periodo.isPeriodoContemEsta(this.dataInicial)) {
            if (periodo.isDataMenorQueIncial(this.dataInicial)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataInicial", Mensagens.MSG0008, "Compet\u00eancia Inicial", periodo.getLabelDataIncial()));
            } else {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataInicial", Mensagens.MSG0010, "Compet\u00eancia Inicial", periodo.getLabelDataFinal()));
            }
        }
        if (!periodo.isPeriodoContemEsta(this.dataFinal)) {
            if (periodo.isDataMaiorQueFinal(this.dataFinal)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataFinal", Mensagens.MSG0010, "Compet\u00eancia Final", periodo.getLabelDataFinal()));
            } else {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataFinal", Mensagens.MSG0008, "Compet\u00eancia Final", periodo.getLabelDataIncial()));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        if (this.apurarSalarioFamilia.booleanValue()) {
            if (TipoSalarioPagoEnum.HISTORICO_SALARIAL == this.tipoSalarioPago && this.getItensHistoricoSalarial().isEmpty()) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0047, "Hist\u00f3rico"));
            }
            if (TipoSalarioPagoEnum.NENHUM == this.tipoSalarioPago && this.getItensSalarioDevido().isEmpty()) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0061, new Object[0]));
            }
            if (!TipoSalarioPagoEnum.HISTORICO_SALARIAL.equals((Object)this.tipoSalarioPago)) {
                this.getItensHistoricoSalarial().clear();
            }
        }
        return this;
    }

    @Override
    public void salvar() {
        this.limparOcorrencias();
        super.salvar();
    }

    private void limparOcorrencias() {
        this.getOcorrencias().clear();
    }

    public void liquidar() {
        this.maquinaDeCalculoDeSalarioFamilia.liquidar();
    }

    public void limparJuros() {
        for (OcorrenciaDeSalarioFamilia ocorrenciaDeSalarioFamilia : this.getOcorrencias()) {
            ocorrenciaDeSalarioFamilia.setTaxaDeJuros(null);
        }
    }

    public void calcularJuros() {
        this.maquinaDeCalculoDeSalarioFamilia.calcularJuros();
    }

    public void adicionarEmVariacaoQuantidadeFilho(VariacaoQuantidadeFilho variacao) {
        this.getVariacaoQuantidadesFilhos().add(variacao.validar());
    }

    public void removerDeVariacaoQuantidadeFilho(VariacaoQuantidadeFilho variacao) {
        this.getVariacaoQuantidadesFilhos().remove(variacao);
    }

    public void adicionarEmItemHistoricoSalarial(ItemHistoricoSalarial historico) {
        this.getItensHistoricoSalarial().add(historico.validar());
    }

    public void removerDeItemHistoricoSalarial(ItemHistoricoSalarial historico) {
        this.getItensHistoricoSalarial().remove(historico);
    }

    public void adicionarEmItemSalarioDevido(ItemSalarioDevido salarioDevido) {
        this.getItensSalarioDevido().add(salarioDevido.validar());
    }

    public void removerDeItemSalarioDevido(ItemSalarioDevido salarioDevido) {
        this.getItensSalarioDevido().remove(salarioDevido);
    }

    public void removerDeOcorrencias(List<OcorrenciaDeSalarioFamilia> filhos, boolean flush) {
        SalarioFamilia.getRepositorio(RepositorioDeSalarioFamilia.class).removerDeOcorrencias(this, filhos, flush);
    }

    public Integer encontraQuantidadeDeFilhosNa(Competencia competencia) {
        if (Utils.nulo(competencia) || Utils.nulo(competencia.getData())) {
            return null;
        }
        Integer quantidadeFilhos = this.getQuantFilhosMenores14Anos();
        Date dataAuxiliar = this.getDataInicial();
        for (VariacaoQuantidadeFilho variacao : this.getVariacaoQuantidadesFilhos()) {
            if (!HelperDate.dateAfterOrEquals(competencia.getData(), variacao.getDataInicial()) || !HelperDate.dateAfterOrEquals(variacao.getDataInicial(), dataAuxiliar)) continue;
            quantidadeFilhos = variacao.getQuantFilhosMenores14Anos();
            dataAuxiliar = variacao.getDataInicial();
        }
        return quantidadeFilhos;
    }

    public BigDecimal getTotalDoValorDevido() {
        return this.getTotalizador().getDevido();
    }

    public BigDecimal getTotalDoDevidoCorrigido() {
        return this.getTotalizador().getDevidoCorrigido();
    }

    public BigDecimal getTotalDeJuros() {
        return this.getTotalizador().getJuros();
    }

    public BigDecimal getTotalGeral() {
        return this.getTotalizador().getTotal();
    }

    public LegendaDaFormulaDeSalarioFamilia getLegendaDaFormula() {
        if (Utils.nulo(this.legendaDaFormula)) {
            this.legendaDaFormula = new LegendaDaFormulaDeSalarioFamilia(this);
        }
        return this.legendaDaFormula;
    }

    public boolean existemDadosParaRelatorio() {
        return Utils.naoNulo(this.getId()) && this.getApurarSalarioFamilia() != false;
    }

    public boolean isComporOPrincipal() {
        return LogicoEnum.SIM == this.getComporPrincipal();
    }

    public boolean isDatasSugeridasValidasParaCriacao() {
        Periodo periodo;
        return !Utils.nulo(this.getId()) || !HelperDate.getCurrentCompetence((periodo = new PeriodoSalarioFamiliaValidRule().getPeriodoSugerido(this)).getFinal()).lessThen(HelperDate.getCurrentCompetence(periodo.getInicial()));
    }
}

