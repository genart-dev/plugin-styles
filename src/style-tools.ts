import type {
  McpToolDefinition,
  McpToolContext,
  McpToolResult,
  JsonSchema,
} from "@genart-dev/core";
import type { ArtEra, ArtRegion } from "@genart-dev/styles";
import {
  MOVEMENTS, ARTISTS, MEDIA, RECIPES,
  getMovement, getArtist, getMedia, getRecipe,
  getRecipesForStyle,
  searchStyles, searchRecipes,
  suggestStyles,
  getRecipePalette, getMovementPalettes,
  getTimeline, getMovementsInRange,
} from "@genart-dev/styles";

function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

// ─── search_styles ──────────────────────────────────────────────────────────

export const searchStylesTool: McpToolDefinition = {
  name: "search_styles",
  description: "Search art movements, artist profiles, and media types by keyword, era, region, or tags.",
  inputSchema: {
    type: "object",
    properties: {
      query:  { type: "string", description: "Keyword search query" },
      kind:   { type: "string", enum: ["movement", "artist", "media"], description: "Filter by entity type" },
      era:    { type: "string", description: "Filter by art era (e.g. modern-early, contemporary)" },
      region: { type: "string", description: "Filter by region (e.g. western-europe, east-asia)" },
      tags:   { type: "array", items: { type: "string" }, description: "Filter by tags (any match)" },
      limit:  { type: "number", description: "Maximum results to return (default 10)" },
    } as Record<string, JsonSchema>,
  },
  async handler(input: Record<string, unknown>, _context: McpToolContext): Promise<McpToolResult> {
    const limit = Number(input["limit"] ?? 10);
    const results = searchStyles({
      query:  input["query"] as string | undefined,
      kind:   input["kind"] as "movement" | "artist" | "media" | undefined,
      era:    input["era"] as ArtEra | undefined,
      region: input["region"] as ArtRegion | undefined,
      tags:   input["tags"] as string[] | undefined,
    }).slice(0, limit);

    return textResult(JSON.stringify({ count: results.length, results }));
  },
};

// ─── get_style ───────────────────────────────────────────────────────────────

export const getStyleTool: McpToolDefinition = {
  name: "get_style",
  description: "Get full details for a specific art movement, artist, or media type by ID.",
  inputSchema: {
    type: "object",
    required: ["kind", "id"],
    properties: {
      kind: { type: "string", enum: ["movement", "artist", "media"], description: "Entity type" },
      id:   { type: "string", description: "Entity ID (e.g. impressionism, monet, watercolor)" },
    } as Record<string, JsonSchema>,
  },
  async handler(input: Record<string, unknown>, _context: McpToolContext): Promise<McpToolResult> {
    const kind = input["kind"] as string;
    const id   = input["id"] as string;

    let entity;
    if (kind === "movement")      entity = getMovement(id);
    else if (kind === "artist")   entity = getArtist(id);
    else if (kind === "media")    entity = getMedia(id);
    else return errorResult(`Unknown kind: ${kind}`);

    if (!entity) return errorResult(`${kind} "${id}" not found`);

    const recipes = getRecipesForStyle(kind as "movement" | "artist" | "media", id);
    return textResult(JSON.stringify({ entity, recipeCount: recipes.length, recipeIds: recipes.map((r) => r.id) }));
  },
};

// ─── list_recipes ─────────────────────────────────────────────────────────────

export const listRecipesTool: McpToolDefinition = {
  name: "list_recipes",
  description: "List available style recipes, optionally filtered by movement/artist/media or tags.",
  inputSchema: {
    type: "object",
    properties: {
      kind:     { type: "string", enum: ["movement", "artist", "media"], description: "Filter by style reference kind" },
      styleId:  { type: "string", description: "Filter by specific movement/artist/media ID" },
      tags:     { type: "array", items: { type: "string" }, description: "Filter by tags" },
      renderer: { type: "string", description: "Filter by supported renderer (canvas2d, webgl, p5js, svg)" },
      limit:    { type: "number", description: "Max results (default 20)" },
    } as Record<string, JsonSchema>,
  },
  async handler(input: Record<string, unknown>, _context: McpToolContext): Promise<McpToolResult> {
    const limit = Number(input["limit"] ?? 20);
    const styleId = input["styleId"] as string | undefined;
    const kind = input["kind"] as "movement" | "artist" | "media" | undefined;

    let recipes;
    if (styleId && kind) {
      recipes = getRecipesForStyle(kind, styleId);
    } else {
      recipes = searchRecipes({
        kind,
        tags:     input["tags"] as string[] | undefined,
        renderer: input["renderer"] as string | undefined,
      });
    }

    const results = recipes.slice(0, limit).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      styleRef: r.styleRef,
      renderers: r.recommendedRenderers,
      tags: r.tags,
      layerCount: r.layers.length,
    }));

    return textResult(JSON.stringify({ count: results.length, recipes: results }));
  },
};

// ─── get_recipe ───────────────────────────────────────────────────────────────

export const getRecipeTool: McpToolDefinition = {
  name: "get_recipe",
  description: "Get full details for a specific style recipe including layers, palette, and agent guidance.",
  inputSchema: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", description: "Recipe ID (e.g. impressionism-landscape, van-gogh-starry-night)" },
    } as Record<string, JsonSchema>,
  },
  async handler(input: Record<string, unknown>, _context: McpToolContext): Promise<McpToolResult> {
    const id = input["id"] as string;
    const recipe = getRecipe(id);
    if (!recipe) return errorResult(`Recipe "${id}" not found`);
    return textResult(JSON.stringify(recipe));
  },
};

// ─── suggest_style ───────────────────────────────────────────────────────────

export const suggestStyleTool: McpToolDefinition = {
  name: "suggest_style",
  description: "Given a natural language description of desired aesthetic, suggest matching art styles and recipes.",
  inputSchema: {
    type: "object",
    required: ["prompt"],
    properties: {
      prompt: { type: "string", description: "Natural language description of desired style (e.g. 'dark moody Japanese ink landscape')" },
      limit:  { type: "number", description: "Max suggestions to return (default 5)" },
    } as Record<string, JsonSchema>,
  },
  async handler(input: Record<string, unknown>, _context: McpToolContext): Promise<McpToolResult> {
    const prompt = String(input["prompt"] ?? "");
    const limit = Number(input["limit"] ?? 5);
    if (!prompt) return errorResult("prompt is required");

    const suggestions = suggestStyles(prompt, limit);
    return textResult(JSON.stringify({ count: suggestions.length, suggestions }));
  },
};

// ─── get_style_palette ────────────────────────────────────────────────────────

export const getStylePaletteTool: McpToolDefinition = {
  name: "get_style_palette",
  description: "Get the color palette(s) for a style movement or specific recipe.",
  inputSchema: {
    type: "object",
    properties: {
      movementId: { type: "string", description: "Art movement ID to get all its recipe palettes" },
      recipeId:   { type: "string", description: "Specific recipe ID to get its palette" },
    } as Record<string, JsonSchema>,
  },
  async handler(input: Record<string, unknown>, _context: McpToolContext): Promise<McpToolResult> {
    const movementId = input["movementId"] as string | undefined;
    const recipeId   = input["recipeId"] as string | undefined;

    if (!movementId && !recipeId) {
      return errorResult("Either movementId or recipeId is required");
    }

    if (recipeId) {
      const palette = getRecipePalette(recipeId);
      if (!palette) return errorResult(`Recipe "${recipeId}" not found`);
      return textResult(JSON.stringify(palette));
    }

    const palettes = getMovementPalettes(movementId!);
    return textResult(JSON.stringify({ movementId, palettes }));
  },
};

// ─── get_style_timeline ───────────────────────────────────────────────────────

export const getStyleTimelineTool: McpToolDefinition = {
  name: "get_style_timeline",
  description: "Get a chronological timeline of art movements, optionally filtered by year range.",
  inputSchema: {
    type: "object",
    properties: {
      from: { type: "number", description: "Start year filter (e.g. 1850)" },
      to:   { type: "number", description: "End year filter (e.g. 1950)" },
    } as Record<string, JsonSchema>,
  },
  async handler(input: Record<string, unknown>, _context: McpToolContext): Promise<McpToolResult> {
    const from = input["from"] as number | undefined;
    const to   = input["to"] as number | undefined;

    const timeline = (from !== undefined && to !== undefined)
      ? getMovementsInRange(from, to)
      : getTimeline();

    return textResult(JSON.stringify({ count: timeline.length, timeline }));
  },
};

// ─── apply_style ──────────────────────────────────────────────────────────────

export const applyStyleTool: McpToolDefinition = {
  name: "apply_style",
  description: "Apply a style recipe by adding a styles:reference guide layer to the current sketch with palette and guidance.",
  inputSchema: {
    type: "object",
    required: ["recipeId"],
    properties: {
      recipeId: { type: "string", description: "Recipe ID to apply (e.g. impressionism-landscape)" },
    } as Record<string, JsonSchema>,
  },
  async handler(input: Record<string, unknown>, context: McpToolContext): Promise<McpToolResult> {
    const recipeId = input["recipeId"] as string;
    const recipe = getRecipe(recipeId);
    if (!recipe) return errorResult(`Recipe "${recipeId}" not found`);

    const id = `style-ref-${Date.now()}`;
    context.layers.add({
      id,
      type: "styles:reference",
      name: recipe.name,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      transform: { x: 0, y: 0, width: context.canvasWidth, height: context.canvasHeight, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 },
      properties: {
        styleId: recipe.styleRef.id,
        styleKind: recipe.styleRef.kind,
        recipeId: recipe.id,
        showPalette: true,
        showGuidance: true,
        _palette: JSON.stringify(recipe.suggestedPalette),
        _name: recipe.name,
      },
    } as Parameters<typeof context.layers.add>[0]);

    context.emitChange("layer-added");

    return textResult(JSON.stringify({
      layerId: id,
      recipe: recipe.id,
      name: recipe.name,
      layers: recipe.layers,
      palette: recipe.suggestedPalette,
      guidance: recipe.agentGuidance,
    }));
  },
};

export const styleMcpTools: McpToolDefinition[] = [
  searchStylesTool,
  getStyleTool,
  listRecipesTool,
  getRecipeTool,
  suggestStyleTool,
  getStylePaletteTool,
  getStyleTimelineTool,
  applyStyleTool,
];
