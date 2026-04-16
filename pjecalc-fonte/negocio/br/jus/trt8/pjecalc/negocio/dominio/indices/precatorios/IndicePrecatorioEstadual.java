/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.RepositorioDeIndicePrecatorioEstadual;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBTABELAPRECATORIOESTADUAL")
@Name(value="indicePrecatorioEstadual")
public class IndicePrecatorioEstadual
extends IndiceBase {
    private static final long serialVersionUID = 1L;
    private static final String NOME_INDICE = "PRECATORIOESTADUAL";
    @Id
    @Column(name="IIDTABELAPRECATORIOESTADUAL", nullable=false)
    private Long id;

    public IndicePrecatorioEstadual() {
        super(RepositorioDeIndicePrecatorioEstadual.class);
    }

    public IndicePrecatorioEstadual(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndicePrecatorioEstadual.class, competencia, taxa);
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

    public static List<IndicePrecatorioEstadual> obterTodos() {
        return IndicePrecatorioEstadual.getRepositorio(RepositorioDeIndicePrecatorioEstadual.class).obterTodos();
    }

    public static List<IndicePrecatorioEstadual> obterPorFiltro(IndicePrecatorioEstadual filtro) {
        return IndicePrecatorioEstadual.getRepositorio(RepositorioDeIndicePrecatorioEstadual.class).obterPorFiltro(filtro);
    }

    public static void remover(IndicePrecatorioEstadual entidade) {
        IndicePrecatorioEstadual.remover(RepositorioDeIndicePrecatorioEstadual.class, entidade, true);
    }

    public static List<IndicePrecatorioEstadual> obterTabela(Periodo periodo) {
        return IndicePrecatorioEstadual.getRepositorio(RepositorioDeIndicePrecatorioEstadual.class).obterTabelaPor(periodo);
    }

    @Override
    public boolean existe() {
        return IndicePrecatorioEstadual.getRepositorio(RepositorioDeIndicePrecatorioEstadual.class).existe(this);
    }

    @Override
    public IndicePrecatorioEstadual validar() {
        return (IndicePrecatorioEstadual)this.validar(NOME_INDICE);
    }

    @Override
    public IndicePrecatorioEstadual validarParaConsulta() {
        return (IndicePrecatorioEstadual)this.validarParaConsulta(NOME_INDICE);
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
        IndicePrecatorioEstadual indice = new IndicePrecatorioEstadual();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

