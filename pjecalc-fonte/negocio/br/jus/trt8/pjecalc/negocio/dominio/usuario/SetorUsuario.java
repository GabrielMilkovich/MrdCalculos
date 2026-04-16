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
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.usuario;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.constantes.InstanciaSetorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.Usuario;
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
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Name(value="setorUsuario")
@Entity
@Scope(value=ScopeType.SESSION)
@Table(name="TBSETORUSUARIO")
@SequenceGenerator(name="SQSETORUSUARIO", sequenceName="SQSETORUSUARIO", allocationSize=1)
public class SetorUsuario
extends EntidadeBase
implements Comparable<SetorUsuario> {
    private static final long serialVersionUID = -4635385845134198774L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQSETORUSUARIO")
    @Column(name="IIDSETORUSUARIO")
    private final Long id = null;
    @Column(name="IIDSETOR")
    private Integer setor = null;
    @Column(name="SNMSETOR")
    private String nomeSetor = null;
    @Column(name="STPINSTANCIA")
    private Character instancia = Character.valueOf('1');
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDUSUARIO")
    private Usuario usuario;

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public Integer getSetor() {
        return this.setor;
    }

    public Character getInstancia() {
        return this.instancia;
    }

    public Usuario getUsuario() {
        return this.usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public String getNomeSetor() {
        return this.nomeSetor;
    }

    @Override
    public int compareTo(SetorUsuario o) {
        if (InstanciaSetorEnum.PRIMEIRA.getValor().equals(this.instancia.toString()) && InstanciaSetorEnum.SEGUNDA.getValor().equals(o.getInstancia().toString())) {
            return -1;
        }
        if (InstanciaSetorEnum.SEGUNDA.getValor().equals(this.instancia.toString()) && InstanciaSetorEnum.PRIMEIRA.getValor().equals(o.getInstancia().toString())) {
            return 1;
        }
        return this.nomeSetor.compareTo(o.getNomeSetor());
    }
}

