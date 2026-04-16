/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;

public class ProporcoesIrpf
implements Serializable {
    private static final long serialVersionUID = 1L;
    private BigDecimal proporcaoFerias;
    private BigDecimal proporcaoDecimo;
    private BigDecimal proporcaoAnosAnteriores;
    private BigDecimal proporcaoNormal;
    private BigDecimal proporcaoJurosDecimo;
    private BigDecimal proporcaoJurosFerias;
    private BigDecimal proporcaoJurosAnosAnteriores;
    private BigDecimal proporcaoJurosNormal;
    private BigDecimal proporcaoInssDecimo;
    private BigDecimal proporcaoInssFerias;
    private BigDecimal proporcaoInssAnosAnteriores;
    private BigDecimal proporcaoInssNormal;
    private BigDecimal proporcaoPrevidenciaPrivadaDecimo;
    private BigDecimal proporcaoPrevidenciaPrivadaFerias;
    private BigDecimal proporcaoPrevidenciaPrivadaAnosAnteriores;
    private BigDecimal proporcaoPrevidenciaPrivadaNormal;

    public ProporcoesIrpf(CreditosDoReclamante creditosDoReclamante, Irpf irpf) {
        BigDecimal valorPrincipalCorrigido;
        BigDecimal verbaAnosAnteriores = BigDecimal.ZERO;
        BigDecimal verbaIrpfTotalDevido = BigDecimal.ZERO;
        BigDecimal verbaFerias = BigDecimal.ZERO;
        BigDecimal verbaFeriasGozadas = BigDecimal.ZERO;
        BigDecimal verbaDecimoTerceiro = BigDecimal.ZERO;
        BigDecimal verbaDemaisVerbas = BigDecimal.ZERO;
        HelperDate dataLimiteAnosAnteriores = HelperDate.getInstance(irpf.getCalculo().getDataDeLiquidacao());
        dataLimiteAnosAnteriores.setMonth(0);
        dataLimiteAnosAnteriores.setDay(1);
        for (VerbaDeCalculo verba : irpf.getCalculo().getVerbasAtivas()) {
            if (!verba.getIncidenciaIRPF().booleanValue()) continue;
            verbaIrpfTotalDevido = Utils.somar(verbaIrpfTotalDevido, verba.getValorTotalDiferencaCorrigida(), verbaIrpfTotalDevido);
            for (OcorrenciaDeVerba ocorrenciaVerbas : verba.getOcorrenciasAtivas()) {
                BigDecimal base;
                BigDecimal valorOcorrenciaCorrigida = Utils.arredondarValorMonetario(ocorrenciaVerbas.getDiferencaCorrigida());
                if ((Utils.nulo(irpf.getRegimeDeCaixa()) || !irpf.getRegimeDeCaixa().booleanValue()) && HelperDate.dateBefore(ocorrenciaVerbas.getDataInicial(), dataLimiteAnosAnteriores.getDate())) {
                    if (BigDecimal.ZERO.compareTo(valorOcorrenciaCorrigida) == 0 || !Utils.naoNulo(base = ocorrenciaVerbas.getDiferencaCorrigidaParaCalculoDasIncidencias())) continue;
                    verbaAnosAnteriores = verbaAnosAnteriores.add(base, Utils.CONTEXTO_MATEMATICO);
                    continue;
                }
                switch (verba.getCaracteristica()) {
                    case DECIMO_TERCEIRO_SALARIO: {
                        verbaDecimoTerceiro = verbaDecimoTerceiro.add(valorOcorrenciaCorrigida, Utils.CONTEXTO_MATEMATICO);
                        break;
                    }
                    case FERIAS: {
                        base = ocorrenciaVerbas.getDiferencaCorrigidaParaCalculoDasIncidencias();
                        if (!Utils.naoNulo(base)) break;
                        verbaFerias = verbaFerias.add(base, Utils.CONTEXTO_MATEMATICO);
                        verbaFeriasGozadas = verbaFeriasGozadas.add(base, Utils.CONTEXTO_MATEMATICO);
                        break;
                    }
                    case AVISO_PREVIO: 
                    case COMUM: {
                        verbaDemaisVerbas = verbaDemaisVerbas.add(valorOcorrenciaCorrigida, Utils.CONTEXTO_MATEMATICO);
                    }
                }
            }
        }
        if (irpf.getIncidirSobreJurosDeMora().booleanValue()) {
            BigDecimal jurosAnosAnteriores = BigDecimal.ZERO;
            BigDecimal jurosDecimoTerceiro = BigDecimal.ZERO;
            BigDecimal jurosFerias = BigDecimal.ZERO;
            BigDecimal jurosDemaisVerbas = BigDecimal.ZERO;
            for (ApuracaoDeJuros ocorrenciaJuros : irpf.getCalculo().getApuracoesDeJuros()) {
                if (!irpf.getRegimeDeCaixa().booleanValue() && HelperDate.dateBefore(ocorrenciaJuros.getCompetencia(), dataLimiteAnosAnteriores.getDate())) {
                    jurosAnosAnteriores = jurosAnosAnteriores.add(Utils.arredondarValorMonetario(ocorrenciaJuros.getJurosParaIrpfDecimoTerceiro()));
                    jurosAnosAnteriores = jurosAnosAnteriores.add(Utils.arredondarValorMonetario(ocorrenciaJuros.getJurosParaIrpfFerias()));
                    jurosAnosAnteriores = jurosAnosAnteriores.add(Utils.arredondarValorMonetario(ocorrenciaJuros.getJurosParaIrpfDemaisVerbas()));
                    continue;
                }
                jurosDecimoTerceiro = jurosDecimoTerceiro.add(Utils.arredondarValorMonetario(ocorrenciaJuros.getJurosParaIrpfDecimoTerceiro()));
                jurosFerias = jurosFerias.add(Utils.arredondarValorMonetario(ocorrenciaJuros.getJurosParaIrpfFerias()));
                jurosDemaisVerbas = jurosDemaisVerbas.add(Utils.arredondarValorMonetario(ocorrenciaJuros.getJurosParaIrpfDemaisVerbas()));
            }
            BigDecimal juroPrincipal = creditosDoReclamante.getJuroPrincipal();
            if (BigDecimal.ZERO.compareTo(juroPrincipal) != 0) {
                this.proporcaoJurosAnosAnteriores = Utils.dividir(jurosAnosAnteriores, juroPrincipal);
                this.proporcaoJurosDecimo = Utils.dividir(jurosDecimoTerceiro, juroPrincipal);
                this.proporcaoJurosFerias = Utils.dividir(jurosFerias, juroPrincipal);
                this.proporcaoJurosNormal = Utils.dividir(jurosDemaisVerbas, juroPrincipal);
            }
        }
        if (BigDecimal.ZERO.compareTo(valorPrincipalCorrigido = creditosDoReclamante.getValorPrincipal()) != 0) {
            this.proporcaoDecimo = Utils.dividir(verbaDecimoTerceiro, valorPrincipalCorrigido);
            this.proporcaoFerias = Utils.dividir(verbaFerias, valorPrincipalCorrigido);
            this.proporcaoAnosAnteriores = Utils.dividir(verbaAnosAnteriores, valorPrincipalCorrigido);
            this.proporcaoNormal = Utils.dividir(verbaDemaisVerbas, valorPrincipalCorrigido);
        }
        BigDecimal descontoInssTotal = BigDecimal.ZERO;
        BigDecimal descontoInssExclusiva = BigDecimal.ZERO;
        BigDecimal descontoInssEmSeparado = BigDecimal.ZERO;
        BigDecimal descontoInssAnosAnteriores = BigDecimal.ZERO;
        BigDecimal descontoInssNormal = BigDecimal.ZERO;
        BigDecimal descontoPrevidenciaPrivadaTotal = BigDecimal.ZERO;
        BigDecimal descontoPrevidenciaPrivadaExclusiva = BigDecimal.ZERO;
        BigDecimal descontoPrevidenciaPrivadaEmSeparado = BigDecimal.ZERO;
        BigDecimal descontoPrevidenciaPrivadaAnosAnteriores = BigDecimal.ZERO;
        BigDecimal descontoPrevidenciaPrivadaNormal = BigDecimal.ZERO;
        for (OcorrenciaDeIrpf ocorrencia : irpf.getOcorrencias()) {
            descontoInssTotal = Utils.somar(descontoInssTotal, ocorrencia.getValorContribuicaoSocial(), descontoInssTotal);
            descontoPrevidenciaPrivadaTotal = Utils.somar(descontoPrevidenciaPrivadaTotal, ocorrencia.getValorPrevidenciaPrivada(), descontoPrevidenciaPrivadaTotal);
            switch (ocorrencia.getTipo()) {
                case NORMAL: {
                    descontoInssNormal = Utils.somar(descontoInssNormal, ocorrencia.getValorContribuicaoSocial(), descontoInssNormal);
                    descontoPrevidenciaPrivadaNormal = Utils.somar(descontoPrevidenciaPrivadaNormal, ocorrencia.getValorPrevidenciaPrivada(), descontoPrevidenciaPrivadaNormal);
                    break;
                }
                case TRIBUTACAO_EXCLUSIVA: {
                    descontoInssExclusiva = Utils.somar(descontoInssExclusiva, ocorrencia.getValorContribuicaoSocial(), descontoInssExclusiva);
                    descontoPrevidenciaPrivadaExclusiva = Utils.somar(descontoPrevidenciaPrivadaExclusiva, ocorrencia.getValorPrevidenciaPrivada(), descontoPrevidenciaPrivadaExclusiva);
                    break;
                }
                case TRIBUTACAO_EM_SEPARADO: {
                    descontoInssEmSeparado = Utils.somar(descontoInssEmSeparado, ocorrencia.getValorContribuicaoSocial(), descontoInssEmSeparado);
                    descontoPrevidenciaPrivadaEmSeparado = Utils.somar(descontoPrevidenciaPrivadaEmSeparado, ocorrencia.getValorPrevidenciaPrivada(), descontoPrevidenciaPrivadaEmSeparado);
                    break;
                }
                case RRA_ANOS_ANTERIORES: {
                    descontoInssAnosAnteriores = Utils.somar(descontoInssAnosAnteriores, ocorrencia.getValorContribuicaoSocial(), descontoInssAnosAnteriores);
                    descontoPrevidenciaPrivadaAnosAnteriores = Utils.somar(descontoPrevidenciaPrivadaAnosAnteriores, ocorrencia.getValorPrevidenciaPrivada(), descontoPrevidenciaPrivadaAnosAnteriores);
                }
            }
        }
        if (BigDecimal.ZERO.compareTo(descontoInssTotal) != 0) {
            this.proporcaoInssDecimo = Utils.dividir(descontoInssExclusiva, descontoInssTotal);
            this.proporcaoInssFerias = Utils.dividir(descontoInssEmSeparado, descontoInssTotal);
            this.proporcaoInssAnosAnteriores = Utils.dividir(descontoInssAnosAnteriores, descontoInssTotal);
            this.proporcaoInssNormal = Utils.dividir(descontoInssNormal, descontoInssTotal);
        }
        if (BigDecimal.ZERO.compareTo(descontoPrevidenciaPrivadaTotal) != 0) {
            this.proporcaoPrevidenciaPrivadaDecimo = Utils.dividir(descontoPrevidenciaPrivadaExclusiva, descontoPrevidenciaPrivadaTotal);
            this.proporcaoPrevidenciaPrivadaFerias = Utils.dividir(descontoPrevidenciaPrivadaEmSeparado, descontoPrevidenciaPrivadaTotal);
            this.proporcaoPrevidenciaPrivadaAnosAnteriores = Utils.dividir(descontoPrevidenciaPrivadaAnosAnteriores, descontoPrevidenciaPrivadaTotal);
            this.proporcaoPrevidenciaPrivadaNormal = Utils.dividir(descontoPrevidenciaPrivadaNormal, descontoPrevidenciaPrivadaTotal);
        }
    }

    public BigDecimal getProporcaoFerias() {
        return this.proporcaoFerias;
    }

    public BigDecimal getProporcaoDecimo() {
        return this.proporcaoDecimo;
    }

    public BigDecimal getProporcaoNormal() {
        return this.proporcaoNormal;
    }

    public BigDecimal getProporcaoInssDecimo() {
        return this.proporcaoInssDecimo;
    }

    public BigDecimal getProporcaoInssFerias() {
        return this.proporcaoInssFerias;
    }

    public BigDecimal getProporcaoInssAnosAnteriores() {
        return this.proporcaoInssAnosAnteriores;
    }

    public BigDecimal getProporcaoInssNormal() {
        return this.proporcaoInssNormal;
    }

    public BigDecimal getProporcaoPrevidenciaPrivadaDecimo() {
        return this.proporcaoPrevidenciaPrivadaDecimo;
    }

    public BigDecimal getProporcaoPrevidenciaPrivadaFerias() {
        return this.proporcaoPrevidenciaPrivadaFerias;
    }

    public BigDecimal getProporcaoPrevidenciaPrivadaAnosAnteriores() {
        return this.proporcaoPrevidenciaPrivadaAnosAnteriores;
    }

    public BigDecimal getProporcaoPrevidenciaPrivadaNormal() {
        return this.proporcaoPrevidenciaPrivadaNormal;
    }

    public BigDecimal getProporcaoAnosAnteriores() {
        return this.proporcaoAnosAnteriores;
    }

    public BigDecimal getProporcaoJurosDecimo() {
        return this.proporcaoJurosDecimo;
    }

    public BigDecimal getProporcaoJurosFerias() {
        return this.proporcaoJurosFerias;
    }

    public BigDecimal getProporcaoJurosAnosAnteriores() {
        return this.proporcaoJurosAnosAnteriores;
    }

    public BigDecimal getProporcaoJurosNormal() {
        return this.proporcaoJurosNormal;
    }
}

