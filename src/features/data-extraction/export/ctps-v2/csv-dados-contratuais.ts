import type { CtpsDominioV2 } from '@/domain/tipos-dominio';

/**
 * Gera `dados_contratuais.csv` no formato pivot SECAO;CAMPO;VALOR.
 *
 * Formato confirmado contra fixture do Roque (correção em Fase 3.0):
 * - boolean → "Sim" | "Não"
 * - null → string vazia
 * - número decimal → "0,00" (vírgula BR)
 * - seções tabulares (FUNCOES_EXERCIDAS, HISTORICO_LOTACAO, etc) exportam
 *   só o total (não as linhas)
 * - observacoes_fgts NÃO entra no CSV (decisão de curadoria — texto longo
 *   de cláusula contratual, não é dado estruturado consumido por PJe-Calc)
 */
export function gerarDadosContratuais(ctps: CtpsDominioV2): string {
  const linhas: string[] = ['SECAO;CAMPO;VALOR'];

  // LOCAL_TRABALHO
  const lt = ctps.local_trabalho;
  push(linhas, 'LOCAL_TRABALHO', 'estabelecimento', lt.estabelecimento);
  push(linhas, 'LOCAL_TRABALHO', 'matriz_filial', lt.matriz_filial);
  push(linhas, 'LOCAL_TRABALHO', 'cnpj', lt.cnpj);
  push(linhas, 'LOCAL_TRABALHO', 'inscricao_estadual', lt.inscricao_estadual);
  push(linhas, 'LOCAL_TRABALHO', 'endereco_rua', lt.endereco_rua);
  push(linhas, 'LOCAL_TRABALHO', 'endereco_numero', lt.endereco_numero);
  push(linhas, 'LOCAL_TRABALHO', 'endereco_complemento', lt.endereco_complemento);
  push(linhas, 'LOCAL_TRABALHO', 'endereco_bairro', lt.endereco_bairro);
  push(linhas, 'LOCAL_TRABALHO', 'endereco_cep', lt.endereco_cep);
  push(linhas, 'LOCAL_TRABALHO', 'endereco_telefone', lt.endereco_telefone);
  push(linhas, 'LOCAL_TRABALHO', 'endereco_municipio', lt.endereco_municipio);
  push(linhas, 'LOCAL_TRABALHO', 'endereco_uf', lt.endereco_uf);
  push(linhas, 'LOCAL_TRABALHO', 'endereco_pais', lt.endereco_pais);

  // DADOS_PESSOAIS
  const dp = ctps.dados_pessoais;
  push(linhas, 'DADOS_PESSOAIS', 'nome', dp.nome);
  push(linhas, 'DADOS_PESSOAIS', 'sexo', dp.sexo);
  push(linhas, 'DADOS_PESSOAIS', 'estado_civil', dp.estado_civil);
  push(linhas, 'DADOS_PESSOAIS', 'estudante', bool(dp.estudante));
  push(linhas, 'DADOS_PESSOAIS', 'naturalidade', dp.naturalidade);
  push(linhas, 'DADOS_PESSOAIS', 'naturalidade_uf', dp.naturalidade_uf);
  push(linhas, 'DADOS_PESSOAIS', 'naturalidade_pais', dp.naturalidade_pais);
  push(linhas, 'DADOS_PESSOAIS', 'nascimento', dp.nascimento);
  push(linhas, 'DADOS_PESSOAIS', 'rg_numero', dp.rg_numero);
  push(linhas, 'DADOS_PESSOAIS', 'rg_orgao', dp.rg_orgao);
  push(linhas, 'DADOS_PESSOAIS', 'ctps_numero', dp.ctps_numero);
  push(linhas, 'DADOS_PESSOAIS', 'ctps_uf', dp.ctps_uf);
  push(linhas, 'DADOS_PESSOAIS', 'cpf', dp.cpf);
  push(linhas, 'DADOS_PESSOAIS', 'pis_pasep', dp.pis_pasep);
  push(linhas, 'DADOS_PESSOAIS', 'primeiro_emprego', bool(dp.primeiro_emprego));
  push(linhas, 'DADOS_PESSOAIS', 'titulo_eleitor', dp.titulo_eleitor);
  push(linhas, 'DADOS_PESSOAIS', 'carteira_habilitacao', dp.carteira_habilitacao);
  push(linhas, 'DADOS_PESSOAIS', 'certificado_reservista', dp.certificado_reservista);
  push(linhas, 'DADOS_PESSOAIS', 'grau_instrucao', dp.grau_instrucao);
  push(linhas, 'DADOS_PESSOAIS', 'pai', dp.pai);
  push(linhas, 'DADOS_PESSOAIS', 'mae', dp.mae);

  // ENDERECO_RESIDENCIAL
  const er = ctps.endereco_residencial;
  push(linhas, 'ENDERECO_RESIDENCIAL', 'rua', er.rua);
  push(linhas, 'ENDERECO_RESIDENCIAL', 'numero', er.numero);
  push(linhas, 'ENDERECO_RESIDENCIAL', 'complemento', er.complemento);
  push(linhas, 'ENDERECO_RESIDENCIAL', 'bairro', er.bairro);
  push(linhas, 'ENDERECO_RESIDENCIAL', 'cep', er.cep);
  push(linhas, 'ENDERECO_RESIDENCIAL', 'telefone', er.telefone);
  push(linhas, 'ENDERECO_RESIDENCIAL', 'municipio', er.municipio);
  push(linhas, 'ENDERECO_RESIDENCIAL', 'uf', er.uf);
  push(linhas, 'ENDERECO_RESIDENCIAL', 'pais', er.pais);

  // DEPENDENTES (1 indexed, dependente_N_campo)
  ctps.dependentes.forEach((dep, i) => {
    const n = i + 1;
    push(linhas, 'DEPENDENTES', `dependente_${n}_nome`, dep.nome);
    push(linhas, 'DEPENDENTES', `dependente_${n}_parentesco`, dep.parentesco);
    push(linhas, 'DEPENDENTES', `dependente_${n}_sexo`, dep.sexo);
    push(linhas, 'DEPENDENTES', `dependente_${n}_nascimento`, dep.nascimento);
    push(linhas, 'DEPENDENTES', `dependente_${n}_irrf`, bool(dep.irrf));
    push(linhas, 'DEPENDENTES', `dependente_${n}_salario_familia`, bool(dep.salario_familia));
  });

  // DADOS_EMPREGADO (observacoes_fgts NÃO entra — texto longo de contrato)
  const de = ctps.dados_empregado;
  push(linhas, 'DADOS_EMPREGADO', 'matricula', de.matricula);
  push(linhas, 'DADOS_EMPREGADO', 'admissao', de.admissao);
  push(linhas, 'DADOS_EMPREGADO', 'vinculo', de.vinculo);
  push(linhas, 'DADOS_EMPREGADO', 'registro_mte', de.registro_mte);
  push(linhas, 'DADOS_EMPREGADO', 'data_opcao_fgts', de.data_opcao_fgts);
  push(linhas, 'DADOS_EMPREGADO', 'banco_fgts', de.banco_fgts);
  push(linhas, 'DADOS_EMPREGADO', 'agencia_fgts', de.agencia_fgts);
  push(linhas, 'DADOS_EMPREGADO', 'conta_fgts', de.conta_fgts);
  push(linhas, 'DADOS_EMPREGADO', 'banco_pagamento', de.banco_pagamento);
  push(linhas, 'DADOS_EMPREGADO', 'agencia_pagamento', de.agencia_pagamento);
  push(linhas, 'DADOS_EMPREGADO', 'conta_pagamento', de.conta_pagamento);
  push(linhas, 'DADOS_EMPREGADO', 'tipo_afastamento', de.tipo_afastamento);
  push(linhas, 'DADOS_EMPREGADO', 'data_desligamento', de.data_desligamento);
  push(
    linhas,
    'DADOS_EMPREGADO',
    'data_desligamento_com_projecao_aviso',
    de.data_desligamento_com_projecao_aviso,
  );
  push(linhas, 'DADOS_EMPREGADO', 'dias_aviso_previo', num(de.dias_aviso_previo));
  push(linhas, 'DADOS_EMPREGADO', 'observacoes_desligamento', de.observacoes_desligamento);

  // FUNCAO_ATUAL
  const fa = ctps.funcao_atual;
  push(linhas, 'FUNCAO_ATUAL', 'funcao', fa.funcao);
  push(linhas, 'FUNCAO_ATUAL', 'cargo', fa.cargo);
  push(linhas, 'FUNCAO_ATUAL', 'ingresso', fa.ingresso);
  push(linhas, 'FUNCAO_ATUAL', 'cbo', fa.cbo);
  push(linhas, 'FUNCAO_ATUAL', 'tipo_salario', fa.tipo_salario);
  push(linhas, 'FUNCAO_ATUAL', 'salario_tarefa', numBR(fa.salario_tarefa));
  push(linhas, 'FUNCAO_ATUAL', 'situacao', fa.situacao);

  // INFORMACOES_SINDICAIS
  if (ctps.informacoes_sindicais) {
    const is = ctps.informacoes_sindicais;
    push(linhas, 'INFORMACOES_SINDICAIS', 'sindicato', is.sindicato);
    push(linhas, 'INFORMACOES_SINDICAIS', 'cnpj', is.cnpj);
    push(linhas, 'INFORMACOES_SINDICAIS', 'endereco_rua', is.endereco_rua);
    push(linhas, 'INFORMACOES_SINDICAIS', 'endereco_numero', is.endereco_numero);
    push(linhas, 'INFORMACOES_SINDICAIS', 'endereco_complemento', is.endereco_complemento);
  }

  // Totais das seções tabulares
  push(linhas, 'FUNCOES_EXERCIDAS', 'total', String(ctps.funcoes_exercidas.length));
  push(linhas, 'HISTORICO_LOTACAO', 'total', String(ctps.historico_lotacao.length));
  push(linhas, 'AFASTAMENTOS', 'total', String(ctps.afastamentos.length));
  push(linhas, 'AFASTAMENTOS_OUTROS', 'total', String(ctps.afastamentos_outros.length));
  push(linhas, 'HISTORICO_FERIAS', 'total', String(ctps.historico_ferias.length));
  push(linhas, 'HISTORICO_SALARIAL', 'total', String(ctps.historico_salarial.length));

  return linhas.join('\n') + '\n';
}

function push(linhas: string[], secao: string, campo: string, valor: string | null | undefined): void {
  linhas.push(`${secao};${campo};${valor ?? ''}`);
}

function bool(v: boolean | null): string {
  if (v === true) return 'Sim';
  if (v === false) return 'Não';
  return '';
}

function num(v: number | null): string {
  return v == null ? '' : String(v);
}

function numBR(v: number | null): string {
  if (v == null) return '';
  return v.toFixed(2).replace('.', ',');
}
