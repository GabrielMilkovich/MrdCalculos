/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfJRAdapter;
import java.math.BigDecimal;

public class IrpfJRAdapterPadrao
extends IrpfJRAdapter {
    public static final int INDICE_ANOS_ANTERIORES = 1;
    public static final int INDICE_SEPARADO = 2;
    public static final int INDICE_EXCLUSIVA = 3;
    public static final int INDICE_NORMAL = 4;
    private Irpf irpf;
    private OcorrenciaDeIrpfAdapterPadrao ocorrenciaAcumuladoAnterior;
    private OcorrenciaDeIrpfAdapterPadrao ocorrenciaTributacaoNormal;
    private OcorrenciaDeIrpfAdapterPadrao ocorrenciaTributacaoExclusiva;
    private OcorrenciaDeIrpfAdapterPadrao ocorrenciaTributacaoEmSeparado;
    private Periodo periodoAnterior;
    private Periodo periodo;

    public IrpfJRAdapterPadrao() {
    }

    public IrpfJRAdapterPadrao(Calculo calculo) {
        this.irpf = calculo.getIrpf();
        this.init();
    }

    private void init() {
        this.ocorrenciaAcumuladoAnterior = null;
        this.ocorrenciaTributacaoNormal = null;
        this.ocorrenciaTributacaoExclusiva = null;
        this.ocorrenciaTributacaoEmSeparado = null;
        this.periodoAnterior = new Periodo(this.irpf.getDataInicioAnosAnteriores(), this.irpf.getDataFimAnosAnteriores());
        this.periodo = new Periodo(this.irpf.getDataInicioAnoRecebimento(), this.irpf.getDataFimAnoRecebimento());
        for (OcorrenciaDeIrpf ocorrencia : this.irpf.getOcorrencias()) {
            switch (ocorrencia.getTipo()) {
                case NORMAL: {
                    this.ocorrenciaTributacaoNormal = new OcorrenciaDeIrpfAdapterPadrao(ocorrencia);
                    break;
                }
                case TRIBUTACAO_EM_SEPARADO: {
                    this.ocorrenciaTributacaoEmSeparado = new OcorrenciaDeIrpfAdapterPadrao(ocorrencia);
                    break;
                }
                case TRIBUTACAO_EXCLUSIVA: {
                    this.ocorrenciaTributacaoExclusiva = new OcorrenciaDeIrpfAdapterPadrao(ocorrencia);
                    break;
                }
                case RRA_ANOS_ANTERIORES: {
                    this.ocorrenciaAcumuladoAnterior = new OcorrenciaDeIrpfAdapterPadrao(ocorrencia);
                }
            }
        }
    }

    @Override
    public boolean getAcumuladoAnterior() {
        return Utils.naoNulo(this.ocorrenciaAcumuladoAnterior);
    }

    @Override
    public boolean getTributacaoEmSeparado() {
        return Utils.naoNulo(this.ocorrenciaTributacaoEmSeparado);
    }

    @Override
    public boolean getTributacaoExclusiva() {
        return Utils.naoNulo(this.ocorrenciaTributacaoExclusiva);
    }

    @Override
    public boolean getTributacaoNormal() {
        return Utils.naoNulo(this.ocorrenciaTributacaoNormal);
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public Periodo getPeriodoAnterior() {
        return this.periodoAnterior;
    }

    @Override
    public Periodo getPeriodo() {
        return this.periodo;
    }

    @Override
    public String getFormulaAnosAnteriores() {
        return this.irpf.getLegendaDaFormula().getLegenda(1);
    }

    @Override
    public String getFormulaSeparado() {
        return this.irpf.getLegendaDaFormula().getLegenda(2);
    }

    @Override
    public String getFormulaExclusiva() {
        return this.irpf.getLegendaDaFormula().getLegenda(3);
    }

    @Override
    public String getFormulaNormal() {
        return this.irpf.getLegendaDaFormula().getLegenda(4);
    }

    @Override
    public BigDecimal getTotalDevido() {
        return this.irpf.getTotalValorDevido();
    }

    @Override
    public IrpfJRAdapter.OcorrenciaDeIrpfAdapter getOcorrenciaAcumuladoAnterior() {
        return this.ocorrenciaAcumuladoAnterior;
    }

    @Override
    public IrpfJRAdapter.OcorrenciaDeIrpfAdapter getOcorrenciaTributacaoNormal() {
        return this.ocorrenciaTributacaoNormal;
    }

    @Override
    public IrpfJRAdapter.OcorrenciaDeIrpfAdapter getOcorrenciaTributacaoExclusiva() {
        return this.ocorrenciaTributacaoExclusiva;
    }

    @Override
    public IrpfJRAdapter.OcorrenciaDeIrpfAdapter getOcorrenciaTributacaoEmSeparado() {
        return this.ocorrenciaTributacaoEmSeparado;
    }

    public class OcorrenciaDeIrpfAdapterPadrao
    extends IrpfJRAdapter.OcorrenciaDeIrpfAdapter {
        private OcorrenciaDeIrpf ocorrencia;

        public OcorrenciaDeIrpfAdapterPadrao(OcorrenciaDeIrpf ocorrencia) {
            this.ocorrencia = ocorrencia;
        }

        @Override
        public BigDecimal getVerbas() {
            return this.ocorrencia.getValorVerbas();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getValorJuros();
        }

        @Override
        public BigDecimal getContribuicaoSocial() {
            return this.ocorrencia.getValorContribuicaoSocial();
        }

        @Override
        public BigDecimal getPrevidenciaPrivada() {
            return this.ocorrencia.getValorPrevidenciaPrivada();
        }

        @Override
        public BigDecimal getPensaoAlimenticia() {
            return this.ocorrencia.getValorPensaoAlimenticia();
        }

        @Override
        public BigDecimal getHonorarios() {
            return this.ocorrencia.getValorHonorarios();
        }

        @Override
        public BigDecimal getDependentes() {
            return this.ocorrencia.getValorDependentes();
        }

        @Override
        public BigDecimal getAposentadoMaior60Anos() {
            return this.ocorrencia.getValorAposentadoMaiorQue65();
        }

        @Override
        public BigDecimal getBase() {
            return this.ocorrencia.getValorBase();
        }

        @Override
        public String getFaixa() {
            BigDecimal inicio = (BigDecimal)Utils.seNulo(this.ocorrencia.getValorInicialFaixa(), BigDecimal.ZERO);
            if (Utils.nulo(this.ocorrencia.getValorFinalFaixa())) {
                return String.format("a partir de %s", Utils.formatarValor(inicio));
            }
            BigDecimal fim = (BigDecimal)Utils.seNulo(this.ocorrencia.getValorFinalFaixa(), BigDecimal.ZERO);
            return String.format("%s \u00e0 %s", Utils.formatarValor(inicio), Utils.formatarValor(fim));
        }

        @Override
        public BigDecimal getAliquota() {
            return Utils.obterPercentualPara(this.ocorrencia.getValorAliquota());
        }

        @Override
        public BigDecimal getDeducao() {
            return this.ocorrencia.getValorDeducao();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevido();
        }

        @Override
        public Integer getMeses() {
            return this.ocorrencia.getQuantidadeCompetencias();
        }
    }
}

