/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.multa;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import java.io.Serializable;
import java.math.BigDecimal;

public class MaquinaDeCalculoDeMulta
implements Serializable {
    private static final long serialVersionUID = -3736714572635863929L;
    private Multa multa;

    public MaquinaDeCalculoDeMulta(Multa multa) {
        this.setMulta(multa);
    }

    public void liquidar() {
        Calculo calculo = this.multa.getCalculo();
        switch (this.multa.getTipoValorDaMulta()) {
            case INFORMADO: {
                boolean usaIndiceTrabalhista;
                IndiceMonetarioEnum indiceMonetario = calculo.getAtualizacaoMonetaria();
                boolean bl = usaIndiceTrabalhista = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA == this.multa.getOpcaoIndiceDeCorrecaoDaMulta();
                if (!usaIndiceTrabalhista && Utils.naoNulo((Object)this.multa.getOutroIndiceDeCorrecaoDaMulta())) {
                    indiceMonetario = this.multa.getOutroIndiceDeCorrecaoDaMulta();
                }
                if (Utils.naoNulo(this.multa.getDataVencimentoMulta()) && HelperDate.dateBefore(this.multa.getDataVencimentoMulta(), calculo.getDataDeLiquidacao())) {
                    TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(usaIndiceTrabalhista, indiceMonetario, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
                    Periodo periodoAbrangente = new Periodo();
                    periodoAbrangente.setInicial(this.multa.getDataVencimentoMulta());
                    periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
                    tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
                    tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
                    tabelaDeCorrecaoMonetaria.marcaInicioFixoMesVencimento();
                    this.multa.setIndiceCorrecaoMulta(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(this.multa.getDataVencimentoMulta()));
                    break;
                }
                this.multa.setIndiceCorrecaoMulta(BigDecimal.ONE);
                break;
            }
            case CALCULADO: {
                this.multa.setDataVencimentoMulta(calculo.getDataDeLiquidacao());
                BigDecimal descontoDePrevidenciaPrivada = BigDecimal.ZERO;
                BigDecimal descontoDeContribuicaoSocial = BigDecimal.ZERO;
                BigDecimal principal = BigDecimal.ZERO;
                BigDecimal baseMulta = BigDecimal.ZERO;
                switch (this.multa.getTipoBaseMulta()) {
                    case VALOR_CAUSA: {
                        if (!Utils.naoNulo(this.getMulta().getCalculo().getProcesso()) || !Utils.naoNulo(this.getMulta().getCalculo().getProcesso().getValorDaCausa())) break;
                        BigDecimal valorDaCausa = this.getMulta().getCalculo().getProcesso().getValorDaCausa();
                        baseMulta = Utils.arredondarValorMonetario(Utils.multiplicar(valorDaCausa, this.obterIndiceDeCorrecaoParaValorDaCausa(calculo)));
                        break;
                    }
                    case PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA: {
                        descontoDePrevidenciaPrivada = calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido();
                    }
                    case PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL: {
                        if (calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue()) {
                            descontoDeContribuicaoSocial = Utils.arredondarValorMonetario(calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante());
                        }
                    }
                    case PRINCIPAL: {
                        principal = calculo.getTotalDeValorCorrigidoDaApuracaoDeJuros();
                        principal = principal.add(calculo.getTotalDeJurosDaApuracaoDeJuros(), Utils.CONTEXTO_MATEMATICO);
                        if (calculo.getFgts().isComporOPrincipal()) {
                            principal = principal.add(calculo.getFgts().getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO), Utils.CONTEXTO_MATEMATICO);
                            principal = principal.add(calculo.getFgts().getTotalDaMultaDoFgts(), Utils.CONTEXTO_MATEMATICO);
                            principal = principal.add(calculo.getFgts().getTotalDaMultaDoArtigo467(), Utils.CONTEXTO_MATEMATICO);
                            if (calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                                principal = principal.subtract(calculo.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
                            }
                        }
                        if (Boolean.TRUE.equals(calculo.getSalarioFamilia().getApurarSalarioFamilia()) && calculo.getSalarioFamilia().isComporOPrincipal()) {
                            principal = principal.add(calculo.getSalarioFamilia().getTotalGeral());
                        }
                        if (Boolean.TRUE.equals(calculo.getSeguroDesemprego().getApurarSeguroDesemprego()) && calculo.getSeguroDesemprego().isComporOPrincipal()) {
                            principal = principal.add(calculo.getSeguroDesemprego().getTotal());
                        }
                        baseMulta = principal;
                        baseMulta = baseMulta.subtract(descontoDeContribuicaoSocial, Utils.CONTEXTO_MATEMATICO);
                        baseMulta = baseMulta.subtract(descontoDePrevidenciaPrivada, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                this.multa.setBaseMulta(baseMulta);
                this.multa.setValorMulta(this.multa.getBaseMulta().multiply(Utils.obterPercentualPara(this.multa.getAliquotaMulta()), Utils.CONTEXTO_MATEMATICO));
                this.multa.setIndiceCorrecaoMulta(BigDecimal.ONE);
            }
        }
    }

    private BigDecimal obterIndiceDeCorrecaoParaValorDaCausa(Calculo calculo) {
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(calculo.getAtualizacaoMonetaria(), calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
        Periodo periodoAbrangente = new Periodo();
        periodoAbrangente.setInicial(calculo.getDataAjuizamento());
        periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
        tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        return tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(calculo.getDataAjuizamento());
    }

    public Multa getMulta() {
        return this.multa;
    }

    public void setMulta(Multa multa) {
        this.multa = multa;
    }
}

