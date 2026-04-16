/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.dialect.H2Dialect
 */
package br.jus.trt8.pjecalc.base.comum;

import org.hibernate.dialect.H2Dialect;

public class DialetoH2
extends H2Dialect {
    public DialetoH2() {
        this.registerColumnType(16, "boolean");
        this.registerColumnType(-5, "bigint");
        this.registerColumnType(-2, "binary");
        this.registerColumnType(-7, "boolean");
        this.registerColumnType(1, "char($l)");
        this.registerColumnType(91, "date");
        this.registerColumnType(3, "decimal($p,$s)");
        this.registerColumnType(8, "double");
        this.registerColumnType(6, "float");
        this.registerColumnType(4, "integer");
        this.registerColumnType(-4, "longvarbinary");
        this.registerColumnType(-1, "longvarchar");
        this.registerColumnType(7, "real");
        this.registerColumnType(5, "smallint");
        this.registerColumnType(-6, "tinyint");
        this.registerColumnType(92, "time");
        this.registerColumnType(93, "timestamp");
        this.registerColumnType(12, "varchar($l)");
        this.registerColumnType(-3, "binary($l)");
        this.registerColumnType(2, "decimal($p,$s)");
        this.registerColumnType(2004, "blob");
        this.registerColumnType(2005, "clob");
    }
}

