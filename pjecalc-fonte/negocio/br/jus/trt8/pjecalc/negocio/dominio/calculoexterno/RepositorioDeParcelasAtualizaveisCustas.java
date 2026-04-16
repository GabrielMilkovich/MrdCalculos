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
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustas;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeParcelasAtualizaveisCustas")
public class RepositorioDeParcelasAtualizaveisCustas
extends RepositorioBase<ParcelasAtualizaveisCustas> {
    public RepositorioDeParcelasAtualizaveisCustas() {
        super(ParcelasAtualizaveisCustas.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public void removerCustas(List<ParcelasAtualizaveisCustas> custasParaRemover) {
        if (custasParaRemover != null && !custasParaRemover.isEmpty()) {
            this.entityManager.createQuery("DELETE FROM ParcelasAtualizaveisCustas c WHERE c IN (:custasParaRemover)").setParameter("custasParaRemover", custasParaRemover).executeUpdate();
            this.entityManager.flush();
        }
    }
}

