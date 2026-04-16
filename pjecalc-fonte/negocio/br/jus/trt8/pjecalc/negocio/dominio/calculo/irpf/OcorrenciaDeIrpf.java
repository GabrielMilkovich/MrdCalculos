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
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOcorrenciaIrpfEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.RepositorioDeOcorrenciaDeIrpf;
import java.math.BigDecimal;
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
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBOCORRENCIAIMPOSTORENDA")
@SequenceGenerator(name="SQOCORRENCIAIMPOSTORENDA", sequenceName="SQOCORRENCIAIMPOSTORENDA", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="ocorrenciaDeIrpf")
public class OcorrenciaDeIrpf
extends EntidadeBase {
    private static final long serialVersionUID = -6920709791570963120L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAIMPOSTORENDA")
    @Column(name="IIDOCORRENCIAIMPOSTORENDA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDIMPOSTORENDACALCULO")
    private Irpf irpf;
    @Column(name="DDTOCORRENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataOcorrencia;
    @Column(name="RVLVERBAS", precision=38, scale=25)
    private BigDecimal valorVerbas;
    @Column(name="RVLJUROS", precision=38, scale=25)
    private BigDecimal valorJuros;
    @Column(name="RVLCONTRIBUICAOSOCIAL", precision=38, scale=25)
    private BigDecimal valorContribuicaoSocial;
    @Column(name="RVLPREVIDENCIAPRIVADA", precision=38, scale=25)
    private BigDecimal valorPrevidenciaPrivada;
    @Column(name="RVLPENSAOALIMENTICIA", precision=38, scale=25)
    private BigDecimal valorPensaoAlimenticia;
    @Column(name="RVLHONORARIOS", precision=38, scale=25)
    private BigDecimal valorHonorarios;
    @Column(name="RVLDEPENDENTES", precision=38, scale=25)
    private BigDecimal valorDependentes;
    @Column(name="RVLAPOSENTADOMAIORQUEMEIACINCO", precision=38, scale=25)
    private BigDecimal valorAposentadoMaiorQue65;
    @Column(name="RVLBASE", precision=38, scale=25)
    private BigDecimal valorBase;
    @Column(name="IQTCOMPETENCIAS", nullable=true)
    private Integer quantidadeCompetencias;
    @Column(name="RVLINICIALFAIXA", precision=19, scale=2, nullable=false)
    private BigDecimal valorInicialFaixa;
    @Column(name="RVLFINALFAIXA", precision=19, scale=2, nullable=true)
    private BigDecimal valorFinalFaixa;
    @Column(name="RVLALIQUOTA", precision=5, scale=2, nullable=false)
    private BigDecimal valorAliquota;
    @Column(name="RVLDEDUCAO", precision=19, scale=2, nullable=false)
    private BigDecimal valorDeducao;
    @Column(name="RVLDEVIDO", precision=38, scale=25, nullable=false)
    private BigDecimal valorDevido;
    @Column(name="STPOCORRENCIA", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoOcorrenciaIrpfEnum")})
    private final TipoOcorrenciaIrpfEnum tipo;
    @Transient
    private boolean precisaAtualizarBase = true;
    @Transient
    private boolean precisaAtualizarDevido = true;

    public OcorrenciaDeIrpf() {
        super(RepositorioDeOcorrenciaDeIrpf.class);
        this.tipo = TipoOcorrenciaIrpfEnum.NORMAL;
    }

    public OcorrenciaDeIrpf(TipoOcorrenciaIrpfEnum tipo) {
        super(RepositorioDeOcorrenciaDeIrpf.class);
        this.tipo = tipo;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
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

    public Irpf getIrpf() {
        return this.irpf;
    }

    public void setIrpf(Irpf irpf) {
        this.irpf = irpf;
    }

    public Date getDataOcorrencia() {
        return this.dataOcorrencia;
    }

    public void setDataOcorrencia(Date dataOcorrencia) {
        this.dataOcorrencia = dataOcorrencia;
    }

    public BigDecimal getValorVerbas() {
        return this.valorVerbas;
    }

    public void setValorVerbas(BigDecimal valorVerbas) {
        this.valorVerbas = valorVerbas;
        this.precisaAtualizarBase = true;
    }

    public BigDecimal getValorJuros() {
        return this.valorJuros;
    }

    public void setValorJuros(BigDecimal valorJuros) {
        this.valorJuros = valorJuros;
        this.precisaAtualizarBase = true;
    }

    public BigDecimal getValorContribuicaoSocial() {
        return this.valorContribuicaoSocial;
    }

    public void setValorContribuicaoSocial(BigDecimal valorContribuicaoSocial) {
        this.valorContribuicaoSocial = valorContribuicaoSocial;
        this.precisaAtualizarBase = true;
    }

    public BigDecimal getValorPrevidenciaPrivada() {
        return this.valorPrevidenciaPrivada;
    }

    public void setValorPrevidenciaPrivada(BigDecimal valorPrevidenciaPrivada) {
        this.valorPrevidenciaPrivada = valorPrevidenciaPrivada;
        this.precisaAtualizarBase = true;
    }

    public BigDecimal getValorPensaoAlimenticia() {
        return this.valorPensaoAlimenticia;
    }

    public void setValorPensaoAlimenticia(BigDecimal valorPensaoAlimenticia) {
        this.valorPensaoAlimenticia = valorPensaoAlimenticia;
        this.precisaAtualizarBase = true;
    }

    public BigDecimal getValorHonorarios() {
        return this.valorHonorarios;
    }

    public void setValorHonorarios(BigDecimal valorHonorarios) {
        this.valorHonorarios = valorHonorarios;
        this.precisaAtualizarBase = true;
    }

    public BigDecimal getValorDependentes() {
        return this.valorDependentes;
    }

    public void setValorDependentes(BigDecimal valorDependentes) {
        this.valorDependentes = valorDependentes;
        this.precisaAtualizarBase = true;
    }

    public BigDecimal getValorAposentadoMaiorQue65() {
        return this.valorAposentadoMaiorQue65;
    }

    public void setValorAposentadoMaiorQue65(BigDecimal valorAposentadoMaiorQue65) {
        this.valorAposentadoMaiorQue65 = valorAposentadoMaiorQue65;
        this.precisaAtualizarBase = true;
    }

    public BigDecimal getValorBase() {
        if (this.precisaAtualizarBase) {
            BigDecimal base = BigDecimal.ZERO;
            base = Utils.somar(base, this.getValorVerbas(), base);
            base = Utils.somar(base, this.getValorJuros(), base);
            base = Utils.subtrair(base, this.getValorContribuicaoSocial(), base);
            base = Utils.subtrair(base, this.getValorPrevidenciaPrivada(), base);
            base = Utils.subtrair(base, this.getValorPensaoAlimenticia(), base);
            base = Utils.subtrair(base, this.getValorHonorarios(), base);
            base = Utils.subtrair(base, this.getValorDependentes(), base);
            if ((base = Utils.subtrair(base, this.getValorAposentadoMaiorQue65(), base)).compareTo(BigDecimal.ZERO) < 0) {
                base = BigDecimal.ZERO;
            }
            this.valorBase = base;
            this.precisaAtualizarBase = false;
        }
        return this.valorBase;
    }

    public Integer getQuantidadeCompetencias() {
        return this.quantidadeCompetencias;
    }

    public void setQuantidadeCompetencias(Integer quantidadeCompetencias) {
        this.quantidadeCompetencias = quantidadeCompetencias;
    }

    public BigDecimal getValorInicialFaixa() {
        return this.valorInicialFaixa;
    }

    public void setValorInicialFaixa(BigDecimal valorInicialFaixa) {
        this.valorInicialFaixa = valorInicialFaixa;
    }

    public BigDecimal getValorFinalFaixa() {
        return this.valorFinalFaixa;
    }

    public void setValorFinalFaixa(BigDecimal valorFinalFaixa) {
        this.valorFinalFaixa = valorFinalFaixa;
    }

    public BigDecimal getValorAliquota() {
        return this.valorAliquota;
    }

    public void setValorAliquota(BigDecimal valorAliquota) {
        this.valorAliquota = valorAliquota;
        this.precisaAtualizarDevido = true;
    }

    public BigDecimal getValorDeducao() {
        return this.valorDeducao;
    }

    public void setValorDeducao(BigDecimal valorDeducao) {
        this.valorDeducao = valorDeducao;
        this.precisaAtualizarDevido = true;
    }

    public void atualizaBase() {
        this.precisaAtualizarBase = true;
        this.getValorBase();
    }

    public void atualizaValorDevido() {
        this.precisaAtualizarDevido = true;
        this.getValorDevido();
    }

    public BigDecimal getValorDevido() {
        if (this.precisaAtualizarBase || this.precisaAtualizarDevido) {
            BigDecimal devido = Utils.multiplicar(this.getValorBase(), Utils.obterPercentualPara(this.getValorAliquota()));
            if ((devido = Utils.subtrair(devido, this.getValorDeducao())).compareTo(BigDecimal.ZERO) < 0) {
                devido = BigDecimal.ZERO;
            }
            this.valorDevido = devido;
            this.precisaAtualizarDevido = false;
        }
        return this.valorDevido;
    }

    public TipoOcorrenciaIrpfEnum getTipo() {
        return this.tipo;
    }
}

