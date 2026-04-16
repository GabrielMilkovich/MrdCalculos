/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.MultaJRAdapter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class MultaJRAdapterPadrao
extends MultaJRAdapter {
    private Calculo calculo;
    private List<CredorDevedorWrapper> listaDeCredorDevedor;

    public MultaJRAdapterPadrao() {
    }

    public MultaJRAdapterPadrao(Calculo calculo) {
        this.calculo = calculo;
        this.listaDeCredorDevedor = new ArrayList<CredorDevedorWrapper>();
        for (CredorDevedorMultaEnum tipo : CredorDevedorMultaEnum.values()) {
            this.listaDeCredorDevedor.add(new CredorDevedorWrapper(tipo));
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<MultaJRAdapter.CredorDevedorMultaOcorrenciaAdapter> getOcorrencias() {
        return new JRAdapterDataSource<MultaJRAdapter.CredorDevedorMultaOcorrenciaAdapter>(new CredorDevedorMultaOcorrenciaAdapterPadrao(), this.listaDeCredorDevedor);
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public class MultaOcorrenciaAdapterPadrao
    extends MultaJRAdapter.MultaOcorrenciaAdapter {
        private Multa multa;

        @Override
        public MultaOcorrenciaAdapterPadrao adapt(Object multa) {
            this.multa = (Multa)multa;
            return this;
        }

        @Override
        public Date getOcorrencia() {
            return this.multa.getDataVencimentoMulta();
        }

        @Override
        public String getDescricao() {
            return this.multa.getDescricao();
        }

        @Override
        public String getTerceiro() {
            return this.multa.getNomeTerceiro();
        }

        @Override
        public BigDecimal getValor() {
            return this.multa.getValorMulta();
        }

        @Override
        public BigDecimal getBase() {
            return this.multa.getBaseMulta();
        }

        @Override
        public BigDecimal getAliquota() {
            return Utils.dividir(this.multa.getAliquotaMulta(), new BigDecimal("100"));
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.multa.getIndiceCorrecaoMulta();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.multa.getValorCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.multa.getJuros();
        }

        @Override
        public BigDecimal getTotal() {
            return this.multa.getValorTotal();
        }
    }

    public class CredorDevedorMultaOcorrenciaAdapterPadrao
    extends MultaJRAdapter.CredorDevedorMultaOcorrenciaAdapter {
        private CredorDevedorWrapper credorDevedor;

        @Override
        public CredorDevedorMultaOcorrenciaAdapterPadrao adapt(Object credorDevedor) {
            this.credorDevedor = (CredorDevedorWrapper)credorDevedor;
            return this;
        }

        @Override
        public JRAdapterDataSource<MultaJRAdapter.MultaOcorrenciaAdapter> getOcorrenciasInformadas() {
            return new JRAdapterDataSource<MultaJRAdapter.MultaOcorrenciaAdapter>(new MultaOcorrenciaAdapterPadrao(), this.credorDevedor.getListaInformadas());
        }

        @Override
        public JRAdapterDataSource<MultaJRAdapter.MultaOcorrenciaAdapter> getOcorrenciasCalculadas() {
            return new JRAdapterDataSource<MultaJRAdapter.MultaOcorrenciaAdapter>(new MultaOcorrenciaAdapterPadrao(), this.credorDevedor.getListaCalculadas());
        }

        @Override
        public String getNome() {
            return this.credorDevedor.getTipo().getDescricao().toUpperCase();
        }

        @Override
        public BigDecimal getTotalGeral() {
            BigDecimal totalGeral = BigDecimal.ZERO;
            for (Multa multa : this.credorDevedor.getListaInformadas()) {
                totalGeral = totalGeral.add(multa.getValorTotal(), Utils.CONTEXTO_MATEMATICO);
            }
            for (Multa multa : this.credorDevedor.getListaCalculadas()) {
                totalGeral = totalGeral.add(multa.getValorTotal(), Utils.CONTEXTO_MATEMATICO);
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
        public Boolean getMostrarTerceiros() {
            return CredorDevedorMultaEnum.TERCEIRO_RECLAMADO == this.credorDevedor.getTipo() || CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE == this.credorDevedor.getTipo();
        }

        @Override
        public String getComposicaoBase() {
            if (this.credorDevedor.getListaCalculadas().size() == 1) {
                Multa multa = this.credorDevedor.getListaCalculadas().get(0);
                return "(" + multa.getTipoBaseMulta().getNome() + ") x " + Utils.formatarValor(multa.getAliquotaMulta()) + "%";
            }
            return null;
        }
    }

    public class CredorDevedorWrapper {
        private CredorDevedorMultaEnum tipo;
        private List<Multa> listaInformadas;
        private List<Multa> listaCalculadas;

        public CredorDevedorWrapper(CredorDevedorMultaEnum tipo) {
            this.tipo = tipo;
            this.listaInformadas = this.getMultasPorTipo(TipoValorEnum.INFORMADO);
            this.listaCalculadas = this.getMultasPorTipo(TipoValorEnum.CALCULADO);
        }

        private List<Multa> getMultasPorTipo(TipoValorEnum tipoValor) {
            ArrayList<Multa> lista = new ArrayList<Multa>();
            for (Multa multa : MultaJRAdapterPadrao.this.calculo.getMultasDoCalculo()) {
                if (!this.tipo.equals((Object)multa.getTipoCredorDevedor()) || !multa.getTipoValorDaMulta().equals((Object)tipoValor)) continue;
                lista.add(multa);
            }
            return lista;
        }

        public List<Multa> getListaInformadas() {
            return this.listaInformadas;
        }

        public List<Multa> getListaCalculadas() {
            return this.listaCalculadas;
        }

        public CredorDevedorMultaEnum getTipo() {
            return this.tipo;
        }
    }
}

