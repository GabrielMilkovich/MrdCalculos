/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.Falta;
import br.jus.trt8.pjecalc.negocio.servicos.AbstractServicoDeParsing;
import java.util.Date;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Name(value="servicoDeParsingDeFaltas")
@Scope(value=ScopeType.STATELESS)
@AutoCreate
public class ServicoDeParsingDeFaltas
extends AbstractServicoDeParsing<Falta> {
    private static final long serialVersionUID = 1L;

    @Override
    protected Falta construirObjeto(String linha) {
        String[] split = linha.split("[;]");
        Falta falta = new Falta(true);
        int i = 0;
        Date inicio = this.converterParaData(split[i++], "dd/MM/yyyy");
        Date fim = this.converterParaData(split[i++], "dd/MM/yyyy");
        Boolean justificada = this.converterParaBoolean(split[i++]);
        Boolean reiniciarPeriodoAquisitivo = this.converterParaBoolean(split[i++]);
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        falta.setCalculo(calculo);
        falta.setDataInicioPeriodoFalta(inicio);
        falta.setDataTerminoPeriodoFalta(fim);
        falta.setFaltaJustificada(justificada);
        falta.setReiniciarFerias(reiniciarPeriodoAquisitivo);
        int LIMITE_TEXTO_JUSTIFICATIVA = 200;
        int QUATRO_CAMPOS = 4;
        if (split.length > 4) {
            String justificativa = this.limitarTamanhoTexto(split[i++], 200);
            falta.setJustificativaDaFalta(justificativa);
        }
        return falta;
    }
}

