/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.AttributeOverride
 *  javax.persistence.AttributeOverrides
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
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.RepositorioDeIndiceSelicDiaria;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.AttributeOverride;
import javax.persistence.AttributeOverrides;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBSELICDIARIA")
@SequenceGenerator(name="SQSELICDIARIA", sequenceName="SQSELICDIARIA", allocationSize=1)
@AttributeOverrides(value={@AttributeOverride(name="competencia", column=@Column(name="DDTDIAINDICE"))})
@Name(value="indiceSelicDiaria")
public class IndiceSelicDiaria
extends IndiceBase {
    private static final long serialVersionUID = -281357036862310297L;
    private static final String NOME_INDICE = "IndiceSelicDiaria";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQSELICDIARIA")
    @Column(name="IIDSELICDIARIA", nullable=false)
    private Long id;

    public IndiceSelicDiaria() {
        super(RepositorioDeIndiceSelicDiaria.class);
    }

    public IndiceSelicDiaria(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceSelicDiaria.class, competencia, taxa);
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

    public static List<IndiceSelicDiaria> obterTodos() {
        return IndiceSelicDiaria.getRepositorio(RepositorioDeIndiceSelicDiaria.class).obterTodosSemLimite();
    }

    public static List<IndiceSelicDiaria> obterPorFiltro(IndiceSelicDiaria filtro) {
        return IndiceSelicDiaria.getRepositorio(RepositorioDeIndiceSelicDiaria.class).obterPorFiltro(filtro);
    }

    public static IndiceSelicDiaria obterPorCompetencia(Date competencia) {
        return (IndiceSelicDiaria)IndiceSelicDiaria.getRepositorio(RepositorioDeIndiceSelicDiaria.class).obterPorCompetencia(competencia);
    }

    public static List<IndiceSelicDiaria> obterTabela(Periodo periodo) {
        return IndiceSelicDiaria.getRepositorio(RepositorioDeIndiceSelicDiaria.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceSelicDiaria entidade) {
        IndiceSelicDiaria.remover(RepositorioDeIndiceSelicDiaria.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceSelicDiaria.getRepositorio(RepositorioDeIndiceSelicDiaria.class).existe(this);
    }

    @Override
    public IndiceSelicDiaria validar() {
        return (IndiceSelicDiaria)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceSelicDiaria validarParaConsulta() {
        return (IndiceSelicDiaria)this.validarParaConsulta(NOME_INDICE);
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
        IndiceSelicDiaria indice = new IndiceSelicDiaria();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

