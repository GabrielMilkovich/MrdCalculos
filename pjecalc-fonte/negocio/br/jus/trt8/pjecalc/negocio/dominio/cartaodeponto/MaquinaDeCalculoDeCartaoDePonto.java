/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.StringUtils
 *  org.jboss.seam.annotations.Logger
 *  org.jboss.seam.log.Log
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.Constantes;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.CartoesDePontoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.FormaDeApuracaoCartaoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ExcecaoDoSabadoDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoDiariaCartao;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePontoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ExcecaoDoFechamentoDeCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.JornadaDiaria;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaDoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaJornadaApuracaoCartao;
import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.apache.commons.lang.StringUtils;
import org.jboss.seam.annotations.Logger;
import org.jboss.seam.log.Log;

public class MaquinaDeCalculoDeCartaoDePonto
implements Serializable {
    private static final Integer[] DIAS_DA_SEMANA_INICIANDO_SEGUNDA = new Integer[]{2, 3, 4, 5, 6, 7, 1};
    private static final int DIA_DA_SEMANA_INDEFINIDO = -1;
    private static final int NUMERO_MAXIMO_DE_ENTRADAS_E_SAIDAS_DE_TURNOS = 12;
    private static final int INCREMENTO_PARA_PROXIMO_TURNO = 2;
    private static final int QUANTIDADE_DIAS_SEMANA = 7;
    private static final int DUAS_CASAS_DECIMAIS = 2;
    private static final int FIM_SEGUNDO_TURNO = 3;
    private static final int FIM_TERCEIRO_TURNO = 5;
    private static final int FIM_QUARTO_TURNO = 7;
    private static final int FIM_QUINTO_TURNO = 9;
    private static final int FIM_SEXTO_TURNO = 11;
    private static final long serialVersionUID = 7371266262675935059L;
    @Logger
    private Log log;
    private static final BigDecimal QUATRO_HORAS_MILLIS = new BigDecimal("14400000");
    private static final BigDecimal SEIS_HORAS_MILLIS = new BigDecimal("21600000");
    private static final BigDecimal QUINZE_MINUTOS_MILLIS = new BigDecimal("900000");
    private static final BigDecimal UMA_HORA_E_TRINTA_MINUTOS_MILLIS = new BigDecimal("5400000");
    private static final BigDecimal DEZ_MINUTOS_MILLIS = new BigDecimal("600000");
    private static final BigDecimal VINTE_QUATRO_HORAS_MILLIS = new BigDecimal("86400000");
    private static final BigDecimal QUARENTA_OITO_HORAS_MILLIS = new BigDecimal("172800000");
    private static final BigDecimal FATOR_HORA_FICTA = new BigDecimal("1.142857");
    private Map<Date, ApuracaoDiariaCartao> mapaDataApuracaoDiaria = new TreeMap<Date, ApuracaoDiariaCartao>();
    private Map<Date, HelperDate> mapaDataFechamentoDiario = new HashMap<Date, HelperDate>();
    private Map<Date, Periodo> mapaDataFechamentoMensal = new HashMap<Date, Periodo>();
    private boolean horarioNoturnoTotal = false;
    private boolean noturnoProrrogado = false;
    private BigDecimal qtHorasNoturnasTrabalhadas;

    public void processarApuracaoCartaoDePonto(Calculo calculo) {
        this.mapaDataApuracaoDiaria.clear();
        this.montarMapaFechamento(calculo);
        for (ApuracaoCartaoDePonto acp : calculo.getApuracoesCartaoDePonto()) {
            OcorrenciaJornadaApuracaoCartao ojacAnterior = null;
            OcorrenciaJornadaApuracaoCartao ojacDoisDiasAntes = null;
            for (OcorrenciaJornadaApuracaoCartao ojac : acp.getOcorrenciasJornadaApuracaoCartao()) {
                if (Utils.naoVazio(ojac.getHrEntrada1())) {
                    ojac = this.horasTrabalhadas(ojac);
                    ojac.setCargaMillis(this.obterCargaDiaria(ojac.getApuracaoCartaoDePonto(), HelperDate.getInstance(ojac.getDataOcorrencia()), ojac.getQtHorasTotalMillis()));
                    ojac.setToleranciaMillis(this.obterTolerancia(ojac));
                    this.processarHorasExtras(ojac);
                    ojac.setHorasInterjornadasMillis(this.calcularInterJornadas(ojac, ojacAnterior, ojacDoisDiasAntes));
                    this.processarIntraJornada(ojac);
                    ojac.setHorasArtigo384Millis(this.calcularArt384(ojac));
                    ojac.setHorasArtigo253Millis(this.calcularArt253(ojac));
                    ojac.setHorasArtigo72Millis(this.calcularArt72(ojac));
                }
                ojacDoisDiasAntes = ojacAnterior;
                ojacAnterior = ojac;
                this.mapaDataApuracaoDiaria.put(ojac.getDataOcorrencia(), this.gerarRegistroApuracaoDiaria(calculo, ojac));
            }
            switch (acp.getFormaDeApuracaoCartao()) {
                case HORAS_EXTRAS_PELO_CRITERIO_MAIS_FAVORAVEL: 
                case HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_SEMANAL: 
                case HORAS_EXTRAS_CONFORME_SUMULA_85: {
                    this.realizarProcessamentoSemanal(acp);
                    break;
                }
                case HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_MENSAL: {
                    this.realizarProcessamentoMensal(acp);
                    break;
                }
            }
        }
        this.salvarApuracoesDiarias();
        this.montarCartoesDePonto(calculo);
    }

    private void montarMapaFechamento(Calculo calculo) {
        this.mapaDataFechamentoDiario.clear();
        this.mapaDataFechamentoMensal.clear();
        Periodo periodoCalculo = calculo.obterPeriodoSugestivoDoCalculo();
        this.montarMapaFechamentoDasExcecoes(calculo);
        HelperDate dataAuxiliar = HelperDate.getCurrentCompetence(periodoCalculo.getInicial());
        Date competenciaFimCalculo = HelperDate.getCurrentCompetence(periodoCalculo.getFinal()).getDate();
        HelperDate fechamentoAuxiliar = null;
        while (!dataAuxiliar.greaterThen(competenciaFimCalculo)) {
            Periodo periodoFechamentoMensal = this.mapaDataFechamentoMensal.get(dataAuxiliar.getDate());
            if (Utils.nulo(periodoFechamentoMensal)) {
                Periodo mes = new Periodo();
                if (Utils.nulo(fechamentoAuxiliar)) {
                    mes.setInicial(periodoCalculo.getInicial());
                } else {
                    mes.setInicial(fechamentoAuxiliar.addDay(1).getDate());
                }
                fechamentoAuxiliar = dataAuxiliar.lastDayOfTheMonth();
                if (calculo.getDiaFechamentoMes() < fechamentoAuxiliar.getDay()) {
                    fechamentoAuxiliar.setDay(calculo.getDiaFechamentoMes());
                }
                if (HelperDate.compareMonthAndYear(dataAuxiliar.getDate(), periodoCalculo.getFinal())) {
                    fechamentoAuxiliar = HelperDate.getInstance(periodoCalculo.getFinal());
                }
                if (HelperDate.dateBeforeOrEquals(periodoCalculo.getInicial(), fechamentoAuxiliar.getDate())) {
                    mes.setFinal(fechamentoAuxiliar.getDate());
                    this.mapaDataFechamentoMensal.put(dataAuxiliar.clone().getDate(), mes);
                }
            } else {
                fechamentoAuxiliar = HelperDate.getInstance(periodoFechamentoMensal.getFinal());
            }
            dataAuxiliar.addMonth(1);
        }
        dataAuxiliar = HelperDate.getInstance(periodoCalculo.getInicial());
        while (!dataAuxiliar.greaterThen(periodoCalculo.getFinal())) {
            if (Utils.nulo(this.mapaDataFechamentoDiario.get(dataAuxiliar.getDate()))) {
                fechamentoAuxiliar = dataAuxiliar.getDay() > calculo.getDiaFechamentoMes() ? dataAuxiliar.clone().setDay(1).addMonth(1).lastDayOfTheMonth() : dataAuxiliar.lastDayOfTheMonth();
                if (calculo.getDiaFechamentoMes() < fechamentoAuxiliar.getDay()) {
                    fechamentoAuxiliar.setDay(calculo.getDiaFechamentoMes());
                }
                this.mapaDataFechamentoDiario.put(dataAuxiliar.clone().getDate(), fechamentoAuxiliar.clone());
            }
            dataAuxiliar.addDay(1);
        }
    }

    private Periodo obterUltimoPeriodo(Map<Date, Periodo> mapPeriodos) {
        TreeMap<Date, Periodo> mapaOrdenado = new TreeMap<Date, Periodo>(mapPeriodos);
        return mapaOrdenado.lastEntry().getValue();
    }

    private void montarMapaFechamentoDasExcecoes(Calculo calculo) {
        Periodo periodoCalculo = calculo.obterPeriodoSugestivoDoCalculo();
        ExcecaoDoFechamentoDeCartaoDePonto excecaoAnterior = null;
        for (ExcecaoDoFechamentoDeCartaoDePonto excecao : calculo.getExcecoesDoFechamentoDeCartaoDePonto()) {
            HelperDate dataAuxiliar = HelperDate.getCurrentCompetence(excecao.getDataInicioExcecao());
            HelperDate fimPeriodoExcecao = HelperDate.getCurrentCompetence(excecao.getDataTerminoExcecao());
            HelperDate fechamentoAuxiliar = null;
            fechamentoAuxiliar = excecaoAnterior != null && HelperDate.compareMonthAndYear(HelperDate.getInstance(dataAuxiliar.getDate()).addMonth(-1).getDate(), excecaoAnterior.getDataTerminoExcecao()) ? HelperDate.getInstance(this.obterUltimoPeriodo(this.mapaDataFechamentoMensal).getFinal()) : HelperDate.getCurrentCompetence(excecao.getDataInicioExcecao()).addMonth(-1).setDay(calculo.getDiaFechamentoMes());
            while (!dataAuxiliar.greaterThen(fimPeriodoExcecao.getDate())) {
                Periodo mes = new Periodo();
                if (Utils.nulo(fechamentoAuxiliar)) {
                    mes.setInicial(dataAuxiliar.getDate());
                } else {
                    mes.setInicial(fechamentoAuxiliar.addDay(1).getDate());
                }
                fechamentoAuxiliar = dataAuxiliar.lastDayOfTheMonth();
                if (excecao.getDiaFechamentoMes() < fechamentoAuxiliar.getDay()) {
                    fechamentoAuxiliar.setDay(excecao.getDiaFechamentoMes());
                }
                if (HelperDate.compareMonthAndYear(dataAuxiliar.getDate(), periodoCalculo.getFinal())) {
                    fechamentoAuxiliar = HelperDate.getInstance(periodoCalculo.getFinal());
                }
                if (HelperDate.dateBefore(periodoCalculo.getInicial(), fechamentoAuxiliar.getDate())) {
                    mes.setFinal(fechamentoAuxiliar.getDate());
                    this.mapaDataFechamentoMensal.put(dataAuxiliar.clone().getDate(), mes);
                }
                dataAuxiliar.addMonth(1);
            }
            dataAuxiliar = HelperDate.getInstance(excecao.getDataInicioExcecao());
            fimPeriodoExcecao = HelperDate.getInstance(excecao.getDataTerminoExcecao()).lastDayOfTheMonth();
            while (!dataAuxiliar.greaterThen(fimPeriodoExcecao.getDate())) {
                fechamentoAuxiliar = dataAuxiliar.getDay() > excecao.getDiaFechamentoMes() ? dataAuxiliar.clone().setDay(1).addMonth(1).lastDayOfTheMonth() : dataAuxiliar.lastDayOfTheMonth();
                if (excecao.getDiaFechamentoMes() < fechamentoAuxiliar.getDay()) {
                    fechamentoAuxiliar.setDay(excecao.getDiaFechamentoMes());
                }
                this.mapaDataFechamentoDiario.put(dataAuxiliar.clone().getDate(), fechamentoAuxiliar.clone());
                dataAuxiliar.addDay(1);
            }
            excecaoAnterior = excecao;
        }
    }

    private ApuracaoDiariaCartao gerarRegistroApuracaoDiaria(Calculo calculo, OcorrenciaJornadaApuracaoCartao ojac) {
        ApuracaoDiariaCartao adc = new ApuracaoDiariaCartao();
        adc.setCalculo(calculo);
        adc.setDataOcorrencia(ojac.getDataOcorrencia());
        adc.setFrequenciaDiaria(ojac.formatarFrequencia());
        adc.setHorasTrabalhadas(this.transformarEmHoras(ojac.getQtHorasTotalMillis()));
        adc.setHorasNoturnas(this.transformarEmHoras(ojac.getQtHorasNoturnaMillis()));
        adc.setHorasProrrogNoturnas(this.ajustarArredondamentoHorasProrrogacaoNoturna(ojac));
        adc.setHorasExtrasDiaria(this.transformarEmHoras(ojac.getHorasExtrasMillis()));
        adc.setHorasPrimExtSeparado(this.transformarEmHoras(ojac.getPrimeirasHorasExtrasEmSeparadoMillis()));
        adc.setHorasAdicionalSumula85(this.transformarEmHoras(ojac.getAdicionalSumula85Millis()));
        adc.setHorasExtrasNoturna(this.transformarEmHoras(ojac.getHorasExtrasNoturnasMillis()));
        adc.setHorasDomingo(this.transformarEmHoras(ojac.getHorasExtrasRepouso()));
        adc.setHorasNoturnasDomingo(this.transformarEmHoras(ojac.getHorasExtrasNoturnasRepouso()));
        adc.setHorasFeriado(this.transformarEmHoras(ojac.getHorasExtrasFeriado()));
        adc.setHorasNoturnasFeriado(this.transformarEmHoras(ojac.getHorasExtrasNoturnasFeriado()));
        adc.setHorasDomingoFeriado(this.transformarEmHoras(ojac.getHorasExtrasFeriadoRepouso()));
        adc.setHorasExtrasSemanal(BigDecimal.ZERO);
        adc.setHorasExtrasMensal(BigDecimal.ZERO);
        adc.setHorasIntraJornada(this.transformarEmHoras(ojac.getHorasIntrajornadaMillis()));
        adc.setHorasExcessoIntraJornada(this.transformarEmHoras(ojac.getHorasExcessoIntrajornadaMillis()));
        adc.setHorasInterJornadas(this.transformarEmHoras(ojac.getHorasInterjornadasMillis()));
        adc.setHorasArt384(this.transformarEmHoras(ojac.getHorasArtigo384Millis()));
        adc.setHorasArt253(this.transformarEmHoras(ojac.getHorasArtigo253Millis()));
        adc.setHorasArt72(this.transformarEmHoras(ojac.getHorasArtigo72Millis()));
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        HelperDate data = HelperDate.getInstance(ojac.getDataOcorrencia());
        adc.setFeriadoConsiderado(acp.getConsiderarFeriados());
        if (BigDecimal.ZERO.compareTo(ojac.getQtHorasTotalMillis()) < 0) {
            boolean ehSabadoOuDomingo;
            boolean bl = ehSabadoOuDomingo = data.isSaturday() || data.isSunday();
            if (acp.getApurarDomingosTrabalhados().booleanValue() && data.isSunday() || acp.getApurarSabadosDomingosTrabalhados().booleanValue() && ehSabadoOuDomingo) {
                adc.setQtRepousoTrabalhado(1);
                if (acp.getApurarFeriadosTrabalhados().booleanValue()) {
                    adc.setQtFeriadoRepousoTrabalhado(1);
                }
            } else if (acp.getApurarFeriadosTrabalhados().booleanValue() && data.isHoliday()) {
                adc.setQtFeriadoTrabalhado(1);
                if (acp.getApurarDomingosTrabalhados().booleanValue() || acp.getApurarSabadosDomingosTrabalhados().booleanValue()) {
                    adc.setQtFeriadoRepousoTrabalhado(1);
                }
            }
        }
        adc.setApuracaoCartaoDePonto(acp);
        return adc;
    }

    private BigDecimal ajustarArredondamentoHorasProrrogacaoNoturna(OcorrenciaJornadaApuracaoCartao ojac) {
        BigDecimal horasTrabalhadas = this.transformarEmHoras(ojac.getQtHorasTotalMillis());
        BigDecimal horasDiurnas = this.transformarEmHoras(ojac.getQtHorasDiurnaMillis());
        BigDecimal horasNoturnas = this.transformarEmHoras(ojac.getQtHorasNoturnaMillis());
        BigDecimal horasProrrogacaoNoturna = Utils.subtrair(horasTrabalhadas, horasDiurnas);
        horasProrrogacaoNoturna = Utils.subtrair(horasProrrogacaoNoturna, horasNoturnas);
        return horasProrrogacaoNoturna;
    }

    private BigDecimal transformarEmHoras(BigDecimal millis) {
        return Utils.arredondarValor(Utils.dividir(millis, new BigDecimal("3600000")), 2);
    }

    private BigDecimal calcularDiferencaMillis(String hrEntrada, String hrSaida) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm");
        String dataBase = "1970-01-01 ";
        String dataBaseDiaSeguinte = "1970-01-02 ";
        BigDecimal saidaMilis = Utils.converterHoraMinutoEmMilis(hrSaida);
        BigDecimal entradaMilis = Utils.converterHoraMinutoEmMilis(hrEntrada);
        Long diferencaMilis = 0L;
        try {
            diferencaMilis = saidaMilis.compareTo(entradaMilis) <= 0 ? Long.valueOf(sdf.parse(dataBaseDiaSeguinte + hrSaida).getTime() - sdf.parse(dataBase + hrEntrada).getTime()) : Long.valueOf(sdf.parse(dataBase + hrSaida).getTime() - sdf.parse(dataBase + hrEntrada).getTime());
        }
        catch (ParseException e) {
            this.log.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
        }
        return new BigDecimal(diferencaMilis);
    }

    private OcorrenciaJornadaApuracaoCartao horasTrabalhadas(OcorrenciaJornadaApuracaoCartao ojac) {
        this.horarioNoturnoTotal = this.verificarHorarioNoturnoTotal(ojac);
        this.noturnoProrrogado = false;
        this.qtHorasNoturnasTrabalhadas = BigDecimal.ZERO;
        ojac = this.separaDiurnaNoturna(ojac.getHrEntrada1(), ojac.getHrSaida1(), ojac, true);
        ojac = this.separaDiurnaNoturna(ojac.getHrEntrada2(), ojac.getHrSaida2(), ojac, false);
        ojac = this.separaDiurnaNoturna(ojac.getHrEntrada3(), ojac.getHrSaida3(), ojac, false);
        ojac = this.separaDiurnaNoturna(ojac.getHrEntrada4(), ojac.getHrSaida4(), ojac, false);
        ojac = this.separaDiurnaNoturna(ojac.getHrEntrada5(), ojac.getHrSaida5(), ojac, false);
        ojac = this.separaDiurnaNoturna(ojac.getHrEntrada6(), ojac.getHrSaida6(), ojac, false);
        return ojac;
    }

    private boolean hasHorasNoturnasComInicioDiurnoAnterior(OcorrenciaJornadaApuracaoCartao ojac, String hrEntrada, String hrSaida) {
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        BigDecimal hrInicioNoturnoMillis = Utils.converterHoraMinutoEmMilis(acp.obterInicioAtividadeHorarioNoturno());
        BigDecimal hrFimNoturnoMillis = Utils.converterHoraMinutoEmMilis(acp.obterFimAtividadeHorarioNoturno());
        int n = 0;
        String[] turnos = ojac.formatarFrequencia().split("\n");
        String[] stringArray = turnos;
        int n2 = stringArray.length;
        if (n < n2) {
            String turno = stringArray[n];
            if (turno.equalsIgnoreCase(hrEntrada + "-" + hrSaida)) {
                return false;
            }
            String[] splitted = turno.split("[-]");
            BigDecimal hrEntradaMillis = Utils.converterHoraMinutoEmMilis(splitted[0]);
            BigDecimal hrSaidaMillis = Utils.converterHoraMinutoEmMilis(splitted[1]);
            return hrEntradaMillis.compareTo(hrFimNoturnoMillis) >= 0 && hrEntradaMillis.compareTo(hrInicioNoturnoMillis) < 0 && (hrSaidaMillis.compareTo(hrInicioNoturnoMillis) > 0 || hrSaidaMillis.compareTo(hrEntradaMillis) <= 0);
        }
        return false;
    }

    private OcorrenciaJornadaApuracaoCartao separaDiurnaNoturna(String hrEntrada, String hrSaida, OcorrenciaJornadaApuracaoCartao ojacAnterior, boolean primeiro) {
        BigDecimal hrFimNoturnoMillis;
        BigDecimal hrSaidaMillis;
        OcorrenciaJornadaApuracaoCartao ojacNova = new OcorrenciaJornadaApuracaoCartao(ojacAnterior);
        if (!Utils.naoVazio(hrEntrada)) {
            ojacNova = ojacAnterior;
            return ojacNova;
        }
        ApuracaoCartaoDePonto acp = ojacNova.getApuracaoCartaoDePonto();
        BigDecimal hrEntradaMillis = Utils.converterHoraMinutoEmMilis(hrEntrada);
        BigDecimal hrSaidaMillisRelativo = hrSaidaMillis = Utils.converterHoraMinutoEmMilis(hrSaida);
        BigDecimal hrInicioNoturnoMillis = Utils.converterHoraMinutoEmMilis(acp.obterInicioAtividadeHorarioNoturno());
        BigDecimal hrFimNoturnoMillisRelativo = hrFimNoturnoMillis = Utils.converterHoraMinutoEmMilis(acp.obterFimAtividadeHorarioNoturno());
        if (hrEntradaMillis.compareTo(hrFimNoturnoMillis) < 0 && hrSaidaMillis.compareTo(hrEntradaMillis) <= 0) {
            hrSaidaMillisRelativo = Utils.somar(hrSaidaMillisRelativo, VINTE_QUATRO_HORAS_MILLIS);
        }
        if (hrEntradaMillis.compareTo(hrFimNoturnoMillis) >= 0 && hrSaidaMillis.compareTo(hrEntradaMillis) > 0) {
            hrFimNoturnoMillisRelativo = Utils.somar(hrFimNoturnoMillisRelativo, VINTE_QUATRO_HORAS_MILLIS);
        }
        BigDecimal fatorHoraFicta = acp.getConsiderarReducaoFictaDaHoraNoturna() != false ? FATOR_HORA_FICTA : BigDecimal.ONE;
        BigDecimal adicFictaNoturna = BigDecimal.ZERO;
        BigDecimal adicFictaProNot = BigDecimal.ZERO;
        this.inicializarOjacNova(ojacNova, hrEntrada, hrSaida);
        if (this.noturnoProrrogado) {
            ojacNova.setQtHorasProrrogacaoNoturnaMillis(this.calcularDiferencaMillis(hrEntrada, hrSaida));
            adicFictaProNot = Utils.subtrair(Utils.multiplicar(ojacNova.getQtHorasProrrogacaoNoturnaMillis(), fatorHoraFicta), ojacNova.getQtHorasProrrogacaoNoturnaMillis());
            ojacNova.setQtHorasProrrogacaoNoturnaMillis(Utils.somar(ojacNova.getQtHorasProrrogacaoNoturnaMillis(), adicFictaProNot));
            this.atualizarOjacNova(ojacNova, adicFictaNoturna, adicFictaProNot, primeiro, ojacAnterior);
            return ojacNova;
        }
        if (hrEntradaMillis.compareTo(hrInicioNoturnoMillis) >= 0 || hrEntradaMillis.compareTo(hrFimNoturnoMillis) < 0) {
            boolean entrouESaiuNoHorarioNoturnoDaVespera;
            boolean entrouESaiuNoHorarioNoturno = hrEntradaMillis.compareTo(hrInicioNoturnoMillis) >= 0 && (hrSaidaMillis.compareTo(hrFimNoturnoMillis) <= 0 || hrSaidaMillis.compareTo(hrEntradaMillis) >= 0);
            boolean bl = entrouESaiuNoHorarioNoturnoDaVespera = hrEntradaMillis.compareTo(hrFimNoturnoMillis) < 0 && hrSaidaMillis.compareTo(hrEntradaMillis) >= 0 && hrSaidaMillis.compareTo(hrFimNoturnoMillis) <= 0;
            if (entrouESaiuNoHorarioNoturno || entrouESaiuNoHorarioNoturnoDaVespera) {
                ojacNova.setQtHorasNoturnaMillis(this.calcularDiferencaMillis(hrEntrada, hrSaida));
                adicFictaNoturna = Utils.subtrair(Utils.multiplicar(ojacNova.getQtHorasNoturnaMillis(), fatorHoraFicta), ojacNova.getQtHorasNoturnaMillis());
                ojacNova.setQtHorasNoturnaMillis(Utils.somar(ojacNova.getQtHorasNoturnaMillis(), adicFictaNoturna));
            } else {
                ojacNova.setQtHorasNoturnaMillis(this.calcularDiferencaMillis(hrEntrada, acp.obterFimAtividadeHorarioNoturno()));
                adicFictaNoturna = Utils.subtrair(Utils.multiplicar(ojacNova.getQtHorasNoturnaMillis(), fatorHoraFicta), ojacNova.getQtHorasNoturnaMillis());
                ojacNova.setQtHorasNoturnaMillis(Utils.somar(ojacNova.getQtHorasNoturnaMillis(), adicFictaNoturna));
                if (hrSaidaMillis.compareTo(hrInicioNoturnoMillis) > 0 || hrSaidaMillis.compareTo(hrFimNoturnoMillis) <= 0) {
                    ojacNova.setQtHorasProrrogacaoNoturnaMillis(this.calcularDiferencaMillis(acp.obterFimAtividadeHorarioNoturno(), acp.obterInicioAtividadeHorarioNoturno()));
                    adicFictaProNot = Utils.subtrair(Utils.multiplicar(ojacNova.getQtHorasProrrogacaoNoturnaMillis(), fatorHoraFicta), ojacNova.getQtHorasProrrogacaoNoturnaMillis());
                    ojacNova.setQtHorasProrrogacaoNoturnaMillis(Utils.somar(ojacNova.getQtHorasProrrogacaoNoturnaMillis(), adicFictaProNot));
                    ojacNova.setQtHorasNoturnaMillis(Utils.somar(Utils.subtrair(ojacNova.getQtHorasNoturnaMillis(), adicFictaNoturna), this.calcularDiferencaMillis(acp.obterInicioAtividadeHorarioNoturno(), hrSaida)));
                    adicFictaNoturna = Utils.subtrair(Utils.multiplicar(ojacNova.getQtHorasNoturnaMillis(), fatorHoraFicta), ojacNova.getQtHorasNoturnaMillis());
                    ojacNova.setQtHorasNoturnaMillis(Utils.somar(ojacNova.getQtHorasNoturnaMillis(), adicFictaNoturna));
                } else {
                    ojacNova.setQtHorasProrrogacaoNoturnaMillis(this.calcularDiferencaMillis(acp.obterFimAtividadeHorarioNoturno(), hrSaida));
                    adicFictaProNot = Utils.subtrair(Utils.multiplicar(ojacNova.getQtHorasProrrogacaoNoturnaMillis(), fatorHoraFicta), ojacNova.getQtHorasProrrogacaoNoturnaMillis());
                    ojacNova.setQtHorasProrrogacaoNoturnaMillis(Utils.somar(ojacNova.getQtHorasProrrogacaoNoturnaMillis(), adicFictaProNot));
                }
            }
        }
        boolean hasHorasNoturnasComInicioDiurnoAnterior = this.hasHorasNoturnasComInicioDiurnoAnterior(ojacNova, hrEntrada, hrSaida);
        if (hrEntradaMillis.compareTo(hrFimNoturnoMillis) >= 0 && hrEntradaMillis.compareTo(hrInicioNoturnoMillis) < 0 && (hrSaidaMillis.compareTo(hrInicioNoturnoMillis) > 0 || hrSaidaMillis.compareTo(hrEntradaMillis) <= 0)) {
            if (hrSaidaMillis.compareTo(hrFimNoturnoMillis) <= 0 || hrSaidaMillis.compareTo(hrInicioNoturnoMillis) > 0) {
                ojacNova.setQtHorasNoturnaMillis(this.calcularDiferencaMillis(acp.obterInicioAtividadeHorarioNoturno(), hrSaida));
                adicFictaNoturna = Utils.subtrair(Utils.multiplicar(ojacNova.getQtHorasNoturnaMillis(), fatorHoraFicta), ojacNova.getQtHorasNoturnaMillis());
                ojacNova.setQtHorasNoturnaMillis(Utils.somar(ojacNova.getQtHorasNoturnaMillis(), adicFictaNoturna));
            } else {
                ojacNova.setQtHorasNoturnaMillis(this.calcularDiferencaMillis(acp.obterInicioAtividadeHorarioNoturno(), acp.obterFimAtividadeHorarioNoturno()));
                adicFictaNoturna = Utils.subtrair(Utils.multiplicar(ojacNova.getQtHorasNoturnaMillis(), fatorHoraFicta), ojacNova.getQtHorasNoturnaMillis());
                ojacNova.setQtHorasNoturnaMillis(Utils.somar(ojacNova.getQtHorasNoturnaMillis(), adicFictaNoturna));
                ojacNova.setQtHorasProrrogacaoNoturnaMillis(this.calcularDiferencaMillis(acp.obterFimAtividadeHorarioNoturno(), hrSaida));
                adicFictaProNot = Utils.subtrair(Utils.multiplicar(ojacNova.getQtHorasProrrogacaoNoturnaMillis(), fatorHoraFicta), ojacNova.getQtHorasProrrogacaoNoturnaMillis());
                ojacNova.setQtHorasProrrogacaoNoturnaMillis(Utils.somar(ojacNova.getQtHorasProrrogacaoNoturnaMillis(), adicFictaProNot));
            }
        } else if (hasHorasNoturnasComInicioDiurnoAnterior && hrEntradaMillis.compareTo(hrFimNoturnoMillis) >= 0 && this.noturnoProrrogado) {
            ojacNova.setQtHorasNoturnaMillis(this.calcularDiferencaMillis(hrEntrada, hrSaida));
            adicFictaNoturna = Utils.subtrair(Utils.multiplicar(ojacNova.getQtHorasNoturnaMillis(), fatorHoraFicta), ojacNova.getQtHorasNoturnaMillis());
            ojacNova.setQtHorasNoturnaMillis(Utils.somar(ojacNova.getQtHorasNoturnaMillis(), adicFictaNoturna));
        }
        this.qtHorasNoturnasTrabalhadas = Utils.somar(this.qtHorasNoturnasTrabalhadas, ojacNova.getQtHorasNoturnaMillis(), this.qtHorasNoturnasTrabalhadas);
        if (!acp.getHorarioProrrogadoSumula60().booleanValue() || !acp.getForcarProrrogacao().booleanValue() && !this.horarioNoturnoTotal) {
            ojacNova.setQtHorasProrrogacaoNoturnaMillis(BigDecimal.ZERO);
            adicFictaProNot = BigDecimal.ZERO;
        } else if (this.qtHorasNoturnasTrabalhadas.compareTo(BigDecimal.ZERO) > 0) {
            this.noturnoProrrogado = true;
        }
        this.atualizarOjacNova(ojacNova, adicFictaNoturna, adicFictaProNot, primeiro, ojacAnterior);
        return ojacNova;
    }

    private boolean verificarHorarioNoturnoTotal(OcorrenciaJornadaApuracaoCartao ojac) {
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        BigDecimal[] turnos = CartaoDePontoUtils.montarTurnos(ojac);
        if (!Utils.naoNulo(turnos[0]) || !Utils.naoNulo(turnos[1])) {
            return false;
        }
        BigDecimal hrEntradaMillis = turnos[0];
        BigDecimal hrSaidaMillis = turnos[1];
        if (Utils.naoNulo(turnos[3])) {
            hrSaidaMillis = turnos[3];
        }
        if (Utils.naoNulo(turnos[5])) {
            hrSaidaMillis = turnos[5];
        }
        if (Utils.naoNulo(turnos[7])) {
            hrSaidaMillis = turnos[7];
        }
        if (Utils.naoNulo(turnos[9])) {
            hrSaidaMillis = turnos[9];
        }
        if (Utils.naoNulo(turnos[11])) {
            hrSaidaMillis = turnos[11];
        }
        BigDecimal hrInicioNoturnoMillis = Utils.converterHoraMinutoEmMilis(acp.obterInicioAtividadeHorarioNoturno());
        BigDecimal hrFimNoturnoMillis = Utils.converterHoraMinutoEmMilis(acp.obterFimAtividadeHorarioNoturno());
        hrFimNoturnoMillis = Utils.somar(hrFimNoturnoMillis, VINTE_QUATRO_HORAS_MILLIS);
        return hrEntradaMillis.compareTo(hrInicioNoturnoMillis) <= 0 && hrSaidaMillis.compareTo(hrFimNoturnoMillis) >= 0;
    }

    private void atualizarOjacNova(OcorrenciaJornadaApuracaoCartao ojacNova, BigDecimal adicFictaNoturna, BigDecimal adicFictaProNot, boolean primeiro, OcorrenciaJornadaApuracaoCartao ojacAnterior) {
        ojacNova.setQtHorasTotalMillis(Utils.somar(Utils.somar(ojacNova.getQtHorasTotalMillis(), adicFictaNoturna), adicFictaProNot));
        ojacNova.setQtHorasDiurnaMillis(Utils.subtrair(Utils.subtrair(ojacNova.getQtHorasTotalMillis(), ojacNova.getQtHorasNoturnaMillis()), ojacNova.getQtHorasProrrogacaoNoturnaMillis()));
        if (!primeiro) {
            ojacNova.setQtHorasDiurnaMillis(Utils.somar(ojacNova.getQtHorasDiurnaMillis(), ojacAnterior.getQtHorasDiurnaMillis()));
            ojacNova.setQtHorasNoturnaMillis(Utils.somar(ojacNova.getQtHorasNoturnaMillis(), ojacAnterior.getQtHorasNoturnaMillis()));
            ojacNova.setQtHorasProrrogacaoNoturnaMillis(Utils.somar(ojacNova.getQtHorasProrrogacaoNoturnaMillis(), ojacAnterior.getQtHorasProrrogacaoNoturnaMillis()));
            ojacNova.setQtHorasTotalMillis(Utils.somar(ojacNova.getQtHorasTotalMillis(), ojacAnterior.getQtHorasTotalMillis()));
            ojacNova.setQtHorasTotalSemFictaMillis(Utils.somar(ojacNova.getQtHorasTotalSemFictaMillis(), ojacAnterior.getQtHorasTotalSemFictaMillis()));
        }
    }

    private void inicializarOjacNova(OcorrenciaJornadaApuracaoCartao ojacNova, String hrEntrada, String hrSaida) {
        ojacNova.setQtHorasNoturnaMillis(BigDecimal.ZERO);
        ojacNova.setQtHorasProrrogacaoNoturnaMillis(BigDecimal.ZERO);
        ojacNova.setQtHorasTotalMillis(this.calcularDiferencaMillis(hrEntrada, hrSaida));
        ojacNova.setQtHorasTotalSemFictaMillis(ojacNova.getQtHorasTotalMillis());
    }

    private BigDecimal obterCargaDiaria(ApuracaoCartaoDePonto acp, HelperDate dia, BigDecimal horasTrabalhadas) {
        String carga = "";
        if (horasTrabalhadas.compareTo(BigDecimal.ZERO) == 0) {
            if (acp.getConsiderarFeriados().booleanValue() && !acp.getConsiderarJornadaDiariaFeriadoNaoTrabalhado().booleanValue() && dia.isHoliday()) {
                return BigDecimal.ZERO;
            }
            carga = this.retornarValorJornadaDiaria(acp, dia.getWeekOfDay());
        } else {
            if (acp.getConsiderarFeriados().booleanValue() && !acp.getConsiderarJornadaDiariaFeriadoTrabalhado().booleanValue() && dia.isHoliday()) {
                return BigDecimal.ZERO;
            }
            carga = this.retornarValorJornadaDiaria(acp, dia.getWeekOfDay());
        }
        return Utils.converterHoraMinutoEmMilis(carga);
    }

    private BigDecimal calcularHorasDeJornadaTrabalhadaAteODiaDaSemanaQueExcedeAJornadaSemanal(ApuracaoCartaoDePonto acp, int diaQueExcedeAJornadaSemanal) {
        BigDecimal horas = BigDecimal.ZERO;
        BigDecimal diariaEmMilis = BigDecimal.ZERO;
        for (Integer dia : Arrays.asList(DIAS_DA_SEMANA_INICIANDO_SEGUNDA)) {
            diariaEmMilis = Utils.somar(diariaEmMilis, Utils.converterHoraMinutoEmMilis(this.retornarValorJornadaDiaria(acp, dia)), diariaEmMilis);
            horas = this.transformarEmHoras(diariaEmMilis);
            if (diaQueExcedeAJornadaSemanal != (dia + 1 > 7 ? 1 : dia + 1)) continue;
            return horas;
        }
        return horas;
    }

    private String retornarValorJornadaDiaria(ApuracaoCartaoDePonto acp, int dia) {
        String valor = null;
        switch (dia) {
            case 2: {
                valor = acp.getValorJornadaDiariaSegundaFeira();
                break;
            }
            case 3: {
                valor = acp.getValorJornadaDiariaTercaFeira();
                break;
            }
            case 4: {
                valor = acp.getValorJornadaDiariaQuartaFeira();
                break;
            }
            case 5: {
                valor = acp.getValorJornadaDiariaQuintaFeira();
                break;
            }
            case 6: {
                valor = acp.getValorJornadaDiariaSextaFeira();
                break;
            }
            case 7: {
                valor = acp.getValorJornadaDiariaSab();
                break;
            }
            case 1: {
                valor = acp.getValorJornadaDiariaDom();
                break;
            }
        }
        return valor;
    }

    private int buscarDiaDaSemanaQueExcedeAJornadaSemanal(ApuracaoCartaoDePonto acp) {
        BigDecimal diariaEmMilis = BigDecimal.ZERO;
        BigDecimal horas = BigDecimal.ZERO;
        for (Integer dia : Arrays.asList(DIAS_DA_SEMANA_INICIANDO_SEGUNDA)) {
            diariaEmMilis = Utils.somar(diariaEmMilis, Utils.converterHoraMinutoEmMilis(this.retornarValorJornadaDiaria(acp, dia)), diariaEmMilis);
            horas = this.transformarEmHoras(diariaEmMilis);
            if (!this.isJornadaDiariaMaiorQueJornadaSemanal(acp.getQtJornadaSemanal(), horas)) continue;
            return dia;
        }
        return -1;
    }

    private boolean isJornadaDiariaMaiorQueJornadaSemanal(BigDecimal qtHorasJornadaSemanal, BigDecimal horas) {
        return horas.compareTo(qtHorasJornadaSemanal) > 0;
    }

    /*
     * Enabled force condition propagation
     * Lifted jumps to return sites
     */
    private BigDecimal obterCargaDiariaParaDesconto(ApuracaoCartaoDePonto acp, HelperDate dia, BigDecimal horasTrabalhadas) {
        String carga = "";
        if (horasTrabalhadas.compareTo(BigDecimal.ZERO) == 0) {
            if (!acp.getConsiderarFeriados().booleanValue() || acp.getConsiderarJornadaDiariaFeriadoNaoTrabalhado().booleanValue() || !dia.isHoliday()) return BigDecimal.ZERO;
            carga = this.retornarValorJornadaDiaria(acp, dia.getWeekOfDay());
            return Utils.converterHoraMinutoEmMilis(carga);
        } else {
            if (!acp.getConsiderarFeriados().booleanValue() || acp.getConsiderarJornadaDiariaFeriadoTrabalhado().booleanValue() || !dia.isHoliday()) return BigDecimal.ZERO;
            carga = this.retornarValorJornadaDiaria(acp, dia.getWeekOfDay());
        }
        return Utils.converterHoraMinutoEmMilis(carga);
    }

    private BigDecimal obterTolerancia(OcorrenciaJornadaApuracaoCartao ojac) {
        BigDecimal toleranciaPorDia;
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        if (!acp.getTolerancia().booleanValue()) {
            return BigDecimal.ZERO;
        }
        int turnos = 0;
        if (Utils.naoNulo(ojac.getHrEntrada1())) {
            ++turnos;
        }
        if (Utils.naoNulo(ojac.getHrEntrada2())) {
            ++turnos;
        }
        if (Utils.naoNulo(ojac.getHrEntrada3())) {
            ++turnos;
        }
        if (Utils.naoNulo(ojac.getHrEntrada4())) {
            ++turnos;
        }
        if (Utils.naoNulo(ojac.getHrEntrada5())) {
            ++turnos;
        }
        if (Utils.naoNulo(ojac.getHrEntrada6())) {
            ++turnos;
        }
        BigDecimal toleranciaPorTurnos = Utils.converterHoraMinutoEmMilis(acp.getToleranciaPorTurno());
        if ((toleranciaPorTurnos = Utils.multiplicar(toleranciaPorTurnos, new BigDecimal(turnos))).compareTo(toleranciaPorDia = Utils.converterHoraMinutoEmMilis(acp.getToleranciaPorDia())) > 0) {
            return toleranciaPorDia;
        }
        return toleranciaPorTurnos;
    }

    private BigDecimal calcularPrimeirasHorasExtrasEmSeparado(BigDecimal horasExtras, OcorrenciaJornadaApuracaoCartao ojac) {
        boolean condicaoDeFeriado;
        BigDecimal horasRestantes = horasExtras;
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        boolean bl = condicaoDeFeriado = acp.getConsiderarFeriados() == false || acp.getConsiderarJornadaDiariaFeriadoTrabalhado() != false || !HelperDate.getInstance(ojac.getDataOcorrencia()).isHoliday();
        if (FormaDeApuracaoCartaoEnum.APURA_PRIMEIRAS_HORAS_EXTRAS_SEPARADO.equals((Object)acp.getFormaDeApuracaoCartao()) && BigDecimal.ZERO.compareTo(ojac.getCargaMillis()) < 0 && condicaoDeFeriado) {
            BigDecimal qtPrimeirasHorasExtrasEmSeparadoMillis = Utils.converterHoraMinutoEmMilis(acp.getQtPrimeirasHorasExtrasSeparado());
            if (BigDecimal.ZERO.compareTo(horasExtras) < 0) {
                if (horasExtras.compareTo(qtPrimeirasHorasExtrasEmSeparadoMillis) <= 0) {
                    ojac.setPrimeirasHorasExtrasEmSeparadoMillis(horasExtras);
                    horasRestantes = BigDecimal.ZERO;
                } else {
                    ojac.setPrimeirasHorasExtrasEmSeparadoMillis(qtPrimeirasHorasExtrasEmSeparadoMillis);
                    horasRestantes = Utils.subtrair(horasExtras, qtPrimeirasHorasExtrasEmSeparadoMillis);
                }
            }
        }
        return horasRestantes;
    }

    private BigDecimal calcularAdicSum85TST(BigDecimal horasExtras, OcorrenciaJornadaApuracaoCartao ojac) {
        boolean condicaoDeFeriado;
        BigDecimal horasRestantes = horasExtras;
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        boolean bl = condicaoDeFeriado = acp.getConsiderarFeriados() == false || acp.getConsiderarJornadaDiariaFeriadoTrabalhado() != false || !HelperDate.getInstance(ojac.getDataOcorrencia()).isHoliday();
        if (FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_CONFORME_SUMULA_85.equals((Object)acp.getFormaDeApuracaoCartao()) && BigDecimal.ZERO.compareTo(ojac.getCargaMillis()) < 0 && condicaoDeFeriado) {
            BigDecimal qtAdicionalSumula85Millis = Utils.converterHoraMinutoEmMilis(acp.getQtHorasExtasSumulaTST());
            if (BigDecimal.ZERO.compareTo(horasExtras) < 0) {
                if (horasExtras.compareTo(qtAdicionalSumula85Millis) <= 0) {
                    ojac.setAdicionalSumula85Millis(horasExtras);
                    horasRestantes = BigDecimal.ZERO;
                } else {
                    ojac.setAdicionalSumula85Millis(qtAdicionalSumula85Millis);
                    horasRestantes = Utils.subtrair(horasExtras, qtAdicionalSumula85Millis);
                }
            }
        }
        return horasRestantes;
    }

    private void processarHorasExtras(OcorrenciaJornadaApuracaoCartao ojac) {
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        if (FormaDeApuracaoCartaoEnum.NAO_APURAR_HORAS_EXTRAS.equals((Object)acp.getFormaDeApuracaoCartao())) {
            return;
        }
        BigDecimal horasExtras = this.calcularExtrasDiarias(ojac);
        horasExtras = this.separaHorasExtrasEmFeriadosRepousos(horasExtras, ojac);
        horasExtras = this.calcularPrimeirasHorasExtrasEmSeparado(horasExtras, ojac);
        horasExtras = this.calcularAdicSum85TST(horasExtras, ojac);
        horasExtras = this.apurarHoraExtraNoturna(horasExtras, ojac);
        ojac.setHorasExtrasMillis(horasExtras);
    }

    private BigDecimal apurarHoraExtraNoturna(BigDecimal horasExtras, OcorrenciaJornadaApuracaoCartao ojac) {
        BigDecimal horasRestantes = horasExtras;
        if (ojac.getApuracaoCartaoDePonto().getApurarHorasExtrasNoturnas().booleanValue() && BigDecimal.ZERO.compareTo(horasExtras) < 0 && Utils.naoVazio(ojac.getHrEntrada1())) {
            BigDecimal[] turnos = CartaoDePontoUtils.montarTurnos(ojac);
            JornadaDiaria jornadaDiaria = new JornadaDiaria(turnos, ojac, this.horarioNoturnoTotal);
            BigDecimal totalHorasExtrasNoturnas = jornadaDiaria.getTotalHorasExtrasNoturnas();
            ojac.setHorasExtrasNoturnasMillis(totalHorasExtrasNoturnas);
            horasRestantes = Utils.subtrair(horasRestantes, totalHorasExtrasNoturnas);
        }
        return horasRestantes;
    }

    private BigDecimal separaHorasExtrasEmFeriadosRepousos(BigDecimal horasExtras, OcorrenciaJornadaApuracaoCartao ojac) {
        BigDecimal horasRestantes = horasExtras;
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        HelperDate data = HelperDate.getInstance(ojac.getDataOcorrencia());
        if (BigDecimal.ZERO.compareTo(horasExtras) < 0) {
            boolean ehSabadoComSabadoEDomingoEmSeparado;
            BigDecimal[] turnos = CartaoDePontoUtils.montarTurnos(ojac);
            JornadaDiaria jornadaDiaria = new JornadaDiaria(turnos, ojac, this.horarioNoturnoTotal);
            Boolean apurarHorasExtrasNoturnas = acp.getApurarHorasExtrasNoturnas();
            BigDecimal totalHorasExtrasNoturnas = apurarHorasExtrasNoturnas != false ? jornadaDiaria.getTotalHorasExtrasNoturnas() : BigDecimal.ZERO;
            BigDecimal totalHorasExtrasDiurnas = Utils.subtrair(horasExtras, totalHorasExtrasNoturnas);
            boolean bl = ehSabadoComSabadoEDomingoEmSeparado = acp.getExtraSabadoDomingoSeparado() != false && data.isSaturday();
            if (acp.getExtraFeriadoSeparado().booleanValue() && (acp.getExtraSabadoDomingoSeparado().booleanValue() || acp.getExtraDescansoSeparado().booleanValue())) {
                boolean ehFeriado = data.isHoliday();
                boolean ehDomingo = data.isSunday();
                boolean ehSabado = data.isSaturday();
                if (ehDomingo || ehSabado && acp.getExtraSabadoDomingoSeparado().booleanValue()) {
                    horasRestantes = this.configurarHorasExtrasRepousoEmSeparado(ojac, horasExtras, totalHorasExtrasNoturnas, totalHorasExtrasDiurnas);
                } else if (ehFeriado) {
                    horasRestantes = this.configurarHorasExtrasFeriadoEmSeparado(ojac, horasExtras, totalHorasExtrasNoturnas, totalHorasExtrasDiurnas);
                }
            } else if ((acp.getExtraSabadoDomingoSeparado().booleanValue() || acp.getExtraDescansoSeparado().booleanValue()) && (data.isSunday() || ehSabadoComSabadoEDomingoEmSeparado)) {
                horasRestantes = this.configurarHorasExtrasRepousoEmSeparado(ojac, horasExtras, totalHorasExtrasNoturnas, totalHorasExtrasDiurnas);
            } else if (acp.getExtraFeriadoSeparado().booleanValue() && data.isHoliday()) {
                horasRestantes = this.configurarHorasExtrasFeriadoEmSeparado(ojac, horasExtras, totalHorasExtrasNoturnas, totalHorasExtrasDiurnas);
            }
        }
        return horasRestantes;
    }

    private BigDecimal configurarHorasExtrasFeriadoEmSeparado(OcorrenciaJornadaApuracaoCartao ojac, BigDecimal horasExtras, BigDecimal totalHorasExtrasNoturnas, BigDecimal totalHorasExtrasDiurnas) {
        ojac.setHorasExtrasFeriadoRepouso(horasExtras);
        ojac.setHorasExtrasFeriado(totalHorasExtrasDiurnas);
        ojac.setHorasExtrasNoturnasFeriado(totalHorasExtrasNoturnas);
        return BigDecimal.ZERO;
    }

    private BigDecimal configurarHorasExtrasRepousoEmSeparado(OcorrenciaJornadaApuracaoCartao ojac, BigDecimal horasExtras, BigDecimal totalHorasExtrasNoturnas, BigDecimal totalHorasExtrasDiurnas) {
        ojac.setHorasExtrasFeriadoRepouso(horasExtras);
        ojac.setHorasExtrasRepouso(totalHorasExtrasDiurnas);
        ojac.setHorasExtrasNoturnasRepouso(totalHorasExtrasNoturnas);
        return BigDecimal.ZERO;
    }

    private BigDecimal calcularExtrasDiarias(OcorrenciaJornadaApuracaoCartao ojac) {
        BigDecimal qtHorasTrabalhadasMillis = ojac.getQtHorasTotalMillis();
        BigDecimal horasExtrasMillis = BigDecimal.ZERO;
        BigDecimal cargaDiaMillis = ojac.getCargaMillis();
        BigDecimal diferenca = Utils.subtrair(qtHorasTrabalhadasMillis, cargaDiaMillis);
        if (diferenca.compareTo(ojac.getToleranciaMillis()) > 0) {
            horasExtrasMillis = diferenca;
        }
        return horasExtrasMillis;
    }

    private BigDecimal calcularInterJornadas(OcorrenciaJornadaApuracaoCartao ojac, OcorrenciaJornadaApuracaoCartao ojacAnterior, OcorrenciaJornadaApuracaoCartao ojacDoisDiasAntes) {
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        BigDecimal interJornadas = BigDecimal.ZERO;
        BigDecimal descansoReal = BigDecimal.ZERO;
        if (acp.getDescansoEntreJornadas().booleanValue() && Utils.naoVazio(ojac.getHrEntrada1())) {
            BigDecimal descansoTeorico;
            int i;
            boolean folgouAVespera;
            boolean iniTxtHora = false;
            int fimTxtHora = 2;
            int iniTxtMinuto = 3;
            int fimTxtMinuto = 5;
            String horario = acp.getValorDescansoEntreJornadas();
            String hora = horario.substring(0, 2);
            String minutos = horario.substring(3, 5);
            String valorDescansoEntreSemanasMais24h = Integer.valueOf(hora) + 24 + ":" + minutos;
            boolean ehDomingo = HelperDate.getInstance(ojac.getDataOcorrencia()).isSunday();
            if (ehDomingo && valorDescansoEntreSemanasMais24h.equals(acp.getValorDescansoEntreSemanas())) {
                return BigDecimal.ZERO;
            }
            boolean ehSegunda = HelperDate.getInstance(ojac.getDataOcorrencia()).addDay(-1).isSunday();
            BigDecimal[] turnosAnteriores = null;
            BigDecimal[] turnosAtuais = null;
            boolean bl = folgouAVespera = Utils.naoNulo(ojacAnterior) && Utils.isVazio(ojacAnterior.getHrEntrada1()) != false && Utils.naoNulo(ojacDoisDiasAntes) && Utils.naoVazio(ojacDoisDiasAntes.getHrEntrada1());
            if (ehSegunda && (folgouAVespera || valorDescansoEntreSemanasMais24h.equals(acp.getValorDescansoEntreSemanas()))) {
                if (Utils.naoNulo(ojacDoisDiasAntes)) {
                    turnosAnteriores = CartaoDePontoUtils.montarTurnos(ojacDoisDiasAntes);
                }
                turnosAtuais = CartaoDePontoUtils.montarTurnos(ojac, QUARENTA_OITO_HORAS_MILLIS);
            } else if (Utils.naoNulo(ojacAnterior) && Utils.naoVazio(ojacAnterior.getHrEntrada1())) {
                turnosAnteriores = CartaoDePontoUtils.montarTurnos(ojacAnterior);
                turnosAtuais = CartaoDePontoUtils.montarTurnos(ojac, VINTE_QUATRO_HORAS_MILLIS);
            }
            for (i = 1; i < 11 && Utils.naoNulo(turnosAnteriores) && Utils.naoNulo(turnosAnteriores[i + 1]); i += 2) {
            }
            if (Utils.naoNulo(turnosAnteriores) && Utils.naoNulo(turnosAnteriores[i]) && Utils.naoNulo(turnosAtuais) && Utils.naoNulo(turnosAtuais[0]) && (descansoReal = Utils.subtrair(turnosAtuais[0], turnosAnteriores[i])).compareTo(descansoTeorico = ehSegunda && Utils.naoNulo(ojacAnterior) && Utils.isVazio(ojacAnterior.getHrEntrada1()) != false && Utils.naoVazio(acp.getValorDescansoEntreSemanas()) ? Utils.converterHoraMinutoEmMilis(valorDescansoEntreSemanasMais24h) : (ehSegunda && valorDescansoEntreSemanasMais24h.equals(acp.getValorDescansoEntreSemanas()) ? Utils.somar(Utils.converterHoraMinutoEmMilis(acp.getValorDescansoEntreSemanas()), ojacAnterior.getQtHorasTotalSemFictaMillis()) : Utils.converterHoraMinutoEmMilis(acp.getValorDescansoEntreJornadas()))) < 0) {
                interJornadas = Utils.subtrair(descansoTeorico, descansoReal);
            }
        }
        return interJornadas;
    }

    private BigDecimal calcularArt384(OcorrenciaJornadaApuracaoCartao ojac) {
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        BigDecimal cargaDiaMillis = ojac.getCargaMillis();
        BigDecimal art384 = BigDecimal.ZERO;
        if (acp.getApurarSupressaoIntervalo384().booleanValue() && BigDecimal.ZERO.compareTo(cargaDiaMillis) < 0 && ojac.getToleranciaMillis().compareTo(Utils.subtrair(ojac.getQtHorasTotalMillis(), cargaDiaMillis)) < 0) {
            art384 = QUINZE_MINUTOS_MILLIS;
        }
        return art384;
    }

    private BigDecimal calcularArt253(OcorrenciaJornadaApuracaoCartao ojac) {
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        BigDecimal art253 = BigDecimal.ZERO;
        if (acp.getApurarSupressaoIntervaloArt253().booleanValue()) {
            BigDecimal tempoTrabalho = Utils.converterHoraMinutoEmMilis(acp.getValorTrabalhoArt253());
            BigDecimal tempoDescanso = Utils.converterHoraMinutoEmMilis(acp.getValorDescansoArt253());
            art253 = Utils.somar(art253, this.apurarIntervaloDevidoArt253(ojac.getHrEntrada1(), ojac.getHrSaida1(), tempoTrabalho, tempoDescanso));
            art253 = Utils.somar(art253, this.apurarIntervaloDevidoArt253(ojac.getHrEntrada2(), ojac.getHrSaida2(), tempoTrabalho, tempoDescanso));
            art253 = Utils.somar(art253, this.apurarIntervaloDevidoArt253(ojac.getHrEntrada3(), ojac.getHrSaida3(), tempoTrabalho, tempoDescanso));
            art253 = Utils.somar(art253, this.apurarIntervaloDevidoArt253(ojac.getHrEntrada4(), ojac.getHrSaida4(), tempoTrabalho, tempoDescanso));
            art253 = Utils.somar(art253, this.apurarIntervaloDevidoArt253(ojac.getHrEntrada5(), ojac.getHrSaida5(), tempoTrabalho, tempoDescanso));
            art253 = Utils.somar(art253, this.apurarIntervaloDevidoArt253(ojac.getHrEntrada6(), ojac.getHrSaida6(), tempoTrabalho, tempoDescanso));
        }
        return art253;
    }

    private BigDecimal apurarIntervaloDevidoArt253(String horaEntrada, String horaSaida, BigDecimal tempoTrabalho, BigDecimal tempoDescanso) {
        if (Utils.naoVazio(horaEntrada)) {
            return Utils.multiplicar(Utils.dividir(this.calcularDiferencaMillis(horaEntrada, horaSaida), tempoTrabalho).setScale(0, RoundingMode.FLOOR), tempoDescanso);
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal calcularArt72(OcorrenciaJornadaApuracaoCartao ojac) {
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        BigDecimal art72 = BigDecimal.ZERO;
        if (acp.getApurarSupressaoIntervalo72().booleanValue()) {
            art72 = Utils.somar(art72, this.apurarIntervaloDevidoArt72(ojac.getHrEntrada1(), ojac.getHrSaida1()));
            art72 = Utils.somar(art72, this.apurarIntervaloDevidoArt72(ojac.getHrEntrada2(), ojac.getHrSaida2()));
            art72 = Utils.somar(art72, this.apurarIntervaloDevidoArt72(ojac.getHrEntrada3(), ojac.getHrSaida3()));
            art72 = Utils.somar(art72, this.apurarIntervaloDevidoArt72(ojac.getHrEntrada4(), ojac.getHrSaida4()));
            art72 = Utils.somar(art72, this.apurarIntervaloDevidoArt72(ojac.getHrEntrada5(), ojac.getHrSaida5()));
            art72 = Utils.somar(art72, this.apurarIntervaloDevidoArt72(ojac.getHrEntrada6(), ojac.getHrSaida6()));
        }
        return art72;
    }

    private BigDecimal apurarIntervaloDevidoArt72(String horaEntrada, String horaSaida) {
        if (Utils.naoVazio(horaEntrada)) {
            return Utils.multiplicar(Utils.dividir(this.calcularDiferencaMillis(horaEntrada, horaSaida), UMA_HORA_E_TRINTA_MINUTOS_MILLIS).setScale(0, RoundingMode.FLOOR), DEZ_MINUTOS_MILLIS);
        }
        return BigDecimal.ZERO;
    }

    private void processarIntraJornada(OcorrenciaJornadaApuracaoCartao ojac) {
        BigDecimal tolerancia;
        BigDecimal diferencaPermanenciaTotalEHorasSemFictaMillis;
        int indexSaida;
        if (!Utils.naoVazio(ojac.getHrEntrada1())) {
            ojac.setHorasIntrajornadaMillis(BigDecimal.ZERO);
            ojac.setHorasExcessoIntrajornadaMillis(BigDecimal.ZERO);
            return;
        }
        ApuracaoCartaoDePonto acp = ojac.getApuracaoCartaoDePonto();
        BigDecimal horasTotaisMillis = ojac.getQtHorasTotalMillis();
        BigDecimal intraJornadas = BigDecimal.ZERO;
        BigDecimal[] turnos = CartaoDePontoUtils.montarTurnos(ojac);
        for (indexSaida = 1; indexSaida < 11 && Utils.naoNulo(turnos) && Utils.naoNulo(turnos[indexSaida + 1]); indexSaida += 2) {
        }
        BigDecimal permanenciaTotal = Utils.subtrair(turnos[indexSaida], turnos[0]);
        if (acp.getConsiderarFracionamentoIntervaloIntra().booleanValue()) {
            diferencaPermanenciaTotalEHorasSemFictaMillis = Utils.subtrair(permanenciaTotal, ojac.getQtHorasTotalSemFictaMillis());
        } else {
            diferencaPermanenciaTotalEHorasSemFictaMillis = BigDecimal.ZERO;
            for (int i = 1; i < indexSaida; i += 2) {
                BigDecimal auxiliar = Utils.subtrair(turnos[i + 1], turnos[i]);
                if (auxiliar.compareTo(diferencaPermanenciaTotalEHorasSemFictaMillis) <= 0) continue;
                diferencaPermanenciaTotalEHorasSemFictaMillis = auxiliar;
            }
        }
        if (horasTotaisMillis.compareTo(QUATRO_HORAS_MILLIS) <= 0) {
            ojac.setHorasIntrajornadaMillis(BigDecimal.ZERO);
            ojac.setHorasExcessoIntrajornadaMillis(BigDecimal.ZERO);
            return;
        }
        BigDecimal bigDecimal = tolerancia = StringUtils.isNotBlank((String)acp.getToleranciaIntervaloIntraJornadaSupSeis()) ? Utils.converterHoraMinutoEmMilis(acp.getToleranciaIntervaloIntraJornadaSupSeis()) : BigDecimal.ZERO;
        if (horasTotaisMillis.compareTo(SEIS_HORAS_MILLIS) > 0 && acp.getIntervalorIntraJornadaSupSeis().booleanValue()) {
            BigDecimal valorIntervaloIntrajornadaSupSeis = Utils.converterHoraMinutoEmMilis(acp.getValorIntervalorIntraJornadaSupSeis());
            if (acp.getIntervalorIntraJornadaSupSeis().booleanValue() && valorIntervaloIntrajornadaSupSeis.compareTo(diferencaPermanenciaTotalEHorasSemFictaMillis) > 0 && Utils.somar(diferencaPermanenciaTotalEHorasSemFictaMillis, tolerancia).compareTo(valorIntervaloIntrajornadaSupSeis) < 0) {
                intraJornadas = this.calcularQuantidadeHorasIntrajornadas(ojac, acp, intraJornadas, diferencaPermanenciaTotalEHorasSemFictaMillis, acp.getValorIntervalorIntraJornadaSupSeis());
            }
        } else if (acp.getIntervaloIntraJornadaSupQuatroSeis().booleanValue() && Utils.converterHoraMinutoEmMilis(acp.getValorIntervaloIntraJornadaSupQuatroSeis()).compareTo(diferencaPermanenciaTotalEHorasSemFictaMillis) > 0) {
            intraJornadas = this.calcularQuantidadeHorasIntrajornadas(ojac, acp, intraJornadas, diferencaPermanenciaTotalEHorasSemFictaMillis, acp.getValorIntervaloIntraJornadaSupQuatroSeis());
        }
        ojac.setHorasIntrajornadaMillis(intraJornadas);
        if (acp.getApurarExcessoIntervaloIntra().booleanValue()) {
            BigDecimal adicionalParaExcesso = BigDecimal.ZERO;
            if (!acp.getConsiderarFracionamentoIntervaloIntra().booleanValue()) {
                adicionalParaExcesso = Utils.subtrair(Utils.subtrair(permanenciaTotal, ojac.getQtHorasTotalSemFictaMillis()), diferencaPermanenciaTotalEHorasSemFictaMillis);
            }
            BigDecimal intervaloMaximo = Utils.converterHoraMinutoEmMilis(acp.getIntervaloIntrajornadaMaximo());
            BigDecimal excesso = BigDecimal.ZERO;
            if (Utils.somar(intervaloMaximo, tolerancia).compareTo(diferencaPermanenciaTotalEHorasSemFictaMillis) < 0) {
                excesso = Utils.subtrair(diferencaPermanenciaTotalEHorasSemFictaMillis, intervaloMaximo);
            }
            excesso = Utils.somar(excesso, adicionalParaExcesso);
            if (acp.getApurarApenasExcessoAcimaJornada().booleanValue() && ojac.getCargaMillis().compareTo(Utils.somar(ojac.getQtHorasTotalSemFictaMillis(), excesso)) < 0) {
                BigDecimal excessoDeJornada = Utils.subtrair(Utils.somar(ojac.getQtHorasTotalSemFictaMillis(), excesso), ojac.getCargaMillis());
                if (excessoDeJornada.compareTo(excesso) < 0) {
                    excesso = excessoDeJornada;
                }
            } else if (acp.getApurarApenasExcessoAcimaJornada().booleanValue()) {
                excesso = BigDecimal.ZERO;
            }
            ojac.setHorasExcessoIntrajornadaMillis(excesso);
        }
    }

    private BigDecimal calcularQuantidadeHorasIntrajornadas(OcorrenciaJornadaApuracaoCartao ojac, ApuracaoCartaoDePonto acp, BigDecimal intraJornadas, BigDecimal diferencaPermanenciaTotalEHorasSemFictaMillis, String invervaloIntrajornada) {
        intraJornadas = Utils.converterHoraMinutoEmMilis(invervaloIntrajornada);
        if (!(acp.getApurarSupressaoIntervaloIntraIntegral().booleanValue() || acp.getApurarSupressaoIntervaloIntraReforma().booleanValue() && !HelperDate.dateAfterOrEquals(ojac.getDataOcorrencia(), Constantes.DATA_REFORMA_TRABALHISTA))) {
            intraJornadas = Utils.subtrair(intraJornadas, diferencaPermanenciaTotalEHorasSemFictaMillis);
        }
        return intraJornadas;
    }

    private void realizarProcessamentoSemanal(ApuracaoCartaoDePonto acp) {
        HelperDate dataInicialDeApuracao = HelperDate.getInstance(acp.getDataInicial());
        HelperDate dataFinalDeApuracao = HelperDate.getInstance(acp.getDataFinal());
        HelperDate primeiraSegunda = dataInicialDeApuracao.clone();
        if (!dataInicialDeApuracao.isMonday()) {
            while (!(primeiraSegunda = primeiraSegunda.addDay(1)).isMonday()) {
            }
            this.processarSemana(acp, dataInicialDeApuracao, primeiraSegunda.clone().addDay(-1));
        }
        HelperDate dataAuxiliar = primeiraSegunda.clone().addDay(6);
        while (!dataAuxiliar.greaterThen(dataFinalDeApuracao)) {
            this.processarSemana(acp, primeiraSegunda, dataAuxiliar);
            primeiraSegunda.addDay(7);
            dataAuxiliar.addDay(7);
        }
        this.processarSemana(acp, primeiraSegunda, dataFinalDeApuracao);
    }

    private void processarSemanaHoraExtraMaisFavoravel(BigDecimal horasExtrasSemanais, BigDecimal totalHorasExtrasNaSemana, HelperDate inicio, HelperDate fim) {
        if (horasExtrasSemanais.compareTo(totalHorasExtrasNaSemana) > 0) {
            this.mapaDataApuracaoDiaria.get(fim.getDate()).setHorasExtrasSemanal(horasExtrasSemanais);
            HelperDate dataAuxiliar = inicio.clone();
            while (!dataAuxiliar.greaterThen(fim)) {
                this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).setHorasExtrasDiaria(BigDecimal.ZERO);
                dataAuxiliar.addDay(1);
            }
        }
    }

    private void processarSemanaSumula85(BigDecimal horasExtrasSemanais, HelperDate inicio, HelperDate fim, BigDecimal horasTrabalhadasNoDia, boolean considerarData, ApuracaoCartaoDePonto acp, BigDecimal saldoHorasExtrasSemanal) {
        if (BigDecimal.ZERO.compareTo(horasExtrasSemanais) >= 0) {
            HelperDate dataAuxiliar = inicio.clone();
            while (!dataAuxiliar.greaterThen(fim)) {
                this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).setHorasExtrasDiaria(BigDecimal.ZERO);
                dataAuxiliar.addDay(1);
            }
            return;
        }
        BigDecimal totalHorasTrabalhadasParcial = BigDecimal.ZERO;
        boolean ultrapassou = false;
        HelperDate dataAuxiliar = inicio.clone();
        while (!dataAuxiliar.greaterThen(fim)) {
            if (!ultrapassou) {
                boolean ehFeriadoNaoTrabalhadoANaoConsiderar;
                horasTrabalhadasNoDia = this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).getHorasTrabalhadas();
                considerarData = true;
                boolean ehFeriadoAConsiderar = acp.getConsiderarFeriados() != false && dataAuxiliar.isHoliday();
                boolean ehFeriadoTrabalhoANaoConsiderar = horasTrabalhadasNoDia.compareTo(BigDecimal.ZERO) > 0 && acp.getConsiderarJornadaDiariaFeriadoTrabalhado() == false;
                boolean bl = ehFeriadoNaoTrabalhadoANaoConsiderar = horasTrabalhadasNoDia.compareTo(BigDecimal.ZERO) == 0 && acp.getConsiderarJornadaDiariaFeriadoNaoTrabalhado() == false;
                if (ehFeriadoAConsiderar && (ehFeriadoTrabalhoANaoConsiderar || ehFeriadoNaoTrabalhadoANaoConsiderar)) {
                    considerarData = false;
                }
                if (considerarData) {
                    totalHorasTrabalhadasParcial = Utils.somar(totalHorasTrabalhadasParcial, horasTrabalhadasNoDia, totalHorasTrabalhadasParcial);
                }
            }
            if (ultrapassou) {
                this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).setHorasAdicionalSumula85(BigDecimal.ZERO);
                this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).setHorasExtrasDiaria(BigDecimal.ZERO);
            } else if (totalHorasTrabalhadasParcial.compareTo(saldoHorasExtrasSemanal) > 0) {
                BigDecimal valorSumulaPreviamenteCalculado = this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).getHorasAdicionalSumula85();
                if (BigDecimal.ZERO.compareTo(valorSumulaPreviamenteCalculado) < 0) {
                    BigDecimal diferenca = Utils.subtrair(totalHorasTrabalhadasParcial, saldoHorasExtrasSemanal);
                    diferenca = BigDecimal.ZERO.compareTo(diferenca = Utils.subtrair(diferenca, this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).getHorasExtrasDiaria())) > 0 ? BigDecimal.ZERO : diferenca;
                    BigDecimal valorSumula = this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).getHorasAdicionalSumula85();
                    valorSumula = valorSumula.compareTo(diferenca) > 0 ? Utils.subtrair(valorSumula, diferenca) : BigDecimal.ZERO;
                    this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).setHorasAdicionalSumula85(valorSumula);
                }
                this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).setHorasExtrasDiaria(BigDecimal.ZERO);
                ultrapassou = true;
            } else {
                this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).setHorasExtrasDiaria(BigDecimal.ZERO);
            }
            dataAuxiliar.addDay(1);
        }
        this.mapaDataApuracaoDiaria.get(fim.getDate()).setHorasExtrasSemanal(horasExtrasSemanais);
    }

    private void processarSemanaExcedentesJornadaMensal(BigDecimal horasExtrasSemanais, HelperDate inicio, HelperDate fim) {
        if (BigDecimal.ZERO.compareTo(horasExtrasSemanais) < 0) {
            this.mapaDataApuracaoDiaria.get(fim.getDate()).setHorasExtrasSemanal(horasExtrasSemanais);
        }
        HelperDate dataAuxiliar = inicio.clone();
        while (!dataAuxiliar.greaterThen(fim)) {
            this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).setHorasExtrasDiaria(BigDecimal.ZERO);
            dataAuxiliar.addDay(1);
        }
    }

    private boolean isDataContidaNoPeriodoDeExcecao(Collection<ExcecaoDoSabadoDoCalculo> excecoesDoSabado, Date data) {
        for (ExcecaoDoSabadoDoCalculo excecao : excecoesDoSabado) {
            if (!excecao.getPeriodoDaExcecao().isPeriodoContemEsta(data)) continue;
            return true;
        }
        return false;
    }

    private boolean isSabadoEDiaUtil(Calculo calculo, Date data) {
        boolean ehSabado = HelperDate.getInstance(data).isSaturday();
        if (!ehSabado) {
            return false;
        }
        boolean marcadoSabadoComoDiaUtil = calculo.getSabadoDiaUtil();
        Set<ExcecaoDoSabadoDoCalculo> excecoesDoSabado = calculo.getExcecoesDoSabado();
        boolean dataContidaNoPeriodoDeExcecao = this.isDataContidaNoPeriodoDeExcecao(excecoesDoSabado, data);
        if (marcadoSabadoComoDiaUtil) {
            if (dataContidaNoPeriodoDeExcecao) {
                return false;
            }
        } else if (dataContidaNoPeriodoDeExcecao) {
            return true;
        }
        return marcadoSabadoComoDiaUtil;
    }

    private void processarSemana(ApuracaoCartaoDePonto acp, HelperDate inicio, HelperDate fim) {
        int diaQueExcedeAJornadaSemanal = this.buscarDiaDaSemanaQueExcedeAJornadaSemanal(acp);
        BigDecimal cargaTotalDeFeriadosPorDescontar = BigDecimal.ZERO;
        BigDecimal cargaTotalDeFaltaJustificadaPorDescontar = BigDecimal.ZERO;
        BigDecimal totalTrabalhadoNaSemana = BigDecimal.ZERO;
        BigDecimal totalHorasExtrasNaSemana = BigDecimal.ZERO;
        BigDecimal totalHorasExtrasFeriadoSeparado = BigDecimal.ZERO;
        BigDecimal totalHorasExtrasRepousoSeparado = BigDecimal.ZERO;
        boolean considerarData = true;
        BigDecimal horasTrabalhadasNoDia = BigDecimal.ZERO;
        HelperDate dataAuxiliar = inicio.clone();
        while (!dataAuxiliar.greaterThen(fim)) {
            boolean temFeriadoNoDiaQueExcedeAJornadaSemanal;
            boolean ehSabadoEDiaUtil = this.isSabadoEDiaUtil(acp.getCalculo(), dataAuxiliar.getDate());
            ApuracaoDiariaCartao apuracaoDiariaCartao = this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate());
            if (apuracaoDiariaCartao == null) {
                dataAuxiliar.addDay(1);
                continue;
            }
            horasTrabalhadasNoDia = apuracaoDiariaCartao.getHorasTrabalhadas();
            considerarData = true;
            boolean bl = temFeriadoNoDiaQueExcedeAJornadaSemanal = dataAuxiliar.isHoliday() && dataAuxiliar.getWeekOfDay() == diaQueExcedeAJornadaSemanal;
            if (acp.getConsiderarFeriados().booleanValue() && dataAuxiliar.isHoliday()) {
                if (horasTrabalhadasNoDia.compareTo(BigDecimal.ZERO) > 0 && !acp.getConsiderarJornadaDiariaFeriadoTrabalhado().booleanValue()) {
                    considerarData = false;
                } else if (horasTrabalhadasNoDia.compareTo(BigDecimal.ZERO) == 0 && !acp.getConsiderarJornadaDiariaFeriadoNaoTrabalhado().booleanValue()) {
                    considerarData = false;
                }
            }
            totalTrabalhadoNaSemana = Utils.somar(totalTrabalhadoNaSemana, horasTrabalhadasNoDia, totalTrabalhadoNaSemana);
            totalHorasExtrasNaSemana = Utils.somar(totalHorasExtrasNaSemana, this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).getHorasExtrasDiaria(), totalHorasExtrasNaSemana);
            totalHorasExtrasFeriadoSeparado = Utils.somar(totalHorasExtrasFeriadoSeparado, this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).getHorasFeriado(), totalHorasExtrasFeriadoSeparado);
            totalHorasExtrasRepousoSeparado = Utils.somar(totalHorasExtrasRepousoSeparado, this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).getHorasDomingo(), totalHorasExtrasRepousoSeparado);
            if (!considerarData) {
                if (temFeriadoNoDiaQueExcedeAJornadaSemanal && ehSabadoEDiaUtil) {
                    BigDecimal horasDeJornadaTrabalhadaAteODiaDaSemanaQueExcedeAJornadaSemanal = this.calcularHorasDeJornadaTrabalhadaAteODiaDaSemanaQueExcedeAJornadaSemanal(acp, diaQueExcedeAJornadaSemanal);
                    BigDecimal diferenca = acp.getQtJornadaSemanal().subtract(horasDeJornadaTrabalhadaAteODiaDaSemanaQueExcedeAJornadaSemanal);
                    cargaTotalDeFeriadosPorDescontar = Utils.somar(cargaTotalDeFeriadosPorDescontar, diferenca, cargaTotalDeFeriadosPorDescontar);
                } else {
                    BigDecimal cargaDiariaParaDescontoEmHoras = this.transformarEmHoras(this.obterCargaDiariaParaDesconto(acp, dataAuxiliar, horasTrabalhadasNoDia));
                    cargaTotalDeFeriadosPorDescontar = Utils.somar(cargaTotalDeFeriadosPorDescontar, cargaDiariaParaDescontoEmHoras, cargaTotalDeFeriadosPorDescontar);
                }
            } else {
                boolean isFaltaJustificada;
                boolean bl2 = isFaltaJustificada = acp.getCalculo().obterFaltasJustificadas(new Periodo(dataAuxiliar.getDate(), dataAuxiliar.getDate())) > 0;
                if (isFaltaJustificada && dataAuxiliar.getWeekOfDay() == diaQueExcedeAJornadaSemanal && ehSabadoEDiaUtil) {
                    BigDecimal horasDeJornadaTrabalhadaAteODiaDaSemanaQueExcedeAJornadaSemanal = this.calcularHorasDeJornadaTrabalhadaAteODiaDaSemanaQueExcedeAJornadaSemanal(acp, diaQueExcedeAJornadaSemanal);
                    BigDecimal diferenca = acp.getQtJornadaSemanal().subtract(horasDeJornadaTrabalhadaAteODiaDaSemanaQueExcedeAJornadaSemanal);
                    diferenca = Utils.zerarSeNegativo(Utils.subtrair(diferenca, horasTrabalhadasNoDia, diferenca));
                    cargaTotalDeFaltaJustificadaPorDescontar = Utils.somar(cargaTotalDeFaltaJustificadaPorDescontar, diferenca, cargaTotalDeFaltaJustificadaPorDescontar);
                } else if (isFaltaJustificada) {
                    BigDecimal cargaDiariaParaDescontoEmHoras = this.transformarEmHoras(Utils.converterHoraMinutoEmMilis(this.retornarValorJornadaDiaria(acp, dataAuxiliar.getWeekOfDay())));
                    cargaDiariaParaDescontoEmHoras = Utils.zerarSeNegativo(Utils.subtrair(horasTrabalhadasNoDia, cargaDiariaParaDescontoEmHoras, horasTrabalhadasNoDia));
                    cargaTotalDeFaltaJustificadaPorDescontar = Utils.somar(cargaTotalDeFaltaJustificadaPorDescontar, cargaDiariaParaDescontoEmHoras, cargaTotalDeFaltaJustificadaPorDescontar);
                }
            }
            dataAuxiliar.addDay(1);
        }
        BigDecimal saldoHorasExtrasSemanal = Utils.subtrair(acp.getQtJornadaSemanal(), cargaTotalDeFeriadosPorDescontar);
        saldoHorasExtrasSemanal = Utils.subtrair(saldoHorasExtrasSemanal, cargaTotalDeFaltaJustificadaPorDescontar);
        BigDecimal horasExtrasSemanais = Utils.subtrair(totalTrabalhadoNaSemana, saldoHorasExtrasSemanal);
        if (acp.getExtraFeriadoSeparado().booleanValue()) {
            horasExtrasSemanais = Utils.subtrair(horasExtrasSemanais, totalHorasExtrasFeriadoSeparado);
        }
        if (acp.getExtraSabadoDomingoSeparado().booleanValue() || acp.getExtraDescansoSeparado().booleanValue()) {
            horasExtrasSemanais = Utils.subtrair(horasExtrasSemanais, totalHorasExtrasRepousoSeparado);
        }
        switch (acp.getFormaDeApuracaoCartao()) {
            case HORAS_EXTRAS_PELO_CRITERIO_MAIS_FAVORAVEL: {
                this.processarSemanaHoraExtraMaisFavoravel(horasExtrasSemanais, totalHorasExtrasNaSemana, inicio, fim);
                break;
            }
            case HORAS_EXTRAS_CONFORME_SUMULA_85: {
                this.processarSemanaSumula85(horasExtrasSemanais, inicio, fim, horasTrabalhadasNoDia, considerarData, acp, saldoHorasExtrasSemanal);
                break;
            }
            case HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_SEMANAL: {
                this.processarSemanaExcedentesJornadaMensal(horasExtrasSemanais, inicio, fim);
                break;
            }
        }
    }

    private void realizarProcessamentoMensal(ApuracaoCartaoDePonto acp) {
        HelperDate dataInicialDeApuracao = HelperDate.getInstance(acp.getDataInicial());
        HelperDate dataFinalDeApuracao = HelperDate.getInstance(acp.getDataFinal());
        HelperDate primeiroFechamento = dataInicialDeApuracao.clone();
        HelperDate dataAuxiliar = dataInicialDeApuracao.clone();
        while (!dataAuxiliar.greaterThen(dataFinalDeApuracao)) {
            while (!this.isFechamento(primeiroFechamento) && !HelperDate.dateEquals(primeiroFechamento.getDate(), dataFinalDeApuracao.getDate())) {
                primeiroFechamento = primeiroFechamento.addDay(1);
            }
            this.processarMes(acp, dataAuxiliar, primeiroFechamento);
            primeiroFechamento.addDay(1);
            dataAuxiliar = primeiroFechamento.clone();
        }
    }

    private boolean isFechamento(HelperDate dataDeTeste) {
        return HelperDate.dateEquals(dataDeTeste.getDate(), this.mapaDataFechamentoDiario.get(dataDeTeste.getDate()).getDate());
    }

    private void processarMes(ApuracaoCartaoDePonto acp, HelperDate inicio, HelperDate fim) {
        BigDecimal cargaTotalDeFeriadosPorDescontar = BigDecimal.ZERO;
        BigDecimal totalTrabalhadoNoMes = BigDecimal.ZERO;
        BigDecimal totalHorasExtrasFeriadoSeparado = BigDecimal.ZERO;
        BigDecimal totalHorasExtrasRepousoSeparado = BigDecimal.ZERO;
        BigDecimal horasTrabalhadasNoDia = BigDecimal.ZERO;
        HelperDate dataAuxiliar = inicio.clone();
        while (!dataAuxiliar.greaterThen(fim)) {
            horasTrabalhadasNoDia = this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).getHorasTrabalhadas();
            boolean considerarData = true;
            if (acp.getConsiderarFeriados().booleanValue() && dataAuxiliar.isHoliday()) {
                if (horasTrabalhadasNoDia.compareTo(BigDecimal.ZERO) > 0 && !acp.getConsiderarJornadaDiariaFeriadoTrabalhado().booleanValue()) {
                    considerarData = false;
                } else if (horasTrabalhadasNoDia.compareTo(BigDecimal.ZERO) == 0 && !acp.getConsiderarJornadaDiariaFeriadoNaoTrabalhado().booleanValue()) {
                    considerarData = false;
                }
            }
            totalTrabalhadoNoMes = Utils.somar(totalTrabalhadoNoMes, horasTrabalhadasNoDia, totalTrabalhadoNoMes);
            totalHorasExtrasFeriadoSeparado = Utils.somar(totalHorasExtrasFeriadoSeparado, this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).getHorasFeriado(), totalHorasExtrasFeriadoSeparado);
            totalHorasExtrasRepousoSeparado = Utils.somar(totalHorasExtrasRepousoSeparado, this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).getHorasDomingo(), totalHorasExtrasRepousoSeparado);
            if (!considerarData) {
                cargaTotalDeFeriadosPorDescontar = Utils.somar(cargaTotalDeFeriadosPorDescontar, this.transformarEmHoras(this.obterCargaDiariaParaDesconto(acp, dataAuxiliar, horasTrabalhadasNoDia)), cargaTotalDeFeriadosPorDescontar);
            }
            dataAuxiliar.addDay(1);
        }
        BigDecimal saldoHorasExtrasMes = Utils.subtrair(acp.getQtJornadaMensal(), cargaTotalDeFeriadosPorDescontar);
        BigDecimal horasExtrasMensal = Utils.subtrair(totalTrabalhadoNoMes, saldoHorasExtrasMes);
        if (acp.getExtraFeriadoSeparado().booleanValue()) {
            horasExtrasMensal = Utils.subtrair(horasExtrasMensal, totalHorasExtrasFeriadoSeparado);
        }
        if (acp.getExtraSabadoDomingoSeparado().booleanValue() || acp.getExtraDescansoSeparado().booleanValue()) {
            horasExtrasMensal = Utils.subtrair(horasExtrasMensal, totalHorasExtrasRepousoSeparado);
        }
        if (BigDecimal.ZERO.compareTo(horasExtrasMensal) < 0) {
            this.mapaDataApuracaoDiaria.get(fim.getDate()).setHorasExtrasMensal(horasExtrasMensal);
        }
        dataAuxiliar = inicio.clone();
        while (!dataAuxiliar.greaterThen(fim)) {
            this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate()).setHorasExtrasDiaria(BigDecimal.ZERO);
            dataAuxiliar.addDay(1);
        }
    }

    private void salvarApuracoesDiarias() {
        for (ApuracaoDiariaCartao adc : this.mapaDataApuracaoDiaria.values()) {
            adc.salvar();
        }
    }

    private void montarCartoesDePonto(Calculo calculo) {
        HashMap<CartoesDePontoEnum, Boolean> inclusoesMensais = new HashMap<CartoesDePontoEnum, Boolean>();
        for (CartoesDePontoEnum cartao : CartoesDePontoEnum.values()) {
            inclusoesMensais.put(cartao, Boolean.FALSE);
        }
        inclusoesMensais.put(CartoesDePontoEnum.HORAS_TRABALHADAS, Boolean.TRUE);
        inclusoesMensais.put(CartoesDePontoEnum.DIAS_TRABALHADOS, Boolean.TRUE);
        this.verificarQuaisColunasIncluirNoRelatorioMensal(calculo, inclusoesMensais);
        Collection<Periodo> meses = this.mapaDataFechamentoMensal.values();
        if (!Utils.naoNulo(meses) || meses.isEmpty()) {
            return;
        }
        TreeMap<CartoesDePontoEnum, Boolean> inclusoesMensaisOrdenada = new TreeMap<CartoesDePontoEnum, Boolean>(new Comparator<CartoesDePontoEnum>(){

            @Override
            public int compare(CartoesDePontoEnum o1, CartoesDePontoEnum o2) {
                int comp1 = o2.getPrioridade().compareTo(o1.getPrioridade());
                return comp1 != 0 ? comp1 : o1.getValor().compareTo(o2.getValor());
            }
        });
        inclusoesMensaisOrdenada.putAll(inclusoesMensais);
        for (CartoesDePontoEnum cartao : CartoesDePontoEnum.values()) {
            if (!((Boolean)inclusoesMensaisOrdenada.get((Object)cartao)).booleanValue()) continue;
            CartaoDePonto cartaoDePonto = new CartaoDePonto();
            cartaoDePonto.setCalculo(calculo);
            cartaoDePonto.setNome(cartao.getNome());
            for (Periodo mes : meses) {
                OcorrenciaDoCartaoDePonto ocorrenciaDoCartaoDePonto = new OcorrenciaDoCartaoDePonto(cartaoDePonto, HelperDate.getCurrentCompetence(mes.getFinal()).getDate(), this.agregarValorMensal(mes, cartao));
                cartaoDePonto.getOcorrencias().add(ocorrenciaDoCartaoDePonto);
            }
            Collections.sort(cartaoDePonto.getOcorrencias());
            cartaoDePonto.salvar();
            for (OcorrenciaDoCartaoDePonto o : cartaoDePonto.getOcorrencias()) {
                o.salvar();
            }
        }
    }

    private void verificarQuaisColunasIncluirNoRelatorioMensal(Calculo calculo, Map<CartoesDePontoEnum, Boolean> inclusoesMensais) {
        boolean incluirRepousosTrabalhados = false;
        boolean incluirFeriadosTrabalhados = false;
        boolean incluirFeriadosRepousosTrabalhados = false;
        boolean incluirPrimeirasHorasExtrasSeparado = false;
        boolean incluirSumula85 = false;
        boolean incluirHorasExtras = false;
        boolean incluirHorasNoturnas = false;
        boolean incluirHorasExtrasNoturna = false;
        boolean incluirHorasExtrasFeriados = false;
        boolean incluirHorasExtrasDomingos = false;
        boolean incluirHorasExtrasDomingosFeriados = false;
        boolean incluirIntrajornadas = false;
        boolean incluirInterjornadas = false;
        boolean incluirColunaArtigo384 = false;
        boolean incluirColunaArtigo253 = false;
        boolean incluirColunaArtigo72 = false;
        boolean incluirDiferencaHorasNoturnas = false;
        boolean incluirExcessoIntrajornada = false;
        for (ApuracaoCartaoDePonto acp : calculo.getApuracoesCartaoDePonto()) {
            if (!incluirRepousosTrabalhados && (acp.getApurarDomingosTrabalhados().booleanValue() || acp.getApurarSabadosDomingosTrabalhados().booleanValue())) {
                incluirRepousosTrabalhados = true;
                inclusoesMensais.put(CartoesDePontoEnum.REPOUSOS_TRABALHADOS, Boolean.TRUE);
            }
            if (!incluirFeriadosTrabalhados && acp.getApurarFeriadosTrabalhados().booleanValue()) {
                incluirFeriadosTrabalhados = true;
                inclusoesMensais.put(CartoesDePontoEnum.FERIADOS_TRABALHADOS, Boolean.TRUE);
            }
            if (!incluirFeriadosRepousosTrabalhados && incluirRepousosTrabalhados && incluirFeriadosTrabalhados) {
                incluirFeriadosRepousosTrabalhados = true;
                inclusoesMensais.put(CartoesDePontoEnum.FERIADOS_REPOUSOS_TRABALHADOS, Boolean.TRUE);
            }
            if (!incluirPrimeirasHorasExtrasSeparado && FormaDeApuracaoCartaoEnum.APURA_PRIMEIRAS_HORAS_EXTRAS_SEPARADO.equals((Object)acp.getFormaDeApuracaoCartao())) {
                incluirPrimeirasHorasExtrasSeparado = true;
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_EXTRAS_PRIMEIRAS_EM_SEPARADO, Boolean.TRUE);
            }
            if (!incluirSumula85 && FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_CONFORME_SUMULA_85.equals((Object)acp.getFormaDeApuracaoCartao())) {
                incluirSumula85 = true;
                inclusoesMensais.put(CartoesDePontoEnum.ADICIONAL_SUMULA_85, Boolean.TRUE);
            }
            if (!incluirHorasExtras && !FormaDeApuracaoCartaoEnum.NAO_APURAR_HORAS_EXTRAS.equals((Object)acp.getFormaDeApuracaoCartao())) {
                incluirHorasExtras = true;
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_EXTRAS, Boolean.TRUE);
            }
            if (!incluirHorasNoturnas && acp.getApurarHorasNoturnas().booleanValue()) {
                incluirHorasNoturnas = true;
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_NOTURNAS, Boolean.TRUE);
            }
            if (!incluirHorasExtrasNoturna && acp.getApurarHorasExtrasNoturnas().booleanValue()) {
                incluirHorasExtrasNoturna = true;
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_EXTRAS_NOTURNAS, Boolean.TRUE);
            }
            if (!incluirHorasExtrasFeriados && acp.getExtraFeriadoSeparado().booleanValue()) {
                incluirHorasExtrasFeriados = true;
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_EXTRAS_FERIADOS, Boolean.TRUE);
            }
            if (incluirHorasExtrasNoturna && incluirHorasExtrasFeriados) {
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_EXTRAS_NOTURNAS_FERIADOS, Boolean.TRUE);
            }
            if (!incluirHorasExtrasDomingos && (acp.getExtraDescansoSeparado().booleanValue() || acp.getExtraSabadoDomingoSeparado().booleanValue())) {
                incluirHorasExtrasDomingos = true;
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_EXTRAS_REPOUSOS, Boolean.TRUE);
            }
            if (incluirHorasExtrasNoturna && incluirHorasExtrasDomingos) {
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_EXTRAS_NOTURNAS_REPOUSOS, Boolean.TRUE);
            }
            if (!incluirHorasExtrasDomingosFeriados && (acp.getExtraDescansoSeparado().booleanValue() || acp.getExtraSabadoDomingoSeparado().booleanValue()) && acp.getExtraFeriadoSeparado().booleanValue()) {
                incluirHorasExtrasDomingosFeriados = true;
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_EXTRAS_REPOUSOS_FERIADOS, Boolean.TRUE);
            }
            if (!incluirIntrajornadas && (acp.getIntervaloIntraJornadaSupQuatroSeis().booleanValue() || acp.getIntervalorIntraJornadaSupSeis().booleanValue())) {
                incluirIntrajornadas = true;
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_INTRAJORNADAS, Boolean.TRUE);
            }
            if (!incluirExcessoIntrajornada && acp.getApurarExcessoIntervaloIntra().booleanValue()) {
                incluirExcessoIntrajornada = true;
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_EXCESSO_INTRAJORNADA, Boolean.TRUE);
            }
            if (!incluirInterjornadas && acp.getDescansoEntreJornadas().booleanValue()) {
                incluirInterjornadas = true;
                inclusoesMensais.put(CartoesDePontoEnum.HORAS_INTERJORNADAS, Boolean.TRUE);
            }
            this.verificarColunasDeSupressao(inclusoesMensais, acp, incluirColunaArtigo384, incluirColunaArtigo253, incluirColunaArtigo72);
            if (incluirDiferencaHorasNoturnas || !acp.getApurarHorasNoturnas().booleanValue() || !acp.getApurarHorasExtrasNoturnas().booleanValue()) continue;
            incluirDiferencaHorasNoturnas = true;
            inclusoesMensais.put(CartoesDePontoEnum.DIFERENCA_HORAS_NOTURNAS, Boolean.TRUE);
        }
    }

    private void verificarColunasDeSupressao(Map<CartoesDePontoEnum, Boolean> inclusoesMensais, ApuracaoCartaoDePonto acp, boolean incluirColunaArtigo384, boolean incluirColunaArtigo253, boolean incluirColunaArtigo72) {
        if (!incluirColunaArtigo384 && acp.getApurarSupressaoIntervalo384().booleanValue()) {
            incluirColunaArtigo384 = true;
            inclusoesMensais.put(CartoesDePontoEnum.HORAS_ARTIGO_384, Boolean.TRUE);
        }
        if (!incluirColunaArtigo253 && acp.getApurarSupressaoIntervaloArt253().booleanValue()) {
            incluirColunaArtigo253 = true;
            inclusoesMensais.put(CartoesDePontoEnum.HORAS_ARTIGO_253, Boolean.TRUE);
        }
        if (!incluirColunaArtigo72 && acp.getApurarSupressaoIntervalo72().booleanValue()) {
            incluirColunaArtigo72 = true;
            inclusoesMensais.put(CartoesDePontoEnum.HORAS_ARTIGO_72, Boolean.TRUE);
        }
    }

    private BigDecimal agregarValorMensal(Periodo mes, CartoesDePontoEnum cartao) {
        BigDecimal valorMensal = BigDecimal.ZERO;
        HelperDate dataAuxiliar = HelperDate.getInstance(mes.getInicial());
        while (HelperDate.dateBeforeOrEquals(dataAuxiliar.getDate(), mes.getFinal())) {
            ApuracaoDiariaCartao adc = this.mapaDataApuracaoDiaria.get(dataAuxiliar.getDate());
            if (Utils.naoNulo(adc)) {
                valorMensal = this.incrementarValorMensal(cartao, valorMensal, adc);
            }
            dataAuxiliar.addDay(1);
        }
        return valorMensal;
    }

    private BigDecimal incrementarValorMensal(CartoesDePontoEnum cartao, BigDecimal valorMensal, ApuracaoDiariaCartao adc) {
        ApuracaoCartaoDePonto acp = adc.getApuracaoCartaoDePonto();
        boolean deveForcarProrrogacaoSumula60 = acp.getHorarioProrrogadoSumula60() != false && (acp.getForcarProrrogacao() != false || this.checarSeHorarioDeEntradaFoiAntesDoInicioDoHorarioNoturno(adc));
        switch (cartao) {
            case HORAS_TRABALHADAS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasTrabalhadas(), valorMensal);
                break;
            }
            case HORAS_DIURNAS: {
                valorMensal = Utils.somar(valorMensal, Utils.subtrair(Utils.subtrair(adc.getHorasTrabalhadas(), adc.getHorasNoturnas()), adc.getHorasProrrogNoturnas()), valorMensal);
                break;
            }
            case HORAS_NOTURNAS: {
                valorMensal = deveForcarProrrogacaoSumula60 ? Utils.somar(valorMensal, Utils.somar(adc.getHorasNoturnas(), adc.getHorasProrrogNoturnas()), valorMensal) : Utils.somar(valorMensal, adc.getHorasNoturnas(), valorMensal);
                break;
            }
            case HORAS_EXTRAS_DIARIAS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasExtrasDiaria(), valorMensal);
                break;
            }
            case HORAS_EXTRAS_NOTURNAS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasExtrasNoturna(), valorMensal);
                break;
            }
            case HORAS_EXTRAS_REPOUSOS_FERIADOS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasDomingoFeriado(), valorMensal);
                break;
            }
            case HORAS_EXTRAS_SEMANAIS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasExtrasSemanal(), valorMensal);
                break;
            }
            case HORAS_EXTRAS_MENSAIS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasExtrasMensal(), valorMensal);
                break;
            }
            case DIFERENCA_HORAS_NOTURNAS: {
                valorMensal = this.obterValorMensalDiferencaHorasNoturnas(valorMensal, adc, deveForcarProrrogacaoSumula60);
                break;
            }
            case HORAS_EXTRAS_PRIMEIRAS_EM_SEPARADO: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasPrimExtSeparado(), valorMensal);
                break;
            }
            case ADICIONAL_SUMULA_85: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasAdicionalSumula85(), valorMensal);
                break;
            }
            case HORAS_INTRAJORNADAS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasIntraJornada(), valorMensal);
                break;
            }
            case HORAS_EXCESSO_INTRAJORNADA: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasExcessoIntraJornada(), valorMensal);
                break;
            }
            case HORAS_INTERJORNADAS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasInterJornadas(), valorMensal);
                break;
            }
            case HORAS_ARTIGO_384: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasArt384(), valorMensal);
                break;
            }
            case HORAS_ARTIGO_253: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasArt253(), valorMensal);
                break;
            }
            case HORAS_ARTIGO_72: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasArt72(), valorMensal);
                break;
            }
            case DIAS_TRABALHADOS: {
                BigDecimal valorASomar = BigDecimal.ZERO.compareTo(adc.getHorasTrabalhadas()) < 0 ? BigDecimal.ONE : BigDecimal.ZERO;
                valorMensal = Utils.somar(valorMensal, valorASomar, valorMensal);
                break;
            }
            case REPOUSOS_TRABALHADOS: {
                valorMensal = Utils.somar(valorMensal, new BigDecimal(adc.getQtRepousoTrabalhado()), valorMensal);
                break;
            }
            case FERIADOS_REPOUSOS_TRABALHADOS: {
                valorMensal = Utils.somar(valorMensal, new BigDecimal(adc.getQtFeriadoRepousoTrabalhado()), valorMensal);
                break;
            }
            case FERIADOS_TRABALHADOS: {
                valorMensal = Utils.somar(valorMensal, new BigDecimal(adc.getQtFeriadoTrabalhado()), valorMensal);
                break;
            }
            case HORAS_EXTRAS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasExtrasDiaria(), valorMensal);
                valorMensal = Utils.somar(valorMensal, adc.getHorasExtrasSemanal(), valorMensal);
                valorMensal = Utils.somar(valorMensal, adc.getHorasExtrasMensal(), valorMensal);
                break;
            }
            case HORAS_EXTRAS_REPOUSOS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasDomingo(), valorMensal);
                break;
            }
            case HORAS_EXTRAS_NOTURNAS_REPOUSOS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasNoturnasDomingo(), valorMensal);
                break;
            }
            case HORAS_EXTRAS_FERIADOS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasFeriado(), valorMensal);
                break;
            }
            case HORAS_EXTRAS_NOTURNAS_FERIADOS: {
                valorMensal = Utils.somar(valorMensal, adc.getHorasNoturnasFeriado(), valorMensal);
                break;
            }
        }
        return valorMensal;
    }

    private boolean checarSeHorarioDeEntradaFoiAntesDoInicioDoHorarioNoturno(ApuracaoDiariaCartao adc) {
        String[] entradas;
        String entrada = "";
        if (adc.getFrequenciaDiaria() != null && !adc.getFrequenciaDiaria().isEmpty() && (entradas = adc.getFrequenciaDiaria().split("[-]")).length > 0) {
            entrada = entradas[0];
        }
        if (!entrada.isEmpty()) {
            BigDecimal entradaEmMillis = Utils.converterHoraMinutoEmMilis(entrada);
            BigDecimal hrInicioNoturnoMillis = Utils.converterHoraMinutoEmMilis(adc.getApuracaoCartaoDePonto().obterInicioAtividadeHorarioNoturno());
            if (entradaEmMillis != null && entradaEmMillis.compareTo(hrInicioNoturnoMillis) <= 0) {
                return true;
            }
        }
        return false;
    }

    private BigDecimal obterValorMensalDiferencaHorasNoturnas(BigDecimal valorMensal, ApuracaoDiariaCartao adc, boolean deveForcarProrrogacaoSumula60) {
        BigDecimal totalHorasNoturnas = Utils.somar(adc.getHorasNoturnas(), adc.getHorasProrrogNoturnas());
        BigDecimal totalSubtrairHorasNoturnas = BigDecimal.ZERO;
        if (adc.getHorasExtrasNoturna() != null) {
            totalSubtrairHorasNoturnas = Utils.somar(totalSubtrairHorasNoturnas, adc.getHorasExtrasNoturna());
        }
        if (adc.getHorasNoturnasDomingo() != null) {
            totalSubtrairHorasNoturnas = Utils.somar(totalSubtrairHorasNoturnas, adc.getHorasNoturnasDomingo());
        }
        if (adc.getHorasNoturnasFeriado() != null) {
            totalSubtrairHorasNoturnas = Utils.somar(totalSubtrairHorasNoturnas, adc.getHorasNoturnasFeriado());
        }
        return deveForcarProrrogacaoSumula60 ? Utils.somar(valorMensal, Utils.subtrair(totalHorasNoturnas, totalSubtrairHorasNoturnas, BigDecimal.ZERO), valorMensal) : Utils.somar(valorMensal, Utils.subtrair(adc.getHorasNoturnas(), totalSubtrairHorasNoturnas, BigDecimal.ZERO), valorMensal);
    }
}

