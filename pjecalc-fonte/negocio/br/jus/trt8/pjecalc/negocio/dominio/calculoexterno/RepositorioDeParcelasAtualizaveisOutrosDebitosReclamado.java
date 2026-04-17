/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.NoResultException
 *  org.jboss.seam.annotations.Name
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import javax.persistence.NoResultException;
import org.jboss.seam.annotations.Name;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Name(value="repositorioDeParcelasAtualizaveisOutrosDebitosReclamado")
public class RepositorioDeParcelasAtualizaveisOutrosDebitosReclamado
extends RepositorioBase<ParcelasAtualizaveisOutrosDebitosReclamado> {
    private final Logger logger = LoggerFactory.getLogger(RepositorioDeParcelasAtualizaveisOutrosDebitosReclamado.class);

    public RepositorioDeParcelasAtualizaveisOutrosDebitosReclamado() {
        super(ParcelasAtualizaveisOutrosDebitosReclamado.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public ParcelasAtualizaveisOutrosDebitosReclamado obterDoCalculo(Calculo calculo) {
        try {
            return (ParcelasAtualizaveisOutrosDebitosReclamado)this.entityManager.createQuery("FROM ParcelasAtualizaveisOutrosDebitosReclamado p WHERE p.calculoExterno = :calculo").setParameter("calculo", (Object)calculo).getSingleResult();
        }
        catch (NoResultException e) {
            this.logger.info(e.getMessage(), (Throwable)e);
            return new ParcelasAtualizaveisOutrosDebitosReclamado();
        }
    }
}

