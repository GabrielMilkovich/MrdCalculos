/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.MappedSuperclass
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  org.hibernate.validator.NotNull
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import java.math.BigDecimal;
import java.util.Calendar;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.MappedSuperclass;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import org.hibernate.validator.NotNull;

@MappedSuperclass
public abstract class IndiceBase
extends EntidadeBase
implements IndiceDeCalculo {
    private static final long serialVersionUID = 4430399430031678954L;
    @Column(name="DDTCOMPETENCIAINDICE", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date competencia;
    @Column(name="RVLINDICE", precision=38, scale=25)
    @NotNull
    private BigDecimal taxa;
    @Column(name="DDTINCLUSAOINDICE", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataCriacao;
    @Transient
    private BigDecimal valorAcumulado;
    @Transient
    private Date competenciaParaVerAcumulado;

    public IndiceBase(Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio) {
        super(classeDoRepositorio);
        this.dataCriacao = Calendar.getInstance().getTime();
    }

    public IndiceBase(Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio, Date competencia, BigDecimal taxa) {
        super(classeDoRepositorio);
        this.competencia = competencia;
        this.taxa = taxa;
        this.dataCriacao = Calendar.getInstance().getTime();
    }

    @Override
    public Date getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    @Override
    public BigDecimal getTaxa() {
        return this.taxa;
    }

    public void setTaxa(BigDecimal taxa) {
        this.taxa = taxa;
    }

    public Date getDataCriacao() {
        return this.dataCriacao;
    }

    public void setDataCriacao(Date dataCriacao) {
        this.dataCriacao = dataCriacao;
    }

    @Override
    public BigDecimal getValorAcumulado() {
        return this.valorAcumulado;
    }

    @Override
    public void setValorAcumulado(BigDecimal valorAcumulado) {
        this.valorAcumulado = valorAcumulado;
    }

    public Date getCompetenciaParaVerAcumulado() {
        return this.competenciaParaVerAcumulado;
    }

    public void setCompetenciaParaVerAcumulado(Date competenciaParaVerAcumulado) {
        this.competenciaParaVerAcumulado = competenciaParaVerAcumulado;
    }

    @Override
    public BigDecimal getValorIndice() {
        return this.taxa.divide(new BigDecimal(100), Utils.CONTEXTO_MATEMATICO).add(BigDecimal.ONE);
    }

    protected IndiceBase validar(String nomeIndice) {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.competencia)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "mesAno" + nomeIndice, Mensagens.MSG0003, "M\u00eas/Ano"));
        }
        if (Utils.nulo(this.taxa)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "taxaMes" + nomeIndice, Mensagens.MSG0003, "Taxa do M\u00eas"));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    protected IndiceBase validarParaConsulta(String nomeIndice) {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.competencia)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "mesAnoConsulta" + nomeIndice, Mensagens.MSG0003, "'Tabela de'"));
        }
        if (Utils.naoNulo(this.competencia) && Utils.naoNulo(this.competenciaParaVerAcumulado) && HelperDate.dateAfterOrEquals(this.competenciaParaVerAcumulado, this.competencia)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "aPartirDe" + nomeIndice, Mensagens.MSG0009, "'A partir de'", "'Tabela de'"));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    @Override
    public abstract IndiceBase validar();

    public abstract IndiceBase validarParaConsulta();

    public abstract boolean existe();

    @Override
    public void salvar() {
        super.salvar();
    }

    @Override
    public int compareTo(IndiceDeCalculo o) {
        return o.getCompetencia().compareTo(this.competencia);
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.competencia == null ? 0 : this.competencia.hashCode());
        result = 31 * result + (this.obterChavePrimaria() == null ? 0 : this.obterChavePrimaria().hashCode());
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
        IndiceBase other = (IndiceBase)obj;
        if (this.competencia == null && other.competencia != null || this.competencia != null && !this.competencia.equals(other.competencia)) {
            return false;
        }
        if (this.obterChavePrimaria() == null ? other.obterChavePrimaria() != null : !this.obterChavePrimaria().equals(other.obterChavePrimaria())) {
            return false;
        }
        return super.equals(obj);
    }

    @Override
    public abstract IndiceBase clonar();
}

