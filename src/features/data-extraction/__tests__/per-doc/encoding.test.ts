import { describe, expect, it } from "vitest";
import { utf16ToLatin1 } from "../../export/per-doc/encoding";

describe("utf16ToLatin1", () => {
  it("ASCII passa direto", () => {
    expect(Array.from(utf16ToLatin1("Hello"))).toEqual([72, 101, 108, 108, 111]);
  });

  it("Acentos PT-BR (0x80..0xFF)", () => {
    const out = utf16ToLatin1("ÇÃO");
    expect(out[0]).toBe(0xc7);
    expect(out[1]).toBe(0xc3);
    expect(out[2]).toBe(0x4f);
  });

  it("Emoji vira '?' (0x3F)", () => {
    const out = utf16ToLatin1("a🎉b");
    expect(out[0]).toBe(0x61);
    expect(out[1]).toBe(0x3f);
    expect(out[2]).toBe(0x3f);
    expect(out[3]).toBe(0x62);
  });

  it("Tamanho do output = length do input", () => {
    expect(utf16ToLatin1("").length).toBe(0);
    expect(utf16ToLatin1("ção").length).toBe(3);
  });
});
