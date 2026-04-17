/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public abstract class ResumoJRAdapterPagamento
extends JRAdapter {
    public abstract void popularItensResumo();

    public abstract JRAdapterDataSource<OcorrenciaResumoJRAdapter> getOcorrenciasDebitoReclamado();

    public abstract JRAdapterDataSource<OcorrenciaResumoJRAdapter> getOcorrenciasDebitoCobrarReclamante();

    public abstract BigDecimal getValorTotalDebitoReclamado();

    public abstract BigDecimal getValorTotalDebitoCobrarReclamante();

    public abstract String getDescritivoDeEventos();

    public abstract String getComentarios();

    public abstract String getObservacoesReclamada();

    public abstract String getObservacoesReclamante();

    public abstract JRAdapterDataSource<JREmptyDS> getEmptyDS();

    public static enum SecaoRelatorioResumoEnum {
        DEBITO_RECLAMADO,
        DEBITO_COBRAR_RECLAMANTE;

    }

    public static class ItemResumo {
        private SecaoRelatorioResumoEnum secao;
        private String label;
        private BigDecimal valor;

        public ItemResumo(SecaoRelatorioResumoEnum secao, String label, BigDecimal valor) {
            this.secao = secao;
            this.label = label;
            this.valor = Utils.arredondarValorMonetario(valor);
        }

        public String getLabel() {
            return this.label.toUpperCase();
        }

        public BigDecimal getValor() {
            return this.valor;
        }

        public SecaoRelatorioResumoEnum getSecao() {
            return this.secao;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public void setValor(BigDecimal valor) {
            this.valor = valor;
        }

        public void setSecao(SecaoRelatorioResumoEnum secao) {
            this.secao = secao;
        }

        public String getValorFormatado() {
            return Utils.formatarValor(this.valor);
        }
    }

    public static class ItensResumoAppender {
        private List<ItemResumo> itensDebitoReclamado = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensDebitoCobrarReclamante = new ArrayList<ItemResumo>();
        private Total valorTotalDebitoReclamado = Total.newInstance(true);
        private Total valorTotalDebitoCobrarReclamante = Total.newInstance(true);

        public void append(ItemResumo item) {
            switch (item.getSecao()) {
                case DEBITO_RECLAMADO: {
                    this.itensDebitoReclamado.add(item);
                    this.valorTotalDebitoReclamado.acumular(item.getValor());
                    break;
                }
                case DEBITO_COBRAR_RECLAMANTE: {
                    this.itensDebitoCobrarReclamante.add(item);
                    this.valorTotalDebitoCobrarReclamante.acumular(item.getValor());
                    break;
                }
            }
        }

        public List<ItemResumo> getItensDebitoReclamado() {
            return this.itensDebitoReclamado;
        }

        public List<ItemResumo> getItensDebitoCobrarReclamante() {
            return this.itensDebitoCobrarReclamante;
        }

        public BigDecimal getValorTotalDebitoReclamado() {
            return this.valorTotalDebitoReclamado.getValor();
        }

        public BigDecimal getValorTotalDebitoCobrarReclamante() {
            return this.valorTotalDebitoCobrarReclamante.getValor();
        }
    }

    public abstract class OcorrenciaResumoJRAdapter
    extends JRAdapter {
        public abstract String getDescricao();

        public abstract String getValor();
    }
}

