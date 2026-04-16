/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfAtualizacao;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDeIrpfAtualizacao")
public class RepositorioDeOcorrenciaDeIrpfAtualizacao
extends RepositorioBase<OcorrenciaDeIrpfAtualizacao> {
    public RepositorioDeOcorrenciaDeIrpfAtualizacao() {
        super(OcorrenciaDeIrpfAtualizacao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public void salvar(OcorrenciaDeIrpfAtualizacao ocorrenciaDeIrpfAtualizacao) {
        this.salvar(ocorrenciaDeIrpfAtualizacao, true);
    }

    public void removerDeOcorrenciasAtualizacao(Irpf irpf) {
        Query query = this.entityManager.createQuery("delete from OcorrenciaDeIrpfAtualizacao o where o.irpf = :irpf");
        query.setParameter("irpf", (Object)irpf);
        query.executeUpdate();
    }

    public List<OcorrenciaDeIrpfAtualizacao> obterAteDataEvento(Irpf irpf, Date dataEvento) {
        Query query = this.entityManager.createQuery("select o from OcorrenciaDeIrpfAtualizacao o where o.irpf = :irpf and o.dataEvento <= :dataEvento order by o.dataEvento");
        query.setParameter("irpf", (Object)irpf);
        query.setParameter("dataEvento", (Object)dataEvento);
        return query.getResultList();
    }

    public List<OcorrenciaDeIrpfAtualizacao> obterOcorrenciasDaData(Irpf irpf, Date dataEvento) {
        Query query = this.entityManager.createQuery("select o from OcorrenciaDeIrpfAtualizacao o where o.irpf = :irpf and o.dataEvento = :dataEvento");
        query.setParameter("irpf", (Object)irpf);
        query.setParameter("dataEvento", (Object)dataEvento);
        return query.getResultList();
    }

    public BigDecimal somaQuantidadeCompetenciasAteOSaldo(Irpf irpf) {
        Query query = this.entityManager.createQuery("select sum(o.quantidadeCompetencias) from OcorrenciaDeIrpfAtualizacao o where o.irpf = :irpf and o.hasPagamento = 'S'");
        query.setParameter("irpf", (Object)irpf);
        return (BigDecimal)query.getSingleResult();
    }
}

