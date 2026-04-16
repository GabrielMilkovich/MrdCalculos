/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.constantes.RelatorioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.AbstractResumoPrecatorioJrAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ApuracaoDeJurosJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ApuracaoDeJurosJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CalculoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustasJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialInssFgtsJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialInssFgtsJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.FGTSJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.FGTSJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.HonorarioJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.HonorarioJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.JustificativaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.JustificativaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.MultaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.MultaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PensaoAlimenticiaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PensaoAlimenticiaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PrevidenciaPrivadaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PrevidenciaPrivadaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPrecatorioJrAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SalarioFamiliaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SalarioFamiliaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SeguroDesempregoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SeguroDesempregoJRAdapterPadrao;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

public class CalculoJRAdapterPadrao
extends CalculoJRAdapter {
    private Calculo calculo;
    private List<RelatorioEnum> sessoes;
    private DemonstrativoJRAdapter demonstrativo;
    private ResumoJRAdapter resumo;
    private AbstractResumoPrecatorioJrAdapter resumoPrecatorio;
    private FGTSJRAdapter demonstrativoFGTS;
    private InssJRAdapter demonstrativoINSS;
    private EsocialInssFgtsJRAdapter demonstrativoEsocialInssFgts;
    private PensaoAlimenticiaJRAdapter pensaoAlimenticia;
    private PrevidenciaPrivadaJRAdapter previdenciaPrivada;
    private ApuracaoDeJurosJRAdapter apuracaoDeJuros;
    private MultaJRAdapter multa;
    private HonorarioJRAdapter honorario;
    private IrpfJRAdapter irpf;
    private CustaJRAdapter custas;
    private SeguroDesempregoJRAdapter seguroDesemprego;
    private SalarioFamiliaJRAdapter salarioFamilia;
    private JustificativaJRAdapter justificativa;

    public CalculoJRAdapterPadrao() {
    }

    public CalculoJRAdapterPadrao(Calculo calculo, List<RelatorioEnum> sessoes) {
        this.calculo = (Calculo)calculo.restaurar();
        this.calculo.getVerbas().size();
        this.sessoes = sessoes;
        this.iniciarAdaptersAnexos();
    }

    private void iniciarAdaptersAnexos() {
        if (this.getMostrarDemonstrativo()) {
            this.demonstrativo = new DemonstrativoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarDemonstrativoFGTS()) {
            this.demonstrativoFGTS = new FGTSJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarDemonstrativoINSS()) {
            this.demonstrativoINSS = new InssJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarDemonstrativoEsocialInssFgts()) {
            this.demonstrativoEsocialInssFgts = new EsocialInssFgtsJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarPrevidenciaPrivada()) {
            this.previdenciaPrivada = new PrevidenciaPrivadaJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarApuracaoDeJuros()) {
            this.apuracaoDeJuros = new ApuracaoDeJurosJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarPensaoAlimenticia()) {
            this.pensaoAlimenticia = new PensaoAlimenticiaJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarMulta()) {
            this.multa = new MultaJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarHonorario()) {
            this.honorario = new HonorarioJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarIrpf()) {
            this.irpf = new IrpfJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarCustas()) {
            this.custas = new CustasJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarResumo()) {
            this.resumo = new ResumoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarResumoPrecatorio()) {
            this.resumoPrecatorio = new ResumoPrecatorioJrAdapterPadrao(this.calculo);
        }
        if (this.getMostrarSeguroDesemprego()) {
            this.seguroDesemprego = new SeguroDesempregoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarSalarioFamilia()) {
            this.salarioFamilia = new SalarioFamiliaJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarJustificativas()) {
            this.justificativa = new JustificativaJRAdapterPadrao(this.calculo, false);
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public boolean getMostrarDemonstrativo() {
        return this.sessoes.contains((Object)RelatorioEnum.DEMONSTRATIVO_DE_CALCULO);
    }

    @Override
    public boolean getMostrarResumo() {
        return this.sessoes.contains((Object)RelatorioEnum.RESUMO_DE_CALCULO);
    }

    @Override
    public boolean getMostrarResumoPrecatorio() {
        return this.sessoes.contains((Object)RelatorioEnum.RESUMO_PRECATORIO);
    }

    @Override
    public boolean getMostrarDemonstrativoFGTS() {
        return this.sessoes.contains((Object)RelatorioEnum.DEMONSTRATIVO_FGTS);
    }

    @Override
    public boolean getMostrarDemonstrativoINSS() {
        return this.sessoes.contains((Object)RelatorioEnum.DEMONSTRATIVO_INSS);
    }

    @Override
    public boolean getMostrarDemonstrativoEsocialInssFgts() {
        return this.sessoes.contains((Object)RelatorioEnum.DEMONSTRATIVO_ESOCIAL_INSS_FGTS);
    }

    @Override
    public boolean getMostrarPensaoAlimenticia() {
        PensaoAlimenticia pensaoAlimenticia = this.calculo.getPensaoAlimenticiaDoCalculo();
        if (pensaoAlimenticia != null) {
            return this.sessoes.contains((Object)RelatorioEnum.PENSAO_ALIMENTICIA) && pensaoAlimenticia.getApurarPensaoAlimenticia() != false;
        }
        return false;
    }

    @Override
    public boolean getMostrarPrevidenciaPrivada() {
        return this.sessoes.contains((Object)RelatorioEnum.PREVIDENCIA_PRIVADA);
    }

    @Override
    public boolean getMostrarApuracaoDeJuros() {
        return this.sessoes.contains((Object)RelatorioEnum.APURACAO_DE_JUROS);
    }

    @Override
    public boolean getMostrarMulta() {
        return this.sessoes.contains((Object)RelatorioEnum.DEMONSTRATIVO_MULTA);
    }

    @Override
    public boolean getMostrarHonorario() {
        return this.sessoes.contains((Object)RelatorioEnum.DEMONSTRATIVO_HONORARIO);
    }

    @Override
    public boolean getMostrarIrpf() {
        return this.sessoes.contains((Object)RelatorioEnum.DEMONSTRATIVO_IRPF);
    }

    @Override
    public boolean getMostrarSeguroDesemprego() {
        return this.sessoes.contains((Object)RelatorioEnum.SEGURO_DESEMPREGO);
    }

    @Override
    public boolean getMostrarCustas() {
        return this.sessoes.contains((Object)RelatorioEnum.DEMONSTRATIVO_CUSTAS);
    }

    @Override
    public boolean getMostrarSalarioFamilia() {
        return this.sessoes.contains((Object)RelatorioEnum.SALARIO_FAMILIA);
    }

    @Override
    public boolean getMostrarComentarios() {
        return Utils.naoVazio(this.calculo.getComentarios());
    }

    @Override
    public boolean getMostrarJustificativas() {
        return this.sessoes.contains((Object)RelatorioEnum.JUSTIFICATIVA);
    }

    @Override
    public String getNumeroDoProcesso() {
        return this.calculo.getProcesso().getIdentificacao();
    }

    @Override
    public String getNumeroDoCalculo() {
        return this.calculo.getId().toString();
    }

    @Override
    public String getReclamante() {
        return this.calculo.getProcesso().getReclamante().getNome();
    }

    @Override
    public String getReclamado() {
        return this.calculo.getProcesso().getReclamado().getNome();
    }

    @Override
    public Periodo getPeriodoDeCalculo() {
        return this.calculo.obterPeriodoDoCalculo();
    }

    @Override
    public Date getDataDeAjuizamento() {
        return this.calculo.getDataAjuizamento();
    }

    @Override
    public Date getDataDaLiquidacao() {
        return this.calculo.getDataDeLiquidacao();
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
    public AbstractResumoPrecatorioJrAdapter getResumoPrecatorio() {
        return this.resumoPrecatorio;
    }

    @Override
    public FGTSJRAdapter getDemonstrativoFGTS() {
        return this.demonstrativoFGTS;
    }

    @Override
    public JRAdapterDataSource<JREmptyDS> getEmptyDS() {
        return new JRAdapterDataSource<JREmptyDS>(new JREmptyDS(), Arrays.asList(new Object()));
    }

    @Override
    public InssJRAdapter getDemonstrativoINSS() {
        return this.demonstrativoINSS;
    }

    @Override
    public EsocialInssFgtsJRAdapter getDemonstrativoEsocialInssFgts() {
        return this.demonstrativoEsocialInssFgts;
    }

    @Override
    public PensaoAlimenticiaJRAdapter getPensaoAlimenticia() {
        return this.pensaoAlimenticia;
    }

    @Override
    public PrevidenciaPrivadaJRAdapter getPrevidenciaPrivada() {
        return this.previdenciaPrivada;
    }

    @Override
    public ApuracaoDeJurosJRAdapter getApuracaoDeJuros() {
        return this.apuracaoDeJuros;
    }

    @Override
    public MultaJRAdapter getMulta() {
        return this.multa;
    }

    @Override
    public HonorarioJRAdapter getHonorario() {
        return this.honorario;
    }

    @Override
    public IrpfJRAdapter getIrpf() {
        return this.irpf;
    }

    @Override
    public CustaJRAdapter getCustas() {
        return this.custas;
    }

    @Override
    public SeguroDesempregoJRAdapter getSeguroDesemprego() {
        return this.seguroDesemprego;
    }

    @Override
    public SalarioFamiliaJRAdapter getSalarioFamilia() {
        return this.salarioFamilia;
    }

    @Override
    public String getComentarios() {
        return this.calculo.getComentarios();
    }

    @Override
    public JustificativaJRAdapter getJustificativa() {
        return this.justificativa;
    }
}

