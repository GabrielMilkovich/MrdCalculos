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
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.fazendapublica;

import br.jus.trt8.pjecalc.negocio.dominio.juros.JurosBase;
import br.jus.trt8.pjecalc.negocio.dominio.juros.fazendapublica.RepositorioDeJurosFazendaPublica;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBJUROSFAZENDAPUBLICA")
@SequenceGenerator(name="SQJUROSFAZENDAPUBLICA", sequenceName="SQJUROSFAZENDAPUBLICA", allocationSize=1)
@Name(value="JurosFazendaPublica")
public class JurosFazendaPublica
extends JurosBase {
    private static final long serialVersionUID = 1506754601441825025L;
    private static final String NOME_JUROS = "FazendaPublica";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQJUROSFAZENDAPUBLICA")
    @Column(name="IIDJUROSFAZENDAPUBLICA", nullable=false)
    private final Long id = null;

    public JurosFazendaPublica() {
        super(RepositorioDeJurosFazendaPublica.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public void salvarNovoRegistro() {
        JurosFazendaPublica.getRepositorio(RepositorioDeJurosFazendaPublica.class).salvarNovoRegistro(this);
    }

    @Override
    public JurosFazendaPublica validar() {
        return (JurosFazendaPublica)this.validar(NOME_JUROS);
    }

    public static List<JurosFazendaPublica> obterTodos() {
        return JurosFazendaPublica.getRepositorio(RepositorioDeJurosFazendaPublica.class).obterTodos();
    }

    public static void remover(JurosFazendaPublica entidade) {
        JurosFazendaPublica.getRepositorio(RepositorioDeJurosFazendaPublica.class).remover(entidade);
    }

    public static List<JurosFazendaPublica> obterPeriodoDeJurosBase(Date dataInicio, Date dataFim) {
        return JurosFazendaPublica.getRepositorio(RepositorioDeJurosFazendaPublica.class).obterPeriodoDeJurosBase(dataInicio, dataFim);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }
}

