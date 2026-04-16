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

public abstract class AbstractResumoPrecatorioJrAdapter
extends JRAdapter {
    public abstract void popularItensResumoPrecatorio();

    public abstract BigDecimal getValorTotalBruto();

    public abstract BigDecimal getJurosTotalBruto();

    public abstract BigDecimal getTotalBruto();

    public abstract BigDecimal getValorTotalCreditoReclamante();

    public abstract BigDecimal getValorTotalDebitoReclamante();

    public abstract BigDecimal getValorLiquidoReclamante();

    public abstract JRAdapterDataSource<AbstractOcorrenciaResumoPrecatorioJrAdapter> getOcorrenciasVerbasForaDoPrincipal();

    public abstract JRAdapterDataSource<AbstractOcorrenciaResumoPrecatorioJrAdapter> getOcorrenciasValorRequisitadoUm();

    public abstract BigDecimal getValorTotalRequisitadoUm();

    public abstract JRAdapterDataSource<AbstractOcorrenciaResumoPrecatorioJrAdapter> getOcorrenciasValorRequisitadoDois();

    public abstract BigDecimal getValorTotalRequisitadoDois();

    public abstract BigDecimal getValorTotalRequisitadoPrecatorio();

    public abstract JRAdapterDataSource<AbstractOcorrenciaResumoPrecatorioJrAdapter> getOcorrenciasOutrosDebitosReclamante();

    public abstract BigDecimal getValorTotalOutrosDebitosReclamante();

    public abstract JRAdapterDataSource<AbstractOcorrenciaResumoPrecatorioJrAdapter> getOcorrenciasOutrosDebitosReclamada();

    public abstract BigDecimal getValorTotalOutrosDebitosReclamada();

    public abstract JRAdapterDataSource<JREmptyDS> getEmptyDS();

    public static enum SecaoRelatorioResumoPrecatorioEnum {
        BRUTO_DEVIDO_RECLAMANTE,
        CREDITO_RECLAMANTE,
        DEBITO_RECLAMANTE,
        VERBAS_FORA_DO_PRINCIPAL,
        VALOR_REQUISITADO_UM,
        VALOR_REQUISITADO_DOIS,
        OUTROS_DEBITOS_RECLAMANTE,
        OUTROS_DEBITOS_RECLAMADA;

    }

    public static class ItemResumoPrecatorio {
        private SecaoRelatorioResumoPrecatorioEnum secao;
        private String label;
        private String valorDescrito;
        private BigDecimal valor;
        private BigDecimal juros;
        private BigDecimal total;

        public ItemResumoPrecatorio(SecaoRelatorioResumoPrecatorioEnum secao, String label, BigDecimal valor) {
            this.secao = secao;
            this.label = label;
            this.valor = Utils.arredondarValorMonetario(valor);
        }

        public ItemResumoPrecatorio(SecaoRelatorioResumoPrecatorioEnum secao, String label, BigDecimal valor, BigDecimal juros, BigDecimal total) {
            this(secao, label, valor);
            this.juros = juros;
            this.total = Utils.arredondarValorMonetario(total);
        }

        public ItemResumoPrecatorio(SecaoRelatorioResumoPrecatorioEnum secao, String label, String valorDescrito) {
            this.secao = secao;
            this.label = label;
            this.valorDescrito = valorDescrito;
        }

        public String getLabel() {
            return this.label.toUpperCase();
        }

        public BigDecimal getValor() {
            return this.valor;
        }

        public String getValorDescrito() {
            return this.valorDescrito;
        }

        public BigDecimal getJuros() {
            return this.juros;
        }

        public BigDecimal getTotal() {
            return this.total;
        }

        public SecaoRelatorioResumoPrecatorioEnum getSecao() {
            return this.secao;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public void setValor(BigDecimal valor) {
            this.valor = valor;
        }

        public void setValorDescrito(String valorDescrito) {
            this.valorDescrito = valorDescrito;
        }

        public void setJuros(BigDecimal juros) {
            this.juros = juros;
        }

        public void setTotal(BigDecimal total) {
            this.total = total;
        }

        public void setSecao(SecaoRelatorioResumoPrecatorioEnum secao) {
            this.secao = secao;
        }

        public String getValorFormatado() {
            return Utils.naoNulo(this.valorDescrito) ? this.valorDescrito : Utils.formatarValor(this.valor);
        }

        public String getJurosFormatado() {
            return Utils.formatarValor(this.juros);
        }

        public String getTotalFormatado() {
            return Utils.formatarValor(this.total);
        }
    }

    public static class ItensResumoPrecatorioAppender {
        private List<ItemResumoPrecatorio> itensBrutoDevidoReclamante = new ArrayList<ItemResumoPrecatorio>();
        private List<ItemResumoPrecatorio> itensCreditoReclamante = new ArrayList<ItemResumoPrecatorio>();
        private List<ItemResumoPrecatorio> itensDebitoReclamante = new ArrayList<ItemResumoPrecatorio>();
        private List<ItemResumoPrecatorio> itensForaDoPrincipal = new ArrayList<ItemResumoPrecatorio>();
        private List<ItemResumoPrecatorio> itensValorRequisitado = new ArrayList<ItemResumoPrecatorio>();
        private List<ItemResumoPrecatorio> itensValorRequisitadoDois = new ArrayList<ItemResumoPrecatorio>();
        private List<ItemResumoPrecatorio> itensOutrosDebitosReclamante = new ArrayList<ItemResumoPrecatorio>();
        private List<ItemResumoPrecatorio> itensOutrosDebitosReclamada = new ArrayList<ItemResumoPrecatorio>();
        private Total valorTotalBruto = Total.newInstance(true);
        private Total jurosTotalBruto = Total.newInstance(true);
        private Total totalBruto = Total.newInstance(true);
        private Total valorTotalCreditoReclamante = Total.newInstance(true);
        private Total valorTotalDebitoReclamante = Total.newInstance(true);
        private Total valorTotalVerbasForaDoPrincipal = Total.newInstance(true);
        private Total valorTotalRequisitado = Total.newInstance(true);
        private Total valorTotalRequisitadoDois = Total.newInstance(true);
        private Total valorTotalOutrosDebitosReclamante = Total.newInstance(true);
        private Total valorTotalOutrosDebitosReclamada = Total.newInstance(true);

        public void adicionar(ItemResumoPrecatorio item) {
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
                case VERBAS_FORA_DO_PRINCIPAL: {
                    this.itensForaDoPrincipal.add(item);
                    this.valorTotalVerbasForaDoPrincipal.acumular(item.getValor());
                    break;
                }
                case VALOR_REQUISITADO_UM: {
                    this.itensValorRequisitado.add(item);
                    this.valorTotalRequisitado.acumular(item.getValor());
                    break;
                }
                case VALOR_REQUISITADO_DOIS: {
                    this.itensValorRequisitadoDois.add(item);
                    this.valorTotalRequisitadoDois.acumular(item.getValor());
                    break;
                }
                case OUTROS_DEBITOS_RECLAMANTE: {
                    this.itensOutrosDebitosReclamante.add(item);
                    this.valorTotalOutrosDebitosReclamante.acumular(item.getValor());
                    break;
                }
                case OUTROS_DEBITOS_RECLAMADA: {
                    this.itensOutrosDebitosReclamada.add(item);
                    this.valorTotalOutrosDebitosReclamada.acumular(item.getValor());
                    break;
                }
            }
        }

        public List<ItemResumoPrecatorio> getItensBrutoDevidoReclamante() {
            return this.itensBrutoDevidoReclamante;
        }

        public List<ItemResumoPrecatorio> getItensCreditoReclamante() {
            return this.itensCreditoReclamante;
        }

        public List<ItemResumoPrecatorio> getItensDebitoReclamante() {
            return this.itensDebitoReclamante;
        }

        public List<ItemResumoPrecatorio> getItensForaDoPrincipal() {
            return this.itensForaDoPrincipal;
        }

        public List<ItemResumoPrecatorio> getItensValorRequisitado() {
            return this.itensValorRequisitado;
        }

        public List<ItemResumoPrecatorio> getItensValorRequisitadoDois() {
            return this.itensValorRequisitadoDois;
        }

        public List<ItemResumoPrecatorio> getItensOutrosDebitosReclamante() {
            return this.itensOutrosDebitosReclamante;
        }

        public List<ItemResumoPrecatorio> getItensOutrosDebitosReclamada() {
            return this.itensOutrosDebitosReclamada;
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

        public BigDecimal getValorLiquidoReclamante() {
            return Utils.somar(this.getValorTotalCreditoReclamante(), this.getValorTotalDebitoReclamante());
        }

        public BigDecimal getValorTotalRequisitadoPrecatorio() {
            return Utils.somar(this.getValorTotalRequisitado().getValor(), this.getValorTotalRequisitadoDois().getValor());
        }

        public Total getValorTotalRequisitado() {
            return this.valorTotalRequisitado;
        }

        public Total getValorTotalRequisitadoDois() {
            return this.valorTotalRequisitadoDois;
        }

        public Total getValorTotalOutrosDebitosReclamante() {
            return this.valorTotalOutrosDebitosReclamante;
        }

        public Total getValorTotalOutrosDebitosReclamada() {
            return this.valorTotalOutrosDebitosReclamada;
        }
    }

    public abstract class AbstractOcorrenciaResumoPrecatorioComJurosJrAdapter
    extends AbstractOcorrenciaResumoPrecatorioJrAdapter {
        public abstract String getJuros();

        public abstract String getTotal();
    }

    public abstract class AbstractOcorrenciaResumoPrecatorioJrAdapter
    extends JRAdapter {
        public abstract String getDescricao();

        public abstract String getValor();
    }
}

