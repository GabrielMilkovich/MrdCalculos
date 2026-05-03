/**
 * Fuzzer determinístico (PRNG seed-based) para gerar inputs sintéticos.
 *
 * Usa um LCG (Linear Congruential Generator) para reprodutibilidade
 * total: mesma seed → mesma sequência. Cobre casos que ninguém pensou.
 *
 * Ideologia: testes não devem ser flakies. Se o fuzzer encontra um bug,
 * a seed que gerou aquele input fica registrada no teste para regressão
 * permanente.
 */

export class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    // Numerical Recipes LCG (rápido, suficiente para fuzzing)
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
  int(min: number, maxExclusive: number): number {
    return Math.floor(this.next() * (maxExclusive - min)) + min;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length)];
  }
  bool(p = 0.5): boolean {
    return this.next() < p;
  }
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function ddmmyyyy(rng: Rng, baseYear = 2024): string {
  const ano = baseYear + rng.int(0, 3);
  const mes = rng.int(1, 13);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dia = rng.int(1, ultimoDia + 1);
  return `${pad2(dia)}/${pad2(mes)}/${ano}`;
}

export function isoDate(ddmm: string): string {
  const [dd, mm, yyyy] = ddmm.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

export function hhmm(rng: Rng): string {
  return `${pad2(rng.int(0, 24))}:${pad2(rng.int(0, 60))}`;
}

export function hhmmAfter(rng: Rng, prev: string): string {
  // Gera hora cronologicamente posterior a `prev` (mesmo dia, horário válido).
  const [h, m] = prev.split(":").map(Number);
  const totalMin = h * 60 + m + rng.int(1, 240); // até 4h depois
  const newH = Math.min(23, Math.floor(totalMin / 60));
  const newM = totalMin % 60;
  return `${pad2(newH)}:${pad2(newM)}`;
}
