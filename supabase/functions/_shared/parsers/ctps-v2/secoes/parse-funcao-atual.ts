import type { CtpsFuncaoAtual } from '../../../tipos-dominio.ts';
import { mergeCamposKV, parseNumeroBR } from '../helpers.ts';

export function parseFuncaoAtual(linhas: string[]): CtpsFuncaoAtual | null {
  if (linhas.length === 0) return null;
  const c = mergeCamposKV(linhas);
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
