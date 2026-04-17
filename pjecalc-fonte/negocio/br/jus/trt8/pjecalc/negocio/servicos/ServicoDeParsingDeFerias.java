/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.StringUtils
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.SituacaoDaFeriasEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.servicos.AbstractServicoDeParsing;
import java.util.Date;
import java.util.Set;
import org.apache.commons.lang.StringUtils;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Name(value="servicoDeParsingDeFerias")
@Scope(value=ScopeType.STATELESS)
@AutoCreate
public class ServicoDeParsingDeFerias
extends AbstractServicoDeParsing<Ferias> {
    private static final long serialVersionUID = 1L;

    @Override
    protected Ferias construirObjeto(String linha) {
        String qtdAbono;
        String[] split = StringUtils.splitPreserveAllTokens((String)linha, (String)"[;]");
        int i = 0;
        String relativa = split[i++];
        Integer prazo = Integer.valueOf(split[i++]);
        String situacao = split[i++];
        Boolean dobra = this.converterParaBoolean(split[i++]);
        Boolean abono = this.converterParaBoolean(split[i++]);
        Integer quantidadeDiasAbono = StringUtils.isBlank((String)(qtdAbono = split[i++])) ? 0 : Integer.valueOf(qtdAbono);
        Date dataInicialGozo1 = this.converterParaData(split[i++], "dd/MM/yyyy");
        Date dataFinalGozo1 = this.converterParaData(split[i++], "dd/MM/yyyy");
        Boolean dobraGozo1 = this.converterParaBoolean(split[i++]);
        Date dataInicialGozo2 = this.converterParaData(split[i++], "dd/MM/yyyy");
        Date dataFinalGozo2 = this.converterParaData(split[i++], "dd/MM/yyyy");
        Boolean dobraGozo2 = this.converterParaBoolean(split[i++]);
        Date dataInicialGozo3 = this.converterParaData(split[i++], "dd/MM/yyyy");
        Date dataFinalGozo3 = this.converterParaData(split[i++], "dd/MM/yyyy");
        Boolean dobraGozo3 = this.converterParaBoolean(split[i++]);
        Set<Ferias> listaDeFerias = this.servicoDeCalculo.obterCalculoAberto().getListaDeFerias();
        for (Ferias ferias : listaDeFerias) {
            if (!StringUtils.trim((String)relativa).equalsIgnoreCase(ferias.getRelativa())) continue;
            ferias.setPrazo(prazo);
            ferias.setSituacao(SituacaoDaFeriasEnum.obterPorValor(situacao));
            ferias.setDobraGeral(dobra == null ? Boolean.FALSE : dobra);
            ferias.setAbono(abono == null ? Boolean.FALSE : abono);
            ferias.setQuantidadeDiasAbono(quantidadeDiasAbono);
            ferias.setDataInicialDoPeriodoDeGozo1(dataInicialGozo1);
            ferias.setDataFinalDoPeriodoDeGozo1(dataFinalGozo1);
            ferias.setDobraDoPeriodoDeGozo1(dobraGozo1 == null ? Boolean.FALSE : dobraGozo1);
            ferias.setDataInicialDoPeriodoDeGozo2(dataInicialGozo2);
            ferias.setDataFinalDoPeriodoDeGozo2(dataFinalGozo2);
            ferias.setDobraDoPeriodoDeGozo2(dobraGozo2 == null ? Boolean.FALSE : dobraGozo2);
            ferias.setDataInicialDoPeriodoDeGozo3(dataInicialGozo3);
            ferias.setDataFinalDoPeriodoDeGozo3(dataFinalGozo3);
            ferias.setDobraDoPeriodoDeGozo3(dobraGozo3 == null ? Boolean.FALSE : dobraGozo3);
            if (ferias.getSituacao().equals((Object)SituacaoDaFeriasEnum.INDENIZADAS)) {
                ferias.setAbono(false);
            } else if (ferias.getSituacao().equals((Object)SituacaoDaFeriasEnum.PERDIDAS)) {
                ferias.setDobraGeral(false);
                ferias.setAbono(false);
            } else if (ferias.getSituacao().equals((Object)SituacaoDaFeriasEnum.GOZADAS)) {
                ferias.setDobraGeral(false);
            }
            return ferias;
        }
        throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0192, this.numeroDaLinhaNoArquivo));
    }
}

