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
package br.jus.trt8.pjecalc.negocio.dominio.indices.ipcatr;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipcatr.RepositorioDeIndiceIPCAETR;
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
@Table(name="TBIPCAETR")
@SequenceGenerator(name="SQIPCAETR", sequenceName="SQIPCAETR", allocationSize=1)
@Name(value="indiceIPCAETR")
public class IndiceIPCAETR
extends IndiceBase {
    private static final long serialVersionUID = -8690477956713580202L;
    private static final String NOME_INDICE = "IPCAETR";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQIPCAETR")
    @Column(name="IIDINDICEIPCAETR", nullable=false)
    private Long id;

    public IndiceIPCAETR() {
        super(RepositorioDeIndiceIPCAETR.class);
    }

    public IndiceIPCAETR(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceIPCAETR.class, competencia, taxa);
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

    public static List<IndiceIPCAETR> obterTodos() {
        return IndiceIPCAETR.getRepositorio(RepositorioDeIndiceIPCAETR.class).obterTodos();
    }

    public static List<IndiceIPCAETR> obterPorFiltro(IndiceIPCAETR filtro) {
        return IndiceIPCAETR.getRepositorio(RepositorioDeIndiceIPCAETR.class).obterPorFiltro(filtro);
    }

    public static List<IndiceIPCAETR> obterTabela(Periodo periodo) {
        return IndiceIPCAETR.getRepositorio(RepositorioDeIndiceIPCAETR.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceIPCAETR entidade) {
        IndiceIPCAETR.remover(RepositorioDeIndiceIPCAETR.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceIPCAETR.getRepositorio(RepositorioDeIndiceIPCAETR.class).existe(this);
    }

    @Override
    public IndiceIPCAETR validar() {
        return (IndiceIPCAETR)super.validar(NOME_INDICE);
    }

    @Override
    public IndiceIPCAETR validarParaConsulta() {
        return (IndiceIPCAETR)this.validarParaConsulta(NOME_INDICE);
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
        IndiceIPCAETR indice = new IndiceIPCAETR();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

