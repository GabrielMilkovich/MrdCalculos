import type { CtpsFuncaoAtual } from '../../../tipos-dominio.ts';
import { mergeCamposKVConhecidos, parseNumeroBR } from '../helpers.ts';

const CHAVES_FUNCAO_ATUAL = [
  'Função',
  'Cargo',
  'Ingresso',
  'CBO',
  'Tipo Sal',
  'Sal.Tarefa',
  'Situação',
];

export function parseFuncaoAtual(linhas: string[]): CtpsFuncaoAtual | null {
  if (linhas.length === 0) return null;
  const c = mergeCamposKVConhecidos(linhas, CHAVES_FUNCAO_ATUAL);
  if (!c.has('funcao') && !c.has('cargo')) return null;

  return {
    funcao: c.get('funcao') ?? '',
    cargo: c.get('cargo') ?? '',
    ingresso: c.get('ingresso') ?? '',
    cbo: c.get('cbo') || null,
    tipo_salario: c.get('tipo_sal') || c.get('tipo_salario') || null,
    salario_tarefa: parseNumeroBR(c.get('sal_tarefa')),
    situacao: (c.get('situacao') as 'Ativo' | 'Inativo' | undefined) ?? null,
  };
}
