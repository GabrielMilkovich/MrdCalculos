export interface CtpsLocalTrabalho {
  estabelecimento: string;
  matriz_filial: "Matriz" | "Filial" | null;
  cnpj: string;
  inscricao_estadual: string | null;
  endereco_rua: string;
  endereco_numero: string;
  endereco_complemento: string | null;
  endereco_bairro: string;
  endereco_cep: string;
  endereco_telefone: string | null;
  endereco_municipio: string;
  endereco_uf: string;
  endereco_pais: string;
}

export interface CtpsDadosPessoais {
  nome: string;
  sexo: "Masculino" | "Feminino" | null;
  estado_civil: string | null;
  estudante: boolean | null;
  naturalidade: string | null;
  naturalidade_uf: string | null;
  naturalidade_pais: string | null;
  nascimento: string;
  rg_numero: string | null;
  rg_orgao: string | null;
  ctps_numero: string | null;
  ctps_uf: string | null;
  cpf: string;
  pis_pasep: string | null;
  primeiro_emprego: boolean | null;
  titulo_eleitor: string | null;
  carteira_habilitacao: string | null;
  certificado_reservista: string | null;
  grau_instrucao: string | null;
  pai: string | null;
  mae: string | null;
}

export interface CtpsEnderecoResidencial {
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cep: string;
  telefone: string | null;
  municipio: string;
  uf: string;
  pais: string;
}

export interface CtpsDependente {
  nome: string;
  parentesco: string;
  sexo: "Masculino" | "Feminino" | null;
  nascimento: string;
  irrf: boolean;
  salario_familia: boolean;
}

export interface CtpsDadosEmpregado {
  matricula: string;
  admissao: string;
  vinculo: string;
  registro_mte: string | null;
  data_opcao_fgts: string | null;
  banco_fgts: string | null;
  agencia_fgts: string | null;
  conta_fgts: string | null;
  observacoes_fgts: string | null;
  banco_pagamento: string | null;
  agencia_pagamento: string | null;
  conta_pagamento: string | null;
  tipo_afastamento: string | null;
  data_desligamento: string | null;
  data_desligamento_com_projecao_aviso: string | null;
  observacoes_desligamento: string | null;
  dias_aviso_previo: number | null;
}

export interface CtpsFuncaoAtual {
  funcao: string;
  cargo: string;
  ingresso: string;
  cbo: string | null;
  tipo_salario: string | null;
  salario_tarefa: number;
  situacao: "Ativo" | "Inativo" | null;
}

export interface CtpsInformacoesSindicais {
  sindicato: string;
  cnpj: string;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
}

export interface CtpsHistoricoSalarialItem {
  data_vigencia: string;
  data_historica: string;
  motivo: string;
  sal_tarefa: number;
  perc_reajuste: number;
  min_garantido: number;
  comissao: number | null;
}

export interface CtpsFuncaoExercida {
  data_alteracao: string;
  codigo_cargo: string;
  cargo: string;
  codigo_funcao: string;
  funcao: string;
  motivo: string | null;
  quebra_caixa: boolean;
  insalubre: boolean;
  periculoso: boolean;
}

export interface CtpsLotacao {
  ingresso: string;
  codigo_estabelecimento: string;
  estabelecimento: string;
  cnpj_estabelecimento: string;
  centro_resultado: string;
}

export interface CtpsAfastamento {
  data_inicio: string;
  situacao: string;
  retorno: string | null;
  categoria: "afastamento" | "atestado_medico" | "auxilio_doenca" | "desligamento" | "outros";
}

export interface CtpsHistoricoFeriasItem {
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  periodo_gozo_inicio: string;
  periodo_gozo_fim: string;
  dias_gozo: number;
  abono_dias: number;
  observacoes: string | null;
}

export interface CtpsDominioV2 {
  local_trabalho: CtpsLocalTrabalho;
  dados_pessoais: CtpsDadosPessoais;
  endereco_residencial: CtpsEnderecoResidencial;
  dependentes: CtpsDependente[];
  dados_empregado: CtpsDadosEmpregado;
  funcao_atual: CtpsFuncaoAtual;
  informacoes_sindicais: CtpsInformacoesSindicais | null;
  historico_salarial: CtpsHistoricoSalarialItem[];
  funcoes_exercidas: CtpsFuncaoExercida[];
  historico_lotacao: CtpsLotacao[];
  afastamentos: CtpsAfastamento[];
  afastamentos_outros: CtpsAfastamento[];
  historico_ferias: CtpsHistoricoFeriasItem[];
  _meta: {
    parser: string;
    source_emitter: "ADP-Web" | "SAP" | "outro";
    extraction_method: "pdfjs_geometric" | "pdftotext" | "claude_vision" | "mistral_ocr";
    extracted_at: string;
    confidence: number;
  };
}
