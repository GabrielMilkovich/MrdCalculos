/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.JRException
 *  net.sf.jasperreports.engine.JasperCompileManager
 *  net.sf.jasperreports.engine.JasperReport
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 *  net.sf.jasperreports.engine.design.JasperDesign
 *  org.jboss.seam.annotations.Logger
 *  org.jboss.seam.log.Log
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.constantes.CartoesDePontoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.FormaDeApuracaoCartaoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto.CartaoDePontoDiarioReportDesign;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto.LinhaCompetenciaValorOcorrenciaCartaoDiarioVO;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoDiariaCartao;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.design.JasperDesign;
import org.jboss.seam.annotations.Logger;
import org.jboss.seam.log.Log;

public class CartaoDePontoDiarioJRAdapter
extends JRAdapter {
    @Logger
    private Log log;
    private static final Integer INDICE_INICIO_VALORES_APURADOS = 3;
    private static final Integer INDICE_FREQUENCIA_DIARIA = 2;
    private static final Integer QUANTIDADE_GRUPOS_LINHAS = 3;
    private static final Integer MULTIPLICADOR_TERCEIRO_GRUPO = 2;
    private boolean incluirHorasNoturnas = false;
    private boolean incluirHorasExtrasDiarias = false;
    private boolean incluirHorasExtrasNoturna = false;
    private boolean incluirHorasExtrasDomingos = false;
    private boolean incluirHorasExtrasFeriados = false;
    private boolean incluirHorasExtrasDomingosFeriados = false;
    private boolean incluirHorasExtrasSemanal = false;
    private boolean incluirHorasExtrasMensal = false;
    private boolean incluirPrimeirasHorasExtrasSeparado = false;
    private boolean incluirSumula85 = false;
    private boolean incluirIntrajornadas = false;
    private boolean incluirExcessoIntrajornadas = false;
    private boolean incluirInterjornadas = false;
    private boolean incluirColunaArtigo384 = false;
    private boolean incluirColunaArtigo253 = false;
    private boolean incluirColunaArtigo72 = false;
    private Set<ApuracaoDiariaCartao> apuracoesDiarias;
    private Calculo calculo;
    private List<String> nomesColunas = new ArrayList<String>();

    public CartaoDePontoDiarioJRAdapter() {
    }

    public CartaoDePontoDiarioJRAdapter(Set<ApuracaoDiariaCartao> cartoes, Calculo calculo) {
        this.apuracoesDiarias = cartoes;
        this.calculo = calculo;
    }

    public JasperReport getHSJasperReport() {
        CartaoDePontoDiarioReportDesign reportDesign = new CartaoDePontoDiarioReportDesign();
        JasperDesign design = null;
        JasperReport jr = null;
        try {
            List<String> titulosHeader = this.montarTitulosHeader();
            int maiorQtdJornada = this.calcularMaiorQtdJornada();
            design = reportDesign.getDesign(titulosHeader, maiorQtdJornada);
            jr = JasperCompileManager.compileReport((JasperDesign)design);
        }
        catch (JRException e) {
            this.log.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
        }
        return jr;
    }

    private int calcularMaiorQtdJornada() {
        int maiorJornada = 1;
        for (ApuracaoDiariaCartao diaria : this.apuracoesDiarias) {
            int qtdJornadas = diaria.getFrequenciaDiaria().split("\n").length;
            if (qtdJornadas <= maiorJornada) continue;
            maiorJornada = qtdJornadas;
        }
        return maiorJornada;
    }

    public JRBeanCollectionDataSource getLinhas() {
        List<LinhaCompetenciaValorOcorrenciaCartaoDiarioVO> linhas = this.montarLinhas(this.apuracoesDiarias);
        return new JRBeanCollectionDataSource(linhas);
    }

    private void checarItensAIncluir() {
        for (ApuracaoCartaoDePonto acp : this.calculo.getApuracoesCartaoDePonto()) {
            if (!this.incluirHorasNoturnas && acp.getApurarHorasNoturnas().booleanValue()) {
                this.incluirHorasNoturnas = true;
            }
            if (!this.incluirHorasExtrasDiarias && (FormaDeApuracaoCartaoEnum.APURA_PRIMEIRAS_HORAS_EXTRAS_SEPARADO.equals((Object)acp.getFormaDeApuracaoCartao()) || FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_PELO_CRITERIO_MAIS_FAVORAVEL.equals((Object)acp.getFormaDeApuracaoCartao()) || FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_DIARIA.equals((Object)acp.getFormaDeApuracaoCartao()))) {
                this.incluirHorasExtrasDiarias = true;
            }
            if (!this.incluirHorasExtrasNoturna && acp.getApurarHorasExtrasNoturnas().booleanValue()) {
                this.incluirHorasExtrasNoturna = true;
            }
            if (!this.incluirHorasExtrasDomingos && (acp.getExtraDescansoSeparado().booleanValue() || acp.getExtraSabadoDomingoSeparado().booleanValue())) {
                this.incluirHorasExtrasDomingos = true;
            }
            if (!this.incluirHorasExtrasFeriados && acp.getExtraFeriadoSeparado().booleanValue()) {
                this.incluirHorasExtrasFeriados = true;
            }
            if (!this.incluirHorasExtrasDomingosFeriados && (acp.getExtraDescansoSeparado().booleanValue() || acp.getExtraSabadoDomingoSeparado().booleanValue()) && acp.getExtraFeriadoSeparado().booleanValue()) {
                this.incluirHorasExtrasDomingosFeriados = true;
            }
            if (!this.incluirHorasExtrasSemanal && (FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_SEMANAL.equals((Object)acp.getFormaDeApuracaoCartao()) || FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_CONFORME_SUMULA_85.equals((Object)acp.getFormaDeApuracaoCartao()) || FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_PELO_CRITERIO_MAIS_FAVORAVEL.equals((Object)acp.getFormaDeApuracaoCartao()))) {
                this.incluirHorasExtrasSemanal = true;
            }
            if (!this.incluirHorasExtrasMensal && FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_MENSAL.equals((Object)acp.getFormaDeApuracaoCartao())) {
                this.incluirHorasExtrasMensal = true;
            }
            if (!this.incluirPrimeirasHorasExtrasSeparado && FormaDeApuracaoCartaoEnum.APURA_PRIMEIRAS_HORAS_EXTRAS_SEPARADO.equals((Object)acp.getFormaDeApuracaoCartao())) {
                this.incluirPrimeirasHorasExtrasSeparado = true;
            }
            if (!this.incluirSumula85 && FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_CONFORME_SUMULA_85.equals((Object)acp.getFormaDeApuracaoCartao())) {
                this.incluirSumula85 = true;
            }
            if (!this.incluirIntrajornadas && (acp.getIntervaloIntraJornadaSupQuatroSeis().booleanValue() || acp.getIntervalorIntraJornadaSupSeis().booleanValue())) {
                this.incluirIntrajornadas = true;
                if (!this.incluirExcessoIntrajornadas && acp.getApurarExcessoIntervaloIntra().booleanValue()) {
                    this.incluirExcessoIntrajornadas = true;
                }
            }
            if (!this.incluirInterjornadas && acp.getDescansoEntreJornadas().booleanValue()) {
                this.incluirInterjornadas = true;
            }
            if (!this.incluirColunaArtigo384 && acp.getApurarSupressaoIntervalo384().booleanValue()) {
                this.incluirColunaArtigo384 = true;
            }
            if (!this.incluirColunaArtigo253 && acp.getApurarSupressaoIntervaloArt253().booleanValue()) {
                this.incluirColunaArtigo253 = true;
            }
            if (this.incluirColunaArtigo72 || !acp.getApurarSupressaoIntervalo72().booleanValue()) continue;
            this.incluirColunaArtigo72 = true;
        }
    }

    private List<String> montarTitulosHeader() {
        this.checarItensAIncluir();
        this.nomesColunas.add("Data");
        this.nomesColunas.add("Dia");
        this.nomesColunas.add("Frequ\u00eancia");
        this.nomesColunas.add(CartoesDePontoEnum.HORAS_TRABALHADAS.getNome());
        if (this.incluirHorasNoturnas) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_DIURNAS.getNome());
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_NOTURNAS.getNome());
        }
        if (this.incluirHorasExtrasDiarias) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_EXTRAS_DIARIAS.getNome());
        }
        if (this.incluirHorasExtrasNoturna) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_EXTRAS_NOTURNAS.getNome());
        }
        if (this.incluirHorasExtrasSemanal) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_EXTRAS_SEMANAIS.getNome());
        }
        if (this.incluirSumula85) {
            this.nomesColunas.add(CartoesDePontoEnum.ADICIONAL_SUMULA_85.getNome());
        }
        if (this.incluirPrimeirasHorasExtrasSeparado) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_EXTRAS_PRIMEIRAS_EM_SEPARADO.getNome());
        }
        if (this.incluirHorasExtrasMensal) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_EXTRAS_MENSAIS.getNome());
        }
        if (this.incluirHorasExtrasDomingos) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_EXTRAS_REPOUSOS.getNome());
            if (this.incluirHorasExtrasNoturna) {
                this.nomesColunas.add(CartoesDePontoEnum.HORAS_EXTRAS_NOTURNAS_REPOUSOS.getNome());
            }
        }
        if (this.incluirHorasExtrasFeriados) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_EXTRAS_FERIADOS.getNome());
            if (this.incluirHorasExtrasNoturna) {
                this.nomesColunas.add(CartoesDePontoEnum.HORAS_EXTRAS_NOTURNAS_FERIADOS.getNome());
            }
        }
        if (this.incluirIntrajornadas) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_INTRAJORNADAS.getNome());
        }
        if (this.incluirExcessoIntrajornadas) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_EXCESSO_INTRAJORNADA.getNome());
        }
        if (this.incluirInterjornadas) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_INTERJORNADAS.getNome());
        }
        if (this.incluirColunaArtigo253) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_ARTIGO_253.getNome());
        }
        if (this.incluirColunaArtigo72) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_ARTIGO_72.getNome());
        }
        if (this.incluirColunaArtigo384) {
            this.nomesColunas.add(CartoesDePontoEnum.HORAS_ARTIGO_384.getNome());
        }
        return this.nomesColunas;
    }

    private List<LinhaCompetenciaValorOcorrenciaCartaoDiarioVO> montarLinhas(Set<ApuracaoDiariaCartao> apuracoesDiarias) {
        Integer n;
        Boolean considerarFeriado;
        Date[] datasLimites = this.obterDatasLimitesDasOcorrencias(apuracoesDiarias);
        Map<Date, Boolean> mapaConsiderarFeriado = this.montarMapaDeConsideracaoDeFeriado(apuracoesDiarias);
        Object[] valoresLinha = null;
        Object[] valoresLinhaDia = null;
        ArrayList<Object[]> listaLinhas = new ArrayList<Object[]>();
        HelperDate dataHelper = HelperDate.getInstance();
        HelperDate dataAuxiliar = HelperDate.getInstance(datasLimites[0]);
        HelperDate dataAuxiliarFinal = HelperDate.getInstance(datasLimites[1]);
        while (!dataAuxiliar.greaterThen(dataAuxiliarFinal.getDate())) {
            considerarFeriado = this.isConsiderarFeriado(mapaConsiderarFeriado, dataAuxiliar);
            if (considerarFeriado != null) {
                valoresLinha = new Object[this.nomesColunas.size()];
                valoresLinha[0] = dataHelper.setDate(dataAuxiliar).format("dd/MM/yyyy");
                listaLinhas.add(valoresLinha);
            }
            dataAuxiliar.addDay(1);
        }
        dataAuxiliar = HelperDate.getInstance(datasLimites[0]);
        while (!dataAuxiliar.greaterThen(dataAuxiliarFinal.getDate())) {
            considerarFeriado = this.isConsiderarFeriado(mapaConsiderarFeriado, dataAuxiliar);
            if (considerarFeriado != null) {
                valoresLinhaDia = new Object[this.nomesColunas.size()];
                valoresLinhaDia[1] = dataHelper.setDate(dataAuxiliar).getTipoDeDia(considerarFeriado);
                listaLinhas.add(valoresLinhaDia);
            }
            dataAuxiliar.addDay(1);
        }
        HelperDate dataComparacao = HelperDate.getInstance();
        Integer indice = INDICE_INICIO_VALORES_APURADOS;
        String diaMesAno = null;
        TreeMap<Integer, CartoesDePontoEnum> mapaDataApuracaoDiaria = new TreeMap<Integer, CartoesDePontoEnum>();
        for (String nomeColuna : this.nomesColunas) {
            if ("Data".equals(nomeColuna) || "Dia".equals(nomeColuna) || "Frequ\u00eancia".equals(nomeColuna)) continue;
            mapaDataApuracaoDiaria.put(indice, CartoesDePontoEnum.getFromString(nomeColuna));
            n = indice;
            Integer n2 = indice = Integer.valueOf(indice + 1);
        }
        ArrayList<Object[]> listaLinhasAux = new ArrayList<Object[]>();
        indice = INDICE_FREQUENCIA_DIARIA;
        while (indice < this.nomesColunas.size()) {
            Object[] valores;
            Object object = listaLinhas.iterator();
            while (object.hasNext() && (diaMesAno = (String)(valores = (Object[])object.next())[0]) != null) {
                dataComparacao.setDay(Integer.parseInt(diaMesAno.substring(0, 2)));
                dataComparacao.setMonth(Integer.parseInt(diaMesAno.substring(3, 5)) - 1);
                dataComparacao.setYear(Integer.parseInt(diaMesAno.substring(6, 10)));
                this.atualizarValores(valores, indice, dataComparacao, listaLinhasAux, mapaDataApuracaoDiaria);
            }
            object = indice;
            n = indice = Integer.valueOf(indice + 1);
        }
        listaLinhas.addAll(listaLinhasAux);
        return this.finalizarLinhas(listaLinhas);
    }

    private Boolean isConsiderarFeriado(Map<Date, Boolean> mapaConsiderarFeriado, HelperDate dataAuxiliar) {
        return mapaConsiderarFeriado.get(dataAuxiliar.getDate());
    }

    private void atualizarValores(Object[] valores, Integer indice, HelperDate dataComparacao, List<Object[]> listaLinhasAux, Map<Integer, CartoesDePontoEnum> mapaDataApuracaoDiaria) {
        Object[] valoresLinhaFreq = null;
        for (ApuracaoDiariaCartao apuracaoD : this.apuracoesDiarias) {
            if (!HelperDate.dateEquals(dataComparacao.getDate(), apuracaoD.getDataOcorrencia())) continue;
            CartoesDePontoEnum cartaoEnumValor = mapaDataApuracaoDiaria.get(indice);
            if (indice.equals(INDICE_FREQUENCIA_DIARIA)) {
                valoresLinhaFreq = new Object[this.nomesColunas.size()];
                valoresLinhaFreq[CartaoDePontoDiarioJRAdapter.INDICE_FREQUENCIA_DIARIA.intValue()] = apuracaoD.getFrequenciaDiaria();
                listaLinhasAux.add(valoresLinhaFreq);
                break;
            }
            valores[indice.intValue()] = this.obterValoresApurados(apuracaoD, cartaoEnumValor);
            break;
        }
    }

    private Object obterValoresApurados(ApuracaoDiariaCartao apuracaoDiaria, CartoesDePontoEnum cartaoEnumValor) {
        Object valor = null;
        switch (cartaoEnumValor) {
            case HORAS_TRABALHADAS: {
                valor = apuracaoDiaria.getHorasTrabalhadas();
                break;
            }
            case HORAS_DIURNAS: {
                valor = Utils.subtrair(Utils.subtrair(apuracaoDiaria.getHorasTrabalhadas(), apuracaoDiaria.getHorasNoturnas()), apuracaoDiaria.getHorasProrrogNoturnas());
                break;
            }
            case HORAS_NOTURNAS: {
                valor = Utils.somar(apuracaoDiaria.getHorasNoturnas(), apuracaoDiaria.getHorasProrrogNoturnas());
                break;
            }
            case HORAS_EXTRAS_DIARIAS: {
                valor = apuracaoDiaria.getHorasExtrasDiaria();
                break;
            }
            case HORAS_EXTRAS_NOTURNAS: {
                valor = apuracaoDiaria.getHorasExtrasNoturna();
                break;
            }
            case HORAS_EXTRAS_REPOUSOS_FERIADOS: {
                valor = apuracaoDiaria.getHorasDomingoFeriado();
                break;
            }
            case HORAS_EXTRAS_SEMANAIS: {
                valor = apuracaoDiaria.getHorasExtrasSemanal();
                break;
            }
            case HORAS_EXTRAS_MENSAIS: {
                valor = apuracaoDiaria.getHorasExtrasMensal();
                break;
            }
            case HORAS_EXTRAS_PRIMEIRAS_EM_SEPARADO: {
                valor = apuracaoDiaria.getHorasPrimExtSeparado();
                break;
            }
            case ADICIONAL_SUMULA_85: {
                valor = apuracaoDiaria.getHorasAdicionalSumula85();
                break;
            }
            case HORAS_INTRAJORNADAS: {
                valor = apuracaoDiaria.getHorasIntraJornada();
                break;
            }
            case HORAS_EXCESSO_INTRAJORNADA: {
                valor = apuracaoDiaria.getHorasExcessoIntraJornada();
                break;
            }
            case HORAS_INTERJORNADAS: {
                valor = apuracaoDiaria.getHorasInterJornadas();
                break;
            }
            case HORAS_ARTIGO_384: {
                valor = apuracaoDiaria.getHorasArt384();
                break;
            }
            case HORAS_ARTIGO_253: {
                valor = apuracaoDiaria.getHorasArt253();
                break;
            }
            case HORAS_ARTIGO_72: {
                valor = apuracaoDiaria.getHorasArt72();
                break;
            }
            case HORAS_EXTRAS_REPOUSOS: {
                valor = apuracaoDiaria.getHorasDomingo();
                break;
            }
            case HORAS_EXTRAS_NOTURNAS_REPOUSOS: {
                valor = apuracaoDiaria.getHorasNoturnasDomingo();
                break;
            }
            case HORAS_EXTRAS_FERIADOS: {
                valor = apuracaoDiaria.getHorasFeriado();
                break;
            }
            case HORAS_EXTRAS_NOTURNAS_FERIADOS: {
                valor = apuracaoDiaria.getHorasNoturnasFeriado();
                break;
            }
            default: {
                valor = "0.00";
            }
        }
        return valor;
    }

    private List<LinhaCompetenciaValorOcorrenciaCartaoDiarioVO> finalizarLinhas(List<Object[]> listaLinhas) {
        ArrayList<LinhaCompetenciaValorOcorrenciaCartaoDiarioVO> linhas = new ArrayList<LinhaCompetenciaValorOcorrenciaCartaoDiarioVO>();
        LinhaCompetenciaValorOcorrenciaCartaoDiarioVO linha = null;
        Field competencia = null;
        Field dia = null;
        Field frequencia = null;
        Field valor = null;
        Class<?> c = null;
        for (int i = 0; i < listaLinhas.size() / QUANTIDADE_GRUPOS_LINHAS; ++i) {
            linha = new LinhaCompetenciaValorOcorrenciaCartaoDiarioVO();
            c = linha.getClass();
            try {
                competencia = c.getDeclaredField("competencia");
                competencia.setAccessible(true);
                competencia.set(linha, listaLinhas.get(i)[0]);
                dia = c.getDeclaredField("dia");
                dia.setAccessible(true);
                dia.set(linha, listaLinhas.get(listaLinhas.size() / QUANTIDADE_GRUPOS_LINHAS + i)[1]);
                frequencia = c.getDeclaredField("frequencia");
                frequencia.setAccessible(true);
                frequencia.set(linha, listaLinhas.get(listaLinhas.size() * MULTIPLICADOR_TERCEIRO_GRUPO / QUANTIDADE_GRUPOS_LINHAS + i)[INDICE_FREQUENCIA_DIARIA]);
                for (int j = INDICE_INICIO_VALORES_APURADOS.intValue(); j <= listaLinhas.get(i).length - 1; ++j) {
                    valor = c.getDeclaredField("valor" + j);
                    valor.setAccessible(true);
                    valor.set(linha, listaLinhas.get(i)[j]);
                }
                linhas.add(linha);
                continue;
            }
            catch (IllegalAccessException | IllegalArgumentException | NoSuchFieldException | SecurityException e) {
                this.log.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            }
        }
        return linhas;
    }

    private Map<Date, Boolean> montarMapaDeConsideracaoDeFeriado(Set<ApuracaoDiariaCartao> apuracoesDiarias) {
        HashMap<Date, Boolean> mapa = new HashMap<Date, Boolean>();
        for (ApuracaoDiariaCartao adc : apuracoesDiarias) {
            mapa.put(adc.getDataOcorrencia(), adc.getFeriadoConsiderado());
        }
        return mapa;
    }

    private Date[] obterDatasLimitesDasOcorrencias(Set<ApuracaoDiariaCartao> apuracoesSet) {
        Date menorData = null;
        Date maiorData = null;
        ArrayList<ApuracaoDiariaCartao> apuracoes = new ArrayList<ApuracaoDiariaCartao>(apuracoesSet);
        Collections.sort(apuracoes);
        if (!Utils.naoNulo(menorData) && !Utils.naoNulo(maiorData)) {
            menorData = ((ApuracaoDiariaCartao)apuracoes.get(0)).getDataOcorrencia();
            maiorData = ((ApuracaoDiariaCartao)apuracoes.get(apuracoes.size() - 1)).getDataOcorrencia();
        } else {
            if (HelperDate.dateBeforeOrEquals(((ApuracaoDiariaCartao)apuracoes.get(0)).getDataOcorrencia(), menorData)) {
                menorData = ((ApuracaoDiariaCartao)apuracoes.get(0)).getDataOcorrencia();
            }
            if (HelperDate.dateAfter(((ApuracaoDiariaCartao)apuracoes.get(apuracoes.size() - 1)).getDataOcorrencia(), maiorData)) {
                maiorData = ((ApuracaoDiariaCartao)apuracoes.get(apuracoes.size() - 1)).getDataOcorrencia();
            }
        }
        return new Date[]{menorData, maiorData};
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    public Set<ApuracaoDiariaCartao> getApuracoesDiarias() {
        return this.apuracoesDiarias;
    }

    public void setApuracoesDiarias(Set<ApuracaoDiariaCartao> apuracoesDiarias) {
        this.apuracoesDiarias = apuracoesDiarias;
    }
}

