/**
 * Extract remaining snapshot data for cases with truncated output
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';

const FILES = ['vanderlei-carvalho.pjc', 'carla-pego.pjc', 'francisco-pablo.pjc', 'pyter-gabriel.pjc', 'tiago-jose.pjc'];

describe('Extract remaining cases', () => {
  it.each(FILES)('data for %s', (file) => {
    const content = readFileSync(resolve(__dirname, `../../public/reports/${file}`), 'utf-8');
    const a = analyzePJC(content);
    const calc = a.verbas.filter(v => v.tipo === 'Calculada' && v.ativo);
    const refl = a.verbas.filter(v => v.tipo === 'Reflexo' && v.ativo);

    console.log(`\n═══ ${file} ═══`);
    console.log(`Reclamante: ${a.parametros.beneficiario}`);
    console.log(`Reclamado: ${a.parametros.reclamado}`);
    console.log(`CPF: ${a.parametros.cpf} | CNPJ: ${a.parametros.cnpj}`);
    console.log(`Admissão: ${a.parametros.admissao} | Demissão: ${a.parametros.demissao}`);
    console.log(`Ajuizamento: ${a.parametros.ajuizamento}`);
    console.log(`Início: ${a.parametros.inicio_calculo} | Término: ${a.parametros.termino_calculo}`);
    console.log(`Resultado: liq=${a.resultado.liquido_exequente} inssRcl=${a.resultado.inss_reclamante} inssRclado=${a.resultado.inss_reclamado} IR=${a.resultado.imposto_renda} custas=${a.resultado.custas}`);
    console.log(`Honorários: ${JSON.stringify(a.resultado.honorarios)}`);
    console.log(`Faltas: ${a.faltas.length} | Férias: ${a.ferias.length} | ApDiária: ${a.apuracao_diaria_count}`);
    
    console.log(`\nCALC (${calc.length}):`);
    for (const v of calc) {
      console.log(`  ${v.nome} | div=${v.formula.divisor.tipo}:${v.formula.divisor.valor} mult=${v.formula.multiplicador.valor} qtd=${v.formula.quantidade.tipo}:${v.formula.quantidade.valor} | devido=${v.total_devido} pago=${v.total_pago} dif=${v.total_diferenca}`);
    }
    console.log(`\nREFL (${refl.length}):`);
    for (const v of refl) {
      console.log(`  ${v.nome} | comp=${v.comportamento_reflexo} pm=${v.periodo_media} | devido=${v.total_devido} pago=${v.total_pago} dif=${v.total_diferenca}`);
    }
    console.log(`\nHIST (${a.historicos_salariais.length}): ${a.historicos_salariais.map(h => h.nome).join(', ')}`);
    console.log(`Atualiz: ${JSON.stringify(a.atualizacao)}`);

    expect(a).toBeDefined();
  });
});
