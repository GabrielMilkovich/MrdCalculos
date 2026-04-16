/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoSecaoRelatorioPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.precatorio.SecaoVO;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.AtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioCreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioOutrosDebitosDoReclamado;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DemonstrativoAtualizacaoPrecatorioJRAdapterPadrao
extends DemonstrativoAtualizacaoJRAdapter {
    private Calculo calculo;
    private List<SecaoVO> creditosEDebitos = new ArrayList<SecaoVO>();
    private List<CreditosDoReclamante> creditosDoReclamante;
    private List<DebitosDoReclamante> debitosDoReclamante;
    private List<OutrosDebitosReclamado> outrosDebitoReclamado;
    private List<DebitosCobrarDoReclamante> debitosCobrarDoReclamante;
    private Map<Object, List<Item>> mapaDeItens = new HashMap<Object, List<Item>>();
    private static final String DEVIDOS_PARA = " devidos para ";
    private static final String JUROS_DE_MORA_ATE = "Juros de Mora at\u00e9 ";
    private static final String JUROS_DE_MORA_DE = "Juros de Mora de ";
    private static final String FORMATO_PADRAO_DATA = "dd/MM/yyyy";
    private static final String ATE = " at\u00e9 ";

    public DemonstrativoAtualizacaoPrecatorioJRAdapterPadrao(Calculo calculo) {
        this.calculo = calculo;
        this.creditosDoReclamante = CreditosDoReclamante.obterTodos(this.calculo.getAtualizacao());
        this.debitosDoReclamante = DebitosDoReclamante.obterTodos(this.calculo.getAtualizacao());
        this.outrosDebitoReclamado = OutrosDebitosReclamado.obterTodos(this.calculo.getAtualizacao());
        this.debitosCobrarDoReclamante = DebitosCobrarDoReclamante.obterTodos(this.calculo.getAtualizacao());
        for (int i = 0; i < this.creditosDoReclamante.size(); ++i) {
            SecaoVO outrosDebitos;
            List<Item> itensOutrosDebitos;
            SecaoVO liquidoExequente = new SecaoVO(TipoSecaoRelatorioPrecatorioEnum.EXEQUENTE_LIQUIDO, this.creditosDoReclamante.get(i).getDescritivoDeEventos());
            List<Item> itensLiquidoExequente = this.montarItensLiquidoExequente(liquidoExequente, this.creditosDoReclamante.get(i), i == 0);
            if (!itensLiquidoExequente.isEmpty()) {
                this.mapaDeItens.put(liquidoExequente, itensLiquidoExequente);
                this.creditosEDebitos.add(liquidoExequente);
            }
            if (!(itensOutrosDebitos = this.montarItensOutrosDebitos(outrosDebitos = new SecaoVO(TipoSecaoRelatorioPrecatorioEnum.OUTROS_DEBITOS), this.debitosDoReclamante.get(i), this.outrosDebitoReclamado.get(i), i == 0)).isEmpty()) {
                this.mapaDeItens.put(outrosDebitos, itensOutrosDebitos);
                this.creditosEDebitos.add(outrosDebitos);
            }
            this.inserirHonorario(this.outrosDebitoReclamado.get(i), i == 0);
            this.inserirHonorario(this.debitosDoReclamante.get(i), i == 0);
            this.inserirHonorario(this.debitosCobrarDoReclamante.get(i), i == 0);
        }
    }

    private void inserirHonorario(Object grupo, boolean primeiroProcessamento) {
        OutrosDebitosReclamado outroDebitoReclamado = null;
        DebitosDoReclamante debitoReclamante = null;
        DebitosCobrarDoReclamante debitoCobrarReclamante = null;
        if (grupo instanceof OutrosDebitosReclamado) {
            outroDebitoReclamado = (OutrosDebitosReclamado)grupo;
        } else if (grupo instanceof DebitosDoReclamante) {
            debitoReclamante = (DebitosDoReclamante)grupo;
        } else {
            debitoCobrarReclamante = (DebitosCobrarDoReclamante)grupo;
        }
        ArrayList<HonorarioDaAtualizacao> honorariosInformadosOrdenados = outroDebitoReclamado != null ? new ArrayList<HonorarioDaAtualizacao>(outroDebitoReclamado.getHonorariosDaAtualizacaoInformado()) : (debitoReclamante != null ? new ArrayList<HonorarioDaAtualizacao>(debitoReclamante.getHonorariosDaAtualizacaoInformado()) : new ArrayList<HonorarioDaAtualizacao>(debitoCobrarReclamante.getHonorariosDaAtualizacaoInformado()));
        Collections.sort(honorariosInformadosOrdenados);
        for (HonorarioDaAtualizacao honorarioInformado : honorariosInformadosOrdenados) {
            boolean isCobrarReclamante = honorarioInformado.getHonorario().getTipoCobrancaReclamante() == TipoCobrancaReclamanteEnum.COBRAR;
            SecaoVO terceiroInteressado = new SecaoVO(isCobrarReclamante ? TipoSecaoRelatorioPrecatorioEnum.TERCEIROS_INTERESSADOS_SUSPENSO : TipoSecaoRelatorioPrecatorioEnum.TERCEIROS_INTERESSADOS);
            List<Item> itensTerceiroInteressado = this.montarItensTerceiroInteressado(terceiroInteressado, honorarioInformado, grupo, primeiroProcessamento);
            if (itensTerceiroInteressado.isEmpty()) continue;
            this.mapaDeItens.put(terceiroInteressado, itensTerceiroInteressado);
            this.creditosEDebitos.add(terceiroInteressado);
        }
    }

    private List<Item> montarItensTerceiroInteressado(SecaoVO terceiroInteressado, HonorarioDaAtualizacao honorarioAtualizacao, Object grupo, boolean primeiroProcessamento) {
        Date dataFinalPeriodo;
        Date dataInicioPeriodo;
        Date dataDeLiquidacaoAtualizacao;
        OutrosDebitosReclamado outroDebitoReclamado = null;
        DebitosDoReclamante debitoReclamante = null;
        DebitosCobrarDoReclamante debitoCobrarReclamante = null;
        if (grupo instanceof OutrosDebitosReclamado) {
            outroDebitoReclamado = (OutrosDebitosReclamado)grupo;
        } else if (grupo instanceof DebitosDoReclamante) {
            debitoReclamante = (DebitosDoReclamante)grupo;
        } else {
            debitoCobrarReclamante = (DebitosCobrarDoReclamante)grupo;
        }
        ArrayList<Item> itensTerceiroInteressado = new ArrayList<Item>();
        if (grupo instanceof OutrosDebitosReclamado) {
            dataDeLiquidacaoAtualizacao = outroDebitoReclamado.getAtualizacao().getDataDeLiquidacao();
            dataInicioPeriodo = outroDebitoReclamado.getDataInicialPeriodo();
            dataFinalPeriodo = outroDebitoReclamado.getDataFinalPeriodo();
        } else if (grupo instanceof DebitosDoReclamante) {
            dataDeLiquidacaoAtualizacao = debitoReclamante.getAtualizacao().getDataDeLiquidacao();
            dataInicioPeriodo = debitoReclamante.getDataInicialPeriodo();
            dataFinalPeriodo = debitoReclamante.getDataFinalPeriodo();
        } else {
            dataDeLiquidacaoAtualizacao = debitoCobrarReclamante.getAtualizacao().getDataDeLiquidacao();
            dataInicioPeriodo = debitoCobrarReclamante.getDataInicialPeriodo();
            dataFinalPeriodo = debitoCobrarReclamante.getDataFinalPeriodo();
        }
        HelperDate dataInicialParaLiquidacaoMaisUm = this.calculo.getDataDeLiquidacao().equals(dataDeLiquidacaoAtualizacao) || HelperDate.dateEquals(dataInicioPeriodo, dataFinalPeriodo) ? HelperDate.getInstance(dataFinalPeriodo) : HelperDate.getInstance(dataInicioPeriodo).addDay(1);
        BigDecimal diferencaHonorario = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), honorarioAtualizacao.getIndiceDeCorrecao()), honorarioAtualizacao.getPagoHonorario()));
        Item item = new Item(honorarioAtualizacao.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioAtualizacao.getHonorario().getNomeCredor(), null, null, honorarioAtualizacao.getValorHonorario(), Utils.arredondarValor(honorarioAtualizacao.getIndiceDeCorrecao(), 9), Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), honorarioAtualizacao.getIndiceDeCorrecao())), honorarioAtualizacao.getPagoHonorario(), diferencaHonorario);
        itensTerceiroInteressado.add(item);
        terceiroInteressado.incrementar(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), honorarioAtualizacao.getIndiceDeCorrecao())), honorarioAtualizacao.getPagoHonorario(), diferencaHonorario);
        BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorJuros(), honorarioAtualizacao.getIndiceDeCorrecao()));
        if (Utils.nulo(devido)) {
            devido = BigDecimal.ZERO;
        }
        BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioAtualizacao.getPagoJuro()));
        item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(dataDeLiquidacaoAtualizacao) ? HelperDate.getInstance(dataFinalPeriodo).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(dataInicioPeriodo).format(FORMATO_PADRAO_DATA)), null, null, Utils.arredondarValorMonetario(Utils.naoNulo(honorarioAtualizacao.getValorJuros()) ? honorarioAtualizacao.getValorJuros() : BigDecimal.ZERO), Utils.arredondarValor(honorarioAtualizacao.getIndiceDeCorrecaoParaJuros(), 9), devido, honorarioAtualizacao.getPagoJuro(), diferencaJuro);
        itensTerceiroInteressado.add(item);
        terceiroInteressado.incrementar(devido, honorarioAtualizacao.getPagoJuro(), diferencaJuro);
        Honorario honorario = honorarioAtualizacao.getHonorario();
        Date dataInicialDeAte = AtualizacaoUtils.testarExistenciaJurosDeAte(new Periodo(dataInicioPeriodo, dataFinalPeriodo), dataInicialParaLiquidacaoMaisUm.getDate(), honorarioAtualizacao.getHonorario().getOrigemRegistro(), honorario.getCalculo(), honorario.getDataApartirDeAplicarJuros(), honorario.getDataEvento(), primeiroProcessamento);
        if (Utils.naoNulo(dataInicialDeAte)) {
            BigDecimal taxaDeJurosHonorario = honorarioAtualizacao.getTaxaJurosHonorario() != null ? honorarioAtualizacao.getTaxaJurosHonorario() : (Utils.naoNulo(this.outrosDebitoReclamado) ? outroDebitoReclamado.getTaxaDeJuros() : debitoReclamante.getTaxaDeJuros());
            BigDecimal base = honorarioAtualizacao.getHonorario().getAplicarJuros() != false || TipoValorEnum.CALCULADO.equals((Object)honorarioAtualizacao.getHonorario().getTipoValor()) ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), honorarioAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosHonorario.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioAtualizacao.getPagoJuroPeriodoAtual()));
            HelperDate dataInicio = HelperDate.getInstance(dataInicialDeAte);
            item = new Item(JUROS_DE_MORA_DE + dataInicio.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(dataFinalPeriodo).format(FORMATO_PADRAO_DATA), base, taxaDeJurosHonorario, null, null, dev, honorarioAtualizacao.getPagoJuroPeriodoAtual(), diferencaJuroAtual);
            itensTerceiroInteressado.add(item);
            terceiroInteressado.incrementar(dev, honorarioAtualizacao.getPagoJuroPeriodoAtual(), diferencaJuroAtual);
        }
        BigDecimal valorPagoImpostoRenda = BigDecimal.ZERO;
        valorPagoImpostoRenda = Utils.somar(valorPagoImpostoRenda, honorarioAtualizacao.getPagoImpostoRenda(), valorPagoImpostoRenda);
        item = new Item("Imposto de Renda sobre Honor\u00e1rio ", null, null, honorarioAtualizacao.getValorImpostoRenda(), Utils.arredondarValor(honorarioAtualizacao.getIndiceDeCorrecao(), 9), Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorImpostoRenda(), honorarioAtualizacao.getIndiceDeCorrecao())), valorPagoImpostoRenda, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorImpostoRenda(), honorarioAtualizacao.getIndiceDeCorrecao())), valorPagoImpostoRenda));
        itensTerceiroInteressado.add(item);
        terceiroInteressado.incrementar(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorImpostoRenda(), honorarioAtualizacao.getIndiceDeCorrecao())), valorPagoImpostoRenda, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorImpostoRenda(), honorarioAtualizacao.getIndiceDeCorrecao())), valorPagoImpostoRenda));
        return itensTerceiroInteressado;
    }

    private List<Item> montarItensLiquidoExequente(SecaoVO liquidoExequente, CreditosDoReclamante creditosDoReclamante, boolean primeiroProcessamento) {
        Item item;
        CreditosDoReclamante creditoDoReclamante = (CreditosDoReclamante)EntidadeBase.obter(RepositorioCreditosDoReclamante.class, creditosDoReclamante.getId());
        ArrayList<Item> itensLiquidoExequente = new ArrayList<Item>();
        HelperDate dataInicialParaLiquidacaoMaisUm = this.calculo.getDataDeLiquidacao().equals(creditoDoReclamante.getAtualizacao().getDataDeLiquidacao()) || HelperDate.dateEquals(creditoDoReclamante.getDataInicialPeriodo(), creditoDoReclamante.getDataFinalPeriodo()) ? HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()) : HelperDate.getInstance(creditoDoReclamante.getDataInicialPeriodo()).addDay(1);
        BigDecimal fatorConversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(creditoDoReclamante.getDataInicialPeriodo(), creditoDoReclamante.getDataFinalPeriodo());
        if (PagamentoUtils.verificaSeExisteValorPrincipalParaCreditoDeReclamante(this.calculo).booleanValue()) {
            item = new Item("Principal", null, null, creditoDoReclamante.getValorPrincipal(), BigDecimal.ZERO.compareTo(creditoDoReclamante.getValorPrincipal()) > 0 ? fatorConversaoMoeda : Utils.arredondarValor(creditoDoReclamante.getIndiceDeCorrecao(), 9), creditoDoReclamante.getDevidoPrincipal(), creditoDoReclamante.getPagoPrincipal(), creditoDoReclamante.getDiferencaPrincipal());
            itensLiquidoExequente.add(item);
            liquidoExequente.incrementar(creditoDoReclamante.getDevidoPrincipal(), creditoDoReclamante.getPagoPrincipal(), creditoDoReclamante.getDiferencaPrincipal());
            item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(creditoDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(creditoDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, creditoDoReclamante.getJuroPrincipal(), BigDecimal.ZERO.compareTo(creditoDoReclamante.getJuroPrincipal()) > 0 ? fatorConversaoMoeda : Utils.arredondarValor(creditoDoReclamante.getIndiceDeCorrecaoParaJuros(), 9), creditoDoReclamante.getDevidoJuroDeMoraPrincipal(), creditoDoReclamante.getPagoJuroDeMoraPrincipal(), creditoDoReclamante.getDiferencaJuroDeMoraPrincipal());
            itensLiquidoExequente.add(item);
            liquidoExequente.incrementar(creditoDoReclamante.getDevidoJuroDeMoraPrincipal(), creditoDoReclamante.getPagoJuroDeMoraPrincipal(), creditoDoReclamante.getDiferencaJuroDeMoraPrincipal());
            item = new Item(JUROS_DE_MORA_DE + dataInicialParaLiquidacaoMaisUm.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), creditoDoReclamante.getBaseJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamante.getTaxaDeJuros(), null, null, creditoDoReclamante.getDevidoJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamante.getPagoJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamante.getDiferencaJuroDeMoraPrincipalPeriodoAtual());
            itensLiquidoExequente.add(item);
            liquidoExequente.incrementar(creditoDoReclamante.getDevidoJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamante.getPagoJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamante.getDiferencaJuroDeMoraPrincipalPeriodoAtual());
        }
        if (!this.calculo.getFgts().getDestinoDoFgts().equals((Object)DestinoDoFgtsEnum.DEPOSITAR) && PagamentoUtils.verificaSeExisteFgtsParaCreditoDeReclamante(this.calculo).booleanValue()) {
            item = new Item("FGTS", null, null, creditoDoReclamante.getValorFgts(), BigDecimal.ZERO.compareTo(creditoDoReclamante.getValorFgts()) > 0 ? fatorConversaoMoeda : Utils.arredondarValor(creditoDoReclamante.getIndiceDeCorrecaoFgts(), 9), creditoDoReclamante.getDevidoFgts(), creditoDoReclamante.getPagoFgts(), creditoDoReclamante.getDiferencaFgts());
            itensLiquidoExequente.add(item);
            liquidoExequente.incrementar(creditoDoReclamante.getDevidoFgts(), creditoDoReclamante.getPagoFgts(), creditoDoReclamante.getDiferencaFgts());
            item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(creditoDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(creditoDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, creditoDoReclamante.getJuroFgts(), BigDecimal.ZERO.compareTo(creditoDoReclamante.getJuroFgts()) > 0 ? fatorConversaoMoeda : Utils.arredondarValor(creditoDoReclamante.getIndiceDeCorrecaoFgts(), 9), creditoDoReclamante.getDevidoJuroDeMoraFgts(), creditoDoReclamante.getPagoJuroDeMoraFgts(), creditoDoReclamante.getDiferencaJuroDeMoraFgts());
            itensLiquidoExequente.add(item);
            liquidoExequente.incrementar(creditoDoReclamante.getDevidoJuroDeMoraFgts(), creditoDoReclamante.getPagoJuroDeMoraFgts(), creditoDoReclamante.getDiferencaJuroDeMoraFgts());
            item = new Item(JUROS_DE_MORA_DE + dataInicialParaLiquidacaoMaisUm.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), BigDecimal.ZERO.compareTo(creditoDoReclamante.getDevidoFgts()) > 0 ? BigDecimal.ZERO : creditoDoReclamante.getDevidoFgts(), creditoDoReclamante.getTaxaDeJurosFgts(), null, null, creditoDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual(), creditoDoReclamante.getPagoJuroDeMoraFgtsPeriodoAtual(), creditoDoReclamante.getDiferencaJuroDeMoraFgtsPeriodoAtual());
            itensLiquidoExequente.add(item);
            liquidoExequente.incrementar(creditoDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual(), creditoDoReclamante.getPagoJuroDeMoraFgtsPeriodoAtual(), creditoDoReclamante.getDiferencaJuroDeMoraFgtsPeriodoAtual());
        }
        return itensLiquidoExequente;
    }

    private List<Item> montarItensOutrosDebitos(SecaoVO outrosDebitos, DebitosDoReclamante debitosDoReclamante, OutrosDebitosReclamado outrosDebitosDoReclamado, boolean primeiroProcessamento) {
        Item item;
        DebitosDoReclamante debitoDoReclamante = (DebitosDoReclamante)EntidadeBase.obter(RepositorioDebitosDoReclamante.class, debitosDoReclamante.getId());
        OutrosDebitosReclamado outroDebitoReclamado = (OutrosDebitosReclamado)EntidadeBase.obter(RepositorioOutrosDebitosDoReclamado.class, outrosDebitosDoReclamado.getId());
        ArrayList<Item> itensOutrosDebitos = new ArrayList<Item>();
        HelperDate dataInicialParaLiquidacaoMaisUm = this.calculo.getDataDeLiquidacao().equals(debitoDoReclamante.getAtualizacao().getDataDeLiquidacao()) || HelperDate.dateEquals(debitoDoReclamante.getDataInicialPeriodo(), debitoDoReclamante.getDataFinalPeriodo()) ? HelperDate.getInstance(debitoDoReclamante.getDataFinalPeriodo()) : HelperDate.getInstance(debitoDoReclamante.getDataInicialPeriodo()).addDay(1);
        this.montarDepositoDeFgtsDebitosDoReclamante(outrosDebitos, debitoDoReclamante, itensOutrosDebitos, dataInicialParaLiquidacaoMaisUm);
        if (PagamentoUtils.verificaSeExisteDescontoContribuicaoSocialReclamante(this.calculo).booleanValue()) {
            item = new Item("INSS Benefici\u00e1rio", null, null, debitoDoReclamante.getValorDescontoInss(), debitoDoReclamante.getIndiceDeCorrecao(), debitoDoReclamante.getDescontoInssCorrigidoPrecatorio(), debitoDoReclamante.getPagoDescontoInss(), debitoDoReclamante.getDiferencaInssPrecatorio());
            itensOutrosDebitos.add(item);
            outrosDebitos.incrementar(debitoDoReclamante.getDescontoInssCorrigidoPrecatorio(), debitoDoReclamante.getPagoDescontoInss(), debitoDoReclamante.getDiferencaInssPrecatorio());
        }
        if (PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosDevidos(this.calculo).booleanValue()) {
            item = new Item("INSS Executado - Sal\u00e1rios Devidos", null, null, outroDebitoReclamado.getValorDevidoInssSalariosDevidosParaPrecatorio(), Utils.arredondarValor(outroDebitoReclamado.getIndiceDeCorrecao(), 9), outroDebitoReclamado.getDevidoCorrigidoContribuicaoSocialSalariosDevidosPrecatorio(), outroDebitoReclamado.getValorPagoInssSalariosDevidos(), outroDebitoReclamado.getDiferencaContribuicaoSocialSalariosDevidosPrecatorio());
            itensOutrosDebitos.add(item);
            outrosDebitos.incrementar(outroDebitoReclamado.getDevidoCorrigidoContribuicaoSocialSalariosDevidosPrecatorio(), outroDebitoReclamado.getValorPagoInssSalariosDevidos(), outroDebitoReclamado.getDiferencaContribuicaoSocialSalariosDevidosPrecatorio());
        }
        if (PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosPagos(this.calculo).booleanValue()) {
            item = new Item("INSS Executado - Sal\u00e1rios Pagos", null, null, outroDebitoReclamado.getValorDevidoInssSalariosPagosParaPrecatorio(), Utils.arredondarValor(outroDebitoReclamado.getIndiceDeCorrecao(), 9), outroDebitoReclamado.getDevidoCorrigidoContribuicaoSocialSalariosPagosPrecatorio(), outroDebitoReclamado.getValorPagoInssSalariosPagos(), outroDebitoReclamado.getDiferencaContribuicaoSocialSalariosPagosPrecatorio());
            itensOutrosDebitos.add(item);
            outrosDebitos.incrementar(outroDebitoReclamado.getDevidoCorrigidoContribuicaoSocialSalariosPagosPrecatorio(), outroDebitoReclamado.getValorPagoInssSalariosPagos(), outroDebitoReclamado.getDiferencaContribuicaoSocialSalariosPagosPrecatorio());
        }
        if (PagamentoUtils.verificaSeExisteImpostoParaReclamante(this.calculo).booleanValue()) {
            item = new Item("Imposto de Renda", null, null, debitoDoReclamante.getValorDevidoIrpf(), Utils.arredondarValor(debitoDoReclamante.getIndiceDeCorrecao(), 9), debitoDoReclamante.getValorIrpfCorrigidoPrecatorio(), debitoDoReclamante.getValorPagoIrpf(), debitoDoReclamante.getDiferencaIrpfPrecatorio());
            itensOutrosDebitos.add(item);
            outrosDebitos.incrementar(debitoDoReclamante.getValorIrpfCorrigidoPrecatorio(), debitoDoReclamante.getValorPagoIrpf(), debitoDoReclamante.getDiferencaIrpfPrecatorio());
        }
        if (PagamentoUtils.verificaSeExisteCustaDoReclamanteAPagar(this.calculo).booleanValue()) {
            item = new Item("Custas Judiciais - Exequente", null, null, debitoDoReclamante.getValorDevidoCustasParaPrecatorio(), Utils.arredondarValor(debitoDoReclamante.getIndiceDeCorrecao(), 9), debitoDoReclamante.getDevidoCorrigidoCustasJudiciaisPrecatorio(), debitoDoReclamante.getValorPagoCustasParaPrecatorio(), debitoDoReclamante.getDiferencaCustasJudiciaisPrecatorio());
            itensOutrosDebitos.add(item);
            outrosDebitos.incrementar(debitoDoReclamante.getDevidoCustasJudiciais(), debitoDoReclamante.getValorPagoCustasParaPrecatorio(), debitoDoReclamante.getDiferencaCustasJudiciais());
        }
        if (PagamentoUtils.verificaSeExisteCustaJudicialDoReclamado(this.calculo).booleanValue()) {
            item = new Item("Custas Judiciais - Executado", null, null, outroDebitoReclamado.getValorDevidoCustasParaPrecatorio(), Utils.arredondarValor(outroDebitoReclamado.getIndiceDeCorrecao(), 9), outroDebitoReclamado.getDevidoCorrigidoCustasJudiciaisPrecatorio(), outroDebitoReclamado.getPagoCustasJudiciais(), outroDebitoReclamado.getDiferencaCustasJudiciaisPrecatorio());
            itensOutrosDebitos.add(item);
            outrosDebitos.incrementar(outroDebitoReclamado.getDevidoCorrigidoCustasJudiciaisPrecatorio(), outroDebitoReclamado.getPagoCustasJudiciais(), outroDebitoReclamado.getDiferencaCustasJudiciaisPrecatorio());
        }
        return itensOutrosDebitos;
    }

    private void montarDepositoDeFgtsDebitosDoReclamante(SecaoVO outrosDebitos, DebitosDoReclamante debitoDoReclamante, List<Item> itensDebitosDoReclamante, HelperDate dataInicialParaLiquidacaoMaisUm) {
        if (debitoDoReclamante.getCalculo().getFgts().getDestinoDoFgts().equals((Object)DestinoDoFgtsEnum.DEPOSITAR) && PagamentoUtils.verificaSeExisteFgtsParaCreditoDeReclamante(this.calculo).booleanValue()) {
            Item item = new Item("Dep\u00f3sito de FGTS", null, null, debitoDoReclamante.getValorFgts(), Utils.arredondarValor(debitoDoReclamante.getIndiceDeCorrecaoFgts(), 9), debitoDoReclamante.getDevidoFgts(), debitoDoReclamante.getPagoFgts(), debitoDoReclamante.getDiferencaFgts());
            itensDebitosDoReclamante.add(item);
            outrosDebitos.incrementar(debitoDoReclamante.getDevidoFgts(), debitoDoReclamante.getPagoFgts(), debitoDoReclamante.getDiferencaFgts());
            if (BigDecimal.ZERO.compareTo(debitoDoReclamante.getValorFgts()) < 0) {
                item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(debitoDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(debitoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(debitoDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, debitoDoReclamante.getJuroFgts(), Utils.arredondarValor(debitoDoReclamante.getIndiceDeCorrecaoFgtsParaJuros(), 9), debitoDoReclamante.getDevidoJuroDeMoraFgts(), debitoDoReclamante.getPagoJuroDeMoraFgts(), debitoDoReclamante.getDiferencaJuroDeMoraFgts());
                itensDebitosDoReclamante.add(item);
                outrosDebitos.incrementar(debitoDoReclamante.getDevidoJuroDeMoraFgts(), debitoDoReclamante.getPagoJuroDeMoraFgts(), debitoDoReclamante.getDiferencaJuroDeMoraFgts());
                item = new Item(JUROS_DE_MORA_DE + dataInicialParaLiquidacaoMaisUm.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(debitoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), debitoDoReclamante.getDevidoFgts(), debitoDoReclamante.getTaxaDeJurosFgts(), null, null, debitoDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual(), debitoDoReclamante.getPagoJuroDeMoraFgtsPeriodoAtual(), debitoDoReclamante.getDiferencaJuroDeMoraFgtsPeriodoAtual());
                itensDebitosDoReclamante.add(item);
                outrosDebitos.incrementar(debitoDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual(), debitoDoReclamante.getPagoJuroDeMoraFgtsPeriodoAtual(), debitoDoReclamante.getDiferencaJuroDeMoraFgtsPeriodoAtual());
            }
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<JREmptyDS> getEmptyDS() {
        return new JRAdapterDataSource<JREmptyDS>(new JREmptyDS(), Arrays.asList(new Object()));
    }

    @Override
    public JRAdapterDataSource<DemonstrativoAtualizacaoJRAdapter.DemonstrativoAtualizacaoAdapter> getCreditoDebitoOutroDebito() {
        return new JRAdapterDataSource<DemonstrativoAtualizacaoJRAdapter.DemonstrativoAtualizacaoAdapter>(new DemonstrativoAtualizacaoDePrecatorioJRAdapterPadrao(), this.creditosEDebitos);
    }

    public class DemonstrativoItemJRAdapterPadrao
    extends DemonstrativoAtualizacaoJRAdapter.DemonstrativoItemAdapter {
        private Item item;

        public DemonstrativoItemJRAdapterPadrao() {
        }

        public DemonstrativoItemJRAdapterPadrao(Item item) {
            this.adapt(item);
        }

        @Override
        public JRAdapter adapt(Object item) {
            this.item = (Item)item;
            return this;
        }

        @Override
        public String getDescricao() {
            return this.item.getDescricao();
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
        public String getValor() {
            return this.item.getValor();
        }

        @Override
        public String getIndice() {
            return this.item.getIndice();
        }

        @Override
        public String getDevido() {
            return this.item.getDevido();
        }

        @Override
        public String getPago() {
            return this.item.getPago();
        }

        @Override
        public String getDiferenca() {
            return this.item.getDiferenca();
        }
    }

    public class Item {
        private String descricao;
        private BigDecimal base;
        private BigDecimal taxa;
        private BigDecimal valor;
        private BigDecimal indice;
        private BigDecimal devido;
        private BigDecimal pago;
        private BigDecimal diferenca;

        public Item(String descricao, BigDecimal base, BigDecimal taxa, BigDecimal valor, BigDecimal indice, BigDecimal devido, BigDecimal pago, BigDecimal diferenca) {
            this.descricao = descricao;
            this.base = base;
            this.taxa = taxa;
            this.valor = valor;
            this.indice = indice;
            this.devido = devido;
            this.pago = pago;
            this.diferenca = diferenca;
        }

        public String getDescricao() {
            return this.descricao;
        }

        public void setDescricao(String descricao) {
            this.descricao = descricao;
        }

        public String getBase() {
            return Utils.formatarValor(this.base);
        }

        public void setBase(BigDecimal base) {
            this.base = base;
        }

        public String getTaxa() {
            if (this.taxa == null) {
                return "-";
            }
            return Utils.formatarValor(this.taxa, 4) + "%";
        }

        public void setTaxa(BigDecimal taxa) {
            this.taxa = taxa;
        }

        public String getValor() {
            return Utils.formatarValor(this.valor);
        }

        public void setValor(BigDecimal valor) {
            this.valor = valor;
        }

        public String getIndice() {
            if (this.indice == null) {
                return "-";
            }
            return Utils.formatarValor(this.indice, 9).toString();
        }

        public void setIndice(BigDecimal indice) {
            this.indice = indice;
        }

        public String getDevido() {
            return Utils.formatarValor(this.devido);
        }

        public void setDevido(BigDecimal devido) {
            this.devido = devido;
        }

        public String getPago() {
            return Utils.formatarValor(this.pago);
        }

        public void setPago(BigDecimal pago) {
            this.pago = pago;
        }

        public String getDiferenca() {
            return Utils.formatarValor(this.diferenca);
        }

        public void setDiferenca(BigDecimal diferenca) {
            this.diferenca = diferenca;
        }
    }

    public class DemonstrativoAtualizacaoDePrecatorioJRAdapterPadrao
    extends DemonstrativoAtualizacaoJRAdapter.DemonstrativoAtualizacaoAdapter {
        private SecaoVO secao = null;

        @Override
        public JRAdapter adapt(Object adapted) {
            if (adapted instanceof SecaoVO) {
                this.secao = (SecaoVO)adapted;
            }
            return this;
        }

        @Override
        public String getDescritivoDeEventos() {
            return this.secao.getDescritivoDeEventos();
        }

        @Override
        public String getCabecalho() {
            return this.secao.getTipoSecaoRelatorio().getNome();
        }

        @Override
        public BigDecimal getTotalDevido() {
            return this.secao.getTotalDevido();
        }

        @Override
        public BigDecimal getTotalPago() {
            return this.secao.getTotalPago();
        }

        @Override
        public BigDecimal getTotalDiferenca() {
            return this.secao.getTotalDiferenca();
        }

        @Override
        public JRAdapterDataSource<DemonstrativoAtualizacaoJRAdapter.DemonstrativoItemAdapter> getItens() {
            return new JRAdapterDataSource<DemonstrativoAtualizacaoJRAdapter.DemonstrativoItemAdapter>(new DemonstrativoItemJRAdapterPadrao(), (Collection)DemonstrativoAtualizacaoPrecatorioJRAdapterPadrao.this.mapaDeItens.get(this.secao));
        }

        public String getTipoSecao() {
            return this.secao.getTipoSecaoRelatorio().getValor();
        }
    }
}

