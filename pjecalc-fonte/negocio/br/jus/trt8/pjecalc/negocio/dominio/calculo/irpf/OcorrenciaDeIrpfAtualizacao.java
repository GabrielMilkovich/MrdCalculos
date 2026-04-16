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
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.RepositorioDeOcorrenciaDeIrpfAtualizacao;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
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
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBOCORRENCIAIRPFATUALIZACAO")
@SequenceGenerator(name="SQOCORRENCIAIRPFATUALIZACAO", sequenceName="SQOCORRENCIAIRPFATUALIZACAO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="ocorrenciaDeIrpfAtualizacao")
public class OcorrenciaDeIrpfAtualizacao
extends EntidadeBase {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAIRPFATUALIZACAO")
    @Column(name="IIDOCORRENCIAIRPFATUALIZACAO")
    private final Long id = null;
    @Column(name="SFLTEMPAGAMENTO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean hasPagamento = Boolean.TRUE;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDIMPOSTORENDACALCULO")
    private Irpf irpf;
    @Column(name="DDTOCORRENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataOcorrencia;
    @Column(name="DDTEVENTO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataEvento;
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
    @Column(name="RVLCOMPETENCIAS", nullable=true)
    private BigDecimal quantidadeCompetencias;
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

    public OcorrenciaDeIrpfAtualizacao() {
        super(RepositorioDeOcorrenciaDeIrpfAtualizacao.class);
        this.tipo = TipoOcorrenciaIrpfEnum.NORMAL;
    }

    public OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum tipo) {
        super(RepositorioDeOcorrenciaDeIrpfAtualizacao.class);
        this.tipo = tipo;
    }

    public static void salvar(OcorrenciaDeIrpfAtualizacao ocorrenciaAtualizacao) {
        OcorrenciaDeIrpfAtualizacao.getRepositorio(RepositorioDeOcorrenciaDeIrpfAtualizacao.class).salvar(ocorrenciaAtualizacao);
    }

    public static List<OcorrenciaDeIrpfAtualizacao> obterAteDataEvento(Irpf irpf, Date dataEvento) {
        return OcorrenciaDeIrpfAtualizacao.getRepositorio(RepositorioDeOcorrenciaDeIrpfAtualizacao.class).obterAteDataEvento(irpf, dataEvento);
    }

    public static List<OcorrenciaDeIrpfAtualizacao> obterOcorrenciasDaData(Irpf irpf, Date dataEvento) {
        return OcorrenciaDeIrpfAtualizacao.getRepositorio(RepositorioDeOcorrenciaDeIrpfAtualizacao.class).obterOcorrenciasDaData(irpf, dataEvento);
    }

    public static BigDecimal somaQuantidadeCompetenciasAteOSaldo(Irpf irpf) {
        BigDecimal somaQuantidadeCompetenciasAteOSaldo = OcorrenciaDeIrpfAtualizacao.getRepositorio(RepositorioDeOcorrenciaDeIrpfAtualizacao.class).somaQuantidadeCompetenciasAteOSaldo(irpf);
        return somaQuantidadeCompetenciasAteOSaldo != null ? somaQuantidadeCompetenciasAteOSaldo : BigDecimal.ZERO;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
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

    public BigDecimal getQuantidadeCompetencias() {
        return this.quantidadeCompetencias;
    }

    public void setQuantidadeCompetencias(BigDecimal quantidadeCompetencias) {
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

    public Date getDataEvento() {
        return this.dataEvento;
    }

    public void setDataEvento(Date dataEvento) {
        this.dataEvento = dataEvento;
    }

    public void setValorBase(BigDecimal valorBase) {
        this.valorBase = valorBase;
    }

    public void setValorDevido(BigDecimal valorDevido) {
        this.valorDevido = valorDevido;
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
        if (!super.equals(obj)) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        OcorrenciaDeIrpfAtualizacao other = (OcorrenciaDeIrpfAtualizacao)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }

    public Boolean getHasPagamento() {
        return this.hasPagamento;
    }

    public void setHasPagamento(Boolean hasPagamento) {
        this.hasPagamento = hasPagamento;
    }
}

