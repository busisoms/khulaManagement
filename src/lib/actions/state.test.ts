import { describe, expect, it, vi } from "vitest";
import { canTransition, InvalidTransitionError, needsOutcome, nextStatus } from "./state";

vi.mock("@/lib/db", () => ({ db: {} }));

describe("action state machine", () => {
  it.each([
    ["proposed", "approved"],
    ["approved", "done"],
    ["proposed", "dismissed"],
    ["approved", "cancelled"],
  ])("allows %s → %s", (from, to) => {
    expect(nextStatus(from, to)).toBe(to);
  });

  it.each([
    ["proposed", "done"], // must be approved first
    ["proposed", "cancelled"],
    ["approved", "dismissed"],
    ["approved", "proposed"],
    ["done", "approved"],
    ["done", "cancelled"],
    ["dismissed", "approved"],
    ["cancelled", "approved"],
    ["unknown", "approved"],
  ])("rejects %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => nextStatus(from, to)).toThrow(InvalidTransitionError);
  });
});

describe("outcome prompt", () => {
  const now = new Date(2026, 10, 13);
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
  it("asks after 7 days for done actions without a note", () => {
    expect(needsOutcome({ status: "done", completedAt: daysAgo(7), outcomeNote: null }, now)).toBe(true);
    expect(needsOutcome({ status: "done", completedAt: daysAgo(6), outcomeNote: null }, now)).toBe(false);
    expect(needsOutcome({ status: "done", completedAt: daysAgo(10), outcomeNote: "They paid" }, now)).toBe(false);
    expect(needsOutcome({ status: "approved", completedAt: null, outcomeNote: null }, now)).toBe(false);
  });
});
