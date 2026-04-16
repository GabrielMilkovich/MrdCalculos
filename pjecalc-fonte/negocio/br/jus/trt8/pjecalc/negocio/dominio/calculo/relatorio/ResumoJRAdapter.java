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

public abstract class ResumoJRAdapter
extends JRAdapter {
    public abstract void popularItensResumo();

    public abstract JRAdapterDataSource<OcorrenciaResumoComJurosJRAdapter> getOcorrenciasBrutoDevidoReclamante();

    public abstract BigDecimal getValorTotalBruto();

    public abstract BigDecimal getJurosTotalBruto();

    public abstract BigDecimal getTotalBruto();

    public abstract String getPercentuais();

    public abstract boolean getMostrarComentarios();

    public abstract String getComentarios();

    public abstract JRAdapterDataSource<OcorrenciaResumoJRAdapter> getOcorrenciasCreditoReclamante();

    public abstract BigDecimal getValorTotalCreditoReclamante();

    public abstract JRAdapterDataSource<OcorrenciaResumoJRAdapter> getOcorrenciasDebitoReclamante();

    public abstract JRAdapterDataSource<OcorrenciaResumoJRAdapter> getOcorrenciasDebitoCobrarReclamante();

    public abstract BigDecimal getValorTotalDebitoReclamante();

    public abstract BigDecimal getValorTotalDebitoCobrarReclamante();

    public abstract BigDecimal getValorLiquidoReclamante();

    public abstract JRAdapterDataSource<OcorrenciaResumoJRAdapter> getOcorrenciasDebitoReclamado();

    public abstract BigDecimal getValorTotalDebitoReclamado();

    public abstract JRAdapterDataSource<OcorrenciaResumoJRAdapter> getOcorrenciasCustasDebitoReclamado();

    public abstract BigDecimal getValorSubtotalCustasDebitoReclamado();

    public abstract JRAdapterDataSource<OcorrenciaResumoJRAdapter> getOcorrenciasVerbasForaDoPrincipal();

    public abstract BigDecimal getValorTotalVerbasForaDoPrincipal();

    public abstract JRAdapterDataSource<JREmptyDS> getEmptyDS();

    public static enum SecaoRelatorioResumoEnum {
        BRUTO_DEVIDO_RECLAMANTE,
        CREDITO_RECLAMANTE,
        DEBITO_RECLAMANTE,
        DEBITO_COBRAR_RECLAMANTE,
        DEBITO_RECLAMADO,
        CUSTAS_DEBITO_RECLAMADO,
        VERBAS_FORA_DO_PRINCIPAL;

    }

    public static class ItemResumo {
        private SecaoRelatorioResumoEnum secao;
        private String label;
        private BigDecimal valor;
        private BigDecimal juros;
        private BigDecimal total;

        public ItemResumo(SecaoRelatorioResumoEnum secao, String label, BigDecimal valor) {
            this.secao = secao;
            this.label = label;
            this.valor = Utils.arredondarValorMonetario(valor);
        }

        public ItemResumo(SecaoRelatorioResumoEnum secao, String label, BigDecimal valor, BigDecimal juros, BigDecimal total) {
            this(secao, label, valor);
            this.juros = juros;
            this.total = Utils.arredondarValorMonetario(total);
        }

        public String getLabel() {
            return this.label.toUpperCase();
        }

        public BigDecimal getValor() {
            return this.valor;
        }

        public BigDecimal getJuros() {
            return this.juros;
        }

        public BigDecimal getTotal() {
            return this.total;
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

        public void setJuros(BigDecimal juros) {
            this.juros = juros;
        }

        public void setTotal(BigDecimal total) {
            this.total = total;
        }

        public void setSecao(SecaoRelatorioResumoEnum secao) {
            this.secao = secao;
        }

        public String getValorFormatado() {
            return Utils.formatarValor(this.valor);
        }

        public String getJurosFormatado() {
            return Utils.formatarValor(this.juros);
        }

        public String getTotalFormatado() {
            return Utils.formatarValor(this.total);
        }
    }

    public static class ItensResumoAppender {
        private List<ItemResumo> itensBrutoDevidoReclamante = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensCreditoReclamante = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensDebitoReclamante = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensDebitoCobrarReclamante = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensDebitoReclamado = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensCustasDebitoReclamado = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensForaDoPrincipal = new ArrayList<ItemResumo>();
        private Total valorTotalBruto = Total.newInstance(true);
        private Total jurosTotalBruto = Total.newInstance(true);
        private Total totalBruto = Total.newInstance(true);
        private Total valorTotalCreditoReclamante = Total.newInstance(true);
        private Total valorTotalDebitoReclamante = Total.newInstance(true);
        private Total valorTotalDebitoCobrarReclamante = Total.newInstance(true);
        private Total valorTotalDebitoReclamado = Total.newInstance(true);
        private Total valorSubtotalCustasDebitoReclamado = Total.newInstance(true);
        private Total valorTotalVerbasForaDoPrincipal = Total.newInstance(true);

        public void append(ItemResumo item) {
            switch (item.getSecao()) {
                case BRUTO_DEVIDO_RECLAMANTE: {
                    this.itensBrutoDevidoReclamante.add(item);
                    this.valorTotalBruto.acumular(item.getValor());
                    this.jurosTotalBruto.acumular(item.getJuros());
                    this.totalBruto.acumular(item.getTotal());
                    break;
                }
                case CREDITO_RECLAMANTE: {
                    this.itensCreditoReclamante.add(item);
                    this.valorTotalCreditoReclamante.acumular(item.getValor());
                    break;
                }
                case DEBITO_RECLAMANTE: {
                    this.itensDebitoReclamante.add(item);
                    this.valorTotalDebitoReclamante.acumular(item.getValor());
                    break;
                }
                case DEBITO_COBRAR_RECLAMANTE: {
                    this.itensDebitoCobrarReclamante.add(item);
                    this.valorTotalDebitoCobrarReclamante.acumular(item.getValor());
                    break;
                }
                case DEBITO_RECLAMADO: {
                    this.itensDebitoReclamado.add(item);
                    this.valorTotalDebitoReclamado.acumular(item.getValor());
                    break;
                }
                case CUSTAS_DEBITO_RECLAMADO: {
                    this.itensCustasDebitoReclamado.add(item);
                    this.valorSubtotalCustasDebitoReclamado.acumular(item.getValor());
                    this.valorTotalDebitoReclamado.acumular(item.getValor());
                    break;
                }
                case VERBAS_FORA_DO_PRINCIPAL: {
                    this.itensForaDoPrincipal.add(item);
                    this.valorTotalVerbasForaDoPrincipal.acumular(item.getValor());
                    break;
                }
            }
        }

        public List<ItemResumo> getItensBrutoDevidoReclamante() {
            return this.itensBrutoDevidoReclamante;
        }

        public List<ItemResumo> getItensCreditoReclamante() {
            return this.itensCreditoReclamante;
        }

        public List<ItemResumo> getItensDebitoReclamante() {
            return this.itensDebitoReclamante;
        }

        public List<ItemResumo> getItensDebitoCobrarReclamante() {
            return this.itensDebitoCobrarReclamante;
        }

        public List<ItemResumo> getItensDebitoReclamado() {
            return this.itensDebitoReclamado;
        }

        public List<ItemResumo> getItensCustasDebitoReclamado() {
            return this.itensCustasDebitoReclamado;
        }

        public List<ItemResumo> getItensForaDoPrincipal() {
            return this.itensForaDoPrincipal;
        }

        public BigDecimal getValorTotalBruto() {
            return this.valorTotalBruto.getValor();
        }

        public BigDecimal getJurosTotalBruto() {
            return this.jurosTotalBruto.getValor();
        }

        public BigDecimal getTotalBruto() {
            return this.totalBruto.getValor();
        }

        public BigDecimal getValorTotalCreditoReclamante() {
            return this.valorTotalCreditoReclamante.getValor();
        }

        public BigDecimal getValorTotalDebitoReclamante() {
            return this.valorTotalDebitoReclamante.getValor();
        }

        public BigDecimal getValorTotalDebitoCobrarReclamante() {
            return this.valorTotalDebitoCobrarReclamante.getValor();
        }

        public BigDecimal getValorLiquidoReclamante() {
            return Utils.somar(this.getValorTotalCreditoReclamante(), this.getValorTotalDebitoReclamante());
        }

        public BigDecimal getValorTotalDebitoReclamado() {
            return this.valorTotalDebitoReclamado.getValor();
        }

        public BigDecimal getValorSubtotalCustasDebitoReclamado() {
            return Utils.subtrair(this.valorTotalDebitoReclamado.getValor(), this.valorSubtotalCustasDebitoReclamado.getValor());
        }

        public BigDecimal getValorTotalVerbasForaDoPrincipal() {
            return this.valorTotalVerbasForaDoPrincipal.getValor();
        }
    }

    public abstract class OcorrenciaResumoComJurosJRAdapter
    extends OcorrenciaResumoJRAdapter {
        public abstract String getJuros();

        public abstract String getTotal();
    }

    public abstract class OcorrenciaResumoJRAdapter
    extends JRAdapter {
        public abstract String getDescricao();

        public abstract String getValor();
    }
}

