import { describe, it, expect, vi } from "vitest";
import stylesPlugin, {
  styleMcpTools,
  referenceLayerType,
} from "../src/index.js";
import type { McpToolContext, LayerStackAccessor } from "@genart-dev/core";

function makeContext(): McpToolContext {
  const layers: Array<{ id: string; type: string; properties: Record<string, unknown> }> = [];
  return {
    layers: {
      getAll: () => layers,
      get: (id: string) => layers.find((l) => l.id === id) ?? null,
      add: (l: unknown) => layers.push(l as typeof layers[0]),
      remove: (id: string) => {
        const i = layers.findIndex((l) => l.id === id);
        if (i >= 0) layers.splice(i, 1);
      },
      update: vi.fn(),
      move: vi.fn(),
    } as unknown as LayerStackAccessor,
    sketchState: {} as McpToolContext["sketchState"],
    canvasWidth: 800,
    canvasHeight: 600,
    resolveAsset: async () => null,
    captureComposite: async () => Buffer.alloc(0),
    emitChange: vi.fn(),
  };
}

function parseResult(result: { content: Array<{ type: string; text?: string }> }) {
  const t = result.content[0];
  if (t?.type === "text" && t.text) return JSON.parse(t.text);
  return null;
}

describe("stylesPlugin", () => {
  it("has correct id and tier", () => {
    expect(stylesPlugin.id).toBe("styles");
    expect(stylesPlugin.tier).toBe("free");
  });

  it("has 1 layer type", () => {
    expect(stylesPlugin.layerTypes.length).toBe(1);
  });

  it("has 8 MCP tools", () => {
    expect(stylesPlugin.mcpTools.length).toBe(8);
  });

  it("all layer types are guide category", () => {
    for (const lt of stylesPlugin.layerTypes) {
      expect(lt.category).toBe("guide");
    }
  });

  it("initialize and dispose run without error", async () => {
    const ctx = { logger: console } as unknown as import("@genart-dev/core").PluginContext;
    await expect(stylesPlugin.initialize(ctx)).resolves.not.toThrow();
    expect(() => stylesPlugin.dispose()).not.toThrow();
  });
});

describe("referenceLayerType", () => {
  it("has correct typeId", () => {
    expect(referenceLayerType.typeId).toBe("styles:reference");
  });

  it("createDefault has correct defaults", () => {
    const props = referenceLayerType.createDefault();
    expect(props.showPalette).toBe(true);
    expect(props._palette).toBe("[]");
  });

  it("render no-ops with empty palette", () => {
    const props = referenceLayerType.createDefault();
    const ctx = { save: vi.fn(), restore: vi.fn() } as unknown as CanvasRenderingContext2D;
    expect(() =>
      referenceLayerType.render(props, ctx, { x: 0, y: 0, width: 800, height: 600 }, {})
    ).not.toThrow();
  });

  it("validate returns null", () => {
    expect(referenceLayerType.validate()).toBeNull();
  });
});

describe("search_styles tool", () => {
  const tool = styleMcpTools.find((t) => t.name === "search_styles")!;

  it("exists", () => {
    expect(tool).toBeDefined();
  });

  it("returns results for keyword search", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ query: "impressionism" }, ctx);
    const data = parseResult(result);
    expect(data.count).toBeGreaterThan(0);
    expect(data.results.some((r: { id: string }) => r.id === "impressionism")).toBe(true);
  });

  it("filters by kind", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ kind: "artist" }, ctx);
    const data = parseResult(result);
    expect(data.count).toBeGreaterThan(0);
    for (const r of data.results) {
      expect(r.kind).toBe("artist");
    }
  });

  it("returns no results for non-matching query", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ query: "xyzzy-does-not-match" }, ctx);
    const data = parseResult(result);
    expect(data.count).toBe(0);
  });
});

describe("get_style tool", () => {
  const tool = styleMcpTools.find((t) => t.name === "get_style")!;

  it("returns movement details", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ kind: "movement", id: "impressionism" }, ctx);
    const data = parseResult(result);
    expect(data.entity.name).toBe("Impressionism");
  });

  it("returns error for unknown id", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ kind: "movement", id: "not-real" }, ctx);
    expect(result.isError).toBe(true);
  });

  it("returns artist details", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ kind: "artist", id: "monet" }, ctx);
    const data = parseResult(result);
    expect(data.entity.name).toContain("Monet");
  });
});

describe("list_recipes tool", () => {
  const tool = styleMcpTools.find((t) => t.name === "list_recipes")!;

  it("returns all recipes without filter", async () => {
    const ctx = makeContext();
    const result = await tool.handler({}, ctx);
    const data = parseResult(result);
    expect(data.count).toBeGreaterThan(0);
  });

  it("filters by styleId and kind", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ kind: "movement", styleId: "impressionism" }, ctx);
    const data = parseResult(result);
    expect(data.count).toBeGreaterThan(0);
    for (const r of data.recipes) {
      expect(r.styleRef.id).toBe("impressionism");
    }
  });
});

describe("get_recipe tool", () => {
  const tool = styleMcpTools.find((t) => t.name === "get_recipe")!;

  it("returns recipe with layers and guidance", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ id: "impressionism-landscape" }, ctx);
    const data = parseResult(result);
    expect(data.id).toBe("impressionism-landscape");
    expect(data.layers.length).toBeGreaterThan(0);
    expect(data.agentGuidance.length).toBeGreaterThan(0);
  });

  it("returns error for unknown recipe", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ id: "not-a-recipe" }, ctx);
    expect(result.isError).toBe(true);
  });
});

describe("suggest_style tool", () => {
  const tool = styleMcpTools.find((t) => t.name === "suggest_style")!;

  it("returns suggestions for natural language", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ prompt: "dark moody Japanese ink painting" }, ctx);
    const data = parseResult(result);
    expect(data.count).toBeGreaterThan(0);
    expect(data.suggestions[0].confidence).toBeGreaterThan(0);
  });

  it("returns error when prompt is empty", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ prompt: "" }, ctx);
    expect(result.isError).toBe(true);
  });
});

describe("get_style_palette tool", () => {
  const tool = styleMcpTools.find((t) => t.name === "get_style_palette")!;

  it("returns palette for recipe", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ recipeId: "impressionism-landscape" }, ctx);
    const data = parseResult(result);
    expect(data.colors.length).toBeGreaterThanOrEqual(3);
  });

  it("returns error when neither id provided", async () => {
    const ctx = makeContext();
    const result = await tool.handler({}, ctx);
    expect(result.isError).toBe(true);
  });
});

describe("get_style_timeline tool", () => {
  const tool = styleMcpTools.find((t) => t.name === "get_style_timeline")!;

  it("returns all movements chronologically", async () => {
    const ctx = makeContext();
    const result = await tool.handler({}, ctx);
    const data = parseResult(result);
    expect(data.count).toBeGreaterThan(0);
    for (let i = 1; i < data.timeline.length; i++) {
      expect(data.timeline[i].yearStart).toBeGreaterThanOrEqual(data.timeline[i - 1].yearStart);
    }
  });

  it("filters by year range", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ from: 1860, to: 1910 }, ctx);
    const data = parseResult(result);
    expect(data.count).toBeGreaterThan(0);
  });
});

describe("apply_style tool", () => {
  const tool = styleMcpTools.find((t) => t.name === "apply_style")!;

  it("adds a reference layer to context", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ recipeId: "impressionism-landscape" }, ctx);
    expect(result.isError).not.toBe(true);
    const allLayers = ctx.layers.getAll();
    expect(allLayers.length).toBe(1);
    expect(allLayers[0]?.type).toBe("styles:reference");
  });

  it("returns palette and guidance in result", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ recipeId: "van-gogh-starry-night" }, ctx);
    const data = parseResult(result);
    expect(data.palette.length).toBeGreaterThan(0);
    expect(data.guidance.length).toBeGreaterThan(0);
    expect(data.layers.length).toBeGreaterThan(0);
  });

  it("returns error for unknown recipe", async () => {
    const ctx = makeContext();
    const result = await tool.handler({ recipeId: "not-a-recipe" }, ctx);
    expect(result.isError).toBe(true);
  });
});
