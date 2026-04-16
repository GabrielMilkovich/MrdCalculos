/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.ReflexoInvalidoException;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Principal;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeVerbaCalculo")
public class RepositorioDeVerbaCalculo
extends RepositorioBase<VerbaDeCalculo> {
    public RepositorioDeVerbaCalculo() {
        super(VerbaDeCalculo.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public void adicionarEmOcorrencias(VerbaDeCalculo verba, OcorrenciaDeVerba filho) {
        filho.setVerbaDeCalculo(verba);
        verba.getOcorrencias().add(filho);
    }

    public void removerDeOcorrencias(final VerbaDeCalculo verba, List<OcorrenciaDeVerba> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<VerbaDeCalculo, OcorrenciaDeVerba>(){

            @Override
            public VerbaDeCalculo getOwner() {
                return verba;
            }

            @Override
            public Collection<OcorrenciaDeVerba> getCollection(VerbaDeCalculo attachadOwner) {
                return attachadOwner.getOcorrencias();
            }
        }, filhos, flush);
    }

    public void removerOcorrencia(OcorrenciaDeVerba ocorrencia) {
        this.entityManager.remove((Object)ocorrencia);
    }

    public boolean existe(VerbaDeCalculo verba) {
        if (verba.getId() != null) {
            return super.existe("nome = ? and id != ?", verba.getNome(), verba.getId());
        }
        return super.existe("nome = ?", verba.getNome());
    }

    public List<Reflexo> obterReflexos(VerbaDeCalculo verbaDeCalculo) {
        Query query = this.entityManager.createNativeQuery("select VC.* from TBITEMBASEVERBA IV, TBFORMULA F,TBVERBACALCULO VC where VC.IIDFORMULA = F.IIDFORMULA and F.IIDFORMULA=IV.IIDFORMULA and VC.STPDISCRIMINADOR = 'R' and IV.IIDVERBACALCULO=? order by IIDORDEM,SNMVERBA", Reflexo.class);
        query.setParameter(1, (Object)verbaDeCalculo.getId());
        return query.getResultList();
    }

    @Override
    public void salvar(Collection<VerbaDeCalculo> verbas) {
        for (VerbaDeCalculo verba : verbas) {
            this.entityManager.persist((Object)verba.validar());
        }
    }

    private OneToManyRemover[] getEntidadesAgregadas() {
        return new OneToManyRemover[]{new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((VerbaDeCalculo)entity).getHistoricosDaVerbaDoValorDevido();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((VerbaDeCalculo)entity).getHistoricosDaVerbaDoValorPago();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((VerbaDeCalculo)entity).getValesTransportesDoValorDevido();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((VerbaDeCalculo)entity).getValesTransportesDoValorPago();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((VerbaDeCalculo)entity).getCartoesDePontoDaVerbaDivisor();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((VerbaDeCalculo)entity).getCartoesDePontoDaVerbaQuantidade();
            }
        }};
    }

    @Override
    public void remover(VerbaDeCalculo verba, boolean flush) {
        super.remover(verba, flush);
    }

    @Override
    public void remover(VerbaDeCalculo verba) {
        super.remover(verba, true, this.getEntidadesAgregadas());
    }

    @Override
    public void salvar(VerbaDeCalculo verba) {
        if (verba.getId() == null && verba.getFormula() instanceof FormulaReflexo) {
            FormulaReflexo formulaReflexo = (FormulaReflexo)verba.getFormula();
            for (ItemBaseVerba itemBaseVerba : formulaReflexo.getBaseVerba().getItens()) {
                if (itemBaseVerba.getId() != null) continue;
                itemBaseVerba.setVerbaDeCalculo(VerbaDeCalculo.obter(itemBaseVerba.getVerbaDeCalculo().getId()));
            }
        }
        if (verba instanceof Reflexo) {
            verba.montarNomeCompleto(null);
        }
        super.salvar(verba, this.getEntidadesAgregadas());
        VerbaDeCalculo verbaSendoProcessada = null;
        try {
            Object reflexos;
            if (verba.isPrincipal()) {
                reflexos = ((Principal)verba).getReflexos();
                Iterator<Reflexo> iterator = reflexos.iterator();
                while (iterator.hasNext()) {
                    Reflexo reflexo = iterator.next();
                    verbaSendoProcessada = reflexo;
                    reflexo.montarNomeCompleto(null);
                    if (!HelperDate.dateEquals(reflexo.getPeriodoInicial(), verba.getPeriodoInicial())) {
                        reflexo.setPeriodoInicial(verba.getPeriodoInicial());
                        reflexo.setVerbaAlterada(Boolean.TRUE);
                    }
                    Date dataFimSugerida = reflexo.sugerirPeriodoFinal();
                    if (!reflexo.isComPagamentoMensal()) {
                        if (!HelperDate.dateEquals(reflexo.getPeriodoFinal(), dataFimSugerida)) {
                            reflexo.setPeriodoFinal(dataFimSugerida);
                            reflexo.setVerbaAlterada(Boolean.TRUE);
                        }
                    } else if (!HelperDate.dateEquals(reflexo.getPeriodoFinal(), verba.getPeriodoFinal())) {
                        reflexo.setPeriodoFinal(verba.getPeriodoFinal());
                        reflexo.setVerbaAlterada(Boolean.TRUE);
                    }
                    super.salvar(reflexo.validar());
                }
            } else if (verba instanceof Reflexo) {
                reflexos = this.obterReflexos(verba).iterator();
                while (reflexos.hasNext()) {
                    VerbaDeCalculo verbaDeCalculo;
                    verbaSendoProcessada = verbaDeCalculo = (VerbaDeCalculo)reflexos.next();
                    verbaDeCalculo.montarNomeCompleto(null);
                    if (!HelperDate.dateEquals(verbaDeCalculo.getPeriodoInicial(), verba.getPeriodoInicial())) {
                        verbaDeCalculo.setPeriodoInicial(verba.getPeriodoInicial());
                        verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
                    }
                    Date dataFimSugerida = verbaDeCalculo.sugerirPeriodoFinal();
                    if (!verbaDeCalculo.isComPagamentoMensal()) {
                        if (!HelperDate.dateEquals(verbaDeCalculo.getPeriodoFinal(), dataFimSugerida)) {
                            verbaDeCalculo.setPeriodoFinal(dataFimSugerida);
                            verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
                        }
                    } else if (!HelperDate.dateEquals(verbaDeCalculo.getPeriodoFinal(), verba.getPeriodoFinal())) {
                        verbaDeCalculo.setPeriodoFinal(verba.getPeriodoFinal());
                        verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
                    }
                    super.salvar(verbaDeCalculo.validar());
                }
            }
        }
        catch (NegocioException ne) {
            ReflexoInvalidoException reflexoInvalidoException = new ReflexoInvalidoException();
            reflexoInvalidoException.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0117, verba.getNome(), verbaSendoProcessada.getNome()));
            throw reflexoInvalidoException;
        }
    }

    public void salvarPrincipalSemValidarReflexo(VerbaDeCalculo verba) {
        if (verba.getId() == null && verba.getFormula() instanceof FormulaReflexo) {
            FormulaReflexo formulaReflexo = (FormulaReflexo)verba.getFormula();
            for (ItemBaseVerba item : formulaReflexo.getBaseVerba().getItens()) {
                if (item.getId() != null) continue;
                item.setVerbaDeCalculo(VerbaDeCalculo.obter(item.getVerbaDeCalculo().getId()));
            }
        }
        super.salvar(verba, this.getEntidadesAgregadas());
    }

    public List<VerbaDeCalculo> obterVerbasComumMensalEDesligamento(Calculo calculo) {
        return this.obterTodosPorCriterio("ordem, nome", "calculo.id=? and ativo=? and caracteristica = ? and ocorrenciaDePagamento in (?, ?) ", new Object[]{calculo.getId(), true, CaracteristicaDaVerbaEnum.COMUM, OcorrenciaDePagamentoEnum.MENSAL, OcorrenciaDePagamentoEnum.DESLIGAMENTO});
    }

    public List<VerbaDeCalculo> obterVerbasAtivasDoCalculo(Calculo calculo) {
        return this.obterTodosPorCriterio("ordem, nome", "calculo.id=? and ativo=?", calculo.getId(), true);
    }

    public void substituir(VerbaDeCalculo substituida, VerbaDeCalculo substituta) {
        substituta.getCalculo().substituirVerba(substituida, substituta);
    }

    public List<VerbaDeCalculo> obterVerbasAtivasDoCalculo(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(Principal.class, orderBy, clausulaWhere, parametros);
    }

    public List<Principal> obterVerbasPrincipaisAtivas(Calculo calculo) {
        Query query = this.entityManager.createNativeQuery("select VC.* from TBVERBACALCULO VC where VC.STPDISCRIMINADOR in ('C','I') and VC.IIDCALCULO = ? and VC.SFLATIVO = 'S' order by IIDORDEM, SNMVERBA", Principal.class);
        query.setParameter(1, (Object)calculo.getId());
        return query.getResultList();
    }

    public void limparOcorrencias(VerbaDeCalculo verba, boolean flush) {
        if (Utils.naoNulo(verba) && Utils.naoNulo(verba.getOcorrencias()) && !verba.getOcorrencias().isEmpty()) {
            if (Utils.naoNulo(this.entityManager)) {
                ArrayList<OcorrenciaDeVerba> ocorrencias = new ArrayList<OcorrenciaDeVerba>();
                for (OcorrenciaDeVerba ocorrencia : verba.getOcorrencias()) {
                    ocorrencias.add(ocorrencia);
                }
                verba.removerDeOcorrencias(ocorrencias, flush);
            } else {
                verba.getOcorrencias().clear();
            }
        }
    }

    public void marcarComoAlterada(VerbaDeCalculo verbaDeCalculo) {
        verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
        this.getSession().merge((Object)verbaDeCalculo);
    }

    public void desmarcarComoAlterada(VerbaDeCalculo verbaDeCalculo) {
        verbaDeCalculo.setVerbaAlterada(Boolean.FALSE);
        this.getSession().merge((Object)verbaDeCalculo);
    }

    public VerbaDeCalculo removerDosHistoricosDa(VerbaDeCalculo verbaDeCalculo, HistoricoSalarialDaVerba historicoDaVerba) {
        HistoricoSalarialDaVerba hsv = (HistoricoSalarialDaVerba)this.entityManager.find(HistoricoSalarialDaVerba.class, (Object)historicoDaVerba.getId());
        if (this.getSession().contains((Object)hsv)) {
            this.getSession().delete((Object)hsv);
            if (TipoVinculoDeVerbaEnum.BASE == historicoDaVerba.getTipoVinculoHistorico()) {
                verbaDeCalculo.getHistoricosDaVerbaDoValorDevido().remove(hsv);
            } else {
                verbaDeCalculo.getHistoricosDaVerbaDoValorPago().remove(hsv);
            }
        }
        this.getSession().merge((Object)verbaDeCalculo);
        this.flush();
        this.getSession().clear();
        return verbaDeCalculo;
    }
}

