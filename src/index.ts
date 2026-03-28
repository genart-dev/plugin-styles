import type { DesignPlugin, PluginContext } from "@genart-dev/core";
import { referenceLayerType } from "./reference-layer.js";
import { styleMcpTools } from "./style-tools.js";

const stylesPlugin: DesignPlugin = {
  id: "styles",
  name: "Art Styles & Recipes",
  version: "0.2.0",
  tier: "free",
  description:
    "Art movements, artist profiles, and style recipes for generative art. Provides style search, natural-language suggestions, palette extraction, and recipe-based layer stacks.",
  layerTypes: [referenceLayerType],
  tools: [],
  exportHandlers: [],
  mcpTools: styleMcpTools,
  async initialize(_context: PluginContext): Promise<void> {},
  dispose(): void {},
};

export default stylesPlugin;
export { stylesPlugin };
export { referenceLayerType };
export { styleMcpTools };
export {
  blendStyles,
  type StyleValue,
  type StyleRecipe,
} from "./style-blend.js";
