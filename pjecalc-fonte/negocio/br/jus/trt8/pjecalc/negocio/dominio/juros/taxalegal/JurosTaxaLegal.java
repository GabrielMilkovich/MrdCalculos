/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.AttributeOverride
 *  javax.persistence.AttributeOverrides
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.taxalegal;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.juros.taxalegal.RepositorioDeJurosTaxaLegal;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.AttributeOverride;
import javax.persistence.AttributeOverrides;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBJUROSTAXALEGAL")
@SequenceGenerator(name="SQJUROSTAXALEGAL", sequenceName="SQJUROSTAXALEGAL", allocationSize=1)
@AttributeOverrides(value={@AttributeOverride(name="competencia", column=@Column(name="DDTDIAINDICE"))})
@Name(value="jurosTaxaLegal")
public class JurosTaxaLegal
extends IndiceBase {
    private static final long serialVersionUID = 2770194096071773807L;
    private static final String NOME_INDICE = "JurosTaxaLegal";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQJUROSTAXALEGAL")
    @Column(name="IIDJUROSTAXALEGAL", nullable=false)
    private Long id;

    public JurosTaxaLegal() {
        super(RepositorioDeJurosTaxaLegal.class);
    }

    public JurosTaxaLegal(Date competencia, BigDecimal taxa) {
        super(RepositorioDeJurosTaxaLegal.class, competencia, taxa);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public static List<JurosTaxaLegal> obterTodos() {
        return JurosTaxaLegal.getRepositorio(RepositorioDeJurosTaxaLegal.class).obterTodosSemLimite();
    }

    public static List<JurosTaxaLegal> obterPorFiltro(JurosTaxaLegal filtro) {
        return JurosTaxaLegal.getRepositorio(RepositorioDeJurosTaxaLegal.class).obterPorFiltro(filtro);
    }

    public static JurosTaxaLegal obterPorCompetencia(Date competencia) {
        return (JurosTaxaLegal)JurosTaxaLegal.getRepositorio(RepositorioDeJurosTaxaLegal.class).obterPorCompetencia(competencia);
    }

    public static List<JurosTaxaLegal> obterTabela(Periodo periodo) {
        return JurosTaxaLegal.getRepositorio(RepositorioDeJurosTaxaLegal.class).obterTabelaPor(periodo);
    }

    public static void remover(JurosTaxaLegal entidade) {
        JurosTaxaLegal.remover(RepositorioDeJurosTaxaLegal.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return JurosTaxaLegal.getRepositorio(RepositorioDeJurosTaxaLegal.class).existe(this);
    }

    @Override
    public JurosTaxaLegal validar() {
        return (JurosTaxaLegal)this.validar(NOME_INDICE);
    }

    @Override
    public JurosTaxaLegal validarParaConsulta() {
        return (JurosTaxaLegal)this.validarParaConsulta(NOME_INDICE);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    @Override
    public IndiceBase clonar() {
        JurosTaxaLegal indice = new JurosTaxaLegal();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

