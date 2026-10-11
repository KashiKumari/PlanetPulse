const GIBS_ROOT = "https://gibs.earthdata.nasa.gov/wmts/epsg3857";
const NDVI_LAYER = "MODIS_Terra_L3_NDVI_16Day";
const TIME_DOMAIN_URL = `${GIBS_ROOT}/best/1.0.0/${NDVI_LAYER}/default/GoogleMapsCompatible_Level9/all/all.xml`;

export function getMapImageryYear(year) {
  return year === 2005 ? 2026 : year;
}

async function getTimeRanges(signal) {
  const response = await fetch(TIME_DOMAIN_URL, { signal });
  if (!response.ok) throw new Error(`NASA GIBS returned HTTP ${response.status}.`);

  const xml = await response.text();
  return [...xml.matchAll(/<Domain>([^<]+)<\/Domain>/g)]
    .flatMap((match) => match[1].split(","))
    .map((range) => range.trim().split("/"))
    .filter(
      ([start, end, interval]) =>
        /^P\d+D$/.test(interval) &&
        /^\d{4}-\d{2}-\d{2}$/.test(start) &&
        /^\d{4}-\d{2}-\d{2}$/.test(end),
    );
}

export function getLatestNasaNdviDate(ranges, year) {
  const yearStart = Date.parse(`${year}-01-01T00:00:00Z`);
  const yearEnd = Date.parse(`${year + 1}-01-01T00:00:00Z`) - 1;
  const dates = ranges.flatMap(([start, end, interval]) => {
    const intervalDays = Number(interval.slice(1, -1));
    const startTime = Date.parse(`${start}T00:00:00Z`);
    const endTime = Math.min(Date.parse(`${end}T00:00:00Z`), yearEnd);
    if (endTime < startTime) return [];

    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    const candidate = startTime + Math.floor((endTime - startTime) / intervalMs) * intervalMs;
    return candidate >= yearStart ? [new Date(candidate).toISOString().slice(0, 10)] : [];
  });

  return dates.sort().at(-1) || null;
}

export async function getNasaNdviDate(year, signal) {
  const ranges = await getTimeRanges(signal);
  if (year == null) {
    const latestRange = ranges.at(-1);
    if (latestRange) return latestRange[1];
  }
  const date = getLatestNasaNdviDate(ranges, year);
  if (!date) throw new Error(`NASA MODIS NDVI imagery is not available for ${year}.`);
  return date;
}

export async function getNasaNdviAvailableYears(years, signal) {
  const ranges = await getTimeRanges(signal);
  return years.filter((year) => getLatestNasaNdviDate(ranges, year));
}
