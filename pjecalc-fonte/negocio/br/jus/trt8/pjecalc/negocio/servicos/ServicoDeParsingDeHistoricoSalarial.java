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

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.servicos.AbstractServicoDeParsing;
import java.math.BigDecimal;
import org.apache.commons.lang.StringUtils;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Name(value="servicoDeParsingDeHistoricoSalarial")
@Scope(value=ScopeType.STATELESS)
@AutoCreate
public class ServicoDeParsingDeHistoricoSalarial
extends AbstractServicoDeParsing<OcorrenciaDoHistoricoSalarial> {
    private static final long serialVersionUID = 1L;

    @Override
    protected OcorrenciaDoHistoricoSalarial construirObjeto(String linha) {
        String[] split = StringUtils.splitPreserveAllTokens((String)linha, (String)"[;]");
        int i = 0;
        String competencia = split[i++];
        Competencia competenciaObj = this.converterParaCompetencia(competencia);
        BigDecimal valor = this.converterParaNumerico(split[i++]);
        Boolean incideFgts = this.converterParaBoolean(split[i++]);
        Boolean incideFgtsRecolhido = this.converterParaBoolean(split[i++]);
        Boolean incideContribuicaoSocial = this.converterParaBoolean(split[i++]);
        Boolean incideContribuicaoSocialRecolhida = this.converterParaBoolean(split[i++]);
        OcorrenciaDoHistoricoSalarial ocorrencia = new OcorrenciaDoHistoricoSalarial();
        ocorrencia.setDataOcorrencia(competenciaObj.getData());
        ocorrencia.setValor(valor == null ? BigDecimal.ZERO : valor);
        ocorrencia.setIncidenciaFGTS(incideFgts == null ? Boolean.FALSE : incideFgts);
        ocorrencia.setIncidenciaINSS(incideContribuicaoSocial == null ? Boolean.FALSE : incideContribuicaoSocial);
        ocorrencia.setRecolhidoFGTS(incideFgtsRecolhido == null ? Boolean.FALSE : incideFgtsRecolhido);
        ocorrencia.setRecolhidoINSS(incideContribuicaoSocialRecolhida == null ? Boolean.FALSE : incideContribuicaoSocialRecolhida);
        return ocorrencia;
    }
}

