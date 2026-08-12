/**
 * Orientation for the 3D viewers, held as a rotation matrix.
 *
 * The obvious representation is a pair of angles, but it has a failure the
 * reader feels immediately: to keep pitch usable it has to be clamped at the
 * poles, and past that limit dragging simply stops doing anything. Composing
 * matrices in screen space has no poles and no limits, so a drag keeps turning
 * the model in whatever direction it is pushed, for as long as it is pushed.
 */

export type Mat3 = number[];

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function multiply(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      out[row * 3 + column] =
        a[row * 3] * b[column] + a[row * 3 + 1] * b[3 + column] + a[row * 3 + 2] * b[6 + column];
    }
  }
  return out;
}

export function rotationX(angle: number): Mat3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

export function rotationY(angle: number): Mat3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

export function apply(m: Mat3, point: { x: number; y: number; z: number }) {
  return {
    x: m[0] * point.x + m[1] * point.y + m[2] * point.z,
    y: m[3] * point.x + m[4] * point.y + m[5] * point.z,
    z: m[6] * point.x + m[7] * point.y + m[8] * point.z,
  };
}

/**
 * Pull the rows back to an orthonormal set. Thousands of multiplications let
 * rounding error accumulate, and left alone it would slowly shear the model.
 */
export function orthonormalize(m: Mat3): Mat3 {
  const row = (i: number) => [m[i * 3], m[i * 3 + 1], m[i * 3 + 2]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const scale = (a: number[], k: number) => [a[0] * k, a[1] * k, a[2] * k];
  const subtract = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const normalize = (a: number[]) => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

  const x = normalize(row(0));
  const y = normalize(subtract(row(1), scale(x, dot(row(1), x))));
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [...x, ...y, ...z];
}

/**
 * The orientation after dragging by (dx, dy) pixels.
 *
 * Left-multiplying applies the turn about the screen's own axes, so the model
 * follows the pointer regardless of how it is already facing.
 */
export function drag(current: Mat3, dx: number, dy: number, rate = 0.01): Mat3 {
  const increment = multiply(rotationY(dx * rate), rotationX(dy * rate));
  return orthonormalize(multiply(increment, current));
}

/** The starting three-quarter view, which reads better than face-on. */
export const INITIAL_VIEW = orthonormalize(multiply(rotationX(-0.35), rotationY(0.5)));
