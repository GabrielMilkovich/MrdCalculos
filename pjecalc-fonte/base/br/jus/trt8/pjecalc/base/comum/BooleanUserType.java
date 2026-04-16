/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.HibernateException
 *  org.hibernate.usertype.UserType
 */
package br.jus.trt8.pjecalc.base.comum;

import java.io.Serializable;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.hibernate.HibernateException;
import org.hibernate.usertype.UserType;

public class BooleanUserType
implements UserType {
    private static final int[] SQL_TYPES = new int[]{12};
    public static final String CLASS_NAME = "br.jus.trt8.pjecalc.base.comum.BooleanUserType";

    public int[] sqlTypes() {
        return SQL_TYPES;
    }

    public Class returnedClass() {
        return Boolean.class;
    }

    public Object nullSafeGet(ResultSet resultSet, String[] names, Object owner) throws HibernateException, SQLException {
        Object dbValue = resultSet.getObject(names[0]);
        if (!resultSet.wasNull()) {
            return dbValue != null && dbValue.equals("S") ? Boolean.TRUE : Boolean.FALSE;
        }
        return null;
    }

    public void nullSafeSet(PreparedStatement preparedStatement, Object value, int index) throws HibernateException, SQLException {
        if (null == value) {
            preparedStatement.setNull(index, 12);
        } else {
            String boolValue = (Boolean)value != false ? "S" : "N";
            preparedStatement.setObject(index, boolValue);
        }
    }

    public Object deepCopy(Object value) throws HibernateException {
        return value;
    }

    public boolean isMutable() {
        return false;
    }

    public Object assemble(Serializable cached, Object owner) throws HibernateException {
        return cached;
    }

    public Serializable disassemble(Object value) throws HibernateException {
        return (Serializable)value;
    }

    public Object replace(Object original, Object target, Object owner) throws HibernateException {
        return original;
    }

    public int hashCode(Object x) throws HibernateException {
        return x.hashCode();
    }

    public boolean equals(Object x, Object y) throws HibernateException {
        if (x == y) {
            return true;
        }
        if (null == x || null == y) {
            return false;
        }
        return x.equals(y);
    }
}

