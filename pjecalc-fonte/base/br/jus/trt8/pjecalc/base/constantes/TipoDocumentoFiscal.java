/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.constantes;

import java.text.StringCharacterIterator;

public enum TipoDocumentoFiscal {
    CEI{

        @Override
        boolean validarDocumento(String numeroDocumento) {
            if (numeroDocumento.trim().length() != 12) {
                return false;
            }
            String[] listaDeImpedidos = new String[]{"000000000000", "111111111111", "222222222222", "333333333333", "444444444444", "555555555555", "666666666666", "777777777777", "888888888888", "999999999999"};
            for (int i = 0; i < listaDeImpedidos.length; ++i) {
                if (!numeroDocumento.equals(listaDeImpedidos[i])) continue;
                return false;
            }
            StringCharacterIterator documentoSemDigito = new StringCharacterIterator(numeroDocumento.substring(0, 11));
            int[] pesos = new int[]{7, 4, 1, 8, 5, 2, 1, 6, 3, 7, 4};
            int digitoVerificador = Integer.parseInt(numeroDocumento.substring(11, 12));
            int somaNumerosDocumento = 0;
            int valorDaUnidadeDaSoma = 0;
            int resultadoSubtracao = 0;
            int digitoVerificadorCalculado = 0;
            int contadorSoma = 0;
            char digito = documentoSemDigito.first();
            while (digito != '\uffff') {
                somaNumerosDocumento += Integer.parseInt(String.valueOf(digito)) * pesos[contadorSoma++];
                digito = documentoSemDigito.next();
            }
            int resultadoSomaNumeros = 0;
            resultadoSomaNumeros = somaNumerosDocumento > 99 ? Integer.parseInt(String.valueOf(somaNumerosDocumento).substring(1, 2)) + Integer.parseInt(String.valueOf(somaNumerosDocumento).substring(2, 3)) : (somaNumerosDocumento > 9 ? Integer.parseInt(String.valueOf(somaNumerosDocumento).substring(0, 1)) + Integer.parseInt(String.valueOf(somaNumerosDocumento).substring(1, 2)) : somaNumerosDocumento);
            if (resultadoSomaNumeros > 9) {
                valorDaUnidadeDaSoma = Integer.parseInt(String.valueOf(resultadoSomaNumeros).substring(1, 2));
            }
            resultadoSubtracao = resultadoSomaNumeros > 9 ? 10 - valorDaUnidadeDaSoma : 10 - resultadoSomaNumeros;
            int n = digitoVerificadorCalculado = resultadoSubtracao > 9 ? Integer.parseInt(String.valueOf(resultadoSubtracao).substring(1, 2)) : resultadoSubtracao;
            return digitoVerificador == digitoVerificadorCalculado;
        }
    }
    ,
    CNPJ{

        @Override
        boolean validarDocumento(String numeroDocumento) {
            if (numeroDocumento.trim().length() != 14) {
                return false;
            }
            String[] listaDeImpedidos = new String[]{"00000000000000", "11111111111111", "22222222222222", "33333333333333", "44444444444444", "55555555555555", "66666666666666", "77777777777777", "88888888888888", "99999999999999"};
            for (int i = 0; i < listaDeImpedidos.length; ++i) {
                if (!numeroDocumento.equals(listaDeImpedidos[i])) continue;
                return false;
            }
            StringCharacterIterator documentoSemDigito = new StringCharacterIterator(numeroDocumento.substring(0, 12));
            int primeiroDigitoVerificador = Integer.parseInt(numeroDocumento.substring(12, 13));
            int segundoDigitoVerificador = Integer.parseInt(numeroDocumento.substring(13, 14));
            int valorPrimeiraSoma = 0;
            int valorSegundaSoma = 0;
            int restoDivisao = 0;
            int primeiroDigitoComparacao = 0;
            int segundoDigitoComparacao = 0;
            int contadorPrimeiraSoma = 2;
            char numero = documentoSemDigito.last();
            while (numero != '\uffff') {
                contadorPrimeiraSoma = contadorPrimeiraSoma > 9 ? 2 : contadorPrimeiraSoma;
                valorPrimeiraSoma += Integer.parseInt(String.valueOf(numero)) * contadorPrimeiraSoma++;
                numero = documentoSemDigito.previous();
            }
            restoDivisao = valorPrimeiraSoma % 11;
            primeiroDigitoComparacao = restoDivisao < 2 ? 0 : 11 - restoDivisao;
            documentoSemDigito.setText(numeroDocumento.substring(0, 12) + primeiroDigitoComparacao);
            int contadorSegundaSoma = 2;
            char numero2 = documentoSemDigito.last();
            while (numero2 != '\uffff') {
                contadorSegundaSoma = contadorSegundaSoma > 9 ? 2 : contadorSegundaSoma;
                valorSegundaSoma += Integer.parseInt(String.valueOf(numero2)) * contadorSegundaSoma++;
                numero2 = documentoSemDigito.previous();
            }
            restoDivisao = valorSegundaSoma % 11;
            int n = segundoDigitoComparacao = restoDivisao < 2 ? 0 : 11 - restoDivisao;
            return primeiroDigitoVerificador == primeiroDigitoComparacao && segundoDigitoVerificador == segundoDigitoComparacao;
        }
    }
    ,
    CPF{

        @Override
        boolean validarDocumento(String numeroDocumento) {
            if (numeroDocumento.trim().length() != 11) {
                return false;
            }
            String[] listaDeImpedidos = new String[]{"00000000000", "11111111111", "22222222222", "33333333333", "44444444444", "55555555555", "66666666666", "77777777777", "88888888888", "99999999999"};
            for (int i = 0; i < listaDeImpedidos.length; ++i) {
                if (!numeroDocumento.equals(listaDeImpedidos[i])) continue;
                return false;
            }
            StringCharacterIterator documentoSemDigito = new StringCharacterIterator(numeroDocumento.substring(0, 9));
            int primeiroNumeroDigitoVerificador = Integer.parseInt(numeroDocumento.substring(9, 10));
            int segundoNumeroDigitoVerificador = Integer.parseInt(numeroDocumento.substring(10, 11));
            int valorPrimeiraSoma = 0;
            int valorSegundaSoma = 0;
            int restoDivisao = 0;
            int primeiroDigitoComparacao = 0;
            int segundoDigitoComparacao = 0;
            int contadorPrimeiraSoma = 10;
            char numero = documentoSemDigito.first();
            while (numero != '\uffff') {
                valorPrimeiraSoma += Integer.parseInt(String.valueOf(numero)) * contadorPrimeiraSoma--;
                numero = documentoSemDigito.next();
            }
            int contadorSegundaSoma = 11;
            char numero2 = documentoSemDigito.first();
            while (numero2 != '\uffff') {
                valorSegundaSoma += Integer.parseInt(String.valueOf(numero2)) * contadorSegundaSoma--;
                numero2 = documentoSemDigito.next();
            }
            restoDivisao = valorPrimeiraSoma % 11;
            primeiroDigitoComparacao = restoDivisao < 2 ? 0 : 11 - restoDivisao;
            restoDivisao = (valorSegundaSoma += primeiroNumeroDigitoVerificador * 2) % 11;
            int n = segundoDigitoComparacao = restoDivisao < 2 ? 0 : 11 - restoDivisao;
            return primeiroNumeroDigitoVerificador == primeiroDigitoComparacao && segundoNumeroDigitoVerificador == segundoDigitoComparacao;
        }
    };


    public final boolean validar(String numeroDocumento) {
        if (numeroDocumento == null || numeroDocumento.isEmpty()) {
            return false;
        }
        try {
            Long.parseLong(numeroDocumento);
        }
        catch (NumberFormatException e) {
            return false;
        }
        return this.validarDocumento(numeroDocumento);
    }

    abstract boolean validarDocumento(String var1);
}

