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
package br.jus.trt8.pjecalc.negocio.dominio.indices.igpm;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.igpm.RepositorioDeIndiceIGPM;
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
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBIGPM")
@SequenceGenerator(name="SQIGPM", sequenceName="SQIGPM", allocationSize=1)
@Name(value="indiceIGPM")
public class IndiceIGPM
extends IndiceBase {
    private static final long serialVersionUID = 4919839412097781248L;
    private static final String NOME_INDICE = "IGPM";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQIGPM")
    @Column(name="IIDINDICEIGPM", nullable=false)
    private Long id;

    public IndiceIGPM() {
        super(RepositorioDeIndiceIGPM.class);
    }

    public IndiceIGPM(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceIGPM.class, competencia, taxa);
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

    public static List<IndiceIGPM> obterTodos() {
        return IndiceIGPM.getRepositorio(RepositorioDeIndiceIGPM.class).obterTodos();
    }

    public static List<IndiceIGPM> obterPorFiltro(IndiceIGPM filtro) {
        return IndiceIGPM.getRepositorio(RepositorioDeIndiceIGPM.class).obterPorFiltro(filtro);
    }

    public static List<IndiceIGPM> obterTabela(Periodo periodo) {
        return IndiceIGPM.getRepositorio(RepositorioDeIndiceIGPM.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceIGPM entidade) {
        IndiceIGPM.remover(RepositorioDeIndiceIGPM.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceIGPM.getRepositorio(RepositorioDeIndiceIGPM.class).existe(this);
    }

    @Override
    public IndiceIGPM validar() {
        return (IndiceIGPM)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceIGPM validarParaConsulta() {
        return (IndiceIGPM)this.validarParaConsulta(NOME_INDICE);
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
        IndiceIGPM indice = new IndiceIGPM();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

