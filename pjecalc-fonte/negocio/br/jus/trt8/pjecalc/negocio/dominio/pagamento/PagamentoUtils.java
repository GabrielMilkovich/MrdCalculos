/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.CustasDevidasFixasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeLiquidacaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustaPaga;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Set;

public class PagamentoUtils {
    public static Boolean verificaSeExisteValorPrincipalParaCreditoDeReclamante(Calculo calculo) {
        BigDecimal valorPrincipal = calculo.calculaValorVerbaParaCreditoDoReclamante(Boolean.TRUE);
        return Utils.naoNulo(valorPrincipal) && BigDecimal.ZERO.compareTo(valorPrincipal) != 0;
    }

    public static Boolean verificaSeExisteFgtsParaCreditoDeReclamante(Calculo calculo) {
        return Utils.naoNulo(calculo.calculaValorFgtsParaCreditoDoReclamante());
    }

    public static Boolean verificaSeExisteCustaDoReclamanteAPagar(Calculo calculo) {
        if (!TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)calculo.getCustasJudiciais().getTipoCobrancaReclamante())) {
            return false;
        }
        BigDecimal valorCustasReclamante = null;
        if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
            valorCustasReclamante = calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteInformada();
        } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
            valorCustasReclamante = calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteCalculada();
        }
        if (Utils.naoNulo(valorCustasReclamante)) {
            for (CustaPaga custaPaga : calculo.getCustasJudiciais().getCustasPagasDoReclamante()) {
                valorCustasReclamante = Utils.subtrair(valorCustasReclamante, custaPaga.getTotal(), valorCustasReclamante);
            }
            if (BigDecimal.ZERO.compareTo(valorCustasReclamante) > 0) {
                valorCustasReclamante = BigDecimal.ZERO;
            }
        }
        return Utils.naoNulo(valorCustasReclamante) && BigDecimal.ZERO.compareTo(valorCustasReclamante) != 0;
    }

    public static Boolean verificaSeEhFgtsParaDepositar(Calculo calculo) {
        return DestinoDoFgtsEnum.DEPOSITAR.equals((Object)calculo.getFgts().getDestinoDoFgts());
    }

    public static Boolean verificaSeExisteDescontoContribuicaoSocialReclamante(Calculo calculo) {
        return Boolean.TRUE.equals(calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado()) && Boolean.TRUE.equals(calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante()) && !calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty();
    }

    public static Boolean verificaSeExistePrevidenciaPrivada(Calculo calculo) {
        return calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada();
    }

    public static Boolean verificaSeExistePensaoAlimenticia(Calculo calculo) {
        return calculo.getPensaoAlimenticia().getApurarPensaoAlimenticia();
    }

    public static Boolean verificaSeExistePensaoAlimenticiaAnteriorAoPagamento(Calculo calculo, Date dataPagamento) {
        Boolean apuraPensao = PagamentoUtils.verificaSeExistePensaoAlimenticia(calculo);
        Date dataEvento = calculo.getPensaoAlimenticia().getDataEvento();
        Boolean dataDoEventoAnteriorAoPagamento = TipoOrigemRegistroEnum.CALCULO.equals((Object)calculo.getPensaoAlimenticia().getOrigemRegistro()) || Utils.naoNulos(dataEvento, dataPagamento) && HelperDate.dateAfterOrEquals(dataPagamento, dataEvento);
        return apuraPensao != false && dataDoEventoAnteriorAoPagamento != false;
    }

    public static Boolean verificaSeExisteImpostoParaReclamante(Calculo calculo) {
        return calculo.getIrpf().getApurarImpostoRenda() != false && calculo.getIrpf().getCobrarDoReclamado() == false;
    }

    public static Boolean verificaSeExisteCustaJudicialDoReclamado(Calculo calculo) {
        if (!TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamado())) {
            return Boolean.TRUE;
        }
        if (!TipoDeCustasDeLiquidacaoEnum.NAO_SE_APLICA.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeLiquidacao())) {
            return Boolean.TRUE;
        }
        if (!calculo.getCustasJudiciais().getAutosJudiciaisDoCalculo().isEmpty() || !calculo.getCustasJudiciais().getAutosJudiciaisDaAtualizacao().isEmpty()) {
            return Boolean.TRUE;
        }
        if (!calculo.getCustasJudiciais().getArmazenamentosDoCalculo().isEmpty() || !calculo.getCustasJudiciais().getArmazenamentosDaAtualizacao().isEmpty()) {
            return Boolean.TRUE;
        }
        for (CustasDevidasFixasEnum custasDevidasFixasEnum : CustasDevidasFixasEnum.values()) {
            Integer quantidade = custasDevidasFixasEnum.getQuantidade(calculo.getCustasJudiciais());
            if (!Utils.naoNulo(quantidade) || quantidade <= 0) continue;
            return Boolean.TRUE;
        }
        Set<CustasFixasAtualizacao> custasFixasAtualizacao = calculo.getCustasJudiciais().getCustasFixasAtualizacao();
        if (Utils.naoNulo(custasFixasAtualizacao)) {
            for (CustasFixasAtualizacao custasFixas : custasFixasAtualizacao) {
                for (CustasDevidasFixasEnum custasDevidasFixasEnum : CustasDevidasFixasEnum.values()) {
                    Integer quantidade = custasDevidasFixasEnum.getQuantidade(custasFixas);
                    if (!Utils.naoNulo(quantidade) || quantidade <= 0) continue;
                    return Boolean.TRUE;
                }
            }
        }
        return Boolean.FALSE;
    }

    public static Boolean verificaSeExisteCustaJudicialDoReclamadoAnteriorAoPagamento(Calculo calculo, Date dataPagamento) {
        if (dataPagamento == null) {
            return Boolean.TRUE;
        }
        Boolean existe = PagamentoUtils.verificaSeExisteCustaJudicialDoReclamado(calculo);
        if (existe.booleanValue()) {
            CustasJudiciais custas = calculo.getCustasJudiciais();
            if (!TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA.equals((Object)custas.getTipoDeCustasDeConhecimentoDoReclamado()) || !TipoDeCustasDeLiquidacaoEnum.NAO_SE_APLICA.equals((Object)custas.getTipoDeCustasDeLiquidacao())) {
                return Boolean.TRUE;
            }
            if (PagamentoUtils.verificarCustaCalculoAnteriorPagamento(custas).booleanValue() || PagamentoUtils.verificarCustaAtualizacaoAnteriorPagamento(dataPagamento, custas).booleanValue()) {
                return Boolean.TRUE;
            }
        }
        return Boolean.FALSE;
    }

    private static Boolean verificarCustaCalculoAnteriorPagamento(CustasJudiciais custas) {
        if (!custas.getAutosJudiciaisDoCalculo().isEmpty() || !custas.getArmazenamentosDoCalculo().isEmpty()) {
            return Boolean.TRUE;
        }
        for (CustasDevidasFixasEnum custasDevidasFixasEnum : CustasDevidasFixasEnum.values()) {
            Integer quantidade = custasDevidasFixasEnum.getQuantidade(custas);
            if (!Utils.naoNulo(quantidade) || quantidade <= 0) continue;
            return Boolean.TRUE;
        }
        return Boolean.FALSE;
    }

    private static Boolean verificarCustaAtualizacaoAnteriorPagamento(Date dataPagamento, CustasJudiciais custas) {
        for (CustasFixasAtualizacao fixas : custas.getCustasFixasAtualizacao()) {
            if (fixas.getDataEvento() != null && !HelperDate.dateAfterOrEquals(dataPagamento, fixas.getDataEvento())) continue;
            return Boolean.TRUE;
        }
        for (AutoJudicial autos : custas.getAutosJudiciaisDaAtualizacao()) {
            if (autos.getDataVencimentoAuto() != null && !HelperDate.dateAfterOrEquals(dataPagamento, autos.getDataVencimentoAuto())) continue;
            return Boolean.TRUE;
        }
        for (Armazenamento armazenamento : custas.getArmazenamentosDaAtualizacao()) {
            if (armazenamento.getDataTerminoArmazenamento() != null && !HelperDate.dateAfterOrEquals(dataPagamento, armazenamento.getDataTerminoArmazenamento())) continue;
            return Boolean.TRUE;
        }
        return Boolean.FALSE;
    }

    public static Boolean verificaSeExisteContribuicaoSocialSalariosDevidos(Calculo calculo) {
        BigDecimal valorContribuicaoSocialSalariosDevidos = null;
        if (!calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
            valorContribuicaoSocialSalariosDevidos = Boolean.TRUE.equals(calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado()) ? calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSegurado() : BigDecimal.ZERO;
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssEmpresa(), valorContribuicaoSocialSalariosDevidos);
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSAT(), valorContribuicaoSocialSalariosDevidos);
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssTerceiros(), valorContribuicaoSocialSalariosDevidos);
        }
        return Utils.naoNulo(valorContribuicaoSocialSalariosDevidos) && BigDecimal.ZERO.compareTo(valorContribuicaoSocialSalariosDevidos) != 0;
    }

    public static Boolean verificaSeExisteContribuicaoSocialSalariosPagos(Calculo calculo) {
        BigDecimal valorContribuicaoSocialSalariosPagos = null;
        if (Boolean.TRUE.equals(calculo.getInss().getApurarInssSobreSalariosPagos()) && !calculo.getInss().getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos().isEmpty()) {
            valorContribuicaoSocialSalariosPagos = calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssSegurado();
            valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssEmpresa(), valorContribuicaoSocialSalariosPagos);
            valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssSAT(), valorContribuicaoSocialSalariosPagos);
            valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssTerceiros(), valorContribuicaoSocialSalariosPagos);
        }
        return Utils.naoNulo(valorContribuicaoSocialSalariosPagos) && BigDecimal.ZERO.compareTo(valorContribuicaoSocialSalariosPagos) != 0;
    }

    public static Boolean verificaSeExisteJurosDePrevidenciaPrivada(Calculo calculo) {
        if (calculo.isCalculoExterno().booleanValue()) {
            ParcelasAtualizaveisOutrosDebitosReclamado parcelaCalculoExternoOutrosDebitosReclamada = ParcelasAtualizaveisOutrosDebitosReclamado.obterDoCalculo(calculo);
            return parcelaCalculoExternoOutrosDebitosReclamada.getMarcarJurosPrevidenciaPrivada();
        }
        BigDecimal valorJurosPrevidenciaPrivada = calculo.getPrevidenciaPrivada().getTotalDeJuros();
        return Utils.naoNulo(valorJurosPrevidenciaPrivada) && BigDecimal.ZERO.compareTo(valorJurosPrevidenciaPrivada) != 0;
    }

    public static Boolean verificaSeExisteValorDevidoDePrevidenciaPrivada(Calculo calculo) {
        BigDecimal valorTotalDoDevidoCorrigido = calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido();
        return Utils.naoNulo(valorTotalDoDevidoCorrigido) && BigDecimal.ZERO.compareTo(valorTotalDoDevidoCorrigido) != 0;
    }

    public static Boolean verificaSeExisteImpostoParaReclamado(Calculo calculo) {
        return calculo.getIrpf().getApurarImpostoRenda() != false && calculo.getIrpf().getCobrarDoReclamado() != false;
    }

    public static Boolean verificaSeExisteInssDezPorcento(Calculo calculo) {
        return calculo.getFgts().getMulta10();
    }

    public static Boolean verificaSeExisteInssMeioPorcento(Calculo calculo) {
        return calculo.getFgts().getContribuicaoSocial05();
    }

    public static Boolean verificaSeExisteCustaACobrarDoReclamante(Calculo calculo) {
        if (!TipoCobrancaReclamanteEnum.COBRAR.equals((Object)calculo.getCustasJudiciais().getTipoCobrancaReclamante())) {
            return false;
        }
        BigDecimal valorCustasReclamante = null;
        if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
            valorCustasReclamante = calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteInformada();
        } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
            valorCustasReclamante = calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteCalculada();
        }
        if (Utils.naoNulo(valorCustasReclamante)) {
            for (CustaPaga custaPaga : calculo.getCustasJudiciais().getCustasPagasDoReclamante()) {
                valorCustasReclamante = Utils.subtrair(valorCustasReclamante, custaPaga.getTotal(), valorCustasReclamante);
            }
            if (BigDecimal.ZERO.compareTo(valorCustasReclamante) > 0) {
                valorCustasReclamante = BigDecimal.ZERO;
            }
        }
        return Utils.naoNulo(valorCustasReclamante) && BigDecimal.ZERO.compareTo(valorCustasReclamante) != 0;
    }

    public static Object[] analisarMultas(Calculo calculo) {
        Boolean existeMultaDevidaPeloReclamadoParaReclamante = Boolean.FALSE;
        Boolean existeMultaDevidaPeloReclamanteParaReclamado = Boolean.FALSE;
        Boolean existeMultaDevidaPeloReclamanteParaTerceiros = Boolean.FALSE;
        Boolean existeMultaDevidaPeloReclamadoParaTerceiros = Boolean.FALSE;
        ArrayList<Multa> listaDeMultasDevidasPeloReclamanteParaTerceiros = new ArrayList<Multa>();
        ArrayList<Multa> listaDeMultasDevidasPeloReclamadoParaTerceiros = new ArrayList<Multa>();
        Boolean existeMultaACobrarDoReclamanteParaTerceiros = Boolean.FALSE;
        ArrayList<Multa> listaDeMultasACobrarDoReclamanteParaTerceiros = new ArrayList<Multa>();
        for (Multa multa : Multa.obterTodosPor(calculo)) {
            switch (multa.getTipoCredorDevedor()) {
                case RECLAMADO_RECLAMANTE: {
                    existeMultaDevidaPeloReclamanteParaReclamado = Boolean.TRUE;
                    break;
                }
                case RECLAMANTE_RECLAMADO: {
                    existeMultaDevidaPeloReclamadoParaReclamante = Boolean.TRUE;
                    break;
                }
                case TERCEIRO_RECLAMANTE: {
                    if (TipoCobrancaReclamanteEnum.COBRAR.equals((Object)multa.getTipoCobrancaReclamante())) {
                        existeMultaACobrarDoReclamanteParaTerceiros = Boolean.TRUE;
                        listaDeMultasACobrarDoReclamanteParaTerceiros.add(multa);
                        break;
                    }
                    existeMultaDevidaPeloReclamanteParaTerceiros = Boolean.TRUE;
                    listaDeMultasDevidasPeloReclamanteParaTerceiros.add(multa);
                    break;
                }
                case TERCEIRO_RECLAMADO: {
                    existeMultaDevidaPeloReclamadoParaTerceiros = Boolean.TRUE;
                    listaDeMultasDevidasPeloReclamadoParaTerceiros.add(multa);
                }
            }
        }
        return new Object[]{existeMultaDevidaPeloReclamadoParaReclamante, existeMultaDevidaPeloReclamanteParaReclamado, existeMultaDevidaPeloReclamanteParaTerceiros, existeMultaDevidaPeloReclamadoParaTerceiros, listaDeMultasDevidasPeloReclamanteParaTerceiros, listaDeMultasDevidasPeloReclamadoParaTerceiros, existeMultaACobrarDoReclamanteParaTerceiros, listaDeMultasACobrarDoReclamanteParaTerceiros};
    }

    public static Object[] analisarHonorarios(Calculo calculo) {
        Boolean existeHonorarioDevidoPeloReclamante = Boolean.FALSE;
        Boolean existeHonorarioDevidoPeloReclamado = Boolean.FALSE;
        ArrayList<Honorario> listaDeHonorariosDevidosPeloReclamante = new ArrayList<Honorario>();
        ArrayList<Honorario> listaDeHonorariosDevidosPeloReclamado = new ArrayList<Honorario>();
        Boolean existeHonorarioACobrarDoReclamante = Boolean.FALSE;
        ArrayList<Honorario> listaDeHonorariosACobrarDoReclamante = new ArrayList<Honorario>();
        for (Honorario honorario : Honorario.obterTodosPor(calculo)) {
            switch (honorario.getTipoDeDevedor()) {
                case RECLAMANTE: {
                    if (TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorario.getTipoCobrancaReclamante())) {
                        existeHonorarioACobrarDoReclamante = Boolean.TRUE;
                        listaDeHonorariosACobrarDoReclamante.add(honorario);
                        break;
                    }
                    existeHonorarioDevidoPeloReclamante = Boolean.TRUE;
                    listaDeHonorariosDevidosPeloReclamante.add(honorario);
                    break;
                }
                case RECLAMADO: {
                    existeHonorarioDevidoPeloReclamado = Boolean.TRUE;
                    listaDeHonorariosDevidosPeloReclamado.add(honorario);
                }
            }
        }
        return new Object[]{existeHonorarioDevidoPeloReclamante, existeHonorarioDevidoPeloReclamado, listaDeHonorariosDevidosPeloReclamante, listaDeHonorariosDevidosPeloReclamado, existeHonorarioACobrarDoReclamante, listaDeHonorariosACobrarDoReclamante};
    }

    public static List<Pagamento> atualizarEValidarPagamentos(Calculo calculo, List<Pagamento> pagamentos) {
        Boolean existeValorPrincipalParaCreditoDeReclamante = PagamentoUtils.verificaSeExisteValorPrincipalParaCreditoDeReclamante(calculo);
        Boolean existeFgtsParaCreditoDeReclamante = PagamentoUtils.verificaSeExisteFgtsParaCreditoDeReclamante(calculo);
        Boolean existeCustaDoReclamanteAPagar = PagamentoUtils.verificaSeExisteCustaDoReclamanteAPagar(calculo);
        Boolean ehFgtsParaDepositar = PagamentoUtils.verificaSeEhFgtsParaDepositar(calculo);
        Boolean existeDescontoContribuicaoSocialReclamante = PagamentoUtils.verificaSeExisteDescontoContribuicaoSocialReclamante(calculo);
        Boolean existePrevidenciaPrivada = PagamentoUtils.verificaSeExistePrevidenciaPrivada(calculo);
        Boolean existeImpostoParaReclamante = PagamentoUtils.verificaSeExisteImpostoParaReclamante(calculo);
        Boolean existeCustaJudicialDoReclamado = PagamentoUtils.verificaSeExisteCustaJudicialDoReclamado(calculo);
        Boolean existeContribuicaoSocialSalariosDevidos = PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosDevidos(calculo);
        Boolean existeContribuicaoSocialSalariosPagos = PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosPagos(calculo);
        Boolean existeJurosDePrevidenciaPrivada = PagamentoUtils.verificaSeExisteJurosDePrevidenciaPrivada(calculo);
        Boolean existeImpostoParaReclamado = PagamentoUtils.verificaSeExisteImpostoParaReclamado(calculo);
        Boolean existeInssDezPorcento = PagamentoUtils.verificaSeExisteInssDezPorcento(calculo);
        Boolean existeInssMeioPorcento = PagamentoUtils.verificaSeExisteInssMeioPorcento(calculo);
        Boolean existeCustaACobrarDoReclamante = PagamentoUtils.verificaSeExisteCustaACobrarDoReclamante(calculo);
        Object[] resultadoAnaliseMulta = PagamentoUtils.analisarMultas(calculo);
        Boolean existeMultaDevidaPeloReclamadoParaReclamante = (Boolean)resultadoAnaliseMulta[0];
        Boolean existeMultaDevidaPeloReclamanteParaReclamado = (Boolean)resultadoAnaliseMulta[1];
        Boolean existeMultaDevidaPeloReclamanteParaTerceiros = (Boolean)resultadoAnaliseMulta[2];
        Boolean existeMultaDevidaPeloReclamadoParaTerceiros = (Boolean)resultadoAnaliseMulta[3];
        Boolean existeMultaACobrarDoReclamanteParaTerceiros = (Boolean)resultadoAnaliseMulta[6];
        Object[] resultadoAnaliseHonorario = PagamentoUtils.analisarHonorarios(calculo);
        Boolean existeHonorarioDevidoPeloReclamante = (Boolean)resultadoAnaliseHonorario[0];
        Boolean existeHonorarioDevidoPeloReclamado = (Boolean)resultadoAnaliseHonorario[1];
        Boolean existeHonorarioACobrarDoReclamante = (Boolean)resultadoAnaliseHonorario[4];
        ArrayList<Pagamento> pagamentosInvalidos = new ArrayList<Pagamento>();
        for (Pagamento pagamento : pagamentos) {
            Boolean existePensaoAlimenticia = PagamentoUtils.verificaSeExistePensaoAlimenticiaAnteriorAoPagamento(calculo, pagamento.getDataPagamento());
            pagamento.atualizarPagamento(existeValorPrincipalParaCreditoDeReclamante, existeFgtsParaCreditoDeReclamante, existeMultaDevidaPeloReclamadoParaReclamante, existeMultaDevidaPeloReclamanteParaReclamado, existeCustaDoReclamanteAPagar, ehFgtsParaDepositar, existeDescontoContribuicaoSocialReclamante, existePrevidenciaPrivada, existePensaoAlimenticia, existeImpostoParaReclamante, existeMultaDevidaPeloReclamanteParaTerceiros, existeHonorarioDevidoPeloReclamante, existeCustaJudicialDoReclamado, existeContribuicaoSocialSalariosDevidos, existeContribuicaoSocialSalariosPagos, existeJurosDePrevidenciaPrivada, existeImpostoParaReclamado, existeInssDezPorcento, existeInssMeioPorcento, existeMultaDevidaPeloReclamadoParaTerceiros, existeHonorarioDevidoPeloReclamado, existeCustaACobrarDoReclamante, existeMultaACobrarDoReclamanteParaTerceiros, existeHonorarioACobrarDoReclamante);
            if (!pagamento.validar(Boolean.FALSE).booleanValue()) {
                pagamentosInvalidos.add(pagamento);
                continue;
            }
            pagamento.salvar();
        }
        return pagamentosInvalidos;
    }

    public static BigDecimal[] ratearValor(BigDecimal valor, BigDecimal[] parcelas) {
        BigDecimal[] valoresZerados = new BigDecimal[parcelas.length];
        BigDecimal total = BigDecimal.ZERO;
        for (int i = 0; i < parcelas.length; ++i) {
            total = Utils.somar(total, parcelas[i], total);
            valoresZerados[i] = BigDecimal.ZERO;
        }
        if (BigDecimal.ZERO.compareTo(total) == 0) {
            return valoresZerados;
        }
        BigDecimal[] rateioDasParcelas = new BigDecimal[parcelas.length];
        for (int i = 0; i < parcelas.length; ++i) {
            BigDecimal fatorRateio = Utils.dividir(parcelas[i], total);
            rateioDasParcelas[i] = Utils.arredondarValorMonetario(Utils.multiplicar(valor, fatorRateio));
            if (rateioDasParcelas[i] != null) continue;
            rateioDasParcelas[i] = BigDecimal.ZERO;
        }
        PagamentoUtils.arrumarArredondamento(rateioDasParcelas, valor);
        return rateioDasParcelas;
    }

    private static void arrumarArredondamento(BigDecimal[] rateioDasParcelas, BigDecimal valor) {
        BigDecimal totalRateios = BigDecimal.ZERO;
        for (int i = 0; i < rateioDasParcelas.length; ++i) {
            totalRateios = Utils.somar(totalRateios, rateioDasParcelas[i], totalRateios);
        }
        BigDecimal diferenca = Utils.subtrair(totalRateios, valor);
        if (BigDecimal.ZERO.compareTo(diferenca) != 0) {
            boolean erroPositivo = diferenca.signum() == 1;
            BigDecimal umCentavo = new BigDecimal("0.01");
            ArrayList<Integer> indicesUsados = new ArrayList<Integer>();
            while (BigDecimal.ZERO.compareTo(diferenca) != 0) {
                int maiorIndice = 0;
                BigDecimal maior = BigDecimal.ZERO;
                for (int i = 0; i < rateioDasParcelas.length; ++i) {
                    if (maior.compareTo(rateioDasParcelas[i].abs()) >= 0 || indicesUsados.contains(i)) continue;
                    maior = rateioDasParcelas[i].abs();
                    maiorIndice = i;
                }
                indicesUsados.add(maiorIndice);
                if (erroPositivo) {
                    rateioDasParcelas[maiorIndice] = Utils.subtrair(rateioDasParcelas[maiorIndice], umCentavo);
                    diferenca = Utils.subtrair(diferenca, umCentavo);
                    continue;
                }
                rateioDasParcelas[maiorIndice] = Utils.somar(rateioDasParcelas[maiorIndice], umCentavo);
                diferenca = Utils.somar(diferenca, umCentavo);
            }
        }
    }
}

