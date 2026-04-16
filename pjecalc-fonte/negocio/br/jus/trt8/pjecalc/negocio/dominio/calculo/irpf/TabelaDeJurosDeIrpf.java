/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.TabelaDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf.JurosSelicIrpf;
import java.math.BigDecimal;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class TabelaDeJurosDeIrpf
extends TabelaDeJuros {
    private static final long serialVersionUID = 1L;
    private Map<Date, BigDecimal> tabelaSelic;

    public TabelaDeJurosDeIrpf(Calculo calculo, Date dataInicialParaCalculo) {
        super(calculo);
        this.carregarTabelaDeJurosSelic(dataInicialParaCalculo);
    }

    public TabelaDeJurosDeIrpf(Calculo calculo, Date dataInicialParaCalculo, Date dataFinalParaCalculo) {
        super(calculo, dataInicialParaCalculo, dataFinalParaCalculo);
        this.carregarTabelaDeJurosSelic(dataInicialParaCalculo, dataFinalParaCalculo);
    }

    private void carregarTabelaDeJurosSelic(Date dataInicialParaCalculo) {
        this.carregarTabelaDeJurosSelic(dataInicialParaCalculo, this.getCalculo().getDataDeLiquidacao());
    }

    private void carregarTabelaDeJurosSelic(Date dataInicialParaCalculo, Date dataFinalParaCalculo) {
        this.tabelaSelic = new LinkedHashMap<Date, BigDecimal>();
        BigDecimal taxaAcumulada = BigDecimal.ZERO;
        HelperDate dataCorrente = HelperDate.getInstance(dataFinalParaCalculo).setDay(1);
        dataCorrente.removeTime();
        this.tabelaSelic.put(dataCorrente.getDate(), taxaAcumulada);
        dataCorrente.addMonth(-1);
        this.tabelaSelic.put(dataCorrente.getDate(), taxaAcumulada);
        dataCorrente.addMonth(-1);
        HelperDate hdDataInicialParaCalculo = HelperDate.getInstance(dataInicialParaCalculo).setDay(1);
        hdDataInicialParaCalculo.removeTime();
        HelperDate hdDataLimiteJurosBasico = hdDataInicialParaCalculo;
        if (HelperDate.dateBeforeOrEquals(hdDataLimiteJurosBasico.getDate(), dataCorrente.getDate())) {
            taxaAcumulada = BigDecimal.ONE;
            this.tabelaSelic.put(dataCorrente.getDate(), taxaAcumulada);
            dataCorrente.addMonth(-1);
            List<JurosSelicIrpf> listaDeJurosSelic = JurosSelicIrpf.obterTodosPorPeriodo(hdDataLimiteJurosBasico.getDate(), dataCorrente.getDate());
            for (JurosSelicIrpf jurosSelicIrpf : listaDeJurosSelic) {
                taxaAcumulada = taxaAcumulada.add(jurosSelicIrpf.getTaxa(), Utils.CONTEXTO_MATEMATICO);
                dataCorrente.setDate(jurosSelicIrpf.getCompetencia());
                dataCorrente.removeTime();
                this.tabelaSelic.put(dataCorrente.getDate(), taxaAcumulada);
                dataCorrente.addMonth(-1);
            }
        } else {
            this.tabelaSelic.put(dataCorrente.getDate(), taxaAcumulada);
            dataCorrente.addMonth(-1);
        }
        List<Periodo> periodosFixos = HelperDate.breakInMonths(hdDataInicialParaCalculo.getDate(), dataCorrente.getDate());
        for (int i = periodosFixos.size() - 1; i >= 0; --i) {
            Periodo periodo = periodosFixos.get(i);
            dataCorrente.setDate(periodo.getInicial());
            dataCorrente.removeTime();
            this.tabelaSelic.put(dataCorrente.getDate(), taxaAcumulada);
        }
    }

    protected BigDecimal calcularTaxaDeJurosSelic(Date data) {
        HelperDate hdData = HelperDate.getInstance(data);
        hdData.removeTime();
        return this.tabelaSelic.get(hdData.getDate());
    }

    @Override
    public BigDecimal calcularTaxaDeJuros(Date data) {
        return this.calcularTaxaDeJurosSelic(data);
    }
}

