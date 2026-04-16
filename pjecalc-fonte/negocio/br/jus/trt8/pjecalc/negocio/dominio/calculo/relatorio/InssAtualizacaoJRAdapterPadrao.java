/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public class InssAtualizacaoJRAdapterPadrao
extends InssAtualizacaoJRAdapter {
    private List<OutrosDebitosReclamado> todosOutrosDebidosDoReclamado;
    private List<DebitosDoReclamante> todosDebidosDoReclamante;
    private InssSobreSalariosDevidos devidos;
    private InssSobreSalariosPagos pagos;

    public InssAtualizacaoJRAdapterPadrao() {
    }

    public InssAtualizacaoJRAdapterPadrao(Calculo calculo) {
        this.devidos = calculo.getInss().getInssSobreSalariosDevidos();
        this.pagos = calculo.getInss().getInssSobreSalariosPagos();
        this.todosOutrosDebidosDoReclamado = OutrosDebitosReclamado.obterTodos(calculo.getAtualizacao());
        this.todosDebidosDoReclamante = DebitosDoReclamante.obterTodos(calculo.getAtualizacao());
    }

    @Override
    public JRBeanCollectionDataSource getInssPorEventosDevidos() {
        ArrayList<InssPorEventoAdapterPadrao> irpfPorEvento = new ArrayList<InssPorEventoAdapterPadrao>();
        Set<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> ocorrenciasDevidos = this.devidos.getOcorrenciasAtualizacao();
        TreeSet<Date> datasDeEventoDevido = new TreeSet<Date>();
        for (OcorrenciaDeInssSobreSalariosDevidosAtualizacao o : ocorrenciasDevidos) {
            datasDeEventoDevido.add(o.getDataEvento());
        }
        for (Date dd : datasDeEventoDevido) {
            ArrayList<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> ocorrenciasNaData = new ArrayList<OcorrenciaDeInssSobreSalariosDevidosAtualizacao>();
            for (OcorrenciaDeInssSobreSalariosDevidosAtualizacao o : ocorrenciasDevidos) {
                if (!dd.equals(o.getDataEvento()) || o.getDevido().compareTo(BigDecimal.ZERO) <= 0) continue;
                ocorrenciasNaData.add(o);
            }
            if (ocorrenciasNaData.isEmpty()) continue;
            irpfPorEvento.add(new InssPorEventoAdapterPadrao(dd, ocorrenciasNaData, 'D'));
        }
        return new JRBeanCollectionDataSource(irpfPorEvento);
    }

    @Override
    public JRBeanCollectionDataSource getInssPorEventosPagos() {
        ArrayList<InssPorEventoAdapterPadrao> irpfPorEvento = new ArrayList<InssPorEventoAdapterPadrao>();
        Set<OcorrenciaDeInssSobreSalariosPagosAtualizacao> ocorrenciasPagos = this.pagos.getOcorrenciasAtualizacao();
        TreeSet<Date> datasDeEventoPago = new TreeSet<Date>();
        for (OcorrenciaDeInssSobreSalariosPagosAtualizacao o : ocorrenciasPagos) {
            datasDeEventoPago.add(o.getDataEvento());
        }
        for (Date dp : datasDeEventoPago) {
            ArrayList<OcorrenciaDeInssSobreSalariosPagosAtualizacao> ocorrenciasNaData = new ArrayList<OcorrenciaDeInssSobreSalariosPagosAtualizacao>();
            for (OcorrenciaDeInssSobreSalariosPagosAtualizacao o : ocorrenciasPagos) {
                if (!dp.equals(o.getDataEvento()) || o.getDevido().compareTo(BigDecimal.ZERO) <= 0) continue;
                ocorrenciasNaData.add(o);
            }
            if (ocorrenciasNaData.isEmpty()) continue;
            irpfPorEvento.add(new InssPorEventoAdapterPadrao(dp, ocorrenciasNaData, 'P'));
        }
        return new JRBeanCollectionDataSource(irpfPorEvento);
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    public class InssPorEventoAdapterPadrao
    extends InssAtualizacaoJRAdapter.InssPorEventoAdapter {
        private char tipo;
        private Date dataEvento;
        private List<? extends OcorrenciaDeInssAtualizacao> ocorrencias;
        private BigDecimal somatorioDevido = BigDecimal.ZERO;
        private BigDecimal somatorioJuros = BigDecimal.ZERO;
        private BigDecimal somatorioMulta = BigDecimal.ZERO;
        private BigDecimal somatorioTotal = BigDecimal.ZERO;
        private BigDecimal somatorioPago = BigDecimal.ZERO;
        private BigDecimal somatorioDiferenca = BigDecimal.ZERO;
        private BigDecimal somatorioJurosDiferenca = BigDecimal.ZERO;
        private BigDecimal somatorioMultaDiferenca = BigDecimal.ZERO;
        private BigDecimal somatorioTotalDiferenca = BigDecimal.ZERO;
        private BigDecimal valorPagamento = BigDecimal.ZERO;
        private BigDecimal valorPagoAMaior = BigDecimal.ZERO;

        public InssPorEventoAdapterPadrao() {
        }

        /*
         * WARNING - void declaration
         */
        public InssPorEventoAdapterPadrao(Date dataEvento, List<? extends OcorrenciaDeInssAtualizacao> ocorrencias, char tipo) {
            void var6_8;
            this.dataEvento = dataEvento;
            this.ocorrencias = ocorrencias;
            this.tipo = tipo;
            for (OcorrenciaDeInssAtualizacao ocorrenciaDeInssAtualizacao : ocorrencias) {
                this.somatorioDevido = Utils.somar(this.somatorioDevido, ocorrenciaDeInssAtualizacao.getDevidoCorrigido());
                this.somatorioJuros = Utils.somar(this.somatorioJuros, ocorrenciaDeInssAtualizacao.getJuros());
                this.somatorioMulta = Utils.somar(this.somatorioMulta, ocorrenciaDeInssAtualizacao.getMulta());
                this.somatorioTotal = Utils.somar(this.somatorioTotal, ocorrenciaDeInssAtualizacao.getTotal());
                this.somatorioPago = Utils.somar(this.somatorioPago, ocorrenciaDeInssAtualizacao.getPago());
                this.somatorioDiferenca = Utils.somar(this.somatorioDiferenca, ocorrenciaDeInssAtualizacao.getDevidoDiferenca());
                this.somatorioJurosDiferenca = Utils.somar(this.somatorioJurosDiferenca, ocorrenciaDeInssAtualizacao.getJurosDiferenca());
                this.somatorioMultaDiferenca = Utils.somar(this.somatorioMultaDiferenca, ocorrenciaDeInssAtualizacao.getMultaDiferenca());
                this.somatorioTotalDiferenca = Utils.somar(this.somatorioTotalDiferenca, ocorrenciaDeInssAtualizacao.getTotalDiferenca());
            }
            DebitosDoReclamante debitosDoReclamante = null;
            Object var6_7 = null;
            for (DebitosDoReclamante ddr : InssAtualizacaoJRAdapterPadrao.this.todosDebidosDoReclamante) {
                if (!ddr.getDataFinalPeriodo().equals(this.dataEvento) || !Utils.naoNulo(ddr.getPagoDescontoInss()) || ddr.getPagoDescontoInss().compareTo(BigDecimal.ZERO) <= 0) continue;
                debitosDoReclamante = ddr;
            }
            for (OutrosDebitosReclamado odr : InssAtualizacaoJRAdapterPadrao.this.todosOutrosDebidosDoReclamado) {
                if (!odr.getDataFinalPeriodo().equals(this.dataEvento) || (!Utils.naoNulo(odr.getValorPagoInssSalariosDevidos()) || odr.getValorPagoInssSalariosDevidos().compareTo(BigDecimal.ZERO) <= 0) && (!Utils.naoNulo(odr.getValorPagoInssSalariosPagos()) || odr.getValorPagoInssSalariosPagos().compareTo(BigDecimal.ZERO) <= 0)) continue;
                OutrosDebitosReclamado outrosDebitosReclamado = odr;
            }
            if (tipo == 'D') {
                if (Utils.naoNulo(debitosDoReclamante)) {
                    this.valorPagamento = Utils.somar(debitosDoReclamante.getPagoDescontoInss(), this.valorPagamento);
                }
                if (Utils.naoNulo(var6_8)) {
                    this.valorPagamento = Utils.somar(var6_8.getValorPagoInssSalariosDevidos(), this.valorPagamento);
                }
            } else if (Utils.naoNulo(var6_8)) {
                this.valorPagamento = Utils.somar(var6_8.getValorPagoInssSalariosPagos(), this.valorPagamento);
            }
            if (Utils.nulo(this.valorPagamento)) {
                this.valorPagamento = BigDecimal.ZERO;
            }
            this.valorPagoAMaior = Utils.subtrair(this.valorPagamento, this.somatorioPago);
        }

        @Override
        public String getTipo() {
            if (this.tipo == 'D') {
                return "Contribui\u00e7\u00e3o Social dos Sal\u00e1rios Devidos";
            }
            return "Contribui\u00e7\u00e3o Social dos Sal\u00e1rios Pagos";
        }

        @Override
        public Date getDataEvento() {
            return this.dataEvento;
        }

        @Override
        public JRBeanCollectionDataSource getOcorrencias() {
            return new JRBeanCollectionDataSource(this.ocorrencias);
        }

        @Override
        public BigDecimal getValorPagamento() {
            return this.valorPagamento;
        }

        @Override
        public BigDecimal getSomatorioDevido() {
            return this.somatorioDevido;
        }

        @Override
        public BigDecimal getSomatorioJuros() {
            return this.somatorioJuros;
        }

        @Override
        public BigDecimal getSomatorioMulta() {
            return this.somatorioMulta;
        }

        @Override
        public BigDecimal getSomatorioTotal() {
            return this.somatorioTotal;
        }

        @Override
        public BigDecimal getSomatorioPago() {
            return this.somatorioPago;
        }

        @Override
        public BigDecimal getSomatorioDiferenca() {
            return this.somatorioDiferenca;
        }

        @Override
        public BigDecimal getSomatorioJurosDiferenca() {
            return this.somatorioJurosDiferenca;
        }

        @Override
        public BigDecimal getSomatorioMultaDiferenca() {
            return this.somatorioMultaDiferenca;
        }

        @Override
        public BigDecimal getSomatorioTotalDiferenca() {
            return this.somatorioTotalDiferenca;
        }

        @Override
        public BigDecimal getValorPagoAMaior() {
            return this.valorPagoAMaior;
        }

        @Override
        public JRAdapter adapt(Object adapted) {
            return this;
        }
    }
}

