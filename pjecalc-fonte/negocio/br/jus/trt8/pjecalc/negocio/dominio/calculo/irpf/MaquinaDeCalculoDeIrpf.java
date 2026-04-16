/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOcorrenciaIrpfEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.ProporcoesIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.TabelaDeJurosDeIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.ValoresCreditoReclamanteAnterior;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.OcorrenciaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.inss.multa.TaxaMultaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.TabelaIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas.FaixaFiscal;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PensaoAlimenticiaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

public class MaquinaDeCalculoDeIrpf
implements Serializable {
    private static final long serialVersionUID = -7181639348858204001L;
    private static final Date VINTE_OITO_JULHO_2010 = HelperDate.getInstance(2010, 6, 28).getDate();
    private static final BigDecimal UM_CENTAVO = new BigDecimal("0.01");
    private static final Date DATA_TAXA_DIARIA_MULTA = HelperDate.getInstance(2008, 11, 1).getDate();
    private TabelaIrpf tabelaImpostoRenda;
    private TabelaDeJurosDeIrpf tabelaDeJurosIrpf;
    private TaxaMultaPrevidenciaria tabelaTaxaDeMulta;
    private List<ValoresCreditoReclamanteAnterior> valoresAnteriores = new ArrayList<ValoresCreditoReclamanteAnterior>();
    private BigDecimal somatorioCompetenciasCorrentes = BigDecimal.ZERO;
    private Irpf irpf;

    public MaquinaDeCalculoDeIrpf(Irpf irpf) {
        this.irpf = irpf;
    }

    private void limparOcorrencias() {
        if (Utils.naoNulo(this.irpf) && Utils.naoNulo(this.irpf.getOcorrencias()) && !this.irpf.getOcorrencias().isEmpty()) {
            ArrayList<OcorrenciaDeIrpf> ocorrencias = new ArrayList<OcorrenciaDeIrpf>();
            for (OcorrenciaDeIrpf ocorrencia : this.irpf.getOcorrencias()) {
                ocorrencias.add(ocorrencia);
            }
            this.irpf.removerDeOcorrencias(ocorrencias, false);
            this.irpf.getOcorrencias().clear();
        }
    }

    public void liquidarAtualizacaoCalculoExterno(Date dataEvento, CreditosDoReclamante creditoDoReclamante, DebitosDoReclamante debitosDoReclamante, boolean hasPagamentoPrincipal) {
        if (this.irpf.getApurarImpostoRenda().booleanValue()) {
            BigDecimal numeroCompetencias;
            BigDecimal quantidadeDeMeses;
            BigDecimal pagoPrincipal = null;
            BigDecimal juroPagoTotal = null;
            BigDecimal descontoContribuicaoSocial = null;
            BigDecimal descontoPrevidenciaPrivada = null;
            BigDecimal descontoPensao = null;
            BigDecimal descontoHonorarios = null;
            BigDecimal principalCorrigido = null;
            BigDecimal juroPrincipal = null;
            BigDecimal diferencaJuroPrincipal = null;
            BigDecimal principalParaProporcao = null;
            BigDecimal jurosParaProporcao = null;
            this.irpf.setDataInicioAnosAnteriores(this.irpf.getCalculo().getDataDeLiquidacao());
            this.irpf.setDataFimAnosAnteriores(this.irpf.getCalculo().getDataDeLiquidacao());
            principalCorrigido = creditoDoReclamante.getDevidoPrincipal();
            juroPrincipal = Utils.somar(creditoDoReclamante.getDevidoJuroDeMoraPrincipal(), creditoDoReclamante.getDevidoJuroDeMoraPrincipalPeriodoAtual());
            diferencaJuroPrincipal = Utils.somar(creditoDoReclamante.getDiferencaJuroDeMoraPrincipal(), creditoDoReclamante.getDiferencaJuroDeMoraPrincipalPeriodoAtual());
            if (hasPagamentoPrincipal) {
                principalParaProporcao = creditoDoReclamante.getPagoPrincipal();
                jurosParaProporcao = this.encontrarJurosPagos(creditoDoReclamante);
                pagoPrincipal = Utils.multiplicar(creditoDoReclamante.getProporcaoPrincipalTributavel(), creditoDoReclamante.getPagoPrincipal());
                juroPagoTotal = this.irpf.getIncidirSobreJurosDeMora() != false ? Utils.multiplicar(creditoDoReclamante.getProporcaoJurosTributavel(), jurosParaProporcao) : null;
                descontoContribuicaoSocial = debitosDoReclamante.getPagoDescontoInss();
                descontoPrevidenciaPrivada = debitosDoReclamante.getPagoPrevidenciaPrivada();
                descontoPensao = this.encontrarDescontoPensao(debitosDoReclamante, Boolean.TRUE);
                descontoHonorarios = this.encontrarDescontoHonorario(creditoDoReclamante, debitosDoReclamante, pagoPrincipal, juroPagoTotal, Boolean.TRUE);
            } else {
                principalParaProporcao = creditoDoReclamante.getDiferencaPrincipal();
                jurosParaProporcao = this.encontrarJurosSaldo(creditoDoReclamante);
                pagoPrincipal = Utils.multiplicar(creditoDoReclamante.getProporcaoPrincipalTributavel(), creditoDoReclamante.getDiferencaPrincipal());
                juroPagoTotal = this.irpf.getIncidirSobreJurosDeMora() != false ? Utils.multiplicar(creditoDoReclamante.getProporcaoJurosTributavel(), jurosParaProporcao) : null;
                descontoContribuicaoSocial = Utils.zerarSeNegativo(debitosDoReclamante.getDescontoInssCorrigido());
                descontoPrevidenciaPrivada = Utils.zerarSeNegativo(debitosDoReclamante.getPrevidenciaPrivadaCorrigido());
                descontoPensao = Utils.zerarSeNegativo(this.encontrarDescontoPensao(debitosDoReclamante, Boolean.FALSE));
                descontoHonorarios = Utils.zerarSeNegativo(this.encontrarDescontoHonorario(creditoDoReclamante, debitosDoReclamante, pagoPrincipal, juroPagoTotal, Boolean.FALSE));
            }
            this.tabelaImpostoRenda = TabelaIrpf.obterTabelaDa(dataEvento);
            if (Utils.nulo(this.tabelaImpostoRenda)) {
                return;
            }
            BigDecimal proporcao = this.calcularProporcao(creditoDoReclamante, principalCorrigido, principalParaProporcao, jurosParaProporcao, juroPrincipal, diferencaJuroPrincipal);
            BigDecimal bigDecimal = quantidadeDeMeses = Utils.naoNulo(this.irpf.getQtdMesesRendimentoTributaveis()) ? new BigDecimal(this.irpf.getQtdMesesRendimentoTributaveis()) : BigDecimal.ONE;
            if (hasPagamentoPrincipal) {
                numeroCompetencias = Utils.arredondarValorRegraIRPF(Utils.multiplicar(quantidadeDeMeses, proporcao));
                ValoresCreditoReclamanteAnterior.incluirNoValorAnterior(numeroCompetencias, creditoDoReclamante.getDataFinalPeriodo(), this.valoresAnteriores);
            } else {
                numeroCompetencias = ValoresCreditoReclamanteAnterior.calcularCompetenciasSaldo(quantidadeDeMeses, this.valoresAnteriores);
            }
            ArrayList<OcorrenciaDeIrpfAtualizacao> ocorrenciasDeAtualizacao = new ArrayList<OcorrenciaDeIrpfAtualizacao>();
            OcorrenciaDeIrpfAtualizacao ocorrenciaAnosAnteriores = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.RRA_ANOS_ANTERIORES);
            ocorrenciaAnosAnteriores.setHasPagamento(hasPagamentoPrincipal);
            ocorrenciaAnosAnteriores.setDataOcorrencia(dataEvento);
            ocorrenciaAnosAnteriores.setDataEvento(dataEvento);
            ocorrenciaAnosAnteriores.setValorVerbas(pagoPrincipal);
            ocorrenciaAnosAnteriores.setValorJuros(juroPagoTotal);
            ocorrenciaAnosAnteriores.setValorContribuicaoSocial(this.irpf.getDeduzirContribuicaoSocialDevidaPeloReclamante() != false ? descontoContribuicaoSocial : null);
            ocorrenciaAnosAnteriores.setValorPrevidenciaPrivada(this.irpf.getDeduzirPrevidenciaPrivada() != false ? descontoPrevidenciaPrivada : null);
            ocorrenciaAnosAnteriores.setValorPensaoAlimenticia(this.irpf.getDeduzirPensaoAlimenticia() != false ? descontoPensao : null);
            ocorrenciaAnosAnteriores.setValorHonorarios(this.irpf.getDeduzirHonorariosDevidosPeloReclamante() != false ? descontoHonorarios : null);
            ocorrenciaAnosAnteriores.setValorDependentes(this.encontrarDescontoParaDependentes().multiply(new BigDecimal(this.irpf.getQtdMesesRendimentoTributaveis()), Utils.CONTEXTO_MATEMATICO));
            ocorrenciaAnosAnteriores.setValorAposentadoMaiorQue65(this.encontrarDescontoParaAposentadoMaiorQue65Anos().multiply(new BigDecimal(this.irpf.getQtdMesesRendimentoTributaveis()), Utils.CONTEXTO_MATEMATICO));
            ocorrenciaAnosAnteriores.setQuantidadeCompetencias(numeroCompetencias);
            ocorrenciaAnosAnteriores.atualizaBase();
            this.preencherFaixaFiscal(ocorrenciaAnosAnteriores);
            ocorrenciaAnosAnteriores.setIrpf(this.irpf);
            this.irpf.getOcorrenciasAtualizacao().add(ocorrenciaAnosAnteriores);
            ocorrenciasDeAtualizacao.add(ocorrenciaAnosAnteriores);
            EntidadeBase.salvar(ocorrenciasDeAtualizacao);
        }
    }

    private BigDecimal encontrarDescontoHonorario(CreditosDoReclamante creditoDoReclamante, DebitosDoReclamante debitosDoReclamante, BigDecimal principalParaImposto, BigDecimal jurosParaImposto, Boolean hasPagamentoPrincipal) {
        BigDecimal descontoHonorarios = BigDecimal.ZERO;
        BigDecimal totalCreditos = Utils.somar(BigDecimal.ZERO, creditoDoReclamante.getTotalDiferenca(), BigDecimal.ZERO);
        if (hasPagamentoPrincipal.booleanValue()) {
            totalCreditos = Utils.somar(BigDecimal.ZERO, creditoDoReclamante.getTotalPago(), BigDecimal.ZERO);
        }
        if (this.irpf.getDeduzirHonorariosDevidosPeloReclamante().booleanValue() && BigDecimal.ZERO.compareTo(totalCreditos) < 0) {
            BigDecimal totalParaImposto = BigDecimal.ZERO;
            totalParaImposto = Utils.somar(totalParaImposto, principalParaImposto, totalParaImposto);
            totalParaImposto = Utils.somar(totalParaImposto, jurosParaImposto, totalParaImposto);
            Set<HonorarioDaAtualizacao> honorariosCalculados = debitosDoReclamante.getHonorariosDaAtualizacaoCalculado();
            for (HonorarioDaAtualizacao honorario : honorariosCalculados) {
                descontoHonorarios = Utils.somar(descontoHonorarios, this.calcularDescontoHonorario(hasPagamentoPrincipal, totalCreditos, totalParaImposto, honorario), descontoHonorarios);
            }
            Set<HonorarioDaAtualizacao> honorariosInformados = debitosDoReclamante.getHonorariosDaAtualizacaoInformado();
            for (HonorarioDaAtualizacao honorario : honorariosInformados) {
                descontoHonorarios = Utils.somar(descontoHonorarios, this.calcularDescontoHonorario(hasPagamentoPrincipal, totalCreditos, totalParaImposto, honorario), descontoHonorarios);
            }
        }
        return descontoHonorarios;
    }

    private BigDecimal calcularDescontoHonorario(Boolean hasPagamentoPrincipal, BigDecimal totalCreditos, BigDecimal totalParaImposto, HonorarioDaAtualizacao honorario) {
        BigDecimal desconto = hasPagamentoPrincipal != false ? Utils.dividir(honorario.getTotalPago(), totalCreditos) : Utils.dividir(honorario.getDiferencaDevidoPagoHonorarios(), totalCreditos);
        desconto = Utils.multiplicar(desconto, totalParaImposto);
        return desconto;
    }

    private BigDecimal encontrarDescontoPensao(DebitosDoReclamante debitosDoReclamante, Boolean hasPagamentoPrincipal) {
        PensaoAlimenticiaDaAtualizacao pensaoAlimenticia = debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao();
        BigDecimal valorPensao = null;
        if (this.irpf.getDeduzirPensaoAlimenticia().booleanValue() && Utils.naoNulo(pensaoAlimenticia) && hasPagamentoPrincipal.booleanValue()) {
            valorPensao = Utils.somar(pensaoAlimenticia.getPagoPensao(), pensaoAlimenticia.getPagoJuro());
        } else if (this.irpf.getDeduzirPensaoAlimenticia().booleanValue() && Utils.naoNulo(pensaoAlimenticia) && !hasPagamentoPrincipal.booleanValue()) {
            valorPensao = pensaoAlimenticia.getDiferencaPensaoDevidoParaIrpf();
        }
        if (Utils.nulo(valorPensao)) {
            return BigDecimal.ZERO;
        }
        return Utils.multiplicar(valorPensao, pensaoAlimenticia.getPensaoAlimenticia().getProporcaoBaseTributavel());
    }

    private BigDecimal encontrarJurosSaldo(CreditosDoReclamante creditoDoReclamante) {
        BigDecimal juroPagoTotal = null;
        if (!Utils.nulos(creditoDoReclamante.getDiferencaJuroDeMoraPrincipal(), creditoDoReclamante.getDiferencaJuroDeMoraPrincipalPeriodoAtual())) {
            juroPagoTotal = BigDecimal.ZERO;
            juroPagoTotal = Utils.somar(juroPagoTotal, creditoDoReclamante.getDiferencaJuroDeMoraPrincipal(), juroPagoTotal);
            juroPagoTotal = Utils.somar(juroPagoTotal, creditoDoReclamante.getDiferencaJuroDeMoraPrincipalPeriodoAtual(), juroPagoTotal);
        }
        return juroPagoTotal;
    }

    private BigDecimal encontrarJurosPagos(CreditosDoReclamante creditoDoReclamante) {
        BigDecimal juroPagoTotal = null;
        if (!Utils.nulos(creditoDoReclamante.getPagoJuroDeMoraPrincipal(), creditoDoReclamante.getPagoJuroDeMoraPrincipalPeriodoAtual())) {
            juroPagoTotal = BigDecimal.ZERO;
            juroPagoTotal = Utils.somar(juroPagoTotal, creditoDoReclamante.getPagoJuroDeMoraPrincipal(), juroPagoTotal);
            juroPagoTotal = Utils.somar(juroPagoTotal, creditoDoReclamante.getPagoJuroDeMoraPrincipalPeriodoAtual(), juroPagoTotal);
        }
        return juroPagoTotal;
    }

    private void preencherFaixaFiscal(OcorrenciaDeIrpfAtualizacao ocorrenciaAnosAnteriores) {
        FaixaFiscal faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaAnosAnteriores.getValorBase(), ocorrenciaAnosAnteriores.getQuantidadeCompetencias());
        BigDecimal valorInicialDaFaixa = faixa.getValorInicial().subtract(UM_CENTAVO, Utils.CONTEXTO_MATEMATICO);
        valorInicialDaFaixa = valorInicialDaFaixa.multiply(ocorrenciaAnosAnteriores.getQuantidadeCompetencias(), Utils.CONTEXTO_MATEMATICO);
        if (BigDecimal.ZERO.compareTo(valorInicialDaFaixa = valorInicialDaFaixa.add(UM_CENTAVO, Utils.CONTEXTO_MATEMATICO)) > 0) {
            valorInicialDaFaixa = BigDecimal.ZERO;
        }
        ocorrenciaAnosAnteriores.setValorInicialFaixa(valorInicialDaFaixa);
        ocorrenciaAnosAnteriores.setValorFinalFaixa(Utils.naoNulo(faixa.getValorFinal()) ? faixa.getValorFinal().multiply(ocorrenciaAnosAnteriores.getQuantidadeCompetencias(), Utils.CONTEXTO_MATEMATICO) : null);
        if (ocorrenciaAnosAnteriores.getQuantidadeCompetencias().compareTo(BigDecimal.ZERO) > 0) {
            ocorrenciaAnosAnteriores.setValorAliquota(faixa.getAliquota());
            ocorrenciaAnosAnteriores.setValorDeducao(faixa.getDeducao().multiply(ocorrenciaAnosAnteriores.getQuantidadeCompetencias(), Utils.CONTEXTO_MATEMATICO));
            ocorrenciaAnosAnteriores.atualizaValorDevido();
        } else {
            ocorrenciaAnosAnteriores.setValorAliquota(BigDecimal.ZERO);
            ocorrenciaAnosAnteriores.setValorDeducao(BigDecimal.ZERO);
            ocorrenciaAnosAnteriores.setValorDevido(BigDecimal.ZERO);
        }
    }

    /*
     * WARNING - void declaration
     */
    public void liquidarAtualizacao(Date dataEvento, ProporcoesIrpf proporcoesIrpf, CreditosDoReclamante creditoDoReclamante, DebitosDoReclamante debitosDoReclamante, boolean hasPagamentoPrincipal) {
        if (this.irpf.getApurarImpostoRenda().booleanValue()) {
            BigDecimal principalCorrigido = null;
            BigDecimal pagoPrincipal = null;
            BigDecimal juroPagoTotal = null;
            BigDecimal juroPrincipal = null;
            BigDecimal diferencaJuroPrincipal = null;
            principalCorrigido = creditoDoReclamante.getDevidoPrincipal();
            juroPrincipal = Utils.somar(creditoDoReclamante.getDevidoJuroDeMoraPrincipal(), creditoDoReclamante.getDevidoJuroDeMoraPrincipalPeriodoAtual());
            diferencaJuroPrincipal = Utils.somar(creditoDoReclamante.getDiferencaJuroDeMoraPrincipal(), creditoDoReclamante.getDiferencaJuroDeMoraPrincipalPeriodoAtual());
            if (hasPagamentoPrincipal) {
                pagoPrincipal = creditoDoReclamante.getPagoPrincipal();
                juroPagoTotal = Utils.somar(creditoDoReclamante.getPagoJuroDeMoraPrincipal(), creditoDoReclamante.getPagoJuroDeMoraPrincipalPeriodoAtual());
            } else {
                pagoPrincipal = creditoDoReclamante.getDiferencaPrincipal();
                juroPagoTotal = Utils.somar(creditoDoReclamante.getDiferencaJuroDeMoraPrincipal(), creditoDoReclamante.getDiferencaJuroDeMoraPrincipalPeriodoAtual());
            }
            this.tabelaImpostoRenda = TabelaIrpf.obterTabelaDa(dataEvento);
            if (Utils.nulo(this.tabelaImpostoRenda)) {
                return;
            }
            ArrayList<OcorrenciaDeIrpfAtualizacao> ocorrenciasDeAtualizacao = new ArrayList<OcorrenciaDeIrpfAtualizacao>();
            Calculo calculo = this.irpf.getCalculo();
            if (Utils.naoNulo(this.irpf.getRegimeDeCaixa()) && this.irpf.getRegimeDeCaixa().booleanValue() || HelperDate.dateBefore(dataEvento, VINTE_OITO_JULHO_2010)) {
                FaixaFiscal faixa;
                boolean existeVerbaDecimoTerceiro = false;
                boolean existeVerbaFerias = false;
                boolean existeDemaisVerbas = false;
                boolean existeVerbaAnosAnteriores = false;
                BigDecimal verbaDecimoTerceiro = Utils.arredondarValorMonetario(Utils.multiplicar(pagoPrincipal, proporcoesIrpf.getProporcaoDecimo()));
                BigDecimal verbaFerias = Utils.arredondarValorMonetario(Utils.multiplicar(pagoPrincipal, proporcoesIrpf.getProporcaoFerias()));
                BigDecimal verbaDemaisVerbas = Utils.arredondarValorMonetario(Utils.multiplicar(pagoPrincipal, proporcoesIrpf.getProporcaoNormal()));
                BigDecimal verbaAnosAnteriores = Utils.arredondarValorMonetario(Utils.multiplicar(pagoPrincipal, proporcoesIrpf.getProporcaoAnosAnteriores()));
                HashSet<Date> mesesAnosAnteriores = new HashSet<Date>();
                HashSet<Date> mesesAnosAnterioresDecimoTerceiro = new HashSet<Date>();
                for (VerbaDeCalculo verba : calculo.getVerbasAtivas()) {
                    if (!verba.getIncidenciaIRPF().booleanValue()) continue;
                    for (OcorrenciaDeVerba ocorrenciaVerbas : verba.getOcorrenciasAtivas()) {
                        BigDecimal valorOcorrenciaCorrigida = Utils.arredondarValorMonetario(ocorrenciaVerbas.getDiferencaCorrigida());
                        if (BigDecimal.ZERO.compareTo(valorOcorrenciaCorrigida) != 0) {
                            BigDecimal base = ocorrenciaVerbas.getDiferencaCorrigidaParaCalculoDasIncidencias();
                            Date competencia = HelperDate.getCurrentCompetence(ocorrenciaVerbas.getDataInicial()).getDate();
                            if (Utils.naoNulo(base)) {
                                existeVerbaAnosAnteriores = true;
                            }
                            if (CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)verba.getCaracteristica())) {
                                mesesAnosAnterioresDecimoTerceiro.add(competencia);
                            } else if (Utils.naoNulo(base)) {
                                mesesAnosAnteriores.add(competencia);
                            }
                        }
                        switch (verba.getCaracteristica()) {
                            case DECIMO_TERCEIRO_SALARIO: {
                                existeVerbaDecimoTerceiro = true;
                                break;
                            }
                            case FERIAS: {
                                existeVerbaFerias = true;
                                break;
                            }
                            case AVISO_PREVIO: 
                            case COMUM: {
                                existeDemaisVerbas = true;
                            }
                        }
                    }
                }
                BigDecimal jurosDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal jurosFerias = BigDecimal.ZERO;
                BigDecimal jurosDemaisVerbas = BigDecimal.ZERO;
                BigDecimal jurosAnosAnteriores = BigDecimal.ZERO;
                if (this.irpf.getIncidirSobreJurosDeMora().booleanValue()) {
                    jurosDecimoTerceiro = Utils.arredondarValorMonetario(Utils.multiplicar(juroPagoTotal, proporcoesIrpf.getProporcaoJurosDecimo()));
                    jurosFerias = Utils.arredondarValorMonetario(Utils.multiplicar(juroPagoTotal, proporcoesIrpf.getProporcaoJurosFerias()));
                    jurosDemaisVerbas = Utils.arredondarValorMonetario(Utils.multiplicar(juroPagoTotal, proporcoesIrpf.getProporcaoJurosNormal()));
                    jurosAnosAnteriores = Utils.arredondarValorMonetario(Utils.multiplicar(juroPagoTotal, proporcoesIrpf.getProporcaoAnosAnteriores()));
                }
                BigDecimal descontoContribuicaoSocialDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal descontoContribuicaoSocialFerias = BigDecimal.ZERO;
                BigDecimal descontoContribuicaoSocialDemaisVerbas = BigDecimal.ZERO;
                BigDecimal descontoContribuicaoSocialAnosAnteriores = BigDecimal.ZERO;
                if (this.irpf.getDeduzirContribuicaoSocialDevidaPeloReclamante().booleanValue() && calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue()) {
                    BigDecimal descontoInss = BigDecimal.ZERO;
                    descontoInss = hasPagamentoPrincipal ? debitosDoReclamante.getPagoDescontoInss() : Utils.zerarSeNegativo(debitosDoReclamante.getDiferencaInss());
                    descontoContribuicaoSocialDecimoTerceiro = Utils.arredondarValorMonetario(Utils.multiplicar(descontoInss, proporcoesIrpf.getProporcaoInssDecimo()));
                    descontoContribuicaoSocialFerias = Utils.arredondarValorMonetario(Utils.multiplicar(descontoInss, proporcoesIrpf.getProporcaoInssFerias()));
                    descontoContribuicaoSocialDemaisVerbas = Utils.arredondarValorMonetario(Utils.multiplicar(descontoInss, proporcoesIrpf.getProporcaoInssNormal()));
                    descontoContribuicaoSocialAnosAnteriores = Utils.arredondarValorMonetario(Utils.multiplicar(descontoInss, proporcoesIrpf.getProporcaoAnosAnteriores()));
                }
                BigDecimal descontoPrevidenciaPrivadaDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal descontoPrevidenciaPrivadaFerias = BigDecimal.ZERO;
                BigDecimal descontoPrevidenciaPrivadaDemaisVerbas = BigDecimal.ZERO;
                BigDecimal descontoPrevidenciaPrivadaAnosAnteriores = BigDecimal.ZERO;
                if (this.irpf.getDeduzirPrevidenciaPrivada().booleanValue()) {
                    BigDecimal descontoPrevidenciaPrivada = BigDecimal.ZERO;
                    descontoPrevidenciaPrivada = hasPagamentoPrincipal ? debitosDoReclamante.getPagoPrevidenciaPrivada() : Utils.zerarSeNegativo(debitosDoReclamante.getDiferencaPrevidenciaPrivada());
                    descontoPrevidenciaPrivadaDecimoTerceiro = Utils.arredondarValorMonetario(Utils.multiplicar(descontoPrevidenciaPrivada, proporcoesIrpf.getProporcaoPrevidenciaPrivadaDecimo()));
                    descontoPrevidenciaPrivadaFerias = Utils.arredondarValorMonetario(Utils.multiplicar(descontoPrevidenciaPrivada, proporcoesIrpf.getProporcaoPrevidenciaPrivadaFerias()));
                    descontoPrevidenciaPrivadaDemaisVerbas = Utils.arredondarValorMonetario(Utils.multiplicar(descontoPrevidenciaPrivada, proporcoesIrpf.getProporcaoPrevidenciaPrivadaNormal()));
                    descontoPrevidenciaPrivadaAnosAnteriores = Utils.arredondarValorMonetario(Utils.multiplicar(descontoPrevidenciaPrivada, proporcoesIrpf.getProporcaoAnosAnteriores()));
                }
                BigDecimal descontoPensaoAlimenticiaDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal descontoPensaoAlimenticiaFerias = BigDecimal.ZERO;
                BigDecimal descontoPensaoAlimenticiaDemaisVerbas = BigDecimal.ZERO;
                if (this.irpf.getDeduzirPensaoAlimenticia().booleanValue()) {
                    BigDecimal valorPensaoAlimenticia = BigDecimal.ZERO;
                    PensaoAlimenticiaDaAtualizacao pensaoAlimenticia = debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao();
                    if (pensaoAlimenticia != null) {
                        valorPensaoAlimenticia = hasPagamentoPrincipal ? Utils.somar(pensaoAlimenticia.getPagoPensao(), pensaoAlimenticia.getPagoJuro()) : Utils.zerarSeNegativo(pensaoAlimenticia.getDiferencaPensaoDevidoParaIrpf());
                        valorPensaoAlimenticia = Utils.multiplicar(valorPensaoAlimenticia, pensaoAlimenticia.getPensaoAlimenticia().getProporcaoBaseTributavel());
                        BigDecimal valorDecimoTerceiro = Utils.somar(verbaDecimoTerceiro, jurosDecimoTerceiro, verbaDecimoTerceiro);
                        BigDecimal valorFerias = Utils.somar(verbaFerias, jurosFerias, verbaFerias);
                        BigDecimal valorDemaisVerbas = Utils.somar(verbaDemaisVerbas, jurosDemaisVerbas, verbaDemaisVerbas);
                        BigDecimal denominador = valorDecimoTerceiro.add(valorDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                        denominador = denominador.add(valorFerias, Utils.CONTEXTO_MATEMATICO);
                        if (Utils.naoNulo(valorPensaoAlimenticia) && BigDecimal.ZERO.compareTo(denominador) != 0) {
                            descontoPensaoAlimenticiaDecimoTerceiro = valorPensaoAlimenticia.multiply(valorDecimoTerceiro, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaDecimoTerceiro = descontoPensaoAlimenticiaDecimoTerceiro.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaFerias = valorPensaoAlimenticia.multiply(valorFerias, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaFerias = descontoPensaoAlimenticiaFerias.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaDemaisVerbas = valorPensaoAlimenticia.multiply(valorDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaDemaisVerbas = descontoPensaoAlimenticiaDemaisVerbas.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                        }
                    }
                }
                BigDecimal descontoHonorariosDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal descontoHonorariosFerias = BigDecimal.ZERO;
                BigDecimal descontoHonorariosDemaisVerbas = BigDecimal.ZERO;
                if (this.irpf.getDeduzirHonorariosDevidosPeloReclamante().booleanValue()) {
                    BigDecimal totalDevido = hasPagamentoPrincipal ? creditoDoReclamante.getTotalPago() : creditoDoReclamante.getTotalDiferenca();
                    BigDecimal totalPagoReclamante = BigDecimal.ZERO;
                    Set<HonorarioDaAtualizacao> honorariosCalculados = debitosDoReclamante.getHonorariosDaAtualizacaoCalculado();
                    for (HonorarioDaAtualizacao honorarioDaAtualizacao : honorariosCalculados) {
                        if (hasPagamentoPrincipal) {
                            totalPagoReclamante = Utils.somar(totalPagoReclamante, honorarioDaAtualizacao.getTotalPago(), totalPagoReclamante);
                            continue;
                        }
                        totalPagoReclamante = Utils.somar(totalPagoReclamante, honorarioDaAtualizacao.getDiferencaDevidoPagoHonorarios(), totalPagoReclamante);
                    }
                    Set<HonorarioDaAtualizacao> honorariosInformados = debitosDoReclamante.getHonorariosDaAtualizacaoInformado();
                    for (HonorarioDaAtualizacao honorario : honorariosInformados) {
                        if (hasPagamentoPrincipal) {
                            totalPagoReclamante = Utils.somar(totalPagoReclamante, honorario.getTotalPago(), totalPagoReclamante);
                            continue;
                        }
                        totalPagoReclamante = Utils.somar(totalPagoReclamante, honorario.getDiferencaDevidoPagoHonorarios(), totalPagoReclamante);
                    }
                    if (Utils.naoNulos(totalDevido, totalPagoReclamante) && BigDecimal.ZERO.compareTo(totalDevido) != 0) {
                        BigDecimal bigDecimal = Utils.somar(verbaDecimoTerceiro, jurosDecimoTerceiro, verbaDecimoTerceiro);
                        BigDecimal valorFerias = Utils.somar(verbaFerias, jurosFerias, verbaFerias);
                        BigDecimal valorDemaisVerbas = Utils.somar(verbaDemaisVerbas, jurosDemaisVerbas, verbaDemaisVerbas);
                        BigDecimal fatorDecimo = Utils.dividir(bigDecimal, totalDevido);
                        BigDecimal fatorFerias = Utils.dividir(valorFerias, totalDevido);
                        BigDecimal fatorNormal = Utils.dividir(valorDemaisVerbas, totalDevido);
                        descontoHonorariosDecimoTerceiro = Utils.arredondarValorMonetario(Utils.multiplicar(totalPagoReclamante, fatorDecimo));
                        descontoHonorariosFerias = Utils.arredondarValorMonetario(Utils.multiplicar(totalPagoReclamante, fatorFerias));
                        descontoHonorariosDemaisVerbas = Utils.arredondarValorMonetario(Utils.multiplicar(totalPagoReclamante, fatorNormal));
                    }
                }
                BigDecimal descontoBaseParaDependentes = this.encontrarDescontoParaDependentes();
                BigDecimal descontoBaseParaAposentadoMaiorQue65Anos = this.encontrarDescontoParaAposentadoMaiorQue65Anos();
                BigDecimal verbaNormal = Utils.somar(verbaDecimoTerceiro, verbaFerias);
                verbaNormal = Utils.somar(verbaNormal, verbaDemaisVerbas);
                verbaNormal = Utils.somar(verbaNormal, verbaAnosAnteriores);
                BigDecimal jurosNormal = Utils.somar(jurosDecimoTerceiro, jurosFerias);
                jurosNormal = Utils.somar(jurosNormal, jurosDemaisVerbas);
                jurosNormal = Utils.somar(jurosNormal, jurosAnosAnteriores);
                BigDecimal bigDecimal3 = Utils.somar(descontoContribuicaoSocialDecimoTerceiro, descontoContribuicaoSocialFerias);
                bigDecimal3 = Utils.somar(bigDecimal3, descontoContribuicaoSocialDemaisVerbas);
                bigDecimal3 = Utils.somar(bigDecimal3, descontoContribuicaoSocialAnosAnteriores);
                BigDecimal descontoPrevidenciaPrivadaNormal = Utils.somar(descontoPrevidenciaPrivadaDecimoTerceiro, descontoPrevidenciaPrivadaFerias);
                descontoPrevidenciaPrivadaNormal = Utils.somar(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaDemaisVerbas);
                descontoPrevidenciaPrivadaNormal = Utils.somar(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaAnosAnteriores);
                BigDecimal descontoPensaoAlimenticiaNormal = Utils.somar(descontoPensaoAlimenticiaDecimoTerceiro, descontoPensaoAlimenticiaFerias);
                descontoPensaoAlimenticiaNormal = Utils.somar(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaDemaisVerbas);
                BigDecimal descontoHonorariosNormal = Utils.somar(descontoHonorariosDecimoTerceiro, descontoHonorariosFerias);
                descontoHonorariosNormal = Utils.somar(descontoHonorariosNormal, descontoHonorariosDemaisVerbas);
                if (existeVerbaAnosAnteriores) {
                    BigDecimal proporcao = this.calcularProporcao(creditoDoReclamante, principalCorrigido, pagoPrincipal, juroPagoTotal, juroPrincipal, diferencaJuroPrincipal);
                    BigDecimal mesesAnterioresQuantidade = new BigDecimal(mesesAnosAnteriores.size());
                    BigDecimal bigDecimal4 = new BigDecimal(mesesAnosAnterioresDecimoTerceiro.size());
                    BigDecimal somatorioQuantidadeMesesAnteriores = Utils.somar(mesesAnterioresQuantidade, bigDecimal4);
                    BigDecimal numeroCompetenciasAnteriores = Utils.arredondarValorRegraIRPF(Utils.multiplicar(somatorioQuantidadeMesesAnteriores, proporcao));
                    this.somatorioCompetenciasCorrentes = Utils.somar(this.somatorioCompetenciasCorrentes, numeroCompetenciasAnteriores, this.somatorioCompetenciasCorrentes);
                }
                if (this.irpf.getConsiderarTributacaoEmSeparado().booleanValue() && existeVerbaFerias) {
                    OcorrenciaDeIrpfAtualizacao ocorrenciaTributacaoEmSeparado = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.TRIBUTACAO_EM_SEPARADO);
                    ocorrenciaTributacaoEmSeparado.setHasPagamento(hasPagamentoPrincipal);
                    ocorrenciaTributacaoEmSeparado.setDataOcorrencia(dataEvento);
                    ocorrenciaTributacaoEmSeparado.setDataEvento(dataEvento);
                    ocorrenciaTributacaoEmSeparado.setValorVerbas(verbaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorJuros(jurosFerias);
                    ocorrenciaTributacaoEmSeparado.setValorContribuicaoSocial(descontoContribuicaoSocialFerias);
                    ocorrenciaTributacaoEmSeparado.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorPensaoAlimenticia(descontoPensaoAlimenticiaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorHonorarios(descontoHonorariosFerias);
                    ocorrenciaTributacaoEmSeparado.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaTributacaoEmSeparado.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaTributacaoEmSeparado.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaTributacaoEmSeparado.getValorBase());
                    ocorrenciaTributacaoEmSeparado.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaTributacaoEmSeparado.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaTributacaoEmSeparado.setValorAliquota(faixa.getAliquota());
                    ocorrenciaTributacaoEmSeparado.setValorDeducao(faixa.getDeducao());
                    ocorrenciaTributacaoEmSeparado.atualizaValorDevido();
                    ocorrenciaTributacaoEmSeparado.setIrpf(this.irpf);
                    this.irpf.getOcorrenciasAtualizacao().add(ocorrenciaTributacaoEmSeparado);
                    ocorrenciasDeAtualizacao.add(ocorrenciaTributacaoEmSeparado);
                    verbaNormal = Utils.subtrair(verbaNormal, verbaFerias);
                    jurosNormal = Utils.subtrair(jurosNormal, jurosFerias);
                    BigDecimal bigDecimal5 = Utils.subtrair(bigDecimal3, descontoContribuicaoSocialFerias);
                    descontoPrevidenciaPrivadaNormal = Utils.subtrair(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaFerias);
                    descontoPensaoAlimenticiaNormal = Utils.subtrair(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaFerias);
                    descontoHonorariosNormal = Utils.subtrair(descontoHonorariosNormal, descontoHonorariosFerias);
                } else if (existeVerbaFerias) {
                    existeDemaisVerbas = true;
                }
                if (this.irpf.getConsiderarTributacaoExclusiva().booleanValue() && existeVerbaDecimoTerceiro) {
                    void var45_85;
                    OcorrenciaDeIrpfAtualizacao ocorrenciaTributacaoExclusiva = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.TRIBUTACAO_EXCLUSIVA);
                    ocorrenciaTributacaoExclusiva.setHasPagamento(hasPagamentoPrincipal);
                    ocorrenciaTributacaoExclusiva.setDataOcorrencia(dataEvento);
                    ocorrenciaTributacaoExclusiva.setDataEvento(dataEvento);
                    ocorrenciaTributacaoExclusiva.setValorVerbas(verbaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorJuros(jurosDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorContribuicaoSocial(descontoContribuicaoSocialDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorPensaoAlimenticia(descontoPensaoAlimenticiaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorHonorarios(descontoHonorariosDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaTributacaoExclusiva.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaTributacaoExclusiva.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaTributacaoExclusiva.getValorBase());
                    ocorrenciaTributacaoExclusiva.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaTributacaoExclusiva.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaTributacaoExclusiva.setValorAliquota(faixa.getAliquota());
                    ocorrenciaTributacaoExclusiva.setValorDeducao(faixa.getDeducao());
                    ocorrenciaTributacaoExclusiva.atualizaValorDevido();
                    ocorrenciaTributacaoExclusiva.setIrpf(this.irpf);
                    this.irpf.getOcorrenciasAtualizacao().add(ocorrenciaTributacaoExclusiva);
                    ocorrenciasDeAtualizacao.add(ocorrenciaTributacaoExclusiva);
                    verbaNormal = Utils.subtrair(verbaNormal, verbaDecimoTerceiro);
                    jurosNormal = Utils.subtrair(jurosNormal, jurosDecimoTerceiro);
                    BigDecimal bigDecimal6 = Utils.subtrair((BigDecimal)var45_85, descontoContribuicaoSocialDecimoTerceiro);
                    descontoPrevidenciaPrivadaNormal = Utils.subtrair(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaDecimoTerceiro);
                    descontoPensaoAlimenticiaNormal = Utils.subtrair(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaDecimoTerceiro);
                    descontoHonorariosNormal = Utils.subtrair(descontoHonorariosNormal, descontoHonorariosDecimoTerceiro);
                } else if (existeVerbaDecimoTerceiro) {
                    existeDemaisVerbas = true;
                }
                if (existeDemaisVerbas) {
                    void var45_87;
                    OcorrenciaDeIrpfAtualizacao ocorrenciaNormal = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.NORMAL);
                    ocorrenciaNormal.setHasPagamento(hasPagamentoPrincipal);
                    ocorrenciaNormal.setDataOcorrencia(dataEvento);
                    ocorrenciaNormal.setDataEvento(dataEvento);
                    ocorrenciaNormal.setValorVerbas(verbaNormal);
                    ocorrenciaNormal.setValorJuros(jurosNormal);
                    ocorrenciaNormal.setValorContribuicaoSocial((BigDecimal)var45_87);
                    ocorrenciaNormal.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaNormal);
                    ocorrenciaNormal.setValorPensaoAlimenticia(descontoPensaoAlimenticiaNormal);
                    ocorrenciaNormal.setValorHonorarios(descontoHonorariosNormal);
                    ocorrenciaNormal.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaNormal.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaNormal.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaNormal.getValorBase());
                    ocorrenciaNormal.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaNormal.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaNormal.setValorAliquota(faixa.getAliquota());
                    ocorrenciaNormal.setValorDeducao(faixa.getDeducao());
                    ocorrenciaNormal.atualizaValorDevido();
                    ocorrenciaNormal.setIrpf(this.irpf);
                    this.irpf.getOcorrenciasAtualizacao().add(ocorrenciaNormal);
                    ocorrenciasDeAtualizacao.add(ocorrenciaNormal);
                }
            } else {
                FaixaFiscal faixa;
                void var45_91;
                boolean somenteVerbaAnosAnteriores = false;
                boolean existeVerbaAnosAnteriores = false;
                boolean existeVerbaDecimoTerceiro = false;
                boolean existeVerbaFerias = false;
                boolean existeDemaisVerbas = false;
                HelperDate dataLimiteAnosAnteriores = HelperDate.getInstance(dataEvento);
                dataLimiteAnosAnteriores.setMonth(0);
                dataLimiteAnosAnteriores.setDay(1);
                HashSet<Date> mesesAnosAnteriores = new HashSet<Date>();
                HashSet<Date> mesesAnosAnterioresDecimoTerceiro = new HashSet<Date>();
                HashSet<Date> mesesCorrentes = new HashSet<Date>();
                HashSet<Date> mesesCorrentesDecimoTerceiro = new HashSet<Date>();
                for (VerbaDeCalculo verba : calculo.getVerbasAtivas()) {
                    if (!verba.getIncidenciaIRPF().booleanValue()) continue;
                    for (OcorrenciaDeVerba ocorrenciaVerbas : verba.getOcorrenciasAtivas()) {
                        BigDecimal valorOcorrenciaCorrigida = Utils.arredondarValorMonetario(ocorrenciaVerbas.getDiferencaCorrigida());
                        BigDecimal base = ocorrenciaVerbas.getDiferencaCorrigidaParaCalculoDasIncidencias();
                        Date competencia = HelperDate.getCurrentCompetence(ocorrenciaVerbas.getDataInicial()).getDate();
                        if (HelperDate.dateBefore(ocorrenciaVerbas.getDataInicial(), dataLimiteAnosAnteriores.getDate())) {
                            if (BigDecimal.ZERO.compareTo(valorOcorrenciaCorrigida) == 0) continue;
                            if (Utils.naoNulo(base)) {
                                existeVerbaAnosAnteriores = true;
                            }
                            if (CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)verba.getCaracteristica())) {
                                mesesAnosAnterioresDecimoTerceiro.add(competencia);
                                continue;
                            }
                            if (!Utils.naoNulo(base)) continue;
                            mesesAnosAnteriores.add(competencia);
                            continue;
                        }
                        switch (verba.getCaracteristica()) {
                            case DECIMO_TERCEIRO_SALARIO: {
                                mesesCorrentesDecimoTerceiro.add(competencia);
                                existeVerbaDecimoTerceiro = true;
                                break;
                            }
                            case FERIAS: {
                                existeVerbaFerias = true;
                                if (!Utils.naoNulo(base)) break;
                                mesesCorrentes.add(competencia);
                                break;
                            }
                            case AVISO_PREVIO: 
                            case COMUM: {
                                if (Utils.naoNulo(base)) {
                                    mesesCorrentes.add(competencia);
                                }
                                existeDemaisVerbas = true;
                            }
                        }
                    }
                }
                if (existeVerbaAnosAnteriores && !existeDemaisVerbas && !existeVerbaDecimoTerceiro && !existeVerbaFerias) {
                    somenteVerbaAnosAnteriores = true;
                }
                BigDecimal verbaAnosAnteriores = Utils.arredondarValorMonetario(Utils.multiplicar(pagoPrincipal, proporcoesIrpf.getProporcaoAnosAnteriores()));
                BigDecimal verbaDecimoTerceiro = Utils.arredondarValorMonetario(Utils.multiplicar(pagoPrincipal, proporcoesIrpf.getProporcaoDecimo()));
                BigDecimal verbaFerias = Utils.arredondarValorMonetario(Utils.multiplicar(pagoPrincipal, proporcoesIrpf.getProporcaoFerias()));
                BigDecimal verbaDemaisVerbas = Utils.arredondarValorMonetario(Utils.multiplicar(pagoPrincipal, proporcoesIrpf.getProporcaoNormal()));
                if (somenteVerbaAnosAnteriores) {
                    verbaAnosAnteriores = Utils.somar(verbaAnosAnteriores, verbaDecimoTerceiro, verbaAnosAnteriores);
                    verbaAnosAnteriores = Utils.somar(verbaAnosAnteriores, verbaFerias, verbaAnosAnteriores);
                    verbaAnosAnteriores = Utils.somar(verbaAnosAnteriores, verbaDemaisVerbas, verbaAnosAnteriores);
                }
                BigDecimal jurosAnosAnteriores = BigDecimal.ZERO;
                BigDecimal jurosDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal jurosFerias = BigDecimal.ZERO;
                BigDecimal jurosDemaisVerbas = BigDecimal.ZERO;
                if (this.irpf.getIncidirSobreJurosDeMora().booleanValue()) {
                    jurosAnosAnteriores = Utils.arredondarValorMonetario(Utils.multiplicar(juroPagoTotal, proporcoesIrpf.getProporcaoJurosAnosAnteriores()));
                    jurosDecimoTerceiro = Utils.arredondarValorMonetario(Utils.multiplicar(juroPagoTotal, proporcoesIrpf.getProporcaoJurosDecimo()));
                    jurosFerias = Utils.arredondarValorMonetario(Utils.multiplicar(juroPagoTotal, proporcoesIrpf.getProporcaoJurosFerias()));
                    jurosDemaisVerbas = Utils.arredondarValorMonetario(Utils.multiplicar(juroPagoTotal, proporcoesIrpf.getProporcaoJurosNormal()));
                    if (somenteVerbaAnosAnteriores) {
                        jurosAnosAnteriores = Utils.somar(jurosAnosAnteriores, jurosDecimoTerceiro, jurosAnosAnteriores);
                        jurosAnosAnteriores = Utils.somar(jurosAnosAnteriores, jurosFerias, jurosAnosAnteriores);
                        jurosAnosAnteriores = Utils.somar(jurosAnosAnteriores, jurosDemaisVerbas, jurosAnosAnteriores);
                    }
                }
                BigDecimal descontoContribuicaoSocialAnosAnteriores = BigDecimal.ZERO;
                BigDecimal descontoContribuicaoSocialDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal descontoContribuicaoSocialFerias = BigDecimal.ZERO;
                BigDecimal descontoContribuicaoSocialDemaisVerbas = BigDecimal.ZERO;
                if (this.irpf.getDeduzirContribuicaoSocialDevidaPeloReclamante().booleanValue() && calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue()) {
                    BigDecimal descontoInss = BigDecimal.ZERO;
                    descontoInss = hasPagamentoPrincipal ? debitosDoReclamante.getPagoDescontoInss() : Utils.zerarSeNegativo(debitosDoReclamante.getDiferencaInss());
                    descontoContribuicaoSocialAnosAnteriores = Utils.arredondarValorMonetario(Utils.multiplicar(descontoInss, proporcoesIrpf.getProporcaoInssAnosAnteriores()));
                    descontoContribuicaoSocialDecimoTerceiro = Utils.arredondarValorMonetario(Utils.multiplicar(descontoInss, proporcoesIrpf.getProporcaoInssDecimo()));
                    descontoContribuicaoSocialFerias = Utils.arredondarValorMonetario(Utils.multiplicar(descontoInss, proporcoesIrpf.getProporcaoInssFerias()));
                    descontoContribuicaoSocialDemaisVerbas = Utils.arredondarValorMonetario(Utils.multiplicar(descontoInss, proporcoesIrpf.getProporcaoInssNormal()));
                    if (somenteVerbaAnosAnteriores) {
                        descontoContribuicaoSocialAnosAnteriores = Utils.somar(descontoContribuicaoSocialAnosAnteriores, descontoContribuicaoSocialDecimoTerceiro, descontoContribuicaoSocialAnosAnteriores);
                        descontoContribuicaoSocialAnosAnteriores = Utils.somar(descontoContribuicaoSocialAnosAnteriores, descontoContribuicaoSocialFerias, descontoContribuicaoSocialAnosAnteriores);
                        descontoContribuicaoSocialAnosAnteriores = Utils.somar(descontoContribuicaoSocialAnosAnteriores, descontoContribuicaoSocialDemaisVerbas, descontoContribuicaoSocialAnosAnteriores);
                    }
                }
                BigDecimal descontoPrevidenciaPrivadaAnosAnteriores = BigDecimal.ZERO;
                BigDecimal descontoPrevidenciaPrivadaDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal descontoPrevidenciaPrivadaFerias = BigDecimal.ZERO;
                BigDecimal descontoPrevidenciaPrivadaDemaisVerbas = BigDecimal.ZERO;
                if (this.irpf.getDeduzirPrevidenciaPrivada().booleanValue()) {
                    BigDecimal descontoPrevidenciaPrivada = BigDecimal.ZERO;
                    descontoPrevidenciaPrivada = hasPagamentoPrincipal ? debitosDoReclamante.getPagoPrevidenciaPrivada() : Utils.zerarSeNegativo(debitosDoReclamante.getDiferencaPrevidenciaPrivada());
                    descontoPrevidenciaPrivadaAnosAnteriores = Utils.arredondarValorMonetario(Utils.multiplicar(descontoPrevidenciaPrivada, proporcoesIrpf.getProporcaoPrevidenciaPrivadaAnosAnteriores(), BigDecimal.ZERO));
                    descontoPrevidenciaPrivadaDecimoTerceiro = Utils.arredondarValorMonetario(Utils.multiplicar(descontoPrevidenciaPrivada, proporcoesIrpf.getProporcaoPrevidenciaPrivadaDecimo(), BigDecimal.ZERO));
                    descontoPrevidenciaPrivadaFerias = Utils.arredondarValorMonetario(Utils.multiplicar(descontoPrevidenciaPrivada, proporcoesIrpf.getProporcaoPrevidenciaPrivadaFerias(), BigDecimal.ZERO));
                    descontoPrevidenciaPrivadaDemaisVerbas = Utils.arredondarValorMonetario(Utils.multiplicar(descontoPrevidenciaPrivada, proporcoesIrpf.getProporcaoPrevidenciaPrivadaNormal(), BigDecimal.ZERO));
                    if (somenteVerbaAnosAnteriores) {
                        descontoPrevidenciaPrivadaAnosAnteriores = Utils.somar(descontoPrevidenciaPrivadaAnosAnteriores, descontoPrevidenciaPrivadaDecimoTerceiro, descontoPrevidenciaPrivadaAnosAnteriores);
                        descontoPrevidenciaPrivadaAnosAnteriores = Utils.somar(descontoPrevidenciaPrivadaAnosAnteriores, descontoPrevidenciaPrivadaFerias, descontoPrevidenciaPrivadaAnosAnteriores);
                        descontoPrevidenciaPrivadaAnosAnteriores = Utils.somar(descontoPrevidenciaPrivadaAnosAnteriores, descontoPrevidenciaPrivadaDemaisVerbas, descontoPrevidenciaPrivadaAnosAnteriores);
                    }
                }
                BigDecimal descontoPensaoAlimenticiaAnosAnteriores = BigDecimal.ZERO;
                BigDecimal descontoPensaoAlimenticiaDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal descontoPensaoAlimenticiaFerias = BigDecimal.ZERO;
                BigDecimal descontoPensaoAlimenticiaDemaisVerbas = BigDecimal.ZERO;
                if (this.irpf.getDeduzirPensaoAlimenticia().booleanValue()) {
                    BigDecimal valorPensaoAlimenticia = BigDecimal.ZERO;
                    PensaoAlimenticiaDaAtualizacao pensaoAlimenticia = debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao();
                    if (pensaoAlimenticia != null) {
                        valorPensaoAlimenticia = hasPagamentoPrincipal ? Utils.somar(pensaoAlimenticia.getPagoPensao(), pensaoAlimenticia.getPagoJuro()) : Utils.zerarSeNegativo(pensaoAlimenticia.getDiferencaPensaoDevidoParaIrpf());
                        valorPensaoAlimenticia = Utils.multiplicar(valorPensaoAlimenticia, pensaoAlimenticia.getPensaoAlimenticia().getProporcaoBaseTributavel());
                        BigDecimal bigDecimal = Utils.somar(verbaAnosAnteriores, jurosAnosAnteriores, verbaAnosAnteriores);
                        BigDecimal valorDecimoTerceiro = Utils.somar(verbaDecimoTerceiro, jurosDecimoTerceiro, verbaDecimoTerceiro);
                        BigDecimal valorFerias = Utils.somar(verbaFerias, jurosFerias, verbaFerias);
                        BigDecimal valorDemaisVerbas = Utils.somar(verbaDemaisVerbas, jurosDemaisVerbas, verbaDemaisVerbas);
                        BigDecimal denominador = valorDecimoTerceiro.add(valorDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                        denominador = denominador.add(valorFerias, Utils.CONTEXTO_MATEMATICO);
                        denominador = denominador.add(bigDecimal, Utils.CONTEXTO_MATEMATICO);
                        if (Utils.naoNulo(valorPensaoAlimenticia) && BigDecimal.ZERO.compareTo(denominador) != 0) {
                            descontoPensaoAlimenticiaAnosAnteriores = valorPensaoAlimenticia.multiply(bigDecimal, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaAnosAnteriores = descontoPensaoAlimenticiaAnosAnteriores.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaDecimoTerceiro = valorPensaoAlimenticia.multiply(valorDecimoTerceiro, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaDecimoTerceiro = descontoPensaoAlimenticiaDecimoTerceiro.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaFerias = valorPensaoAlimenticia.multiply(valorFerias, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaFerias = descontoPensaoAlimenticiaFerias.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaDemaisVerbas = valorPensaoAlimenticia.multiply(valorDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaDemaisVerbas = descontoPensaoAlimenticiaDemaisVerbas.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                            if (somenteVerbaAnosAnteriores) {
                                descontoPensaoAlimenticiaAnosAnteriores = Utils.somar(descontoPensaoAlimenticiaAnosAnteriores, descontoPensaoAlimenticiaDecimoTerceiro, descontoPensaoAlimenticiaAnosAnteriores);
                                descontoPensaoAlimenticiaAnosAnteriores = Utils.somar(descontoPensaoAlimenticiaAnosAnteriores, descontoPensaoAlimenticiaFerias, descontoPensaoAlimenticiaAnosAnteriores);
                                descontoPensaoAlimenticiaAnosAnteriores = Utils.somar(descontoPensaoAlimenticiaAnosAnteriores, descontoPensaoAlimenticiaDemaisVerbas, descontoPensaoAlimenticiaAnosAnteriores);
                            }
                        }
                    }
                }
                BigDecimal descontoHonorariosAnosAnteriores = BigDecimal.ZERO;
                BigDecimal descontoHonorariosDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal bigDecimal = BigDecimal.ZERO;
                BigDecimal descontoHonorariosDemaisVerbas = BigDecimal.ZERO;
                if (this.irpf.getDeduzirHonorariosDevidosPeloReclamante().booleanValue()) {
                    BigDecimal totalDevido = hasPagamentoPrincipal ? creditoDoReclamante.getTotalPago() : creditoDoReclamante.getTotalDiferenca();
                    BigDecimal totalPagoReclamante = BigDecimal.ZERO;
                    Set<HonorarioDaAtualizacao> honorariosCalculados = debitosDoReclamante.getHonorariosDaAtualizacaoCalculado();
                    for (HonorarioDaAtualizacao honorarioDaAtualizacao : honorariosCalculados) {
                        if (hasPagamentoPrincipal) {
                            totalPagoReclamante = Utils.somar(totalPagoReclamante, honorarioDaAtualizacao.getTotalPago(), totalPagoReclamante);
                            continue;
                        }
                        totalPagoReclamante = Utils.somar(totalPagoReclamante, honorarioDaAtualizacao.getDiferencaDevidoPagoHonorarios(), totalPagoReclamante);
                    }
                    Set<HonorarioDaAtualizacao> honorariosInformados = debitosDoReclamante.getHonorariosDaAtualizacaoInformado();
                    for (HonorarioDaAtualizacao honorario : honorariosInformados) {
                        if (hasPagamentoPrincipal) {
                            totalPagoReclamante = Utils.somar(totalPagoReclamante, honorario.getTotalPago(), totalPagoReclamante);
                            continue;
                        }
                        totalPagoReclamante = Utils.somar(totalPagoReclamante, honorario.getDiferencaDevidoPagoHonorarios(), totalPagoReclamante);
                    }
                    if (Utils.naoNulos(totalDevido, totalPagoReclamante) && BigDecimal.ZERO.compareTo(totalDevido) != 0) {
                        BigDecimal bigDecimal7 = Utils.somar(verbaAnosAnteriores, jurosAnosAnteriores, verbaAnosAnteriores);
                        BigDecimal valorDecimoTerceiro = Utils.somar(verbaDecimoTerceiro, jurosDecimoTerceiro, verbaDecimoTerceiro);
                        BigDecimal valorFerias = Utils.somar(verbaFerias, jurosFerias, verbaFerias);
                        BigDecimal valorDemaisVerbas = Utils.somar(verbaDemaisVerbas, jurosDemaisVerbas, verbaDemaisVerbas);
                        BigDecimal fatorAnosAnteriores = Utils.dividir(bigDecimal7, totalDevido);
                        BigDecimal fatorDecimo = Utils.dividir(valorDecimoTerceiro, totalDevido);
                        BigDecimal fatorFerias = Utils.dividir(valorFerias, totalDevido);
                        BigDecimal fatorNormal = Utils.dividir(valorDemaisVerbas, totalDevido);
                        descontoHonorariosAnosAnteriores = Utils.arredondarValorMonetario(Utils.multiplicar(totalPagoReclamante, fatorAnosAnteriores));
                        descontoHonorariosDecimoTerceiro = Utils.arredondarValorMonetario(Utils.multiplicar(totalPagoReclamante, fatorDecimo));
                        BigDecimal bigDecimal8 = Utils.arredondarValorMonetario(Utils.multiplicar(totalPagoReclamante, fatorFerias));
                        descontoHonorariosDemaisVerbas = Utils.arredondarValorMonetario(Utils.multiplicar(totalPagoReclamante, fatorNormal));
                    }
                }
                BigDecimal descontoBaseParaDependentes = this.encontrarDescontoParaDependentes();
                BigDecimal descontoBaseParaAposentadoMaiorQue65Anos = this.encontrarDescontoParaAposentadoMaiorQue65Anos();
                BigDecimal proporcao = this.calcularProporcao(creditoDoReclamante, principalCorrigido, pagoPrincipal, juroPagoTotal, juroPrincipal, diferencaJuroPrincipal);
                BigDecimal mesesAnterioresQuantidade = new BigDecimal(mesesAnosAnteriores.size());
                BigDecimal bigDecimal9 = new BigDecimal(mesesAnosAnterioresDecimoTerceiro.size());
                BigDecimal somatorioQuantidadeMesesAnteriores = Utils.somar(mesesAnterioresQuantidade, bigDecimal9);
                BigDecimal mesesCorrentesQuantidade = new BigDecimal(mesesCorrentes.size());
                BigDecimal mesesCorrentesDecimoTerceiroQuantidade = new BigDecimal(mesesCorrentesDecimoTerceiro.size());
                BigDecimal somatorioQuantidadeMesesCorrentes = Utils.somar(mesesCorrentesQuantidade, mesesCorrentesDecimoTerceiroQuantidade);
                BigDecimal numeroCompetenciasAnteriores = Utils.arredondarValorRegraIRPF(Utils.multiplicar(somatorioQuantidadeMesesAnteriores, proporcao));
                BigDecimal numeroCompetenciasCorrentes = Utils.arredondarValorRegraIRPF(Utils.multiplicar(somatorioQuantidadeMesesCorrentes, proporcao));
                this.somatorioCompetenciasCorrentes = Utils.somar(this.somatorioCompetenciasCorrentes, numeroCompetenciasCorrentes, this.somatorioCompetenciasCorrentes);
                if (BigDecimal.ZERO.compareTo(numeroCompetenciasAnteriores) != 0 && existeVerbaAnosAnteriores) {
                    OcorrenciaDeIrpfAtualizacao ocorrenciaAnosAnteriores = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.RRA_ANOS_ANTERIORES);
                    ocorrenciaAnosAnteriores.setHasPagamento(hasPagamentoPrincipal);
                    ocorrenciaAnosAnteriores.setDataOcorrencia(dataEvento);
                    ocorrenciaAnosAnteriores.setDataEvento(dataEvento);
                    ocorrenciaAnosAnteriores.setValorVerbas(verbaAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorJuros(jurosAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorContribuicaoSocial(descontoContribuicaoSocialAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorPensaoAlimenticia(descontoPensaoAlimenticiaAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorHonorarios(descontoHonorariosAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorDependentes(Utils.naoNulo(descontoBaseParaDependentes) ? descontoBaseParaDependentes.multiply(numeroCompetenciasAnteriores, Utils.CONTEXTO_MATEMATICO) : null);
                    ocorrenciaAnosAnteriores.setValorAposentadoMaiorQue65(Utils.naoNulo(descontoBaseParaAposentadoMaiorQue65Anos) ? descontoBaseParaAposentadoMaiorQue65Anos.multiply(numeroCompetenciasAnteriores, Utils.CONTEXTO_MATEMATICO) : null);
                    if (hasPagamentoPrincipal) {
                        ocorrenciaAnosAnteriores.setQuantidadeCompetencias(numeroCompetenciasAnteriores);
                    } else {
                        BigDecimal quantidadeCompetenciasAnterioresAoSaldo = OcorrenciaDeIrpfAtualizacao.somaQuantidadeCompetenciasAteOSaldo(calculo.getIrpf());
                        quantidadeCompetenciasAnterioresAoSaldo = Utils.somar(this.somatorioCompetenciasCorrentes, quantidadeCompetenciasAnterioresAoSaldo);
                        BigDecimal somatorioCompetenciasTotal = Utils.somar(somatorioQuantidadeMesesAnteriores, somatorioQuantidadeMesesCorrentes);
                        ocorrenciaAnosAnteriores.setQuantidadeCompetencias(Utils.subtrair(somatorioCompetenciasTotal, quantidadeCompetenciasAnterioresAoSaldo));
                        this.somatorioCompetenciasCorrentes = BigDecimal.ZERO;
                    }
                    ocorrenciaAnosAnteriores.atualizaBase();
                    this.preencherFaixaFiscal(ocorrenciaAnosAnteriores);
                    ocorrenciaAnosAnteriores.setIrpf(this.irpf);
                    this.irpf.getOcorrenciasAtualizacao().add(ocorrenciaAnosAnteriores);
                    ocorrenciasDeAtualizacao.add(ocorrenciaAnosAnteriores);
                }
                BigDecimal verbaNormal = Utils.somar(verbaDecimoTerceiro, verbaFerias);
                verbaNormal = Utils.somar(verbaNormal, verbaDemaisVerbas);
                BigDecimal jurosNormal = Utils.somar(jurosDecimoTerceiro, jurosFerias);
                jurosNormal = Utils.somar(jurosNormal, jurosDemaisVerbas);
                BigDecimal descontoContribuicaoSocialNormal = Utils.somar(descontoContribuicaoSocialDecimoTerceiro, descontoContribuicaoSocialFerias);
                descontoContribuicaoSocialNormal = Utils.somar(descontoContribuicaoSocialNormal, descontoContribuicaoSocialDemaisVerbas);
                BigDecimal descontoPrevidenciaPrivadaNormal = Utils.somar(descontoPrevidenciaPrivadaDecimoTerceiro, descontoPrevidenciaPrivadaFerias);
                descontoPrevidenciaPrivadaNormal = Utils.somar(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaDemaisVerbas);
                BigDecimal descontoPensaoAlimenticiaNormal = Utils.somar(descontoPensaoAlimenticiaDecimoTerceiro, descontoPensaoAlimenticiaFerias);
                descontoPensaoAlimenticiaNormal = Utils.somar(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaDemaisVerbas);
                BigDecimal descontoHonorariosNormal = Utils.somar(descontoHonorariosDecimoTerceiro, (BigDecimal)var45_91);
                descontoHonorariosNormal = Utils.somar(descontoHonorariosNormal, descontoHonorariosDemaisVerbas);
                if (this.irpf.getConsiderarTributacaoEmSeparado().booleanValue() && existeVerbaFerias) {
                    OcorrenciaDeIrpfAtualizacao ocorrenciaTributacaoEmSeparado = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.TRIBUTACAO_EM_SEPARADO);
                    ocorrenciaTributacaoEmSeparado.setHasPagamento(hasPagamentoPrincipal);
                    ocorrenciaTributacaoEmSeparado.setDataOcorrencia(dataEvento);
                    ocorrenciaTributacaoEmSeparado.setDataEvento(dataEvento);
                    ocorrenciaTributacaoEmSeparado.setValorVerbas(verbaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorJuros(jurosFerias);
                    ocorrenciaTributacaoEmSeparado.setValorContribuicaoSocial(descontoContribuicaoSocialFerias);
                    ocorrenciaTributacaoEmSeparado.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorPensaoAlimenticia(descontoPensaoAlimenticiaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorHonorarios((BigDecimal)var45_91);
                    ocorrenciaTributacaoEmSeparado.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaTributacaoEmSeparado.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaTributacaoEmSeparado.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaTributacaoEmSeparado.getValorBase());
                    ocorrenciaTributacaoEmSeparado.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaTributacaoEmSeparado.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaTributacaoEmSeparado.setValorAliquota(faixa.getAliquota());
                    ocorrenciaTributacaoEmSeparado.setValorDeducao(faixa.getDeducao());
                    ocorrenciaTributacaoEmSeparado.atualizaValorDevido();
                    ocorrenciaTributacaoEmSeparado.setIrpf(this.irpf);
                    this.irpf.getOcorrenciasAtualizacao().add(ocorrenciaTributacaoEmSeparado);
                    ocorrenciasDeAtualizacao.add(ocorrenciaTributacaoEmSeparado);
                    verbaNormal = Utils.subtrair(verbaNormal, verbaFerias);
                    jurosNormal = Utils.subtrair(jurosNormal, jurosFerias);
                    descontoContribuicaoSocialNormal = Utils.subtrair(descontoContribuicaoSocialNormal, descontoContribuicaoSocialFerias);
                    descontoPrevidenciaPrivadaNormal = Utils.subtrair(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaFerias);
                    descontoPensaoAlimenticiaNormal = Utils.subtrair(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaFerias);
                    descontoHonorariosNormal = Utils.subtrair(descontoHonorariosNormal, (BigDecimal)var45_91);
                } else if (existeVerbaFerias) {
                    existeDemaisVerbas = true;
                }
                if (this.irpf.getConsiderarTributacaoExclusiva().booleanValue() && existeVerbaDecimoTerceiro) {
                    OcorrenciaDeIrpfAtualizacao ocorrenciaTributacaoExclusiva = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.TRIBUTACAO_EXCLUSIVA);
                    ocorrenciaTributacaoExclusiva.setHasPagamento(hasPagamentoPrincipal);
                    ocorrenciaTributacaoExclusiva.setDataOcorrencia(dataEvento);
                    ocorrenciaTributacaoExclusiva.setDataEvento(dataEvento);
                    ocorrenciaTributacaoExclusiva.setValorVerbas(verbaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorJuros(jurosDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorContribuicaoSocial(descontoContribuicaoSocialDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorPensaoAlimenticia(descontoPensaoAlimenticiaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorHonorarios(descontoHonorariosDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaTributacaoExclusiva.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaTributacaoExclusiva.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaTributacaoExclusiva.getValorBase());
                    ocorrenciaTributacaoExclusiva.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaTributacaoExclusiva.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaTributacaoExclusiva.setValorAliquota(faixa.getAliquota());
                    ocorrenciaTributacaoExclusiva.setValorDeducao(faixa.getDeducao());
                    ocorrenciaTributacaoExclusiva.atualizaValorDevido();
                    ocorrenciaTributacaoExclusiva.setIrpf(this.irpf);
                    this.irpf.getOcorrenciasAtualizacao().add(ocorrenciaTributacaoExclusiva);
                    ocorrenciasDeAtualizacao.add(ocorrenciaTributacaoExclusiva);
                    verbaNormal = Utils.subtrair(verbaNormal, verbaDecimoTerceiro);
                    jurosNormal = Utils.subtrair(jurosNormal, jurosDecimoTerceiro);
                    descontoContribuicaoSocialNormal = Utils.subtrair(descontoContribuicaoSocialNormal, descontoContribuicaoSocialDecimoTerceiro);
                    descontoPrevidenciaPrivadaNormal = Utils.subtrair(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaDecimoTerceiro);
                    descontoPensaoAlimenticiaNormal = Utils.subtrair(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaDecimoTerceiro);
                    descontoHonorariosNormal = Utils.subtrair(descontoHonorariosNormal, descontoHonorariosDecimoTerceiro);
                } else if (existeVerbaDecimoTerceiro) {
                    existeDemaisVerbas = true;
                }
                if (existeDemaisVerbas) {
                    OcorrenciaDeIrpfAtualizacao ocorrenciaNormal = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.NORMAL);
                    ocorrenciaNormal.setHasPagamento(hasPagamentoPrincipal);
                    ocorrenciaNormal.setDataOcorrencia(dataEvento);
                    ocorrenciaNormal.setDataEvento(dataEvento);
                    ocorrenciaNormal.setValorVerbas(verbaNormal);
                    ocorrenciaNormal.setValorJuros(jurosNormal);
                    ocorrenciaNormal.setValorContribuicaoSocial(descontoContribuicaoSocialNormal);
                    ocorrenciaNormal.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaNormal);
                    ocorrenciaNormal.setValorPensaoAlimenticia(descontoPensaoAlimenticiaNormal);
                    ocorrenciaNormal.setValorHonorarios(descontoHonorariosNormal);
                    ocorrenciaNormal.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaNormal.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaNormal.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaNormal.getValorBase());
                    ocorrenciaNormal.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaNormal.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaNormal.setValorAliquota(faixa.getAliquota());
                    ocorrenciaNormal.setValorDeducao(faixa.getDeducao());
                    ocorrenciaNormal.atualizaValorDevido();
                    ocorrenciaNormal.setIrpf(this.irpf);
                    this.irpf.getOcorrenciasAtualizacao().add(ocorrenciaNormal);
                    ocorrenciasDeAtualizacao.add(ocorrenciaNormal);
                }
            }
            EntidadeBase.salvar(ocorrenciasDeAtualizacao);
        }
    }

    private BigDecimal encontrarDescontoParaAposentadoMaiorQue65Anos() {
        BigDecimal descontoBaseParaAposentadoMaiorQue65Anos = BigDecimal.ZERO;
        if (this.irpf.getAposentadoMaiorQue65Anos().booleanValue()) {
            descontoBaseParaAposentadoMaiorQue65Anos = this.tabelaImpostoRenda.getValorDeducaoParaAposentadoMaiorQue65Anos();
            descontoBaseParaAposentadoMaiorQue65Anos = Utils.nulo(descontoBaseParaAposentadoMaiorQue65Anos) ? BigDecimal.ZERO : descontoBaseParaAposentadoMaiorQue65Anos;
        }
        return descontoBaseParaAposentadoMaiorQue65Anos;
    }

    private BigDecimal encontrarDescontoParaDependentes() {
        BigDecimal descontoBaseParaDependentes = BigDecimal.ZERO;
        if (this.irpf.getPossuiDependentes().booleanValue()) {
            descontoBaseParaDependentes = this.tabelaImpostoRenda.getValorDeducaoPorDependente().multiply(new BigDecimal(this.irpf.getQuantidadeDependentes()), Utils.CONTEXTO_MATEMATICO);
            descontoBaseParaDependentes = Utils.nulo(descontoBaseParaDependentes) ? BigDecimal.ZERO : descontoBaseParaDependentes;
        }
        return descontoBaseParaDependentes;
    }

    private BigDecimal calcularProporcao(CreditosDoReclamante creditoDoReclamante, BigDecimal principalCorrigido, BigDecimal pagoPrincipal, BigDecimal juroPagoTotal, BigDecimal juroPrincipal, BigDecimal diferencaJuroPrincipal) {
        BigDecimal proporcao = null;
        if (this.valoresAnteriores.isEmpty()) {
            if (this.irpf.getIncidirSobreJurosDeMora().booleanValue()) {
                proporcao = Utils.dividir(pagoPrincipal.add(juroPagoTotal), principalCorrigido.add(juroPrincipal));
                this.valoresAnteriores.add(new ValoresCreditoReclamanteAnterior(pagoPrincipal.add(juroPagoTotal), creditoDoReclamante.getDiferencaPrincipal().add(diferencaJuroPrincipal), creditoDoReclamante.getDataFinalPeriodo()));
            } else {
                proporcao = Utils.dividir(pagoPrincipal, principalCorrigido);
                this.valoresAnteriores.add(new ValoresCreditoReclamanteAnterior(pagoPrincipal, creditoDoReclamante.getDiferencaPrincipal(), creditoDoReclamante.getDataFinalPeriodo()));
            }
        } else {
            BigDecimal base = principalCorrigido;
            BigDecimal diferencaPrincipalDaUltimaPassada = this.valoresAnteriores.get(this.valoresAnteriores.size() - 1).getDiferencaPrincipalAnterior();
            for (int i = this.valoresAnteriores.size() - 1; i >= 0; --i) {
                ValoresCreditoReclamanteAnterior v = this.valoresAnteriores.get(i);
                if (HelperDate.dateEquals(creditoDoReclamante.getDataFinalPeriodo(), v.getDataAnterior())) continue;
                BigDecimal pagoAnteriorCorrigido = BigDecimal.ZERO;
                pagoAnteriorCorrigido = this.irpf.getIncidirSobreJurosDeMora() != false ? Utils.multiplicar(v.getPagoAnterior(), principalCorrigido.add(juroPrincipal)) : Utils.multiplicar(v.getPagoAnterior(), principalCorrigido);
                pagoAnteriorCorrigido = Utils.dividir(pagoAnteriorCorrigido, diferencaPrincipalDaUltimaPassada);
                v.setPagoAnterior(pagoAnteriorCorrigido);
                base = Utils.somar(base, pagoAnteriorCorrigido, base);
                this.valoresAnteriores.set(i, v);
            }
            if (this.irpf.getIncidirSobreJurosDeMora().booleanValue()) {
                proporcao = Utils.dividir(pagoPrincipal.add(juroPagoTotal), base.add(juroPrincipal));
                this.valoresAnteriores.add(new ValoresCreditoReclamanteAnterior(pagoPrincipal.add(juroPagoTotal), creditoDoReclamante.getDiferencaPrincipal().add(diferencaJuroPrincipal), creditoDoReclamante.getDataFinalPeriodo()));
            } else {
                proporcao = Utils.dividir(pagoPrincipal, base);
                this.valoresAnteriores.add(new ValoresCreditoReclamanteAnterior(pagoPrincipal, creditoDoReclamante.getDiferencaPrincipal(), creditoDoReclamante.getDataFinalPeriodo()));
            }
        }
        return proporcao;
    }

    private void definirDatasLimites(OcorrenciaDeVerba ocorrenciaVerbas, Calculo calculo, HelperDate dataLimiteAnosAnteriores) {
        if (HelperDate.dateBefore(ocorrenciaVerbas.getDataInicial(), dataLimiteAnosAnteriores.getDate())) {
            if (Utils.nulo(this.irpf.getDataInicioAnosAnteriores()) || HelperDate.dateBefore(ocorrenciaVerbas.getDataInicial(), this.irpf.getDataInicioAnosAnteriores())) {
                this.irpf.setDataInicioAnosAnteriores(ocorrenciaVerbas.getDataInicial());
            }
            if (Utils.naoNulo(ocorrenciaVerbas.getDataFinal()) && (Utils.nulo(this.irpf.getDataFimAnosAnteriores()) || HelperDate.dateAfter(ocorrenciaVerbas.getDataFinal(), this.irpf.getDataFimAnosAnteriores()) && HelperDate.dateBefore(ocorrenciaVerbas.getDataFinal(), dataLimiteAnosAnteriores.getDate()))) {
                this.irpf.setDataFimAnosAnteriores(ocorrenciaVerbas.getDataFinal());
            }
            if (Utils.naoNulo(ocorrenciaVerbas.getDataFinalPeriodoAquisitivo())) {
                boolean testeComDemissao;
                boolean bl = testeComDemissao = Utils.nulo(calculo.getDataDemissao()) || !HelperDate.dateAfterOrEquals(ocorrenciaVerbas.getDataFinalPeriodoAquisitivo(), calculo.getDataDemissao());
                if ((Utils.nulo(this.irpf.getDataFimAnosAnteriores()) || HelperDate.dateAfter(ocorrenciaVerbas.getDataFinalPeriodoAquisitivo(), this.irpf.getDataFimAnosAnteriores()) && HelperDate.dateBefore(ocorrenciaVerbas.getDataFinalPeriodoAquisitivo(), dataLimiteAnosAnteriores.getDate())) && testeComDemissao) {
                    this.irpf.setDataFimAnosAnteriores(ocorrenciaVerbas.getDataFinalPeriodoAquisitivo());
                }
            }
        } else if (Utils.nulo(this.irpf.getDataFimAnoRecebimento()) || HelperDate.dateAfter(ocorrenciaVerbas.getDataFinal(), this.irpf.getDataFimAnoRecebimento())) {
            this.irpf.setDataFimAnoRecebimento(ocorrenciaVerbas.getDataFinal());
        }
    }

    public void liquidar() {
        if (this.irpf.getApurarImpostoRenda().booleanValue()) {
            this.limparOcorrencias();
            Calculo calculo = this.irpf.getCalculo();
            HelperDate dataLimiteAnosAnteriores = HelperDate.getInstance(calculo.getDataDeLiquidacao());
            dataLimiteAnosAnteriores.setMonth(0);
            dataLimiteAnosAnteriores.setDay(1);
            this.irpf.setDataInicioAnosAnteriores(null);
            this.irpf.setDataFimAnoRecebimento(null);
            this.tabelaImpostoRenda = TabelaIrpf.obterTabelaDa(calculo.getDataDeLiquidacao());
            if (Utils.nulo(this.tabelaImpostoRenda)) {
                return;
            }
            if (Utils.naoNulo(this.irpf.getRegimeDeCaixa()) && this.irpf.getRegimeDeCaixa().booleanValue() || HelperDate.dateBefore(calculo.getDataDeLiquidacao(), VINTE_OITO_JULHO_2010)) {
                FaixaFiscal faixa;
                boolean existeVerbaDecimoTerceiro = false;
                boolean existeVerbaFerias = false;
                boolean existeDemaisVerbas = false;
                HashMap<Date, Object> mapaVerbasFeriasGozadas = new HashMap<Date, Object>();
                HashMap<Date, BigDecimal> mapaVerbasDemaisVerbas = new HashMap<Date, BigDecimal>();
                BigDecimal verbaDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal verbaFerias = BigDecimal.ZERO;
                BigDecimal verbaFeriasGozadas = BigDecimal.ZERO;
                BigDecimal verbaDemaisVerbas = BigDecimal.ZERO;
                for (VerbaDeCalculo verba : calculo.getVerbasAtivas()) {
                    if (!verba.getIncidenciaIRPF().booleanValue()) continue;
                    for (OcorrenciaDeVerba ocorrenciaVerbas : verba.getOcorrenciasAtivas()) {
                        BigDecimal valorOcorrenciaCorrigida = Utils.arredondarValorMonetario(ocorrenciaVerbas.getDiferencaCorrigida());
                        Date competencia = HelperDate.getCurrentCompetence(ocorrenciaVerbas.getDataInicial()).getDate();
                        this.definirDatasLimites(ocorrenciaVerbas, calculo, dataLimiteAnosAnteriores);
                        switch (verba.getCaracteristica()) {
                            case DECIMO_TERCEIRO_SALARIO: {
                                verbaDecimoTerceiro = verbaDecimoTerceiro.add(valorOcorrenciaCorrigida, Utils.CONTEXTO_MATEMATICO);
                                existeVerbaDecimoTerceiro = true;
                                break;
                            }
                            case FERIAS: {
                                BigDecimal base = ocorrenciaVerbas.getDiferencaCorrigidaParaCalculoDasIncidencias();
                                if (Utils.naoNulo(base)) {
                                    verbaFerias = verbaFerias.add(base, Utils.CONTEXTO_MATEMATICO);
                                    verbaFeriasGozadas = verbaFeriasGozadas.add(base, Utils.CONTEXTO_MATEMATICO);
                                    BigDecimal valorCompetenciaFeriasGozadas = (BigDecimal)mapaVerbasFeriasGozadas.get(competencia);
                                    if (valorCompetenciaFeriasGozadas == null) {
                                        mapaVerbasFeriasGozadas.put(competencia, base);
                                    } else {
                                        mapaVerbasFeriasGozadas.put(competencia, valorCompetenciaFeriasGozadas.add(base, Utils.CONTEXTO_MATEMATICO));
                                    }
                                }
                                existeVerbaFerias = true;
                                break;
                            }
                            case AVISO_PREVIO: 
                            case COMUM: {
                                verbaDemaisVerbas = verbaDemaisVerbas.add(valorOcorrenciaCorrigida, Utils.CONTEXTO_MATEMATICO);
                                existeDemaisVerbas = true;
                                BigDecimal valorCompetenciaDemaisVerbas = (BigDecimal)mapaVerbasDemaisVerbas.get(competencia);
                                if (valorCompetenciaDemaisVerbas == null) {
                                    mapaVerbasDemaisVerbas.put(competencia, valorOcorrenciaCorrigida);
                                    break;
                                }
                                mapaVerbasDemaisVerbas.put(competencia, valorCompetenciaDemaisVerbas.add(valorOcorrenciaCorrigida, Utils.CONTEXTO_MATEMATICO));
                            }
                        }
                    }
                }
                BigDecimal jurosDecimoTerceiro = null;
                BigDecimal jurosFerias = null;
                BigDecimal jurosDemaisVerbas = null;
                if (this.irpf.getIncidirSobreJurosDeMora().booleanValue()) {
                    jurosDecimoTerceiro = calculo.getTotalDeJurosDaApuracaoDeJurosParaIrpfDecimoTerceiro();
                    jurosFerias = calculo.getTotalDeJurosDaApuracaoDeJurosParaIrpfFerias();
                    jurosDemaisVerbas = calculo.getTotalDeJurosDaApuracaoDeJurosParaIrpfDemaisVerbas();
                }
                BigDecimal descontoContribuicaoSocialDecimoTerceiro = null;
                BigDecimal descontoContribuicaoSocialFerias = null;
                BigDecimal descontoContribuicaoSocialDemaisVerbas = null;
                if (this.irpf.getDeduzirContribuicaoSocialDevidaPeloReclamante().booleanValue() && calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue()) {
                    descontoContribuicaoSocialDecimoTerceiro = BigDecimal.ZERO;
                    descontoContribuicaoSocialFerias = BigDecimal.ZERO;
                    descontoContribuicaoSocialDemaisVerbas = BigDecimal.ZERO;
                    for (OcorrenciaDeInssSobreSalariosDevidos ocorrenciaSalariosDevidos : calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba()) {
                        BigDecimal valorOcorrenciaCorrigido = Utils.arredondarValorMonetario(ocorrenciaSalariosDevidos.getValorDevidoReclamanteCorrigido());
                        Date competencia = HelperDate.getCurrentCompetence(ocorrenciaSalariosDevidos.getDataOcorrenciaInss()).getDate();
                        if (ocorrenciaSalariosDevidos.getOcorrenciaDecimoTerceiro().booleanValue()) {
                            if (!Utils.naoNulo(valorOcorrenciaCorrigido)) continue;
                            descontoContribuicaoSocialDecimoTerceiro = descontoContribuicaoSocialDecimoTerceiro.add(valorOcorrenciaCorrigido, Utils.CONTEXTO_MATEMATICO);
                            continue;
                        }
                        BigDecimal valorVerbaFeriasGozadasCompetencia = BigDecimal.ZERO;
                        BigDecimal valorVerbaDemaisVerbasCompetencia = BigDecimal.ZERO;
                        valorVerbaFeriasGozadasCompetencia = Utils.somar(valorVerbaFeriasGozadasCompetencia, (BigDecimal)mapaVerbasFeriasGozadas.get(competencia), valorVerbaFeriasGozadasCompetencia);
                        valorVerbaDemaisVerbasCompetencia = Utils.somar(valorVerbaDemaisVerbasCompetencia, (BigDecimal)mapaVerbasDemaisVerbas.get(competencia), valorVerbaDemaisVerbasCompetencia);
                        BigDecimal denominadorCompetencia = valorVerbaDemaisVerbasCompetencia.add(valorVerbaFeriasGozadasCompetencia, Utils.CONTEXTO_MATEMATICO);
                        if (!Utils.naoNulo(valorOcorrenciaCorrigido) || BigDecimal.ZERO.compareTo(denominadorCompetencia) == 0) continue;
                        BigDecimal auxiliar = null;
                        auxiliar = valorOcorrenciaCorrigido.multiply(valorVerbaFeriasGozadasCompetencia, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = auxiliar.divide(denominadorCompetencia, Utils.CONTEXTO_MATEMATICO);
                        descontoContribuicaoSocialFerias = descontoContribuicaoSocialFerias.add(auxiliar, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = valorOcorrenciaCorrigido.multiply(valorVerbaDemaisVerbasCompetencia, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = auxiliar.divide(denominadorCompetencia, Utils.CONTEXTO_MATEMATICO);
                        descontoContribuicaoSocialDemaisVerbas = descontoContribuicaoSocialDemaisVerbas.add(auxiliar, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                BigDecimal descontoPrevidenciaPrivadaDecimoTerceiro = null;
                BigDecimal descontoPrevidenciaPrivadaFerias = null;
                BigDecimal descontoPrevidenciaPrivadaDemaisVerbas = null;
                if (this.irpf.getDeduzirPrevidenciaPrivada().booleanValue()) {
                    BigDecimal valorPrevidenciaPrivada = calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido();
                    BigDecimal denominador = verbaDecimoTerceiro.add(verbaDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                    denominador = denominador.add(verbaFeriasGozadas, Utils.CONTEXTO_MATEMATICO);
                    if (Utils.naoNulo(valorPrevidenciaPrivada) && BigDecimal.ZERO.compareTo(denominador) != 0) {
                        descontoPrevidenciaPrivadaDecimoTerceiro = valorPrevidenciaPrivada.multiply(verbaDecimoTerceiro, Utils.CONTEXTO_MATEMATICO);
                        descontoPrevidenciaPrivadaDecimoTerceiro = descontoPrevidenciaPrivadaDecimoTerceiro.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                        descontoPrevidenciaPrivadaFerias = valorPrevidenciaPrivada.multiply(verbaFeriasGozadas, Utils.CONTEXTO_MATEMATICO);
                        descontoPrevidenciaPrivadaFerias = descontoPrevidenciaPrivadaFerias.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                        descontoPrevidenciaPrivadaDemaisVerbas = valorPrevidenciaPrivada.multiply(verbaDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                        descontoPrevidenciaPrivadaDemaisVerbas = descontoPrevidenciaPrivadaDemaisVerbas.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                BigDecimal descontoPensaoAlimenticiaDecimoTerceiro = null;
                BigDecimal descontoPensaoAlimenticiaFerias = null;
                BigDecimal descontoPensaoAlimenticiaDemaisVerbas = null;
                if (this.irpf.getDeduzirPensaoAlimenticia().booleanValue()) {
                    BigDecimal valorPensaoAlimenticia = null;
                    PensaoAlimenticia pensaoAlimenticia = calculo.getPensaoAlimenticiaDoCalculo();
                    if (pensaoAlimenticia != null) {
                        valorPensaoAlimenticia = pensaoAlimenticia.getValorDevidoSomenteSobreVerbasTributaveis();
                    }
                    BigDecimal valorDecimoTerceiro = Utils.somar(verbaDecimoTerceiro, jurosDecimoTerceiro, verbaDecimoTerceiro);
                    BigDecimal valorFerias = Utils.somar(verbaFerias, jurosFerias, verbaFerias);
                    BigDecimal valorDemaisVerbas = Utils.somar(verbaDemaisVerbas, jurosDemaisVerbas, verbaDemaisVerbas);
                    BigDecimal denominador = valorDecimoTerceiro.add(valorDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                    denominador = denominador.add(valorFerias, Utils.CONTEXTO_MATEMATICO);
                    if (Utils.naoNulo(valorPensaoAlimenticia) && BigDecimal.ZERO.compareTo(denominador) != 0) {
                        descontoPensaoAlimenticiaDecimoTerceiro = valorPensaoAlimenticia.multiply(valorDecimoTerceiro, Utils.CONTEXTO_MATEMATICO);
                        descontoPensaoAlimenticiaDecimoTerceiro = descontoPensaoAlimenticiaDecimoTerceiro.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                        descontoPensaoAlimenticiaFerias = valorPensaoAlimenticia.multiply(valorFerias, Utils.CONTEXTO_MATEMATICO);
                        descontoPensaoAlimenticiaFerias = descontoPensaoAlimenticiaFerias.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                        descontoPensaoAlimenticiaDemaisVerbas = valorPensaoAlimenticia.multiply(valorDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                        descontoPensaoAlimenticiaDemaisVerbas = descontoPensaoAlimenticiaDemaisVerbas.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                BigDecimal descontoHonorariosDecimoTerceiro = null;
                BigDecimal descontoHonorariosFerias = null;
                BigDecimal descontoHonorariosDemaisVerbas = null;
                if (this.irpf.getDeduzirHonorariosDevidosPeloReclamante().booleanValue()) {
                    BigDecimal honorariosDevidosPeloReclamante = calculo.getValorTotalHonorariosDevidosPeloReclamante();
                    BigDecimal brutoDevidoAoReclamante = calculo.calcularBrutoDevidoAoReclamante();
                    BigDecimal valorDecimoTerceiro = Utils.somar(verbaDecimoTerceiro, jurosDecimoTerceiro, verbaDecimoTerceiro);
                    BigDecimal valorFerias = Utils.somar(verbaFerias, jurosFerias, verbaFerias);
                    BigDecimal valorDemaisVerbas = Utils.somar(verbaDemaisVerbas, jurosDemaisVerbas, verbaDemaisVerbas);
                    if (Utils.naoNulos(honorariosDevidosPeloReclamante, brutoDevidoAoReclamante) && BigDecimal.ZERO.compareTo(brutoDevidoAoReclamante) != 0) {
                        BigDecimal fator = honorariosDevidosPeloReclamante.divide(brutoDevidoAoReclamante, Utils.CONTEXTO_MATEMATICO);
                        descontoHonorariosDecimoTerceiro = valorDecimoTerceiro.multiply(fator, Utils.CONTEXTO_MATEMATICO);
                        descontoHonorariosFerias = valorFerias.multiply(fator, Utils.CONTEXTO_MATEMATICO);
                        descontoHonorariosDemaisVerbas = valorDemaisVerbas.multiply(fator, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                BigDecimal descontoBaseParaDependentes = null;
                if (this.irpf.getPossuiDependentes().booleanValue()) {
                    descontoBaseParaDependentes = this.tabelaImpostoRenda.getValorDeducaoPorDependente().multiply(new BigDecimal(this.irpf.getQuantidadeDependentes()), Utils.CONTEXTO_MATEMATICO);
                }
                BigDecimal descontoBaseParaAposentadoMaiorQue65Anos = null;
                if (this.irpf.getAposentadoMaiorQue65Anos().booleanValue()) {
                    descontoBaseParaAposentadoMaiorQue65Anos = this.tabelaImpostoRenda.getValorDeducaoParaAposentadoMaiorQue65Anos();
                }
                BigDecimal verbaNormal = Utils.somar(verbaDecimoTerceiro, verbaFerias);
                verbaNormal = Utils.somar(verbaNormal, verbaDemaisVerbas);
                BigDecimal jurosNormal = Utils.somar(jurosDecimoTerceiro, jurosFerias);
                jurosNormal = Utils.somar(jurosNormal, jurosDemaisVerbas);
                BigDecimal descontoContribuicaoSocialNormal = Utils.somar(descontoContribuicaoSocialDecimoTerceiro, descontoContribuicaoSocialFerias);
                descontoContribuicaoSocialNormal = Utils.somar(descontoContribuicaoSocialNormal, descontoContribuicaoSocialDemaisVerbas);
                BigDecimal descontoPrevidenciaPrivadaNormal = Utils.somar(descontoPrevidenciaPrivadaDecimoTerceiro, descontoPrevidenciaPrivadaFerias);
                descontoPrevidenciaPrivadaNormal = Utils.somar(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaDemaisVerbas);
                BigDecimal descontoPensaoAlimenticiaNormal = Utils.somar(descontoPensaoAlimenticiaDecimoTerceiro, descontoPensaoAlimenticiaFerias);
                descontoPensaoAlimenticiaNormal = Utils.somar(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaDemaisVerbas);
                BigDecimal descontoHonorariosNormal = Utils.somar(descontoHonorariosDecimoTerceiro, descontoHonorariosFerias);
                descontoHonorariosNormal = Utils.somar(descontoHonorariosNormal, descontoHonorariosDemaisVerbas);
                if (this.irpf.getConsiderarTributacaoEmSeparado().booleanValue() && existeVerbaFerias) {
                    OcorrenciaDeIrpf ocorrenciaTributacaoEmSeparado = new OcorrenciaDeIrpf(TipoOcorrenciaIrpfEnum.TRIBUTACAO_EM_SEPARADO);
                    ocorrenciaTributacaoEmSeparado.setDataOcorrencia(calculo.getDataDeLiquidacao());
                    ocorrenciaTributacaoEmSeparado.setValorVerbas(verbaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorJuros(jurosFerias);
                    ocorrenciaTributacaoEmSeparado.setValorContribuicaoSocial(descontoContribuicaoSocialFerias);
                    ocorrenciaTributacaoEmSeparado.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorPensaoAlimenticia(descontoPensaoAlimenticiaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorHonorarios(descontoHonorariosFerias);
                    ocorrenciaTributacaoEmSeparado.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaTributacaoEmSeparado.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaTributacaoEmSeparado.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaTributacaoEmSeparado.getValorBase());
                    ocorrenciaTributacaoEmSeparado.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaTributacaoEmSeparado.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaTributacaoEmSeparado.setValorAliquota(faixa.getAliquota());
                    ocorrenciaTributacaoEmSeparado.setValorDeducao(faixa.getDeducao());
                    ocorrenciaTributacaoEmSeparado.atualizaValorDevido();
                    ocorrenciaTributacaoEmSeparado.setIrpf(this.irpf);
                    this.irpf.getOcorrencias().add(ocorrenciaTributacaoEmSeparado);
                    verbaNormal = Utils.subtrair(verbaNormal, verbaFerias);
                    jurosNormal = Utils.subtrair(jurosNormal, jurosFerias);
                    descontoContribuicaoSocialNormal = Utils.subtrair(descontoContribuicaoSocialNormal, descontoContribuicaoSocialFerias);
                    descontoPrevidenciaPrivadaNormal = Utils.subtrair(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaFerias);
                    descontoPensaoAlimenticiaNormal = Utils.subtrair(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaFerias);
                    descontoHonorariosNormal = Utils.subtrair(descontoHonorariosNormal, descontoHonorariosFerias);
                } else if (existeVerbaFerias) {
                    existeDemaisVerbas = true;
                }
                if (this.irpf.getConsiderarTributacaoExclusiva().booleanValue() && existeVerbaDecimoTerceiro) {
                    OcorrenciaDeIrpf ocorrenciaTributacaoExclusiva = new OcorrenciaDeIrpf(TipoOcorrenciaIrpfEnum.TRIBUTACAO_EXCLUSIVA);
                    ocorrenciaTributacaoExclusiva.setDataOcorrencia(calculo.getDataDeLiquidacao());
                    ocorrenciaTributacaoExclusiva.setValorVerbas(verbaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorJuros(jurosDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorContribuicaoSocial(descontoContribuicaoSocialDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorPensaoAlimenticia(descontoPensaoAlimenticiaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorHonorarios(descontoHonorariosDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaTributacaoExclusiva.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaTributacaoExclusiva.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaTributacaoExclusiva.getValorBase());
                    ocorrenciaTributacaoExclusiva.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaTributacaoExclusiva.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaTributacaoExclusiva.setValorAliquota(faixa.getAliquota());
                    ocorrenciaTributacaoExclusiva.setValorDeducao(faixa.getDeducao());
                    ocorrenciaTributacaoExclusiva.atualizaValorDevido();
                    ocorrenciaTributacaoExclusiva.setIrpf(this.irpf);
                    this.irpf.getOcorrencias().add(ocorrenciaTributacaoExclusiva);
                    verbaNormal = Utils.subtrair(verbaNormal, verbaDecimoTerceiro);
                    jurosNormal = Utils.subtrair(jurosNormal, jurosDecimoTerceiro);
                    descontoContribuicaoSocialNormal = Utils.subtrair(descontoContribuicaoSocialNormal, descontoContribuicaoSocialDecimoTerceiro);
                    descontoPrevidenciaPrivadaNormal = Utils.subtrair(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaDecimoTerceiro);
                    descontoPensaoAlimenticiaNormal = Utils.subtrair(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaDecimoTerceiro);
                    descontoHonorariosNormal = Utils.subtrair(descontoHonorariosNormal, descontoHonorariosDecimoTerceiro);
                } else if (existeVerbaDecimoTerceiro) {
                    existeDemaisVerbas = true;
                }
                if (existeDemaisVerbas) {
                    OcorrenciaDeIrpf ocorrenciaNormal = new OcorrenciaDeIrpf(TipoOcorrenciaIrpfEnum.NORMAL);
                    ocorrenciaNormal.setDataOcorrencia(calculo.getDataDeLiquidacao());
                    ocorrenciaNormal.setValorVerbas(verbaNormal);
                    ocorrenciaNormal.setValorJuros(jurosNormal);
                    ocorrenciaNormal.setValorContribuicaoSocial(descontoContribuicaoSocialNormal);
                    ocorrenciaNormal.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaNormal);
                    ocorrenciaNormal.setValorPensaoAlimenticia(descontoPensaoAlimenticiaNormal);
                    ocorrenciaNormal.setValorHonorarios(descontoHonorariosNormal);
                    ocorrenciaNormal.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaNormal.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaNormal.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaNormal.getValorBase());
                    ocorrenciaNormal.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaNormal.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaNormal.setValorAliquota(faixa.getAliquota());
                    ocorrenciaNormal.setValorDeducao(faixa.getDeducao());
                    ocorrenciaNormal.atualizaValorDevido();
                    ocorrenciaNormal.setIrpf(this.irpf);
                    this.irpf.getOcorrencias().add(ocorrenciaNormal);
                }
            } else {
                FaixaFiscal faixa;
                int numeroCompetencias;
                BigDecimal auxiliar;
                boolean existeVerbaAnosAnteriores = false;
                boolean existeVerbaDecimoTerceiro = false;
                boolean existeVerbaFerias = false;
                boolean existeDemaisVerbas = false;
                this.irpf.setDataInicioAnoRecebimento(dataLimiteAnosAnteriores.getDate());
                this.irpf.setDataFimAnosAnteriores(null);
                HashSet<Date> mesesAnosAnteriores = new HashSet<Date>();
                HashSet<Date> mesesAnosAnterioresDecimoTerceiro = new HashSet<Date>();
                HashMap<Date, BigDecimal> mapaVerbasFeriasGozadas = new HashMap<Date, BigDecimal>();
                HashMap<Date, Object> mapaVerbasDemaisVerbas = new HashMap<Date, Object>();
                BigDecimal verbaAnosAnteriores = BigDecimal.ZERO;
                BigDecimal verbaDecimoTerceiro = BigDecimal.ZERO;
                BigDecimal verbaFerias = BigDecimal.ZERO;
                BigDecimal verbaFeriasGozadas = BigDecimal.ZERO;
                BigDecimal verbaDemaisVerbas = BigDecimal.ZERO;
                for (VerbaDeCalculo verba : calculo.getVerbasAtivas()) {
                    if (!verba.getIncidenciaIRPF().booleanValue()) continue;
                    for (OcorrenciaDeVerba ocorrenciaVerbas : verba.getOcorrenciasAtivas()) {
                        BigDecimal base;
                        BigDecimal valorOcorrenciaCorrigida = Utils.arredondarValorMonetario(ocorrenciaVerbas.getDiferencaCorrigida());
                        Date competencia = HelperDate.getCurrentCompetence(ocorrenciaVerbas.getDataInicial()).getDate();
                        this.definirDatasLimites(ocorrenciaVerbas, calculo, dataLimiteAnosAnteriores);
                        if (HelperDate.dateBefore(ocorrenciaVerbas.getDataInicial(), dataLimiteAnosAnteriores.getDate())) {
                            if (BigDecimal.ZERO.compareTo(valorOcorrenciaCorrigida) == 0) continue;
                            base = ocorrenciaVerbas.getDiferencaCorrigidaParaCalculoDasIncidencias();
                            if (Utils.naoNulo(base)) {
                                verbaAnosAnteriores = verbaAnosAnteriores.add(base);
                                existeVerbaAnosAnteriores = true;
                            }
                            if (CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)verba.getCaracteristica())) {
                                mesesAnosAnterioresDecimoTerceiro.add(competencia);
                                continue;
                            }
                            if (!Utils.naoNulo(base)) continue;
                            mesesAnosAnteriores.add(competencia);
                            continue;
                        }
                        switch (verba.getCaracteristica()) {
                            case DECIMO_TERCEIRO_SALARIO: {
                                verbaDecimoTerceiro = verbaDecimoTerceiro.add(valorOcorrenciaCorrigida, Utils.CONTEXTO_MATEMATICO);
                                existeVerbaDecimoTerceiro = true;
                                break;
                            }
                            case FERIAS: {
                                base = ocorrenciaVerbas.getDiferencaCorrigidaParaCalculoDasIncidencias();
                                if (Utils.naoNulo(base)) {
                                    verbaFerias = verbaFerias.add(base, Utils.CONTEXTO_MATEMATICO);
                                    verbaFeriasGozadas = verbaFeriasGozadas.add(base, Utils.CONTEXTO_MATEMATICO);
                                    BigDecimal valorCompetenciaFeriasGozadas = (BigDecimal)mapaVerbasFeriasGozadas.get(competencia);
                                    if (valorCompetenciaFeriasGozadas == null) {
                                        mapaVerbasFeriasGozadas.put(competencia, base);
                                    } else {
                                        mapaVerbasFeriasGozadas.put(competencia, valorCompetenciaFeriasGozadas.add(base, Utils.CONTEXTO_MATEMATICO));
                                    }
                                }
                                existeVerbaFerias = true;
                                break;
                            }
                            case AVISO_PREVIO: 
                            case COMUM: {
                                verbaDemaisVerbas = verbaDemaisVerbas.add(valorOcorrenciaCorrigida, Utils.CONTEXTO_MATEMATICO);
                                existeDemaisVerbas = true;
                                BigDecimal valorCompetenciaDemaisVerbas = (BigDecimal)mapaVerbasDemaisVerbas.get(competencia);
                                if (valorCompetenciaDemaisVerbas == null) {
                                    mapaVerbasDemaisVerbas.put(competencia, valorOcorrenciaCorrigida);
                                    break;
                                }
                                mapaVerbasDemaisVerbas.put(competencia, valorCompetenciaDemaisVerbas.add(valorOcorrenciaCorrigida, Utils.CONTEXTO_MATEMATICO));
                            }
                        }
                    }
                }
                BigDecimal jurosAnosAnteriores = null;
                BigDecimal jurosDecimoTerceiro = null;
                BigDecimal jurosFerias = null;
                BigDecimal jurosDemaisVerbas = null;
                if (this.irpf.getIncidirSobreJurosDeMora().booleanValue()) {
                    jurosAnosAnteriores = BigDecimal.ZERO;
                    jurosDecimoTerceiro = BigDecimal.ZERO;
                    jurosFerias = BigDecimal.ZERO;
                    jurosDemaisVerbas = BigDecimal.ZERO;
                    for (ApuracaoDeJuros ocorrenciaJuros : calculo.getApuracoesDeJuros()) {
                        if (HelperDate.dateBefore(ocorrenciaJuros.getCompetencia(), dataLimiteAnosAnteriores.getDate())) {
                            jurosAnosAnteriores = jurosAnosAnteriores.add(ocorrenciaJuros.getJurosParaIrpfDecimoTerceiro());
                            jurosAnosAnteriores = jurosAnosAnteriores.add(ocorrenciaJuros.getJurosParaIrpfFerias());
                            jurosAnosAnteriores = jurosAnosAnteriores.add(ocorrenciaJuros.getJurosParaIrpfDemaisVerbas());
                            continue;
                        }
                        jurosDecimoTerceiro = jurosDecimoTerceiro.add(ocorrenciaJuros.getJurosParaIrpfDecimoTerceiro());
                        jurosFerias = jurosFerias.add(ocorrenciaJuros.getJurosParaIrpfFerias());
                        jurosDemaisVerbas = jurosDemaisVerbas.add(ocorrenciaJuros.getJurosParaIrpfDemaisVerbas());
                    }
                }
                BigDecimal descontoContribuicaoSocialAnosAnteriores = null;
                BigDecimal descontoContribuicaoSocialDecimoTerceiro = null;
                BigDecimal descontoContribuicaoSocialFerias = null;
                BigDecimal descontoContribuicaoSocialDemaisVerbas = null;
                if (this.irpf.getDeduzirContribuicaoSocialDevidaPeloReclamante().booleanValue() && calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado().booleanValue() && calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante().booleanValue()) {
                    descontoContribuicaoSocialAnosAnteriores = BigDecimal.ZERO;
                    descontoContribuicaoSocialDecimoTerceiro = BigDecimal.ZERO;
                    descontoContribuicaoSocialFerias = BigDecimal.ZERO;
                    descontoContribuicaoSocialDemaisVerbas = BigDecimal.ZERO;
                    for (OcorrenciaDeInssSobreSalariosDevidos ocorrenciaSalariosDevidos : calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba()) {
                        BigDecimal valorOcorrenciaCorrigido = Utils.arredondarValorMonetario(ocorrenciaSalariosDevidos.getValorDevidoReclamanteCorrigido());
                        Date competencia = HelperDate.getCurrentCompetence(ocorrenciaSalariosDevidos.getDataOcorrenciaInss()).getDate();
                        if (HelperDate.dateBefore(ocorrenciaSalariosDevidos.getDataOcorrenciaInss(), dataLimiteAnosAnteriores.getDate())) {
                            if (!Utils.naoNulo(valorOcorrenciaCorrigido)) continue;
                            descontoContribuicaoSocialAnosAnteriores = descontoContribuicaoSocialAnosAnteriores.add(valorOcorrenciaCorrigido, Utils.CONTEXTO_MATEMATICO);
                            continue;
                        }
                        if (ocorrenciaSalariosDevidos.getOcorrenciaDecimoTerceiro().booleanValue()) {
                            if (!Utils.naoNulo(valorOcorrenciaCorrigido)) continue;
                            descontoContribuicaoSocialDecimoTerceiro = descontoContribuicaoSocialDecimoTerceiro.add(valorOcorrenciaCorrigido, Utils.CONTEXTO_MATEMATICO);
                            continue;
                        }
                        BigDecimal valorVerbaFeriasGozadasCompetencia = BigDecimal.ZERO;
                        Object valorVerbaDemaisVerbasCompetencia = BigDecimal.ZERO;
                        valorVerbaFeriasGozadasCompetencia = Utils.somar(valorVerbaFeriasGozadasCompetencia, (BigDecimal)mapaVerbasFeriasGozadas.get(competencia), valorVerbaFeriasGozadasCompetencia);
                        valorVerbaDemaisVerbasCompetencia = Utils.somar((BigDecimal)valorVerbaDemaisVerbasCompetencia, (BigDecimal)mapaVerbasDemaisVerbas.get(competencia), (BigDecimal)valorVerbaDemaisVerbasCompetencia);
                        BigDecimal denominadorCompetencia = ((BigDecimal)valorVerbaDemaisVerbasCompetencia).add(valorVerbaFeriasGozadasCompetencia, Utils.CONTEXTO_MATEMATICO);
                        if (!Utils.naoNulo(valorOcorrenciaCorrigido) || BigDecimal.ZERO.compareTo(denominadorCompetencia) == 0) continue;
                        auxiliar = null;
                        auxiliar = valorOcorrenciaCorrigido.multiply(valorVerbaFeriasGozadasCompetencia, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = auxiliar.divide(denominadorCompetencia, Utils.CONTEXTO_MATEMATICO);
                        descontoContribuicaoSocialFerias = descontoContribuicaoSocialFerias.add(auxiliar, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = valorOcorrenciaCorrigido.multiply((BigDecimal)valorVerbaDemaisVerbasCompetencia, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = auxiliar.divide(denominadorCompetencia, Utils.CONTEXTO_MATEMATICO);
                        descontoContribuicaoSocialDemaisVerbas = descontoContribuicaoSocialDemaisVerbas.add(auxiliar, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                BigDecimal descontoPrevidenciaPrivadaAnosAnteriores = null;
                BigDecimal descontoPrevidenciaPrivadaDecimoTerceiro = null;
                BigDecimal descontoPrevidenciaPrivadaFerias = null;
                BigDecimal descontoPrevidenciaPrivadaDemaisVerbas = null;
                if (this.irpf.getDeduzirPrevidenciaPrivada().booleanValue()) {
                    descontoPrevidenciaPrivadaAnosAnteriores = BigDecimal.ZERO;
                    descontoPrevidenciaPrivadaDecimoTerceiro = BigDecimal.ZERO;
                    descontoPrevidenciaPrivadaFerias = BigDecimal.ZERO;
                    descontoPrevidenciaPrivadaDemaisVerbas = BigDecimal.ZERO;
                    BigDecimal denominador = verbaDecimoTerceiro.add(verbaDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                    denominador = denominador.add(verbaFeriasGozadas, Utils.CONTEXTO_MATEMATICO);
                    for (OcorrenciaDePrevidenciaPrivada ocorrenciaPrevidenciaPrivada : calculo.getPrevidenciaPrivada().getOcorrencias()) {
                        if (HelperDate.dateBefore(ocorrenciaPrevidenciaPrivada.getCompetencia(), dataLimiteAnosAnteriores.getDate())) {
                            if (!Utils.naoNulo(ocorrenciaPrevidenciaPrivada.getValorDevidoCorrigido())) continue;
                            descontoPrevidenciaPrivadaAnosAnteriores = descontoPrevidenciaPrivadaAnosAnteriores.add(ocorrenciaPrevidenciaPrivada.getValorDevidoCorrigido(), Utils.CONTEXTO_MATEMATICO);
                            continue;
                        }
                        if (!Utils.naoNulo(ocorrenciaPrevidenciaPrivada.getValorDevidoCorrigido()) || BigDecimal.ZERO.compareTo(denominador) == 0) continue;
                        auxiliar = null;
                        auxiliar = ocorrenciaPrevidenciaPrivada.getValorDevidoCorrigido().multiply(verbaDecimoTerceiro, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = auxiliar.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                        descontoPrevidenciaPrivadaDecimoTerceiro = descontoPrevidenciaPrivadaDecimoTerceiro.add(auxiliar, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = ocorrenciaPrevidenciaPrivada.getValorDevidoCorrigido().multiply(verbaFeriasGozadas, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = auxiliar.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                        descontoPrevidenciaPrivadaFerias = descontoPrevidenciaPrivadaFerias.add(auxiliar, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = ocorrenciaPrevidenciaPrivada.getValorDevidoCorrigido().multiply(verbaDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                        auxiliar = auxiliar.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                        descontoPrevidenciaPrivadaDemaisVerbas = descontoPrevidenciaPrivadaDemaisVerbas.add(auxiliar, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                BigDecimal descontoPensaoAlimenticiaAnosAnteriores = null;
                BigDecimal descontoPensaoAlimenticiaDecimoTerceiro = null;
                BigDecimal descontoPensaoAlimenticiaFerias = null;
                BigDecimal descontoPensaoAlimenticiaDemaisVerbas = null;
                if (this.irpf.getDeduzirPensaoAlimenticia().booleanValue()) {
                    descontoPensaoAlimenticiaAnosAnteriores = BigDecimal.ZERO;
                    descontoPensaoAlimenticiaDecimoTerceiro = BigDecimal.ZERO;
                    descontoPensaoAlimenticiaFerias = BigDecimal.ZERO;
                    descontoPensaoAlimenticiaDemaisVerbas = BigDecimal.ZERO;
                    BigDecimal valorPensaoAlimenticia = null;
                    PensaoAlimenticia pensaoAlimenticia = calculo.getPensaoAlimenticiaDoCalculo();
                    if (pensaoAlimenticia != null) {
                        valorPensaoAlimenticia = pensaoAlimenticia.getValorDevidoSomenteSobreVerbasTributaveis();
                    }
                    BigDecimal valorAnosAnteriores = Utils.somar(verbaAnosAnteriores, jurosAnosAnteriores, verbaAnosAnteriores);
                    BigDecimal valorDecimoTerceiro = Utils.somar(verbaDecimoTerceiro, jurosDecimoTerceiro, verbaDecimoTerceiro);
                    BigDecimal valorFerias = Utils.somar(verbaFerias, jurosFerias, verbaFerias);
                    BigDecimal valorDemaisVerbas = Utils.somar(verbaDemaisVerbas, jurosDemaisVerbas, verbaDemaisVerbas);
                    BigDecimal denominadorParaProporcaoDeAnosAnteriores = valorAnosAnteriores.add(valorDecimoTerceiro, Utils.CONTEXTO_MATEMATICO);
                    denominadorParaProporcaoDeAnosAnteriores = denominadorParaProporcaoDeAnosAnteriores.add(valorFerias, Utils.CONTEXTO_MATEMATICO);
                    denominadorParaProporcaoDeAnosAnteriores = denominadorParaProporcaoDeAnosAnteriores.add(valorDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                    if (Utils.naoNulo(valorPensaoAlimenticia) && BigDecimal.ZERO.compareTo(denominadorParaProporcaoDeAnosAnteriores) != 0) {
                        descontoPensaoAlimenticiaAnosAnteriores = valorPensaoAlimenticia.multiply(valorAnosAnteriores, Utils.CONTEXTO_MATEMATICO);
                        descontoPensaoAlimenticiaAnosAnteriores = descontoPensaoAlimenticiaAnosAnteriores.divide(denominadorParaProporcaoDeAnosAnteriores, Utils.CONTEXTO_MATEMATICO);
                        BigDecimal valorPensaoAlimenticiaAnosPosteriores = valorPensaoAlimenticia.subtract(descontoPensaoAlimenticiaAnosAnteriores, Utils.CONTEXTO_MATEMATICO);
                        BigDecimal denominador = valorDecimoTerceiro.add(valorDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                        denominador = denominador.add(valorFerias, Utils.CONTEXTO_MATEMATICO);
                        if (Utils.naoNulo(valorPensaoAlimenticiaAnosPosteriores) && BigDecimal.ZERO.compareTo(denominador) != 0) {
                            descontoPensaoAlimenticiaDecimoTerceiro = valorPensaoAlimenticiaAnosPosteriores.multiply(valorDecimoTerceiro, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaDecimoTerceiro = descontoPensaoAlimenticiaDecimoTerceiro.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaFerias = valorPensaoAlimenticiaAnosPosteriores.multiply(valorFerias, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaFerias = descontoPensaoAlimenticiaFerias.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaDemaisVerbas = valorPensaoAlimenticiaAnosPosteriores.multiply(valorDemaisVerbas, Utils.CONTEXTO_MATEMATICO);
                            descontoPensaoAlimenticiaDemaisVerbas = descontoPensaoAlimenticiaDemaisVerbas.divide(denominador, Utils.CONTEXTO_MATEMATICO);
                        }
                    }
                }
                BigDecimal descontoHonorariosAnosAnteriores = null;
                BigDecimal descontoHonorariosDecimoTerceiro = null;
                BigDecimal descontoHonorariosFerias = null;
                BigDecimal descontoHonorariosDemaisVerbas = null;
                if (this.irpf.getDeduzirHonorariosDevidosPeloReclamante().booleanValue()) {
                    descontoHonorariosAnosAnteriores = BigDecimal.ZERO;
                    descontoHonorariosDecimoTerceiro = BigDecimal.ZERO;
                    descontoHonorariosFerias = BigDecimal.ZERO;
                    descontoHonorariosDemaisVerbas = BigDecimal.ZERO;
                    BigDecimal honorariosDevidosPeloReclamante = calculo.getValorTotalHonorariosDevidosPeloReclamante();
                    BigDecimal brutoDevidoAoReclamante = calculo.calcularBrutoDevidoAoReclamante();
                    BigDecimal valorAnosAnteriores = Utils.somar(verbaAnosAnteriores, jurosAnosAnteriores, verbaAnosAnteriores);
                    BigDecimal valorDecimoTerceiro = Utils.somar(verbaDecimoTerceiro, jurosDecimoTerceiro, verbaDecimoTerceiro);
                    BigDecimal valorFerias = Utils.somar(verbaFerias, jurosFerias, verbaFerias);
                    BigDecimal valorDemaisVerbas = Utils.somar(verbaDemaisVerbas, jurosDemaisVerbas, verbaDemaisVerbas);
                    if (Utils.naoNulos(honorariosDevidosPeloReclamante, brutoDevidoAoReclamante) && BigDecimal.ZERO.compareTo(brutoDevidoAoReclamante) != 0) {
                        BigDecimal fator = honorariosDevidosPeloReclamante.divide(brutoDevidoAoReclamante, Utils.CONTEXTO_MATEMATICO);
                        descontoHonorariosAnosAnteriores = valorAnosAnteriores.multiply(fator, Utils.CONTEXTO_MATEMATICO);
                        descontoHonorariosDecimoTerceiro = valorDecimoTerceiro.multiply(fator, Utils.CONTEXTO_MATEMATICO);
                        descontoHonorariosFerias = valorFerias.multiply(fator, Utils.CONTEXTO_MATEMATICO);
                        descontoHonorariosDemaisVerbas = valorDemaisVerbas.multiply(fator, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                BigDecimal descontoBaseParaDependentes = null;
                if (this.irpf.getPossuiDependentes().booleanValue()) {
                    descontoBaseParaDependentes = this.tabelaImpostoRenda.getValorDeducaoPorDependente().multiply(new BigDecimal(this.irpf.getQuantidadeDependentes()), Utils.CONTEXTO_MATEMATICO);
                }
                BigDecimal descontoBaseParaAposentadoMaiorQue65Anos = null;
                if (this.irpf.getAposentadoMaiorQue65Anos().booleanValue()) {
                    descontoBaseParaAposentadoMaiorQue65Anos = this.tabelaImpostoRenda.getValorDeducaoParaAposentadoMaiorQue65Anos();
                }
                if ((numeroCompetencias = mesesAnosAnteriores.size() + mesesAnosAnterioresDecimoTerceiro.size()) > 0 && existeVerbaAnosAnteriores) {
                    OcorrenciaDeIrpf ocorrenciaAnosAnteriores = new OcorrenciaDeIrpf(TipoOcorrenciaIrpfEnum.RRA_ANOS_ANTERIORES);
                    ocorrenciaAnosAnteriores.setDataOcorrencia(calculo.getDataDeLiquidacao());
                    ocorrenciaAnosAnteriores.setValorVerbas(verbaAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorJuros(jurosAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorContribuicaoSocial(descontoContribuicaoSocialAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorPensaoAlimenticia(descontoPensaoAlimenticiaAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorHonorarios(descontoHonorariosAnosAnteriores);
                    ocorrenciaAnosAnteriores.setValorDependentes(Utils.naoNulo(descontoBaseParaDependentes) ? descontoBaseParaDependentes.multiply(new BigDecimal(numeroCompetencias), Utils.CONTEXTO_MATEMATICO) : null);
                    ocorrenciaAnosAnteriores.setValorAposentadoMaiorQue65(Utils.naoNulo(descontoBaseParaAposentadoMaiorQue65Anos) ? descontoBaseParaAposentadoMaiorQue65Anos.multiply(new BigDecimal(numeroCompetencias), Utils.CONTEXTO_MATEMATICO) : null);
                    ocorrenciaAnosAnteriores.setQuantidadeCompetencias(numeroCompetencias);
                    ocorrenciaAnosAnteriores.atualizaBase();
                    FaixaFiscal faixa2 = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaAnosAnteriores.getValorBase(), new BigDecimal(numeroCompetencias));
                    BigDecimal valorInicialDaFaixa = faixa2.getValorInicial().subtract(UM_CENTAVO, Utils.CONTEXTO_MATEMATICO);
                    valorInicialDaFaixa = valorInicialDaFaixa.multiply(new BigDecimal(numeroCompetencias), Utils.CONTEXTO_MATEMATICO);
                    valorInicialDaFaixa = valorInicialDaFaixa.add(UM_CENTAVO, Utils.CONTEXTO_MATEMATICO);
                    if (BigDecimal.ZERO.compareTo(valorInicialDaFaixa) > 0) {
                        valorInicialDaFaixa = BigDecimal.ZERO;
                    }
                    ocorrenciaAnosAnteriores.setValorInicialFaixa(valorInicialDaFaixa);
                    ocorrenciaAnosAnteriores.setValorFinalFaixa(Utils.naoNulo(faixa2.getValorFinal()) ? faixa2.getValorFinal().multiply(new BigDecimal(numeroCompetencias), Utils.CONTEXTO_MATEMATICO) : null);
                    ocorrenciaAnosAnteriores.setValorAliquota(faixa2.getAliquota());
                    ocorrenciaAnosAnteriores.setValorDeducao(faixa2.getDeducao().multiply(new BigDecimal(numeroCompetencias), Utils.CONTEXTO_MATEMATICO));
                    ocorrenciaAnosAnteriores.atualizaValorDevido();
                    ocorrenciaAnosAnteriores.setIrpf(this.irpf);
                    this.irpf.getOcorrencias().add(ocorrenciaAnosAnteriores);
                }
                BigDecimal verbaNormal = Utils.somar(verbaDecimoTerceiro, verbaFerias);
                verbaNormal = Utils.somar(verbaNormal, verbaDemaisVerbas);
                BigDecimal jurosNormal = Utils.somar(jurosDecimoTerceiro, jurosFerias);
                jurosNormal = Utils.somar(jurosNormal, jurosDemaisVerbas);
                BigDecimal descontoContribuicaoSocialNormal = Utils.somar(descontoContribuicaoSocialDecimoTerceiro, descontoContribuicaoSocialFerias);
                descontoContribuicaoSocialNormal = Utils.somar(descontoContribuicaoSocialNormal, descontoContribuicaoSocialDemaisVerbas);
                BigDecimal descontoPrevidenciaPrivadaNormal = Utils.somar(descontoPrevidenciaPrivadaDecimoTerceiro, descontoPrevidenciaPrivadaFerias);
                descontoPrevidenciaPrivadaNormal = Utils.somar(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaDemaisVerbas);
                BigDecimal descontoPensaoAlimenticiaNormal = Utils.somar(descontoPensaoAlimenticiaDecimoTerceiro, descontoPensaoAlimenticiaFerias);
                descontoPensaoAlimenticiaNormal = Utils.somar(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaDemaisVerbas);
                BigDecimal descontoHonorariosNormal = Utils.somar(descontoHonorariosDecimoTerceiro, descontoHonorariosFerias);
                descontoHonorariosNormal = Utils.somar(descontoHonorariosNormal, descontoHonorariosDemaisVerbas);
                if (this.irpf.getConsiderarTributacaoEmSeparado().booleanValue() && existeVerbaFerias) {
                    OcorrenciaDeIrpf ocorrenciaTributacaoEmSeparado = new OcorrenciaDeIrpf(TipoOcorrenciaIrpfEnum.TRIBUTACAO_EM_SEPARADO);
                    ocorrenciaTributacaoEmSeparado.setDataOcorrencia(calculo.getDataDeLiquidacao());
                    ocorrenciaTributacaoEmSeparado.setValorVerbas(verbaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorJuros(jurosFerias);
                    ocorrenciaTributacaoEmSeparado.setValorContribuicaoSocial(descontoContribuicaoSocialFerias);
                    ocorrenciaTributacaoEmSeparado.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorPensaoAlimenticia(descontoPensaoAlimenticiaFerias);
                    ocorrenciaTributacaoEmSeparado.setValorHonorarios(descontoHonorariosFerias);
                    ocorrenciaTributacaoEmSeparado.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaTributacaoEmSeparado.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaTributacaoEmSeparado.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaTributacaoEmSeparado.getValorBase());
                    ocorrenciaTributacaoEmSeparado.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaTributacaoEmSeparado.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaTributacaoEmSeparado.setValorAliquota(faixa.getAliquota());
                    ocorrenciaTributacaoEmSeparado.setValorDeducao(faixa.getDeducao());
                    ocorrenciaTributacaoEmSeparado.atualizaValorDevido();
                    ocorrenciaTributacaoEmSeparado.setIrpf(this.irpf);
                    this.irpf.getOcorrencias().add(ocorrenciaTributacaoEmSeparado);
                    verbaNormal = Utils.subtrair(verbaNormal, verbaFerias);
                    jurosNormal = Utils.subtrair(jurosNormal, jurosFerias);
                    descontoContribuicaoSocialNormal = Utils.subtrair(descontoContribuicaoSocialNormal, descontoContribuicaoSocialFerias);
                    descontoPrevidenciaPrivadaNormal = Utils.subtrair(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaFerias);
                    descontoPensaoAlimenticiaNormal = Utils.subtrair(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaFerias);
                    descontoHonorariosNormal = Utils.subtrair(descontoHonorariosNormal, descontoHonorariosFerias);
                } else if (existeVerbaFerias) {
                    existeDemaisVerbas = true;
                }
                if (this.irpf.getConsiderarTributacaoExclusiva().booleanValue() && existeVerbaDecimoTerceiro) {
                    OcorrenciaDeIrpf ocorrenciaTributacaoExclusiva = new OcorrenciaDeIrpf(TipoOcorrenciaIrpfEnum.TRIBUTACAO_EXCLUSIVA);
                    ocorrenciaTributacaoExclusiva.setDataOcorrencia(calculo.getDataDeLiquidacao());
                    ocorrenciaTributacaoExclusiva.setValorVerbas(verbaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorJuros(jurosDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorContribuicaoSocial(descontoContribuicaoSocialDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorPensaoAlimenticia(descontoPensaoAlimenticiaDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorHonorarios(descontoHonorariosDecimoTerceiro);
                    ocorrenciaTributacaoExclusiva.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaTributacaoExclusiva.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaTributacaoExclusiva.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaTributacaoExclusiva.getValorBase());
                    ocorrenciaTributacaoExclusiva.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaTributacaoExclusiva.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaTributacaoExclusiva.setValorAliquota(faixa.getAliquota());
                    ocorrenciaTributacaoExclusiva.setValorDeducao(faixa.getDeducao());
                    ocorrenciaTributacaoExclusiva.atualizaValorDevido();
                    ocorrenciaTributacaoExclusiva.setIrpf(this.irpf);
                    this.irpf.getOcorrencias().add(ocorrenciaTributacaoExclusiva);
                    verbaNormal = Utils.subtrair(verbaNormal, verbaDecimoTerceiro);
                    jurosNormal = Utils.subtrair(jurosNormal, jurosDecimoTerceiro);
                    descontoContribuicaoSocialNormal = Utils.subtrair(descontoContribuicaoSocialNormal, descontoContribuicaoSocialDecimoTerceiro);
                    descontoPrevidenciaPrivadaNormal = Utils.subtrair(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaDecimoTerceiro);
                    descontoPensaoAlimenticiaNormal = Utils.subtrair(descontoPensaoAlimenticiaNormal, descontoPensaoAlimenticiaDecimoTerceiro);
                    descontoHonorariosNormal = Utils.subtrair(descontoHonorariosNormal, descontoHonorariosDecimoTerceiro);
                } else if (existeVerbaDecimoTerceiro) {
                    existeDemaisVerbas = true;
                }
                if (existeDemaisVerbas) {
                    OcorrenciaDeIrpf ocorrenciaNormal = new OcorrenciaDeIrpf(TipoOcorrenciaIrpfEnum.NORMAL);
                    ocorrenciaNormal.setDataOcorrencia(calculo.getDataDeLiquidacao());
                    ocorrenciaNormal.setValorVerbas(verbaNormal);
                    ocorrenciaNormal.setValorJuros(jurosNormal);
                    ocorrenciaNormal.setValorContribuicaoSocial(descontoContribuicaoSocialNormal);
                    ocorrenciaNormal.setValorPrevidenciaPrivada(descontoPrevidenciaPrivadaNormal);
                    ocorrenciaNormal.setValorPensaoAlimenticia(descontoPensaoAlimenticiaNormal);
                    ocorrenciaNormal.setValorHonorarios(descontoHonorariosNormal);
                    ocorrenciaNormal.setValorDependentes(descontoBaseParaDependentes);
                    ocorrenciaNormal.setValorAposentadoMaiorQue65(descontoBaseParaAposentadoMaiorQue65Anos);
                    ocorrenciaNormal.atualizaBase();
                    faixa = this.tabelaImpostoRenda.obterFaixaParaValor(ocorrenciaNormal.getValorBase());
                    ocorrenciaNormal.setValorInicialFaixa(faixa.getValorInicial());
                    ocorrenciaNormal.setValorFinalFaixa(faixa.getValorFinal());
                    ocorrenciaNormal.setValorAliquota(faixa.getAliquota());
                    ocorrenciaNormal.setValorDeducao(faixa.getDeducao());
                    ocorrenciaNormal.atualizaValorDevido();
                    ocorrenciaNormal.setIrpf(this.irpf);
                    this.irpf.getOcorrencias().add(ocorrenciaNormal);
                }
            }
        }
    }

    public BigDecimal getTotalDiferencaComJurosEMultaAtualizacaoPagamentoNoSaldo(Date dataEvento) {
        List<OcorrenciaDeIrpfPagamento> ocorrencias = OcorrenciaDeIrpfPagamento.obterParaDataDoEventoPagamentoNosaldo(this.irpf, dataEvento);
        BigDecimal somaDevido = BigDecimal.ZERO;
        for (OcorrenciaDeIrpfPagamento o : ocorrencias) {
            somaDevido = Utils.somar(somaDevido, o.getTotal(), somaDevido);
        }
        return somaDevido;
    }

    public BigDecimal getTotalDiferencaComJurosEMultaAtualizacao() {
        List<OcorrenciaDeIrpfPagamento> ocorrencias = OcorrenciaDeIrpfPagamento.obterParaDataDoEvento(this.irpf);
        BigDecimal somaDevido = BigDecimal.ZERO;
        for (OcorrenciaDeIrpfPagamento o : ocorrencias) {
            somaDevido = Utils.somar(somaDevido, o.getTotal(), somaDevido);
        }
        return somaDevido;
    }

    public BigDecimal getTotalDevidoComJurosEMultaAtualizacao(Date dataEvento) {
        List<OcorrenciaDeIrpfPagamento> ocorrencias = this.construirOcorrenciasParaPagamento(dataEvento);
        BigDecimal somaDevido = BigDecimal.ZERO;
        for (OcorrenciaDeIrpfPagamento o : ocorrencias) {
            somaDevido = Utils.somar(somaDevido, o.getTotal(), somaDevido);
        }
        return somaDevido;
    }

    private List<OcorrenciaDeIrpfPagamento> construirOcorrenciasParaPagamento(Date dataEvento) {
        TreeSet<Date> datasDeEvento = new TreeSet<Date>();
        ArrayList<OcorrenciaDeIrpfPagamento> ocorrenciasPagamentos = new ArrayList<OcorrenciaDeIrpfPagamento>();
        List<OcorrenciaDeIrpfAtualizacao> ocorrencias = OcorrenciaDeIrpfAtualizacao.obterAteDataEvento(this.irpf, dataEvento);
        TreeMap ocorrenciasPorDataEvento = new TreeMap();
        if (Utils.naoNulo(ocorrencias) && !ocorrencias.isEmpty()) {
            for (OcorrenciaDeIrpfAtualizacao ocorrenciaDeIrpfAtualizacao : ocorrencias) {
                datasDeEvento.add(ocorrenciaDeIrpfAtualizacao.getDataEvento());
            }
            for (Date date : datasDeEvento) {
                ArrayList<OcorrenciaDeIrpfAtualizacao> ocorr = new ArrayList<OcorrenciaDeIrpfAtualizacao>();
                for (OcorrenciaDeIrpfAtualizacao o : ocorrencias) {
                    if (!o.getDataEvento().equals(date)) continue;
                    ocorr.add(o);
                }
                ocorrenciasPorDataEvento.put(date, ocorr);
            }
            for (Map.Entry entry : ocorrenciasPorDataEvento.entrySet()) {
                Date key = (Date)entry.getKey();
                List value = (List)entry.getValue();
                BigDecimal somaDevido = BigDecimal.ZERO;
                BigDecimal somaDevidoSaldo = BigDecimal.ZERO;
                Irpf irpf = ((OcorrenciaDeIrpfAtualizacao)value.get(0)).getIrpf();
                for (OcorrenciaDeIrpfAtualizacao o : value) {
                    if (o.getHasPagamento().booleanValue()) {
                        somaDevido = Utils.somar(somaDevido, o.getValorDevido(), somaDevido);
                        continue;
                    }
                    somaDevidoSaldo = Utils.somar(somaDevidoSaldo, o.getValorDevido(), somaDevidoSaldo);
                }
                this.tabelaTaxaDeMulta = TaxaMultaPrevidenciaria.obterTaxaNa(DATA_TAXA_DIARIA_MULTA);
                BigDecimal taxaDeJuros = null;
                BigDecimal taxaDeMulta = null;
                if (irpf.getCobrarEncargos().booleanValue()) {
                    taxaDeJuros = this.calcularTaxaDeJurosDeIrpf(key, dataEvento);
                    taxaDeMulta = this.calcularTaxaDeMultaDeIrpf(key, dataEvento);
                }
                taxaDeJuros = taxaDeJuros != null ? taxaDeJuros : BigDecimal.ZERO;
                taxaDeMulta = taxaDeMulta != null ? taxaDeMulta : BigDecimal.ZERO;
                OcorrenciaDeIrpfPagamento ultimaOcorrenciaParaDataDoEvento = OcorrenciaDeIrpfPagamento.obterParaDataDoEventoComSaldoAPagar(key, irpf);
                OcorrenciaDeIrpfPagamento irpfPagamento = null;
                OcorrenciaDeIrpfPagamento irpfPagamentoSaldo = null;
                if (Utils.naoNulo(ultimaOcorrenciaParaDataDoEvento)) {
                    BigDecimal devidoAnterior = ultimaOcorrenciaParaDataDoEvento.getDevidoDiferenca();
                    if (devidoAnterior.compareTo(BigDecimal.ZERO) != 0) {
                        irpfPagamento = new OcorrenciaDeIrpfPagamento(irpf, devidoAnterior, taxaDeJuros, taxaDeMulta, key, dataEvento);
                    }
                } else if (somaDevido.compareTo(BigDecimal.ZERO) != 0) {
                    irpfPagamento = new OcorrenciaDeIrpfPagamento(irpf, somaDevido, taxaDeJuros, taxaDeMulta, key, dataEvento);
                }
                if (Utils.naoNulo(somaDevidoSaldo) && somaDevidoSaldo.compareTo(BigDecimal.ZERO) > 0) {
                    irpfPagamentoSaldo = new OcorrenciaDeIrpfPagamento(irpf, somaDevidoSaldo, taxaDeJuros, taxaDeMulta, key, dataEvento);
                    irpfPagamentoSaldo.setCalculadoNoSaldo(true);
                }
                if (Utils.naoNulo(irpfPagamento)) {
                    ocorrenciasPagamentos.add(irpfPagamento);
                }
                if (!Utils.naoNulo(irpfPagamentoSaldo)) continue;
                ocorrenciasPagamentos.add(irpfPagamentoSaldo);
            }
        }
        return ocorrenciasPagamentos;
    }

    public void aplicarPagamento(Date dataEvento, Pagamento pagamento) {
        if (this.irpf.getApurarImpostoRenda().booleanValue()) {
            BigDecimal valorPagamento = BigDecimal.ZERO;
            if (this.irpf.getCobrarDoReclamado().booleanValue()) {
                valorPagamento = pagamento.getValorParaPagamentoOutrosDebitosReclamadoImpostoDeRendaDoReclamante();
            } else if (pagamento.getSelecionarImpostoDoReclamante().booleanValue() && !pagamento.getApurarImpostoDoReclamante().booleanValue()) {
                valorPagamento = pagamento.getValorParaRecolhimentoDebitosReclamanteImpostoDoReclamante();
            } else if (pagamento.getSelecionarImpostoDoReclamante().booleanValue() && pagamento.getApurarImpostoDoReclamante().booleanValue()) {
                valorPagamento = this.getTotalDevidoDeImpostoReferenteAoPagamento(pagamento);
            }
            if (Utils.naoNulo(valorPagamento) && BigDecimal.ZERO.compareTo(valorPagamento) < 0) {
                List<OcorrenciaDeIrpfPagamento> ocorrenciasParaPagamento = this.construirOcorrenciasParaPagamento(dataEvento);
                for (OcorrenciaDeIrpfPagamento ocorrencia : ocorrenciasParaPagamento) {
                    ocorrencia.aplicarPagamento(valorPagamento);
                    valorPagamento = Utils.subtrair(valorPagamento, ocorrencia.getPago());
                }
                EntidadeBase.salvar(ocorrenciasParaPagamento);
            }
        }
    }

    public void aplicarPagamentoNoSaldo(Date dataEvento) {
        if (this.irpf.getApurarImpostoRenda().booleanValue()) {
            BigDecimal valorPagamento = BigDecimal.ZERO;
            List<OcorrenciaDeIrpfPagamento> ocorrenciasParaPagamento = this.construirOcorrenciasParaPagamento(dataEvento);
            for (OcorrenciaDeIrpfPagamento ocorrencia : ocorrenciasParaPagamento) {
                ocorrencia.aplicarPagamento(valorPagamento);
                ocorrencia.setPagamentoNoSaldo(true);
                valorPagamento = Utils.subtrair(valorPagamento, ocorrencia.getPago());
            }
            EntidadeBase.salvar(ocorrenciasParaPagamento);
        }
    }

    protected BigDecimal getTotalDevidoDeImpostoReferenteAoPagamento(Pagamento pagamento) {
        List<OcorrenciaDeIrpfAtualizacao> ocorrencias = OcorrenciaDeIrpfAtualizacao.obterOcorrenciasDaData(this.irpf, pagamento.getDataPagamento());
        BigDecimal totalDevido = BigDecimal.ZERO;
        for (OcorrenciaDeIrpfAtualizacao o : ocorrencias) {
            totalDevido = Utils.somar(totalDevido, o.getValorDevido(), totalDevido);
        }
        return totalDevido;
    }

    private BigDecimal calcularTaxaDeJurosDeIrpf(Date dataOcorrencia, Date dataEvento) {
        Date dataOcorrenciaDiaPrimeiro = HelperDate.getInstance(dataOcorrencia).setDay(1).getDate();
        this.tabelaDeJurosIrpf = new TabelaDeJurosDeIrpf(this.irpf.getCalculo(), dataOcorrenciaDiaPrimeiro, dataEvento);
        return this.tabelaDeJurosIrpf.calcularTaxaDeJuros(dataOcorrenciaDiaPrimeiro);
    }

    private BigDecimal calcularTaxaDeMultaDeIrpf(Date dataPagamento, Date dataEvento) {
        Competencia competencia = new Competencia();
        competencia.update(dataPagamento);
        if (Utils.naoNulo(this.tabelaTaxaDeMulta) && Utils.naoNulo(competencia.getData()) && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(dataEvento).getDate())) {
            return this.tabelaTaxaDeMulta.resolverTaxaIrpf(competencia, dataEvento);
        }
        return null;
    }
}

