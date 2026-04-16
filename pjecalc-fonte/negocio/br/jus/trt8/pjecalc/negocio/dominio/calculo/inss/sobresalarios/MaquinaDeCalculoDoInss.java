/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.FormaAplicacaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndicesAcumuladosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.RepositorioDeInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.TabelaDeJurosInssSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.TabelaDeJurosInssSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.indices.coeficienteufir.CoeficienteUFIR;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ufir.UFIR;
import br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico.TabelaPrevidenciariaEmpregadoDomestico;
import br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico.TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.inss.multa.TaxaMultaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.multa.TaxaMultaPrevidenciariaOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado.TabelaPrevidenciariaSeguradoEmpregado;
import br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado.TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetariaUtils;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class MaquinaDeCalculoDoInss
implements Serializable {
    private static final long serialVersionUID = 4445534321663302858L;
    private static final BigDecimal CONSTANTE_PARA_MULTIPLICACAO_DA_UFIR = new BigDecimal("0.9108");
    private static final BigDecimal PRECISAO_MINIMA = new BigDecimal("0.000001");
    private static final BigDecimal FATOR_CORRECAO = new BigDecimal("1000");
    private static final BigDecimal UM_CENTAVO = new BigDecimal("0.01");
    private static final int MESES_NAO_CONSIDERADOS_PARA_JUROS = 4;
    private static final int ANO_1967 = 1967;
    private Inss inss;
    private List<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>> historicosSalariais;
    private TabelaDeJurosInssSalariosDevidos tabelaDeJurosSalariosDevidos;
    private TabelaDeJurosInssSalariosDevidos tabelaDeJurosSalariosDevidosAnterior;
    private TabelaDeJurosInssSalariosPagos tabelaDeJurosSalariosPagos;
    private TabelaDeJurosInssSalariosPagos tabelaDeJurosSalariosPagosAnterior;
    private TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante;
    private TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidos;
    private TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhistaSalariosPagos;
    private Map<Competencia, BigDecimal> tabelaCorrecaoPrevidenciaria;
    private Date dataInicialApuracaoMulta = null;
    private Date dataFinalApuracaoMulta = null;
    private Date dataInicialApuracaoMulta11941 = null;
    private Date dataFinalApuracaoMulta11941 = null;
    private TaxaMultaPrevidenciariaOptimizerListSearch tabelaTaxaDeMulta;
    private Date dataLiquidacao;
    private Date dataUltimaLiquidacao;

    public MaquinaDeCalculoDoInss(Inss inss) {
        this.inss = inss;
    }

    public void liquidarAtualizacao(Date dataEvento) {
        this.dataLiquidacao = dataEvento;
        List<OcorrenciaDeInssSobreSalariosDevidos> ocorrenciasDeInssSobreSalariosDevidos = null;
        List<OcorrenciaDeInssSobreSalariosPagos> ocorrenciasDeInssSobreSalariosPagos = null;
        ocorrenciasDeInssSobreSalariosDevidos = this.inss.getNovasOcorrenciasDeInssSobreSalariosDevidos();
        if (this.inss.getApurarInssSobreSalariosPagos().booleanValue()) {
            ocorrenciasDeInssSobreSalariosPagos = this.inss.getNovasOcorrenciasDeInssSobreSalariosPagos();
        }
        this.dataFinalApuracaoMulta11941 = this.inss.getCalculo().getAtualizacao().getDataDeLiquidacao();
        if (this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarMultaDosSalariosDevidosDoINSS().booleanValue() || this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941().booleanValue()) {
            this.dataInicialApuracaoMulta = this.inss.getInssSobreSalariosDevidos().getDataInicioPeriodo();
            this.dataFinalApuracaoMulta = this.inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo();
            if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosDevidosDoINSS().booleanValue() && this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS().booleanValue() || this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS().booleanValue() && FormaAplicacaoEnum.A_PARTIR_DE.equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getSalarioDevidoFormaAplicacao())) {
                this.dataInicialApuracaoMulta = this.inss.getInssSobreSalariosDevidos().getDataInicioPeriodo();
                this.dataFinalApuracaoMulta = this.inss.getCalculo().getAtualizacao().getDataDeLiquidacao();
            }
        }
        if (this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarMultaDosSalariosPagosDoINSS().booleanValue() || this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Pago().booleanValue()) {
            if (Utils.nulo(this.dataInicialApuracaoMulta) || HelperDate.dateAfter(this.dataInicialApuracaoMulta, this.inss.getInssSobreSalariosPagos().getDataInicioPeriodo())) {
                this.dataInicialApuracaoMulta = this.inss.getInssSobreSalariosPagos().getDataInicioPeriodo();
            }
            if (Utils.nulo(this.dataFinalApuracaoMulta) || HelperDate.dateBefore(this.dataFinalApuracaoMulta, this.inss.getInssSobreSalariosPagos().getDataTerminoPeriodo())) {
                this.dataFinalApuracaoMulta = this.inss.getInssSobreSalariosPagos().getDataTerminoPeriodo();
            }
            if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosPagosDoINSS().booleanValue() && this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosPagosDoINSS().booleanValue() || this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosPagosDoINSS().booleanValue() && FormaAplicacaoEnum.A_PARTIR_DE.equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getSalarioPagoFormaAplicacao())) {
                this.dataInicialApuracaoMulta = this.inss.getInssSobreSalariosDevidos().getDataInicioPeriodo();
                this.dataFinalApuracaoMulta = this.inss.getCalculo().getAtualizacao().getDataDeLiquidacao();
            }
        }
        if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941().booleanValue()) {
            this.dataInicialApuracaoMulta11941 = this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941();
        }
        if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Pago().booleanValue()) {
            this.dataInicialApuracaoMulta11941 = this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Pago();
        }
        if (Utils.naoNulos(this.dataInicialApuracaoMulta, this.dataFinalApuracaoMulta)) {
            this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterListaOtimizada(this.dataInicialApuracaoMulta, this.dataFinalApuracaoMulta);
        }
        this.historicosSalariais = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>>();
        for (HistoricoSalarial historicoSalarial : this.inss.getCalculo().getHistoricosSalariais()) {
            if (!historicoSalarial.getIncidenciaINSS().booleanValue()) continue;
            OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDeHistoricoSalarial = HistoricoSalarial.obter(historicoSalarial.getId()).getListaDeOcorrenciasOtimizada();
            this.historicosSalariais.add(ocorrenciasDeHistoricoSalarial);
        }
        boolean existeVerbaComIncidenciaINSS = this.verificarSeExisteVerbaComIncidenciaDeInss();
        if (existeVerbaComIncidenciaINSS) {
            this.liquidarInssSobreSalariosDevidosAtualizacao(ocorrenciasDeInssSobreSalariosDevidos);
        }
        if (this.inss.getApurarInssSobreSalariosPagos().booleanValue()) {
            this.liquidarInssSobreSalariosPagosDaAtualizacao(ocorrenciasDeInssSobreSalariosPagos);
        }
        this.dataUltimaLiquidacao = dataEvento;
    }

    public void liquidar(Date dataLiquidacao) {
        this.dataLiquidacao = dataLiquidacao;
        if (!this.inss.getInssSobreSalariosDevidos().existemOcorrencias() || this.inss.getApurarInssSobreSalariosPagos().booleanValue() && !this.inss.getInssSobreSalariosPagos().existemOcorrencias()) {
            this.inss.gerarOcorrencias(true, false);
        }
        if (this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarMultaDosSalariosDevidosDoINSS().booleanValue() || this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941().booleanValue()) {
            this.dataInicialApuracaoMulta = this.inss.getInssSobreSalariosDevidos().getDataInicioPeriodo();
            this.dataFinalApuracaoMulta = this.inss.getInssSobreSalariosDevidos().getDataTerminoPeriodo();
            this.dataFinalApuracaoMulta11941 = this.inss.getCalculo().getDataDeLiquidacao();
            if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosDevidosDoINSS().booleanValue() && this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS().booleanValue() || this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS().booleanValue() && FormaAplicacaoEnum.A_PARTIR_DE.equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getSalarioDevidoFormaAplicacao())) {
                this.dataInicialApuracaoMulta = this.inss.getInssSobreSalariosDevidos().getDataInicioPeriodo();
                this.dataFinalApuracaoMulta = this.inss.getCalculo().getDataDeLiquidacao();
            }
        }
        if (this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarMultaDosSalariosPagosDoINSS().booleanValue() || this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Pago().booleanValue()) {
            if (Utils.nulo(this.dataInicialApuracaoMulta) || HelperDate.dateAfter(this.dataInicialApuracaoMulta, this.inss.getInssSobreSalariosPagos().getDataInicioPeriodo())) {
                this.dataInicialApuracaoMulta = this.inss.getInssSobreSalariosPagos().getDataInicioPeriodo();
            }
            if (Utils.nulo(this.dataFinalApuracaoMulta) || HelperDate.dateBefore(this.dataFinalApuracaoMulta, this.inss.getInssSobreSalariosPagos().getDataTerminoPeriodo())) {
                this.dataFinalApuracaoMulta = this.inss.getInssSobreSalariosPagos().getDataTerminoPeriodo();
                this.dataFinalApuracaoMulta11941 = this.inss.getInssSobreSalariosPagos().getDataTerminoPeriodo();
            }
            if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosPagosDoINSS().booleanValue() && this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosPagosDoINSS().booleanValue() || this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosPagosDoINSS().booleanValue() && FormaAplicacaoEnum.A_PARTIR_DE.equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getSalarioPagoFormaAplicacao())) {
                this.dataInicialApuracaoMulta = this.inss.getInssSobreSalariosDevidos().getDataInicioPeriodo();
                this.dataFinalApuracaoMulta = this.inss.getCalculo().getDataDeLiquidacao();
                this.dataFinalApuracaoMulta11941 = this.inss.getCalculo().getDataDeLiquidacao();
            }
        }
        if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941().booleanValue()) {
            this.dataInicialApuracaoMulta11941 = this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941();
        }
        if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Pago().booleanValue()) {
            this.dataInicialApuracaoMulta11941 = this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Pago();
        }
        if (Utils.naoNulos(this.dataInicialApuracaoMulta, this.dataFinalApuracaoMulta)) {
            this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterListaOtimizada(this.dataInicialApuracaoMulta, this.dataFinalApuracaoMulta);
        }
        this.historicosSalariais = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>>();
        for (HistoricoSalarial historicoSalarial : this.inss.getCalculo().getHistoricosSalariais()) {
            if (!historicoSalarial.getIncidenciaINSS().booleanValue()) continue;
            OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDeHistoricoSalarial = HistoricoSalarial.obter(historicoSalarial.getId()).getListaDeOcorrenciasOtimizada();
            this.historicosSalariais.add(ocorrenciasDeHistoricoSalarial);
        }
        boolean existeVerbaComIncidenciaINSS = this.verificarSeExisteVerbaComIncidenciaDeInss();
        if (existeVerbaComIncidenciaINSS) {
            this.liquidarInssSobreSalariosDevidos();
        } else {
            this.inss.limparOcorrenciasDeSalariosDevidos();
        }
        if (this.inss.getApurarInssSobreSalariosPagos().booleanValue()) {
            this.liquidarInssSobreSalariosPagos();
        } else {
            this.inss.limparOcorrenciasDeSalariosPagos();
        }
    }

    private boolean verificarSeExisteVerbaComIncidenciaDeInss() {
        for (VerbaDeCalculo verba : this.inss.getCalculo().getVerbasAtivas()) {
            if (!verba.getIncidenciaINSS().booleanValue()) continue;
            return true;
        }
        return false;
    }

    private BigDecimal calcularTaxaDeJurosDosSalariosDevidos(Date data) {
        if (Utils.nulo(this.tabelaDeJurosSalariosDevidos)) {
            Date dataAPartirDoMesAnteriorDaOcorrenciaOriginal = HelperDate.getInstance(data).addMonth(-1).getDate();
            this.tabelaDeJurosSalariosDevidos = new TabelaDeJurosInssSalariosDevidos(this.inss.getCalculo(), dataAPartirDoMesAnteriorDaOcorrenciaOriginal);
        }
        return this.tabelaDeJurosSalariosDevidos.calcularTaxaDeJuros(data);
    }

    private BigDecimal calcularTaxaDeJurosDosSalariosDevidosAtualizacao(Date dataOcorrencia, Date dataEvento, Boolean ocorrenciaAntesDaLei) {
        if (Utils.nulo(this.tabelaDeJurosSalariosDevidos) && this.inss.getCalculo().isCalculoExterno().booleanValue()) {
            Date dataDaOcorrenciaTresMesesAntesDaOcorrenciaOriginal = HelperDate.getInstance(dataOcorrencia).addMonth(-4).getDate();
            this.tabelaDeJurosSalariosDevidos = new TabelaDeJurosInssSalariosDevidos(this.inss.getCalculo(), dataDaOcorrenciaTresMesesAntesDaOcorrenciaOriginal, dataEvento, (boolean)ocorrenciaAntesDaLei);
            if (Utils.naoNulo(this.dataUltimaLiquidacao)) {
                this.tabelaDeJurosSalariosDevidosAnterior = new TabelaDeJurosInssSalariosDevidos(this.inss.getCalculo(), dataDaOcorrenciaTresMesesAntesDaOcorrenciaOriginal, this.dataUltimaLiquidacao, (boolean)ocorrenciaAntesDaLei);
            }
        } else if (Utils.nulo(this.tabelaDeJurosSalariosDevidos)) {
            Date dataDaOcorrenciaAPartirDoMesAnteriorDaOcorrenciaOriginal = HelperDate.getInstance(dataOcorrencia).addMonth(-1).getDate();
            this.tabelaDeJurosSalariosDevidos = new TabelaDeJurosInssSalariosDevidos(this.inss.getCalculo(), dataDaOcorrenciaAPartirDoMesAnteriorDaOcorrenciaOriginal, dataEvento, (boolean)ocorrenciaAntesDaLei);
        }
        if (this.inss.getCalculo().isCalculoExterno().booleanValue()) {
            BigDecimal taxaAtual = this.tabelaDeJurosSalariosDevidos.calcularTaxaDeJurosDaAtualizacao(dataOcorrencia, ocorrenciaAntesDaLei);
            BigDecimal taxaAnterior = Utils.nulo(this.tabelaDeJurosSalariosDevidosAnterior) ? BigDecimal.ZERO : this.tabelaDeJurosSalariosDevidosAnterior.calcularTaxaDeJurosDaAtualizacao(dataOcorrencia, ocorrenciaAntesDaLei);
            return Utils.subtrair(taxaAtual, taxaAnterior);
        }
        return this.tabelaDeJurosSalariosDevidos.calcularTaxaDeJurosDaAtualizacao(dataOcorrencia, ocorrenciaAntesDaLei);
    }

    private BigDecimal calcularTaxaDeJurosDosSalariosPagos(Date data) {
        if (Utils.nulo(this.tabelaDeJurosSalariosPagos)) {
            Date dataAPartirDoMesAnteriorDaOcorrenciaOriginal = HelperDate.getInstance(data).addMonth(-1).getDate();
            this.tabelaDeJurosSalariosPagos = new TabelaDeJurosInssSalariosPagos(this.inss.getCalculo(), dataAPartirDoMesAnteriorDaOcorrenciaOriginal);
        }
        return this.tabelaDeJurosSalariosPagos.calcularTaxaDeJuros(data);
    }

    private BigDecimal calcularTaxaDeJurosDosSalariosPagosAtualizacao(Date dataOcorrencia, Date dataEvento, Boolean ocorrenciaAntesDaLei) {
        if (Utils.nulo(this.tabelaDeJurosSalariosPagos) && this.inss.getCalculo().isCalculoExterno().booleanValue()) {
            Date dataDaOcorrenciaTresMesesAntesDaOcorrenciaOriginal = HelperDate.getInstance(dataOcorrencia).addMonth(-4).getDate();
            this.tabelaDeJurosSalariosPagos = new TabelaDeJurosInssSalariosPagos(this.inss.getCalculo(), dataDaOcorrenciaTresMesesAntesDaOcorrenciaOriginal, dataEvento, ocorrenciaAntesDaLei);
            if (Utils.naoNulo(this.dataUltimaLiquidacao)) {
                this.tabelaDeJurosSalariosPagosAnterior = new TabelaDeJurosInssSalariosPagos(this.inss.getCalculo(), dataDaOcorrenciaTresMesesAntesDaOcorrenciaOriginal, this.dataUltimaLiquidacao, ocorrenciaAntesDaLei);
            }
        } else if (Utils.nulo(this.tabelaDeJurosSalariosPagos)) {
            Date dataDaOcorrenciaAPartirDoMesAnteriorDaOcorrenciaOriginal = HelperDate.getInstance(dataOcorrencia).addMonth(-1).getDate();
            this.tabelaDeJurosSalariosPagos = new TabelaDeJurosInssSalariosPagos(this.inss.getCalculo(), dataDaOcorrenciaAPartirDoMesAnteriorDaOcorrenciaOriginal, dataEvento, ocorrenciaAntesDaLei);
        }
        if (this.inss.getCalculo().isCalculoExterno().booleanValue()) {
            BigDecimal taxaAtual = this.tabelaDeJurosSalariosPagos.calcularTaxaDeJurosDaAtualizacao(dataOcorrencia, ocorrenciaAntesDaLei);
            BigDecimal taxaAnterior = Utils.nulo(this.tabelaDeJurosSalariosPagosAnterior) ? BigDecimal.ZERO : this.tabelaDeJurosSalariosPagosAnterior.calcularTaxaDeJurosDaAtualizacao(dataOcorrencia, ocorrenciaAntesDaLei);
            return Utils.subtrair(taxaAtual, taxaAnterior);
        }
        return this.tabelaDeJurosSalariosPagos.calcularTaxaDeJurosDaAtualizacao(dataOcorrencia, ocorrenciaAntesDaLei);
    }

    public void calcularJurosDosSalariosDevidos() {
        this.calcularJurosDosSalariosDevidos(this.inss.getInssSobreSalariosDevidos().getOcorrencias(), false);
    }

    public void calcularJurosDosSalariosDevidos(Collection<OcorrenciaDeInssSobreSalariosDevidos> ocorrencias, boolean isAtualizacao) {
        this.tabelaDeJurosSalariosDevidos = null;
        boolean leiJaAplicada = false;
        for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : ocorrencias) {
            boolean ocorrenciaAntesDaLei = HelperDate.dateBefore(ocorrencia.getDataOcorrenciaInss(), HelperDate.getCurrentCompetence(this.inss.getInssSobreSalariosDevidos().getDataLimiteCorrecao11941()).getDate());
            if (this.inss.getCalculo().isCalculoExterno().booleanValue()) {
                boolean bl = ocorrenciaAntesDaLei = ocorrencia.getOcorrenciaDecimoTerceiro() == false;
            }
            if (!this.inss.getCalculo().getParametrosDeAtualizacao().getJurosTrabalhistasDosSalariosDevidosDoINSS().booleanValue() && !this.inss.getCalculo().getParametrosDeAtualizacao().getJurosPrevidenciariosDosSalariosDevidosDoINSS().booleanValue() && this.inss.getInssSobreSalariosDevidos().getCorrecao11941().booleanValue() && ocorrenciaAntesDaLei) continue;
            boolean ocorrenciaDepoisDaLei = HelperDate.dateAfterOrEquals(ocorrencia.getDataOcorrenciaInss(), HelperDate.getCurrentCompetence(this.inss.getInssSobreSalariosDevidos().getDataLimiteCorrecao11941()).getDate());
            if (this.inss.getCalculo().isCalculoExterno().booleanValue()) {
                ocorrenciaDepoisDaLei = ocorrencia.getOcorrenciaDecimoTerceiro();
            }
            if (!leiJaAplicada && this.inss.getInssSobreSalariosDevidos().getCorrecao11941().booleanValue() && ocorrenciaDepoisDaLei) {
                this.tabelaDeJurosSalariosDevidos = null;
                leiJaAplicada = true;
            }
            Date dataCalculoJuros = ocorrencia.getDataOcorrenciaInss();
            if (!this.inss.getCalculo().isCalculoExterno().booleanValue() && ocorrencia.isJurosEMultaPrevidenciario() && ocorrencia.getOcorrenciaDecimoTerceiro().booleanValue() && HelperDate.getInstance(ocorrencia.getDataOcorrenciaInss()).getMonth() == 11) {
                dataCalculoJuros = HelperDate.getInstance(ocorrencia.getDataOcorrenciaInss()).addMonth(-1).getDate();
            }
            BigDecimal taxaDeJuros = null;
            taxaDeJuros = isAtualizacao ? this.calcularTaxaDeJurosDosSalariosDevidosAtualizacao(dataCalculoJuros, this.dataLiquidacao, ocorrencia.getOcorrenciaDecimoTerceiro() == false) : this.calcularTaxaDeJurosDosSalariosDevidos(dataCalculoJuros);
            ocorrencia.setTaxaDeJuros(taxaDeJuros);
        }
    }

    public void calcularJurosDosSalariosPagos() {
        this.calcularJurosDosSalariosPagos(this.inss.getInssSobreSalariosPagos().getOcorrencias(), false);
    }

    public void calcularJurosDosSalariosPagos(Collection<OcorrenciaDeInssSobreSalariosPagos> ocorrencias, boolean isAtualizacao) {
        this.tabelaDeJurosSalariosPagos = null;
        boolean leiJaAplicada = false;
        if (this.inss.getApurarInssSobreSalariosPagos().booleanValue()) {
            for (OcorrenciaDeInssSobreSalariosPagos ocorrencia : ocorrencias) {
                boolean ocorrenciaAntesDaLei = HelperDate.dateBefore(ocorrencia.getDataOcorrenciaInss(), HelperDate.getCurrentCompetence(this.inss.getInssSobreSalariosPagos().getDataLimiteCorrecao11941()).getDate());
                if (this.inss.getCalculo().isCalculoExterno().booleanValue()) {
                    boolean bl = ocorrenciaAntesDaLei = ocorrencia.getOcorrenciaDecimoTerceiro() == false;
                }
                if (!this.inss.getCalculo().getParametrosDeAtualizacao().getJurosTrabalhistasDosSalariosDevidosDoINSS().booleanValue() && !this.inss.getCalculo().getParametrosDeAtualizacao().getJurosPrevidenciariosDosSalariosDevidosDoINSS().booleanValue() && this.inss.getInssSobreSalariosPagos().getCorrecao11941().booleanValue() && ocorrenciaAntesDaLei) continue;
                boolean ocorrenciaDepoisDaLei = HelperDate.dateAfterOrEquals(ocorrencia.getDataOcorrenciaInss(), HelperDate.getCurrentCompetence(this.inss.getInssSobreSalariosPagos().getDataLimiteCorrecao11941()).getDate());
                if (this.inss.getCalculo().isCalculoExterno().booleanValue()) {
                    ocorrenciaDepoisDaLei = ocorrencia.getOcorrenciaDecimoTerceiro();
                }
                if (!leiJaAplicada && this.inss.getInssSobreSalariosPagos().getCorrecao11941().booleanValue() && ocorrenciaDepoisDaLei) {
                    this.tabelaDeJurosSalariosPagos = null;
                    leiJaAplicada = true;
                }
                Date dataCalculoJuros = ocorrencia.getDataOcorrenciaInss();
                if (!this.inss.getCalculo().isCalculoExterno().booleanValue() && ocorrencia.isJurosEMultaPrevidenciario() && ocorrencia.getOcorrenciaDecimoTerceiro().booleanValue() && HelperDate.getInstance(ocorrencia.getDataOcorrenciaInss()).getMonth() == 11) {
                    dataCalculoJuros = HelperDate.getInstance(ocorrencia.getDataOcorrenciaInss()).addMonth(-1).getDate();
                }
                BigDecimal taxaDeJuros = null;
                taxaDeJuros = isAtualizacao ? this.calcularTaxaDeJurosDosSalariosPagosAtualizacao(dataCalculoJuros, this.dataLiquidacao, ocorrencia.getOcorrenciaDecimoTerceiro() == false) : this.calcularTaxaDeJurosDosSalariosPagos(dataCalculoJuros);
                ocorrencia.setTaxaDeJuros(taxaDeJuros);
            }
        }
    }

    private void liquidarInssSobreSalariosDevidosAtualizacao(List<OcorrenciaDeInssSobreSalariosDevidos> ocorrenciasSobreSalariosDevidos) {
        HelperDate mesDoInicioDaCorrecao;
        Date dataInicialDeCorrecao;
        if (Utils.nulo(ocorrenciasSobreSalariosDevidos) || ocorrenciasSobreSalariosDevidos.isEmpty()) {
            return;
        }
        List<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> ultimasOcorrenciasNaoAmortizadas = InssSobreSalariosDevidos.obterUltimasOcorrenciasNaoAmortizadas(this.inss.getInssSobreSalariosDevidos());
        ArrayList<OcorrenciaDeInssSobreSalariosDevidos> tempOcorrenciasSobreSalariosDevidos = new ArrayList<OcorrenciaDeInssSobreSalariosDevidos>();
        if (ultimasOcorrenciasNaoAmortizadas != null) {
            if (!ultimasOcorrenciasNaoAmortizadas.isEmpty()) {
                OcorrenciaDeInssSobreSalariosDevidosAtualizacao ultimaOcorrenciaMaisAntiga = ultimasOcorrenciasNaoAmortizadas.get(0);
                for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : ocorrenciasSobreSalariosDevidos) {
                    if (!ocorrencia.getDataOcorrenciaInss().before(ultimaOcorrenciaMaisAntiga.getDataOcorrenciaInss())) continue;
                    tempOcorrenciasSobreSalariosDevidos.add(ocorrencia);
                }
                ocorrenciasSobreSalariosDevidos.removeAll(tempOcorrenciasSobreSalariosDevidos);
            } else {
                ocorrenciasSobreSalariosDevidos.clear();
            }
        }
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDasVerbasComIncidenciaDeInss = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>>();
        for (VerbaDeCalculo verba : this.inss.getCalculo().getVerbasAtivas()) {
            if (!verba.getIncidenciaINSS().booleanValue()) continue;
            ocorrenciasDasVerbasComIncidenciaDeInss.add(verba.getOcorrenciasOptimizerListSearch());
        }
        this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante = this.obterTabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante(Boolean.FALSE);
        this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidos = this.obterTabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidos(Boolean.FALSE);
        if (Utils.naoNulo(this.dataUltimaLiquidacao) && HelperDate.dateAfter(dataInicialDeCorrecao = HelperDate.getInstance(this.dataUltimaLiquidacao).addDay(1).getDate(), (mesDoInicioDaCorrecao = HelperDate.getCurrentCompetence(dataInicialDeCorrecao)).getDate())) {
            if (Utils.naoNulo(this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante)) {
                this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante.excluirCompetencia(mesDoInicioDaCorrecao);
            }
            if (Utils.naoNulo(this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidos)) {
                this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidos.excluirCompetencia(mesDoInicioDaCorrecao);
            }
        }
        if (this.inss.getInssSobreSalariosDevidos().getCorrecaoPrevidenciaria().booleanValue()) {
            this.tabelaCorrecaoPrevidenciaria = this.obterTabelaParaCorrecaoPrevidenciaria(this.dataLiquidacao);
        }
        TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch listaAliquotasSeguradoEmpregado = null;
        TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch listaAliquotasEmpregadoDomestico = null;
        ArrayList<OcorrenciaDeInssSobreSalariosDevidos> ocorrenciasSobreSalariosDevidosComBaseVerbas = new ArrayList<OcorrenciaDeInssSobreSalariosDevidos>();
        for (OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDeInssSobreSalariosDevidos : ocorrenciasSobreSalariosDevidos) {
            Competencia competencia = new Competencia(ocorrenciaDeInssSobreSalariosDevidos.getDataOcorrenciaInss());
            ocorrenciaDeInssSobreSalariosDevidos.setValorBaseVerbas(this.calcularValorBaseVerbas(ocorrenciasDasVerbasComIncidenciaDeInss, competencia, ocorrenciaDeInssSobreSalariosDevidos.getOcorrenciaDecimoTerceiro()));
            if (!Utils.naoNulo(ocorrenciaDeInssSobreSalariosDevidos.getValorBaseVerbas()) || ocorrenciaDeInssSobreSalariosDevidos.getValorBaseVerbas().compareTo(BigDecimal.ZERO) <= 0) continue;
            ocorrenciasSobreSalariosDevidosComBaseVerbas.add(ocorrenciaDeInssSobreSalariosDevidos);
            ocorrenciaDeInssSobreSalariosDevidos.setBaseVazia(false);
        }
        Competencia competencia = new Competencia();
        for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : ocorrenciasSobreSalariosDevidosComBaseVerbas) {
            Competencia competenciaDaMulta;
            boolean deveCorrigirReclamante;
            competencia.update(ocorrencia.getDataOcorrenciaInss());
            if (TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDaBase())) {
                OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial;
                Iterator<OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarial;
                BigDecimal baseHistorico;
                Periodo periodoRecalculo = competencia.criarPeriodoDaCompetencia();
                if (!ocorrencia.getOcorrenciaDecimoTerceiro().booleanValue()) {
                    periodoRecalculo.setInicial(ocorrencia.getDataInicioPeriodo());
                    if (HelperDate.dateAfter(periodoRecalculo.getFinal(), ocorrencia.getInssSobreSalariosDevidos().getDataTerminoPeriodo())) {
                        periodoRecalculo.setFinal(ocorrencia.getInssSobreSalariosDevidos().getDataTerminoPeriodo());
                    }
                    baseHistorico = BigDecimal.ZERO;
                    for (OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarialOptimizeSearch : this.historicosSalariais) {
                        ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(competencia);
                        while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                            ocorrenciaDoHistoricoSalarial = ocorrenciasDoHistoricoSalarial.next();
                            if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                            BigDecimal valorOcorrenciaDoHistorico = BigDecimal.ZERO;
                            if (ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getAplicarProporcionalidadeINSS().booleanValue()) {
                                int diasParaExcluir = 0;
                                if (periodoRecalculo.totalDeDias() - (diasParaExcluir += this.inss.getCalculo().obterDiasFerias(periodoRecalculo)) == 31) {
                                    diasParaExcluir = 1;
                                }
                                CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar(periodoRecalculo, ocorrenciaDoHistoricoSalarial.getValor(), diasParaExcluir += this.inss.getCalculo().obterFaltasNaoJustificadas(periodoRecalculo));
                                calculoDoProporcionalizar.executar();
                                valorOcorrenciaDoHistorico = calculoDoProporcionalizar.getResultado();
                            } else {
                                valorOcorrenciaDoHistorico = ocorrenciaDoHistoricoSalarial.getValor();
                            }
                            baseHistorico = baseHistorico.add(valorOcorrenciaDoHistorico, Utils.CONTEXTO_MATEMATICO);
                        }
                    }
                    ocorrencia.setValorBase(baseHistorico);
                } else {
                    periodoRecalculo.setInicial(ocorrencia.getDataInicioPeriodo());
                    periodoRecalculo.setFinal(ocorrencia.getDataTerminoPeriodo());
                    baseHistorico = BigDecimal.ZERO;
                    for (OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarialOptimizeSearch : this.historicosSalariais) {
                        ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(competencia);
                        while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                            ocorrenciaDoHistoricoSalarial = ocorrenciasDoHistoricoSalarial.next();
                            if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                            baseHistorico = baseHistorico.add(ocorrenciaDoHistoricoSalarial.getValor(), Utils.CONTEXTO_MATEMATICO);
                        }
                    }
                    int avos = RepositorioDeInss.calculaAvosInssDecimoTerceiro(this.inss.getCalculo(), periodoRecalculo);
                    baseHistorico = baseHistorico.multiply(new BigDecimal(avos), Utils.CONTEXTO_MATEMATICO);
                    baseHistorico = baseHistorico.divide(new BigDecimal(12), Utils.CONTEXTO_MATEMATICO);
                    ocorrencia.setValorBase(baseHistorico);
                }
            }
            BigDecimal aliquotaDoSegurado = null;
            BigDecimal aliquotaDoTotalSegurado = null;
            switch (this.inss.getTipoAliquotaSegurado()) {
                case FIXA: {
                    aliquotaDoSegurado = this.inss.getAliquotaSeguradoFixa();
                    aliquotaDoTotalSegurado = this.inss.getAliquotaSeguradoFixa();
                    break;
                }
                case SEGURADO_EMPREGADO: {
                    listaAliquotasSeguradoEmpregado = this.inss.obterListaOtimizadaAliquotasSeguradoEmpregado();
                    Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado = listaAliquotasSeguradoEmpregado.search(competencia);
                    if (!Utils.naoNulo(tabelaSeguradoEmpregado) || !tabelaSeguradoEmpregado.hasNext()) break;
                    TabelaPrevidenciariaSeguradoEmpregado tpse = tabelaSeguradoEmpregado.next();
                    aliquotaDoSegurado = tpse.obterAliquotaParaValor(ocorrencia.getValorBase());
                    if (Utils.nulo(ocorrencia.getValorBaseVerbas())) {
                        aliquotaDoTotalSegurado = tpse.obterAliquotaParaValor(ocorrencia.getValorBase());
                        break;
                    }
                    aliquotaDoTotalSegurado = tpse.obterAliquotaParaValor(ocorrencia.getValorBase().add(ocorrencia.getValorBaseVerbas(), Utils.CONTEXTO_MATEMATICO));
                    break;
                }
                case EMPREGADO_DOMESTICO: {
                    Iterator<TabelaPrevidenciariaEmpregadoDomestico> tabelaEmpregadoDomestico;
                    if (Utils.nulo(listaAliquotasEmpregadoDomestico)) {
                        listaAliquotasEmpregadoDomestico = this.inss.obterListaOtimizadaDeAliquotasEmpregadoDomestico();
                    }
                    if (!Utils.naoNulo(tabelaEmpregadoDomestico = listaAliquotasEmpregadoDomestico.search(competencia)) || !tabelaEmpregadoDomestico.hasNext()) break;
                    TabelaPrevidenciariaEmpregadoDomestico tped = tabelaEmpregadoDomestico.next();
                    aliquotaDoSegurado = tped.obterAliquotaParaValor(ocorrencia.getValorBase());
                    if (Utils.nulo(ocorrencia.getValorBaseVerbas())) {
                        aliquotaDoTotalSegurado = tped.obterAliquotaParaValor(ocorrencia.getValorBase());
                        break;
                    }
                    aliquotaDoTotalSegurado = tped.obterAliquotaParaValor(ocorrencia.getValorBase().add(ocorrencia.getValorBaseVerbas(), Utils.CONTEXTO_MATEMATICO));
                    break;
                }
            }
            ocorrencia.setAliquotaSegurado(aliquotaDoSegurado);
            ocorrencia.setAliquotaDoTotalSegurado(aliquotaDoTotalSegurado);
            ocorrencia.setValorTotalInssSegurado(this.calcularValorTotalInssSegurado(ocorrencia));
            BigDecimal baseVerbasVezesAliquotaCheiaSegurado = BigDecimal.ZERO;
            if (Utils.naoNulo(ocorrencia.getAliquotaDoTotalSegurado()) && Utils.naoNulo(ocorrencia.getValorBaseVerbas())) {
                baseVerbasVezesAliquotaCheiaSegurado = ocorrencia.getValorBaseVerbas().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaDoTotalSegurado()), Utils.CONTEXTO_MATEMATICO);
            }
            ocorrencia.setValorDevidoSeguradoVerbas(baseVerbasVezesAliquotaCheiaSegurado);
            if (ocorrencia.isRealizarCalculoParaSegurado() && Utils.naoNulo(ocorrencia.getValorDevidoSeguradoVerbas())) {
                BigDecimal valorDevidoSegurado = null;
                if (ocorrencia.isLimitarTetoSegurado()) {
                    valorDevidoSegurado = ocorrencia.getValorTetoSegurado().subtract(ocorrencia.getValorTotalInssSegurado(), Utils.CONTEXTO_MATEMATICO);
                    if (valorDevidoSegurado.compareTo(ocorrencia.getValorDevidoSeguradoVerbas()) > 0) {
                        valorDevidoSegurado = ocorrencia.getValorDevidoSeguradoVerbas();
                    }
                } else {
                    valorDevidoSegurado = ocorrencia.getValorDevidoSeguradoVerbas();
                }
                ocorrencia.setValorDevidoSeguradoFinal(valorDevidoSegurado);
            }
            boolean bl = deveCorrigirReclamante = ocorrencia.getInssSobreSalariosDevidos().getApurarInssSegurado() != false && ocorrencia.getInssSobreSalariosDevidos().getCobrarInssDoReclamante() != false && ocorrencia.getInssSobreSalariosDevidos().getCorrigirDescontoReclamante() != false;
            if (deveCorrigirReclamante && Utils.naoNulo(this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante)) {
                ocorrencia.setIndiceDeCorrecaoDoReclamante(this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante.obterValorAcumuladoDoIndice(ocorrencia.getDataOcorrenciaInss()));
                ocorrencia.setFatorCorrecao(BigDecimal.ONE);
            } else {
                BigDecimal conversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(ocorrencia.getDataOcorrenciaInss()).addDay(1).getDate(), this.dataLiquidacao);
                if (PRECISAO_MINIMA.compareTo(conversaoMoeda) > 0) {
                    ocorrencia.setFatorCorrecao(FATOR_CORRECAO);
                    conversaoMoeda = Utils.multiplicar(conversaoMoeda, FATOR_CORRECAO);
                } else {
                    ocorrencia.setFatorCorrecao(BigDecimal.ONE);
                }
                ocorrencia.setIndiceDeCorrecaoDoReclamante(conversaoMoeda);
            }
            ocorrencia.setIndiceDeCorrecaoTrabalhistaUtilizado(this.obterIndiceDeCorrecaoTrabalhistaUtilizado(ocorrencia, this.inss.getInssSobreSalariosDevidos(), Boolean.FALSE));
            ocorrencia.setIndiceDeCorrecaoPrevidenciariaUtilizado(this.obterIndiceDeCorrecaoPrevidenciariaUtilizado(ocorrencia, this.inss.getInssSobreSalariosDevidos(), competencia));
            if (ocorrencia.isRealizarCalculoParaEmpresa()) {
                BigDecimal valorTotalInssEmpresa = ocorrencia.getValorBase().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaEmpresa()), Utils.CONTEXTO_MATEMATICO);
                if (ocorrencia.isLimitarTetoEmpresa() && valorTotalInssEmpresa.compareTo(ocorrencia.getValorTetoEmpresa()) > 0) {
                    valorTotalInssEmpresa = ocorrencia.getValorTetoEmpresa();
                }
                ocorrencia.setValorTotalInssEmpresa(valorTotalInssEmpresa);
                BigDecimal baseVerbasVezesAliquotaEmpresa = null;
                if (Utils.naoNulo(ocorrencia.getValorBaseVerbas())) {
                    baseVerbasVezesAliquotaEmpresa = ocorrencia.getValorBaseVerbas().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaEmpresa()), Utils.CONTEXTO_MATEMATICO);
                }
                ocorrencia.setValorDevidoEmpresaVerbas(baseVerbasVezesAliquotaEmpresa);
                BigDecimal valorDevidoEmpresa = null;
                if (Utils.naoNulo(ocorrencia.getValorDevidoEmpresaVerbas())) {
                    if (ocorrencia.isLimitarTetoEmpresa()) {
                        valorDevidoEmpresa = ocorrencia.getValorTetoEmpresa().subtract(ocorrencia.getValorTotalInssEmpresa(), Utils.CONTEXTO_MATEMATICO);
                        if (valorDevidoEmpresa.compareTo(ocorrencia.getValorDevidoEmpresaVerbas()) > 0) {
                            valorDevidoEmpresa = ocorrencia.getValorDevidoEmpresaVerbas();
                        }
                    } else if (Utils.naoNulo(ocorrencia.getValorBaseVerbas())) {
                        valorDevidoEmpresa = ocorrencia.getValorBaseVerbas().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaEmpresa()), Utils.CONTEXTO_MATEMATICO);
                    }
                }
                ocorrencia.setValorDevidoEmpresaFinal(valorDevidoEmpresa);
            }
            if (ocorrencia.isRealizarCalculoParaSAT()) {
                BigDecimal valorDevidoSAT = null;
                if (Utils.naoNulo(ocorrencia.getValorBaseVerbas())) {
                    valorDevidoSAT = ocorrencia.getValorBaseVerbas().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaSAT()), Utils.CONTEXTO_MATEMATICO);
                }
                ocorrencia.setValorDevidoSAT(valorDevidoSAT);
            }
            if (ocorrencia.isRealizarCalculoParaTerceiros()) {
                BigDecimal valorDevidoTerceiros = null;
                if (Utils.naoNulo(ocorrencia.getValorBaseVerbas())) {
                    valorDevidoTerceiros = ocorrencia.getValorBaseVerbas().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaTerceiros()), Utils.CONTEXTO_MATEMATICO);
                }
                ocorrencia.setValorDevidoTerceiros(valorDevidoTerceiros);
            }
            BigDecimal taxaMulta = null;
            if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941().booleanValue() && Utils.naoNulo(competencia.getData()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.dataLiquidacao).getDate()) && HelperDate.dateAfterOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941()).getDate())) {
                competenciaDaMulta = competencia;
                if (!this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Multa().booleanValue() || Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Multa())) {
                    HelperDate ocorrenciaHelper = HelperDate.getInstance(ocorrencia.getDataOcorrenciaInss());
                    if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Multa().booleanValue() && HelperDate.dateAfterOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941()).getDate()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Multa()).getDate())) {
                        competenciaDaMulta = new Competencia(HelperDate.getInstance(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Multa()).getDate());
                        ocorrenciaHelper = HelperDate.getInstance(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Multa());
                    }
                    this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterListaOtimizada(this.dataInicialApuracaoMulta11941, this.dataFinalApuracaoMulta11941);
                    Iterator<TaxaMultaPrevidenciaria> taxas = this.tabelaTaxaDeMulta.search(competenciaDaMulta);
                    while (Utils.naoNulo(taxas) && taxas.hasNext()) {
                        TaxaMultaPrevidenciaria taxa = taxas.next();
                        if (!Utils.naoNulo((Object)taxa.getTipoMulta()) || !taxa.getTipoMulta().equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getTipoDeMultaDosSalariosDevidosDoINSS())) continue;
                        taxaMulta = this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Multa().booleanValue() && HelperDate.dateEquals(competenciaDaMulta.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Multa()).getDate()) ? taxa.resolverTaxa(this.inss.getInssSobreSalariosDevidos(), ocorrenciaHelper, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao, true) : taxa.resolverTaxa(this.inss.getInssSobreSalariosDevidos(), competencia, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao);
                        break;
                    }
                }
            } else if (this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarMultaDosSalariosDevidosDoINSS().booleanValue() && Utils.naoNulo(competencia.getData()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.dataLiquidacao).getDate())) {
                competenciaDaMulta = competencia;
                if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosDevidosDoINSS().booleanValue() && Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()).getDate())) {
                    competenciaDaMulta = new Competencia(HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()).getDate());
                }
                if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS().booleanValue() && Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()).getDate())) {
                    competenciaDaMulta = new Competencia(HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()).getDate());
                }
                this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterListaOtimizada(this.dataInicialApuracaoMulta, this.dataFinalApuracaoMulta);
                Iterator<TaxaMultaPrevidenciaria> taxas = this.tabelaTaxaDeMulta.search(competenciaDaMulta);
                while (Utils.naoNulo(taxas) && taxas.hasNext()) {
                    TaxaMultaPrevidenciaria taxa = taxas.next();
                    if (!Utils.naoNulo((Object)taxa.getTipoMulta()) || !taxa.getTipoMulta().equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getTipoDeMultaDosSalariosDevidosDoINSS())) continue;
                    taxaMulta = taxa.resolverTaxa(this.inss.getInssSobreSalariosDevidos(), competencia, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao);
                    break;
                }
            }
            ocorrencia.setTaxaDeMulta(taxaMulta);
        }
        this.calcularJurosDosSalariosDevidos(ocorrenciasSobreSalariosDevidosComBaseVerbas, true);
        ArrayList<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> arrayList = new ArrayList<OcorrenciaDeInssSobreSalariosDevidosAtualizacao>();
        boolean ajusteDeArredondamentoDoPrimeiroEvento = true;
        OcorrenciaDeInssSobreSalariosDevidosAtualizacao novaOcorrenciaAtualizacao = null;
        for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : ocorrenciasSobreSalariosDevidosComBaseVerbas) {
            if (ultimasOcorrenciasNaoAmortizadas != null && !ultimasOcorrenciasNaoAmortizadas.isEmpty()) {
                ajusteDeArredondamentoDoPrimeiroEvento = false;
                for (OcorrenciaDeInssSobreSalariosDevidosAtualizacao ocorrenciaAtualizacao : ultimasOcorrenciasNaoAmortizadas) {
                    if (!ocorrencia.getDataOcorrenciaInss().equals(ocorrenciaAtualizacao.getDataOcorrenciaInss()) || !ocorrencia.getDataInicioPeriodo().equals(ocorrenciaAtualizacao.getDataInicioPeriodo()) || !ocorrencia.getOcorrenciaDecimoTerceiro().equals(ocorrenciaAtualizacao.getOcorrenciaDecimoTerceiro())) continue;
                    novaOcorrenciaAtualizacao = new OcorrenciaDeInssSobreSalariosDevidosAtualizacao(ocorrencia, ocorrenciaAtualizacao);
                    break;
                }
            } else {
                novaOcorrenciaAtualizacao = new OcorrenciaDeInssSobreSalariosDevidosAtualizacao(ocorrencia);
            }
            if (novaOcorrenciaAtualizacao != null) {
                novaOcorrenciaAtualizacao.setDataEvento(this.dataLiquidacao);
                arrayList.add(novaOcorrenciaAtualizacao);
            }
            novaOcorrenciaAtualizacao = null;
        }
        this.ajustarArredondamento(arrayList, ajusteDeArredondamentoDoPrimeiroEvento);
        for (OcorrenciaDeInssSobreSalariosDevidosAtualizacao o : arrayList) {
            OcorrenciaDeInssSobreSalariosDevidosAtualizacao.salvar(o);
        }
    }

    private BigDecimal calcularValorBaseVerbas(List<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDasVerbasComIncidenciaDeInss, Competencia competencia, boolean isDecimoTerceiro) {
        BigDecimal somaDasDiferencasDasOcorrenciasDasVerbas = BigDecimal.ZERO;
        for (OptimizerListSearch<Competencia, OcorrenciaDeVerba> optimizerSearch : ocorrenciasDasVerbasComIncidenciaDeInss) {
            Iterator<OcorrenciaDeVerba> ocorrenciasDeVerba = optimizerSearch.search(competencia);
            while (Utils.naoNulo(ocorrenciasDeVerba) && ocorrenciasDeVerba.hasNext()) {
                BigDecimal base;
                OcorrenciaDeVerba ocorrenciaDeVerba = ocorrenciasDeVerba.next();
                if (Utils.nulo(ocorrenciaDeVerba) || !ocorrenciaDeVerba.getAtivo().booleanValue() || Utils.nulo(base = ocorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias())) continue;
                boolean isCaracteristicaVerbaDecimoTerceiro = CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)ocorrenciaDeVerba.getVerbaDeCalculo().getCaracteristica());
                if (isDecimoTerceiro && isCaracteristicaVerbaDecimoTerceiro || !isDecimoTerceiro && !isCaracteristicaVerbaDecimoTerceiro) {
                    somaDasDiferencasDasOcorrenciasDasVerbas = Utils.somar(somaDasDiferencasDasOcorrenciasDasVerbas, Utils.zerarSeNegativo(base));
                }
                if (!isDecimoTerceiro || !isCaracteristicaVerbaDecimoTerceiro || !RegimeDoContratoEnum.INTERMITENTE.equals((Object)ocorrenciaDeVerba.getVerbaDeCalculo().getCalculo().getRegimeDoContrato())) continue;
                somaDasDiferencasDasOcorrenciasDasVerbas = this.atualizarDiferencaDasOcorrenciasParaRegimeIntermitente(competencia, somaDasDiferencasDasOcorrenciasDasVerbas, ocorrenciaDeVerba);
            }
        }
        return somaDasDiferencasDasOcorrenciasDasVerbas;
    }

    private BigDecimal atualizarDiferencaDasOcorrenciasParaRegimeIntermitente(Competencia competencia, BigDecimal somaDasDiferencasDasOcorrenciasDasVerbas, OcorrenciaDeVerba ocorrenciaDeVerba) {
        HelperDate competenciaAuxiliar = HelperDate.getInstance(competencia.getAno(), competencia.getMes(), 1);
        competenciaAuxiliar.addDay(-1).setDay(1);
        HelperDate janeiroAnoCompetencia = HelperDate.getInstance(competencia.getAno(), 0, 1);
        while (HelperDate.dateAfterOrEquals(competenciaAuxiliar.getDate(), janeiroAnoCompetencia.getDate())) {
            Competencia competenciaOcorrencia = new Competencia(competenciaAuxiliar.getDate());
            Iterator<OcorrenciaDeVerba> ocorComp = ocorrenciaDeVerba.getVerbaDeCalculo().getOcorrenciasOptimizerListSearch().search(competenciaOcorrencia);
            while (Utils.naoNulo(ocorComp) && ocorComp.hasNext()) {
                BigDecimal valor;
                OcorrenciaDeVerba ocorCompInstance = ocorComp.next();
                if (Utils.nulo(ocorCompInstance) || !ocorCompInstance.getAtivo().booleanValue() || Utils.nulo(valor = ocorCompInstance.getDiferencaParaCalculoDasIncidencias())) continue;
                somaDasDiferencasDasOcorrenciasDasVerbas = Utils.somar(somaDasDiferencasDasOcorrenciasDasVerbas, Utils.zerarSeNegativo(valor));
            }
            competenciaAuxiliar.addDay(-1).setDay(1);
        }
        return somaDasDiferencasDasOcorrenciasDasVerbas;
    }

    private void ajustarArredondamento(List<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> ocorrencias, boolean primeiroEvento) {
        BigDecimal diferenca;
        boolean cobrarECorrigirDoReclamante;
        if (!this.necessitaAjustar() || ocorrencias.isEmpty()) {
            return;
        }
        BigDecimal totalDevidoCorrigidoSemArredondarTermoATermo = BigDecimal.ZERO;
        BigDecimal totalDevidoCorrigidoArredondandoTermoATermo = BigDecimal.ZERO;
        for (OcorrenciaDeInssSobreSalariosDevidosAtualizacao o : ocorrencias) {
            totalDevidoCorrigidoSemArredondarTermoATermo = Utils.somar(totalDevidoCorrigidoSemArredondarTermoATermo, Utils.multiplicar(o.getDevido(), o.getIndiceCorrecao()), totalDevidoCorrigidoSemArredondarTermoATermo);
            totalDevidoCorrigidoArredondandoTermoATermo = Utils.somar(totalDevidoCorrigidoArredondandoTermoATermo, o.getDevidoCorrigido(), totalDevidoCorrigidoArredondandoTermoATermo);
        }
        totalDevidoCorrigidoSemArredondarTermoATermo = Utils.arredondarValorMonetario(totalDevidoCorrigidoSemArredondarTermoATermo);
        boolean bl = cobrarECorrigirDoReclamante = this.inss.getInssSobreSalariosDevidos().getCobrarInssDoReclamante() != false && this.inss.getInssSobreSalariosDevidos().getCorrigirDescontoReclamante() != false;
        if (primeiroEvento && this.inss.getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && cobrarECorrigirDoReclamante && Utils.naoNulo(this.inss.getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante())) {
            TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(this.inss.getCalculo().getAtualizacaoMonetaria(), IndicesAcumuladosEnum.ATUALIZACAO_CALCULO, null, this.inss.getCalculo().getIgnorarTaxaCorrecaoNegativa());
            tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(new Periodo(this.inss.getCalculo().getDataDeLiquidacao(), this.dataLiquidacao));
            BigDecimal indiceDeCorrecao = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(this.inss.getCalculo().getDataDeLiquidacao());
            if (Utils.naoNulo(indiceDeCorrecao)) {
                totalDevidoCorrigidoSemArredondarTermoATermo = Utils.arredondarValorMonetario(Utils.multiplicar(this.inss.getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante(), indiceDeCorrecao));
            }
        }
        if (BigDecimal.ZERO.compareTo(diferenca = Utils.subtrair(totalDevidoCorrigidoArredondandoTermoATermo, totalDevidoCorrigidoSemArredondarTermoATermo)) != 0 && diferenca.compareTo(UM_CENTAVO.multiply(new BigDecimal(ocorrencias.size()))) <= 0) {
            boolean erroPositivo = diferenca.signum() == 1;
            diferenca = diferenca.abs();
            ArrayList<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> ocorrenciasAjustadas = new ArrayList<OcorrenciaDeInssSobreSalariosDevidosAtualizacao>();
            while (BigDecimal.ZERO.compareTo(diferenca) != 0) {
                OcorrenciaDeInssSobreSalariosDevidosAtualizacao maiorOcorrencia = null;
                BigDecimal maior = null;
                for (OcorrenciaDeInssSobreSalariosDevidosAtualizacao o : ocorrencias) {
                    maior = maior == null ? o.getDevido() : maior;
                    OcorrenciaDeInssSobreSalariosDevidosAtualizacao ocorrenciaDeInssSobreSalariosDevidosAtualizacao = maiorOcorrencia = maiorOcorrencia == null ? o : maiorOcorrencia;
                    if (maior.compareTo(o.getDevido()) >= 0 || ocorrenciasAjustadas.contains(o)) continue;
                    maior = o.getDevido();
                    maiorOcorrencia = o;
                }
                ocorrenciasAjustadas.add(maiorOcorrencia);
                this.ajustarUmCentavo(maiorOcorrencia, erroPositivo);
                diferenca = Utils.subtrair(diferenca, UM_CENTAVO);
            }
        }
    }

    private boolean necessitaAjustar() {
        return !(Utils.naoNulo(this.inss.getInssSobreSalariosDevidos().getTotalGeralInssEmpresa()) && BigDecimal.ZERO.compareTo(this.inss.getInssSobreSalariosDevidos().getTotalGeralInssEmpresa()) != 0 || Utils.naoNulo(this.inss.getInssSobreSalariosDevidos().getTotalGeralInssSAT()) && BigDecimal.ZERO.compareTo(this.inss.getInssSobreSalariosDevidos().getTotalGeralInssSAT()) != 0 || Utils.naoNulo(this.inss.getInssSobreSalariosDevidos().getTotalGeralInssTerceiros()) && BigDecimal.ZERO.compareTo(this.inss.getInssSobreSalariosDevidos().getTotalGeralInssTerceiros()) != 0 || this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosDevidosDoINSS() == false || this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS() != false) && this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941() == false;
    }

    private void ajustarUmCentavo(OcorrenciaDeInssSobreSalariosDevidosAtualizacao maiorOcorrencia, boolean erroPositivo) {
        if (erroPositivo) {
            maiorOcorrencia.setDevidoCorrigido(Utils.subtrair(maiorOcorrencia.getDevidoCorrigido(), new BigDecimal("0.01")));
            maiorOcorrencia.setTotal(Utils.subtrair(maiorOcorrencia.getTotal(), new BigDecimal("0.01")));
            maiorOcorrencia.setDevidoDiferenca(Utils.subtrair(maiorOcorrencia.getDevidoDiferenca(), new BigDecimal("0.01")));
            maiorOcorrencia.setTotalDiferenca(Utils.subtrair(maiorOcorrencia.getTotalDiferenca(), new BigDecimal("0.01")));
        } else {
            maiorOcorrencia.setDevidoCorrigido(Utils.somar(maiorOcorrencia.getDevidoCorrigido(), new BigDecimal("0.01")));
            maiorOcorrencia.setTotal(Utils.somar(maiorOcorrencia.getTotal(), new BigDecimal("0.01")));
            maiorOcorrencia.setDevidoDiferenca(Utils.somar(maiorOcorrencia.getDevidoDiferenca(), new BigDecimal("0.01")));
            maiorOcorrencia.setTotalDiferenca(Utils.somar(maiorOcorrencia.getTotalDiferenca(), new BigDecimal("0.01")));
        }
    }

    private void liquidarInssSobreSalariosDevidos() {
        Competencia competencia;
        if (!this.inss.getInssSobreSalariosDevidos().existemOcorrencias()) {
            return;
        }
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDasVerbasComIncidenciaDeInss = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>>();
        for (VerbaDeCalculo verba : this.inss.getCalculo().getVerbasAtivas()) {
            if (!verba.getIncidenciaINSS().booleanValue()) continue;
            ocorrenciasDasVerbasComIncidenciaDeInss.add(verba.getOcorrenciasOptimizerListSearch());
        }
        for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : this.inss.getInssSobreSalariosDevidos().getOcorrencias()) {
            competencia = new Competencia(ocorrencia.getDataOcorrenciaInss());
            ocorrencia.setValorBaseVerbas(this.calcularValorBaseVerbas(ocorrenciasDasVerbasComIncidenciaDeInss, competencia, ocorrencia.getOcorrenciaDecimoTerceiro()));
        }
        this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante = this.obterTabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante(Boolean.TRUE);
        this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidos = this.obterTabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidos(Boolean.TRUE);
        if (this.inss.getInssSobreSalariosDevidos().getCorrecaoPrevidenciaria().booleanValue()) {
            this.tabelaCorrecaoPrevidenciaria = this.obterTabelaParaCorrecaoPrevidenciaria(this.dataLiquidacao);
        }
        TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch listaAliquotasSeguradoEmpregado = null;
        TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch listaAliquotasEmpregadoDomestico = null;
        competencia = new Competencia();
        for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : this.inss.getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba()) {
            Competencia competenciaDaMulta;
            competencia.update(ocorrencia.getDataOcorrenciaInss());
            if (TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDaBase())) {
                OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial;
                Iterator<OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarial;
                BigDecimal baseHistorico;
                Periodo periodoRecalculo = competencia.criarPeriodoDaCompetencia();
                if (!ocorrencia.getOcorrenciaDecimoTerceiro().booleanValue()) {
                    periodoRecalculo.setInicial(ocorrencia.getDataInicioPeriodo());
                    if (HelperDate.dateAfter(periodoRecalculo.getFinal(), ocorrencia.getInssSobreSalariosDevidos().getDataTerminoPeriodo())) {
                        periodoRecalculo.setFinal(ocorrencia.getInssSobreSalariosDevidos().getDataTerminoPeriodo());
                    }
                    baseHistorico = BigDecimal.ZERO;
                    for (OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarialOptimizeSearch : this.historicosSalariais) {
                        ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(competencia);
                        while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                            ocorrenciaDoHistoricoSalarial = ocorrenciasDoHistoricoSalarial.next();
                            if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                            BigDecimal valorOcorrenciaDoHistorico = BigDecimal.ZERO;
                            if (ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getAplicarProporcionalidadeINSS().booleanValue()) {
                                int diasParaExcluir = 0;
                                if (periodoRecalculo.totalDeDias() - (diasParaExcluir += this.inss.getCalculo().obterDiasFerias(periodoRecalculo)) == 31) {
                                    diasParaExcluir = 1;
                                }
                                CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar(periodoRecalculo, ocorrenciaDoHistoricoSalarial.getValor(), diasParaExcluir += this.inss.getCalculo().obterFaltasNaoJustificadas(periodoRecalculo));
                                calculoDoProporcionalizar.executar();
                                valorOcorrenciaDoHistorico = calculoDoProporcionalizar.getResultado();
                            } else {
                                valorOcorrenciaDoHistorico = ocorrenciaDoHistoricoSalarial.getValor();
                            }
                            baseHistorico = baseHistorico.add(valorOcorrenciaDoHistorico, Utils.CONTEXTO_MATEMATICO);
                        }
                    }
                    ocorrencia.setValorBase(baseHistorico);
                } else {
                    periodoRecalculo.setInicial(ocorrencia.getDataInicioPeriodo());
                    periodoRecalculo.setFinal(ocorrencia.getDataTerminoPeriodo());
                    baseHistorico = BigDecimal.ZERO;
                    for (OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarialOptimizeSearch : this.historicosSalariais) {
                        ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(competencia);
                        while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                            ocorrenciaDoHistoricoSalarial = ocorrenciasDoHistoricoSalarial.next();
                            if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                            baseHistorico = baseHistorico.add(ocorrenciaDoHistoricoSalarial.getValor(), Utils.CONTEXTO_MATEMATICO);
                        }
                    }
                    int avos = RepositorioDeInss.calculaAvosInssDecimoTerceiro(this.inss.getCalculo(), periodoRecalculo);
                    baseHistorico = baseHistorico.multiply(new BigDecimal(avos), Utils.CONTEXTO_MATEMATICO);
                    baseHistorico = baseHistorico.divide(new BigDecimal(12), Utils.CONTEXTO_MATEMATICO);
                    ocorrencia.setValorBase(baseHistorico);
                }
            }
            BigDecimal aliquotaDoSegurado = null;
            BigDecimal aliquotaDoTotalSegurado = null;
            switch (this.inss.getTipoAliquotaSegurado()) {
                case FIXA: {
                    aliquotaDoSegurado = this.inss.getAliquotaSeguradoFixa();
                    aliquotaDoTotalSegurado = this.inss.getAliquotaSeguradoFixa();
                    break;
                }
                case SEGURADO_EMPREGADO: {
                    listaAliquotasSeguradoEmpregado = this.inss.obterListaOtimizadaAliquotasSeguradoEmpregado();
                    Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado = listaAliquotasSeguradoEmpregado.search(competencia);
                    if (!Utils.naoNulo(tabelaSeguradoEmpregado) || !tabelaSeguradoEmpregado.hasNext()) break;
                    TabelaPrevidenciariaSeguradoEmpregado tpse = tabelaSeguradoEmpregado.next();
                    aliquotaDoSegurado = tpse.obterAliquotaParaValor(ocorrencia.getValorBase());
                    if (Utils.nulo(ocorrencia.getValorBaseVerbas())) {
                        aliquotaDoTotalSegurado = tpse.obterAliquotaParaValor(ocorrencia.getValorBase());
                        break;
                    }
                    aliquotaDoTotalSegurado = tpse.obterAliquotaParaValor(ocorrencia.getValorBase().add(ocorrencia.getValorBaseVerbas(), Utils.CONTEXTO_MATEMATICO));
                    break;
                }
                case EMPREGADO_DOMESTICO: {
                    Iterator<TabelaPrevidenciariaEmpregadoDomestico> tabelaEmpregadoDomestico;
                    if (Utils.nulo(listaAliquotasEmpregadoDomestico)) {
                        listaAliquotasEmpregadoDomestico = this.inss.obterListaOtimizadaDeAliquotasEmpregadoDomestico();
                    }
                    if (!Utils.naoNulo(tabelaEmpregadoDomestico = listaAliquotasEmpregadoDomestico.search(competencia)) || !tabelaEmpregadoDomestico.hasNext()) break;
                    TabelaPrevidenciariaEmpregadoDomestico tped = tabelaEmpregadoDomestico.next();
                    aliquotaDoSegurado = tped.obterAliquotaParaValor(ocorrencia.getValorBase());
                    if (Utils.nulo(ocorrencia.getValorBaseVerbas())) {
                        aliquotaDoTotalSegurado = tped.obterAliquotaParaValor(ocorrencia.getValorBase());
                        break;
                    }
                    aliquotaDoTotalSegurado = tped.obterAliquotaParaValor(ocorrencia.getValorBase().add(ocorrencia.getValorBaseVerbas(), Utils.CONTEXTO_MATEMATICO));
                    break;
                }
            }
            ocorrencia.setAliquotaSegurado(aliquotaDoSegurado);
            ocorrencia.setAliquotaDoTotalSegurado(aliquotaDoTotalSegurado);
            ocorrencia.setValorTotalInssSegurado(this.calcularValorTotalInssSegurado(ocorrencia));
            BigDecimal baseVerbasVezesAliquotaCheiaSegurado = BigDecimal.ZERO;
            if (Utils.naoNulo(ocorrencia.getAliquotaDoTotalSegurado()) && Utils.naoNulo(ocorrencia.getValorBaseVerbas())) {
                baseVerbasVezesAliquotaCheiaSegurado = ocorrencia.getValorBaseVerbas().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaDoTotalSegurado()), Utils.CONTEXTO_MATEMATICO);
            }
            ocorrencia.setValorDevidoSeguradoVerbas(baseVerbasVezesAliquotaCheiaSegurado);
            if (ocorrencia.isRealizarCalculoParaSegurado() && Utils.naoNulo(ocorrencia.getValorDevidoSeguradoVerbas())) {
                BigDecimal valorDevidoSegurado = null;
                if (ocorrencia.isLimitarTetoSegurado()) {
                    valorDevidoSegurado = ocorrencia.getValorTetoSegurado().subtract(ocorrencia.getValorTotalInssSegurado(), Utils.CONTEXTO_MATEMATICO);
                    if (valorDevidoSegurado.compareTo(ocorrencia.getValorDevidoSeguradoVerbas()) > 0) {
                        valorDevidoSegurado = ocorrencia.getValorDevidoSeguradoVerbas();
                    }
                } else {
                    valorDevidoSegurado = ocorrencia.getValorDevidoSeguradoVerbas();
                }
                ocorrencia.setValorDevidoSeguradoFinal(valorDevidoSegurado);
            }
            if (ocorrencia.getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && ocorrencia.getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue() && ocorrencia.getInssSobreSalariosDevidos().getCorrigirDescontoReclamante().booleanValue() && Utils.naoNulo(this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante)) {
                ocorrencia.setIndiceDeCorrecaoDoReclamante(this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante.obterValorAcumuladoDoIndice(ocorrencia.getDataOcorrenciaInss()));
                ocorrencia.setFatorCorrecao(BigDecimal.ONE);
            } else {
                BigDecimal conversaoMoeda = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(ocorrencia.getDataOcorrenciaInss()).addDay(1).getDate(), this.dataLiquidacao);
                if (PRECISAO_MINIMA.compareTo(conversaoMoeda) > 0) {
                    ocorrencia.setFatorCorrecao(FATOR_CORRECAO);
                    conversaoMoeda = Utils.multiplicar(conversaoMoeda, FATOR_CORRECAO);
                } else {
                    ocorrencia.setFatorCorrecao(BigDecimal.ONE);
                }
                ocorrencia.setIndiceDeCorrecaoDoReclamante(conversaoMoeda);
            }
            ocorrencia.setIndiceDeCorrecaoTrabalhistaUtilizado(this.obterIndiceDeCorrecaoTrabalhistaUtilizado(ocorrencia, this.inss.getInssSobreSalariosDevidos(), Boolean.TRUE));
            ocorrencia.setIndiceDeCorrecaoPrevidenciariaUtilizado(this.obterIndiceDeCorrecaoPrevidenciariaUtilizado(ocorrencia, this.inss.getInssSobreSalariosDevidos(), competencia));
            if (ocorrencia.isRealizarCalculoParaEmpresa()) {
                BigDecimal valorTotalInssEmpresa = ocorrencia.getValorBase().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaEmpresa()), Utils.CONTEXTO_MATEMATICO);
                if (ocorrencia.isLimitarTetoEmpresa() && valorTotalInssEmpresa.compareTo(ocorrencia.getValorTetoEmpresa()) > 0) {
                    valorTotalInssEmpresa = ocorrencia.getValorTetoEmpresa();
                }
                ocorrencia.setValorTotalInssEmpresa(valorTotalInssEmpresa);
                BigDecimal baseVerbasVezesAliquotaEmpresa = null;
                if (Utils.naoNulo(ocorrencia.getValorBaseVerbas())) {
                    baseVerbasVezesAliquotaEmpresa = ocorrencia.getValorBaseVerbas().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaEmpresa()), Utils.CONTEXTO_MATEMATICO);
                }
                ocorrencia.setValorDevidoEmpresaVerbas(baseVerbasVezesAliquotaEmpresa);
                BigDecimal valorDevidoEmpresa = null;
                if (Utils.naoNulo(ocorrencia.getValorDevidoEmpresaVerbas())) {
                    if (ocorrencia.isLimitarTetoEmpresa()) {
                        valorDevidoEmpresa = ocorrencia.getValorTetoEmpresa().subtract(ocorrencia.getValorTotalInssEmpresa(), Utils.CONTEXTO_MATEMATICO);
                        if (valorDevidoEmpresa.compareTo(ocorrencia.getValorDevidoEmpresaVerbas()) > 0) {
                            valorDevidoEmpresa = ocorrencia.getValorDevidoEmpresaVerbas();
                        }
                    } else if (Utils.naoNulo(ocorrencia.getValorBaseVerbas())) {
                        valorDevidoEmpresa = ocorrencia.getValorBaseVerbas().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaEmpresa()), Utils.CONTEXTO_MATEMATICO);
                    }
                }
                ocorrencia.setValorDevidoEmpresaFinal(valorDevidoEmpresa);
            }
            if (ocorrencia.isRealizarCalculoParaSAT()) {
                BigDecimal valorDevidoSAT = null;
                if (Utils.naoNulo(ocorrencia.getValorBaseVerbas())) {
                    valorDevidoSAT = ocorrencia.getValorBaseVerbas().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaSAT()), Utils.CONTEXTO_MATEMATICO);
                }
                ocorrencia.setValorDevidoSAT(valorDevidoSAT);
            }
            if (ocorrencia.isRealizarCalculoParaTerceiros()) {
                BigDecimal valorDevidoTerceiros = null;
                if (Utils.naoNulo(ocorrencia.getValorBaseVerbas())) {
                    valorDevidoTerceiros = ocorrencia.getValorBaseVerbas().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaTerceiros()), Utils.CONTEXTO_MATEMATICO);
                }
                ocorrencia.setValorDevidoTerceiros(valorDevidoTerceiros);
            }
            BigDecimal taxaMulta = null;
            if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941().booleanValue() && Utils.naoNulo(competencia.getData()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.dataLiquidacao).getDate()) && HelperDate.dateAfterOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941()).getDate())) {
                competenciaDaMulta = competencia;
                if (!this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Multa().booleanValue() || Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Multa())) {
                    HelperDate ocorrenciaHelper = HelperDate.getInstance(ocorrencia.getDataOcorrenciaInss());
                    if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Multa().booleanValue() && HelperDate.dateAfterOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941()).getDate()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Multa()).getDate())) {
                        competenciaDaMulta = new Competencia(HelperDate.getInstance(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Multa()).getDate());
                        ocorrenciaHelper = HelperDate.getInstance(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Multa());
                    }
                    this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterListaOtimizada(this.dataInicialApuracaoMulta11941, this.dataFinalApuracaoMulta11941);
                    Iterator<TaxaMultaPrevidenciaria> taxas = this.tabelaTaxaDeMulta.search(competenciaDaMulta);
                    while (Utils.naoNulo(taxas) && taxas.hasNext()) {
                        TaxaMultaPrevidenciaria taxa = taxas.next();
                        if (!Utils.naoNulo((Object)taxa.getTipoMulta()) || !taxa.getTipoMulta().equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getTipoDeMultaDosSalariosDevidosDoINSS())) continue;
                        taxaMulta = this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Multa().booleanValue() && HelperDate.dateEquals(competenciaDaMulta.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Multa()).getDate()) ? taxa.resolverTaxa(this.inss.getInssSobreSalariosDevidos(), ocorrenciaHelper, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao, true) : taxa.resolverTaxa(this.inss.getInssSobreSalariosDevidos(), competencia, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao);
                        break;
                    }
                }
            } else if (this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarMultaDosSalariosDevidosDoINSS().booleanValue() && Utils.naoNulo(competencia.getData()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.dataLiquidacao).getDate())) {
                competenciaDaMulta = competencia;
                if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosDevidosDoINSS().booleanValue() && Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()).getDate())) {
                    competenciaDaMulta = new Competencia(HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()).getDate());
                }
                if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS().booleanValue() && Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()).getDate())) {
                    competenciaDaMulta = new Competencia(HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS()).getDate());
                }
                this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterListaOtimizada(this.dataInicialApuracaoMulta, this.dataFinalApuracaoMulta);
                Iterator<TaxaMultaPrevidenciaria> taxas = this.tabelaTaxaDeMulta.search(competenciaDaMulta);
                while (Utils.naoNulo(taxas) && taxas.hasNext()) {
                    TaxaMultaPrevidenciaria taxa = taxas.next();
                    if (!Utils.naoNulo((Object)taxa.getTipoMulta()) || !taxa.getTipoMulta().equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getTipoDeMultaDosSalariosDevidosDoINSS())) continue;
                    taxaMulta = taxa.resolverTaxa(this.inss.getInssSobreSalariosDevidos(), competencia, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao);
                    break;
                }
            }
            ocorrencia.setTaxaDeMulta(taxaMulta);
        }
    }

    private void liquidarInssSobreSalariosPagosDaAtualizacao(List<OcorrenciaDeInssSobreSalariosPagos> ocorrenciasSobreSalariosPagos) {
        Object mesDoInicioDaCorrecao;
        Date dataInicialDeCorrecao;
        if (Utils.nulo(ocorrenciasSobreSalariosPagos) || ocorrenciasSobreSalariosPagos.isEmpty()) {
            return;
        }
        List<OcorrenciaDeInssSobreSalariosPagosAtualizacao> ultimasOcorrenciasNaoAmortizadas = InssSobreSalariosPagos.obterUltimasOcorrenciasNaoAmortizadas(this.inss.getInssSobreSalariosPagos());
        ArrayList<OcorrenciaDeInssSobreSalariosPagos> tempOcorrenciasSobreSalariosPagos = new ArrayList<OcorrenciaDeInssSobreSalariosPagos>();
        if (ultimasOcorrenciasNaoAmortizadas != null) {
            if (!ultimasOcorrenciasNaoAmortizadas.isEmpty()) {
                OcorrenciaDeInssSobreSalariosPagosAtualizacao ultimaOcorrenciaMaisAntiga = ultimasOcorrenciasNaoAmortizadas.get(0);
                for (OcorrenciaDeInssSobreSalariosPagos ocorrencia : ocorrenciasSobreSalariosPagos) {
                    if (!ocorrencia.getDataOcorrenciaInss().before(ultimaOcorrenciaMaisAntiga.getDataOcorrenciaInss())) continue;
                    tempOcorrenciasSobreSalariosPagos.add(ocorrencia);
                }
                ocorrenciasSobreSalariosPagos.removeAll(tempOcorrenciasSobreSalariosPagos);
            } else {
                ocorrenciasSobreSalariosPagos.clear();
            }
        }
        this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosPagos = this.obterTabelaDeCorrecaoMonetariaTrabalhistaSalariosPagos(Boolean.FALSE);
        if (Utils.naoNulo(this.dataUltimaLiquidacao) && HelperDate.dateAfter(dataInicialDeCorrecao = HelperDate.getInstance(this.dataUltimaLiquidacao).addDay(1).getDate(), ((HelperDate)(mesDoInicioDaCorrecao = HelperDate.getCurrentCompetence(dataInicialDeCorrecao))).getDate()) && Utils.naoNulo(this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosPagos)) {
            this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosPagos.excluirCompetencia((HelperDate)mesDoInicioDaCorrecao);
        }
        if (this.inss.getInssSobreSalariosPagos().getCorrecaoPrevidenciaria().booleanValue() && Utils.nulo(this.tabelaCorrecaoPrevidenciaria)) {
            this.tabelaCorrecaoPrevidenciaria = this.obterTabelaParaCorrecaoPrevidenciaria(this.dataLiquidacao);
        }
        Competencia competencia = new Competencia();
        for (OcorrenciaDeInssSobreSalariosPagos ocorrencia : ocorrenciasSobreSalariosPagos) {
            Competencia competenciaDaMulta;
            competencia.update(ocorrencia.getDataOcorrenciaInss());
            this.recalculaBasesHistoricoERecolhidoInssSalariosPagos(ocorrencia, competencia, TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDaBase()));
            this.recalculaAliquotaSeguradoERecolhidoInssSalariosPagos(ocorrencia, competencia);
            if (TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDoRecolhidoSegurado())) {
                BigDecimal recolhidoSegurado = ocorrencia.getValorBaseRecolhido();
                if (Utils.naoNulos(recolhidoSegurado = Utils.naoNulos(recolhidoSegurado, ocorrencia.getAliquotaRecolhidoSegurado()) ? recolhidoSegurado.multiply(ocorrencia.getAliquotaRecolhidoSegurado().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO, ocorrencia.getValorTetoSegurado()) && recolhidoSegurado.compareTo(ocorrencia.getValorTetoSegurado()) > 0) {
                    recolhidoSegurado = ocorrencia.getValorTetoSegurado();
                }
                ocorrencia.setValorRecolhidoSegurado(recolhidoSegurado);
            }
            if (TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDoRecolhidoEmpresa())) {
                BigDecimal recolhidoEmpresa = ocorrencia.getValorBaseRecolhido();
                if (Utils.naoNulos(recolhidoEmpresa = Utils.naoNulos(recolhidoEmpresa, ocorrencia.getAliquotaEmpresa()) ? recolhidoEmpresa.multiply(ocorrencia.getAliquotaEmpresa().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO, ocorrencia.getValorTetoEmpresa()) && recolhidoEmpresa.compareTo(ocorrencia.getValorTetoEmpresa()) > 0) {
                    recolhidoEmpresa = ocorrencia.getValorTetoEmpresa();
                }
                ocorrencia.setValorRecolhidoEmpresa(recolhidoEmpresa);
            }
            if (TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDoRecolhidoSAT())) {
                BigDecimal recolhidoSAT = ocorrencia.getValorBaseRecolhido();
                recolhidoSAT = Utils.naoNulos(recolhidoSAT, ocorrencia.getAliquotaSAT()) ? recolhidoSAT.multiply(ocorrencia.getAliquotaSAT().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                ocorrencia.setValorRecolhidoSAT(recolhidoSAT);
            }
            if (TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDoRecolhidoTerceiros())) {
                BigDecimal recolhidoTerceiros = ocorrencia.getValorBaseRecolhido();
                recolhidoTerceiros = Utils.naoNulos(recolhidoTerceiros, ocorrencia.getAliquotaTerceiros()) ? recolhidoTerceiros.multiply(ocorrencia.getAliquotaTerceiros().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                ocorrencia.setValorRecolhidoTerceiros(recolhidoTerceiros);
            }
            ocorrencia.setValorTotalInssSegurado(this.calcularValorTotalInssSegurado(ocorrencia));
            if (ocorrencia.isRealizarCalculoParaSegurado()) {
                BigDecimal valorDevidoSegurado = BigDecimal.ZERO;
                if (Utils.naoNulos(ocorrencia.getValorTotalInssSegurado(), ocorrencia.getValorRecolhidoSegurado()) && ocorrencia.getValorTotalInssSegurado().compareTo(ocorrencia.getValorRecolhidoSegurado()) > 0) {
                    valorDevidoSegurado = ocorrencia.getValorTotalInssSegurado().subtract(ocorrencia.getValorRecolhidoSegurado(), Utils.CONTEXTO_MATEMATICO);
                }
                if (ocorrencia.isLimitarTetoSegurado() && Utils.naoNulos(valorDevidoSegurado, ocorrencia.getValorTetoSegurado()) && Utils.naoNulo(valorDevidoSegurado) && valorDevidoSegurado.compareTo(ocorrencia.getValorTetoSegurado()) > 0) {
                    valorDevidoSegurado = ocorrencia.getValorTetoSegurado();
                }
                ocorrencia.setValorDevidoSeguradoFinal(valorDevidoSegurado);
            }
            ocorrencia.setIndiceDeCorrecaoTrabalhistaUtilizado(this.obterIndiceDeCorrecaoTrabalhistaUtilizado(ocorrencia, this.inss.getInssSobreSalariosPagos(), Boolean.FALSE));
            ocorrencia.setIndiceDeCorrecaoPrevidenciariaUtilizado(this.obterIndiceDeCorrecaoPrevidenciariaUtilizado(ocorrencia, this.inss.getInssSobreSalariosPagos(), Utils.naoNulo(this.dataUltimaLiquidacao) ? Competencia.getInstance(this.dataUltimaLiquidacao) : competencia));
            if (ocorrencia.isRealizarCalculoParaEmpresa()) {
                BigDecimal valorTotalInssEmpresa = null;
                if (Utils.naoNulo(ocorrencia.getValorBase())) {
                    valorTotalInssEmpresa = ocorrencia.getValorBase().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaEmpresa()), Utils.CONTEXTO_MATEMATICO);
                }
                if (ocorrencia.isLimitarTetoEmpresa() && Utils.naoNulos(valorTotalInssEmpresa, ocorrencia.getValorTetoEmpresa()) && valorTotalInssEmpresa.compareTo(ocorrencia.getValorTetoEmpresa()) > 0) {
                    valorTotalInssEmpresa = ocorrencia.getValorTetoEmpresa();
                }
                ocorrencia.setValorTotalInssEmpresa(valorTotalInssEmpresa);
                BigDecimal valorDevidoEmpresa = null;
                if (Utils.naoNulos(ocorrencia.getValorTotalInssEmpresa(), ocorrencia.getValorRecolhidoEmpresa())) {
                    valorDevidoEmpresa = ocorrencia.getValorTotalInssEmpresa().subtract(ocorrencia.getValorRecolhidoEmpresa(), Utils.CONTEXTO_MATEMATICO);
                }
                if (ocorrencia.isLimitarTetoEmpresa() && Utils.naoNulos(valorDevidoEmpresa, ocorrencia.getValorTetoEmpresa()) && valorDevidoEmpresa.compareTo(ocorrencia.getValorTetoEmpresa()) > 0) {
                    valorDevidoEmpresa = ocorrencia.getValorTetoEmpresa();
                }
                ocorrencia.setValorDevidoEmpresaFinal(valorDevidoEmpresa);
            }
            if (ocorrencia.isRealizarCalculoParaSAT()) {
                if (Utils.naoNulo(ocorrencia.getValorBase())) {
                    ocorrencia.setValorTotalInssSAT(ocorrencia.getValorBase().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaSAT()), Utils.CONTEXTO_MATEMATICO));
                }
                BigDecimal valorDevidoSAT = null;
                if (Utils.naoNulos(ocorrencia.getValorTotalInssSAT(), ocorrencia.getValorRecolhidoSAT())) {
                    valorDevidoSAT = ocorrencia.getValorTotalInssSAT().subtract(ocorrencia.getValorRecolhidoSAT(), Utils.CONTEXTO_MATEMATICO);
                }
                if (Utils.naoNulo(valorDevidoSAT) && valorDevidoSAT.compareTo(BigDecimal.ZERO) >= 0) {
                    ocorrencia.setValorDevidoSAT(valorDevidoSAT);
                } else {
                    ocorrencia.setValorDevidoSAT(BigDecimal.ZERO);
                }
            }
            if (ocorrencia.isRealizarCalculoParaTerceiros()) {
                if (Utils.naoNulo(ocorrencia.getValorBase())) {
                    ocorrencia.setValorTotalInssTerceiros(ocorrencia.getValorBase().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaTerceiros()), Utils.CONTEXTO_MATEMATICO));
                }
                BigDecimal valorDevidoTerceiros = null;
                if (Utils.naoNulos(ocorrencia.getValorTotalInssTerceiros(), ocorrencia.getValorRecolhidoTerceiros())) {
                    valorDevidoTerceiros = ocorrencia.getValorTotalInssTerceiros().subtract(ocorrencia.getValorRecolhidoTerceiros(), Utils.CONTEXTO_MATEMATICO);
                }
                if (Utils.naoNulo(valorDevidoTerceiros) && valorDevidoTerceiros.compareTo(BigDecimal.ZERO) >= 0) {
                    ocorrencia.setValorDevidoTerceiros(valorDevidoTerceiros);
                } else {
                    ocorrencia.setValorDevidoTerceiros(BigDecimal.ZERO);
                }
            }
            BigDecimal taxaMulta = null;
            if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Pago().booleanValue() && Utils.naoNulo(competencia.getData()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.dataLiquidacao).getDate()) && HelperDate.dateAfterOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Pago()).getDate())) {
                competenciaDaMulta = competencia;
                if (!this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941PagoMulta().booleanValue() || Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941PagoMulta())) {
                    HelperDate ocorrenciaHelper = HelperDate.getInstance(ocorrencia.getDataOcorrenciaInss());
                    if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941PagoMulta().booleanValue() && HelperDate.dateAfterOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Pago()).getDate()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941PagoMulta()).getDate())) {
                        competenciaDaMulta = new Competencia(HelperDate.getInstance(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941PagoMulta()).getDate());
                        ocorrenciaHelper = HelperDate.getInstance(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941PagoMulta());
                    }
                    this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterListaOtimizada(this.dataInicialApuracaoMulta11941, this.dataFinalApuracaoMulta11941);
                    Iterator<TaxaMultaPrevidenciaria> taxas = this.tabelaTaxaDeMulta.search(competenciaDaMulta);
                    while (Utils.naoNulo(taxas) && taxas.hasNext()) {
                        TaxaMultaPrevidenciaria taxa = taxas.next();
                        if (!Utils.naoNulo((Object)taxa.getTipoMulta()) || !taxa.getTipoMulta().equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getTipoDeMultaDosSalariosPagosDoINSS())) continue;
                        taxaMulta = this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941PagoMulta().booleanValue() && HelperDate.dateEquals(competenciaDaMulta.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941PagoMulta()).getDate()) ? taxa.resolverTaxa(this.inss.getInssSobreSalariosPagos(), ocorrenciaHelper, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao, true) : taxa.resolverTaxa(this.inss.getInssSobreSalariosPagos(), competencia, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao);
                        break;
                    }
                }
            } else if (this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarMultaDosSalariosPagosDoINSS().booleanValue() && Utils.naoNulo(competencia.getData()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.dataLiquidacao).getDate())) {
                competenciaDaMulta = competencia;
                if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosPagosDoINSS().booleanValue() && Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()).getDate())) {
                    competenciaDaMulta = new Competencia(HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()).getDate());
                }
                if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosPagosDoINSS().booleanValue() && Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()).getDate())) {
                    competenciaDaMulta = new Competencia(HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()).getDate());
                }
                this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterListaOtimizada(this.dataInicialApuracaoMulta, this.dataFinalApuracaoMulta);
                Iterator<TaxaMultaPrevidenciaria> taxas = this.tabelaTaxaDeMulta.search(competenciaDaMulta);
                while (Utils.naoNulo(taxas) && taxas.hasNext()) {
                    TaxaMultaPrevidenciaria taxa = taxas.next();
                    if (!Utils.naoNulo((Object)taxa.getTipoMulta()) || !taxa.getTipoMulta().equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getTipoDeMultaDosSalariosPagosDoINSS())) continue;
                    taxaMulta = taxa.resolverTaxa(this.inss.getInssSobreSalariosPagos(), competencia, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao);
                    break;
                }
            }
            ocorrencia.setTaxaDeMulta(taxaMulta);
        }
        this.calcularJurosDosSalariosPagos(ocorrenciasSobreSalariosPagos, true);
        OcorrenciaDeInssSobreSalariosPagosAtualizacao novaOcorrenciaAtualizacao = null;
        for (OcorrenciaDeInssSobreSalariosPagos ocorrencia : ocorrenciasSobreSalariosPagos) {
            if (ultimasOcorrenciasNaoAmortizadas != null && !ultimasOcorrenciasNaoAmortizadas.isEmpty()) {
                for (OcorrenciaDeInssSobreSalariosPagosAtualizacao ocorrenciaAtualizacao : ultimasOcorrenciasNaoAmortizadas) {
                    if (!ocorrencia.getDataOcorrenciaInss().equals(ocorrenciaAtualizacao.getDataOcorrenciaInss()) || !ocorrencia.getDataInicioPeriodo().equals(ocorrenciaAtualizacao.getDataInicioPeriodo()) || !ocorrencia.getOcorrenciaDecimoTerceiro().equals(ocorrenciaAtualizacao.getOcorrenciaDecimoTerceiro())) continue;
                    novaOcorrenciaAtualizacao = new OcorrenciaDeInssSobreSalariosPagosAtualizacao(ocorrencia, ocorrenciaAtualizacao);
                    break;
                }
            } else {
                novaOcorrenciaAtualizacao = new OcorrenciaDeInssSobreSalariosPagosAtualizacao(ocorrencia);
            }
            if (novaOcorrenciaAtualizacao == null) continue;
            novaOcorrenciaAtualizacao.setDataEvento(this.dataLiquidacao);
            OcorrenciaDeInssSobreSalariosPagosAtualizacao.salvar(novaOcorrenciaAtualizacao);
        }
        this.tabelaCorrecaoPrevidenciaria = null;
    }

    private void liquidarInssSobreSalariosPagos() {
        if (!this.inss.getInssSobreSalariosPagos().existemOcorrencias()) {
            return;
        }
        this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosPagos = this.obterTabelaDeCorrecaoMonetariaTrabalhistaSalariosPagos(Boolean.TRUE);
        if (this.inss.getInssSobreSalariosPagos().getCorrecaoPrevidenciaria().booleanValue() && Utils.nulo(this.tabelaCorrecaoPrevidenciaria)) {
            this.tabelaCorrecaoPrevidenciaria = this.obterTabelaParaCorrecaoPrevidenciaria(this.dataLiquidacao);
        }
        Competencia competencia = new Competencia();
        for (OcorrenciaDeInssSobreSalariosPagos ocorrencia : this.inss.getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos()) {
            Competencia competenciaDaMulta;
            competencia.update(ocorrencia.getDataOcorrenciaInss());
            this.recalculaBasesHistoricoERecolhidoInssSalariosPagos(ocorrencia, competencia, TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDaBase()));
            this.recalculaAliquotaSeguradoERecolhidoInssSalariosPagos(ocorrencia, competencia);
            if (TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDoRecolhidoSegurado())) {
                BigDecimal recolhidoSegurado = ocorrencia.getValorBaseRecolhido();
                if (Utils.naoNulos(recolhidoSegurado = Utils.naoNulos(recolhidoSegurado, ocorrencia.getAliquotaRecolhidoSegurado()) ? recolhidoSegurado.multiply(ocorrencia.getAliquotaRecolhidoSegurado().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO, ocorrencia.getValorTetoSegurado()) && recolhidoSegurado.compareTo(ocorrencia.getValorTetoSegurado()) > 0) {
                    recolhidoSegurado = ocorrencia.getValorTetoSegurado();
                }
                ocorrencia.setValorRecolhidoSegurado(recolhidoSegurado);
            }
            if (TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDoRecolhidoEmpresa())) {
                BigDecimal recolhidoEmpresa = ocorrencia.getValorBaseRecolhido();
                if (Utils.naoNulos(recolhidoEmpresa = Utils.naoNulos(recolhidoEmpresa, ocorrencia.getAliquotaEmpresa()) ? recolhidoEmpresa.multiply(ocorrencia.getAliquotaEmpresa().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO, ocorrencia.getValorTetoEmpresa()) && recolhidoEmpresa.compareTo(ocorrencia.getValorTetoEmpresa()) > 0) {
                    recolhidoEmpresa = ocorrencia.getValorTetoEmpresa();
                }
                ocorrencia.setValorRecolhidoEmpresa(recolhidoEmpresa);
            }
            if (TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDoRecolhidoSAT())) {
                BigDecimal recolhidoSAT = ocorrencia.getValorBaseRecolhido();
                recolhidoSAT = Utils.naoNulos(recolhidoSAT, ocorrencia.getAliquotaSAT()) ? recolhidoSAT.multiply(ocorrencia.getAliquotaSAT().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                ocorrencia.setValorRecolhidoSAT(recolhidoSAT);
            }
            if (TipoValorEnum.CALCULADO.equals((Object)ocorrencia.getTipoValorDoRecolhidoTerceiros())) {
                BigDecimal recolhidoTerceiros = ocorrencia.getValorBaseRecolhido();
                recolhidoTerceiros = Utils.naoNulos(recolhidoTerceiros, ocorrencia.getAliquotaTerceiros()) ? recolhidoTerceiros.multiply(ocorrencia.getAliquotaTerceiros().divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
                ocorrencia.setValorRecolhidoTerceiros(recolhidoTerceiros);
            }
            ocorrencia.setValorTotalInssSegurado(this.calcularValorTotalInssSegurado(ocorrencia));
            if (ocorrencia.isRealizarCalculoParaSegurado()) {
                BigDecimal valorDevidoSegurado = BigDecimal.ZERO;
                if (Utils.naoNulos(ocorrencia.getValorTotalInssSegurado(), ocorrencia.getValorRecolhidoSegurado()) && ocorrencia.getValorTotalInssSegurado().compareTo(ocorrencia.getValorRecolhidoSegurado()) > 0) {
                    valorDevidoSegurado = ocorrencia.getValorTotalInssSegurado().subtract(ocorrencia.getValorRecolhidoSegurado(), Utils.CONTEXTO_MATEMATICO);
                }
                if (ocorrencia.isLimitarTetoSegurado() && Utils.naoNulos(valorDevidoSegurado, ocorrencia.getValorTetoSegurado()) && Utils.naoNulo(valorDevidoSegurado) && valorDevidoSegurado.compareTo(ocorrencia.getValorTetoSegurado()) > 0) {
                    valorDevidoSegurado = ocorrencia.getValorTetoSegurado();
                }
                ocorrencia.setValorDevidoSeguradoFinal(valorDevidoSegurado);
            }
            ocorrencia.setIndiceDeCorrecaoTrabalhistaUtilizado(this.obterIndiceDeCorrecaoTrabalhistaUtilizado(ocorrencia, this.inss.getInssSobreSalariosPagos(), Boolean.TRUE));
            ocorrencia.setIndiceDeCorrecaoPrevidenciariaUtilizado(this.obterIndiceDeCorrecaoPrevidenciariaUtilizado(ocorrencia, this.inss.getInssSobreSalariosPagos(), competencia));
            if (ocorrencia.isRealizarCalculoParaEmpresa()) {
                BigDecimal valorTotalInssEmpresa = null;
                if (Utils.naoNulo(ocorrencia.getValorBase())) {
                    valorTotalInssEmpresa = ocorrencia.getValorBase().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaEmpresa()), Utils.CONTEXTO_MATEMATICO);
                }
                if (ocorrencia.isLimitarTetoEmpresa() && Utils.naoNulos(valorTotalInssEmpresa, ocorrencia.getValorTetoEmpresa()) && valorTotalInssEmpresa.compareTo(ocorrencia.getValorTetoEmpresa()) > 0) {
                    valorTotalInssEmpresa = ocorrencia.getValorTetoEmpresa();
                }
                ocorrencia.setValorTotalInssEmpresa(valorTotalInssEmpresa);
                BigDecimal valorDevidoEmpresa = null;
                if (Utils.naoNulos(ocorrencia.getValorTotalInssEmpresa(), ocorrencia.getValorRecolhidoEmpresa())) {
                    valorDevidoEmpresa = ocorrencia.getValorTotalInssEmpresa().subtract(ocorrencia.getValorRecolhidoEmpresa(), Utils.CONTEXTO_MATEMATICO);
                }
                if (ocorrencia.isLimitarTetoEmpresa() && Utils.naoNulos(valorDevidoEmpresa, ocorrencia.getValorTetoEmpresa()) && valorDevidoEmpresa.compareTo(ocorrencia.getValorTetoEmpresa()) > 0) {
                    valorDevidoEmpresa = ocorrencia.getValorTetoEmpresa();
                }
                ocorrencia.setValorDevidoEmpresaFinal(valorDevidoEmpresa);
            }
            if (ocorrencia.isRealizarCalculoParaSAT()) {
                if (Utils.naoNulo(ocorrencia.getValorBase())) {
                    ocorrencia.setValorTotalInssSAT(ocorrencia.getValorBase().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaSAT()), Utils.CONTEXTO_MATEMATICO));
                }
                BigDecimal valorDevidoSAT = null;
                if (Utils.naoNulos(ocorrencia.getValorTotalInssSAT(), ocorrencia.getValorRecolhidoSAT())) {
                    valorDevidoSAT = ocorrencia.getValorTotalInssSAT().subtract(ocorrencia.getValorRecolhidoSAT(), Utils.CONTEXTO_MATEMATICO);
                }
                if (Utils.naoNulo(valorDevidoSAT) && valorDevidoSAT.compareTo(BigDecimal.ZERO) >= 0) {
                    ocorrencia.setValorDevidoSAT(valorDevidoSAT);
                } else {
                    ocorrencia.setValorDevidoSAT(BigDecimal.ZERO);
                }
            }
            if (ocorrencia.isRealizarCalculoParaTerceiros()) {
                if (Utils.naoNulo(ocorrencia.getValorBase())) {
                    ocorrencia.setValorTotalInssTerceiros(ocorrencia.getValorBase().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaTerceiros()), Utils.CONTEXTO_MATEMATICO));
                }
                BigDecimal valorDevidoTerceiros = null;
                if (Utils.naoNulos(ocorrencia.getValorTotalInssTerceiros(), ocorrencia.getValorRecolhidoTerceiros())) {
                    valorDevidoTerceiros = ocorrencia.getValorTotalInssTerceiros().subtract(ocorrencia.getValorRecolhidoTerceiros(), Utils.CONTEXTO_MATEMATICO);
                }
                if (Utils.naoNulo(valorDevidoTerceiros) && valorDevidoTerceiros.compareTo(BigDecimal.ZERO) >= 0) {
                    ocorrencia.setValorDevidoTerceiros(valorDevidoTerceiros);
                } else {
                    ocorrencia.setValorDevidoTerceiros(BigDecimal.ZERO);
                }
            }
            BigDecimal taxaMulta = null;
            if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941Pago().booleanValue() && Utils.naoNulo(competencia.getData()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.dataLiquidacao).getDate()) && HelperDate.dateAfterOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Pago()).getDate())) {
                competenciaDaMulta = competencia;
                if (!this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941PagoMulta().booleanValue() || Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941PagoMulta())) {
                    HelperDate ocorrenciaHelper = HelperDate.getInstance(ocorrencia.getDataOcorrenciaInss());
                    if (this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941PagoMulta().booleanValue() && HelperDate.dateAfterOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Pago()).getDate()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941PagoMulta()).getDate())) {
                        competenciaDaMulta = new Competencia(HelperDate.getInstance(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941PagoMulta()).getDate());
                        ocorrenciaHelper = HelperDate.getInstance(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941PagoMulta());
                    }
                    this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterListaOtimizada(this.dataInicialApuracaoMulta11941, this.dataFinalApuracaoMulta11941);
                    Iterator<TaxaMultaPrevidenciaria> taxas = this.tabelaTaxaDeMulta.search(competenciaDaMulta);
                    while (Utils.naoNulo(taxas) && taxas.hasNext()) {
                        TaxaMultaPrevidenciaria taxa = taxas.next();
                        if (!Utils.naoNulo((Object)taxa.getTipoMulta()) || !taxa.getTipoMulta().equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getTipoDeMultaDosSalariosPagosDoINSS())) continue;
                        taxaMulta = this.inss.getCalculo().getParametrosDeAtualizacao().getLei11941PagoMulta().booleanValue() && HelperDate.dateEquals(competenciaDaMulta.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941PagoMulta()).getDate()) ? taxa.resolverTaxa(this.inss.getInssSobreSalariosPagos(), ocorrenciaHelper, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao, true) : taxa.resolverTaxa(this.inss.getInssSobreSalariosPagos(), competencia, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao);
                        break;
                    }
                }
            } else if (this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarMultaDosSalariosPagosDoINSS().booleanValue() && Utils.naoNulo(competencia.getData()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.dataLiquidacao).getDate())) {
                competenciaDaMulta = competencia;
                if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosPagosDoINSS().booleanValue() && Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()).getDate())) {
                    competenciaDaMulta = new Competencia(HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()).getDate());
                }
                if (this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosPagosDoINSS().booleanValue() && Utils.naoNulo(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()).getDate())) {
                    competenciaDaMulta = new Competencia(HelperDate.getCurrentCompetence(this.inss.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS()).getDate());
                }
                this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterListaOtimizada(this.dataInicialApuracaoMulta, this.dataFinalApuracaoMulta);
                Iterator<TaxaMultaPrevidenciaria> taxas = this.tabelaTaxaDeMulta.search(competenciaDaMulta);
                while (Utils.naoNulo(taxas) && taxas.hasNext()) {
                    TaxaMultaPrevidenciaria taxa = taxas.next();
                    if (!Utils.naoNulo((Object)taxa.getTipoMulta()) || !taxa.getTipoMulta().equals((Object)this.inss.getCalculo().getParametrosDeAtualizacao().getTipoDeMultaDosSalariosPagosDoINSS())) continue;
                    taxaMulta = taxa.resolverTaxa(this.inss.getInssSobreSalariosPagos(), competencia, ocorrencia.getOcorrenciaDecimoTerceiro(), this.dataLiquidacao);
                    break;
                }
            }
            ocorrencia.setTaxaDeMulta(taxaMulta);
        }
    }

    private void recalculaBasesHistoricoERecolhidoInssSalariosPagos(OcorrenciaDeInssSobreSalariosPagos ocorrencia, Competencia competencia, boolean recalcularBaseHistorico) {
        Periodo periodoRecalculo = competencia.criarPeriodoDaCompetencia();
        if (!ocorrencia.getOcorrenciaDecimoTerceiro().booleanValue()) {
            periodoRecalculo.setInicial(ocorrencia.getDataInicioPeriodo());
            if (HelperDate.dateAfter(periodoRecalculo.getFinal(), ocorrencia.getInssSobreSalariosPagos().getDataTerminoPeriodo())) {
                periodoRecalculo.setFinal(ocorrencia.getInssSobreSalariosPagos().getDataTerminoPeriodo());
            }
            BigDecimal baseHistorico = BigDecimal.ZERO;
            BigDecimal baseRecolhido = BigDecimal.ZERO;
            for (OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarialOptimizeSearch : this.historicosSalariais) {
                Iterator<OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(competencia);
                while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                    OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial = ocorrenciasDoHistoricoSalarial.next();
                    if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                    BigDecimal valorOcorrenciaDoHistorico = BigDecimal.ZERO;
                    if (ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getAplicarProporcionalidadeINSS().booleanValue()) {
                        int diasParaExcluir = 0;
                        if (periodoRecalculo.totalDeDias() - (diasParaExcluir += this.inss.getCalculo().obterDiasFerias(periodoRecalculo)) == 31) {
                            diasParaExcluir = 1;
                        }
                        CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar(periodoRecalculo, ocorrenciaDoHistoricoSalarial.getValor(), diasParaExcluir += this.inss.getCalculo().obterFaltasNaoJustificadas(periodoRecalculo));
                        calculoDoProporcionalizar.executar();
                        valorOcorrenciaDoHistorico = calculoDoProporcionalizar.getResultado();
                    } else {
                        valorOcorrenciaDoHistorico = ocorrenciaDoHistoricoSalarial.getValor();
                    }
                    baseHistorico = baseHistorico.add(valorOcorrenciaDoHistorico, Utils.CONTEXTO_MATEMATICO);
                    if (!ocorrenciaDoHistoricoSalarial.getRecolhidoINSS().booleanValue()) continue;
                    baseRecolhido = baseRecolhido.add(valorOcorrenciaDoHistorico, Utils.CONTEXTO_MATEMATICO);
                }
            }
            if (recalcularBaseHistorico) {
                ocorrencia.setValorBase(baseHistorico);
            }
            ocorrencia.setValorBaseRecolhido(baseRecolhido);
        } else {
            periodoRecalculo.setInicial(ocorrencia.getDataInicioPeriodo());
            periodoRecalculo.setFinal(ocorrencia.getDataTerminoPeriodo());
            BigDecimal baseHistorico = BigDecimal.ZERO;
            BigDecimal baseRecolhido = BigDecimal.ZERO;
            for (OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarialOptimizeSearch : this.historicosSalariais) {
                Iterator<OcorrenciaDoHistoricoSalarial> ocorrenciasDoHistoricoSalarial = ocorrenciasDoHistoricoSalarialOptimizeSearch.search(competencia);
                while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                    OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial = ocorrenciasDoHistoricoSalarial.next();
                    if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaINSS())) continue;
                    baseHistorico = baseHistorico.add(ocorrenciaDoHistoricoSalarial.getValor(), Utils.CONTEXTO_MATEMATICO);
                    if (!ocorrenciaDoHistoricoSalarial.getRecolhidoINSS().booleanValue()) continue;
                    baseRecolhido = baseRecolhido.add(ocorrenciaDoHistoricoSalarial.getValor(), Utils.CONTEXTO_MATEMATICO);
                }
            }
            int avos = RepositorioDeInss.calculaAvosInssDecimoTerceiro(this.inss.getCalculo(), periodoRecalculo);
            baseHistorico = baseHistorico.multiply(new BigDecimal(avos), Utils.CONTEXTO_MATEMATICO);
            baseHistorico = baseHistorico.divide(new BigDecimal(12), Utils.CONTEXTO_MATEMATICO);
            baseRecolhido = baseRecolhido.multiply(new BigDecimal(avos), Utils.CONTEXTO_MATEMATICO);
            baseRecolhido = baseRecolhido.divide(new BigDecimal(12), Utils.CONTEXTO_MATEMATICO);
            if (recalcularBaseHistorico) {
                ocorrencia.setValorBase(baseHistorico);
            }
            ocorrencia.setValorBaseRecolhido(baseRecolhido);
        }
    }

    private void recalculaAliquotaSeguradoERecolhidoInssSalariosPagos(OcorrenciaDeInssSobreSalariosPagos ocorrencia, Competencia competencia) {
        TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch listaAliquotasSeguradoEmpregado = null;
        TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch listaAliquotasEmpregadoDomestico = null;
        switch (this.inss.getTipoAliquotaSegurado()) {
            case FIXA: {
                ocorrencia.setAliquotaSegurado(this.inss.getAliquotaSeguradoFixa());
                ocorrencia.setAliquotaRecolhidoSegurado(this.inss.getAliquotaSeguradoFixa());
                if (this.inss.getLimitarTeto().booleanValue()) {
                    listaAliquotasSeguradoEmpregado = this.inss.obterListaOtimizadaAliquotasSeguradoEmpregado();
                    Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado = listaAliquotasSeguradoEmpregado.search(competencia);
                    if (tabelaSeguradoEmpregado != null && tabelaSeguradoEmpregado.hasNext()) {
                        ocorrencia.setValorTetoSegurado(tabelaSeguradoEmpregado.next().getValorTetoMaximo());
                        break;
                    }
                    ocorrencia.setValorTetoSegurado(null);
                    break;
                }
                ocorrencia.setValorTetoSegurado(null);
                break;
            }
            case SEGURADO_EMPREGADO: {
                listaAliquotasSeguradoEmpregado = this.inss.obterListaOtimizadaAliquotasSeguradoEmpregado();
                Iterator<TabelaPrevidenciariaSeguradoEmpregado> tabelaSeguradoEmpregado = listaAliquotasSeguradoEmpregado.search(competencia);
                if (tabelaSeguradoEmpregado != null && tabelaSeguradoEmpregado.hasNext()) {
                    TabelaPrevidenciariaSeguradoEmpregado tpse = tabelaSeguradoEmpregado.next();
                    ocorrencia.setAliquotaSegurado(tpse.obterAliquotaParaValor(ocorrencia.getValorBase()));
                    ocorrencia.setValorTetoSegurado(tpse.getValorTetoMaximo());
                    ocorrencia.setAliquotaRecolhidoSegurado(tpse.obterAliquotaParaValor(ocorrencia.getValorBaseRecolhido()));
                    break;
                }
                ocorrencia.setAliquotaSegurado(null);
                ocorrencia.setValorTetoSegurado(null);
                ocorrencia.setAliquotaRecolhidoSegurado(null);
                break;
            }
            case EMPREGADO_DOMESTICO: {
                Iterator<TabelaPrevidenciariaEmpregadoDomestico> tabelaEmpregadoDomestico;
                if (Utils.nulo(listaAliquotasEmpregadoDomestico)) {
                    listaAliquotasEmpregadoDomestico = this.inss.obterListaOtimizadaDeAliquotasEmpregadoDomestico();
                }
                if ((tabelaEmpregadoDomestico = listaAliquotasEmpregadoDomestico.search(competencia)) != null && tabelaEmpregadoDomestico.hasNext()) {
                    TabelaPrevidenciariaEmpregadoDomestico tped = tabelaEmpregadoDomestico.next();
                    ocorrencia.setAliquotaSegurado(tped.obterAliquotaParaValor(ocorrencia.getValorBase()));
                    ocorrencia.setValorTetoSegurado(tped.getValorTetoMaximo());
                    ocorrencia.setAliquotaRecolhidoSegurado(tped.obterAliquotaParaValor(ocorrencia.getValorBaseRecolhido()));
                    break;
                }
                ocorrencia.setAliquotaSegurado(null);
                ocorrencia.setValorTetoSegurado(null);
                ocorrencia.setAliquotaRecolhidoSegurado(null);
            }
        }
    }

    private BigDecimal calcularValorTotalInssSegurado(OcorrenciaDeInss ocorrencia) {
        if (ocorrencia.isRealizarCalculoParaSegurado()) {
            if (Utils.nulo(ocorrencia.getAliquotaSegurado())) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0183, new Object[0]));
            }
            BigDecimal valorTotalInssSegurado = ocorrencia.getValorBase().multiply(Utils.obterPercentualPara(ocorrencia.getAliquotaSegurado()), Utils.CONTEXTO_MATEMATICO);
            if (ocorrencia.isLimitarTetoSegurado() && valorTotalInssSegurado.compareTo(ocorrencia.getValorTetoSegurado()) > 0) {
                valorTotalInssSegurado = ocorrencia.getValorTetoSegurado();
            }
            return valorTotalInssSegurado;
        }
        return null;
    }

    private BigDecimal obterIndiceDeCorrecaoTrabalhistaUtilizado(OcorrenciaDeInss ocorrencia, InssSobreSalarios inssSobreSalarios, Boolean origemCalculo) {
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista11941;
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista;
        if (inssSobreSalarios instanceof InssSobreSalariosDevidos) {
            tabelaDeCorrecaoMonetariaTrabalhista = this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidos;
            tabelaDeCorrecaoMonetariaTrabalhista11941 = this.obterTabelaDeCorrecaoMonetaria11941(origemCalculo);
        } else {
            tabelaDeCorrecaoMonetariaTrabalhista = this.tabelaDeCorrecaoMonetariaTrabalhistaSalariosPagos;
            tabelaDeCorrecaoMonetariaTrabalhista11941 = this.obterTabelaDeCorrecaoMonetaria11941Pagos(origemCalculo);
        }
        BigDecimal valorIndiceDeCorrecaoTrabalhistaUtilizado = BigDecimal.ONE;
        Boolean ocorrenciaNaLei11941 = HelperDate.dateAfterOrEquals(ocorrencia.getDataOcorrenciaInss(), HelperDate.getCurrentCompetence(inssSobreSalarios.getDataLimiteCorrecao11941()).getDate());
        if (this.inss.getCalculo().isCalculoExterno().booleanValue()) {
            ocorrenciaNaLei11941 = ocorrencia.getOcorrenciaDecimoTerceiro();
        }
        if (inssSobreSalarios.getCorrecaoTrabalhista().booleanValue() && inssSobreSalarios.getCorrecao11941().booleanValue() && ocorrenciaNaLei11941.booleanValue() && Utils.naoNulo(tabelaDeCorrecaoMonetariaTrabalhista)) {
            valorIndiceDeCorrecaoTrabalhistaUtilizado = tabelaDeCorrecaoMonetariaTrabalhista11941.obterValorAcumuladoDoIndice(ocorrencia.getDataOcorrenciaInss());
        } else if (inssSobreSalarios.getCorrecaoTrabalhista().booleanValue() && (!inssSobreSalarios.getCorrecaoPrevidenciaria().booleanValue() || inssSobreSalarios.getCorrecaoPrevidenciaria().booleanValue() && Utils.nulo(inssSobreSalarios.getDataLimiteCorrecaoTrabalhista()))) {
            valorIndiceDeCorrecaoTrabalhistaUtilizado = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(ocorrencia.getDataOcorrenciaInss());
        } else if (inssSobreSalarios.getCorrecaoTrabalhista().booleanValue() && HelperDate.dateBeforeOrEquals(ocorrencia.getDataOcorrenciaInss(), inssSobreSalarios.getDataLimiteCorrecaoTrabalhista()) && Utils.naoNulo(tabelaDeCorrecaoMonetariaTrabalhista)) {
            valorIndiceDeCorrecaoTrabalhistaUtilizado = tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(ocorrencia.getDataOcorrenciaInss());
        }
        if (inssSobreSalarios.getCorrecaoTrabalhista().booleanValue() && !origemCalculo.booleanValue() && Utils.naoNulo(this.dataUltimaLiquidacao) && TabelaDeCorrecaoMonetariaUtils.verificarSeExisteIndiceDiarioNaCombinacao(this.inss.getCalculo())) {
            Date dataAjustadaOcorrencia = HelperDate.getCurrentCompetence(ocorrencia.getDataOcorrenciaInss()).setDay(1).addMonth(1).setDay(1).getDate();
            if (IndicesAcumuladosEnum.MES_DO_VENCIMENTO.equals((Object)this.inss.getCalculo().getIndicesAcumulados())) {
                dataAjustadaOcorrencia = HelperDate.getCurrentCompetence(ocorrencia.getDataOcorrenciaInss()).setDay(1).getDate();
            }
            BigDecimal fatorConversaoDesnecessaria = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(dataAjustadaOcorrencia, this.dataUltimaLiquidacao);
            valorIndiceDeCorrecaoTrabalhistaUtilizado = Utils.dividir(valorIndiceDeCorrecaoTrabalhistaUtilizado, fatorConversaoDesnecessaria);
        }
        return valorIndiceDeCorrecaoTrabalhistaUtilizado;
    }

    private BigDecimal obterIndiceDeCorrecaoPrevidenciariaUtilizado(OcorrenciaDeInss ocorrencia, InssSobreSalarios inssSobreSalarios, Competencia competencia) {
        BigDecimal indice;
        BigDecimal valorIndiceDeCorrecaoPrevidenciariaUtilizado = BigDecimal.ONE;
        if (inssSobreSalarios.getCorrecaoPrevidenciaria().booleanValue() && (!inssSobreSalarios.getCorrecaoTrabalhista().booleanValue() || inssSobreSalarios.getCorrecaoTrabalhista().booleanValue() && Utils.naoNulo(inssSobreSalarios.getDataLimiteCorrecaoTrabalhista()) && HelperDate.dateAfter(ocorrencia.getDataOcorrenciaInss(), inssSobreSalarios.getDataLimiteCorrecaoTrabalhista())) && Utils.naoNulo(indice = this.tabelaCorrecaoPrevidenciaria.get(competencia))) {
            valorIndiceDeCorrecaoPrevidenciariaUtilizado = indice;
        }
        return valorIndiceDeCorrecaoPrevidenciariaUtilizado;
    }

    private TabelaDeCorrecaoMonetaria obterTabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidosReclamante(Boolean origemCalculo) {
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(this.inss.getCalculo().getAtualizacaoMonetaria(), this.inss.getCalculo().getIndicesAcumulados(), this.inss.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(origemCalculo);
        if (!origemCalculo.booleanValue()) {
            tabelaDeCorrecaoMonetaria.setDataLiquidacao(this.inss.getCalculo().getAtualizacao().getDataDeLiquidacao());
        }
        Periodo periodoAbrangente = new Periodo();
        periodoAbrangente.setInicial(Utils.naoNulo(this.dataUltimaLiquidacao) ? HelperDate.getInstance(this.dataUltimaLiquidacao).addDay(1).getDate() : this.inss.getInssSobreSalariosDevidos().getDataInicioPeriodo());
        periodoAbrangente.setFinal(this.dataLiquidacao);
        tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        return tabelaDeCorrecaoMonetaria;
    }

    private TabelaDeCorrecaoMonetaria obterTabelaDeCorrecaoMonetariaTrabalhistaSalariosDevidos(Boolean origemCalculo) {
        if (!this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosDevidosDoINSS().booleanValue()) {
            return null;
        }
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(this.inss.getCalculo().getAtualizacaoMonetaria(), this.inss.getCalculo().getIndicesAcumulados(), this.inss.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(origemCalculo);
        if (!origemCalculo.booleanValue()) {
            tabelaDeCorrecaoMonetaria.setDataLiquidacao(this.inss.getCalculo().getAtualizacao().getDataDeLiquidacao());
        }
        Periodo periodoAbrangente = new Periodo();
        periodoAbrangente.setInicial(Utils.naoNulo(this.dataUltimaLiquidacao) ? HelperDate.getInstance(this.dataUltimaLiquidacao).addDay(1).getDate() : this.inss.getInssSobreSalariosDevidos().getDataInicioPeriodo());
        if (this.inss.getInssSobreSalariosDevidos().getCorrecaoPrevidenciaria().booleanValue() && Utils.naoNulo(this.inss.getInssSobreSalariosDevidos().getDataLimiteCorrecaoTrabalhista()) && HelperDate.dateBefore(this.inss.getInssSobreSalariosDevidos().getDataLimiteCorrecaoTrabalhista(), this.dataLiquidacao)) {
            periodoAbrangente.setFinal(this.inss.getInssSobreSalariosDevidos().getDataLimiteCorrecaoTrabalhista());
        } else {
            periodoAbrangente.setFinal(this.dataLiquidacao);
        }
        tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        return tabelaDeCorrecaoMonetaria;
    }

    private TabelaDeCorrecaoMonetaria obterTabelaDeCorrecaoMonetaria11941(Boolean origemCalculo) {
        if (!this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosDevidosDoINSS().booleanValue()) {
            return null;
        }
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(this.inss.getCalculo().getAtualizacaoMonetaria(), this.inss.getCalculo().getIndicesAcumulados(), this.inss.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(origemCalculo);
        if (!origemCalculo.booleanValue()) {
            tabelaDeCorrecaoMonetaria.setDataLiquidacao(this.inss.getCalculo().getAtualizacao().getDataDeLiquidacao());
        }
        Periodo periodoAbrangente = new Periodo();
        periodoAbrangente.setInicial(Utils.naoNulo(this.dataUltimaLiquidacao) ? HelperDate.getInstance(this.dataUltimaLiquidacao).addDay(1).getDate() : this.inss.getInssSobreSalariosDevidos().getDataInicioPeriodo());
        if (this.inss.getInssSobreSalariosDevidos().getCorrecao11941().booleanValue() && Utils.naoNulo(this.inss.getInssSobreSalariosDevidos().getDataLimiteCorrecao11941())) {
            periodoAbrangente.setFinal(this.inss.getInssSobreSalariosDevidos().getDataLimiteCorrecao11941());
        } else if (this.inss.getInssSobreSalariosDevidos().getCorrecaoPrevidenciaria().booleanValue() && Utils.naoNulo(this.inss.getInssSobreSalariosDevidos().getDataLimiteCorrecaoTrabalhista())) {
            periodoAbrangente.setFinal(this.inss.getInssSobreSalariosDevidos().getDataLimiteCorrecaoTrabalhista());
        } else {
            periodoAbrangente.setFinal(this.dataLiquidacao);
        }
        tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        return tabelaDeCorrecaoMonetaria;
    }

    private TabelaDeCorrecaoMonetaria obterTabelaDeCorrecaoMonetaria11941Pagos(Boolean origemCalculo) {
        if (!this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosPagosDoINSS().booleanValue()) {
            return null;
        }
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(this.inss.getCalculo().getAtualizacaoMonetaria(), this.inss.getCalculo().getIndicesAcumulados(), this.inss.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(origemCalculo);
        if (!origemCalculo.booleanValue()) {
            tabelaDeCorrecaoMonetaria.setDataLiquidacao(this.inss.getCalculo().getAtualizacao().getDataDeLiquidacao());
        }
        Periodo periodoAbrangente = new Periodo();
        periodoAbrangente.setInicial(Utils.naoNulo(this.dataUltimaLiquidacao) ? HelperDate.getInstance(this.dataUltimaLiquidacao).addDay(1).getDate() : this.inss.getInssSobreSalariosPagos().getDataInicioPeriodo());
        if (this.inss.getInssSobreSalariosPagos().getCorrecao11941().booleanValue() && Utils.naoNulo(this.inss.getInssSobreSalariosPagos().getDataLimiteCorrecao11941())) {
            periodoAbrangente.setFinal(this.inss.getInssSobreSalariosPagos().getDataLimiteCorrecao11941());
        } else if (this.inss.getInssSobreSalariosPagos().getCorrecaoPrevidenciaria().booleanValue() && Utils.naoNulo(this.inss.getInssSobreSalariosPagos().getDataLimiteCorrecaoTrabalhista())) {
            periodoAbrangente.setFinal(this.inss.getInssSobreSalariosPagos().getDataLimiteCorrecaoTrabalhista());
        } else {
            periodoAbrangente.setFinal(this.dataLiquidacao);
        }
        tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        return tabelaDeCorrecaoMonetaria;
    }

    private TabelaDeCorrecaoMonetaria obterTabelaDeCorrecaoMonetariaTrabalhistaSalariosPagos(Boolean origemCalculo) {
        if (!this.inss.getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosPagosDoINSS().booleanValue()) {
            return null;
        }
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(this.inss.getCalculo().getAtualizacaoMonetaria(), this.inss.getCalculo().getIndicesAcumulados(), this.inss.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(origemCalculo);
        if (!origemCalculo.booleanValue()) {
            tabelaDeCorrecaoMonetaria.setDataLiquidacao(this.inss.getCalculo().getAtualizacao().getDataDeLiquidacao());
        }
        Periodo periodoAbrangente = new Periodo();
        periodoAbrangente.setInicial(Utils.naoNulo(this.dataUltimaLiquidacao) ? HelperDate.getInstance(this.dataUltimaLiquidacao).addDay(1).getDate() : this.inss.getInssSobreSalariosPagos().getDataInicioPeriodo());
        if (this.inss.getInssSobreSalariosPagos().getCorrecaoPrevidenciaria().booleanValue() && Utils.naoNulo(this.inss.getInssSobreSalariosPagos().getDataLimiteCorrecaoTrabalhista()) && HelperDate.dateBefore(this.inss.getInssSobreSalariosPagos().getDataLimiteCorrecaoTrabalhista(), this.dataLiquidacao)) {
            periodoAbrangente.setFinal(this.inss.getInssSobreSalariosPagos().getDataLimiteCorrecaoTrabalhista());
        } else {
            periodoAbrangente.setFinal(this.dataLiquidacao);
        }
        tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        return tabelaDeCorrecaoMonetaria;
    }

    private Map<Competencia, BigDecimal> obterTabelaParaCorrecaoPrevidenciaria(Date dataDeLiquidacao) {
        HashMap<Competencia, BigDecimal> tabelaCorrecaoPrevidenciaria = new HashMap<Competencia, BigDecimal>();
        OptimizerListSearch<Competencia, CoeficienteUFIR> coeficientesUfirParaCorrecaoPrevidenciaria = CoeficienteUFIR.getListaDeCoeficientesUFIROtimizada();
        OptimizerListSearch<Competencia, UFIR> ufirParaCorrecaoPrevidenciaria = UFIR.getListaDeUFIROtimizada();
        if (HelperDate.dateAfterOrEquals(dataDeLiquidacao, HelperDate.getInstance(1997, 0, 1).getDate())) {
            HelperDate competenciaAuxiliar;
            HelperDate helperDate = competenciaAuxiliar = Utils.naoNulo(this.dataUltimaLiquidacao) ? HelperDate.getInstance(this.dataUltimaLiquidacao) : HelperDate.getInstance(1967, 0, 1);
            while (!competenciaAuxiliar.compareMonthAndYear(dataDeLiquidacao)) {
                Competencia competencia = Competencia.getInstance(competenciaAuxiliar.getDate());
                Iterator<CoeficienteUFIR> coeficienteUfir = coeficientesUfirParaCorrecaoPrevidenciaria.search(competencia);
                if (Utils.naoNulo(coeficienteUfir) && coeficienteUfir.hasNext()) {
                    tabelaCorrecaoPrevidenciaria.put(competencia, coeficienteUfir.next().getTaxa().multiply(CONSTANTE_PARA_MULTIPLICACAO_DA_UFIR, Utils.CONTEXTO_MATEMATICO));
                } else {
                    tabelaCorrecaoPrevidenciaria.put(competencia, BigDecimal.ONE);
                }
                competenciaAuxiliar.addMonth(1);
            }
        } else if (HelperDate.dateAfterOrEquals(dataDeLiquidacao, HelperDate.getInstance(1995, 0, 1).getDate())) {
            HelperDate competenciaAuxiliar;
            BigDecimal valorUfir = BigDecimal.ONE;
            Iterator<UFIR> ufirDaLiquidacao = ufirParaCorrecaoPrevidenciaria.search(Competencia.getInstance(dataDeLiquidacao));
            if (Utils.naoNulo(ufirDaLiquidacao) && ufirDaLiquidacao.hasNext()) {
                valorUfir = ufirDaLiquidacao.next().getTaxa();
            }
            HelperDate helperDate = competenciaAuxiliar = Utils.naoNulo(this.dataUltimaLiquidacao) ? HelperDate.getInstance(this.dataUltimaLiquidacao) : HelperDate.getInstance(1967, 0, 1);
            while (!competenciaAuxiliar.compareMonthAndYear(dataDeLiquidacao)) {
                Competencia competencia = Competencia.getInstance(competenciaAuxiliar.getDate());
                Iterator<CoeficienteUFIR> coeficienteUfir = coeficientesUfirParaCorrecaoPrevidenciaria.search(competencia);
                if (Utils.naoNulo(coeficienteUfir) && coeficienteUfir.hasNext()) {
                    tabelaCorrecaoPrevidenciaria.put(competencia, coeficienteUfir.next().getTaxa().multiply(valorUfir, Utils.CONTEXTO_MATEMATICO));
                } else {
                    tabelaCorrecaoPrevidenciaria.put(competencia, BigDecimal.ONE);
                }
                competenciaAuxiliar.addMonth(1);
            }
        } else {
            HelperDate competenciaAuxiliar;
            BigDecimal valorCoeficienteUfirLiquidacao = BigDecimal.ONE;
            Iterator<CoeficienteUFIR> coeficienteUfirLiquidacao = coeficientesUfirParaCorrecaoPrevidenciaria.search(Competencia.getInstance(dataDeLiquidacao));
            if (Utils.naoNulo(coeficienteUfirLiquidacao) && coeficienteUfirLiquidacao.hasNext()) {
                valorCoeficienteUfirLiquidacao = coeficienteUfirLiquidacao.next().getTaxa();
            }
            HelperDate helperDate = competenciaAuxiliar = Utils.naoNulo(this.dataUltimaLiquidacao) ? HelperDate.getInstance(this.dataUltimaLiquidacao) : HelperDate.getInstance(1967, 0, 1);
            while (!competenciaAuxiliar.compareMonthAndYear(dataDeLiquidacao)) {
                Competencia competencia = Competencia.getInstance(competenciaAuxiliar.getDate());
                Iterator<CoeficienteUFIR> coeficienteUfir = coeficientesUfirParaCorrecaoPrevidenciaria.search(competencia);
                if (Utils.naoNulo(coeficienteUfir) && coeficienteUfir.hasNext()) {
                    tabelaCorrecaoPrevidenciaria.put(competencia, coeficienteUfir.next().getTaxa().divide(valorCoeficienteUfirLiquidacao, Utils.CONTEXTO_MATEMATICO));
                } else {
                    tabelaCorrecaoPrevidenciaria.put(competencia, BigDecimal.ONE);
                }
                competenciaAuxiliar.addMonth(1);
            }
        }
        return tabelaCorrecaoPrevidenciaria;
    }

    public void aplicarPagamento(Inss inss, Pagamento pagamento, DebitosDoReclamante debitosDoReclamante, OutrosDebitosReclamado outrosDebitosDoReclamado) {
        List<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> ocorrenciasDevidos = inss.getInssSobreSalariosDevidos().obterOcorrenciasNaoAmortizadasPor(inss.getInssSobreSalariosDevidos(), pagamento.getDataPagamento());
        List<OcorrenciaDeInssSobreSalariosPagosAtualizacao> ocorrenciasPagos = inss.getInssSobreSalariosPagos().obterOcorrenciasNaoAmortizadasPor(inss.getInssSobreSalariosPagos(), pagamento.getDataPagamento());
        BigDecimal valorPagamentoDevidosReclamante = debitosDoReclamante.getPagoDescontoInss();
        BigDecimal valorPagamentoDevidosReclamado = outrosDebitosDoReclamado.getValorPagoInssSalariosDevidos();
        if (Utils.nulo(valorPagamentoDevidosReclamante)) {
            valorPagamentoDevidosReclamante = BigDecimal.ZERO;
        }
        if (BigDecimal.ZERO.compareTo(valorPagamentoDevidosReclamante) < 0 && valorPagamentoDevidosReclamante.compareTo(debitosDoReclamante.getDescontoInssCorrigido()) > 0) {
            valorPagamentoDevidosReclamante = debitosDoReclamante.getDescontoInssCorrigido();
        }
        if (Utils.nulo(valorPagamentoDevidosReclamado)) {
            valorPagamentoDevidosReclamado = BigDecimal.ZERO;
        }
        BigDecimal valorPagamentoDevidos = Utils.somar(valorPagamentoDevidosReclamante, valorPagamentoDevidosReclamado);
        BigDecimal valorPagamentoPagos = outrosDebitosDoReclamado.getValorPagoInssSalariosPagos();
        if (Utils.nulo(valorPagamentoPagos)) {
            valorPagamentoPagos = BigDecimal.ZERO;
        }
        if (valorPagamentoDevidos != null && valorPagamentoDevidos.compareTo(BigDecimal.ZERO) > 0) {
            for (OcorrenciaDeInssSobreSalariosDevidosAtualizacao ocorrenciaDeInssSobreSalariosDevidosAtualizacao : ocorrenciasDevidos) {
                valorPagamentoDevidos = this.amortizarPagamento(valorPagamentoDevidos, ocorrenciaDeInssSobreSalariosDevidosAtualizacao);
                OcorrenciaDeInssSobreSalariosDevidosAtualizacao.salvar(ocorrenciaDeInssSobreSalariosDevidosAtualizacao);
            }
        }
        if (valorPagamentoPagos != null && valorPagamentoPagos.compareTo(BigDecimal.ZERO) > 0) {
            for (OcorrenciaDeInssSobreSalariosPagosAtualizacao ocorrenciaDeInssSobreSalariosPagosAtualizacao : ocorrenciasPagos) {
                valorPagamentoPagos = this.amortizarPagamento(valorPagamentoPagos, ocorrenciaDeInssSobreSalariosPagosAtualizacao);
                OcorrenciaDeInssSobreSalariosPagosAtualizacao.salvar(ocorrenciaDeInssSobreSalariosPagosAtualizacao);
            }
        }
    }

    private BigDecimal amortizarPagamento(BigDecimal valorPagamento, OcorrenciaDeInssAtualizacao ocorrencia) {
        BigDecimal valorFinalTotal = ocorrencia.getTotalDiferenca();
        ocorrencia.setAmortizado(ocorrencia.isAmortizado() || valorPagamento.subtract(valorFinalTotal).compareTo(BigDecimal.ZERO) > 0);
        if (ocorrencia.isAmortizado()) {
            ocorrencia.setParcialmenteAmortizado(false);
            if (valorPagamento.compareTo(BigDecimal.ZERO) != 0) {
                valorPagamento = valorPagamento.subtract(valorFinalTotal);
            }
            ocorrencia.setPago(valorFinalTotal);
            ocorrencia.setDevidoDiferenca(BigDecimal.ZERO);
            ocorrencia.setJurosDiferenca(BigDecimal.ZERO);
            ocorrencia.setMultaDiferenca(BigDecimal.ZERO);
            ocorrencia.setTotalDiferenca(BigDecimal.ZERO);
        } else {
            this.calcularProporcaoParaValorRemanescente(ocorrencia, valorFinalTotal, valorPagamento);
            if (valorPagamento.compareTo(BigDecimal.ZERO) == 0) {
                ocorrencia.setPago(BigDecimal.ZERO);
            } else {
                ocorrencia.setPago(valorPagamento);
            }
            valorPagamento = BigDecimal.ZERO;
        }
        return valorPagamento;
    }

    private void calcularProporcaoParaValorRemanescente(OcorrenciaDeInssAtualizacao ocorrencia, BigDecimal valorFinalTotal, BigDecimal valorPago) {
        if (valorPago.compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal cem = BigDecimal.valueOf(100L);
            BigDecimal proporcao = Utils.subtrair(cem, Utils.dividir(Utils.multiplicar(valorPago, cem), valorFinalTotal));
            BigDecimal diferencaDevidoTotal = Utils.dividir(Utils.multiplicar(ocorrencia.getDevidoCorrigido(), proporcao), cem);
            BigDecimal diferencaJurosTotal = Utils.dividir(Utils.multiplicar(ocorrencia.getJuros(), proporcao), cem);
            BigDecimal diferencaMultaTotal = Utils.dividir(Utils.multiplicar(ocorrencia.getMulta(), proporcao), cem);
            ocorrencia.setDevidoDiferenca(Utils.arredondarValorMonetario(diferencaDevidoTotal));
            ocorrencia.setJurosDiferenca(Utils.arredondarValorMonetario(diferencaJurosTotal));
            ocorrencia.setMultaDiferenca(Utils.arredondarValorMonetario(diferencaMultaTotal));
            ocorrencia.setTotalDiferenca(Utils.arredondarValorMonetario(diferencaDevidoTotal.add(diferencaJurosTotal).add(diferencaMultaTotal)));
            ocorrencia.setParcialmenteAmortizado(true);
        } else if (!ocorrencia.isParcialmenteAmortizado()) {
            ocorrencia.setDevidoDiferenca(ocorrencia.getDevidoCorrigido());
            ocorrencia.setJurosDiferenca(ocorrencia.getJuros());
            ocorrencia.setMultaDiferenca(ocorrencia.getMulta());
            ocorrencia.setTotalDiferenca(ocorrencia.getTotal());
        }
    }
}

