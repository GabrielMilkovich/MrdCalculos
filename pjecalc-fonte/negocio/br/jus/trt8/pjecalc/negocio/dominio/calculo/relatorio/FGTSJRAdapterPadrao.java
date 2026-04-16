/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeBaseDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDepositadoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OperacaoDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.FGTSJRAdapter;
import java.math.BigDecimal;
import java.util.Date;

public class FGTSJRAdapterPadrao
extends FGTSJRAdapter {
    private Fgts fgts;

    public FGTSJRAdapterPadrao() {
    }

    public FGTSJRAdapterPadrao(Calculo calculo) {
        Fgts fgtsDoCalculo = calculo.criarFgtsSeNaoExistir(true);
        this.fgts = Utils.nulo(fgtsDoCalculo.getId()) ? fgtsDoCalculo : Fgts.obter(fgtsDoCalculo.getId());
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public String getNome() {
        return "FGTS " + this.fgts.getAliquota().getNome();
    }

    @Override
    public String getComentario() {
        return DestinoDoFgtsEnum.PAGAR.equals((Object)this.fgts.getDestinoDoFgts()) ? "PAGAR AO RECLAMANTE" : "RECOLHER EM CONTA VINCULADA DO RECLAMANTE";
    }

    @Override
    public String getComentarioOperacoes() {
        StringBuilder sb = new StringBuilder();
        if (this.fgts.getDeduzirDoFGTS().booleanValue()) {
            sb.append("PARA ABATER DO FGTS APURADO");
        }
        if (this.fgts.isMultaCalculada()) {
            switch (this.fgts.getIncidenciaDoFgts()) {
                case SOBRE_DEPOSITADO_SACADO: 
                case SOBRE_TOTAL_DEVIDO_MAIS_SAQUE_E_OU_SALDO: 
                case SOBRE_TOTAL_DEVIDO_MENOS_SAQUE_E_OU_SALDO: {
                    if (this.fgts.getDeduzirDoFGTS().booleanValue()) {
                        sb.append(" E ");
                    } else {
                        sb.append("PARA ");
                    }
                    sb.append("CALCULAR A BASE DA MULTA SOBRE FGTS");
                    break;
                }
            }
        }
        return sb.toString();
    }

    @Override
    public String getFormula() {
        return this.fgts.getLegendaDaFormula().toString();
    }

    @Override
    public Periodo getPeriodo() {
        return new Periodo(this.fgts.getPeriodoInicial(), this.fgts.getPeriodoFinal());
    }

    @Override
    public JRAdapterDataSource<FGTSJRAdapter.FGTSOcorrenciaAdapter> getOcorrencias() {
        return new JRAdapterDataSource<FGTSJRAdapter.FGTSOcorrenciaAdapter>(new FGTSOcorrenciaAdapterPadrao(), this.fgts.getOcorrencias());
    }

    @Override
    public JRAdapterDataSource<FGTSJRAdapter.FGTSOcorrenciaAdapter> getOcorrenciasComContribuicaoSocial() {
        if (this.getMostrarSecaoOcorrenciasComContribuicaoSocial()) {
            return new JRAdapterDataSource<FGTSJRAdapter.FGTSOcorrenciaAdapter>(new FGTSOcorrenciaComContribuicaoSocialAdapterPadrao(), this.fgts.getOcorrenciasComContribuicaoSocial());
        }
        return null;
    }

    @Override
    public JRAdapterDataSource<FGTSJRAdapter.FGTSOperacaoAdapter> getOperacoes() {
        if (this.getMostrarSecaoOperacoes()) {
            return new JRAdapterDataSource<FGTSJRAdapter.FGTSOperacaoAdapter>(new FGTSOperacaoAdapterPadrao(), this.fgts.getOperacoesDeFgts());
        }
        return null;
    }

    @Override
    public BigDecimal getTotalDaDiferencaCorrigidaDasOcorrencias() {
        return this.fgts.getTotalDaDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
    }

    @Override
    public BigDecimal getTotalDeJurosDasOcorrencias() {
        return this.fgts.getTotalDeJurosDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
    }

    @Override
    public BigDecimal getTotalDasOcorrencias() {
        return this.fgts.getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
    }

    @Override
    public BigDecimal getTotalDasOperacoesCorrigida() {
        return this.fgts.getTotalDoDepositadoOuSacadoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
    }

    @Override
    public BigDecimal getTotalJurosDasOperacoes() {
        return this.fgts.getTotalDeJurosDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
    }

    @Override
    public BigDecimal getTotalGeralDasOperacoes() {
        return this.fgts.getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
    }

    @Override
    public BigDecimal getTotalDaContribuicaoSocial05Corrigido() {
        return this.fgts.getValorDaContribuicaoSocial05Corrigido();
    }

    @Override
    public BigDecimal getTotalJurosDaContribuicaoSocial05() {
        return this.fgts.getJurosDaContribuicaoSocial05();
    }

    @Override
    public BigDecimal getTotalDaContribuicaoSocial05() {
        return this.fgts.getTotalDaContribuicaoSocial05();
    }

    @Override
    public FGTSJRAdapter.FGTSComMultaJRAdapter getFgtsComMulta() {
        if (this.getMostrarSecaoComMulta()) {
            return new FGTSComMultaJRAdapterPadrao(this.fgts);
        }
        return null;
    }

    @Override
    public FGTSJRAdapter.FGTSComMultaJRAdapter getFgtsComMultaDoArtigo467() {
        if (this.getMostrarSecaoArtigo467()) {
            return new FGTSComMultaDoArtigo467JRAdapterPadrao(this.fgts);
        }
        return null;
    }

    @Override
    public FGTSJRAdapter.FGTSComMultaJRAdapter getFgtsComMultaDaLei110() {
        if (this.getMostrarSecaoLei110()) {
            return new FGTSComMultaDaLei110JRAdapterPadrao(this.fgts);
        }
        return null;
    }

    @Override
    public boolean getMostrarSecaoOcorrencias() {
        return this.fgts.getOcorrenciasVisiveisRelatorio() != null && !this.fgts.getOcorrenciasVisiveisRelatorio().isEmpty();
    }

    @Override
    public boolean getMostrarSecaoOperacoes() {
        return this.fgts.getOperacoesDeFgts() != null && !this.fgts.getOperacoesDeFgts().isEmpty();
    }

    @Override
    public boolean getMostrarSecaoOcorrenciasComContribuicaoSocial() {
        return this.fgts.getOperacoesDeFgts() != null && this.fgts.getContribuicaoSocial05() != false && !this.fgts.getOcorrenciasComContribuicaoSocial().isEmpty();
    }

    @Override
    public boolean getMostrarSecaoComMulta() {
        return this.fgts.getMulta() != false && this.fgts.getCalculo().isLiquidado() && this.fgts.isDeveCobrarMulta();
    }

    @Override
    public boolean getMostrarSecaoArtigo467() {
        return this.fgts.getMulta() != false && this.fgts.getMultaDoArtigo467() != false && this.fgts.getCalculo().isLiquidado() && this.fgts.isDeveCobrarMulta();
    }

    @Override
    public boolean getMostrarSecaoLei110() {
        return this.fgts.getMulta10() != false && this.fgts.getCalculo().isLiquidado() && this.fgts.isDeveCobrarMulta();
    }

    @Override
    public boolean getMostrarJurosDepositadoSacado() {
        return this.fgts.getDeduzirDoFGTS();
    }

    public class FGTSComMultaDaLei110JRAdapterPadrao
    extends FGTSJRAdapter.FGTSComMultaJRAdapter {
        private Fgts fgts;

        public FGTSComMultaDaLei110JRAdapterPadrao(Fgts fgts) {
            this.fgts = fgts;
        }

        @Override
        public String getNome() {
            return "CONTRIBUI\u00c7\u00c3O SOCIAL 10% SOBRE FGTS";
        }

        @Override
        public String getComentario() {
            return "PARA INCORPORA\u00c7\u00c3O AO FGTS";
        }

        @Override
        public String getFormula() {
            return "((Total Devido) x 0,10)";
        }

        @Override
        public Date getDataDemissao() {
            return this.fgts.getCalculo().getDataDemissao();
        }

        @Override
        public BigDecimal getBase() {
            return this.fgts.getTotalDevidoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_DEMISSAO);
        }

        @Override
        public String getPercentual() {
            return "10%";
        }

        @Override
        public BigDecimal getDevido() {
            return this.fgts.getValorDaMulta10();
        }

        @Override
        public FGTSComMultaDaLei110JRAdapterPadrao adapt(Object adapted) {
            return this;
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.fgts.getIndiceMulta();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.fgts.getValorDaMulta10Corrigida();
        }

        @Override
        public BigDecimal getJuros() {
            return this.fgts.getJurosDaMulta10();
        }

        @Override
        public BigDecimal getTotal() {
            return this.fgts.getTotalDaMulta10Corrigida();
        }
    }

    public class FGTSComMultaDoArtigo467JRAdapterPadrao
    extends FGTSJRAdapter.FGTSComMultaJRAdapter {
        private Fgts fgts;

        public FGTSComMultaDoArtigo467JRAdapterPadrao(Fgts fgts) {
            this.fgts = fgts;
        }

        @Override
        public String getNome() {
            StringBuilder sb = new StringBuilder("Multa do Artigo 467 da CLT sobre Multa");
            if (this.fgts.isMultaCalculada()) {
                sb.append(" de " + this.fgts.getMultaDoFgts().getNome());
            }
            sb.append(" sobre FGTS");
            return sb.toString().toUpperCase();
        }

        @Override
        public String getComentario() {
            return "PARA SOMAR AO PRINCIPAL";
        }

        @Override
        public String getFormula() {
            return "((Multa " + (this.fgts.isMultaCalculada() ? "de " + this.fgts.getMultaDoFgts().getNome() : "") + " sobre FGTS) x 0,50)";
        }

        @Override
        public Date getDataDemissao() {
            return this.fgts.getCalculo().getDataDemissao();
        }

        @Override
        public BigDecimal getBase() {
            return this.fgts.getValorDaMultaDoFgts();
        }

        @Override
        public String getPercentual() {
            return "50%";
        }

        @Override
        public BigDecimal getDevido() {
            return this.fgts.getValorDaMultaDoArtigo467();
        }

        @Override
        public FGTSComMultaDoArtigo467JRAdapterPadrao adapt(Object adapted) {
            return this;
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.fgts.getIndiceMulta467();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.fgts.getValorDaMultaDoArtigo467Corrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.fgts.getJurosDaMultaDoArtigo467();
        }

        @Override
        public BigDecimal getTotal() {
            return this.fgts.getTotalDaMultaDoArtigo467();
        }
    }

    public class FGTSComMultaJRAdapterPadrao
    extends FGTSJRAdapter.FGTSComMultaJRAdapter {
        private Fgts fgts;

        public FGTSComMultaJRAdapterPadrao(Fgts fgts) {
            this.fgts = fgts;
        }

        public boolean getMostrarCalculada() {
            return TipoDeBaseDoFgtsEnum.CALCULADA.equals((Object)this.fgts.getTipoDoValorDaMulta());
        }

        public boolean getMostrarInformada() {
            return TipoDeBaseDoFgtsEnum.INFORMADA.equals((Object)this.fgts.getTipoDoValorDaMulta());
        }

        @Override
        public String getNome() {
            StringBuilder sb = new StringBuilder("Multa ");
            if (this.fgts.isMultaCalculada()) {
                sb.append("de " + this.fgts.getMultaDoFgts().getNome() + " sobre FGTS ");
                String nome = this.fgts.getIncidenciaDoFgts().getNome();
                sb.append("(" + nome.substring(6, nome.length()) + ")");
            } else {
                sb.append(" sobre FGTS");
            }
            return sb.toString().toUpperCase();
        }

        @Override
        public String getComentario() {
            return DestinoDoFgtsEnum.PAGAR.equals((Object)this.fgts.getDestinoDoFgts()) ? "PAGAR AO RECLAMANTE" : "RECOLHER EM CONTA VINCULADA DO RECLAMANTE";
        }

        @Override
        public String getFormula() {
            StringBuilder sb = new StringBuilder("(FGTS ");
            switch (this.fgts.getIncidenciaDoFgts()) {
                case SOBRE_O_TOTAL_DEVIDO: {
                    sb.append("(Total Devido) x ");
                    break;
                }
                case SOBRE_DEPOSITADO_SACADO: {
                    sb.append("(Saque e/ou Saldo) x ");
                    break;
                }
                case SOBRE_DIFERENCA: {
                    sb.append("(Diferen\u00e7a) x ");
                    break;
                }
                case SOBRE_TOTAL_DEVIDO_MAIS_SAQUE_E_OU_SALDO: {
                    sb.append("(Total Devido + Saque e/ou Saldo) x ");
                    break;
                }
                case SOBRE_TOTAL_DEVIDO_MENOS_SAQUE_E_OU_SALDO: {
                    sb.append("(Total Devido - Saque e/ou Saldo) x ");
                }
            }
            sb.append(this.fgts.getMultaDoFgts().getNome());
            sb.append(')');
            return sb.toString();
        }

        @Override
        public Date getDataDemissao() {
            return this.fgts.getCalculo().getDataDemissao();
        }

        @Override
        public BigDecimal getBase() {
            return this.fgts.getValorBaseParaMultaDoFgts();
        }

        @Override
        public String getPercentual() {
            return TipoDeBaseDoFgtsEnum.CALCULADA.equals((Object)this.fgts.getTipoDoValorDaMulta()) ? this.fgts.getMultaDoFgts().getNome() : null;
        }

        @Override
        public BigDecimal getDevido() {
            return this.fgts.getValorDaMultaDoFgts();
        }

        @Override
        public FGTSComMultaJRAdapterPadrao adapt(Object adapted) {
            return this;
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.fgts.getIndiceMulta();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.fgts.getValorDaMultaDoFgtsCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.fgts.getJurosDaMultaDoFgts();
        }

        @Override
        public BigDecimal getTotal() {
            return this.fgts.getTotalDaMultaDoFgts();
        }
    }

    public class FGTSOperacaoAdapterPadrao
    extends FGTSJRAdapter.FGTSOperacaoAdapter {
        private OperacaoDeFgts operacao;

        @Override
        public FGTSOperacaoAdapterPadrao adapt(Object operacao) {
            this.operacao = (OperacaoDeFgts)operacao;
            return this;
        }

        @Override
        public Date getDataOcorrencia() {
            return this.operacao.getCompetencia();
        }

        @Override
        public BigDecimal getValor() {
            return this.operacao.getValor();
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.operacao.getIndiceAcumulado();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return Utils.arredondarValorMonetario(this.operacao.getValorCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
        }

        @Override
        public BigDecimal getJuros() {
            return Utils.arredondarValorMonetario(this.operacao.getJuros(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
        }

        @Override
        public BigDecimal getTotal() {
            return Utils.arredondarValorMonetario(this.operacao.getTotal(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
        }
    }

    public class FGTSOcorrenciaComContribuicaoSocialAdapterPadrao
    extends FGTSJRAdapter.FGTSOcorrenciaAdapter {
        private OcorrenciaDeFgts ocorrencia;

        @Override
        public FGTSOcorrenciaComContribuicaoSocialAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeFgts)ocorrencia;
            return this;
        }

        @Override
        public Date getCompetenciaOcorrencia() {
            return this.ocorrencia.getOcorrencia();
        }

        @Override
        public BigDecimal getBase() {
            return this.ocorrencia.getSomaDasBases();
        }

        @Override
        public String getPercentual() {
            return "0,50%";
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDaContribuicaoSocialDe05();
        }

        @Override
        public BigDecimal getDepositado() {
            return null;
        }

        @Override
        public BigDecimal getDiferenca() {
            return null;
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.ocorrencia.getIndiceAcumulado();
        }

        @Override
        public BigDecimal getDiferencaCorrigida() {
            return this.ocorrencia.getValorDaContribuicaoSocialDe05Corrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJurosDaContribuicaoSocialDe05();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotalDaContribuicaoSocialDe05();
        }

        public boolean getVisivel() {
            if (Utils.nulo(this.ocorrencia)) {
                return false;
            }
            if (Utils.naoNulo(this.ocorrencia.getBaseVerba())) {
                return true;
            }
            if (TipoDeBaseDoFgtsEnum.INFORMADA.equals((Object)this.ocorrencia.getTipoDeBaseDoFgts()) || TipoDeDepositadoDoFgtsEnum.INFORMADA.equals((Object)this.ocorrencia.getTipoDeDepositadoDoFgts())) {
                return true;
            }
            return !Utils.nulo(this.ocorrencia.getBaseHistorico()) && BigDecimal.ZERO.compareTo(this.ocorrencia.getBaseHistorico()) != 0 || !Utils.nulo(this.ocorrencia.getDepositado()) && BigDecimal.ZERO.compareTo(this.ocorrencia.getDepositado()) != 0;
        }
    }

    public class FGTSOcorrenciaAdapterPadrao
    extends FGTSJRAdapter.FGTSOcorrenciaAdapter {
        private OcorrenciaDeFgts ocorrencia;

        @Override
        public FGTSOcorrenciaAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDeFgts)ocorrencia;
            return this;
        }

        @Override
        public Date getCompetenciaOcorrencia() {
            return this.ocorrencia.getOcorrencia();
        }

        @Override
        public BigDecimal getBase() {
            return this.ocorrencia.getSomaDasBases();
        }

        @Override
        public String getPercentual() {
            return this.ocorrencia.getAliquotaDoFgtsEnum().getNome();
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevido();
        }

        @Override
        public BigDecimal getDepositado() {
            return this.ocorrencia.getDepositado();
        }

        @Override
        public BigDecimal getDiferenca() {
            return this.ocorrencia.getDiferenca();
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.ocorrencia.getIndiceAcumulado();
        }

        @Override
        public BigDecimal getDiferencaCorrigida() {
            return this.ocorrencia.getDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJuros(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotal(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
        }

        public boolean getVisivel() {
            if (Utils.nulo(this.ocorrencia)) {
                return false;
            }
            if (Utils.naoNulo(this.ocorrencia.getBaseVerba())) {
                return true;
            }
            if (TipoDeBaseDoFgtsEnum.INFORMADA.equals((Object)this.ocorrencia.getTipoDeBaseDoFgts()) || TipoDeDepositadoDoFgtsEnum.INFORMADA.equals((Object)this.ocorrencia.getTipoDeDepositadoDoFgts())) {
                return true;
            }
            return !Utils.nulo(this.ocorrencia.getBaseHistorico()) && BigDecimal.ZERO.compareTo(this.ocorrencia.getBaseHistorico()) != 0 || !Utils.nulo(this.ocorrencia.getDepositado()) && BigDecimal.ZERO.compareTo(this.ocorrencia.getDepositado()) != 0;
        }
    }
}

