/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Embedded
 *  javax.persistence.MappedSuperclass
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.validator.NotNull
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss;

import br.jus.trt8.pjecalc.base.comum.Constantes;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.inss.faixas.FaixaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.faixas.PrimeiraFaixaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.faixas.QuartaFaixaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.faixas.QuintaFaixaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.faixas.SegundaFaixaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.faixas.TerceiraFaixaPrevidenciaria;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Embedded;
import javax.persistence.MappedSuperclass;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.validator.NotNull;

@MappedSuperclass
public abstract class TabelaPrevidenciaria
extends EntidadeBase {
    private static final long serialVersionUID = 1957803221776121722L;
    @Column(name="DDTCOMPETENCIAREGISTRO")
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date competencia;
    @Column(name="RVLTETOMAXIMO", precision=19, scale=2, nullable=false)
    @NotNull
    private BigDecimal valorTetoMaximo = BigDecimal.ZERO;
    @Column(name="RVLTETOBENEFICIO", precision=19, scale=2, nullable=false)
    @NotNull
    private BigDecimal valorTetoBeneficio = BigDecimal.ZERO;
    @Embedded
    private PrimeiraFaixaPrevidenciaria primeiraFaixaPrevidenciaria;
    @Embedded
    private SegundaFaixaPrevidenciaria segundaFaixaPrevidenciaria;
    @Embedded
    private TerceiraFaixaPrevidenciaria terceiraFaixaPrevidenciaria;
    @Embedded
    private QuartaFaixaPrevidenciaria quartaFaixaPrevidenciaria;
    @Embedded
    private QuintaFaixaPrevidenciaria quintaFaixaPrevidenciaria;

    public TabelaPrevidenciaria(Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio) {
        super(classeDoRepositorio);
        this.primeiraFaixaPrevidenciaria = new PrimeiraFaixaPrevidenciaria();
        this.segundaFaixaPrevidenciaria = new SegundaFaixaPrevidenciaria();
        this.terceiraFaixaPrevidenciaria = new TerceiraFaixaPrevidenciaria();
    }

    public TabelaPrevidenciaria(Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio, Date competencia) {
        super(classeDoRepositorio);
        this.competencia = competencia;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public abstract void criarTabelaParaProximaCompetencia();

    @Override
    public abstract TabelaPrevidenciaria validar();

    public abstract boolean existe();

    public TabelaPrevidenciaria validar(String nomeTabela) {
        BigDecimal produto;
        NegocioException excecao = new NegocioException();
        FaixaPrevidenciaria ultimaFaixa = null;
        if (Utils.nulo(this.getCompetencia())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "mesAno" + nomeTabela, Mensagens.MSG0003, "M\u00eas/Ano"));
        }
        if (Utils.nulo(this.getValorTetoMaximo())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorTetoMaximo" + nomeTabela, Mensagens.MSG0003, "Valor do Teto M\u00e1ximo"));
        }
        this.getPrimeiraFaixaPrevidenciaria().validar(nomeTabela, excecao, true);
        this.getSegundaFaixaPrevidenciaria().validar(nomeTabela, excecao, true);
        boolean existeQuartaFaixa = Utils.naoNulo(this.quartaFaixaPrevidenciaria);
        this.getTerceiraFaixaPrevidenciaria().validar(nomeTabela, excecao, existeQuartaFaixa);
        ultimaFaixa = this.getTerceiraFaixaPrevidenciaria();
        boolean existeQuintaFaixa = Utils.naoNulo(this.quintaFaixaPrevidenciaria);
        if (existeQuartaFaixa) {
            this.quartaFaixaPrevidenciaria.validar(nomeTabela, excecao, existeQuintaFaixa);
            ultimaFaixa = this.quartaFaixaPrevidenciaria;
        }
        if (existeQuintaFaixa) {
            this.quintaFaixaPrevidenciaria.validar(nomeTabela, excecao, false);
            ultimaFaixa = this.quintaFaixaPrevidenciaria;
        }
        if (Utils.naoNulo(ultimaFaixa) && Utils.naoNulo(this.getValorTetoMaximo()) && Utils.naoNulo(produto = Utils.aplicarTaxa(ultimaFaixa.getAliquota(), ultimaFaixa.getValorInicial())) && this.getValorTetoMaximo().compareTo(produto) < 0) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valorTetoMaximo" + nomeTabela, Mensagens.MSG0007, "Valor do Teto M\u00e1ximo", "o produto do Valor Inicial pela Al\u00edquota da \u00faltima Faixa"));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public BigDecimal obterAliquotaParaValor(BigDecimal valor) {
        if (this.competencia.compareTo(Constantes.DATA_REFORMA_PREVIDENCIA) < 0) {
            if (this.getPrimeiraFaixaPrevidenciaria().getValorFinal() == null || valor.compareTo(this.getPrimeiraFaixaPrevidenciaria().getValorFinal()) <= 0) {
                return this.getPrimeiraFaixaPrevidenciaria().getAliquota();
            }
            if (this.getSegundaFaixaPrevidenciaria().getValorFinal() == null || valor.compareTo(this.getSegundaFaixaPrevidenciaria().getValorFinal()) <= 0) {
                return this.getSegundaFaixaPrevidenciaria().getAliquota();
            }
            if (this.getTerceiraFaixaPrevidenciaria().getValorFinal() == null || valor.compareTo(this.getTerceiraFaixaPrevidenciaria().getValorFinal()) <= 0) {
                return this.getTerceiraFaixaPrevidenciaria().getAliquota();
            }
            if (this.getQuartaFaixaPrevidenciaria().getValorFinal() == null || valor.compareTo(this.getQuartaFaixaPrevidenciaria().getValorFinal()) <= 0) {
                return this.getQuartaFaixaPrevidenciaria().getAliquota();
            }
            return this.getQuintaFaixaPrevidenciaria().getAliquota();
        }
        return this.obterAliquotaEfetivaParaValor(valor);
    }

    private BigDecimal obterAliquotaEfetivaParaValor(BigDecimal valor) {
        if (valor.compareTo(this.getPrimeiraFaixaPrevidenciaria().getValorFinal()) <= 0) {
            return this.getPrimeiraFaixaPrevidenciaria().getAliquota();
        }
        if (valor.compareTo(this.getValorTetoBeneficio()) >= 0) {
            return Utils.dividir(this.getValorTetoMaximo(), Utils.dividir(this.getValorTetoBeneficio(), Utils.CEM));
        }
        BigDecimal valorDeContribuicao = BigDecimal.ZERO;
        if (this.getQuintaFaixaPrevidenciaria() != null && valor.compareTo(this.getQuintaFaixaPrevidenciaria().getValorInicial()) >= 0) {
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getQuintaFaixaPrevidenciaria().calcularValorNaFaixa(valor));
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getQuartaFaixaPrevidenciaria().getValorMaximoDaFaixa());
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getTerceiraFaixaPrevidenciaria().getValorMaximoDaFaixa());
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getSegundaFaixaPrevidenciaria().getValorMaximoDaFaixa());
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getPrimeiraFaixaPrevidenciaria().getValorMaximoDaFaixa());
        } else if (this.getQuartaFaixaPrevidenciaria() != null && valor.compareTo(this.getQuartaFaixaPrevidenciaria().getValorInicial()) >= 0) {
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getQuartaFaixaPrevidenciaria().calcularValorNaFaixa(valor));
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getTerceiraFaixaPrevidenciaria().getValorMaximoDaFaixa());
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getSegundaFaixaPrevidenciaria().getValorMaximoDaFaixa());
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getPrimeiraFaixaPrevidenciaria().getValorMaximoDaFaixa());
        } else if (this.getTerceiraFaixaPrevidenciaria() != null && valor.compareTo(this.getTerceiraFaixaPrevidenciaria().getValorInicial()) >= 0) {
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getTerceiraFaixaPrevidenciaria().calcularValorNaFaixa(valor));
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getSegundaFaixaPrevidenciaria().getValorMaximoDaFaixa());
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getPrimeiraFaixaPrevidenciaria().getValorMaximoDaFaixa());
        } else if (this.getSegundaFaixaPrevidenciaria() != null && valor.compareTo(this.getSegundaFaixaPrevidenciaria().getValorInicial()) >= 0) {
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getSegundaFaixaPrevidenciaria().calcularValorNaFaixa(valor));
            valorDeContribuicao = Utils.somar(valorDeContribuicao, this.getPrimeiraFaixaPrevidenciaria().getValorMaximoDaFaixa());
        }
        return Utils.dividir(valorDeContribuicao, Utils.dividir(valor, Utils.CEM));
    }

    public Date getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    public SegundaFaixaPrevidenciaria getSegundaFaixaPrevidenciaria() {
        return this.segundaFaixaPrevidenciaria;
    }

    public void setSegundaFaixaPrevidenciaria(SegundaFaixaPrevidenciaria segundaFaixaPrevidenciaria) {
        this.segundaFaixaPrevidenciaria = segundaFaixaPrevidenciaria;
    }

    public PrimeiraFaixaPrevidenciaria getPrimeiraFaixaPrevidenciaria() {
        return this.primeiraFaixaPrevidenciaria;
    }

    public void setPrimeiraFaixaPrevidenciaria(PrimeiraFaixaPrevidenciaria primeiraFaixaPrevidenciaria) {
        this.primeiraFaixaPrevidenciaria = primeiraFaixaPrevidenciaria;
    }

    public TerceiraFaixaPrevidenciaria getTerceiraFaixaPrevidenciaria() {
        return this.terceiraFaixaPrevidenciaria;
    }

    public void setTerceiraFaixaPrevidenciaria(TerceiraFaixaPrevidenciaria terceiraFaixaPrevidenciaria) {
        this.terceiraFaixaPrevidenciaria = terceiraFaixaPrevidenciaria;
    }

    public QuartaFaixaPrevidenciaria getQuartaFaixaPrevidenciaria() {
        return this.quartaFaixaPrevidenciaria;
    }

    public void setQuartaFaixaPrevidenciaria(QuartaFaixaPrevidenciaria quartaFaixaPrevidenciaria) {
        this.quartaFaixaPrevidenciaria = quartaFaixaPrevidenciaria;
    }

    public QuintaFaixaPrevidenciaria getQuintaFaixaPrevidenciaria() {
        return this.quintaFaixaPrevidenciaria;
    }

    public void setQuintaFaixaPrevidenciaria(QuintaFaixaPrevidenciaria quintaFaixaPrevidenciaria) {
        this.quintaFaixaPrevidenciaria = quintaFaixaPrevidenciaria;
    }

    public BigDecimal getValorTetoMaximo() {
        return this.valorTetoMaximo;
    }

    public void setValorTetoMaximo(BigDecimal valorTetoMaximo) {
        this.valorTetoMaximo = valorTetoMaximo;
    }

    public BigDecimal getValorTetoBeneficio() {
        return this.valorTetoBeneficio;
    }

    public void setValorTetoBeneficio(BigDecimal valorTetoBeneficio) {
        this.valorTetoBeneficio = valorTetoBeneficio;
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.competencia == null ? 0 : this.competencia.hashCode());
        result = 31 * result + (this.obterChavePrimaria() == null ? 0 : this.obterChavePrimaria().hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null || !super.equals(obj) || this.getClass() != obj.getClass()) {
            return false;
        }
        TabelaPrevidenciaria other = (TabelaPrevidenciaria)obj;
        if (this.competencia == null && other.competencia != null || this.competencia != null && !this.competencia.equals(other.competencia)) {
            return false;
        }
        return !(this.obterChavePrimaria() == null ? other.obterChavePrimaria() != null : !this.obterChavePrimaria().equals(other.obterChavePrimaria()));
    }
}

