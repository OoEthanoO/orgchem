"use client";

import { useEffect, useRef, useState } from "react";

import type { Model3D, StereoIsomer } from "@/lib/stereo";

/**
 * Ball-and-stick views of the two stereoisomers, side by side.
 *
 * Both share one rotation: dragging either view turns both, which is the whole
 * point — the pair only reads as mirror images if you can turn them together
 * and watch one fail to superimpose on the other.
 */

/** Ångström radii, scaled down so the sticks stay visible. */
const RADII: Record<string, number> = {
  H: 0.28,
  C: 0.42,
  N: 0.41,
  O: 0.4,
  F: 0.37,
  P: 0.48,
  S: 0.48,
  Cl: 0.45,
  Br: 0.5,
  I: 0.55,
};

const COLORS: Record<string, string> = {
  H: "var(--mol-h)",
  C: "var(--mol-c)",
  N: "var(--mol-n)",
  O: "var(--mol-o)",
  F: "var(--mol-f)",
  P: "var(--mol-p)",
  S: "var(--mol-s)",
  Cl: "var(--mol-cl)",
  Br: "var(--mol-br)",
  I: "var(--mol-i)",
};

const VIEW = 260;
/** Radians per millisecond, and how long the arrival spin lasts. */
const SPIN_RATE = 0.0004;
const SPIN_DURATION_MS = 9000;

type Rotation = { x: number; y: number };

export function StereoViewer({ isomers }: { isomers: StereoIsomer[] }) {
  const [rotation, setRotation] = useState<Rotation>({ x: -0.35, y: 0.5 });
  const [spinning, setSpinning] = useState(true);
  const dragging = useRef<{ x: number; y: number } | null>(null);

  // A slow turn on arrival shows straight away that these are 3D. It stops
  // after most of a revolution, and the moment the reader takes over, so the
  // page is not left running a render loop forever.
  useEffect(() => {
    if (!spinning) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let last = performance.now();
    const until = last + SPIN_DURATION_MS;

    const step = (now: number) => {
      if (now >= until) {
        setSpinning(false);
        return;
      }
      // A backgrounded tab should resume where it left off, not jump.
      const elapsed = document.hidden ? 0 : now - last;
      last = now;
      setRotation((current) => ({ ...current, y: current.y + elapsed * SPIN_RATE }));
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spinning]);

  function onPointerDown(event: React.PointerEvent) {
    setSpinning(false);
    dragging.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    const from = dragging.current;
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    dragging.current = { x: event.clientX, y: event.clientY };
    setRotation((current) => ({
      x: clamp(current.x + dy * 0.01, -Math.PI / 2, Math.PI / 2),
      y: current.y + dx * 0.01,
    }));
  }

  function onPointerUp(event: React.PointerEvent) {
    dragging.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {isomers.map((isomer) => (
        <figure
          key={isomer.label}
          className="overflow-hidden rounded-xl border border-border bg-surface-2"
        >
          <figcaption className="flex items-baseline justify-between gap-2 border-b border-border px-3 py-2">
            <span className="text-sm font-medium text-text">({isomer.label})</span>
            {isomer.matchesInput && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-text">
                what you asked for
              </span>
            )}
          </figcaption>
          <svg
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            className="w-full cursor-grab touch-none select-none active:cursor-grabbing"
            role="img"
            aria-label={`Three-dimensional model of the ${isomer.label} isomer`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {renderModel(isomer.model, rotation)}
          </svg>
        </figure>
      ))}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type Projected = { x: number; y: number; z: number; scale: number };

/**
 * Project, depth-sort and draw. Everything is painted back to front, so a bond
 * behind an atom is covered by it and the shape reads as solid.
 */
function renderModel(model: Model3D, rotation: Rotation) {
  const points = project(model, rotation);
  const elements: Array<{ z: number; node: React.ReactNode }> = [];

  model.bonds.forEach(([from, to, order], index) => {
    const a = points[from];
    const b = points[to];
    if (!a || !b) return;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const width = 5 * ((a.scale + b.scale) / 2);

    // Each half takes the colour of the atom it grows from, the way a
    // ball-and-stick model is built.
    for (const [start, end, atom] of [
      [a, mid, model.atoms[from]],
      [mid, b, model.atoms[to]],
    ] as const) {
      elements.push({
        z: (a.z + b.z) / 2 - 0.01,
        node: (
          <line
            key={`b${index}-${atom === model.atoms[from] ? "a" : "b"}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={COLORS[atom.el] ?? "var(--mol-x)"}
            strokeWidth={order > 1 ? width * 1.35 : width}
            strokeLinecap="round"
            opacity={depthOpacity((a.z + b.z) / 2)}
          />
        ),
      });
    }
  });

  model.atoms.forEach((atom, index) => {
    const point = points[index];
    if (!point) return;
    elements.push({
      z: point.z,
      node: (
        <circle
          key={`a${index}`}
          cx={point.x}
          cy={point.y}
          r={(RADII[atom.el] ?? 0.4) * 34 * point.scale}
          fill={COLORS[atom.el] ?? "var(--mol-x)"}
          stroke="var(--surface-2)"
          strokeWidth={1.2}
          opacity={depthOpacity(point.z)}
        />
      ),
    });
  });

  elements.sort((a, b) => a.z - b.z);
  return elements.map((element) => element.node);
}

/** Atoms further away are drawn slightly faded, which reads as depth. */
function depthOpacity(z: number): number {
  return clamp(0.55 + (z + 1) * 0.28, 0.4, 1);
}

function project(model: Model3D, rotation: Rotation): Projected[] {
  const { atoms } = model;
  if (atoms.length === 0) return [];

  const centre = atoms.reduce(
    (sum, atom) => ({ x: sum.x + atom.x, y: sum.y + atom.y, z: sum.z + atom.z }),
    { x: 0, y: 0, z: 0 },
  );
  centre.x /= atoms.length;
  centre.y /= atoms.length;
  centre.z /= atoms.length;

  const cosX = Math.cos(rotation.x);
  const sinX = Math.sin(rotation.x);
  const cosY = Math.cos(rotation.y);
  const sinY = Math.sin(rotation.y);

  const rotated = atoms.map((atom) => {
    const x0 = atom.x - centre.x;
    const y0 = atom.y - centre.y;
    const z0 = atom.z - centre.z;
    const x1 = x0 * cosY + z0 * sinY;
    const z1 = -x0 * sinY + z0 * cosY;
    const y2 = y0 * cosX - z1 * sinX;
    const z2 = y0 * sinX + z1 * cosX;
    return { x: x1, y: y2, z: z2 };
  });

  // Fit the molecule to the viewport at whatever angle it is currently turned
  // to, using a radius that does not change as it spins so it does not pulse.
  const radius = Math.max(
    1,
    ...rotated.map((point) => Math.hypot(point.x, point.y, point.z)),
  );
  const fit = (VIEW / 2 - 22) / radius;
  const depth = radius * 2.6;

  return rotated.map((point) => {
    // Mild perspective: nearer atoms grow, which helps the eye read the twist.
    const scale = depth / (depth - point.z);
    return {
      x: VIEW / 2 + point.x * fit * scale,
      y: VIEW / 2 - point.y * fit * scale,
      z: point.z / radius,
      scale,
    };
  });
}
