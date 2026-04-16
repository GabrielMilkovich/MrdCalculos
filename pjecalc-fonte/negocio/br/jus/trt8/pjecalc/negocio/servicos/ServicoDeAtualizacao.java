/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.EsferaPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoTerceirosInteressadosEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.IndicePrecatorio;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ServicoAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf.JurosSelicParaCorrecao;
import br.jus.trt8.pjecalc.negocio.servicos.AtualizacaoPrecatorioDTO;
import br.jus.trt8.pjecalc.negocio.servicos.AtualizacaoPrecatorioSIPDTO;
import br.jus.trt8.pjecalc.negocio.servicos.AtualizacaoPrecatorioSIPIndicesDTO;
import br.jus.trt8.pjecalc.negocio.servicos.BeneficiarioSIPDTO;
import br.jus.trt8.pjecalc.negocio.servicos.EnteFederacaoEnum;
import br.jus.trt8.pjecalc.negocio.servicos.PagamentoBeneficiarioSIPDTO;
import br.jus.trt8.pjecalc.negocio.servicos.PagamentoTerceiroSIPDTO;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeJustificativa;
import br.jus.trt8.pjecalc.negocio.servicos.TerceiroInteressadoSIPDTO;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.TreeSet;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Name(value="servicoDeAtualizacao")
@Scope(value=ScopeType.STATELESS)
@AutoCreate
public class ServicoDeAtualizacao
implements Serializable {
    private static final long serialVersionUID = 1L;
    private static final int PRECISAO_QUATRO_CASAS = 4;
    private static final int PRECISAO_NOVE_CASAS = 9;
    private static final int SUBTRAIR_DOZE = -12;
    private static final int PARA_PERCENTUAL = 100;
    @In
    private ServicoDeJustificativa servicoDeJustificativa;
    private static final Logger LOGGER = LoggerFactory.getLogger(ServicoDeAtualizacao.class);

    public BigDecimal calcularSelicDoPeriodo(Date dataInicial, Date dataFinal) {
        if (dataInicial == null || dataFinal == null) {
            dataFinal = new Date();
            dataInicial = HelperDate.getInstance(dataFinal).addMonth(-12).getDate();
        }
        Periodo periodo = new Periodo(dataInicial, dataFinal);
        return JurosSelicParaCorrecao.obterAcumuladoNo(periodo);
    }

    public AtualizacaoPrecatorioDTO atualizarPrecatorio(AtualizacaoPrecatorioDTO precatorio) {
        BigDecimal indiceCorrecao = new BigDecimal(1);
        indiceCorrecao = precatorio.getEnte().equals((Object)EnteFederacaoEnum.ESTADO_MUNICIPIO) ? IndicePrecatorio.encontrarIndiceCorrecaoPrecatorio(precatorio.getDataUltimaAtualizacaoCalculo(), precatorio.getDataExpedicaoPrecatorio(), precatorio.getDataFim(), false) : IndicePrecatorio.encontrarIndiceCorrecaoPrecatorio(precatorio.getDataUltimaAtualizacaoCalculo(), precatorio.getDataExpedicaoPrecatorio(), precatorio.getDataFim(), true);
        BigDecimal taxaJuros = ServicoAtualizacaoUtils.encontrarTaxaDeJurosPrecatorio(precatorio.getDataUltimaAtualizacaoCalculo(), precatorio.getDataExpedicaoPrecatorio(), precatorio.getDataFim());
        taxaJuros = taxaJuros.divide(new BigDecimal(100));
        BigDecimal principalCorrigido = precatorio.getPrincipal().multiply(indiceCorrecao);
        BigDecimal jurosEmCimaPrincipalCorrigido = principalCorrigido.multiply(taxaJuros);
        BigDecimal jurosCorrigidos = precatorio.getJuros().multiply(indiceCorrecao);
        BigDecimal jurosFinal = jurosCorrigidos.add(jurosEmCimaPrincipalCorrigido);
        BigDecimal outrosDebitosCorrigidos = precatorio.getOutrosDebitosDoReclamado().multiply(indiceCorrecao);
        precatorio.setPrincipal(Utils.arredondarValorMonetario(principalCorrigido));
        precatorio.setJuros(Utils.arredondarValorMonetario(jurosFinal));
        precatorio.setOutrosDebitosDoReclamado(Utils.arredondarValorMonetario(outrosDebitosCorrigidos));
        return precatorio;
    }

    public List<AtualizacaoPrecatorioSIPDTO> atualizarPrecatoriosSIP(List<AtualizacaoPrecatorioSIPDTO> precatorios) {
        ArrayList<AtualizacaoPrecatorioSIPDTO> atualizados = new ArrayList<AtualizacaoPrecatorioSIPDTO>();
        for (AtualizacaoPrecatorioSIPDTO precatorio : precatorios) {
            if (precatorio.getBeneficiarios().size() > 1) continue;
            AtualizacaoPrecatorioSIPDTO atualizado = this.atualizarPrecatorioSIP(precatorio);
            atualizado.getBeneficiarios().forEach(b -> {
                b.setCustasJudiciais(Utils.arredondarValorMonetario(b.getCustasJudiciais()));
                b.setExeqLiquido(Utils.arredondarValorMonetario(b.getExeqLiquido()));
                b.setFgtsDeposito(Utils.arredondarValorMonetario(b.getFgtsDeposito()));
                b.setImpostoDeRenda(Utils.arredondarValorMonetario(b.getImpostoDeRenda()));
                b.setInssBeneficiario(Utils.arredondarValorMonetario(b.getInssBeneficiario()));
                b.setInssExecutado(Utils.arredondarValorMonetario(b.getInssExecutado()));
                b.setPagamentos(null);
            });
            atualizado.getTerceirosInteressados().forEach(b -> {
                b.setLiquido(Utils.arredondarValorMonetario(b.getLiquido()));
                b.setImpostoDeRenda(Utils.arredondarValorMonetario(b.getImpostoDeRenda()));
                b.setPagamentos(null);
            });
            atualizado.setJuros(Utils.arredondarValorMonetario(atualizado.getJuros()));
            atualizados.add(atualizado);
        }
        return atualizados;
    }

    private AtualizacaoPrecatorioSIPDTO atualizarPrecatorioSIP(AtualizacaoPrecatorioSIPDTO precatorio) {
        boolean possuiPagamentoNoSaldo = false;
        Date dataInicioAtualizacao = HelperDate.getInstance(precatorio.getDataUltimaAtualizacao()).addDay(1).getDate();
        TreeSet<Date> eventos = new TreeSet<Date>();
        for (BeneficiarioSIPDTO beneficiario : precatorio.getBeneficiarios()) {
            for (PagamentoBeneficiarioSIPDTO pagamentoBeneficiarioSIPDTO : beneficiario.getPagamentos()) {
                if (HelperDate.dateBefore(pagamentoBeneficiarioSIPDTO.getPagData(), precatorio.getDataFim()) && HelperDate.dateAfterOrEquals(pagamentoBeneficiarioSIPDTO.getPagData(), dataInicioAtualizacao)) {
                    eventos.add(pagamentoBeneficiarioSIPDTO.getPagData());
                    continue;
                }
                if (!HelperDate.dateEquals(pagamentoBeneficiarioSIPDTO.getPagData(), precatorio.getDataFim())) continue;
                possuiPagamentoNoSaldo = true;
            }
        }
        for (TerceiroInteressadoSIPDTO terceiro : precatorio.getTerceirosInteressados()) {
            for (PagamentoTerceiroSIPDTO pagamentoTerceiroSIPDTO : terceiro.getPagamentos()) {
                if (HelperDate.dateBefore(pagamentoTerceiroSIPDTO.getPagData(), precatorio.getDataFim()) && HelperDate.dateAfterOrEquals(pagamentoTerceiroSIPDTO.getPagData(), dataInicioAtualizacao)) {
                    eventos.add(pagamentoTerceiroSIPDTO.getPagData());
                    continue;
                }
                if (!HelperDate.dateEquals(pagamentoTerceiroSIPDTO.getPagData(), precatorio.getDataFim())) continue;
                possuiPagamentoNoSaldo = true;
            }
        }
        eventos.add(precatorio.getDataFim());
        Periodo periodoDaGraca = ServicoAtualizacaoUtils.encontrarPeriodoDaGraca(precatorio.getDataExpedicao(), precatorio.getTipo());
        AtualizacaoPrecatorioSIPDTO anterior = null;
        Date dataEventoAnterior = null;
        for (Date dataEvento : eventos) {
            Date dataInicio = HelperDate.getInstance(anterior == null ? precatorio.getDataUltimaAtualizacao() : dataEventoAnterior).addDay(1).getDate();
            Date dataFim = HelperDate.getInstance(dataEvento).getDate();
            anterior = this.atualizarSIP(precatorio, dataInicio, dataFim, periodoDaGraca, anterior);
            dataEventoAnterior = HelperDate.getInstance(dataEvento).getDate();
        }
        if (possuiPagamentoNoSaldo) {
            Date date = HelperDate.getInstance(precatorio.getDataFim()).addDay(1).getDate();
            anterior = this.atualizarSIP(precatorio, date, precatorio.getDataFim(), periodoDaGraca, anterior);
        }
        return anterior;
    }

    private AtualizacaoPrecatorioSIPDTO atualizarSIP(AtualizacaoPrecatorioSIPDTO precatorioOriginal, Date dataInicio, Date dataFim, Periodo periodoDaGraca, AtualizacaoPrecatorioSIPDTO atualizacaoAnterior) {
        AtualizacaoPrecatorioSIPDTO precatorio = atualizacaoAnterior != null ? atualizacaoAnterior : precatorioOriginal;
        Date dataInicioEC1362025 = HelperDate.getInstance(precatorio.getEsfera() == EsferaPrecatorioEnum.F ? "01/09/2025" : "01/08/2025").getDate();
        Periodo periodoAtualizacao = new Periodo(dataInicio, dataFim);
        BigDecimal indiceCorrecao = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, dataInicioEC1362025, precatorio.getEsfera().getGrupo(), false);
        BigDecimal indiceCorrecaoParaJuros = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, dataInicioEC1362025, precatorio.getEsfera().getGrupo(), true);
        BigDecimal taxaJuros = ServicoAtualizacaoUtils.encontrarTaxaDeJurosPrecatorioSIP(dataInicio, dataFim, dataInicioEC1362025, periodoDaGraca);
        AtualizacaoPrecatorioSIPDTO precatorioAtualizado = new AtualizacaoPrecatorioSIPDTO(precatorio);
        BigDecimal totalHonorarios = BigDecimal.ZERO;
        for (TerceiroInteressadoSIPDTO terceiro : precatorio.getTerceirosInteressados()) {
            totalHonorarios = Utils.somar(totalHonorarios, terceiro.getLiquido(), totalHonorarios);
            totalHonorarios = Utils.somar(totalHonorarios, terceiro.getImpostoDeRenda(), totalHonorarios);
        }
        BeneficiarioSIPDTO beneficiario = precatorio.getBeneficiarios().isEmpty() ? new BeneficiarioSIPDTO() : precatorio.getBeneficiarios().get(0);
        BeneficiarioSIPDTO beneficiarioAtualizado = new BeneficiarioSIPDTO();
        BigDecimal bruto = Utils.somar(beneficiario.getExeqLiquido(), Utils.somar(beneficiario.getImpostoDeRenda(), Utils.somar(totalHonorarios, beneficiario.getFgtsDeposito())));
        BigDecimal proporcaoJuros = bruto.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : Utils.dividir(precatorio.getJuros(), bruto);
        BigDecimal jurosFgts = atualizacaoAnterior == null ? Utils.multiplicar(beneficiario.getFgtsDeposito(), proporcaoJuros) : beneficiario.getJurosFgtsDeposito();
        BigDecimal liquidoJuros = Utils.subtrair(precatorio.getJuros(), jurosFgts);
        BigDecimal proporcaoPagExeqLiquido = beneficiario.getExeqLiquido().compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : Utils.dividir(PagamentoBeneficiarioSIPDTO.calcularTotalPagoExeqLiquido(beneficiario.getPagamentos(), dataInicio), beneficiario.getExeqLiquido());
        BigDecimal liquidoPrincipal = Utils.subtrair(beneficiario.getExeqLiquido(), liquidoJuros);
        BigDecimal pagLiquidoPrincipal = Utils.multiplicar(liquidoPrincipal, proporcaoPagExeqLiquido);
        BigDecimal liquidoPrincipalDiferenca = Utils.subtrair(liquidoPrincipal, pagLiquidoPrincipal);
        BigDecimal liquidoPrincipalDiferencaCorrigido = Utils.aplicarCorrecaoMonetaria(indiceCorrecao, liquidoPrincipalDiferenca);
        BigDecimal jurosPrincipalApurado = Utils.aplicarJuros(taxaJuros, liquidoPrincipalDiferencaCorrigido);
        BigDecimal pagJurosPrincipal = Utils.multiplicar(liquidoJuros, proporcaoPagExeqLiquido);
        BigDecimal liquidoJurosDiferenca = Utils.subtrair(liquidoJuros, pagJurosPrincipal);
        BigDecimal liquidoJurosDiferencaCorrigido = Utils.aplicarCorrecaoMonetaria(indiceCorrecaoParaJuros, liquidoJurosDiferenca);
        BigDecimal liquidoJurosComJurosECorrecao = Utils.somar(liquidoJurosDiferencaCorrigido, jurosPrincipalApurado);
        BigDecimal proporcaoPagFgtsDeposito = beneficiario.getFgtsDeposito().compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : Utils.dividir(PagamentoBeneficiarioSIPDTO.calcularTotalPagoFgtsDeposito(beneficiario.getPagamentos(), dataInicio), beneficiario.getFgtsDeposito());
        BigDecimal fgts = Utils.subtrair(beneficiario.getFgtsDeposito(), jurosFgts);
        BigDecimal pagFgts = Utils.multiplicar(fgts, proporcaoPagFgtsDeposito);
        BigDecimal fgtsDiferenca = Utils.subtrair(fgts, pagFgts);
        BigDecimal fgtsDiferencaCorrigido = Utils.aplicarCorrecaoMonetaria(indiceCorrecao, fgtsDiferenca);
        BigDecimal jurosFgtsApurado = Utils.aplicarJuros(taxaJuros, fgtsDiferencaCorrigido);
        BigDecimal pagJurosFgts = Utils.multiplicar(jurosFgts, proporcaoPagFgtsDeposito);
        BigDecimal jurosFgtsDiferenca = Utils.subtrair(jurosFgts, pagJurosFgts);
        BigDecimal jurosFgtsDiferencaCorrigido = Utils.aplicarCorrecaoMonetaria(indiceCorrecaoParaJuros, jurosFgtsDiferenca);
        BigDecimal jurosFgtsComJurosECorrecao = Utils.somar(jurosFgtsDiferencaCorrigido, jurosFgtsApurado);
        beneficiarioAtualizado.setId(beneficiario.getId());
        beneficiarioAtualizado.setExeqLiquido(Utils.somar(liquidoPrincipalDiferencaCorrigido, liquidoJurosComJurosECorrecao));
        beneficiarioAtualizado.setInssBeneficiario(Utils.aplicarCorrecaoMonetaria(indiceCorrecao, beneficiario.getInssBeneficiarioDiferenca(dataInicio)));
        beneficiarioAtualizado.setInssExecutado(Utils.aplicarCorrecaoMonetaria(indiceCorrecao, beneficiario.getInssExecutadoDiferenca(dataInicio)));
        beneficiarioAtualizado.setImpostoDeRenda(Utils.aplicarCorrecaoMonetaria(indiceCorrecao, beneficiario.getImpostoDeRendaDiferenca(dataInicio)));
        beneficiarioAtualizado.setCustasJudiciais(Utils.aplicarCorrecaoMonetaria(indiceCorrecao, beneficiario.getCustasJudiciaisDiferenca(dataInicio)));
        beneficiarioAtualizado.setFgtsDeposito(Utils.somar(fgtsDiferencaCorrigido, jurosFgtsComJurosECorrecao));
        beneficiarioAtualizado.setJurosFgtsDeposito(jurosFgtsComJurosECorrecao);
        beneficiarioAtualizado.setPagamentos(beneficiario.getPagamentos());
        if (!precatorio.getBeneficiarios().isEmpty()) {
            precatorioAtualizado.getBeneficiarios().add(beneficiarioAtualizado);
        }
        List<TerceiroInteressadoSIPDTO> terceirosAtualizados = this.atualizarTerceirosInteressados(precatorio, dataInicio, indiceCorrecao, indiceCorrecaoParaJuros, taxaJuros, beneficiario, bruto, atualizacaoAnterior);
        precatorioAtualizado.setTerceirosInteressados(terceirosAtualizados);
        BigDecimal jurosAtualizado = Utils.somar(Utils.somar(liquidoJurosDiferencaCorrigido, jurosPrincipalApurado), jurosFgtsComJurosECorrecao);
        precatorioAtualizado.setJuros(jurosAtualizado);
        return precatorioAtualizado;
    }

    private List<TerceiroInteressadoSIPDTO> atualizarTerceirosInteressados(AtualizacaoPrecatorioSIPDTO precatorio, Date dataInicio, BigDecimal indiceCorrecao, BigDecimal indiceCorrecaoParaJuros, BigDecimal taxaJuros, BeneficiarioSIPDTO beneficiario, BigDecimal bruto, AtualizacaoPrecatorioSIPDTO atualizacaoAnterior) {
        ArrayList<TerceiroInteressadoSIPDTO> atualizados = new ArrayList<TerceiroInteressadoSIPDTO>();
        for (TerceiroInteressadoSIPDTO terceiro : precatorio.getTerceirosInteressados()) {
            TerceiroInteressadoSIPDTO terceiroAnterior = null;
            if (atualizacaoAnterior != null) {
                terceiroAnterior = atualizacaoAnterior.getTerceirosInteressados().stream().filter(t -> t.getId().equals(terceiro.getId())).findFirst().orElse(null);
            }
            TerceiroInteressadoSIPDTO terceiroAtualizado = new TerceiroInteressadoSIPDTO();
            terceiroAtualizado.setId(terceiro.getId());
            terceiroAtualizado.setImpostoDeRenda(Utils.aplicarCorrecaoMonetaria(indiceCorrecao, terceiro.getImpostoDeRendaDiferenca(dataInicio)));
            terceiroAtualizado.setTipo(terceiro.getTipo());
            terceiroAtualizado.setPagamentos(terceiro.getPagamentos());
            if (!TipoTerceirosInteressadosEnum.PER.equals((Object)terceiro.getTipo())) {
                BigDecimal totalPagoLiquido = PagamentoTerceiroSIPDTO.calcularTotalPagoLiquido(terceiro.getPagamentos(), dataInicio);
                BigDecimal proporcaoPagLiquido = terceiro.getLiquido().compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : Utils.dividir(totalPagoLiquido, terceiro.getLiquido());
                BigDecimal totalHonorario = Utils.somar(terceiro.getLiquido(), terceiro.getImpostoDeRenda());
                BigDecimal divisorProporcaoJurosHonorario = Utils.somar(bruto, beneficiario.getInssBeneficiario());
                BigDecimal jurosHonorario = terceiroAnterior == null ? Utils.multiplicar(totalHonorario, divisorProporcaoJurosHonorario.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : Utils.dividir(precatorio.getJuros(), divisorProporcaoJurosHonorario)) : terceiroAnterior.getJurosTotal();
                BigDecimal totalHonorarioSemJuros = Utils.subtrair(totalHonorario, jurosHonorario);
                BigDecimal liquidoHonorario = Utils.subtrair(totalHonorarioSemJuros, terceiro.getImpostoDeRenda());
                BigDecimal pagJurosHonorario = Utils.multiplicar(jurosHonorario, proporcaoPagLiquido);
                BigDecimal pagLiquidoHonorario = Utils.multiplicar(liquidoHonorario, proporcaoPagLiquido);
                BigDecimal jurosHonorarioDiferenca = Utils.subtrair(jurosHonorario, pagJurosHonorario);
                BigDecimal liquidoHonorarioDiferenca = Utils.subtrair(liquidoHonorario, pagLiquidoHonorario);
                BigDecimal jurosHonorarioDiferencaCorrigido = Utils.aplicarCorrecaoMonetaria(indiceCorrecaoParaJuros, jurosHonorarioDiferenca);
                BigDecimal liquidoHonorarioDiferencaCorrigido = Utils.aplicarCorrecaoMonetaria(indiceCorrecao, liquidoHonorarioDiferenca);
                BigDecimal jurosHonorarioApurado = Utils.aplicarJuros(taxaJuros, liquidoHonorarioDiferencaCorrigido);
                BigDecimal jurosHonorarioTotal = Utils.somar(jurosHonorarioApurado, jurosHonorarioDiferencaCorrigido);
                terceiroAtualizado.setJurosTotal(jurosHonorarioTotal);
                terceiroAtualizado.setLiquido(Utils.somar(jurosHonorarioTotal, liquidoHonorarioDiferencaCorrigido));
            } else {
                terceiroAtualizado.setLiquido(Utils.aplicarCorrecaoMonetaria(indiceCorrecao, terceiro.getLiquidoDiferenca(dataInicio)));
            }
            atualizados.add(terceiroAtualizado);
        }
        return atualizados;
    }

    public List<AtualizacaoPrecatorioSIPIndicesDTO> atualizarPrecatoriosSIPIndices(List<AtualizacaoPrecatorioSIPIndicesDTO> precatorios) {
        ArrayList<AtualizacaoPrecatorioSIPIndicesDTO> precatoriosComIndices = new ArrayList<AtualizacaoPrecatorioSIPIndicesDTO>();
        for (AtualizacaoPrecatorioSIPIndicesDTO precatorio : precatorios) {
            try {
                Date dataInicio = HelperDate.getInstance(precatorio.getDataUltimaAtualizacao()).addDay(1).getDate();
                Date dataInicioEC1362025 = HelperDate.getInstance(precatorio.getEsferaPrecatorio() == EsferaPrecatorioEnum.F ? "01/09/2025" : "01/08/2025").getDate();
                Periodo periodoDaGraca = ServicoAtualizacaoUtils.encontrarPeriodoDaGraca(precatorio.getDataExpedicao(), TipoPrecatorioEnum.PRE);
                Periodo periodoAtualizacao = new Periodo(dataInicio, precatorio.getDataFim());
                BigDecimal indiceCorrecao = Utils.arredondarValor(HelperDate.dateAfter(dataInicio, precatorio.getDataFim()) ? BigDecimal.ONE : IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIP(periodoAtualizacao, periodoDaGraca, dataInicioEC1362025, precatorio.getEsferaPrecatorio().getGrupo(), false), 9);
                BigDecimal taxaJuros = Utils.arredondarValor(HelperDate.dateAfter(dataInicio, precatorio.getDataFim()) ? BigDecimal.ZERO : ServicoAtualizacaoUtils.encontrarTaxaDeJurosPrecatorioSIP(dataInicio, precatorio.getDataFim(), dataInicioEC1362025, periodoDaGraca), 4);
                String criterioCorrecao = this.servicoDeJustificativa.getCriterioCorrecaoPrecatorio(periodoAtualizacao, periodoDaGraca, dataInicioEC1362025, precatorio.getEsferaPrecatorio().getGrupo());
                String criterioJuros = this.servicoDeJustificativa.getCriterioJurosPrecatorio(periodoAtualizacao, periodoDaGraca, dataInicioEC1362025);
                AtualizacaoPrecatorioSIPIndicesDTO precatorioComIndice = new AtualizacaoPrecatorioSIPIndicesDTO(precatorio);
                precatorioComIndice.setIndiceCorrecao(indiceCorrecao);
                precatorioComIndice.setCriterioCorrecao(criterioCorrecao);
                precatorioComIndice.setTaxaJuros(taxaJuros);
                precatorioComIndice.setCriterioJuros(criterioJuros);
                precatoriosComIndices.add(precatorioComIndice);
            }
            catch (Exception e) {
                LOGGER.error(e.getMessage(), (Throwable)e);
            }
        }
        return precatoriosComIndices;
    }
}

