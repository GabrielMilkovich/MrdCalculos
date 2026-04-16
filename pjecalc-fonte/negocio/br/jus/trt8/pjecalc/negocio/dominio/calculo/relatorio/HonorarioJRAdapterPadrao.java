/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDevedorDoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeImpostoDeRendaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.HonorarioVerbaDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.HonorarioJRAdapter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class HonorarioJRAdapterPadrao
extends HonorarioJRAdapter {
    private Calculo calculo;
    private List<CredorDevedorWrapper> listaDeCredorDevedor;
    private Set<Honorario> honorariosComIrpf = new LinkedHashSet<Honorario>();

    public HonorarioJRAdapterPadrao() {
    }

    public HonorarioJRAdapterPadrao(Calculo calculo) {
        this.calculo = calculo;
        this.listaDeCredorDevedor = new ArrayList<CredorDevedorWrapper>();
        for (TipoDeDevedorDoHonorarioEnum tipo : TipoDeDevedorDoHonorarioEnum.values()) {
            this.listaDeCredorDevedor.add(new CredorDevedorWrapper(tipo));
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<HonorarioJRAdapter.CredorDevedorHonorarioOcorrenciaAdapter> getOcorrencias() {
        return new JRAdapterDataSource<HonorarioJRAdapter.CredorDevedorHonorarioOcorrenciaAdapter>(new CredorDevedorHonorarioOcorrenciaAdapterPadrao(), this.listaDeCredorDevedor);
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public Set<Honorario> getHonorariosComIrpf() {
        if (this.honorariosComIrpf.isEmpty()) {
            for (Honorario h : this.calculo.getHonorariosDoCalculo()) {
                if (!h.getApurarIRRF().booleanValue()) continue;
                this.honorariosComIrpf.add(h);
            }
        }
        return this.honorariosComIrpf;
    }

    @Override
    public JRAdapterDataSource<HonorarioJRAdapter.IrpfHonorarioOcorrenciaAdapter> getOcorrenciasIrpfHonorario() {
        return new JRAdapterDataSource<HonorarioJRAdapter.IrpfHonorarioOcorrenciaAdapter>(new IrpfHonorarioOcorrenciaAdapterPadrao(), this.getHonorariosComIrpf());
    }

    public class IrpfHonorarioOcorrenciaAdapterPadrao
    extends HonorarioJRAdapter.IrpfHonorarioOcorrenciaAdapter {
        private Honorario honorario;

        @Override
        public String getFaixa() {
            if (TipoDeImpostoDeRendaEnum.PESSOA_JURIDICA.equals((Object)this.honorario.getTipoImpostoRenda())) {
                return "-";
            }
            StringBuilder sb = new StringBuilder();
            if (Utils.naoNulo(this.honorario.getValorFinalFaixaIrpf())) {
                sb.append(Utils.formatarValor(this.honorario.getValorInicialFaixaIrpf())).append(" a ").append(Utils.formatarValor(this.honorario.getValorFinalFaixaIrpf()));
            } else {
                sb.append("A partir de ").append(Utils.formatarValor(this.honorario.getValorInicialFaixaIrpf()));
            }
            return sb.toString();
        }

        @Override
        public String getDeducao() {
            return Utils.formatarValor(this.honorario.getValorDeducaoIrpf());
        }

        @Override
        public Date getOcorrencia() {
            return this.honorario.getDataVencimento();
        }

        @Override
        public String getCredor() {
            return this.honorario.getNomeCredor();
        }

        @Override
        public BigDecimal getValor() {
            return this.honorario.getValorImpostoRenda();
        }

        @Override
        public BigDecimal getBase() {
            if (this.honorario.getApurarIRPFSobreJuros().booleanValue()) {
                return this.honorario.getValorTotal();
            }
            return this.honorario.getValorCorrigido();
        }

        @Override
        public BigDecimal getAliquota() {
            return this.honorario.getValorAliquotaIrpf();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.honorario.getValorCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            if (this.honorario.getApurarIRPFSobreJuros().booleanValue()) {
                return this.honorario.getJuros();
            }
            return null;
        }

        @Override
        public IrpfHonorarioOcorrenciaAdapterPadrao adapt(Object honorario) {
            this.honorario = (Honorario)honorario;
            return this;
        }
    }

    public class HonorarioOcorrenciaAdapterPadrao
    extends HonorarioJRAdapter.HonorarioOcorrenciaAdapter {
        private Honorario honorario;

        @Override
        public HonorarioOcorrenciaAdapterPadrao adapt(Object honorario) {
            this.honorario = (Honorario)honorario;
            return this;
        }

        @Override
        public Date getOcorrencia() {
            return this.honorario.getDataVencimento();
        }

        @Override
        public String getDescricao() {
            return this.honorario.getDescricao();
        }

        @Override
        public String getCredor() {
            return this.honorario.getNomeCredor();
        }

        @Override
        public BigDecimal getValor() {
            return this.honorario.getValor();
        }

        @Override
        public BigDecimal getBase() {
            return this.honorario.getBaseHonorario();
        }

        @Override
        public BigDecimal getAliquota() {
            return Utils.dividir(this.honorario.getAliquota(), new BigDecimal("100"));
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.honorario.getIndiceCorrecaoHonorario();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.honorario.getValorCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.honorario.getJuros();
        }

        @Override
        public BigDecimal getTotal() {
            return this.honorario.getValorTotal();
        }
    }

    public class CredorDevedorHonorarioOcorrenciaAdapterPadrao
    extends HonorarioJRAdapter.CredorDevedorHonorarioOcorrenciaAdapter {
        private CredorDevedorWrapper credorDevedor;

        @Override
        public CredorDevedorHonorarioOcorrenciaAdapterPadrao adapt(Object credorDevedor) {
            this.credorDevedor = (CredorDevedorWrapper)credorDevedor;
            return this;
        }

        @Override
        public JRAdapterDataSource<HonorarioJRAdapter.HonorarioOcorrenciaAdapter> getOcorrenciasInformadas() {
            return new JRAdapterDataSource<HonorarioJRAdapter.HonorarioOcorrenciaAdapter>(new HonorarioOcorrenciaAdapterPadrao(), this.credorDevedor.getListaInformadas());
        }

        @Override
        public JRAdapterDataSource<HonorarioJRAdapter.HonorarioOcorrenciaAdapter> getOcorrenciasCalculadas() {
            return new JRAdapterDataSource<HonorarioJRAdapter.HonorarioOcorrenciaAdapter>(new HonorarioOcorrenciaAdapterPadrao(), this.credorDevedor.getListaCalculadas());
        }

        @Override
        public String getNome() {
            return this.credorDevedor.getTipo().getDescricao().toUpperCase();
        }

        @Override
        public BigDecimal getTotalGeral() {
            BigDecimal totalGeral = BigDecimal.ZERO;
            for (Honorario honorario : this.credorDevedor.getListaInformadas()) {
                totalGeral = totalGeral.add(honorario.getValorTotal(), Utils.CONTEXTO_MATEMATICO);
            }
            for (Honorario honorario : this.credorDevedor.getListaCalculadas()) {
                totalGeral = totalGeral.add(honorario.getValorTotal(), Utils.CONTEXTO_MATEMATICO);
            }
            return totalGeral;
        }

        @Override
        public Boolean getMostrarCalculadas() {
            return !this.credorDevedor.getListaCalculadas().isEmpty();
        }

        @Override
        public Boolean getMostrarInformadas() {
            return !this.credorDevedor.getListaInformadas().isEmpty();
        }

        @Override
        public String getComposicaoBase() {
            if (this.credorDevedor.getListaCalculadas().size() == 1) {
                Honorario honorario = this.credorDevedor.getListaCalculadas().get(0);
                StringBuilder builder = new StringBuilder();
                builder.append('(');
                if (BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL.equals((Object)honorario.getBaseParaApuracao())) {
                    String textoSomar = " + ";
                    for (HonorarioVerbaDeCalculo hvc : honorario.getVerbasSelecionadas()) {
                        builder.append(hvc.getVerbaDeCalculo().getNome());
                        builder.append(textoSomar);
                    }
                    builder = new StringBuilder(builder.substring(0, builder.length() - textoSomar.length()));
                } else {
                    builder.append(honorario.getBaseParaApuracao().getNome());
                }
                builder.append(") x ");
                builder.append(Utils.formatarValor(honorario.getAliquota()));
                builder.append('%');
                return builder.toString();
            }
            return null;
        }
    }

    public class CredorDevedorWrapper {
        private TipoDeDevedorDoHonorarioEnum tipo;
        private List<Honorario> listaInformadas;
        private List<Honorario> listaCalculadas;

        public CredorDevedorWrapper(TipoDeDevedorDoHonorarioEnum tipo) {
            this.tipo = tipo;
            this.listaInformadas = this.getHonorariosPorTipo(TipoValorEnum.INFORMADO);
            this.listaCalculadas = this.getHonorariosPorTipo(TipoValorEnum.CALCULADO);
        }

        private List<Honorario> getHonorariosPorTipo(TipoValorEnum tipoValor) {
            ArrayList<Honorario> lista = new ArrayList<Honorario>();
            for (Honorario honorario : HonorarioJRAdapterPadrao.this.calculo.getHonorariosDoCalculo()) {
                if (!this.tipo.equals((Object)honorario.getTipoDeDevedor()) || !honorario.getTipoValor().equals((Object)tipoValor)) continue;
                lista.add(honorario);
            }
            return lista;
        }

        public List<Honorario> getListaInformadas() {
            return this.listaInformadas;
        }

        public List<Honorario> getListaCalculadas() {
            return this.listaCalculadas;
        }

        public TipoDeDevedorDoHonorarioEnum getTipo() {
            return this.tipo;
        }
    }
}

