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
package br.jus.trt8.pjecalc.negocio.dominio.indices.selic;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.RepositorioDeIndiceSelicFazenda;
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
@Table(name="TBSELICFAZENDA")
@SequenceGenerator(name="SQSELICFAZENDA", sequenceName="SQSELICFAZENDA", allocationSize=1)
@Name(value="indiceSelicFazenda")
public class IndiceSelicFazenda
extends IndiceBase {
    private static final String NOME_INDICE = "SELICFAZENDA";
    private static final long serialVersionUID = 8233027854754200592L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQSELICFAZENDA")
    @Column(name="IIDINDICESELICFAZENDA", nullable=false)
    private Long id;

    public IndiceSelicFazenda() {
        super(RepositorioDeIndiceSelicFazenda.class);
    }

    public IndiceSelicFazenda(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceSelicFazenda.class, competencia, taxa);
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

    public static List<IndiceSelicFazenda> obterTodos() {
        return IndiceSelicFazenda.getRepositorio(RepositorioDeIndiceSelicFazenda.class).obterTodos();
    }

    public static List<IndiceSelicFazenda> obterPorFiltro(IndiceSelicFazenda filtro) {
        return IndiceSelicFazenda.getRepositorio(RepositorioDeIndiceSelicFazenda.class).obterPorFiltro(filtro);
    }

    public static void remover(IndiceSelicFazenda entidade) {
        IndiceSelicFazenda.remover(RepositorioDeIndiceSelicFazenda.class, entidade, true);
    }

    public static List<IndiceSelicFazenda> obterTabela(Periodo periodo) {
        return IndiceSelicFazenda.getRepositorio(RepositorioDeIndiceSelicFazenda.class).obterTabelaPor(periodo);
    }

    @Override
    public boolean existe() {
        return IndiceSelicFazenda.getRepositorio(RepositorioDeIndiceSelicFazenda.class).existe(this);
    }

    @Override
    public IndiceSelicFazenda validar() {
        return (IndiceSelicFazenda)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceSelicFazenda validarParaConsulta() {
        return (IndiceSelicFazenda)this.validarParaConsulta(NOME_INDICE);
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
        IndiceSelicFazenda indice = new IndiceSelicFazenda();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

