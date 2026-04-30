/**
 * Testes do mini event-bus do estado da última mutação.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  setLastMutationError,
  getLastMutationError,
  subscribeLastMutationError,
} from "../last-mutation-status";

describe("last-mutation-status", () => {
  beforeEach(() => {
    setLastMutationError(false);
  });

  it("getLastMutationError reflete o último set", () => {
    setLastMutationError(true);
    expect(getLastMutationError()).toBe(true);
    setLastMutationError(false);
    expect(getLastMutationError()).toBe(false);
  });

  it("subscribers são notificados em cada mudança", () => {
    const calls: boolean[] = [];
    const unsub = subscribeLastMutationError((v) => calls.push(v));
    setLastMutationError(true);
    setLastMutationError(false);
    setLastMutationError(true);
    expect(calls).toEqual([true, false, true]);
    unsub();
    setLastMutationError(false);
    expect(calls).toEqual([true, false, true]);
  });
});
