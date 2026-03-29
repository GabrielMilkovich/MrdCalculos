/**
 * Grupo Econômico — Art. 2º §2º CLT
 * Quando há solidariedade entre empresas do mesmo grupo econômico,
 * o débito pode ser distribuído entre os reclamados solidários.
 */

export interface ReclamadoGrupo {
  id: string;
  nome: string;
  cnpj: string;
  responsabilidade: 'principal' | 'subsidiaria' | 'solidaria';
  percentual_participacao?: number; // Optional: for proportional distribution
}

export interface DistribuicaoGrupo {
  reclamado: ReclamadoGrupo;
  valor_total: number;
  valor_principal: number;
  valor_inss_empregador: number;
  valor_honorarios: number;
}

/**
 * Distribui o débito total entre os reclamados do grupo econômico.
 *
 * Se todos são solidários (padrão), cada um responde pelo valor total.
 * Se há percentuais definidos, distribui proporcionalmente.
 */
export function distribuirGrupoEconomico(
  totalReclamada: number,
  inssEmpregador: number,
  honorarios: number,
  reclamados: ReclamadoGrupo[],
): DistribuicaoGrupo[] {
  if (reclamados.length === 0) return [];

  const comPercentual = reclamados.filter(r => r.percentual_participacao !== undefined);

  if (comPercentual.length === reclamados.length) {
    // Proportional distribution
    return reclamados.map(r => {
      const pct = (r.percentual_participacao || 0) / 100;
      return {
        reclamado: r,
        valor_total: Number((totalReclamada * pct).toFixed(2)),
        valor_principal: Number(((totalReclamada - inssEmpregador - honorarios) * pct).toFixed(2)),
        valor_inss_empregador: Number((inssEmpregador * pct).toFixed(2)),
        valor_honorarios: Number((honorarios * pct).toFixed(2)),
      };
    });
  }

  // Solidary: each responds for the full amount
  return reclamados.map(r => ({
    reclamado: r,
    valor_total: totalReclamada,
    valor_principal: totalReclamada - inssEmpregador - honorarios,
    valor_inss_empregador: inssEmpregador,
    valor_honorarios: honorarios,
  }));
}
