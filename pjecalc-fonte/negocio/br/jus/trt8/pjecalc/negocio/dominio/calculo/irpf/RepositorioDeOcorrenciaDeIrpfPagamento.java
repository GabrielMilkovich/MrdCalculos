/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.NoResultException
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfPagamento;
import java.util.Date;
import java.util.List;
import javax.persistence.NoResultException;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDeIrpfPagamento")
public class RepositorioDeOcorrenciaDeIrpfPagamento
extends RepositorioBase<OcorrenciaDeIrpfPagamento> {
    public RepositorioDeOcorrenciaDeIrpfPagamento() {
        super(OcorrenciaDeIrpfPagamento.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public void removerDeOcorrenciasPagamento(Irpf irpf) {
        Query query = this.entityManager.createQuery("delete from OcorrenciaDeIrpfPagamento o where o.irpf = :irpf");
        query.setParameter("irpf", (Object)irpf);
        query.executeUpdate();
    }

    public OcorrenciaDeIrpfPagamento obterParaDataDoEventoComSaldoAPagar(Date dataEvento, Irpf irpf) {
        Query query = this.entityManager.createQuery("select o from OcorrenciaDeIrpfPagamento o where o.irpf = :irpf and o.dataEvento = :dataEvento and o.dataPagamento = (select max(o2.dataPagamento) from OcorrenciaDeIrpfPagamento o2 where o2.irpf = :irpf and o2.dataEvento = :dataEvento)");
        query.setParameter("irpf", (Object)irpf);
        query.setParameter("dataEvento", (Object)dataEvento);
        try {
            return (OcorrenciaDeIrpfPagamento)query.getSingleResult();
        }
        catch (NoResultException e) {
            return null;
        }
    }

    public OcorrenciaDeIrpfPagamento obterOcorrenciaDoSaldoParaDataDoEvento(Date dataEvento, Irpf irpf) {
        Query query = this.entityManager.createQuery("select o from OcorrenciaDeIrpfPagamento o where o.irpf = :irpf and o.dataEvento = :dataEvento and o.calculadoNoSaldo = :ehSaldo)");
        query.setParameter("irpf", (Object)irpf);
        query.setParameter("dataEvento", (Object)dataEvento);
        query.setParameter("ehSaldo", (Object)Boolean.TRUE);
        try {
            return (OcorrenciaDeIrpfPagamento)query.getSingleResult();
        }
        catch (NoResultException e) {
            return null;
        }
    }

    public List<OcorrenciaDeIrpfPagamento> obterParaDataDoEventoPagamentoNoDiaDoSaldo(Date dataEvento, Irpf irpf) {
        Query query = this.entityManager.createQuery("select o from OcorrenciaDeIrpfPagamento o where o.irpf = :irpf and o.dataPagamento = :dataPagamento and (o.calculadoNoSaldo = :ehSaldo or (o.calculadoNoSaldo = :ehSaldoF and o.pagamentoNoSaldo = :ehPagoF))");
        query.setParameter("irpf", (Object)irpf);
        query.setParameter("dataPagamento", (Object)dataEvento);
        query.setParameter("ehSaldo", (Object)Boolean.TRUE);
        query.setParameter("ehSaldoF", (Object)Boolean.FALSE);
        query.setParameter("ehPagoF", (Object)Boolean.FALSE);
        return query.getResultList();
    }

    public List<OcorrenciaDeIrpfPagamento> obterParaDataDoEvento(Irpf irpf) {
        Query query = this.entityManager.createQuery("select o from OcorrenciaDeIrpfPagamento o where o.irpf = :irpf and o.pagamentoNoSaldo = :ehPagamento)");
        query.setParameter("irpf", (Object)irpf);
        query.setParameter("ehPagamento", (Object)Boolean.TRUE);
        return query.getResultList();
    }

    public List<OcorrenciaDeIrpfPagamento> obterParaDataDoEventoPagamentoNoDiaDoSaldo2(Date dataEvento, Irpf irpf) {
        Query query = this.entityManager.createQuery("select o from OcorrenciaDeIrpfPagamento o where o.irpf = :irpf and o.dataPagamento = :dataPagamento and ( (o.calculadoNoSaldo = :ehSaldoT and o.pagamentoNoSaldo = :ehPagoT) or (o.calculadoNoSaldo = :ehSaldoF and o.pagamentoNoSaldo = :ehPagoF)))");
        query.setParameter("irpf", (Object)irpf);
        query.setParameter("dataPagamento", (Object)dataEvento);
        query.setParameter("ehSaldoT", (Object)Boolean.TRUE);
        query.setParameter("ehSaldoF", (Object)Boolean.FALSE);
        query.setParameter("ehPagoT", (Object)Boolean.TRUE);
        query.setParameter("ehPagoF", (Object)Boolean.FALSE);
        return query.getResultList();
    }
}

