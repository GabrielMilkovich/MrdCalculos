/**
 * Templates de Lançamento Expresso
 * Conjuntos pré-configurados de verbas por tipo de caso.
 * Cada template inclui verbas principais + reflexos automáticos.
 */

export interface TemplateVerba {
  nome: string;
  tipo: 'principal' | 'reflexa';
  caracteristica: 'comum' | '13_salario' | 'aviso_previo' | 'ferias';
  ocorrencia_pagamento: 'mensal' | 'dezembro' | 'periodo_aquisitivo' | 'desligamento';
  multiplicador: number;
  divisor_informado: number;
  tipo_divisor: string;
  tipo_quantidade: string;
  quantidade_informada: number;
  compor_principal: boolean;
  incidencias: { fgts: boolean; irpf: boolean; contribuicao_social: boolean; previdencia_privada: boolean; pensao_alimenticia: boolean };
  exclusoes: { faltas_justificadas: boolean; faltas_nao_justificadas: boolean; ferias_gozadas: boolean };
}

export interface TemplateExpresso {
  id: string;
  nome: string;
  descricao: string;
  categoria: 'rescisao' | 'horas_extras' | 'adicionais' | 'misto';
  icone: string; // lucide icon name
  verbas: TemplateVerba[];
}

// ── Incidências comuns ──
const INC_PADRAO = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
const INC_FERIAS = { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false };
const INC_AVISO = { fgts: true, irpf: false, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
const EXC_NENHUMA = { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false };
const EXC_FALTAS = { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: true };

export const TEMPLATES_EXPRESSO: TemplateExpresso[] = [
  {
    id: 'demissao_sem_justa_causa',
    nome: 'Demissão sem Justa Causa',
    descricao: 'Verbas rescisórias completas: saldo, aviso, 13º, férias, FGTS + 40%',
    categoria: 'rescisao',
    icone: 'UserMinus',
    verbas: [
      { nome: 'Saldo de Salário', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: { ...EXC_NENHUMA, faltas_nao_justificadas: true } },
      { nome: 'Aviso Prévio Indenizado', tipo: 'principal', caracteristica: 'aviso_previo', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 30, compor_principal: true, incidencias: INC_AVISO, exclusoes: EXC_NENHUMA },
      { nome: '13º Salário Proporcional', tipo: 'principal', caracteristica: '13_salario', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
      { nome: 'Férias Proporcionais + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 1.3333, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS, exclusoes: EXC_NENHUMA },
      { nome: 'Férias Vencidas + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 1.3333, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS, exclusoes: EXC_NENHUMA },
      { nome: 'Multa Art. 477 CLT', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    id: 'justa_causa_revertida',
    nome: 'Justa Causa Revertida',
    descricao: 'Quando a justa causa é revertida judicialmente — inclui aviso, férias, 13º e FGTS + 40%',
    categoria: 'rescisao',
    icone: 'Scale',
    verbas: [
      { nome: 'Saldo de Salário', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: { ...EXC_NENHUMA, faltas_nao_justificadas: true } },
      { nome: 'Aviso Prévio Indenizado', tipo: 'principal', caracteristica: 'aviso_previo', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 30, compor_principal: true, incidencias: INC_AVISO, exclusoes: EXC_NENHUMA },
      { nome: '13º Salário Proporcional', tipo: 'principal', caracteristica: '13_salario', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
      { nome: 'Férias Proporcionais + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 1.3333, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS, exclusoes: EXC_NENHUMA },
      { nome: 'Férias Vencidas + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 1.3333, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS, exclusoes: EXC_NENHUMA },
      { nome: 'Multa Art. 477 CLT', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: EXC_NENHUMA },
      { nome: 'Multa Art. 467 CLT', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 0.5, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    id: 'horas_extras_completo',
    nome: 'Horas Extras + Reflexos',
    descricao: 'HE 50% + RSR + reflexos em 13º, férias e FGTS',
    categoria: 'horas_extras',
    icone: 'Clock',
    verbas: [
      { nome: 'Horas Extras 50%', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.5, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_FALTAS },
      { nome: 'RSR sobre Horas Extras', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 26, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    id: 'he_intrajornada',
    nome: 'HE + Intrajornada + Reflexos',
    descricao: 'Horas extras 50%, intervalo intrajornada suprimido e RSR',
    categoria: 'misto',
    icone: 'Timer',
    verbas: [
      { nome: 'Horas Extras 50%', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.5, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_FALTAS },
      { nome: 'Intervalo Intrajornada Suprimido', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.5, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_FALTAS },
      { nome: 'RSR sobre Horas Extras', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 26, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    id: 'adicional_insalubridade',
    nome: 'Insalubridade + Reflexos',
    descricao: 'Adicional de insalubridade com reflexos em 13º, férias e FGTS',
    categoria: 'adicionais',
    icone: 'ShieldAlert',
    verbas: [
      { nome: 'Adicional de Insalubridade', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 0.2, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    id: 'adicional_periculosidade',
    nome: 'Periculosidade + Reflexos',
    descricao: 'Adicional de periculosidade 30% com reflexos automáticos',
    categoria: 'adicionais',
    icone: 'Zap',
    verbas: [
      { nome: 'Adicional de Periculosidade', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 0.3, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    id: 'rescisao_acordo',
    nome: 'Rescisão por Acordo (Art. 484-A)',
    descricao: 'Reforma Trabalhista: aviso 50%, FGTS multa 20%, férias e 13º integrais',
    categoria: 'rescisao',
    icone: 'Handshake',
    verbas: [
      { nome: 'Saldo de Salário', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: { ...EXC_NENHUMA, faltas_nao_justificadas: true } },
      { nome: 'Aviso Prévio Indenizado (50%)', tipo: 'principal', caracteristica: 'aviso_previo', ocorrencia_pagamento: 'desligamento', multiplicador: 0.5, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 30, compor_principal: true, incidencias: INC_AVISO, exclusoes: EXC_NENHUMA },
      { nome: '13º Salário Proporcional', tipo: 'principal', caracteristica: '13_salario', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
      { nome: 'Férias Proporcionais + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 1.3333, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    id: 'pedido_demissao',
    nome: 'Pedido de Demissão',
    descricao: 'Verbas devidas quando o empregado pede demissão — sem aviso, sem multa FGTS',
    categoria: 'rescisao',
    icone: 'LogOut',
    verbas: [
      { nome: 'Saldo de Salário', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: { ...EXC_NENHUMA, faltas_nao_justificadas: true } },
      { nome: '13º Salário Proporcional', tipo: 'principal', caracteristica: '13_salario', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
      { nome: 'Férias Proporcionais + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 1.3333, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS, exclusoes: EXC_NENHUMA },
    ],
  },
];

/**
 * Retorna templates filtrados por categoria
 */
export function getTemplatesPorCategoria(categoria?: string): TemplateExpresso[] {
  if (!categoria) return TEMPLATES_EXPRESSO;
  return TEMPLATES_EXPRESSO.filter(t => t.categoria === categoria);
}
