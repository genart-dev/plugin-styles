/**
 * Style blending utilities for interpolating between two style recipes.
 */

/** A style recipe value — numeric, string (enum/color), boolean, or array. */
export type StyleValue = number | string | boolean | number[] | string[];

/** A flat key-value representation of a style recipe. */
export type StyleRecipe = Record<string, StyleValue>;

/**
 * Parse a hex color (#RGB, #RRGGBB, #RRGGBBAA) into [r, g, b, a] (0-255, a 0-1).
 */
function parseHex(hex: string): [number, number, number, number] | null {
  const m = hex.match(/^#([0-9a-fA-F]+)$/);
  if (!m || !m[1]) return null;
  const h = m[1];
  if (h.length === 3) {
    const r = h[0]!;
    const g = h[1]!;
    const b = h[2]!;
    return [
      parseInt(r + r, 16),
      parseInt(g + g, 16),
      parseInt(b + b, 16),
      1,
    ];
  }
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      1,
    ];
  }
  if (h.length === 8) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      parseInt(h.slice(6, 8), 16) / 255,
    ];
  }
  return null;
}

/**
 * Convert [r, g, b, a] back to a hex string.
 */
function toHex(r: number, g: number, b: number, a: number): string {
  const rr = Math.round(Math.max(0, Math.min(255, r)));
  const gg = Math.round(Math.max(0, Math.min(255, g)));
  const bb = Math.round(Math.max(0, Math.min(255, b)));
  if (a >= 1) {
    return `#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;
  }
  const aa = Math.round(Math.max(0, Math.min(255, a * 255)));
  return `#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}${aa.toString(16).padStart(2, "0")}`;
}

/**
 * Check if a string looks like a hex color.
 */
function isHexColor(s: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(s);
}

/**
 * Blend (interpolate) between two style recipes.
 *
 * - Numeric values are linearly interpolated.
 * - Hex color strings are interpolated in RGB space.
 * - Boolean values snap at t=0.5 (A when t<0.5, B when t>=0.5).
 * - Enum/other strings snap at t=0.5.
 * - Number arrays are element-wise interpolated (length must match; otherwise snap).
 * - String arrays snap at t=0.5.
 * - Keys present in only one recipe carry through unchanged.
 *
 * @param styleA - Source style (t=0)
 * @param styleB - Target style (t=1)
 * @param t - Interpolation factor, clamped to [0, 1]
 * @returns Blended style recipe
 */
export function blendStyles(
  styleA: StyleRecipe,
  styleB: StyleRecipe,
  t: number,
): StyleRecipe {
  const clamped = Math.max(0, Math.min(1, t));
  const result: StyleRecipe = {};

  const allKeys = new Set([...Object.keys(styleA), ...Object.keys(styleB)]);

  for (const key of allKeys) {
    const a = styleA[key];
    const b = styleB[key];

    if (a !== undefined && b === undefined) {
      result[key] = a;
      continue;
    }
    if (a === undefined && b !== undefined) {
      result[key] = b;
      continue;
    }

    // Both defined
    if (typeof a === "number" && typeof b === "number") {
      result[key] = a + (b - a) * clamped;
    } else if (typeof a === "boolean" && typeof b === "boolean") {
      result[key] = clamped < 0.5 ? a : b;
    } else if (typeof a === "string" && typeof b === "string") {
      // Try color interpolation
      if (isHexColor(a) && isHexColor(b)) {
        const ca = parseHex(a);
        const cb = parseHex(b);
        if (ca && cb) {
          result[key] = toHex(
            ca[0] + (cb[0] - ca[0]) * clamped,
            ca[1] + (cb[1] - ca[1]) * clamped,
            ca[2] + (cb[2] - ca[2]) * clamped,
            ca[3] + (cb[3] - ca[3]) * clamped,
          );
          continue;
        }
      }
      // Enum / other string — snap
      result[key] = clamped < 0.5 ? a : b;
    } else if (Array.isArray(a) && Array.isArray(b)) {
      if (
        a.length === b.length &&
        a.every((v) => typeof v === "number") &&
        b.every((v) => typeof v === "number")
      ) {
        // Element-wise numeric lerp
        const numA = a as number[];
        const numB = b as number[];
        result[key] = numA.map(
          (v, i) => v + ((numB[i] ?? 0) - v) * clamped,
        );
      } else {
        // Different lengths or string arrays — snap
        result[key] = clamped < 0.5 ? a : b;
      }
    } else {
      // Mismatched types — snap
      result[key] = clamped < 0.5 ? a as StyleValue : b as StyleValue;
    }
  }

  return result;
}
