/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OperacaoDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeFgts")
public class RepositorioDeFgts
extends RepositorioBase<Fgts> {
    public RepositorioDeFgts() {
        super(Fgts.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    protected void remover(Fgts entidade) {
        entidade.setVersao(entidade.getVersao() + 1L);
        if (Utils.nulo(entidade.getId())) {
            return;
        }
        super.remover(Fgts.obter(entidade.getId()));
    }

    public Fgts obterPorCalculo(Calculo calculo) {
        return (Fgts)super.obterEntidadeBase("from Fgts f where f.calculo = ?", calculo);
    }

    public void removerDeOcorrencias(final Fgts fgts, List<OcorrenciaDeFgts> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<Fgts, OcorrenciaDeFgts>(){

            @Override
            public Fgts getOwner() {
                return fgts;
            }

            @Override
            public Collection<OcorrenciaDeFgts> getCollection(Fgts attachadOwner) {
                return attachadOwner.getOcorrencias();
            }
        }, filhos, flush);
    }

    public void limparOcorrencias(Fgts fgts, boolean flush) {
        if (Utils.naoNulo(fgts) && Utils.naoNulo(fgts.getOcorrencias()) && !fgts.getOcorrencias().isEmpty()) {
            if (Utils.naoNulo(this.entityManager)) {
                ArrayList<OcorrenciaDeFgts> ocorrencias = new ArrayList<OcorrenciaDeFgts>();
                for (OcorrenciaDeFgts ocorrencia : fgts.getOcorrencias()) {
                    ocorrencias.add(ocorrencia);
                }
                fgts.removerDeOcorrencias(ocorrencias, flush);
            } else {
                fgts.getOcorrencias().clear();
            }
        }
    }

    public void gerarOcorrencias(Fgts fgts) {
        this.gerarOcorrencias(fgts, false, true);
    }

    public void gerarOcorrencias(Fgts fgts, boolean manterAlteracoes, boolean flush) {
        fgts.validar();
        if (Utils.nulo(fgts.getId())) {
            this.getSession().persist((Object)fgts);
        }
        OptimizerListSearchUnique<Competencia, OcorrenciaDeFgts> ocorrenciasAntigas = null;
        if (manterAlteracoes) {
            ocorrenciasAntigas = fgts.getOcorrenciasOptimizerListSearchUnique();
        }
        Calculo calculo = Calculo.obter(fgts.getCalculo().getId());
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>> historicosSalariais = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>>();
        for (HistoricoSalarial historicoSalarial : calculo.getHistoricosSalariais()) {
            if (!historicoSalarial.getIncidenciaFGTS().booleanValue()) continue;
            OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDeHistoricoSalarial = HistoricoSalarial.obter(historicoSalarial.getId()).getListaDeOcorrenciasOtimizada();
            historicosSalariais.add(ocorrenciasDeHistoricoSalarial);
        }
        Competencia competencia = new Competencia();
        CalculoDoProporcionalizar calculoDoProporcionalizar = null;
        OcorrenciaDeFgts ocorrencia = null;
        OcorrenciaDeFgts original = null;
        OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial = null;
        BigDecimal somaDasBasesDoHistoricoSalarial = null;
        BigDecimal depositado = null;
        BigDecimal valorDaBase = null;
        Iterator ocorrenciasDoHistoricoSalarial = null;
        LinkedHashSet<OcorrenciaDeFgts> ocorrencias = new LinkedHashSet<OcorrenciaDeFgts>();
        List<Periodo> periodos = HelperDate.breakInMonths(fgts.getPeriodoInicial(), fgts.getPeriodoFinal());
        for (Periodo periodo : periodos) {
            ocorrencia = new OcorrenciaDeFgts(fgts);
            ocorrencia.setOcorrencia(periodo.getInicial());
            competencia.update(periodo.getInicial());
            somaDasBasesDoHistoricoSalarial = BigDecimal.ZERO;
            depositado = BigDecimal.ZERO;
            for (OptimizerListSearch optimizerListSearch : historicosSalariais) {
                ocorrenciasDoHistoricoSalarial = optimizerListSearch.search(competencia);
                while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                    ocorrenciaDoHistoricoSalarial = (OcorrenciaDoHistoricoSalarial)ocorrenciasDoHistoricoSalarial.next();
                    if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaFGTS())) continue;
                    valorDaBase = BigDecimal.ZERO;
                    if (ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getAplicarProporcionalidadeFGTS().booleanValue()) {
                        int diasParaExcluir = 0;
                        if (periodo.totalDeDias() - (diasParaExcluir += calculo.obterDiasFerias(periodo)) == 31) {
                            diasParaExcluir = 1;
                        }
                        calculoDoProporcionalizar = new CalculoDoProporcionalizar(periodo, ocorrenciaDoHistoricoSalarial.getValor(), diasParaExcluir += calculo.obterFaltasNaoJustificadas(periodo));
                        calculoDoProporcionalizar.executar();
                        valorDaBase = calculoDoProporcionalizar.getResultado();
                        somaDasBasesDoHistoricoSalarial = somaDasBasesDoHistoricoSalarial.add(valorDaBase, Utils.CONTEXTO_MATEMATICO);
                    } else {
                        valorDaBase = ocorrenciaDoHistoricoSalarial.getValor();
                        somaDasBasesDoHistoricoSalarial = somaDasBasesDoHistoricoSalarial.add(valorDaBase, Utils.CONTEXTO_MATEMATICO);
                    }
                    if (!ocorrenciaDoHistoricoSalarial.getRecolhidoFGTS().booleanValue()) continue;
                    depositado = depositado.add(valorDaBase, Utils.CONTEXTO_MATEMATICO);
                }
            }
            ocorrencia.setBaseHistorico(somaDasBasesDoHistoricoSalarial);
            ocorrencia.setAliquotaDoFgtsEnum(fgts.getAliquota());
            ocorrencia.setDepositado(fgts.getAliquota().calcular(depositado));
            original = new OcorrenciaDeFgts(fgts);
            original.copiar(ocorrencia);
            ocorrencia.setOcorrenciaOriginal(original);
            if (Utils.naoNulo(ocorrenciasAntigas)) {
                ocorrencia.copiarValoresInformadosAnteriormente(ocorrenciasAntigas.search(competencia));
            }
            ocorrencias.add(ocorrencia);
            this.getSession().persist((Object)ocorrencia);
        }
        this.limparOcorrencias(fgts, flush);
        fgts.setOcorrencias(ocorrencias);
        fgts.salvar();
        if (flush) {
            this.flush();
        }
    }

    @Override
    public void salvar(Fgts entidade) {
        if (Utils.naoNulo(entidade.getId())) {
            Set<OperacaoDeFgts> lista = Fgts.obter(entidade.getId()).getOperacoesDeFgts();
            for (OperacaoDeFgts operacaoDeFgts : lista) {
                if (entidade.getOperacoesDeFgts().contains(operacaoDeFgts)) continue;
                this.getSession().delete((Object)operacaoDeFgts);
            }
        }
        super.salvar(entidade);
    }

    public void adicionarEmOperacoesDeFgts(Fgts fgts, OperacaoDeFgts operacaoDeFgts) {
        operacaoDeFgts.validar();
        for (OperacaoDeFgts o : fgts.getOperacoesDeFgts()) {
            if (!o.getCompetencia().equals(operacaoDeFgts.getCompetencia())) continue;
            throw new NegocioException(new MensagemDeRecurso("competencia", Mensagens.MSG0006, "Data"));
        }
        operacaoDeFgts.setFgts(fgts);
        fgts.getOperacoesDeFgts().add(operacaoDeFgts);
    }

    public void removerDeOperacoesDeFgts(Fgts fgts, OperacaoDeFgts operacaoDeFgts) {
        fgts.getOperacoesDeFgts().remove(operacaoDeFgts);
    }
}

