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
package br.jus.trt8.pjecalc.negocio.dominio.indices.dfp;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.dfp.RepositorioDeIndiceDevedorFazenda;
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
@Table(name="TBDEVEDORFAZENDA")
@SequenceGenerator(name="SQDEVEDORFAZENDA", sequenceName="SQDEVEDORFAZENDA", allocationSize=1)
@Name(value="indiceDevedorFazenda")
public class IndiceDevedorFazenda
extends IndiceBase {
    private static final long serialVersionUID = 1299045698463539006L;
    private static final String NOME_INDICE = "Devedor Fazenda P\u00fablica";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQDEVEDORFAZENDA")
    @Column(name="IIDDEVEDORFAZENDA", nullable=false)
    private Long id;

    public IndiceDevedorFazenda() {
        super(RepositorioDeIndiceDevedorFazenda.class);
    }

    public IndiceDevedorFazenda(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceDevedorFazenda.class, competencia, taxa);
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

    public static List<IndiceDevedorFazenda> obterTodos() {
        return IndiceDevedorFazenda.getRepositorio(RepositorioDeIndiceDevedorFazenda.class).obterTodos();
    }

    public static List<IndiceDevedorFazenda> obterPorFiltro(IndiceDevedorFazenda filtro) {
        return IndiceDevedorFazenda.getRepositorio(RepositorioDeIndiceDevedorFazenda.class).obterPorFiltro(filtro);
    }

    public static List<IndiceDevedorFazenda> obterTabela(Periodo periodo) {
        return IndiceDevedorFazenda.getRepositorio(RepositorioDeIndiceDevedorFazenda.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceDevedorFazenda entidade) {
        IndiceDevedorFazenda.remover(RepositorioDeIndiceDevedorFazenda.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceDevedorFazenda.getRepositorio(RepositorioDeIndiceDevedorFazenda.class).existe(this);
    }

    @Override
    public IndiceDevedorFazenda validar() {
        return (IndiceDevedorFazenda)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceDevedorFazenda validarParaConsulta() {
        return (IndiceDevedorFazenda)this.validarParaConsulta(NOME_INDICE);
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
        IndiceDevedorFazenda indice = new IndiceDevedorFazenda();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

