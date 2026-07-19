import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import expenses from "./routes/expenses.js"
import fxRoute from "./routes/fx.js"
import groups from "./routes/groups.js"
import members from "./routes/members.js"
import settlement from "./routes/settlement.js"
import type { Env } from "./types.js"

const app = new Hono<{ Bindings: Env }>()

// Request lines (method, path, status, ms) land in Workers Logs.
app.use("*", logger())

// The web app is served from a different origin (Cloudflare Pages); allow all.
app.use("*", cors())

app.get("/health", (c) => c.json({ ok: true }))

app.route("/api/groups", groups)
app.route("/api/groups", members)
app.route("/api/groups", expenses)
app.route("/api/groups", settlement)
app.route("/api/fx", fxRoute)

export default app
