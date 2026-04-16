/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.Id
 *  javax.persistence.OneToMany
 *  javax.persistence.OrderBy
 *  javax.persistence.Table
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AliquotasEmpresaPorAtividadeEconomica;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AliquotasRatPorAtividadeEconomica;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AliquotasTerceirosPorAtividadeEconomica;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.RepositorioDeAtividadeEconomica;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBATIVIDADEECONOMICA")
@Name(value="atividadeEconomica")
public class AtividadeEconomica
extends EntidadeBase {
    private static final long serialVersionUID = -384259634123389423L;
    @Id
    @Column(name="IIDATIVIDADEECONOMICA", nullable=false)
    private final Long id = null;
    @Column(name="SDSATIVIDADEECONOMICA", columnDefinition="VARCHAR2(255)", unique=true)
    private String descricao;
    @OneToMany(fetch=FetchType.LAZY, mappedBy="atividadeEconomica")
    @OrderBy(value="dataInicial")
    private List<AliquotasEmpresaPorAtividadeEconomica> aliquotasEmpresaDaAtividade;
    @OneToMany(fetch=FetchType.LAZY, mappedBy="atividadeEconomica")
    @OrderBy(value="dataInicial")
    private List<AliquotasRatPorAtividadeEconomica> aliquotasRatDaAtividade;
    @OneToMany(fetch=FetchType.LAZY, mappedBy="atividadeEconomica")
    @OrderBy(value="dataInicial")
    private List<AliquotasTerceirosPorAtividadeEconomica> aliquotasTerceirosDaAtividade;

    public AtividadeEconomica() {
        super(RepositorioDeAtividadeEconomica.class);
    }

    public String getDescricao() {
        return this.descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public List<AliquotasEmpresaPorAtividadeEconomica> getAliquotasEmpresaDaAtividade() {
        if (Utils.nulo(this.aliquotasEmpresaDaAtividade)) {
            this.aliquotasEmpresaDaAtividade = new ArrayList<AliquotasEmpresaPorAtividadeEconomica>();
        }
        return this.aliquotasEmpresaDaAtividade;
    }

    public void setAliquotasEmpresaDaAtividade(List<AliquotasEmpresaPorAtividadeEconomica> aliquotasEmpresaDaAtividade) {
        this.aliquotasEmpresaDaAtividade = aliquotasEmpresaDaAtividade;
    }

    public List<AliquotasRatPorAtividadeEconomica> getAliquotasRatDaAtividade() {
        if (Utils.nulo(this.aliquotasRatDaAtividade)) {
            this.aliquotasRatDaAtividade = new ArrayList<AliquotasRatPorAtividadeEconomica>();
        }
        return this.aliquotasRatDaAtividade;
    }

    public void setAliquotasRatDaAtividade(List<AliquotasRatPorAtividadeEconomica> aliquotasRatDaAtividade) {
        this.aliquotasRatDaAtividade = aliquotasRatDaAtividade;
    }

    public List<AliquotasTerceirosPorAtividadeEconomica> getAliquotasTerceirosDaAtividade() {
        if (Utils.nulo(this.aliquotasTerceirosDaAtividade)) {
            this.aliquotasTerceirosDaAtividade = new ArrayList<AliquotasTerceirosPorAtividadeEconomica>();
        }
        return this.aliquotasTerceirosDaAtividade;
    }

    public void setAliquotasTerceirosDaAtividade(List<AliquotasTerceirosPorAtividadeEconomica> aliquotasTerceirosDaAtividade) {
        this.aliquotasTerceirosDaAtividade = aliquotasTerceirosDaAtividade;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public static List<AtividadeEconomica> obterTodos() {
        return AtividadeEconomica.obterTodos(RepositorioDeAtividadeEconomica.class, " descricao");
    }

    public static AtividadeEconomica obter(Object id) {
        return (AtividadeEconomica)AtividadeEconomica.obter(RepositorioDeAtividadeEconomica.class, id);
    }

    public AtividadeVO getAtividadeVO() {
        return new AtividadeVO(this.getId(), this.getDescricao());
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
        AtividadeEconomica other = (AtividadeEconomica)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }

    public static class AtividadeVO {
        private Long id;
        private String descricao;

        public AtividadeVO(Long id, String descricao) {
            this.id = id;
            this.descricao = descricao;
        }

        public Long getId() {
            return this.id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getDescricao() {
            return this.descricao;
        }

        public void setDescricao(String descricao) {
            this.descricao = descricao;
        }
    }
}

