# @genart-dev/plugin-styles

Art styles and recipes design layer plugin for [genart.dev](https://genart.dev) — search art movements, get style recommendations, extract palettes, and apply recipe-based layer stacks to sketches via MCP tools. Powered by [`@genart-dev/styles`](https://github.com/genart-dev/styles).

Part of [genart.dev](https://genart.dev) — a generative art platform with an MCP server, desktop app, and IDE extensions.

## Install

```bash
npm install @genart-dev/plugin-styles
```

## Usage

```typescript
import stylesPlugin from "@genart-dev/plugin-styles";
import { createDefaultRegistry } from "@genart-dev/core";

const registry = createDefaultRegistry();
registry.registerPlugin(stylesPlugin);

// Or access individual exports
import {
  referenceLayerType,
  styleMcpTools,
} from "@genart-dev/plugin-styles";
```

## Layer Types (1)

### Style Reference (`styles:reference`)

A non-rendering guide layer that displays the palette and metadata of the applied style recipe. Used by the agent to track which recipe is active on a sketch.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `styleId` | string | `""` | Movement/artist/media ID |
| `styleKind` | string | `"movement"` | `"movement"`, `"artist"`, or `"media"` |
| `recipeId` | string | `""` | Applied recipe ID |
| `showPalette` | boolean | `true` | Show color swatches on canvas |
| `showGuidance` | boolean | `false` | Show agent guidance text |

## MCP Tools (8)

All tools are available when the plugin is registered with the core registry.

### `search_styles`

Search art movements, artist profiles, and media types by keyword, era, region, or tags.

```json
{ "query": "japanese", "kind": "movement", "limit": 5 }
```

### `get_style`

Get full details for a specific art movement, artist, or media type by ID.

```json
{ "kind": "movement", "id": "impressionism" }
```

### `list_recipes`

List available style recipes, optionally filtered by movement/artist/media, tags, or renderer.

```json
{ "kind": "movement", "styleId": "impressionism" }
```

### `get_recipe`

Get full details for a specific style recipe including layers, palette, and agent guidance.

```json
{ "id": "impressionism-landscape" }
```

### `suggest_style`

Given a natural language description of desired aesthetic, suggest matching art styles and recipes.

```json
{ "prompt": "dark moody Japanese ink landscape" }
```

### `get_style_palette`

Get the color palette(s) for a style movement or specific recipe.

```json
{ "recipeId": "van-gogh-starry-night" }
```

### `get_style_timeline`

Get a chronological timeline of art movements, optionally filtered by year range.

```json
{ "from": 1850, "to": 1950 }
```

### `apply_style`

Apply a style recipe by adding a `styles:reference` guide layer to the current sketch with palette and guidance.

```json
{ "recipeId": "impressionism-landscape" }
```

## Dependencies

- [`@genart-dev/core`](https://github.com/genart-dev/core) — plugin host, layer types, MCP tool interfaces
- [`@genart-dev/styles`](https://github.com/genart-dev/styles) — art movements, artist profiles, media types, recipes

## License

MIT
