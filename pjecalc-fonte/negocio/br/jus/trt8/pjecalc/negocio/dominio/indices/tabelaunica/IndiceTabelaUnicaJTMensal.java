/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.OneToMany
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.LogicoFuzzy;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTDiario;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.RepositorioDeIndiceTabelaUnicaJTMensal;
import java.math.BigDecimal;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBTABELAUNICAJTMENSAL")
@SequenceGenerator(name="SQTABELAUNICAJTMENSAL", sequenceName="SQTABELAUNICAJTMENSAL", allocationSize=1)
@Name(value="indiceTabelaUnicaJTMensal")
public class IndiceTabelaUnicaJTMensal
extends IndiceBase {
    private static final long serialVersionUID = 2785544844354298124L;
    private static final String NOME_INDICE = "IndiceTabelaUnicaJTMensal";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTABELAUNICAJTMENSAL")
    @Column(name="IIDINDICEUNICOJTMENSAL", nullable=false)
    private Long id;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="indiceTabelaUnicaJTMensal")
    private Set<IndiceTabelaUnicaJTDiario> indicesDiarios;

    public IndiceTabelaUnicaJTMensal() {
        super(RepositorioDeIndiceTabelaUnicaJTMensal.class);
    }

    public IndiceTabelaUnicaJTMensal(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceTabelaUnicaJTMensal.class, competencia, taxa);
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
            this.gerarIndicesDiarios();
            super.salvar();
        }
        catch (Exception e) {
            IndiceTabelaUnicaJTMensal.remover(this);
        }
    }

    public void salvarSemDiario() {
        super.salvar();
    }

    private void gerarIndicesDiarios() {
        HelperDate diaDoMesDaCompetencia = HelperDate.getInstance(this.getCompetencia());
        HelperDate ultimoDiaDoMesDaCompetencia = diaDoMesDaCompetencia.lastDayOfTheMonth();
        double totalDiasUteis = diaDoMesDaCompetencia.totalWorkDaysWithoutFederalHolidaysFilter(ultimoDiaDoMesDaCompetencia, LogicoFuzzy.FALSO);
        BigDecimal valorAcumuladoDiario = this.calcularValorDoIndiceDiario(totalDiasUteis);
        while (diaDoMesDaCompetencia.lessThanOrEqualsTo(ultimoDiaDoMesDaCompetencia)) {
            if (diaDoMesDaCompetencia.isWorkDayWithoutSaturdaysOrFederalHolidays()) {
                this.getIndicesDiarios().add(new IndiceTabelaUnicaJTDiario(diaDoMesDaCompetencia.getDate(), valorAcumuladoDiario, this));
            } else {
                this.getIndicesDiarios().add(new IndiceTabelaUnicaJTDiario(diaDoMesDaCompetencia.getDate(), new BigDecimal("0"), this));
            }
            diaDoMesDaCompetencia.addDay(1);
        }
    }

    private BigDecimal calcularValorDoIndiceDiario(double quantidadeDiasUteis) {
        IndiceTabelaUnicaJTMensal filtro = new IndiceTabelaUnicaJTMensal();
        filtro.setCompetenciaParaVerAcumulado(this.getCompetencia());
        filtro.setCompetencia(null);
        BigDecimal valorAcumuladoCalculado = null;
        List<IndiceTabelaUnicaJTMensal> lista = IndiceTabelaUnicaJTMensal.obterPorFiltro(filtro);
        valorAcumuladoCalculado = !lista.isEmpty() ? lista.get(lista.indexOf(this)).getValorIndice() : this.getValorIndice();
        BigDecimal raizEnesimaDoAcumuladoMensal = new BigDecimal(Math.pow(valorAcumuladoCalculado.doubleValue(), 1.0 / quantidadeDiasUteis));
        return raizEnesimaDoAcumuladoMensal.subtract(new BigDecimal(1)).multiply(new BigDecimal(100));
    }

    public static List<IndiceTabelaUnicaJTMensal> obterTodos() {
        return IndiceTabelaUnicaJTMensal.getRepositorio(RepositorioDeIndiceTabelaUnicaJTMensal.class).obterTodos();
    }

    public static List<IndiceTabelaUnicaJTMensal> obterTodosSemLimite() {
        return IndiceTabelaUnicaJTMensal.getRepositorio(RepositorioDeIndiceTabelaUnicaJTMensal.class).obterTodosSemLimite();
    }

    public static List<IndiceTabelaUnicaJTMensal> obterPorFiltro(IndiceTabelaUnicaJTMensal filtro) {
        return IndiceTabelaUnicaJTMensal.getRepositorio(RepositorioDeIndiceTabelaUnicaJTMensal.class).obterPorFiltro(filtro);
    }

    public static List<IndiceTabelaUnicaJTMensal> obterTabela(Periodo periodo) {
        return IndiceTabelaUnicaJTMensal.getRepositorio(RepositorioDeIndiceTabelaUnicaJTMensal.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceTabelaUnicaJTMensal entidade) {
        entidade = (IndiceTabelaUnicaJTMensal)IndiceTabelaUnicaJTMensal.obter(RepositorioDeIndiceTabelaUnicaJTMensal.class, entidade.getId());
        IndiceTabelaUnicaJTMensal.remover(RepositorioDeIndiceTabelaUnicaJTMensal.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceTabelaUnicaJTMensal.getRepositorio(RepositorioDeIndiceTabelaUnicaJTMensal.class).existe(this);
    }

    @Override
    public IndiceTabelaUnicaJTMensal validar() {
        return (IndiceTabelaUnicaJTMensal)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceTabelaUnicaJTMensal validarParaConsulta() {
        return (IndiceTabelaUnicaJTMensal)this.validarParaConsulta(NOME_INDICE);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    public Set<IndiceTabelaUnicaJTDiario> getIndicesDiarios() {
        return Utils.naoNulo(this.indicesDiarios) ? this.indicesDiarios : (this.indicesDiarios = new LinkedHashSet<IndiceTabelaUnicaJTDiario>());
    }

    public static IndiceTabelaUnicaJTMensal obterUltima() {
        return IndiceTabelaUnicaJTMensal.getRepositorio(RepositorioDeIndiceTabelaUnicaJTMensal.class).obterUltima();
    }

    @Override
    public IndiceBase clonar() {
        IndiceTabelaUnicaJTMensal indice = new IndiceTabelaUnicaJTMensal();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

