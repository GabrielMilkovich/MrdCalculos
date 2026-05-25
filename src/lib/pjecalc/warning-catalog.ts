import type { MotorWarning, WarningSeverity } from './warning-types';

interface CatalogEntry {
  severity: MotorWarning['severity'];
  category: MotorWarning['category'];
  user_message: string;
  action_hint?: string;
  module?: string;
}

export const WARNING_CATALOG: Record<string, CatalogEntry> = {
  W_ESTABILIDADE_MESES_ZERO: {
    severity: 'critical',
    category: 'config',
    user_message: 'Estabilidade marcada como ativa, mas duração não informada — verba NÃO foi gerada',
    action_hint: 'Volte ao módulo Estabilidade e preencha "Meses de estabilidade" ou selecione um tipo com default (CIPA=12, gestante=5)',
    module: 'estabilidade',
  },
  W_CITACAO_ESTIMADA: {
    severity: 'medium',
    category: 'data',
    user_message: 'Data de citação não informada — sistema estimou em +60 dias do ajuizamento',
    action_hint: 'Confira a data real de citação no processo e atualize em Dados do Processo',
    module: 'dados_processo',
  },
  W_CITACAO_E_AJUIZAMENTO_AUSENTES: {
    severity: 'high',
    category: 'data',
    user_message: 'Data de citação e ajuizamento ausentes — juros podem estar incorretos',
    action_hint: 'Preencha pelo menos uma das datas em Dados do Processo',
    module: 'dados_processo',
  },
  W_INSALUBRIDADE_SM_FALLBACK: {
    severity: 'high',
    category: 'engine',
    user_message: 'Insalubridade usando salário mínimo fixo — sem correção mensal automática',
    action_hint: 'Para períodos cruzando virada de ano (Dez/Jan), conferir manualmente o SM vigente',
    module: 'insalubridade',
  },
  W_SELIC_FALLBACK: {
    severity: 'medium',
    category: 'engine',
    user_message: 'Índices SELIC usando tabela embutida (precisão de 8 casas decimais derivadas)',
    action_hint: 'Para casos com período > 60 meses, considerar conferência manual contra SELIC oficial do BCB',
    module: 'correcao',
  },
};

export function enrichWarning(raw: { code: string; message: string }): MotorWarning {
  const entry = WARNING_CATALOG[raw.code];
  if (!entry) {
    return {
      code: raw.code,
      severity: 'medium',
      category: 'engine',
      message: raw.message,
      user_message: raw.message,
    };
  }
  return {
    code: raw.code,
    severity: entry.severity,
    category: entry.category,
    message: raw.message,
    user_message: entry.user_message,
    action_hint: entry.action_hint,
    module: entry.module,
  };
}

export const SEVERITY_RANK: Record<WarningSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  info: 3,
};
