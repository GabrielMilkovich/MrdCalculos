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
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAliquotaDoEmpregadorEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAliquotaDoSeguradoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.AliquotasDoEmpregadorPorPeriodo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.PeriodoDoINSSComOpcaoSimples;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.RepositorioDeInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.LegendaDaFormulaDoInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.MaquinaDeCalculoDoInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AtividadeEconomica;
import br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico.TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado.TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.justificativa.JustificativaIncidenciasUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
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
@Table(name="TBINSSCALCULO")
@SequenceGenerator(name="SQINSSCALCULO", sequenceName="SQINSSCALCULO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="inss")
public class Inss
extends EntidadeBase {
    private static final long serialVersionUID = 151913795891389166L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQINSSCALCULO")
    @Column(name="IIDINSSCALCULO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="STPALIQUOTAEMPREGADO", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeAliquotaDoSeguradoEnum")})
    private TipoDeAliquotaDoSeguradoEnum tipoAliquotaSegurado = TipoDeAliquotaDoSeguradoEnum.SEGURADO_EMPREGADO;
    @Column(name="RVLALIQUOTAEMPREGADOFIXA", precision=5, scale=2)
    private BigDecimal aliquotaSeguradoFixa;
    @Column(name="SFLLIMITARAOTETO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean limitarTeto = Boolean.TRUE;
    @Column(name="STPALIQUOTAEMPREGADOR", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeAliquotaDoEmpregadorEnum")})
    private TipoDeAliquotaDoEmpregadorEnum tipoAliquotaEmpregador = TipoDeAliquotaDoEmpregadorEnum.FIXA;
    @Column(name="RVLALIQUOTAEMPRESAFIXA", precision=5, scale=4)
    private BigDecimal aliquotaEmpresaFixa;
    @Column(name="RVLALIQUOTARATFIXA", precision=5, scale=4)
    private BigDecimal aliquotaRATFixa;
    @Column(name="RVLALIQUOTATERCEIROSFIXA", precision=5, scale=4)
    private BigDecimal aliquotaTerceirosFixa;
    @Column(name="SFLEMPRESAPORATIVIDADE", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarEmpresaPorAtividade = Boolean.FALSE;
    @Column(name="SFLRATPORATIVIDADE", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarRATPorAtividade = Boolean.FALSE;
    @Column(name="SFLTERCEIROSPORATIVIDADE", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarTerceirosPorAtividade = Boolean.FALSE;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="inss")
    @Fetch(value=FetchMode.SELECT)
    @OrderBy(value="dataInicioPeriodo")
    private List<AliquotasDoEmpregadorPorPeriodo> aliquotasPorPeriodos;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="inss")
    @Fetch(value=FetchMode.SELECT)
    @OrderBy(value="dataInicioSimples")
    private List<PeriodoDoINSSComOpcaoSimples> periodosComOpcaoSimples;
    @OneToOne
    @JoinColumn(name="IIDATIVIDADEECONOMICA")
    private AtividadeEconomica atividadeEconomica;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="inss")
    private InssSobreSalariosDevidos inssSobreSalariosDevidos;
    @OneToOne(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="inss")
    private InssSobreSalariosPagos inssSobreSalariosPagos;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARINSSSALARIOSPAGOS", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarInssSobreSalariosPagos = Boolean.FALSE;
    @Transient
    private MaquinaDeCalculoDoInss maquinaDeCalculoDoInss;
    @Transient
    protected LegendaDaFormulaDoInss legendaDaFormula;
    @Transient
    private Boolean existeApuracaoINSSTerceiros = null;
    @Transient
    private Boolean existeApuracaoINSSEmpresa = null;
    @Transient
    private Boolean existeApuracaoINSSSAT = null;

    public Inss() {
        super(RepositorioDeInss.class);
        this.aliquotasPorPeriodos = new ArrayList<AliquotasDoEmpregadorPorPeriodo>();
        this.periodosComOpcaoSimples = new ArrayList<PeriodoDoINSSComOpcaoSimples>();
        this.inssSobreSalariosDevidos = new InssSobreSalariosDevidos(this);
        this.inssSobreSalariosPagos = new InssSobreSalariosPagos(this);
        this.maquinaDeCalculoDoInss = new MaquinaDeCalculoDoInss(this);
    }

    public Inss(Calculo calculo) {
        this();
        this.calculo = calculo;
        this.sugerirValoresPadroes();
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

    public TipoDeAliquotaDoSeguradoEnum getTipoAliquotaSegurado() {
        return this.tipoAliquotaSegurado;
    }

    public void setTipoAliquotaSegurado(TipoDeAliquotaDoSeguradoEnum tipoAliquotaSegurado) {
        this.tipoAliquotaSegurado = tipoAliquotaSegurado;
    }

    public BigDecimal getAliquotaSeguradoFixa() {
        return this.aliquotaSeguradoFixa;
    }

    public void setAliquotaSeguradoFixa(BigDecimal aliquotaEmpregadoFixa) {
        this.aliquotaSeguradoFixa = aliquotaEmpregadoFixa;
    }

    public Boolean getLimitarTeto() {
        return this.limitarTeto;
    }

    public void setLimitarTeto(Boolean limitarTeto) {
        this.limitarTeto = limitarTeto;
    }

    public TipoDeAliquotaDoEmpregadorEnum getTipoAliquotaEmpregador() {
        return this.tipoAliquotaEmpregador;
    }

    public void setTipoAliquotaEmpregador(TipoDeAliquotaDoEmpregadorEnum tipoAliquotaEmpregador) {
        this.tipoAliquotaEmpregador = tipoAliquotaEmpregador;
    }

    public BigDecimal getAliquotaEmpresaFixa() {
        return this.aliquotaEmpresaFixa;
    }

    public void setAliquotaEmpresaFixa(BigDecimal aliquotaEmpresaFixa) {
        this.aliquotaEmpresaFixa = aliquotaEmpresaFixa;
    }

    public BigDecimal getAliquotaRATFixa() {
        return this.aliquotaRATFixa;
    }

    public void setAliquotaRATFixa(BigDecimal aliquotaRATFixa) {
        this.aliquotaRATFixa = aliquotaRATFixa;
    }

    public BigDecimal getAliquotaTerceirosFixa() {
        return this.aliquotaTerceirosFixa;
    }

    public void setAliquotaTerceirosFixa(BigDecimal aliquotaTerceirosFixa) {
        this.aliquotaTerceirosFixa = aliquotaTerceirosFixa;
    }

    public Boolean getApurarEmpresaPorAtividade() {
        return this.apurarEmpresaPorAtividade;
    }

    public void setApurarEmpresaPorAtividade(Boolean apurarEmpresaPorAtividade) {
        this.apurarEmpresaPorAtividade = apurarEmpresaPorAtividade;
    }

    public Boolean getApurarRATPorAtividade() {
        return this.apurarRATPorAtividade;
    }

    public void setApurarRATPorAtividade(Boolean apurarRATPorAtividade) {
        this.apurarRATPorAtividade = apurarRATPorAtividade;
    }

    public Boolean getApurarTerceirosPorAtividade() {
        return this.apurarTerceirosPorAtividade;
    }

    public void setApurarTerceirosPorAtividade(Boolean apurarTerceirosPorAtividade) {
        this.apurarTerceirosPorAtividade = apurarTerceirosPorAtividade;
    }

    public AtividadeEconomica getAtividadeEconomica() {
        return this.atividadeEconomica;
    }

    public void setAtividadeEconomica(AtividadeEconomica atividadeEconomica) {
        this.atividadeEconomica = atividadeEconomica;
    }

    public InssSobreSalariosDevidos getInssSobreSalariosDevidos() {
        return this.inssSobreSalariosDevidos;
    }

    public void setInssSobreSalariosDevidos(InssSobreSalariosDevidos inssSobreSalariosDevidos) {
        this.inssSobreSalariosDevidos = inssSobreSalariosDevidos;
    }

    public InssSobreSalariosPagos getInssSobreSalariosPagos() {
        return this.inssSobreSalariosPagos;
    }

    public void setInssSobreSalariosPagos(InssSobreSalariosPagos inssSobreSalariosPagos) {
        this.inssSobreSalariosPagos = inssSobreSalariosPagos;
    }

    public List<AliquotasDoEmpregadorPorPeriodo> getAliquotasPorPeriodos() {
        if (Utils.nulo(this.aliquotasPorPeriodos)) {
            this.aliquotasPorPeriodos = new ArrayList<AliquotasDoEmpregadorPorPeriodo>();
        }
        return this.aliquotasPorPeriodos;
    }

    public void setAliquotasPorPeriodos(List<AliquotasDoEmpregadorPorPeriodo> aliquotasPorPeriodos) {
        this.aliquotasPorPeriodos = aliquotasPorPeriodos;
    }

    public List<PeriodoDoINSSComOpcaoSimples> getPeriodosComOpcaoSimples() {
        if (Utils.nulo(this.periodosComOpcaoSimples)) {
            this.periodosComOpcaoSimples = new ArrayList<PeriodoDoINSSComOpcaoSimples>();
        }
        return this.periodosComOpcaoSimples;
    }

    public void setPeriodosComOpcaoSimples(List<PeriodoDoINSSComOpcaoSimples> periodosComOpcaoSimples) {
        this.periodosComOpcaoSimples = periodosComOpcaoSimples;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    private void sugerirValoresPadroes() {
        if (Utils.naoNulo(this.inssSobreSalariosPagos)) {
            this.inssSobreSalariosPagos.sugerirDatas();
        }
        if (Utils.naoNulo(this.inssSobreSalariosDevidos)) {
            this.inssSobreSalariosDevidos.sugerirDatas();
        }
        this.aliquotaEmpresaFixa = new BigDecimal("20.0000");
        this.aliquotaRATFixa = new BigDecimal("3.0000");
    }

    public void restaurarValoresPadroes() {
        this.limparOcorrencias();
        Inss.remover(this);
    }

    public void adicionar(AliquotasDoEmpregadorPorPeriodo aliquotasDoEmpregadorPorPeriodo) {
        aliquotasDoEmpregadorPorPeriodo.setInss(this);
        aliquotasDoEmpregadorPorPeriodo.validar();
        this.getAliquotasPorPeriodos().add(aliquotasDoEmpregadorPorPeriodo);
    }

    public void adicionar(PeriodoDoINSSComOpcaoSimples periodoDoINSSComOpcaoSimples) {
        periodoDoINSSComOpcaoSimples.setInss(this);
        periodoDoINSSComOpcaoSimples.validar();
        this.getPeriodosComOpcaoSimples().add(periodoDoINSSComOpcaoSimples);
    }

    public void consistirDados() {
        if (!this.isTipoAliquotaSeguradoFixa()) {
            this.limparDadosParaAliquotaSeguradoDiferenteDeFixa();
        }
        if (!this.isTipoAliquotaEmpregadorFixa()) {
            this.limparDadosParaAliquotaEmpregadorDiferenteDeFixa();
        }
        if (!this.isTipoAliquotaEmpregadorPorPeriodo()) {
            this.limparListaDeAliquotasPorPeriodos();
        }
        if (!this.isTipoAliquotaEmpregadorPorAtividade()) {
            this.limparDadosParaAliquotaEmpregadorDiferenteDePorAtividade();
        }
    }

    private void limparDadosParaAliquotaSeguradoDiferenteDeFixa() {
        this.setAliquotaSeguradoFixa(null);
        this.setLimitarTeto(Boolean.FALSE);
    }

    private void limparDadosParaAliquotaEmpregadorDiferenteDeFixa() {
        this.setAliquotaEmpresaFixa(null);
        this.setAliquotaRATFixa(null);
        this.setAliquotaTerceirosFixa(null);
    }

    private void limparListaDeAliquotasPorPeriodos() {
        Inss.getRepositorio(RepositorioDeInss.class).limparListaDeAliquotasPorPeriodos(this);
        this.getAliquotasPorPeriodos().clear();
    }

    private void limparDadosParaAliquotaEmpregadorDiferenteDePorAtividade() {
        this.setAtividadeEconomica(null);
        this.setApurarEmpresaPorAtividade(Boolean.FALSE);
        this.setApurarRATPorAtividade(Boolean.FALSE);
        this.setApurarTerceirosPorAtividade(Boolean.FALSE);
    }

    public Inss removerDeAliquotasPorPeriodos(AliquotasDoEmpregadorPorPeriodo aliquotasDoEmpregadorPorPeriodo) {
        return Inss.getRepositorio(RepositorioDeInss.class).removerDeAliquotasPorPeriodos(this, aliquotasDoEmpregadorPorPeriodo);
    }

    public Inss removerDePeriodosComOpcaoSimples(PeriodoDoINSSComOpcaoSimples periodoDoINSSComOpcaoSimples) {
        return Inss.getRepositorio(RepositorioDeInss.class).removerDePeriodosComOpcaoSimples(this, periodoDoINSSComOpcaoSimples);
    }

    public boolean isTipoAliquotaSeguradoFixa() {
        return TipoDeAliquotaDoSeguradoEnum.FIXA == this.tipoAliquotaSegurado;
    }

    public boolean isTipoAliquotaEmpregadorFixa() {
        return TipoDeAliquotaDoEmpregadorEnum.FIXA == this.tipoAliquotaEmpregador;
    }

    public boolean isTipoAliquotaEmpregadorPorAtividade() {
        return TipoDeAliquotaDoEmpregadorEnum.POR_ATIVIDADE_ECONOMICA == this.tipoAliquotaEmpregador;
    }

    public boolean isTipoAliquotaEmpregadorPorPeriodo() {
        return TipoDeAliquotaDoEmpregadorEnum.POR_PERIODO == this.tipoAliquotaEmpregador;
    }

    public Boolean getApurarInssSobreSalariosPagos() {
        return this.apurarInssSobreSalariosPagos;
    }

    public void setApurarInssSobreSalariosPagos(Boolean apurarInssSobreSalariosPagos) {
        this.apurarInssSobreSalariosPagos = apurarInssSobreSalariosPagos;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public void gerarOcorrencias() {
        Inss.getRepositorio(RepositorioDeInss.class).gerarOcorrencias(this);
    }

    public void gerarOcorrencias(boolean manterAlteracoes, boolean flush) {
        Inss.getRepositorio(RepositorioDeInss.class).gerarOcorrencias(this, manterAlteracoes, flush);
    }

    public List<OcorrenciaDeInssSobreSalariosPagos> getNovasOcorrenciasDeInssSobreSalariosPagos() {
        return Inss.getRepositorio(RepositorioDeInss.class).geraOcorrenciasSobreSalariosPagos(this);
    }

    public List<OcorrenciaDeInssSobreSalariosDevidos> getNovasOcorrenciasDeInssSobreSalariosDevidos() {
        return Inss.getRepositorio(RepositorioDeInss.class).geraOcorrenciasSobreSalariosDevidos(this);
    }

    public void limparOcorrencias() {
        this.limparOcorrencias(true);
    }

    public void limparOcorrenciasDeSalariosDevidos() {
        this.limparOcorrenciasDeSalariosDevidos(true);
    }

    public void limparOcorrenciasDeSalariosDevidos(boolean flush) {
        Inss.getRepositorio(RepositorioDeInss.class).limparOcorrenciasDeSalariosDevidos(this, flush);
    }

    public void limparOcorrenciasDeSalariosPagos() {
        this.limparOcorrenciasDeSalariosPagos(true);
    }

    public void limparOcorrenciasDeSalariosPagos(boolean flush) {
        Inss.getRepositorio(RepositorioDeInss.class).limparOcorrenciasDeSalariosPagos(this, flush);
    }

    public void limparOcorrencias(boolean flush) {
        Inss.getRepositorio(RepositorioDeInss.class).limparOcorrencias(this, flush);
    }

    @Override
    protected Inss validar() {
        this.consistirDados();
        NegocioException excecao = new NegocioException();
        if (this.isTipoAliquotaSeguradoFixa() && Utils.nulo(this.aliquotaSeguradoFixa)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "fixaInput", Mensagens.MSG0003, "Al\u00edquota Fixa (%)"));
        }
        if (this.isTipoAliquotaEmpregadorFixa() && Utils.nulo(this.aliquotaEmpresaFixa) && Utils.nulo(this.aliquotaRATFixa) && Utils.nulo(this.aliquotaTerceirosFixa)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0045, new Object[0]));
        }
        if (this.isTipoAliquotaEmpregadorPorAtividade()) {
            if (this.atividadeEconomica == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "atividadesEconomicas", Mensagens.MSG0003, "Atividade Econ\u00f4mica"));
            }
            if (!(this.apurarEmpresaPorAtividade.booleanValue() || this.apurarRATPorAtividade.booleanValue() || this.apurarTerceirosPorAtividade.booleanValue())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0046, new Object[0]));
            }
        }
        if (this.isTipoAliquotaEmpregadorPorPeriodo() && this.getAliquotasPorPeriodos().isEmpty()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0047, "Al\u00edquotas por Per\u00edodos"));
        }
        this.getInssSobreSalariosDevidos().validar(excecao);
        this.getInssSobreSalariosPagos().validar(excecao);
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public static Inss obter(long id) {
        return (Inss)Inss.obter(RepositorioDeInss.class, id);
    }

    public static void remover(Inss entidade) {
        Inss.getRepositorio(RepositorioDeInss.class).remover(entidade);
    }

    public TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch obterListaOtimizadaAliquotasSeguradoEmpregado() {
        return Inss.getRepositorio(RepositorioDeInss.class).populaListaAliquotasSeguradoEmpregado(this);
    }

    public TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch obterListaOtimizadaDeAliquotasEmpregadoDomestico() {
        return Inss.getRepositorio(RepositorioDeInss.class).populaListaAliquotasEmpregadoDomestico(this);
    }

    public void liquidarAtualizacao(Date dataEvento) {
        this.maquinaDeCalculoDoInss.liquidarAtualizacao(dataEvento);
    }

    public void liquidar(Date dataLiquidacao) {
        this.maquinaDeCalculoDoInss.liquidar(dataLiquidacao);
    }

    public void limparJuros() {
        if (Utils.naoNulos(this.getInssSobreSalariosDevidos(), this.getInssSobreSalariosDevidos().getOcorrencias()) && Utils.naoNulo(this.getInssSobreSalariosDevidos().getOcorrencias())) {
            for (OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDeInssSobreSalariosDevidos : this.getInssSobreSalariosDevidos().getOcorrencias()) {
                ocorrenciaDeInssSobreSalariosDevidos.setTaxaDeJuros(null);
            }
        }
        if (Utils.naoNulos(this.getInssSobreSalariosPagos(), this.getInssSobreSalariosPagos().getOcorrencias()) && Utils.naoNulo(this.getInssSobreSalariosPagos().getOcorrencias())) {
            for (OcorrenciaDeInssSobreSalariosPagos ocorrenciaDeInssSobreSalariosPagos : this.getInssSobreSalariosPagos().getOcorrencias()) {
                ocorrenciaDeInssSobreSalariosPagos.setTaxaDeJuros(null);
            }
        }
    }

    public void calcularJurosDosSalariosDevidos() {
        this.maquinaDeCalculoDoInss.calcularJurosDosSalariosDevidos();
    }

    public void calcularJurosDosSalariosPagos() {
        this.maquinaDeCalculoDoInss.calcularJurosDosSalariosPagos();
    }

    public boolean existemOcorrencias() {
        return this.getInssSobreSalariosDevidos().existemOcorrencias() || this.getInssSobreSalariosPagos().existemOcorrencias();
    }

    public LegendaDaFormulaDoInss getLegendaDaFormula() {
        if (Utils.nulo(this.legendaDaFormula)) {
            this.legendaDaFormula = new LegendaDaFormulaDoInss(this);
        }
        return this.legendaDaFormula;
    }

    public boolean existeApuracaoParaEmpresa() {
        if (Utils.naoNulo(this.existeApuracaoINSSEmpresa)) {
            return this.existeApuracaoINSSEmpresa;
        }
        switch (this.getTipoAliquotaEmpregador()) {
            case FIXA: {
                this.existeApuracaoINSSEmpresa = Utils.naoNulo(this.getAliquotaEmpresaFixa());
                break;
            }
            case POR_ATIVIDADE_ECONOMICA: {
                this.existeApuracaoINSSEmpresa = Utils.naoNulo(this.getAtividadeEconomica()) && this.getApurarEmpresaPorAtividade() != false;
                break;
            }
            case POR_PERIODO: {
                if (!this.getAliquotasPorPeriodos().isEmpty()) {
                    for (AliquotasDoEmpregadorPorPeriodo periodo : this.getAliquotasPorPeriodos()) {
                        if (!Utils.naoNulo(periodo.getAliquotaEmpresa())) continue;
                        this.existeApuracaoINSSEmpresa = Boolean.TRUE;
                        break;
                    }
                }
                if (!Utils.nulo(this.existeApuracaoINSSEmpresa)) break;
                this.existeApuracaoINSSEmpresa = Boolean.FALSE;
                break;
            }
            default: {
                this.existeApuracaoINSSEmpresa = Boolean.FALSE;
            }
        }
        return this.existeApuracaoINSSEmpresa;
    }

    public boolean existeApuracaoParaSAT() {
        if (Utils.naoNulo(this.existeApuracaoINSSSAT)) {
            return this.existeApuracaoINSSSAT;
        }
        switch (this.getTipoAliquotaEmpregador()) {
            case FIXA: {
                this.existeApuracaoINSSSAT = Utils.naoNulo(this.getAliquotaRATFixa());
                break;
            }
            case POR_ATIVIDADE_ECONOMICA: {
                this.existeApuracaoINSSSAT = this.getApurarRATPorAtividade();
                break;
            }
            case POR_PERIODO: {
                if (!this.getAliquotasPorPeriodos().isEmpty()) {
                    for (AliquotasDoEmpregadorPorPeriodo periodo : this.getAliquotasPorPeriodos()) {
                        if (!Utils.naoNulo(periodo.getAliquotaEmpresa()) && !Utils.naoNulo(periodo.getAliquotaRAT())) continue;
                        this.existeApuracaoINSSSAT = Boolean.TRUE;
                        break;
                    }
                }
                if (!Utils.nulo(this.existeApuracaoINSSSAT)) break;
                this.existeApuracaoINSSSAT = Boolean.FALSE;
                break;
            }
            default: {
                this.existeApuracaoINSSSAT = Boolean.FALSE;
            }
        }
        return this.existeApuracaoINSSSAT;
    }

    public Boolean existeApuracaoParaTerceiros() {
        if (Utils.naoNulo(this.existeApuracaoINSSTerceiros)) {
            return this.existeApuracaoINSSTerceiros;
        }
        switch (this.getTipoAliquotaEmpregador()) {
            case FIXA: {
                this.existeApuracaoINSSTerceiros = Utils.naoNulo(this.getAliquotaTerceirosFixa());
                break;
            }
            case POR_ATIVIDADE_ECONOMICA: {
                this.existeApuracaoINSSTerceiros = Utils.naoNulo(this.getAtividadeEconomica()) && this.getApurarTerceirosPorAtividade() != false;
                break;
            }
            case POR_PERIODO: {
                if (!this.getAliquotasPorPeriodos().isEmpty()) {
                    for (AliquotasDoEmpregadorPorPeriodo periodo : this.getAliquotasPorPeriodos()) {
                        if (!Utils.naoNulo(periodo.getAliquotaTerceiros())) continue;
                        this.existeApuracaoINSSTerceiros = Boolean.TRUE;
                        break;
                    }
                }
                if (!Utils.nulo(this.existeApuracaoINSSTerceiros)) break;
                this.existeApuracaoINSSTerceiros = Boolean.FALSE;
                break;
            }
            default: {
                this.existeApuracaoINSSTerceiros = Boolean.FALSE;
            }
        }
        return this.existeApuracaoINSSTerceiros;
    }

    public boolean existemDadosParaRelatorio() {
        if (Utils.nulo(this.getId())) {
            return false;
        }
        if (Utils.naoNulo(this.getInssSobreSalariosDevidos()) && Utils.naoNulo(this.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba()) && !this.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
            return true;
        }
        return this.getApurarInssSobreSalariosPagos() != false && Utils.naoNulo(this.getInssSobreSalariosPagos()) && Utils.naoNulo(this.getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos()) && !this.getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos().isEmpty();
    }

    public void copiarParametrosRegeracaoOcorrencias(Inss filtro) {
        this.setTipoAliquotaSegurado(filtro.getTipoAliquotaSegurado());
        if (TipoDeAliquotaDoSeguradoEnum.FIXA == filtro.getTipoAliquotaSegurado()) {
            this.setAliquotaSeguradoFixa(filtro.getAliquotaSeguradoFixa());
            this.setLimitarTeto(filtro.getLimitarTeto());
        }
        this.setTipoAliquotaEmpregador(filtro.getTipoAliquotaEmpregador());
        switch (filtro.getTipoAliquotaEmpregador()) {
            case POR_ATIVIDADE_ECONOMICA: {
                this.setAtividadeEconomica(filtro.getAtividadeEconomica());
                this.setApurarEmpresaPorAtividade(filtro.getApurarEmpresaPorAtividade());
                this.setApurarRATPorAtividade(filtro.getApurarRATPorAtividade());
                this.setApurarTerceirosPorAtividade(filtro.getApurarTerceirosPorAtividade());
                break;
            }
            case POR_PERIODO: {
                ArrayList<AliquotasDoEmpregadorPorPeriodo> aliquotasARemover = new ArrayList<AliquotasDoEmpregadorPorPeriodo>();
                for (AliquotasDoEmpregadorPorPeriodo aliquota : this.getAliquotasPorPeriodos()) {
                    if (filtro.getAliquotasPorPeriodos().contains(aliquota)) continue;
                    aliquotasARemover.add(aliquota);
                }
                for (AliquotasDoEmpregadorPorPeriodo aliquota : aliquotasARemover) {
                    this.removerDeAliquotasPorPeriodos(aliquota);
                }
                for (AliquotasDoEmpregadorPorPeriodo aliquota : filtro.getAliquotasPorPeriodos()) {
                    if (this.getAliquotasPorPeriodos().contains(aliquota)) continue;
                    this.getAliquotasPorPeriodos().add(aliquota);
                }
                break;
            }
            case FIXA: {
                this.setAliquotaEmpresaFixa(filtro.getAliquotaEmpresaFixa());
                this.setAliquotaRATFixa(filtro.getAliquotaRATFixa());
                this.setAliquotaTerceirosFixa(filtro.getAliquotaTerceirosFixa());
                break;
            }
        }
        this.getInssSobreSalariosDevidos().setDataInicioPeriodo(filtro.getInssSobreSalariosDevidos().getDataInicioPeriodo());
        this.getInssSobreSalariosDevidos().setDataTerminoPeriodo(filtro.getInssSobreSalariosDevidos().getDataTerminoPeriodo());
        this.getInssSobreSalariosPagos().setDataInicioPeriodo(filtro.getInssSobreSalariosPagos().getDataInicioPeriodo());
        this.getInssSobreSalariosPagos().setDataTerminoPeriodo(filtro.getInssSobreSalariosPagos().getDataTerminoPeriodo());
        ArrayList<PeriodoDoINSSComOpcaoSimples> periodosARemover = new ArrayList<PeriodoDoINSSComOpcaoSimples>();
        for (PeriodoDoINSSComOpcaoSimples periodo : this.getPeriodosComOpcaoSimples()) {
            if (filtro.getPeriodosComOpcaoSimples().contains(periodo)) continue;
            periodosARemover.add(periodo);
        }
        for (PeriodoDoINSSComOpcaoSimples periodo : periodosARemover) {
            this.removerDePeriodosComOpcaoSimples(periodo);
        }
        for (PeriodoDoINSSComOpcaoSimples periodo : filtro.getPeriodosComOpcaoSimples()) {
            if (this.getPeriodosComOpcaoSimples().contains(periodo)) continue;
            this.getPeriodosComOpcaoSimples().add(periodo);
        }
    }

    public void aplicarPagamento(Pagamento pagamento, DebitosDoReclamante debitosDoReclamante, OutrosDebitosReclamado outrosDebitosDoReclamado) {
        this.maquinaDeCalculoDoInss.aplicarPagamento(this, pagamento, debitosDoReclamante, outrosDebitosDoReclamado);
    }

    public String getTextoCriterioAliquotaEmpresa() {
        return JustificativaIncidenciasUtils.prepararCriterioAliquotaEmpresa(this);
    }
}

