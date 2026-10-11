import assert from "node:assert/strict";
import test from "node:test";
import {
  getHistorySnapshot,
  parseHistoryResponse,
  requestHistory,
} from "../utils/historyData.js";

const history2026 = {
  year: 2026,
  forest_cover_pct: 42,
  ndvi: 0.62,
  temp_anomaly_c: 1.8,
};

test("parses valid history records", () => {
  assert.deepEqual(parseHistoryResponse({ data: { history: [history2026] } }), [history2026]);
});

test("accepts an empty history list", () => {
  assert.deepEqual(parseHistoryResponse({ data: { history: [] } }), []);
});

test("rejects missing or malformed history data", () => {
  assert.throws(() => parseHistoryResponse({ data: {} }), /did not contain a history list/);
  assert.throws(
    () => parseHistoryResponse({ data: { history: [null] } }),
    /contains invalid records/,
  );
});

test("preserves API request failures for the page error state", async () => {
  await assert.rejects(
    requestHistory(() => Promise.reject(new Error("History service unavailable.")), {}),
    /History service unavailable/,
  );
});

test("returns a snapshot without deltas when the 2005 baseline is missing", () => {
  assert.deepEqual(getHistorySnapshot([history2026], 2026), {
    current: history2026,
    deltas: null,
  });
});

test("calculates deltas when the 2005 baseline is available", () => {
  const baseline = {
    year: 2005,
    forest_cover_pct: 50,
    ndvi: 0.7,
    temp_anomaly_c: 0.5,
  };

  assert.deepEqual(getHistorySnapshot([baseline, history2026], 2026), {
    current: history2026,
    deltas: {
      forest_cover_pct: -8,
      ndvi: -0.07999999999999996,
      temp_anomaly_c: 1.3,
    },
  });
});
