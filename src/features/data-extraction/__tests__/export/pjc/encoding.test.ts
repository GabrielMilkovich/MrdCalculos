import { describe, expect, it } from "vitest";
import {
  utf16ToLatin1,
  competenciaToEpochMs,
  isoToEpochMs,
} from "../../../export/pjc/encoding";

describe("utf16ToLatin1", () => {
  it("ASCII passa direto", () => {
    const out = utf16ToLatin1("Hello");
    expect(Array.from(out)).toEqual([72, 101, 108, 108, 111]);
  });

  it("Acentos PT-BR (0x80..0xFF)", () => {
    const out = utf16ToLatin1("ÇÃO");
    expect(out[0]).toBe(0xc7); // Ç
    expect(out[1]).toBe(0xc3); // Ã
    expect(out[2]).toBe(0x4f); // O
  });

  it("Comissões → bytes Latin-1 corretos", () => {
    const out = utf16ToLatin1("Comissões");
    // C(0x43) o(0x6F) m(0x6D) i(0x69) s(0x73) s(0x73) õ(0xF5) e(0x65) s(0x73)
    expect(Array.from(out)).toEqual([0x43, 0x6f, 0x6d, 0x69, 0x73, 0x73, 0xf5, 0x65, 0x73]);
  });

  it("Emoji vira '?' (0x3F)", () => {
    // 🎉 (U+1F389) está fora do range Latin-1
    // Em UTF-16 ele é uma surrogate pair, mas charCodeAt retorna o high surrogate (0xD83C)
    // que é > 0xFF — vira '?'.
    const out = utf16ToLatin1("a🎉b");
    expect(out[0]).toBe(0x61);
    expect(out[1]).toBe(0x3f); // ?
    expect(out[2]).toBe(0x3f); // ?
    expect(out[3]).toBe(0x62);
  });

  it("Tamanho do output = length do input (1 byte por code unit)", () => {
    expect(utf16ToLatin1("").length).toBe(0);
    expect(utf16ToLatin1("abc").length).toBe(3);
    expect(utf16ToLatin1("ção").length).toBe(3);
  });
});

describe("competenciaToEpochMs", () => {
  it("08/2016 = 1470020400000 (timestamp do .pjc real)", () => {
    expect(competenciaToEpochMs("08/2016")).toBe(1470020400000);
  });

  it("01/2024", () => {
    // 2024-01-01 00:00 BRT = 2024-01-01T03:00:00Z
    const expected = Date.UTC(2024, 0, 1, 3, 0, 0);
    expect(competenciaToEpochMs("01/2024")).toBe(expected);
  });

  it("12/1999", () => {
    expect(competenciaToEpochMs("12/1999")).toBe(Date.UTC(1999, 11, 1, 3, 0, 0));
  });

  it("formato inválido retorna 0", () => {
    expect(competenciaToEpochMs("garbage")).toBe(0);
    expect(competenciaToEpochMs("13/2024")).toBe(0);
    expect(competenciaToEpochMs("00/2024")).toBe(0);
    expect(competenciaToEpochMs("")).toBe(0);
  });
});

describe("isoToEpochMs", () => {
  it("2024-03-15 → epoch 00:00 BRT", () => {
    const expected = Date.UTC(2024, 2, 15, 3, 0, 0);
    expect(isoToEpochMs("2024-03-15")).toBe(expected);
  });

  it("formato inválido retorna 0", () => {
    expect(isoToEpochMs("15/03/2024")).toBe(0);
    expect(isoToEpochMs("")).toBe(0);
  });
});
