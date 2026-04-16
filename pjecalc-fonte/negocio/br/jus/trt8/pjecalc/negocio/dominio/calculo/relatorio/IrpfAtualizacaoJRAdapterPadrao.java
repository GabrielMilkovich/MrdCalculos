/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOcorrenciaIrpfEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfAtualizacaoJRAdapter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.TreeSet;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public class IrpfAtualizacaoJRAdapterPadrao
extends IrpfAtualizacaoJRAdapter {
    private Irpf irpf;
    private JRBeanCollectionDataSource irpfPorEvento;
    private Periodo periodoTotal;

    public IrpfAtualizacaoJRAdapterPadrao() {
    }

    public IrpfAtualizacaoJRAdapterPadrao(Calculo calculo) {
        this.irpf = calculo.getIrpf();
        this.init();
    }

    private void init() {
        Date inicio = null;
        Date fim = null;
        inicio = Utils.naoNulo(this.irpf.getDataInicioAnosAnteriores()) ? this.irpf.getDataInicioAnosAnteriores() : this.irpf.getDataInicioAnoRecebimento();
        fim = Utils.naoNulo(this.irpf.getDataFimAnoRecebimento()) ? this.irpf.getDataFimAnoRecebimento() : this.irpf.getDataFimAnosAnteriores();
        this.periodoTotal = new Periodo(inicio, fim);
        ArrayList<OcorrenciaDeIrpfAtualizacao> ocorrenciasDoSaldo = new ArrayList<OcorrenciaDeIrpfAtualizacao>();
        TreeSet<Date> datasDeEvento = new TreeSet<Date>();
        for (OcorrenciaDeIrpfAtualizacao ocorrencia : this.irpf.getOcorrenciasAtualizacao()) {
            datasDeEvento.add(ocorrencia.getDataEvento());
        }
        ArrayList<IrpfPorEventoAdapterPadrao> irpfsPorEvento = new ArrayList<IrpfPorEventoAdapterPadrao>();
        for (Date d : datasDeEvento) {
            ArrayList<OcorrenciaDeIrpfAtualizacao> oAtualizacao = new ArrayList<OcorrenciaDeIrpfAtualizacao>();
            ArrayList<OcorrenciaDeIrpfPagamento> oPagamento = new ArrayList<OcorrenciaDeIrpfPagamento>();
            ArrayList<OcorrenciaDeIrpfPagamento> oPagamentoNoSaldo = new ArrayList<OcorrenciaDeIrpfPagamento>();
            for (OcorrenciaDeIrpfPagamento ocorrenciaDeIrpfPagamento : this.irpf.getOcorrenciasPagamento()) {
                if (d.equals(ocorrenciaDeIrpfPagamento.getDataPagamento()) && !ocorrenciaDeIrpfPagamento.getPagamentoNoSaldo().booleanValue()) {
                    oPagamento.add(ocorrenciaDeIrpfPagamento);
                    continue;
                }
                if (!d.equals(ocorrenciaDeIrpfPagamento.getDataPagamento()) || !ocorrenciaDeIrpfPagamento.getPagamentoNoSaldo().booleanValue()) continue;
                oPagamentoNoSaldo.add(ocorrenciaDeIrpfPagamento);
            }
            for (OcorrenciaDeIrpfAtualizacao ocorrenciaDeIrpfAtualizacao : this.irpf.getOcorrenciasAtualizacao()) {
                if (d.equals(ocorrenciaDeIrpfAtualizacao.getDataEvento()) && ocorrenciaDeIrpfAtualizacao.getHasPagamento().booleanValue()) {
                    oAtualizacao.add(ocorrenciaDeIrpfAtualizacao);
                    continue;
                }
                if (!d.equals(ocorrenciaDeIrpfAtualizacao.getDataEvento()) || ocorrenciaDeIrpfAtualizacao.getHasPagamento().booleanValue()) continue;
                ocorrenciasDoSaldo.add(ocorrenciaDeIrpfAtualizacao);
            }
            if (!oAtualizacao.isEmpty()) {
                irpfsPorEvento.add(new IrpfPorEventoAdapterPadrao(d, oAtualizacao, oPagamento, true));
            }
            if (ocorrenciasDoSaldo.isEmpty()) continue;
            irpfsPorEvento.add(new IrpfPorEventoAdapterPadrao(d, ocorrenciasDoSaldo, oPagamentoNoSaldo, false));
        }
        Collections.sort(irpfsPorEvento, new Comparator<IrpfAtualizacaoJRAdapter.IrpfPorEventoAdapter>(){

            @Override
            public int compare(IrpfAtualizacaoJRAdapter.IrpfPorEventoAdapter o1, IrpfAtualizacaoJRAdapter.IrpfPorEventoAdapter o2) {
                int comp1 = o1.getDataEvento().compareTo(o2.getDataEvento());
                int comp2 = o2.getHasPagamento().compareTo(o1.getHasPagamento());
                return comp1 == 0 ? comp2 : comp1;
            }
        });
        this.irpfPorEvento = new JRBeanCollectionDataSource(irpfsPorEvento);
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRBeanCollectionDataSource getIrpfPorEvento() {
        return this.irpfPorEvento;
    }

    @Override
    public Periodo getPeriodoTotal() {
        return this.periodoTotal;
    }

    @Override
    public boolean isRegimeCaixa() {
        return this.irpf.getRegimeDeCaixa() == null ? false : this.irpf.getRegimeDeCaixa();
    }

    public class OcorrenciaDeIrpfPagamentoAdapterPadrao
    extends IrpfAtualizacaoJRAdapter.OcorrenciaDeIrpfPagamentoAdapter {
        private OcorrenciaDeIrpfPagamento ocorrencia;

        public OcorrenciaDeIrpfPagamentoAdapterPadrao() {
        }

        public OcorrenciaDeIrpfPagamentoAdapterPadrao(OcorrenciaDeIrpfPagamento ocorrencia) {
            this.ocorrencia = ocorrencia;
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getDevido();
        }

        @Override
        public BigDecimal getTaxaJuros() {
            return this.ocorrencia.getTaxaJuros();
        }

        @Override
        public BigDecimal getValorJuros() {
            return this.ocorrencia.getJuros();
        }

        @Override
        public BigDecimal getTaxaMulta() {
            return this.ocorrencia.getTaxaMulta();
        }

        @Override
        public BigDecimal getValorMulta() {
            return this.ocorrencia.getMulta();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotal();
        }

        @Override
        public BigDecimal getPago() {
            return this.ocorrencia.getPago();
        }

        @Override
        public BigDecimal getDevidoDiferenca() {
            return this.ocorrencia.getDevidoDiferenca();
        }

        @Override
        public BigDecimal getTaxaJurosDiferenca() {
            return this.ocorrencia.getTaxaJurosDiferenca();
        }

        @Override
        public BigDecimal getValorJurosDiferenca() {
            return this.ocorrencia.getJurosDiferenca();
        }

        @Override
        public BigDecimal getTaxaMultaDiferenca() {
            return this.ocorrencia.getTaxaMultaDiferenca();
        }

        @Override
        public BigDecimal getValorMultaDiferenca() {
            return this.ocorrencia.getMultaDiferenca();
        }

        @Override
        public BigDecimal getTotalDiferenca() {
            return this.ocorrencia.getTotalDiferenca();
        }

        @Override
        public Date getDataEvento() {
            return this.ocorrencia.getDataEvento();
        }

        @Override
        public Boolean getPagamentoNoSaldo() {
            return this.ocorrencia.getPagamentoNoSaldo();
        }

        @Override
        public Boolean getCalculadoNoSaldo() {
            return this.ocorrencia.getCalculadoNoSaldo();
        }

        @Override
        public JRAdapter adapt(Object adapted) {
            return this;
        }
    }

    public class OcorrenciaDeIrpfAtualizacaoAdapterPadrao
    extends IrpfAtualizacaoJRAdapter.OcorrenciaDeIrpfAtualizacaoAdapter {
        private OcorrenciaDeIrpfAtualizacao ocorrencia;

        public OcorrenciaDeIrpfAtualizacaoAdapterPadrao(OcorrenciaDeIrpfAtualizacao ocorrencia) {
            this.ocorrencia = ocorrencia;
        }

        public OcorrenciaDeIrpfAtualizacaoAdapterPadrao() {
        }

        @Override
        public BigDecimal getVerbas() {
            return this.ocorrencia.getValorVerbas();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getValorJuros();
        }

        @Override
        public BigDecimal getContribuicaoSocial() {
            return this.ocorrencia.getValorContribuicaoSocial();
        }

        @Override
        public BigDecimal getPrevidenciaPrivada() {
            return this.ocorrencia.getValorPrevidenciaPrivada();
        }

        @Override
        public BigDecimal getPensaoAlimenticia() {
            return this.ocorrencia.getValorPensaoAlimenticia();
        }

        @Override
        public BigDecimal getHonorarios() {
            return this.ocorrencia.getValorHonorarios();
        }

        @Override
        public BigDecimal getDependentes() {
            return this.ocorrencia.getValorDependentes();
        }

        @Override
        public BigDecimal getAposentadoMaior65Anos() {
            return this.ocorrencia.getValorAposentadoMaiorQue65();
        }

        @Override
        public BigDecimal getBase() {
            return this.ocorrencia.getValorBase();
        }

        @Override
        public String getFaixa() {
            if (this.ocorrencia.getTipo().equals((Object)TipoOcorrenciaIrpfEnum.RRA_ANOS_ANTERIORES) && (this.ocorrencia.getQuantidadeCompetencias() == null || this.ocorrencia.getQuantidadeCompetencias().compareTo(BigDecimal.ZERO) <= 0)) {
                return "-";
            }
            BigDecimal inicio = (BigDecimal)Utils.seNulo(this.ocorrencia.getValorInicialFaixa(), BigDecimal.ZERO);
            if (Utils.nulo(this.ocorrencia.getValorFinalFaixa())) {
                return String.format("a partir de %s", Utils.formatarValor(inicio));
            }
            BigDecimal fim = (BigDecimal)Utils.seNulo(this.ocorrencia.getValorFinalFaixa(), BigDecimal.ZERO);
            return String.format("%s \u00e0 %s", Utils.formatarValor(inicio), Utils.formatarValor(fim));
        }

        @Override
        public BigDecimal getAliquota() {
            return this.ocorrencia.getValorAliquota();
        }

        @Override
        public BigDecimal getDeducao() {
            return this.ocorrencia.getValorDeducao();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevido();
        }

        @Override
        public String getQuantidadeMeses() {
            return Utils.formatarValor(this.ocorrencia.getQuantidadeCompetencias());
        }

        @Override
        public String getTipo() {
            switch (this.ocorrencia.getTipo()) {
                case NORMAL: {
                    return "TRIBUTA\u00c7\u00c3O NORMAL";
                }
                case RRA_ANOS_ANTERIORES: {
                    return "TRIBUTA\u00c7\u00c3O EXCLUSIVA";
                }
                case TRIBUTACAO_EM_SEPARADO: {
                    return "TRIBUTA\u00c7\u00c3O EM SEPARADO";
                }
                case TRIBUTACAO_EXCLUSIVA: {
                    return "TRIBUTA\u00c7\u00c3O EXCLUSIVA";
                }
            }
            return this.ocorrencia.getTipo().getNome();
        }

        @Override
        public boolean isAnosAnteriores() {
            return this.ocorrencia.getTipo().equals((Object)TipoOcorrenciaIrpfEnum.RRA_ANOS_ANTERIORES);
        }

        @Override
        public JRAdapter adapt(Object adapted) {
            return this;
        }

        @Override
        public Date getDataEvento() {
            return this.ocorrencia.getDataEvento();
        }

        @Override
        public Periodo getOcorrenciaPeriodo() {
            Periodo periodo = new Periodo();
            int anoPeriodoFinal = HelperDate.getInstance(IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getFinal()).getYear();
            int anoDataEvento = HelperDate.getInstance(this.getDataEvento()).getYear();
            Date primeiroDiaDoAno = this.getPrimeiroDiaDoAno(anoDataEvento);
            if (this.isAnosAnteriores()) {
                if (HelperDate.dateAfterOrEquals(this.getDataEvento(), IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getFinal())) {
                    if (anoPeriodoFinal < anoDataEvento) {
                        return IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal();
                    }
                    if (anoPeriodoFinal == anoDataEvento) {
                        periodo.setInicial(IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getInicial());
                        periodo.setFinal(HelperDate.getInstance(primeiroDiaDoAno).addDay(-1).getDate());
                        return periodo;
                    }
                    periodo.setInicial(IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getInicial());
                    periodo.setFinal(this.getDataEvento());
                    return periodo;
                }
                periodo.setInicial(IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getInicial());
                if (HelperDate.dateAfterOrEquals(IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getFinal(), this.getDataEvento())) {
                    periodo.setFinal(this.getDataEvento());
                } else {
                    periodo.setFinal(IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getFinal());
                }
                return periodo;
            }
            if (HelperDate.dateAfterOrEquals(IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getInicial(), primeiroDiaDoAno)) {
                periodo.setInicial(IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getInicial());
            } else {
                periodo.setInicial(primeiroDiaDoAno);
            }
            if (HelperDate.dateAfterOrEquals(IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getFinal(), this.getDataEvento())) {
                periodo.setFinal(this.getDataEvento());
            } else {
                periodo.setFinal(IrpfAtualizacaoJRAdapterPadrao.this.getPeriodoTotal().getFinal());
            }
            return periodo;
        }

        private Date getPrimeiroDiaDoAno(int ano) {
            Calendar c = Calendar.getInstance();
            c.set(1, ano);
            c.set(2, 0);
            c.set(5, 1);
            return c.getTime();
        }
    }

    public class IrpfPorEventoAdapterPadrao
    extends IrpfAtualizacaoJRAdapter.IrpfPorEventoAdapter {
        private Boolean hasPagamento;
        private Date dataEvento;
        private List<IrpfAtualizacaoJRAdapter.OcorrenciaDeIrpfAtualizacaoAdapter> ocorrenciasAtualizacao = new ArrayList<IrpfAtualizacaoJRAdapter.OcorrenciaDeIrpfAtualizacaoAdapter>();
        private List<IrpfAtualizacaoJRAdapter.OcorrenciaDeIrpfPagamentoAdapter> ocorrenciasPagamento = new ArrayList<IrpfAtualizacaoJRAdapter.OcorrenciaDeIrpfPagamentoAdapter>();
        private JRBeanCollectionDataSource ocorrenciasAtualizacaoDs;
        private JRBeanCollectionDataSource ocorrenciasPagamentoDs;

        public IrpfPorEventoAdapterPadrao() {
        }

        public IrpfPorEventoAdapterPadrao(Date dataEvento, List<OcorrenciaDeIrpfAtualizacao> ocorrenciasAtualizacao, List<OcorrenciaDeIrpfPagamento> ocorrenciasPagamento, Boolean hasPagamento) {
            this.dataEvento = dataEvento;
            this.hasPagamento = hasPagamento;
            for (OcorrenciaDeIrpfAtualizacao ocorrenciaDeIrpfAtualizacao : ocorrenciasAtualizacao) {
                this.ocorrenciasAtualizacao.add(new OcorrenciaDeIrpfAtualizacaoAdapterPadrao(ocorrenciaDeIrpfAtualizacao));
            }
            Collections.sort(ocorrenciasPagamento, new Comparator<OcorrenciaDeIrpfPagamento>(){

                @Override
                public int compare(OcorrenciaDeIrpfPagamento o1, OcorrenciaDeIrpfPagamento o2) {
                    int comp1 = o1.getDataPagamento().compareTo(o2.getDataPagamento());
                    int comp2 = o1.getDataEvento().compareTo(o2.getDataEvento());
                    int comp3 = o1.getCalculadoNoSaldo().compareTo(o2.getCalculadoNoSaldo());
                    return comp1 == 0 ? (comp2 == 0 ? comp3 : comp2) : comp1;
                }
            });
            for (OcorrenciaDeIrpfPagamento ocorrenciaDeIrpfPagamento : ocorrenciasPagamento) {
                this.ocorrenciasPagamento.add(new OcorrenciaDeIrpfPagamentoAdapterPadrao(ocorrenciaDeIrpfPagamento));
            }
            this.ocorrenciasAtualizacaoDs = new JRBeanCollectionDataSource(this.ocorrenciasAtualizacao);
            this.ocorrenciasPagamentoDs = new JRBeanCollectionDataSource(this.ocorrenciasPagamento);
        }

        @Override
        public Date getDataEvento() {
            return this.dataEvento;
        }

        @Override
        public BigDecimal getTotalDevidoLiquidacao() {
            BigDecimal somatorio = BigDecimal.ZERO;
            for (IrpfAtualizacaoJRAdapter.OcorrenciaDeIrpfAtualizacaoAdapter o : this.ocorrenciasAtualizacao) {
                somatorio = somatorio.add(o.getDevido());
            }
            return somatorio;
        }

        @Override
        public BigDecimal getTotalDevidoPagamento() {
            BigDecimal somatorio = BigDecimal.ZERO;
            for (IrpfAtualizacaoJRAdapter.OcorrenciaDeIrpfPagamentoAdapter o : this.ocorrenciasPagamento) {
                somatorio = somatorio.add(o.getTotalDiferenca());
            }
            return somatorio;
        }

        @Override
        public JRBeanCollectionDataSource getOcorrenciasAtualizacaoDs() {
            return this.ocorrenciasAtualizacaoDs;
        }

        @Override
        public JRBeanCollectionDataSource getOcorrenciasPagamentoDs() {
            return this.ocorrenciasPagamentoDs;
        }

        @Override
        public JRAdapter adapt(Object adapted) {
            return this;
        }

        @Override
        public Boolean getHasPagamento() {
            return this.hasPagamento;
        }
    }
}

