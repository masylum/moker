/** A compact, serializable PRNG. Never use this for secrets or identifiers. */
export class SeededRandom {
  private value: number;

  constructor(seed: string | number, state?: number) {
    this.value = state ?? hashSeed(String(seed));
  }

  next(): number {
    this.value = (this.value + 0x6d2b79f5) | 0;
    let t = this.value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  }

  integer(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError("maxExclusive must be a positive integer");
    }
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    const item = items[this.integer(items.length)];
    if (item === undefined) throw new Error("Cannot pick from an empty collection");
    return item;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = this.integer(index + 1);
      [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
    }
    return copy;
  }

  fork(label: string): SeededRandom {
    return new SeededRandom(`${this.value}:${label}`);
  }

  get state(): number {
    return this.value;
  }
}

export function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}
