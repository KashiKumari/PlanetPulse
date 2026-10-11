import { useEffect, useState, useRef } from "react";
import { GeoJSON, useMap } from "react-leaflet";

// Natural Earth 50m country boundaries provide more detail without the weight of 10m data.
const COUNTRIES_URL =
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson";
const DEFAULT_COUNTRY_NAMES = [];

export default function CountryBoundaries({
  selectedCountry,
  selectedCountries = DEFAULT_COUNTRY_NAMES,
  onSelectCountry,
}) {
  const [geoData, setGeoData] = useState(null);
  const geoRef = useRef(null);
  const selectedNamesRef = useRef([]);
  const map = useMap();

  useEffect(() => {
    selectedNamesRef.current = [selectedCountry, ...selectedCountries].filter(Boolean);
  }, [selectedCountry, selectedCountries]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(COUNTRIES_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Country boundary data returned HTTP ${res.status}.`);
        return res.json();
      })
      .then(setGeoData)
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load country boundaries:", err);
        }
      });
    return () => controller.abort();
  }, []);

  const getFeatureStyle = (feature) => {
    const isSelected = selectedNamesRef.current.includes(feature.properties.NAME);
    return {
      fillColor: isSelected ? "hsl(152 56% 48%)" : "transparent",
      color: isSelected ? "hsl(152 64% 58%)" : "hsl(215 24% 82%)",
      weight: isSelected ? 2.5 : 0.75,
      fillOpacity: 0,
    };
  };

  useEffect(() => {
    geoRef.current?.setStyle(getFeatureStyle);
  }, [geoData, selectedCountry, selectedCountries]);

  if (!geoData) return null;

  return (
    <GeoJSON
      key="countries"
      ref={geoRef}
      data={geoData}
      style={getFeatureStyle}
      onEachFeature={(feature, layer) => {
        layer.on({
          click: (e) => {
            const bounds = e.target.getBounds();
            const center = bounds.getCenter();
            onSelectCountry({
              name: feature.properties.NAME,
              lat: center.lat,
              lng: center.lng,
              zoom: Math.min(map.getBoundsZoom(bounds.pad(0.05)), 7),
            });
          },
          mouseover: (e) => {
            const isSelected = selectedNamesRef.current.includes(feature.properties.NAME);
            e.target.setStyle({
              weight: isSelected ? 3 : 1.5,
              color: isSelected ? "hsl(152 64% 68%)" : "hsl(190 85% 70%)",
            });
            e.target.bringToFront();
          },
          mouseout: (e) => {
            e.target.setStyle(getFeatureStyle(feature));
          },
        });
      }}
    />
  );
}