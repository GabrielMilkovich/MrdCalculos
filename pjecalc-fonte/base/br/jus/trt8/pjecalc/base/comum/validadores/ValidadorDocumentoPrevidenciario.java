/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.validator.Validator
 */
package br.jus.trt8.pjecalc.base.comum.validadores;

import br.jus.trt8.pjecalc.base.comum.annotations.DocumentoPrevidenciario;
import java.io.Serializable;
import org.hibernate.validator.Validator;

public class ValidadorDocumentoPrevidenciario
implements Serializable,
Validator<DocumentoPrevidenciario> {
    private static final long serialVersionUID = -1369777538096832932L;

    public void initialize(DocumentoPrevidenciario arg0) {
    }

    public boolean isValid(Object arg0) {
        if (!this.validarFormato((String)arg0)) {
            return false;
        }
        return this.validarNumeroDocumento((String)arg0);
    }

    private boolean validarNumeroDocumento(String numeroDocumento) {
        int liTamanho = 0;
        StringBuffer lsAux = null;
        StringBuffer lsMultiplicador = new StringBuffer("3298765432");
        int liTotalizador = 0;
        int liResto = 0;
        int liMultiplicando = 0;
        int liMultiplicador = 0;
        boolean lbRetorno = true;
        int liDigitoInicial = 99;
        int liDigito = 99;
        int lengthPisComDigito = 11;
        int lengthPisSemDigito = 10;
        lsAux = new StringBuffer().append(numeroDocumento);
        liTamanho = lsAux.length();
        if (liTamanho != 11) {
            lbRetorno = false;
        }
        if (lbRetorno) {
            for (int i = 0; i < 10; ++i) {
                liMultiplicando = Integer.parseInt(lsAux.substring(i, i + 1));
                liMultiplicador = Integer.parseInt(lsMultiplicador.substring(i, i + 1));
                liTotalizador += liMultiplicando * liMultiplicador;
            }
            liResto = 11 - liTotalizador % 11;
            liResto = liResto == 10 || liResto == 11 ? 0 : liResto;
            liDigito = Integer.parseInt("" + lsAux.charAt(10));
            lbRetorno = liResto == liDigito;
        }
        return lbRetorno;
    }

    private boolean validarFormato(String numeroDocumento) {
        if (numeroDocumento == null || numeroDocumento.isEmpty() || numeroDocumento.trim().length() != 11) {
            return false;
        }
        try {
            Long.parseLong(numeroDocumento);
        }
        catch (NumberFormatException e) {
            return false;
        }
        return true;
    }
}

