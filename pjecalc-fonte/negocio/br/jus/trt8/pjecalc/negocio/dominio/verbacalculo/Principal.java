/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Entity
 *  javax.persistence.Transient
 *  org.hibernate.Hibernate
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.RepositorioDeVerbaCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.Entity;
import javax.persistence.Transient;
import org.hibernate.Hibernate;

@Entity
public abstract class Principal
extends VerbaDeCalculo {
    private static final long serialVersionUID = 2924641428416450670L;
    @Transient
    private List<Reflexo> reflexos;
    @Transient
    private List<Reflexo> reflexosParaListagem;

    public List<Reflexo> getReflexos() {
        if (Utils.nulo(this.getId())) {
            if (Utils.nulo(this.reflexos)) {
                this.reflexos = new ArrayList<Reflexo>();
            }
            return this.reflexos;
        }
        return VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).obterReflexos(this);
    }

    public List<Reflexo> getReflexosParaListagem() {
        if (Utils.nulo(this.reflexosParaListagem)) {
            if (Utils.nulo(this.getId())) {
                this.reflexosParaListagem = new ArrayList<Reflexo>();
            } else {
                this.reflexosParaListagem = VerbaDeCalculo.getRepositorio(RepositorioDeVerbaCalculo.class).obterReflexos(this);
                for (Reflexo r : this.reflexosParaListagem) {
                    Hibernate.initialize(r.getOcorrencias());
                }
            }
        }
        return this.reflexosParaListagem;
    }

    @Override
    public void copiar(Verba verba) {
        super.copiar(verba);
        for (Verba base : verba.obterTodosReflexos()) {
            Reflexo reflexo = new Reflexo(this.getCalculo());
            reflexo.copiar(base);
            reflexo.setAtivo(false);
            LogicoEnum deveIntegralizar = this.getAplicarProporcionalidade() == false ? LogicoEnum.SIM : LogicoEnum.NAO;
            ItemBaseVerba itemBaseVerba = new ItemBaseVerba(this, deveIntegralizar);
            ((FormulaReflexo)reflexo.getFormula()).getBaseVerba().getItens().add(itemBaseVerba);
            this.getReflexos().add(reflexo);
        }
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public boolean possuiReflexosHabilitados() {
        for (Reflexo r : this.getReflexosParaListagem()) {
            if (!r.getAtivo().booleanValue()) continue;
            return true;
        }
        return false;
    }

    @Override
    public boolean isPrincipal() {
        return true;
    }
}

