/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public abstract class EsocialInssFgtsJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<OcorrenciaGeralEventoS2500Adapter> getInformacoesGeraisEventoS2500();

    public abstract JRAdapterDataSource<OcorrenciaDetalhadaEventoS2500Adapter> getInformacoesDetalhadasEventoS2500();

    public static class ItemDetalhado {
        private Date ocorrencia;
        private BigDecimal valorBaseCalculoINSS;
        private BigDecimal valorBaseDecimoINSS;
        private BigDecimal valorBaseCalculoFGTS;
        private BigDecimal valorBaseDecimoFGTS;

        public ItemDetalhado(Date ocorrencia, BigDecimal valorBaseCalculoINSS, BigDecimal valorBaseDecimoINSS, BigDecimal valorBaseCalculoFGTS, BigDecimal valorBaseDecimoFGTS) {
            this.ocorrencia = ocorrencia;
            this.valorBaseCalculoINSS = valorBaseCalculoINSS;
            this.valorBaseDecimoINSS = valorBaseDecimoINSS;
            this.valorBaseCalculoFGTS = valorBaseCalculoFGTS;
            this.valorBaseDecimoFGTS = valorBaseDecimoFGTS;
        }

        public Date getOcorrencia() {
            return this.ocorrencia;
        }

        public void setOcorrencia(Date ocorrencia) {
            this.ocorrencia = ocorrencia;
        }

        public BigDecimal getValorBaseCalculoINSS() {
            return this.valorBaseCalculoINSS;
        }

        public void setValorBaseCalculoINSS(BigDecimal valorBaseCalculoINSS) {
            this.valorBaseCalculoINSS = valorBaseCalculoINSS;
        }

        public BigDecimal getValorBaseDecimoINSS() {
            return this.valorBaseDecimoINSS;
        }

        public void setValorBaseDecimoINSS(BigDecimal valorBaseDecimoINSS) {
            this.valorBaseDecimoINSS = valorBaseDecimoINSS;
        }

        public BigDecimal getValorBaseCalculoFGTS() {
            return this.valorBaseCalculoFGTS;
        }

        public void setValorBaseCalculoFGTS(BigDecimal valorBaseCalculoFGTS) {
            this.valorBaseCalculoFGTS = valorBaseCalculoFGTS;
        }

        public BigDecimal getValorBaseDecimoFGTS() {
            return this.valorBaseDecimoFGTS;
        }

        public void setValorBaseDecimoFGTS(BigDecimal valorBaseDecimoFGTS) {
            this.valorBaseDecimoFGTS = valorBaseDecimoFGTS;
        }

        public String getValorBaseCalculoINSSFormatado() {
            return Utils.formatarValor(this.valorBaseCalculoINSS);
        }

        public String getValorBaseDecimoINSSFormatado() {
            return Utils.formatarValor(this.valorBaseDecimoINSS);
        }

        public String getValorBaseCalculoFGTSFormatado() {
            return Utils.formatarValor(this.valorBaseCalculoFGTS);
        }

        public String getValorBaseDecimoFGTSFormatado() {
            return Utils.formatarValor(this.valorBaseDecimoFGTS);
        }
    }

    public static class ItemGeral {
        private String descricao;
        private String valorContribuicaoSocial;
        private String valorFGTS;

        public ItemGeral(String descricao, String valorContribuicaoSocial, String valorFGTS) {
            this.descricao = descricao;
            this.valorContribuicaoSocial = valorContribuicaoSocial;
            this.valorFGTS = valorFGTS;
        }

        public String getDescricao() {
            return this.descricao.toUpperCase();
        }

        public void setLabel(String label) {
            this.descricao = label;
        }

        public String getValorContribuicaoSocial() {
            return this.valorContribuicaoSocial;
        }

        public void setValorContribuicaoSocial(String valorContribuicaoSocial) {
            this.valorContribuicaoSocial = valorContribuicaoSocial;
        }

        public String getValorFGTS() {
            return this.valorFGTS;
        }

        public void setValorFGTS(String valorFGTS) {
            this.valorFGTS = valorFGTS;
        }
    }

    public static class ItensEventoS2500Appender {
        private List<ItemGeral> itensInformacoesGerais = new ArrayList<ItemGeral>();
        private List<ItemDetalhado> itensInformacoesDetalhadas = new ArrayList<ItemDetalhado>();

        public void append(ItemGeral item) {
            this.itensInformacoesGerais.add(item);
        }

        public List<ItemGeral> getItensInformacoesGerais() {
            return this.itensInformacoesGerais;
        }

        public void append(ItemDetalhado item) {
            this.itensInformacoesDetalhadas.add(item);
        }

        public List<ItemDetalhado> getItensInformacoesDetalhadas() {
            return this.itensInformacoesDetalhadas;
        }
    }

    public abstract class OcorrenciaDetalhadaEventoS2500Adapter
    extends JRAdapter {
        public abstract Date getOcorrencia();

        public abstract String getValorBaseCalculoINSS();

        public abstract String getValorBaseDecimoINSS();

        public abstract String getValorBaseCalculoFGTS();

        public abstract String getValorBaseDecimoFGTS();
    }

    public abstract class OcorrenciaGeralEventoS2500Adapter
    extends JRAdapter {
        public abstract String getDescricao();

        public abstract String getValorContribuicaoSocial();

        public abstract String getValorFGTS();
    }
}

