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
package br.jus.trt8.pjecalc.negocio.dominio.indices.tr;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tr.RepositorioDeIndiceTR;
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
@Table(name="TBTR")
@SequenceGenerator(name="SQTR", sequenceName="SQTR", allocationSize=1)
@Name(value="indiceTR")
public class IndiceTR
extends IndiceBase {
    private static final long serialVersionUID = 2785544844354298124L;
    private static final String NOME_INDICE = "IndiceTR";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTR")
    @Column(name="IIDINDICETR", nullable=false)
    private Long id;

    public IndiceTR() {
        super(RepositorioDeIndiceTR.class);
    }

    public IndiceTR(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceTR.class, competencia, taxa);
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
        try {
            super.salvar();
        }
        catch (Exception e) {
            IndiceTR.remover(this);
        }
    }

    public void salvarSemDiario() {
        super.salvar();
    }

    public static List<IndiceTR> obterTodos() {
        return IndiceTR.getRepositorio(RepositorioDeIndiceTR.class).obterTodos();
    }

    public static List<IndiceTR> obterTodosSemLimite() {
        return IndiceTR.getRepositorio(RepositorioDeIndiceTR.class).obterTodosSemLimite();
    }

    public static List<IndiceTR> obterPorFiltro(IndiceTR filtro) {
        return IndiceTR.getRepositorio(RepositorioDeIndiceTR.class).obterPorFiltro(filtro);
    }

    public static List<IndiceTR> obterTabela(Periodo periodo) {
        return IndiceTR.getRepositorio(RepositorioDeIndiceTR.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceTR entidade) {
        IndiceTR.remover(RepositorioDeIndiceTR.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceTR.getRepositorio(RepositorioDeIndiceTR.class).existe(this);
    }

    @Override
    public IndiceTR validar() {
        return (IndiceTR)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceTR validarParaConsulta() {
        return (IndiceTR)this.validarParaConsulta(NOME_INDICE);
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
        IndiceTR indice = new IndiceTR();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

