/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import java.util.Date;

public interface Jornada {
    public String getHrEntrada1();

    public String getHrEntrada2();

    public String getHrEntrada3();

    public String getHrEntrada4();

    public String getHrEntrada5();

    public String getHrEntrada6();

    public String getHrSaida1();

    public String getHrSaida2();

    public String getHrSaida3();

    public String getHrSaida4();

    public String getHrSaida5();

    public String getHrSaida6();

    public void setHrEntrada1(String var1);

    public void setHrEntrada2(String var1);

    public void setHrEntrada3(String var1);

    public void setHrEntrada4(String var1);

    public void setHrEntrada5(String var1);

    public void setHrEntrada6(String var1);

    public void setHrSaida1(String var1);

    public void setHrSaida2(String var1);

    public void setHrSaida3(String var1);

    public void setHrSaida4(String var1);

    public void setHrSaida5(String var1);

    public void setHrSaida6(String var1);

    public Date getDataOcorrencia();

    public ApuracaoCartaoDePonto getApuracaoCartaoDePonto();

    public Jornada validar();
}

