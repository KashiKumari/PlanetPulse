import { useEffect, useRef, useState } from "react";
import { TileLayer } from "react-leaflet";
import { getNasaNdviDate } from "@/services/nasaGibs";

const NRT_LAYER = "MODIS_Terra_CorrectedReflectance_TrueColor_v6.1_NRT";
const ARCHIVE_LAYER = "MODIS_Terra_CorrectedReflectance_TrueColor";
const CLOUD_SCREENED_LAYER = "MODIS_Terra_L3_NDVI_16Day";
const GIBS_ROOT = "https://gibs.earthdata.nasa.gov/wmts/epsg3857";
const ignoreStatusChange = () => {};

function getLatestDateInYear(ranges, year) {
  const yearStart = Date.parse(`${year}-01-01T00:00:00Z`);
  const yearEnd = Date.parse(`${year + 1}-01-01T00:00:00Z`) - 1;
  const dates = ranges.flatMap(([start, end, interval]) => {
    const intervalDays = interval.match(/^P(\d+)D$/)?.[1];
    if (!intervalDays) return [];

    const startTime = Date.parse(`${start}T00:00:00Z`);
    const endTime = Math.min(Date.parse(`${end}T00:00:00Z`), yearEnd);
    if (endTime < startTime) return [];

    const intervalMs = Number(intervalDays) * 24 * 60 * 60 * 1000;
    const candidate = startTime + Math.floor((endTime - startTime) / intervalMs) * intervalMs;
    return candidate >= yearStart
      ? [new Date(candidate).toISOString().slice(0, 10)]
      : [];
  });

  return dates.sort().at(-1) || null;
}

async function getAvailableTrueColorDate(year, signal) {
  const nearRealTime = year == null;
  const latency = nearRealTime ? "nrt" : "best";
  const layer = nearRealTime ? NRT_LAYER : ARCHIVE_LAYER;
  // /1.0.0/ is correct for the Domains XML endpoint only — NOT for tile requests
  const domainsUrl = `${GIBS_ROOT}/${latency}/1.0.0/${layer}/default/GoogleMapsCompatible_Level9/all/all.xml`;
  const response = await fetch(domainsUrl, { signal });
  if (!response.ok) throw new Error(`NASA GIBS returned HTTP ${response.status}.`);

  const xml = await response.text();
  const ranges = [...xml.matchAll(/<Domain>([^<]+)<\/Domain>/g)]
    .flatMap((match) => match[1].split(","))
    .map((range) => range.trim().split("/"))
    .filter(
      ([start, end, interval]) =>
        /^P\d+D$/.test(interval) &&
        /^\d{4}-\d{2}-\d{2}$/.test(start) &&
        /^\d{4}-\d{2}-\d{2}$/.test(end),
    );

  if (year == null) {
    const latestRange = ranges.at(-1);
    if (latestRange) return latestRange[1];
  } else {
    const yearDate = getLatestDateInYear(ranges, year);
    if (yearDate) return yearDate;
  }

  throw new Error(
    nearRealTime
      ? "NASA GIBS has not published a near-real-time image date."
      : `NASA GIBS has no satellite imagery available for ${year}.`,
  );
}

export default function NasaSatelliteLayer({
  year,
  cloudFree = false,
  opacity = 0.65,
  onStatusChange = ignoreStatusChange,
}) {
  const [imagery, setImagery] = useState(null);
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; });
  const requestKey = `${year ?? "latest"}:${cloudFree}`;

  useEffect(() => {
    const controller = new AbortController();
    onStatusChangeRef.current({ loading: true, date: null, error: null });

    const timer = setTimeout(() => {
      (cloudFree
        ? getNasaNdviDate(year, controller.signal)
        : getAvailableTrueColorDate(year, controller.signal))
        .then((availableDate) => {
          if (controller.signal.aborted) return;
          setImagery({ requestKey, date: availableDate });
          onStatusChangeRef.current({ loading: false, date: availableDate, error: null });
        })
        .catch((error) => {
          if (controller.signal.aborted || error.name === "AbortError") return;
          console.error("Failed to load NASA GIBS imagery:", error);
          onStatusChangeRef.current({ loading: false, date: null, error: error.message });
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [year, cloudFree]); // onStatusChange intentionally excluded — stable via ref

  const displayDate = imagery?.requestKey === requestKey ? imagery.date : null;
  if (!displayDate) return null;

  const nearRealTime = year == null && !cloudFree;
  const latency = nearRealTime ? "nrt" : "best";
  const layer = nearRealTime
    ? NRT_LAYER
    : cloudFree
      ? CLOUD_SCREENED_LAYER
      : ARCHIVE_LAYER;
  const format = cloudFree ? "png" : "jpg";

  // Tile URL: NO /1.0.0/ — confirmed HTTP 200 without it, 400 with it
  return (
    <TileLayer
      key={`${layer}-${displayDate}`}
      url={`${GIBS_ROOT}/${latency}/${layer}/default/${displayDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.${format}`}
      maxNativeZoom={9}
      opacity={opacity}
      attribution='Imagery &copy; <a href="https://earthdata.nasa.gov/">NASA EOSDIS GIBS</a>'
    />
  );
}
