/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.MappedSuperclass
 */
package br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import java.io.Serializable;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.MappedSuperclass;

@MappedSuperclass
public abstract class FaixaFiscal
implements Serializable {
    private static final long serialVersionUID = 746811403239854157L;
    @Column
    private BigDecimal valorInicial;
    @Column
    private BigDecimal valorFinal;
    @Column
    private BigDecimal aliquota;
    @Column
    private BigDecimal deducao;

    public FaixaFiscal() {
    }

    public FaixaFiscal(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota, BigDecimal deducao) {
        this.valorInicial = valorInicial;
        this.valorFinal = valorFinal;
        this.aliquota = aliquota;
        this.deducao = deducao;
    }

    public FaixaFiscal validar(String nomeTabela, NegocioException excecao, boolean validarValorFinal) {
        if (Utils.nulo(this.getValorInicial())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorInicialFaixa" + this.getDiscriminador() + nomeTabela, Mensagens.MSG0003, "Valor Inicial da Faixa " + this.getDiscriminador()));
        }
        if (validarValorFinal && Utils.nulo(this.getValorFinal())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorFinalFaixa" + this.getDiscriminador() + nomeTabela, Mensagens.MSG0003, "Valor Final da Faixa " + this.getDiscriminador()));
        }
        if (Utils.nulo(this.getAliquota())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("aliquotaFaixa" + this.getDiscriminador() + nomeTabela, Mensagens.MSG0003, "Al\u00edquota da Faixa " + this.getDiscriminador()));
        }
        if (Utils.nulo(this.getDeducao())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("deducaoFaixa" + this.getDiscriminador() + nomeTabela, Mensagens.MSG0003, "Parcela a Deduzir " + this.getDiscriminador()));
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

    public void adicionarNovoValorInicial(FaixaFiscal faixa) {
        if (Utils.naoNulo(faixa)) {
            this.valorInicial = faixa.getValorFinal().add(new BigDecimal("0.01"), Utils.CONTEXTO_MATEMATICO);
        }
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

    public BigDecimal getDeducao() {
        return this.deducao;
    }

    public void setDeducao(BigDecimal deducao) {
        this.deducao = deducao;
    }
}

