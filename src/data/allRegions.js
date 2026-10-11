import { hotspots } from "./hotspots.js";
import { indiaStates } from "./indiaStates.js";

// Combined list of all regions — India states (detailed) + global hotspots.
export const allRegions = [...indiaStates, ...hotspots];

export function findRegionById(id) {
  return allRegions.find((r) => r.id === id);
}