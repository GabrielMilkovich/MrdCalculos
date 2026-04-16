/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.AbstractResumoPrecatorioJrAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ApuracaoDeJurosJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CalculoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoJRAdapterScript;
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
import java.io.IOException;
import java.util.Arrays;
import java.util.Date;
import java.util.Map;

public class CalculoJRAdapterScript
extends CalculoJRAdapter {
    private static CalculoJRAdapterScript instance;
    private Map<Object, Object> calculo;
    private DemonstrativoJRAdapter demonstrativo;
    private ResumoJRAdapter resumo;

    public CalculoJRAdapterScript() {
        try {
            String script = Utils.resourceAsString(this, "relatorios/calculo/calculo.groovy");
            this.calculo = (Map)Utils.parseScript(script);
            this.demonstrativo = new DemonstrativoJRAdapterScript((Map)this.calculo.get("demonstrativo"));
        }
        catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static CalculoJRAdapterScript getInstance() {
        if (instance == null) {
            instance = new CalculoJRAdapterScript();
        }
        return instance;
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public boolean getMostrarDemonstrativo() {
        return true;
    }

    @Override
    public boolean getMostrarResumo() {
        return true;
    }

    @Override
    public boolean getMostrarDemonstrativoFGTS() {
        return true;
    }

    @Override
    public boolean getMostrarDemonstrativoINSS() {
        return false;
    }

    @Override
    public boolean getMostrarDemonstrativoEsocialInssFgts() {
        return false;
    }

    @Override
    public boolean getMostrarPensaoAlimenticia() {
        return false;
    }

    @Override
    public boolean getMostrarPrevidenciaPrivada() {
        return false;
    }

    @Override
    public boolean getMostrarApuracaoDeJuros() {
        return false;
    }

    @Override
    public boolean getMostrarMulta() {
        return false;
    }

    @Override
    public boolean getMostrarHonorario() {
        return false;
    }

    @Override
    public boolean getMostrarIrpf() {
        return false;
    }

    @Override
    public boolean getMostrarCustas() {
        return false;
    }

    @Override
    public boolean getMostrarComentarios() {
        return false;
    }

    @Override
    public boolean getMostrarJustificativas() {
        return false;
    }

    @Override
    public String getNumeroDoProcesso() {
        return (String)this.calculo.get("numeroDoProcesso");
    }

    @Override
    public String getNumeroDoCalculo() {
        return (String)this.calculo.get("numeroDoCalculo");
    }

    @Override
    public String getReclamante() {
        return "";
    }

    @Override
    public String getReclamado() {
        return "";
    }

    @Override
    public Periodo getPeriodoDeCalculo() {
        return null;
    }

    @Override
    public Date getDataDeAjuizamento() {
        return null;
    }

    @Override
    public Date getDataDaLiquidacao() {
        return null;
    }

    @Override
    public DemonstrativoJRAdapter getDemonstrativo() {
        return this.demonstrativo;
    }

    @Override
    public ResumoJRAdapter getResumo() {
        return this.resumo;
    }

    @Override
    public FGTSJRAdapter getDemonstrativoFGTS() {
        return null;
    }

    @Override
    public JRAdapterDataSource<JREmptyDS> getEmptyDS() {
        return new JRAdapterDataSource<JREmptyDS>(new JREmptyDS(), Arrays.asList(new Object()));
    }

    @Override
    public InssJRAdapter getDemonstrativoINSS() {
        return null;
    }

    @Override
    public EsocialInssFgtsJRAdapter getDemonstrativoEsocialInssFgts() {
        return null;
    }

    @Override
    public PensaoAlimenticiaJRAdapter getPensaoAlimenticia() {
        return null;
    }

    @Override
    public PrevidenciaPrivadaJRAdapter getPrevidenciaPrivada() {
        return null;
    }

    @Override
    public ApuracaoDeJurosJRAdapter getApuracaoDeJuros() {
        return null;
    }

    @Override
    public MultaJRAdapter getMulta() {
        return null;
    }

    @Override
    public HonorarioJRAdapter getHonorario() {
        return null;
    }

    @Override
    public IrpfJRAdapter getIrpf() {
        return null;
    }

    @Override
    public CustaJRAdapter getCustas() {
        return null;
    }

    @Override
    public boolean getMostrarSeguroDesemprego() {
        return false;
    }

    @Override
    public SeguroDesempregoJRAdapter getSeguroDesemprego() {
        return null;
    }

    @Override
    public boolean getMostrarSalarioFamilia() {
        return false;
    }

    @Override
    public SalarioFamiliaJRAdapter getSalarioFamilia() {
        return null;
    }

    @Override
    public String getComentarios() {
        return null;
    }

    @Override
    public JustificativaJRAdapter getJustificativa() {
        return null;
    }

    @Override
    public AbstractResumoPrecatorioJrAdapter getResumoPrecatorio() {
        return null;
    }

    @Override
    public boolean getMostrarResumoPrecatorio() {
        return false;
    }
}

