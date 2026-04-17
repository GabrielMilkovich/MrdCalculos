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
import br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.RepositorioDeIndicePrecatorioFederal;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBTABELAPRECATORIOFEDERAL")
@Name(value="indicePrecatorioFederal")
public class IndicePrecatorioFederal
extends IndiceBase {
    private static final long serialVersionUID = 1L;
    private static final String NOME_INDICE = "PRECATORIOFEDERAL";
    @Id
    @Column(name="IIDTABELAPRECATORIOFEDERAL", nullable=false)
    private Long id;

    public IndicePrecatorioFederal() {
        super(RepositorioDeIndicePrecatorioFederal.class);
    }

    public IndicePrecatorioFederal(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndicePrecatorioFederal.class, competencia, taxa);
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

    public static List<IndicePrecatorioFederal> obterTodos() {
        return IndicePrecatorioFederal.getRepositorio(RepositorioDeIndicePrecatorioFederal.class).obterTodos();
    }

    public static List<IndicePrecatorioFederal> obterPorFiltro(IndicePrecatorioFederal filtro) {
        return IndicePrecatorioFederal.getRepositorio(RepositorioDeIndicePrecatorioFederal.class).obterPorFiltro(filtro);
    }

    public static void remover(IndicePrecatorioFederal entidade) {
        IndicePrecatorioFederal.remover(RepositorioDeIndicePrecatorioFederal.class, entidade, true);
    }

    public static List<IndicePrecatorioFederal> obterTabela(Periodo periodo) {
        return IndicePrecatorioFederal.getRepositorio(RepositorioDeIndicePrecatorioFederal.class).obterTabelaPor(periodo);
    }

    @Override
    public boolean existe() {
        return IndicePrecatorioFederal.getRepositorio(RepositorioDeIndicePrecatorioFederal.class).existe(this);
    }

    @Override
    public IndicePrecatorioFederal validar() {
        return (IndicePrecatorioFederal)this.validar(NOME_INDICE);
    }

    @Override
    public IndicePrecatorioFederal validarParaConsulta() {
        return (IndicePrecatorioFederal)this.validarParaConsulta(NOME_INDICE);
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
        IndicePrecatorioFederal indice = new IndicePrecatorioFederal();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

