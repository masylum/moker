import illustrationSizes from "./rule-illustration-sizes.json"
import { For } from "solid-js"

// Original inst3 layers, positioned in the illustration’s Figma coordinate system.
const layers: { name: keyof typeof illustrationSizes; x: number; y: number }[] = [
  {
    name: "fishing-42513",
    x: 0,
    y: 0,
  },
  {
    name: "fishing-42594",
    x: 32.91,
    y: 69.05,
  },
  {
    name: "fishing-42595",
    x: 75.74,
    y: 69.05,
  },
  {
    name: "fishing-42514",
    x: 27.08,
    y: 4.19,
  },
  {
    name: "fishing-42579",
    x: 57.74,
    y: 80.81,
  },
  {
    name: "fishing-42581",
    x: 14.91,
    y: 80.81,
  },
  {
    name: "fishing-42583",
    x: 57.74,
    y: 138.81,
  },
  {
    name: "fishing-42585",
    x: 14.91,
    y: 138.81,
  },
  {
    name: "fishing-42587",
    x: 57.74,
    y: 196.81,
  },
  {
    name: "fishing-42589",
    x: 41.95,
    y: 80.11,
  },
  {
    name: "fishing-42590",
    x: 83.79,
    y: 81.12,
  },
  {
    name: "fishing-42591",
    x: 88.49,
    y: 194.09,
  },
  {
    name: "fishing-42592",
    x: 45.13,
    y: 135.96,
  },
  {
    name: "fishing-42593",
    x: 85.31,
    y: 140.04,
  },
  {
    name: "fishing-42596",
    x: 9.94,
    y: 275.09,
  },
]
export function FishingIllustration() {
  return (
    <figure
      class="rules-illustration fishing-illustration"
      role="img"
      aria-label="Draw from the deck or the last card of either discard lane. Earlier discards are unavailable."
    >
      <For each={layers}>
        {(layer) => (
          <img
            src={`/assets/rules/${layer.name}.png`}
            width={illustrationSizes[layer.name].width}
            height={illustrationSizes[layer.name].height}
            alt=""
            style={{ left: `${layer.x}px`, top: `${layer.y}px` }}
          />
        )}
      </For>
    </figure>
  )
}
