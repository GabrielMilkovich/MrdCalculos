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
 *  javax.persistence.Table
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.municipio;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import br.jus.trt8.pjecalc.negocio.dominio.municipio.RepositorioDeMunicipio;
import java.io.Serializable;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Name(value="municipio")
@Entity
@Table(name="TBMUNICIPIO")
public class Municipio
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = 4719393802875234675L;
    @Id
    @Column(name="ICDMUNICIPIO")
    private final Long id = null;
    @Column(name="SNMMUNICIPIO")
    private String nome;
    @Column(name="SFLCAPITAL", columnDefinition="CHAR(1)")
    private String indicadorCapital;
    @ManyToOne(fetch=FetchType.EAGER)
    @JoinColumn(name="SSGESTADO")
    private Estado estado;

    public Municipio() {
        super(RepositorioDeMunicipio.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getIndicadorCapital() {
        return this.indicadorCapital;
    }

    public void setIndicadorCapital(String indicadorCapital) {
        this.indicadorCapital = indicadorCapital;
    }

    public boolean isCapital() {
        return this.indicadorCapital != null && this.indicadorCapital.equals("S");
    }

    public Estado getEstado() {
        return this.estado;
    }

    public void setEstado(Estado estado) {
        this.estado = estado;
    }

    public String toString() {
        return super.toString("id", "nome", "estado", "indicadorCapital");
    }

    public static List<Municipio> obterTodasCapitais() {
        return Municipio.getRepositorio(RepositorioDeMunicipio.class).obterTodasCapitais();
    }

    public static List<Municipio> obterTodasPorEstado(Estado estado) {
        return Municipio.getRepositorio(RepositorioDeMunicipio.class).obterTodasPorEstado(estado);
    }

    public static Municipio obter(Object id) {
        return (Municipio)Municipio.obter(RepositorioDeMunicipio.class, id);
    }
}

