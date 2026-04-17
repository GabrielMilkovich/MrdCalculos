/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.EnumType
 *  javax.persistence.Enumerated
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
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.LegendaDaFormulaDoIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.MaquinaDeCalculoDeIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.ProporcoesIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.RepositorioDeIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.RepositorioDeOcorrenciaDeIrpfAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.RepositorioDeOcorrenciaDeIrpfPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import java.math.BigDecimal;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
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
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBIMPOSTORENDACALCULO")
@SequenceGenerator(name="SQIMPOSTORENDACALCULO", sequenceName="SQIMPOSTORENDACALCULO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="irpf")
public class Irpf
extends EntidadeBase {
    private static final long serialVersionUID = -516073383074838320L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQIMPOSTORENDACALCULO")
    @Column(name="IIDIMPOSTORENDACALCULO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARIMPOSTORENDA", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarImpostoRenda = Boolean.TRUE;
    @Column(name="SFLINCIDIRSOBREJUROSMORA", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidirSobreJurosDeMora = Boolean.FALSE;
    @Column(name="SFLCOBRARDORECLAMADO", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean cobrarDoReclamado = Boolean.FALSE;
    @Column(name="SFLTRIBUTACAOEXCLUSIVA", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean considerarTributacaoExclusiva = Boolean.FALSE;
    @Column(name="SFLTRIBUTACAOEMSEPARADO", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean considerarTributacaoEmSeparado = Boolean.FALSE;
    @Column(name="SFLREGIMECAIXA", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean regimeDeCaixa = Boolean.FALSE;
    @Column(name="SFLDEDUZIRCONTSOCIALDEVIDARCTE", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean deduzirContribuicaoSocialDevidaPeloReclamante = Boolean.TRUE;
    @Column(name="SFLDEDUZIRPREVIDENCIAPRIVADA", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean deduzirPrevidenciaPrivada = Boolean.TRUE;
    @Column(name="SFLDEDUZIRPENSAOALIMENTICIA", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean deduzirPensaoAlimenticia = Boolean.TRUE;
    @Column(name="SFLDEDUZIRHONORARIODEVIDORCTE", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean deduzirHonorariosDevidosPeloReclamante = Boolean.TRUE;
    @Column(name="SFLAPOSENTADOMAIORQUEMEIACINCO", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aposentadoMaiorQue65Anos = Boolean.FALSE;
    @Column(name="SFLPOSSUIDEPENDENTES", nullable=true, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean possuiDependentes = Boolean.FALSE;
    @Column(name="IQTDEPENDENTES", nullable=true)
    private Integer quantidadeDependentes = 0;
    @Column(name="DDTINICIOANOSANTERIORES", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataInicioAnosAnteriores;
    @Column(name="DDTFIMANOSANTERIORES", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataFimAnosAnteriores;
    @Column(name="DDTINICIOANORECEBIMENTO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataInicioAnoRecebimento;
    @Column(name="DDTFIMANORECEBIMENTO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataFimAnoRecebimento;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="irpf")
    @Fetch(value=FetchMode.SELECT)
    @OrderBy(value="dataOcorrencia")
    private Set<OcorrenciaDeIrpf> ocorrencias;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="irpf")
    @Fetch(value=FetchMode.SELECT)
    @OrderBy(value="dataOcorrencia, tipo")
    private Set<OcorrenciaDeIrpfAtualizacao> ocorrenciasAtualizacao;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="irpf")
    @Fetch(value=FetchMode.SELECT)
    @OrderBy(value="dataPagamento, dataEvento")
    private Set<OcorrenciaDeIrpfPagamento> ocorrenciasPagamento;
    @Transient
    private MaquinaDeCalculoDeIrpf maquinaDeCalculoDeIrpf = new MaquinaDeCalculoDeIrpf(this);
    @Transient
    private Periodo periodoDasOcorrencias;
    @Transient
    private Boolean cobrarEncargos;
    @Transient
    private LegendaDaFormulaDoIrpf legendaDaFormula;
    @Column(name="IQTDMESESRENDIMENTOTRIB", nullable=true)
    private Integer qtdMesesRendimentoTributaveis;

    public Irpf() {
        super(RepositorioDeIrpf.class);
    }

    public Irpf(Calculo calculo) {
        this();
        this.calculo = calculo;
    }

    public Long getId() {
        return this.id;
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
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public Boolean getApurarImpostoRenda() {
        return this.apurarImpostoRenda;
    }

    public void setApurarImpostoRenda(Boolean apurarImpostoRenda) {
        this.apurarImpostoRenda = apurarImpostoRenda;
    }

    public Boolean getIncidirSobreJurosDeMora() {
        return this.incidirSobreJurosDeMora;
    }

    public void setIncidirSobreJurosDeMora(Boolean incidirSobreJurosDeMora) {
        this.incidirSobreJurosDeMora = incidirSobreJurosDeMora;
    }

    public Boolean getCobrarDoReclamado() {
        if (this.cobrarDoReclamado != null) {
            return this.cobrarDoReclamado;
        }
        return false;
    }

    public void setCobrarDoReclamado(Boolean cobrarDoReclamado) {
        this.cobrarDoReclamado = cobrarDoReclamado;
    }

    public Boolean getConsiderarTributacaoExclusiva() {
        return this.considerarTributacaoExclusiva;
    }

    public void setConsiderarTributacaoExclusiva(Boolean considerarTributacaoExclusiva) {
        this.considerarTributacaoExclusiva = considerarTributacaoExclusiva;
    }

    public Boolean getConsiderarTributacaoEmSeparado() {
        return this.considerarTributacaoEmSeparado;
    }

    public void setConsiderarTributacaoEmSeparado(Boolean considerarTributacaoEmSeparado) {
        this.considerarTributacaoEmSeparado = considerarTributacaoEmSeparado;
    }

    public Boolean getRegimeDeCaixa() {
        return this.regimeDeCaixa;
    }

    public void setRegimeDeCaixa(Boolean regimeDeCaixa) {
        this.regimeDeCaixa = regimeDeCaixa;
    }

    public Boolean getDeduzirContribuicaoSocialDevidaPeloReclamante() {
        return this.deduzirContribuicaoSocialDevidaPeloReclamante;
    }

    public void setDeduzirContribuicaoSocialDevidaPeloReclamante(Boolean deduzirContribuicaoSocialDevidaPeloReclamante) {
        this.deduzirContribuicaoSocialDevidaPeloReclamante = deduzirContribuicaoSocialDevidaPeloReclamante;
    }

    public Boolean getDeduzirPrevidenciaPrivada() {
        return this.deduzirPrevidenciaPrivada;
    }

    public void setDeduzirPrevidenciaPrivada(Boolean deduzirPrevidenciaPrivada) {
        this.deduzirPrevidenciaPrivada = deduzirPrevidenciaPrivada;
    }

    public Boolean getDeduzirPensaoAlimenticia() {
        return this.deduzirPensaoAlimenticia;
    }

    public void setDeduzirPensaoAlimenticia(Boolean deduzirPensaoAlimenticia) {
        this.deduzirPensaoAlimenticia = deduzirPensaoAlimenticia;
    }

    public Boolean getDeduzirHonorariosDevidosPeloReclamante() {
        return this.deduzirHonorariosDevidosPeloReclamante;
    }

    public void setDeduzirHonorariosDevidosPeloReclamante(Boolean deduzirHonorariosDevidosPeloReclamante) {
        this.deduzirHonorariosDevidosPeloReclamante = deduzirHonorariosDevidosPeloReclamante;
    }

    public Boolean getAposentadoMaiorQue65Anos() {
        return this.aposentadoMaiorQue65Anos;
    }

    public void setAposentadoMaiorQue65Anos(Boolean aposentadoMaiorQue65Anos) {
        this.aposentadoMaiorQue65Anos = aposentadoMaiorQue65Anos;
    }

    public Boolean getPossuiDependentes() {
        return this.possuiDependentes;
    }

    public void setPossuiDependentes(Boolean possuiDependentes) {
        this.possuiDependentes = possuiDependentes;
    }

    public Integer getQuantidadeDependentes() {
        return this.quantidadeDependentes;
    }

    public void setQuantidadeDependentes(Integer quantidadeDependentes) {
        this.quantidadeDependentes = quantidadeDependentes;
    }

    public Date getDataInicioAnosAnteriores() {
        return this.dataInicioAnosAnteriores;
    }

    public void setDataInicioAnosAnteriores(Date dataInicioAnosAnteriores) {
        this.dataInicioAnosAnteriores = dataInicioAnosAnteriores;
    }

    public Date getDataFimAnosAnteriores() {
        return this.dataFimAnosAnteriores;
    }

    public void setDataFimAnosAnteriores(Date dataFimAnosAnteriores) {
        this.dataFimAnosAnteriores = dataFimAnosAnteriores;
    }

    public Date getDataInicioAnoRecebimento() {
        return this.dataInicioAnoRecebimento;
    }

    public void setDataInicioAnoRecebimento(Date dataInicioAnoRecebimento) {
        this.dataInicioAnoRecebimento = dataInicioAnoRecebimento;
    }

    public Date getDataFimAnoRecebimento() {
        return this.dataFimAnoRecebimento;
    }

    public void setDataFimAnoRecebimento(Date dataFimAnoRecebimento) {
        this.dataFimAnoRecebimento = dataFimAnoRecebimento;
    }

    public LegendaDaFormulaDoIrpf getLegendaDaFormula() {
        if (Utils.nulo(this.legendaDaFormula)) {
            this.legendaDaFormula = new LegendaDaFormulaDoIrpf(this);
        }
        return this.legendaDaFormula;
    }

    public Set<OcorrenciaDeIrpf> getOcorrencias() {
        if (Utils.nulo(this.ocorrencias)) {
            this.ocorrencias = new LinkedHashSet<OcorrenciaDeIrpf>();
        }
        return this.ocorrencias;
    }

    public void setOcorrencias(Set<OcorrenciaDeIrpf> ocorrencias) {
        this.ocorrencias = ocorrencias;
    }

    public Set<OcorrenciaDeIrpfAtualizacao> getOcorrenciasAtualizacao() {
        if (Utils.nulo(this.ocorrenciasAtualizacao)) {
            this.ocorrenciasAtualizacao = new LinkedHashSet<OcorrenciaDeIrpfAtualizacao>();
        }
        return this.ocorrenciasAtualizacao;
    }

    public void setOcorrenciasAtualizacao(Set<OcorrenciaDeIrpfAtualizacao> ocorrenciasAtualizacao) {
        this.ocorrenciasAtualizacao = ocorrenciasAtualizacao;
    }

    public Periodo getPeriodoDasOcorrencias() {
        if (Utils.nulo(this.periodoDasOcorrencias)) {
            this.periodoDasOcorrencias = new Periodo();
            if (!this.getOcorrencias().isEmpty()) {
                Object[] array = this.getOcorrencias().toArray();
                this.periodoDasOcorrencias.setInicial(((OcorrenciaDeIrpf)array[0]).getDataOcorrencia());
                this.periodoDasOcorrencias.setFinal(((OcorrenciaDeIrpf)array[array.length - 1]).getDataOcorrencia());
            }
        }
        return this.periodoDasOcorrencias;
    }

    public int getAbrangenciaDaApuracao() {
        if (Utils.naoNulos(this.dataInicioAnosAnteriores, this.dataFimAnoRecebimento)) {
            return 2;
        }
        if (Utils.naoNulo(this.dataInicioAnosAnteriores)) {
            return 1;
        }
        if (Utils.naoNulo(this.dataFimAnoRecebimento)) {
            return 0;
        }
        return -1;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public void salvar() {
        this.validarQuantidadeDependentes();
        super.salvar();
    }

    public void consistirDados() {
        if (Boolean.FALSE.equals(this.getApurarImpostoRenda())) {
            this.setIncidirSobreJurosDeMora(null);
            this.setCobrarDoReclamado(null);
            this.setConsiderarTributacaoExclusiva(null);
            this.setConsiderarTributacaoEmSeparado(null);
            this.setRegimeDeCaixa(null);
            this.setDeduzirContribuicaoSocialDevidaPeloReclamante(null);
            this.setDeduzirPrevidenciaPrivada(null);
            this.setDeduzirPensaoAlimenticia(null);
            this.setDeduzirHonorariosDevidosPeloReclamante(null);
            this.setAposentadoMaiorQue65Anos(null);
            this.setPossuiDependentes(null);
            this.setQuantidadeDependentes(null);
        }
    }

    public void removerDeOcorrencias(List<OcorrenciaDeIrpf> filhos, boolean flush) {
        Irpf.getRepositorio(RepositorioDeIrpf.class).removerDeOcorrencias(this, filhos, flush);
    }

    public void liquidarAtualizacao(Date dataEvento, ProporcoesIrpf proporcoesIrpf, CreditosDoReclamante creditoDoReclamante, DebitosDoReclamante debitosDoReclamante, boolean hasPagamentoPrincipal) {
        if (hasPagamentoPrincipal && Utils.naoNulo(creditoDoReclamante.getPagoPrincipal()) && creditoDoReclamante.getPagoPrincipal().compareTo(BigDecimal.ZERO) > 0 || !hasPagamentoPrincipal && Utils.naoNulo(creditoDoReclamante.getDiferencaPrincipal()) && creditoDoReclamante.getDiferencaPrincipal().compareTo(BigDecimal.ZERO) > 0) {
            this.periodoDasOcorrencias = null;
            if (this.getCalculo().isCalculoExterno().booleanValue()) {
                this.maquinaDeCalculoDeIrpf.liquidarAtualizacaoCalculoExterno(dataEvento, creditoDoReclamante, debitosDoReclamante, hasPagamentoPrincipal);
            } else {
                this.maquinaDeCalculoDeIrpf.liquidarAtualizacao(dataEvento, proporcoesIrpf, creditoDoReclamante, debitosDoReclamante, hasPagamentoPrincipal);
            }
        }
    }

    public void aplicarPagamento(Date dataEvento, Pagamento pagamento) {
        this.maquinaDeCalculoDeIrpf.aplicarPagamento(dataEvento, pagamento);
    }

    public void aplicarPagamentoNoSaldo(Date dataDeLiquidacao) {
        this.maquinaDeCalculoDeIrpf.aplicarPagamentoNoSaldo(dataDeLiquidacao);
    }

    public BigDecimal getTotalDiferecaComJurosEMultaAtualizacao() {
        return this.maquinaDeCalculoDeIrpf.getTotalDiferencaComJurosEMultaAtualizacao();
    }

    public BigDecimal getTotalDiferecaComJurosEMultaAtualizacaoPagamentoNosaldo(Date dataEvento) {
        return this.maquinaDeCalculoDeIrpf.getTotalDiferencaComJurosEMultaAtualizacaoPagamentoNoSaldo(dataEvento);
    }

    public BigDecimal getTotalDevidoComJurosEMultaAtualizacao(Date dataEvento) {
        return this.maquinaDeCalculoDeIrpf.getTotalDevidoComJurosEMultaAtualizacao(dataEvento);
    }

    public BigDecimal getTotalDevidoDeImpostoReferenteAoPagamento(Pagamento pagamento) {
        return this.maquinaDeCalculoDeIrpf.getTotalDevidoDeImpostoReferenteAoPagamento(pagamento);
    }

    public void liquidar() {
        this.periodoDasOcorrencias = null;
        this.maquinaDeCalculoDeIrpf.liquidar();
    }

    public BigDecimal getTotalValorDevido() {
        BigDecimal totalDevido = null;
        for (OcorrenciaDeIrpf ocorrencia : this.getOcorrencias()) {
            if (Utils.nulo(totalDevido)) {
                totalDevido = ocorrencia.getValorDevido();
                continue;
            }
            totalDevido = totalDevido.add(ocorrencia.getValorDevido());
        }
        return totalDevido;
    }

    public void validarQuantidadeDependentes() {
        if (Boolean.TRUE.equals(this.getPossuiDependentes()) && this.getQuantidadeDependentes().equals(0)) {
            throw new NegocioException(new MensagemDeRecurso("quantidadeDependentes", Mensagens.MSG0004, "Dependentes"));
        }
    }

    public void configurarValoresPadroes() {
        if (this.getApurarImpostoRenda().booleanValue()) {
            this.setIncidirSobreJurosDeMora(false);
            this.setCobrarDoReclamado(false);
            this.setConsiderarTributacaoExclusiva(false);
            this.setConsiderarTributacaoEmSeparado(false);
            this.setRegimeDeCaixa(false);
            this.setDeduzirContribuicaoSocialDevidaPeloReclamante(true);
            this.setDeduzirPrevidenciaPrivada(true);
            this.setDeduzirPensaoAlimenticia(true);
            this.setDeduzirHonorariosDevidosPeloReclamante(true);
            this.setAposentadoMaiorQue65Anos(false);
            this.setPossuiDependentes(false);
            this.setQuantidadeDependentes(0);
        }
    }

    public void removerDeOcorrenciasAtualizacao() {
        Irpf.getRepositorio(RepositorioDeOcorrenciaDeIrpfAtualizacao.class).removerDeOcorrenciasAtualizacao(this);
    }

    public void removerDeOcorrenciasPagamento() {
        Irpf.getRepositorio(RepositorioDeOcorrenciaDeIrpfPagamento.class).removerDeOcorrenciasPagamento(this);
    }

    public Set<OcorrenciaDeIrpfPagamento> getOcorrenciasPagamento() {
        return this.ocorrenciasPagamento;
    }

    public void setOcorrenciasPagamento(Set<OcorrenciaDeIrpfPagamento> ocorrenciasPagamento) {
        this.ocorrenciasPagamento = ocorrenciasPagamento;
    }

    public Boolean getCobrarEncargos() {
        return this.cobrarEncargos;
    }

    public void setCobrarEncargos(Boolean cobrarEncargos) {
        this.cobrarEncargos = cobrarEncargos;
    }

    public Integer getQtdMesesRendimentoTributaveis() {
        return this.qtdMesesRendimentoTributaveis;
    }

    public void setQtdMesesRendimentoTributaveis(Integer qtdMesesRendimentoTributaveis) {
        this.qtdMesesRendimentoTributaveis = qtdMesesRendimentoTributaveis;
    }
}

