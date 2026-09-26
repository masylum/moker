# Figma assets and typography

Source: [Classic Playing Cards / Moker](https://www.figma.com/design/mYJZqQ29YKtPn49xtNVLkt/Classic-Playing-Cards--Community-?node-id=269-43382). These assets are used at the owner's request; this record does not grant additional redistribution rights.

Original full-card artwork is stored under `public/assets/cards`. Bamboo Dragon and Joker and the card back use full-frame PNG exports; the remaining faces use SVG exports. The hero, Moker wordmark, and chip illustration also come from this file. Node IDs are recorded in `public/assets/figma-manifest.json` so exports can be refreshed without relying on expiring URLs.

The interface shares the design palette: coral `#ff5061`, pink `#ffc4e9`, blue `#0098ff`, cyan `#b2e4f0`, green `#00ad3d`, pale yellow `#dbe3b2`, ink `#211c1d`, and grey `#b2b2b2`. Chip controls map 5 to grey, 10 to blue, 20 to coral, and 50 to green.

LINE Seed Sans Regular and Bold were copied from the user's installed fonts and load locally. Gelica, used by the design, was not available locally. Text headings request Gelica and fall back to Georgia; the original wordmark is an exported graphic. To achieve the remaining typography match, supply a licensed Gelica webfont and add its `@font-face` declaration to `src/client/styles.css`.
