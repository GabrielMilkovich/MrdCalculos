/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDoPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDoPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class MaquinaDeRateioDoPagamento
implements Serializable {
    private static final long serialVersionUID = 7530043375705639253L;
    private static final int INDICE_MULTA = 7;
    private static final int INDICE_HONORARIO = 8;
    private Pagamento pagamento;
    private BigDecimal valorParaPagamentoCreditoReclamantePrincipal;
    private BigDecimal valorParaPagamentoCreditoReclamanteFgts;
    private BigDecimal valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante;
    private BigDecimal valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado;
    private BigDecimal proporcaoGeralParaRecolhimentosDebitosReclamante;
    private BigDecimal proporcaoMultasParaRecolhimentosDebitosReclamante;
    private BigDecimal proporcaoOutrosParaRecolhimentosDebitosReclamante;
    private BigDecimal valorParaRecolhimentoDebitosReclamanteCustasJudiciais;
    private BigDecimal valorParaRecolhimentoDebitosReclamanteDepositoDeFgts;
    private BigDecimal valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial;
    private BigDecimal valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada;
    private BigDecimal valorParaRecolhimentoDebitosReclamantePensaoAlimenticia;
    private BigDecimal valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante;
    private Map<Multa, BigDecimal> valoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros;
    private Map<Honorario, BigDecimal> valoresParaRecolhimentoDebitosReclamanteDeHonorarios;
    private BigDecimal valorParaPagamentoOutrosDebitosReclamadoCustasJudiciais;
    private BigDecimal valorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosDevidos;
    private BigDecimal valorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosPagos;
    private BigDecimal valorParaPagamentoOutrosDebitosReclamadoJurosDePrevidenciaPrivada;
    private BigDecimal valorParaPagamentoOutrosDebitosReclamadoImpostoDeRendaDoReclamante;
    private BigDecimal valorParaPagamentoOutrosDebitosReclamadoInssDezPorcento;
    private BigDecimal valorParaPagamentoOutrosDebitosReclamadoInssMeioPorcento;
    private Map<Multa, BigDecimal> valoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros;
    private Map<Honorario, BigDecimal> valoresParaPagamentoOutrosDebitosReclamadoDeHonorarios;
    private BigDecimal valorParaPagamentoDebitosCobrarDoReclamanteCustasJudiciais;
    private Map<Multa, BigDecimal> valoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros;
    private Map<Honorario, BigDecimal> valoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios;
    private Map<Multa, MultaDaAtualizacao> referenciaEntreMultaEMultaDaAtualizacao;
    private Map<Honorario, HonorarioDaAtualizacao> referenciaEntreHonorarioEHonorarioDaAtualizacao;

    public MaquinaDeRateioDoPagamento(Pagamento pagamento) {
        this.pagamento = pagamento;
        this.limparRateioCreditoERecolhimentoReclamanteAnterior();
    }

    private void limparRateioCreditoERecolhimentoReclamanteAnterior() {
        this.valorParaPagamentoCreditoReclamantePrincipal = BigDecimal.ZERO;
        this.valorParaPagamentoCreditoReclamanteFgts = BigDecimal.ZERO;
        this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante = BigDecimal.ZERO;
        this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado = BigDecimal.ZERO;
        this.proporcaoGeralParaRecolhimentosDebitosReclamante = BigDecimal.ZERO;
        this.proporcaoMultasParaRecolhimentosDebitosReclamante = BigDecimal.ZERO;
        this.proporcaoOutrosParaRecolhimentosDebitosReclamante = BigDecimal.ZERO;
        this.valorParaRecolhimentoDebitosReclamanteCustasJudiciais = BigDecimal.ZERO;
        this.valorParaRecolhimentoDebitosReclamanteDepositoDeFgts = BigDecimal.ZERO;
        this.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial = BigDecimal.ZERO;
        this.valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada = BigDecimal.ZERO;
        this.valorParaRecolhimentoDebitosReclamantePensaoAlimenticia = BigDecimal.ZERO;
        this.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante = BigDecimal.ZERO;
    }

    private void limparRateioOutrosDebitosReclamadoAnterior() {
        this.valorParaPagamentoOutrosDebitosReclamadoCustasJudiciais = BigDecimal.ZERO;
        this.valorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosDevidos = BigDecimal.ZERO;
        this.valorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosPagos = BigDecimal.ZERO;
        this.valorParaPagamentoOutrosDebitosReclamadoJurosDePrevidenciaPrivada = BigDecimal.ZERO;
        this.valorParaPagamentoOutrosDebitosReclamadoImpostoDeRendaDoReclamante = BigDecimal.ZERO;
        this.valorParaPagamentoOutrosDebitosReclamadoInssDezPorcento = BigDecimal.ZERO;
        this.valorParaPagamentoOutrosDebitosReclamadoInssMeioPorcento = BigDecimal.ZERO;
    }

    private void limparRateioDebitosCobrarDoReclamanteAnterior() {
        this.valorParaPagamentoDebitosCobrarDoReclamanteCustasJudiciais = BigDecimal.ZERO;
    }

    private void popularListasDeMultasEHonorarios(DebitosDoReclamante debitosDoReclamante) {
        this.valoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros = new HashMap<Multa, BigDecimal>();
        for (MultaDaAtualizacao multaAtualizacao : debitosDoReclamante.getMultasCalculadas()) {
            this.valoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros.put(multaAtualizacao.getMulta(), BigDecimal.ZERO);
        }
        for (MultaDaAtualizacao multaAtualizacao : debitosDoReclamante.getMultasInformadas()) {
            this.valoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros.put(multaAtualizacao.getMulta(), BigDecimal.ZERO);
        }
        this.valoresParaRecolhimentoDebitosReclamanteDeHonorarios = new HashMap<Honorario, BigDecimal>();
        this.referenciaEntreHonorarioEHonorarioDaAtualizacao = new HashMap<Honorario, HonorarioDaAtualizacao>();
        for (HonorarioDaAtualizacao honorarioAtualizacao : debitosDoReclamante.getHonorariosDaAtualizacaoCalculado()) {
            this.valoresParaRecolhimentoDebitosReclamanteDeHonorarios.put(honorarioAtualizacao.getHonorario(), BigDecimal.ZERO);
            this.referenciaEntreHonorarioEHonorarioDaAtualizacao.put(honorarioAtualizacao.getHonorario(), honorarioAtualizacao);
        }
        for (HonorarioDaAtualizacao honorarioAtualizacao : debitosDoReclamante.getHonorariosDaAtualizacaoInformado()) {
            this.valoresParaRecolhimentoDebitosReclamanteDeHonorarios.put(honorarioAtualizacao.getHonorario(), BigDecimal.ZERO);
            this.referenciaEntreHonorarioEHonorarioDaAtualizacao.put(honorarioAtualizacao.getHonorario(), honorarioAtualizacao);
        }
    }

    private void popularListasDeMultasEHonorarios(OutrosDebitosReclamado outrosDebitosReclamado) {
        this.valoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros = new HashMap<Multa, BigDecimal>();
        this.referenciaEntreMultaEMultaDaAtualizacao = new HashMap<Multa, MultaDaAtualizacao>();
        for (MultaDaAtualizacao multaAtualizacao : outrosDebitosReclamado.getMultasCalculadas()) {
            this.valoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros.put(multaAtualizacao.getMulta(), BigDecimal.ZERO);
            this.referenciaEntreMultaEMultaDaAtualizacao.put(multaAtualizacao.getMulta(), multaAtualizacao);
        }
        for (MultaDaAtualizacao multaAtualizacao : outrosDebitosReclamado.getMultasInformadas()) {
            this.valoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros.put(multaAtualizacao.getMulta(), BigDecimal.ZERO);
            this.referenciaEntreMultaEMultaDaAtualizacao.put(multaAtualizacao.getMulta(), multaAtualizacao);
        }
        this.valoresParaPagamentoOutrosDebitosReclamadoDeHonorarios = new HashMap<Honorario, BigDecimal>();
        this.referenciaEntreHonorarioEHonorarioDaAtualizacao = new HashMap<Honorario, HonorarioDaAtualizacao>();
        for (HonorarioDaAtualizacao honorarioAtualizacao : outrosDebitosReclamado.getHonorariosDaAtualizacaoCalculado()) {
            this.valoresParaPagamentoOutrosDebitosReclamadoDeHonorarios.put(honorarioAtualizacao.getHonorario(), BigDecimal.ZERO);
            this.referenciaEntreHonorarioEHonorarioDaAtualizacao.put(honorarioAtualizacao.getHonorario(), honorarioAtualizacao);
        }
        for (HonorarioDaAtualizacao honorarioAtualizacao : outrosDebitosReclamado.getHonorariosDaAtualizacaoInformado()) {
            this.valoresParaPagamentoOutrosDebitosReclamadoDeHonorarios.put(honorarioAtualizacao.getHonorario(), BigDecimal.ZERO);
            this.referenciaEntreHonorarioEHonorarioDaAtualizacao.put(honorarioAtualizacao.getHonorario(), honorarioAtualizacao);
        }
    }

    private void popularListasDeMultasEHonorarios(DebitosCobrarDoReclamante debitosCobrarDoReclamante) {
        this.valoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros = new HashMap<Multa, BigDecimal>();
        this.referenciaEntreMultaEMultaDaAtualizacao = new HashMap<Multa, MultaDaAtualizacao>();
        for (MultaDaAtualizacao multaAtualizacao : debitosCobrarDoReclamante.getMultasCalculadas()) {
            this.valoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros.put(multaAtualizacao.getMulta(), BigDecimal.ZERO);
            this.referenciaEntreMultaEMultaDaAtualizacao.put(multaAtualizacao.getMulta(), multaAtualizacao);
        }
        for (MultaDaAtualizacao multaAtualizacao : debitosCobrarDoReclamante.getMultasInformadas()) {
            this.valoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros.put(multaAtualizacao.getMulta(), BigDecimal.ZERO);
            this.referenciaEntreMultaEMultaDaAtualizacao.put(multaAtualizacao.getMulta(), multaAtualizacao);
        }
        this.valoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios = new HashMap<Honorario, BigDecimal>();
        this.referenciaEntreHonorarioEHonorarioDaAtualizacao = new HashMap<Honorario, HonorarioDaAtualizacao>();
        for (HonorarioDaAtualizacao honorarioAtualizacao : debitosCobrarDoReclamante.getHonorariosDaAtualizacaoCalculado()) {
            this.valoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios.put(honorarioAtualizacao.getHonorario(), BigDecimal.ZERO);
            this.referenciaEntreHonorarioEHonorarioDaAtualizacao.put(honorarioAtualizacao.getHonorario(), honorarioAtualizacao);
        }
        for (HonorarioDaAtualizacao honorarioAtualizacao : debitosCobrarDoReclamante.getHonorariosDaAtualizacaoInformado()) {
            this.valoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios.put(honorarioAtualizacao.getHonorario(), BigDecimal.ZERO);
            this.referenciaEntreHonorarioEHonorarioDaAtualizacao.put(honorarioAtualizacao.getHonorario(), honorarioAtualizacao);
        }
    }

    public void calcularRateioCreditoERecolhimentoReclamante(CreditosDoReclamante creditoDoReclamante, DebitosDoReclamante debitosDoReclamante) {
        this.limparRateioCreditoERecolhimentoReclamanteAnterior();
        this.popularListasDeMultasEHonorarios(debitosDoReclamante);
        BigDecimal totalDevidoDeCreditoDoReclamante = creditoDoReclamante.calcularTotalDevido();
        creditoDoReclamante.calculaTotalDevidoDasMultasDevidasAoReclamanteEAoReclamado();
        BigDecimal totalAAbaterDeMultas = this.calcularTotalAAbaterDeMultas(totalDevidoDeCreditoDoReclamante, creditoDoReclamante);
        BigDecimal[] valoresParaRatear = new BigDecimal[4];
        BigDecimal[] valoresParaRatearAbatimentoDeMultasNoPrincipalEFgts = new BigDecimal[2];
        BigDecimal totalFixoCreditoDoReclamante = BigDecimal.ZERO;
        BigDecimal totalPrincipal = null;
        if (this.pagamento.getSelecionarValorPrincipal().booleanValue()) {
            totalPrincipal = BigDecimal.ZERO;
            totalPrincipal = Utils.somar(totalPrincipal, creditoDoReclamante.getDevidoPrincipal().abs(), totalPrincipal);
            totalPrincipal = Utils.somar(totalPrincipal, creditoDoReclamante.getDevidoJuroDeMoraPrincipal().abs(), totalPrincipal);
            valoresParaRatearAbatimentoDeMultasNoPrincipalEFgts[0] = totalPrincipal = Utils.somar(totalPrincipal, creditoDoReclamante.getDevidoJuroDeMoraPrincipalPeriodoAtual().abs(), totalPrincipal);
            if (!this.pagamento.getApurarValorPrincipal().booleanValue()) {
                this.valorParaPagamentoCreditoReclamantePrincipal = this.pagamento.getValorParcelaPrincipal();
                totalFixoCreditoDoReclamante = Utils.somar(totalFixoCreditoDoReclamante, this.pagamento.getValorParcelaPrincipal(), totalFixoCreditoDoReclamante);
            } else {
                valoresParaRatear[0] = totalPrincipal;
            }
        }
        BigDecimal totalFgts = null;
        if (this.pagamento.getSelecionarValorFgts().booleanValue()) {
            totalFgts = BigDecimal.ZERO;
            totalFgts = Utils.somar(totalFgts, creditoDoReclamante.getDevidoFgts().abs(), totalFgts);
            totalFgts = Utils.somar(totalFgts, creditoDoReclamante.getDevidoJuroDeMoraFgts().abs(), totalFgts);
            valoresParaRatearAbatimentoDeMultasNoPrincipalEFgts[1] = totalFgts = Utils.somar(totalFgts, creditoDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual().abs(), totalFgts);
            if (!this.pagamento.getApurarValorFgts().booleanValue()) {
                this.valorParaPagamentoCreditoReclamanteFgts = this.pagamento.getValorParcelaFgts();
                totalFixoCreditoDoReclamante = Utils.somar(totalFixoCreditoDoReclamante, this.pagamento.getValorParcelaFgts(), totalFixoCreditoDoReclamante);
            } else {
                valoresParaRatear[1] = totalFgts;
            }
        }
        BigDecimal totalMultasDevidasAoReclamante = null;
        if (this.pagamento.getSelecionarValorMultasDevidasReclamante().booleanValue()) {
            totalMultasDevidasAoReclamante = creditoDoReclamante.getTotalDevidoDasMultasDevidasAoReclamante().abs();
            if (!this.pagamento.getApurarValorMultasDevidasReclamante().booleanValue()) {
                this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante = this.pagamento.getValorParcelaMultasDevidasReclamante();
                totalFixoCreditoDoReclamante = Utils.somar(totalFixoCreditoDoReclamante, this.pagamento.getValorParcelaMultasDevidasReclamante(), totalFixoCreditoDoReclamante);
            } else {
                valoresParaRatear[2] = totalMultasDevidasAoReclamante;
            }
        }
        if (this.pagamento.getCalculo().getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            BigDecimal totalFixoParaSomar = this.aplicarRecolhimentoParaRegraPrecatorio(debitosDoReclamante, valoresParaRatear);
            totalFixoCreditoDoReclamante = Utils.somar(totalFixoCreditoDoReclamante, totalFixoParaSomar, totalFixoCreditoDoReclamante);
        }
        BigDecimal valorPagamentoParaRatear = this.pagamento.getValorParcelaCreditoReclamante();
        valorPagamentoParaRatear = Utils.subtrair(valorPagamentoParaRatear, totalFixoCreditoDoReclamante, valorPagamentoParaRatear);
        HashMap<Integer, Integer> mapaDeIndices = new HashMap<Integer, Integer>();
        int contadorDeNaoNulos = 0;
        for (int i = 0; i < valoresParaRatear.length; ++i) {
            if (!Utils.naoNulo(valoresParaRatear[i])) continue;
            mapaDeIndices.put(i, contadorDeNaoNulos++);
        }
        BigDecimal[] valoresNaoNulosParaRateio = new BigDecimal[contadorDeNaoNulos];
        for (int i = 0; i < valoresParaRatear.length; ++i) {
            if (!Utils.naoNulo(valoresParaRatear[i])) continue;
            valoresNaoNulosParaRateio[((Integer)mapaDeIndices.get((Object)Integer.valueOf((int)i))).intValue()] = valoresParaRatear[i];
        }
        BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(valorPagamentoParaRatear, valoresNaoNulosParaRateio);
        if (this.pagamento.getApurarValorPrincipal().booleanValue()) {
            this.valorParaPagamentoCreditoReclamantePrincipal = valoresRateados[(Integer)mapaDeIndices.get(0)];
        }
        if (this.pagamento.getApurarValorFgts().booleanValue()) {
            this.valorParaPagamentoCreditoReclamanteFgts = valoresRateados[(Integer)mapaDeIndices.get(1)];
        }
        if (this.pagamento.getApurarValorMultasDevidasReclamante().booleanValue()) {
            this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante = valoresRateados[(Integer)mapaDeIndices.get(2)];
        }
        BigDecimal valorParaAbaterNasMultas = this.ratearAbatimentoDeMultasNoPrincipalEFgts(creditoDoReclamante, totalAAbaterDeMultas, valoresParaRatearAbatimentoDeMultasNoPrincipalEFgts);
        this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante = Utils.somar(this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante, valorParaAbaterNasMultas);
        if (Utils.naoNulo(totalPrincipal) && BigDecimal.ZERO.compareTo(totalPrincipal) != 0 && BigDecimal.ZERO.compareTo(this.valorParaPagamentoCreditoReclamantePrincipal) != 0) {
            this.proporcaoGeralParaRecolhimentosDebitosReclamante = Utils.dividir(this.valorParaPagamentoCreditoReclamantePrincipal, totalPrincipal);
        }
        BigDecimal valorParaPagamentoCreditoReclamanteTotal = BigDecimal.ZERO;
        BigDecimal valorParaPagamentoMultasCreditoReclamanteTotal = BigDecimal.ZERO;
        BigDecimal totalParaMultas = BigDecimal.ZERO;
        BigDecimal totalParaOutros = BigDecimal.ZERO;
        valorParaPagamentoCreditoReclamanteTotal = Utils.somar(valorParaPagamentoCreditoReclamanteTotal, this.valorParaPagamentoCreditoReclamantePrincipal, valorParaPagamentoCreditoReclamanteTotal);
        valorParaPagamentoMultasCreditoReclamanteTotal = Utils.somar(valorParaPagamentoMultasCreditoReclamanteTotal, this.valorParaPagamentoCreditoReclamantePrincipal, valorParaPagamentoMultasCreditoReclamanteTotal);
        totalParaOutros = Utils.somar(totalParaOutros, creditoDoReclamante.getDevidoPrincipal().abs(), totalParaOutros);
        totalParaOutros = Utils.somar(totalParaOutros, creditoDoReclamante.getDevidoJuroDeMoraPrincipal().abs(), totalParaOutros);
        totalParaOutros = Utils.somar(totalParaOutros, creditoDoReclamante.getDevidoJuroDeMoraPrincipalPeriodoAtual().abs(), totalParaOutros);
        totalParaMultas = Utils.somar(totalParaMultas, creditoDoReclamante.getDevidoPrincipal().abs(), totalParaMultas);
        totalParaMultas = Utils.somar(totalParaMultas, creditoDoReclamante.getDevidoJuroDeMoraPrincipal().abs(), totalParaMultas);
        totalParaMultas = Utils.somar(totalParaMultas, creditoDoReclamante.getDevidoJuroDeMoraPrincipalPeriodoAtual().abs(), totalParaMultas);
        if (this.pagamento.getCalculo().getFgts().getDestinoDoFgts() == DestinoDoFgtsEnum.PAGAR) {
            valorParaPagamentoCreditoReclamanteTotal = Utils.somar(valorParaPagamentoCreditoReclamanteTotal, this.valorParaPagamentoCreditoReclamanteFgts, valorParaPagamentoCreditoReclamanteTotal);
            valorParaPagamentoMultasCreditoReclamanteTotal = Utils.somar(valorParaPagamentoMultasCreditoReclamanteTotal, this.valorParaPagamentoCreditoReclamanteFgts, valorParaPagamentoMultasCreditoReclamanteTotal);
            totalParaOutros = Utils.somar(totalParaOutros, creditoDoReclamante.getDevidoFgts().abs(), totalParaOutros);
            totalParaOutros = Utils.somar(totalParaOutros, creditoDoReclamante.getDevidoJuroDeMoraFgts().abs(), totalParaOutros);
            totalParaOutros = Utils.somar(totalParaOutros, creditoDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual().abs(), totalParaOutros);
            totalParaMultas = Utils.somar(totalParaMultas, creditoDoReclamante.getDevidoFgts().abs(), totalParaMultas);
            totalParaMultas = Utils.somar(totalParaMultas, creditoDoReclamante.getDevidoJuroDeMoraFgts().abs(), totalParaMultas);
            totalParaMultas = Utils.somar(totalParaMultas, creditoDoReclamante.getDevidoJuroDeMoraFgtsPeriodoAtual().abs(), totalParaMultas);
        }
        valorParaPagamentoCreditoReclamanteTotal = Utils.somar(valorParaPagamentoCreditoReclamanteTotal, this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante, valorParaPagamentoCreditoReclamanteTotal);
        valorParaPagamentoCreditoReclamanteTotal = Utils.somar(valorParaPagamentoCreditoReclamanteTotal, this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado, valorParaPagamentoCreditoReclamanteTotal);
        totalParaOutros = Utils.somar(totalParaOutros, creditoDoReclamante.getTotalDevidoDasMultasDevidasAoReclamante(), totalParaOutros);
        if (BigDecimal.ZERO.compareTo(totalParaOutros = Utils.somar(totalParaOutros, creditoDoReclamante.getTotalDevidoDasMultasDevidasAoReclamado(), totalParaOutros)) != 0 && BigDecimal.ZERO.compareTo(valorParaPagamentoCreditoReclamanteTotal) != 0) {
            this.proporcaoOutrosParaRecolhimentosDebitosReclamante = Utils.dividir(valorParaPagamentoCreditoReclamanteTotal, totalParaOutros);
        }
        if (BigDecimal.ZERO.compareTo(totalParaMultas) != 0 && BigDecimal.ZERO.compareTo(valorParaPagamentoMultasCreditoReclamanteTotal) != 0) {
            this.proporcaoMultasParaRecolhimentosDebitosReclamante = Utils.dividir(valorParaPagamentoMultasCreditoReclamanteTotal, totalParaMultas);
        } else if (BigDecimal.ZERO.compareTo(totalParaMultas) == 0) {
            this.proporcaoMultasParaRecolhimentosDebitosReclamante = this.proporcaoOutrosParaRecolhimentosDebitosReclamante;
        }
        if (this.pagamento.getSelecionarCustasJudiciais().booleanValue() && !this.pagamento.getApurarCustasJudiciais().booleanValue()) {
            this.valorParaRecolhimentoDebitosReclamanteCustasJudiciais = this.pagamento.getCustasJudiciais();
        }
        if (this.pagamento.getSelecionarDescontoDaContribuicaoSocial().booleanValue() && !this.pagamento.getApurarDescontoDaContribuicaoSocial().booleanValue()) {
            this.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial = this.pagamento.getDescontoDaContribuicaoSocial();
        }
        if (this.pagamento.getSelecionarPrevidenciaPrivada().booleanValue() && !this.pagamento.getApurarPrevidenciaPrivada().booleanValue()) {
            this.valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada = this.pagamento.getPrevidenciaPrivada();
        }
        if (this.pagamento.getSelecionarPensaoAlimenticia().booleanValue() && !this.pagamento.getApurarPensaoAlimenticia().booleanValue()) {
            this.valorParaRecolhimentoDebitosReclamantePensaoAlimenticia = this.pagamento.getPensaoAlimenticia();
        }
        if (this.pagamento.getSelecionarImpostoDoReclamante().booleanValue() && !this.pagamento.getApurarImpostoDoReclamante().booleanValue()) {
            this.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante = this.pagamento.getImpostoDoReclamante();
        }
        for (MultaDoPagamento multaPagamento : this.pagamento.getMultasDevidasTerceiros()) {
            if (multaPagamento.getApurarMulta().booleanValue()) continue;
            this.valoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros.put(multaPagamento.getMulta(), multaPagamento.getValorMulta());
        }
        for (HonorarioDoPagamento honorarioPagamento : this.pagamento.getHonorariosBrutosDevidosReclamante()) {
            if (honorarioPagamento.getApurarHonorario().booleanValue()) continue;
            this.valoresParaRecolhimentoDebitosReclamanteDeHonorarios.put(honorarioPagamento.getHonorario(), honorarioPagamento.getValorHonorario());
        }
    }

    private BigDecimal aplicarRecolhimentoParaRegraPrecatorio(DebitosDoReclamante debitosDoReclamante, BigDecimal[] valoresParaRatear) {
        Calculo calculo = this.pagamento.getCalculo();
        BigDecimal totalRecolhimentoPrecatorio = BigDecimal.ZERO;
        BigDecimal totalFixoCreditoDoReclamante = BigDecimal.ZERO;
        if (this.pagamento.getSelecionarCustasJudiciais().booleanValue()) {
            if (!this.pagamento.getApurarCustasJudiciais().booleanValue()) {
                this.valorParaRecolhimentoDebitosReclamanteCustasJudiciais = this.pagamento.getCustasJudiciais();
                totalFixoCreditoDoReclamante = Utils.somar(totalFixoCreditoDoReclamante, this.pagamento.getCustasJudiciais(), totalFixoCreditoDoReclamante);
            } else {
                totalRecolhimentoPrecatorio = Utils.somar(totalRecolhimentoPrecatorio, debitosDoReclamante.getDevidoCorrigidoCustasJudiciaisPrecatorio(), totalRecolhimentoPrecatorio);
            }
        }
        if (this.pagamento.getSelecionarDescontoDaContribuicaoSocial().booleanValue()) {
            if (!this.pagamento.getApurarDescontoDaContribuicaoSocial().booleanValue()) {
                this.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial = this.pagamento.getDescontoDaContribuicaoSocial();
                totalFixoCreditoDoReclamante = Utils.somar(totalFixoCreditoDoReclamante, this.pagamento.getDescontoDaContribuicaoSocial(), totalFixoCreditoDoReclamante);
            } else {
                totalRecolhimentoPrecatorio = Utils.somar(totalRecolhimentoPrecatorio, debitosDoReclamante.getDescontoInssCorrigidoPrecatorio(), totalRecolhimentoPrecatorio);
            }
        }
        if (calculo.getIrpf().getApurarImpostoRenda().booleanValue() && !calculo.getIrpf().getCobrarDoReclamado().booleanValue() && this.pagamento.getSelecionarImpostoDoReclamante().booleanValue()) {
            if (!this.pagamento.getApurarImpostoDoReclamante().booleanValue()) {
                this.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante = this.pagamento.getImpostoDoReclamante();
                totalFixoCreditoDoReclamante = Utils.somar(totalFixoCreditoDoReclamante, this.pagamento.getImpostoDoReclamante(), totalFixoCreditoDoReclamante);
            } else {
                totalRecolhimentoPrecatorio = Utils.somar(totalRecolhimentoPrecatorio, debitosDoReclamante.getValorIrpfCorrigidoPrecatorio(), totalRecolhimentoPrecatorio);
            }
        }
        if (this.pagamento.getPagarHonorariosBrutosDevidosReclamante().booleanValue()) {
            for (HonorarioDoPagamento honorarioPagamento : this.pagamento.getHonorariosBrutosDevidosReclamante()) {
                if (honorarioPagamento.getApurarHonorario().booleanValue()) {
                    HonorarioDaAtualizacao honorarioAtualizacao = this.referenciaEntreHonorarioEHonorarioDaAtualizacao.get(honorarioPagamento.getHonorario());
                    BigDecimal totalDevidoDoHonorario = BigDecimal.ZERO;
                    totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, honorarioAtualizacao.getDevidoHonorario(), totalDevidoDoHonorario);
                    totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, honorarioAtualizacao.devidoJuroHonorarioInformadoDepoisPrimeiroEvento(), totalDevidoDoHonorario);
                    totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, honorarioAtualizacao.getDevidoImpostoRenda(), totalDevidoDoHonorario);
                    totalRecolhimentoPrecatorio = Utils.somar(totalRecolhimentoPrecatorio, totalDevidoDoHonorario, totalRecolhimentoPrecatorio);
                    continue;
                }
                this.valoresParaRecolhimentoDebitosReclamanteDeHonorarios.put(honorarioPagamento.getHonorario(), honorarioPagamento.getValorHonorario());
                totalFixoCreditoDoReclamante = Utils.somar(totalFixoCreditoDoReclamante, honorarioPagamento.getValorHonorario(), totalFixoCreditoDoReclamante);
            }
        }
        if (totalRecolhimentoPrecatorio.compareTo(BigDecimal.ZERO) > 0) {
            valoresParaRatear[3] = totalRecolhimentoPrecatorio;
        }
        return totalFixoCreditoDoReclamante;
    }

    private BigDecimal ratearAbatimentoDeMultasNoPrincipalEFgts(CreditosDoReclamante creditoDoReclamante, BigDecimal totalAAbaterDeMultas, BigDecimal[] valoresParaRatearAbatimentoDeMultasNoPrincipalEFgts) {
        int i;
        BigDecimal totalAAbaterDeMultasNoPrincipalEFgts;
        BigDecimal valorDeMultasReclamanteSobrando = Utils.subtrair(creditoDoReclamante.getTotalDevidoDasMultasDevidasAoReclamante(), this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante, creditoDoReclamante.getTotalDevidoDasMultasDevidasAoReclamante());
        if (BigDecimal.ZERO.compareTo(valorDeMultasReclamanteSobrando) > 0) {
            valorDeMultasReclamanteSobrando = BigDecimal.ZERO;
        }
        if (BigDecimal.ZERO.compareTo(totalAAbaterDeMultasNoPrincipalEFgts = Utils.subtrair(totalAAbaterDeMultas, valorDeMultasReclamanteSobrando)) > 0) {
            totalAAbaterDeMultasNoPrincipalEFgts = BigDecimal.ZERO;
        }
        HashMap<Integer, Integer> mapaDeIndices = new HashMap<Integer, Integer>();
        int contadorDeNaoNulos = 0;
        for (i = 0; i < 2; ++i) {
            if (!Utils.naoNulo(valoresParaRatearAbatimentoDeMultasNoPrincipalEFgts[i])) continue;
            mapaDeIndices.put(i, contadorDeNaoNulos++);
        }
        BigDecimal[] valoresNaoNulosParaRateio = new BigDecimal[contadorDeNaoNulos];
        for (i = 0; i < 2; ++i) {
            if (!Utils.naoNulo(valoresParaRatearAbatimentoDeMultasNoPrincipalEFgts[i])) continue;
            valoresNaoNulosParaRateio[((Integer)mapaDeIndices.get((Object)Integer.valueOf((int)i))).intValue()] = valoresParaRatearAbatimentoDeMultasNoPrincipalEFgts[i];
        }
        BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(totalAAbaterDeMultasNoPrincipalEFgts, valoresNaoNulosParaRateio);
        boolean foiAbatido = false;
        if (this.pagamento.getSelecionarValorPrincipal().booleanValue()) {
            this.valorParaPagamentoCreditoReclamantePrincipal = Utils.somar(this.valorParaPagamentoCreditoReclamantePrincipal, valoresRateados[(Integer)mapaDeIndices.get(0)]);
            foiAbatido = true;
        }
        if (this.pagamento.getSelecionarValorFgts().booleanValue()) {
            this.valorParaRecolhimentoDebitosReclamanteDepositoDeFgts = this.valorParaPagamentoCreditoReclamanteFgts;
            this.valorParaPagamentoCreditoReclamanteFgts = Utils.somar(this.valorParaPagamentoCreditoReclamanteFgts, valoresRateados[(Integer)mapaDeIndices.get(1)]);
            foiAbatido = true;
        }
        return foiAbatido ? Utils.arredondarValorMonetario(Utils.subtrair(totalAAbaterDeMultas, totalAAbaterDeMultasNoPrincipalEFgts)) : totalAAbaterDeMultas;
    }

    private BigDecimal calcularTotalAAbaterDeMultas(BigDecimal totalDevidoDeCreditoDoReclamante, CreditosDoReclamante creditoDoReclamante) {
        BigDecimal totalAAbaterDeMultas = BigDecimal.ZERO;
        if (this.pagamento.getValorParcelaCreditoReclamante().compareTo(totalDevidoDeCreditoDoReclamante) >= 0) {
            totalAAbaterDeMultas = creditoDoReclamante.getTotalDevidoDasMultasDevidasAoReclamado();
        } else if (BigDecimal.ZERO.compareTo(totalDevidoDeCreditoDoReclamante) != 0) {
            totalAAbaterDeMultas = Utils.arredondarValorMonetario(Utils.multiplicar(this.pagamento.getValorParcelaCreditoReclamante(), Utils.dividir(creditoDoReclamante.getTotalDevidoDasMultasDevidasAoReclamado(), totalDevidoDeCreditoDoReclamante)));
        }
        if (totalAAbaterDeMultas.compareTo(creditoDoReclamante.getTotalDevidoDasMultasDevidasAoReclamado()) < 0) {
            totalAAbaterDeMultas = creditoDoReclamante.getTotalDevidoDasMultasDevidasAoReclamado();
        }
        this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado = totalAAbaterDeMultas;
        totalAAbaterDeMultas = totalAAbaterDeMultas.abs();
        return totalAAbaterDeMultas;
    }

    public void calcularRateioOutrosDebitosReclamado(OutrosDebitosReclamado outrosDebitosReclamado) {
        int contador;
        BigDecimal[] valoresParaRateio;
        this.limparRateioOutrosDebitosReclamadoAnterior();
        this.popularListasDeMultasEHonorarios(outrosDebitosReclamado);
        BigDecimal[] valoresParaRatear = new BigDecimal[9];
        BigDecimal totalFixoOutrosDebitosDoReclamado = BigDecimal.ZERO;
        BigDecimal totalCustasJudiciais = null;
        if (this.pagamento.getSelecionarCustasJudiciaisOutrosDebitos().booleanValue() && this.pagamento.getApurarCustasJudiciaisOutrosDebitos().booleanValue()) {
            totalCustasJudiciais = BigDecimal.ZERO;
            valoresParaRatear[0] = totalCustasJudiciais = Utils.somar(totalCustasJudiciais, outrosDebitosReclamado.getDevidoCustasJudiciais(), totalCustasJudiciais);
        } else if (this.pagamento.getSelecionarCustasJudiciaisOutrosDebitos().booleanValue() && !this.pagamento.getApurarCustasJudiciaisOutrosDebitos().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoCustasJudiciais = this.pagamento.getCustasJudiciaisOutrosDebitos();
            totalFixoOutrosDebitosDoReclamado = Utils.somar(totalFixoOutrosDebitosDoReclamado, this.pagamento.getCustasJudiciaisOutrosDebitos(), totalFixoOutrosDebitosDoReclamado);
        }
        BigDecimal totalInssSobreSalariosDevidos = null;
        if (this.pagamento.getSelecionarInssSobreSalariosDevidosOutrosDebitos().booleanValue() && this.pagamento.getApurarInssSobreSalariosDevidosOutrosDebitos().booleanValue()) {
            totalInssSobreSalariosDevidos = BigDecimal.ZERO;
            valoresParaRatear[1] = totalInssSobreSalariosDevidos = Utils.somar(totalInssSobreSalariosDevidos, outrosDebitosReclamado.getDevidoContribuicaoSocialSalariosDevidos(), totalInssSobreSalariosDevidos);
        } else if (this.pagamento.getSelecionarInssSobreSalariosDevidosOutrosDebitos().booleanValue() && !this.pagamento.getApurarInssSobreSalariosDevidosOutrosDebitos().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosDevidos = this.pagamento.getInssSobreSalariosDevidosOutrosDebitos();
            totalFixoOutrosDebitosDoReclamado = Utils.somar(totalFixoOutrosDebitosDoReclamado, this.pagamento.getInssSobreSalariosDevidosOutrosDebitos(), totalFixoOutrosDebitosDoReclamado);
        }
        BigDecimal totalInssSobreSalariosPagos = null;
        if (this.pagamento.getSelecionarInssSobreSalariosPagosOutrosDebitos().booleanValue() && this.pagamento.getApurarInssSobreSalariosPagosOutrosDebitos().booleanValue()) {
            totalInssSobreSalariosPagos = BigDecimal.ZERO;
            valoresParaRatear[2] = totalInssSobreSalariosPagos = Utils.somar(totalInssSobreSalariosPagos, outrosDebitosReclamado.getDevidoContribuicaoSocialSalariosPagos(), totalInssSobreSalariosPagos);
        } else if (this.pagamento.getSelecionarInssSobreSalariosPagosOutrosDebitos().booleanValue() && !this.pagamento.getApurarInssSobreSalariosPagosOutrosDebitos().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosPagos = this.pagamento.getInssSobreSalariosPagosOutrosDebitos();
            totalFixoOutrosDebitosDoReclamado = Utils.somar(totalFixoOutrosDebitosDoReclamado, this.pagamento.getInssSobreSalariosPagosOutrosDebitos(), totalFixoOutrosDebitosDoReclamado);
        }
        BigDecimal totalJurosDePrevidenciaPrivada = null;
        if (this.pagamento.getSelecionarJurosDePrevidenciaPrivadaOutrosDebitos().booleanValue() && this.pagamento.getApurarJurosDePrevidenciaPrivadaOutrosDebitos().booleanValue()) {
            totalJurosDePrevidenciaPrivada = BigDecimal.ZERO;
            totalJurosDePrevidenciaPrivada = Utils.somar(totalJurosDePrevidenciaPrivada, outrosDebitosReclamado.getDevidoJurosDePrevidenciaPrivada(), totalJurosDePrevidenciaPrivada);
            valoresParaRatear[3] = totalJurosDePrevidenciaPrivada = Utils.somar(totalJurosDePrevidenciaPrivada, outrosDebitosReclamado.getDevidoJurosDePrevidenciaPrivadaPeriodoAtual(), totalJurosDePrevidenciaPrivada);
        } else if (this.pagamento.getSelecionarJurosDePrevidenciaPrivadaOutrosDebitos().booleanValue() && !this.pagamento.getApurarJurosDePrevidenciaPrivadaOutrosDebitos().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoJurosDePrevidenciaPrivada = this.pagamento.getJurosDePrevidenciaPrivadaOutrosDebitos();
            totalFixoOutrosDebitosDoReclamado = Utils.somar(totalFixoOutrosDebitosDoReclamado, this.pagamento.getJurosDePrevidenciaPrivadaOutrosDebitos(), totalFixoOutrosDebitosDoReclamado);
        }
        BigDecimal totalImpostoDeRendaDoReclamante = null;
        if (this.pagamento.getSelecionarImpostoDeRendaDoReclamanteOutrosDebitos().booleanValue() && this.pagamento.getApurarImpostoDeRendaDoReclamanteOutrosDebitos().booleanValue()) {
            totalImpostoDeRendaDoReclamante = BigDecimal.ZERO;
            valoresParaRatear[4] = totalImpostoDeRendaDoReclamante = Utils.somar(totalImpostoDeRendaDoReclamante, outrosDebitosReclamado.getValorDevidoIrpf(), totalImpostoDeRendaDoReclamante);
        } else if (this.pagamento.getSelecionarImpostoDeRendaDoReclamanteOutrosDebitos().booleanValue() && !this.pagamento.getApurarImpostoDeRendaDoReclamanteOutrosDebitos().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoImpostoDeRendaDoReclamante = this.pagamento.getImpostoDeRendaDoReclamanteOutrosDebitos();
            totalFixoOutrosDebitosDoReclamado = Utils.somar(totalFixoOutrosDebitosDoReclamado, this.pagamento.getImpostoDeRendaDoReclamanteOutrosDebitos(), totalFixoOutrosDebitosDoReclamado);
        }
        BigDecimal totalInssDezPorcento = null;
        if (this.pagamento.getSelecionarInssDezPorcento().booleanValue() && this.pagamento.getApurarInssDezPorcento().booleanValue()) {
            totalInssDezPorcento = BigDecimal.ZERO;
            valoresParaRatear[5] = totalInssDezPorcento = Utils.somar(totalInssDezPorcento, outrosDebitosReclamado.getDevidoInssDez(), totalInssDezPorcento);
        } else if (this.pagamento.getSelecionarInssDezPorcento().booleanValue() && !this.pagamento.getApurarInssDezPorcento().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoInssDezPorcento = this.pagamento.getInssDezPorcento();
            totalFixoOutrosDebitosDoReclamado = Utils.somar(totalFixoOutrosDebitosDoReclamado, this.pagamento.getInssDezPorcento(), totalFixoOutrosDebitosDoReclamado);
        }
        BigDecimal totalInssMeioPorcento = null;
        if (this.pagamento.getSelecionarInssMeioPorcento().booleanValue() && this.pagamento.getApurarInssMeioPorcento().booleanValue()) {
            totalInssMeioPorcento = BigDecimal.ZERO;
            valoresParaRatear[6] = totalInssMeioPorcento = Utils.somar(totalInssMeioPorcento, outrosDebitosReclamado.getDevidoInssMeio(), totalInssMeioPorcento);
        } else if (this.pagamento.getSelecionarInssMeioPorcento().booleanValue() && !this.pagamento.getApurarInssMeioPorcento().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoInssMeioPorcento = this.pagamento.getInssMeioPorcento();
            totalFixoOutrosDebitosDoReclamado = Utils.somar(totalFixoOutrosDebitosDoReclamado, this.pagamento.getInssMeioPorcento(), totalFixoOutrosDebitosDoReclamado);
        }
        HashMap<Multa, BigDecimal> totaisDasMultas = new HashMap<Multa, BigDecimal>();
        for (MultaDoPagamento multaDoPagamento : this.pagamento.getMultasDevidasTerceirosOutrosDebitos()) {
            BigDecimal totalDevidoDaMulta = null;
            if (multaDoPagamento.getApurarMulta().booleanValue()) {
                totalDevidoDaMulta = BigDecimal.ZERO;
                MultaDaAtualizacao multaAtualizacao = this.referenciaEntreMultaEMultaDaAtualizacao.get(multaDoPagamento.getMulta());
                if (multaAtualizacao == null) continue;
                switch (multaAtualizacao.getMulta().getTipoValorDaMulta()) {
                    case CALCULADO: {
                        if (multaAtualizacao.getValorRemanescenteMulta() == null || outrosDebitosReclamado.getDataFinalPeriodo().equals(multaAtualizacao.getMulta().getDataEvento()) && outrosDebitosReclamado.getDataInicialPeriodo().equals(outrosDebitosReclamado.getDataFinalPeriodo()) || outrosDebitosReclamado.getDataInicialPeriodo().equals(outrosDebitosReclamado.getCalculo().getDataDeLiquidacao())) {
                            totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, multaAtualizacao.getDevidoCalculada(), totalDevidoDaMulta);
                            break;
                        }
                        totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, multaAtualizacao.getDevidoCalculadaRemanescente(outrosDebitosReclamado.getIndiceDeCorrecao()), totalDevidoDaMulta);
                        totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, multaAtualizacao.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : outrosDebitosReclamado.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAtualizacao.getMulta().getAliquotaMulta().divide(Utils.CEM)), totalDevidoDaMulta);
                        break;
                    }
                    case INFORMADO: {
                        totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, Utils.arredondarValorMonetario(Utils.multiplicar(multaAtualizacao.getValorMulta(), outrosDebitosReclamado.getIndiceDeCorrecao())), totalDevidoDaMulta);
                        if (outrosDebitosReclamado.getDataFinalPeriodo().equals(multaAtualizacao.getMulta().getDataEvento())) break;
                        totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, Utils.arredondarValorMonetario(Utils.multiplicar(multaAtualizacao.getValorJuros(), outrosDebitosReclamado.getIndiceDeCorrecao())), totalDevidoDaMulta);
                        BigDecimal base = multaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaAtualizacao.getValorMulta(), outrosDebitosReclamado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                        BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaAtualizacao.getTaxaJurosMulta().divide(Utils.CEM)));
                        totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, dev, totalDevidoDaMulta);
                    }
                }
                totaisDasMultas.put(multaAtualizacao.getMulta(), totalDevidoDaMulta);
                valoresParaRatear[7] = Utils.nulo(valoresParaRatear[7]) ? totalDevidoDaMulta : Utils.somar(valoresParaRatear[7], totalDevidoDaMulta, valoresParaRatear[7]);
                continue;
            }
            this.valoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros.put(multaDoPagamento.getMulta(), multaDoPagamento.getValorMulta());
            totalFixoOutrosDebitosDoReclamado = Utils.somar(totalFixoOutrosDebitosDoReclamado, multaDoPagamento.getValorMulta(), totalFixoOutrosDebitosDoReclamado);
        }
        HashMap<Honorario, BigDecimal> totaisDosHonorarios = new HashMap<Honorario, BigDecimal>();
        for (HonorarioDoPagamento honorarioPagamento : this.pagamento.getHonorariosBrutosDevidosReclamadoOutrosDebitos()) {
            BigDecimal totalDevidoDoHonorario = null;
            if (honorarioPagamento.getApurarHonorario().booleanValue()) {
                totalDevidoDoHonorario = BigDecimal.ZERO;
                HonorarioDaAtualizacao honorarioAtualizacao = this.referenciaEntreHonorarioEHonorarioDaAtualizacao.get(honorarioPagamento.getHonorario());
                switch (honorarioAtualizacao.getHonorario().getTipoValor()) {
                    case CALCULADO: {
                        if (honorarioAtualizacao.getValorRemanescenteHonorario() == null || outrosDebitosReclamado.getDataFinalPeriodo().equals(honorarioAtualizacao.getHonorario().getDataEvento()) && outrosDebitosReclamado.getDataInicialPeriodo().equals(outrosDebitosReclamado.getDataFinalPeriodo()) || outrosDebitosReclamado.getDataInicialPeriodo().equals(outrosDebitosReclamado.getCalculo().getDataDeLiquidacao())) {
                            totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, honorarioAtualizacao.getDevidoCalculada(), totalDevidoDoHonorario);
                            break;
                        }
                        totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, honorarioAtualizacao.getDevidoCalculadaRemanescente(outrosDebitosReclamado.getIndiceDeCorrecao()), totalDevidoDoHonorario);
                        totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, outrosDebitosReclamado.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioAtualizacao.getHonorario().getAliquota().divide(Utils.CEM)), totalDevidoDoHonorario);
                        totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.calcularHonorariosSobreMultas(outrosDebitosReclamado.getCreditosDoReclamante()), honorarioAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), totalDevidoDoHonorario);
                        break;
                    }
                    case INFORMADO: {
                        totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), outrosDebitosReclamado.getIndiceDeCorrecao())), totalDevidoDoHonorario);
                        if (outrosDebitosReclamado.getDataFinalPeriodo().equals(honorarioAtualizacao.getHonorario().getDataEvento())) break;
                        totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorJuros(), outrosDebitosReclamado.getIndiceDeCorrecao())), totalDevidoDoHonorario);
                        BigDecimal base = honorarioAtualizacao.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), outrosDebitosReclamado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                        BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, honorarioAtualizacao.getTaxaJurosHonorario().divide(Utils.CEM)));
                        totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, dev, totalDevidoDoHonorario);
                    }
                }
                totaisDosHonorarios.put(honorarioAtualizacao.getHonorario(), totalDevidoDoHonorario);
                valoresParaRatear[8] = Utils.nulo(valoresParaRatear[8]) ? totalDevidoDoHonorario : Utils.somar(valoresParaRatear[8], totalDevidoDoHonorario, valoresParaRatear[8]);
                continue;
            }
            this.valoresParaPagamentoOutrosDebitosReclamadoDeHonorarios.put(honorarioPagamento.getHonorario(), honorarioPagamento.getValorHonorario());
            totalFixoOutrosDebitosDoReclamado = Utils.somar(totalFixoOutrosDebitosDoReclamado, honorarioPagamento.getValorHonorario(), totalFixoOutrosDebitosDoReclamado);
        }
        BigDecimal bigDecimal2 = this.pagamento.getValorParcelaOutrosDebitos();
        bigDecimal2 = Utils.subtrair(bigDecimal2, totalFixoOutrosDebitosDoReclamado, bigDecimal2);
        HashMap<Integer, Integer> mapaDeIndices = new HashMap<Integer, Integer>();
        int contadorDeNaoNulos = 0;
        for (int i = 0; i < 9; ++i) {
            if (!Utils.naoNulo(valoresParaRatear[i])) continue;
            mapaDeIndices.put(i, contadorDeNaoNulos++);
        }
        BigDecimal[] valoresNaoNulosParaRateio = new BigDecimal[contadorDeNaoNulos];
        for (int i = 0; i < 9; ++i) {
            if (!Utils.naoNulo(valoresParaRatear[i])) continue;
            valoresNaoNulosParaRateio[((Integer)mapaDeIndices.get((Object)Integer.valueOf((int)i))).intValue()] = valoresParaRatear[i];
        }
        BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(bigDecimal2, valoresNaoNulosParaRateio);
        if (this.pagamento.getApurarCustasJudiciaisOutrosDebitos().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoCustasJudiciais = valoresRateados[(Integer)mapaDeIndices.get(0)];
        }
        if (this.pagamento.getApurarInssSobreSalariosDevidosOutrosDebitos().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosDevidos = valoresRateados[(Integer)mapaDeIndices.get(1)];
        }
        if (this.pagamento.getApurarInssSobreSalariosPagosOutrosDebitos().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosPagos = valoresRateados[(Integer)mapaDeIndices.get(2)];
        }
        if (this.pagamento.getApurarJurosDePrevidenciaPrivadaOutrosDebitos().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoJurosDePrevidenciaPrivada = valoresRateados[(Integer)mapaDeIndices.get(3)];
        }
        if (this.pagamento.getApurarImpostoDeRendaDoReclamanteOutrosDebitos().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoImpostoDeRendaDoReclamante = valoresRateados[(Integer)mapaDeIndices.get(4)];
        }
        if (this.pagamento.getApurarInssDezPorcento().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoInssDezPorcento = valoresRateados[(Integer)mapaDeIndices.get(5)];
        }
        if (this.pagamento.getApurarInssMeioPorcento().booleanValue()) {
            this.valorParaPagamentoOutrosDebitosReclamadoInssMeioPorcento = valoresRateados[(Integer)mapaDeIndices.get(6)];
        }
        if (!totaisDasMultas.isEmpty()) {
            Set multasDoRateio = totaisDasMultas.keySet();
            valoresParaRateio = new BigDecimal[multasDoRateio.size()];
            contador = 0;
            for (Object multa : multasDoRateio) {
                valoresParaRateio[contador] = (BigDecimal)totaisDasMultas.get(multa);
                ++contador;
            }
            BigDecimal[] valoresRateadosMulta = PagamentoUtils.ratearValor(valoresRateados[(Integer)mapaDeIndices.get(7)], valoresParaRateio);
            contador = 0;
            for (Multa multa : multasDoRateio) {
                this.valoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros.put(multa, valoresRateadosMulta[contador++]);
            }
        }
        if (!totaisDosHonorarios.isEmpty()) {
            Set honorariosDoRateio = totaisDosHonorarios.keySet();
            valoresParaRateio = new BigDecimal[honorariosDoRateio.size()];
            contador = 0;
            for (Honorario honorario : honorariosDoRateio) {
                valoresParaRateio[contador] = (BigDecimal)totaisDosHonorarios.get(honorario);
                ++contador;
            }
            BigDecimal[] valoresRateadosHonorario = PagamentoUtils.ratearValor(valoresRateados[(Integer)mapaDeIndices.get(8)], valoresParaRateio);
            contador = 0;
            for (Honorario honorario : honorariosDoRateio) {
                this.valoresParaPagamentoOutrosDebitosReclamadoDeHonorarios.put(honorario, valoresRateadosHonorario[contador++]);
            }
        }
    }

    public void calcularRateioDebitosCobrarDoReclamante(DebitosCobrarDoReclamante debitosCobrarDoReclamante) {
        int contador;
        BigDecimal[] valoresParaRateio;
        this.limparRateioDebitosCobrarDoReclamanteAnterior();
        this.popularListasDeMultasEHonorarios(debitosCobrarDoReclamante);
        BigDecimal[] valoresParaRatear = new BigDecimal[3];
        BigDecimal totalFixoDebitosCobrarDoReclamante = BigDecimal.ZERO;
        BigDecimal totalCustasJudiciais = null;
        if (this.pagamento.getSelecionarCustasJudiciaisDebitosCobrarDoReclamante().booleanValue() && this.pagamento.getApurarCustasJudiciaisDebitosCobrarDoReclamante().booleanValue()) {
            totalCustasJudiciais = BigDecimal.ZERO;
            valoresParaRatear[0] = totalCustasJudiciais = Utils.somar(totalCustasJudiciais, debitosCobrarDoReclamante.getDevidoCustasJudiciais(), totalCustasJudiciais);
        } else if (this.pagamento.getSelecionarCustasJudiciaisDebitosCobrarDoReclamante().booleanValue() && !this.pagamento.getApurarCustasJudiciaisDebitosCobrarDoReclamante().booleanValue()) {
            this.valorParaPagamentoDebitosCobrarDoReclamanteCustasJudiciais = this.pagamento.getCustasJudiciaisDebitosCobrarDoReclamante();
            totalFixoDebitosCobrarDoReclamante = Utils.somar(totalFixoDebitosCobrarDoReclamante, this.pagamento.getCustasJudiciaisDebitosCobrarDoReclamante(), totalFixoDebitosCobrarDoReclamante);
        }
        HashMap<Multa, BigDecimal> totaisDasMultas = new HashMap<Multa, BigDecimal>();
        for (MultaDoPagamento multaDoPagamento : this.pagamento.getMultasDevidasTerceirosDebitosCobrarDoReclamante()) {
            if (!multaDoPagamento.getApurarMulta().booleanValue()) {
                this.valoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros.put(multaDoPagamento.getMulta(), multaDoPagamento.getValorMulta());
                totalFixoDebitosCobrarDoReclamante = Utils.somar(totalFixoDebitosCobrarDoReclamante, multaDoPagamento.getValorMulta(), totalFixoDebitosCobrarDoReclamante);
                continue;
            }
            BigDecimal totalDevidoDaMulta = BigDecimal.ZERO;
            MultaDaAtualizacao multaAtualizacao = this.referenciaEntreMultaEMultaDaAtualizacao.get(multaDoPagamento.getMulta());
            if (TipoValorEnum.CALCULADO.equals((Object)multaAtualizacao.getMulta().getTipoValorDaMulta())) {
                if (multaAtualizacao.getValorRemanescenteMulta() == null || debitosCobrarDoReclamante.getDataFinalPeriodo().equals(multaAtualizacao.getMulta().getDataEvento()) && debitosCobrarDoReclamante.getDataInicialPeriodo().equals(debitosCobrarDoReclamante.getDataFinalPeriodo()) || debitosCobrarDoReclamante.getDataInicialPeriodo().equals(debitosCobrarDoReclamante.getCalculo().getDataDeLiquidacao())) {
                    totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, multaAtualizacao.getDevidoCalculada(), totalDevidoDaMulta);
                } else {
                    totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, multaAtualizacao.getDevidoCalculadaRemanescente(debitosCobrarDoReclamante.getIndiceDeCorrecao()), totalDevidoDaMulta);
                    totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, multaAtualizacao.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : debitosCobrarDoReclamante.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(multaAtualizacao.getMulta().getAliquotaMulta().divide(Utils.CEM)), totalDevidoDaMulta);
                }
            } else if (TipoValorEnum.INFORMADO.equals((Object)multaAtualizacao.getMulta().getTipoValorDaMulta())) {
                totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, Utils.arredondarValorMonetario(Utils.multiplicar(multaAtualizacao.getValorMulta(), debitosCobrarDoReclamante.getIndiceDeCorrecao())), totalDevidoDaMulta);
                if (!debitosCobrarDoReclamante.getDataFinalPeriodo().equals(multaAtualizacao.getMulta().getDataEvento())) {
                    totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, Utils.arredondarValorMonetario(Utils.multiplicar(multaAtualizacao.getValorJuros(), debitosCobrarDoReclamante.getIndiceDeCorrecao())), totalDevidoDaMulta);
                    BigDecimal base = multaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaAtualizacao.getValorMulta(), debitosCobrarDoReclamante.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                    BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, multaAtualizacao.getTaxaJurosMulta().divide(Utils.CEM)));
                    totalDevidoDaMulta = Utils.somar(totalDevidoDaMulta, dev, totalDevidoDaMulta);
                }
            }
            totaisDasMultas.put(multaAtualizacao.getMulta(), totalDevidoDaMulta);
            if (Utils.nulo(valoresParaRatear[1])) {
                valoresParaRatear[1] = totalDevidoDaMulta;
                continue;
            }
            valoresParaRatear[1] = Utils.somar(valoresParaRatear[1], totalDevidoDaMulta, valoresParaRatear[1]);
        }
        HashMap<Honorario, BigDecimal> totaisDosHonorarios = new HashMap<Honorario, BigDecimal>();
        for (HonorarioDoPagamento honorarioPagamento : this.pagamento.getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante()) {
            if (!honorarioPagamento.getApurarHonorario().booleanValue()) {
                this.valoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios.put(honorarioPagamento.getHonorario(), honorarioPagamento.getValorHonorario());
                totalFixoDebitosCobrarDoReclamante = Utils.somar(totalFixoDebitosCobrarDoReclamante, honorarioPagamento.getValorHonorario(), totalFixoDebitosCobrarDoReclamante);
                continue;
            }
            BigDecimal totalDevidoDoHonorario = BigDecimal.ZERO;
            HonorarioDaAtualizacao honorarioAtualizacao = this.referenciaEntreHonorarioEHonorarioDaAtualizacao.get(honorarioPagamento.getHonorario());
            if (TipoValorEnum.CALCULADO.equals((Object)honorarioAtualizacao.getHonorario().getTipoValor())) {
                if (honorarioAtualizacao.getValorRemanescenteHonorario() == null || debitosCobrarDoReclamante.getDataFinalPeriodo().equals(honorarioAtualizacao.getHonorario().getDataEvento()) && debitosCobrarDoReclamante.getDataInicialPeriodo().equals(debitosCobrarDoReclamante.getDataFinalPeriodo()) || debitosCobrarDoReclamante.getDataInicialPeriodo().equals(debitosCobrarDoReclamante.getCalculo().getDataDeLiquidacao())) {
                    totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, honorarioAtualizacao.getDevidoCalculada(), totalDevidoDoHonorario);
                } else {
                    totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, honorarioAtualizacao.getDevidoCalculadaRemanescente(debitosCobrarDoReclamante.getIndiceDeCorrecao()), totalDevidoDoHonorario);
                    totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, debitosCobrarDoReclamante.getCreditosDoReclamante().getDevidoMultaCalculadaSobreJurosDoPeriodo(honorarioAtualizacao.getHonorario().getAliquota().divide(Utils.CEM)), totalDevidoDoHonorario);
                    totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.calcularHonorariosSobreMultas(debitosCobrarDoReclamante.getCreditosDoReclamante()), honorarioAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), totalDevidoDoHonorario);
                }
            } else if (TipoValorEnum.INFORMADO.equals((Object)honorarioAtualizacao.getHonorario().getTipoValor())) {
                totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), debitosCobrarDoReclamante.getIndiceDeCorrecao())), totalDevidoDoHonorario);
                if (!debitosCobrarDoReclamante.getDataFinalPeriodo().equals(honorarioAtualizacao.getHonorario().getDataEvento())) {
                    totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorJuros(), debitosCobrarDoReclamante.getIndiceDeCorrecao())), totalDevidoDoHonorario);
                    BigDecimal base = honorarioAtualizacao.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), debitosCobrarDoReclamante.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                    BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, honorarioAtualizacao.getTaxaJurosHonorario().divide(Utils.CEM)));
                    totalDevidoDoHonorario = Utils.somar(totalDevidoDoHonorario, dev, totalDevidoDoHonorario);
                }
            }
            totaisDosHonorarios.put(honorarioAtualizacao.getHonorario(), totalDevidoDoHonorario);
            if (Utils.nulo(valoresParaRatear[2])) {
                valoresParaRatear[2] = totalDevidoDoHonorario;
                continue;
            }
            valoresParaRatear[2] = Utils.somar(valoresParaRatear[2], totalDevidoDoHonorario, valoresParaRatear[2]);
        }
        BigDecimal bigDecimal2 = this.pagamento.getValorParcelaDebitosCobrarDoReclamante();
        bigDecimal2 = Utils.subtrair(bigDecimal2, totalFixoDebitosCobrarDoReclamante, bigDecimal2);
        HashMap<Integer, Integer> mapaDeIndices = new HashMap<Integer, Integer>();
        int contadorDeNaoNulos = 0;
        for (int i = 0; i < 3; ++i) {
            if (!Utils.naoNulo(valoresParaRatear[i])) continue;
            mapaDeIndices.put(i, contadorDeNaoNulos++);
        }
        BigDecimal[] valoresNaoNulosParaRateio = new BigDecimal[contadorDeNaoNulos];
        for (int i = 0; i < 3; ++i) {
            if (!Utils.naoNulo(valoresParaRatear[i])) continue;
            valoresNaoNulosParaRateio[((Integer)mapaDeIndices.get((Object)Integer.valueOf((int)i))).intValue()] = valoresParaRatear[i];
        }
        BigDecimal[] valoresRateados = PagamentoUtils.ratearValor(bigDecimal2, valoresNaoNulosParaRateio);
        if (this.pagamento.getApurarCustasJudiciaisDebitosCobrarDoReclamante().booleanValue()) {
            this.valorParaPagamentoDebitosCobrarDoReclamanteCustasJudiciais = valoresRateados[(Integer)mapaDeIndices.get(0)];
        }
        if (!totaisDasMultas.isEmpty()) {
            valoresParaRateio = new BigDecimal[totaisDasMultas.size()];
            contador = 0;
            for (Map.Entry entry : totaisDasMultas.entrySet()) {
                valoresParaRateio[contador] = (BigDecimal)entry.getValue();
                ++contador;
            }
            BigDecimal[] valoresRateadosMulta = PagamentoUtils.ratearValor(valoresRateados[(Integer)mapaDeIndices.get(1)], valoresParaRateio);
            contador = 0;
            for (Map.Entry entry : totaisDasMultas.entrySet()) {
                this.valoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros.put((Multa)entry.getKey(), valoresRateadosMulta[contador++]);
            }
        }
        if (!totaisDosHonorarios.isEmpty()) {
            valoresParaRateio = new BigDecimal[totaisDosHonorarios.size()];
            contador = 0;
            for (Map.Entry entry : totaisDosHonorarios.entrySet()) {
                valoresParaRateio[contador] = (BigDecimal)entry.getValue();
                ++contador;
            }
            BigDecimal[] valoresRateadosHonorario = PagamentoUtils.ratearValor(valoresRateados[(Integer)mapaDeIndices.get(2)], valoresParaRateio);
            contador = 0;
            for (Map.Entry entry : totaisDosHonorarios.entrySet()) {
                this.valoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios.put((Honorario)entry.getKey(), valoresRateadosHonorario[contador++]);
            }
        }
    }

    public Pagamento getPagamento() {
        return this.pagamento;
    }

    public BigDecimal getValorParaPagamentoCreditoReclamantePrincipal() {
        return this.valorParaPagamentoCreditoReclamantePrincipal;
    }

    public BigDecimal getValorParaPagamentoCreditoReclamanteFgts() {
        return this.valorParaPagamentoCreditoReclamanteFgts;
    }

    public BigDecimal getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante() {
        return this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante;
    }

    public BigDecimal getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado() {
        return this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado;
    }

    public BigDecimal getProporcaoGeralParaRecolhimentos() {
        return this.proporcaoGeralParaRecolhimentosDebitosReclamante;
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamanteCustasJudiciais() {
        return this.valorParaRecolhimentoDebitosReclamanteCustasJudiciais;
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamanteDepositoDeFgts() {
        return this.valorParaRecolhimentoDebitosReclamanteDepositoDeFgts;
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial() {
        return this.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial;
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamantePrevidenciaPrivada() {
        return this.valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada;
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamantePensaoAlimenticia() {
        return this.valorParaRecolhimentoDebitosReclamantePensaoAlimenticia;
    }

    public BigDecimal getValorParaRecolhimentoDebitosReclamanteImpostoDoReclamante() {
        return this.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante;
    }

    public Map<Multa, BigDecimal> getValoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros() {
        return this.valoresParaRecolhimentoDebitosReclamanteDeMultasDevidasATerceiros;
    }

    public Map<Honorario, BigDecimal> getValoresParaRecolhimentoDebitosReclamanteDeHonorarios() {
        return this.valoresParaRecolhimentoDebitosReclamanteDeHonorarios;
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoCustasJudiciais() {
        return this.valorParaPagamentoOutrosDebitosReclamadoCustasJudiciais;
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosDevidos() {
        return this.valorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosDevidos;
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosPagos() {
        return this.valorParaPagamentoOutrosDebitosReclamadoInssSobreSalariosPagos;
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoJurosDePrevidenciaPrivada() {
        return this.valorParaPagamentoOutrosDebitosReclamadoJurosDePrevidenciaPrivada;
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoImpostoDeRendaDoReclamante() {
        return this.valorParaPagamentoOutrosDebitosReclamadoImpostoDeRendaDoReclamante;
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoInssDezPorcento() {
        return this.valorParaPagamentoOutrosDebitosReclamadoInssDezPorcento;
    }

    public BigDecimal getValorParaPagamentoOutrosDebitosReclamadoInssMeioPorcento() {
        return this.valorParaPagamentoOutrosDebitosReclamadoInssMeioPorcento;
    }

    public Map<Multa, BigDecimal> getValoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros() {
        return this.valoresParaPagamentoOutrosDebitosReclamadoDeMultasDevidasATerceiros;
    }

    public Map<Honorario, BigDecimal> getValoresParaPagamentoOutrosDebitosReclamadoDeHonorarios() {
        return this.valoresParaPagamentoOutrosDebitosReclamadoDeHonorarios;
    }

    public BigDecimal getValorParaPagamentoDebitosCobrarDoReclamanteCustasJudiciais() {
        return this.valorParaPagamentoDebitosCobrarDoReclamanteCustasJudiciais;
    }

    public Map<Multa, BigDecimal> getValoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros() {
        return this.valoresParaPagamentoDebitosCobrarDoReclamanteDeMultasDevidasATerceiros;
    }

    public Map<Honorario, BigDecimal> getValoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios() {
        return this.valoresParaPagamentoDebitosCobrarDoReclamanteDeHonorarios;
    }

    public BigDecimal getProporcaoOutrosParaRecolhimentosDebitosReclamante() {
        return this.proporcaoOutrosParaRecolhimentosDebitosReclamante;
    }

    public BigDecimal getProporcaoMultasParaRecolhimentosDebitosReclamante() {
        return this.proporcaoMultasParaRecolhimentosDebitosReclamante;
    }
}

