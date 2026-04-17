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
package br.jus.trt8.pjecalc.negocio.dominio.indices.dnfp;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.dnfp.RepositorioDeIndiceDevedorNaoFazenda;
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
@Table(name="TBDEVEDORNAOFAZENDA")
@SequenceGenerator(name="SQDEVEDORNAOFAZENDA", sequenceName="SQDEVEDORNAOFAZENDA", allocationSize=1)
@Name(value="indiceDevedorNaoFazenda")
public class IndiceDevedorNaoFazenda
extends IndiceBase {
    private static final long serialVersionUID = -5982533762630374045L;
    private static final String NOME_INDICE = "Devedor n\u00e3o Enquadrado como Fazenda P\u00fablica";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQDEVEDORNAOFAZENDA")
    @Column(name="IIDDEVEDORNAOFAZENDA", nullable=false)
    private Long id;

    public IndiceDevedorNaoFazenda() {
        super(RepositorioDeIndiceDevedorNaoFazenda.class);
    }

    public IndiceDevedorNaoFazenda(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceDevedorNaoFazenda.class, competencia, taxa);
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

    public static List<IndiceDevedorNaoFazenda> obterTodos() {
        return IndiceDevedorNaoFazenda.getRepositorio(RepositorioDeIndiceDevedorNaoFazenda.class).obterTodos();
    }

    public static List<IndiceDevedorNaoFazenda> obterPorFiltro(IndiceDevedorNaoFazenda filtro) {
        return IndiceDevedorNaoFazenda.getRepositorio(RepositorioDeIndiceDevedorNaoFazenda.class).obterPorFiltro(filtro);
    }

    public static List<IndiceDevedorNaoFazenda> obterTabela(Periodo periodo) {
        return IndiceDevedorNaoFazenda.getRepositorio(RepositorioDeIndiceDevedorNaoFazenda.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceDevedorNaoFazenda entidade) {
        IndiceDevedorNaoFazenda.remover(RepositorioDeIndiceDevedorNaoFazenda.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceDevedorNaoFazenda.getRepositorio(RepositorioDeIndiceDevedorNaoFazenda.class).existe(this);
    }

    @Override
    public IndiceDevedorNaoFazenda validar() {
        return (IndiceDevedorNaoFazenda)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceDevedorNaoFazenda validarParaConsulta() {
        return (IndiceDevedorNaoFazenda)this.validarParaConsulta(NOME_INDICE);
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
        IndiceDevedorNaoFazenda indice = new IndiceDevedorNaoFazenda();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

