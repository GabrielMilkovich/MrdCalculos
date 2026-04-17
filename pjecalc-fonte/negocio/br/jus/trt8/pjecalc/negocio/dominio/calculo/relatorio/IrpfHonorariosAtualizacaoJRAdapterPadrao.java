/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Sets
 *  com.google.common.collect.Sets$SetView
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfHonorariosAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import com.google.common.collect.Sets;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public class IrpfHonorariosAtualizacaoJRAdapterPadrao
extends IrpfHonorariosAtualizacaoJRAdapter {
    private Calculo calculo;
    private List<IrpfHonorariosAtualizacaoJRAdapter.IrpfHonorariosPorEventoJRAdapter> irpfHonorariosPorEvento = new ArrayList<IrpfHonorariosAtualizacaoJRAdapter.IrpfHonorariosPorEventoJRAdapter>();
    private List<HonorarioDaAtualizacao> ocorrenciasDoSaldo = new ArrayList<HonorarioDaAtualizacao>();

    public IrpfHonorariosAtualizacaoJRAdapterPadrao() {
    }

    public IrpfHonorariosAtualizacaoJRAdapterPadrao(Calculo calculo) {
        this.calculo = calculo;
        this.init();
    }

    private void init() {
        List<DebitosDoReclamante> todosDebitosDoReclamante = DebitosDoReclamante.obterTodos(this.calculo.getAtualizacao());
        for (DebitosDoReclamante debitosDoReclamante : todosDebitosDoReclamante) {
            ArrayList<HonorarioDaAtualizacao> honorariosDaAtualizacao = new ArrayList<HonorarioDaAtualizacao>();
            Sets.SetView union = Sets.union(debitosDoReclamante.getHonorariosDaAtualizacaoCalculado(), debitosDoReclamante.getHonorariosDaAtualizacaoInformado());
            for (Object h : union) {
                if (!((HonorarioDaAtualizacao)h).getHonorario().getApurarIRRF().booleanValue()) continue;
                if (Utils.naoNulo(((HonorarioDaAtualizacao)h).getPagoHonorario()) && ((HonorarioDaAtualizacao)h).getPagoHonorario().compareTo(BigDecimal.ZERO) > 0) {
                    honorariosDaAtualizacao.add((HonorarioDaAtualizacao)h);
                }
                BigDecimal baseDeImpostoDoSaldo = ((HonorarioDaAtualizacao)h).getBaseDeImpostoDoSaldo();
                if (!HelperDate.dateEquals(this.getDataLiquidacaoAtualizacao(), debitosDoReclamante.getDataFinalPeriodo()) || !Utils.naoNulo(baseDeImpostoDoSaldo) || baseDeImpostoDoSaldo.compareTo(BigDecimal.ZERO) <= 0) continue;
                this.ocorrenciasDoSaldo.add((HonorarioDaAtualizacao)h);
            }
            if (honorariosDaAtualizacao.isEmpty()) continue;
            this.irpfHonorariosPorEvento.add(new IrpfHonorariosPorEventoJRAdapterPadrao(debitosDoReclamante.getDataFinalPeriodo(), honorariosDaAtualizacao));
        }
        List<OutrosDebitosReclamado> todosOutrosDebitosReclamado = OutrosDebitosReclamado.obterTodos(this.calculo.getAtualizacao());
        for (OutrosDebitosReclamado outrosDebitos : todosOutrosDebitosReclamado) {
            ArrayList<HonorarioDaAtualizacao> honorariosDaAtualizacao = new ArrayList<HonorarioDaAtualizacao>();
            Sets.SetView union = Sets.union(outrosDebitos.getHonorariosDaAtualizacaoCalculado(), outrosDebitos.getHonorariosDaAtualizacaoInformado());
            for (HonorarioDaAtualizacao h : union) {
                if (!h.getHonorario().getApurarIRRF().booleanValue()) continue;
                if (Utils.naoNulo(h.getPagoHonorario()) && h.getPagoHonorario().compareTo(BigDecimal.ZERO) > 0) {
                    honorariosDaAtualizacao.add(h);
                }
                BigDecimal baseDeImpostoDoSaldo = h.getBaseDeImpostoDoSaldo();
                if (!HelperDate.dateEquals(this.getDataLiquidacaoAtualizacao(), outrosDebitos.getDataFinalPeriodo()) || !Utils.naoNulo(baseDeImpostoDoSaldo) || baseDeImpostoDoSaldo.compareTo(BigDecimal.ZERO) <= 0) continue;
                this.ocorrenciasDoSaldo.add(h);
            }
            if (!honorariosDaAtualizacao.isEmpty()) {
                this.irpfHonorariosPorEvento.add(new IrpfHonorariosPorEventoJRAdapterPadrao(outrosDebitos.getDataFinalPeriodo(), honorariosDaAtualizacao));
            }
            Collections.sort(this.ocorrenciasDoSaldo, new Comparator<HonorarioDaAtualizacao>(){

                @Override
                public int compare(HonorarioDaAtualizacao o1, HonorarioDaAtualizacao o2) {
                    return o1.getHonorario().getNomeCredor().compareTo(o2.getHonorario().getNomeCredor());
                }
            });
        }
        List<DebitosCobrarDoReclamante> list = DebitosCobrarDoReclamante.obterTodos(this.calculo.getAtualizacao());
        for (DebitosCobrarDoReclamante cobrar : list) {
            ArrayList<HonorarioDaAtualizacao> honorariosDaAtualizacao = new ArrayList<HonorarioDaAtualizacao>();
            Sets.SetView union = Sets.union(cobrar.getHonorariosDaAtualizacaoCalculado(), cobrar.getHonorariosDaAtualizacaoInformado());
            for (HonorarioDaAtualizacao h : union) {
                if (!h.getHonorario().getApurarIRRF().booleanValue()) continue;
                if (Utils.naoNulo(h.getPagoHonorario()) && h.getPagoHonorario().compareTo(BigDecimal.ZERO) > 0) {
                    honorariosDaAtualizacao.add(h);
                }
                BigDecimal baseDeImpostoDoSaldo = h.getBaseDeImpostoDoSaldo();
                if (!HelperDate.dateEquals(this.getDataLiquidacaoAtualizacao(), cobrar.getDataFinalPeriodo()) || !Utils.naoNulo(baseDeImpostoDoSaldo) || baseDeImpostoDoSaldo.compareTo(BigDecimal.ZERO) <= 0) continue;
                this.ocorrenciasDoSaldo.add(h);
            }
            if (!honorariosDaAtualizacao.isEmpty()) {
                this.irpfHonorariosPorEvento.add(new IrpfHonorariosPorEventoJRAdapterPadrao(cobrar.getDataFinalPeriodo(), honorariosDaAtualizacao));
            }
            Collections.sort(this.ocorrenciasDoSaldo, new Comparator<HonorarioDaAtualizacao>(){

                @Override
                public int compare(HonorarioDaAtualizacao o1, HonorarioDaAtualizacao o2) {
                    return o1.getHonorario().getNomeCredor().compareTo(o2.getHonorario().getNomeCredor());
                }
            });
        }
    }

    @Override
    public JRBeanCollectionDataSource getIrpfHonorariosDoSaldo() {
        return new JRBeanCollectionDataSource(this.ocorrenciasDoSaldo);
    }

    @Override
    public Date getDataLiquidacaoAtualizacao() {
        return this.calculo.getAtualizacao().getDataDeLiquidacao();
    }

    @Override
    public JRBeanCollectionDataSource getIrpfHonorariosPorEventos() {
        return new JRBeanCollectionDataSource(this.irpfHonorariosPorEvento);
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    public class IrpfHonorariosPorEventoJRAdapterPadrao
    extends IrpfHonorariosAtualizacaoJRAdapter.IrpfHonorariosPorEventoJRAdapter {
        private Date dataEvento;
        private List<HonorarioDaAtualizacao> ocorrencias;

        public IrpfHonorariosPorEventoJRAdapterPadrao() {
        }

        public IrpfHonorariosPorEventoJRAdapterPadrao(Date dataEvento, List<HonorarioDaAtualizacao> ocorrencias) {
            this.dataEvento = dataEvento;
            this.ocorrencias = ocorrencias;
            Collections.sort(ocorrencias, new Comparator<HonorarioDaAtualizacao>(){

                @Override
                public int compare(HonorarioDaAtualizacao o1, HonorarioDaAtualizacao o2) {
                    return o1.getHonorario().getNomeCredor().compareTo(o2.getHonorario().getNomeCredor());
                }
            });
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
        public JRAdapter adapt(Object adapted) {
            return this;
        }
    }
}

