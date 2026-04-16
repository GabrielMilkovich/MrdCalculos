/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Session
 *  org.hibernate.criterion.Criterion
 *  org.hibernate.criterion.Restrictions
 *  org.hibernate.transform.Transformers
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.verba;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.verba.VerbaParaCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import java.util.List;
import org.hibernate.Session;
import org.hibernate.criterion.Criterion;
import org.hibernate.criterion.Restrictions;
import org.hibernate.transform.Transformers;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeVerba")
public class RepositorioDeVerba
extends RepositorioBase<Verba> {
    public RepositorioDeVerba() {
        super(Verba.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public boolean existe(Verba verba) {
        if (verba.getId() != null) {
            return super.existe("nome = ? and id != ?", verba.getNome(), verba.getId());
        }
        return super.existe("nome = ?", verba.getNome());
    }

    public List<VerbaParaCalculo> verbasParaCalculo() {
        return ((Session)this.entityManager.getDelegate()).createCriteria(Verba.class, "verba").add((Criterion)Restrictions.eq((String)"tipo", (Object)((Object)TipoDeVerbaEnum.PRINCIPAL))).setResultTransformer(Transformers.aliasToBean(VerbaParaCalculo.class)).list();
    }

    @Override
    protected void salvar(Verba entidade) {
        super.salvar(entidade);
        for (Verba reflexo : entidade.obterTodosReflexos()) {
            reflexo.montarNomeCompleto(null);
            reflexo.salvar();
        }
    }
}

