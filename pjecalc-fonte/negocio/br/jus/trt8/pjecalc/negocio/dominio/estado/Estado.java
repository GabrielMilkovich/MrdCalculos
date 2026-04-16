/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.OneToMany
 *  javax.persistence.Table
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.estado;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.estado.RepositorioDeEstado;
import br.jus.trt8.pjecalc.negocio.dominio.municipio.Municipio;
import java.io.Serializable;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Name(value="estado")
@Entity
@Table(name="TBESTADO")
public class Estado
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = -7988238781779946531L;
    @Id
    @Column(name="SSGESTADO", columnDefinition="CHAR(2)")
    private final String sigla;
    @Column(name="SNMESTADO")
    private String nome;
    @OneToMany(fetch=FetchType.LAZY)
    @JoinColumn(name="SSGESTADO")
    private List<Municipio> municipios;

    public Estado() {
        super(RepositorioDeEstado.class);
        this.sigla = null;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getSigla();
    }

    public static List<Estado> obterTodosOrdenado() {
        return Estado.getRepositorio(RepositorioDeEstado.class).obterTodosOrdenado();
    }

    public static Estado obterEstadoPadrao() {
        return Estado.getRepositorio(RepositorioDeEstado.class).obterEstadoPadrao();
    }

    public String getSigla() {
        return this.sigla;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public List<Municipio> getMunicipios() {
        return this.municipios;
    }

    public void setMunicipios(List<Municipio> municipios) {
        this.municipios = municipios;
    }

    public String toString() {
        return super.toString("sigla", "nome");
    }

    public static Estado obter(Object id) {
        return (Estado)Estado.obter(RepositorioDeEstado.class, id);
    }
}

