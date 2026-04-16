/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.resumo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public abstract class ResumoPorProcessoJRAdapter
extends JRAdapter {
    public abstract void popularItensResumoPorProcesso();

    public abstract JRAdapterDataSource<OcorrenciaResumoPorProcessoComInformacoesAdicionaisJRAdapter> getOcorrenciasReclamantes();

    public abstract BigDecimal getValorTotalBrutoDosReclamantes();

    public abstract BigDecimal getValorTotalLiquidoDosReclamantes();

    public abstract BigDecimal getValorTotalDevidoPeloReclamado();

    public abstract BigDecimal getValorTotalDebitosDosReclamantes();

    public abstract boolean getMostrarComentarios();

    public abstract String getComentarios();

    public abstract JRAdapterDataSource<OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasCreditoReclamante();

    public abstract BigDecimal getValorTotalCreditoReclamante();

    public abstract JRAdapterDataSource<OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasDebitoReclamante();

    public abstract BigDecimal getValorTotalDebitoReclamante();

    public abstract JRAdapterDataSource<OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasDebitoCobrarReclamante();

    public abstract BigDecimal getValorTotalDebitoCobrarReclamante();

    public abstract BigDecimal getValorLiquidoReclamante();

    public abstract JRAdapterDataSource<OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasDebitoReclamado();

    public abstract BigDecimal getValorTotalDebitoReclamado();

    public abstract JRAdapterDataSource<OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasCustasDebitoReclamado();

    public abstract BigDecimal getValorSubtotalCustasDebitoReclamado();

    public abstract JRAdapterDataSource<OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasVerbasForaDoPrincipal();

    public abstract BigDecimal getValorTotalVerbasForaDoPrincipal();

    public abstract JRAdapterDataSource<JREmptyDS> getEmptyDS();

    public static enum SecaoRelatorioResumoEnum {
        RECLAMANTES,
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
        private BigDecimal liquido;
        private BigDecimal totalReclamado;
        private BigDecimal debitos;

        public ItemResumo(SecaoRelatorioResumoEnum secao, String label, BigDecimal valor) {
            this.secao = secao;
            this.label = label == null ? "" : label;
            this.valor = Utils.arredondarValorMonetario(valor);
        }

        public ItemResumo(SecaoRelatorioResumoEnum secao, String label, BigDecimal valor, BigDecimal liquido, BigDecimal totalReclamado, BigDecimal debitos) {
            this(secao, label, valor);
            this.liquido = Utils.arredondarValorMonetario(liquido);
            this.totalReclamado = Utils.arredondarValorMonetario(totalReclamado);
            this.debitos = Utils.arredondarValorMonetario(debitos);
        }

        public String getLabel() {
            return this.label.toUpperCase();
        }

        public BigDecimal getValor() {
            return this.valor;
        }

        public BigDecimal getLiquido() {
            return this.liquido;
        }

        public BigDecimal getTotalReclamado() {
            return this.totalReclamado;
        }

        public BigDecimal getDebitos() {
            return this.debitos;
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

        public void setLiquido(BigDecimal liquido) {
            this.liquido = liquido;
        }

        public void setTotalReclamado(BigDecimal totalReclamado) {
            this.totalReclamado = totalReclamado;
        }

        public void setDebitos(BigDecimal debitos) {
            this.debitos = debitos;
        }

        public void setSecao(SecaoRelatorioResumoEnum secao) {
            this.secao = secao;
        }

        public String getValorFormatado() {
            return Utils.formatarValor(this.valor);
        }

        public String getLiquidoFormatado() {
            return Utils.formatarValor(this.liquido);
        }

        public String getTotalReclamadoFormatado() {
            return Utils.formatarValor(this.totalReclamado);
        }

        public String getDebitosFormatado() {
            return Utils.formatarValor(this.debitos);
        }
    }

    public static class ItensResumoAppender {
        private List<ItemResumo> itensReclamantes = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensCreditoReclamante = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensDebitoReclamante = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensDebitoCobrarReclamante = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensDebitoReclamado = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensCustasDebitoReclamado = new ArrayList<ItemResumo>();
        private List<ItemResumo> itensForaDoPrincipal = new ArrayList<ItemResumo>();
        private Total valorTotalBrutoDosReclamantes = Total.newInstance(true);
        private Total valorTotalLiquidoDosReclamantes = Total.newInstance(true);
        private Total valorTotalDebitosDosReclamantes = Total.newInstance(true);
        private Total valorTotalCreditoReclamante = Total.newInstance(true);
        private Total valorTotalDebitoReclamante = Total.newInstance(true);
        private Total valorSubtotalCustasDebitoReclamado = Total.newInstance(true);
        private Total valorTotalDebitoReclamado = Total.newInstance(true);
        private Total valorTotalVerbasForaDoPrincipal = Total.newInstance(true);
        private Total valorTotalDebitoCobrarReclamante = Total.newInstance(true);

        public void append(ItemResumo item) {
            switch (item.getSecao()) {
                case RECLAMANTES: {
                    this.itensReclamantes.add(item);
                    this.valorTotalBrutoDosReclamantes.acumular(item.getValor());
                    this.valorTotalLiquidoDosReclamantes.acumular(item.getLiquido());
                    this.valorTotalDebitosDosReclamantes.acumular(item.getDebitos());
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

        public List<ItemResumo> getItensReclamantes() {
            return this.itensReclamantes;
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

        public BigDecimal getValorTotalBrutoDosReclamantes() {
            return this.valorTotalBrutoDosReclamantes.getValor();
        }

        public BigDecimal getValorTotalLiquidoDosReclamantes() {
            return this.valorTotalLiquidoDosReclamantes.getValor();
        }

        public BigDecimal getValorTotalDebitosDosReclamantes() {
            return this.valorTotalDebitosDosReclamantes.getValor();
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

        public BigDecimal getValorTotalDebitoReclamado() {
            return this.valorTotalDebitoReclamado.getValor();
        }

        public BigDecimal getValorSubtotalCustasDebitoReclamado() {
            return Utils.subtrair(this.valorTotalDebitoReclamado.getValor(), this.valorSubtotalCustasDebitoReclamado.getValor());
        }

        public BigDecimal getValorTotalVerbasForaDoPrincipal() {
            return this.valorTotalVerbasForaDoPrincipal.getValor();
        }

        public BigDecimal getValorTotalDebitoCobrarReclamante() {
            return this.valorTotalDebitoCobrarReclamante.getValor();
        }
    }

    public abstract class OcorrenciaResumoPorProcessoComInformacoesAdicionaisJRAdapter
    extends OcorrenciaResumoPorProcessoJRAdapter {
        public abstract String getLiquido();

        public abstract String getTotalReclamado();

        public abstract String getDebitos();
    }

    public abstract class OcorrenciaResumoPorProcessoJRAdapter
    extends JRAdapter {
        public abstract String getDescricao();

        public abstract String getValor();
    }
}

