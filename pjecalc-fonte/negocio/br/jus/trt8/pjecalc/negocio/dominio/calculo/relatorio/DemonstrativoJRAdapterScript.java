/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoJRAdapter;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class DemonstrativoJRAdapterScript
extends DemonstrativoJRAdapter {
    private Map<Object, Object> demonstrativo;

    public DemonstrativoJRAdapterScript(Map<Object, Object> demonstrativo) {
        this.demonstrativo = demonstrativo;
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<DemonstrativoJRAdapter.DemonstrativoVerbaAdapter> getVerbas() {
        List list = (List)this.demonstrativo.get("verbas");
        return new JRAdapterDataSource<DemonstrativoJRAdapter.DemonstrativoVerbaAdapter>(new DemonstrativoVerbaJRAdapterScript(), list);
    }

    class DemonstrativoOcorrenciaJRAdapterScript
    extends DemonstrativoJRAdapter.DemonstrativoOcorrenciaAdapter {
        private Map<Object, Object> ocorrencia;

        @Override
        public JRAdapter adapt(Object ocorrencia) {
            this.ocorrencia = (Map)ocorrencia;
            return this;
        }

        @Override
        public Periodo getPeriodo() {
            Map periodo = (Map)this.ocorrencia.get("periodo");
            List data1 = (List)periodo.get("data1");
            List data2 = (List)periodo.get("data2");
            return new Periodo(HelperDate.getInstance((Integer)data1.get(2), (Integer)data1.get(1), (Integer)data1.get(0)), HelperDate.getInstance((Integer)data2.get(2), (Integer)data2.get(1), (Integer)data2.get(0)));
        }

        @Override
        public BigDecimal getBase() {
            return new BigDecimal(this.ocorrencia.get("base").toString());
        }

        @Override
        public BigDecimal getDivisor() {
            return new BigDecimal(this.ocorrencia.get("divisor").toString());
        }

        @Override
        public BigDecimal getMultiplicador() {
            return new BigDecimal(this.ocorrencia.get("multiplicador").toString());
        }

        @Override
        public BigDecimal getQuantidade() {
            return new BigDecimal(this.ocorrencia.get("quantidade").toString());
        }

        @Override
        public String getDobra() {
            return (String)this.ocorrencia.get("dobra");
        }

        @Override
        public BigDecimal getDevido() {
            return new BigDecimal(this.ocorrencia.get("devido").toString());
        }

        @Override
        public BigDecimal getPago() {
            return new BigDecimal(this.ocorrencia.get("pago").toString());
        }

        @Override
        public BigDecimal getDiferenca() {
            return new BigDecimal(this.ocorrencia.get("diferenca").toString());
        }

        @Override
        public BigDecimal getIndiceAcumulado() {
            return new BigDecimal(this.ocorrencia.get("indiceAcumulado").toString());
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return new BigDecimal(this.ocorrencia.get("valorCorrigido").toString());
        }
    }

    class DemonstrativoVerbaJRAdapterScript
    extends DemonstrativoJRAdapter.DemonstrativoVerbaAdapter {
        private Map<Object, Object> verba;

        @Override
        public DemonstrativoVerbaJRAdapterScript adapt(Object verba) {
            this.verba = (Map)verba;
            return this;
        }

        @Override
        public String getNome() {
            return (String)this.verba.get("nome");
        }

        @Override
        public String getComentario() {
            return "";
        }

        @Override
        public Periodo getPeriodo() {
            Map periodo = (Map)this.verba.get("periodo");
            List data1 = (List)periodo.get("data1");
            List data2 = (List)periodo.get("data2");
            return new Periodo(HelperDate.getInstance((Integer)data1.get(2), (Integer)data1.get(1), (Integer)data1.get(0)), HelperDate.getInstance((Integer)data2.get(2), (Integer)data2.get(1), (Integer)data2.get(0)));
        }

        @Override
        public BigDecimal getTotalDoValorCorrigido() {
            return new BigDecimal(this.verba.get("total").toString());
        }

        @Override
        public String getIncidencia() {
            return (String)this.verba.get("incidencia");
        }

        @Override
        public String getFormula() {
            return (String)this.verba.get("formula");
        }

        @Override
        public JRAdapterDataSource<DemonstrativoJRAdapter.DemonstrativoOcorrenciaAdapter> getOcorrencias() {
            List list = (List)this.verba.get("ocorrencias");
            return new JRAdapterDataSource<DemonstrativoJRAdapter.DemonstrativoOcorrenciaAdapter>(new DemonstrativoOcorrenciaJRAdapterScript(), list);
        }
    }
}

