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
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AtividadeEconomica;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.RepositorioDeAliquotasEmpresaPorAtividadeEconomica;
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
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBALIQUOTAEMPRESAPORATIVIDADE")
@SequenceGenerator(name="SQALIQUOTAEMPRESAPORATIVIDADE", sequenceName="SQALIQUOTAEMPRESAPORATIVIDADE", allocationSize=1)
@Name(value="aliquotasEmpresaPorAtividadeEconomica")
public class AliquotasEmpresaPorAtividadeEconomica
extends EntidadeBase {
    private static final long serialVersionUID = 4560234124035905212L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQALIQUOTAEMPRESAPORATIVIDADE")
    @Column(name="IIDALIQUOTAEMPRESAPORATIVIDADE", nullable=false)
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDATIVIDADEECONOMICA")
    private AtividadeEconomica atividadeEconomica;
    @Column(name="DDTINICIAL", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataInicial;
    @Column(name="DDTFINAL", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataFinal;
    @Column(name="RVLALIQUOTA", precision=5, scale=2)
    private BigDecimal aliquota;
    @Column(name="RVLTETO", precision=19, scale=2)
    private BigDecimal teto;

    public AliquotasEmpresaPorAtividadeEconomica() {
        super(RepositorioDeAliquotasEmpresaPorAtividadeEconomica.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public AtividadeEconomica getAtividadeEconomica() {
        return this.atividadeEconomica;
    }

    public void setAtividadeEconomica(AtividadeEconomica atividadeEconomica) {
        this.atividadeEconomica = atividadeEconomica;
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

    public BigDecimal getAliquota() {
        return this.aliquota;
    }

    public void setAliquota(BigDecimal aliquota) {
        this.aliquota = aliquota;
    }

    public BigDecimal getTeto() {
        return this.teto;
    }

    public void setTeto(BigDecimal teto) {
        this.teto = teto;
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
        if (!super.equals(obj)) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        AliquotasEmpresaPorAtividadeEconomica other = (AliquotasEmpresaPorAtividadeEconomica)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }
}

