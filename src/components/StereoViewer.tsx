"use client";

import { useEffect, useRef, useState } from "react";

import {
  INITIAL_VIEW,
  IDENTITY,
  type Mat3,
  apply,
  drag,
  multiply,
  rotationY,
} from "@/lib/rotation";
import type { Model3D, StereoIsomer } from "@/lib/stereo";

/**
 * Ball-and-stick views of the two stereoisomers, side by side.
 *
 * Each model turns on its own, so one can be brought into the orientation that
 * makes the comparison you want — usually lining the second one up with the
 * first to watch it refuse to match.
 *
 * Orientation is kept as a rotation matrix rather than a pair of angles.
 * Angles need clamping at the poles to stay usable, which is what makes a
 * viewer feel like it has hit a wall; composing matrices in screen space has
 * no poles, so dragging keeps going in every direction forever.
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
const DRAG_RATE = 0.01;

export function StereoViewer({ isomers }: { isomers: StereoIsomer[] }) {
  const [rotations, setRotations] = useState<Mat3[]>(() => isomers.map(() => INITIAL_VIEW));
  const [spinning, setSpinning] = useState(true);
  const dragging = useRef<{ index: number; x: number; y: number } | null>(null);

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
      const turn = rotationY(elapsed * SPIN_RATE);
      setRotations((current) => current.map((m) => multiply(turn, m)));
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spinning]);

  function turn(index: number, dx: number, dy: number) {
    setRotations((current) =>
      current.map((m, i) => (i === index ? drag(m, dx, dy, DRAG_RATE) : m)),
    );
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {isomers.map((isomer, index) => (
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
              onPointerDown={(event) => {
                setSpinning(false);
                dragging.current = { index, x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const from = dragging.current;
                if (!from || from.index !== index) return;
                turn(index, event.clientX - from.x, event.clientY - from.y);
                dragging.current = { index, x: event.clientX, y: event.clientY };
              }}
              onPointerUp={(event) => {
                dragging.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                dragging.current = null;
              }}
            >
              {renderModel(isomer.model, rotations[index] ?? IDENTITY)}
            </svg>
          </figure>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setSpinning(false);
          setRotations(isomers.map(() => INITIAL_VIEW));
        }}
        className="mt-2 text-xs text-text-faint transition-colors hover:text-text-dim"
      >
        Line both up again
      </button>
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
function renderModel(model: Model3D, rotation: Mat3) {
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
    const halves = [
      { start: a, end: mid, atom: model.atoms[from], side: "a" },
      { start: mid, end: b, atom: model.atoms[to], side: "b" },
    ];
    for (const half of halves) {
      elements.push({
        z: (a.z + b.z) / 2 - 0.01,
        node: (
          <line
            key={`b${index}${half.side}`}
            x1={half.start.x}
            y1={half.start.y}
            x2={half.end.x}
            y2={half.end.y}
            stroke={COLORS[half.atom.el] ?? "var(--mol-x)"}
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

function project(model: Model3D, rotation: Mat3): Projected[] {
  const { atoms } = model;
  if (atoms.length === 0) return [];

  const centre = atoms.reduce(
    (sum, atom) => ({ x: sum.x + atom.x, y: sum.y + atom.y, z: sum.z + atom.z }),
    { x: 0, y: 0, z: 0 },
  );
  centre.x /= atoms.length;
  centre.y /= atoms.length;
  centre.z /= atoms.length;

  const rotated = atoms.map((atom) =>
    apply(rotation, { x: atom.x - centre.x, y: atom.y - centre.y, z: atom.z - centre.z }),
  );

  // Fit using a radius that does not depend on the current angle, so the model
  // keeps a steady size as it turns instead of pulsing.
  const radius = Math.max(1, ...rotated.map((point) => Math.hypot(point.x, point.y, point.z)));
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
