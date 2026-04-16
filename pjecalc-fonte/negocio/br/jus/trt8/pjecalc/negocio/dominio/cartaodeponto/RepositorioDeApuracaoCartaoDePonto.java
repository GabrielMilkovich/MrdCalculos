/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.constantes.TipoPreenchimentoJornadaCartaoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaJornadaApuracaoCartao;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.PreenchimentoJornadaApuracaoCartao;
import java.util.Collection;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeApuracaoCartaoDePonto")
public class RepositorioDeApuracaoCartaoDePonto
extends RepositorioBase<ApuracaoCartaoDePonto> {
    public RepositorioDeApuracaoCartaoDePonto() {
        super(ApuracaoCartaoDePonto.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<ApuracaoCartaoDePonto> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    @Override
    public ApuracaoCartaoDePonto obter(Object id) {
        return (ApuracaoCartaoDePonto)super.obter(id);
    }

    public List<PreenchimentoJornadaApuracaoCartao> obterOcorrenciasPreenchimentoPorTipo(ApuracaoCartaoDePonto apuracaoCartaoDePonto, TipoPreenchimentoJornadaCartaoEnum tipoPreenchimento) {
        Query query = this.entityManager.createQuery("from PreenchimentoJornadaApuracaoCartao where apuracaoCartaoDePonto =? and tipoPreenchimentoJornadaCartao = ?");
        query.setParameter(1, (Object)apuracaoCartaoDePonto);
        query.setParameter(2, (Object)tipoPreenchimento);
        return query.getResultList();
    }

    public List<ApuracaoCartaoDePonto> obterApuracoesDeCartaoDoCalculo(Calculo calculo) {
        Query query = this.entityManager.createQuery("from ApuracaoCartaoDePonto where calculo.id = ? order by dataInicial ");
        query.setParameter(1, (Object)calculo.getId());
        return query.getResultList();
    }

    public ApuracaoCartaoDePonto removerDeOcorrencias(ApuracaoCartaoDePonto apuracaoCartaoDePonto, OcorrenciaJornadaApuracaoCartao ocorrencia) {
        OcorrenciaJornadaApuracaoCartao oc = (OcorrenciaJornadaApuracaoCartao)this.entityManager.find(OcorrenciaJornadaApuracaoCartao.class, (Object)ocorrencia.getId());
        if (this.getSession().contains((Object)oc)) {
            this.getSession().delete((Object)oc);
            apuracaoCartaoDePonto.getOcorrenciasJornadaApuracaoCartao().remove(oc);
        }
        return apuracaoCartaoDePonto;
    }

    public void removerDeOcorrencias(final ApuracaoCartaoDePonto apuracaoCartaoDePonto, List<OcorrenciaJornadaApuracaoCartao> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<ApuracaoCartaoDePonto, OcorrenciaJornadaApuracaoCartao>(){

            @Override
            public ApuracaoCartaoDePonto getOwner() {
                return apuracaoCartaoDePonto;
            }

            @Override
            public Collection<OcorrenciaJornadaApuracaoCartao> getCollection(ApuracaoCartaoDePonto attachadOwner) {
                return attachadOwner.getOcorrenciasJornadaApuracaoCartao();
            }
        }, filhos, flush);
    }

    public void removerDeOcorrenciasEscala(final ApuracaoCartaoDePonto apuracaoCartaoDePonto, List<PreenchimentoJornadaApuracaoCartao> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<ApuracaoCartaoDePonto, PreenchimentoJornadaApuracaoCartao>(){

            @Override
            public ApuracaoCartaoDePonto getOwner() {
                return apuracaoCartaoDePonto;
            }

            @Override
            public Collection<PreenchimentoJornadaApuracaoCartao> getCollection(ApuracaoCartaoDePonto attachadOwner) {
                return attachadOwner.getPreenchimentoJornadaEscalaApuracaoCartao();
            }
        }, filhos, flush);
    }

    public void removerDeOcorrenciasSemanal(final ApuracaoCartaoDePonto apuracaoCartaoDePonto, List<PreenchimentoJornadaApuracaoCartao> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<ApuracaoCartaoDePonto, PreenchimentoJornadaApuracaoCartao>(){

            @Override
            public ApuracaoCartaoDePonto getOwner() {
                return apuracaoCartaoDePonto;
            }

            @Override
            public Collection<PreenchimentoJornadaApuracaoCartao> getCollection(ApuracaoCartaoDePonto attachadOwner) {
                return attachadOwner.getPreenchimentoJornadaSemanalApuracaoCartao();
            }
        }, filhos, flush);
    }
}

