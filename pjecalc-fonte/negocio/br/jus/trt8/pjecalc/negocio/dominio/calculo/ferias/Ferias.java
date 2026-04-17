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
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoPrazoDeFerias;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.SituacaoDaFeriasEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.RepositorioDeFerias;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.regras.AbonoDeFeriasValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.regras.DiasDeAbonoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.regras.PeriodoDeGozoValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.regras.PrazoDeFeriasValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import java.io.Serializable;
import java.util.Date;
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
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBFERIASCALCULO")
@SequenceGenerator(name="SQFERIASCALCULO", sequenceName="SQFERIASCALCULO", allocationSize=1)
@Name(value="ferias")
public class Ferias
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = -4841534726685343431L;
    private static final Integer DIAS_ABONO_PADRAO = 10;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQFERIASCALCULO")
    @Column(name="IIDFERIASCALCULO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="SNMPERIODOFERIAS")
    @Required
    private String relativa;
    @Column(name="DDTINICIOPERIODOAQUISITIVO")
    @Temporal(value=TemporalType.DATE)
    @Required
    private Date dataInicialDoPeriodoAquisitivo;
    @Column(name="DDTTERMINOPERIODOAQUISITIVO")
    @Temporal(value=TemporalType.DATE)
    @Required
    private Date dataFinalDoPeriodoAquisitivo;
    @Column(name="DDTINICIOPERIODOCONCESSIVO")
    @Temporal(value=TemporalType.DATE)
    @Required
    private Date dataInicialDoPeriodoConcessivo;
    @Column(name="DDTTERMINOPERIODOCONCESSIVO")
    @Temporal(value=TemporalType.DATE)
    @Required
    private Date dataFinalDoPeriodoConcessivo;
    @Column(name="IQTDIASFERIAS")
    @ValidValue(validRule=PrazoDeFeriasValidRule.class)
    @Required
    private Integer prazo = 30;
    @Column(name="STPSITUACAOFERIAS", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="SituacaoDaFeriasEnum")})
    @NotNull
    private SituacaoDaFeriasEnum situacao = SituacaoDaFeriasEnum.GOZADAS;
    @Column(name="SFLDOBRAGERAL", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @Required
    private Boolean dobraGeral = false;
    @Column(name="SFLABONOFERIAS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @ValidValue(validRule=AbonoDeFeriasValidRule.class)
    @Required
    private Boolean abono = false;
    @Column(name="IQTDIASABONO")
    @ValidValue(validRule=DiasDeAbonoValidRule.class)
    @Required
    private Integer quantidadeDiasAbono = DIAS_ABONO_PADRAO;
    @Column(name="DDTINICIOPRIMEIROPERIODO")
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=PeriodoDeGozoValidRule.class, flag=0)
    private Date dataInicialDoPeriodoDeGozo1;
    @Column(name="DDTTERMINOPRIMEIROPERIODO")
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=PeriodoDeGozoValidRule.class, flag=1)
    private Date dataFinalDoPeriodoDeGozo1;
    @Column(name="SFLDOBRAPRIMEIROPERIODO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @Required
    private Boolean dobraDoPeriodoDeGozo1 = false;
    @Column(name="DDTINICIOSEGUNDOPERIODO")
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=PeriodoDeGozoValidRule.class, flag=2)
    private Date dataInicialDoPeriodoDeGozo2;
    @Column(name="DDTTERMINOSEGUNDOPERIODO")
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=PeriodoDeGozoValidRule.class, flag=3)
    private Date dataFinalDoPeriodoDeGozo2;
    @Column(name="SFLDOBRASEGUNDOPERIODO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @Required
    private Boolean dobraDoPeriodoDeGozo2 = false;
    @Column(name="DDTINICIOTERCEIROPERIODO")
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=PeriodoDeGozoValidRule.class, flag=4)
    private Date dataInicialDoPeriodoDeGozo3;
    @Column(name="DDTTERMINOTERCEIROPERIODO")
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=PeriodoDeGozoValidRule.class, flag=5)
    private Date dataFinalDoPeriodoDeGozo3;
    @Column(name="SFLDOBRATERCEIROPERIODO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @Required
    private Boolean dobraDoPeriodoDeGozo3 = false;
    @Transient
    private Periodo periodoAquisitivo;
    @Transient
    private Periodo periodoConcessivo;

    public Ferias() {
        super(RepositorioDeFerias.class);
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

    public Long getId() {
        return this.id;
    }

    public void setPeriodoAquisitivo(Periodo periodo) {
        this.periodoAquisitivo = periodo;
        this.setDataInicialDoPeriodoAquisitivo(periodo.getInicial());
        this.setDataFinalDoPeriodoAquisitivo(periodo.getFinal());
    }

    public Periodo getPeriodoAquisitivo() {
        if (Utils.nulo(this.periodoAquisitivo)) {
            this.periodoAquisitivo = new Periodo(this.getDataInicialDoPeriodoAquisitivo(), this.getDataFinalDoPeriodoAquisitivo());
        }
        return this.periodoAquisitivo;
    }

    public Periodo getPeriodoDeGozo1() {
        return new Periodo(this.getDataInicialDoPeriodoDeGozo1(), this.getDataFinalDoPeriodoDeGozo1());
    }

    public Periodo getPeriodoDeGozo2() {
        return new Periodo(this.getDataInicialDoPeriodoDeGozo2(), this.getDataFinalDoPeriodoDeGozo2());
    }

    public Periodo getPeriodoDeGozo3() {
        return new Periodo(this.getDataInicialDoPeriodoDeGozo3(), this.getDataFinalDoPeriodoDeGozo3());
    }

    public void setPeriodoConcessivo(Periodo periodo) {
        this.periodoConcessivo = periodo;
        this.setDataInicialDoPeriodoConcessivo(periodo.getInicial());
        this.setDataFinalDoPeriodoConcessivo(periodo.getFinal());
    }

    public Periodo getPeriodoConcessivo() {
        if (Utils.nulo(this.periodoConcessivo)) {
            this.periodoConcessivo = new Periodo(this.getDataInicialDoPeriodoConcessivo(), this.getDataFinalDoPeriodoConcessivo());
        }
        return this.periodoConcessivo;
    }

    public void setPeriodoDeGozo1(Periodo periodo) {
        this.setDataInicialDoPeriodoDeGozo1(periodo.getInicial());
        this.setDataFinalDoPeriodoDeGozo1(periodo.getFinal());
    }

    public void setPeriodoDeGozo2(Periodo periodo) {
        this.setDataInicialDoPeriodoDeGozo2(periodo.getInicial());
        this.setDataFinalDoPeriodoDeGozo2(periodo.getFinal());
    }

    public void setPeriodoDeGozo3(Periodo periodo) {
        this.setDataInicialDoPeriodoDeGozo3(periodo.getInicial());
        this.setDataFinalDoPeriodoDeGozo3(periodo.getFinal());
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public String getRelativa() {
        return this.relativa;
    }

    public void setRelativa(String relativa) {
        this.relativa = relativa;
    }

    public Date getDataInicialDoPeriodoAquisitivo() {
        return this.dataInicialDoPeriodoAquisitivo;
    }

    public void setDataInicialDoPeriodoAquisitivo(Date dataInicialDoPeriodoAquisitivo) {
        this.dataInicialDoPeriodoAquisitivo = dataInicialDoPeriodoAquisitivo;
    }

    public Date getDataFinalDoPeriodoAquisitivo() {
        return this.dataFinalDoPeriodoAquisitivo;
    }

    public void setDataFinalDoPeriodoAquisitivo(Date dataFinalDoPeriodoAquisitivo) {
        this.dataFinalDoPeriodoAquisitivo = dataFinalDoPeriodoAquisitivo;
    }

    public Date getDataInicialDoPeriodoConcessivo() {
        return this.dataInicialDoPeriodoConcessivo;
    }

    public void setDataInicialDoPeriodoConcessivo(Date dataInicialDoPeriodoConcessivo) {
        this.dataInicialDoPeriodoConcessivo = dataInicialDoPeriodoConcessivo;
    }

    public Date getDataFinalDoPeriodoConcessivo() {
        return this.dataFinalDoPeriodoConcessivo;
    }

    public void setDataFinalDoPeriodoConcessivo(Date dataFinalDoPeriodoConcessivo) {
        this.dataFinalDoPeriodoConcessivo = dataFinalDoPeriodoConcessivo;
    }

    public Boolean getAbono() {
        return this.abono;
    }

    public void setAbono(Boolean abono) {
        this.abono = abono;
    }

    public Integer getQuantidadeDiasAbono() {
        return this.quantidadeDiasAbono;
    }

    public void setQuantidadeDiasAbono(Integer quantidadeDiasAbono) {
        this.quantidadeDiasAbono = quantidadeDiasAbono;
    }

    public SituacaoDaFeriasEnum getSituacao() {
        return this.situacao;
    }

    public void setSituacao(SituacaoDaFeriasEnum situacao) {
        this.situacao = situacao;
    }

    public Date getDataInicialDoPeriodoDeGozo1() {
        return this.dataInicialDoPeriodoDeGozo1;
    }

    public void setDataInicialDoPeriodoDeGozo1(Date dataInicialDoPeriodoDeGozo1) {
        this.dataInicialDoPeriodoDeGozo1 = dataInicialDoPeriodoDeGozo1;
    }

    public Date getDataFinalDoPeriodoDeGozo1() {
        return this.dataFinalDoPeriodoDeGozo1;
    }

    public void setDataFinalDoPeriodoDeGozo1(Date dataFinalDoPeriodoDeGozo1) {
        this.dataFinalDoPeriodoDeGozo1 = dataFinalDoPeriodoDeGozo1;
    }

    public Date getDataInicialDoPeriodoDeGozo2() {
        return this.dataInicialDoPeriodoDeGozo2;
    }

    public void setDataInicialDoPeriodoDeGozo2(Date dataInicialDoPeriodoDeGozo2) {
        this.dataInicialDoPeriodoDeGozo2 = dataInicialDoPeriodoDeGozo2;
    }

    public Date getDataFinalDoPeriodoDeGozo2() {
        return this.dataFinalDoPeriodoDeGozo2;
    }

    public void setDataFinalDoPeriodoDeGozo2(Date dataFinalDoPeriodoDeGozo2) {
        this.dataFinalDoPeriodoDeGozo2 = dataFinalDoPeriodoDeGozo2;
    }

    public Date getDataInicialDoPeriodoDeGozo3() {
        return this.dataInicialDoPeriodoDeGozo3;
    }

    public void setDataInicialDoPeriodoDeGozo3(Date dataInicialDoPeriodoDeGozo3) {
        this.dataInicialDoPeriodoDeGozo3 = dataInicialDoPeriodoDeGozo3;
    }

    public Date getDataFinalDoPeriodoDeGozo3() {
        return this.dataFinalDoPeriodoDeGozo3;
    }

    public void setDataFinalDoPeriodoDeGozo3(Date dataFinalDoPeriodoDeGozo3) {
        this.dataFinalDoPeriodoDeGozo3 = dataFinalDoPeriodoDeGozo3;
    }

    public Integer getPrazo() {
        return this.prazo;
    }

    public void setPrazo(Integer prazo) {
        this.prazo = prazo;
    }

    public Boolean getDobraGeral() {
        return this.dobraGeral;
    }

    public void setDobraGeral(Boolean dobraGeral) {
        this.dobraGeral = dobraGeral;
    }

    public Boolean getDobraDoPeriodoDeGozo1() {
        return this.dobraDoPeriodoDeGozo1;
    }

    public void setDobraDoPeriodoDeGozo1(Boolean dobraDoPeriodoDeGozo1) {
        this.dobraDoPeriodoDeGozo1 = dobraDoPeriodoDeGozo1;
    }

    public Boolean getDobraDoPeriodoDeGozo2() {
        return this.dobraDoPeriodoDeGozo2;
    }

    public void setDobraDoPeriodoDeGozo2(Boolean dobraDoPeriodoDeGozo2) {
        this.dobraDoPeriodoDeGozo2 = dobraDoPeriodoDeGozo2;
    }

    public Boolean getDobraDoPeriodoDeGozo3() {
        return this.dobraDoPeriodoDeGozo3;
    }

    public void setDobraDoPeriodoDeGozo3(Boolean dobraDoPeriodoDeGozo3) {
        this.dobraDoPeriodoDeGozo3 = dobraDoPeriodoDeGozo3;
    }

    @Override
    protected EntidadeBase validar() {
        GerenciadorDeValidadores.getInstance().validar(Ferias.class, this);
        return this;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public void limparPeriodosDeGozos() {
        this.setDataInicialDoPeriodoDeGozo1(null);
        this.setDataFinalDoPeriodoDeGozo1(null);
        this.setDataInicialDoPeriodoDeGozo2(null);
        this.setDataFinalDoPeriodoDeGozo2(null);
        this.setDataInicialDoPeriodoDeGozo3(null);
        this.setDataFinalDoPeriodoDeGozo3(null);
    }

    public void sugerirPrazo() {
        int faltasNaoJustificadas = this.getCalculo().obterFaltasNaoJustificadas(this.getPeriodoAquisitivo());
        CalculoDoPrazoDeFerias calculoDoPrazoDeFerias = CalculoDoPrazoDeFerias.getInstance();
        calculoDoPrazoDeFerias.parametros(this.getPeriodoAquisitivo().getFinal(), this.calculo.getRegimeDoContrato(), faltasNaoJustificadas).executar();
        int prazo = calculoDoPrazoDeFerias.getResultado();
        this.setPrazo(prazo);
    }

    public void sugerirPrimeiroPeriodosDeGozos() {
        if (Utils.naoNulo(this.getCalculo().getInicioFeriasColetivas()) && HelperDate.dateBefore(this.getDataFinalDoPeriodoAquisitivo(), this.getCalculo().getInicioFeriasColetivas())) {
            Date dataInicial = this.getCalculo().getInicioFeriasColetivas();
            Periodo periodoDeGozo = new Periodo(dataInicial, HelperDate.getInstance(dataInicial).addDay(this.prazo - 1).getDate());
            this.setPeriodoDeGozo1(periodoDeGozo);
        } else if (SituacaoDaFeriasEnum.GOZADAS.equals((Object)this.getSituacao()) && Utils.naoNulos(this.dataFinalDoPeriodoConcessivo, this.prazo) && this.prazo > 0) {
            Date dataInicial = HelperDate.getInstance(this.dataFinalDoPeriodoConcessivo).addDay(-(this.prazo - 1)).getDate();
            Periodo periodoDeGozo = new Periodo(dataInicial, this.dataFinalDoPeriodoConcessivo);
            this.setPeriodoDeGozo1(periodoDeGozo);
        }
    }

    public String toString() {
        return super.toString("id", "relativa");
    }

    @Override
    public int hashCode() {
        return this.getHashCodeBuilder().append((Object)this.prazo).append((Object)this.situacao).append((Object)this.dobraGeral).append((Object)this.abono).append((Object)this.dataInicialDoPeriodoDeGozo1).append((Object)this.dataFinalDoPeriodoDeGozo1).append((Object)this.dobraDoPeriodoDeGozo1).append((Object)this.dataInicialDoPeriodoDeGozo2).append((Object)this.dataFinalDoPeriodoDeGozo2).append((Object)this.dobraDoPeriodoDeGozo2).append((Object)this.dataInicialDoPeriodoDeGozo3).append((Object)this.dataFinalDoPeriodoDeGozo3).append((Object)this.dobraDoPeriodoDeGozo3).hashCode();
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
        return this.getEqualsBuilder(obj).append((Object)this.prazo, (Object)((Ferias)obj).prazo).append((Object)this.situacao, (Object)((Ferias)obj).situacao).append((Object)this.dobraGeral, (Object)((Ferias)obj).dobraGeral).append((Object)this.abono, (Object)((Ferias)obj).abono).append((Object)this.dataInicialDoPeriodoDeGozo1, (Object)((Ferias)obj).dataInicialDoPeriodoDeGozo1).append((Object)this.dataFinalDoPeriodoDeGozo1, (Object)((Ferias)obj).dataFinalDoPeriodoDeGozo1).append((Object)this.dobraDoPeriodoDeGozo1, (Object)((Ferias)obj).dobraDoPeriodoDeGozo1).append((Object)this.dataInicialDoPeriodoDeGozo2, (Object)((Ferias)obj).dataInicialDoPeriodoDeGozo2).append((Object)this.dataFinalDoPeriodoDeGozo2, (Object)((Ferias)obj).dataFinalDoPeriodoDeGozo2).append((Object)this.dobraDoPeriodoDeGozo2, (Object)((Ferias)obj).dobraDoPeriodoDeGozo2).append((Object)this.dataInicialDoPeriodoDeGozo3, (Object)((Ferias)obj).dataInicialDoPeriodoDeGozo3).append((Object)this.dataFinalDoPeriodoDeGozo3, (Object)((Ferias)obj).dataFinalDoPeriodoDeGozo3).append((Object)this.dobraDoPeriodoDeGozo3, (Object)((Ferias)obj).dobraDoPeriodoDeGozo3).isEquals();
    }

    public static int encontrarPrazoFeriasProporcionais(ParametroDoTermo parametro) {
        if (Utils.naoNulo(parametro.getCalculo().getPrazoFeriasProporcional())) {
            return parametro.getCalculo().getPrazoFeriasProporcional();
        }
        int faltasNaoJustificadas = parametro.getCalculo().obterFaltasNaoJustificadas(parametro.getPeriodoAquisitivo());
        CalculoDoPrazoDeFerias calculoDoPrazoDeFerias = CalculoDoPrazoDeFerias.getInstance();
        calculoDoPrazoDeFerias.parametros(parametro.getPeriodoAquisitivo().getFinal(), parametro.getCalculo().getRegimeDoContrato(), faltasNaoJustificadas).executar();
        return calculoDoPrazoDeFerias.getResultado();
    }
}

