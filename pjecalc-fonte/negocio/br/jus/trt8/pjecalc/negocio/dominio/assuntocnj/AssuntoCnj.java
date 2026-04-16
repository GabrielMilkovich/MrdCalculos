/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.Table
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.assuntocnj;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.assuntocnj.RepositorioDeAssuntoCnj;
import java.io.Serializable;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBASSUNTOCNJ")
@Name(value="assuntoCnj")
public class AssuntoCnj
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = -3560496347594956594L;
    @Id
    @Column(name="ICDASSUNTO")
    private Long id;
    @Column(name="SDSASSUNTO", columnDefinition="VARCHAR2(50)")
    @NotNull
    private String assunto;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="ICDASSUNTOPAI")
    private AssuntoCnj pai;
    @OneToMany(fetch=FetchType.LAZY)
    @JoinColumn(name="ICDASSUNTOPAI")
    private List<AssuntoCnj> filhos;

    public AssuntoCnj() {
        super(RepositorioDeAssuntoCnj.class);
    }

    public AssuntoCnj(Long id) {
        this();
        this.id = id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public static List<AssuntoCnj> obterRaizes() {
        return AssuntoCnj.getRepositorio(RepositorioDeAssuntoCnj.class).obterRaizes();
    }

    public String getAssunto() {
        return this.assunto;
    }

    public void setAssunto(String assunto) {
        this.assunto = assunto;
    }

    public AssuntoCnj getPai() {
        return this.pai;
    }

    public void setPai(AssuntoCnj pai) {
        this.pai = pai;
    }

    public List<AssuntoCnj> getFilhos() {
        return this.filhos;
    }

    public void setFilhos(List<AssuntoCnj> filhos) {
        this.filhos = filhos;
    }

    public Long getId() {
        return this.id;
    }

    public static AssuntoCnj obter(Object id) {
        return (AssuntoCnj)AssuntoCnj.obter(RepositorioDeAssuntoCnj.class, id);
    }

    public String toString() {
        return this.getId() + " - " + this.getAssunto();
    }
}

