/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OperacaoDeFgts;
import java.io.Serializable;
import java.math.BigDecimal;

public class TotalizadorDoFgts
implements Serializable {
    private static final long serialVersionUID = 3497476687424572573L;
    private Fgts fgts;
    private boolean isCalculado;
    private boolean isCalculadoDepositadoESacado;
    private Total devido;
    private Total devidoCorrigidaPelaDataDaDemissao;
    private Total devidoCorrigidaPelaDataDaLiquidacao;
    private Total devidoSemAvisoCorrigidaPelaDataDaDemissao;
    private Total devidoSemAvisoCorrigidaPelaDataDaLiquidacao;
    private Total diferenca;
    private Total diferencaCorrigidaPelaDataDaDemissao;
    private Total diferencaCorrigidaPelaDataDaLiquidacao;
    private Total diferencaSemAvisoCorrigidaPelaDataDaDemissao;
    private Total diferencaSemAvisoCorrigidaPelaDataDaLiquidacao;
    private Total jurosPelaDataDaDemissao;
    private Total jurosPelaDataDaLiquidacao;
    private Total totalCorrigidoPelaDataDaDemissao;
    private Total totalCorrigidoPelaDataDaLiquidacao;
    private Total contribuicaoSocial05;
    private Total contribuicaoSocial05Corrigida;
    private Total jurosDaContribuicaoSocial05;
    private Total depositadoOuSacado;
    private Total depositadoOuSacadoCorrigidoPelaDataDaDemissao;
    private Total depositadoOuSacadoCorrigidoPelaDataDaLiquidacao;
    private Total jurosDoDepositadoOuSacadoPelaDataDaDemissao;
    private Total jurosDoDepositadoOuSacadoPelaDataDaLiquidacao;

    public TotalizadorDoFgts(Fgts fgts) {
        this.fgts = fgts;
        this.reset();
    }

    public void reset() {
        this.isCalculado = false;
    }

    public void resetDepositadoESacado() {
        this.isCalculadoDepositadoESacado = false;
    }

    private TotalizadorDoFgts calcular() {
        if (!this.isCalculado) {
            this.devido = Total.newInstance(true);
            this.devidoCorrigidaPelaDataDaDemissao = Total.newInstance(true);
            this.devidoCorrigidaPelaDataDaLiquidacao = Total.newInstance(true);
            this.devidoSemAvisoCorrigidaPelaDataDaDemissao = Total.newInstance(true);
            this.devidoSemAvisoCorrigidaPelaDataDaLiquidacao = Total.newInstance(true);
            this.diferenca = Total.newInstance(true);
            this.diferencaCorrigidaPelaDataDaDemissao = Total.newInstance(true);
            this.diferencaCorrigidaPelaDataDaLiquidacao = Total.newInstance(true);
            this.diferencaSemAvisoCorrigidaPelaDataDaDemissao = Total.newInstance(true);
            this.diferencaSemAvisoCorrigidaPelaDataDaLiquidacao = Total.newInstance(true);
            this.jurosPelaDataDaDemissao = Total.newInstance(true);
            this.jurosPelaDataDaLiquidacao = Total.newInstance(true);
            this.totalCorrigidoPelaDataDaDemissao = Total.newInstance(true);
            this.totalCorrigidoPelaDataDaLiquidacao = Total.newInstance(true);
            for (OcorrenciaDeFgts ocorrencia : this.fgts.getOcorrencias()) {
                this.devido.acumular(ocorrencia.getValorDevido());
                this.devidoCorrigidaPelaDataDaDemissao.acumular(ocorrencia.getValorDevidoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_DEMISSAO));
                this.devidoSemAvisoCorrigidaPelaDataDaDemissao.acumular(ocorrencia.getValorDevidoSemAvisoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_DEMISSAO));
                this.devidoCorrigidaPelaDataDaLiquidacao.acumular(ocorrencia.getValorDevidoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
                this.devidoSemAvisoCorrigidaPelaDataDaLiquidacao.acumular(ocorrencia.getValorDevidoSemAvisoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
                this.diferenca.acumular(ocorrencia.getDiferenca());
                this.diferencaCorrigidaPelaDataDaDemissao.acumular(ocorrencia.getDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_DEMISSAO));
                this.diferencaSemAvisoCorrigidaPelaDataDaDemissao.acumular(ocorrencia.getDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_DEMISSAO, Boolean.TRUE));
                this.diferencaCorrigidaPelaDataDaLiquidacao.acumular(ocorrencia.getDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
                this.diferencaSemAvisoCorrigidaPelaDataDaLiquidacao.acumular(ocorrencia.getDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO, Boolean.TRUE));
                this.jurosPelaDataDaDemissao.acumular(ocorrencia.getJuros(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_DEMISSAO));
                this.jurosPelaDataDaLiquidacao.acumular(ocorrencia.getJuros(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
                this.totalCorrigidoPelaDataDaDemissao.acumular(ocorrencia.getTotal(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_DEMISSAO));
                this.totalCorrigidoPelaDataDaLiquidacao.acumular(ocorrencia.getTotal(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
            }
            this.contribuicaoSocial05 = Total.newInstance(true);
            this.contribuicaoSocial05Corrigida = Total.newInstance(true);
            this.jurosDaContribuicaoSocial05 = Total.newInstance(true);
            for (OcorrenciaDeFgts ocorrencia : this.fgts.getOcorrenciasComContribuicaoSocial()) {
                this.contribuicaoSocial05.acumular(ocorrencia.getValorDaContribuicaoSocialDe05());
                this.contribuicaoSocial05Corrigida.acumular(ocorrencia.getValorDaContribuicaoSocialDe05Corrigido());
                this.jurosDaContribuicaoSocial05.acumular(ocorrencia.getJuros(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
            }
            this.isCalculado = true;
        }
        return this;
    }

    private TotalizadorDoFgts calcularDepositadoESacado() {
        if (!this.isCalculadoDepositadoESacado) {
            this.depositadoOuSacado = Total.newInstance(true);
            this.depositadoOuSacadoCorrigidoPelaDataDaDemissao = Total.newInstance(true);
            this.depositadoOuSacadoCorrigidoPelaDataDaLiquidacao = Total.newInstance(true);
            this.jurosDoDepositadoOuSacadoPelaDataDaDemissao = Total.newInstance(true);
            this.jurosDoDepositadoOuSacadoPelaDataDaLiquidacao = Total.newInstance(true);
            for (OperacaoDeFgts operacao : this.fgts.getOperacoesDeFgts()) {
                this.depositadoOuSacado.acumular(operacao.getValor());
                this.depositadoOuSacadoCorrigidoPelaDataDaDemissao.acumular(operacao.getValorCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_DEMISSAO));
                this.depositadoOuSacadoCorrigidoPelaDataDaLiquidacao.acumular(operacao.getValorCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
                this.jurosDoDepositadoOuSacadoPelaDataDaDemissao.acumular(operacao.getJuros(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_DEMISSAO));
                this.jurosDoDepositadoOuSacadoPelaDataDaLiquidacao.acumular(operacao.getJuros(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
            }
            this.isCalculadoDepositadoESacado = true;
        }
        return this;
    }

    public BigDecimal getDevido() {
        return this.calcular().devido.getValor();
    }

    public BigDecimal getDevidoCorrigido(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO.equals((Object)tipoDeCorrecao) ? this.calcular().devidoCorrigidaPelaDataDaLiquidacao.getValor() : this.calcular().devidoCorrigidaPelaDataDaDemissao.getValor();
    }

    public BigDecimal getDevidoSemAvisoCorrigido(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO.equals((Object)tipoDeCorrecao) ? this.calcular().devidoSemAvisoCorrigidaPelaDataDaLiquidacao.getValor() : this.calcular().devidoSemAvisoCorrigidaPelaDataDaDemissao.getValor();
    }

    public BigDecimal getDiferenca() {
        return this.calcular().diferenca.getValor();
    }

    public BigDecimal getDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO.equals((Object)tipoDeCorrecao) ? this.calcular().diferencaCorrigidaPelaDataDaLiquidacao.getValor() : this.calcular().diferencaCorrigidaPelaDataDaDemissao.getValor();
    }

    public BigDecimal getDiferencaSemAvisoCorrigida(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO.equals((Object)tipoDeCorrecao) ? this.calcular().diferencaSemAvisoCorrigidaPelaDataDaLiquidacao.getValor() : this.calcular().diferencaSemAvisoCorrigidaPelaDataDaDemissao.getValor();
    }

    public BigDecimal getJuros(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO.equals((Object)tipoDeCorrecao) ? this.calcular().jurosPelaDataDaLiquidacao.getValor() : this.calcular().jurosPelaDataDaDemissao.getValor();
    }

    public BigDecimal getTotalCorrigido(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO.equals((Object)tipoDeCorrecao) ? this.calcular().totalCorrigidoPelaDataDaLiquidacao.getValor() : this.calcular().devidoCorrigidaPelaDataDaDemissao.getValor();
    }

    public BigDecimal getContribuicaoSocial05() {
        return this.calcular().contribuicaoSocial05.getValor();
    }

    public BigDecimal getContribuicaoSocial05Corrigida() {
        return this.calcular().contribuicaoSocial05Corrigida.getValor();
    }

    public BigDecimal getJurosDaContribuicaoSocial05() {
        return this.calcular().jurosDaContribuicaoSocial05.getValor();
    }

    public BigDecimal getDepositadoOuSacado() {
        return this.calcularDepositadoESacado().depositadoOuSacado.getValor();
    }

    public BigDecimal getDepositadoOuSacadoCorrigido(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO.equals((Object)tipoDeCorrecao) ? this.calcularDepositadoESacado().depositadoOuSacadoCorrigidoPelaDataDaLiquidacao.getValor() : this.calcularDepositadoESacado().depositadoOuSacadoCorrigidoPelaDataDaDemissao.getValor();
    }

    public BigDecimal getJurosDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO.equals((Object)tipoDeCorrecao) ? this.calcularDepositadoESacado().jurosDoDepositadoOuSacadoPelaDataDaLiquidacao.getValor() : this.calcularDepositadoESacado().jurosDoDepositadoOuSacadoPelaDataDaDemissao.getValor();
    }
}

