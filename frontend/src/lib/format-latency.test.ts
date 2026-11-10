import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getPositiveResponseHours,
  formatNarrativeLatency,
  formatBadgeLatency,
  formatMetaLatency,
} from "./format-latency.ts";

describe("getPositiveResponseHours", () => {
  it("returns undefined for null, undefined, or empty repo", () => {
    assert.equal(getPositiveResponseHours(null), undefined);
    assert.equal(getPositiveResponseHours(undefined), undefined);
    assert.equal(getPositiveResponseHours({}), undefined);
  });

  it("returns undefined when both latency fields are 0", () => {
    assert.equal(
      getPositiveResponseHours({
        response_p50_hours: 0,
        time_to_first_response_hours: 0,
      }),
      undefined
    );
  });

  it("prioritizes response_p50_hours over time_to_first_response_hours", () => {
    assert.equal(
      getPositiveResponseHours({
        response_p50_hours: 1.5,
        time_to_first_response_hours: 3.0,
      }),
      1.5
    );
  });

  it("falls back to time_to_first_response_hours when response_p50_hours is 0", () => {
    assert.equal(
      getPositiveResponseHours({
        response_p50_hours: 0,
        time_to_first_response_hours: 2.4,
      }),
      2.4
    );
  });
});

describe("formatNarrativeLatency", () => {
  it("returns null for 0, negative, or undefined", () => {
    assert.equal(formatNarrativeLatency(undefined), null);
    assert.equal(formatNarrativeLatency(0), null);
    assert.equal(formatNarrativeLatency(-1), null);
  });

  it("clamps sub-6-minute (<0.1h) latencies to <10 minutes", () => {
    assert.equal(formatNarrativeLatency(0.05), "<10 minutes");
    assert.equal(formatNarrativeLatency(0.089), "<10 minutes");
  });

  it("formats sub-hour latencies in minutes", () => {
    assert.equal(formatNarrativeLatency(0.25), "15 minutes");
    assert.equal(formatNarrativeLatency(0.5), "30 minutes");
  });

  it("formats multi-hour latencies in hours", () => {
    assert.equal(formatNarrativeLatency(2.34), "2.3 hours");
  });
});

describe("formatBadgeLatency", () => {
  it("returns null for unrecorded latencies", () => {
    assert.equal(formatBadgeLatency(undefined), null);
    assert.equal(formatBadgeLatency(0), null);
  });

  it("formats sub-0.1h latencies as <10m Review", () => {
    assert.equal(formatBadgeLatency(0.05), "<10m Review");
  });

  it("formats sub-hour latencies as Xm Review", () => {
    assert.equal(formatBadgeLatency(0.5), "30m Review");
  });

  it("formats hours as X.Xh Review", () => {
    assert.equal(formatBadgeLatency(2.3), "2.3h Review");
  });
});

describe("formatMetaLatency", () => {
  it("returns null for unrecorded", () => {
    assert.equal(formatMetaLatency(undefined), null);
    assert.equal(formatMetaLatency(0), null);
  });

  it("formats <0.1h as <10m", () => {
    assert.equal(formatMetaLatency(0.05), "<10m");
  });

  it("formats <0.5h as ~Xm", () => {
    assert.equal(formatMetaLatency(0.2), "~12m");
  });

  it("formats >=0.5h as ~Xh", () => {
    assert.equal(formatMetaLatency(2.4), "~2h");
  });
});
