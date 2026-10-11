import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { api } from "../services/planetPulseApi.js";
import {
  getNasaPowerDailyRange,
  parseNasaPowerSeries,
} from "../services/nasaPowerData.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function nasaResponse(parameters, temporal = "daily") {
  const units = {
    T2M: "C",
    T2M_MAX: "C",
    T2M_MIN: "C",
    PRECTOTCORR: "mm/day",
    RH2M: "%",
    WS10M: "m/s",
    ALLSKY_SFC_SW_DWN: "MJ/m^2/day",
    GWETTOP: "1",
  };
  return {
    properties: { parameter: parameters },
    parameters: Object.fromEntries(
      Object.keys(parameters).map((name) => [name, { units: units[name] }]),
    ),
    header: {
      api: { name: `POWER ${temporal} API`, version: "v2.10.0" },
      time_standard: "LST",
      messages: [],
    },
    messages: [],
  };
}

function mockFetch(daily, monthly, dailyStatus = 200, monthlyStatus = 200) {
  const requests = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    requests.push(url);
    const isDaily = url.pathname.includes("/daily/");
    const payload = isDaily ? daily : monthly;
    const status = isDaily ? dailyStatus : monthlyStatus;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(payload),
    };
  };
  return requests;
}

test("uses latest valid daily value per field and falls back to monthly history", async () => {
  const daily = nasaResponse({
    T2M: { "20261008": 22.25, "20261009": -999 },
    PRECTOTCORR: { "20261009": 1.27 },
    RH2M: { "20261007": 76.45 },
    WS10M: {},
    ALLSKY_SFC_SW_DWN: { "20261009": 14.6 },
    GWETTOP: { "20261009": 0.45 },
  });
  const monthly = nasaResponse({
    T2M: { "202608": 30.5, "202613": 99 },
    PRECTOTCORR: { "202608": 9.2 },
    RH2M: { "202608": 82.5 },
    WS10M: { "202608": 2.75 },
    ALLSKY_SFC_SW_DWN: { "202608": 16.2 },
    GWETTOP: { "202608": 0.72 },
  }, "monthly");
  const requests = mockFetch(daily, monthly);

  const { data } = await api.nasaPower({
    lat: 28.6139,
    lng: 77.209,
    startDate: "2026-10-01",
    endDate: "2026-10-09",
  });

  assert.equal(requests.length, 2);
  assert.equal(requests.find((url) => url.pathname.includes("/daily/")).searchParams.get("community"), "AG");
  assert.equal(requests.find((url) => url.pathname.includes("/daily/")).searchParams.get("parameters"),
    "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS10M,ALLSKY_SFC_SW_DWN,GWETTOP");
  assert.equal(data.current.temperature_c, 22.3);
  assert.equal(data.observation_dates.temperature_c, "2026-10-08");
  assert.equal(data.current.precipitation_mm, 1.27);
  assert.equal(data.observation_dates.humidity_pct, "2026-10-07");
  assert.equal(data.current.wind_ms, 2.75);
  assert.equal(data.observation_resolution.wind_ms, "monthly");
  assert.equal(data.data_status, "partial");
  assert.equal(data.units.solar_rad, "MJ/m²/day");
  assert.equal(data.monthly_series.some((point) => point.date === "2026-13"), false);
});

test("parses supported values and treats fill values as missing", () => {
  const parsed = parseNasaPowerSeries(
    nasaResponse({
      T2M: { "20260929": 25.24, "20260930": -999, "20260931": 24 },
      RH2M: { "20260929": 101 },
      PRECTOTCORR: { "20260929": "4.5" },
    }),
    "daily",
  );

  assert.deepEqual(parsed.series, [
    {
      date: "2026-09-29",
      year: 2026,
      month: 9,
      day: 29,
      temperature_c: 25.2,
      humidity_pct: null,
      precipitation_mm: 4.5,
    },
  ]);
});

test("defaults to a recent completed period ending yesterday", () => {
  assert.deepEqual(
    getNasaPowerDailyRange({ now: new Date("2026-10-10T12:00:00Z"), lookbackDays: 3 }),
    { startDate: "20261007", endDate: "20261009" },
  );
});

test("rejects invalid coordinates and unsupported or future dates before requesting", async () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    throw new Error("A request should not have been made.");
  };

  await assert.rejects(api.nasaPower({ lat: "", lng: 10 }), /Valid latitude and longitude/);
  assert.throws(
    () =>
      getNasaPowerDailyRange({
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        now: new Date("2026-10-10T12:00:00Z"),
      }),
    /endDate must be on or before 2026-10-09/,
  );
  assert.throws(
    () =>
      getNasaPowerDailyRange({
        startDate: "1980-12-31",
        endDate: "1981-01-01",
        now: new Date("2026-10-10T12:00:00Z"),
      }),
    /starts on 1981-01-01/,
  );
  assert.equal(requestCount, 0);
});

test("preserves monthly measurements when the daily API returns an error", async () => {
  const daily = { messages: ["The requested daily interval is unavailable."] };
  const monthly = nasaResponse({
    T2M: { "202608": 29.4 },
    PRECTOTCORR: { "202608": 8.1 },
    RH2M: { "202608": 78 },
  }, "monthly");
  mockFetch(daily, monthly, 400, 200);

  const { data } = await api.nasaPower({ lat: 10, lng: 20 });

  assert.equal(data.current.temperature_c, 29.4);
  assert.equal(data.observation_resolution.temperature_c, "monthly");
  assert.match(data.data_errors.daily, /requested daily interval is unavailable/);
  assert.equal(data.metric_status.temperature_c.status, "available");
  assert.equal(data.metric_status.wind_ms.status, "unavailable");
});

test("returns a useful error when both NASA POWER endpoints fail", async () => {
  mockFetch(
    { messages: ["daily parameters are unsupported"] },
    { messages: ["monthly parameters are unsupported"] },
    400,
    400,
  );

  await assert.rejects(
    api.nasaPower({ lat: 10, lng: 20 }),
    /NASA POWER returned no valid observations.*daily parameters are unsupported.*monthly parameters are unsupported/i,
  );
});
