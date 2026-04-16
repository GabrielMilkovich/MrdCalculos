/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.HibernateException
 *  org.hibernate.usertype.ParameterizedType
 *  org.hibernate.usertype.UserType
 */
package br.jus.trt8.pjecalc.base.comum;

import java.io.Serializable;
import java.lang.reflect.Method;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Properties;
import org.hibernate.HibernateException;
import org.hibernate.usertype.ParameterizedType;
import org.hibernate.usertype.UserType;

public class EnumUserType
implements UserType,
ParameterizedType {
    private static String CONSTANTS_PACKAGE = "br.jus.trt8.pjecalc.negocio.constantes";
    public static final String CLASS_NAME = "br.jus.trt8.pjecalc.base.comum.EnumUserType";
    private String className;
    private static final int[] SQL_TYPES = new int[]{12};

    public int[] sqlTypes() {
        return SQL_TYPES;
    }

    public Class returnedClass() {
        return Enum.class;
    }

    public Object nullSafeGet(ResultSet resultSet, String[] names, Object owner) throws HibernateException, SQLException {
        if (this.className == null) {
            throw new HibernateException("Parameter 'enum' not defined");
        }
        Object dbValue = resultSet.getObject(names[0]);
        if (!resultSet.wasNull()) {
            Object[] values = null;
            try {
                Class<?> clazz = Class.forName(CONSTANTS_PACKAGE + "." + this.className);
                Method valuesMethod = clazz.getMethod("values", new Class[0]);
                values = (Object[])valuesMethod.invoke(clazz, new Object[0]);
            }
            catch (Exception e) {
                throw new HibernateException("Enum '" + CONSTANTS_PACKAGE + "." + this.className + "' not found", (Throwable)e);
            }
            try {
                for (Object value : values) {
                    Method getValorMethod = value.getClass().getMethod("getValor", new Class[0]);
                    Object parsedValue = getValorMethod.invoke(value, new Object[0]);
                    if (parsedValue == null || !parsedValue.toString().trim().equals(dbValue.toString().trim())) continue;
                    return value;
                }
            }
            catch (Exception e) {
                throw new HibernateException("Method 'getValor' not found in '" + CONSTANTS_PACKAGE + "." + this.className + "'", (Throwable)e);
            }
        }
        return null;
    }

    public void nullSafeSet(PreparedStatement preparedStatement, Object value, int index) throws HibernateException, SQLException {
        if (null == value) {
            preparedStatement.setNull(index, 12);
        } else {
            try {
                Method getValorMethod = value.getClass().getMethod("getValor", new Class[0]);
                Object enumValue = getValorMethod.invoke(value, new Object[0]);
                preparedStatement.setObject(index, enumValue);
            }
            catch (Exception e) {
                throw new HibernateException("Method 'getValor' not found in '" + CONSTANTS_PACKAGE + "." + this.className + "'", (Throwable)e);
            }
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

    public void setParameterValues(Properties properties) {
        this.className = (String)properties.get("enum");
    }
}

