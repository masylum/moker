import { readFileSync } from "node:fs"
import { mergeStud7Balance, type Stud7BalanceRaw } from "../src/stud7/balance"

const parts = process.argv.slice(2).map((path) => {
  const contents = readFileSync(path, "utf8")

  return JSON.parse(contents) as Stud7BalanceRaw
})

console.log(JSON.stringify(mergeStud7Balance(parts)))
