/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.SQLQuery
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.usuario;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.constantes.InstanciaSetorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Setor;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.CalculoRecenteUsuario;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.Usuario;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import org.hibernate.SQLQuery;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCalculoRecenteUsuario")
public class RepositorioDeCalculoRecenteUsuario
extends RepositorioBase<CalculoRecenteUsuario> {
    private static final String BASE_CONSULTA_CALCULOS_RECENTES = "SELECT CR.SNRCPF, CR.IIDCALCULO, CR.DDTACESSO, CR.SNMRECLAMANTE, CR.INRPROCESSO, CR.STPINSTANCIA, CR.IDUSUSETOR, C.SFLCALCULOEXTERNO, CR.IIDCALCULORECENTE FROM TBCALCULOSRECENTESUSUARIO CR join TBCALCULO C on CR.IIDCALCULO = C.IIDCALCULO where C.SFLATIVO='S' ";
    private static final String ORDER_PADRAO_CALCULOS_RECENTES = " order by DDTACESSO desc";
    private static final int INDICE_CPF = 0;
    private static final int INDICE_CALCULO = 1;
    private static final int INDICE_DATA = 2;
    private static final int INDICE_NOME = 3;
    private static final int INDICE_PROCESSO = 4;
    private static final int INDICE_INSTANCIA = 5;
    private static final int INDICE_SETOR = 6;
    private static final int INDICE_CALCULO_EXTERNO = 7;
    private static final int INDICE_CALCULO_RECENTE = 8;

    public RepositorioDeCalculoRecenteUsuario() {
        super(CalculoRecenteUsuario.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<CalculoRecenteUsuario> obterCalculoRecente(Long calculo, String cpf, InstanciaSetorEnum instancia, Integer idSetor, boolean isVersaoOnline) {
        if (isVersaoOnline) {
            return this.obterListaEntidadeBases("from CalculoRecenteUsuario c where c.calculo=? and c.cpf=? and c.instancia=? and c.idSetor=?", new Object[]{calculo, cpf, instancia, idSetor});
        }
        return this.obterListaEntidadeBases("from CalculoRecenteUsuario c where c.calculo=? and c.cpf=? and c.instancia is null and c.idSetor=?", calculo, cpf, idSetor);
    }

    protected List<CalculoRecenteUsuario> obterCalculoRecenteA(Long calculo) {
        List result = this.getSession().createSQLQuery("SELECT CR.SNRCPF, CR.IIDCALCULO, CR.DDTACESSO, CR.SNMRECLAMANTE,CR.INRPROCESSO,CR.STPINSTANCIA,CR.IDUSUSETOR,CR.SFLCALCULOEXTERNO FROM TBCALCULOSRECENTESUSUARIO  CR where CR.IIDCALCULO = :calculo").setParameter("calculo", (Object)calculo).list();
        Iterator itr = result.iterator();
        ArrayList<CalculoRecenteUsuario> listaCr = new ArrayList<CalculoRecenteUsuario>();
        while (itr.hasNext()) {
            Object[] obj = (Object[])itr.next();
            String cpf = String.valueOf(obj[0]);
            Date date = (Date)obj[2];
            String nome = String.valueOf(obj[3]);
            String processo = String.valueOf(obj[4]);
            InstanciaSetorEnum instancia = InstanciaSetorEnum.PRIMEIRA.getValor().equals(String.valueOf(obj[5])) ? InstanciaSetorEnum.PRIMEIRA : InstanciaSetorEnum.SEGUNDA;
            Integer idSetor = Utils.naoNulo(obj[6]) ? Integer.valueOf(Integer.parseInt(String.valueOf(obj[6]))) : null;
            Boolean calculoExterno = Utils.naoNulo(obj[7]) ? Boolean.valueOf(Boolean.parseBoolean(String.valueOf(obj[7]))) : null;
            CalculoRecenteUsuario cr = new CalculoRecenteUsuario(cpf, calculo, date, nome, processo, instancia, idSetor, calculoExterno);
            listaCr.add(cr);
        }
        return listaCr;
    }

    protected List<Object> obterListaEntidadeBasesSqlNativoCalculosRecentes(String cpf, Integer setorId, String instancia) {
        StringBuilder sbQuery = new StringBuilder();
        sbQuery.append(BASE_CONSULTA_CALCULOS_RECENTES);
        sbQuery.append("and CR.SNRCPF = :cpf and C.IIDSETOR = :setor and C.STPINSTANCIA= :instancia");
        sbQuery.append(ORDER_PADRAO_CALCULOS_RECENTES);
        SQLQuery query = this.getSession().createSQLQuery(sbQuery.toString());
        query.setParameter("cpf", (Object)cpf);
        query.setParameter("setor", (Object)setorId);
        query.setParameter("instancia", (Object)instancia);
        return query.list();
    }

    protected List<Object> obterListaEntidadeBasesSqlNativoCalculosRecentesOffline() {
        StringBuilder sbQuery = new StringBuilder();
        sbQuery.append(BASE_CONSULTA_CALCULOS_RECENTES);
        sbQuery.append(ORDER_PADRAO_CALCULOS_RECENTES);
        SQLQuery query = this.getSession().createSQLQuery(sbQuery.toString());
        return query.list();
    }

    public List<CalculoRecenteUsuario> obterCalculosRecentesDo(String cpf, Setor setor, boolean isVersaoOnline) {
        List<Object> result = isVersaoOnline ? this.obterListaEntidadeBasesSqlNativoCalculosRecentes(cpf, setor.getId(), setor.getInstancia().getValor()) : this.obterListaEntidadeBasesSqlNativoCalculosRecentesOffline();
        Iterator<Object> itr = result.iterator();
        ArrayList<CalculoRecenteUsuario> listaCr = new ArrayList<CalculoRecenteUsuario>();
        while (itr.hasNext()) {
            Object[] obj = (Object[])itr.next();
            Long calculo = Long.parseLong(String.valueOf(obj[1]));
            Date date = (Date)obj[2];
            String nome = Utils.naoNulo(obj[3]) ? String.valueOf(obj[3]) : null;
            String processo = Utils.naoNulo(obj[4]) ? String.valueOf(obj[4]) : null;
            InstanciaSetorEnum instancia = InstanciaSetorEnum.PRIMEIRA.getValor().equals(String.valueOf(obj[5])) ? InstanciaSetorEnum.PRIMEIRA : InstanciaSetorEnum.SEGUNDA;
            Integer idSetor = Utils.naoNulo(obj[6]) ? Integer.valueOf(Integer.parseInt(String.valueOf(obj[6]))) : null;
            Boolean calculoExterno = Boolean.parseBoolean(String.valueOf(obj[7]));
            Long calculoRecente = Long.parseLong(String.valueOf(obj[8]));
            CalculoRecenteUsuario cr = new CalculoRecenteUsuario(calculoRecente, cpf, calculo, date, nome, processo, instancia, idSetor, calculoExterno);
            listaCr.add(cr);
        }
        return listaCr;
    }

    public List<CalculoRecenteUsuario> obterCalculosRecentesDoAntigo(String cpf, Setor setor, boolean isVersaoOnline) {
        if (isVersaoOnline) {
            return this.obterListaEntidadeBases("from CalculoRecenteUsuario c where c.calculo.ativo=? and c.cpf=? and c.calculo.idSetor=? and c.calculo.instancia=? order by dataAcesso desc", new Object[]{true, cpf, setor.getId(), setor.getInstancia()});
        }
        return this.obterListaEntidadeBases("from CalculoRecenteUsuario c where c.calculo.ativo=? and c.cpf=? and c.calculo.idSetor=? and c.calculo.instancia is null order by dataAcesso desc", true, cpf, setor.getId());
    }

    @Deprecated
    public List<CalculoRecenteUsuario> obterCalculosRecentesDo(Usuario usuario) {
        String cpf = usuario.getLogin().length() > 11 ? usuario.getLogin().substring(0, 11) : usuario.getLogin();
        return this.obterListaEntidadeBases("from CalculoRecenteUsuario c where c.cpf=? order by dataAcesso desc", cpf);
    }

    @Override
    public void salvar(CalculoRecenteUsuario calculoRecente) {
        super.salvar(calculoRecente);
    }
}

