import Rand, { PRNG } from "rand-seed"

/** A serializable rand-seed adapter. Never use this for secrets or identifiers. */
export class SeededRandom {
  private readonly random: Rand
  private readonly seed: string
  private draws: number

  constructor(seed: string | number, state?: number) {
    this.seed = String(seed)
    this.random = new Rand(this.seed, PRNG.sfc32)
    this.draws = 0

    for (let draw = 0; draw < (state ?? 0); draw += 1) {
      this.next()
    }
  }

  next(): number {
    this.draws += 1

    return this.random.next()
  }

  integer(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError("maxExclusive must be a positive integer")
    }
    return Math.floor(this.next() * maxExclusive)
  }

  pick<T>(items: readonly T[]): T {
    const item = items[this.integer(items.length)]

    if (item === undefined) {
      throw new Error("Cannot pick from an empty collection")
    }

    return item
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items]
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = this.integer(index + 1)
      ;[copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!]
    }
    return copy
  }

  fork(label: string): SeededRandom {
    return new SeededRandom(`${this.seed}:${this.draws}:${label}`)
  }

  get state(): number {
    return this.draws
  }
}
