/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.Jornada;
import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.logging.Logger;

public class CartaoDePontoUtils {
    private static final Logger LOGGER = Logger.getLogger(CartaoDePontoUtils.class.getSimpleName());
    public static final String FORMATO_DATA = "dd/MM/yyyy";
    public static final String FORMATO_HORA = "HH:mm";
    public static final BigDecimal VINTE_QUATRO_HORAS_MILLIS = new BigDecimal("86400000");
    public static final BigDecimal FATOR_HORA_FICTA = new BigDecimal("1.142857");
    private static final int NUMERO_MAXIMO_DE_ENTRADAS_E_SAIDAS_DE_TURNOS = 12;
    private static final int DUAS_ENTRADAS = 2;
    private static final BigDecimal QUARENTA_SETE_HORAS_CINQUENTA_NOVE_MINUTOS_MILLIS = new BigDecimal("172740000");
    private static final int ENTRADA_PRIMEIRO_TURNO = 0;
    private static final int SAIDA_PRIMEIRO_TURNO = 1;
    private static final int ENTRADA_SEGUNDO_TURNO = 2;
    private static final int SAIDA_SEGUNDO_TURNO = 3;
    private static final int ENTRADA_TERCEIRO_TURNO = 4;
    private static final int SAIDA_TERCEIRO_TURNO = 5;
    private static final int ENTRADA_QUARTO_TURNO = 6;
    private static final int SAIDA_QUARTO_TURNO = 7;
    private static final int ENTRADA_QUINTO_TURNO = 8;
    private static final int SAIDA_QUINTO_TURNO = 9;
    private static final int ENTRADA_SEXTO_TURNO = 10;
    private static final int SAIDA_SEXTO_TURNO = 11;
    private static final int INDICE_PRIMEIRO_TURNO = 0;
    private static final int INDICE_SEGUNDO_TURNO = 1;
    private static final int INDICE_TERCEIRO_TURNO = 2;
    private static final int INDICE_QUARTO_TURNO = 3;
    private static final int INDICE_QUINTO_TURNO = 4;
    private static final int INDICE_SEXTO_TURNO = 5;

    public static BigDecimal[] montarTurnos(Jornada jornada) {
        return CartaoDePontoUtils.montarTurnos(jornada, BigDecimal.ZERO);
    }

    public static BigDecimal[] montarTurnos(Jornada jornada, BigDecimal horasParaAcrescentar) {
        BigDecimal horaSaida;
        BigDecimal horaEntrada;
        BigDecimal[] turnos = new BigDecimal[12];
        int trocouDia = 0;
        BigDecimal fimHorarioNoturno = Utils.converterHoraMinutoEmMilis(jornada.getApuracaoCartaoDePonto().obterFimAtividadeHorarioNoturno());
        if (Utils.naoVazio(jornada.getHrEntrada1())) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada1());
            horaSaida = Utils.converterHoraMinutoEmMilis(jornada.getHrSaida1());
            trocouDia = CartaoDePontoUtils.preencherTurno(horasParaAcrescentar, turnos, trocouDia, horaEntrada, horaSaida, fimHorarioNoturno, 0, 1);
        }
        if (Utils.naoVazio(jornada.getHrEntrada2())) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada2());
            horaSaida = Utils.converterHoraMinutoEmMilis(jornada.getHrSaida2());
            if (Utils.naoVazio(jornada.getHrSaida1()) && horaEntrada.compareTo(Utils.converterHoraMinutoEmMilis(jornada.getHrSaida1())) <= 0) {
                ++trocouDia;
            }
            trocouDia = CartaoDePontoUtils.preencherTurno(horasParaAcrescentar, turnos, trocouDia, horaEntrada, horaSaida, fimHorarioNoturno, 2, 3);
        }
        if (Utils.naoVazio(jornada.getHrEntrada3())) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada3());
            horaSaida = Utils.converterHoraMinutoEmMilis(jornada.getHrSaida3());
            if (Utils.naoVazio(jornada.getHrSaida2()) && horaEntrada.compareTo(Utils.converterHoraMinutoEmMilis(jornada.getHrSaida2())) <= 0) {
                ++trocouDia;
            }
            trocouDia = CartaoDePontoUtils.preencherTurno(horasParaAcrescentar, turnos, trocouDia, horaEntrada, horaSaida, fimHorarioNoturno, 4, 5);
        }
        if (Utils.naoVazio(jornada.getHrEntrada4())) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada4());
            horaSaida = Utils.converterHoraMinutoEmMilis(jornada.getHrSaida4());
            if (Utils.naoVazio(jornada.getHrSaida3()) && horaEntrada.compareTo(Utils.converterHoraMinutoEmMilis(jornada.getHrSaida3())) <= 0) {
                ++trocouDia;
            }
            trocouDia = CartaoDePontoUtils.preencherTurno(horasParaAcrescentar, turnos, trocouDia, horaEntrada, horaSaida, fimHorarioNoturno, 6, 7);
        }
        if (Utils.naoVazio(jornada.getHrEntrada5())) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada5());
            horaSaida = Utils.converterHoraMinutoEmMilis(jornada.getHrSaida5());
            if (Utils.naoVazio(jornada.getHrSaida4()) && horaEntrada.compareTo(Utils.converterHoraMinutoEmMilis(jornada.getHrSaida4())) <= 0) {
                ++trocouDia;
            }
            trocouDia = CartaoDePontoUtils.preencherTurno(horasParaAcrescentar, turnos, trocouDia, horaEntrada, horaSaida, fimHorarioNoturno, 8, 9);
        }
        if (Utils.naoVazio(jornada.getHrEntrada6())) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada6());
            horaSaida = Utils.converterHoraMinutoEmMilis(jornada.getHrSaida6());
            if (Utils.naoVazio(jornada.getHrSaida5()) && horaEntrada.compareTo(Utils.converterHoraMinutoEmMilis(jornada.getHrSaida5())) <= 0) {
                ++trocouDia;
            }
            trocouDia = CartaoDePontoUtils.preencherTurno(horasParaAcrescentar, turnos, trocouDia, horaEntrada, horaSaida, fimHorarioNoturno, 10, 11);
        }
        return turnos;
    }

    public static Date getFimAtividadeNoturna(ApuracaoCartaoDePonto acp) {
        try {
            Date parse = new SimpleDateFormat(FORMATO_HORA).parse(acp.obterFimAtividadeHorarioNoturno());
            parse.setTime(parse.getTime() + VINTE_QUATRO_HORAS_MILLIS.longValue());
            return parse;
        }
        catch (ParseException e) {
            LOGGER.warning(e.getMessage());
            Calendar fimPadrao = Calendar.getInstance();
            int cincoHoras = 5;
            fimPadrao.set(11, 5);
            fimPadrao.set(12, 0);
            int segundoDia = 2;
            fimPadrao.set(5, 2);
            return fimPadrao.getTime();
        }
    }

    public static Date getInicioAtividadeNoturna(ApuracaoCartaoDePonto acp) {
        try {
            return new SimpleDateFormat(FORMATO_HORA).parse(acp.obterInicioAtividadeHorarioNoturno());
        }
        catch (ParseException e) {
            LOGGER.warning(e.getMessage());
            Calendar inicioPadrao = Calendar.getInstance();
            int vinteEDuasHoras = 22;
            inicioPadrao.set(11, 22);
            inicioPadrao.set(12, 0);
            boolean primeiroDia = true;
            inicioPadrao.set(5, 1);
            return inicioPadrao.getTime();
        }
    }

    private static int preencherTurno(BigDecimal horasParaAcrescentar, BigDecimal[] turnos, int trocouDia, BigDecimal horaEntrada, BigDecimal horaSaida, BigDecimal fimHorarioNoturno, int entrada, int saida) {
        if (trocouDia > 0) {
            BigDecimal fator = Utils.multiplicar(new BigDecimal(trocouDia), VINTE_QUATRO_HORAS_MILLIS);
            horaEntrada = Utils.somar(horaEntrada, fator, horaEntrada);
            horaSaida = Utils.somar(horaSaida, fator, horaSaida);
        }
        if (horaSaida.compareTo(horaEntrada) <= 0) {
            ++trocouDia;
            horaSaida = Utils.somar(horaSaida, VINTE_QUATRO_HORAS_MILLIS, horaSaida);
        }
        turnos[entrada] = Utils.somar(horaEntrada, horasParaAcrescentar, horaEntrada);
        turnos[saida] = Utils.somar(horaSaida, horasParaAcrescentar, horaSaida);
        return trocouDia;
    }

    public static NegocioException validarListaDeJornadas(NegocioException excecao, List<? extends Jornada> jornadas, boolean testarVolta, boolean considerarPenultimo) {
        Jornada pPrimeiro = null;
        Jornada pPenultimo = null;
        Jornada pUltimo = null;
        for (Jornada jornada : jornadas) {
            try {
                jornada.validar();
                if (Utils.naoNulo(pPenultimo)) {
                    CartaoDePontoUtils.validarJornadasRelativas(pUltimo, pPenultimo, Boolean.TRUE);
                }
            }
            catch (NegocioException ne) {
                excecao.agregarExcecao(ne);
            }
            if (Utils.nulo(pPrimeiro)) {
                pPrimeiro = jornada;
            } else {
                pPenultimo = pUltimo;
            }
            pUltimo = jornada;
        }
        if (!considerarPenultimo) {
            try {
                if (Utils.naoNulo(pPenultimo)) {
                    CartaoDePontoUtils.validarJornadasRelativas(pUltimo, pPenultimo, Boolean.TRUE);
                }
            }
            catch (NegocioException ne) {
                excecao.agregarExcecao(ne);
            }
        }
        if (testarVolta) {
            try {
                CartaoDePontoUtils.validarJornadasRelativas(pPrimeiro, considerarPenultimo ? pPenultimo : pUltimo, Boolean.TRUE);
            }
            catch (NegocioException ne) {
                excecao.agregarExcecao(ne);
            }
        }
        return excecao;
    }

    public static Boolean isPeriodosSemDescanso(Jornada p) {
        if (Utils.naoNulos(p.getHrSaida1(), p.getHrEntrada2()) && p.getHrSaida1().trim().equals(p.getHrEntrada2().trim())) {
            return true;
        }
        if (Utils.naoNulos(p.getHrSaida2(), p.getHrEntrada3()) && p.getHrSaida2().trim().equals(p.getHrEntrada3().trim())) {
            return true;
        }
        if (Utils.naoNulos(p.getHrSaida3(), p.getHrEntrada4()) && p.getHrSaida3().trim().equals(p.getHrEntrada4().trim())) {
            return true;
        }
        if (Utils.naoNulos(p.getHrSaida4(), p.getHrEntrada5()) && p.getHrSaida4().trim().equals(p.getHrEntrada5().trim())) {
            return true;
        }
        if (Utils.naoNulos(p.getHrSaida5(), p.getHrEntrada6()) && p.getHrSaida5().trim().equals(p.getHrEntrada6().trim())) {
            return true;
        }
        return false;
    }

    public static Boolean isPeriodoCorrenteDentroDePeriodoJaLancado(Jornada p) {
        BigDecimal[] turnos = CartaoDePontoUtils.montarTurnos(p);
        BigDecimal hrEntrada1Milis = turnos[0];
        BigDecimal hrSaida1Milis = turnos[1];
        BigDecimal hrEntrada2Milis = turnos[2];
        BigDecimal hrSaida2Milis = turnos[3];
        BigDecimal hrEntrada3Milis = turnos[4];
        BigDecimal hrSaida3Milis = turnos[5];
        BigDecimal hrEntrada4Milis = turnos[6];
        BigDecimal hrSaida4Milis = turnos[7];
        BigDecimal hrEntrada5Milis = turnos[8];
        BigDecimal hrSaida5Milis = turnos[9];
        BigDecimal hrEntrada6Milis = turnos[10];
        BigDecimal hrSaida6Milis = turnos[11];
        BigDecimal[] entradas = new BigDecimal[]{hrEntrada1Milis, hrEntrada2Milis, hrEntrada3Milis, hrEntrada4Milis, hrEntrada5Milis, hrEntrada6Milis};
        BigDecimal[] saidas = new BigDecimal[]{hrSaida1Milis, hrSaida2Milis, hrSaida3Milis, hrSaida4Milis, hrSaida5Milis, hrSaida6Milis};
        for (int i = 0; i < entradas.length; ++i) {
            BigDecimal entradaMilis = entradas[i];
            BigDecimal saidaMilis = saidas[i];
            boolean controle = false;
            if (Utils.nulo(entradaMilis)) continue;
            if (Utils.naoNulo(hrEntrada1Milis) && i != 0) {
                boolean coincideComPrimeiroPeriodo = entradaMilis.compareTo(hrEntrada1Milis) >= 0 && entradaMilis.compareTo(hrSaida1Milis) <= 0 || saidaMilis.compareTo(hrSaida1Milis) <= 0 && saidaMilis.compareTo(hrEntrada1Milis) >= 0;
                boolean bl = controle = coincideComPrimeiroPeriodo ? coincideComPrimeiroPeriodo : controle;
            }
            if (Utils.naoNulo(hrEntrada2Milis) && i != 1) {
                boolean coincideComSegundoPeriodo = entradaMilis.compareTo(hrEntrada2Milis) >= 0 && entradaMilis.compareTo(hrSaida2Milis) <= 0 || saidaMilis.compareTo(hrSaida2Milis) <= 0 && saidaMilis.compareTo(hrEntrada2Milis) >= 0;
                boolean bl = controle = coincideComSegundoPeriodo ? coincideComSegundoPeriodo : controle;
            }
            if (Utils.naoNulo(hrEntrada3Milis) && i != 2) {
                boolean coincideComTerceiroPeriodo = entradaMilis.compareTo(hrEntrada3Milis) >= 0 && entradaMilis.compareTo(hrSaida3Milis) <= 0 || saidaMilis.compareTo(hrSaida3Milis) <= 0 && saidaMilis.compareTo(hrEntrada3Milis) >= 0;
                boolean bl = controle = coincideComTerceiroPeriodo ? coincideComTerceiroPeriodo : controle;
            }
            if (Utils.naoNulo(hrEntrada4Milis) && i != 3) {
                boolean coincideComQuartoPeriodo = entradaMilis.compareTo(hrEntrada4Milis) >= 0 && entradaMilis.compareTo(hrSaida4Milis) <= 0 || saidaMilis.compareTo(hrSaida4Milis) <= 0 && saidaMilis.compareTo(hrEntrada4Milis) >= 0;
                boolean bl = controle = coincideComQuartoPeriodo ? coincideComQuartoPeriodo : controle;
            }
            if (Utils.naoNulo(hrEntrada5Milis) && i != 4) {
                boolean coincideComQuintoPeriodo = entradaMilis.compareTo(hrEntrada5Milis) >= 0 && entradaMilis.compareTo(hrSaida5Milis) <= 0 || saidaMilis.compareTo(hrSaida5Milis) <= 0 && saidaMilis.compareTo(hrEntrada5Milis) >= 0;
                boolean bl = controle = coincideComQuintoPeriodo ? coincideComQuintoPeriodo : controle;
            }
            if (Utils.naoNulo(hrEntrada6Milis) && i != 5) {
                boolean coincideComSextoPeriodo = entradaMilis.compareTo(hrEntrada6Milis) >= 0 && entradaMilis.compareTo(hrSaida6Milis) <= 0 || saidaMilis.compareTo(hrSaida6Milis) <= 0 && saidaMilis.compareTo(hrEntrada6Milis) >= 0;
                boolean bl = controle = coincideComSextoPeriodo ? coincideComSextoPeriodo : controle;
            }
            if (!controle) continue;
            return true;
        }
        return false;
    }

    public static Boolean isPeriodoCorrenteDentroDePeriodoDeDescanso(Jornada p) {
        BigDecimal[] turnos = CartaoDePontoUtils.montarTurnos(p);
        BigDecimal hrEntrada1Milis = turnos[0];
        BigDecimal hrSaida1Milis = turnos[1];
        BigDecimal hrEntrada2Milis = turnos[2];
        BigDecimal hrSaida2Milis = turnos[3];
        BigDecimal hrEntrada3Milis = turnos[4];
        BigDecimal hrSaida3Milis = turnos[5];
        BigDecimal hrEntrada4Milis = turnos[6];
        BigDecimal hrSaida4Milis = turnos[7];
        BigDecimal hrEntrada5Milis = turnos[8];
        BigDecimal hrSaida5Milis = turnos[9];
        BigDecimal hrEntrada6Milis = turnos[10];
        BigDecimal hrSaida6Milis = turnos[11];
        String ultimaSaida = null;
        Integer posicaoUltimaSaida = 0;
        if (Utils.naoVazio(p.getHrEntrada6())) {
            ultimaSaida = p.getHrSaida6();
            posicaoUltimaSaida = 5;
        } else if (Utils.naoVazio(p.getHrEntrada5())) {
            ultimaSaida = p.getHrSaida5();
            posicaoUltimaSaida = 4;
        } else if (Utils.naoVazio(p.getHrEntrada4())) {
            ultimaSaida = p.getHrSaida4();
            posicaoUltimaSaida = 3;
        } else if (Utils.naoVazio(p.getHrEntrada3())) {
            ultimaSaida = p.getHrSaida3();
            posicaoUltimaSaida = 2;
        } else if (Utils.naoVazio(p.getHrEntrada2())) {
            ultimaSaida = p.getHrSaida2();
            posicaoUltimaSaida = 1;
        } else if (Utils.naoVazio(p.getHrEntrada1())) {
            ultimaSaida = p.getHrSaida1();
            posicaoUltimaSaida = 0;
        }
        BigDecimal[] entradas = new BigDecimal[]{hrEntrada1Milis, hrEntrada2Milis, hrEntrada3Milis, hrEntrada4Milis, hrEntrada5Milis, hrEntrada6Milis};
        BigDecimal[] saidas = new BigDecimal[]{hrSaida1Milis, hrSaida2Milis, hrSaida3Milis, hrSaida4Milis, hrSaida5Milis, hrSaida6Milis};
        for (int i = 0; i < entradas.length; ++i) {
            BigDecimal entradaMilis = entradas[i];
            BigDecimal saidaMilis = saidas[i];
            if (Utils.nulo(entradaMilis) || Utils.nulo(saidaMilis)) continue;
            boolean coincideComDescanso = false;
            coincideComDescanso = CartaoDePontoUtils.checarPrimeiroDescanso(coincideComDescanso, hrSaida1Milis, hrEntrada2Milis, entradaMilis, saidaMilis, i);
            coincideComDescanso = CartaoDePontoUtils.checarSegundoDescanso(coincideComDescanso, hrSaida2Milis, hrEntrada3Milis, entradaMilis, saidaMilis, i);
            coincideComDescanso = CartaoDePontoUtils.checarTerceiroDescanso(coincideComDescanso, hrSaida3Milis, hrEntrada4Milis, entradaMilis, saidaMilis, i);
            coincideComDescanso = CartaoDePontoUtils.checarQuartoDescanso(coincideComDescanso, hrSaida4Milis, hrEntrada5Milis, entradaMilis, saidaMilis, i);
            coincideComDescanso = CartaoDePontoUtils.checarQuintoDescanso(coincideComDescanso, hrSaida5Milis, hrEntrada6Milis, entradaMilis, saidaMilis, i);
            if (!(coincideComDescanso = CartaoDePontoUtils.checarSextoDescanso(coincideComDescanso, ultimaSaida, hrEntrada1Milis, entradaMilis, saidaMilis, i, posicaoUltimaSaida).booleanValue())) continue;
            return true;
        }
        return false;
    }

    private static Boolean checarPrimeiroDescanso(boolean coincideComDescanso, BigDecimal hrSaida1Milis, BigDecimal hrEntrada2Milis, BigDecimal entradaMilis, BigDecimal saidaMilis, int i) {
        if (coincideComDescanso) {
            return true;
        }
        if (Utils.naoNulo(hrEntrada2Milis) && Utils.naoNulo(hrSaida1Milis)) {
            boolean comparacao;
            boolean bl = comparacao = entradaMilis.compareTo(hrEntrada2Milis) <= 0 && entradaMilis.compareTo(hrSaida1Milis) >= 0 || saidaMilis.compareTo(hrSaida1Milis) >= 0 && saidaMilis.compareTo(hrEntrada2Milis) <= 0;
            if (comparacao && i != 0 && i != 1) {
                return true;
            }
        }
        return false;
    }

    private static Boolean checarSegundoDescanso(boolean coincideComDescanso, BigDecimal hrSaida2Milis, BigDecimal hrEntrada3Milis, BigDecimal entradaMilis, BigDecimal saidaMilis, int i) {
        if (coincideComDescanso) {
            return true;
        }
        if (Utils.naoNulo(hrEntrada3Milis) && Utils.naoNulo(hrSaida2Milis)) {
            boolean comparacao;
            boolean bl = comparacao = entradaMilis.compareTo(hrEntrada3Milis) <= 0 && entradaMilis.compareTo(hrSaida2Milis) >= 0 || saidaMilis.compareTo(hrSaida2Milis) >= 0 && saidaMilis.compareTo(hrEntrada3Milis) <= 0;
            if (comparacao && i != 1 && i != 2) {
                return true;
            }
        }
        return false;
    }

    private static Boolean checarTerceiroDescanso(boolean coincideComDescanso, BigDecimal hrSaida3Milis, BigDecimal hrEntrada4Milis, BigDecimal entradaMilis, BigDecimal saidaMilis, int i) {
        if (coincideComDescanso) {
            return true;
        }
        if (Utils.naoNulo(hrEntrada4Milis) && Utils.naoNulo(hrSaida3Milis)) {
            boolean comparacao;
            boolean bl = comparacao = entradaMilis.compareTo(hrEntrada4Milis) <= 0 && entradaMilis.compareTo(hrSaida3Milis) >= 0 || saidaMilis.compareTo(hrSaida3Milis) >= 0 && saidaMilis.compareTo(hrEntrada4Milis) <= 0;
            if (comparacao && i != 2 && i != 3) {
                return true;
            }
        }
        return false;
    }

    private static Boolean checarQuartoDescanso(boolean coincideComDescanso, BigDecimal hrSaida4Milis, BigDecimal hrEntrada5Milis, BigDecimal entradaMilis, BigDecimal saidaMilis, int i) {
        if (coincideComDescanso) {
            return true;
        }
        if (Utils.naoNulo(hrEntrada5Milis) && Utils.naoNulo(hrSaida4Milis)) {
            boolean comparacao;
            boolean bl = comparacao = entradaMilis.compareTo(hrEntrada5Milis) <= 0 && entradaMilis.compareTo(hrSaida4Milis) >= 0 || saidaMilis.compareTo(hrSaida4Milis) >= 0 && saidaMilis.compareTo(hrEntrada5Milis) <= 0;
            if (comparacao && i != 3 && i != 4) {
                return true;
            }
        }
        return false;
    }

    private static Boolean checarQuintoDescanso(boolean coincideComDescanso, BigDecimal hrSaida5Milis, BigDecimal hrEntrada6Milis, BigDecimal entradaMilis, BigDecimal saidaMilis, int i) {
        if (coincideComDescanso) {
            return true;
        }
        if (Utils.naoNulo(hrEntrada6Milis) && Utils.naoNulo(hrSaida5Milis)) {
            boolean comparacao;
            boolean bl = comparacao = entradaMilis.compareTo(hrEntrada6Milis) <= 0 && entradaMilis.compareTo(hrSaida5Milis) >= 0 || saidaMilis.compareTo(hrSaida5Milis) >= 0 && saidaMilis.compareTo(hrEntrada6Milis) <= 0;
            if (comparacao && i != 4 && i != 5) {
                return true;
            }
        }
        return false;
    }

    private static Boolean checarSextoDescanso(boolean coincideComDescanso, String ultimaSaida, BigDecimal hrEntrada1Milis, BigDecimal entradaMilis, BigDecimal saidaMilis, int i, Integer posicaoUltimaSaida) {
        if (coincideComDescanso) {
            return true;
        }
        if (Utils.naoNulo(hrEntrada1Milis) && Utils.naoNulo(ultimaSaida)) {
            boolean comparacao;
            BigDecimal ultimaSaidaMilis = Utils.converterHoraMinutoEmMilis(ultimaSaida);
            boolean bl = comparacao = entradaMilis.compareTo(hrEntrada1Milis) <= 0 && entradaMilis.compareTo(ultimaSaidaMilis) >= 0 || saidaMilis.compareTo(ultimaSaidaMilis) >= 0 && saidaMilis.compareTo(hrEntrada1Milis) <= 0;
            if (comparacao && i != posicaoUltimaSaida && i != 0) {
                return true;
            }
        }
        return false;
    }

    public static void validarJornadasRelativas(Jornada pAtual, Jornada pAnterior, boolean acusarErroNaAtual) {
        BigDecimal[] turnosAnterior = CartaoDePontoUtils.montarTurnos(pAnterior);
        BigDecimal[] turnos = CartaoDePontoUtils.montarTurnos(pAtual);
        BigDecimal ultimaSaidaAnterior = null;
        BigDecimal primeiraEntradaAtual = null;
        for (int i = 0; i < 12; ++i) {
            if (Utils.nulo(primeiraEntradaAtual) && Utils.naoNulo(turnos[i])) {
                primeiraEntradaAtual = turnos[i];
            }
            if (!Utils.naoNulo(turnosAnterior[i])) continue;
            ultimaSaidaAnterior = turnosAnterior[i];
        }
        primeiraEntradaAtual = Utils.somar(primeiraEntradaAtual, VINTE_QUATRO_HORAS_MILLIS);
        if (!CartaoDePontoUtils.hasEntradaNoPeriodoNoturno(pAtual) && CartaoDePontoUtils.hasEntradaNoPeriodoNoturno(pAnterior)) {
            ultimaSaidaAnterior = Utils.subtrair(ultimaSaidaAnterior, VINTE_QUATRO_HORAS_MILLIS);
        }
        if (Utils.naoNulos(primeiraEntradaAtual, ultimaSaidaAnterior) && primeiraEntradaAtual.compareTo(ultimaSaidaAnterior) <= 0) {
            NegocioException ne = acusarErroNaAtual && Utils.naoNulo(pAtual.getDataOcorrencia()) ? new NegocioException(new MensagemDeRecurso(Mensagens.MSG0185, new SimpleDateFormat(FORMATO_DATA).format(pAtual.getDataOcorrencia()))) : (Utils.naoNulo(pAnterior.getDataOcorrencia()) ? new NegocioException(new MensagemDeRecurso(Mensagens.MSG0185, new SimpleDateFormat(FORMATO_DATA).format(pAnterior.getDataOcorrencia()))) : new NegocioException(new MensagemDeRecurso(Mensagens.MSG0148, new Object[0])));
            throw ne;
        }
    }

    private static boolean hasEntradaNoPeriodoNoturno(Jornada jornada) {
        BigDecimal inicioHorarioNoturno = Utils.converterHoraMinutoEmMilis(jornada.getApuracaoCartaoDePonto().obterInicioAtividadeHorarioNoturno());
        BigDecimal fimHorarioNoturno = Utils.converterHoraMinutoEmMilis(jornada.getApuracaoCartaoDePonto().obterFimAtividadeHorarioNoturno());
        BigDecimal horaEntrada = null;
        if (jornada.getHrEntrada1() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada1());
        } else if (jornada.getHrEntrada2() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada2());
        } else if (jornada.getHrEntrada3() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada3());
        } else if (jornada.getHrEntrada4() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada4());
        } else if (jornada.getHrEntrada5() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada5());
        } else if (jornada.getHrEntrada6() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada6());
        }
        return horaEntrada != null && (horaEntrada.compareTo(inicioHorarioNoturno) >= 0 || horaEntrada.compareTo(fimHorarioNoturno) < 0);
    }

    public static boolean hasEntradaNoPeriodoNoturnoDaMadrugada(Jornada jornada) {
        BigDecimal horaEntrada;
        BigDecimal fimHorarioNoturno = Utils.converterHoraMinutoEmMilis(jornada.getApuracaoCartaoDePonto().obterFimAtividadeHorarioNoturno());
        boolean ehPeriodoNoturnoMadrugada = false;
        if (jornada.getHrEntrada1() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada1());
            boolean bl = ehPeriodoNoturnoMadrugada = horaEntrada.compareTo(fimHorarioNoturno) < 0;
        }
        if (!ehPeriodoNoturnoMadrugada && jornada.getHrEntrada2() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada2());
            boolean bl = ehPeriodoNoturnoMadrugada = horaEntrada.compareTo(fimHorarioNoturno) < 0;
        }
        if (!ehPeriodoNoturnoMadrugada && jornada.getHrEntrada3() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada3());
            boolean bl = ehPeriodoNoturnoMadrugada = horaEntrada.compareTo(fimHorarioNoturno) < 0;
        }
        if (!ehPeriodoNoturnoMadrugada && jornada.getHrEntrada4() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada4());
            boolean bl = ehPeriodoNoturnoMadrugada = horaEntrada.compareTo(fimHorarioNoturno) < 0;
        }
        if (!ehPeriodoNoturnoMadrugada && jornada.getHrEntrada5() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada5());
            boolean bl = ehPeriodoNoturnoMadrugada = horaEntrada.compareTo(fimHorarioNoturno) < 0;
        }
        if (!ehPeriodoNoturnoMadrugada && jornada.getHrEntrada6() != null) {
            horaEntrada = Utils.converterHoraMinutoEmMilis(jornada.getHrEntrada6());
            ehPeriodoNoturnoMadrugada = horaEntrada.compareTo(fimHorarioNoturno) < 0;
        }
        return ehPeriodoNoturnoMadrugada;
    }

    public static Jornada montarHorariosParaValidacoes(Jornada from, Jornada to) {
        int controle = 0;
        controle = CartaoDePontoUtils.checarPrimeiroTurnoParaMontagem(controle, from, to);
        controle = CartaoDePontoUtils.checarSegundoTurnoParaMontagem(controle, from, to);
        controle = CartaoDePontoUtils.checarTerceiroTurnoParaMontagem(controle, from, to);
        controle = CartaoDePontoUtils.checarQuartoTurnoParaMontagem(controle, from, to);
        controle = CartaoDePontoUtils.checarQuintoTurnoParaMontagem(controle, from, to);
        controle = CartaoDePontoUtils.checarSextoTurnoParaMontagem(controle, from, to);
        return to;
    }

    private static int checarPrimeiroTurnoParaMontagem(int controle, Jornada from, Jornada to) {
        if (Utils.naoVazio(from.getHrEntrada1()) && !from.getHrSaida1().equals(from.getHrEntrada1())) {
            to.setHrEntrada1(from.getHrEntrada1());
            to.setHrSaida1(from.getHrSaida1());
            return controle + 1;
        }
        if (Utils.naoVazio(from.getHrEntrada1()) && !Utils.nulos(from.getHrEntrada2(), from.getHrEntrada3(), from.getHrEntrada4(), from.getHrEntrada5(), from.getHrEntrada6())) {
            NegocioException ne = Utils.naoNulo(from.getDataOcorrencia()) ? new NegocioException(new MensagemDeRecurso(Mensagens.MSG0184, new SimpleDateFormat(FORMATO_DATA).format(from.getDataOcorrencia()))) : new NegocioException(new MensagemDeRecurso(Mensagens.MSG0147, new Object[0]));
            throw ne;
        }
        return controle;
    }

    private static int checarSegundoTurnoParaMontagem(int controle, Jornada from, Jornada to) {
        if (Utils.naoVazio(from.getHrEntrada2()) && !from.getHrSaida2().equals(from.getHrEntrada2())) {
            if (controle == 0) {
                to.setHrEntrada1(from.getHrEntrada2());
                to.setHrSaida1(from.getHrSaida2());
            } else {
                to.setHrEntrada2(from.getHrEntrada2());
                to.setHrSaida2(from.getHrSaida2());
            }
            return controle + 1;
        }
        if (Utils.naoVazio(from.getHrEntrada2())) {
            NegocioException ne = Utils.naoNulo(from.getDataOcorrencia()) ? new NegocioException(new MensagemDeRecurso(Mensagens.MSG0184, new SimpleDateFormat(FORMATO_DATA).format(from.getDataOcorrencia()))) : new NegocioException(new MensagemDeRecurso(Mensagens.MSG0147, new Object[0]));
            throw ne;
        }
        return controle;
    }

    private static int checarTerceiroTurnoParaMontagem(int controle, Jornada from, Jornada to) {
        if (Utils.naoVazio(from.getHrEntrada3()) && !from.getHrSaida3().equals(from.getHrEntrada3())) {
            if (controle == 0) {
                to.setHrEntrada1(from.getHrEntrada3());
                to.setHrSaida1(from.getHrSaida3());
            } else if (controle == 1) {
                to.setHrEntrada2(from.getHrEntrada3());
                to.setHrSaida2(from.getHrSaida3());
            } else {
                to.setHrEntrada3(from.getHrEntrada3());
                to.setHrSaida3(from.getHrSaida3());
            }
            return controle + 1;
        }
        if (Utils.naoVazio(from.getHrEntrada3())) {
            NegocioException ne = Utils.naoNulo(from.getDataOcorrencia()) ? new NegocioException(new MensagemDeRecurso(Mensagens.MSG0184, new SimpleDateFormat(FORMATO_DATA).format(from.getDataOcorrencia()))) : new NegocioException(new MensagemDeRecurso(Mensagens.MSG0147, new Object[0]));
            throw ne;
        }
        return controle;
    }

    private static int checarQuartoTurnoParaMontagem(int controle, Jornada from, Jornada to) {
        if (Utils.naoVazio(from.getHrEntrada4()) && !from.getHrSaida4().equals(from.getHrEntrada4())) {
            if (controle == 0) {
                to.setHrEntrada1(from.getHrEntrada4());
                to.setHrSaida1(from.getHrSaida4());
            } else if (controle == 1) {
                to.setHrEntrada2(from.getHrEntrada4());
                to.setHrSaida2(from.getHrSaida4());
            } else if (controle == 2) {
                to.setHrEntrada3(from.getHrEntrada4());
                to.setHrSaida3(from.getHrSaida4());
            } else {
                to.setHrEntrada4(from.getHrEntrada4());
                to.setHrSaida4(from.getHrSaida4());
            }
            return controle + 1;
        }
        if (Utils.naoVazio(from.getHrEntrada4())) {
            NegocioException ne = Utils.naoNulo(from.getDataOcorrencia()) ? new NegocioException(new MensagemDeRecurso(Mensagens.MSG0184, new SimpleDateFormat(FORMATO_DATA).format(from.getDataOcorrencia()))) : new NegocioException(new MensagemDeRecurso(Mensagens.MSG0147, new Object[0]));
            throw ne;
        }
        return controle;
    }

    private static int checarQuintoTurnoParaMontagem(int controle, Jornada from, Jornada to) {
        if (Utils.naoVazio(from.getHrEntrada5()) && !from.getHrSaida5().equals(from.getHrEntrada5())) {
            if (controle == 0) {
                to.setHrEntrada1(from.getHrEntrada5());
                to.setHrSaida1(from.getHrSaida5());
            } else if (controle == 1) {
                to.setHrEntrada2(from.getHrEntrada5());
                to.setHrSaida2(from.getHrSaida5());
            } else if (controle == 2) {
                to.setHrEntrada3(from.getHrEntrada5());
                to.setHrSaida3(from.getHrSaida5());
            } else if (controle == 3) {
                to.setHrEntrada4(from.getHrEntrada5());
                to.setHrSaida4(from.getHrSaida5());
            } else {
                to.setHrEntrada5(from.getHrEntrada5());
                to.setHrSaida5(from.getHrSaida5());
            }
            return controle + 1;
        }
        if (Utils.naoVazio(from.getHrEntrada5())) {
            NegocioException ne = Utils.naoNulo(from.getDataOcorrencia()) ? new NegocioException(new MensagemDeRecurso(Mensagens.MSG0184, new SimpleDateFormat(FORMATO_DATA).format(from.getDataOcorrencia()))) : new NegocioException(new MensagemDeRecurso(Mensagens.MSG0147, new Object[0]));
            throw ne;
        }
        return controle;
    }

    private static int checarSextoTurnoParaMontagem(int controle, Jornada from, Jornada to) {
        if (Utils.naoVazio(from.getHrEntrada6()) && !from.getHrSaida6().equals(from.getHrEntrada6())) {
            if (controle == 0) {
                to.setHrEntrada1(from.getHrEntrada6());
                to.setHrSaida1(from.getHrSaida6());
            } else if (controle == 1) {
                to.setHrEntrada2(from.getHrEntrada6());
                to.setHrSaida2(from.getHrSaida6());
            } else if (controle == 2) {
                to.setHrEntrada3(from.getHrEntrada6());
                to.setHrSaida3(from.getHrSaida6());
            } else if (controle == 3) {
                to.setHrEntrada4(from.getHrEntrada6());
                to.setHrSaida4(from.getHrSaida6());
            } else if (controle == 4) {
                to.setHrEntrada5(from.getHrEntrada6());
                to.setHrSaida5(from.getHrSaida6());
            } else {
                to.setHrEntrada6(from.getHrEntrada6());
                to.setHrSaida6(from.getHrSaida6());
            }
            return controle + 1;
        }
        if (Utils.naoVazio(from.getHrEntrada6())) {
            NegocioException ne = Utils.naoNulo(from.getDataOcorrencia()) ? new NegocioException(new MensagemDeRecurso(Mensagens.MSG0184, new SimpleDateFormat(FORMATO_DATA).format(from.getDataOcorrencia()))) : new NegocioException(new MensagemDeRecurso(Mensagens.MSG0147, new Object[0]));
            throw ne;
        }
        return controle;
    }

    public static boolean isJornadaDeMaisDeDoisDias(Jornada p) {
        BigDecimal[] turnos = CartaoDePontoUtils.montarTurnos(p);
        BigDecimal ultimaSaida = null;
        for (int i = 11; i > 0; i -= 2) {
            if (!Utils.nulo(ultimaSaida) || !Utils.naoNulo(turnos[i])) continue;
            ultimaSaida = turnos[i];
            break;
        }
        return ultimaSaida == null ? Boolean.FALSE : ultimaSaida.compareTo(QUARENTA_SETE_HORAS_CINQUENTA_NOVE_MINUTOS_MILLIS) > 0;
    }

    public static Date[] obterDatasLimitesDasOcorrencias(Calculo calculo, Collection<CartaoDePonto> cartoesDePonto) {
        int duasDatas = 2;
        Date[] datas = new Date[2];
        Set<ApuracaoCartaoDePonto> apuracoesCartaoDePonto = calculo.getApuracoesCartaoDePonto();
        if (!apuracoesCartaoDePonto.isEmpty()) {
            for (ApuracaoCartaoDePonto acp : apuracoesCartaoDePonto) {
                Date date = datas[0] == null ? acp.getDataInicial() : (datas[0] = acp.getDataInicial().before(datas[0]) ? acp.getDataInicial() : datas[0]);
                datas[1] = datas[1] == null ? acp.getDataFinal() : (acp.getDataFinal().after(datas[1]) ? acp.getDataFinal() : datas[1]);
            }
            return datas;
        }
        Date menorData = null;
        Date maiorData = null;
        for (CartaoDePonto cdp : cartoesDePonto) {
            if (cdp.getOcorrencias().isEmpty()) {
                return new Date[2];
            }
            Collections.sort(cdp.getOcorrencias());
            if (!Utils.naoNulo(menorData) && !Utils.naoNulo(maiorData)) {
                menorData = cdp.getOcorrencias().get(0).getDataOcorrencia();
                maiorData = cdp.getOcorrencias().get(cdp.getOcorrencias().size() - 1).getDataOcorrencia();
                continue;
            }
            if (HelperDate.dateBeforeOrEquals(cdp.getOcorrencias().get(0).getDataOcorrencia(), menorData)) {
                menorData = cdp.getOcorrencias().get(0).getDataOcorrencia();
            }
            if (!HelperDate.dateAfter(cdp.getOcorrencias().get(cdp.getOcorrencias().size() - 1).getDataOcorrencia(), maiorData)) continue;
            maiorData = cdp.getOcorrencias().get(cdp.getOcorrencias().size() - 1).getDataOcorrencia();
        }
        return new Date[]{menorData, maiorData};
    }
}

