import { describe, it, expect } from "vitest";
import { blendStyles, type StyleRecipe } from "../src/style-blend.js";

describe("blendStyles", () => {
  // ── Numeric interpolation ──────────────────────────────────────────────

  describe("numeric values", () => {
    it("interpolates at t=0", () => {
      const result = blendStyles({ opacity: 0 }, { opacity: 1 }, 0);
      expect(result.opacity).toBeCloseTo(0);
    });

    it("interpolates at t=1", () => {
      const result = blendStyles({ opacity: 0 }, { opacity: 1 }, 1);
      expect(result.opacity).toBeCloseTo(1);
    });

    it("interpolates at t=0.5", () => {
      const result = blendStyles({ opacity: 0 }, { opacity: 1 }, 0.5);
      expect(result.opacity).toBeCloseTo(0.5);
    });

    it("interpolates multiple numeric fields", () => {
      const a: StyleRecipe = { strokeWidth: 1, blur: 0, saturation: 50 };
      const b: StyleRecipe = { strokeWidth: 5, blur: 10, saturation: 100 };
      const result = blendStyles(a, b, 0.25);
      expect(result.strokeWidth).toBeCloseTo(2);
      expect(result.blur).toBeCloseTo(2.5);
      expect(result.saturation).toBeCloseTo(62.5);
    });
  });

  // ── Boolean snapping ──────────────────────────────────────────────────

  describe("boolean values", () => {
    it("returns A when t < 0.5", () => {
      const result = blendStyles({ visible: true }, { visible: false }, 0.3);
      expect(result.visible).toBe(true);
    });

    it("returns B when t >= 0.5", () => {
      const result = blendStyles({ visible: true }, { visible: false }, 0.5);
      expect(result.visible).toBe(false);
    });
  });

  // ── Enum (string) snapping ────────────────────────────────────────────

  describe("enum/string values", () => {
    it("returns A when t < 0.5", () => {
      const result = blendStyles({ blend: "multiply" }, { blend: "screen" }, 0.4);
      expect(result.blend).toBe("multiply");
    });

    it("returns B when t >= 0.5", () => {
      const result = blendStyles({ blend: "multiply" }, { blend: "screen" }, 0.6);
      expect(result.blend).toBe("screen");
    });
  });

  // ── Color interpolation ───────────────────────────────────────────────

  describe("hex color interpolation", () => {
    it("interpolates #000000 to #ffffff at t=0.5", () => {
      const result = blendStyles({ color: "#000000" }, { color: "#ffffff" }, 0.5);
      // Should be approximately #808080 (127.5 rounds to 80 in hex)
      expect(result.color).toMatch(/^#[0-9a-f]{6}$/);
      // Parse the result
      const hex = result.color as string;
      const r = parseInt(hex.slice(1, 3), 16);
      expect(r).toBeGreaterThan(120);
      expect(r).toBeLessThan(135);
    });

    it("returns exact A color at t=0", () => {
      const result = blendStyles({ color: "#ff0000" }, { color: "#0000ff" }, 0);
      expect(result.color).toBe("#ff0000");
    });

    it("returns exact B color at t=1", () => {
      const result = blendStyles({ color: "#ff0000" }, { color: "#0000ff" }, 1);
      expect(result.color).toBe("#0000ff");
    });

    it("handles 3-char hex", () => {
      const result = blendStyles({ color: "#f00" }, { color: "#00f" }, 0.5);
      expect(result.color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("handles 8-char hex with alpha", () => {
      const result = blendStyles({ color: "#ff000000" }, { color: "#ff0000ff" }, 0.5);
      expect(result.color).toMatch(/^#[0-9a-f]{8}$/);
    });

    it("snaps non-hex strings", () => {
      const result = blendStyles({ name: "hello" }, { name: "world" }, 0.3);
      expect(result.name).toBe("hello");
    });
  });

  // ── Array interpolation ───────────────────────────────────────────────

  describe("array values", () => {
    it("element-wise interpolation of number arrays", () => {
      const a: StyleRecipe = { weights: [0, 10, 100] };
      const b: StyleRecipe = { weights: [100, 20, 0] };
      const result = blendStyles(a, b, 0.5);
      const w = result.weights as number[];
      expect(w[0]).toBeCloseTo(50);
      expect(w[1]).toBeCloseTo(15);
      expect(w[2]).toBeCloseTo(50);
    });

    it("snaps arrays of different lengths", () => {
      const a: StyleRecipe = { tags: ["a", "b"] };
      const b: StyleRecipe = { tags: ["x", "y", "z"] };
      const result = blendStyles(a, b, 0.3);
      expect(result.tags).toEqual(["a", "b"]);
    });

    it("snaps string arrays at t=0.5", () => {
      const a: StyleRecipe = { tags: ["a", "b"] };
      const b: StyleRecipe = { tags: ["x", "y"] };
      const result = blendStyles(a, b, 0.5);
      expect(result.tags).toEqual(["x", "y"]);
    });
  });

  // ── Asymmetric keys ───────────────────────────────────────────────────

  describe("asymmetric keys", () => {
    it("carries A-only keys through", () => {
      const result = blendStyles({ extra: 42 }, {}, 0.5);
      expect(result.extra).toBe(42);
    });

    it("carries B-only keys through", () => {
      const result = blendStyles({}, { extra: 42 }, 0.5);
      expect(result.extra).toBe(42);
    });

    it("includes all keys from both recipes", () => {
      const a: StyleRecipe = { opacity: 0, mode: "normal" };
      const b: StyleRecipe = { opacity: 1, blur: 5 };
      const result = blendStyles(a, b, 0.5);
      expect(Object.keys(result).sort()).toEqual(["blur", "mode", "opacity"]);
    });
  });

  // ── Clamping ──────────────────────────────────────────────────────────

  describe("t clamping", () => {
    it("clamps negative t to 0", () => {
      const result = blendStyles({ v: 0 }, { v: 100 }, -1);
      expect(result.v).toBeCloseTo(0);
    });

    it("clamps t > 1 to 1", () => {
      const result = blendStyles({ v: 0 }, { v: 100 }, 5);
      expect(result.v).toBeCloseTo(100);
    });
  });

  // ── Mismatched types ──────────────────────────────────────────────────

  describe("mismatched types", () => {
    it("snaps when types differ", () => {
      const a: StyleRecipe = { val: 5 };
      const b: StyleRecipe = { val: "text" };
      const result = blendStyles(a, b, 0.3);
      expect(result.val).toBe(5);
      const result2 = blendStyles(a, b, 0.7);
      expect(result2.val).toBe("text");
    });
  });

  // ── Empty inputs ──────────────────────────────────────────────────────

  describe("empty inputs", () => {
    it("returns empty for two empty recipes", () => {
      expect(blendStyles({}, {}, 0.5)).toEqual({});
    });
  });
});
