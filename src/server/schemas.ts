import { z } from "zod"

const DrawSourceSchema = z.enum(["deck", "discard-a", "discard-b"])
const BlankExchangeSchema = z.object({
  blankCardId: z.string(),
  pile: z.enum(["a", "b"]),
  cardIndex: z.int().nonnegative(),
})

const TreasureSearchSchema = z.object({
  treasureCardId: z.string(),
  targetPlayerId: z.string(),
})

const PlayerSchema = z.object({
  id: z.string().min(1).max(60).optional(),
  name: z.string().min(1).max(80),
  controller: z.enum(["human", "heuristic"]),
})
export const CreateGameSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  sessionId: z.string().min(1).max(120).optional(),
  seed: z.string().min(1).max(200),
  players: z
    .array(PlayerSchema)
    .min(2)
    .max(6)
    .refine(
      (players) =>
        new Set(players.map((player, index) => player.id ?? `p${index + 1}`)).size ===
        players.length,
      "Player IDs must be unique",
    ),
  mode: z.enum(["basic", "riichi", "legacy"]).default("basic"),
  orbits: z.number().int().min(1).max(4).default(1),
  tournamentGames: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(1),
  heuristicSamples: z.int().min(1).max(256).optional(),
})
export const RoomProfileSchema = z.object({ name: z.string().trim().min(1).max(40) })
export const ActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("treasure-choice"),
    playerId: z.string(),
    cardIds: z.array(z.string()).min(1).max(2),
    returnCardId: z.string().optional(),
  }),
  z.object({
    kind: z.literal("riichi-stick"),
    playerId: z.string(),
    source: DrawSourceSchema.optional(),
    blankExchange: BlankExchangeSchema.optional(),
    treasureSearch: TreasureSearchSchema.optional(),
  }),
  z.object({
    kind: z.literal("charleston"),
    playerId: z.string(),
    cardIds: z.array(z.string()).length(2),
  }),
  z.object({
    kind: z.literal("expose"),
    playerId: z.string(),
    cardIds: z.array(z.string()).min(1).max(3),
  }),
  z.object({
    kind: z.literal("betting"),
    offerStick: z.boolean().optional(),
    playerId: z.string(),
    action: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("check"),
        drawSource: DrawSourceSchema.optional(),
        blankExchange: BlankExchangeSchema.optional(),
        treasureSearch: TreasureSearchSchema.optional(),
        useRiichiStick: z.boolean().optional(),
        riichiDrawSource: DrawSourceSchema.optional(),
        riichiBlankExchange: BlankExchangeSchema.optional(),
        riichiTreasureSearch: TreasureSearchSchema.optional(),
      }),
      z.object({
        type: z.literal("call"),
        drawSource: DrawSourceSchema.optional(),
        blankExchange: BlankExchangeSchema.optional(),
        treasureSearch: TreasureSearchSchema.optional(),
        useRiichiStick: z.boolean().optional(),
        riichiDrawSource: DrawSourceSchema.optional(),
        riichiBlankExchange: BlankExchangeSchema.optional(),
        riichiTreasureSearch: TreasureSearchSchema.optional(),
        curseTargetId: z.string().optional(),
        removeCurse: z.boolean().optional(),
      }),
      z.object({
        type: z.literal("bet"),
        amount: z.number().positive(),
        riichi: z.boolean().optional(),
        useRiichiStick: z.boolean().optional(),
        drawSource: DrawSourceSchema.optional(),
        blankExchange: BlankExchangeSchema.optional(),
        treasureSearch: TreasureSearchSchema.optional(),
        curseTargetId: z.string().optional(),
        removeCurse: z.boolean().optional(),
      }),
      z.object({ type: z.literal("fold") }),
    ]),
  }),
  z.object({
    kind: z.literal("discard"),
    playerId: z.string(),
    discardCardId: z.string(),
    discardPile: z.enum(["a", "b"]),
  }),
  z.object({ kind: z.literal("take-loan"), playerId: z.string() }),
  z.object({ kind: z.literal("repay-loan"), playerId: z.string() }),
  z.object({ kind: z.literal("next-hand"), viewerId: z.string().optional() }),
])
export const SimulationSchema = z.object({
  count: z.int().min(1).max(20).default(1),
  seedPrefix: z.string().min(1).max(120),
  heuristicSamples: z.int().min(1).max(64).default(24),
})
