import { describe, expect, it } from "vitest";
import { REVIEW_ENTRY_THRESHOLD, shouldRequestReview } from "../appReviewPolicy";

describe("shouldRequestReview", () => {
  it("does not ask before the entry threshold with no catch-up met", () => {
    expect(shouldRequestReview({ entryCount: REVIEW_ENTRY_THRESHOLD - 1, catchUpMet: false, alreadyRequested: false })).toBe(false);
  });

  it("asks once the entry threshold is reached", () => {
    expect(shouldRequestReview({ entryCount: REVIEW_ENTRY_THRESHOLD, catchUpMet: false, alreadyRequested: false })).toBe(true);
  });

  it("asks when the first catch-up is met, even with few entries", () => {
    expect(shouldRequestReview({ entryCount: 1, catchUpMet: true, alreadyRequested: false })).toBe(true);
  });

  it("never asks again once already requested", () => {
    expect(shouldRequestReview({ entryCount: 50, catchUpMet: true, alreadyRequested: true })).toBe(false);
  });
});
