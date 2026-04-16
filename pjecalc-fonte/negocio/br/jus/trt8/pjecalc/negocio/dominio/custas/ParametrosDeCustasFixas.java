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
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.custas;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.dominio.custas.RepositorioDeParametrosDeCustasFixas;
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
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBPARAMETROCUSTAS")
@SequenceGenerator(name="SQPARAMETROCUSTAS", sequenceName="SQPARAMETROCUSTAS", allocationSize=1)
@Name(value="parametrosDeCustasFixas")
public class ParametrosDeCustasFixas
extends EntidadeBase {
    private static final long serialVersionUID = -4958065992727987128L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPARAMETROCUSTAS")
    @Column(name="IIDPARAMETROCUSTAS", nullable=false)
    private final Long id = null;
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="DDTINICIOVIGENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @Required
    private Date dataInicio;
    @Column(name="DDTFIMVIGENCIA", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataFim;
    @Column(name="RVLATOSURBANOSOFICIALJUSTICA", precision=12, scale=2)
    @Required
    private BigDecimal valorAtosUrbanosOficialJustica;
    @Column(name="RVLATOSRURAISOFICIALJUSTICA", precision=12, scale=2)
    @Required
    private BigDecimal valorAtosRuraisOficialJustica;
    @Column(name="RVLAGRAVOINSTRUMENTO", precision=12, scale=2)
    @Required
    private BigDecimal valorAgravoDeInstrumento;
    @Column(name="RVLAGRAVOPETICAO", precision=12, scale=2)
    @Required
    private BigDecimal valorAgravoDePeticao;
    @Column(name="RVLIMPUGNACAOSENTENCALIQUID", precision=12, scale=2)
    @Required
    private BigDecimal valorImpugnacaoSentencaDeLiquidacao;
    @Column(name="RVLEMBARGOSARREMATACAO", precision=12, scale=2)
    @Required
    private BigDecimal valorEmbargosAArrematacao;
    @Column(name="RVLEMBARGOSEXECUCAO", precision=12, scale=2)
    @Required
    private BigDecimal valorEmbargosAExecucao;
    @Column(name="RVLEMBARGOSTERCEIROS", precision=12, scale=2)
    @Required
    private BigDecimal valorEmbargosDeTerceiros;
    @Column(name="RVLRECURSOREVISTA", precision=12, scale=2)
    @Required
    private BigDecimal valorRecursoDeRevista;
    @Column(name="RVLPISOCUSTASCONHECIMENTO", precision=12, scale=2)
    @Required
    private BigDecimal valorPisoCustasConhecimento;
    @Column(name="RVLTETOCUSTASLIQUIDACAO", precision=12, scale=2)
    @Required
    private BigDecimal valorTetoCustasLiquidacao;
    @Column(name="RVLTETOCUSTASAUTOS", precision=12, scale=2)
    @Required
    private BigDecimal valorTetoCustasDeAutos;

    public ParametrosDeCustasFixas() {
        super(RepositorioDeParametrosDeCustasFixas.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Date getDataInicio() {
        return this.dataInicio;
    }

    public void setDataInicio(Date dataInicio) {
        this.dataInicio = dataInicio;
    }

    public Date getDataFim() {
        return this.dataFim;
    }

    public void setDataFim(Date dataFim) {
        this.dataFim = dataFim;
    }

    public BigDecimal getValorAtosUrbanosOficialJustica() {
        return this.valorAtosUrbanosOficialJustica;
    }

    public void setValorAtosUrbanosOficialJustica(BigDecimal valorAtosUrbanosOficialJustica) {
        this.valorAtosUrbanosOficialJustica = valorAtosUrbanosOficialJustica;
    }

    public BigDecimal getValorAtosRuraisOficialJustica() {
        return this.valorAtosRuraisOficialJustica;
    }

    public void setValorAtosRuraisOficialJustica(BigDecimal valorAtosRuraisOficialJustica) {
        this.valorAtosRuraisOficialJustica = valorAtosRuraisOficialJustica;
    }

    public BigDecimal getValorAgravoDeInstrumento() {
        return this.valorAgravoDeInstrumento;
    }

    public void setValorAgravoDeInstrumento(BigDecimal valorAgravoDeInstrumento) {
        this.valorAgravoDeInstrumento = valorAgravoDeInstrumento;
    }

    public BigDecimal getValorAgravoDePeticao() {
        return this.valorAgravoDePeticao;
    }

    public void setValorAgravoDePeticao(BigDecimal valorAgravoDePeticao) {
        this.valorAgravoDePeticao = valorAgravoDePeticao;
    }

    public BigDecimal getValorImpugnacaoSentencaDeLiquidacao() {
        return this.valorImpugnacaoSentencaDeLiquidacao;
    }

    public void setValorImpugnacaoSentencaDeLiquidacao(BigDecimal valorImpugnacaoSentencaDeLiquidacao) {
        this.valorImpugnacaoSentencaDeLiquidacao = valorImpugnacaoSentencaDeLiquidacao;
    }

    public BigDecimal getValorEmbargosAArrematacao() {
        return this.valorEmbargosAArrematacao;
    }

    public void setValorEmbargosAArrematacao(BigDecimal valorEmbargosAArrematacao) {
        this.valorEmbargosAArrematacao = valorEmbargosAArrematacao;
    }

    public BigDecimal getValorEmbargosAExecucao() {
        return this.valorEmbargosAExecucao;
    }

    public void setValorEmbargosAExecucao(BigDecimal valorEmbargosAExecucao) {
        this.valorEmbargosAExecucao = valorEmbargosAExecucao;
    }

    public BigDecimal getValorEmbargosDeTerceiros() {
        return this.valorEmbargosDeTerceiros;
    }

    public void setValorEmbargosDeTerceiros(BigDecimal valorEmbargosDeTerceiros) {
        this.valorEmbargosDeTerceiros = valorEmbargosDeTerceiros;
    }

    public BigDecimal getValorRecursoDeRevista() {
        return this.valorRecursoDeRevista;
    }

    public void setValorRecursoDeRevista(BigDecimal valorRecursoDeRevista) {
        this.valorRecursoDeRevista = valorRecursoDeRevista;
    }

    public BigDecimal getValorPisoCustasConhecimento() {
        return this.valorPisoCustasConhecimento;
    }

    public void setValorPisoCustasConhecimento(BigDecimal valorPisoCustasConhecimento) {
        this.valorPisoCustasConhecimento = valorPisoCustasConhecimento;
    }

    public BigDecimal getValorTetoCustasLiquidacao() {
        return this.valorTetoCustasLiquidacao;
    }

    public void setValorTetoCustasLiquidacao(BigDecimal valorTetoCustasLiquidacao) {
        this.valorTetoCustasLiquidacao = valorTetoCustasLiquidacao;
    }

    public BigDecimal getValorTetoCustasDeAutos() {
        return this.valorTetoCustasDeAutos;
    }

    public void setValorTetoCustasDeAutos(BigDecimal valorTetoCustasDeAutos) {
        this.valorTetoCustasDeAutos = valorTetoCustasDeAutos;
    }

    public void salvarNovoRegistro() {
        ParametrosDeCustasFixas.getRepositorio(RepositorioDeParametrosDeCustasFixas.class).salvarNovoRegistro(this);
    }

    @Override
    protected void salvar() {
        super.salvar();
    }

    public static void remover(ParametrosDeCustasFixas entidade) {
        ParametrosDeCustasFixas.getRepositorio(RepositorioDeParametrosDeCustasFixas.class).remover(entidade);
    }

    public static List<ParametrosDeCustasFixas> obterTodos() {
        return ParametrosDeCustasFixas.getRepositorio(RepositorioDeParametrosDeCustasFixas.class).obterTodos();
    }

    public static ParametrosDeCustasFixas obterPorData(Date data) {
        return ParametrosDeCustasFixas.getRepositorio(RepositorioDeParametrosDeCustasFixas.class).obterPorData(data);
    }

    public static ParametrosDeCustasFixas obterRegistroMaisAntigo() {
        return ParametrosDeCustasFixas.getRepositorio(RepositorioDeParametrosDeCustasFixas.class).obterRegistroMaisAntigo();
    }

    @Override
    public ParametrosDeCustasFixas validar() {
        GerenciadorDeValidadores.getInstance().validar(ParametrosDeCustasFixas.class, this);
        return this;
    }

    public boolean isVigenciaAtual() {
        return Utils.nulo(this.dataFim);
    }

    public boolean isDataContidaNaVigencia(Date data) {
        if (this.isVigenciaAtual()) {
            return HelperDate.dateAfterOrEquals(data, this.dataInicio);
        }
        return new Periodo(this.dataInicio, this.dataFim).isPeriodoContemEsta(data);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!super.equals(obj)) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        ParametrosDeCustasFixas other = (ParametrosDeCustasFixas)obj;
        if (this.dataFim == null ? other.dataFim != null : !this.dataFim.equals(other.dataFim)) {
            return false;
        }
        if (this.dataInicio == null ? other.dataInicio != null : !this.dataInicio.equals(other.dataInicio)) {
            return false;
        }
        if (this.valorAgravoDeInstrumento == null ? other.valorAgravoDeInstrumento != null : !this.valorAgravoDeInstrumento.equals(other.valorAgravoDeInstrumento)) {
            return false;
        }
        if (this.valorAgravoDePeticao == null ? other.valorAgravoDePeticao != null : !this.valorAgravoDePeticao.equals(other.valorAgravoDePeticao)) {
            return false;
        }
        if (this.valorAtosRuraisOficialJustica == null ? other.valorAtosRuraisOficialJustica != null : !this.valorAtosRuraisOficialJustica.equals(other.valorAtosRuraisOficialJustica)) {
            return false;
        }
        if (this.valorAtosUrbanosOficialJustica == null ? other.valorAtosUrbanosOficialJustica != null : !this.valorAtosUrbanosOficialJustica.equals(other.valorAtosUrbanosOficialJustica)) {
            return false;
        }
        if (this.valorEmbargosAArrematacao == null ? other.valorEmbargosAArrematacao != null : !this.valorEmbargosAArrematacao.equals(other.valorEmbargosAArrematacao)) {
            return false;
        }
        if (this.valorEmbargosAExecucao == null ? other.valorEmbargosAExecucao != null : !this.valorEmbargosAExecucao.equals(other.valorEmbargosAExecucao)) {
            return false;
        }
        if (this.valorEmbargosDeTerceiros == null ? other.valorEmbargosDeTerceiros != null : !this.valorEmbargosDeTerceiros.equals(other.valorEmbargosDeTerceiros)) {
            return false;
        }
        if (this.valorImpugnacaoSentencaDeLiquidacao == null ? other.valorImpugnacaoSentencaDeLiquidacao != null : !this.valorImpugnacaoSentencaDeLiquidacao.equals(other.valorImpugnacaoSentencaDeLiquidacao)) {
            return false;
        }
        if (this.valorPisoCustasConhecimento == null ? other.valorPisoCustasConhecimento != null : !this.valorPisoCustasConhecimento.equals(other.valorPisoCustasConhecimento)) {
            return false;
        }
        if (this.valorRecursoDeRevista == null ? other.valorRecursoDeRevista != null : !this.valorRecursoDeRevista.equals(other.valorRecursoDeRevista)) {
            return false;
        }
        if (this.valorTetoCustasDeAutos == null ? other.valorTetoCustasDeAutos != null : !this.valorTetoCustasDeAutos.equals(other.valorTetoCustasDeAutos)) {
            return false;
        }
        return !(this.valorTetoCustasLiquidacao == null ? other.valorTetoCustasLiquidacao != null : !this.valorTetoCustasLiquidacao.equals(other.valorTetoCustasLiquidacao));
    }
}

