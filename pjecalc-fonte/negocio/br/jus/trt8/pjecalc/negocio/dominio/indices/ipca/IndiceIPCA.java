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
package br.jus.trt8.pjecalc.negocio.dominio.indices.ipca;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipca.RepositorioDeIndiceIPCA;
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
@Table(name="TBIPCA")
@SequenceGenerator(name="SQIPCA", sequenceName="SQIPCA", allocationSize=1)
@Name(value="indiceIPCA")
public class IndiceIPCA
extends IndiceBase {
    private static final String NOME_INDICE = "IPCA";
    private static final long serialVersionUID = 6231191110416564771L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQIPCA")
    @Column(name="IIDINDICEIPCA", nullable=false)
    private Long id;

    public IndiceIPCA() {
        super(RepositorioDeIndiceIPCA.class);
    }

    public IndiceIPCA(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceIPCA.class, competencia, taxa);
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

    public static List<IndiceIPCA> obterTodos() {
        return IndiceIPCA.getRepositorio(RepositorioDeIndiceIPCA.class).obterTodos();
    }

    public static List<IndiceIPCA> obterPorFiltro(IndiceIPCA filtro) {
        return IndiceIPCA.getRepositorio(RepositorioDeIndiceIPCA.class).obterPorFiltro(filtro);
    }

    public static void remover(IndiceIPCA entidade) {
        IndiceIPCA.remover(RepositorioDeIndiceIPCA.class, entidade, true);
    }

    public static List<IndiceIPCA> obterTabela(Periodo periodo) {
        return IndiceIPCA.getRepositorio(RepositorioDeIndiceIPCA.class).obterTabelaPor(periodo);
    }

    @Override
    public boolean existe() {
        return IndiceIPCA.getRepositorio(RepositorioDeIndiceIPCA.class).existe(this);
    }

    @Override
    public IndiceIPCA validar() {
        return (IndiceIPCA)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceIPCA validarParaConsulta() {
        return (IndiceIPCA)this.validarParaConsulta(NOME_INDICE);
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
        IndiceIPCA indice = new IndiceIPCA();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

