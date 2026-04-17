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
 *  javax.persistence.Lob
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.apache.commons.lang.StringUtils
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaCustasCalculadasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.GrupoEsferaPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDevedorDoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeHonorarioDoPagamentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.RepositorioDeHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.ProporcoesIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.RepositorioDeMulta;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.RepositorioDePensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacaoVO;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PensaoAlimenticiaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioCreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDeArmazenamentoDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDeAutoJudicialDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDeCustaPagaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDeCustasFixasDasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDeCustasJudiciaisDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioOutrosDebitosDoReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
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
import javax.persistence.Lob;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.apache.commons.lang.StringUtils;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBATUALIZACAO")
@SequenceGenerator(name="SQATUALIZACAO", sequenceName="SQATUALIZACAO", allocationSize=1)
@Name(value="atualizacao")
@Scope(value=ScopeType.SESSION)
public class Atualizacao
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = -8304095372491053337L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQATUALIZACAO")
    @Column(name="IIDATUALIZACAO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="DDTCRIACAOATUALIZACAO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataCriacao;
    @Column(name="DDTLIQUIDACAO")
    @Temporal(value=TemporalType.DATE)
    private Date dataDeLiquidacao;
    @Column(name="SFLCOBRARENCARGOSIRPF", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean cobrarEncargosIrpf = Boolean.TRUE;
    @Column(name="SFLATUALIZARREGRAPRECATORIO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean atualizarRegraPrecatorio = Boolean.FALSE;
    @Enumerated(value=EnumType.STRING)
    @Column(name="STPESFERAPRECATORIO", columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="GrupoEsferaPrecatorioEnum")})
    private GrupoEsferaPrecatorioEnum grupoEsferaPrecatorio = GrupoEsferaPrecatorioEnum.FEDERAL;
    @Enumerated(value=EnumType.STRING)
    @Column(name="STPPRECATORIO", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoPrecatorioEnum")})
    private TipoPrecatorioEnum tipoPrecatorio = TipoPrecatorioEnum.RPV;
    @Column(name="DDTINICIOPERIODOGRACA")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicioPeriodoDaGraca;
    @Column(name="DDTFIMPERIODOGRACA")
    @Temporal(value=TemporalType.DATE)
    private Date dataFimPeriodoDaGraca;
    @Column(name="DDTINICIOAPLICAREC1362025")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicioAplicarEC1362025;
    @Column(name="SCDHASHLIQUIDACAO")
    private String hashCodeLiquidacao;
    @Column(name="IFOLHACALCULO", columnDefinition="VARCHAR2(80)")
    private String identificacaoCalculoFolha;
    @Lob
    @Column(name="SCDDESCEVENTOSRESUMO", columnDefinition="CLOB")
    private String descritivoDeEventosResumo;
    @Column(name="SDSCOMENTARIO", columnDefinition="VARCHAR2(500)")
    private String comentarios;
    @OneToMany(mappedBy="atualizacao", cascade={CascadeType.ALL})
    private List<CreditosDoReclamante> listaCreditosDoReclamante = new ArrayList<CreditosDoReclamante>();
    @OneToMany(mappedBy="atualizacao", cascade={CascadeType.ALL})
    private List<DebitosDoReclamante> listaDebitosDoReclamado = new ArrayList<DebitosDoReclamante>();
    @OneToMany(mappedBy="atualizacao", cascade={CascadeType.ALL})
    private List<OutrosDebitosReclamado> listaOutrosDebitosDoReclamado = new ArrayList<OutrosDebitosReclamado>();
    @OneToMany(mappedBy="atualizacao", cascade={CascadeType.ALL})
    private List<DebitosCobrarDoReclamante> listaDebitosCobrarDoReclamante = new ArrayList<DebitosCobrarDoReclamante>();
    @Column(name="SDSVERSAOSISTEMALIQUIDACAO", columnDefinition="VARCHAR2(30)")
    private String versaoDoSistema;
    @Transient
    private BigDecimal totalBrutoDevidoReclamanteParaCalculoDePercentual = BigDecimal.ZERO;
    @Transient
    private BigDecimal totalVerbasRemuneratorias = BigDecimal.ZERO;
    @Transient
    private BigDecimal totalVerbasTributaveis = BigDecimal.ZERO;
    @Transient
    private Boolean baseMultaJaPaga = Boolean.FALSE;
    @Transient
    private Boolean baseHonorarioJaPaga = Boolean.FALSE;
    @Transient
    private Boolean basePensaoJaPaga = Boolean.FALSE;
    private static final String FOLHA_NAO_INFORMADA = "Folha/ID n\u00e3o informado";
    private static final String FORMATO_DATA = "dd/MM/yyyy";
    private static final String DATA_DOS_EVENTOS = ", data do(s) evento(s)";
    private static final String ATE = " at\u00e9 ";
    private static final String ATUALIZACAO_DO_CALCULO = "Atualiza\u00e7\u00e3o do C\u00e1lculo (";

    public Atualizacao() {
        super(RepositorioAtualizacao.class);
        this.setDataCriacao(HelperDate.getInstance().getDate());
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public boolean isLiquidado() {
        return Utils.naoNulo(this.getDataDeLiquidacao());
    }

    public boolean isAlteradoParaLiquidacao() {
        return Utils.nulo(this.getHashCodeLiquidacao()) || !this.getHashCodeLiquidacao().equals(this.calcularHashCodeDaAtualizacao());
    }

    @Override
    public void salvar() {
        Atualizacao.getRepositorio(RepositorioAtualizacao.class).salvar(this);
    }

    public List<EventoAtualizacaoVO> getEventosDeAtualizacaoDasCustas() {
        Set<Armazenamento> set;
        Set<AutoJudicial> autosJudiciais;
        ArrayList<EventoAtualizacaoVO> eventos = new ArrayList<EventoAtualizacaoVO>();
        Set<CustasFixasAtualizacao> custasFixasDaAtualizacao = this.getCalculo().getCustasJudiciais().getCustasFixasAtualizacao();
        if (Utils.naoNulo(custasFixasDaAtualizacao)) {
            for (CustasFixasAtualizacao custasFixasAtualizacao : custasFixasDaAtualizacao) {
                EventoAtualizacaoVO evento = new EventoAtualizacaoVO();
                evento.setEvento(custasFixasAtualizacao);
                evento.setDataEvento(custasFixasAtualizacao.getDataEvento());
                evento.setId(custasFixasAtualizacao.getId());
                eventos.add(evento);
            }
        }
        if (Utils.naoNulo(autosJudiciais = this.getCalculo().getCustasJudiciais().getAutosJudiciaisDaAtualizacao())) {
            for (AutoJudicial auto : autosJudiciais) {
                EventoAtualizacaoVO evento = new EventoAtualizacaoVO();
                evento.setEvento(auto);
                evento.setDataEvento(auto.getDataVencimentoAuto());
                evento.setId(auto.getId());
                eventos.add(evento);
            }
        }
        if (Utils.naoNulo(set = this.getCalculo().getCustasJudiciais().getArmazenamentosDaAtualizacao())) {
            for (Armazenamento armazenamento : set) {
                EventoAtualizacaoVO evento = new EventoAtualizacaoVO();
                evento.setEvento(armazenamento);
                evento.setDataEvento(armazenamento.getDataInicioArmazenamento());
                evento.setId(armazenamento.getId());
                eventos.add(evento);
            }
        }
        Collections.sort(eventos);
        return eventos;
    }

    public List<EventoAtualizacaoVO> getEventosDeAtualizacao() {
        List<Multa> list;
        List<Honorario> honorarios;
        ArrayList<EventoAtualizacaoVO> eventos = new ArrayList<EventoAtualizacaoVO>();
        List<Pagamento> pagamentos = Pagamento.obterPagamentosDoCalculo(this.calculo);
        if (Utils.naoNulo(pagamentos)) {
            for (Pagamento pagamento : pagamentos) {
                EventoAtualizacaoVO eventoAtualizacaoVO = new EventoAtualizacaoVO();
                eventoAtualizacaoVO.setEvento(pagamento);
                eventoAtualizacaoVO.setDataEvento(pagamento.getDataPagamento());
                eventoAtualizacaoVO.setId(pagamento.getId());
                eventos.add(eventoAtualizacaoVO);
            }
        }
        if (Utils.naoNulo(honorarios = Honorario.obterTodosParaAtualizacao(this.getCalculo()))) {
            for (Honorario honorario : honorarios) {
                EventoAtualizacaoVO evento2 = new EventoAtualizacaoVO();
                evento2.setEvento(honorario);
                evento2.setDataEvento(honorario.getDataEvento());
                evento2.setId(honorario.getId());
                eventos.add(evento2);
            }
        }
        if (Utils.naoNulo(list = Multa.obterTodosParaAtualizacao(this.getCalculo()))) {
            for (Multa multa : list) {
                EventoAtualizacaoVO evento3 = new EventoAtualizacaoVO();
                evento3.setEvento(multa);
                evento3.setDataEvento(multa.getDataEvento());
                evento3.setId(multa.getId());
                eventos.add(evento3);
            }
        }
        if (Utils.naoNulo(this.getCalculo().getPensaoAlimenticiaDoPagamento())) {
            EventoAtualizacaoVO eventoAtualizacaoVO = new EventoAtualizacaoVO();
            eventoAtualizacaoVO.setEvento(this.calculo.getPensaoAlimenticiaDoPagamento());
            eventoAtualizacaoVO.setDataEvento(this.calculo.getPensaoAlimenticiaDoPagamento().getDataEvento());
            eventoAtualizacaoVO.setId(this.calculo.getPensaoAlimenticiaDoPagamento().getId());
            eventos.add(eventoAtualizacaoVO);
        }
        Collections.sort(eventos);
        return eventos;
    }

    public void liquidarParaCadaEvento() {
        Date diaAnteriorALiquidacaoDoCalculo;
        if (Utils.naoNulo(this.getId())) {
            Atualizacao.getRepositorio(RepositorioDebitosDoReclamante.class).removerTodos(this);
            Atualizacao.getRepositorio(RepositorioOutrosDebitosDoReclamado.class).removerTodos(this);
            Atualizacao.getRepositorio(RepositorioDebitosCobrarDoReclamante.class).removerTodos(this);
            Atualizacao.getRepositorio(RepositorioCreditosDoReclamante.class).removerTodos(this);
            for (CustasJudiciaisDaAtualizacao custas : Atualizacao.getRepositorio(RepositorioDeCustasJudiciaisDaAtualizacao.class).obterTodosCustasJudiciais(this)) {
                Atualizacao.getRepositorio(RepositorioDeAutoJudicialDaAtualizacao.class).removerTodos(custas);
                Atualizacao.getRepositorio(RepositorioDeArmazenamentoDaAtualizacao.class).removerTodos(custas);
                Atualizacao.getRepositorio(RepositorioDeCustasFixasDasAtualizacao.class).removerTodos(custas);
                Atualizacao.getRepositorio(RepositorioDeCustaPagaDaAtualizacao.class).removerTodos(custas);
            }
            Atualizacao.getRepositorio(RepositorioDeCustasJudiciaisDaAtualizacao.class).removerTodos(this);
        } else {
            this.salvar();
        }
        if (this.getCalculo().getAtualizacao() == null) {
            this.getCalculo().setAtualizacao(this);
        }
        if (this.getCalculo().getAtualizacao() == null) {
            this.getCalculo().setAtualizacao(this);
        }
        this.getCalculo().getInss().getInssSobreSalariosPagos().removerDeOcorrenciasAtualizacao();
        this.getCalculo().getInss().getInssSobreSalariosDevidos().removerDeOcorrenciasAtualizacao();
        this.getCalculo().getIrpf().removerDeOcorrenciasAtualizacao();
        this.getCalculo().getIrpf().removerDeOcorrenciasPagamento();
        CreditosDoReclamante creditoDoReclamante = this.calcularValoresAteLiquidacaoCalculoCreditosDoReclamante(this.calculo.getDataAdmissao(), this.calculo.getDataDeLiquidacao());
        DebitosDoReclamante debitosDoReclamante = this.calcularValoresAteLiquidacaoCalculoDebitosDoReclamante(this.calculo.getDataAdmissao(), this.calculo.getDataDeLiquidacao(), creditoDoReclamante);
        OutrosDebitosReclamado outrosDebitosReclamado = this.calcularValoresAteLiquidacaoCalculoOutrosDebitosReclamado(this.calculo.getDataAdmissao(), this.calculo.getDataDeLiquidacao());
        DebitosCobrarDoReclamante debitosCobrarDoReclamante = this.calcularValoresAteLiquidacaoCalculoDebitosCobrarDoReclamante(this.calculo.getDataAdmissao(), this.calculo.getDataDeLiquidacao());
        ProporcoesIrpf proporcoesIrpf = null;
        if (this.calculo.getIrpf().getApurarImpostoRenda().booleanValue()) {
            proporcoesIrpf = new ProporcoesIrpf(creditoDoReclamante, this.calculo.getIrpf());
        }
        Date dataEventoAnterior = diaAnteriorALiquidacaoDoCalculo = HelperDate.getInstance(this.calculo.getDataDeLiquidacao()).addDay(-1).getDate();
        CreditosDoReclamante creditoDoReclamanteAnterior = new CreditosDoReclamante();
        CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao = new CustasJudiciaisDaAtualizacao();
        custasJudiciaisDaAtualizacao.setAtualizacao(this);
        custasJudiciaisDaAtualizacao.converterParaCustasDaAtualizacao(this.getCalculo().getCustasJudiciais(), this.getCalculo().getDataDeLiquidacao());
        custasJudiciaisDaAtualizacao.salvar();
        custasJudiciaisDaAtualizacao = new CustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao, Boolean.TRUE);
        if (!this.calculo.getCustasJudiciais().getCustasPagasDoReclamante().isEmpty()) {
            custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.removerCustasReclamante(custasJudiciaisDaAtualizacao);
            custasJudiciaisDaAtualizacao.calcularDiferencaDasCustasAteCalculoReclamante();
        }
        if (!this.calculo.getCustasJudiciais().getCustasPagasDoReclamado().isEmpty()) {
            custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.removerCustasReclamado(custasJudiciaisDaAtualizacao);
            custasJudiciaisDaAtualizacao.calcularDiferencaDasCustasAteCalculoReclamado();
        }
        this.getCalculo().getParametrosDeAtualizacao().setInformacaoUltimoIndiceAtualizacao(ParametrosDeAtualizacaoUtils.gerarMensagemDeUltimoIndice(this.getCalculo().getParametrosDeAtualizacao(), this.getDataDeLiquidacao()));
        List<EventoAtualizacaoVO> eventosDasCustas = this.getEventosDeAtualizacaoDasCustas();
        ArrayList<EventoAtualizacaoVO> eventosDasCustasRemover = new ArrayList<EventoAtualizacaoVO>();
        List<EventoAtualizacaoVO> eventos = this.getEventosDeAtualizacao();
        HashSet<Date> datasLiquidadas = new HashSet<Date>();
        StringBuilder descritivoDeEventos = new StringBuilder();
        descritivoDeEventos.append(ATUALIZACAO_DO_CALCULO + (Utils.naoVazio(this.getIdentificacaoCalculoFolha()) ? this.getIdentificacaoCalculoFolha().toUpperCase() : FOLHA_NAO_INFORMADA) + ")");
        StringBuilder eventosOcorridos = new StringBuilder("");
        StringBuilder descritivoDeEventosResumo = new StringBuilder("Eventos ocorridos: ");
        StringBuilder eventosOcorridosResumo = new StringBuilder();
        Date dataUltimaLiquidacaoInss = null;
        for (EventoAtualizacaoVO eventoVO : eventos) {
            creditoDoReclamanteAnterior = creditoDoReclamante;
            if (Utils.nulo(eventoVO.getDataEvento()) || eventoVO.getDataEvento().after(this.getDataDeLiquidacao())) continue;
            if (!datasLiquidadas.contains(eventoVO.getDataEvento())) {
                this.getCalculo().getInss().liquidarAtualizacao(eventoVO.getDataEvento());
                dataUltimaLiquidacaoInss = eventoVO.getDataEvento();
            }
            if (!dataEventoAnterior.equals(diaAnteriorALiquidacaoDoCalculo)) {
                if (!dataEventoAnterior.equals(eventoVO.getDataEvento())) {
                    descritivoDeEventos.append(ATE + HelperDate.getInstance(dataEventoAnterior).format(FORMATO_DATA) + DATA_DOS_EVENTOS + Utils.replaceLast(eventosOcorridos, ",", "."));
                    creditoDoReclamante.setDescritivoDeEventos(descritivoDeEventos.toString());
                    creditoDoReclamante.salvar();
                    custasJudiciaisDaAtualizacao.salvar();
                    debitosDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                    debitosDoReclamante.salvar();
                    outrosDebitosReclamado.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                    outrosDebitosReclamado.salvar();
                    debitosCobrarDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                    debitosCobrarDoReclamante.salvar();
                    custasJudiciaisDaAtualizacao = new CustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao, Boolean.TRUE);
                    if (custasJudiciaisDaAtualizacao.getValorPagoReclamado().compareTo(BigDecimal.ZERO) == 1) {
                        custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.removerCustasReclamado(custasJudiciaisDaAtualizacao);
                    }
                    if (custasJudiciaisDaAtualizacao.getValorPagoReclamante().compareTo(BigDecimal.ZERO) == 1) {
                        custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.removerCustasReclamante(custasJudiciaisDaAtualizacao);
                    }
                    if (!custasJudiciaisDaAtualizacao.getHouvePagamentoDaBase().booleanValue() && (creditoDoReclamante.getTotalPago().compareTo(BigDecimal.ZERO) == 1 || outrosDebitosReclamado.getTotalPago().compareTo(BigDecimal.ZERO) == 1 && BaseParaCustasCalculadasEnum.BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO.equals((Object)custasJudiciaisDaAtualizacao.getBaseParaCustasCalculadas()))) {
                        custasJudiciaisDaAtualizacao.setHouvePagamentoDaBase(Boolean.TRUE);
                    }
                    custasJudiciaisDaAtualizacao.limparPagamentos();
                    this.verificarPagamentoDeBaseDeMultasEHonorariosCalculadosEPensao(creditoDoReclamante, debitosDoReclamante, outrosDebitosReclamado, debitosCobrarDoReclamante);
                    descritivoDeEventos = new StringBuilder("");
                    descritivoDeEventos.append(ATUALIZACAO_DO_CALCULO + (Utils.naoVazio(this.getIdentificacaoCalculoFolha()) ? this.getIdentificacaoCalculoFolha().toUpperCase() : FOLHA_NAO_INFORMADA) + ")");
                    eventosOcorridos = new StringBuilder("");
                }
            } else {
                dataEventoAnterior = this.getCalculo().getDataDeLiquidacao();
            }
            for (EventoAtualizacaoVO eventoCustasVO : eventosDasCustas) {
                if (!HelperDate.dateBeforeOrEquals(eventoCustasVO.getDataEvento(), eventoVO.getDataEvento())) continue;
                if (eventoCustasVO.getEvento() instanceof CustasFixasAtualizacao) {
                    CustasFixasAtualizacao custasFixasAtualizacao = CustasFixasAtualizacao.obter(eventoCustasVO.getId());
                    custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.adicionarCustaFixa(custasJudiciaisDaAtualizacao, custasFixasAtualizacao);
                    eventosOcorridosResumo.append(this.getDescricaoDeCustaFixaParaResumo(custasFixasAtualizacao));
                }
                if (eventoCustasVO.getEvento() instanceof AutoJudicial) {
                    AutoJudicial auto = AutoJudicial.obter(eventoCustasVO.getId());
                    custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.adicionarAuto(custasJudiciaisDaAtualizacao, auto);
                    eventosOcorridosResumo.append(" Auto Judicial de " + auto.getTipoDeAuto().getNome() + " em " + HelperDate.getInstance(auto.getDataVencimentoAuto()).format(FORMATO_DATA) + ";");
                }
                if (eventoCustasVO.getEvento() instanceof Armazenamento) {
                    Armazenamento armazenamento = Armazenamento.obter(eventoCustasVO.getId());
                    custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.adicionarArmazenamento(custasJudiciaisDaAtualizacao, armazenamento);
                    eventosOcorridosResumo.append(" Custas de Armazenamento em " + HelperDate.getInstance(armazenamento.getDataInicioArmazenamento()).format(FORMATO_DATA) + ";");
                }
                eventosDasCustasRemover.add(eventoCustasVO);
            }
            eventosDasCustas.removeAll(eventosDasCustasRemover);
            if (eventoVO.getEvento() instanceof Pagamento) {
                Pagamento pagamento = Pagamento.obter(eventoVO.getId());
                creditoDoReclamante = creditoDoReclamante.liquidarCreditosReclamante(dataEventoAnterior, pagamento.getDataPagamento(), creditoDoReclamante, pagamento, null, debitosDoReclamante, datasLiquidadas.isEmpty());
                outrosDebitosReclamado = outrosDebitosReclamado.liquidarOutrosDebitosReclamado(dataEventoAnterior, pagamento.getDataPagamento(), outrosDebitosReclamado, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, pagamento, null, null, null, datasLiquidadas.isEmpty());
                debitosDoReclamante = debitosDoReclamante.liquidarDebitosReclamante(dataEventoAnterior, pagamento.getDataPagamento(), debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, pagamento, null, null, null, null, datasLiquidadas.isEmpty());
                debitosCobrarDoReclamante = debitosCobrarDoReclamante.liquidarDebitosCobrarDoReclamante(dataEventoAnterior, pagamento.getDataPagamento(), debitosCobrarDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, debitosDoReclamante, pagamento, null, null, datasLiquidadas.isEmpty());
                custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.liquidarCustasJudiciaisDaAtualizacao(outrosDebitosReclamado, creditoDoReclamante, custasJudiciaisDaAtualizacao, dataEventoAnterior, pagamento.getDataPagamento());
                outrosDebitosReclamado.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                debitosDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                debitosCobrarDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                pagamento.calcularRateioCreditoERecolhimentoReclamante(creditoDoReclamante, debitosDoReclamante);
                creditoDoReclamante = creditoDoReclamante.aplicarPagamento(creditoDoReclamante, pagamento);
                debitosDoReclamante = debitosDoReclamante.aplicarPagamento(debitosDoReclamante, pagamento);
                this.getCalculo().getIrpf().liquidarAtualizacao(eventoVO.getDataEvento(), proporcoesIrpf, creditoDoReclamante, debitosDoReclamante, true);
                debitosDoReclamante = debitosDoReclamante.atualizarDadosDeImpostoDeRenda(pagamento);
                outrosDebitosReclamado = outrosDebitosReclamado.atualizarDevidoDeImpostoDeRenda(pagamento);
                debitosDoReclamante.setTotalDevido(debitosDoReclamante.calcularTotalDevido());
                outrosDebitosReclamado.setTotalDevido(outrosDebitosReclamado.calcularTotalDevido());
                debitosCobrarDoReclamante.setTotalDevido(debitosCobrarDoReclamante.calcularTotalDevido());
                pagamento.calcularRateioOutrosDebitosReclamado(outrosDebitosReclamado);
                pagamento.calcularRateioDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
                outrosDebitosReclamado = outrosDebitosReclamado.aplicarPagamento(outrosDebitosReclamado, pagamento);
                debitosCobrarDoReclamante = debitosCobrarDoReclamante.aplicarPagamento(debitosCobrarDoReclamante, pagamento);
                if (TipoCobrancaReclamanteEnum.COBRAR.equals((Object)custasJudiciaisDaAtualizacao.getTipoCobrancaReclamante())) {
                    custasJudiciaisDaAtualizacao.ratearValorPagoReclamante(pagamento.getValorParaPagamentoDebitosCobrarDoReclamanteCustasJudiciais());
                } else if (pagamento.getSelecionarCustasJudiciais().booleanValue() && pagamento.getApurarCustasJudiciais().booleanValue()) {
                    BigDecimal valorPagoReclamante = this.getAtualizarRegraPrecatorio() == false ? pagamento.apurarRecolhimentoOutrosDoReclamante(debitosDoReclamante.getDevidoCustasJudiciais()) : pagamento.apurarRecolhimentoDoReclamante(debitosDoReclamante.getDevidoCorrigidoCustasJudiciaisPrecatorio());
                    custasJudiciaisDaAtualizacao.ratearValorPagoReclamante(valorPagoReclamante, pagamento.getPriorizarPagamentoDeJuros());
                } else if (pagamento.getSelecionarCustasJudiciais().booleanValue() && !pagamento.getApurarCustasJudiciais().booleanValue()) {
                    custasJudiciaisDaAtualizacao.ratearValorPagoReclamante(pagamento.getValorParaRecolhimentoDebitosReclamanteCustasJudiciais(), pagamento.getPriorizarPagamentoDeJuros());
                }
                custasJudiciaisDaAtualizacao.ratearValorPagoReclamado(pagamento.getValorParaPagamentoOutrosDebitosReclamadoCustasJudiciais());
                debitosDoReclamante.setTotalPago(debitosDoReclamante.calcularTotalPago());
                debitosDoReclamante.setTotalDiferenca(debitosDoReclamante.calcularTotalDiferenca());
                outrosDebitosReclamado.setTotalPago(outrosDebitosReclamado.calcularTotalPago());
                outrosDebitosReclamado.setTotalDiferenca(outrosDebitosReclamado.calcularTotalDiferenca());
                debitosCobrarDoReclamante.setTotalPago(debitosCobrarDoReclamante.calcularTotalPago());
                debitosCobrarDoReclamante.setTotalDiferenca(debitosCobrarDoReclamante.calcularTotalDiferenca());
                if (this.getAtualizarRegraPrecatorio().booleanValue()) {
                    outrosDebitosReclamado.setValorPagoCustasParaPrecatorio(custasJudiciaisDaAtualizacao.getValorPagoReclamado());
                    debitosDoReclamante.setValorPagoCustasParaPrecatorio(custasJudiciaisDaAtualizacao.getValorPagoReclamante());
                }
                dataEventoAnterior = pagamento.getDataPagamento();
                this.getCalculo().getInss().aplicarPagamento(pagamento, debitosDoReclamante, outrosDebitosReclamado);
                this.getCalculo().getIrpf().aplicarPagamento(eventoVO.getDataEvento(), pagamento);
                if (pagamento.getRecolherDebitosReclamante().booleanValue()) {
                    eventosOcorridos.append(" Pagamento/Recolhimento (" + (Utils.naoVazio(pagamento.getFolhaDoEvento()) ? pagamento.getFolhaDoEvento().toUpperCase() : FOLHA_NAO_INFORMADA) + "),");
                } else {
                    eventosOcorridos.append(" Pagamento (" + (Utils.naoVazio(pagamento.getFolhaDoEvento()) ? pagamento.getFolhaDoEvento().toUpperCase() : FOLHA_NAO_INFORMADA) + "),");
                }
                if (pagamento.getRecolherDebitosReclamante().booleanValue()) {
                    eventosOcorridosResumo.append(" Pagamento/Recolhimento em " + HelperDate.getInstance(pagamento.getDataPagamento()).format(FORMATO_DATA) + " no valor de R$ " + Utils.formatarValor(pagamento.getValorPagamento()) + ";");
                } else {
                    eventosOcorridosResumo.append(" Pagamento em " + HelperDate.getInstance(pagamento.getDataPagamento()).format(FORMATO_DATA) + " no valor de R$ " + Utils.formatarValor(pagamento.getValorPagamento()) + ";");
                }
            }
            if (eventoVO.getEvento() instanceof Honorario) {
                Honorario honorario = (Honorario)EntidadeBase.obter(RepositorioDeHonorario.class, eventoVO.getId());
                creditoDoReclamante = creditoDoReclamante.liquidarCreditosReclamante(dataEventoAnterior, honorario.getDataEvento(), creditoDoReclamante, null, null, debitosDoReclamante, datasLiquidadas.isEmpty());
                outrosDebitosReclamado = outrosDebitosReclamado.liquidarOutrosDebitosReclamado(dataEventoAnterior, honorario.getDataEvento(), outrosDebitosReclamado, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, null, null, honorario, null, datasLiquidadas.isEmpty());
                debitosDoReclamante = debitosDoReclamante.liquidarDebitosReclamante(dataEventoAnterior, honorario.getDataEvento(), debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, null, null, honorario, null, null, datasLiquidadas.isEmpty());
                debitosCobrarDoReclamante = debitosCobrarDoReclamante.liquidarDebitosCobrarDoReclamante(dataEventoAnterior, honorario.getDataEvento(), debitosCobrarDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, debitosDoReclamante, null, null, honorario, datasLiquidadas.isEmpty());
                debitosDoReclamante = debitosDoReclamante.atualizarDadosDeImpostoDeRendaAte(honorario.getDataEvento());
                outrosDebitosReclamado = outrosDebitosReclamado.atualizarDadosDeImpostoDeRendaAte(honorario.getDataEvento());
                custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.liquidarCustasJudiciaisDaAtualizacao(outrosDebitosReclamado, creditoDoReclamante, custasJudiciaisDaAtualizacao, dataEventoAnterior, honorario.getDataEvento());
                outrosDebitosReclamado.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                debitosDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                debitosCobrarDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                outrosDebitosReclamado.setTotalDevido(outrosDebitosReclamado.calcularTotalDevido());
                outrosDebitosReclamado.setTotalPago(outrosDebitosReclamado.calcularTotalPago());
                outrosDebitosReclamado.setTotalDiferenca(outrosDebitosReclamado.calcularTotalDiferenca());
                debitosDoReclamante.setTotalDevido(debitosDoReclamante.calcularTotalDevido());
                debitosDoReclamante.setTotalPago(debitosDoReclamante.calcularTotalPago());
                debitosDoReclamante.setTotalDiferenca(debitosDoReclamante.calcularTotalDiferenca());
                debitosCobrarDoReclamante.setTotalDevido(debitosCobrarDoReclamante.calcularTotalDevido());
                debitosCobrarDoReclamante.setTotalPago(debitosCobrarDoReclamante.calcularTotalPago());
                debitosCobrarDoReclamante.setTotalDiferenca(debitosCobrarDoReclamante.calcularTotalDiferenca());
                dataEventoAnterior = honorario.getDataEvento();
                eventosOcorridos.append(" Honor\u00e1rios (" + (Utils.naoVazio(honorario.getFolhaDoEvento()) ? honorario.getFolhaDoEvento().toUpperCase() : FOLHA_NAO_INFORMADA) + "),");
                eventosOcorridosResumo.append(" Honor\u00e1rios em " + HelperDate.getInstance(honorario.getDataEvento()).format(FORMATO_DATA) + ";");
            }
            if (eventoVO.getEvento() instanceof Multa) {
                Multa multa = (Multa)EntidadeBase.obter(RepositorioDeMulta.class, eventoVO.getId());
                creditoDoReclamante = creditoDoReclamante.liquidarCreditosReclamante(dataEventoAnterior, multa.getDataEvento(), creditoDoReclamante, null, multa, debitosDoReclamante, datasLiquidadas.isEmpty());
                outrosDebitosReclamado = outrosDebitosReclamado.liquidarOutrosDebitosReclamado(dataEventoAnterior, multa.getDataEvento(), outrosDebitosReclamado, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, null, multa, null, null, datasLiquidadas.isEmpty());
                debitosDoReclamante = debitosDoReclamante.liquidarDebitosReclamante(dataEventoAnterior, multa.getDataEvento(), debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, null, multa, null, null, null, datasLiquidadas.isEmpty());
                debitosCobrarDoReclamante = debitosCobrarDoReclamante.liquidarDebitosCobrarDoReclamante(dataEventoAnterior, multa.getDataEvento(), debitosCobrarDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, debitosDoReclamante, null, multa, null, datasLiquidadas.isEmpty());
                debitosDoReclamante = debitosDoReclamante.atualizarDadosDeImpostoDeRendaAte(multa.getDataEvento());
                outrosDebitosReclamado = outrosDebitosReclamado.atualizarDadosDeImpostoDeRendaAte(multa.getDataEvento());
                custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.liquidarCustasJudiciaisDaAtualizacao(outrosDebitosReclamado, creditoDoReclamante, custasJudiciaisDaAtualizacao, dataEventoAnterior, multa.getDataEvento());
                outrosDebitosReclamado.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                debitosDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                debitosCobrarDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                outrosDebitosReclamado.setTotalDevido(outrosDebitosReclamado.calcularTotalDevido());
                outrosDebitosReclamado.setTotalPago(outrosDebitosReclamado.calcularTotalPago());
                outrosDebitosReclamado.setTotalDiferenca(outrosDebitosReclamado.calcularTotalDiferenca());
                debitosDoReclamante.setTotalDevido(debitosDoReclamante.calcularTotalDevido());
                debitosDoReclamante.setTotalPago(debitosDoReclamante.calcularTotalPago());
                debitosDoReclamante.setTotalDiferenca(debitosDoReclamante.calcularTotalDiferenca());
                debitosCobrarDoReclamante.setTotalDevido(debitosCobrarDoReclamante.calcularTotalDevido());
                debitosCobrarDoReclamante.setTotalPago(debitosCobrarDoReclamante.calcularTotalPago());
                debitosCobrarDoReclamante.setTotalDiferenca(debitosCobrarDoReclamante.calcularTotalDiferenca());
                dataEventoAnterior = multa.getDataEvento();
                eventosOcorridos.append(" Multa/Indeniza\u00e7\u00e3o (" + (Utils.naoVazio(multa.getFolhaDoEvento()) ? multa.getFolhaDoEvento().toUpperCase() : FOLHA_NAO_INFORMADA) + "),");
                eventosOcorridosResumo.append(" Multa/Indeniza\u00e7\u00e3o em " + HelperDate.getInstance(multa.getDataEvento()).format(FORMATO_DATA) + ";");
            }
            if (eventoVO.getEvento() instanceof PensaoAlimenticia) {
                PensaoAlimenticia pensao = (PensaoAlimenticia)EntidadeBase.obter(RepositorioDePensaoAlimenticia.class, eventoVO.getId());
                creditoDoReclamante = creditoDoReclamante.liquidarCreditosReclamante(dataEventoAnterior, pensao.getDataEvento(), creditoDoReclamante, null, null, debitosDoReclamante, datasLiquidadas.isEmpty());
                outrosDebitosReclamado = outrosDebitosReclamado.liquidarOutrosDebitosReclamado(dataEventoAnterior, pensao.getDataEvento(), outrosDebitosReclamado, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, null, null, null, null, datasLiquidadas.isEmpty());
                debitosDoReclamante = debitosDoReclamante.liquidarDebitosReclamante(dataEventoAnterior, pensao.getDataEvento(), debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, null, null, null, null, pensao, datasLiquidadas.isEmpty());
                debitosCobrarDoReclamante = debitosCobrarDoReclamante.liquidarDebitosCobrarDoReclamante(dataEventoAnterior, pensao.getDataEvento(), debitosCobrarDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, debitosDoReclamante, null, null, null, datasLiquidadas.isEmpty());
                debitosDoReclamante = debitosDoReclamante.atualizarDadosDeImpostoDeRendaAte(pensao.getDataEvento());
                outrosDebitosReclamado = outrosDebitosReclamado.atualizarDadosDeImpostoDeRendaAte(pensao.getDataEvento());
                custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.liquidarCustasJudiciaisDaAtualizacao(outrosDebitosReclamado, creditoDoReclamante, custasJudiciaisDaAtualizacao, dataEventoAnterior, pensao.getDataEvento());
                outrosDebitosReclamado.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                debitosDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                debitosCobrarDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
                outrosDebitosReclamado.setTotalDevido(outrosDebitosReclamado.calcularTotalDevido());
                outrosDebitosReclamado.setTotalPago(outrosDebitosReclamado.calcularTotalPago());
                outrosDebitosReclamado.setTotalDiferenca(outrosDebitosReclamado.calcularTotalDiferenca());
                debitosDoReclamante.setTotalDevido(debitosDoReclamante.calcularTotalDevido());
                debitosDoReclamante.setTotalPago(debitosDoReclamante.calcularTotalPago());
                debitosDoReclamante.setTotalDiferenca(debitosDoReclamante.calcularTotalDiferenca());
                debitosCobrarDoReclamante.setTotalDevido(debitosCobrarDoReclamante.calcularTotalDevido());
                debitosCobrarDoReclamante.setTotalPago(debitosCobrarDoReclamante.calcularTotalPago());
                debitosCobrarDoReclamante.setTotalDiferenca(debitosCobrarDoReclamante.calcularTotalDiferenca());
                dataEventoAnterior = pensao.getDataEvento();
                eventosOcorridos.append(" Pens\u00e3o Aliment\u00edcia (" + (Utils.naoVazio(pensao.getFolhaDoEvento()) ? pensao.getFolhaDoEvento().toUpperCase() : FOLHA_NAO_INFORMADA) + "),");
                eventosOcorridosResumo.append(" Pens\u00e3o Aliment\u00edcia em " + HelperDate.getInstance(pensao.getDataEvento()).format(FORMATO_DATA) + ";");
            }
            datasLiquidadas.add(eventoVO.getDataEvento());
        }
        creditoDoReclamanteAnterior = creditoDoReclamante;
        if (!dataEventoAnterior.equals(diaAnteriorALiquidacaoDoCalculo) && !dataEventoAnterior.equals(this.getDataDeLiquidacao())) {
            descritivoDeEventos.append(ATE + HelperDate.getInstance(dataEventoAnterior).format(FORMATO_DATA) + DATA_DOS_EVENTOS + Utils.replaceLast(eventosOcorridos, ",", "."));
            creditoDoReclamante.setDescritivoDeEventos(descritivoDeEventos.toString());
            creditoDoReclamante.salvar();
            custasJudiciaisDaAtualizacao.salvar();
            debitosDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
            debitosDoReclamante.salvar();
            outrosDebitosReclamado.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
            outrosDebitosReclamado.salvar();
            debitosCobrarDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
            debitosCobrarDoReclamante.salvar();
            custasJudiciaisDaAtualizacao = new CustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao, Boolean.TRUE);
            if (custasJudiciaisDaAtualizacao.getValorPagoReclamante().compareTo(BigDecimal.ZERO) == 1) {
                custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.removerCustasReclamante(custasJudiciaisDaAtualizacao);
                custasJudiciaisDaAtualizacao.setJaPagoUmaVezReclamante(true);
            }
            if (custasJudiciaisDaAtualizacao.getValorPagoReclamado().compareTo(BigDecimal.ZERO) == 1) {
                custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.removerCustasReclamado(custasJudiciaisDaAtualizacao);
                custasJudiciaisDaAtualizacao.setJaPagoUmaVezReclamado(true);
            }
            if (!custasJudiciaisDaAtualizacao.getHouvePagamentoDaBase().booleanValue() && (creditoDoReclamante.getTotalPago().compareTo(BigDecimal.ZERO) == 1 || outrosDebitosReclamado.getTotalPago().compareTo(BigDecimal.ZERO) == 1 && BaseParaCustasCalculadasEnum.BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO.equals((Object)custasJudiciaisDaAtualizacao.getBaseParaCustasCalculadas()))) {
                custasJudiciaisDaAtualizacao.setHouvePagamentoDaBase(Boolean.TRUE);
            }
            custasJudiciaisDaAtualizacao.limparPagamentos();
            this.verificarPagamentoDeBaseDeMultasEHonorariosCalculadosEPensao(creditoDoReclamante, debitosDoReclamante, outrosDebitosReclamado, debitosCobrarDoReclamante);
            descritivoDeEventos = new StringBuilder("");
            descritivoDeEventos.append(ATUALIZACAO_DO_CALCULO + (Utils.naoVazio(this.getIdentificacaoCalculoFolha()) ? this.getIdentificacaoCalculoFolha().toUpperCase() : FOLHA_NAO_INFORMADA) + ")");
            eventosOcorridos = new StringBuilder("");
        } else if (dataEventoAnterior.equals(diaAnteriorALiquidacaoDoCalculo)) {
            dataEventoAnterior = this.getCalculo().getDataDeLiquidacao();
        }
        for (EventoAtualizacaoVO eventoCustasVO : eventosDasCustas) {
            if (!HelperDate.dateBeforeOrEquals(eventoCustasVO.getDataEvento(), this.getDataDeLiquidacao())) continue;
            if (eventoCustasVO.getEvento() instanceof CustasFixasAtualizacao) {
                CustasFixasAtualizacao custasFixasAtualizacao = CustasFixasAtualizacao.obter(eventoCustasVO.getId());
                custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.adicionarCustaFixa(custasJudiciaisDaAtualizacao, custasFixasAtualizacao);
            }
            if (eventoCustasVO.getEvento() instanceof AutoJudicial) {
                AutoJudicial auto = AutoJudicial.obter(eventoCustasVO.getId());
                custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.adicionarAuto(custasJudiciaisDaAtualizacao, auto);
            }
            if (eventoCustasVO.getEvento() instanceof Armazenamento) {
                Armazenamento armazenamento = Armazenamento.obter(eventoCustasVO.getId());
                custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.adicionarArmazenamento(custasJudiciaisDaAtualizacao, armazenamento);
            }
            eventosDasCustasRemover.add(eventoCustasVO);
        }
        eventosDasCustas.removeAll(eventosDasCustasRemover);
        if (datasLiquidadas.isEmpty() || !HelperDate.dateEquals(this.calculo.getDataDeLiquidacao(), this.getDataDeLiquidacao()) && (Utils.nulo(dataUltimaLiquidacaoInss) || !HelperDate.dateEquals(this.getDataDeLiquidacao(), dataUltimaLiquidacaoInss))) {
            this.getCalculo().getInss().liquidarAtualizacao(this.getDataDeLiquidacao());
        }
        creditoDoReclamante = creditoDoReclamante.liquidarCreditosReclamante(dataEventoAnterior, this.getDataDeLiquidacao(), creditoDoReclamante, null, null, debitosDoReclamante, datasLiquidadas.isEmpty());
        outrosDebitosReclamado = outrosDebitosReclamado.liquidarOutrosDebitosReclamado(dataEventoAnterior, this.getDataDeLiquidacao(), outrosDebitosReclamado, debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, null, null, null, null, datasLiquidadas.isEmpty());
        debitosDoReclamante = debitosDoReclamante.liquidarDebitosReclamante(dataEventoAnterior, this.getDataDeLiquidacao(), debitosDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, null, null, null, null, null, datasLiquidadas.isEmpty());
        debitosCobrarDoReclamante = debitosCobrarDoReclamante.liquidarDebitosCobrarDoReclamante(dataEventoAnterior, this.getDataDeLiquidacao(), debitosCobrarDoReclamante, creditoDoReclamante, creditoDoReclamanteAnterior, debitosDoReclamante, null, null, null, datasLiquidadas.isEmpty());
        this.getCalculo().getIrpf().liquidarAtualizacao(this.getDataDeLiquidacao(), proporcoesIrpf, creditoDoReclamante, debitosDoReclamante, false);
        this.getCalculo().getIrpf().aplicarPagamentoNoSaldo(this.getDataDeLiquidacao());
        if (Utils.naoNulo(eventos) && !eventos.isEmpty() && eventos.get(eventos.size() - 1).getEvento() instanceof Pagamento) {
            Pagamento pagamento = Pagamento.obter(eventos.get(eventos.size() - 1).getId());
            if (pagamento.getSelecionarImpostoDoReclamante().booleanValue() && eventos.get(eventos.size() - 1).getDataEvento().equals(this.getDataDeLiquidacao())) {
                debitosDoReclamante = debitosDoReclamante.atualizarDadosDeImpostoDeRendaAteSaldo(true);
                outrosDebitosReclamado = outrosDebitosReclamado.atualizarDadosDeImpostoDeRendaAteSaldo(true);
            } else {
                debitosDoReclamante = debitosDoReclamante.atualizarDadosDeImpostoDeRendaAteSaldo(false);
                outrosDebitosReclamado = outrosDebitosReclamado.atualizarDadosDeImpostoDeRendaAteSaldo(false);
            }
        } else {
            debitosDoReclamante = debitosDoReclamante.atualizarDadosDeImpostoDeRendaAteSaldo(false);
            outrosDebitosReclamado = outrosDebitosReclamado.atualizarDadosDeImpostoDeRendaAteSaldo(false);
        }
        custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.liquidarCustasJudiciaisDaAtualizacao(outrosDebitosReclamado, creditoDoReclamante, custasJudiciaisDaAtualizacao, dataEventoAnterior, this.getDataDeLiquidacao());
        if (!Utils.naoNulo(custasJudiciaisDaAtualizacao.getValorPagoReclamado()) || custasJudiciaisDaAtualizacao.getValorPagoReclamado().compareTo(BigDecimal.ZERO) != 1 || !dataEventoAnterior.equals(this.getDataDeLiquidacao())) {
            custasJudiciaisDaAtualizacao.ratearValorPagoReclamado(BigDecimal.ZERO);
        }
        if (!Utils.naoNulo(custasJudiciaisDaAtualizacao.getValorPagoReclamante()) || custasJudiciaisDaAtualizacao.getValorPagoReclamante().compareTo(BigDecimal.ZERO) != 1 || !dataEventoAnterior.equals(this.getDataDeLiquidacao())) {
            custasJudiciaisDaAtualizacao.ratearValorPagoReclamante(BigDecimal.ZERO);
        }
        outrosDebitosReclamado.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
        debitosDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
        debitosCobrarDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
        debitosDoReclamante.calcularImpostoDeRendaDoSaldoDeHonorarios();
        outrosDebitosReclamado.calcularImpostoDeRendaDoSaldoDeHonorarios();
        debitosCobrarDoReclamante.calcularImpostoDeRendaDoSaldoDeHonorarios();
        outrosDebitosReclamado.setTotalDevido(outrosDebitosReclamado.calcularTotalDevido());
        outrosDebitosReclamado.setTotalPago(outrosDebitosReclamado.calcularTotalPago());
        outrosDebitosReclamado.setTotalDiferenca(outrosDebitosReclamado.calcularTotalDiferenca());
        debitosDoReclamante.setTotalDevido(debitosDoReclamante.calcularTotalDevido());
        debitosDoReclamante.setTotalPago(debitosDoReclamante.calcularTotalPago());
        debitosDoReclamante.setTotalDiferenca(debitosDoReclamante.calcularTotalDiferenca());
        debitosCobrarDoReclamante.setTotalDevido(debitosCobrarDoReclamante.calcularTotalDevido());
        debitosCobrarDoReclamante.setTotalPago(debitosCobrarDoReclamante.calcularTotalPago());
        debitosCobrarDoReclamante.setTotalDiferenca(debitosCobrarDoReclamante.calcularTotalDiferenca());
        if ("".equals(eventosOcorridos.toString())) {
            creditoDoReclamante.setDescritivoDeEventos("Saldo Devedor em " + HelperDate.getInstance(this.getDataDeLiquidacao()).format(FORMATO_DATA));
        } else {
            descritivoDeEventos.append(ATE + HelperDate.getInstance(this.getDataDeLiquidacao()).format(FORMATO_DATA) + DATA_DOS_EVENTOS + eventosOcorridos + " e Saldo Devedor na mesma data referida.");
            creditoDoReclamante.setDescritivoDeEventos(descritivoDeEventos.toString());
        }
        creditoDoReclamante.salvar();
        custasJudiciaisDaAtualizacao.salvar();
        debitosDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
        debitosDoReclamante.salvar();
        outrosDebitosReclamado.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
        outrosDebitosReclamado.salvar();
        debitosCobrarDoReclamante.setCustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao);
        debitosCobrarDoReclamante.salvar();
        custasJudiciaisDaAtualizacao = new CustasJudiciaisDaAtualizacao(custasJudiciaisDaAtualizacao, Boolean.TRUE);
        if (custasJudiciaisDaAtualizacao.getValorPagoReclamante().compareTo(BigDecimal.ZERO) == 1) {
            custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.removerCustasReclamante(custasJudiciaisDaAtualizacao);
            custasJudiciaisDaAtualizacao.setJaPagoUmaVezReclamante(true);
        }
        if (custasJudiciaisDaAtualizacao.getValorPagoReclamado().compareTo(BigDecimal.ZERO) == 1) {
            custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao.removerCustasReclamado(custasJudiciaisDaAtualizacao);
            custasJudiciaisDaAtualizacao.setJaPagoUmaVezReclamado(true);
        }
        if (!custasJudiciaisDaAtualizacao.getHouvePagamentoDaBase().booleanValue() && (creditoDoReclamante.getTotalPago().compareTo(BigDecimal.ZERO) == 1 || outrosDebitosReclamado.getTotalPago().compareTo(BigDecimal.ZERO) == 1 && BaseParaCustasCalculadasEnum.BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO.equals((Object)custasJudiciaisDaAtualizacao.getBaseParaCustasCalculadas()))) {
            custasJudiciaisDaAtualizacao.setHouvePagamentoDaBase(Boolean.TRUE);
        }
        custasJudiciaisDaAtualizacao.limparPagamentos();
        this.verificarPagamentoDeBaseDeMultasEHonorariosCalculadosEPensao(creditoDoReclamante, debitosDoReclamante, outrosDebitosReclamado, debitosCobrarDoReclamante);
        if (StringUtils.isBlank((String)eventosOcorridosResumo.toString())) {
            this.setDescritivoDeEventosResumo("N\u00e3o houve eventos no per\u00edodo compreendido entre a data de liquida\u00e7\u00e3o do c\u00e1lculo e a data de liquida\u00e7\u00e3o da atualiza\u00e7\u00e3o.");
        } else {
            descritivoDeEventosResumo.append((CharSequence)Utils.replaceLast(eventosOcorridosResumo, ";", "."));
            this.setDescritivoDeEventosResumo(descritivoDeEventosResumo.toString());
        }
        this.getCalculo().setVersao(this.getCalculo().getVersao() + 1L);
        this.setHashCodeLiquidacao(this.calcularHashCodeDaAtualizacao());
        this.getCalculo().setHashCodeLiquidacao(this.getCalculo().calcularHashCodeDaLiquidacao());
        this.salvar();
    }

    private void verificarPagamentoDeBaseDeMultasEHonorariosCalculadosEPensao(CreditosDoReclamante creditoDoReclamante, DebitosDoReclamante debitosDoReclamante, OutrosDebitosReclamado outrosDebitosReclamado, DebitosCobrarDoReclamante debitosCobrarDoReclamante) {
        Boolean houvePagamentoBaseMulta = Boolean.FALSE;
        Boolean houvePagamentoBaseHonorario = Boolean.FALSE;
        if (BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoPrincipal()) < 0 || BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoJuroDeMoraPrincipal()) < 0 || BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoJuroDeMoraPrincipalPeriodoAtual()) < 0 || BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoFgts()) < 0 || BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoJuroDeMoraFgts()) < 0 || BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoJuroDeMoraFgtsPeriodoAtual()) < 0) {
            houvePagamentoBaseMulta = Boolean.TRUE;
            houvePagamentoBaseHonorario = Boolean.TRUE;
        } else if (BigDecimal.ZERO.compareTo(creditoDoReclamante.getTotalPago()) < 0) {
            houvePagamentoBaseHonorario = Boolean.TRUE;
        }
        if (!this.baseMultaJaPaga.booleanValue() && houvePagamentoBaseMulta.booleanValue()) {
            this.baseMultaJaPaga = Boolean.TRUE;
            for (MultaDaAtualizacao multaAnterior : creditoDoReclamante.getMultasCalculadas()) {
                multaAnterior.setJaCalculadoUmaVez(Boolean.TRUE);
            }
            for (MultaDaAtualizacao multaAnterior : debitosDoReclamante.getMultasCalculadas()) {
                multaAnterior.setJaCalculadoUmaVez(Boolean.TRUE);
            }
            for (MultaDaAtualizacao multaAnterior : outrosDebitosReclamado.getMultasCalculadas()) {
                multaAnterior.setJaCalculadoUmaVez(Boolean.TRUE);
            }
            for (MultaDaAtualizacao multaAnterior : debitosCobrarDoReclamante.getMultasCalculadas()) {
                multaAnterior.setJaCalculadoUmaVez(Boolean.TRUE);
            }
        }
        if (!this.baseHonorarioJaPaga.booleanValue() && houvePagamentoBaseHonorario.booleanValue()) {
            this.baseHonorarioJaPaga = Boolean.TRUE;
            for (HonorarioDaAtualizacao honorarioAnterior : debitosDoReclamante.getHonorariosDaAtualizacaoCalculado()) {
                if (TipoHonorarioEnum.SUCUMBENCIAIS.equals((Object)honorarioAnterior.getHonorario().getTipoHonorario()) && BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL.equals((Object)honorarioAnterior.getHonorario().getBaseParaApuracao())) continue;
                honorarioAnterior.setJaCalculadoUmaVez(Boolean.TRUE);
            }
            for (HonorarioDaAtualizacao honorarioAnterior : outrosDebitosReclamado.getHonorariosDaAtualizacaoCalculado()) {
                honorarioAnterior.setJaCalculadoUmaVez(Boolean.TRUE);
            }
            for (HonorarioDaAtualizacao honorarioAnterior : debitosCobrarDoReclamante.getHonorariosDaAtualizacaoCalculado()) {
                if (TipoHonorarioEnum.SUCUMBENCIAIS.equals((Object)honorarioAnterior.getHonorario().getTipoHonorario()) && BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL.equals((Object)honorarioAnterior.getHonorario().getBaseParaApuracao())) continue;
                honorarioAnterior.setJaCalculadoUmaVez(Boolean.TRUE);
            }
        }
        if (this.basePensaoJaPaga.booleanValue()) {
            return;
        }
        if (Utils.naoNulo(debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao()) && (BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoPrincipal()) < 0 || debitosDoReclamante.getCalculo().getFgts().getIncidenciaPensaoAlimenticia().booleanValue() && BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoFgts()) < 0 || debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getIncidirSobreJuros().booleanValue() && (BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoJuroDeMoraPrincipal()) < 0 || BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoJuroDeMoraPrincipalPeriodoAtual()) < 0) || debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getIncidirSobreJuros().booleanValue() && debitosDoReclamante.getCalculo().getFgts().getIncidenciaPensaoAlimenticia().booleanValue() && (BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoJuroDeMoraFgts()) < 0 || BigDecimal.ZERO.compareTo(creditoDoReclamante.getPagoJuroDeMoraFgtsPeriodoAtual()) < 0))) {
            this.basePensaoJaPaga = Boolean.TRUE;
            debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().setJaCalculadoUmaVez(Boolean.TRUE);
        }
    }

    private DebitosDoReclamante calcularValoresAteLiquidacaoCalculoDebitosDoReclamante(Date dataInicialTabela, Date dataFinalTabela, CreditosDoReclamante creditosDoReclamante) {
        DebitosDoReclamante debitosDoReclamante = new DebitosDoReclamante();
        BigDecimal valorFgtsCorrigido = BigDecimal.ZERO;
        BigDecimal jurosFgts = BigDecimal.ZERO;
        if (this.calculo.getFgts().isComporOPrincipal() && this.calculo.getFgts().getDestinoDoFgts().equals((Object)DestinoDoFgtsEnum.DEPOSITAR)) {
            if (!this.calculo.getFgts().getOcorrenciasVisiveisRelatorio().isEmpty()) {
                BigDecimal totalDaDiferenciaCorrigida = this.calculo.getFgts().getTotalDaDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDaDiferenciaCorrigida, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                valorFgtsCorrigido = valorFgtsCorrigido.add(totalDaDiferenciaCorrigida);
                jurosFgts = jurosFgts.add(this.calculo.getFgts().getTotalDeJurosDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
            }
            if (this.calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                BigDecimal totalDoDepositadoOuSacadoCorrigido = this.calculo.getFgts().getTotalDoDepositadoOuSacadoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDoDepositadoOuSacadoCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                valorFgtsCorrigido = valorFgtsCorrigido.add(totalDoDepositadoOuSacadoCorrigido);
                jurosFgts = jurosFgts.add(this.calculo.getFgts().getTotalDeJurosDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate());
            }
            if (this.calculo.getFgts().getMulta().booleanValue()) {
                BigDecimal valorDaMultaDoFgtsCorrigido = this.calculo.getFgts().getValorDaMultaDoFgtsCorrigido();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorDaMultaDoFgtsCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                valorFgtsCorrigido = valorFgtsCorrigido.add(valorDaMultaDoFgtsCorrigido);
                jurosFgts = jurosFgts.add(this.calculo.getFgts().getJurosDaMultaDoFgts() == null ? BigDecimal.ZERO : this.calculo.getFgts().getJurosDaMultaDoFgts());
            }
        }
        debitosDoReclamante.setValorDevidoCustasParaPrecatorio(this.calculo.getCustasJudiciais().getValorDeConhecimentoDoReclamante());
        debitosDoReclamante.setValorPagoCustasParaPrecatorio(BigDecimal.ZERO);
        debitosDoReclamante.setValorFgts(Utils.arredondarValor(valorFgtsCorrigido, 2));
        debitosDoReclamante.setJuroFgts(Utils.arredondarValor(jurosFgts, 2));
        debitosDoReclamante.setPagoFgts(BigDecimal.ZERO);
        debitosDoReclamante.setPagoJuroDeMoraFgts(BigDecimal.ZERO);
        debitosDoReclamante.setPagoJuroDeMoraFgtsPeriodoAtual(BigDecimal.ZERO);
        debitosDoReclamante.setAtualizacao(this);
        debitosDoReclamante.setDataInicialPeriodo(dataInicialTabela);
        debitosDoReclamante.setDataFinalPeriodo(dataFinalTabela);
        debitosDoReclamante.setIndiceDeCorrecao(BigDecimal.ONE);
        debitosDoReclamante.setIndiceDeCorrecaoPrevPrivada(BigDecimal.ONE);
        debitosDoReclamante.setIndiceDeCorrecaoFgts(BigDecimal.ONE);
        debitosDoReclamante.setTaxaDeJuros(BigDecimal.ZERO);
        debitosDoReclamante.setTaxaDeJurosFgts(BigDecimal.ZERO);
        if (this.calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue()) {
            debitosDoReclamante.setValorPrevidenciaPrivada(this.calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido());
        } else {
            debitosDoReclamante.setValorPrevidenciaPrivada(BigDecimal.ZERO);
        }
        boolean verbaComIncidenciaInss = false;
        for (VerbaDeCalculo verba : this.calculo.getVerbasAtivas()) {
            if (!verba.getIncidenciaINSS().booleanValue() || verba.getOcorrenciasAtivas().isEmpty()) continue;
            verbaComIncidenciaInss = true;
            break;
        }
        if (this.calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && this.calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue() && verbaComIncidenciaInss) {
            debitosDoReclamante.setValorDescontoInss(this.calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante());
        } else {
            debitosDoReclamante.setValorDescontoInss(BigDecimal.ZERO);
        }
        debitosDoReclamante.setPagoDescontoInss(BigDecimal.ZERO);
        debitosDoReclamante.setPagoPrevidenciaPrivada(BigDecimal.ZERO);
        for (Honorario honorario : this.calculo.getHonorariosDoCalculo()) {
            if (!TipoDeDevedorDoHonorarioEnum.RECLAMANTE.equals((Object)honorario.getTipoDeDevedor()) || !TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)honorario.getTipoCobrancaReclamante())) continue;
            HonorarioDaAtualizacao honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
            honorarioDaAtualizacao.setHonorario(honorario);
            honorarioDaAtualizacao.setJaCalculadoUmaVez(this.calculo.getAtualizacao().getAtualizarRegraPrecatorio());
            honorarioDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setTipoVinculo(TipoVinculoDeHonorarioDoPagamentoEnum.DEBITOSRECLAMANTE);
            if (TipoValorEnum.CALCULADO.equals((Object)honorario.getTipoValor()) && !this.getAtualizarRegraPrecatorio().booleanValue()) {
                honorarioDaAtualizacao.setTipoValor(TipoValorEnum.CALCULADO);
                honorarioDaAtualizacao.setValorHonorario(honorario.getBaseHonorario());
                debitosDoReclamante.getHonorariosDaAtualizacaoCalculado().add(honorarioDaAtualizacao);
                continue;
            }
            honorarioDaAtualizacao.setTipoValor(TipoValorEnum.INFORMADO);
            BigDecimal jurosHonorario = honorario.getJuros();
            if (this.getAtualizarRegraPrecatorio().booleanValue() && TipoValorEnum.CALCULADO.equals((Object)honorario.getTipoValor())) {
                BigDecimal jurosDoCalculo = BigDecimal.ZERO;
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getTotalDeJurosDaApuracaoDeJuros(), jurosDoCalculo);
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getFgts().getTotalDeJurosDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO), jurosDoCalculo);
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getFgts().getJurosDaMultaDoFgts(), jurosDoCalculo);
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getFgts().getJurosDaMultaDoArtigo467(), jurosDoCalculo);
                BigDecimal percentualJuros = honorario.getAliquota();
                jurosHonorario = Utils.aplicarTaxa(percentualJuros, jurosDoCalculo);
                if (TipoHonorarioEnum.SUCUMBENCIAIS.equals((Object)honorario.getTipoHonorario()) && BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL.equals((Object)honorario.getBaseParaApuracao())) {
                    jurosHonorario = BigDecimal.ZERO;
                }
            }
            BigDecimal valorHonorario = honorario.getValorCorrigido();
            if (this.getAtualizarRegraPrecatorio().booleanValue()) {
                valorHonorario = Utils.subtrair(valorHonorario, honorario.getValorImpostoRenda(), valorHonorario);
                valorHonorario = Utils.subtrair(valorHonorario, jurosHonorario, valorHonorario);
            }
            honorarioDaAtualizacao.setValorHonorario(valorHonorario);
            honorarioDaAtualizacao.setValorJuros(jurosHonorario);
            honorarioDaAtualizacao.setValorImpostoRenda(honorario.getValorImpostoRenda());
            debitosDoReclamante.getHonorariosDaAtualizacaoInformado().add(honorarioDaAtualizacao);
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) || !TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)multa.getTipoCobrancaReclamante())) continue;
            MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setJaCalculadoUmaVez(false);
            multaDaAtualizacao.setMulta(multa);
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            multaDaAtualizacao.setDebitosDoReclamante(debitosDoReclamante);
            multaDaAtualizacao.setTipoVinculo(CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE);
            if (TipoValorEnum.CALCULADO.equals((Object)multa.getTipoValorDaMulta())) {
                multaDaAtualizacao.setTipoValorDaMulta(TipoValorEnum.CALCULADO);
                multaDaAtualizacao.setValorMulta(multa.getBaseMulta());
                debitosDoReclamante.getMultasCalculadas().add(multaDaAtualizacao);
                continue;
            }
            multaDaAtualizacao.setTipoValorDaMulta(TipoValorEnum.INFORMADO);
            multaDaAtualizacao.setValorMulta(multa.getValorCorrigido());
            multaDaAtualizacao.setValorJuros(multa.getJuros());
            debitosDoReclamante.getMultasInformadas().add(multaDaAtualizacao);
        }
        PensaoAlimenticia pensaoAlimenticia = this.getCalculo().getPensaoAlimenticia();
        if (pensaoAlimenticia != null && pensaoAlimenticia.getApurarPensaoAlimenticia().booleanValue()) {
            PensaoAlimenticiaDaAtualizacao pensaoDaAtualizacao = new PensaoAlimenticiaDaAtualizacao();
            pensaoDaAtualizacao.setPensaoAlimenticia(pensaoAlimenticia);
            if (TipoOrigemRegistroEnum.ATUALIZACAO.equals((Object)pensaoAlimenticia.getOrigemRegistro())) {
                pensaoAlimenticia.liquidar();
            }
            pensaoDaAtualizacao.setPercentualPrincipal(pensaoDaAtualizacao.getPercentualPrincipalPensao(creditosDoReclamante));
            pensaoDaAtualizacao.setPercentualFgts(pensaoDaAtualizacao.getPercentualFgtsPensao(creditosDoReclamante, this.calculo));
            if (TipoOrigemRegistroEnum.CALCULO.equals((Object)pensaoAlimenticia.getOrigemRegistro())) {
                pensaoDaAtualizacao.setValorPensao(pensaoDaAtualizacao.getTotalPensao(creditosDoReclamante, this.calculo));
            }
            pensaoDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            pensaoDaAtualizacao.setPagoPensao(BigDecimal.ZERO);
            debitosDoReclamante.setPensaoAlimenticiaDaAtualizacao(pensaoDaAtualizacao);
        }
        debitosDoReclamante.setValorDevidoIrpf(this.getAtualizarRegraPrecatorio() != false ? this.calculo.getIrpf().getTotalValorDevido() : BigDecimal.ZERO);
        debitosDoReclamante.setValorPagoIrpf(BigDecimal.ZERO);
        this.preencherValoresAteLiquidacaoDebitosDoReclamanteParaCalculoExterno(debitosDoReclamante);
        debitosDoReclamante.setTotalDevido(debitosDoReclamante.calcularTotalDevido());
        debitosDoReclamante.setTotalPago(debitosDoReclamante.calcularTotalPago());
        debitosDoReclamante.setTotalDiferenca(debitosDoReclamante.calcularTotalDiferenca());
        return debitosDoReclamante;
    }

    private OutrosDebitosReclamado calcularValoresAteLiquidacaoCalculoOutrosDebitosReclamado(Date dataInicialTabela, Date dataFinalTabela) {
        OutrosDebitosReclamado outrosDebitosReclamado = new OutrosDebitosReclamado();
        outrosDebitosReclamado.setAtualizacao(this);
        outrosDebitosReclamado.setDataInicialPeriodo(dataInicialTabela);
        outrosDebitosReclamado.setDataFinalPeriodo(dataFinalTabela);
        outrosDebitosReclamado.setIndiceDeCorrecao(BigDecimal.ONE);
        outrosDebitosReclamado.setIndiceDeCorrecaoFgts(BigDecimal.ONE);
        outrosDebitosReclamado.setIndiceDeCorrecaoPrevPrivada(BigDecimal.ONE);
        outrosDebitosReclamado.setTaxaDeJuros(BigDecimal.ZERO);
        outrosDebitosReclamado.setValorPrevidenciaPrivada(this.calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido());
        boolean verbaComIncidenciaInss = false;
        for (VerbaDeCalculo verba : this.calculo.getVerbasAtivas()) {
            if (!verba.getIncidenciaINSS().booleanValue() || verba.getOcorrenciasAtivas().isEmpty()) continue;
            verbaComIncidenciaInss = true;
            break;
        }
        if (this.calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && this.calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue() && verbaComIncidenciaInss) {
            outrosDebitosReclamado.setValorDescontoInssDebitosReclamante(this.calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante());
        } else {
            outrosDebitosReclamado.setValorDescontoInssDebitosReclamante(BigDecimal.ZERO);
        }
        outrosDebitosReclamado.setValorDescontoInss(this.calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante());
        outrosDebitosReclamado.setValorJurosDePrevidenciaPrivada(this.calculo.getPrevidenciaPrivada().getTotalDeJuros());
        outrosDebitosReclamado.setValorPagoJurosDePrevidenciaPrivada(BigDecimal.ZERO);
        outrosDebitosReclamado.setValorPagoJurosDePrevidenciaPrivadaPeriodoAtual(BigDecimal.ZERO);
        for (Honorario honorario : this.calculo.getHonorariosDoCalculo()) {
            if (!TipoDeDevedorDoHonorarioEnum.RECLAMADO.equals((Object)honorario.getTipoDeDevedor())) continue;
            HonorarioDaAtualizacao honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setOutrosDebitosReclamado(outrosDebitosReclamado);
            honorarioDaAtualizacao.setHonorario(honorario);
            honorarioDaAtualizacao.setJaCalculadoUmaVez(this.calculo.getAtualizacao().getAtualizarRegraPrecatorio());
            honorarioDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setTipoVinculo(TipoVinculoDeHonorarioDoPagamentoEnum.OUTROSDEBITOSRECLAMADO);
            if (TipoValorEnum.CALCULADO.equals((Object)honorario.getTipoValor()) && !this.getAtualizarRegraPrecatorio().booleanValue()) {
                honorarioDaAtualizacao.setTipoValor(TipoValorEnum.CALCULADO);
                honorarioDaAtualizacao.setValorHonorario(honorario.getBaseHonorario());
                outrosDebitosReclamado.getHonorariosDaAtualizacaoCalculado().add(honorarioDaAtualizacao);
                continue;
            }
            honorarioDaAtualizacao.setTipoValor(TipoValorEnum.INFORMADO);
            BigDecimal jurosHonorario = honorario.getJuros();
            if (this.getAtualizarRegraPrecatorio().booleanValue() && TipoValorEnum.CALCULADO.equals((Object)honorario.getTipoValor())) {
                BigDecimal jurosDoCalculo = BigDecimal.ZERO;
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getTotalDeJurosDaApuracaoDeJuros(), jurosDoCalculo);
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getFgts().getTotalDeJurosDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO), jurosDoCalculo);
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getFgts().getJurosDaMultaDoFgts(), jurosDoCalculo);
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getFgts().getJurosDaMultaDoArtigo467(), jurosDoCalculo);
                BigDecimal percentualJuros = honorario.getAliquota();
                jurosHonorario = Utils.aplicarTaxa(percentualJuros, jurosDoCalculo);
            }
            BigDecimal valorHonorario = honorario.getValorCorrigido();
            if (this.getAtualizarRegraPrecatorio().booleanValue()) {
                valorHonorario = Utils.subtrair(valorHonorario, honorario.getValorImpostoRenda(), valorHonorario);
                valorHonorario = Utils.subtrair(valorHonorario, jurosHonorario, valorHonorario);
            }
            honorarioDaAtualizacao.setValorHonorario(valorHonorario);
            honorarioDaAtualizacao.setValorJuros(jurosHonorario);
            honorarioDaAtualizacao.setValorImpostoRenda(honorario.getValorImpostoRenda());
            outrosDebitosReclamado.getHonorariosDaAtualizacaoInformado().add(honorarioDaAtualizacao);
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) continue;
            MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setJaCalculadoUmaVez(false);
            multaDaAtualizacao.setMulta(multa);
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            multaDaAtualizacao.setOutrosDebitosReclamado(outrosDebitosReclamado);
            multaDaAtualizacao.setTipoVinculo(CredorDevedorMultaEnum.TERCEIRO_RECLAMADO);
            if (multa.getTipoValorDaMulta() == TipoValorEnum.CALCULADO) {
                multaDaAtualizacao.setTipoValorDaMulta(TipoValorEnum.CALCULADO);
                multaDaAtualizacao.setValorMulta(multa.getBaseMulta());
                outrosDebitosReclamado.getMultasCalculadas().add(multaDaAtualizacao);
                continue;
            }
            multaDaAtualizacao.setTipoValorDaMulta(TipoValorEnum.INFORMADO);
            multaDaAtualizacao.setValorMulta(multa.getValorCorrigido());
            multaDaAtualizacao.setValorJuros(multa.getJuros());
            outrosDebitosReclamado.getMultasInformadas().add(multaDaAtualizacao);
        }
        if (Boolean.TRUE.equals(this.calculo.getFgts().getMulta10())) {
            outrosDebitosReclamado.setValorInssDez(this.calculo.getFgts().getTotalDaMulta10Corrigida());
        } else {
            outrosDebitosReclamado.setValorInssDez(BigDecimal.ZERO);
        }
        if (Boolean.TRUE.equals(this.calculo.getFgts().getContribuicaoSocial05())) {
            outrosDebitosReclamado.setValorInssMeio(this.calculo.getFgts().getTotalDaContribuicaoSocial05());
        } else {
            outrosDebitosReclamado.setValorInssMeio(BigDecimal.ZERO);
        }
        outrosDebitosReclamado.setValorPagoInssDez(BigDecimal.ZERO);
        outrosDebitosReclamado.setValorPagoInssMeio(BigDecimal.ZERO);
        BigDecimal valorContribuicaoSocialSalariosDevidos = BigDecimal.ZERO;
        if (!this.calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
            if (Boolean.TRUE.equals(this.calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado())) {
                valorContribuicaoSocialSalariosDevidos = this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSegurado();
            }
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssEmpresa(), valorContribuicaoSocialSalariosDevidos);
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSAT(), valorContribuicaoSocialSalariosDevidos);
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssTerceiros(), valorContribuicaoSocialSalariosDevidos);
        }
        outrosDebitosReclamado.setValorDevidoInssSalariosDevidosParaPrecatorio(Utils.subtrair(valorContribuicaoSocialSalariosDevidos, outrosDebitosReclamado.getValorDescontoInss(), valorContribuicaoSocialSalariosDevidos));
        BigDecimal valorContribuicaoSocialSalariosPagos = BigDecimal.ZERO;
        if (Boolean.TRUE.equals(this.calculo.getInss().getApurarInssSobreSalariosPagos()) && !this.calculo.getInss().getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos().isEmpty()) {
            valorContribuicaoSocialSalariosPagos = this.calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssSegurado();
            valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, this.calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssEmpresa(), valorContribuicaoSocialSalariosPagos);
            valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, this.calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssSAT(), valorContribuicaoSocialSalariosPagos);
            valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, this.calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssTerceiros(), valorContribuicaoSocialSalariosPagos);
        }
        outrosDebitosReclamado.setValorDevidoInssSalariosPagosParaPrecatorio(valorContribuicaoSocialSalariosPagos);
        outrosDebitosReclamado.setValorPagoInssSalariosDevidos(BigDecimal.ZERO);
        outrosDebitosReclamado.setValorPagoInssSalariosPagos(BigDecimal.ZERO);
        outrosDebitosReclamado.setValorDevidoIrpf(this.getAtualizarRegraPrecatorio() != false && this.getCalculo().getIrpf().getCobrarDoReclamado() != false ? this.calculo.getIrpf().getTotalValorDevido() : BigDecimal.ZERO);
        outrosDebitosReclamado.setValorPagoIrpf(BigDecimal.ZERO);
        outrosDebitosReclamado.setValorDevidoCustasParaPrecatorio(this.calculo.getCustasJudiciais().encontrarValorConsolidadoDoReclamado());
        outrosDebitosReclamado.setValorPagoCustasParaPrecatorio(BigDecimal.ZERO);
        this.preencherValoresAteLiquidacaoOutrosDebitosDoReclamadoParaCalculoExterno(outrosDebitosReclamado);
        outrosDebitosReclamado.setTotalDevido(outrosDebitosReclamado.calcularTotalDevido());
        outrosDebitosReclamado.setTotalPago(outrosDebitosReclamado.calcularTotalPago());
        outrosDebitosReclamado.setTotalDiferenca(outrosDebitosReclamado.calcularTotalDiferenca());
        return outrosDebitosReclamado;
    }

    private DebitosCobrarDoReclamante calcularValoresAteLiquidacaoCalculoDebitosCobrarDoReclamante(Date dataInicialTabela, Date dataFinalTabela) {
        DebitosCobrarDoReclamante debitosCobrarDoReclamante = new DebitosCobrarDoReclamante();
        debitosCobrarDoReclamante.setAtualizacao(this);
        debitosCobrarDoReclamante.setDataInicialPeriodo(dataInicialTabela);
        debitosCobrarDoReclamante.setDataFinalPeriodo(dataFinalTabela);
        debitosCobrarDoReclamante.setIndiceDeCorrecao(BigDecimal.ONE);
        debitosCobrarDoReclamante.setTaxaDeJuros(BigDecimal.ZERO);
        for (Honorario honorario : this.calculo.getHonorariosDoCalculo()) {
            if (!TipoDeDevedorDoHonorarioEnum.RECLAMANTE.equals((Object)honorario.getTipoDeDevedor()) || !TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorario.getTipoCobrancaReclamante())) continue;
            HonorarioDaAtualizacao honorarioDaAtualizacao = new HonorarioDaAtualizacao();
            honorarioDaAtualizacao.setDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
            honorarioDaAtualizacao.setHonorario(honorario);
            honorarioDaAtualizacao.setJaCalculadoUmaVez(this.calculo.getAtualizacao().getAtualizarRegraPrecatorio());
            honorarioDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
            honorarioDaAtualizacao.setPagoHonorario(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            honorarioDaAtualizacao.setPagoSobreMultas(BigDecimal.ZERO);
            honorarioDaAtualizacao.setTipoVinculo(TipoVinculoDeHonorarioDoPagamentoEnum.DEBITOSCOBRARRECLAMANTE);
            if (TipoValorEnum.CALCULADO.equals((Object)honorario.getTipoValor()) && !this.getAtualizarRegraPrecatorio().booleanValue()) {
                honorarioDaAtualizacao.setTipoValor(TipoValorEnum.CALCULADO);
                honorarioDaAtualizacao.setValorHonorario(honorario.getBaseHonorario());
                debitosCobrarDoReclamante.getHonorariosDaAtualizacaoCalculado().add(honorarioDaAtualizacao);
                continue;
            }
            honorarioDaAtualizacao.setTipoValor(TipoValorEnum.INFORMADO);
            BigDecimal jurosHonorario = honorario.getJuros();
            if (this.getAtualizarRegraPrecatorio().booleanValue() && TipoValorEnum.CALCULADO.equals((Object)honorario.getTipoValor())) {
                BigDecimal jurosDoCalculo = BigDecimal.ZERO;
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getTotalDeJurosDaApuracaoDeJuros(), jurosDoCalculo);
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getFgts().getTotalDeJurosDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO), jurosDoCalculo);
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getFgts().getJurosDaMultaDoFgts(), jurosDoCalculo);
                jurosDoCalculo = Utils.somar(jurosDoCalculo, this.calculo.getFgts().getJurosDaMultaDoArtigo467(), jurosDoCalculo);
                BigDecimal percentualJuros = honorario.getAliquota();
                jurosHonorario = Utils.aplicarTaxa(percentualJuros, jurosDoCalculo);
                if (TipoHonorarioEnum.SUCUMBENCIAIS.equals((Object)honorario.getTipoHonorario()) && BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL.equals((Object)honorario.getBaseParaApuracao())) {
                    jurosHonorario = BigDecimal.ZERO;
                }
            }
            BigDecimal valorHonorario = honorario.getValorCorrigido();
            if (this.getAtualizarRegraPrecatorio().booleanValue()) {
                valorHonorario = Utils.subtrair(valorHonorario, honorario.getValorImpostoRenda(), valorHonorario);
                valorHonorario = Utils.subtrair(valorHonorario, jurosHonorario, valorHonorario);
            }
            honorarioDaAtualizacao.setValorHonorario(valorHonorario);
            honorarioDaAtualizacao.setValorJuros(jurosHonorario);
            honorarioDaAtualizacao.setValorImpostoRenda(honorario.getValorImpostoRenda());
            debitosCobrarDoReclamante.getHonorariosDaAtualizacaoInformado().add(honorarioDaAtualizacao);
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) || !TipoCobrancaReclamanteEnum.COBRAR.equals((Object)multa.getTipoCobrancaReclamante())) continue;
            MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setJaCalculadoUmaVez(false);
            multaDaAtualizacao.setMulta(multa);
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            multaDaAtualizacao.setDebitosCobrarDoReclamante(debitosCobrarDoReclamante);
            multaDaAtualizacao.setTipoVinculo(CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE);
            if (TipoValorEnum.CALCULADO.equals((Object)multa.getTipoValorDaMulta())) {
                multaDaAtualizacao.setTipoValorDaMulta(TipoValorEnum.CALCULADO);
                multaDaAtualizacao.setValorMulta(multa.getBaseMulta());
                debitosCobrarDoReclamante.getMultasCalculadas().add(multaDaAtualizacao);
                continue;
            }
            multaDaAtualizacao.setTipoValorDaMulta(TipoValorEnum.INFORMADO);
            multaDaAtualizacao.setValorMulta(multa.getValorCorrigido());
            multaDaAtualizacao.setValorJuros(multa.getJuros());
            debitosCobrarDoReclamante.getMultasInformadas().add(multaDaAtualizacao);
        }
        this.preencherValoresAteLiquidacaoDebitosCobrarDoReclamanteParaCalculoExterno(debitosCobrarDoReclamante);
        debitosCobrarDoReclamante.setTotalDevido(debitosCobrarDoReclamante.calcularTotalDevido());
        debitosCobrarDoReclamante.setTotalPago(debitosCobrarDoReclamante.calcularTotalPago());
        debitosCobrarDoReclamante.setTotalDiferenca(debitosCobrarDoReclamante.calcularTotalDiferenca());
        return debitosCobrarDoReclamante;
    }

    private void preencherValoresAteLiquidacaoDebitosCobrarDoReclamanteParaCalculoExterno(DebitosCobrarDoReclamante debitosCobrarDoReclamante) {
        if (this.calculo.isCalculoExterno().booleanValue()) {
            TabelaDeJurosDoCalculo tabelaDeJuros;
            for (MultaDaAtualizacao multa : debitosCobrarDoReclamante.getMultasInformadas()) {
                multa.setValorJuros(multa.getMulta().getValorJurosCalcExterno());
                if (!multa.getMulta().getAplicarJurosSobreMulta().booleanValue() || !Utils.naoNulo(multa.getMulta().getDataApartirDeAplicarJuros()) || !HelperDate.dateBefore(multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento())) continue;
                tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento());
                multa.setTaxaJurosMulta(Utils.arredondarValor(tabelaDeJuros.calcularTaxaDeJurosPagamento(multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true), 4));
            }
            for (HonorarioDaAtualizacao honorario : debitosCobrarDoReclamante.getHonorariosDaAtualizacaoInformado()) {
                honorario.setValorJuros(honorario.getHonorario().getValorJurosCalcExterno());
                if (!honorario.getHonorario().getAplicarJuros().booleanValue() || !Utils.naoNulo(honorario.getHonorario().getDataApartirDeAplicarJuros()) || !HelperDate.dateBefore(honorario.getHonorario().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento())) continue;
                tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), honorario.getHonorario().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento());
                honorario.setTaxaJurosHonorario(Utils.arredondarValor(tabelaDeJuros.calcularTaxaDeJurosPagamento(honorario.getHonorario().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true), 4));
            }
        }
    }

    private CreditosDoReclamante calcularValoresAteLiquidacaoCalculoCreditosDoReclamante(Date dataInicialTabela, Date dataFinalTabela) {
        BigDecimal valorPrincipalCorrigido = BigDecimal.ZERO;
        BigDecimal jurosPrincipal = BigDecimal.ZERO;
        BigDecimal valorFgtsCorrigido = BigDecimal.ZERO;
        BigDecimal jurosFgts = BigDecimal.ZERO;
        List<VerbaDeCalculo> verbasAtivas = this.calculo.getVerbasParaLiquidacao();
        for (VerbaDeCalculo verba : verbasAtivas) {
            if (!LogicoEnum.SIM.equals((Object)verba.getComporPrincipal())) continue;
            BigDecimal valorTotalDiferencaCorrigida = verba.getValorTotalDiferencaCorrigida();
            this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorTotalDiferencaCorrigida, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
            if (verba.getIncidenciaIRPF().booleanValue()) {
                this.totalVerbasTributaveis = Utils.somar(this.totalVerbasTributaveis, verba.getValorTotalDiferencaCorrigidaParaCalculoDasIncidencias(), this.totalVerbasTributaveis);
            }
            if (verba.getIncidenciaINSS().booleanValue()) {
                this.totalVerbasRemuneratorias = Utils.somar(this.totalVerbasRemuneratorias, verba.getValorTotalDiferencaCorrigidaParaCalculoDasIncidencias(), this.totalVerbasRemuneratorias);
            }
            valorPrincipalCorrigido = valorPrincipalCorrigido.add(verba.getValorTotalDiferencaCorrigida());
            jurosPrincipal = jurosPrincipal.add(verba.getValorDeJuros());
        }
        if (this.calculo.getSalarioFamilia().getApurarSalarioFamilia().booleanValue() && this.calculo.getSalarioFamilia().isComporOPrincipal()) {
            BigDecimal totalDoDevidoCorrigido = this.calculo.getSalarioFamilia().getTotalDoDevidoCorrigido();
            this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDoDevidoCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
            valorPrincipalCorrigido = valorPrincipalCorrigido.add(totalDoDevidoCorrigido);
            jurosPrincipal = jurosPrincipal.add(this.calculo.getSalarioFamilia().getTotalDeJuros());
        }
        if (this.calculo.getSeguroDesemprego().getApurarSeguroDesemprego().booleanValue() && this.calculo.getSeguroDesemprego().isComporOPrincipal()) {
            BigDecimal valorDevidoCorrigido = this.calculo.getSeguroDesemprego().getValorDevidoCorrigido();
            this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorDevidoCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
            valorPrincipalCorrigido = valorPrincipalCorrigido.add(valorDevidoCorrigido);
            jurosPrincipal = Utils.somar(jurosPrincipal, this.calculo.getSeguroDesemprego().getJuros(), jurosPrincipal);
        }
        if (this.calculo.getFgts().isComporOPrincipal()) {
            if (!this.calculo.getFgts().getOcorrenciasVisiveisRelatorio().isEmpty()) {
                BigDecimal totalDaDiferenciaCorrigida = this.calculo.getFgts().getTotalDaDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDaDiferenciaCorrigida, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                valorFgtsCorrigido = valorFgtsCorrigido.add(totalDaDiferenciaCorrigida);
                jurosFgts = jurosFgts.add(this.calculo.getFgts().getTotalDeJurosDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
            }
            if (this.calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                BigDecimal totalDoDepositadoOuSacadoCorrigido = this.calculo.getFgts().getTotalDoDepositadoOuSacadoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDoDepositadoOuSacadoCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                valorFgtsCorrigido = valorFgtsCorrigido.add(totalDoDepositadoOuSacadoCorrigido);
                jurosFgts = jurosFgts.add(this.calculo.getFgts().getTotalDeJurosDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate());
            }
            if (this.calculo.getFgts().getMulta().booleanValue()) {
                BigDecimal valorDaMultaDoFgtsCorrigido = this.calculo.getFgts().getValorDaMultaDoFgtsCorrigido();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorDaMultaDoFgtsCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                valorFgtsCorrigido = valorFgtsCorrigido.add(valorDaMultaDoFgtsCorrigido);
                jurosFgts = jurosFgts.add(this.calculo.getFgts().getJurosDaMultaDoFgts() == null ? BigDecimal.ZERO : this.calculo.getFgts().getJurosDaMultaDoFgts());
            }
            if (this.calculo.getFgts().getMultaDoArtigo467().booleanValue()) {
                BigDecimal valorDaMultaDoArtigo467Corrigido = this.calculo.getFgts().getValorDaMultaDoArtigo467Corrigido();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorDaMultaDoArtigo467Corrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                valorPrincipalCorrigido = valorPrincipalCorrigido.add(valorDaMultaDoArtigo467Corrigido);
                jurosPrincipal = jurosPrincipal.add(this.calculo.getFgts().getJurosDaMultaDoArtigo467());
            }
        }
        CreditosDoReclamante creditoDoReclamanteCalculo = new CreditosDoReclamante();
        creditoDoReclamanteCalculo.setAtualizacao(this);
        creditoDoReclamanteCalculo.setDataInicialPeriodo(dataInicialTabela);
        creditoDoReclamanteCalculo.setDataFinalPeriodo(dataFinalTabela);
        creditoDoReclamanteCalculo.setIndiceDeCorrecao(BigDecimal.ONE);
        creditoDoReclamanteCalculo.setIndiceDeCorrecaoFgts(BigDecimal.ONE);
        creditoDoReclamanteCalculo.setIndiceDeCorrecaoPrevidenciaPrivada(BigDecimal.ONE);
        creditoDoReclamanteCalculo.setTaxaDeJuros(BigDecimal.ZERO);
        creditoDoReclamanteCalculo.setTaxaDeJurosFgts(BigDecimal.ZERO);
        creditoDoReclamanteCalculo.setValorPrincipal(Utils.arredondarValor(valorPrincipalCorrigido, 2));
        creditoDoReclamanteCalculo.setJuroPrincipal(Utils.arredondarValor(jurosPrincipal, 2));
        creditoDoReclamanteCalculo.setValorPrevidenciaPrivada(this.calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido());
        creditoDoReclamanteCalculo.setValorDescontoInss(this.calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante());
        creditoDoReclamanteCalculo.setPagoPrincipal(BigDecimal.ZERO);
        creditoDoReclamanteCalculo.setPagoJuroDeMoraPrincipal(BigDecimal.ZERO);
        creditoDoReclamanteCalculo.setPagoJuroDeMoraPrincipalPeriodoAtual(BigDecimal.ZERO);
        creditoDoReclamanteCalculo.setValorFgts(Utils.arredondarValor(valorFgtsCorrigido, 2));
        creditoDoReclamanteCalculo.setJuroFgts(Utils.arredondarValor(jurosFgts, 2));
        creditoDoReclamanteCalculo.setPagoFgts(BigDecimal.ZERO);
        creditoDoReclamanteCalculo.setPagoJuroDeMoraFgts(BigDecimal.ZERO);
        creditoDoReclamanteCalculo.setPagoJuroDeMoraFgtsPeriodoAtual(BigDecimal.ZERO);
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getTipoCredorDevedor()) && !CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor())) continue;
            MultaDaAtualizacao multaDaAtualizacao = new MultaDaAtualizacao();
            multaDaAtualizacao.setJaCalculadoUmaVez(false);
            multaDaAtualizacao.setMulta(multa);
            multaDaAtualizacao.setIndiceDeCorrecao(BigDecimal.ONE);
            multaDaAtualizacao.setPagamento(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuro(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoJuroPeriodoAtual(BigDecimal.ZERO);
            multaDaAtualizacao.setPagoMulta(BigDecimal.ZERO);
            multaDaAtualizacao.setCreditoDoReclamantePagamento(creditoDoReclamanteCalculo);
            if (CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) {
                multaDaAtualizacao.setTipoVinculo(CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO);
                if (multa.getTipoValorDaMulta() == TipoValorEnum.CALCULADO) {
                    multaDaAtualizacao.setTipoValorDaMulta(TipoValorEnum.CALCULADO);
                    multaDaAtualizacao.setValorMulta(multa.getBaseMulta());
                    creditoDoReclamanteCalculo.getMultasCalculadas().add(multaDaAtualizacao);
                } else {
                    multaDaAtualizacao.setTipoValorDaMulta(TipoValorEnum.INFORMADO);
                    multaDaAtualizacao.setValorMulta(multa.getValorCorrigido());
                    multaDaAtualizacao.setValorJuros(multa.getJuros());
                    creditoDoReclamanteCalculo.getMultasInformadas().add(multaDaAtualizacao);
                }
            }
            if (!CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor())) continue;
            multaDaAtualizacao.setTipoVinculo(CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE);
            if (multa.getTipoValorDaMulta() == TipoValorEnum.CALCULADO) {
                multaDaAtualizacao.setTipoValorDaMulta(TipoValorEnum.CALCULADO);
                multaDaAtualizacao.setValorMulta(multa.getBaseMulta().negate());
                creditoDoReclamanteCalculo.getMultasCalculadas().add(multaDaAtualizacao);
                continue;
            }
            multaDaAtualizacao.setTipoValorDaMulta(TipoValorEnum.INFORMADO);
            multaDaAtualizacao.setValorMulta(multa.getValorCorrigido().negate());
            multaDaAtualizacao.setValorJuros(multa.getJuros().negate());
            creditoDoReclamanteCalculo.getMultasInformadas().add(multaDaAtualizacao);
        }
        if (this.calculo.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            if (this.calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && this.calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue() && !this.calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
                creditoDoReclamanteCalculo.setValorPrincipal(Utils.subtrair(creditoDoReclamanteCalculo.getValorPrincipal(), this.calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante(), creditoDoReclamanteCalculo.getValorPrincipal()));
            }
            if (this.calculo.getIrpf().getApurarImpostoRenda().booleanValue() && Utils.naoNulo(this.calculo.getIrpf().getTotalValorDevido()) && !this.calculo.getIrpf().getCobrarDoReclamado().booleanValue()) {
                creditoDoReclamanteCalculo.setValorPrincipal(Utils.subtrair(creditoDoReclamanteCalculo.getValorPrincipal(), this.calculo.getIrpf().getTotalValorDevido(), creditoDoReclamanteCalculo.getValorPrincipal()));
            }
            if (BigDecimal.ZERO.compareTo(creditoDoReclamanteCalculo.getValorPrincipal()) > 0) {
                creditoDoReclamanteCalculo.setValorPrincipal(BigDecimal.ZERO);
            }
        }
        this.preencherValoresAteLiquidacaoCreditoReclamanteParaCalculoExterno(creditoDoReclamanteCalculo);
        creditoDoReclamanteCalculo.setTotalDevido(creditoDoReclamanteCalculo.calcularTotalDevido());
        creditoDoReclamanteCalculo.setTotalPago(creditoDoReclamanteCalculo.calcularTotalPago());
        creditoDoReclamanteCalculo.setTotalDiferenca(creditoDoReclamanteCalculo.calcularTotalDiferenca());
        return creditoDoReclamanteCalculo;
    }

    private void preencherValoresAteLiquidacaoCreditoReclamanteParaCalculoExterno(CreditosDoReclamante creditoDoReclamanteCalculo) {
        if (this.calculo.isCalculoExterno().booleanValue()) {
            ParcelasAtualizaveisCreditosReclamante parcelasExternoCreditoReclamante = ParcelasAtualizaveisCreditosReclamante.obterDoCalculo(this.calculo);
            BigDecimal principalTributavel = parcelasExternoCreditoReclamante.getValorParcelaVerbasTributavel();
            BigDecimal principalNaoTributavel = parcelasExternoCreditoReclamante.getValorParcelaVerbasNaoTributavel();
            if (Utils.nulo(principalTributavel) || BigDecimal.ZERO.compareTo(principalTributavel) == 0) {
                creditoDoReclamanteCalculo.setProporcaoPrincipalTributavel(BigDecimal.ZERO);
            } else {
                BigDecimal principalTotal = BigDecimal.ZERO;
                principalTotal = Utils.somar(principalTotal, principalTributavel, principalTotal);
                principalTotal = Utils.somar(principalTotal, principalNaoTributavel, principalTotal);
                creditoDoReclamanteCalculo.setProporcaoPrincipalTributavel(Utils.dividir(principalTributavel, principalTotal));
            }
            BigDecimal jurosTributaveis = parcelasExternoCreditoReclamante.getValorJurosVerbasTributavel();
            BigDecimal jurosNaoTributaveis = parcelasExternoCreditoReclamante.getValorJurosVerbasNaoTributavel();
            if (Utils.nulos(jurosTributaveis, jurosNaoTributaveis)) {
                creditoDoReclamanteCalculo.setJuroPrincipal(null);
                creditoDoReclamanteCalculo.setProporcaoJurosTributavel(BigDecimal.ZERO);
            } else {
                BigDecimal jurosTotalPrincipal = BigDecimal.ZERO;
                jurosTotalPrincipal = Utils.somar(jurosTotalPrincipal, jurosTributaveis, jurosTotalPrincipal);
                jurosTotalPrincipal = Utils.somar(jurosTotalPrincipal, jurosNaoTributaveis, jurosTotalPrincipal);
                creditoDoReclamanteCalculo.setJuroPrincipal(jurosTotalPrincipal);
                if (Utils.nulo(jurosTributaveis) || BigDecimal.ZERO.compareTo(jurosTributaveis) == 0) {
                    creditoDoReclamanteCalculo.setProporcaoJurosTributavel(BigDecimal.ZERO);
                } else {
                    creditoDoReclamanteCalculo.setProporcaoJurosTributavel(Utils.dividir(jurosTributaveis, jurosTotalPrincipal));
                }
            }
            BigDecimal jurosFGTS = parcelasExternoCreditoReclamante.getValorJurosFgts();
            BigDecimal jurosMultaFGTS = parcelasExternoCreditoReclamante.getValorJurosMultaFgts();
            BigDecimal jurosTotalFGTS = BigDecimal.ZERO;
            jurosTotalFGTS = Utils.somar(jurosTotalFGTS, jurosFGTS, jurosTotalFGTS);
            jurosTotalFGTS = Utils.somar(jurosTotalFGTS, jurosMultaFGTS, jurosTotalFGTS);
            creditoDoReclamanteCalculo.setJuroFgts(jurosTotalFGTS);
            for (MultaDaAtualizacao multa : creditoDoReclamanteCalculo.getMultasInformadas()) {
                multa.setValorJuros(multa.getMulta().getValorJurosCalcExterno());
                if (!multa.getMulta().getAplicarJurosSobreMulta().booleanValue() || !Utils.naoNulo(multa.getMulta().getDataApartirDeAplicarJuros()) || !HelperDate.dateBefore(multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento())) continue;
                TabelaDeJurosDoCalculo tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento());
                multa.setTaxaJurosMulta(Utils.arredondarValor(tabelaDeJuros.calcularTaxaDeJurosPagamento(multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true), 4));
            }
            ParcelasAtualizaveisDescontoCreditosReclamante parcelasExternoDebitosReclamante = ParcelasAtualizaveisDescontoCreditosReclamante.obterDoCalculo(this.calculo);
            creditoDoReclamanteCalculo.setValorDescontoInss(parcelasExternoDebitosReclamante.getValorParcelaContribSocialSegurado());
            creditoDoReclamanteCalculo.setValorPrevidenciaPrivada(parcelasExternoDebitosReclamante.getValorParcelaPrevidenciaPrivada());
        }
    }

    private void preencherValoresAteLiquidacaoDebitosDoReclamanteParaCalculoExterno(DebitosDoReclamante debitosDoReclamante) {
        if (this.calculo.isCalculoExterno().booleanValue()) {
            TabelaDeJurosDoCalculo tabelaDeJuros;
            ParcelasAtualizaveisDescontoCreditosReclamante parcelasExternoDebitosReclamante = ParcelasAtualizaveisDescontoCreditosReclamante.obterDoCalculo(this.calculo);
            debitosDoReclamante.setValorDescontoInss(parcelasExternoDebitosReclamante.getValorParcelaContribSocialSegurado());
            debitosDoReclamante.setValorPrevidenciaPrivada(parcelasExternoDebitosReclamante.getValorParcelaPrevidenciaPrivada());
            if (this.calculo.getFgts().getDestinoDoFgts().equals((Object)DestinoDoFgtsEnum.DEPOSITAR)) {
                ParcelasAtualizaveisCreditosReclamante parcelasExternoCreditoReclamante = ParcelasAtualizaveisCreditosReclamante.obterDoCalculo(this.calculo);
                BigDecimal jurosFGTS = parcelasExternoCreditoReclamante.getValorJurosFgts();
                BigDecimal jurosMultaFGTS = parcelasExternoCreditoReclamante.getValorJurosMultaFgts();
                BigDecimal jurosTotalFGTS = BigDecimal.ZERO;
                jurosTotalFGTS = Utils.somar(jurosTotalFGTS, jurosFGTS, jurosTotalFGTS);
                jurosTotalFGTS = Utils.somar(jurosTotalFGTS, jurosMultaFGTS, jurosTotalFGTS);
                debitosDoReclamante.setJuroFgts(jurosTotalFGTS);
            }
            for (MultaDaAtualizacao multa : debitosDoReclamante.getMultasInformadas()) {
                multa.setValorJuros(multa.getMulta().getValorJurosCalcExterno());
                if (!multa.getMulta().getAplicarJurosSobreMulta().booleanValue() || !Utils.naoNulo(multa.getMulta().getDataApartirDeAplicarJuros()) || !HelperDate.dateBefore(multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento())) continue;
                tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento());
                multa.setTaxaJurosMulta(Utils.arredondarValor(tabelaDeJuros.calcularTaxaDeJurosPagamento(multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true), 4));
            }
            for (HonorarioDaAtualizacao honorario : debitosDoReclamante.getHonorariosDaAtualizacaoInformado()) {
                honorario.setValorJuros(honorario.getHonorario().getValorJurosCalcExterno());
                if (!honorario.getHonorario().getAplicarJuros().booleanValue() || !Utils.naoNulo(honorario.getHonorario().getDataApartirDeAplicarJuros()) || !HelperDate.dateBefore(honorario.getHonorario().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento())) continue;
                tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), honorario.getHonorario().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento());
                honorario.setTaxaJurosHonorario(Utils.arredondarValor(tabelaDeJuros.calcularTaxaDeJurosPagamento(honorario.getHonorario().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true), 4));
            }
        }
    }

    private void preencherValoresAteLiquidacaoOutrosDebitosDoReclamadoParaCalculoExterno(OutrosDebitosReclamado outrosDebitosReclamado) {
        if (this.calculo.isCalculoExterno().booleanValue()) {
            TabelaDeJurosDoCalculo tabelaDeJuros;
            ParcelasAtualizaveisOutrosDebitosReclamado parcelasExternoOutrosDebitosReclamado = ParcelasAtualizaveisOutrosDebitosReclamado.obterDoCalculo(this.calculo);
            outrosDebitosReclamado.setValorInssDez(parcelasExternoOutrosDebitosReclamado.getValorParcelaContribSocial10());
            outrosDebitosReclamado.setValorInssMeio(parcelasExternoOutrosDebitosReclamado.getValorParcelaContribSocial05());
            outrosDebitosReclamado.setValorJurosDePrevidenciaPrivada(parcelasExternoOutrosDebitosReclamado.getValorJurosPrevidenciaPrivada());
            for (MultaDaAtualizacao multa : outrosDebitosReclamado.getMultasInformadas()) {
                multa.setValorJuros(multa.getMulta().getValorJurosCalcExterno());
                if (!multa.getMulta().getAplicarJurosSobreMulta().booleanValue() || !Utils.naoNulo(multa.getMulta().getDataApartirDeAplicarJuros()) || !HelperDate.dateBefore(multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento())) continue;
                tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento());
                multa.setTaxaJurosMulta(Utils.arredondarValor(tabelaDeJuros.calcularTaxaDeJurosPagamento(multa.getMulta().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true), 4));
            }
            for (HonorarioDaAtualizacao honorario : outrosDebitosReclamado.getHonorariosDaAtualizacaoInformado()) {
                honorario.setValorJuros(honorario.getHonorario().getValorJurosCalcExterno());
                if (!honorario.getHonorario().getAplicarJuros().booleanValue() || !Utils.naoNulo(honorario.getHonorario().getDataApartirDeAplicarJuros()) || !HelperDate.dateBefore(honorario.getHonorario().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento())) continue;
                tabelaDeJuros = new TabelaDeJurosDoCalculo(this.getCalculo(), honorario.getHonorario().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento());
                honorario.setTaxaJurosHonorario(Utils.arredondarValor(tabelaDeJuros.calcularTaxaDeJurosPagamento(honorario.getHonorario().getDataApartirDeAplicarJuros(), this.calculo.getDataAjuizamento(), JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, true), 4));
            }
        }
    }

    public String getDescricaoDeCustaFixaParaResumo(CustasFixasAtualizacao custasFixasAtualizacao) {
        if (custasFixasAtualizacao.getQtdeAgravosDeInstrumento() != null) {
            return " Custa Fixa de Agravo de Instrumento em " + HelperDate.getInstance(custasFixasAtualizacao.getDataEvento()).format(FORMATO_DATA) + ";";
        }
        if (custasFixasAtualizacao.getQtdeAgravosDePeticao() != null) {
            return " Custa Fixa de Agravo de Peti\u00e7\u00e3o em " + HelperDate.getInstance(custasFixasAtualizacao.getDataEvento()).format(FORMATO_DATA) + ";";
        }
        if (custasFixasAtualizacao.getQtdeEmbargosArrematacao() != null) {
            return " Custa Fixa de Embargo Arremata\u00e7\u00e3o em " + HelperDate.getInstance(custasFixasAtualizacao.getDataEvento()).format(FORMATO_DATA) + ";";
        }
        if (custasFixasAtualizacao.getQtdeEmbargosExecucao() != null) {
            return " Custa Fixa de Embargo Execu\u00e7\u00e3o em " + HelperDate.getInstance(custasFixasAtualizacao.getDataEvento()).format(FORMATO_DATA) + ";";
        }
        if (custasFixasAtualizacao.getQtdeEmbargosTerceiros() != null) {
            return " Custa Fixa de Embargo de Terceiros em " + HelperDate.getInstance(custasFixasAtualizacao.getDataEvento()).format(FORMATO_DATA) + ";";
        }
        if (custasFixasAtualizacao.getQtdeRecursoRevista() != null) {
            return " Custa Fixa de Recurso de Revista em " + HelperDate.getInstance(custasFixasAtualizacao.getDataEvento()).format(FORMATO_DATA) + ";";
        }
        if (custasFixasAtualizacao.getQtdeAtosUrbanos() != null) {
            return " Custa Fixa de Atos Urbanos em " + HelperDate.getInstance(custasFixasAtualizacao.getDataEvento()).format(FORMATO_DATA) + ";";
        }
        if (custasFixasAtualizacao.getQtdeAtosRurais() != null) {
            return " Custa Fixa de Atos Rurais em " + HelperDate.getInstance(custasFixasAtualizacao.getDataEvento()).format(FORMATO_DATA) + ";";
        }
        return " Custa Fixa de Impugna\u00e7\u00e3o Senten\u00e7a em " + HelperDate.getInstance(custasFixasAtualizacao.getDataEvento()).format(FORMATO_DATA) + ";";
    }

    private String calcularHashCodeDaAtualizacao() {
        return this.getCalculo().calcularHashCodeExpandidoDoCalculo();
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

    public Date getDataCriacao() {
        return this.dataCriacao;
    }

    public void setDataCriacao(Date dataCriacao) {
        this.dataCriacao = dataCriacao;
    }

    public Date getDataDeLiquidacao() {
        return this.dataDeLiquidacao;
    }

    public void setDataDeLiquidacao(Date dataDeLiquidacao) {
        this.dataDeLiquidacao = dataDeLiquidacao;
    }

    public String getHashCodeLiquidacao() {
        return this.hashCodeLiquidacao;
    }

    public void setHashCodeLiquidacao(String hashCodeLiquidacao) {
        this.hashCodeLiquidacao = hashCodeLiquidacao;
    }

    public Long getId() {
        return this.id;
    }

    public Boolean getCobrarEncargosIrpf() {
        return this.cobrarEncargosIrpf;
    }

    public void setCobrarEncargosIrpf(Boolean cobrarEncargosIrpf) {
        this.cobrarEncargosIrpf = cobrarEncargosIrpf;
    }

    public Boolean getAtualizarRegraPrecatorio() {
        return this.atualizarRegraPrecatorio;
    }

    public void setAtualizarRegraPrecatorio(Boolean atualizarRegraPrecatorio) {
        this.atualizarRegraPrecatorio = atualizarRegraPrecatorio;
    }

    public GrupoEsferaPrecatorioEnum getGrupoEsferaPrecatorio() {
        return this.grupoEsferaPrecatorio;
    }

    public void setGrupoEsferaPrecatorio(GrupoEsferaPrecatorioEnum grupoEsferaPrecatorio) {
        this.grupoEsferaPrecatorio = grupoEsferaPrecatorio;
    }

    public TipoPrecatorioEnum getTipoPrecatorio() {
        return this.tipoPrecatorio;
    }

    public void setTipoPrecatorio(TipoPrecatorioEnum tipoPrecatorio) {
        this.tipoPrecatorio = tipoPrecatorio;
    }

    public Date getDataInicioPeriodoDaGraca() {
        return this.dataInicioPeriodoDaGraca;
    }

    public void setDataInicioPeriodoDaGraca(Date dataInicioPeriodoDaGraca) {
        this.dataInicioPeriodoDaGraca = dataInicioPeriodoDaGraca;
    }

    public Date getDataFimPeriodoDaGraca() {
        return this.dataFimPeriodoDaGraca;
    }

    public void setDataFimPeriodoDaGraca(Date dataFimPeriodoDaGraca) {
        this.dataFimPeriodoDaGraca = dataFimPeriodoDaGraca;
    }

    public Date getDataInicioAplicarEC1362025() {
        return this.dataInicioAplicarEC1362025;
    }

    public void setDataInicioAplicarEC1362025(Date dataInicioAplicarEC1362025) {
        this.dataInicioAplicarEC1362025 = dataInicioAplicarEC1362025;
    }

    public String getIdentificacaoCalculoFolha() {
        return this.identificacaoCalculoFolha;
    }

    public void setIdentificacaoCalculoFolha(String identificacaoCalculoFolha) {
        this.identificacaoCalculoFolha = identificacaoCalculoFolha;
    }

    public String getDescritivoDeEventosResumo() {
        return this.descritivoDeEventosResumo;
    }

    public void setDescritivoDeEventosResumo(String descritivoDeEventosResumo) {
        this.descritivoDeEventosResumo = descritivoDeEventosResumo;
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
        Atualizacao other = (Atualizacao)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }

    public List<CreditosDoReclamante> getListaCreditosDoReclamante() {
        return this.listaCreditosDoReclamante;
    }

    public void setListaCreditosDoReclamante(List<CreditosDoReclamante> listaCreditosDoReclamante) {
        this.listaCreditosDoReclamante = listaCreditosDoReclamante;
    }

    public List<DebitosDoReclamante> getListaDebitosDoReclamado() {
        return this.listaDebitosDoReclamado;
    }

    public void setListaDebitosDoReclamado(List<DebitosDoReclamante> listaDebitosDoReclamado) {
        this.listaDebitosDoReclamado = listaDebitosDoReclamado;
    }

    public List<OutrosDebitosReclamado> getListaOutrosDebitosDoReclamado() {
        return this.listaOutrosDebitosDoReclamado;
    }

    public void setListaOutrosDebitosDoReclamado(List<OutrosDebitosReclamado> listaOutrosDebitosDoReclamado) {
        this.listaOutrosDebitosDoReclamado = listaOutrosDebitosDoReclamado;
    }

    public List<DebitosCobrarDoReclamante> getListaDebitosCobrarDoReclamante() {
        return this.listaDebitosCobrarDoReclamante;
    }

    public void setListaDebitosCobrarDoReclamante(List<DebitosCobrarDoReclamante> listaDebitosCobrarDoReclamante) {
        this.listaDebitosCobrarDoReclamante = listaDebitosCobrarDoReclamante;
    }

    public String getComentarios() {
        return this.comentarios;
    }

    public void setComentarios(String comentarios) {
        this.comentarios = StringUtils.isNotBlank((String)comentarios) ? comentarios.toUpperCase() : comentarios;
    }

    public String getVersaoDoSistema() {
        return this.versaoDoSistema;
    }

    public void setVersaoDoSistema(String versaoDoSistema) {
        this.versaoDoSistema = versaoDoSistema;
    }

    public Boolean getBaseMultaJaPaga() {
        return this.baseMultaJaPaga;
    }

    public Boolean getBaseHonorarioJaPaga() {
        return this.baseHonorarioJaPaga;
    }

    public Boolean getBasePensaoJaPaga() {
        return this.basePensaoJaPaga;
    }
}

