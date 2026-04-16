/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.HonorarioVerbaDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.TabelaIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas.FaixaFiscal;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

public class MaquinaDeCalculoDeHonorarios
implements Serializable {
    private static final long serialVersionUID = 1909196745743260261L;
    private static final BigDecimal ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA = new BigDecimal("1.50");
    private Honorario honorario;

    public MaquinaDeCalculoDeHonorarios(Honorario honorario) {
        this.setHonorario(honorario);
    }

    public void liquidar() {
        Calculo calculo = this.honorario.getCalculo();
        switch (this.honorario.getTipoValor()) {
            case INFORMADO: {
                boolean usaIndiceTrabalhista;
                IndiceMonetarioEnum indiceMonetario = calculo.getAtualizacaoMonetaria();
                boolean bl = usaIndiceTrabalhista = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA == this.honorario.getTipoDeIndiceDeCorrecao();
                if (!usaIndiceTrabalhista && Utils.naoNulo((Object)this.honorario.getOutroIndiceDeCorrecao())) {
                    indiceMonetario = this.honorario.getOutroIndiceDeCorrecao();
                }
                if (Utils.naoNulo(this.honorario.getDataVencimento()) && HelperDate.dateBefore(this.honorario.getDataVencimento(), calculo.getDataDeLiquidacao())) {
                    TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(usaIndiceTrabalhista, indiceMonetario, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
                    Periodo periodoAbrangente = new Periodo();
                    periodoAbrangente.setInicial(this.honorario.getDataVencimento());
                    periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
                    tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
                    tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
                    tabelaDeCorrecaoMonetaria.marcaInicioFixoMesVencimento();
                    this.honorario.setIndiceCorrecaoHonorario(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(this.honorario.getDataVencimento()));
                    break;
                }
                this.honorario.setIndiceCorrecaoHonorario(BigDecimal.ONE);
                break;
            }
            case CALCULADO: {
                this.honorario.setDataVencimento(calculo.getDataDeLiquidacao());
                BigDecimal descontoDePrevidenciaPrivada = BigDecimal.ZERO;
                BigDecimal descontoDeContribuicaoSocial = BigDecimal.ZERO;
                BigDecimal bruto = BigDecimal.ZERO;
                switch (this.honorario.getBaseParaApuracao()) {
                    case BRUTO_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA: {
                        descontoDePrevidenciaPrivada = calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido();
                    }
                    case BRUTO_MENOS_CONTRIBUICAO_SOCIAL: {
                        if (calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue()) {
                            descontoDeContribuicaoSocial = Utils.arredondarValorMonetario(calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante());
                        }
                    }
                    case BRUTO: {
                        bruto = calculo.calcularBrutoDevidoAoReclamante();
                        break;
                    }
                    case VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL: {
                        for (HonorarioVerbaDeCalculo verba : this.honorario.getVerbasSelecionadas()) {
                            bruto = bruto.add(verba.getVerbaDeCalculo().getValorTotalDiferencaCorrigida());
                        }
                        break;
                    }
                }
                BigDecimal baseHonorario = bruto;
                baseHonorario = baseHonorario.subtract(descontoDeContribuicaoSocial, Utils.CONTEXTO_MATEMATICO);
                baseHonorario = baseHonorario.subtract(descontoDePrevidenciaPrivada, Utils.CONTEXTO_MATEMATICO);
                this.honorario.setBaseHonorario(baseHonorario);
                this.honorario.setValor(this.honorario.getBaseHonorario().multiply(Utils.obterPercentualPara(this.honorario.getAliquota()), Utils.CONTEXTO_MATEMATICO));
                this.honorario.setIndiceCorrecaoHonorario(BigDecimal.ONE);
            }
        }
        if (this.honorario.getApurarIRRF().booleanValue()) {
            BigDecimal baseImposto = this.honorario.getApurarIRPFSobreJuros() != false ? this.honorario.getValorTotal() : this.honorario.getValorCorrigido();
            BigDecimal imposto = BigDecimal.ZERO;
            switch (this.honorario.getTipoImpostoRenda()) {
                case PESSOA_FISICA: {
                    TabelaIrpf tabelaImpostoRenda = TabelaIrpf.obterTabelaDa(calculo.getDataDeLiquidacao());
                    FaixaFiscal faixa = tabelaImpostoRenda.obterFaixaParaValor(baseImposto);
                    imposto = Utils.multiplicar(baseImposto, Utils.obterPercentualPara(faixa.getAliquota()));
                    imposto = Utils.subtrair(imposto, faixa.getDeducao());
                    this.honorario.setValorInicialFaixaIrpf(faixa.getValorInicial());
                    this.honorario.setValorFinalFaixaIrpf(faixa.getValorFinal());
                    this.honorario.setValorAliquotaIrpf(faixa.getAliquota());
                    this.honorario.setValorDeducaoIrpf(faixa.getDeducao());
                    break;
                }
                case PESSOA_JURIDICA: {
                    imposto = Utils.multiplicar(baseImposto, Utils.obterPercentualPara(ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA));
                    this.honorario.setValorInicialFaixaIrpf(null);
                    this.honorario.setValorFinalFaixaIrpf(null);
                    this.honorario.setValorAliquotaIrpf(ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA);
                    this.honorario.setValorDeducaoIrpf(null);
                }
            }
            this.honorario.setValorImpostoRenda(imposto);
        } else {
            this.honorario.setValorImpostoRenda(BigDecimal.ZERO);
        }
    }

    public void setHonorario(Honorario honorario) {
        this.honorario = honorario;
    }

    public Honorario getHonorario() {
        return this.honorario;
    }

    public static HonorarioDaAtualizacao calcularImpostoDeRendaDaAtualizacao(HonorarioDaAtualizacao honorarioDaAtualizacao, Date dataPagamento) {
        return MaquinaDeCalculoDeHonorarios.calcularImpostoDeRendaDaAtualizacao(honorarioDaAtualizacao, dataPagamento, Boolean.FALSE);
    }

    public static HonorarioDaAtualizacao calcularImpostoDeRendaDaAtualizacao(HonorarioDaAtualizacao honorarioDaAtualizacao, Date dataPagamento, Boolean ehSaldo) {
        if (honorarioDaAtualizacao.getHonorario().getApurarIRRF().booleanValue()) {
            BigDecimal baseImposto = ehSaldo != false ? honorarioDaAtualizacao.getBaseDeImpostoDoSaldo() : honorarioDaAtualizacao.getBaseDeImposto();
            BigDecimal imposto = BigDecimal.ZERO;
            switch (honorarioDaAtualizacao.getHonorario().getTipoImpostoRenda()) {
                case PESSOA_FISICA: {
                    TabelaIrpf tabelaImpostoRenda = TabelaIrpf.obterTabelaDa(dataPagamento);
                    FaixaFiscal faixa = tabelaImpostoRenda.obterFaixaParaValor(baseImposto);
                    imposto = Utils.multiplicar(baseImposto, Utils.obterPercentualPara(faixa.getAliquota()));
                    imposto = Utils.subtrair(imposto, faixa.getDeducao());
                    if (ehSaldo.booleanValue()) {
                        honorarioDaAtualizacao.setValorInicialFaixaIrpfSaldo(faixa.getValorInicial());
                        honorarioDaAtualizacao.setValorFinalFaixaIrpfSaldo(faixa.getValorFinal());
                        honorarioDaAtualizacao.setValorAliquotaIrpfSaldo(faixa.getAliquota());
                        honorarioDaAtualizacao.setValorDeducaoIrpfSaldo(faixa.getDeducao());
                        break;
                    }
                    honorarioDaAtualizacao.setValorInicialFaixaIrpf(faixa.getValorInicial());
                    honorarioDaAtualizacao.setValorFinalFaixaIrpf(faixa.getValorFinal());
                    honorarioDaAtualizacao.setValorAliquotaIrpf(faixa.getAliquota());
                    honorarioDaAtualizacao.setValorDeducaoIrpf(faixa.getDeducao());
                    break;
                }
                case PESSOA_JURIDICA: {
                    imposto = Utils.multiplicar(baseImposto, Utils.obterPercentualPara(ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA));
                    if (ehSaldo.booleanValue()) {
                        honorarioDaAtualizacao.setValorInicialFaixaIrpfSaldo(null);
                        honorarioDaAtualizacao.setValorFinalFaixaIrpfSaldo(null);
                        honorarioDaAtualizacao.setValorAliquotaIrpfSaldo(ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA);
                        honorarioDaAtualizacao.setValorDeducaoIrpfSaldo(null);
                        break;
                    }
                    honorarioDaAtualizacao.setValorInicialFaixaIrpf(null);
                    honorarioDaAtualizacao.setValorFinalFaixaIrpf(null);
                    honorarioDaAtualizacao.setValorAliquotaIrpf(ALIQUOTA_IMPOSTO_RENDA_PESSOA_JURIDICA);
                    honorarioDaAtualizacao.setValorDeducaoIrpf(null);
                }
            }
            if (ehSaldo.booleanValue()) {
                honorarioDaAtualizacao.setValorImpostoRendaSaldo(Utils.arredondarValorMonetario(imposto));
            } else {
                honorarioDaAtualizacao.setValorImpostoRenda(Utils.arredondarValorMonetario(imposto));
            }
        }
        return honorarioDaAtualizacao;
    }
}

