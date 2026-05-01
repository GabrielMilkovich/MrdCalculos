import { describe, expect, it } from "vitest";
import { XMLBuilder, escape } from "../../../export/pjc/xml-builder";

describe("escape", () => {
  it("escapa os 5 caracteres reservados XML", () => {
    expect(escape("a & b")).toBe("a &amp; b");
    expect(escape("<x>")).toBe("&lt;x&gt;");
    expect(escape('a "b"')).toBe("a &quot;b&quot;");
    expect(escape("a 'b'")).toBe("a &apos;b&apos;");
  });

  it("texto sem reservados passa direto", () => {
    expect(escape("Comissões R$ 1.000,00")).toBe("Comissões R$ 1.000,00");
  });
});

describe("XMLBuilder", () => {
  it("XML mínimo com declaration e 1 elemento", () => {
    const x = new XMLBuilder();
    x.declaration("1.0", "ISO-8859-1");
    x.element("Calculo");
    expect(x.toString()).toBe(
      '<?xml version="1.0" encoding="ISO-8859-1"?><Calculo/>',
    );
  });

  it("Elemento com texto", () => {
    const x = new XMLBuilder();
    const root = x.element("Calculo");
    root.elementText("id", "4934");
    root.elementText("nome", "JOÃO");
    expect(x.toString()).toBe("<Calculo><id>4934</id><nome>JOÃO</nome></Calculo>");
  });

  it("Elementos aninhados (Set/HistoricoSalarial)", () => {
    const x = new XMLBuilder();
    const root = x.element("Calculo");
    const hsList = root.element("historicosSalariais").element("Set");
    const hs = hsList.element("HistoricoSalarial");
    hs.elementText("id", "6132");
    hs.elementText("nome", "Comissões");
    expect(x.toString()).toBe(
      "<Calculo><historicosSalariais><Set><HistoricoSalarial>" +
        "<id>6132</id><nome>Comissões</nome>" +
        "</HistoricoSalarial></Set></historicosSalariais></Calculo>",
    );
  });

  it("null vira literal 'null' (formato do .pjc)", () => {
    const x = new XMLBuilder();
    const root = x.element("Ferias");
    root.elementText("dataInicialDoPeriodoDeGozo2", null);
    expect(x.toString()).toBe(
      "<Ferias><dataInicialDoPeriodoDeGozo2>null</dataInicialDoPeriodoDeGozo2></Ferias>",
    );
  });

  it("Boolean vira string true/false", () => {
    const x = new XMLBuilder();
    const root = x.element("HistoricoSalarial");
    root.elementText("incidenciaFGTS", true);
    root.elementText("aplicarProporcionalidadeFGTS", false);
    expect(x.toString()).toBe(
      "<HistoricoSalarial>" +
        "<incidenciaFGTS>true</incidenciaFGTS>" +
        "<aplicarProporcionalidadeFGTS>false</aplicarProporcionalidadeFGTS>" +
        "</HistoricoSalarial>",
    );
  });

  it("Number escapado corretamente (epoch ms)", () => {
    const x = new XMLBuilder();
    const root = x.element("OcorrenciaDoHistoricoSalarial");
    root.elementText("dataOcorrencia", 1470020400000);
    root.elementText("valor", 1158.82);
    expect(x.toString()).toContain("<dataOcorrencia>1470020400000</dataOcorrencia>");
    expect(x.toString()).toContain("<valor>1158.82</valor>");
  });

  it("Caracteres especiais escapados", () => {
    const x = new XMLBuilder();
    x.element("Calculo").elementText(
      "obs",
      'Empresa "X" & filial <Y> está aberta',
    );
    expect(x.toString()).toBe(
      "<Calculo><obs>Empresa &quot;X&quot; &amp; filial &lt;Y&gt; está aberta</obs></Calculo>",
    );
  });
});
