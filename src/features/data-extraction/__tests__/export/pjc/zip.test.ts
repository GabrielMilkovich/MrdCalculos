import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  buildPjcZip,
  composePjcFilename,
  PJC_INNER_XML_NAME,
} from "../../../export/pjc/zip";

describe("composePjcFilename", () => {
  it("Slugifica nome e processo", () => {
    expect(composePjcFilename("João da Silva", "0001234-12.2024.5.02.0001")).toBe(
      "joao-da-silva_0001234-12-2024-5-02-0001.pjc",
    );
  });

  it("Vazios geram fallback", () => {
    expect(composePjcFilename("", "")).toBe("calculo_sn.pjc");
  });

  it("Caracteres especiais são limpos", () => {
    expect(composePjcFilename("Maria  Áurea / Santos", "abc")).toBe(
      "maria-aurea-santos_abc.pjc",
    );
  });
});

describe("buildPjcZip", () => {
  it("Produz Uint8Array com magic number ZIP (PK\\x03\\x04)", async () => {
    const xml = '<?xml version="1.0" encoding="ISO-8859-1"?><Calculo/>';
    const out = await buildPjcZip(xml);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(20);
    expect(out[0]).toBe(0x50); // 'P'
    expect(out[1]).toBe(0x4b); // 'K'
    expect(out[2]).toBe(0x03);
    expect(out[3]).toBe(0x04);
  });

  it("ZIP contém calculo.xml com bytes Latin-1", async () => {
    const xml = '<?xml version="1.0" encoding="ISO-8859-1"?><Calculo><nome>JOÃO</nome></Calculo>';
    const out = await buildPjcZip(xml);
    const reZip = await JSZip.loadAsync(out);
    const file = reZip.file(PJC_INNER_XML_NAME);
    expect(file).not.toBeNull();
    const bytes = await file!.async("uint8array");
    // 'Ã' (0xC3) e 'O' (0x4F) — em UTF-8 'Ã' viraria 2 bytes (0xC3 0x83). Confirma Latin-1.
    // Encontra a posição do 'J' (0x4A) e checa que segue 'O'(0x4F) 'Ã'(0xC3) 'O'(0x4F).
    const jIndex = Array.from(bytes).indexOf(0x4a); // 'J'
    expect(jIndex).toBeGreaterThan(-1);
    expect(bytes[jIndex + 1]).toBe(0x4f); // 'O'
    expect(bytes[jIndex + 2]).toBe(0xc3); // 'Ã' Latin-1
    expect(bytes[jIndex + 3]).toBe(0x4f); // 'O'
  });

  it("XML simples roundtrip via JSZip", async () => {
    const xml = '<?xml version="1.0" encoding="ISO-8859-1"?><Calculo><id>4934</id></Calculo>';
    const out = await buildPjcZip(xml);
    const reZip = await JSZip.loadAsync(out);
    const file = reZip.file(PJC_INNER_XML_NAME);
    expect(file).not.toBeNull();
    const recoveredBytes = await file!.async("uint8array");
    // ASCII puro: cada byte = char
    const recovered = String.fromCharCode(...Array.from(recoveredBytes));
    expect(recovered).toBe(xml);
  });
});
