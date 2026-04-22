/**
 * Garante paridade entre 3 fontes de verdade do roteamento de /tabelas/:tipo:
 *   1. SidebarPremium.tsx — define os links do menu
 *   2. Tabelas.tsx → TABELA_CONFIG — título/descrição de cada sub-página
 *   3. Tabelas.tsx → VIEW_MAP — componente React renderizado
 *
 * Se qualquer uma das 3 sair de sincronia, usuário vê dashboard em vez da
 * tela correta (bug fd6c7f7). Este teste previne regressão.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// __dirname === src/pages/__tests__ em tempo de teste
const ROOT = path.resolve(__dirname, "../../..");

function extractKeys(source: string, blockAnchor: string): Set<string> {
  const idx = source.indexOf(blockAnchor);
  if (idx === -1) throw new Error(`Bloco "${blockAnchor}" não encontrado`);
  // avança até o primeiro `= {` (início do objeto literal, pulando genéricos da type annotation)
  const assignMatch = source.slice(idx).match(/=\s*\{/);
  if (!assignMatch) throw new Error(`Sem "= {" após ${blockAnchor}`);
  const openIdx = idx + assignMatch.index! + assignMatch[0].lastIndexOf("{");
  let depth = 1;
  let end = openIdx + 1;
  for (let i = openIdx + 1; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const block = source.slice(openIdx + 1, end);
  const keys = new Set<string>();
  const re = /"([a-z-]+)":/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) keys.add(m[1]);
  return keys;
}

describe("Tabelas routing parity", () => {
  const tabelasTs = fs.readFileSync(path.join(ROOT, "src/pages/Tabelas.tsx"), "utf-8");
  const sidebarTs = fs.readFileSync(path.join(ROOT, "src/components/layout/SidebarPremium.tsx"), "utf-8");

  const configKeys = extractKeys(tabelasTs, "const TABELA_CONFIG");
  const viewMapKeys = extractKeys(tabelasTs, "const VIEW_MAP");

  // sidebar: capturar paths "/tabelas/<slug>"
  const sidebarKeys = new Set<string>();
  const sidebarRe = /path:\s*"\/tabelas\/([a-z-]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = sidebarRe.exec(sidebarTs))) sidebarKeys.add(m[1]);

  it("TABELA_CONFIG tem todas as chaves de VIEW_MAP", () => {
    const missing = [...viewMapKeys].filter((k) => !configKeys.has(k));
    expect(missing, `VIEW_MAP tem chaves sem TABELA_CONFIG: ${missing.join(", ")}`).toEqual([]);
  });

  it("VIEW_MAP tem todas as chaves de TABELA_CONFIG", () => {
    const missing = [...configKeys].filter((k) => !viewMapKeys.has(k));
    expect(missing, `TABELA_CONFIG tem chaves sem VIEW_MAP: ${missing.join(", ")}`).toEqual([]);
  });

  it("SidebarPremium tem todas as chaves de TABELA_CONFIG (exceto atualizacao-indices que é interno)", () => {
    const missing = [...configKeys]
      .filter((k) => k !== "atualizacao-indices")
      .filter((k) => !sidebarKeys.has(k));
    expect(missing, `TABELA_CONFIG tem chaves sem link na sidebar: ${missing.join(", ")}`).toEqual([]);
  });

  it("todos os links da sidebar apontam para tipos válidos de TABELA_CONFIG", () => {
    const invalid = [...sidebarKeys].filter((k) => !configKeys.has(k));
    expect(invalid, `Sidebar tem links órfãos (sem config): ${invalid.join(", ")}`).toEqual([]);
  });

  it("há pelo menos 12 tabelas registradas (sanity check)", () => {
    expect(configKeys.size).toBeGreaterThanOrEqual(12);
    expect(viewMapKeys.size).toBeGreaterThanOrEqual(12);
    expect(sidebarKeys.size).toBeGreaterThanOrEqual(12);
  });
});
