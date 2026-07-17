import { Hono } from "hono"
import groups from "./routes/groups.js"
import type { Env } from "./types.js"

const app = new Hono<{ Bindings: Env }>()

app.get("/health", (c) => c.json({ ok: true }))

app.route("/api/groups", groups)

export default app
