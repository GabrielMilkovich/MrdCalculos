/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.OcorrenciaDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
import java.util.Collection;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeSalarioFamilia")
public class RepositorioDeSalarioFamilia
extends RepositorioBase<SalarioFamilia> {
    public RepositorioDeSalarioFamilia() {
        super(SalarioFamilia.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public void remover(SalarioFamilia entidade) {
        super.remover(entidade);
    }

    @Override
    public List<SalarioFamilia> obterTodos(String orderBy) {
        return super.obterTodos(orderBy);
    }

    @Override
    public void salvar(SalarioFamilia entidade) {
        super.salvar(entidade, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((SalarioFamilia)entity).getVariacaoQuantidadesFilhos();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((SalarioFamilia)entity).getItensHistoricoSalarial();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((SalarioFamilia)entity).getItensSalarioDevido();
            }
        });
    }

    public void removerDeOcorrencias(final SalarioFamilia salarioFamilia, List<OcorrenciaDeSalarioFamilia> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<SalarioFamilia, OcorrenciaDeSalarioFamilia>(){

            @Override
            public SalarioFamilia getOwner() {
                return salarioFamilia;
            }

            @Override
            public Collection<OcorrenciaDeSalarioFamilia> getCollection(SalarioFamilia attachadOwner) {
                return attachadOwner.getOcorrencias();
            }
        }, filhos, flush);
    }
}

