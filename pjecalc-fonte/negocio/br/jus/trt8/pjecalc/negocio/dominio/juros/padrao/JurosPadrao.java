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
package br.jus.trt8.pjecalc.negocio.dominio.juros.padrao;

import br.jus.trt8.pjecalc.negocio.dominio.juros.JurosBase;
import br.jus.trt8.pjecalc.negocio.dominio.juros.padrao.RepositorioDeJurosPadrao;
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
@Table(name="TBJUROSPADRAO")
@SequenceGenerator(name="SQJUROSPADRAO", sequenceName="SQJUROSPADRAO", allocationSize=1)
@Name(value="jurosPadrao")
public class JurosPadrao
extends JurosBase {
    private static final long serialVersionUID = 1648702448535478342L;
    private static final String NOME_JUROS = "Padrao";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQJUROSPADRAO")
    @Column(name="IIDJUROSPADRAO", nullable=false)
    private final Long id = null;

    public JurosPadrao() {
        super(RepositorioDeJurosPadrao.class);
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
        JurosPadrao.getRepositorio(RepositorioDeJurosPadrao.class).salvarNovoRegistro(this);
    }

    @Override
    public JurosPadrao validar() {
        return (JurosPadrao)this.validar(NOME_JUROS);
    }

    public static List<JurosPadrao> obterTodos() {
        return JurosPadrao.getRepositorio(RepositorioDeJurosPadrao.class).obterTodos();
    }

    public static void remover(JurosPadrao entidade) {
        JurosPadrao.getRepositorio(RepositorioDeJurosPadrao.class).remover(entidade);
    }

    public static List<JurosPadrao> obterPeriodoDeJurosBase(Date dataInicio, Date dataFim) {
        return JurosPadrao.getRepositorio(RepositorioDeJurosPadrao.class).obterPeriodoDeJurosBase(dataInicio, dataFim);
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

