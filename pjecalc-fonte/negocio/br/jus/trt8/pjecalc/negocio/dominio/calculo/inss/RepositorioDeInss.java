/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.AliquotasDoEmpregadorPorPeriodo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.PeriodoDoINSSComOpcaoSimples;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaInssUnique;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.inss.BaseTetoEmpresa;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AliquotasEmpresaPorAtividadeEconomica;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AliquotasRatPorAtividadeEconomica;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AliquotasTerceirosPorAtividadeEconomica;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AtividadeEconomica;
import br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico.TabelaPrevidenciariaEmpregadoDomestico;
import br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico.TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado.TabelaPrevidenciariaSeguradoEmpregado;
import br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado.TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeInss")
public class RepositorioDeInss
extends RepositorioBase<Inss> {
    private static final int VENCIMENTO_DEZEMBRO = 20;
    private TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch listaAliquotasSeguradoEmpregado = null;
    private TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch listaAliquotasEmpregadoDomestico = null;
    private List<OcorrenciaDeInssSobreSalariosDevidos> ocorrenciasDevido;
    private List<OcorrenciaDeInssSobreSalariosPagos> ocorrenciasPago;
    private OptimizerListSearchUnique<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosDevidos> ocorrenciasDevidoAntigas = null;
    private OptimizerListSearchUnique<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosPagos> ocorrenciasPagoAntigas = null;
    private Set<Competencia> competenciasDoSimples = null;

    public RepositorioDeInss() {
        super(Inss.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    protected void remover(Inss entidade) {
        entidade.setVersao(entidade.getVersao() + 1L);
        if (Utils.nulo(entidade.getId())) {
            return;
        }
        super.remover(Inss.obter(entidade.getId()));
    }

    @Override
    public void salvar(Inss entidade) {
        super.salvar(entidade, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Inss)entity).getAliquotasPorPeriodos();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Inss)entity).getPeriodosComOpcaoSimples();
            }
        });
    }

    public Inss removerDeAliquotasPorPeriodos(Inss aliquotaINSS, AliquotasDoEmpregadorPorPeriodo aliquotasDoEmpregadorPorPeriodo) {
        aliquotaINSS.getAliquotasPorPeriodos().remove(aliquotasDoEmpregadorPorPeriodo);
        this.getSession().delete((Object)aliquotasDoEmpregadorPorPeriodo);
        return aliquotaINSS;
    }

    public Inss removerDePeriodosComOpcaoSimples(Inss aliquotaINSS, PeriodoDoINSSComOpcaoSimples periodoDoINSSComOpcaoSimples) {
        aliquotaINSS.getPeriodosComOpcaoSimples().remove(periodoDoINSSComOpcaoSimples);
        this.getSession().delete((Object)periodoDoINSSComOpcaoSimples);
        return aliquotaINSS;
    }

    public void limparListaDeAliquotasPorPeriodos(Inss inss) {
        List<AliquotasDoEmpregadorPorPeriodo> lista = null;
        if (Utils.naoNulo(inss) && Utils.naoNulo(inss.getId())) {
            lista = Inss.obter(inss.getId()).getAliquotasPorPeriodos();
        }
        if (Utils.naoNulo(lista) && !lista.isEmpty()) {
            for (AliquotasDoEmpregadorPorPeriodo aliquota : lista) {
                this.getSession().delete((Object)aliquota);
            }
        }
    }

    public void limparOcorrenciasDeSalariosDevidos(Inss inss, boolean flush) {
        if (Utils.naoNulo(inss) && Utils.naoNulo(inss.getInssSobreSalariosDevidos()) && Utils.naoNulo(inss.getInssSobreSalariosDevidos().getOcorrencias()) && !inss.getInssSobreSalariosDevidos().getOcorrencias().isEmpty()) {
            if (Utils.naoNulo(this.entityManager)) {
                ArrayList<OcorrenciaDeInssSobreSalariosDevidos> ocorrencias = new ArrayList<OcorrenciaDeInssSobreSalariosDevidos>();
                for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : inss.getInssSobreSalariosDevidos().getOcorrencias()) {
                    ocorrencias.add(ocorrencia);
                }
                inss.getInssSobreSalariosDevidos().removerDeOcorrencias(ocorrencias, flush);
            }
            inss.getInssSobreSalariosDevidos().getOcorrencias().clear();
        }
    }

    public void limparOcorrenciasDeSalariosPagos(Inss inss, boolean flush) {
        if (Utils.naoNulo(inss) && Utils.naoNulo(inss.getInssSobreSalariosPagos()) && Utils.naoNulo(inss.getInssSobreSalariosPagos().getOcorrencias()) && !inss.getInssSobreSalariosPagos().getOcorrencias().isEmpty()) {
            if (Utils.naoNulo(this.entityManager)) {
                ArrayList<OcorrenciaDeInssSobreSalariosPagos> ocorrencias = new ArrayList<OcorrenciaDeInssSobreSalariosPagos>();
                for (OcorrenciaDeInssSobreSalariosPagos ocorrencia : inss.getInssSobreSalariosPagos().getOcorrencias()) {
                    ocorrencias.add(ocorrencia);
                }
                inss.getInssSobreSalariosPagos().removerDeOcorrencias(ocorrencias, flush);
            }
            inss.getInssSobreSalariosPagos().getOcorrencias().clear();
        }
    }

    public void limparOcorrencias(Inss inss, boolean flush) {
        if (Utils.naoNulo(inss)) {
            ArrayList<OcorrenciaDeInssSobreSalariosDevidos> ocorrencias;
            if (Utils.naoNulo(inss.getInssSobreSalariosDevidos()) && Utils.naoNulo(inss.getInssSobreSalariosDevidos().getOcorrencias()) && !inss.getInssSobreSalariosDevidos().getOcorrencias().isEmpty()) {
                if (Utils.naoNulo(this.entityManager)) {
                    ocorrencias = new ArrayList<OcorrenciaDeInssSobreSalariosDevidos>();
                    for (OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDeInssSobreSalariosDevidos : inss.getInssSobreSalariosDevidos().getOcorrencias()) {
                        ocorrencias.add(ocorrenciaDeInssSobreSalariosDevidos);
                    }
                    inss.getInssSobreSalariosDevidos().removerDeOcorrencias(ocorrencias, flush);
                }
                inss.getInssSobreSalariosDevidos().getOcorrencias().clear();
            }
            if (Utils.naoNulo(inss.getInssSobreSalariosPagos()) && Utils.naoNulo(inss.getInssSobreSalariosPagos().getOcorrencias()) && !inss.getInssSobreSalariosPagos().getOcorrencias().isEmpty()) {
                if (Utils.naoNulo(this.entityManager)) {
                    ocorrencias = new ArrayList();
                    for (OcorrenciaDeInssSobreSalariosPagos ocorrenciaDeInssSobreSalariosPagos : inss.getInssSobreSalariosPagos().getOcorrencias()) {
                        ocorrencias.add((OcorrenciaDeInssSobreSalariosDevidos)((Object)ocorrenciaDeInssSobreSalariosPagos));
                    }
                    inss.getInssSobreSalariosPagos().removerDeOcorrencias(ocorrencias, flush);
                }
                inss.getInssSobreSalariosPagos().getOcorrencias().clear();
            }
        }
    }

    public void gerarOcorrencias(Inss inss) {
        this.gerarOcorrencias(inss, false, true);
    }

    /*
     * Could not resolve type clashes
     */
    public List<OcorrenciaDeInssSobreSalariosDevidos> geraOcorrenciasSobreSalariosDevidos(Inss inss) {
        Calculo calculo = Calculo.obter(inss.getCalculo().getId());
        this.ocorrenciasDevidoAntigas = inss.getInssSobreSalariosDevidos().getOcorrenciasOptimizerListSearchUnique();
        this.ocorrenciasDevido = new ArrayList<OcorrenciaDeInssSobreSalariosDevidos>();
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>> historicosSalariais = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>>();
        for (HistoricoSalarial historicoSalarial : calculo.getHistoricosSalariais()) {
            if (!historicoSalarial.getIncidenciaINSS().booleanValue()) continue;
            OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDeHistoricoSalarial = HistoricoSalarial.obter(historicoSalarial.getId()).getListaDeOcorrenciasOtimizada();
            historicosSalariais.add(ocorrenciasDeHistoricoSalarial);
        }
        this.listaAliquotasSeguradoEmpregado = null;
        this.listaAliquotasEmpregadoDomestico = null;
        List<Periodo> periodosSalariosDevidos = HelperDate.breakInMonths(inss.getInssSobreSalariosDevidos().getDataInicioPeriodo(), inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo());
        OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDevido = null;
        Competencia competencia = new Competencia();
        OcorrenciaInssUnique chaveOcorrencia = new OcorrenciaInssUnique();
        for (Periodo periodo : periodosSalariosDevidos) {
            competencia.update(periodo.getInicial());
            ocorrenciaDevido = new OcorrenciaDeInssSobreSalariosDevidos();
            ocorrenciaDevido.setInssSobreSalariosDevidos(inss.getInssSobreSalariosDevidos());
            ocorrenciaDevido.setDataInicioPeriodo(periodo.getInicial());
            ocorrenciaDevido.setDataTerminoPeriodo(periodo.getFinal());
            ocorrenciaDevido.setDataOcorrenciaInss(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
            BigDecimal baseHistorico = BigDecimal.ZERO;
            for (OptimizerListSearch ocorrenciasDoHistoricoSalarialOptimizeSearch : historicosSalariais) {
                Iterator ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(competencia);
                while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                    OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial = (OcorrenciaDoHistoricoSalarial)ocorrenciasDoHistoricoSalarial.next();
                    if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                    BigDecimal valorOcorrenciaDoHistorico = BigDecimal.ZERO;
                    if (ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getAplicarProporcionalidadeINSS().booleanValue()) {
                        int diasParaExcluir = 0;
                        if (periodo.totalDeDias() - (diasParaExcluir += calculo.obterDiasFerias(periodo)) == 31) {
                            diasParaExcluir = 1;
                        }
                        CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar(periodo, ocorrenciaDoHistoricoSalarial.getValor(), diasParaExcluir += calculo.obterFaltasNaoJustificadas(periodo));
                        calculoDoProporcionalizar.executar();
                        valorOcorrenciaDoHistorico = calculoDoProporcionalizar.getResultado();
                    } else {
                        valorOcorrenciaDoHistorico = ocorrenciaDoHistoricoSalarial.getValor();
                    }
                    baseHistorico = baseHistorico.add(valorOcorrenciaDoHistorico, Utils.CONTEXTO_MATEMATICO);
                }
            }
            ocorrenciaDevido.setTipoValorDaBase(TipoValorEnum.CALCULADO);
            ocorrenciaDevido.setValorBase(baseHistorico);
            if (inss.getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue()) {
                switch (inss.getTipoAliquotaSegurado()) {
                    case FIXA: {
                        Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                        ocorrenciaDevido.setAliquotaSegurado(inss.getAliquotaSeguradoFixa());
                        if (inss.getLimitarTeto().booleanValue()) {
                            if (this.listaAliquotasSeguradoEmpregado == null) {
                                this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                            }
                            if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(competencia)) != null && tabelaSeguradoEmpregado.hasNext()) {
                                ocorrenciaDevido.setValorTetoSegurado(tabelaSeguradoEmpregado.next().getValorTetoMaximo());
                                break;
                            }
                            ocorrenciaDevido.setValorTetoSegurado(null);
                            break;
                        }
                        ocorrenciaDevido.setValorTetoSegurado(null);
                        break;
                    }
                    case SEGURADO_EMPREGADO: {
                        Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                        if (this.listaAliquotasSeguradoEmpregado == null) {
                            this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                        }
                        if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(competencia)) != null && tabelaSeguradoEmpregado.hasNext()) {
                            TabelaPrevidenciariaSeguradoEmpregado tpse = tabelaSeguradoEmpregado.next();
                            ocorrenciaDevido.setAliquotaSegurado(tpse.obterAliquotaParaValor(baseHistorico));
                            ocorrenciaDevido.setValorTetoSegurado(tpse.getValorTetoMaximo());
                            break;
                        }
                        ocorrenciaDevido.setAliquotaSegurado(null);
                        ocorrenciaDevido.setValorTetoSegurado(null);
                        break;
                    }
                    case EMPREGADO_DOMESTICO: {
                        Iterator<TabelaPrevidenciariaEmpregadoDomestico> tabelaEmpregadoDomestico;
                        if (this.listaAliquotasEmpregadoDomestico == null) {
                            this.listaAliquotasEmpregadoDomestico = this.populaListaAliquotasEmpregadoDomestico(inss);
                        }
                        if ((tabelaEmpregadoDomestico = this.listaAliquotasEmpregadoDomestico.search(competencia)) != null && tabelaEmpregadoDomestico.hasNext()) {
                            TabelaPrevidenciariaEmpregadoDomestico tped = tabelaEmpregadoDomestico.next();
                            ocorrenciaDevido.setAliquotaSegurado(tped.obterAliquotaParaValor(baseHistorico));
                            ocorrenciaDevido.setValorTetoSegurado(tped.getValorTetoMaximo());
                            break;
                        }
                        ocorrenciaDevido.setAliquotaSegurado(null);
                        ocorrenciaDevido.setValorTetoSegurado(null);
                    }
                }
            } else {
                ocorrenciaDevido.setAliquotaSegurado(null);
                ocorrenciaDevido.setValorTetoSegurado(null);
            }
            if (this.competenciasDoSimples == null) {
                this.competenciasDoSimples = this.encontraCompetenciasOpcaoSimples(inss.getPeriodosComOpcaoSimples());
            }
            if (this.competenciasDoSimples.contains(competencia)) {
                ocorrenciaDevido.setAliquotaEmpresa(null);
                ocorrenciaDevido.setAliquotaSAT(null);
                ocorrenciaDevido.setAliquotaTerceiros(null);
                ocorrenciaDevido.setValorTetoEmpresa(null);
            } else {
                switch (inss.getTipoAliquotaEmpregador()) {
                    case FIXA: {
                        if (Utils.naoNulo(inss.getAliquotaEmpresaFixa())) {
                            ocorrenciaDevido.setAliquotaEmpresa(inss.getAliquotaEmpresaFixa());
                        } else {
                            ocorrenciaDevido.setAliquotaEmpresa(null);
                        }
                        if (Utils.naoNulo(inss.getAliquotaRATFixa())) {
                            ocorrenciaDevido.setAliquotaSAT(inss.getAliquotaRATFixa());
                        } else {
                            ocorrenciaDevido.setAliquotaSAT(null);
                        }
                        if (Utils.naoNulo(inss.getAliquotaTerceirosFixa())) {
                            ocorrenciaDevido.setAliquotaTerceiros(inss.getAliquotaTerceirosFixa());
                        } else {
                            ocorrenciaDevido.setAliquotaTerceiros(null);
                        }
                        if (Utils.nulo(ocorrenciaDevido.getValorTetoSegurado()) || Utils.nulo(inss.getAliquotaEmpresaFixa())) {
                            ocorrenciaDevido.setValorTetoEmpresa(null);
                            break;
                        }
                        BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                        if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                            BigDecimal teto = baseTeto.getBaseTeto().multiply(inss.getAliquotaEmpresaFixa(), Utils.CONTEXTO_MATEMATICO);
                            teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                            ocorrenciaDevido.setValorTetoEmpresa(teto);
                            break;
                        }
                        ocorrenciaDevido.setValorTetoEmpresa(null);
                        break;
                    }
                    case POR_PERIODO: {
                        Iterator<Periodo> aliquotaEmpresaPorPeriodo = null;
                        boolean encontrouPeriodo = false;
                        for (AliquotasDoEmpregadorPorPeriodo aliquotasPorPeriodo : inss.getAliquotasPorPeriodos()) {
                            Date competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                            if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataInicioPeriodo()) || !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataTerminoPeriodo())) continue;
                            if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaEmpresa())) {
                                ocorrenciaDevido.setAliquotaEmpresa(aliquotasPorPeriodo.getAliquotaEmpresa());
                            } else {
                                ocorrenciaDevido.setAliquotaEmpresa(null);
                            }
                            if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaRAT())) {
                                ocorrenciaDevido.setAliquotaSAT(aliquotasPorPeriodo.getAliquotaRAT());
                            } else {
                                ocorrenciaDevido.setAliquotaSAT(null);
                            }
                            if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaTerceiros())) {
                                ocorrenciaDevido.setAliquotaTerceiros(aliquotasPorPeriodo.getAliquotaTerceiros());
                            } else {
                                ocorrenciaDevido.setAliquotaTerceiros(null);
                            }
                            encontrouPeriodo = true;
                            break;
                        }
                        if (!encontrouPeriodo) {
                            ocorrenciaDevido.setAliquotaEmpresa(null);
                            ocorrenciaDevido.setAliquotaSAT(null);
                            ocorrenciaDevido.setAliquotaTerceiros(null);
                        }
                        if (Utils.nulo(ocorrenciaDevido.getValorTetoSegurado()) || Utils.nulo(aliquotaEmpresaPorPeriodo)) {
                            ocorrenciaDevido.setValorTetoEmpresa(null);
                            break;
                        }
                        BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                        if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                            BigDecimal teto = baseTeto.getBaseTeto().multiply((BigDecimal)((Object)aliquotaEmpresaPorPeriodo), Utils.CONTEXTO_MATEMATICO);
                            teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                            ocorrenciaDevido.setValorTetoEmpresa(teto);
                            break;
                        }
                        ocorrenciaDevido.setValorTetoEmpresa(null);
                        break;
                    }
                    case POR_ATIVIDADE_ECONOMICA: {
                        Date competenciaDaOcorrencia;
                        BigDecimal aliquotaEmpresa = null;
                        BigDecimal aliquotaRat = null;
                        BigDecimal aliquotaTerceiros = null;
                        BigDecimal tetoEmpresa = null;
                        AtividadeEconomica atividadeEconomica = AtividadeEconomica.obter(inss.getAtividadeEconomica().getId());
                        if (inss.getApurarEmpresaPorAtividade().booleanValue()) {
                            for (AliquotasEmpresaPorAtividadeEconomica aliquotasEmpresa : atividadeEconomica.getAliquotasEmpresaDaAtividade()) {
                                competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataInicial()) || !Utils.nulo(aliquotasEmpresa.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataFinal())) continue;
                                if (Utils.naoNulo(aliquotasEmpresa.getAliquota())) {
                                    aliquotaEmpresa = aliquotasEmpresa.getAliquota();
                                }
                                if (!Utils.naoNulo(aliquotasEmpresa.getTeto())) break;
                                tetoEmpresa = aliquotasEmpresa.getTeto();
                                break;
                            }
                        }
                        if (inss.getApurarRATPorAtividade().booleanValue()) {
                            for (AliquotasRatPorAtividadeEconomica aliquotasRat : atividadeEconomica.getAliquotasRatDaAtividade()) {
                                competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataInicial()) || !Utils.nulo(aliquotasRat.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataFinal())) continue;
                                if (!Utils.naoNulo(aliquotasRat.getAliquota())) break;
                                aliquotaRat = aliquotasRat.getAliquota();
                                break;
                            }
                        }
                        if (inss.getApurarTerceirosPorAtividade().booleanValue()) {
                            for (AliquotasTerceirosPorAtividadeEconomica aliquotasTerceiros : atividadeEconomica.getAliquotasTerceirosDaAtividade()) {
                                competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataInicial()) || !Utils.nulo(aliquotasTerceiros.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataFinal())) continue;
                                if (!Utils.naoNulo(aliquotasTerceiros.getAliquota())) break;
                                aliquotaTerceiros = aliquotasTerceiros.getAliquota();
                                break;
                            }
                        }
                        if (Utils.naoNulo(aliquotaEmpresa)) {
                            ocorrenciaDevido.setAliquotaEmpresa(aliquotaEmpresa);
                        } else {
                            ocorrenciaDevido.setAliquotaEmpresa(null);
                        }
                        if (Utils.naoNulo(aliquotaRat)) {
                            ocorrenciaDevido.setAliquotaSAT(aliquotaRat);
                        } else {
                            ocorrenciaDevido.setAliquotaSAT(null);
                        }
                        if (Utils.naoNulo(aliquotaTerceiros)) {
                            ocorrenciaDevido.setAliquotaTerceiros(aliquotaTerceiros);
                        } else {
                            ocorrenciaDevido.setAliquotaTerceiros(null);
                        }
                        if (Utils.nulo(ocorrenciaDevido.getValorTetoSegurado())) {
                            ocorrenciaDevido.setValorTetoEmpresa(null);
                            break;
                        }
                        ocorrenciaDevido.setValorTetoEmpresa(tetoEmpresa);
                    }
                }
            }
            if (Utils.naoNulo(this.ocorrenciasDevidoAntigas)) {
                chaveOcorrencia.update(competencia, ocorrenciaDevido.getOcorrenciaDecimoTerceiro());
                ocorrenciaDevido.copiarValoresInformadosAnteriormente(this.ocorrenciasDevidoAntigas.search(chaveOcorrencia));
            }
            this.ocorrenciasDevido.add(ocorrenciaDevido);
        }
        HelperDate dataDemissao = HelperDate.getInstance(calculo.getDataDemissao());
        HelperDate dataDeFimDoInssSalariosDevidos = HelperDate.getInstance(inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo());
        List<Periodo> periodosDevidos = HelperDate.breakInMonths(inss.getInssSobreSalariosDevidos().getDataInicioPeriodo(), inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo(), 11);
        for (Periodo periodo : periodosDevidos) {
            if (Utils.naoNulo(dataDemissao) && dataDeFimDoInssSalariosDevidos.compareDate(dataDemissao.getDate()) && periodo.obterDataFinalHelper().compareMonthAndYear(dataDemissao.getDate())) {
                periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(dataDemissao.getDay()).getDate());
                periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(dataDemissao.getDay()).getDate());
                this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                continue;
            }
            if (periodo.obterDataInicialHelper().getDay() == 1) {
                if (periodo.obterDataFinalHelper().getDay() == 31) {
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                    this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                    continue;
                }
                if (periodo.obterDataFinalHelper().getDay() < 20) continue;
                periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                continue;
            }
            if (periodo.obterDataFinalHelper().getDay() == 31) {
                if (periodo.obterDataInicialHelper().getDay() > 20) continue;
                periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                continue;
            }
            if (periodo.obterDataInicialHelper().getDay() > 20 || periodo.obterDataFinalHelper().getDay() < 20) continue;
            periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
            periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
            this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
        }
        if (Utils.naoNulo(dataDemissao) && dataDemissao.getMonth() != 11 && dataDeFimDoInssSalariosDevidos.greaterThenOrEquals(dataDemissao.getDate())) {
            Periodo periodoOcorrencia = new Periodo(dataDemissao.getDate(), dataDemissao.getDate());
            this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodoOcorrencia, calculo, historicosSalariais);
        }
        return this.ocorrenciasDevido;
    }

    /*
     * WARNING - void declaration
     */
    public List<OcorrenciaDeInssSobreSalariosPagos> geraOcorrenciasSobreSalariosPagos(Inss inss) {
        Calculo calculo = Calculo.obter(inss.getCalculo().getId());
        this.ocorrenciasPagoAntigas = inss.getInssSobreSalariosPagos().getOcorrenciasOptimizerListSearchUnique();
        this.ocorrenciasPago = new ArrayList<OcorrenciaDeInssSobreSalariosPagos>();
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>> historicosSalariais = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>>();
        for (HistoricoSalarial historicoSalarial : calculo.getHistoricosSalariais()) {
            if (!historicoSalarial.getIncidenciaINSS().booleanValue()) continue;
            OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDeHistoricoSalarial = HistoricoSalarial.obter(historicoSalarial.getId()).getListaDeOcorrenciasOtimizada();
            historicosSalariais.add(ocorrenciasDeHistoricoSalarial);
        }
        this.listaAliquotasSeguradoEmpregado = null;
        this.listaAliquotasEmpregadoDomestico = null;
        Competencia competencia = new Competencia();
        OcorrenciaInssUnique chaveOcorrencia = new OcorrenciaInssUnique();
        if (inss.getApurarInssSobreSalariosPagos().booleanValue()) {
            List<Periodo> periodosSalariosPagos = HelperDate.breakInMonths(inss.getInssSobreSalariosPagos().getDataInicioPeriodo(), inss.getInssSobreSalariosPagos().getDataTerminoPeriodo());
            for (Periodo periodo : periodosSalariosPagos) {
                void var13_13;
                void var13_25;
                competencia.update(periodo.getInicial());
                OcorrenciaDeInssSobreSalariosPagos ocorrenciaPago = new OcorrenciaDeInssSobreSalariosPagos();
                ocorrenciaPago.setInssSobreSalariosPagos(inss.getInssSobreSalariosPagos());
                ocorrenciaPago.setDataInicioPeriodo(periodo.getInicial());
                ocorrenciaPago.setDataTerminoPeriodo(periodo.getFinal());
                ocorrenciaPago.setDataOcorrenciaInss(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                BigDecimal baseHistorico = BigDecimal.ZERO;
                BigDecimal baseRecolhido = BigDecimal.ZERO;
                for (OptimizerListSearch optimizerListSearch : historicosSalariais) {
                    Iterator ocorrenciasDoHistoricoSalarial = optimizerListSearch.search(competencia);
                    while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                        OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial = (OcorrenciaDoHistoricoSalarial)ocorrenciasDoHistoricoSalarial.next();
                        if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                        BigDecimal valorOcorrenciaDoHistorico = BigDecimal.ZERO;
                        if (ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getAplicarProporcionalidadeINSS().booleanValue()) {
                            int diasParaExcluir = 0;
                            diasParaExcluir += calculo.obterFaltasNaoJustificadas(periodo);
                            CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar(periodo, ocorrenciaDoHistoricoSalarial.getValor(), diasParaExcluir += calculo.obterDiasFerias(periodo));
                            calculoDoProporcionalizar.executar();
                            valorOcorrenciaDoHistorico = calculoDoProporcionalizar.getResultado();
                        } else {
                            valorOcorrenciaDoHistorico = ocorrenciaDoHistoricoSalarial.getValor();
                        }
                        baseHistorico = baseHistorico.add(valorOcorrenciaDoHistorico, Utils.CONTEXTO_MATEMATICO);
                        if (!ocorrenciaDoHistoricoSalarial.getRecolhidoINSS().booleanValue()) continue;
                        baseRecolhido = baseRecolhido.add(valorOcorrenciaDoHistorico, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                ocorrenciaPago.setTipoValorDaBase(TipoValorEnum.CALCULADO);
                ocorrenciaPago.setValorBase(baseHistorico);
                ocorrenciaPago.setValorBaseRecolhido(baseRecolhido);
                switch (inss.getTipoAliquotaSegurado()) {
                    case FIXA: {
                        Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                        ocorrenciaPago.setAliquotaSegurado(inss.getAliquotaSeguradoFixa());
                        ocorrenciaPago.setAliquotaRecolhidoSegurado(inss.getAliquotaSeguradoFixa());
                        if (inss.getLimitarTeto().booleanValue()) {
                            if (this.listaAliquotasSeguradoEmpregado == null) {
                                this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                            }
                            if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(competencia)) != null && tabelaSeguradoEmpregado.hasNext()) {
                                ocorrenciaPago.setValorTetoSegurado(tabelaSeguradoEmpregado.next().getValorTetoMaximo());
                                break;
                            }
                            ocorrenciaPago.setValorTetoSegurado(null);
                            break;
                        }
                        ocorrenciaPago.setValorTetoSegurado(null);
                        break;
                    }
                    case SEGURADO_EMPREGADO: {
                        Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                        if (this.listaAliquotasSeguradoEmpregado == null) {
                            this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                        }
                        if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(competencia)) != null && tabelaSeguradoEmpregado.hasNext()) {
                            TabelaPrevidenciariaSeguradoEmpregado tabelaPrevidenciariaSeguradoEmpregado = tabelaSeguradoEmpregado.next();
                            ocorrenciaPago.setAliquotaSegurado(tabelaPrevidenciariaSeguradoEmpregado.obterAliquotaParaValor(baseHistorico));
                            ocorrenciaPago.setValorTetoSegurado(tabelaPrevidenciariaSeguradoEmpregado.getValorTetoMaximo());
                            ocorrenciaPago.setAliquotaRecolhidoSegurado(tabelaPrevidenciariaSeguradoEmpregado.obterAliquotaParaValor(baseRecolhido));
                            break;
                        }
                        ocorrenciaPago.setAliquotaSegurado(null);
                        ocorrenciaPago.setValorTetoSegurado(null);
                        ocorrenciaPago.setAliquotaRecolhidoSegurado(null);
                        break;
                    }
                    case EMPREGADO_DOMESTICO: {
                        Iterator<TabelaPrevidenciariaEmpregadoDomestico> iterator;
                        if (this.listaAliquotasEmpregadoDomestico == null) {
                            this.listaAliquotasEmpregadoDomestico = this.populaListaAliquotasEmpregadoDomestico(inss);
                        }
                        if ((iterator = this.listaAliquotasEmpregadoDomestico.search(competencia)) != null && iterator.hasNext()) {
                            TabelaPrevidenciariaEmpregadoDomestico tped = iterator.next();
                            ocorrenciaPago.setAliquotaSegurado(tped.obterAliquotaParaValor(baseHistorico));
                            ocorrenciaPago.setValorTetoSegurado(tped.getValorTetoMaximo());
                            ocorrenciaPago.setAliquotaRecolhidoSegurado(tped.obterAliquotaParaValor(baseRecolhido));
                            break;
                        }
                        ocorrenciaPago.setAliquotaSegurado(null);
                        ocorrenciaPago.setValorTetoSegurado(null);
                        ocorrenciaPago.setAliquotaRecolhidoSegurado(null);
                    }
                }
                BigDecimal recolhidoSegurado = ocorrenciaPago.getValorBaseRecolhido();
                recolhidoSegurado = Utils.naoNulos(recolhidoSegurado, ocorrenciaPago.getAliquotaRecolhidoSegurado()) ? recolhidoSegurado.multiply(ocorrenciaPago.getAliquotaRecolhidoSegurado().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                if (Utils.naoNulos(recolhidoSegurado, ocorrenciaPago.getValorTetoSegurado()) && recolhidoSegurado.compareTo(ocorrenciaPago.getValorTetoSegurado()) > 0) {
                    recolhidoSegurado = ocorrenciaPago.getValorTetoSegurado();
                }
                ocorrenciaPago.setTipoValorDoRecolhidoSegurado(TipoValorEnum.CALCULADO);
                ocorrenciaPago.setValorRecolhidoSegurado(recolhidoSegurado);
                if (this.competenciasDoSimples == null) {
                    this.competenciasDoSimples = this.encontraCompetenciasOpcaoSimples(inss.getPeriodosComOpcaoSimples());
                }
                if (this.competenciasDoSimples.contains(competencia)) {
                    ocorrenciaPago.setAliquotaEmpresa(null);
                    ocorrenciaPago.setAliquotaSAT(null);
                    ocorrenciaPago.setAliquotaTerceiros(null);
                    ocorrenciaPago.setValorTetoEmpresa(null);
                } else {
                    switch (inss.getTipoAliquotaEmpregador()) {
                        case FIXA: {
                            if (Utils.naoNulo(inss.getAliquotaEmpresaFixa())) {
                                ocorrenciaPago.setAliquotaEmpresa(inss.getAliquotaEmpresaFixa());
                            } else {
                                ocorrenciaPago.setAliquotaEmpresa(null);
                            }
                            if (Utils.naoNulo(inss.getAliquotaRATFixa())) {
                                ocorrenciaPago.setAliquotaSAT(inss.getAliquotaRATFixa());
                            } else {
                                ocorrenciaPago.setAliquotaSAT(null);
                            }
                            if (Utils.naoNulo(inss.getAliquotaTerceirosFixa())) {
                                ocorrenciaPago.setAliquotaTerceiros(inss.getAliquotaTerceirosFixa());
                            } else {
                                ocorrenciaPago.setAliquotaTerceiros(null);
                            }
                            if (Utils.nulo(ocorrenciaPago.getValorTetoSegurado()) || Utils.nulo(inss.getAliquotaEmpresaFixa())) {
                                ocorrenciaPago.setValorTetoEmpresa(null);
                                break;
                            }
                            BaseTetoEmpresa baseTetoEmpresa = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                            if (Utils.naoNulo(baseTetoEmpresa) && Utils.naoNulo(baseTetoEmpresa.getBaseTeto())) {
                                BigDecimal teto = baseTetoEmpresa.getBaseTeto().multiply(inss.getAliquotaEmpresaFixa(), Utils.CONTEXTO_MATEMATICO);
                                teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                                ocorrenciaPago.setValorTetoEmpresa(teto);
                                break;
                            }
                            ocorrenciaPago.setValorTetoEmpresa(null);
                            break;
                        }
                        case POR_PERIODO: {
                            BigDecimal bigDecimal = null;
                            boolean encontrouPeriodo = false;
                            for (AliquotasDoEmpregadorPorPeriodo aliquotasPorPeriodo : inss.getAliquotasPorPeriodos()) {
                                Date competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataInicioPeriodo()) || !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataTerminoPeriodo())) continue;
                                if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaEmpresa())) {
                                    ocorrenciaPago.setAliquotaEmpresa(aliquotasPorPeriodo.getAliquotaEmpresa());
                                } else {
                                    ocorrenciaPago.setAliquotaEmpresa(null);
                                }
                                if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaRAT())) {
                                    ocorrenciaPago.setAliquotaSAT(aliquotasPorPeriodo.getAliquotaRAT());
                                } else {
                                    ocorrenciaPago.setAliquotaSAT(null);
                                }
                                if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaTerceiros())) {
                                    ocorrenciaPago.setAliquotaTerceiros(aliquotasPorPeriodo.getAliquotaTerceiros());
                                } else {
                                    ocorrenciaPago.setAliquotaTerceiros(null);
                                }
                                encontrouPeriodo = true;
                                break;
                            }
                            if (!encontrouPeriodo) {
                                ocorrenciaPago.setAliquotaEmpresa(null);
                                ocorrenciaPago.setAliquotaSAT(null);
                                ocorrenciaPago.setAliquotaTerceiros(null);
                            }
                            if (Utils.nulo(ocorrenciaPago.getValorTetoSegurado()) || Utils.nulo(bigDecimal)) {
                                ocorrenciaPago.setValorTetoEmpresa(null);
                                break;
                            }
                            BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                            if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                                BigDecimal teto = baseTeto.getBaseTeto().multiply(bigDecimal, Utils.CONTEXTO_MATEMATICO);
                                teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                                ocorrenciaPago.setValorTetoEmpresa(teto);
                                break;
                            }
                            ocorrenciaPago.setValorTetoEmpresa(null);
                            break;
                        }
                        case POR_ATIVIDADE_ECONOMICA: {
                            Date competenciaDaOcorrencia;
                            BigDecimal aliquotaEmpresa = null;
                            BigDecimal aliquotaRat = null;
                            BigDecimal aliquotaTerceiros = null;
                            BigDecimal tetoEmpresa = null;
                            AtividadeEconomica atividadeEconomica = AtividadeEconomica.obter(inss.getAtividadeEconomica().getId());
                            if (inss.getApurarEmpresaPorAtividade().booleanValue()) {
                                for (AliquotasEmpresaPorAtividadeEconomica aliquotasEmpresa : atividadeEconomica.getAliquotasEmpresaDaAtividade()) {
                                    competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                    if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataInicial()) || !Utils.nulo(aliquotasEmpresa.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataFinal())) continue;
                                    if (Utils.naoNulo(aliquotasEmpresa.getAliquota())) {
                                        aliquotaEmpresa = aliquotasEmpresa.getAliquota();
                                    }
                                    if (!Utils.naoNulo(aliquotasEmpresa.getTeto())) break;
                                    tetoEmpresa = aliquotasEmpresa.getTeto();
                                    break;
                                }
                            }
                            if (inss.getApurarRATPorAtividade().booleanValue()) {
                                for (AliquotasRatPorAtividadeEconomica aliquotasRat : atividadeEconomica.getAliquotasRatDaAtividade()) {
                                    competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                    if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataInicial()) || !Utils.nulo(aliquotasRat.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataFinal())) continue;
                                    if (!Utils.naoNulo(aliquotasRat.getAliquota())) break;
                                    aliquotaRat = aliquotasRat.getAliquota();
                                    break;
                                }
                            }
                            if (inss.getApurarTerceirosPorAtividade().booleanValue()) {
                                for (AliquotasTerceirosPorAtividadeEconomica aliquotasTerceiros : atividadeEconomica.getAliquotasTerceirosDaAtividade()) {
                                    competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                    if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataInicial()) || !Utils.nulo(aliquotasTerceiros.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataFinal())) continue;
                                    if (!Utils.naoNulo(aliquotasTerceiros.getAliquota())) break;
                                    aliquotaTerceiros = aliquotasTerceiros.getAliquota();
                                    break;
                                }
                            }
                            if (Utils.naoNulo(aliquotaEmpresa)) {
                                ocorrenciaPago.setAliquotaEmpresa(aliquotaEmpresa);
                            } else {
                                ocorrenciaPago.setAliquotaEmpresa(null);
                            }
                            if (Utils.naoNulo(aliquotaRat)) {
                                ocorrenciaPago.setAliquotaSAT(aliquotaRat);
                            } else {
                                ocorrenciaPago.setAliquotaSAT(null);
                            }
                            if (Utils.naoNulo(aliquotaTerceiros)) {
                                ocorrenciaPago.setAliquotaTerceiros(aliquotaTerceiros);
                            } else {
                                ocorrenciaPago.setAliquotaTerceiros(null);
                            }
                            if (Utils.nulo(ocorrenciaPago.getValorTetoSegurado())) {
                                ocorrenciaPago.setValorTetoEmpresa(null);
                                break;
                            }
                            ocorrenciaPago.setValorTetoEmpresa(tetoEmpresa);
                        }
                    }
                }
                BigDecimal bigDecimal = ocorrenciaPago.getValorBaseRecolhido();
                if (Utils.naoNulos(bigDecimal, ocorrenciaPago.getAliquotaEmpresa())) {
                    BigDecimal bigDecimal2 = bigDecimal.multiply(ocorrenciaPago.getAliquotaEmpresa().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO);
                } else {
                    BigDecimal bigDecimal3 = BigDecimal.ZERO;
                }
                if (Utils.naoNulos(var13_25, ocorrenciaPago.getValorTetoEmpresa()) && var13_25.compareTo(ocorrenciaPago.getValorTetoEmpresa()) > 0) {
                    BigDecimal bigDecimal4 = ocorrenciaPago.getValorTetoEmpresa();
                }
                ocorrenciaPago.setTipoValorDoRecolhidoEmpresa(TipoValorEnum.CALCULADO);
                ocorrenciaPago.setValorRecolhidoEmpresa((BigDecimal)var13_13);
                BigDecimal recolhidoSAT = ocorrenciaPago.getValorBaseRecolhido();
                recolhidoSAT = Utils.naoNulos(recolhidoSAT, ocorrenciaPago.getAliquotaSAT()) ? recolhidoSAT.multiply(ocorrenciaPago.getAliquotaSAT().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                ocorrenciaPago.setTipoValorDoRecolhidoSAT(TipoValorEnum.CALCULADO);
                ocorrenciaPago.setValorRecolhidoSAT(recolhidoSAT);
                BigDecimal recolhidoTerceiros = ocorrenciaPago.getValorBaseRecolhido();
                recolhidoTerceiros = Utils.naoNulos(recolhidoTerceiros, ocorrenciaPago.getAliquotaTerceiros()) ? recolhidoTerceiros.multiply(ocorrenciaPago.getAliquotaTerceiros().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                ocorrenciaPago.setTipoValorDoRecolhidoTerceiros(TipoValorEnum.CALCULADO);
                ocorrenciaPago.setValorRecolhidoTerceiros(recolhidoTerceiros);
                if (Utils.naoNulo(this.ocorrenciasPagoAntigas)) {
                    chaveOcorrencia.update(competencia, ocorrenciaPago.getOcorrenciaDecimoTerceiro());
                    ocorrenciaPago.copiarValoresInformadosAnteriormente(this.ocorrenciasPagoAntigas.search(chaveOcorrencia));
                }
                this.ocorrenciasPago.add(ocorrenciaPago);
            }
        }
        if (inss.getApurarInssSobreSalariosPagos().booleanValue()) {
            HelperDate dataDemissao = HelperDate.getInstance(calculo.getDataDemissao());
            HelperDate dataDeFimDoInssSalariosPagos = HelperDate.getInstance(inss.getInssSobreSalariosPagos().getDataTerminoPeriodo());
            List<Periodo> periodosPagos = HelperDate.breakInMonths(inss.getInssSobreSalariosPagos().getDataInicioPeriodo(), inss.getInssSobreSalariosPagos().getDataTerminoPeriodo(), 11);
            for (Periodo periodo : periodosPagos) {
                if (Utils.naoNulo(dataDemissao) && dataDeFimDoInssSalariosPagos.compareDate(dataDemissao.getDate()) && periodo.obterDataFinalHelper().compareMonthAndYear(dataDemissao.getDate())) {
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(dataDemissao.getDay()).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(dataDemissao.getDay()).getDate());
                    this.criaOcorrenciaPagoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                    continue;
                }
                if (periodo.obterDataInicialHelper().getDay() == 1) {
                    if (periodo.obterDataFinalHelper().getDay() == 31) {
                        periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                        periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                        this.criaOcorrenciaPagoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                        continue;
                    }
                    if (periodo.obterDataFinalHelper().getDay() < 20) continue;
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                    this.criaOcorrenciaPagoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                    continue;
                }
                if (periodo.obterDataFinalHelper().getDay() == 31) {
                    if (periodo.obterDataInicialHelper().getDay() > 20) continue;
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                    this.criaOcorrenciaPagoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                    continue;
                }
                if (periodo.obterDataInicialHelper().getDay() > 20 || periodo.obterDataFinalHelper().getDay() < 20) continue;
                periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                this.criaOcorrenciaPagoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
            }
            if (Utils.naoNulo(dataDemissao) && dataDemissao.getMonth() != 11 && dataDeFimDoInssSalariosPagos.greaterThenOrEquals(dataDemissao.getDate())) {
                Periodo periodoOcorrencia = new Periodo(dataDemissao.getDate(), dataDemissao.getDate());
                this.criaOcorrenciaPagoDecimoTerceiro(inss, periodoOcorrencia, calculo, historicosSalariais);
            }
        }
        return this.ocorrenciasPago;
    }

    /*
     * Could not resolve type clashes
     */
    public void gerarOcorrencias(Inss inss, boolean manterAlteracoes, boolean flush) {
        inss.validar();
        if (Utils.nulo(inss.getId())) {
            this.getSession().persist((Object)inss);
        }
        if (manterAlteracoes) {
            if (inss.getInssSobreSalariosDevidos().existemOcorrencias()) {
                this.ocorrenciasDevidoAntigas = inss.getInssSobreSalariosDevidos().getOcorrenciasOptimizerListSearchUnique();
            }
            if (inss.getApurarInssSobreSalariosPagos().booleanValue() && inss.getInssSobreSalariosPagos().existemOcorrencias()) {
                this.ocorrenciasPagoAntigas = inss.getInssSobreSalariosPagos().getOcorrenciasOptimizerListSearchUnique();
            }
        }
        inss.limparOcorrencias(Boolean.FALSE);
        Calculo calculo = Calculo.obter(inss.getCalculo().getId());
        this.ocorrenciasDevido = new ArrayList<OcorrenciaDeInssSobreSalariosDevidos>();
        this.ocorrenciasPago = new ArrayList<OcorrenciaDeInssSobreSalariosPagos>();
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>> historicosSalariais = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>>();
        for (HistoricoSalarial historicoSalarial : calculo.getHistoricosSalariais()) {
            if (!historicoSalarial.getIncidenciaINSS().booleanValue()) continue;
            OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDeHistoricoSalarial = HistoricoSalarial.obter(historicoSalarial.getId()).getListaDeOcorrenciasOtimizada();
            historicosSalariais.add(ocorrenciasDeHistoricoSalarial);
        }
        if (Utils.nulo(inss.getInssSobreSalariosDevidos().getOcorrencias())) {
            inss.getInssSobreSalariosDevidos().setOcorrencias(new LinkedHashSet<OcorrenciaDeInssSobreSalariosDevidos>());
        }
        if (Utils.nulo(inss.getInssSobreSalariosPagos().getOcorrencias())) {
            inss.getInssSobreSalariosPagos().setOcorrencias(new LinkedHashSet<OcorrenciaDeInssSobreSalariosPagos>());
        }
        this.listaAliquotasSeguradoEmpregado = null;
        this.listaAliquotasEmpregadoDomestico = null;
        List<Periodo> periodosSalariosDevidos = HelperDate.breakInMonths(inss.getInssSobreSalariosDevidos().getDataInicioPeriodo(), inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo());
        OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDevido = null;
        Competencia competencia = new Competencia();
        OcorrenciaInssUnique chaveOcorrencia = new OcorrenciaInssUnique();
        for (Object periodo : periodosSalariosDevidos) {
            competencia.update(((Periodo)periodo).getInicial());
            ocorrenciaDevido = new OcorrenciaDeInssSobreSalariosDevidos();
            ocorrenciaDevido.setInssSobreSalariosDevidos(inss.getInssSobreSalariosDevidos());
            ocorrenciaDevido.setDataInicioPeriodo(((Periodo)periodo).getInicial());
            ocorrenciaDevido.setDataTerminoPeriodo(((Periodo)periodo).getFinal());
            ocorrenciaDevido.setDataOcorrenciaInss(HelperDate.getCurrentCompetence(((Periodo)periodo).getInicial()).getDate());
            BigDecimal baseHistorico = BigDecimal.ZERO;
            for (OptimizerListSearch ocorrenciasDoHistoricoSalarialOptimizeSearch : historicosSalariais) {
                Iterator ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(competencia);
                while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                    OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial = (OcorrenciaDoHistoricoSalarial)ocorrenciasDoHistoricoSalarial.next();
                    if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                    BigDecimal valorOcorrenciaDoHistorico = BigDecimal.ZERO;
                    if (ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getAplicarProporcionalidadeINSS().booleanValue()) {
                        int diasParaExcluir = 0;
                        if (((Periodo)periodo).totalDeDias() - (diasParaExcluir += calculo.obterDiasFerias((Periodo)periodo)) == 31) {
                            diasParaExcluir = 1;
                        }
                        CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar((Periodo)periodo, ocorrenciaDoHistoricoSalarial.getValor(), diasParaExcluir += calculo.obterFaltasNaoJustificadas((Periodo)periodo));
                        calculoDoProporcionalizar.executar();
                        valorOcorrenciaDoHistorico = calculoDoProporcionalizar.getResultado();
                    } else {
                        valorOcorrenciaDoHistorico = ocorrenciaDoHistoricoSalarial.getValor();
                    }
                    baseHistorico = baseHistorico.add(valorOcorrenciaDoHistorico, Utils.CONTEXTO_MATEMATICO);
                }
            }
            ocorrenciaDevido.setTipoValorDaBase(TipoValorEnum.CALCULADO);
            ocorrenciaDevido.setValorBase(baseHistorico);
            if (inss.getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue()) {
                switch (inss.getTipoAliquotaSegurado()) {
                    case FIXA: {
                        Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                        ocorrenciaDevido.setAliquotaSegurado(inss.getAliquotaSeguradoFixa());
                        if (inss.getLimitarTeto().booleanValue()) {
                            if (this.listaAliquotasSeguradoEmpregado == null) {
                                this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                            }
                            if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(competencia)) != null && tabelaSeguradoEmpregado.hasNext()) {
                                ocorrenciaDevido.setValorTetoSegurado(tabelaSeguradoEmpregado.next().getValorTetoMaximo());
                                break;
                            }
                            ocorrenciaDevido.setValorTetoSegurado(null);
                            break;
                        }
                        ocorrenciaDevido.setValorTetoSegurado(null);
                        break;
                    }
                    case SEGURADO_EMPREGADO: {
                        Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                        if (this.listaAliquotasSeguradoEmpregado == null) {
                            this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                        }
                        if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(competencia)) != null && tabelaSeguradoEmpregado.hasNext()) {
                            TabelaPrevidenciariaSeguradoEmpregado tpse = tabelaSeguradoEmpregado.next();
                            ocorrenciaDevido.setAliquotaSegurado(tpse.obterAliquotaParaValor(baseHistorico));
                            ocorrenciaDevido.setValorTetoSegurado(tpse.getValorTetoMaximo());
                            break;
                        }
                        ocorrenciaDevido.setAliquotaSegurado(null);
                        ocorrenciaDevido.setValorTetoSegurado(null);
                        break;
                    }
                    case EMPREGADO_DOMESTICO: {
                        Iterator<TabelaPrevidenciariaEmpregadoDomestico> tabelaEmpregadoDomestico;
                        if (this.listaAliquotasEmpregadoDomestico == null) {
                            this.listaAliquotasEmpregadoDomestico = this.populaListaAliquotasEmpregadoDomestico(inss);
                        }
                        if ((tabelaEmpregadoDomestico = this.listaAliquotasEmpregadoDomestico.search(competencia)) != null && tabelaEmpregadoDomestico.hasNext()) {
                            TabelaPrevidenciariaEmpregadoDomestico tped = tabelaEmpregadoDomestico.next();
                            ocorrenciaDevido.setAliquotaSegurado(tped.obterAliquotaParaValor(baseHistorico));
                            ocorrenciaDevido.setValorTetoSegurado(tped.getValorTetoMaximo());
                            break;
                        }
                        ocorrenciaDevido.setAliquotaSegurado(null);
                        ocorrenciaDevido.setValorTetoSegurado(null);
                    }
                }
            } else {
                ocorrenciaDevido.setAliquotaSegurado(null);
                ocorrenciaDevido.setValorTetoSegurado(null);
            }
            if (this.competenciasDoSimples == null) {
                this.competenciasDoSimples = this.encontraCompetenciasOpcaoSimples(inss.getPeriodosComOpcaoSimples());
            }
            if (this.competenciasDoSimples.contains(competencia)) {
                ocorrenciaDevido.setAliquotaEmpresa(null);
                ocorrenciaDevido.setAliquotaSAT(null);
                ocorrenciaDevido.setAliquotaTerceiros(null);
                ocorrenciaDevido.setValorTetoEmpresa(null);
            } else {
                switch (inss.getTipoAliquotaEmpregador()) {
                    case FIXA: {
                        if (Utils.naoNulo(inss.getAliquotaEmpresaFixa())) {
                            ocorrenciaDevido.setAliquotaEmpresa(inss.getAliquotaEmpresaFixa());
                        } else {
                            ocorrenciaDevido.setAliquotaEmpresa(null);
                        }
                        if (Utils.naoNulo(inss.getAliquotaRATFixa())) {
                            ocorrenciaDevido.setAliquotaSAT(inss.getAliquotaRATFixa());
                        } else {
                            ocorrenciaDevido.setAliquotaSAT(null);
                        }
                        if (Utils.naoNulo(inss.getAliquotaTerceirosFixa())) {
                            ocorrenciaDevido.setAliquotaTerceiros(inss.getAliquotaTerceirosFixa());
                        } else {
                            ocorrenciaDevido.setAliquotaTerceiros(null);
                        }
                        if (Utils.nulo(ocorrenciaDevido.getValorTetoSegurado()) || Utils.nulo(inss.getAliquotaEmpresaFixa())) {
                            ocorrenciaDevido.setValorTetoEmpresa(null);
                            break;
                        }
                        BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(((Periodo)periodo).getInicial()).getDate());
                        if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                            BigDecimal teto = baseTeto.getBaseTeto().multiply(inss.getAliquotaEmpresaFixa(), Utils.CONTEXTO_MATEMATICO);
                            teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                            ocorrenciaDevido.setValorTetoEmpresa(teto);
                            break;
                        }
                        ocorrenciaDevido.setValorTetoEmpresa(null);
                        break;
                    }
                    case POR_PERIODO: {
                        BigDecimal aliquotaEmpresaPorPeriodo = null;
                        boolean encontrouPeriodo = false;
                        for (AliquotasDoEmpregadorPorPeriodo aliquotasPorPeriodo : inss.getAliquotasPorPeriodos()) {
                            Date competenciaDaOcorrencia = HelperDate.getCurrentCompetence(((Periodo)periodo).getInicial()).getDate();
                            if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataInicioPeriodo()) || !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataTerminoPeriodo())) continue;
                            if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaEmpresa())) {
                                ocorrenciaDevido.setAliquotaEmpresa(aliquotasPorPeriodo.getAliquotaEmpresa());
                            } else {
                                ocorrenciaDevido.setAliquotaEmpresa(null);
                            }
                            if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaRAT())) {
                                ocorrenciaDevido.setAliquotaSAT(aliquotasPorPeriodo.getAliquotaRAT());
                            } else {
                                ocorrenciaDevido.setAliquotaSAT(null);
                            }
                            if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaTerceiros())) {
                                ocorrenciaDevido.setAliquotaTerceiros(aliquotasPorPeriodo.getAliquotaTerceiros());
                            } else {
                                ocorrenciaDevido.setAliquotaTerceiros(null);
                            }
                            encontrouPeriodo = true;
                            break;
                        }
                        if (!encontrouPeriodo) {
                            ocorrenciaDevido.setAliquotaEmpresa(null);
                            ocorrenciaDevido.setAliquotaSAT(null);
                            ocorrenciaDevido.setAliquotaTerceiros(null);
                        }
                        if (Utils.nulo(ocorrenciaDevido.getValorTetoSegurado()) || Utils.nulo(aliquotaEmpresaPorPeriodo)) {
                            ocorrenciaDevido.setValorTetoEmpresa(null);
                            break;
                        }
                        BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(((Periodo)periodo).getInicial()).getDate());
                        if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                            BigDecimal teto = baseTeto.getBaseTeto().multiply(aliquotaEmpresaPorPeriodo, Utils.CONTEXTO_MATEMATICO);
                            teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                            ocorrenciaDevido.setValorTetoEmpresa(teto);
                            break;
                        }
                        ocorrenciaDevido.setValorTetoEmpresa(null);
                        break;
                    }
                    case POR_ATIVIDADE_ECONOMICA: {
                        Date competenciaDaOcorrencia;
                        BigDecimal aliquotaEmpresa = null;
                        Object aliquotaRat = null;
                        BigDecimal aliquotaTerceiros = null;
                        BigDecimal tetoEmpresa = null;
                        AtividadeEconomica atividadeEconomica = AtividadeEconomica.obter(inss.getAtividadeEconomica().getId());
                        if (inss.getApurarEmpresaPorAtividade().booleanValue()) {
                            for (AliquotasEmpresaPorAtividadeEconomica aliquotasEmpresa : atividadeEconomica.getAliquotasEmpresaDaAtividade()) {
                                competenciaDaOcorrencia = HelperDate.getCurrentCompetence(((Periodo)periodo).getInicial()).getDate();
                                if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataInicial()) || !Utils.nulo(aliquotasEmpresa.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataFinal())) continue;
                                if (Utils.naoNulo(aliquotasEmpresa.getAliquota())) {
                                    aliquotaEmpresa = aliquotasEmpresa.getAliquota();
                                }
                                if (!Utils.naoNulo(aliquotasEmpresa.getTeto())) break;
                                tetoEmpresa = aliquotasEmpresa.getTeto();
                                break;
                            }
                        }
                        if (inss.getApurarRATPorAtividade().booleanValue()) {
                            for (AliquotasRatPorAtividadeEconomica aliquotasRat : atividadeEconomica.getAliquotasRatDaAtividade()) {
                                competenciaDaOcorrencia = HelperDate.getCurrentCompetence(((Periodo)periodo).getInicial()).getDate();
                                if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataInicial()) || !Utils.nulo(aliquotasRat.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataFinal())) continue;
                                if (!Utils.naoNulo(aliquotasRat.getAliquota())) break;
                                aliquotaRat = aliquotasRat.getAliquota();
                                break;
                            }
                        }
                        if (inss.getApurarTerceirosPorAtividade().booleanValue()) {
                            for (AliquotasTerceirosPorAtividadeEconomica aliquotasTerceiros : atividadeEconomica.getAliquotasTerceirosDaAtividade()) {
                                competenciaDaOcorrencia = HelperDate.getCurrentCompetence(((Periodo)periodo).getInicial()).getDate();
                                if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataInicial()) || !Utils.nulo(aliquotasTerceiros.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataFinal())) continue;
                                if (!Utils.naoNulo(aliquotasTerceiros.getAliquota())) break;
                                aliquotaTerceiros = aliquotasTerceiros.getAliquota();
                                break;
                            }
                        }
                        if (Utils.naoNulo(aliquotaEmpresa)) {
                            ocorrenciaDevido.setAliquotaEmpresa(aliquotaEmpresa);
                        } else {
                            ocorrenciaDevido.setAliquotaEmpresa(null);
                        }
                        if (Utils.naoNulo(aliquotaRat)) {
                            ocorrenciaDevido.setAliquotaSAT((BigDecimal)aliquotaRat);
                        } else {
                            ocorrenciaDevido.setAliquotaSAT(null);
                        }
                        if (Utils.naoNulo(aliquotaTerceiros)) {
                            ocorrenciaDevido.setAliquotaTerceiros(aliquotaTerceiros);
                        } else {
                            ocorrenciaDevido.setAliquotaTerceiros(null);
                        }
                        if (Utils.nulo(ocorrenciaDevido.getValorTetoSegurado())) {
                            ocorrenciaDevido.setValorTetoEmpresa(null);
                            break;
                        }
                        ocorrenciaDevido.setValorTetoEmpresa(tetoEmpresa);
                    }
                }
            }
            OcorrenciaDeInssSobreSalariosDevidos originalDevido = new OcorrenciaDeInssSobreSalariosDevidos();
            originalDevido.copiar(ocorrenciaDevido);
            ocorrenciaDevido.setOcorrenciaOriginal(originalDevido);
            if (Utils.naoNulo(this.ocorrenciasDevidoAntigas)) {
                chaveOcorrencia.update(competencia, ocorrenciaDevido.getOcorrenciaDecimoTerceiro());
                ocorrenciaDevido.copiarValoresInformadosAnteriormente(this.ocorrenciasDevidoAntigas.search(chaveOcorrencia));
            }
            this.ocorrenciasDevido.add(ocorrenciaDevido);
        }
        if (inss.getApurarInssSobreSalariosPagos().booleanValue()) {
            List<Periodo> periodosSalariosPagos = HelperDate.breakInMonths(inss.getInssSobreSalariosPagos().getDataInicioPeriodo(), inss.getInssSobreSalariosPagos().getDataTerminoPeriodo());
            for (Periodo periodo : periodosSalariosPagos) {
                competencia.update(periodo.getInicial());
                OcorrenciaDeInssSobreSalariosPagos ocorrenciaPago = new OcorrenciaDeInssSobreSalariosPagos();
                ocorrenciaPago.setInssSobreSalariosPagos(inss.getInssSobreSalariosPagos());
                ocorrenciaPago.setDataInicioPeriodo(periodo.getInicial());
                ocorrenciaPago.setDataTerminoPeriodo(periodo.getFinal());
                ocorrenciaPago.setDataOcorrenciaInss(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                BigDecimal baseHistorico = BigDecimal.ZERO;
                Object baseRecolhido = BigDecimal.ZERO;
                for (OptimizerListSearch ocorrenciasDoHistoricoSalarialOptimizeSearch : historicosSalariais) {
                    Iterator ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(competencia);
                    while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                        OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial = (OcorrenciaDoHistoricoSalarial)ocorrenciasDoHistoricoSalarial.next();
                        if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                        BigDecimal valorOcorrenciaDoHistorico = BigDecimal.ZERO;
                        if (ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getAplicarProporcionalidadeINSS().booleanValue()) {
                            int diasParaExcluir = 0;
                            diasParaExcluir += calculo.obterFaltasNaoJustificadas(periodo);
                            CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar(periodo, ocorrenciaDoHistoricoSalarial.getValor(), diasParaExcluir += calculo.obterDiasFerias(periodo));
                            calculoDoProporcionalizar.executar();
                            valorOcorrenciaDoHistorico = calculoDoProporcionalizar.getResultado();
                        } else {
                            valorOcorrenciaDoHistorico = ocorrenciaDoHistoricoSalarial.getValor();
                        }
                        baseHistorico = baseHistorico.add(valorOcorrenciaDoHistorico, Utils.CONTEXTO_MATEMATICO);
                        if (!ocorrenciaDoHistoricoSalarial.getRecolhidoINSS().booleanValue()) continue;
                        baseRecolhido = ((BigDecimal)baseRecolhido).add(valorOcorrenciaDoHistorico, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                ocorrenciaPago.setTipoValorDaBase(TipoValorEnum.CALCULADO);
                ocorrenciaPago.setValorBase(baseHistorico);
                ocorrenciaPago.setValorBaseRecolhido((BigDecimal)baseRecolhido);
                switch (inss.getTipoAliquotaSegurado()) {
                    case FIXA: {
                        Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                        ocorrenciaPago.setAliquotaSegurado(inss.getAliquotaSeguradoFixa());
                        ocorrenciaPago.setAliquotaRecolhidoSegurado(inss.getAliquotaSeguradoFixa());
                        if (inss.getLimitarTeto().booleanValue()) {
                            if (this.listaAliquotasSeguradoEmpregado == null) {
                                this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                            }
                            if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(competencia)) != null && tabelaSeguradoEmpregado.hasNext()) {
                                ocorrenciaPago.setValorTetoSegurado(tabelaSeguradoEmpregado.next().getValorTetoMaximo());
                                break;
                            }
                            ocorrenciaPago.setValorTetoSegurado(null);
                            break;
                        }
                        ocorrenciaPago.setValorTetoSegurado(null);
                        break;
                    }
                    case SEGURADO_EMPREGADO: {
                        Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                        if (this.listaAliquotasSeguradoEmpregado == null) {
                            this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                        }
                        if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(competencia)) != null && tabelaSeguradoEmpregado.hasNext()) {
                            TabelaPrevidenciariaSeguradoEmpregado tpse = tabelaSeguradoEmpregado.next();
                            ocorrenciaPago.setAliquotaSegurado(tpse.obterAliquotaParaValor(baseHistorico));
                            ocorrenciaPago.setValorTetoSegurado(tpse.getValorTetoMaximo());
                            ocorrenciaPago.setAliquotaRecolhidoSegurado(tpse.obterAliquotaParaValor((BigDecimal)baseRecolhido));
                            break;
                        }
                        ocorrenciaPago.setAliquotaSegurado(null);
                        ocorrenciaPago.setValorTetoSegurado(null);
                        ocorrenciaPago.setAliquotaRecolhidoSegurado(null);
                        break;
                    }
                    case EMPREGADO_DOMESTICO: {
                        Iterator<TabelaPrevidenciariaEmpregadoDomestico> tabelaEmpregadoDomestico;
                        if (this.listaAliquotasEmpregadoDomestico == null) {
                            this.listaAliquotasEmpregadoDomestico = this.populaListaAliquotasEmpregadoDomestico(inss);
                        }
                        if ((tabelaEmpregadoDomestico = this.listaAliquotasEmpregadoDomestico.search(competencia)) != null && tabelaEmpregadoDomestico.hasNext()) {
                            TabelaPrevidenciariaEmpregadoDomestico tped = tabelaEmpregadoDomestico.next();
                            ocorrenciaPago.setAliquotaSegurado(tped.obterAliquotaParaValor(baseHistorico));
                            ocorrenciaPago.setValorTetoSegurado(tped.getValorTetoMaximo());
                            ocorrenciaPago.setAliquotaRecolhidoSegurado(tped.obterAliquotaParaValor((BigDecimal)baseRecolhido));
                            break;
                        }
                        ocorrenciaPago.setAliquotaSegurado(null);
                        ocorrenciaPago.setValorTetoSegurado(null);
                        ocorrenciaPago.setAliquotaRecolhidoSegurado(null);
                    }
                }
                BigDecimal recolhidoSegurado = ocorrenciaPago.getValorBaseRecolhido();
                recolhidoSegurado = Utils.naoNulos(recolhidoSegurado, ocorrenciaPago.getAliquotaRecolhidoSegurado()) ? recolhidoSegurado.multiply(ocorrenciaPago.getAliquotaRecolhidoSegurado().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                if (Utils.naoNulos(recolhidoSegurado, ocorrenciaPago.getValorTetoSegurado()) && recolhidoSegurado.compareTo(ocorrenciaPago.getValorTetoSegurado()) > 0) {
                    recolhidoSegurado = ocorrenciaPago.getValorTetoSegurado();
                }
                ocorrenciaPago.setTipoValorDoRecolhidoSegurado(TipoValorEnum.CALCULADO);
                ocorrenciaPago.setValorRecolhidoSegurado(recolhidoSegurado);
                if (this.competenciasDoSimples == null) {
                    this.competenciasDoSimples = this.encontraCompetenciasOpcaoSimples(inss.getPeriodosComOpcaoSimples());
                }
                if (this.competenciasDoSimples.contains(competencia)) {
                    ocorrenciaPago.setAliquotaEmpresa(null);
                    ocorrenciaPago.setAliquotaSAT(null);
                    ocorrenciaPago.setAliquotaTerceiros(null);
                    ocorrenciaPago.setValorTetoEmpresa(null);
                } else {
                    switch (inss.getTipoAliquotaEmpregador()) {
                        case FIXA: {
                            if (Utils.naoNulo(inss.getAliquotaEmpresaFixa())) {
                                ocorrenciaPago.setAliquotaEmpresa(inss.getAliquotaEmpresaFixa());
                            } else {
                                ocorrenciaPago.setAliquotaEmpresa(null);
                            }
                            if (Utils.naoNulo(inss.getAliquotaRATFixa())) {
                                ocorrenciaPago.setAliquotaSAT(inss.getAliquotaRATFixa());
                            } else {
                                ocorrenciaPago.setAliquotaSAT(null);
                            }
                            if (Utils.naoNulo(inss.getAliquotaTerceirosFixa())) {
                                ocorrenciaPago.setAliquotaTerceiros(inss.getAliquotaTerceirosFixa());
                            } else {
                                ocorrenciaPago.setAliquotaTerceiros(null);
                            }
                            if (Utils.nulo(ocorrenciaPago.getValorTetoSegurado()) || Utils.nulo(inss.getAliquotaEmpresaFixa())) {
                                ocorrenciaPago.setValorTetoEmpresa(null);
                                break;
                            }
                            BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                            if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                                BigDecimal teto = baseTeto.getBaseTeto().multiply(inss.getAliquotaEmpresaFixa(), Utils.CONTEXTO_MATEMATICO);
                                teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                                ocorrenciaPago.setValorTetoEmpresa(teto);
                                break;
                            }
                            ocorrenciaPago.setValorTetoEmpresa(null);
                            break;
                        }
                        case POR_PERIODO: {
                            BigDecimal aliquotaEmpresaPorPeriodo = null;
                            boolean encontrouPeriodo = false;
                            for (AliquotasDoEmpregadorPorPeriodo aliquotasPorPeriodo : inss.getAliquotasPorPeriodos()) {
                                Date competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataInicioPeriodo()) || !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataTerminoPeriodo())) continue;
                                if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaEmpresa())) {
                                    ocorrenciaPago.setAliquotaEmpresa(aliquotasPorPeriodo.getAliquotaEmpresa());
                                } else {
                                    ocorrenciaPago.setAliquotaEmpresa(null);
                                }
                                if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaRAT())) {
                                    ocorrenciaPago.setAliquotaSAT(aliquotasPorPeriodo.getAliquotaRAT());
                                } else {
                                    ocorrenciaPago.setAliquotaSAT(null);
                                }
                                if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaTerceiros())) {
                                    ocorrenciaPago.setAliquotaTerceiros(aliquotasPorPeriodo.getAliquotaTerceiros());
                                } else {
                                    ocorrenciaPago.setAliquotaTerceiros(null);
                                }
                                encontrouPeriodo = true;
                                break;
                            }
                            if (!encontrouPeriodo) {
                                ocorrenciaPago.setAliquotaEmpresa(null);
                                ocorrenciaPago.setAliquotaSAT(null);
                                ocorrenciaPago.setAliquotaTerceiros(null);
                            }
                            if (Utils.nulo(ocorrenciaPago.getValorTetoSegurado()) || Utils.nulo(aliquotaEmpresaPorPeriodo)) {
                                ocorrenciaPago.setValorTetoEmpresa(null);
                                break;
                            }
                            BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                            if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                                BigDecimal teto = baseTeto.getBaseTeto().multiply(aliquotaEmpresaPorPeriodo, Utils.CONTEXTO_MATEMATICO);
                                teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                                ocorrenciaPago.setValorTetoEmpresa(teto);
                                break;
                            }
                            ocorrenciaPago.setValorTetoEmpresa(null);
                            break;
                        }
                        case POR_ATIVIDADE_ECONOMICA: {
                            Date competenciaDaOcorrencia;
                            BigDecimal aliquotaEmpresa = null;
                            BigDecimal aliquotaRat = null;
                            BigDecimal aliquotaTerceiros = null;
                            BigDecimal tetoEmpresa = null;
                            AtividadeEconomica atividadeEconomica = AtividadeEconomica.obter(inss.getAtividadeEconomica().getId());
                            if (inss.getApurarEmpresaPorAtividade().booleanValue()) {
                                for (AliquotasEmpresaPorAtividadeEconomica aliquotasEmpresa : atividadeEconomica.getAliquotasEmpresaDaAtividade()) {
                                    competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                    if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataInicial()) || !Utils.nulo(aliquotasEmpresa.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataFinal())) continue;
                                    if (Utils.naoNulo(aliquotasEmpresa.getAliquota())) {
                                        aliquotaEmpresa = aliquotasEmpresa.getAliquota();
                                    }
                                    if (!Utils.naoNulo(aliquotasEmpresa.getTeto())) break;
                                    tetoEmpresa = aliquotasEmpresa.getTeto();
                                    break;
                                }
                            }
                            if (inss.getApurarRATPorAtividade().booleanValue()) {
                                for (AliquotasRatPorAtividadeEconomica aliquotasRat : atividadeEconomica.getAliquotasRatDaAtividade()) {
                                    competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                    if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataInicial()) || !Utils.nulo(aliquotasRat.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataFinal())) continue;
                                    if (!Utils.naoNulo(aliquotasRat.getAliquota())) break;
                                    aliquotaRat = aliquotasRat.getAliquota();
                                    break;
                                }
                            }
                            if (inss.getApurarTerceirosPorAtividade().booleanValue()) {
                                for (AliquotasTerceirosPorAtividadeEconomica aliquotasTerceiros : atividadeEconomica.getAliquotasTerceirosDaAtividade()) {
                                    competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                                    if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataInicial()) || !Utils.nulo(aliquotasTerceiros.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataFinal())) continue;
                                    if (!Utils.naoNulo(aliquotasTerceiros.getAliquota())) break;
                                    aliquotaTerceiros = aliquotasTerceiros.getAliquota();
                                    break;
                                }
                            }
                            if (Utils.naoNulo(aliquotaEmpresa)) {
                                ocorrenciaPago.setAliquotaEmpresa(aliquotaEmpresa);
                            } else {
                                ocorrenciaPago.setAliquotaEmpresa(null);
                            }
                            if (Utils.naoNulo(aliquotaRat)) {
                                ocorrenciaPago.setAliquotaSAT(aliquotaRat);
                            } else {
                                ocorrenciaPago.setAliquotaSAT(null);
                            }
                            if (Utils.naoNulo(aliquotaTerceiros)) {
                                ocorrenciaPago.setAliquotaTerceiros(aliquotaTerceiros);
                            } else {
                                ocorrenciaPago.setAliquotaTerceiros(null);
                            }
                            if (Utils.nulo(ocorrenciaPago.getValorTetoSegurado())) {
                                ocorrenciaPago.setValorTetoEmpresa(null);
                                break;
                            }
                            ocorrenciaPago.setValorTetoEmpresa(tetoEmpresa);
                        }
                    }
                }
                BigDecimal recolhidoEmpresa = ocorrenciaPago.getValorBaseRecolhido();
                recolhidoEmpresa = Utils.naoNulos(recolhidoEmpresa, ocorrenciaPago.getAliquotaEmpresa()) ? recolhidoEmpresa.multiply(ocorrenciaPago.getAliquotaEmpresa().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                if (Utils.naoNulos(recolhidoEmpresa, ocorrenciaPago.getValorTetoEmpresa()) && recolhidoEmpresa.compareTo(ocorrenciaPago.getValorTetoEmpresa()) > 0) {
                    recolhidoEmpresa = ocorrenciaPago.getValorTetoEmpresa();
                }
                ocorrenciaPago.setTipoValorDoRecolhidoEmpresa(TipoValorEnum.CALCULADO);
                ocorrenciaPago.setValorRecolhidoEmpresa(recolhidoEmpresa);
                BigDecimal recolhidoSAT = ocorrenciaPago.getValorBaseRecolhido();
                recolhidoSAT = Utils.naoNulos(recolhidoSAT, ocorrenciaPago.getAliquotaSAT()) ? recolhidoSAT.multiply(ocorrenciaPago.getAliquotaSAT().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                ocorrenciaPago.setTipoValorDoRecolhidoSAT(TipoValorEnum.CALCULADO);
                ocorrenciaPago.setValorRecolhidoSAT(recolhidoSAT);
                BigDecimal recolhidoTerceiros = ocorrenciaPago.getValorBaseRecolhido();
                recolhidoTerceiros = Utils.naoNulos(recolhidoTerceiros, ocorrenciaPago.getAliquotaTerceiros()) ? recolhidoTerceiros.multiply(ocorrenciaPago.getAliquotaTerceiros().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                ocorrenciaPago.setTipoValorDoRecolhidoTerceiros(TipoValorEnum.CALCULADO);
                ocorrenciaPago.setValorRecolhidoTerceiros(recolhidoTerceiros);
                OcorrenciaDeInssSobreSalariosPagos originalPago = new OcorrenciaDeInssSobreSalariosPagos();
                originalPago.copiar(ocorrenciaPago);
                ocorrenciaPago.setOcorrenciaOriginal(originalPago);
                if (Utils.naoNulo(this.ocorrenciasPagoAntigas)) {
                    chaveOcorrencia.update(competencia, ocorrenciaPago.getOcorrenciaDecimoTerceiro());
                    ocorrenciaPago.copiarValoresInformadosAnteriormente(this.ocorrenciasPagoAntigas.search(chaveOcorrencia));
                }
                this.ocorrenciasPago.add(ocorrenciaPago);
            }
        }
        HelperDate dataDemissao = HelperDate.getInstance(calculo.getDataDemissao());
        HelperDate dataDeFimDoInssSalariosDevidos = HelperDate.getInstance(inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo());
        List<Periodo> periodosDevidos = HelperDate.breakInMonths(inss.getInssSobreSalariosDevidos().getDataInicioPeriodo(), inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo(), 11);
        for (Periodo periodo : periodosDevidos) {
            if (Utils.naoNulo(dataDemissao) && dataDeFimDoInssSalariosDevidos.compareDate(dataDemissao.getDate()) && periodo.obterDataFinalHelper().compareMonthAndYear(dataDemissao.getDate())) {
                periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(dataDemissao.getDay()).getDate());
                periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(dataDemissao.getDay()).getDate());
                this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                continue;
            }
            if (periodo.obterDataInicialHelper().getDay() == 1) {
                if (periodo.obterDataFinalHelper().getDay() == 31) {
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                    this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                    continue;
                }
                if (periodo.obterDataFinalHelper().getDay() < 20) continue;
                periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                continue;
            }
            if (periodo.obterDataFinalHelper().getDay() == 31) {
                if (periodo.obterDataInicialHelper().getDay() > 20) continue;
                periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                continue;
            }
            if (periodo.obterDataInicialHelper().getDay() > 20 || periodo.obterDataFinalHelper().getDay() < 20) continue;
            periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
            periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
            this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
        }
        if (Utils.naoNulo(dataDemissao) && dataDemissao.getMonth() != 11 && dataDeFimDoInssSalariosDevidos.greaterThenOrEquals(dataDemissao.getDate())) {
            Periodo periodoOcorrencia = new Periodo(dataDemissao.getDate(), dataDemissao.getDate());
            this.criaOcorrenciaDevidoDecimoTerceiro(inss, periodoOcorrencia, calculo, historicosSalariais);
        }
        if (inss.getApurarInssSobreSalariosPagos().booleanValue()) {
            HelperDate dataDeFimDoInssSalariosPagos = HelperDate.getInstance(inss.getInssSobreSalariosPagos().getDataTerminoPeriodo());
            List<Periodo> periodosPagos = HelperDate.breakInMonths(inss.getInssSobreSalariosPagos().getDataInicioPeriodo(), inss.getInssSobreSalariosPagos().getDataTerminoPeriodo(), 11);
            for (Periodo periodo : periodosPagos) {
                if (Utils.naoNulo(dataDemissao) && dataDeFimDoInssSalariosPagos.compareDate(dataDemissao.getDate()) && periodo.obterDataFinalHelper().compareMonthAndYear(dataDemissao.getDate())) {
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(dataDemissao.getDay()).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(dataDemissao.getDay()).getDate());
                    this.criaOcorrenciaPagoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                    continue;
                }
                if (periodo.obterDataInicialHelper().getDay() == 1) {
                    if (periodo.obterDataFinalHelper().getDay() == 31) {
                        periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                        periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                        this.criaOcorrenciaPagoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                        continue;
                    }
                    if (periodo.obterDataFinalHelper().getDay() < 20) continue;
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                    this.criaOcorrenciaPagoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                    continue;
                }
                if (periodo.obterDataFinalHelper().getDay() == 31) {
                    if (periodo.obterDataInicialHelper().getDay() > 20) continue;
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                    this.criaOcorrenciaPagoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
                    continue;
                }
                if (periodo.obterDataInicialHelper().getDay() > 20 || periodo.obterDataFinalHelper().getDay() < 20) continue;
                periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                this.criaOcorrenciaPagoDecimoTerceiro(inss, periodo, calculo, historicosSalariais);
            }
            if (Utils.naoNulo(dataDemissao) && dataDemissao.getMonth() != 11 && dataDeFimDoInssSalariosPagos.greaterThenOrEquals(dataDemissao.getDate())) {
                Periodo periodoOcorrencia = new Periodo(dataDemissao.getDate(), dataDemissao.getDate());
                this.criaOcorrenciaPagoDecimoTerceiro(inss, periodoOcorrencia, calculo, historicosSalariais);
            }
        }
        if (Utils.naoNulo(this.ocorrenciasDevido)) {
            Collections.sort(this.ocorrenciasDevido);
            for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : this.ocorrenciasDevido) {
                inss.getInssSobreSalariosDevidos().getOcorrencias().add(ocorrencia);
                this.getSession().persist((Object)ocorrencia);
            }
        }
        if (Utils.naoNulo(this.ocorrenciasPago)) {
            Collections.sort(this.ocorrenciasPago);
            for (OcorrenciaDeInssSobreSalariosPagos ocorrenciaPago : this.ocorrenciasPago) {
                inss.getInssSobreSalariosPagos().getOcorrencias().add(ocorrenciaPago);
                this.getSession().persist((Object)ocorrenciaPago);
            }
        }
        this.getSession().merge((Object)inss);
        if (flush) {
            this.flush();
        }
    }

    public TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch populaListaAliquotasSeguradoEmpregado(Inss inss) {
        Date inicio = inss.getInssSobreSalariosDevidos().getDataInicioPeriodo();
        if (HelperDate.dateBefore(inss.getInssSobreSalariosPagos().getDataInicioPeriodo(), inss.getInssSobreSalariosDevidos().getDataInicioPeriodo())) {
            inicio = inss.getInssSobreSalariosPagos().getDataInicioPeriodo();
        }
        Date fim = inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo();
        if (HelperDate.dateAfter(inss.getInssSobreSalariosPagos().getDataTerminoPeriodo(), inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo())) {
            fim = inss.getInssSobreSalariosPagos().getDataTerminoPeriodo();
        }
        return TabelaPrevidenciariaSeguradoEmpregado.obterListaOtimizadaDoPeriodo(inicio, fim);
    }

    public TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch populaListaAliquotasEmpregadoDomestico(Inss inss) {
        Date inicio = inss.getInssSobreSalariosDevidos().getDataInicioPeriodo();
        if (HelperDate.dateBefore(inss.getInssSobreSalariosPagos().getDataInicioPeriodo(), inss.getInssSobreSalariosDevidos().getDataInicioPeriodo())) {
            inicio = inss.getInssSobreSalariosPagos().getDataInicioPeriodo();
        }
        Date fim = inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo();
        if (HelperDate.dateAfter(inss.getInssSobreSalariosPagos().getDataTerminoPeriodo(), inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo())) {
            fim = inss.getInssSobreSalariosPagos().getDataTerminoPeriodo();
        }
        return TabelaPrevidenciariaEmpregadoDomestico.obterListaOtimizadaDoPeriodo(inicio, fim);
    }

    private void criaOcorrenciaDevidoDecimoTerceiro(Inss inss, Periodo periodo, Calculo calculo, List<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>> historicosSalariais) {
        if (Utils.naoNulo(calculo.getDataDemissao()) && HelperDate.dateAfter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate(), HelperDate.getCurrentCompetence(calculo.getDataDemissao()).getDate())) {
            return;
        }
        OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDevidoDecimoTerceiro = new OcorrenciaDeInssSobreSalariosDevidos();
        ocorrenciaDevidoDecimoTerceiro.setInssSobreSalariosDevidos(inss.getInssSobreSalariosDevidos());
        ocorrenciaDevidoDecimoTerceiro.setDataInicioPeriodo(periodo.getInicial());
        ocorrenciaDevidoDecimoTerceiro.setDataTerminoPeriodo(periodo.getFinal());
        ocorrenciaDevidoDecimoTerceiro.setDataOcorrenciaInss(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
        ocorrenciaDevidoDecimoTerceiro.setOcorrenciaDecimoTerceiro(true);
        BigDecimal baseHistorico = BigDecimal.ZERO;
        for (OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarialOptimizeSearch : historicosSalariais) {
            Iterator<OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(Competencia.getInstance(periodo.getInicial()));
            while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial = ocorrenciasDoHistoricoSalarial.next();
                if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                baseHistorico = baseHistorico.add(ocorrenciaDoHistoricoSalarial.getValor(), Utils.CONTEXTO_MATEMATICO);
                if (!RegimeDoContratoEnum.INTERMITENTE.equals((Object)calculo.getRegimeDoContrato())) continue;
                baseHistorico = this.atualizarBaseHistoricoParaRegimeIntermitente(periodo, baseHistorico, ocorrenciaDoHistoricoSalarial);
            }
        }
        if (!RegimeDoContratoEnum.INTERMITENTE.equals((Object)calculo.getRegimeDoContrato())) {
            int avos = RepositorioDeInss.calculaAvosInssDecimoTerceiro(calculo, periodo);
            baseHistorico = baseHistorico.multiply(new BigDecimal(avos), Utils.CONTEXTO_MATEMATICO);
        }
        baseHistorico = baseHistorico.divide(new BigDecimal(12), Utils.CONTEXTO_MATEMATICO);
        ocorrenciaDevidoDecimoTerceiro.setTipoValorDaBase(TipoValorEnum.CALCULADO);
        ocorrenciaDevidoDecimoTerceiro.setValorBase(baseHistorico);
        if (inss.getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue()) {
            switch (inss.getTipoAliquotaSegurado()) {
                case FIXA: {
                    Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                    ocorrenciaDevidoDecimoTerceiro.setAliquotaSegurado(inss.getAliquotaSeguradoFixa());
                    if (inss.getLimitarTeto().booleanValue()) {
                        if (this.listaAliquotasSeguradoEmpregado == null) {
                            this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                        }
                        if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(Competencia.getInstance(periodo.getInicial()))) != null && tabelaSeguradoEmpregado.hasNext()) {
                            ocorrenciaDevidoDecimoTerceiro.setValorTetoSegurado(tabelaSeguradoEmpregado.next().getValorTetoMaximo());
                            break;
                        }
                        ocorrenciaDevidoDecimoTerceiro.setValorTetoSegurado(null);
                        break;
                    }
                    ocorrenciaDevidoDecimoTerceiro.setValorTetoSegurado(null);
                    break;
                }
                case SEGURADO_EMPREGADO: {
                    Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                    if (this.listaAliquotasSeguradoEmpregado == null) {
                        this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                    }
                    if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(Competencia.getInstance(periodo.getInicial()))) != null && tabelaSeguradoEmpregado.hasNext()) {
                        TabelaPrevidenciariaSeguradoEmpregado tpse = tabelaSeguradoEmpregado.next();
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaSegurado(tpse.obterAliquotaParaValor(baseHistorico));
                        ocorrenciaDevidoDecimoTerceiro.setValorTetoSegurado(tpse.getValorTetoMaximo());
                        break;
                    }
                    ocorrenciaDevidoDecimoTerceiro.setAliquotaSegurado(null);
                    ocorrenciaDevidoDecimoTerceiro.setValorTetoSegurado(null);
                    break;
                }
                case EMPREGADO_DOMESTICO: {
                    Iterator<TabelaPrevidenciariaEmpregadoDomestico> tabelaEmpregadoDomestico;
                    if (this.listaAliquotasEmpregadoDomestico == null) {
                        this.listaAliquotasEmpregadoDomestico = this.populaListaAliquotasEmpregadoDomestico(inss);
                    }
                    if ((tabelaEmpregadoDomestico = this.listaAliquotasEmpregadoDomestico.search(Competencia.getInstance(periodo.getInicial()))) != null && tabelaEmpregadoDomestico.hasNext()) {
                        TabelaPrevidenciariaEmpregadoDomestico tped = tabelaEmpregadoDomestico.next();
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaSegurado(tped.obterAliquotaParaValor(baseHistorico));
                        ocorrenciaDevidoDecimoTerceiro.setValorTetoSegurado(tped.getValorTetoMaximo());
                        break;
                    }
                    ocorrenciaDevidoDecimoTerceiro.setAliquotaSegurado(null);
                    ocorrenciaDevidoDecimoTerceiro.setValorTetoSegurado(null);
                }
            }
        } else {
            ocorrenciaDevidoDecimoTerceiro.setAliquotaSegurado(null);
            ocorrenciaDevidoDecimoTerceiro.setValorTetoSegurado(null);
        }
        if (this.competenciasDoSimples == null) {
            this.competenciasDoSimples = this.encontraCompetenciasOpcaoSimples(inss.getPeriodosComOpcaoSimples());
        }
        if (this.competenciasDoSimples.contains(new Competencia(periodo.getInicial()))) {
            ocorrenciaDevidoDecimoTerceiro.setAliquotaEmpresa(null);
            ocorrenciaDevidoDecimoTerceiro.setAliquotaSAT(null);
            ocorrenciaDevidoDecimoTerceiro.setAliquotaTerceiros(null);
            ocorrenciaDevidoDecimoTerceiro.setValorTetoEmpresa(null);
        } else {
            switch (inss.getTipoAliquotaEmpregador()) {
                case FIXA: {
                    if (Utils.naoNulo(inss.getAliquotaEmpresaFixa())) {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaEmpresa(inss.getAliquotaEmpresaFixa());
                    } else {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaEmpresa(null);
                    }
                    if (Utils.naoNulo(inss.getAliquotaRATFixa())) {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaSAT(inss.getAliquotaRATFixa());
                    } else {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaSAT(null);
                    }
                    if (Utils.naoNulo(inss.getAliquotaTerceirosFixa())) {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaTerceiros(inss.getAliquotaTerceirosFixa());
                    } else {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaTerceiros(null);
                    }
                    if (Utils.nulo(ocorrenciaDevidoDecimoTerceiro.getValorTetoSegurado()) || Utils.nulo(inss.getAliquotaEmpresaFixa())) {
                        ocorrenciaDevidoDecimoTerceiro.setValorTetoEmpresa(null);
                        break;
                    }
                    BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                    if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                        BigDecimal teto = baseTeto.getBaseTeto().multiply(inss.getAliquotaEmpresaFixa(), Utils.CONTEXTO_MATEMATICO);
                        teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                        ocorrenciaDevidoDecimoTerceiro.setValorTetoEmpresa(teto);
                        break;
                    }
                    ocorrenciaDevidoDecimoTerceiro.setValorTetoEmpresa(null);
                    break;
                }
                case POR_PERIODO: {
                    BigDecimal aliquotaEmpresaPorPeriodo = null;
                    boolean encontrouPeriodo = false;
                    for (AliquotasDoEmpregadorPorPeriodo aliquotasPorPeriodo : inss.getAliquotasPorPeriodos()) {
                        Date competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                        if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataInicioPeriodo()) || !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataTerminoPeriodo())) continue;
                        if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaEmpresa())) {
                            ocorrenciaDevidoDecimoTerceiro.setAliquotaEmpresa(aliquotasPorPeriodo.getAliquotaEmpresa());
                        } else {
                            ocorrenciaDevidoDecimoTerceiro.setAliquotaEmpresa(null);
                        }
                        if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaRAT())) {
                            ocorrenciaDevidoDecimoTerceiro.setAliquotaSAT(aliquotasPorPeriodo.getAliquotaRAT());
                        } else {
                            ocorrenciaDevidoDecimoTerceiro.setAliquotaSAT(null);
                        }
                        if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaTerceiros())) {
                            ocorrenciaDevidoDecimoTerceiro.setAliquotaTerceiros(aliquotasPorPeriodo.getAliquotaTerceiros());
                        } else {
                            ocorrenciaDevidoDecimoTerceiro.setAliquotaTerceiros(null);
                        }
                        encontrouPeriodo = true;
                        break;
                    }
                    if (!encontrouPeriodo) {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaEmpresa(null);
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaSAT(null);
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaTerceiros(null);
                    }
                    if (Utils.nulo(ocorrenciaDevidoDecimoTerceiro.getValorTetoSegurado()) || Utils.nulo(aliquotaEmpresaPorPeriodo)) {
                        ocorrenciaDevidoDecimoTerceiro.setValorTetoEmpresa(null);
                        break;
                    }
                    BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                    if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                        BigDecimal teto = baseTeto.getBaseTeto().multiply(aliquotaEmpresaPorPeriodo, Utils.CONTEXTO_MATEMATICO);
                        teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                        ocorrenciaDevidoDecimoTerceiro.setValorTetoEmpresa(teto);
                        break;
                    }
                    ocorrenciaDevidoDecimoTerceiro.setValorTetoEmpresa(null);
                    break;
                }
                case POR_ATIVIDADE_ECONOMICA: {
                    Date competenciaDaOcorrencia;
                    BigDecimal aliquotaEmpresa = null;
                    BigDecimal aliquotaRat = null;
                    BigDecimal aliquotaTerceiros = null;
                    BigDecimal tetoEmpresa = null;
                    AtividadeEconomica atividadeEconomica = AtividadeEconomica.obter(inss.getAtividadeEconomica().getId());
                    if (inss.getApurarEmpresaPorAtividade().booleanValue()) {
                        for (AliquotasEmpresaPorAtividadeEconomica aliquotasEmpresa : atividadeEconomica.getAliquotasEmpresaDaAtividade()) {
                            competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                            if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataInicial()) || !Utils.nulo(aliquotasEmpresa.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataFinal())) continue;
                            if (Utils.naoNulo(aliquotasEmpresa.getAliquota())) {
                                aliquotaEmpresa = aliquotasEmpresa.getAliquota();
                            }
                            if (!Utils.naoNulo(aliquotasEmpresa.getTeto())) break;
                            tetoEmpresa = aliquotasEmpresa.getTeto();
                            break;
                        }
                    }
                    if (inss.getApurarRATPorAtividade().booleanValue()) {
                        for (AliquotasRatPorAtividadeEconomica aliquotasRat : atividadeEconomica.getAliquotasRatDaAtividade()) {
                            competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                            if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataInicial()) || !Utils.nulo(aliquotasRat.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataFinal())) continue;
                            if (!Utils.naoNulo(aliquotasRat.getAliquota())) break;
                            aliquotaRat = aliquotasRat.getAliquota();
                            break;
                        }
                    }
                    if (inss.getApurarTerceirosPorAtividade().booleanValue()) {
                        for (AliquotasTerceirosPorAtividadeEconomica aliquotasTerceiros : atividadeEconomica.getAliquotasTerceirosDaAtividade()) {
                            competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                            if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataInicial()) || !Utils.nulo(aliquotasTerceiros.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataFinal())) continue;
                            if (!Utils.naoNulo(aliquotasTerceiros.getAliquota())) break;
                            aliquotaTerceiros = aliquotasTerceiros.getAliquota();
                            break;
                        }
                    }
                    if (Utils.naoNulo(aliquotaEmpresa)) {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaEmpresa(aliquotaEmpresa);
                    } else {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaEmpresa(null);
                    }
                    if (Utils.naoNulo(aliquotaRat)) {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaSAT(aliquotaRat);
                    } else {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaSAT(null);
                    }
                    if (Utils.naoNulo(aliquotaTerceiros)) {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaTerceiros(aliquotaTerceiros);
                    } else {
                        ocorrenciaDevidoDecimoTerceiro.setAliquotaTerceiros(null);
                    }
                    if (Utils.nulo(ocorrenciaDevidoDecimoTerceiro.getValorTetoSegurado())) {
                        ocorrenciaDevidoDecimoTerceiro.setValorTetoEmpresa(null);
                        break;
                    }
                    ocorrenciaDevidoDecimoTerceiro.setValorTetoEmpresa(tetoEmpresa);
                }
            }
        }
        OcorrenciaDeInssSobreSalariosDevidos originalDevidoDecimoTerceiro = new OcorrenciaDeInssSobreSalariosDevidos();
        originalDevidoDecimoTerceiro.copiar(ocorrenciaDevidoDecimoTerceiro);
        ocorrenciaDevidoDecimoTerceiro.setOcorrenciaOriginal(originalDevidoDecimoTerceiro);
        if (Utils.naoNulo(this.ocorrenciasDevidoAntigas)) {
            ocorrenciaDevidoDecimoTerceiro.copiarValoresInformadosAnteriormente(this.ocorrenciasDevidoAntigas.search(new OcorrenciaInssUnique(ocorrenciaDevidoDecimoTerceiro)));
        }
        this.ocorrenciasDevido.add(ocorrenciaDevidoDecimoTerceiro);
    }

    private BigDecimal atualizarBaseHistoricoParaRegimeIntermitente(Periodo periodo, BigDecimal baseHistorico, OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial) {
        HelperDate competenciaAuxiliar = HelperDate.getCurrentCompetence(periodo.getInicial());
        competenciaAuxiliar.addDay(-1).setDay(1);
        HelperDate janeiroAnoCompetencia = HelperDate.getCurrentCompetence(periodo.getInicial()).setMonth(0);
        while (HelperDate.dateAfterOrEquals(competenciaAuxiliar.getDate(), janeiroAnoCompetencia.getDate())) {
            Competencia competenciaOcorrencia = new Competencia(competenciaAuxiliar.getDate());
            Iterator<OcorrenciaDoHistoricoSalarial> ocorComp = ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getListaDeOcorrenciasOtimizada().search(competenciaOcorrencia);
            while (Utils.naoNulo(ocorComp) && ocorComp.hasNext()) {
                BigDecimal valor;
                OcorrenciaDoHistoricoSalarial ocorCompInstance = ocorComp.next();
                if (Utils.nulo(ocorCompInstance) || Utils.nulo(valor = ocorCompInstance.getValor())) continue;
                baseHistorico = Utils.somar(baseHistorico, Utils.zerarSeNegativo(valor));
            }
            competenciaAuxiliar.addDay(-1).setDay(1);
        }
        return baseHistorico;
    }

    private void criaOcorrenciaPagoDecimoTerceiro(Inss inss, Periodo periodo, Calculo calculo, List<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>> historicosSalariais) {
        if (Utils.naoNulo(calculo.getDataDemissao()) && HelperDate.dateAfter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate(), HelperDate.getCurrentCompetence(calculo.getDataDemissao()).getDate())) {
            return;
        }
        OcorrenciaDeInssSobreSalariosPagos ocorrenciaPagoDecimoTerceiro = new OcorrenciaDeInssSobreSalariosPagos();
        ocorrenciaPagoDecimoTerceiro.setInssSobreSalariosPagos(inss.getInssSobreSalariosPagos());
        ocorrenciaPagoDecimoTerceiro.setDataInicioPeriodo(periodo.getInicial());
        ocorrenciaPagoDecimoTerceiro.setDataTerminoPeriodo(periodo.getFinal());
        ocorrenciaPagoDecimoTerceiro.setDataOcorrenciaInss(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
        ocorrenciaPagoDecimoTerceiro.setOcorrenciaDecimoTerceiro(true);
        BigDecimal baseHistorico = BigDecimal.ZERO;
        BigDecimal baseRecolhido = BigDecimal.ZERO;
        for (OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarialOptimizeSearch : historicosSalariais) {
            Iterator<OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(Competencia.getInstance(periodo.getInicial()));
            while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial = ocorrenciasDoHistoricoSalarial.next();
                if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                baseHistorico = baseHistorico.add(ocorrenciaDoHistoricoSalarial.getValor(), Utils.CONTEXTO_MATEMATICO);
                if (!ocorrenciaDoHistoricoSalarial.getRecolhidoINSS().booleanValue()) continue;
                baseRecolhido = baseRecolhido.add(ocorrenciaDoHistoricoSalarial.getValor(), Utils.CONTEXTO_MATEMATICO);
            }
        }
        int avos = RepositorioDeInss.calculaAvosInssDecimoTerceiro(calculo, periodo);
        baseHistorico = baseHistorico.multiply(new BigDecimal(avos), Utils.CONTEXTO_MATEMATICO);
        baseHistorico = baseHistorico.divide(new BigDecimal(12), Utils.CONTEXTO_MATEMATICO);
        baseRecolhido = baseRecolhido.multiply(new BigDecimal(avos), Utils.CONTEXTO_MATEMATICO);
        baseRecolhido = baseRecolhido.divide(new BigDecimal(12), Utils.CONTEXTO_MATEMATICO);
        ocorrenciaPagoDecimoTerceiro.setTipoValorDaBase(TipoValorEnum.CALCULADO);
        ocorrenciaPagoDecimoTerceiro.setValorBase(baseHistorico);
        ocorrenciaPagoDecimoTerceiro.setValorBaseRecolhido(baseRecolhido);
        switch (inss.getTipoAliquotaSegurado()) {
            case FIXA: {
                Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                ocorrenciaPagoDecimoTerceiro.setAliquotaSegurado(inss.getAliquotaSeguradoFixa());
                ocorrenciaPagoDecimoTerceiro.setAliquotaRecolhidoSegurado(inss.getAliquotaSeguradoFixa());
                if (inss.getLimitarTeto().booleanValue()) {
                    if (this.listaAliquotasSeguradoEmpregado == null) {
                        this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                    }
                    if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(Competencia.getInstance(periodo.getInicial()))) != null && tabelaSeguradoEmpregado.hasNext()) {
                        ocorrenciaPagoDecimoTerceiro.setValorTetoSegurado(tabelaSeguradoEmpregado.next().getValorTetoMaximo());
                        break;
                    }
                    ocorrenciaPagoDecimoTerceiro.setValorTetoSegurado(null);
                    break;
                }
                ocorrenciaPagoDecimoTerceiro.setValorTetoSegurado(null);
                break;
            }
            case SEGURADO_EMPREGADO: {
                Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado;
                if (this.listaAliquotasSeguradoEmpregado == null) {
                    this.listaAliquotasSeguradoEmpregado = this.populaListaAliquotasSeguradoEmpregado(inss);
                }
                if ((tabelaSeguradoEmpregado = this.listaAliquotasSeguradoEmpregado.search(Competencia.getInstance(periodo.getInicial()))) != null && tabelaSeguradoEmpregado.hasNext()) {
                    TabelaPrevidenciariaSeguradoEmpregado tpse = tabelaSeguradoEmpregado.next();
                    ocorrenciaPagoDecimoTerceiro.setAliquotaSegurado(tpse.obterAliquotaParaValor(baseHistorico));
                    ocorrenciaPagoDecimoTerceiro.setValorTetoSegurado(tpse.getValorTetoMaximo());
                    ocorrenciaPagoDecimoTerceiro.setAliquotaRecolhidoSegurado(tpse.obterAliquotaParaValor(baseRecolhido));
                    break;
                }
                ocorrenciaPagoDecimoTerceiro.setAliquotaSegurado(null);
                ocorrenciaPagoDecimoTerceiro.setValorTetoSegurado(null);
                ocorrenciaPagoDecimoTerceiro.setAliquotaRecolhidoSegurado(null);
                break;
            }
            case EMPREGADO_DOMESTICO: {
                Iterator<TabelaPrevidenciariaEmpregadoDomestico> tabelaEmpregadoDomestico;
                if (this.listaAliquotasEmpregadoDomestico == null) {
                    this.listaAliquotasEmpregadoDomestico = this.populaListaAliquotasEmpregadoDomestico(inss);
                }
                if ((tabelaEmpregadoDomestico = this.listaAliquotasEmpregadoDomestico.search(Competencia.getInstance(periodo.getInicial()))) != null && tabelaEmpregadoDomestico.hasNext()) {
                    TabelaPrevidenciariaEmpregadoDomestico tped = tabelaEmpregadoDomestico.next();
                    ocorrenciaPagoDecimoTerceiro.setAliquotaSegurado(tped.obterAliquotaParaValor(baseHistorico));
                    ocorrenciaPagoDecimoTerceiro.setValorTetoSegurado(tped.getValorTetoMaximo());
                    ocorrenciaPagoDecimoTerceiro.setAliquotaRecolhidoSegurado(tped.obterAliquotaParaValor(baseRecolhido));
                    break;
                }
                ocorrenciaPagoDecimoTerceiro.setAliquotaSegurado(null);
                ocorrenciaPagoDecimoTerceiro.setValorTetoSegurado(null);
                ocorrenciaPagoDecimoTerceiro.setAliquotaRecolhidoSegurado(null);
            }
        }
        BigDecimal recolhidoSegurado = ocorrenciaPagoDecimoTerceiro.getValorBaseRecolhido();
        recolhidoSegurado = Utils.naoNulos(recolhidoSegurado, ocorrenciaPagoDecimoTerceiro.getAliquotaRecolhidoSegurado()) ? recolhidoSegurado.multiply(ocorrenciaPagoDecimoTerceiro.getAliquotaRecolhidoSegurado().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
        if (Utils.naoNulos(recolhidoSegurado, ocorrenciaPagoDecimoTerceiro.getValorTetoSegurado()) && recolhidoSegurado.compareTo(ocorrenciaPagoDecimoTerceiro.getValorTetoSegurado()) > 0) {
            recolhidoSegurado = ocorrenciaPagoDecimoTerceiro.getValorTetoSegurado();
        }
        ocorrenciaPagoDecimoTerceiro.setTipoValorDoRecolhidoSegurado(TipoValorEnum.CALCULADO);
        ocorrenciaPagoDecimoTerceiro.setValorRecolhidoSegurado(recolhidoSegurado);
        if (this.competenciasDoSimples == null) {
            this.competenciasDoSimples = this.encontraCompetenciasOpcaoSimples(inss.getPeriodosComOpcaoSimples());
        }
        if (this.competenciasDoSimples.contains(new Competencia(periodo.getInicial()))) {
            ocorrenciaPagoDecimoTerceiro.setAliquotaEmpresa(null);
            ocorrenciaPagoDecimoTerceiro.setAliquotaSAT(null);
            ocorrenciaPagoDecimoTerceiro.setAliquotaTerceiros(null);
            ocorrenciaPagoDecimoTerceiro.setValorTetoEmpresa(null);
        } else {
            switch (inss.getTipoAliquotaEmpregador()) {
                case FIXA: {
                    if (Utils.naoNulo(inss.getAliquotaEmpresaFixa())) {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaEmpresa(inss.getAliquotaEmpresaFixa());
                    } else {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaEmpresa(null);
                    }
                    if (Utils.naoNulo(inss.getAliquotaRATFixa())) {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaSAT(inss.getAliquotaRATFixa());
                    } else {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaSAT(null);
                    }
                    if (Utils.naoNulo(inss.getAliquotaTerceirosFixa())) {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaTerceiros(inss.getAliquotaTerceirosFixa());
                    } else {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaTerceiros(null);
                    }
                    if (Utils.nulo(ocorrenciaPagoDecimoTerceiro.getValorTetoSegurado()) || Utils.nulo(inss.getAliquotaEmpresaFixa())) {
                        ocorrenciaPagoDecimoTerceiro.setValorTetoEmpresa(null);
                        break;
                    }
                    BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                    if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                        BigDecimal teto = baseTeto.getBaseTeto().multiply(inss.getAliquotaEmpresaFixa(), Utils.CONTEXTO_MATEMATICO);
                        teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                        ocorrenciaPagoDecimoTerceiro.setValorTetoEmpresa(teto);
                        break;
                    }
                    ocorrenciaPagoDecimoTerceiro.setValorTetoEmpresa(null);
                    break;
                }
                case POR_PERIODO: {
                    BigDecimal aliquotaEmpresaPorPeriodo = null;
                    boolean encontrouPeriodo = false;
                    for (AliquotasDoEmpregadorPorPeriodo aliquotasPorPeriodo : inss.getAliquotasPorPeriodos()) {
                        Date competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                        if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataInicioPeriodo()) || !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasPorPeriodo.getDataTerminoPeriodo())) continue;
                        if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaEmpresa())) {
                            ocorrenciaPagoDecimoTerceiro.setAliquotaEmpresa(aliquotasPorPeriodo.getAliquotaEmpresa());
                        } else {
                            ocorrenciaPagoDecimoTerceiro.setAliquotaEmpresa(null);
                        }
                        if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaRAT())) {
                            ocorrenciaPagoDecimoTerceiro.setAliquotaSAT(aliquotasPorPeriodo.getAliquotaRAT());
                        } else {
                            ocorrenciaPagoDecimoTerceiro.setAliquotaSAT(null);
                        }
                        if (Utils.naoNulo(aliquotasPorPeriodo.getAliquotaTerceiros())) {
                            ocorrenciaPagoDecimoTerceiro.setAliquotaTerceiros(aliquotasPorPeriodo.getAliquotaTerceiros());
                        } else {
                            ocorrenciaPagoDecimoTerceiro.setAliquotaTerceiros(null);
                        }
                        encontrouPeriodo = true;
                        break;
                    }
                    if (!encontrouPeriodo) {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaEmpresa(null);
                        ocorrenciaPagoDecimoTerceiro.setAliquotaSAT(null);
                        ocorrenciaPagoDecimoTerceiro.setAliquotaTerceiros(null);
                    }
                    if (Utils.nulo(ocorrenciaPagoDecimoTerceiro.getValorTetoSegurado()) || Utils.nulo(aliquotaEmpresaPorPeriodo)) {
                        ocorrenciaPagoDecimoTerceiro.setValorTetoEmpresa(null);
                        break;
                    }
                    BaseTetoEmpresa baseTeto = BaseTetoEmpresa.obter(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
                    if (Utils.naoNulo(baseTeto) && Utils.naoNulo(baseTeto.getBaseTeto())) {
                        BigDecimal teto = baseTeto.getBaseTeto().multiply(aliquotaEmpresaPorPeriodo, Utils.CONTEXTO_MATEMATICO);
                        teto = teto.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
                        ocorrenciaPagoDecimoTerceiro.setValorTetoEmpresa(teto);
                        break;
                    }
                    ocorrenciaPagoDecimoTerceiro.setValorTetoEmpresa(null);
                    break;
                }
                case POR_ATIVIDADE_ECONOMICA: {
                    Date competenciaDaOcorrencia;
                    BigDecimal aliquotaEmpresa = null;
                    BigDecimal aliquotaRat = null;
                    BigDecimal aliquotaTerceiros = null;
                    BigDecimal tetoEmpresa = null;
                    AtividadeEconomica atividadeEconomica = AtividadeEconomica.obter(inss.getAtividadeEconomica().getId());
                    if (inss.getApurarEmpresaPorAtividade().booleanValue()) {
                        for (AliquotasEmpresaPorAtividadeEconomica aliquotasEmpresa : atividadeEconomica.getAliquotasEmpresaDaAtividade()) {
                            competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                            if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataInicial()) || !Utils.nulo(aliquotasEmpresa.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasEmpresa.getDataFinal())) continue;
                            if (Utils.naoNulo(aliquotasEmpresa.getAliquota())) {
                                aliquotaEmpresa = aliquotasEmpresa.getAliquota();
                            }
                            if (!Utils.naoNulo(aliquotasEmpresa.getTeto())) break;
                            tetoEmpresa = aliquotasEmpresa.getTeto();
                            break;
                        }
                    }
                    if (inss.getApurarRATPorAtividade().booleanValue()) {
                        for (AliquotasRatPorAtividadeEconomica aliquotasRat : atividadeEconomica.getAliquotasRatDaAtividade()) {
                            competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                            if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataInicial()) || !Utils.nulo(aliquotasRat.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasRat.getDataFinal())) continue;
                            if (!Utils.naoNulo(aliquotasRat.getAliquota())) break;
                            aliquotaRat = aliquotasRat.getAliquota();
                            break;
                        }
                    }
                    if (inss.getApurarTerceirosPorAtividade().booleanValue()) {
                        for (AliquotasTerceirosPorAtividadeEconomica aliquotasTerceiros : atividadeEconomica.getAliquotasTerceirosDaAtividade()) {
                            competenciaDaOcorrencia = HelperDate.getCurrentCompetence(periodo.getInicial()).getDate();
                            if (!HelperDate.dateAfterOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataInicial()) || !Utils.nulo(aliquotasTerceiros.getDataFinal()) && !HelperDate.dateBeforeOrEquals(competenciaDaOcorrencia, aliquotasTerceiros.getDataFinal())) continue;
                            if (!Utils.naoNulo(aliquotasTerceiros.getAliquota())) break;
                            aliquotaTerceiros = aliquotasTerceiros.getAliquota();
                            break;
                        }
                    }
                    if (Utils.naoNulo(aliquotaEmpresa)) {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaEmpresa(aliquotaEmpresa);
                    } else {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaEmpresa(null);
                    }
                    if (Utils.naoNulo(aliquotaRat)) {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaSAT(aliquotaRat);
                    } else {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaSAT(null);
                    }
                    if (Utils.naoNulo(aliquotaTerceiros)) {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaTerceiros(aliquotaTerceiros);
                    } else {
                        ocorrenciaPagoDecimoTerceiro.setAliquotaTerceiros(null);
                    }
                    if (Utils.nulo(ocorrenciaPagoDecimoTerceiro.getValorTetoSegurado())) {
                        ocorrenciaPagoDecimoTerceiro.setValorTetoEmpresa(null);
                        break;
                    }
                    ocorrenciaPagoDecimoTerceiro.setValorTetoEmpresa(tetoEmpresa);
                }
            }
        }
        BigDecimal recolhidoEmpresa = ocorrenciaPagoDecimoTerceiro.getValorBaseRecolhido();
        recolhidoEmpresa = Utils.naoNulos(recolhidoEmpresa, ocorrenciaPagoDecimoTerceiro.getAliquotaEmpresa()) ? recolhidoEmpresa.multiply(ocorrenciaPagoDecimoTerceiro.getAliquotaEmpresa().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
        if (Utils.naoNulos(recolhidoEmpresa, ocorrenciaPagoDecimoTerceiro.getValorTetoEmpresa()) && recolhidoEmpresa.compareTo(ocorrenciaPagoDecimoTerceiro.getValorTetoEmpresa()) > 0) {
            recolhidoEmpresa = ocorrenciaPagoDecimoTerceiro.getValorTetoEmpresa();
        }
        ocorrenciaPagoDecimoTerceiro.setTipoValorDoRecolhidoEmpresa(TipoValorEnum.CALCULADO);
        ocorrenciaPagoDecimoTerceiro.setValorRecolhidoEmpresa(recolhidoEmpresa);
        BigDecimal recolhidoSAT = ocorrenciaPagoDecimoTerceiro.getValorBaseRecolhido();
        recolhidoSAT = Utils.naoNulos(recolhidoSAT, ocorrenciaPagoDecimoTerceiro.getAliquotaSAT()) ? recolhidoSAT.multiply(ocorrenciaPagoDecimoTerceiro.getAliquotaSAT().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
        ocorrenciaPagoDecimoTerceiro.setTipoValorDoRecolhidoSAT(TipoValorEnum.CALCULADO);
        ocorrenciaPagoDecimoTerceiro.setValorRecolhidoSAT(recolhidoSAT);
        BigDecimal recolhidoTerceiros = ocorrenciaPagoDecimoTerceiro.getValorBaseRecolhido();
        recolhidoTerceiros = Utils.naoNulos(recolhidoTerceiros, ocorrenciaPagoDecimoTerceiro.getAliquotaTerceiros()) ? recolhidoTerceiros.multiply(ocorrenciaPagoDecimoTerceiro.getAliquotaTerceiros().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
        ocorrenciaPagoDecimoTerceiro.setTipoValorDoRecolhidoTerceiros(TipoValorEnum.CALCULADO);
        ocorrenciaPagoDecimoTerceiro.setValorRecolhidoTerceiros(recolhidoTerceiros);
        OcorrenciaDeInssSobreSalariosPagos originalPagoDecimoTerceiro = new OcorrenciaDeInssSobreSalariosPagos();
        originalPagoDecimoTerceiro.copiar(ocorrenciaPagoDecimoTerceiro);
        ocorrenciaPagoDecimoTerceiro.setOcorrenciaOriginal(originalPagoDecimoTerceiro);
        if (Utils.naoNulo(this.ocorrenciasPagoAntigas)) {
            ocorrenciaPagoDecimoTerceiro.copiarValoresInformadosAnteriormente(this.ocorrenciasPagoAntigas.search(new OcorrenciaInssUnique(ocorrenciaPagoDecimoTerceiro)));
        }
        this.ocorrenciasPago.add(ocorrenciaPagoDecimoTerceiro);
    }

    public static int calculaAvosInssDecimoTerceiro(Calculo calculo, Periodo periodo) {
        int avos = 0;
        int ano = HelperDate.getInstance(periodo.getInicial()).getYear();
        HelperDate dataInicial = HelperDate.getInstance(ano, 0, 1);
        if (HelperDate.dateAfter(calculo.getDataAdmissao(), dataInicial.getDate())) {
            dataInicial = HelperDate.getInstance(calculo.getDataAdmissao());
        }
        HelperDate dataFinal = HelperDate.getInstance(ano, 11, 31);
        HelperDate dataDemissao = HelperDate.getInstance(calculo.getDataDemissao());
        if (dataDemissao != null) {
            if (calculo.getProjetaAvisoIndenizado().booleanValue()) {
                dataDemissao.addDay(calculo.obterQuantidadeAdicionalAvisoPrevio());
            }
            if (HelperDate.dateAfter(dataFinal.getDate(), dataDemissao.getDate())) {
                dataFinal = dataDemissao;
            } else if (HelperDate.getInstance(periodo.getFinal()).compareDate(calculo.getDataDemissao())) {
                dataFinal = dataDemissao;
            }
        }
        List<Periodo> periodos = HelperDate.breakInMonths(dataInicial.getDate(), dataFinal.getDate());
        for (Periodo periodoAvos : periodos) {
            int quantidadeDias = HelperDate.getInstance(periodoAvos.getFinal()).getDay() - HelperDate.getInstance(periodoAvos.getInicial()).getDay() + 1;
            if ((quantidadeDias -= calculo.obterFaltasNaoJustificadas(periodoAvos)) < 15) continue;
            ++avos;
        }
        return avos;
    }

    private Set<Competencia> encontraCompetenciasOpcaoSimples(List<PeriodoDoINSSComOpcaoSimples> periodos) {
        HashSet<Competencia> competencias = new HashSet<Competencia>();
        for (PeriodoDoINSSComOpcaoSimples periodo : periodos) {
            for (Periodo p : HelperDate.breakInMonths(periodo.getDataInicioSimples(), periodo.getDataTerminoSimples())) {
                competencias.add(new Competencia(p.getInicial()));
            }
        }
        return competencias;
    }
}

