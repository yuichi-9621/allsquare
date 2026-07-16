import { applyD1Migrations, env } from "cloudflare:test"

// Runs once per test file, before its tests, establishing the schema baseline.
// isolatedStorage then rolls back each test's mutations, so tests stay independent.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
