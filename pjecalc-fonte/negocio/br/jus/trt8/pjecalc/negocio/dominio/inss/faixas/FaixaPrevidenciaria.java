/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.MappedSuperclass
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.faixas;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import java.io.Serializable;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.MappedSuperclass;

@MappedSuperclass
public abstract class FaixaPrevidenciaria
implements Serializable {
    private static final BigDecimal UM_CENTAVO = new BigDecimal("0.01");
    private static final long serialVersionUID = -1487119367940986877L;
    @Column
    private BigDecimal valorInicial;
    @Column
    private BigDecimal valorFinal;
    @Column
    private BigDecimal aliquota;

    public FaixaPrevidenciaria() {
    }

    public FaixaPrevidenciaria(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota) {
        this.valorInicial = valorInicial;
        this.valorFinal = valorFinal;
        this.aliquota = aliquota;
    }

    public FaixaPrevidenciaria validar(String nomeTabela, NegocioException excecao, boolean validarValorFinal) {
        if (Utils.nulo(this.getValorInicial())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorInicialFaixa" + this.getDiscriminador() + nomeTabela, Mensagens.MSG0003, "Valor Inicial da Faixa " + this.getDiscriminador()));
        }
        if (validarValorFinal && Utils.nulo(this.getValorFinal())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorFinalFaixa" + this.getDiscriminador() + nomeTabela, Mensagens.MSG0003, "Valor Final da Faixa " + this.getDiscriminador()));
        }
        if (Utils.nulo(this.getAliquota())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("aliquotaFaixa" + this.getDiscriminador() + nomeTabela, Mensagens.MSG0003, "Al\u00edquota da Faixa " + this.getDiscriminador()));
        }
        if (Utils.naoNulos(this.getValorFinal(), this.getValorInicial()) && this.isValorFinalMenorOuIgualQueValorInicial()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorFinalFaixa" + this.getDiscriminador() + nomeTabela, Mensagens.MSG0007, "Valor Final", "Valor Inicial"));
        }
        return this;
    }

    public abstract String getDiscriminador();

    public boolean isValorFinalMenorOuIgualQueValorInicial() {
        return this.valorFinal.compareTo(this.valorInicial) <= 0;
    }

    public void adicionarNovoValorInicial(FaixaPrevidenciaria faixa) {
        if (Utils.naoNulo(faixa)) {
            this.valorInicial = faixa.getValorFinal().add(UM_CENTAVO, Utils.CONTEXTO_MATEMATICO);
        }
    }

    public BigDecimal getValorMaximoDaFaixa() {
        if (this.valorFinal == null) {
            return null;
        }
        return Utils.multiplicar(Utils.subtrair(this.valorFinal, Utils.subtrair(this.valorInicial, UM_CENTAVO)), Utils.dividir(this.aliquota, Utils.CEM));
    }

    public BigDecimal calcularValorNaFaixa(BigDecimal valorBase) {
        if (valorBase == null) {
            return null;
        }
        if (valorBase.compareTo(this.valorInicial) < 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal valorBaseNaFaixa = Utils.subtrair(valorBase, Utils.subtrair(this.valorInicial, UM_CENTAVO));
        return Utils.multiplicar(valorBaseNaFaixa, Utils.dividir(this.aliquota, Utils.CEM));
    }

    public void sugerirValorMaximoParaValorFinal() {
        this.valorFinal = null;
    }

    public BigDecimal getValorInicial() {
        return this.valorInicial;
    }

    public void setValorInicial(BigDecimal valorInicial) {
        this.valorInicial = valorInicial;
    }

    public BigDecimal getValorFinal() {
        return this.valorFinal;
    }

    public void setValorFinal(BigDecimal valorFinal) {
        this.valorFinal = valorFinal;
    }

    public BigDecimal getAliquota() {
        return this.aliquota;
    }

    public void setAliquota(BigDecimal aliquota) {
        this.aliquota = aliquota;
    }
}

