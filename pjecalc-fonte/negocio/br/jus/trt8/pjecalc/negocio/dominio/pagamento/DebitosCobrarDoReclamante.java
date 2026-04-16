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
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.hibernate.annotations.Where
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndicesAcumuladosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDevedorDoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeHonorarioDoPagamentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.IndicePrecatorio;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ServicoAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.MaquinaDeCalculoDeHonorarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.AtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
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
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.hibernate.annotations.Where;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBDEBITOSCOBRARRECLAMANTE")
@SequenceGenerator(name="SQDEBITOSCOBRARRECLAMANTE", sequenceName="SQDEBITOSCOBRARRECLAMANTE", allocationSize=1)
@Name(value="debitosCobrarDoReclamante")
@Scope(value=ScopeType.SESSION)
public class DebitosCobrarDoReclamante
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = 9032264200272976266L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQDEBITOSCOBRARRECLAMANTE")
    @Column(name="IIDDEBITOSCOBRARRECLAMANTE")
    private Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDATUALIZACAO")
    private Atualizacao atualizacao;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCREDITORECLAMANTEPAG")
    private CreditosDoReclamante creditosDoReclamante;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.PERSIST})
    @JoinColumn(name="IIDCUSTASATUALIZACAO")
    private CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao;
    @Column(name="DDTCRIACAODEBCOBRARRECLAMANTE", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataCriacao;
    @Column(name="DDTINICIALDEBCOBRARRECLAMANTE", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataInicialPeriodo;
    @Column(name="DDTFINALDEBCOBRARRECLAMANTE", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataFinalPeriodo;
    @Column(name="MVLINDICECORRECAO", precision=38, scale=25)
    private BigDecimal indiceDeCorrecao;
    @Column(name="MVLTAXADEJUROS", precision=12, scale=4)
    private BigDecimal taxaDeJuros;
    @Column(name="MVLTOTALDEVIDO", precision=12, scale=2)
    private BigDecimal totalDevido;
    @Column(name="MVLTOTALPAGO", precision=12, scale=2)
    private BigDecimal totalPago;
    @Column(name="MVLTOTALDIFERENCA", precision=12, scale=2)
    private BigDecimal totalDiferenca;
    @Where(clause="STPMULTA = 'I' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="debitosCobrarDoReclamante")
    @OrderBy(value="multa")
    private Set<MultaDaAtualizacao> multasInformadas = new HashSet<MultaDaAtualizacao>();
    @Where(clause="STPMULTA = 'C' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="debitosCobrarDoReclamante")
    @OrderBy(value="multa")
    private Set<MultaDaAtualizacao> multasCalculadas = new HashSet<MultaDaAtualizacao>();
    @Where(clause="STPVALOR = 'C' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="debitosCobrarDoReclamante")
    @OrderBy(value="honorario")
    private Set<HonorarioDaAtualizacao> honorariosDaAtualizacaoCalculado = new HashSet<HonorarioDaAtualizacao>();
    @Where(clause="STPVALOR = 'I' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="debitosCobrarDoReclamante")
    @OrderBy(value="honorario")
    private Set<HonorarioDaAtualizacao> honorariosDaAtualizacaoInformado = new HashSet<HonorarioDaAtualizacao>();

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public void salvar() {
        this.setDataCriacao(new Date());
        DebitosCobrarDoReclamante.getRepositorio(RepositorioDebitosCobrarDoReclamante.class).salvar(this);
    }

    public static List<DebitosCobrarDoReclamante> obterUltimoRegistro(Atualizacao atualizacao) {
        return DebitosCobrarDoReclamante.getRepositorio(RepositorioDebitosCobrarDoReclamante.class).obterUltimoRegistro(atualizacao);
    }

    public static List<DebitosCobrarDoReclamante> obterTodos(Atualizacao atualizacao) {
        return DebitosCobrarDoReclamante.getRepositorio(RepositorioDebitosCobrarDoReclamante.class).obterTodosDebitosCobrarDoReclamante(atualizacao);
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
        return this.atualizacao.getCalculo();
    }

    public Atualizacao getAtualizacao() {
        return this.atualizacao;
    }

    public void setAtualizacao(Atualizacao atualizacao) {
        this.atualizacao = atualizacao;
    }

    public CreditosDoReclamante getCreditosDoReclamante() {
        return this.creditosDoReclamante;
    }

    public void setCreditosDoReclamante(CreditosDoReclamante creditosDoReclamante) {
        this.creditosDoReclamante = creditosDoReclamante;
    }

    public CustasJudiciaisDaAtualizacao getCustasJudiciaisDaAtualizacao() {
        return this.custasJudiciaisDaAtualizacao;
    }

    public void setCustasJudiciaisDaAtualizacao(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        this.custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao;
    }

    public Date getDataCriacao() {
        return this.dataCriacao;
    }

    public void setDataCriacao(Date dataCriacao) {
        this.dataCriacao = dataCriacao;
    }

    public Date getDataInicialPeriodo() {
        return this.dataInicialPeriodo;
    }

    public void setDataInicialPeriodo(Date dataInicialPeriodo) {
        this.dataInicialPeriodo = dataInicialPeriodo;
    }

    public Date getDataFinalPeriodo() {
        return this.dataFinalPeriodo;
    }

    public void setDataFinalPeriodo(Date dataFinalPeriodo) {
        this.dataFinalPeriodo = dataFinalPeriodo;
    }

    public BigDecimal getIndiceDeCorrecao() {
        return this.indiceDeCorrecao;
    }

    public void setIndiceDeCorrecao(BigDecimal indiceDeCorrecao) {
        this.indiceDeCorrecao = indiceDeCorrecao;
    }

    public BigDecimal getTaxaDeJuros() {
        return this.taxaDeJuros;
    }

    public void setTaxaDeJuros(BigDecimal taxaDeJuros) {
        this.taxaDeJuros = taxaDeJuros;
    }

    public BigDecimal getTotalDevido() {
        return this.totalDevido;
    }

    public void setTotalDevido(BigDecimal totalDevido) {
        this.totalDevido = totalDevido;
    }

    public BigDecimal getTotalPago() {
        return this.totalPago;
    }

    public void setTotalPago(BigDecimal totalPago) {
        this.totalPago = totalPago;
    }

    public BigDecimal getTotalDiferenca() {
        return this.totalDiferenca;
    }

    public void setTotalDiferenca(BigDecimal totalDiferenca) {
        this.totalDiferenca = totalDiferenca;
    }

    public Set<MultaDaAtualizacao> getMultasInformadas() {
        return this.multasInformadas;
    }

    public void setMultasInformadas(Set<MultaDaAtualizacao> multasInformadas) {
        this.multasInformadas = multasInformadas;
    }

    public Set<MultaDaAtualizacao> getMultasCalculadas() {
        return this.multasCalculadas;
    }

    public void setMultasCalculadas(Set<MultaDaAtualizacao> multasCalculadas) {
        this.multasCalculadas = multasCalculadas;
    }

    public Set<HonorarioDaAtualizacao> getHonorariosDaAtualizacaoCalculado() {
        return this.honorariosDaAtualizacaoCalculado;
    }

    public void setHonorariosDaAtualizacaoCalculado(Set<HonorarioDaAtualizacao> honorariosDaAtualizacaoCalculado) {
        this.honorariosDaAtualizacaoCalculado = honorariosDaAtualizacaoCalculado;
    }

    public Set<HonorarioDaAtualizacao> getHonorariosDaAtualizacaoInformado() {
        return this.honorariosDaAtualizacaoInformado;
    }

    public void setHonorariosDaAtualizacaoInformado(Set<HonorarioDaAtualizacao> honorariosDaAtualizacaoInformado) {
        this.honorariosDaAtualizacaoInformado = honorariosDaAtualizacaoInformado;
    }

    public Long getId() {
        return this.id;
    }

    private BigDecimal calcularTaxaDeJuros(Date dataInicial, Date dataFinal, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData) {
        return this.calcularTaxaDeJuros(dataInicial, dataFinal, jurosDoAjuizamento, projetarData, false);
    }

    private BigDecimal calcularTaxaDeJuros(Date dataInicial, Date dataFinal, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData, boolean isMultaHonorario) {
        TabelaDeJurosDoCalculo tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), dataInicial, dataFinal);
        return tabelaDeJuros.calcularTaxaDeJurosPagamento(dataInicial, dataFinal, jurosDoAjuizamento, projetarData, isMultaHonorario);
    }

    public DebitosCobrarDoReclamante liquidarDebitosCobrarDoReclamante(Date dataInicialParaLiquidacao, Date dataFinalParaLiquidacao, DebitosCobrarDoReclamante debitosCobrarDoReclamanteAnterior, CreditosDoReclamante creditoDoReclamante, CreditosDoReclamante creditoDoReclamanteAnterior, DebitosDoReclamante debitosDoReclamante, Pagamento pagamento, Multa multaDoEvento, Honorario honorario, boolean primeiroEvento) {
        HonorarioDaAtualizacao honorarioDaAtualizacao;
        BigDecimal anterior;
        BigDecimal valorJuros;
        Date dataInicioDeJuros;
        MultaDaAtualizacao multaDaAtualizacao;
        BigDecimal indiceDeCorrecao;
        HashMap<IndiceMonetarioEnum, BigDecimal> mapaDeIndices = new HashMap<IndiceMonetarioEnum, BigDecimal>();
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(this.getCalculo().getAtualizacaoMonetaria(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
        BigDecimal indiceDeCorrecaoParaJuros = indiceDeCorrecao = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
        HelperDate dataInicialParaLiquidacaoMaisUm = HelperDate.getInstance(dataInicialParaLiquidacao).addDay(1);
        BigDecimal taxaDeJuros = this.calcularTaxaDeJuros(dataInicialParaLiquidacaoMaisUm.getDate(), dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false);
        if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            Periodo periodoDaGraca = ServicoAtualizacaoUtils.montarPeriodoDaGraca(this.getAtualizacao());
            Periodo periodoAtualizacao = new Periodo(HelperDate.getInstance(dataInicialParaLiquidacao).addDay(1).getDate(), dataFinalParaLiquidacao);
            indiceDeCorrecao = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, this.getAtualizacao().getDataInicioAplicarEC1362025(), this.getAtualizacao().getGrupoEsferaPrecatorio(), false);
            indiceDeCorrecaoParaJuros = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, this.getAtualizacao().getDataInicioAplicarEC1362025(), this.getAtualizacao().getGrupoEsferaPrecatorio(), true);
            taxaDeJuros = ServicoAtualizacaoUtils.encontrarTaxaDeJurosPrecatorioSIP(periodoAtualizacao.getInicial(), periodoAtualizacao.getFinal(), this.getAtualizacao().getDataInicioAplicarEC1362025(), periodoDaGraca);
        }
        DebitosCobrarDoReclamante debitosCobrarDoReclamante = new DebitosCobrarDoReclamante();
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && Utils.naoNulos(pagamento, multaDoEvento, honorario)) {
            debitosCobrarDoReclamante = debitosCobrarDoReclamanteAnterior;
            debitosCobrarDoReclamante = this.incluirMulta(debitosCobrarDoReclamante, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, multaDoEvento);
            debitosCobrarDoReclamante = this.incluirHonorario(debitosCobrarDoReclamante, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, honorario);
            debitosCobrarDoReclamante.setTotalDevido(debitosCobrarDoReclamante.calcularTotalDevido());
            return debitosCobrarDoReclamante;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && Utils.nulos(pagamento, honorario) && Utils.naoNulo(multaDoEvento)) {
            debitosCobrarDoReclamante = debitosCobrarDoReclamanteAnterior;
            this.incluirMulta(debitosCobrarDoReclamante, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, multaDoEvento);
            return debitosCobrarDoReclamante;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && Utils.nulos(pagamento, multaDoEvento) && Utils.naoNulo(honorario)) {
            debitosCobrarDoReclamante = debitosCobrarDoReclamanteAnterior;
            this.incluirHonorario(debitosCobrarDoReclamante, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, honorario);
            debitosCobrarDoReclamante.setTotalDevido(debitosCobrarDoReclamante.calcularTotalDevido());
            debitosCobrarDoReclamante.setTotalPago(debitosCobrarDoReclamante.calcularTotalPago());
            debitosCobrarDoReclamante.setTotalDiferenca(debitosCobrarDoReclamante.calcularTotalDiferenca());
            return debitosCobrarDoReclamante;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && Utils.naoNulo(pagamento) && Utils.nulos(multaDoEvento, honorario)) {
            debitosCobrarDoReclamante = debitosCobrarDoReclamanteAnterior;
            debitosCobrarDoReclamante.setTotalDevido(debitosCobrarDoReclamante.calcularTotalDevido());
            return debitosCobrarDoReclamante;
        }
        if (!primeiroEvento && dataInicialParaLiquidacao.equals(dataFinalParaLiquidacao) && Utils.nulos(pagamento, multaDoEvento, honorario)) {
            debitosCobrarDoReclamante = debitosCobrarDoReclamanteAnterior;
            debitosCobrarDoReclamante.setTotalDevido(debitosCobrarDoReclamante.calcularTotalDevido());
            debitosCobrarDoReclamante.setTotalPago(debitosCobrarDoReclamante.calcularTotalPago());
            debitosCobrarDoReclamante.setTotalDiferenca(debitosCobrarDoReclamante.calcularTotalDiferenca());
            return debitosCobrarDoReclamante;
        }
        debitosCobrarDoReclamante.setIndiceDeCorrecao(indiceDeCorrecao);
        debitosCobrarDoReclamante.setTaxaDeJuros(Utils.arredondarValor(taxaDeJuros, 4));
        debitosCobrarDoReclamante.setAtualizacao(this.getAtualizacao());
        debitosCobrarDoReclamante.setCreditosDoReclamante(creditoDoReclamante);
        debitosCobrarDoReclamante.setDataInicialPeriodo(dataInicialParaLiquidacao);
        debitosCobrarDoReclamante.setDataFinalPeriodo(dataFinalParaLiquidacao);
        for (MultaDaAtualizacao multaAnterior : debitosCobrarDoReclamanteAnterior.getMultasCalculadas()) {
            multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setMulta(multaAnterior.getMulta());
            multaDaAtualizacao.setTipoVinculo(multaAnterior.getTipoVinculo());
            multaDaAtualizacao.setTipoValorDaMulta(multaAnterior.getTipoValorDaMulta());
            multaDaAtualizacao.setValorMulta(multaDaAtualizacao.calcularValorDaMultaCalculadaOutros(creditoDoReclamante, creditoDoReclamanteAnterior, multaAnterior, multaAnterior.getIndiceDeCorrecao(), debitosDoReclamante.getPrevidenciaPrivadaCorrigido(), debitosDoReclamante.getDescontoInssCorrigido(), dataFinalParaLiquidacao));
            multaDaAtualizacao.setValorJuros(multaAnterior.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : creditoDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM)));
            multaDaAtualizacao.setJaCalculadoUmaVez(multaAnterior.getJaCalculadoUmaVez());
            multaDaAtualizacao.setDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
            multaDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            debitosCobrarDoReclamante.getMultasCalculadas().add(multaDaAtualizacao);
        }
        for (MultaDaAtualizacao multaAnterior : debitosCobrarDoReclamanteAnterior.getMultasInformadas()) {
            multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setMulta(multaAnterior.getMulta());
            multaDaAtualizacao.setTipoVinculo(multaAnterior.getTipoVinculo());
            multaDaAtualizacao.setTipoValorDaMulta(multaAnterior.getTipoValorDaMulta());
            multaDaAtualizacao.setDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
            multaDaAtualizacao.setPrimeiroEventoProcessado(multaAnterior.getPrimeiroEventoProcessado());
            if (OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE.equals((Object)multaDaAtualizacao.getMulta().getOpcaoIndiceDeCorrecaoDaMulta())) {
                if (Utils.naoNulo(mapaDeIndices.get((Object)multaDaAtualizacao.getMulta().getOutroIndiceDeCorrecaoDaMulta()))) {
                    multaDaAtualizacao.setIndiceDeCorrecao((BigDecimal)mapaDeIndices.get((Object)multaDaAtualizacao.getMulta().getOutroIndiceDeCorrecaoDaMulta()));
                } else {
                    TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaMulta = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, multaDaAtualizacao.getMulta().getOutroIndiceDeCorrecaoDaMulta(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                    tabelaDeCorrecaoMonetariaMulta.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                    BigDecimal indiceMulta = tabelaDeCorrecaoMonetariaMulta.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
                    mapaDeIndices.put(multaDaAtualizacao.getMulta().getOutroIndiceDeCorrecaoDaMulta(), indiceMulta);
                    multaDaAtualizacao.setIndiceDeCorrecao(indiceMulta);
                }
            } else {
                multaDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
            }
            dataInicioDeJuros = AtualizacaoUtils.testarExistenciaJurosDeAte(new Periodo(debitosCobrarDoReclamante.getDataInicialPeriodo(), debitosCobrarDoReclamante.getDataFinalPeriodo()), dataInicialParaLiquidacaoMaisUm.getDate(), multaAnterior.getMulta().getOrigemRegistro(), this.getCalculo(), multaAnterior.getMulta().getDataApartirDeAplicarJuros(), multaAnterior.getMulta().getDataEvento(), multaAnterior.getPrimeiroEventoProcessado() == false);
            if (!multaDaAtualizacao.getPrimeiroEventoProcessado().booleanValue() && (dataFinalParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()) || dataInicialParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()))) {
                multaDaAtualizacao.setValorJuros(multaAnterior.devidoJuroMultaInformadaPrimeiroEvento(multaAnterior.getIndiceDeCorrecao()));
                multaDaAtualizacao.setValorMulta(multaAnterior.getMulta().getValorCorrigido());
                multaDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
            } else {
                multaDaAtualizacao.setValorMulta(Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao()), multaAnterior.getPagoMulta())));
                valorJuros = multaAnterior.devidoJuroMultaInformadaDepoisPrimeiroEvento();
                anterior = BigDecimal.ZERO;
                if (Utils.naoNulo(dataInicioDeJuros) && BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) <= 0) {
                    anterior = multaAnterior.valorJurosMultaInformadaPeriodoAnterior();
                }
                multaDaAtualizacao.setValorJuros(Utils.somar(Utils.subtrair(valorJuros, multaAnterior.getPagoJuro()), Utils.subtrair(anterior, multaAnterior.getPagoJuroPeriodoAtual())));
            }
            BigDecimal taxaJurosMulta = BigDecimal.ZERO;
            if (Utils.naoNulo(dataInicioDeJuros)) {
                taxaJurosMulta = this.calcularTaxaDeJuros(dataInicioDeJuros, dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
            }
            multaDaAtualizacao.setTaxaJurosMulta(Utils.arredondarValor(taxaJurosMulta, 4));
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            debitosCobrarDoReclamante.getMultasInformadas().add(multaDaAtualizacao);
        }
        for (HonorarioDaAtualizacao honorarioAnterior : debitosCobrarDoReclamanteAnterior.getHonorariosDaAtualizacaoCalculado()) {
            honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setHonorario(honorarioAnterior.getHonorario());
            honorarioDaAtualizacao.setTipoVinculo(honorarioAnterior.getTipoVinculo());
            honorarioDaAtualizacao.setTipoValor(honorarioAnterior.getTipoValor());
            honorarioDaAtualizacao.setValorHonorario(honorarioDaAtualizacao.calcularValorDoHonorarioCalculado(creditoDoReclamante, creditoDoReclamanteAnterior, honorarioAnterior, honorarioAnterior.getIndiceDeCorrecao(), debitosDoReclamante.getPrevidenciaPrivadaCorrigido(), debitosDoReclamante.getDescontoInssCorrigido()));
            honorarioDaAtualizacao.setValorJuros(creditoDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioAnterior.getHonorario().getAliquota().divide(Utils.CEM)));
            honorarioDaAtualizacao.setJaCalculadoUmaVez(honorarioAnterior.getJaCalculadoUmaVez());
            honorarioDaAtualizacao.setDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
            honorarioDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            if (honorarioDaAtualizacao.getValorRemanescenteHonorario() == null || debitosCobrarDoReclamante.getDataFinalPeriodo().equals(honorarioDaAtualizacao.getHonorario().getDataEvento()) && debitosCobrarDoReclamante.getDataInicialPeriodo().equals(debitosCobrarDoReclamante.getDataFinalPeriodo()) || debitosCobrarDoReclamante.getDataInicialPeriodo().equals(debitosCobrarDoReclamante.getCalculo().getDataDeLiquidacao())) {
                honorarioDaAtualizacao.setDevidoHonorario(honorarioDaAtualizacao.getDevidoCalculada());
            } else {
                BigDecimal devido = BigDecimal.ZERO;
                devido = Utils.somar(devido, honorarioDaAtualizacao.getDevidoCalculadaRemanescente(honorarioDaAtualizacao.getIndiceDeCorrecao()), devido);
                if (!honorarioDaAtualizacao.getHonorario().getBaseParaApuracao().equals((Object)BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL)) {
                    devido = Utils.somar(devido, debitosCobrarDoReclamante.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM)), devido);
                    devido = Utils.somar(devido, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.calcularHonorariosSobreMultas(debitosCobrarDoReclamante.getCreditosDoReclamante()), honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), devido);
                }
                honorarioDaAtualizacao.setDevidoHonorario(devido);
            }
            debitosCobrarDoReclamante.getHonorariosDaAtualizacaoCalculado().add(honorarioDaAtualizacao);
        }
        for (HonorarioDaAtualizacao honorarioAnterior : debitosCobrarDoReclamanteAnterior.getHonorariosDaAtualizacaoInformado()) {
            honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setHonorario(honorarioAnterior.getHonorario());
            honorarioDaAtualizacao.setTipoVinculo(honorarioAnterior.getTipoVinculo());
            honorarioDaAtualizacao.setTipoValor(honorarioAnterior.getTipoValor());
            honorarioDaAtualizacao.setDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
            honorarioDaAtualizacao.setPrimeiroEventoProcessado(honorarioAnterior.getPrimeiroEventoProcessado());
            if (!this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue() && OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE.equals((Object)honorarioDaAtualizacao.getHonorario().getTipoDeIndiceDeCorrecao())) {
                if (Utils.naoNulo(mapaDeIndices.get((Object)honorarioDaAtualizacao.getHonorario().getOutroIndiceDeCorrecao()))) {
                    honorarioDaAtualizacao.setIndiceDeCorrecao((BigDecimal)mapaDeIndices.get((Object)honorarioDaAtualizacao.getHonorario().getOutroIndiceDeCorrecao()));
                } else {
                    TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaHonorario = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, honorarioDaAtualizacao.getHonorario().getOutroIndiceDeCorrecao(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.getCalculo().getIgnorarTaxaCorrecaoNegativa());
                    tabelaDeCorrecaoMonetariaHonorario.carregarTabela(new Periodo(dataInicialParaLiquidacao, dataFinalParaLiquidacao));
                    BigDecimal indiceHonorario = tabelaDeCorrecaoMonetariaHonorario.obterValorAcumuladoDoIndice(dataInicialParaLiquidacao);
                    mapaDeIndices.put(honorarioDaAtualizacao.getHonorario().getOutroIndiceDeCorrecao(), indiceHonorario);
                    honorarioDaAtualizacao.setIndiceDeCorrecao(indiceHonorario);
                }
            } else {
                honorarioDaAtualizacao.setIndiceDeCorrecao(indiceDeCorrecao);
                honorarioDaAtualizacao.setIndiceDeCorrecaoParaJuros(indiceDeCorrecaoParaJuros);
            }
            dataInicioDeJuros = AtualizacaoUtils.testarExistenciaJurosDeAte(new Periodo(debitosCobrarDoReclamante.getDataInicialPeriodo(), debitosCobrarDoReclamante.getDataFinalPeriodo()), dataInicialParaLiquidacaoMaisUm.getDate(), honorarioAnterior.getHonorario().getOrigemRegistro(), this.getCalculo(), honorarioAnterior.getHonorario().getDataApartirDeAplicarJuros(), honorarioAnterior.getHonorario().getDataEvento(), honorarioAnterior.getPrimeiroEventoProcessado() == false);
            if (!this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue() && !honorarioDaAtualizacao.getPrimeiroEventoProcessado().booleanValue() && (dataFinalParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()) || dataInicialParaLiquidacao.equals(this.getCalculo().getDataDeLiquidacao()))) {
                honorarioDaAtualizacao.setValorJuros(honorarioDaAtualizacao.getHonorario().getAplicarJuros() != false ? honorarioAnterior.devidoJuroHonorarioInformadoPrimeiroEvento(honorarioAnterior.getIndiceDeCorrecao()) : BigDecimal.ZERO);
                honorarioDaAtualizacao.setValorHonorario(honorarioAnterior.getHonorario().getValorCorrigido());
                honorarioDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
            } else {
                honorarioDaAtualizacao.setValorHonorario(Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioAnterior.getValorHonorario(), honorarioAnterior.getIndiceDeCorrecao()), honorarioAnterior.getPagoHonorario())));
                valorJuros = honorarioAnterior.devidoJuroHonorarioInformadoDepoisPrimeiroEvento();
                if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue() && Utils.nulo(valorJuros)) {
                    valorJuros = BigDecimal.ZERO;
                }
                anterior = BigDecimal.ZERO;
                if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue() || Utils.naoNulo(dataInicioDeJuros)) {
                    anterior = honorarioAnterior.valorJurosHonorarioInformadoPeriodoAnterior();
                }
                honorarioDaAtualizacao.setValorJuros(honorarioDaAtualizacao.getHonorario().getAplicarJuros() != false || this.getAtualizacao().getAtualizarRegraPrecatorio() != false && TipoValorEnum.CALCULADO.equals((Object)honorarioDaAtualizacao.getHonorario().getTipoValor()) ? Utils.somar(Utils.subtrair(valorJuros, honorarioAnterior.getPagoJuro()), Utils.subtrair(anterior, honorarioAnterior.getPagoJuroPeriodoAtual())) : BigDecimal.ZERO);
                if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                    BigDecimal impostoCorrigido = Utils.multiplicar(honorarioAnterior.getValorImpostoRenda(), honorarioAnterior.getIndiceDeCorrecao());
                    honorarioDaAtualizacao.setValorImpostoRenda(Utils.arredondarValorMonetario(Utils.subtrair(impostoCorrigido, honorarioAnterior.getPagoImpostoRenda(), impostoCorrigido)));
                }
            }
            BigDecimal taxaJurosHonorario = BigDecimal.ZERO;
            if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                taxaJurosHonorario = taxaDeJuros;
            } else if (Utils.naoNulo(dataInicioDeJuros) && BigDecimal.ZERO.compareTo(honorarioDaAtualizacao.getValorHonorario()) <= 0) {
                taxaJurosHonorario = this.calcularTaxaDeJuros(dataInicioDeJuros, dataFinalParaLiquidacao, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
            }
            honorarioDaAtualizacao.setTaxaJurosHonorario(Utils.arredondarValor(taxaJurosHonorario, 4));
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            honorarioDaAtualizacao.setDevidoHonorario(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.getValorHonorario(), honorarioDaAtualizacao.getIndiceDeCorrecao())));
            debitosCobrarDoReclamante.getHonorariosDaAtualizacaoInformado().add(honorarioDaAtualizacao);
        }
        if (Utils.naoNulo(honorario)) {
            debitosCobrarDoReclamante = this.incluirHonorario(debitosCobrarDoReclamante, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, honorario);
        }
        if (Utils.naoNulo(multaDoEvento)) {
            debitosCobrarDoReclamante = this.incluirMulta(debitosCobrarDoReclamante, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, multaDoEvento);
        }
        return debitosCobrarDoReclamante;
    }

    public DebitosCobrarDoReclamante aplicarPagamento(DebitosCobrarDoReclamante debitosCobrarDoReclamante, Pagamento pagamento) {
        BigDecimal taxaDeJurosMulta;
        BigDecimal base;
        BigDecimal valorTotalDevido;
        BigDecimal valorJurosPeriodoAtual;
        BigDecimal valorJuros;
        BigDecimal[] valoresRateados = null;
        for (MultaDaAtualizacao multaAnterior : debitosCobrarDoReclamante.getMultasCalculadas()) {
            boolean isEventoNaLiquidacaoNaoCalculadoAnteriormente;
            multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            boolean isPeriodoDeUmDiaNaDataDoEvento = this.getDataFinalPeriodo().equals(multaAnterior.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && multaAnterior.getJaCalculadoUmaVez() == false;
            if (multaAnterior.getValorRemanescenteMulta() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                multaAnterior.setPagoMulta(pagamento.getValoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros().get(multaAnterior.getMulta()));
                multaAnterior.setPagoJuro(BigDecimal.ZERO);
            } else {
                BigDecimal valorMulta = multaAnterior.getDevidoCalculadaRemanescente(multaAnterior.getIndiceDeCorrecao());
                if (Utils.nulo(valorMulta)) {
                    valorMulta = BigDecimal.ZERO;
                }
                BigDecimal bigDecimal = valorJuros = multaAnterior.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAnterior.getMulta().getAliquotaMulta().divide(Utils.CEM));
                if (Utils.nulo(valorJuros)) {
                    valorJuros = BigDecimal.ZERO;
                }
                valoresRateados = PagamentoUtils.ratearValor(pagamento.getValoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros().get(multaAnterior.getMulta()), new BigDecimal[]{valorMulta, valorJuros});
                multaAnterior.setPagoMulta(valoresRateados[0]);
                multaAnterior.setPagoJuro(valoresRateados[1]);
                multaAnterior.setJaCalculadoUmaVez(true);
            }
            if (pagamento.getValoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros().get(multaAnterior.getMulta()).compareTo(BigDecimal.ZERO) == 0) continue;
            multaAnterior.setJaCalculadoUmaVez(true);
        }
        for (MultaDaAtualizacao multaAnterior : debitosCobrarDoReclamante.getMultasInformadas()) {
            BigDecimal valorMulta = Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao()));
            if (Utils.nulo(valorMulta)) {
                valorMulta = BigDecimal.ZERO;
            }
            BigDecimal valorJuros2 = BigDecimal.ZERO;
            valorJurosPeriodoAtual = BigDecimal.ZERO;
            valorTotalDevido = valorMulta;
            if (!this.getDataFinalPeriodo().equals(multaAnterior.getMulta().getDataEvento())) {
                valorJuros2 = Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorJuros(), multaAnterior.getIndiceDeCorrecao()));
                valorTotalDevido = Utils.somar(valorTotalDevido, valorJuros2, valorTotalDevido);
                base = multaAnterior.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaAnterior.getValorMulta(), multaAnterior.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                taxaDeJurosMulta = multaAnterior.getTaxaJurosMulta() != null ? multaAnterior.getTaxaJurosMulta() : debitosCobrarDoReclamante.getTaxaDeJuros();
                valorJurosPeriodoAtual = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosMulta.divide(Utils.CEM)));
                valorTotalDevido = Utils.somar(valorTotalDevido, valorJurosPeriodoAtual, valorTotalDevido);
            }
            BigDecimal valorParaPagarMulta = pagamento.getValoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros().get(multaAnterior.getMulta());
            if (BigDecimal.ZERO.compareTo(valorTotalDevido) > 0) {
                multaAnterior.setPagoJuro(BigDecimal.ZERO);
                multaAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                multaAnterior.setPagoMulta(valorParaPagarMulta);
                continue;
            }
            if (valorTotalDevido.compareTo(valorParaPagarMulta) < 0) {
                multaAnterior.setPagoJuro(valorJuros2);
                multaAnterior.setPagoJuroPeriodoAtual(valorJurosPeriodoAtual);
                multaAnterior.setPagoMulta(Utils.subtrair(Utils.subtrair(valorParaPagarMulta, valorJuros2), valorJurosPeriodoAtual));
                continue;
            }
            valoresRateados = PagamentoUtils.ratearValor(valorParaPagarMulta, new BigDecimal[]{valorMulta, valorJuros2, valorJurosPeriodoAtual});
            multaAnterior.setPagoMulta(valoresRateados[0]);
            multaAnterior.setPagoJuro(valoresRateados[1]);
            multaAnterior.setPagoJuroPeriodoAtual(valoresRateados[2]);
        }
        for (HonorarioDaAtualizacao honorarioDaAtualizacaoAnterior : debitosCobrarDoReclamante.getHonorariosDaAtualizacaoCalculado()) {
            boolean isEventoNaLiquidacaoNaoCalculadoAnteriormente;
            honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            boolean isPeriodoDeUmDiaNaDataDoEvento = this.getDataFinalPeriodo().equals(honorarioDaAtualizacaoAnterior.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && honorarioDaAtualizacaoAnterior.getJaCalculadoUmaVez() == false;
            if (honorarioDaAtualizacaoAnterior.getValorRemanescenteHonorario() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                honorarioDaAtualizacaoAnterior.setPagoHonorario(pagamento.getValoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario()));
                honorarioDaAtualizacaoAnterior.setPagoJuro(BigDecimal.ZERO);
                honorarioDaAtualizacaoAnterior.setPagoSobreMultas(BigDecimal.ZERO);
            } else {
                BigDecimal valorSobreMulta;
                BigDecimal valorHonorario = honorarioDaAtualizacaoAnterior.getDevidoCalculadaRemanescente(honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao());
                if (Utils.nulo(valorHonorario)) {
                    valorHonorario = BigDecimal.ZERO;
                }
                if (Utils.nulo(valorJuros = this.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacaoAnterior.getHonorario().getAliquota().divide(Utils.CEM)))) {
                    valorJuros = BigDecimal.ZERO;
                }
                if (Utils.nulo(valorSobreMulta = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.calcularHonorariosSobreMultas(this.getCreditosDoReclamante()), honorarioDaAtualizacaoAnterior.getHonorario().getAliquota().divide(Utils.CEM))))) {
                    valorSobreMulta = BigDecimal.ZERO;
                }
                BigDecimal valorTotalDevido2 = Utils.somar(valorHonorario, valorJuros);
                valorTotalDevido2 = Utils.somar(valorTotalDevido2, valorSobreMulta);
                BigDecimal totalSobreJuros = Utils.somar(valorJuros, valorSobreMulta);
                BigDecimal valorParaPagarHonorario = pagamento.getValoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario());
                if (BigDecimal.ZERO.compareTo(valorHonorario) > 0 && BigDecimal.ZERO.compareTo(totalSobreJuros) < 0) {
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(Utils.zerarSeNegativo(Utils.subtrair(valorParaPagarHonorario, totalSobreJuros)));
                    valoresRateados = PagamentoUtils.ratearValor(Utils.subtrair(valorParaPagarHonorario, honorarioDaAtualizacaoAnterior.getPagoHonorario()), new BigDecimal[]{valorJuros, valorSobreMulta});
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valoresRateados[0]);
                    honorarioDaAtualizacaoAnterior.setPagoSobreMultas(valoresRateados[1]);
                } else if (valorTotalDevido2.compareTo(valorParaPagarHonorario) < 0) {
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valorJuros);
                    honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(valorSobreMulta);
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(Utils.subtrair(Utils.subtrair(valorParaPagarHonorario, valorJuros), valorSobreMulta));
                } else {
                    valoresRateados = PagamentoUtils.ratearValor(valorParaPagarHonorario, new BigDecimal[]{valorHonorario, valorJuros, valorSobreMulta});
                    honorarioDaAtualizacaoAnterior.setPagoHonorario(valoresRateados[0]);
                    honorarioDaAtualizacaoAnterior.setPagoJuro(valoresRateados[1]);
                    honorarioDaAtualizacaoAnterior.setPagoSobreMultas(valoresRateados[2]);
                }
            }
            if (pagamento.getValoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario()).compareTo(BigDecimal.ZERO) != 0) {
                honorarioDaAtualizacaoAnterior.setJaCalculadoUmaVez(true);
            }
            honorarioDaAtualizacaoAnterior = MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioDaAtualizacaoAnterior, pagamento.getDataPagamento());
        }
        for (HonorarioDaAtualizacao honorarioDaAtualizacaoAnterior : debitosCobrarDoReclamante.getHonorariosDaAtualizacaoInformado()) {
            BigDecimal valorHonorario = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorHonorario(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao()));
            if (Utils.nulo(valorHonorario)) {
                valorHonorario = BigDecimal.ZERO;
            }
            BigDecimal valorJuros3 = BigDecimal.ZERO;
            valorJurosPeriodoAtual = BigDecimal.ZERO;
            valorTotalDevido = valorHonorario;
            if (!this.getDataFinalPeriodo().equals(honorarioDaAtualizacaoAnterior.getHonorario().getDataEvento())) {
                valorJuros3 = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorJuros(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao()));
                valorTotalDevido = Utils.somar(valorTotalDevido, valorJuros3, valorTotalDevido);
                base = honorarioDaAtualizacaoAnterior.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacaoAnterior.getValorHonorario(), honorarioDaAtualizacaoAnterior.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                taxaDeJurosMulta = honorarioDaAtualizacaoAnterior.getTaxaJurosHonorario() != null ? honorarioDaAtualizacaoAnterior.getTaxaJurosHonorario() : debitosCobrarDoReclamante.getTaxaDeJuros();
                valorJurosPeriodoAtual = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosMulta.divide(Utils.CEM)));
                valorTotalDevido = Utils.somar(valorTotalDevido, valorJurosPeriodoAtual, valorTotalDevido);
            }
            BigDecimal valorParaPagarHonorario = pagamento.getValoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios().get(honorarioDaAtualizacaoAnterior.getHonorario());
            if (BigDecimal.ZERO.compareTo(valorTotalDevido) > 0) {
                honorarioDaAtualizacaoAnterior.setPagoJuro(BigDecimal.ZERO);
                honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                honorarioDaAtualizacaoAnterior.setPagoHonorario(valorParaPagarHonorario);
            } else if (valorTotalDevido.compareTo(valorParaPagarHonorario) < 0) {
                honorarioDaAtualizacaoAnterior.setPagoJuro(valorJuros3);
                honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(valorJurosPeriodoAtual);
                honorarioDaAtualizacaoAnterior.setPagoHonorario(Utils.subtrair(Utils.subtrair(valorParaPagarHonorario, valorJuros3), valorJurosPeriodoAtual));
            } else {
                valoresRateados = PagamentoUtils.ratearValor(valorParaPagarHonorario, new BigDecimal[]{valorHonorario, valorJuros3, valorJurosPeriodoAtual});
                honorarioDaAtualizacaoAnterior.setPagoHonorario(valoresRateados[0]);
                honorarioDaAtualizacaoAnterior.setPagoJuro(valoresRateados[1]);
                honorarioDaAtualizacaoAnterior.setPagoJuroPeriodoAtual(valoresRateados[2]);
            }
            honorarioDaAtualizacaoAnterior.setPagoSobreMultas(BigDecimal.ZERO);
            if (this.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) continue;
            honorarioDaAtualizacaoAnterior = MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioDaAtualizacaoAnterior, pagamento.getDataPagamento());
        }
        debitosCobrarDoReclamante.setTotalPago(debitosCobrarDoReclamante.calcularTotalPago());
        debitosCobrarDoReclamante.setTotalDiferenca(debitosCobrarDoReclamante.calcularTotalDiferenca());
        return debitosCobrarDoReclamante;
    }

    public DebitosCobrarDoReclamante incluirMulta(DebitosCobrarDoReclamante debitosCobrarDoReclamante, DebitosDoReclamante debitosDoReclamante, CreditosDoReclamante creditoDoReclamantePagamento, CreditosDoReclamante creditoDoReclamantePagamentoAnterior, Multa multaDoEvento) {
        if (multaDoEvento.getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) && TipoCobrancaReclamanteEnum.COBRAR.equals((Object)multaDoEvento.getTipoCobrancaReclamante())) {
            if (TipoValorEnum.CALCULADO.equals((Object)multaDoEvento.getTipoValorDaMulta())) {
                MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
                multaDaAtualizacao.setMulta(multaDoEvento);
                multaDaAtualizacao.setTipoVinculo(multaDoEvento.getTipoCredorDevedor());
                multaDaAtualizacao.setTipoValorDaMulta(multaDoEvento.getTipoValorDaMulta());
                multaDaAtualizacao.setValorMulta(multaDaAtualizacao.calcularValorDaMultaCalculadaOutros(creditoDoReclamantePagamento, creditoDoReclamantePagamentoAnterior, null, BigDecimal.ONE, debitosDoReclamante.getPrevidenciaPrivadaCorrigido(), debitosDoReclamante.getDescontoInssCorrigido(), debitosCobrarDoReclamante.getDataFinalPeriodo()));
                multaDaAtualizacao.setJaCalculadoUmaVez(this.getAtualizacao().getBaseMultaJaPaga());
                multaDaAtualizacao.setDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
                multaDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
                multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
                debitosCobrarDoReclamante.getMultasCalculadas().add(multaDaAtualizacao);
            } else {
                MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
                multaDaAtualizacao.setMulta(multaDoEvento);
                multaDaAtualizacao.setTipoVinculo(multaDoEvento.getTipoCredorDevedor());
                multaDaAtualizacao.setTipoValorDaMulta(multaDoEvento.getTipoValorDaMulta());
                multaDaAtualizacao.setValorMulta(multaDoEvento.getValorMulta());
                multaDaAtualizacao.setTaxaJurosMulta(Utils.arredondarValor(this.calcularTaxaJuros(debitosCobrarDoReclamante.getDataFinalPeriodo(), multaDoEvento, null), 4));
                multaDaAtualizacao.setValorJuros(BigDecimal.ZERO);
                multaDaAtualizacao.setDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
                multaDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
                multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
                multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
                multaDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
                debitosCobrarDoReclamante.getMultasInformadas().add(multaDaAtualizacao);
            }
        }
        return debitosCobrarDoReclamante;
    }

    private BigDecimal calcularTaxaJuros(Date dataFinalPeriodo, Multa multaDoEvento, Honorario honorarioDoEvento) {
        if (multaDoEvento != null && multaDoEvento.getAplicarJurosSobreMulta().booleanValue() && Utils.naoNulo(multaDoEvento.getDataApartirDeAplicarJuros())) {
            return this.calcularTaxaDeJuros(multaDoEvento.getDataApartirDeAplicarJuros(), dataFinalPeriodo, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
        }
        if (honorarioDoEvento != null && honorarioDoEvento.getAplicarJuros().booleanValue() && Utils.naoNulo(honorarioDoEvento.getDataApartirDeAplicarJuros())) {
            return this.calcularTaxaDeJuros(honorarioDoEvento.getDataApartirDeAplicarJuros(), dataFinalPeriodo, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true);
        }
        return null;
    }

    public DebitosCobrarDoReclamante incluirHonorario(DebitosCobrarDoReclamante debitosCobrarDoReclamante, DebitosDoReclamante debitosDoReclamante, CreditosDoReclamante creditoDoReclamante, CreditosDoReclamante creditoDoReclamanteAnterior, Honorario honorarioDoEvento) {
        if (TipoDeDevedorDoHonorarioEnum.RECLAMANTE.equals((Object)honorarioDoEvento.getTipoDeDevedor()) && TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorarioDoEvento.getTipoCobrancaReclamante())) {
            HonorarioDaAtualizacao honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
            honorarioDaAtualizacao.setHonorario(honorarioDoEvento);
            honorarioDaAtualizacao.setTipoVinculo(TipoVinculoDeHonorarioDoPagamentoEnum.DEBITOSCOBRARRECLAMANTE);
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
            if (TipoValorEnum.CALCULADO.equals((Object)honorarioDoEvento.getTipoValor())) {
                honorarioDaAtualizacao.setTipoValor(TipoValorEnum.CALCULADO);
                honorarioDaAtualizacao.setValorHonorario(honorarioDoEvento.getValor());
                honorarioDaAtualizacao.setValorHonorario(honorarioDaAtualizacao.calcularValorDoHonorarioCalculado(creditoDoReclamante, creditoDoReclamanteAnterior, null, BigDecimal.ONE, debitosDoReclamante.getPrevidenciaPrivadaCorrigido(), debitosDoReclamante.getDescontoInssCorrigido()));
                debitosCobrarDoReclamante.getHonorariosDaAtualizacaoCalculado().add(honorarioDaAtualizacao);
            } else {
                honorarioDaAtualizacao.setTipoValor(TipoValorEnum.INFORMADO);
                honorarioDaAtualizacao.setValorHonorario(honorarioDoEvento.getValor());
                honorarioDaAtualizacao.setTaxaJurosHonorario(Utils.arredondarValor(this.calcularTaxaJuros(debitosCobrarDoReclamante.getDataFinalPeriodo(), null, honorarioDoEvento), 4));
                honorarioDaAtualizacao.setValorJuros(BigDecimal.ZERO);
                honorarioDaAtualizacao.setPrimeiroEventoProcessado(Boolean.TRUE);
                debitosCobrarDoReclamante.getHonorariosDaAtualizacaoInformado().add(honorarioDaAtualizacao);
            }
            honorarioDaAtualizacao.setJaCalculadoUmaVez(this.getAtualizacao().getBaseHonorarioJaPaga());
        }
        return debitosCobrarDoReclamante;
    }

    public void calcularImpostoDeRendaDoSaldoDeHonorarios() {
        for (HonorarioDaAtualizacao honorarioCalculado : this.getHonorariosDaAtualizacaoCalculado()) {
            honorarioCalculado = MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioCalculado, this.getAtualizacao().getDataDeLiquidacao(), Boolean.TRUE);
        }
        for (HonorarioDaAtualizacao honorarioInformado : this.getHonorariosDaAtualizacaoInformado()) {
            HonorarioDaAtualizacao honorarioDaAtualizacao = MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioInformado, this.getAtualizacao().getDataDeLiquidacao(), Boolean.TRUE);
        }
    }

    public BigDecimal calcularTotalDevido() {
        BigDecimal dev;
        BigDecimal totalDevido = BigDecimal.ZERO;
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            boolean isEventoNaLiquidacaoNaoCalculadoAnteriormente;
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)multaCalculada.getMulta().getTipoCobrancaReclamante())) continue;
            boolean isPeriodoDeUmDiaNaDataDoEvento = this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && multaCalculada.getJaCalculadoUmaVez() == false;
            if (multaCalculada.getValorRemanescenteMulta() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                totalDevido = Utils.somar(totalDevido, multaCalculada.getDevidoCalculada(), totalDevido);
                continue;
            }
            totalDevido = Utils.somar(totalDevido, multaCalculada.getDevidoCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), totalDevido);
            totalDevido = Utils.somar(totalDevido, multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)), totalDevido);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)multaInformada.getMulta().getTipoCobrancaReclamante())) continue;
            totalDevido = Utils.somar(totalDevido, Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())), totalDevido);
            if (!this.podeCalcularJurosDeMulta(multaInformada.getMulta())) continue;
            BigDecimal devido = BigDecimal.ZERO;
            if (multaInformada.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
            }
            totalDevido = Utils.somar(totalDevido, devido, totalDevido);
            BigDecimal base = multaInformada.getMulta().getAplicarJurosSobreMulta() != false && BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaInformada.getTaxaJurosMulta().divide(Utils.CEM)));
            totalDevido = Utils.somar(totalDevido, dev, totalDevido);
        }
        for (HonorarioDaAtualizacao honorarioCalculado : this.getHonorariosDaAtualizacaoCalculado()) {
            boolean isEventoNaLiquidacaoNaoCalculadoAnteriormente;
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorarioCalculado.getHonorario().getTipoCobrancaReclamante())) continue;
            boolean isPeriodoDeUmDiaNaDataDoEvento = this.getDataFinalPeriodo().equals(honorarioCalculado.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && honorarioCalculado.getJaCalculadoUmaVez() == false;
            if (honorarioCalculado.getValorRemanescenteHonorario() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                totalDevido = Utils.somar(totalDevido, honorarioCalculado.getDevidoCalculada(), totalDevido);
                continue;
            }
            totalDevido = Utils.somar(totalDevido, honorarioCalculado.getDevidoCalculadaRemanescente(honorarioCalculado.getIndiceDeCorrecao()), totalDevido);
            totalDevido = Utils.somar(totalDevido, this.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM)), totalDevido);
            totalDevido = Utils.somar(totalDevido, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioCalculado.calcularHonorariosSobreMultas(this.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM))), totalDevido);
        }
        for (HonorarioDaAtualizacao honorarioInformado : this.getHonorariosDaAtualizacaoInformado()) {
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorarioInformado.getHonorario().getTipoCobrancaReclamante())) continue;
            totalDevido = Utils.somar(totalDevido, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())), totalDevido);
            if (!this.podeCalcularJurosDeHonorario(honorarioInformado.getHonorario())) continue;
            BigDecimal devido = BigDecimal.ZERO;
            if (honorarioInformado.getHonorario().getAplicarJuros().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), honorarioInformado.getIndiceDeCorrecao()));
            }
            totalDevido = Utils.somar(totalDevido, devido, totalDevido);
            BigDecimal base = honorarioInformado.getHonorario().getAplicarJuros() != false && BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, honorarioInformado.getTaxaJurosHonorario().divide(Utils.CEM)));
            totalDevido = Utils.somar(totalDevido, dev, totalDevido);
        }
        if (Utils.naoNulo(this.getCustasJudiciaisDaAtualizacao())) {
            totalDevido = Utils.somar(totalDevido, this.getDevidoCustasJudiciais(), totalDevido);
        }
        return totalDevido;
    }

    public BigDecimal calcularTotalPago() {
        boolean isEventoNaLiquidacaoNaoCalculadoAnteriormente;
        boolean isPeriodoDeUmDiaNaDataDoEvento;
        BigDecimal totalPago = BigDecimal.ZERO;
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)multaCalculada.getMulta().getTipoCobrancaReclamante())) continue;
            isPeriodoDeUmDiaNaDataDoEvento = this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && multaCalculada.getJaCalculadoUmaVez() == false;
            if (multaCalculada.getValorRemanescenteMulta() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                totalPago = Utils.somar(totalPago, multaCalculada.getPagoMulta(), totalPago);
                continue;
            }
            totalPago = Utils.somar(totalPago, multaCalculada.getPagoMulta(), totalPago);
            totalPago = Utils.somar(totalPago, multaCalculada.getPagoJuro(), totalPago);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)multaInformada.getMulta().getTipoCobrancaReclamante())) continue;
            totalPago = Utils.somar(totalPago, multaInformada.getPagoMulta(), totalPago);
            if (!this.podeCalcularJurosDeMulta(multaInformada.getMulta())) continue;
            totalPago = Utils.somar(totalPago, multaInformada.getPagoJuro(), totalPago);
            totalPago = Utils.somar(totalPago, multaInformada.getPagoJuroPeriodoAtual(), totalPago);
        }
        for (HonorarioDaAtualizacao honorarioCalculado : this.getHonorariosDaAtualizacaoCalculado()) {
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorarioCalculado.getHonorario().getTipoCobrancaReclamante())) continue;
            isPeriodoDeUmDiaNaDataDoEvento = this.getDataFinalPeriodo().equals(honorarioCalculado.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && honorarioCalculado.getJaCalculadoUmaVez() == false;
            if (honorarioCalculado.getValorRemanescenteHonorario() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoHonorario(), totalPago);
                continue;
            }
            totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoHonorario(), totalPago);
            totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoJuro(), totalPago);
            totalPago = Utils.somar(totalPago, honorarioCalculado.getPagoSobreMultas(), totalPago);
        }
        for (HonorarioDaAtualizacao honorarioInformado : this.getHonorariosDaAtualizacaoInformado()) {
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorarioInformado.getHonorario().getTipoCobrancaReclamante())) continue;
            totalPago = Utils.somar(totalPago, honorarioInformado.getPagoHonorario(), totalPago);
            if (!this.podeCalcularJurosDeHonorario(honorarioInformado.getHonorario())) continue;
            totalPago = Utils.somar(totalPago, honorarioInformado.getPagoJuro(), totalPago);
            totalPago = Utils.somar(totalPago, honorarioInformado.getPagoJuroPeriodoAtual(), totalPago);
        }
        if (Utils.naoNulo(this.getCustasJudiciaisDaAtualizacao())) {
            totalPago = Utils.somar(totalPago, this.getPagoCustasJudiciais(), totalPago);
        }
        return totalPago;
    }

    public BigDecimal calcularTotalDiferenca() {
        BigDecimal diferencaJuroAtual;
        BigDecimal dev;
        BigDecimal base;
        BigDecimal diferencaJuro;
        BigDecimal totalDiferenca = BigDecimal.ZERO;
        for (MultaDaAtualizacao multaCalculada : this.getMultasCalculadas()) {
            boolean isEventoNaLiquidacaoNaoCalculadoAnteriormente;
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)multaCalculada.getMulta().getTipoCobrancaReclamante())) continue;
            boolean isPeriodoDeUmDiaNaDataDoEvento = this.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && multaCalculada.getJaCalculadoUmaVez() == false;
            if (multaCalculada.getValorRemanescenteMulta() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                totalDiferenca = Utils.somar(totalDiferenca, multaCalculada.getDiferencaCalculadaOutros(), totalDiferenca);
                continue;
            }
            totalDiferenca = Utils.somar(totalDiferenca, multaCalculada.getDiferencaCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), totalDiferenca);
            totalDiferenca = Utils.somar(totalDiferenca, multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : this.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM), multaCalculada.getPagoJuro()), totalDiferenca);
        }
        for (MultaDaAtualizacao multaInformada : this.getMultasInformadas()) {
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)multaInformada.getMulta().getTipoCobrancaReclamante())) continue;
            BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()), multaInformada.getPagoMulta(), Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaMulta, totalDiferenca);
            if (!this.podeCalcularJurosDeMulta(multaInformada.getMulta())) continue;
            BigDecimal devido = BigDecimal.ZERO;
            if (multaInformada.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
            }
            diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaInformada.getPagoJuro(), devido));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
            base = multaInformada.getMulta().getAplicarJurosSobreMulta() != false && BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaInformada.getTaxaJurosMulta().divide(Utils.CEM)));
            diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaInformada.getPagoJuroPeriodoAtual(), dev));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
        }
        for (HonorarioDaAtualizacao honorarioCalculado : this.getHonorariosDaAtualizacaoCalculado()) {
            boolean isEventoNaLiquidacaoNaoCalculadoAnteriormente;
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorarioCalculado.getHonorario().getTipoCobrancaReclamante())) continue;
            boolean isPeriodoDeUmDiaNaDataDoEvento = this.getDataFinalPeriodo().equals(honorarioCalculado.getHonorario().getDataEvento()) && this.getDataInicialPeriodo().equals(this.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = this.getDataInicialPeriodo().equals(this.getCalculo().getDataDeLiquidacao()) && honorarioCalculado.getJaCalculadoUmaVez() == false;
            if (honorarioCalculado.getValorRemanescenteHonorario() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                totalDiferenca = Utils.somar(totalDiferenca, honorarioCalculado.getDiferencaCalculadaOutros(), totalDiferenca);
                continue;
            }
            totalDiferenca = Utils.somar(totalDiferenca, honorarioCalculado.getDiferencaCalculadaRemanescente(honorarioCalculado.getIndiceDeCorrecao()), totalDiferenca);
            totalDiferenca = Utils.somar(totalDiferenca, this.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM), honorarioCalculado.getPagoJuro()), totalDiferenca);
            totalDiferenca = Utils.somar(totalDiferenca, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioCalculado.calcularHonorariosSobreMultas(this.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM))), honorarioCalculado.getPagoSobreMultas()), totalDiferenca);
        }
        for (HonorarioDaAtualizacao honorarioInformado : this.getHonorariosDaAtualizacaoInformado()) {
            if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorarioInformado.getHonorario().getTipoCobrancaReclamante())) continue;
            BigDecimal diferencaHonorario = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao()), honorarioInformado.getPagoHonorario(), Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaHonorario, totalDiferenca);
            if (!this.podeCalcularJurosDeHonorario(honorarioInformado.getHonorario())) continue;
            BigDecimal devido = BigDecimal.ZERO;
            if (honorarioInformado.getHonorario().getAplicarJuros().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), honorarioInformado.getIndiceDeCorrecao()));
            }
            diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioInformado.getPagoJuro(), devido));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
            base = honorarioInformado.getHonorario().getAplicarJuros() != false && BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) <= 0 ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, honorarioInformado.getTaxaJurosHonorario().divide(Utils.CEM)));
            diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioInformado.getPagoJuroPeriodoAtual(), dev));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
        }
        if (Utils.naoNulo(this.getCustasJudiciaisDaAtualizacao())) {
            totalDiferenca = Utils.somar(totalDiferenca, this.getDiferencaCustasJudiciais(), totalDiferenca);
        }
        return totalDiferenca;
    }

    public BigDecimal getDevidoCustasJudiciais() {
        BigDecimal devido = null;
        if (TipoCobrancaReclamanteEnum.COBRAR.equals((Object)this.getCustasJudiciaisDaAtualizacao().getTipoCobrancaReclamante())) {
            devido = Utils.arredondarValorMonetario(this.getCustasJudiciaisDaAtualizacao().totalDevidoReclamante());
        }
        return devido;
    }

    public BigDecimal getPagoCustasJudiciais() {
        BigDecimal pago = null;
        if (TipoCobrancaReclamanteEnum.COBRAR.equals((Object)this.getCustasJudiciaisDaAtualizacao().getTipoCobrancaReclamante())) {
            pago = this.getCustasJudiciaisDaAtualizacao().getValorPagoReclamante();
        }
        return pago;
    }

    public BigDecimal getDiferencaCustasJudiciais() {
        BigDecimal diferenca = null;
        if (TipoCobrancaReclamanteEnum.COBRAR.equals((Object)this.getCustasJudiciaisDaAtualizacao().getTipoCobrancaReclamante())) {
            diferenca = Utils.arredondarValorMonetario(this.getCustasJudiciaisDaAtualizacao().getTotalDiferencaReclamante());
        }
        return diferenca;
    }

    private boolean podeCalcularJurosDeMulta(Multa multa) {
        Date dataRef = multa.getDataApartirDeAplicarJuros() != null ? multa.getDataApartirDeAplicarJuros() : (multa.getDataEvento() != null ? multa.getDataEvento() : multa.getDataVencimentoMulta());
        return multa.getAplicarJurosSobreMulta() != false && HelperDate.dateAfterOrEquals(this.getDataFinalPeriodo(), dataRef);
    }

    private boolean podeCalcularJurosDeHonorario(Honorario honorario) {
        Date dataRef = honorario.getDataApartirDeAplicarJuros() != null ? honorario.getDataApartirDeAplicarJuros() : (honorario.getDataEvento() != null ? honorario.getDataEvento() : honorario.getDataVencimento());
        return honorario.getAplicarJuros() != false && HelperDate.dateAfterOrEquals(this.getDataFinalPeriodo(), dataRef);
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null || !super.equals(obj) || this.getClass() != obj.getClass()) {
            return false;
        }
        DebitosCobrarDoReclamante other = (DebitosCobrarDoReclamante)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }
}

