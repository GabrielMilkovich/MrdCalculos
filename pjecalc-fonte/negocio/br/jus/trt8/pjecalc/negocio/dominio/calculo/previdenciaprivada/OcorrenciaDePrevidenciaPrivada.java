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
 *  javax.persistence.Version
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.PrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.RepositorioDeOcorrenciaDePrevidenciaPrivada;
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
import javax.persistence.Version;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBOCORRENCIAPREVIDENCIAPRIVADA")
@SequenceGenerator(name="SQOCORRENCIAPREVIDENCIAPRIVADA", sequenceName="SQOCORRENCIAPREVIDENCIAPRIVADA", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="ocorrenciaDePrevidenciaPrivada")
public class OcorrenciaDePrevidenciaPrivada
extends EntidadeBase {
    private static final long serialVersionUID = 4972642476016210482L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAPREVIDENCIAPRIVADA")
    @Column(name="IIDOCORRENCIAPREVIDENCIA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDPREVIDENCIAPRIVADA")
    private PrevidenciaPrivada previdenciaPrivada;
    @Column(name="DDTOCORRENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date competencia;
    @Column(name="RVLBASE", precision=19, scale=2)
    private BigDecimal valorBase;
    @Column(name="RVLALIQUOTA", precision=5, scale=2)
    private BigDecimal aliquota;
    @Column(name="RVLINDICEUTILIZADO", precision=38, scale=38)
    private BigDecimal indiceAcumulado;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaDeJuros;

    public OcorrenciaDePrevidenciaPrivada() {
        super(RepositorioDeOcorrenciaDePrevidenciaPrivada.class);
    }

    public OcorrenciaDePrevidenciaPrivada(PrevidenciaPrivada previdenciaPrivada) {
        this();
        this.previdenciaPrivada = previdenciaPrivada;
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

    public PrevidenciaPrivada getPrevidenciaPrivada() {
        return this.previdenciaPrivada;
    }

    public void setPrevidenciaPrivada(PrevidenciaPrivada previdenciaPrivada) {
        this.previdenciaPrivada = previdenciaPrivada;
    }

    public Date getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    public BigDecimal getValorBase() {
        return this.valorBase;
    }

    public void setValorBase(BigDecimal valorBase) {
        this.valorBase = valorBase;
    }

    public BigDecimal getAliquota() {
        return this.aliquota;
    }

    public void setAliquota(BigDecimal aliquota) {
        this.aliquota = aliquota;
    }

    public BigDecimal getValorDevido() {
        if (Utils.nulo(this.aliquota)) {
            return null;
        }
        return this.getValorBase().multiply(this.getAliquota().divide(new BigDecimal("100"), Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getIndiceAcumulado() {
        return this.indiceAcumulado;
    }

    public void setIndiceAcumulado(BigDecimal indiceAcumulado) {
        this.indiceAcumulado = indiceAcumulado;
    }

    public BigDecimal getValorDevidoCorrigido() {
        BigDecimal valorDevido = this.getValorDevido();
        if (Utils.naoNulos(this.indiceAcumulado, valorDevido)) {
            return Utils.aplicarCorrecaoMonetaria(this.indiceAcumulado, valorDevido);
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getTaxaDeJuros() {
        return this.taxaDeJuros;
    }

    public void setTaxaDeJuros(BigDecimal taxaDeJuros) {
        this.taxaDeJuros = taxaDeJuros;
    }

    public Long getId() {
        return this.id;
    }

    public BigDecimal getJuros() {
        if (Utils.nulo(this.taxaDeJuros)) {
            return null;
        }
        return this.getValorDevidoCorrigido().multiply(Utils.obterPercentualPara(this.taxaDeJuros), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getTotal() {
        BigDecimal valorDevidoCorrigido = this.getValorDevidoCorrigido();
        if (Utils.naoNulo(valorDevidoCorrigido)) {
            return Utils.somar(valorDevidoCorrigido, this.getJuros(), valorDevidoCorrigido);
        }
        return null;
    }
}

