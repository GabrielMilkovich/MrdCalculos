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
package br.jus.trt8.pjecalc.negocio.dominio.indices.ipc;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipc.RepositorioDeIndiceIPC;
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
@Table(name="TBIPC")
@SequenceGenerator(name="SQIPC", sequenceName="SQIPC", allocationSize=1)
@Name(value="indiceIPC")
public class IndiceIPC
extends IndiceBase {
    private static final long serialVersionUID = 491309275918121810L;
    private static final String NOME_INDICE = "IPC";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQIPC")
    @Column(name="IIDINDICEIPC", nullable=false)
    private Long id;

    public IndiceIPC() {
        super(RepositorioDeIndiceIPC.class);
    }

    public IndiceIPC(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceIPC.class, competencia, taxa);
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

    public static List<IndiceIPC> obterTodos() {
        return IndiceIPC.getRepositorio(RepositorioDeIndiceIPC.class).obterTodos();
    }

    public static List<IndiceIPC> obterPorFiltro(IndiceIPC filtro) {
        return IndiceIPC.getRepositorio(RepositorioDeIndiceIPC.class).obterPorFiltro(filtro);
    }

    public static List<IndiceIPC> obterTabela(Periodo periodo) {
        return IndiceIPC.getRepositorio(RepositorioDeIndiceIPC.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceIPC entidade) {
        IndiceIPC.remover(RepositorioDeIndiceIPC.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceIPC.getRepositorio(RepositorioDeIndiceIPC.class).existe(this);
    }

    @Override
    public IndiceIPC validar() {
        return (IndiceIPC)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceIPC validarParaConsulta() {
        return (IndiceIPC)this.validarParaConsulta(NOME_INDICE);
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
        IndiceIPC indice = new IndiceIPC();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

