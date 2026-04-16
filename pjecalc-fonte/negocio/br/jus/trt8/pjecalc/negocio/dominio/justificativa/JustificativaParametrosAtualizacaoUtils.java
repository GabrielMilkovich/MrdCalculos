/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.justificativa;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.dfp.IndiceDevedorFazenda;
import br.jus.trt8.pjecalc.negocio.dominio.indices.igpm.IndiceIGPM;
import br.jus.trt8.pjecalc.negocio.dominio.indices.inpc.IndiceINPC;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipc.IndiceIPC;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipca.IndiceIPCA;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipcae.IndiceIPCAE;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipcatr.IndiceIPCAETR;
import br.jus.trt8.pjecalc.negocio.dominio.indices.it.IndiceIndebitoTributario;
import br.jus.trt8.pjecalc.negocio.dominio.indices.jam.IndiceJAM;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicDiaria;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicFazenda;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaDebitoTrabalhista;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTDiario;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTMensal;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tr.IndiceTR;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf.JurosSelicIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf.JurosSelicParaCorrecao;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;

public class JustificativaParametrosAtualizacaoUtils {
    private static final String DD_MM_YYYY = "dd/MM/yyyy";
    private static final int DOIS_ULTIMOS_CARACTERES = 2;
    private static final String FIM_PRIMEIRA_FAIXA_JUROS_PADRAO = "26/02/1987";
    private static final String FIM_SEGUNDA_FAIXA_JUROS_PADRAO = "03/03/1991";
    private static final String INICIO_TERCEIRA_FAIXA_JUROS_PADRAO = "03/03/1991";

    public static String prepararTextoJustificativaJuros(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        HashMap<JurosEnum, String> mapaNomeJuros = new HashMap<JurosEnum, String>();
        mapaNomeJuros.put(JurosEnum.SEM_JUROS, "sem incid\u00eancia de juros");
        mapaNomeJuros.put(JurosEnum.JUROS_UM_PORCENTO, "juros simples de 1% a.m., pro rata die,");
        mapaNomeJuros.put(JurosEnum.JUROS_MEIO_PORCENTO, "juros simples de 0,5% a.m., pro rata die,");
        mapaNomeJuros.put(JurosEnum.JUROS_POUPANCA, "juros simples aplicados \u00e0 caderneta de poupan\u00e7a");
        mapaNomeJuros.put(JurosEnum.FAZENDA_PUBLICA, "juros simples aplicados \u00e0 Fazenda P\u00fablica");
        mapaNomeJuros.put(JurosEnum.SELIC, "juros SELIC (Receita Federal)");
        mapaNomeJuros.put(JurosEnum.TRD_SIMPLES, "juros simples TRD");
        mapaNomeJuros.put(JurosEnum.TRD_COMPOSTOS, "juros compostos TRD");
        mapaNomeJuros.put(JurosEnum.SELIC_BACEN, "juros SELIC compostos");
        mapaNomeJuros.put(JurosEnum.SELIC_FAZENDA, "juros SELIC simples");
        mapaNomeJuros.put(JurosEnum.JUROS_ZERO_TRINTA_TRES, "juros simples de 0,0333333% a.d.");
        mapaNomeJuros.put(JurosEnum.TAXA_LEGAL, "juros Taxa Legal");
        HashMap<JurosEnum, String> mapaInformacoesLegais = new HashMap<JurosEnum, String>();
        mapaInformacoesLegais.put(JurosEnum.SEM_JUROS, "");
        mapaInformacoesLegais.put(JurosEnum.JUROS_UM_PORCENTO, "");
        mapaInformacoesLegais.put(JurosEnum.JUROS_MEIO_PORCENTO, "");
        mapaInformacoesLegais.put(JurosEnum.JUROS_POUPANCA, " (Art. 1\u00ba-F, Lei 9.494/1997)");
        mapaInformacoesLegais.put(JurosEnum.FAZENDA_PUBLICA, " (Art. 1\u00ba-F, Lei 9.494/1997)");
        mapaInformacoesLegais.put(JurosEnum.SELIC, "");
        mapaInformacoesLegais.put(JurosEnum.TRD_SIMPLES, "");
        mapaInformacoesLegais.put(JurosEnum.TRD_COMPOSTOS, "");
        mapaInformacoesLegais.put(JurosEnum.SELIC_BACEN, "");
        mapaInformacoesLegais.put(JurosEnum.SELIC_FAZENDA, "");
        mapaInformacoesLegais.put(JurosEnum.JUROS_ZERO_TRINTA_TRES, "");
        mapaInformacoesLegais.put(JurosEnum.TAXA_LEGAL, " (Art. 406 do C\u00f3digo Civil)");
        StringBuilder sb = new StringBuilder();
        SimpleDateFormat sdf = new SimpleDateFormat(DD_MM_YYYY);
        JurosEnum juros = parametrosDeAtualizacao.getJuros();
        Date dataAux = parametrosDeAtualizacao.getCalculo().getDataAjuizamento();
        if (parametrosDeAtualizacao.getAplicarJurosFasePreJudicial().booleanValue()) {
            sb.append("Juros apurados desde o vencimento das verbas vencidas, em fase pr\u00e9-judicial, conforme decis\u00e3o do STF na ADC 58; ");
            dataAux = parametrosDeAtualizacao.getCalculo().getDataAdmissao();
        }
        for (CombinacaoDeJuros c : parametrosDeAtualizacao.getListaDeCombinacaoDeJuros()) {
            dataAux = c.getApartirDeOutroJuros();
            if (!juros.equals((Object)JurosEnum.JUROS_PADRAO)) {
                sb.append((String)mapaNomeJuros.get((Object)juros));
                sb.append(" at\u00e9 ");
                sb.append(sdf.format(HelperDate.getInstance(dataAux).addDay(-1).getDate()));
                sb.append((String)mapaInformacoesLegais.get((Object)juros));
            } else {
                sb.append(JustificativaParametrosAtualizacaoUtils.montarJustificativaJurosPadrao(parametrosDeAtualizacao.getCalculo().getDataAjuizamento(), HelperDate.getInstance(dataAux).addDay(-1).getDate()));
            }
            sb.append("; ");
            juros = c.getOutroJuros();
        }
        if (Utils.naoNulo((Object)juros)) {
            if (!juros.equals((Object)JurosEnum.JUROS_PADRAO)) {
                sb.append((String)mapaNomeJuros.get((Object)juros));
                sb.append(" a partir de ");
                sb.append(sdf.format(dataAux));
                sb.append((String)mapaInformacoesLegais.get((Object)juros));
            } else {
                sb.append(JustificativaParametrosAtualizacaoUtils.montarJustificativaJurosPadrao(dataAux, null));
            }
            sb.append('.');
            sb.setCharAt(0, Character.toUpperCase(sb.charAt(0)));
            int indiceUltimoPontoVirgula = sb.lastIndexOf(";");
            if (indiceUltimoPontoVirgula > -1) {
                sb.insert(sb.lastIndexOf(";") + 1, " e");
            }
        }
        return sb.toString();
    }

    private static String montarJustificativaJurosPadrao(Date dataInicio, Date dataFim) {
        if (Utils.naoNulos(dataInicio, dataFim) && dataInicio.after(dataFim)) {
            dataInicio = dataFim;
        }
        StringBuilder sb = new StringBuilder();
        SimpleDateFormat sdf = new SimpleDateFormat(DD_MM_YYYY);
        Date primeiraFaixaJurosPadrao = HelperDate.getInstance(FIM_PRIMEIRA_FAIXA_JUROS_PADRAO).getDate();
        Date segundaFaixaJurosPadrao = HelperDate.getInstance("03/03/1991").getDate();
        if (HelperDate.dateBeforeOrEquals(dataInicio, primeiraFaixaJurosPadrao)) {
            sb.append("juros simples de 0,5% a.m. at\u00e9 ");
            if (Utils.naoNulo(dataFim) && HelperDate.dateBeforeOrEquals(dataFim, primeiraFaixaJurosPadrao)) {
                sb.append(sdf.format(dataFim));
            } else {
                sb.append(FIM_PRIMEIRA_FAIXA_JUROS_PADRAO);
            }
            sb.append(" (Art. 1062 do CC); ");
        }
        if (HelperDate.dateBeforeOrEquals(dataInicio, segundaFaixaJurosPadrao) && (Utils.nulo(dataFim) || HelperDate.dateAfter(dataFim, primeiraFaixaJurosPadrao))) {
            sb.append("juros capitalizados de 1% a.m. at\u00e9 ");
            if (Utils.naoNulo(dataFim) && HelperDate.dateBeforeOrEquals(dataFim, segundaFaixaJurosPadrao)) {
                sb.append(sdf.format(dataFim));
            } else {
                sb.append("03/03/1991");
            }
            sb.append(" (DL n\u00ba 2322/1987); ");
        }
        if (Utils.nulo(dataFim)) {
            sb.append("juros simples de 1% a.m., pro rata die, a partir de ");
            if (HelperDate.dateAfter(dataInicio, segundaFaixaJurosPadrao)) {
                sb.append(sdf.format(dataInicio));
            } else {
                sb.append("03/03/1991");
            }
            sb.append(" (Art. 39 da Lei n\u00ba 8177/91); ");
        } else if (HelperDate.dateAfter(dataFim, segundaFaixaJurosPadrao)) {
            sb.append("juros simples de 1% a.m., pro rata die, at\u00e9 ");
            sb.append(sdf.format(dataFim));
            sb.append(" (Art. 39 da Lei n\u00ba 8177/91); ");
        }
        return sb.substring(0, sb.length() - 2);
    }

    public static String prepararTextoUltimoIndiceDisponivelDe(IndiceMonetarioEnum indice, Date dataLiquidacao) {
        if (Utils.nulo((Object)indice)) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        SimpleDateFormat sdf = new SimpleDateFormat("MM/yyyy");
        SimpleDateFormat sdfDiario = new SimpleDateFormat(DD_MM_YYYY);
        IndiceDeCalculo indiceCalculo = null;
        switch (indice) {
            case IGPM: {
                indiceCalculo = IndiceIGPM.obterTodos().get(0);
                break;
            }
            case INPC: {
                indiceCalculo = IndiceINPC.obterTodos().get(0);
                break;
            }
            case IPC: {
                indiceCalculo = IndiceIPC.obterTodos().get(0);
                break;
            }
            case IPCA: {
                indiceCalculo = IndiceIPCA.obterTodos().get(0);
                break;
            }
            case IPCAE: {
                indiceCalculo = IndiceIPCAE.obterTodos().get(0);
                break;
            }
            case IPCAETR: {
                indiceCalculo = IndiceIPCAETR.obterTodos().get(0);
                break;
            }
            case JAM: {
                indiceCalculo = IndiceJAM.obterTodos().get(0);
                break;
            }
            case SELIC: {
                JurosSelicIrpf juros = JurosSelicIrpf.obterTodos().get(0);
                indiceCalculo = juros == null ? null : new JurosSelicParaCorrecao(juros);
                break;
            }
            case TABELA_UNICA_JT_DIARIO: {
                indiceCalculo = IndiceTabelaUnicaJTDiario.obterTodos().get(0);
                break;
            }
            case TUACDT: {
                indiceCalculo = IndiceTabelaUnicaDebitoTrabalhista.obterTodos().get(0);
                break;
            }
            case SELIC_BACEN: {
                indiceCalculo = IndiceSelicDiaria.obterTodos().get(0);
                break;
            }
            case SELIC_FAZENDA: {
                indiceCalculo = IndiceSelicFazenda.obterTodos().get(0);
                break;
            }
            case TABELA_UNICA_JT_MENSAL: {
                indiceCalculo = IndiceTabelaUnicaJTMensal.obterTodos().get(0);
                break;
            }
            case TR: {
                indiceCalculo = IndiceTR.obterTodos().get(0);
                break;
            }
            case TABELA_DEVEDOR_FAZENDA: {
                indiceCalculo = IndiceDevedorFazenda.obterTodos().get(0);
                break;
            }
            case TABELA_INDEBITO_TRIBUTARIO: {
                indiceCalculo = IndiceIndebitoTributario.obterTodos().get(0);
                break;
            }
        }
        if (indiceCalculo == null) {
            return "";
        }
        sb.append(" \u00daltima taxa '");
        sb.append(indice.getNome());
        sb.append("' relativa a ");
        if (JustificativaParametrosAtualizacaoUtils.verificarSeIndiceDiario(indice)) {
            sb.append(HelperDate.dateBefore(indiceCalculo.getCompetencia(), dataLiquidacao) ? sdfDiario.format(indiceCalculo.getCompetencia()) : sdfDiario.format(dataLiquidacao));
        } else {
            sb.append(HelperDate.dateBefore(HelperDate.getCurrentCompetence(indiceCalculo.getCompetencia()).getDate(), HelperDate.getCurrentCompetence(dataLiquidacao).getDate()) ? sdf.format(indiceCalculo.getCompetencia()) : sdf.format(dataLiquidacao));
        }
        sb.append('.');
        return sb.toString();
    }

    private static boolean verificarSeIndiceDiario(IndiceMonetarioEnum indice) {
        boolean indiceDiario = IndiceMonetarioEnum.SELIC_BACEN.equals((Object)indice) || IndiceMonetarioEnum.TABELA_UNICA_JT_DIARIO.equals((Object)indice) || IndiceMonetarioEnum.JAM.equals((Object)indice);
        indiceDiario = indiceDiario || IndiceMonetarioEnum.TUACDT.equals((Object)indice);
        return indiceDiario;
    }
}

