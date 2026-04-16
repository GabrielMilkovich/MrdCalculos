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
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssJRAdapter;
import java.math.BigDecimal;
import java.util.Date;
import java.util.Iterator;

public class InssJRAdapterPadrao
extends InssJRAdapter {
    private static final Date DATA_PARAMETRO_PARA_APRESENTACAO_CAMPOS_EMPRESA_RAT = HelperDate.getInstance(1986, 11, 31).getDate();
    private Date dataPrimeiraOcorrenciaDevido;
    private Date dataPrimeiraOcorrenciaPago;
    private Inss inss;

    public InssJRAdapterPadrao() {
    }

    public InssJRAdapterPadrao(Calculo calculo) {
        Inss inssDoCalculo = calculo.getInss();
        if (Utils.naoNulo(inssDoCalculo.getId())) {
            this.inss = inssDoCalculo;
        } else {
            Calculo calculoAtualizado = Calculo.obter(calculo.getId());
            this.inss = calculoAtualizado.getInss();
        }
        this.verificaDataDasPrimeirasOcorrencias();
    }

    private void verificaDataDasPrimeirasOcorrencias() {
        block1: {
            OcorrenciaDeInss ocorrencia;
            Iterator<OcorrenciaDeInss> iterator;
            if (Utils.naoNulo(this.inss.getInssSobreSalariosDevidos()) && !this.inss.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty() && (iterator = this.inss.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().iterator()).hasNext()) {
                ocorrencia = iterator.next();
                this.dataPrimeiraOcorrenciaDevido = ocorrencia.getDataOcorrenciaInss();
            }
            if (!this.inss.getApurarInssSobreSalariosPagos().booleanValue() || !Utils.naoNulo(this.inss.getInssSobreSalariosPagos()) || this.inss.getInssSobreSalariosPagos().getOcorrencias().isEmpty() || !(iterator = this.inss.getInssSobreSalariosPagos().getOcorrencias().iterator()).hasNext()) break block1;
            ocorrencia = (OcorrenciaDeInssSobreSalariosPagos)iterator.next();
            this.dataPrimeiraOcorrenciaPago = ocorrencia.getDataOcorrenciaInss();
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    private boolean getMostrarSecaoSalarioPago() {
        return this.inss.getApurarInssSobreSalariosPagos() != false && !this.inss.getInssSobreSalariosPagos().getOcorrencias().isEmpty();
    }

    private boolean getMostrarSecaoSalarioDevido() {
        return !this.inss.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty();
    }

    @Override
    public Periodo getPeriodoSalariosDevidos() {
        return new Periodo(this.inss.getInssSobreSalariosDevidos().getDataInicioPeriodo(), this.inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo());
    }

    @Override
    public Periodo getPeriodoSalariosPagos() {
        return new Periodo(this.inss.getInssSobreSalariosPagos().getDataInicioPeriodo(), this.inss.getInssSobreSalariosPagos().getDataTerminoPeriodo());
    }

    @Override
    public boolean getDataPrimeiraOcorrenciaDevidoMaiorQue1986() {
        if (Utils.naoNulo(this.dataPrimeiraOcorrenciaDevido)) {
            return HelperDate.dateAfter(this.dataPrimeiraOcorrenciaDevido, DATA_PARAMETRO_PARA_APRESENTACAO_CAMPOS_EMPRESA_RAT);
        }
        return false;
    }

    @Override
    public boolean getDataPrimeiraOcorrenciaPagoMaiorQue1986() {
        if (Utils.naoNulo(this.dataPrimeiraOcorrenciaPago)) {
            return HelperDate.dateAfter(this.dataPrimeiraOcorrenciaPago, DATA_PARAMETRO_PARA_APRESENTACAO_CAMPOS_EMPRESA_RAT);
        }
        return false;
    }

    @Override
    public boolean getMostrarSecaoSalarioDevidoReclamado() {
        return this.inss.getInssSobreSalariosDevidos().getApurarInssSegurado() != false && this.getMostrarSecaoSalarioDevido();
    }

    @Override
    public boolean getMostrarSecaoSalarioDevidoReclamante() {
        return this.inss.getInssSobreSalariosDevidos().getCobrarInssDoReclamante() != false && this.inss.getInssSobreSalariosDevidos().getApurarInssSegurado() != false && this.getMostrarSecaoSalarioDevido();
    }

    @Override
    public boolean getMostrarSecaoSalarioDevidoEmpresa() {
        return this.inss.existeApuracaoParaEmpresa() && this.getMostrarSecaoSalarioDevido();
    }

    @Override
    public boolean getMostrarSecaoSalarioDevidoSAT() {
        return this.inss.existeApuracaoParaSAT() && this.getMostrarSecaoSalarioDevido();
    }

    @Override
    public boolean getMostrarSecaoSalarioDevidoTerceiros() {
        return this.inss.existeApuracaoParaTerceiros() != false && this.getMostrarSecaoSalarioDevido();
    }

    @Override
    public boolean getMostrarSecaoSalarioPagoSegurado() {
        return this.getMostrarSecaoSalarioPago();
    }

    @Override
    public boolean getMostrarSecaoSalarioPagoEmpresa() {
        return this.getMostrarSecaoSalarioPago() && this.inss.existeApuracaoParaEmpresa();
    }

    @Override
    public boolean getMostrarSecaoSalarioPagoSAT() {
        return this.getMostrarSecaoSalarioPago() && this.inss.existeApuracaoParaSAT();
    }

    @Override
    public boolean getMostrarSecaoSalarioPagoTerceiros() {
        return this.getMostrarSecaoSalarioPago() && this.inss.existeApuracaoParaTerceiros() != false;
    }

    @Override
    public String getFormulaDevido() {
        return this.inss.getLegendaDaFormula().getLegendaSalariosDevidos();
    }

    @Override
    public String getFormulaPago() {
        return this.inss.getLegendaDaFormula().getLegendaSalariosPagos();
    }

    @Override
    public JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter> getOcorrenciasSeguradoDevidoReclamante() {
        if (this.getMostrarSecaoSalarioDevidoReclamante()) {
            return new JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter>(new OcorrenciaDeInssReclamanteAdapterPadrao(), this.inss.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba());
        }
        return null;
    }

    @Override
    public JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter> getOcorrenciasSeguradoDevidoReclamado() {
        if (this.getMostrarSecaoSalarioDevidoReclamado()) {
            return new JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter>(new OcorrenciaDeInssReclamadoAdapterPadrao(), this.inss.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba());
        }
        return null;
    }

    @Override
    public JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter> getOcorrenciasSeguradoDevidoEmpresa() {
        if (this.getMostrarSecaoSalarioDevidoEmpresa()) {
            return new JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter>(new OcorrenciaDeInssDevidoEmpresaAdapterPadrao(), this.inss.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba());
        }
        return null;
    }

    @Override
    public JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter> getOcorrenciasSeguradoDevidoSAT() {
        if (this.getMostrarSecaoSalarioDevidoSAT()) {
            return new JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter>(new OcorrenciaDeInssDevidoSATAdapterPadrao(), this.inss.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba());
        }
        return null;
    }

    @Override
    public JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter> getOcorrenciasSeguradoDevidoTerceiros() {
        if (this.getMostrarSecaoSalarioDevidoTerceiros()) {
            return new JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter>(new OcorrenciaDeInssDevidoTerceirosAdapterPadrao(), this.inss.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba());
        }
        return null;
    }

    @Override
    public JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter> getOcorrenciasPagoSegurado() {
        if (this.getMostrarSecaoSalarioPagoSegurado()) {
            return new JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter>(new OcorrenciaDeInssPagoSeguradoAdapterPadrao(), this.inss.getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos());
        }
        return null;
    }

    @Override
    public JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter> getOcorrenciasPagoEmpresa() {
        if (this.getMostrarSecaoSalarioPagoEmpresa()) {
            return new JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter>(new OcorrenciaDeInssPagoEmpresaAdapterPadrao(), this.inss.getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos());
        }
        return null;
    }

    @Override
    public JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter> getOcorrenciasPagoSAT() {
        if (this.getMostrarSecaoSalarioPagoSAT()) {
            return new JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter>(new OcorrenciaDeInssPagoSATAdapterPadrao(), this.inss.getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos());
        }
        return null;
    }

    @Override
    public JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter> getOcorrenciasPagoTerceiros() {
        if (this.getMostrarSecaoSalarioPagoTerceiros()) {
            return new JRAdapterDataSource<InssJRAdapter.OcorrenciaDeInssAdapter>(new OcorrenciaDeInssPagoTerceirosAdapterPadrao(), this.inss.getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos());
        }
        return null;
    }

    @Override
    public BigDecimal getValorTotalOcorrenciasDevidoReclamante() {
        return Utils.arredondarValorMonetario(this.inss.getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante());
    }

    @Override
    public BigDecimal getValorTotalOcorrenciasDevidoReclamado() {
        return this.inss.getInssSobreSalariosDevidos().getValorTotalInssSegurado();
    }

    @Override
    public BigDecimal getTotalDeJurosOcorrenciasDevidoReclamado() {
        return this.inss.getInssSobreSalariosDevidos().getJurosTotalInssSegurado();
    }

    @Override
    public BigDecimal getTotalDeMultaOcorrenciasDevidoReclamado() {
        return this.inss.getInssSobreSalariosDevidos().getMultaTotalInssSegurado();
    }

    @Override
    public BigDecimal getTotalGeralOcorrenciasDevidoReclamado() {
        return this.inss.getInssSobreSalariosDevidos().getTotalGeralInssSegurado();
    }

    @Override
    public BigDecimal getValorTotalOcorrenciasDevidoEmpresa() {
        return this.inss.getInssSobreSalariosDevidos().getValorTotalInssEmpresa();
    }

    @Override
    public BigDecimal getTotalDeJurosOcorrenciasDevidoEmpresa() {
        return this.inss.getInssSobreSalariosDevidos().getJurosTotalInssEmpresa();
    }

    @Override
    public BigDecimal getTotalDeMultaOcorrenciasDevidoEmpresa() {
        return this.inss.getInssSobreSalariosDevidos().getMultaTotalInssEmpresa();
    }

    @Override
    public BigDecimal getTotalGeralOcorrenciasDevidoEmpresa() {
        return this.inss.getInssSobreSalariosDevidos().getTotalGeralInssEmpresa();
    }

    @Override
    public BigDecimal getValorTotalOcorrenciasDevidoSAT() {
        return this.inss.getInssSobreSalariosDevidos().getValorTotalInssSAT();
    }

    @Override
    public BigDecimal getTotalDeJurosOcorrenciasDevidoSAT() {
        return this.inss.getInssSobreSalariosDevidos().getJurosTotalInssSAT();
    }

    @Override
    public BigDecimal getTotalDeMultaOcorrenciasDevidoSAT() {
        return this.inss.getInssSobreSalariosDevidos().getMultaTotalInssSAT();
    }

    @Override
    public BigDecimal getTotalGeralOcorrenciasDevidoSAT() {
        return this.inss.getInssSobreSalariosDevidos().getTotalGeralInssSAT();
    }

    @Override
    public BigDecimal getValorTotalOcorrenciasDevidoTerceiros() {
        return this.inss.getInssSobreSalariosDevidos().getValorTotalInssTerceiros();
    }

    @Override
    public BigDecimal getTotalDeJurosOcorrenciasDevidoTerceiros() {
        return this.inss.getInssSobreSalariosDevidos().getJurosTotalInssTerceiros();
    }

    @Override
    public BigDecimal getTotalGeralOcorrenciasDevidoTerceiros() {
        return this.inss.getInssSobreSalariosDevidos().getTotalGeralInssTerceiros();
    }

    @Override
    public BigDecimal getTotalDeMultaOcorrenciasDevidoTerceiros() {
        return this.inss.getInssSobreSalariosDevidos().getMultaTotalInssTerceiros();
    }

    @Override
    public BigDecimal getValorTotalOcorrenciasPagoSegurado() {
        return this.inss.getInssSobreSalariosPagos().getValorTotalInssSegurado();
    }

    @Override
    public BigDecimal getTotalDeJurosOcorrenciasPagoSegurado() {
        return this.inss.getInssSobreSalariosPagos().getJurosTotalInssSegurado();
    }

    @Override
    public BigDecimal getTotalDeMultaOcorrenciasPagoSegurado() {
        return this.inss.getInssSobreSalariosPagos().getMultaTotalInssSegurado();
    }

    @Override
    public BigDecimal getTotalGeralOcorrenciasPagoSegurado() {
        return this.inss.getInssSobreSalariosPagos().getTotalGeralInssSegurado();
    }

    @Override
    public BigDecimal getValorTotalOcorrenciasPagoEmpresa() {
        return this.inss.getInssSobreSalariosPagos().getValorTotalInssEmpresa();
    }

    @Override
    public BigDecimal getTotalDeJurosOcorrenciasPagoEmpresa() {
        return this.inss.getInssSobreSalariosPagos().getJurosTotalInssEmpresa();
    }

    @Override
    public BigDecimal getTotalDeMultaOcorrenciasPagoEmpresa() {
        return this.inss.getInssSobreSalariosPagos().getMultaTotalInssEmpresa();
    }

    @Override
    public BigDecimal getTotalGeralOcorrenciasPagoEmpresa() {
        return this.inss.getInssSobreSalariosPagos().getTotalGeralInssEmpresa();
    }

    @Override
    public BigDecimal getValorTotalOcorrenciasPagoSAT() {
        return this.inss.getInssSobreSalariosPagos().getValorTotalInssSAT();
    }

    @Override
    public BigDecimal getTotalDeJurosOcorrenciasPagoSAT() {
        return this.inss.getInssSobreSalariosPagos().getJurosTotalInssSAT();
    }

    @Override
    public BigDecimal getTotalDeMultaOcorrenciasPagoSAT() {
        return this.inss.getInssSobreSalariosPagos().getMultaTotalInssSAT();
    }

    @Override
    public BigDecimal getTotalGeralOcorrenciasPagoSAT() {
        return this.inss.getInssSobreSalariosPagos().getTotalGeralInssSAT();
    }

    @Override
    public BigDecimal getValorTotalOcorrenciasPagoTerceiros() {
        return this.inss.getInssSobreSalariosPagos().getValorTotalInssTerceiros();
    }

    @Override
    public BigDecimal getTotalDeJurosOcorrenciasPagoTerceiros() {
        return this.inss.getInssSobreSalariosPagos().getJurosTotalInssTerceiros();
    }

    @Override
    public BigDecimal getTotalDeMultaOcorrenciasPagoTerceiros() {
        return this.inss.getInssSobreSalariosPagos().getMultaTotalInssTerceiros();
    }

    @Override
    public BigDecimal getTotalGeralOcorrenciasPagoTerceiros() {
        return this.inss.getInssSobreSalariosPagos().getTotalGeralInssTerceiros();
    }

    public class OcorrenciaDeInssPagoTerceirosAdapterPadrao
    extends OcorrenciaDeInssSalarioPagoAdapterPadrao {
        @Override
        public OcorrenciaDeInssPagoTerceirosAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosPagos)ocorrencia;
            return this;
        }

        @Override
        public BigDecimal getAliquota() {
            return this.ocorrencia.getAliquotaTerceiros();
        }

        @Override
        public BigDecimal getInssSalarioPago() {
            return this.ocorrencia.getValorTotalInssTerceiros();
        }

        @Override
        public BigDecimal getInssRecolhido() {
            return this.ocorrencia.getValorRecolhidoTerceiros();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevidoTerceiros();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getValorDevidoTerceirosCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJurosValorDevidoTerceiros();
        }

        @Override
        public BigDecimal getMulta() {
            return this.ocorrencia.getMultaValorDevidoTerceiros();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotalValorDevidoTerceiros();
        }
    }

    public class OcorrenciaDeInssPagoSATAdapterPadrao
    extends OcorrenciaDeInssSalarioPagoAdapterPadrao {
        @Override
        public OcorrenciaDeInssPagoSATAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosPagos)ocorrencia;
            return this;
        }

        @Override
        public BigDecimal getAliquota() {
            return this.ocorrencia.getAliquotaSAT();
        }

        @Override
        public BigDecimal getInssSalarioPago() {
            return this.ocorrencia.getValorTotalInssSAT();
        }

        @Override
        public BigDecimal getInssTeto() {
            if (HelperDate.dateAfter(this.ocorrencia.getDataOcorrenciaInss(), DATA_PARAMETRO_PARA_APRESENTACAO_CAMPOS_EMPRESA_RAT)) {
                return this.ocorrencia.getValorTetoEmpresa();
            }
            return null;
        }

        @Override
        public BigDecimal getInssRecolhido() {
            return this.ocorrencia.getValorRecolhidoSAT();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevidoSAT();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getValorDevidoSATCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJurosValorDevidoSAT();
        }

        @Override
        public BigDecimal getMulta() {
            return this.ocorrencia.getMultaValorDevidoSAT();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotalValorDevidoSAT();
        }
    }

    public class OcorrenciaDeInssPagoEmpresaAdapterPadrao
    extends OcorrenciaDeInssSalarioPagoAdapterPadrao {
        @Override
        public OcorrenciaDeInssPagoEmpresaAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosPagos)ocorrencia;
            return this;
        }

        @Override
        public BigDecimal getAliquota() {
            return this.ocorrencia.getAliquotaEmpresa();
        }

        @Override
        public BigDecimal getInssSalarioPago() {
            return this.ocorrencia.getValorTotalInssEmpresa();
        }

        @Override
        public BigDecimal getInssTeto() {
            if (HelperDate.dateBeforeOrEquals(this.ocorrencia.getDataOcorrenciaInss(), DATA_PARAMETRO_PARA_APRESENTACAO_CAMPOS_EMPRESA_RAT)) {
                return this.ocorrencia.getValorTetoEmpresa();
            }
            return null;
        }

        @Override
        public BigDecimal getInssRecolhido() {
            return this.ocorrencia.getValorRecolhidoEmpresa();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevidoEmpresaFinal();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getValorDevidoEmpresaFinalCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJurosValorDevidoEmpresaFinal();
        }

        @Override
        public BigDecimal getMulta() {
            return this.ocorrencia.getMultaValorDevidoEmpresaFinal();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotalValorDevidoEmpresaFinal();
        }
    }

    public class OcorrenciaDeInssPagoSeguradoAdapterPadrao
    extends OcorrenciaDeInssSalarioPagoAdapterPadrao {
        @Override
        public OcorrenciaDeInssPagoSeguradoAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosPagos)ocorrencia;
            return this;
        }
    }

    public class OcorrenciaDeInssDevidoTerceirosAdapterPadrao
    extends OcorrenciaDeInssSalarioDevidoAdapterPadrao {
        @Override
        public OcorrenciaDeInssDevidoTerceirosAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosDevidos)ocorrencia;
            return this;
        }

        @Override
        public BigDecimal getAliquotaCheia() {
            return this.ocorrencia.getAliquotaTerceiros();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevidoTerceiros();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getValorDevidoTerceirosCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJurosValorDevidoTerceiros();
        }

        @Override
        public BigDecimal getMulta() {
            return this.ocorrencia.getMultaValorDevidoTerceiros();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotalValorDevidoTerceiros();
        }
    }

    public class OcorrenciaDeInssDevidoSATAdapterPadrao
    extends OcorrenciaDeInssSalarioDevidoAdapterPadrao {
        @Override
        public OcorrenciaDeInssDevidoSATAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosDevidos)ocorrencia;
            return this;
        }

        @Override
        public BigDecimal getAliquota() {
            return this.ocorrencia.getAliquotaSAT();
        }

        @Override
        public BigDecimal getInssSalarioPago() {
            return BigDecimal.ZERO;
        }

        @Override
        public BigDecimal getInssTeto() {
            return BigDecimal.ZERO;
        }

        @Override
        public BigDecimal getAliquotaCheia() {
            return this.ocorrencia.getAliquotaSAT();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevidoSAT();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getValorDevidoSATCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJurosValorDevidoSAT();
        }

        @Override
        public BigDecimal getMulta() {
            return this.ocorrencia.getMultaValorDevidoSAT();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotalValorDevidoSAT();
        }
    }

    public class OcorrenciaDeInssDevidoEmpresaAdapterPadrao
    extends OcorrenciaDeInssSalarioDevidoAdapterPadrao {
        @Override
        public OcorrenciaDeInssDevidoEmpresaAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosDevidos)ocorrencia;
            return this;
        }

        @Override
        public BigDecimal getAliquota() {
            return this.ocorrencia.getAliquotaEmpresa();
        }

        @Override
        public BigDecimal getInssSalarioPago() {
            return this.ocorrencia.getValorTotalInssEmpresa();
        }

        @Override
        public BigDecimal getInssTeto() {
            if (HelperDate.dateBeforeOrEquals(this.ocorrencia.getDataOcorrenciaInss(), DATA_PARAMETRO_PARA_APRESENTACAO_CAMPOS_EMPRESA_RAT)) {
                return this.ocorrencia.getValorTetoEmpresa();
            }
            return null;
        }

        @Override
        public BigDecimal getAliquotaCheia() {
            return this.ocorrencia.getAliquotaEmpresa();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevidoEmpresaFinal();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getValorDevidoEmpresaFinalCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJurosValorDevidoEmpresaFinal();
        }

        @Override
        public BigDecimal getMulta() {
            return this.ocorrencia.getMultaValorDevidoEmpresaFinal();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotalValorDevidoEmpresaFinal();
        }
    }

    public class OcorrenciaDeInssReclamadoAdapterPadrao
    extends OcorrenciaDeInssSalarioDevidoAdapterPadrao {
        @Override
        public OcorrenciaDeInssReclamadoAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosDevidos)ocorrencia;
            return this;
        }
    }

    public class OcorrenciaDeInssReclamanteAdapterPadrao
    extends OcorrenciaDeInssSalarioDevidoAdapterPadrao {
        @Override
        public OcorrenciaDeInssReclamanteAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosDevidos)ocorrencia;
            return this;
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.ocorrencia.getIndiceDeCorrecaoDoReclamante();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getValorDevidoReclamanteCorrigido();
        }
    }

    public abstract class OcorrenciaDeInssSalarioPagoAdapterPadrao
    extends InssJRAdapter.OcorrenciaDeInssAdapter {
        protected OcorrenciaDeInssSobreSalariosPagos ocorrencia;

        @Override
        public OcorrenciaDeInssSalarioPagoAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosPagos)ocorrencia;
            return this;
        }

        @Override
        public Date getCompetenciaOcorrencia() {
            return this.ocorrencia.getDataOcorrenciaInss();
        }

        @Override
        public BigDecimal getSalarioPago() {
            return this.ocorrencia.getValorBase();
        }

        @Override
        public BigDecimal getAliquota() {
            return Utils.dividir(this.ocorrencia.getAliquotaSegurado(), new BigDecimal("100"));
        }

        @Override
        public BigDecimal getInssSalarioPago() {
            return this.ocorrencia.getValorTotalInssSegurado();
        }

        @Override
        public BigDecimal getInssTeto() {
            return this.ocorrencia.getValorTetoSegurado();
        }

        @Override
        public BigDecimal getSalarioDevido() {
            return null;
        }

        @Override
        public BigDecimal getSalarioTotal() {
            return null;
        }

        @Override
        public BigDecimal getAliquotaCheia() {
            return null;
        }

        @Override
        public BigDecimal getInssRecolhido() {
            return this.ocorrencia.getValorRecolhidoSegurado();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevidoSeguradoFinal();
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.ocorrencia.getIndiceCorrecao();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getValorDevidoSeguradoFinalCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJurosValorDevidoSeguradoFinal();
        }

        @Override
        public BigDecimal getMulta() {
            return this.ocorrencia.getMultaValorDevidoSeguradoFinal();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotalValorDevidoSeguradoFinal();
        }
    }

    public abstract class OcorrenciaDeInssSalarioDevidoAdapterPadrao
    extends InssJRAdapter.OcorrenciaDeInssAdapter {
        protected OcorrenciaDeInssSobreSalariosDevidos ocorrencia;

        @Override
        public OcorrenciaDeInssSalarioDevidoAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeInssSobreSalariosDevidos)ocorrencia;
            return this;
        }

        @Override
        public Date getCompetenciaOcorrencia() {
            return this.ocorrencia.getDataOcorrenciaInss();
        }

        @Override
        public BigDecimal getSalarioPago() {
            return this.ocorrencia.getValorBase();
        }

        @Override
        public BigDecimal getAliquota() {
            return Utils.dividir(this.ocorrencia.getAliquotaSegurado(), new BigDecimal("100"));
        }

        @Override
        public BigDecimal getInssSalarioPago() {
            return this.ocorrencia.getValorTotalInssSegurado();
        }

        @Override
        public BigDecimal getInssTeto() {
            return this.ocorrencia.getValorTetoSegurado();
        }

        @Override
        public BigDecimal getSalarioDevido() {
            return this.ocorrencia.getValorBaseVerbas();
        }

        @Override
        public BigDecimal getSalarioTotal() {
            return this.ocorrencia.getValorSomaDasBases();
        }

        @Override
        public BigDecimal getAliquotaCheia() {
            return Utils.dividir(this.ocorrencia.getAliquotaDoTotalSegurado(), new BigDecimal("100"));
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevidoSeguradoFinal();
        }

        @Override
        public BigDecimal getInssRecolhido() {
            return null;
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.ocorrencia.getIndiceCorrecao();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getValorDevidoSeguradoFinalCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJurosValorDevidoSeguradoFinal();
        }

        @Override
        public BigDecimal getMulta() {
            return this.ocorrencia.getMultaValorDevidoSeguradoFinal();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotalValorDevidoSeguradoFinal();
        }
    }
}

