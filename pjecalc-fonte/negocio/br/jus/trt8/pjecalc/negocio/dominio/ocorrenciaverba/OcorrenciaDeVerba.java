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
 *  javax.persistence.OneToOne
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
package br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoIntegralizar;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.comum.validators.Min;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ValorDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.RepositorioDeOcorrenciaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
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
@Table(name="TBOCORRENCIAVERBA")
@SequenceGenerator(name="SQOCORRENCIAVERBA", sequenceName="SQOCORRENCIAVERBA", allocationSize=1)
@Name(value="ocorrenciaVerba")
public class OcorrenciaDeVerba
extends EntidadeBase
implements Serializable,
Comparable<OcorrenciaDeVerba> {
    private static final long serialVersionUID = 7767225325027175992L;
    public static final int ATRIBUTO_QUANTIDADE = 1;
    public static final int ATRIBUTO_PAGO = 2;
    public static final int ATRIBUTO_DEVIDO = 3;
    private static final BigDecimal FATOR_ABONO_PADRAO = new BigDecimal("1.5");
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAVERBA")
    @Column(name="IIDOCORRENCIAVERBA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="DDTINICIAL")
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataInicial;
    @Column(name="DDTFINAL")
    @Temporal(value=TemporalType.DATE)
    private Date dataFinal;
    @Column(name="RVLDIVISOR", precision=38, scale=25)
    @Min(value="0.01")
    private BigDecimal divisor;
    @Column(name="RVLMULTIPLICADOR", precision=19, scale=8)
    private BigDecimal multiplicador;
    @Column(name="RVLQUANTIDADE", precision=38, scale=25)
    private BigDecimal quantidade;
    @Column(name="RVLQUANTIDADEINTEGRAL", precision=38, scale=25)
    private BigDecimal quantidadeIntegral;
    @Column(name="SFLDOBRA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean dobra = false;
    @Transient
    private BigDecimal devidoNaTelaDeOcorrencias;
    @Column(name="RVLDEVIDO", precision=38, scale=25)
    private BigDecimal devido;
    @Column(name="RVLDEVIDOINTEGRAL", precision=38, scale=25)
    private BigDecimal devidoIntegral;
    @Column(name="RVLPAGO", precision=38, scale=25)
    private BigDecimal pago;
    @Column(name="RVLPAGOINTEGRAL", precision=38, scale=25)
    private BigDecimal pagoIntegral;
    @ManyToOne
    @JoinColumn(name="IIDVERBACALCULO")
    private VerbaDeCalculo verbaDeCalculo;
    @Column(name="SFLATIVO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean ativo = true;
    @OneToOne(fetch=FetchType.EAGER, cascade={CascadeType.ALL})
    @JoinColumn(name="IIDOCORRENCIAVERBAORIGINAL")
    private OcorrenciaDeVerba ocorrenciaOriginal;
    @Column(name="STPVALOR", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="ValorDaVerbaEnum")})
    private ValorDaVerbaEnum valor = ValorDaVerbaEnum.CALCULADO;
    @Column(name="SFLCOMPORPRINCIPAL", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="LogicoEnum")})
    private LogicoEnum comporPrincipal = LogicoEnum.NAO;
    @Column(name="RVLBASE", precision=38, scale=25)
    private BigDecimal base;
    @Column(name="RVLBASEINTEGRAL", precision=38, scale=25)
    private BigDecimal baseIntegral;
    @Column(name="DDTINICIALPERIODOAQUISITIVO")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicialPeriodoAquisitivo;
    @Column(name="DDTFINALPERIODOAQUISITIVO")
    @Temporal(value=TemporalType.DATE)
    private Date dataFinalPeriodoAquisitivo;
    @Column(name="SFLFERIASINDENIZADAS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean feriasIndenizadas = false;
    @Column(name="SFLFERIASCOMABONO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean feriasComAbono = false;
    @Column(name="RVLINDICEUTILIZADO", precision=38, scale=25)
    private BigDecimal indiceAcumulado;
    @Column(name="STPCARACTERISTICAVERBA", columnDefinition="CHAR(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="CaracteristicaDaVerbaEnum")})
    private CaracteristicaDaVerbaEnum caracteristica = CaracteristicaDaVerbaEnum.COMUM;
    @Column(name="STPOCORRENCIAPAGAMENTO", columnDefinition="CHAR(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="OcorrenciaDePagamentoEnum")})
    private OcorrenciaDePagamentoEnum ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.MENSAL;
    @Transient
    private Boolean selecionada = Boolean.FALSE;
    @Transient
    private BigDecimal indiceAcumuladoAtualizacao = BigDecimal.ONE;

    public OcorrenciaDeVerba() {
        super(RepositorioDeOcorrenciaVerba.class);
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

    public boolean isValorCalculado() {
        return ValorDaVerbaEnum.CALCULADO.equals((Object)this.valor);
    }

    public boolean isValorInformado() {
        return ValorDaVerbaEnum.INFORMADO.equals((Object)this.valor);
    }

    public static void remover(OcorrenciaDeVerba entidade) {
        OcorrenciaDeVerba.remover(RepositorioDeOcorrenciaVerba.class, entidade);
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public void recuperarValorOriginal() {
        if (this.getOcorrenciaOriginal() != null) {
            this.dataInicial = this.getOcorrenciaOriginal().getDataInicial();
            this.dataFinal = this.getOcorrenciaOriginal().getDataFinal();
            this.divisor = this.getOcorrenciaOriginal().getDivisor();
            this.multiplicador = this.getOcorrenciaOriginal().getMultiplicador();
            this.quantidade = this.getOcorrenciaOriginal().getQuantidade();
            this.quantidadeIntegral = this.getOcorrenciaOriginal().getQuantidadeIntegral();
            this.dobra = this.getOcorrenciaOriginal().getDobra();
            this.devido = this.getOcorrenciaOriginal().getDevido();
            this.devidoIntegral = this.getOcorrenciaOriginal().getDevidoIntegral();
            this.pago = this.getOcorrenciaOriginal().getPago();
            this.pagoIntegral = this.getOcorrenciaOriginal().getPagoIntegral();
            this.valor = this.getOcorrenciaOriginal().getValor();
            this.comporPrincipal = this.getOcorrenciaOriginal().getComporPrincipal();
            this.base = this.getOcorrenciaOriginal().getBase();
            this.baseIntegral = this.getOcorrenciaOriginal().getBaseIntegral();
            this.caracteristica = this.getOcorrenciaOriginal().getCaracteristica();
            this.ocorrenciaDePagamento = this.getOcorrenciaOriginal().getOcorrenciaDePagamento();
        }
    }

    public OcorrenciaDeVerba clonar() {
        OcorrenciaDeVerba clone = new OcorrenciaDeVerba();
        clone.setDataInicial(this.getDataInicial());
        clone.setDataFinal(this.getDataFinal());
        clone.setDivisor(this.getDivisor());
        clone.setMultiplicador(this.getMultiplicador());
        clone.setQuantidade(this.getQuantidade());
        clone.setQuantidadeIntegral(this.getQuantidadeIntegral());
        clone.setDobra(this.getDobra());
        clone.setDevido(this.getDevido());
        clone.setDevidoIntegral(this.getDevidoIntegral());
        clone.setPago(this.getPago());
        clone.setPagoIntegral(this.getPagoIntegral());
        clone.setVerbaDeCalculo(this.getVerbaDeCalculo());
        clone.setAtivo(this.getAtivo());
        clone.setOcorrenciaOriginal(this.getOcorrenciaOriginal());
        clone.setValor(this.getValor());
        clone.setComporPrincipal(this.getComporPrincipal());
        clone.setBase(this.getBase());
        clone.setBaseIntegral(this.getBaseIntegral());
        clone.setDataInicialPeriodoAquisitivo(this.getDataInicialPeriodoAquisitivo());
        clone.setDataFinalPeriodoAquisitivo(this.getDataFinalPeriodoAquisitivo());
        clone.setCaracteristica(this.caracteristica);
        clone.setOcorrenciaDePagamento(this.getOcorrenciaDePagamento());
        return clone;
    }

    public void mudarValorDevido() {
        if (ValorDaVerbaEnum.CALCULADO.equals((Object)this.getVerbaDeCalculo().getTipoValor()) && this.houveMudancaManualDoDevidoNaTelaDeOcorrencias()) {
            this.devido = this.devidoNaTelaDeOcorrencias;
            if (Utils.nulo(this.devido)) {
                this.setValor(ValorDaVerbaEnum.CALCULADO);
            } else {
                if (ValorDaVerbaEnum.CALCULADO.equals((Object)this.getValor())) {
                    this.setValor(ValorDaVerbaEnum.INFORMADO);
                }
                this.setDevidoIntegral(this.integraliza(this.devido));
            }
        } else if (ValorDaVerbaEnum.INFORMADO.equals((Object)this.getVerbaDeCalculo().getTipoValor()) && this.houveMudancaManualDoDevidoNaTelaDeOcorrencias()) {
            this.devido = this.devidoNaTelaDeOcorrencias;
            this.setDevidoIntegral(this.integraliza(this.devido));
        }
    }

    public BigDecimal getBase() {
        return this.base;
    }

    public void setBase(BigDecimal base) {
        this.base = base;
    }

    public LogicoEnum getComporPrincipal() {
        return this.comporPrincipal;
    }

    public void setComporPrincipal(LogicoEnum comporPrincipal) {
        this.comporPrincipal = comporPrincipal;
    }

    public static OcorrenciaDeVerba obter(Object id) {
        return (OcorrenciaDeVerba)OcorrenciaDeVerba.obter(RepositorioDeOcorrenciaVerba.class, id);
    }

    public static List<OcorrenciaDeVerba> obterTodos() {
        return OcorrenciaDeVerba.obterTodos(RepositorioDeOcorrenciaVerba.class);
    }

    public void calcularValorDevido() {
        this.getVerbaDeCalculo().getMaquinaDeCalculo().calcularValorDevidoDaOcorrencia(this);
    }

    public OcorrenciaDeVerba getOcorrenciaOriginal() {
        return this.ocorrenciaOriginal;
    }

    public void setOcorrenciaOriginal(OcorrenciaDeVerba ocorrenciaOriginal) {
        this.ocorrenciaOriginal = ocorrenciaOriginal;
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

    public BigDecimal getDivisor() {
        return this.divisor;
    }

    public void setDivisor(BigDecimal divisor) {
        this.divisor = divisor;
    }

    public BigDecimal getMultiplicador() {
        return this.multiplicador;
    }

    public void setMultiplicador(BigDecimal multiplicador) {
        this.multiplicador = multiplicador;
    }

    public BigDecimal getQuantidade() {
        return this.quantidade;
    }

    public void setQuantidade(BigDecimal quantidade) {
        if (Utils.naoNulo(this.quantidade) && this.quantidade.compareTo(quantidade) != 0) {
            this.quantidadeIntegral = null;
        }
        this.quantidade = quantidade;
    }

    public Boolean getDobra() {
        return this.dobra;
    }

    public void setDobra(Boolean dobra) {
        this.dobra = dobra;
    }

    public BigDecimal getDevidoNaTelaDeOcorrencias() {
        return this.getDevido();
    }

    public BigDecimal getValorRealDoDevidoNaTelaDeOcorrencias() {
        return this.devidoNaTelaDeOcorrencias;
    }

    public void setDevidoNaTelaDeOcorrencias(BigDecimal devidoNaTelaDeOcorrencias) {
        this.devidoNaTelaDeOcorrencias = devidoNaTelaDeOcorrencias;
    }

    public BigDecimal getDevido() {
        return this.devido;
    }

    public void setDevido(BigDecimal devido) {
        this.devido = devido;
        this.devidoNaTelaDeOcorrencias = devido;
    }

    public BigDecimal getPago() {
        return this.pago;
    }

    public BigDecimal getDiferenca() {
        if (!this.getAtivo().booleanValue()) {
            return BigDecimal.ZERO;
        }
        BigDecimal diferenca = BigDecimal.ZERO;
        if (Utils.naoNulos(this.getDevido(), this.getPago())) {
            diferenca = this.getDevido().subtract(this.getPago(), Utils.CONTEXTO_MATEMATICO);
        }
        if (diferenca != null && diferenca.signum() == -1 && this.getVerbaDeCalculo().getZeraValorNegativo().booleanValue()) {
            diferenca = BigDecimal.ZERO;
        }
        return diferenca;
    }

    public BigDecimal getDiferencaCorrigida() {
        BigDecimal diferenca = this.getDiferenca();
        if (!Utils.naoNulos(diferenca, this.indiceAcumulado)) {
            return null;
        }
        return this.getIndiceAcumulado().multiply(this.getDiferenca(), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getDiferencaCorrigidaParaAtualizacao() {
        BigDecimal diferenca = this.getDiferenca();
        if (!Utils.naoNulos(diferenca, this.indiceAcumuladoAtualizacao)) {
            return null;
        }
        return this.getIndiceAcumuladoAtualizacao().multiply(this.getDiferenca(), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getDiferencaIntegral() {
        if (!this.getAtivo().booleanValue()) {
            return BigDecimal.ZERO;
        }
        BigDecimal diferenca = BigDecimal.ZERO;
        if (Utils.naoNulos(this.getDevidoIntegral(), this.getPagoIntegral())) {
            diferenca = this.getDevidoIntegral().subtract(this.getPagoIntegral(), Utils.CONTEXTO_MATEMATICO);
        }
        if (diferenca != null && diferenca.signum() == -1 && this.getVerbaDeCalculo().getZeraValorNegativo().booleanValue()) {
            diferenca = BigDecimal.ZERO;
        }
        return diferenca;
    }

    public BigDecimal getDiferencaIntegralCorrigida() {
        BigDecimal diferenca = this.getDiferencaIntegral();
        if (!Utils.naoNulos(diferenca, this.indiceAcumulado)) {
            return null;
        }
        return this.getIndiceAcumulado().multiply(this.getDiferencaIntegral(), Utils.CONTEXTO_MATEMATICO);
    }

    public void setPago(BigDecimal pago) {
        if (Utils.naoNulo(this.pago) && this.pago.compareTo(pago) != 0) {
            this.pagoIntegral = null;
        }
        this.pago = pago;
    }

    public BigDecimal getPagoIntegral() {
        if (Utils.nulo(this.pagoIntegral) && Utils.naoNulo(this.pago)) {
            this.pagoIntegral = this.integraliza(this.pago);
        }
        if (Utils.naoNulo(this.pagoIntegral) && Utils.naoNulo(this.pago) && this.pagoIntegral.compareTo(BigDecimal.ZERO) == 0 && this.pago.compareTo(BigDecimal.ZERO) != 0) {
            this.pagoIntegral = this.integraliza(this.pago);
        }
        return this.pagoIntegral;
    }

    public void setPagoIntegral(BigDecimal pagoIntegral) {
        this.pagoIntegral = pagoIntegral;
    }

    public VerbaDeCalculo getVerbaDeCalculo() {
        return this.verbaDeCalculo;
    }

    public void setVerbaDeCalculo(VerbaDeCalculo verbaDeCalculo) {
        this.verbaDeCalculo = verbaDeCalculo;
    }

    public Boolean getAtivo() {
        return this.ativo;
    }

    public void setAtivo(Boolean ativo) {
        this.ativo = ativo;
    }

    public Long getId() {
        return this.id;
    }

    public ValorDaVerbaEnum getValor() {
        return this.valor;
    }

    public void setValor(ValorDaVerbaEnum valor) {
        this.valor = valor;
    }

    public Date getDataInicialPeriodoAquisitivo() {
        return this.dataInicialPeriodoAquisitivo;
    }

    public void setDataInicialPeriodoAquisitivo(Date dataInicialPeriodoAquisitivo) {
        this.dataInicialPeriodoAquisitivo = dataInicialPeriodoAquisitivo;
    }

    public Date getDataFinalPeriodoAquisitivo() {
        return this.dataFinalPeriodoAquisitivo;
    }

    public void setDataFinalPeriodoAquisitivo(Date dataFinalPeriodoAquisitivo) {
        this.dataFinalPeriodoAquisitivo = dataFinalPeriodoAquisitivo;
    }

    public BigDecimal getQuantidadeIntegral() {
        if (Utils.nulo(this.quantidadeIntegral) && Utils.naoNulo(this.quantidade)) {
            this.quantidadeIntegral = this.integraliza(this.quantidade);
        }
        if (Utils.naoNulo(this.quantidadeIntegral) && Utils.naoNulo(this.quantidade) && this.quantidadeIntegral.compareTo(BigDecimal.ZERO) == 0 && this.quantidade.compareTo(BigDecimal.ZERO) != 0) {
            this.quantidadeIntegral = this.integraliza(this.quantidade);
        }
        return this.quantidadeIntegral;
    }

    public void setQuantidadeIntegral(BigDecimal quantidadeIntegral) {
        this.quantidadeIntegral = quantidadeIntegral;
    }

    public BigDecimal getDevidoIntegral() {
        if (Utils.nulo(this.devidoIntegral) && Utils.naoNulo(this.devido)) {
            this.devidoIntegral = this.integraliza(this.devido);
        }
        if (Utils.naoNulo(this.devidoIntegral) && Utils.naoNulo(this.devido) && this.devidoIntegral.compareTo(BigDecimal.ZERO) == 0 && this.devido.compareTo(BigDecimal.ZERO) != 0) {
            this.devidoIntegral = this.integraliza(this.devido);
        }
        return this.devidoIntegral;
    }

    public void setDevidoIntegral(BigDecimal devidoIntegral) {
        this.devidoIntegral = devidoIntegral;
    }

    public BigDecimal getBaseIntegral() {
        return this.baseIntegral;
    }

    public void setBaseIntegral(BigDecimal baseIntegral) {
        this.baseIntegral = baseIntegral;
    }

    public Boolean isFeriasIndenizadas() {
        return this.feriasIndenizadas;
    }

    public void setFeriasIndenizadas(Boolean feriasIndenizadas) {
        this.feriasIndenizadas = feriasIndenizadas;
    }

    public Boolean getFeriasIndenizadas() {
        return this.feriasIndenizadas;
    }

    public Boolean isFeriasComAbono() {
        return this.feriasComAbono;
    }

    public void setFeriasComAbono(Boolean feriasComAbono) {
        this.feriasComAbono = feriasComAbono;
    }

    public Boolean getSelecionada() {
        return this.selecionada;
    }

    public void setSelecionada(Boolean selecionada) {
        this.selecionada = selecionada;
    }

    public BigDecimal getIndiceAcumuladoAtualizacao() {
        return this.indiceAcumuladoAtualizacao;
    }

    public void setIndiceAcumuladoAtualizacao(BigDecimal indiceAcumuladoAtualizacao) {
        this.indiceAcumuladoAtualizacao = indiceAcumuladoAtualizacao;
    }

    public BigDecimal getIndiceAcumulado() {
        return this.indiceAcumulado;
    }

    public void setIndiceAcumulado(BigDecimal indiceAcumulado) {
        this.indiceAcumulado = indiceAcumulado;
    }

    public CaracteristicaDaVerbaEnum getCaracteristica() {
        return this.caracteristica;
    }

    public void setCaracteristica(CaracteristicaDaVerbaEnum caracteristica) {
        this.caracteristica = caracteristica;
    }

    public OcorrenciaDePagamentoEnum getOcorrenciaDePagamento() {
        return this.ocorrenciaDePagamento;
    }

    public void setOcorrenciaDePagamento(OcorrenciaDePagamentoEnum ocorrenciaDePagamento) {
        this.ocorrenciaDePagamento = ocorrenciaDePagamento;
    }

    @Override
    public int compareTo(OcorrenciaDeVerba o) {
        if (this.getDataInicial().after(o.getDataInicial())) {
            return 1;
        }
        if (this.getDataInicial().before(o.getDataInicial())) {
            return -1;
        }
        return 0;
    }

    public boolean isValorAlterado() {
        return Utils.naoNulo((Object)this.getValor()) && !this.getValor().equals((Object)this.getOcorrenciaOriginal().getValor());
    }

    public boolean isAtivoAlterado() {
        return Utils.naoNulo(this.getAtivo()) && !this.getAtivo().equals(this.getOcorrenciaOriginal().getAtivo());
    }

    public boolean isDivisorAlterado() {
        return Utils.naoNulo(this.getDivisor()) && !this.getDivisor().equals(this.getOcorrenciaOriginal().getDivisor());
    }

    public boolean isMultiplicadorAlterado() {
        return Utils.naoNulo(this.getMultiplicador()) && !this.getMultiplicador().equals(this.getOcorrenciaOriginal().getMultiplicador());
    }

    public boolean isQuantidadeAlterada() {
        return Utils.naoNulo(this.getQuantidade()) && !this.getQuantidade().equals(this.getOcorrenciaOriginal().getQuantidade());
    }

    public boolean isDobraAlterada() {
        return Utils.naoNulo(this.getDobra()) && !this.getDobra().equals(this.getOcorrenciaOriginal().getDobra());
    }

    public boolean isDevidoAlterado() {
        return Utils.naoNulo(this.getDevido()) && !this.getDevido().equals(this.getOcorrenciaOriginal().getDevido());
    }

    public boolean isPagoAlterado() {
        return Utils.naoNulo(this.getPago()) && !this.getPago().equals(this.getOcorrenciaOriginal().getPago());
    }

    public boolean isCaracteristicaFeriasComDobra() {
        return CaracteristicaDaVerbaEnum.FERIAS == this.getVerbaDeCalculo().getCaracteristica() && this.getDobra() != false;
    }

    private BigDecimal integraliza(BigDecimal valor) {
        Calculo calculo = Calculo.obter(this.getVerbaDeCalculo().getCalculo().getId());
        Periodo periodoIntegralizacao = new Periodo(this.getDataInicial(), this.getDataFinal());
        int diasParaExcluir = 0;
        if (this.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
            diasParaExcluir += calculo.obterDiasFerias(periodoIntegralizacao);
        }
        if (periodoIntegralizacao.totalDeDias() - diasParaExcluir == 31) {
            diasParaExcluir = 1;
        }
        if (this.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
            diasParaExcluir += calculo.obterFaltasJustificadas(periodoIntegralizacao);
        }
        if (this.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
            diasParaExcluir += calculo.obterFaltasNaoJustificadas(periodoIntegralizacao);
        }
        CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(periodoIntegralizacao, valor, diasParaExcluir);
        integralizar.executar();
        return integralizar.getResultado();
    }

    public BigDecimal getDiferencaParaCalculoDasIncidencias() {
        return this.getDiferencaParaCalculoDasIncidencias(false);
    }

    public BigDecimal getDiferencaCorrigidaParaCalculoDasIncidencias() {
        return this.getDiferencaParaCalculoDasIncidencias(true);
    }

    public BigDecimal getDiferencaParaCalculoDasIncidencias(boolean corrigido) {
        if (!this.isFeriasIndenizadas().booleanValue()) {
            BigDecimal base = BigDecimal.ZERO;
            base = corrigido ? this.getDiferencaCorrigida() : this.getDiferenca();
            if (this.isCaracteristicaFeriasComDobra()) {
                base = base.multiply(Utils.CINQUENTA_POR_CENTO, Utils.CONTEXTO_MATEMATICO);
            }
            if (this.isFeriasComAbono().booleanValue() && this.getVerbaDeCalculo().getTipoValor().equals((Object)ValorDaVerbaEnum.CALCULADO)) {
                base = Utils.retirarAbono(this.calcularFatorAbono(), base);
            }
            return Utils.arredondarValorMonetario(base);
        }
        return null;
    }

    public int verificaDiasParaExcluirDeAcordoComA(VerbaDeCalculo base) {
        Periodo periodo = new Periodo(this.getDataInicial(), this.getDataFinal());
        int diasParaExcluir = 0;
        if (base.getExcluirFeriasGozadas().booleanValue()) {
            diasParaExcluir += base.getCalculo().obterDiasFerias(periodo);
        }
        if (periodo.totalDeDias() - diasParaExcluir == 31) {
            diasParaExcluir = 1;
        }
        if (base.getExcluirFaltaJustificada().booleanValue()) {
            diasParaExcluir += base.getCalculo().obterFaltasJustificadas(periodo);
        }
        if (base.getExcluirFaltaNaoJustificada().booleanValue()) {
            diasParaExcluir += base.getCalculo().obterFaltasNaoJustificadas(periodo);
        }
        return diasParaExcluir;
    }

    public Periodo getPeriodo() {
        return new Periodo(this.getDataInicial(), this.getDataFinal());
    }

    public void alterarValorDoAtributoEmLote(int chave, BigDecimal valor, boolean proporcionalizar, VerbaDeCalculo verba) {
        this.alterarValorDoAtributo(chave, valor, proporcionalizar, verba, true);
    }

    private void alterarValorDoAtributo(int chave, BigDecimal valor, boolean proporcionalizar, VerbaDeCalculo verba, boolean emLote) {
        BigDecimal valorProporcional = valor;
        BigDecimal valorIntegral = valor;
        if (proporcionalizar) {
            int diasParaExcuir = this.verificaDiasParaExcluirDeAcordoComA(verba);
            CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar(this.getPeriodo(), valor, diasParaExcuir);
            calculoDoProporcionalizar.executar();
            valorProporcional = calculoDoProporcionalizar.getResultado();
        } else {
            valorIntegral = this.integraliza(valor);
        }
        switch (chave) {
            case 1: {
                this.setQuantidade(valorProporcional);
                this.setQuantidadeIntegral(emLote ? valorIntegral : null);
                break;
            }
            case 3: {
                this.setDevido(valorProporcional);
                this.setDevidoIntegral(emLote ? valorIntegral : null);
                break;
            }
            case 2: {
                this.setPago(valorProporcional);
                this.setPagoIntegral(emLote ? valorIntegral : null);
                break;
            }
        }
    }

    public void anularQuantidadeIntegral() {
        this.setQuantidadeIntegral(null);
    }

    public void anularPagoIntegral() {
        this.setPagoIntegral(null);
    }

    public void anularDevidoIntegral() {
        this.setDevidoIntegral(null);
    }

    public void atualizarValorDevidoAlteradoNaTelaDeOcorrencia() {
        if (this.houveMudancaManualDoDevidoNaTelaDeOcorrencias()) {
            this.devido = this.devidoNaTelaDeOcorrencias;
        }
        if (Utils.nulo(this.getDevido())) {
            this.setValor(ValorDaVerbaEnum.CALCULADO);
        }
    }

    private boolean houveMudancaManualDoDevidoNaTelaDeOcorrencias() {
        if (this.devidoNaTelaDeOcorrencias == null) {
            return this.devido != null;
        }
        if (this.devido == null) {
            return true;
        }
        return this.devidoNaTelaDeOcorrencias.compareTo(this.devido) != 0;
    }

    public BigDecimal calcularFatorAbono() {
        if (Utils.naoNulos(this.getDataInicialPeriodoAquisitivo(), this.getDataFinalPeriodoAquisitivo())) {
            Periodo periodoAquisitivoFerias = new Periodo(this.getDataInicialPeriodoAquisitivo(), this.getDataFinalPeriodoAquisitivo());
            for (Ferias ferias : this.verbaDeCalculo.getCalculo().getListaDeFerias()) {
                if (!Utils.naoNulo(ferias.getPeriodoAquisitivo()) || !periodoAquisitivoFerias.isDatasCoincidentesCom(ferias.getPeriodoAquisitivo())) continue;
                BigDecimal prazo = new BigDecimal(ferias.getPrazo());
                BigDecimal diasAbono = new BigDecimal(ferias.getQuantidadeDiasAbono());
                return Utils.dividir(prazo, Utils.subtrair(prazo, diasAbono));
            }
        }
        return FATOR_ABONO_PADRAO;
    }
}

