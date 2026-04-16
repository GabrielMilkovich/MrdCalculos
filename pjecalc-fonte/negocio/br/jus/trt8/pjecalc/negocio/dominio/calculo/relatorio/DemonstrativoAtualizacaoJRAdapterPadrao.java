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
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.AtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioCreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDebitosCobrarDoReclamante;
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

public class DemonstrativoAtualizacaoJRAdapterPadrao
extends DemonstrativoAtualizacaoJRAdapter {
    private Calculo calculo;
    private List<Object> creditosEDebitos = new ArrayList<Object>();
    private List<CreditosDoReclamante> creditosDoReclamante;
    private List<DebitosDoReclamante> debitosDoReclamante;
    private List<OutrosDebitosReclamado> outrosDebitoReclamado;
    private List<DebitosCobrarDoReclamante> debitosCobrarDoReclamante;
    private Map<Object, List<Item>> mapaDeItens = new HashMap<Object, List<Item>>();
    private static final String DEVIDOS_PARA = " devidos para ";
    private static final String JUROS_DE_MORA_ATE = "Juros de Mora at\u00e9 ";
    private static final String JUROS_DE_MORA_DE = "Juros de Mora de ";
    private static final String DEVIDA_AO_RECLAMADO = " devida ao Reclamado";
    private static final String FORMATO_PADRAO_DATA = "dd/MM/yyyy";
    private static final String ATE = " at\u00e9 ";
    private static final String DEVIDA_PARA = " devida para ";
    private static final String DEVIDA_AO_RECLAMANTE = " devida ao Reclamante";
    private static final String REMANESCENTE = " - Remanescente ";
    private static final String SOBRE_JUROS_DO_PERIODO = " - sobre juros do per\u00edodo ";
    private static final String DEVIDA_PELO_RECLAMADO = " devida pelo Reclamado";
    private static final String DEVIDA_PELO_RECLAMANTE = " devida pelo Reclamante";
    private static final String DEVIDA_PARA_RECLAMADO = " devida para Reclamado";
    private static final String DEVIDA_PARA_RECLAMANTE = " devida para Reclamante";

    public DemonstrativoAtualizacaoJRAdapterPadrao(Calculo calculo) {
        this.calculo = calculo;
        this.creditosDoReclamante = CreditosDoReclamante.obterTodos(this.calculo.getAtualizacao());
        this.debitosDoReclamante = DebitosDoReclamante.obterTodos(this.calculo.getAtualizacao());
        this.outrosDebitoReclamado = OutrosDebitosReclamado.obterTodos(this.calculo.getAtualizacao());
        this.debitosCobrarDoReclamante = DebitosCobrarDoReclamante.obterTodos(this.calculo.getAtualizacao());
        for (int i = 0; i < this.creditosDoReclamante.size(); ++i) {
            List<Item> itensDebitosCobrarDoReclamante;
            List<Item> itensOutrosDebitosReclamado;
            List<Item> itensDebitosDoReclamante;
            List<Item> itensCreditoDoReclamante = this.montarItensCreditoDoReclamante(this.creditosDoReclamante.get(i), i == 0);
            if (!itensCreditoDoReclamante.isEmpty()) {
                this.mapaDeItens.put(this.creditosDoReclamante.get(i), itensCreditoDoReclamante);
                this.creditosEDebitos.add(this.creditosDoReclamante.get(i));
            }
            if (!(itensDebitosDoReclamante = this.montarItensDebitosDoReclamante(this.debitosDoReclamante.get(i), i == 0)).isEmpty()) {
                this.mapaDeItens.put(this.debitosDoReclamante.get(i), itensDebitosDoReclamante);
                this.creditosEDebitos.add(this.debitosDoReclamante.get(i));
            }
            if (!(itensOutrosDebitosReclamado = this.montarItensOutrosDebitosReclamado(this.outrosDebitoReclamado.get(i), i == 0)).isEmpty()) {
                this.mapaDeItens.put(this.outrosDebitoReclamado.get(i), itensOutrosDebitosReclamado);
                this.creditosEDebitos.add(this.outrosDebitoReclamado.get(i));
            }
            if (!Utils.naoNulo(this.debitosCobrarDoReclamante) || this.debitosCobrarDoReclamante.isEmpty() || (itensDebitosCobrarDoReclamante = this.montarItensDebitosCobrarDoReclamante(this.debitosCobrarDoReclamante.get(i), i == 0)).isEmpty()) continue;
            this.mapaDeItens.put(this.debitosCobrarDoReclamante.get(i), itensDebitosCobrarDoReclamante);
            this.creditosEDebitos.add(this.debitosCobrarDoReclamante.get(i));
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
        return new JRAdapterDataSource<DemonstrativoAtualizacaoJRAdapter.DemonstrativoAtualizacaoAdapter>(new DemonstrativoAtualizacaoDoCalculoJRAdapterPadrao(), this.creditosEDebitos);
    }

    public List<Item> montarItensCreditoDoReclamante(CreditosDoReclamante creditoDoReclamanteP, boolean primeiroProcessamento) {
        Item item;
        CreditosDoReclamante creditoDoReclamante = (CreditosDoReclamante)EntidadeBase.obter(RepositorioCreditosDoReclamante.class, creditoDoReclamanteP.getId());
        ArrayList<Item> itensCreditoDoReclamante = new ArrayList<Item>();
        HelperDate dataInicialParaLiquidacaoMaisUm = this.calculo.getDataDeLiquidacao().equals(creditoDoReclamante.getAtualizacao().getDataDeLiquidacao()) || HelperDate.dateEquals(creditoDoReclamante.getDataInicialPeriodo(), creditoDoReclamante.getDataFinalPeriodo()) ? HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()) : HelperDate.getInstance(creditoDoReclamante.getDataInicialPeriodo()).addDay(1);
        BigDecimal fatorConversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(creditoDoReclamante.getDataInicialPeriodo(), creditoDoReclamante.getDataFinalPeriodo());
        if (PagamentoUtils.verificaSeExisteValorPrincipalParaCreditoDeReclamante(this.calculo).booleanValue()) {
            item = new Item("Principal Corrigido", null, null, creditoDoReclamante.getValorPrincipal(), BigDecimal.ZERO.compareTo(creditoDoReclamante.getValorPrincipal()) > 0 ? fatorConversaoMoeda : Utils.arredondarValor(creditoDoReclamante.getIndiceDeCorrecao(), 9), creditoDoReclamante.getDevidoPrincipal(), creditoDoReclamante.getPagoPrincipal(), creditoDoReclamante.getDiferencaPrincipal());
            itensCreditoDoReclamante.add(item);
            item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(creditoDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(creditoDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, creditoDoReclamante.getJuroPrincipal(), BigDecimal.ZERO.compareTo(creditoDoReclamante.getJuroPrincipal()) > 0 ? fatorConversaoMoeda : Utils.arredondarValor(creditoDoReclamante.getIndiceDeCorrecao(), 9), creditoDoReclamante.getDevidoJuroDeMoraPrincipal(), creditoDoReclamante.getPagoJuroDeMoraPrincipal(), creditoDoReclamante.getDiferencaJuroDeMoraPrincipal());
            itensCreditoDoReclamante.add(item);
            item = new Item(JUROS_DE_MORA_DE + dataInicialParaLiquidacaoMaisUm.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), creditoDoReclamante.getBaseJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamante.getTaxaDeJuros(), null, null, creditoDoReclamante.getDevidoJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamante.getPagoJuroDeMoraPrincipalPeriodoAtual(), creditoDoReclamante.getDiferencaJuroDeMoraPrincipalPeriodoAtual());
            itensCreditoDoReclamante.add(item);
        }
        if (PagamentoUtils.verificaSeExisteFgtsParaCreditoDeReclamante(this.calculo).booleanValue()) {
            item = new Item("FGTS", null, null, creditoDoReclamante.getValorFgts(), BigDecimal.ZERO.compareTo(creditoDoReclamante.getValorFgts()) > 0 ? fatorConversaoMoeda : Utils.arredondarValor(creditoDoReclamante.getIndiceDeCorrecaoFgts(), 9), creditoDoReclamante.getDevidoFgts(), creditoDoReclamante.getPagoFgts(), creditoDoReclamante.getDiferencaFgts());
            itensCreditoDoReclamante.add(item);
            item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(creditoDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(creditoDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, creditoDoReclamante.getJuroFgts(), BigDecimal.ZERO.compareTo(creditoDoReclamante.getJuroFgts()) > 0 ? fatorConversaoMoeda : Utils.arredondarValor(creditoDoReclamante.getIndiceDeCorrecaoFgts(), 9), creditoDoReclamante.getDevidoJuroDeMoraFgts(), creditoDoReclamante.getPagoJuroDeMoraFgts(), creditoDoReclamante.getDiferencaJuroDeMoraFgts());
            itensCreditoDoReclamante.add(item);
            item = new Item(JUROS_DE_MORA_DE + dataInicialParaLiquidacaoMaisUm.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), BigDecimal.ZERO.compareTo(creditoDoReclamante.getDevidoFgts()) > 0 ? BigDecimal.ZERO : creditoDoReclamante.getDevidoFgts(), creditoDoReclamante.getTaxaDeJurosFgts(), null, null, creditoDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual(), creditoDoReclamante.getPagoJuroDeMoraFgtsPeriodoAtual(), creditoDoReclamante.getDiferencaJuroDeMoraFgtsPeriodoAtual());
            itensCreditoDoReclamante.add(item);
        }
        this.montarMultasCalculadasCreditosDoReclamante(creditoDoReclamante, itensCreditoDoReclamante);
        this.montarMultasInformadasCreditosDoReclamante(primeiroProcessamento, creditoDoReclamante, itensCreditoDoReclamante, dataInicialParaLiquidacaoMaisUm);
        return itensCreditoDoReclamante;
    }

    private void montarMultasInformadasCreditosDoReclamante(boolean primeiroProcessamento, CreditosDoReclamante creditoDoReclamante, List<Item> itensCreditoDoReclamante, HelperDate dataInicialParaLiquidacaoMaisUm) {
        ArrayList<MultaDaAtualizacao> multasInformadasOrdenadas = new ArrayList<MultaDaAtualizacao>(creditoDoReclamante.getMultasInformadas());
        Collections.sort(multasInformadasOrdenadas);
        BigDecimal fatorConversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(creditoDoReclamante.getDataInicialPeriodo(), creditoDoReclamante.getDataFinalPeriodo());
        for (MultaDaAtualizacao multaInformada : multasInformadasOrdenadas) {
            Date dataInicialDeAte;
            BigDecimal diferencaMulta = BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? multaInformada.getValorMulta() : Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao());
            diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(diferencaMulta, multaInformada.getPagoMulta()));
            Item item = new Item(multaInformada.getMulta().getDescricao() + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PELO_RECLAMANTE : "") + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PELO_RECLAMADO : "") + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaInformada.getMulta().getNomeTerceiro() : "") + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaInformada.getMulta().getNomeTerceiro() : ""), null, null, multaInformada.getValorMulta(), BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? fatorConversaoMoeda : Utils.arredondarValor(multaInformada.getIndiceDeCorrecao(), 9), BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? multaInformada.getValorMulta() : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())), multaInformada.getPagoMulta(), diferencaMulta);
            itensCreditoDoReclamante.add(item);
            boolean exibeJurosAnteriores = this.verificaSeMultaExibeJurosAnteriores(multaInformada, creditoDoReclamante.getDataInicialPeriodo(), creditoDoReclamante.getDataFinalPeriodo(), primeiroProcessamento);
            if (exibeJurosAnteriores) {
                BigDecimal devido = BigDecimal.ZERO.compareTo(multaInformada.getValorJuros()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? multaInformada.getValorJuros() : Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
                BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaInformada.getPagoJuro()));
                item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(creditoDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(creditoDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, Utils.arredondarValorMonetario(multaInformada.getValorJuros()), BigDecimal.ZERO.compareTo(multaInformada.getValorJuros()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor()) ? fatorConversaoMoeda : Utils.arredondarValor(multaInformada.getIndiceDeCorrecao(), 9), devido, multaInformada.getPagoJuro(), diferencaJuro);
                itensCreditoDoReclamante.add(item);
            }
            if (!Utils.naoNulo(dataInicialDeAte = this.verificaSeMultaExibeJurosDeAte(multaInformada, creditoDoReclamante.getDataInicialPeriodo(), creditoDoReclamante.getDataFinalPeriodo(), dataInicialParaLiquidacaoMaisUm.getDate(), primeiroProcessamento))) continue;
            BigDecimal taxaDeJurosMulta = multaInformada.getTaxaJurosMulta() != null ? multaInformada.getTaxaJurosMulta() : creditoDoReclamante.getTaxaDeJuros();
            BigDecimal base = Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()));
            if (!multaInformada.getMulta().getAplicarJurosSobreMulta().booleanValue() || BigDecimal.ZERO.compareTo(base) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaInformada.getMulta().getTipoCredorDevedor())) {
                base = BigDecimal.ZERO;
            }
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosMulta.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaInformada.getPagoJuroPeriodoAtual()));
            HelperDate dataInicio = HelperDate.getInstance(dataInicialDeAte);
            item = new Item(JUROS_DE_MORA_DE + dataInicio.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(creditoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), base, taxaDeJurosMulta, null, null, dev, multaInformada.getPagoJuroPeriodoAtual(), diferencaJuroAtual);
            itensCreditoDoReclamante.add(item);
        }
    }

    private void montarMultasCalculadasCreditosDoReclamante(CreditosDoReclamante creditoDoReclamante, List<Item> itensCreditoDoReclamante) {
        ArrayList<MultaDaAtualizacao> multasCalculadasOrdenadas = new ArrayList<MultaDaAtualizacao>(creditoDoReclamante.getMultasCalculadas());
        Collections.sort(multasCalculadasOrdenadas);
        BigDecimal fatorConversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(creditoDoReclamante.getDataInicialPeriodo(), creditoDoReclamante.getDataFinalPeriodo());
        for (MultaDaAtualizacao multaCalculada : multasCalculadasOrdenadas) {
            Item item;
            if (multaCalculada.getValorRemanescenteMulta() == null || creditoDoReclamante.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && creditoDoReclamante.getDataInicialPeriodo().equals(creditoDoReclamante.getDataFinalPeriodo()) || creditoDoReclamante.getDataInicialPeriodo().equals(creditoDoReclamante.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_AO_RECLAMADO : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_AO_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : ""), multaCalculada.getValorMulta(), multaCalculada.getMulta().getAliquotaMulta(), null, null, multaCalculada.getDevidoCalculada(), multaCalculada.getPagoMulta(), multaCalculada.getDiferencaCalculadaCreditosDoReclamante());
                itensCreditoDoReclamante.add(item);
                continue;
            }
            item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_AO_RECLAMADO : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_AO_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + REMANESCENTE, null, null, multaCalculada.getValorMulta(), BigDecimal.ZERO.compareTo(multaCalculada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaCalculada.getMulta().getTipoCredorDevedor()) ? fatorConversaoMoeda : Utils.arredondarValor(multaCalculada.getIndiceDeCorrecao(), 9), BigDecimal.ZERO.compareTo(multaCalculada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaCalculada.getMulta().getTipoCredorDevedor()) ? multaCalculada.getValorMulta() : multaCalculada.getDevidoCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), multaCalculada.getPagoMulta(), multaCalculada.getDiferencaCalculadaRemanescente(BigDecimal.ZERO.compareTo(multaCalculada.getValorMulta()) > 0 && CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multaCalculada.getMulta().getTipoCredorDevedor()) ? BigDecimal.ONE : multaCalculada.getIndiceDeCorrecao()));
            itensCreditoDoReclamante.add(item);
            if (multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA)) continue;
            item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_AO_RECLAMADO : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_AO_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + SOBRE_JUROS_DO_PERIODO, multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? creditoDoReclamante.getBaseMultaCalculadaSobreJurosDoPeriodo().negate() : creditoDoReclamante.getBaseMultaCalculadaSobreJurosDoPeriodo(), multaCalculada.getMulta().getAliquotaMulta(), null, null, multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? creditoDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)).negate() : creditoDoReclamante.getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)), multaCalculada.getPagoJuro(), multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? creditoDoReclamante.getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM), multaCalculada.getPagoJuro().negate()).negate() : creditoDoReclamante.getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM), multaCalculada.getPagoJuro()));
            itensCreditoDoReclamante.add(item);
        }
    }

    public List<Item> montarItensDebitosDoReclamante(DebitosDoReclamante debitosDoReclamanteP, boolean primeiroProcessamento) {
        Item item;
        DebitosDoReclamante debitoDoReclamante = (DebitosDoReclamante)EntidadeBase.obter(RepositorioDebitosDoReclamante.class, debitosDoReclamanteP.getId());
        ArrayList<Item> itensDebitosDoReclamante = new ArrayList<Item>();
        HelperDate dataInicialParaLiquidacaoMaisUm = this.calculo.getDataDeLiquidacao().equals(debitoDoReclamante.getAtualizacao().getDataDeLiquidacao()) || HelperDate.dateEquals(debitoDoReclamante.getDataInicialPeriodo(), debitoDoReclamante.getDataFinalPeriodo()) ? HelperDate.getInstance(debitoDoReclamante.getDataFinalPeriodo()) : HelperDate.getInstance(debitoDoReclamante.getDataInicialPeriodo()).addDay(1);
        this.montarDepositoDeFgtsDebitosDoReclamante(debitoDoReclamante, itensDebitosDoReclamante, dataInicialParaLiquidacaoMaisUm);
        if (PagamentoUtils.verificaSeExisteDescontoContribuicaoSocialReclamante(this.calculo).booleanValue()) {
            item = new Item("Desconto da Contribui\u00e7\u00e3o Social", null, null, debitoDoReclamante.getValorDescontoInss(), debitoDoReclamante.encontrarIndiceDeCorrecaoDoDescontoDoInss(), debitoDoReclamante.getDescontoInssCorrigido(), debitoDoReclamante.getPagoDescontoInss(), debitoDoReclamante.getDiferencaInss());
            itensDebitosDoReclamante.add(item);
        }
        if (PagamentoUtils.verificaSeExistePrevidenciaPrivada(this.calculo).booleanValue()) {
            item = new Item("Previd\u00eancia Privada", null, null, debitoDoReclamante.getValorPrevidenciaPrivada(), Utils.arredondarValor(debitoDoReclamante.getIndiceDeCorrecaoPrevPrivada(), 9), debitoDoReclamante.getPrevidenciaPrivadaCorrigido(), debitoDoReclamante.getPagoPrevidenciaPrivada(), debitoDoReclamante.getDiferencaPrevidenciaPrivada());
            itensDebitosDoReclamante.add(item);
        }
        this.montarPensaoAlimenticiaDebitosDoReclamante(debitoDoReclamante, itensDebitosDoReclamante);
        this.montarMultasCalculadasDebitosDoReclamante(debitoDoReclamante, itensDebitosDoReclamante);
        this.montarMultasInformadasDebitosDoReclamante(primeiroProcessamento, debitoDoReclamante, itensDebitosDoReclamante, dataInicialParaLiquidacaoMaisUm);
        this.montarHonorariosCalculadosDebitosDoReclamante(debitoDoReclamante, itensDebitosDoReclamante);
        this.montarHonorariosInformadosDebitosDoReclamante(primeiroProcessamento, debitoDoReclamante, itensDebitosDoReclamante, dataInicialParaLiquidacaoMaisUm);
        if (PagamentoUtils.verificaSeExisteImpostoParaReclamante(this.calculo).booleanValue()) {
            item = new Item("Imposto de Renda devido pelo Reclamante", null, null, null, null, debitoDoReclamante.getValorDevidoIrpf(), debitoDoReclamante.getValorPagoIrpf(), debitoDoReclamante.getDiferencaIrpf());
            itensDebitosDoReclamante.add(item);
        }
        if (PagamentoUtils.verificaSeExisteCustaDoReclamanteAPagar(this.calculo).booleanValue()) {
            item = new Item("Custas Judiciais devidas pelo Reclamante", null, null, null, null, debitoDoReclamante.getDevidoCustasJudiciais(), debitoDoReclamante.getPagoCustasJudiciais(), debitoDoReclamante.getDiferencaCustasJudiciais());
            itensDebitosDoReclamante.add(item);
        }
        return itensDebitosDoReclamante;
    }

    private void montarDepositoDeFgtsDebitosDoReclamante(DebitosDoReclamante debitoDoReclamante, List<Item> itensDebitosDoReclamante, HelperDate dataInicialParaLiquidacaoMaisUm) {
        if (debitoDoReclamante.getCalculo().getFgts().getDestinoDoFgts().equals((Object)DestinoDoFgtsEnum.DEPOSITAR) && PagamentoUtils.verificaSeExisteFgtsParaCreditoDeReclamante(this.calculo).booleanValue()) {
            Item item = new Item("Dep\u00f3sito de FGTS", null, null, debitoDoReclamante.getValorFgts(), Utils.arredondarValor(debitoDoReclamante.getIndiceDeCorrecaoFgts(), 9), debitoDoReclamante.getDevidoFgts(), debitoDoReclamante.getPagoFgts(), debitoDoReclamante.getDiferencaFgts());
            itensDebitosDoReclamante.add(item);
            if (BigDecimal.ZERO.compareTo(debitoDoReclamante.getValorFgts()) < 0) {
                item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(debitoDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(debitoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(debitoDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, debitoDoReclamante.getJuroFgts(), Utils.arredondarValor(debitoDoReclamante.getIndiceDeCorrecaoFgts(), 9), debitoDoReclamante.getDevidoJuroDeMoraFgts(), debitoDoReclamante.getPagoJuroDeMoraFgts(), debitoDoReclamante.getDiferencaJuroDeMoraFgts());
                itensDebitosDoReclamante.add(item);
                item = new Item(JUROS_DE_MORA_DE + dataInicialParaLiquidacaoMaisUm.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(debitoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), debitoDoReclamante.getDevidoFgts(), debitoDoReclamante.getTaxaDeJurosFgts(), null, null, debitoDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual(), debitoDoReclamante.getPagoJuroDeMoraFgtsPeriodoAtual(), debitoDoReclamante.getDiferencaJuroDeMoraFgtsPeriodoAtual());
                itensDebitosDoReclamante.add(item);
            }
        }
    }

    private void montarPensaoAlimenticiaDebitosDoReclamante(DebitosDoReclamante debitoDoReclamante, List<Item> itensDebitosDoReclamante) {
        if (PagamentoUtils.verificaSeExistePensaoAlimenticia(this.calculo).booleanValue() && (Utils.nulo(this.calculo.getPensaoAlimenticia().getDataEvento()) || Utils.naoNulo(this.calculo.getPensaoAlimenticia().getDataEvento()) && HelperDate.dateBeforeOrEquals(this.calculo.getPensaoAlimenticia().getDataEvento(), debitoDoReclamante.getDataFinalPeriodo()))) {
            if (debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getValorRemanescente() == null || debitoDoReclamante.getDataFinalPeriodo().equals(debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getDataEvento()) && debitoDoReclamante.getDataInicialPeriodo().equals(debitoDoReclamante.getDataFinalPeriodo()) || debitoDoReclamante.getDataFinalPeriodo().equals(debitoDoReclamante.getCalculo().getDataDeLiquidacao())) {
                Item item = new Item("Pens\u00e3o Aliment\u00edcia", debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getValorPensao(), debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getAliquota(), null, null, debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getDevidoPensao(), debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPagoPensao(), debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getDiferencaPensaoDevido());
                itensDebitosDoReclamante.add(item);
            } else {
                Item item = new Item("Pens\u00e3o Aliment\u00edcia - Remanescente", null, null, debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getValorPensao(), Utils.arredondarValor(debitoDoReclamante.getIndiceDeCorrecao(), 9), debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getDevidoCalculadaRemanescente(debitoDoReclamante.getIndiceDeCorrecao()), debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPagoPensao(), debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getDiferencaCalculadaRemanescente(debitoDoReclamante.getIndiceDeCorrecao()));
                itensDebitosDoReclamante.add(item);
                if (debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getIncidirSobreJuros().booleanValue()) {
                    BigDecimal percentualPrincipalPensao = debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPercentualPrincipal();
                    BigDecimal percentualFgtsPensao = debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPercentualFgts();
                    item = new Item("Pens\u00e3o Aliment\u00edcia - sobre juros do per\u00edodo", debitoDoReclamante.getCreditosDoReclamante().getBasePensaoSobreJurosDoPeriodo(percentualPrincipalPensao, percentualFgtsPensao), debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getAliquota(), null, null, debitoDoReclamante.getCreditosDoReclamante().getDevidoPensaoSobreJurosDoPeriodo(debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getAliquota().divide(Utils.CEM), percentualPrincipalPensao, percentualFgtsPensao), debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPagoJuro(), debitoDoReclamante.getCreditosDoReclamante().getDiferencaPensaoSobreJurosDoPeriodo(debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getAliquota().divide(Utils.CEM), debitoDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPagoJuro(), percentualPrincipalPensao, percentualFgtsPensao));
                    itensDebitosDoReclamante.add(item);
                }
            }
        }
    }

    private void montarMultasCalculadasDebitosDoReclamante(DebitosDoReclamante debitoDoReclamante, List<Item> itensDebitosDoReclamante) {
        ArrayList<MultaDaAtualizacao> multasCalculadasOrdenadas = new ArrayList<MultaDaAtualizacao>(debitoDoReclamante.getMultasCalculadas());
        Collections.sort(multasCalculadasOrdenadas);
        for (MultaDaAtualizacao multaCalculada : multasCalculadasOrdenadas) {
            Item item;
            if (multaCalculada.getValorRemanescenteMulta() == null || debitoDoReclamante.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && debitoDoReclamante.getDataInicialPeriodo().equals(debitoDoReclamante.getDataFinalPeriodo()) || debitoDoReclamante.getDataInicialPeriodo().equals(debitoDoReclamante.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PELO_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PARA_RECLAMADO : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : ""), multaCalculada.getValorMulta(), multaCalculada.getMulta().getAliquotaMulta(), null, null, multaCalculada.getDevidoCalculada(), multaCalculada.getPagoMulta(), multaCalculada.getDiferencaCalculadaOutros());
                itensDebitosDoReclamante.add(item);
                continue;
            }
            item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PELO_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PARA_RECLAMADO : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + REMANESCENTE, null, null, multaCalculada.getValorMulta(), Utils.arredondarValor(multaCalculada.getIndiceDeCorrecao(), 9), multaCalculada.getDevidoCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), multaCalculada.getPagoMulta(), multaCalculada.getDiferencaCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()));
            itensDebitosDoReclamante.add(item);
            if (multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA)) continue;
            item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PELO_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PARA_RECLAMADO : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + SOBRE_JUROS_DO_PERIODO, debitoDoReclamante.getCreditosDoReclamante().getBaseMultaCalculadaSobreJurosDoPeriodo(), multaCalculada.getMulta().getAliquotaMulta(), null, null, debitoDoReclamante.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)), multaCalculada.getPagoJuro(), debitoDoReclamante.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM), multaCalculada.getPagoJuro()));
            itensDebitosDoReclamante.add(item);
        }
    }

    private void montarMultasInformadasDebitosDoReclamante(boolean primeiroProcessamento, DebitosDoReclamante debitoDoReclamante, List<Item> itensDebitosDoReclamante, HelperDate dataInicialParaLiquidacaoMaisUm) {
        ArrayList<MultaDaAtualizacao> multasInformadasOrdenadas = new ArrayList<MultaDaAtualizacao>(debitoDoReclamante.getMultasInformadas());
        Collections.sort(multasInformadasOrdenadas);
        for (MultaDaAtualizacao multaInformada : multasInformadasOrdenadas) {
            Date dataInicialDeAte;
            BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()), multaInformada.getPagoMulta()));
            Item item = new Item(multaInformada.getMulta().getDescricao() + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PELO_RECLAMANTE : "") + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PARA_RECLAMADO : "") + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaInformada.getMulta().getNomeTerceiro() : "") + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaInformada.getMulta().getNomeTerceiro() : ""), null, null, multaInformada.getValorMulta(), Utils.arredondarValor(multaInformada.getIndiceDeCorrecao(), 9), Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())), multaInformada.getPagoMulta(), diferencaMulta);
            itensDebitosDoReclamante.add(item);
            boolean exibeJurosAnteriores = this.verificaSeMultaExibeJurosAnteriores(multaInformada, debitoDoReclamante.getDataInicialPeriodo(), debitoDoReclamante.getDataFinalPeriodo(), primeiroProcessamento);
            if (exibeJurosAnteriores) {
                BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
                BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaInformada.getPagoJuro()));
                item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(debitoDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(debitoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(debitoDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, Utils.arredondarValorMonetario(multaInformada.getValorJuros()), Utils.arredondarValor(multaInformada.getIndiceDeCorrecao(), 9), devido, multaInformada.getPagoJuro(), diferencaJuro);
                itensDebitosDoReclamante.add(item);
            }
            if (!Utils.naoNulo(dataInicialDeAte = this.verificaSeMultaExibeJurosDeAte(multaInformada, debitoDoReclamante.getDataInicialPeriodo(), debitoDoReclamante.getDataFinalPeriodo(), dataInicialParaLiquidacaoMaisUm.getDate(), primeiroProcessamento))) continue;
            BigDecimal taxaDeJurosMulta = multaInformada.getTaxaJurosMulta() != null ? multaInformada.getTaxaJurosMulta() : debitoDoReclamante.getTaxaDeJuros();
            BigDecimal base = multaInformada.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosMulta.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaInformada.getPagoJuroPeriodoAtual()));
            HelperDate dataInicio = HelperDate.getInstance(dataInicialDeAte);
            item = new Item(JUROS_DE_MORA_DE + dataInicio.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(debitoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), base, taxaDeJurosMulta, null, null, dev, multaInformada.getPagoJuroPeriodoAtual(), diferencaJuroAtual);
            itensDebitosDoReclamante.add(item);
        }
    }

    private void montarHonorariosCalculadosDebitosDoReclamante(DebitosDoReclamante debitoDoReclamante, List<Item> itensDebitosDoReclamante) {
        ArrayList<HonorarioDaAtualizacao> honorariosCalculadosOrdenados = new ArrayList<HonorarioDaAtualizacao>(debitoDoReclamante.getHonorariosDaAtualizacaoCalculado());
        Collections.sort(honorariosCalculadosOrdenados);
        for (HonorarioDaAtualizacao honorarioCalculado : honorariosCalculadosOrdenados) {
            Item item;
            if (honorarioCalculado.getValorRemanescenteHonorario() == null || debitoDoReclamante.getDataFinalPeriodo().equals(honorarioCalculado.getHonorario().getDataEvento()) && debitoDoReclamante.getDataInicialPeriodo().equals(debitoDoReclamante.getDataFinalPeriodo()) || debitoDoReclamante.getDataInicialPeriodo().equals(debitoDoReclamante.getCalculo().getDataDeLiquidacao()) && !honorarioCalculado.getJaCalculadoUmaVez().booleanValue()) {
                item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor(), honorarioCalculado.getValorHonorario(), honorarioCalculado.getHonorario().getAliquota(), null, null, honorarioCalculado.getDevidoCalculada(), honorarioCalculado.getPagoHonorario(), honorarioCalculado.getDiferencaCalculadaOutros());
                itensDebitosDoReclamante.add(item);
                continue;
            }
            item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor() + REMANESCENTE, null, null, honorarioCalculado.getValorHonorario(), Utils.arredondarValor(honorarioCalculado.getIndiceDeCorrecao(), 9), honorarioCalculado.getDevidoCalculadaRemanescente(honorarioCalculado.getIndiceDeCorrecao()), honorarioCalculado.getPagoHonorario(), honorarioCalculado.getDiferencaCalculadaRemanescente(honorarioCalculado.getIndiceDeCorrecao()));
            itensDebitosDoReclamante.add(item);
            item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor() + SOBRE_JUROS_DO_PERIODO, debitoDoReclamante.getCreditosDoReclamante().getBaseMultaCalculadaSobreJurosDoPeriodo(), honorarioCalculado.getHonorario().getAliquota(), null, null, debitoDoReclamante.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM)), honorarioCalculado.getPagoJuro(), debitoDoReclamante.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM), honorarioCalculado.getPagoJuro()));
            itensDebitosDoReclamante.add(item);
            if (debitoDoReclamante.getCreditosDoReclamante().getMultasCalculadas().isEmpty() && debitoDoReclamante.getCreditosDoReclamante().getMultasInformadas().isEmpty()) continue;
            item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor() + " - sobre Multas ", honorarioCalculado.calcularHonorariosSobreMultas(debitoDoReclamante.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota(), null, null, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioCalculado.calcularHonorariosSobreMultas(debitoDoReclamante.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM))), honorarioCalculado.getPagoSobreMultas(), Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioCalculado.calcularHonorariosSobreMultas(debitoDoReclamante.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM))), honorarioCalculado.getPagoSobreMultas()));
            itensDebitosDoReclamante.add(item);
        }
    }

    private void montarHonorariosInformadosDebitosDoReclamante(boolean primeiroProcessamento, DebitosDoReclamante debitoDoReclamante, List<Item> itensDebitosDoReclamante, HelperDate dataInicialParaLiquidacaoMaisUm) {
        ArrayList<HonorarioDaAtualizacao> honorariosInformadosOrdenados = new ArrayList<HonorarioDaAtualizacao>(debitoDoReclamante.getHonorariosDaAtualizacaoInformado());
        Collections.sort(honorariosInformadosOrdenados);
        for (HonorarioDaAtualizacao honorarioInformado : honorariosInformadosOrdenados) {
            Date dataInicialDeAte;
            BigDecimal diferencaHonorario = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao()), honorarioInformado.getPagoHonorario()));
            Item item = new Item(honorarioInformado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioInformado.getHonorario().getNomeCredor(), null, null, honorarioInformado.getValorHonorario(), Utils.arredondarValor(honorarioInformado.getIndiceDeCorrecao(), 9), Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())), honorarioInformado.getPagoHonorario(), diferencaHonorario);
            itensDebitosDoReclamante.add(item);
            boolean exibeJurosAnteriores = this.verificaSeHonorarioExibeJurosAnteriores(honorarioInformado, debitoDoReclamante.getDataInicialPeriodo(), debitoDoReclamante.getDataFinalPeriodo(), primeiroProcessamento);
            if (exibeJurosAnteriores) {
                BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), honorarioInformado.getIndiceDeCorrecao()));
                BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioInformado.getPagoJuro()));
                item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(debitoDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(debitoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(debitoDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, Utils.arredondarValorMonetario(honorarioInformado.getValorJuros()), Utils.arredondarValor(honorarioInformado.getIndiceDeCorrecao(), 9), devido, honorarioInformado.getPagoJuro(), diferencaJuro);
                itensDebitosDoReclamante.add(item);
            }
            if (!Utils.naoNulo(dataInicialDeAte = this.verificaSeHonorarioExibeJurosDeAte(honorarioInformado, debitoDoReclamante.getDataInicialPeriodo(), debitoDoReclamante.getDataFinalPeriodo(), dataInicialParaLiquidacaoMaisUm.getDate(), primeiroProcessamento))) continue;
            BigDecimal taxaDeJurosHonorario = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : debitoDoReclamante.getTaxaDeJuros();
            BigDecimal base = honorarioInformado.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosHonorario.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioInformado.getPagoJuroPeriodoAtual()));
            HelperDate dataInicio = HelperDate.getInstance(dataInicialDeAte);
            item = new Item(JUROS_DE_MORA_DE + dataInicio.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(debitoDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), base, taxaDeJurosHonorario, null, null, dev, honorarioInformado.getPagoJuroPeriodoAtual(), diferencaJuroAtual);
            itensDebitosDoReclamante.add(item);
        }
    }

    public List<Item> montarItensOutrosDebitosReclamado(OutrosDebitosReclamado outroDebitoReclamadoP, boolean primeiroProcessamento) {
        Item item;
        OutrosDebitosReclamado outroDebitoReclamado = (OutrosDebitosReclamado)EntidadeBase.obter(RepositorioOutrosDebitosDoReclamado.class, outroDebitoReclamadoP.getId());
        ArrayList<Item> itensOutrosDebitosReclamado = new ArrayList<Item>();
        HelperDate dataInicialParaLiquidacaoMaisUm = this.calculo.getDataDeLiquidacao().equals(outroDebitoReclamado.getAtualizacao().getDataDeLiquidacao()) || HelperDate.dateEquals(outroDebitoReclamado.getDataInicialPeriodo(), outroDebitoReclamado.getDataFinalPeriodo()) ? HelperDate.getInstance(outroDebitoReclamado.getDataFinalPeriodo()) : HelperDate.getInstance(outroDebitoReclamado.getDataInicialPeriodo()).addDay(1);
        this.montarPrevidenciasOutrosDebitosReclamado(outroDebitoReclamado, itensOutrosDebitosReclamado, dataInicialParaLiquidacaoMaisUm);
        this.montarMultasCalculadasOutrosDebitosReclamado(outroDebitoReclamado, itensOutrosDebitosReclamado);
        this.montarMultasInformadasOutrosDebitosReclamado(primeiroProcessamento, outroDebitoReclamado, itensOutrosDebitosReclamado, dataInicialParaLiquidacaoMaisUm);
        this.montarHonorariosCalculadosOutrosDebitosReclamado(outroDebitoReclamado, itensOutrosDebitosReclamado);
        this.montarHonorariosInformadosOutrosDebitosReclamado(primeiroProcessamento, outroDebitoReclamado, itensOutrosDebitosReclamado, dataInicialParaLiquidacaoMaisUm);
        if (PagamentoUtils.verificaSeExisteImpostoParaReclamado(this.calculo).booleanValue()) {
            item = new Item("Imposto de Renda do Reclamante - Cobrar do Reclamado", null, null, null, null, outroDebitoReclamado.getValorDevidoIrpf(), outroDebitoReclamado.getValorPagoIrpf(), outroDebitoReclamado.getDiferencaIrpf());
            itensOutrosDebitosReclamado.add(item);
        }
        if (PagamentoUtils.verificaSeExisteInssDezPorcento(this.calculo).booleanValue()) {
            item = new Item("Contribui\u00e7\u00e3o Social 10% - Lei Complementar 110/2001", null, null, outroDebitoReclamado.getValorInssDez(), Utils.arredondarValor(outroDebitoReclamado.getIndiceDeCorrecaoFgts(), 9), outroDebitoReclamado.getDevidoInssDez(), outroDebitoReclamado.getValorPagoInssDez(), outroDebitoReclamado.getDiferencaInssDez());
            itensOutrosDebitosReclamado.add(item);
        }
        if (PagamentoUtils.verificaSeExisteInssMeioPorcento(this.calculo).booleanValue()) {
            item = new Item("Contribui\u00e7\u00e3o Social 0,5% - Lei Complementar 110/2001", null, null, outroDebitoReclamado.getValorInssMeio(), Utils.arredondarValor(outroDebitoReclamado.getIndiceDeCorrecaoFgts(), 9), outroDebitoReclamado.getDevidoInssMeio(), outroDebitoReclamado.getValorPagoInssMeio(), outroDebitoReclamado.getDiferencaInssMeio());
            itensOutrosDebitosReclamado.add(item);
        }
        if (PagamentoUtils.verificaSeExisteCustaJudicialDoReclamado(this.calculo).booleanValue()) {
            item = new Item("Custas Judiciais devidas pelo Reclamado", null, null, null, null, outroDebitoReclamado.getDevidoCustasJudiciais(), outroDebitoReclamado.getPagoCustasJudiciais(), outroDebitoReclamado.getDiferencaCustasJudiciais());
            itensOutrosDebitosReclamado.add(item);
        }
        return itensOutrosDebitosReclamado;
    }

    private void montarPrevidenciasOutrosDebitosReclamado(OutrosDebitosReclamado outroDebitoReclamado, List<Item> itensOutrosDebitosReclamado, HelperDate dataInicialParaLiquidacaoMaisUm) {
        Item item;
        if (PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosDevidos(this.calculo).booleanValue()) {
            item = new Item("Contribui\u00e7\u00e3o Social sobre Sal\u00e1rios Devidos", null, null, null, null, outroDebitoReclamado.getDevidoContribuicaoSocialSalariosDevidos(), outroDebitoReclamado.getValorPagoInssSalariosDevidos(), outroDebitoReclamado.getDiferencaContribuicaoSocialSalariosDevidos());
            itensOutrosDebitosReclamado.add(item);
        }
        if (PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosPagos(this.calculo).booleanValue()) {
            item = new Item("Contribui\u00e7\u00e3o Social sobre Sal\u00e1rios Pagos ", null, null, null, null, outroDebitoReclamado.getDevidoContribuicaoSocialSalariosPagos(), outroDebitoReclamado.getValorPagoInssSalariosPagos(), outroDebitoReclamado.getDiferencaContribuicaoSocialSalariosPagos());
            itensOutrosDebitosReclamado.add(item);
        }
        if (PagamentoUtils.verificaSeExisteJurosDePrevidenciaPrivada(this.calculo).booleanValue()) {
            item = new Item("Juros de Previd\u00eancia Privada at\u00e9 " + (this.calculo.getDataDeLiquidacao().equals(outroDebitoReclamado.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(outroDebitoReclamado.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(outroDebitoReclamado.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, outroDebitoReclamado.getValorJurosDePrevidenciaPrivada(), Utils.arredondarValor(outroDebitoReclamado.getIndiceDeCorrecaoPrevPrivada(), 9), outroDebitoReclamado.getDevidoJurosDePrevidenciaPrivada(), outroDebitoReclamado.getValorPagoJurosDePrevidenciaPrivada(), outroDebitoReclamado.getDiferencaJurosDePrevidenciaPrivada());
            itensOutrosDebitosReclamado.add(item);
            if (outroDebitoReclamado.getValorPrevidenciaPrivada() != null && BigDecimal.ZERO.compareTo(outroDebitoReclamado.getValorPrevidenciaPrivada()) < 0) {
                item = new Item("Juros de Previd\u00eancia Privada de " + dataInicialParaLiquidacaoMaisUm.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(outroDebitoReclamado.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), outroDebitoReclamado.getBaseJurosDePrevidenciaPrivadaPeriodoAtual(), outroDebitoReclamado.getTaxaDeJuros(), null, null, outroDebitoReclamado.getDevidoJurosDePrevidenciaPrivadaPeriodoAtual(), outroDebitoReclamado.getValorPagoJurosDePrevidenciaPrivadaPeriodoAtual(), outroDebitoReclamado.getDiferencaJurosDePrevidenciaPrivadaPeriodoAtual());
                itensOutrosDebitosReclamado.add(item);
            }
        }
    }

    private void montarMultasCalculadasOutrosDebitosReclamado(OutrosDebitosReclamado outroDebitoReclamado, List<Item> itensOutrosDebitosReclamado) {
        ArrayList<MultaDaAtualizacao> multasCalculadosOrdenadas = new ArrayList<MultaDaAtualizacao>(outroDebitoReclamado.getMultasCalculadas());
        Collections.sort(multasCalculadosOrdenadas);
        for (MultaDaAtualizacao multaCalculada : multasCalculadosOrdenadas) {
            Item item;
            if (multaCalculada.getValorRemanescenteMulta() == null || outroDebitoReclamado.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && outroDebitoReclamado.getDataInicialPeriodo().equals(outroDebitoReclamado.getDataFinalPeriodo()) || outroDebitoReclamado.getDataInicialPeriodo().equals(outroDebitoReclamado.getCalculo().getDataDeLiquidacao()) && !multaCalculada.getJaCalculadoUmaVez().booleanValue()) {
                item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PARA_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PELO_RECLAMADO : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : ""), multaCalculada.getValorMulta(), multaCalculada.getMulta().getAliquotaMulta(), null, null, multaCalculada.getDevidoCalculada(), multaCalculada.getPagoMulta(), multaCalculada.getDiferencaCalculadaOutros());
                itensOutrosDebitosReclamado.add(item);
                continue;
            }
            item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PARA_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PELO_RECLAMADO : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + REMANESCENTE, null, null, multaCalculada.getValorMulta(), Utils.arredondarValor(multaCalculada.getIndiceDeCorrecao(), 9), multaCalculada.getDevidoCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), multaCalculada.getPagoMulta(), multaCalculada.getDiferencaCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()));
            itensOutrosDebitosReclamado.add(item);
            if (multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA)) continue;
            item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PARA_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PELO_RECLAMADO : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro() : "") + SOBRE_JUROS_DO_PERIODO, outroDebitoReclamado.getCreditosDoReclamante().getBaseMultaCalculadaSobreJurosDoPeriodo(), multaCalculada.getMulta().getAliquotaMulta(), null, null, outroDebitoReclamado.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)), multaCalculada.getPagoJuro(), outroDebitoReclamado.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM), multaCalculada.getPagoJuro()));
            itensOutrosDebitosReclamado.add(item);
        }
    }

    private void montarMultasInformadasOutrosDebitosReclamado(boolean primeiroProcessamento, OutrosDebitosReclamado outroDebitoReclamado, List<Item> itensOutrosDebitosReclamado, HelperDate dataInicialParaLiquidacaoMaisUm) {
        ArrayList<MultaDaAtualizacao> multasInformadasOrdenadas = new ArrayList<MultaDaAtualizacao>(outroDebitoReclamado.getMultasInformadas());
        Collections.sort(multasInformadasOrdenadas);
        for (MultaDaAtualizacao multaInformada : multasInformadasOrdenadas) {
            Date dataInicialDeAte;
            BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()), multaInformada.getPagoMulta()));
            Item item = new Item(multaInformada.getMulta().getDescricao() + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PARA_RECLAMANTE : "") + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PELO_RECLAMADO : "") + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO) ? DEVIDA_PARA + multaInformada.getMulta().getNomeTerceiro() : "") + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) ? DEVIDA_PARA + multaInformada.getMulta().getNomeTerceiro() : ""), null, null, multaInformada.getValorMulta(), Utils.arredondarValor(multaInformada.getIndiceDeCorrecao(), 9), Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())), multaInformada.getPagoMulta(), diferencaMulta);
            itensOutrosDebitosReclamado.add(item);
            boolean exibeJurosAnteriores = this.verificaSeMultaExibeJurosAnteriores(multaInformada, outroDebitoReclamado.getDataInicialPeriodo(), outroDebitoReclamado.getDataFinalPeriodo(), primeiroProcessamento);
            if (exibeJurosAnteriores) {
                BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
                BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaInformada.getPagoJuro()));
                item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(outroDebitoReclamado.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(outroDebitoReclamado.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(outroDebitoReclamado.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, Utils.arredondarValorMonetario(multaInformada.getValorJuros()), Utils.arredondarValor(multaInformada.getIndiceDeCorrecao(), 9), devido, multaInformada.getPagoJuro(), diferencaJuro);
                itensOutrosDebitosReclamado.add(item);
            }
            if (!Utils.naoNulo(dataInicialDeAte = this.verificaSeMultaExibeJurosDeAte(multaInformada, outroDebitoReclamado.getDataInicialPeriodo(), outroDebitoReclamado.getDataFinalPeriodo(), dataInicialParaLiquidacaoMaisUm.getDate(), primeiroProcessamento))) continue;
            BigDecimal taxaDeJurosMulta = multaInformada.getTaxaJurosMulta() != null ? multaInformada.getTaxaJurosMulta() : outroDebitoReclamado.getTaxaDeJuros();
            BigDecimal base = multaInformada.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosMulta.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaInformada.getPagoJuroPeriodoAtual()));
            HelperDate dataInicio = HelperDate.getInstance(dataInicialDeAte);
            item = new Item(JUROS_DE_MORA_DE + dataInicio.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(outroDebitoReclamado.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), base, taxaDeJurosMulta, null, null, dev, multaInformada.getPagoJuroPeriodoAtual(), diferencaJuroAtual);
            itensOutrosDebitosReclamado.add(item);
        }
    }

    private void montarHonorariosCalculadosOutrosDebitosReclamado(OutrosDebitosReclamado outroDebitoReclamado, List<Item> itensOutrosDebitosReclamado) {
        ArrayList<HonorarioDaAtualizacao> honorariosCalculadosOrdenados = new ArrayList<HonorarioDaAtualizacao>(outroDebitoReclamado.getHonorariosDaAtualizacaoCalculado());
        Collections.sort(honorariosCalculadosOrdenados);
        for (HonorarioDaAtualizacao honorarioCalculado : honorariosCalculadosOrdenados) {
            Item item;
            if (honorarioCalculado.getValorRemanescenteHonorario() == null || outroDebitoReclamado.getDataFinalPeriodo().equals(honorarioCalculado.getHonorario().getDataEvento()) && outroDebitoReclamado.getDataInicialPeriodo().equals(outroDebitoReclamado.getDataFinalPeriodo()) || outroDebitoReclamado.getDataInicialPeriodo().equals(outroDebitoReclamado.getCalculo().getDataDeLiquidacao()) && !honorarioCalculado.getJaCalculadoUmaVez().booleanValue()) {
                item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor(), honorarioCalculado.getValorHonorario(), honorarioCalculado.getHonorario().getAliquota(), null, null, honorarioCalculado.getDevidoCalculada(), honorarioCalculado.getPagoHonorario(), honorarioCalculado.getDiferencaCalculadaOutros());
                itensOutrosDebitosReclamado.add(item);
                continue;
            }
            item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor() + REMANESCENTE, null, null, honorarioCalculado.getValorHonorario(), Utils.arredondarValor(honorarioCalculado.getIndiceDeCorrecao(), 9), honorarioCalculado.getDevidoCalculadaRemanescente(honorarioCalculado.getIndiceDeCorrecao()), honorarioCalculado.getPagoHonorario(), honorarioCalculado.getDiferencaCalculadaRemanescente(honorarioCalculado.getIndiceDeCorrecao()));
            itensOutrosDebitosReclamado.add(item);
            item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor() + " - sobre juros do per\u00edodo", outroDebitoReclamado.getCreditosDoReclamante().getBaseMultaCalculadaSobreJurosDoPeriodo(), honorarioCalculado.getHonorario().getAliquota(), null, null, outroDebitoReclamado.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM)), honorarioCalculado.getPagoJuro(), outroDebitoReclamado.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM), honorarioCalculado.getPagoJuro()));
            itensOutrosDebitosReclamado.add(item);
            if (outroDebitoReclamado.getCreditosDoReclamante().getMultasCalculadas().isEmpty() && outroDebitoReclamado.getCreditosDoReclamante().getMultasInformadas().isEmpty()) continue;
            item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor() + " - sobre Multas", honorarioCalculado.calcularHonorariosSobreMultas(outroDebitoReclamado.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota(), null, null, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioCalculado.calcularHonorariosSobreMultas(outroDebitoReclamado.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM))), honorarioCalculado.getPagoSobreMultas(), Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioCalculado.calcularHonorariosSobreMultas(outroDebitoReclamado.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM))), honorarioCalculado.getPagoSobreMultas()));
            itensOutrosDebitosReclamado.add(item);
        }
    }

    private void montarHonorariosInformadosOutrosDebitosReclamado(boolean primeiroProcessamento, OutrosDebitosReclamado outroDebitoReclamado, List<Item> itensOutrosDebitosReclamado, HelperDate dataInicialParaLiquidacaoMaisUm) {
        ArrayList<HonorarioDaAtualizacao> honorariosInformadosOrdenados = new ArrayList<HonorarioDaAtualizacao>(outroDebitoReclamado.getHonorariosDaAtualizacaoInformado());
        Collections.sort(honorariosInformadosOrdenados);
        for (HonorarioDaAtualizacao honorarioInformado : honorariosInformadosOrdenados) {
            Date dataInicialDeAte;
            BigDecimal diferencaHonorario = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao()), honorarioInformado.getPagoHonorario()));
            Item item = new Item(honorarioInformado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioInformado.getHonorario().getNomeCredor(), null, null, honorarioInformado.getValorHonorario(), Utils.arredondarValor(honorarioInformado.getIndiceDeCorrecao(), 9), Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())), honorarioInformado.getPagoHonorario(), diferencaHonorario);
            itensOutrosDebitosReclamado.add(item);
            boolean exibeJurosAnteriores = this.verificaSeHonorarioExibeJurosAnteriores(honorarioInformado, outroDebitoReclamado.getDataInicialPeriodo(), outroDebitoReclamado.getDataFinalPeriodo(), primeiroProcessamento);
            if (exibeJurosAnteriores) {
                BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), honorarioInformado.getIndiceDeCorrecao()));
                BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioInformado.getPagoJuro()));
                item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(outroDebitoReclamado.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(outroDebitoReclamado.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(outroDebitoReclamado.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, Utils.arredondarValorMonetario(honorarioInformado.getValorJuros()), Utils.arredondarValor(honorarioInformado.getIndiceDeCorrecao(), 9), devido, honorarioInformado.getPagoJuro(), diferencaJuro);
                itensOutrosDebitosReclamado.add(item);
            }
            if (!Utils.naoNulo(dataInicialDeAte = this.verificaSeHonorarioExibeJurosDeAte(honorarioInformado, outroDebitoReclamado.getDataInicialPeriodo(), outroDebitoReclamado.getDataFinalPeriodo(), dataInicialParaLiquidacaoMaisUm.getDate(), primeiroProcessamento))) continue;
            BigDecimal taxaDeJurosHonorario = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : outroDebitoReclamado.getTaxaDeJuros();
            BigDecimal base = honorarioInformado.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosHonorario.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioInformado.getPagoJuroPeriodoAtual()));
            HelperDate dataInicio = HelperDate.getInstance(dataInicialDeAte);
            item = new Item(JUROS_DE_MORA_DE + dataInicio.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(outroDebitoReclamado.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), base, taxaDeJurosHonorario, null, null, dev, honorarioInformado.getPagoJuroPeriodoAtual(), diferencaJuroAtual);
            itensOutrosDebitosReclamado.add(item);
        }
    }

    public List<Item> montarItensDebitosCobrarDoReclamante(DebitosCobrarDoReclamante debitosCobrarDoReclamanteP, boolean primeiroProcessamento) {
        DebitosCobrarDoReclamante debitoCobrarDoReclamante = (DebitosCobrarDoReclamante)EntidadeBase.obter(RepositorioDebitosCobrarDoReclamante.class, debitosCobrarDoReclamanteP.getId());
        ArrayList<Item> itensDebitosCobrarDoReclamante = new ArrayList<Item>();
        HelperDate dataInicialParaLiquidacaoMaisUm = debitoCobrarDoReclamante.getCalculo().getDataDeLiquidacao().equals(debitoCobrarDoReclamante.getAtualizacao().getDataDeLiquidacao()) || HelperDate.dateEquals(debitoCobrarDoReclamante.getDataInicialPeriodo(), debitoCobrarDoReclamante.getDataFinalPeriodo()) ? HelperDate.getInstance(debitoCobrarDoReclamante.getDataFinalPeriodo()) : HelperDate.getInstance(debitoCobrarDoReclamante.getDataInicialPeriodo()).addDay(1);
        this.montarMultasCalculadasDebitosCobrarDoReclamante(debitoCobrarDoReclamante, itensDebitosCobrarDoReclamante);
        this.montarMultasInformadasDebitosCobrarDoReclamante(primeiroProcessamento, debitoCobrarDoReclamante, itensDebitosCobrarDoReclamante, dataInicialParaLiquidacaoMaisUm);
        this.montarHonorariosCalculadosDebitosCobrarDoReclamante(debitoCobrarDoReclamante, itensDebitosCobrarDoReclamante);
        this.montarHonorariosInformadosDebitosCobrarDoReclamante(primeiroProcessamento, debitoCobrarDoReclamante, itensDebitosCobrarDoReclamante, dataInicialParaLiquidacaoMaisUm);
        if (PagamentoUtils.verificaSeExisteCustaACobrarDoReclamante(this.calculo).booleanValue()) {
            Item item = new Item("Custas Judiciais devidas pelo Reclamante", null, null, null, null, debitoCobrarDoReclamante.getDevidoCustasJudiciais(), debitoCobrarDoReclamante.getPagoCustasJudiciais(), debitoCobrarDoReclamante.getDiferencaCustasJudiciais());
            itensDebitosCobrarDoReclamante.add(item);
        }
        return itensDebitosCobrarDoReclamante;
    }

    private void montarMultasCalculadasDebitosCobrarDoReclamante(DebitosCobrarDoReclamante debitoCobrarDoReclamante, List<Item> itensDebitosCobrarDoReclamante) {
        ArrayList<MultaDaAtualizacao> multasCalculadasOrdenadas = new ArrayList<MultaDaAtualizacao>(debitoCobrarDoReclamante.getMultasCalculadas());
        Collections.sort(multasCalculadasOrdenadas);
        for (MultaDaAtualizacao multaCalculada : multasCalculadasOrdenadas) {
            Item item;
            boolean isEventoNaLiquidacaoNaoCalculadoAnteriormente;
            boolean isPeriodoDeUmDiaNaDataDoEvento = debitoCobrarDoReclamante.getDataFinalPeriodo().equals(multaCalculada.getMulta().getDataEvento()) && debitoCobrarDoReclamante.getDataInicialPeriodo().equals(debitoCobrarDoReclamante.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = debitoCobrarDoReclamante.getDataInicialPeriodo().equals(debitoCobrarDoReclamante.getCalculo().getDataDeLiquidacao()) && multaCalculada.getJaCalculadoUmaVez() == false;
            if (multaCalculada.getValorRemanescenteMulta() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PELO_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PARA_RECLAMADO : DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro()), multaCalculada.getValorMulta(), multaCalculada.getMulta().getAliquotaMulta(), null, null, multaCalculada.getDevidoCalculada(), multaCalculada.getPagoMulta(), multaCalculada.getDiferencaCalculadaOutros());
                itensDebitosCobrarDoReclamante.add(item);
                continue;
            }
            item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PELO_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PARA_RECLAMADO : DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro()) + REMANESCENTE, null, null, multaCalculada.getValorMulta(), Utils.arredondarValor(multaCalculada.getIndiceDeCorrecao(), 9), multaCalculada.getDevidoCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()), multaCalculada.getPagoMulta(), multaCalculada.getDiferencaCalculadaRemanescente(multaCalculada.getIndiceDeCorrecao()));
            itensDebitosCobrarDoReclamante.add(item);
            if (multaCalculada.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA)) continue;
            item = new Item(multaCalculada.getMulta().getDescricao() + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PELO_RECLAMANTE : "") + (multaCalculada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PARA_RECLAMADO : DEVIDA_PARA + multaCalculada.getMulta().getNomeTerceiro()) + SOBRE_JUROS_DO_PERIODO, debitoCobrarDoReclamante.getCreditosDoReclamante().getBaseMultaCalculadaSobreJurosDoPeriodo(), multaCalculada.getMulta().getAliquotaMulta(), null, null, debitoCobrarDoReclamante.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM)), multaCalculada.getPagoJuro(), debitoCobrarDoReclamante.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaCalculada.getMulta().getAliquotaMulta().divide(Utils.CEM), multaCalculada.getPagoJuro()));
            itensDebitosCobrarDoReclamante.add(item);
        }
    }

    private void montarMultasInformadasDebitosCobrarDoReclamante(boolean primeiroProcessamento, DebitosCobrarDoReclamante debitoCobrarDoReclamante, List<Item> itensDebitosCobrarDoReclamante, HelperDate dataInicialParaLiquidacaoMaisUm) {
        ArrayList<MultaDaAtualizacao> multasInformadasOrdenadas = new ArrayList<MultaDaAtualizacao>(debitoCobrarDoReclamante.getMultasInformadas());
        Collections.sort(multasInformadasOrdenadas);
        for (MultaDaAtualizacao multaInformada : multasInformadasOrdenadas) {
            Date dataInicialDeAte;
            BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()), multaInformada.getPagoMulta()));
            Item item = new Item(multaInformada.getMulta().getDescricao() + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE) ? DEVIDA_PELO_RECLAMANTE : "") + (multaInformada.getMulta().getTipoCredorDevedor().equals((Object)CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO) ? DEVIDA_PARA_RECLAMADO : DEVIDA_PARA + multaInformada.getMulta().getNomeTerceiro()), null, null, multaInformada.getValorMulta(), Utils.arredondarValor(multaInformada.getIndiceDeCorrecao(), 9), Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())), multaInformada.getPagoMulta(), diferencaMulta);
            itensDebitosCobrarDoReclamante.add(item);
            boolean exibeJurosAnteriores = this.verificaSeMultaExibeJurosAnteriores(multaInformada, debitoCobrarDoReclamante.getDataInicialPeriodo(), debitoCobrarDoReclamante.getDataFinalPeriodo(), primeiroProcessamento);
            if (exibeJurosAnteriores) {
                BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao()));
                BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaInformada.getPagoJuro()));
                item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(debitoCobrarDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(debitoCobrarDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(debitoCobrarDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, Utils.arredondarValorMonetario(multaInformada.getValorJuros()), Utils.arredondarValor(multaInformada.getIndiceDeCorrecao(), 9), devido, multaInformada.getPagoJuro(), diferencaJuro);
                itensDebitosCobrarDoReclamante.add(item);
            }
            if (!Utils.naoNulo(dataInicialDeAte = this.verificaSeMultaExibeJurosDeAte(multaInformada, debitoCobrarDoReclamante.getDataInicialPeriodo(), debitoCobrarDoReclamante.getDataFinalPeriodo(), dataInicialParaLiquidacaoMaisUm.getDate(), primeiroProcessamento))) continue;
            BigDecimal taxaDeJurosMulta = multaInformada.getTaxaJurosMulta() != null ? multaInformada.getTaxaJurosMulta() : debitoCobrarDoReclamante.getTaxaDeJuros();
            BigDecimal base = multaInformada.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosMulta.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaInformada.getPagoJuroPeriodoAtual()));
            HelperDate dataInicio = HelperDate.getInstance(dataInicialDeAte);
            item = new Item(JUROS_DE_MORA_DE + dataInicio.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(debitoCobrarDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), base, taxaDeJurosMulta, null, null, dev, multaInformada.getPagoJuroPeriodoAtual(), diferencaJuroAtual);
            itensDebitosCobrarDoReclamante.add(item);
        }
    }

    private void montarHonorariosCalculadosDebitosCobrarDoReclamante(DebitosCobrarDoReclamante debitoCobrarDoReclamante, List<Item> itensDebitosCobrarDoReclamante) {
        ArrayList<HonorarioDaAtualizacao> honorariosCalculadosOrdenados = new ArrayList<HonorarioDaAtualizacao>(debitoCobrarDoReclamante.getHonorariosDaAtualizacaoCalculado());
        Collections.sort(honorariosCalculadosOrdenados);
        for (HonorarioDaAtualizacao honorarioCalculado : honorariosCalculadosOrdenados) {
            boolean isBaseApuracaoDiferenteDeVerbasQueNaoCompoemOPrincipal;
            Item item;
            boolean isEventoNaLiquidacaoNaoCalculadoAnteriormente;
            boolean isPeriodoDeUmDiaNaDataDoEvento = debitoCobrarDoReclamante.getDataFinalPeriodo().equals(honorarioCalculado.getHonorario().getDataEvento()) && debitoCobrarDoReclamante.getDataInicialPeriodo().equals(debitoCobrarDoReclamante.getDataFinalPeriodo());
            boolean bl = isEventoNaLiquidacaoNaoCalculadoAnteriormente = debitoCobrarDoReclamante.getDataInicialPeriodo().equals(debitoCobrarDoReclamante.getCalculo().getDataDeLiquidacao()) && honorarioCalculado.getJaCalculadoUmaVez() == false;
            if (honorarioCalculado.getValorRemanescenteHonorario() == null || isPeriodoDeUmDiaNaDataDoEvento || isEventoNaLiquidacaoNaoCalculadoAnteriormente) {
                item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor(), honorarioCalculado.getValorHonorario(), honorarioCalculado.getHonorario().getAliquota(), null, null, honorarioCalculado.getDevidoCalculada(), honorarioCalculado.getPagoHonorario(), honorarioCalculado.getDiferencaCalculadaOutros());
                itensDebitosCobrarDoReclamante.add(item);
                continue;
            }
            item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor() + REMANESCENTE, null, null, honorarioCalculado.getValorHonorario(), Utils.arredondarValor(honorarioCalculado.getIndiceDeCorrecao(), 9), honorarioCalculado.getDevidoCalculadaRemanescente(honorarioCalculado.getIndiceDeCorrecao()), honorarioCalculado.getPagoHonorario(), honorarioCalculado.getDiferencaCalculadaRemanescente(honorarioCalculado.getIndiceDeCorrecao()));
            itensDebitosCobrarDoReclamante.add(item);
            boolean bl2 = isBaseApuracaoDiferenteDeVerbasQueNaoCompoemOPrincipal = !honorarioCalculado.getHonorario().getBaseParaApuracao().equals((Object)BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL);
            if (isBaseApuracaoDiferenteDeVerbasQueNaoCompoemOPrincipal) {
                item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor() + SOBRE_JUROS_DO_PERIODO, debitoCobrarDoReclamante.getCreditosDoReclamante().getBaseMultaCalculadaSobreJurosDoPeriodo(), honorarioCalculado.getHonorario().getAliquota(), null, null, debitoCobrarDoReclamante.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM)), honorarioCalculado.getPagoJuro(), debitoCobrarDoReclamante.getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM), honorarioCalculado.getPagoJuro()));
                itensDebitosCobrarDoReclamante.add(item);
            }
            if ((!isBaseApuracaoDiferenteDeVerbasQueNaoCompoemOPrincipal || debitoCobrarDoReclamante.getCreditosDoReclamante().getMultasCalculadas().isEmpty()) && debitoCobrarDoReclamante.getCreditosDoReclamante().getMultasInformadas().isEmpty()) continue;
            item = new Item(honorarioCalculado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioCalculado.getHonorario().getNomeCredor() + " - sobre Multas ", honorarioCalculado.calcularHonorariosSobreMultas(debitoCobrarDoReclamante.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota(), null, null, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioCalculado.calcularHonorariosSobreMultas(debitoCobrarDoReclamante.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM))), honorarioCalculado.getPagoSobreMultas(), Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioCalculado.calcularHonorariosSobreMultas(debitoCobrarDoReclamante.getCreditosDoReclamante()), honorarioCalculado.getHonorario().getAliquota().divide(Utils.CEM))), honorarioCalculado.getPagoSobreMultas()));
            itensDebitosCobrarDoReclamante.add(item);
        }
    }

    private void montarHonorariosInformadosDebitosCobrarDoReclamante(boolean primeiroProcessamento, DebitosCobrarDoReclamante debitoCobrarDoReclamante, List<Item> itensDebitosCobrarDoReclamante, HelperDate dataInicialParaLiquidacaoMaisUm) {
        ArrayList<HonorarioDaAtualizacao> honorariosInformadosOrdenados = new ArrayList<HonorarioDaAtualizacao>(debitoCobrarDoReclamante.getHonorariosDaAtualizacaoInformado());
        Collections.sort(honorariosInformadosOrdenados);
        for (HonorarioDaAtualizacao honorarioInformado : honorariosInformadosOrdenados) {
            Date dataInicialDeAte;
            BigDecimal diferencaHonorario = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao()), honorarioInformado.getPagoHonorario()));
            Item item = new Item(honorarioInformado.getHonorario().getDescricao() + DEVIDOS_PARA + honorarioInformado.getHonorario().getNomeCredor(), null, null, honorarioInformado.getValorHonorario(), Utils.arredondarValor(honorarioInformado.getIndiceDeCorrecao(), 9), Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())), honorarioInformado.getPagoHonorario(), diferencaHonorario);
            itensDebitosCobrarDoReclamante.add(item);
            boolean exibeJurosAnteriores = this.verificaSeHonorarioExibeJurosAnteriores(honorarioInformado, debitoCobrarDoReclamante.getDataInicialPeriodo(), debitoCobrarDoReclamante.getDataFinalPeriodo(), primeiroProcessamento);
            if (exibeJurosAnteriores) {
                BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), honorarioInformado.getIndiceDeCorrecao()));
                BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioInformado.getPagoJuro()));
                item = new Item(JUROS_DE_MORA_ATE + (this.calculo.getDataDeLiquidacao().equals(debitoCobrarDoReclamante.getAtualizacao().getDataDeLiquidacao()) ? HelperDate.getInstance(debitoCobrarDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA) : HelperDate.getInstance(debitoCobrarDoReclamante.getDataInicialPeriodo()).format(FORMATO_PADRAO_DATA)), null, null, Utils.arredondarValorMonetario(honorarioInformado.getValorJuros()), Utils.arredondarValor(honorarioInformado.getIndiceDeCorrecao(), 9), devido, honorarioInformado.getPagoJuro(), diferencaJuro);
                itensDebitosCobrarDoReclamante.add(item);
            }
            if (!Utils.naoNulo(dataInicialDeAte = this.verificaSeHonorarioExibeJurosDeAte(honorarioInformado, debitoCobrarDoReclamante.getDataInicialPeriodo(), debitoCobrarDoReclamante.getDataFinalPeriodo(), dataInicialParaLiquidacaoMaisUm.getDate(), primeiroProcessamento))) continue;
            BigDecimal taxaDeJurosHonorario = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : debitoCobrarDoReclamante.getTaxaDeJuros();
            BigDecimal base = honorarioInformado.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosHonorario.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioInformado.getPagoJuroPeriodoAtual()));
            HelperDate dataInicio = HelperDate.getInstance(dataInicialDeAte);
            item = new Item(JUROS_DE_MORA_DE + dataInicio.format(FORMATO_PADRAO_DATA) + ATE + HelperDate.getInstance(debitoCobrarDoReclamante.getDataFinalPeriodo()).format(FORMATO_PADRAO_DATA), base, taxaDeJurosHonorario, null, null, dev, honorarioInformado.getPagoJuroPeriodoAtual(), diferencaJuroAtual);
            itensDebitosCobrarDoReclamante.add(item);
        }
    }

    private boolean verificaSeMultaExibeJurosAnteriores(MultaDaAtualizacao multaInformada, Date dataInicialPeriodo, Date dataFinalPeriodo, boolean primeiroProcessamento) {
        if (!multaInformada.getMulta().getAplicarJurosSobreMulta().booleanValue() || BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && !CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multaInformada.getMulta().getTipoCredorDevedor())) {
            return false;
        }
        Multa multa = multaInformada.getMulta();
        Calculo calculo = multa.getCalculo();
        Date dataAPartirDe = multa.getDataApartirDeAplicarJuros();
        Date dataEvento = multa.getDataEvento();
        return AtualizacaoUtils.testarExistenciaJurosAnteriores(new Periodo(dataInicialPeriodo, dataFinalPeriodo), multa.getOrigemRegistro(), calculo, dataAPartirDe, dataEvento, primeiroProcessamento);
    }

    private Date verificaSeMultaExibeJurosDeAte(MultaDaAtualizacao multaInformada, Date dataInicialPeriodo, Date dataFinalPeriodo, Date dataInicialParaLiquidacaoMaisUm, boolean primeiroProcessamento) {
        if (!multaInformada.getMulta().getAplicarJurosSobreMulta().booleanValue() || BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0 && !CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multaInformada.getMulta().getTipoCredorDevedor())) {
            return null;
        }
        Multa multa = multaInformada.getMulta();
        Calculo calculo = multa.getCalculo();
        Date dataAPartirDe = multa.getDataApartirDeAplicarJuros();
        Date dataEvento = multa.getDataEvento();
        return AtualizacaoUtils.testarExistenciaJurosDeAte(new Periodo(dataInicialPeriodo, dataFinalPeriodo), dataInicialParaLiquidacaoMaisUm, multa.getOrigemRegistro(), calculo, dataAPartirDe, dataEvento, primeiroProcessamento);
    }

    private boolean verificaSeHonorarioExibeJurosAnteriores(HonorarioDaAtualizacao honorarioInformado, Date dataInicialPeriodo, Date dataFinalPeriodo, boolean primeiroProcessamento) {
        if (!honorarioInformado.getHonorario().getAplicarJuros().booleanValue() || BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) > 0) {
            return false;
        }
        Honorario honorario = honorarioInformado.getHonorario();
        Calculo calculo = honorario.getCalculo();
        Date dataAPartirDe = honorario.getDataApartirDeAplicarJuros();
        Date dataEvento = honorario.getDataEvento();
        return AtualizacaoUtils.testarExistenciaJurosAnteriores(new Periodo(dataInicialPeriodo, dataFinalPeriodo), honorario.getOrigemRegistro(), calculo, dataAPartirDe, dataEvento, primeiroProcessamento);
    }

    private Date verificaSeHonorarioExibeJurosDeAte(HonorarioDaAtualizacao honorarioInformado, Date dataInicialPeriodo, Date dataFinalPeriodo, Date dataInicialParaLiquidacaoMaisUm, boolean primeiroProcessamento) {
        if (!honorarioInformado.getHonorario().getAplicarJuros().booleanValue() || BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) > 0) {
            return null;
        }
        Honorario honorario = honorarioInformado.getHonorario();
        Calculo calculo = honorario.getCalculo();
        Date dataAPartirDe = honorario.getDataApartirDeAplicarJuros();
        Date dataEvento = honorario.getDataEvento();
        return AtualizacaoUtils.testarExistenciaJurosDeAte(new Periodo(dataInicialPeriodo, dataFinalPeriodo), dataInicialParaLiquidacaoMaisUm, honorario.getOrigemRegistro(), calculo, dataAPartirDe, dataEvento, primeiroProcessamento);
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

    public class DemonstrativoAtualizacaoDoCalculoJRAdapterPadrao
    extends DemonstrativoAtualizacaoJRAdapter.DemonstrativoAtualizacaoAdapter {
        private CreditosDoReclamante creditoDoReclamante = null;
        private DebitosDoReclamante debitoDoReclamante = null;
        private OutrosDebitosReclamado outroDebitoReclamado = null;
        private DebitosCobrarDoReclamante debitoCobrarDoReclamante = null;

        @Override
        public JRAdapter adapt(Object adapted) {
            if (adapted instanceof CreditosDoReclamante) {
                this.creditoDoReclamante = (CreditosDoReclamante)adapted;
                this.debitoDoReclamante = null;
                this.outroDebitoReclamado = null;
                this.debitoCobrarDoReclamante = null;
            }
            if (adapted instanceof DebitosDoReclamante) {
                this.creditoDoReclamante = null;
                this.debitoDoReclamante = (DebitosDoReclamante)adapted;
                this.outroDebitoReclamado = null;
                this.debitoCobrarDoReclamante = null;
            }
            if (adapted instanceof OutrosDebitosReclamado) {
                this.creditoDoReclamante = null;
                this.debitoDoReclamante = null;
                this.outroDebitoReclamado = (OutrosDebitosReclamado)adapted;
                this.debitoCobrarDoReclamante = null;
            }
            if (adapted instanceof DebitosCobrarDoReclamante) {
                this.creditoDoReclamante = null;
                this.debitoDoReclamante = null;
                this.outroDebitoReclamado = null;
                this.debitoCobrarDoReclamante = (DebitosCobrarDoReclamante)adapted;
            }
            return this;
        }

        @Override
        public String getDescritivoDeEventos() {
            if (this.creditoDoReclamante != null) {
                return this.creditoDoReclamante.getDescritivoDeEventos();
            }
            return "";
        }

        @Override
        public String getCabecalho() {
            if (this.creditoDoReclamante != null) {
                return "Cr\u00e9ditos do Reclamante";
            }
            if (this.debitoDoReclamante != null) {
                return "Descontar dos Cr\u00e9ditos do Reclamante";
            }
            if (this.debitoCobrarDoReclamante != null) {
                return "D\u00e9bitos do Reclamante";
            }
            return "Outros D\u00e9bitos do Reclamado";
        }

        @Override
        public BigDecimal getTotalDevido() {
            if (this.creditoDoReclamante != null) {
                return this.creditoDoReclamante.getTotalDevido();
            }
            if (this.debitoDoReclamante != null) {
                return this.debitoDoReclamante.getTotalDevido();
            }
            if (this.outroDebitoReclamado != null) {
                return this.outroDebitoReclamado.getTotalDevido();
            }
            if (this.debitoCobrarDoReclamante != null) {
                return this.debitoCobrarDoReclamante.getTotalDevido();
            }
            return BigDecimal.ZERO;
        }

        @Override
        public BigDecimal getTotalPago() {
            if (this.creditoDoReclamante != null) {
                return this.creditoDoReclamante.getTotalPago();
            }
            if (this.debitoDoReclamante != null) {
                return this.debitoDoReclamante.getTotalPago();
            }
            if (this.outroDebitoReclamado != null) {
                return this.outroDebitoReclamado.getTotalPago();
            }
            if (this.debitoCobrarDoReclamante != null) {
                return this.debitoCobrarDoReclamante.getTotalPago();
            }
            return BigDecimal.ZERO;
        }

        @Override
        public BigDecimal getTotalDiferenca() {
            if (this.creditoDoReclamante != null) {
                return this.creditoDoReclamante.getTotalDiferenca();
            }
            if (this.debitoDoReclamante != null) {
                return this.debitoDoReclamante.getTotalDiferenca();
            }
            if (this.outroDebitoReclamado != null) {
                return this.outroDebitoReclamado.getTotalDiferenca();
            }
            if (this.debitoCobrarDoReclamante != null) {
                return this.debitoCobrarDoReclamante.getTotalDiferenca();
            }
            return BigDecimal.ZERO;
        }

        @Override
        public JRAdapterDataSource<DemonstrativoAtualizacaoJRAdapter.DemonstrativoItemAdapter> getItens() {
            if (this.creditoDoReclamante != null) {
                return new JRAdapterDataSource<DemonstrativoAtualizacaoJRAdapter.DemonstrativoItemAdapter>(new DemonstrativoItemJRAdapterPadrao(), (Collection)DemonstrativoAtualizacaoJRAdapterPadrao.this.mapaDeItens.get(this.creditoDoReclamante));
            }
            if (this.debitoDoReclamante != null) {
                return new JRAdapterDataSource<DemonstrativoAtualizacaoJRAdapter.DemonstrativoItemAdapter>(new DemonstrativoItemJRAdapterPadrao(), (Collection)DemonstrativoAtualizacaoJRAdapterPadrao.this.mapaDeItens.get(this.debitoDoReclamante));
            }
            if (this.debitoCobrarDoReclamante != null) {
                return new JRAdapterDataSource<DemonstrativoAtualizacaoJRAdapter.DemonstrativoItemAdapter>(new DemonstrativoItemJRAdapterPadrao(), (Collection)DemonstrativoAtualizacaoJRAdapterPadrao.this.mapaDeItens.get(this.debitoCobrarDoReclamante));
            }
            return new JRAdapterDataSource<DemonstrativoAtualizacaoJRAdapter.DemonstrativoItemAdapter>(new DemonstrativoItemJRAdapterPadrao(), (Collection)DemonstrativoAtualizacaoJRAdapterPadrao.this.mapaDeItens.get(this.outroDebitoReclamado));
        }
    }
}

