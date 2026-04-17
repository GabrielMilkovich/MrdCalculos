/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeParcelasAtualizaveisMultaIndenizacao")
public class RepositorioDeParcelasAtualizaveisMultaIndenizacao
extends RepositorioBase<ParcelasAtualizaveisMultaIndenizacao> {
    public RepositorioDeParcelasAtualizaveisMultaIndenizacao() {
        super(ParcelasAtualizaveisMultaIndenizacao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public void removerMultas(ParcelasAtualizaveisCreditosReclamante creditosReclamante) {
        if (creditosReclamante != null && creditosReclamante.getId() != null) {
            this.entityManager.createQuery("DELETE FROM ParcelasAtualizaveisMultaIndenizacao WHERE creditosReclamante = :creditosReclamante").setParameter("creditosReclamante", (Object)creditosReclamante).executeUpdate();
        }
    }

    public void removerMultas(ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosReclamante) {
        if (descontoCreditosReclamante != null && descontoCreditosReclamante.getId() != null) {
            this.entityManager.createQuery("DELETE FROM ParcelasAtualizaveisMultaIndenizacao WHERE descontoCreditosReclamante = :descontoCreditosReclamante").setParameter("descontoCreditosReclamante", (Object)descontoCreditosReclamante).executeUpdate();
        }
    }

    public void removerMultas(ParcelasAtualizaveisDebitosReclamante debitosReclamante) {
        if (debitosReclamante != null && debitosReclamante.getId() != null) {
            this.entityManager.createQuery("DELETE FROM ParcelasAtualizaveisMultaIndenizacao WHERE debitosReclamante = :debitosReclamante").setParameter("debitosReclamante", (Object)debitosReclamante).executeUpdate();
        }
    }

    public void removerMultas(ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosReclamado) {
        if (outrosDebitosReclamado != null && outrosDebitosReclamado.getId() != null) {
            this.entityManager.createQuery("DELETE FROM ParcelasAtualizaveisMultaIndenizacao WHERE outrosDebitosReclamado = :outrosDebitosReclamado").setParameter("outrosDebitosReclamado", (Object)outrosDebitosReclamado).executeUpdate();
        }
    }
}

