/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.AbstractResumoPrecatorioJrAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ApuracaoDeJurosJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialInssFgtsJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.FGTSJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.HonorarioJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.JustificativaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.MultaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PensaoAlimenticiaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PrevidenciaPrivadaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SalarioFamiliaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SeguroDesempregoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.FaltasEFeriasJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto.CartaoDePontoDiarioJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto.CartaoDePontoMensalJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.historicosalarial.HistoricoSalarialJRAdapter;
import java.math.BigDecimal;
import java.util.Date;

public abstract class ConsolidadoJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<JREmptyDS> getEmptyDS();

    public abstract String getIdentificacao();

    public abstract String getNumeroDoProcesso();

    public abstract String getNumeroDoCalculo();

    public abstract String getReclamante();

    public abstract String getReclamado();

    public abstract Periodo getPeriodoDeCalculo();

    public abstract Date getDataDeAjuizamento();

    public abstract Date getDataDaLiquidacao();

    public abstract String getEstado();

    public abstract String getMunicipio();

    public abstract String getRegimeTrabalho();

    public abstract String getMaiorRemuneracao();

    public abstract String getPrazoAviso();

    public abstract String getZerarValorNegativo();

    public abstract BigDecimal getCargaHoraria();

    public abstract Date getAdmissao();

    public abstract String getQuinquenal();

    public abstract String getUltimaRemuneracao();

    public abstract String getProjetarAviso();

    public abstract String getConsiderarFeriadosEstaduais();

    public abstract String getSabadoDiaUtil();

    public abstract Date getDemissao();

    public abstract String getPrescricaoFgts();

    public abstract String getLimitarAvos();

    public abstract String getConsiderarFeriadosMunicipais();

    public abstract CartaoDePontoMensalJRAdapter getCartaoDePontoMensal();

    public abstract CartaoDePontoDiarioJRAdapter getCartaoDePontoDiario();

    public abstract HistoricoSalarialJRAdapter getHistoricoSalarial();

    public abstract FaltasEFeriasJRAdapter getFaltasEFerias();

    public abstract boolean getMostrarDemonstrativo();

    public abstract boolean getMostrarResumo();

    public abstract boolean getMostrarResumoPrecatorio();

    public abstract boolean getMostrarAlgoAlemDoResumoEJustificativa();

    public abstract boolean getMostrarDemonstrativoFGTS();

    public abstract boolean getMostrarDemonstrativoINSS();

    public abstract boolean getMostrarDemonstrativoEsocialInssFgts();

    public abstract boolean getMostrarPensaoAlimenticia();

    public abstract boolean getMostrarSeguroDesemprego();

    public abstract boolean getMostrarSalarioFamilia();

    public abstract boolean getMostrarPrevidenciaPrivada();

    public abstract boolean getMostrarApuracaoDeJuros();

    public abstract boolean getMostrarMulta();

    public abstract boolean getMostrarHonorario();

    public abstract boolean getMostrarIrpf();

    public abstract boolean getMostrarCustas();

    public abstract boolean getMostrarComentarios();

    public abstract boolean getMostrarJustificativas();

    public abstract String getComentarios();

    public abstract DemonstrativoJRAdapter getDemonstrativo();

    public abstract ResumoJRAdapter getResumo();

    public abstract AbstractResumoPrecatorioJrAdapter getResumoPrecatorio();

    public abstract FGTSJRAdapter getDemonstrativoFGTS();

    public abstract InssJRAdapter getDemonstrativoINSS();

    public abstract EsocialInssFgtsJRAdapter getDemonstrativoEsocialInssFgts();

    public abstract PensaoAlimenticiaJRAdapter getPensaoAlimenticia();

    public abstract SeguroDesempregoJRAdapter getSeguroDesemprego();

    public abstract SalarioFamiliaJRAdapter getSalarioFamilia();

    public abstract PrevidenciaPrivadaJRAdapter getPrevidenciaPrivada();

    public abstract ApuracaoDeJurosJRAdapter getApuracaoDeJuros();

    public abstract MultaJRAdapter getMulta();

    public abstract HonorarioJRAdapter getHonorario();

    public abstract IrpfJRAdapter getIrpf();

    public abstract CustaJRAdapter getCustas();

    public abstract JustificativaJRAdapter getJustificativa();
}

