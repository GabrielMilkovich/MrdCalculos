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
package br.jus.trt8.pjecalc.negocio.dominio.indices.inpc;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.inpc.RepositorioDeIndiceINPC;
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
@Table(name="TBINPC")
@SequenceGenerator(name="SQINPC", sequenceName="SQINPC", allocationSize=1)
@Name(value="indiceINPC")
public class IndiceINPC
extends IndiceBase {
    private static final long serialVersionUID = 4400455039278565167L;
    private static final String NOME_INDICE = "INPC";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQINPC")
    @Column(name="IIDINDICEINPC", nullable=false)
    private Long id;

    public IndiceINPC() {
        super(RepositorioDeIndiceINPC.class);
    }

    public IndiceINPC(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceINPC.class, competencia, taxa);
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

    public static List<IndiceINPC> obterTodos() {
        return IndiceINPC.getRepositorio(RepositorioDeIndiceINPC.class).obterTodos();
    }

    public static List<IndiceINPC> obterPorFiltro(IndiceINPC filtro) {
        return IndiceINPC.getRepositorio(RepositorioDeIndiceINPC.class).obterPorFiltro(filtro);
    }

    public static List<IndiceINPC> obterTabela(Periodo periodo) {
        return IndiceINPC.getRepositorio(RepositorioDeIndiceINPC.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceINPC entidade) {
        IndiceINPC.remover(RepositorioDeIndiceINPC.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceINPC.getRepositorio(RepositorioDeIndiceINPC.class).existe(this);
    }

    @Override
    public IndiceINPC validar() {
        return (IndiceINPC)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceINPC validarParaConsulta() {
        return (IndiceINPC)this.validarParaConsulta(NOME_INDICE);
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
        IndiceINPC indice = new IndiceINPC();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

