/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.Component
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.JustificativaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.justificativa.Justificativa;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeJustificativa;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.jboss.seam.Component;

public class JustificativaJRAdapterPadrao
extends JustificativaJRAdapter {
    private Calculo calculo;
    private List<Justificativa> ocorrencias;
    private static final String REGRA_DROOLS = "drools";
    private static final String REGRA_PRECATORIO = "precatorios";

    public JustificativaJRAdapterPadrao(Calculo calculo, boolean isAtualizacao) {
        this(calculo, isAtualizacao, false);
    }

    public JustificativaJRAdapterPadrao(Calculo calculo, boolean isAtualizacao, boolean isRegraPrecatorio) {
        ServicoDeJustificativa servicoDeJustificativa = (ServicoDeJustificativa)Component.getInstance(ServicoDeJustificativa.class);
        this.calculo = calculo;
        this.ocorrencias = new ArrayList<Justificativa>();
        if (!isRegraPrecatorio) {
            servicoDeJustificativa.justificar(isAtualizacao);
        }
        int num = 0;
        Set<String> criterios = isRegraPrecatorio ? servicoDeJustificativa.getCriteriosPrecatorio() : servicoDeJustificativa.getMensagens();
        for (String mensagem : criterios) {
            Justificativa justificativa = new Justificativa();
            justificativa.setRegra(isRegraPrecatorio ? REGRA_PRECATORIO : REGRA_DROOLS);
            justificativa.setNumero(++num);
            justificativa.setTexto(mensagem);
            this.ocorrencias.add(justificativa);
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<JustificativaJRAdapter.JustificativaOcorrenciaAdapter> getOcorrencias() {
        return new JRAdapterDataSource<JustificativaJRAdapter.JustificativaOcorrenciaAdapter>(new JustificativaOcorrenciaAdapterPadrao(this.calculo), this.ocorrencias);
    }

    public class JustificativaOcorrenciaAdapterPadrao
    extends JustificativaJRAdapter.JustificativaOcorrenciaAdapter {
        private Calculo calculo;
        private Justificativa ocorrencia;

        public JustificativaOcorrenciaAdapterPadrao(Calculo calculo) {
            this.calculo = calculo;
        }

        @Override
        public JRAdapter adapt(Object ocorrencia) {
            this.ocorrencia = (Justificativa)ocorrencia;
            return this;
        }

        @Override
        public Integer getNumero() {
            return this.ocorrencia.getNumero();
        }

        @Override
        public String getTextoReal() {
            return this.ocorrencia.getRegra().equals(JustificativaJRAdapterPadrao.REGRA_DROOLS) ? this.ocorrencia.getTexto() : this.ocorrencia.getTextoReal(this.calculo);
        }
    }
}

