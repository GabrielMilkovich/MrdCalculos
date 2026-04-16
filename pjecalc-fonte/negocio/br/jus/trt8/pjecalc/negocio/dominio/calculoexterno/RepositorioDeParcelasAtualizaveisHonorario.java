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
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeParcelasAtualizaveisHonorario")
public class RepositorioDeParcelasAtualizaveisHonorario
extends RepositorioBase<ParcelasAtualizaveisHonorario> {
    public RepositorioDeParcelasAtualizaveisHonorario() {
        super(ParcelasAtualizaveisHonorario.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public void removerHonorarios(ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosReclamante) {
        if (descontoCreditosReclamante != null && descontoCreditosReclamante.getId() != null) {
            this.entityManager.createQuery("DELETE FROM ParcelasAtualizaveisHonorario WHERE descontoCreditosReclamante = :descontoCreditosReclamante").setParameter("descontoCreditosReclamante", (Object)descontoCreditosReclamante).executeUpdate();
        }
    }

    public void removerHonorarios(ParcelasAtualizaveisDebitosReclamante debitosReclamante) {
        if (debitosReclamante != null && debitosReclamante.getId() != null) {
            this.entityManager.createQuery("DELETE FROM ParcelasAtualizaveisHonorario WHERE debitosReclamante = :debitosReclamante").setParameter("debitosReclamante", (Object)debitosReclamante).executeUpdate();
        }
    }

    public void removerHonorarios(ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosReclamado) {
        if (outrosDebitosReclamado != null && outrosDebitosReclamado.getId() != null) {
            this.entityManager.createQuery("DELETE FROM ParcelasAtualizaveisHonorario WHERE outrosDebitosReclamado = :outrosDebitosReclamado").setParameter("outrosDebitosReclamado", (Object)outrosDebitosReclamado).executeUpdate();
        }
    }
}

