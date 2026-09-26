import { readFileSync, readdirSync } from "node:fs"
import { describe, expect, it } from "vitest"

const directory = new URL("../src/client/styles/", import.meta.url)
const sheets = readdirSync(directory).map((name) => ({
  name,
  css: readFileSync(new URL(name, directory), "utf8"),
}))
const css = sheets.map((sheet) => sheet.css).join("\n")
const app = readFileSync(new URL("../src/client/App.tsx", import.meta.url), "utf8")
const tokens = Object.fromEntries(
  [
    ...sheets.find((sheet) => sheet.name === "tokens.css")!.css.matchAll(/(--[\w-]+):\s*([^;]+);/g),
  ].map((match) => [match[1], match[2]!.trim()]),
)

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => {
      const value = parseInt(channel, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

describe("design system", () => {
  it("resolves every CSS variable, including game geometry supplied by JSX", () => {
    const defined = new Set([
      ...[...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
      ...[...app.matchAll(/"(--[\w-]+)"\s*:/g)].map((match) => match[1]),
    ])
    const missing = [...css.matchAll(/var\((--[\w-]+)/g)]
      .map((match) => match[1])
      .filter((name) => !defined.has(name))
    expect([...new Set(missing)]).toEqual([])
  })

  it("keeps literal UI colors in the token sheet", () => {
    for (const sheet of sheets.filter((entry) => entry.name !== "tokens.css")) {
      expect({
        name: sheet.name,
        literalColor: /#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i.test(sheet.css),
      }).toEqual({ name: sheet.name, literalColor: false })
    }
  })

  it.each([
    ["text", "canvas"],
    ["text", "surface"],
    ["muted", "surface"],
    ["text", "control"],
    ["on-action", "selected"],
    ["on-action", "action"],
    ["on-action", "action-hover"],
    ["danger", "danger-surface"],
  ])("keeps %s readable on %s", (foreground, background) => {
    const values = [foreground, background].map((role) => luminance(tokens[`--color-${role}`]!))
    const ratio = (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})
