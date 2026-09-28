const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

/** 48-bit timestamp followed by 80 cryptographically random bits. */
export function roomId(): string {
  let value = BigInt(Date.now())
  for (const byte of crypto.getRandomValues(new Uint8Array(10))) {
    value = (value << 8n) | BigInt(byte)
  }
  let id = ""
  for (let index = 0; index < 26; index += 1) {
    id = ALPHABET[Number(value & 31n)]! + id
    value >>= 5n
  }
  return id
}
