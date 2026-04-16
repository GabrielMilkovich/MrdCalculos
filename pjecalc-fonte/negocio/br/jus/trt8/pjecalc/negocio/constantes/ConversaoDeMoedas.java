/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

public class ConversaoDeMoedas {
    private static final int ANO_1967 = 1967;
    private static final int ANO_1986 = 1986;
    private static final int ANO_1989 = 1989;
    private static final int ANO_1993 = 1993;
    private static final int ANO_1994 = 1994;
    private static final int DIA_13 = 13;
    private static final int DIA_16 = 16;
    private static final int FATOR_1000 = 1000;
    private static final int FATOR_2750 = 2750;
    public static final Map<Date, BigDecimal> COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS;
    public static final Map<Date, BigDecimal> COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS;

    public static Date obterDataUltimaConversaoDeMoeda() {
        return HelperDate.getInstance(1994, 6, 1).getDate();
    }

    public static BigDecimal encontrarFatorConversaoParaMudancaDeMoedas(Date inicio, Date fim) {
        BigDecimal fator = BigDecimal.ONE;
        for (Date competenciaParaConversao : COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.keySet()) {
            if (!HelperDate.dateAfterOrEquals(fim, competenciaParaConversao) || !HelperDate.dateBeforeOrEquals(inicio, competenciaParaConversao)) continue;
            fator = Utils.dividir(fator, COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(competenciaParaConversao));
        }
        return fator;
    }

    public static Date encontrarDataDeConversaoParaMudancaDeMoedas(Date inicio, Date fim) {
        Date data = null;
        for (Date competenciaParaConversao : COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.keySet()) {
            if (!HelperDate.dateAfterOrEquals(fim, competenciaParaConversao) || !HelperDate.dateBeforeOrEquals(inicio, competenciaParaConversao)) continue;
            data = competenciaParaConversao;
        }
        return data;
    }

    public static Map<Date, BigDecimal> encontrarCompetenciasDeConversaoParaMudancaDeMoedas(Date inicio, Date fim) {
        HashMap<Date, BigDecimal> conversoes = new HashMap<Date, BigDecimal>();
        for (Date competenciaParaConversao : COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.keySet()) {
            if (!HelperDate.dateAfterOrEquals(fim, competenciaParaConversao) || !HelperDate.dateBeforeOrEquals(inicio, competenciaParaConversao)) continue;
            conversoes.put(competenciaParaConversao, COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(competenciaParaConversao));
        }
        return conversoes;
    }

    static {
        HashMap<Date, BigDecimal> datasMensaisParaConversaoDeMoedas = new HashMap<Date, BigDecimal>();
        datasMensaisParaConversaoDeMoedas.put(HelperDate.getInstance(1994, 6, 1).getDate(), new BigDecimal(2750));
        datasMensaisParaConversaoDeMoedas.put(HelperDate.getInstance(1993, 7, 1).getDate(), new BigDecimal(1000));
        datasMensaisParaConversaoDeMoedas.put(HelperDate.getInstance(1989, 0, 1).getDate(), new BigDecimal(1000));
        datasMensaisParaConversaoDeMoedas.put(HelperDate.getInstance(1986, 2, 1).getDate(), new BigDecimal(1000));
        datasMensaisParaConversaoDeMoedas.put(HelperDate.getInstance(1967, 1, 1).getDate(), new BigDecimal(1000));
        COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS = Collections.unmodifiableMap(datasMensaisParaConversaoDeMoedas);
        HashMap<Date, BigDecimal> datasDiariasParaConversaoDeMoedas = new HashMap<Date, BigDecimal>();
        datasDiariasParaConversaoDeMoedas.put(HelperDate.getInstance(1994, 6, 1).getDate(), new BigDecimal(2750));
        datasDiariasParaConversaoDeMoedas.put(HelperDate.getInstance(1993, 7, 1).getDate(), new BigDecimal(1000));
        datasDiariasParaConversaoDeMoedas.put(HelperDate.getInstance(1989, 0, 16).getDate(), new BigDecimal(1000));
        datasDiariasParaConversaoDeMoedas.put(HelperDate.getInstance(1986, 2, 1).getDate(), new BigDecimal(1000));
        datasDiariasParaConversaoDeMoedas.put(HelperDate.getInstance(1967, 1, 13).getDate(), new BigDecimal(1000));
        COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS = Collections.unmodifiableMap(datasDiariasParaConversaoDeMoedas);
    }
}

