/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Embeddable
 *  javax.persistence.FetchType
 *  javax.persistence.JoinColumn
 *  javax.persistence.OneToMany
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoIntegralizar;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeGeracaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVariacaoDaParcelaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TratamentoDaFracaoDeMesDoReflexoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.SimuladorDeBaseParaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Principal;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Embeddable;
import javax.persistence.FetchType;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;

@Embeddable
public class BaseVerba
implements Termo {
    private static final long serialVersionUID = 4530097350507174470L;
    private static final BigDecimal TRINTA_DIAS = new BigDecimal("30");
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL})
    @JoinColumn(name="IIDFORMULA")
    private List<ItemBaseVerba> itens = new ArrayList<ItemBaseVerba>();

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        BigDecimal valor = BigDecimal.ZERO;
        BigDecimal valorIntegral = null;
        BigDecimal valorMedia = BigDecimal.ZERO;
        for (ItemBaseVerba item : this.getItens()) {
            BigDecimal valorDaBaseIntegral;
            BigDecimal valorDaBase;
            VerbaDeCalculo base;
            if (Utils.nulo(valorIntegral)) {
                valorIntegral = BigDecimal.ZERO;
            }
            if (!(base = item.getVerbaDeCalculo()).isLiquidado()) {
                base.liquidar();
            }
            if (Utils.naoNulo((Object)base.getTipoVariacaoParcela()) && !TipoVariacaoDaParcelaEnum.FIXA.equals((Object)base.getTipoVariacaoParcela()) && Utils.naoNulo(parametro.getPeriodoParaMedia())) {
                LogicoEnum indicaIntegralizacao = item.getIntegralizar();
                if (parametro.getVerbaDeCalculo() instanceof Reflexo) {
                    indicaIntegralizacao = TratamentoDaFracaoDeMesDoReflexoEnum.INTEGRALIZAR.equals((Object)((Reflexo)parametro.getVerbaDeCalculo()).getTratamentoDaFracaoDeMesDoReflexo()) ? LogicoEnum.SIM : LogicoEnum.NAO;
                }
                valorMedia = Utils.somar(valorMedia, Utils.multiplicar(ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(parametro.getPeriodoParaMedia().getFinal(), parametro.getPeriodo().getInicial()), this.calcularMedia(base, parametro.getPeriodoParaMedia(), indicaIntegralizacao)), valorMedia);
                continue;
            }
            if (parametro.getVerbaDeCalculo() instanceof Principal) {
                valorDaBase = BigDecimal.ZERO;
                valorDaBaseIntegral = BigDecimal.ZERO;
                long diasDaOcorrenciaVerbaPrincipal = HelperDate.getInstance(parametro.getPeriodo().getFinal()).subtractDays(parametro.getPeriodo().getInicial()) + 1L;
                List<Periodo> periodosOcorrenciaDaVerbaPrincipal = HelperDate.breakInMonths(parametro.getPeriodo().getInicial(), parametro.getPeriodo().getFinal());
                for (Periodo periodoOcorrenciaDaVerbaPrincipal : periodosOcorrenciaDaVerbaPrincipal) {
                    BigDecimal valorDoPeriodo = BigDecimal.ZERO;
                    BigDecimal valorDoPeriodoIntegral = null;
                    HashSet<Date> diasCobertos = new HashSet<Date>();
                    int diasParaExcluir = 0;
                    List<OcorrenciaDeVerba> ocorrenciasDoPeriodo = base.obterOcorrenciasDoMes(periodoOcorrenciaDaVerbaPrincipal.getFinal());
                    for (OcorrenciaDeVerba ocorrencia : ocorrenciasDoPeriodo) {
                        if (!ocorrencia.getAtivo().booleanValue()) continue;
                        this.marcarDias(diasCobertos, ocorrencia);
                        diasParaExcluir += ocorrencia.verificaDiasParaExcluirDeAcordoComA(base);
                        BigDecimal valorDaOcorrencia = null;
                        BigDecimal valorDaOcorrenciaIntegral = null;
                        if (TipoDeGeracaoEnum.DEVIDO.equals((Object)base.getGerarPrincipal())) {
                            valorDaOcorrencia = ocorrencia.getDevido();
                            valorDaOcorrenciaIntegral = ocorrencia.getDevidoIntegral();
                        } else {
                            valorDaOcorrencia = ocorrencia.getDiferenca();
                            valorDaOcorrenciaIntegral = ocorrencia.getDiferencaIntegral();
                        }
                        valorDoPeriodo = valorDoPeriodo.add(valorDaOcorrencia, Utils.CONTEXTO_MATEMATICO);
                        if (!Utils.nulo(valorDoPeriodoIntegral)) continue;
                        valorDoPeriodoIntegral = valorDaOcorrenciaIntegral;
                    }
                    if (!diasCobertos.isEmpty()) {
                        if (LogicoEnum.SIM.equals((Object)item.getIntegralizar())) {
                            if (Utils.naoNulo(valorDoPeriodoIntegral)) {
                                valorDoPeriodo = valorDoPeriodoIntegral;
                            } else {
                                int qtdDias = diasCobertos.size();
                                if ((qtdDias -= diasParaExcluir) < 0) {
                                    qtdDias = 0;
                                }
                                if (qtdDias == 0) {
                                    Date inicioMes = HelperDate.getInstance(periodoOcorrenciaDaVerbaPrincipal.getFinal()).setDay(1).getDate();
                                    Date fimMes = HelperDate.getInstance(periodoOcorrenciaDaVerbaPrincipal.getFinal()).setDay(HelperDate.getInstance(periodoOcorrenciaDaVerbaPrincipal.getFinal()).daysInMonth()).getDate();
                                    Periodo mesVerbaBase = new Periodo(inicioMes, fimMes);
                                    valorDoPeriodo = SimuladorDeBaseParaVerba.obterValorTeoricoParaMesSemFeriasOuFaltas(base, mesVerbaBase, parametro);
                                } else {
                                    Periodo periodoCondensadoParaCalculoDaIntegralizacao = new Periodo(HelperDate.getCurrentCompetence(periodoOcorrenciaDaVerbaPrincipal.getFinal()), HelperDate.getCurrentCompetence(periodoOcorrenciaDaVerbaPrincipal.getFinal()).setDay(diasCobertos.size()));
                                    CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(periodoCondensadoParaCalculoDaIntegralizacao, valorDoPeriodo, diasParaExcluir);
                                    integralizar.executar();
                                    valorDoPeriodo = integralizar.getResultado();
                                }
                                valorDoPeriodoIntegral = valorDoPeriodo;
                            }
                        }
                    } else {
                        valorDoPeriodo = BigDecimal.ZERO;
                        valorDoPeriodoIntegral = BigDecimal.ZERO;
                    }
                    long diasPeriodo = periodoOcorrenciaDaVerbaPrincipal.totalDeDias();
                    if (CaracteristicaDaVerbaEnum.FERIAS.equals((Object)parametro.getVerbaDeCalculo().getCaracteristica()) && !RegimeDoContratoEnum.INTERMITENTE.equals((Object)parametro.getCalculo().getRegimeDoContrato())) {
                        if (HelperDate.dateEquals(parametro.getPeriodo().getInicial(), parametro.getPeriodo().getFinal()) && Utils.naoNulo(parametro.getCalculo().getDataDemissao()) && HelperDate.dateEquals(parametro.getPeriodo().getInicial(), parametro.getCalculo().getDataDemissao())) {
                            boolean encontrouFerias = false;
                            for (Ferias ferias : parametro.getCalculo().getListaDeFerias()) {
                                if (!ferias.getPeriodoAquisitivo().isMesmoPeriodo(parametro.getPeriodoAquisitivo())) continue;
                                encontrouFerias = true;
                                if (!parametro.isFeriasIndenizadas()) break;
                                Integer totalDeDias = ferias.getPrazo();
                                if (ferias.getPeriodoDeGozo1() != null) {
                                    totalDeDias = totalDeDias - ferias.getPeriodoDeGozo1().totalDeDias();
                                }
                                if (ferias.getPeriodoDeGozo2() != null) {
                                    totalDeDias = totalDeDias - ferias.getPeriodoDeGozo2().totalDeDias();
                                }
                                if (ferias.getPeriodoDeGozo3() != null) {
                                    totalDeDias = totalDeDias - ferias.getPeriodoDeGozo3().totalDeDias();
                                }
                                if (ferias.getAbono().booleanValue()) {
                                    totalDeDias = totalDeDias - ferias.getQuantidadeDiasAbono();
                                }
                                valorDoPeriodo = valorDoPeriodo.multiply(new BigDecimal(totalDeDias), Utils.CONTEXTO_MATEMATICO);
                                valorDoPeriodoIntegral = Utils.multiplicar(valorDoPeriodoIntegral, new BigDecimal(totalDeDias));
                                break;
                            }
                            if (!encontrouFerias) {
                                int prazo = Ferias.encontrarPrazoFeriasProporcionais(parametro);
                                valorDoPeriodo = Utils.multiplicar(valorDoPeriodo, new BigDecimal(prazo));
                                valorDoPeriodoIntegral = Utils.multiplicar(valorDoPeriodoIntegral, new BigDecimal(prazo));
                            }
                        } else {
                            valorDoPeriodo = Utils.multiplicar(valorDoPeriodo, new BigDecimal(diasPeriodo));
                            valorDoPeriodoIntegral = Utils.multiplicar(valorDoPeriodoIntegral, new BigDecimal(diasPeriodo));
                        }
                        valorDaBase = valorDaBase.add(valorDoPeriodo, Utils.CONTEXTO_MATEMATICO);
                        valorDaBaseIntegral = valorDaBaseIntegral.add(valorDoPeriodoIntegral, Utils.CONTEXTO_MATEMATICO);
                        continue;
                    }
                    valorDaBase = valorDaBase.add(Utils.multiplicar(valorDoPeriodo, new BigDecimal(diasPeriodo)), Utils.CONTEXTO_MATEMATICO);
                    valorDaBaseIntegral = valorDaBaseIntegral.add(Utils.multiplicar(valorDoPeriodoIntegral, new BigDecimal(diasPeriodo)), Utils.CONTEXTO_MATEMATICO);
                }
                if (CaracteristicaDaVerbaEnum.FERIAS.equals((Object)parametro.getVerbaDeCalculo().getCaracteristica()) && !RegimeDoContratoEnum.INTERMITENTE.equals((Object)parametro.getCalculo().getRegimeDoContrato())) {
                    valorDaBase = valorDaBase.divide(TRINTA_DIAS, Utils.CONTEXTO_MATEMATICO);
                    valorDaBaseIntegral = valorDaBaseIntegral.divide(TRINTA_DIAS, Utils.CONTEXTO_MATEMATICO);
                } else {
                    valorDaBase = valorDaBase.divide(new BigDecimal(diasDaOcorrenciaVerbaPrincipal), Utils.CONTEXTO_MATEMATICO);
                    valorDaBaseIntegral = valorDaBaseIntegral.divide(new BigDecimal(diasDaOcorrenciaVerbaPrincipal), Utils.CONTEXTO_MATEMATICO);
                }
            } else {
                valorDaBaseIntegral = valorDaBase = ((Reflexo)parametro.getVerbaDeCalculo()).getComportamentoDoReflexo().criarProxyDoComportamentoDoReflexo().resolverValor(item, parametro);
            }
            valor = valor.add(valorDaBase, Utils.CONTEXTO_MATEMATICO);
            valorIntegral = valorIntegral.add(valorDaBaseIntegral, Utils.CONTEXTO_MATEMATICO);
        }
        if (Utils.naoNulo(valorIntegral)) {
            if (Utils.naoNulo(parametro.getValorIntegral())) {
                parametro.setValorIntegral(parametro.getValorIntegral().add(valorIntegral, Utils.CONTEXTO_MATEMATICO));
            } else {
                parametro.setValorIntegral(valorIntegral);
            }
        }
        return Utils.somar(valor, valorMedia);
    }

    public List<ItemBaseVerba> getItens() {
        return this.itens;
    }

    public void setItens(List<ItemBaseVerba> itens) {
        this.itens = itens;
    }

    private void marcarDias(Set<Date> diasCobertos, OcorrenciaDeVerba ocorrencia) {
        HelperDate auxiliarInicio = HelperDate.getInstance(ocorrencia.getDataInicial());
        HelperDate auxiliarFim = HelperDate.getInstance(ocorrencia.getDataFinal());
        auxiliarInicio.removeTime();
        auxiliarFim.removeTime();
        while (auxiliarInicio.lessThanOrEqualsTo(auxiliarFim)) {
            diasCobertos.add(auxiliarInicio.getDate());
            auxiliarInicio.addDay(1);
        }
    }

    private BigDecimal calcularMedia(VerbaDeCalculo base, Periodo periodoParaMedia, LogicoEnum integraliza) {
        BigDecimal media = BigDecimal.ZERO;
        boolean ehPossivelTerMudancaDeMoeda = HelperDate.dateBeforeOrEquals(periodoParaMedia.getInicial(), ConversaoDeMoedas.obterDataUltimaConversaoDeMoeda());
        List<Periodo> periodos = HelperDate.breakInMonths(periodoParaMedia.getInicial(), periodoParaMedia.getFinal());
        HashMap<Date, BigDecimal> valorOcorrencias = new HashMap<Date, BigDecimal>();
        for (OcorrenciaDeVerba ocorrencia : base.getOcorrencias()) {
            if (LogicoEnum.SIM.equals((Object)integraliza)) {
                valorOcorrencias.put(HelperDate.getCurrentCompetence(ocorrencia.getDataInicial()).getDate(), TipoDeGeracaoEnum.DEVIDO.equals((Object)base.getGerarPrincipal()) ? ocorrencia.getDevidoIntegral() : ocorrencia.getDiferencaIntegral());
                continue;
            }
            valorOcorrencias.put(HelperDate.getCurrentCompetence(ocorrencia.getDataInicial()).getDate(), TipoDeGeracaoEnum.DEVIDO.equals((Object)base.getGerarPrincipal()) ? ocorrencia.getDevido() : ocorrencia.getDiferenca());
        }
        for (Periodo p : periodos) {
            HelperDate competencia = HelperDate.getCurrentCompetence(p.getInicial());
            HelperDate proximaCompetencia = competencia.clone().addMonth(1);
            if (ehPossivelTerMudancaDeMoeda) {
                media = Utils.somar(media, Utils.multiplicar((BigDecimal)valorOcorrencias.get(competencia.getDate()), ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(proximaCompetencia.getDate(), periodoParaMedia.getFinal())), media);
                continue;
            }
            media = Utils.somar(media, (BigDecimal)valorOcorrencias.get(competencia.getDate()), media);
        }
        if (!periodos.isEmpty()) {
            media = Utils.dividir(media, new BigDecimal(periodos.size()));
        }
        return media;
    }
}

