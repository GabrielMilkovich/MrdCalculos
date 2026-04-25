/**
 * Seed das tabelas históricas INSS/IR/SM no Supabase.
 * Uso: npx tsx scripts/seed-tabelas-historicas.ts
 * Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. NÃO EXECUTAR sem revisão.
 */
import { createClient } from '@supabase/supabase-js';
import {
  INSS_FAIXAS_HISTORICO,
  IR_FAIXAS_HISTORICO,
  SALARIO_MINIMO_HISTORICO,
} from '../src/lib/pjecalc/tabelas-historicas';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios');
}
const supabase = createClient(url, key);

interface InssRow { competencia_inicio: string; competencia_fim: string | null; faixa: number; valor_ate: number; aliquota: number; }
interface IrRow { competencia_inicio: string; competencia_fim: string | null; faixa: number; valor_ate: number; aliquota: number; deducao: number; deducao_dependente: number; }
interface SmRow { competencia: string; valor: number; }

async function seedInss(): Promise<void> {
  const rows: InssRow[] = INSS_FAIXAS_HISTORICO.flatMap((reg) =>
    reg.faixas.map((f, i) => ({
      competencia_inicio: reg.competencia_inicio,
      competencia_fim: reg.competencia_fim,
      faixa: i + 1,
      valor_ate: f.ate,
      aliquota: f.aliquota,
    })),
  );
  const { error: delErr } = await supabase
    .from('pjecalc_inss_faixas')
    .delete()
    .gte('competencia_inicio', '1996-01-01')
    .lt('competencia_inicio', '2026-01-01');
  if (delErr) throw delErr;
  const { error } = await supabase.from('pjecalc_inss_faixas').insert(rows);
  if (error) throw error;
   
  console.log(`INSS: ${rows.length} faixas inseridas`);
}

async function seedIr(): Promise<void> {
  const rows: IrRow[] = IR_FAIXAS_HISTORICO.flatMap((reg) =>
    reg.faixas.map((f, i) => ({
      competencia_inicio: reg.competencia_inicio,
      competencia_fim: reg.competencia_fim,
      faixa: i + 1,
      valor_ate: Number.isFinite(f.ate) ? f.ate : 999999999,
      aliquota: f.aliquota,
      deducao: f.deducao,
      deducao_dependente: reg.deducao_dependente,
    })),
  );
  const { error: delErr } = await supabase
    .from('pjecalc_ir_faixas')
    .delete()
    .gte('competencia_inicio', '1996-01-01')
    .lt('competencia_inicio', '2026-01-01');
  if (delErr) throw delErr;
  const { error } = await supabase.from('pjecalc_ir_faixas').insert(rows);
  if (error) throw error;
   
  console.log(`IR: ${rows.length} faixas inseridas`);
}

async function seedSalarioMinimo(): Promise<void> {
  const rows: SmRow[] = SALARIO_MINIMO_HISTORICO
    .filter((r) => r.valor > 0)
    .map((r) => ({ competencia: r.vigencia, valor: r.valor }));
  const { error } = await supabase
    .from('pjecalc_salario_minimo')
    .upsert(rows, { onConflict: 'competencia' });
  if (error) throw error;
   
  console.log(`Salário Mínimo: ${rows.length} entradas upserted`);
}

async function main(): Promise<void> {
  await seedInss();
  await seedIr();
  await seedSalarioMinimo();
   
  console.log('Seed concluído.');
}

main().catch((err: unknown) => {
   
  console.error(err);
  process.exit(1);
});
