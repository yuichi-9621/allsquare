import { setupServer } from "msw/node"

// Shared MSW server. Individual tests register handlers with `server.use(...)`.
export const server = setupServer()
