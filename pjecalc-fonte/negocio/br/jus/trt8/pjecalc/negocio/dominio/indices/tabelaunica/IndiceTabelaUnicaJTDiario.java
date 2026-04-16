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
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTMensal;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.RepositorioDeIndiceTabelaUnicaJTDiario;
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
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBTABELAUNICAJTDIARIA")
@SequenceGenerator(name="SQTABELAUNICAJTDIARIA", sequenceName="SQTABELAUNICAJTDIARIA", allocationSize=1)
@AttributeOverrides(value={@AttributeOverride(name="competencia", column=@Column(name="DDTDIAINDICE"))})
@Name(value="indiceTabelaUnicaJTDiario")
public class IndiceTabelaUnicaJTDiario
extends IndiceBase {
    private static final long serialVersionUID = -281357036862310297L;
    private static final String NOME_INDICE = "IndiceTabelaUnicaJTDiario";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTABELAUNICAJTDIARIA")
    @Column(name="IIDINDICEUNICOJTDIARIO", nullable=false)
    private Long id;
    @ManyToOne
    @JoinColumn(name="IIDINDICEUNICOJTMENSAL")
    private IndiceTabelaUnicaJTMensal indiceTabelaUnicaJTMensal;

    public IndiceTabelaUnicaJTDiario() {
        super(RepositorioDeIndiceTabelaUnicaJTDiario.class);
    }

    public IndiceTabelaUnicaJTDiario(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceTabelaUnicaJTDiario.class, competencia, taxa);
    }

    public IndiceTabelaUnicaJTDiario(Date competencia, BigDecimal taxa, IndiceTabelaUnicaJTMensal indiceTabelaUnicaJTMensal) {
        super(RepositorioDeIndiceTabelaUnicaJTDiario.class, competencia, taxa);
        this.indiceTabelaUnicaJTMensal = indiceTabelaUnicaJTMensal;
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

    public static List<IndiceTabelaUnicaJTDiario> obterTodos() {
        return IndiceTabelaUnicaJTDiario.getRepositorio(RepositorioDeIndiceTabelaUnicaJTDiario.class).obterTodosSemLimite();
    }

    public static List<IndiceTabelaUnicaJTDiario> obterPorFiltro(IndiceTabelaUnicaJTDiario filtro) {
        return IndiceTabelaUnicaJTDiario.getRepositorio(RepositorioDeIndiceTabelaUnicaJTDiario.class).obterPorFiltro(filtro);
    }

    public static List<IndiceTabelaUnicaJTDiario> obterTabela(Periodo periodo) {
        return IndiceTabelaUnicaJTDiario.getRepositorio(RepositorioDeIndiceTabelaUnicaJTDiario.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceTabelaUnicaJTDiario entidade) {
        IndiceTabelaUnicaJTDiario.remover(RepositorioDeIndiceTabelaUnicaJTDiario.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceTabelaUnicaJTDiario.getRepositorio(RepositorioDeIndiceTabelaUnicaJTDiario.class).existe(this);
    }

    @Override
    public IndiceTabelaUnicaJTDiario validar() {
        return (IndiceTabelaUnicaJTDiario)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceTabelaUnicaJTDiario validarParaConsulta() {
        return (IndiceTabelaUnicaJTDiario)this.validarParaConsulta(NOME_INDICE);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    public IndiceTabelaUnicaJTMensal getIndiceTabelaUnicaJTMensal() {
        return this.indiceTabelaUnicaJTMensal;
    }

    public void setIndiceTabelaUnicaJTMensal(IndiceTabelaUnicaJTMensal indiceTabelaUnicaJTMensal) {
        this.indiceTabelaUnicaJTMensal = indiceTabelaUnicaJTMensal;
    }

    @Override
    public IndiceBase clonar() {
        IndiceTabelaUnicaJTDiario indice = new IndiceTabelaUnicaJTDiario();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

