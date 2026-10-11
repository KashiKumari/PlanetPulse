import assert from "node:assert/strict";
import { test } from "node:test";
import { getChronologicalYears } from "../utils/greeneryCalculations.js";

test("comparison years always place 2005 before 2006", () => {
  assert.deepEqual(getChronologicalYears(2005, 2006), [2005, 2006]);
  assert.deepEqual(getChronologicalYears(2006, 2005), [2005, 2006]);
});
