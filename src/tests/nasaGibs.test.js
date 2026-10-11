import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getComparableNasaNdviDates,
  getLatestNasaNdviDate,
} from "../services/nasaGibs.js";

// Full range covering all years used in the app (2005–2026)
const RANGES = [
  ["2000-02-18", "2026-12-31", "P16D"],
];

test("getLatestNasaNdviDate returns a date within the requested year", () => {
  const date2005 = getLatestNasaNdviDate(RANGES, 2005);
  const date2026 = getLatestNasaNdviDate(RANGES, 2026);

  assert.ok(date2005, "should return a date for 2005");
  assert.ok(date2026, "should return a date for 2026");

  assert.match(date2005, /^2005-/, `expected 2005 date, got ${date2005}`);
  assert.match(date2026, /^2026-/, `expected 2026 date, got ${date2026}`);
});

test("Before 2005 and After 2026 resolve to different dates — regression for year-sharing bug", () => {
  const beforeDate = getLatestNasaNdviDate(RANGES, 2005);
  const afterDate  = getLatestNasaNdviDate(RANGES, 2026);

  // Core regression: the After map must NOT reuse the Before map's date
  assert.notEqual(
    beforeDate,
    afterDate,
    `Before (${beforeDate}) and After (${afterDate}) must be different dates`,
  );
  assert.match(beforeDate, /^2005-/, `Before date must be in 2005, got ${beforeDate}`);
  assert.match(afterDate,  /^2026-/, `After date must be in 2026, got ${afterDate}`);
});

test("2005 date is NOT remapped to 2026 — getMapImageryYear must not exist", async () => {
  // Importing the module must not export getMapImageryYear
  const mod = await import("../services/nasaGibs.js");
  assert.equal(
    Reflect.get(mod, "getMapImageryYear"),
    undefined,
    "getMapImageryYear must not be exported — it caused 2005 to silently show 2026 imagery",
  );
});

test("each year resolves independently — 2005, 2006, 2026 all differ", () => {
  const d2005 = getLatestNasaNdviDate(RANGES, 2005);
  const d2006 = getLatestNasaNdviDate(RANGES, 2006);
  const d2026 = getLatestNasaNdviDate(RANGES, 2026);

  assert.match(d2005, /^2005-/);
  assert.match(d2006, /^2006-/);
  assert.match(d2026, /^2026-/);
  assert.notEqual(d2005, d2006);
  assert.notEqual(d2005, d2026);
  assert.notEqual(d2006, d2026);
});

test("comparison dates use the latest calendar date available in both years", () => {
  const ranges = [
    ["2006-01-01", "2006-12-19", "P16D"],
    ["2026-01-01", "2026-09-14", "P16D"],
  ];

  assert.deepEqual(getComparableNasaNdviDates(ranges, 2006, 2026), [
    "2006-09-14",
    "2026-09-14",
  ]);
});

test("comparison dates are unavailable when the years have no shared composite date", () => {
  const ranges = [
    ["2006-01-01", "2006-01-01", "P16D"],
    ["2026-02-01", "2026-02-01", "P16D"],
  ];

  assert.equal(getComparableNasaNdviDates(ranges, 2006, 2026), null);
});

test("getLatestNasaNdviDate returns null for a year before MODIS data", () => {
  const date = getLatestNasaNdviDate(RANGES, 1999);
  assert.equal(date, null, "should return null for year before data starts");
});

test("getLatestNasaNdviDate returns null for a year with no coverage", () => {
  const earlyRanges = [["2010-01-01", "2010-12-31", "P16D"]];
  const date = getLatestNasaNdviDate(earlyRanges, 2005);
  assert.equal(date, null, "should return null when year is outside range");
});

test("changing startYear does not affect endYear date", () => {
  const endDate = getLatestNasaNdviDate(RANGES, 2026);
  const endDateAfterChange = getLatestNasaNdviDate(RANGES, 2026);
  assert.equal(endDate, endDateAfterChange, "endYear date must not change when startYear changes");
});

test("GIBS tile URL does NOT contain /1.0.0/ and contains correct date", () => {
  const GIBS_ROOT = "https://gibs.earthdata.nasa.gov/wmts/epsg3857";
  const LAYER = "MODIS_Terra_L3_NDVI_16Day";
  const date = "2005-12-19";

  const url = `${GIBS_ROOT}/best/${LAYER}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;

  assert.ok(!url.includes("/1.0.0/"), `Tile URL must NOT include /1.0.0/ — causes HTTP 400`);
  assert.ok(url.includes(date), `URL must include the date ${date}`);
  assert.ok(!url.includes("2026"), `Before URL must not contain 2026, got: ${url}`);
});

test("Before 2005 and After 2026 tile URLs are distinct and have no /1.0.0/", () => {
  const GIBS_ROOT = "https://gibs.earthdata.nasa.gov/wmts/epsg3857";
  const LAYER = "MODIS_Terra_L3_NDVI_16Day";

  const beforeDate = getLatestNasaNdviDate(RANGES, 2005);
  const afterDate  = getLatestNasaNdviDate(RANGES, 2026);

  const beforeUrl = `${GIBS_ROOT}/best/${LAYER}/default/${beforeDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;
  const afterUrl  = `${GIBS_ROOT}/best/${LAYER}/default/${afterDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;

  assert.notEqual(beforeUrl, afterUrl, "Before and After tile URLs must be different");
  assert.ok(beforeUrl.includes("2005"), `Before URL must contain 2005, got: ${beforeUrl}`);
  assert.ok(afterUrl.includes("2026"),  `After URL must contain 2026, got: ${afterUrl}`);
  assert.ok(!beforeUrl.includes("/1.0.0/"), "Tile URL must NOT include /1.0.0/");
  assert.ok(!afterUrl.includes("/1.0.0/"),  "Tile URL must NOT include /1.0.0/");
});
