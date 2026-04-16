/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustaAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.ArmazenamentoDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.AutoJudicialDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasFixasDaAtualizacaoDoEvento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CustasAtualizacaoJRAdapterPadrao
extends CustaAtualizacaoJRAdapter {
    private static final String FORMATO_DATA = "dd/MM/yyyy";
    private List<CustasJudiciaisDaAtualizacao> custasDaAtualizacao = new ArrayList<CustasJudiciaisDaAtualizacao>();
    private Map<CustasJudiciaisDaAtualizacao, List<Item>> mapaDeItensCustasConhecimentoReclamadoCalculado = new HashMap<CustasJudiciaisDaAtualizacao, List<Item>>();
    private Map<CustasJudiciaisDaAtualizacao, List<Item>> mapaDeItensCustasConhecimentoReclamadoInformado = new HashMap<CustasJudiciaisDaAtualizacao, List<Item>>();
    private Map<CustasJudiciaisDaAtualizacao, List<Item>> mapaDeItensCustasLiquidacaoCalculada = new HashMap<CustasJudiciaisDaAtualizacao, List<Item>>();
    private Map<CustasJudiciaisDaAtualizacao, List<Item>> mapaDeItensCustasLiquidacaoInformada = new HashMap<CustasJudiciaisDaAtualizacao, List<Item>>();
    private Map<CustasJudiciaisDaAtualizacao, List<Item>> mapaDeItensCustasFixas = new HashMap<CustasJudiciaisDaAtualizacao, List<Item>>();
    private Map<CustasJudiciaisDaAtualizacao, List<Item>> mapaDeItensCustasAutos = new HashMap<CustasJudiciaisDaAtualizacao, List<Item>>();
    private Map<CustasJudiciaisDaAtualizacao, List<Item>> mapaDeItensCustasArmazenamento = new HashMap<CustasJudiciaisDaAtualizacao, List<Item>>();
    private Map<CustasJudiciaisDaAtualizacao, List<Item>> mapaDeItensCustasConhecimentoReclamanteCalculada = new HashMap<CustasJudiciaisDaAtualizacao, List<Item>>();
    private Map<CustasJudiciaisDaAtualizacao, List<Item>> mapaDeItensCustasConhecimentoReclamanteInformada = new HashMap<CustasJudiciaisDaAtualizacao, List<Item>>();
    private Map<CustasJudiciaisDaAtualizacao, List<Item>> mapaDeItensCustasExecucaoCalculoExterno = new HashMap<CustasJudiciaisDaAtualizacao, List<Item>>();

    public CustasAtualizacaoJRAdapterPadrao() {
    }

    public CustasAtualizacaoJRAdapterPadrao(Calculo calculo) {
        this.custasDaAtualizacao = CustasJudiciaisDaAtualizacao.obterTodos(calculo.getAtualizacao());
        this.custasDaAtualizacao.remove(0);
        for (int i = 0; i < this.custasDaAtualizacao.size(); ++i) {
            this.mapaDeItensCustasConhecimentoReclamadoCalculado.put(this.custasDaAtualizacao.get(i), this.montarItensCustasConhecimentoReclamadoCalculada(this.custasDaAtualizacao.get(i)));
            this.mapaDeItensCustasConhecimentoReclamadoInformado.put(this.custasDaAtualizacao.get(i), this.montarItensCustasConhecimentoReclamadoInformada(this.custasDaAtualizacao.get(i)));
            this.mapaDeItensCustasLiquidacaoCalculada.put(this.custasDaAtualizacao.get(i), this.montarItensCustasLiquidacaoCalculada(this.custasDaAtualizacao.get(i)));
            this.mapaDeItensCustasLiquidacaoInformada.put(this.custasDaAtualizacao.get(i), this.montarItensCustasLiquidacaoInformada(this.custasDaAtualizacao.get(i)));
            this.mapaDeItensCustasFixas.put(this.custasDaAtualizacao.get(i), this.montarItensCustasFixas(this.custasDaAtualizacao.get(i)));
            this.mapaDeItensCustasAutos.put(this.custasDaAtualizacao.get(i), this.montarItensCustasAutos(this.custasDaAtualizacao.get(i)));
            this.mapaDeItensCustasArmazenamento.put(this.custasDaAtualizacao.get(i), this.montarItensCustasArmazenamento(this.custasDaAtualizacao.get(i)));
            this.mapaDeItensCustasConhecimentoReclamanteCalculada.put(this.custasDaAtualizacao.get(i), this.montarItensCustasConhecimentoReclamanteCalculada(this.custasDaAtualizacao.get(i)));
            this.mapaDeItensCustasConhecimentoReclamanteInformada.put(this.custasDaAtualizacao.get(i), this.montarItensCustasConhecimentoReclamanteInformada(this.custasDaAtualizacao.get(i)));
            this.mapaDeItensCustasExecucaoCalculoExterno.put(this.custasDaAtualizacao.get(i), this.montarItensCustasExecucaoCalculoExterno(this.custasDaAtualizacao.get(i)));
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    public List<Item> montarItensCustasConhecimentoReclamadoCalculada(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        String devido;
        ArrayList<Item> itensCustasJudiciaisDaAtualizacao = new ArrayList<Item>();
        String ocorrencia = HelperDate.getInstance(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamado()).format(FORMATO_DATA).toString();
        String base = Utils.naoNulo(custasJudiciaisDaAtualizacao.getValorBaseCustasCalculadas()) ? custasJudiciaisDaAtualizacao.getValorBaseCustasCalculadas().toString() : "-";
        String taxa = Utils.multiplicar(CustasJudiciaisDaAtualizacao.TAXA_RECLAMADO_CONHECIMENTO, Utils.CEM).toString();
        String piso = Utils.naoNulo(custasJudiciaisDaAtualizacao.getPisoCustasConhecimentoReclamado()) ? custasJudiciaisDaAtualizacao.getPisoCustasConhecimentoReclamado().toString() : "-";
        String teto = Utils.naoNulo(custasJudiciaisDaAtualizacao.getTetoCustasConhecimentoReclamado()) ? custasJudiciaisDaAtualizacao.getTetoCustasConhecimentoReclamado().toString() : "-";
        String string = devido = Utils.naoNulo(custasJudiciaisDaAtualizacao.getValorConhecimentoDoReclamado()) ? Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorConhecimentoDoReclamado()).toString() : "-";
        if (!custasJudiciaisDaAtualizacao.getJaPagoUmaVezReclamado().booleanValue() && custasJudiciaisDaAtualizacao.getMostrarCustasConhecimentoReclamadoCalculada().booleanValue()) {
            Item item = new Item(ocorrencia, base, taxa, piso, teto, devido);
            itensCustasJudiciaisDaAtualizacao.add(item);
        }
        return itensCustasJudiciaisDaAtualizacao;
    }

    public List<Item> montarItensCustasConhecimentoReclamadoInformada(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        ArrayList<Item> itensCustasJudiciaisDaAtualizacao = new ArrayList<Item>();
        if (!custasJudiciaisDaAtualizacao.getJaPagoUmaVezReclamado().booleanValue() && custasJudiciaisDaAtualizacao.getMostrarCustasConhecimentoReclamadoInformada().booleanValue()) {
            Item item = new Item(HelperDate.getInstance(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamado()).format(FORMATO_DATA).toString(), null, Utils.naoNulo(custasJudiciaisDaAtualizacao.getTaxaJurosCustasConhecimentoReclamado()) ? Utils.arredondarValor(custasJudiciaisDaAtualizacao.getTaxaJurosCustasConhecimentoReclamado(), 4).toString() : "-", null, Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getTotalCustasConhecimentoReclamadoInformada()).toString(), Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorConhecimentoDoReclamado()).toString(), Utils.naoNulo(Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorDeJurosDeCustasDeConhecimentoDoReclamado())) ? Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorDeJurosDeCustasDeConhecimentoDoReclamado()).toString() : "-", Utils.naoNulo(custasJudiciaisDaAtualizacao.getIndiceCorrecaoCustasConhecimentoReclamado()) ? Utils.arredondarValor(custasJudiciaisDaAtualizacao.getIndiceCorrecaoCustasConhecimentoReclamado(), 9).toString() : "-", Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorCorrigidoDeCustasDeConhecimentoDoReclamado()).toString(), Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorCorrigidoDeJurosDeCustasDeConhecimentoDoReclamado()).toString(), Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getJurosDoPeriodoDeCustasDeConhecimentoDoReclamado()).toString(), null, null, Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getTotalCustasConhecimentoReclamadoInformada()).toString(), null, null, null, null, null);
            itensCustasJudiciaisDaAtualizacao.add(item);
        }
        return itensCustasJudiciaisDaAtualizacao;
    }

    public List<Item> montarItensCustasLiquidacaoCalculada(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        ArrayList<Item> itensCustasJudiciaisDaAtualizacao = new ArrayList<Item>();
        if (!custasJudiciaisDaAtualizacao.getJaPagoUmaVezReclamado().booleanValue() && custasJudiciaisDaAtualizacao.getMostrarCustasLiquidacaoCalculada().booleanValue()) {
            Item item = new Item(HelperDate.getInstance(custasJudiciaisDaAtualizacao.getDataVencimentoCustasDeLiquidacao()).format(FORMATO_DATA).toString(), custasJudiciaisDaAtualizacao.getValorBaseCustasCalculadas().toString(), Utils.multiplicar(CustasJudiciaisDaAtualizacao.TAXA_RECLAMADO_LIQUIDACAO, Utils.CEM).toString(), null, custasJudiciaisDaAtualizacao.getTetoCustasLiquidacao().toString(), Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorCustasDeLiquidacao()).toString());
            itensCustasJudiciaisDaAtualizacao.add(item);
        }
        return itensCustasJudiciaisDaAtualizacao;
    }

    public List<Item> montarItensCustasLiquidacaoInformada(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        ArrayList<Item> itensCustasJudiciaisDaAtualizacao = new ArrayList<Item>();
        if (!custasJudiciaisDaAtualizacao.getJaPagoUmaVezReclamado().booleanValue() && custasJudiciaisDaAtualizacao.getMostrarCustasLiquidacaoInformada().booleanValue()) {
            Item item = new Item(HelperDate.getInstance(custasJudiciaisDaAtualizacao.getDataVencimentoCustasDeLiquidacao()).format(FORMATO_DATA).toString(), null, Utils.naoNulo(custasJudiciaisDaAtualizacao.getTaxaJurosCustasLiquidacao()) ? Utils.arredondarValor(custasJudiciaisDaAtualizacao.getTaxaJurosCustasLiquidacao(), 4).toString() : "-", null, Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getTotalCustasLiquidacaoReclamadoInformada()).toString(), Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorCustasDeLiquidacao()).toString(), Utils.naoNulo(Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorDeJurosDeCustasDeLiquidacao())) ? Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorDeJurosDeCustasDeLiquidacao()).toString() : "-", Utils.naoNulo(custasJudiciaisDaAtualizacao.getIndiceCorrecaoCustasLiquidacao()) ? Utils.arredondarValor(custasJudiciaisDaAtualizacao.getIndiceCorrecaoCustasLiquidacao(), 9).toString() : "-", Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorCorrigidoDeCustasDeLiquidacao()).toString(), Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorCorrigidoDeJurosDeCustasDeLiquidacao()).toString(), Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getJurosDoPeriodoDeCustasDeLiquidacao()).toString(), null, null, Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getTotalCustasLiquidacaoReclamadoInformada()).toString(), null, null, null, null, null);
            itensCustasJudiciaisDaAtualizacao.add(item);
        }
        return itensCustasJudiciaisDaAtualizacao;
    }

    public List<Item> montarItensCustasFixas(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        ArrayList<Item> itensCustasJudiciaisDaAtualizacao = new ArrayList<Item>();
        for (CustasFixasDaAtualizacaoDoEvento custaFixa : custasJudiciaisDaAtualizacao.getCustasFixasAtualizacao()) {
            Item item;
            if (Utils.naoNulo(custaFixa.getQtdeAgravosDeInstrumento())) {
                item = new Item(HelperDate.getInstance(custaFixa.getDataEvento()).format(FORMATO_DATA).toString(), custaFixa.getValorAgravoInstrumento().toString(), Utils.naoNulo(custaFixa.getTaxaJurosCustasFixasDoPeriodo()) ? Utils.arredondarValor(custaFixa.getTaxaJurosCustasFixasDoPeriodo(), 4).toString() : "-", null, custaFixa.getValorDevidoAgravoInstrumento().toString(), null, Utils.naoNulo(custaFixa.getJurosAgravoInstrumento()) ? custaFixa.getJurosAgravoInstrumento().toString() : "-", Utils.naoNulo(custaFixa.getIndiceCorrecaoCustas()) ? Utils.arredondarValor(custaFixa.getIndiceCorrecaoCustas(), 9).toString() : "-", custaFixa.getValorCorrigidoAgravoInstrumento().toString(), null, null, "Agravo de Instrumento", custaFixa.getQtdeAgravosDeInstrumento().toString(), Utils.naoNulo(custaFixa.getValorCorrigidoAgravoInstrumento()) ? Utils.arredondarValorMonetario(Utils.somar(custaFixa.getValorCorrigidoAgravoInstrumento(), custaFixa.getJurosAgravoInstrumento(), custaFixa.getValorCorrigidoAgravoInstrumento())).toString() : "-", null, null, null, null, null);
                itensCustasJudiciaisDaAtualizacao.add(item);
            }
            if (Utils.naoNulo(custaFixa.getQtdeAgravosDePeticao())) {
                item = new Item(HelperDate.getInstance(custaFixa.getDataEvento()).format(FORMATO_DATA).toString(), custaFixa.getValorAgravoPeticao().toString(), Utils.naoNulo(custaFixa.getTaxaJurosCustasFixasDoPeriodo()) ? Utils.arredondarValor(custaFixa.getTaxaJurosCustasFixasDoPeriodo(), 4).toString() : "-", null, custaFixa.getValorDevidoAgravoPeticao().toString(), null, Utils.naoNulo(custaFixa.getJurosAgravoPeticao()) ? custaFixa.getJurosAgravoPeticao().toString() : "-", Utils.naoNulo(custaFixa.getIndiceCorrecaoCustas()) ? Utils.arredondarValor(custaFixa.getIndiceCorrecaoCustas(), 9).toString() : "-", custaFixa.getValorCorrigidoAgravoPeticao().toString(), null, null, "Agravo de Peti\u00e7\u00e3o", custaFixa.getQtdeAgravosDePeticao().toString(), Utils.naoNulo(custaFixa.getValorCorrigidoAgravoPeticao()) ? Utils.arredondarValorMonetario(Utils.somar(custaFixa.getValorCorrigidoAgravoPeticao(), custaFixa.getJurosAgravoPeticao(), custaFixa.getValorCorrigidoAgravoPeticao())).toString() : "-", null, null, null, null, null);
                itensCustasJudiciaisDaAtualizacao.add(item);
            }
            if (Utils.naoNulo(custaFixa.getQtdeEmbargosArrematacao())) {
                item = new Item(HelperDate.getInstance(custaFixa.getDataEvento()).format(FORMATO_DATA).toString(), custaFixa.getValorEmbargosArrematacao().toString(), Utils.naoNulo(custaFixa.getTaxaJurosCustasFixasDoPeriodo()) ? Utils.arredondarValor(custaFixa.getTaxaJurosCustasFixasDoPeriodo(), 4).toString() : "-", null, custaFixa.getValorDevidoEmbargosArrematacao().toString(), null, Utils.naoNulo(custaFixa.getJurosEmbargosArrematacao()) ? custaFixa.getJurosEmbargosArrematacao().toString() : "-", Utils.naoNulo(custaFixa.getIndiceCorrecaoCustas()) ? Utils.arredondarValor(custaFixa.getIndiceCorrecaoCustas(), 9).toString() : "-", custaFixa.getValorCorrigidoEmbargosArrematacao().toString(), null, null, "Embargo \u00e0 Arremata\u00e7\u00e3o", custaFixa.getQtdeEmbargosArrematacao().toString(), Utils.naoNulo(custaFixa.getValorCorrigidoEmbargosArrematacao()) ? Utils.arredondarValorMonetario(Utils.somar(custaFixa.getValorCorrigidoEmbargosArrematacao(), custaFixa.getJurosEmbargosArrematacao(), custaFixa.getValorCorrigidoEmbargosArrematacao())).toString() : "-", null, null, null, null, null);
                itensCustasJudiciaisDaAtualizacao.add(item);
            }
            if (Utils.naoNulo(custaFixa.getQtdeEmbargosExecucao())) {
                item = new Item(HelperDate.getInstance(custaFixa.getDataEvento()).format(FORMATO_DATA).toString(), custaFixa.getValorEmbargosExecucao().toString(), Utils.naoNulo(custaFixa.getTaxaJurosCustasFixasDoPeriodo()) ? Utils.arredondarValor(custaFixa.getTaxaJurosCustasFixasDoPeriodo(), 4).toString() : "-", null, custaFixa.getValorDevidoEmbargosExecucao().toString(), null, Utils.naoNulo(custaFixa.getJurosEmbargosExecucao()) ? custaFixa.getJurosEmbargosExecucao().toString() : "-", Utils.naoNulo(custaFixa.getIndiceCorrecaoCustas()) ? Utils.arredondarValor(custaFixa.getIndiceCorrecaoCustas(), 9).toString() : "-", custaFixa.getValorCorrigidoEmbargosExecucao().toString(), null, null, "Embargo \u00e0 Execu\u00e7\u00e3o", custaFixa.getQtdeEmbargosExecucao().toString(), Utils.naoNulo(custaFixa.getValorCorrigidoEmbargosExecucao()) ? Utils.arredondarValorMonetario(Utils.somar(custaFixa.getValorCorrigidoEmbargosExecucao(), custaFixa.getJurosEmbargosExecucao(), custaFixa.getValorCorrigidoEmbargosExecucao())).toString() : "-", null, null, null, null, null);
                itensCustasJudiciaisDaAtualizacao.add(item);
            }
            if (Utils.naoNulo(custaFixa.getQtdeEmbargosTerceiros())) {
                item = new Item(HelperDate.getInstance(custaFixa.getDataEvento()).format(FORMATO_DATA).toString(), custaFixa.getValorEmbargosTerceiros().toString(), Utils.naoNulo(custaFixa.getTaxaJurosCustasFixasDoPeriodo()) ? Utils.arredondarValor(custaFixa.getTaxaJurosCustasFixasDoPeriodo(), 4).toString() : "-", null, custaFixa.getValorDevidoEmbargosTerceiros().toString(), null, Utils.naoNulo(custaFixa.getJurosEmbargosTerceiros()) ? custaFixa.getJurosEmbargosTerceiros().toString() : "-", Utils.naoNulo(custaFixa.getIndiceCorrecaoCustas()) ? Utils.arredondarValor(custaFixa.getIndiceCorrecaoCustas(), 9).toString() : "-", custaFixa.getValorCorrigidoEmbargosTerceiros().toString(), null, null, "Embargo de Terceiros", custaFixa.getQtdeEmbargosTerceiros().toString(), Utils.naoNulo(custaFixa.getValorCorrigidoEmbargosTerceiros()) ? Utils.arredondarValorMonetario(Utils.somar(custaFixa.getValorCorrigidoEmbargosTerceiros(), custaFixa.getJurosEmbargosTerceiros(), custaFixa.getValorCorrigidoEmbargosTerceiros())).toString() : "-", null, null, null, null, null);
                itensCustasJudiciaisDaAtualizacao.add(item);
            }
            if (Utils.naoNulo(custaFixa.getQtdeRecursoRevista())) {
                item = new Item(HelperDate.getInstance(custaFixa.getDataEvento()).format(FORMATO_DATA).toString(), custaFixa.getValorRecursoRevista().toString(), Utils.naoNulo(custaFixa.getTaxaJurosCustasFixasDoPeriodo()) ? Utils.arredondarValor(custaFixa.getTaxaJurosCustasFixasDoPeriodo(), 4).toString() : "-", null, custaFixa.getValorDevidoRecursoRevista().toString(), null, Utils.naoNulo(custaFixa.getJurosRecursoRevista()) ? custaFixa.getJurosRecursoRevista().toString() : "-", Utils.naoNulo(custaFixa.getIndiceCorrecaoCustas()) ? Utils.arredondarValor(custaFixa.getIndiceCorrecaoCustas(), 9).toString() : "-", custaFixa.getValorCorrigidoRecursoRevista().toString(), null, null, "Recurso de Revista", custaFixa.getQtdeRecursoRevista().toString(), Utils.naoNulo(custaFixa.getValorCorrigidoRecursoRevista()) ? Utils.arredondarValorMonetario(Utils.somar(custaFixa.getValorCorrigidoRecursoRevista(), custaFixa.getJurosRecursoRevista(), custaFixa.getValorCorrigidoRecursoRevista())).toString() : "-", null, null, null, null, null);
                itensCustasJudiciaisDaAtualizacao.add(item);
            }
            if (Utils.naoNulo(custaFixa.getQtdeAtosUrbanos())) {
                item = new Item(HelperDate.getInstance(custaFixa.getDataEvento()).format(FORMATO_DATA).toString(), custaFixa.getValorAtosUrbanos().toString(), Utils.naoNulo(custaFixa.getTaxaJurosCustasFixasDoPeriodo()) ? Utils.arredondarValor(custaFixa.getTaxaJurosCustasFixasDoPeriodo(), 4).toString() : "-", null, custaFixa.getValorDevidoAtosUrbanos().toString(), null, Utils.naoNulo(custaFixa.getJurosAtosUrbanos()) ? custaFixa.getJurosAtosUrbanos().toString() : "-", Utils.naoNulo(custaFixa.getIndiceCorrecaoCustas()) ? Utils.arredondarValor(custaFixa.getIndiceCorrecaoCustas(), 9).toString() : "-", custaFixa.getValorCorrigidoAtosUrbanos().toString(), null, null, "Atos Urbanos", custaFixa.getQtdeAtosUrbanos().toString(), Utils.naoNulo(custaFixa.getValorCorrigidoAtosUrbanos()) ? Utils.arredondarValorMonetario(Utils.somar(custaFixa.getValorCorrigidoAtosUrbanos(), custaFixa.getJurosAtosUrbanos(), custaFixa.getValorCorrigidoAtosUrbanos())).toString() : "-", null, null, null, null, null);
                itensCustasJudiciaisDaAtualizacao.add(item);
            }
            if (Utils.naoNulo(custaFixa.getQtdeAtosRurais())) {
                item = new Item(HelperDate.getInstance(custaFixa.getDataEvento()).format(FORMATO_DATA).toString(), custaFixa.getValorAtosRurais().toString(), Utils.naoNulo(custaFixa.getTaxaJurosCustasFixasDoPeriodo()) ? Utils.arredondarValor(custaFixa.getTaxaJurosCustasFixasDoPeriodo(), 4).toString() : "-", null, custaFixa.getValorDevidoAtosRurais().toString(), null, Utils.naoNulo(custaFixa.getJurosAtosRurais()) ? custaFixa.getJurosAtosRurais().toString() : "-", Utils.naoNulo(custaFixa.getIndiceCorrecaoCustas()) ? Utils.arredondarValor(custaFixa.getIndiceCorrecaoCustas(), 9).toString() : "-", custaFixa.getValorCorrigidoAtosRurais().toString(), null, null, "Atos Rurais", custaFixa.getQtdeAtosRurais().toString(), Utils.naoNulo(custaFixa.getValorCorrigidoAtosRurais()) ? Utils.arredondarValorMonetario(Utils.somar(custaFixa.getValorCorrigidoAtosRurais(), custaFixa.getJurosAtosRurais(), custaFixa.getValorCorrigidoAtosRurais())).toString() : "-", null, null, null, null, null);
                itensCustasJudiciaisDaAtualizacao.add(item);
            }
            if (!Utils.naoNulo(custaFixa.getQtdeImpugnacaoSentenca())) continue;
            item = new Item(HelperDate.getInstance(custaFixa.getDataEvento()).format(FORMATO_DATA).toString(), custaFixa.getValorImpuganacaoSentenca().toString(), Utils.naoNulo(custaFixa.getTaxaJurosCustasFixasDoPeriodo()) ? Utils.arredondarValor(custaFixa.getTaxaJurosCustasFixasDoPeriodo(), 4).toString() : "-", null, custaFixa.getValorDevidoImpuganacaoSentenca().toString(), null, Utils.naoNulo(custaFixa.getJurosImpuganacaoSentenca()) ? custaFixa.getJurosImpuganacaoSentenca().toString() : "-", Utils.naoNulo(custaFixa.getIndiceCorrecaoCustas()) ? Utils.arredondarValor(custaFixa.getIndiceCorrecaoCustas(), 9).toString() : "-", custaFixa.getValorCorrigidoImpuganacaoSentenca().toString(), null, null, "Impugna\u00e7\u00e3o \u00e0 Senten\u00e7a", custaFixa.getQtdeImpugnacaoSentenca().toString(), Utils.naoNulo(custaFixa.getValorCorrigidoImpuganacaoSentenca()) ? Utils.arredondarValorMonetario(Utils.somar(custaFixa.getValorCorrigidoImpuganacaoSentenca(), custaFixa.getJurosImpuganacaoSentenca(), custaFixa.getValorCorrigidoImpuganacaoSentenca())).toString() : "-", null, null, null, null, null);
            itensCustasJudiciaisDaAtualizacao.add(item);
        }
        return itensCustasJudiciaisDaAtualizacao;
    }

    public List<Item> montarItensCustasAutos(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        ArrayList<Item> itensCustasJudiciaisDaAtualizacao = new ArrayList<Item>();
        for (AutoJudicialDaAtualizacao auto : custasJudiciaisDaAtualizacao.getAutosJudiciais()) {
            Item item = new Item(HelperDate.getInstance(auto.getDataVencimentoAuto()).format(FORMATO_DATA).toString(), auto.getValorAvaliacaoAuto().toString(), Utils.multiplicar(CustasJudiciaisDaAtualizacao.TAXA_CUSTAS_AUTO, Utils.CEM).toString(), auto.getValorTeto().toString(), Utils.arredondarValorMonetario(auto.getValorCustasAuto()).toString(), null, Utils.naoNulo(auto.getJuros()) ? auto.getJuros().toString() : "-", Utils.naoNulo(auto.getIndiceCorrecao()) ? Utils.arredondarValor(auto.getIndiceCorrecao(), 9).toString() : "-", auto.getValorCorrigido().toString(), null, null, auto.getTipoDeAuto().getNome(), null, auto.getTotal().toString(), null, null, null, Utils.naoNulo(auto.getTaxaJuros()) ? Utils.arredondarValor(auto.getTaxaJuros(), 4).toString() : "-", null);
            itensCustasJudiciaisDaAtualizacao.add(item);
        }
        return itensCustasJudiciaisDaAtualizacao;
    }

    public List<Item> montarItensCustasExecucaoCalculoExterno(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        ArrayList<Item> itensCustasJudiciaisDaAtualizacao = new ArrayList<Item>();
        for (ArmazenamentoDaAtualizacao armazenamento : custasJudiciaisDaAtualizacao.getArmazenamentos()) {
            Item item = new Item(HelperDate.getInstance(armazenamento.getDataInicioArmazenamento()).format(FORMATO_DATA).toString(), null, Utils.naoNulo(armazenamento.getTaxaJuros()) ? Utils.arredondarValor(armazenamento.getTaxaJuros(), 4).toString() : "-", null, armazenamento.getTotal().toString(), armazenamento.getValorCustasArmazenamento().toString(), Utils.naoNulo(armazenamento.getValorJurosCalcExterno()) ? armazenamento.getValorJurosCalcExterno().toString() : "-", Utils.naoNulo(armazenamento.getIndiceCorrecao()) ? Utils.arredondarValor(armazenamento.getIndiceCorrecao(), 9).toString() : "-", armazenamento.getValorCorrigido().toString(), Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(armazenamento.getIndiceCorrecao(), armazenamento.getValorJurosCalcExterno(), armazenamento.getValorJurosCalcExterno())).toString(), Utils.naoNulo(armazenamento.getTaxaJuros()) ? Utils.arredondarValorMonetario(Utils.aplicarJuros(armazenamento.getTaxaJuros(), armazenamento.getValorCorrigido())).toString() : BigDecimal.ZERO.toString(), null, null, armazenamento.getTotal().toString(), null, null, null, null, null);
            itensCustasJudiciaisDaAtualizacao.add(item);
        }
        return itensCustasJudiciaisDaAtualizacao;
    }

    public List<Item> montarItensCustasArmazenamento(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        ArrayList<Item> itensCustasJudiciaisDaAtualizacao = new ArrayList<Item>();
        for (ArmazenamentoDaAtualizacao armazenamento : custasJudiciaisDaAtualizacao.getArmazenamentos()) {
            Date dataFinal = custasJudiciaisDaAtualizacao.getDataFinalPeriodo();
            if (Utils.naoNulo(armazenamento.getDataTerminoArmazenamento()) && HelperDate.dateBefore(armazenamento.getDataTerminoArmazenamento(), dataFinal)) {
                dataFinal = armazenamento.getDataTerminoArmazenamento();
            }
            Item item = new Item(HelperDate.getInstance(armazenamento.getDataInicioArmazenamento()).format(FORMATO_DATA).toString(), armazenamento.getValorAvaliacaoArmazenamento().toString(), Utils.multiplicar(CustasJudiciaisDaAtualizacao.TAXA_CUSTAS_ARMAZENAMENTO, Utils.CEM).toString(), null, Utils.arredondarValorMonetario(armazenamento.getValorCustasArmazenamento()).toString(), null, Utils.naoNulo(armazenamento.getJuros()) ? armazenamento.getJuros().toString() : "-", Utils.naoNulo(armazenamento.getIndiceCorrecao()) ? Utils.arredondarValor(armazenamento.getIndiceCorrecao(), 9).toString() : "-", armazenamento.getValorCorrigido().toString(), null, null, null, armazenamento.getQtdeDias().toString(), armazenamento.getTotal().toString(), null, null, null, Utils.naoNulo(armazenamento.getTaxaJuros()) ? Utils.arredondarValor(armazenamento.getTaxaJuros(), 4).toString() : "-", HelperDate.getInstance(dataFinal).format(FORMATO_DATA).toString());
            itensCustasJudiciaisDaAtualizacao.add(item);
        }
        return itensCustasJudiciaisDaAtualizacao;
    }

    public List<Item> montarItensCustasConhecimentoReclamanteCalculada(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        ArrayList<Item> itensCustasJudiciaisDaAtualizacao = new ArrayList<Item>();
        if (!custasJudiciaisDaAtualizacao.getJaPagoUmaVezReclamante().booleanValue() && custasJudiciaisDaAtualizacao.getMostrarCustasConhecimentoReclamanteCalculada().booleanValue()) {
            Item item = new Item(HelperDate.getInstance(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamante()).format(FORMATO_DATA).toString(), custasJudiciaisDaAtualizacao.getValorBaseCustasCalculadas().toString(), Utils.multiplicar(CustasJudiciaisDaAtualizacao.TAXA_RECLAMADO_CONHECIMENTO, Utils.CEM).toString(), custasJudiciaisDaAtualizacao.getPisoCustasConhecimentoReclamante().toString(), Utils.naoNulo(custasJudiciaisDaAtualizacao.getTetoCustasConhecimentoReclamante()) ? custasJudiciaisDaAtualizacao.getTetoCustasConhecimentoReclamante().toString() : "-", Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorDeConhecimentoDoReclamante()).toString());
            itensCustasJudiciaisDaAtualizacao.add(item);
        }
        return itensCustasJudiciaisDaAtualizacao;
    }

    public List<Item> montarItensCustasConhecimentoReclamanteInformada(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        ArrayList<Item> itensCustasJudiciaisDaAtualizacao = new ArrayList<Item>();
        if (!custasJudiciaisDaAtualizacao.getJaPagoUmaVezReclamante().booleanValue() && custasJudiciaisDaAtualizacao.getMostrarCustasConhecimentoReclamanteInformada().booleanValue()) {
            Item item = new Item(HelperDate.getInstance(custasJudiciaisDaAtualizacao.getDataVencimentoConhecimentoDoReclamante()).format(FORMATO_DATA).toString(), null, Utils.naoNulo(custasJudiciaisDaAtualizacao.getTaxaJurosCustasConhecimentoReclamante()) ? Utils.arredondarValor(custasJudiciaisDaAtualizacao.getTaxaJurosCustasConhecimentoReclamante(), 4).toString() : "-", null, Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getTotalCustasConhecimentoReclamanteInformada()).toString(), Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorDeConhecimentoDoReclamante()).toString(), Utils.naoNulo(custasJudiciaisDaAtualizacao.getValorDeJurosDeCustasDeConhecimentoDoReclamante()) ? Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorDeJurosDeCustasDeConhecimentoDoReclamante()).toString() : "-", Utils.naoNulo(custasJudiciaisDaAtualizacao.getIndiceCorrecaoCustasConhecimentoReclamante()) ? Utils.arredondarValor(custasJudiciaisDaAtualizacao.getIndiceCorrecaoCustasConhecimentoReclamante(), 9).toString() : "-", Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorCorrigidoDeCustasDeConhecimentoDoReclamante()).toString(), Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getValorCorrigidoDeJurosDeCustasDeConhecimentoDoReclamante()).toString(), Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getJurosDoPeriodoDeCustasDeConhecimentoDoReclamante()).toString(), null, null, Utils.arredondarValorMonetario(custasJudiciaisDaAtualizacao.getTotalCustasConhecimentoReclamanteInformada()).toString(), null, null, null, null, null);
            itensCustasJudiciaisDaAtualizacao.add(item);
        }
        return itensCustasJudiciaisDaAtualizacao;
    }

    @Override
    public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaAtualizacaoAdapter> getCustasDaAtualizacao() {
        return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaAtualizacaoAdapter>(new CustaAtualizacaoDoCalculoJRAdapterPadrao(), this.custasDaAtualizacao);
    }

    public class CustaItemJRAdapterPadrao
    extends CustaAtualizacaoJRAdapter.CustaItemAdapter {
        private Item item;

        public CustaItemJRAdapterPadrao() {
        }

        public CustaItemJRAdapterPadrao(Item item) {
            this.adapt(item);
        }

        @Override
        public JRAdapter adapt(Object item) {
            this.item = (Item)item;
            return this;
        }

        @Override
        public String getOcorrencia() {
            return this.item.getOcorrencia();
        }

        @Override
        public String getBase() {
            return this.item.getBase();
        }

        @Override
        public String getTaxa() {
            return this.item.getTaxa();
        }

        @Override
        public String getPiso() {
            return this.item.getPiso();
        }

        @Override
        public String getTeto() {
            return this.item.getTeto();
        }

        @Override
        public String getDevido() {
            return this.item.getDevido();
        }

        @Override
        public String getValor() {
            return this.item.getValor();
        }

        @Override
        public String getJuros() {
            return this.item.getJuros();
        }

        @Override
        public String getIndice() {
            return this.item.getIndice();
        }

        @Override
        public String getValorCorr() {
            return this.item.getValorCorr();
        }

        @Override
        public String getJurosCorr() {
            return this.item.getJurosCorr();
        }

        @Override
        public String getJurosValorCorr() {
            return this.item.getJurosValorCorr();
        }

        @Override
        public String getTipo() {
            return this.item.getTipo();
        }

        @Override
        public String getQtd() {
            return this.item.getQtd();
        }

        @Override
        public String getTotal() {
            return this.item.getTotal();
        }

        @Override
        public String getPago() {
            return this.item.getPago();
        }

        @Override
        public String getDiferencaCustas() {
            return this.item.getDiferencaCustas();
        }

        @Override
        public String getDiferencaJuros() {
            return this.item.getDiferencaJuros();
        }

        @Override
        public String getTaxaPeriodo() {
            return this.item.getTaxaPeriodo();
        }

        @Override
        public String getDataFinal() {
            return this.item.getDataFinal();
        }
    }

    public class Item {
        private String ocorrencia;
        private String base;
        private String taxa;
        private String piso;
        private String teto;
        private String devido;
        private String valor;
        private String juros;
        private String indice;
        private String valorCorr;
        private String jurosCorr;
        private String jurosValorCorr;
        private String tipo;
        private String qtd;
        private String total;
        private String pago;
        private String diferencaCustas;
        private String diferencaJuros;
        private String taxaPeriodo;
        private String dataFinal;

        public Item(String ocorrencia, String base, String taxa, String piso, String devido, String valor, String juros, String indice, String valorCorr, String jurosCorr, String jurosValorCorr, String tipo, String qtd, String total, String pago, String diferencaCustas, String diferencaJuros, String taxaPeriodo, String dataFinal) {
            this.ocorrencia = ocorrencia;
            this.base = base;
            this.taxa = taxa;
            this.piso = piso;
            this.devido = devido;
            this.valor = valor;
            this.juros = juros;
            this.indice = indice;
            this.valorCorr = valorCorr;
            this.jurosCorr = jurosCorr;
            this.jurosValorCorr = jurosValorCorr;
            this.tipo = tipo;
            this.qtd = qtd;
            this.total = total;
            this.pago = pago;
            this.diferencaCustas = diferencaCustas;
            this.diferencaJuros = diferencaJuros;
            this.taxaPeriodo = taxaPeriodo;
            this.dataFinal = dataFinal;
        }

        public Item(String ocorrencia, String base, String taxa, String piso, String devido) {
            this.ocorrencia = ocorrencia;
            this.base = base;
            this.taxa = taxa;
            this.piso = piso;
            this.devido = devido;
            this.valor = null;
            this.juros = null;
            this.indice = null;
            this.valorCorr = null;
            this.jurosCorr = null;
            this.jurosValorCorr = null;
            this.tipo = null;
            this.qtd = null;
            this.total = null;
            this.pago = null;
            this.diferencaCustas = null;
            this.diferencaJuros = null;
            this.taxaPeriodo = null;
            this.dataFinal = null;
        }

        public Item(String ocorrencia, String base, String taxa, String piso, String teto, String devido) {
            this(ocorrencia, base, taxa, piso, devido);
            this.teto = teto;
        }

        public String getOcorrencia() {
            return this.ocorrencia;
        }

        public void setOcorrencia(String ocorrencia) {
            this.ocorrencia = ocorrencia;
        }

        public String getBase() {
            if (Utils.naoNulo(this.base)) {
                return Utils.formatarValor(new BigDecimal(this.base));
            }
            return this.base;
        }

        public void setBase(String base) {
            this.base = base;
        }

        public String getTaxa() {
            if ("-".equals(this.taxa)) {
                return this.taxa;
            }
            return Utils.formatarValor(new BigDecimal(this.taxa), 4) + "%";
        }

        public void setTaxa(String taxa) {
            this.taxa = taxa;
        }

        public String getPiso() {
            if (Utils.nulo(this.piso) || "-".equals(this.piso)) {
                return "-";
            }
            return Utils.formatarValor(new BigDecimal(this.piso));
        }

        public void setPiso(String piso) {
            this.piso = piso;
        }

        public String getTeto() {
            if (Utils.nulo(this.teto) || "-".equals(this.teto)) {
                return "-";
            }
            return Utils.formatarValor(new BigDecimal(this.teto));
        }

        public void setTeto(String teto) {
            this.teto = teto;
        }

        public String getDevido() {
            if (Utils.naoNulo(this.devido)) {
                return Utils.formatarValor(new BigDecimal(this.devido));
            }
            return this.devido;
        }

        public void setDevido(String devido) {
            this.devido = devido;
        }

        public String getValor() {
            if (Utils.naoNulo(this.valor)) {
                return Utils.formatarValor(new BigDecimal(this.valor));
            }
            return this.valor;
        }

        public void setValor(String valor) {
            this.valor = valor;
        }

        public String getJuros() {
            if (!"-".equals(this.juros) && Utils.naoNulo(this.juros)) {
                return Utils.formatarValor(new BigDecimal(this.juros));
            }
            return this.juros;
        }

        public void setJuros(String juros) {
            this.juros = juros;
        }

        public String getIndice() {
            if (!"-".equals(this.indice)) {
                return Utils.formatarValor(new BigDecimal(this.indice), 9);
            }
            return this.indice;
        }

        public void setIndice(String indice) {
            this.indice = indice;
        }

        public String getValorCorr() {
            if (!"-".equals(this.valorCorr) && Utils.naoNulo(this.valorCorr)) {
                return Utils.formatarValor(new BigDecimal(this.valorCorr));
            }
            return this.valorCorr;
        }

        public void setValorCorr(String valorCorr) {
            this.valorCorr = valorCorr;
        }

        public String getJurosCorr() {
            if (!"-".equals(this.jurosCorr) && Utils.naoNulo(this.jurosCorr)) {
                return Utils.formatarValor(new BigDecimal(this.jurosCorr));
            }
            return this.jurosCorr;
        }

        public void setJurosCorr(String jurosCorr) {
            this.jurosCorr = jurosCorr;
        }

        public String getJurosValorCorr() {
            if (!"-".equals(this.jurosValorCorr) && Utils.naoNulo(this.jurosValorCorr)) {
                return Utils.formatarValor(new BigDecimal(this.jurosValorCorr));
            }
            return this.jurosValorCorr;
        }

        public void setJurosValorCorr(String jurosValorCorr) {
            this.jurosValorCorr = jurosValorCorr;
        }

        public String getTipo() {
            return this.tipo;
        }

        public void setTipo(String tipo) {
            this.tipo = tipo;
        }

        public String getQtd() {
            return this.qtd;
        }

        public void setQtd(String qtd) {
            this.qtd = qtd;
        }

        public String getTotal() {
            if (Utils.naoNulo(this.total)) {
                return Utils.formatarValor(new BigDecimal(this.total));
            }
            return this.total;
        }

        public void setTotal(String total) {
            this.total = total;
        }

        public String getPago() {
            if (Utils.naoNulo(this.pago)) {
                return Utils.formatarValor(new BigDecimal(this.pago));
            }
            return this.pago;
        }

        public void setPago(String pago) {
            this.pago = pago;
        }

        public String getDiferencaCustas() {
            if (Utils.naoNulo(this.diferencaCustas)) {
                return Utils.formatarValor(new BigDecimal(this.diferencaCustas));
            }
            return this.diferencaCustas;
        }

        public void setDiferencaCustas(String diferencaCustas) {
            this.diferencaCustas = diferencaCustas;
        }

        public String getDiferencaJuros() {
            if (Utils.naoNulo(this.diferencaJuros)) {
                return Utils.formatarValor(new BigDecimal(this.diferencaJuros));
            }
            return this.diferencaJuros;
        }

        public void setDiferencaJuros(String diferencaJuros) {
            this.diferencaJuros = diferencaJuros;
        }

        public String getTaxaPeriodo() {
            if ("-".equals(this.taxaPeriodo)) {
                return this.taxaPeriodo;
            }
            return Utils.formatarValor(new BigDecimal(this.taxaPeriodo), 4) + "%";
        }

        public void setTaxaPeriodo(String taxaPeriodo) {
            this.taxaPeriodo = taxaPeriodo;
        }

        public String getDataFinal() {
            return this.dataFinal;
        }

        public void setDataFinal(String dataFinal) {
            this.dataFinal = dataFinal;
        }
    }

    public class CustaAtualizacaoDoCalculoJRAdapterPadrao
    extends CustaAtualizacaoJRAdapter.CustaAtualizacaoAdapter {
        private CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao = null;

        @Override
        public JRAdapter adapt(Object adapted) {
            if (adapted instanceof CustasJudiciaisDaAtualizacao) {
                this.custasJudiciaisDaAtualizacao = (CustasJudiciaisDaAtualizacao)adapted;
            }
            return this;
        }

        @Override
        public String getDataEvento() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getDataFinalPeriodo())) {
                return HelperDate.getInstance(this.custasJudiciaisDaAtualizacao.getDataFinalPeriodo()).format(CustasAtualizacaoJRAdapterPadrao.FORMATO_DATA).toString();
            }
            return "-";
        }

        @Override
        public Boolean getMostrarCustasFixas() {
            if (Utils.naoNulo(CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasFixas.get(this.custasJudiciaisDaAtualizacao))) {
                return !((List)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasFixas.get(this.custasJudiciaisDaAtualizacao)).isEmpty();
            }
            return false;
        }

        @Override
        public Boolean getMostrarCustasAutos() {
            if (Utils.naoNulo(CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasAutos.get(this.custasJudiciaisDaAtualizacao))) {
                return !((List)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasAutos.get(this.custasJudiciaisDaAtualizacao)).isEmpty();
            }
            return false;
        }

        @Override
        public Boolean getMostrarCustasArmazenamento() {
            if (Utils.naoNulo(CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasArmazenamento.get(this.custasJudiciaisDaAtualizacao))) {
                return !((List)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasArmazenamento.get(this.custasJudiciaisDaAtualizacao)).isEmpty() && this.custasJudiciaisDaAtualizacao.getCalculo().isCalculoExterno() == false;
            }
            return false;
        }

        @Override
        public Boolean getMostrarCustasConhecimentoReclamadoCalculada() {
            if (Utils.naoNulo(CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamadoCalculado.get(this.custasJudiciaisDaAtualizacao))) {
                return this.custasJudiciaisDaAtualizacao.getMostrarCustasConhecimentoReclamadoCalculada() != false && !((List)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamadoCalculado.get(this.custasJudiciaisDaAtualizacao)).isEmpty();
            }
            return false;
        }

        @Override
        public Boolean getMostrarCustasConhecimentoReclamadoInformada() {
            if (Utils.naoNulo(CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamadoInformado.get(this.custasJudiciaisDaAtualizacao))) {
                return this.custasJudiciaisDaAtualizacao.getMostrarCustasConhecimentoReclamadoInformada() != false && !((List)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamadoInformado.get(this.custasJudiciaisDaAtualizacao)).isEmpty();
            }
            return false;
        }

        @Override
        public Boolean getMostrarCustasConhecimentoReclamanteGrade() {
            return this.custasJudiciaisDaAtualizacao.getMostrarCustasConhecimentoReclamanteGrade();
        }

        @Override
        public Boolean getMostrarCustasConhecimentoReclamanteCalculada() {
            if (Utils.naoNulo(CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamanteCalculada.get(this.custasJudiciaisDaAtualizacao))) {
                return this.custasJudiciaisDaAtualizacao.getMostrarCustasConhecimentoReclamanteCalculada() != false && !((List)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamanteCalculada.get(this.custasJudiciaisDaAtualizacao)).isEmpty();
            }
            return false;
        }

        @Override
        public Boolean getMostrarCustasConhecimentoReclamanteInformada() {
            if (Utils.naoNulo(CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamanteInformada.get(this.custasJudiciaisDaAtualizacao))) {
                return this.custasJudiciaisDaAtualizacao.getMostrarCustasConhecimentoReclamanteInformada() != false && !((List)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamanteInformada.get(this.custasJudiciaisDaAtualizacao)).isEmpty();
            }
            return false;
        }

        @Override
        public Boolean getMostrarCustasLiquidacaoCalculada() {
            if (Utils.naoNulo(CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasLiquidacaoCalculada.get(this.custasJudiciaisDaAtualizacao))) {
                return this.custasJudiciaisDaAtualizacao.getMostrarCustasLiquidacaoCalculada() != false && !((List)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasLiquidacaoCalculada.get(this.custasJudiciaisDaAtualizacao)).isEmpty();
            }
            return false;
        }

        @Override
        public Boolean getMostrarCustasLiquidacaoInformada() {
            if (Utils.naoNulo(CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasLiquidacaoInformada.get(this.custasJudiciaisDaAtualizacao))) {
                return this.custasJudiciaisDaAtualizacao.getMostrarCustasLiquidacaoInformada() != false && !((List)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasLiquidacaoInformada.get(this.custasJudiciaisDaAtualizacao)).isEmpty();
            }
            return false;
        }

        @Override
        public Boolean getMostrarCustasExecucaoCalculoExterno() {
            if (Utils.naoNulo(CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasExecucaoCalculoExterno.get(this.custasJudiciaisDaAtualizacao))) {
                return !((List)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasExecucaoCalculoExterno.get(this.custasJudiciaisDaAtualizacao)).isEmpty() && this.custasJudiciaisDaAtualizacao.getCalculo().isCalculoExterno() != false;
            }
            return false;
        }

        @Override
        public String getDataVencimentoCustasRemanescentesReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getDataInicialPeriodo())) {
                return HelperDate.getInstance(this.custasJudiciaisDaAtualizacao.getDataInicialPeriodo()).format(CustasAtualizacaoJRAdapterPadrao.FORMATO_DATA).toString();
            }
            return "-";
        }

        @Override
        public String getValorCustasRemanescentesReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getValorCustasRemanescentesReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getValorCustasRemanescentesReclamado());
            }
            return "-";
        }

        @Override
        public String getValorJurosRemanescentesReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getValorJurosRemanescentesReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getValorJurosRemanescentesReclamado());
            }
            return "-";
        }

        @Override
        public String getIndiceCorrecaoCustasRemanescentesReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getIndiceCorrecaoCustasRemanescentesReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getIndiceCorrecaoCustasRemanescentesReclamado(), 9);
            }
            return "-";
        }

        @Override
        public String getValorCorrigidoDeCustasRemanescentesDoReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getValorCorrigidoDeCustasRemanescentesDoReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getValorCorrigidoDeCustasRemanescentesDoReclamado());
            }
            return "-";
        }

        @Override
        public String getValorCorrigidoDeJurosRemanescentesDoReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getValorCorrigidoDeJurosRemanescentesDoReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getValorCorrigidoDeJurosRemanescentesDoReclamado());
            }
            return "-";
        }

        @Override
        public String getTaxaJurosCustasRemanescentesReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getTaxaJurosCustasRemanescentesReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getTaxaJurosCustasRemanescentesReclamado(), 4) + "%";
            }
            return "-";
        }

        @Override
        public String getJurosDoPeriodoDeCustasRemanescentesDoReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getJurosDoPeriodoDeCustasRemanescentesDoReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getJurosDoPeriodoDeCustasRemanescentesDoReclamado());
            }
            return "-";
        }

        @Override
        public String getTotalDeJurosDeCustasRemanescentesDoReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getTotalDeJurosDeCustasRemanescentesDoReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getTotalDeJurosDeCustasRemanescentesDoReclamado());
            }
            return "-";
        }

        @Override
        public String getTotalCustasRemanescentesDoReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getTotalCustasRemanescentesDoReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getTotalCustasRemanescentesDoReclamado());
            }
            return "-";
        }

        @Override
        public Boolean getMostrarSaldoReclamado() {
            return this.custasJudiciaisDaAtualizacao.getJaPagoUmaVezReclamado();
        }

        @Override
        public String getDataOcorrenciaDiferencaReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getDataFinalPeriodo())) {
                return HelperDate.getInstance(this.custasJudiciaisDaAtualizacao.getDataFinalPeriodo()).format(CustasAtualizacaoJRAdapterPadrao.FORMATO_DATA).toString();
            }
            return "-";
        }

        @Override
        public String getTotalValorCorrigidoReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.totalValorCorrigidoReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.totalValorCorrigidoReclamado());
            }
            return "-";
        }

        @Override
        public String getTotalJurosReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.totalJurosReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.totalJurosReclamado());
            }
            return "-";
        }

        @Override
        public String getTotalDevidoReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.totalDevidoReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.totalDevidoReclamado());
            }
            return "-";
        }

        @Override
        public String getValorPagoReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getValorPagoReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getValorPagoReclamado());
            }
            return "-";
        }

        @Override
        public String getDiferencaValorReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getDiferencaValorReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getDiferencaValorReclamado());
            }
            return "-";
        }

        @Override
        public String getDiferencaJurosReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getDiferencaJurosReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getDiferencaJurosReclamado());
            }
            return "-";
        }

        @Override
        public String getTotalDiferencaReclamado() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getTotalDiferencaReclamado())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getTotalDiferencaReclamado());
            }
            return "-";
        }

        @Override
        public String getDataVencimentoCustasRemanescentesReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getTotalDiferencaReclamado())) {
                return HelperDate.getInstance(this.custasJudiciaisDaAtualizacao.getDataInicialPeriodo()).format(CustasAtualizacaoJRAdapterPadrao.FORMATO_DATA).toString();
            }
            return "-";
        }

        @Override
        public String getValorCustasRemanescentesReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getValorCustasRemanescentesReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getValorCustasRemanescentesReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getValorJurosRemanescentesReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getValorJurosRemanescentesReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getValorJurosRemanescentesReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getIndiceCorrecaoCustasRemanescentesReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getIndiceCorrecaoCustasRemanescentesReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getIndiceCorrecaoCustasRemanescentesReclamante(), 9);
            }
            return "-";
        }

        @Override
        public String getValorCorrigidoDeCustasRemanescentesDoReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getValorCorrigidoDeCustasRemanescentesDoReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getValorCorrigidoDeCustasRemanescentesDoReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getValorCorrigidoDeJurosRemanescentesDoReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getValorCorrigidoDeJurosRemanescentesDoReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getValorCorrigidoDeJurosRemanescentesDoReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getTaxaJurosCustasRemanescentesReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getTaxaJurosCustasRemanescentesReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getTaxaJurosCustasRemanescentesReclamante(), 4) + "%";
            }
            return "-";
        }

        @Override
        public String getJurosDoPeriodoDeCustasRemanescentesDoReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getJurosDoPeriodoDeCustasRemanescentesDoReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getJurosDoPeriodoDeCustasRemanescentesDoReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getTotalDeJurosDeCustasRemanescentesDoReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getTotalDeJurosDeCustasRemanescentesDoReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getTotalDeJurosDeCustasRemanescentesDoReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getTotalCustasRemanescentesDoReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getTotalCustasRemanescentesDoReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getTotalCustasRemanescentesDoReclamante()).toString();
            }
            return "-";
        }

        @Override
        public Boolean getMostrarSaldoReclamante() {
            return this.custasJudiciaisDaAtualizacao.getJaPagoUmaVezReclamante();
        }

        @Override
        public String getDataOcorrenciaDiferencaReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getDataFinalPeriodo())) {
                return HelperDate.getInstance(this.custasJudiciaisDaAtualizacao.getDataFinalPeriodo()).format(CustasAtualizacaoJRAdapterPadrao.FORMATO_DATA).toString();
            }
            return "-";
        }

        @Override
        public String getTotalValorCorrigidoReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.totalValorCorrigidoReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.totalValorCorrigidoReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getTotalJurosReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.totalJurosReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.totalJurosReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getTotalDevidoReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.totalDevidoReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.totalDevidoReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getValorPagoReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getValorPagoReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getValorPagoReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getDiferencaValorReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getDiferencaValorReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getDiferencaValorReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getDiferencaJurosReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getDiferencaJurosReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getDiferencaJurosReclamante()).toString();
            }
            return "-";
        }

        @Override
        public String getTotalDiferencaReclamante() {
            if (Utils.naoNulo(this.custasJudiciaisDaAtualizacao.getTotalDiferencaReclamante())) {
                return Utils.formatarValor(this.custasJudiciaisDaAtualizacao.getTotalDiferencaReclamante()).toString();
            }
            return "-";
        }

        @Override
        public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter> getItensCustasConhecimentoReclamadoCalculado() {
            return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter>(new CustaItemJRAdapterPadrao(), (Collection)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamadoCalculado.get(this.custasJudiciaisDaAtualizacao));
        }

        @Override
        public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter> getItensCustasConhecimentoReclamadoInformado() {
            return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter>(new CustaItemJRAdapterPadrao(), (Collection)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamadoInformado.get(this.custasJudiciaisDaAtualizacao));
        }

        @Override
        public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter> getItensCustasLiquidacaoCalculado() {
            return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter>(new CustaItemJRAdapterPadrao(), (Collection)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasLiquidacaoCalculada.get(this.custasJudiciaisDaAtualizacao));
        }

        @Override
        public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter> getItensCustasLiquidacaoInformado() {
            return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter>(new CustaItemJRAdapterPadrao(), (Collection)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasLiquidacaoInformada.get(this.custasJudiciaisDaAtualizacao));
        }

        @Override
        public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter> getItensCustasExecucaoCalculoExterno() {
            return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter>(new CustaItemJRAdapterPadrao(), (Collection)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasExecucaoCalculoExterno.get(this.custasJudiciaisDaAtualizacao));
        }

        @Override
        public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter> getItensCustasFixas() {
            return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter>(new CustaItemJRAdapterPadrao(), (Collection)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasFixas.get(this.custasJudiciaisDaAtualizacao));
        }

        @Override
        public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter> getItensCustasAutos() {
            return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter>(new CustaItemJRAdapterPadrao(), (Collection)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasAutos.get(this.custasJudiciaisDaAtualizacao));
        }

        @Override
        public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter> getItensCustasArmazenamento() {
            return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter>(new CustaItemJRAdapterPadrao(), (Collection)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasArmazenamento.get(this.custasJudiciaisDaAtualizacao));
        }

        @Override
        public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter> getItensConhecimentoReclamanteCalculado() {
            return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter>(new CustaItemJRAdapterPadrao(), (Collection)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamanteCalculada.get(this.custasJudiciaisDaAtualizacao));
        }

        @Override
        public JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter> getItensConhecimentoReclamanteInformado() {
            return new JRAdapterDataSource<CustaAtualizacaoJRAdapter.CustaItemAdapter>(new CustaItemJRAdapterPadrao(), (Collection)CustasAtualizacaoJRAdapterPadrao.this.mapaDeItensCustasConhecimentoReclamanteInformada.get(this.custasJudiciaisDaAtualizacao));
        }
    }
}

