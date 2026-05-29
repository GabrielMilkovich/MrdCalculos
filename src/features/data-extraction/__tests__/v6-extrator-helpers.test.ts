/**
 * Testes dos helpers puros do extrator geométrico v6.
 *
 * Os helpers (clusterizarLinhas, linhaParaTextoPlano, detectarTabelas) são
 * puros e podem ser testados em vitest sem rodar pdfjs. A função principal
 * `extrairGeometrico` só roda em Deno (edge function); valida-se em deploy.
 *
 * NOTA: import do edge function via path relativo. Vitest aceita TS de
 * `supabase/functions/` desde que não haja imports `https://...` no top
 * (e não há — pdfjs é importado dinâmico DENTRO da função `extrairGeometrico`
 * que não exercitamos aqui).
 */
import { describe, expect, it } from "vitest";
import {
  clusterizarLinhas,
  linhaParaTextoPlano,
  detectarTabelas,
  calcularScoreQualidade,
} from "../../../../supabase/functions/_shared/extrator-geometrico";
import type { TextoPosicionado } from "../../../../supabase/functions/_shared/documento-tabular";

function txt(
  texto: string,
  x: number,
  y: number,
  fontSize = 10,
): TextoPosicionado {
  return {
    texto,
    x,
    y,
    width: texto.length * (fontSize * 0.5),
    height: fontSize,
    fontSize,
  };
}

describe("v6 extrator — clusterizarLinhas", () => {
  it("agrupa items com Y próximo na mesma linha", () => {
    const items = [
      txt("Hello", 10, 100),
      txt("World", 60, 101), // Y diff 1pt — mesma linha
      txt("Próxima", 10, 120), // Y diff 20pt — outra linha
    ];
    const linhas = clusterizarLinhas(items);
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveLength(2);
    expect(linhas[1]).toHaveLength(1);
  });

  it("ordena items dentro da linha por X", () => {
    const items = [
      txt("World", 60, 100),
      txt("Hello", 10, 100),
    ];
    const linhas = clusterizarLinhas(items);
    expect(linhas[0].map((t) => t.texto)).toEqual(["Hello", "World"]);
  });

  it("array vazio devolve array vazio", () => {
    expect(clusterizarLinhas([])).toEqual([]);
  });

  it("tolerância proporcional ao fontSize", () => {
    // Fonte grande (20pt) → tolerância maior; items 5pt aparte ainda casam.
    const items = [
      txt("A", 10, 100, 20),
      txt("B", 60, 105, 20), // gap Y 5pt < 20*0.5
    ];
    expect(clusterizarLinhas(items)).toHaveLength(1);
  });
});

describe("v6 extrator — linhaParaTextoPlano", () => {
  it("items próximos sem gap viram texto colado", () => {
    const linha = [txt("Hello", 10, 100), txt("World", 33, 100)];
    // gap ≈ 0 (próximos)
    const t = linhaParaTextoPlano(linha);
    expect(t).toContain("Hello");
    expect(t).toContain("World");
  });

  it("items distantes ganham espaço", () => {
    const linha = [txt("A", 10, 100), txt("B", 200, 100)];
    expect(linhaParaTextoPlano(linha)).toBe("A B");
  });

  it("normaliza múltiplos espaços", () => {
    const linha = [
      txt("A", 10, 100),
      txt("B", 100, 100),
      txt("C", 200, 100),
    ];
    expect(linhaParaTextoPlano(linha)).toBe("A B C");
  });
});

describe("v6 extrator — detectarTabelas", () => {
  it("retorna [] quando há menos de 3 linhas", () => {
    const linhas = [
      [txt("Header1", 10, 100), txt("Header2", 100, 100)],
      [txt("A", 10, 120), txt("B", 100, 120)],
    ];
    expect(detectarTabelas(linhas)).toHaveLength(0);
  });

  it("detecta tabela 3+ linhas com colunas alinhadas", () => {
    const linhas = [
      [txt("Header1", 10, 100), txt("Header2", 100, 100)],
      [txt("A1", 10, 120), txt("B1", 100, 120)],
      [txt("A2", 10, 140), txt("B2", 100, 140)],
      [txt("A3", 10, 160), txt("B3", 100, 160)],
    ];
    const tabelas = detectarTabelas(linhas);
    expect(tabelas).toHaveLength(1);
    expect(tabelas[0].linhas).toHaveLength(3); // 3 dados (header não conta)
  });

  it("ignora linhas com colunas desalinhadas", () => {
    const linhas = [
      [txt("H1", 10, 100), txt("H2", 100, 100)],
      [txt("A", 10, 120), txt("B", 100, 120)],
      [txt("X", 50, 140)], // sozinho, não casa
      [txt("Y", 50, 160)],
    ];
    const tabelas = detectarTabelas(linhas);
    // Não conseguiu 3+ linhas alinhadas, retorna []
    expect(tabelas.length === 0 || tabelas[0].linhas.length < 3).toBe(true);
  });
});

describe("v6 extrator — calcularScoreQualidade (fix Fichas Via Varejo)", () => {
  // Regressão do incidente 2026-05-29: Fichas Financeiras ADP (Via Varejo)
  // são text-native PERFEITAS mas usam blocos enormes de espaço para alinhar
  // colunas de largura fixa. A fórmula antiga media alnum/total (espaço
  // contava como "lixo") → score ~0.66 < 0.70 → docs reprovados e marcados
  // ocr_failed. A fórmula correta mede alnum/não-branco.

  // Reconstrução fiel de algumas linhas reais (pdf-parse) da ficha da Joseli:
  // cabeçalho ADP + tabela com colunas alinhadas por espaço.
  const fichaADP = [
    " Ano Competência : 2016                                                            ",
    " Estabelecimento :        1651     VIA VAREJO S/A - SHOP INDAIATUBA - SP ",
    "Código Denominação          Clas.        Janeiro      Fevereiro          Março          Abril           Maio          Junho          Julho",
    "------ -------------------- ----- -------------- -------------- -------------- -------------- -------------- -------------- --------------",
    "  0501 DSR(Comissão)        PGTO          382,06         463,50         321,56         499,28         441,26         533,00         101,47",
    "  0620 Comissões            PGTO        1.348,73       1.577,16       1.517,87       1.484,59       1.203,85       1.344,23         639,44",
    "  3391 COM. GARANTIA        PGTO          260,59         272,69         385,40         815,01         460,14         734,80         163,71",
  ].join("\n");

  it("texto ADP denso em espaço pontua ACIMA do limiar (0.70)", () => {
    const { score } = calcularScoreQualidade(fichaADP, 5);
    // Antes do fix dava ~0.66. Agora deve passar folgado.
    expect(score).toBeGreaterThanOrEqual(0.7);
  });

  it("razão reporta densidade sobre os não-brancos", () => {
    const { razao } = calcularScoreQualidade(fichaADP, 5);
    expect(razao).toMatch(/não-brancos/);
  });

  it("texto limpo sem espaço extra continua com score alto", () => {
    const limpo = "Salario base 1.234,56 Comissoes 789,01 DSR 45,67 ".repeat(40);
    const { score } = calcularScoreQualidade(limpo, 1);
    expect(score).toBeGreaterThanOrEqual(0.7);
  });

  it("lixo de OCR (símbolos de controle / placeholders) derruba o score", () => {
    // Maioria não-alfanumérica E não-branca → baixa densidade real.
    const lixo = ("��� [???] §¶©®™ ".repeat(50)).replace(/ /g, "");
    const { score } = calcularScoreQualidade(lixo, 1);
    expect(score).toBeLessThan(0.7);
  });

  it("score sempre dentro de [0.2, 0.95]", () => {
    expect(calcularScoreQualidade("", 1).score).toBeGreaterThanOrEqual(0.2);
    expect(calcularScoreQualidade("a".repeat(100000), 1).score).toBeLessThanOrEqual(0.95);
  });
});
