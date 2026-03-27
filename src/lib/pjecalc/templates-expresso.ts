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
// Férias gozadas durante o contrato: isenta de tudo
const INC_FERIAS = { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false };
// Férias indenizadas (pagas na rescisão — proporcionais ou vencidas): IRPF incide, INSS/FGTS não
// Lei 7.713/88, art. 6°, V + CLT art. 146 + TST OJ 195/SDI-1
const INC_FERIAS_INDENIZADAS = { fgts: false, irpf: true, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false };
const INC_AVISO = { fgts: true, irpf: false, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };
// PLR: isento de INSS/FGTS/CS; IRPF exclusivo na fonte (não incide na liquidação trabalhista)
const INC_PLR = { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false };
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
      { nome: 'Férias Proporcionais + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 4 / 3, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS_INDENIZADAS, exclusoes: EXC_NENHUMA },
      { nome: 'Férias Vencidas + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 4 / 3, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS_INDENIZADAS, exclusoes: EXC_NENHUMA },
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
      { nome: 'Férias Proporcionais + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 4 / 3, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS_INDENIZADAS, exclusoes: EXC_NENHUMA },
      { nome: 'Férias Vencidas + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 4 / 3, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS_INDENIZADAS, exclusoes: EXC_NENHUMA },
      { nome: 'Multa Art. 477 CLT', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: EXC_NENHUMA },
      { nome: 'Multa Art. 467 CLT', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 0.5, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    id: 'horas_extras_completo',
    nome: 'Horas Extras 50% + Reflexos',
    descricao: 'HE 50% (dias úteis + sábados) com RSR e reflexos em 13º, férias, FGTS',
    categoria: 'horas_extras',
    icone: 'Clock',
    verbas: [
      { nome: 'Horas Extras 50%', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.5, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_FALTAS },
      { nome: 'RSR sobre Horas Extras', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 26, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    // HE 100% — art. 59 §1° CLT: feriados e domingos exigem adicional de 100%
    // TST OJ 410/SDI-1: HE em feriado paga com adicional de 100% (dobra)
    id: 'horas_extras_100',
    nome: 'Horas Extras 100% + Reflexos',
    descricao: 'HE 100% (domingos, feriados, art. 59 CLT) com RSR e reflexos',
    categoria: 'horas_extras',
    icone: 'Clock',
    verbas: [
      { nome: 'Horas Extras 100%', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 2, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_FALTAS },
      { nome: 'RSR sobre Horas Extras 100%', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 26, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    // HE mistas: 50% em dias úteis + 100% em domingos/feriados
    id: 'horas_extras_mistas',
    nome: 'Horas Extras Mistas (50% + 100%) + Reflexos',
    descricao: 'HE 50% em dias úteis e HE 100% em domingos/feriados com RSR',
    categoria: 'horas_extras',
    icone: 'Clock',
    verbas: [
      { nome: 'Horas Extras 50%', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.5, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_FALTAS },
      { nome: 'Horas Extras 100%', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 2, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_FALTAS },
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
    // Insalubridade Grau Mínimo — 10% do salário mínimo nacional (art. 192 CLT)
    // ATENÇÃO: base_calculo deve incluir 'salario_minimo' na tabela para que o engine
    // use o SM da competência como base, não o salário do trabalhador.
    id: 'adicional_insalubridade_minimo',
    nome: 'Insalubridade Grau Mínimo (10% SM)',
    descricao: 'Adicional de insalubridade grau mínimo — 10% do salário mínimo (art. 192 CLT)',
    categoria: 'adicionais',
    icone: 'ShieldAlert',
    verbas: [
      { nome: 'Adicional de Insalubridade Grau Mínimo', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 0.10, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    // Insalubridade Grau Médio — 20% do salário mínimo nacional (art. 192 CLT)
    id: 'adicional_insalubridade_medio',
    nome: 'Insalubridade Grau Médio (20% SM)',
    descricao: 'Adicional de insalubridade grau médio — 20% do salário mínimo (art. 192 CLT)',
    categoria: 'adicionais',
    icone: 'ShieldAlert',
    verbas: [
      { nome: 'Adicional de Insalubridade Grau Médio', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 0.20, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    // Insalubridade Grau Máximo — 40% do salário mínimo nacional (art. 192 CLT)
    id: 'adicional_insalubridade_maximo',
    nome: 'Insalubridade Grau Máximo (40% SM)',
    descricao: 'Adicional de insalubridade grau máximo — 40% do salário mínimo (art. 192 CLT)',
    categoria: 'adicionais',
    icone: 'ShieldAlert',
    verbas: [
      { nome: 'Adicional de Insalubridade Grau Máximo', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 0.40, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    // Adicional Noturno — 20% por hora noturna (22h–5h), art. 73 CLT
    // Fórmula: (salário / carga_horária) × 0.20 × horas_noturnas_do_mês
    // Cartão de ponto: campo 'horas_noturnas'
    id: 'adicional_noturno',
    nome: 'Adicional Noturno + Reflexos',
    descricao: 'Adicional noturno 20% (22h–5h) com reflexos em 13º, férias e DSR (art. 73 CLT)',
    categoria: 'adicionais',
    icone: 'Moon',
    verbas: [
      { nome: 'Adicional Noturno', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 0.20, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 0, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_FALTAS },
    ],
  },
  {
    id: 'adicional_periculosidade',
    nome: 'Periculosidade + Reflexos',
    descricao: 'Adicional de periculosidade 30% sobre salário contratual (art. 193 CLT)',
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
      { nome: 'Férias Proporcionais + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 4 / 3, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS_INDENIZADAS, exclusoes: EXC_NENHUMA },
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
      { nome: 'Férias Proporcionais + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 4 / 3, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS_INDENIZADAS, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    // PLR — Participação nos Lucros e Resultados (Lei 10.101/2000)
    // Isenta de INSS, FGTS e CS (não integra salário — art. 7° XI CF/88)
    // IRPF: tributação exclusiva na fonte (tabela progressiva anual) — não incide na liquidação trabalhista
    // Base de cálculo: valor global acordado na norma coletiva / proporcional ao período trabalhado
    id: 'plr',
    nome: 'PLR – Participação nos Lucros (Lei 10.101/2000)',
    descricao: 'PLR proporcional ao período — isenta de INSS/FGTS/CS, IRPF exclusivo na fonte (art. 7° XI CF/88)',
    categoria: 'misto',
    icone: 'TrendingUp',
    verbas: [
      { nome: 'PLR Proporcional', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_PLR, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    // Sobreaviso (art. 244 §2° CLT) — 1/3 do salário por hora em sobreaviso
    // Tipo: 1/3 da hora normal (não confundir com hora extra)
    // TST Súmula 428: telefone celular fora do local = sobreaviso; aguarda chamado no local = sobreaviso pleno
    id: 'sobreaviso',
    nome: 'Sobreaviso (art. 244 CLT)',
    descricao: 'Horas em sobreaviso — 1/3 da hora normal; cartão de ponto campo horas_sobreaviso (art. 244 §2° CLT)',
    categoria: 'horas_extras',
    icone: 'Phone',
    verbas: [
      { nome: 'Sobreaviso', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1 / 3, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 0, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_FALTAS },
      { nome: 'RSR sobre Sobreaviso', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 26, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    // Rescisão Indireta (art. 483 CLT) — equiparada a demissão sem justa causa
    id: 'rescisao_indireta',
    nome: 'Rescisão Indireta (art. 483 CLT)',
    descricao: 'Rescisão por culpa do empregador — mesmos direitos da demissão sem justa causa',
    categoria: 'rescisao',
    icone: 'AlertTriangle',
    verbas: [
      { nome: 'Saldo de Salário', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: { ...EXC_NENHUMA, faltas_nao_justificadas: true } },
      { nome: 'Aviso Prévio Indenizado', tipo: 'principal', caracteristica: 'aviso_previo', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 30, compor_principal: true, incidencias: INC_AVISO, exclusoes: EXC_NENHUMA },
      { nome: '13º Salário Proporcional', tipo: 'principal', caracteristica: '13_salario', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
      { nome: 'Férias Proporcionais + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 4 / 3, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS_INDENIZADAS, exclusoes: EXC_NENHUMA },
      { nome: 'Férias Vencidas + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 4 / 3, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_FERIAS_INDENIZADAS, exclusoes: EXC_NENHUMA },
    ],
  },
  {
    // Diferenças Salariais — reajuste de salário retroativo não pago corretamente
    id: 'diferencas_salariais',
    nome: 'Diferenças Salariais + Reflexos',
    descricao: 'Diferenças de salário por reajuste não pago (CCT/dissídio/equiparação salarial) + RSR',
    categoria: 'misto',
    icone: 'DollarSign',
    verbas: [
      { nome: 'Diferenças Salariais', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_FALTAS },
      { nome: 'RSR sobre Diferenças', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 26, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, compor_principal: true, incidencias: INC_PADRAO, exclusoes: EXC_NENHUMA },
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
