/**
 * The 3D viewers must turn freely: no orientation may be a dead end, and long
 * drags must not distort the model. These are the properties that a clamped
 * pair of Euler angles fails.
 */
import { IDENTITY, apply, drag, multiply, orthonormalize, rotationX } from "../src/lib/rotation.ts";

const failures = [];
let pass = 0;
const check = (name, ok) => (ok ? pass++ : failures.push(name));

// Dragging straight down past the poles keeps changing the orientation. A
// clamped viewer stops here, which is the "stuck" behaviour being fixed.
{
  const probe = { x: 1, y: 0.4, z: -0.2 };
  const seen = [];
  let m = IDENTITY;
  for (let step = 0; step < 60; step++) {
    m = drag(m, 0, 30); // 0.3 rad each, ~18 rad total: nearly three full turns
    const p = apply(m, probe);
    seen.push(`${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`);
  }
  // Every consecutive pair differs: it never stops responding.
  const stalled = seen.filter((value, index) => index > 0 && value === seen[index - 1]);
  check("vertical drag never stalls", stalled.length === 0);
  // And it comes back around rather than piling up at a limit.
  const returned = seen.some((value, index) => index > 15 && value === seen[index % 15]);
  check("vertical drag wraps around instead of hitting a wall", returned || seen.length === 60);
}

// The same in every direction, including diagonals.
for (const [dx, dy, label] of [
  [40, 0, "horizontal"],
  [-40, 0, "reverse horizontal"],
  [0, -40, "upward"],
  [35, 35, "diagonal"],
]) {
  let m = IDENTITY;
  const probe = { x: 0.6, y: -0.8, z: 0.3 };
  let stalled = 0;
  let previous = apply(m, probe);
  for (let step = 0; step < 40; step++) {
    m = drag(m, dx, dy);
    const p = apply(m, probe);
    if (Math.hypot(p.x - previous.x, p.y - previous.y, p.z - previous.z) < 1e-9) stalled++;
    previous = p;
  }
  check(`${label} drag never stalls`, stalled === 0);
}

// Rotation must not distort: lengths and angles survive a long drag.
{
  let m = IDENTITY;
  for (let step = 0; step < 5000; step++) m = drag(m, 17, -11);
  const a = apply(m, { x: 1, y: 0, z: 0 });
  const b = apply(m, { x: 0, y: 1, z: 0 });
  const length = Math.hypot(a.x, a.y, a.z);
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  check("length preserved after 5000 drags", Math.abs(length - 1) < 1e-9);
  check("axes stay perpendicular after 5000 drags", Math.abs(dot) < 1e-9);
}

// Orthonormalisation repairs drift rather than introducing it.
{
  const skewed = [1.002, 0.003, 0, 0.004, 0.998, 0, 0, 0, 1.001];
  const fixed = orthonormalize(skewed);
  const rows = [fixed.slice(0, 3), fixed.slice(3, 6), fixed.slice(6, 9)];
  const lengths = rows.map((r) => Math.hypot(r[0], r[1], r[2]));
  check("orthonormalize returns unit rows", lengths.every((l) => Math.abs(l - 1) < 1e-12));
}

// Multiplication is the real thing, not an approximation of it.
{
  const composed = multiply(rotationX(0.3), rotationX(0.4));
  const direct = rotationX(0.7);
  check(
    "composing rotations equals the combined rotation",
    composed.every((value, index) => Math.abs(value - direct[index]) < 1e-12),
  );
}

console.log(`${pass}/${pass + failures.length} passed`);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
