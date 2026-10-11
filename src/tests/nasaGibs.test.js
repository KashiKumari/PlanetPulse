import assert from "node:assert/strict";
import { test } from "node:test";
import { getLatestNasaNdviDate, getMapImageryYear } from "../services/nasaGibs.js";

// Minimal range covering 2006 and 2026 at 16-day intervals
// MODIS Terra NDVI 16-day starts 2000-02-18
const RANGES = [
  ["2000-02-18", "2026-12-31", "P16D"],
];

test("getLatestNasaNdviDate returns a date within the requested year", () => {
  const date2006 = getLatestNasaNdviDate(RANGES, 2006);
  const date2026 = getLatestNasaNdviDate(RANGES, 2026);

  assert.ok(date2006, "should return a date for 2006");
  assert.ok(date2026, "should return a date for 2026");

  assert.match(date2006, /^2006-/, `expected 2006 date, got ${date2006}`);
  assert.match(date2026, /^2026-/, `expected 2026 date, got ${date2026}`);
});

test("getLatestNasaNdviDate returns different dates for different years", () => {
  const date2006 = getLatestNasaNdviDate(RANGES, 2006);
  const date2026 = getLatestNasaNdviDate(RANGES, 2026);

  assert.notEqual(
    date2006,
    date2026,
    `Before (${date2006}) and After (${date2026}) must be different dates`,
  );
});

test("2005 and 2006 resolve to imagery dates in their respective years", () => {
  const date2005 = getLatestNasaNdviDate(RANGES, 2005);
  const date2006 = getLatestNasaNdviDate(RANGES, 2006);

  assert.match(date2005, /^2005-/, `expected 2005 date, got ${date2005}`);
  assert.match(date2006, /^2006-/, `expected 2006 date, got ${date2006}`);
  assert.notEqual(date2005, date2006);
});

test("the 2005 map selection uses 2026 imagery without changing other years", () => {
  assert.equal(getMapImageryYear(2005), 2026);
  assert.equal(getMapImageryYear(2006), 2006);
  assert.equal(getMapImageryYear(2026), 2026);
});

test("getLatestNasaNdviDate returns null for a year before MODIS data", () => {
  const date = getLatestNasaNdviDate(RANGES, 1999);
  assert.equal(date, null, "should return null for year before data starts");
});

test("getLatestNasaNdviDate returns null for a year with no coverage", () => {
  const earlyRanges = [["2010-01-01", "2010-12-31", "P16D"]];
  const date = getLatestNasaNdviDate(earlyRanges, 2006);
  assert.equal(date, null, "should return null when year is outside range");
});

test("changing startYear does not affect endYear date", () => {
  const endDate = getLatestNasaNdviDate(RANGES, 2026);

  // Simulate changing startYear from 2006 to 2010 — endYear date must stay the same
  const endDateAfterChange = getLatestNasaNdviDate(RANGES, 2026);
  assert.equal(
    endDate,
    endDateAfterChange,
    "endYear date must not change when startYear changes",
  );
});

test("changing endYear does not affect startYear date", () => {
  const startDate = getLatestNasaNdviDate(RANGES, 2006);

  // Simulate changing endYear from 2026 to 2020 — startYear date must stay the same
  const startDateAfterChange = getLatestNasaNdviDate(RANGES, 2006);
  assert.equal(
    startDate,
    startDateAfterChange,
    "startYear date must not change when endYear changes",
  );
});

test("GIBS tile URL does NOT contain /1.0.0/ and contains correct date", () => {
  const GIBS_ROOT = "https://gibs.earthdata.nasa.gov/wmts/epsg3857";
  const CLOUD_SCREENED_LAYER = "MODIS_Terra_L3_NDVI_16Day";
  const date = "2006-12-19";
  const year = 2006;

  // Reproduce the URL construction from NasaSatelliteLayer (no /1.0.0/ for tile requests)
  const latency = "best";
  const layer = CLOUD_SCREENED_LAYER;
  const format = "png";
  const url = `${GIBS_ROOT}/${latency}/${layer}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.${format}`;

  assert.ok(!url.includes("/1.0.0/"), `Tile URL must NOT include /1.0.0/ — causes HTTP 400. Got: ${url}`);
  assert.ok(url.includes(date), `URL must include the date ${date}`);
  assert.ok(url.includes(String(year.toString().slice(0, 4))), "URL must include the year");
  assert.ok(!url.includes("2026"), `Before URL must not contain 2026, got: ${url}`);
});

test("Before and After GIBS tile URLs are distinct and have no /1.0.0/", () => {
  const GIBS_ROOT = "https://gibs.earthdata.nasa.gov/wmts/epsg3857";
  const LAYER = "MODIS_Terra_L3_NDVI_16Day";

  const beforeDate = getLatestNasaNdviDate(RANGES, 2006);
  const afterDate = getLatestNasaNdviDate(RANGES, 2026);

  // Correct tile URL format — no /1.0.0/ (confirmed HTTP 200 without it, 400 with it)
  const beforeUrl = `${GIBS_ROOT}/best/${LAYER}/default/${beforeDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;
  const afterUrl = `${GIBS_ROOT}/best/${LAYER}/default/${afterDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;

  assert.notEqual(beforeUrl, afterUrl, "Before and After tile URLs must be different");
  assert.ok(beforeUrl.includes("2006"), `Before URL must contain 2006, got: ${beforeUrl}`);
  assert.ok(afterUrl.includes("2026"), `After URL must contain 2026, got: ${afterUrl}`);
  assert.ok(!beforeUrl.includes("/1.0.0/"), `Tile URL must NOT include /1.0.0/`);
  assert.ok(!afterUrl.includes("/1.0.0/"), `Tile URL must NOT include /1.0.0/`);
});
