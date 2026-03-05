import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  LayerBounds,
  RenderResources,
} from "@genart-dev/core";

const REFERENCE_PROPERTIES: LayerPropertySchema[] = [
  { key: "styleId",   label: "Style ID",   type: "string", default: "",        group: "reference" },
  { key: "styleKind", label: "Style Kind", type: "string", default: "movement", group: "reference" },
  { key: "recipeId",  label: "Recipe ID",  type: "string", default: "",        group: "reference" },
  { key: "showPalette",  label: "Show Palette",  type: "boolean", default: true,  group: "display" },
  { key: "showGuidance", label: "Show Guidance", type: "boolean", default: false, group: "display" },
  { key: "_palette",  label: "Palette (JSON)", type: "string", default: "[]", group: "data" },
  { key: "_name",     label: "Style Name",    type: "string", default: "",    group: "data" },
];

const SWATCH_SIZE = 24;
const SWATCH_GAP = 4;
const PADDING = 10;
const LABEL_HEIGHT = 16;

export const referenceLayerType: LayerTypeDefinition = {
  typeId: "styles:reference",
  displayName: "Style Reference",
  icon: "palette",
  category: "guide",
  properties: REFERENCE_PROPERTIES,
  propertyEditorId: "styles:reference-editor",

  createDefault(): LayerProperties {
    return {
      styleId: "",
      styleKind: "movement",
      recipeId: "",
      showPalette: true,
      showGuidance: false,
      _palette: "[]",
      _name: "",
    };
  },

  render(
    properties: LayerProperties,
    ctx: CanvasRenderingContext2D,
    bounds: LayerBounds,
    _resources: RenderResources,
  ): void {
    const showPalette = Boolean(properties.showPalette ?? true);
    const name = String(properties._name ?? "");
    const palette = JSON.parse(String(properties._palette ?? "[]")) as string[];

    if (!showPalette || palette.length === 0) return;

    ctx.save();

    const x = bounds.x + PADDING;
    let y = bounds.y + PADDING;

    // Style name label
    if (name) {
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillText(name, x, y + LABEL_HEIGHT - 4);
      y += LABEL_HEIGHT + 4;
    }

    // Palette swatches
    for (let i = 0; i < palette.length; i++) {
      const swatchX = x + i * (SWATCH_SIZE + SWATCH_GAP);
      // Checkerboard background for transparency
      ctx.fillStyle = "#CCCCCC";
      ctx.fillRect(swatchX, y, SWATCH_SIZE, SWATCH_SIZE);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(swatchX, y, SWATCH_SIZE / 2, SWATCH_SIZE / 2);
      ctx.fillRect(swatchX + SWATCH_SIZE / 2, y + SWATCH_SIZE / 2, SWATCH_SIZE / 2, SWATCH_SIZE / 2);
      // Color swatch
      ctx.fillStyle = palette[i] ?? "#000000";
      ctx.fillRect(swatchX, y, SWATCH_SIZE, SWATCH_SIZE);
      // Border
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(swatchX + 0.5, y + 0.5, SWATCH_SIZE - 1, SWATCH_SIZE - 1);
    }

    ctx.restore();
  },

  validate(): null { return null; },
};
