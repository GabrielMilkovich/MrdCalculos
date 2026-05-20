/**
 * Diagnóstico end-to-end V6 contra o PDF do Roque (Fase 6 v7).
 *
 * Roda em Deno. Usa o pipeline real do edge function:
 *   extrairGeometrico (pdfjs via unpdf) →
 *   escolherMapper (Via Varejo / Genérico) →
 *   mapper.mapear (apurações + reconciliacao)
 *
 * Saída: provider, mapper, contagem de apurações, reconciliação por
 * período, e dump das 10 datas-amostra do prompt v7 pra você comparar
 * visualmente contra o PDF.
 *
 * Como rodar:
 *   /tmp/deno-tool/node_modules/deno-bin/bin/deno run --allow-read \
 *     --allow-net --allow-env scripts/diag-cartao-ponto-roque.ts
 *
 * Limitação: container sandbox bloqueia deno.land/std (403), mas
 * esm.sh está OK. extrairGeometrico só usa esm.sh (unpdf).
 *
 * Datas amostra (do prompt v7, pra comparar com PDF):
 *   - 2016-01-11 (primeiro dia do range)
 *   - 2016-02-16 (caso v5 OCR pegou 19:15 como 15:15)
 *   - 2016-03-25 (sexta-feira santa — FERIADO)
 *   - 2018-03-24 (Problemas Relogio)
 *   - 2016-02-20 SAB + 2016-02-21 DOM (shift de linha v5)
 *   - 2020-03-16 (início suspensão MP 936)
 *   - 2020-04-30 (fim suspensão MP 936)
 *   - 2019-12-31 (virada de ano)
 *   - 2021-02-01 (último mês)
 *   - 2021-02-15 (último dia)
 */
import { extrairGeometrico } from "../supabase/functions/_shared/extrator-geometrico.ts";
import { escolherMapper } from "../supabase/functions/_shared/mappers/dispatcher.ts";

const PDF_PATH = "./public/reports/roque-guerreiro/Cartoes_de_ponto.pdf";

const DATAS_AMOSTRA = [
  "2016-01-11",
  "2016-02-16",
  "2016-02-20",
  "2016-02-21",
  "2016-03-25",
  "2018-03-24",
  "2019-12-31",
  "2020-03-16",
  "2020-04-30",
  "2021-02-01",
  "2021-02-15",
];

function sep(titulo: string) {
  console.log("\n" + "=".repeat(72));
  console.log(titulo);
  console.log("=".repeat(72));
}

async function main() {
  sep("STEP 1: Lê PDF do Roque");
  const bytes = await Deno.readFile(PDF_PATH);
  console.log(`PDF carregado: ${PDF_PATH} (${bytes.byteLength} bytes)`);

  sep("STEP 2: Extrai texto via pdfjs (V6 geométrico)");
  const t0 = Date.now();
  const doc = await extrairGeometrico(bytes);
  const dtMs = Date.now() - t0;
  if (!doc) {
    console.error(`❌ FALHA: extrairGeometrico retornou null em ${dtMs}ms`);
    Deno.exit(1);
  }
  console.log(`✓ Extração OK em ${dtMs}ms`);
  console.log(`  páginas: ${doc.numeroPaginas}`);
  console.log(`  qualidade: score=${doc.qualidade.score.toFixed(2)} razão="${doc.qualidade.razao}"`);
  console.log(`  texto total: ${doc.textoCompleto.length} chars`);
  console.log(`  preview (primeiros 300 chars):`);
  console.log(`    ${doc.textoCompleto.slice(0, 300).replace(/\n/g, "\\n")}`);

  sep("STEP 3: Escolhe mapper");
  const dispatch = escolherMapper(doc);
  if (!dispatch) {
    console.error(`❌ FALHA: nenhum mapper aplica`);
    Deno.exit(1);
  }
  console.log(`✓ Mapper escolhido: ${dispatch.mapper.slug}`);
  console.log(`  score: ${dispatch.score.toFixed(2)}`);
  console.log(`  motivos: ${dispatch.motivos.join(" | ")}`);

  sep("STEP 4: Roda mapper.mapear()");
  const t1 = Date.now();
  const resultado = dispatch.mapper.mapear(doc);
  const dtMap = Date.now() - t1;
  if (!resultado) {
    console.error(`❌ FALHA: mapper retornou null em ${dtMap}ms`);
    Deno.exit(1);
  }
  console.log(`✓ Mapper OK em ${dtMap}ms`);
  // deno-lint-ignore no-explicit-any
  const r = resultado as any;
  console.log(`  apurações: ${r.apuracoes?.length ?? 0}`);
  console.log(`  competências: ${r.competencias?.size ?? 0}`);
  console.log(`  data_inicial: ${r.data_inicial}`);
  console.log(`  data_final: ${r.data_final}`);
  console.log(`  warnings: ${r.warnings?.length ?? 0}`);
  if (r.warnings && r.warnings.length > 0) {
    console.log(`  (primeiros 3 warnings)`);
    for (const w of r.warnings.slice(0, 3)) console.log(`    - ${w}`);
  }

  sep("STEP 5: Reconciliação (Fase 3 v7)");
  if (!r.reconciliacao) {
    console.log(`⚠ reconciliacao undefined — mapper não populou`);
  } else {
    console.log(`✓ reconciliacao_geral_ok: ${r.reconciliacao_geral_ok}`);
    console.log(`  ${r.reconciliacao.length} período(s) reconciliado(s):`);
    for (const rec of r.reconciliacao) {
      const flag = rec.ok ? "✓" : "✗";
      const decl = rec.declarado_str ?? "null";
      console.log(
        `  ${flag} ${rec.periodo.inicio} ↔ ${rec.periodo.fim}: ` +
          `declarado=${decl} somado=${rec.somado_str} delta=${rec.delta_minutos}min`,
      );
      if (!rec.ok) console.log(`     motivo: ${rec.motivo.slice(0, 200)}`);
    }
  }

  sep("STEP 6: Datas amostra do prompt v7 (compare manualmente contra PDF)");
  console.log(`Total de apurações: ${r.apuracoes?.length ?? 0}`);
  console.log(`Dados pra comparação manual com PDF do Roque:\n`);
  console.log(`${"data".padEnd(12)} ${"dia".padEnd(4)} ${"ocorrência".padEnd(10)} batidas`);
  console.log("-".repeat(72));
  for (const data of DATAS_AMOSTRA) {
    // deno-lint-ignore no-explicit-any
    const ap = (r.apuracoes ?? []).find((a: any) => a.data === data);
    if (!ap) {
      console.log(`${data.padEnd(12)} ${"—".padEnd(4)} ${"AUSENTE".padEnd(10)} (não extraído)`);
      continue;
    }
    const batidas = (ap.marcacoes ?? [])
      // deno-lint-ignore no-explicit-any
      .map((m: any) => `${m.e}→${m.s}`)
      .join("  ");
    console.log(
      `${data.padEnd(12)} ${(ap.dia_semana ?? "?").padEnd(4)} ${ap.ocorrencia.padEnd(10)} ${batidas || "(sem batidas)"}`,
    );
  }

  sep("RESUMO FINAL");
  const sucesso =
    !!resultado &&
    dispatch.mapper.slug === "cartao_via_varejo_v1" &&
    (r.apuracoes?.length ?? 0) > 0;
  console.log(`Status: ${sucesso ? "✓ V6 OK" : "✗ ALGO ERRADO"}`);
  console.log(`Mapper: ${dispatch.mapper.slug}`);
  console.log(`Apurações: ${r.apuracoes?.length ?? 0}`);
  console.log(`Reconciliação geral OK: ${r.reconciliacao_geral_ok ?? "n/a"}`);
  console.log(`Tempo total: ${Date.now() - t0}ms`);
}

main().catch((err) => {
  console.error("\n❌ ERRO FATAL:", err);
  Deno.exit(2);
});
