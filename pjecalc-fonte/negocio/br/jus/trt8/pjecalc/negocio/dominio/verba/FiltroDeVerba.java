/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.hibernate.criterion.Criterion
 *  org.hibernate.criterion.Order
 *  org.hibernate.criterion.Restrictions
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.verba;

import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ValorDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.verba.RepositorioDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import java.io.Serializable;
import org.hibernate.Criteria;
import org.hibernate.criterion.Criterion;
import org.hibernate.criterion.Order;
import org.hibernate.criterion.Restrictions;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDeVerba")
public class FiltroDeVerba
extends FiltroBase<Verba>
implements Serializable {
    private static final long serialVersionUID = 2417931985181016406L;
    private String nome;
    private ValorDaVerbaEnum valor;
    private TipoDeVerbaEnum tipo;

    public FiltroDeVerba() {
        super(RepositorioDeVerba.class);
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
        if (this.nome != null && !this.nome.isEmpty()) {
            criteria.add((Criterion)Restrictions.like((String)"nome", (Object)("%" + this.nome.toUpperCase() + "%")));
        }
        if (this.valor != null) {
            criteria.add((Criterion)Restrictions.eq((String)"valor", (Object)((Object)this.valor)));
        }
        if (this.tipo != null) {
            criteria.add((Criterion)Restrictions.eq((String)"tipo", (Object)((Object)this.tipo)));
        }
        criteria.addOrder(Order.asc((String)"nome"));
    }

    public FiltroDeVerba comNome() {
        return this;
    }

    public FiltroDeVerba comValor() {
        return this;
    }

    public FiltroDeVerba comTipo() {
        return this;
    }

    public FiltroDeVerba ordenadoPorNome() {
        return this;
    }

    public FiltroDeVerba ordenadoPorValor() {
        return this;
    }

    public FiltroDeVerba ordenadoPorTipo() {
        return this;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public ValorDaVerbaEnum getValor() {
        return this.valor;
    }

    public void setValor(ValorDaVerbaEnum valor) {
        this.valor = valor;
    }

    public TipoDeVerbaEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoDeVerbaEnum tipo) {
        this.tipo = tipo;
    }
}

