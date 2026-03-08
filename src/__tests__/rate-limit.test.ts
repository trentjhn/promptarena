import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit } from "../../api/_rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("1.2.3.4")).toBe(true);
    }
  });

  it("rejects the 6th request from the same IP", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("10.0.0.1");
    expect(checkRateLimit("10.0.0.1")).toBe(false);
  });

  it("allows requests again after the window expires", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("5.5.5.5");
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit("5.5.5.5")).toBe(true);
  });

  it("does not share limits between different IPs", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("1.1.1.1");
    expect(checkRateLimit("2.2.2.2")).toBe(true);
  });
});
