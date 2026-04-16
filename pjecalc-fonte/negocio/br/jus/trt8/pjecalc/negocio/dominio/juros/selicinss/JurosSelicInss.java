/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.selicinss;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicinss.RepositorioDeJurosSelicInss;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBJUROSSELICINSS")
@SequenceGenerator(name="SQJUROSSELICINSS", sequenceName="SQJUROSSELICINSS", allocationSize=1)
@Name(value="jurosSelicInss")
public class JurosSelicInss
extends EntidadeBase {
    private static final long serialVersionUID = 8616200608062397084L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQJUROSSELICINSS")
    @Column(name="IIDJUROSSELICINSS", nullable=false)
    private final Long id = null;
    @Column(name="DDTCOMPETENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date competencia;
    @Column(name="DDTCOMPETENCIAREFERENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date competenciaReferencia;
    @Column(name="RVLTAXASELIC", precision=19, scale=6)
    @NotNull
    private BigDecimal taxa;
    @Transient
    private BigDecimal taxaAcumulada;
    @Transient
    private boolean alteracao = false;

    public JurosSelicInss() {
        super(RepositorioDeJurosSelicInss.class);
    }

    public Date getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    public Date getCompetenciaReferencia() {
        return this.competenciaReferencia;
    }

    public void setCompetenciaReferencia(Date competenciaReferencia) {
        this.competenciaReferencia = competenciaReferencia;
    }

    public BigDecimal getTaxa() {
        return this.taxa;
    }

    public void setTaxa(BigDecimal taxa) {
        this.taxa = taxa;
    }

    public BigDecimal getTaxaAcumulada() {
        return this.taxaAcumulada;
    }

    public void setTaxaAcumulada(BigDecimal taxaAcumulada) {
        this.taxaAcumulada = taxaAcumulada;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public boolean isAlteracao() {
        return this.alteracao;
    }

    public void setAlteracao(boolean alteracao) {
        this.alteracao = alteracao;
    }

    @Override
    protected JurosSelicInss validar() {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.taxa)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "aliquotaSelic", Mensagens.MSG0003, "Al\u00edquota"));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    public static void remover(JurosSelicInss entidade) {
        JurosSelicInss.remover(RepositorioDeJurosSelicInss.class, entidade, true);
    }

    public static List<JurosSelicInss> obterTodos() {
        return JurosSelicInss.getRepositorio(RepositorioDeJurosSelicInss.class).obterTodos();
    }

    public static List<JurosSelicInss> obterTodosPorPeriodo(Date dataInicio, Date dataFim) {
        return JurosSelicInss.getRepositorio(RepositorioDeJurosSelicInss.class).obterTodosPorPeriodo(dataInicio, dataFim);
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.competencia == null ? 0 : this.competencia.hashCode());
        result = 31 * result + (this.taxa == null ? 0 : this.taxa.hashCode());
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
        JurosSelicInss other = (JurosSelicInss)obj;
        if (this.competencia == null && other.competencia != null || this.competencia != null && !this.competencia.equals(other.competencia)) {
            return false;
        }
        return !(this.taxa == null ? other.taxa != null : !this.taxa.equals(other.taxa));
    }
}

