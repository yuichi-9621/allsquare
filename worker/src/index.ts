import { Hono } from "hono"
import expenses from "./routes/expenses.js"
import groups from "./routes/groups.js"
import members from "./routes/members.js"
import type { Env } from "./types.js"

const app = new Hono<{ Bindings: Env }>()

app.get("/health", (c) => c.json({ ok: true }))

app.route("/api/groups", groups)
app.route("/api/groups", members)
app.route("/api/groups", expenses)

export default app
