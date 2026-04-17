/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.constantes.SituacaoDaFeriasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ExcecaoDaCargaHorariaDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ExcecaoDoSabadoDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.Falta;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoDiariaCartao;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ExcecaoDoFechamentoDeCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.processo.Advogado;
import br.jus.trt8.pjecalc.negocio.dominio.processo.Processo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Principal;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ValeTransporteDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCalculo")
public class RepositorioDeCalculo
extends RepositorioBase<Calculo> {
    public RepositorioDeCalculo() {
        super(Calculo.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<Calculo> pesquisar(int firstResult, int maxResult, String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(firstResult, maxResult, orderBy, clausulaWhere, parametros);
    }

    public List<Calculo> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    public void substituirVerba(Calculo calculo, VerbaDeCalculo substituida, VerbaDeCalculo substituta) {
        VerbaDeCalculo attachadVerba = (VerbaDeCalculo)this.entityManager.find(VerbaDeCalculo.class, substituida.obterChavePrimaria());
        if (substituida instanceof Principal) {
            Principal principal = (Principal)substituida;
            for (Reflexo reflexo : principal.getReflexos()) {
                FormulaReflexo formula = (FormulaReflexo)reflexo.getFormula();
                for (ItemBaseVerba item : formula.getBaseVerba().getItens()) {
                    item.setVerbaDeCalculo(substituta);
                }
            }
        }
        calculo = (Calculo)calculo.restaurar();
        calculo.getVerbas().remove(attachadVerba);
        VerbaDeCalculo.remover(attachadVerba, false);
        calculo.getVerbas().add(substituta.validar());
        ArrayList<ValeTransporteDaVerba> valesTransportesDoValorPagoTemp = new ArrayList<ValeTransporteDaVerba>();
        valesTransportesDoValorPagoTemp.addAll(substituta.getValesTransportesDoValorPago());
        substituta.getValesTransportesDoValorPago().clear();
        for (ValeTransporteDaVerba elemento : valesTransportesDoValorPagoTemp) {
            substituta.getValesTransportesDoValorPago().add(new ValeTransporteDaVerba(substituta, elemento.getValeTransporte(), TipoVinculoDeVerbaEnum.VALOR_PAGO));
        }
        ArrayList<HistoricoSalarialDaVerba> historicosDaVerbaDoValorPagoTemp = new ArrayList<HistoricoSalarialDaVerba>();
        historicosDaVerbaDoValorPagoTemp.addAll(substituta.getHistoricosDaVerbaDoValorPago());
        substituta.getHistoricosDaVerbaDoValorPago().clear();
        for (HistoricoSalarialDaVerba elemento : historicosDaVerbaDoValorPagoTemp) {
            substituta.getHistoricosDaVerbaDoValorPago().add(new HistoricoSalarialDaVerba(substituta, elemento.getHistoricoSalarial(), elemento.getTipoVinculoHistorico(), elemento.getAplicarProporcionalidade()));
        }
        substituta.salvar();
        this.flush();
    }

    public void removerDeVerbas(final Calculo calculo, VerbaDeCalculo verbaDeCalculo, boolean flush) {
        ArrayList<VerbaDeCalculo> verbasParaRemocao = new ArrayList<VerbaDeCalculo>();
        verbasParaRemocao.add(verbaDeCalculo);
        if (verbaDeCalculo instanceof Principal) {
            Principal principal = (Principal)verbaDeCalculo;
            for (Reflexo reflexo : principal.getReflexos()) {
                verbasParaRemocao.add(reflexo);
            }
        }
        this.removerDe(new AggregateCollection<Calculo, VerbaDeCalculo>(){

            @Override
            public Calculo getOwner() {
                return calculo;
            }

            @Override
            public Collection<VerbaDeCalculo> getCollection(Calculo attachadOwner) {
                return attachadOwner.getVerbas();
            }
        }, verbasParaRemocao, flush);
    }

    public void removerDeApuracoesDiariasDeCartaoDePonto(final Calculo calculo, List<ApuracaoDiariaCartao> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<Calculo, ApuracaoDiariaCartao>(){

            @Override
            public Calculo getOwner() {
                return calculo;
            }

            @Override
            public Collection<ApuracaoDiariaCartao> getCollection(Calculo attachadOwner) {
                return attachadOwner.getApuracoesDiariasCartaoDePonto();
            }
        }, filhos, flush);
    }

    public void adicionarEmVerbas(List<VerbaDeCalculo> verbas) {
        for (VerbaDeCalculo verba : verbas) {
            verba.validar();
            verba.checarAvisoPrevio();
            if (verba instanceof Principal) {
                verba.gerarOcorrencias(false);
            }
            this.getSession().persist((Object)verba);
        }
        this.flush();
    }

    public void removerDeHistoricoSalarial(final Calculo calculo, HistoricoSalarial historicoSalarial, boolean flush) {
        this.removerDe(new AggregateCollection<Calculo, HistoricoSalarial>(){

            @Override
            public Calculo getOwner() {
                return calculo;
            }

            @Override
            public Collection<HistoricoSalarial> getCollection(Calculo attachadOwner) {
                return attachadOwner.getHistoricosSalariais();
            }
        }, historicoSalarial, flush);
    }

    public void removerDeFerias(final Calculo calculo, List<Ferias> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<Calculo, Ferias>(){

            @Override
            public Calculo getOwner() {
                return calculo;
            }

            @Override
            public Collection<Ferias> getCollection(Calculo attachadOwner) {
                return attachadOwner.getListaDeFerias();
            }
        }, filhos, flush);
    }

    public void limparFerias(Calculo calculo, boolean flush) {
        if (Utils.naoNulo(calculo) && Utils.naoNulo(calculo.getListaDeFerias()) && !calculo.getListaDeFerias().isEmpty()) {
            if (Utils.naoNulo(this.entityManager)) {
                ArrayList<Ferias> listaDeFerias = new ArrayList<Ferias>();
                for (Ferias ferias : calculo.getListaDeFerias()) {
                    listaDeFerias.add(ferias);
                }
                calculo.removerDeFerias(listaDeFerias, flush);
            } else {
                calculo.getListaDeFerias().clear();
            }
        }
    }

    @Override
    public void salvar(Calculo entidade) {
        super.salvar(entidade, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Calculo)entity).getExcecoesDoSabado();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Calculo)entity).getPontosFacultativos();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Calculo)entity).getExcecoesDaCargaHoraria();
            }
        });
    }

    private boolean verificarFeriasColetivas(Ferias ferias) {
        return HelperDate.dateEquals(ferias.getPeriodoAquisitivo().getInicial(), ferias.getCalculo().getDataAdmissao()) && !HelperDate.dateEquals(ferias.getPeriodoAquisitivo().getFinal(), HelperDate.getInstance(ferias.getPeriodoAquisitivo().getInicial()).addYear(1).addDay(-1).getDate());
    }

    public void gerarPeriodosDeFerias(Calculo calculo, boolean flush) {
        calculo.limparFerias(flush);
        Date dataInicial = calculo.getDataAdmissao();
        Date dataFinal = calculo.getDataDemissao();
        if (Utils.nulo(dataFinal)) {
            dataFinal = calculo.getDataTerminoCalculo();
        }
        if (Utils.nulos(dataInicial, dataFinal)) {
            return;
        }
        Calculo calculoRestaurado = (Calculo)calculo.restaurar();
        List<Date> datasDeFaltasQueReiniciamFerias = calculoRestaurado.encontrarFaltasQueReiniciamFerias();
        List<Periodo> periodos = this.encontrarPeriodosDeFerias(dataInicial, dataFinal, datasDeFaltasQueReiniciamFerias, calculo.getInicioFeriasColetivas());
        for (Periodo aquisitivo : periodos) {
            HelperDate concessivoInicial = HelperDate.getInstance(aquisitivo.getFinal()).addDay(1);
            HelperDate concessivoFinal = concessivoInicial.clone().addYear(1);
            if (concessivoFinal.getDay() == concessivoInicial.getDay()) {
                concessivoFinal.addDay(-1);
            }
            Periodo concessivo = new Periodo(concessivoInicial, concessivoFinal);
            Ferias ferias = new Ferias();
            ferias.setCalculo(calculo);
            ferias.setRelativa(String.format("%s/%s", aquisitivo.formatInicial("yyyy"), aquisitivo.formatFinal("yyyy")));
            ferias.setPeriodoAquisitivo(aquisitivo);
            ferias.setPeriodoConcessivo(concessivo);
            ferias.sugerirPrazo();
            boolean feriasColetivas = this.verificarFeriasColetivas(ferias);
            if (ferias.getPrazo() == 0) {
                ferias.setSituacao(SituacaoDaFeriasEnum.PERDIDAS);
            } else if (!feriasColetivas && Utils.naoNulo(calculo.getDataDemissao()) && HelperDate.getInstance(calculo.getDataDemissao()).lessThen(concessivoFinal)) {
                ferias.setSituacao(SituacaoDaFeriasEnum.INDENIZADAS);
            } else if (!feriasColetivas && Utils.nulo(calculo.getDataDemissao()) && concessivoFinal.greaterThen(calculo.getDataTerminoCalculo())) {
                ferias.setSituacao(SituacaoDaFeriasEnum.NAO_GOZADAS);
            } else {
                ferias.setSituacao(SituacaoDaFeriasEnum.GOZADAS);
            }
            ferias.setAbono(false);
            ferias.sugerirPrimeiroPeriodosDeGozos();
            calculo.getListaDeFerias().add(ferias);
            this.getSession().persist((Object)ferias);
        }
        this.getSession().merge((Object)calculo);
        if (flush) {
            this.flush();
        }
    }

    private List<Periodo> encontrarPeriodosDeFerias(Date dataInicial, Date dataFinal, List<Date> datasDeFaltasQueReiniciamFerias, Date inicioFeriasColetivas) {
        ArrayList<Periodo> periodos = new ArrayList<Periodo>();
        HelperDate auxInicio = HelperDate.getInstance(dataInicial);
        if (Utils.naoNulo(inicioFeriasColetivas) && !HelperDate.dateEquals(inicioFeriasColetivas, dataInicial)) {
            auxInicio.setDate(inicioFeriasColetivas);
            auxInicio.addDay(-1);
            periodos.add(new Periodo(dataInicial, auxInicio.getDate()));
            auxInicio.addDay(1);
        }
        Date auxFim = dataFinal;
        for (int i = 0; i < datasDeFaltasQueReiniciamFerias.size(); ++i) {
            auxFim = datasDeFaltasQueReiniciamFerias.get(i);
            periodos.addAll(HelperDate.breakInYears(auxInicio.getDate(), auxFim, false));
            auxInicio.setDate(auxFim);
        }
        auxFim = dataFinal;
        periodos.addAll(HelperDate.breakInYears(auxInicio.getDate(), auxFim, false));
        return periodos;
    }

    public Calculo removerDeExcecoesDaCargaHoraria(final Calculo calculo, ExcecaoDaCargaHorariaDoCalculo excecao) {
        this.removerDe(new AggregateCollection<Calculo, ExcecaoDaCargaHorariaDoCalculo>(){

            @Override
            public Calculo getOwner() {
                return calculo;
            }

            @Override
            public Collection<ExcecaoDaCargaHorariaDoCalculo> getCollection(Calculo attachadOwner) {
                return attachadOwner.getExcecoesDaCargaHoraria();
            }
        }, excecao, false);
        calculo.getExcecoesDaCargaHoraria().remove(excecao);
        return calculo;
    }

    public Calculo removerDeExcecoesDoFechamento(Calculo calculo, ExcecaoDoFechamentoDeCartaoDePonto excecao) {
        if (Utils.naoNulo(excecao.getId())) {
            this.getSession().delete(this.getSession().load(ExcecaoDoFechamentoDeCartaoDePonto.class, (Serializable)excecao.getId()));
        }
        calculo.getExcecoesDoFechamentoDeCartaoDePonto().remove(excecao);
        return calculo;
    }

    public Calculo removerDeExcecoesDoSabado(final Calculo calculo, ExcecaoDoSabadoDoCalculo excecao) {
        this.removerDe(new AggregateCollection<Calculo, ExcecaoDoSabadoDoCalculo>(){

            @Override
            public Calculo getOwner() {
                return calculo;
            }

            @Override
            public Collection<ExcecaoDoSabadoDoCalculo> getCollection(Calculo attachadOwner) {
                return attachadOwner.getExcecoesDoSabado();
            }
        }, excecao, false);
        calculo.getExcecoesDoSabado().remove(excecao);
        return calculo;
    }

    public Calculo removerDeFaltas(final Calculo calculo, Falta falta, boolean flush) {
        this.removerDe(new AggregateCollection<Calculo, Falta>(){

            @Override
            public Calculo getOwner() {
                return calculo;
            }

            @Override
            public Collection<Falta> getCollection(Calculo attachadOwner) {
                return attachadOwner.getFaltas();
            }
        }, falta, flush);
        return calculo;
    }

    public Calculo removerDeMultas(final Calculo calculo, Multa multa, boolean flush) {
        this.removerDe(new AggregateCollection<Calculo, Multa>(){

            @Override
            public Calculo getOwner() {
                return calculo;
            }

            @Override
            public Collection<Multa> getCollection(Calculo attachadOwner) {
                return attachadOwner.getMultasDoCalculo();
            }
        }, multa, flush);
        return calculo;
    }

    @Override
    public long obterQuantidade(String clausulaWhere, Object ... parametros) {
        return super.obterQuantidade(clausulaWhere, parametros);
    }

    public Processo removerAdvogadoReclamante(Processo processo, Advogado advogado) {
        Advogado adv = (Advogado)this.entityManager.find(Advogado.class, (Object)advogado.getId());
        if (this.getSession().contains((Object)adv)) {
            this.getSession().delete((Object)adv);
            processo.getAdvogadosReclamante().remove(adv);
        }
        this.getSession().merge((Object)processo);
        this.getSession().clear();
        return processo;
    }
}

