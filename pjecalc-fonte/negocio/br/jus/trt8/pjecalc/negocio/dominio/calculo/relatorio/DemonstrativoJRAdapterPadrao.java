/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Informada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;

public class DemonstrativoJRAdapterPadrao
extends DemonstrativoJRAdapter {
    private Calculo calculo;

    public DemonstrativoJRAdapterPadrao(Calculo calculo) {
        this.calculo = calculo;
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<DemonstrativoJRAdapter.DemonstrativoVerbaAdapter> getVerbas() {
        return new JRAdapterDataSource<DemonstrativoJRAdapter.DemonstrativoVerbaAdapter>(new DemonstrativoVerbaJRAdapterPadrao(), this.calculo.getVerbasParaLiquidacao());
    }

    public class DemonstrativoOcorrenciaJRAdapterPadrao
    extends DemonstrativoJRAdapter.DemonstrativoOcorrenciaAdapter {
        private OcorrenciaDeVerba ocorrencia;

        public DemonstrativoOcorrenciaJRAdapterPadrao() {
        }

        public DemonstrativoOcorrenciaJRAdapterPadrao(OcorrenciaDeVerba ocorrencia) {
            this.adapt(ocorrencia);
        }

        @Override
        public JRAdapter adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeVerba)ocorrencia;
            return this;
        }

        @Override
        public Periodo getPeriodo() {
            return new Periodo(this.ocorrencia.getDataInicial(), this.ocorrencia.getDataFinal());
        }

        @Override
        public BigDecimal getBase() {
            return this.ocorrencia.isValorInformado() ? null : this.ocorrencia.getBase();
        }

        @Override
        public BigDecimal getDivisor() {
            return this.ocorrencia.isValorInformado() ? null : this.ocorrencia.getDivisor();
        }

        @Override
        public BigDecimal getMultiplicador() {
            return this.ocorrencia.isValorInformado() ? null : this.ocorrencia.getMultiplicador();
        }

        @Override
        public BigDecimal getQuantidade() {
            return this.ocorrencia.isValorInformado() ? null : this.ocorrencia.getQuantidade();
        }

        @Override
        public String getDobra() {
            return this.ocorrencia.isValorInformado() ? " - " : (this.ocorrencia.getDobra() != false ? "Sim" : "N\u00e3o");
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getDevido();
        }

        @Override
        public BigDecimal getPago() {
            return this.ocorrencia.getPago();
        }

        @Override
        public BigDecimal getDiferenca() {
            return this.ocorrencia.getDiferenca();
        }

        @Override
        public BigDecimal getIndiceAcumulado() {
            return this.ocorrencia.getIndiceAcumulado();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.ocorrencia.getDiferencaCorrigida();
        }

        public boolean getVisivel() {
            return this.ocorrencia.getAtivo();
        }
    }

    public class DemonstrativoVerbaJRAdapterPadrao
    extends DemonstrativoJRAdapter.DemonstrativoVerbaAdapter {
        private VerbaDeCalculo verba;

        @Override
        public DemonstrativoVerbaJRAdapterPadrao adapt(Object verba) {
            this.verba = (VerbaDeCalculo)verba;
            return this;
        }

        @Override
        public String getNome() {
            return this.verba.getNome();
        }

        @Override
        public Periodo getPeriodo() {
            return new Periodo(this.verba.getPeriodoInicial(), this.verba.getPeriodoFinal());
        }

        @Override
        public BigDecimal getTotalDoValorCorrigido() {
            return this.verba.getValorTotalDiferencaCorrigida();
        }

        @Override
        public String getIncidencia() {
            StringBuilder builder = new StringBuilder();
            if (this.verba.getIncidenciaFGTS().booleanValue()) {
                builder.append("FGTS / ");
            }
            if (this.verba.getIncidenciaINSS().booleanValue()) {
                builder.append("Contribui\u00e7\u00e3o Social / ");
            }
            if (this.verba.getIncidenciaIRPF().booleanValue()) {
                builder.append("IRPF / ");
            }
            if (this.verba.getIncidenciaPrevidenciaPrivada().booleanValue()) {
                builder.append("Previd\u00eancia Privada / ");
            }
            if (this.verba.getIncidenciaPensaoAlimenticia().booleanValue()) {
                builder.append("Pens\u00e3o Aliment\u00edcia / ");
            }
            if (builder.length() > 0) {
                builder.delete(builder.length() - 3, builder.length());
            } else {
                builder.append("N\u00e3o h\u00e1.");
            }
            return builder.toString();
        }

        @Override
        public String getComentario() {
            if (this.verba.getComentarios() == null || this.verba.getComentarios().trim().isEmpty()) {
                return "-";
            }
            return this.verba.getComentarios();
        }

        @Override
        public String getFormula() {
            if (this.verba instanceof Informada) {
                return "";
            }
            return this.verba.getLegendaDaFormula().getLegenda();
        }

        @Override
        public JRAdapterDataSource<DemonstrativoJRAdapter.DemonstrativoOcorrenciaAdapter> getOcorrencias() {
            return new JRAdapterDataSource<DemonstrativoJRAdapter.DemonstrativoOcorrenciaAdapter>(new DemonstrativoOcorrenciaJRAdapterPadrao(), this.verba.getOcorrencias());
        }
    }
}

