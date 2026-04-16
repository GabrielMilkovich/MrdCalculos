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
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDevedorDoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeImpostoDeRendaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDocumentoFiscalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.HonorarioVerbaDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.MaquinaDeCalculoDeHonorarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.RepositorioDeHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.regras.DataVencimentoHonorarioValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDoPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBHONORARIOCALCULO")
@SequenceGenerator(name="SQHONORARIOCALCULO", sequenceName="SQHONORARIOCALCULO", allocationSize=1)
@Name(value="honorario")
public class Honorario
extends EntidadeBase
implements EventoAtualizacao {
    private static final long serialVersionUID = -657544928153832154L;
    private static final int PRIORIDADE_ATUALIZACAO = 2;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQHONORARIOCALCULO")
    @Column(name="IIDHONORARIO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="SDSHONORARIO", columnDefinition="VARCHAR2(60)", unique=true)
    @Required
    private String descricao;
    @Column(name="STPHONORARIO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoHonorarioEnum")})
    @Required
    private TipoHonorarioEnum tipoHonorario = TipoHonorarioEnum.ADVOCATICIOS;
    @Column(name="STPDEVEDOR", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeDevedorDoHonorarioEnum")})
    @Required
    private TipoDeDevedorDoHonorarioEnum tipoDeDevedor;
    @Column(name="SNMCREDOR", columnDefinition="VARCHAR2(100)", unique=true)
    @Required
    private String nomeCredor;
    @Column(name="STPDOCFISCALCREDOR", columnDefinition="CHAR(4)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDocumentoFiscalEnum")})
    private TipoDocumentoFiscalEnum tipoDocumentoFiscalCredor = TipoDocumentoFiscalEnum.CPF;
    @Column(name="SNRDOCFISCALCREDOR", columnDefinition="VARCHAR2(14)")
    private String numeroDocumentoFiscalCredor;
    @Column(name="SFLAPURARIRRF", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarIRRF = Boolean.FALSE;
    @Column(name="STPIMPOSTORENDA", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeImpostoDeRendaEnum")})
    private TipoDeImpostoDeRendaEnum tipoImpostoRenda;
    @Column(name="STPVALOR", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValor = TipoValorEnum.CALCULADO;
    @Column(name="RVLHONORARIO", precision=38, scale=25)
    @Required(condition="bean.tipoValor.valor == 'I'")
    private BigDecimal valor;
    @Column(name="RVLJUROSCALCEXTERNO", precision=38, scale=25)
    private BigDecimal valorJurosCalcExterno;
    @Column(name="DDTVENCIMENTO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=DataVencimentoHonorarioValidRule.class)
    @Required(condition="bean.tipoValor.valor == 'I'")
    private Date dataVencimento;
    @Column(name="STPINDICECORRECAOHONORARIOS", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="OpcaoDeIndiceDeCorrecaoEnum")})
    private OpcaoDeIndiceDeCorrecaoEnum tipoDeIndiceDeCorrecao = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
    @Column(name="STPOUTROINDICECORRECAOSHONOR", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    @Required(condition="bean.tipoDeIndiceDeCorrecao.valor == 'UOI' && bean.tipoValor.valor == 'I'")
    private IndiceMonetarioEnum outroIndiceDeCorrecao;
    @Column(name="SFLJUROSHONORARIOS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarJuros = Boolean.FALSE;
    @Column(name="DDTAPARTIRDEAPLICARJUROS", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataApartirDeAplicarJuros;
    @Column(name="RVLALIQUOTA", precision=5, scale=2)
    @Required(condition="bean.tipoValor.valor == 'C'")
    private BigDecimal aliquota;
    @Column(name="STPBASEHONORARIO", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="BaseParaApuracaoDeHonorarioEnum")})
    @Required(condition="bean.tipoValor.valor == 'C'")
    private BaseParaApuracaoDeHonorarioEnum baseParaApuracao;
    @Column(name="RVLBASEHONORARIO", precision=38, scale=25)
    private BigDecimal baseHonorario;
    @Column(name="RVLINDICECORRECAOUTILIZADO", precision=38, scale=25)
    private BigDecimal indiceCorrecaoHonorario;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaJurosHonorario;
    @Column(name="RVLINICIALFAIXAIRPF", precision=19, scale=2)
    private BigDecimal valorInicialFaixaIrpf;
    @Column(name="RVLFINALFAIXAIRPF", precision=19, scale=2)
    private BigDecimal valorFinalFaixaIrpf;
    @Column(name="RVLALIQUOTAIRPF", precision=5, scale=2)
    private BigDecimal valorAliquotaIrpf;
    @Column(name="RVLDEDUCAOIRPF", precision=19, scale=2)
    private BigDecimal valorDeducaoIrpf;
    @Column(name="RVLDEVIDOIRPF", precision=38, scale=25)
    private BigDecimal valorImpostoRenda;
    @Column(name="SFLAPURARIRPFSOBREJUROS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarIRPFSobreJuros = Boolean.FALSE;
    @Column(name="SFLCOBRANCARECLAMANTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoCobrancaReclamanteEnum")})
    private TipoCobrancaReclamanteEnum tipoCobrancaReclamante = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
    @Column(name="SFLORIGEMREGISTRO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoOrigemRegistroEnum")})
    private TipoOrigemRegistroEnum origemRegistro = TipoOrigemRegistroEnum.CALCULO;
    @Column(name="DDTEVENTOATUALIZACAO")
    @Temporal(value=TemporalType.DATE)
    private Date dataEvento;
    @Column(name="IFOLHAEVENTO", columnDefinition="VARCHAR2(80)")
    private String folhaDoEvento;
    @Transient
    protected MaquinaDeCalculoDeHonorarios maquinaDeCalculoDeHonorarios;
    @OneToMany(mappedBy="honorario", cascade={CascadeType.ALL})
    private List<HonorarioVerbaDeCalculo> verbasSelecionadas = new ArrayList<HonorarioVerbaDeCalculo>();
    @Transient
    private List<VerbaDeCalculo> verbasQueNaoCompoemPrincipalSelecionadas = new ArrayList<VerbaDeCalculo>();

    public Honorario() {
        super(RepositorioDeHonorario.class);
        this.maquinaDeCalculoDeHonorarios = new MaquinaDeCalculoDeHonorarios(this);
        if (Utils.isVazio(this.descricao).booleanValue()) {
            this.descricao = this.tipoHonorario.getNome();
        }
    }

    public Honorario(Calculo calculo, ParcelasAtualizaveisHonorario paHonorario) {
        this();
        boolean isInformado = paHonorario.getTipoValor().equals((Object)TipoValorEnum.INFORMADO);
        boolean isCalculado = paHonorario.getTipoValor().equals((Object)TipoValorEnum.CALCULADO);
        boolean devedorEhReclamado = paHonorario.getOutrosDebitosReclamado() != null;
        boolean isIndiceTrabalhista = paHonorario.getIndiceTrabalhistaInformado() != null && paHonorario.getIndiceTrabalhistaInformado().equals((Object)IndiceMonetarioEnum.INDICE_TRABALHISTA);
        this.setAliquota(isCalculado ? paHonorario.getTaxaCalculado() : null);
        this.setAplicarJuros(isInformado ? paHonorario.getAplicarJurosInformado() : Boolean.FALSE);
        this.setDataApartirDeAplicarJuros(isInformado && this.getAplicarJuros() != false ? paHonorario.getDataApartirDeAplicarJurosInformado() : null);
        this.setApurarIRPFSobreJuros(paHonorario.getIncidirIrpfSobreJuros());
        this.setApurarIRRF(paHonorario.getApurarIrpf());
        this.setBaseHonorario(null);
        if (paHonorario.getTipoValor().equals((Object)TipoValorEnum.CALCULADO) && paHonorario.getAplicarDescontoContribSocialCalculado().booleanValue() && paHonorario.getAplicarDescontoPrevPrivadaCalculado().booleanValue()) {
            this.setBaseParaApuracao(BaseParaApuracaoDeHonorarioEnum.BRUTO_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA);
        } else if (paHonorario.getTipoValor().equals((Object)TipoValorEnum.CALCULADO) && paHonorario.getAplicarDescontoContribSocialCalculado().booleanValue()) {
            this.setBaseParaApuracao(BaseParaApuracaoDeHonorarioEnum.BRUTO_MENOS_CONTRIBUICAO_SOCIAL);
        } else if (paHonorario.getTipoValor().equals((Object)TipoValorEnum.CALCULADO)) {
            this.setBaseParaApuracao(BaseParaApuracaoDeHonorarioEnum.BRUTO);
        }
        this.setCalculo(calculo);
        this.setDataEvento(calculo.getDataDeLiquidacao());
        this.setDataVencimento(calculo.getDataDeLiquidacao());
        this.setDescricao(paHonorario.getDescricao());
        this.setFolhaDoEvento(null);
        this.setIndiceCorrecaoHonorario(null);
        this.setNomeCredor(paHonorario.getCredor());
        this.setNumeroDocumentoFiscalCredor(paHonorario.getNumeroDocFiscal());
        this.setOrigemRegistro(TipoOrigemRegistroEnum.CALCULO);
        this.setOutroIndiceDeCorrecao(paHonorario.getIndiceTrabalhistaInformado());
        this.setTaxaJurosHonorario(null);
        this.setTipoCobrancaReclamante(paHonorario.getTipoCobrancaReclamante());
        this.setTipoDeDevedor(devedorEhReclamado ? TipoDeDevedorDoHonorarioEnum.RECLAMADO : TipoDeDevedorDoHonorarioEnum.RECLAMANTE);
        this.setTipoDeIndiceDeCorrecao(isIndiceTrabalhista ? OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA : OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE);
        this.setTipoDocumentoFiscalCredor(paHonorario.getTipoDocFiscal());
        this.setTipoHonorario(paHonorario.getTipo());
        this.setTipoImpostoRenda(paHonorario.getTipoIrpf());
        this.setTipoValor(paHonorario.getTipoValor());
        this.setValor(paHonorario.getValorParcelaInformado());
        this.setValorAliquotaIrpf(null);
        this.setValorDeducaoIrpf(null);
        this.setValorFinalFaixaIrpf(null);
        this.setValorImpostoRenda(null);
        this.setValorInicialFaixaIrpf(null);
        this.setValorJurosCalcExterno(paHonorario.getValorJurosInformado());
        paHonorario.setHonorario(this);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public static List<Honorario> obterTodosPor(Calculo calculo) {
        return Honorario.getRepositorio(RepositorioDeHonorario.class).obterTodosPor(calculo);
    }

    public static List<Honorario> obterTodosParaAtualizacao(Calculo calculo) {
        return Honorario.getRepositorio(RepositorioDeHonorario.class).obterTodosParaAtualizacao(calculo);
    }

    public static List<Honorario> obterTodosParaCalculo(Calculo calculo) {
        return Honorario.getRepositorio(RepositorioDeHonorario.class).obterTodosParaCalculo(calculo);
    }

    public static List<HonorarioDoPagamento> obterPagamentos(Honorario honorario) {
        return Honorario.getRepositorio(RepositorioDeHonorario.class).obterPagamentosDo(honorario);
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

    public String getDescricao() {
        return this.descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public TipoDeDevedorDoHonorarioEnum getTipoDeDevedor() {
        return this.tipoDeDevedor;
    }

    public void setTipoDeDevedor(TipoDeDevedorDoHonorarioEnum tipoDeDevedor) {
        this.tipoDeDevedor = tipoDeDevedor;
    }

    public String getNomeCredor() {
        return this.nomeCredor;
    }

    public void setNomeCredor(String nomeCredor) {
        this.nomeCredor = nomeCredor;
    }

    public TipoDocumentoFiscalEnum getTipoDocumentoFiscalCredor() {
        return this.tipoDocumentoFiscalCredor;
    }

    public void setTipoDocumentoFiscalCredor(TipoDocumentoFiscalEnum tipoDocumentoFiscalCredor) {
        this.tipoDocumentoFiscalCredor = tipoDocumentoFiscalCredor;
    }

    public String getNumeroDocumentoFiscalCredor() {
        return this.numeroDocumentoFiscalCredor;
    }

    public void setNumeroDocumentoFiscalCredor(String numeroDocumentoFiscalCredor) {
        this.numeroDocumentoFiscalCredor = Utils.filtrarSomenteNumeros(numeroDocumentoFiscalCredor);
    }

    public Boolean getApurarIRRF() {
        return this.apurarIRRF;
    }

    public void setApurarIRRF(Boolean apurarIRRF) {
        this.apurarIRRF = apurarIRRF;
    }

    public TipoDeImpostoDeRendaEnum getTipoImpostoRenda() {
        return this.tipoImpostoRenda;
    }

    public void setTipoImpostoRenda(TipoDeImpostoDeRendaEnum tipoImpostoRenda) {
        this.tipoImpostoRenda = tipoImpostoRenda;
    }

    public TipoValorEnum getTipoValor() {
        return this.tipoValor;
    }

    public void setTipoValor(TipoValorEnum tipoValor) {
        this.tipoValor = tipoValor;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public Date getDataVencimento() {
        return this.dataVencimento;
    }

    public void setDataVencimento(Date dataVencimento) {
        this.dataVencimento = dataVencimento;
    }

    public OpcaoDeIndiceDeCorrecaoEnum getTipoDeIndiceDeCorrecao() {
        return this.tipoDeIndiceDeCorrecao;
    }

    public void setTipoDeIndiceDeCorrecao(OpcaoDeIndiceDeCorrecaoEnum tipoDeIndiceDeCorrecao) {
        this.tipoDeIndiceDeCorrecao = tipoDeIndiceDeCorrecao;
    }

    public IndiceMonetarioEnum getOutroIndiceDeCorrecao() {
        return this.outroIndiceDeCorrecao;
    }

    public void setOutroIndiceDeCorrecao(IndiceMonetarioEnum outroIndiceDeCorrecao) {
        this.outroIndiceDeCorrecao = outroIndiceDeCorrecao;
    }

    public Boolean getAplicarJuros() {
        return this.aplicarJuros;
    }

    public void setAplicarJuros(Boolean aplicarJuros) {
        this.aplicarJuros = aplicarJuros;
    }

    public BigDecimal getAliquota() {
        return this.aliquota;
    }

    public void setAliquota(BigDecimal aliquota) {
        this.aliquota = aliquota;
    }

    public BaseParaApuracaoDeHonorarioEnum getBaseParaApuracao() {
        return this.baseParaApuracao;
    }

    public void setBaseParaApuracao(BaseParaApuracaoDeHonorarioEnum baseParaApuracao) {
        this.baseParaApuracao = baseParaApuracao;
    }

    public BigDecimal getBaseHonorario() {
        return this.baseHonorario;
    }

    public void setBaseHonorario(BigDecimal baseHonorario) {
        this.baseHonorario = baseHonorario;
    }

    public BigDecimal getIndiceCorrecaoHonorario() {
        return this.indiceCorrecaoHonorario;
    }

    public void setIndiceCorrecaoHonorario(BigDecimal indiceCorrecaoHonorario) {
        this.indiceCorrecaoHonorario = indiceCorrecaoHonorario;
    }

    public BigDecimal getTaxaJurosHonorario() {
        return this.taxaJurosHonorario;
    }

    public void setTaxaJurosHonorario(BigDecimal taxaJurosHonorario) {
        this.taxaJurosHonorario = taxaJurosHonorario;
    }

    public BigDecimal getValorInicialFaixaIrpf() {
        return this.valorInicialFaixaIrpf;
    }

    public void setValorInicialFaixaIrpf(BigDecimal valorInicialFaixaIrpf) {
        this.valorInicialFaixaIrpf = valorInicialFaixaIrpf;
    }

    public BigDecimal getValorFinalFaixaIrpf() {
        return this.valorFinalFaixaIrpf;
    }

    public void setValorFinalFaixaIrpf(BigDecimal valorFinalFaixaIrpf) {
        this.valorFinalFaixaIrpf = valorFinalFaixaIrpf;
    }

    public BigDecimal getValorAliquotaIrpf() {
        return this.valorAliquotaIrpf;
    }

    public void setValorAliquotaIrpf(BigDecimal valorAliquotaIrpf) {
        this.valorAliquotaIrpf = valorAliquotaIrpf;
    }

    public BigDecimal getValorDeducaoIrpf() {
        return this.valorDeducaoIrpf;
    }

    public void setValorDeducaoIrpf(BigDecimal valorDeducaoIrpf) {
        this.valorDeducaoIrpf = valorDeducaoIrpf;
    }

    public void setValorImpostoRenda(BigDecimal valorImpostoRenda) {
        this.valorImpostoRenda = valorImpostoRenda;
    }

    public BigDecimal getValorImpostoRenda() {
        return this.valorImpostoRenda;
    }

    public BigDecimal getValorCorrigido() {
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoHonorario(), this.getValor(), this.getValor());
    }

    public Boolean getApurarIRPFSobreJuros() {
        return this.apurarIRPFSobreJuros;
    }

    public void setApurarIRPFSobreJuros(Boolean apurarIRPFSobreJuros) {
        this.apurarIRPFSobreJuros = apurarIRPFSobreJuros;
    }

    public TipoOrigemRegistroEnum getOrigemRegistro() {
        return this.origemRegistro;
    }

    public void setOrigemRegistro(TipoOrigemRegistroEnum origemRegistro) {
        this.origemRegistro = origemRegistro;
    }

    public BigDecimal getJuros() {
        if (Utils.nulo(this.getTaxaJurosHonorario())) {
            return null;
        }
        return Utils.aplicarJuros(this.getTaxaJurosHonorario(), this.getValorCorrigido());
    }

    public String getFolhaDoEvento() {
        return this.folhaDoEvento;
    }

    public void setFolhaDoEvento(String folhaDoEvento) {
        this.folhaDoEvento = folhaDoEvento;
    }

    public BigDecimal getValorTotal() {
        BigDecimal valorCorrigido = this.getValorCorrigido();
        if (Utils.naoNulo(valorCorrigido)) {
            return Utils.somar(valorCorrigido, this.getJuros(), valorCorrigido);
        }
        return null;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Honorario validar() {
        NegocioException excecao = new NegocioException();
        if (this.origemRegistro.equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) {
            if (Utils.nulo(this.dataEvento)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataEvento", Mensagens.MSG0003, "Data do Evento"));
            }
            if (Utils.naoNulos(this.getDataEvento(), this.getCalculo().getDataDeLiquidacao()) && HelperDate.dateBefore(this.getDataEvento(), this.getCalculo().getDataDeLiquidacao())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0127, Utils.formatarData(this.getCalculo().getDataDeLiquidacao())));
            }
            if (Utils.naoNulo(this.getDataEvento()) && HelperDate.dateAfter(this.getDataEvento(), new Date())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0128, new Object[0]));
            }
        }
        if (this.getApurarIRRF().booleanValue() && Utils.nulo((Object)this.tipoImpostoRenda)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("tipoDeImpostoDeRenda", Mensagens.MSG0003, "Tipo de Imposto de Renda"));
        }
        if (BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL.equals((Object)this.baseParaApuracao) && this.getVerbasSelecionadas().isEmpty()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0167, new Object[0]));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        GerenciadorDeValidadores.getInstance().validar(Honorario.class, this);
        return this;
    }

    public void validarDocumentoFiscal() {
        try {
            if (this.apurarIRRF.booleanValue() && Utils.nuloOuBranco(this.numeroDocumentoFiscalCredor)) {
                throw new NegocioException(new MensagemDeRecurso("numeroDocumentoFiscalCredor", Mensagens.MSG0003, "N\u00famero"));
            }
        }
        catch (Exception e) {
            throw new NegocioException(new MensagemDeRecurso("numeroDocumentoFiscalCredor", Mensagens.MSG0003, "N\u00famero"));
        }
    }

    @Override
    public void salvar() {
        this.consistirDados();
        this.validarDocumentoFiscal();
        this.validar();
        if (this.getId() != null) {
            Honorario.getRepositorio(RepositorioDeHonorario.class).removerVerbasNaoCompoemPrincipalAPartirDoHonorario(this);
        }
        super.salvar();
    }

    public void consistirDados() {
        if (TipoValorEnum.INFORMADO == this.tipoValor) {
            this.aliquota = null;
            this.baseParaApuracao = null;
            this.verbasSelecionadas = new ArrayList<HonorarioVerbaDeCalculo>();
        } else {
            this.valor = null;
            this.dataVencimento = null;
            this.outroIndiceDeCorrecao = null;
            this.dataApartirDeAplicarJuros = null;
        }
        if (TipoDeDevedorDoHonorarioEnum.RECLAMADO.equals((Object)this.getTipoDeDevedor())) {
            this.tipoCobrancaReclamante = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
        }
        if (!BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL.equals((Object)this.getBaseParaApuracao())) {
            this.verbasSelecionadas = new ArrayList<HonorarioVerbaDeCalculo>();
        }
        this.verbasSelecionadas = new ArrayList<HonorarioVerbaDeCalculo>();
        for (VerbaDeCalculo verbaDeCalculo : this.verbasQueNaoCompoemPrincipalSelecionadas) {
            this.verbasSelecionadas.add(new HonorarioVerbaDeCalculo(this, verbaDeCalculo));
        }
    }

    public static void remover(Honorario entidade) {
        Honorario.getRepositorio(RepositorioDeHonorario.class).removerHonorariosDaAtualizacao(entidade);
        Honorario.remover(RepositorioDeHonorario.class, entidade, true);
    }

    public void liquidar() {
        this.maquinaDeCalculoDeHonorarios.liquidar();
    }

    public Date getDataEvento() {
        return this.dataEvento;
    }

    public void setDataEvento(Date dataEvento) {
        this.dataEvento = dataEvento;
    }

    @Override
    public Integer getPrioridade() {
        return 2;
    }

    public TipoHonorarioEnum getTipoHonorario() {
        return this.tipoHonorario;
    }

    public void setTipoHonorario(TipoHonorarioEnum tipoHonorario) {
        this.tipoHonorario = tipoHonorario;
    }

    public List<HonorarioVerbaDeCalculo> getVerbasSelecionadas() {
        return this.verbasSelecionadas;
    }

    public void setVerbasSelecionadas(List<HonorarioVerbaDeCalculo> verbasSelecionadas) {
        this.verbasSelecionadas = verbasSelecionadas;
    }

    public TipoCobrancaReclamanteEnum getTipoCobrancaReclamante() {
        return this.tipoCobrancaReclamante;
    }

    public void setTipoCobrancaReclamante(TipoCobrancaReclamanteEnum tipoCobrancaReclamante) {
        this.tipoCobrancaReclamante = tipoCobrancaReclamante;
    }

    public List<VerbaDeCalculo> getVerbasQueNaoCompoemPrincipalSelecionadas() {
        return this.verbasQueNaoCompoemPrincipalSelecionadas;
    }

    public void setVerbasQueNaoCompoemPrincipalSelecionadas(List<VerbaDeCalculo> verbasQueNaoCompoemPrincipalSelecionadas) {
        this.verbasQueNaoCompoemPrincipalSelecionadas = verbasQueNaoCompoemPrincipalSelecionadas;
    }

    public static void removerDoCalculo(Calculo calculo) {
        Honorario.getRepositorio(RepositorioDeHonorario.class).removerHonorariosDoCalculo(calculo);
    }

    /*
     * WARNING - void declaration
     */
    public static void criarDeParcelasAtualizaveis(Calculo calculo, List<ParcelasAtualizaveisHonorario> paHonorarios) {
        Pagamento pagamentoParaVinculo;
        ArrayList<Honorario> honorarios = new ArrayList<Honorario>();
        HashMap<HonorarioDoPagamento, Honorario> pagamentosDoHonorario = new HashMap<HonorarioDoPagamento, Honorario>();
        HashMap<HonorarioDoPagamento, Pagamento> pagamentosParaVincular = new HashMap<HonorarioDoPagamento, Pagamento>();
        for (ParcelasAtualizaveisHonorario paHonorario : paHonorarios) {
            void var7_7;
            Object var7_8 = null;
            if (Utils.naoNulo(paHonorario.getHonorario()) && Utils.naoNulo(paHonorario.getHonorario().getId())) {
                List<HonorarioDoPagamento> list = Honorario.obterPagamentos(paHonorario.getHonorario());
            }
            Honorario honorario = new Honorario(calculo, paHonorario);
            if (Utils.naoNulo(var7_7)) {
                for (HonorarioDoPagamento pagamento : var7_7) {
                    HonorarioDoPagamento pagamentoNovo = new HonorarioDoPagamento(pagamento);
                    pagamentosDoHonorario.put(pagamentoNovo, honorario);
                    pagamentosParaVincular.put(pagamentoNovo, pagamento.getPagamento());
                }
            }
            honorarios.add(honorario);
        }
        ArrayList<Pagamento> pagamentosJaLimpos = new ArrayList<Pagamento>();
        for (HonorarioDoPagamento honorarioDoPagamento : pagamentosParaVincular.keySet()) {
            pagamentoParaVinculo = honorarioDoPagamento.getPagamento();
            if (pagamentosJaLimpos.contains(pagamentoParaVinculo)) continue;
            pagamentoParaVinculo.setDispararExcecoesNaValidacao(Boolean.FALSE);
            Honorario.atualizarVinculosDePagamentoDo(pagamentoParaVinculo);
            pagamentosJaLimpos.add(pagamentoParaVinculo);
        }
        Honorario.removerDoCalculo(calculo);
        Honorario.salvar(honorarios);
        for (Map.Entry entry : pagamentosDoHonorario.entrySet()) {
            ((HonorarioDoPagamento)entry.getKey()).setHonorario((Honorario)entry.getValue());
        }
        Pagamento.salvar(pagamentosJaLimpos);
        for (HonorarioDoPagamento honorarioDoPagamento : pagamentosParaVincular.keySet()) {
            pagamentoParaVinculo = honorarioDoPagamento.getPagamento();
            Honorario.inserirVinculoNoPagamento(pagamentoParaVinculo, honorarioDoPagamento);
        }
    }

    private static void inserirVinculoNoPagamento(Pagamento pagamentoParaVinculo, HonorarioDoPagamento pagamento) {
        switch (pagamento.getTipoVinculo()) {
            case DEBITOSRECLAMANTE: {
                pagamentoParaVinculo.getHonorariosBrutosDevidosReclamante().add(pagamento);
                break;
            }
            case OUTROSDEBITOSRECLAMADO: {
                pagamentoParaVinculo.getHonorariosBrutosDevidosReclamadoOutrosDebitos().add(pagamento);
                break;
            }
            case DEBITOSCOBRARRECLAMANTE: {
                pagamentoParaVinculo.getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante().add(pagamento);
            }
        }
        Pagamento.salvar(pagamentoParaVinculo);
    }

    private static void atualizarVinculosDePagamentoDo(Pagamento pagamentoParaVinculo) {
        ArrayList<HonorarioDoPagamento> honorariosParaRemover = new ArrayList<HonorarioDoPagamento>();
        for (HonorarioDoPagamento honorarioDoPagamento : pagamentoParaVinculo.getHonorariosBrutosDevidosReclamante()) {
            if (!TipoOrigemRegistroEnum.CALCULO.equals((Object)honorarioDoPagamento.getHonorario().getOrigemRegistro())) continue;
            honorariosParaRemover.add(honorarioDoPagamento);
        }
        for (HonorarioDoPagamento honorarioDoPagamento : honorariosParaRemover) {
            pagamentoParaVinculo.getHonorariosBrutosDevidosReclamante().remove(honorarioDoPagamento);
        }
        honorariosParaRemover.clear();
        for (HonorarioDoPagamento honorarioDoPagamento : pagamentoParaVinculo.getHonorariosBrutosDevidosReclamadoOutrosDebitos()) {
            if (!TipoOrigemRegistroEnum.CALCULO.equals((Object)honorarioDoPagamento.getHonorario().getOrigemRegistro())) continue;
            honorariosParaRemover.add(honorarioDoPagamento);
        }
        for (HonorarioDoPagamento honorarioDoPagamento : honorariosParaRemover) {
            pagamentoParaVinculo.getHonorariosBrutosDevidosReclamadoOutrosDebitos().remove(honorarioDoPagamento);
        }
        honorariosParaRemover.clear();
        for (HonorarioDoPagamento honorarioDoPagamento : pagamentoParaVinculo.getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante()) {
            if (!TipoOrigemRegistroEnum.CALCULO.equals((Object)honorarioDoPagamento.getHonorario().getOrigemRegistro())) continue;
            honorariosParaRemover.add(honorarioDoPagamento);
        }
        for (HonorarioDoPagamento honorarioDoPagamento : honorariosParaRemover) {
            pagamentoParaVinculo.getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante().remove(honorarioDoPagamento);
        }
    }

    public BigDecimal getValorJurosCalcExterno() {
        return this.valorJurosCalcExterno;
    }

    public void setValorJurosCalcExterno(BigDecimal valorJurosCalcExterno) {
        this.valorJurosCalcExterno = valorJurosCalcExterno;
    }

    public Date getDataApartirDeAplicarJuros() {
        return this.dataApartirDeAplicarJuros;
    }

    public void setDataApartirDeAplicarJuros(Date dataApartirDeAplicarJuros) {
        this.dataApartirDeAplicarJuros = dataApartirDeAplicarJuros;
    }
}

