/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import java.math.BigDecimal;
import java.util.Date;

public abstract class FGTSJRAdapter
extends JRAdapter {
    public abstract String getNome();

    public abstract String getComentario();

    public abstract String getComentarioOperacoes();

    public abstract Periodo getPeriodo();

    public abstract String getFormula();

    public abstract JRAdapterDataSource<FGTSOcorrenciaAdapter> getOcorrencias();

    public abstract JRAdapterDataSource<FGTSOcorrenciaAdapter> getOcorrenciasComContribuicaoSocial();

    public abstract JRAdapterDataSource<FGTSOperacaoAdapter> getOperacoes();

    public abstract BigDecimal getTotalDaDiferencaCorrigidaDasOcorrencias();

    public abstract BigDecimal getTotalDeJurosDasOcorrencias();

    public abstract BigDecimal getTotalDasOcorrencias();

    public abstract BigDecimal getTotalDasOperacoesCorrigida();

    public abstract BigDecimal getTotalJurosDasOperacoes();

    public abstract BigDecimal getTotalGeralDasOperacoes();

    public abstract BigDecimal getTotalDaContribuicaoSocial05Corrigido();

    public abstract BigDecimal getTotalJurosDaContribuicaoSocial05();

    public abstract BigDecimal getTotalDaContribuicaoSocial05();

    public abstract FGTSComMultaJRAdapter getFgtsComMulta();

    public abstract FGTSComMultaJRAdapter getFgtsComMultaDoArtigo467();

    public abstract FGTSComMultaJRAdapter getFgtsComMultaDaLei110();

    public abstract boolean getMostrarSecaoOcorrencias();

    public abstract boolean getMostrarSecaoOperacoes();

    public abstract boolean getMostrarSecaoOcorrenciasComContribuicaoSocial();

    public abstract boolean getMostrarSecaoComMulta();

    public abstract boolean getMostrarSecaoArtigo467();

    public abstract boolean getMostrarSecaoLei110();

    public abstract boolean getMostrarJurosDepositadoSacado();

    public abstract class FGTSComMultaJRAdapter
    extends JRAdapter {
        public abstract String getNome();

        public abstract String getComentario();

        public abstract String getFormula();

        public abstract Date getDataDemissao();

        public abstract BigDecimal getBase();

        public abstract String getPercentual();

        public abstract BigDecimal getDevido();

        public abstract BigDecimal getIndiceCorrecao();

        public abstract BigDecimal getValorCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTotal();
    }

    public abstract class FGTSOperacaoAdapter
    extends JRAdapter {
        public abstract Date getDataOcorrencia();

        public abstract BigDecimal getValor();

        public abstract BigDecimal getIndiceCorrecao();

        public abstract BigDecimal getValorCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTotal();
    }

    public abstract class FGTSOcorrenciaAdapter
    extends JRAdapter {
        public abstract Date getCompetenciaOcorrencia();

        public abstract BigDecimal getBase();

        public abstract String getPercentual();

        public abstract BigDecimal getDevido();

        public abstract BigDecimal getDepositado();

        public abstract BigDecimal getDiferenca();

        public abstract BigDecimal getIndiceCorrecao();

        public abstract BigDecimal getDiferencaCorrigida();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTotal();
    }
}

