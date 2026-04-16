/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SalarioFamiliaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.OcorrenciaDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
import java.math.BigDecimal;
import java.util.Date;

public class SalarioFamiliaJRAdapterPadrao
extends SalarioFamiliaJRAdapter {
    private SalarioFamilia salarioFamilia;

    public SalarioFamiliaJRAdapterPadrao() {
    }

    public SalarioFamiliaJRAdapterPadrao(Calculo calculo) {
        this.salarioFamilia = calculo.getSalarioFamilia();
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public String getFormula() {
        return this.salarioFamilia.getLegendaDaFormula().getLegenda();
    }

    @Override
    public String getPeriodo() {
        Periodo periodo = new Periodo(this.salarioFamilia.getDataInicial(), this.salarioFamilia.getDataFinal());
        Calculo calculo = this.salarioFamilia.getCalculo();
        if (Utils.naoNulo(calculo.getDataAdmissao()) && HelperDate.compareMonthAndYear(calculo.getDataAdmissao(), periodo.getInicial())) {
            periodo.setInicial(calculo.getDataAdmissao());
        }
        if (Utils.naoNulo(calculo.getDataDemissao()) && HelperDate.compareMonthAndYear(calculo.getDataDemissao(), periodo.getFinal())) {
            periodo.setFinal(calculo.getDataDemissao());
        } else {
            periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).lastDayOfTheMonth().getDate());
        }
        return periodo.toString();
    }

    @Override
    public JRAdapterDataSource<SalarioFamiliaJRAdapter.OcorrenciaSalarioFamiliaAdapter> getOcorrencias() {
        return new JRAdapterDataSource<SalarioFamiliaJRAdapter.OcorrenciaSalarioFamiliaAdapter>(new OcorrenciaSalarioFamiliaAdapterPadrao(), this.salarioFamilia.getOcorrencias());
    }

    @Override
    public BigDecimal getTotalDoDevidoCorrigido() {
        return this.salarioFamilia.getTotalDoDevidoCorrigido();
    }

    @Override
    public BigDecimal getTotalDeJuros() {
        return this.salarioFamilia.getTotalDeJuros();
    }

    @Override
    public BigDecimal getTotalGeral() {
        return this.salarioFamilia.getTotalGeral();
    }

    public class OcorrenciaSalarioFamiliaAdapterPadrao
    extends SalarioFamiliaJRAdapter.OcorrenciaSalarioFamiliaAdapter {
        private OcorrenciaDeSalarioFamilia ocorrencia;

        @Override
        public OcorrenciaSalarioFamiliaAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeSalarioFamilia)ocorrencia;
            return this;
        }

        @Override
        public Date getOcorrencia() {
            return this.ocorrencia.getDataInicioOcorrencia();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevido();
        }

        @Override
        public BigDecimal getIndice() {
            return this.ocorrencia.getIndiceAcumulado();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJuros();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotal();
        }

        @Override
        public BigDecimal getSalarioReferencia() {
            return this.ocorrencia.getValorRemuneracaoMensal();
        }

        @Override
        public BigDecimal getSalarioParaFaixa() {
            return this.ocorrencia.getValorSalarioFamilia();
        }

        @Override
        public Integer getQuantidadeFilhos() {
            return this.ocorrencia.getQuantidadeFilhos();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getValorDevidoCorrigido();
        }
    }
}

