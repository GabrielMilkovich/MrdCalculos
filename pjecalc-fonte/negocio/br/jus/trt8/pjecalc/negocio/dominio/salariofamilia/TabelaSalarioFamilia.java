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
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariofamilia;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.validators.Compared;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.Unique;
import br.jus.trt8.pjecalc.negocio.dominio.salariofamilia.RepositorioDeTabelaSalarioFamilia;
import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBTABELASALARIOFAMILIA")
@SequenceGenerator(name="SQTABELASALARIOFAMILIA", sequenceName="SQTABELASALARIOFAMILIA", allocationSize=1)
@Name(value="tabelaSalarioFamilia")
public class TabelaSalarioFamilia
extends EntidadeBase {
    private static final long serialVersionUID = 2486730100316236950L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTABELASALARIOFAMILIA")
    @Column(name="IIDREGISTROSALARIOFAMILIA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="DDTCOMPETENCIAREGISTRO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @Unique(fields={"competencia"})
    @Required
    private Date competencia;
    @Column(name="RVLINICIALFAIXAUM", precision=8, scale=2)
    private BigDecimal valorInicialFaixa1 = BigDecimal.ZERO;
    @Column(name="RVLFINALFAIXAUM", precision=8, scale=2)
    @Compared(with="valorInicialFaixa1", result=1)
    @Required
    private BigDecimal valorFinalFaixa1 = BigDecimal.ZERO;
    @Column(name="RVLSALARIOFAIXAUM", precision=8, scale=2)
    @Required
    private BigDecimal valorSalarioFamiliaFaixa1 = BigDecimal.ZERO;
    @Column(name="RVLINICIALFAIXADOIS", precision=8, scale=2)
    private BigDecimal valorInicialFaixa2 = BigDecimal.ZERO;
    @Column(name="RVLFINALFAIXADOIS", precision=8, scale=2)
    @Compared(with="valorInicialFaixa2", result=1)
    @Required
    private BigDecimal valorFinalFaixa2 = BigDecimal.ZERO;
    @Column(name="RVLSALARIOFAIXADOIS", precision=8, scale=2)
    @Required
    private BigDecimal valorSalarioFamiliaFaixa2 = BigDecimal.ZERO;

    public TabelaSalarioFamilia() {
        super(RepositorioDeTabelaSalarioFamilia.class);
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Long getId() {
        return this.id;
    }

    public void sugerirValorInicialFaixa2() {
        this.valorInicialFaixa2 = BigDecimal.ZERO;
        if (Utils.naoNulo(this.valorFinalFaixa1)) {
            this.valorInicialFaixa2 = this.valorFinalFaixa1.add(new BigDecimal("0.01"), Utils.CONTEXTO_MATEMATICO);
        }
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Date getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    public BigDecimal getValorInicialFaixa1() {
        return this.valorInicialFaixa1;
    }

    public void setValorInicialFaixa1(BigDecimal valorInicialFaixa1) {
        this.valorInicialFaixa1 = valorInicialFaixa1;
    }

    public BigDecimal getValorFinalFaixa1() {
        return this.valorFinalFaixa1;
    }

    public void setValorFinalFaixa1(BigDecimal valorFinalFaixa1) {
        this.valorFinalFaixa1 = valorFinalFaixa1;
    }

    public BigDecimal getValorInicialFaixa2() {
        return this.valorInicialFaixa2;
    }

    public void setValorInicialFaixa2(BigDecimal valorInicialFaixa2) {
        this.valorInicialFaixa2 = valorInicialFaixa2;
    }

    public BigDecimal getValorFinalFaixa2() {
        return this.valorFinalFaixa2;
    }

    public void setValorFinalFaixa2(BigDecimal valorFinalFaixa2) {
        this.valorFinalFaixa2 = valorFinalFaixa2;
    }

    public BigDecimal getValorSalarioFamiliaFaixa2() {
        return this.valorSalarioFamiliaFaixa2;
    }

    public void setValorSalarioFamiliaFaixa2(BigDecimal valorSalarioFamiliaFaixa2) {
        this.valorSalarioFamiliaFaixa2 = valorSalarioFamiliaFaixa2;
    }

    public BigDecimal getValorSalarioFamiliaFaixa1() {
        return this.valorSalarioFamiliaFaixa1;
    }

    public void setValorSalarioFamiliaFaixa1(BigDecimal valorSalarioFamiliaFaixa1) {
        this.valorSalarioFamiliaFaixa1 = valorSalarioFamiliaFaixa1;
    }

    public static List<TabelaSalarioFamilia> obterTodos() {
        return TabelaSalarioFamilia.obterTodos(RepositorioDeTabelaSalarioFamilia.class);
    }

    public static List<TabelaSalarioFamilia> obterTodosDecrecente() {
        return TabelaSalarioFamilia.getRepositorio(RepositorioDeTabelaSalarioFamilia.class).obterTodos("competencia desc");
    }

    public static Map<Competencia, TabelaSalarioFamilia> obterTabelasDasCompetencias(Date competenciaInicial, Date competenciaFinal) {
        HashMap<Competencia, TabelaSalarioFamilia> tabelasDasCompetencias = new HashMap<Competencia, TabelaSalarioFamilia>();
        List<TabelaSalarioFamilia> tabelas = TabelaSalarioFamilia.getRepositorio(RepositorioDeTabelaSalarioFamilia.class).obterTabelasEntreCompetencias(competenciaInicial, competenciaFinal);
        for (TabelaSalarioFamilia tabela : tabelas) {
            tabelasDasCompetencias.put(new Competencia(tabela.getCompetencia()), tabela);
        }
        return tabelasDasCompetencias;
    }

    @Override
    protected EntidadeBase validar() {
        GerenciadorDeValidadores.getInstance().validar(TabelaSalarioFamilia.class, this);
        return super.validar();
    }

    @Override
    public void salvar() {
        this.sugerirValorInicialFaixa2();
        super.salvar();
    }

    public static void remover(TabelaSalarioFamilia tabelaSalarioFamilia) {
        TabelaSalarioFamilia.getRepositorio(RepositorioDeTabelaSalarioFamilia.class).remover(tabelaSalarioFamilia);
    }

    public BigDecimal getValorSalarioFamiliaParaO(BigDecimal valorRemuneracaoMensal) {
        if (Utils.naoNulo(valorRemuneracaoMensal)) {
            if (Utils.naoNulo(this.getValorFinalFaixa1()) && valorRemuneracaoMensal.compareTo(this.getValorFinalFaixa1()) <= 0) {
                return this.getValorSalarioFamiliaFaixa1();
            }
            if (Utils.naoNulo(this.getValorFinalFaixa2()) && valorRemuneracaoMensal.compareTo(this.getValorFinalFaixa2()) <= 0) {
                return this.getValorSalarioFamiliaFaixa2();
            }
        }
        return null;
    }

    public void criarTabelaParaProximaCompetencia() {
        TabelaSalarioFamilia tabela = new TabelaSalarioFamilia();
        HelperDate proximaCompetencia = HelperDate.getInstance(this.getCompetencia());
        proximaCompetencia.addMonth(1);
        tabela.setCompetencia(proximaCompetencia.getDate());
        tabela.setValorInicialFaixa1(this.getValorInicialFaixa1());
        tabela.setValorFinalFaixa1(this.getValorFinalFaixa1());
        tabela.setValorInicialFaixa2(this.getValorInicialFaixa2());
        tabela.setValorFinalFaixa2(this.getValorFinalFaixa2());
        tabela.setValorSalarioFamiliaFaixa1(this.getValorSalarioFamiliaFaixa1());
        tabela.setValorSalarioFamiliaFaixa2(this.getValorSalarioFamiliaFaixa2());
        tabela.salvar();
    }
}

