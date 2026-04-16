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
package br.jus.trt8.pjecalc.negocio.dominio.indices.ipcae;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipcae.RepositorioDeIndiceIPCAE;
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
@Table(name="TBIPCAE")
@SequenceGenerator(name="SQIPCAE", sequenceName="SQIPCAE", allocationSize=1)
@Name(value="indiceIPCAE")
public class IndiceIPCAE
extends IndiceBase {
    private static final long serialVersionUID = -8690477956713580202L;
    private static final String NOME_INDICE = "IPCAE";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQIPCAE")
    @Column(name="IIDINDICEIPCAE", nullable=false)
    private Long id;

    public IndiceIPCAE() {
        super(RepositorioDeIndiceIPCAE.class);
    }

    public IndiceIPCAE(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceIPCAE.class, competencia, taxa);
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

    public static List<IndiceIPCAE> obterTodos() {
        return IndiceIPCAE.getRepositorio(RepositorioDeIndiceIPCAE.class).obterTodos();
    }

    public static List<IndiceIPCAE> obterPorFiltro(IndiceIPCAE filtro) {
        return IndiceIPCAE.getRepositorio(RepositorioDeIndiceIPCAE.class).obterPorFiltro(filtro);
    }

    public static List<IndiceIPCAE> obterTabela(Periodo periodo) {
        return IndiceIPCAE.getRepositorio(RepositorioDeIndiceIPCAE.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceIPCAE entidade) {
        IndiceIPCAE.remover(RepositorioDeIndiceIPCAE.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceIPCAE.getRepositorio(RepositorioDeIndiceIPCAE.class).existe(this);
    }

    @Override
    public IndiceIPCAE validar() {
        return (IndiceIPCAE)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceIPCAE validarParaConsulta() {
        return (IndiceIPCAE)this.validarParaConsulta(NOME_INDICE);
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
        IndiceIPCAE indice = new IndiceIPCAE();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

