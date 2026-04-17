/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDeFgts")
public class RepositorioDeOcorrenciaDeFgts
extends RepositorioBase<OcorrenciaDeFgts> {
    public RepositorioDeOcorrenciaDeFgts() {
        super(OcorrenciaDeFgts.class);
    }

    public List<OcorrenciaDeFgts> obterPorFgts(Fgts fgts) {
        return super.obterTodosPorCriterio("ocorrencia", "fgts = ? and ocorrenciaOriginal != null", fgts);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

