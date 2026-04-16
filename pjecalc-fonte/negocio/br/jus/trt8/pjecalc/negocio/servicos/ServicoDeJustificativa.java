/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.api.Justificador;
import br.jus.trt8.pjecalc.negocio.constantes.GrupoEsferaPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.IndicePrecatorio;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ServicoAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.IndicePrecatorioEC1362025;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDrools;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Name(value="servicoDeJustificativa")
@Scope(value=ScopeType.SESSION)
@AutoCreate
public class ServicoDeJustificativa
implements Serializable,
Justificador {
    private static final long serialVersionUID = -659339673291354251L;
    @In
    private ServicoDeCalculo servicoDeCalculo;
    @In
    private ServicoDrools servicoDrools;
    private Set<String> mensagens = new LinkedHashSet<String>();
    private Map<Integer, String> mensagensOrdenadas = new HashMap<Integer, String>();

    public void justificar(boolean isAtualizacao) {
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        this.mensagens.clear();
        this.mensagensOrdenadas.clear();
        LinkedHashMap<String, Object> globais = new LinkedHashMap<String, Object>();
        globais.put("justificativa", this);
        calculo.setRelatorioAtualizacao(isAtualizacao);
        this.servicoDrools.executarStatefull(calculo, globais, "pjecalc.justificativa");
    }

    public Set<String> getCriteriosPrecatorio() {
        LinkedHashSet<String> criterios = new LinkedHashSet<String>();
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        Atualizacao atualizacao = calculo.getAtualizacao();
        Periodo periodoAtualizacao = new Periodo(HelperDate.getInstance(calculo.getDataDeLiquidacao()).addDay(1).getDate(), atualizacao.getDataDeLiquidacao());
        Periodo periodoDaGraca = ServicoAtualizacaoUtils.montarPeriodoDaGraca(atualizacao);
        Date dataInicioEC1362025 = atualizacao.getDataInicioAplicarEC1362025();
        criterios.add(this.getCriterioPeriodoDaGracaPrecatorio(periodoDaGraca));
        criterios.add(this.getCriterioCorrecaoPrecatorio(periodoAtualizacao, periodoDaGraca, dataInicioEC1362025, atualizacao.getGrupoEsferaPrecatorio()));
        criterios.add(this.getCriterioJurosPrecatorio(periodoAtualizacao, periodoDaGraca, dataInicioEC1362025));
        return criterios;
    }

    private String getCriterioPeriodoDaGracaPrecatorio(Periodo periodoDaGraca) {
        if (periodoDaGraca != null) {
            SimpleDateFormat dateFormatter = new SimpleDateFormat("dd/MM/yyyy");
            return String.format("O per\u00edodo da gra\u00e7a transcorre de %s at\u00e9 %s.", dateFormatter.format(periodoDaGraca.getInicial()), dateFormatter.format(periodoDaGraca.getFinal()));
        }
        return "N\u00e3o possui per\u00edodo da gra\u00e7a.";
    }

    public String getCriterioCorrecaoPrecatorio(Periodo periodoAtualizacao, Periodo periodoDaGraca, Date dataInicioEC1362025, GrupoEsferaPrecatorioEnum esfera) {
        SimpleDateFormat dateFormatter = new SimpleDateFormat("dd/MM/yyyy");
        List<Map<String, Periodo>> indicesAplicados = IndicePrecatorio.montarCombinacaoDeIndicesDeCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, dataInicioEC1362025, esfera);
        StringBuilder mensagem = new StringBuilder();
        mensagem.append("Valores corrigidos ");
        int currentIndex = 0;
        for (Map<String, Periodo> entry : indicesAplicados) {
            List<IndicePrecatorioEC1362025> tabela;
            boolean isLast;
            String key = entry.keySet().iterator().next();
            Periodo value = entry.values().iterator().next();
            boolean isFirst = ++currentIndex == 1;
            boolean bl = isLast = currentIndex == indicesAplicados.size();
            if (isFirst && isLast) {
                mensagem.append(String.format("pelo \u00edndice '%s' de %s at\u00e9 %s.", key, dateFormatter.format(value.getInicial()), dateFormatter.format(value.getFinal())));
            } else if (isFirst) {
                mensagem.append(String.format("pelo \u00edndice '%s' de %s at\u00e9 %s", key, dateFormatter.format(value.getInicial()), dateFormatter.format(value.getFinal())));
            } else if (isLast) {
                mensagem.append(String.format(" e pelo \u00edndice '%s' at\u00e9 %s.", key, dateFormatter.format(value.getFinal())));
            } else {
                mensagem.append(String.format(", pelo \u00edndice '%s' at\u00e9 %s", key, dateFormatter.format(value.getFinal())));
            }
            if (!isLast || !key.contains("EC 136/2025") || !Utils.naoNulo(tabela = IndicePrecatorioEC1362025.obterTabela(new Periodo(dataInicioEC1362025, value.getFinal()), false, false)) || tabela.isEmpty()) continue;
            IndicePrecatorioEC1362025 ultimoIndice = tabela.get(0);
            mensagem.append(String.format(" \u00daltima taxa relativa a %s.", HelperDate.getInstance(ultimoIndice.getCompetencia()).format("MM/yyyy")));
        }
        return mensagem.toString();
    }

    public String getCriterioJurosPrecatorio(Periodo periodoAtualizacao, Periodo periodoDaGraca, Date dataInicioEC1362025) {
        SimpleDateFormat dateFormatter = new SimpleDateFormat("dd/MM/yyyy");
        List<Map<String, Periodo>> jurosAplicados = ServicoAtualizacaoUtils.montarCombinacaoDeJurosPrecatorioSIP(periodoAtualizacao, periodoDaGraca, dataInicioEC1362025);
        StringBuilder mensagem = new StringBuilder();
        mensagem.append("Juros aplicados: ");
        int currentIndex = 0;
        for (Map<String, Periodo> entry : jurosAplicados) {
            boolean isLast;
            String key = entry.keySet().iterator().next();
            Periodo value = entry.values().iterator().next();
            boolean isFirst = ++currentIndex == 1;
            boolean bl = isLast = currentIndex == jurosAplicados.size();
            if (isFirst && isLast) {
                mensagem.append(String.format("'%s' de %s at\u00e9 %s.", key, dateFormatter.format(value.getInicial()), dateFormatter.format(value.getFinal())));
                continue;
            }
            if (isFirst) {
                mensagem.append(String.format("'%s' de %s at\u00e9 %s", key, dateFormatter.format(value.getInicial()), dateFormatter.format(value.getFinal())));
                continue;
            }
            if (isLast) {
                mensagem.append(String.format(" e '%s' at\u00e9 %s.", key, dateFormatter.format(value.getFinal())));
                continue;
            }
            mensagem.append(String.format(", '%s' at\u00e9 %s", key, dateFormatter.format(value.getFinal())));
        }
        return mensagem.toString();
    }

    public boolean hasMensagens() {
        return !this.mensagens.isEmpty();
    }

    public Set<String> getMensagens() {
        TreeMap<Integer, String> map = new TreeMap<Integer, String>(this.mensagensOrdenadas);
        Set set = map.entrySet();
        for (Map.Entry me : set) {
            this.mensagem(((String)me.getValue()).toString());
        }
        return this.mensagens;
    }

    @Override
    public void mensagem(String mensagem) {
        this.mensagens.add(mensagem);
    }

    @Override
    public void mensagemOrdenada(Integer ordem, String mensagem) {
        this.mensagensOrdenadas.put(ordem, mensagem);
    }
}

