import assert from "node:assert/strict";
import { resolveQuery } from "../src/lib/resolve.ts";

// Coordination lookup must be complete without querying an organic resolver.
const originalFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = async () => {
  requests++;
  throw new Error("Network is deliberately unavailable");
};

try {
  for (const query of [
    "triamminetriaquachromium(iii)",
    "name: triamminetriaquachromium(III)",
    "[Cr(NH3)3(H2O)3]^3+",
    "[Cr(NH₃)₃(H₂O)₃]³⁺",
    "formula: [Cr(NH3)3(H2O)3]3+",
  ]) {
    const result = await resolveQuery(query);
    assert.equal(result.source, "complex", query);
    assert.equal(result.complex.metal.symbol, "Cr", query);
    assert.equal(result.complex.oxidationState, 3, query);
    assert.equal(result.complex.charge, 3, query);
    assert.equal(result.complex.coordinationNumber, 6, query);
    assert.equal("smiles" in result, false, "complexes must not pretend to have organic SMILES");
  }
  assert.equal(requests, 0, "supported complexes must resolve offline");
  const iron = await resolveQuery("potassium hexacyanoferrate(II)");
  assert.equal(iron.source, "complex");
  assert.equal(iron.complex.charge, -4);
  assert.equal(iron.complex.counterion.count, 4);
  assert.equal(requests, 0, "salt resolution must stay offline too");

  for (const query of [
    "cis-diamminedichloridoplatinum(II)",
    "hexaaquachromium(IIII)",
    "[Cr(NH3)3(H2O)3]^99+",
    "tris(2,2'-bipyridine)iron(II)",
  ]) {
    await assert.rejects(resolveQuery(query), /coordination complex/i, query);
  }
  assert.equal(requests, 0, "unsupported complexes must not fall back to organic resolvers");

  const organic = await resolveQuery("caffeine");
  assert.notEqual(organic.source, "complex", "organic lookup still uses the established resolver");
  assert.ok(organic.smiles);
  console.log("Complex resolution: names, prefixed inputs, Unicode formulas, salts and organic regression passed.");
} finally {
  globalThis.fetch = originalFetch;
}
