const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const AIR_QUALITY_PARAMETERS =
  "us_aqi,european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide";

function requireCoordinates(lat, lng) {
  if (
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lng)) ||
    Number(lat) < -90 ||
    Number(lat) > 90 ||
    Number(lng) < -180 ||
    Number(lng) > 180
  ) {
    throw new Error("Valid latitude and longitude are required.");
  }
}

export async function getCurrentAirQuality({ lat, lng, signal }) {
  requireCoordinates(lat, lng);
  const url = new URL(AIR_QUALITY_URL);
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: AIR_QUALITY_PARAMETERS,
    timezone: "auto",
  }).toString();

  const response = await fetch(url, {
    signal: signal || AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Open-Meteo air-quality service returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const current = data?.current;
  if (!current || !Number.isFinite(current.us_aqi)) {
    throw new Error("The air-quality service returned no current AQI for these coordinates.");
  }

  return {
    source: "Open-Meteo Air Quality",
    source_url: "https://open-meteo.com/en/docs/air-quality-api",
    model: "CAMS atmospheric composition model",
    coordinates: {
      lat: data.latitude,
      lng: data.longitude,
    },
    timezone: data.timezone,
    time: current.time,
    us_aqi: current.us_aqi,
    european_aqi: current.european_aqi,
    pm2_5: current.pm2_5,
    pm10: current.pm10,
    carbon_monoxide: current.carbon_monoxide,
    nitrogen_dioxide: current.nitrogen_dioxide,
    ozone: current.ozone,
    sulphur_dioxide: current.sulphur_dioxide,
    data_mode: "modeled-hourly",
  };
}
