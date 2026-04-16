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
package br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.RepositorioDeIndiceTabelaUnicaDebitoTrabalhista;
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
@Table(name="TBTUACDT")
@SequenceGenerator(name="SQTUACDT", sequenceName="SQTUACDT", allocationSize=1)
@AttributeOverrides(value={@AttributeOverride(name="competencia", column=@Column(name="DDTDIAINDICE"))})
@Name(value="indiceTabelaUnicaDebitoTrabalhista")
public class IndiceTabelaUnicaDebitoTrabalhista
extends IndiceBase {
    private static final long serialVersionUID = -8788174089995834626L;
    private static final String NOME_INDICE = "IndiceTabelaUnicaDebitoTrabalhista";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTUACDT")
    @Column(name="IIDTUACDT", nullable=false)
    private final Long id = null;

    public IndiceTabelaUnicaDebitoTrabalhista() {
        super(RepositorioDeIndiceTabelaUnicaDebitoTrabalhista.class);
    }

    public IndiceTabelaUnicaDebitoTrabalhista(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceTabelaUnicaDebitoTrabalhista.class, competencia, taxa);
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

    public static List<IndiceTabelaUnicaDebitoTrabalhista> obterTodos() {
        return IndiceTabelaUnicaDebitoTrabalhista.getRepositorio(RepositorioDeIndiceTabelaUnicaDebitoTrabalhista.class).obterTodosSemLimite();
    }

    public static List<IndiceTabelaUnicaDebitoTrabalhista> obterPorFiltro(IndiceTabelaUnicaDebitoTrabalhista filtro) {
        return IndiceTabelaUnicaDebitoTrabalhista.getRepositorio(RepositorioDeIndiceTabelaUnicaDebitoTrabalhista.class).obterPorFiltro(filtro);
    }

    public static IndiceTabelaUnicaDebitoTrabalhista obterPorCompetencia(Date competencia) {
        return (IndiceTabelaUnicaDebitoTrabalhista)IndiceTabelaUnicaDebitoTrabalhista.getRepositorio(RepositorioDeIndiceTabelaUnicaDebitoTrabalhista.class).obterPorCompetencia(competencia);
    }

    public static List<IndiceTabelaUnicaDebitoTrabalhista> obterTabela(Periodo periodo) {
        return IndiceTabelaUnicaDebitoTrabalhista.getRepositorio(RepositorioDeIndiceTabelaUnicaDebitoTrabalhista.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceTabelaUnicaDebitoTrabalhista entidade) {
        IndiceTabelaUnicaDebitoTrabalhista.remover(RepositorioDeIndiceTabelaUnicaDebitoTrabalhista.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceTabelaUnicaDebitoTrabalhista.getRepositorio(RepositorioDeIndiceTabelaUnicaDebitoTrabalhista.class).existe(this);
    }

    @Override
    public IndiceTabelaUnicaDebitoTrabalhista validar() {
        return (IndiceTabelaUnicaDebitoTrabalhista)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceTabelaUnicaDebitoTrabalhista validarParaConsulta() {
        return (IndiceTabelaUnicaDebitoTrabalhista)this.validarParaConsulta(NOME_INDICE);
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
        IndiceTabelaUnicaDebitoTrabalhista indice = new IndiceTabelaUnicaDebitoTrabalhista();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

