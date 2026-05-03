/**
 * Fixture bank loader — descobre fixtures de cada tipo de documento.
 *
 * Estrutura esperada:
 *   __tests__/_fixtures/<doc>/<caso-id>/
 *     ocr.txt         (obrigatório) — texto OCR puro do documento
 *     expected.csv    (opcional)   — CSV esperado byte-a-byte
 *     expected.json   (opcional)   — asserts estruturados (datas, contagens)
 *     notes.md        (recomendado) — contexto, bugs históricos
 *
 * Uso:
 *   const fixtures = loadFixtures("cartao-ponto");
 *   for (const f of fixtures) {
 *     it(f.id, () => { ... f.ocr ... f.expectedCsv });
 *   }
 *
 * COMO ADICIONAR NOVA FIXTURE:
 *   1. Cria pasta `_fixtures/<doc>/<id-curto>/`
 *   2. Cola o OCR em `ocr.txt`
 *   3. (Opcional) cola o CSV esperado em `expected.csv`
 *   4. (Opcional) escreve `notes.md` com contexto e bugs cobertos
 *   5. Roda `npx vitest run` — o teste byte-a-byte vai validar
 *      automaticamente; sem expected.csv, só roda invariantes.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type DocumentType = "cartao-ponto" | "ferias" | "faltas" | "holerite";

export interface Fixture {
  /** Identificador curto da fixture (nome da pasta). */
  id: string;
  /** Caminho absoluto da pasta da fixture. */
  path: string;
  /** Conteúdo do OCR. */
  ocr: string;
  /** CSV esperado (se presente). */
  expectedCsv: string | null;
  /** Asserts estruturados (se presentes). */
  expectedJson: Record<string, unknown> | null;
  /** Notas em markdown (se presentes). */
  notes: string | null;
}

const FIXTURES_ROOT = join(__dirname);

export function loadFixtures(doc: DocumentType): Fixture[] {
  const dir = join(FIXTURES_ROOT, doc);
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir);
  const fixtures: Fixture[] = [];
  for (const entry of entries) {
    const sub = join(dir, entry);
    if (!statSync(sub).isDirectory()) continue;
    const ocrPath = join(sub, "ocr.txt");
    if (!existsSync(ocrPath)) continue;
    const expectedCsvPath = join(sub, "expected.csv");
    const expectedJsonPath = join(sub, "expected.json");
    const notesPath = join(sub, "notes.md");
    fixtures.push({
      id: entry,
      path: sub,
      ocr: readFileSync(ocrPath, "utf-8"),
      expectedCsv: existsSync(expectedCsvPath)
        ? readFileSync(expectedCsvPath, "utf-8")
        : null,
      expectedJson: existsSync(expectedJsonPath)
        ? (JSON.parse(readFileSync(expectedJsonPath, "utf-8")) as Record<
            string,
            unknown
          >)
        : null,
      notes: existsSync(notesPath) ? readFileSync(notesPath, "utf-8") : null,
    });
  }
  return fixtures.sort((a, b) => a.id.localeCompare(b.id));
}
