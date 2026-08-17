/** Secret bindings are supplied with `wrangler secret put`, so they are not emitted by `wrangler types`. */
interface Env {
  OPENROUTER_API_KEY: string
}
