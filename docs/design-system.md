# Moker design system

The client uses native CSS custom properties. `src/client/styles.css` is the entry point; it imports tokens, foundations, and component styles in a deliberate order. No styling runtime or new build integration is required.

## Ownership

| File                 | Owns                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `styles/tokens.css`  | Shared color roles, typography, spacing, radii, shadows, motion, card geometry, perspective |
| `styles/base.css`    | Fonts, reset, header, common buttons and form controls, accessibility utilities             |
| `styles/home.css`    | Setup controls and static decorative card fan                                               |
| `styles/cards.css`   | Card primitives, selection, chip denominations and stacks                                   |
| `styles/table.css`   | Seats, shared table, hand, progression, fishing zones and hand ladder                       |
| `styles/dialogs.css` | Betting, results, rules, errors and overlays                                                |
| `styles/motion.css`  | Entry/selection animation and reduced-motion behavior                                       |

Update the component's existing rule. Do not append a new theme or another selector to override it. Keep state rules next to their component and responsive rules at the end of its file. Page prefixes are only needed for genuinely page-specific behavior, such as header spacing.

## Color roles

- `--color-canvas`: white page and card surfaces.
- `--color-surface`, `--color-seat`, `--color-surface-raised`: pale-green setup, translucent player areas, and raised references.
- `--color-text`, `--color-muted`: readable green-based foregrounds on light surfaces.
- `--color-control`, `--color-control-hover`: secondary choices.
- `--color-selected`: selected game mode, human seat and tournament choice.
- `--color-action`, `--color-action-hover`, `--color-on-action`: primary buttons, with white text.
- `--color-border`, `--color-border-strong`, `--color-focus`: outlines and interactive emphasis.
- `--color-danger`, `--color-danger-surface`: errors, not generic action buttons.
- Chip and avatar colors are intentional identity/denomination exceptions. Do not use them for ordinary control styling.

Literal UI colors belong only in `tokens.css`. Static card artwork retains its printed colors. A component may define geometry variables, but must not redefine the global palette.

## Typography

Adobe Fonts kit `imt4ggh` supplies Gelica 400 for body text, controls, and the landing headline; Dela Gothic One for secondary headings, player names, and the pot. Use `--font-body` and `--font-display`; Dela uses its native 400 weight. Current-hand labels stay regular weight. System fallbacks keep content visible while fonts load. Emphasis uses `--font-weight-emphasis` (500), regular text uses 400; add Gelica Medium to the Adobe kit to serve the requested 500 face (the current kit contains 400 and 700).

## Scale and elevation

Use `--font-*`, `--space-*` (a four-pixel scale, with half steps), `--radius-*` and `--shadow-*` roles. Keep measured card and layout dimensions in component rules where they describe game geometry. The setup card is flat; cards have a small physical edge; popovers and dialogs use restrained shadows.

## Table perspective and stable geometry

`--table-depth`, `--table-tilt` and `--table-transform` apply one transform to `.play-layout`. Cards, chips and player UI share the same plane. Do not apply separate perspective transforms to each card. The desktop uses 2400px / 14°; smaller screens use 2600px / 10°. Center-origin perspective and horizontal room keep the near edge inside the viewport.

Keep eight hand slots even when the hand has seven cards. Keep opponent card rows and action rows reserved so betting, fishing and revealing do not resize surrounding content. Public cards remain on the left; private cards stay on the right.

Dialogs use the native top layer. They and their backdrops remain upright above the game; the hand ladder opens over the table without changing its grid.

## Motion

CSS and `motion.ts` read the same duration and easing tokens. Game mode selection slides its background; hover only changes color/border. Decorative home cards are static. Respect reduced motion, and never add hover translation or use layout animation that changes card slot sizes.

## Verification

Run `npm run build` and `npx vitest run tests/design-system.test.ts`. The design-system tests check token references, enforce centralized colors, and verify text contrast for shared control combinations. Also inspect home, table, fishing/discarding, hand ladder, betting and results at desktop and narrow widths when changing geometry.

Public hand cards stay opaque and tilt back by `--hand-public-tilt` within the shared table projection, with their captions left upright. Private card buttons stay untransformed for stable pointer hit testing; the hand row shares one perspective derived from `--table-depth`, preserving 3D through each public card wrapper rather than flattening its rotation. The row composites above the panel surface, and public cards rotate around their bottom edge to stay aligned with private cards. Never give each card an independent vanishing point. The pending draw gets a persistent outline and “Just drawn” caption until discard resolves.

Keep `.play-layout`, `.play-main`, and `.hand-panel` flat (the default transform style). The global table transform remains, but interactive controls must not share a preserved 3D context with panel backgrounds: coplanar surfaces can destabilize cursor hit testing. Only the hand row and public-card wrappers participate in the local card perspective.

Riichi inventory uses the original Figma vector stick artwork in `public/assets/sticks`: blue dots for available Riichi sticks (with an exact count), red and green dots for an outstanding loan, and a single red dot beside the dealer name. Source file: https://www.figma.com/design/mYJZqQ29YKtPn49xtNVLkt (nodes 227:40286, 240:42659, and 240:42068). Only present the inventory in Riichi mode; the dealer marker is shared across modes.
