/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.assuntocnj.AssuntoCnj;
import br.jus.trt8.pjecalc.negocio.dominio.assuntocnj.RepositorioDeAssuntoCnj;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustas;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamadoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.RepositorioDeParcelasAtualizaveisOutrosDebitosReclamado;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBPARCEATUALIZOUTROSDEBRMDO")
@SequenceGenerator(name="SQPARCEATUALIZOUTROSDEBRMDO", sequenceName="SQPARCEATUALIZOUTROSDEBRMDO", allocationSize=1)
@Name(value="parcelasAtualizaveisOutrosDebitosReclamado")
public class ParcelasAtualizaveisOutrosDebitosReclamado
extends EntidadeBase {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPARCEATUALIZOUTROSDEBRMDO")
    @Column(name="IIDPARCEATUALIZOUTROSDEBRMDO")
    private Long id = null;
    @OneToOne
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculoExterno;
    @Column(name="SFLCONTRIBSOCIALSEGURADO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarContribSocialSegurado = false;
    @Column(name="MVLPARCELAATEFEV2009CSS", precision=19, scale=2)
    private BigDecimal valorParcelasAteFev2009ContribSocialSegurado;
    @Column(name="MVLJUROSTRABALHISTACSS", precision=19, scale=2)
    private BigDecimal valorJurosAteFev2009ContribSocialSegurado;
    @Column(name="MVLPARCELAAPOSFEV2009CSS", precision=19, scale=2)
    private BigDecimal valorParcelasAposFev2009ContribSocialSegurado;
    @Column(name="MVLJUROSPREVIDENCIARIOCSS", precision=19, scale=2)
    private BigDecimal valorJurosAposFev2009ContribSocialSegurado;
    @Column(name="MVLPARCELACSS", precision=19, scale=2)
    private BigDecimal valorParcelaContribSocialSegurado;
    @Column(name="MVLJUROSCSS", precision=19, scale=2)
    private BigDecimal valorJurosContribSocialSegurado;
    @Column(name="SFLCONTRIBSOCIALPATRONAL", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarContribSocialPatronal = false;
    @Column(name="MVLPARCELAATEFEV2009CSP", precision=19, scale=2)
    private BigDecimal valorParcelasAteFev2009ContribSocialPatronal;
    @Column(name="MVLJUROSTRABALHISTACSP", precision=19, scale=2)
    private BigDecimal valorJurosAteFev2009ContribSocialPatronal;
    @Column(name="MVLPARCELAAPOSFEV2009CSP", precision=19, scale=2)
    private BigDecimal valorParcelasAposFev2009ContribSocialPatronal;
    @Column(name="MVLJUROSPREVIDENCIARIOCSP", precision=19, scale=2)
    private BigDecimal valorJurosAposFev2009ContribSocialPatronal;
    @Column(name="MVLPARCELACSP", precision=19, scale=2)
    private BigDecimal valorParcelaContribSocialPatronal;
    @Column(name="MVLJUROSCSP", precision=19, scale=2)
    private BigDecimal valorJurosContribSocialPatronal;
    @Column(name="SFLMULTACONTRIBSOCIALDEVIDOS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarMultaContribSocialDevidos = false;
    @Column(name="DDTINICIALATEFEV2009MCSD")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicialAteFev2009MultaContribSocialDevidos;
    @Column(name="DDTINICIALAPOSFEV2009MCSD")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicialAposFev2009MultaContribSocialDevidos;
    @Column(name="DDTINICIALBASEMULTAMCSD")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicialBaseMultaContribSocialDevidos;
    @Column(name="SFLCONTRIBSOCIALPAGOS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarContribSocialPagos = false;
    @Column(name="MVLPARCELAATEFEV2009CSPAG", precision=19, scale=2)
    private BigDecimal valorParcelasAteFev2009ContribSocialPagos;
    @Column(name="MVLJUROSTRABALHISTACSPAG", precision=19, scale=2)
    private BigDecimal valorJurosAteFev2009ContribSocialPagos;
    @Column(name="MVLPARCELAAPOSFEV2009CSPAG", precision=19, scale=2)
    private BigDecimal valorParcelasAposFev2009ContribSocialPagos;
    @Column(name="MVLJUROSPREVIDENCIARIOCSPAG", precision=19, scale=2)
    private BigDecimal valorJurosAposFev2009ContribSocialPagos;
    @Column(name="MVLPARCELACSPAG", precision=19, scale=2)
    private BigDecimal valorParcelaContribSocialPagos;
    @Column(name="MVLJUROSCSPAG", precision=19, scale=2)
    private BigDecimal valorJurosContribSocialPagos;
    @Column(name="SFLMULTACONTRIBSOCIALPAGOS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarMultaContribSocialPagos = false;
    @Column(name="DDTINICIALATEFEV2009MCSP")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicialAteFev2009MultaContribSocialPagos;
    @Column(name="DDTINICIALAPOSFEV2009MCSP")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicialAposFev2009MultaContribSocialPagos;
    @Column(name="DDTINICIALBASEMULTAMCSP")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicialBaseMultaContribSocialPagos;
    @Column(name="SFLJUROSPREVIDENVIAPRIVADA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarJurosPrevidenciaPrivada = false;
    @Column(name="MVLJUROSPREVIDPRIVADA", precision=19, scale=2)
    private BigDecimal valorJurosPrevidenciaPrivada;
    @Column(name="STPINDICETRABALPREVIDPRIVADA", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    private IndiceMonetarioEnum indiceTrabalhistaInformadoPrevidenciaPrivada = IndiceMonetarioEnum.INDICE_TRABALHISTA;
    @Column(name="SFLAPLICARJUROSPREVIDPRIVADA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarJurosPrevidenciaPrivada;
    @Column(name="SFLMULTAINDENIZTERCRMDO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarMultaIndenizTerceiroReclamado = false;
    @Transient
    private ParcelasAtualizaveisMultaIndenizacao multaIndenizTerceiroReclamado = new ParcelasAtualizaveisMultaIndenizacao();
    @OneToMany(mappedBy="outrosDebitosReclamado", cascade={CascadeType.ALL})
    private List<ParcelasAtualizaveisMultaIndenizacao> listaMultasIndenizTerceiroReclamado = new ArrayList<ParcelasAtualizaveisMultaIndenizacao>();
    @Column(name="SFLHONORARIOSDEVRMDO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarHonorariosDevReclamado = false;
    @Transient
    private ParcelasAtualizaveisHonorario honorariosDevReclamado = new ParcelasAtualizaveisHonorario();
    @OneToMany(mappedBy="outrosDebitosReclamado", cascade={CascadeType.ALL})
    private List<ParcelasAtualizaveisHonorario> listaHonorariosDevReclamado = new ArrayList<ParcelasAtualizaveisHonorario>();
    @Column(name="SFLCONTRIBSOCIAL10", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarContribSocial10 = false;
    @Column(name="MVLVALORPARCELACS10", precision=19, scale=2)
    private BigDecimal valorParcelaContribSocial10;
    @Column(name="STPINDICETRABALHISTACS10", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    private IndiceMonetarioEnum indiceTrabalhistaContribSocial10 = IndiceMonetarioEnum.IPCAE;
    @Column(name="SFLCONTRIBSOCIAL05", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarContribSocial05 = false;
    @Column(name="MVLVALORPARCELACS05", precision=19, scale=2)
    private BigDecimal valorParcelaContribSocial05;
    @Column(name="STPINDICETRABALHISTACS05", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    private IndiceMonetarioEnum indiceTrabalhistaContribSocial05 = IndiceMonetarioEnum.IPCAE;
    @Column(name="SFLCUSTASCONHECIMENTORMDO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarCustasConhecimentoReclamado = false;
    @ManyToOne(cascade={CascadeType.ALL})
    @JoinColumn(name="IIDCUSTASCONHECIMENTORMDO")
    private ParcelasAtualizaveisCustas custasConhecimentoReclamado = new ParcelasAtualizaveisCustas(Utils.VALOR_DOIS);
    @Column(name="SFLCUSTASCONHECIMENTOLIQUID", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarCustasLiquidacao = false;
    @ManyToOne(cascade={CascadeType.ALL})
    @JoinColumn(name="IIDCUSTASCONHECIMENTOLIQUID")
    private ParcelasAtualizaveisCustas custasLiquidacao = new ParcelasAtualizaveisCustas(Utils.CINQUENTA_POR_CENTO);
    @Column(name="SFLCUSTASEXECUCAO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarCustasExecucao = false;
    @ManyToOne(cascade={CascadeType.ALL})
    @JoinColumn(name="IIDCUSTASEXECUCAO")
    private ParcelasAtualizaveisCustas custasExecucao = new ParcelasAtualizaveisCustas();

    public ParcelasAtualizaveisOutrosDebitosReclamado() {
        super(RepositorioDeParcelasAtualizaveisOutrosDebitosReclamado.class);
    }

    public ParcelasAtualizaveisOutrosDebitosReclamado(Calculo calculoExterno) {
        this();
        this.calculoExterno = calculoExterno;
    }

    @Override
    public void salvar(boolean flush) {
        super.salvar(flush);
    }

    public static ParcelasAtualizaveisOutrosDebitosReclamado obterDoCalculo(Calculo calculo) {
        return ParcelasAtualizaveisOutrosDebitosReclamado.getRepositorio(RepositorioDeParcelasAtualizaveisOutrosDebitosReclamado.class).obterDoCalculo(calculo);
    }

    protected AssuntoCnj obterAssuntoCnjParaVerbas() {
        return ParcelasAtualizaveisOutrosDebitosReclamado.getRepositorio(RepositorioDeAssuntoCnj.class).obterRaiz();
    }

    public void consistirDados() {
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirDados(this);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Boolean getMarcarMultaContribSocialDevidos() {
        return this.marcarMultaContribSocialDevidos;
    }

    public void setMarcarMultaContribSocialDevidos(Boolean marcarMultaContribSocialDevidos) {
        this.marcarMultaContribSocialDevidos = marcarMultaContribSocialDevidos;
    }

    public Boolean getMarcarContribSocialPagos() {
        return this.marcarContribSocialPagos;
    }

    public void setMarcarContribSocialPagos(Boolean marcarContribSocialPagos) {
        this.marcarContribSocialPagos = marcarContribSocialPagos;
    }

    public Boolean getMarcarMultaContribSocialPagos() {
        return this.marcarMultaContribSocialPagos;
    }

    public void setMarcarMultaContribSocialPagos(Boolean marcarMultaContribSocialPagos) {
        this.marcarMultaContribSocialPagos = marcarMultaContribSocialPagos;
    }

    public Boolean getMarcarJurosPrevidenciaPrivada() {
        return this.marcarJurosPrevidenciaPrivada;
    }

    public void setMarcarJurosPrevidenciaPrivada(Boolean marcarJurosPrevidenciaPrivada) {
        this.marcarJurosPrevidenciaPrivada = marcarJurosPrevidenciaPrivada;
    }

    public Boolean getMarcarMultaIndenizTerceiroReclamado() {
        return this.marcarMultaIndenizTerceiroReclamado;
    }

    public void setMarcarMultaIndenizTerceiroReclamado(Boolean marcarMultaIndenizTerceiroReclamado) {
        this.marcarMultaIndenizTerceiroReclamado = marcarMultaIndenizTerceiroReclamado;
    }

    public Boolean getMarcarHonorariosDevReclamado() {
        return this.marcarHonorariosDevReclamado;
    }

    public void setMarcarHonorariosDevReclamado(Boolean marcarHonorariosDevReclamado) {
        this.marcarHonorariosDevReclamado = marcarHonorariosDevReclamado;
    }

    public Boolean getMarcarContribSocial10() {
        return this.marcarContribSocial10;
    }

    public void setMarcarContribSocial10(Boolean marcarContribSocial10) {
        this.marcarContribSocial10 = marcarContribSocial10;
    }

    public Boolean getMarcarContribSocial05() {
        return this.marcarContribSocial05;
    }

    public void setMarcarContribSocial05(Boolean marcarContribSocial05) {
        this.marcarContribSocial05 = marcarContribSocial05;
    }

    public Boolean getMarcarCustasConhecimentoReclamado() {
        return this.marcarCustasConhecimentoReclamado;
    }

    public void setMarcarCustasConhecimentoReclamado(Boolean marcarCustasConhecimentoReclamado) {
        this.marcarCustasConhecimentoReclamado = marcarCustasConhecimentoReclamado;
    }

    public Boolean getMarcarCustasLiquidacao() {
        return this.marcarCustasLiquidacao;
    }

    public void setMarcarCustasLiquidacao(Boolean marcarCustasLiquidacao) {
        this.marcarCustasLiquidacao = marcarCustasLiquidacao;
    }

    public Boolean getMarcarCustasExecucao() {
        return this.marcarCustasExecucao;
    }

    public void setMarcarCustasExecucao(Boolean marcarCustasExecucao) {
        this.marcarCustasExecucao = marcarCustasExecucao;
    }

    public ParcelasAtualizaveisCustas getCustasConhecimentoReclamado() {
        return this.custasConhecimentoReclamado;
    }

    public void setCustasConhecimentoReclamado(ParcelasAtualizaveisCustas custasConhecimentoReclamado) {
        this.custasConhecimentoReclamado = custasConhecimentoReclamado;
    }

    public ParcelasAtualizaveisCustas getCustasLiquidacao() {
        return this.custasLiquidacao;
    }

    public void setCustasLiquidacao(ParcelasAtualizaveisCustas custasLiquidacao) {
        this.custasLiquidacao = custasLiquidacao;
    }

    public ParcelasAtualizaveisCustas getCustasExecucao() {
        return this.custasExecucao;
    }

    public void setCustasExecucao(ParcelasAtualizaveisCustas custasExecucao) {
        this.custasExecucao = custasExecucao;
    }

    public IndiceMonetarioEnum getIndiceTrabalhistaInformadoPrevidenciaPrivada() {
        return this.indiceTrabalhistaInformadoPrevidenciaPrivada;
    }

    public void setIndiceTrabalhistaInformadoPrevidenciaPrivada(IndiceMonetarioEnum indiceTrabalhistaInformadoPrevidenciaPrivada) {
        this.indiceTrabalhistaInformadoPrevidenciaPrivada = indiceTrabalhistaInformadoPrevidenciaPrivada;
    }

    public Boolean getMarcarContribSocialSegurado() {
        return this.marcarContribSocialSegurado;
    }

    public void setMarcarContribSocialSegurado(Boolean marcarContribSocialSegurado) {
        this.marcarContribSocialSegurado = marcarContribSocialSegurado;
    }

    public BigDecimal getValorParcelasAteFev2009ContribSocialSegurado() {
        return this.valorParcelasAteFev2009ContribSocialSegurado;
    }

    public void setValorParcelasAteFev2009ContribSocialSegurado(BigDecimal valorParcelasAteFev2009ContribSocialSegurado) {
        this.valorParcelasAteFev2009ContribSocialSegurado = valorParcelasAteFev2009ContribSocialSegurado;
    }

    public BigDecimal getValorJurosAteFev2009ContribSocialSegurado() {
        return this.valorJurosAteFev2009ContribSocialSegurado;
    }

    public void setValorJurosAteFev2009ContribSocialSegurado(BigDecimal valorJurosAteFev2009ContribSocialSegurado) {
        this.valorJurosAteFev2009ContribSocialSegurado = valorJurosAteFev2009ContribSocialSegurado;
    }

    public BigDecimal getValorParcelasAposFev2009ContribSocialSegurado() {
        return this.valorParcelasAposFev2009ContribSocialSegurado;
    }

    public void setValorParcelasAposFev2009ContribSocialSegurado(BigDecimal valorParcelasAposFev2009ContribSocialSegurado) {
        this.valorParcelasAposFev2009ContribSocialSegurado = valorParcelasAposFev2009ContribSocialSegurado;
    }

    public BigDecimal getValorJurosAposFev2009ContribSocialSegurado() {
        return this.valorJurosAposFev2009ContribSocialSegurado;
    }

    public void setValorJurosAposFev2009ContribSocialSegurado(BigDecimal valorJurosAposFev2009ContribSocialSegurado) {
        this.valorJurosAposFev2009ContribSocialSegurado = valorJurosAposFev2009ContribSocialSegurado;
    }

    public BigDecimal getValorParcelaContribSocialSegurado() {
        return this.valorParcelaContribSocialSegurado;
    }

    public void setValorParcelaContribSocialSegurado(BigDecimal valorParcelaContribSocialSegurado) {
        this.valorParcelaContribSocialSegurado = valorParcelaContribSocialSegurado;
    }

    public BigDecimal getValorJurosContribSocialSegurado() {
        return this.valorJurosContribSocialSegurado;
    }

    public void setValorJurosContribSocialSegurado(BigDecimal valorJurosContribSocialSegurado) {
        this.valorJurosContribSocialSegurado = valorJurosContribSocialSegurado;
    }

    public Boolean getMarcarContribSocialPatronal() {
        return this.marcarContribSocialPatronal;
    }

    public void setMarcarContribSocialPatronal(Boolean marcarContribSocialPatronal) {
        this.marcarContribSocialPatronal = marcarContribSocialPatronal;
    }

    public BigDecimal getValorParcelasAteFev2009ContribSocialPatronal() {
        return this.valorParcelasAteFev2009ContribSocialPatronal;
    }

    public void setValorParcelasAteFev2009ContribSocialPatronal(BigDecimal valorParcelasAteFev2009ContribSocialPatronal) {
        this.valorParcelasAteFev2009ContribSocialPatronal = valorParcelasAteFev2009ContribSocialPatronal;
    }

    public BigDecimal getValorJurosAteFev2009ContribSocialPatronal() {
        return this.valorJurosAteFev2009ContribSocialPatronal;
    }

    public void setValorJurosAteFev2009ContribSocialPatronal(BigDecimal valorJurosAteFev2009ContribSocialPatronal) {
        this.valorJurosAteFev2009ContribSocialPatronal = valorJurosAteFev2009ContribSocialPatronal;
    }

    public BigDecimal getValorParcelasAposFev2009ContribSocialPatronal() {
        return this.valorParcelasAposFev2009ContribSocialPatronal;
    }

    public void setValorParcelasAposFev2009ContribSocialPatronal(BigDecimal valorParcelasAposFev2009ContribSocialPatronal) {
        this.valorParcelasAposFev2009ContribSocialPatronal = valorParcelasAposFev2009ContribSocialPatronal;
    }

    public BigDecimal getValorJurosAposFev2009ContribSocialPatronal() {
        return this.valorJurosAposFev2009ContribSocialPatronal;
    }

    public void setValorJurosAposFev2009ContribSocialPatronal(BigDecimal valorJurosAposFev2009ContribSocialPatronal) {
        this.valorJurosAposFev2009ContribSocialPatronal = valorJurosAposFev2009ContribSocialPatronal;
    }

    public BigDecimal getValorParcelaContribSocialPatronal() {
        return this.valorParcelaContribSocialPatronal;
    }

    public void setValorParcelaContribSocialPatronal(BigDecimal valorParcelaContribSocialPatronal) {
        this.valorParcelaContribSocialPatronal = valorParcelaContribSocialPatronal;
    }

    public BigDecimal getValorJurosContribSocialPatronal() {
        return this.valorJurosContribSocialPatronal;
    }

    public void setValorJurosContribSocialPatronal(BigDecimal valorJurosContribSocialPatronal) {
        this.valorJurosContribSocialPatronal = valorJurosContribSocialPatronal;
    }

    public Date getDataInicialAteFev2009MultaContribSocialDevidos() {
        return this.dataInicialAteFev2009MultaContribSocialDevidos;
    }

    public void setDataInicialAteFev2009MultaContribSocialDevidos(Date dataInicialAteFev2009MultaContribSocialDevidos) {
        this.dataInicialAteFev2009MultaContribSocialDevidos = dataInicialAteFev2009MultaContribSocialDevidos;
    }

    public Date getDataInicialAposFev2009MultaContribSocialDevidos() {
        return this.dataInicialAposFev2009MultaContribSocialDevidos;
    }

    public void setDataInicialAposFev2009MultaContribSocialDevidos(Date dataInicialAposFev2009MultaContribSocialDevidos) {
        this.dataInicialAposFev2009MultaContribSocialDevidos = dataInicialAposFev2009MultaContribSocialDevidos;
    }

    public Date getDataInicialBaseMultaContribSocialDevidos() {
        return this.dataInicialBaseMultaContribSocialDevidos;
    }

    public void setDataInicialBaseMultaContribSocialDevidos(Date dataInicialBaseMultaContribSocialDevidos) {
        this.dataInicialBaseMultaContribSocialDevidos = dataInicialBaseMultaContribSocialDevidos;
    }

    public BigDecimal getValorParcelasAteFev2009ContribSocialPagos() {
        return this.valorParcelasAteFev2009ContribSocialPagos;
    }

    public void setValorParcelasAteFev2009ContribSocialPagos(BigDecimal valorParcelasAteFev2009ContribSocialPagos) {
        this.valorParcelasAteFev2009ContribSocialPagos = valorParcelasAteFev2009ContribSocialPagos;
    }

    public BigDecimal getValorJurosAteFev2009ContribSocialPagos() {
        return this.valorJurosAteFev2009ContribSocialPagos;
    }

    public void setValorJurosAteFev2009ContribSocialPagos(BigDecimal valorJurosAteFev2009ContribSocialPagos) {
        this.valorJurosAteFev2009ContribSocialPagos = valorJurosAteFev2009ContribSocialPagos;
    }

    public BigDecimal getValorParcelasAposFev2009ContribSocialPagos() {
        return this.valorParcelasAposFev2009ContribSocialPagos;
    }

    public void setValorParcelasAposFev2009ContribSocialPagos(BigDecimal valorParcelasAposFev2009ContribSocialPagos) {
        this.valorParcelasAposFev2009ContribSocialPagos = valorParcelasAposFev2009ContribSocialPagos;
    }

    public BigDecimal getValorJurosAposFev2009ContribSocialPagos() {
        return this.valorJurosAposFev2009ContribSocialPagos;
    }

    public void setValorJurosAposFev2009ContribSocialPagos(BigDecimal valorJurosAposFev2009ContribSocialPagos) {
        this.valorJurosAposFev2009ContribSocialPagos = valorJurosAposFev2009ContribSocialPagos;
    }

    public BigDecimal getValorParcelaContribSocialPagos() {
        return this.valorParcelaContribSocialPagos;
    }

    public void setValorParcelaContribSocialPagos(BigDecimal valorParcelaContribSocialPagos) {
        this.valorParcelaContribSocialPagos = valorParcelaContribSocialPagos;
    }

    public BigDecimal getValorJurosContribSocialPagos() {
        return this.valorJurosContribSocialPagos;
    }

    public void setValorJurosContribSocialPagos(BigDecimal valorJurosContribSocialPagos) {
        this.valorJurosContribSocialPagos = valorJurosContribSocialPagos;
    }

    public Date getDataInicialAteFev2009MultaContribSocialPagos() {
        return this.dataInicialAteFev2009MultaContribSocialPagos;
    }

    public void setDataInicialAteFev2009MultaContribSocialPagos(Date dataInicialAteFev2009MultaContribSocialPagos) {
        this.dataInicialAteFev2009MultaContribSocialPagos = dataInicialAteFev2009MultaContribSocialPagos;
    }

    public Date getDataInicialAposFev2009MultaContribSocialPagos() {
        return this.dataInicialAposFev2009MultaContribSocialPagos;
    }

    public void setDataInicialAposFev2009MultaContribSocialPagos(Date dataInicialAposFev2009MultaContribSocialPagos) {
        this.dataInicialAposFev2009MultaContribSocialPagos = dataInicialAposFev2009MultaContribSocialPagos;
    }

    public Date getDataInicialBaseMultaContribSocialPagos() {
        return this.dataInicialBaseMultaContribSocialPagos;
    }

    public void setDataInicialBaseMultaContribSocialPagos(Date dataInicialBaseMultaContribSocialPagos) {
        this.dataInicialBaseMultaContribSocialPagos = dataInicialBaseMultaContribSocialPagos;
    }

    public BigDecimal getValorJurosPrevidenciaPrivada() {
        return this.valorJurosPrevidenciaPrivada;
    }

    public void setValorJurosPrevidenciaPrivada(BigDecimal valorJurosPrevidenciaPrivada) {
        this.valorJurosPrevidenciaPrivada = valorJurosPrevidenciaPrivada;
    }

    public Boolean getAplicarJurosPrevidenciaPrivada() {
        return this.aplicarJurosPrevidenciaPrivada;
    }

    public void setAplicarJurosPrevidenciaPrivada(Boolean aplicarJurosPrevidenciaPrivada) {
        this.aplicarJurosPrevidenciaPrivada = aplicarJurosPrevidenciaPrivada;
    }

    public BigDecimal getValorParcelaContribSocial10() {
        return this.valorParcelaContribSocial10;
    }

    public void setValorParcelaContribSocial10(BigDecimal valorParcelaContribSocial10) {
        this.valorParcelaContribSocial10 = valorParcelaContribSocial10;
    }

    public IndiceMonetarioEnum getIndiceTrabalhistaContribSocial10() {
        return this.indiceTrabalhistaContribSocial10;
    }

    public void setIndiceTrabalhistaContribSocial10(IndiceMonetarioEnum indiceTrabalhistaContribSocial10) {
        this.indiceTrabalhistaContribSocial10 = indiceTrabalhistaContribSocial10;
    }

    public BigDecimal getValorParcelaContribSocial05() {
        return this.valorParcelaContribSocial05;
    }

    public void setValorParcelaContribSocial05(BigDecimal valorParcelaContribSocial05) {
        this.valorParcelaContribSocial05 = valorParcelaContribSocial05;
    }

    public IndiceMonetarioEnum getIndiceTrabalhistaContribSocial05() {
        return this.indiceTrabalhistaContribSocial05;
    }

    public void setIndiceTrabalhistaContribSocial05(IndiceMonetarioEnum indiceTrabalhistaContribSocial05) {
        this.indiceTrabalhistaContribSocial05 = indiceTrabalhistaContribSocial05;
    }

    public Calculo getCalculoExterno() {
        return this.calculoExterno;
    }

    public void setCalculoExterno(Calculo calculoExterno) {
        this.calculoExterno = calculoExterno;
    }

    public ParcelasAtualizaveisMultaIndenizacao getMultaIndenizTerceiroReclamado() {
        return this.multaIndenizTerceiroReclamado;
    }

    public void setMultaIndenizTerceiroReclamado(ParcelasAtualizaveisMultaIndenizacao multaIndenizTerceiroReclamado) {
        this.multaIndenizTerceiroReclamado = multaIndenizTerceiroReclamado;
    }

    public List<ParcelasAtualizaveisMultaIndenizacao> getListaMultasIndenizTerceiroReclamado() {
        return this.listaMultasIndenizTerceiroReclamado;
    }

    public void setListaMultasIndenizTerceiroReclamado(List<ParcelasAtualizaveisMultaIndenizacao> listaMultasIndenizTerceiroReclamado) {
        this.listaMultasIndenizTerceiroReclamado = listaMultasIndenizTerceiroReclamado;
    }

    public ParcelasAtualizaveisHonorario getHonorariosDevReclamado() {
        return this.honorariosDevReclamado;
    }

    public void setHonorariosDevReclamado(ParcelasAtualizaveisHonorario honorariosDevReclamado) {
        this.honorariosDevReclamado = honorariosDevReclamado;
    }

    public List<ParcelasAtualizaveisHonorario> getListaHonorariosDevReclamado() {
        return this.listaHonorariosDevReclamado;
    }

    public void setListaHonorariosDevReclamado(List<ParcelasAtualizaveisHonorario> listaHonorariosDevReclamado) {
        this.listaHonorariosDevReclamado = listaHonorariosDevReclamado;
    }

    public Long getId() {
        return this.id;
    }

    public List<ParcelasAtualizaveisMultaIndenizacao> getListaMultasIndenizTerceiroReclamadoClone() {
        ArrayList<ParcelasAtualizaveisMultaIndenizacao> novaLista = new ArrayList<ParcelasAtualizaveisMultaIndenizacao>();
        for (ParcelasAtualizaveisMultaIndenizacao multa : this.listaMultasIndenizTerceiroReclamado) {
            novaLista.add(multa.clonar());
        }
        return novaLista;
    }

    public List<ParcelasAtualizaveisHonorario> getListaHonorariosDevReclamadoClone() {
        ArrayList<ParcelasAtualizaveisHonorario> novaLista = new ArrayList<ParcelasAtualizaveisHonorario>();
        for (ParcelasAtualizaveisHonorario honorario : this.listaHonorariosDevReclamado) {
            novaLista.add(honorario.clonar());
        }
        return novaLista;
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        ParcelasAtualizaveisOutrosDebitosReclamado other = (ParcelasAtualizaveisOutrosDebitosReclamado)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }
}

